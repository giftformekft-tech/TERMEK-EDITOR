<?php
if ( ! defined('ABSPATH') ) exit;

function nb_teamwear_page_url(){
  $page = get_page_by_path('csapatpolo');
  return $page ? get_permalink($page) : home_url('/csapatpolo/');
}

function nb_teamwear_ensure_page(){
  if (get_option('nb_teamwear_page_version') === '2.0') return;

  $page = get_page_by_path('csapatpolo');
  $page_ready = false;
  if (!$page){
    $page_id = wp_insert_post([
      'post_title' => 'Egyedi csapatpóló és logózott munkaruha',
      'post_name' => 'csapatpolo',
      'post_status' => 'publish',
      'post_type' => 'page',
      'post_content' => '<!-- wp:nano-banana/teamwear-landing /-->',
    ]);
    if (!is_wp_error($page_id) && $page_id){
      update_option('nb_teamwear_page_id', absint($page_id));
      $page_ready = true;
    }
  } else {
    update_option('nb_teamwear_page_id', absint($page->ID));
    if (trim((string)$page->post_content) === '[nb_teamwear]'){
      wp_update_post([
        'ID' => $page->ID,
        'post_content' => '<!-- wp:nano-banana/teamwear-landing /-->',
      ]);
    }
    $page_ready = true;
  }

  if ($page_ready) update_option('nb_teamwear_page_version', '2.0');
}
add_action('init', 'nb_teamwear_ensure_page', 20);

function nb_teamwear_is_page(){
  if (!is_singular('page')) return false;
  $post = get_post();
  return $post && (has_shortcode($post->post_content, 'nb_teamwear') || has_block('nano-banana/teamwear-landing', $post->post_content));
}

function nb_teamwear_block_defaults(){
  return [
    'inkColor' => '#17191c',
    'paperColor' => '#f5f2eb',
    'accentColor' => '#f2d04f',
    'finalColor' => '#397fc2',
    'heroMascotId' => 0,
    'heroMascotUrl' => '',
    'heroMascotAlt' => 'Céges kabalafigura',
    'discountMascotId' => 0,
    'discountMascotUrl' => '',
    'discountMascotAlt' => 'Céges kabalafigura a kedvezmények mellett',
    'finalMascotId' => 0,
    'finalMascotUrl' => '',
    'finalMascotAlt' => 'Céges kabalafigura',
  ];
}

add_action('init', function(){
  $version = defined('NB_DESIGNER_VERSION') ? NB_DESIGNER_VERSION : '1.11.0';
  wp_register_style('nb-teamwear-page', NB_DESIGNER_URL.'assets/css/teamwear-page.css', [], $version);
  wp_register_script(
    'nb-teamwear-block-editor',
    NB_DESIGNER_URL.'assets/js/teamwear-block-editor.js',
    ['wp-blocks', 'wp-block-editor', 'wp-components', 'wp-element', 'wp-server-side-render'],
    $version,
    true
  );
  $defaults = nb_teamwear_block_defaults();
  register_block_type('nano-banana/teamwear-landing', [
    'api_version' => 2,
    'editor_script' => 'nb-teamwear-block-editor',
    'style' => 'nb-teamwear-page',
    'editor_style' => 'nb-teamwear-page',
    'render_callback' => 'nb_teamwear_render',
    'attributes' => [
      'inkColor' => ['type' => 'string', 'default' => $defaults['inkColor']],
      'paperColor' => ['type' => 'string', 'default' => $defaults['paperColor']],
      'accentColor' => ['type' => 'string', 'default' => $defaults['accentColor']],
      'finalColor' => ['type' => 'string', 'default' => $defaults['finalColor']],
      'heroMascotId' => ['type' => 'number', 'default' => 0],
      'heroMascotUrl' => ['type' => 'string', 'default' => ''],
      'heroMascotAlt' => ['type' => 'string', 'default' => $defaults['heroMascotAlt']],
      'discountMascotId' => ['type' => 'number', 'default' => 0],
      'discountMascotUrl' => ['type' => 'string', 'default' => ''],
      'discountMascotAlt' => ['type' => 'string', 'default' => $defaults['discountMascotAlt']],
      'finalMascotId' => ['type' => 'number', 'default' => 0],
      'finalMascotUrl' => ['type' => 'string', 'default' => ''],
      'finalMascotAlt' => ['type' => 'string', 'default' => $defaults['finalMascotAlt']],
    ],
    'supports' => ['align' => ['wide', 'full'], 'html' => false],
  ]);
}, 11);

add_action('wp_enqueue_scripts', function(){
  if (!nb_teamwear_is_page()) return;
  $version = defined('NB_DESIGNER_VERSION') ? NB_DESIGNER_VERSION : '1.11.0';
  wp_enqueue_style('nb-teamwear-page', NB_DESIGNER_URL.'assets/css/teamwear-page.css', [], $version);
});

add_filter('body_class', function($classes){
  if (nb_teamwear_is_page()) $classes[] = 'nb-teamwear-page';
  return $classes;
});

add_filter('document_title_parts', function($parts){
  if (nb_teamwear_is_page()){
    $parts['title'] = 'Egyedi csapatpóló és logózott munkaruha';
  }
  return $parts;
});

add_action('wp_head', function(){
  if (!nb_teamwear_is_page()) return;
  $description = 'Egyedi csapatpóló, céges póló és logózott munkaruha online tervezéssel, több méretben és automatikus mennyiségi kedvezménnyel.';
  echo '<meta name="description" content="'.esc_attr($description).'">'."\n";
});

function nb_teamwear_discount_tiers(){
  $settings = get_option('nb_settings', []);
  $raw = isset($settings['bulk_discounts']) ? $settings['bulk_discounts'] : [];
  return nb_normalize_bulk_discount_tiers(is_array($raw) ? $raw : []);
}

function nb_teamwear_render($attributes = []){
  $attributes = wp_parse_args(is_array($attributes) ? $attributes : [], nb_teamwear_block_defaults());
  $types = function_exists('nb_home_block_types') ? nb_home_block_types() : [];
  $tiers = nb_teamwear_discount_tiers();
  $designer_url = nb_home_block_designer_url();
  $page_style = sprintf(
    '--nbtw-ink:%s;--nbtw-paper:%s;--nbtw-accent:%s;--nbtw-blue:%s;',
    nb_home_block_color($attributes['inkColor'], '#17191c'),
    nb_home_block_color($attributes['paperColor'], '#f5f2eb'),
    nb_home_block_color($attributes['accentColor'], '#f2d04f'),
    nb_home_block_color($attributes['finalColor'], '#397fc2')
  );

  ob_start();
  ?>
  <div class="nb-teamwear" style="<?php echo esc_attr($page_style); ?>">
    <section class="nb-teamwear-hero">
      <div class="nb-teamwear-wrap nb-teamwear-hero__grid">
        <div class="nb-teamwear-hero__copy">
          <p class="nb-teamwear-kicker">EGYEDI CSAPATPÓLÓ ÉS LOGÓZOTT MUNKARUHA</p>
          <h1>Öltöztesd egységbe a csapatod.</h1>
          <p class="nb-teamwear-lead">Sportcsapat, vállalkozás, rendezvény vagy baráti társaság? Készíts közös megjelenést saját logóval, grafikával vagy felirattal — egyszerűen, több méretben és kedvezőbb darabáron.</p>
          <div class="nb-teamwear-actions">
            <a class="nb-teamwear-button nb-teamwear-button--primary" href="<?php echo esc_url($designer_url); ?>">Tervezés indítása <span aria-hidden="true">→</span></a>
            <a class="nb-teamwear-button nb-teamwear-button--ghost" href="#kedvezmenyek">Kedvezményszintek</a>
          </div>
        </div>
        <div class="nb-teamwear-hero__visual" aria-label="Egyedi csapatruházat illusztráció">
          <?php if ($attributes['heroMascotUrl']): ?>
            <img class="nb-teamwear-mascot nb-teamwear-mascot--hero" src="<?php echo esc_url($attributes['heroMascotUrl']); ?>" alt="<?php echo esc_attr($attributes['heroMascotAlt']); ?>">
          <?php else: ?>
            <div class="nb-teamwear-shirt nb-teamwear-shirt--back"><span>CSAPAT</span></div>
            <div class="nb-teamwear-shirt nb-teamwear-shirt--front"><span>01</span></div>
          <?php endif; ?>
          <div class="nb-teamwear-saving"><strong>Minél több,</strong><span>annál kedvezőbb.</span></div>
        </div>
      </div>
    </section>

    <section class="nb-teamwear-proof">
      <div class="nb-teamwear-wrap nb-teamwear-proof__grid">
        <div><strong>Több méret</strong><span>egy rendelésben</span></div>
        <div><strong>Online látványterv</strong><span>már tervezés közben</span></div>
        <div><strong>Automatikus kedvezmény</strong><span>a teljes darabszám alapján</span></div>
      </div>
    </section>

    <section class="nb-teamwear-section nb-teamwear-for">
      <div class="nb-teamwear-wrap">
        <header class="nb-teamwear-heading">
          <p class="nb-teamwear-kicker">KÖZÖS MEGJELENÉS, SAJÁT STÍLUS</p>
          <h2>Csapatra szabva</h2>
          <p>Ugyanaz a terv több méretben és darabszámban — pontosan úgy összeállítva, ahogy a csapatodnak szüksége van rá.</p>
        </header>
        <div class="nb-teamwear-audiences">
          <article><span>01</span><h3>Cégek és munkatársak</h3><p>Logózott póló és munkaruha az egységes, professzionális megjelenéshez.</p></article>
          <article><span>02</span><h3>Sportcsapatok és egyesületek</h3><p>Csapatnévvel, emblémával vagy egyedi felirattal készülő közös ruházat.</p></article>
          <article><span>03</span><h3>Rendezvények és közösségek</h3><p>Felismerhető, összetartó megjelenés eseményre, táborba vagy közös programra.</p></article>
        </div>
      </div>
    </section>

    <section class="nb-teamwear-section nb-teamwear-discounts" id="kedvezmenyek">
      <div class="nb-teamwear-wrap nb-teamwear-discounts__grid">
        <header class="nb-teamwear-heading">
          <p class="nb-teamwear-kicker">MENNYISÉGI KEDVEZMÉNY</p>
          <h2>A darabszámmal együtt nő a kedvezményed.</h2>
          <p>A kedvezményt a rendszer a rendelés teljes mennyisége alapján automatikusan számolja. A különböző méretek darabszámai összeadódnak.</p>
          <?php if ($attributes['discountMascotUrl']): ?>
            <img class="nb-teamwear-mascot nb-teamwear-mascot--discount" src="<?php echo esc_url($attributes['discountMascotUrl']); ?>" alt="<?php echo esc_attr($attributes['discountMascotAlt']); ?>">
          <?php endif; ?>
        </header>
        <div class="nb-teamwear-tier-list">
          <?php if ($tiers): ?>
            <?php $last_index = count($tiers) - 1; foreach ($tiers as $index => $tier): ?>
              <div class="nb-teamwear-tier<?php echo $index === $last_index ? ' is-best' : ''; ?>">
                <div>
                  <strong><?php echo esc_html($tier['max_qty'] > 0 ? $tier['min_qty'].'–'.$tier['max_qty'].' db' : $tier['min_qty'].' db-tól'); ?></strong>
                  <span><?php echo $index === $last_index ? 'Legnagyobb kedvezmény' : 'Automatikusan érvényesül'; ?></span>
                </div>
                <b>−<?php echo esc_html(number_format_i18n($tier['percent'], ($tier['percent'] == intval($tier['percent']) ? 0 : 1))); ?>%</b>
              </div>
            <?php endforeach; ?>
          <?php else: ?>
            <div class="nb-teamwear-tier nb-teamwear-tier--empty">
              <div><strong>Egyedi mennyiségi ár</strong><span>A pontos kedvezmény a darabszám megadásakor jelenik meg.</span></div>
            </div>
          <?php endif; ?>
        </div>
      </div>
    </section>

    <?php if ($types): ?>
      <section class="nb-teamwear-section nb-teamwear-types">
        <div class="nb-teamwear-wrap">
          <header class="nb-teamwear-heading">
            <p class="nb-teamwear-kicker">TERVEZHETŐ TERMÉKTÍPUSOK</p>
            <h2>Válaszd ki, mire kerüljön a közös minta</h2>
          </header>
          <div class="nb-teamwear-type-grid">
            <?php foreach ($types as $type): ?>
              <a class="nb-teamwear-type" href="<?php echo esc_url(nb_home_block_designer_url($type['productId'], $type['label'])); ?>">
                <span class="nb-teamwear-type__image">
                  <?php if ($type['image']): ?>
                    <img src="<?php echo esc_url($type['image']); ?>" alt="<?php echo esc_attr($type['label']); ?>" loading="lazy">
                  <?php else: ?>
                    <svg viewBox="0 0 160 160" aria-hidden="true"><path d="M55 28c5 8 13 12 25 12s20-4 25-12l34 18-14 31-18-8v63H53V69l-18 8-14-31 34-18Z" fill="currentColor"/></svg>
                  <?php endif; ?>
                </span>
                <span class="nb-teamwear-type__body"><strong><?php echo esc_html($type['label']); ?></strong><small>Tervezd meg →</small></span>
              </a>
            <?php endforeach; ?>
          </div>
        </div>
      </section>
    <?php endif; ?>

    <section class="nb-teamwear-section nb-teamwear-steps">
      <div class="nb-teamwear-wrap">
        <header class="nb-teamwear-heading">
          <p class="nb-teamwear-kicker">EGYSZERŰ FOLYAMAT</p>
          <h2>A tervtől a kész csapatruháig</h2>
        </header>
        <ol>
          <li><span>1</span><div><h3>Válassz terméktípust</h3><p>Indulj a csapatodhoz illő pólóval, pulóverrel vagy munkaruhával.</p></div></li>
          <li><span>2</span><div><h3>Készítsd el a mintát</h3><p>Tölts fel logót vagy grafikát, adj hozzá szöveget, és ellenőrizd a látványt.</p></div></li>
          <li><span>3</span><div><h3>Add meg a méreteket</h3><p>Állítsd össze a csapat méret- és darabszámigényét egy rendelésben.</p></div></li>
          <li><span>4</span><div><h3>Rendeld meg kedvezménnyel</h3><p>A rendszer automatikusan a teljes mennyiséghez tartozó kedvezményt számolja.</p></div></li>
        </ol>
      </div>
    </section>

    <section class="nb-teamwear-final">
      <?php if ($attributes['finalMascotUrl']): ?>
        <img class="nb-teamwear-mascot nb-teamwear-mascot--final" src="<?php echo esc_url($attributes['finalMascotUrl']); ?>" alt="<?php echo esc_attr($attributes['finalMascotAlt']); ?>">
      <?php endif; ?>
      <div class="nb-teamwear-wrap">
        <p class="nb-teamwear-kicker">INDULHAT A KÖZÖS TERV?</p>
        <h2>Készíts olyan csapatruhát, amit jó érzés együtt viselni.</h2>
        <a class="nb-teamwear-button nb-teamwear-button--light" href="<?php echo esc_url($designer_url); ?>">Csapatruha tervezése <span aria-hidden="true">→</span></a>
      </div>
    </section>
  </div>
  <?php
  return ob_get_clean();
}
add_shortcode('nb_teamwear', 'nb_teamwear_render');
