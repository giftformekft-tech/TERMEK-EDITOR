<?php
if ( ! defined('ABSPATH') ) exit;

/**
 * Csapat- és munkaruha-tervező: külön modul a /csapatruha-tervezo/ oldalon.
 * A meglévő katalógust, mockupokat és kedvezménysávokat csak olvassa; a saját
 * beállításai az nb_team_settings opcióban vannak, az eredeti tervezőt nem érinti.
 *
 * Árazás: darabonként a termék ára + a nyomatok fix ára. Egy nyomat a terv egy
 * oldalán egymáshoz közeli elemek csoportja; az ára a befoglaló méretéhez illő
 * méretsávból jön. A mennyiségi kedvezmény a teljes darabárra (termék + nyomat) jár.
 */

define('NB_TEAM_PAGE_SLUG', 'csapatruha-tervezo');

function nb_team_default_tiers(){
  return [
    ['id'=>'small',  'label'=>'Kis nyomat (max. 10×10 cm)',   'max_w_mm'=>100, 'max_h_mm'=>100, 'price'=>990],
    ['id'=>'medium', 'label'=>'Közepes nyomat (max. A4)',      'max_w_mm'=>210, 'max_h_mm'=>297, 'price'=>1490],
    ['id'=>'large',  'label'=>'Nagy nyomat (max. A3)',         'max_w_mm'=>297, 'max_h_mm'=>420, 'price'=>1990],
  ];
}

/**
 * Elhelyezési segédsablonok. A pozíció a nyomtatási felülethez képest arány
 * (cx: a doboz közepe vízszintesen, top: a doboz teteje), a méret mm-ben értendő,
 * így minden mockupon ugyanott és ugyanakkora fizikai méretben jelenik meg.
 */
function nb_team_default_presets(){
  return [
    ['id'=>'work-left-chest',  'mode'=>'work',  'side'=>'front', 'kind'=>'logo',   'label'=>'Bal mell logó',         'cx'=>0.70, 'top'=>0.08, 'w_mm'=>90,  'h_mm'=>90,  'text'=>''],
    ['id'=>'work-center',      'mode'=>'work',  'side'=>'front', 'kind'=>'logo',   'label'=>'Mell közép logó',       'cx'=>0.50, 'top'=>0.10, 'w_mm'=>250, 'h_mm'=>250, 'text'=>''],
    ['id'=>'work-right-text',  'mode'=>'work',  'side'=>'front', 'kind'=>'text',   'label'=>'Jobb mell felirat',     'cx'=>0.30, 'top'=>0.10, 'w_mm'=>90,  'h_mm'=>22,  'text'=>'Név / beosztás'],
    ['id'=>'work-back-top',    'mode'=>'work',  'side'=>'back',  'kind'=>'text',   'label'=>'Hát felső cégnév',      'cx'=>0.50, 'top'=>0.05, 'w_mm'=>260, 'h_mm'=>50,  'text'=>'CÉGNÉV'],
    ['id'=>'work-back-logo',   'mode'=>'work',  'side'=>'back',  'kind'=>'logo',   'label'=>'Hát nagy logó',         'cx'=>0.50, 'top'=>0.20, 'w_mm'=>280, 'h_mm'=>280, 'text'=>''],
    ['id'=>'sport-crest',      'mode'=>'sport', 'side'=>'front', 'kind'=>'logo',   'label'=>'Bal mell címer',        'cx'=>0.70, 'top'=>0.08, 'w_mm'=>80,  'h_mm'=>80,  'text'=>''],
    ['id'=>'sport-front-name', 'mode'=>'sport', 'side'=>'front', 'kind'=>'text',   'label'=>'Mell közép csapatnév',  'cx'=>0.50, 'top'=>0.34, 'w_mm'=>260, 'h_mm'=>60,  'text'=>'CSAPATNÉV'],
    ['id'=>'sport-front-num',  'mode'=>'sport', 'side'=>'front', 'kind'=>'number', 'label'=>'Jobb mell szám',        'cx'=>0.30, 'top'=>0.08, 'w_mm'=>70,  'h_mm'=>90,  'text'=>'10'],
    ['id'=>'sport-back-name',  'mode'=>'sport', 'side'=>'back',  'kind'=>'text',   'label'=>'Hát név',               'cx'=>0.50, 'top'=>0.05, 'w_mm'=>280, 'h_mm'=>70,  'text'=>'NÉV'],
    ['id'=>'sport-back-num',   'mode'=>'sport', 'side'=>'back',  'kind'=>'number', 'label'=>'Hát szám',              'cx'=>0.50, 'top'=>0.22, 'w_mm'=>220, 'h_mm'=>250, 'text'=>'10'],
  ];
}

function nb_team_defaults(){
  return [
    'products' => [],
    'tiers'    => nb_team_default_tiers(),
    'presets'  => nb_team_default_presets(),
    'gap_mm'   => 20,
    'min_qty'  => 1,
    'max_colors' => 8,
  ];
}

function nb_team_sanitize_tiers($tiers){
  $clean = [];
  foreach ((array)$tiers as $index => $tier){
    if (!is_array($tier)) continue;
    $w = round(floatval($tier['max_w_mm'] ?? 0), 1);
    $h = round(floatval($tier['max_h_mm'] ?? 0), 1);
    if ($w <= 0 || $h <= 0) continue;
    $label = sanitize_text_field($tier['label'] ?? '');
    $id = sanitize_key($tier['id'] ?? '');
    $clean[] = [
      'id'       => $id !== '' ? $id : 'tier'.($index + 1),
      'label'    => $label !== '' ? $label : sprintf('%s×%s mm', $w, $h),
      'max_w_mm' => $w,
      'max_h_mm' => $h,
      'price'    => max(0, round(floatval($tier['price'] ?? 0), 2)),
    ];
  }
  usort($clean, function($a, $b){ return ($a['max_w_mm'] * $a['max_h_mm']) <=> ($b['max_w_mm'] * $b['max_h_mm']); });
  return $clean;
}

function nb_team_sanitize_presets($presets){
  $clean = [];
  $used = [];
  foreach ((array)$presets as $index => $preset){
    if (!is_array($preset)) continue;
    $label = sanitize_text_field($preset['label'] ?? '');
    $w = round(floatval($preset['w_mm'] ?? 0), 1);
    $h = round(floatval($preset['h_mm'] ?? 0), 1);
    if ($label === '' || $w <= 0 || $h <= 0) continue;
    $id = sanitize_key($preset['id'] ?? '');
    if ($id === '' || isset($used[$id])) $id = 'preset-'.($index + 1);
    $used[$id] = true;
    $mode = in_array(($preset['mode'] ?? ''), ['work', 'sport', 'both'], true) ? $preset['mode'] : 'both';
    $side = ($preset['side'] ?? '') === 'back' ? 'back' : 'front';
    $kind = in_array(($preset['kind'] ?? ''), ['logo', 'text', 'number'], true) ? $preset['kind'] : 'logo';
    $clean[] = [
      'id'    => $id,
      'mode'  => $mode,
      'side'  => $side,
      'kind'  => $kind,
      'label' => $label,
      'cx'    => min(1, max(0, round(floatval($preset['cx'] ?? 0.5), 3))),
      'top'   => min(1, max(0, round(floatval($preset['top'] ?? 0.1), 3))),
      'w_mm'  => $w,
      'h_mm'  => $h,
      'text'  => sanitize_text_field($preset['text'] ?? ''),
    ];
  }
  return $clean;
}

function nb_team_get_settings(){
  $defaults = nb_team_defaults();
  $stored = get_option('nb_team_settings', []);
  $stored = is_array($stored) ? $stored : [];
  $settings = array_merge($defaults, $stored);
  $settings['products'] = array_values(array_filter(array_map('absint', (array)$settings['products'])));
  $settings['tiers'] = nb_team_sanitize_tiers($settings['tiers']);
  if (empty($settings['tiers'])) $settings['tiers'] = nb_team_default_tiers();
  $settings['presets'] = nb_team_sanitize_presets($settings['presets']);
  $settings['gap_mm'] = max(0, floatval($settings['gap_mm']));
  $settings['min_qty'] = max(1, intval($settings['min_qty']));
  $settings['max_colors'] = min(20, max(1, intval($settings['max_colors'])));
  return $settings;
}

/** A modulban rendelhető termékek: az adminban kijelöltek, vagy ha nincs kijelölés, a teljes katalógus. */
function nb_team_allowed_product_ids($designer_settings = null, $team_settings = null){
  if ($designer_settings === null) $designer_settings = nb_get_settings([]);
  if ($team_settings === null) $team_settings = nb_team_get_settings();
  $catalog = isset($designer_settings['catalog']) && is_array($designer_settings['catalog']) ? $designer_settings['catalog'] : [];
  $allowed = isset($designer_settings['products']) && is_array($designer_settings['products']) ? array_map('absint', $designer_settings['products']) : array_map('absint', array_keys($catalog));
  $ids = [];
  foreach ($allowed as $pid){
    if ($pid && isset($catalog[$pid])) $ids[] = $pid;
  }
  if (!empty($team_settings['products'])){
    $ids = array_values(array_intersect($ids, $team_settings['products']));
  }
  return array_values(array_unique($ids));
}

/* ------------------------------------------------------------------------ */
/* Nyomatok árazása                                                          */
/* ------------------------------------------------------------------------ */

/** A kliens által mért elemek (mm, a nyomtatási felülethez képest) tisztítása. */
function nb_team_sanitize_elements($elements, $areas = []){
  $clean = [];
  foreach ((array)$elements as $element){
    if (!is_array($element)) continue;
    $side = ($element['side'] ?? '') === 'back' ? 'back' : 'front';
    $limitW = isset($areas[$side]['width_mm']) ? floatval($areas[$side]['width_mm']) : 0;
    $limitH = isset($areas[$side]['height_mm']) ? floatval($areas[$side]['height_mm']) : 0;
    $x = max(0, floatval($element['x_mm'] ?? 0));
    $y = max(0, floatval($element['y_mm'] ?? 0));
    $w = max(0, floatval($element['w_mm'] ?? 0));
    $h = max(0, floatval($element['h_mm'] ?? 0));
    if ($limitW > 0){ $x = min($x, $limitW); $w = min($w, $limitW - $x); }
    if ($limitH > 0){ $y = min($y, $limitH); $h = min($h, $limitH - $y); }
    if ($w < 1 || $h < 1) continue;
    $clean[] = ['side'=>$side, 'x_mm'=>$x, 'y_mm'=>$y, 'w_mm'=>$w, 'h_mm'=>$h];
    if (count($clean) >= 80) break;
  }
  return $clean;
}

/** Az egy oldalon egymáshoz közeli elemek egy nyomatnak számítanak. */
function nb_team_group_elements($elements, $gap_mm){
  $groups = [];
  foreach (['front', 'back'] as $side){
    $items = array_values(array_filter($elements, function($e) use ($side){ return $e['side'] === $side; }));
    $count = count($items);
    if (!$count) continue;
    $parent = range(0, $count - 1);
    $find = function($i) use (&$parent){
      while ($parent[$i] !== $i){ $parent[$i] = $parent[$parent[$i]]; $i = $parent[$i]; }
      return $i;
    };
    for ($i = 0; $i < $count; $i++){
      for ($j = $i + 1; $j < $count; $j++){
        $a = $items[$i]; $b = $items[$j];
        $near = $a['x_mm'] <= $b['x_mm'] + $b['w_mm'] + $gap_mm
          && $b['x_mm'] <= $a['x_mm'] + $a['w_mm'] + $gap_mm
          && $a['y_mm'] <= $b['y_mm'] + $b['h_mm'] + $gap_mm
          && $b['y_mm'] <= $a['y_mm'] + $a['h_mm'] + $gap_mm;
        if ($near){
          $ri = $find($i); $rj = $find($j);
          if ($ri !== $rj) $parent[$rj] = $ri;
        }
      }
    }
    $boxes = [];
    for ($i = 0; $i < $count; $i++){
      $root = $find($i);
      $e = $items[$i];
      if (!isset($boxes[$root])){
        $boxes[$root] = ['side'=>$side, 'x1'=>$e['x_mm'], 'y1'=>$e['y_mm'], 'x2'=>$e['x_mm'] + $e['w_mm'], 'y2'=>$e['y_mm'] + $e['h_mm']];
      } else {
        $boxes[$root]['x1'] = min($boxes[$root]['x1'], $e['x_mm']);
        $boxes[$root]['y1'] = min($boxes[$root]['y1'], $e['y_mm']);
        $boxes[$root]['x2'] = max($boxes[$root]['x2'], $e['x_mm'] + $e['w_mm']);
        $boxes[$root]['y2'] = max($boxes[$root]['y2'], $e['y_mm'] + $e['h_mm']);
      }
    }
    foreach ($boxes as $box){
      $groups[] = ['side'=>$side, 'w_mm'=>round($box['x2'] - $box['x1'], 1), 'h_mm'=>round($box['y2'] - $box['y1'], 1)];
    }
  }
  return $groups;
}

function nb_team_tier_for_size($w, $h, $tiers){
  $tolerance = 1;
  foreach ($tiers as $tier){
    $fits = ($w <= $tier['max_w_mm'] + $tolerance && $h <= $tier['max_h_mm'] + $tolerance)
      || ($w <= $tier['max_h_mm'] + $tolerance && $h <= $tier['max_w_mm'] + $tolerance);
    if ($fits) return $tier;
  }
  return $tiers ? end($tiers) : null;
}

/** Visszaadja a nyomatokat és a darabonkénti nyomtatási árat. */
function nb_team_price_print($elements, $team_settings = null){
  if ($team_settings === null) $team_settings = nb_team_get_settings();
  $placements = [];
  $unit = 0;
  foreach (nb_team_group_elements($elements, floatval($team_settings['gap_mm'])) as $group){
    $tier = nb_team_tier_for_size($group['w_mm'], $group['h_mm'], $team_settings['tiers']);
    if (!$tier) continue;
    $placements[] = [
      'side'  => $group['side'],
      'w_mm'  => $group['w_mm'],
      'h_mm'  => $group['h_mm'],
      'tier'  => $tier['id'],
      'label' => $tier['label'],
      'price' => floatval($tier['price']),
    ];
    $unit += floatval($tier['price']);
  }
  return ['placements'=>$placements, 'unit_print'=>round($unit, 2)];
}

function nb_team_placements_summary($placements){
  $parts = [];
  foreach ((array)$placements as $placement){
    $side = ($placement['side'] ?? '') === 'back' ? __('hátul', 'nb-designer') : __('elöl', 'nb-designer');
    $parts[] = sprintf('%s, %s (%s×%s cm)', $placement['label'] ?? '', $side,
      number_format_i18n(floatval($placement['w_mm'] ?? 0) / 10, 1), number_format_i18n(floatval($placement['h_mm'] ?? 0) / 10, 1));
  }
  return implode('; ', $parts);
}

/* ------------------------------------------------------------------------ */
/* Oldal, shortcode, betöltés                                                */
/* ------------------------------------------------------------------------ */

function nb_team_designer_url(){
  $page = get_page_by_path(NB_TEAM_PAGE_SLUG);
  return $page ? get_permalink($page) : home_url('/'.NB_TEAM_PAGE_SLUG.'/');
}

function nb_team_ensure_page(){
  if (get_option('nb_team_page_version') === '1.0') return;
  if (!get_page_by_path(NB_TEAM_PAGE_SLUG)){
    $page_id = wp_insert_post([
      'post_title'   => 'Csapatruha tervező',
      'post_name'    => NB_TEAM_PAGE_SLUG,
      'post_status'  => 'publish',
      'post_type'    => 'page',
      'post_content' => '[nb_team_designer]',
    ]);
    if (is_wp_error($page_id) || !$page_id) return;
  }
  update_option('nb_team_page_version', '1.0');
}
add_action('init', 'nb_team_ensure_page', 21);

function nb_team_is_page(){
  if (!is_singular('page')) return false;
  $post = get_post();
  return $post && has_shortcode($post->post_content, 'nb_team_designer');
}

add_shortcode('nb_team_designer', function(){
  ob_start();
  include NB_DESIGNER_PATH.'templates/team-designer-page.php';
  return ob_get_clean();
});

add_filter('body_class', function($classes){
  if (nb_team_is_page()) $classes[] = 'nb-team-designer-page';
  return $classes;
});

/**
 * Variációs árak típus|szín|méret kulcson, hogy a felület a valós darabárral
 * számoljon. Ha nincs egyező variáció, a termék alapára érvényes.
 */
function nb_team_variation_prices($product_id, $cfg){
  if (!function_exists('wc_get_product')) return [];
  $product = wc_get_product($product_id);
  if (!$product || !$product->is_type('variable')) return [];
  $variations = [];
  foreach ($product->get_children() as $child_id){
    $variation = wc_get_product($child_id);
    if (!$variation || $variation->get_status() !== 'publish') continue;
    $groups = [];
    foreach ($variation->get_attributes() as $key => $value){
      $group = function_exists('nb_detect_attribute_group_from_key') ? nb_detect_attribute_group_from_key($key) : '';
      if ($group) $groups[$group] = nb_utf8_strtolower((string)$value);
    }
    $price = function_exists('wc_get_price_to_display') ? wc_get_price_to_display($variation) : $variation->get_price();
    if ($price === '' || !is_numeric($price)) continue;
    $variations[] = ['attrs'=>$groups, 'price'=>floatval($price)];
  }
  if (!$variations) return [];
  $matches = function($attr, $label){
    if ($attr === '' || $attr === null) return true;
    $label = trim((string)$label);
    return $attr === nb_utf8_strtolower($label) || $attr === sanitize_title($label);
  };
  $prices = [];
  $types = isset($cfg['types']) && is_array($cfg['types']) ? $cfg['types'] : [''];
  $colors = isset($cfg['colors']) && is_array($cfg['colors']) ? $cfg['colors'] : [''];
  $sizes = isset($cfg['sizes']) && is_array($cfg['sizes']) ? $cfg['sizes'] : [''];
  foreach ($types as $type){
    foreach ($colors as $color){
      foreach ($sizes as $size){
        foreach ($variations as $variation){
          $a = $variation['attrs'];
          if ($matches($a['type'] ?? '', $type) && $matches($a['color'] ?? '', $color) && $matches($a['size'] ?? '', $size)){
            $prices[nb_normalize_type_key($type).'|'.nb_normalize_color_key($color).'|'.trim((string)$size)] = $variation['price'];
            break;
          }
        }
      }
    }
  }
  return $prices;
}

/** A frontend számára szükséges, szűrt adatok. */
function nb_team_public_data(){
  $stored = nb_get_settings([]);
  $settings = nb_sync_mockup_references(nb_clean_settings_unicode(is_array($stored) ? $stored : []));
  $settings = nb_enrich_catalog_for_designer($settings);
  $team = nb_team_get_settings();
  $catalog = [];
  $used_mockups = [];
  foreach (nb_team_allowed_product_ids($settings, $team) as $pid){
    $cfg = $settings['catalog'][$pid];
    $map = isset($cfg['map']) && is_array($cfg['map']) ? $cfg['map'] : [];
    $entries = [];
    foreach ($map as $key => $entry){
      $front = nb_mockup_by_reference($settings, $entry, 'front');
      if (!$front) continue;
      $back = nb_mockup_by_reference($settings, $entry, 'back');
      $entries[$key] = ['front'=>(string)($front['id'] ?? ''), 'back'=>$back ? (string)($back['id'] ?? '') : ''];
      $used_mockups[$entries[$key]['front']] = true;
      if ($entries[$key]['back'] !== '') $used_mockups[$entries[$key]['back']] = true;
    }
    if (!$entries) continue;
    $catalog[$pid] = [
      'id'             => $pid,
      'title'          => $cfg['title'] ?? get_the_title($pid),
      'types'          => array_values((array)($cfg['types'] ?? [])),
      'colors'         => array_values((array)($cfg['colors'] ?? [])),
      'colors_by_type' => isset($cfg['colors_by_type']) && is_array($cfg['colors_by_type']) ? $cfg['colors_by_type'] : new stdClass(),
      'sizes'          => array_values((array)($cfg['sizes'] ?? [])),
      'map'            => $entries,
      'price_value'    => isset($cfg['price_value']) ? floatval($cfg['price_value']) : null,
      'prices'         => nb_team_variation_prices($pid, $cfg) ?: new stdClass(),
    ];
  }
  $mockups = [];
  foreach ((array)($settings['mockups'] ?? []) as $mockup){
    $id = (string)($mockup['id'] ?? '');
    if ($id === '' || !isset($used_mockups[$id])) continue;
    $areas = [];
    $raw_areas = isset($mockup['areas']) && is_array($mockup['areas']) ? $mockup['areas'] : (isset($mockup['area']) ? [$mockup['area']] : []);
    foreach (array_values($raw_areas) as $index => $area){
      if (is_array($area)) $areas[] = nb_normalize_mockup_area($area, $index);
    }
    if (!$areas) $areas[] = nb_normalize_mockup_area([], 0);
    $mockups[$id] = [
      'id'        => $id,
      'image_url' => (string)($mockup['image_url'] ?? ''),
      'canvas_w'  => intval($mockup['canvas_w'] ?? ($areas[0]['canvas_w'] ?? 420)),
      'canvas_h'  => intval($mockup['canvas_h'] ?? ($areas[0]['canvas_h'] ?? 560)),
      'areas'     => $areas,
    ];
  }
  $fonts = [];
  foreach ((array)($settings['fonts'] ?? []) as $font){
    if (is_string($font) && trim($font) !== '') $fonts[] = $font;
  }
  return [
    'rest'      => esc_url_raw(rest_url('nb/v1/')),
    'nonce'     => wp_create_nonce('wp_rest'),
    'cartUrl'   => function_exists('wc_get_cart_url') ? wc_get_cart_url() : '',
    'catalog'   => $catalog ?: new stdClass(),
    'mockups'   => $mockups ?: new stdClass(),
    'colorMeta' => isset($settings['color_meta']) && is_array($settings['color_meta']) ? $settings['color_meta'] : new stdClass(),
    'fonts'     => $fonts,
    'discounts' => nb_normalize_bulk_discount_tiers($settings['bulk_discounts'] ?? []),
    'team'      => [
      'tiers'      => $team['tiers'],
      'presets'    => $team['presets'],
      'gap_mm'     => $team['gap_mm'],
      'min_qty'    => $team['min_qty'],
      'max_colors' => $team['max_colors'],
    ],
  ];
}

add_action('wp_enqueue_scripts', function(){
  if (!nb_team_is_page()) return;
  $version = defined('NB_DESIGNER_VERSION') ? NB_DESIGNER_VERSION : '2.3.0';
  wp_enqueue_style('nb-team-designer', NB_DESIGNER_URL.'assets/css/team-designer.css', [], $version);
  wp_enqueue_script('fabric', 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js', [], null, true);
  wp_enqueue_script('nb-team-designer', NB_DESIGNER_URL.'assets/js/team-designer.js', ['fabric'], $version, true);
  wp_localize_script('nb-team-designer', 'NB_TEAM', nb_team_public_data());
});

/* ------------------------------------------------------------------------ */
/* Kosár és rendelés                                                         */
/* ------------------------------------------------------------------------ */

/** A csapattételek darabára: a termék friss ára + a szerveren számolt nyomtatási ár. */
add_action('woocommerce_before_calculate_totals', function($cart){
  if (is_admin() && !defined('DOING_AJAX')) return;
  if (!$cart || !method_exists($cart, 'get_cart')) return;
  foreach ($cart->get_cart() as $item){
    if (empty($item['nb_team']) || empty($item['data']) || !is_a($item['data'], 'WC_Product')) continue;
    $source_id = !empty($item['variation_id']) ? intval($item['variation_id']) : intval($item['product_id']);
    $fresh = wc_get_product($source_id);
    if (!$fresh) continue;
    $base = floatval($fresh->get_price());
    $item['data']->set_price($base + max(0, floatval($item['nb_team_unit_print'] ?? 0)));
  }
}, 20);

add_filter('woocommerce_get_item_data', function($data, $item){
  if (empty($item['nb_team'])) return $data;
  $placements = isset($item['nb_team_placements']) && is_array($item['nb_team_placements']) ? $item['nb_team_placements'] : [];
  if ($placements){
    $data[] = [
      'key'   => __('Nyomat', 'nb-designer'),
      'value' => sprintf(__('%1$d elhelyezés, +%2$s/db', 'nb-designer'), count($placements), wp_strip_all_tags(wc_price(floatval($item['nb_team_unit_print'] ?? 0)))),
    ];
  }
  return $data;
}, 10, 2);

add_action('woocommerce_checkout_create_order_line_item', function($order_item, $cart_item_key, $values){
  if (empty($values['nb_team'])) return;
  $order_item->add_meta_data('_nb_team', 1);
  $order_item->add_meta_data('_nb_team_mode', sanitize_key($values['nb_team_mode'] ?? ''));
  $order_item->add_meta_data('_nb_team_unit_print', floatval($values['nb_team_unit_print'] ?? 0));
  $placements = isset($values['nb_team_placements']) && is_array($values['nb_team_placements']) ? $values['nb_team_placements'] : [];
  if ($placements){
    $order_item->add_meta_data(__('Nyomatok', 'nb-designer'), nb_team_placements_summary($placements));
  }
}, 20, 3);

/** A színenkénti tervek közös nyomdai fájljait csak az utolsó hivatkozó terv törlésekor töröljük. */
add_action('before_delete_post', function($post_id){
  if (get_post_type($post_id) !== 'nb_design' || get_post_meta($post_id, 'nb_module', true) !== 'team') return;
  $uploads = wp_upload_dir(null, false);
  foreach (['nb_team_print_url', 'nb_team_print_back_url'] as $key){
    $url = (string)get_post_meta($post_id, $key, true);
    if ($url === '') continue;
    $others = get_posts([
      'post_type'=>'nb_design', 'post_status'=>'any', 'fields'=>'ids', 'posts_per_page'=>1,
      'post__not_in'=>[$post_id], 'meta_query'=>[['key'=>$key, 'value'=>$url]],
    ]);
    if ($others) continue;
    $baseurl = set_url_scheme($uploads['baseurl'], 'http');
    $plain = set_url_scheme($url, 'http');
    if (strpos($plain, $baseurl.'/') !== 0) continue;
    $relative = rawurldecode(substr($plain, strlen($baseurl) + 1));
    if (strpos($relative, '..') !== false || !preg_match('/^nb_team_print(_back)?_\d+(-\d+)?\.png$/', wp_basename($relative))) continue;
    $path = wp_normalize_path(trailingslashit($uploads['basedir']).$relative);
    if (file_exists($path)) wp_delete_file($path);
  }
});

/* ------------------------------------------------------------------------ */
/* Admin                                                                     */
/* ------------------------------------------------------------------------ */

add_action('admin_menu', function(){
  add_submenu_page('nb-designer', __('Csapatruha tervező', 'nb-designer'), __('Csapatruha tervező', 'nb-designer'), nb_admin_capability(), 'nb-team-designer', 'nb_team_admin_render');
}, 20);

add_action('admin_enqueue_scripts', function(){
  if (sanitize_key($_GET['page'] ?? '') !== 'nb-team-designer') return;
  $version = defined('NB_DESIGNER_VERSION') ? NB_DESIGNER_VERSION : '2.3.0';
  wp_enqueue_style('nb-admin', NB_DESIGNER_URL.'admin/css/admin.css', [], $version);
});

add_action('admin_post_nb_team_save', function(){
  if (!current_user_can(nb_admin_capability())) wp_die(esc_html__('Nincs jogosultságod.', 'nb-designer'));
  check_admin_referer('nb_team_save');
  $input = wp_unslash($_POST['nb_team'] ?? []);
  $input = is_array($input) ? $input : [];
  if (!empty($input['reset_presets'])){
    $presets = nb_team_default_presets();
  } else {
    $presets = nb_team_sanitize_presets(array_values((array)($input['presets'] ?? [])));
  }
  $settings = [
    'products'   => array_values(array_filter(array_map('absint', (array)($input['products'] ?? [])))),
    'tiers'      => nb_team_sanitize_tiers(array_values((array)($input['tiers'] ?? []))),
    'presets'    => $presets,
    'gap_mm'     => max(0, floatval($input['gap_mm'] ?? 20)),
    'min_qty'    => max(1, intval($input['min_qty'] ?? 1)),
    'max_colors' => min(20, max(1, intval($input['max_colors'] ?? 8))),
  ];
  if (empty($settings['tiers'])) $settings['tiers'] = nb_team_default_tiers();
  update_option('nb_team_settings', $settings, false);
  wp_safe_redirect(add_query_arg(['page'=>'nb-team-designer', 'updated'=>1], admin_url('admin.php')));
  exit;
});

function nb_team_admin_render(){
  if (!current_user_can(nb_admin_capability())) return;
  $team = nb_team_get_settings();
  $designer = nb_get_settings([]);
  $catalog = isset($designer['catalog']) && is_array($designer['catalog']) ? $designer['catalog'] : [];
  $product_ids = isset($designer['products']) && is_array($designer['products']) ? array_map('absint', $designer['products']) : array_keys($catalog);
  $tiers = array_values($team['tiers']);
  while (count($tiers) < 5) $tiers[] = ['id'=>'', 'label'=>'', 'max_w_mm'=>'', 'max_h_mm'=>'', 'price'=>''];
  $presets = array_values($team['presets']);
  for ($i = 0; $i < 3; $i++) $presets[] = ['id'=>'', 'mode'=>'both', 'side'=>'front', 'kind'=>'logo', 'label'=>'', 'cx'=>0.5, 'top'=>0.1, 'w_mm'=>'', 'h_mm'=>'', 'text'=>''];
  $page_url = nb_team_designer_url();
  ?>
  <div class="wrap nb-admin nb-admin-v2 nb-team-admin">
    <header class="nb-page-header"><div><p class="nb-eyebrow"><?php esc_html_e('Külön modul', 'nb-designer'); ?></p><h1><?php esc_html_e('Csapatruha tervező', 'nb-designer'); ?></h1></div><div class="nb-header-actions"><a class="button" href="<?php echo esc_url($page_url); ?>" target="_blank" rel="noopener"><?php esc_html_e('Oldal megnyitása', 'nb-designer'); ?></a></div></header>
    <?php if (!empty($_GET['updated'])): ?><div class="notice notice-success is-dismissible"><p><?php esc_html_e('Beállítások elmentve.', 'nb-designer'); ?></p></div><?php endif; ?>
    <p><?php echo wp_kses_post(sprintf(__('A tervező a <a href="%1$s">%1$s</a> oldalon érhető el. A menübe a Megjelenés → Menük oldalon veheted fel.', 'nb-designer'), esc_url($page_url))); ?></p>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
      <input type="hidden" name="action" value="nb_team_save">
      <?php wp_nonce_field('nb_team_save'); ?>

      <h2><?php esc_html_e('Termékek', 'nb-designer'); ?></h2>
      <p class="description"><?php esc_html_e('Ha egyet sem jelölsz ki, a tervező összes terméke megjelenik.', 'nb-designer'); ?></p>
      <fieldset class="nb-team-products">
        <?php foreach ($product_ids as $pid): if (!isset($catalog[$pid])) continue; ?>
          <label style="display:inline-block;margin:0 18px 8px 0"><input type="checkbox" name="nb_team[products][]" value="<?php echo esc_attr($pid); ?>" <?php checked(in_array($pid, $team['products'], true)); ?>> <?php echo esc_html($catalog[$pid]['title'] ?? get_the_title($pid)); ?></label>
        <?php endforeach; ?>
      </fieldset>

      <h2><?php esc_html_e('Nyomatok ára (darabonként)', 'nb-designer'); ?></h2>
      <p class="description"><?php esc_html_e('Egy nyomat a terv egy oldalán egymáshoz közeli elemek csoportja (pl. logó és alatta a felirat). Az árat a befoglaló méretéhez illő legkisebb sáv adja; a legnagyobbnál nagyobb nyomat a legnagyobb sáv árát kapja. Üres sor nem mentődik.', 'nb-designer'); ?></p>
      <table class="widefat striped" style="max-width:820px">
        <thead><tr><th><?php esc_html_e('Megnevezés', 'nb-designer'); ?></th><th><?php esc_html_e('Max. szélesség (mm)', 'nb-designer'); ?></th><th><?php esc_html_e('Max. magasság (mm)', 'nb-designer'); ?></th><th><?php esc_html_e('Ár / db', 'nb-designer'); ?></th></tr></thead>
        <tbody>
        <?php foreach ($tiers as $i => $tier): ?>
          <tr>
            <td><input type="hidden" name="nb_team[tiers][<?php echo esc_attr($i); ?>][id]" value="<?php echo esc_attr($tier['id']); ?>"><input type="text" class="regular-text" name="nb_team[tiers][<?php echo esc_attr($i); ?>][label]" value="<?php echo esc_attr($tier['label']); ?>"></td>
            <td><input type="number" min="0" step="1" name="nb_team[tiers][<?php echo esc_attr($i); ?>][max_w_mm]" value="<?php echo esc_attr($tier['max_w_mm']); ?>"></td>
            <td><input type="number" min="0" step="1" name="nb_team[tiers][<?php echo esc_attr($i); ?>][max_h_mm]" value="<?php echo esc_attr($tier['max_h_mm']); ?>"></td>
            <td><input type="number" min="0" step="1" name="nb_team[tiers][<?php echo esc_attr($i); ?>][price]" value="<?php echo esc_attr($tier['price']); ?>"></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
      <table class="form-table" role="presentation">
        <tr><th scope="row"><label for="nb-team-gap"><?php esc_html_e('Egy nyomatnak számít, ha az elemek távolsága legfeljebb (mm)', 'nb-designer'); ?></label></th><td><input id="nb-team-gap" type="number" min="0" step="1" name="nb_team[gap_mm]" value="<?php echo esc_attr($team['gap_mm']); ?>"></td></tr>
        <tr><th scope="row"><label for="nb-team-min"><?php esc_html_e('Minimum rendelés (db)', 'nb-designer'); ?></label></th><td><input id="nb-team-min" type="number" min="1" step="1" name="nb_team[min_qty]" value="<?php echo esc_attr($team['min_qty']); ?>"></td></tr>
        <tr><th scope="row"><label for="nb-team-colors"><?php esc_html_e('Színek száma egy rendelésben legfeljebb', 'nb-designer'); ?></label></th><td><input id="nb-team-colors" type="number" min="1" max="20" step="1" name="nb_team[max_colors]" value="<?php echo esc_attr($team['max_colors']); ?>"></td></tr>
      </table>
      <p class="description"><?php esc_html_e('A mennyiségi kedvezmény sávjai az Árazás oldalon állíthatók; itt a teljes darabárra (termék + nyomat) érvényesülnek.', 'nb-designer'); ?></p>

      <h2><?php esc_html_e('Elhelyezési segédsablonok', 'nb-designer'); ?></h2>
      <p class="description"><?php esc_html_e('A vásárló ezekkel egy kattintással a jó helyre és jó méretben teszi a logót vagy feliratot, utána szabadon módosíthatja. Vízszintes közép és felső él: 0–1 közötti arány a nyomtatási felülethez képest (0,5 = középen). Méret mm-ben. A név nélküli sor nem mentődik.', 'nb-designer'); ?></p>
      <table class="widefat striped nb-team-presets">
        <thead><tr><th><?php esc_html_e('Megnevezés', 'nb-designer'); ?></th><th><?php esc_html_e('Mód', 'nb-designer'); ?></th><th><?php esc_html_e('Oldal', 'nb-designer'); ?></th><th><?php esc_html_e('Tartalom', 'nb-designer'); ?></th><th><?php esc_html_e('Vízsz. közép', 'nb-designer'); ?></th><th><?php esc_html_e('Felső él', 'nb-designer'); ?></th><th><?php esc_html_e('Szél. mm', 'nb-designer'); ?></th><th><?php esc_html_e('Mag. mm', 'nb-designer'); ?></th><th><?php esc_html_e('Alap szöveg', 'nb-designer'); ?></th></tr></thead>
        <tbody>
        <?php foreach ($presets as $i => $preset): $name = 'nb_team[presets]['.$i.']'; ?>
          <tr>
            <td><input type="hidden" name="<?php echo esc_attr($name); ?>[id]" value="<?php echo esc_attr($preset['id']); ?>"><input type="text" name="<?php echo esc_attr($name); ?>[label]" value="<?php echo esc_attr($preset['label']); ?>"></td>
            <td><select name="<?php echo esc_attr($name); ?>[mode]"><option value="work" <?php selected($preset['mode'], 'work'); ?>><?php esc_html_e('Munkaruha', 'nb-designer'); ?></option><option value="sport" <?php selected($preset['mode'], 'sport'); ?>><?php esc_html_e('Csapatmez', 'nb-designer'); ?></option><option value="both" <?php selected($preset['mode'], 'both'); ?>><?php esc_html_e('Mindkettő', 'nb-designer'); ?></option></select></td>
            <td><select name="<?php echo esc_attr($name); ?>[side]"><option value="front" <?php selected($preset['side'], 'front'); ?>><?php esc_html_e('Elöl', 'nb-designer'); ?></option><option value="back" <?php selected($preset['side'], 'back'); ?>><?php esc_html_e('Hátul', 'nb-designer'); ?></option></select></td>
            <td><select name="<?php echo esc_attr($name); ?>[kind]"><option value="logo" <?php selected($preset['kind'], 'logo'); ?>><?php esc_html_e('Logó', 'nb-designer'); ?></option><option value="text" <?php selected($preset['kind'], 'text'); ?>><?php esc_html_e('Felirat', 'nb-designer'); ?></option><option value="number" <?php selected($preset['kind'], 'number'); ?>><?php esc_html_e('Szám', 'nb-designer'); ?></option></select></td>
            <td><input type="number" min="0" max="1" step="0.01" style="width:80px" name="<?php echo esc_attr($name); ?>[cx]" value="<?php echo esc_attr($preset['cx']); ?>"></td>
            <td><input type="number" min="0" max="1" step="0.01" style="width:80px" name="<?php echo esc_attr($name); ?>[top]" value="<?php echo esc_attr($preset['top']); ?>"></td>
            <td><input type="number" min="0" step="1" style="width:80px" name="<?php echo esc_attr($name); ?>[w_mm]" value="<?php echo esc_attr($preset['w_mm']); ?>"></td>
            <td><input type="number" min="0" step="1" style="width:80px" name="<?php echo esc_attr($name); ?>[h_mm]" value="<?php echo esc_attr($preset['h_mm']); ?>"></td>
            <td><input type="text" name="<?php echo esc_attr($name); ?>[text]" value="<?php echo esc_attr($preset['text']); ?>"></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
      <p><label><input type="checkbox" name="nb_team[reset_presets]" value="1"> <?php esc_html_e('Segédsablonok visszaállítása az alapértékekre mentéskor', 'nb-designer'); ?></label></p>
      <?php submit_button(__('Beállítások mentése', 'nb-designer')); ?>
    </form>
  </div>
  <?php
}
