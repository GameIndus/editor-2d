function FilesManager(){
	this.files = {};
	this.currentFile   = null;
	this.currentFolder = null;

	this.selectedFile  = null;
	this.selectedDOM   = null;

	this.projectName = document.getElementById("projectId").value;
	this.div         = document.getElementsByClassName("files")[0];

	this.onFilesLoadedEvents = [];
	this.onDomFilledEvents   = [];
}

FilesManager.prototype = {

	load: function(){
		var that = this;
		this.refreshFiles();

		// Check sessionStorage if there is a filename saved
		var currentFile = sessionStorage.getItem("currentFile");

		if(currentFile == "" || currentFile == null){ // If currentFile doesn't exist or is empty, redirect to the homepage
			window.location.hash = "home";
			return false;
		}else{
			this.currentFile = currentFile;
		}
	},
	refreshFiles: function(callback){
		var that = this;

		network.onConnect(function(){
			network.request("getFiles", null, function(data, infos){
				that.files = data;
				that.runFilesLoadedEvent();
				
				that.reloadDom(data);
				if(callback != null) callback(data);
			}).send();
		});
	},

	reloadDom: function(data){
		var that      = this;
		var container = this.div;

		if(data == null) data = this.files;

		// Script DraftBox reload
		var draftBoxFiles = [];
		this.getDomByFileType("script").forEach(function(domFile){
			if(domFile.querySelector(".draft-box") != null) draftBoxFiles.push(domFile.dataset.fileName);
		});

		container.innerHTML = "";

		var appendTask = function(container, filename, fileType, folderStr){
			var div = document.createElement("div");
			var icon = document.createElement("i");
			var name = document.createElement("span");

			div.className    = "file" + folderStr;
			icon.className   = "fa icon fa-" + getIconFromType(fileType);
			name.className   = "filename";

			div.dataset.fileType = fileType;
			div.dataset.fileName = filename;

			if(fileType == "script" && draftBoxFiles.indexOf(filename) > -1){
				var draftBox = document.createElement("span");
				draftBox.className = "draft-box";
				draftBox.innerHTML = "Brouillon";

				if(div.querySelector(".draft-box") == null)
					div.appendChild(draftBox);
			}

			// if(filename.length > 25) filename = filename.substring(0, 25);
			name.innerHTML = filename;

			div.appendChild(icon);
			div.appendChild(name);
			container.appendChild(div);

			return div;
		};

		var fillSidebar = function(container, o, currentPath){
			for(var i = 0; i < Object.keys(o).length; i++){
				var filename   = Object.keys(o)[i];
				var fileType   = o[filename];
				var folderData = null;

				if(typeof(fileType) === "object"){ // This is a folder
					folderData = fileType;
					fileType = "folder";
				}

				var folderStr = "";

				if(fileType == "folder") folderStr = " folder";

				var div = appendTask(container, filename, fileType, folderStr);

				if(fileType == "folder"){ // Add right chevron
					var chevron = document.createElement("i");
					chevron.className = "fa fa-plus right-icon";
					div.appendChild(chevron);

					var path = currentPath || "";
					path += filename + "/";

					var subdiv = document.createElement("div");
					subdiv.className = "subdiv";
					subdiv.id = "subdiv-"+filename;
					subdiv.style.display = "none";
					subdiv.dataset.path  = path;

					container.appendChild(subdiv);

					subdiv.previousSibling.dataset.path = path;

					if(folderData != null){
						fillSidebar(subdiv, folderData, path);
					}
				}
			}
		};

		fillSidebar(container, data);
		that.runDomFilledEvent();
	},

	getDomFile: function(type, filename){
		var divs = document.getElementsByClassName("file");
		for(var key in divs){
			var div = divs[key];

			if(div.dataset == null || div.dataset.fileType == null) continue;
			
			if(div.dataset.fileType == type && div.dataset.fileName == filename)
				return div;
		}

		return null;
	},
	getDomByFileType: function(type){
		var divs = document.getElementsByClassName("file");
		var r    = new Array();
		for(var key in divs){
			var div = divs[key];

			if(div.dataset == null || div.dataset.fileType == null) continue;
			
			if(div.dataset.fileType == type)
				r.push(div);
		}

		return r;
	},


	getAllFiles: function(){ 
		return getRecursiveObject(this.files);
	},
	getFiles: function(){
		var r = [];

		var parseObject = function(o){
			for(var i = 0; i < Object.keys(o).length; i++){
				var k = Object.keys(o)[i];
				var v = o[k];

				if(typeof v === "string") r.push(k + "-" + v);
				else parseObject(v);
			}
		}
		parseObject(this.files);

		return r;
	},
	getFilesByType: function(type){
		var files = this.getFiles();
		var r     = [];

		for(var i = 0; i < files.length; i++){
			var file = files[i].split("-"); 
			var key  = file[0];
			var val  = file[1];

			if(val == type) r.push(key);
		}

		return r;
	},
	getFilePath: function(type, filename){
		var dom = this.getDomFile(type, formatFilename(filename));
		if(dom == null) return "/" + filename;

		if(dom.dataset.path != null) return "/" + dom.dataset.path + filename;
		if(dom.parentNode != null && dom.parentNode.dataset.path != null) return "/" + dom.parentNode.dataset.path + filename;
		return "/" + filename;
	},


	saveFile: function(name, type){
		if(editorNetwork.getConnection() == null) return false;

		var folder = this.currentFolder;

		editorNetwork.getConnection().emit("saveFile", {ID: editorID, project: this.projectName, folder: folder, type: type, name: name});
	},

	saveFolder: function(name){
		if(editorNetwork.getConnection() == null) return false;
		editorNetwork.getConnection().emit("saveFile", {ID: editorID, project: this.projectName, type: "folder", name: name});
	},



	onFilesLoaded: function(callback){
		this.onFilesLoadedEvents.push(callback);

		if(Object.keys(this.files).length > 0) callback(this.files);
	},
	onDomFilled: function(callback){
		this.onDomFilledEvents.push(callback);
	},
	runFilesLoadedEvent: function(){
		for(var i = 0; i < this.onFilesLoadedEvents.length; i++)
			this.onFilesLoadedEvents[i](this.files);
	},
	runDomFilledEvent: function(){
		for(var i = 0; i < this.onDomFilledEvents.length; i++)
			this.onDomFilledEvents[i](this.files);
	},

};


function getIconFromType(fileType){
	var iconName = "times";

	if(fileType == "script"){
		iconName = "code";
	}else if(fileType == "visualscript"){
		iconName = "list-alt";
	}else if(fileType == "scene"){
		iconName = "film";
	}else if(fileType == "sound"){
		iconName = "volume-up";
	}else if(fileType == "tilemap"){
		iconName = "map-o";
	}else if(fileType == "sprite"){
		iconName = "picture-o";
	}else if(fileType == "folder"){
		iconName = "folder";
	}

	return iconName;
}
function getRecursiveObject(obj){
	if(typeof obj !== "object") return obj;
	var res = {};

	for(var key in obj){
		var v = obj[key];

		if(typeof v === "object"){
			var recObj = getRecursiveObject(v);

			for(var key2 in recObj){
				var v2 = recObj[key2];
				res[key2] = v2;
			}
		}else{
			res[key] = v;
		}
	}

	return res;
}