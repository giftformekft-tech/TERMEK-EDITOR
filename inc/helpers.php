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

if ( ! function_exists('nb_decode_unicode_sequences') ) {
  function nb_decode_unicode_sequences($value){
    if (!is_string($value)) return $value;
    if (strpos($value, 'u') === false && strpos($value, '\\') === false) {
      return $value;
    }
    if (!preg_match('/(\\\\u[0-9a-fA-F]{4}|u[0-9a-fA-F]{4})/', $value)) {
      return $value;
    }
    $prepared = preg_replace('/(?<!\\\\)u([0-9a-fA-F]{4})/i', '\\u$1', $value);
    $json = '"'.preg_replace('/([\\\\"])/', '\\$1', $prepared).'"';
    $decoded = json_decode($json);
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

    if (isset($settings['color_palette'])) {
      $settings['color_palette'] = nb_clean_label_list($settings['color_palette']);
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
