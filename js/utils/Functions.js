function loadFile(file, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', file);

    xhr.addEventListener('readystatechange', function() {
        if ((xhr.readyState === 4 || xhr.readyState === 0) && xhr.status === 200){
            callback(xhr.responseText);
        }
    }, false);

    xhr.send(null);
}
function loadJSON(){
}
function loadJSON(path, success, error){
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                if (success){
                    if(xhr.responseText == "") xhr.responseText = "{}";
                    success(JSON.parse(xhr.responseText));
                }
            } else {
                if (error)
                    error(xhr);
            }
        }
    };
    path = path.replace("?", "?t=" + document.getElementById("sid").value + "&");

    xhr.open("GET", path, true);
    xhr.send();
}
function isInt(n){
	return (typeof n === 'number' && (n % 1) === 0);
}

function formatDate(timestamp){
	var date = new Date(timestamp);

	return pad(date.getDate(), 2) + "/" + pad(date.getMonth()+1, 2) + "/" + date.getFullYear();
}
function timeToString(time, simple){
	time = time / 1000;
	if(time < 20) return "quelques instants";

	var sec = time;
	var min = Math.floor(sec / 60);
	var hrs = Math.floor(min / 60);
	var day = Math.floor(hrs / 24);
	var wee = Math.floor(day / 7);

	if(simple){
		if(min <= 0) return Math.round(sec) + "sec";
		else if(hrs <= 0) return Math.round(min) + "min";
		else if(day <= 0) return Math.round(hrs) + "h";
		else if(wee <= 0) return Math.round(day) + "j";
		else return Math.round(wee) + " semaine" + ((wee > 1) ? "s" : "");
	}else{
		if(min <= 0) return sec + " seconde" + ((sec > 1) ? "s" : "");
		else if(hrs <= 0) return min + " minute" + ((min > 1) ? "s" : "");
		else if(day <= 0) return hrs + " heure" + ((hrs > 1) ? "s" : "");
		else if(wee <= 0) return day + " jour" + ((day > 1) ? "s" : "");
		else return wee + " semaine" + ((wee > 1) ? "s" : "");
	}
}


function formatFilename(str){
	if(str == null) return "";
	return str.toString().replaceAll(" ", "-").toLowerCase();
}

function guid(){
	var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === "function"){
        d += performance.now(); //use high-precision timer if available
    }
    var uuid = 'xxxxxxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

function alertRightNotif(message, type){
	var alert  = document.getElementById("right-notif");

	var icon = "<i class='fa fa-times'></i>";

	if(type == "info") icon = "<i class='fa fa-info-circle'></i>";
	else if(type == "success") icon = "<i class='fa fa-check'></i>";
	else if(type == "error") icon = "<i class='fa fa-times'></i>";

	alert.className = type;
	alert.innerHTML = icon + " " + message;
	alert.style.display = "block";
}
function removeRightNotif(){
	var alert  = document.getElementById("right-notif");
	alert.className = "";alert.innerHTML = "";
	alert.style.display = "none";
}

function clone_object(o){
    var n=Object.create(
        Object.getPrototypeOf(o),
        Object.getOwnPropertyNames(o).reduce(
            function(prev,cur){
                prev[cur]=Object.getOwnPropertyDescriptor(o,cur);
                return prev;
            },
            {}
        )
    );
    if(!Object.isExtensible(o)){Object.preventExtensions(n);}
    if(Object.isSealed(o)){Object.seal(n);}
    if(Object.isFrozen(o)){Object.freeze(n);}

    return n;
}
function arrayClone( arr ) {

    var i, copy;

    if( Array.isArray( arr ) ) {
        copy = arr.slice( 0 );
        for( i = 0; i < copy.length; i++ ) {
            copy[ i ] = arrayClone( copy[ i ] );
        }
        return copy;
    } else if( typeof arr === 'object' ) {
        throw 'Cannot clone array containing an object!';
    } else {
        return arr;
    }

}

function getDomain(){
	var pathArray = location.href.split( '/' );
	var protocol = pathArray[0];
	var host = pathArray[2];
	return protocol + '//' + host;
}

function removeKey(obj, keyToRemove){
    var res = {};

    for(var key in obj){
        if(obj.hasOwnProperty(key)){
            var val = obj[key];

            if(typeof(val) === 'object'){
                res[key] = removeKey(val, keyToRemove);
            }else{
                if(key != keyToRemove)
                    res[key] = val;
            }
        }
    }

    return res;
}

function debounce(callback, delay){
	var timer = null;

	return function(){
		var context = this;
		clearTimeout(timer);
		var args = arguments;

		timer = setTimeout(function(){
			callback.apply(context, args);
		}, delay);
	}
}

function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
      deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date,
        args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}


/**
 * 	Cookies
 */
function createCookie(name, value, days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}
function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}
function eraseCookie(name) {
	createCookie(name,"",-1);
}

String.prototype.replaceAll=function(a,b){return this.split(a).join(b)};
String.prototype.ucfirst=function(){return this.substring(0,1).toUpperCase()+this.substring(1)};

Number.prototype.pad=function(a){for(var b=this+"";b.length<a;)b="0"+b;return b};
Number.prototype.isBetween=function(a,b){return this>=a&&b>=this};

HTMLElement.prototype.insertAfter = function(newNode){this.parentNode.insertBefore(newNode, this.nextSibling);}
HTMLElement.prototype.hide = function(){this.style.display="none";}
HTMLElement.prototype.show = function(){this.style.display="block";}
HTMLElement.prototype.remove = function(){if(this.parentNode!=null)this.parentNode.removeChild(this);}
HTMLElement.prototype.parent = function(){return this.parentNode;}
HTMLElement.prototype.setStyle = function(key, value){this.style[key] = value;}
HTMLElement.prototype.setHeight=function(a){this.setStyle("height",a+"px")};
HTMLElement.prototype.setWidth=function(a){this.setStyle("width",a+"px")};
HTMLElement.prototype.getWidth=function(){return this.offsetWidth;};
HTMLElement.prototype.getHeight=function(){return this.offsetHeight;};
HTMLElement.prototype.animation=function(a,b){this.setStyle("-webkit-transition",a+" "+b+"s"),this.setStyle("-moz-transition",a+" "+b+"s"),this.setStyle("-ms-transition",a+" "+b+"s"),this.setStyle("-o-transition",a+" "+b+"s"),this.setStyle("transition",a+" "+b+"s")};
HTMLElement.prototype.stopAnimation = function(){this.animation("linear",0);}

Event.prototype.getMousePosition = function(){return new Position(this.clientX,this.clientY);}
Event.prototype.getEditorPosition = function(){return new Position(this.clientX-Sidebar.getWidth(),this.clientY - document.getElementById("header").offsetHeight);}
Event.prototype.getTarget = function(){return this.target || this.srcElement;}

Array.prototype.forEach=function(a){for(var b=0;b<this.length;b++)a(this[b])};
Array.prototype.asyncForEach=function(a,b){function d(b,e){return null==c[b]?(null!=e&&e(),!1):(a(c[b]),void d(++b,e))}var c=this;d(0,b)};
Array.prototype.promiseForEach=function(a,b){var c=[];this.forEach(function(a){c.push(a)}),c.asyncForEach(function(b){a(b)},b)};
Array.prototype.move=function(a,b){if(b>=this.length)for(var c=b-this.length;c--+1;)this.push(void 0);return this.splice(b,0,this.splice(a,1)[0]),this};
Array.prototype.contains=function(a){return this.indexOf(a)>-1};

Object.prototype.clone = function(){return JSON.parse(JSON.stringify(this));}
Object.prototype.forEach=function(a){for(var b=0;b<Object.keys(this).length;b++){var c=Object.keys(this)[b],d=this[c];a(c,d)}};
Object.prototype.asyncForEach=function(a){function c(d){var e=Object.keys(b)[d];if(null==e)return!1;var f=b[e];a(e,f),c(++d)}var b=this;c(0)};
Object.prototype.promiseForEach=function(a){var b={};this.forEach(function(a,c){b[a]=c}),b.asyncForEach(function(b,c){a(b,c)})};
Object.prototype.getValues=function(){for(var a=[],b=0;b<Object.keys(this).length;b++)a.push(this[Object.keys(this)[b]]);return a};
Object.prototype.toArray = function(){
	if(this.length !== undefined) return this;

	var a = new Array();
	this.forEach(function(b, c){
		a.push(c);
	});
	return a;
};
Object.prototype.getKeyByValue=function(a){for(var b in this)if(this.hasOwnProperty(b)&&this[b]===a)return b};
Object.prototype.isArray=function(){return void 0!==this.length};

Rectangle.prototype.draw=function(a,b,c){void 0==c&&(c=1),a.beginPath(),a.moveTo(this.getLeft(),this.getTop()),a.lineTo(this.getRight(),this.getTop()),a.lineTo(this.getRight(),this.getBottom()),a.lineTo(this.getLeft(),this.getBottom()),a.lineTo(this.getLeft(),this.getTop()),a.strokeStyle=b,a.lineWidth=c+.5,a.stroke()};