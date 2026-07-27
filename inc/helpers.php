<?php
if ( ! defined('ABSPATH') ) exit;

if ( ! function_exists('nb_get_settings') ) {
  /** Merge small global settings with the non-autoloaded catalog stores. */
  function nb_get_settings($default = []){
    $settings = get_option('nb_settings', $default);
    $settings = is_array($settings) ? $settings : (is_array($default) ? $default : []);
    $catalog = get_option('nb_catalog', null);
    $mockups = get_option('nb_mockups', null);
    if (is_array($catalog)) $settings['catalog'] = $catalog;
    if (is_array($mockups)) $settings['mockups'] = $mockups;
    return $settings;
  }
}

if ( ! function_exists('nb_update_settings') ) {
  /** Keep large catalog data out of WordPress' autoloaded option payload. */
  function nb_update_settings($settings){
    $settings = is_array($settings) ? $settings : [];
    $catalog = isset($settings['catalog']) && is_array($settings['catalog']) ? $settings['catalog'] : [];
    $mockups = isset($settings['mockups']) && is_array($settings['mockups']) ? $settings['mockups'] : [];
    $compact = $settings;
    unset($compact['catalog'], $compact['mockups']);
    update_option('nb_catalog', $catalog, false);
    update_option('nb_mockups', $mockups, false);
    return update_option('nb_settings', $compact, false);
  }
}

if ( ! function_exists('nb_utf8_strtolower') ) {
  function nb_utf8_strtolower($value){
    if ($value === null) return '';
    $string = (string)$value;
    if ($string === '') return '';
    if (function_exists('mb_strtolower')) {
      return mb_strtolower($string, 'UTF-8');
    }
    return strtolower($string);
  }
}

if ( ! function_exists('nb_normalize_type_key') ) {
  function nb_normalize_type_key($value){
    if ($value === null) return '';
    $string = trim((string)$value);
    if ($string === '') return '';
    return nb_utf8_strtolower($string);
  }
}

if ( ! function_exists('nb_normalize_color_key') ) {
  function nb_normalize_color_key($value){
    if ($value === null) return '';
    $string = trim((string)$value);
    if ($string === '') return '';
    return nb_utf8_strtolower($string);
  }
}

if ( ! function_exists('nb_normalize_bulk_discount_tiers') ) {
  function nb_normalize_bulk_discount_tiers($tiers){
    if (!is_array($tiers)) {
      return [];
    }
    $normalized = [];
    foreach ($tiers as $row){
      if (!is_array($row)) {
        continue;
      }
      $min = 0;
      $max = 0;
      $percent = 0;
      if (isset($row['min_qty'])){
        $min = intval($row['min_qty']);
      } elseif (isset($row['from'])){
        $min = intval($row['from']);
      } elseif (isset($row['min'])){
        $min = intval($row['min']);
      }
      if (isset($row['max_qty'])){
        $max = intval($row['max_qty']);
      } elseif (isset($row['to'])){
        $max = intval($row['to']);
      } elseif (isset($row['max'])){
        $max = intval($row['max']);
      }
      if (isset($row['percent'])){
        $percent = floatval($row['percent']);
      } elseif (isset($row['discount'])){
        $percent = floatval($row['discount']);
      }
      if ($min <= 0 || $percent <= 0){
        continue;
      }
      if ($max > 0 && $max < $min){
        $tmp = $min;
        $min = $max;
        $max = $tmp;
      }
      $normalized[] = [
        'min_qty' => $min,
        'max_qty' => ($max > 0 ? $max : 0),
        'percent' => round($percent, 4),
      ];
    }
    if (empty($normalized)){
      return [];
    }
    usort($normalized, function($a, $b){
      if ($a['min_qty'] === $b['min_qty']){
        $aMax = $a['max_qty'] > 0 ? $a['max_qty'] : PHP_INT_MAX;
        $bMax = $b['max_qty'] > 0 ? $b['max_qty'] : PHP_INT_MAX;
        if ($aMax === $bMax){
          return ($b['percent'] <=> $a['percent']);
        }
        return ($aMax <=> $bMax);
      }
      return ($a['min_qty'] <=> $b['min_qty']);
    });
    $deduped = [];
    foreach ($normalized as $row){
      $key = $row['min_qty'].'-'.$row['max_qty'];
      if (isset($deduped[$key])){
        if ($row['percent'] > $deduped[$key]['percent']){
          $deduped[$key]['percent'] = $row['percent'];
        }
        continue;
      }
      $deduped[$key] = $row;
    }
    return array_values($deduped);
  }
}

if ( ! function_exists('nb_find_bulk_discount_for_quantity') ) {
  function nb_find_bulk_discount_for_quantity($quantity, $settings = null){
    $qty = intval($quantity);
    if ($qty <= 0){
      return 0;
    }
    if ($settings === null){
      $settings = nb_get_settings([]);
    }
    $tiers = [];
    if (isset($settings['bulk_discounts']) && is_array($settings['bulk_discounts'])){
      $tiers = nb_normalize_bulk_discount_tiers($settings['bulk_discounts']);
    }
    if (empty($tiers)){
      return 0;
    }
    $matched = 0;
    foreach ($tiers as $tier){
      $min = intval($tier['min_qty'] ?? 0);
      $max = intval($tier['max_qty'] ?? 0);
      $percent = floatval($tier['percent'] ?? 0);
      if ($min <= 0 || $percent <= 0){
        continue;
      }
      if ($qty < $min){
        continue;
      }
      if ($max > 0 && $qty > $max){
        continue;
      }
      if ($percent > $matched){
        $matched = $percent;
      }
    }
    return $matched;
  }
}

if ( ! function_exists('nb_resolve_type_order_label') ) {
  function nb_resolve_type_order_label($value, $settings, $fallback = ''){
    $map = [];
    if (isset($settings['type_order_labels']) && is_array($settings['type_order_labels'])){
      $map = $settings['type_order_labels'];
    }
    $key = nb_normalize_type_key($value);
    if ($key !== '' && isset($map[$key])){
      $label = nb_clean_label_string($map[$key]);
      if ($label !== ''){
        return $label;
      }
    }
    if ($fallback !== ''){
      $cleanFallback = nb_clean_label_string($fallback);
      if ($cleanFallback !== ''){
        return $cleanFallback;
      }
    }
    return '';
  }
}

if ( ! function_exists('nb_resolve_color_order_label') ) {
  function nb_resolve_color_order_label($value, $settings, $fallback = ''){
    $map = [];
    if (isset($settings['color_order_labels']) && is_array($settings['color_order_labels'])){
      $map = $settings['color_order_labels'];
    }
    $key = nb_normalize_color_key($value);
    if ($key !== '' && isset($map[$key])){
      $label = nb_clean_label_string($map[$key]);
      if ($label !== ''){
        return $label;
      }
    }
    if ($fallback !== ''){
      $cleanFallback = nb_clean_label_string($fallback);
      if ($cleanFallback !== ''){
        return $cleanFallback;
      }
    }
    return '';
  }
}

if ( ! function_exists('nb_decode_unicode_sequences') ) {
  function nb_decode_unicode_sequences($value){
    if (!is_string($value)) return $value;
    if ($value === '') return '';
    if (!preg_match('/\\\\?u[0-9a-fA-F]{4}/', $value)) {
      return $value;
    }
    $prepared = preg_replace('/(?<!\\\\)u([0-9a-fA-F]{4})/i', '\\u$1', $value);
    if (!is_string($prepared)) {
      $prepared = $value;
    }
    $escaped = preg_replace('/\\\\(?!u[0-9a-fA-F]{4})/i', '\\$0', $prepared);
    if (!is_string($escaped)) {
      $escaped = $prepared;
    }
    $escaped = str_replace('"', '\\"', $escaped);
    $decoded = json_decode('"'.$escaped.'"');
    if (JSON_ERROR_NONE === json_last_error() && is_string($decoded)) {
      return $decoded;
    }
    return $value;
  }
}

if ( ! function_exists('nb_clean_label_string') ) {
  function nb_clean_label_string($value){
    if ($value === null) return '';
    $string = nb_decode_unicode_sequences((string)$value);
    return trim($string);
  }
}

if ( ! function_exists('nb_clean_label_list') ) {
  function nb_clean_label_list($list, $unique = true){
    if (!is_array($list)) {
      if ($list === null || $list === '') {
        return [];
      }
      $list = [$list];
    }
    $result = [];
    foreach ($list as $value){
      if (is_array($value) || is_object($value)) {
        continue;
      }
      $clean = nb_clean_label_string($value);
      if ($clean === '') {
        continue;
      }
      if ($unique) {
        if (in_array($clean, $result, true)) {
          continue;
        }
      }
      $result[] = $clean;
    }
    return $result;
  }
}

if ( ! function_exists('nb_clean_settings_unicode') ) {
  function nb_clean_settings_unicode($settings){
    if (!is_array($settings)) {
      return [];
    }

    if (isset($settings['types'])) {
      $settings['types'] = nb_clean_label_list($settings['types']);
    }

    if (isset($settings['type_order_labels']) && is_array($settings['type_order_labels'])) {
      $cleanTypeOrders = [];
      foreach ($settings['type_order_labels'] as $key => $label){
        if (is_array($label) || is_object($label)) {
          continue;
        }
        $cleanKey = nb_normalize_type_key(nb_decode_unicode_sequences((string)$key));
        if ($cleanKey === '') {
          continue;
        }
        $cleanLabel = nb_clean_label_string($label);
        if ($cleanLabel === '') {
          continue;
        }
        if (function_exists('sanitize_text_field')) {
          $cleanLabel = sanitize_text_field($cleanLabel);
        }
        $cleanTypeOrders[$cleanKey] = $cleanLabel;
      }
      $settings['type_order_labels'] = $cleanTypeOrders;
    }

    if (isset($settings['type_products']) && is_array($settings['type_products'])) {
      $cleanTypeProducts = [];
      foreach ($settings['type_products'] as $key => $product){
        if (is_array($product) || is_object($product)) {
          continue;
        }
        $cleanKey = nb_normalize_type_key(nb_decode_unicode_sequences((string)$key));
        if ($cleanKey === '') {
          continue;
        }
        $productId = intval($product);
        if (function_exists('absint')){
          $productId = absint($productId);
        } else {
          $productId = max(0, $productId);
        }
        if ($productId <= 0) {
          continue;
        }
        $cleanTypeProducts[$cleanKey] = $productId;
      }
      $settings['type_products'] = $cleanTypeProducts;
    }

    if (isset($settings['color_palette'])) {
      $settings['color_palette'] = nb_clean_label_list($settings['color_palette']);
    }

    if (isset($settings['color_order_labels']) && is_array($settings['color_order_labels'])) {
      $cleanColorOrders = [];
      foreach ($settings['color_order_labels'] as $key => $label){
        if (is_array($label) || is_object($label)) {
          continue;
        }
        $cleanKey = nb_normalize_color_key(nb_decode_unicode_sequences((string)$key));
        if ($cleanKey === '') {
          continue;
        }
        $cleanLabel = nb_clean_label_string($label);
        if ($cleanLabel === '') {
          continue;
        }
        if (function_exists('sanitize_text_field')) {
          $cleanLabel = sanitize_text_field($cleanLabel);
        }
        $cleanColorOrders[$cleanKey] = $cleanLabel;
      }
      $settings['color_order_labels'] = $cleanColorOrders;
    }

    if (isset($settings['color_meta']) && is_array($settings['color_meta'])) {
      $cleanColorMeta = [];
      foreach ($settings['color_meta'] as $key=>$row){
        if (!is_array($row)) continue;
        $cleanKey = nb_normalize_color_key($key);
        if ($cleanKey === '') continue;
        $hex = sanitize_hex_color($row['hex'] ?? '');
        $cleanColorMeta[$cleanKey] = [
          'key'=>$cleanKey,
          'designer_label'=>sanitize_text_field($row['designer_label'] ?? $key),
          'order_label'=>sanitize_text_field($row['order_label'] ?? ($row['designer_label'] ?? $key)),
          'hex'=>$hex ?: '#d1d5db',
          'texture_url'=>esc_url_raw($row['texture_url'] ?? ''),
        ];
      }
      $settings['color_meta'] = $cleanColorMeta;
    }

    if (isset($settings['type_colors']) && is_array($settings['type_colors'])) {
      $cleanTypeColors = [];
      foreach ($settings['type_colors'] as $key => $values){
        $cleanKey = nb_normalize_type_key(nb_decode_unicode_sequences((string)$key));
        if ($cleanKey === '') {
          continue;
        }
        $cleanTypeColors[$cleanKey] = nb_clean_label_list(is_array($values) ? $values : []);
      }
      $settings['type_colors'] = $cleanTypeColors;
    }

    if (isset($settings['bulk_discounts'])) {
      $settings['bulk_discounts'] = nb_normalize_bulk_discount_tiers($settings['bulk_discounts']);
    }

    if (isset($settings['catalog']) && is_array($settings['catalog'])) {
      foreach ($settings['catalog'] as $pid => &$cfg){
        if (!is_array($cfg)) {
          $cfg = [];
        }
        if (isset($cfg['types'])) {
          $cfg['types'] = nb_clean_label_list($cfg['types']);
        }
        if (isset($cfg['sizes'])) {
          $cfg['sizes'] = nb_clean_label_list($cfg['sizes']);
        }
        if (isset($cfg['colors'])) {
          $cfg['colors'] = nb_clean_label_list($cfg['colors']);
        }
        if (isset($cfg['colors_by_type']) && is_array($cfg['colors_by_type'])) {
          $cleanMap = [];
          foreach ($cfg['colors_by_type'] as $typeKey => $colors){
            $cleanKey = nb_normalize_type_key(nb_decode_unicode_sequences((string)$typeKey));
            if ($cleanKey === '') {
              continue;
            }
            $cleanMap[$cleanKey] = nb_clean_label_list(is_array($colors) ? $colors : []);
          }
          $cfg['colors_by_type'] = $cleanMap;
        }
        if (isset($cfg['map']) && is_array($cfg['map'])) {
          $cleanEntries = [];
          foreach ($cfg['map'] as $rawKey => $entry){
            $parts = explode('|', (string)$rawKey);
            if (count($parts) !== 2) {
              continue;
            }
            $typeKey = nb_normalize_type_key(nb_decode_unicode_sequences($parts[0]));
            $colorKey = nb_normalize_color_key(nb_decode_unicode_sequences($parts[1]));
            if ($typeKey === '' || $colorKey === '') {
              continue;
            }
            $cleanKey = $typeKey.'|'.$colorKey;
            if (!array_key_exists($cleanKey, $cleanEntries)) {
              $cleanEntries[$cleanKey] = is_array($entry) ? $entry : [];
            }
          }
          $cfg['map'] = $cleanEntries;
        }
      }
      unset($cfg);
    }

    return $settings;
  }
}

if ( ! function_exists('nb_mockup_stable_id') ) {
  /**
   * Create a deterministic, URL-safe identifier for legacy mockups.
   *
   * Existing v2 identifiers are kept. Numeric ids created by the old admin are
   * deliberately replaced because they were not used as references anywhere.
   */
  function nb_mockup_stable_id($mockup, $index, $used = []){
    $candidate = is_array($mockup) && isset($mockup['id']) ? (string)$mockup['id'] : '';
    if (preg_match('/^mck_[a-z0-9_-]+$/i', $candidate) && !in_array($candidate, $used, true)) {
      return $candidate;
    }
    $seed = wp_json_encode([
      'index' => intval($index),
      'label' => is_array($mockup) ? ($mockup['label'] ?? '') : '',
      'image_url' => is_array($mockup) ? ($mockup['image_url'] ?? '') : '',
    ]);
    $id = 'mck_'.substr(md5((string)$seed), 0, 12);
    $suffix = 2;
    while (in_array($id, $used, true)) {
      $id = 'mck_'.substr(md5((string)$seed.'|'.$suffix), 0, 12);
      $suffix++;
    }
    return $id;
  }
}

if ( ! function_exists('nb_normalize_mockup_area') ) {
  function nb_normalize_mockup_area($area, $index = 0){
    $area = is_array($area) ? $area : [];
    $role = isset($area['role']) ? sanitize_key($area['role']) : ($index === 0 ? 'front' : 'area-'.$index);
    if ($role === '') $role = $index === 0 ? 'front' : 'area-'.$index;
    $widthMm = isset($area['width_mm']) ? floatval($area['width_mm']) : NB_DESIGNER_PRINT_AREA_WIDTH_MM;
    $heightMm = isset($area['height_mm']) ? floatval($area['height_mm']) : NB_DESIGNER_PRINT_AREA_HEIGHT_MM;
    $dpi = isset($area['dpi']) ? intval($area['dpi']) : 300;
    $hasPhysicalSize = isset($area['width_mm'], $area['height_mm']) && floatval($area['width_mm']) > 0 && floatval($area['height_mm']) > 0;
    return [
      'id' => !empty($area['id']) ? sanitize_key($area['id']) : 'area_'.$role,
      'role' => $role,
      'label' => sanitize_text_field($area['label'] ?? ($index === 0 ? __('Előlap', 'nb-designer') : sprintf(__('Felület %d', 'nb-designer'), $index + 1))),
      'x' => max(0, intval($area['x'] ?? 50)),
      'y' => max(0, intval($area['y'] ?? 50)),
      'w' => max(1, intval($area['w'] ?? 200)),
      'h' => max(1, intval($area['h'] ?? 300)),
      'canvas_w' => max(1, intval($area['canvas_w'] ?? 420)),
      'canvas_h' => max(1, intval($area['canvas_h'] ?? 560)),
      'width_mm' => $widthMm > 0 ? $widthMm : NB_DESIGNER_PRINT_AREA_WIDTH_MM,
      'height_mm' => $heightMm > 0 ? $heightMm : NB_DESIGNER_PRINT_AREA_HEIGHT_MM,
      'dpi' => $dpi > 0 ? $dpi : 300,
      'physical_size_source' => sanitize_key($area['physical_size_source'] ?? ($hasPhysicalSize ? 'explicit' : 'fallback')),
    ];
  }
}

if ( ! function_exists('nb_normalize_mockups') ) {
  function nb_normalize_mockups($mockups){
    if (!is_array($mockups)) return [];
    $normalized = [];
    $usedIds = [];
    foreach (array_values($mockups) as $index => $raw){
      if (!is_array($raw)) continue;
      $id = nb_mockup_stable_id($raw, $index, $usedIds);
      $usedIds[] = $id;
      $areasRaw = isset($raw['areas']) && is_array($raw['areas']) ? $raw['areas'] : [];
      if (empty($areasRaw) && isset($raw['area']) && is_array($raw['area'])) {
        $areasRaw = [$raw['area']];
      }
      if (empty($areasRaw)) $areasRaw = [[]];
      $areas = [];
      foreach ($areasRaw as $areaIndex => $area){
        $areas[] = nb_normalize_mockup_area($area, $areaIndex);
      }
      $canvasW = max(1, intval($raw['canvas_w'] ?? $areas[0]['canvas_w']));
      $canvasH = max(1, intval($raw['canvas_h'] ?? $areas[0]['canvas_h']));
      foreach ($areas as &$area){
        $area['canvas_w'] = $canvasW;
        $area['canvas_h'] = $canvasH;
      }
      unset($area);
      $normalized[] = [
        'id' => $id,
        'label' => sanitize_text_field($raw['label'] ?? sprintf(__('Mockup #%d', 'nb-designer'), $index + 1)),
        'image_url' => esc_url_raw($raw['image_url'] ?? ''),
        'canvas_w' => $canvasW,
        'canvas_h' => $canvasH,
        'areas' => $areas,
        'guides' => [
          'snap_to_grid'=>!empty($raw['guides']['snap_to_grid']),
          'center_lines'=>!isset($raw['guides']['center_lines']) || !empty($raw['guides']['center_lines']),
          'safety_margin'=>!isset($raw['guides']['safety_margin']) || !empty($raw['guides']['safety_margin']),
        ],
        // Kept throughout the two-step migration for older frontend releases.
        'area' => $areas[0],
      ];
    }
    return $normalized;
  }
}

if ( ! function_exists('nb_sync_mockup_references') ) {
  /** Keep stable ids and legacy indexes in sync during the compatibility window. */
  function nb_sync_mockup_references($settings){
    if (!is_array($settings)) $settings = [];
    $settings['mockups'] = nb_normalize_mockups($settings['mockups'] ?? []);
    $idToIndex = [];
    foreach ($settings['mockups'] as $index => $mockup){
      $idToIndex[$mockup['id']] = $index;
    }
    if (!isset($settings['catalog']) || !is_array($settings['catalog'])) return $settings;
    foreach ($settings['catalog'] as &$cfg){
      if (!is_array($cfg) || empty($cfg['map']) || !is_array($cfg['map'])) continue;
      foreach ($cfg['map'] as &$entry){
        if (!is_array($entry)) $entry = [];
        foreach ([['mockup_id', 'mockup_index'], ['mockup_back_id', 'mockup_back_index']] as $keys){
          [$idKey, $indexKey] = $keys;
          $id = isset($entry[$idKey]) ? (string)$entry[$idKey] : '';
          if ($id === '' && isset($entry[$indexKey])) {
            $legacyIndex = intval($entry[$indexKey]);
            if (isset($settings['mockups'][$legacyIndex])) $id = $settings['mockups'][$legacyIndex]['id'];
          }
          if ($id !== '' && isset($idToIndex[$id])) {
            $entry[$idKey] = $id;
            $entry[$indexKey] = $idToIndex[$id];
          } else {
            $entry[$idKey] = '';
            $entry[$indexKey] = -1;
          }
        }
      }
      unset($entry);
    }
    unset($cfg);
    return $settings;
  }
}

if ( ! function_exists('nb_upgrade_settings_schema') ) {
  function nb_upgrade_settings_schema(){
    $current = (string)get_option('nb_settings_schema_version', '1');
    if (version_compare($current, '2.0', '>=')) return false;
    $stored = nb_get_settings([]);
    $settings = is_array($stored) ? $stored : [];
    if (get_option('nb_settings_snapshot_1_10_3', null) === null) {
      add_option('nb_settings_snapshot_1_10_3', $settings, '', false);
    }
    $settings = nb_sync_mockup_references(nb_clean_settings_unicode($settings));
    $settings['schema_version'] = '2.0';
    nb_update_settings($settings);
    update_option('nb_settings_schema_version', '2.0', false);
    return true;
  }
}

if ( ! function_exists('nb_public_settings') ) {
  /** Return only fields consumed by the public designer, never the raw option. */
  function nb_public_settings($settings = null){
    if ($settings === null) $settings = nb_get_settings([]);
    $settings = nb_sync_mockup_references(is_array($settings) ? $settings : []);
    $allowed = [
      'products', 'types', 'type_products', 'type_colors', 'color_palette', 'color_meta',
      'catalog', 'mockups', 'fonts', 'fee_per_cm2', 'min_fee',
      'double_sided_fee', 'bulk_discounts', 'schema_version',
    ];
    $public = [];
    foreach ($allowed as $key){
      if (array_key_exists($key, $settings)) $public[$key] = $settings[$key];
    }
    return $public;
  }
}

if ( ! function_exists('nb_mockup_by_reference') ) {
  function nb_mockup_by_reference($settings, $entry, $side = 'front'){
    $mockups = isset($settings['mockups']) && is_array($settings['mockups']) ? array_values($settings['mockups']) : [];
    $idKey = $side === 'back' ? 'mockup_back_id' : 'mockup_id';
    $indexKey = $side === 'back' ? 'mockup_back_index' : 'mockup_index';
    $id = is_array($entry) ? (string)($entry[$idKey] ?? '') : '';
    if ($id !== '') {
      foreach ($mockups as $mockup){
        if (($mockup['id'] ?? '') === $id) return $mockup;
      }
    }
    $index = is_array($entry) ? intval($entry[$indexKey] ?? -1) : -1;
    return $index >= 0 && isset($mockups[$index]) ? $mockups[$index] : null;
  }
}

if ( ! function_exists('nb_mockup_primary_area') ) {
  function nb_mockup_primary_area($mockup, $role = 'front'){
    if (!is_array($mockup)) return null;
    $areas = isset($mockup['areas']) && is_array($mockup['areas']) ? $mockup['areas'] : [];
    if (empty($areas) && isset($mockup['area']) && is_array($mockup['area'])) $areas = [$mockup['area']];
    foreach ($areas as $area){
      if (is_array($area) && ($area['role'] ?? 'front') === $role) return nb_normalize_mockup_area($area);
    }
    return !empty($areas[0]) && is_array($areas[0]) ? nb_normalize_mockup_area($areas[0]) : null;
  }
}

if ( ! function_exists('nb_design_physical_area') ) {
  /** Resolve physical dimensions from server-side configuration, not request data. */
  function nb_design_physical_area($settings, $priceCtx, $side = 'front'){
    $pid = intval($priceCtx['product_id'] ?? 0);
    $type = nb_normalize_type_key($priceCtx['type'] ?? '');
    $color = nb_normalize_color_key($priceCtx['color'] ?? '');
    $entry = $settings['catalog'][$pid]['map'][$type.'|'.$color] ?? [];
    $mockup = nb_mockup_by_reference($settings, $entry, $side);
    if (!$mockup && $side === 'back') $mockup = nb_mockup_by_reference($settings, $entry, 'front');
    $area = nb_mockup_primary_area($mockup, $side);
    if (!$area) $area = nb_normalize_mockup_area([], 0);
    return [
      'width_mm' => floatval($area['width_mm']),
      'height_mm' => floatval($area['height_mm']),
      'dpi' => intval($area['dpi']),
      'mockup_id' => is_array($mockup) ? (string)($mockup['id'] ?? '') : '',
      'area_id' => (string)($area['id'] ?? ''),
    ];
  }
}

if ( ! function_exists('nb_admin_capability') ) {
  function nb_admin_capability(){
    return apply_filters('nb_designer_admin_capability', 'manage_woocommerce');
  }
}

if ( ! function_exists('nb_validate_bulk_discount_tiers') ) {
  function nb_validate_bulk_discount_tiers($tiers){
    $tiers = nb_normalize_bulk_discount_tiers($tiers);
    $errors = [];
    $previousMax = 0;
    foreach ($tiers as $index => $tier){
      $min = intval($tier['min_qty']);
      $max = intval($tier['max_qty']);
      $percent = floatval($tier['percent']);
      if ($percent <= 0 || $percent >= 100) {
        $errors[] = sprintf(__('A(z) %d. kedvezménysáv értéke 0 és 100 közé essen.', 'nb-designer'), $index + 1);
      }
      if ($index > 0 && $previousMax === 0) {
        $errors[] = __('A korlátlan kedvezménysáv csak az utolsó lehet.', 'nb-designer');
      } elseif ($index > 0 && $min <= $previousMax) {
        $errors[] = sprintf(__('A(z) %d. kedvezménysáv átfedi az előzőt.', 'nb-designer'), $index + 1);
      } elseif ($index > 0 && $min > $previousMax + 1) {
        $errors[] = sprintf(__('Rés van a(z) %d. kedvezménysáv előtt.', 'nb-designer'), $index + 1);
      }
      $previousMax = $max;
    }
    return $errors;
  }
}

if ( ! function_exists('nb_price_breakdown') ) {
  function nb_price_breakdown($args, $settings = null){
    if ($settings === null) $settings = nb_get_settings([]);
    $settings = is_array($settings) ? $settings : [];
    $pid = intval($args['product_id'] ?? 0);
    $type = nb_normalize_type_key($args['type'] ?? '');
    $color = nb_normalize_color_key($args['color'] ?? '');
    $size = sanitize_text_field($args['size'] ?? '');
    $quantity = max(1, intval($args['quantity'] ?? 1));
    $twoSided = !empty($args['two_sided']);
    $baseProduct = max(0, floatval($args['product_price'] ?? 0));
    $per = max(0, floatval($settings['fee_per_cm2'] ?? 3));
    $minimum = max(0, floatval($settings['min_fee'] ?? 990));
    $baseFee = 0;
    $sizeFee = 0;
    $entry = $settings['catalog'][$pid]['map'][$type.'|'.$color] ?? [];
    if (($entry['fee_per_cm2'] ?? '') !== '') $per = max(0, floatval($entry['fee_per_cm2']));
    if (($entry['min_fee'] ?? '') !== '') $minimum = max(0, floatval($entry['min_fee']));
    if (($entry['base_fee'] ?? '') !== '') $baseFee = max(0, floatval($entry['base_fee']));
    if (isset($settings['catalog'][$pid]['size_surcharge'][$size])) $sizeFee = max(0, floatval($settings['catalog'][$pid]['size_surcharge'][$size]));
    $frontArea = nb_design_physical_area($settings, ['product_id'=>$pid, 'type'=>$type, 'color'=>$color], 'front');
    $areaCm2 = max(0, ($frontArea['width_mm'] / 10) * ($frontArea['height_mm'] / 10));
    $printRaw = round($areaCm2 * $per, 2);
    $printFee = max($minimum, $printRaw);
    $doubleFee = $twoSided ? max(0, floatval($settings['double_sided_fee'] ?? 0)) : 0;
    $subtotal = $baseProduct + $sizeFee + $printFee + $baseFee + $doubleFee;
    $discountPercent = nb_find_bulk_discount_for_quantity($quantity, $settings);
    $discount = round($subtotal * ($discountPercent / 100), 2);
    $unit = max(0, $subtotal - $discount);
    return [
      'area_cm2'=>$areaCm2, 'per_cm2'=>$per, 'print_raw'=>$printRaw,
      'minimum'=>$minimum, 'print_fee'=>$printFee, 'base_product'=>$baseProduct,
      'base_fee'=>$baseFee, 'size_fee'=>$sizeFee, 'double_fee'=>$doubleFee,
      'discount_percent'=>$discountPercent, 'discount'=>$discount,
      'unit_total'=>$unit, 'quantity'=>$quantity, 'total'=>$unit * $quantity,
      'uses_fallback_area'=>$frontArea['mockup_id'] === '',
    ];
  }
}

if ( ! function_exists('nb_configuration_report') ) {
  function nb_configuration_report($settings = null){
    if ($settings === null) $settings = nb_get_settings([]);
    $settings = nb_sync_mockup_references(is_array($settings) ? $settings : []);
    $products = array_values(array_filter(array_map('intval', $settings['products'] ?? [])));
    $total = 0;
    $complete = 0;
    $missing = [];
    foreach ($products as $pid){
      $cfg = $settings['catalog'][$pid] ?? [];
      foreach (($cfg['types'] ?? []) as $type){
        $typeKey = nb_normalize_type_key($type);
        foreach (($cfg['colors_by_type'][$typeKey] ?? []) as $color){
          $colorKey = nb_normalize_color_key($color);
          $total++;
          $entry = $cfg['map'][$typeKey.'|'.$colorKey] ?? [];
          if (nb_mockup_by_reference($settings, $entry, 'front')) $complete++;
          else $missing[] = ['product_id'=>$pid, 'type'=>$type, 'color'=>$color];
        }
      }
    }
    $mockupsWithoutArea = [];
    foreach (($settings['mockups'] ?? []) as $mockup){
      $area = nb_mockup_primary_area($mockup);
      if (!$area || $area['width_mm'] <= 0 || $area['height_mm'] <= 0 || ($area['physical_size_source'] ?? '') === 'fallback') $mockupsWithoutArea[] = $mockup;
    }
    $typesWithoutProduct = [];
    foreach (($settings['types'] ?? []) as $type){
      $key = nb_normalize_type_key($type);
      if (empty($settings['type_products'][$key])) $typesWithoutProduct[] = $type;
    }
    $usedColors = [];
    foreach (($settings['type_colors'] ?? []) as $colors){
      foreach ((array)$colors as $color) $usedColors[nb_normalize_color_key($color)] = true;
    }
    $unusedColors = [];
    foreach (($settings['color_palette'] ?? []) as $color){
      if (empty($usedColors[nb_normalize_color_key($color)])) $unusedColors[] = $color;
    }
    return [
      'products'=>count($products), 'mappings'=>$total, 'complete'=>$complete,
      'missing'=>$missing, 'mockups_without_area'=>$mockupsWithoutArea,
      'types_without_product'=>$typesWithoutProduct, 'unused_colors'=>$unusedColors,
    ];
  }
}

if ( ! function_exists('nb_store_settings_history') ) {
  function nb_store_settings_history($settings, $reason = ''){
    $history = get_option('nb_settings_history', []);
    if (!is_array($history)) $history = [];
    array_unshift($history, [
      'saved_at'=>time(),
      'user_id'=>function_exists('get_current_user_id') ? get_current_user_id() : 0,
      'reason'=>sanitize_text_field($reason),
      'settings'=>is_array($settings) ? $settings : [],
    ]);
    $history = array_slice($history, 0, 10);
    update_option('nb_settings_history', $history, false);
    return $history;
  }
}
