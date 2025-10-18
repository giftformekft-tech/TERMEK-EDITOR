<div class="wrap nb-admin">
  <h1>Terméktervező – Beállítások</h1>
  <h2 class="nav-tab-wrapper">
    <a href="?page=nb-designer&tab=products" class="nav-tab <?php echo ($tab==='products'?'nav-tab-active':''); ?>">Termékek & Típusok</a>
    <a href="?page=nb-designer&tab=variants" class="nav-tab <?php echo ($tab==='variants'?'nav-tab-active':''); ?>">Típus–Szín mapping & Ár</a>
    <a href="?page=nb-designer&tab=colors" class="nav-tab <?php echo ($tab==='colors'?'nav-tab-active':''); ?>">Színek</a>
    <a href="?page=nb-designer&tab=mockups" class="nav-tab <?php echo ($tab==='mockups'?'nav-tab-active':''); ?>">Mockupok & Print-area</a>
    <a href="?page=nb-designer&tab=fonts" class="nav-tab <?php echo ($tab==='fonts'?'nav-tab-active':''); ?>">Fontok</a>
    <a href="?page=nb-designer&tab=pricing" class="nav-tab <?php echo ($tab==='pricing'?'nav-tab-active':''); ?>">Globális árak</a>
  </h2>

  <form method="post">
    <?php wp_nonce_field('nb_save','nb_nonce'); ?>

    <?php if ($tab==='products'): ?>
      <h2>Tervezhető termékek</h2>
      <div class="nb-products">
        <?php
          $product_query = new WP_Query([
            'post_type'      => 'product',
            'posts_per_page' => 200,
            'post_status'    => 'publish',
            'orderby'        => 'title',
            'order'          => 'ASC',
          ]);
          $product_options = [];
          while($product_query->have_posts()): $product_query->the_post();
            $pid = get_the_ID();
            $title = get_the_title();
            $product_options[$pid] = $title;
            $checked = in_array($pid, $settings['products'] ?? []) ? 'checked' : '';
            echo '<label class="nb-prod"><input type="checkbox" name="products[]" value="'.$pid.'" '.$checked.'> '.esc_html($title).' (#'.$pid.')</label>';
          endwhile;
          wp_reset_postdata();
        ?>
      </div>
      <h2>Globális terméktípusok</h2>
      <p>Add meg külön a tervezőben látható és a rendelésben megjelenő elnevezést, valamint válassz alap WooCommerce terméket az árakhoz.</p>
      <?php
        $globalTypeOrderMap = isset($settings['type_order_labels']) && is_array($settings['type_order_labels']) ? $settings['type_order_labels'] : [];
        $globalTypeProductMap = isset($settings['type_products']) && is_array($settings['type_products']) ? $settings['type_products'] : [];
        $globalTypeRows = $settings['types'] ?? [];
        if (!is_array($globalTypeRows)) {
          $globalTypeRows = [];
        }
        if (empty($globalTypeRows)) {
          $globalTypeRows = ['Póló','Pulóver'];
        }
        $typeRowCount = max(count($globalTypeRows) + 1, 3);
        $selectedProductIds = isset($settings['products']) && is_array($settings['products']) ? array_map('intval', $settings['products']) : [];
      ?>
      <table class="widefat nb-label-table">
        <thead>
          <tr>
            <th>Tervezőben megjelenő név</th>
            <th>Rendelésben megjelenő név</th>
            <th>WooCommerce termék</th>
          </tr>
        </thead>
        <tbody>
          <?php for ($i = 0; $i < $typeRowCount; $i++):
            $designer = $globalTypeRows[$i] ?? '';
            $order = '';
            $productChoice = '';
            if ($designer !== ''){
              $typeKey = nb_normalize_type_key($designer);
              if ($typeKey && !empty($globalTypeOrderMap[$typeKey])){
                $order = $globalTypeOrderMap[$typeKey];
              }
              if ($typeKey && !empty($globalTypeProductMap[$typeKey])){
                $productChoice = intval($globalTypeProductMap[$typeKey]);
              }
            }
          ?>
          <tr>
            <td><input type="text" name="types_designer[]" value="<?php echo esc_attr($designer); ?>" placeholder="Póló" /></td>
            <td><input type="text" name="types_order[]" value="<?php echo esc_attr($order); ?>" placeholder="polo" /></td>
            <td>
              <select name="types_product[]">
                <option value="">— nincs kiválasztva —</option>
                <?php
                  foreach ($product_options as $pid => $title){
                    $isActive = in_array($pid, $selectedProductIds, true);
                    $labelText = esc_html($title);
                    if (!empty($selectedProductIds) && ! $isActive){
                      $labelText .= ' – nincs kijelölve';
                    }
                    printf(
                      '<option value="%1$d" %3$s>%2$s (#%1$d)</option>',
                      $pid,
                      $labelText,
                      selected($productChoice, $pid, false)
                    );
                  }
                ?>
              </select>
            </td>
          </tr>
          <?php endfor; ?>
        </tbody>
      </table>
      <p class="description">Hagyd üresen a sort a típus törléséhez vagy új sorban add hozzá az újat.</p>

    <?php elseif ($tab==='variants'): ?>
      <h2>Típus–Szín → Mockup & Ár</h2>
      <?php
        $mockups = $settings['mockups'] ?? [];
        $catalog = $settings['catalog'] ?? [];
        $global_types = $settings['types'] ?? ['Póló','Pulóver'];
        foreach ($settings['products'] ?? [] as $pid):
          $cfg = $catalog[$pid] ?? ['types'=>$global_types,'colors'=>[],'sizes'=>[],'map'=>[],'size_surcharge'=>[]];
          nb_sync_product_color_configuration($cfg, $settings);
          $typeColorMap = $cfg['colors_by_type'] ?? [];
          $colorSummary = [];
          if (!empty($cfg['types'])){
            foreach ($cfg['types'] as $typeLabel){
              $typeKey = nb_normalize_type_key($typeLabel);
              $colors = $typeColorMap[$typeKey] ?? [];
              if (empty($colors)) continue;
              $colorSummary[] = $typeLabel.': '.implode(', ', $colors);
            }
          }
          if (empty($colorSummary) && !empty($cfg['colors'])){
            $colorSummary[] = implode(', ', $cfg['colors']);
          }
      ?>
      <div class="nb-var-card">
        <h3><?php echo esc_html(get_the_title($pid)); ?> (#<?php echo $pid; ?>)</h3>
        <input type="hidden" name="var_pid[]" value="<?php echo $pid; ?>">
        <table class="form-table">
          <tr>
            <th>Típusok (vesszővel)</th>
            <td><input type="text" name="types_<?php echo $pid; ?>" value="<?php echo esc_attr(implode(',', $cfg['types'] ?? $global_types)); ?>" size="60"></td>
          </tr>
          <tr>
            <th>Színek</th>
            <td>
              <?php if (!empty($colorSummary)): ?>
                <span><?php echo esc_html(implode(' | ', $colorSummary)); ?></span>
              <?php else: ?>
                <em>Nincs a típusokhoz szín rendelve. Állítsd be a <a href="?page=nb-designer&amp;tab=colors">Színek</a> fülön.</em>
              <?php endif; ?>
            </td>
          </tr>
          <tr>
            <th>Méretek (vesszővel)</th>
            <td><input type="text" name="sizes_<?php echo $pid; ?>" value="<?php echo esc_attr(implode(',', $cfg['sizes'] ?? [])); ?>" size="60"></td>
          </tr>
          <tr>
            <th>Méret felárak</th>
            <td><input type="text" name="size_surcharge_<?php echo $pid; ?>" value="<?php
              $pairs=[]; foreach(($cfg['size_surcharge'] ?? []) as $k=>$v){ $pairs[] = $k.':'.$v; } echo esc_attr(implode(',', $pairs));
            ?>" size="60"> <span class="description">pl. XL:300,XXL:600</span></td>
          </tr>
        </table>
        <h4>Mapping (Típus × Szín)</h4>
        <table class="widefat">
          <thead><tr><th>Típus</th><th>Szín</th><th>Mockup</th><th>Ft/cm²</th><th>Min. felár</th><th>Alap felár</th></tr></thead>
          <tbody>
            <?php
              $typeColors = $cfg['colors_by_type'] ?? [];
              $renderedRows = 0;
              foreach (($cfg['types'] ?? $global_types) as $type):
                $typeKey = nb_normalize_type_key($type);
                $colorList = $typeColors[$typeKey] ?? [];
                if (empty($colorList)){
                  echo '<tr><td>'.esc_html($type).'</td><td colspan="5"><em>Nincs szín beállítva ehhez a típushoz. Állítsd be a Színek fülön.</em></td></tr>';
                  continue;
                }
                foreach ($colorList as $color):
                  $colorKey = nb_normalize_color_key($color);
                  if ($colorKey === '') continue;
                  $key = $typeKey.'|'.$colorKey;
                  $hash = md5($key);
                  $map = $cfg['map'][$key] ?? ['mockup_index'=>-1,'fee_per_cm2'=>'','min_fee'=>'','base_fee'=>''];
                  $renderedRows++;
            ?>
              <tr>
                <td><?php echo esc_html($type); ?></td>
                <td><?php echo esc_html($color); ?></td>
                <td>
                  <select name="mockup_<?php echo $pid; ?>_<?php echo esc_attr($hash); ?>">
                    <option value="-1">— nincs —</option>
                    <?php foreach($mockups as $i=>$m): ?>
                      <option value="<?php echo $i; ?>" <?php selected(intval($map['mockup_index']),$i); ?>><?php echo esc_html($m['label'] ?? ('Mockup #'.$i)); ?></option>
                    <?php endforeach; ?>
                  </select>
                </td>
                <td><input type="number" step="0.1" name="percm2_<?php echo $pid; ?>_<?php echo esc_attr($hash); ?>" value="<?php echo esc_attr($map['fee_per_cm2']); ?>" /></td>
                <td><input type="number" step="1"   name="minfee_<?php echo $pid; ?>_<?php echo esc_attr($hash); ?>" value="<?php echo esc_attr($map['min_fee']); ?>" /></td>
                <td><input type="number" step="1"   name="base_<?php echo $pid; ?>_<?php echo esc_attr($hash); ?>" value="<?php echo esc_attr($map['base_fee']); ?>" /></td>
              </tr>
            <?php endforeach; endforeach; if (!$renderedRows): ?>
              <tr><td colspan="6"><em>Nincs olyan típus–szín kombináció, amelyhez mockupot vagy árat állíthatnál be. Adj hozzá színeket a Színek fülön.</em></td></tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
      <?php endforeach; ?>

    <?php elseif ($tab==='colors'): ?>
      <?php
        $catalog = $settings['catalog'] ?? [];
        $products = $settings['products'] ?? [];
        $savedPalette = $settings['color_palette'] ?? [];
        if (!is_array($savedPalette)) $savedPalette = [];
        if (empty($savedPalette)){
          foreach ($catalog as $cfg){
            if (empty($cfg['colors']) || !is_array($cfg['colors'])) continue;
            foreach ($cfg['colors'] as $color){
              $color = trim($color);
              if ($color === '') continue;
              if (!in_array($color, $savedPalette, true)) $savedPalette[] = $color;
            }
          }
        }
        $colorOrderMap = isset($settings['color_order_labels']) && is_array($settings['color_order_labels']) ? $settings['color_order_labels'] : [];
        $paletteRows = $savedPalette;
        $paletteRowCount = max(count($paletteRows) + 2, 4);
        $typeColors = $settings['type_colors'] ?? [];
        if (!is_array($typeColors)) $typeColors = [];
        $globalTypes = $settings['types'] ?? [];
        if (!is_array($globalTypes)) $globalTypes = [];
      ?>
      <h2>Szín elérhetőség</h2>
      <p>Add meg a színek tervezőben és rendelésben használt nevét. Hagyd üresen a sort a törléshez.</p>
      <table class="widefat nb-label-table">
        <thead>
          <tr>
            <th>Tervezőben megjelenő név</th>
            <th>Rendelésben megjelenő név</th>
          </tr>
        </thead>
        <tbody>
          <?php for ($i = 0; $i < $paletteRowCount; $i++):
            $designer = $paletteRows[$i] ?? '';
            $order = '';
            if ($designer !== ''){
              $colorKey = nb_normalize_color_key($designer);
              if ($colorKey && !empty($colorOrderMap[$colorKey])){
                $order = $colorOrderMap[$colorKey];
              }
            }
          ?>
          <tr>
            <td><input type="text" name="color_designer[]" value="<?php echo esc_attr($designer); ?>" placeholder="Fekete" /></td>
            <td><input type="text" name="color_order[]" value="<?php echo esc_attr($order); ?>" placeholder="fekete" /></td>
          </tr>
          <?php endfor; ?>
        </tbody>
      </table>
      <?php if (!empty($globalTypes)): ?>
        <h3>Színek típusonként</h3>
        <?php foreach ($globalTypes as $typeLabel):
          $typeKey = nb_normalize_type_key($typeLabel);
          if ($typeKey === '') continue;
          $selected = $typeColors[$typeKey] ?? [];
          if (!is_array($selected)) $selected = [];
        ?>
          <div class="nb-color-card">
            <h4><?php echo esc_html($typeLabel); ?></h4>
            <?php if (!empty($savedPalette)): ?>
              <div class="nb-color-grid">
                <?php foreach ($savedPalette as $color):
                  $value = trim($color);
                  if ($value === '') continue;
                  $id = 'type_color_'.md5($typeKey.'|'.$value);
                  $checked = in_array($value, $selected, true) ? 'checked' : '';
                ?>
                  <label for="<?php echo esc_attr($id); ?>" class="nb-color-option">
                    <input type="checkbox" id="<?php echo esc_attr($id); ?>" name="type_colors[<?php echo esc_attr($typeKey); ?>][]" value="<?php echo esc_attr($value); ?>" <?php echo $checked; ?>>
                    <span><?php echo esc_html($value); ?></span>
                  </label>
                <?php endforeach; ?>
              </div>
            <?php else: ?>
              <p class="nb-color-empty">Adj meg legalább egy színt a palettán, hogy kiválaszthasd az elérhető árnyalatokat.</p>
            <?php endif; ?>
          </div>
        <?php endforeach; ?>
      <?php else: ?>
        <p>Először vegyél fel típusokat a <a href="?page=nb-designer&amp;tab=products">Termékek &amp; Típusok</a> fülön.</p>
      <?php endif; ?>

    <?php elseif ($tab==='mockups'): ?>
      <h2>Mockupok & print-area</h2>
      <input type="hidden" id="nb-mockups-json" name="mockups_json" value="<?php echo esc_attr(json_encode($settings['mockups'] ?? [])); ?>">
      <div id="nb-mockups-app" class="nb-mockups-app"></div>
      <p><button type="button" class="button" id="nb-add-mockup">+ Mockup hozzáadása</button></p>

    <?php elseif ($tab==='fonts'): ?>
      <h2>Betűtípusok</h2>
      <div id="nb-fonts">
        <?php foreach(($settings['fonts'] ?? []) as $url): ?>
          <div class="nb-font"><input type="text" name="fonts[]" value="<?php echo esc_attr($url); ?>" size="80"> <button class="button nb-remove-font">Eltávolítás</button></div>
        <?php endforeach; ?>
      </div>
      <p><button type="button" class="button" id="nb-add-font">+ Font mező</button></p>

    <?php elseif ($tab==='pricing'): ?>
      <h2>Globális ár</h2>
      <table class="form-table">
        <tr><th>Ft / cm²</th><td><input type="number" step="0.1" name="fee_per_cm2" value="<?php echo esc_attr($settings['fee_per_cm2'] ?? 3); ?>"></td></tr>
        <tr><th>Minimum felár (Ft)</th><td><input type="number" step="1" name="min_fee" value="<?php echo esc_attr($settings['min_fee'] ?? 990); ?>"></td></tr>
        <tr><th>Kétoldalas felár (Ft)</th><td><input type="number" step="1" name="double_sided_fee" value="<?php echo esc_attr($settings['double_sided_fee'] ?? 0); ?>"></td></tr>
      </table>
      <?php
        $bulkTiers = isset($settings['bulk_discounts']) && is_array($settings['bulk_discounts']) ? $settings['bulk_discounts'] : [];
        $rowCount = max(count($bulkTiers) + 1, 3);
      ?>
      <h3>Mennyiségi kedvezmények</h3>
      <p>Add meg, hogy hány darabtól hány darabig milyen százalékos kedvezményt kapjon a több darabos vásárlás. A felső határ üresen hagyható, ha nincs maximum.</p>
      <table class="widefat nb-label-table nb-bulk-table">
        <thead>
          <tr>
            <th>Darabtól</th>
            <th>Darabig</th>
            <th>Kedvezmény (%)</th>
          </tr>
        </thead>
        <tbody>
          <?php for ($i = 0; $i < $rowCount; $i++):
            $tier = $bulkTiers[$i] ?? ['min_qty'=>'','max_qty'=>'','percent'=>''];
            $from = $tier['min_qty'] ?? '';
            $to   = $tier['max_qty'] ?? '';
            $pct  = $tier['percent'] ?? '';
            if ($to === 0) { $to = ''; }
          ?>
          <tr>
            <td><input type="number" min="1" step="1" name="bulk_from[]" value="<?php echo esc_attr($from); ?>" placeholder="5"></td>
            <td><input type="number" min="0" step="1" name="bulk_to[]" value="<?php echo esc_attr($to); ?>" placeholder="10"></td>
            <td><input type="number" min="0" step="0.1" name="bulk_discount[]" value="<?php echo esc_attr($pct); ?>" placeholder="5"></td>
          </tr>
          <?php endfor; ?>
        </tbody>
      </table>
      <p class="description">A sorok üresen hagyásával törölheted a kedvezményt. A kedvezmények a "Többet vennék" kosárba helyezéskor lépnek életbe.</p>
    <?php endif; ?>

    <p><button class="button button-primary">Mentés</button></p>
  </form>
</div>
