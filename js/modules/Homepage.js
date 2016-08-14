function Homepage(){
	this.modulePerLine = 3;
	this.interval = null;

	this.init();
}

Homepage.prototype = {

	init: function(){
		var that = this;

		Views.onPageLoaded(function(e){
			if(e.name == "homepage"){
				that.hook();
			}else{
				if(that.interval != null) clearInterval(that.interval);
				that.interval = null;
			}
		});
	},
	hook: function(){
		// this.refreshModules();
		this.loadUsersInterval();
	},

	loadUsersInterval: function(){
		var that = this;
		if(this.interval != null) return false;

		var intFunc = function(){
			var req = network.request("getConnectedUsers", {username: tchat.username}, null, "tchat", "realtime");
			if(req != null && typeof(req.send) === "function") req.send();
		};

		network.on("getConnectedUsers", function(d, req){	
			if(parseInt(d.roomId) != network.auth.projectId) return false;
			var users    = JSON.parse(LZString.decompressFromEncodedURIComponent(d.users));

			var cont = document.getElementById("homepage-userslist");
			if(cont == null) return false;

			var userDivs = cont.querySelectorAll(".user");

			for(var i = 0; i < userDivs.length; i++){
				var ud = userDivs[i];
				var username = ud.querySelector(".username").innerHTML;

				if(Object.keys(users).indexOf(username) == -1){
					ud.querySelector(".status").classList.add("disconnected");
					ud.querySelector(".status").innerHTML = '<span style="color:#c0392b">Déconnecté</span>';
					ud.querySelector(".status-icon i.fa").setStyle("color", "#c0392b");
				}else{
					var time = users[username].connectTime;
					var diff = Date.now() - time;

					if(diff < 0) diff = 0;

					ud.querySelector(".status").classList.remove("disconnected");
					ud.querySelector(".status").innerHTML = '<span style="color:#2ecc71">Connecté</span><br><span style="font-size:0.9em">depuis ' + timeToString(diff, true) + '</span>';
					ud.querySelector(".status-icon i.fa").setStyle("color", "#2ecc71");
				}
			}
		});

		this.interval = setInterval(intFunc, 10000);
		setTimeout(function(){
			intFunc();
		}, 2000);
	},

	refreshModules: function(){
		var cont    = document.querySelector("main #editor-container .homepage-container .homepage-modules");
		var modules = cont.querySelectorAll(".module");

		var cS = {w: cont.offsetWidth, h: cont.offsetHeight};
		var n  = modules.length;

		for(var i = 0; i < modules.length; i++){
			var m = modules[i];

			
		}
	},

};

var homepage = new Homepage();