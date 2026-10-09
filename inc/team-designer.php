<?php
if ( ! defined('ABSPATH') ) exit;

/**
 * Csapat- és munkaruha-tervező: külön modul a /csapatruha-tervezo/ oldalon.
 * A meglévő katalógust, mockupokat és kedvezménysávokat csak olvassa; a saját
 * beállításai az nb_team_settings opcióban vannak, az eredeti tervezőt nem érinti.
 *
 * Árazás: termékenként és mennyiségi sávonként megadott darabár (a nyomtatással
 * együtt, egyoldalas), plusz sávonként megadott kétoldalas felár, ha elöl és hátul is
 * van minta. A sávot a rendelés teljes darabszáma dönti el; százalékos kedvezmény
 * a modulban nincs, a sávárak helyettesítik.
 */

define('NB_TEAM_PAGE_SLUG', 'csapatruha-tervezo');

/** Mennyiségi sávok (darabtól–darabig, 0 = felső határ nélkül), minden termékre közösek. */
function nb_team_default_bands(){
  return [
    ['min'=>1,  'max'=>10],
    ['min'=>11, 'max'=>25],
    ['min'=>26, 'max'=>50],
    ['min'=>51, 'max'=>0],
  ];
}

/**
 * Elhelyezési segédsablonok. A pozíció a nyomtatási felülethez képest arány
 * (cx: a doboz közepe vízszintesen, top: a doboz teteje), a méret mm-ben értendő,
 * így minden mockupon ugyanott és ugyanakkora fizikai méretben jelenik meg.
 * bind: 'name' vagy 'number' esetén a felirat játékosonként a névsorból jön.
 */
function nb_team_default_presets(){
  return [
    ['id'=>'work-left-chest',  'mode'=>'work',  'side'=>'front', 'kind'=>'logo',   'label'=>'Bal mell logó',         'cx'=>0.70, 'top'=>0.08, 'w_mm'=>90,  'h_mm'=>90,  'text'=>'', 'bind'=>''],
    ['id'=>'work-center',      'mode'=>'work',  'side'=>'front', 'kind'=>'logo',   'label'=>'Mell közép logó',       'cx'=>0.50, 'top'=>0.10, 'w_mm'=>250, 'h_mm'=>250, 'text'=>'', 'bind'=>''],
    ['id'=>'work-right-text',  'mode'=>'work',  'side'=>'front', 'kind'=>'text',   'label'=>'Jobb mell felirat',     'cx'=>0.30, 'top'=>0.10, 'w_mm'=>90,  'h_mm'=>22,  'text'=>'Név / beosztás', 'bind'=>'name'],
    ['id'=>'work-back-top',    'mode'=>'work',  'side'=>'back',  'kind'=>'text',   'label'=>'Hát felső cégnév',      'cx'=>0.50, 'top'=>0.05, 'w_mm'=>260, 'h_mm'=>50,  'text'=>'Cégnév / egyedi felirat', 'bind'=>''],
    ['id'=>'work-back-logo',   'mode'=>'work',  'side'=>'back',  'kind'=>'logo',   'label'=>'Hát nagy logó',         'cx'=>0.50, 'top'=>0.20, 'w_mm'=>280, 'h_mm'=>280, 'text'=>'', 'bind'=>''],
    ['id'=>'sport-crest',      'mode'=>'sport', 'side'=>'front', 'kind'=>'logo',   'label'=>'Bal mell címer',        'cx'=>0.70, 'top'=>0.08, 'w_mm'=>80,  'h_mm'=>80,  'text'=>'', 'bind'=>''],
    ['id'=>'sport-front-name', 'mode'=>'sport', 'side'=>'front', 'kind'=>'text',   'label'=>'Mell közép csapatnév',  'cx'=>0.50, 'top'=>0.34, 'w_mm'=>260, 'h_mm'=>60,  'text'=>'CSAPATNÉV', 'bind'=>''],
    ['id'=>'sport-front-num',  'mode'=>'sport', 'side'=>'front', 'kind'=>'number', 'label'=>'Jobb mell szám',        'cx'=>0.30, 'top'=>0.08, 'w_mm'=>70,  'h_mm'=>90,  'text'=>'10', 'bind'=>'number'],
    ['id'=>'sport-back-name',  'mode'=>'sport', 'side'=>'back',  'kind'=>'text',   'label'=>'Hát név',               'cx'=>0.50, 'top'=>0.05, 'w_mm'=>280, 'h_mm'=>70,  'text'=>'NÉV', 'bind'=>'name'],
    ['id'=>'sport-back-num',   'mode'=>'sport', 'side'=>'back',  'kind'=>'number', 'label'=>'Hát szám',              'cx'=>0.50, 'top'=>0.22, 'w_mm'=>220, 'h_mm'=>250, 'text'=>'10', 'bind'=>'number'],
  ];
}

/** A típusválasztó (első képernyő) szövegei és képei. */
function nb_team_default_intro(){
  return [
    'kicker' => 'Csapat- és munkaruha tervező',
    'title'  => 'Mit tervezel?',
    'lead'   => 'Tervezd meg egyszer, add meg a színeket és a méreteket, a mennyiségi kedvezményt pedig automatikusan számoljuk.',
    'cards'  => [
      'work'  => ['title'=>'Munkaruha, céges ruha', 'text'=>'Logó a mellen, cégnév a háton. Egységes megjelenés a kollégáknak.'],
      'sport' => ['title'=>'Csapatmez, sportpóló', 'text'=>'Címer elöl, csapatnév és szám a háton.'],
    ],
    // Nagy kép a kártyák alatt, opcionális címmel és leírással.
    'banner' => ['image_id'=>0, 'title'=>'', 'text'=>''],
  ];
}

function nb_team_sanitize_intro($intro){
  $defaults = nb_team_default_intro();
  $intro = is_array($intro) ? $intro : [];
  $clean = [
    'kicker' => sanitize_text_field($intro['kicker'] ?? $defaults['kicker']),
    'title'  => sanitize_text_field($intro['title'] ?? $defaults['title']),
    'lead'   => sanitize_textarea_field($intro['lead'] ?? $defaults['lead']),
    'cards'  => [],
  ];
  foreach ($defaults['cards'] as $key => $card_defaults){
    $card = isset($intro['cards'][$key]) && is_array($intro['cards'][$key]) ? $intro['cards'][$key] : [];
    $title = sanitize_text_field($card['title'] ?? $card_defaults['title']);
    $clean['cards'][$key] = [
      'title' => $title !== '' ? $title : $card_defaults['title'],
      'text'  => sanitize_textarea_field($card['text'] ?? $card_defaults['text']),
    ];
  }
  $banner = isset($intro['banner']) && is_array($intro['banner']) ? $intro['banner'] : [];
  $clean['banner'] = [
    'image_id' => absint($banner['image_id'] ?? 0),
    'title'    => sanitize_text_field($banner['title'] ?? ''),
    'text'     => sanitize_textarea_field($banner['text'] ?? ''),
  ];
  return $clean;
}

/** A sablonnak: a beállított szövegek és a nagy kép URL-je. */
function nb_team_intro_view(){
  $intro = nb_team_get_settings()['intro'];
  $image_id = $intro['banner']['image_id'];
  $url = $image_id ? wp_get_attachment_image_url($image_id, 'full') : '';
  $intro['banner']['image_url'] = $url ?: '';
  $intro['banner']['image_alt'] = $image_id ? (string)get_post_meta($image_id, '_wp_attachment_image_alt', true) : '';
  return $intro;
}

function nb_team_defaults(){
  return [
    'intro'    => nb_team_default_intro(),
    'products' => [],
    'bands'    => nb_team_default_bands(),
    'prices'   => [],
    'size_fees' => [],
    'presets'  => nb_team_default_presets(),
    'min_qty'  => 1,
    'max_colors' => 8,
    'personal_fee' => 0,
    'max_players' => 100,
  ];
}

function nb_team_sanitize_bands($bands){
  $clean = [];
  foreach ((array)$bands as $band){
    if (!is_array($band)) continue;
    $min = intval($band['min'] ?? 0);
    $max = intval($band['max'] ?? 0);
    if ($min < 1) continue;
    $clean[] = ['min'=>$min, 'max'=>($max >= $min ? $max : 0)];
  }
  usort($clean, function($a, $b){ return $a['min'] <=> $b['min']; });
  return array_slice($clean, 0, 8);
}

/** Árak: [ 'termékID|típus' => [ sávindex => ['single'=>Ft, 'double'=>Ft felár] ] ]. Üres mező = nincs megadva. */
function nb_team_sanitize_prices($prices){
  $clean = [];
  foreach ((array)$prices as $key => $rows){
    $parts = explode('|', (string)$key, 2);
    $pid = absint($parts[0]);
    if (!$pid || !is_array($rows)) continue;
    $key = $pid.'|'.nb_utf8_strtolower(trim($parts[1] ?? ''));
    foreach ($rows as $index => $row){
      if (!is_array($row)) continue;
      $single = isset($row['single']) && $row['single'] !== '' ? max(0, round(floatval($row['single']), 2)) : null;
      $double = isset($row['double']) && $row['double'] !== '' ? max(0, round(floatval($row['double']), 2)) : null;
      if ($single === null && $double === null) continue;
      $clean[$key][intval($index)] = ['single'=>$single, 'double'=>$double];
    }
  }
  return $clean;
}

/** Méretfelár: [ 'termékID|típus' => [ méret => Ft/db ] ] (pl. 3XL, 4XL drágább). */
function nb_team_sanitize_size_fees($fees){
  $clean = [];
  foreach ((array)$fees as $key => $sizes){
    $parts = explode('|', (string)$key, 2);
    $pid = absint($parts[0]);
    if (!$pid || !is_array($sizes)) continue;
    $key = $pid.'|'.nb_utf8_strtolower(trim($parts[1] ?? ''));
    foreach ($sizes as $size => $fee){
      $size = trim(sanitize_text_field((string)$size));
      if ($size === '' || $fee === '' || $fee === null) continue;
      $fee = max(0, round(floatval($fee), 2));
      if ($fee > 0) $clean[$key][$size] = $fee;
    }
  }
  return $clean;
}

function nb_team_size_fee($team, $pid, $type, $size){
  $key = intval($pid).'|'.nb_normalize_type_key($type);
  return floatval($team['size_fees'][$key][trim((string)$size)] ?? 0);
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
      'bind'  => $kind !== 'logo' && in_array(($preset['bind'] ?? ''), ['name', 'number'], true) ? $preset['bind'] : '',
    ];
  }
  return $clean;
}

function nb_team_get_settings(){
  $defaults = nb_team_defaults();
  $stored = get_option('nb_team_settings', []);
  $stored = is_array($stored) ? $stored : [];
  $settings = array_merge($defaults, $stored);
  $settings['intro'] = nb_team_sanitize_intro($settings['intro']);
  $settings['products'] = array_values(array_filter(array_map('absint', (array)$settings['products'])));
  $settings['bands'] = nb_team_sanitize_bands($settings['bands']);
  if (empty($settings['bands'])) $settings['bands'] = nb_team_default_bands();
  $settings['prices'] = nb_team_sanitize_prices($settings['prices']);
  $settings['size_fees'] = nb_team_sanitize_size_fees($settings['size_fees']);
  $settings['presets'] = nb_team_sanitize_presets($settings['presets']);
  $settings['min_qty'] = max(1, intval($settings['min_qty']));
  $settings['max_colors'] = min(20, max(1, intval($settings['max_colors'])));
  $settings['personal_fee'] = max(0, round(floatval($settings['personal_fee']), 2));
  $settings['max_players'] = min(300, max(1, intval($settings['max_players'])));
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

define('NB_TEAM_GROUP_GAP_MM', 20);

/** Mely oldalakon van minta (egy- vagy kétoldalas), és a gyártáshoz a nyomatok mérete. Árat nem számol. */
function nb_team_print_layout($elements){
  $placements = nb_team_group_elements($elements, NB_TEAM_GROUP_GAP_MM);
  $sides = array_values(array_unique(array_column($placements, 'side')));
  return ['placements'=>$placements, 'sides'=>$sides, 'double'=>count($sides) > 1];
}

/**
 * A termék (és típus) ársávjai: [{min, max, single, double}]. A beállítatlan sávok
 * kimaradnak. Ha a terméknek egyáltalán nincs ára, a WooCommerce-ár egyoldalas árként,
 * a tervező kétoldalas felára felárként érvényes, egyetlen sávban.
 */
function nb_team_price_bands($pid, $type, $team = null, $designer = null){
  if ($team === null) $team = nb_team_get_settings();
  $key = intval($pid).'|'.nb_normalize_type_key($type);
  $rows = isset($team['prices'][$key]) ? $team['prices'][$key] : [];
  $bands = [];
  foreach ($team['bands'] as $index => $band){
    $row = $rows[$index] ?? null;
    if (!$row || $row['single'] === null) continue;
    $bands[] = ['min'=>$band['min'], 'max'=>$band['max'], 'single'=>floatval($row['single']), 'double'=>floatval($row['double'] ?? 0)];
  }
  if ($bands) return $bands;
  if ($designer === null) $designer = nb_get_settings([]);
  $product = function_exists('wc_get_product') ? wc_get_product(intval($pid)) : null;
  $price = $product ? floatval($product->get_price()) : 0;
  return [['min'=>1, 'max'=>0, 'single'=>$price, 'double'=>max(0, floatval($designer['double_sided_fee'] ?? 0)), 'fallback'=>true]];
}

/** A darabszámhoz tartozó sáv: a legnagyobb, amelynek alsó határát elérte a rendelés. */
function nb_team_band_for_qty($bands, $qty){
  $found = $bands ? $bands[0] : null;
  foreach ((array)$bands as $band){
    if ($qty >= $band['min']) $found = $band;
  }
  return $found;
}

function nb_team_unit_price($bands, $qty, $double, $personal, $team = null){
  if ($team === null) $team = nb_team_get_settings();
  $band = nb_team_band_for_qty($bands, $qty);
  if (!$band) return 0;
  return round($band['single'] + ($double ? $band['double'] : 0) + ($personal ? floatval($team['personal_fee']) : 0), 2);
}

/** "KOVÁCS (10), NAGY (7), (név nélkül)" */
function nb_team_players_summary($players){
  $parts = [];
  foreach ((array)$players as $player){
    $name = trim((string)($player['name'] ?? ''));
    $number = trim((string)($player['number'] ?? ''));
    if ($name !== '' && $number !== '') $parts[] = $name.' ('.$number.')';
    elseif ($name !== '') $parts[] = $name;
    elseif ($number !== '') $parts[] = '#'.$number;
    else $parts[] = __('(név nélkül)', 'nb-designer');
  }
  return implode(', ', $parts);
}

function nb_team_placements_summary($placements){
  $parts = [];
  foreach ((array)$placements as $placement){
    $side = ($placement['side'] ?? '') === 'back' ? __('hátul', 'nb-designer') : __('elöl', 'nb-designer');
    $parts[] = sprintf('%s %s×%s cm', $side,
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
      'size_fees_by_type' => (function() use ($pid, $cfg, $team){
        $out = [];
        foreach ((array)($cfg['types'] ?? ['']) ?: [''] as $type){
          $fees = $team['size_fees'][$pid.'|'.nb_normalize_type_key($type)] ?? [];
          $out[nb_normalize_type_key($type)] = $fees ?: new stdClass();
        }
        return $out ?: new stdClass();
      })(),
      'bands_by_type'  => (function() use ($pid, $cfg, $team, $settings){
        $out = [];
        foreach ((array)($cfg['types'] ?? ['']) ?: [''] as $type) $out[nb_normalize_type_key($type)] = nb_team_price_bands($pid, $type, $team, $settings);
        if (!$out) $out[''] = nb_team_price_bands($pid, '', $team, $settings);
        return $out;
      })(),
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
    'team'      => [
      'presets'    => $team['presets'],
      'min_qty'    => $team['min_qty'],
      'max_colors' => $team['max_colors'],
      'personal_fee' => $team['personal_fee'],
      'max_players'  => $team['max_players'],
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

/**
 * A csapattételek darabára a beállított ársávokból: a sávot a csoport (egy rendelés a
 * tervezőből) teljes darabszáma adja, így ha a vevő a kosárban módosítja a darabszámot,
 * az ár is követi.
 */
add_action('woocommerce_before_calculate_totals', function($cart){
  if (is_admin() && !defined('DOING_AJAX')) return;
  if (!$cart || !method_exists($cart, 'get_cart')) return;
  $groups = [];
  foreach ($cart->get_cart() as $item){
    if (empty($item['nb_team'])) continue;
    $group = (string)($item['nb_team_group'] ?? '');
    $groups[$group] = ($groups[$group] ?? 0) + max(1, intval($item['quantity'] ?? 1));
  }
  if (!$groups) return;
  $team = nb_team_get_settings();
  $designer = nb_get_settings([]);
  $bands_cache = [];
  foreach ($cart->get_cart() as $item){
    if (empty($item['nb_team']) || empty($item['data']) || !is_a($item['data'], 'WC_Product')) continue;
    $key = intval($item['nb_team_pid'] ?? 0).'|'.nb_normalize_type_key($item['nb_team_type'] ?? '');
    if (!isset($bands_cache[$key])) $bands_cache[$key] = nb_team_price_bands(intval($item['nb_team_pid'] ?? 0), $item['nb_team_type'] ?? '', $team, $designer);
    $qty = $groups[(string)($item['nb_team_group'] ?? '')] ?? 1;
    $size_fee = nb_team_size_fee($team, intval($item['nb_team_pid'] ?? 0), $item['nb_team_type'] ?? '', $item['nb_team_size'] ?? '');
    $item['data']->set_price(nb_team_unit_price($bands_cache[$key], $qty, !empty($item['nb_team_double']), !empty($item['nb_team_personal']), $team) + $size_fee);
  }
}, 20);

add_filter('woocommerce_get_item_data', function($data, $item){
  if (empty($item['nb_team'])) return $data;
  $data[] = ['key'=>__('Nyomtatás', 'nb-designer'), 'value'=>!empty($item['nb_team_double']) ? __('kétoldalas', 'nb-designer') : __('egyoldalas', 'nb-designer')];
  if (!empty($item['nb_team_players']) && is_array($item['nb_team_players'])){
    $data[] = ['key'=>(($item['nb_team_mode'] ?? '') === 'sport' ? __('Játékosok', 'nb-designer') : __('Nevek', 'nb-designer')), 'value'=>nb_team_players_summary($item['nb_team_players'])];
  }
  return $data;
}, 10, 2);

add_action('woocommerce_checkout_create_order_line_item', function($order_item, $cart_item_key, $values){
  if (empty($values['nb_team'])) return;
  $order_item->add_meta_data('_nb_team', 1);
  $order_item->add_meta_data('_nb_team_mode', sanitize_key($values['nb_team_mode'] ?? ''));
  $order_item->add_meta_data(__('Nyomtatás', 'nb-designer'), !empty($values['nb_team_double']) ? __('kétoldalas', 'nb-designer') : __('egyoldalas', 'nb-designer'));
  $placements = isset($values['nb_team_placements']) && is_array($values['nb_team_placements']) ? $values['nb_team_placements'] : [];
  if ($placements){
    $order_item->add_meta_data('_nb_team_placements', nb_team_placements_summary($placements));
  }
  $players = isset($values['nb_team_players']) && is_array($values['nb_team_players']) ? $values['nb_team_players'] : [];
  if ($players){
    $order_item->add_meta_data(($values['nb_team_mode'] ?? '') === 'sport' ? __('Játékosok', 'nb-designer') : __('Nevek', 'nb-designer'), nb_team_players_summary($players));
    $order_item->add_meta_data('_nb_team_players', wp_json_encode($players));
  }
}, 20, 3);

/** Gyártáshoz: a rendelés tételénél játékosonként a név- és számfájlok. */
add_action('woocommerce_after_order_itemmeta', function($item_id, $item){
  if (!is_admin() || !is_object($item) || !method_exists($item, 'get_meta')) return;
  $layout = (string)$item->get_meta('_nb_team_placements');
  if ($layout !== '') echo '<p class="nb-team-layout"><strong>'.esc_html__('Nyomatok mérete (gyártáshoz):', 'nb-designer').'</strong> '.esc_html($layout).'</p>';
  $players = json_decode((string)$item->get_meta('_nb_team_players'), true);
  if (!is_array($players) || !$players) return;
  echo '<table class="widefat striped nb-team-players" style="margin-top:8px;max-width:640px"><thead><tr><th>'.esc_html__('Név', 'nb-designer').'</th><th>'.esc_html__('Szám', 'nb-designer').'</th><th>'.esc_html__('Név/szám fájl', 'nb-designer').'</th></tr></thead><tbody>';
  foreach ($players as $player){
    $links = [];
    foreach (['front'=>__('elöl', 'nb-designer'), 'back'=>__('hátul', 'nb-designer')] as $side => $label){
      if (!empty($player[$side])) $links[] = '<a href="'.esc_url($player[$side]).'" download>'.esc_html($label).'</a>';
    }
    echo '<tr><td>'.esc_html($player['name'] ?? '').'</td><td>'.esc_html($player['number'] ?? '').'</td><td>'.($links ? implode(' · ', $links) : '—').'</td></tr>';
  }
  echo '</tbody></table>';
}, 10, 2);

/** A színenkénti tervek közös nyomdai fájljait csak az utolsó hivatkozó terv törlésekor töröljük. */
function nb_team_upload_path($url, $pattern){
  $uploads = wp_upload_dir(null, false);
  $baseurl = set_url_scheme($uploads['baseurl'], 'http');
  $plain = set_url_scheme((string)$url, 'http');
  if ($plain === '' || strpos($plain, $baseurl.'/') !== 0) return '';
  $relative = rawurldecode(substr($plain, strlen($baseurl) + 1));
  if (strpos($relative, '..') !== false || !preg_match($pattern, wp_basename($relative))) return '';
  return wp_normalize_path(trailingslashit($uploads['basedir']).$relative);
}

add_action('before_delete_post', function($post_id){
  if (get_post_type($post_id) !== 'nb_design' || get_post_meta($post_id, 'nb_module', true) !== 'team') return;
  // A játékosfájlok színenként egy tervhez tartoznak, a tervvel együtt törölhetők.
  $players = json_decode((string)get_post_meta($post_id, 'nb_team_roster_json', true), true);
  foreach ((array)$players as $player){
    foreach (['front', 'back'] as $side){
      $path = nb_team_upload_path($player[$side] ?? '', '/^nb_team_personal_\d+_\d+_(front|back)(-\d+)?\.png$/');
      if ($path !== '' && file_exists($path)) wp_delete_file($path);
    }
  }
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
  wp_enqueue_media();
  wp_add_inline_script('media-editor', <<<'JS'
jQuery(function($){
  $(document).on('click', '.nb-team-image-pick', function(e){
    e.preventDefault();
    var box = $(this).closest('.nb-team-image');
    var frame = wp.media({ title: 'Kép kiválasztása', button: { text: 'Kiválasztom' }, library: { type: 'image' }, multiple: false });
    frame.on('select', function(){
      var file = frame.state().get('selection').first().toJSON();
      var url = (file.sizes && (file.sizes.medium_large || file.sizes.large || file.sizes.full) || file).url;
      box.find('input[type=hidden]').val(file.id);
      box.find('.nb-team-image__preview').html($('<img>').attr('src', url).css({maxWidth: '360px', height: 'auto', borderRadius: '8px', display: 'block'}));
      box.find('.nb-team-image-remove').show();
    });
    frame.open();
  });
  $(document).on('click', '.nb-team-image-remove', function(e){
    e.preventDefault();
    var box = $(this).closest('.nb-team-image');
    box.find('input[type=hidden]').val('0');
    box.find('.nb-team-image__preview').empty();
    $(this).hide();
  });
});
JS
  );
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
    'intro'      => nb_team_sanitize_intro($input['intro'] ?? []),
    'products'   => array_values(array_filter(array_map('absint', (array)($input['products'] ?? [])))),
    'bands'      => nb_team_sanitize_bands(array_values((array)($input['bands'] ?? []))),
    'prices'     => nb_team_sanitize_prices((array)($input['prices'] ?? [])),
    'size_fees'  => nb_team_sanitize_size_fees((array)($input['size_fees'] ?? [])),
    'presets'    => $presets,
    'min_qty'    => max(1, intval($input['min_qty'] ?? 1)),
    'max_colors' => min(20, max(1, intval($input['max_colors'] ?? 8))),
    'personal_fee' => max(0, round(floatval($input['personal_fee'] ?? 0), 2)),
    'max_players'  => min(300, max(1, intval($input['max_players'] ?? 100))),
  ];
  if (empty($settings['bands'])) $settings['bands'] = nb_team_default_bands();
  update_option('nb_team_settings', $settings, false);
  wp_safe_redirect(add_query_arg(['page'=>'nb-team-designer', 'updated'=>1], admin_url('admin.php')));
  exit;
});

function nb_team_admin_render(){
  if (!current_user_can(nb_admin_capability())) return;
  $team = nb_team_get_settings();
  $intro = $team['intro'];
  $designer = nb_get_settings([]);
  $catalog = isset($designer['catalog']) && is_array($designer['catalog']) ? $designer['catalog'] : [];
  $product_ids = isset($designer['products']) && is_array($designer['products']) ? array_map('absint', $designer['products']) : array_keys($catalog);
  $bands = array_values($team['bands']);
  $band_rows = $bands;
  while (count($band_rows) < 6) $band_rows[] = ['min'=>'', 'max'=>''];
  $band_label = function($band){ return $band['max'] ? $band['min'].'–'.$band['max'].' db' : $band['min'].' db-tól'; };
  // Árazandó termékek: a modulban megjelenők, típusonként.
  $price_options = [];
  foreach ($product_ids as $pid){
    if (!isset($catalog[$pid]) || ($team['products'] && !in_array($pid, $team['products'], true))) continue;
    $types = isset($catalog[$pid]['types']) && is_array($catalog[$pid]['types']) && $catalog[$pid]['types'] ? $catalog[$pid]['types'] : [''];
    foreach ($types as $type){
      $title = $catalog[$pid]['title'] ?? get_the_title($pid);
      $sizes = array_values(array_filter(array_map(function($size){ return trim((string)$size); }, (array)($catalog[$pid]['sizes'] ?? [])), 'strlen'));
      $price_options[] = ['key'=>$pid.'|'.nb_normalize_type_key($type), 'label'=>$type !== '' && $type !== $title ? $title.' – '.$type : $title, 'sizes'=>$sizes];
    }
  }
  $presets = array_values($team['presets']);
  for ($i = 0; $i < 3; $i++) $presets[] = ['id'=>'', 'mode'=>'both', 'side'=>'front', 'kind'=>'logo', 'label'=>'', 'cx'=>0.5, 'top'=>0.1, 'w_mm'=>'', 'h_mm'=>'', 'text'=>'', 'bind'=>''];
  $page_url = nb_team_designer_url();
  ?>
  <div class="wrap nb-admin nb-admin-v2 nb-team-admin">
    <header class="nb-page-header"><div><p class="nb-eyebrow"><?php esc_html_e('Külön modul', 'nb-designer'); ?></p><h1><?php esc_html_e('Csapatruha tervező', 'nb-designer'); ?></h1></div><div class="nb-header-actions"><a class="button" href="<?php echo esc_url($page_url); ?>" target="_blank" rel="noopener"><?php esc_html_e('Oldal megnyitása', 'nb-designer'); ?></a></div></header>
    <?php if (!empty($_GET['updated'])): ?><div class="notice notice-success is-dismissible"><p><?php esc_html_e('Beállítások elmentve.', 'nb-designer'); ?></p></div><?php endif; ?>
    <p><?php echo wp_kses_post(sprintf(__('A tervező a <a href="%1$s">%1$s</a> oldalon érhető el. A menübe a Megjelenés → Menük oldalon veheted fel.', 'nb-designer'), esc_url($page_url))); ?></p>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
      <input type="hidden" name="action" value="nb_team_save">
      <?php wp_nonce_field('nb_team_save'); ?>

      <h2><?php esc_html_e('Típusválasztó (első képernyő)', 'nb-designer'); ?></h2>
      <p class="description"><?php esc_html_e('Ezt látja a vásárló, amikor megnyitja a tervezőt.', 'nb-designer'); ?></p>
      <table class="form-table" role="presentation">
        <tr><th scope="row"><label for="nb-team-kicker"><?php esc_html_e('Felső címke', 'nb-designer'); ?></label></th><td><input id="nb-team-kicker" class="regular-text" type="text" name="nb_team[intro][kicker]" value="<?php echo esc_attr($intro['kicker']); ?>"></td></tr>
        <tr><th scope="row"><label for="nb-team-title"><?php esc_html_e('Cím', 'nb-designer'); ?></label></th><td><input id="nb-team-title" class="regular-text" type="text" name="nb_team[intro][title]" value="<?php echo esc_attr($intro['title']); ?>"></td></tr>
        <tr><th scope="row"><label for="nb-team-lead"><?php esc_html_e('Bevezető szöveg', 'nb-designer'); ?></label></th><td><textarea id="nb-team-lead" class="large-text" rows="3" name="nb_team[intro][lead]"><?php echo esc_textarea($intro['lead']); ?></textarea></td></tr>
        <?php foreach (['work'=>__('Munkaruha kártya', 'nb-designer'), 'sport'=>__('Csapatmez kártya', 'nb-designer')] as $card_key => $card_label): $card = $intro['cards'][$card_key]; $card_name = 'nb_team[intro][cards]['.$card_key.']'; ?>
          <tr>
            <th scope="row"><?php echo esc_html($card_label); ?></th>
            <td>
              <p><label><?php esc_html_e('Cím', 'nb-designer'); ?><br><input class="regular-text" type="text" name="<?php echo esc_attr($card_name); ?>[title]" value="<?php echo esc_attr($card['title']); ?>"></label></p>
              <p><label><?php esc_html_e('Leírás', 'nb-designer'); ?><br><textarea class="large-text" rows="2" name="<?php echo esc_attr($card_name); ?>[text]"><?php echo esc_textarea($card['text']); ?></textarea></label></p>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php $banner = $intro['banner']; $banner_image = $banner['image_id'] ? wp_get_attachment_image_url($banner['image_id'], 'medium_large') : ''; ?>
        <tr>
          <th scope="row"><?php esc_html_e('Nagy kép a kártyák alatt', 'nb-designer'); ?></th>
          <td>
            <div class="nb-team-image">
              <input type="hidden" name="nb_team[intro][banner][image_id]" value="<?php echo esc_attr($banner['image_id']); ?>">
              <div class="nb-team-image__preview" style="margin:0 0 6px"><?php if ($banner_image): ?><img src="<?php echo esc_url($banner_image); ?>" alt="" style="max-width:360px;height:auto;border-radius:8px;display:block"><?php endif; ?></div>
              <button type="button" class="button nb-team-image-pick"><?php esc_html_e('Kép kiválasztása', 'nb-designer'); ?></button>
              <button type="button" class="button-link nb-team-image-remove" style="margin-left:8px;<?php echo $banner_image ? '' : 'display:none'; ?>"><?php esc_html_e('Kép eltávolítása', 'nb-designer'); ?></button>
            </div>
            <p class="description"><?php esc_html_e('Teljes szélességben jelenik meg a két kártya alatt. Ajánlott: fekvő kép, legalább 1600 px széles.', 'nb-designer'); ?></p>
            <p><label><?php esc_html_e('Cím (nem kötelező)', 'nb-designer'); ?><br><input class="regular-text" type="text" name="nb_team[intro][banner][title]" value="<?php echo esc_attr($banner['title']); ?>"></label></p>
            <p><label><?php esc_html_e('Leírás (nem kötelező)', 'nb-designer'); ?><br><textarea class="large-text" rows="4" name="nb_team[intro][banner][text]"><?php echo esc_textarea($banner['text']); ?></textarea></label></p>
          </td>
        </tr>
      </table>

      <h2><?php esc_html_e('Termékek', 'nb-designer'); ?></h2>
      <p class="description"><?php esc_html_e('Ha egyet sem jelölsz ki, a tervező összes terméke megjelenik.', 'nb-designer'); ?></p>
      <fieldset class="nb-team-products">
        <?php foreach ($product_ids as $pid): if (!isset($catalog[$pid])) continue; ?>
          <label style="display:inline-block;margin:0 18px 8px 0"><input type="checkbox" name="nb_team[products][]" value="<?php echo esc_attr($pid); ?>" <?php checked(in_array($pid, $team['products'], true)); ?>> <?php echo esc_html($catalog[$pid]['title'] ?? get_the_title($pid)); ?></label>
        <?php endforeach; ?>
      </fieldset>

      <h2><?php esc_html_e('Árak', 'nb-designer'); ?></h2>
      <p class="description"><?php esc_html_e('A darabár a nyomtatással együtt értendő; a vevő csak ezt látja, külön nyomatárat nem. A sávot a rendelés teljes darabszáma dönti el (minden szín és méret együtt). Kétoldalas, ha elöl és hátul is van minta: ilyenkor a darabárhoz a kétoldalas felár adódik.', 'nb-designer'); ?></p>
      <h3><?php esc_html_e('Mennyiségi sávok', 'nb-designer'); ?></h3>
      <table class="widefat striped" style="max-width:420px">
        <thead><tr><th><?php esc_html_e('Darabtól', 'nb-designer'); ?></th><th><?php esc_html_e('Darabig (üres = felette)', 'nb-designer'); ?></th></tr></thead>
        <tbody>
        <?php foreach ($band_rows as $i => $band): ?>
          <tr>
            <td><input type="number" min="1" step="1" style="width:110px" name="nb_team[bands][<?php echo esc_attr($i); ?>][min]" value="<?php echo esc_attr($band['min']); ?>"></td>
            <td><input type="number" min="0" step="1" style="width:110px" name="nb_team[bands][<?php echo esc_attr($i); ?>][max]" value="<?php echo esc_attr($band['max'] ?: ''); ?>"></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
      <p class="description"><?php esc_html_e('Ha a sávokat módosítod, mentsd el, és utána ellenőrizd a termékek árait: az árak a sávok sorrendjéhez tartoznak.', 'nb-designer'); ?></p>
      <h3><?php esc_html_e('Darabárak termékenként', 'nb-designer'); ?></h3>
      <?php if (!$price_options): ?><p><?php esc_html_e('Nincs termék a modulban.', 'nb-designer'); ?></p><?php endif; ?>
      <?php foreach ($price_options as $option): $rows = $team['prices'][$option['key']] ?? []; $option_sizes = $option['sizes']; $fees = $team['size_fees'][$option['key']] ?? []; ?>
        <table class="widefat striped" style="max-width:620px;margin:0 0 18px">
          <thead><tr><th><?php echo esc_html($option['label']); ?><?php if (!$rows): ?> <span style="color:#b32d2e;font-weight:400"><?php esc_html_e('(nincs ár megadva: most a WooCommerce-ár és a tervező kétoldalas felára számol)', 'nb-designer'); ?></span><?php endif; ?></th><th><?php esc_html_e('Egyoldalas darabár (Ft)', 'nb-designer'); ?></th><th><?php esc_html_e('Kétoldalas felár (Ft / db)', 'nb-designer'); ?></th></tr></thead>
          <tbody>
          <?php foreach ($bands as $i => $band): $row = $rows[$i] ?? ['single'=>null, 'double'=>null]; $field = 'nb_team[prices]['.$option['key'].']['.$i.']'; ?>
            <tr>
              <td><?php echo esc_html($band_label($band)); ?></td>
              <td><input type="number" min="0" step="1" style="width:120px" name="<?php echo esc_attr($field); ?>[single]" value="<?php echo esc_attr($row['single'] ?? ''); ?>"></td>
              <td><input type="number" min="0" step="1" style="width:120px" name="<?php echo esc_attr($field); ?>[double]" value="<?php echo esc_attr($row['double'] ?? ''); ?>"></td>
            </tr>
          <?php endforeach; ?>
          <?php if ($option_sizes): ?>
            <tr>
              <td><?php esc_html_e('Méretfelár (Ft / db)', 'nb-designer'); ?></td>
              <td colspan="2">
                <?php foreach ($option_sizes as $size): ?>
                  <label style="display:inline-block;margin:0 10px 6px 0"><?php echo esc_html($size); ?> <input type="number" min="0" step="1" style="width:84px" name="<?php echo esc_attr('nb_team[size_fees]['.$option['key'].']['.$size.']'); ?>" value="<?php echo esc_attr(isset($fees[$size]) ? $fees[$size] : ''); ?>"></label>
                <?php endforeach; ?>
                <p class="description" style="margin:0"><?php esc_html_e('Minden sávban hozzáadódik a darabárhoz (pl. 3XL, 4XL). Üres vagy 0 = nincs felár.', 'nb-designer'); ?></p>
              </td>
            </tr>
          <?php endif; ?>
          </tbody>
        </table>
      <?php endforeach; ?>

      <h2><?php esc_html_e('Egyéb', 'nb-designer'); ?></h2>
      <table class="form-table" role="presentation">
        <tr><th scope="row"><label for="nb-team-min"><?php esc_html_e('Minimum rendelés (db)', 'nb-designer'); ?></label></th><td><input id="nb-team-min" type="number" min="1" step="1" name="nb_team[min_qty]" value="<?php echo esc_attr($team['min_qty']); ?>"></td></tr>
        <tr><th scope="row"><label for="nb-team-colors"><?php esc_html_e('Színek száma egy rendelésben legfeljebb', 'nb-designer'); ?></label></th><td><input id="nb-team-colors" type="number" min="1" max="20" step="1" name="nb_team[max_colors]" value="<?php echo esc_attr($team['max_colors']); ?>"></td></tr>
        <tr><th scope="row"><label for="nb-team-personal"><?php esc_html_e('Név/szám felár a névsorból (Ft / db)', 'nb-designer'); ?></label></th><td><input id="nb-team-personal" type="number" min="0" step="1" name="nb_team[personal_fee]" value="<?php echo esc_attr($team['personal_fee']); ?>"><p class="description"><?php esc_html_e('Azokra a darabokra, amelyekre a névsorból név vagy szám kerül. 0 = nincs felár.', 'nb-designer'); ?></p></td></tr>
        <tr><th scope="row"><label for="nb-team-players"><?php esc_html_e('Névsor sorainak száma egy rendelésben legfeljebb', 'nb-designer'); ?></label></th><td><input id="nb-team-players" type="number" min="1" max="300" step="1" name="nb_team[max_players]" value="<?php echo esc_attr($team['max_players']); ?>"></td></tr>
      </table>

      <h2><?php esc_html_e('Elhelyezési segédsablonok', 'nb-designer'); ?></h2>
      <p class="description"><?php esc_html_e('A vásárló ezekkel egy kattintással a jó helyre és jó méretben teszi a logót vagy feliratot, utána szabadon módosíthatja. Vízszintes közép és felső él: 0–1 közötti arány a nyomtatási felülethez képest (0,5 = középen). Méret mm-ben. A név nélküli sor nem mentődik.', 'nb-designer'); ?></p>
      <table class="widefat striped nb-team-presets">
        <thead><tr><th><?php esc_html_e('Megnevezés', 'nb-designer'); ?></th><th><?php esc_html_e('Mód', 'nb-designer'); ?></th><th><?php esc_html_e('Oldal', 'nb-designer'); ?></th><th><?php esc_html_e('Tartalom', 'nb-designer'); ?></th><th><?php esc_html_e('Vízsz. közép', 'nb-designer'); ?></th><th><?php esc_html_e('Felső él', 'nb-designer'); ?></th><th><?php esc_html_e('Szél. mm', 'nb-designer'); ?></th><th><?php esc_html_e('Mag. mm', 'nb-designer'); ?></th><th><?php esc_html_e('Alap szöveg', 'nb-designer'); ?></th><th><?php esc_html_e('Névsorból', 'nb-designer'); ?></th></tr></thead>
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
            <td><select name="<?php echo esc_attr($name); ?>[bind]"><option value="" <?php selected($preset['bind'], ''); ?>><?php esc_html_e('Nem (fix)', 'nb-designer'); ?></option><option value="name" <?php selected($preset['bind'], 'name'); ?>><?php esc_html_e('Játékos neve', 'nb-designer'); ?></option><option value="number" <?php selected($preset['bind'], 'number'); ?>><?php esc_html_e('Játékos száma', 'nb-designer'); ?></option></select></td>
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
