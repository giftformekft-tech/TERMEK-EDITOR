<?php
if ( ! defined('ABSPATH') ) exit;

/**
 * A nyilvános /save végpont védelmei: PNG-ellenőrzés, méretkorlát, gyakoriságkorlát
 * és az árazási kontextus szerveroldali ellenőrzése.
 */

if ( ! function_exists('nb_design_upload_limits') ) {
  function nb_design_upload_limits(){
    return apply_filters('nb_designer_upload_limits', [
      'preview_bytes' => 10 * MB_IN_BYTES,
      'print_bytes'   => 25 * MB_IN_BYTES,
      'layers_bytes'  => 5 * MB_IN_BYTES,
      'max_px'        => 12000,
    ]);
  }
}

if ( ! function_exists('nb_decode_png_data_url') ) {
  /**
   * Egy "data:image/png;base64,..." értéket dekódol és ellenőriz.
   * Visszatérés: a bináris PNG, vagy WP_Error.
   */
  function nb_decode_png_data_url($value, $max_bytes, $error_code = 'bad_png', $label = 'PNG'){
    $prefix = 'data:image/png;base64,';
    if (!is_string($value) || strpos($value, $prefix) !== 0) {
      return new WP_Error($error_code, 'Hibás '.$label.' adat', ['status'=>400]);
    }
    $encoded = substr($value, strlen($prefix));
    // A dekódolás előtt kiszűrjük a túl nagy bemenetet, hogy ne foglaljunk feleslegesen memóriát.
    if (strlen($encoded) > (int)ceil($max_bytes * 4 / 3) + 4) {
      return new WP_Error($error_code, 'A(z) '.$label.' fájl túl nagy', ['status'=>413]);
    }
    $data = base64_decode($encoded, true);
    if ($data === false || $data === '') {
      return new WP_Error($error_code, 'Hibás '.$label.' adat', ['status'=>400]);
    }
    if (strlen($data) > $max_bytes) {
      return new WP_Error($error_code, 'A(z) '.$label.' fájl túl nagy', ['status'=>413]);
    }
    if (strncmp($data, "\x89PNG\r\n\x1a\n", 8) !== 0) {
      return new WP_Error($error_code, 'A(z) '.$label.' nem érvényes PNG kép', ['status'=>400]);
    }
    $info = function_exists('getimagesizefromstring') ? @getimagesizefromstring($data) : false;
    $limits = nb_design_upload_limits();
    $max_px = max(1, intval($limits['max_px'] ?? 12000));
    if (!$info || intval($info[2] ?? 0) !== IMAGETYPE_PNG) {
      return new WP_Error($error_code, 'A(z) '.$label.' nem érvényes PNG kép', ['status'=>400]);
    }
    if ($info[0] < 1 || $info[1] < 1 || $info[0] > $max_px || $info[1] > $max_px) {
      return new WP_Error($error_code, 'A(z) '.$label.' képméret nem megengedett', ['status'=>400]);
    }
    return $data;
  }
}

if ( ! function_exists('nb_client_rate_key') ) {
  function nb_client_rate_key($action){
    $user_id = get_current_user_id();
    if ($user_id) {
      $who = 'u'.$user_id;
    } else {
      $ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
      $who = 'ip'.$ip;
    }
    return 'nb_rl_'.sanitize_key($action).'_'.md5($who);
  }
}

if ( ! function_exists('nb_check_rate_limit') ) {
  /**
   * Egyszerű, tranziens alapú gyakoriságkorlát. Ha a korlát elfogyott, WP_Error-t ad.
   */
  function nb_check_rate_limit($action, $max, $window){
    $max = intval($max);
    $window = max(1, intval($window));
    if ($max <= 0) return true;
    $key = nb_client_rate_key($action);
    $now = time();
    $bucket = get_transient($key);
    if (!is_array($bucket) || !isset($bucket['start'], $bucket['count']) || ($now - intval($bucket['start'])) >= $window) {
      $bucket = ['start'=>$now, 'count'=>0];
    }
    if (intval($bucket['count']) >= $max) {
      $retry = max(1, $window - ($now - intval($bucket['start'])));
      return new WP_Error('rate_limited', 'Túl sok mentés rövid idő alatt. Kérjük, próbáld újra néhány perc múlva.', ['status'=>429, 'retry_after'=>$retry]);
    }
    $bucket['count'] = intval($bucket['count']) + 1;
    set_transient($key, $bucket, $window);
    return true;
  }
}

if ( ! function_exists('nb_validate_design_price_ctx') ) {
  /**
   * A kliens által küldött árazási kontextust a szerver konfigurációjához köti.
   * A termék azonosítója mindig a terv termékéből jön, a típus|szín párosnak
   * pedig léteznie kell a katalógusban.
   */
  function nb_validate_design_price_ctx($price_ctx, $product_id, $settings){
    $price_ctx = is_array($price_ctx) ? $price_ctx : [];
    $product_id = intval($product_id);
    $catalog = isset($settings['catalog']) && is_array($settings['catalog']) ? $settings['catalog'] : [];
    if (!$product_id || !isset($catalog[$product_id]) || !is_array($catalog[$product_id])) {
      return new WP_Error('bad_product', 'Ez a termék nem tervezhető', ['status'=>400]);
    }
    $cfg = $catalog[$product_id];
    $clean = ['product_id'=>$product_id];
    foreach (['type','color','size','type_label','color_label','size_label'] as $key) {
      if (isset($price_ctx[$key]) && is_scalar($price_ctx[$key])) {
        $clean[$key] = sanitize_text_field((string)$price_ctx[$key]);
      }
    }
    $map = isset($cfg['map']) && is_array($cfg['map']) ? $cfg['map'] : [];
    if (!empty($map)) {
      $map_key = nb_normalize_type_key($clean['type'] ?? '').'|'.nb_normalize_color_key($clean['color'] ?? '');
      if (!isset($map[$map_key])) {
        return new WP_Error('bad_variant', 'A kiválasztott típus és szín nem érhető el', ['status'=>400]);
      }
    }
    return $clean;
  }
}
