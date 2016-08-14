function VisualScriptGrid(editor){
	this.editor = editor;
	this.ctx    = editor.editor.game.getContext();

	this.nums        = {x: 1000, y: 1000};
	this.position    = new Position();
	this.cellSize    = [10, 10];

	this.padding 		= {x: 0, y: 0};
	this.renderPosition = new Position();

	this.colors = {
		bg: "#FFF",
		small: "rgb(224,224,224)",
		big: "rgb(224,224,224)"
	}
}

VisualScriptGrid.prototype = {

	getPosition: function(){
		return this.position;
	},

	update: function(){
		var size = this.editor.editor.game.getSize();

		this.nums.x = Math.ceil(size.w / this.cellSize[0]);
		this.nums.y = Math.ceil(size.h / this.cellSize[1]);

		this.renderPosition.setX(this.position.getX() % 50 - 50);
		this.renderPosition.setY(this.position.getY() % 50 - 50);
	},
	render: function(){
		var size = this.editor.editor.game.getSize();
		var pos  = this.renderPosition;

		size.h += 100;

		// Render background
		this.ctx.fillStyle = this.colors.bg;
		this.ctx.fillRect(0, 0, size.w, size.h);

		// Render grid
		this.ctx.save();
		this.ctx.beginPath();

		for(var i = 0; i < this.nums.x; i++){
			var left = pos.getX() + this.cellSize[0] * i;

			this.ctx.moveTo(left, pos.getY());
			this.ctx.lineTo(left, pos.getY() + size.h);
		}
		for(var i = 0; i < this.nums.y; i++){
			var top = pos.getY() + this.cellSize[1] * i;

			this.ctx.moveTo(pos.getX(), top);
			this.ctx.lineTo(pos.getX() + size.w, top);
		}

		this.ctx.lineWidth = 1;
		this.ctx.setLineDash([4, 2]);
		this.ctx.strokeStyle = this.colors.small;
		this.ctx.stroke();
		
		this.ctx.restore();

		// Render secondary grid
		this.ctx.beginPath();

		var cellSize = [50, 50];

		for(var i = 0; i < this.nums.x; i++){
			var left = (pos.getX() + cellSize[0] * i) + this.padding.x;

			this.ctx.moveTo(left, pos.getY());
			this.ctx.lineTo(left, pos.getY() + size.h);
		}
		for(var i = 0; i < this.nums.y; i++){
			var top = (pos.getY() + cellSize[1] * i) + this.padding.y;

			this.ctx.moveTo(pos.getX(), top);
			this.ctx.lineTo(pos.getX() + size.w, top);
		}

		this.ctx.lineWidth = 1;
		this.ctx.strokeStyle = this.colors.big;
		this.ctx.stroke();

		this.editor.renderDebug();
	}

};