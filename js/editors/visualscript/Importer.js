function VisualScriptImporter(editor){
	this.editor = editor;
 	this.dom    = document.querySelector(".vs-sidebar");

	this.selectedModule  = null;
	this.selectOrigin    = null;
	this.lastEmptyModule = null;
}

VisualScriptImporter.prototype = {

	init: function(){
		var size = this.editor.editor.getEngineGame().getSize();
		this.dom.setStyle("height", size.h + "px");

		this.loadMenu();
		this.loadAddingSystem();
	},
	loadMenu: function(){
		var that = this;
		var boxsSections = this.dom.querySelectorAll(".flow .box.sub");

		for(var i = 0; i < boxsSections.length; i++){
			var bs = boxsSections[i];
			bs.onclick = function(e){
				e.preventDefault();
				var section = this.dataset.section;

				that.openSection(section);

				return false;
			}
		}

		// Go to main section by default
		this.backToMainSection();
	},
	loadAddingSystem: function(){
		var that = this;

		window.addEventListener("mousemove", function(e){
			if(that.selectedModule == null) return false;

			var x = e.clientX - that.selectOrigin.x;
			var y = e.clientY - that.selectOrigin.y;

			that.selectedModule.style.left = x + "px";
			that.selectedModule.style.top = y + "px";
		});
		window.addEventListener("mouseup", function(e){
			if(that.selectedModule == null) return false;
			var brzt = document.getElementById("visualScriptEditor").getBoundingClientRect();
			var esbr = that.selectedModule.getBoundingClientRect();

			var vseWidth = brzt.width - that.dom.offsetWidth;	

			// Check to add componant
			if(brzt.left < esbr.left && brzt.top < esbr.top && (brzt.left + vseWidth) > esbr.right && (brzt.top + brzt.height) > esbr.bottom){
				var coords = {
					x: esbr.left - Sidebar.getWidth(),
					y: esbr.top - document.getElementById("header").offsetHeight
				};

				var module = that.deposeModuleAt(coords.x, coords.y, that.selectedModule);

				if(ModuleType.getName(module.type) == "PART") that.editor.checkForAssemblyPart(module);
				else if(ModuleType.getName(module.type) != "EVENT") that.editor.checkForAssemblyChild(module);
				that.editor.checkForTrashBin(module, false);
			}

			// Reset
			that.lastEmptyModule.remove();
			that.selectedModule.removeAttribute("style");
			that.selectedModule.classList.remove("picked");

			that.selectedModule  = null;
			that.selectOrigin    = null;
			that.lastEmptyModule = null;
		});
	},

	openSection: function(name){
		var that     = this;
		var sections = this.dom.querySelectorAll(".flow .section-sub");
		var section  = null;

		for(var i = 0; i < sections.length; i++) if(sections[i].dataset.section == name) section = sections[i];
		if(section == null) return false;

		for(var i = 0; i < sections.length; i++) sections[i].classList.add("hidden");
		section.classList.remove("hidden");
		this.dom.querySelector(".flow .main-section").classList.add("hidden");

		this.dom.style.width = "350px";
		this.dom.querySelector(".flow").classList.remove("main-section");
		this.dom.parentNode.querySelector(".vs-trashbin").style.right = "370px";

		var fakeMods  = section.querySelectorAll(".module");
		var fakeTiles = section.querySelectorAll("h4");
		var fakeBrs   = section.querySelectorAll("br");
		for(var i = 0; i < fakeMods.length; i++) fakeMods[i].remove();
		for(var i = 0; i < fakeTiles.length; i++) fakeTiles[i].remove();
		for(var i = 0; i < fakeBrs.length; i++) fakeBrs[i].remove();
		this.dom.querySelector(".flow").setStyle("height", (this.dom.offsetHeight * 380 / 548) + "px");

		// Manage back button
		var bbtn = document.getElementById("vsSidebarBackBtn");
		bbtn.classList.remove("hidden");
		bbtn.onclick = function(){
			that.backToMainSection();
		}

		switch(name){
			case "events":
				section.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.START);
				section.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.RENDERED);
				section.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.UPDATE);
				section.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.INTERVAL);
				
				section.innerHTML += "<br><h4>Script</h4><br>";
				
				section.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.REPEAT);
				section.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.REPEAT_INDEFINITELY);
				section.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.REPEAT_UNTIL);
				
				section.innerHTML += "<br><h4>Scène</h4><br>";

				section.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.OBJECTS_COLLIDE);

				section.innerHTML += "<br><h4>Clavier / Souris</h4><br>";

				section.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.KEY_DOWN);
				section.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.KEY_UP);
				section.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.CLICK);
			break;
			case "logics":
				section.innerHTML += this.generateFakeModule(ModuleType.LOGIC, ModuleSubType.IF);
				section.innerHTML += this.generateFakeModule(ModuleType.LOGIC, ModuleSubType.ELSEIF);
				section.innerHTML += this.generateFakeModule(ModuleType.LOGIC, ModuleSubType.ELSE);
				section.innerHTML += this.generateFakeModule(ModuleType.LOGIC, ModuleSubType.WHILE);

				section.innerHTML += "<br><h4>Conditions de base</h4><br>";

				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_EQUAL);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_NOT_EQUAL);

				section.innerHTML += "<br><h4>Conditions spécifiques</h4><br>";

				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_CURRENT_SCENE);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_MOUSE_POSITION);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_MOUSE_ON_OBJECT);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_OBJECT_ANIM_IS);
			break;
			case "actions":
				section.innerHTML += "<br><h4>Objets de jeu</h4><br>";

				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CREATE_GAMEOBJECT);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.MOVE_GAMEOBJECT);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.MOVE_GAMEOBJECT_LERP);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.MOVE_GAMEOBJECT_ADD);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.ROTATE_GAMEOBJECT);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_SIZE);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_LAYER);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_OPACITY);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_ANIM);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_COLOR);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_TEXTURE);

				section.innerHTML += "<br><h4>Scènes</h4><br>";

				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_SCENE);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.REMOVE_GAMEOBJECT);

				section.innerHTML += "<br><h4>Autres</h4><br>";

				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.WAIT);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.APPLY_VALUE_VARIABLE);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.ALERT);
				section.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.LOG);
			break;
			case "parts":
				var goSubtype = ModuleSubType.GAMEOBJECT;
				goSubtype.text = goSubtype.text.replace("$1", "[]");

				section.innerHTML += "<br><h4>Composants</h4><br>";

				section.innerHTML += this.generateFakeModule(ModuleType.PART, goSubtype);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.SCENE);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.POSITION);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.SIZE);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.ANIMATION);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COLOR);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.TEXTURE);

				section.innerHTML += "<br><h4>Joueur</h4><br>";

				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.KEY);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MOUSE);

				section.innerHTML += "<br><h4>Mathématiques</h4><br>";

				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_ADDITION);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_SUBTRACTION);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_MULTIPLICATION);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_DIVISION);
				
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_SQUARE);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_SQUARE_ROOT);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_RANDOM);

				section.innerHTML += "<br><h4>Autres</h4><br>";

				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.INTEGER);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.STRING);
				section.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.VARIABLE);
			break;
		}

		fakeMods = section.querySelectorAll(".module");
		for(var i = 0; i < fakeMods.length; i++){
			var mod = fakeMods[i];
			mod.onmousedown = function(e){
				that.clickOnModule(this, e);
			}
		}

		// Disable inputs
		var inputs = section.querySelectorAll("input");
		for(var i = 0; i < inputs.length; i++){
			var inp = inputs[i];
			inp.onkeydown = function(e){
				if(Utils.getParentRecursively(this, ".vs-sidebar") != null){
					e.preventDefault();
					return false;
				}
			}
		}
	},
	backToMainSection: function(){
		// Hide sub-sections
		var sections = this.dom.querySelectorAll(".flow .section-sub");
		for(var i = 0; i < sections.length; i++) sections[i].classList.add("hidden");

		// Show main section
		this.dom.querySelector(".flow .main-section").classList.remove("hidden");
		document.getElementById("vsSidebarBackBtn").classList.add("hidden");

		this.dom.style.width = "250px";
		this.dom.querySelector(".flow").classList.add("main-section");
		this.dom.querySelector(".flow").scrollTop = 0;
		this.dom.parentNode.querySelector(".vs-trashbin").style.right = "270px";
	},

	clickOnModule: function(module, e){
		if(this.selectedModule != null) return false;

		module.classList.add("picked");

		var br = module.getBoundingClientRect();
		var st = this.dom.querySelector(".flow").scrollTop;

		this.selectOrigin   = {x: e.clientX - br.left, y: e.clientY - (br.top - st)};
		this.selectedModule = module;

		if(this.selectOrigin.x > br.width) this.selectOrigin.x = br.width;
		if(this.selectOrigin.y > br.height) this.selectOrigin.y = br.height;

		// Create empty box
		var plus = (module.classList.contains("module-event") || module.classList.contains("module-logic")) ? 50 : 0;
		var emptyBox = document.createElement("div");
		emptyBox.className = "box empty";
		emptyBox.setStyle("height", br.height + plus + "px");
		module.insertAfter(emptyBox);

		module.style.left = (e.clientX - this.selectOrigin.x) + "px";
		module.style.top = (e.clientY - this.selectOrigin.y) + "px";

		this.lastEmptyModule = emptyBox;
	},
	deposeModuleAt: function(x, y, module){
		var type    = ModuleType[module.dataset.type];
		var subtype = ModuleSubType[module.dataset.subtype];

		var m = this.editor.createModuleAt(x, y, type, null);
		m.setSubType(subtype);

		this.editor.realtimeSend("createmodule", {moduleId: m.id, x: x, y: y, type: module.dataset.type, subtype: module.dataset.subtype});
		return m;
	},


	generateFakeModule: function(type, subtype){
		var vsm  = new VisualScriptModule(type, null);
		var bars = "";
		
		vsm.subtype = subtype;

		if(type == ModuleType.LOGIC || type == ModuleType.EVENT)
			bars = '<div class="left-bar"></div><div class="sub-bar"></div>';

		var html = '<div class="module module-' + ModuleType.getName(type).toLowerCase() + '" data-type="' + ModuleType.getName(type).toUpperCase() + '" data-subtype="' + ModuleSubType.getName(subtype).toUpperCase() + '" style="height:40px;"><span class="text-content">' + vsm.parseText(subtype.text) + '</span>' +bars + '</div>';

		return html;
	}

};