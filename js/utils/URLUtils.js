function URLUtils(){

	// Events
	this.onHashChangeEvents = [];

	this.hashChangeTriggerEvent();
}

URLUtils.prototype = {

	getURL: function(){
		return window.location.href;
	},

	getHash: function(){
		return window.location.hash.replace("#", "");
	},

	setHash: function(hash){
		window.location.hash = hash;
	},



	/***
	**	EVENTS
	***/
	hashChangeTriggerEvent: function(){
		if(window.onhashchange !== undefined){
			var that = this;
			window.onhashchange = function (e) {
				var oldHash = e.oldURL.split("#")[1];
				var newHash = e.newURL.split("#")[1];
				
				if(newHash=="play"&&compiler!=null){
					compiler.run();
					e.preventDefault();
					window.location.hash = '#'+oldHash;
					return false;
				}else if(oldHash=="play") return false;

	            for(var i=0;i<that.onHashChangeEvents.length;i++)
	            	that.onHashChangeEvents[i]({old: oldHash, new: newHash});

	        }
	   	}
	},

	onHashChange: function(eventFunc){
		this.onHashChangeEvents.push(eventFunc);
	}

};

var URLUtils = new URLUtils();