function Sort(container, triggerCls, parentOffset){
	this.container  = container;
	this.triggerCls = triggerCls;

	this.items        = [];
	this.itemSelected = null;
	this.parentOffset = parentOffset || 1;

	// Events
	this.onSortEvents = [];
}

Sort.prototype = {

	init: function(){
		var that     = this;
		var triggers = this.container.querySelectorAll("." + this.triggerCls);

		for(var i = 0; i < triggers.length; i++){
			var trigger = triggers[i];
			trigger.dataset.index = i;
			trigger.onmousedown = function(e){
				that.beginItemMove(e, this, parseInt(this.dataset.index));
			}

			this.items.push({el: this.getParentByOffset(trigger), index: i});
		}

		this.container.onmousemove = function(e){
			e.preventDefault();
			that.itemMove(e);
			return false;
		}

		this.container.onmouseup = function(e){
			e.preventDefault();
			that.deposeItem(e);			
			return false;
		}

		this.container.onmouseleave = this.container.onmouseup;
	},

	reload: function(){
		this.container = document.getElementById(this.container.id);
		this.items     = [];
		this.itemSelected = null;
		
		this.init();
	},

	beginItemMove: function(event, el, index){
		this.getParentByOffset(el).classList.add('selected');
		this.itemSelected = {el: el, beginIndex: index, currentIndex: index};
	},

	itemMove: function(event){
		if(this.itemSelected == null) return false;
		
		var maxHeight = this.container.offsetHeight; 
		var top = event.clientY - this.container.getBoundingClientRect().top;
		
		if(top < 0) top = 0;
		if(top > maxHeight) top = maxHeight;

		var index = Math.floor(this.items.length * top / maxHeight);

		if(index == this.itemSelected.currentIndex) return false;

		this.itemSelected.currentIndex = index;
		this.items[index].index = index;
		
		// Move items in DOM
		var items = [];
		var replacedItem = null;

		this.container.innerHTML = "";
		for(var i = 0; i < this.items.length; i++){
			var item = this.items[i];
			item.lastIndex = item.index;

			if(item.index == this.itemSelected.beginIndex) continue;

			if(index == item.index){
				replacedItem = item;
				items.push(this.items[this.itemSelected.beginIndex]);
			}else{
				items.push(item);		
			}
		}

		if(replacedItem != null){
			var diff = -1;
			if(replacedItem.index < this.itemSelected.beginIndex) diff = 1;
			items.splice(replacedItem.index + diff, 0, replacedItem);
		}else{
			items.splice(this.itemSelected.beginIndex, 0, this.items[this.itemSelected.beginIndex]);
		}

		for(var i = 0; i < items.length; i++){
			this.container.appendChild(items[i].el);
		}

		// Dispatch event
		for(var i = 0; i < this.onSortEvents.length; i++)
			this.onSortEvents[i](this.itemSelected);
	},

	deposeItem: function(event){
		if(this.itemSelected == null) return false;
		this.getParentByOffset(this.itemSelected.el).classList.remove('selected');
		this.itemSelected = null;
	},

	// Events
	onSort: function(callback){
		this.onSortEvents.push(callback);
	},

	// Utils
	getParentByOffset: function(el){
		var elf = el;

		for(var i = 0; i < this.parentOffset; i++)
			elf = elf.parentNode;

		return elf;
	}

};