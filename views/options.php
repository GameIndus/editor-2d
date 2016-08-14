<?php
session_start();
require '../lib/includes.php';
$app = new Application($DB);

?><div class="opts_menu">
	<div class="title" style="display:none"></div>
	<a data-div="game" class="active" title="Options de votre jeu"><i class="fa fa-gamepad"></i> Jeu</a>
	<a data-div="editor" title="Options de l'éditeur"><i class="fa fa-cubes"></i> Editeur</a>
	<a data-div="advanced" title="Options avancées"><i class="fa fa-code"></i> Avancé</a>
</div>

<div class="opts_divs">
	<div class="notif success" id="saveOptionsSuccessfull">
		Options sauvegardées.
	</div>

	<form action="#options" method="POST" onsubmit="return false;" id="optionsForm">

		<div class="toggle-div" id="game">
			<div class="input">
				<h3 class="sub-title">Démarrage</h3>

				<label for="default_scene">Scène par défaut</label>
				<select name="default_scene" id="default_scene" onchange="currentEditor.updateDefaultScene()"></select>
				<div class="clear"></div>

				<label for="loading_image" style="width:40%">Image de lancement</label>
				<input type="file" style="width:60%;line-height:0;padding-top:5px"></input>
				<?php if(!$app->projectIsPremium()): ?><div class="overlay-premium"><i class="fa fa-star"></i> Fonctionnalité <span>Premium</span></div><?php endif; ?>
				<div class="clear"></div>

				<br>
				<h3 class="sub-title">Vidéo</h3>

				<label for="project_size_w">Taille du jeu</label>
				<input type="text" name="project_size_w" id="project_size_w" placeholder="Largeur" style="width:27.5%" onkeyup="currentEditor.updateRatio()">
				<div style="display:block;position:relative;width:5%;float:left;font-weight:bold;text-align:center;line-height:40px;height:40px;margin-top:4.5px;background:#eee;font-family:'Open Sans';font-size:1em;">X</div>
				<input type="text" name="project_size_h" id="project_size_h" placeholder="Hauteur" style="width:27.5%" onkeyup="currentEditor.updateRatio()">
				<div style="display:block;position:relative;width:10%;float:left;font-weight:400;text-align:center;line-height:40px;height:40px;margin-top:4.5px;background:#eee;font-family:'Open Sans';font-size:0.9em;"><div id="project_size_ratio">16 : 9</div></div>
				<div class="clear"></div>

				<label for="project_fps">Images / seconde</label>
				<input type="number" min="30" max="60" name="project_fps" id="project_fps" value="60" placeholder="Images par seconde" onkeydown="currentEditor.updateFps()" onkeyup="currentEditor.updateFps()">
				<div class="clear"></div>

				<label for="displaymode" style="width:40%">Mode d'affichage</label>
				<select name="displaymode" style="width:60%" id="displaymode">
					<option value="default">Automatique</option>
					<option value="fullscreen">Plein écran</option>
					<option value="center">Centré</option>
				</select>
				<div class="clear"></div>

				<label for="imageSmoothingLabel" style="width:80%">Lissage des textures</label>
				<div class="flat-checkbox">
					<input type="checkbox" id="imageSmoothing" checked>
					<label class="checkbox-label" for="imageSmoothing" style="width:20%;border-left:none;background:white;border-bottom:2px solid #eee;border-top:2px solid #eee;margin:4px"></label>
					<div></div>
				</div>
				<div class="clear"></div>

			</div>

			<div class="input">
				<h3 class="sub-title">Audio</h3>

				<label style="width:100%">Aucune option pour le moment</label>
			</div>

			<div class="clear"></div>
		</div>

		<div class="toggle-div" id="editor" style="display:none">
			<div class="input">
				<h3 class="sub-title">Editeur de script</h3>

				<label for="se_tabsize">Indentation</label>
				<input type="number" min="1" max="8" name="se_tabsize" id="se_tabsize" value="4" placeholder="Coefficient d'indentation">
				<div class="clear"></div>

				<label for="se_fs">Taille du texte</label>
				<input type="number" min="4" max="32" name="se_fs" id="se_fs" value="16" placeholder="Taille de la police">
				<div class="clear"></div>

				<label for="se_theme">Thème</label>
				<select name="se_theme" id="se_theme">
					<option value="default">Défaut</option>
					<option value="ambiance">Ambiance</option>
					<option value="base16-dark">Base 16 Noir</option>
					<option value="cobalt">Cobalt</option>
					<option value="dracula">Dracula</option>
					<option value="eclipse">Eclipse</option>
					<option value="lesser-dark">Lesser Noir</option>
					<option value="material">Material</option>
					<option value="monokai">Monokai</option>
					<option value="tomorrow-night-eighties">Tomorrow Night Eighties</option>
					<option value="xq-light">XQ Clair</option>
				</select>
				<?php if(!isPremium(getUser())): ?><div class="overlay-premium" style="width:70%;margin-left:30%"><i class="fa fa-star"></i> Fonctionnalité <span>Premium</span></div><?php endif; ?>
				<div class="clear"></div>
			</div>

			<div class="clear"></div>
		</div>

		<div class="toggle-div" id="advanced" style="display:none">
			<div class="input">
	        	<label for="project_developpermode" style="width:80%">Mode développeur </label>
	        	<div class="flat-checkbox">
					<input type="checkbox" name="project_developpermode" id="project_developpermode" onchange="currentEditor.updateDevMode()">
					<label class="checkbox-label" for="project_developpermode" style="width:20%;border-left:none;background:white;border-bottom:2px solid #eee;border-top:2px solid #eee;margin:4px"></label>
					<div></div>
				</div>
	        </div>
	        <div class="input">
	        	<p style="color:#383838;font-size:0.9em;font-style:italic;padding-top:20px">Version du projet: <span id="projectBuildConfig">Inconnu</span></p>
	        </div>

			<div class="clear"></div>
		</div>
		<div class="clear"></div>
		
		<input style="width:100px;height:30px;font-size:1em" type="submit" class="peter-river-flat-button" name="submit" id="submit_options" value="Enregistrer" onclick="currentEditor.save();return false">
	</form>	
</div>