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
      if ( ! class_exists('WC') ) return new WP_Error('wc','WooCommerce szükséges', ['status'=>500]);
      $design_id = intval($req->get_param('design_id'));
      if (! $design_id) return new WP_Error('bad','Hiányzó design_id', ['status'=>400]);
      $product_id = intval(get_post_meta($design_id,'product_id',true));
      $attrs = json_decode(get_post_meta($design_id,'attributes_json',true), true) ?: [];
      $cart_item_data = [
        'nb_design_id' => $design_id,
        'preview_url'  => get_post_meta($design_id,'preview_url',true),
      ];
      $variation_id = 0;
      $added = WC()->cart->add_to_cart($product_id, 1, $variation_id, $attrs, $cart_item_data);
      if (! $added) return new WP_Error('cart','Nem sikerült kosárba tenni', ['status'=>500]);
      return ['ok'=>true,'redirect'=>wc_get_cart_url()];
    }
  ]);

  register_rest_route('nb/v1','/settings',[
    'methods'=>'GET','permission_callback'=>'__return_true',
    'callback'=>function(){ return get_option('nb_settings',[]); }
  ]);
});
