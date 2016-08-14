<?php
require 'lib/includes.php';
$app = new Application($DB);

$proj = $app->getProject();
$user = $app->getUser();

function formatGrade($user){
	$premium = $user->premium;
	$grade   = $user->grade;

	if($grade == "administrator" || $grade == "administrateur") return "Administrateur";
	else{
		if($premium) return "Membre Premium";
		else return "Membre classique";
	}
}

?><!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>GameIndus | Editeur - "<?= $proj->name; ?>"</title>

	<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
	<link href='https://fonts.googleapis.com/css?family=Droid+Sans:300,400,700|Montserrat:300,400|Open+Sans:300,400' rel='stylesheet' type='text/css'>
	
	<link rel="apple-touch-icon" href="https://gameindus.fr/imgs/logo/logo-only-16x16.png" />
	<link rel="icon" type="image/png" href="https://gameindus.fr/imgs/logo/logo-only-16x16.png" />

	<link rel="stylesheet" type="text/css" href="css/loader.css">
</head>
<body>

	<a href="" title="" id="compilationLink" target="_blank" style="display:none"></a>
	<div id="measureText" style="visibility:hidden;width:auto;display:block;position:fixed"></div>

	<header id="header">
		<a href="http://gameindus.fr/project/<?= $proj->id; ?>" title="Retourner sur GameIndus"><div id="logo" class="left"></div></a>

		<div class="tabs-container">
			<div class="tabs">
				
			</div>

			<div class="clear"></div>
		</div>
		

		<div id="dispatchOpeningAccountMenu" class="account right">
			<img class="avatar" src="https://gameindus.fr<?= $user->avatar; ?>" alt="Logo de <?= $user->username; ?>">
			<div class="pseudo"><?= $user->username; ?></div>
			<i class="fa fa-angle-down" style="cursor:pointer"></i>
		</div>

		<div class="account-menu-container">
			<div class="left">
				<div class="avatar" style="background-image:url(https://gameindus.fr<?= $user->avatar; ?>)"></div>
				<div class="username"><?= $user->username; ?></div>
				<div class="role"><?= formatGrade($user); ?></div>
			</div>
			<div class="right">
				<a href="http://gameindus.fr/account" title="Mon profil"><div class="account-button">
					<div class="account-icon profile"></div> Mon profil
				</div></a>
				<a href="http://gameindus.fr/account/projects" title="Mes projets"><div class="account-button">
					<div class="account-icon projects"></div> Mes projets
				</div></a>
				<a href="http://gameindus.fr/account" title="Tutoriels" onclick="alert('Ils arrivent bientôt !');return false;"><div class="account-button">
					<div class="account-icon film"></div> Tutoriels
				</div></a>
			</div>
		</div>

		<div class="clear"></div>
	</header>

	<main>
		<div id="sidebar">
			<div class="actions-bar-container">
				<div class="project-title"><?php echo $proj->name; ?></div>

				<div class="actions">
					<div data-goto="search" data-tooltip="Recherche">
						<i class="fa fa-search"></i>
					</div>
					<div data-goto="options" data-tooltip="Options">
						<i class="fa fa-cogs"></i>
					</div>
					<div data-goto="create-file" data-tooltip="Ajouter un fichier">
						<i class="fa fa-file-o" id="addFile"></i>
					</div>
					<div data-goto="create-folder" data-tooltip="Ajouter un dossier">
						<i class="fa fa-folder-o" id="addFolder"></i>
					</div>
					<div data-goto="custom"onclick="exporter.open();return false;" data-tooltip="Exporter">
						<i class="fa fa-rocket"></i>
					</div>
					<div data-goto="custom" onclick="compiler.run();return false;" data-tooltip="Tester">
						<i class="fa fa-play" id="playProjectIcon"></i>
					</div>
				</div>
			</div>

			<div id="action_tooltip">Accueil</div>


			<div class="files" style="height:700px">
				<br><br>
				<div class="spinner-container" style="transform:scale(0.6)">
					<svg id="spinner_loader" class="spinner hide" style="margin-left:90px" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>
				</div>
			</div>

			<div class="files-menu">
				<div class="line-menu" data-action="create-file">
					<i class="fa fa-file-o"></i> Créer un fichier
				</div>
				<div class="line-menu" data-action="create-folder">
					<i class="fa fa-folder-o"></i> Créer un dossier
				</div>

				<hr>

				<div class="line-menu" data-action="copy">
					<i class="fa fa-clone"></i> Copier
				</div>
				<div class="line-menu" data-action="cut">
					<i class="fa fa-scissors"></i> Couper
				</div>
				<div class="line-menu" data-action="paste">
					<i class="fa fa-clipboard"></i> Coller
				</div>

				<hr>

				<div class="line-menu" data-action="rename">
					<i class="fa fa-i-cursor"></i> Renommer
				</div>
				<div class="line-menu" data-action="remove">
					<i class="fa fa-trash"></i> Supprimer
				</div>

			</div>

			<div class="sidebar_links">
				<a href="#" onclick="Tabs.changeTab(null);App.getRouter().changeViewTo('home');return false;" title="Accueil"><i class="fa fa-home"></i></a>
				<a href="https://docs.gameindus.fr" target="_blank" title="Documentation"><i class="fa fa-book"></i></a>
				<a href="#" id="rm_icon" title="Gestionnaire de ressources"><i class="fa fa-connectdevelop"></i></a>
			</div>

			<div id="resizebox" style="z-index:20"></div>
		</div>

		<div id="editor-container" style="margin-top:-5px"></div>

		<div class="clear"></div>
	</main>

	<div id="right-notif"></div>
	<div class="app-notif-container success">
		<span class="title"></span>
		<span class="content"></span>
	</div>

	<footer>
		<p id="statusText">En attente.</p>
		
		<div class="chatbox reduced">
			<input type="hidden" id="username" value="<?php echo $user->username; ?>">
			<div class="header">
				<h3 class="title">Discussion</h3>
				<i class="fa box-icon fa-comments"></i> 
				<i class="fa box-icon fa-plus" id="chatbox_toggle"></i>

				<div class="clear"></div>
			</div>

			<div class="content" id="tchatContent">
				<div id="messages" class="messages" style="height:185px"></div>
				<div id="tchatError"></div>
			</div>

			<div class="footer">
				<form action="" type="POST" id="post_message_form" onsubmit="tchat.submitForm(this);return false;">
					<input type="text" id="post_message_input" value="" placeholder="Parle dans le tchat" autocomplete="off">
					<input type="submit" id="post_message_submit" value="Envoyer">
				</form>
			</div>
		</div>

	</footer>

	<!-- JS Getters -->
	<input type="hidden" id="projectId" value="<?= $proj->editor_id; ?>">
	<input type="hidden" id="projectRealId" value="<?= $proj->id; ?>">
	<input type="hidden" id="projectName" value="<?= $proj->name; ?>">
	<input type="hidden" id="sid" value="<?= session_id(); ?>">

	<div id="alert-container"></div>
	<div id="export-container">
		<?php require "views/parts/exporter.php"; ?>
	</div>
	<div id="srcmanager">
		<div class="container">
			<i class="fa fa-times close"></i>
			<div class="title"><i class="fa fa-connectdevelop"></i> Gestionnaire de ressources</div>

			<div class="content">
				<p class="sub-title"><span class="ressourcesnum">0</span> ressources</p>
				<div class="ressources"></div>
				<div class="button" style="width:10%;float:right;display:inline-block" id="rm_addressource"><i class="fa fa-plus"></i></div>
				<input type="file" id="rm_addressourceinput" style="opacity:0;width:0;height:0">
				<div class="clear"></div>
			</div>

			<div class="content_infos">
				
			</div>
		</div>
	</div>

	<div id="gimarket">
		<div class="container">
			<i class="fa fa-times close"></i>
			<div class="title"><i class="fa fa-shopping-basket"></i> Magasin GameIndus</div>

			<div class="content">
				<div class="searchbar">
					<p><i class="fa fa-search"></i> Recherche rapide</p>
					<input type="text" id="marketsearch_input" placeholder="Tapez pour rechercher...">
				</div>

				<div class="search-results">
					<span class="text">Commencez à taper pour rechercher des ressources.</span>
				</div>
			</div>
		</div>
	</div>

	<div id="rm_dropdownmenu">
		<div id="rm_rename"><i class="fa fa-pencil"></i> Renommer</div>
		<div id="rm_export"><i class="fa fa-download"></i> Télécharger</div>
		<div id="rm_delete"><i class="fa fa-times"></i> Supprimer</div>
	</div>

	<script src="js/app/loader.js" type="text/javascript" charset="utf-8"></script>
	<script id="tokenScriptTag">var token = "<?= $_SESSION['user']->auth->token; ?>";</script>
	<script src="https://gameindus.fr:30000/?2d&v=<?= time() ?>" type="text/javascript" defer></script>

	<script src="js/require.js" type="text/javascript" defer></script>

	<script>
	  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
	  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

	  ga('create', 'UA-53751215-2', 'auto');
	  ga('send', 'pageview');

	</script>
</body>
</html>