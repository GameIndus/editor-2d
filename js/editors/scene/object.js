function SceneObject(type, name){
	this.type      = type;
	this.name      = name;
	this.hidden	   = false;

	this.properties = {};
	this.specialComponents = [];

	this.object = null;
	this.loading = false;
}

SceneObject.prototype = {

	canBeRotated: function(){
		return (this.getType() == "geometricobject" || this.getType() == "sprite");
	},

	getType: function(){
		return this.type;
	},
	getName: function(){
		return this.name;
	},
	getObject: function(){
		return this.object;
	},
	getObjectProperties: function(){
		if(this.getObject() == null) return {};
		var that = this;
		var r 	 = {};

		var forbidKeys = ['gameobject', 'scene', 'renderer', 'behaviors', 'physicEngine', 'events', 'ID', 'jailed', 'inAir', 'animations', 'updateFrame'];
		Object.keys(this.getObject()).forEach(function(key){
			if(forbidKeys.indexOf(key) === -1){
				r[key] = that.getObject()[key];
			}
		});

		currentEditor.dictionary.getDefaultSpecialPropertiesFor(this.getType()).forEach(function(o){
			r[o.name] = o.defaultValue || null;
		});

		return r;
	},
	getObjectRectangle: function(){
		if(this.getObject() == null) return new Rectangle(0,0,0,0);
		var rect   = new Rectangle(0,0,0,0);
		var object = this.getObject();

		if(object instanceof GameObject || object instanceof Text || object instanceof Background) 
			rect = new Rectangle(object.getPosition().getX(), object.getPosition().getY(), 
								parseFloat(object.getSize().w), parseFloat(object.getSize().h));
		else if(object instanceof TileMap){
			rect = object.getLimits();
		}

		return rect;
	},
	getProperties: function(){
		return this.properties;
	},
	getProperty: function(name){
		return this.getProperties()[name];
	},
	getBehaviorProperty: function(behaviorName, name){
		if(this.getProperties().behaviors === undefined) return null;
		if(this.getProperties().behaviors[behaviorName] === undefined) return null;
		if(this.getProperties().behaviors[behaviorName][name] === undefined) return null;
		return this.getProperties().behaviors[behaviorName][name];
	},
	removeBehaviorProperty: function(behaviorName){
		if(this.getProperties().behaviors == null) return false;
		if(this.getProperties().behaviors[behaviorName] == null) return false;
		delete this.getProperties().behaviors[behaviorName];
	},
	getRessource: function(){
		return this.ressource;
	},

	getSpecialComponents: function(){
		return this.specialComponents;
	},
	addSpecialComponent: function(component){
		this.specialComponents.push(component);
	},


	setHidden: function(bool){
		this.hidden = bool;

		if(this.getObject() != null){
			if(bool) Game.getCurrentScene().remove(this.getObject());
			else Game.getCurrentScene().add(this.getObject());
		}
	},
	setProperty: function(name, value){
		this.properties[name] = value;
	},

	setLoading: function(bool){
		this.loading = bool;
	},
	isLoading: function(){
		return this.loading;
	},


	create: function(){
		switch(this.getType()){
			case "text":
				this.object = new Text("");
				this.object.setColor("#FFFFFF");
				this.object.setText("Texte par défaut");
			break;
			case "background":
				this.object = new Background({});
				this.object.color = "#FFFFFF";
			break;
			case "camera": this.object = new Camera();	break;
			case "geometricobject":
				this.object = new GameObject();
				this.object.setRenderer(new GeometricRenderer({color: "#FFFFFF"}));
			break;
			case "sprite": 
				this.object = new GameObject([0, 0]); 
				this.object.setRenderer(new SpriteRenderer({}));
			break;
			case "tilemap": this.object = new TileMap(); this.object.setScene(Game.getCurrentScene()); break;
		}

		if(this.getType() != "tilemap")
			Game.getCurrentScene().add(this.object);
		else
			Game.getCurrentScene().tilemap = this.object;

		this.properties = this.getObjectProperties();
		return this;
	},
	remove: function(){
		if(this.getObject() != null){
			if(this.getType() != "tilemap")
				Game.getCurrentScene().remove(this.getObject());
			else
				Game.getCurrentScene().tilemap = null;

		}
	},

	// Save
	fromRawString: function(string){
		var self = this;
		var s    = string.split("@");

		var type       = s[0];
		var name       = LZString.decompressFromBase64(s[1]);
		var hidden     = (s[2] === "true");
		var properties = (s[3] != null && s[3].indexOf(";") > -1) ? s[3].split(";") : ((s[3] != null) ? [s[3]] : []);

		this.type = type;
		this.name = name;
		this.hidden = hidden;

		this.create();

		for(var i = 0; i < properties.length; i++){
			var propertyString = properties[i];
			var property       = propertyString.split(/=(.+)/);
			property.splice(-1, 1);

			var key = property[0];
			var val = property[1];

			if(val === "null") val = null;
			else if(val === "false") val = false;
			else if(val === "true") val = true;
			else if(!isNaN(val)) val = parseFloat(val);
			else{
				try{objectVal=JSON.parse(val)}catch(e){objectVal=null}
				if(objectVal != null) val = objectVal;
			}
			if(typeof val === "string") val = LZString.decompressFromBase64(val);

			function objectFromBase64(obj){
				if(obj && typeof obj === "object"){
					obj.forEach(function(key, val){
						if(typeof val === "string") 
							obj[key] = LZString.decompressFromBase64(val);
						else if(typeof val === "object")
							obj[key] = objectFromBase64(val);
					});
				}

				return obj;
			}
			val = objectFromBase64(val);

			if(key == "behaviors"){
				val.forEach(function(behavior, behaviorProperties){
					var component = currentEditor.dictionary.getComponentByType(self.getType(), behavior);
					if(component == null) return false;

					self.addSpecialComponent(component);
				});
			}

			this.setProperty(key, val);
		}

		return this;
	},
	toRawString: function(){
		var rs = "";
		rs += this.getType() + "@" + LZString.compressToBase64(this.getName()) + "@" + this.hidden + "@";

		function toString(o){
			switch(typeof o){
				case "object":
					return JSON.stringify(o);
				default: return o;
			}
		}

		this.getProperties().forEach(function(key, value){
			var parsedValue = (typeof value !== "string") ? toString(value) : LZString.compressToBase64(toString(value));
			rs += key + "=" + parsedValue + ";";
		});
		rs = rs.substring(0, rs.length - 1);

		return rs;
	}

};