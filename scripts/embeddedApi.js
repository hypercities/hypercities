// How to do this: make one collection with all collections inside it, and put it in
// public collections -- or set this as the "baseCollection"
// A mode in which anything -- either objects or maps -- can be shown
// OR, we can do this with HCObject/objectBank

HyperCities.embeddedApi = function () {
	var _id	    = "[HyperCities embedded API] ",
		_enabled    = true,
		_mapOverlays= [], // maps from external url, keyed by external url to tileOverlays
		_mapOptions = []; // map config options, loaded from a specific URL
		
	var _parse = function ($command) {
		// find initial command
		var command	= $command.split(":")[0],
			arguments	= $command.split("&"),
			toReturn	= [];
		toReturn[0] = command;
		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			// Compensating for Firefox's auto-decoding of URLs
			if (navigator.userAgent.indexOf("Firefox") !== -1) {
				arg = arg.substr(0, arg.indexOf(":") + 1) + encodeURIComponent(arg.substr(arg.indexOf(":") + 1));
			}
			var pieces = arg.split(":");
			toReturn.push(pieces[1]);
		}
		return toReturn;
	};

	// sample config file:
	{
		config: {
			maps: [
				{
					url: "/url/path",
					layer: 0,
					queryData: {
						overlayOptions: {
							strokeColor:"#FF0000",
							strokeWeight:3,
							strokeOpacity:0.75,
							fillColor:"#000066",
							fillOpacity:0.4
						},
						infoWindowHtml: "<div><b>STFID:</b> {STFID} <br/>"
						+ "<img src=\"http://chart.apis.google.com/chart?cht=bvs&chxt=y&chxr=0,0,5000,1000&chs=200x100&chd=t:{P50T},{P60T},{P70T},{P80T},{P90T}&chl=P50T|P60T|P70T|P80T|p90T&chco=4D89F9&chds=0,5000\"><br /></div>",
						returnGeometry: true,
						outFields: ["STFID","P40T","P50T","P60T","P70T","P80T","P90T"]
					}
				},
			]
		}
	}

	var _parseConfig = function ($data) {
		// load all potential layesr and put them into _mapOverlays
		// load all config files and put them into _mapOptions, keyed with the same
		// array indexes as _mapOverlays
		HyperCities.util.debug("Parsing map data");
		if (typeof($data) !== 'object') alert ("Syntax error in config file; not recognized as javascript.");
		if (typeof $data.startPosition != 'undefined' && typeof $data.startPosition == 'object') {
            HyperCities.earth.setView("google.maps.LatLng", new google.maps.LatLng($data.startPosition.lat, $data.startPosition.lon),
            $data.startPosition.zoom);
		}
		var map;
		for (var i in $data.mapConfig) {
			map = $data.mapConfig[i];
			_mapOptions.push(map);
			_mapOverlays.push(map.url);
		}
	}
	var _parseArgument = function ($arg) {
		return $arg.split(":");
	}
	var _parseArray = function ($array) {
		$array = $array + "";
		HyperCities.util.debug("In _parseArray: " + $array + "(end)");
		if ($array.charAt(0) == '[' && $array.charAt($array.length - 1) == ']') {
			var returnable = $array.substr(1, $array.length - 2).split(',');
			if (typeof returnable !== 'object') returnable = [returnable];
			return returnable;
		} else {
            var arg = decodeURIComponent($array);
            // Some browsers can be inconsistent about what parts of
            // the URL are decoded.
            if (arg.charAt(0) == '[') {
                return _parseArray(arg);
            } else {
                return false;
            }
		}
	}
	var _getMapOptionsByUrl = function ($url) {
		if (_mapOverlays.length == 0) return null;
		for (var i in _mapOverlays) {
			if (_mapOverlays[i] == $url) return _mapOptions[i];
		}
		return null;
	}
	// Handlers for actual commands
	var _setCommandMode = function ($enabled) {
		if (typeof ($enabled) == 'boolean') {
			_enabled = $enabled;
			HyperCities.util.debug (_id + "Embedded API enabled.")
		}
	// else debug problem
	};

	var _showCollection = function ($id) {
		// open the root collection and then the all-encompassing one
		$("#collectionTab").click();
		HyperCities.collectionList.check ($id);
	};

	var _hideCollection = function ($id) {
		$("#collectionTab").click();
		HyperCities.collectionList.uncheck ($id);
	};
	/**
	 * Signature: #addMapByUrl:(URI encoded string)url&layer:(string/int)layer id&opacity:(int)opacity
	 */
	var _addMapByUrl = function ($url, $layers, $opacity) {
		var url = decodeURIComponent($url),
			opacity = 1.0,
			layers	= [];
		if (url.search("/MapServer") === -1) url += "/MapServer";
		//HyperCities.util.debug ("Loading map at " + url + " with layers " + $layers);
		if (typeof($layers) != 'undefined') {
			if ($layers.charAt(0) == "%") $layers = decodeURIComponent($layers);
			layers = _parseArray($layers);
			if (layers === false) layers = [parseInt($layers)];
		}
		if (typeof($opacity) != 'undefined') opacity = $opacity;
		var options = _getMapOptionsByUrl (url);
		if (options == null) {
			alert ("Map could not be loaded; configuration file did not mention map at: " + url);
			return;
		}
		HyperCities.mainMap.addMapByUrl(url, options.type, opacity, options.mapData, layers);
	}

	var _removeMapByUrl = function ($url, $layers) {
		var url = decodeURIComponent($url),
			layers = _parseArray($layers);
		HyperCities.mainMap.removeMapByUrl(url, layers);
	}

	var _adjustMapOpacity = function ($url, $opacity, $layers) {
		_removeMapByUrl($url, $layers);
		_addMapByUrl ($url, $layers, $opacity);
	}

	var _loadCollectionPath = function ($path) {
		HyperCities.util.debug(_id + "Loading collection path: " + $path);
		var components = $path.split("/");
		$("#collectionTab").click();
		/**
		 * Because collections may not be visible, and because loading a new collection
		 * requires an untimable AJAX call, we need to wait until each collection
		 * in the path has fully loaded before loading the next one.
		 * Therefore, this function opens the first collection, waits for it
		 * to load (by checking if the next collection is present) and then opens that.
		 */
		var intervalHandle,
		i = 0,
		interval = 200;
		var __showCollectionWithDelay = function () {
			if ($(".collection" + components[i] + " > .hitarea").length !== 0) {
				clearTimeout (intervalHandle);
				//HyperCities.util.debug(_id + "Opening " + components[i]);
				$(".collection" + components[i] + " > .hitarea").click()
				i++;
				if (i < components.length ) {
					HyperCities.util.debug(_id + "Setting interval again.");
					intervalHandle = setInterval (__showCollectionWithDelay, interval);
				} // end reset interval test
			} // end check for presence of DOM elements test
		//else HyperCities.util.debug(_id + "Collection " + components[i] + " hasn't been loaded yet.");
		} // end internal function
		intervalHandle = setInterval (__showCollectionWithDelay, interval);
	}
	var _showMapTab = function () {
		if (!$("#mapTab").hasClass("highlight")) {
			$("#mapTab").click();
		}
	}

	var _showMap = function ($args) {
		var maps,
			opacity;
		if ($args.length == 1) {
			maps = $args[0];
		} else {
			if ($args.length == 2) {
				opacity = parseFloat($args['withOpacity']);
				HyperCities.util.debug(_id + "opacity: " + opacity);
			}
		}
		var item = _parseArray (maps);
		var showMap;
		if (typeof (item) !== "object") {
			HyperCities.util.debug(_id + " _showMap found a single item: " + maps);
			showMap = function () {
				HyperCities.mapList.addMap(parseInt(maps));
				$("#loadingMessage").fadeOut("fast");
			}
		} else {
			HyperCities.util.debug(_id + " _showMap found an array.");
			maps = item;
			showMap = function () {
				HyperCities.mapList.addMap(parseInt(item[0]));
				HyperCities.mapList.addMap(parseInt(item[1]));
				$("#loadingMessage").fadeOut("fast");
			}
		}
		HyperCities.mapList.update(HyperCities.mainMap.getBounds(),
			HyperCities.mainMap.getZoom(),
			false, true
			);
		HyperCities.session.set("mode", HyperCities.config.MODE_NARRATIVE);
		HyperCities.mapList.addPostSyncOperation (showMap, null);
	}

	var _hideMap = function ($id) {
		$("#mapTab").click();
		HyperCities.mapList.removeMap ($id);
	};

	var _loadConfig = function ($url) {
		var url = decodeURIComponent($url);
		$.getJSON(url + "?callback=?", null, HyperCities.embeddedApi.configLoaderCallback);
	};

	return {
		handle: function ($command) {
			var interpreted = _parse ($command),
				command = interpreted[0],
				args = interpreted.splice(1);
			if (command == 'initEmbed') {
				_setCommandMode(true);
				return;
			}
			if (!_enabled) {
				alert ("You must call initEmbed before sending commands to the Embedded API.");
				return;
			}
			switch (command) {
				case 'loadConfig':
					_loadConfig(args[0]);
				case 'showCollection':
					_showCollection (args[0]);
					break;
				case 'hideCollection':
					_hideCollection (args[0]);
					break;
				case 'showMap':
					_showMap (args);
					break;
				case 'hideMap':
					_hideMap (args);
					break;
				case 'addMapByUrl':
					HyperCities.util.debug("Adding map by Url");
					_addMapByUrl (args[0], args[1], args[2]);
					break;
				case 'removeMapByUrl':
					_removeMapByUrl(args[0], args[1]);
					break;
				case 'adjustMapAtUrl':
					_adjustMapOpacity(args[0], args[1], args[2]);
					break;
				case 'loadCollectionPath':
					_loadCollectionPath (args[0]);
					break;
			}
		},
		configLoaderCallback: function ($data) {
			_parseConfig ($data);
		}
	};

}();
