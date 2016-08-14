function RessourcesManager(){
	this.windowId    = "srcmanager";
	this.windowIdBis = "srcmanager";
	this.triggerId   = "rm_icon";
	this.dropMenuId  = "rm_dropdownmenu";

	this.opened = false;

	this.importerMode     = false;
	this.importerCallback = false;
	
	this.dropdownopened  = false;
	this.lastElDropDown  = null;
	this.currentRenameEl = null;


	this.assets = {};
}

RessourcesManager.prototype = {

	init: function(){
		var that = this;
		var icon = document.getElementById(this.triggerId);

		icon.onclick = function(e){
			e.preventDefault();
			that.open();
			return false;
		}

		this.reloadRessources();
	},

	open: function(container){
		this.importerMode     = false;
		this.importerCallback = null;
		if(container != null) this.windowId = container;
		else this.windowId = this.windowIdBis;

		var that      = this;
		var windowrm  = document.getElementById(this.windowId);
		var container = windowrm.querySelector(".container");

		windowrm.style.display = "block";

		container.querySelector(".close").onclick = function(){
			that.close();
		}
		container.querySelector("#rm_addressource").onclick = function(){
			that.openAddSrcBox();
		}
		
		this.opened = true;

		this.fixManagerPosition();
		this.reloadRessourcesList();
	},
	openImporter: function(callback){
		this.windowId = this.windowIdBis;
		
		this.open();
		this.importerMode = true;
		this.configImporter();

		this.importerCallback = callback;
		this.fixManagerPosition();
	},
	openImporterIn: function(container, callback){
		this.open(container);
		this.importerMode = true;
		this.configImporter();

		this.importerCallback = callback;

		var container = document.getElementById(this.windowId).querySelector(".container");
		container.style.left = 0;
		container.style.top  = 0;
	},
	close: function(){
		if(!this.opened) return false;
		var windowrm = document.getElementById(this.windowId);

		windowrm.querySelector("#rm_addressource").style.display = "block";
		windowrm.querySelector(".title").innerHTML = '<i class="fa fa-connectdevelop"></i> Gestionnaire de ressources';
		windowrm.style.display = "none";

		this.closeAssetInformations();

		this.opened = false;
	},


	getRessources: function(){
		return this.assets;
	},
	getRessourcePreview: function(ressource){
		console.log(this.assets);
	},

	configImporter: function(){
		var windowrm = document.getElementById(this.windowId);
		windowrm.querySelector(".title").innerHTML = '<i class="fa fa-connectdevelop"></i> Importer une ressource';
		windowrm.querySelector("#rm_addressource").style.display = "none";
	},


	reloadRessourcesList: function(){
		var that = this;

		var windowrm  = document.getElementById(this.windowId);
		windowrm.querySelector(".ressourcesnum").innerHTML = "0";
		windowrm.querySelector(".ressources").innerHTML = '<p style="display:block;width:100%;text-align:center;padding-top:15px"><i class="fa fa-spinner fa-spin"></i> Chargement des ressources...</p>';
		this.assets = {};

		windowrm.querySelector(".ressources").addEventListener("scroll", function(){
			that.closeDropDownMenu();
			that.stopRenameMode();
		});
		
		this.reloadRessources(true);
	},
	reloadRessources: function(forceDomReload){
		var self = this;
		var windowrm  = document.getElementById(this.windowId);
		
		Utils.doAjaxRequest("getAssets", {}, function(d){
			d = JSON.parse(d);
			if(forceDomReload) windowrm.querySelector(".ressources").innerHTML = "";

			for(var i = 0; i < Object.keys(d).length; i++){
				var key = Object.keys(d)[i];
				var val = d[Object.keys(d)[i]];

				self.assets[parseInt(key)] = val.filename;
				if(forceDomReload) self.addRessourceBox(parseInt(key), val.name, val.filename);
			}
		});
	},


	addRessourceBox: function(index, srcname, source){
		var that = this;

		var windowrm  = document.getElementById(this.windowId);
		var container = windowrm.querySelector(".ressources");

		var url      = "https://gameindus.fr/static/" + source;
		var basename = source.split("/")[source.split("/").length - 1];

		var box = document.createElement("div");
		box.className = "ressource";
		box.dataset.index = index;

		var preview = document.createElement('div');
		preview.className = "preview";
		preview.style.backgroundImage = "url("+url+")";
		var name = document.createElement('div');
		name.className = "name";
		name.innerHTML = srcname;
		var meta = document.createElement('div');
		meta.className = "meta";
		meta.dataset.index = index;
		var iconDropDown = document.createElement('i');
		iconDropDown.className = "fa fa-caret-down";

		var clear = document.createElement('div');
		clear.className = "clear";

		preview.onclick = function(){
			if(that.importerMode){that.importerCallback(that.assets[this.parentNode.dataset.index]);if(that.windowId==that.windowIdBis){that.close();}return false;}
			that.openAssetInformations(this.parentNode.dataset.index);
			return false;
		}

		meta.appendChild(iconDropDown);
		meta.onclick = function(){
			that.openDropDownMenu(this, this.dataset.index);
			return false;
		}

		if(that.importerMode) name.style.width = "100%";
		if(that.importerMode) preview.classList.add("importmode");

		box.appendChild(preview);
		box.appendChild(name);
		if(!that.importerMode) box.appendChild(meta);
		box.appendChild(clear);

		container.appendChild(box);

		// Update src number
		var num = parseInt(windowrm.querySelector(".ressourcesnum").innerHTML);
		windowrm.querySelector(".ressourcesnum").innerHTML = (num + 1);
	},


	openAssetInformations: function(index){
		var that  = this;

		var asset = this.assets[index];
		if(asset == null) return false;

		Utils.doAjaxRequest("getAssets", {asset: asset}, function(d){
			d = JSON.parse(d);
			var windowrm  = document.getElementById(that.windowId);
			var container = windowrm.querySelector(".content_infos");

			var basename  = (asset.split("/")[asset.split("/").length - 1].split(".")[0]).replaceAll("-", " ").replaceAll("_", " ").ucfirst();
			var lastmodif = new Date(d.lastmodif * 1000);
			var creation  = new Date(d.datecreation * 1000);

			container.innerHTML = "";
			container.style.display = "block";

			var back = document.createElement("p");
			back.className = "back";
			back.innerHTML = "<span style='cursor:pointer;text-decoration:underline;font-size:0.85em;padding-bottom:10px'><i class='fa fa-long-arrow-left'></i> Retour</span>";
			back.onclick = function(){that.closeAssetInformations();}

			var title = document.createElement("p");
			title.className = "sub-title";
			title.style.fontSize = "1.1em";
			title.innerHTML = "Informations sur la ressource : <b>"+basename+"</b>";

			var infos = document.createElement("p");
			infos.className = "infos";
			infos.innerHTML = "Taille : <b>" + humanFileSize(d.size, true) + "</b>";
			infos.innerHTML += "<br>Date de dernière modifiction : le <b>" + formatDateToString(lastmodif) + "</b>";
			infos.innerHTML += "<br>Date de création : le <b>" + formatDateToString(creation) + "</b>";

			container.appendChild(back);
			container.appendChild(title);
			container.appendChild(infos);
		});
	},
	closeAssetInformations: function(){
		var windowrm  = document.getElementById(this.windowId);
		var container = windowrm.querySelector(".content_infos");

		container.style.display = "none";
		container.innerHTML = "";
	},


	openDropDownMenu: function(from, index){
		var that = this;
		if(this.lastElDropDown != null) this.lastElDropDown.className = "meta";

		var menu = document.getElementById(this.dropMenuId);
		var cbb  = from.getBoundingClientRect();

		menu.style.top   = (cbb.top + cbb.height) + "px";
		menu.style.left = (cbb.left - 139) + "px";
		menu.style.display = "block";

		from.className = "meta active";

		menu.querySelector("#rm_export").dataset.index = index;
		menu.querySelector("#rm_rename").dataset.index = index;
		menu.querySelector("#rm_delete").dataset.index = index;

		menu.querySelector("#rm_export").onclick = function(){
			var index = this.dataset.index;
			var path  = that.assets[index];

			var link = document.createElement("a");
			link.download = path;
			link.href = "http://gameindus.fr/static/" + path;
			link.click();
		}
		menu.querySelector("#rm_delete").onclick = function(){
			var index = this.dataset.index;
			var path  = that.assets[index];

			var src  = path.split("/")[path.split("/").length - 1];
			var name = that.lastElDropDown.parent().querySelector(".name").innerHTML;


			that.openRemoveConfirmDialog(function(n){
				network.request("removeRessource", {name: name, src: src}, function(d){
					that.reloadRessourcesList();
				}, "srcmanager").send();
			}, name);
		}
		menu.querySelector("#rm_rename").onclick = function(){
			that.startRenameMode(this.dataset.index, that.assets[index]);
		}

		this.lastElDropDown = from;
		this.dropdownopened = true;
	},
	closeDropDownMenu: function(){
		if(!this.dropdownopened) return false;
		var menu = document.getElementById(this.dropMenuId);

		menu.style.display = "none";
		if(this.lastElDropDown != null) this.lastElDropDown.className = "meta";

		this.lastElDropDown = null;
		this.dropdownopened = false;
	},


	openAddSrcBox: function(){
		var that = this;
		var input = document.getElementById("rm_addressourceinput");
		var btn   = document.getElementById("rm_addressource");

		input.onchange = undefined;
		input.onchange = function(){
			btn.className = "button uploading";

			var img = this.files[0];
		    var fileName = img.name; // not path
		    var fileSize = img.size; // bytes
		    var fileType = img.type; // Type

		    this.value = null;this.files = [];

		    // Verif filename if exists
		    var assetsValues = that.assets.getValues();
		    for(var i = 0; i < assetsValues.length; i++){
		    	var av = assetsValues[i];
		    	var avp = av.getBasename().split(".")[0];

		    	if(avp == fileName.split(".")[0]){
		    		btn.className = "button";
		    		alert("Une ressource se nomme déjà '"+fileName+"' ! Veuillez réessayer.");
		    		return false;
		    	}
		    }

		    if(!fileType.match("image/*")){
		    	btn.className = "button";
		    	alert('Vous devez envoyer une image. (png, jpeg, gif...)');
		    	return false;
		    }

			// Send file
			var formData = new FormData();
			var xhr = new XMLHttpRequest();
			
			formData.append(fileName, img, fileName);
			xhr.open('POST', 'lib/ajax/uploadFile.php', true);
			xhr.onload = function () {
			  	if (xhr.status === 200) {
			  		if(xhr.responseText == "error_moving_file"){
		    			alert('Erreur: le fichier n\'a pas pu être déplacé.');
		    			return false;
		    		}

			    	if(xhr.responseText != "error"){
			    		var splitFile = xhr.responseText.split("/");
			    		var basename = pad(document.getElementById("projectId").value, 4)+"/assets/"+splitFile[splitFile.length-1];

			    		var spli = ("http://gameindus.fr/static/"+basename).split("/");
						var file = spli[spli.length-1];
						var path = file;
						network.request("saveRessource", {src: path, name: file.split(".")[0]}).send();

						btn.className = "button";
						that.reloadRessourcesList();
			    	}else{
			    		alert(xhr.responseText);
			    	}
			  	} else {
			   		alert('An error occurred!');
			  	}
			};
			xhr.send(formData);
		};

		input.click();
	},
	startRenameMode: function(index, path){
		var that = this;

		var box  = document.getElementById(this.windowId).querySelector('.ressource[data-index="'+index+'"]');
		var name = box.querySelector(".name");

		var input = document.createElement("input");
		input.type = "text";
		input.className = "rename_input";

		name.insertAfter(input);

		input.value = name.innerHTML;
		input.focus();

		var icon = document.createElement("i");
		icon.className = "fa fa-pencil rename_icon";
		input.insertAfter(icon);

		setTimeout(function(){
			input.style.background = "#e5e5e5";
			input.style.paddingLeft = "25px";
			
			icon.style.color = "#383838";
		}, 100);

		input.onkeydown = function(e){
			var value = this.value;
			if(e.keyCode == 13){
				if(!confirm("Attention ! Si cette ressource est utilisée dans un des fichiers, elle y sera aussi supprimée.")){
					that.stopRenameMode(); return false;
				}
				icon.className = "fa fa-spin fa-spinner rename_icon";

				network.request("renameRessource", {oldname: name.innerHTML, oldfile: path.getBasename(), newname: this.value}, function(d){
					name.innerHTML = value;
					that.stopRenameMode();
				}, "srcmanager").send();
			}
		}

		this.currentRenameEl = {index: index, path: path, box: box, input: input, icon: icon};
	},
	stopRenameMode: function(){
		if(this.currentRenameEl == null) return false;

		this.currentRenameEl.input.remove();
		this.currentRenameEl.icon.remove();

		this.currentRenameEl = null;
	},


	fixManagerPosition: function(){
		if(!this.opened) return false;
		var container = document.getElementById(this.windowId).querySelector(".container");

		var size  = [container.offsetWidth, container.offsetHeight];
		var wsize = [window.innerWidth, window.innerHeight];

		container.style.left = (wsize[0]/2-size[0]/2) + "px";
		container.style.top  = (wsize[1]/2-size[1]/2) + "px";
	},

	openRemoveConfirmDialog: function(callback, name){
		var that = this;

		App.modal(
			"<i class='fa fa-image'></i> Supprimer la ressource '" + name + "'",
			"<div class='input'><label for='ressourceName'>Nom de la ressource </label><input type='text' value='" + name + "' disabled id='ressourceName' placeholder='Nom de la ressource'></div>" +
			"<div class='btn btn-success closeAlert' onclick='srcManager.confirmOption=true;' style='width:47.5%;float:left;margin-right:5%'><i class='fa fa-check'></i> Continuer</div>" + 
			"<div class='btn btn-danger closeAlert' onclick='srcManager.confirmOption=false;' style='width:47.5%;float:left'><i class='fa fa-times'></i> Annuler</div><div class='clear'></div>", 
			
			function(){
				if(!that.confirmOption) return false;
				callback(name);
			}
		, 600);
	}

};

var srcManager = new RessourcesManager();
srcManager.init();

// Utils
window.addEventListener("resize", function(){
	srcManager.fixManagerPosition();
});
window.addEventListener("click", function(e){
	var el = e.getTarget();
	if(el == null || el.className == null || el.className == "") return false;

	if(el.className.indexOf("rename_input") == -1 && (el.id != "rm_rename" && (el.parentNode == null || el.parentNode.id != "rm_rename")))
		srcManager.stopRenameMode();

	if(el.className.indexOf("meta") > -1) return false;
	if(el.parentNode != null && el.parentNode.className != null && el.parentNode.className.indexOf("meta") > -1) return false;

	srcManager.closeDropDownMenu();
});
window.addEventListener("keydown", function(e){
	if(e.keyCode == 27) srcManager.close();
});

function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
}

function formatDateToString(date){
	return date.getDate().pad(2) + "/" + (date.getMonth()+1).pad(2) + "/" + date.getFullYear() + " à " + date.getHours().pad(2) + ":" + date.getMinutes().pad(2);
}
String.prototype.getBasename = function(){
	return (this.split('/')[this.split("/").length-1]);
}