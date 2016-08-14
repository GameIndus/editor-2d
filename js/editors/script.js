require("libs/codemirror/codemirror");
require("libs/codemirror/modes/javascript");
require("libs/codemirror/addons/sublime");
require("libs/codemirror/addons/closebrackets");
require("libs/codemirror/addons/show-hint");
require("libs/codemirror/addons/javascript-hint");
require("libs/codemirror/addons/autorefresh");
require(
	"libs/codemirror/addons/foldcode",
	"libs/codemirror/addons/foldgutter", 
	"libs/codemirror/addons/brace-fold", 
	"libs/codemirror/addons/comment-fold"
);

requires();

function ScriptEditor(){
	this.editor = Editor;
	this.codemirror = null;

	this.draftCode = "";
	this.alreadyLoaded = false;

	this.draftMode = false;
	this.fontSize = 14;

	this.scriptBar = null;
	this.codeMirrorDiv = null;

	this.currentWorkspace, this.foldedLines = [];

	this.lastCursorPos = null;
	this.allowedThemes = ["default", "ambiance", "base16-dark", "cobalt", "dracula", "eclipse", "lesser-dark", "material", "monokai", "tomorrow-night-eighties", "xq-light"];
}

ScriptEditor.prototype = {

	init: function(){
		var self       = this;
		var container  = document.getElementById("editor-container");
		this.scriptBar = document.getElementById("scriptBar");

		if(container.querySelector(".CodeMirror") != null) container.querySelector(".CodeMirror").remove();

		css("editors/script");

		this.codemirror = CodeMirror(container, {
			// mode: "text/x-csrc",  <-- C#
			mode: "javascript",
			keyMap: "sublime",
			lineNumbers: true,
			lineWrapping: true,
     		matchBrackets: true,
     		autofocus: true,
     		autoCloseBrackets: true,
     		autoRefresh: true,
     		foldGutter: true,
     		indentUnit: 4,
    		gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],

     		extraKeys: {
     			"Ctrl-Space": "autocomplete",
     			"Ctrl-Q": function(cm){ 
     				cm.foldCode(cm.getCursor()); 
     			}
     		}
		});

		// Resize codemirror box
		var codemirrorBox = document.getElementsByClassName("CodeMirror")[0];
		codemirrorBox.style.height = (container.offsetHeight - this.scriptBar.offsetHeight + 40) + "px";

		// Save in cache the draft when text is changed & collaboration
		this.codemirror.on("change", function(doc, change){
			var text = self.codemirror.getValue();
			self.draftCode = text;

			if(change.origin != "setValue"){
				self.setDraftMode(true);
				var text = (typeof change.text == "object") ? change.text.join("\n") : change.text;

				self.realtimeSend("change", {origin: LZString.compress(change.origin), draftText: LZString.compressToBase64(self.draftCode), text: LZString.compressToBase64(text), from: LZString.compress(JSON.stringify(change.from)), to: LZString.compress(JSON.stringify(change.to))});
			}else{
				self.refresh();
			}
		});

		// Fold / UnFold
		this.codemirror.on("fold", function(doc, foldPos){
			if(self.foldedLines.indexOf(foldPos.line) == -1)
				self.foldedLines.push(foldPos.line);
		});
		this.codemirror.on("unfold", function(doc, unfoldPos){
			self.foldedLines.splice(self.foldedLines.indexOf(unfoldPos.line), 1);
		});

		if(edConf.get("script-fs") != null) this.codemirror.setOption("tabSize", parseInt(edConf.get("script-tabsize")));
		else this.codemirror.setOption("tabSize", 4);

		if(edConf.get("script-tabsize") != null) this.setFontSize(edConf.get("script-fs"));
		else this.setFontSize(this.fontSize);

		// Param network
		if(!this.alreadyLoaded){
			network.onError(function(e){
				var errorDiv = document.getElementById("networkError");
				var container = document.getElementById("editor-container");

				if(errorDiv != null && container != null){
					errorDiv.style.display = "block";

					errorDiv.style.width = container.style.width;
					errorDiv.style.height = container.style.height;
				}
			});
			this.alreadyLoaded = true;
		}

		var fs = edConf.get("script-fs");
		if(fs != null) this.fontSize = parseInt(fs);


		// Load auto-completions
		// this.loadAutoCompletion();
	},
	load: function(){
		var that = this;

		this.scriptBar = document.getElementById("scriptBar");

		if(edConf.get("script-fs") != null) this.setFontSize(edConf.get("script-fs"));
		else this.setFontSize(this.fontSize);

		if(this.codeMirrorDiv != null){
			var c = document.getElementById("editor-container");

			c.querySelector(".CodeMirror").remove();
			c.appendChild(this.codeMirrorDiv);
			
			this.codeMirrorDiv = null;
		}

		if(edConf.get("script-theme") != null){
			var theme = edConf.get("script-theme");
			if(this.allowedThemes.indexOf(theme) > -1){
				if(theme != "default") css("editors/codethemes/" + theme);
				this.codemirror.setOption("theme", theme);
			}
		}

		setTimeout(function(){
			that.refresh();
		}, 1);

		this.scriptBar.querySelector(".text-bar").onclick = function(){
			if(this.classList.contains("error")){
				if(this.parentNode.classList.contains("opened"))
					this.parentNode.classList.remove("opened");
				else
					this.parentNode.classList.add("opened");
			}
		}

		this.loadSaveDraftSystem();
	},
	loadFromData: function(data){
		var self = this;

		if(!data) data = "// Ecrivez votre script ici.";

		this.codemirror.setValue(data);
		this.draftCode = data;

		setTimeout(function(){
			self.refresh();
		}, 1);
	},
	unload: function(){
		var c = document.getElementById("editor-container");
		var b = document.getElementById("scriptEditorBar")

		if(b != null) b.style.display = "none";

		if(c != null){
			this.codeMirrorDiv = c.querySelector(".CodeMirror");
			c.style.fontSize = "inherit";
		}

		if(this.codemirror){
			this.currentWorkspace = {
				selection: {from: this.codemirror.getCursor("from"), to: this.codemirror.getCursor("to")},
				cursor: this.codemirror.getCursor(),
				scrollInfo: this.codemirror.getScrollInfo(),
				foldedLines: this.foldedLines
			}
		}
	},
	realtimeSend: function(submethod, data){
		var o = {submethod: submethod, file: App.getCurrentFile(), type: "script"};

		switch(submethod){
			case "change": 
				o.text      = data.text;
				o.from      = data.from;
				o.to        = data.to;
				o.origin    = data.origin;
				o.draftText = data.draftText;
			break;
			case "draft":
				o.value = data;
			break;
			case "saveDraft":
				o.manualSave = true;
			break;
		}
		
		network.request("scripteditor", o, null, "realtime", "realtime").send();
	},

	

	loadAutoCompletion: function(){  },
	loadSaveDraftSystem: function(){
		var that = this;

		window.addEventListener('keydown', function(e){
			if(e.ctrlKey && e.keyCode == 83){
				e.preventDefault();
				var text = that.codemirror.getValue();

				if(!that.draftMode) return false;

				network.request("checkForScript", {code: text}, function(d){
					var eT = that.scriptBar.querySelector(".error-lines");
					eT.innerHTML = "";

					// Remove lines with error
					var lines = that.codemirror.lineCount(), i;
					for (i = 0; i < lines; i++) 
					   	that.codemirror.getDoc().removeLineClass(i, "wrap", "bg-error");

					if(d.error != null || d.errors != null){ // There is an error
						var n = 1;
						if(d.error != null){
							that.setDraftMode(true);
							that.codemirror.getDoc().addLineClass(d.error.lineNumber - 1, "wrap", "bg-error");
							eT.innerHTML += '<div class="error-line"><div class="col">' + d.error.lineNumber + '</div><div class="col">' + d.error.description + '</div><div class="col">CompilationError</div></div>';
						}else{
							n = d.errors.length;
							
							for(var i = 0; i < d.errors.length; i++){
								var err = d.errors[i];
								that.codemirror.getDoc().addLineClass(err.lineNumber - 1, "wrap", "bg-error");
								eT.innerHTML += '<div class="error-line"><div class="col">' + err.lineNumber + '</div><div class="col">' + err.description + '</div><div class="col">CompilationError</div></div>';
							}
						}
						

						that.setBarText('<i class="fa fa-times"></i> ' + n + ' erreur' + ((n > 1) ? "s" : "") + ' ― Sauvegarde impossible.');
						that.setBarStatus("error");

						App.getSoundsManager().error.play();
						return false;
					}else{

						that.setBarText("<i class='fa fa-check'></i> Aucune erreur.");
						that.setBarStatus("normal");
					}

					that.setDraftMode(false);
					that.realtimeSend("saveDraft");
					return false;
				}, "scripteditor").send();
			}
		});
	},
	refresh: function(){
		var editor = this.codemirror;
		if(editor == null) return false;

		if(this.currentWorkspace){
			var selection   = this.currentWorkspace.selection;
			var scrollInfo  = this.currentWorkspace.scrollInfo;
			var foldedLines = this.currentWorkspace.foldedLines;

			if(selection != null) editor.setSelection(selection.from, selection.to, false);
			if(scrollInfo != null) editor.scrollTo(scrollInfo.left, scrollInfo.top);
			
			if(foldedLines != null){
				foldedLines.forEach(function(foldedLine){
					editor.foldCode(CodeMirror.Pos(foldedLine, 0), null, "fold");
				});
			}
		}

		editor.refresh();
		editor.focus();
	},


	setFontSize: function(size){
		if(this.codemirror == null) return false;

		this.fontSize = size;

		document.getElementById("editor-container").style.fontSize = size+"px";
		edConf.set("script-fs", parseInt(size));
	},
	setDraftMode: function(draftMode, fromRealtime){
		if(this.draftMode == draftMode) return false;
		this.draftMode = draftMode;

		var div = App.getFilesManager().getDomFile("script", App.getCurrentFile().toLowerCase());
		if(div == null) return false;

		if(draftMode){
			var draftBox = document.createElement("span");
			draftBox.className = "draft-box";
			draftBox.innerHTML = "Brouillon";

			if(div.querySelector(".draft-box") == null)
				div.appendChild(draftBox);

			// Update current tab
			var tab = Tabs.getCurrentTab();
			tab.dom.classList.add("draft");
			alertRightNotif("Ctrl-S pour sauvegarder votre script.", "info");
		}else{
			// Update current tab
			var tab = Tabs.getCurrentTab();
			tab.dom.classList.remove("draft");

			var draftBox = div.querySelector(".draft-box");
			if(draftBox != undefined) div.removeChild(draftBox);
			removeRightNotif();
		}

		if(!fromRealtime) this.realtimeSend("draft", draftMode);
	},

	setBarText: function(text){
		this.scriptBar.querySelector(".text-bar").innerHTML = text;
	},
	setBarStatus: function(status){
		this.scriptBar.querySelector(".text-bar").className = "text-bar " + status;

		if(status == "error"){
			this.scriptBar.classList.add("opened");
		}else{
			this.scriptBar.classList.remove("opened");
		}
	}

};