<?php
if ( ! defined('ABSPATH') ) exit;

function nb_to_lower($value){
  if (!is_string($value) || $value === '') return '';
  return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
}

function nb_title_case($value){
  if (!is_string($value) || $value === '') return '';
  if (function_exists('mb_convert_case')) return mb_convert_case($value, MB_CASE_TITLE, 'UTF-8');
  return ucwords(strtolower($value));
}

function nb_get_design_attribute_context($design_id, $settings = null){
  if ($settings === null) $settings = get_option('nb_settings',[]);
  $price_ctx = json_decode(get_post_meta($design_id,'price_ctx',true), true) ?: [];

  $product_id = intval($price_ctx['product_id'] ?? get_post_meta($design_id,'product_id',true));
  $type_raw   = is_string($price_ctx['type'] ?? null) ? $price_ctx['type'] : '';
  $color_raw  = is_string($price_ctx['color'] ?? null) ? $price_ctx['color'] : '';
  $size       = is_string($price_ctx['size'] ?? null) ? $price_ctx['size'] : '';

  $type = nb_to_lower($type_raw);
  $color = nb_to_lower($color_raw);

  $type_label  = is_string($price_ctx['type_label'] ?? null) ? trim($price_ctx['type_label']) : '';
  $color_label = is_string($price_ctx['color_label'] ?? null) ? trim($price_ctx['color_label']) : '';
  $size_label  = is_string($price_ctx['size_label'] ?? null) ? trim($price_ctx['size_label']) : '';

  if ($type_label === '' && !empty($settings['types']) && is_array($settings['types'])){
    foreach ($settings['types'] as $candidate){
      if (nb_to_lower($candidate) === $type){
        $type_label = $candidate;
        break;
      }
    }
  }

  if (!empty($settings['catalog'][$product_id])){
    $cfg = $settings['catalog'][$product_id];
    if ($color_label === ''){
      foreach (($cfg['colors'] ?? []) as $candidate){
        if (nb_to_lower($candidate) === $color){
          $color_label = $candidate;
          break;
        }
      }
    }
    if ($size_label === ''){
      foreach (($cfg['sizes'] ?? []) as $candidate){
        if (nb_to_lower($candidate) === nb_to_lower($size)){
          $size_label = $candidate;
          break;
        }
      }
    }
  }

  if ($type_label === '' && $type !== '') $type_label = nb_title_case($type);
  if ($color_label === '' && $color !== '') $color_label = nb_title_case($color);
  if ($size_label === '' && $size !== '') {
    $size_label = function_exists('mb_strtoupper') ? mb_strtoupper($size, 'UTF-8') : strtoupper($size);
  }

  return [
    'product_id'   => $product_id,
    'type'         => $type,
    'color'        => $color,
    'size'         => $size,
    'type_label'   => $type_label,
    'color_label'  => $color_label,
    'size_label'   => $size_label,
  ];
}

function nb_calc_fee_for_design($design_id){
  $settings = get_option('nb_settings',[]);
  $ctx = nb_get_design_attribute_context($design_id, $settings);

  $global_per = isset($settings['fee_per_cm2']) ? floatval($settings['fee_per_cm2']) : 3;
  $global_min = isset($settings['min_fee']) ? floatval($settings['min_fee']) : 990;

  $w = floatval(get_post_meta($design_id,'width_mm',true))/10;
  $h = floatval(get_post_meta($design_id,'height_mm',true))/10;
  $area_cm2 = max(0,$w*$h);

  $pid = $ctx['product_id'];
  $type = $ctx['type'];
  $color = $ctx['color'];
  $size  = $ctx['size'];

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
  if (!empty($values['nb_design_id'])){
    $design_id = $values['nb_design_id'];
    $item->add_meta_data('nb_design_id',$design_id);
    $ctx = nb_get_design_attribute_context($design_id);
    if (!empty($ctx['type_label']))  $item->add_meta_data('nb_type_label', $ctx['type_label']);
    if (!empty($ctx['color_label'])) $item->add_meta_data('nb_color_label', $ctx['color_label']);
    if (!empty($ctx['size_label']))  $item->add_meta_data('nb_size_label', $ctx['size_label']);
  }
  if (!empty($values['preview_url']))  $item->add_meta_data('preview_url',$values['preview_url']);
},10,4);
