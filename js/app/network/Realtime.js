/**
**
**	Files & sidebar
**	-- Realtime section
**
**/
network.on("updatefiles", function(d, req){
	if(req.isSender()) return false;
	
	App.getFilesManager().refreshFiles(function(files){
		Sidebar.restoreDom();
	});
});

/**
**
**	Sprite editor
**	-- Realtime section
**
**/
network.on("spriteeditor", function(d, req){
	if(req.isSender()) return false;
	if(!App.getRouter().hasSameView(d.type, d.file)) return false;
	var ce = currentEditor;

	if(ce == null) return false;

	if(d.submethod == "initressource"){
		ce.initRessource(d.srcpath, d.srcname);
		ce.importerLoader = ce.startLoader();
	}else if(d.submethod == "addanimation"){
		ce.ressource.setAnimation(d.animname, 0, 0, 1);
		ce.refreshAnimations();
	}else if(d.submethod == "removeanimation"){
		ce.deleteAnimation(d.animname, null);
	}else if(d.submethod == "changeanimname"){
		ce.updateAnimationFromRealtime(d.animname, "name", d.newname);
	}else if(d.submethod == "changeanimframebegin"){
		ce.updateAnimationFromRealtime(d.animname, "begin", d.frame);
	}else if(d.submethod == "changeanimframefinish"){
		ce.updateAnimationFromRealtime(d.animname, "finish", d.frame);
	}else if(d.submethod == "changeanimspeed"){
		ce.updateAnimationFromRealtime(d.animname, "speed", d.speed);
	}else if(d.submethod == "imageoptions"){
		var srcsize = ce.ressource.getSize();

		d.gsw = parseInt(d.gsw);
		d.gsh = parseInt(d.gsh);

		if(document.getElementById("gridSizeWidth") != null)
			document.getElementById("gridSizeWidth").value = d.gsw;
		if(document.getElementById("gridSizeHeight") != null)
			document.getElementById("gridSizeHeight").value = d.gsh;

		ce.ressource.cellSize = {w: Math.round(srcsize.w / d.gsw), h: Math.round(srcsize.h / d.gsh)};

		ce.reloadOverlay();
		ce.refreshImageOptionsDialogCanvas(true, true);
	}
});

/**
**
**	Tilemap editor
**	-- Realtime section
**
**/
network.on("tilemapeditor", function(d, req){
	if(req.isSender()) return false;
	if(!App.getRouter().hasSameView(d.type, d.file)) return false;
	var ce = currentEditor;

	if(ce == null) return false;

	switch(d.submethod){
		case "initressource":
			ce.initRessource(d.srcpath, d.srcname);
			ce.workspace.importerLoader = ce.workspace.startLoader();
		break;
		case "changeselectionsize":
			document.getElementById("cell_image_width").value = parseInt(d.sizew);
			document.getElementById("cell_image_height").value = parseInt(d.sizeh);

			ce.ressource.cellSize = {w: Math.round(ce.ressource.size.w / parseInt(d.sizew)), h: Math.round(ce.ressource.size.h / parseInt(d.sizeh))};

			if(ce.workspace.paramBoxOpened){
				ce.workspace.paramBoxOpened = false;
				Game.paused = false;
				document.querySelector(".param-box").hide();
				document.getElementById("ressourceImporter").hide();
				
				ce.workspace.updateOutOfBoundsTiles();
				ce.loaded = true;
			}
		break;
		case "changemapsize":
			document.getElementById("map_cell_width").value = parseInt(d.sizew);
			document.getElementById("map_cell_height").value = parseInt(d.sizeh);

			ce.workspace.changeMapOverlay(parseInt(d.sizew), parseInt(d.sizeh));

			if(ce.workspace.paramBoxOpened){
				ce.workspace.paramBoxOpened = false;
				Game.paused = false;
				document.querySelector(".param-box").hide();
				document.getElementById("ressourceImporter").hide();
				
				ce.workspace.updateOutOfBoundsTiles();
				ce.loaded = true;
			}
		break;
		case "changetilesolidity":
			var tile    = ce.workspace.getTileAt(parseInt(d.posx), parseInt(d.posy), parseInt(d.layer));
			var bool    = d.value;

			if(tile == null) return false;
			tile.solid = bool;
		break;
		case "replacetile":
			var tile    = ce.workspace.getTileAt(parseInt(d.posx), parseInt(d.posy), parseInt(d.layer));
			if(tile == null) return false;

			tile.changeTextureTo(parseInt(d.texturex), parseInt(d.texturey));
		break;
		case "newtile":
			var lastLayer = ce.workspace.layer;
			ce.workspace.layer = parseInt(d.layer);

			ce.workspace.addTileAt(parseInt(d.posx), parseInt(d.posy), parseInt(d.texturex), parseInt(d.texturey), false);
			ce.workspace.changeLayerTo(lastLayer);
		break;
		case "removetile":
			ce.workspace.removeTileAt(parseInt(d.posx), parseInt(d.posy), parseInt(d.layer));
		break;
	}
});

/**
**
**	Scene editor
**	-- Realtime section
**
**/
network.on("sceneeditor", function(d, req){
	if(req.isSender()) return false;
	if(!App.getRouter().hasSameView(d.type, d.file)) return false;
	var ce = currentEditor;

	if(ce == null) return false;

	switch(d.submethod){
		case "depositobject":
			ce.sidebar.deposeObject(d.ctype, d.name, parseFloat(d.posx), parseFloat(d.posy), true);
		break;
		case "renameobject":
			var object = ce.workspace.getObjectByName(d.oname);
			if(!object) return false;

			ce.sidebar.renameObject(object, d.newname, true);
		break;
		case "removeobject":
			ce.sidebar.removeObject(d.name, true);
		break;
		case "changeobjectproperty":
			var ws = ce.workspace;
			var object = ws.getObjectByName(d.oname);

			if(d.behaviorname != undefined){
				var component = ce.dictionary.getComponentByType(object.getType(), d.behaviorname);
				
				if(component != null && object.getSpecialComponents().indexOf(component) === -1){
					object.addSpecialComponent(component);
					if(ws.getCurrentObject() == object) 
						ce.sidebar.reloadPropertiesOf(object);
				}
			}

			if(d.subproperty !== undefined){
				ws.updateObjectSubProperty(object, d.property, d.subproperty, d.value);

				if(ws.getCurrentObject() != null && ws.getCurrentObject().getName() == d.oname)
					ce.sidebar.updateFieldWithValue(d.property, d.subproperty, d.value);
			}else{
				ws.updateObjectProperty(object, d.property, d.value);

				if(ws.getCurrentObject() != null && ws.getCurrentObject().getName() == d.oname)
					ce.sidebar.updateFieldWithValue(d.property, null, d.value);
			}
		break;
		case "removeobjectbehavior":
			var ws = ce.workspace;

			var object   = ws.getObjectByName(d.oname);
			var behavior = d.behaviorname;

			object.getSpecialComponents().forEach(function(specialComponent){
				if(specialComponent.getName() == behavior)
					object.specialComponents.splice(object.specialComponents.indexOf(specialComponent), 1);
			});
			object.removeBehaviorProperty(behavior);

			if(object == ws.getCurrentObject())
				ce.sidebar.reloadPropertiesOf(object);
		break;
	}
});

/**
**
**	VisualScript editor
**	-- Realtime section
**
**/
network.on("vseditor", function(d, req){
	if(req.isSender()) return false;
	if(!App.getRouter().hasSameView(d.type, d.file)) return false;
	var ce = currentEditor;

	if(ce == null) return false;

	if(d.submethod == "createmodule"){
		var mod = ce.createModuleAt(d.x, d.y, ModuleType[d.moduleType], null);
		mod.setSubType(ModuleSubType[d.moduleSubtype]);
		mod.id = d.moduleId;

		if(ce.modules.indexOf(mod) == -1)
			ce.modules.push(mod);
	}else if(d.submethod == "movemodule"){
		var mod = ce.getModuleById(d.moduleId);
		if(mod == null) return false;

		mod.getPosition().set(parseFloat(d.newx), parseFloat(d.newy));
	}else if(d.submethod == "duplicatemodule"){
		var mod = ce.getModuleById(d.moduleId);
		if(mod == null) return false;

		var newModule = ce.duplicateModule(mod);
		newModule.applyIdentity(LZString.decompressFromBase64(d.identity));
	}else if(d.submethod == "updatemoduledata"){
		var mod = ce.getModuleById(d.moduleId);
		if(mod == null) return false;
		
		mod.registeredDatas[d.datakey] = LZString.decompress(d.datavalue);
		mod.reloadText();

		if(mod.partOf != null) mod.partOf.update();
	}else if(d.submethod == "deletemodule"){
		var mod = ce.getModuleById(d.moduleId);
		if(mod == null) return false;
		
		ce.removeModule(mod);
	}

	else if(d.submethod == "moduleaddpart"){
		var mod   = ce.getModuleById(d.moduleId);
		var modTo = ce.getModuleById(d.toModuleId);
		if(mod == null || modTo == null) return false;
		
		modTo.addPart(mod, parseInt(d.partIndex));
	}else if(d.submethod == "moduleaddchild"){
		var mod   = ce.getModuleById(d.moduleId);
		var modTo = ce.getModuleById(d.toModuleId);
		if(mod == null || modTo == null) return false;
		
		modTo.addChild(mod);

		if(modTo.parent != null) modTo.parent.update();
		if(modTo != null) modTo.update();
	}else if(d.submethod == "modulermpart"){
		var mod   = ce.getModuleById(d.moduleId);
		var modTo = ce.getModuleById(d.toModuleId);
		if(mod == null || modTo == null) return false;
		
		modTo.removePart(mod);
	}else if(d.submethod == "modulermchild"){
		var mod   = ce.getModuleById(d.moduleId);
		var modTo = ce.getModuleById(d.toModuleId);
		if(mod == null || modTo == null) return false;
		
		modTo.removeChild(mod);

		if(modTo.parent != null) modTo.parent.update();
		if(modTo != null) modTo.update();
	}
});

/**
**
**	Script editor
**	-- Realtime section
**
**/
network.on("scripteditor", function(d, req){
	if(req.isSender() || App.getRouter() == null) return false;
	if(!App.getRouter().hasSameView(d.type, d.file)){

		if(d.submethod == "draft"){
			var div = App.getFilesManager().getDomFile("script", d.file);
			if(div == null) return false;

			if(d.value){
				var draftBox = document.createElement("span");
				draftBox.className = "draft-box";
				draftBox.innerHTML = "Brouillon";

				if(div.querySelector(".draft-box") == null)
					div.appendChild(draftBox);

				// Update current tab
				var tab = Tabs.getTab(d.file, "script");
				if(tab != null) tab.dom.classList.add("draft");
			}else{
				// Update current tab
				var tab = Tabs.getTab(d.file, "script");
				if(tab != null) tab.dom.classList.remove("draft");

				var draftBox = div.querySelector(".draft-box");
				if(draftBox != undefined) div.removeChild(draftBox);
			}
		}

		return false;
	}

	var ce = currentEditor;

	if(ce == null) return false;

	if(d.submethod == "change"){
		var text    = LZString.decompress(d.text);
		var fromPos = JSON.parse(LZString.decompress(d.from)); 
		var toPos   = JSON.parse(LZString.decompress(d.to));
		var origin  = LZString.decompress(d.origin);

		if(text != null && (origin == "+input" || origin == "paste" || origin == "cut" || origin == "+delete" || origin == "undo" || origin == "redo"))
			ce.codemirror.replaceRange(text, fromPos, toPos);
	}else if(d.submethod == "draft"){
		ce.setDraftMode(d.value, true);
	}
});


/**
**
**	Config editor
**	-- Realtime section
**
**/
network.on("configeditor", function(d, req){
	if(req.isSender()) return false;
	if(!App.getRouter().hasSameView(d.type, d.file)) return false;
	var ce = currentEditor;

	if(ce == null) return false;

	if(d.submethod == "updategamesize"){
		ce.updateRatio(parseFloat(d.sizew), parseFloat(d.sizeh));
	}else if(d.submethod == "updatefpsdynamic"){
		ce.updateFpsDynamic(d.dynamicfps);
	}else if(d.submethod == "updatefps"){
		ce.updateFps(d.fps);
	}else if(d.submethod == "updatedevmode"){
		ce.updateDevMode(d.devmode);
	}else if(d.submethod == "updatedefaultscene"){
		ce.updateDefaultScene(d.defaultscene);
	}
});