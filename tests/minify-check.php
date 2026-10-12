<?php
/**
 * Lefuttatja a bővítmény JS fájljait azon a minifikálón (matthiasmullie/minify), amelyet a
 * LiteSpeed Cache is használ, és Node-dal ellenőrzi, hogy a kimenet érvényes JavaScript.
 * Egy rosszul felismert reguláris kifejezés (pl. /^image\//) az élő oldalon az egész scriptet leállítja.
 *
 *   MINIFY_SRC=path/to/minify/src PATH_CONVERTER_SRC=path/to/path-converter/src php tests/minify-check.php
 */
$minify = getenv('MINIFY_SRC');
$converter = getenv('PATH_CONVERTER_SRC');
if (!$minify || !$converter) {
  fwrite(STDERR, "Set MINIFY_SRC and PATH_CONVERTER_SRC to the src folders of matthiasmullie/minify and matthiasmullie/path-converter.\n");
  exit(2);
}
spl_autoload_register(function($class) use ($minify, $converter){
  foreach (['MatthiasMullie\\Minify\\' => $minify, 'MatthiasMullie\\PathConverter\\' => $converter] as $prefix => $dir) {
    if (strpos($class, $prefix) !== 0) continue;
    $file = rtrim($dir, '/').'/'.str_replace('\\', '/', substr($class, strlen($prefix))).'.php';
    if (file_exists($file)) require $file;
  }
});
$root = dirname(__DIR__);
$files = array_merge(glob($root.'/assets/js/*.js'), glob($root.'/admin/js/*.js'));
$failed = 0;
foreach ($files as $file) {
  $js = new MatthiasMullie\Minify\JS();
  $js->add(file_get_contents($file));
  $base = tempnam(sys_get_temp_dir(), 'nbmin');
  $out = $base.'.js';
  file_put_contents($out, $js->minify());
  exec('node --check '.escapeshellarg($out).' 2>&1', $lines, $code);
  $name = substr($file, strlen($root) + 1);
  if ($code !== 0) {
    $failed++;
    echo "FAIL $name\n  ".implode("\n  ", array_slice($lines, 0, 4))."\n";
  } else {
    echo "OK   $name\n";
  }
  $lines = [];
  unlink($out);
  unlink($base);
}
exit($failed ? 1 : 0);
