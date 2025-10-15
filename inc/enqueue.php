<?php
if ( ! defined('ABSPATH') ) exit;

add_action('wp_enqueue_scripts', function(){
  if ( is_page() && has_shortcode(get_post()->post_content ?? '', 'nb_designer') ) {
    $version = defined('NB_DESIGNER_VERSION') ? NB_DESIGNER_VERSION : '1.4.17';
    wp_enqueue_style('nb-designer', NB_DESIGNER_URL.'assets/css/designer.css', [], $version);
    wp_enqueue_script('fabric', 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js', [], null, true);
    wp_enqueue_script('nb-designer', NB_DESIGNER_URL.'assets/js/designer-app.js', ['fabric','jquery'], $version, true);
    $settings = get_option('nb_settings', []);
    if (!empty($settings['catalog']) && is_array($settings['catalog'])){
      foreach($settings['catalog'] as $pid=>&$cfg){
        if (empty($cfg['title'])) $cfg['title'] = get_the_title($pid);
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
    $version = defined('NB_DESIGNER_VERSION') ? NB_DESIGNER_VERSION : '1.4.17';
    wp_enqueue_style('nb-admin', NB_DESIGNER_URL.'admin/css/admin.css', [], $version);
    wp_enqueue_script('fabric', 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js', [], null, true);
    wp_enqueue_script('nb-admin', NB_DESIGNER_URL.'admin/js/admin.js', ['jquery','fabric'], $version, true);
    $adminSettings = get_option('nb_settings', []);
    if (!empty($adminSettings['catalog']) && is_array($adminSettings['catalog'])){
      foreach($adminSettings['catalog'] as $pid=>&$cfg){
        if (empty($cfg['title'])) $cfg['title'] = get_the_title($pid);
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
