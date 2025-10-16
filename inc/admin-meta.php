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
      'type'  => ['attribute_pa_type', 'attribute_type', 'pa_type', 'type'],
      'color' => ['attribute_pa_color', 'attribute_color', 'pa_color', 'color'],
      'size'  => ['attribute_pa_size', 'attribute_size', 'pa_size', 'size'],
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
      'type'  => ['pa_type', 'type'],
      'color' => ['pa_color', 'color'],
      'size'  => ['pa_size', 'size'],
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
  function nb_get_design_attribute_summary($design_id, $product_id = 0, $item = null){
    $ctx = nb_get_design_price_context($design_id);
    $product_id = $product_id ? intval($product_id) : intval($ctx['product_id'] ?? 0);

    $ctx_candidates = [];
    foreach (['type','color','size'] as $key){
      if (isset($ctx[$key])){
        $ctx_candidates[$key] = nb_normalize_attribute_candidates($ctx[$key]);
      }
    }

    $design_candidates = nb_collect_design_attribute_candidates($design_id);
    $item_candidates = nb_collect_item_attribute_candidates($item);

    $map = [
      'type'  => ['label' => __('Terméktípus','nb'), 'taxonomy' => 'pa_type'],
      'color' => ['label' => __('Szín','nb'),         'taxonomy' => 'pa_color'],
      'size'  => ['label' => __('Méret','nb'),        'taxonomy' => 'pa_size'],
    ];

    $summary = [];
    foreach ($map as $key => $config){
      $candidates = array_merge(
        $ctx_candidates[$key]   ?? [],
        $design_candidates[$key]?? [],
        $item_candidates[$key]  ?? []
      );

      $value = '';
      foreach ($candidates as $candidate){
        $normalized = nb_normalize_attribute_display($candidate, $config['taxonomy'], $product_id);
        if ($normalized !== ''){
          $value = $normalized;
          break;
        }
      }

      if ($value !== ''){
        $summary[] = [
          'label' => $config['label'],
          'value' => $value,
        ];
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
