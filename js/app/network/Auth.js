function Auth(){
	this.token     = -1;
	this.projectId = -1;
}

Auth.prototype = {

	init: function(){
		this.token = window.token;
		window.token = undefined;
		document.getElementById("tokenScriptTag").remove();

		this.projectId = App.getProject().getEditorId();
	},

	getCredentials: function(){
		return {token: this.token, projectId: this.projectId};
	}

};