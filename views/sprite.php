<canvas id="spriteEditor" class="editorCanvas" style="margin-top:5px"></canvas>

<div id="ressourceImporter" style="display:none;background:rgb(23, 25, 27)">
	<div class="container">
		<div class="left">
			<div class="title">
				Séléctionner une ressource
				<span class="subtitle">Depuis l'ordinateur</span>
			</div>

			<div class="tabs">
				<div class="tab" data-type="computer" data-primary>
					<!-- <p>
						Si vous souhaitez importer une ressource depuis votre ordinateur, vous pouvez glisser le fichier souhaité dans la zone prévue à cette effet, ou sélectionner un fichier avec le bouton classique.
					</p>

					<br><br> -->

					<div class="dropzone" id="dropfile"></div>
					<br>
					<p>Ou cliquez sur la zone ci-dessus pour sélectionner un fichier.</p>
				</div>
				<div class="tab" data-type="manager" style="padding:0">
					<div id="managerImporter" class="srcManager">
						<div class="container">
							<div class="title" style="display:none"></div>
							<i class="fa fa-times close" style="display:none"></i>
							<div class="content">
								<p class="sub-title" style="display:none"><span class="ressourcesnum">0</span> ressources</p>
								<div class="ressources"></div>
								<div class="button" style="width:10%;float:right;display:inline-block" id="rm_addressource"><i class="fa fa-plus"></i></div>
								<input type="file" id="rm_addressourceinput" style="opacity:0;width:0;height:0">
								<div class="clear"></div>
							</div>

							<div class="content_infos" style="display:none">
								
							</div>
						</div>
					</div>
				</div>
				<div class="tab" data-type="market" style="padding:20px">
					<div id="mmImporter" class="srcManager marketImporter">
						<div class="container" style="height:450px">
							<i class="fa fa-times close" style="display:none"></i>
							<div class="title" style="display:none"><i class="fa fa-shopping-basket"></i> Magasin GameIndus</div>

							<div class="content">
								<div class="searchbar">
									<p><i class="fa fa-search"></i> Recherche rapide</p>
									<input type="text" id="marketsearch_input" placeholder="Tapez pour rechercher...">
								</div>

								<div class="search-results" style="height:360px;overflow:hidden;overflow-y:auto">
									<span class="text">Commencez à taper pour rechercher des ressources.</span>
								</div>
							</div>
						</div>
					</div>	
				</div>
			</div>
		</div>
		<div class="right">
			<div class="actions">
				<div class="action active" data-type="computer"><i class="fa fa-desktop"></i> &nbsp;Depuis l'ordinateur</div>
				<div class="action" data-type="manager"><i class="fa fa-connectdevelop"></i> &nbsp;Depuis le gestionnaire</div>
				<div class="action" data-type="market"><i class="fa fa-shopping-cart"></i> &nbsp;Depuis le magasin</div>

				<div class="send action" data-type="send">Utiliser&nbsp; <i class="fa fa-angle-double-right"></i> </div>
			</div>

		</div>
		<div class="clear"></div>
	</div>
</div>

<div class="rightPanel spritePanel" id="spriteEditorBar">
	<div class="actions">
		<div class="action add-animation"><i class="fa fa-plus"></i></div>
		<div class="action image-options"><i class="fa fa-cogs"></i></div>
	</div>

	<div class="section animations">
		<div class="title" style="z-index:2">Animations</div>

		<div class="action-btns">
			<i class="fa fa-pencil rename-animation" title="Renommer cet animation"></i> 
			<i class="fa fa-times remove-animation" title="Supprimer cet animation"></i>
		</div>
		
		<div class="animations-list"></div>

		<div class="properties" style="display:block;position:relative;z-index:2"></div>
	</div>
	<div class="section preview">
		<div class="title">Prévisualisation</div>
		<canvas id="spritePreview" width="220" height="220" style="width:220px;height:220px"></canvas>
	</div>

	<div class="clear"></div>
</div>