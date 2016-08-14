<canvas id="soundEditor" class="editorCanvas"></canvas>

<div class="rightPanel soundPanel">
	<div class="top">
		<p id="uploadedFileP" style="font-size:0.9em;text-align:center"></p>
		<div class="button" id="uploadFileButton">
			<input type="file" id="uploadFile" onchange="currentEditor.fileUploaded(this);return false;" />
			Envoyer un fichier
		</div>
	</div>
	<div class="bottom">
		<div class="parameters" id="parametersSound">
			<div class="parameter" style="padding-top:0;padding-bottom:0;border-bottom:2px solid #383838">
				<canvas id="spectrumZone" style="margin-left:-10px"></canvas>
			</div>
			<div class="parameter">
				<div class="button" style="width:15%;margin-left:2%;display:inline-block" id="playSound"><i class="fa fa-play"></i></div>
				<div class="button" style="width:15%;display:inline-block" id="stopSound"><i class="fa fa-stop"></i></div>
				<div class="timeline" style="width:60%;display:inline-block;margin-left:5%" id="timelineSound">
					<div class="cursor" id="timelineCursor"></div>
				</div>
			</div>
		</div>
	</div>
</div>