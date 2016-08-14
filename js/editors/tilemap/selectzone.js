function TilemapSelectzone(editor){
	this.editor = editor;

	this.container = null;
	this.collapsed = false;

	this.viewPosition      = new Position();
	this.viewSize          = {w: 0, h: 0};
	this.overPosition      = null;
	this.lastMovePosition  = null;
}

TilemapSelectzone.prototype = {

	init: function(){
		if(this.editor.ressource.image == null) return false;

		var res = this.editor.ressource;
		var eco = document.getElementById("editor-container");

		var max = {w: 280, h: eco.offsetHeight - 48};
		var div = document.querySelector(".tilemap-selectzone");
		var cvs = div.querySelector("canvas");

		var width = 0, height = 0;

		if(res.size.h > max.h){
			height = max.h;
			div.setStyle("top", (eco.getBoundingClientRect().top + 48) + "px");
			div.setStyle("border-bottom-width", 0);
		}else{
			height = res.size.h;
			div.setStyle("top", ((eco.getBoundingClientRect().top + 48) + ((eco.getBoundingClientRect().height - 48) / 2 - res.size.h / 2)) + "px");
			div.setStyle("border-bottom-width", 2 + "px");
		}

		if(res.size.w > max.w) width = max.w;
		else width = res.size.w;

		div.setStyle("width", width + "px");
		div.setStyle("height", height + "px");

		cvs.width  = width;
		cvs.height = height;

		this.viewSize = {w: width, h: height};

		this.initTriggers();
		
		this.container = document.querySelector(".tilemap-selectzone");
		this.render();
	},
	initTriggers: function(){
		var that     = this;

		var collapse = document.getElementById("collapse-selectzone");
		var div      = document.querySelector(".tilemap-selectzone");

		collapse.onclick = function(){
			that.collapse();
		}

		var mouseDowns = [];
		div.onmousedown = function(e){
			e.preventDefault();
			if(e.which == 1) that.editor.selection.reset();

			if(e.which == 1 && mouseDowns.indexOf("left") == -1) mouseDowns.push("left");
			if(e.which == 3 && mouseDowns.indexOf("right") == -1) mouseDowns.push("right");

			mouseMoveHandler.call(this, e);
			return false;
		}
		var mouseMoveHandler = function(e){
			var x = e.clientX - this.getBoundingClientRect().left, y = e.clientY - (this.getBoundingClientRect().top + 5);

			if(mouseDowns.indexOf("left") > -1) that.leftMoveOn(x, y);
			if(mouseDowns.indexOf("right") > -1) that.rightMoveOn(x, y);
			that.moveOn(x, y);
		};
		div.onmousemove = mouseMoveHandler;
		div.onmouseenter = function(){
			if(that.editor.workspace.selObj != null) that.editor.workspace.selObj.setOpacity(0);
		}
		div.onmouseleave = function(){
			that.overPosition = null;
		}
		div.oncontextmenu = function(e){
			e.preventDefault();

			that.lastMovePosition = null;
			return false;
		}
		window.addEventListener("mouseup", function(e){
			e.preventDefault();
			if(e.which == 1 && mouseDowns.indexOf("left") > -1) mouseDowns.splice(mouseDowns.indexOf("left"), 1);
			if(e.which == 3 && mouseDowns.indexOf("right") > -1) mouseDowns.splice(mouseDowns.indexOf("right"), 1);
			return false;
		});
	},

	moveOn: function(x, y){
		var tile = this.editor.coordsToTile(x, y, this.viewPosition);

		this.overPosition = new Position(tile.x, tile.y);
	},
	leftMoveOn: function(x, y){
		x += this.viewPosition.getX();
		y += this.viewPosition.getY();

		var tile = this.editor.coordsToTile(x, y);
		var sel  = this.editor.selection;

		sel.appendTile(tile.x, tile.y);
	},
	rightMoveOn: function(x, y){
		if(this.lastMovePosition == null) this.lastMovePosition = new Position(x, y);
		var last = this.lastMovePosition;
		var diff = last.clone().substract(new Position(x, y));
		var res  = this.editor.ressource;

		if(-diff.getX() >= this.viewPosition.getX()) diff.setX(-this.viewPosition.getX());
		if(-diff.getY() >= this.viewPosition.getY()) diff.setY(-this.viewPosition.getY());

		// console.log(this.viewPosition.clone().add(new Position(this.viewSize.w, this.viewSize.h)), res.size);
		if(this.viewPosition.getX() >= 0 && this.viewPosition.getY() >= 0){
			this.viewPosition.add(diff);
		}else{
			this.viewPosition.set(0, 0);
		}

		if(this.viewPosition.getX() >= res.size.w - this.viewSize.w)
			this.viewPosition.setX(res.size.w - this.viewSize.w);
		if(this.viewPosition.getY() >= res.size.h - this.viewSize.h)
			this.viewPosition.setY(res.size.h - this.viewSize.h);

		this.lastMovePosition = new Position(x, y);
	},

	collapse: function(){
		var div      = document.querySelector(".tilemap-selectzone");
		var collapse = document.getElementById("collapse-selectzone");

		if(this.collapsed) div.setStyle("right", 0);
		else div.setStyle("right", "-" + (div.offsetWidth) + "px");

		if(this.collapsed) collapse.querySelector("i").className = "fa fa-angle-double-right";
		else collapse.querySelector("i").className = "fa fa-angle-double-left";

		this.collapsed = !this.collapsed;
	},


	render: function(){
		var that = this;

		if(this.collapsed || this.editor.ressource.image == null){
			setTimeout(function(){that.render();}, 30);
			return false;
		}

		var res  = this.editor.ressource, div = this.container;
		var cvs  = div.querySelector("canvas"), ctx = cvs.getContext("2d");
		var cell = res.cellSize;

		// Draw image
		ctx.clearRect(0, 0, cvs.width, cvs.height);
		ctx.drawImage(res.image,
			this.viewPosition.getX(), this.viewPosition.getY(), cvs.width, cvs.height,
			0, 0, cvs.width, cvs.height);

		// Draw over borders
		if(this.overPosition != null){
			// ctx.save();
			// ctx.translate(0.5, 0.5);
			// ctx.imageSmoothingEnabled = false;

			// // Draw overlay
			// // ctx.fillStyle = "rgba(0,0,0,0.3)";
			// // ctx.fillRect(this.overPosition.getX() * cell.w, this.overPosition.getY() * cell.h, cell.w, cell.h);

			// // Draw borders
			// // ctx.beginPath();
			// // ctx.moveTo(this.overPosition.getX() * cell.w, this.overPosition.getY() * cell.h);
			// // ctx.lineTo((this.overPosition.getX() + 1) * cell.w, this.overPosition.getY() * cell.h);
			// // ctx.lineTo((this.overPosition.getX() + 1) * cell.w, (this.overPosition.getY() + 1) * cell.h);
			// // ctx.lineTo(this.overPosition.getX() * cell.w, (this.overPosition.getY() + 1) * cell.h);
			// // ctx.lineTo(this.overPosition.getX() * cell.w, this.overPosition.getY() * cell.h);

			// // ctx.lineWidth = 2;
			// // ctx.strokeStyle = "#fff";
			// // ctx.stroke();
			// // ctx.closePath();

			// ctx.restore();
		}

		// Draw selection borders
		var sel = this.editor.selection;
		if(sel.size.w != 0 && sel.size.h != 0){
			ctx.save();
			ctx.imageSmoothingEnabled = false;
			ctx.translate(0.5, 0.5);

			var pos = sel.getPosition().clone();
			pos.substractX(this.viewPosition.getX() / cell.w);
			pos.substractY(this.viewPosition.getY() / cell.h);

			// Draw overlay
			ctx.fillStyle = "rgba(0,0,0,0.1)";
			ctx.fillRect(pos.getX() * cell.w, pos.getY() * cell.h, sel.size.w * cell.w, sel.size.h * cell.h);

			// Draw borders
			ctx.beginPath();
			ctx.moveTo(pos.getX() * cell.w, pos.getY() * cell.h);
			ctx.lineTo((pos.getX() + sel.size.w) * cell.w, pos.getY() * cell.h);
			ctx.lineTo((pos.getX() + sel.size.w) * cell.w, (pos.getY() + sel.size.h) * cell.h);
			ctx.lineTo(pos.getX() * cell.w, (pos.getY() + sel.size.h) * cell.h);
			ctx.lineTo(pos.getX() * cell.w, pos.getY() * cell.h);

			ctx.lineWidth = 3;
			ctx.strokeStyle = "#fff";
			ctx.stroke();
			ctx.closePath();

			ctx.beginPath();
			ctx.moveTo(pos.getX() * cell.w - 1, pos.getY() * cell.h - 1);
			ctx.lineTo((pos.getX() + sel.size.w) * cell.w + 1, pos.getY() * cell.h - 1);
			ctx.lineTo((pos.getX() + sel.size.w) * cell.w + 1, (pos.getY() + sel.size.h) * cell.h + 1);
			ctx.lineTo(pos.getX() * cell.w - 1, (pos.getY() + sel.size.h) * cell.h + 1);
			ctx.lineTo(pos.getX() * cell.w - 1, pos.getY() * cell.h - 1);
			ctx.lineWidth = 1;
			ctx.strokeStyle = "#000";
			ctx.stroke();
			ctx.closePath();
			ctx.beginPath();
			ctx.moveTo(pos.getX() * cell.w + 2, pos.getY() * cell.h + 2);
			ctx.lineTo((pos.getX() + sel.size.w) * cell.w - 2, pos.getY() * cell.h + 2);
			ctx.lineTo((pos.getX() + sel.size.w) * cell.w - 2, (pos.getY() + sel.size.h) * cell.h - 2);
			ctx.lineTo(pos.getX() * cell.w + 2, (pos.getY() + sel.size.h) * cell.h - 2);
			ctx.lineTo(pos.getX() * cell.w + 2, pos.getY() * cell.h + 2);
			ctx.lineWidth = 1;
			ctx.strokeStyle = "#000";
			ctx.stroke();
			ctx.closePath();

			ctx.restore();
		}

		setTimeout(function(){that.render();}, 30);
	}

};