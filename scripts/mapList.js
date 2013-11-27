/**
 * HyperCities mapList Object
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2008-12-22
 * @version   0.7
 *
 */

HyperCities.mapList = function() {
	// do NOT access javascript generated DOM from here; elements don't exist yet

	// Private variable
	var _id = "[HyperCities.mapList] ",
		_maps = new Array(),
		_baseMapId = null,
		_range = {
			max: null,
			min: null
		},
		_mapParams = {},
		_doRender = true,
		_syncMap = false,
		_updateTimebar = false,
		_originalMode = HyperCities.config.MODE_DEFAULT,
		_postSyncOperations = [];

	// Private functions
	/**
	 * Empty the _maps array and remove overlay on GMap
	 * @return void
	 */
	var _empty = function() {
		//HyperCities.mainMap.removeMapsProxy(_maps);
		_maps.length = 0; // delete all element in array
		//        _maps.splice(0,_maps.length);
		_range.max = null;
		_range.min = null;
		_baseMapId = null;
	};

	/**
	 * Do post sync operations
	 * @return void
	 */
	var _doPostSyncOperations = function() {
		for (var i in _postSyncOperations) {
			_postSyncOperations[i].operation(_postSyncOperations[i].data)
			delete _postSyncOperations[i];
		}
		_postSyncOperations = [];
	};

	/**
	 * Parse the json map format and add it to the _map
	 */
	var _wsParseMap = function ($data, $overlay) {
		var mapId = $data.id,
			mapYear = null;

		_maps[mapId] = {
			id: mapId,
			city: $data.city,
			title: $data.title,
			neLat: parseFloat($data.mapping.neLat),
			neLon: parseFloat($data.mapping.neLon),
			swLat: parseFloat($data.mapping.swLat),
			swLon: parseFloat($data.mapping.swLon),
			proxy: null,
			boundary: [],
			projection: $data.projection,
			minZoom: parseFloat($data.minZoom),
			maxZoom: parseFloat($data.maxZoom),
			dateFrom: new Date(),
			dateTo: new Date(),
			dateStr: "",
			tileType: $data.tileType,
			tileUrl: $data.tileUrl,
			tileOverlay: null,
			tileOpacity: parseFloat($data.opacity),
			copyright: $data.copyright,
			description: $data.description,
			thumbnailUrl: $data.thumbnailUrl
		};

		// Assign Display Information 
		_maps[mapId].dateFrom.setFullYear($data.mapping.dateFrom.date.substr(0,4));
		_maps[mapId].dateTo.setFullYear($data.mapping.dateTo.date.substr(0,4));
		if (Date.compare(_maps[mapId].dateFrom, _maps[mapId].dateTo) === 0) {
			mapYear = _maps[mapId].dateFrom.getFullYear();
			if (mapYear < 0) {
				_maps[mapId].dateStr = Math.abs(mapYear) + "B.C.";
			} else {
				_maps[mapId].dateStr = mapYear;
			}

		} else {
			mapYear = _maps[mapId].dateFrom.getFullYear();
			if (mapYear < 0) {
				_maps[mapId].dateStr = Math.abs(mapYear) + "B.C.";
			} else {
				_maps[mapId].dateStr = mapYear;
			}

			_maps[mapId].dateStr += "-";

			mapYear = _maps[mapId].dateTo.getFullYear();

			if (mapYear < 0) {
				_maps[mapId].dateStr += Math.abs(mapYear) + "B.C.";
			} else {
				_maps[mapId].dateStr += mapYear;
			}
		}

		if (_maps[mapId].thumbnailUrl === "" || _maps[mapId].thumbnailUrl == "./images/thumbError.gif") {
			_maps[mapId].thumbnailUrl = "./images/thumbDummy" + (mapId % 5 + 1) + ".gif";
		}

		// Generate Map Boundary Array (for GPolygon rendering)
    /*
		_maps[mapId].boundary.push(new GLatLng(_maps[mapId].neLat, _maps[mapId].swLon));
		_maps[mapId].boundary.push(new GLatLng(_maps[mapId].neLat, _maps[mapId].neLon));
		_maps[mapId].boundary.push(new GLatLng(_maps[mapId].swLat, _maps[mapId].neLon));
		_maps[mapId].boundary.push(new GLatLng(_maps[mapId].swLat, _maps[mapId].swLon));
		_maps[mapId].boundary.push(new GLatLng(_maps[mapId].neLat, _maps[mapId].swLon));
    */

		// Update the range of mapList
		if (_range.min === null || Date.compare(_maps[mapId].dateFrom, _range.min) < 0) {
			_range.min = _maps[mapId].dateFrom;
		}

		if (_range.max === null || Date.compare(_maps[mapId].dateTo, _range.max) > 0) {
			_range.max = _maps[mapId].dateTo;
		}

		//HyperCities.mainMap.addMapsProxy([_maps[mapId]]);

		if ( $overlay === true ) {
			HyperCities.mapList.addMap(mapId);
		}
	};

	/**
	 * parse the returned xml and store in _maps
	 * @param Object $data: the returned map data
	 * @return void
	 */
	var _parseMaps = function($data) {
		var overlaidMaps = HyperCities.session.get("map");

		// Add Blank MapType for clear Overlay Display if some maps are overlaid
		/*
		if (overlaidMaps.length > 0) {
			HyperCities.mainMap.addBlankMap();
		} else {
			HyperCities.mainMap.resetMapType();
		}
		*/

		// Reset Map Object Array
		if (_maps.length > 0) _empty();

		// loop for each match on Maps/Map
		$($data).find("Map").each(function() {

			var mapId = $("id", this).text(),
                minZoom = parseFloat($("minZoom", this).text()),
                maxZoom = parseFloat($("maxZoom", this).text());
			var mapYear = null;

            // don't include maps with the wrong min or max zoom levels
            if (minZoom > HyperCities.mainMap.getZoom()
                || maxZoom < HyperCities.mainMap.getZoom()) {
                return;
            }

			_maps[mapId] = {
				id: mapId,
				city: $("city", this).text(),
				title: $("title", this).text(),
				neLat: parseFloat($("neLat", this).text()),
				neLon: parseFloat($("neLon", this).text()),
				swLat: parseFloat($("swLat", this).text()),
				swLon: parseFloat($("swLon", this).text()),
				proxy: null,
				boundary: [],
				projection: $("projection", this).text(),
				minZoom: parseFloat($("minZoom", this).text()),
				maxZoom: parseFloat($("maxZoom", this).text()),
				dateFrom: new Date(),
				dateTo: new Date(),
				dateStr: "",
				tileType: $("tile_type", this).text(),
				tileUrl: $("tile_url", this).text(),
				tileOverlay: null,
				tileOpacity: 1.0,
				copyright: $("copyright", this).text(),
				description: $("description", this).text(),
				thumbnailUrl: $("thumbnail_url", this).text()
			};

			// Assign Display Information 
			_maps[mapId].dateFrom.setFullYear($("date_from", this).text());
			_maps[mapId].dateTo.setFullYear($("date_to", this).text());
			if (Date.compare(_maps[mapId].dateFrom, _maps[mapId].dateTo) === 0) {
				mapYear = _maps[mapId].dateFrom.getFullYear();
				if (mapYear < 0) _maps[mapId].dateStr = Math.abs(mapYear) + "B.C.";
				else _maps[mapId].dateStr = mapYear;

			} else {
				mapYear = _maps[mapId].dateFrom.getFullYear();
				if (mapYear < 0) _maps[mapId].dateStr = Math.abs(mapYear) + "B.C.";
				else _maps[mapId].dateStr = mapYear;

				_maps[mapId].dateStr += "-";

				mapYear = _maps[mapId].dateTo.getFullYear();

				if (mapYear < 0) _maps[mapId].dateStr += Math.abs(mapYear) + "B.C.";
				else _maps[mapId].dateStr += mapYear;
			}

			if (_maps[mapId].thumbnailUrl === "" || _maps[mapId].thumbnailUrl == "./images/thumbError.gif") {
				_maps[mapId].thumbnailUrl = "./images/thumbDummy" + (mapId % 5 + 1) + ".gif";
			}

			// Generate Map Boundary Array (for GPolygon rendering)
			/*
			_maps[mapId].boundary.push(new GLatLng(_maps[mapId].neLat, _maps[mapId].swLon));
			_maps[mapId].boundary.push(new GLatLng(_maps[mapId].neLat, _maps[mapId].neLon));
			_maps[mapId].boundary.push(new GLatLng(_maps[mapId].swLat, _maps[mapId].neLon));
			_maps[mapId].boundary.push(new GLatLng(_maps[mapId].swLat, _maps[mapId].swLon));
			_maps[mapId].boundary.push(new GLatLng(_maps[mapId].neLat, _maps[mapId].swLon));
			*/

			// Update the range of mapList
			if (_range.min === null || Date.compare(_maps[mapId].dateFrom, _range.min) < 0) {
				_range.min = _maps[mapId].dateFrom;
			}

			if (_range.max === null || Date.compare(_maps[mapId].dateTo, _range.max) > 0) {
				_range.max = _maps[mapId].dateTo;
			}

			$.each(overlaidMaps, function() {
				if ((this !== null) && (this.id == mapId)) {
					_maps[mapId].tileOverlay = this.tileOverlay;
					_maps[mapId].tileOpacity = this.tileOpacity;
				}
			});

		});

		//HyperCities.mainMap.addMapsProxy(_maps);

		if (_syncMap) {
			if (_range.min !== null) {
				HyperCities.mapList.overlayBaseMap(_range.min.toString('yyyy'), true);
				if (HyperCities.session.get("baseMap") !== null) {
					_baseMapId = HyperCities.session.get("baseMap").id;
				}
			}
		}

		if (_updateTimebar) {
			//set timebar to the union of timespan of all maps
			var range = HyperCities.mapList.getMapRange();
			var startYear = null;
			var endYear = null;
			if (range.min !== null) startYear = range.min.getFullYear();
			if (range.max !== null) endYear = Math.max(range.max.getFullYear(), new Date().getFullYear());

			HyperCities.control.timeSlider.setTime(null, startYear, endYear, null, false);
		}

		if (_doRender) {
			HyperCities.mapList.renderList();
		} else { // Reset render flag
			_doRender = true;
		}
		_doPostSyncOperations();
	};

	/**
	 * Render Error Message in intelliList
	 * @return void
	 */
	var _renderError = function() {

		var itemWrapper = $(document.createElement("div"));
		itemWrapper.attr("id", "intelliItem_error");
		itemWrapper.attr("class", "intelliItem");

		var itemImg = $(document.createElement("div"));
		itemImg.attr("id", "intelliImg_error");
		itemImg.attr("class", "intelliImg");
		itemImg.html('<img src="./images/thumbError.gif" ALT="No Map Available" />');

		var itemTitle = $(document.createElement("div"));
		itemTitle.attr("id", "intelliTitle_error");
		itemTitle.attr("class", "intelliTitle");
		itemTitle.html("<strong>Oops!&nbsp;</strong> No Map Available");

		var itemText = $(document.createElement("div"));
		itemText.attr("id", "intelliText_error");
		itemText.attr("class", "intelliText");
		itemText.html("We don't have map for this region. Try zooming out for" +
					"a broader look, or choosing one of our feature city from" + 
					"above mini map.");

		itemWrapper.append(itemImg).append(itemTitle).append(itemText);
		$("#intelliList").append(itemWrapper);
	};

	/**
	 * Add opacity control on map item in intellilist
	 * @param Number $mapId: the map ID
	 * @param Number $opacity: the opacity value
	 * @return void
	 */
	var _addOpacityControl = function($mapId, $opacity) {

		// Add Opacity Control
		var opacityControl = $(document.createElement("div"));
		opacityControl.attr("id", "intelliOC_" + $mapId);
		opacityControl.attr("class", "intelliOC");
		$("#intelliImg_" + $mapId).append(opacityControl);

		// Initial the Slider after dom inserted, otherwise startValue doesn't honer
		opacityControl.slider({
			value: $opacity * 100,
			slide: function(e, ui) {
				//HyperCities.mainMap.refreshMap(_maps[$mapId], ui.value / 100);
				HyperCities.earth.addMap(_maps[$mapId], ui.value/100);
			}
		});

		//HyperCities.mainMap.refreshMap(_maps[$mapId], $opacity);
	};

	/**
	 * Add map to HyperCities
	 * @param Number $mapId: the map ID
	 * @return void
	 */
	var _addMap = function($mapId) {
		$("#intelliItem_" + $mapId).addClass('highlight');

		_addOpacityControl($mapId, _maps[$mapId].tileOpacity);

		// proxy is used for 2d map. To be removed.
		/*
		_maps[$mapId].proxy.setFillStyle({
			opacity: 0
		});
		*/
		//HyperCities.mainMap.addMap(_maps[$mapId], _maps[$mapId].tileOpacity);
		HyperCities.earth.addMap(_maps[$mapId], _maps[$mapId].tileOpacity);
		HyperCities.session.set("map", _maps[$mapId]);
    // disable this feature
    /*
		//set current time to the start time of the map
		HyperCities.control.timeSlider.setTime(null, _maps[$mapId].dateFrom.getFullYear(), 
									_maps[$mapId].dateTo.getFullYear(), null, false);
    */
	};

	/**
	 * Click map item handler
	 * @param Object $event
	 * @return void
	 */
	var _clickMapItem = function($event) {

		var item = $(this);
		var mapId = item.attr('id').split('_')[1];
		var triger = $($event.target);
		var removeMap = item.hasClass('highlight');

		if (triger.hasClass('ui-slider') || triger.hasClass('ui-slider-handle') || triger.hasClass('intelliInfo')) return;

		if (removeMap) {
			HyperCities.session.removeMap(_maps[mapId]);
		} else {
			_addMap(mapId);
		}

		$('#intelliList').jScrollPane();
	};

	/**
	 * Parse the returned update map meta data
	 * @param Object $response: the returned map meta data
	 * @return void
	 */
	var _parseUpdateMapMeta = function($response) {

		var success = $($response).find("Success > Message").text();
		var error = $($response).find("Error > Message").text();

		if (error.length > 0) {
			alert(error);
		} else {
			HyperCities.mapList.update(null, null, true, false);
		}
		return;
	};

	/**
	 * Save map info after updating
	 * @param Number $mapId: the map ID
	 * @return void
	 */
	var _saveMapInfo = function($mapId) {
		// This will blur all editable filed. update _mapParams to currect state.
		$("titleMapInfoPanel").focus();
		$("#saveBtn").hide();
		$("#resetBtn").hide();

		// Delay the update call, wait the last update of _mapParams.
		setTimeout(
			function() {
				$.post("./updateMapMeta.php", _mapParams, _parseUpdateMapMeta, "html");
			},
			300
		);
		return false;
	};

	/**
	 * Update map info
	 * @param String value: the updated value
	 * @param Object settings: the update settings
	 * @return void
	 */
	var _updateMapInfo = function(value, settings) {

		var attr_id = $(this).attr("id");

		if (attr_id == "map_size") {
			if (/\s?(\d+)\s?x\s?(\d+)\s?\(cm\)/g.test(value)) {
				var mapSize = value.match(/\d+/g);
				_mapParams['width'] = mapSize[0];
				_mapParams['height'] = mapSize[1];
			} else {
				_mapParams['width'] = "NULL";
				_mapParams['height'] = "NULL";
				value = "";
			}
		} else if ($(this).hasClass("editableD")) {
			if (Date.parseExact(value, "yyyy-MM-dd")) {
				_mapParams[attr_id] = value;
			} else {
				_mapParams[attr_id] = "NULL";
				value = "";
			}
		} else {
			_mapParams[attr_id] = $.trim(value);
		}

		if (value == "") {
			value = "N/A";
		}

		return (value);
	};

	/**
	 * Show update button on info window
	 * @return void
	 */
	var _showUpdateBtn = function() {
		$("#saveBtn").show();
		$("#resetBtn").show();
		$("titleMapInfoPanel").focus();

		return false;
	}

	/**
	 * Load map info to map info window
	 * @param Number $mapId: the map ID
	 * @return void
	 */
	var _loadMapInfo = function($mapId) {

		_mapParams = {
			id: $mapId,
			userId: HyperCities.session.get("user")
		};

		// Start To Load the Map Meta via AJAX
		$("#loadingMessage").fadeIn("fast");
		$("#blackoutPanel").fadeIn("slow");

		$.ajax({
			url: "getMapMeta.php",
			cache: false,
			data: _mapParams,
			success: function(message) {
				$("#mapInfoWrapper").html(message);
				$("#loadingMessage").fadeOut("slow");
				$("#exportBtn").show();
				$("#saveBtn").hide();
				$("#resetBtn").hide();

				if (HyperCities.user.isLogin() == false) return;
				// Make normal input filed editable
				$(".editableW").editable(_updateMapInfo, {
					indicator: 'Saving...',
					tooltip: 'Click to edit...',
					cssclass: 'editHighlight',
					width: 355,
					height: 17,
					onblur: 'submit',
					data: function(value, settings) {
						_showUpdateBtn();
						if (value == "N/A") return "";
						else return value;
					}
				});
				// Make Note TextArea Editable
				$(".editableA").editable(_updateMapInfo, {
					type: 'autogrow',
					indicator: 'Saving...',
					tooltip: 'Click to edit...',
					cssclass: 'editHighlight',
					width: 360,
					onblur: 'submit',
					autogrow: {
						lineHeight: 15,
						minHeight: 18
					},
					data: function(value, settings) {
						_showUpdateBtn();
						if (value == "N/A") return "";
						else return value;
					}
				});

				// Make Date Field editable
				$(".editableD").editable(_updateMapInfo, {
					type: 'masked',
					indicator: 'Saving...',
					tooltip: 'Click to edit...',
					cssclass: 'editHighlight',
					mask: "2999-19-39",
					width: 65,
					onblur: 'submit',
					data: function(value, settings) {
						_showUpdateBtn();
						if (value == "N/A") return "";
						else return value;
					}
				});

				// Make Map Size Field editable
				$(".editableS").editable(_updateMapInfo, {
					indicator: 'Saving...',
					tooltip: 'Click to edit...',
					cssclass: 'editHighlight',
					width: 90,
					height: 17,
					onblur: 'submit',
					data: function(value, settings) {
						_showUpdateBtn();
						if (value == "N/A") return " x (cm)"
						else return value;
					}
				});
			}
		});

		return false;
	};

	/**
	 * Show MapInfo Panel
	 * @param Object $event
	 * @return void
	 */
	var _showMapInfo = function($event) {

		var mapId = $($event.target).attr("id").split('_')[1];
		var mapInfoDiv = $("#mapInfoPanel");
		var closeBox, infoBox, titleBox, exportBtn, saveBtn, resetBtn, offsetTop, offsetLeft;

		HyperCities.debug(_id + "Click Map Info " + mapId);

		// Prepare the DOM element to hold Map Meta Info
		mapInfoDiv = $(document.createElement("div"));
		mapInfoDiv.attr("id", "mapInfoPanel");

		titleBox = $(document.createElement("div"));
		titleBox.attr("id", "titleMapInfoPanel");
		titleBox.html("Map Metadata");

		closeBox = $(document.createElement("div"));
		closeBox.attr("id", "closeMapInfoPanel");
		closeBox.click(function() {
			$("#blackoutPanel").fadeOut("slow");
			$("#mapInfoPanel").fadeOut("slow", function() {
				$("#mapInfoPanel").remove();
			});
			//remove blackout on earth
			HyperCities.earth.removeBlackout();
		});

		infoBox = $(document.createElement("div"));
		infoBox.attr("id", "mapInfoWrapper");

		exportBtn = $(document.createElement("div"));
		exportBtn.attr("id", "exportBtn");
		exportBtn.attr("class", "button");
		exportBtn.html('<a target="_blank" href="exportMap.php?id=' + mapId + '">Export</a>');
		exportBtn.find("a").click(function() {
			$(this).blur();
		});

		saveBtn = $(document.createElement("div"));
		saveBtn.attr("id", "saveBtn");
		saveBtn.attr("class", "button");
		saveBtn.html('<a href="javascript:void(0);">Save Change</a>');
		saveBtn.find("a").click(function() {
			_saveMapInfo(mapId);
		});

		resetBtn = $(document.createElement("div"));
		resetBtn.attr("id", "resetBtn");
		resetBtn.attr("class", "button");
		resetBtn.html('<a href="javascript:void(0);">Reset</a>');
		resetBtn.find("a").click(function() {
			_loadMapInfo(mapId);
		});

		mapInfoDiv.append(titleBox)
				.append(closeBox)
				.append(infoBox)
				.append(resetBtn)
				.append(saveBtn)
				.append(exportBtn)
				.appendTo(document.body);

		$(".button > a").focus(function() {
			$(this).blur();
		});

		offsetLeft = ($('#contentWrapper').width() - mapInfoDiv.width()) / 2;
		offsetTop = Math.max(0, ($('#contentWrapper').height() - mapInfoDiv.height()) / 2);
		mapInfoDiv.css("left", offsetLeft + "px");
		mapInfoDiv.css("top", offsetTop + "px");

		// Start To Load the Map Meta via AJAX
		$("#loadingMessage").fadeIn("fast");

		//info panel cannot show correctly on GEarth
		//in earth mode, use blackoutPanel2 to block background, Jay
		//if (HyperCities.mainMap.getCurrentMapType() === G_SATELLITE_3D_MAP) {
			HyperCities.earth.blackoutScreen($("#contentWrapper"), mapInfoDiv);
		//} else {
		//	$("#blackoutPanel").fadeIn("slow");
		//}

		_loadMapInfo(mapId);
	};

	return {

		/**
		 * Update the map list 
		 * @param Object $mapBounds: the map boundary
		 * @param Number $mapZoom: the map zoom level
		 * @param Boolean $doRender: do render if true
		 * @param Boolean $async: update map list asynchronizely if true
		 * @param Boolean $updateTimebar: set timebar after updating map list
		 *								if true. This is useful to prevent loop
		 */
		update: function($mapBounds, $mapZoom, $doRender, $async, $updateTimebar) {

			HyperCities.debug(_id + "Update Map List");
			var timespan, mapBounds, mapZoom, params;
			var yearFrom, yearTo;
			
			$("#loadingMessage").fadeIn("fast");

			if (typeof($doRender) === "boolean") _doRender = $doRender;

			// Setup System Mode
			_originalMode = HyperCities.session.get("mode");
			if (_doRender) {
				HyperCities.session.set("mode", HyperCities.config.MODE_MAP_LIST);
			}

			// Setup query mapBound, mapZoom
			if ($mapBounds !== 'undefined' && $mapBounds !== null) {
        mapBounds = $mapBounds;
      } else {
        mapBounds = HyperCities.mainMap.getBounds();
      }
			if (typeof(mapBounds) === 'undefined' || mapBounds === null) {
			    // Sometimes GEarth seems to return undefined for map
			    // bounds if it isn't initialized.  In that case, cancelling
			    // the update seems safe, because it will be triggered
			    // later.
			    HyperCities.util.debug(_id + "mainMap.getBounds returned undefined. Cancelling Map List update.");
			    $("#loadingMessage").fadeOut("fast");
			    return false;
			}

			if ($mapZoom !== 'undefined' && $mapZoom !== null) mapZoom = $mapZoom;
			else mapZoom = HyperCities.mainMap.getZoom();

			params = {
				func: "mapList.update",
				neLat: mapBounds.north,
				neLon: mapBounds.east,
				swLat: mapBounds.south,
				swLon: mapBounds.west,
				dateFrom_BC: 0,
				dateTo_BC: 0
			};

			// Setup query timespan
			timespan = HyperCities.mainMap.getTimespan();
			if (typeof(timespan) !== 'undefined') {
				yearFrom = timespan.min.getFullYear();
				yearTo = timespan.max.getFullYear();
				if (yearFrom < 0) {
					params.dateFrom_BC = 1;
					yearFrom = - 1 * yearFrom;
				}
				if (yearTo < 0) {
					params.dateTo_BC = 1;
					yearTo = - 1 * yearTo;
				}
				params.startTime = yearFrom + timespan.min.toString("-MM-dd");
				params.endTime = yearTo + timespan.max.toString("-MM-dd");

				while (params.startTime.length < 10)
				params.startTime = "0" + params.startTime;

				while (params.endTime.length < 10)
				params.endTime = "0" + params.endTime;
			}

			if ($updateTimebar) _updateTimebar = $updateTimebar;
			else _updateTimebar = false;

			if (mapZoom < HyperCities.config.ZOOM_THRESHOLD && _doRender) {
				HyperCities.city.renderList(mapBounds);
			} else {
				// Get map list and call _parseMaps to render maps in maplist area
				// synchronous update is necessary when sync map to object
				$.ajax({
					url: './mapsList.php',
					dataType: 'xml',
					type: 'POST',
					async: $async,
					data: params,
					success: _parseMaps
				});
			}
		},

		appendNewMap: function($mapId, $data, $overlay) {
			// We already have this map
			if (typeof(_maps[$mapId]) !== 'undefined') {
				if ( $overlay === true ) {
					HyperCities.mapList.addMap($mapId);
					//HyperCities.mainMap.refreshMap(_maps[$mapId], $data.opacity);
				}
				return;
			}

			_wsParseMap($data, $overlay);
		},

		/**
		 * Set proxy display object of map
		 * @param Number $mapId: the map ID
		 * @param Object $proxy: the square polygon map indicator
		 */
		setMapProxy: function($mapId, $proxy) {
			if ((typeof(_maps[$mapId]) === 'undefined') || (typeof($proxy) !== 'object')) return;

			_maps[$mapId].proxy = $proxy;
		},

		/**
		 * Remove map proxy
		 * @return void
		 */
/*
		removeMapsProxy: function() {
			HyperCities.mainMap.removeMapsProxy(_maps);
		},
*/

		/**
		 * Set tileOverlay object of map
		 * @param Number $mapId: the map ID
		 * @param Object $overlay: the map tile
		 * @param Number $opacity: the opacity value
		 */
		setMapOverlay: function($mapId, $overlay, $opacity) {
			if ((typeof(_maps[$mapId]) === 'undefined') || (typeof($overlay) !== 'object')) return;

			_maps[$mapId].tileOverlay = $overlay;
			_maps[$mapId].tileOpacity = $opacity;
			HyperCities.session.set("map", _maps[$mapId]);
		},

		/**
		 * Return the map object by given Id
		 * @param Number $mapId: the map ID
		 * @return void
		 */
		getMap: function($mapId) {
			return (typeof(_maps[$mapId]) === 'undefined') ? null: _maps[$mapId];
		},

		/**
		 * Overlay base map on HyperCities
		 * @param Number $year: 
		 * @param Boolean $doRender: true to add overlay, otherwise only set
		 *							base map
		 */
		overlayBaseMap: function($year, $doRender) {
			var targetMapId = - 1;
			var currentDiff = 99999;
			var targetMapDiff = 99999;
			var overlaidMaps = HyperCities.session.get("map");
			var currentBaseMap = HyperCities.session.get("baseMap");
			var mapOverlaid = false;
			var doRender = true;

			HyperCities.debug(overlaidMaps);
			HyperCities.debug(currentBaseMap);

			$year = parseInt($year);

			if (typeof($doRender) !== 'undefined' && $doRender === false) doRender = false;

			// Search For closest map in current map list
			for (var i in _maps) {
				currentDiff = Math.abs(_maps[i].dateStr - $year);
				if (currentDiff < targetMapDiff) {
					targetMapId = i;
					targetMapDiff = currentDiff;
				}
			}

			// No Closest map find, reset baseMap
			if (typeof(_maps[targetMapId]) === 'undefined') {
				HyperCities.debug(_id + "Set BaseMap to null");
				HyperCities.session.set("baseMap", null);
				return;
			}

			// Not render, just return map year
			if (!doRender) return _maps[targetMapId].dateStr;

			// If the baseMap was set and still the same, don't need to do it again
			if (currentBaseMap !== null && currentBaseMap.id === targetMapId) {
				HyperCities.debug(_id + "Same BaseMap");
				return;
			} else {
				HyperCities.debug(_id + "Set BaseMap to " + _maps[targetMapId].dateStr);
				// Otherwise, set baseMap
				HyperCities.session.set("baseMap", _maps[targetMapId]);
				// Check if the map is already overlaid
				for (i in overlaidMaps) {
					if (overlaidMaps[i].id == targetMapId) mapOverlaid = true;
				}
				// If not, overlay the map
				HyperCities.mainMap.addMap(_maps[targetMapId], 1.0);
			}

			// Zoom to native zoom level of base map
			if (HyperCities.mainMap.getZoom() < _maps[targetMapId].maxZoom - 2) {
				HyperCities.mainMap.setCenter(HyperCities.mainMap.getCenter(), _maps[targetMapId].maxZoom - 2);
			}

			return _maps[targetMapId].dateStr;
		},

		/**
		 * Return the year range (max, min) of current map list
		 * @return Object _range: {Date max, Date min}
		 */
		getMapRange: function() {
			return _range;
		},

		/**
		 * Set sync map option. If sync map is true, show map when checking on
		 * an object
		 * @param Boolean $flag: 
		 * @return void
		 */
		syncWithMap: function($flag) {
			if (typeof($flag) !== 'boolean') return;

			_syncMap = $flag;
			HyperCities.debug(_id + "Sync Map " + _syncMap);
		},

		/**
		 * Unhighlight selected item in intellilist
		 * @param Number $mapId: the map ID
		 * @return void
		 */
		unHighlight: function($mapId) {
			var item = $("#intelliItem_" + $mapId);

			// Item already removed
			if (item.length == 0 || typeof(_maps[$mapId]) === 'undefined') return;
			item.removeClass('highlight');
			item.children(".intelliImg").children(".intelliOC").remove();
			/*
			_maps[$mapId].proxy.setFillStyle({
				opacity: 0.2
			});
			*/
		},

		/**
		 * Render the map list to intelliList
		 * @return void
		 */
		renderList: function() {
			HyperCities.intelliList.reset();

			var i,
				isHighlight,
				itemWrapper,
				itemImg, 
				itemTitle,
				itemText, 
				itemInfo, 
				itemExpand, 
				itemZoomBtn;

			for (i in _maps) {
				isHighlight = (_maps[i].tileOverlay !== null);

				itemWrapper = $(document.createElement("div"));
				itemWrapper.attr("id", "intelliItem_" + _maps[i].id);
				itemWrapper.data("yearFrom", _maps[i].dateFrom.getFullYear());
				if (isHighlight) itemWrapper.attr("class", "intelliItem highlight");
				else itemWrapper.attr("class", "intelliItem");

				itemImg = $(document.createElement("div"));
				itemImg.attr("id", "intelliImg_" + _maps[i].id);
				itemImg.attr("class", "intelliImg");
				itemImg.html('<img src="' + _maps[i].thumbnailUrl + '" ALT="' + _maps[i].title + '" />');

				itemTitle = $(document.createElement("div"));
				itemTitle.attr("id", "intelliTitle_" + _maps[i].id);
				itemTitle.attr("class", "intelliTitle");
				itemTitle.html("<strong>" + _maps[i].dateStr + '</strong> <span title="' 
								+ _maps[i].title + '" >' + _maps[i].title + "</span>");

				itemInfo = $(document.createElement("div"));
				itemInfo.attr("id", "intelliInfo_" + _maps[i].id);
				itemInfo.attr("class", "intelliInfo");
				itemInfo.attr("title", "Click to see the metadata");

				itemText = $(document.createElement("div"));
				itemText.attr("id", "intelliText_" + _maps[i].id);
				itemText.attr("class", "intelliText expand");
				itemText.html(_maps[i].description);

				// Zoom To Map button
				itemZoomBtn = $(document.createElement("div"));
				itemZoomBtn.attr("id", "intelliZoom_" + _maps[i].id);
				itemZoomBtn.attr("class", "intelliZoom");
				itemZoomBtn.attr("title", "Zoom the window to fit this map.");

				itemText.wordWraps();
				itemWrapper.append(itemImg)
							.append(itemTitle)
							.append(itemInfo)
							.append(itemZoomBtn)
							.append(itemText);

				// add event listener on item click
				itemWrapper.click(_clickMapItem);
				itemInfo.click(_showMapInfo);
				itemZoomBtn.click(HyperCities.mapList.zoomToMap);

				// add event listener on item hover
				itemWrapper.hover(
				function(event) {
					var targetId = $(this).attr('id');
					var mapId = targetId.split('_')[1];
					//if (HyperCities.mainMap.getCurrentMapType() !== G_SATELLITE_3D_MAP) {
					//	if (!$(this).hasClass("highlight")) _maps[mapId].proxy.show();
					//}
					//else {
						HyperCities.earth.addMapsProxy(mapId, _maps[mapId].neLat, _maps[mapId].neLon,
							_maps[mapId].swLat, _maps[mapId].swLon);
					//}
				},
				function(event) {
					var mapId = $(this).attr('id').split('_')[1];
					//if (HyperCities.mainMap.getCurrentMapType() !== G_SATELLITE_3D_MAP) {
					//	_maps[mapId].proxy.hide();
					//}
					//else {
						HyperCities.earth.removePolygon(mapId);
					//}
				});

				$("#intelliList").append(itemWrapper);

				// Compute Height after DOM inserted, add expand link if necessary
				// itemText.attr("debug", itemWrapper.height());
				// Increased factor from 64 to 68 to compensate for additional heigh
				// introduced by Zoom-To-Map button
				if ((!isHighlight && (itemWrapper.height() > 68)) 
					|| (isHighlight && (itemWrapper.height() > 88))) {
					// Add Link
					itemExpand = $(document.createElement("div"));
					itemExpand.attr("id", "intelliExpand_" + _maps[i].id);
					itemExpand.attr("class", "intelliExpand");
					itemExpand.html('<b>...</b> (<a href="#">more info</a>)');
					itemWrapper.append(itemExpand);

					// Bind Event Listener
					itemExpand.click(HyperCities.intelliList.toggleIntelliText);
				}

				// Hide all intelliText beyond 3rd line
				itemText.removeClass("expand");
			}

			// Restore OpacityControl
			var overlaidMap = HyperCities.session.get("map").slice();
			$.each(overlaidMap, function() {
				if (HyperCities.mapList.getMap(this.id) !== null) {
					_addOpacityControl(this.id, this.tileOpacity);
				}
			});

			var allMaps = $(".intelliItem");
			var totalMaps = allMaps.length;

			if (totalMaps == 0) {
				_renderError();
			}

			// Sort intelliItem Base on Map Year
			var sortMaps = $(".intelliItem").get();
			sortMaps.sort(function(a, b) {
				var keyA = $(a).data("yearFrom");
				var keyB = $(b).data("yearFrom");
				if (keyA < keyB) return - 1
				if (keyA > keyB) return 1
				return 0
			});

			$.each(sortMaps, function(index, row) {
				$("#intelliList").append(row);
			});
			$("#mapTab").html("Map (" + totalMaps + ")");
			HyperCities.intelliList.render($(".intelliItem"));

			// Scroll to Selected Item
			if ($.isFunction($("#intelliList")[0].scrollTo)) {
				$("#intelliList")[0].scrollTo('#' + $("#intelliList .highlight").attr("id"));
			}

		},

		/**
		 * Remove map from current session
		 * @param Number $id, the map ID
		 * @return void
		 */
		hideMap: function($id) {
			for (var i in _maps) {
				if (_maps[i].id == $id) {
					HyperCities.session.removeMap(_maps[i]);
					return;
				}
			}
		},

		/**
		 * Remove map from google map and session
		 * Delete map object as well
		 * @param Number $id: the map ID
		 * @return void
		 */
		removeMap: function($id) {
			for (var i in _maps) {
				if (_maps[i].id == $id) {
					HyperCities.session.removeMap(_maps[i]);
					HyperCities.mainMap.removeMap(_maps[i]);
					delete _maps[i];
					return;
				}
			}
			// Debug code
			HyperCities.util.debug(_id + "Attempted to remove map " + $id + ", but map was not found.");
		},

		/**
		 * Remove all maps from google map and session and delete map object
		 * @return void
		 */
		clearMaps: function() {
			var isFocused = $("#mapTab").parent().hasClass("highlight");
			for (var i in _maps) {
				HyperCities.session.removeMap(_maps[i]);
				HyperCities.mainMap.removeMap(_maps[i]);
			}
			_maps = [];
		},

		/**
		 * Add map
		 * @param Number mapId
		 * @return void
		 */
		addMap: function(mapId) {
			if ($.inArray(_maps[mapId], HyperCities.session.get("map")) == - 1) _addMap(mapId);
		},

		/**
		 * Get all map object
		 * @return Array _maps: an array containing all map objects
		 */
		getMaps: function() {
			return _maps;
		},

		/**
		 * Filter map on keyword
		 * @param String $keyword
		 * @return void
		 */
		filterResult: function($keyword) {
			HyperCities.debug(_id + "[A2] Filter map on keyword " + $keyword);
		},

		/**
		 * Find map closest to the given year. This function is called when
		 * timebar is changed
		 * @param Number $year:
		 * @return Number mapId: the map ID
		 */
		findMap: function($year) {
			var mapId = null;
			var timeDiff = Number.MAX_VALUE;

			$.each(_maps, function() {
				var dateFrom = this.dateFrom;
				var dateTo = this.dateTo;
				if (typeof(dateFrom) !== "undefined" && dateFrom !== null 
					&& typeof(dateTo) !== "undefined" && dateTo !== null) {

					var diff1 = Math.abs(dateFrom.getFullYear() - $year);
					var diff2 = Math.abs(dateTo.getFullYear() - $year);
					if (diff1 < timeDiff || diff2 < timeDiff) {
						mapId = this.id;
						timeDiff = Math.min(diff1, diff2);
					}
				}
			});

			HyperCities.debug(_id + "Find map " + mapId);
			return mapId;
		},

		/**
		 * Zoom to a map
		 * @param Object $event
		 * @return void
		 */
		zoomToMap: function($event) {
			$event.stopPropagation();
			// get map bounds
			var mapId = $($event.target).attr("id").split('_')[1];
			var map = _maps[mapId];
			var bounds = new geo.Bounds(new geo.Point([map.swLat, map.swLon]), new
					geo.Point(map.neLat, map.neLon));

			HyperCities.earth.flyToBounds(bounds, null);
			/*
			// build new GLatLngBounds
			var bounds = new GLatLngBounds(new GLatLng(map.swLat, map.swLon), new GLatLng(map.neLat, map.neLon));
			// pass that to mainMap
			var mainMap = HyperCities.mainMap.getMapInstance(bounds);
			if (mainMap.getZoom() == mainMap.getBoundsZoomLevel(bounds)) mainMap.panTo(bounds);
			// TODO: Possible bug here, due to incomplete map tiling: because zoom levels are limited,
			// zooming to some maps may take us out to a further zoom level than we have maps for.
			// It may make sense to add a fudge factor of +1 at some point to make sure users always
			// at least see something.
			//
			else mainMap.setCenter(bounds.getCenter(), mainMap.getBoundsZoomLevel(bounds));
			*/
		},

		/**
		 * Add post sync operation
		 * @param Object $operation: 
		 * @param Object $data
		 * @return void
		 */
		addPostSyncOperation: function ($operation, $data) {
			_postSyncOperations.push ({
				operation: $operation,
				data: $data
			});
		}
	}; // end public methods
} (); // end of Object
// end of file

