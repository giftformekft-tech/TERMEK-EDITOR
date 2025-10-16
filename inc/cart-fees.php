<?php
if ( ! defined('ABSPATH') ) exit;

function nb_calc_fee_for_design($design_id){
  $settings = get_option('nb_settings',[]);
  $global_per = isset($settings['fee_per_cm2']) ? floatval($settings['fee_per_cm2']) : 3;
  $global_min = isset($settings['min_fee']) ? floatval($settings['min_fee']) : 990;

  $w = floatval(get_post_meta($design_id,'width_mm',true))/10;
  $h = floatval(get_post_meta($design_id,'height_mm',true))/10;
  $area_cm2 = max(0,$w*$h);

  $price_ctx = json_decode(get_post_meta($design_id,'price_ctx',true), true) ?: [];
  $pid = intval($price_ctx['product_id'] ?? get_post_meta($design_id,'product_id',true));
  $type = nb_normalize_type_key($price_ctx['type'] ?? '');
  $color = nb_normalize_color_key($price_ctx['color'] ?? '');
  $size  = $price_ctx['size'] ?? '';

  $per = $global_per; $min = $global_min; $base = 0; $size_add = 0;

  if (!empty($settings['catalog'][$pid])){
    $cfg = $settings['catalog'][$pid];
    $key = $type.'|'.$color;
    if (!empty($cfg['map'][$key])){
      $m = $cfg['map'][$key];
      if (isset($m['fee_per_cm2']) && $m['fee_per_cm2']!=='') $per = floatval($m['fee_per_cm2']);
      if (isset($m['min_fee']) && $m['min_fee']!=='') $min = floatval($m['min_fee']);
      if (isset($m['base_fee']) && $m['base_fee']!=='') $base = floatval($m['base_fee']);
    }
    if (!empty($cfg['size_surcharge'][$size])) $size_add = floatval($cfg['size_surcharge'][$size]);
  }

  $fee = max($min, round($area_cm2 * $per)) + $base + $size_add;
  return max(0,$fee);
}

add_action('woocommerce_cart_calculate_fees', function($cart){
  if ( is_admin() && ! defined('DOING_AJAX') ) return;
  $total_fee = 0; $has=false;
  foreach ($cart->get_cart() as $item){
    if (!empty($item['nb_design_id'])){
      $has=true;
      $total_fee += nb_calc_fee_for_design($item['nb_design_id']);
    }
  }
  if ($has && $total_fee>0){
    $cart->add_fee(__('Egyedi nyomat','nb'), $total_fee, true);
  }
});

add_action('woocommerce_checkout_create_order_line_item', function($item, $cart_item_key, $values, $order){
  if (!empty($values['nb_design_id'])) $item->add_meta_data('nb_design_id',$values['nb_design_id']);
  if (!empty($values['preview_url']))  $item->add_meta_data('preview_url',$values['preview_url']);
  if (!empty($values['print_url']))    $item->add_meta_data('print_url',$values['print_url']);
  if (!empty($values['print_width_px']))  $item->add_meta_data('print_width_px', intval($values['print_width_px']));
  if (!empty($values['print_height_px'])) $item->add_meta_data('print_height_px', intval($values['print_height_px']));

  $design_id = intval($values['nb_design_id'] ?? 0);
  if ($design_id && function_exists('nb_get_design_attribute_summary')){
    $product_id = $item->get_product_id();
    if (! $product_id && method_exists($item, 'get_product')){
      $product = $item->get_product();
      if ($product && is_a($product, 'WC_Product')){
        $product_id = $product->get_id();
      }
    }

    $extra_candidates = [];
    if (! empty($values['variation']) && is_array($values['variation'])){
      foreach ($values['variation'] as $meta_key => $meta_value){
        if (! is_scalar($meta_value)){
          continue;
        }
        if (! function_exists('nb_detect_attribute_group_from_key')){
          continue;
        }
        $group = nb_detect_attribute_group_from_key($meta_key);
        if (! $group){
          continue;
        }
        $clean = trim((string)$meta_value);
        if ($clean === ''){
          continue;
        }
        if (! isset($extra_candidates[$group])){
          $extra_candidates[$group] = [];
        }
        if (! in_array($clean, $extra_candidates[$group], true)){
          $extra_candidates[$group][] = $clean;
        }
      }
    }

    $summary = nb_get_design_attribute_summary($design_id, $product_id, $item, $extra_candidates);
    if (! empty($summary)){
      foreach ($summary as $row){
        if (empty($row['key']) || empty($row['value'])){
          continue;
        }
        $meta_key = '_nb_attr_'.$row['key'].'_label';
        if (method_exists($item, 'update_meta_data')){
          $item->update_meta_data($meta_key, $row['value']);
        } else {
          $item->add_meta_data($meta_key, $row['value']);
        }
      }
    }
  }
},10,4);
