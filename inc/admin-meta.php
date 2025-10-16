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

function nb_admin_render_design_block($item){
  if (! $item || ! is_object($item) || ! method_exists($item, 'get_meta')){
    return '';
  }

  $preview = $item->get_meta('preview_url');
  $design_id = intval($item->get_meta('nb_design_id'));
  $print = $item->get_meta('print_url');

  if (! $preview && ! $design_id){
    return '';
  }

  $product_id = 0;
  if (method_exists($item, 'get_product_id')){
    $product_id = intval($item->get_product_id());
  }

  $summary = nb_get_design_attribute_summary($design_id, $product_id, $item);
  $download_link = nb_render_design_download_link($preview, $design_id, $print);

  ob_start();
  echo '<div class="nb-order-design">';
  if ($preview){
    echo '<div class="nb-order-design__preview"><img src="'.esc_url($preview).'" alt="" /></div>';
  }

  if (! empty($summary) || $download_link){
    echo '<div class="nb-order-design__details">';

    if (! empty($summary)){
      echo '<ul class="nb-order-design__attributes">';
      foreach ($summary as $row){
        if (empty($row['label']) || empty($row['value'])){
          continue;
        }
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

  return trim(ob_get_clean());
}

add_action('woocommerce_admin_order_data_after_order_details', function($order){
  if (! $order || ! is_a($order, 'WC_Order')){
    return;
  }

  $blocks = [];
  foreach ($order->get_items() as $item){
    $block = nb_admin_render_design_block($item);
    if ($block !== ''){
      $blocks[] = $block;
    }
  }

  if (empty($blocks)){
    return;
  }

  echo '<div class="order_data_column nb-order-designs"><h3>'.esc_html__('Tervezett minta','nb').'</h3>'.implode('', $blocks).'</div>';
});

add_action('woocommerce_after_order_itemmeta', function($item_id, $item, $product, $order_id){
  if (! is_admin()){
    return;
  }

  $preview = $item && is_object($item) && method_exists($item, 'get_meta') ? $item->get_meta('preview_url') : '';
  $design_id = $item && is_object($item) && method_exists($item, 'get_meta') ? intval($item->get_meta('nb_design_id')) : 0;
  $print = $item && is_object($item) && method_exists($item, 'get_meta') ? $item->get_meta('print_url') : '';

  if (! $preview && ! $design_id){
    return;
  }

  $product_id = 0;
  if ($product && is_a($product, 'WC_Product')){
    $product_id = $product->get_id();
  } elseif ($item && method_exists($item, 'get_product_id')){
    $product_id = intval($item->get_product_id());
  }

  $summary = nb_get_design_attribute_summary($design_id, $product_id, $item);
  $download_link = nb_render_design_download_link($preview, $design_id, $print);

  if (empty($summary) && ! $download_link){
    return;
  }

  echo '<div class="nb-order-item-design-meta">';
  if (! empty($summary)){
    echo '<div class="nb-order-item-design-meta__attributes">';
    foreach ($summary as $row){
      if (empty($row['label']) || empty($row['value'])){
        continue;
      }
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
.nb-order-designs .nb-order-design:last-child{margin-bottom:0;}
.nb-order-designs .nb-order-design__preview img{max-width:220px;height:auto;display:block;border:1px solid #ddd;border-radius:4px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.08);}
.nb-order-designs .nb-order-design__details{flex:1;min-width:0;}
.nb-order-designs .nb-order-design__attributes{margin:0 0 8px;padding:0;list-style:none;}
.nb-order-designs .nb-order-design__attributes li{margin:0 0 6px;padding:0;font-size:13px;line-height:1.4;}
.nb-order-designs .nb-order-design__attributes strong{display:inline-block;min-width:120px;font-weight:600;}
.nb-order-designs .nb-order-design__download{margin:8px 0 0;}
.nb-order-item-design-meta{margin:8px 0 12px;padding:12px;border:1px solid #dcdcde;border-radius:4px;background:#f9f9f9;}
.nb-order-item-design-meta__attribute{margin:0 0 4px;font-size:13px;}
.nb-order-item-design-meta__attribute strong{margin-right:6px;}
.nb-order-item-design-meta__download{margin:8px 0 0;}
</style>';
});
