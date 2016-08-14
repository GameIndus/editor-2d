function ConfigEditor(){
	this.config = {};
	this.scenes = [];

	this.errors = [];

	this.disableStorage = true;
}

ConfigEditor.prototype = {

	init: function(){
		css("editors/config");
	},
	load: function(){
		var self = this;

		this.getConfig(function(c){
			App.getFilesManager().onFilesLoaded(function(){
				self.loadMenu();

				self.loadMainTab();
				self.loadVideoTab();
				self.loadAdvancedTab();
			});
		});

		document.getElementById("submit_options").classList.remove("success");
	},
	unload: function(){

	},
	realtimeSend: function(submethod, data){
		var o = {submethod: submethod, file: "options", type: "options"};

		switch(submethod){
			case "updatedefaultscene": o.defaultscene = data; break;
			case "updatefps": o.fps = data; break;
			case "updatefpsdynamic": o.dynamicfps = data;  break;
			case "updategamesize": o.sizew = data.sizew; o.sizeh = data.sizeh; break;
			case "updatedevmode": o.devmode = data; break;
		}

		network.request("configeditor", o, null, "realtime", "realtime").send();
	},
	save: function(){
		var submitBtn = document.getElementById("submit_options");

		if(this.errors.length > 0) return false;
		if(network == null || network.connection == null) return false;

		var fpsValue = document.getElementById("project_fps").value;

		network.request("saveConfig", {config: {
			size: {w: document.getElementById("project_size_w").value, h: document.getElementById("project_size_h").value},
			fps: fpsValue,
			dynamicfps: (fpsValue == 60),
			developper_mode: document.getElementById("project_developpermode").checked,
			default_scene: document.getElementById("default_scene").value,
			imagesmoothing: document.getElementById("imageSmoothing").checked,
			displaymode: document.getElementById("displaymode").value
		}}, function(d){
			submitBtn.classList.add("success");

			setTimeout(function(){
				submitBtn.classList.remove("success");
			}, 1000 * 5);
		}).send();

		edConf.set("script-fs", document.getElementById("se_fs").value);
		edConf.set("script-tabsize", document.getElementById("se_tabsize").value);
		edConf.set("script-theme", document.getElementById("se_theme").value);
	},

	getConfig: function(callback){
		var self = this;

		network.onConnect(function(){
			network.request("loadConfig", {}, function(d){
				if(d.config.size == null) d.config.size = {w: "100%", h: "100%"};
				if(d.config.fps  == null) d.config.fps  = 60;

				self.config = d.config;
				callback(d.config);
			}).send();
		})
	},


	loadMenu: function(){
		var that = this;
		var menu = document.getElementsByClassName("opts_menu")[0];

		if(menu != null){
			// Load toggle divs
			var configMenuDivs  = [];
			var configMenuLinks = [];

			var divsEls = document.getElementsByClassName("toggle-div");
			for(var i in divsEls){
				configMenuDivs.push(divsEls[i]);
			}

			for(var ic in menu.childNodes){
				var cn = menu.childNodes[ic];
				
				if(cn.dataset != null && cn.dataset["div"] != null){
					configMenuLinks.push(cn);

					cn.onclick = function(){
						var divClibled = this.dataset.div;
						
						for(var cmli in configMenuLinks){
							var link = configMenuLinks[cmli];
							if(link.classList != undefined) link.classList.remove("active");
						}
						this.classList.add("active");

						for(var cmdi in configMenuDivs){
							var div = configMenuDivs[cmdi];
							if(div.style != undefined) div.style.display = "none";
						}

						if(divClibled === "general") that.loadMainTab();

						if(document.getElementById(divClibled) != null) document.getElementById(divClibled).style.display = "block";
					}
				}
			}
		}
	},
	loadMainTab: function(){
		var currentDefaultScene = this.config.default_scene;

		// Scenes
		document.getElementById("default_scene").innerHTML = "";
		this.scenes = App.getFilesManager().getFilesByType("scene");
		for(var key in this.scenes){
			var value  = this.scenes[key];
			if(typeof value !== "string") continue;

			var option = document.createElement("option");
			option.value     = value;
			option.innerHTML = value;

			if(value == currentDefaultScene) option.selected = true;

			if(document.getElementById("default_scene") != null)
				document.getElementById("default_scene").appendChild(option);
		}


		if(edConf.get("script-tabsize") != null) document.getElementById("se_tabsize").value = edConf.get("script-tabsize");
		if(edConf.get("script-theme") != null) document.getElementById("se_theme").value = edConf.get("script-theme");
		if(edConf.get("script-fs") != null) document.getElementById("se_fs").value = edConf.get("script-fs");
	},
	loadVideoTab: function(){
		if(document.getElementById("project_size_w") == null || document.getElementById("project_size_h") == null || 
		   document.getElementById("project_fps") == null) return false;

		document.getElementById("project_size_w").value = this.config.size.w;
		document.getElementById("project_size_h").value = this.config.size.h;
		document.getElementById("project_fps").value = this.config.fps;
		if(this.config.imagesmoothing != null) document.getElementById("imageSmoothing").checked = this.config.imagesmoothing;
		if(this.config.displaymode != null) document.getElementById("displaymode").value = this.config.displaymode;
	},
	loadAdvancedTab: function(){
		if(this.config.developper_mode) document.getElementById("project_developpermode").checked = true;
		if(document.getElementById("projectBuildConfig") != null && compiler.buildNum != -1)
			document.getElementById("projectBuildConfig").innerHTML = compiler.buildNum;
	},

	updateDefaultScene: function(df){
		var el       = document.getElementById("default_scene");

		var defaultScene = (df != null) ? df : el.value;

		if(el.value != defaultScene) el.value = defaultScene;

		if(df == null){
			this.realtimeSend("updatedefaultscene", defaultScene);
		}
	},
	updateDevMode: function(devMode){
		var el       = document.getElementById("project_developpermode");

		var bool = (devMode != null) ? devMode : el.checked;

		if(el.checked != bool) el.checked = bool;

		if(devMode == null){
			this.realtimeSend("updatedevmode", bool);
		}
	},
	updateFps: function(fpsP){
		var el  = document.getElementById("project_fps");
		var fps = fpsP || el.value;

		if(el.value != fps) el.value = fps;

		if(!Utils.isInteger(fps) || fps > 60 || fps < 30)
			this.setError(el);
		else
			this.removeError(el);

		if(fpsP == null){
			this.realtimeSend("updatefps", fps);
		}
	},
	updateRatio: function(ratiow, ratioh){
		var w = ratiow || document.getElementById("project_size_w").value;
		var h = ratioh || document.getElementById("project_size_h").value;

		if(document.getElementById("project_size_w").value != w) document.getElementById("project_size_w").value = w;
		if(document.getElementById("project_size_h").value != h) document.getElementById("project_size_h").value = h;

		document.getElementById('project_size_ratio').innerHTML = Utils.reduceRatio(w, h);

		if(ratiow == null && ratioh == null){
			this.realtimeSend("updategamesize", {sizew: w, sizeh: h});
		}
	},


	setError: function(el){
		var submitBtn = document.getElementById("submit_options");
		el.classList.add("error");

		if(this.errors.indexOf(el.id) <= -1)
			this.errors.push(el.id);

		submitBtn.disabled = true;
	},
	removeError: function(el){
		var submitBtn = document.getElementById("submit_options");
		el.classList.remove("error");

		if(this.errors.indexOf(el.id) > -1)
			this.errors.splice(this.errors.indexOf(el.id), 1);

		if(this.errors.length == 0)
			submitBtn.disabled = false;
	}

};