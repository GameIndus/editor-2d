function EditorSoundsManager(){

}

EditorSoundsManager.prototype = {

	load: function(){
		this.chatMessage     = new Audio("assets/chat_message.mp3");
		this.closeAlertHover = new Audio("assets/close_alert_hover.mp3");
		this.alertClosed     = new Audio("assets/alert_closed.mp3");
		this.error           = new Audio("assets/error.mp3");
		this.putdown         = new Audio("assets/putdown.mp3");
		this.knuckle         = new Audio("assets/knuckle.mp3");
		this.trashbin        = new Audio("assets/trashbin.mp3");
		this.tiplike         = new Audio("assets/tiplike.mp3");
		
		this.chatMessage.volume     = 0.2;
		this.closeAlertHover.volume = 0.2;
		this.alertClosed.volume     = 0.2;
		this.error.volume           = 0.2;
		this.putdown.volume         = 0.2;
		this.knuckle.volume         = 0.2;
		this.trashbin.volume        = 0.2;
		this.tiplike.volume         = 0.2;
	}

};