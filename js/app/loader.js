function loader(){
	var body    = document.getElementsByTagName("body")[0];
	var overlay = document.createElement("div");
	var loading = document.createElement("svg");
	var logoInt = null;

	overlay.className = "loader-overlay";
	overlay.innerHTML = '<img src="https://gameindus.fr/imgs/logo/logo-medium.png" alt="Logo GameIndus"><svg class="spinner hide" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>';

	body.appendChild(overlay);

	var spinner = overlay.querySelector(".spinner");
	var image   = overlay.querySelector("img");
	
	spinner.style.display = "block";
	image.style.display   = "block";

	var spinnerSize = {w: 60, h: 60};

	spinner.style.left = (window.innerWidth / 2 - spinnerSize.w / 2) + "px";
	spinner.style.top  = (window.innerHeight / 2 - spinnerSize.h / 2 + 50) + "px";
	image.style.left   = (window.innerWidth / 2 - image.width / 2) + "px";
	image.style.top    = (window.innerHeight / 2 - image.height / 2 - 100) + "px";


	logoInt = setInterval(function(){
		if(image.style.opacity == 0.6) image.style.opacity = 0.9;
		else image.style.opacity = 0.6;
	}, 1000);

	document.addEventListener("readystatechange", function(e){
		if(document.readyState == "complete"){
			clearInterval(logoInt);
			overlay.remove();

			App.loadedEvents.forEach(function(callback){
				callback();
			});
		}
	});
}

loader();