<?php
require '../lib/includes.php';
$app = new Application($DB, true);
$app->checkUser();

$url = dirname(dirname($_SERVER["PHP_SELF"]));

if(!$app->isDevelopment()) redirect("/editor/");

$user     = $app->getUser();
$projects = array();

$allProjs = $DB->find(array("table" => "projects"));
foreach ($allProjs as $v) {
	if(in_array($user->id, explode(",", $v->users_id)))
		$projects[] = $v;
}

if(isset($_GET["pid"]) && !empty($_GET["pid"])){
	$pid  = $_GET["pid"];
	$proj = $DB->findFirst(array("table" => "projects", "conditions" => array("owner_id" => $user->id, "id" => $pid)));

	if($proj == null){
		$allProjs = $DB->find(array("table" => "projects"));
		foreach ($allProjs as $v) {
			if(in_array($user->id, explode(",", $v->users_id)))
				$proj = $v;
		}

	}

	if($proj == null) redirect("$url/views/cep.php");
	$_SESSION["dev_project_id"] = $pid;
	redirect("$url/"); 
}
?>
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Editeur de GameIndus | Choix du projet</title>

	<link rel="icon" type="image/png" href="https://gameindus.fr/imgs/logo/logo-only-16x16.png" />
	<link href='https://fonts.googleapis.com/css?family=Open+Sans:300,400,700' media="screen" rel='stylesheet' type='text/css'>
	<style type="text/css" media="screen">
		*{margin:0;padding:0;outline:0;border:0;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}
		body{background:#323232;width:100%}
		#logo{display:block;position:relative;width:500px;margin:100px auto;margin-bottom:20px}
		.choose-project{
			display: block;position: relative;
			width: 500px;height: auto;
			margin: 0 auto;
			
			background: #ccc;
			border-top:5px solid #bbb;
			
			overflow: hidden;
			-ms-overflow-y: auto;
			    overflow-y: auto;
		}
		h1{
			display: block;position: relative;
			width: 100%;
			margin: 20px 0;

			font-family: "Open Sans", Helvetica, Arial, sans-serif;
			font-size: 2.0em;font-weight: 300;
			
			color: #CCC;
			text-align: center;
		}
		.choose-project .project{
			display: block;position: relative;
			width: 100%;height: 80px;
			padding: 15px;
			
			border-bottom:1px solid #aaa;
			overflow: hidden;
			
			-webkit-transition: ease-out .2s;
			   -moz-transition: ease-out .2s;
			    -ms-transition: ease-out .2s;
			     -o-transition: ease-out .2s;
			        transition: ease-out .2s;
		}
		.choose-project .project:hover{
			cursor: pointer;
			background: #dcdcdc;
		}
		.choose-project .project .name{
			display: block;position: relative;
			
			font-family: "Open Sans", Helvetica, Arial, sans-serif;
			font-size: 1.20em;font-weight: 300;
		}
		.choose-project .project .description{
			display: block;position: relative;
			
			font-family: "Open Sans", Helvetica, Arial, sans-serif;
			font-size: 1.0em;font-weight: 400;
		}
	</style>
</head>
<body>

	<img src="https://gameindus.fr/imgs/logo/logo-medium-middle.png" alt="Logo de GameIndus" id="logo" title="GameIndus">

	<h1>- Choisissez un projet -</h1>

	<div class="choose-project">
		<?php foreach ($projects as $v): ?>
			<div class="project" data-id="<?= $v->id ?>">
				<span class="name"><?= $v->name ?></span>
				<span class="description"><?= $v->description ?></span>
			</div>
		<?php endforeach ?>
	</div>


	<script type="text/javascript">
		window.onload = function(){
			var projects = document.querySelectorAll(".project");
			
			for(var i = 0; i < projects.length; i++){
				var project = projects[i];
				project.onclick = function(e){
					window.location.href += "?pid=" + this.dataset.id;
				}
			}

			if(window.location.href.indexOf('#') > -1)
				window.location.href = window.location.href.substr(0, window.location.href.indexOf('#'));
		}
	</script>

</body>
</html>