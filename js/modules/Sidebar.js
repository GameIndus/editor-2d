function Sidebar(){
	this.sidebar        = document.getElementById("sidebar");
	this.filesContainer = this.sidebar.querySelector(".files");
	this.fileMenu       = this.sidebar.querySelector(".files-menu");

	this.lastFile       = null;
	this.lastFileClick  = 0;
	this.lastFileObject = null;
	this.lastFilePath   = null;
	this.foldersOpened  = [];

	this.confirmOption = false;
	this.clipboard = null;

}

Sidebar.prototype = {

	init: function(){
		var that = this;

		App.getFilesManager().onDomFilled(function(files){
			that.initDom();

			// Check session to restore workspace (folders opened)
			var si = sessionStorage.getItem("folders-opened");
			if(si != null){
				that.foldersOpened = JSON.parse(si);
				that.restoreDom();
			}
		});

		this.filesContainer.addEventListener("contextmenu", function(e){
			e.preventDefault();
			that.rightClick(e);
			return false;
		});

		window.addEventListener("click", function(e){
			var menu = Utils.getParentRecursively(e.target, ".files-menu");

			if(menu == null && that.fileMenu.style.display == "block") that.closeFileMenu();
		});

		// Check session to restore workspace (sidebar width)
		var sisw = sessionStorage.getItem("sidebar-width");
		if(sisw != null) this.setWidth(parseInt(sisw));
	},
	initDom: function(){
		var that = this;
		var files   = this.filesContainer.querySelectorAll(".file");
		var actions = this.sidebar.querySelectorAll(".actions div");

		for(var i = 0; i < files.length; i++){
			var file = files[i];

			file.onclick = function(e){
				e.preventDefault();

				var folder = this.classList.contains("folder");
				
				if(folder) that.clickOnFolder(this, e);
				else that.clickOnFile(this, e);

				return false;
			}
		}

		for(var i = 0; i < actions.length; i++){
			var action = actions[i];

			if(action.onclick == undefined){
				action.onclick = function(e){
					var el = e.srcElement || e.target;
					if(el.dataset.goto === undefined) el = el.parentNode;

					that.clickOnAction(el, el.dataset.goto);
					if(el.dataset.goto === "create-file" || el.dataset.goto === "create-folder") return false;
					if(el.dataset.goto === "options") Tabs.add("options", "Options", true, "Editer les paramètres");

					App.getRouter().changeViewTo(el.dataset.goto);
				}
			}

			// Action links -> tooltips
			action.onmouseenter = function(e){
				var el = e.srcElement || e.target;
				if(el.dataset.goto === undefined) el = el.parentNode;
				var icon = el.querySelector("i.fa");
				var rect = icon.getBoundingClientRect();

				if(el.dataset != null && el.dataset.tooltip != null){
					var tt  = document.getElementById("action_tooltip");
					var ttt = el.dataset.tooltip;
					var mte = Utils.measureText(ttt, "Helvetica 15px").width;

					tt.innerHTML = ttt;
					tt.style.left = (rect.left - mte / 2) + "px";
					tt.style.top  = (rect.top + 50) + "px";
					tt.style.display = "block";
				}
			}
			action.onmouseleave = function(e){
				var el = e.srcElement || e.target;
				if(el.dataset.goto===undefined) el = el.parentNode;

				if(el.dataset != null && el.dataset.tooltip != null){
					var tt = document.getElementById("action_tooltip");
					tt.innerHTML = "";
					tt.style.display = "none";
				}
			}
		}
	},
	restoreDom: function(){
		var files   = this.filesContainer.querySelectorAll(".file");

		var fo = this.foldersOpened;
		this.foldersOpened = [];

		for(var i = 0; i < files.length; i++){
			var f = files[i];
			if(f.dataset != null && fo.indexOf(f.dataset.path) > -1)
				this.clickOnFolder(f, null, true);
		}
	},
	updateToServer: function(){
		network.request("updatefiles", {udpatefiles: true}, null, "realtime", "realtime").send();
	},

	setWidth: function(width){
		var sidebar   = document.getElementById("sidebar");
		var logo      = document.getElementById("logo");

		if(width < 180) width = 180;
		if(width > 450) width = 450;

		sidebar.style.width = width + "px";
		logo.style.width = width + "px";
		
		sessionStorage.setItem("sidebar-width", width);
		App.resize();
	},
	getWidth: function(){
		return this.sidebar.offsetWidth;
	},

	clickOnFile: function(file, event){
		if(Date.now() - this.lastFileClick > 500){
			this.lastFileClick = Date.now();
			return false;
		}
		this.lastFileClick = Date.now();

		var name = file.dataset.fileName;
		var type = file.dataset.fileType;

		if(name != ""){
			App.getFilesManager().currentFile = name;
			sessionStorage.setItem("currentFile", name);
		}
		
		Tabs.add(type, name, true);
		App.getRouter().changeViewTo(type, name);

		file.classList.remove("active");
	},
	clickOnFolder: function(folder, event, value){
		var opened = folder.classList.contains("opened");
		var path   = folder.dataset.path;

		if(value !== undefined) opened = !value;

		if(opened){
			folder.classList.remove("opened");
			App.getFilesManager().currentFolder = null;
			folder.nextSibling.style.display  = "none";

			for(var i = 0; i < this.foldersOpened.length; i++)
				if(this.foldersOpened[i] == path)
					delete this.foldersOpened[i];
		}else{
			folder.classList.add("opened");
			App.getFilesManager().currentFolder = folder.childNodes[1].innerHTML;
			folder.nextSibling.style.display = "block";

			this.foldersOpened.push(path);
		}

		sessionStorage.setItem("folders-opened", JSON.stringify(this.foldersOpened));
	},
	rightClick: function(event){
		var file = Utils.getParentRecursively(event.target, ".file");
		var pos  = {x: event.clientX, y: event.clientY};

		var filename = (file != null) ? file.childNodes[1].innerHTML : "";
		var subDiv   = (file != null) ? Utils.getParentRecursively(file, ".subdiv") : null;

		if(file != null){
			var path = "/";
			if(subDiv != null) path = subDiv.dataset.path + filename;	
			else if(file.classList.contains("folder")) path = filename + "/";
			else path = filename;

			this.openFileMenu(pos.x, pos.y, {
				div: file,
				name: filename,
				folder: file.classList.contains("folder"),
				url: file.dataset.goto,
				path: path
			});
		}else{
			this.openFileMenu(pos.x, pos.y, {
				div: null,
				folder: "",
				create: true
			});
		}
	},
	clickOnMenuAction: function(action, element){
		var that = this;

		if(this.lastFilePath == null) return false;

		switch(action){
			case "create-file":
				this.openFileCreatorDialog(function(name, type){
					that.createFile(name, type, that.lastFilePath);
				});
			break;
			case "create-folder":
				this.openFolderCreatorDialog(function(name){
					that.createFolder(name, that.lastFilePath);
				});
			break;
			case "copy":
				this.copy(that.lastFilePath);
			break;
			case "cut":
				this.cut(that.lastFilePath);
			break;
			case "paste":
				this.paste(that.lastFilePath);
			break;
			case "rename":
				var o = this.lastFileObject;

				var strl = o.name.length;
				var path = o.path.substring(0, o.path.length - strl - 1);

				this.openRenameConfirmDialog(function(path, name, folder){
					that.rename(path, o.name, name, folder);
				}, path, o.name, o.folder);
			break;
			case "remove":
				var o = this.lastFileObject;

				this.openRemoveConfirmDialog(function(path, folder){
					that.remove(path, folder, o);
				}, o.path, o.folder);
			break;
		}
		
		this.closeFileMenu();
	},
	clickOnAction: function(icon, goto){
		var that = this;

		if(goto == "create-folder"){
			this.lastFilePath = "/";
			this.openFolderCreatorDialog(function(name){
				that.createFolder(name, "/");
			});
		}else if(goto == "create-file"){
			this.lastFilePath = "/";
			this.openFileCreatorDialog(function(name, type){
				that.createFile(name, type, "/");
			});
		}
	},


	openFileMenu: function(x, y, file){
		var that = this;
		var bars = this.fileMenu.querySelectorAll("hr");

		if(this.lastFileObject != null) this.lastFileObject.div.classList.remove("active");

		var getActionLine = function(action){
			var lines = that.fileMenu.querySelectorAll(".line-menu");
			for(var i = 0; i < lines.length; i++)
				if(lines[i].dataset.action == action) return lines[i];
			return null;
		}

		// Show / hide action lines
		if(file.div == null){
			getActionLine("create-file").show();
			getActionLine("create-folder").show();

			getActionLine("copy").hide();
			getActionLine("cut").hide();
			getActionLine("paste").show();

			getActionLine("rename").hide();
			getActionLine("remove").hide();

			bars[0].show();
			bars[1].hide();
		}else{
			if(file.folder){
				getActionLine("create-file").show();
				getActionLine("create-folder").show();
				getActionLine("paste").show();
				bars[0].show();
			}else{
				getActionLine("create-file").hide();
				getActionLine("create-folder").hide();
				getActionLine("paste").hide();
				bars[0].hide();
			}

			getActionLine("copy").show();
			getActionLine("cut").show();

			getActionLine("rename").show();
			getActionLine("remove").show();

			bars[1].show();
		}	
		
		// Enable / Disable paste button
		if(this.clipboard == null) getActionLine("paste").classList.add("line-disable");
		else getActionLine("paste").classList.remove("line-disable");

		// Check for click on an action line
		var lines = that.fileMenu.querySelectorAll(".line-menu");
		for(var i = 0; i < lines.length; i++){
			lines[i].onclick = function(e){
				e.preventDefault();
				that.clickOnMenuAction(this.dataset.action, this);
				return false;
			}
		}

		this.fileMenu.dataset.file  = file.name;
		this.fileMenu.style.left    = (x + 20) + "px";
		this.fileMenu.style.top     = (y - 17) + "px";
		
		this.fileMenu.show();

		if(file.div != null){
			file.type = file.div.dataset.fileType;
			this.lastFile = file;
		}

		if(file.path != null && file.path[file.path.length - 1] != "/") file.path += "/";
		this.lastFilePath = file.path;

		if(file.div != null){
			file.div.classList.add("active");
			this.lastFileObject = file;
		}else{
			this.lastFilePath = "/";
		}
	},
	closeFileMenu: function(){
		this.fileMenu.dataset.file  = null;
		this.fileMenu.hide();

		if(this.lastFileObject != null) this.lastFileObject.div.classList.remove("active");
		this.lastFileObject = null;
	},

	// Actions menu
	createFile: function(name, type, path){
		var that = this;

		network.request("createFile", {name: name, type: type, path: path}, function(data){
			that.updateToServer();
			
			App.getFilesManager().refreshFiles(function(files){
				that.restoreDom();
			});
		}, "files").send();
	},
	createFolder: function(name, path){
		var that = this;

		network.request("createFolder", {name: name, path: path}, function(data){
			that.updateToServer();

			App.getFilesManager().refreshFiles(function(files){
				that.foldersOpened.push(path + name + "/");
				that.restoreDom();
			});
		}, "files").send();
	},
	copy: function(path){
		this.clipboard = {
			copy: true,
			path: path,
			folder: this.lastFileObject.folder,
			o: this.lastFileObject
		};
	},
	cut: function(path){
		if(this.clipboard != null)
			this.clipboard.o.div.classList.remove("cuted");

		this.lastFileObject.div.classList.add("cuted");

		this.clipboard = {
			cut: true,
			path: path,
			folder: this.lastFileObject.folder,
			o: this.lastFileObject
		};
	},
	paste: function(destination){
		var c    = this.clipboard;
		var that = this;

		if(c.copy){
			alert("Action impossible pour le moment.");
			return false;
		}else if(c.cut){
			if(c.folder){
				network.request("moveFolder", {name: c.o.name, path: c.path, newPath: destination}, function(data){
					that.updateToServer();

					App.getFilesManager().refreshFiles(function(files){
						that.foldersOpened.push(data.newPath);
						that.restoreDom();
					});
				}, "files").send();
			}else{

			}
		}
	},
	rename: function(path, oldName, newName, folder){
		var that = this;

		if(oldName == newName) return false;

		var sf = path.split("/");
		sf.splice(sf.length - 1, 1);

		var method = (folder) ? "renameFolder" : "renameFile";
		var router = App.getRouter();

		network.request(method, {path: path, oldName: oldName, newName: newName}, function(data){
			that.updateToServer();

			App.getFilesManager().refreshFiles(function(files){
				that.restoreDom();

				if(!folder) Tabs.rename(oldName, that.lastFile.type, newName);

				if(router.getCurrentView().name == oldName.toLowerCase() && !folder){
					router.removeView(that.lastFile.type + "-" + oldName.toLowerCase());
					App.getRouter().changeViewTo(that.lastFile.type, newName);
				}

			});
		}, "files").send();

		// Rename fileData in cache (realtime server)
		if(!folder)
			network.request("renameFileData", {type: this.lastFile.type, filename: oldName, newname: LZString.compressToBase64(newName)}, null, "files", "realtime").send();
	},
	remove: function(path, folder, fileObject){
		var that = this;

		var sf = path.split("/");
		sf.splice(sf.length - 1, 1);

		var method = (folder) ? "removeFolder" : "removeFile";

		network.request(method, {path: path}, function(data){
			that.updateToServer();

			App.getFilesManager().refreshFiles(function(files){
				that.restoreDom();
			});

			// Close tab if stored
			if(!folder){
				var tab = Tabs.getTab(data.path, that.lastFile.type);
				if(tab != null) Tabs.closeTab(tab.dom);
			}
		}, "files").send();

		// Remove cache (realtime server)
		if(!folder)
			network.request("removeFileData", {type: fileObject.type, filename: fileObject.name}, null, "files", "realtime").send();
	},

	// Dialogs menu
	openFileCreatorDialog: function(callback){
		var that = this;

		var typesString   = "";
		var types         = {sprite: "Sprite / Image animée", script: "Script", visualscript: "Script visuel", sound: "Son audio", scene: "Scène", tilemap: "Tilemap / Carte"};
		
		for(var i = 0; i < Object.keys(types).length; i++){
			var typeKey = Object.keys(types)[i];
			var type    = types[typeKey];

			typesString += '<option value="'+typeKey+'">'+type+'</option>';
		}

		App.modal(
			"<i class='fa fa-file-o'></i> Créer un fichier",
			"<div class='input'><label for='fileName'>Nom du fichier</label><input type='text' id='fileName' placeholder='Nom du fichier'></div>" +
			"<div class='input'><label for='fileType'>Type de fichier</label><select id='fileType'>" + typesString + "</select></div>" +
			"<div class='input'><label for='filePath'>Chemin du fichier</label><input type='text' id='filePath' style='background:#EFEFEF' value='" + this.lastFilePath + "' placeholder='Chemin par défaut' disabled></div>" +
			"<div class='btn closeAlert'><i class='fa fa-file-o'></i> Créer</div><div class='clear'></div>", 
			
			function(){
				var fn = document.getElementById("fileName").value;
				var tn = document.getElementById("fileType").value;

				if(fn == null || fn == "") return false;
				if(fn.indexOf(" ") > -1){
					alert("Vous ne devriez pas mettre d'espace.");
					return false;
				}

				callback(fn, tn);
			}
		, 500);

		setTimeout(function(){
			document.getElementById("fileName").focus();
		}, 100);
	},
	openFolderCreatorDialog: function(callback){
		var that = this;

		App.modal(
			"<i class='fa fa-folder-o'></i> Créer un dossier",
			"<div class='input'><label for='folderName'>Nom du dossier</label><input type='text' id='folderName' placeholder='Nom du dossier'></div>" +
			"<div class='input'><label for='folderPath'>Chemin du dossier</label><input type='text' id='folderPath' style='background:#EFEFEF' value='" + this.lastFilePath + "' placeholder='Chemin par défaut' disabled></div>" +
			"<div class='btn closeAlert'><i class='fa fa-folder-o'></i> Créer</div><div class='clear'></div>", 
			
			function(){
				var fn = document.getElementById("folderName").value;
				if(fn == null || fn == "") return false;
				if(fn.indexOf(" ") > -1){
					alert("Vous ne devriez pas mettre d'espace.");
					that.openFolderCreatorDialog(callback);
					return false;
				}

				callback(fn);
			}
		, 500);

		setTimeout(function(){
			document.getElementById("folderName").focus();
		}, 100);
	},
	openRenameConfirmDialog: function(callback, path, name, folder){
		var that = this;

		App.modal(
			"<i class='fa fa-" + ((folder) ? "folder" : "file") + "-o'></i> Renommer un " + ((folder) ? "dossier" : "fichier"),
			"<div class='input'><label for='componentName'>Nouveau nom du " + ((folder) ? "dossier" : "fichier") + "</label><input type='text' id='componentName' onkeyup='document.getElementById(\"componentPath\").value=\"" + path + "\"+this.value+\"" + ((folder)?"/":"") + "\";' value='" + name + "' placeholder='Nom du " + ((folder) ? "dossier" : "fichier") + "'></div>" +
			"<div class='input'><label for='componentPath'>Nouveau chemin du " + ((folder) ? "dossier" : "fichier") + "</label><input type='text' id='componentPath' style='background:#EFEFEF' value='" + path + name + ((folder)?"/":"") + "' placeholder='Chemin par défaut' disabled></div>" +
			"<div class='btn closeAlert'><i class='fa fa-send'></i> Envoyer</div><div class='clear'></div>", 
			
			function(){
				var cn = document.getElementById("componentName").value;
				if(cn.indexOf(" ") > -1){
					alert("Vous ne devriez pas mettre d'espace.");
					return false;
				}

				callback(path, cn, folder);
			}
		, 400);

		setTimeout(function(){
			var el = document.getElementById("componentName");
			el.focus();
			el.setSelectionRange(el.value.length, el.value.length);
		}, 100);
	},
	openRemoveConfirmDialog: function(callback, path, folder){
		var that = this;

		if(!folder) path = path.substring(0, path.length - 1);

		App.modal(
			"<i class='fa fa-" + ((folder) ? "folder" : "file") + "-o'></i> Supprimer un " + ((folder) ? "dossier" : "fichier"),
			"<div class='input'><label for='componentName'>Nom du " + ((folder) ? "dossier" : "fichier") + "</label><input type='text' value='" + path + "' disabled id='componentName' placeholder='Nom du composant'></div>" +
			"<div class='btn btn-success closeAlert' onclick='Sidebar.confirmOption=true;' style='width:47.5%;float:left;margin-right:5%'><i class='fa fa-check'></i> Continuer</div>" + 
			"<div class='btn btn-danger closeAlert' onclick='Sidebar.confirmOption=false;' style='width:47.5%;float:left'><i class='fa fa-times'></i> Annuler</div><div class='clear'></div>", 
			
			function(){
				if(!that.confirmOption) return false;
				callback(path, folder);
			}
		, 400);
	},
	openCopyDialog: function(callback, path, name, folder){
		var that = this;

		App.modal(
			"<i class='fa fa-" + ((folder) ? "folder" : "file") + "-o'></i> Renommer le " + ((folder) ? "dossier" : "fichier") + " '" + name + "'",
			"<div class='input'><label for='componentName'>Nouveau nom du " + ((folder) ? "dossier" : "fichier") + "</label><input type='text' id='componentName' onkeyup='document.getElementById(\"componentPath\").value=\"" + path + "\"+this.value+\"" + ((folder)?"/":"") + "\";' value='" + name + "' placeholder='Nom du " + ((folder) ? "dossier" : "fichier") + "'></div>" +
			"<div class='input'><label for='componentPath'>Nouveau chemin du " + ((folder) ? "dossier" : "fichier") + "</label><input type='text' id='componentPath' style='background:#EFEFEF' value='" + path + name + ((folder)?"/":"") + "' placeholder='Chemin par défaut' disabled></div>" +
			"<div class='btn closeAlert'><i class='fa fa-send'></i> Envoyer</div><div class='clear'></div>", 
			
			function(){
				var cn = document.getElementById("componentName").value;
				if(cn.indexOf(" ") > -1){
					alert("Vous ne devriez pas mettre d'espace.");
					return false;
				}

				callback(path, cn, folder);
			}
		, 400);

		setTimeout(function(){
			var el = document.getElementById("componentName");
			el.focus();
			el.setSelectionRange(el.value.length, el.value.length);
		}, 100);
	},

};

var Sidebar = new Sidebar();