<?php
if ( ! defined('ABSPATH') ) exit;

add_action('woocommerce_admin_order_data_after_order_details', function($order){
  echo '<div class="order_data_column"><h3>Tervezett minta</h3>';
  foreach ($order->get_items() as $item){
    $preview = $item->get_meta('preview_url');
    $design_id = $item->get_meta('nb_design_id');
    $type_label = $item->get_meta('nb_type_label');
    $color_label = $item->get_meta('nb_color_label');
    $size_label = $item->get_meta('nb_size_label');

    if ($design_id && (! $type_label || ! $color_label || ! $size_label)){
      $ctx = nb_get_design_attribute_context($design_id);
      if (! $type_label && !empty($ctx['type_label'])) $type_label = $ctx['type_label'];
      if (! $color_label && !empty($ctx['color_label'])) $color_label = $ctx['color_label'];
      if (! $size_label && !empty($ctx['size_label'])) $size_label = $ctx['size_label'];
    }

    if ($preview){
      echo '<p><img src="'.esc_url($preview).'" style="max-width:220px;border:1px solid #ddd"/></p>';
      echo '<p>Design ID: '.intval($design_id).'</p>';
      if ($type_label || $color_label || $size_label){
        echo '<ul style="margin:0;padding-left:18px;">';
        if ($type_label) echo '<li><strong>Terméktípus:</strong> '.esc_html($type_label).'</li>';
        if ($color_label) echo '<li><strong>Szín:</strong> '.esc_html($color_label).'</li>';
        if ($size_label) echo '<li><strong>Méret:</strong> '.esc_html($size_label).'</li>';
        echo '</ul>';
      }
    }
  }
  echo '</div>';
});
