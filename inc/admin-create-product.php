<?php
if ( ! defined('ABSPATH') ) exit;

/**
 * Új tervezhető termék egy lépésben: létrehoz egy egyszerű WooCommerce terméket,
 * felveszi a tervező termékei közé a megadott típussal és méretekkel, és a globális
 * típust ehhez a termékhez köti. Egyszerű termék, mert a tervező a méretet és a
 * színt a rendelési tételhez írja, így nincs szükség variációkra.
 */

function nb_render_create_product_panel($settings){
  if (!current_user_can(nb_admin_capability()) || !class_exists('WC_Product_Simple')) return;
  $types = is_array($settings['types'] ?? null) ? $settings['types'] : [];
  ?>
  <section class="nb-panel" id="nb-create-product">
    <div class="nb-panel-heading"><div><h2><?php esc_html_e('Új tervezhető termék létrehozása', 'nb-designer'); ?></h2><p><?php esc_html_e('Létrehozza a WooCommerce terméket, felveszi a tervezőbe a típussal és a méretekkel, és a típust ehhez a termékhez köti. Utána már csak a mockupokat kell a színekhez rendelni.', 'nb-designer'); ?></p></div></div>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" class="nb-form">
      <input type="hidden" name="action" value="nb_create_designable_product">
      <?php wp_nonce_field('nb_create_designable_product'); ?>
      <div class="nb-repeater-row" style="flex-wrap:wrap">
        <label><span><?php esc_html_e('Termék neve (WooCommerce)', 'nb-designer'); ?></span><input type="text" name="nb_new[name]" required placeholder="<?php esc_attr_e('Tervezhető gyerekpóló', 'nb-designer'); ?>"></label>
        <label><span><?php esc_html_e('Tervezői típus', 'nb-designer'); ?></span><input type="text" name="nb_new[type]" required list="nb-new-type-list" placeholder="<?php esc_attr_e('Gyerek póló', 'nb-designer'); ?>"><datalist id="nb-new-type-list"><?php foreach ($types as $type): ?><option value="<?php echo esc_attr($type); ?>"><?php endforeach; ?></datalist></label>
        <label><span><?php esc_html_e('Méretek (vesszővel)', 'nb-designer'); ?></span><input type="text" name="nb_new[sizes]" placeholder="104, 116, 128, 140, 152, 164"></label>
        <label><span><?php esc_html_e('Alapár nyomás nélkül (Ft)', 'nb-designer'); ?></span><input type="number" min="0" step="1" name="nb_new[price]" placeholder="4990"></label>
      </div>
      <p><label class="nb-inline-toggle"><input type="checkbox" name="nb_new[hidden]" value="1" checked> <?php esc_html_e('Ne jelenjen meg külön a boltban (csak a tervezőből rendelhető)', 'nb-designer'); ?></label></p>
      <p class="description"><?php esc_html_e('Ha a típus már létezik, ehhez az új termékhez kötődik; ha más termék típusai között is szerepel, ott a Termékek oldalon eltávolíthatod. A típus színei a Típusok és színek oldalról jönnek. Az alapár a WooCommerce termék ára: a fő tervezőben erre jön a nyomtatási díj. A csapattervezőben a Csapatruha tervező oldalon megadott sávárak számítanak (nyomással együtt); ha ott nincs ár, ez az alapár.', 'nb-designer'); ?></p>
      <p><button class="button button-primary"><?php esc_html_e('Termék létrehozása', 'nb-designer'); ?></button></p>
    </form>
  </section>
  <?php
}

add_action('admin_post_nb_create_designable_product', function(){
  if (!current_user_can(nb_admin_capability())) wp_die(esc_html__('Nincs jogosultságod.', 'nb-designer'));
  check_admin_referer('nb_create_designable_product');
  if (!class_exists('WC_Product_Simple')) wp_die(esc_html__('A WooCommerce nem érhető el.', 'nb-designer'));

  $input = wp_unslash($_POST['nb_new'] ?? []);
  $input = is_array($input) ? $input : [];
  $name = sanitize_text_field($input['name'] ?? '');
  $type = nb_clean_label_string(sanitize_text_field($input['type'] ?? ''));
  $type_key = nb_normalize_type_key($type);
  $back = admin_url('admin.php?page=nb-designer-products');
  if ($name === '' || $type_key === ''){
    wp_safe_redirect(add_query_arg('nb_create_error', rawurlencode(__('Add meg a termék nevét és a tervezői típust.', 'nb-designer')), $back).'#nb-create-product');
    exit;
  }
  $sizes = nb_clean_label_list(array_map('trim', explode(',', sanitize_text_field($input['sizes'] ?? ''))));
  $price = isset($input['price']) && $input['price'] !== '' ? max(0, floatval($input['price'])) : null;

  $product = new WC_Product_Simple();
  $product->set_name($name);
  $product->set_status('publish');
  if ($price !== null) $product->set_regular_price((string)$price);
  if (!empty($input['hidden'])) $product->set_catalog_visibility('hidden');
  $pid = $product->save();
  if (!$pid){
    wp_safe_redirect(add_query_arg('nb_create_error', rawurlencode(__('Nem sikerült létrehozni a terméket.', 'nb-designer')), $back).'#nb-create-product');
    exit;
  }

  $settings = nb_get_settings([]);
  $settings = is_array($settings) ? $settings : [];
  if (function_exists('nb_store_settings_history')) nb_store_settings_history($settings, 'Új tervezhető termék: '.$name);
  $products = array_map('absint', (array)($settings['products'] ?? []));
  if (!in_array($pid, $products, true)) $products[] = $pid;
  $settings['products'] = $products;
  $types = (array)($settings['types'] ?? []);
  if (!in_array($type_key, array_map('nb_normalize_type_key', $types), true)) $types[] = $type;
  $settings['types'] = $types;
  $order_labels = (array)($settings['type_order_labels'] ?? []);
  if (empty($order_labels[$type_key])) $order_labels[$type_key] = $type;
  $settings['type_order_labels'] = $order_labels;
  $type_products = (array)($settings['type_products'] ?? []);
  $type_products[$type_key] = $pid;
  $settings['type_products'] = $type_products;
  $catalog = (array)($settings['catalog'] ?? []);
  $catalog[$pid] = ['title'=>$name, 'types'=>[$type], 'colors'=>[], 'sizes'=>$sizes, 'map'=>[], 'size_surcharge'=>[]];
  nb_sync_product_color_configuration($catalog[$pid], $settings);
  $settings['catalog'] = $catalog;
  nb_update_settings($settings);

  wp_safe_redirect(add_query_arg(['page'=>'nb-designer-products', 'product_id'=>$pid, 'nb_created'=>1], admin_url('admin.php')));
  exit;
});

add_action('admin_notices', function(){
  $page = sanitize_key($_GET['page'] ?? '');
  if ($page !== 'nb-designer-products') return;
  if (!empty($_GET['nb_created'])){
    echo '<div class="notice notice-success is-dismissible"><p>'.esc_html__('A tervezhető termék elkészült. Most rendeld hozzá a mockupokat a színekhez az alábbi mátrixban, majd mentsd.', 'nb-designer').'</p></div>';
  }
  if (!empty($_GET['nb_create_error'])){
    echo '<div class="notice notice-error is-dismissible"><p>'.esc_html(sanitize_text_field(wp_unslash($_GET['nb_create_error']))).'</p></div>';
  }
});
