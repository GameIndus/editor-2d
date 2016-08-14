function TilemapWorkspace(editor){
	this.game      = null;
	this.gameScene = null;
	this.editor    = editor;
	this.startCursorPosition, this.lastCursorPosition;

	this.drawMode = "brush";
	this.toolMode = "paint";

	this.size = {w: -1, h: -1};
	this.layer = 0;
	
	this.selObj   = null;
	this.tmpTiles = [];
	this.tiles    = [];
}

TilemapWorkspace.prototype = {

	init: function(){
		if(this.game == null) return false;
		Config.debugMode = false;

		var that = this;
		var size = this.game.getSize();

		var scene      = new Scene();
		var bg         = new Background({color: "black"});
		var camera     = new Camera();

		// Define camera for zoom & move
		camera.setBounds(false);
		camera.setMoveOn("X", true);
		camera.setMoveOn("Y", true);
		scene.setActiveCamera(camera);

		if(this.game.getScene("default") == null) this.game.addScene("default", scene);
		this.game.setCurrentScene("default");

		this.gameScene = scene;

		if(this.selObj == null){
			this.selObj = new GameObject([0, 0]);
			this.selObj.setRenderer(new ImageRenderer({name: "currentTileset", customSized: true}));
			this.selObj.setOpacity(0);
			scene.add(this.selObj);
		}

		var gRHandler = function(){
			that.renderSolidLayer();
		};
		Game.getEventsManager().removeListener("gameRendered", gRHandler);
		Game.getEventsManager().on("gameRendered", gRHandler);

		this.initTriggers();
	},
	changeMapOverlay: function(width, height){
		var overlay   = document.getElementById("editor-container").querySelector(".tilemap-overlay");
		var ressource = this.editor.ressource;

		if(ressource == null) return false;

		overlay.setStyle("width", (ressource.cellSize.w * width) + "px");
		overlay.setStyle("height", (ressource.cellSize.h * height) + "px");

		if(width > 0) document.getElementById("map_cell_width").value = width;
		if(height > 0) document.getElementById("map_cell_height").value = height;

		this.size = {w: width, h: height};
	},
	initTriggers: function(){
		var that = this;
		var bar  = document.querySelector(".tilemap-tool-bar");

		Input.reset();
		document.getElementById("tilemapEditor").oncontextmenu=function(a){return a.preventDefault(),!1};
		Input.mouseMove(function(e){
			if(e.target.id !== "tilemapEditor") return false;
			var pos = e.getPosition();
			var sel = that.editor.selection;
			var res = that.editor.ressource; 

			if(that.toolMode == "paint"){
				if(sel.size.w == 0 || sel.size.h == 0) return false;
				var tile = that.editor.coordsToTile(pos.getX(), pos.getY());

				that.selObj.setPosition(tile.x * res.cellSize.w, tile.y * res.cellSize.h);
				that.selObj.getRenderer().pos.set(sel.getPosition().getX() * res.cellSize.w, sel.getPosition().getY() * res.cellSize.h);
				that.selObj.setSize(sel.getSize().w * res.cellSize.w, sel.getSize().h * res.cellSize.h);
				that.selObj.setOpacity(1);
				that.selObj.setLayer(9);

				if((that.size.w > 0 && tile.x >= that.size.w) || (that.size.h > 0 && tile.y >= that.size.h)) that.selObj.setOpacity(0);

				if(Input.mouseIsDown("left")){
					if(that.lastCursorPosition != null && that.lastCursorPosition.x == tile.x && that.lastCursorPosition.y == tile.y) return false;
					that.drawSelectionAt(pos.getX(), pos.getY(), (that.drawMode == "shape"));
					that.lastCursorPosition = tile.clone();
				}
				if(that.drawMode == "bucket"){
					if(that.lastCursorPosition != null && that.lastCursorPosition.x == tile.x && that.lastCursorPosition.y == tile.y) return false;
					that.fillWithBucket(pos.getX(), pos.getY());
					that.lastCursorPosition = tile.clone();
				}
			}else{
				if(that.selObj != null) that.selObj.setOpacity(0);
			}

			if(that.toolMode == "erase" && (Input.mouseIsDown("left") || Input.mouseIsDown("right"))){
				var tile = that.editor.coordsToTile(pos.getX(), pos.getY());
				that.removeTileAt(tile.x, tile.y, that.layer);
				that.editor.realtimeSend("removetile", {posx: tile.x, posy: tile.y, layer: that.layer});
			}
		});
		Input.mouseDown("left", function(e){
			if(e.target.id !== "tilemapEditor") return false;
			var pos = e.getPosition();

			if(that.toolMode == "paint"){
				var tmp = (that.drawMode == "shape");
				if(that.drawMode == "bucket") that.fillWithBucket(pos.getX(), pos.getY(), true);

				that.startCursorPosition = pos.clone();
				that.drawSelectionAt(pos.getX(), pos.getY(), tmp);
			}else if(that.toolMode == "erase"){
				var tile = that.editor.coordsToTile(pos.getX(), pos.getY());
				
				that.removeTileAt(tile.x, tile.y, that.layer);
				that.editor.realtimeSend("removetile", {
					posx: tile.x,
					posy: tile.y,
					layer: that.layer,
				});
			}else if(that.toolMode == "solid"){
				var tilePos = that.editor.coordsToTile(pos.getX(), pos.getY());
				var tile    = that.getTileAt(tilePos.x, tilePos.y, that.layer);
				if(tile != null) tile.solid = !tile.isSolid();

				that.editor.realtimeSend("changetilesolidity", {
					layer: tile.getLayer(),
					posx : tile.getPosition().getX(),
					posy : tile.getPosition().getY(),
					value: tile.isSolid()
				});
			}
		}, true);
		Input.mouseUp("left", function(e){
			if(e.target.id !== "tilemapEditor") return false;

			if(that.toolMode == "paint"){
				if(that.drawMode == "shape"){
					var newTexture = that.editor.selection.getPosition();

					// Send all tiles in realtime
					that.tmpTiles.forEach(function(tmpTile){
						if(tmpTile.changes){
							that.editor.realtimeSend("replacetile", {
								posx: tmpTile.position.getX(),
								posy: tmpTile.position.getY(),
								layer: tmpTile.layer,
								texturex: newTexture.getX(),
								texturey: newTexture.getY()
							});
						}else{
							that.editor.realtimeSend("newtile", {
								posx: tmpTile.getPosition().getX(),
								posy: tmpTile.getPosition().getY(),
								layer: tmpTile.getLayer(),
								texturex: newTexture.getX(),
								texturey: newTexture.getY()
							});
						}
					});

					that.tmpTiles = [];
				}

				that.clearTempTiles();
			}
		}, true);
		Input.mouseDown("right", function(e){
			if(e.target.id !== "tilemapEditor") return false;
			var bar = document.querySelector(".tilemap-tool-bar");

			var pos = e.getPosition();
			that.lastToolMode = that.toolMode + "";
			that.toolMode = "erase";

			if(that.selObj != null) that.selObj.setOpacity(0);

			bar.querySelector(".tool[data-tool='paint-mode']").classList.remove("active");
			bar.querySelector(".tool[data-tool='solid-mode']").classList.remove("active");
			bar.querySelector(".tool[data-tool='erase-mode']").classList.add("active");	

			var tile = that.editor.coordsToTile(pos.getX(), pos.getY());
			that.removeTileAt(tile.x, tile.y, that.layer);
			that.editor.realtimeSend("removetile", {posx: tile.x, posy: tile.y, layer: that.layer});
		}, true);
		Input.mouseUp("right", function(e){
			if(e.target.id !== "tilemapEditor") return false;
			var bar = document.querySelector(".tilemap-tool-bar");

			that.toolMode = that.lastToolMode;

			if(that.selObj != null) that.selObj.setOpacity(1);
			if(that.toolMode == "erase") return false;


			if(that.toolMode == "paint") bar.querySelector(".tool[data-tool='paint-mode']").classList.add("active");
			if(that.toolMode == "solid") bar.querySelector(".tool[data-tool='solid-mode']").classList.add("active");
			bar.querySelector(".tool[data-tool='erase-mode']").classList.remove("active");		
		}, true);

		Input.keyDown("+", function(){
			that.changeLayerTo(that.layer + 1);
		}, true);
		Input.keyDown("-", function(){
			that.changeLayerTo(that.layer - 1);
		}, true);
		Input.keyDown("tab", function(e){
			var target = e.getTarget();
			if(target.tagName === "INPUT") return true;

			e.preventDefault();
			that.editor.selectzone.collapse();
		}, true);

		// Tools
		var toolIcons = document.querySelectorAll(".tilemap-tool-bar .tool");
		for(var i = 0; i < toolIcons.length; i++){
			var toolIcon = toolIcons[i];
			toolIcon.onclick = function(){
				that.clickOnTool(this, this.dataset.tool);
			}
		}

		// this.loadCameraSystem();
	},

	loadCameraSystem: function(){
		var self = this;

		var lastCursorPosition = null;

		document.oncontextmenu = document.body.oncontextmenu = function() {return false;}
		Input.mouseMove(function(e){
			e.preventDefault();

			var target = e.getTarget();
			var camera = self.getGameScene().getActiveCamera();

			if(!Input.mouseIsDown("middle") || camera == null){
				lastCursorPosition = null;
				return false;
			}

			if(lastCursorPosition == null)
				lastCursorPosition = e.getEditorPosition();

			var currentPosition = e.getEditorPosition();
			var diffPosition    = currentPosition.clone().subtract(lastCursorPosition);

			camera.getPosition().subtract(diffPosition);

			lastCursorPosition = currentPosition.clone();
		});
	},


	// Manage scene tilemap
	addTileAt: function(x, y, tx, ty, temp){
		var res = this.editor.ressource;
		if(res == null) return false; 

		var tile = new TilemapTile("currentTileset", res.cellSize, new Position(x, y), new Position(tx, ty));
		tile.layer = this.layer;

		window.lastTile = tile;

		this.game.getCurrentScene().add(tile.create());
		this.tiles.push(tile);

		if(temp && this.tmpTiles.indexOf(tile) == -1) this.tmpTiles.push(tile);
	},
	getTileAt: function(x, y, layer){
		for(var i = 0; i < this.tiles.length; i++){
			var tile = this.tiles[i];
			if(tile.getPosition().getX() == x && tile.getPosition().getY() == y && tile.getLayer() == layer)
				return tile;
		}

		return null;
	},
	removeTileAt: function(x, y, layer){
		var tileAt = this.getTileAt(x, y, layer);
		if(tileAt == null) return false;

		this.game.getCurrentScene().removeGameObject(tileAt.getObject());
		this.tiles.splice(this.tiles.indexOf(tileAt), 1);
	},
	removeTile: function(tile){
		if(tile == null) return false;

		this.game.getCurrentScene().removeGameObject(tile.getObject());
		this.tiles.splice(this.tiles.indexOf(tile), 1);
	},
	getGameScene: function(){
		return this.gameScene;
	},


	// Manage tools & selection
	clearTempTiles: function(){
		for(var i = 0; i < this.tmpTiles.length; i++){
			var tile   = this.tmpTiles[i]; 

			if(tile.changes){
				var tileAt = this.getTileAt(tile.position.getX(), tile.position.getY(), this.layer);
				if(tileAt != null) tileAt.changeTextureTo(tile.texturePosition.getX(), tile.texturePosition.getY());
			}else{
				this.removeTile(tile);
			}
		}

		this.tmpTiles = [];
	},
	clickOnTool: function(icon, tool){
		var bar = document.querySelector(".tilemap-tool-bar");
		
		if((tool == "brush-mode" || tool == "shape-mode" || tool == "bucket-mode") && !icon.classList.contains("disabled")){
			bar.querySelector(".tool[data-tool='brush-mode']").classList.remove("active");
			bar.querySelector(".tool[data-tool='shape-mode']").classList.remove("active");
			bar.querySelector(".tool[data-tool='bucket-mode']").classList.remove("active");

			this.clearTempTiles();

			this.drawMode = tool.split("-")[0];
			icon.classList.add("active");
		}else if(tool == "paint-mode" || tool == "solid-mode" || tool == "erase-mode"){
			bar.querySelector(".tool[data-tool='paint-mode']").classList.remove("active");
			bar.querySelector(".tool[data-tool='solid-mode']").classList.remove("active");
			bar.querySelector(".tool[data-tool='erase-mode']").classList.remove("active");

			var drawtypeTools = [bar.querySelector(".tool[data-tool='brush-mode']"), bar.querySelector(".tool[data-tool='shape-mode']"), bar.querySelector(".tool[data-tool='bucket-mode']")];
			for(var i = 0; i < drawtypeTools.length; i++){
				var drawTool = drawtypeTools[i];

				if(tool != "paint-mode"){
					drawTool.setStyle("opacity", 0.2);
					drawTool.classList.add("disabled");
				}else{
					drawTool.setStyle("opacity", 1);
					drawTool.classList.remove("disabled");
				}
			}

			this.clearTempTiles();

			this.toolMode = tool.split("-")[0];
			icon.classList.add("active");
		}else if(tool == "settings"){
			this.openParamBox(false, false);
		}else if(tool == "layerup"){
			this.changeLayerTo(this.layer + 1);
		}else if(tool == "layerdown"){
			this.changeLayerTo(this.layer - 1);
		}
	},
	changeLayerTo: function(layer){
		var that = this;
		if(layer > 9) layer = 9;
		if(layer < 0) layer = 0;

		this.layer = layer;
		document.getElementById("layer_info").innerHTML = layer;

		if(layer == 9) document.getElementById("layer_up").classList.add("disabled");
		else document.getElementById("layer_up").classList.remove("disabled");
		if(layer == 0) document.getElementById("layer_down").classList.add("disabled");
		else document.getElementById("layer_down").classList.remove("disabled");

		this.tiles.promiseForEach(function(tile){
			if(tile.layer == that.layer) tile.getObject().setOpacity(1);
			else tile.getObject().setOpacity(0.2);
		});
	},
	drawSelectionAt: function(x, y, temp){
		var pos = new Position(x, y);
		var sel = this.editor.selection;
		var res = this.editor.ressource;

		if(sel.size.w == 0 || sel.size.h == 0) return false;
		var tile = this.editor.coordsToTile(pos.getX(), pos.getY());

		var ms = 1, ns = 1;
		if(this.drawMode == "shape" && sel.size.w == 1 && sel.size.h == 1){
			var tileStartPosition = this.editor.coordsToTile(this.startCursorPosition.getX(), this.startCursorPosition.getY());
			var dp = {x: tile.x - tileStartPosition.x, y: tile.y - tileStartPosition.y};
			var iv = {x: false, y: false};

			if(dp.x < 0) iv.x = true;
			if(dp.y < 0) iv.y = true;
			dp.x = Math.abs(dp.x) + 1;dp.y = Math.abs(dp.y) + 1;

			ms = dp.x; ns = dp.y;
			tile = tileStartPosition.clone();

			this.clearTempTiles();
		}

		for(var m = 0; m < ms; m++){
			for(var n = 0; n < ns; n++){
				for(var i = 0; i < sel.size.w; i++){
					for(var j = 0; j < sel.size.h; j++){
						var cx  = tile.x + i + (m * ((iv != null && iv.x) ? -1 : 1)), cy = tile.y + j + (n * ((iv != null && iv.y) ? -1 : 1));
						var csx = sel.getPosition().getX() + i, csy = sel.getPosition().getY() + j;

						if(this.size.w != -1 && cx >= this.size.w) continue;
						if(this.size.h != -1 && cy >= this.size.h) continue;

						var ct = this.getTileAt(cx, cy, this.layer);

						if(!ct){
							this.addTileAt(cx, cy, csx, csy, temp);
							
							if(!temp){
								this.editor.realtimeSend("newtile", {
									posx: cx,
									posy: cy,
									layer: this.layer,
									texturex: csx,
									texturey: csy
								});
							}
						}else{
							if(temp){
								var has = false;
								for(var i = 0; i < this.tmpTiles.length; i++){
									var tmpT = this.tmpTiles[i];
									if(tmpT.position.getX() == ct.getPosition().getX() && tmpT.position.getY() == ct.getPosition().getY()) has = true;
								}

								if(!has) this.tmpTiles.push({changes: true, texturePosition: ct.getTexturePosition().clone(), position: ct.getPosition().clone(), layer: ct.getLayer()});
								else continue;
							}else{
								this.editor.realtimeSend("replacetile", {
									posx: cx,
									posy: cy,
									layer: ct.getLayer(),
									texturex: csx,
									texturey: csy
								});
							}

							ct.changeTextureTo(csx, csy);
						}
					}
				}
			}
		}
	},
	fillWithBucket: function(x, y, forever){
		var that = this;
		var pos  = new Position(x, y);
		var sel  = this.editor.selection;
		var res  = this.editor.ressource;

		var getSameBesidesTilesAt = function(x, y, sx, sy, o){
			var r = o || [];
			var left   = that.getTileAt(x - 1, y, that.layer);
			var right  = that.getTileAt(x + 1, y, that.layer);
			var top    = that.getTileAt(x, y - 1, that.layer);
			var bottom = that.getTileAt(x, y + 1, that.layer);

			if(left != null && r.indexOf(left) == -1){
				var texture = left.getTexturePosition();
				if(texture.getX() == sx && texture.getY() == sy){
					r.push(left);
					getSameBesidesTilesAt(x - 1, y, sx, sy, r);
				}
			}
			if(right != null && r.indexOf(right) == -1){
				var texture = right.getTexturePosition();
				if(texture.getX() == sx && texture.getY() == sy){
					r.push(right);
					getSameBesidesTilesAt(x + 1, y, sx, sy, r);
				}
			}
			if(top != null && r.indexOf(top) == -1){
				var texture = top.getTexturePosition();
				if(texture.getX() == sx && texture.getY() == sy){
					r.push(top);
					getSameBesidesTilesAt(x, y - 1, sx, sy, r);
				}
			}
			if(bottom != null && r.indexOf(bottom) == -1){
				var texture = bottom.getTexturePosition();
				if(texture.getX() == sx && texture.getY() == sy){
					r.push(bottom);
					getSameBesidesTilesAt(x, y + 1, sx, sy, r);
				}
			}

			return r;
		};

		var tilePos = this.editor.coordsToTile(pos.getX(), pos.getY());
		var tileAt  = this.getTileAt(tilePos.x, tilePos.y, this.layer);
		if(tileAt == null){
			this.clearTempTiles();
			return false;
		}

		var tiles   = getSameBesidesTilesAt(tilePos.x, tilePos.y, tileAt.getTexturePosition().getX(), tileAt.getTexturePosition().getY());

		this.clearTempTiles();
		for(var i = 0; i < tiles.length; i++){
			var tile = tiles[i];
			if(!forever) this.tmpTiles.push({changes: true, texturePosition: tile.getTexturePosition().clone(), position: tile.getPosition().clone()});

			tile.changeTextureTo(sel.getPosition().getX(), sel.getPosition().getY());

			if(forever){
				that.editor.realtimeSend("replacetile", {
					posx: tile.getPosition().getX(),
					posy: tile.getPosition().getY(),
					layer: tile.getLayer(),
					texturex: tile.getTexturePosition().getX(),
					texturey: tile.getTexturePosition().getY()
				});
			}
		}
	},
	renderSolidLayer: function(){
		if(this.game == null || this.toolMode != "solid" || this.tiles.length == 0) return false;
		var that = this;
		var ctx  = Game.getContext();

		this.tiles.promiseForEach(function(tile){
			if(!tile.isSolid() || tile.layer != that.layer) return false;
			var pos = tile.getObject().getPosition();

			ctx.fillStyle = "rgba(0,0,0,0.6)";
			ctx.fillRect(pos.getX() + 4, pos.getY() + 4, tile.getSize().w - 8, tile.getSize().h - 8);

			ctx.beginPath();
			ctx.moveTo(pos.getX() + 3, pos.getY() + 3);
			ctx.lineTo(pos.getX() + tile.getSize().w - 3, pos.getY() + 3);
			ctx.lineTo(pos.getX() + tile.getSize().w - 3, pos.getY() + tile.getSize().h - 3);
			ctx.lineTo(pos.getX() + 3, pos.getY() + tile.getSize().h - 3);
			ctx.lineTo(pos.getX() + 3, pos.getY() + 3);

			ctx.strokeStyle = "white";
			ctx.stroke();
		});
	},


	// Manage ressource & params
	uploadRessourceFromComputer: function(file, callback){
		var that = this;
		var img  = file;

	    var fileName = img.name; // not path
	    var fileSize = img.size; // bytes
	    var fileType = img.type; // Type

	    if(!fileType.match("image/*")){
	    	alert('Vous devez envoyer une image. (png, jpeg, gif...)');
	    	return false;
	    }

		// Send file
		var formData = new FormData();
		var xhr      = new XMLHttpRequest();
		
		formData.append(fileName, img, fileName);
		xhr.open('POST', 'lib/ajax/uploadFile.php', true);
		xhr.onload = function () {
		  	if (xhr.status === 200) {
	    		if(xhr.responseText == "error_moving_file"){
	    			setAction('Erreur: le fichier n\'a pas pu être déplacé.', "error");
	    			return false;
	    		}

	    		callback();
		  	} else {
		   		setAction("Erreur de chargement. Merci de contacter un administrateur.", "error");
		  	}
		};
		xhr.send(formData);
	},
	openRessourceImporter: function(){
		var that = this;

		var div = document.getElementById("ressourceImporter");
		var container = div.querySelector('.container');

		div.style.display = "block";

		// Center container
		var divSizes       = div.getBoundingClientRect();
		var containerSizes = container.getBoundingClientRect();

		container.style.left = (divSizes.width / 2 - containerSizes.width / 2) + "px";
		container.style.top = (divSizes.height / 2 - containerSizes.height / 2) + "px";


		/**
		** 	Sending
		**/
		var initSendingBtn = function(el){
			el.onclick = function(e){
				if(that.importerProcessing || that.importerRessource == null) return false;
				var ir = that.importerRessource;
				that.importerProcessing = true;

				this.classList.add("loading");
				this.innerHTML = '<div class="spinner spinner-blue spinner-medium" style="top:10px;left:-20px"></div> Chargement...';

				switch(ir.from){
					case "computer":
						setTimeout(function(){
							that.uploadRessourceFromComputer(ir.file, function(){
								that.editor.initRessource("assets/" + ir.filename, ir.name, null, true);

								network.request("saveRessource", {src: ir.filename, name: ir.name}).send();

								initLoader();
							});
						}, 2000 * Math.random());
					break;
					case "manager":
						setTimeout(function(){
							that.editor.initRessource("assets/" + ir.filename, ir.name, null, true);

							initLoader();
						}, 3000 * Math.random());
					break;
					case "market":
						setTimeout(function(){
							network.request("moveMarketAsset", {filename: ir.filename}, function(data){
								network.request("saveRessource", {name: ir.name, src: data.newFilename}, function(d){
									that.editor.initRessource("assets/" + data.newFilename, ir.name, null, true);

									initLoader();
								}, "tilemapeditor").send()
							}, "tilemapeditor").send();
						}, 2000 * Math.random());
					break;
				}
			}
		}
		var initLoader = function(){
			that.importerLoader = that.startLoader();
		};


		/**
		**	Tabs system	
		**/
		var acts     = container.querySelector(".actions").querySelectorAll(".action");
		var tabs     = container.querySelector(".tabs").querySelectorAll(".tab");
		var subTitle = container.querySelector(".subtitle");

		for(var i = 0; i < tabs.length; i++){
			if(tabs[i].dataset && tabs[i].dataset.primary === "") continue;
			tabs[i].style.display = "none";
		}

		for(var i = 0; i < acts.length; i++){
			var act = acts[i];
			if(!act.dataset || !act.dataset.type) continue;

			if(act.dataset.type == "send"){
				initSendingBtn(act);
				continue;
			}

			act.onclick = function(e){
				var type = this.dataset.type;
				if(that.importerProcessing) return false;

				hideSend();

				for(var j = 0; j < acts.length; j++) acts[j].classList.remove("active");
				for(var j = 0; j < tabs.length; j++) tabs[j].style.display = "none";

				this.classList.add("active");
				for(var j = 0; j < tabs.length; j++){
					var tab = tabs[j];
					if(tab.dataset.type == this.dataset.type) tab.style.display = "block";
				}

				var actTextS = this.innerHTML.split(" ");
				actTextS.splice(0, 3);
				var actText = "";
				for(var j = 0; j < actTextS.length; j++) actText += actTextS[j] + " ";
				actText = actText.substring(6, actText.length - 1);

				subTitle.innerHTML = actText;

				if(type == "manager"){
					srcManager.openImporterIn("managerImporter", function(src){
						if(that.importerProcessing) return false;

						var index = -1;
						for(var i = 0; i < Object.keys(srcManager.assets).length; i++){
							var key = Object.keys(srcManager.assets)[i];
							if(srcManager.assets[key] == src) index = key;
						}

						if(index == -1) return false;

						var container = document.getElementById(srcManager.windowId);
						var assets    = container.querySelectorAll(".ressource");
						var asset     = null;

						for(var i = 0; i < assets.length; i++) if(assets[i].dataset.index == index) asset = assets[i];
						if(asset == null) return false;
						for(var i = 0; i < assets.length; i++) assets[i].querySelector(".preview").classList.remove("checked");

						asset.querySelector(".preview").classList.add("checked");
						that.importerRessource = {
							from: "manager",
							name: asset.querySelector(".name").innerHTML,
							filename: src.split("/")[src.split("/").length - 1],
							src: src
						};

						printSend();
					});
				}else if(type == "market"){
					gIMarket.openIn("mmImporter", "image");
					gIMarket.onAssetsLoaded(function(assets){
						hideSend();
						var results = document.getElementById("mmImporter").querySelectorAll(".result");

						for(var i = 0; i < results.length; i++){
							var result = results[i];

							result.onclick = function(e){
								if(that.importerProcessing) return false;
								e.preventDefault();

								for(var j = 0; j < results.length; j++) results[j].classList.remove("checked");

								this.classList.add("checked");

								printSend();
								that.importerRessource = {
									from: "market",
									name: this.dataset.name,
									filename: this.dataset.filename,
									src: App.getProject().getFormattedEditorId() + "/assets/" + this.dataset.filename
								};

								return false;
							}
						}
					});
				}else if(type == "computer"){
					if(that.dropFile != null) that.dropFile.clean();
				}
			}
		}

		/**
		**	From computer 
		**/
		document.getElementById("dropfile").innerHTML = "";
		this.dropFile = new dropFile("dropfile", "Déposer votre fichier ici.");

		this.dropFile.onFileDeposed(function(file){
			if(that.importerProcessing) return false;

			that.importerRessource = {
				from: "computer",
				file: file,
				name: file.name.split(".")[0],
				filename: file.name,
				src: App.getProject().getFormattedEditorId() + "/assets/" + file.name
			};

			printSend();
		});


		var printSend = function(){
			var acts     = container.querySelector(".actions").querySelectorAll(".action");
			for(var i = 0; i < acts.length; i++){
				var act = acts[i];
				if(act.dataset != null && act.dataset.type == "send") act.style.display = "block";
			}
		};
		var hideSend = function(){
			var acts     = container.querySelector(".actions").querySelectorAll(".action");
			for(var i = 0; i < acts.length; i++){
				var act = acts[i];
				if(act.dataset != null && act.dataset.type == "send") act.style.display = "none";
			}

			that.importerRessource = null;
		};
	},
	openParamBox: function(loader, init){
		if(loader) this.startLoader();
		var that = this;

		this.paramBoxOpened = true;

		var con = document.getElementById("editor-container");
		var dom = document.querySelector(".param-box");
		var res = that.editor.ressource;

		if(res != null && res.cellSize.w != -1 && res.cellSize.h != -1){
			dom.querySelector("#cell_image_width").value = Math.round(res.size.w / res.cellSize.w);
			dom.querySelector("#cell_image_height").value = Math.round(res.size.h / res.cellSize.h);
		}

		dom.show();

		dom.querySelector(".boxcontainer").setStyle("left", ((con.offsetWidth) / 2 - dom.querySelector(".boxcontainer").offsetWidth / 2) + "px");
		dom.querySelector(".boxcontainer").setStyle("top", ((con.offsetHeight) / 2 - dom.querySelector(".boxcontainer").offsetHeight / 2) + "px");

		var trig = null;
		if(init){
			dom.classList.remove("overlay");
			dom.querySelector(".next").show();
			dom.querySelector(".close").hide();

			trig = dom.querySelector(".next");
			
			Game.paused = true;
		}else{
			dom.classList.add("overlay");
			dom.querySelector(".next").hide();
			dom.querySelector(".close").show();

			trig = dom.querySelector(".close");
		}

		trig.onclick = function(){
			var cw = parseInt(this.parentNode.querySelector("#cell_image_width").value),
				ch = parseInt(this.parentNode.querySelector("#cell_image_height").value);
			var mw = parseInt(this.parentNode.querySelector("#map_cell_width").value),
				mh = parseInt(this.parentNode.querySelector("#map_cell_height").value);

			var res = that.editor.ressource;
			if(res == null || cw <= 0 || ch <= 0 || cw == "" || ch == "") return false;

			if(cw == NaN || cw == 0) cw = 1; 
			if(ch == NaN || ch == 0) ch = 1; 
			if(mw == NaN) mw = 0; 
			if(mh == NaN) mh = 0; 

			if(mw < that.size.w || mh < that.size.h){
				if(!confirm("Vous avez choisi de diminuer la taille de votre carte. Vous pouvez perdre des données. En êtes-vous sûr ?")) return false;
			}

			res.cellSize.w = res.size.w / cw;
			res.cellSize.h = res.size.h / ch;

			that.paramBoxOpened = false;
			Game.paused = false;
			document.querySelector(".param-box").hide();
			document.getElementById("ressourceImporter").hide();

			that.editor.realtimeSend("changeselectionsize", {w: cw, h: ch});
			that.editor.realtimeSend("changemapsize", {w: mw, h: mh});

			that.changeMapOverlay(mw, mh);
			that.updateOutOfBoundsTiles();
			that.editor.loaded = true;
		}

		// Preview canvas
		document.getElementById("cell_image_width").onfocus = function(){
			that.updateCellPreviewCanvas("width");
		}
		document.getElementById("cell_image_height").onfocus = function(){
			that.updateCellPreviewCanvas("height");
		}
		document.getElementById("cell_image_width").onkeyup = function(){
			that.updateCellPreviewCanvas("width");
		}
		document.getElementById("cell_image_height").onkeyup = function(){
			that.updateCellPreviewCanvas("height");
		}
		document.getElementById("cell_image_width").onblur = function(){
			that.updateCellPreviewCanvas(null);
		}
		document.getElementById("cell_image_height").onblur = function(){
			that.updateCellPreviewCanvas(null);
		}
	},
	startLoader: function(){
		var div = document.getElementById("ressourceImporter");
		var container = div.querySelector(".container");
		container.classList.add("closed");

		if(document.querySelector(".loader") != null) document.querySelector(".loader").remove();

		var loading = document.createElement("div");
		loading.style.position = "absolute";
		// loading.className = "spinner spinner-white";
		loading.className = "loader";
		loading.innerHTML = '<svg id="spinner_loader" class="spinner hide" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>';


		container.parentNode.appendChild(loading);
		document.getElementById("ressourceImporter").style.display = "block";

		var cont2 = loading.parentNode;
		var size  = [loading.offsetWidth, loading.offsetHeight];
		var wsize = [cont2.offsetWidth, cont2.offsetHeight];

		loading.style.left = (wsize[0]/2-size[0]/2) + "px";
		loading.style.top  = (wsize[1]/2-size[1]/2) + "px";

		return loading;
	},


	// Manage canvas & tiles
	updateCellPreviewCanvas: function(mod){
		var that = this;
		var res  = this.editor.ressource;
		if(res == null || ! this.paramBoxOpened) return false;

		var cvs = document.getElementById("cell_size_preview");
		var ctx = cvs.getContext("2d");

		ctx.clearRect(0, 0, cvs.width, cvs.height);
		if(mod == null) return false;

		if(mod == "width"){
			ctx.drawImage(res.image, 0, 0, res.size.w, res.size.h, 20, 40, res.size.w, res.size.h);

			var cw = parseInt(document.getElementById("cell_image_width").value);
			if(cw == "" || isNaN(cw)) cw = 1;
			var px = Math.round(res.size.w / cw);


			// Draw size bar
			ctx.beginPath();
			ctx.moveTo(20, 19);
			ctx.lineTo(20, 26);
			ctx.strokeStyle = "#383838";
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(20 + 1, 22);
			ctx.lineTo(20 + px - 1, 22);
			ctx.strokeStyle = "#383838";
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(20 + px, 19);
			ctx.lineTo(20 + px, 26);
			ctx.strokeStyle = "#383838";
			ctx.stroke();

			// Draw size text
			var tx = px + "px";
			var tw = Utils.measureText(tx, "sans-serif 10px");
			
			ctx.font = "10px sans-serif";
			ctx.fillText(tx, 20 + (px / 2 - tw.width / 2), 15);
		}else if(mod == "height"){
			ctx.drawImage(res.image, 0, 0, res.size.w, res.size.h, 40, 20, res.size.w, res.size.h);

			var ch = parseInt(document.getElementById("cell_image_height").value);
			if(ch == "" || isNaN(ch)) ch = 1;
			var px = Math.round(res.size.h / ch);


			// Draw size bar
			ctx.beginPath();
			ctx.moveTo(19, 20);
			ctx.lineTo(26, 20);
			ctx.strokeStyle = "#383838";
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(22, 20 + 1);
			ctx.lineTo(22, 20 + px - 1);
			ctx.strokeStyle = "#383838";
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(19, 20 + px);
			ctx.lineTo(26, 20 + px);
			ctx.strokeStyle = "#383838";
			ctx.stroke();

			// Draw size text
			var tx = px + "px";
			var tw = Utils.measureText(tx, "sans-serif 10px");
			
			ctx.font = "10px sans-serif";

			ctx.save();
			ctx.translate(15, 20 + (px / 2 - tw.width / 2) + 10);
			ctx.rotate(-Math.PI/2);
			ctx.textAlign = "center";
			ctx.fillText(tx, 0, 0);
			ctx.restore();
		}
	},
	updateOutOfBoundsTiles: function(){
		if(this.size.w <= 0 || this.size.h <= 0) return false;
		var that = this;
		this.clearTempTiles();

		this.tiles.promiseForEach(function(tile){
			if(tile.getPosition().getX() >= that.size.w || tile.getPosition().getY() >= that.size.h)
				that.removeTile(tile);
		});
	}

};