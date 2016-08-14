function GIMarket(){
	this.windowId    = "gimarket";
	this.windowIdBis = "gimarket";
	this.triggerId   = "gm_trigger";

	this.opened = false;
	this.assets = {};
	this.mode   = "image";

	this.assetSelectedEvent   = null;
	this.assetsLoadedEvents   = [];

	this.lastRequest = 0;
}

GIMarket.prototype = {

	init: function(){
		var that = this;
		var trigger = document.getElementById(this.triggerId);

		trigger.onclick = function(e){
			e.preventDefault();
			that.open();
			return false;
		}
	},

	open: function(mode){
		var that      = this;
		var windowrm  = document.getElementById(this.windowId);
		var container = windowrm.querySelector(".container");

		windowrm.style.display = "block";
		if(mode != undefined) this.mode = mode;

		container.querySelector(".close").onclick = function(){
			that.close();
		}
		
		this.opened = true;
		if(this.windowIdBis == this.windowId) this.fixPosition();

		this.initForm();
	},
	openIn: function(container, mode){
		this.windowId = container;
		this.open(mode);
	},
	close: function(){
		if(!this.opened) return false;
		var windowrm = document.getElementById(this.windowId);

		windowrm.querySelector(".title").innerHTML = '<i class="fa fa-shopping-basket"></i> Magasin GameIndus';
		windowrm.style.display = "none";

		this.opened = false;
	},

	initForm: function(){
		var that = this;

		var input     = document.getElementById("marketsearch_input");
		var container = document.getElementById(this.windowId).querySelector(".search-results");

		input.value = "";
		container.innerHTML = '<span class="text">Commencez à taper pour rechercher des ressources.</span>';

		input.onkeyup = function(e){
			var val = this.value;

			if(val.length >= 3){
				if(Date.now() - that.lastRequest < 1000){
					return false;
				}

				that.lastRequest = Date.now();

				network.connection.emit("getAssetsFromMarket", {search: val});
				network.connection.on("getAssetsFromMarket", function(d){
					network.connection.off("getAssetsFromMarket");

					var assets = d.assets;
					
					container.innerHTML = "";

					for(var i = 0; i < assets.length; i++){
						var asset = assets[i];
						var type  = (asset.type == "sprite" || asset.type == "image" || asset.type == "tilemap") ? "image" : "audio";

						if(type != that.mode){assets.splice(i, 1);continue;}
						if(asset.rating == -1) asset.rating = 2.5;

						var result = document.createElement("div");
						result.className = "result";

						asset.publish_date = formatDate(asset.publish_date);

						var bgUrl = 'https://placeholdit.imgix.net/~text?txtsize=24&txt=Fichier%20audio&w=500&h=300';
						if(asset.type == "sprite" || asset.type == "image" || asset.type == "tilemap")
							bgUrl = "http://market.gameindus.fr/preview/" + asset.filename;

						var tagsStr = "";
						var tags    = asset.tags.split(",");

						for(var j = 0; j < tags.length; j++){
							var tag = tags[j];
							tagsStr += '<div class="tag">' + tag + '</div>';
						}

						result.innerHTML = '<div class="preview" style="background-image:url(' + bgUrl + ')"></div><div class="right"><div class="result-title">' + asset.name + '</div><div class="button select">Séléctionnez <i class="fa fa-angle-double-right"></i> </div><div class="tags">' + tagsStr + '</div><p class="description">' + asset.description + '</p><div class="meta-bar"><span>Publiée le <b>' + asset.publish_date + '</b></span><span style="color:#c0392b"><i class="fa fa-heart"></i> <b>' + asset.likes + '</b></span><span style="color:#2980b9"><i class="fa fa-star"></i> <b>' + asset.rating + ' / 5</b></span><span>Catégorie: Test</u></span><span>Auteur: <u>Utarwyn</u></span></div></div>';

						result.dataset.name       = asset.name;
						result.dataset.filename = asset.filename;

						container.appendChild(result);

						result.querySelector(".select").onclick = function(){
							var result = this.parentNode.parentNode;
							if(that.assetSelectedEvent != null) that.assetSelectedEvent(result.dataset.name, result.dataset.filename);
						}
					}

					if(assets.length == 0){
						container.innerHTML = '<span class="text"><i class="fa fa-times"></i> Aucune ressource trouvée.</span>'
					}

					for(var i = 0; i < that.assetsLoadedEvents.length; i++)
						that.assetsLoadedEvents[i](assets);

				});
			}else{
				container.innerHTML = '<span class="text">Commencez à taper pour rechercher des ressources.</span>';
			}
		}
	},

	onAssetSelected: function(callback){
		this.assetSelectedEvent = callback;
	},
	onAssetsLoaded: function(callback){
		this.assetsLoadedEvents.push(callback);
	},


	fixPosition: function(){
		if(!this.opened) return false;
		var container = document.getElementById(this.windowId).querySelector(".container");

		var size  = [container.offsetWidth, container.offsetHeight];
		var wsize = [window.innerWidth, window.innerHeight];

		container.style.left = (wsize[0]/2-size[0]/2) + "px";
		container.style.top  = (wsize[1]/2-size[1]/2) + "px";
	}

};

var gIMarket = new GIMarket();

// Utils
window.addEventListener("resize", function(){
	gIMarket.fixPosition();
});
window.addEventListener("keydown", function(e){
	if(e.keyCode == 27) gIMarket.close();
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
	return pad(date.getDate(), 2) + "/" + pad(date.getMonth()+1, 2) + "/" + pad(date.getFullYear()) + " à " + pad(date.getHours(), 2) + ":" + pad(date.getMinutes(), 2);
}
String.prototype.getBasename = function(){
	return (this.split('/')[this.split("/").length-1]);
}