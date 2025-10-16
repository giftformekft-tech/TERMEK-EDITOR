<?php
if ( ! defined('ABSPATH') ) exit;

add_shortcode('nb_designer', function(){
  ob_start();
  include NB_DESIGNER_PATH.'templates/designer-page.php';
  return ob_get_clean();
});
