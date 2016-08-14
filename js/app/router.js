function Router(){
	this.page = "home";

	this.views 	     = [];
	this.currentView = null;
}

Router.prototype = {

	init: function(){
		var that = this;
	},

	getCurrentView: function(){
		return this.currentView;
	},
	getView: function(type, filename){
		var view = null;
		if(filename == null) filename = "";

		for(var i = 0; i < this.views.length; i++){
			var v = this.views[i];
			if(v.getName() == filename && v.getType() == type){view = v;break;}
		}

		return view;
	},
	hasSameView: function(type, filename){
		var cv = this.getCurrentView();
		if(cv == null) return false;

		return (cv.getName() == filename && cv.getType() == type);
	},
	changeViewTo: function(type, filename){
		if(type == "home") filename = "home";

		if(this.hasSameView(type, filename)) return false;
		this.routing(type, filename);
	},
	removeCurrentView: function(){
		var view = this.currentView;
		if(view == null) return false;

		this.views.splice(this.views.indexOf(view), 1);
	},
	removeView: function(type, filename){
		var view = this.getView(type, filename);
		if(view == null) return false;

		this.views.splice(this.views.indexOf(view), 1);
	},

	routing: function(type, filename){
		var type 	 = type || "";
		var filename = filename || "";

		if(this.getCurrentView() != null) this.getCurrentView().save();

		var v = this.getView(type, filename) || new View(type, filename);

		this.currentView = v;
		v.onHtmlLoaded(function(){
			v.print();
		});

		this.views.push(v);
	}

};