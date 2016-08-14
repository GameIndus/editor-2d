function Exporter(){
	this.init();
}

Exporter.prototype = {

	init: function(){},

	clickOnPlatform: function(platformName){
		var ec        = document.getElementById("export-container");
		var platforms = ec.querySelectorAll(".platform");
		var platform  = null;

		if(platformName == "ios" || platformName == "android") return false;

		for(var i = 0; i < platforms.length; i++){
			platforms[i].classList.remove("active");
			if(platforms[i].dataset.platform == platformName) platform = platforms[i];
		}

		if(platform == null) return false;
		platform.classList.add("active");

		this.loadSettingsFor(platformName);
	},
	loadSettingsFor: function(platformName){
		var that      = this;
		var ec        = document.getElementById("export-container");
		var settings  = ec.querySelector(".content .settings");

		for(var i = 0; i < settings.querySelectorAll(".settings-section").length; i++) settings.querySelectorAll(".settings-section")[i].hide();
		ec.querySelector("#export_button").hide();

		var section = settings.querySelector(".settings-" + platformName);

		if(section == null) return false;

		section.show();
		ec.querySelector("#export_button").show();

		ec.querySelectorAll(".inline-select-container .option").toArray().forEach(function(option){
			option.onclick = function(){
				this.parentNode.querySelectorAll(".option").toArray().forEach(function(option2){
					option2.classList.remove("active");
				});

				this.classList.add("active");
			}
		});

		ec.querySelector("#export_button").onclick = function(){
			if(!this.classList.contains("can-export")) return false;
			this.classList.add("disabled");
			this.innerHTML = '<i class="fa fa-spin fa-spinner"></i> En cours...';

			var optionSelected = document.getElementById("select-compression").querySelector(".active");
			if(optionSelected != null) that.export("web", optionSelected.getAttribute("value"));
		}
	},
	open: function(){
		var that = this;

		var ec = document.getElementById("export-container");
		ec.show();

		var plts = ec.querySelectorAll(".platform");
		for(var i = 0; i < plts.length; i++){
			plts[i].onclick = function(){
				that.clickOnPlatform(this.dataset.platform);
			}
		}

		ec.querySelector(".close").onclick = function(){
			this.parentNode.parentNode.parentNode.hide();
		}
	},

	export: function(type, compression){
		var that = this;
		if(this.inprogress) return false;
		this.inprogress = true;

		function send(){
			compiler.connection.emit("exportGame", {
					type: type, 
					compression: compression, 
					credentials: network.auth.getCredentials(), 
					projectId: App.getProject().getFormattedEditorId()
			});
			compiler.connection.on("exportGame", function(d){
				compiler.connection.off("exportGame");

				var link = document.getElementById("compilationLink");
		  		link.href = "https://gameindus.fr/project/download/" + App.getProject().getEditorId();
		  		link.click();

		  		document.getElementById("export_button").classList.remove("disabled");
		  		document.getElementById("export_button").innerHTML = '<i class="fa fa-rocket"></i> Exporter';
		  		that.inprogress = false;
			});
		}

		if(compiler.connection != null && compiler.connection.readyState == 1){
			send();
		}else{
			compiler.connectToServer();
			compiler.onConnect = function(){
				send();
			}
		}
	}

};

var exporter = new Exporter();