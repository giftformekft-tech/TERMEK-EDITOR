<?php
if ( ! defined('ABSPATH') ) exit;

/** Return the complete, safe appearance token set for the designer studio. */
function nb_designer_appearance_defaults(){
  return [
    'background' => '#f5f1e8',
    'surface' => '#ffffff',
    'surface_alt' => '#f7f6f2',
    'text' => '#20211f',
    'muted' => '#686b63',
    'border' => '#dedfd8',
    'accent' => '#f4d35e',
    'accent_text' => '#20211f',
    'accent_hover' => '#e9c344',
    'secondary' => '#f0f0e9',
    'secondary_text' => '#30332c',
    'success' => '#28734c',
    'danger' => '#b43b36',
    'radius' => 12,
  ];
}

/** Sanitize imported/admin values and always return every whitelisted token. */
function nb_sanitize_designer_appearance($raw){
  $defaults = nb_designer_appearance_defaults();
  $raw = is_array($raw) ? $raw : [];
  $clean = $defaults;
  foreach ($defaults as $key => $default){
    if ($key === 'radius'){
      if (isset($raw[$key]) && is_scalar($raw[$key]) && is_numeric($raw[$key])){
        $clean[$key] = max(0, min(24, (int)$raw[$key]));
      }
      continue;
    }
    if (!isset($raw[$key]) || !is_scalar($raw[$key])) continue;
    $value = trim((string)$raw[$key]);
    if (preg_match('/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i', $value)){
      $value = strtolower($value);
      if (strlen($value) === 4){
        $value = '#'.$value[1].$value[1].$value[2].$value[2].$value[3].$value[3];
      }
      $clean[$key] = $value;
    }
  }
  return $clean;
}

/** Build the scoped variables used by the frontend studio CSS. */
function nb_designer_appearance_inline_css($appearance = null){
  if ($appearance === null){
    $stored = function_exists('nb_get_settings') ? nb_get_settings([]) : [];
    $appearance = is_array($stored) ? ($stored['appearance'] ?? []) : [];
  }
  $appearance = nb_sanitize_designer_appearance($appearance);
  $vars = [];
  foreach ($appearance as $key => $value){
    $vars[] = '--nb-'.str_replace('_', '-', $key).':'.($key === 'radius' ? (int)$value.'px' : $value);
  }
  return '#nb-designer, #nb-processing-overlay{'.implode(';', $vars).';}';
}
