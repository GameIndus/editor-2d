var sidebar   = document.getElementById("sidebar");
var resizebox = document.getElementById("resizebox");
var logo      = document.getElementById("logo");

var resizeBarMoveMode = false;

window.onmousedown = function(e){
	if(e.target == resizebox) resizeBarMoveMode = true;
}

window.onmouseup = function(e){
	e.preventDefault();
	resizeBarMoveMode = false;
	return false;
}

window.onmousemove = function(e){
	e.preventDefault();

	if(resizeBarMoveMode){
		var x = e.clientX;

		Sidebar.setWidth(x);
	}

	return false;
}
