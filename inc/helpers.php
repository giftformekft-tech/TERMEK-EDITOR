<?php
if ( ! defined('ABSPATH') ) exit;

if ( ! function_exists('nb_normalize_type_key') ) {
  function nb_normalize_type_key($value){
    if ($value === null) return '';
    return strtolower(trim((string)$value));
  }
}

if ( ! function_exists('nb_normalize_color_key') ) {
  function nb_normalize_color_key($value){
    if ($value === null) return '';
    return strtolower(trim((string)$value));
  }
}

if ( ! function_exists('nb_normalize_font_settings') ) {
  function nb_normalize_font_settings($fonts){
    $normalized = [];
    if (!is_array($fonts)) {
      return $normalized;
    }
    foreach ($fonts as $entry){
      $label = '';
      $family = '';
      $url = '';
      $google = '';
      if (is_string($entry)){
        $parts = array_map('trim', explode('|', $entry));
        if (count($parts) === 1){
          $label = $parts[0];
          $family = $parts[0];
        } elseif (count($parts) === 2){
          $label = $parts[0];
          $family = $parts[0];
          $candidate = $parts[1];
          if (stripos($candidate, 'google:') === 0){
            $google = substr($candidate, 7);
          } else {
            $url = $candidate;
          }
        } elseif (count($parts) >= 3){
          $label = $parts[0];
          $family = $parts[1] !== '' ? $parts[1] : $parts[0];
          $candidate = $parts[2];
          if (stripos($candidate, 'google:') === 0){
            $google = substr($candidate, 7);
          } else {
            $url = $candidate;
          }
        }
      } elseif (is_array($entry)) {
        $label = isset($entry['label']) ? (string)$entry['label'] : '';
        $family = isset($entry['family']) ? (string)$entry['family'] : '';
        $url = isset($entry['url']) ? (string)$entry['url'] : '';
        $google = isset($entry['google']) ? (string)$entry['google'] : '';
        if (!$google && isset($entry['google_family'])){
          $google = (string)$entry['google_family'];
        }
        if (!$url && isset($entry['stylesheet'])){
          $url = (string)$entry['stylesheet'];
        }
      }
      $label = trim($label);
      $family = trim($family);
      $url = trim($url);
      $google = trim($google);
      if ($label === '' && $family !== ''){
        $label = $family;
      }
      if ($family === '' && $label !== ''){
        $family = $label;
      }
      if ($label === '' && $family === '' && $url === '' && $google === ''){
        continue;
      }
      $normalized[] = [
        'label' => $label,
        'family'=> $family,
        'url'   => $url,
        'google'=> $google,
      ];
    }
    return array_values($normalized);
  }
}

if ( ! function_exists('nb_sync_product_color_configuration') ) {
  function nb_sync_product_color_configuration(&$cfg, $settings){
    if (!is_array($cfg)) $cfg = [];
    $existingColors = [];
    if (isset($cfg['colors']) && is_array($cfg['colors'])){
      $existingColors = $cfg['colors'];
    }
    $existingMap = [];
    if (isset($cfg['map']) && is_array($cfg['map'])){
      $existingMap = $cfg['map'];
    }
    $typeColors = $settings['type_colors'] ?? [];
    if (!is_array($typeColors)) $typeColors = [];
    $hasTypeColorConfig = false;
    foreach ($typeColors as $list){
      if (is_array($list)){
        $hasTypeColorConfig = true;
        break;
      }
    }
    $types = $cfg['types'] ?? [];
    if (!is_array($types)) $types = [];
    $colorsByType = [];
    foreach ($types as $type){
      $key = nb_normalize_type_key($type);
      if ($key === '') continue;
      $list = $typeColors[$key] ?? [];
      if (!is_array($list)) $list = [];
      $normalizedList = [];
      foreach ($list as $color){
        $color = is_string($color) ? trim($color) : '';
        if ($color === '') continue;
        if (!in_array($color, $normalizedList, true)) $normalizedList[] = $color;
      }
      $colorsByType[$key] = $normalizedList;
    }
    $cfg['colors_by_type'] = $colorsByType;
    $union = [];
    foreach ($colorsByType as $list){
      foreach ($list as $color){
        if (!in_array($color, $union, true)) $union[] = $color;
      }
    }
    $cfg['colors'] = $union;
    if (!isset($cfg['map']) || !is_array($cfg['map'])){
      $cfg['map'] = [];
    }
    $hasAnyColor = !empty($union);
    if (!$hasAnyColor && !$hasTypeColorConfig){
      $cfg['colors'] = $existingColors;
      if (!empty($existingMap)){
        $cfg['map'] = $existingMap;
      }
      return;
    }
    $allowed = [];
    foreach ($colorsByType as $typeKey=>$list){
      $allowed[$typeKey] = [];
      foreach ($list as $color){
        $normColor = nb_normalize_color_key($color);
        if ($normColor === '') continue;
        if (!in_array($normColor, $allowed[$typeKey], true)) $allowed[$typeKey][] = $normColor;
      }
    }
    foreach ($cfg['map'] as $key=>$entry){
      $parts = explode('|', $key);
      if (count($parts) !== 2){
        unset($cfg['map'][$key]);
        continue;
      }
      $typeKey = trim($parts[0]);
      $colorKey = trim($parts[1]);
      if ($typeKey === '' || $colorKey === ''){
        unset($cfg['map'][$key]);
        continue;
      }
      if (!isset($allowed[$typeKey]) || !in_array($colorKey, $allowed[$typeKey], true)){
        unset($cfg['map'][$key]);
      }
    }
  }
}

if ( ! function_exists('nb_resolve_type_label') ) {
  function nb_resolve_type_label($settings, $typeKey){
    $normalized = nb_normalize_type_key($typeKey);
    if ($normalized === '') return '';
    $types = $settings['types'] ?? [];
    if (is_array($types)){
      foreach ($types as $type){
        if (nb_normalize_type_key($type) === $normalized){
          return (string)$type;
        }
      }
    }
    $catalog = $settings['catalog'] ?? [];
    if (is_array($catalog)){
      foreach ($catalog as $cfg){
        $typeList = $cfg['types'] ?? [];
        if (!is_array($typeList)) continue;
        foreach ($typeList as $type){
          if (nb_normalize_type_key($type) === $normalized){
            return (string)$type;
          }
        }
      }
    }
    return ucfirst($normalized);
  }
}

if ( ! function_exists('nb_resolve_color_label') ) {
  function nb_resolve_color_label($settings, $typeKey, $colorKey){
    $colorNorm = nb_normalize_color_key($colorKey);
    if ($colorNorm === '') return '';
    $typeNorm = nb_normalize_type_key($typeKey);
    $catalog = $settings['catalog'] ?? [];
    if (is_array($catalog)){
      foreach ($catalog as $cfg){
        $colorsByType = $cfg['colors_by_type'] ?? [];
        if (is_array($colorsByType) && $typeNorm !== '' && isset($colorsByType[$typeNorm])){
          foreach ($colorsByType[$typeNorm] as $color){
            if (nb_normalize_color_key($color) === $colorNorm){
              return (string)$color;
            }
          }
        }
        $colors = $cfg['colors'] ?? [];
        if (is_array($colors)){
          foreach ($colors as $color){
            if (nb_normalize_color_key($color) === $colorNorm){
              return (string)$color;
            }
          }
        }
      }
    }
    $palette = $settings['color_palette'] ?? [];
    if (is_array($palette)){
      foreach ($palette as $color){
        if (nb_normalize_color_key($color) === $colorNorm){
          return (string)$color;
        }
      }
    }
    return ucfirst($colorNorm);
  }
}
