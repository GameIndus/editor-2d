require("editors/sprite/ressource");
requires();

function SpriteEditor(Editor){
	this.editor = Editor;

	this.ressource = null;
	this.dropFile  = null;
	this.currentSelection = null;

	// Canvas Objects
	this.background   = null;
	this.image        = null;
	this.overlayCells = [];
	this.grid         = null;

	// Importer
	this.importerRessource  = null;
	this.importerProcessing = null;
	this.importerLoader     = null;

	// Preview
	this.canvasPreview = null;
	this.ctxPreview    = null;
	this.renderPreview = false;
	this.previewAnim   = null;

	this.gameCanvas = null;
}

SpriteEditor.prototype = {

	init: function(){
		var that = this;

		var rim = document.getElementById("ressourceImporter");
		rim.style.display = "block";

		css("editors/sprite");
		this.startLoader();

		this.ressource = new SpriteRessource();
	},
	load: function(){
		this.canvasPreview = document.getElementById("spritePreview");
		this.ctxPreview    = this.canvasPreview.getContext("2d");

		this.refreshAnimations();
		this.loadCanvasTriggers();
	},
	loadFromData: function(data){
		var self = this;
		if(data) data = JSON.parse(data);

		if(!data || data.ressource == null || data.saveVersion < 0.20){
			var rim 	= document.getElementById("ressourceImporter");
			var spinner = rim.querySelector(".spinner");

			if(spinner != null) spinner.parentNode.removeChild(spinner);
			rim.querySelector(".container").classList.remove("closed");
			rim.querySelector(".container").style.top = "-10000px";

			if(data && data.ressource == null)
				App.alert("Ancienne image", "Ce format d'image n'est plus pris en charge. Veuillez recommencer.", "danger", 8);

			setTimeout(function(){
				self.openRessourceImporter();
			}, 500);
		}else{
			self.initSprite(data);
		}
	},
	realtimeSend: function(submethod, data){
		var o = {submethod: submethod, file: App.getCurrentFile(), type: "sprite"};

		switch(submethod){
			case "initressource":
				o.srcname  = data.srcname;
				o.srcpath  = data.srcpath;
				o.srcsizew = data.srcsizew;
				o.srcsizeh = data.srcsizeh;
			break;
			case "addanimation": o.animname = data; break;
			case "removeanimation": o.animname = data; break;
			case "changeanimname" : o.animname = data.oldname; o.newname = data.newname; break;
			case "changeanimframebegin" : o.animname = data.name; o.frame = data.frame; break;
			case "changeanimframefinish" : o.animname = data.name; o.frame = data.frame; break;
			case "changeanimspeed" : o.animname = data.name; o.speed = data.speed; break;
			case "imageoptions" : o.gsw = data.gsw; o.gsh = data.gsh; break;
		}
		
		network.request("spriteeditor", o, null, "realtime", "realtime").send();
	},

	initSprite: function(sprite){
		var that = this;
		var initied = false;

		this.initRessource(sprite.ressource.path, sprite.ressource.name, function(res){
			if(initied) return false;
			initied = true;

			if(res == null){
				setTimeout(function(){
					var rim     = document.getElementById("ressourceImporter");
					var spinner = rim.querySelector(".spinner");

					rim.style.display = "block";
					that.startLoader();
					
					spinner.parentNode.removeChild(spinner);
					rim.querySelector(".container").classList.remove("closed");
					rim.querySelector(".container").style.top = "-10000px";

					setTimeout(function(){
						that.openRessourceImporter();
					}, 500);
				}, 500);
				return false;
			}	

			that.ressource.image  = res;
			that.ressource.size.w = res.width;
			that.ressource.size.h = res.height;
			that.ressource.cellSize.w = sprite.ressource.cellSize.w;
			that.ressource.cellSize.h = sprite.ressource.cellSize.h;

			that.ressource.animations = sprite.animations;

			that.initObjects();
			that.refreshAnimations();
		});
	},
	initObjects: function(){
		if(this.objectsInited) return false;

		this.objectsInited = true;

		var cs = Game.getSize();
		var sc = new Scene();

		this.background = new Background({color: "#BBB"});
		this.image      = new GameObject([this.ressource.getSize().w, this.ressource.getSize().h]);
		this.grid       = new GameObject([this.ressource.getSize().w + 2, this.ressource.getSize().h + 2]);

		this.background.setPosition(0, 0);
		this.background.setSize(cs.w, cs.h);

		this.image.setRenderer(new SpriteRenderer({
			name: "currentSprite"
		}));
		this.image.defineAnimation("idle", 0, [0, 0], [0]);
		this.image.setPosition(20, 20);
		this.image.setLayer(3);

		this.grid.setRenderer(new GeometricRenderer({
			type: "grid",
			color: "#383838",
			dashed: 2,
			lineWidth: 1,
			cellSize: [this.ressource.getCellSize().w, this.ressource.getCellSize().h]
		}));
		this.grid.setPosition(20, 20);
		this.grid.setLayer(2);

		sc.addBackground(this.background);
		sc.addGameObject(this.image);
		sc.addGameObject(this.grid);

		this.editor.game.addScene("default", sc);
		this.editor.game.setCurrentScene("default");

		renderPreview();
	},
	initRessource: function(src, name, callback, forceRealtime){
		var that = this;
		var relative = src.split("assets/")[1];

		this.ressource.path = src;
		this.ressource.name = name || relative.split(".")[0];
		
		// Init ressource
		this.editor.game.ressources.data = { currentSprite: { type: "img", src: relative }};
		this.editor.game.ressources.refreshRessourcesFromData();

		// Dispatch finish event
		Game.events.on('asyncLoadedRessources', function(e){
			var resso = that.editor.game.ressources.getRessource("currentSprite");
			
			if(resso != null){
				that.ressource.image  = resso;
				that.ressource.size.w = resso.width;
				that.ressource.size.h = resso.height;
			}

			if(forceRealtime)
				that.realtimeSend("initressource", {srcname: name, srcpath: src, srcsizew: resso.width, srcsizeh: resso.height});
				
			setTimeout(function(){
				if(forceRealtime){
					that.openImageOptionsDialog(function(options){
						if(that.importerLoader != null){
							var loader = that.importerLoader;
							loader.parentNode.style.display = "none";
						}else{
							document.getElementById("ressourceImporter").style.display = "none";
						}

						that.initObjects();
						that.refreshAnimations();

						that.ressource.cellSize = options.cellSize;
						that.reloadOverlay();
					});
				}else{
					if(callback != null) callback(resso);

					if(that.importerLoader != null){
						var loader = that.importerLoader;
						loader.parentNode.style.display = "none";
					}else{
						document.getElementById("ressourceImporter").style.display = "none";
					}

					that.initObjects();
					that.refreshAnimations();
				}

			}, 1000 * (Math.random() + 0.5));
		});
	},
	refreshAnimations: function(){
		var self = this;

		var ebar  = document.getElementById("spriteEditorBar");
		var cont  = ebar.querySelector(".animations-list");
		var anims = this.ressource.getAnimations();

		cont.innerHTML = "";

		for(var i = 0; i < Object.keys(anims).length; i++){
			var name = Object.keys(anims)[i];
			var anim = anims[name];

			var line = document.createElement("div");
			line.className = "animation";

			line.dataset.animName = name;
			line.innerHTML = name;

			line.onclick = function(){
				var lines = cont.querySelectorAll(".animation");
				for(var i = 0; i < lines.length; i++) lines[i].classList.remove("active");

				self.playAnimation(null);

				self.moveObjectActionsTo(this.offsetTop + 30 - cont.scrollTop);

				this.classList.add("active");
				self.playAnimation(this.dataset.animName);
			}

			cont.appendChild(line);
			 
		} 

		cont.onclick = function(e){
			var target = e.target;

			if(target.getAttribute("class") == "animations-list"){
				var anims = cont.querySelectorAll(".animation");
				for(var i = 0; i < anims.length; i++) anims[i].classList.remove("active");

				self.playAnimation(null);
			}
		}

		cont.onscroll = function(){
			var currentLine = this.querySelector(".animation.active");
			if(currentLine == null) return false;
			var element = document.querySelector(".action-btns");
			
			element.setStyle("top", (currentLine.offsetTop + 30 - this.scrollTop) + "px");
		}

		ebar.querySelector(".add-animation").onclick = function(e){
			self.openAnimationCreatorDialog(function(name){
				self.ressource.setAnimation(name, 0, 0, 1);
				self.refreshAnimations();

				self.playAnimation(name);

				self.realtimeSend("addanimation", name);
			});
		}
		ebar.querySelector(".image-options").onclick = function(e){
			self.openImageOptionsDialog(function(options){
				self.ressource.cellSize = options.cellSize;

				self.reloadOverlay();
			});
		}

		ebar.querySelector(".rename-animation").onclick = function(){
			if(self.previewAnim == null) return false;
			var animName = self.previewAnim;

			self.openAnimationRenameDialog(animName, function(newAnimName, trigger){
				var anims   = cont.querySelectorAll(".animation");
				var animDom = null;

				if(trigger == "closeAlert" || animName == newAnimName) return false;

				for(var i = 0; i < anims.length; i++)
					if(anims[i].dataset.animName == animName) 
						animDom = anims[i];

				if(animDom == null) return false;

				self.ressource.renameAnimation(animName, newAnimName);
				self.previewAnim = newAnimName;

				self.realtimeSend("changeanimname", {oldname: animName, newname: newAnimName});

				animDom.innerHTML = newAnimName;animDom.dataset.animName = newAnimName;

				if(ebar.querySelector(".properties .title") != null){
					var title = ebar.querySelector(".properties .title");
					title.innerHTML = title.innerHTML.replace(animName, newAnimName);
				}
			});
		}

		ebar.querySelector(".remove-animation").onclick = function(){
			if(self.previewAnim == null) return false;
			if(!confirm("Voulez-vous vraiment supprimer cette animation ?")) return false;

			var animName = self.previewAnim;

			self.deleteAnimation(animName);
			self.realtimeSend("removeanimation", animName);
		}
	},
	loadCanvasTriggers: function(){
		var self = this;
		Input.reset();

		var imageOffset = 20;

		function getCurrentTile(ressource, position, strict){
			if(ressource == null || position == null) return -1;

			var maxTileX = Math.floor(ressource.getSize().w / ressource.getCellSize().w),
				maxTileY = Math.floor(ressource.getSize().h / ressource.getCellSize().h);

			var tileX = Math.floor(position.getX() / ressource.getCellSize().w),
				tileY = Math.floor(position.getY() / ressource.getCellSize().h);

			if(strict && tileX > maxTileX - 1) return -1;
			if(strict && tileY > maxTileY - 1) return -1;

			if(tileX > maxTileX) tileX = maxTileX;
			if(tileY > maxTileY) tileY = maxTileY;

			var tile = tileX + tileY * maxTileX;
			return (tile > ressource.getFramesNumber() - 1) ? ressource.getFramesNumber() - 1 : tile;
		}

		Input.mouseDown("left", function(e){
			if(e.target.id != "spriteEditor") return false;
			var pos = e.getEditorPosition().substract(new Position(imageOffset, imageOffset));
			if(pos.getX() < 0 || pos.getY() < 0 || self.ressource == null || self.previewAnim == null) return false;

			var tile = getCurrentTile(self.ressource, pos, true);
			if(tile == -1) return false;
			
			self.currentSelection = {
				begin: tile,
				end: tile
			}
		}, true);
		Input.mouseMove(function(e){
			if(!Input.mouseIsDown("left") || e.target.id != "spriteEditor") return false;
			var pos = e.getEditorPosition().substract(new Position(imageOffset, imageOffset));
			if(self.ressource == null || self.previewAnim == null || self.currentSelection == null) return false;

			if(pos.getX() < 0) pos.setX(0);
			if(pos.getY() < 0) pos.setY(0);


			var tile = getCurrentTile(self.ressource, pos);

			if(tile < self.currentSelection.begin){
				var tmpBegin = self.currentSelection.begin;
				self.currentSelection.begin = tile;
				tile = tmpBegin;
			}
			if(tile > self.currentSelection.end) self.currentSelection.end = tile;

			self.reloadOverlayWithSelection(self.currentSelection);
		});
		Input.mouseUp("left", function(e){
			if(e.target.id != "spriteEditor") return false;
			var pos = e.getEditorPosition().substract(new Position(imageOffset, imageOffset));
			if(self.ressource == null || self.previewAnim == null || self.currentSelection == null) return false;

			self.reloadOverlayWithSelection(self.currentSelection, true);
		}, true);
	},
	

	uploadRessourceFromComputer: function(file, callback){
		var that = this;
		var img  = file;

	    var fileName = img.name; // not path
	    var fileSize = img.size; // bytes
	    var fileType = img.type; // Type

	    if(!fileType.match("image/*")){
	    	alert('Vous devez envoyer une image. (png, jpeg, gif...)');
	    	return false;
	    }

		// Send file
		var formData = new FormData();
		var xhr      = new XMLHttpRequest();
		
		formData.append(fileName, img, fileName);
		xhr.open('POST', 'lib/ajax/uploadFile.php', true);
		xhr.onload = function () {
		  	if (xhr.status === 200) {
	    		if(xhr.responseText == "error_moving_file"){
	    			return false;
	    		}

	    		callback();
		  	} else {
		  	}
		};
		xhr.send(formData);
	},
	openRessourceImporter: function(){
		var that = this;

		var div = document.getElementById("ressourceImporter");
		var container = div.querySelector('.container');

		div.style.display = "block";

		// Center container
		var divSizes       = div.getBoundingClientRect();
		var containerSizes = container.getBoundingClientRect();

		container.style.left = (divSizes.width / 2 - containerSizes.width / 2) + "px";
		container.style.top = (divSizes.height / 2 - containerSizes.height / 2) + "px";


		/**
		** 	Sending
		**/
		var initSendingBtn = function(el){
			el.onclick = function(e){
				if(that.importerProcessing || that.importerRessource == null) return false;
				var ir = that.importerRessource;
				that.importerProcessing = true;

				this.classList.add("loading");
				this.innerHTML = '<div class="spinner spinner-blue spinner-medium" style="top:10px;left:-20px"></div> Chargement...';

				switch(ir.from){
					case "computer":
						setTimeout(function(){
							that.uploadRessourceFromComputer(ir.file, function(){
								that.initRessource("assets/" + ir.filename, ir.name, null, true);

								network.request("saveRessource", {src: ir.filename, name: ir.name}).send();

								initLoader();
							});
						}, 2000 * Math.random());
					break;
					case "manager":
						setTimeout(function(){
							that.initRessource("assets/" + ir.filename, ir.name, null, true);

							initLoader();
						}, 3000 * Math.random());
					break;
					case "market":
						setTimeout(function(){
							network.request("moveMarketAsset", {filename: ir.filename}, function(data){
								network.request("saveRessource", {name: ir.name, src: data.newFilename}, function(d){
									that.initRessource("assets/" + data.newFilename, ir.name, null, true);

									initLoader();
								}, "spriteeditor").send()
							}, "spriteeditor").send();
						}, 2000 * Math.random());
					break;
				}
			}
		}
		var initLoader = function(){
			that.importerLoader = that.startLoader();
		};


		/**
		**	Tabs system	
		**/
		var acts     = container.querySelector(".actions").querySelectorAll(".action");
		var tabs     = container.querySelector(".tabs").querySelectorAll(".tab");
		var subTitle = container.querySelector(".subtitle");

		for(var i = 0; i < tabs.length; i++){
			if(tabs[i].dataset && tabs[i].dataset.primary === "") continue;
			tabs[i].style.display = "none";
		}

		for(var i = 0; i < acts.length; i++){
			var act = acts[i];
			if(!act.dataset || !act.dataset.type) continue;

			if(act.dataset.type == "send"){
				initSendingBtn(act);
				continue;
			}

			act.onclick = function(e){
				var type = this.dataset.type;
				if(that.importerProcessing) return false;

				hideSend();

				for(var j = 0; j < acts.length; j++) acts[j].classList.remove("active");
				for(var j = 0; j < tabs.length; j++) tabs[j].style.display = "none";

				this.classList.add("active");
				for(var j = 0; j < tabs.length; j++){
					var tab = tabs[j];
					if(tab.dataset.type == this.dataset.type) tab.style.display = "block";
				}

				var actTextS = this.innerHTML.split(" ");
				actTextS.splice(0, 3);
				var actText = "";
				for(var j = 0; j < actTextS.length; j++) actText += actTextS[j] + " ";
				actText = actText.substring(6, actText.length - 1);

				subTitle.innerHTML = actText;

				if(type == "manager"){
					srcManager.openImporterIn("managerImporter", function(src){
						if(that.importerProcessing) return false;

						var index = -1;
						for(var i = 0; i < Object.keys(srcManager.assets).length; i++){
							var key = Object.keys(srcManager.assets)[i];
							if(srcManager.assets[key] == src) index = key;
						}

						if(index == -1) return false;

						var container = document.getElementById(srcManager.windowId);
						var assets    = container.querySelectorAll(".ressource");
						var asset     = null;

						for(var i = 0; i < assets.length; i++) if(assets[i].dataset.index == index) asset = assets[i];
						if(asset == null) return false;
						for(var i = 0; i < assets.length; i++) assets[i].querySelector(".preview").classList.remove("checked");

						asset.querySelector(".preview").classList.add("checked");
						that.importerRessource = {
							from: "manager",
							name: asset.querySelector(".name").innerHTML,
							filename: src.split("/")[src.split("/").length - 1],
							src: src
						};

						printSend();
					});
				}else if(type == "market"){
					gIMarket.openIn("mmImporter", "image");
					gIMarket.onAssetsLoaded(function(assets){
						hideSend();
						var results = document.getElementById("mmImporter").querySelectorAll(".result");

						for(var i = 0; i < results.length; i++){
							var result = results[i];

							result.onclick = function(e){
								if(that.importerProcessing) return false;
								e.preventDefault();

								for(var j = 0; j < results.length; j++) results[j].classList.remove("checked");

								this.classList.add("checked");

								printSend();
								that.importerRessource = {
									from: "market",
									name: this.dataset.name,
									filename: this.dataset.filename,
									src: that.editor.getProjectIdFormatted() + "/assets/" + this.dataset.filename
								};

								return false;
							}
						}
					});
				}else if(type == "computer"){
					if(that.dropFile != null) that.dropFile.clean();
				}
			}
		}

		/**
		**	From computer 
		**/
		this.dropFile = new dropFile("dropfile", "Déposer votre fichier ici.");

		this.dropFile.onFileDeposed(function(file){
			if(that.importerProcessing) return false;

			that.importerRessource = {
				from: "computer",
				file: file,
				name: file.name.split(".")[0],
				filename: file.name,
				src: App.getProject().getFormattedEditorId() + "/assets/" + file.name
			};

			printSend();
		});


		var printSend = function(){
			var acts     = container.querySelector(".actions").querySelectorAll(".action");
			for(var i = 0; i < acts.length; i++){
				var act = acts[i];
				if(act.dataset != null && act.dataset.type == "send") act.style.display = "block";
			}
		};
		var hideSend = function(){
			var acts     = container.querySelector(".actions").querySelectorAll(".action");
			for(var i = 0; i < acts.length; i++){
				var act = acts[i];
				if(act.dataset != null && act.dataset.type == "send") act.style.display = "none";
			}

			that.importerRessource = null;
		};
	},

	startLoader: function(){
		var div = document.getElementById("ressourceImporter");
		var container = div.querySelector(".container");
		container.classList.add("closed");

		var loading = document.createElement("div");
		loading.className = "loader";
		loading.style.position = "absolute";
		loading.innerHTML = '<svg id="spinner_loader" class="spinner hide" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>';

		container.parentNode.appendChild(loading);

		var cont2 = loading.parentNode;
		var size  = [loading.offsetWidth, loading.offsetHeight];
		var wsize = [cont2.offsetWidth, cont2.offsetHeight];

		loading.style.left = (wsize[0]/2-size[0]/2) + "px";
		loading.style.top  = (wsize[1]/2-size[1]/2) + "px";

		return loading;
	},


	reloadOverlay: function(){
		var scene  = this.editor.game.getCurrentScene(); 
		
		if(this.previewAnim == null){
			for(var i=0;i<this.overlayCells.length;i++)
				scene.removeGameObject(this.overlayCells[i]);

			this.grid.getRenderer().cellSize = [this.ressource.getCellSize().w, this.ressource.getCellSize().h];
			return false;
		}

		var size   = this.ressource.getCellSize();
		var name   = this.previewAnim;
		var anim   = this.ressource.getAnimation(name);

		if(anim == null) return false;

		var begin  = anim.begin;
		var finish = anim.finish;
		var speed  = anim.speed;

		// Clear overlayCells drawed
		for(var i = 0;i < this.overlayCells.length; i++)
			scene.removeGameObject(this.overlayCells[i]);

		this.overlayCells = [];

		if(begin > finish) return false;

		var cellsPerLine   = this.ressource.getSize().w / size.w;
		var cellsPerColumn = this.ressource.getSize().h / size.h;
		var cellsToAdd     = (finish - begin) + 1;
		var linesToAdd	   = Math.ceil(cellsToAdd / cellsPerLine);
		var offsetX        = begin;

		var currentY = 0, currentX = 0, cellsRemoved = 0, cellNum = 0;
		for(var i = 0; i < cellsToAdd; i++){ // Number of cells/overlays to add
			var ov = new GameObject([0, 0]);
			var n  = i - cellsRemoved;

			if(i + 1 > cellsPerLine * cellsPerColumn) break ;

			if(currentX + 1 >= cellsPerLine){
				currentX = 0;
				cellNum  = 1;
				currentY++;
			}else{
				currentX = cellNum;
				cellNum++;
			}

			if(offsetX > 0){
				cellsToAdd++;
				cellsRemoved++;
				offsetX--;
				continue ;
			}

			var cellX = currentX * size.w;
			var cellY = currentY * size.h;

			if(cellsToAdd == 1 && cellX == 0) cellY = 0;

			ov.setRenderer(new GeometricRenderer({
				color: "#A65EA6"
			}));
			ov.setLayer(1);
			ov.setSize(size.w, size.h);
			ov.setPosition(cellX + 20, cellY + 20);

			scene.addGameObject(ov);

			this.overlayCells.push(ov);
		}

		this.grid.getRenderer().cellSize = [this.ressource.getCellSize().w, this.ressource.getCellSize().h];
	},
	reloadOverlayWithSelection: function(selection, save){
		if(this.previewAnim == null) return false;
		var animationName = this.previewAnim;
		var animation     = this.ressource.getAnimation(animationName);

		animation.begin = selection.begin;
		if(selection.end > -1) animation.finish = selection.end;

		// Reload properties fields
		var propContainer = document.querySelector(".properties");
		if(propContainer != null && propContainer.innerHTML != ""){
			var beginField  = propContainer.querySelector(".input[data-property='begin'] input");
			var finishField = propContainer.querySelector(".input[data-property='finish'] input");

			beginField.value  = animation.begin;
			finishField.value = animation.finish;
		}

		this.reloadOverlay();
		
		if(save){
			this.currentSelection = null;
			this.realtimeSend("changeanimframebegin", {name: this.previewAnim, frame: animation.begin});
			this.realtimeSend("changeanimframefinish", {name: this.previewAnim, frame: animation.finish});
		}
	},


	playAnimation: function(name){
		if(this.ressource == null) return false;

		if(name == null){
			this.ctxPreview.clearRect(0, 0, this.canvasPreview.width, this.canvasPreview.height);
			this.renderPreview = false;
			this.previewAnim   = null;

			this.loadPropertiesOf(null);
			this.moveObjectActionsTo(-15000);
			this.reloadOverlay();

			return false;
		}

		_spriteRenderIndex = 0;

		this.renderPreview = true;
		this.previewAnim   = name;

		this.loadPropertiesOf(this.ressource.getAnimation(name), name);
		this.reloadOverlay();
	},
	updateAnimationFromRealtime: function(name, type, value){
		if(this.ressource == null) return false;

		var properties = document.querySelector(".properties");
		var input      = null;

		if(properties != null){
			var inputs = properties.querySelectorAll(".input");
			for(var i = 0; i < inputs.length; i++){
				var currentInput = inputs[i];
				if(currentInput.dataset.property == type)
					input = currentInput.querySelector("input");
			}
		}

		switch(type){
			case "name":
				var ebar    = document.getElementById("spriteEditorBar");
				var cont 	= ebar.querySelector(".animations-list");
				var anims   = cont.querySelectorAll(".animation");
				var animDom = null;

				for(var i = 0; i < anims.length; i++)
					if(anims[i].dataset.animName == name) 
						animDom = anims[i];

				if(animDom != null)
					animDom.innerHTML = value;animDom.dataset.animName = value;

				this.ressource.renameAnimation(name, value);
				if(this.previewAnim == name){
					this.previewAnim = value;
				}


				if(ebar.querySelector(".properties .title") != null){
					var title = ebar.querySelector(".properties .title");
					title.innerHTML = title.innerHTML.replace(name, value);
				}
			break;
			case "begin":
				var val = (!isNaN(parseInt(value))) ? parseInt(value) : 0;
				this.ressource.getAnimation(name).begin = val;

				if(input != null) input.value = value;
			break;
			case "finish":
				var val = (!isNaN(parseInt(value))) ? parseInt(value) : 0;
				this.ressource.getAnimation(name).finish = val;

				if(input != null) input.value = value;
			break;
			case "speed":
				var val = (!isNaN(parseFloat(value))) ? parseFloat(value) : 0;
				this.ressource.getAnimation(name).speed = val;

				if(input != null) input.value = value;
			break;
		}

		this.reloadOverlay();
	},
	deleteAnimation: function(name){
		if(this.ressource == null) return false;

		this.playAnimation(null);
		this.ressource.deleteAnimation(name);

		var ebar  = document.getElementById("spriteEditorBar");
		var lines = ebar.querySelectorAll(".animation");
		var line  = null;

		for(var i = 0; i < lines.length; i++)
			if(lines[i].dataset.animName == name) line = lines[i];

		if(line != null) line.remove();
	},
	changeAnimationParam: function(el){
		this.updateAnimation(el.parentNode.parentNode.dataset.animName, el.dataset.type, el.value, el);
	},

	loadPropertiesOf: function(animation, name){
		var properties = document.querySelector("main #editor-container #spriteEditorBar .properties");
		properties.innerHTML = "";

		if(animation == null) return false;
		var self = this;

		function createProperty(headingTitle, properties){
			var div        = document.createElement("div");
			var heading    = document.createElement("div");
			var content    = document.createElement("div");


			div.className	  = "property";
			heading.className = "heading";
			content.className = "content";
			div.appendChild(heading);div.appendChild(content);

			heading.innerHTML = headingTitle;

			for(var i = 0; i < Object.keys(properties).length; i++){
				var label = Object.keys(properties)[i];
				var o     = properties[label];

				var extras = "";
				if(o.type == "number"){
					if(o.min != null) extras += ' min="' + o.min + '"';
					if(o.max != null) extras += ' max="' + o.max + '"';
				}

				var input = document.createElement("div");
				input.className        = "input";
				input.dataset.property = o.property;
				input.innerHTML        = '<label>' + label + '</label>';

				input.innerHTML += '<input type="' + o.type + '" value="' + o.data + '" onkeyup="return currentEditor.fieldPropertyUpdate(this);" onchange="return currentEditor.fieldPropertyUpdate(this, true);" placeholder="' + o.placeholder + '"' + extras + '></input>';
				input.innerHTML += '<div class="clear"></div>';

				div.appendChild(input);
			}

			return div;
		}

		var ressourceFrames = this.ressource.getFramesNumber();

		properties.innerHTML = "<div class='title'>Animation : " + name + "</div>";

		properties.appendChild(createProperty("Images de l'animation", {
			"Début" : {type: "number", property: "begin", placeholder: "Numéro", min: 0, max: (ressourceFrames - 1), data: animation.begin},
			"Fin" : {type: "number", property: "finish", placeholder: "Numéro", min: 0, max: (ressourceFrames - 1), data: animation.finish}
		}));
		properties.appendChild(createProperty("Vitesse de l'animation", {
			"Vitesse" : {type: "number", property: "speed", placeholder: "Vitesse", min: 0, max: 100, data: animation.speed}
		}));
	},
	fieldPropertyUpdate: function(element, forceSave){
		var currentAnimationName = this.previewAnim;
		
		if(currentAnimationName == null) return false;
		if(isNaN(element.value)) return false;

		var animation = this.ressource.getAnimation(currentAnimationName); 
		var property  = element.parentNode.dataset.property;
		var value     = parseInt(element.value);

		animation[property] = value;


		var realtimeObject = {name: currentAnimationName};
		if(property == "begin" || property == "finish") realtimeObject.frame = value;
		else if(property == "speed") realtimeObject.speed = value;

		if(property == "begin" || property == "finish") property = "frame" + property;
		this.realtimeSend("changeanim" + property, realtimeObject);
		
		this.reloadOverlay();
	},

	openAnimationCreatorDialog: function(callback){
		var that = this;

		App.modal(
			"<i class='fa fa-male'></i> Créer une animation",
			"<div class='input'><label for='animName'>Nom</label><input type='text' id='animName' placeholder=\"Nom de l 'animation\"></div>" +
			"<div class='btn closeAlert'><i class='fa fa-male'></i> Créer</div><div class='clear'></div>", 
			
			function(div, trigger){
				var an = document.getElementById("animName").value;
				if(an == null || an == "" || trigger == "closeAlert") return false;

				callback(an);
			}
		, 500);

		setTimeout(function(){
			document.getElementById("animName").focus();
		}, 100);
	},
	openAnimationRenameDialog: function(animation, callback){
		var that = this;

		App.modal(
			"<i class='fa fa-pencil'></i> Renommer l'animation " + animation,
			"<div class='input'><label for='animName'>Nom</label><input type='text' id='animName' value='" + animation + "' placeholder=\"Nom de l'animation\"></div>" +
			"<div class='btn closeAlert'><i class='fa fa-pencil'></i> Renommer</div><div class='clear'></div>", 
			
			function(div, trigger){
				var an = document.getElementById("animName").value;
				if(an == null || an == "") return false;

				callback(an, trigger);
			}
		, 500);

		setTimeout(function(){
			var el = document.getElementById("animName");
			el.focus();
			el.setSelectionRange(el.value.length, el.value.length);
		}, 100);
	},
	openImageOptionsDialog: function(callback){
		var that = this;

		var cellSize = {w: Math.ceil(this.ressource.getSize().w / this.ressource.getCellSize().w), h: Math.ceil(this.ressource.getSize().h / this.ressource.getCellSize().h)};
		if(cellSize.w < 0) cellSize.w = 0;
		if(cellSize.h < 0) cellSize.h = 0;

		App.modal(
			"<i class='fa fa-cogs'></i> Options de l'image",
			"<div style='display:block;position:relative;float:left;width:60%;margin-right:2.5%;margin-bottom:20px'><h2>Taille de la grille de découpage</h2><p>Veillez à ce que chaque image de votre sprite se trouve au centre des carreaux.</p><br><div class='input'><label for='gridSizeWidth'>Nombre d'images en largeur</label><input type='text' value='" + cellSize.w + "' onkeyup='currentEditor.refreshImageOptionsDialogCanvas(true);' id='gridSizeWidth' style='margin:0' placeholder=\"Largeur\"></div><br><div class='input'><label for='gridSizeHeight'>Nombre d'images en hauteur</label><input type='text' id='gridSizeHeight' value='" + cellSize.h + "' onkeyup='currentEditor.refreshImageOptionsDialogCanvas(true);' style='margin:0' placeholder=\"Hauteur\"></div></div>" +
			"<div style='display:block;position:relative;float:left;width:35%;margin-left:2.5%;margin-bottom:20px'><canvas id='imageOptionsDialogCanvas' style='width:235px;height:200px'></canvas></div>" +
			"<div class='btn btn-success closeAlert' style='width:160px;float:right'><i class='fa fa-save' style='padding-right:8px'></i> Sauvegarder</div><div class='clear'></div>", 
			
			function(){
				var gsw = document.getElementById("gridSizeWidth").value;
				var gsh = document.getElementById("gridSizeHeight").value;

				try{
					parseInt(gsw);
					parseInt(gsh);
				} catch(e){
					alert("Nombres mal formatés.");
					return false;
				}

				var srcSize  = {w: that.ressource.getSize().w, h: that.ressource.getSize().h};
				callback({cellSize: {w: Math.round(srcSize.w / parseInt(gsw)), h: Math.round(srcSize.h / parseInt(gsh))}});
			}
		, 700);

		setTimeout(function(){
			var el = document.getElementById("gridSizeWidth");
			el.focus();
			el.setSelectionRange(el.value.length, el.value.length);

			that.refreshImageOptionsDialogCanvas();
		}, 100);
	},

	refreshImageOptionsDialogCanvas: function(fromInput, blockRealtime){
		var that = this;

		var c = document.getElementById("imageOptionsDialogCanvas");
		if(c == null) return false;

		c.width  = 235;
		c.height = 200;

		var ctx = c.getContext("2d");
		ctx.clearRect(0, 0, c.width, c.height);

		ctx.fillStyle = "#EEE";
		ctx.fillRect(0, 0, c.width, c.height);

		var srcSize  = {w: this.ressource.getSize().w, h: this.ressource.getSize().h};
		var drawSize = {w: c.width, h: c.height};

		if(srcSize.w < c.width) drawSize.w = srcSize.w;
		if(srcSize.h < c.height) drawSize.h = srcSize.h;

		var offset = {x: (c.width / 2 - drawSize.w / 2), y: (c.height / 2 - drawSize.h / 2)};

		ctx.drawImage(this.ressource.image, 0, 0, srcSize.w, srcSize.h,
					  offset.x, offset.y, drawSize.w, drawSize.h);

		var p   = offset;
		var img = this.ressource.image;
		var cw  = c.width + (p.x * 2) + 1;
		var ch  = c.height + (p.y * 2) + 1;

		var csm = {w: (that.ressource.getCellSize().w), h: (that.ressource.getCellSize().h)};
		if(csm.w < 0){csm.w = srcSize.w;that.ressource.cellSize.w = srcSize.w;}
		if(csm.h < 0){csm.h = srcSize.h;that.ressource.cellSize.h = srcSize.h;}

		if(fromInput){
			var gsw = document.getElementById("gridSizeWidth").value;
			var gsh = document.getElementById("gridSizeHeight").value;

			csm.w = Math.round(srcSize.w / gsw);
			csm.h = Math.round(srcSize.h / gsh);

			// Push value in relatime
			if(!Utils.isInteger(gsw)) gsw = 0;
			if(!Utils.isInteger(gsh)) gsh = 0;

			if(!blockRealtime) this.realtimeSend("imageoptions", {gsw: parseInt(gsw), gsh: parseInt(gsh)});
		}

		if(srcSize.w - drawSize.w > 0) csm.w -= (srcSize.w - drawSize.w) / (srcSize.w / csm.w);
		if(srcSize.h - drawSize.h > 0) csm.h -= (srcSize.h - drawSize.h) / (srcSize.h / csm.h);

		var gridSize = {w: c.width, h: c.height};

		if(srcSize.w < c.width) gridSize.w = srcSize.w;
		if(srcSize.h < c.height) gridSize.h = srcSize.h;

		function drawBoard(){
		    for (var x = 0; x <= gridSize.w; x += csm.w) {
		        ctx.moveTo(0.5 + x + p.x, p.y);
		        ctx.lineTo(0.5 + x + p.x, img.height + p.y);
		    }

		    for (var x = 0; x <= gridSize.h; x += csm.h) {
		        ctx.moveTo(p.x, 0.5 + x + p.y);
		        ctx.lineTo(img.width + p.x, 0.5 + x + p.y);
		    }

		    ctx.strokeStyle = "#BBB";
		    ctx.stroke();
		}

		drawBoard();
	},
	moveObjectActionsTo: function(top){
		var element = document.querySelector(".action-btns");
		if(top == element.offsetTop) return false;
		
		element.show();

		element.setStyle("right", "-300px");
		element.setStyle("top", top + "px");

		setTimeout(function(){
			element.setStyle("right", 0);
		}, 10);
	}

};

var _spriteRenderIndex = 0;
function renderPreview(){

	if(currentEditor.renderPreview && currentEditor.ressource != null 
	&& currentEditor.previewAnim != null){

		var res = currentEditor.ressource;
		var ctx = currentEditor.ctxPreview;

		var anim = res.getAnimation(currentEditor.previewAnim);
		if(anim == null){requestAnimationFrame(renderPreview);return false;}
		var cs   = res.getCellSize();

		// Gnerate anim
		var max   = (anim.finish - anim.begin) + 1;
		
		var _id   = Math.floor(_spriteRenderIndex);
		var frame = anim.begin + (_id % max);

		var lines = {x: Math.round(res.getSize().h / cs.h), y: Math.round(res.getSize().w / cs.w)};
		var cellsByLines = {x: lines.y, y: lines.x};
		
		var curLine = Math.floor(frame / cellsByLines.x);
		var x = (frame - curLine * cellsByLines.x) * cs.w, y = curLine * cs.h;

		ctx.clearRect(0, 0, currentEditor.canvasPreview.width, currentEditor.canvasPreview.height);

		ctx.drawImage(res.image,
					  x, y, cs.w, cs.h, 
					  20, 5, currentEditor.canvasPreview.width - 10, currentEditor.canvasPreview.height - 10);

		ctx.font = "15px Helvetica";
		// ctx.fillText("Image: " + frame, 150, 200);

		_spriteRenderIndex += anim.speed * currentEditor.editor.game.delta;
		// _spriteRenderIndex++;
	}

	requestAnimationFrame(renderPreview);
}