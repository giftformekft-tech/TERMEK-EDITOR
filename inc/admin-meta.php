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

add_action('woocommerce_admin_order_data_after_order_details', function($order){
  echo '<div class="order_data_column"><h3>Tervezett minta</h3>';
  foreach ($order->get_items() as $item){
    $preview = $item->get_meta('preview_url');
    $design_id = $item->get_meta('nb_design_id');
    $print = $item->get_meta('print_url');
    $type_label = '';
    $color_label = '';
    $size_label = '';
    if ($design_id){
      $price_ctx = json_decode(get_post_meta($design_id, 'price_ctx', true), true);
      if (is_array($price_ctx)){
        $type_label = isset($price_ctx['type']) ? (string) $price_ctx['type'] : '';
        $color_label = isset($price_ctx['color']) ? (string) $price_ctx['color'] : '';
        $size_label = isset($price_ctx['size']) ? (string) $price_ctx['size'] : '';
      }
    }
    if ($preview){
      $design_id = intval($design_id);
      echo '<p><img src="'.esc_url($preview).'" style="max-width:220px;border:1px solid #ddd"/></p>';
      echo '<p>Design ID: '.$design_id.'</p>';
      $details = [];
      if ($type_label !== '') $details[] = 'Terméktípus: '.esc_html($type_label);
      if ($color_label !== '') $details[] = 'Szín: '.esc_html($color_label);
      if ($size_label !== '') $details[] = 'Méret: '.esc_html($size_label);
      if (!empty($details)){
        echo '<p>'.implode('<br>', $details).'</p>';
      }
      echo '<p>'.nb_render_design_download_link($preview, $design_id, $print).'</p>';
    }
  }
  echo '</div>';
});

add_action('woocommerce_order_item_meta_end', function($item_id, $item, $order){
  $preview = $item->get_meta('preview_url');
  $print = $item->get_meta('print_url');
  if (! $preview) return;

  $design_id = $item->get_meta('nb_design_id');
  $details = [];
  if ($design_id){
    $price_ctx = json_decode(get_post_meta($design_id, 'price_ctx', true), true);
    if (is_array($price_ctx)){
      if (!empty($price_ctx['type'])){
        $details[] = '<span class="nb-order-attr nb-order-attr--type">Terméktípus: '.esc_html($price_ctx['type']).'</span>';
      }
      if (!empty($price_ctx['color'])){
        $details[] = '<span class="nb-order-attr nb-order-attr--color">Szín: '.esc_html($price_ctx['color']).'</span>';
      }
      if (!empty($price_ctx['size'])){
        $details[] = '<span class="nb-order-attr nb-order-attr--size">Méret: '.esc_html($price_ctx['size']).'</span>';
      }
    }
  }
  if (!empty($details)){
    echo '<p class="nb-order-design-attrs">'.implode('<br>', $details).'</p>';
  }
  echo '<p class="nb-order-design-link">'.nb_render_design_download_link($preview, $design_id, $print).'</p>';
}, 10, 3);
