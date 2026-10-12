<?php
if ( ! defined('ABSPATH') ) exit;

add_shortcode('nb_designer', function(){
  nb_designer_enqueue_assets();
  ob_start();
  // Ha a fejlécben nem került ki a stíluslap (oldalépítő, sablon, gyorsítótárazott mobil változat),
  // a tervező elé is kiírjuk, különben a felület stílus nélkül, óriás ikonokkal jelenik meg.
  // Saját <link>-et írunk, nem wp_print_styles()-t, hogy egy kivonathoz (pl. SEO meta) futó
  // megjelenítés ne jelölje a stíluslapot kiírtnak a valódi oldal helyett.
  if (!wp_style_is('nb-designer', 'done')){
    $version = nb_designer_asset_version('assets/css/designer.css');
    echo '<link rel="stylesheet" id="nb-designer-fallback-css" href="'.esc_url(add_query_arg('ver', $version, NB_DESIGNER_URL.'assets/css/designer.css')).'" media="all">';
    echo '<style id="nb-designer-fallback-inline-css">'.nb_designer_appearance_inline_css().'</style>';
  }
  include NB_DESIGNER_PATH.'templates/designer-page.php';
  return ob_get_clean();
});
