<?php
if ( ! defined('ABSPATH') ) exit;

add_action('wp_enqueue_scripts', function(){
  if ( is_page() && has_shortcode(get_post()->post_content ?? '', 'nb_designer') ) {
    $version = defined('NB_DESIGNER_VERSION') ? NB_DESIGNER_VERSION : '1.4.59';
    wp_enqueue_style('nb-designer', NB_DESIGNER_URL.'assets/css/designer.css', [], $version);
    wp_enqueue_script('fabric', 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js', [], null, true);
    wp_enqueue_script('nb-designer', NB_DESIGNER_URL.'assets/js/designer-app.js', ['fabric','jquery'], $version, true);
    $stored = get_option('nb_settings', []);
    $settings = is_array($stored) ? $stored : [];
    $cleaned = nb_clean_settings_unicode($settings);
    if (wp_json_encode($cleaned) !== wp_json_encode($settings)){
      $settings = $cleaned;
      update_option('nb_settings', $settings);
    } else {
      $settings = $cleaned;
    }
    if (!empty($settings['catalog']) && is_array($settings['catalog'])){
      foreach($settings['catalog'] as $pid=>&$cfg){
        if (empty($cfg['title'])) $cfg['title'] = get_the_title($pid);
        unset($cfg['price_html'], $cfg['price_text']);
        if (function_exists('wc_get_product')) {
          $product_obj = wc_get_product($pid);
          if ($product_obj) {
            $price_html = $product_obj->get_price_html();
            if ($price_html === '' && function_exists('wc_get_price_to_display') && function_exists('wc_price')) {
              $display_price = wc_get_price_to_display($product_obj);
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
    wp_localize_script('nb-designer','NB_DESIGNER',[
      'rest'  => esc_url_raw( rest_url('nb/v1/') ),
      'nonce' => wp_create_nonce('wp_rest'),
      'settings' => $settings,
    ]);
  }
});

add_action('admin_enqueue_scripts', function($hook){
  if ( isset($_GET['page']) && $_GET['page']==='nb-designer' ) {
    wp_enqueue_media();
    $version = defined('NB_DESIGNER_VERSION') ? NB_DESIGNER_VERSION : '1.4.59';
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
        if (function_exists('wc_get_product')) {
          $product_obj = wc_get_product($pid);
          if ($product_obj) {
            $price_html = $product_obj->get_price_html();
            if ($price_html === '' && function_exists('wc_get_price_to_display') && function_exists('wc_price')) {
              $display_price = wc_get_price_to_display($product_obj);
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
