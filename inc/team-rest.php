<?php
if ( ! defined('ABSPATH') ) exit;

/**
 * Csapatruha-rendelés: egy kéréssel menti a tervet (a nyomdai fájlok termékenként,
 * az előnézet termékenként és színenként), majd a termék × szín × méret sorokat egy
 * csoportként kosárba teszi. Több termék (pl. felnőtt és gyerekpóló) is lehet benne.
 * A darabárat a szerver a beállított ársávokból számolja (a kosárban újra, a csoport
 * teljes darabszáma alapján); a kliens által küldött árat nem használjuk.
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
  $mode = $req->get_param('mode') === 'sport' ? 'sport' : 'work';
  $allowed = nb_team_allowed_product_ids($settings, $team);

  // Termékek (termékID|típus): egy rendelésben több is lehet (pl. felnőtt és gyerekpóló), közös tervvel.
  $products = [];
  foreach ((array)$req->get_param('products') as $entry){
    if (!is_array($entry)) continue;
    $pid = intval($entry['pid'] ?? 0);
    $type = sanitize_text_field((string)($entry['type'] ?? ''));
    if (!in_array($pid, $allowed, true)){
      return new WP_Error('bad_product', 'Ez a termék nem rendelhető a csapattervezőben', ['status'=>400]);
    }
    $key = $pid.'|'.nb_normalize_type_key($type);
    $products[$key] = ['key'=>$key, 'pid'=>$pid, 'type'=>$type, 'sizes'=>array_map(function($s){ return trim((string)$s); }, (array)($settings['catalog'][$pid]['sizes'] ?? []))];
    if (count($products) > 6) return new WP_Error('too_many_products', 'Egy rendelésben legfeljebb 6 termék lehet', ['status'=>400]);
  }
  if (!$products) return new WP_Error('bad_product', 'Hiányzik a termék', ['status'=>400]);
  $product_of = function($key) use ($products){
    $key = (string)$key;
    return $products[$key] ?? null;
  };

  // Termék × szín × méret sorok összevonása és ellenőrzése. Névsor esetén a sorok a
  // játékosokból állnak össze; a névvel/számmal készülő darabok külön sorba kerülnek,
  // mert azokra felár vonatkozhat.
  $rows = [];
  $add_row = function($product, $color, $size, $qty, $player = null) use (&$rows){
    if ($product['sizes'] && !in_array($size, $product['sizes'], true)){
      return new WP_Error('bad_size', 'Ismeretlen méret: '.$size, ['status'=>400]);
    }
    // Felár csak akkor jár, ha a játékoshoz ténylegesen készül név- vagy számfájl.
    $personal = $player !== null && !empty(array_filter((array)$player['files']));
    $key = $product['key'].'#'.nb_normalize_color_key($color).'|'.$size.'|'.($personal ? 1 : 0);
    if (!isset($rows[$key])) $rows[$key] = ['product'=>$product['key'], 'color'=>$color, 'size'=>$size, 'qty'=>0, 'personal'=>$personal, 'players'=>[]];
    $rows[$key]['qty'] += $qty;
    if ($player !== null) $rows[$key]['players'][] = $player;
    if (count($rows) > 300) return new WP_Error('bad_rows', 'Túl sok sor', ['status'=>400]);
    return true;
  };
  $players = [];
  $roster = $req->get_param('roster');
  if (is_array($roster) && $roster){
    if (count($roster) > $team['max_players']){
      return new WP_Error('too_many_players', sprintf('Egy rendelésben legfeljebb %d játékos lehet', $team['max_players']), ['status'=>400]);
    }
    foreach (array_values($roster) as $index => $entry){
      if (!is_array($entry)) continue;
      $product = $product_of($entry['product'] ?? '');
      if (!$product) return new WP_Error('bad_product', 'Ismeretlen termék a névsorban', ['status'=>400]);
      $name = sanitize_text_field((string)($entry['name'] ?? ''));
      $name = function_exists('mb_substr') ? mb_substr($name, 0, 30) : substr($name, 0, 30);
      $player = [
        'index'   => $index,
        'product' => $product['key'],
        'name'    => $name,
        'number'  => substr(preg_replace('/[^0-9]/', '', (string)($entry['number'] ?? '')), 0, 3),
        'color'   => sanitize_text_field((string)($entry['color'] ?? '')),
        'size'    => sanitize_text_field((string)($entry['size'] ?? '')),
        'files'   => is_array($entry['personal'] ?? null) ? $entry['personal'] : [],
      ];
      $result = $add_row($product, $player['color'], $player['size'], 1, $player);
      if (is_wp_error($result)) return $result;
      $players[] = $player;
    }
  } else {
    foreach ((array)$req->get_param('rows') as $row){
      if (!is_array($row)) continue;
      $qty = intval($row['qty'] ?? 0);
      if ($qty < 1) continue;
      if ($qty > 10000) return new WP_Error('bad_qty', 'Túl nagy darabszám', ['status'=>400]);
      $product = $product_of($row['product'] ?? '');
      if (!$product) return new WP_Error('bad_product', 'Ismeretlen termék', ['status'=>400]);
      $result = $add_row($product, sanitize_text_field((string)($row['color'] ?? '')), sanitize_text_field((string)($row['size'] ?? '')), $qty);
      if (is_wp_error($result)) return $result;
    }
  }
  if (!$rows) return new WP_Error('no_qty', 'Adj meg legalább egy darabot', ['status'=>400]);
  $total_qty = array_sum(array_column($rows, 'qty'));
  if ($total_qty < $team['min_qty']){
    return new WP_Error('min_qty', sprintf('A minimum rendelés %d db', $team['min_qty']), ['status'=>400]);
  }

  // Termék + szín párok: mindegyikhez saját terv (előnézet), a nyomdai fájl termékenként közös.
  $targets = [];
  foreach ($rows as $row){
    $tkey = $row['product'].'#'.nb_normalize_color_key($row['color']);
    if (!isset($targets[$tkey])){
      $product = $products[$row['product']];
      $ctx = nb_validate_design_price_ctx(['type'=>$product['type'], 'color'=>$row['color'], 'type_label'=>$product['type'], 'color_label'=>$row['color']], $product['pid'], $settings);
      if (is_wp_error($ctx)) return $ctx;
      $targets[$tkey] = ['product'=>$row['product'], 'color'=>$row['color'], 'ctx'=>$ctx];
    }
  }
  foreach ($products as $key => $product){
    $colors = array_filter($targets, function($t) use ($key){ return $t['product'] === $key; });
    if (count($colors) > $team['max_colors']){
      return new WP_Error('too_many_colors', sprintf('Egy termékből legfeljebb %d szín lehet egy rendelésben', $team['max_colors']), ['status'=>400]);
    }
    if (!$colors) unset($products[$key]);
  }

  // Termékenként: az elemek mérete (gyártáshoz) és a nyomdai fájlok, a saját nyomtatási felületéhez szorítva.
  $designs_in = (array)$req->get_param('designs');
  $layouts = [];
  $print_data = [];
  foreach ($products as $key => $product){
    $first = null;
    foreach ($targets as $t){ if ($t['product'] === $key){ $first = $t['ctx']; break; } }
    $areas = ['front'=>nb_design_physical_area($settings, $first, 'front'), 'back'=>nb_design_physical_area($settings, $first, 'back')];
    $design = isset($designs_in[$key]) && is_array($designs_in[$key]) ? $designs_in[$key] : [];
    $layout = nb_team_print_layout(nb_team_sanitize_elements($design['elements'] ?? [], $areas));
    if (empty($layout['placements'])){
      return new WP_Error('empty_design', 'Tegyél a termékre legalább egy logót vagy feliratot', ['status'=>400]);
    }
    $layouts[$key] = $layout;
    $print = isset($design['print']) && is_array($design['print']) ? $design['print'] : [];
    foreach ($layout['sides'] as $side){
      $decoded = nb_decode_png_data_url($print[$side] ?? '', intval($limits['print_bytes']), 'bad_print_png', 'nyomdai PNG');
      if (is_wp_error($decoded)) return $decoded;
      $print_data[$key][$side] = $decoded;
    }
  }

  $layers_json = wp_json_encode($req->get_param('layers'));
  if ($layers_json === false || strlen($layers_json) > intval($limits['layers_bytes'])){
    return new WP_Error('bad_layers', 'A terv adatai túl nagyok vagy hibásak', ['status'=>413]);
  }

  $previews = [];
  foreach ((array)$req->get_param('previews') as $preview){
    if (!is_array($preview)) continue;
    $tkey = (string)($preview['product'] ?? '').'#'.nb_normalize_color_key($preview['color'] ?? '');
    if (!isset($targets[$tkey]) || isset($previews[$tkey])) continue;
    $front = nb_decode_png_data_url($preview['front'] ?? '', intval($limits['preview_bytes']), 'bad_png', 'előnézeti PNG');
    if (is_wp_error($front)) return $front;
    $back = null;
    if (in_array('back', $layouts[$targets[$tkey]['product']]['sides'], true)){
      $back = nb_decode_png_data_url($preview['back'] ?? '', intval($limits['preview_bytes']), 'bad_png_back', 'hátoldali előnézeti PNG');
      if (is_wp_error($back)) return $back;
    }
    $previews[$tkey] = ['front'=>$front, 'back'=>$back];
  }
  foreach (array_keys($targets) as $tkey){
    if (!isset($previews[$tkey])) return new WP_Error('missing_preview', 'Hiányzik egy szín előnézete', ['status'=>400]);
  }

  // Játékosonkénti név/szám fájlok: a játékos termékének nyomtatási felületén, átlátszó PNG.
  $player_files = [];
  foreach ($players as $player){
    foreach (['front', 'back'] as $side){
      if (empty($player['files'][$side])) continue;
      $decoded = nb_decode_png_data_url($player['files'][$side], intval($limits['print_bytes']), 'bad_personal_png', 'névfájl');
      if (is_wp_error($decoded)) return $decoded;
      $player_files[$player['index']][$side] = $decoded;
    }
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
  $product_index = 0;
  foreach ($print_data as $key => $sides_data){
    $product_index++;
    foreach ($sides_data as $side => $data){
      $result = $upload(($side === 'back' ? 'nb_team_print_back_' : 'nb_team_print_').$timestamp.$product_index.'.png', $data);
      if (is_wp_error($result)){ nb_team_order_rollback($paths, $design_ids); return $result; }
      $info = @getimagesizefromstring($data);
      $print_uploads[$key][$side] = ['url'=>esc_url_raw($result['url']), 'w'=>intval($info[0] ?? 0), 'h'=>intval($info[1] ?? 0)];
    }
  }
  $player_urls = [];
  foreach ($player_files as $player_index => $files){
    foreach ($files as $side => $data){
      $result = $upload('nb_team_personal_'.$timestamp.'_'.$player_index.'_'.$side.'.png', $data);
      if (is_wp_error($result)){ nb_team_order_rollback($paths, $design_ids); return $result; }
      $player_urls[$player_index][$side] = esc_url_raw($result['url']);
    }
  }
  $public_player = function($player) use ($player_urls){
    return [
      'name'   => $player['name'],
      'number' => $player['number'],
      'size'   => $player['size'],
      'color'  => $player['color'],
      'front'  => $player_urls[$player['index']]['front'] ?? '',
      'back'   => $player_urls[$player['index']]['back'] ?? '',
    ];
  };
  $group_id = function_exists('wp_generate_uuid4') ? wp_generate_uuid4() : uniqid('nb_team_', true);

  $design_by_target = [];
  $index = 0;
  foreach ($targets as $tkey => $target){
    $index++;
    $key = $target['product'];
    $product = $products[$key];
    $ctx = $target['ctx'];
    $layout = $layouts[$key];
    $front_print = $print_uploads[$key]['front'] ?? ['url'=>'', 'w'=>0, 'h'=>0];
    $back_print = $print_uploads[$key]['back'] ?? ['url'=>'', 'w'=>0, 'h'=>0];
    $target_players = [];
    foreach ($players as $player){
      if ($player['product'] === $key && nb_normalize_color_key($player['color']) === nb_normalize_color_key($target['color'])) $target_players[] = $public_player($player);
    }
    $front_preview = $upload('nb_preview_'.$timestamp.$index.'.png', $previews[$tkey]['front']);
    if (is_wp_error($front_preview)){ nb_team_order_rollback($paths, $design_ids); return $front_preview; }
    $back_preview = null;
    if ($previews[$tkey]['back'] !== null){
      $back_preview = $upload('nb_preview_back_'.$timestamp.$index.'.png', $previews[$tkey]['back']);
      if (is_wp_error($back_preview)){ nb_team_order_rollback($paths, $design_ids); return $back_preview; }
    }
    $front_area = nb_design_physical_area($settings, $ctx, 'front');
    $back_area = nb_design_physical_area($settings, $ctx, 'back');
    $post_id = wp_insert_post([
      'post_type'   => 'nb_design',
      'post_status' => 'publish',
      'post_title'  => sprintf('Csapatruha #%d – %s, %s', $timestamp, get_the_title($product['pid']), $ctx['color'] ?? ''),
      'post_author' => get_current_user_id(),
      'meta_input'  => [
        'nb_module'               => 'team',
        'nb_team_mode'            => $mode,
        'nb_team_group'           => $group_id,
        'nb_team_double'          => $layout['double'] ? 1 : 0,
        'nb_team_placements_json' => wp_json_encode($layout['placements']),
        'nb_team_roster_json'     => wp_json_encode($target_players),
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
        'product_id'              => $product['pid'],
        'attributes_json'         => wp_json_encode(['pa_type'=>$ctx['type'] ?? '', 'pa_color'=>$ctx['color'] ?? '', 'type_label'=>$ctx['type_label'] ?? '', 'color_label'=>$ctx['color_label'] ?? '']),
        'price_ctx'               => wp_json_encode($ctx),
        'print_width_px'          => $front_print['w'],
        'print_height_px'         => $front_print['h'],
        'preview_back_url'        => $back_preview ? esc_url_raw($back_preview['url']) : '',
        'print_back_url'          => $back_print['url'],
        'print_back_width_px'     => $back_print['w'],
        'print_back_height_px'    => $back_print['h'],
        'double_sided_enabled'    => $back_print['url'] !== '' ? 1 : 0,
        'printed_side_count'      => count($layout['sides']),
        'double_sided_fee'        => 0,
      ],
    ]);
    if (is_wp_error($post_id) || !$post_id){
      nb_team_order_rollback($paths, $design_ids);
      return new WP_Error('db', 'Nem sikerült menteni', ['status'=>500]);
    }
    $design_ids[] = $post_id;
    $design_by_target[$tkey] = $post_id;
  }

  $prepared = nb_rest_prepare_cart_environment();
  if (is_wp_error($prepared)){ nb_team_order_rollback($paths, $design_ids); return $prepared; }

  $cart_keys = [];
  foreach ($rows as $row){
    $tkey = $row['product'].'#'.nb_normalize_color_key($row['color']);
    $product = $products[$row['product']];
    $layout = $layouts[$row['product']];
    $result = nb_rest_cart_single_add($design_by_target[$tkey], [
      'size'     => $row['size'] !== '' ? ['value'=>$row['size'], 'label'=>$row['size']] : null,
      'quantity' => $row['qty'],
      'cart_item_data' => [
        'nb_team'                => 1,
        'nb_team_mode'           => $mode,
        'nb_team_pid'            => $product['pid'],
        'nb_team_type'           => $product['type'],
        'nb_team_double'         => $layout['double'] ? 1 : 0,
        'nb_team_personal'       => $row['personal'] ? 1 : 0,
        'nb_team_size'           => $row['size'],
        'nb_team_group'          => $group_id,
        'nb_team_placements'     => $layout['placements'],
        'nb_team_players'        => array_map($public_player, $row['players']),
        // Csak hátoldali terv esetén ne kerüljön az előnézet a nyomdai fájl helyére.
        'print_url'              => $print_uploads[$row['product']]['front']['url'] ?? '',
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
    'ok'       => true,
    'redirect' => wc_get_cart_url(),
    'quantity' => $total_qty,
    'products' => array_keys($products),
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
