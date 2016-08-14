function TilemapRessource(){

	this.image = null;
	
	this.name     = "";
	this.path     = "";
	this.size     = {w: -1, h: -1};
	this.cellSize = {w: -1, h: -1};

}

TilemapRessource.prototype = {

	getImage: function(){
		return image;
	},
	getName: function(){
		return this.name;
	},
	getPath: function(){
		return this.path;
	},
	getSize: function(){
		return this.size;
	},
	getWidth: function(){
		return this.size.w;
	},
	getHeight: function(){
		return this.size.h;
	},
	getCellSize: function(){
		return this.cellSize;
	}

};