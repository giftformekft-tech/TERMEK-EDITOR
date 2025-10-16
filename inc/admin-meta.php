<?php
if ( ! defined('ABSPATH') ) exit;

if ( ! function_exists('nb_render_design_download_link') ) {
  function nb_render_design_download_link($preview, $design_id = 0, $print = ''){
    $design_id = intval($design_id);
    $download = '';

    if ($print){
      $download = $print;
    } elseif ($design_id){
      $stored = get_post_meta($design_id, 'print_url', true);
      if ($stored){
        $download = $stored;
      }
    }

    if (! $download){
      $download = $preview;
    }

    if (! $download){
      return '';
    }

    $filename_base = $design_id ? 'nb-design-'.$design_id : 'nb-design';

    return '<a class="nb-design-download" href="'.esc_url($download).'" target="_blank" rel="noopener" download="'.esc_attr($filename_base.'-print.png').'">'.esc_html__('Nyomdai PNG letöltése (3000 px)','nb').'</a>';
  }
}

if ( ! function_exists('nb_get_design_price_context') ) {
  function nb_get_design_price_context($design_id){
    $design_id = intval($design_id);
    if (! $design_id){
      return [];
    }

    $raw = get_post_meta($design_id, 'price_ctx', true);
    if (! $raw){
      return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
  }
}

if ( ! function_exists('nb_detect_attribute_group_from_key') ) {
  function nb_detect_attribute_group_from_key($key){
    if (is_string($key)){
      $normalized = trim($key);
      if ($normalized === ''){
        return '';
      }
      if (function_exists('remove_accents')){
        $normalized = remove_accents($normalized);
      }
      $key = strtolower($normalized);
    } else {
      $key = '';
    }

    if ($key === ''){
      return '';
    }

    $groups = [
      'type'  => ['type', 'nb_type', 'termektipus', 'termek_tipus', 'product_type', 'tipus'],
      'color' => ['color', 'colour', 'szin', 'nb_color', 'colorway'],
      'size'  => ['size', 'meret', 'nb_size', 'ruhameret'],
    ];

    foreach ($groups as $group => $fragments){
      foreach ($fragments as $fragment){
        if ($fragment === ''){
          continue;
        }
        if (strpos($key, $fragment) !== false){
          return $group;
        }
      }
    }

    return '';
  }
}

if ( ! function_exists('nb_normalize_attribute_display') ) {
  function nb_normalize_attribute_display($raw, $taxonomy, $product_id = 0){
    $raw = is_string($raw) ? trim($raw) : '';
    if ($raw === ''){
      return '';
    }

    $candidates = array_unique(array_filter([$raw, sanitize_title($raw)]));

    if ($taxonomy && taxonomy_exists($taxonomy)){
      foreach ($candidates as $slug){
        $term = get_term_by('slug', $slug, $taxonomy);
        if ($term && ! is_wp_error($term)){
          return $term->name;
        }
      }

      if ($product_id && function_exists('wc_get_product_terms')){
        $terms = wc_get_product_terms($product_id, $taxonomy, ['fields' => 'all']);
        if (! is_wp_error($terms)){
          foreach ($terms as $term){
            if (in_array($term->slug, $candidates, true)){
              return $term->name;
            }
          }
        }
      }
    }

    return $raw;
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

if ( ! function_exists('nb_designer_normalize_type_key') ) {
  function nb_designer_normalize_type_key($value){
    if (function_exists('nb_normalize_type_key')){
      return nb_normalize_type_key($value);
    }
    if ($value === null){
      return '';
    }
    $string = trim((string)$value);
    if ($string === ''){
      return '';
    }
    if (function_exists('remove_accents')){
      $string = remove_accents($string);
    }
    return strtolower($string);
  }
}

if ( ! function_exists('nb_designer_normalize_color_key') ) {
  function nb_designer_normalize_color_key($value){
    if (function_exists('nb_normalize_color_key')){
      return nb_normalize_color_key($value);
    }
    if ($value === null){
      return '';
    }
    $string = trim((string)$value);
    if ($string === ''){
      return '';
    }
    if (function_exists('remove_accents')){
      $string = remove_accents($string);
    }
    return strtolower($string);
  }
}

if ( ! function_exists('nb_translate_attribute_value_from_catalog') ) {
  function nb_translate_attribute_value_from_catalog($group, $value, $product_id = 0, $context = []){
    $value = is_string($value) ? trim($value) : '';
    if ($value === ''){
      return '';
    }

    $selected = $context['selected'] ?? $value;
    $selected = is_string($selected) ? trim($selected) : '';
    if ($selected === ''){
      $selected = $value;
    }

    $resolved_raw = [];
    if (! empty($context['resolved_raw']) && is_array($context['resolved_raw'])){
      $resolved_raw = $context['resolved_raw'];
    }

    $price_ctx = [];
    if (! empty($context['price_ctx']) && is_array($context['price_ctx'])){
      $price_ctx = $context['price_ctx'];
    }

    $settings = nb_designer_settings_cache();
    $catalog = isset($settings['catalog']) && is_array($settings['catalog']) ? $settings['catalog'] : [];
    $cfg = null;
    if ($product_id && isset($catalog[$product_id]) && is_array($catalog[$product_id])){
      $cfg = $catalog[$product_id];
    }

    if ($group === 'type'){
      $candidates = [];
      if ($cfg && ! empty($cfg['types']) && is_array($cfg['types'])){
        $candidates[] = $cfg['types'];
      }
      if (! empty($settings['types']) && is_array($settings['types'])){
        $candidates[] = $settings['types'];
      }
      $normalizedSelected = nb_designer_normalize_type_key($selected);
      if (! empty($price_ctx['type_label'])){
        $label = trim((string)$price_ctx['type_label']);
        if ($label !== ''){
          return $label;
        }
      }
      foreach ($candidates as $list){
        foreach ($list as $label){
          $label = is_string($label) ? trim($label) : '';
          if ($label === ''){
            continue;
          }
          if (strcasecmp($value, $label) === 0){
            return $label;
          }
          if ($normalizedSelected !== '' && nb_designer_normalize_type_key($label) === $normalizedSelected){
            return $label;
          }
        }
      }
      return $value;
    }

    if ($group === 'color'){
      $normalizedSelected = nb_designer_normalize_color_key($selected);
      if (! empty($price_ctx['color_label'])){
        $label = trim((string)$price_ctx['color_label']);
        if ($label !== ''){
          return $label;
        }
      }

      $typeKey = '';
      if (! empty($resolved_raw['type'])){
        $typeKey = nb_designer_normalize_type_key($resolved_raw['type']);
      }
      if ($typeKey === '' && ! empty($price_ctx['type'])){
        $typeKey = nb_designer_normalize_type_key($price_ctx['type']);
      }

      $candidateLists = [];
      if ($cfg){
        if ($typeKey && ! empty($cfg['colors_by_type'][$typeKey]) && is_array($cfg['colors_by_type'][$typeKey])){
          $candidateLists[] = $cfg['colors_by_type'][$typeKey];
        }
        if (! empty($cfg['colors']) && is_array($cfg['colors'])){
          $candidateLists[] = $cfg['colors'];
        }
      }
      if (! empty($settings['color_palette']) && is_array($settings['color_palette'])){
        $candidateLists[] = $settings['color_palette'];
      }

      foreach ($candidateLists as $list){
        foreach ($list as $label){
          $label = is_string($label) ? trim($label) : '';
          if ($label === ''){
            continue;
          }
          if (strcasecmp($value, $label) === 0){
            return $label;
          }
          if ($normalizedSelected !== '' && nb_designer_normalize_color_key($label) === $normalizedSelected){
            return $label;
          }
        }
      }

      return $value;
    }

    if ($group === 'size'){
      if (! empty($price_ctx['size_label'])){
        $label = trim((string)$price_ctx['size_label']);
        if ($label !== ''){
          return $label;
        }
      }

      $normalizedSelected = strtolower($selected);
      $candidateLists = [];
      if ($cfg && ! empty($cfg['sizes']) && is_array($cfg['sizes'])){
        $candidateLists[] = $cfg['sizes'];
      }
      if (! empty($settings['catalog']) && is_array($settings['catalog'])){
        foreach ($settings['catalog'] as $entry){
          if (! is_array($entry) || empty($entry['sizes']) || ! is_array($entry['sizes'])){
            continue;
          }
          $candidateLists[] = $entry['sizes'];
        }
      }

      foreach ($candidateLists as $list){
        foreach ($list as $label){
          $label = is_string($label) ? trim($label) : '';
          if ($label === ''){
            continue;
          }
          if (strcasecmp($value, $label) === 0){
            return $label;
          }
          if ($normalizedSelected !== '' && strtolower($label) === $normalizedSelected){
            return $label;
          }
        }
      }

      return $value;
    }

    return $value;
  }
}

if ( ! function_exists('nb_normalize_attribute_candidates') ) {
  function nb_normalize_attribute_candidates($values){
    $list = [];
    if (! is_array($values)){
      $values = [$values];
    }
    foreach ($values as $value){
      if (is_scalar($value)){
        $clean = trim((string)$value);
        if ($clean !== '' && ! in_array($clean, $list, true)){
          $list[] = $clean;
        }
      }
    }
    return $list;
  }
}

if ( ! function_exists('nb_collect_item_attribute_candidates') ) {
  function nb_collect_item_attribute_candidates($item){
    if (! $item || ! is_object($item) || ! method_exists($item, 'get_meta')){
      return [];
    }

    $keys = [
      'type'  => ['_nb_attr_type_label', 'nb_attr_type_label', 'type_label', 'type_display', 'attribute_type', 'attribute_pa_type', 'attribute_pa_termektipus', 'attribute_termektipus', 'attribute_tipus', 'pa_type', 'pa_termektipus', 'type', 'termektipus', 'termek_tipus', 'tipus'],
      'color' => ['_nb_attr_color_label', 'nb_attr_color_label', 'color_label', 'color_display', 'color_name', 'attribute_color', 'attribute_pa_color', 'attribute_pa_szin', 'attribute_szin', 'pa_color', 'pa_szin', 'color', 'colour', 'szin', 'szin_kod'],
      'size'  => ['_nb_attr_size_label', 'nb_attr_size_label', 'size_label', 'size_display', 'size_name', 'attribute_size', 'attribute_pa_size', 'attribute_pa_meret', 'attribute_meret', 'pa_size', 'pa_meret', 'size', 'meret', 'ruhameret'],
    ];

    $found = [];
    foreach ($keys as $group => $candidates){
      foreach ($candidates as $meta_key){
        $value = $item->get_meta($meta_key, true);
        if (is_scalar($value)){
          $value = trim((string)$value);
          if ($value !== ''){
            $found[$group][] = $value;
          }
        }
      }
    }

    foreach ($found as $group => $values){
      $found[$group] = nb_normalize_attribute_candidates($values);
    }

    if (method_exists($item, 'get_meta_data')){
      $meta_data = $item->get_meta_data();
      if (is_array($meta_data)){
        foreach ($meta_data as $meta_obj){
          if (! is_object($meta_obj) || ! method_exists($meta_obj, 'get_data')){
            continue;
          }
          $data = $meta_obj->get_data();
          $meta_key = $data['key'] ?? '';
          $meta_value = $data['value'] ?? '';
          $group = nb_detect_attribute_group_from_key($meta_key);
          if (! $group){
            continue;
          }
          if (! is_scalar($meta_value)){
            continue;
          }
          $clean = trim((string)$meta_value);
          if ($clean === ''){
            continue;
          }
          if (! isset($found[$group])){
            $found[$group] = [];
          }
          if (! in_array($clean, $found[$group], true)){
            $found[$group][] = $clean;
          }
        }
      }
    }

    return $found;
  }
}

if ( ! function_exists('nb_collect_price_ctx_attribute_candidates') ) {
  function nb_collect_price_ctx_attribute_candidates($ctx){
    if (! is_array($ctx)){
      return [];
    }

    $sources = [$ctx];
    foreach (['selection', 'attributes', 'options'] as $nested_key){
      if (isset($ctx[$nested_key]) && is_array($ctx[$nested_key])){
        $sources[] = $ctx[$nested_key];
      }
    }

    $map = [
      'type'  => ['type', 'type_label', 'typelabel', 'type_name', 'typename', 'typekey', 'pa_type', 'termektipus', 'pa_termektipus', 'tipus'],
      'color' => ['color', 'colour', 'color_label', 'colour_label', 'colorname', 'colourname', 'color_display', 'color_name', 'pa_color', 'szin', 'szin_label', 'pa_szin'],
      'size'  => ['size', 'size_label', 'sizelabel', 'size_name', 'sizename', 'size_display', 'pa_size', 'meret', 'pa_meret'],
    ];

    $found = [];
    foreach ($sources as $source){
      foreach ($map as $group => $keys){
        foreach ($keys as $candidate){
          if (! is_string($candidate) || $candidate === ''){
            continue;
          }
          if (array_key_exists($candidate, $source)){
            $found[$group][] = $source[$candidate];
          }
        }
      }
      foreach ($source as $k => $value){
        $group = nb_detect_attribute_group_from_key($k);
        if (! $group){
          continue;
        }
        $found[$group][] = $value;
      }
    }

    foreach ($found as $group => $values){
      $found[$group] = nb_normalize_attribute_candidates($values);
    }

    return $found;
  }
}

if ( ! function_exists('nb_collect_design_attribute_candidates') ) {
  function nb_collect_design_attribute_candidates($design_id){
    $design_id = intval($design_id);
    if (! $design_id){
      return [];
    }

    $raw = get_post_meta($design_id, 'attributes_json', true);
    $decoded = json_decode($raw, true);
    if (! is_array($decoded)){
      $decoded = [];
    }

    $map = [
      'type'  => ['pa_type', 'type', 'type_label', 'type_display', 'termektipus', 'pa_termektipus', 'tipus'],
      'color' => ['pa_color', 'color', 'color_label', 'color_display', 'pa_szin', 'szin'],
      'size'  => ['pa_size', 'size', 'size_label', 'size_display', 'pa_meret', 'meret'],
    ];

    $found = [];
    foreach ($map as $key => $candidates){
      foreach ($candidates as $candidate){
        if (array_key_exists($candidate, $decoded)){
          $found[$key][] = $decoded[$candidate];
        }
      }
    }

    foreach ($found as $group => $values){
      $found[$group] = nb_normalize_attribute_candidates($values);
    }

    return $found;
  }
}

if ( ! function_exists('nb_get_design_attribute_summary') ) {
  function nb_get_design_attribute_summary($design_id, $product_id = 0, $item = null, $extra_candidates = []){
    $ctx = nb_get_design_price_context($design_id);
    $product_id = $product_id ? intval($product_id) : intval($ctx['product_id'] ?? 0);

    $ctx_candidates = nb_collect_price_ctx_attribute_candidates($ctx);

    $design_candidates = nb_collect_design_attribute_candidates($design_id);
    $item_candidates = nb_collect_item_attribute_candidates($item);

    if (! is_array($extra_candidates)){
      $extra_candidates = [];
    }

    $map = [
      'type'  => ['label' => __('Terméktípus','nb'), 'taxonomy' => 'pa_type'],
      'color' => ['label' => __('Szín','nb'),         'taxonomy' => 'pa_color'],
      'size'  => ['label' => __('Méret','nb'),        'taxonomy' => 'pa_size'],
    ];

    $summary = [];
    $resolved_raw = [];
    foreach ($map as $key => $config){
      $merged_candidates = array_merge(
        $item_candidates[$key]   ?? [],
        $ctx_candidates[$key]    ?? [],
        $design_candidates[$key] ?? []
      );

      if (isset($extra_candidates[$key])){
        $extra_list = nb_normalize_attribute_candidates($extra_candidates[$key]);
        $merged_candidates = array_merge($extra_list, $merged_candidates);
      }

      if (empty($merged_candidates)){
        continue;
      }

      $candidates = [];
      foreach ($merged_candidates as $candidate){
        if (! in_array($candidate, $candidates, true)){
          $candidates[] = $candidate;
        }
      }

      $value = '';
      $selected_candidate = '';
      foreach ($candidates as $candidate){
        if ($candidate === ''){
          continue;
        }
        if ($selected_candidate === ''){
          $selected_candidate = $candidate;
        }
        $normalized = nb_normalize_attribute_display($candidate, $config['taxonomy'], $product_id);
        if ($normalized !== ''){
          $value = $normalized;
          break;
        }
      }

      if ($value === '' && $selected_candidate !== ''){
        $value = $selected_candidate;
      }

      if ($value !== ''){
        $display_value = nb_translate_attribute_value_from_catalog($key, $value, $product_id, [
          'selected'    => $selected_candidate,
          'resolved_raw'=> $resolved_raw,
          'price_ctx'   => $ctx,
        ]);

        if ($display_value === ''){
          $display_value = $value;
        }

        $summary[] = [
          'key'   => $key,
          'label' => $config['label'],
          'value' => $display_value,
        ];
        $resolved_raw[$key] = $selected_candidate !== '' ? $selected_candidate : $value;
      }
    }

    return $summary;
  }
}

add_action('woocommerce_admin_order_data_after_order_details', function($order){
  if (! $order || ! is_a($order, 'WC_Order')){
    return;
  }

  ob_start();

  foreach ($order->get_items() as $item){
    $preview = $item->get_meta('preview_url');
    $design_id = intval($item->get_meta('nb_design_id'));
    $print = $item->get_meta('print_url');

    if (! $preview && ! $design_id){
      continue;
    }

    $summary = nb_get_design_attribute_summary($design_id, $item->get_product_id(), $item);
    $download_link = nb_render_design_download_link($preview, $design_id, $print);

    echo '<div class="nb-order-design">';

    if ($preview){
      echo '<div class="nb-order-design__preview"><img src="'.esc_url($preview).'" alt="" /></div>';
    }

    if (! empty($summary) || $download_link){
      echo '<div class="nb-order-design__details">';

      if (! empty($summary)){
        echo '<ul class="nb-order-design__attributes">';
        foreach ($summary as $row){
          echo '<li><strong>'.esc_html($row['label']).':</strong> <span>'.esc_html($row['value']).'</span></li>';
        }
        echo '</ul>';
      }

      if ($download_link){
        echo '<p class="nb-order-design__download">'.$download_link.'</p>';
      }

      echo '</div>';
    }

    echo '</div>';
  }

  $content = trim(ob_get_clean());
  if ($content === ''){
    return;
  }

  echo '<div class="order_data_column nb-order-designs"><h3>'.esc_html__('Tervezett minta','nb').'</h3>'.$content.'</div>';
});

add_action('woocommerce_after_order_itemmeta', function($item_id, $item, $product, $order_id){
  if (! is_admin()){
    return;
  }

  $preview = $item->get_meta('preview_url');
  $design_id = intval($item->get_meta('nb_design_id'));
  $print = $item->get_meta('print_url');

  if (! $preview && ! $design_id){
    return;
  }

  $product_id = $product && is_a($product, 'WC_Product') ? $product->get_id() : 0;
  $summary = nb_get_design_attribute_summary($design_id, $product_id, $item);
  $download_link = nb_render_design_download_link($preview, $design_id, $print);

  if (empty($summary) && ! $download_link){
    return;
  }

  echo '<div class="nb-order-item-design-meta">';
  if (! empty($summary)){
    echo '<div class="nb-order-item-design-meta__attributes">';
    foreach ($summary as $row){
      echo '<div class="nb-order-item-design-meta__attribute"><strong>'.esc_html($row['label']).':</strong> '.esc_html($row['value']).'</div>';
    }
    echo '</div>';
  }
  if ($download_link){
    echo '<p class="nb-order-item-design-meta__download">'.$download_link.'</p>';
  }
  echo '</div>';
}, 10, 4);

add_action('admin_head', function(){
  if (! function_exists('get_current_screen')){
    return;
  }

  $screen = get_current_screen();
  if (! $screen){
    return;
  }

  $screen_id = $screen->id ?? '';
  if ($screen_id === ''){
    return;
  }

  if ($screen_id !== 'shop_order' && strpos($screen_id, 'shop_order') === false && strpos($screen_id, 'wc-orders') === false){
    return;
  }

  echo '<style id="nb-order-design-admin-css">
.nb-order-designs .nb-order-design{display:flex;gap:16px;align-items:flex-start;margin-bottom:20px;}
.nb-order-designs .nb-order-design__preview img{max-width:220px;height:auto;display:block;border:1px solid #ddd;border-radius:4px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.08);}
.nb-order-designs .nb-order-design__details{flex:1;min-width:0;}
.nb-order-designs .nb-order-design__attributes{margin:0 0 8px;padding:0;list-style:none;}
.nb-order-designs .nb-order-design__attributes li{margin:0 0 6px;padding:0;font-size:13px;}
.nb-order-designs .nb-order-design__attributes strong{display:inline-block;min-width:120px;font-weight:600;}
.nb-order-designs .nb-order-design__attributes span{font-weight:400;}
.nb-order-designs .nb-order-design__download{margin:8px 0 0;}
.nb-order-designs .nb-order-design__download .nb-design-download{display:inline-block;margin-top:2px;}
</style>';
});
