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

if ( ! function_exists('nb_prepare_design_selection_parts') ) {
  function nb_prepare_design_selection_parts($type, $color, $size){
    $parts = [];
    if (is_string($type)){
      $clean = sanitize_text_field($type);
      if ($clean !== '') $parts[] = sprintf(__('Típus: %s','nb'), $clean);
    }
    if (is_string($color)){
      $clean = sanitize_text_field($color);
      if ($clean !== '') $parts[] = sprintf(__('Szín: %s','nb'), $clean);
    }
    if (is_string($size)){
      $clean = sanitize_text_field($size);
      if ($clean !== '') $parts[] = sprintf(__('Méret: %s','nb'), $clean);
    }
    return $parts;
  }
}

add_action('woocommerce_admin_order_data_after_order_details', function($order){
  echo '<div class="order_data_column"><h3>Tervezett minta</h3>';
  foreach ($order->get_items() as $item){
    $preview = $item->get_meta('preview_url');
    $design_id = $item->get_meta('nb_design_id');
    $print = $item->get_meta('print_url');
    $type = $item->get_meta('nb_product_type');
    $color = $item->get_meta('nb_product_color');
    $size  = $item->get_meta('nb_product_size');
    $parts = nb_prepare_design_selection_parts($type, $color, $size);
    $design_id_int = intval($design_id);
    $link_html = nb_render_design_download_link($preview, $design_id_int, $print);
    if (!$preview && empty($parts) && $design_id_int === 0 && $link_html === ''){
      continue;
    }
    if ($preview){
      echo '<p><img src="'.esc_url($preview).'" style="max-width:220px;border:1px solid #ddd"/></p>';
    }
    if (!empty($parts)){
      echo '<p>'.esc_html(implode(' • ', $parts)).'</p>';
    }
    if ($design_id_int){
      echo '<p>Design ID: '.$design_id_int.'</p>';
    }
    if ($link_html){
      echo '<p>'.$link_html.'</p>';
    }
  }
  echo '</div>';
});

add_action('woocommerce_order_item_meta_end', function($item_id, $item, $order){
  $preview = $item->get_meta('preview_url');
  $print = $item->get_meta('print_url');
  $design_id = $item->get_meta('nb_design_id');
  $type = $item->get_meta('nb_product_type');
  $color = $item->get_meta('nb_product_color');
  $size  = $item->get_meta('nb_product_size');
  $parts = nb_prepare_design_selection_parts($type, $color, $size);
  if (!empty($parts)){
    echo '<p class="nb-order-design-meta">'.esc_html(implode(' • ', $parts)).'</p>';
  }
  $link_html = nb_render_design_download_link($preview, $design_id, $print);
  if ($link_html){
    echo '<p class="nb-order-design-link">'.$link_html.'</p>';
  }
}, 10, 3);
