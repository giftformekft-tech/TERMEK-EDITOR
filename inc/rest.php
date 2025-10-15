<?php
if ( ! defined('ABSPATH') ) exit;

add_action('rest_api_init', function(){
  register_rest_route('nb/v1','/save', [
    'methods'  => 'POST',
    'permission_callback' => '__return_true',
    'callback' => function($req){
      $png = $req->get_param('png_base64');
      $meta = $req->get_param('meta');
      $layers = $req->get_param('layers');
      if (! $png || strpos($png,'data:image/png;base64,') !== 0) {
        return new WP_Error('bad_png','Hibás PNG adat', ['status'=>400]);
      }
      $data = base64_decode(substr($png,22));
      if ( ! function_exists('wp_upload_bits') ) require_once ABSPATH.'wp-admin/includes/file.php';
      $upload = wp_upload_bits('nb_'.time().'.png', null, $data);
      if (!empty($upload['error'])) return new WP_Error('upload','Mentési hiba: '.$upload['error'], ['status'=>500]);

      $post_id = wp_insert_post([
        'post_type'=>'nb_design','post_status'=>'publish',
        'post_title'=>'Design #'.time(),
        'meta_input'=>[
          'preview_url'     => esc_url_raw($upload['url']),
          'layers_json'     => wp_json_encode($layers),
          'width_mm'        => floatval($meta['width_mm']??0),
          'height_mm'       => floatval($meta['height_mm']??0),
          'dpi'             => intval($meta['dpi']??300),
          'product_id'      => intval($meta['product_id']??0),
          'attributes_json' => wp_json_encode($meta['attributes_json']??[]),
          'price_ctx'       => wp_json_encode($meta['price_ctx']??[]),
        ]
      ]);
      if (is_wp_error($post_id)) return new WP_Error('db','Nem sikerült menteni', ['status'=>500]);
      return ['design_id'=>$post_id,'preview_url'=>$upload['url']];
    }
  ]);

  register_rest_route('nb/v1','/add-to-cart', [
    'methods'=>'POST','permission_callback'=>'__return_true',
    'callback'=>function($req){
      if ( ! function_exists('WC') || ! WC() ) {
        return new WP_Error('wc','WooCommerce szükséges', ['status'=>500]);
      }
      if ( null === WC()->cart && function_exists('wc_load_cart') ) {
        wc_load_cart();
      }
      if ( null === WC()->session && method_exists(WC(), 'initialize_session') ) {
        WC()->initialize_session();
      }
      if ( null === WC()->cart ) {
        return new WP_Error('wc_cart','WooCommerce kosár nem elérhető', ['status'=>500]);
      }
      $design_id = intval($req->get_param('design_id'));
      if (! $design_id) return new WP_Error('bad','Hiányzó design_id', ['status'=>400]);

      $product_id = intval(get_post_meta($design_id,'product_id',true));
      if (! $product_id) return new WP_Error('product','Hiányzó termék', ['status'=>400]);

      $product = wc_get_product($product_id);
      if (! $product) return new WP_Error('product','A termék nem található', ['status'=>400]);

      $raw_attrs = json_decode(get_post_meta($design_id,'attributes_json',true), true) ?: [];
      $variation_attrs = [];
      $cart_product_id = $product_id;
      $variation_id = 0;

      if ($product->is_type('variation')){
        $variation_id = $product->get_id();
        $cart_product_id = $product->get_parent_id() ?: $product_id;
        foreach ($product->get_attributes() as $attr_name => $attr_value){
          $attr_name = is_string($attr_name) ? trim($attr_name) : '';
          if ($attr_name === '') continue;
          $variation_attrs['attribute_'.$attr_name] = $attr_value;
        }
        $parent = wc_get_product($cart_product_id);
        if ($parent) {
          $product = $parent;
        }
      } elseif ($product->is_type('variable')) {
        $normalized_map = [];
        foreach ($raw_attrs as $key=>$value){
          if (!is_scalar($value)) continue;
          $clean_value = wc_clean((string)$value);
          if ($clean_value === '') continue;
          $clean_key = is_string($key) ? strtolower(trim($key)) : '';
          if ($clean_key === '') continue;
          $normalized_map[$clean_key] = $clean_value;
          if (strpos($clean_key, 'attribute_') === 0){
            $normalized_map[substr($clean_key, 10)] = $clean_value;
          } elseif (strpos($clean_key, 'pa_') === 0){
            $normalized_map['attribute_'.$clean_key] = $clean_value;
            $normalized_map[substr($clean_key, 3)] = $clean_value;
          } else {
            $normalized_map['attribute_'.$clean_key] = $clean_value;
            $normalized_map['pa_'.$clean_key] = $clean_value;
          }
        }

        $product_variation_attributes = $product->get_variation_attributes();
        foreach ($product_variation_attributes as $attribute_name=>$options){
          $search_keys = [
            strtolower($attribute_name),
            strtolower(str_replace('attribute_', '', $attribute_name)),
          ];
          $short = str_replace('attribute_', '', $attribute_name);
          if (strpos($short, 'pa_') === 0){
            $search_keys[] = substr($short, 3);
          } else {
            $search_keys[] = 'pa_'.$short;
          }
          $matched_value = null;
          foreach ($search_keys as $candidate){
            if (isset($normalized_map[$candidate])){
              $matched_value = $normalized_map[$candidate];
              break;
            }
          }
          if ($matched_value === null) continue;
          if (is_array($options) && !empty($options) && !in_array($matched_value, $options, true)){
            $slug_candidate = sanitize_title($matched_value);
            if (in_array($slug_candidate, $options, true)){
              $matched_value = $slug_candidate;
            }
          }
          $variation_attrs[$attribute_name] = $matched_value;
        }

        $required_keys = array_filter(array_keys($product_variation_attributes));
        if (!empty($required_keys)){
          $missing = array_diff($required_keys, array_keys($variation_attrs));
          if (!empty($missing)){
            return new WP_Error('variant','Hiányzó variációs adatok', ['status'=>400]);
          }
        }

        if (!empty($variation_attrs)){
          if (!class_exists('WC_Data_Store')){
            return new WP_Error('wc','WooCommerce adatbolt nem érhető el', ['status'=>500]);
          }
          $data_store = WC_Data_Store::load('product');
          $match = $data_store->find_matching_product_variation($product, $variation_attrs);
          if ($match){
            $variation_id = $match;
            if (function_exists('wc_get_product_variation_attributes')) {
              $resolved_attrs = wc_get_product_variation_attributes($variation_id);
              if (is_array($resolved_attrs) && !empty($resolved_attrs)){
                $variation_attrs = $resolved_attrs;
              }
            }
          } else {
            return new WP_Error('variant','A kiválasztott kombináció nem elérhető', ['status'=>400]);
          }
        }
        if (! $variation_id) {
          return new WP_Error('variant','A kiválasztott kombináció nem elérhető', ['status'=>400]);
        }
      }

      $variation_product = null;
      if ($variation_id){
        $variation_product = wc_get_product($variation_id);
        if (! $variation_product){
          return new WP_Error('variant','A kiválasztott variáció nem található', ['status'=>400]);
        }
        if ('publish' !== $variation_product->get_status()){
          return new WP_Error('variant','A kiválasztott variáció nem érhető el', ['status'=>400]);
        }
        if (! $variation_product->is_in_stock() && ! $variation_product->backorders_allowed()){
          return new WP_Error('variant','A kiválasztott variáció nincs készleten', ['status'=>400]);
        }
      } else {
        if ('publish' !== $product->get_status()){
          return new WP_Error('product','A termék nem érhető el', ['status'=>400]);
        }
        if (! $product->is_in_stock() && ! $product->backorders_allowed()){
          return new WP_Error('product','A termék nincs készleten', ['status'=>400]);
        }
      }

      $cart_item_data = [
        'nb_design_id' => $design_id,
        'preview_url'  => get_post_meta($design_id,'preview_url',true),
      ];

      if (function_exists('wc_clear_notices')) {
        wc_clear_notices();
      }

      if (WC()->session && method_exists(WC()->session, 'set_customer_session_cookie')) {
        WC()->session->set_customer_session_cookie(true);
      }

      $override_ids = array_filter([$cart_product_id, $variation_id ? $variation_id : null]);
      $purchasable_filter = function($purchasable, $product_obj) use ($override_ids) {
        if (! is_object($product_obj) || ! is_a($product_obj, 'WC_Product')) {
          return $purchasable;
        }
        $id = $product_obj->get_id();
        if (! in_array($id, $override_ids, true)) {
          return $purchasable;
        }
        if (! $product_obj->exists()) {
          return false;
        }
        if ('publish' !== $product_obj->get_status()) {
          return false;
        }
        if (! $product_obj->is_in_stock() && ! $product_obj->backorders_allowed()) {
          return false;
        }
        if ($product_obj->get_price() === '') {
          return true;
        }
        return $purchasable;
      };

      add_filter('woocommerce_is_purchasable', $purchasable_filter, 10, 2);
      add_filter('woocommerce_variation_is_purchasable', $purchasable_filter, 10, 2);

      $added = WC()->cart->add_to_cart($cart_product_id, 1, $variation_id, $variation_attrs, $cart_item_data);

      remove_filter('woocommerce_is_purchasable', $purchasable_filter, 10);
      remove_filter('woocommerce_variation_is_purchasable', $purchasable_filter, 10);

      if (! $added) {
        $message = '';
        if (function_exists('wc_get_notices')){
          $errors = wc_get_notices('error');
          if (!empty($errors)){
            $pieces = [];
            foreach ($errors as $notice){
              if (is_array($notice) && isset($notice['notice'])){
                $pieces[] = wp_strip_all_tags($notice['notice']);
              } elseif (is_string($notice)){
                $pieces[] = wp_strip_all_tags($notice);
              }
            }
            $message = trim(implode(' ', array_filter($pieces))); 
          }
          wc_clear_notices();
        }
        if ($message === ''){
          $message = 'Nem sikerült kosárba tenni';
        }
        return new WP_Error('cart', $message, ['status'=>500]);
      }
      return ['ok'=>true,'redirect'=>wc_get_cart_url()];
    }
  ]);

  register_rest_route('nb/v1','/settings',[
    'methods'=>'GET','permission_callback'=>'__return_true',
    'callback'=>function(){ return get_option('nb_settings',[]); }
  ]);
});
