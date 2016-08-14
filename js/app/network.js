function EditorNetwork(){
	this.address      = "https://gameindus.fr:20001/";
	this.realtimePort = 20004;

	this.clientID  = null;

	this.auth = new Auth();

	this.queuedRequests    = new Array();
	this.requests          = new Array();
	this.realtimeListeners = {};

	this.connection         = null;
	this.realtimeConnection = null;
	this.onConnectEvents    = new Array();
	this.onErrorEvent       = null;

	this.disableReconnection = false;
}

EditorNetwork.prototype = {

	connect: function(){
		var that = this;
		var s = document.createElement("script");

		s.type = "text/javascript";
		s.src = this.address + "socket.io/socket.io.js";
		document.head.appendChild(s);

		s.onload = function(){
			that.connection = io.connect(that.address, {secure: true});

			that.connection.emit("getSocketID");
			that.connection.on('getSocketID', function(obj){
				that.clientID = obj.id;
			});

			for(var i = 0; i < that.onConnectEvents.length; i++)
				that.onConnectEvents[i](that.connection);

			that.loadErrorEvent();
			that.checkForRequest();
			
			that.connection.on("connect_error", function(e){
				App.error("Erreur de connexion", "Impossible de rejoindre nos serveurs. Tentative de reconnexion...");
			});
			that.connection.on("disconnect", function(e){
				that.connection = null;
				that.reconnect();
			});
		}
		s.onerror = function(e){
			e.preventDefault();
			this.remove();

			App.onFinishedLoaded(function(){
				console.error("[Network] Error: Connection to the server failed.");
				App.error("Erreur de connexion", "Impossible de rejoindre nos serveurs. Tentative de reconnexion...");

				that.reconnect();
			});

			if(that.onErrorEvent != null)
				that.onErrorEvent({code: 404, msg: "Connection to the server failed."});
		}
		
		this.connectToRealtimeServer();
		this.auth.init();
	},
	reconnect: function(){
		var self = this;
		if(this.reconnectTimeout != null) return false;

		function retry(){
			self.reconnectTimeout = setTimeout(function(){
				self.reconnectTimeout = null;
				if(self.connection == null) self.reconnect();
			}, 1000);
		}

		if(this.disableReconnection){retry();return false;}

		try{
			var s = document.createElement("script");
			s.type = "text/javascript";
			s.src = this.address + "socket.io/socket.io.js";
			document.head.appendChild(s);

			s.onload = function(){
				self.connection = io.connect(self.address, {secure: true});

				self.connection.emit("getSocketID");
				self.connection.on('getSocketID', function(obj){
					self.clientID = obj.id;
				});

				for(var i = 0; i < self.onConnectEvents.length; i++)
					self.onConnectEvents[i](self.connection);

				self.checkForRequest();

				App.removeErrorOverlay();
				App.alert("Editeur connecté", "La connexion vient d'être rétablie, l'éditeur vient d'être relancé.", "success");
				if(App.getRouter().getCurrentView() != null) App.getRouter().getCurrentView().refresh();
			}
			s.onerror = function(){
				this.remove();
				retry();
			}
		} catch(e){
			this.connection = null;
			retry();
		}
	},
	connectToRealtimeServer: function(){
		var that = this;
		var ws   = new WebSocket("wss://gameindus.fr:" + this.realtimePort + "/");
		this.realtimeConnection = ws;

		ws.onopen = function(){
			that.checkForRealtimeRequest();
		}
		ws.onclose = function(){
			console.error("[Network] Error: Connection to the realtime server failed.");
			App.error("Erreur de connexion", "Impossible de rejoindre nos serveurs. Veuillez rafraîchir la page.");
		}

		ws.onerror = ws.onclose;
	},
	disconnect: function(force){
		if(this.connection == null) return false;
		if(force) this.disableReconnection = true;
		this.connection.disconnect();
	},
	refresh: function(){
		this.disconnect();
		this.connect();
	},


	loadErrorEvent: function(){
		this.connection.on('sys-error', function(msg){
			if(msg == "system_hack"){
				// window.location = "http://gameindus.fr/account/projects?err=connectionHackServer";
				// return false;
			}else if(msg == "bad_authentification"){
				App.error("Erreur du serveur", "Vous n'avez pas été correctement authentifié. Contactez un administrateur.");
			}else{
				App.error("Erreur du serveur", msg);
			}
		});
	},

	checkForRequest: function(){
		if(this.connection == null) return false;
		var that = this;

		var c = this.connection;

		c.off("request");
		c.on("request", function(d){
			for(var i = 0; i < that.requests.length; i++){
				var req = that.requests[i];
				if(req.id !== d.req) continue;
				if(!req.cancelled && req.isInProgress() && req.getResponseCallback()) req.getResponseCallback()(d.response, d);

				req.inprogress = false;
			}
		});
	},
	checkForRealtimeRequest: function(){
		if(this.realtimeConnection == null) return false;
		var self = this;

		var fromString = function(str){
			var parts = str.split("///");
			if(parts.length < 3) return null;

			var method = parts[0];
			parts.splice(0, 1);

			// Save request ID
			var req = parts[0];
			parts.splice(0, 1);

			var datas = {};

			for(var i = 0; i < parts.length; i++){
				var part = parts[i];
				var subParts = part.split(":");

				var value = subParts[1];
				
				if(value == 'true') value = true;
				else if(value == 'false') value = false;

				datas[subParts[0]] = value;
			}

			return {
				method: method,
				req: req,
				datas: datas,

				isSender: function(){
					return this.datas.sended || false;
				}
			};
		};

		var c = this.realtimeConnection;
		c.onmessage = function(e){
			var d = fromString(e.data);
			var request = self.getRequestById(d.req);

			if(request != null && request.responseCallback != null) request.responseCallback(d.datas);

			if(self.realtimeListeners[d.method] == null) return false;

			for(var i = 0; i < self.realtimeListeners[d.method].length; i++){
				var listener = self.realtimeListeners[d.method][i];
				listener(d.datas, d);
			}
		};

		// Connect & verify if user already connected
		this.on("connect", function(d, req){
			if(!d.connected){
				App.error("Connexion à l'éditeur impossible", "Une erreur s'est produite lors de la connexion.");
			}
		});
		this.on("user_connect_error", function(d, req){
			if(d.error){
				// Close all connections
				self.disconnect(true);
				self.realtimeConnection.close();

				App.error("Connexion à l'éditeur interrompue", "Un utilisateur vient de se connecter avec votre pseudonyme.");
			}
		});
		this.request("connect", {connection: true, username: document.getElementById("username").value}, null, "realtime", "realtime").send();

		// Send queued requests
		this.queuedRequests.forEach(function(request){
			request.send();
		});
		this.queuedRequests = new Array();
	},



	request: function(method, data, callback, channel, mode){
		if(this.connection == null || this.pid == -1){
			if(mode != "realtime") return false;
			else{
				if(this.realtimeConnection == null) return false;
			}
		}

		if(data == null || Object.keys(data) == null || Object.keys(data).length == 0) data = {nothing: true};

		var r = new Request(method, data, channel);
		if(mode != undefined) r.setMode(mode);
		r.setResponseCallback(callback);

		if(mode == "realtime" && this.realtimeConnection.readyState != 1){
			this.queuedRequests.push(r);
			this.requests.push(r);
			return {send: function(){}};
		}

		this.requests.push(r);

		return r;
	},
	getRequestById: function(requestId){
		var r = null;
		this.requests.forEach(function(request){
			if(request.id == requestId)
				r = request;
		});

		return r;
	},
	getChannel: function(channel){
		var r = [];
		for(var i = 0; i < this.requests.length; i++)
			if(this.requests[i].getChannel() == channel) r.push(this.requests[i]);
		return r;
	},
	clearChannel: function(channel){
		for(var i = 0; i < this.requests.length; i++){
			var req = this.requests[i];
			if(req.getChannel() == channel) req.cancel();
		}
	},

	on: function(method, callback){
		if(this.realtimeListeners[method] == null) this.realtimeListeners[method] = [];

		this.realtimeListeners[method].push(callback);
	},


	onConnect: function(callback){
		this.onConnectEvents.push(callback);

		if(this.connection!=null){
			callback(this.connection);
		}
	},
	onError: function(callback){
		this.onErrorEvent = callback;
	}

};

var network = new EditorNetwork();