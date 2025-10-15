<?php
if ( ! defined('ABSPATH') ) exit;

if ( ! function_exists('nb_render_design_download_link') ) {
  function nb_render_design_download_link($preview, $design_id = 0){
    if (empty($preview)) return '';

    $design_id = intval($design_id);
    $filename = $design_id ? 'nb-design-'.$design_id.'.png' : 'nb-design.png';

    return '<a class="nb-design-download" href="'.esc_url($preview).'" target="_blank" rel="noopener" download="'.esc_attr($filename).'">'.esc_html__('Mintakép letöltése (PNG)','nb').'</a>';
  }
}

add_action('woocommerce_admin_order_data_after_order_details', function($order){
  echo '<div class="order_data_column"><h3>Tervezett minta</h3>';
  foreach ($order->get_items() as $item){
    $preview = $item->get_meta('preview_url');
    $design_id = $item->get_meta('nb_design_id');
    if ($preview){
      $design_id = intval($design_id);
      echo '<p><img src="'.esc_url($preview).'" style="max-width:220px;border:1px solid #ddd"/></p>';
      echo '<p>Design ID: '.$design_id.'</p>';
      echo '<p>'.nb_render_design_download_link($preview, $design_id).'</p>';
    }
  }
  echo '</div>';
});

add_action('woocommerce_order_item_meta_end', function($item_id, $item, $order){
  $preview = $item->get_meta('preview_url');
  if (! $preview) return;

  $design_id = $item->get_meta('nb_design_id');
  echo '<p class="nb-order-design-link">'.nb_render_design_download_link($preview, $design_id).'</p>';
}, 10, 3);
