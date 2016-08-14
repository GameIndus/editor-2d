function SpriteRessource(){
	
	this.name     = "";
	this.path     = "";
	this.size     = {w: -1, h: -1};
	this.cellSize = {w: -1, h: -1};

	this.animations = {};

}

SpriteRessource.prototype = {

	getName: function(){
		return this.name;
	},
	getPath: function(){
		return this.path;
	},
	getSize: function(){
		return this.size;
	},
	getCellSize: function(){
		return this.cellSize;
	},

	getFramesNumber: function(){
		return Math.floor(this.getSize().w / this.getCellSize().w) * Math.floor(this.getSize().h / this.getCellSize().h);
	},

	getAnimations: function(){
		return this.animations;
	},
	getAnimation: function(animation){
		return this.animations[animation];
	},
	setAnimation: function(animation, begin, finish, speed){
		if(this.animations[animation] != null) return false;
		
		this.animations[animation] = {begin: begin, finish: finish, speed: speed};
	},
	renameAnimation: function(animation, newName){
		if(this.getAnimation(animation) == null) return false;
		this.animations[newName] = this.animations[animation];

		delete this.animations[animation];
	},
	deleteAnimation: function(animation){
		delete this.animations[animation];
	}

};