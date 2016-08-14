function Tchat(){
	this.username;

	// Scroll
	this.defaultHeight  = 0;
	this.chatBoxReduced = true;
	this.neverOpened = true;

	// Events
	this.user_post_message = false;

	this.loaded = false;
}

Tchat.prototype = {

	load: function(){
		if(this.loaded) return false;

		var that = this;

		if(document.getElementById("username") != null)
			this.username = document.getElementById("username").value;

		this.loadEvents();

		network.realtimeConnection.addEventListener("open", function(){
			that.checkForMessages();
		});
		if(network.realtimeConnection.readyState == 1) this.checkForMessages();

		this.loaded = true;
	},

	loadEvents: function(){
		var that = this;
		var box = document.getElementsByClassName("chatbox")[0];
		if(box == null) return false;

		var iconToggle = document.getElementById("chatbox_toggle");

		iconToggle.onclick = function(e){
			var iconName = "fa-minus";

			if(that.chatBoxReduced){
				box.classList.remove("reduced");
				box.removeAttribute("style");

				if(that.neverOpened)
					that.scrollBottom();

				that.chatBoxReduced = false;
				that.neverOpened = false;
			}else{
				box.classList.add("reduced");
				that.chatBoxReduced = true;
				iconName = "fa-plus";
			}

			this.className = "fa box-icon "+iconName;
			
			e.preventDefault();return false;
		}
	},

	submitForm: function(form){
		if(this.username == null || this.username.isEmpty()) return false;

		this.sendMessage();
	},

	addMessage: function(data){
		var container = document.getElementById("messages");
		if(data.message == "" || data.message == null) return false;

		// Check if the message is has the connected user
		var classOwn = "", clearOwn = "";
		if(data.username === this.username){classOwn = " own";clearOwn = "<div class='clear'></div>";}

		// Parse message to print properly links
		var urlRegex = /(https?:\/\/[^\s]+)/g;
		data.message = data.message.replace(urlRegex, function(url){
			return '<a target="_blank" href="' + url + '">' + url + '</a>';
		});
		urlRegex = /(http?:\/\/[^\s]+)/g;
		data.message = data.message.replace(urlRegex, function(url){
			return '<a target="_blank" href="' + url + '">' + url + '</a>';
		});

		var smileys = {
			"<3" : 10,
			":D" : 11,
			"zzz" : 17
		};

		for(var i = 0; i < Object.keys(smileys).length; i++)
			data.message = data.message.replaceAll(Object.keys(smileys)[i], "<img style='display:inline-block;margin:0 3px' src='https://icons.iconarchive.com/icons/seanau/flat-smiley/16/Smiley-" + smileys[Object.keys(smileys)[i]] + "-icon.png'>");

		var msgCtn = '<div class="message'+classOwn+'"><span class="username">'+data.username+'</span><img src="https://gameindus.fr/imgs/avatars/?username='+data.username+'" class="avatar">'+clearOwn+'<span class="text">'+data.message+'</span><span class="date">'+this.formatTimestamp(data.timestamp)+'</span></div><div class="clear"></div>';

		container.innerHTML += msgCtn;

		this.scrollBottom();
	},

	sendMessage: function(){
		if(this.username == null) return false;

		var input   = document.getElementById("post_message_input");
		var message = input.value + "";

		input.value = "";
		if(message.isEmpty()){return false;}

		network.request("sendTchatMessage", {message: LZString.compress(message)}, null, "tchat", "realtime").send();
	},

	checkForMessages: function(){ 
		var that = this;

		network.request("getLastestMessages", {username: this.username}, null, "tchat", "realtime").send();
		network.on("getLastestMessages", function(d, req){	
			if(parseInt(d.roomId) != network.auth.projectId) return false;
			var messages = JSON.parse(LZString.decompressFromEncodedURIComponent(d.messages));

			for(var i = 0; i < messages.length; i++){
				that.addMessage(messages[i]);
			}
		});

		network.on("sendTchatMessage", function(d, req){
			if(d.error) throw "Error: " + d.error;
			if(d.sended) return false;

			if(d.sender) d.username = that.username;
			
			if(d.message != null) d.message = LZString.decompress(d.message);
			if(d.timestamp != null) d.timestamp = parseInt(d.timestamp);

			// Update chatbox
			var chatbox = document.getElementById("messages").parentNode.parentNode;
			if(chatbox != null && chatbox.classList.contains("reduced")){
				chatbox.setStyle("border-top-color", "#e67e22");
			}


			that.addMessage(d);
			that.playMessageSound();
		});
	},

	stop: function(){
		if(this.connection==null) return false;
		this.connection.disconnect();		

		this.connection = null;
	},

	formatTimestamp: function(timestamp){
		var date    = new Date(timestamp);
		var day     = date.getDate();
		var hours   = date.getHours();
		var minutes = "0" + date.getMinutes();

		function fd(n){
		    return n > 9 ? "" + n: "0" + n;
		}

		var month = new Array();
		month[0]="Jan",month[1]="Fev",month[2]="Mar",month[3]="Avr",month[4]="Mai",month[5]="Juin",month[6]="Juil",month[7]="Ao\xfbt",month[8]="Sep",month[9]="Oct",month[10]="Nov",month[11]="Dec";
		var n = month[date.getMonth()];

		return fd(day)+" "+n+" / "+hours+":"+minutes.substr(-2);
	},

	scrollBottom: function(){
		// Update scrollY
		var container = document.getElementById("messages");
		container.scrollTop = container.scrollHeight;
	},

	playMessageSound: function(){
		// Player message sound
		var a = App.getSoundsManager().chatMessage;
		if(a == null) return false;

		a.playbackRate = 4;
		a.play();
	}

};

var tchat = new Tchat();