function EditorConfig(){

	this.cookieName = "gameindusconf";
	this.json = {};

	this.load();
}

EditorConfig.prototype = {

	load: function(){
		var c = this.readCookie(this.cookieName);
		if(c == null) c = {};
		else c = JSON.parse(c);

		this.json = c;
	},

	get: function(key){
		return this.json[key];
	},

	set: function(key, value){
		this.json[key] = value;

		this.save();
	},

	remove: function(key){
		delete this.json[key];
		this.save();
	},



	save: function(){
		if(this.readCookie(this.cookieName) != null) this.eraseCookie(this.cookieName);

		this.createCookie(this.cookieName, JSON.stringify(this.json), 7);
	},

	createCookie: function(name, value, days) {
		if (days) {
			var date = new Date();
			date.setTime(date.getTime()+(days*24*60*60*1000));
			var expires = "; expires="+date.toGMTString();
		}
		else var expires = "";
		document.cookie = name+"="+value+expires+"; path=/";
	},
	readCookie: function (name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
	},
	eraseCookie: function (name) {
		this.createCookie(name,"",-1);
	}


};


var edConf = new EditorConfig();