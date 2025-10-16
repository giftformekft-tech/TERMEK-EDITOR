<?php
if ( ! defined('ABSPATH') ) exit;

if ( ! function_exists('nb_admin_normalize_unicode_sequences') ) {
  function nb_admin_normalize_unicode_sequences($value){
    if ($value === ''){
      return '';
    }

    $normalized = $value;

    if (strpos($normalized, '\\u') !== false){
      $json = json_decode('"' . preg_replace('/(["\\\\])/', '\\$1', $normalized) . '"');
      if (is_string($json)){
        $normalized = $json;
      }
    }

    if (stripos($normalized, 'u00') !== false && strpos($normalized, '\\u00') === false){
      $converted = preg_replace_callback('/(?<!\\\\)u([0-9a-fA-F]{4})/', function($matches){
        $code = hexdec($matches[1]);
        if ($code < 0x80){
          return chr($code);
        }
        if ($code < 0x800){
          return chr(0xC0 | ($code >> 6)).chr(0x80 | ($code & 0x3F));
        }
        if ($code < 0x10000){
          return chr(0xE0 | ($code >> 12)).chr(0x80 | (($code >> 6) & 0x3F)).chr(0x80 | ($code & 0x3F));
        }
        if ($code < 0x110000){
          return chr(0xF0 | ($code >> 18)).chr(0x80 | (($code >> 12) & 0x3F)).chr(0x80 | (($code >> 6) & 0x3F)).chr(0x80 | ($code & 0x3F));
        }
        return $matches[0];
      }, $normalized);
      if (is_string($converted)){
        $normalized = $converted;
      }
    }

    if (function_exists('mb_detect_encoding')){
      $encoding = mb_detect_encoding($normalized, ['UTF-8','ISO-8859-1','Windows-1250'], true);
      if ($encoding && $encoding !== 'UTF-8'){
        $converted = mb_convert_encoding($normalized, 'UTF-8', $encoding);
        if (is_string($converted)){
          $normalized = $converted;
        }
      }
    }

    return $normalized;
  }
}

if ( ! function_exists('nb_admin_trim_string') ) {
  function nb_admin_trim_string($value){
    if (is_string($value)){
      $trimmed = trim($value);
      if ($trimmed === ''){
        return '';
      }
      return nb_admin_normalize_unicode_sequences($trimmed);
    }
    if (is_numeric($value)){
      $string = trim((string)$value);
      return $string === '' ? '' : nb_admin_normalize_unicode_sequences($string);
    }
    if (is_object($value) && method_exists($value, '__toString')){
      $string = trim((string)$value);
      return $string === '' ? '' : nb_admin_normalize_unicode_sequences($string);
    }
    return '';
  }
}

if ( ! function_exists('nb_admin_unique_strings') ) {
  function nb_admin_unique_strings($values){
    $list = [];
    foreach ((array)$values as $value){
      $clean = nb_admin_trim_string($value);
      if ($clean === ''){
        continue;
      }
      if (! in_array($clean, $list, true)){
        $list[] = $clean;
      }
    }
    return $list;
  }
}

if ( ! function_exists('nb_admin_decode_design_json') ) {
  function nb_admin_decode_design_json($design_id, $meta_key){
    $design_id = intval($design_id);
    if (! $design_id){
      return [];
    }

    $raw = get_post_meta($design_id, $meta_key, true);
    if (is_array($raw)){
      return $raw;
    }

    if (! is_string($raw) || $raw === ''){
      return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
  }
}

if ( ! function_exists('nb_get_design_price_context') ) {
  function nb_get_design_price_context($design_id){
    return nb_admin_decode_design_json($design_id, 'price_ctx');
  }
}

if ( ! function_exists('nb_designer_settings_cache') ) {
  function nb_designer_settings_cache(){
    static $cache = null;
    if ($cache === null){
      $settings = get_option('nb_settings', []);
      $cache = is_array($settings) ? $settings : [];
    }
    return $cache;
  }
}

if ( ! function_exists('nb_detect_attribute_group_from_key') ) {
  function nb_detect_attribute_group_from_key($key){
    $key = nb_admin_trim_string($key);
    if ($key === ''){
      return '';
    }

    $normalized = strtolower($key);
    $map = [
      'type'  => ['type','termektipus','termek_tipus','pa_type','pa_termektipus','tipus'],
      'color' => ['color','colour','szin','szin_kod','pa_color','pa_szin'],
      'size'  => ['size','meret','ruhameret','pa_size','pa_meret']
    ];

    foreach ($map as $group => $candidates){
      foreach ($candidates as $candidate){
        if ($normalized === $candidate){
          return $group;
        }
        if (strpos($normalized, $candidate.'_') === 0 || strpos($normalized, 'attribute_'.$candidate) === 0){
          return $group;
        }
      }
      if (strpos($normalized, $group.'_') === 0){
        return $group;
      }
    }

    if (strpos($normalized, 'type') !== false){
      return 'type';
    }
    if (strpos($normalized, 'color') !== false || strpos($normalized, 'colour') !== false || strpos($normalized, 'szin') !== false){
      return 'color';
    }
    if (strpos($normalized, 'size') !== false || strpos($normalized, 'meret') !== false){
      return 'size';
    }

    return '';
  }
}

if ( ! function_exists('nb_admin_values_match') ) {
  function nb_admin_values_match($a, $b){
    $a = nb_admin_trim_string($a);
    $b = nb_admin_trim_string($b);
    if ($a === '' || $b === ''){
      return false;
    }

    if ($a === $b){
      return true;
    }

    if (function_exists('sanitize_title')){
      if (sanitize_title($a) === sanitize_title($b)){
        return true;
      }
    }

    return false;
  }
}

if ( ! function_exists('nb_admin_label_from_catalog') ) {
  function nb_admin_label_from_catalog($group, $value, $product_id){
    $settings = nb_designer_settings_cache();
    $catalog = isset($settings['catalog']) && is_array($settings['catalog']) ? $settings['catalog'] : [];
    if (! $product_id || empty($catalog[$product_id])){
      return '';
    }

    $product_catalog = $catalog[$product_id];
    $lists = [];
    if ($group === 'type' && ! empty($product_catalog['types'])){
      $lists[] = $product_catalog['types'];
    }
    if ($group === 'color'){
      if (! empty($product_catalog['colors'])){
        $lists[] = $product_catalog['colors'];
      }
      if (! empty($product_catalog['color_palette'])){
        $lists[] = $product_catalog['color_palette'];
      }
    }
    if ($group === 'size' && ! empty($product_catalog['sizes'])){
      $lists[] = $product_catalog['sizes'];
    }

    foreach ($lists as $list){
      if (! is_array($list)){
        continue;
      }
      foreach ($list as $entry){
        if (is_array($entry)){
          $label = nb_admin_trim_string($entry['label'] ?? ($entry['name'] ?? ''));
          $slug  = nb_admin_trim_string($entry['slug'] ?? ($entry['value'] ?? ''));
          if ($label && (nb_admin_values_match($label, $value) || ($slug && nb_admin_values_match($slug, $value)))){
            return $label;
          }
        } else {
          $label = nb_admin_trim_string($entry);
          if ($label && nb_admin_values_match($label, $value)){
            return $label;
          }
        }
      }
    }

    return '';
  }
}

if ( ! function_exists('nb_admin_collect_item_values') ) {
  function nb_admin_collect_item_values($item, $groups){
    $results = [];
    if (! $item || ! is_object($item)){
      return $results;
    }

    foreach ($groups as $group => $config){
      $results[$group] = ['labels' => [], 'values' => []];
      if (empty($config['meta_keys'])){
        continue;
      }

      foreach ($config['meta_keys'] as $meta_key){
        if (! method_exists($item, 'get_meta')){
          continue;
        }
        $value = $item->get_meta($meta_key);
        $clean = nb_admin_trim_string($value);
        if ($clean === ''){
          continue;
        }
        $results[$group]['values'][] = $clean;
        if (! empty($config['label_meta']) && in_array($meta_key, $config['label_meta'], true)){
          $results[$group]['labels'][] = $clean;
        }
      }

      if (! method_exists($item, 'get_formatted_meta_data')){
        continue;
      }

      $meta_data = $item->get_formatted_meta_data('');
      if (! empty($meta_data)){
        foreach ($meta_data as $meta_obj){
          if (! is_object($meta_obj)){
            continue;
          }
          $data = $meta_obj->get_data();
          $meta_key = isset($data['key']) ? $data['key'] : '';
          $meta_value = isset($data['value']) ? $data['value'] : '';
          $clean = nb_admin_trim_string($meta_value);
          if ($meta_key === '' || $clean === ''){
            continue;
          }
          $group = nb_detect_attribute_group_from_key($meta_key);
          if ($group === '' || ! isset($results[$group])){
            continue;
          }
          $results[$group]['values'][] = $clean;
          if (strpos($meta_key, 'label') !== false || strpos($meta_key, '_nb_attr_') === 0){
            $results[$group]['labels'][] = $clean;
          }
        }
      }
    }

    foreach ($results as $group => $data){
      $results[$group]['labels'] = nb_admin_unique_strings($data['labels']);
      $results[$group]['values'] = nb_admin_unique_strings(array_merge($data['labels'], $data['values']));
    }

    return $results;
  }
}

if ( ! function_exists('nb_admin_collect_from_array') ) {
  function nb_admin_collect_from_array($source, $group){
    $result = ['labels' => [], 'values' => []];
    if (! is_array($source)){
      return $result;
    }

    foreach ($source as $key => $value){
      $normalized_key = nb_admin_trim_string($key);
      if ($normalized_key === ''){
        continue;
      }
      $normalized_key_lower = strtolower($normalized_key);
      $detected_group = nb_detect_attribute_group_from_key($normalized_key_lower);
      if ($detected_group !== $group){
        continue;
      }

      $values = is_array($value) ? $value : [$value];
      foreach ($values as $entry){
        $clean = nb_admin_trim_string($entry);
        if ($clean === ''){
          continue;
        }
        $result['values'][] = $clean;
        if (strpos($normalized_key_lower, 'label') !== false || strpos($normalized_key_lower, '_display') !== false){
          $result['labels'][] = $clean;
        }
      }
    }

    $result['labels'] = nb_admin_unique_strings($result['labels']);
    $result['values'] = nb_admin_unique_strings(array_merge($result['labels'], $result['values']));
    return $result;
  }
}

if ( ! function_exists('nb_admin_resolve_attribute_label') ) {
  function nb_admin_resolve_attribute_label($group, $labels, $values, $product_id, $taxonomy = ''){
    $labels = nb_admin_unique_strings($labels);
    $values = nb_admin_unique_strings($values);

    if (! empty($labels)){
      return $labels[0];
    }

    $taxonomy = nb_admin_trim_string($taxonomy);

    foreach ($values as $candidate){
      if ($candidate === ''){
        continue;
      }

      if ($taxonomy && taxonomy_exists($taxonomy)){
        $slug = function_exists('sanitize_title') ? sanitize_title($candidate) : $candidate;
        if ($slug !== ''){
          $term = get_term_by('slug', $slug, $taxonomy);
          if ($term && ! is_wp_error($term)){
            return $term->name;
          }
        }
        $term = get_term_by('name', $candidate, $taxonomy);
        if ($term && ! is_wp_error($term)){
          return $term->name;
        }
        if ($product_id && function_exists('wc_get_product_terms')){
          $terms = wc_get_product_terms($product_id, $taxonomy, ['fields' => 'all']);
          if (! is_wp_error($terms)){
            foreach ($terms as $term){
              if (nb_admin_values_match($term->slug, $candidate) || nb_admin_values_match($term->name, $candidate)){
                return $term->name;
              }
            }
          }
        }
      }

      $catalog_label = nb_admin_label_from_catalog($group, $candidate, $product_id);
      if ($catalog_label !== ''){
        return $catalog_label;
      }

      if (preg_match('/[\p{Lu}\s]/u', $candidate)){
        return $candidate;
      }
    }

    if (empty($values)){
      return '';
    }

    $fallback = $values[0];
    if ($group === 'size'){
      return strtoupper($fallback);
    }

    if (function_exists('mb_convert_case')){
      return mb_convert_case($fallback, MB_CASE_TITLE, 'UTF-8');
    }

    return ucfirst($fallback);
  }
}

if ( ! function_exists('nb_get_design_attribute_summary') ) {
  function nb_get_design_attribute_summary($design_id, $product_id = 0, $item = null, $extra_candidates = []){
    $ctx = nb_get_design_price_context($design_id);
    $attributes = nb_admin_decode_design_json($design_id, 'attributes_json');

    if (! $product_id){
      $product_id = intval($ctx['product_id'] ?? 0);
    } else {
      $product_id = intval($product_id);
    }

    $groups = [
      'type'  => [
        'label'      => __('Terméktípus','nb'),
        'taxonomy'   => 'pa_type',
        'meta_keys'  => ['_nb_attr_type_label', 'nb_attr_type_label', 'type_label', 'type_display', 'attribute_pa_type', 'attribute_type', 'attribute_pa_termektipus', 'attribute_termektipus', 'attribute_tipus', 'pa_type', 'pa_termektipus', 'type', 'termektipus', 'termek_tipus', 'tipus'],
        'label_meta' => ['_nb_attr_type_label', 'nb_attr_type_label', 'type_label', 'type_display'],
      ],
      'color' => [
        'label'      => __('Szín','nb'),
        'taxonomy'   => 'pa_color',
        'meta_keys'  => ['_nb_attr_color_label', 'nb_attr_color_label', 'color_label', 'color_display', 'color_name', 'attribute_color', 'attribute_pa_color', 'attribute_pa_szin', 'attribute_szin', 'pa_color', 'pa_szin', 'color', 'colour', 'szin', 'szin_kod'],
        'label_meta' => ['_nb_attr_color_label', 'nb_attr_color_label', 'color_label', 'color_display', 'color_name'],
      ],
      'size'  => [
        'label'      => __('Méret','nb'),
        'taxonomy'   => 'pa_size',
        'meta_keys'  => ['_nb_attr_size_label', 'nb_attr_size_label', 'size_label', 'size_display', 'size_name', 'attribute_size', 'attribute_pa_size', 'attribute_pa_meret', 'attribute_meret', 'pa_size', 'pa_meret', 'size', 'meret', 'ruhameret'],
        'label_meta' => ['_nb_attr_size_label', 'nb_attr_size_label', 'size_label', 'size_display', 'size_name'],
      ],
    ];

    $item_values = nb_admin_collect_item_values($item, $groups);

    $summary = [];
    foreach ($groups as $group => $config){
      $labels = [];
      $values = [];

      if (isset($item_values[$group])){
        $labels = array_merge($labels, $item_values[$group]['labels']);
        $values = array_merge($values, $item_values[$group]['values']);
      }

      $ctx_sources = [$ctx];
      if (isset($ctx['selection']) && is_array($ctx['selection'])){
        $ctx_sources[] = $ctx['selection'];
      }
      if (isset($ctx['attributes']) && is_array($ctx['attributes'])){
        $ctx_sources[] = $ctx['attributes'];
      }
      if (isset($ctx['options']) && is_array($ctx['options'])){
        $ctx_sources[] = $ctx['options'];
      }

      foreach ($ctx_sources as $source){
        $collected = nb_admin_collect_from_array($source, $group);
        $labels = array_merge($labels, $collected['labels']);
        $values = array_merge($values, $collected['values']);
      }

      $attribute_collected = nb_admin_collect_from_array($attributes, $group);
      $labels = array_merge($labels, $attribute_collected['labels']);
      $values = array_merge($values, $attribute_collected['values']);

      if (isset($extra_candidates[$group])){
        $values = array_merge($values, nb_admin_unique_strings($extra_candidates[$group]));
      }

      $values = nb_admin_unique_strings($values);
      $labels = nb_admin_unique_strings($labels);

      if (empty($values) && empty($labels)){
        continue;
      }

      $display_value = nb_admin_resolve_attribute_label($group, $labels, $values, $product_id, $config['taxonomy'] ?? '');
      if ($display_value === ''){
        continue;
      }

      $summary[] = [
        'key'   => $group,
        'label' => $config['label'],
        'value' => $display_value,
      ];
    }

    return $summary;
  }
}
