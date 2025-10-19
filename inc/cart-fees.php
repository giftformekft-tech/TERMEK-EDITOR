<?php
if ( ! defined('ABSPATH') ) exit;

function nb_calc_fee_for_design($design_id, $override_ctx = []){
  $settings = get_option('nb_settings',[]);
  $global_per = isset($settings['fee_per_cm2']) ? floatval($settings['fee_per_cm2']) : 3;
  $global_min = isset($settings['min_fee']) ? floatval($settings['min_fee']) : 990;

  $w = floatval(get_post_meta($design_id,'width_mm',true))/10;
  $h = floatval(get_post_meta($design_id,'height_mm',true))/10;
  $area_cm2 = max(0,$w*$h);

  $price_ctx = json_decode(get_post_meta($design_id,'price_ctx',true), true) ?: [];
  if (is_array($override_ctx) && !empty($override_ctx)){
    foreach ($override_ctx as $key=>$value){
      if ($value === null) {
        continue;
      }
      if ($key === 'product_id'){
        $price_ctx[$key] = intval($value);
        continue;
      }
      if (is_scalar($value)){
        $string_value = (string)$value;
        if ($key === 'size_label' || $key === 'type_label' || $key === 'color_label'){
          $price_ctx[$key] = trim($string_value);
        } else {
          $price_ctx[$key] = $string_value;
        }
      }
    }
  }
  $pid = intval($price_ctx['product_id'] ?? get_post_meta($design_id,'product_id',true));
  $type = nb_normalize_type_key($price_ctx['type'] ?? '');
  $color = nb_normalize_color_key($price_ctx['color'] ?? '');
  $size  = $price_ctx['size'] ?? '';

  $per = $global_per; $min = $global_min; $base = 0; $size_add = 0;
  $printed_side_count = intval(get_post_meta($design_id,'printed_side_count',true));
  if ($printed_side_count < 0){
    $printed_side_count = 0;
  }

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
  if ($printed_side_count > 1){
    $meta_double_fee = floatval(get_post_meta($design_id,'double_sided_fee',true));
    if ($meta_double_fee > 0){
      $fee += $meta_double_fee;
    } else {
      $global_double_fee = isset($settings['double_sided_fee']) ? floatval($settings['double_sided_fee']) : 0;
      if ($global_double_fee > 0){
        $fee += $global_double_fee;
      }
    }
  }
  return max(0,$fee);
}

add_action('woocommerce_cart_calculate_fees', function($cart){
  if ( is_admin() && ! defined('DOING_AJAX') ) return;
  $total_fee = 0; $has=false;
  $discount_groups = [];
  foreach ($cart->get_cart() as $item){
    if (!empty($item['nb_design_id'])){
      $has=true;
      $override = [];
      if (!empty($item['nb_price_ctx_override']) && is_array($item['nb_price_ctx_override'])){
        $override = $item['nb_price_ctx_override'];
      }
      $total_fee += nb_calc_fee_for_design($item['nb_design_id'], $override);
    }
    if (!empty($item['nb_bulk_group_id'])){
      $group_id = (string)$item['nb_bulk_group_id'];
      if ($group_id !== ''){
        if (!isset($discount_groups[$group_id])){
          $discount_groups[$group_id] = [
            'base'     => 0,
            'quantity' => 0,
          ];
        }
        $quantity = isset($item['quantity']) ? intval($item['quantity']) : 1;
        if ($quantity < 1){
          $quantity = 1;
        }
        $discount_groups[$group_id]['quantity'] += $quantity;
        $line_total = 0;
        if (!empty($item['data']) && is_a($item['data'], 'WC_Product')){
          if (function_exists('wc_get_price_excluding_tax')){
            $line_total = wc_get_price_excluding_tax($item['data'], ['qty'=>$quantity]);
          } else {
            $line_total = floatval($item['data']->get_price()) * $quantity;
          }
        }
        $discount_groups[$group_id]['base'] += max(0, $line_total);
      }
    }
  }
  if ($has && $total_fee>0){
    $cart->add_fee(__('Egyedi nyomat','nb'), $total_fee, true);
  }
  if (!empty($discount_groups)){
    $settings = get_option('nb_settings', []);
    if (!is_array($settings)){
      $settings = [];
    }
    foreach ($discount_groups as $group){
      $quantity = isset($group['quantity']) ? intval($group['quantity']) : 0;
      $percent = 0;
      if ($quantity > 0 && function_exists('nb_find_bulk_discount_for_quantity')){
        $percent = nb_find_bulk_discount_for_quantity($quantity, $settings);
      }
      $base = floatval($group['base']);
      if ($percent <= 0 || $base <= 0){
        continue;
      }
      $discount_amount = round($base * ($percent / 100), 2);
      if ($discount_amount <= 0){
        continue;
      }
      $percent_label = function_exists('wc_format_decimal') ? wc_format_decimal($percent, 2) : number_format_i18n($percent, 2);
      if (function_exists('wp_strip_all_tags')){
        $percent_label = wp_strip_all_tags($percent_label);
      }
      if (function_exists('wc_clean')){
        $percent_label = wc_clean($percent_label);
      } elseif (function_exists('sanitize_text_field')) {
        $percent_label = sanitize_text_field($percent_label);
      }
      $label = sprintf(__('Mennyiségi kedvezmény (−%s%%)','nb'), $percent_label);
      $cart->add_fee($label, -$discount_amount, false);
    }
  }
});

add_action('woocommerce_checkout_create_order_line_item', function($item, $cart_item_key, $values, $order){
  if (!empty($values['nb_design_id'])) $item->add_meta_data('nb_design_id',$values['nb_design_id']);
  if (!empty($values['preview_url']))  $item->add_meta_data('preview_url',$values['preview_url']);
  if (!empty($values['print_url']))    $item->add_meta_data('print_url',$values['print_url']);
  if (!empty($values['print_width_px']))  $item->add_meta_data('print_width_px', intval($values['print_width_px']));
  if (!empty($values['print_height_px'])) $item->add_meta_data('print_height_px', intval($values['print_height_px']));
  if (!empty($values['preview_back_url'])) $item->add_meta_data('preview_back_url',$values['preview_back_url']);
  if (!empty($values['print_back_url']))   $item->add_meta_data('print_back_url',$values['print_back_url']);
  if (!empty($values['print_back_width_px']))  $item->add_meta_data('print_back_width_px', intval($values['print_back_width_px']));
  if (!empty($values['print_back_height_px'])) $item->add_meta_data('print_back_height_px', intval($values['print_back_height_px']));
  if (!empty($values['nb_printed_side_count'])) $item->add_meta_data('nb_printed_side_count', intval($values['nb_printed_side_count']));

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

    if (! empty($values['nb_size_label_override'])){
      $clean_override = trim((string)$values['nb_size_label_override']);
      if ($clean_override !== ''){
        if (! isset($extra_candidates['size'])){
          $extra_candidates['size'] = [];
        }
        if (! in_array($clean_override, $extra_candidates['size'], true)){
          $extra_candidates['size'][] = $clean_override;
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
