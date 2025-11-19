<?php
if ( ! defined('ABSPATH') ) exit;

add_action('init', function(){
  register_post_type('nb_design', [
    'label' => 'Mentett Tervek',
    'public' => false,
    'show_ui' => true,
    'show_in_menu' => 'nb-designer',
    'menu_icon' => 'dashicons-art',
    'supports' => ['title', 'author'],
    'capabilities' => [
      'create_posts' => 'do_not_allow', // Users create via frontend API only
    ],
    'map_meta_cap' => true,
  ]);

  register_post_type('nb_template', [
    'label' => 'Sablonok',
    'public' => false,
    'show_ui' => true,
    'show_in_menu' => 'nb-designer',
    'menu_icon' => 'dashicons-layout',
    'supports' => ['title', 'thumbnail'],
  ]);

  register_taxonomy('nb_template_cat', ['nb_template'], [
    'label' => 'Sablon Kategóriák',
    'hierarchical' => true,
    'show_ui' => true,
    'show_admin_column' => true,
    'query_var' => true,
    'rewrite' => ['slug' => 'template-cat'],
  ]);
});

add_action('add_meta_boxes', function(){
  $callback = function($post){
    $preview = get_post_meta($post->ID, 'preview_url', true);
    ?>
    <?php if($post->post_type === 'nb_design'): ?>
      <p><em>Ez egy felhasználói mentés.</em></p>
    <?php endif; ?>
    
    <?php if($preview): ?>
      <p><strong>Előnézet:</strong></p>
      <img src="<?php echo esc_url($preview); ?>" style="max-width:100%;height:auto;border:1px solid #ddd;">
    <?php else: ?>
      <p>Nincs előnézet.</p>
    <?php endif; ?>
    <?php
  };
  
  add_meta_box('nb_design_meta', 'Beállítások', $callback, 'nb_design', 'side', 'high');
  add_meta_box('nb_template_meta', 'Beállítások', $callback, 'nb_template', 'side', 'high');
});

add_action('save_post', function($post_id){
  if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
  if (!current_user_can('edit_post', $post_id)) return;
  
  if (isset($_POST['nb_is_template'])){
    update_post_meta($post_id, 'is_template', '1');
  } else {
    delete_post_meta($post_id, 'is_template');
  }
});

add_filter('manage_nb_template_posts_columns', function($columns){
  $new = [];
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
