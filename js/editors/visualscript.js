require("editors/visualscript/Grid");
require("editors/visualscript/Module");
require("editors/visualscript/Importer");
requires();

function VisualScriptEditor(Editor){
	this.editor   = Editor;
	this.importer = new VisualScriptImporter(this); 

	this.workspace = document.getElementById("workspace");

	this.grid    = null;
	this.modules = [];

	this.keyChoice = null;

	this.debug   = false;
	this.renders = 0;
	this.lastCursorPosition = new Position();
}

VisualScriptEditor.prototype = {

	init: function(){
		var self = this;
		var dc   = document.getElementById("editor-container");
		var vs   = document.getElementById("workspace");

		css("editors/visualscript");

		vs.setStyle("width", dc.offsetWidth + "px");
		vs.setStyle("height", dc.offsetHeight + "px");

		this.grid = new VisualScriptGrid(self);

		App.getFilesManager().onFilesLoaded(function(){
			self.importer.init();

			self.loadKeyChoiceModule();
			self.loadRightMenuModule();
		});
	},
	load: function(){
		var that = this;

		this.workspace = document.getElementById("workspace");

		this.importer.dom = document.querySelector(".vs-sidebar");
		this.importer.loadCategories();

		this.editor.game.getEventsManager().on("gameRendered", function(){
			that.grid.update();
			that.grid.render();

			for(var i = 0; i < that.modules.length; i++)
				that.modules[i].render();
		});

		window.addEventListener("resize", this.onResize);

		if(this.debug){
			setInterval(function(){
				var n = 0;

				for(var i = 0; i < that.modules.length; i++){
					n += that.modules[i].renders;
					that.modules[i].renders = 0;
				}

				console.log("Render per second:", n);
				that.renders = 0;
			}, 1000);
		}

		this.loadMoveSystem();
		this.loadCameraSystem();

		// Game already loaded before
		if(this.editor.game.loader.percent == 100){
			var mods = this.workspace.querySelectorAll(".module");

			var reloadModuleDom = function(mod){
				for(var i = 0; i < mods.length; i++){
					if(mods[i].dataset.id == mod.id) mod.domElement = mods[i];
				}

				for(var i = 0; i < mod.childs.length; i++){
					reloadModuleDom(mod.childs[i]);
				}
				for(var i = 0; i < mod.parts.length; i++){
					reloadModuleDom(mod.parts[i]);
				}
			}

			for(var i = 0; i < this.modules.length; i++){
				reloadModuleDom(this.modules[i]);
			}
		}

		setTimeout(function(){that.reloadAll();}, 300);
	},
	loadFromData: function(data){
		var self = this;
		if(!data) return false;

		var us = this.unserialize(data);
		var pushModule = function(module){
			self.modules.push(module);

			if(module.partOf != null) module.domElement.classList.add("part-of");

			for(var i = 0; i < module.childs.length; i++)
				pushModule(module.childs[i]);
			for(var i = 0; i < module.parts.length; i++)
				pushModule(module.parts[i]);

			module.update();
		}

		for(var i = 0; i < us.length; i++){
			pushModule(us[i]);
		}
	},
	unload: function(){
		window.removeEventListener("resize", this.onResize);
	},
	loadMoveSystem: function(){
		var that = this;

		Input.mouseDown("left", function(e){
			if(Utils.getParentRecursively(e.target, "#workspace") == null) return true;
			if(Utils.getParentRecursively(e.target, ".vs-sidebar") != null) return true;

			var mDom = Utils.getParentRecursively(e.target, ".module");
			if(mDom == null || e.target.tagName == "SELECT" || e.target.tagName == "INPUT" 
				|| e.target.className == "select-key" || e.target.className == "line") return false;

			var x = e.clientX - document.getElementById("sidebar").offsetWidth, 
				y = e.clientY - document.getElementById("header").offsetHeight;

			var m = that.getModuleAt(x, y, null, true);
			if(m == null) return false;

			var partTop = function(module, currentIndex){
				module.domElement.setStyle("z-index", currentIndex);

				for(var i = 0; i < module.parts.length; i++){
					var p = module.parts[i];
					partTop(p, currentIndex + 1);
				}
			}
			partTop(m, 50);

			that.lastSelectedModule = m;
		}, true);
		Input.mouseUp("left", function(e){
			if(Utils.getParentRecursively(e.target, "#workspace") == null) return true;
			if(Utils.getParentRecursively(e.target, ".vs-sidebar") != null) return true;

			if(that.lastSelectedModule != null){
				if(ModuleType.getName(that.lastSelectedModule.type) == "PART") that.checkForAssemblyPart(that.lastSelectedModule);
				else if(ModuleType.getName(that.lastSelectedModule.type) != "EVENT") that.checkForAssemblyChild(that.lastSelectedModule);
				that.checkForTrashBin(that.lastSelectedModule, false);

				// Update z-index
				var partTop = function(module, currentIndex){
					module.domElement.setStyle("z-index", currentIndex);

					for(var i = 0; i < module.parts.length; i++){
						var p = module.parts[i];
						partTop(p, currentIndex + 1);
					}
				}
				var baseModule = that.lastSelectedModule;
				var tmpModule  = baseModule;
				while(tmpModule != null){
					tmpModule = tmpModule.partOf;
					if(tmpModule != null) baseModule = tmpModule;
				}
				partTop(baseModule, 0);

				// Fix module's position if needed
				var mod = that.lastSelectedModule;
				if(mod.parent == null && mod.partOf == null) mod.fixPosition();
			}

			that.downPos = null;that.lastSelectedModule = null;
			that.duplicateMode = false;
		}, true);
		Input.mouseMove(function(e){
			if(Utils.getParentRecursively(e.target, "#workspace") == null) return true;
			if(Utils.getParentRecursively(e.target, ".vs-sidebar") != null) return true;

			var x = e.clientX - document.getElementById("sidebar").offsetWidth, 
				y = e.clientY - document.getElementById("header").offsetHeight;

			if((Input.mouseIsDown("left") || that.duplicateMode) && that.lastSelectedModule != null){
				var m = that.lastSelectedModule;
				
				if(that.downPos == null){
					that.downPos = {x: (x - m.getPosition().getX()), y: (y - m.getPosition().getY())};
					return false;
				}

				that.lastSelectedModule.getPosition().set((x - that.downPos.x) - that.grid.padding.x, y - that.downPos.y);
				that.realtimeSend("movemodule", {moduleId: m.id, newx: (x - that.downPos.x), newy: (y - that.downPos.y)});

				if(ModuleType.getName(m.type) == "PART") that.checkForAssemblyPart(m, true);
				else if(ModuleType.getName(m.type) != "EVENT") that.checkForAssemblyChild(m, true);

				that.checkForTrashBin(m, true);
			}
		});
	},
	loadCameraSystem: function(){
		var that = this;

		var bCp = null, bGp = null, lastMovePosition = null;

		Input.mouseMove(function(e){
			that.lastCursorPosition = e.getEditorPosition();

			if(!Input.mouseIsDown("right")){
				bCp = null;bGp = null;lastMovePosition = null;
				return false;
			}
			if(Utils.getParentRecursively(e.target, "#workspace") == null) return true;
			if(Utils.getParentRecursively(e.target, ".vs-sidebar") != null) return true;

			if(bCp == null) bCp = e.getEditorPosition();
			if(bGp == null) bGp = that.grid.getPosition().clone();

			if(lastMovePosition == null) lastMovePosition = e.getEditorPosition();

			var beginPosition   = bCp;
			var currentPosition = e.getEditorPosition();
			var diffPosition    = currentPosition.clone();
			diffPosition.substract(beginPosition.clone());

			that.grid.getPosition().setX(bGp.getX() + diffPosition.getX());
			that.grid.getPosition().setY(bGp.getY() + diffPosition.getY());

			lastMovePosition.substract(currentPosition);

			for(var i = 0; i < that.modules.length; i++){
				var mod = that.modules[i];
				mod.padding.x -= lastMovePosition.getX(); 
				mod.padding.y -= lastMovePosition.getY(); 

				mod.update();
			}

			lastMovePosition = currentPosition;
		});
	},
	realtimeSend: function(submethod, data){
		var o = {submethod: submethod, file: App.getCurrentFile(), type: "visualscript"};

		switch(submethod){
			case "createmodule":
				o.x = data.x;
				o.y = data.y;
				o.moduleType = data.type;
				o.moduleSubtype = data.subtype;
				o.moduleId = data.moduleId;
			break;
			case "movemodule":
				o.moduleId = data.moduleId;
				o.newx = data.newx;
				o.newy = data.newy;
			break;
			case "duplicatemodule":
				o.moduleId = data.moduleId;
				o.identity = data.identity;
			break;
			case "updatemoduledata":
				o.moduleId  = data.moduleId;
				o.datakey   = data.datakey;
				o.datavalue = LZString.compress(data.datavalue);
			break;
			case "deletemodule": o.moduleId = data.moduleId; break;

			case "moduleaddpart":
				o.toModuleId = data.toModuleId;
				o.moduleId   = data.moduleId;
				o.partIndex  = data.partIndex;
			break;
			case "moduleaddchild":
				o.toModuleId = data.toModuleId;
				o.moduleId   = data.moduleId;
			break;
			case "modulermpart":
				o.toModuleId = data.toModuleId;
				o.moduleId   = data.moduleId;
			break;
			case "modulermchild":
				o.toModuleId = data.toModuleId;
				o.moduleId   = data.moduleId;
			break;
		}

		network.request("vseditor", o, null, "realtime", "realtime").send();
	},

	createModule: function(type){
		return this.createModuleAt(0, 0, type);
	},
	createModuleAt: function(x, y, type, data){
		var mod = new VisualScriptModule(type, this);

		mod.getPosition().set(x, y);
		if(data != null) mod.setData(data);

		this.modules.push(mod);
		return mod;
	},
	getCameraPadding: function(){
		return {x: this.grid.position.getX(), y: this.grid.position.getY()};
	},
	getModuleAt: function(x, y, exc, onScreen){
		var r = null;
		for(var i = 0; i < this.modules.length; i++){
			var m = this.modules[i];
			if(!onScreen){
				if(m.isAt(x, y))
					if(exc === undefined || exc != m) r = m;
			}else{
				if(m.isAtOnScreen(x, y))
					if(exc === undefined || exc != m) r = m;
			}
		}

		return r;
	},
	getModuleAround: function(position, radius, exc){
		var r = null;
		for(var i = 0; i < this.modules.length; i++){
			var m    = this.modules[i];
			var dist = m.getCaretPosition().distanceTo(position);

			if(dist <= radius){
				if(r == null){
					if(exc === undefined || exc != m) r = m;
				}else{
					if(dist <= r.getCaretPosition().distanceTo(position))
						if(exc === undefined || exc != m) r = m;
				}
			}
		}

		return r;
	},
	getModuleById: function(id, modsArr){
		var mods = modsArr || this.modules;

		for(var i = 0; i < mods.length; i++){
			var mod = mods[i];
			if(mod.id == id) return mod;
		}

		return null;
	},
	duplicateModule: function(module){
		var mod = module.clone();

		mod.getPosition().addX(50);
		mod.getPosition().addY(50);
		mod.reloadText();

		this.modules.push(mod);

		for(var i = 0; i < mod.Cchilds.length; i++){
			mod.addChild(this.duplicateModule(mod.Cchilds[i]));
		}
		for(var i = 0; i < mod.Cparts.length; i++){
			mod.addPart(this.duplicateModule(mod.Cparts[i]));
		}

		delete mod.Cchilds;delete mod.Cparts;

		return mod;
	},
	removeModule: function(module){
		if(this.modules.indexOf(module) === -1) return false;

		module.delete();
	},



	checkForAssemblyPart: function(module, hover){
		var x        = module.getPosition().getX(), y = module.getPosition().getY();
		var toModule = null;

		// Check for module here
		var moduleRect    = new Rectangle(module.getPosition().getX(), module.getPosition().getY(), module.getSize().w, module.getSize().h); 
		var maxModuleRank = 0;

		for(var i = 0; i < this.modules.length; i++){
			var modC     = this.modules[i];

			if(modC.id == module.id || module.hasPart(modC)) continue;
			if(modC.domElement.querySelectorAll(".part-placeholder").length == 0) continue;

			var modCRect = new Rectangle(modC.getPosition().getX(), modC.getPosition().getY(), modC.getSize().w, modC.getSize().h); 

			if(moduleRect.overlap(modCRect)){
				var rank = modC.getHierarchyRank()
				if(maxModuleRank > rank) continue;

				toModule      = modC;
				maxModuleRank = rank;
				continue;
			}
		}

		if(toModule == null){
			if(this.lastDomPh != null) this.lastDomPh.classList.remove("active");
			if(module.partOf != null){
				this.realtimeSend("modulermpart", {toModuleId: module.partOf.id, moduleId: module.id});
				module.partOf.removePart(module);
			}
			return false;
		}

		// Check for placeholders parts
		var el    = toModule.domElement;
		var parts = el.querySelectorAll(".part-placeholder");
		var domPh = null;
		var phIndex = -1;

		for(var i = 0; i < parts.length; i++){
			var p     = parts[i];
			var pRect = new Rectangle(p.offsetLeft + toModule.getPosition().getX(), p.offsetTop + toModule.getPosition().getY(), p.offsetWidth, p.offsetHeight);

			phIndex = i;

			if(moduleRect.overlap(pRect)){
				domPh = p;
				break;
			}
		}

		if(domPh == null){
			if(this.lastDomPh != null) this.lastDomPh.classList.remove("active");

			if(module.partOf != null) toModule.removePart(module);
			this.realtimeSend("modulermpart", {toModuleId: toModule.id, moduleId: module.id});
			module.update();

			return false;
		}

		if(hover){
			App.getSoundsManager().putdown.play();
			domPh.classList.add("active");
		}else{
			// Depose part inside "toModule" module
			if(this.lastDomPh != null) this.lastDomPh.classList.remove("active");
			this.lastDomPh = null;

			if(module.partOf == null && domPh.dataset.lastInner == null){
				toModule.addPart(module, phIndex);

				App.getSoundsManager().knuckle.play();
				this.realtimeSend("moduleaddpart", {toModuleId: toModule.id, moduleId: module.id, partIndex: phIndex});
			}else{
				module.update();
			}

			return false;
		}

		this.lastDomPh = domPh;
	},
	checkForAssemblyChild: function(module, hover){
		var x        = module.getPosition().getX(), y = module.getPosition().getY();
		var toModule = null;

		// Check for module here
		var moduleRect    = new Rectangle(module.getPosition().getX(), module.getPosition().getY(), module.getSize().w, module.getSize().h); 
		var maxModuleRank = 0;

		for(var i = 0; i < this.modules.length; i++){
			var modC = this.modules[i];

			if(modC.id == module.id) continue;
			if(modC.is(ModuleType.PART)) continue;
			if(modC.after() != null && !modC.is(ModuleType.LOGIC)) continue;
			if(module.parent != null && module.parent == modC) continue;

			var caretPos  = modC.getCaretPosition();
			var caretRect = new Rectangle(caretPos.getX(), caretPos.getY() + 5, 40, 20); // Caret size = (20, 10)

			if(moduleRect.overlap(caretRect)){
				var rank = modC.getHierarchyRank()
				if(maxModuleRank > rank) continue;

				toModule = modC;
				maxModuleRank = rank;
				continue;
			}
		}

		if(module.parent != null || (toModule == module.parent && !hover)){
			if(this.lastToModule != null){
				this.lastToModule.domElement.classList.remove("module-selected");
				this.lastToModule.domElement.classList.remove("module-sub-selected");
			}
			if(module.parent != null){
				this.realtimeSend("modulermchild", {toModuleId: module.parent.id, moduleId: module.id});
				module.parent.removeChild(module);
			}
			return false;
		}

		if(toModule == null || toModule.type == ModuleType.PART){
			if(this.lastToModule != null){
				this.lastToModule.domElement.classList.remove("module-selected");
				this.lastToModule.domElement.classList.remove("module-sub-selected");
			}
			if(module.parent != null){
				this.realtimeSend("modulermchild", {toModuleId: module.parent.id, moduleId: module.id});
				module.parent.removeChild(module);
			}
			return false;
		}

		var moduleToPerf = toModule;
		var endWhile     = false;
		if(moduleToPerf.parent != null && toModule.type != ModuleType.LOGIC){
			while(moduleToPerf.parent != null && !endWhile){
				moduleToPerf = moduleToPerf.parent;
				if(moduleToPerf.type == ModuleType.LOGIC) endWhile = true;
			}
		}

		// Update all parents
		var mtpp     = toModule;
		var lastMtpp = null;
		var i    = 0;
		while(mtpp != null && i < 20){
			mtpp = mtpp.parent;
			if(mtpp != null){
				mtpp.update();	
				lastMtpp = mtpp;
			}

			i++;
		}

		var subSelect = false;
		if(toModule.type == ModuleType.LOGIC){
			var subPos   = new Position(toModule.getPosition().getX() + 21, toModule.getPosition().getY() + toModule.getRenderHeight() + 2);
			var innerPos = new Position(toModule.getPosition().getX() + 21, toModule.getPosition().getY() + toModule.getSize().h + 2);

			var dist1 = module.getPosition().distanceTo(subPos);
			var dist2 = module.getPosition().distanceTo(innerPos);

			if(dist1 < dist2) subSelect = true;
		}

		if(toModule.childs.length > 0 && !subSelect) return false;
		if(toModule.type == ModuleType.ACTION && toModule.parent == null) return false;
		if(toModule.parent != null){
			if(toModule.type == ModuleType.LOGIC){
				if(toModule.parent.childs.indexOf(toModule) != toModule.parent.childs.length - 1 && subSelect) return false;
			}else{
				if(toModule.parent.childs.indexOf(toModule) != toModule.parent.childs.length - 1) return false;
			}
		}

		// ---- Special cases ----
		// If / ElseIf + Else
		if(module.type == ModuleType.LOGIC && module.subtype == ModuleSubType.ELSE){
			var pme = toModule.parent;
			if(pme != null && pme.childs.length > 0){
				var lastChild = pme.childs[pme.childs.length - 1];
				if((lastChild.type != ModuleType.LOGIC || 
					(lastChild.subtype != ModuleSubType.IF && lastChild.subtype != ModuleSubType.ELSEIF)) || !subSelect)
					return false;
			}else{
				return false;
			}
		}
		// If + ElseIf
		if(module.type == ModuleType.LOGIC && module.subtype == ModuleSubType.ELSEIF){
			var pme = toModule.parent;
			if(pme != null && pme.childs.length > 0){
				var lastChild = pme.childs[pme.childs.length - 1];
				if((lastChild.type != ModuleType.LOGIC || 
					(lastChild.subtype != ModuleSubType.IF && lastChild.subtype != ModuleSubType.ELSEIF)) || !subSelect)
					return false;
			}else{
				return false;
			}
		}


		if(subSelect) hoverClass = "module-sub-selected";
		else hoverClass = "module-selected";

		if(subSelect && toModule.parent != null) moduleToPerf = toModule.parent;

		if(hover){
			App.getSoundsManager().putdown.play();
			toModule.domElement.classList.add(hoverClass);
		}else{
			toModule.domElement.classList.remove("module-sub-selected");
			toModule.domElement.classList.remove("module-selected");

			moduleToPerf.addChild(module);
			if(moduleToPerf.parent != null) moduleToPerf.parent.update();
			if(lastMtpp != null) lastMtpp.update();

			App.getSoundsManager().knuckle.play();

			this.realtimeSend("moduleaddchild", {toModuleId: moduleToPerf.id, moduleId: module.id});
			return false;
		}


		this.lastToModule = toModule;
	},
	checkForTrashBin: function(module, hover){
		var trash      = document.querySelector(".vs-workspace .vs-trashbin");
		var trashRect  = new Rectangle(trash.offsetLeft, trash.offsetTop, trash.offsetWidth, trash.offsetHeight);
		var moduleRect = new Rectangle(module.getRenderPosition().getX(), module.getRenderPosition().getY(), module.getSize().w, module.getSize().h); 

		var onTrash = moduleRect.overlap(trashRect);

		if(onTrash && hover) {
			trash.classList.add("active");
		}else{
			trash.classList.remove("active");
		}

		if(onTrash && !hover){
			this.realtimeSend("deletemodule", {moduleId: module.id});
			App.getSoundsManager().trashbin.play();

			this.removeModule(module);
		}
	},

	refreshUnusedElements: function(){
		var modules = this.workspace.querySelectorAll(".module");

		for(var i = 0; i < modules.length; i++){
			var module = modules[i];
			var id     = module.dataset.id;

			if(module.parentNode != null && module.parentNode.className == "section-sub") continue;

			if(id == null || this.getModuleById(id) == null){
				module.remove();
			}
		}
	},
	reloadAll: function(){
		this.modules.promiseForEach(function(module){
			module.update();
		});
	},


	loadKeyChoiceModule: function(){
		var that = this;
		window.addEventListener("keydown", function(e){
			if(that.keyChoice != null){
				e.preventDefault();

				var kc      = that.keyChoice;
				var keyName = Utils.keyCodeToName(e.keyCode);

				kc.innerHTML   = keyName.ucfirst();
				kc.dataset.key = e.keyCode;

				kc.module.registeredDatas["key"] = e.keyCode;

				if(kc.module.partOf != null) kc.module.partOf.update();


				that.realtimeSend("updatemoduledata", {moduleId: kc.module.id, datakey: "key", datavalue: e.keyCode + ""});
				
				that.keyChoice = null;

				return false;
			}
		});
	},
	loadRightMenuModule: function(){
		var that              = this;
		var contextmenu       = document.querySelector(".vs-contextmenu");
		var contextMenuOpened = false;
		var currentMenuModule = null;

		window.addEventListener("contextmenu", function(e){
			if(Utils.getParentRecursively(e.target, "#workspace") != null 
			&& Utils.getParentRecursively(e.target, ".vs-sidebar") == null){
				e.preventDefault();
				var pos = e.getEditorPosition();
				var mod = that.getModuleAt(pos.getX(), pos.getY());

				if(mod == null) return false;

				contextmenu.setStyle("left", pos.getX() + "px");
				contextmenu.setStyle("top",  pos.getY() + "px");
				contextmenu.show();

				contextMenuOpened = true;
				currentMenuModule = mod;

				return false;
			}
		});

		window.addEventListener("mousedown", function(e){
			if(contextMenuOpened && currentMenuModule != null){
				if(Utils.getParentRecursively(e.target, ".vs-contextmenu") != null){
					var line = Utils.getParentRecursively(e.target, ".line");
					var mod  = currentMenuModule;
					var pos  = e.getEditorPosition();

					if(line != null){
						switch(line.dataset.action){
							case "duplicate":
								var duplicatedModule = that.duplicateModule(mod);
								that.realtimeSend("duplicatemodule", {moduleId: mod.id, identity: LZString.compressToBase64(duplicatedModule.getIdentity())});
							break;
							case "remove":
								that.removeModule(mod);
								that.realtimeSend("deletemodule", {moduleId: mod.id});
							break;
						}
					}
				}

				contextmenu.hide();
			}
		});
	},

	renderDebug: function(){
		var ctx = this.grid.ctx;
		ctx.fillStyle = "#383838";
		ctx.font = "14px Helvetica";

		var mouseX = -this.getCameraPadding().x + this.lastCursorPosition.getX();
		var mouseY = -this.getCameraPadding().y + this.lastCursorPosition.getY();

		ctx.fillText("X: " + mouseX + " / Y: " + mouseY, 10, ctx.canvas.height - 10);
	},
	onResize: function(){
		if(this.workspace == null) return false;
		var editorContainer = this.workspace.parentNode;

		this.workspace.setStyle("width", editorContainer.offsetWidth + "px");
		this.workspace.setStyle("height", editorContainer.offsetHeight + "px");
	},


	serialize: function(){
		var r = []; 

		var parseModule = function(module){
			var o = {
				id: module.id,
				position: {x: module.getPosition().getX(), y: module.getPosition().getY()},
				type: ModuleType.getName(module.type),
				subtype: ModuleSubType.getName(module.subtype),
				data: module.registeredDatas,
				childs: [],
				parts: [],
				index: module.index
			};

			for(var i = 0; i < module.childs.length; i++){
				o.childs.push(parseModule(module.childs[i]));
			}
			for(var i = 0; i < module.parts.length; i++){
				o.parts.push(parseModule(module.parts[i]));
			}
			if(module.childs.length == 0) delete o.childs;
			if(module.parts.length == 0) delete o.parts;
			if(Object.keys(module.registeredDatas).length == 0) delete o.data;
			if(module.index == -1 || module.index == undefined) delete o.index; 

			return o;
		};

		for(var i = 0; i < this.modules.length; i++){
			var mod = this.modules[i];
			if(mod.parent != null || mod.partOf != null) continue;

			r.push(parseModule(mod));
		}

		return r;
	},
	unserialize: function(json){
		var that = this;
		var o    = JSON.parse(json);
		var r    = [];

		var parseModule = function(moduleObject){
			var id      = moduleObject.id;
			var type    = moduleObject.type;
			var subtype = moduleObject.subtype;
			var x       = moduleObject.position.x, 
				y 		= moduleObject.position.y;
			var data    = moduleObject.data;
			var childs  = moduleObject.childs;
			var parts   = moduleObject.parts;
			var index   = moduleObject.index;

			var mod = new VisualScriptModule(ModuleType[type], that);
			mod.id = id;

			if(index != null) mod.setIndex(index);

			mod.getPosition().set(x, y);
			// mod.renderActivated = false;

			if(subtype != null) mod.setSubType(ModuleSubType[subtype]);
			if(data != null) mod.registeredDatas = data;

			mod.reloadText();

			if(childs != null){
				for(var i = 0; i < childs.length; i++){
					mod.addChild(parseModule(childs[i]));
				}
			}
			if(parts != null){
				for(var i = 0; i < parts.length; i++){
					var pmod = parseModule(parts[i]);
					mod.addPart(pmod, pmod.index);
				}
			}


			return mod;
		};

		for(var i = 0; i < o.length; i++){
			r.push(parseModule(o[i]));
		}

		return r;
	}


};

var visualScriptEditor = null;
Views.onPageLoaded(function(e){
	if(e.name == "visualScript"){
		visualScriptEditor = new VisualScriptEditor(clone_object(window.Editor));
		visualScriptEditor.load();

		setAction("Editeur de script visuel chargé.");
	}

	App.resize();
});