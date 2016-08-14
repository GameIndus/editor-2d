function Application(){
	// Managers
	this.filesManager  = new FilesManager();
	this.soundsManager = new EditorSoundsManager();

	this.router = new Router();

	this.loadedEvents = new Array();
	this.projectInfo  = null;

	this.init();
}

Application.prototype = {

	init: function(){
		var self = this;

		window.addEventListener("load", function(){
			self.prepare();
		});
	},

	prepare: function(){
		this.prepareHeader();
		this.prepareModules();

		// Window events
		window.addEventListener("beforeunload", function(e){
			if(Tabs.getTabs().length == 1 && Tabs.getTab("Options", "options") != null) return true;
			if(document.querySelector(".loader-overlay") != null) return true;

			if(Tabs.getTabs().length > 0){
				var confirmationMessage = "Vous êtes sur le point de perdre l'ensemble des données non sauvegardées.";
			  	e.returnValue = confirmationMessage;
			  	return confirmationMessage;
			}
		});
		window.addEventListener("resize", this.resize);

		Tabs.init();
		Sidebar.init();

		window.gameInstance  = Game;

		console.info("Tu aimerais voir comment le système fonctionne ? Rejoins notre équipe pour nous aider à construire le futur de GameIndus : https://gameindus.fr/about/jobs !");
	},
	prepareHeader: function(){
		var menu = document.querySelector(".account-menu-container");
		var caretMenu = document.getElementById("dispatchOpeningAccountMenu");

		if(caretMenu == null) return false;
			
		caretMenu.addEventListener("mouseenter", function(e){
			caretMenu.classList.add("active");
		});
		caretMenu.addEventListener("mouseleave", function(e){
			if(e.getMousePosition().getY() >= (this.offsetTop + this.offsetHeight)) return false;
			caretMenu.classList.remove("active");
		});
		menu.addEventListener("mouseleave", function(e){
			caretMenu.classList.remove("active");
		});
	},
	prepareModules: function(){
		this.getRouter().init();
		this.getFilesManager().load();
		this.getSoundsManager().load();

		network.connect();
		tchat.load();
	},

	newGameInstance: function(){
		var gi = new window.gameInstance();

		gi.loader.step = 10;
		return gi;
	},
	getProject: function(){
		if(this.projectInfo != null) return this.projectInfo;
		this.projectInfo = {
			id: document.getElementById("projectRealId").value,
			editorId: document.getElementById("projectId").value,
			name: document.getElementById("projectName").value,

			getId: function(){return this.id;},
			getEditorId: function(){return this.editorId;},
			getFormattedEditorId: function(){return formatName(this.editorId);},
			getName: function(){return this.name;},
		};

		document.getElementById("projectRealId").remove();
		document.getElementById("projectId").remove();
		document.getElementById("projectName").remove();

		return this.projectInfo;
	},


	getFilesManager: function(){return this.filesManager;},
	getSoundsManager: function(){return this.soundsManager;},
	getRouter: function(){return this.router;},

	getCurrentFile: function(){return this.getFilesManager().currentFile;},


	resize: function(){
		var main 		= document.getElementsByTagName("main")[0];
		var sidebar     = document.getElementById("sidebar");
		var editor      = document.getElementById("editor-container");
		var rightPanels = document.getElementsByClassName("rightPanel");
		var editorBars  = document.getElementsByClassName("editor-bar");
		var footer      = document.getElementsByTagName("footer")[0];

		var mainHeight  = window.innerHeight - 60;
		var panelsWidth = 0, barsHeight = 0;
		
		sidebar.style.height = mainHeight + "px";
		main.style.height = mainHeight + "px";	

		editor.style.height = (mainHeight + 5) + "px";	
		editor.style.width = (window.innerWidth - sidebar.getWidth()) + "px";

		footer.style.width = (window.innerWidth - sidebar.getWidth()) + "px";
		footer.style.left = sidebar.getWidth() + "px";

		for(var i = 0;i < rightPanels.length; i++){
			rightPanels[i].style.height = (mainHeight + 5) + "px";
			panelsWidth += rightPanels[i].offsetWidth;
		}
		for(var i = 0; i < editorBars.length; i++)
			barsHeight += editorBars[i].offsetHeight;

		if(Game != null && Game.loader != null && Game.loader.isLoaded) 
			Game.setCanvasSize((window.innerWidth - (Sidebar.getWidth() + panelsWidth)), mainHeight - barsHeight);
	},

	alert: function(title, message, type, time){
		type = typeof type !== 'undefined' ? type : "info";
		time = typeof time !== 'undefined' ? time : 5;

		var self           = this;
		var alertContainer = document.querySelector(".app-notif-container");
		var animDelay      = 300;

		if(this.alertClosingTimeout != null){
			clearTimeout(this.alertClosingTimeout);
			this.removeAlert();

			setTimeout(function(){
				self.alert(title, message, type, time);
			}, 300);

			return false;
		}

		alertContainer.classList.add("active");
		if(alertContainer.classList.contains("danger")) alertContainer.classList.remove("danger");
		if(alertContainer.classList.contains("info")) alertContainer.classList.remove("info");
		if(alertContainer.classList.contains("success")) alertContainer.classList.remove("success");
		if(alertContainer.classList.contains("warning")) alertContainer.classList.remove("warning");
		alertContainer.classList.add(type);

		setTimeout(function(){
			alertContainer.querySelector("span.title").innerHTML = title;
			alertContainer.querySelector("span.content").innerHTML = message;
			alertContainer.classList.add("animFinished");
		}, animDelay);

		if(time != null && time > 0){
			time = time * 1000 + animDelay;

			this.alertClosingTimeout = setTimeout(function(){
				self.removeAlert();
			}, time);
		}
	},
	modal: function(title, message, callback, width){
		var alert = document.getElementById("alert-container");
		var d = {div: alert};

		alert.innerHTML = '<div id="alert"><div id="closeAlert" class="closeAlert"><i class="fa fa-times"></i></div><p class="title">'+title+'</p><div class="content">'+message+'</div></div>'
		alert.style.display = "block";

		var alertBox = alert.childNodes[0];
		if(width != null) alertBox.style.width = width + "px";
		var marginTop = window.innerHeight/2 - alertBox.offsetHeight/2;
		alertBox.style.marginTop = marginTop + "px";

		App.getSoundsManager().tiplike.play();

		var closes = document.getElementsByClassName("closeAlert");
		for(var i=0;i<closes.length;i++){
			closes[i].addEventListener("click", function(e){
				callback(d);
				alert.style.display = "none";
				App.getSoundsManager().knuckle.play();
			});
		}

		alert.onkeydown = function(e){
			if(e.keyCode==13){
				callback(d);
				alert.style.display = "none";
				alert.removeEventListener("keydown", this);
			}
		}
	},
	error: function(message, reason){
		if(document.querySelector(".loader-overlay") != null) return false;
		
 		var body    = document.getElementsByTagName("body")[0];
		var overlay = document.createElement("div");
		var logoInt = null;

		overlay.className = "loader-overlay";
		overlay.innerHTML = '<img src="https://gameindus.fr/imgs/logo/logo-medium.png" alt="Logo GameIndus">';

		overlay.innerHTML += '<h1 class="error">' + message + '</h1><div class="reason">' + ((reason != null) ? reason : '') + '</div>';
		body.appendChild(overlay);

		var image   = overlay.querySelector("img");

		image.style.display    = "block";
		image.style.transition = "none";

		image.style.left   = (window.innerWidth / 2 - image.width / 2) + "px";
		image.style.top    = (window.innerHeight / 2 - image.height / 2 - 70) + "px";
		overlay.querySelector("h1.error").style.top = (window.innerHeight / 2 - image.height / 2 + 30) + "px";
		overlay.querySelector(".reason").style.top = (window.innerHeight / 2 - image.height / 2 + 70) + "px";

		this.lastDocumentTitle = document.title.slice(0);
		document.title = "GameIndus | Erreur: " + message.toLowerCase() + ".";

		document.getElementsByTagName("header")[0].hide();
		document.getElementsByTagName("main")[0].hide();
		document.getElementsByTagName("footer")[0].hide();
	},

	removeAlert(){
		var alertContainer = document.querySelector(".app-notif-container");

		alertContainer.querySelector("span.title").innerHTML = "";
		alertContainer.querySelector("span.content").innerHTML = "";

		alertContainer.style.opacity = 1;
		alertContainer.style.top     = "50px";
		alertContainer.style.padding = "0px";
		alertContainer.classList.remove("active");
		alertContainer.classList.remove("animFinished");

		setTimeout(function(){
			alertContainer.removeAttribute("style");
		}, 200);

		this.alertClosingTimeout = null;
	},
	removeModal: function(){
		var modal = document.body.querySelector("#alert-container");
		if(modal != null) modal.hide();
	},
	removeErrorOverlay: function(){
		var overlay = document.querySelector(".loader-overlay");
		if(overlay == null) return false;

		overlay.remove();

		document.title = this.lastDocumentTitle;
		document.getElementsByTagName("header")[0].show();
		document.getElementsByTagName("main")[0].show();
		document.getElementsByTagName("footer")[0].show();
	},
	
	onFinishedLoaded: function(callback){
		this.loadedEvents.push(callback);
	}

};

var App = new Application();