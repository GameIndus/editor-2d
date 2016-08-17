function SceneWorkspace(editor){
	this.editor = editor;

	this.size      = {w: -1, h: -1};
	this.objects   = [];
	this.gameScene = null;

	this.toolTriggersRects = {};
	this.ressourcesLoader  = {};
	this.ressourcesLoaded  = [];

	this.currentObject         = null;
	this.currentTransformation = null;
	this.currentTransformTool  = "move";
}

SceneWorkspace.prototype = {

	init: function(){
		var that = this;
		this.loader = this.startLoader();

		var editor = this.editor.editor;

		var scene  = new Scene();
		var bg     = new Background({color: "#000"});
		bg.setSize(2147483647, 2147483647);bg.setPosition(-1073741823, -1073741823); // MAX INT

		// Define camera for zoom & move
		var camera = new Camera();

		camera.setBounds(false);
		camera.setMoveOn("X", true);
		camera.setMoveOn("Y", true);

		scene.setActiveCamera(camera);

		scene.addBackground(bg);
		editor.getEngineGame().addScene("default", scene);
		editor.getEngineGame().setCurrentScene("default");

		network.onConnect(function(){
			new ConfigEditor().getConfig(function(c){
				that.size = c.size;
			});
		});

		Game.getEventsManager().on("gameRendered", function(){
			that.updateBorders();
			that.drawCurrentObjectBounds();
			that.drawTransformTools();
		});
		Game.getEventsManager().on("loaded", function(){
			setTimeout(function(){
				if(that.loader.parentNode != null) that.loader.parentNode.remove();
				that.initTriggers();
				App.resize();
			}, 100);
		});
		
		this.gameScene = scene;
	},
	initTriggers: function(){
		var self = this;
		
		Input.reset();

		// Transformation tools (move, rotate)
		Input.mouseDown("left", function(e){
			if(e.target.id != "sceneEditor") return false;
			e.preventDefault();
			e.stopPropagation();

			if(self.checkForTransformTool(e.getEditorPosition())){
				setTimeout(function(){
					var canvas = document.getElementById("sceneEditor");
					canvas.classList.add("moving");
					canvas.classList.remove("transformover");
					canvas.scrollLeft += 1;
					canvas.scrollLeft -= 1;
				}, 20);
			}
		}, true);
		Input.mouseMove(function(e){
			if(e.target.id != "sceneEditor") return false;
			if(!Input.mouseIsDown("left")){
				var canvas = document.getElementById("sceneEditor");
				
				if(self.checkForTransformTool(e.getEditorPosition(), true))
					if(!canvas.classList.contains("transformover")) canvas.classList.add("transformover");
				else
					if(canvas.classList.contains("transformover")) canvas.classList.remove("transformover");
				
				return false;
			}

			self.updateObjectByTransformation(e.getEditorPosition());
		});
		Input.mouseUp("left", function(e){
			self.currentTransformation = null;
			var sceneEditor = document.getElementById("sceneEditor");
			if(sceneEditor == null) return false;
			sceneEditor.classList.remove("moving");
			sceneEditor.classList.remove("transformover");
		}, true);
		Input.click("left", function(e){
			if(e.target.id != "sceneEditor") return false;
			e.preventDefault();e.stopPropagation();

			if(self.checkForTransformTool(e.getEditorPosition())) return false;

			self.checkForObjectAt(e.getEditorPosition());
		}, true);


		// Ressources loading
		Game.getEventsManager().on("loadedRessource", function(data){
			var name = data.ressourceName;
			if(name == null) return false;
			if(self.ressourcesLoader[name] == null) return false;

			self.removeRessourceLoader(name);
		});


		flatRadio.bind("scene_transformation", "scene_transformation");
		flatRadio.bind("click_mode", "click_mode");

		flatRadio.onChange("scene_transformation", function(value){
			self.currentTransformTool = value;
		});
		flatRadio.onChange("click_mode", function(value){
			console.log("New click mode:", value);
		});

		this.loadCameraSystem();
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

			self.reloadLoadersPosition();
		});
	},

	reload: function(){
		var self = this;

		// Reload tilemaps & sprites
		// this.getObjectsByType("tilemap").promiseForEach(function(object){
		// 	var tilemapFile = object.getProperty("tilemapfile");
		// 	var tilemapName = tilemapFile.substring(tilemapFile.lastIndexOf("/") + 1);
			
		// 	self.loadTilemapFor(object, tilemapName, true);
		// });
	},

	// Objects
	loadObjectsFromData: function(data){
		this.editor.sidebar.clear();
		this.clear();

		for(var i = 0; i < data.objects.length; i++){
			var o = new SceneObject().fromRawString(data.objects[i]);

			this.editor.sidebar.addEntry(o.name, o);
			this.editor.sidebar.setObjectHidden(o, o.hidden);

			this.reloadObjectProperties(o);
			this.objects.push(o);

			if(o.getType() == "sprite"){
				var spriteFile = o.getProperty("spritefile");
				this.loadSpriteFor(o, spriteFile.substring(spriteFile.lastIndexOf("/") + 1, spriteFile.length), true);
			}
			if(o.getType() == "tilemap"){
				var tilemapFile = o.getProperty("tilemapfile");
				this.loadTilemapFor(o, tilemapFile.substring(tilemapFile.lastIndexOf("/") + 1, tilemapFile.length), true);
			}
		}
	},
	clear: function(){
		this.objects = [];

		// Clear ressource loaders
		var container = document.getElementById("editor-container");
		var loaders   = container.querySelectorAll(".loader");

		loaders.forEach(function(loader){
			if(loader.dataset.disableAutoClear) return false;
			loader.remove();
		});
		this.ressourcesLoader = {};

		if(this.getGameScene() != null){
			var r = new Array();
			r = r.concat(this.getGameScene().gameobjects);
			r = r.concat(this.getGameScene().backgrounds);
			r = r.concat(this.getGameScene().texts);

			this.getGameScene().gameobjectsMap = {};
			this.getGameScene().tilemap 	   = null;

			for(var i = 0; i < r.length; i++){
				if(r[i] instanceof Background && r[i].getPosition().getX() == -1073741823) continue;
				
				this.getGameScene().remove(r[i]);
			}
		}
	},

	getObjects: function(){
		return this.objects;
	},
	getObjectsByType: function(type){
		var r = new Array();

		this.objects.forEach(function(object){
			if(object.getType() == type) r.push(object);
		});

		return r;
	},
	getObjectByName: function(name){
		var r = null;
		
		this.objects.forEach(function(object){
			if(object.getName() == name) r = object;
		});

		return r;
	},
	getObjectByGameObject: function(gameObject){
		for(var i = 0; i < this.getObjects().length; i++){
			var object = this.getObjects()[i];
			if(object.getObject() == gameObject) return object;
		}

		return null;
	},
	getCurrentObject: function(){
		return this.currentObject;
	},
	checkForObjectAt: function(position){
		var scene      = this.getGameScene();
		var gameObject = null; 

		position = this.convertWithCamera(position, true);

		// Check for texts
		for(var i = 0; i < scene.texts.length; i++){
			var text = scene.texts[i];
			var rect = new Rectangle(text.getPosition().getX(), text.getPosition().getY(), text.getSize().w, text.getSize().h);

			if(rect.inside(position)){ gameObject = text; break; }
		}

		// Check for objects
		if(gameObject == null){
			for(var i = 9; i > -1; i--){
				var checker = scene.getObjectAt(position, i);
				if(checker){ gameObject = checker; break; }
			}
		}

		// Check for backgrounds
		if(gameObject == null){
			var backgrounds = new Array().concat(scene.backgrounds);
			backgrounds.shift();

			for(var i = 0; i < backgrounds.length; i++){
				var background = backgrounds[i];
				var rect 	   = new Rectangle(background.getPosition().getX(), background.getPosition().getY(), background.getSize().w, background.getSize().h);

				if(rect.inside(position)){ gameObject = background; break; }
			}
		}

		// Check for tilemap
		if(gameObject == null){
			var tilemap = scene.getTileMap();

			if(tilemap != null){
				var rectangle = tilemap.getLimits();

				if(rectangle.inside(position))
					gameObject = tilemap;
			}
		}

		var sidebar = this.editor.sidebar;
		if(gameObject == null){
			sidebar.clickOnObject(null);
			return false;
		}

		var sceneObject = this.getObjectByGameObject(gameObject);
		if(sceneObject == null) return false;

		sidebar.clickOnObject(sidebar.getObjectElement(sceneObject), true);
	},

	createObject: function(type, name){
		var o = new SceneObject(type, name).create();

		if(type == "text") this.updateObjectProperty(o, "fontSize", o.getObject().getSize().h);
		else if(type == "background")
			this.updateObjectProperty(o, "size", {w: parseFloat(this.size.w), h: parseFloat(this.size.h)}, true);

		this.getObjects().push(o);
		return o;
	},
	createObjectAt: function(type, name, position){
		var o = this.createObject(type, name);

		this.updateObjectProperty(o, "position", {x: position.getX(), y: position.getY()}, true);
		return o;
	},
	createObjectFromSidebar: function(type, name, position, realtime){
		var o = this.createObjectAt(type, name, position);
		
		if(!realtime){
			this.editor.sidebar.loadPropertiesOf(o);
			this.setCurrentObject(o);
			this.editor.sidebar.setCurrentTab("listObjects");
		}

		this.editor.sidebar.addEntry(name, o);

		if(!realtime){
			this.editor.sidebar.clickOnObject(this.editor.sidebar.getElementEntryByName(name));
			window.OBJECT = o;
		}

		return o;
	},

	setCurrentObject: function(object){
		this.currentObject = object;
	},
	removeObject: function(object){
		object.remove();
		this.objects.splice(this.objects.indexOf(object), 1);
	},

	reloadObjectProperties: function(object){
		var properties = object.getProperties();

		for(var i = 0; i < Object.keys(properties).length; i++){
			var property = Object.keys(properties)[i];
			var value    = properties[property];

			if(property != "behaviors"){
				if(typeof value !== "object")
					this.updateObjectProperty(object, property, value);
				else{
					if(value == null) continue;

					for(var j = 0; j < Object.keys(value).length; j++){
						var subProperty = Object.keys(value)[j];
						var subValue    = value[subProperty];

						this.updateObjectSubProperty(object, property, subProperty, subValue);
					}
				}
			}
		}
	},
	updateObjectProperty: function(object, property, value, forceRealtime){
		if(object == null || typeof object.getProperty(property) === 'undefined') return false;
		var self = this;
		
		var dictionary = this.editor.dictionary;
		var special    = (dictionary.getSpecialPropertyTask(property) != null);

		if(!isNaN(value)) value = parseInt(value);
		else if(value instanceof Object){
			value.forEach(function(key, value2){
				if(!isNaN(value[key])) value[key] = parseFloat(value2);
			});
		}

		object.getProperties()[property] = value;
		if(value === undefined) delete object.getProperties()[property];

		if(special){
			dictionary.getSpecialPropertyTask(property)(object, property, value);
		}else{
			object.getObject()[property] = value;
		}

		if(forceRealtime){
			if(typeof value === "object"){
				value.forEach(function(subproperty, subvalue){
					self.editor.realtimeSend("changeobjectproperty", {objectname: object.getName(), subproperty: subproperty, property: property, value: subvalue});
				});
			}else
				this.editor.realtimeSend("changeobjectproperty", {objectname: object.getName(), property: property, value: value});
		}

		return object;
	},
	updateObjectSubProperty: function(object, property, subproperty, value){
		if(object == null || typeof object.getProperty(property) === 'undefined') return false;
		if(typeof object.getProperties()[property] !== "object") return false;

		var dictionary = this.editor.dictionary;
		var special    = (dictionary.getSpecialPropertyTask(property) != null);

		if(!isNaN(value)) value = parseInt(value);
		else if(value instanceof Object){
			value.forEach(function(key, value2){
				if(!isNaN(value[key])) value[key] = parseFloat(value2);
			});
		}

		object.getProperties()[property][subproperty] = value;
		if(value === undefined) delete object.getProperties()[property][subproperty];

		if(special){
			dictionary.getSpecialPropertyTask(property)(object, property, object.getProperties()[property]);
		}else{
			object.getObject()[property][subproperty] = value;
		}

		return object;
	},
	updateObjectBehaviorProperty: function(object, behaviorName, property, value, forceRealtime){
		var objectProperties = object.getProperties();

		if(objectProperties.behaviors == null) objectProperties.behaviors = {};
		if(objectProperties.behaviors[behaviorName] == null) objectProperties.behaviors[behaviorName] = {};

		if(!isNaN(value)) value = parseInt(value);
		else if(value instanceof Object){
			value.forEach(function(key, value2){
				if(!isNaN(value[key])) value[key] = parseFloat(value2);
			});
		}else if(value == "false") value = false;
		else if(value == "true") value = true;

		objectProperties.behaviors[behaviorName][property] = value;
		if(value === undefined) objectProperties.behaviors[behaviorName].splice(objectProperties.behaviors[behaviorName].indexOf(property), 1);

		if(forceRealtime)
			this.editor.realtimeSend("changeobjectproperty", {objectname: object.getName(), behaviorname: behaviorName, property: property, value: value});

		return object;
	},

 	// Loading
 	startLoader: function(){
		var div = document.getElementById("ressourceImporter");
		if(div == null) return false;
		
		var container = div.querySelector(".container");
		container.classList.add("closed");

		if(document.querySelector(".loader") != null) document.querySelector(".loader").remove();

		var loading = document.createElement("div");
		loading.style.position = "absolute";
		// loading.className = "spinner spinner-white";
		loading.className = "loader";
		loading.dataset.disableAutoClear = true;
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
	loadSpriteFor: function(object, spriteName, realtime){
		var self = this;

		network.request("loadSprite", {filename: formatFilename(spriteName)}, function(e){
			if(e.error || !e.sprite || !e.sprite.ressource){
				self.removeObject(object);
				self.editor.sidebar.removeEntry(object.getName());
				self.editor.sidebar.clickOnObject(null);

				self.editor.realtimeSend("removeobject", object.getName());
				App.alert("Erreur d'importation", "Cette image n'est pas configurée : vous ne pouvez donc pas l'ajouter.", "danger");
				return false;
			}

			var sprite    = e.sprite;
			var ressource = sprite.ressource.name;
			var cellSize  = sprite.ressource.cellSize;

			var path = App.getFilesManager().getFilePath("sprite", sprite.name);

			self.updateObjectProperty(object, "ressource", ressource, true);
			self.updateObjectProperty(object, "spritefile", path, true);
			self.updateObjectProperty(object, "size", cellSize, true);
			self.updateObjectProperty(object, "animations", sprite.animations, true);

			// Ressource loader
			object.setLoading(true);
			self.loadRessourceOf(object, ressource);

			if(!realtime){
				self.editor.sidebar.loadPropertiesOf(null);
				self.editor.sidebar.loadPropertiesOf(object);
			}
		}, "sceneeditor").send();
	},
	loadTilemapFor: function(object, tilemapName, realtime){
		var self = this;

		network.request("loadTilemap", {filename: formatFilename(tilemapName)}, function(e){
			var json    = {};
			var tilemap = e.tilemap;

			if(e.error || tilemap.ressource == null){
				self.removeObject(object);
				self.editor.sidebar.removeEntry(object.getName());
				self.editor.sidebar.clickOnObject(null);

				self.editor.realtimeSend("removeobject", object.getName());
				App.alert("Erreur d'importation", "Cette carte est vide : vous ne pouvez donc pas l'ajouter.", "danger");
				return false;
			}

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
				tiles: formatTiles(tilemap.tiles),
				betweenX: 0, betweenY: 0
			};

			object.getObject().loadFromJson(json);

			// Ressource loader
			object.setLoading(true);
			self.loadRessourceOf(object, json["tile"].src);

			self.updateObjectProperty(object, "tilemapfile", App.getFilesManager().getFilePath("tilemap", tilemapName), true);

			if(!realtime){
				self.editor.sidebar.loadPropertiesOf(null);
				self.editor.sidebar.loadPropertiesOf(object);
			}
		}, "sceneeditor").send();
	},

	// Ressources loader
	loadRessourceOf: function(object, name){
		if(this.ressourcesLoaded.contains(name)){
			object.setLoading(false);
			return false;
		}
		var self = this;

		this.editor.editor.getEngineGame().getRessourcesManager().loadRessource(name);
		this.ressourcesLoaded.push(name);

		var container = document.getElementById("editor-container");
		var loader    = document.createElement("div");
		var rectangle = object.getObjectRectangle();

		loader.style.position = "absolute";
		loader.className = "loader";
		loader.style.zIndex = 5;
		loader.innerHTML = '<svg id="spinner_loader" class="spinner hide" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>';

		if(rectangle != null){
			container.appendChild(loader);

			var center = self.convertWithCamera(rectangle.getCenter());

			setTimeout(function(){
				loader.setStyle("top", (center.getY() - loader.offsetHeight / 2) + "px");
				loader.setStyle("left", (center.getX() - loader.offsetWidth / 2) + "px");
			}, 100);
		}

		this.ressourcesLoader[name] = {loader: loader, object: object};
	},
	reloadLoadersPosition: function(){
		var self = this;

		this.ressourcesLoader.forEach(function(name, o){
			var loader = o.loader;
			var object = o.object;

			// Remove loader at the good place
			var rectangle = object.getObjectRectangle();
			var center    = self.convertWithCamera(rectangle.getCenter());

			loader.setStyle("top", (center.getY() - loader.offsetHeight / 2) + "px");
			loader.setStyle("left", (center.getX() - loader.offsetWidth / 2) + "px");
		});
	},
	removeRessourceLoader: function(name){
		if(this.ressourcesLoader[name] == null) return false;
		
		this.ressourcesLoader[name].loader.remove();
		this.ressourcesLoader[name].object.setLoading(false);

		delete this.ressourcesLoader[name];
	},


	// Scene managment
	getGameScene: function(){
		return this.gameScene;
	},
	updateBorders: function(){
		if(this.size.w == -1 || this.size.h == -1) return false;
		var ctx = Game.getContext();
	},
	drawCurrentObjectBounds: function(){
		var object = this.currentObject;
		if(object == null) return false;

		var ctx         = Game.getContext();
		var rect        = object.getObjectRectangle();
		var drawRect    = rect.clone();
		var objRenderer = object.getObject().renderer;
		var center      = this.convertWithCamera(rect.getCenter().clone());
		var crossSize   = 15;
		var rotation    = object.getObject().angle || 0;

		if(rect.getWidth() < 0 || rect.getHeight() < 0) return false;

		var color       = (objRenderer != null && objRenderer.color != null) ? objRenderer.color : object.getObject().color;
		var strokeColor = (color != null && Utils.hexColorIsLight(color)) ? "#383838" : "#fff";

		ctx.save();
		ctx.translate(center.getX(), center.getY());
		ctx.rotate(rotation * Math.PI / 180);
		ctx.translate(0, 0);

		// Draw borders
		drawRect.x = -drawRect.getWidth() / 2;
		drawRect.y = -drawRect.getHeight() / 2;
		drawRect.draw(ctx, strokeColor);

		// Draw cross in the center
		if(!object.isLoading()){
			ctx.beginPath();
			ctx.moveTo(-crossSize, 0);
			ctx.lineTo(crossSize, 0);
			ctx.moveTo(0, -crossSize);
			ctx.lineTo(0, crossSize);

			ctx.strokeStyle = strokeColor;ctx.stroke();
		}

		ctx.restore();

		// Draw temp transform indicators
		if(this.currentTransformation != null && !this.currentTransformation.over){
			if(this.currentTransformation.type == "rotate"){
				var degrees = Math.abs(this.currentObject.getObject().angle % 360);
				var cursor  = Input.getLastCursorPosition().clone();
				cursor.substract(new Position(this.lastSidebarWidth, 60));

				if(this.lastSidebarWidth > 0){
					ctx.fillStyle = "rgb(255,255,0)";
					ctx.font      = "bold 17px Helvetica";
					ctx.fillText(degrees + "°", cursor.getX() + 30, cursor.getY() + 2);
				}
			}else if(this.currentTransformation.type == "arrow-x" || this.currentTransformation.type == "arrow-y"){
				var transform = this.currentTransformation;
				var object    = this.currentObject;
				var cursor    = Input.getLastCursorPosition().clone();
				var diff      = 0;

				cursor.substract(new Position(this.lastSidebarWidth, 60));
				if(transform.type == "arrow-x") diff = object.getProperty("position").x - transform.objectOriginPosition.x;
				if(transform.type == "arrow-y") diff = object.getProperty("position").y - transform.objectOriginPosition.y;

				if(diff != 0){
					ctx.fillStyle = (diff > 0) ? "rgb(0,255,0)" : "rgb(255,0,0)";
					ctx.font      = "bold 16px Helvetica";
					ctx.fillText(((diff > 0) ? "+" : "") + diff + "px", cursor.getX() + 30, cursor.getY() + 2);
				}
			}
		}

		// Change opacity of others objects in front of the current object
		if(this.currentTransformation != null && !this.currentTransformation.over){
			
		}
	},
	drawTransformTools: function(){
		var object = this.currentObject;
		if(object == null) return false;

		var ctx        = Game.getContext();
		var rect       = object.getObjectRectangle();
		var center     = this.convertWithCamera(rect.getCenter());
		var canvasSize = Game.getSize();
		var transform  = this.currentTransformation;
		var arrowLen   = 80 + 10;
		var arrowWidth = 4;

		if(object instanceof TileMap && rect.getWidth() <= 0 || rect.getHeight() <= 0) return false;
		if(object.isLoading()) return false;

		switch(this.currentTransformTool){
			case "move":
				var xReverse   = (center.getX() + arrowLen + 20 >= canvasSize.getWidth()) ? -1 : 1;
				var yReverse   = (center.getY() - arrowLen - 20 <= 0) ? -1 : 1;
				var xArrowRect = new Rectangle(center.getX(), center.getY() - arrowWidth - 5, arrowLen, arrowWidth);
				var yArrowRect = new Rectangle(center.getX() - arrowWidth / 2, center.getY() - arrowLen, arrowWidth, arrowLen);

				if(xReverse == -1) xArrowRect.x -= xArrowRect.getWidth();
				if(yReverse == -1) yArrowRect.y += yArrowRect.getHeight();

				var xColor = "rgb(255,0,0)",
					yColor = "rgb(0,255,0)";

				if(transform != null && transform.type == "arrow-x") xColor = "rgb(255,50,50)";
				if(transform != null && transform.type == "arrow-y") yColor = "rgb(50,255,50)";

				Utils.drawArrow(ctx, center.getX(), center.getY(), center.getX() + (xReverse * arrowLen), center.getY(), xColor, arrowWidth);
				Utils.drawArrow(ctx, center.getX(), center.getY(), center.getX(), center.getY() - (yReverse * arrowLen), yColor, arrowWidth);

				if(this.lastXArrowRect != xArrowRect || this.lastYArrowRect != yArrowRect){
					this.toolTriggersRects["arrow-x"] = xArrowRect;
					this.toolTriggersRects["arrow-y"] = yArrowRect;
				}

				this.lastXArrowRect = xArrowRect;this.lastYArrowRect = yArrowRect;
			break;
			case "rotate":
				if(!object.canBeRotated()) return false;

				var toolRadius = arrowLen - 20;
				var toolColor  = "rgb(255,255,0)";

				if(transform != null && transform.type == "rotate") toolColor = "rgb(255,255,50)";

				ctx.beginPath();
		        ctx.arc(center.getX(), center.getY(), toolRadius, 0, 2 * Math.PI, false);
		        ctx.lineWidth   = (arrowWidth - 1) + 0.5;
		        ctx.strokeStyle = toolColor;
		        ctx.stroke();

		        var rotateObj = {radius: toolRadius, lineWidth: ctx.lineWidth};

		        if(this.lastRotateRect != rotateObj) this.toolTriggersRects["rotate"] = rotateObj;
		        this.lastRotateRect = rotateObj;
			break;
		}
	},

	// Transform tools
	checkForTransformTool: function(mousePosition, over){
		var that          = this;
		var detectionRect = null,
			detectionType = null;
		var object 		= this.currentObject;
		var marginError = 5;

		if(object == null) return false;

		this.toolTriggersRects.forEach(function(type, triggerRect){
			if(detectionRect != null) return false;
			if(type != that.currentTransformTool){
				if(that.currentTransformTool != "move" || (type != "arrow-x" && type != "arrow-y"))
					return false;
			}

			if(type != "rotate"){
				triggerRect.x -= marginError;triggerRect.y -= marginError;
				triggerRect.w += marginError * 2;triggerRect.h += marginError * 2;

				if(triggerRect.inside(mousePosition)){
					detectionRect = triggerRect;
					detectionType = type;
				}
			}else{
				var center   = that.convertWithCamera(object.getObjectRectangle().getCenter());
				var distance = center.distanceTo(mousePosition);

				if(inRange(distance, triggerRect.radius - marginError, triggerRect.radius + triggerRect.lineWidth + marginError)){
					detectionRect = triggerRect;
					detectionType = type;
				}
			}
		});

		if(detectionRect == null || detectionType == null) return false;

		this.currentTransformation = {
			triggerRect: detectionRect,
			type: detectionType,
			mousePosition: mousePosition.clone(),
			objectOriginPosition: object.getProperty("position").clone(),
			objectCenterPosition: that.convertWithCamera(object.getObjectRectangle().getCenter().clone()),
			objectDefaultRotation: object.getObject().angle,
			over: (over === true)
		};

		return true;
	},
	updateObjectByTransformation: function(mousePosition){
		if(this.currentTransformation == null || this.currentObject == null) return false;
		var object    = this.currentObject;
		var transform = this.currentTransformation;

		if(transform.over) return false;
		if(object.isLoading()) return false;

		this.lastSidebarWidth     = document.getElementById("sidebar").offsetWidth;

		switch(transform.type){
			case "arrow-x":
				var diff = mousePosition.getX() - transform.mousePosition.getX();
				var newX = transform.objectOriginPosition.x + diff;

				if(Input.keyIsDown("ctrl")) newX = MathUtils.step(newX, 5);

				this.updateObjectProperty(object, "position", {x: newX, y: transform.objectOriginPosition.y});
				this.editor.realtimeSend("changeobjectproperty", {objectname: object.getName(), property: "position", subproperty: "x", value: newX});
				this.editor.sidebar.updateFieldWithValue("position", "x", newX);
			break;
			case "arrow-y":
				var diff = mousePosition.getY() - transform.mousePosition.getY();
				var newY = transform.objectOriginPosition.y + diff;

				if(Input.keyIsDown("ctrl")) newY = MathUtils.step(newY, 5);

				this.updateObjectProperty(object, "position", {x: transform.objectOriginPosition.x, y: newY});
				this.editor.realtimeSend("changeobjectproperty", {objectname: object.getName(), property: "position", subproperty: "y", value: newY});
				this.editor.sidebar.updateFieldWithValue("position", "y", newY);
			break;
			case "rotate":
				var centerPosition  = transform.objectCenterPosition;
				var originPosition  = transform.mousePosition;
				var currentPosition = mousePosition;

				var defaultAngle 	= transform.objectDefaultRotation;
				var originAngle 	= Math.atan2(originPosition.getX() - centerPosition.getX(), originPosition.getY() - centerPosition.getY());
				var currentAngle 	= Math.atan2(currentPosition.getX() - centerPosition.getX(), currentPosition.getY() - centerPosition.getY());

				var diffAngle 		 = currentAngle - originAngle;
				var diffAngleDegrees = Math.round(diffAngle * 180 / Math.PI);

				if(Input.keyIsDown("ctrl")) diffAngleDegrees = MathUtils.step(diffAngleDegrees, 5);

				if(Math.round(diffAngleDegrees) == this.lastDiffAngleDegrees) return false;

				this.lastDiffAngleDegrees = diffAngleDegrees;
				var newAngle = transform.objectDefaultRotation - diffAngleDegrees;

				object.getObject().rotate(newAngle);
				this.editor.realtimeSend("changeobjectproperty", {objectname: object.getName(), property: "angle", value: newAngle});
				this.editor.sidebar.updateFieldWithValue("angle", null, newAngle);
			break;
		}
	},
	convertWithCamera: function(position, inverted){
		if(this.getGameScene().getActiveCamera() == null) return position.clone();
		if(!inverted) return position.clone().subtract(this.getGameScene().getActiveCamera().getPosition());
		else return position.clone().add(this.getGameScene().getActiveCamera().getPosition());
	}

};