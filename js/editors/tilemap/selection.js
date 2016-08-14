function TilemapSelection(){
	this.size = {w: 0, h: 0};
	this.position = new Position();

	this.lastTile = null;
}

TilemapSelection.prototype = {

	getPosition: function(){
		return this.position;
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

	appendTile: function(x, y){
		if(this.lastTile != null && this.lastTile.x == x && this.lastTile.y == y) return false;
		if(this.lastTile == null) this.lastTile = {x: x, y: y};
		
		if(!this.hasTileAt(x, y)){
			// Update position
			if(this.size.w == 0 && this.size.h == 0){ // Initial
				this.position.set(x, y);
				this.size = {w: 1, h: 1};
			}
			if(x < this.position.x) this.position.setX(x);
			if(y < this.position.y) this.position.setY(y);

			// Update size
			if(x < this.lastTile.x || x > this.lastTile.x) this.size.w++;
			if(y < this.lastTile.y || y > this.lastTile.y) this.size.h++;
		}else{
			// Update position
			if(x > this.lastTile.x) this.position.setX(x);
			if(y > this.lastTile.y) this.position.setY(y);

			// Update size
			if(x < this.lastTile.x || x > this.lastTile.x) this.size.w--;
			if(y < this.lastTile.y || y > this.lastTile.y) this.size.h--;
		}

		this.lastTile = {x: x, y: y};
	},
	hasTileAt: function(x, y){
		var min = {x: this.position.getX(), y: this.position.getY()};
		var max = {x: min.x + (this.size.w - 1), y: min.y + (this.size.h - 1)};

		return ((x >= min.x && x <= max.x) && (y >= min.y && y <= max.y));
	},

	reset: function(){
		this.size = {w: 0, h: 0};
		this.position = new Position();

		this.lastTile = null;
	}

};