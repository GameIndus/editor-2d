require("editors/scene/dictionary");
require("editors/scene/workspace");
require("editors/scene/sidebar");
require("editors/scene/object");

requires();

function SceneEditor(Editor){
	this.editor = Editor;
	this.config = {};

	this.sidebar       = new SceneSidebar(this);
	this.workspace     = new SceneWorkspace(this);
	this.dictionary    = new SceneDictionary();

	this.gameCanvas = null;

	this.widthToRemove = 300 + 3; // Right sidebar width
}

SceneEditor.prototype = {

	init: function(){
		var self = this;
		css("editors/scene");

		this.workspace.startLoader();
		this.sidebar.init();

		this.workspace.init();
		
		// App.alert("Ancienne scène", "Ce format de scène n'est plus pris en charge. Vous allez démarrer dans une scène vide.", "danger", 8);
	},
	load: function(reload){
		this.workspace.initTriggers();

		if(reload){
			this.sidebar.init();
			this.sidebar.reload();

			this.workspace.reload();
		}
	},
	realtimeSend: function(submethod, data){
		var o = {submethod: submethod, file: App.getCurrentFile(), type: "scene"};

		switch(submethod){
			case "depositobject":
				o.posx  = data.posx;
				o.posy  = data.posy;
				o.ctype = data.type;
				o.name  = data.name;
			break;
			case "renameobject":
				o.oname   = data.oname;
				o.newname = data.newname;
			break;
			case "removeobject": o.name = data; break;
			case "changeobjectproperty":
				o.oname    = data.objectname;
				o.property = data.property;
				if(data.subproperty !== undefined) o.subproperty = data.subproperty;
				if(data.behaviorname !== undefined) o.behaviorname = data.behaviorname;
				o.value    = data.value;
			break;
			case "removeobjectbehavior":
				o.oname        = data.objectname;
				o.behaviorname = data.behaviorname;
			break;
		}

		network.request("sceneeditor", o, null, "realtime", "realtime").send();
	},

	loadFromData: function(data){
		if(!data) return false;
		var self = this;

		if(Object.keys(this.editor.getEngineGame().getRessourcesManager().data).length > 0 ||
		   this.editor.getEngineGame().getRessourcesManager().ressourcesDataLoaded){
			data = JSON.parse(data);
			self.workspace.loadObjectsFromData(data);
			
			return false;
		}

		this.editor.getEngineGame().getEventsManager().on("loadedRessourcesData", function(){
			data = JSON.parse(data);
			self.workspace.loadObjectsFromData(data);
		});
	}
	
};