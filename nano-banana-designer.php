<?php
/**
 * Plugin Name: Nano Banana – Terméktervező
 * Description: Terméktervező külön menüvel. Terméktípus (pl. póló/pulóver) + szín + méret, típus–szín → mockup és ár. A feltöltött képek nem mehetnek ki a print-area-ból.
 * Version: 2.1.2
 * Author: Nano Banana
 * Requires Plugins: woocommerce
 * License: GPLv2 or later
 */
if ( ! defined('ABSPATH') ) exit;

define('NB_DESIGNER_PATH', plugin_dir_path(__FILE__));
define('NB_DESIGNER_URL', plugin_dir_url(__FILE__));
define('NB_DESIGNER_VERSION', '2.1.2');
// Kompatibilitási alapérték, ha egy régi mockuphoz még nincs fizikai méret.
// A v2-es mockup-méreteket a szerver oldali konfigurációból olvassuk, nem a kliens kéréséből.
define('NB_DESIGNER_PRINT_AREA_WIDTH_MM', 300);
define('NB_DESIGNER_PRINT_AREA_HEIGHT_MM', 400);

require_once NB_DESIGNER_PATH.'inc/helpers.php';
require_once NB_DESIGNER_PATH.'inc/appearance.php';
require_once NB_DESIGNER_PATH.'inc/cpt.php';
require_once NB_DESIGNER_PATH.'inc/rest.php';
require_once NB_DESIGNER_PATH.'inc/enqueue.php';
require_once NB_DESIGNER_PATH.'inc/shortcode.php';
require_once NB_DESIGNER_PATH.'inc/home-block.php';
require_once NB_DESIGNER_PATH.'inc/teamwear-page.php';
require_once NB_DESIGNER_PATH.'inc/cart-fees.php';
require_once NB_DESIGNER_PATH.'inc/admin-meta.php';
require_once NB_DESIGNER_PATH.'inc/admin-menu.php';
require_once NB_DESIGNER_PATH.'inc/admin-rest.php';
require_once NB_DESIGNER_PATH.'inc/account-integration.php';

add_action('admin_init', 'nb_upgrade_settings_schema');
add_action('init', function(){ load_plugin_textdomain('nb-designer', false, dirname(plugin_basename(__FILE__)).'/languages'); });

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
      // product_id => {title, types[], colors[], sizes[], map: {'type|color':{mockup_id, mockup_index (legacy), fee_per_cm2?, min_fee?, base_fee?}}, size_surcharge: {S:0,XL:300}}
      'catalog'  => [],
      'fonts' => [],
      // [{id,label,image_url,areas:[{role,x,y,w,h,width_mm,height_mm,dpi}],area:{...legacy}}]
      'mockups' => [],
      'bulk_discounts' => [],
      'appearance' => nb_designer_appearance_defaults(),
      'schema_version' => '2.0',
    ]);
  }
  nb_upgrade_settings_schema();
  if (function_exists('nb_teamwear_ensure_page')) nb_teamwear_ensure_page();
});
