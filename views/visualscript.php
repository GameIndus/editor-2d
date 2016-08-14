<canvas id="visualScriptEditor" class="editorCanvas"></canvas>

<div id="workspace" class="vs-workspace">
	<div class="vs-trashbin">
		<div class="icon">
			<div class="lidcap"></div>
			<div class="lid"></div>
			<div class="bin"></div>
		</div>
	</div>
	<div class="vs-sidebar">
		<h4 class="title"><i class="fa fa-plus-square-o"></i> Ajouter un bloc</h4>
		<br>

		<p style="font-size:0.9em">Choisissez un bloc à ajouter et déposer-le dans l'espace de travail.</p>

		<br><br>


		<div class="flow" style="width:100%;margin-top:35px;height:calc(100% - 170px)">
			<div class="box back" id="vsSidebarBackBtn" style="padding:5px 10px;right:115px;position:fixed;width:216px;top:180px"><p style="color:#fff"><i class="fa fa-angle-double-left"></i> Retour</p></div>

			<div class="main-section">
				<div class="bloc-section box sub" data-section="events"><p><i class="fa fa-tag"></i> Évènements</p></div>
				<div class="bloc-section box sub" data-section="logics"><p><i class="fa fa-cogs"></i> Logique</p></div>
				<div class="bloc-section box sub" data-section="actions"><p><i class="fa fa-play-circle"></i> Actions</p></div>
				<div class="bloc-section box sub" data-section="parts"><p><i class="fa fa-th-large"></i> Parties</p></div>
			</div>

			<div class="section-sub" data-section="events">
				
			</div>
			<div class="section-sub" data-section="logics">
				
			</div>
			<div class="section-sub" data-section="actions">
				
			</div>
			<div class="section-sub" data-section="parts">
				
			</div>
		</div>
	</div>

	<div class="vs-contextmenu">
		<div class="line" data-action="duplicate">
			<span class="action">Dupliquer ce bloc</span>
		</div>
		<div class="line" data-action="remove">
			<span class="action">Supprimer ce bloc</span>
		</div>
	</div>
</div>