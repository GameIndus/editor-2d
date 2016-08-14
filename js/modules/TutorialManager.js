function TutorialManager(){
	// Divs
	this.overlays   = [];
	this.messageBox = null;

	this.storyMode  = false;
	this.story      = [];

	this.init();
}

TutorialManager.prototype = {

	init: function(){
		var ovsDiv = document.createElement("div");
		ovsDiv.className = "tutorial-container";
		document.getElementsByTagName("body")[0].appendChild(ovsDiv);

		var createOverlay = function(){
			var overlay = document.createElement("div");
			overlay.className = "overlay";
			overlay.setAttribute("style", "display:none;position:fixed;z-index:600;left:0;top:0;bottom:0;right:0;width:100%;height:100%;background:rgba(0,0,0,0.9);transition:ease-out .2s;");
			ovsDiv.appendChild(overlay);

			return overlay;
		}
		var createMessageBox = function(){
			var box = document.createElement("div");
			box.className = "message-box";
			box.innerHTML = '<span class="mark">Tutoriel interactif</span><div class="mascotte"></div><div class="content"><span class="title"></span><span class="message"></span><div class="btn next_button"><i class="fa fa-long-arrow-right"></i> Continuer</div></div><div class="clear"></div>';
			ovsDiv.appendChild(box);

			return box;
		}

		for(var i = 0; i < 4; i++)
			this.overlays.push(createOverlay());

		this.messageBox = createMessageBox();
	},

	cibleElement: function(o){
		if(this.overlays.length == 0) return false;
		if(this.storyMode){
			this.story.push({type: "cibleElement", element: o});
			return false;
		}

		var el = null;
		if(typeof o === "string") el = document.querySelector(o);
		else el = o;

		if(el == null){
			console.error("Error during tutorial initialization : div '" + o + "' unknown.");
			return false;
		}

		var c = el.getBoundingClientRect();

		this.cible(c.left, c.top, c.width, c.height);
	},
	cible: function(x, y, width, height){
		if(this.storyMode){
			this.story.push({type: "cible", x: x, y: y, width: width, height: height});
			return false;
		}

		var w = {width: window.innerWidth, height: window.innerHeight};
		
		var s0 = this.overlays[0].style;
		var s1 = this.overlays[1].style;
		var s2 = this.overlays[2].style;
		var s3 = this.overlays[3].style;

		s0.width  = x + "px";
		s0.height = (y + height) + "px";

		s1.top    = (y + height) + "px";
		s1.width  = w.width + "px";
		s1.height = (w.height - (y + height)) + "px";

		s2.left   = (x + width) + "px";
		s2.width  = (w.width - (x + width)) + "px";
		s2.height = (y + height) + "px";

		s3.left   = x + "px";
		s3.width  = width + "px";
		s3.height = y + "px";

		for(var i = 0; i < this.overlays.length; i++)
			this.overlays[i].style.display = "block";
	},
	dialog: function(title, message, side){
		if(this.storyMode){
			this.story.push({type: "dialog", title: title, message: message, side: side});
			return false;
		}

		this.messageBox.querySelector("span.title").innerHTML   = title;
		this.messageBox.querySelector("span.message").innerHTML = message;
		
		this.messageBox.style.display = "block";

		var x = 15, y = window.innerHeight - this.messageBox.offsetHeight - 30;
		this.messageBox.style.left    = x + "px";
		this.messageBox.style.top     = y + "px";
	},

	// Story
	begin: function(){
		this.story = [];
		this.storyMode = true;
	},
	start: function(){
		var that = this;

		function nextAction(){
			var action = that.story[0];
			that.story.splice(0, 1);
			if(action == null){ // Finish story
				that.clear();
				return false;
			} 

			switch(action.type){
				case "cible":
					that.cible(action.x, action.y, action.width, action.height);
					nextAction();
				break;
				case "cibleElement":
					that.cibleElement(action.element);
					nextAction();
				break;
				case "dialog":
					that.dialog(action.title, action.message, action.side);
					that.messageBox.querySelector(".next_button").onclick = function(){
						nextAction();
					}
				break;
			}

			document.getElementById("editor-container").style.width = (document.getElementById("editor-container").offsetWidth) + "px";
		}

		this.storyMode = false;
		this.messageBox.parentNode.show();
		nextAction();
	},


	clear: function(){
		for(var i = 0; i < this.overlays.length; i++)
			this.overlays[i].hide();

		this.messageBox.parentNode.hide();
		this.messageBox.hide();
	}

};

var tm = new TutorialManager();