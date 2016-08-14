function RangeSlider(){
	this.sliders = [];
	this.slidersInfos = {};

	this.defaultsInfos = {max: 100, min: 0, step: 1, realtimeValue: null};

	this.moving = false;
}

RangeSlider.prototype = {

	bind: function(){
		this.unbind();

		var els = document.querySelectorAll(".rangeslider");

		for(var i = 0; i < els.length; i++){
			this.sliders.push(els[i]);
			this.init(els[i]);
		}

		window.addEventListener("mouseup", this.onRangeMouseUp);
	},
	unbind: function(){
		window.removeEventListener("mouseup", this.onRangeMouseUp);

		// TODO Remove events on all sliders

		this.sliders = [];
	},


	init: function(el){
		var index = this.sliders.indexOf(el);
		if(index == -1) throw "Element " + el + " unknown.";

		var data  = el.dataset;
		var info  = {};

		info.max  = (parseFloat(data.max) || this.defaultsInfos.max);
		info.min  = (parseFloat(data.min) || this.defaultsInfos.min);
		info.step = (parseFloat(data.step) || this.defaultsInfos.step);

		this.slidersInfos[index] = info;

		delete el.dataset.max; delete el.dataset.min; delete el.dataset.step;


		// Init DOM element
		var container = document.createElement("div");
		var trigger   = document.createElement("div");

		container.className = "range-container";
		trigger.className   = "range-trigger";

		container.appendChild(trigger);
		el.appendChild(container);

		if(data.limits !== undefined){
			var pt = document.createElement("span");
			var nt = document.createElement("span");

			pt.className = "min-text";nt.className = "max-text";
			pt.innerHTML = info.min;nt.innerHTML = info.max;

			el.insertBefore(pt, container);
			el.appendChild(nt);

			delete el.dataset.limits;
		}

		if(data.realtimevalue !== undefined){
			var rv = document.createElement("span");

			rv.className = "realtime-text";
			rv.innerHTML = info.min;

			el.appendChild(rv);
			this.slidersInfos[index].realtimeValue = rv;

			delete el.dataset.realtimevalue;
		}


		// Init DOM events
		el.addEventListener("mousedown", this.onRangeMousedown);
		el.addEventListener("mousemove", this.onRangeMove);
		el.addEventListener("mouseup", this.onRangeMove);

		// Init custom value (in value attribute)
		var dv = el.getAttribute("value");
		if(dv != null){
			dv = parseFloat(dv);

			var t  = el.querySelector(".range-trigger");
			var c  = el.getBoundingClientRect();
			var cT = t.getBoundingClientRect();

			var trigPerc = ((dv - info.min) * 100) / (info.max - info.min);
			var trigLeft = (trigPerc * c.width / 100);

			if(trigLeft + (cT.width / 2) > c.width) trigLeft = c.width - (cT.width / 2);
			t.style.left = (trigLeft - cT.width / 2) + "px";

			this.updateRealtimeValue(info, trigLeft, dv);
		}
	},

	onRangeMousedown: function(e){
		rangeSlider.moving = true;

		var el = e.target;
		if(el.className == "range-container") el = el.parentNode;
		else if(el.className == "range-trigger") el = el.parentNode.parentNode;
		else if(el.className == "min-text" || el.className == "max-text") el = el.parentNode;

		rangeSlider.onRangeMove(e, el);
	},
	onRangeMove: function(e, el){
		if(!rangeSlider.moving) return false;

		if(el == null) var el = this;
		rangeSlider.updateRangeSlider(el, e);
	},
	onRangeMouseUp: function(e){
		rangeSlider.moving = false;
	},

	updateRangeSlider: function(el, e){
		var t  = el.querySelector(".range-trigger");
		var c  = el.getBoundingClientRect();
		var cT = t.getBoundingClientRect();
		var x  = e.clientX - c.left;

		if(x < 0) x = 0;
		if(x > c.width) x = c.width;

		var info = this.slidersInfos[this.sliders.indexOf(el)];
		if(info == null) info = this.defaultsInfos;

		var perc = ((x * (info.max - info.min)) / c.width) + info.min;
		var mod  = (perc % info.step);

		var f = perc - mod;
		if(info.step / 2 < mod) f += info.step;

		if(f > info.max) f = info.max;
		if(f < info.min) f = info.min;

		var trigPerc = ((f - info.min) * 100) / (info.max - info.min);
		var trigLeft = (trigPerc * c.width / 100);

		if(trigLeft + (cT.width / 2) > c.width) trigLeft = c.width - (cT.width / 2);
		if(trigLeft - (cT.width / 2) < 0) trigLeft = cT.width / 2;

		t.style.left = (trigLeft - cT.width / 2) + "px";
		el.value = f;

		this.updateRealtimeValue(info, trigLeft, f);

		var event = new CustomEvent('change', {
			"detail": {
				mouse: e,
				value: f,
				perc: trigPerc
			}
		});
		el.dispatchEvent(event);
	},
	updateRealtimeValue: function(info, trigLeft, value){
		if(info.realtimeValue != null){
			info.realtimeValue.innerHTML = this.parseNum(value);

			var irvb  = info.realtimeValue.getBoundingClientRect();
			var print = true;

			if(value == info.min || value == info.max) print = false;

			if(print) info.realtimeValue.style.left = (trigLeft - irvb.width / 2) + "px";
			else info.realtimeValue.style.left = "-60000px";
		}
	},



	parseNum: function(flt){
		function isInt(n) {
		   	return n % 1 === 0;
		}

		if(isInt(flt)) flt = Math.round(flt);
		else flt = flt.toFixed(1);
		
		return flt;
	}

};




var rangeSlider = new RangeSlider();