function Tabs(){
	this.tabs = [];
	this.activePath = null;

	this.onChangeEvents = [];
}

Tabs.prototype = {

	init: function(){
		var that = this;

		var cnt = document.querySelector(".tabs-container");

		window.addEventListener("keydown", function(e){
			if(e.which == 226 && e.ctrlKey){
				e.preventDefault();
				if(e.shiftKey) that.nextTab();
				else that.prevTab();
				return false;
			}
		});

		this.loadFromSession();
	},
	reloadDom: function(){
		console.log(this.tabs);
	},

	getCurrentTab: function(){
		var tabs = this.getTabs();

		for(var i = 0; i < tabs.length; i++){
			if(tabs[i].isActive())
				return tabs[i];
		}

		return null;
	},
	getTabs: function(){
		return this.tabs;
	},
	getTab: function(name, type){
		var tabs = this.getTabs();

		for(var i = 0; i < tabs.length; i++){
			if(tabs[i].name == name && tabs[i].type == type)
				return tabs[i];
		}

		return null;
	},
	getTabByDom: function(dom){
		var tabs = this.getTabs();

		for(var i = 0; i < tabs.length; i++)
			if(tabs[i].dom == dom)
				return tabs[i];

		return null;
	},

	add: function(type, name, active, pathR){
		if(this.getTab(name, type) != null){
			this.changeTab(this.getTab(name, type).dom);
			return false;
		}

		var tab = new Tab(name, type, active, pathR);
		this.tabs.push(tab);

		this.save();

		return tab;
	},
	rename: function(name, type, newName){
		if(this.getTab(name, type) == null) return false;

		var tab = this.getTab(name, type);

		tab.name = newName;
		tab.reload();

		this.save();
	},
	remove: function(name, type){
		if(this.getTab(name, type) == null) return false;

		var tab = this.getTab(name, type);

		tab.dom.remove();
		this.tabs.splice(this.tabs.indexOf(tab), 1);
	},

	changeTabIndex: function(tab, index){
		var that = this;
		var tabs = this.getTabs().clone();

		if(index > (tabs.length - 1)) index = tabs.length - 1;
		if(index < 0) index = 0;

		console.log(index, tabs.length);

		for(var i = 0; i < tabs.length; i++){
			var tab = tabs[i];
			console.log(i, " active >", tab.isActive());
		}

		if(tabs.indexOf(tab) == index) return false;
		var newTabs = tabs;

		newTabs.splice(tabs.indexOf(tab), 1);
		newTabs.splice(index - 1, 0, tab);

		for(var i = 0; i < newTabs.length; i++){
			var tab = tabs[i];
			console.log(i, " tab >", tab, " / active >", tab.isActive());
		}

		this.reloadDom();
		this.save();
	},
	changeTab: function(tab){
		var cnt  = document.querySelector(".tabs-container .tabs");
		var cTab = this.getCurrentTab();

		if(cTab != null) cTab.setActive(false);

		if(tab == null) return false;
		var tabObj = this.getTabByDom(tab);

		if(tabObj == null) return false;
		tabObj.setActive(true);

		var lastFile = App.getFilesManager().currentFile;

		App.getFilesManager().currentFile = tab.dataset.file;
		sessionStorage.setItem("currentFile", tab.dataset.file);

		App.getRouter().changeViewTo(tab.dataset.type, tab.dataset.file);
		for(var i = 0; i < this.onChangeEvents.length; i++)
			this.onChangeEvents[i]({oldFile: lastFile, newFile: tab.dataset.file});
		
		this.save();
	},
	prevTab: function(){
		var cnt  = document.querySelector(".tabs-container .tabs");
		var cTab = this.getCurrentTab();
		if(cTab != null) cTab.setActive(false);

		if(cTab == null || cnt.querySelectorAll(".tab").length == 0) return false;
		
		var tabs = cnt.querySelectorAll(".tab");

		var prev = (tabs[0] != cTab) ? cTab.previousSibling : tabs[tabs.length - 1];
		this.changeTab(prev);
	},
	nextTab: function(){
		var cnt = document.querySelector(".tabs-container .tabs");
		var cTab = this.getCurrentTab();
		if(cTab != null) cTab.setActive(false);

		if(cTab == null || cnt.querySelectorAll(".tab").length == 0) return false;
		
		var next = cTab.nextSibling || cnt.querySelectorAll(".tab")[0];
		this.changeTab(next);
	},
	closeTab: function(tab){
		var name   = tab.dataset.file;
		var tabObj = this.getTabByDom(tab);

		this.remove(tabObj.name, tabObj.type);

		if(tabObj.name == App.getFilesManager().currentFile){
			if(this.tabs.length > 0)
				this.changeTab(this.tabs[this.tabs.length - 1].dom);
			else
				App.getRouter().changeViewTo("home");
		}else if(tabObj.name.toLowerCase() == "options"){
			if(this.tabs.length > 0)
				this.changeTab(this.tabs[this.tabs.length - 1].dom);
			else
				App.getRouter().changeViewTo("home");
		}

		this.save();
	},

	// Session
	loadFromSession: function(){
		var obj  = JSON.parse(sessionStorage.getItem("editor-tabs-" + App.getProject().getEditorId()));
		var self = this;

		if(obj == null){
			App.getRouter().routing();
			return false;
		}
		var tabActive = null;

		for(var i = 0; i < obj.length; i++){
			var v = obj[i];
			var active = (tabActive == null) ? v.active : false; 

			var oTab = this.add(v.type, v.name, active, v.path);
			if(active) tabActive = oTab;
		}

		if(tabActive) Tabs.changeTab(tabActive.dom);
		else App.getRouter().routing();

		App.getFilesManager().onFilesLoaded(function(){
			self.reloadTabsPath();
		});
	},
	reloadTabsPath: function(){
		for(var i in this.getTabs()){
			var tabDom = this.getTabs()[i];
			var tab    = this.getTabByDom(tabDom);
			if(tab == null) continue;

			var currentPath = App.getFilesManager().getFilePath(tab.type, tab.name);
			tab.setPath(currentPath);
		}

		this.save();
	},
	getCurrentPath: function(){
		return this.activePath;
	},
	save: function(){
		var tabs = this.getTabs();
		var obj  = [];

		for(var i = 0; i < tabs.length; i++){
			var tab = tabs[i];
			obj.push({
				type: tab.type,
				active: tab.isActive(),
				name: tab.name,
				goto: tab.dom.dataset.goto,
				path: tab.dom.dataset.path
			});

			if(tab.dom.classList.contains("active")) this.activePath = tab.dom.dataset.path;
		}

		sessionStorage.setItem("editor-tabs-" + App.getProject().getEditorId(), JSON.stringify(obj));
	},

	onChange: function(callback){
		this.onChangeEvents.push(callback);
	},

};

var Tabs = new Tabs();