<?php
if ( ! defined('ABSPATH') ) exit;

function nb_sync_product_color_configuration(&$cfg, $settings){
  if (!is_array($cfg)) $cfg = [];
  $existingColors = [];
  if (isset($cfg['colors']) && is_array($cfg['colors'])){
    $existingColors = $cfg['colors'];
  }
  $existingMap = [];
  if (isset($cfg['map']) && is_array($cfg['map'])){
    $existingMap = $cfg['map'];
  }
  $typeColors = $settings['type_colors'] ?? [];
  if (!is_array($typeColors)) $typeColors = [];
  $hasTypeColorConfig = false;
  foreach ($typeColors as $list){
    if (is_array($list)){
      $hasTypeColorConfig = true;
      break;
    }
  }
  $types = $cfg['types'] ?? [];
  if (!is_array($types)) $types = [];
  $colorsByType = [];
  foreach ($types as $type){
    $key = nb_normalize_type_key($type);
    if ($key === '') continue;
    $list = $typeColors[$key] ?? [];
    if (!is_array($list)) $list = [];
    $normalizedList = [];
    foreach ($list as $color){
      $color = is_string($color) ? trim($color) : '';
      if ($color === '') continue;
      if (!in_array($color, $normalizedList, true)) $normalizedList[] = $color;
    }
    $colorsByType[$key] = $normalizedList;
  }
  $cfg['colors_by_type'] = $colorsByType;
  $union = [];
  foreach ($colorsByType as $list){
    foreach ($list as $color){
      if (!in_array($color, $union, true)) $union[] = $color;
    }
  }
  $cfg['colors'] = $union;
  if (!isset($cfg['map']) || !is_array($cfg['map'])){
    $cfg['map'] = [];
  }
  $hasAnyColor = !empty($union);
  if (!$hasAnyColor && !$hasTypeColorConfig){
    $cfg['colors'] = $existingColors;
    if (!empty($existingMap)){
      $cfg['map'] = $existingMap;
    }
    return;
  }
  $allowed = [];
  foreach ($colorsByType as $typeKey=>$list){
    $allowed[$typeKey] = [];
    foreach ($list as $color){
      $normColor = nb_normalize_color_key($color);
      if ($normColor === '') continue;
      if (!in_array($normColor, $allowed[$typeKey], true)) $allowed[$typeKey][] = $normColor;
    }
  }
  foreach ($cfg['map'] as $key=>$entry){
    $parts = explode('|', $key);
    if (count($parts) !== 2){
      unset($cfg['map'][$key]);
      continue;
    }
    $typeKey = trim($parts[0]);
    $colorKey = trim($parts[1]);
    if ($typeKey === '' || $colorKey === ''){
      unset($cfg['map'][$key]);
      continue;
    }
    if (!isset($allowed[$typeKey]) || !in_array($colorKey, $allowed[$typeKey], true)){
      unset($cfg['map'][$key]);
    }
  }
}

add_action('admin_menu', function(){
  add_menu_page('Terméktervező','Terméktervező','manage_options','nb-designer','nb_admin_render','dashicons-art',58);
  add_submenu_page('nb-designer', 'Beállítások', 'Beállítások', 'manage_options', 'nb-designer', 'nb_admin_render');
  add_submenu_page('nb-designer', 'Sablon Feltöltő', 'Sablon Feltöltő', 'manage_options', 'nb-template-uploader', 'nb_template_uploader_render');
});

function nb_admin_render(){
  if ( ! current_user_can('manage_options') ) return;
  $tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'products';
  $stored = get_option('nb_settings',[]);
  $settings = is_array($stored) ? $stored : [];
  $cleaned = nb_clean_settings_unicode($settings);
  if (wp_json_encode($cleaned) !== wp_json_encode($settings)){
    $settings = $cleaned;
    update_option('nb_settings', $settings);
  } else {
    $settings = $cleaned;
  }
  if ($_SERVER['REQUEST_METHOD']==='POST' && check_admin_referer('nb_save','nb_nonce')){
    if ($tab==='products'){
      $settings['products'] = array_map('intval', $_POST['products'] ?? []);
      $designerInputs = isset($_POST['types_designer']) ? (array)$_POST['types_designer'] : [];
      $orderInputs    = isset($_POST['types_order']) ? (array)$_POST['types_order'] : [];
      $productInputs  = isset($_POST['types_product']) ? (array)$_POST['types_product'] : [];
      $typeLabels = [];
      $typeOrderMap = [];
      $typeProductMap = [];
      $max = max(count($designerInputs), count($orderInputs), count($productInputs));
      for ($i = 0; $i < $max; $i++){
        $rawDesigner = $designerInputs[$i] ?? '';
        if (!is_scalar($rawDesigner)){
          continue;
        }
        $rawDesigner = (string)$rawDesigner;
        if (function_exists('wp_unslash')){
          $rawDesigner = wp_unslash($rawDesigner);
        }
        if (function_exists('sanitize_text_field')){
          $rawDesigner = sanitize_text_field($rawDesigner);
        }
        $designer = nb_clean_label_string($rawDesigner);
        if ($designer === ''){
          continue;
        }
        if (in_array($designer, $typeLabels, true)){
          continue;
        }
        $typeLabels[] = $designer;
        $rawOrder = $orderInputs[$i] ?? '';
        if (!is_scalar($rawOrder)){
          continue;
        }
        $rawOrder = (string)$rawOrder;
        if (function_exists('wp_unslash')){
          $rawOrder = wp_unslash($rawOrder);
        }
        if (function_exists('sanitize_text_field')){
          $rawOrder = sanitize_text_field($rawOrder);
        }
        $orderLabel = nb_clean_label_string($rawOrder);
        if ($orderLabel === ''){
          continue;
        }
        $normKey = nb_normalize_type_key($designer);
        if ($normKey !== ''){
          $typeOrderMap[$normKey] = $orderLabel;
        }
        if ($normKey !== ''){
          $rawProduct = $productInputs[$i] ?? '';
          if (is_scalar($rawProduct)){
            $productId = intval(wp_unslash($rawProduct));
            if ($productId > 0 && in_array($productId, $settings['products'], true)){
              $typeProductMap[$normKey] = $productId;
            }
          }
        }
      }
      $settings['types'] = $typeLabels;
      $settings['type_order_labels'] = $typeOrderMap;
      $settings['type_products'] = $typeProductMap;
      if (!isset($settings['catalog'])) $settings['catalog'] = [];
      foreach($settings['products'] as $pid){
        if (empty($settings['catalog'][$pid])){
          $settings['catalog'][$pid] = ['title'=>get_the_title($pid),'types'=>[],'colors'=>[],'sizes'=>[],'map'=>[],'size_surcharge'=>[]];
        }
        nb_sync_product_color_configuration($settings['catalog'][$pid], $settings);
      }
    } elseif ($tab==='mockups'){
      $mockups_json = stripslashes($_POST['mockups_json'] ?? '[]');
      $decoded = json_decode($mockups_json, true);
      if (is_array($decoded)) $settings['mockups'] = $decoded;
    } elseif ($tab==='fonts'){
      $fontInputs = isset($_POST['fonts']) ? array_map('wp_unslash', (array)$_POST['fonts']) : [];
      $settings['fonts'] = array_values(array_filter(array_map('esc_url_raw', $fontInputs)));
    } elseif ($tab==='pricing'){
      $settings['fee_per_cm2'] = isset($_POST['fee_per_cm2']) ? floatval($_POST['fee_per_cm2']) : 3;
      $settings['min_fee']     = isset($_POST['min_fee']) ? floatval($_POST['min_fee']) : 990;
      $double_fee_raw = isset($_POST['double_sided_fee']) ? floatval($_POST['double_sided_fee']) : 0;
      $settings['double_sided_fee'] = $double_fee_raw > 0 ? $double_fee_raw : 0;
      $bulkFrom = isset($_POST['bulk_from']) ? (array)$_POST['bulk_from'] : [];
      $bulkTo   = isset($_POST['bulk_to']) ? (array)$_POST['bulk_to'] : [];
      $bulkPct  = isset($_POST['bulk_discount']) ? (array)$_POST['bulk_discount'] : [];
      $rows = [];
      $maxRows = max(count($bulkFrom), count($bulkTo), count($bulkPct));
      for ($i = 0; $i < $maxRows; $i++){
        $rawFrom = isset($bulkFrom[$i]) ? $bulkFrom[$i] : '';
        $rawTo   = isset($bulkTo[$i]) ? $bulkTo[$i] : '';
        $rawPct  = isset($bulkPct[$i]) ? $bulkPct[$i] : '';
        if (function_exists('wp_unslash')){
          $rawFrom = wp_unslash($rawFrom);
          $rawTo   = wp_unslash($rawTo);
          $rawPct  = wp_unslash($rawPct);
        }
        $from = intval($rawFrom);
        $to   = intval($rawTo);
        $pct  = floatval(str_replace(',', '.', (string)$rawPct));
        if ($from <= 0 || $pct <= 0){
          continue;
        }
        $rows[] = [
          'min_qty' => $from,
          'max_qty' => ($to > 0 ? $to : 0),
          'percent' => $pct,
        ];
      }
      if (!empty($rows)){
        $settings['bulk_discounts'] = nb_normalize_bulk_discount_tiers($rows);
      } else {
        $settings['bulk_discounts'] = [];
      }
    } elseif ($tab==='colors'){
      $designerInputs = isset($_POST['color_designer']) ? (array)$_POST['color_designer'] : [];
      $orderInputs    = isset($_POST['color_order']) ? (array)$_POST['color_order'] : [];
      $palette = [];
      $colorOrderMap = [];
      $max = max(count($designerInputs), count($orderInputs));
      for ($i = 0; $i < $max; $i++){
        $rawDesigner = $designerInputs[$i] ?? '';
        if (!is_scalar($rawDesigner)){
          continue;
        }
        $rawDesigner = (string)$rawDesigner;
        if (function_exists('wp_unslash')){
          $rawDesigner = wp_unslash($rawDesigner);
        }
        if (function_exists('sanitize_text_field')){
          $rawDesigner = sanitize_text_field($rawDesigner);
        }
        $designer = nb_clean_label_string($rawDesigner);
        if ($designer === ''){
          continue;
        }
        if (in_array($designer, $palette, true)){
          continue;
        }
        $palette[] = $designer;
        $rawOrder = $orderInputs[$i] ?? '';
        if (!is_scalar($rawOrder)){
          continue;
        }
        $rawOrder = (string)$rawOrder;
        if (function_exists('wp_unslash')){
          $rawOrder = wp_unslash($rawOrder);
        }
        if (function_exists('sanitize_text_field')){
          $rawOrder = sanitize_text_field($rawOrder);
        }
        $orderLabel = nb_clean_label_string($rawOrder);
        if ($orderLabel === ''){
          continue;
        }
        $normKey = nb_normalize_color_key($designer);
        if ($normKey !== ''){
          $colorOrderMap[$normKey] = $orderLabel;
        }
      }
      $settings['color_palette'] = $palette;
      $settings['color_order_labels'] = $colorOrderMap;
      $typeInputs = $_POST['type_colors'] ?? [];
      if (!is_array($typeInputs)) $typeInputs = [];
      $globalTypes = $settings['types'] ?? [];
      if (!is_array($globalTypes)) $globalTypes = [];
      $typeColors = [];
      foreach ($globalTypes as $typeLabel){
        $key = nb_normalize_type_key($typeLabel);
        if ($key === '') continue;
        $selected = $typeInputs[$key] ?? [];
        if (!is_array($selected)) $selected = [];
        $colors = [];
        foreach ($selected as $color){
          $color = sanitize_text_field(wp_unslash($color));
          if ($color === '') continue;
          $match = null;
          foreach ($palette as $candidate){
            if (strcasecmp($candidate, $color) === 0){
              $match = $candidate;
              break;
            }
          }
          if ($match !== null){
            $colors[] = $match;
          }
        }
        $typeColors[$key] = $colors;
      }
      $settings['type_colors'] = $typeColors;
    } elseif ($tab==='variants'){
      $catalog = $settings['catalog'] ?? [];
      $pids = array_map('intval', $_POST['var_pid'] ?? []);
      foreach($pids as $idx=>$pid){
        if (!isset($catalog[$pid])) $catalog[$pid]=['title'=>get_the_title($pid),'types'=>[],'colors'=>[],'sizes'=>[],'map'=>[],'size_surcharge'=>[]];
        $types_input = isset($_POST['types_'.$pid]) ? wp_unslash($_POST['types_'.$pid]) : '';
        $sizes_input = isset($_POST['sizes_'.$pid]) ? wp_unslash($_POST['sizes_'.$pid]) : '';
        $types_csv  = sanitize_text_field($types_input);
        $sizes_csv  = sanitize_text_field($sizes_input);
        $catalog[$pid]['types']  = nb_clean_label_list(array_map('trim', explode(',', $types_csv)));
        $catalog[$pid]['sizes']  = nb_clean_label_list(array_map('trim', explode(',', $sizes_csv)));
        // size surcharge parse "XL:300,XXL:600"
        $ss_input = isset($_POST['size_surcharge_'.$pid]) ? wp_unslash($_POST['size_surcharge_'.$pid]) : '';
        $ss_csv = sanitize_text_field($ss_input);
        $ss = [];
        foreach (explode(',', $ss_csv) as $pair){
          $pair = trim($pair);
          if (!$pair) continue;
          $parts = explode(':', $pair);
          if (count($parts)==2){ $ss[trim($parts[0])] = floatval($parts[1]); }
        }
        $catalog[$pid]['size_surcharge'] = $ss;
        // Map for type|color
        $catalog[$pid]['map'] = $catalog[$pid]['map'] ?? [];
        nb_sync_product_color_configuration($catalog[$pid], $settings);
        $colorsByType = $catalog[$pid]['colors_by_type'] ?? [];
        foreach ($catalog[$pid]['types'] as $type){
          $typeKey = nb_normalize_type_key($type);
          if ($typeKey === '') continue;
          $colorList = $colorsByType[$typeKey] ?? [];
          foreach ($colorList as $color){
            $colorKey = nb_normalize_color_key($color);
            if ($colorKey === '') continue;
            $key = $typeKey.'|'.$colorKey;
            $hash = md5($key);
            $catalog[$pid]['map'][$key] = [
              'mockup_index' => intval($_POST['mockup_'.$pid.'_'.$hash] ?? -1),
              'mockup_back_index' => intval($_POST['mockup_back_'.$pid.'_'.$hash] ?? -1),
              'fee_per_cm2'  => $_POST['percm2_'.$pid.'_'.$hash] ?? '',
              'min_fee'      => $_POST['minfee_'.$pid.'_'.$hash] ?? '',
              'base_fee'     => $_POST['base_'.$pid.'_'.$hash] ?? '',
            ];
          }
        }
      }
      $settings['catalog'] = $catalog;
    }
    $settings = nb_clean_settings_unicode($settings);
    if (isset($settings['catalog']) && is_array($settings['catalog'])){
      foreach ($settings['catalog'] as &$catalogCfg){
        nb_sync_product_color_configuration($catalogCfg, $settings);
      }
      unset($catalogCfg);
    }
    update_option('nb_settings',$settings);
    echo '<div class="updated"><p>Mentve.</p></div>';
  }
  include NB_DESIGNER_PATH.'admin/templates/admin-page.php';
}

function nb_template_uploader_render(){
  if (!current_user_can('manage_options')) return;
  
  $message = '';
  $error = '';
  
  // Handle upload
  if (isset($_POST['nb_upload_templates']) && check_admin_referer('nb_template_upload', 'nb_upload_nonce')){
    $category_id = isset($_POST['template_category']) ? intval($_POST['template_category']) : 0;
    
    if (!empty($_FILES['template_images']['name'][0])){
      require_once(ABSPATH . 'wp-admin/includes/image.php');
      require_once(ABSPATH . 'wp-admin/includes/file.php');
      require_once(ABSPATH . 'wp-admin/includes/media.php');
      
      $files = $_FILES['template_images'];
      $uploaded_count = 0;
      $failed_count = 0;
      
      foreach ($files['name'] as $key => $value){
        if ($files['error'][$key] === 0){
          $file = array(
            'name'     => $files['name'][$key],
            'type'     => $files['type'][$key],
            'tmp_name' => $files['tmp_name'][$key],
            'error'    => $files['error'][$key],
            'size'     => $files['size'][$key]
          );
          
          // Upload to WordPress media library
          $upload_overrides = array('test_form' => false);
          $uploaded_file = wp_handle_upload($file, $upload_overrides);
          
          if (isset($uploaded_file['file'])){
            // Get image dimensions
            $image_info = getimagesize($uploaded_file['file']);
            $width = $image_info ? $image_info[0] : 800;
            $height = $image_info ? $image_info[1] : 600;
            
            // Create layers_json with a single image object (matching Fabric.js Image format)
            $layers = array(
              array(
                'type' => 'image',
                'version' => '5.0.0',
                'originX' => 'left',
                'originY' => 'top',
                'left' => 100,
                'top' => 100,
                'width' => $width,
                'height' => $height,
                'scaleX' => 1,
                'scaleY' => 1,
                'angle' => 0,
                'src' => $uploaded_file['url'],
                'crossOrigin' => 'anonymous',
                'selectable' => true,
                'evented' => true,
                'cornerStyle' => 'circle',
                'transparentCorners' => false,
                'lockScalingFlip' => true
              )
            );
            
            // Create template post
            $template_id = wp_insert_post(array(
              'post_type' => 'nb_template',
              'post_title' => sanitize_text_field($files['name'][$key]),
              'post_status' => 'publish',
              'meta_input' => array(
                'preview_url' => esc_url_raw($uploaded_file['url']),
                'layers_json' => wp_json_encode($layers),
                'width_mm' => 200,
                'height_mm' => 150,
                'dpi' => 300
              )
            ));
            
            if (!is_wp_error($template_id) && $category_id > 0){
              wp_set_object_terms($template_id, $category_id, 'nb_template_cat');
              $uploaded_count++;
            } elseif (is_wp_error($template_id)){
              $failed_count++;
            } else {
              $uploaded_count++;
            }
          } else {
            $failed_count++;
          }
        }
      }
      
      if ($uploaded_count > 0){
        $message = sprintf('%d sablon sikeresen létrehozva.', $uploaded_count);
      }
      if ($failed_count > 0){
        $error = sprintf('%d fájl feltöltése sikertelen.', $failed_count);
      }
    } else {
      $error = 'Kérlek válassz ki legalább egy képet.';
    }
  }
  
  // Get categories
  $categories = get_terms(array(
    'taxonomy' => 'nb_template_cat',
    'hide_empty' => false
  ));
  
  ?>
  <div class="wrap">
    <h1>Sablon Feltöltő</h1>
    
    <?php if ($message): ?>
      <div class="notice notice-success is-dismissible"><p><?php echo esc_html($message); ?></p></div>
    <?php endif; ?>
    
    <?php if ($error): ?>
      <div class="notice notice-error is-dismissible"><p><?php echo esc_html($error); ?></p></div>
    <?php endif; ?>
    
    <div class="card" style="max-width: 800px;">
      <h2>Képek feltöltése sablonként</h2>
      <form method="post" enctype="multipart/form-data">
        <?php wp_nonce_field('nb_template_upload', 'nb_upload_nonce'); ?>
        
        <table class="form-table">
          <tr>
            <th scope="row"><label for="template_images">Képek kiválasztása</label></th>
            <td>
              <input type="file" name="template_images[]" id="template_images" multiple accept="image/*" required>
              <p class="description">Több kép is kiválasztható. Támogatott formátumok: JPG, PNG, GIF, WebP</p>
            </td>
          </tr>
          <tr>
            <th scope="row"><label for="template_category">Kategória</label></th>
            <td>
              <select name="template_category" id="template_category">
                <option value="0">-- Nincs kategória --</option>
                <?php foreach ($categories as $cat): ?>
                  <option value="<?php echo esc_attr($cat->term_id); ?>">
                    <?php echo esc_html($cat->name); ?> (<?php echo $cat->count; ?>)
                  </option>
                <?php endforeach; ?>
              </select>
              <p class="description">A feltöltött sablonok ebbe a kategóriába kerülnek.</p>
            </td>
          </tr>
        </table>
        
        <p class="submit">
          <button type="submit" name="nb_upload_templates" class="button button-primary">Sablonok létrehozása</button>
        </p>
      </form>
    </div>
    
    <div class="card" style="max-width: 800px; margin-top: 20px;">
      <h2>Hogyan működik?</h2>
      <ol>
        <li>Válaszd ki a feltölteni kívánt képeket (többet is egyszerre)</li>
        <li>Opcionálisan válassz kategóriát</li>
        <li>Kattints a "Sablonok létrehozása" gombra</li>
        <li>A képek automatikusan sablonokká alakulnak</li>
        <li>A frontenden a felhasználók kiválaszthatják és betölthetik őket a tervezőbe</li>
      </ol>
      <p><strong>Tipp:</strong> A kategóriákat a <a href="edit-tags.php?taxonomy=nb_template_cat&post_type=nb_template">Sablon Kategóriák</a> menüpontban tudod kezelni.</p>
    </div>
  </div>
  <?php
}

