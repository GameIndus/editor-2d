<?php  
require_once '../lib/ImageResizer.php';
$base = "/home/gameindus/system/projects/";

function unknownImage($width){
	$img = new abeautifulsite\SimpleImage("/home/gameindus/site/imgs/projects/unknown.jpg");
	if($width != null) $img->fit_to_width($width);
	$img->output();
	die();
}

session_start();
if(!isset($_SESSION['project']) || empty($_SESSION['project'])) unknownImage($width);

$project = $_SESSION['project'];
$sprite  = $_GET['sprite'];
$width   = $_GET["width"];

$projectEditorId = str_pad($project->editor_id, 4, "0", STR_PAD_LEFT);

$jsonfile = $base . $projectEditorId . "/tmp/spr_" . $sprite . ".json";
if(!file_exists($jsonfile)) unknownImage($width);

$json      = json_decode(file_get_contents($jsonfile));
$ressource = $json->ressource;
if($ressource == null) unknownImage($width);

$ressourcename = preg_replace("/assets\//", "", $ressource->path);

$animation = current((Array) $json->animations);
$cellsize  = $ressource->cellSize;
$srcsize   = $ressource->size;

$assetfile = $base . $projectEditorId . "/assets/$ressourcename";

$x   = $animation->begin * $cellsize->w;
$y   = 0;
$out = floor($x / $srcsize->w);

if($out > 0){
	$x -= $srcsize->h * $out;
	$y  = $cellsize->h * $out; 
}

$img = new abeautifulsite\SimpleImage($assetfile);
$img->crop($x, $y, $x + $cellsize->w, $y + $cellsize->h);

if($width != null){
	$img->fit_to_width($width);
}

$img->output();
?>