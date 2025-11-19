<?php
if ( ! defined('ABSPATH') ) exit;

add_action('init', function(){
  register_post_type('nb_design', [
    'label' => 'Terméktervek',
    'public' => false,
    'show_ui' => true,
    'show_in_menu' => 'nb-designer',
    'menu_icon' => 'dashicons-art',
    'supports' => ['title'],
  ]);
});
