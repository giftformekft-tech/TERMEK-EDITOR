<?php
if ( ! defined('ABSPATH') ) exit;

function nb_admin_rest_permission($request){
  if (!current_user_can(nb_admin_capability())) {
    return new WP_Error('rest_forbidden', __('Nincs jogosultságod a Terméktervező kezeléséhez.', 'nb-designer'), ['status'=>403]);
  }
  $nonce = $request->get_header('X-WP-Nonce');
  if (!$nonce || !wp_verify_nonce($nonce, 'wp_rest')) {
    return new WP_Error('rest_forbidden', __('Érvénytelen biztonsági token.', 'nb-designer'), ['status'=>403]);
  }
  return true;
}

add_action('rest_api_init', function(){
  register_rest_route('nb/v1', '/admin/report', [
    'methods'=>'GET',
    'permission_callback'=>'nb_admin_rest_permission',
    'callback'=>function(){ return nb_configuration_report(); },
  ]);

  register_rest_route('nb/v1', '/admin/products', [
    'methods'=>'GET',
    'permission_callback'=>'nb_admin_rest_permission',
    'callback'=>function($request){
      $search = sanitize_text_field($request->get_param('search'));
      $query = new WP_Query([
        'post_type'=>'product', 'post_status'=>'publish', 'posts_per_page'=>20,
        's'=>$search, 'orderby'=>'title', 'order'=>'ASC', 'fields'=>'ids',
      ]);
      $items = [];
      foreach ($query->posts as $productId){
        $items[] = ['id'=>intval($productId), 'title'=>get_the_title($productId)];
      }
      return ['items'=>$items];
    },
  ]);

  register_rest_route('nb/v1', '/admin/calculate', [
    'methods'=>'POST',
    'permission_callback'=>'nb_admin_rest_permission',
    'callback'=>function($request){
      $args = $request->get_json_params();
      return nb_price_breakdown(is_array($args) ? $args : []);
    },
  ]);

  register_rest_route('nb/v1', '/admin/mockups', [
    'methods'=>'POST',
    'permission_callback'=>'nb_admin_rest_permission',
    'callback'=>function($request){
      $payload = $request->get_json_params();
      $mockups = is_array($payload) && isset($payload['mockups']) ? $payload['mockups'] : [];
      $settings = nb_get_settings([]);
      $settings = is_array($settings) ? $settings : [];
      nb_store_settings_history($settings, 'rest-mockups');
      $settings['mockups'] = nb_normalize_mockups($mockups);
      $settings = nb_sync_mockup_references($settings);
      nb_update_settings($settings);
      return ['saved'=>true, 'mockups'=>$settings['mockups'], 'report'=>nb_configuration_report($settings)];
    },
  ]);

  register_rest_route('nb/v1', '/admin/pricing', [
    'methods'=>'POST',
    'permission_callback'=>'nb_admin_rest_permission',
    'callback'=>function($request){
      $payload = $request->get_json_params();
      $payload = is_array($payload) ? $payload : [];
      $rawTiers = is_array($payload['bulk_discounts'] ?? null) ? $payload['bulk_discounts'] : [];
      $rawErrors = [];
      foreach ($rawTiers as $index=>$tier){
        if (!is_array($tier)) { $rawErrors[] = sprintf(__('A(z) %d. kedvezménysáv érvénytelen.','nb-designer'), $index + 1); continue; }
        if (intval($tier['min_qty'] ?? 0) <= 0 || intval($tier['max_qty'] ?? 0) < 0 || floatval($tier['percent'] ?? 0) <= 0 || floatval($tier['percent'] ?? 0) >= 100) {
          $rawErrors[] = sprintf(__('A(z) %d. kedvezménysáv adatai érvénytelenek.','nb-designer'), $index + 1);
        }
      }
      $tiers = nb_normalize_bulk_discount_tiers($rawTiers);
      $errors = nb_validate_bulk_discount_tiers($tiers);
      $errors = array_merge($rawErrors, $errors);
      if (floatval($payload['fee_per_cm2'] ?? 0) <= 0 || floatval($payload['min_fee'] ?? 0) < 0 || floatval($payload['double_sided_fee'] ?? 0) < 0) {
        $errors[] = __('Az árak nem lehetnek negatívak, a négyzetcentiméter-ár pedig csak pozitív lehet.','nb-designer');
      }
      if (!empty($errors)) return new WP_Error('invalid_pricing', implode(' ', $errors), ['status'=>400, 'errors'=>$errors]);
      $settings = nb_get_settings([]);
      $settings = is_array($settings) ? $settings : [];
      nb_store_settings_history($settings, 'rest-pricing');
      $settings['fee_per_cm2'] = max(0, floatval($payload['fee_per_cm2'] ?? 0));
      $settings['min_fee'] = max(0, floatval($payload['min_fee'] ?? 0));
      $settings['double_sided_fee'] = max(0, floatval($payload['double_sided_fee'] ?? 0));
      $settings['bulk_discounts'] = $tiers;
      nb_update_settings($settings);
      return ['saved'=>true, 'pricing'=>[
        'fee_per_cm2'=>$settings['fee_per_cm2'], 'min_fee'=>$settings['min_fee'],
        'double_sided_fee'=>$settings['double_sided_fee'], 'bulk_discounts'=>$tiers,
      ]];
    },
  ]);

  register_rest_route('nb/v1', '/admin/history/restore', [
    'methods'=>'POST',
    'permission_callback'=>'nb_admin_rest_permission',
    'callback'=>function($request){
      $payload = $request->get_json_params();
      $index = absint(is_array($payload) ? ($payload['index'] ?? 0) : 0);
      $history = get_option('nb_settings_history', []);
      if (!isset($history[$index]['settings']) || !is_array($history[$index]['settings'])) return new WP_Error('history_missing', __('Nincs visszaállítható előzmény.','nb-designer'), ['status'=>404]);
      $current = nb_get_settings([]);
      $restored = nb_sync_mockup_references($history[$index]['settings']);
      nb_store_settings_history($current, 'undo-before');
      nb_update_settings($restored);
      return ['restored'=>true];
    },
  ]);
});

add_action('admin_post_nb_export_settings', function(){
  if (!current_user_can(nb_admin_capability())) wp_die(esc_html__('Nincs jogosultságod.', 'nb-designer'));
  check_admin_referer('nb_export_settings');
  $settings = nb_sync_mockup_references(nb_get_settings([]));
  nocache_headers();
  header('Content-Type: application/json; charset=utf-8');
  header('Content-Disposition: attachment; filename="nb-designer-settings-'.gmdate('Y-m-d').'.json"');
  echo wp_json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
});
