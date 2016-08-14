function SoundEditor(Editor){
	this.editor = Editor;
	this.sound  = null;

	this.ressourceName = null;
	this.ressourceSrc  = null;

	// Realtime spectrum canvas
	this.spectrumZone, this.spectrumContext;
	this.audioContext, this.audioSource, this.audioAnalyser;
	this.audioBuffer = null;
}

SoundEditor.prototype = {

	load: function(){
		var that = this;

		css("editors/sound");

		var scene = new Scene();
		this.editor.game.addScene("default", scene);
		this.editor.game.setCurrentScene("default");

		this.spectrumZone    = document.getElementById("spectrumZone");
		this.spectrumContext = this.spectrumZone.getContext('2d');
		this.spectrumZone.width = 350;this.spectrumZone.height = 135;
		this.spectrumInterval = null;

		network.onConnect(function(){
			that.loadSound();
		});
	},
	init: function(){

	},
	unload: function(){
		if(this.spectrumInterval != null)
			clearInterval(this.spectrumInterval);
	},

	loadSound: function(){
		var that = this;
		var filename = App.getFilesManager().currentFile;

		network.request("loadSound", {name: filename}, function(d){
			that.ressourceName = d.sound.name;
			that.ressourceSrc  = d.sound.src;

			that.initSound();
			that.loadEvents();
		}, "soundeditor").send();
	},

	loadEvents: function(){
		var that = this;

		document.getElementById("playSound").onclick = function(){
			if(!that.editor.game.loader.isLoaded || that.sound == null) return false;
			var state = !that.sound.audio.paused;

			if(!state){
				that.sound.play();
				this.childNodes[0].className = "fa fa-pause";
			}else{
				that.sound.stop();
				this.childNodes[0].className = "fa fa-play";
			}
		}

		document.getElementById("stopSound").onclick = function(){
			if(!that.editor.game.loader.isLoaded || that.sound == null) return false;

			that.sound.stop();
			that.sound.audio.currentTime = 0;
			document.getElementById("playSound").childNodes[0].className = "fa fa-play";
		}

		var leftDown = false;
		var updateSoundTime = function(e){
			if(!leftDown || that.sound == null) return false;
			e.preventDefault();

			var x       = e.layerX;
			var percent = (100 * x) / document.getElementById("timelineSound").offsetWidth;

			that.sound.audio.currentTime = (percent * that.sound.audio.duration) / 100;
		};

		window.onmouseup = function(e){if(e.keyCode===0) leftDown = false;}
		document.getElementById("timelineSound").onmousemove = function(e){
			updateSoundTime(e);
			return false;
		}
		document.getElementById("timelineSound").onmousedown = function(e){
			if(e.keyCode===0) leftDown = true;
			updateSoundTime(e);
		}
	},

	fileUploaded: function(el){
		var that = this;
		var img = el.files[0];
	    var fileName = img.name; // not path
	    var fileSize = img.size; // bytes
	    var fileType = img.type; // Type

	    if(el.parentNode.classList.contains('uploading')) return false;

	    if(!fileType.match("audio/*")){
	    	alert('Vous devez envoyer un fichier audio. (mp3, ogg, wav...)');
	    	return false;
	    }

		// Send file
		var formData = new FormData();
		var xhr = new XMLHttpRequest();
		
		formData.append(fileName, img, fileName);
		xhr.open('POST', 'lib/ajax/uploadFile.php', true);
		xhr.onload = function () {
			document.getElementById("uploadFileButton").classList.remove("uploading");
		  	if (xhr.status === 200) {
		    	if(xhr.responseText.indexOf('/') > -1){
		    		// console.log(xhr.responseText); return false;
		    		if(xhr.responseText == "error_moving_file"){
		    			App.alert("Erreur durant la mise en ligne", "Le fichier n'a pas pu être déplacé.", 'error', 8);
		    			return false;
		    		}

		    		var componentName = App.getCurrentFile();

		    		var spli = xhr.responseText.split("/");
		    		var file = spli[spli.length-1];
		    		var path = file;
		    		network.request("saveSoundRessource", {src: path, name: componentName}).send();
		    		that.ressourceName = componentName;
		    		that.ressourceSrc  = file;

		    		that.initSound();
		    		that.save();
		    	}else{
		    		App.alert("Erreur durant la mise en ligne", "Raison: "+xhr.responseText, "danger", 8);
		    	}
		  	} else {
		   		App.alert("Erreur durant la mise en ligne", "Erreur de chargement. Merci de contacter un administrateur.", "danger", 8);
		  	}
		};
		xhr.send(formData);

		document.getElementById("uploadFileButton").classList.add("uploading");
	},

	initSound: function(){
		var that = this;

		if(this.ressourceSrc == null){
			App.alert("Son non reconnu", "Il nous est impossible de charger votre son.", "danger", 8);
			return false;
		}

		document.getElementById("uploadFileButton").style.display = "none";
		document.getElementById("parametersSound").style.display = "block";
		document.getElementById("uploadedFileP").innerHTML = "Fichier envoyé : <b>" + this.ressourceSrc + "</b>";

		// Load sound from file path
		this.sound = new Sound(getDomain() + "/static/" + App.getProject().getFormattedEditorId() + "/assets/" + this.ressourceSrc);
		this.sound.setName(this.ressourceName);

		// Init spectrum analyser
		this.audioContext = new AudioContext(); // audioContext object instance
		this.audioAnalyser = this.audioContext.createAnalyser(); // AnalyserNode method

		this.audioSource = this.audioContext.createMediaElementSource(this.sound.audio); 
		this.audioSource.connect(this.audioAnalyser);
		this.audioAnalyser.connect(this.audioContext.destination);
		spectrumRender();

		// Init global spectrum
		var req = new XMLHttpRequest();
		req.open('GET', this.sound.path, true);
		req.responseType = 'arraybuffer';
		req.onload = function() {
		    var audioData = req.response;
		    that.audioContext.decodeAudioData(audioData, function(buffer) {
		        that.audioBuffer = buffer.getChannelData(0);
		    }, function(e){"Error with decoding audio data" + e.err});
		}
		req.send();
	},

	save: function(){
		var data = {src: this.ressourceSrc, name: this.ressourceName};

		if(network.connection == null){
			App.alert("Erreur de sauvegarde", "L'éditeur n'a pas pu se connecter au serveur.", "danger", 8);
			return false;
		}

		network.request("saveSound", data).send();
	},

	reset: function(){
		if(this.spectrumInterval != null){
			clearInterval(soundEditor.spectrumInterval);
			soundEditor.spectrumInterval = null;
		}

		if(this.sound != null){
			this.sound.stop();
			this.sound = null;
		}
	}

};

function spectrumRender(){
	var that = currentEditor;
	var size = that.editor.getEngineGame().getCanvas().getSize();

	// that.editor.game.getEventsManager().on('gameRendered', function(){
	// 	if(that.audioBuffer == null) return true;
	// 	var ctx    = that.editor.game.getContext();
	// 	var buffer = that.audioBuffer;

	// 	var time = Date.now();
	// 	var lineOpacity = size.x / buffer.length  ;      
	//    	ctx.save();
	//    	ctx.fillStyle = '#222' ;
	//    	ctx.fillRect(0, 0, size.x, size.y);
	//    	ctx.strokeStyle = '#121';
	//    	ctx.globalCompositeOperation = 'lighter';
	//    	ctx.translate(0, size.y / 2);
	//    	ctx.globalAlpha = 0.06 ; // lineOpacity ;
	//    	for (var i = 0; i < buffer.length; i++) {
	//    	    // on which line do we get ?
	//    	    var x = Math.floor ( size.x * i / buffer.length ) ;
	//    	    var y = buffer[i] * size.h / 2 ;
	//    	    ctx.beginPath();
	//    	    ctx.moveTo( x  , 0 );
	//    	    ctx.lineTo( x+1, y );
	//    	    ctx.stroke();
	//    	}
	//    	ctx.restore();

	// 	console.log((Date.now() - time) + "ms");
	// });

	that.spectrumInterval = setInterval(function(){
		if(that.audioAnalyser == null || that.audioSource == null || that.audioContext == null) return true;
		if(that.sound == null) return false;
		if(document.getElementById("playSound") == null) return false;

		var size = {w: 350, h: 135};
		var ctx  = that.spectrumContext;

		ctx.clearRect(0, 0, size.w, size.h);

		var fbcArray = new Uint8Array(that.audioAnalyser.frequencyBinCount);
		that.audioAnalyser.getByteFrequencyData(fbcArray);

		ctx.fillStyle = '#00CCFF';

		var bars      = 175;
		var bar_width = 1, bar_margin = 1;
		var offset    = {x: 0, y: (size.h - 35)};	

		// Update bars
		for (var i = 0; i < bars; i++) {
			var bar_x = (i * (bar_width + bar_margin)) + offset.x;
			var bar_height = -(fbcArray[i] / 3);

			if(bar_height == 0) bar_height = -1;

			ctx.fillRect(bar_x, offset.y, bar_width, bar_height);
		}

		// Update time text
		ctx.fillStyle = '#00CCFF';
		ctx.font      = '15px Open Sans';
		var textPos = {x: 10, y: (size.h - 10)};

		var duration = that.sound.audio.duration;
		var currentT = that.sound.audio.currentTime;

		var percent  = (100 * currentT) / duration;
		if(document.getElementById("timelineCursor") != null)
			document.getElementById("timelineCursor").style.left = percent + "%";


		if(!that.sound.audio.ended) ctx.fillText(parseTime(currentT) + " / " + parseTime(duration), textPos.x, textPos.y);
		else{ctx.fillText("", textPos.x, textPos.y);document.getElementById("playSound").childNodes[0].className = "fa fa-play";}

	}, 1);
}
function parseTime(seconds){
	var mins = Math.floor(seconds / 60);
	var sec  = Math.round(seconds - mins * 60);

	return mins.pad(2) + ":" + sec.pad(2);
}