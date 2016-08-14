require("editors/tilemap/ressource");
require("editors/tilemap/selection");
require("editors/tilemap/selectzone");
require("editors/tilemap/workspace");
require("editors/tilemap/tile");

function TilemapEditor(Editor){
	this.editor = Editor;

	this.ressource  = null;
	this.selection  = null;
	this.selectzone = null;
	this.workspace  = null;

	this.loaded 	  = false;
}

TilemapEditor.prototype = {

	init: function(){
		var that = this;
		css("editors/tilemap");

		this.ressource  = new TilemapRessource();
		this.selection  = new TilemapSelection();
		this.selectzone = new TilemapSelectzone(this);
		this.workspace  = new TilemapWorkspace(this);

		var rim = document.getElementById("ressourceImporter");
		rim.style.display = "block";
		this.workspace.game = this.editor.game;
		this.workspace.startLoader();
	},

	load: function(){
		var that = this;
		document.getElementById("editor-container").dataset.type = "tilemap";

		this.workspace.init();

		if(this.loaded){
			this.workspace.changeMapOverlay(this.workspace.size.w, this.workspace.size.h);
			this.selectzone.init();
		}
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
				App.alert("Ancienne carte", "Ce format de carte n'est plus pris en charge. Vous allez démarrer dans une carte vide.", "danger", 8);

			setTimeout(function(){
				self.workspace.openRessourceImporter();
			}, 500);
		}else{
			this.initTilemap(data);
		}
	},

	realtimeSend: function(submethod, data){
		var o = {submethod: submethod, file: App.getCurrentFile(), type: "tilemap"};

		switch(submethod){
			case "initressource":
				o.srcname  = data.srcname;
				o.srcpath  = data.srcpath;
				o.srcsizew = data.srcsizew;
				o.srcsizeh = data.srcsizeh;
			break;
			case "changeselectionsize": o.sizew = data.w; o.sizeh = data.h; break;
			case "changemapsize": o.sizew = data.w; o.sizeh = data.h; break;
			case "changetilesolidity": 
				o.layer = data.layer; 
				o.posx  = data.posx; 
				o.posy  = data.posy; 
				o.value = data.value; 
			break;
			case "replacetile": 
				o.posx     = data.posx; 
				o.posy     = data.posy; 
				o.layer    = data.layer; 
				o.texturex = data.texturex; 
				o.texturey = data.texturey; 
			break;
			case "newtile": 
				o.posx     = data.posx;
				o.posy     = data.posy;
				o.layer    = data.layer;
				o.texturex = data.texturex; 
				o.texturey = data.texturey; 
			break;
			case "removetile": 
				o.posx  = data.posx;
				o.posy  = data.posy;
				o.layer = data.layer;
			break;
		}

		network.request("tilemapeditor", o, null, "realtime", "realtime").send();
	},

	initTilemap: function(tilemap){
		var that = this;
		var initied = false;

		this.initRessource(tilemap.ressource.path, tilemap.ressource.name, function(res){
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
						that.workspace.openRessourceImporter();
					}, 500);
				}, 500);
				return false;
			}	

			that.ressource.image    = res;
			that.ressource.size     = tilemap.ressource.size;
			that.ressource.cellSize = tilemap.ressource.cellSize;

			that.workspace.changeMapOverlay(tilemap.size.w, tilemap.size.h);

			if(tilemap.tiles.length > 0){
				tilemap.tiles.promiseForEach(function(tileString){
					var tile = new TilemapTile().fromRawString(tileString);
					that.workspace.game.getCurrentScene().add(tile.create());
					that.workspace.tiles.push(tile);
				}, function(){
					that.loaded = true;
					that.workspace.changeLayerTo(0);
				});
			}else{
				that.loaded = true;
			}

			if(that.ressource.cellSize.w == -1 || that.ressource.cellSize.h == -1){
				that.workspace.openParamBox(true, true);
			} 
		});
	},
	initRessource: function(src, name, callback, forceRealtime){
		var that     = this;
		var relative = src.split("assets/")[1];

		this.ressource.path = src;
		this.ressource.name = name || relative.split(".")[0];
		
		// Param canvas
		Game.getCanvas().setSize(Game.getSize().getWidth(), Game.getSize().getHeight() - 53);
		Game.getCanvas().canvas.setStyle("margin-top", "53px");

		// Init ressource & background
		this.editor.game.ressources.data = { currentTileset: { type: "img", src: relative }};
		this.editor.game.ressources.refreshRessourcesFromData();

		// Dispatch finish event
		Game.events.on('asyncLoadedRessources', function(e){
			var resso = that.editor.game.ressources.getRessource("currentTileset");
			
			if(resso != null){
				that.ressource.image  = resso;
				that.ressource.size.w = resso.width;
				that.ressource.size.h = resso.height;
			}

			if(forceRealtime)
				that.realtimeSend("initressource", {srcname: name, srcpath: src, srcsizew: resso.width, srcsizeh: resso.height});
				
			setTimeout(function(){
				var scene = that.editor.game.getCurrentScene();

				if(callback != null) callback(resso);

				if(that.importerLoader != null){
					var loader = that.importerLoader;
					loader.parentNode.style.display = "none";
				}else{
					if(document.getElementById("ressourceImporter") != null)
						document.getElementById("ressourceImporter").style.display = "none";
				}

				if(callback == null) that.workspace.openParamBox(true, true);
			}, 1000 * (Math.random() + 0.5));
			
			that.selectzone.init();
		});

		this.workspace.game = this.editor.game;

		this.workspace.init();
	},

	runTutorial: function(){
		tm.begin();
		tm.cible(0,0,0,0);
		tm.dialog("Editeur de carte", "Bienvenue dans l'éditeur de carte de GameIndus !<br>Je vais vous présenter les principales fonctionnalités.<br>Suivez-moi en cliquant sur 'Continuer' !");
		tm.cibleElement(".tilemap-tool-bar");
		tm.dialog("Editeur de carte", "Voici la partie la plus importante de l'éditeur.<br>Dans cette barre, vous avez accès aux outils pour dessiner, supprimer, et changer de calque.<br>Vous pouvez aussi changer les paramètres de la carte<br>via l'icone en forme d'engrenage.");
		tm.start();
	},


	coordsToTile: function(x, y, padding, zoom){
		if(padding == null) padding = {x: 0, y: 0};
		if(zoom == null) zoom = 1;

		var cell = this.ressource.cellSize;

		var x = Math.floor(((x / zoom) - padding.x) / cell.w);
		var y = Math.floor(((y / zoom) - padding.y) / cell.h);

		return {x: x, y: y};
	},
	tileToCoords: function(x, y, padding){
		if(padding == null) padding = {x: 0, y: 0};
		var cell = this.ressource.cellSize;

		var x = x * cell.w + padding.x;
		var y = y * cell.h + padding.y;

		return {x: x, y: y};
	}

};