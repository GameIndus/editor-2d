function Tab(name, type, active, pathR){
	this.cnt  = document.querySelector(".tabs-container .tabs");
	this.dom  = null;

	this.name = name,
	this.type = type;

	this.pathR  = pathR || null;

	this.init(active);
}

Tab.prototype = {

	init: function(active){
		var activeStr = " active";

		if(!active) activeStr = "";
		else{
			var cTab = Tabs.getCurrentTab();
			if(cTab != null) cTab.setActive(false);
		}

		var path = this.pathR || "/";
		if(App.getFilesManager().currentFolder != null && this.type != "options") 
			path = App.getFilesManager().getFilePath(this.type, this.name).replace(this.name, "");

		var tab = document.createElement("div");

		tab.className    = "tab" + activeStr;
		tab.innerHTML    = '<span class="icon icon-' + this.type + '"></span><span class="name">' + this.name + '</span><span class="path">' + path + '</span>';
		tab.dataset.file = this.name;
		tab.dataset.type = this.type;
		tab.dataset.path = path;

		tab.addEventListener("click", function(e){
			e.preventDefault();
			Tabs.changeTab(this);
			return false;
		});
		tab.addEventListener("contextmenu", function(e){
			e.preventDefault();
			Tabs.closeTab(this);
			return false;
		});
		tab.addEventListener("mousedown", function(e){
			e.preventDefault();
			if(e.which == 2) Tabs.closeTab(this);
			return false;
		});

		this.dom = tab;
		this.cnt.appendChild(tab);
	},
	reload: function(){
		if(this.dom == null) return false;
		var el = this.dom;

		var path = this.pathR || "/";
		if(App.getFilesManager().currentFolder != null) path += App.getFilesManager().currentFolder;

		el.innerHTML = '<i class="fa tab-icon fa-' + Utils.getIconFromType(this.type) + '"></i><span class="name">' + this.name + '</span><span class="path">' + path + '</span>';
		el.dataset.file = this.name;
		el.dataset.type = this.type;
		el.dataset.path = path;
	},

	setPath: function(path){
		if(this.dom == null) return false;
		var pathSpan = this.dom.querySelector(".path");

		pathSpan.innerHTML = path;this.pathR = path;
		this.dom.dataset.path = path;
	},

	setActive: function(bool){
		if(this.dom != null && bool) this.dom.classList.add("active");
		else this.dom.classList.remove("active");
	},
	isActive: function(){
		return this.dom.classList.contains("active");
	}

};