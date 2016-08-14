<canvas id="tilemapEditor" class="editorCanvas"></canvas>

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
<div class="param-box">
	<div class="boxcontainer">
		<i class="fa fa-times close"></i>
		<div class="title">
			Options de la carte
			<div class="subtitle">Modifier les paramètres de la tilemap</div>
		</div>

		<div class="container">
			<div class="input" style="width:47.5%;margin-right:2.5%;float:left;clear:inherit">
				<label>Nombre d'images</label>
				<p>Modifiez ci-dessous le nombre d'image par colonne et par ligne pour régler votre tileset (image contenant l'ensemble des parties de la carte).</p>
				<input type="text" id="cell_image_width" placeholder="Largeur"></input>
				<input type="text" id="cell_image_height" placeholder="Hauteur"></input>

				<canvas id="cell_size_preview" width="270" height="140"></canvas>
			</div>
			<div class="input" style="width:47.5%;margin-left:2.5%;float:left;clear:inherit">
				<label>Taille de la carte (Optionnel)</label>
				<p>Modifiez ci-dessous les dimensions souhaitées pour la carte (en bloc, non en pixels).</p>
				<br>
				<input type="text" id="map_cell_width" placeholder="Largeur"></input>
				<input type="text" id="map_cell_height" placeholder="Hauteur"></input>
			</div>
			<div class="clear"></div>

			<div class="btn btn-default next">Continuer <i class="fa fa-long-arrow-right"></i></div>
		</div>
	</div>
</div>

<div class="tilemap-tool-bar" id="tilemapEditorBar">
	<div class="tool active" data-tool="paint-mode"></div>
	<div class="tool" data-tool="solid-mode"></div>
	<div class="tool" data-tool="erase-mode"></div>

	<div class="sepa"></div>

	<div class="tool active" data-tool="brush-mode"></div>
	<div class="tool" data-tool="shape-mode"></div>
	<div class="tool" data-tool="bucket-mode"></div>

	<div class="sepa"></div>

	<div class="tool" data-tool="settings"></div>

	<div style="position:absolute;display:block;right:280px">
		<div class="tool icon disabled" data-tool="layerdown" id="layer_down"><i class="fa fa-minus"></i></div>
		<div class="layer_info" id="layer_info">0</div>
		<div class="tool icon" data-tool="layerup" id="layer_up"><i class="fa fa-plus"></i></div>
	</div>


	<div class="tool" data-tool="collapse" id="collapse-selectzone" style="float:right;text-align:center"><i class="fa fa-angle-double-right"></i> </div>


	<div class="clear"></div>
</div>

<div class="tilemap-overlay"></div>

<div class="tilemap-selectzone">

	<canvas id="selectzone"></canvas>
</div>