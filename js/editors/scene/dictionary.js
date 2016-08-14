function SceneDictionary(){
	this.entries           = {};
	this.specialProperties = {};

	this.defaultSpecialProperties = {};

	this.defaultFonts = ['Arial', 'Arial Black', 'Comic Sans MS', 'Courrier New', 'Georgia', 'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Palatino Linotype', 'sans-serif', 'Tahoma', 'Times New Roman', 'Trebuchet MS1', 'Verdana'];

	this.init();
}

SceneDictionary.prototype = {

	addComponent: function(type, name, title, isDefault, canBeRemoved){
		var component = new SceneDictionaryComponent(name, title, isDefault, canBeRemoved);

		if(this.entries[type] == null) this.entries[type] = new Array();
		this.entries[type].push(component);

		return component;
	},
	createBehaviorComponent: function(name, title, icon){
		var component = new SceneDictionaryComponent(name, title, false, true);
		component.setIcon(icon);
		return component;
	},
	getComponents: function(){
		return this.entries;
	},
	getComponentsByType: function(type){
		return this.entries[type];
	},
	getComponent: function(name){
		var r = null;

		this.getComponents().toArray().forEach(function(entry){
			if(entry.getName() == name) r = entry;
		});
		return r;
	},
	getComponentByType: function(type, name){
		var r = null;

		if(this.getComponentsByType(type) == null) return null;

		this.getComponentsByType(type).toArray().forEach(function(entry){
			if(entry.getName() == name) r = entry;
		});
		return r;
	},
	linkBehaviorTo: function(behavior, type){
		if(this.entries[type] == null) this.entries[type] = [];
		this.entries[type].push(behavior.clone());
	},

	addSpecialProperty: function(property, task){
		this.specialProperties[property] = task;
	},
	getSpecialPropertyTask: function(property){
		return this.specialProperties[property];
	},

	addDefaultSpecialProperty: function(type, name, defaultValue){
		if(this.defaultSpecialProperties[type] == null) 
			this.defaultSpecialProperties[type] = [];

		this.defaultSpecialProperties[type].push({name: name, defaultValue: defaultValue});
	},
	getDefaultSpecialPropertiesFor: function(type){
		return this.defaultSpecialProperties[type] || [];
	},


	init: function(){
		this.initSpecialProperties();

		// Text
		var textMainComponent = this.addComponent("text", "main", "Objet", true, false);
		textMainComponent.addProperty("text", "Texte", "input", {default: "Texte par défaut"});
		textMainComponent.addProperty("position", "Position", "inputs", {inputsType: ["number", "number"], placeholders: ["X", "Y"], names: ["x", "y"], defaults: [0, 0]});
		textMainComponent.addProperty("font", "Police", "select", {data: this.defaultFonts, customData: "fonts", default: "Arial"});
		textMainComponent.addProperty("fontSize", "Taille", "input", {inputType: "number", default: 16, min: 4, max: 72});
		textMainComponent.addProperty("color", "Couleur", "input", {inputType: "color"});

		// Background
		var bgMainComponent = this.addComponent("background", "main", "Principal", true, false);
		bgMainComponent.addProperty("position", "Position", "inputs", {inputsType: ["number", "number"], placeholders: ["X", "Y"], names: ["x", "y"], defaults: [0, 0]});
		bgMainComponent.addProperty("size", "Taille", "inputs", {inputsType: ["number", "number"], placeholders: ["Largeur", "Hauteur"], names: ["w", "h"], defaults: [0, 0]});
		var bgMain2Component = this.addComponent("background", "appearance", "Apparence", true, false);
		bgMain2Component.addProperty("color", "Couleur", "input", {inputType: "color"});

		// GeometricObject
		var geoMainComponent = this.addComponent("geometricobject", "main", "Principal", true, false);
		geoMainComponent.addProperty("position", "Position", "inputs", {inputsType: ["number", "number"], placeholders: ["X", "Y"], names: ["x", "y"], defaults: [0, 0]});
		geoMainComponent.addProperty("size", "Taille", "inputs", {inputsType: ["number", "number"], placeholders: ["Largeur", "Hauteur"], names: ["w", "h"], defaults: [50, 50]});
		geoMainComponent.addProperty("layer", "Calque", "input", {inputType: "number", default: 0, placeholder: "Calque", min: 0, max: 9});
		geoMainComponent.addProperty("angle", "Rotation", "input", {inputType: "number", default: 0, placeholder: "Rotation", min: 0, max: 360});
		var geoMain2Component = this.addComponent("geometricobject", "appearance", "Apparence", true, false);
		geoMain2Component.addProperty("shape", "Forme", "select", {data: ['rectangle:Rectangle', 'triangle:Triangle', 'circle:Cercle', 'grid:Grille'], customData: "object", default: "Rectangle"});
		geoMain2Component.addProperty("color", "Couleur", "input", {inputType: "color"});

		// Sprite
		var sprMainComponent = this.addComponent("sprite", "main", "Principal", true, false);
		sprMainComponent.addProperty("position", "Position", "inputs", {inputsType: ["number", "number"], placeholders: ["X", "Y"], names: ["x", "y"], defaults: [0, 0]});
		sprMainComponent.addProperty("size", "Taille", "inputs", {inputsType: ["number", "number"], placeholders: ["Largeur", "Hauteur"], names: ["w", "h"], defaults: [50, 50]});
		sprMainComponent.addProperty("layer", "Calque", "input", {inputType: "number", default: 0, placeholder: "Calque", min: 0, max: 9});
		sprMainComponent.addProperty("scale", "Echelle (en %)", "input", {inputType: "number", default: 100, placeholder: "Echelle de l'objet", min: 0, max: 500, rightIcon: "expand"});
		var sprSpriteComponent = this.addComponent("sprite", "sprite", "Sprite", true, false);
		sprSpriteComponent.addProperty("spritefile", "Chemin", "input", {default: "", disabled: true});
		sprSpriteComponent.addProperty("animation", "Animation", "select", {dataFromProperty: "animations"});

		// Tilemap
		var sprMainComponent = this.addComponent("tilemap", "main", "Principal", true, false);
		sprMainComponent.addProperty("position", "Position", "inputs", {inputsType: ["number", "number"], placeholders: ["X", "Y"], names: ["x", "y"], defaults: [0, 0]});
		sprMainComponent.addProperty("tilemapfile", "Chemin", "input", {default: "", disabled: true});
		
		this.initBehaviorComponents();
	},
	initBehaviorComponents: function(){
		var rotateBehavior   = this.createBehaviorComponent("b_rotate", "Comportement: Rotation", "repeat");
		var anchorBehavior   = this.createBehaviorComponent("b_anchor", "Comportement: Ancre", "anchor");
		var buttonBehavior   = this.createBehaviorComponent("b_button", "Comportement: Bouton", "road");
		var sineBehavior     = this.createBehaviorComponent("b_sine", "Comportement: Sinus", "circle-o");
		var turretBehavior   = this.createBehaviorComponent("b_turret", "Comportement: Tourelle", "location-arrow");
		var boundaryBehavior = this.createBehaviorComponent("b_boundary", "Comportement: Bordures", "square-o");
		var solidBehavior    = this.createBehaviorComponent("b_solid", "Comportement: Solide", "cube");

		rotateBehavior.addProperty("interval", "Intervalle (en s)", "input", {inputType: "number", placeholder: "Intervalle (en s)", default: 1, min: 0});
		rotateBehavior.addProperty("step", "Pas (en degré)", "input", {inputType: "number", default: 1, placeholder: "Pas", min: 0, max: 360});

		buttonBehavior.addProperty("cible", "Cible", "input", {placeholder: "Scène ou lien"});
		buttonBehavior.addProperty("trigger", "Délencheur", "select", {data: ['left:Clic gauche', 'middle:Clic molette', 'right:Clic droit'], customData: "object", default: "Clic gauche"});
		buttonBehavior.addProperty("activeAfterClick", "Actif après le clic", "select", {data: ['false:Non', 'true:Oui'], customData: "object", default: "true"});
		
		sineBehavior.addProperty("mode", "Mode", "select", {data: ['vertical:Vertical', 'horizontal:Horizontal'], customData: "object", default: "vertical"});
		sineBehavior.addProperty("magnitude", "Magnitude", "input", {inputType: "number", placeholder: "Magnitude", default: 20, min: 0});
		sineBehavior.addProperty("period", "Période", "input", {inputType: "number", placeholder: "Période", default: 4, min: 0});

		boundaryBehavior.addProperty("canvasBounds", "Bordures", "select", {data: ['true:Zone de jeu', 'false:Personnalisées'], customData: "object", linkTo: {"false" : "bounds"}, default: "true"});
		boundaryBehavior.addProperty("bounds", "Bordures perso.", "dialoglink", {text: "Sélectionner"});
		
		solidBehavior.addProperty("mass", "Masse", "input", {inputType: "number", placeholder: "Masse", default: 0, min: 0});

		this.linkBehaviorTo(rotateBehavior, "geometricobject");
		this.linkBehaviorTo(anchorBehavior, "geometricobject");
		this.linkBehaviorTo(buttonBehavior, "geometricobject");
		this.linkBehaviorTo(sineBehavior, "geometricobject");
		this.linkBehaviorTo(turretBehavior, "geometricobject");
		this.linkBehaviorTo(boundaryBehavior, "geometricobject");
		this.linkBehaviorTo(solidBehavior, "geometricobject");
	},
	initSpecialProperties: function(){
		this.addSpecialProperty("position", function(object, property, value){
			object.getObject().setPosition(value.x, value.y);
		});
		this.addSpecialProperty("scale", function(object, property, value){
			object.getObject().setScale((value > 1) ? value / 100 : value);
		});
		this.addSpecialProperty("color", function(object, property, value){ 
			if(typeof value === "string") value = value.replace("#", "");

			if(object.getType() == "text" || object.getType() == "background"){
				object.getObject().setColor("#" + value);
			}else if(object.getType() == "geometricobject"){
				object.getObject().getRenderer().color = "#" + value;
			}
		});
		this.addSpecialProperty("size", function(object, property, value){
			var w = value.w, h = value.h;

			if(object.getType() == "background"){
				var size = Game.getSize();

				if(typeof value.w == "string" && value.w.indexOf("%") > -1){
					var perc = parseFloat(value.w.substring(0, value.w.indexOf("%")));
					w = size.getWidth() * perc / 100;
				}
				if(typeof value.h == "string" && value.h.indexOf("%") > -1){
					var perc = parseFloat(value.h.substring(0, value.h.indexOf("%")));
					h = size.getHeight() * perc / 100;
				}

				object.getObject().size = {w: w, h: h};
			}else if(object.getType() == "geometricobject" || object.getType() == "sprite"){
				object.getObject().setSize(parseFloat(w), parseFloat(h));
			}
		});
		this.addSpecialProperty("shape", function(object, property, value){
			if(object.getType() == "geometricobject") object.getObject().getRenderer().type = value;
		});
		this.addSpecialProperty("ressource", function(object, property, value){
			if(object.getType() == "sprite") object.getObject().getRenderer().name = value;
		});
		this.addSpecialProperty("animations", function(object, property, value){
			var go = object.getObject();
			if(typeof value != "object") return false;

			value.forEach(function(name, o){
				if(go.getAnimations()[name] == null){
					var frames = [];
					for(var j = o.begin; j <= o.finish; j++)
						frames.push(j);

					go.defineAnimation(name, o.speed, [0, 0], frames);
				}
			});
		});
		this.addSpecialProperty("animation", function(object, property, value){
			object.getObject().setAnimation(value);
		});

		// Default special properties
		this.addDefaultSpecialProperty("geometricobject", "color", "FFFFFF");
		this.addDefaultSpecialProperty("geometricobject", "shape", "rectangle");
		this.addDefaultSpecialProperty("geometricobject", "size", {w: 50, h: 50});

		this.addDefaultSpecialProperty("sprite", "ressource", null);
		this.addDefaultSpecialProperty("sprite", "spritefile", null);
		this.addDefaultSpecialProperty("sprite", "animations", {});
		this.addDefaultSpecialProperty("sprite", "animation", null);
		this.addDefaultSpecialProperty("sprite", "size", {w: 50, h: 50});
		this.addDefaultSpecialProperty("sprite", "scale", 100);

		this.addDefaultSpecialProperty("tilemap", "collisionsMap", undefined);
		this.addDefaultSpecialProperty("tilemap", "tiles", undefined);
		this.addDefaultSpecialProperty("tilemap", "tilemapfile", undefined);
	}

};

/*
*	DictonaryComponent
*	SubClass of SceneDictionary
*/
function SceneDictionaryComponent(name, title, isDefault = true, canBeRemoved = false){
	this.name              = name;
	this.title             = title;
	this.default           = isDefault;
	this.canBeRemovedValue = canBeRemoved;

	this.used = (isDefault) ? true : false;

	this.properties   = {};

	// Behavior
	this.icon = null;
}
SceneDictionaryComponent.prototype = {

	addProperty: function(name, label, type, options){
		this.properties[name] = {
			label  : label,
			type   : type,
			options: options
		}
	},
	getProperties: function(){
		return this.properties;
	},
	getProperty: function(name){
		return this.getProperties()[name];
	},


	canBeRemoved: function(){
		return this.canBeRemovedValue;
	},
	getIcon: function(){
		return this.icon;
	},
	getName: function(){
		return this.name;
	},
	getTitle: function(){
		return this.title;
	},
	isDefault: function(){
		return this.default;
	},

	isUsed: function(){
		return this.used;
	},
	setUsed: function(bool){
		this.used = bool;
	},

	setIcon: function(icon){
		this.icon = icon;
		return this;
	},


	clone: function(){
		var sdc = new SceneDictionaryComponent(this.getName(), this.getTitle(), this.isDefault(), this.canBeRemoved());
		sdc.setIcon(this.getIcon());

		for(var i = 0; i < Object.keys(this.properties).length; i++){
			var name = Object.keys(this.properties)[i];
			var o    = this.properties[name];

			sdc.addProperty(name, o.label, o.type, o.options);
		}

		return sdc;
	}

};