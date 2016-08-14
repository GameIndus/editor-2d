function MathUtils(){}

MathUtils.prototype = {

	distance: function(x1, x2, y1, y2){
		return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
	},

	angle: function(x1, x2, y1, y2){
		return Math.atan2(y2 - y1, x2 - x1);
	},

	step: function(n, step){
		var mod = n % step;
		if(mod < step / 2) return n - mod;
		else return n + (step - mod);
	}

};

var MathUtils = new MathUtils();