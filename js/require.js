/*
*
*	Require v1
* 
function require(a){jss.push(a)}function requires(a){var b=function(c,d){var e=c[d];if(e==null){console.log("Task end in ", (Date.now() - startTime), "ms");}if(null==e)return null!=a&&a(d),!1;var f=document.createElement("script");f.type="text/javascript",f.src="js/"+e+".js",f.onload=function(){b(c,d+1)},f.onreadystatechange=f.onload,document.body.appendChild(f)};b(jss,0)}var jss=[];
*/

/*
*	Require v2 -> more stable & less time to load (accept multi-scripts loading)
*/
function require(){jss.push(arguments)}function requires(){var a=jss;jss=[];var b=function(a,d){var e=a[d];if(null==e)return!1;for(var f=0;f<e.length;f++){var g=e[f];0==f?c(g,function(){b(a,++d)}):c(g)}},c=function(a,b){if(null==a)return null!=b&&b(),!1;var c=document.createElement("script");c.type="text/javascript",c.src="js/"+a+".js",c.onload=function(){null!=b&&b()},c.onreadystatechange=c.onload,document.body.appendChild(c)};b(a,0)}var jss=[];

function css(a){if(cssExists(a))return!0;var b=document.createElement("link");b.rel="stylesheet",b.type="text/css",-1==a.indexOf("http")?b.href="css/"+a+".css":b.href=a,document.getElementsByTagName("head")[0].appendChild(b)}
function cssExists(href){
	var links = document.getElementsByTagName("link");

	for(var i = 0; i < links.length; i++)
		if(links[i].href == href || links[i].href == (links[i].baseURI.split("#")[0] + "css/" + href + ".css")) return true;

	return false;
}

require("utils/Utils", "utils/MathUtils", "utils/FlatRadio", "libs/jscolor/jscolor", "libs/lzstring");

require("app/config");

require("modules/Tabs");
require("app/window/Tab");
require("app/network/Auth");
require("app/network/Request");
require("utils/Sort");
require("app/router");
require("app/window/View");
require("app/views");
require("utils/DropFile");
require("utils/RangeSlider");

require("app/files");
require("app/sounds");
require("utils/Functions");


require("app/editor");
require("app/network");
require("app/network/Realtime");
require("app/app");

require("modules/Tchat");
require("modules/Homepage");
require("modules/Sidebar");
require("modules/GiMarket");
require("modules/TutorialManager", "modules/RessourcesManager", "modules/ResizeSidebar");
require("modules/Compiler");
require("modules/Exporter");

// Load editors scripts
require(
	"editors/config",
	"editors/scene",
	"editors/script",
	"editors/sound",
	"editors/sprite",
	"editors/tilemap",
	"editors/visualscript"
);

requires();
css("app");