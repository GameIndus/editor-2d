<?php 
require_once '../includes.php';

$id          = $ProjectsManager->getCurrentProject()->id;
$name        = addslashes(htmlentities($_GET['name']));

if($id==null){
	echo json_encode(array('error' => 'project_undefined'));
	die();exit();
}else{
	$saved = $DB->save(array(
		'table'      => 'projects',
		'fields'     => array('name' => $name),
		'where'      => 'id',
		'wherevalue' => $id
	));

	if($saved){
		if(isset($_SESSION['project'])&&!empty($_SESSION['project'])){
			 $_SESSION['project']->name = $name;
		}

		echo json_encode(array('success' => 'project_updated'));
		die();exit();
	}else{
		echo json_encode(array('error' => 'project_unsaved'));
		die();exit();
	}
}
?>