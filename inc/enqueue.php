<?php
if ( ! defined('ABSPATH') ) exit;

add_action('wp_enqueue_scripts', function(){
  if ( is_page() && has_shortcode(get_post()->post_content ?? '', 'nb_designer') ) {
    $version = defined('NB_DESIGNER_VERSION') ? NB_DESIGNER_VERSION : '1.6.0';
    wp_enqueue_style('nb-designer', NB_DESIGNER_URL.'assets/css/designer.css', [], $version);
    wp_enqueue_script('fabric', 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js', [], null, true);
    wp_enqueue_script('nb-qrcode', 'https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/dist/qrcode.js', [], null, true);
    wp_enqueue_script('nb-qrcode-utf8', 'https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/dist/qrcode_UTF8.js', ['nb-qrcode'], null, true);
    wp_enqueue_script('nb-designer', NB_DESIGNER_URL.'assets/js/designer-app.js', ['fabric','jquery','nb-qrcode-utf8'], $version, true);
    $stored = get_option('nb_settings', []);
    $settings = is_array($stored) ? $stored : [];
    $cleaned = nb_clean_settings_unicode($settings);
    // Clean settings but do not save on frontend load
    $settings = $cleaned;
    if (!empty($settings['catalog']) && is_array($settings['catalog'])){
      foreach($settings['catalog'] as $pid=>&$cfg){
        if (empty($cfg['title'])) $cfg['title'] = get_the_title($pid);
        unset($cfg['price_html'], $cfg['price_text']);
        unset($cfg['price_value']);
        if (function_exists('wc_get_product')) {
          $product_obj = wc_get_product($pid);
          if ($product_obj) {
            $display_price = '';
            if (function_exists('wc_get_price_to_display')) {
              $display_price = wc_get_price_to_display($product_obj);
            }
            if ($display_price !== '' && is_numeric($display_price)) {
              $cfg['price_value'] = (float)$display_price;
            }
            $price_html = $product_obj->get_price_html();
            if ($price_html === '' && $display_price !== '' && function_exists('wc_price')) {
              if ($display_price !== '') {
                $price_html = wc_price($display_price);
              }
            }
            if (is_string($price_html) && $price_html !== '') {
              $cfg['price_html'] = wp_kses_post($price_html);
              if (function_exists('wp_strip_all_tags')) {
                $plain = trim(wp_strip_all_tags($price_html));
                if ($plain !== '') {
                  $cfg['price_text'] = $plain;
                }
              }
            }
            if (!isset($cfg['price_text']) || $cfg['price_text'] === '') {
              $raw_price = $product_obj->get_price();
              if ($raw_price !== '') {
                $cfg['price_text'] = (string)$raw_price;
              }
            }
          }
        }
        nb_sync_product_color_configuration($cfg, $settings);
      }
    }
    $initial_design_image_url = '';
    $nb_product_id = isset($_GET['nb_product']) ? absint($_GET['nb_product']) : 0;
    if ($nb_product_id) {
      $attachment_id = (int) get_post_meta($nb_product_id, '_mg_last_design_attachment', true);
      if ($attachment_id) {
        $attachment_url = wp_get_attachment_url($attachment_id);
        if ($attachment_url) {
          $initial_design_image_url = $attachment_url;
        }
      }
      if ($initial_design_image_url === '') {
        $design_path = get_post_meta($nb_product_id, '_mg_last_design_path', true);
        if ($design_path) {
          $upload_dir = wp_upload_dir();
          $normalized_path = wp_normalize_path($design_path);
          $normalized_base = wp_normalize_path($upload_dir['basedir']);
          if (strpos($normalized_path, $normalized_base) === 0) {
            $relative_path = ltrim(substr($normalized_path, strlen($normalized_base)), '/');
            $initial_design_image_url = $upload_dir['baseurl'].'/'.$relative_path;
          }
        }
      }
    }
    wp_localize_script('nb-designer','NB_DESIGNER',[
      'rest'  => esc_url_raw( rest_url('nb/v1/') ),
      'nonce' => wp_create_nonce('wp_rest'),
      'settings' => $settings,
      'initial_design_image_url' => $initial_design_image_url,
    ]);
  }
});

add_action('admin_enqueue_scripts', function($hook){
  if ( isset($_GET['page']) && $_GET['page']==='nb-designer' ) {
    wp_enqueue_media();
    $version = defined('NB_DESIGNER_VERSION') ? NB_DESIGNER_VERSION : '1.6.0';
    wp_enqueue_style('nb-admin', NB_DESIGNER_URL.'admin/css/admin.css', [], $version);
    wp_enqueue_script('fabric', 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js', [], null, true);
    wp_enqueue_script('nb-admin', NB_DESIGNER_URL.'admin/js/admin.js', ['jquery','fabric'], $version, true);
    $stored = get_option('nb_settings', []);
    $adminSettings = is_array($stored) ? $stored : [];
    $cleanedAdmin = nb_clean_settings_unicode($adminSettings);
    if (wp_json_encode($cleanedAdmin) !== wp_json_encode($adminSettings)){
      $adminSettings = $cleanedAdmin;
      update_option('nb_settings', $adminSettings);
    } else {
      $adminSettings = $cleanedAdmin;
    }
    if (!empty($adminSettings['catalog']) && is_array($adminSettings['catalog'])){
      foreach($adminSettings['catalog'] as $pid=>&$cfg){
        if (empty($cfg['title'])) $cfg['title'] = get_the_title($pid);
        unset($cfg['price_html'], $cfg['price_text']);
        unset($cfg['price_value']);
        if (function_exists('wc_get_product')) {
          $product_obj = wc_get_product($pid);
          if ($product_obj) {
            $display_price = '';
            if (function_exists('wc_get_price_to_display')) {
              $display_price = wc_get_price_to_display($product_obj);
            }
            if ($display_price !== '' && is_numeric($display_price)) {
              $cfg['price_value'] = (float)$display_price;
            }
            $price_html = $product_obj->get_price_html();
            if ($price_html === '' && $display_price !== '' && function_exists('wc_price')) {
              if ($display_price !== '') {
                $price_html = wc_price($display_price);
              }
            }
            if (is_string($price_html) && $price_html !== '') {
              $cfg['price_html'] = wp_kses_post($price_html);
              if (function_exists('wp_strip_all_tags')) {
                $plain = trim(wp_strip_all_tags($price_html));
                if ($plain !== '') {
                  $cfg['price_text'] = $plain;
                }
              }
            }
            if (!isset($cfg['price_text']) || $cfg['price_text'] === '') {
              $raw_price = $product_obj->get_price();
              if ($raw_price !== '') {
                $cfg['price_text'] = (string)$raw_price;
              }
            }
          }
        }
        nb_sync_product_color_configuration($cfg, $adminSettings);
      }
    }
    wp_localize_script('nb-admin','NB_ADMIN',[
      'nonce' => wp_create_nonce('nb_admin'),
      'ajax'  => admin_url('admin-ajax.php'),
      'settings' => $adminSettings,
    ]);
  }
});
