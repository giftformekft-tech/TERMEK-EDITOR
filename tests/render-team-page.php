<?php
/**
 * A csapattervező sablonját rendereli WordPress nélkül, a böngészős teszthez.
 * Használat: php tests/render-team-page.php '<nb_team_settings JSON>'
 * A WordPress-függvények egyszerű helyettesítők; a modul saját kódja (beállítások
 * tisztítása, sablon) a valódi.
 */
define('ABSPATH', __DIR__.'/');
$GLOBALS['nbt_test_settings'] = json_decode($argv[1] ?? '{}', true) ?: [];

function add_action(){} function add_filter(){} function add_shortcode(){}
function __($text){ return $text; }
function esc_html($text){ return htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8'); }
function esc_attr($text){ return esc_html($text); }
function esc_url($url){ return esc_html($url); }
function sanitize_key($key){ return preg_replace('/[^a-z0-9_\-]/', '', strtolower((string)$key)); }
function sanitize_text_field($text){ return trim(preg_replace('/[\r\n\t ]+/', ' ', strip_tags((string)$text))); }
function sanitize_textarea_field($text){ return trim(strip_tags((string)$text)); }
function absint($value){ return abs(intval($value)); }
function get_option($key, $default = false){ return $key === 'nb_team_settings' ? $GLOBALS['nbt_test_settings'] : $default; }
function wp_get_attachment_image_url($id){ return 'http://nb.test/card-'.intval($id).'.svg'; }
function get_post_meta($id, $key){ return $key === '_wp_attachment_image_alt' ? 'Kép '.intval($id) : ''; }

require __DIR__.'/../inc/team-designer.php';
include __DIR__.'/../templates/team-designer-page.php';
