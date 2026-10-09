<?php
if ( ! defined('ABSPATH') ) exit;

/**
 * Csapatruha-rendelés: egy kéréssel menti a tervet (a nyomdai fájlok egyszer,
 * az előnézet színenként), majd a szín × méret sorokat egy kedvezménycsoportként
 * kosárba teszi. A darabonkénti nyomtatási árat a szerver számolja az elemek
 * méretéből; a kliens által küldött árat nem használjuk.
 */

function nb_team_order_rollback($paths, $design_ids, $cart_keys = []){
  if ($cart_keys && function_exists('WC') && WC()->cart){
    foreach ($cart_keys as $key) WC()->cart->remove_cart_item($key);
  }
  foreach ($design_ids as $id) wp_delete_post($id, true);
  foreach ($paths as $path){
    if ($path && file_exists($path)) wp_delete_file($path);
  }
}

function nb_team_handle_order(WP_REST_Request $req){
  $rate = nb_check_rate_limit('team_order', apply_filters('nb_team_order_rate_limit', 10), 10 * MINUTE_IN_SECONDS);
  if (is_wp_error($rate)) return $rate;

  $stored = nb_get_settings([]);
  $settings = nb_sync_mockup_references(nb_clean_settings_unicode(is_array($stored) ? $stored : []));
  $team = nb_team_get_settings();
  $limits = nb_design_upload_limits();

  $product_id = intval($req->get_param('product_id'));
  if (!in_array($product_id, nb_team_allowed_product_ids($settings, $team), true)){
    return new WP_Error('bad_product', 'Ez a termék nem rendelhető a csapattervezőben', ['status'=>400]);
  }
  $cfg = $settings['catalog'][$product_id];
  $type = sanitize_text_field((string)$req->get_param('type'));
  $mode = $req->get_param('mode') === 'sport' ? 'sport' : 'work';

  // Méret × szín sorok összevonása és ellenőrzése.
  $sizes = array_map(function($s){ return trim((string)$s); }, (array)($cfg['sizes'] ?? []));
  $rows = [];
  foreach ((array)$req->get_param('rows') as $row){
    if (!is_array($row)) continue;
    $qty = intval($row['qty'] ?? 0);
    if ($qty < 1) continue;
    if ($qty > 10000) return new WP_Error('bad_qty', 'Túl nagy darabszám', ['status'=>400]);
    $color = sanitize_text_field((string)($row['color'] ?? ''));
    $size = sanitize_text_field((string)($row['size'] ?? ''));
    if ($sizes && !in_array($size, $sizes, true)){
      return new WP_Error('bad_size', 'Ismeretlen méret: '.$size, ['status'=>400]);
    }
    $key = nb_normalize_color_key($color).'|'.$size;
    if (!isset($rows[$key])) $rows[$key] = ['color'=>$color, 'size'=>$size, 'qty'=>0];
    $rows[$key]['qty'] += $qty;
    if (count($rows) > 300) return new WP_Error('bad_rows', 'Túl sok sor', ['status'=>400]);
  }
  if (!$rows) return new WP_Error('no_qty', 'Adj meg legalább egy darabot', ['status'=>400]);
  $total_qty = array_sum(array_column($rows, 'qty'));
  if ($total_qty < $team['min_qty']){
    return new WP_Error('min_qty', sprintf('A minimum rendelés %d db', $team['min_qty']), ['status'=>400]);
  }

  $colors = [];
  foreach ($rows as $row){
    $colors[nb_normalize_color_key($row['color'])] = $row['color'];
  }
  if (count($colors) > $team['max_colors']){
    return new WP_Error('too_many_colors', sprintf('Egy rendelésben legfeljebb %d szín lehet', $team['max_colors']), ['status'=>400]);
  }
  $contexts = [];
  foreach ($colors as $color_key => $color){
    $ctx = nb_validate_design_price_ctx(['type'=>$type, 'color'=>$color, 'type_label'=>$type, 'color_label'=>$color], $product_id, $settings);
    if (is_wp_error($ctx)) return $ctx;
    $contexts[$color_key] = $ctx;
  }

  // Árazás az elemek méretéből, a szerver oldali nyomtatási felülethez szorítva.
  $first_ctx = reset($contexts);
  $areas = [
    'front' => nb_design_physical_area($settings, $first_ctx, 'front'),
    'back'  => nb_design_physical_area($settings, $first_ctx, 'back'),
  ];
  $elements = nb_team_sanitize_elements($req->get_param('elements'), $areas);
  $pricing = nb_team_price_print($elements, $team);
  if (empty($pricing['placements'])){
    return new WP_Error('empty_design', 'Tegyél a termékre legalább egy logót vagy feliratot', ['status'=>400]);
  }
  $sides_used = array_unique(array_column($pricing['placements'], 'side'));

  $layers_json = wp_json_encode($req->get_param('layers'));
  if ($layers_json === false || strlen($layers_json) > intval($limits['layers_bytes'])){
    return new WP_Error('bad_layers', 'A terv adatai túl nagyok vagy hibásak', ['status'=>413]);
  }

  // Fájlok dekódolása feltöltés előtt, hogy hibánál ne maradjon félkész mentés.
  $print = (array)$req->get_param('print');
  $print_data = [];
  foreach (['front', 'back'] as $side){
    if (!in_array($side, $sides_used, true)) continue;
    $decoded = nb_decode_png_data_url($print[$side] ?? '', intval($limits['print_bytes']), 'bad_print_png', 'nyomdai PNG');
    if (is_wp_error($decoded)) return $decoded;
    $print_data[$side] = $decoded;
  }
  $previews = [];
  foreach ((array)$req->get_param('previews') as $preview){
    if (!is_array($preview)) continue;
    $color_key = nb_normalize_color_key($preview['color'] ?? '');
    if (!isset($contexts[$color_key]) || isset($previews[$color_key])) continue;
    $front = nb_decode_png_data_url($preview['front'] ?? '', intval($limits['preview_bytes']), 'bad_png', 'előnézeti PNG');
    if (is_wp_error($front)) return $front;
    $back = null;
    if (in_array('back', $sides_used, true)){
      $back = nb_decode_png_data_url($preview['back'] ?? '', intval($limits['preview_bytes']), 'bad_png_back', 'hátoldali előnézeti PNG');
      if (is_wp_error($back)) return $back;
    }
    $previews[$color_key] = ['front'=>$front, 'back'=>$back];
  }
  foreach (array_keys($contexts) as $color_key){
    if (!isset($previews[$color_key])) return new WP_Error('missing_preview', 'Hiányzik egy szín előnézete', ['status'=>400]);
  }

  if (!function_exists('wp_upload_bits')) require_once ABSPATH.'wp-admin/includes/file.php';
  $paths = [];
  $design_ids = [];
  $timestamp = time();
  $upload = function($name, $data) use (&$paths){
    $result = wp_upload_bits($name, null, $data);
    if (!empty($result['error'])) return new WP_Error('upload', 'Mentési hiba: '.$result['error'], ['status'=>500]);
    $paths[] = $result['file'];
    return $result;
  };

  $print_uploads = [];
  foreach ($print_data as $side => $data){
    $result = $upload(($side === 'back' ? 'nb_team_print_back_' : 'nb_team_print_').$timestamp.'.png', $data);
    if (is_wp_error($result)){ nb_team_order_rollback($paths, $design_ids); return $result; }
    $info = @getimagesizefromstring($data);
    $print_uploads[$side] = ['url'=>esc_url_raw($result['url']), 'w'=>intval($info[0] ?? 0), 'h'=>intval($info[1] ?? 0)];
  }
  $front_print = $print_uploads['front'] ?? ['url'=>'', 'w'=>0, 'h'=>0];
  $back_print = $print_uploads['back'] ?? ['url'=>'', 'w'=>0, 'h'=>0];
  $group_id = function_exists('wp_generate_uuid4') ? wp_generate_uuid4() : uniqid('nb_team_', true);

  $design_by_color = [];
  $index = 0;
  foreach ($contexts as $color_key => $ctx){
    $index++;
    $front_preview = $upload('nb_preview_'.$timestamp.$index.'.png', $previews[$color_key]['front']);
    if (is_wp_error($front_preview)){ nb_team_order_rollback($paths, $design_ids); return $front_preview; }
    $back_preview = null;
    if ($previews[$color_key]['back'] !== null){
      $back_preview = $upload('nb_preview_back_'.$timestamp.$index.'.png', $previews[$color_key]['back']);
      if (is_wp_error($back_preview)){ nb_team_order_rollback($paths, $design_ids); return $back_preview; }
    }
    $front_area = nb_design_physical_area($settings, $ctx, 'front');
    $back_area = nb_design_physical_area($settings, $ctx, 'back');
    $printed = count($print_uploads);
    $post_id = wp_insert_post([
      'post_type'   => 'nb_design',
      'post_status' => 'publish',
      'post_title'  => sprintf('Csapatruha #%d – %s', $timestamp, $ctx['color'] ?? ''),
      'post_author' => get_current_user_id(),
      'meta_input'  => [
        'nb_module'               => 'team',
        'nb_team_mode'            => $mode,
        'nb_team_group'           => $group_id,
        'nb_team_unit_print'      => $pricing['unit_print'],
        'nb_team_placements_json' => wp_json_encode($pricing['placements']),
        'nb_team_print_url'       => $front_print['url'],
        'nb_team_print_back_url'  => $back_print['url'],
        'preview_url'             => esc_url_raw($front_preview['url']),
        'print_url'               => $front_print['url'],
        'layers_json'             => $layers_json,
        'width_mm'                => $front_area['width_mm'],
        'height_mm'               => $front_area['height_mm'],
        'dpi'                     => $front_area['dpi'],
        'mockup_id'               => $front_area['mockup_id'],
        'print_area_id'           => $front_area['area_id'],
        'back_width_mm'           => $back_area['width_mm'],
        'back_height_mm'          => $back_area['height_mm'],
        'back_dpi'                => $back_area['dpi'],
        'back_mockup_id'          => $back_area['mockup_id'],
        'back_print_area_id'      => $back_area['area_id'],
        'product_id'              => $product_id,
        'attributes_json'         => wp_json_encode(['pa_type'=>$ctx['type'] ?? '', 'pa_color'=>$ctx['color'] ?? '', 'type_label'=>$ctx['type_label'] ?? '', 'color_label'=>$ctx['color_label'] ?? '']),
        'price_ctx'               => wp_json_encode($ctx),
        'print_width_px'          => $front_print['w'],
        'print_height_px'         => $front_print['h'],
        'preview_back_url'        => $back_preview ? esc_url_raw($back_preview['url']) : '',
        'print_back_url'          => $back_print['url'],
        'print_back_width_px'     => $back_print['w'],
        'print_back_height_px'    => $back_print['h'],
        'double_sided_enabled'    => $back_print['url'] !== '' ? 1 : 0,
        'printed_side_count'      => $printed,
        'double_sided_fee'        => 0,
      ],
    ]);
    if (is_wp_error($post_id) || !$post_id){
      nb_team_order_rollback($paths, $design_ids);
      return new WP_Error('db', 'Nem sikerült menteni', ['status'=>500]);
    }
    $design_ids[] = $post_id;
    $design_by_color[$color_key] = $post_id;
  }

  $prepared = nb_rest_prepare_cart_environment();
  if (is_wp_error($prepared)){ nb_team_order_rollback($paths, $design_ids); return $prepared; }

  $cart_keys = [];
  foreach ($rows as $row){
    $color_key = nb_normalize_color_key($row['color']);
    $result = nb_rest_cart_single_add($design_by_color[$color_key], [
      'size'     => $row['size'] !== '' ? ['value'=>$row['size'], 'label'=>$row['size']] : null,
      'quantity' => $row['qty'],
      'cart_item_data' => [
        'nb_team'                => 1,
        'nb_team_mode'           => $mode,
        'nb_team_unit_print'     => $pricing['unit_print'],
        'nb_team_placements'     => $pricing['placements'],
        'nb_bulk_group_id'       => $group_id,
        'nb_bulk_group_quantity' => $total_qty,
        // Csak hátoldali terv esetén ne kerüljön az előnézet a nyomdai fájl helyére.
        'print_url'              => $front_print['url'],
      ],
    ]);
    if (is_wp_error($result)){
      nb_team_order_rollback($paths, $design_ids, $cart_keys);
      return $result;
    }
    $cart_keys[] = $result['cart_item_key'];
  }

  if (method_exists(WC()->cart, 'set_session')) WC()->cart->set_session();
  if (method_exists(WC()->cart, 'maybe_set_cart_cookies')) WC()->cart->maybe_set_cart_cookies();
  if (method_exists(WC()->cart, 'calculate_totals')) WC()->cart->calculate_totals();

  return [
    'ok'         => true,
    'redirect'   => wc_get_cart_url(),
    'quantity'   => $total_qty,
    'unit_print' => $pricing['unit_print'],
    'placements' => $pricing['placements'],
  ];
}

add_action('rest_api_init', function(){
  register_rest_route('nb/v1', '/team/order', [
    'methods'  => 'POST',
    'permission_callback' => function($req){
      $nonce = $req->get_header('X-WP-Nonce');
      if (!$nonce) $nonce = $req->get_param('_wpnonce');
      if (!wp_verify_nonce($nonce, 'wp_rest')){
        return new WP_Error('rest_forbidden', 'Érvénytelen biztonsági token.', ['status'=>403]);
      }
      return true;
    },
    'callback' => 'nb_team_handle_order',
  ]);
});
