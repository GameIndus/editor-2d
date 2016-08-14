function TilemapTile(name, size, pos, texturepos){
	this.name            = name;
	this.size            = size;
	this.position        = (pos != null) ? pos.clone() : new Position();
	this.texturePosition = (texturepos != null) ? texturepos.clone() : new Position();

	this.solid = false;
	this.layer = 0;

	this.obj = null;
}

TilemapTile.prototype = {

	getLayer: function(){
		return this.layer;
	},
	getName: function(){
		return this.name;
	},
	getObject: function(){
		return this.obj;
	},
	getPosition: function(){
		return this.position.clone();
	},
	getSize: function(){
		return this.size;
	},
	getTexturePosition: function(){
		return this.texturePosition.clone();
	},
	isSolid: function(){
		return this.solid;
	},


	create: function(){
		this.obj = new GameObject([this.size.w, this.size.h]);
		this.obj.setRenderer(new SpriteRenderer({name: this.getName()}));
		this.obj.defineAnimation("sprite", 1, [this.getTexturePosition().getX() * this.size.w, this.getTexturePosition().getY() * this.size.h], [0]);
		this.obj.setOpacity(1);
		this.obj.setLayer(this.layer);
		this.obj.setPosition(this.getPosition().getX() * this.size.w, this.getPosition().getY() * this.size.h);

		return this.obj;
	},
	fromRawString: function(string){
		var params = string.split("$");
		var tile   = new TilemapTile("currentTileset", 
			{w: parseInt(params[0]), h: parseInt(params[1])},
			new Position(parseInt(params[2]), parseInt(params[3])),
			new Position(parseInt(params[4]), parseInt(params[5])));

		var solid = (params[6] === "true");
		tile.solid = solid;
		tile.layer = parseInt(params[7]);

		return tile;
	},
	getRawString: function(){
		return this.size.w + "$" + this.size.h + "$" + this.position.getX() + "$" + this.position.getY() + "$" + this.texturePosition.getX() + "$" + this.texturePosition.getY() + "$" + this.solid.toString() + "$" + this.layer;
	},


	changeTextureTo: function(x, y){
		this.texturePosition = new Position(x, y);

		if(this.obj != null) this.obj.getRenderer().pos.set(x * this.size.w, y * this.size.h);
		return this;
	},
	setSolid: function(bool){
		this.solid = bool;
	}

};