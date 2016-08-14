<?php  
session_start();
// error_reporting(E_ALL);
// ini_set("display_errors", 1);
// date_default_timezone_set('Europe/Paris');
// setlocale (LC_TIME, 'fr_FR.utf8','fra');
// ini_set('memory_limit', '-1'); 

if(!isset($_SESSION['project'])||empty($_SESSION['project'])){
	var_dump('Vous n\'êtes pas connecté. Merci de réessayer.');die();
}

$projId   = $_SESSION['project']->editor_id;
$projName = str_pad($projId+"", 4, "0", STR_PAD_LEFT);

$uploadFolder = '/home/gameindus/system/projects/'.$projName.'/assets/';

foreach($_FILES as $v) {
	$type = $v['type'];

	if(strpos($type, "image") !== false || strpos($type, "audio") !== false){
		if(move_uploaded_file($v['tmp_name'], $uploadFolder.$v['name']))
			die($uploadFolder . $v['name']);
		else
			die('error_moving_file');
	}
}

die('aucun fichier trouvé.');
?>