<?php
if ( ! defined('ABSPATH') ) exit;

add_action('admin_menu', function(){
  add_menu_page('Terméktervező','Terméktervező','manage_options','nb-designer','nb_admin_render','dashicons-art',58);
});

function nb_admin_render(){
  if ( ! current_user_can('manage_options') ) return;
  $tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'products';
  $settings = get_option('nb_settings',[]);
  if ($_SERVER['REQUEST_METHOD']==='POST' && check_admin_referer('nb_save','nb_nonce')){
    if ($tab==='products'){
      $settings['products'] = array_map('intval', $_POST['products'] ?? []);
      $types_csv = sanitize_text_field($_POST['types'] ?? '');
      $types = array_values(array_filter(array_map('trim', explode(',', $types_csv))));
      if (!empty($types)) $settings['types'] = $types;
      if (!isset($settings['catalog'])) $settings['catalog'] = [];
      foreach($settings['products'] as $pid){
        if (empty($settings['catalog'][$pid])){
          $settings['catalog'][$pid] = ['title'=>get_the_title($pid),'types'=>[],'colors'=>[],'sizes'=>[],'map'=>[],'size_surcharge'=>[]];
        }
      }
    } elseif ($tab==='mockups'){
      $mockups_json = stripslashes($_POST['mockups_json'] ?? '[]');
      $decoded = json_decode($mockups_json, true);
      if (is_array($decoded)) $settings['mockups'] = $decoded;
    } elseif ($tab==='fonts'){
      $settings['fonts'] = array_values(array_filter(array_map('esc_url_raw', $_POST['fonts'] ?? [])));
    } elseif ($tab==='pricing'){
      $settings['fee_per_cm2'] = isset($_POST['fee_per_cm2']) ? floatval($_POST['fee_per_cm2']) : 3;
      $settings['min_fee']     = isset($_POST['min_fee']) ? floatval($_POST['min_fee']) : 990;
    } elseif ($tab==='colors'){
      $palette_raw = $_POST['color_palette'] ?? '';
      if (is_string($palette_raw)){
        $palette_raw = sanitize_textarea_field(wp_unslash($palette_raw));
      } else {
        $palette_raw = '';
      }
      $parts = preg_split('/[\r\n,]+/', $palette_raw);
      $palette = [];
      if (is_array($parts)){
        foreach ($parts as $entry){
          $entry = trim($entry);
          if ($entry === '') continue;
          if (!in_array($entry, $palette, true)) $palette[] = $entry;
        }
      }
      $settings['color_palette'] = $palette;
      $catalog = $settings['catalog'] ?? [];
      $products = $settings['products'] ?? [];
      foreach ($products as $pid){
        if (!isset($catalog[$pid])){
          $catalog[$pid] = ['title'=>get_the_title($pid),'types'=>[],'colors'=>[],'sizes'=>[],'map'=>[],'size_surcharge'=>[]];
        }
        $selected = $_POST['product_colors'][$pid] ?? [];
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
          $normalized = $match ?? $color;
          if (!in_array($normalized, $colors, true)) $colors[] = $normalized;
        }
        $catalog[$pid]['colors'] = $colors;
        if (!isset($catalog[$pid]['map']) || !is_array($catalog[$pid]['map'])){
          $catalog[$pid]['map'] = [];
        }
        if (!empty($catalog[$pid]['map']) && !empty($colors)){
          $allowed = array_map(function($val){ return strtolower(trim($val)); }, $colors);
          $allowed = array_filter($allowed, function($val){ return $val !== ''; });
          foreach ($catalog[$pid]['map'] as $key=>$entry){
            $parts = explode('|', $key);
            $colorKey = $parts[1] ?? '';
            if ($colorKey === '') continue;
            if (!in_array($colorKey, $allowed, true)){
              unset($catalog[$pid]['map'][$key]);
            }
          }
        }
        if (empty($colors)){
          $catalog[$pid]['colors'] = [];
          if (!empty($catalog[$pid]['map']) && is_array($catalog[$pid]['map'])){
            foreach ($catalog[$pid]['map'] as $key=>$entry){
              $parts = explode('|', $key);
              if (($parts[1] ?? '') !== ''){
                unset($catalog[$pid]['map'][$key]);
              }
            }
          }
        }
      }
      $settings['catalog'] = $catalog;
    } elseif ($tab==='variants'){
      $catalog = $settings['catalog'] ?? [];
      $pids = array_map('intval', $_POST['var_pid'] ?? []);
      foreach($pids as $idx=>$pid){
        if (!isset($catalog[$pid])) $catalog[$pid]=['title'=>get_the_title($pid),'types'=>[],'colors'=>[],'sizes'=>[],'map'=>[],'size_surcharge'=>[]];
        $types_csv  = sanitize_text_field($_POST['types_'.$pid] ?? '');
        $sizes_csv  = sanitize_text_field($_POST['sizes_'.$pid] ?? '');
        $catalog[$pid]['types']  = array_values(array_filter(array_map('trim', explode(',', $types_csv))));
        $catalog[$pid]['sizes']  = array_values(array_filter(array_map('trim', explode(',', $sizes_csv))));
        // size surcharge parse "XL:300,XXL:600"
        $ss_csv = sanitize_text_field($_POST['size_surcharge_'.$pid] ?? '');
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
        $colors = $catalog[$pid]['colors'] ?? [];
        foreach ($catalog[$pid]['types'] as $type){
          foreach ($colors as $color){
            $key = strtolower($type).'|'.strtolower($color);
            $hash = md5($key);
            $catalog[$pid]['map'][$key] = [
              'mockup_index' => intval($_POST['mockup_'.$pid.'_'.$hash] ?? -1),
              'fee_per_cm2'  => $_POST['percm2_'.$pid.'_'.$hash] ?? '',
              'min_fee'      => $_POST['minfee_'.$pid.'_'.$hash] ?? '',
              'base_fee'     => $_POST['base_'.$pid.'_'.$hash] ?? '',
            ];
          }
        }
      }
      $settings['catalog'] = $catalog;
    }
    update_option('nb_settings',$settings);
    echo '<div class="updated"><p>Mentve.</p></div>';
  }
  include NB_DESIGNER_PATH.'admin/templates/admin-page.php';
}
