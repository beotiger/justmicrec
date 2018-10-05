<?php

$badsyms = array('/', '\\', "\0", '?', '.', '!', '*', '[', ']', '`', '$', '|', ';');
$fn = empty($_REQUEST['f']) ? 'micrecs/' . uniqid() . '.wav' :
		'micrecs/' . str_replace($badsyms, '', $_REQUEST['f']) . '.wav';

$fr = fopen('php://input', 'rb');
$fw = fopen($fn, 'wb');
while(!feof($fr))
	fwrite($fw, fread($fr, 4096));

fclose($fr);
fclose($fw);

if(@filesize($fn) < 8) {
	@unlink($fn);
	die('Error uploading recording');
}

die('ok');
