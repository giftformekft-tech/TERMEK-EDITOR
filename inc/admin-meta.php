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

if ( ! function_exists('nb_get_design_attribute_summary') ) {
  function nb_get_design_attribute_summary($design_id, $product_id = 0){
    $ctx = nb_get_design_price_context($design_id);
    if (empty($ctx)){
      return [];
    }

    $product_id = $product_id ? intval($product_id) : intval($ctx['product_id'] ?? 0);

    $map = [
      'type'  => ['label' => __('Terméktípus','nb'), 'taxonomy' => 'pa_type'],
      'color' => ['label' => __('Szín','nb'),         'taxonomy' => 'pa_color'],
      'size'  => ['label' => __('Méret','nb'),        'taxonomy' => 'pa_size'],
    ];

    $summary = [];
    foreach ($map as $key => $config){
      $value = nb_normalize_attribute_display($ctx[$key] ?? '', $config['taxonomy'], $product_id);
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

    $summary = nb_get_design_attribute_summary($design_id, $item->get_product_id());
    $download_link = nb_render_design_download_link($preview, $design_id, $print);

    echo '<div class="nb-order-design">';
    if ($preview){
      echo '<p><img src="'.esc_url($preview).'" alt="" style="max-width:220px;border:1px solid #ddd" /></p>';
    }
    if (! empty($summary)){
      echo '<div class="nb-order-design__attributes">';
      foreach ($summary as $row){
        echo '<p><strong>'.esc_html($row['label']).':</strong> '.esc_html($row['value']).'</p>';
      }
      echo '</div>';
    }
    if ($download_link){
      echo '<p class="nb-order-design__download">'.$download_link.'</p>';
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
  $summary = nb_get_design_attribute_summary($design_id, $product_id);
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
