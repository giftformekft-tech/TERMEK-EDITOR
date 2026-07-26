<?php
if ( ! defined('ABSPATH') ) exit;

/**
 * Dynamic Gutenberg block for promoting the product designer on the homepage.
 * Cards come from the product types configured in the designer settings.
 */

function nb_home_block_types(){
  $settings = nb_get_settings([]);
  $settings = nb_sync_mockup_references(nb_clean_settings_unicode(is_array($settings) ? $settings : []));
  $types = isset($settings['types']) ? nb_clean_label_list($settings['types']) : [];
  $catalog = isset($settings['catalog']) && is_array($settings['catalog']) ? $settings['catalog'] : [];
  $type_products = isset($settings['type_products']) && is_array($settings['type_products']) ? $settings['type_products'] : [];
  $allowed_products = isset($settings['products']) && is_array($settings['products']) ? array_map('absint', $settings['products']) : [];
  $mockups = isset($settings['mockups']) && is_array($settings['mockups']) ? array_values($settings['mockups']) : [];
  $cards = [];

  foreach ($types as $type_label){
    $type_key = nb_normalize_type_key($type_label);
    if ($type_key === '') continue;

    $product_id = isset($type_products[$type_key]) ? absint($type_products[$type_key]) : 0;
    if (!$product_id || !in_array($product_id, $allowed_products, true)){
      foreach ($allowed_products as $candidate_id){
        $candidate_types = isset($catalog[$candidate_id]['types']) ? nb_clean_label_list($catalog[$candidate_id]['types']) : [];
        $candidate_keys = array_map('nb_normalize_type_key', $candidate_types);
        if (in_array($type_key, $candidate_keys, true)){
          $product_id = $candidate_id;
          break;
        }
      }
    }

    $product = function_exists('wc_get_product') ? wc_get_product($product_id) : null;
    $image_url = '';

    if ($product_id && isset($catalog[$product_id]['map']) && is_array($catalog[$product_id]['map'])){
      foreach ($catalog[$product_id]['map'] as $map_key => $mapping){
        $parts = explode('|', (string)$map_key, 2);
        if (count($parts) !== 2 || nb_normalize_type_key($parts[0]) !== $type_key) continue;
        $mockup = nb_mockup_by_reference($settings, $mapping, 'front');
        if ($mockup && !empty($mockup['image_url'])){
          $image_url = $mockup['image_url'];
          break;
        }
      }
    }

    if (!$image_url && $product && $product->exists()){
      $image_id = $product->get_image_id();
      $image_url = $image_id ? wp_get_attachment_image_url($image_id, 'medium_large') : '';
    }

    $cards[] = [
      'key' => $type_key,
      'label' => $type_label,
      'productId' => $product_id,
      'image' => $image_url ?: '',
      'price' => ($product && $product->exists()) ? wp_strip_all_tags($product->get_price_html()) : '',
    ];
  }

  return $cards;
}

function nb_home_block_designer_url($product_id = 0, $type_label = ''){
  $page = get_page_by_path('tervezd-meg');
  $url = $page ? get_permalink($page) : home_url('/tervezd-meg/');
  $args = [];
  if ($product_id) $args['nb_product'] = absint($product_id);
  if ($type_label !== '') $args['nb_type'] = $type_label;
  return $args ? add_query_arg($args, $url) : $url;
}

function nb_home_block_teamwear_url(){
  $page = get_page_by_path('csapatpolo');
  return $page ? get_permalink($page) : home_url('/csapatpolo/');
}

function nb_home_block_color($value, $fallback){
  $color = sanitize_hex_color((string)$value);
  return $color ?: $fallback;
}

function nb_home_block_number($value, $min, $max, $fallback){
  $number = is_numeric($value) ? intval($value) : intval($fallback);
  return max(intval($min), min(intval($max), $number));
}

function nb_home_block_render($attributes){
  $defaults = [
    'eyebrow' => 'ALKOSS VALAMI SAJÁTOT',
    'heading' => 'Válassz terméket, és tervezd meg',
    'intro' => 'Tölts fel képet vagy logót, adj hozzá szöveget, és nézd meg az eredményt azonnal.',
    'hiddenTypeKeys' => [],
    'maxVisibleTypes' => 0,
    'desktopColumns' => 2,
    'mobileColumns' => 1,
    'showTeamSection' => true,
    'teamEyebrow' => 'CSAPATOKNAK ÉS CÉGEKNEK',
    'teamHeading' => 'Egységes megjelenés, kedvezőbb darabár',
    'teamText' => 'Csapatpóló, logózott munkaruha vagy rendezvényruha? Tervezd meg egyszer, válaszd ki a méreteket, és rendelj mennyiségi kedvezménnyel. Minél többet rendelsz, annál többet spórolsz.',
    'teamButtonText' => 'Csapatruhát tervezek',
    'teamButtonUrl' => '',
    'inkColor' => '#171717',
    'paperColor' => '#f5f1e8',
    'accentColor' => '#f4d35e',
    'mascotId' => 0,
    'mascotUrl' => '',
    'mascotAlt' => 'Céges kabalafigura',
    'mascotPosition' => 'right',
    'mascotSize' => 360,
    'headerMascotId' => 0,
    'headerMascotUrl' => '',
    'headerMascotAlt' => 'Céges kabalafigura a terméktípusok mellett',
    'headerMascotPosition' => 'right',
    'headerMascotSize' => 230,
  ];
  $attributes = wp_parse_args(is_array($attributes) ? $attributes : [], $defaults);
  $hidden_keys = array_map('nb_normalize_type_key', (array)$attributes['hiddenTypeKeys']);
  $types = array_values(array_filter(nb_home_block_types(), function($type) use ($hidden_keys){
    return !in_array($type['key'], $hidden_keys, true);
  }));
  $team_url = $attributes['teamButtonUrl'] ?: nb_home_block_teamwear_url();
  $block_style = sprintf(
    '--nb-ink:%s;--nb-paper:%s;--nb-accent:%s;--nb-team-mascot-size:%dpx;--nb-header-mascot-size:%dpx;--nb-columns-desktop:%d;--nb-columns-mobile:%d;',
    nb_home_block_color($attributes['inkColor'], '#171717'),
    nb_home_block_color($attributes['paperColor'], '#f5f1e8'),
    nb_home_block_color($attributes['accentColor'], '#f4d35e'),
    nb_home_block_number($attributes['mascotSize'], 140, 560, 360),
    nb_home_block_number($attributes['headerMascotSize'], 100, 420, 230),
    nb_home_block_number($attributes['desktopColumns'], 1, 4, 2),
    nb_home_block_number($attributes['mobileColumns'], 1, 2, 1)
  );
  $mascot_position = $attributes['mascotPosition'] === 'left' ? 'left' : 'right';
  $header_mascot_position = $attributes['headerMascotPosition'] === 'left' ? 'left' : 'right';
  $max_visible_types = nb_home_block_number($attributes['maxVisibleTypes'], 0, 100, 0);
  if ($max_visible_types > 0) $types = array_slice($types, 0, $max_visible_types);

  ob_start();
  ?>
  <section class="nb-home-showcase alignwide" style="<?php echo esc_attr($block_style); ?>">
    <?php if (!empty($attributes['showTeamSection'])): ?>
      <div class="nb-home-team<?php echo !empty($attributes['mascotUrl']) ? ' has-mascot mascot-'.$mascot_position : ''; ?>">
        <?php if (!empty($attributes['mascotUrl'])): ?>
          <img class="nb-home-team__mascot is-<?php echo esc_attr($mascot_position); ?>" src="<?php echo esc_url($attributes['mascotUrl']); ?>" alt="<?php echo esc_attr($attributes['mascotAlt']); ?>">
        <?php endif; ?>
        <div class="nb-home-team__copy">
          <p class="nb-home-eyebrow"><?php echo wp_kses_post($attributes['teamEyebrow']); ?></p>
          <h2><?php echo wp_kses_post($attributes['teamHeading']); ?></h2>
          <p class="nb-home-team__text"><?php echo wp_kses_post($attributes['teamText']); ?></p>
          <a class="nb-home-button nb-home-button--light" href="<?php echo esc_url($team_url); ?>">
            <?php echo esc_html(wp_strip_all_tags($attributes['teamButtonText'])); ?>
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <div class="nb-home-team__benefits" aria-label="Előnyök">
          <div><strong>1 terv</strong><span>több méretre</span></div>
          <div><strong>Automatikus</strong><span>mennyiségi kedvezmény</span></div>
          <div><strong>Tartós</strong><span>csapat- és munkaruházat</span></div>
        </div>
      </div>
    <?php endif; ?>

    <header class="nb-home-showcase__header<?php echo !empty($attributes['headerMascotUrl']) ? ' has-mascot mascot-'.$header_mascot_position : ''; ?>">
      <div class="nb-home-showcase__header-copy">
        <p class="nb-home-eyebrow"><?php echo wp_kses_post($attributes['eyebrow']); ?></p>
        <h2><?php echo wp_kses_post($attributes['heading']); ?></h2>
        <p><?php echo wp_kses_post($attributes['intro']); ?></p>
      </div>
      <?php if (!empty($attributes['headerMascotUrl'])): ?>
        <img class="nb-home-showcase__header-mascot" src="<?php echo esc_url($attributes['headerMascotUrl']); ?>" alt="<?php echo esc_attr($attributes['headerMascotAlt']); ?>">
      <?php endif; ?>
    </header>

    <?php if ($types): ?>
      <div class="nb-home-products">
        <?php foreach ($types as $type): ?>
          <article class="nb-home-product">
            <a class="nb-home-product__image" href="<?php echo esc_url(nb_home_block_designer_url($type['productId'], $type['label'])); ?>" aria-label="<?php echo esc_attr($type['label'].' tervezése'); ?>">
              <?php if ($type['image']): ?>
                <img src="<?php echo esc_url($type['image']); ?>" alt="<?php echo esc_attr($type['label']); ?>" loading="lazy">
              <?php else: ?>
                <svg viewBox="0 0 160 160" role="img" aria-label="Termékkép helye"><path d="M55 28c5 8 13 12 25 12s20-4 25-12l34 18-14 31-18-8v63H53V69l-18 8-14-31 34-18Z" fill="currentColor"/></svg>
              <?php endif; ?>
            </a>
            <div class="nb-home-product__body">
              <div>
                <h3><?php echo esc_html($type['label']); ?></h3>
                <?php if ($type['price']): ?><p class="nb-home-product__price"><?php echo esc_html($type['price']); ?></p><?php endif; ?>
              </div>
              <a class="nb-home-product__link" href="<?php echo esc_url(nb_home_block_designer_url($type['productId'], $type['label'])); ?>">Tervezd meg <span aria-hidden="true">→</span></a>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    <?php else: ?>
      <p class="nb-home-showcase__empty"><?php echo esc_html__('Jelenleg nincs megjeleníthető terméktípus.', 'nano-banana-designer'); ?></p>
    <?php endif; ?>
  </section>
  <?php
  return ob_get_clean();
}

add_action('init', function(){
  $version = defined('NB_DESIGNER_VERSION') ? NB_DESIGNER_VERSION : '1.10.3';
  wp_register_style('nb-home-block', NB_DESIGNER_URL.'assets/css/home-block.css', [], $version);
  wp_register_script(
    'nb-home-block-editor',
    NB_DESIGNER_URL.'assets/js/home-block-editor.js',
    ['wp-blocks', 'wp-block-editor', 'wp-components', 'wp-element', 'wp-i18n'],
    $version,
    true
  );

  wp_localize_script('nb-home-block-editor', 'NB_HOME_BLOCK', [
    'types' => nb_home_block_types(),
  ]);

  register_block_type('nano-banana/designer-showcase', [
    'api_version' => 2,
    'editor_script' => 'nb-home-block-editor',
    'style' => 'nb-home-block',
    'editor_style' => 'nb-home-block',
    'render_callback' => 'nb_home_block_render',
    'attributes' => [
      'eyebrow' => ['type' => 'string', 'default' => 'ALKOSS VALAMI SAJÁTOT'],
      'heading' => ['type' => 'string', 'default' => 'Válassz terméket, és tervezd meg'],
      'intro' => ['type' => 'string', 'default' => 'Tölts fel képet vagy logót, adj hozzá szöveget, és nézd meg az eredményt azonnal.'],
      'hiddenTypeKeys' => ['type' => 'array', 'default' => [], 'items' => ['type' => 'string']],
      'maxVisibleTypes' => ['type' => 'number', 'default' => 0],
      'desktopColumns' => ['type' => 'number', 'default' => 2],
      'mobileColumns' => ['type' => 'number', 'default' => 1],
      'showTeamSection' => ['type' => 'boolean', 'default' => true],
      'teamEyebrow' => ['type' => 'string', 'default' => 'CSAPATOKNAK ÉS CÉGEKNEK'],
      'teamHeading' => ['type' => 'string', 'default' => 'Egységes megjelenés, kedvezőbb darabár'],
      'teamText' => ['type' => 'string', 'default' => 'Csapatpóló, logózott munkaruha vagy rendezvényruha? Tervezd meg egyszer, válaszd ki a méreteket, és rendelj mennyiségi kedvezménnyel. Minél többet rendelsz, annál többet spórolsz.'],
      'teamButtonText' => ['type' => 'string', 'default' => 'Csapatruhát tervezek'],
      'teamButtonUrl' => ['type' => 'string', 'default' => ''],
      'inkColor' => ['type' => 'string', 'default' => '#171717'],
      'paperColor' => ['type' => 'string', 'default' => '#f5f1e8'],
      'accentColor' => ['type' => 'string', 'default' => '#f4d35e'],
      'mascotId' => ['type' => 'number', 'default' => 0],
      'mascotUrl' => ['type' => 'string', 'default' => ''],
      'mascotAlt' => ['type' => 'string', 'default' => 'Céges kabalafigura'],
      'mascotPosition' => ['type' => 'string', 'default' => 'right'],
      'mascotSize' => ['type' => 'number', 'default' => 360],
      'headerMascotId' => ['type' => 'number', 'default' => 0],
      'headerMascotUrl' => ['type' => 'string', 'default' => ''],
      'headerMascotAlt' => ['type' => 'string', 'default' => 'Céges kabalafigura a terméktípusok mellett'],
      'headerMascotPosition' => ['type' => 'string', 'default' => 'right'],
      'headerMascotSize' => ['type' => 'number', 'default' => 230],
    ],
    'supports' => [
      'align' => ['wide', 'full'],
      'html' => false,
    ],
  ]);
});
