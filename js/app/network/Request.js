function Request(method, data, channel){
	this.network = network;

	this.id      = guid();

	this.method  = method;
	this.data    = data || {};
	this.channel = channel || "default";
	this.mode    = "socket.io";

	// Private vars
	this.responseCallback = null;
	this.cancelled  = false;
	this.inprogress = false;
}

Request.prototype = { 

	send: function(){
		if(this.mode == "realtime"){
			this.sendToRealtimeServer();
			return false;
		}

		var conn = this.network.connection;
		
		conn.emit("request", {
			req: this.id,
			credentials: this.network.auth.getCredentials(),
			method: this.method,
			data: this.data,
		});

		this.inprogress = true;
		return true;
	},
	sendToRealtimeServer: function(){
		var ws  = this.network.realtimeConnection;
		if(ws.readyState != 1) return false;
		
		var str = this.method + "///" + this.id + "///";

		str += this.network.auth.token + ":" + this.network.auth.projectId + "///";

		for(var i = 0; i < Object.keys(this.data).length; i++){
			var key = Object.keys(this.data)[i];
			var val = this.data[key];

			str += key + ":" + val + "///";
		}

		if(str.substring(str.length - 3, str.length) == "///") str = str.substring(0, str.length - 3);

		ws.send(str);
		return true;
	},

	getChannel: function(){
		return this.channel;
	},
	getData: function(){
		return this.data;
	},
	getMethod: function(){
		return this.method;
	},
	getResponseCallback: function(){
		return this.responseCallback;
	},
	isInProgress: function(){
		return this.inprogress;
	},
	setMethod: function(method){
		this.method = method;
	},
	setMode: function(mode){
		this.mode = mode;
	},
	setResponseCallback: function(callback){
		this.responseCallback = callback;
	},

	cancel: function(){
		this.cancelled = true;
	}

};