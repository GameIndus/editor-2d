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

		this.loadCategories();
		this.loadAddingSystem();
	},
	loadCategories: function(){
		var self       = this;
		var categories = this.dom.querySelectorAll(".categories .category");

		for(var i = 0; i < categories.length; i++){
			var category = categories[i];

			category.onclick = function(e){
				e.preventDefault();
				var category = this.dataset.category;

				for(var j = 0; j < categories.length; j++)
					categories[j].classList.remove("active");
				this.classList.add("active");

				self.loadCategory(category);
				return false;
			}
		}
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

	loadCategory: function(name){
		var that     = this;
		var flow     = this.dom.querySelector(".flow");

		flow.innerHTML = "";

		switch(name){
			case "events":
				flow.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.START);
				flow.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.RENDERED);
				flow.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.UPDATE);
				flow.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.INTERVAL);
				
				flow.innerHTML += "<br><h4>Script</h4><br>";
				
				flow.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.REPEAT);
				flow.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.REPEAT_INDEFINITELY);
				flow.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.REPEAT_UNTIL);
				
				flow.innerHTML += "<br><h4>Scène</h4><br>";

				flow.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.OBJECTS_COLLIDE);

				flow.innerHTML += "<br><h4>Clavier / Souris</h4><br>";

				flow.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.KEY_DOWN);
				flow.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.KEY_UP);
				flow.innerHTML += this.generateFakeModule(ModuleType.EVENT, ModuleSubType.CLICK);
			break;
			case "logics":
				flow.innerHTML += this.generateFakeModule(ModuleType.LOGIC, ModuleSubType.IF);
				flow.innerHTML += this.generateFakeModule(ModuleType.LOGIC, ModuleSubType.ELSEIF);
				flow.innerHTML += this.generateFakeModule(ModuleType.LOGIC, ModuleSubType.ELSE);
				flow.innerHTML += this.generateFakeModule(ModuleType.LOGIC, ModuleSubType.WHILE);

				flow.innerHTML += "<br><h4>Conditions de base</h4><br>";

				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_EQUAL);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_NOT_EQUAL);

				flow.innerHTML += "<br><h4>Conditions spécifiques</h4><br>";

				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_CURRENT_SCENE);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_MOUSE_POSITION);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_MOUSE_ON_OBJECT);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COND_OBJECT_ANIM_IS);
			break;
			case "actions":
				flow.innerHTML += "<br><h4>Objets de jeu</h4><br>";

				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CREATE_GAMEOBJECT);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.MOVE_GAMEOBJECT);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.MOVE_GAMEOBJECT_LERP);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.MOVE_GAMEOBJECT_ADD);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.ROTATE_GAMEOBJECT);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_SIZE);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_LAYER);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_OPACITY);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_ANIM);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_COLOR);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_GAMEOBJECT_TEXTURE);

				flow.innerHTML += "<br><h4>Scènes</h4><br>";

				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.CHANGE_SCENE);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.REMOVE_GAMEOBJECT);

				flow.innerHTML += "<br><h4>Autres</h4><br>";

				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.WAIT);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.APPLY_VALUE_VARIABLE);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.ALERT);
				flow.innerHTML += this.generateFakeModule(ModuleType.ACTION, ModuleSubType.LOG);
			break;
			case "parts":
				var goSubtype = ModuleSubType.GAMEOBJECT;
				goSubtype.text = goSubtype.text.replace("$1", "[]");

				flow.innerHTML += "<br><h4>Composants</h4><br>";

				flow.innerHTML += this.generateFakeModule(ModuleType.PART, goSubtype);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.SCENE);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.POSITION);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.SIZE);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.ANIMATION);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.COLOR);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.TEXTURE);

				flow.innerHTML += "<br><h4>Joueur</h4><br>";

				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.KEY);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MOUSE);

				flow.innerHTML += "<br><h4>Mathématiques</h4><br>";

				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_ADDITION);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_SUBTRACTION);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_MULTIPLICATION);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_DIVISION);
				
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_SQUARE);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_SQUARE_ROOT);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.MATHS_RANDOM);

				flow.innerHTML += "<br><h4>Autres</h4><br>";

				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.INTEGER);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.STRING);
				flow.innerHTML += this.generateFakeModule(ModuleType.PART, ModuleSubType.VARIABLE);
			break;
		}

		var fakeMods = flow.querySelectorAll(".module");
		for(var i = 0; i < fakeMods.length; i++){
			var mod = fakeMods[i];
			mod.onmousedown = function(e){
				that.clickOnModule(this, e);
			}
		}

		// Disable inputs
		var inputs = flow.querySelectorAll("input");
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

		var html = '<div class="module module-' + ModuleType.getName(type).toLowerCase() + '" data-type="' + ModuleType.getName(type).toUpperCase() + '" data-subtype="' + ModuleSubType.getName(subtype).toUpperCase() + '"><span class="text-content">' + vsm.parseText(subtype.text) + '</span>' +bars + '</div>';

		return html;
	}

};