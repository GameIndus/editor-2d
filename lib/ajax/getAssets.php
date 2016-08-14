<?php  

$baseDir = "/home/gameindus/system/projects/";

function getFileSize($file){
	$file = $file;

    $ch = curl_init($file);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

    $data = curl_exec($ch);
    curl_close($ch);

    if (preg_match('/Content-Length: (\d+)/', $data, $matches)) {
        $contentLength = (int)$matches[1];
    }

    return $contentLength;
}

session_start();
if(!isset($_SESSION['project']) || empty($_SESSION['project'])) die('{"error": "Empty project."}');

$project = $_SESSION['project'];

$asset = (isset($_GET['asset']));

$formattedNum = str_pad($project->editor_id, 4, "0", STR_PAD_LEFT);
$srcjson = file_get_contents($baseDir . $formattedNum . "/assets/ressources.json");

$assets = array();
foreach (json_decode($srcjson) as $k => $v) {
	$assets[] = array('name' => $k, 'filename' => $formattedNum . "/assets/" . $v->src);
}


if($asset){
	$asset = $_GET['asset'];
	
	$lastmodification = filemtime($baseDir . $asset);
	$datecreation     = filectime($baseDir . $asset);
	$size 			  = getFileSize("https://gameindus.fr/static/" . $asset);

	$ret = array(
		'size' => $size,
		'lastmodif' => $lastmodification,
		'datecreation' => $datecreation
	);

	die(json_encode($ret));
}

die(json_encode($assets));
?>