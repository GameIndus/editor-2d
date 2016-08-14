function View(type, name){
	this.container = document.getElementById("editor-container");

	this.editor = null;
	this.type   = type;
	this.name   = name;
	this.html   = null;

	this.loaded          = false;
	this.htmlLoadedEvent = null;

	this.init();
}

View.prototype = {

	init: function(){
		var that = this;

		if(this.type == "") this.type = "home";
		if(this.name == "") this.name = "home";

		loadFile("views/" + this.type + ".php", function(page){
			that.html = page;
			if(that.htmlLoadedEvent != null) that.htmlLoadedEvent();
		});
	},

	print: function(){
		if(this.loaded){
			this.restore();
			App.resize();
			return false;
		}

		// Load HTML & Editor
		this.container.innerHTML = this.html;
		this.editor = new Editor().fromType(this.getType());
		if(this.editor != null) this.editor.initialize();

		this.loaded = true;
		App.resize();
	},

	getName: function(){
		return this.name;
	},
	getType: function(){
		return this.type;
	},

	save: function(){
		if(this.editor != null){
			if(this.editor.game != null){
				this.editor.game.paused = true;
				Game.paused = true;
			}

			this.editor.unload();
		}

		this.html = this.container.innerHTML;
	},
	restore: function(){
		if(this.html != null){
			this.container.innerHTML = this.html;
		}

		if(this.editor != null){
			if(this.editor.game != null) this.editor.game.paused = false;

			window.currentEditor = this.editor.class || this.editor;
			this.editor.load();
		}
	},
	refresh: function(){
		this.save();
		this.restore();
	},

	onHtmlLoaded: function(callback){
		this.htmlLoadedEvent = callback;
		if(this.html != null) callback();
	}

};