function Editor(){
	this.class = null;
	this.game  = null;

	this.type  = null;

	this.storedGameCanvas = null;
}

Editor.prototype = {

	fromType: function(type){
		var className = type.ucfirst() + "Editor";
		if(className == "VisualscriptEditor") className = "VisualScriptEditor";
		if(className == "OptionsEditor") className = "ConfigEditor";

		this.type = type;
		
		if(typeof window[className] === "function"){
			this.class = new window[className](this);
			window.currentEditor = this.class;

			return this;
		}else{
			return null;
		}
	},

	get: function(){return this.class;},
	getEngineGame: function(){return this.game;},

	initialize: function(){
		var editorContainer = document.getElementById("editor-container");
		var editorDiv       = editorContainer.getElementsByTagName("canvas")[0];
		var viewType        = App.getRouter().getCurrentView().getType();

		if(editorDiv == null){ // No canvas : cancel task
			this.game = null;
			if(typeof this.get().init === "function") this.get().init();
			this.load(true);
			return false;
		}

		Config.assetsDir = "https://gameindus.fr/project/" + App.getProject().getFormattedEditorId() + "/asset?-=";

		Game = App.newGameInstance();Game.network = false;
		this.game = Game;

		Game.getRessourcesManager().setDataLoading(false);
		SoundsManager.loadSounds = function(){};
		window.onerror = null;

		this.game.load(editorDiv);

		var width  = editorContainer.offsetWidth - Sidebar.getWidth(), height = editorContainer.offsetHeight;

		this.game.setCanvasSize(width, height);
		this.game.init();

		if(typeof this.get().init === "function") this.get().init();
		this.load(true);
	},
	load: function(firstLoad){
		var editorContainer = document.getElementById("editor-container");
		var viewType        = App.getRouter().getCurrentView().getType();
		
		// Change viewType in DOM
		editorContainer.dataset.type = viewType;
		document.getElementsByTagName("footer")[0].dataset.viewType = viewType;

		if(this.getEngineGame() == null){
			if(typeof this.get().load === "function") this.get().load(!firstLoad);
			this.loadData();
			
			return false;
		}

		var c = document.getElementById("editor-container");
		if(this.storedGameCanvas != null){
			c.querySelector("canvas.editorCanvas").remove();
			c.appendChild(this.storedGameCanvas);
		}

		window.Game = this.getEngineGame();
		Game.paused = false;
		Game.canvas.load(c.querySelector("canvas.editorCanvas").id);
		setTimeout(function(){Game.setCanvasSize(c.offsetWidth, c.offsetHeight);}, 1);

		if(typeof this.get().load === "function") this.get().load(!firstLoad);

		this.loadData();
	},
	loadData: function(){
		var self = this;
		if(this.class == null || this.get().disableStorage) return false;

		network.request("loadFileData", {type: this.type, filename: App.getCurrentFile()}, function(data){
			var data = LZString.decompressFromBase64(data.data);
			if(data == "") data = false;

			if(typeof(self.get().loadFromData) === "function"){
				network.onConnect(function(){
					self.get().loadFromData(data);
				});
			}
		}, "loadsave", "realtime").send();
	},
	unload: function(){
		if(this.getEngineGame() == null){
			if(typeof this.get().unload === "function") this.get().unload();
			return false;
		}

		var c = document.getElementById("editor-container");
		if(c != null) this.storedGameCanvas = c.querySelector("canvas.editorCanvas");
		if(Game != null){ Game.paused = true; Input.reset(); }

		if(this.autosaving && this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout); 

		if(typeof this.get().unload === "function") this.get().unload();
	}

};