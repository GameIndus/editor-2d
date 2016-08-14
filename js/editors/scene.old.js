function SceneEditor(Editor){
	this.editor = Editor;
	this.config = {};

	this.objs           = [];
	this.objsCreated    = 0;
	this.currentObj     = null;
	this.currentDiv     = null;
	this.currentTilemap = null;
	this.currentBg      = null;

	this.cameras        = {};
	this.currentCamera  = null;
	this.globalCamera   = null;
	this.cameraRendered = false;
	this.clickedObject  = null;

	this.objectSelected         = null;
	this.objectSelectedMoveMode = false;

	// Move
	this.moveMode              = false;
	this.lastMove              = null;
	this.selectionArrows       = [];
	this.selectionArrowsColors = [];
	this.directionMoving       = null;

	this.leftDown                = false;
	this.lastClick               = 0;
	this.lastPropertiesBoxCoords = 0;
	this.canSave                 = false;

	this.gameCanvas = null;
}

SceneEditor.prototype = {

	init: function(){
		var that = this;
		Config.assetsDir = "https://gameindus.fr/project/"+this.editor.getProjectIdFormatted()+"/asset?-=";

		css("editors/scene");

		this.editor.loadEditor();
		this.editor.game.ressources.loadRessources();

		var scene  = new Scene();
		// var bg     = new Background({color: "#a5a5a5"});
		var bg     = new Background({color: "#000"});
		bg.setSize(10000, 10000);bg.setPosition(0, 0);

		// Define camera for zoom & move
		var camera = new Camera();

		camera.setBounds(false);
		camera.setMoveOn("X", true);
		camera.setMoveOn("Y", true);

		scene.setActiveCamera(camera);
		this.globalCamera = camera;

		scene.addBackground(bg);
		this.editor.game.addScene("default", scene);
		this.editor.game.setCurrentScene("default");

		network.onConnect(function(){
			new ConfigEditor().getConfig(function(c){
				that.config = c;
				that.loadSceneBorders(c);
			});
		});
	},
	load: function(){
		var that = this;

		var lv = App.getRouter().lastView;
		if(lv.type == "scene" && lv.editor != null && lv.editor != this) lv.editor.loaded = true;

		var c = document.getElementById("editor-container");
		if(this.gameCanvas != null){
			c.querySelector("canvas").remove();
			c.appendChild(this.gameCanvas);
		}

		window.Game = this.editor.game;
		Game.paused = false;
		setTimeout(function(){Game.setCanvasSize(c.offsetWidth, c.offsetHeight);}, 1);


		Game.getEventsManager().on('loadedRessources', function(e){
			if(that.loaded) return false;

			Input.reset();

			that.loadEvents();
			that.loadAddingModule();

			network.onConnect(function(){
				that.loadSceneFromJson();
				that.loaded = true;
			});
		});

		// Already loaded
		if(Game.loader.percent == 100){
			that.loadEvents();
			that.loadAddingModule();

			var objs = document.getElementById("sceneObjects").querySelectorAll(".object");
			for(var i = 0; i < objs.length; i++)
				objs[i].onclick = function(e){that.clickOnObject(e.target);}
		}

		Game.getEventsManager().on('gameRendered', function(e){
			that.updateSelectedObject();
		});
	},
	unload: function(){
		var c = document.getElementById("editor-container");

		if(c != null) this.gameCanvas = c.querySelector("canvas");

		Game.paused = true;
	},
	realtimeSend: function(submethod, data){
		var o = {submethod: submethod, file: App.getCurrentFile(), type: "scene"};

		switch(submethod){
			case "depositcomponant":
				o.posx  = data.posx;
				o.posy  = data.posy;
				o.ctype = data.type;
				o.name  = data.name;
			break;
			case "removecomponant": o.name = data; break;
			case "changeobjectparam":
				o.paramType = data.type;
				o.objectname = data.objectname;

				switch(o.paramType){
					case "position": o.posx = data.value.posx; o.posy = data.value.posy; break;
					case "opacity": o.opacity = data.value; break;
					case "layer": o.layer = data.value; break;
					case "angle": o.angle = data.value; break;

					case "animation": o.animation = data.value; break;
				}
			break;
			case "changegeoobjectparam":
				o.paramType = data.type;
				o.objectname = data.objectname;

				switch(o.paramType){
					case "position": o.posx = data.value.posx; o.posy = data.value.posy; break;
					case "size": o.sizew = data.value.sizew; o.sizeh = data.value.sizeh; break;
					case "opacity": o.opacity = data.value; break;
					case "layer": o.layer = data.value; break;
					case "type": o.objectType = data.value; break;
					case "angle": o.angle = data.value; break;
					case "color": o.color = data.value; break;
				}
			break;
			case "changebgparam":
				o.paramType = data.type;
				o.objectname = data.objectname;

				switch(o.paramType){
					case "position": o.posx = data.value.posx; o.posy = data.value.posy; break;
					case "size": o.sizew = data.value.sizew; o.sizeh = data.value.sizeh; break;
					case "velocity": o.vx = data.value.vx; o.vy = data.value.vy; break;
					case "color": o.color = data.value; break;
				}
			break;
			case "changetextparam":
				o.paramType = data.type;
				o.objectname = data.objectname;

				switch(o.paramType){
					case "position": o.posx = data.value.posx; o.posy = data.value.posy; break;
					case "text": o.text = data.value; break;
					case "font": o.font = data.value; break;
					case "fontSize": o.size = data.value; break;
					case "color": o.color = data.value; break;
				}
			break;
			case "changeobjectname":
				o.oldname = data.oldname;
				o.newname = data.newname;
			break;
		}

		network.request("sceneeditor", o, null, "realtime", "realtime").send();
	},

	loadEvents: function(){
		var that = this;
		var addButton    = document.getElementById("addObject");
		var renameButton   = document.getElementById("renameButton");
		var removeButton = document.getElementById("removeObject");
		var objectsContainer = document.getElementById("sceneObjects");

		/**
		 * 	Canvas events
		 */
		Input.mouseDown('left', function(e){
			if(e.target.id !== "sceneEditor") return true;

			var x = e.layerX;
			var y = e.layerY;

			var objectS = null;
			var scene = that.editor.game.getCurrentScene(); 
			var zoom  = (scene.camera != null) ? scene.camera.zoom : 1;
			var offset = (scene.camera != null) ? scene.camera.offset : {x:0,y:0};


			// Check for move arrow
			if(that.selectionArrows.length == 2){
				var arrow1 = that.selectionArrows[0];
				var arrow2 = that.selectionArrows[1];
				var startM = true;

				var objSel = that.objectSelected;
				if(objSel != null){
					objSel = objSel.obj;
					if(objSel == null) return false;

					var objSize = (typeof objSel.getSize === "function") ? objSel.getSize() : objSel.size;
					var objPos  = (typeof objSel.getPosition === "function") ? objSel.getPosition() : objSel.position;

					var ofX = (x - (objPos.getX() + objSize.w)) + objSize.w / 2, 
						ofY = (objPos.getY() - y) + objSize.h / 2;

					startM = {x: ofX, y: ofY};
				}
				
				if(x > arrow1[0] && x < arrow1[2] && y > arrow1[1] && y < arrow1[3]){
					that.objectSelectedMoveMode = startM;
					that.directionMoving =  "vertical";

					that.showPropertiesBox(false);
					return false;
				}
				if(x > arrow2[0] && x < arrow2[2] && y > arrow2[1] && y < arrow2[3]){
					that.objectSelectedMoveMode = startM;
					that.directionMoving =  "horizontal";

					that.showPropertiesBox(false);
					return false;
				}
			}

			// Check for gameobject at this position
			for(var i=0;i<that.objs.length;i++){
				var obj = that.objs[i];
				if(obj == null) continue;
				var go  = obj.obj;
				if(go == null) continue ;

				if(obj.type == "text"){
					var size = Utils.measureText(go.text, go.font.replace(" ", "+") + " " + go.fontSize);
					var pos  = go.position;

					if(x > pos.getX() && x < (pos.getX() + size.width) && y > (pos.getY() - size.height) && y < pos.getY()) objectS = obj;

					continue;
				}

				if(obj.type == "background"){
					var size = go.size;
					var pos  = go.position;

					if(x > pos.x && x < (pos.x + size.w) && y > (pos.y - size.h) && y < pos.y) objectS = obj;

					continue;
				}

				if(go.getPosition === undefined) continue ;

				var left   = (go.getBorder("left") + offset.x) * zoom;
				var top    = (go.getBorder("top") + offset.y) * zoom;
				var right  = (go.getBorder("right") + offset.x) * zoom;
				var bottom = (go.getBorder("bottom") + offset.y) * zoom;

				if(x > left && x < right && y > top && y < bottom) objectS = obj;
			}

			if(objectS == null && !that.objectSelectedMoveMode) that.clickOnObject(null);

			if(!that.objectSelectedMoveMode) that.objectSelected = objectS;

			// Check for object -> open properties box if double click
			document.getElementById("objectProperties").classList.remove("opened");
			that.lastPropertiesBoxCoords = null;

			if(Date.now() - that.lastClick < 200){
				if(that.objectSelected != null){
					that.openPropertiesBox(that.objectSelected, x, y);
				}
			}
			that.lastClick = Date.now();

			// Update right sidebar with infos
			if(document.getElementById("sceneObjects") != null && objectS != null){
				for(var i = 0; i < document.getElementById("sceneObjects").childNodes.length; i++){
					var cn = document.getElementById("sceneObjects").childNodes[i];

					if(cn.innerHTML==objectS.name) that.clickOnObject(cn);
				}
			}
		}, true);
		Input.mouseUp('left', function(e){
			if(e.target.id !== "sceneEditor") return true;
			if(that.directionMoving != null) that.save();
			
			that.showPropertiesBox(true);
			that.objectSelectedMoveMode = false;
			that.directionMoving = null;
		}, true);
		Input.mouseMove(function(e){
			var pos = e.getEditorPosition();
			var x   = pos.x,
				y   = pos.y;

			if(that.objectSelectedMoveMode && that.objectSelected != null && that.directionMoving != null){
				var go = that.objectSelected.obj;
				if(go == null) return false;
				var scene = that.editor.game.getCurrentScene(); 
				var zoom  = (scene.camera != null) ? scene.camera.zoom : 1;
				var offset = (scene.camera != null) ? scene.camera.offset : {x:0,y:0};

				var size = go.getSize();
				var pos  = go.getPosition();

				var startOff = that.objectSelectedMoveMode;

				var newX = (((x - startOff.x) - size.w / 2) - offset.x) * zoom;
				var newY = (((y + startOff.y) - size.h / 2) - offset.y) * zoom;

				var dir = that.directionMoving;

				if(dir == "horizontal"){
					go.getPosition().setX(newX);
					newY = pos.getY();
				}else if(dir == "vertical"){
					go.getPosition().setY(newY);
					newX = pos.getX();
				}

				// Update inputs (properties sidebar)
				var positionX = document.getElementById("posX") || document.getElementById("positionX");
				var positionY = document.getElementById("posY") || document.getElementById("positionY");
				if(positionX != null) positionX.value = Math.round(newX);
				if(positionY != null) positionY.value = Math.round(newY);

				switch(that.objectSelected.type){
					case "sprite":
						that.realtimeSend("changeobjectparam", {type: "position", objectname: that.objectSelected.name, value: {posx: newX, posy: newY}});
					break;
					case "geometricobject":
						that.realtimeSend("changegeoobjectparam", {type: "position", objectname: that.objectSelected.name, value: {posx: newX, posy: newY}});
					break;
					case "text":
						that.realtimeSend("changetextparam", {type: "position", objectname: that.objectSelected.name, value: {posx: newX, posy: newY}});
					break;
				}
			}

			// Check for move arrow
			if(that.selectionArrows.length == 2 && that.objectSelected != null){
				var arrow1 = that.selectionArrows[0];
				var arrow2 = that.selectionArrows[1];

				that.selectionArrowsColors = [];

				if(x > arrow1[0] && x < arrow1[2] && y > arrow1[1] && y < arrow1[3]){
					that.selectionArrowsColors[0] = "orange";
				}
				if(x > arrow2[0] && x < arrow2[2] && y > arrow2[1] && y < arrow2[3]){
					that.selectionArrowsColors[1] = "orange";
				}
			}
		});

		// Move events
		Input.mouseDown('middle', function(e){
			if(e.target.id!=="sceneEditor") return true;
			that.moveMode = true;
		});
		Input.mouseMove(function(e){
			if(e.target.id!=="sceneEditor") return true;

			if(that.moveMode){
				if(that.lastMove == null) that.lastMove = {x: e.layerX, y: e.layerY};

				var camera = Game.getCurrentScene().camera;
				var x      = e.layerX;
				var y      = e.layerY;
				var factor = 0.5;

				var distanceX = (x - that.lastMove.x) * factor;
				var distanceY = (y - that.lastMove.y) * factor;

				var cameraPosition    = camera.position;
				var newCameraPosition = {x: (cameraPosition.x - distanceX), y: (cameraPosition.y - distanceY)};

				Game.getCurrentScene().camera.setPosition(Math.round(newCameraPosition.x), Math.round(newCameraPosition.y));
				that.lastMove = {x: e.layerX, y: e.layerY};

				// Update scene borders
				Game.getCurrentScene().getGameObject("grid").setPosition(-newCameraPosition.x, -newCameraPosition.y);
			}
		});
		Input.mouseUp('middle', function(e){
			if(e.target.id!=="sceneEditor") return true;
			that.moveMode = false;
			that.lastMove = null;
		});

		// Move object events
		function sptrs(o){
			var ov = {posx: o.obj.getPosition().getX(), posy: o.obj.getPosition().getY()};

			switch(o.type){
				case "sprite":
					that.realtimeSend("changeobjectparam", {type: "position", objectname: o.name, value: ov});
				break;
				case "geometricobject":
					that.realtimeSend("changegeoobjectparam", {type: "position", objectname: o.name, value: ov});
				break;
				case "text":
					that.realtimeSend("changetextparam", {type: "position", objectname: o.name, value: ov});
				break;
			}
		}
		Input.keyDown("left", function(){
			if(that.objectSelected == null) return false;
			var obj = that.objectSelected.obj;

			obj.getPosition().substractX(1);
			sptrs(that.objectSelected);
		});
		Input.keyDown("up", function(){
			if(that.objectSelected == null) return false;
			var obj = that.objectSelected.obj;

			obj.getPosition().substractY(1);
			sptrs(that.objectSelected);
		});
		Input.keyDown("right", function(){
			if(that.objectSelected == null) return false;
			var obj = that.objectSelected.obj;

			obj.getPosition().addX(1);
			sptrs(that.objectSelected);
		});
		Input.keyDown("down", function(){
			if(that.objectSelected == null) return false;
			var obj = that.objectSelected.obj;

			obj.getPosition().addY(1);
			sptrs(that.objectSelected);
		});

		// Zoom events
		// Input.wheel("top", function(e){ // Zoom +
		// 	if(e.target.id!=="sceneEditor") return true;
		// 	var camera = that.editor.game.getCurrentScene().camera;
		// 	var n = 1;

		// 	if(camera.zoom <= 1) n = 0.1;
		// 	if(camera.zoom >= 8) n = 0;

		// 	camera.setZoom(camera.zoom+n);
		// });
		// Input.wheel("bottom", function(e){ // Zoom -
		// 	if(e.target.id!=="sceneEditor") return true;
		// 	var camera = that.editor.game.getCurrentScene().camera;
		// 	var n = 1;

		// 	if(camera.zoom <= 2) n = 0.1;
		// 	if(camera.zoom-n <= 0) n = -0.1;

		// 	camera.setZoom(camera.zoom-n);
		// });


		/**
		 * 	Window/DOM events
		 */
		var dblclick = function(e){
			var t = e.target;
			if(t != null && (t.className == "object" || t.className == "object active") && t.parentNode.id == "sceneObjects"){
				e.preventDefault();
				var obj = that.objectSelected;
				if(obj != null && obj.name != t.innerHTML){that.objectSelected = null;obj = null}

				var go  = (obj != null) ? obj.obj : {position: {}};
				var posObj = (go.position || go.pos);
				var pos = {x: (posObj[0] || posObj.x || 10), y: (posObj[1] || posObj.y || 50)};

				that.openPropertiesBox(obj, pos.x, pos.y);
				return false;
			}
			if(t != null && t.tagName == "INPUT") return true;

			e.preventDefault();
			window.getSelection?window.getSelection().empty?window.getSelection().empty():window.getSelection().removeAllRanges&&window.getSelection().removeAllRanges():document.selection&&document.selection.empty();
			return false;
		};

		window.removeEventListener("dblclick", dblclick);
		window.addEventListener("dblclick", dblclick);

		var sidebarClosed = false;
		if(document.querySelector(".rightPanel-toggle") != null){
			document.querySelector(".rightPanel-toggle").onclick = toggleSidebar;
			// window.addEventListener("keyup", toggleSidebar);

			function toggleSidebar(){
				var sidebar = document.querySelector(".rightPanel");
				if(sidebar == null) return false;
				
				var offsetRight   = 250;
				var offsetTimeout = 300;

				if(sidebarClosed){
					sidebar.classList.remove("closed");
					document.querySelector(".rightPanel-toggle").querySelector("i.fa").className = "fa fa-angle-double-right";
					sidebarClosed = false;
				}else{
					sidebar.classList.add("closed");
					offsetRight = 0;offsetTimeout = 0;
					document.querySelector(".rightPanel-toggle").querySelector("i.fa").className = "fa fa-angle-double-left";
					sidebarClosed = true;
				}

				setTimeout(function(){
					var editorContainer = document.getElementById("editor-container");
					var editorWidth  = editorContainer.style.width;
					var editorHeight = editorContainer.style.height;
					that.editor.game.setCanvasSize(editorWidth.substring(0, editorWidth.length - 2) - offsetRight, editorHeight.substring(0, editorHeight.length-2));
				}, offsetTimeout);
			}
			window.toggleSidebar = toggleSidebar;
		}

		var tabs = document.querySelectorAll(".scenePanel .tabs .tab");
		for(var i = 0; i < tabs.length; i++){
			var tab = tabs[i];
			tab.onclick = function(){
				var div = this.dataset.div;

				document.getElementById("addObject").style.display = "none";
				document.getElementById("listObjects").style.display = "none";
				for(var j = 0; j < tabs.length; j++) tabs[j].classList.remove("active");
				this.classList.add("active");

				document.getElementById(div).style.display = "block";
			}
		}

		if(objectsContainer != null){
			objectsContainer.onclick = function(e){
				if(e.target.id!="sceneObjects") return false;
				that.clickOnObject(null);
			}
		}

		window.addEventListener("keyup", function(e){
			var t = e.target;
			if(t.tagName == "INPUT") return false;

			if(e.keyCode == 46) that.loadSupprModule();
		});
	},


	loadAddingModule: function(){
		var that = this;

		var container  = document.getElementById("addObject");
		if(container == null) return false;
		
		var elSelected    = null;
		var lastEmptyBox  = null;
		var origin        = null;
		var sidebarClosed = false;

		function reloadTypesToAdd(){
			var typesToAdd = container.querySelectorAll(".componant-to-add");

			for(var i = 0; i < typesToAdd.length; i++){
				var tta = typesToAdd[i];

				tta.onmousedown = function(e){
					if(this.classList.contains("sub")){
						printSub(this);
						return false;
					}

					var br = this.getBoundingClientRect();
					origin = {x: e.clientX - br.left, y: e.clientY - br.top};

					this.classList.add("picked");

					elSelected = this;

					var emptyBox = document.createElement("div");
					emptyBox.className = "box empty";
					elSelected.insertAfter(emptyBox);
					lastEmptyBox = emptyBox;

					elSelected.style.width = elSelected.offsetWidth + "px";
					elSelected.style.position = "fixed";
					elSelected.style.zIndex = 2;
				}

				tta.onselectstart = function(e){e.preventDefault();return false;}
			}
		}

		reloadTypesToAdd();

		window.addEventListener("mousemove", function(e){
			if(elSelected == null) return false;

			var x = e.clientX - origin.x;
			var y = e.clientY - origin.y;

			if(!sidebarClosed && window.innerWidth - e.clientX > 250){
				window.toggleSidebar();
				sidebarClosed = true;
			}

			elSelected.style.left = x + "px";
			elSelected.style.top = y+ "px";
		});

		window.addEventListener("mouseup", function(e){
			if(elSelected != null){
				var brzt = document.getElementById("sceneEditor").getBoundingClientRect();
				var esbr = elSelected.getBoundingClientRect();

				// Check to add componant
				if(brzt.left < esbr.left && brzt.top < esbr.top && (brzt.left + brzt.width) > esbr.right && (brzt.top + brzt.height) > esbr.bottom){
					var coords = {x: Math.round(esbr.left - brzt.left + (esbr.width / 2)), y: Math.round(esbr.top - brzt.top  + (esbr.height / 2))};

					that.depositComponant(coords, elSelected.dataset.type, elSelected.dataset.componantName);
				}

				// Reset
				elSelected.removeAttribute("style");
				elSelected.classList.remove("picked");
				elSelected = null;
				origin = null;

				if(sidebarClosed){
					window.toggleSidebar();
					sidebarClosed = false;
				}
			}

			if(lastEmptyBox != null){
				lastEmptyBox.parentNode.removeChild(lastEmptyBox);
				lastEmptyBox = null;
			}
		});

		var printSub = function(el){
			var type      = el.dataset.type;
			var container = document.getElementById("addObject");
			var mainDiv   = container.querySelector(".main-comps");
			var subDiv    = container.querySelector(".sub-comps");

			var subTitle = el.innerHTML;
			var mainIconClassName = el.querySelector("i").className;
			var elsToPush = [];

			mainDiv.style.marginLeft = "-250px";

			// Push the title into the div title
			subDiv.querySelector(".title").innerHTML = subTitle;

			// Push box into the subDiv (maps, sprites, others...)
			var files = that.editor.filesManager.getAllFiles();
			if(type == "tilemap" && that.currentTilemap != null) files = {};

			for(var i = 0; i < Object.keys(files).length; i++){
				var name = Object.keys(files)[i];
				var fileType = files[name];

				if(fileType == type){
					var box = document.createElement("div");
					box.className = "componant-to-add box";
					box.dataset.type = type;
					box.dataset.componantName = name;

					var icon = document.createElement("i");
					icon.className = mainIconClassName;
					box.appendChild(icon);

					box.innerHTML += name.ucfirst();

					elsToPush.push(box); 
				}
			}

			subDiv.querySelector(".comps").innerHTML = "";
			for(var i = 0; i < elsToPush.length; i++) subDiv.querySelector(".comps").appendChild(elsToPush[i]);
			if(elsToPush.length == 0) subDiv.querySelector(".comps").innerHTML = "<p><i class='fa fa-times'></i> Aucun composant trouvé dans cette catégorie.</p>";

			// Add event on back button for going to the main div
			subDiv.querySelector(".back").onclick = function(e){
				e.preventDefault();
				mainDiv.style.marginLeft = 0;
				return false;
			}

			// Reload system
			reloadTypesToAdd();
		}
	},
	loadSupprModule: function(){
		var that = this;

		var cur   = this.objectSelected;
		if(cur == null && this.clickedObject != null){cur = this.clickedObject;cur.type="tilemap";}
		if(cur == null) return false;

		this.openRemoveConfirmDialog(function(){
			that.removeComponant(cur.name);
		}, cur.name);
	},

	loadTextEditionModule: function(){
		if(this.currentObj == null) return false;
	},

	openPropertiesBox: function(obj, x, y){
		var that  = this;
		var go    = (obj != null) ? obj.obj : (this.currentTilemap);
		if(obj == null){obj = this.currentTilemap;if(obj!=null)obj.type='tilemap';}

		var box   = document.getElementById("objectProperties");
		var sideb = document.getElementById("sidebar");
		var head  = document.getElementById("header");
		var props = [];

		if(y < 0) y = 10;

		if(go == null) return false;

		var generatePropertyDiv = function(iconName, title, ctn){
			var div = document.createElement("div");
			div.className = "property";

			var content = "";

			for(var i = 0; i < ctn.length; i++){
				var obj  = ctn[i];
				var type = Object.keys(obj)[0];
				var val  = obj[type];

				switch(type){
					case "text": content += val; break;
					case "input": 
						if(val.type != "color")
							var r = "<input type='" + val.type + "' value='" + val.value + "'";
						else
							var r = "<input value='" + val.value + "'";

						if(val.id) r+= " id='" + val.id + "'";
						if(val.style) r+= " style='" + val.style + "'";

						if(val.type == "text"){
							if(val.placeholder) r+= " placeholder='" + val.placeholder + "'";
							if(val.onkeyup) r+= ' onkeyup="' + val.onkeyup + '"';
							if(val.onblur) r+= ' onblur="' + val.onblur + '"';
						}else if(val.type == "range"){
							if(val.min) r+= " min='" + val.min + "'";
							if(val.max) r+= " max='" + val.max + "'";
							if(val.step) r+= " step='" + val.step + "'";
							if(val.onchange) r+= ' onchange="' + val.onchange + '"';
						}else if(val.type == "color"){
							r += ' class="color ' + ((val.onchange) ? " {onImmediateChange:'"+val.onchange+"'}" : "") + '"';
							if(val.value) r+= " value='" + val.value + "'";
						}

						r += ">";
						content += r;
					break;
					case "select": 
						var r = "<select";
						if(val.id) r+= " id='" + val.id + "'";
						if(val.style) r+= " style='" + val.style + "'";
						if(val.onchange) r+= ' onchange="' + val.onchange + '"';

						r += ">";

						for(var j = 0; j < Object.keys(val.options).length; j++){
							var keyOpt = Object.keys(val.options)[j];
							var keyVal = val.options[keyOpt];

							var s = keyOpt.split("^^");

							r += "<option value='" + s[0] + "'" + ((s[1] != null) ? " selected" : "") + ">" + keyVal + "</option>";
						}

						r += "</select>";
						content += r;
					break;
					case "rangeslider":
						var r = "<div class='rangeslider' value='" + val.value + "'";

						if(val.id) r += " id='" + val.id + "'";
						if(val.style) r += " style='" + val.style + "'";
						if(val.min) r += " data-min='" + val.min + "'";
						if(val.max) r += " data-max='" + val.max + "'";
						if(val.step) r += " data-step='" + val.step + "'";
						if(val.onchange) r += ' onchange="' + val.onchange + '"';

						if(val.limits) r += ' data-limits';
						if(val.relatimevalue) r += ' data-realtimevalue';

						r += "></div>";
						content += r;
					break;
				}
			}

			var left  = document.createElement("div");
			var right = document.createElement("div");
			var icon  = document.createElement("i");
			var clear = document.createElement("div");

			left.className  = "left";
			right.className = "right";
			icon.className  = "fa fa-" + iconName;
			clear.className = "clear";

			left.appendChild(icon);
			left.innerHTML += " " + title;

			right.innerHTML = content;

			div.appendChild(left);
			div.appendChild(right);
			div.appendChild(clear);

			return div;
		}

		box.querySelector(".properties").innerHTML = "";
		box.querySelector(".objTitle").innerHTML = obj.name;
		box.classList.add("opened");

		props.push(generatePropertyDiv("i-cursor", "Nom", [
			{"input" : {
				"id": "objectName",
				"type" : "text",
				"value" : obj.name,
				"onkeyup": "currentEditor.changeObjectName()",
				"onblur": "currentEditor.changeObjectName(true)"
			}}
		]));

		switch(obj.type){
			case "sprite":
				var anims = {};

				for(var i = 0;i < Object.keys(go.animations).length; i++){
					var animName = Object.keys(go.animations)[i];
					var current  = "";
					if(animName == go.currentAnimation) current = "^^s";

					anims[animName + current] = animName;
				}

				props.push(generatePropertyDiv("arrows", "Position", [
					{"text": "X: "},
					{"input" : {
						"id" : "positionX",
						"type" : "text",
						"value" : go.position.getX(),
						"placeholder" : "X",
						"style" : "display:inline-block;width:90%",
						"onkeyup": "currentEditor.changeObjectForm('position')"
					}},
					{"text": "<br>"},
					{"text": "Y: "},
					{"input" : {
						"id" : "positionY",
						"type" : "text",
						"value" : go.position.getY(),
						"placeholder" : "Y",
						"style" : "display:inline-block;width:90%",
						"onkeyup": "currentEditor.changeObjectForm('position')"
					}}
				]));
				props.push(generatePropertyDiv("adjust", "Opacité", [
					{"rangeslider" : {
						"id" : "objectOpacity",
						"value" : go.opacity,
						"min": 0,
						"max": 1,
						"step": 0.05,
						"limits": true,
						"relatimevalue": true,
						"style" : "display:inline-block;width:83%;margin-left:15px",
						"onchange": "currentEditor.changeObjectForm('opacity')"
					}}
				]));
				props.push(generatePropertyDiv("object-ungroup", "Calque", [
					{"rangeslider" : {
						"id" : "objectLayer",
						"value" : go.layer,
						"min": 0,
						"max": 9,
						"step": 1,
						"limits": true,
						"relatimevalue": true,
						"style" : "display:inline-block;width:83%;margin-left:15px",
						"onchange": "currentEditor.changeObjectForm('layer')"
					}}
				]));
				props.push(generatePropertyDiv("undo", "Rotation", [
					{"rangeslider" : {
						"id" : "objectAngle",
						"value" : go.angle,
						"min": 0,
						"max": 360,
						"step": 1,
						"limits": true,
						"relatimevalue": true,
						"style" : "display:inline-block;width:83%;margin-left:15px",
						"onchange": "currentEditor.changeObjectForm('angle')"
					}}
				]));

				// props.push(generatePropertyDiv("arrows-h", "Vélocité", [
				// 	{"text": "X: "},
				// 	{"input" : {
				// 		"id" : "velocityX",
				// 		"type" : "text",
				// 		"value" : go.velocity.x,
				// 		"placeholder" : "X",
				// 		"style" : "display:inline-block;width:90%",
				// 		"onkeyup": "currentEditor.changeObjectForm('velocity')"
				// 	}},
				// 	{"text": "<br>"},
				// 	{"text": "Y: "},
				// 	{"input" : {
				// 		"id" : "velocityY",
				// 		"type" : "text",
				// 		"value" : go.velocity.y,
				// 		"placeholder" : "Y",
				// 		"style" : "display:inline-block;width:90%",
				// 		"onkeyup": "currentEditor.changeObjectForm('velocity')"
				// 	}}
				// ]));

				props.push(generatePropertyDiv("male", "Animation", [
					{"select" : {
						"id" : "selectDOMAnim",
						"options": anims,
						"onchange": "currentEditor.changeCurrentAnimation()"
					}}
				]));
			break;
			case "background":
				props.push(generatePropertyDiv("arrows", "Position", [
					{"text": "X: "},
					{"input" : {
						"id" : "posX",
						"type" : "text",
						"value" : go.position.x,
						"placeholder" : "X",
						"style" : "display:inline-block;width:90%",
						"onkeyup": "currentEditor.changeBgForm('position')"
					}},
					{"text": "<br>"},
					{"text": "Y: "},
					{"input" : {
						"id" : "posY",
						"type" : "text",
						"value" : go.position.y,
						"placeholder" : "Y",
						"style" : "display:inline-block;width:90%",
						"onkeyup": "currentEditor.changeBgForm('position')"
					}}
				]));

				props.push(generatePropertyDiv("arrows-alt", "Taille", [
					{"text": "Largeur: "},
					{"input" : {
						"id" : "sizeW",
						"type" : "text",
						"value" : go.size.h,
						"placeholder" : "Largeur",
						"style" : "display:inline-block;width:65%",
						"onkeyup": "currentEditor.changeBgForm('size')"
					}},
					{"text": "<br>"},
					{"text": "Hauteur: "},
					{"input" : {
						"id" : "sizeH",
						"type" : "text",
						"value" : go.size.h,
						"placeholder" : "Hauteur",
						"style" : "display:inline-block;width:63%",
						"onkeyup": "currentEditor.changeBgForm('size')"
					}}
				]));

				props.push(generatePropertyDiv("paint-brush", "Couleur", [
					{"input" : {
						"id" : "bgColor",
						"type" : "color",
						"value" : go.color,
						"onchange": "currentEditor.changeBgColor(this)"
					}}
				]));
			break;
			case "geometricobject":
				var defTypes = {rectangle: "Rectangle", circle: "Cercle", grid: "Grille", triangle: "Triangle"};
				var types = {};

				for(var i=0;i<Object.keys(defTypes).length;i++){
					var typeKey = Object.keys(defTypes)[i];
					var type    = defTypes[typeKey];
					var current = "";
					if(typeKey == obj.obj.renderer.type) current = "^^s";

					types[typeKey + current] = type;
				}

				props.push(generatePropertyDiv("cubes", "Type", [
					{"select" : {
						"id" : "selectDOMType",
						"options": types,
						"onchange": "currentEditor.changeGeoObjectForm('type')"
					}}
				]));

				props.push(generatePropertyDiv("arrows", "Position", [
					{"text": "X: "},
					{"input" : {
						"id" : "posX",
						"type" : "text",
						"value" : go.position.getX(),
						"placeholder" : "X",
						"style" : "display:inline-block;width:90%",
						"onkeyup": "currentEditor.changeGeoObjectForm('position')"
					}},
					{"text": "<br>"},
					{"text": "Y: "},
					{"input" : {
						"id" : "posY",
						"type" : "text",
						"value" : go.position.getY(),
						"placeholder" : "Y",
						"style" : "display:inline-block;width:90%",
						"onkeyup": "currentEditor.changeGeoObjectForm('position')"
					}}
				]));
				props.push(generatePropertyDiv("arrows-alt", "Taille", [
					{"text": "Largeur: "},
					{"input" : {
						"id" : "sizeW",
						"type" : "text",
						"value" : go.getSize().w,
						"placeholder" : "Largeur",
						"style" : "display:inline-block;width:65%",
						"onkeyup": "currentEditor.changeGeoObjectForm('size')"
					}},
					{"text": "<br>"},
					{"text": "Hauteur: "},
					{"input" : {
						"id" : "sizeH",
						"type" : "text",
						"value" : go.getSize().h,
						"placeholder" : "Hauteur",
						"style" : "display:inline-block;width:63%",
						"onkeyup": "currentEditor.changeGeoObjectForm('size')"
					}}
				]));
				props.push(generatePropertyDiv("adjust", "Opacité", [
					{"rangeslider" : {
						"id" : "objectOpacity",
						"value" : go.opacity,
						"min": 0,
						"max": 1,
						"step": 0.05,
						"limits": true,
						"relatimevalue": true,
						"style" : "display:inline-block;width:83%;margin-left:15px",
						"onchange": "currentEditor.changeGeoObjectForm('opacity')"
					}}
				]));
				props.push(generatePropertyDiv("object-ungroup", "Calque", [
					{"rangeslider" : {
						"id" : "objectLayer",
						"value" : go.layer,
						"min": 0,
						"max": 9,
						"step": 1,
						"limits": true,
						"relatimevalue": true,
						"style" : "display:inline-block;width:83%;margin-left:15px",
						"onchange": "currentEditor.changeGeoObjectForm('layer')"
					}}
				]));
				props.push(generatePropertyDiv("undo", "Rotation", [
					{"rangeslider" : {
						"id" : "objectAngle",
						"value" : go.angle,
						"min": 0,
						"max": 360,
						"step": 1,
						"limits": true,
						"relatimevalue": true,
						"style" : "display:inline-block;width:83%;margin-left:15px",
						"onchange": "currentEditor.changeGeoObjectForm('angle')"
					}}
				]));
				props.push(generatePropertyDiv("paint-brush", "Couleur", [
					{"input" : {
						"id" : "objectColor",
						"type" : "color",
						"value" : go.getRenderer().color,
						"onchange": "currentEditor.changeGeoObjectColor()"
					}}
				]));
			break;
			case "text":
				var fontsArray=["Arial","Calibri","Cambria","Consolas","Helvetica","Impact","Lucida Console","Open Sans","sans-serif","Seobje UI","Times New Roman","Verdana","Wingdings"];
				var fonts = {};
				for(var i=0;i<fontsArray.length;i++){
					var selected = "";
					if(fontsArray[i]==obj.obj.font) selected = '^^s';

					fonts[fontsArray[i] + selected] = fontsArray[i];
				}

				props.push(generatePropertyDiv("i-cursor", "Texte", [
					{"input" : {
						"id": "textText",
						"type" : "text",
						"value" : go.text,
						"onkeyup": "currentEditor.changeTextForm('text')"
					}}
				]));

				props.push(generatePropertyDiv("arrows", "Position", [
					{"text": "X: "},
					{"input" : {
						"id" : "positionX",
						"type" : "text",
						"value" : Math.round(go.position.getX()),
						"placeholder" : "X",
						"style" : "display:inline-block;width:90%",
						"onkeyup": "currentEditor.changeTextForm('position')"
					}},
					{"text": "<br>"},
					{"text": "Y: "},
					{"input" : {
						"id" : "positionY",
						"type" : "text",
						"value" : Math.round(go.position.getY()),
						"placeholder" : "Y",
						"style" : "display:inline-block;width:90%",
						"onkeyup": "currentEditor.changeTextForm('position')"
					}}
				]));

				props.push(generatePropertyDiv("font", "Police", [
					{"select" : {
						"id" : "textFont",
						"options": fonts,
						"onchange": "currentEditor.changeTextForm('font')"
					}}
				]));
				props.push(generatePropertyDiv("arrows-alt", "Taille", [
					{"rangeslider" : {
						"id" : "textFontSize",
						"value" : go.fontSize.substring(0, 2),
						"min": 8,
						"max": 72,
						"step": 2,
						"limits": true,
						"relatimevalue": true,
						"style" : "display:inline-block;width:83%;margin-left:15px",
						"onchange": "currentEditor.changeTextForm('fontSize')"
					}}
				]));
				props.push(generatePropertyDiv("paint-brush", "Couleur", [
					{"input" : {
						"id" : "textColor",
						"type" : "color",
						"value" : go.color,
						"onchange": "currentEditor.changeTextColor(this)"
					}}
				]));
			break;
			case "tilemap":

			break;
			default:
				return false;
		}

		for(var i = 0; i < props.length; i++) box.querySelector(".properties").appendChild(props[i]);
		
		jscolor.bind();
		jscolor.preload();

		rangeSlider.bind();

		// Place box
		var margin = 50;
		var boxX   = ((sideb.offsetWidth + x) - (box.offsetWidth + margin));
		var boxY   = (y - margin);

		if(boxX < sideb.offsetWidth) boxX = ((sideb.offsetWidth + x) + margin);
		if(boxY < head.offsetHeight) boxY = (y + margin);

		if((boxY + box.offsetHeight) > (head.offsetHeight + document.getElementById("editor-container").offsetHeight)) 
			boxY = (head.offsetHeight + document.getElementById("editor-container").offsetHeight) - (box.offsetHeight + margin)


		box.style.left = boxX + "px";
		box.style.top  = boxY + "px";

		if(box.querySelector(".btn.btn-danger") != null) box.querySelector(".btn.btn-danger").remove();

		var delBtn = document.createElement("div");
		delBtn.className = "btn btn-danger";
		delBtn.setStyle("width", "90%");
		delBtn.setStyle("margin", "15px 5%");
		delBtn.setStyle("margin-bottom", "0");
		delBtn.innerHTML = '<i class="fa fa-trash-o"></i> Supprimer';
		delBtn.onclick = function(){
			that.loadSupprModule();
		}
		box.appendChild(delBtn);

		setTimeout(function(){
			that.lastPropertiesBoxCoords = {x: boxX - sideb.offsetWidth, y: boxY - head.offsetHeight,
											w: box.offsetWidth, h: box.offsetHeight};
		}, 200);
	},
	showPropertiesBox: function(bool){
		var box = document.getElementById("objectProperties");

		if(bool) box.setStyle("opacity", 1);
		else box.setStyle("opacity", 0.2);
	},

	depositComponant: function(coords, type, name, blockRealtime){
		var that = this;

		var x         = coords.x, y = coords.y;
		var container = document.getElementById("parametersScene");

		var objects   = this.getObjectsByType()[type];
		var num       = (objects != null) ? objects.length : 0;

		var actorName = type + pad(num + 1, 3);
		while(this.getObject(actorName) != null){
			num++;
			actorName = type + pad(num + 1, 3);
		}
		var objName   = name;

		this.objsCreated++;


		document.getElementById("addObject").querySelector(".main-comps").style.marginLeft = 0;

		switch(type){
			case "text":
				var textObj = new Text("Texte par défaut");
				textObj.setPosition(x, y);
				textObj.setColor("white");

				this.objs.push({type: type, name: actorName, obj: textObj});
				this.editor.game.getCurrentScene().addText(textObj);

				this.currentObj = textObj;
				this.loadTextEditionModule();
			break;
			case "sprite":
				network.request("loadSprite", {filename: formatFilename(name)}, function(e){
					var sprite = new GameObject(e.sprite.cellSize);
					sprite.setRenderer(new SpriteRenderer({
						name: e.sprite.srcName
					}));
					sprite.setPosition(coords.x, coords.y);
					sprite.setLayer(1);

					var firstName = "";
					for(var i=0;i<Object.keys(e.sprite.animations).length;i++){
						var name      = Object.keys(e.sprite.animations)[i];
						var animation = e.sprite.animations[name];

						if(firstName=="") firstName = name;

						var frames = [];
						for(var j=  animation.begin;j <= animation.finish; j++)
							frames.push(j);

						sprite.defineAnimation(name, animation.speed, [0, 0], frames);
					}

					var rObj = {type: "sprite", objName: objName, name: actorName, sprite: e.sprite, obj: sprite};

					sprite.setAnimation(firstName);
					that.objs.push(rObj);
					that.editor.game.getCurrentScene().addGameObject(sprite);

					that.currentObj = sprite;
				}, "sceneeditor").send();
			break;
			case "background":
				var backgroundObj = new Background();
				var canvasSize    = this.editor.game.getSize();

				var config 		  = this.config;
				var size          = (config.size == undefined) ? canvasSize : config.size;

				if(size.w === "100%") size.w = canvasSize.w;
				if(size.h === "100%") size.h = canvasSize.h;

				backgroundObj.setSize(size.w, size.h);
				backgroundObj.setColor("#333");

				this.objs.push({type: "background", name: actorName, obj: backgroundObj});
				this.editor.game.getCurrentScene().addBackground(backgroundObj);

				this.currentBg = {obj : backgroundObj};
			break;
			case "sound":
				network.request("loadSound", {name: formatFilename(objName)}, function(data){
					var soundObj = new Sound("http://gameindus.fr/static/" + that.editor.getProjectIdFormatted() + "/assets/" + data.sound.src);
					var rObj     = {type: "sound", name: actorName, obj: soundObj};

					that.objs.push(rObj);
					soundObj.name = data.sound.name;

					that.loadSoundParameters(container, rObj);
					that.currentObj = soundObj;
				}, "sceneeditor").send();
			break;
			case "geometricobject":
				var objectObj = new GameObject([50, 50]);

				objectObj.setPosition(x, y);
				objectObj.setRenderer(new GeometricRenderer({color: "#F00"}));

				var rObj = {type: "geometricobject", name: actorName, obj: objectObj};

				that.objs.push(rObj);
				that.editor.game.getCurrentScene().addGameObject(objectObj);

				that.currentObj = objectObj;
			break;
			case "tilemap":
				network.request("loadTilemap", {filename: formatFilename(objName)}, function(data){
					var map = new TileMap();
					var json = {};

					var tilemap = data.tilemap;
					var formatTiles = function(arr){
						var r = {};

						arr.forEach(function(string){
							var params = string.split("$");
							var key    = params[2] + "-" + params[3] + "/" + params[7];
							var value  = [parseInt(params[4]), parseInt(params[5])];

							if(params[6] === "true") key += "/s";
							r[key] = value;
						});

						return r;
					};

					json["tile"] = {
						src: tilemap.ressource.name,
						size: tilemap.ressource.cellSize.toArray(),
						objSize: tilemap.ressource.cellSize.toArray(),
						objName: objName,
						tiles: formatTiles(tilemap.tiles),
						name: actorName
					};

					map.setScene(that.editor.game.getCurrentScene());
					that.editor.game.getCurrentScene().tilemap = map;
					map.loadFromJson(json);
					that.currentTilemap = json["tile"];
				}, "sceneeditor").send();
			break;
			default:
				return false;
			break;
		}

		// Add object into the objects bar
		var objectsContainer = document.getElementById("sceneObjects");

		var objDiv = document.createElement("div");
		objDiv.className = "object";
		objDiv.onclick = function(e){that.clickOnObject(e.target);}
		objDiv.innerHTML = actorName;
		objectsContainer.appendChild(objDiv);

		document.querySelector(".scenePanel").querySelector(".tabs").querySelectorAll(".tab")[1].click();

		if(!blockRealtime){
			this.realtimeSend("depositcomponant", {
				posx: coords.x,
				posy: coords.y,
				type: type,
				name: name
			});

			this.save();
		}
	},
	removeComponant: function(objName, blockRealtime, fromRealtime){
		var scene = this.editor.game.getCurrentScene();
		var obj   = this.getObject(objName);

		if(obj != null){
			/* Remove object from current scene */
			if(obj.type == "text"){ // Use scene.texts
				scene.removeText(obj.obj);
			}else if(obj.type == "background"){ // Use scene.backgrounds
				scene.removeBackground(obj.obj);
			}
		}else{
			if(fromRealtime){
				// Try to remove tilemap
				scene.tilemap = null;
				this.currentTilemap = null;
				var objsDivs = document.getElementsByClassName("object");
				for(var i = 0; i < objsDivs.length; i++)
					if(objsDivs[i].innerHTML == objName)
						objsDivs[i].remove();

				return false;
			}
		}


		if(obj == null) obj = this.objectSelected;
		if(obj == null && this.clickedObject != null){obj = this.clickedObject;scene.tilemap=null;this.currentTilemap=null;}

		if(obj.empty === true){
			var objsDivs = document.getElementsByClassName("object");
			for(var i = 0; i < objsDivs.length; i++)
				if(obj != null && objsDivs[i].innerHTML == obj.name)
					objsDivs[i].remove();

			document.getElementById("parametersScene").innerHTML = "";
			
			if(!fromRealtime || this.objectSelected == obj) this.objectSelected = null;
			if(!fromRealtime || this.clickedObject == obj) this.clickedObject  = null;

			if(!blockRealtime){
				this.realtimeSend("removecomponant", objName);
				this.save();
			}

			return false;
		}

		/* Remove object div (from all objects divs) */
		var objsDivs = document.getElementsByClassName("object");
		for(var i = 0; i < objsDivs.length; i++)
			if(obj != null && objsDivs[i].innerHTML == obj.name)
				objsDivs[i].parentNode.removeChild(objsDivs[i]);

		/* Remove object from this class */
		for(var i = 0; i < this.objs.length; i++)
			if(obj != null &&this.objs[i].name == obj.name)
				this.objs.splice(i, 1);

		this.editor.game.getCurrentScene().removeGameObject(obj.obj);
		if(!fromRealtime || this.objectSelected == obj) this.objectSelected = null;


		/* Close properties box */
		var box   = document.getElementById("objectProperties");
		box.classList.remove("opened");

		document.getElementById("parametersScene").innerHTML = "";


		if(!blockRealtime){
			this.realtimeSend("removecomponant", objName);
			this.save();
		}
	},


	loadSceneFromJson: function(){
		var that = this;

		network.request("loadScene", {filename: formatFilename(that.editor.filesManager.currentFile)}, function(d, i){
			var scene = d.scene;
			var div = document.getElementById("parametersScene");
			var objectsDIV = document.getElementById("sceneObjects");

			if(objectsDIV != null) objectsDIV.innerHTML = "";

			if(scene.objs.length == 0) that.canSave = true;

			// Load tilemap
			var loadTilemapTask = function(){
				if(scene.tilemap != null){
					var name = scene.tilemap.name || scene.tilemap.tilemap || scene.tilemap;

					that.addGameObject(div, "tilemap", scene.tilemap.tilemap, name);
					var objDOM = document.createElement("div");
					

					objDOM.className = "object"; objDOM.innerHTML = name;
					objDOM.onclick = function(e){that.clickOnObject(e.target);}
					objectsDIV.appendChild(objDOM);
				}

				that.canSave = true;
			};

			var loadingTask = function(objs, index){
				if(objs == null){loadTilemapTask();return false;}
				
				var obj = objs[index];
				if(obj == null){loadTilemapTask();return false;}

				if(that.editor.game.paused) return false;

				that.addGameObject(div, obj.type, obj.objName, obj.name, function(go, obj){
					if(go == null) return false;

					if(obj.type == "text"){
						go.setText(obj.obj.text);
						go.setFont(obj.obj.font);
						go.setFontSize(obj.obj.fontSize.substring(0, 2));
						go.setPosition(obj.obj.position.x, obj.obj.position.y);
						go.setColor(obj.obj.color);
					}else if(obj.type == "background"){
						go.setSize(obj.obj.size.w, obj.obj.size.h);
						go.setImageSize(obj.obj.imageSize.w, obj.obj.imageSize.h);
						go.setPosition(obj.obj.position.x, obj.obj.position.y);
						go.setImagePosition(obj.obj.imagePosition.x, obj.obj.imagePosition.y);
						go.setColor(obj.obj.color);
					}else if(obj.type == "sprite"){
						go.setPosition((obj.obj.position.x || obj.obj.position[0]), (obj.obj.position.y || obj.obj.position[1]));
						go.setOpacity(obj.obj.opacity);
						go.setLayer(obj.obj.layer);
						go.currentAnimation = obj.obj.currentAnimation;
						go.setAnimation(obj.obj.currentAnimation);
						go.rotate(obj.obj.angle);
					}else if(obj.type == "camera"){
						go.setPosition(obj.obj.position.x, obj.obj.position.y);
						go.setZoom(obj.obj.zoom);

						that.cameras[obj.name].zoom = obj.obj.zoom;
						that.cameras[obj.name].position = [obj.obj.position.x, obj.obj.position.y];
					}else if(obj.type == "geometricobject"){
						go.setPosition(obj.obj.position.x, obj.obj.position.y);
						go.setSize(obj.obj.size[0], obj.obj.size[1]);
						go.setOpacity(obj.obj.opacity);
						go.setLayer(obj.obj.layer);
						go.getRenderer().color = obj.obj.renderer.color;
						go.getRenderer().type  = obj.obj.renderer.type;
						go.rotate(obj.obj.angle);
					}else if(obj.type == "sound"){
						go.setVolume(obj.obj.volume);
						go.setPitch(obj.obj.pitch);
						go.setLoop(obj.obj.looping);
					}

					var objDOM = document.createElement("div");
					objDOM.className = "object"; objDOM.innerHTML = obj.name;
					objDOM.onclick = function(e){that.clickOnObject(e.target);}
					if(objectsDIV!=null) objectsDIV.appendChild(objDOM);

					loadingTask(scene.objs, index+1);

					if(scene.objs.length == index + 1) // On finish loading
						that.canSave = true;

				}, obj);
			}

			loadingTask(scene.objs, 0);
		}, "sceneeditor").send();
	},
	loadSceneBorders: function(config){
		var game = this.editor.game;

		if(config.size == undefined) config.size = {w: "100%", h: "100%"};

		var size = Utils.clone(config.size);
		if(size.w === "100%") size.w = window.innerWidth;
		if(size.h === "100%") size.h = window.innerHeight;

		size.w = parseInt(size.w);
		size.h = parseInt(size.h);

		var bo   = new GameObject([size.w+1, size.h+1]);
		
		bo.setPosition(0, 0);
		bo.setLayer(9);
		bo.setRenderer(new GeometricRenderer({
			color: "#CCC",
			type: "grid",
			dashed: 5,
			lineWidth: 2,
			cellSize: [size.w, size.h]
		}));

		game.getCurrentScene().registerGameObject("grid", bo);
	},


	getCenter: function(objSize){
		var canvasSize = this.editor.game.getCanvas().getSize();

		return {x: (canvasSize.x-250)/2-objSize[0]/2, y: (canvasSize.y)/2-objSize[1]/2};
	},

	clickOnObject: function(el){
		// Add active class only on element selected
		for(var i=0;i<document.getElementsByClassName("object").length;i++)
			document.getElementsByClassName("object")[i].classList.remove('active');

		if(el == null){
			document.getElementById("objectProperties").classList.remove("opened");

			this.lastPropertiesBoxCoords = null;

			this.objectSelected         = null;
			this.objectSelectedMoveMode = false;
			this.currentObj             = false;
			this.currentBg              = false;
			this.currentCamera          = false;
			this.clickedObject          = null;
			return false
		}

		el.classList.add('active');

		// Open parameters with the type/name
		var name = el.innerHTML;

		this.lastPropertiesBoxCoords = null;

		// Set current composant
		var obj = this.getObject(name);
		var tilemap = null;

		if(obj == null) obj = {empty: true, name: name};
		if(this.currentTilemap != null && this.currentTilemap.objName == name) tilemap = name;

		if(obj.empty === true && tilemap == null){this.objectSelected=null;this.clickedObject = obj;this.currentDiv = el;this.currentDiv.lastName = el.innerHTML;return false;}
		if(obj != null && obj.obj != null) this.objectSelected = obj;
		var type = (obj == null) ? "Tilemap / Carte" : obj.type;

		if(type == "background") this.currentBg = obj;

		if(type == "sprite") type = "SpriteRenderer";
		else if(type == "text") type = "TextRenderer";
		else if(type == "background") type = "Background";
		else if(type == "sound") type = "Sound";

		this.clickedObject = obj;
		if(obj.obj != null) this.currentObj = obj.obj;

		this.currentDiv = el;
		this.currentDiv.lastName = el.innerHTML;
	},



	addGameObject: function(mainDiv, type, name, actorName, onObjectAdded, objOnObjectAdded){
		if(name=="default"||network.connection==null) return false;
		var that = this;
		var objName = name;

		this.objsCreated++;

		// Load object into the scene
		if(type == "sprite"){
			network.request("loadSprite", {filename: formatFilename(name)}, function(e){
				var sprite = new GameObject(e.sprite.cellSize);
				var center = that.getCenter(e.sprite.cellSize);
				sprite.setRenderer(new SpriteRenderer({
					name: e.sprite.srcName
				}));
				sprite.setPosition(center.x, center.y);
				sprite.setLayer(1);

				var firstName = "";
				for(var i=0;i<Object.keys(e.sprite.animations).length;i++){
					var name      = Object.keys(e.sprite.animations)[i];
					var animation = e.sprite.animations[name];

					if(firstName=="") firstName = name;

					var frames = [];
					for(var j=  animation.begin;j <= animation.finish; j++)
						frames.push(j);

					sprite.defineAnimation(name, animation.speed, [0, 0], frames);
				}

				sprite.setAnimation(firstName);
				that.objs.push({type: "sprite", objName: objName, name: actorName, sprite: e.sprite, obj: sprite});
				that.editor.game.getCurrentScene().addGameObject(sprite);

				that.currentObj = sprite;

				that.save();

				if(onObjectAdded!=null) onObjectAdded(sprite, objOnObjectAdded);
			}, "sceneeditor").send();
		}else if(type == "text"){
			var textObj = new Text("Hello World");
			textObj.setPosition(50, 50);
			textObj.setColor("white");

			that.objs.push({type: "text", name: actorName, obj: textObj});
			that.editor.game.getCurrentScene().addText(textObj);

			that.currentObj = textObj;

			that.save();

			if(onObjectAdded!=null) onObjectAdded(textObj, objOnObjectAdded);
		}else if(type=="background"){
			var backgroundObj = new Background();

			var config 		  = that.config;
			var size          = (config.size == undefined) ? that.editor.game.getSize() : config.size;

			backgroundObj.setSize(size.w, size.h);
			backgroundObj.setColor("#000");

			that.objs.push({type: "background", name: actorName, obj: backgroundObj});
			that.editor.game.getCurrentScene().addBackground(backgroundObj);

			that.currentBg = {obj : backgroundObj};

			that.save();

			if(onObjectAdded!=null) onObjectAdded(backgroundObj, objOnObjectAdded);
		}else if(type=="tilemap"){
			network.request("loadTilemap", {filename: formatFilename(objName)}, function(data){
				var map = new TileMap();
				var json = {};

				var tilemap = data.tilemap;
				var formatTiles = function(arr){
					var r = {};

					arr.forEach(function(string){
						var params = string.split("$");
						var key    = params[2] + "-" + params[3] + "/" + params[7];
						var value  = [parseInt(params[4]), parseInt(params[5])];

						if(params[6] === "true") key += "/s";
						r[key] = value;
					});

					return r;
				};

				json["tile"] = {
					src: tilemap.ressource.name,
					size: tilemap.ressource.cellSize.toArray(),
					objSize: tilemap.ressource.cellSize.toArray(),
					objName: objName,
					tiles: formatTiles(tilemap.tiles),
					name: actorName
				};

				map.setScene(that.editor.game.getCurrentScene());
				that.editor.game.getCurrentScene().tilemap = map;
				map.loadFromJson(json);
				that.currentTilemap = json["tile"];

				that.save();

				if(onObjectAdded != null) onObjectAdded(that.currentTilemap, objOnObjectAdded);
			}, "sceneeditor").send();
		}else if(type=="camera"){
			var cameraObj = new Camera();

			that.objs.push({type: "camera", name: actorName, obj: cameraObj});
			that.cameras[actorName] = {
				position: [0, 0],
				bounds: false,
				moveOn: {x: true, y: false},
				speed: {x: 0, y: 0},
				zoom: 1
			}

			that.loadCameraParameters(mainDiv, {type: "camera", name: actorName, obj: cameraObj});
			that.currentObj = cameraObj;

			that.save();

			if(onObjectAdded!=null) onObjectAdded(cameraObj, objOnObjectAdded);
		}else if(type=="geometricobject"){
			var objectObj = new GameObject([50, 50]);

			objectObj.setPosition(50, 50);
			objectObj.setRenderer(new GeometricRenderer({color: "#000000"}));

			that.objs.push({type: "geometricobject", name: actorName, obj: objectObj});
			that.editor.game.getCurrentScene().addGameObject(objectObj);

			that.currentObj = objectObj;

			that.save();

			if(onObjectAdded!=null) onObjectAdded(objectObj, objOnObjectAdded);
		}else if(type == "sound"){
			if(objName == undefined) objName = objOnObjectAdded.obj.name;

			network.request("loadSound", {name: formatFilename(objName)}, function(data){
				var soundObj = new Sound("http://gameindus.fr/static/" + that.editor.getProjectIdFormatted() + "/assets/" + data.sound.src);
				that.objs.push({type: "sound", name: actorName, obj: soundObj});

				soundObj.name = data.sound.name;

				that.loadSoundParameters(mainDiv, {type: "sound", name: actorName, obj: soundObj});
				that.currentObj = soundObj;

				that.save();

				if(onObjectAdded != null) onObjectAdded(soundObj, objOnObjectAdded);
			}, "sceneeditor").send();
		}
	},

	getObject: function(name){
		for(var i = 0;i < this.objs.length; i++){
			var obj = this.objs[i];

			if(obj != null && obj.name == name) return obj;
		}

		return null;
	},

	getObjectsByType: function(){
		var r = {};

		for(var i = 0; i < this.objs.length; i++){
			var obj = this.objs[i];

			if(r[obj.type] == null) r[obj.type] = [];

			r[obj.type].push(obj);
		}

		return r;
	},


	getGameObject: function(name){
		for(var i=0;i<this.objs.length;i++){
			var obj = this.objs[i];

			if(obj.name==name) return obj.obj;
		}

		return null;
	},

	loadCameraParameters: function(div, obj){
		var posBar = document.createElement("div");
		posBar.innerHTML = '<div class="parameter"><div class="left"><p>Position</p></div><div class="right"><input type="text" value="'+obj.obj.position.x+'" onkeyup="currentEditor.changeCameraForm(\'position\');" id="posX" style="width:50%"><input type="text" value="'+obj.obj.position.y+'" id="posY" onkeyup="currentEditor.changeCameraForm(\'position\');" style="width:50%"></div><div class="clear"></div></div>';

		var moveOnBar = document.createElement("div");
		moveOnBar.innerHTML = '<div class="parameter"><div class="left"><p>Déplacement sur l\'axe</p></div><div class="right"><p style="display:inline-block">X:</p> <input type="checkbox" id="moveOnX" onchange="currentEditor.changeCameraForm(\'moveon\');" checked style="display:inline-block"><br><p style="display:inline-block">Y:</p> <input type="checkbox" id="moveOnY" onchange="currentEditor.changeCameraForm(\'moveon\');" style="display:inline-block"></div><div class="clear"></div></div>';

		var zoomBar = document.createElement("div");
		zoomBar.innerHTML = '<div class="parameter"><div class="left"><p>Zoom</p></div><div class="right"><input type="text" id="zoomInput" onchange="currentEditor.changeCameraForm(\'zoom\');" value="'+obj.obj.zoom+'" style="width:80%"></div><div class="clear"></div></div>';

		div.appendChild(posBar);
		div.appendChild(moveOnBar);
		div.appendChild(zoomBar);

		this.currentCamera = obj.name;

		if(!this.cameraRendered){
			var that = this;
			this.editor.game.getEventsManager().on('gameRendered', function(){
				if(that.currentCamera==null) return false;

				var ctx  = that.editor.game.getContext();
				var cam  = that.cameras[that.currentCamera];
				var size = that.editor.game.getCanvas().getSize();

				// ParseInt :'( !
				cam.position[0] = parseInt(cam.position[0]);
				cam.position[1] = parseInt(cam.position[1]);

				ctx.beginPath();
				ctx.moveTo(cam.position[0], cam.position[1]);
				ctx.lineTo(cam.position[0]+size.x*cam.zoom, cam.position[1]);
				ctx.lineTo(cam.position[0]+size.x*cam.zoom, cam.position[1]+size.y*cam.zoom);
				ctx.lineTo(cam.position[0], cam.position[1]+size.y*cam.zoom);
				ctx.lineTo(cam.position[0], cam.position[1]);
				ctx.strokeStyle = "white";
				ctx.stroke();
			});
		}
	},

	loadSoundParameters: function(div, obj){
		// To play audio/sound
		var playBar = document.createElement("div");
		playBar.innerHTML = '<div class="parameter"><div class="left"><p>Jouer le son</p></div><div class="right" style="margin-top:-20px"><div class="button" style="width:40%;height:25px;line-height:25px;margin-left:2%" onclick="currentEditor.playSound(this)" id="playSoundBtn"><i class="fa fa-play" style="margin-left:0"></i></div><div class="button" style="width:40%;height:25px;line-height:25px;margin-left:2%" id="stopSound" onclick="currentEditor.stopSound(this)"><i class="fa fa-stop" style="margin-left:0"></i></div></div><div class="clear"></div></div>';

		// To select volume
		var volBar = document.createElement("div");
		volBar.innerHTML = '<div class="parameter"><div class="left"><p>Volume</p></div><div class="right"><p style="position:absolute;left:-40px;top:0" id="volumeSpan">' + obj.obj.volume + ' %</p><div class="timeline" style="width:110px" id="soundVolume"><div class="cursor" style="margin-top:0" id="soundVolumeCursor"></div></div></div><div class="clear"></div></div>';

		var that = this;
		volBar.onmousemove = function(e){
			that.changeSoundVolume(e);
		}
		volBar.onmousedown = function(e){
			if(e.keyCode === 0) that.leftDown = true;
			that.changeSoundVolume(e);
		}
		window.onmouseup = function(e){
			if(that.leftDown) that.save();
			if(e.keyCode === 0) that.leftDown = false;
		}

		// To select pitch
		var pitchBar = document.createElement("div");
		pitchBar.innerHTML = '<div class="parameter"><div class="left"><p>Pitch / Vitesse</p></div><div class="right"><input type="text" value="'+obj.obj.pitch+'" onkeyup="currentEditor.changeSoundForm(\'pitch\');" id="pitch" style="width:80%"></div><div class="clear"></div></div>';

		// To select pitch
		var loopBar = document.createElement("div");
		loopBar.innerHTML = '<div class="parameter"><div class="left"><p>Jouer en boucle ?</p></div><div class="right"><input type="checkbox" ' + ((obj.obj.looping) ? 'checked' : '') + ' onchange="currentEditor.changeSoundForm(\'looping\');" id="looping"></div><div class="clear"></div></div>';


		div.appendChild(playBar);
		div.appendChild(volBar);
		div.appendChild(pitchBar);
		div.appendChild(loopBar);

		document.getElementById("soundVolumeCursor").style.left = (110 * obj.obj.volume / 100) + "px";
	},


	changeObjectName: function(blur){
		if(this.currentObj==null) return false;
		var name = document.getElementById("objectName").value;

		var selObj = this.objectSelected || this.currentTilemap;

		if(blur){
			var so      = document.getElementById("sceneObjects");
			var changed = false;

			for(var i = 0; i < so.querySelectorAll(".object").length; i++){
				var o = so.querySelectorAll(".object")[i];

				if(o.innerHTML == name || name == "" || name == " "){
					name = this.currentDiv.lastName; 
					document.getElementById("objectName").value = name;
					changed = true;
					break;
				}
			}

			if(!changed){
				this.realtimeSend("changeobjectname", {oldname: selObj.name, newname: name});

				this.currentDiv.innerHTML = name;
				selObj.name = name;

				this.save();
			}
		}

		document.getElementById("objectProperties").querySelector(".objTitle").innerHTML = name;
	},
	changeObjectNameByAir: function(object, name){
		var so     = document.getElementById("sceneObjects");
		var selObj = object || this.currentTilemap;

		var oldname = selObj.name + "";

		var changed = false;

		for(var i = 0; i < so.querySelectorAll(".object").length; i++){
			var o = so.querySelectorAll(".object")[i];

			if(o.innerHTML == name || name == "" || name == " "){
				changed = true;
				break;
			}else if(o.innerHTML == object.name){
				o.innerHTML = name;
			}
		}

		if(!changed) selObj.name = name;

		if(this.objectSelected != null && object.name == this.objectSelected.name) {
			document.getElementById("objectProperties").querySelector(".objTitle").innerHTML = name;
			document.getElementById("objectProperties").querySelector("#objectName").value = name;
		}
	},

	/**
	*	Changes on sprite (parameters)
	*/
	changeObjectForm: function(type, objectParam, values){
		var object = objectParam || this.currentObj;
		var that   = this;
		if(object == null) return false;
		// if(objectParam == object) object = object.obj;

		if(values == null) values = {};
		var val = {};

		var updateInput = function(inputId, variable){
			if(that.currentObj != object) return false;

			if(document.getElementById(inputId) != null && document.getElementById(inputId).value != variable) 
				document.getElementById(inputId).value = variable;
		};

		if(type == "position"){
			var posX = (values.posx != null) ? values.posx : document.getElementById("positionX").value;
			var posY = (values.posy != null) ? values.posy : document.getElementById("positionY").value;

			if(posX == NaN) posX = 0;
			if(posY == NaN) posY = 0;
			updateInput("positionX", posX);
			updateInput("positionY", posY);

			if(!Utils.isFloat(posX)){ posX = 0; }
			if(!Utils.isFloat(posY)){ posY = 0; }

			object.setPosition(parseInt(posX), parseInt(posY));
			val = {posx: parseInt(posX), posy: parseInt(posY)};
		}else if(type == "angle"){
			var angle = (values.angle != null) ? values.angle : parseFloat(document.getElementById("objectAngle").value);

			if(angle < 0 || angle == NaN) angle = 0;
			if(angle > 360) angle = 360;
			updateInput("objectAngle", angle);

			object.rotate(angle);
			val = angle;
		}else if(type == "opacity"){
			var opacity = (values.opacity != null) ? values.opacity : parseFloat(document.getElementById("objectOpacity").value);

			if(opacity < 0 || opacity == NaN) opacity = 0;
			if(opacity > 1) opacity = 1;

			updateInput("objectOpacity", opacity);

			object.setOpacity(opacity);
			val = opacity;
		}else if(type == "layer"){
			var layer = (values.layer != null) ? values.layer : parseFloat(document.getElementById("objectLayer").value);

			if(layer == "" || isNaN(layer)) layer = 0;
			updateInput("objectLayer", layer);

			if(layer < 0) layer = 0;
			if(layer > 9) layer = 9;

			object.setLayer(layer);
			val = layer;
		}
		
		if(objectParam == null){
			this.realtimeSend("changeobjectparam", {type: type, objectname: this.objectSelected.name, value: val});
			this.save();
		}
	},

	changeCurrentAnimation: function(objectParam, animParam){
		var object = objectParam || this.currentObj;
		var anim = animParam || document.getElementById("selectDOMAnim").value;

		if(object == null) return false;
		
		object.setAnimation(anim);
		object.currentAnimation = anim;

		if(objectParam == null){
			this.realtimeSend("changeobjectparam", {type: "animation", objectname: this.objectSelected.name, value: anim});
			this.save();
		}
	},

	/**
	*	Changes on text (parameters)
	*/
	changeTextForm: function(type, objectParam, values){
		var object = objectParam || this.currentObj;
		var that   = this;
		if(object == null) return false;
		if(object == objectParam) object = object.obj;

		if(values == null) values = {};
		var val = {};


		var updateInput = function(inputId, variable){
			if(that.currentObj != object) return false;

			if(document.getElementById(inputId) != null && document.getElementById(inputId).value != variable) 
				document.getElementById(inputId).value = variable;
		};

		if(type == "text"){
			var text = (values.text != null) ? values.text : document.getElementById("textText").value;

			updateInput("textText", text);

			object.setText(text);
			val = text;
		}else if(type == "position"){
			var posX = (values.posx != null) ? values.posx : document.getElementById("positionX").value;
			var posY = (values.posy != null) ? values.posy : document.getElementById("positionY").value;

			if(posX == NaN) posX = 0;
			if(posY == NaN) posY = 0;

			updateInput("positionX", posX);
			updateInput("positionY", posY);

			if(parseInt(posX) < 0){ posX = 0; document.getElementById("positionX").value = "0"; }
			if(parseInt(posY) < 0){ posY = 0; document.getElementById("positionY").value = "0"; }

			object.setPosition(parseFloat(posX), parseFloat(posY));
			val = {posx: parseFloat(posX), posy: parseFloat(posY)};
		}else if(type == "font"){
			var font = (values.font != null) ? values.font : document.getElementById("textFont").value;

			updateInput("textFont", font);

			object.setFont(font);	
			val = font;
		}else if(type == "fontSize"){
			var size = (values.size != null) ? values.size : document.getElementById("textFontSize").value;

			updateInput("textFontSize", size);

			object.setFontSize(parseInt(size));
			val = parseInt(size);
		}

		if(objectParam == null){
			this.realtimeSend("changetextparam", {type: type, objectname: this.objectSelected.name, value: val});
			this.save();
		}
	},

	changeTextColor: function(colorParam, objectParam){
		var object = objectParam || this.currentObj;
		if(object == null) return false;
		if(object == objectParam) object = object.obj;

		var color = colorParam || document.getElementById("textColor").value;
		object.setColor("#" + color);

		if(document.getElementById("textColor") != null && document.getElementById("textColor").value != color.toString()){
			document.getElementById("textColor").value = color.toString();
		}

		if(objectParam == null){
			this.realtimeSend("changetextparam", {type: "color", objectname: this.objectSelected.name, value: color.toString()});
			this.save();
		}
	},

	/**
	*	Changes on background (parameters)
	*/
	changeBgForm: function(type, objectParam, values){
		var object = objectParam || this.currentBg;
		var that   = this;
		if(object == null) return false;

		if(values == null) values = {};
		var val = {};

		var updateInput = function(inputId, variable){
			if(that.currentBg != object) return false;

			if(document.getElementById(inputId) != null && document.getElementById(inputId).value != variable) 
				document.getElementById(inputId).value = variable;
		};

		if(type == "size"){
			var canvasSize = this.editor.game.getCanvas().getSize();
			var sizeW = (values.sizew != null) ? values.sizew : document.getElementById("sizeW").value;
			var sizeH = (values.sizeh != null) ? values.sizeh : document.getElementById("sizeH").value;

			updateInput("sizeW", sizeW);
			updateInput("sizeH", sizeH);

			if(sizeW == "100%") sizeW = canvasSize.w;
			if(sizeH == "100%") sizeH = canvasSize.h;

			if(parseInt(sizeW) < 0) sizeW = 0;
			if(parseInt(sizeH) < 0) sizeH = 0;

			object.obj.setSize(parseFloat(sizeW), parseFloat(sizeH));
			val = {sizew: parseFloat(sizeW), sizeh: parseFloat(sizeH)};
		}else if(type == "position"){
			var posX = (values.posx != null) ? values.posx : document.getElementById("posX").value;
			var posY = (values.posy != null) ? values.posy : document.getElementById("posY").value;

			if(posX == NaN) posX = 0;
			if(posY == NaN) posY = 0;

			updateInput("posX", posX);
			updateInput("posY", posY);

			if(parseInt(posX) < 0) posX = 0;
			if(parseInt(posY) < 0) posY = 0;

			object.obj.setPosition(parseFloat(posX), parseFloat(posY));
			val = {posx: parseFloat(posX), posy: parseFloat(posY)};
		}
		// else if(type=="image"){
		// 	var that = this;
		// 	var img = el.files[0];
		//     var fileName = img.name;
		//     var fileSize = img.size;
		//     var fileType = img.type;

		//     if(!fileType.match("image/*")){
		//     	alert('Vous devez envoyer une image. (png, jpeg, gif...)');
		//     	return false;
		//     }

		//     // Remove defaults inputs & add image inputs
		//     var div = document.getElementById("parametersScene");
		//     document.getElementById("colorBar").style.display = "none";
		//     document.getElementById("imgBar").style.display   = "none";
		//     var imgPosBar = document.createElement("div");
		// 	imgPosBar.innerHTML = '<div class="parameter"><div class="left"><p>Position de l\'image</p></div><div class="right"><input type="text" value="0" onkeyup="currentEditor.changeBgForm(\'imgPosition\');" id="imgPosX" style="width:50%"><input type="text" value="0" id="imgPosY" onkeyup="currentEditor.changeBgForm(\'imgPosition\');" style="width:50%"></div><div class="clear"></div></div>';
		// 	var velocityBar = document.createElement("div");
		// 	velocityBar.innerHTML = '<div class="parameter"><div class="left"><p>Velocité</p></div><div class="right"><input type="text" value="0" onchange="currentEditor.changeBgForm(\'velocity\');" id="velocityX" style="width:50%"><input type="text" value="0" id="velocityY" onchange="currentEditor.changeBgForm(\'velocity\');" style="width:50%"></div><div class="clear"></div></div>';
			

		// 	div.appendChild(imgPosBar);
		// 	div.appendChild(velocityBar);


		// 	// Send file
		// 	var formData = new FormData();
		// 	var xhr = new XMLHttpRequest();
			
		// 	formData.append(fileName, img, fileName);
		// 	xhr.open('POST', 'lib/ajax/uploadFile.php', true);
		// 	xhr.onload = function () {
		// 	  	if (xhr.status === 200) {
		// 	    	if(xhr.responseText.indexOf('/') > -1){
		// 	    		var spli = xhr.responseText.split("/");
		// 	    		var file = spli[spli.length-1];
		// 	    		var path = file;
		// 	    		network.request("saveRessource", {src: path, name: file.split(".")[0]}, function(d){
		// 	    			that.loadBgFromRessource(file.split(".")[0]);
		// 	    		}, "sceneeditor").send();
		// 	    	}
		// 	  	}
		// 	};
		// 	xhr.send(formData);
		// }else if(type=="imgPosition"){
		// 	if(this.currentBg==null) return false;
		// 	var posX = document.getElementById("imgPosX").value;
		// 	var posY = document.getElementById("imgPosY").value;

		// 	if(parseInt(posX)<0){posX=0;document.getElementById("imgPosX").value = "0";}
		// 	if(parseInt(posY)<0){posY=0;document.getElementById("imgPosY").value = "0";}

		// 	this.currentBg.obj.setImagePosition(parseInt(posX), parseInt(posY));
		// }
		else if(type == "velocity"){
			var velocityX = (values.vx != null) ? values.vx : document.getElementById("velocityX").value;
			var velocityY = (values.vy != null) ? values.vy : document.getElementById("velocityY").value;

			updateInput("velocityX", velocityX);
			updateInput("velocityY", velocityY);

			if(parseInt(velocityX) < 0){velocityX = 0;document.getElementById("velocityX").value = "0";}
			if(parseInt(velocityY) < 0){velocityY = 0;document.getElementById("velocityY").value = "0";}

			object.obj.setVelocity(new Vector2D(parseInt(velocityX), parseInt(velocityY)));
			val = {vx: parseInt(velocityX), vy: parseInt(velocityY)};
		}

		if(objectParam == null){
			this.realtimeSend("changebgparam", {type: type, objectname: this.objectSelected.name, value: val});
			this.save();
		}
	},

	loadBgFromRessource: function(srcName){
		var that = this;
		if(this.currentBg == null) return false;
		this.editor.game.ressources.loadRessources();

		this.currentBg.obj.ressource = srcName;
		this.currentBg.obj.color = false;

		this.editor.game.events.on("asyncLoadedRessources", function(e){
			if(this.currentBg==null) return false;
			var img = that.editor.game.ressources.getRessource(srcName);
			that.currentBg.obj.setImageSize(this.currentBg.size.w, this.currentBg.size.h);
		});

		this.save();
	},

	changeBgColor: function(colorParam, objectParam){
		var object = objectParam || this.currentBg;
		var that   = this;
		if(object == null) return false;

		var color = colorParam || document.getElementById("bgColor").value;
		object.obj.setColor("#" + color);

		if(document.getElementById("bgColor") != null && document.getElementById("bgColor").value != color){
			document.getElementById("bgColor").value = color;
		}

		if(objectParam == null){
			this.realtimeSend("changebgparam", {type: "color", objectname: this.objectSelected.name, value: color});
			this.save();
		}
	},

	/**
	*	Changes on camera (parameters)
	*/
	changeCameraForm: function(type){
		if(this.currentCamera==null) return false;
		var name = this.currentCamera;

		if(type=="position"){
			if(this.cameras[name]==undefined) return false;
			var posX = document.getElementById("posX").value;
			var posY = document.getElementById("posY").value;

			if(parseInt(posX)<0) posX = 0;
			if(parseInt(posY)<0) posY = 0;

			this.cameras[name].position = [posX, posY];
		}else if(type=="moveon"){
			if(this.cameras[name]==undefined) return false;
			var moveOnX = document.getElementById("moveOnX").checked;
			var moveOnY = document.getElementById("moveOnY").checked;

			this.cameras[name].moveOn.x = moveOnX;
			this.cameras[name].moveOn.y = moveOnY;
		}else if(type=="zoom"){
			if(this.cameras[name]==undefined) return false;
			var zoom = document.getElementById("zoomInput").value;
			
			if(parseFloat(zoom)<0) zoom = 0;
			else if(parseFloat(zoom)>2) zoom = 2;

			this.cameras[name].zoom = zoom;
		}

		this.save();
	},

	/**
	 * Changes on geometric object
	 */
	changeGeoObjectForm: function(type, objectParam, values){
		var object = objectParam || this.currentObj;
		var that   = this;
		if(object == null) return false;

		if(values == null) values = {};
		var val = {};

		var updateInput = function(inputId, variable){
			if(that.currentObj != object) return false;

			if(document.getElementById(inputId) != null && document.getElementById(inputId).value != variable) 
				document.getElementById(inputId).value = variable;
		};

		if(type == "position"){
			var posX = values.posx || document.getElementById("posX").value;
			var posY = values.posy || document.getElementById("posY").value;

			updateInput("posX", posX);
			updateInput("posY", posY);

			if(!Utils.isFloat(posX)) posX = 0;
			if(!Utils.isFloat(posY)) posY = 0;

			object.setPosition(parseInt(posX), parseInt(posY));
			val = {posx: posX, posy: posY};
		}else if(type=="size"){
			var sizeW = values.sizew || document.getElementById("sizeW").value;
			var sizeH = values.sizeh || document.getElementById("sizeH").value;

			updateInput("sizeW", sizeW);
			updateInput("sizeH", sizeH);

			if(parseInt(sizeW) < 0) sizeW = 0;
			if(parseInt(sizeH) < 0) sizeH = 0;

			object.setSize(parseInt(sizeW), parseInt(sizeH));
			val = {sizew: sizeW, sizeh: sizeH};
		}else if(type=="opacity"){
			var opacity = values.opacity || parseFloat(document.getElementById("objectOpacity").value);

			updateInput("objectOpacity", opacity);

			if(opacity < 0) opacity = 0;
			if(opacity > 1) opacity = 1;

			object.setOpacity(opacity);
			val = opacity;
		}else if(type=="layer"){
			var layer = values.layer || parseInt(document.getElementById("objectLayer").value);
			if(layer == "" || layer==null || layer==undefined || isNaN(layer)) layer = 0;

			updateInput("objectLayer", layer);

			if(layer < 0) layer = 0;
			if(layer > 9) layer = 9;

			object.setLayer(layer);
			val = layer;
		}else if(type=="type"){
			var objType = values.objtype || document.getElementById("selectDOMType").value;

			updateInput("selectDOMType", objType);

			object.getRenderer().type = objType;
			val = objType;
		}else if(type=="angle"){
			var objAngle = values.angle || parseFloat(document.getElementById("objectAngle").value);

			updateInput("objectAngle", objAngle);

			if(objAngle < 0 || isNaN(objAngle)) objAngle = 0;
			if(objAngle > 360) objAngle = 360;

			object.rotate(objAngle);
			val = objAngle;
		}

		if(objectParam == null){
			this.realtimeSend("changegeoobjectparam", {type: type, objectname: this.objectSelected.name, value: val});
			this.save();
		}
	},

	changeGeoObjectColor: function(colorParam, objectParam){
		var object = objectParam || this.currentObj;
		var that   = this;
		if(object == null) return false;

		var color = colorParam || document.getElementById("objectColor").value;
		object.getRenderer().color = "#" + color;

		if(document.getElementById("objectColor") != null && document.getElementById("objectColor").value != color){
			document.getElementById("objectColor").value = color;
		}

		if(objectParam == null){
			this.realtimeSend("changegeoobjectparam", {type: "color", objectname: this.objectSelected.name, value: color});
			this.save();
		}
	},

	/**
	*	Changes on sound (parameters)
	*/
	changeSoundForm: function(type){
		if(this.currentObj == null) return false;
		if(this.currentObj["audio"] == null) return false;

		if(type == "pitch"){
			var pitch = document.getElementById("pitch").value;

			if(pitch == null || !Utils.isFloat(pitch)) return false;
			if(parseFloat(pitch) < 0.5) pitch = 1; // min of playbackRate/pitch
			if(parseFloat(pitch) > 4) pitch = 4; // max of playbackRate/pitch
			
			this.currentObj.audio.playbackRate = parseFloat(pitch);
			this.currentObj.pitch = parseFloat(pitch);
		}else if(type == "looping"){
			var loop = document.getElementById("looping").checked;
			
			this.currentObj.audio.loop    = loop;
			this.currentObj.looping = loop;
		}else{
			console.error("Sound type '" + type + "' not registered in code.");
			return false;
		}

		this.save();
	},

	changeSoundVolume: function(e){
		if(this.currentObj == null) return false;
		if(this.currentObj["audio"] == null) return false;
		if(!this.leftDown) return false;

		e.preventDefault();

		// console.log(e);

		var bar      = document.getElementById("soundVolume");
		var x        = e.clientX - bar.getBoundingClientRect().left;
		
		if(x <= 0 || x > bar.offsetWidth) return false;

		var barWidth = bar.offsetWidth;
		var percent  = (100 * x) / barWidth;

		if(percent > 100) percent = 100;
		if(percent < 0)   percent = 0;

		this.currentObj.audio.volume = percent / 100; // Update volume
		this.currentObj.volume       = Math.round(percent); // Update volume data
		document.getElementById("soundVolumeCursor").style.left = (barWidth * percent / 100) + "px"; // Move cursor
		document.getElementById("volumeSpan").innerHTML = Math.round(percent) + "%"; // Update sound percent span status
	},

	playSound: function(el){
		if(this.currentObj == null) return false;
		if(this.currentObj["audio"] == null) return false;

		var played = !this.currentObj.audio.paused;

		if(played){
			this.currentObj.audio.pause();
			el.childNodes[0].className = "fa fa-play";
		}else{
			this.currentObj.audio.play();
			el.childNodes[0].className = "fa fa-pause";
		}

		this.currentObj.audio.onended = function(){
			if(this.loop){
				this.currentTime = 0;
				this.play();
	        	el.childNodes[0].className = "fa fa-pause";
			}else{
				this.pause();
				this.currentTime = 0;
	        	el.childNodes[0].className = "fa fa-play";
			}
			
	    };
	},

	stopSound: function(el){
		if(this.currentObj == null) return false;
		if(this.currentObj["audio"] == null) return false;

		var playBtn = document.getElementById("playSoundBtn");

		this.currentObj.audio.pause();
		this.currentObj.audio.currentTime = 0;

		playBtn.childNodes[0].className = "fa fa-play";
	},


	/**
	 * 	Selected section
	 */
	updateSelectedObject: function(){
		var that = this;
		if(this.objectSelected == null) return false;

		var obj  = this.objectSelected;
		var go   = obj.obj;
		var ctx = Game.getCanvas().getContext();

		var scene = this.editor.game.getCurrentScene(); 
		var zoom  = (scene.camera != null) ? scene.camera.zoom : 1;
		var offset = (scene.camera != null) ? scene.camera.offset : {x:0,y:0};

		var top = null, left = null;

		if(go !== undefined && go.getBorder !== undefined){

			var left   = (go.getBorder("left") + offset.x) * zoom;
			var top    = (go.getBorder("top") + offset.y) * zoom;
			var right  = (go.getBorder("right") + offset.x) * zoom;
			var bottom = (go.getBorder("bottom") + offset.y) * zoom;

			// Draw lines
			ctx.beginPath();
			ctx.moveTo(left, top);
			ctx.lineTo(right, top);
			ctx.lineTo(right, bottom);
			ctx.lineTo(left, bottom);
			ctx.lineTo(left, top);

			ctx.strokeStyle = "#DDD";
			ctx.stroke();

			// Draw arrows to move
			var arrowLength = 50;
			if(top - (arrowLength + 10) < 0)
				this.draw_arrow(ctx, left + go.getSize().w / 2, bottom, arrowLength, "bottom", "#D3CE3D");
			else
				this.draw_arrow(ctx, left + go.getSize().w / 2, top, arrowLength, "top", "#D3CE3D");

			this.draw_arrow(ctx, right, top + go.getSize().w / 2, arrowLength, "right", "red");

			var center = go.getCenter();

	        // Draw cross at the center
	        var crossSize = 10;
	        ctx.beginPath();
	        ctx.moveTo(center.x, center.y);
	        ctx.lineTo(center.x - crossSize, center.y);
	        ctx.moveTo(center.x, center.y);
	        ctx.lineTo(center.x, center.y - crossSize);
	        ctx.moveTo(center.x, center.y);
	        ctx.lineTo(center.x + crossSize, center.y);
	        ctx.moveTo(center.x, center.y);
	        ctx.lineTo(center.x, center.y + crossSize);

	        ctx.strokeStyle = "#AAA";
	        ctx.stroke();

	        left = go.getPosition().x, top = go.getPosition().y;

	    }else if(obj.type == "text"){
	    	var size = Utils.measureText(obj.obj.text, obj.obj.font.replace(" ", "+") + " " + obj.obj.fontSize);
	    	var pos  = obj.obj.position;

	    	var pad  = 5;
	    	var left = (pos.getX() - pad), top = (pos.getY() - size.height) - pad, right = (pos.getX() + size.width) + pad, bottom = (pos.getY() + pad);

	    	// Draw lines around the text
			ctx.beginPath();
			ctx.moveTo(left, top);
			ctx.lineTo(right, top);
			ctx.lineTo(right, bottom);
			ctx.lineTo(left, bottom);
			ctx.lineTo(left, top);

			ctx.strokeStyle = "#DDD";
			ctx.stroke();

			// Draw arrows to move
			var arrowLength = 50;
			if(top - (arrowLength + 10) < 0)
				this.draw_arrow(ctx, left + pad + size.width / 2, bottom, arrowLength, "bottom", "#D3CE3D");
			else
				this.draw_arrow(ctx, left + pad + size.width / 2, top, arrowLength, "top", "#D3CE3D");

			this.draw_arrow(ctx, right, top + pad + size.height / 2, arrowLength, "right", "red");
	        
	    }else if(obj.type == 'background'){

	    }

	    // Draw line to properties box
	    if(this.lastPropertiesBoxCoords != null && left != null && top != null){
        	var c = this.lastPropertiesBoxCoords;
        	var padX = 0;

        	if(left > c.x) padX = c.w;

        	ctx.beginPath();
        	ctx.moveTo(left, top);
        	ctx.lineTo(c.x + padX, c.y + 7);

        	ctx.strokeStyle = "#fff";
        	ctx.stroke();
        }
	},

	draw_arrow: function(ctx, startX, startY, size, dir, color){ 
       	var sizes = {la: 1, lo: size, laa: 15};

       	if(dir == "top"){
       		ctx.beginPath();

       		ctx.moveTo(startX - sizes.la / 2, startY);
       		ctx.lineTo(startX - sizes.la / 2, startY - sizes.lo);
       		ctx.lineTo(startX - sizes.la / 2 - sizes.laa / 2, startY - sizes.lo);
       		ctx.lineTo(startX - sizes.la / 2, startY - sizes.lo - sizes.laa);
       		ctx.lineTo(startX - sizes.la / 2 + sizes.laa / 2, startY - sizes.lo);
       		ctx.lineTo(startX + sizes.la / 2, startY - sizes.lo);
       		ctx.lineTo(startX + sizes.la / 2, startY);

       		if(this.selectionArrowsColors[0] != undefined) color = this.selectionArrowsColors[0];

       		ctx.fillStyle = color;
       		ctx.fill();

       		this.selectionArrows[0] = [startX - sizes.la / 2 - sizes.laa / 2, startY - sizes.lo - sizes.laa, startX + sizes.la / 2 + sizes.laa / 2, startY];
       	}else if(dir == "bottom"){
       		ctx.beginPath();

       		ctx.moveTo(startX - sizes.la / 2, startY);
       		ctx.lineTo(startX - sizes.la / 2, startY + sizes.lo);
       		ctx.lineTo(startX - sizes.la / 2 - sizes.laa / 2, startY + sizes.lo);
       		ctx.lineTo(startX - sizes.la / 2, startY + sizes.lo + sizes.laa);
       		ctx.lineTo(startX - sizes.la / 2 + sizes.laa / 2, startY + sizes.lo);
       		ctx.lineTo(startX + sizes.la / 2, startY + sizes.lo);
       		ctx.lineTo(startX + sizes.la / 2, startY);

       		if(this.selectionArrowsColors[0] != undefined) color = this.selectionArrowsColors[0];

       		ctx.fillStyle = color;
       		ctx.fill();

       		this.selectionArrows[0] = [startX - sizes.la / 2 - sizes.laa / 2, startY, startX + sizes.la / 2 + sizes.laa / 2, startY + sizes.lo + sizes.laa];
       	}else if(dir == "right"){
       		ctx.beginPath();

       		ctx.moveTo(startX, startY - sizes.la / 2);
       		ctx.lineTo(startX + sizes.lo, startY - sizes.la / 2);
       		ctx.lineTo(startX + sizes.lo, startY + sizes.la / 2 - sizes.laa / 2);
       		ctx.lineTo(startX + sizes.lo + sizes.laa, startY - sizes.la / 2);
       		ctx.lineTo(startX + sizes.lo, startY - sizes.la / 2 + sizes.laa / 2);
       		ctx.lineTo(startX + sizes.lo, startY + sizes.la / 2);
       		ctx.lineTo(startX, startY + sizes.la / 2);

       		if(this.selectionArrowsColors[1] != undefined) color = this.selectionArrowsColors[1];

       		ctx.fillStyle = color;
       		ctx.fill();

       		this.selectionArrows[1] = [startX, startY - sizes.la / 2 - sizes.laa / 2, startX + sizes.lo + sizes.laa, startY + sizes.la / 2 + sizes.laa / 2];
       	}
    },


	save: function(){
		if(network.connection == null) return false;
		if(!this.canSave) return false;
		if(this.editor.game.paused) return false;

		var data = {};
		data.objs = this.objs;

		for(var i = 0; i < data.objs.length; i++){
			var obj = data.objs[i];
			if(obj === undefined || obj === null){
				data.objs.splice(i, 1);
				continue ;
			}

			if(obj.obj != undefined && obj.obj.scene != undefined){
				data.objs[i].obj.scene = undefined;
			}

			// Save cameras
			if(obj.type == "camera"){
				for(var j=0;j<Object.keys(this.cameras).length;j++){
					var camName = Object.keys(this.cameras)[j];
					var camera  = this.cameras[camName];

					if(camName == obj.name){
						obj.obj.zoom = parseFloat(camera.zoom);
						obj.obj.position = {x: parseFloat(camera.position[0]), y: parseFloat(camera.position[1])};
					}
				}
			}
		}

		data.tilemap = (this.currentTilemap !== null && this.currentTilemap.objName != undefined) ? {tilemap: this.currentTilemap.objName, name: this.currentTilemap.name} : null;
		data.name = new String(this.editor.filesManager.currentFile + "");
		data.file = formatFilename(data.name);

		network.request("saveScene", data).send();
	},


	openRemoveConfirmDialog: function(callback, name){
		var that = this;

		App.modal(
			"<i class='fa fa-cube'></i> Supprimer un composant",
			"<div class='input'><label for='componentName'>Nom du composant</label><input type='text' value='" + name + "' disabled id='componentName' placeholder='Nom du composant'></div>" +
			"<div class='btn btn-success closeAlert' onclick='currentEditor.confirmOption=true;' style='width:47.5%;float:left;margin-right:5%'><i class='fa fa-check'></i> Supprimer</div>" + 
			"<div class='btn btn-danger closeAlert' onclick='currentEditor.confirmOption=false;' style='width:47.5%;float:left'><i class='fa fa-times'></i> Annuler</div><div class='clear'></div>", 
			
			function(){
				if(!that.confirmOption) return false;
				callback(name);
			}
		, 400);
	}
};