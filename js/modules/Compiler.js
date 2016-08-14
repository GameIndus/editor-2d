function Compiler(){
	this.address = "https://gameindus.fr:20003/";
	this.connection = null;
	this.onConnect  = null;

	this.tocompile  = 0;
	this.compiled   = 0;
	this.buildNum   = -1;
	this.inprogress = false;

	this.compilationInterval = null;
	this.finishCompilerColorTimeout = null;

	this.load();
}

Compiler.prototype = {

	load: function(){
		var that = this;

		network.onConnect(function(){
			network.request("getBuildNumber", null, function(d){
				that.buildNum = d.build + 1;
			}, "compiler").send();
		});
	},

	connectToServer: function(){
		if(this.connection!=null){
			this.connection.disconnect();
			this.connection = null;
		}

		if(document.getElementById("compilationScript") != null)
			document.getElementById("compilationScript").remove();

		var self = this;
		var s = document.createElement("script");

		s.type = "text/javascript";
		s.src  = this.address + "socket.io/socket.io.js";
		s.id   = "compilationScript";
		document.head.appendChild(s);

		s.onload = function(){
			self.connection = io.connect(self.address);
			if(self.onConnect != null)
				self.onConnect();

			self.connection.on("error", function(e){
				self.connectToServer();
			});
			self.connection.on("reconnect_error", function(e){
				self.connectToServer();
			})
		}
		s.onerror = function(e){
			e.preventDefault();
			App.alert("Erreur", "La compilation a échouée, merci de contacter un administrateur.", "danger", 8);
			
			if(self.compilationInterval != null) clearInterval(self.compilationInterval);
			document.getElementById("playProjectIcon").style.color = "";

			self.inprogress = false;
		}
	},

	run: function(){
		if(this.inprogress) return false;
		if(this.buildNum == -1) return false;

		var that = this;

		// Change status
		this.inprogress = true;
		this.tocompile  = 0;
		this.compiled   = 0;
		this.runCompilationInterval();

		this.connectToServer();

		this.onConnect = function(){
			that.sendInformationsAboutProject();
			that.loadObjsToCompile();

			var interval = setInterval(function(){
				if(that.connection == null){clearInterval(interval);return false;}

				if(that.compiled >= that.tocompile){
					clearInterval(interval);
					that.finishCompilation();
				}
			}, 1000);

			if(that.connection!=null){
				that.connection.on('errorMessage', function(msg){
					that.connection.disconnect();
					that.connection = null;
					that.buildNum++;
			  		that.compiled = 0;
			  		that.inprogress = false;

			  		alert('Erreur: \r\nVous n\'avez pas respecté les conditions d\'utilisation. Merci de faire attention.');
				});
			}
		}
	},

	runCompilationInterval: function(){
		var color = "#FFF";

		document.getElementById("playProjectIcon").style.color = "";
		if(this.finishCompilerColorTimeout != null){
			clearTimeout(this.finishCompilerColorTimeout);
			this.finishCompilerColorTimeout = null;
		}

		this.compilationInterval = setInterval(function(){
			var icon = document.getElementById("playProjectIcon");
			var newColor = "#FFF";

			if(color == "#FFF")
				newColor = "#383838";

			icon.style.color = newColor;
			color = newColor;
		}, 500);
	},

	/**
	**	Before compile project
	**/
	sendInformationsAboutProject: function(){
		var that = this;

		this.connection.emit('sendProject', {
			id: App.getProject().getEditorId(), 
			name: App.getProject().getName(), 
			credentials: network.auth.getCredentials()
		});
		this.connection.on("sendProject", function(){
			that.compileTilemaps();
		});
	},

	loadObjsToCompile: function(){
		this.tocompile = 7;
	},

	/**
	**	Compiler steps
	**/
	compileScripts: function(){
		var that = this;
		this.connection.emit("compileScripts", this.projectData);
		this.connection.on("compileScripts", function(){
			that.compiled++;
			that.compileScenes();
		});
	},

	compileVisualScripts: function(){
		var that = this;
		this.connection.emit("compileVisualScripts", this.projectData);
		this.connection.on("compileVisualScripts", function(){
			that.compiled++;
		});
	},

	compileSprites: function(){
		var that = this;
		this.connection.emit("compileSprites", this.projectData);
		this.connection.on("compileSprites", function(){
			that.compiled++;
			that.compileObjectsScenes();
		});
	},

	compileTilemaps: function(){
		var that = this;
		this.connection.emit("compileTilemaps", this.projectData);
		this.connection.on("compileTilemaps", function(){
			that.compiled++;

			that.compileOptions();
		});
	},

	compileScenes: function(){
		var that = this;
		this.connection.emit("compileScenes", this.projectData);
		this.connection.on("compileScenes", function(){
			that.compiled++;
			that.compileSprites();
		});
	},

	compileObjectsScenes: function(){
		var that = this;
		this.connection.emit("compileObjectsScenes", this.projectData);
		this.connection.on("compileObjectsScenes", function(){
			that.compiled++;
			that.compileVisualScripts();
		});
	},

	compileOptions: function(){
		var that = this;
		this.connection.emit("compileOptions", this.projectData);
		this.connection.on("compileOptions", function(){
			that.compiled++;
			that.compileScripts();
		});
	},

	finishCompilation: function(){
		this.connection.disconnect();
		this.connection = null;
  		
  		var link = document.getElementById("compilationLink");
  		link.href = "https://gameindus.fr/project/play/" + App.getProject().getFormattedEditorId() + "/?build=" + this.buildNum;
  		link.click();

  		this.buildNum++;
  		this.compiled = 0;
  		this.inprogress = false;
  		
  		if(this.compilationInterval != null){
  			clearInterval(this.compilationInterval);
  			document.getElementById("playProjectIcon").style.color = "#219a3e";

  			this.finishCompilerColorTimeout = setTimeout(function(){
  				document.getElementById("playProjectIcon").style.color = "";
  			}, 5000);

  			this.compilationInterval = null;
  		}
	}

};

var compiler = new Compiler();

function formatName(a){return leftPad(parseInt(a),4)}
function leftPad(a,b){for(var c=a+"";c.length<b;)c="0"+c;return c}