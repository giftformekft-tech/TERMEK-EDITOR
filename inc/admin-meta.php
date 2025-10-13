<?php
if ( ! defined('ABSPATH') ) exit;

add_action('woocommerce_admin_order_data_after_order_details', function($order){
  echo '<div class="order_data_column"><h3>Tervezett minta</h3>';
  foreach ($order->get_items() as $item){
    $preview = $item->get_meta('preview_url');
    $design_id = $item->get_meta('nb_design_id');
    if ($preview){
      echo '<p><img src="'.esc_url($preview).'" style="max-width:220px;border:1px solid #ddd"/></p>';
      echo '<p>Design ID: '.intval($design_id).'</p>';
    }
  }
  echo '</div>';
});
