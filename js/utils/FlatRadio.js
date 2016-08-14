function FlatRadio(){
	this.binds     = {};
	this.listeners = {};
}

FlatRadio.prototype = {

	bind: function(name, divId){
		var div = document.getElementById(divId);
		if(div == null) return false;

		this.binds[name] = div;
		this.prepare(name);
	},
	prepare: function(name){
		var that = this;
		var div  = this.binds[name];
		if(div == null) return false;

		var radios = div.querySelectorAll("div");

		for(var i = 0; i < radios.length; i++){
			var radio = radios[i];
			radio.onclick = function(){
				var radios = this.parentNode.querySelectorAll("div");
				var name   = this.parentNode.dataset.flatRadioName;

				for(var i = 0; i < radios.length; i++){
					radios[i].classList.remove("active");
				}

				this.classList.add("active");

				if(that.listeners[name] != null){
					var listeners = that.listeners[name];

					for(var i = 0; i < listeners.length; i++)
						listeners[i](this.getAttribute("value"));
				}
			}
		}

		div.dataset.flatRadioName = name;
	},

	onChange: function(name, callback){
		if(this.listeners[name] == null) this.listeners[name] = [];
		this.listeners[name].push(callback);
	}

};

var flatRadio = new FlatRadio();