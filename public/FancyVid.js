(function () {
	"use strict";

	var callbacks = [];

	function extend(destination, source) {
		for (var property in source) {
			if (typeof destination[property] === 'undefined') {
				destination[property] = source[property];
			}
		}

		return destination;
	}

	function FancyVid(elem, options) {
		if (!options) options = {};

		this.instanceId = callbacks.length;
		callbacks[callbacks.length] = {};

		this.fallbacked = false;
		this.element = elem;
		this.options = extend(options, {
			swfPath: 'flash/FancyVid.swf'
		});

		this._handlers = { load: [], error: [] };
	}

	FancyVid._flashCallback = function (id, event, args) {
		if (callbacks[id][event]) {
			callbacks[id][event].apply(null, args);
		}
	};

	FancyVid.prototype._initFlash = function (loadCb, errorCb) {
		var that = this;

		var flash = document.createElement('embed');
		flash.id = flash.name = 'FancyVid_' + this.instanceId;
		flash.type = 'application/x-shockwave-flash';
		flash.src = this.options.swfPath;
		flash.className = this.element.className;
		flash.style.position = 'absolute';
		flash.style.left = '-99999px';

		attr = document.createAttribute('allowScriptAccess');
		attr.nodeValue = 'always';
		flash.setAttributeNode(attr);

		callbacks[this.instanceId].load = function () {
			loadCb.bind(that)(flash);
		};
		callbacks[this.instanceId].error = function () {
			errorCb.bind(that)();
		};

		var attr = document.createAttribute('flashVars');
		attr.nodeValue = 'callback=FancyVid._flashCallback&id=' + this.instanceId;
		flash.setAttributeNode(attr);

		this.element.parentNode.replaceChild(flash, this.element);
		this.element = flash;
	};

	FancyVid.prototype.on = function (evt, cb) {
		if (this._handlers[evt]) {
			this._handlers[evt][this._handlers[evt].length] = cb;

			if (evt === 'load' && this.isLoaded) {
				cb();
			}
		} else {
			throw new Error('Unknown event type');
		}
	};

	FancyVid.prototype._emit = function (evt) {
		for (var i = 0; i < this._handlers[evt].length; ++i) {
			this._handlers[evt][i]();
		}
	};

	FancyVid.prototype.autoFallback = function () {
		var that = this;

		var lastNode = null;
		if (this.element.canPlayType) {
			for (var i = 0; i < this.element.childNodes.length; ++i) {
				var node = this.element.childNodes[i];
				if (node.tagName === 'SOURCE' && (!node.type || this.element.canPlayType(node.type) !== '')) {
					lastNode = node;
				}
			}
		}

		if (!lastNode) {
			this.fallback();
		} else {
			this.element.onerror = that.fallback.bind(that);
			lastNode.onerror = that.fallback.bind(that);
		}
	};

	FancyVid.prototype.fallback = function () {
		if (this.fallbacked) return;

		this.fallbacked = true;
		var sources = [];

		for (var i = 0; i < this.element.childNodes.length; ++i) {
			if (this.element.childNodes[i].tagName === 'SOURCE') {
				sources[sources.length] = { src: this.element.childNodes[i].src, type: this.element.childNodes[i].type };
			}
		}

		this.playFlash(sources);
	};

	FancyVid.prototype.playFlash = function (src) {
		var nowSrc = src.shift();
		var link = document.createElement('a');
		link.href = nowSrc.src ? nowSrc.src : nowSrc;

		this._initFlash(function (elem) {
			var that = this;

			callbacks[this.instanceId].playing = function (args) {
				callbacks[that.instanceId].playing = null;

				elem.style.position = '';
				elem.style.left = '';
				elem.style.width = args.width + 'px';
				elem.style.height = args.height + 'px';
			};
			elem.playVideo(link.href);
		}, function (data) {
			if (src.length) {
				this.playFlash(src);
			} else {
				this.element.parentNode.removeChild(this.element);
				this._emit('error', data);
			}
		});
	};

	self.FancyVid = FancyVid;
})();