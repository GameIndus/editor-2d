function Views(){
	this.container = document.getElementById("editor-container");

	this.views = [];

	// Events
	this.onPageLoadedEvents = [];
	this.currentPageName = "homepage";

	this.filesRequired = true;
}

Views.prototype =  {

	printPage: function(name){	// Print Homepage + Project Tchat
		var c    = this.container;
		var self = this;

		c.innerHTML = "";

		loadFile("views/" + name + ".php", function(page){
			c.innerHTML = page;
			self.currentPageName = name;

			c.style.background = (name == "homepage") ? "#ececec" : "#fff";
			
			if(self.filesRequired){
				for(var i = 0;i < self.onPageLoadedEvents.length; i++)
					self.onPageLoadedEvents[i]({name: name});
			}
			// rangeSlider.bind(".rangeslider");
		});
	},

	// Events
	onPageLoaded: function(func){
		if(this.currentPageName != null) func({name: this.currentPageName});
		this.onPageLoadedEvents.push(func);
	},
	runEvent: function(){
		if(this.filesRequired)
			for(var i = 0; i < this.onPageLoadedEvents.length; i++)
				this.onPageLoadedEvents[i]({name: this.currentPageName});
	}

};

var Views = new Views();