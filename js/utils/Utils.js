function Utils(){
	this.measuredTexts = {};

	this.keyCodeMapFr = {
	    8:"retour", 9:"tab", 13:"entrée", 16:"shift", 17:"ctrl", 18:"alt", 19:"pausebreak", 20:"capslock", 27:"echap", 32:"espace", 33:"pageup",
	    34:"pagedown", 35:"fin", 36:"home", 37:"gauche", 38:"haut", 39:"droite", 40:"bas", 43:"+", 44:"printscreen", 45:"insert", 46:"delete",
	    48:"0", 49:"1", 50:"2", 51:"3", 52:"4", 53:"5", 54:"6", 55:"7", 56:"8", 57:"9", 59:";",
	    61:"=", 65:"a", 66:"b", 67:"c", 68:"d", 69:"e", 70:"f", 71:"g", 72:"h", 73:"i", 74:"j", 75:"k", 76:"l",
	    77:"m", 78:"n", 79:"o", 80:"p", 81:"q", 82:"r", 83:"s", 84:"t", 85:"u", 86:"v", 87:"w", 88:"x", 89:"y", 90:"z",
	    96:"0", 97:"1", 98:"2", 99:"3", 100:"4", 101:"5", 102:"6", 103:"7", 104:"8", 105:"9",
	    106: "*", 107:"+", 109:"-", 110:".", 111: "/",
	    112:"f1", 113:"f2", 114:"f3", 115:"f4", 116:"f5", 117:"f6", 118:"f7", 119:"f8", 120:"f9", 121:"f10", 122:"f11", 123:"f12",
	    144:"numlock", 145:"scrolllock", 186:";", 187:"=", 188:",", 189:"-", 190:".", 191:"/", 192:"`", 219:"[", 220:"\\", 221:"]", 222:"'"
	};
}

Utils.prototype = {

	isInteger: function(v){
		return /^[0-9]+$/.test(v);
	},

	isFloat: function(v){
		if(/^[0-9]+$/.test(v)) return true;

		// Negative float
		if(/^\-$/.test(v)) return true;
		if(/^\-[0-9]+$/.test(v)) return true;
		if(/^\-[0-9]+\.[0-9]+$/.test(v)) return true;

	   	return /^[0-9]+\.[0-9]+$/.test(v);
	},

	hasClass: function(element, cls){
		return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
	},

	whichChild: function(elem){
	    var  i= 0;
	    while((elem=elem.previousSibling)!=null) ++i;
	    return i;
	},

	doAjaxRequest: function(filename, params, callback){
		var xhr;
		var keys    = Object.keys(params);
		var paramsS = "?";

		if (window.XMLHttpRequest){
		  	xhr = new XMLHttpRequest();
		}else{
			xhr = new ActiveXObject("Microsoft.XMLHTTP");
		}

		for(var i=0;i<keys.length;i++){
			paramsS += keys[i]+"="+params[keys[i]]+"&";
		}

		paramsS = paramsS.substring(0, paramsS.length - 1);

		xhr.onreadystatechange = function(){
			if(xhr.readyState==4 && xhr.status==200){
		    	callback(xhr.responseText);
		    }
		}

		xhr.open("POST", "lib/ajax/"+filename+".php"+paramsS, true);
		xhr.send();
	},

	clone: function(obj){
		return JSON.parse(JSON.stringify(obj));
	},
	hexColorIsLight: function(hexColor){
		var c = (hexColor.indexOf("#") > -1) ? hexColor.substring(1) : hexColor;

		var rgb = parseInt(c, 16);
		var r   = (rgb >> 16) & 0xff;
		var g   = (rgb >>  8) & 0xff;
		var b   = (rgb >>  0) & 0xff;

		var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

		return (luma > 30);
	},

	measureText: function(text, font){
		var div  = document.getElementById("measureText");
		var size = {width: -1, height: -1};
		var funt = (font || "Arial 16px");
		if(this.measuredTexts[text + "/" + funt] != null) return this.measuredTexts[text + "/" + funt];

		var fosp = funt.split(" ");
		var font = fosp[0].replace("+", " ");
		var fosi = fosp[1];

		div.style.fontFamily = font;
		div.style.fontSize   = fosi;
		div.innerHTML = text;

		var c = div.getBoundingClientRect();

		size.width  = c.width;
		size.height = parseInt(fosi);

		div.innerHTML = "";

		this.measuredTexts[text + "/" + funt] = size;
		return size;
	},

	getParentRecursively: function(element, selector){
		var tmpSelector  = new String(selector);
		var selector     = selector.substring(1);
		var selectorType = (tmpSelector.indexOf("#") > -1) ? "id" : "classname";

		if(element == null) return null;

		if(selectorType == "id" && element.id == selector) return element;
		else if(selectorType == "classname" && element.classList != null && element.classList.contains(selector)) return element;

		else return this.getParentRecursively(element.parentNode, tmpSelector);
	},

	getIconFromType: function(fileType){
		var iconName = "times";

		if(fileType == "script"){
			iconName = "code";
		}else if(fileType == "visualscript"){
			iconName = "list-alt";
		}else if(fileType == "scene"){
			iconName = "film";
		}else if(fileType == "sound"){
			iconName = "volume-up";
		}else if(fileType == "tilemap"){
			iconName = "map-o";
		}else if(fileType == "sprite"){
			iconName = "picture-o";
		}else if(fileType == "folder"){
			iconName = "folder";
		}else if(fileType == "options"){
			iconName = "cogs";
		}

		return iconName;
	},

	drawArrow: function (ctx, fromx, fromy, tox, toy, color, lineWidth){
	    var headlen  = 10;
	    var angle = Math.atan2(toy - fromy,tox - fromx);

	    ctx.beginPath();
	    ctx.moveTo(fromx, fromy);
	    ctx.lineTo(tox, toy);
	    ctx.strokeStyle = color;
	    ctx.lineWidth = lineWidth;
	    ctx.stroke();

	    ctx.beginPath();
	    ctx.moveTo(tox, toy);
	    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 7), toy - headlen * Math.sin(angle - Math.PI / 7));

	    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 7), toy - headlen * Math.sin(angle + Math.PI / 7));

	    ctx.lineTo(tox, toy);
	    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 7), toy - headlen * Math.sin(angle - Math.PI / 7));

	    ctx.strokeStyle = color;
	    ctx.lineWidth = lineWidth;
	    ctx.stroke();
	    ctx.fillStyle = color;
	    ctx.fill();
	},

	keyCodeToName: function(code){
		return this.keyCodeMapFr[code];
	},
	keyNameToCode: function(name){
		var c = -1;

		for(var i = 0; i < Object.keys(this.keyCodeMapFr).length; i++){
			var key   = Object.keys(this.keyCodeMapFr)[i];
			var value = this.keyCodeMapFr[key];

			if(value == name) c = parseInt(key);
		}

		return c;
	},

	reduceRatio: function(numerator, denominator) {
	    var temp, divisor;
	    var gcd = function (a, b) { 
	        if (b === 0) return a;
	        return gcd(b, a % b);
	    }
	    
	    if(numerator=="100%"||denominator=="100%") return 'dyn.';        
	    if (!Utils.isInteger(numerator) || !Utils.isInteger(denominator)) return '? : ?';
	    if (numerator === denominator) return '1 : 1';
	    
	    if (+numerator < +denominator) {
	        temp        = numerator;
	        numerator   = denominator;
	        denominator = temp;
	    }
	    divisor = gcd(+numerator, +denominator);
	    return 'undefined' === typeof temp ? (numerator / divisor) + ' : ' + (denominator / divisor) : (denominator / divisor) + ' : ' + (numerator / divisor);
	}

};

var Utils = new Utils();

Utils.measureText("hello world !");