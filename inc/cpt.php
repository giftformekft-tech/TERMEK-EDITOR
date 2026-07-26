<?php
if ( ! defined('ABSPATH') ) exit;

// Register nb_design CPT (User Saved Designs)
add_action('init', function(){
  $admin_caps = array(
    'edit_post'=>'manage_woocommerce', 'read_post'=>'manage_woocommerce', 'delete_post'=>'manage_woocommerce',
    'edit_posts'=>'manage_woocommerce', 'edit_others_posts'=>'manage_woocommerce',
    'publish_posts'=>'manage_woocommerce', 'read_private_posts'=>'manage_woocommerce',
    'delete_posts'=>'manage_woocommerce', 'delete_private_posts'=>'manage_woocommerce',
    'delete_published_posts'=>'manage_woocommerce', 'delete_others_posts'=>'manage_woocommerce',
    'edit_private_posts'=>'manage_woocommerce', 'edit_published_posts'=>'manage_woocommerce',
  );
  register_post_type('nb_design', array(
    'label' => __('Mentett tervek', 'nb-designer'),
    'public' => false,
    'show_ui' => true,
    'show_in_menu' => false,
    'menu_icon' => 'dashicons-art',
    'supports' => array('title', 'author'),
    'capabilities' => array_merge($admin_caps, array('create_posts' => 'do_not_allow')),
    'map_meta_cap' => false,
  ));

  register_post_type('nb_template', array(
    'label' => __('Sablonok', 'nb-designer'),
    'public' => false,
    'show_ui' => true,
    'show_in_menu' => false,
    'menu_icon' => 'dashicons-layout',
    'supports' => array('title', 'thumbnail'),
    'capabilities' => array_merge($admin_caps, array('create_posts'=>'manage_woocommerce')),
    'map_meta_cap' => false,
  ));

  register_taxonomy('nb_template_cat', array('nb_template'), array(
    'label' => __('Sablonkategóriák', 'nb-designer'),
    'hierarchical' => true,
    'show_ui' => true,
    'show_admin_column' => true,
    'query_var' => true,
    'rewrite' => array('slug' => 'template-cat'),
    'capabilities' => array(
      'manage_terms'=>'manage_woocommerce', 'edit_terms'=>'manage_woocommerce',
      'delete_terms'=>'manage_woocommerce', 'assign_terms'=>'manage_woocommerce',
    ),
  ));
});

add_filter('manage_nb_design_posts_columns', function($columns){
  return [
    'cb'=>$columns['cb'] ?? '<input type="checkbox">',
    'nb_preview'=>__('Előnézet','nb-designer'),
    'title'=>__('Terv','nb-designer'),
    'nb_product'=>__('Termék','nb-designer'),
    'nb_order'=>__('Rendelés','nb-designer'),
    'nb_print'=>__('Nyomdakész fájl','nb-designer'),
    'date'=>$columns['date'] ?? __('Dátum','nb-designer'),
  ];
});

add_action('manage_nb_design_posts_custom_column', function($column, $post_id){
  if ($column === 'nb_preview') {
    $url = get_post_meta($post_id, 'preview_url', true);
    echo $url ? '<img src="'.esc_url($url).'" alt="" style="width:96px;height:72px;object-fit:contain;border:1px solid #dfe3e8;border-radius:8px;background:#fff">' : '—';
  } elseif ($column === 'nb_product') {
    $productId = absint(get_post_meta($post_id, 'product_id', true));
    echo $productId ? '<a href="'.esc_url(get_edit_post_link($productId)).'">'.esc_html(get_the_title($productId)).' (#'.esc_html($productId).')</a>' : '—';
  } elseif ($column === 'nb_order') {
    $orderId = nb_find_order_id_for_design($post_id);
    $orderUrl = $orderId && function_exists('wc_get_order') && wc_get_order($orderId) ? wc_get_order($orderId)->get_edit_order_url() : '';
    echo $orderUrl ? '<a href="'.esc_url($orderUrl).'">#'.esc_html($orderId).'</a>' : '—';
  } elseif ($column === 'nb_print') {
    $url = get_post_meta($post_id, 'print_url', true);
    echo $url ? '<a class="button" href="'.esc_url($url).'" download>'.esc_html__('PNG letöltése','nb-designer').'</a>' : '—';
  }
}, 10, 2);

function nb_find_order_id_for_design($designId){
  global $wpdb;
  $itemMetaTable = $wpdb->prefix.'woocommerce_order_itemmeta';
  $itemsTable = $wpdb->prefix.'woocommerce_order_items';
  return intval($wpdb->get_var($wpdb->prepare(
    "SELECT oi.order_id FROM {$itemMetaTable} oim INNER JOIN {$itemsTable} oi ON oi.order_item_id=oim.order_item_id WHERE oim.meta_key=%s AND oim.meta_value=%s ORDER BY oi.order_id DESC LIMIT 1",
    'nb_design_id', (string)absint($designId)
  )));
}

function nb_templates_gallery_render(){
  if (!current_user_can(nb_admin_capability())) return;
  $search = sanitize_text_field(wp_unslash($_GET['s'] ?? ''));
  $category = absint($_GET['category'] ?? 0);
  $paged = max(1, absint($_GET['paged'] ?? 1));
  $args = ['post_type'=>'nb_template','post_status'=>'publish','posts_per_page'=>30,'paged'=>$paged,'orderby'=>'date','order'=>'DESC','s'=>$search];
  if ($category) $args['tax_query'] = [['taxonomy'=>'nb_template_cat','field'=>'term_id','terms'=>$category]];
  $query = new WP_Query($args);
  ?>
  <div class="wrap nb-admin nb-admin-v2">
    <header class="nb-page-header"><div><p class="nb-eyebrow"><?php esc_html_e('Tartalomkönyvtár','nb-designer'); ?></p><h1><?php esc_html_e('Sablonok','nb-designer'); ?></h1></div><div class="nb-header-actions"><a class="button" href="<?php echo esc_url(admin_url('admin.php?page=nb-template-uploader')); ?>"><?php esc_html_e('Tömeges feltöltés','nb-designer'); ?></a><a class="button button-primary" href="<?php echo esc_url(admin_url('post-new.php?post_type=nb_template')); ?>"><?php esc_html_e('Új sablon','nb-designer'); ?></a></div></header>
    <form method="get" class="nb-gallery-filters"><input type="hidden" name="page" value="nb-designer-templates"><label><span class="screen-reader-text"><?php esc_html_e('Keresés','nb-designer'); ?></span><input type="search" name="s" value="<?php echo esc_attr($search); ?>" placeholder="<?php esc_attr_e('Sablon keresése…','nb-designer'); ?>"></label><?php wp_dropdown_categories(['taxonomy'=>'nb_template_cat','hide_empty'=>false,'show_option_all'=>__('Minden kategória','nb-designer'),'name'=>'category','selected'=>$category,'value_field'=>'term_id']); ?><button class="button"><?php esc_html_e('Szűrés','nb-designer'); ?></button></form>
    <div class="nb-gallery-grid">
      <?php foreach($query->posts as $post): $preview=get_post_meta($post->ID,'preview_url',true); $terms=get_the_terms($post->ID,'nb_template_cat'); ?>
        <article class="nb-gallery-card"><a class="nb-gallery-image" href="<?php echo esc_url(get_edit_post_link($post->ID)); ?>"><?php if($preview):?><img src="<?php echo esc_url($preview); ?>" alt=""><?php else:?><span class="dashicons dashicons-format-image"></span><?php endif;?></a><div class="nb-gallery-body"><h2><a href="<?php echo esc_url(get_edit_post_link($post->ID)); ?>"><?php echo esc_html($post->post_title); ?></a></h2><p><?php echo esc_html(!empty($terms)&&!is_wp_error($terms)?implode(', ',wp_list_pluck($terms,'name')):__('Nincs kategória','nb-designer')); ?></p><a class="button" href="<?php echo esc_url(get_edit_post_link($post->ID)); ?>"><?php esc_html_e('Szerkesztés','nb-designer'); ?></a></div></article>
      <?php endforeach; if(!$query->have_posts()):?><div class="nb-empty-state"><span class="dashicons dashicons-layout"></span><h3><?php esc_html_e('Nincs találat','nb-designer'); ?></h3><p><?php esc_html_e('Tölts fel sablonokat vagy módosítsd a szűrést.','nb-designer'); ?></p></div><?php endif;?>
    </div>
    <?php echo wp_kses_post(paginate_links(['total'=>$query->max_num_pages,'current'=>$paged])); ?>
  </div>
  <?php
}

function nb_designs_gallery_render(){
  if (!current_user_can(nb_admin_capability())) return;
  $search = sanitize_text_field(wp_unslash($_GET['s'] ?? ''));
  $productId = absint($_GET['product_id'] ?? 0);
  $authorId = absint($_GET['author_id'] ?? 0);
  $dateFrom = sanitize_text_field(wp_unslash($_GET['date_from'] ?? ''));
  $paged = max(1, absint($_GET['paged'] ?? 1));
  $args = ['post_type'=>'nb_design','post_status'=>'publish','posts_per_page'=>30,'paged'=>$paged,'orderby'=>'date','order'=>'DESC','s'=>$search];
  if ($authorId) $args['author'] = $authorId;
  if ($productId) $args['meta_query'] = [['key'=>'product_id','value'=>$productId,'compare'=>'=','type'=>'NUMERIC']];
  if ($dateFrom && preg_match('/^\d{4}-\d{2}-\d{2}$/',$dateFrom)) $args['date_query'] = [['after'=>$dateFrom.' 00:00:00','inclusive'=>true]];
  $query = new WP_Query($args);
  $settings = nb_get_settings([]);
  ?>
  <div class="wrap nb-admin nb-admin-v2">
    <header class="nb-page-header"><div><p class="nb-eyebrow"><?php esc_html_e('Vásárlói tervek','nb-designer'); ?></p><h1><?php esc_html_e('Mentett tervek','nb-designer'); ?></h1></div><span class="nb-count-badge"><?php echo esc_html($query->found_posts); ?></span></header>
    <form method="get" class="nb-gallery-filters"><input type="hidden" name="page" value="nb-designer-designs"><input type="search" name="s" value="<?php echo esc_attr($search); ?>" placeholder="<?php esc_attr_e('Terv keresése…','nb-designer'); ?>"><select name="product_id"><option value="0"><?php esc_html_e('Minden termék','nb-designer'); ?></option><?php foreach(($settings['products']??[]) as $pid):?><option value="<?php echo esc_attr($pid); ?>" <?php selected($productId,$pid); ?>><?php echo esc_html(get_the_title($pid)); ?></option><?php endforeach;?></select><?php wp_dropdown_users(['name'=>'author_id','selected'=>$authorId,'show_option_all'=>__('Minden felhasználó','nb-designer')]); ?><input type="date" name="date_from" value="<?php echo esc_attr($dateFrom); ?>" aria-label="<?php esc_attr_e('Ettől a dátumtól','nb-designer'); ?>"><button class="button"><?php esc_html_e('Szűrés','nb-designer'); ?></button></form>
    <div class="nb-gallery-grid">
      <?php foreach($query->posts as $post): $preview=get_post_meta($post->ID,'preview_url',true); $print=get_post_meta($post->ID,'print_url',true); $pid=absint(get_post_meta($post->ID,'product_id',true)); $orderId=nb_find_order_id_for_design($post->ID); $order=$orderId&&function_exists('wc_get_order')?wc_get_order($orderId):null; ?>
        <article class="nb-gallery-card"><a class="nb-gallery-image" href="<?php echo esc_url(get_edit_post_link($post->ID)); ?>"><?php if($preview):?><img src="<?php echo esc_url($preview); ?>" alt=""><?php else:?><span class="dashicons dashicons-art"></span><?php endif;?></a><div class="nb-gallery-body"><p class="nb-eyebrow"><?php echo esc_html(wp_date('Y. m. d. H:i',strtotime($post->post_date))); ?></p><h2><a href="<?php echo esc_url(get_edit_post_link($post->ID)); ?>"><?php echo esc_html($post->post_title); ?></a></h2><p><?php echo esc_html($pid?get_the_title($pid):__('Ismeretlen termék','nb-designer')); ?> · <?php echo esc_html(get_the_author_meta('display_name',$post->post_author)); ?></p><div class="nb-gallery-actions"><?php if($order):?><a class="button" href="<?php echo esc_url($order->get_edit_order_url()); ?>"><?php echo esc_html(sprintf(__('Rendelés #%d','nb-designer'),$orderId)); ?></a><?php endif;?><?php if($print):?><a class="button button-primary" href="<?php echo esc_url($print); ?>" download><?php esc_html_e('PNG letöltése','nb-designer'); ?></a><?php endif;?></div></div></article>
      <?php endforeach; if(!$query->have_posts()):?><div class="nb-empty-state"><span class="dashicons dashicons-art"></span><h3><?php esc_html_e('Nincs találat','nb-designer'); ?></h3><p><?php esc_html_e('Módosítsd a szűrést.','nb-designer'); ?></p></div><?php endif;?>
    </div>
    <?php echo wp_kses_post(paginate_links(['total'=>$query->max_num_pages,'current'=>$paged])); ?>
  </div>
  <?php
}

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
