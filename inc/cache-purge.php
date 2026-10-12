<?php
if ( ! defined('ABSPATH') ) exit;

/**
 * A bővítmény frissítése után egyszer kiüríti a gyorsító bővítmények oldal-gyorsítótárát.
 * Különben egy korábban eltárolt (pl. külön mobil) oldalmásolat a régi, összevont CSS-re
 * hivatkozhat, és a tervező stílus nélkül jelenik meg – inkognitóban is, mert a szerver adja.
 */
function nb_designer_purge_page_caches(){
  // LiteSpeed Cache
  do_action('litespeed_purge_all');
  // WP Rocket
  if (function_exists('rocket_clean_domain')) rocket_clean_domain();
  if (function_exists('rocket_clean_minify')) rocket_clean_minify();
  // W3 Total Cache
  if (function_exists('w3tc_flush_all')) w3tc_flush_all();
  // WP Super Cache
  if (function_exists('wp_cache_clear_cache')) wp_cache_clear_cache();
  // WP Fastest Cache
  if (function_exists('wpfc_clear_all_cache')) wpfc_clear_all_cache(true);
  // SiteGround Optimizer
  if (function_exists('sg_cachepress_purge_cache')) sg_cachepress_purge_cache();
  // Autoptimize
  if (class_exists('autoptimizeCache') && method_exists('autoptimizeCache', 'clearall')) autoptimizeCache::clearall();
  // Breeze, Cache Enabler, Hummingbird, Nginx Helper
  do_action('breeze_clear_all_cache');
  do_action('cache_enabler_clear_complete_cache');
  do_action('wphb_clear_page_cache');
  do_action('rt_nginx_helper_purge_all');
}

add_action('init', function(){
  if (!defined('NB_DESIGNER_VERSION')) return;
  if (get_option('nb_designer_purged_version') === NB_DESIGNER_VERSION) return;
  update_option('nb_designer_purged_version', NB_DESIGNER_VERSION, false);
  nb_designer_purge_page_caches();
}, 99);
