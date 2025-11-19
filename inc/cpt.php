<?php
if ( ! defined('ABSPATH') ) exit;

// Register nb_design CPT (User Saved Designs)
add_action('init', function(){
  register_post_type('nb_design', array(
    'label' => 'Mentett Tervek',
    'public' => false,
    'show_ui' => true,
    'show_in_menu' => 'nb-designer',
    'menu_icon' => 'dashicons-art',
    'supports' => array('title', 'author'),
    'capabilities' => array(
      'create_posts' => 'do_not_allow',
    ),
    'map_meta_cap' => true,
  ));

  register_post_type('nb_template', array(
    'label' => 'Sablonok',
    'public' => false,
    'show_ui' => true,
    'show_in_menu' => 'nb-designer',
    'menu_icon' => 'dashicons-layout',
    'supports' => array('title', 'thumbnail'),
  ));

  register_taxonomy('nb_template_cat', array('nb_template'), array(
    'label' => 'Sablon Kategóriák',
    'hierarchical' => true,
    'show_ui' => true,
    'show_admin_column' => true,
    'query_var' => true,
    'rewrite' => array('slug' => 'template-cat'),
  ));
});

// Meta box for preview
add_action('add_meta_boxes', function(){
  add_meta_box('nb_design_meta', 'Beállítások', 'nb_design_meta_box_content', 'nb_design', 'side', 'high');
  add_meta_box('nb_template_meta', 'Beállítások', 'nb_design_meta_box_content', 'nb_template', 'side', 'high');
});

function nb_design_meta_box_content($post){
  $preview = get_post_meta($post->ID, 'preview_url', true);
  
  if($post->post_type === 'nb_design'){
    echo '<p><em>Ez egy felhasználói mentés.</em></p>';
  }
  
  if($preview){
    echo '<p><strong>Előnézet:</strong></p>';
    echo '<img src="'.esc_url($preview).'" style="max-width:100%;height:auto;border:1px solid #ddd;">';
  } else {
    echo '<p>Nincs előnézet.</p>';
  }
}

// Custom columns for nb_template list
add_filter('manage_nb_template_posts_columns', function($columns){
  $new = array();
  foreach($columns as $key => $title){
    if ($key === 'title') {
      $new['nb_preview'] = 'Előnézet';
    }
    $new[$key] = $title;
  }
  return $new;
});

add_action('manage_nb_template_posts_custom_column', function($column, $post_id){
  if ($column === 'nb_preview'){
    $url = get_post_meta($post_id, 'preview_url', true);
    if ($url){
      echo '<img src="'.esc_url($url).'" style="width:80px;height:auto;border-radius:4px;border:1px solid #eee;">';
    } else {
      echo '—';
    }
  }
}, 10, 2);
