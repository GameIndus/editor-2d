function SceneSidebar(editor){
	this.editor = editor;

	this.container = null;
	this.tree      = {};

	this.selectParams  = null;
	this.compCollapsed = {};
}

SceneSidebar.prototype = {

	init: function(){
		this.container = document.querySelector(".scenePanel");
		
		this.container.setHeight(document.getElementById("editor-container").offsetHeight);
		this.container.querySelector(".objects").setHeight(180);

		this.initTriggers();
	},
	initTriggers: function(){
		var self = this;

		// Tabs
		var tabs = this.container.querySelectorAll(".tabs .tab");	
		tabs.toArray().forEach(function(tab){
			tab.onclick = function(){
				self.setCurrentTab(tab.dataset.div);
			}
		});

		// Components
		function moveHandler(e){
			if(self.selectParams == null) return false;
			var x = e.clientX - self.selectParams.offset.x,
				y = e.clientY - self.selectParams.offset.y;
			var element = self.selectParams.element;

			element.setStyle("left", x + "px");
			element.setStyle("top",  y + "px");
		}
		function mouseupHandler(e){
			if(self.selectParams == null) return false;
			var x = e.clientX, y = e.clientY;
			var element         = self.selectParams.element;
			var canvasRectangle = document.getElementById("sceneEditor").getBoundingClientRect();

			if(x > canvasRectangle.left && x < canvasRectangle.left + canvasRectangle.width 
			&& y > canvasRectangle.top && y < canvasRectangle.top + canvasRectangle.height){
				self.deposeObject(element.dataset.type, element.dataset.name, x, y);
			}

			self.selectParams.emptyElement.remove();
			self.selectParams = null;

			element.removeAttribute("style");
			element.classList.remove("move");
		}

		// Objects list
		var objectsList = this.container.querySelector(".objects");
		objectsList.onclick = function(e){
			if(!e.target.classList.contains("object") && Utils.getParentRecursively(this, ".object") == null) 
				self.clickOnObject(null);
		}

		objectsList.onscroll = function(){
			var currentLine = this.querySelector(".object.active");
			if(currentLine == null) return false;
			var element = document.querySelector(".action-btns");

			element.setStyle("top", (currentLine.offsetTop - this.scrollTop) + "px");
		}

		window.removeEventListener("mousemove", moveHandler);
		window.removeEventListener("mouseup", mouseupHandler);
		window.addEventListener("mousemove", moveHandler);
		window.addEventListener("mouseup", mouseupHandler);
	},
	reload: function(){
		var c  = this.container.querySelector(".objects");
		var ca = this.container.querySelector(".action-btns");
		if(c == null || ca == null) return false;

		var that = this;
		c.innerHTML = "";

		var currentObject = this.editor.workspace.getCurrentObject();

		// Reload tree
		this.tree.forEach(function(name, object){
			var el = document.createElement("div");
			el.className = "object";
			el.innerHTML = name;

			c.appendChild(el);

			if(currentObject != null && currentObject.getName() == name) that.clickOnObject(el, true);

			el.onclick = function(){
				if(this.lastClickTime != null && Date.now() - this.lastClickTime < 500){
					that.doubleClickOnObject(this);
					this.lastClickTime = null;
					return false;
				}else{
					that.clickOnObject(this);
				}

				this.lastClickTime = Date.now();
			}
		});

		// Reload actions
		var icons = ca.querySelectorAll("i.fa");
		icons.toArray().forEach(function(icon){
			icon.onclick = function(){
				that.clickOnObjectAction(this.className.split(" ").pop(), this);
			}
		});
	},


	// Components
	generateComponentDiv: function(name, type, icon, sub, image){
		var div = document.createElement("div");
		div.className = "component-to-add box";
		if(sub) div.className += " sub";
		div.dataset.type = type;
		div.dataset.name = name;
		div.innerHTML = '<i class="fa fa-' + icon + '"></i> ' + name;

		if(image)
			div.innerHTML = '<div class="preview" style="display:block;position:relative;width:240px;height:60px;margin-bottom:15px;background:url(' + image + ') no-repeat center center;background-size:100%"></div>' + div.innerHTML;

		return div;
	},
	deposeObject: function(type, name, x, y, realtime){
		var canvasRectangle = document.getElementById("sceneEditor").getBoundingClientRect();

		var realPos   = this.editor.workspace.convertWithCamera(new Position(x, y), true);
		
		var pos       = (!realtime) ? new Position(realPos.getX() - canvasRectangle.left, realPos.getY() - canvasRectangle.top) : realPos;
		var entryName = (!realtime) ? this.generateEntryName(type) : name;
		
		if(!realtime)
			this.editor.realtimeSend("depositobject", {posx: pos.getX(), posy: pos.getY(), type: type, name: entryName});

		var o = this.editor.workspace.createObjectFromSidebar(type, entryName, pos, realtime);
				
		if(o.getType() == "sprite") this.editor.workspace.loadSpriteFor(o, name, realtime);
		if(o.getType() == "tilemap") this.editor.workspace.loadTilemapFor(o, name, realtime);

		return o;
	},
	renameObject: function(object, name, realtime){
		if(object == null) return false;
		var currentObject = this.editor.workspace.getCurrentObject();

		var oldName = object.getName() + "";
		this.renameEntry(oldName, name);
		object.name = name;

		if(this.compCollapsed[oldName] != null){
			var collapseData = this.compCollapsed[oldName];
			delete this.compCollapsed[oldName];
			this.compCollapsed[name] = collapseData;
		}

		if(currentObject != null && currentObject.getName() == object.getName())
			this.clickOnObject(this.getElementEntryByName(name), true);	

		if(!realtime) this.editor.realtimeSend("renameobject", {oname: oldName, newname: name});
	},
	removeObject: function(name, realtime){
		this.removeEntry(name);
		this.editor.workspace.removeObject(this.editor.workspace.getObjectByName(name));

		if(this.compCollapsed[name] != null)
			delete this.compCollapsed[name];
		
		if(this.editor.workspace.getCurrentObject() != null && this.editor.workspace.getCurrentObject().getName() == name) this.clickOnObject(null);
		if(!realtime) this.editor.realtimeSend("removeobject", name);
	},
	reloadComponentsList: function(customComponentsList){
		var that = this;

		// Reload components to add
		var cc = this.container.querySelector(".components");
		if(cc == null) return false;

		cc.innerHTML = "";

		if(customComponentsList == null){
			cc.appendChild(this.generateComponentDiv("Texte", "text", "font"));
			cc.appendChild(this.generateComponentDiv("Fond", "background", "square"));
			// cc.appendChild(this.generateComponentDiv("Camera", "camera", "video-camera"));
			cc.appendChild(this.generateComponentDiv("Objet géométrique", "geometricobject", "cubes"));
			
			var tilemapDiv = this.generateComponentDiv("Cartes", "tilemap", "map", true);
			if(that.editor.workspace.getObjectsByType("tilemap").length > 0) tilemapDiv.classList.add("disabled");
			cc.appendChild(tilemapDiv);

			cc.appendChild(this.generateComponentDiv("Images", "sprite", "image", true));
		}else{
			var backBtn = this.generateComponentDiv("Retour", "back", "angle-double-left");
			backBtn.className = "box back";
			backBtn.setStyle("padding", "5px 10px");
			cc.appendChild(backBtn);
			backBtn.onclick=function(){that.reloadComponentsList()};

			customComponentsList.list.forEach(function(component){
				var image = undefined;
				if(customComponentsList.type == "sprite") image = "lib/ajax/getSpritePreview.php?sprite=" + component + "&width=240";

				cc.appendChild(that.generateComponentDiv(component.ucfirst(), customComponentsList.type, customComponentsList.icon, false, image));
			});
		}

		this.reloadComponentsTriggers();
	},
	reloadComponentsTriggers: function(){
		var that  = this;
		var types = this.container.querySelectorAll(".component-to-add");

		types.toArray().forEach(function(type){
			type.onmousedown = function(e){
				if(this.classList.contains("disabled")) return false;
				if(this.classList.contains("sub")){
					var objsList = App.getFilesManager().getFilesByType(this.dataset.type);
					that.reloadComponentsList({type: this.dataset.type, icon: this.querySelector("i.fa").className.replace("fa- fa", ""), list: objsList});

					return false;
				}

				var elementSize    = this.getBoundingClientRect();
				var blankComponent = that.generateComponentDiv("", "", "");

				blankComponent.className = "box empty";
				this.insertAfter(blankComponent);

				that.selectParams = {
					element: this,
					offset : {
						x: e.clientX - elementSize.left,
						y: e.clientY - elementSize.top
					},
					emptyElement: blankComponent
				};

				this.classList.add("move");
				this.setHeight(elementSize.height);
				this.setWidth(elementSize.width);
			}
		});
	},
	setCurrentTab: function(name){
		var tabs = this.container.querySelectorAll(".tabs .tab");
		var els  = [document.getElementById("addObject"), document.getElementById("listObjects")];

		els.forEach(function(el){
			if(el.id == name) el.show();
			else el.hide();
		});

		tabs.toArray().forEach(function(tab){
			if(tab.dataset.div == name) tab.classList.add("active");
			else tab.classList.remove("active");
		});

		if(name == "addObject") this.reloadComponentsList();
	},


	// Entries
	addEntry: function(name, object){
		this.tree[name] = object;
		this.reload();
	},
	generateEntryName: function(type){
		var getFrenchType = function(type){
			switch(type){
				case "text": return "Texte";
				case "background": return "Fond";
				case "geometricobject": return "Objet géométrique";
				case "tilemap": return "Carte";
				case "sprite": return "Image dynamique";
				default: return type.ucfirst();
			}
		}

		var frenchType = getFrenchType(type);
		var typeExists = this.editor.workspace.getObjectsByType(type).length;
		var numberText = (typeExists + 1).pad(3);

		return frenchType + " " + numberText;
	},
	getElementEntryByName: function(name){
		var elements = document.querySelectorAll("#listObjects .objects .object");
		var element  = null;

		elements.toArray().forEach(function(el){
			if(el.innerHTML == name) element = el;
		});

		return element;
	},
	removeEntry: function(name){
		delete this.tree[name];
		this.reload();
	},
	renameEntry: function(name, newname){
		if(this.tree[name] == null) return false;
		var tmp = this.tree[name];

		this.removeEntry(name);
		this.addEntry(newname, tmp);
	},
	clear: function(){
		this.tree = {};
		this.reload();
	},
	


	// Objects
	clickOnObject: function(element, forceReload){
		var objects = document.querySelectorAll("#listObjects .objects .object");
		var actions = document.querySelector(".action-btns");

		var objectsList = this.container.querySelector(".objects");

		objects.toArray().forEach(function(object){
			object.classList.remove("active");
		});

		if(element == null){
			this.loadPropertiesOf(null);
			this.editor.workspace.setCurrentObject(null);
			this.moveObjectActionsTo(-15000);
			return false;
		}

		var objectName = element.innerHTML;
		var object     = this.getObjectByName(objectName);

		if(object == null) return false;
		if(forceReload) this.loadPropertiesOf(null);

		this.loadPropertiesOf(object);
		this.editor.workspace.setCurrentObject(object);
		element.classList.add("active");

		actions.querySelector(".toggle-visibility-object").className = "fa fa-" + ((object.hidden) ? "eye" : "eye-slash") + " toggle-visibility-object";
		this.moveObjectActionsTo(element.offsetTop - objectsList.scrollTop);
	},
	clickOnObjectAction: function(action, element){
		var object = this.editor.workspace.currentObject;
		if(object == null) return false;

		switch(action){
			case "toggle-visibility-object":
				this.setObjectHidden(object, !object.hidden, element);
			break;
			case "rename-object":
				var newName = prompt("Renommer l'objet '" + object.getName() + "'.\n\nNouveau nom :", object.getName());
				if(newName == "" || newName == null) return false;

				this.renameObject(object, newName);
			break;
			case "remove-object":
				if(!confirm("Voulez-vous vraiment supprimer cet objet ?")) return false;

				this.removeObject(object.getName());
			break;
		}
	},
	doubleClickOnObject: function(element){
	},
	getObjectByName: function(name){
		return this.tree[name];
	},
	getObjectElement: function(object){
		var c       = this.container.querySelector(".objects");
		var entries = c.querySelectorAll(".object");

		for(var i = 0; i < entries.length; i++){
			if(entries[i].innerHTML == object.getName())
				return entries[i];
		}

		return null;
	},


	// Properties
	loadPropertiesOf: function(object){
		if(object == null){this.container.querySelector(".properties").innerHTML="";return false}
		if(this.editor.workspace.currentObject != null 
			&& object.getName() == this.editor.workspace.currentObject.getName()
			&& this.container.querySelector(".properties").innerHTML != "") return false;

		var self        = this;
		var dictionary  = this.editor.dictionary;
		var components  = dictionary.getComponentsByType(object.getType());
		var optionalsCl = new Array();

		if(components == null) return false;

		var container  = this.container.querySelector(".properties");
		container.innerHTML = "";

		var title = document.createElement("div");
		title.className = "title";
		title.innerHTML = 'Propriétés de "' + object.getName() + '"';
		container.appendChild(title);

		// Generate dom
		components.forEach(function(component){
			if(!component.isDefault()){ optionalsCl.push(component); return false; }

			var div = self.parseComponent(object, component);
			container.appendChild(div);
		});
		object.getSpecialComponents().forEach(function(specialComponent){
			specialComponent.setUsed(true);

			var div = self.parseComponent(object, specialComponent);
			container.appendChild(div);
		});

		// Remove optional components already used
		object.getSpecialComponents().forEach(function(specialComponent){
			if(specialComponent.isUsed() && optionalsCl.indexOf(specialComponent) > -1)
				optionalsCl.splice(optionalsCl.indexOf(specialComponent), 1);
		});

		// Manage linked properties
		function updateLinkedProperties(array){
			if(Object.keys(array).length <= 0) return false;

			array.promiseForEach(function(propertyName, propertyObject){
				var propertyInput = container.querySelector(".input[data-propertyname='" + propertyName + "']");
				if(propertyInput == null) return false;
				var propertyValue = (propertyInput.querySelector("select") != null) ? propertyInput.querySelector("select").value : null;
				if(propertyValue === null) return false;

				propertyInput.querySelector("select").addEventListener("change", function(){
					self.reloadPropertiesOf(object);
				});

				propertyObject.promiseForEach(function(linkedPropertyAttempt, linkedPropertyName){
					var linkedPropertyInput = container.querySelector(".input[data-propertyname='" + linkedPropertyName + "']");
					if(linkedPropertyInput == null) return false;

					if(linkedPropertyAttempt == propertyValue) linkedPropertyInput.show();
					else linkedPropertyInput.hide();
				});
			})
		}

		// Fill dom with data (stored in object class)
		function fillWithData(component, special){
			if(special && !component.isUsed()) return false;

			var linkedProperties = {};

			component.getProperties().promiseForEach(function(name, property){
				var input = container.querySelector(".input[data-propertyname='" + name + "']");
				if(input == null) return false;

				if(input.childNodes.length == 3){
					var field          = input.childNodes[1];
					var objectProperty = object.getProperty(name) || property.options.default;

					if(!component.isDefault()){
						objectProperty = object.getBehaviorProperty(component.getName(), name);
						if(objectProperty === null) objectProperty = property.options.default;
					}

					if(objectProperty === null || objectProperty === undefined) return false;
					if(property.options.rightIcon){
						field.className = "right-icon";
						field.dataset.rightIcon = property.options.rightIcon;
					}

					// Linked properties system
					if(property.options.linkTo != null){
						var links = property.options.linkTo;
						if(linkedProperties[name] == null) linkedProperties[name] = {};

						linkedProperties[name] = links;
					}

					self.fillPropertyField(field, objectProperty);
				}else if(input.childNodes.length > 3){
					var fields = [];
					input.childNodes.toArray().forEach(function(childNode){
						if(childNode.tagName == "SELECT" || childNode.tagName == "INPUT") fields.push(childNode);
					})

					var i = 0;
					fields.forEach(function(field){
						var subproperty    = field.dataset.subproperty;
						var objectProperty = (object.getProperty(name) != null && object.getProperty(name)[subproperty] != null) ? object.getProperty(name)[subproperty] : property.options.defaults[i];
						
						if(!component.isDefault())
							objectProperty = (object.getBehaviorProperty(component.getName(), name) != null && object.getBehaviorProperty(component.getName(), name)[subproperty] != null) ? object.getBehaviorProperty(component.getName(), name)[subproperty] : property.options.defaults[i];

						if(property.options.rightIcon){
							field.className = "right-icon";
							field.dataset.rightIcon = property.options.rightIcon;
						}

						self.fillPropertyField(field, objectProperty);
						i++;
					});
				}
			});

			updateLinkedProperties(linkedProperties);
		};

		components.promiseForEach(fillWithData);
		object.getSpecialComponents().promiseForEach(function(specialComponent){
			fillWithData(specialComponent, true);
		});

		// Add button to link optionals components
		if(optionalsCl.length > 0){
			var button = document.createElement("div");
			button.className = "add-behavior-button";
			button.innerHTML = "<i class='fa fa-plus'></i> Ajouter un comportement";
			container.appendChild(button);

			button.onclick = function(){
				self.openBehaviorAddingMenuTo(object, optionalsCl);
			};
		}

		// Load & init libraries
		jscolor.bind();
		jscolor.preload();

		rangeSlider.bind();
	},
	reloadPropertiesOf: function(object){
		this.loadPropertiesOf(null);
		this.loadPropertiesOf(object);
	},

	fieldPropertyUpdate: function(element, sendToServer){
		var sub      = (element.dataset.subproperty != null);
		var property = element.parentNode.dataset.propertyname;
		var object   = this.editor.workspace.getCurrentObject();
		var value    = element.value;
		
		if(object == null) return false;
		if(object.isLoading()) return false;

		var propertyDiv = element.parentNode.parentNode.parentNode;
		if(propertyDiv.dataset.behavior){
			var behaviorName = propertyDiv.dataset.behaviorName;

			if(element.type == "number") value = parseFloat(value);

			if(sendToServer) 
				this.editor.realtimeSend("changeobjectproperty", {objectname: object.getName(), behaviorname: behaviorName, property: property, value: value});

			this.editor.workspace.updateObjectBehaviorProperty(object, behaviorName, property, value);
			return false;
		}

		if(element.type == "number") value = parseFloat(value);

		if(sub){
			var fields = element.parentNode.querySelectorAll("input");
			var subProperties = {};

			fields.toArray().forEach(function(field){
				subProperties[field.dataset.subproperty] = ((field.type == "number") ? parseFloat(field.value) : field.value);
			});

			if(sendToServer) this.editor.realtimeSend("changeobjectproperty", {objectname: object.getName(), property: property, subproperty: element.dataset.subproperty, value: value});

			value = subProperties;
		}
		
		if(sendToServer && !sub){
			this.editor.realtimeSend("changeobjectproperty", {objectname: object.getName(), property: property, value: value});
		}

		this.editor.workspace.updateObjectProperty(object, property, value);
		return true;
	},
	updateFieldWithValue: function(property, subproperty, value){
		var self = this;

		function getFieldByTagName(tagName){
			return self.container.querySelector("*[data-propertyname='" + property + "'] " + tagName + ((subproperty != null) ? "[data-subproperty='" + subproperty + "']" : ""))
		};
		var field = getFieldByTagName("input") || getFieldByTagName("select");
		if(field == null) return false;

		field.value = value;
	},
	fillPropertyField: function(field, value){
		if(value === false) value = "false";
		else if(value === true) value = "true";

		switch(field.tagName){
			case "INPUT": field.value = value; break;
			case "SELECT":
				var options = field.querySelectorAll("option");
				options.toArray().forEach(function(option){
					if(option.value == value) option.selected = true;
					else option.selected = false;
				});
			break;
		}
	},

	componentIsCollapsed: function(object, componentName){
		return (this.compCollapsed[object.getName()] != null && this.compCollapsed[object.getName()].indexOf(componentName) > -1);
	},
	collapseComponent: function(object, componentName){
		var oname = object.getName();

		if(this.compCollapsed[oname] == null) this.compCollapsed[oname] = new Array();
		var collapsed = this.componentIsCollapsed(object, componentName);
		
		if(collapsed) this.compCollapsed[oname].splice(this.compCollapsed[oname].indexOf(componentName), 1);
		else this.compCollapsed[oname].push(componentName);
	},

	parseComponent: function(object, component){
		var div     = document.createElement("div");
		var heading = document.createElement("div");
		var content = document.createElement("div");

		var self = this;

		div.className	  = "property";
		heading.className = "heading";
		content.className = "content";
		div.appendChild(heading);div.appendChild(content);

		heading.innerHTML = component.getTitle();

		if(Object.keys(component.getProperties()).length > 0)
			heading.innerHTML += '<div class="collapse" data-cname="' + component.getName() + '"><i class="fa fa-angle-down"></i></div>';

		// Auto-collapse when reload properties
		if(self.componentIsCollapsed(object, component.getName()))
			div.classList.add("collapsed");

		if(component.canBeRemoved()){
			heading.innerHTML += '<div class="remove" data-cname="' + component.getName() + '"><i class="fa fa-times"></i></div>';
			heading.dataset.canremove = true;
			heading.querySelector(".remove").onclick = function(){
				var object 		  = self.editor.workspace.getCurrentObject();
				var componentName = this.dataset.cname;
				
				object.getSpecialComponents().forEach(function(specialComponent){
					if(specialComponent.getName() == componentName)
						object.specialComponents.splice(object.specialComponents.indexOf(specialComponent), 1);
				});
				object.removeBehaviorProperty(componentName);

				self.editor.realtimeSend("removeobjectbehavior", {objectname: object.getName(), behaviorname: componentName});
				self.reloadPropertiesOf(object);
			}
		}

		if(heading.querySelector(".collapse") != null){
			heading.querySelector(".collapse").onclick = function(){
				var object 		  = self.editor.workspace.getCurrentObject();
				var componentName = this.dataset.cname;

				var isCollapsed  = self.componentIsCollapsed(object, componentName);
				var componentDiv = this.parentNode.parentNode;

				if(isCollapsed) componentDiv.classList.remove("collapsed");
				else componentDiv.classList.add("collapsed");

				self.collapseComponent(object, componentName);
			}
		}

		if(!component.isDefault()){ // Is behavior
			div.dataset.behavior     = true;
			div.dataset.behaviorName = component.getName();
		}

		component.getProperties().promiseForEach(function(name, property){
			var input = document.createElement("div");
			input.className            = "input";
			input.dataset.propertyname = name;
			input.innerHTML = '<label>' + property.label + '</label>';

			switch(property.type){
				case "input":
					var inputType   = (property.options != null && property.options.inputType != null)   ? property.options.inputType   : "text";
					var placeholder = (property.options != null && property.options.placeholder != null) ? property.options.placeholder : property.label; 

					var extras = "";
					if(inputType == "color"){ 
						extras    = ' class="color" data-jscolor="{onFineChange:\'currentEditor.sidebar.fieldPropertyUpdate(this, true)\'}"';
						inputType = "text";
					}else if(inputType == "number"){
						if(property.options.min != null) extras += ' min="' + property.options.min + '"';
						if(property.options.max != null) extras += ' max="' + property.options.max + '"';
					}
					if(property.options.disabled) extras += " disabled";

					input.innerHTML += '<input type="' + inputType + '" onkeyup="return currentEditor.sidebar.fieldPropertyUpdate(this);" onchange="return currentEditor.sidebar.fieldPropertyUpdate(this, true);" placeholder="' + placeholder + '"' + extras + '></input>';
				break;
				case "select":
					var data = property.options.data;

					if(!property.options.customData && data != null) data = JSON.parse(data);
					else{
						switch(property.options.customData){
							case "fonts": data = property.options.data; break;
							case "object": data = property.options.data; break;
						}
					}

					if(property.options.dataFromProperty) data = object.getProperty(property.options.dataFromProperty);
					if(data == null) data = [];

					input.innerHTML += '<select onchange="return currentEditor.sidebar.fieldPropertyUpdate(this, true);"></select>';

					data.promiseForEach(function(option){
						var key = option;
						if(option.indexOf(":") > -1){
							var s = option.split(":")
							key = s[0];option = s[1];
						}

						input.querySelector("select").innerHTML += '<option value="' + key + '">' + option + '</option>';
					});
				break;
				case "inputs":
					var number = property.options.placeholders.length;

					for(var i = 0; i < number; i++){
						var placeholder     = property.options.placeholders[i];
						var subpropertyname = property.options.names[i];
						var inputType       = property.options.inputsType[i];

						input.innerHTML += '<input type="' + inputType + '" data-subproperty="' + subpropertyname + '" onkeyup="return currentEditor.sidebar.fieldPropertyUpdate(this);" onchange="return currentEditor.sidebar.fieldPropertyUpdate(this, true);" placeholder="' + placeholder + '"></input>';
					}
				break;
				case "dialoglink":
					input.innerHTML += '<div class="dialoglink">' + property.options.text + '</div>';
				break;
			}

			input.innerHTML += '<div class="clear"></div>';
			content.appendChild(input);
		});

		return div;
	},


	// Miscellaneous
	moveObjectActionsTo: function(top){
		var element = document.querySelector(".action-btns");
		if(top == element.offsetTop) return false;
		
		element.show();

		element.setStyle("right", "-300px");
		element.setStyle("top", top + "px");

		setTimeout(function(){
			element.setStyle("right", 0);
		}, 10);
	},
	setObjectHidden: function(object, hidden, icon){
		var entryElement = this.getElementEntryByName(object.getName());

		object.setHidden(hidden);

		if(object.hidden){
			if(icon != null) icon.className = icon.className.replace("fa-eye-slash", "fa-eye");
			entryElement.classList.add("hidden");
		}else{
			if(icon != null) icon.className = icon.className.replace("fa-eye", "fa-eye-slash");
			entryElement.classList.remove("hidden");
		}
	},

	openBehaviorAddingMenuTo: function(object, behaviors){
		var alertHtml = "";
		var self = this;

		behaviors.forEach(function(behavior){
			if(behavior.isDefault()) return false;
			alertHtml += '<div class="component-choice" data-cname="' + behavior.getName() + '"><i class="fa fa-' + behavior.getIcon() + '"></i>' + behavior.getTitle().replace("Comportement: ", "") + '</div>';
		});
		alertHtml += '<div class="clear"></div><input type="hidden" class="objectType" value="' + object.getType() + '"><div class="btn btn-success closeAlert" style="float:right">Ajouter</div><div class="clear"></div>';

		App.modal("Ajouter un comportement", alertHtml, function(){
			var alert 			 = document.getElementById("alert");
			var behaviorSelected = alert.querySelector(".component-choice.active");
			if(behaviorSelected == null) return false;
			var behaviorName     = behaviorSelected.dataset.cname;
			var objectType       = alert.querySelector(".objectType").value;

			var component = self.editor.dictionary.getComponentByType(objectType, behaviorName);
			if(component == null) return false;

			// Update behavior properties
			for(var i = 0; i < Object.keys(component.getProperties()).length; i++){
				var property = Object.keys(component.getProperties())[i];
				var value    = component.getProperty(property).options.default;

				if(value == null) continue;

				self.editor.workspace.updateObjectBehaviorProperty(object, behaviorName, property, value, true);
			}

			object.addSpecialComponent(component);
			self.reloadPropertiesOf(object);
		}, 550);

		var components = document.getElementById("alert-container").querySelectorAll(".component-choice");
		components.toArray().forEach(function(compDiv){
			compDiv.onclick = function(){
				components.toArray().forEach(function(compDiv2){compDiv2.classList.remove("active");});
				this.classList.add("active");
			}
		});
	}
	

};