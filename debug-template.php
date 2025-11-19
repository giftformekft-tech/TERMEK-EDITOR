<?php
/**
 * Debug script to check template data
 * 
 * Visit: your-site.com/wp-content/plugins/nano-banana-designer/debug-template.php?id=TEMPLATE_ID
 */

require_once('../../../wp-load.php');

if (!isset($_GET['id'])) {
    die('Add ?id=TEMPLATE_ID to URL');
}

$template_id = intval($_GET['id']);
$post = get_post($template_id);

if (!$post || $post->post_type !== 'nb_template') {
    die('Template not found or wrong post type');
}

echo "<h1>Template: {$post->post_title}</h1>";
echo "<h2>Post Type: {$post->post_type}</h2>";

$layers_json = get_post_meta($template_id, 'layers_json', true);
$preview_url = get_post_meta($template_id, 'preview_url', true);

echo "<h3>Preview URL:</h3>";
echo "<pre>" . htmlspecialchars($preview_url) . "</pre>";

echo "<h3>layers_json (raw):</h3>";
echo "<pre>" . htmlspecialchars($layers_json) . "</pre>";

echo "<h3>layers_json (decoded):</h3>";
$decoded = json_decode($layers_json, true);
echo "<pre>" . print_r($decoded, true) . "</pre>";

echo "<h3>What REST API returns:</h3>";
$api_response = array(
    'id' => $template_id,
    'layers' => $decoded
);
echo "<pre>" . print_r($api_response, true) . "</pre>";
