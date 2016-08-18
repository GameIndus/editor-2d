<canvas id="sceneEditor" class="editorCanvas" style="margin-top:5px"></canvas>

<div id="ressourceImporter" style="display:none;background:rgb(23, 25, 27)"><div class="container"></div></div>
<div class="rightPanel scenePanel" style="width:300px">
	<div class="tabs">
		<div class="tab" data-div="addObject"><i class="fa fa-plus"></i> Ajouter</div>
		<div class="tab active" data-div="listObjects"><i class="fa fa-cubes"></i> Objets</div>
	</div>

	<div id="addObject" class="flow" style="display:none">
		<div class="main-comps">

			<p>Choisissez votre composant et glissez-le dans l'espace de travail pour l'utiliser.</p>

			<br>

			<div class="components"></div>
		</div>
	</div>

	<div id="listObjects">
		<div class="top" style="padding:0;border-bottom:3px solid #eee">
			<div class="action-btns" style="z-index:1">
				<i class="fa toggle-visibility-object" title="Cacher/Voir cet objet"></i> 
				<i class="fa fa-pencil rename-object" title="Renommer cet objet"></i> 
				<i class="fa fa-times remove-object" title="Supprimer cet objet"></i>
			</div>

			<div class="objects" style="height:120px;overflow:auto;background:white" id="sceneObjects"></div>
		</div>
		<div class="bottom">
			<div class="properties" style="z-index:2">
				
			</div>
		</div>
	</div>
</div>

<div class="editor-bar tools-bar">
	<div class="tool-title">Mode</div>
	<div class="tool-input" id="click_mode">
		<div class="active" value="selection"><i class="fa fa-mouse-pointer"></i></div>
	    <div value="adding"><i class="fa fa-plus-square-o"></i></div>
	    <div value="removing"><i class="fa fa-trash-o"></i></div>
	</div>

	<div class="tool-title">Transformation</div>
	<div class="tool-input" id="scene_transformation">
		<div class="active" value="move"><i class="fa fa-arrows"></i></div>
	    <div value="rotate"><i class="fa fa-repeat"></i></div>
	</div>
</div>

<!-- <div class="title">Propriétés de "sprite001"</div>
<div class="property">
	<div class="heading">
		Comportement de rotation
		<div class="remove"><i class="fa fa-times"></i></div>
	</div>
	<div class="content">
		<div class="input">
			<label>Angle</label>
			<input type="number" placeholder="Angle"></input>
			<div class="clear"></div>
		</div>
		<div class="input">
			<label>Etape</label>
			<input type="number" placeholder="Degré par étape"></input>
			<div class="clear"></div>
		</div>
		<div class="input">
			<label>Externe</label>
			<div class="dialoglink">Gérer</div>
			<div class="clear"></div>
		</div>
		<div class="input">
			<label>Position</label>
			<input type="number" placeholder="X"></input>
			<input type="number" placeholder="Y"></input>
			<div class="clear"></div>
		</div>
		<div class="input">
			<label>Select</label>
			<select>
				<option value="option1">Option 1</option>
				<option value="option2">Option 2</option>
				<option value="option3">Option 3</option>
			</select>
			<div class="clear"></div>
		</div>
	</div>
</div>
<div class="property">
	<div class="heading">
		Comportement 2
		<div class="remove"><i class="fa fa-times"></i></div>
	</div>
	<div class="content">
		<div class="input">
			<label>Slider</label>
			<div class="slider">
				<div class="rangeslider" data-limits data-realtimevalue value="100" data-min="50" data-max="150" data-step="2"></div>
			</div>
			<div class="clear"></div>
		</div>
	</div>
</div> -->