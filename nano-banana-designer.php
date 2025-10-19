<?php
/**
 * Plugin Name: Nano Banana – Terméktervező
 * Description: Terméktervező külön menüvel. Terméktípus (pl. póló/pulóver) + szín + méret, típus–szín → mockup és ár. A feltöltött képek nem mehetnek ki a print-area-ból.
 * Version: 1.4.83
 * Author: Nano Banana
 * Requires Plugins: woocommerce
 * License: GPLv2 or later
 */
if ( ! defined('ABSPATH') ) exit;

define('NB_DESIGNER_PATH', plugin_dir_path(__FILE__));
define('NB_DESIGNER_URL', plugin_dir_url(__FILE__));
define('NB_DESIGNER_VERSION', '1.4.83');

require_once NB_DESIGNER_PATH.'inc/helpers.php';
require_once NB_DESIGNER_PATH.'inc/cpt.php';
require_once NB_DESIGNER_PATH.'inc/rest.php';
require_once NB_DESIGNER_PATH.'inc/enqueue.php';
require_once NB_DESIGNER_PATH.'inc/shortcode.php';
require_once NB_DESIGNER_PATH.'inc/cart-fees.php';
require_once NB_DESIGNER_PATH.'inc/admin-meta.php';
require_once NB_DESIGNER_PATH.'inc/admin-menu.php';

/** Aktiváláskor alap oldal és opciók */
register_activation_hook(__FILE__, function(){
  if ( ! get_page_by_path('tervezd-meg') ) {
    wp_insert_post([
      'post_title'   => 'Tervezd meg',
      'post_name'    => 'tervezd-meg',
      'post_status'  => 'publish',
      'post_type'    => 'page',
      'post_content' => '[nb_designer]',
    ]);
  }
  if ( ! get_option('nb_settings') ){
    add_option('nb_settings',[
      'fee_per_cm2' => 3,
      'min_fee' => 990,
      'products' => [],
      'types' => ['Póló','Pulóver'],
      'type_products' => [],
      'color_palette' => [],
      // product_id => {title, types[], colors[], sizes[], map: {'type|color':{mockup_index, fee_per_cm2?, min_fee?, base_fee?}}, size_surcharge: {S:0,XL:300}}
      'catalog'  => [],
      'fonts' => [],
      // [{id,label,image_url,area:{x,y,w,h}}]
      'mockups' => [],
      'bulk_discounts' => [],
    ]);
  }
});
