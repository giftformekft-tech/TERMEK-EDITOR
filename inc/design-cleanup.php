<?php
if ( ! defined('ABSPATH') ) exit;

/**
 * Napi takarítás: a rendeléshez nem kötött, régi vendégtervek és PNG fájljaik törlése.
 * A bejelentkezett vásárlók tervei megmaradnak (Fiókom → Saját terveim),
 * a rendeléshez tartozó tervek pedig soha nem törlődnek.
 */

define('NB_DESIGN_CLEANUP_HOOK', 'nb_designer_cleanup_designs');

add_action('init', function(){
  if ( ! wp_next_scheduled(NB_DESIGN_CLEANUP_HOOK) ) {
    wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', NB_DESIGN_CLEANUP_HOOK);
  }
});

add_action(NB_DESIGN_CLEANUP_HOOK, 'nb_cleanup_orphan_designs');

if ( ! function_exists('nb_design_file_path_from_url') ) {
  /** Csak a feltöltési mappán belüli, a bővítmény által írt (nb_ kezdetű) PNG-t adja vissza. */
  function nb_design_file_path_from_url($url){
    if (!is_string($url) || $url === '') return '';
    $uploads = wp_upload_dir(null, false);
    $baseurl = set_url_scheme($uploads['baseurl'], 'http');
    $url = set_url_scheme($url, 'http');
    if (strpos($url, $baseurl.'/') !== 0) return '';
    $relative = rawurldecode(substr($url, strlen($baseurl) + 1));
    if ($relative === '' || strpos($relative, '..') !== false) return '';
    if (!preg_match('/^nb_(preview|print)(_back)?_\d+(-\d+)?\.png$/', wp_basename($relative))) return '';
    $path = wp_normalize_path(trailingslashit($uploads['basedir']).$relative);
    $base = wp_normalize_path(trailingslashit($uploads['basedir']));
    return strpos($path, $base) === 0 ? $path : '';
  }
}

if ( ! function_exists('nb_cleanup_orphan_designs') ) {
  function nb_cleanup_orphan_designs(){
    $days = max(1, intval(apply_filters('nb_designer_cleanup_days', 30)));
    $batch = max(1, intval(apply_filters('nb_designer_cleanup_batch', 100)));
    $include_user_designs = (bool)apply_filters('nb_designer_cleanup_include_user_designs', false);

    $args = [
      'post_type'      => 'nb_design',
      'post_status'    => 'any',
      'posts_per_page' => $batch,
      'fields'         => 'ids',
      'orderby'        => 'date',
      'order'          => 'ASC',
      'no_found_rows'  => true,
      'date_query'     => [['before' => $days.' days ago', 'inclusive' => false]],
      'meta_query'     => [['key' => '_nb_keep', 'compare' => 'NOT EXISTS']],
    ];
    if (!$include_user_designs) {
      $args['author__in'] = [0]; // az 'author' => 0 a WP_Query-ben figyelmen kívül marad
    }
    $ids = get_posts($args);
    $deleted = 0;
    foreach ($ids as $design_id){
      if (function_exists('nb_find_order_id_for_design') && nb_find_order_id_for_design($design_id)) {
        // Megjelöljük, hogy a következő futások ne vizsgálják újra.
        update_post_meta($design_id, '_nb_keep', 'order');
        continue;
      }
      if (!apply_filters('nb_designer_cleanup_should_delete', true, $design_id)) {
        update_post_meta($design_id, '_nb_keep', 'filter');
        continue;
      }
      foreach (['preview_url', 'print_url', 'preview_back_url', 'print_back_url'] as $key){
        $path = nb_design_file_path_from_url(get_post_meta($design_id, $key, true));
        if ($path !== '' && file_exists($path)) {
          wp_delete_file($path);
        }
      }
      if (wp_delete_post($design_id, true)) {
        $deleted++;
      }
    }
    return $deleted;
  }
}
