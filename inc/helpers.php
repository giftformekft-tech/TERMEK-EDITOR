<?php
if ( ! defined('ABSPATH') ) exit;

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
      $settings = get_option('nb_settings', []);
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
