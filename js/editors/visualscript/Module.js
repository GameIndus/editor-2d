function VisualScriptModule(type, editor){
	this.editor    = editor;
	this.container = (editor != null) ? editor.workspace : document.getElementById("workspace"); 

	this.id       = guid();
	this.index    = -1;
	this.type     = type;
	this.subtype  = null;
	this.data     = [];
	this.position = new Position();

	this.size        = {w: 180, h: 40};
	this.defaultSize = {w: 180, h: 40};

	// Don't touch this
	this.lastPosition = null;
	this.domElement   = null;

	this.subBarBottomY   = -1;
	this.registeredDatas = {};

	this.parent              = null;
	this.partOf              = null;
	this.lastElementInParent = false;

	this.childs = [];
	this.parts  = [];

	this.lastRenderTime  = -1;
	this.renders         = 0;
	this.renderActivated = true;
	this.padding         = {x: 0, y: 0};
}

VisualScriptModule.prototype = {

	/**
	**	Main functions
	**/
	addChild: function(submodule){
		if(submodule == this) return false;
		submodule.parent = this;
		this.childs.push(submodule);

		// Set the last child variable
		if(this.childs.length > 1){
			this.childs[this.childs.length - 2].lastElementInParent = false;
			this.childs[this.childs.length - 2].update();
		}
		submodule.lastElementInParent = true;
		submodule.update();

		this.update();
	},
	removeChild: function(submodule){
		if(this.childs.indexOf(submodule) === -1) return false;

		submodule.parent = null;
		this.childs.splice(this.childs.indexOf(submodule), 1);

		// Redefine the last child variable
		if(this.childs.length >= 1){
			this.childs[this.childs.length - 1].lastElementInParent = true;
			this.childs[this.childs.length - 1].update();
		}
		submodule.lastElementInParent = false;
		submodule.update();

		this.update();
	},
	getAllChilds: function(){
		var r = new Array();
		
		function addChildsOf(module){
			for(var i = 0; i < module.childs.length; i++){
				var child = module.childs[i];
				r.push(child);
				addChildsOf(child);
			}
		}
		addChildsOf(this);

		return r;
	},
	hasChild: function(module){
		return (this.getAllChilds().indexOf(module) > -1);
	},
	after: function(){
		if(this.parent == null) return null;
		var index = this.parent.childs.indexOf(this);
		if(index == -1) return null;

		return this.parent.childs[++index];
	},

	addPart: function(partmodule, index){
		this.parts.push(partmodule);
		partmodule.partOf = this;

		if(index != null) partmodule.setIndex(index);
		else{
			partmodule.setIndex(this.parts.length - 1);
		}

		this.update();
		partmodule.update();
		partmodule.render(true, false);

		var mtc = this;
		while(mtc.partOf != null){
			mtc.partOf.update();
			mtc = mtc.partOf;
		}
	},
	removePart: function(partmodule){
		if(this.parts.indexOf(partmodule) === -1) return false;
		this.parts.splice(this.parts.indexOf(partmodule), 1);
		partmodule.partOf = null;
		partmodule.index  = -1;

		this.update();

		window.exPart = this.parts[0];

		var mtc = this;
		while(mtc.partOf != null){
			mtc.partOf.update();
			mtc = mtc.partOf;
		}
	},
	getAllParts: function(){
		var r = new Array();
		
		function addPartsOf(module){
			for(var i = 0; i < module.parts.length; i++){
				var part = module.parts[i];
				r.push(part);
				addPartsOf(part);
			}
		}
		addPartsOf(this);

		return r;
	},
	hasPart: function(module){
		return (this.getAllParts().indexOf(module) > -1);
	},

	getAllPartsChilds: function(){
		var r      = new Array();
		var childs = this.getAllChilds();

		for(var i = 0; i < childs.length; i++){
			var child = childs[i];
			var parts = child.getAllParts();
			r.push(child);

			for(var j = 0; j < parts.length; j++){
				r.push(parts[j]);
			}
		}
		
		r = r.concat(this.getAllParts());
		return r;
	},
	getHierarchyRank: function(){
		var rank = 1;

		function checkModule(module){
			if(module.parent != null){
				rank++;
				checkModule(module.parent);
			}
			if(module.partOf != null){
				rank++;
				checkModule(module.partOf);
			}
		}
		checkModule(this);

		return rank;
	},
	getIdentity: function(){
		var r  = this.id;
		var cp = this.getAllPartsChilds();

		var partIndex = 0, childIndex = 0;

		for(var i = 0; i < cp.length; i++){
			var module = cp[i];
			
			if(module.is(ModuleType.PART)){
				r += "/p" + partIndex + ":" + module.id;
				partIndex++;
			}else{
				r += "/c" + childIndex + ":" + module.id;
				childIndex++;
			}
		}

		return r;
	},

	isAt: function(x, y){
		if(x > this.getPosition().getX() && x < this.getPosition().getX() + this.getSize().w
		&& y > this.getPosition().getY() && y < this.getPosition().getY() + this.getSize().h) return true;

		return false;
	},
	isAtOnScreen: function(x, y){
		if(x > this.getRenderPosition().getX() && x < this.getRenderPosition().getX() + this.getSize().w
		&& y > this.getRenderPosition().getY() && y < this.getRenderPosition().getY() + this.getSize().h) return true;

		return false;
	},
	is: function(type){
		if(ModuleType.contains(type))
			return (this.type == type);
		else if(ModuleSubType.contains(type))
			return (this.subType == type);
		else
			return false;
	},
	parseText: function(text){
		// Replace string with data (with $)
		for(var i = 0; i < 100; i++){
			if(this.data[i] != null){
				var v = this.data[i];
				text = text.replace("$" + (i + 1), v);
			}
		}

		var tmReSceneList = text.match(/\[scenelist\]/gi);
		var tmReSrcList   = text.match(/\[ressourceslist\]/gi);
		if(tmReSceneList){
			var tfh    = tmReSceneList[0];
			var sceneo = JSON.stringify(App.getFilesManager().getFilesByType("scene"));
			text = text.replace(tfh, sceneo);
		}

		if(tmReSrcList){
			var ressources      = srcManager.getRessources();
			var ressourcesNames = new Array();

			for(var i = 0; i < Object.keys(ressources).length; i++){
				var ressource           = ressources[Object.keys(ressources)[i]];
				var ressourceWithoutExt = ressource.substring(0, ressource.lastIndexOf("."));
				var ressourceName 		= ressourceWithoutExt.substring(ressourceWithoutExt.lastIndexOf("/") + 1, ressourceWithoutExt.length);

				if(ressourcesNames.indexOf(ressourceName) === -1)
					ressourcesNames.push(ressourceName);
			}

			var tfh      = tmReSrcList[0];
			var sourceso = JSON.stringify(ressourcesNames);
			text = text.replace(tfh, sourceso);
		}

		// Replace custom divs
		var tmReInput     = text.match(/\[input\:(.*?)\]/gi);
		var tmReSelect    = text.match(/\[select\:(.*)\]/gi);
		var tmReHolder    = text.match(/\[partholder\:(.*?)\]/gi);
		var tmReIcon      = text.match(/\[icon\:(.*?)\]/gi);
		var tmReSelectKey = text.match(/\[selectkey\]/gi);

		if(tmReInput){
			for(var i = 0; i < tmReInput.length; i++){
				var tri  = tmReInput[i];
				var type = tri.substring(0, tri.length - 1).split(":")[1];

				switch(type){
					case "text":
						var val      = this.registeredDatas["input-" + i] || "";
						var valWidth = (val != "") ? Utils.measureText(val, "Open+Sans 0.9em").width + 15 : -1;

						text = text.replace(tri, '<input type="text" value="' + val + '"' + ((valWidth != -1) ? ' style="width:'+valWidth+'px"' : "") + ' data-rd="input-' + i + '">');
					break;
					case "color":
						var val = this.registeredDatas["input-" + i] || "#000000";
						text = text.replace(tri, '<input type="color" value="' + val + '" data-rd="input-' + i + '">');
					break;
				}
			}
		}
		if(tmReSelect){ // Select div
			var opts    = tmReSelect[0].substring(0, tmReSelect[0].length - 1).split(":")[1];
			var arrOpts = JSON.parse(opts);

			var rd = this.registeredDatas["select-0"];

			var optsStr = "";
			for(var i = 0; i < arrOpts.length; i++){
				var arrOpt  = arrOpts[i];
				var arrKey = arrOpt,
					arrVal = arrOpt;

				if(arrOpt.indexOf("/") > -1){
					var arrOptSplit = arrOpt.split("/");
					var arrKey = arrOptSplit[0],
						arrVal = arrOptSplit[1];
				}

				if(rd == null && i == 0) this.registeredDatas["select-0"] = arrKey;

				var selStr = (rd != null && rd == arrOpts[i]) ? " selected" : "";
				optsStr += '<option value="' + arrKey + '"' + selStr + '>' + arrVal + '</option>';
			}


			text = text.replace(tmReSelect[0], '<select data-rd="select-' + "0" + '">' + optsStr + '</select>');
		}
		if(tmReHolder){
			for(var i = 0; i < tmReHolder.length; i++){
				var tfh   = tmReHolder[i];
				var texth = tfh.substring(0, tfh.length - 1).split(":")[1];

				text = text.replace(tfh, '<div class="part-placeholder">' + texth + '</div>');
			}
		}
		if(tmReIcon){
			for(var i = 0; i < tmReIcon.length; i++){
				var tri      = tmReIcon[i];
				var iconName = tri.substring(0, tri.length - 1).split(":")[1];

				text = text.replace(tri, '<i class="fa fa-' + iconName + '"></i>');
			}
		}
		if(tmReSelectKey){
			var tfh   = tmReSelectKey[0];
			var rd = this.registeredDatas["key"];
			if(typeof rd === "string") rd = parseInt(rd);

			if(rd != null && !isNaN(rd))
				text = text.replace(tfh, '<div class="select-key">' + ((rd != null) ? Utils.keyCodeToName(rd).toUpperCase() : "Cliquez pour choisir") + '</div>');
			else
				text = text.replace(tfh, '<div class="select-key">Cliquez pour choisir</div>');
		}

		if(this.type == ModuleType.EVENT){
			if(this.subtype == ModuleSubType.INTERVAL) text = "<b>Toutes</b> " + text;
			else if(this.subtype == ModuleSubType.REPEAT || 
					this.subtype == ModuleSubType.REPEAT_INDEFINITELY || 
					this.subtype == ModuleSubType.REPEAT_UNTIL) text = "<b>Répéter</b> " + text;
			else text = "<b>Lorsque</b> " + text;
		}

		return text;
	},
	reloadText: function(){
		this.domElement.querySelector(".text-content").innerHTML = "";
		this.render(true, false);
	},
	delete: function(){
		var toRemove = this.getAllPartsChilds();

		for(var i = 0; i < toRemove.length; i++){
			var module = toRemove[i];
			if(module != null){
				this.editor.modules.splice(this.editor.modules.indexOf(module), 1);
				module.domElement.remove();
			}
		}

		if(this.partOf != null) this.partOf.removePart(this); 
		if(this.parent != null) this.parent.removeChild(this);

		this.editor.modules.splice(this.editor.modules.indexOf(this), 1);
		this.domElement.remove();
	},
	clone: function(){
		var mod = new VisualScriptModule(ModuleType[ModuleType.getName(this.type).toUpperCase()], this.editor);
		mod.setSubType(ModuleSubType[ModuleSubType.getName(this.subtype).toUpperCase()]);

		mod.size            = clone_object(this.size);
		mod.Cchilds         = clone_object(this.childs);
		mod.Cparts          = clone_object(this.parts);
		mod.data            = clone_object(this.data);
		mod.registeredDatas = clone_object(this.registeredDatas);
		mod.renderActivated = clone_object(this.renderActivated);
		mod.position        = this.position.clone();

		mod.update();
		this.update();

		return mod;
	},

	fixPosition: function(){
		var module = null;
		var tl     = this.editor.getModuleAt(this.getPosition().getX(), this.getPosition().getY()),
			tr 	   = this.editor.getModuleAt(this.getPosition().getX() + this.getSize().w, this.getPosition().getY()),
			br 	   = this.editor.getModuleAt(this.getPosition().getX() + this.getSize().w, this.getPosition().getY() + this.getRenderHeight()),
			bl 	   = this.editor.getModuleAt(this.getPosition().getX(), this.getPosition().getY() + this.getRenderHeight());

		if(tl != null) module = tl;
		else if(tr != null) module = tr;
		else if(br != null) module = br;
		else if(bl != null) module = bl;

		if(module == null) return false;

		var tc = new Position(this.getPosition().getX() + this.getSize().w / 2, this.getPosition().getY() + this.getRenderHeight() / 2);
		var mc = new Position(module.getPosition().getX() + module.getSize().w / 2, module.getPosition().getY() + module.getRenderHeight() / 2);

		var adir = (MathUtils.angle(tc.getX(), mc.getX(), tc.getY(), mc.getY()) * 180 / Math.PI) + 180;

		if(adir <= 225 && adir >= 135) // Left
				this.getPosition().setX(module.getPosition().getX() - this.getSize().w - 5);
		else if(adir <= 315 && adir >= 225) // top
				this.getPosition().setY(module.getPosition().getY() - this.getRenderHeight() - 5);
		else if(adir <= 45 || adir >= 315) // right
				this.getPosition().setX(module.getPosition().getX() + module.getSize().w + 5);
		else if(adir <= 135 || adir >= 45) // bottom
			this.getPosition().setY(module.getPosition().getY() + module.getRenderHeight() + 5);
	},
	applyIdentity: function(identity){
		var parts = identity.split("/");
		this.id = parts[0];
		parts.shift();

		var partIndex = 0, childIndex = 0;
		var cp = this.getAllPartsChilds();

		function checkFor(identity, module, prefix, index){
			var parts = identity.split("/");
			parts.shift();

			for(var i = 0; i < parts.length; i++){
				var part = parts[i];
				var key  = part.split(":")[0];
				var id   = part.split(":")[1];

				if(key == prefix + index) module.id = id;
			}
		}

		for(var i = 0; i < cp.length; i++){
			var module = cp[i];
			
			if(module.is(ModuleType.PART)){
				checkFor(identity, module, "p", partIndex);
				partIndex++;
			}else{
				checkFor(identity, module, "c", childIndex);
				childIndex++;
			}
		}
	},


	/**
	**	Setters & Getters
	**/
	getCaretPosition: function(){
		if(this.type != ModuleType.EVENT)
			return new Position(this.getPosition().getX() + 16, this.getPosition().getY() + this.getRenderHeight() - 10);
		else
			return new Position(this.getPosition().getX() + 16, this.getPosition().getY() + 16);
	},
	getPosition: function(){
		return this.position;
	},
	getCenter: function(){
		return new Position(this.getPosition().getX() + this.getSize().w / 2, this.getPosition().getY() + this.getRenderHeight() / 2);
	},
	getPart: function(index){
		for(var i = 0; i < this.parts.length; i++){
			if(this.parts[i].index == index) return this.parts[i];
		}

		return null;
	},
	getRenderHeight: function(){
		var r = this.defaultSize.h;

		for(var i = 0; i < this.childs.length; i++){
			var child = this.childs[i];
			child.getPosition().set(this.getPosition().getX() + 20, this.getPosition().getY() + r);
			child.update();

			r += child.getRenderHeight() + 1;
		}

		if(this.type == ModuleType.EVENT || this.type == ModuleType.LOGIC) r += 10;
		if(this.type == ModuleType.LOGIC) r += 10;

		return r;
	},
	getRenderPosition: function(){
		return new Position(this.position.getX() + this.padding.x, this.position.getY() + this.padding.y);
	},
	getSize: function(){
		return this.size;
	},
	setCustomText: function(cText){
		this.customText = cText;
	},
	setData: function(o){
		this.data = o;
	},
	setIndex: function(index){
		this.index = index;
	},
	setSize: function(width, height){
		this.size.w = width;
		this.size.h = height;
	},
	setSubType: function(subType){
		this.subtype = subType;

		this.update();
	},



	/**
	**	Render functions
	**/
	update: function(){
		var that          = this;
		var currentChildY = this.defaultSize.h;

		// Update childs
		this.childs.promiseForEach(function(child){
			child.getPosition().set(that.getPosition().getX() + 20, that.getPosition().getY() + currentChildY);
			if(that.type == ModuleType.LOGIC) child.getPosition().set(that.getPosition().getX() + 20, that.getPosition().getY() + currentChildY);

			child.update();
			currentChildY += child.getRenderHeight() + 1;
		});

		// Update height of module with parts' height
		var maxHeight = this.getSize().h;
		for(var i = 0; i < this.parts.length; i++)
			if(this.parts[i].getSize().h > maxHeight) maxHeight = this.parts[i].getSize().h;
		this.size.h = maxHeight;

		this.updateParts();

		this.subBarBottomY = currentChildY - this.defaultSize.h + 10 - 1 + 15;
		if(this.subBarBottomY <= 9) this.subBarBottomY = 30;
		this.render(true, (this.type == ModuleType.PART));
	},
	updateEvents: function(){
		if(this.domElement == null) return false;
		var that = this;

		var inputs     = this.domElement.querySelectorAll("input");
		var selects    = this.domElement.querySelectorAll("select");
		var keychoices = this.domElement.querySelectorAll(".select-key");

		// Selects
		for(var i = 0; i < selects.length; i++){
			var s = selects[i];

			s.onchange = function(e){
				var rd = this.dataset.rd;
				that.registeredDatas[rd] = this.value;

				that.editor.realtimeSend("updatemoduledata", {moduleId: that.id, datakey: rd, datavalue: this.value});
			}

		}

		// Inputs
		for(var j = 0; j < inputs.length; j++){
			var inp = inputs[j];
			
			inp.onkeyup = function(){
				var val        = this.value;
				var valueWidth = Utils.measureText(val, "Open+Sans 0.9em").width;

				this.setStyle("width", (valueWidth + 15) + "px");

				var rd = this.dataset.rd;
				that.registeredDatas[rd] = this.value;

				that.editor.realtimeSend("updatemoduledata", {moduleId: that.id, datakey: rd, datavalue: this.value});
				that.update();

				if(that.partOf != null) that.partOf.update();
				if(that.partOf != null && that.partOf.partOf != null) that.partOf.partOf.update();
			}
			inp.onchange = function(){
				if(this.type == "color"){
					var rd = this.dataset.rd;
					that.registeredDatas[rd] = this.value;

					that.editor.realtimeSend("updatemoduledata", {moduleId: that.id, datakey: rd, datavalue: this.value});
					that.update();

					if(that.partOf != null) that.partOf.update();
					if(that.partOf != null && that.partOf.partOf != null) that.partOf.partOf.update();
				}
			}
		}

		// Key choices
		for(var l = 0; l < keychoices.length; l++){
			var kc = keychoices[l];
			kc.onclick = function(e){
				if(that.editor.keyChoice != null){
					that.editor.keyChoice.innerHTML = that.editor.keyChoice.dataset.html;
				}
				that.editor.keyChoice = this;
				that.editor.keyChoice.module = that;

				this.dataset.html = this.innerHTML;
				this.innerHTML = "Appuyez sur une touche";

				if(that.partOf != null) that.partOf.update();
			}
		}
	},
	updateParts: function(){
		if(this.domElement == null) return false;
		var phs = this.domElement.querySelectorAll(".part-placeholder");

		var parts = this.parts;
		parts.sort(function(a, b){
		    if(a.index < b.index) return -1;
		    if(a.index > b.index) return 1;
		    return 0;
		});

		// Reset placeholders
		for(var i = 0; i < phs.length; i++){
			var part = this.getPart(i);
			if(part != null) continue;
			var ph = phs[i];

			if(ph.dataset.lastInner == null) continue;

			ph.innerHTML = ph.dataset.lastInner;
			delete ph.dataset.lastInner;

			ph.removeAttribute("style");
		}

		for(var i = 0; i < parts.length; i++){
			var p  = parts[i];
			var el = p.domElement;
			var ph = phs[p.index];

			if(ph == null) continue;

			ph.setStyle("width", el.offsetWidth + "px");
			ph.setStyle("border", "none");
			if(ph.innerHTML != "---") ph.dataset.lastInner = ph.innerHTML;
			ph.innerHTML = "---";
			ph.setStyle("font-size", "0");

			p.getPosition().set(this.getPosition().x + ph.offsetLeft, this.getPosition().y);
		}
	},

	render: function(force, onlyPos){
		// if(!this.renderActivated) return false;
		if(this.domElement != null && !force){
			if(this.lastPosition.getX() == this.position.getX() && this.lastPosition.getY() == this.position.getY()) return false;
			else this.update();
		}

		var renderDelta = Date.now() - this.lastRenderTime;
		this.lastRenderTime = Date.now();
		this.renders++;

		var moduleName = ModuleType.getName(this.type).toLowerCase();
		// console.log("render >", renderDelta);

		if(onlyPos && this.domElement != null){
			this.domElement.setStyle("left", this.getRenderPosition().getX() + "px");this.domElement.setStyle("top", this.getRenderPosition().getY() + "px");
			this.domElement.setStyle("height", this.getSize().h + "px");
			if(this.subBarBottomY > -1 && moduleName == "event") this.domElement.querySelector(".sub-bar").setStyle("bottom", "-" + (this.subBarBottomY) + "px");
			if(this.subBarBottomY > -1 && moduleName == "event") this.domElement.querySelector(".left-bar").setStyle("height", (this.subBarBottomY - 10) + "px");

			this.lastPosition = this.getPosition().clone();

			return false;
		}

		var el  = this.domElement || document.createElement("div");
		var sb  = (this.domElement != null) ? this.domElement.querySelector(".sub-bar") : document.createElement("div");
		var lb  = (this.domElement != null) ? this.domElement.querySelector(".left-bar") : document.createElement("div");
		var st  = (this.domElement != null) ? this.domElement.querySelector(".text-content") : document.createElement("span");
		var sc  = (this.domElement != null) ? this.domElement.querySelector(".sub-caret") : document.createElement("div");
		var sch = (this.domElement != null) ? this.domElement.querySelector(".sub-caret-hover") : document.createElement("div");

		el.className = "module module-" + moduleName;

		if(this.parent != null) el.classList.add("child-module");
		else el.classList.remove("child-module");
		if(this.partOf != null) el.classList.add("part-of");
		else el.classList.remove("part-of");

		if(this.lastElementInParent) el.classList.add("last-parent-module");
		else el.classList.remove("last-parent-module");

		if(sb  != null) sb.className = "sub-bar";
		if(lb  != null) lb.className = "left-bar";
		if(st  != null) st.className = "text-content";
		if(sc  != null) sc.className = "sub-caret";
		if(sch != null) sch.className = "sub-caret-hover";

		// Styles
		el.setStyle("left", this.getRenderPosition().getX() + "px");el.setStyle("top", this.getRenderPosition().getY() + "px");
		el.setStyle("height", this.getSize().h + "px");
		if(sb != null && this.subBarBottomY > -1 && (moduleName == "event" || moduleName == "logic")) sb.setStyle("bottom", "-" + (this.subBarBottomY) + "px");
		if(lb != null && this.subBarBottomY > -1 && (moduleName == "event" || moduleName == "logic")) lb.setStyle("height", (this.subBarBottomY - 10) + "px");
		if(sc != null && this.subBarBottomY > -1 && moduleName == "logic") sc.setStyle("bottom", "-" + (this.subBarBottomY + 10) + "px");
		if(sch != null && this.subBarBottomY > -1 && moduleName == "logic") sch.setStyle("bottom", "-" + (this.subBarBottomY + 10 + 4) + "px");

		if(st.innerHTML == ""){
			st.innerHTML = "*default_message*";
			if(this.subtype != null) st.innerHTML = this.parseText(this.subtype.text);
		}

		if(this.domElement != el){
			el.appendChild(st);
			if(this.subBarBottomY > -1 && (moduleName == "event" || moduleName == "logic")) el.appendChild(lb);
			if(this.subBarBottomY > -1 && (moduleName == "event" || moduleName == "logic")) el.appendChild(sb);
			if(this.subBarBottomY > -1 && moduleName == "logic") el.appendChild(sc);
			if(this.subBarBottomY > -1 && moduleName == "logic") el.appendChild(sch);
			el.dataset.id = this.id;
			this.container.appendChild(el);
		}

		// Update size
		this.setSize(el.offsetWidth, el.offsetHeight);

		this.lastPosition = this.getPosition().clone();
		this.domElement = el;

		this.updateEvents();
	}

};



var ModuleType = {
	"EVENT": "EVENT",
	"LOGIC": "LOGIC",
	"ACTION": "ACTION",
	"PART": "PART",



	getName: function(o){
		for(var i = 0; i < Object.keys(this).length; i++){
			var k = Object.keys(this)[i];
			var v = this[k];

			if(v == o) return k;
		}

		return null;
	},
	contains: function(name){
		var r = false;
		Object.keys(this).forEach(function(key){
		    var val = this[key];
		    if(typeof val !== "function"){
		    	if(key == name) r = true;
		    }
		});

		return r;
	}
};
var ModuleSubType = {
	// EVENT
	"START" : {text: "le jeu se lance"},
	"UPDATE" : {text: "le jeu se met à jour"},
	"RENDERED" : {text: "le jeu est rendu"},
	"INTERVAL" : {text: "les [partholder:Nombre] secondes"},

	"REPEAT" : {text: "[partholder:Nombre] fois"},
	"REPEAT_INDEFINITELY" : {text: "indéfiniment"},
	"REPEAT_UNTIL" : {text: "jusqu'à [partholder:Condition]"},


	"OBJECTS_COLLIDE" : {text: "l'[partholder:Objet] et l'[partholder:Objet] rentre en collision"},
	"KEY_DOWN" : {text: "le joueur presse la [partholder:Touche]"},
	"KEY_UP" : {text: "le joueur relâche la [partholder:Touche]"},
	"CLICK" : {text: "le joueur clique sur la [partholder:Souris]"},

	// LOGIC
	"IF" : {text: "<b>Si</b> [partholder:Condition] <b>faire</b>"},
	"ELSEIF" : {text: "<b>Ou si</b> [partholder:Condition] <b>alors, faire</b>"},
	"ELSE" : {text: "<b>Sinon, faire</b>"},
	"WHILE" : {text: "<b>Tant que</b> [partholder:Condition] <b>alors, faire</b>"},
	
	// ACTION
	"CREATE_GAMEOBJECT" : {text: 'Créer un objet de nom [partholder:Texte] et de taille [partholder:Taille]'},
	"MOVE_GAMEOBJECT" : {text: 'Déplacer l\'[partholder:Objet] à la [partholder:Position]'},
	"MOVE_GAMEOBJECT_LERP" : {text: 'Glissez l\'[partholder:Objet] à la [partholder:Position] avec une intensité de [partholder:Nombre]'},
	"MOVE_GAMEOBJECT_ADD" : {text: 'Déplacer l\'[partholder:Objet] en ajoutant la [partholder:Position]'},
	"ROTATE_GAMEOBJECT" : {text: 'Pivoter l\'[partholder:Objet] de [partholder:Nombre] degrés.'},
	"CHANGE_GAMEOBJECT_SIZE" : {text: 'Change la taille de l\'[partholder:Objet] en [partholder:Taille]'},
	"CHANGE_GAMEOBJECT_LAYER" : {text: 'Change le calque de l\'[partholder:Objet] en [partholder:Nombre]'},
	"CHANGE_GAMEOBJECT_OPACITY" : {text: 'Définir l\'opacité de l\'[partholder:Objet] en [partholder:Nombre]'},
	"CHANGE_GAMEOBJECT_ANIM" : {text: 'Définir l\'animation de l\'[partholder:Objet] en [partholder:Animation]'},
	"CHANGE_GAMEOBJECT_COLOR" : {text: 'Définir la couleur de l\'[partholder:Objet] en [partholder:Couleur]'},
	"CHANGE_GAMEOBJECT_TEXTURE" : {text: 'Définir la texture de l\'[partholder:Objet] en [partholder:Texture]'},

	"ALERT" : {text: 'Alerter [partholder:Valeur]'},
	"LOG" : {text: 'Afficher [partholder:Valeur] dans la console'},
	"CHANGE_SCENE" : {text: 'Activer la [partholder:Scène]'},
	"REMOVE_GAMEOBJECT" : {text: 'Supprimer l\'[partholder:Objet]'},

	"APPLY_VALUE_VARIABLE" : {text: 'Attribuer [partholder:Valeur] à [partholder:Variable]'},
	"WAIT" : {text: 'Attendre [partholder:Nombre] secondes'},

	// PART
	"KEY": {text: 'touche: [selectkey]'},
	"GAMEOBJECT" : {text: "Objet de jeu [input:text]"},
	"SCENE" : {text: "scène: [select:[scenelist]]"},
	"MOUSE" : {text: 'souris: [select:["left/Gauche","middle/Molette","right/Droite"]]'},
	"POSITION" : {text: 'position: ([input:text], [input:text])'},
	"ANIMATION" : {text: 'animation: [input:text]'},
	"SIZE" : {text: 'taille: ([input:text], [input:text])'},
	"INTEGER" : {text: 'nombre: [input:text]'},
	"STRING" : {text: 'texte: [input:text]'},
	"COLOR" : {text: 'couleur: [input:color]'},
	"TEXTURE" : {text: 'texture: [select:[ressourceslist]]'},
	"VARIABLE" : {text: 'variable: [input:text]'},

	"COND_EQUAL"           : {text: '[partholder:Valeur] est égal à [partholder:Valeur]'},
	"COND_NOT_EQUAL"       : {text: '[partholder:Valeur] n\'est pas égal à [partholder:Valeur]'},
	"COND_CURRENT_SCENE"   : {text: 'la scène courrante est la [partholder:Scène]'},
	"COND_MOUSE_POSITION"  : {text: 'l\'emplacement de la souris est à la [partholder:Position]'},
	"COND_MOUSE_ON_OBJECT" : {text: 'la souris est sur l\'objet [partholder:Objet]'},
	"COND_OBJECT_ANIM_IS"  : {text: 'l\'animation de l\'[partholder:Objet] est l\'[partholder:Animation]'},

	"MATHS_ADDITION"       : {text: '[partholder:Valeur] + [partholder:Valeur]'},
	"MATHS_SUBTRACTION"    : {text: '[partholder:Valeur] - [partholder:Valeur]'},
	"MATHS_MULTIPLICATION" : {text: '[partholder:Valeur] * [partholder:Valeur]'},
	"MATHS_DIVISION"       : {text: '[partholder:Valeur] / [partholder:Valeur]'},

	"MATHS_SQUARE" 		: {text: 'carré de [partholder:Valeur]'},
	"MATHS_SQUARE_ROOT" : {text: 'racine de [partholder:Valeur]'},
	"MATHS_RANDOM"      : {text: 'nombre aléatoire entre [partholder:Valeur] et [partholder:Valeur]'},


	getName: function(o){
		for(var i=0;i<Object.keys(this).length;i++){var k=Object.keys(this)[i];var v=this[k];if(v==o)return k;}return null;
	},
	contains: function(name){
		var r = false;
		Object.keys(this).forEach(function(key){
		    var val = this[key];
		    if(typeof val !== "function"){
		    	if(key == name) r = true;
		    }
		});

		return r;
	}
};