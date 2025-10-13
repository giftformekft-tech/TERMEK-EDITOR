<div class="wrap nb-admin">
  <h1>Terméktervező – Beállítások</h1>
  <h2 class="nav-tab-wrapper">
    <a href="?page=nb-designer&tab=products" class="nav-tab <?php echo ($tab==='products'?'nav-tab-active':''); ?>">Termékek & Típusok</a>
    <a href="?page=nb-designer&tab=variants" class="nav-tab <?php echo ($tab==='variants'?'nav-tab-active':''); ?>">Típus–Szín mapping & Ár</a>
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
          $q = new WP_Query(['post_type'=>'product','posts_per_page'=>100,'post_status'=>'publish']);
          while($q->have_posts()): $q->the_post();
            $pid = get_the_ID();
            $checked = in_array($pid, $settings['products'] ?? []) ? 'checked' : '';
            echo '<label class="nb-prod"><input type="checkbox" name="products[]" value="'.$pid.'" '.$checked.'> '.esc_html(get_the_title()).' (#'.$pid.')</label>';
          endwhile; wp_reset_postdata();
        ?>
      </div>
      <h2>Globális terméktípusok</h2>
      <p>Add meg vesszővel elválasztva (pl. <code>Póló,Pulóver,Hosszú ujjú</code>).</p>
      <input type="text" name="types" value="<?php echo esc_attr(implode(',', $settings['types'] ?? ['Póló','Pulóver'])); ?>" size="80" />

    <?php elseif ($tab==='variants'): ?>
      <h2>Típus–Szín → Mockup & Ár</h2>
      <?php
        $mockups = $settings['mockups'] ?? [];
        $catalog = $settings['catalog'] ?? [];
        $global_types = $settings['types'] ?? ['Póló','Pulóver'];
        foreach ($settings['products'] ?? [] as $pid):
          $cfg = $catalog[$pid] ?? ['types'=>$global_types,'colors'=>[],'sizes'=>[],'map'=>[],'size_surcharge'=>[]];
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
            <th>Színek (vesszővel)</th>
            <td><input type="text" name="colors_<?php echo $pid; ?>" value="<?php echo esc_attr(implode(',', $cfg['colors'] ?? [])); ?>" size="60"></td>
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
            <?php foreach(($cfg['types'] ?? $global_types) as $type): foreach(($cfg['colors'] ?? []) as $color):
              $key = strtolower($type).'|'.strtolower($color);
              $hash = md5($key);
              $map = $cfg['map'][$key] ?? ['mockup_index'=>-1,'fee_per_cm2'=>'','min_fee'=>'','base_fee'=>''];
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
            <?php endforeach; endforeach; ?>
          </tbody>
        </table>
      </div>
      <?php endforeach; ?>

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
      </table>
    <?php endif; ?>

    <p><button class="button button-primary">Mentés</button></p>
  </form>
</div>
