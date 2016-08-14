function dropFile(id, instructions, progressBarId){
	this.div          = document.getElementById(id);
	this.instructions = instructions;
	this.progressBar  = document.getElementById(progressBarId);

	this.fin = null;
	this.idi = null;
	this.intervalError = null;

	this.phpFile = "/core/ajax/uploadAssetFile.php";
	this.types   = ["image/jpeg", "image/png", "image/gif"];

	this.files = [];
	this.init();

	this.deposeEvents = [];
}

dropFile.prototype = {

	init: function(){
		if(this.div == null) return false;

		this.initDOM();
		this.initEvents();
	},

	initDOM: function(){
		// On ajout les instructions
		var span = document.createElement("span");
		span.innerHTML = this.instructions;
		this.div.appendChild(span);
		this.idi = span;

		// On ajoute l'input de type file
		var fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.name = "file";
		fileInput.style.opacity = 0;
		fileInput.style.position = "absolute";
		fileInput.style.left = 0;fileInput.style.right = 0;
		fileInput.style.bottom = 0;fileInput.style.top = 0;
		fileInput.style.width = "100%";fileInput.style.height = "100%";
		fileInput.style.zIndex = 1;
		fileInput.style.cursor = "pointer";
		
		this.div.appendChild(fileInput);
		this.fin = fileInput;
	},

	initEvents: function(){
		var that = this;

		this.div.ondragenter = function(e){
			e.preventDefault();
			this.classList.add("hover");
			this.classList.remove("error");

			if(that.intervalError != null){
				clearTimeout(that.intervalError);
				that.idi.innerHTML = that.instructions;
				that.intervalError = null;
			}
		}

		this.div.ondragover = function(e){
			e.preventDefault();
			this.classList.add("hover");
		}

		this.div.ondragleave = function(e){
			e.preventDefault();
			this.classList.remove("hover");
		}

		this.div.ondrop = function(e){
			e.preventDefault();
			this.classList.remove("hover");

			if(!that.verifyType(e.dataTransfer.files)){
				that.error("Format de fichier refusé.");
				return false;
			}

			that.files = e.dataTransfer.files;

			that.idi.innerHTML = "Fichier séléctionné: " + that.files[0].name;

			for(var i = 0; i < that.deposeEvents.length; i++)
				that.deposeEvents[i](that.files[0]);
		}

		this.fin.onclick = function(e){
			that.div.classList.remove("error");

			if(that.intervalError != null){
				clearTimeout(that.intervalError);
				that.idi.innerHTML = that.instructions;
				that.intervalError = null;
			}
		}

		this.fin.onchange = function(e){
			e.preventDefault();

			this.classList.remove("hover");
			if(this.files.length == 0) return false;
			if(!that.verifyType(this.files)){
				that.error("Format de fichier refusé.");
				return false;
			}

			that.files = this.files;
			that.idi.innerHTML = "Fichier séléctionné: " + that.files[0].name;

			for(var i = 0; i < that.deposeEvents.length; i++)
				that.deposeEvents[i](that.files[0]);
		}

	},

	upload: function(index, callback){
		var that = this;
		var file = this.files[index];
		if(file == null){callback("error"); return false;}

		var xhr  = new XMLHttpRequest();

		xhr.onload = function(e){
			var json = JSON.parse(e.target.responseText);
			if(json.error) callback(json.error);
			else callback(json);
		}

		if(this.progressBar != null) this.progressBar.style.display = "block";
		xhr.upload.onprogress = function(e){
			if(e.lengthComputable && that.progressBar != null){
				// console.log(e.loaded, e.total);
				var perc = (Math.round(100 * e.loaded / e.total));
				that.progressBar.getElementsByClassName("progress-bar")[0].style.width = perc + "%";
				that.progressBar.getElementsByClassName("progress-bar-perc")[0].innerHTML   = perc + "%";
			}
		}

		xhr.open("POST", this.phpFile, true);
		xhr.setRequestHeader("content-type", "multiport/form-data");
		xhr.setRequestHeader("x-file-type", file.type);
		xhr.setRequestHeader("x-file-size", file.size);
		xhr.setRequestHeader("x-file-name", file.name);
		xhr.send(file);
	},


	verifyType: function(files){
		var good = true;

		for(var i = 0; i < files.length; i++){
			var f = files[i];
			if(this.types.indexOf(f.type) == -1){good = false;break;}
		}

		return good;
	},

	error: function(message){
		this.div.classList.add("error");
		this.idi.innerHTML = message;

		var that = this;
		this.intervalError = setTimeout(function(){
			that.div.classList.remove("error");
			that.idi.innerHTML = that.instructions;
		}, 3000);
	},

	clean: function(){
		this.files = [];

		this.div.classList.remove("error");
		this.div.classList.remove("hover");
		this.idi.innerHTML = this.instructions;	
	},



	onFileDeposed: function(callback){
		this.deposeEvents.push(callback);
	}

};