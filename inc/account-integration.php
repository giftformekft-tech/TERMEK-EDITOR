<?php
if ( ! defined('ABSPATH') ) exit;

/**
 * Saját tervek menüpont hozzáadása a Fiókom oldalhoz
 */

add_filter('woocommerce_account_menu_items', function($items){
  // Beszúrjuk a Rendelések után
  $new_items = [];
  foreach ($items as $key => $value){
    $new_items[$key] = $value;
    if ($key === 'orders'){
      $new_items['my-designs'] = 'Saját Terveim';
    }
  }
  return $new_items;
});

add_action('init', function(){
  add_rewrite_endpoint('my-designs', EP_ROOT | EP_PAGES);
});

add_action('woocommerce_account_my-designs_endpoint', function(){
  $user_id = get_current_user_id();
  if (!$user_id) return;

  $paged = (get_query_var('paged')) ? get_query_var('paged') : 1;
  $args = [
    'post_type' => 'nb_design',
    'post_status' => 'publish',
    'author' => $user_id,
    'posts_per_page' => 10,
    'paged' => $paged,
    'orderby' => 'date',
    'order' => 'DESC'
  ];

  $query = new WP_Query($args);

  if ($query->have_posts()) {
    echo '<div class="nb-my-designs">';
    echo '<table class="woocommerce-orders-table woocommerce-MyAccount-orders shop_table shop_table_responsive my_account_orders account-orders-table">';
    echo '<thead><tr>';
    echo '<th><span class="nobr">Terv</span></th>';
    echo '<th><span class="nobr">Dátum</span></th>';
    echo '<th><span class="nobr">Műveletek</span></th>';
    echo '</tr></thead>';
    echo '<tbody>';

    while ($query->have_posts()) {
      $query->the_post();
      $design_id = get_the_ID();
      $preview_url = get_post_meta($design_id, 'preview_url', true);
      $edit_url = add_query_arg('nb_design_id', $design_id, get_permalink(get_page_by_path('tervezd-meg'))); // Feltételezzük, hogy a tervező oldal a /tervezd-meg

      echo '<tr class="woocommerce-orders-table__row">';
      echo '<td class="woocommerce-orders-table__cell">';
      if ($preview_url) {
        echo '<img src="'.esc_url($preview_url).'" style="max-width:80px; border-radius:4px;">';
      } else {
        echo get_the_title();
      }
      echo '</td>';
      echo '<td class="woocommerce-orders-table__cell" data-title="Dátum">';
      echo '<time datetime="'.get_the_date('c').'">'.get_the_date().'</time>';
      echo '</td>';
      echo '<td class="woocommerce-orders-table__cell" data-title="Műveletek">';
      // Itt lehetne szerkesztés gomb, ha támogatnánk a visszatöltést (ez a következő feature)
      // Egyelőre csak egy "Megtekintés" vagy törlés lehetne, de a szerkesztés a cél.
      // Mivel a sablon rendszer (Feature 3) fogja hozni a betöltést, itt előkészítem a gombot.
      echo '<a href="'.esc_url($edit_url).'" class="woocommerce-button button view">Szerkesztés</a>';
      echo '</td>';
      echo '</tr>';
    }

    echo '</tbody>';
    echo '</table>';
    
    // Lapozó
    echo '<div class="woocommerce-pagination">';
    echo paginate_links([
      'base' => str_replace(999999999, '%#%', esc_url(get_pagenum_link(999999999))),
      'format' => '',
      'current' => max(1, get_query_var('paged')),
      'total' => $query->max_num_pages,
    ]);
    echo '</div>';
    echo '</div>';
    
    wp_reset_postdata();
  } else {
    echo '<div class="woocommerce-message woocommerce-message--info woocommerce-Message woocommerce-Message--info woocommerce-info">';
    echo '<a class="woocommerce-Button button" href="'.esc_url(get_permalink(get_page_by_path('tervezd-meg'))).'">Tervezz most</a>';
    echo 'Még nincsenek mentett terveid.';
    echo '</div>';
  }
});

// Flush rewrite rules on activation (handled in main plugin file usually, but good to note)
