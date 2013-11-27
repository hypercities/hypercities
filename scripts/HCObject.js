/**
 * HyperCities Collection/Item Objects
 * This class stores object information for systemwise use.
 * Don't access DOM from this class, use collectionList, narrativePanel,..etc for view.
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2009-10-15
 * @version   0.7
 *
 */
 
HyperCities.HCObject = function() {
    
	// Private variable/function goes here
	var _id          = "[HyperCities.HCObject] ",
		_initialized = false,
		_objects     = [];

	/**
	 * Given object id, find the index of object in _objects array
	 * @param  integer $id
	 * @return integer The index of object $id in _objects array, or -1 if not found
	 */
	var _getIndexById = function($id) {
		var index = _objects.length;

		if ( typeof($id) !== "number" ) {
			return -1;
		}

		while ( index-- > 0 ) {
			// Compare the value and data type (should be both integer)
			if ( _objects[index].id === $id ) {
				return index;
			}
		}

		return -1;
	};

	/**
	 * Show/Hide Object on map
	 * @param $objectIndex 
	 * @param $isHidden
	 */
	var _setObjectState = function($objectIndex, $isHidden) {

		var item     = _objects[$objectIndex],
			isHidden = ($isHidden === true);	

		// If we have the information of object, Overlay the Placemark
		if ( typeof(item) !== 'undefined' ) {
			// item.overlay doesn't exist, and we want to show it 
			// then parse external kml and create overlay
			if ( !item.isAdded && !isHidden ) {

				switch (item.objectType) {
					case HyperCities.config.HC_OBJECT_TYPE.PLACEMARK :
						HyperCities.earth.append3DObject(item.id);
						break;
					case HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK :
						HyperCities.earth.append3DObject(item.id);
						break;
					case HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT :
						HyperCities.earth.append3DObject(item.id);
						break;
					case HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK:
						HyperCities.earth.append3DObject(item.id);
						break;
					default:
						return false;
				}

				HyperCities.earth.show3DObject(item.id);
			}
			else {
				HyperCities.earth.hide3DObject(item.id);
			}
		}

	};

	/**
	 * Reset HCObject, remove all objects and highlight marker
	 * If necessary, also remove the GMapOverlay of Object
	 */
	var _reset = function() {

    // Remove all markers in HCObject ( by yielding processes )
		if ( _objects.length > 0 ) {
			setTimeout(function() {
				var item = _objects.shift();

				/*
				// Remove the GMapOverlay of Object
				if ( item.overlay instanceof GOverlay ) {
					HyperCities.mainMap.removeOverlay(item.overlay);
				}
				*/
				HyperCities.earth.remove3DObject(item.id);
				
				// Remove next available item
				if ( _objects.length > 0 ) {
					setTimeout(arguments.callee, 10);
				} 
			}, 10);
		}

		// Clean up variables
		_initialized = false;

		return true;
	};


	/** 
	 * Add Object
	 * @param $linkId
	 * @param $data the data for HyperCities object
	 */
	var _addObject = function($linkId, $data) {

		var item = {};

		item = {
			objectType  : HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT, // Defined in HyperCities.config
			id          : $linkId,                                       // Integer
			name        : $data.name,                                    // String
			ownerId     : parseInt($data.ownerId),                       // Integer
			stateId     : parseInt($data.stateId),                       // Integer
			markerType  : parseInt($data.markerType),                    // Integer
			markerState : parseInt($data.markerState),                   // Integer
			baseMapId   : parseInt($data.baseMapId),                     // Integer
			kml         : $data.markerKml,                               // String
      description : $data.description,
			url         : $data.linkUrl,                                 // String
			bounds      : $data.bounds,                                  // GLatLngBounds
			overlay     : null,                                          // GGeoXml
			startTime   : $data.dateFrom,
			endTime     : $data.dateTo,
			isExternal  : ($data.isExternal === true),                   // Boolean
			isHidden    : ($data.isHidden === true),                     // Boolean
			isAdded     : false,                                         // Boolean
			maps        : $data.maps,                                    // Array
			objs        : $data.objs                                     // Array
		};

    // server return data in different format for narrative mode and normal mode
    // select inner kml if it exists (for normal mode)
    if ($("kml > Placemark", item.kml).length != 0)
      item.kml = $("kml > Placemark", item.kml).get(0);

    // embbed description in kml for showing description in bubble
    var description = "<description><![CDATA[" + (item.description || "") + "]]></description>";

    // item.kml is either string of jquery object
    if (typeof item.kml == "string")
    {
      item.kml = item.kml.replace("<description></description>", description);
    }
    else
    {
      var myKml = $(item.kml);
      myKml.append(description);
      item.kml = myKml.get(0);
    }

		HyperCities.earth.add3DObject(item);
		_objects.push(item);
	};

	/** 
	 * Add Folder Object
	 * @param $folderId
	 * @param $data
	 */
	var _addFolder = function($folderId, $data) {

		var item = {};

		item = {
			objectType  : HyperCities.config.HC_OBJECT_TYPE.FOLDER, // Defined in HyperCities.config
			id          : $folderId,                                // Integer
			name        : $data.name,                               // String
			ownerId     : parseInt($data.ownerId),                  // Integer
			stateId     : parseInt($data.stateId),                  // Integer
			children    : parseInt($data.children),                 // Integer
			hasCheckBox : ($data.hasCheckBox === true),             // Boolean
			isHidden    : false                                     // Always False for Folder
		};

		_objects.push(item);

	};

	/** 
	 * Add EarthNetworkLink Object
	 */
	var _addEarthNetworkLink = function($linkId, $data) {

		var item = {};

        var url = $data.linkUrl;
        if ($data.linkUrl && $data.linkUrl.slice(-4) !== ".kml" && $data.linkUrl.slice(-4) !== ".kmz") {
            url += ".kml";
        }

		item = {
			objectType  : HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK, // Defined in HyperCities.config
			id          : $linkId,                                       // Integer
			name        : $data.name,                                    // String
			ownerId     : parseInt($data.ownerId),                       // Integer
			stateId     : parseInt($data.stateId),                       // Integer
			baseMapId   : parseInt($data.baseMapId),                     // Integer
			//url         : $data.linkUrl,                                 // String
			url         : ($data.markerKml)? $data.markerKml: url,                                 // String
			bounds      : $data.bounds,                                  // GLatLngBounds
			overlay     : null,                                          // GGeoXml
			// only earth NL has view because other object has KML which has view
			view        : $data.view,
			startTime   : $data.dateFrom,
			endTime     : $data.dateTo,
			isExternal  : ($data.isExternal === true),                   // Boolean
			isHidden    : ($data.isHidden === true),                     // Boolean
			isAdded     : false,                                         // Boolean
			maps        : $data.maps,                                    // Array
			objs        : $data.objs                                     // Array
		};

		HyperCities.earth.add3DObject(item);
		_objects.push(item);
	};

	/**
	 * Remove Object
	 * @param $objectIndex
	 */
	var _removeObject = function($objectIndex) {
		
		var item = _objects[$objectIndex];

    /*
		// If necessary, remove KML Overlay
		if ( typeof(item) !== 'undefined' && item.overlay instanceof GOverlay ) {
			HyperCities.mainMap.removeOverlay(item.overlay);
		}
    */

		HyperCities.earth.hide3DObject(item.id);
		item.isAdded = false;
		//TODO:: If necessary, remove Base Map

		_objects.splice($objectIndex, 1);
	};

	/**
	 * @deprecated  This fucntion is replaced by _addObject($linkId, $data)
	 * Remove Folder Object
	 */
	var _removeFolder = function($objectIndex) {
		_objects.splice($objectIndex, 1);
	};


	// end of private variable/function

	// Public variable/function goes here
	return {

		/**
		 * Initialize HCObject Class
		 */
		init: function() {

			if ( _initialized ) {
				return;
			}

			// Reset HCObject
			_reset();		

			// Setup Highlight Marker
			//_initMarker();

			_initialized = true;

			return true;
		},

		/**
		 * Remove all Objects in HCObject class
		 * If necessary, also remove the GMapOverlay of Object
		 */
		reset: function() {
			return _reset();
		},

		/**
		 * Add the Object to HCObject Class
		 */
		addObject: function($objectType, $objectId, $metadata) {

			var item = {},
				objectId = parseInt($objectId),
				metadata = $metadata || {};

			// If object already exist, abort and return false
			if ( _getIndexById(objectId) >= 0 ) {
				return false;
			}

			switch ($objectType) {
				case HyperCities.config.HC_OBJECT_TYPE.FOLDER :
					_addFolder(objectId, metadata);
					break;
				case HyperCities.config.HC_OBJECT_TYPE.PLACEMARK :
					_addObject(objectId, metadata);
					break;
				case HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK :
					_addEarthNetworkLink(objectId, metadata);
					break;
				case HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT :
					_addObject(objectId, metadata);
					break;
				case HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK :
					_addEarthNetworkLink(objectId, metadata);
					break;
				default:
					return false;
			}

			return true;
		},

		/**
		 * Remove the Object from HCObject Class by giving object Id
		 * If necessary, also remove the GMapOverlay of Object
		 * @param $objectId
		 */
		removeObject: function($objectId) {

			var item = {},
				objectId = parseInt($objectId),
				objectIndex = _getIndexById(objectId);

			// If object does not exist, abort and return false
			if ( objectIndex < 0 ) {
				return false;
			}

			switch (_objects[objectIndex].objectType) {
				case HyperCities.config.HC_OBJECT_TYPE.FOLDER :
					_removeFolder(objectIndex);
					break;
				case HyperCities.config.HC_OBJECT_TYPE.PLACEMARK :
					_removeObject(objectIndex);
					break;
				case HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK :
					_removeObject(objectIndex);
					break;
				case HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT :
					_removeObject(objectIndex);
					break;
				case HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK :
					_removeObject(objectIndex);
					break;
				default:
					return false;
			}

//			HyperCities.util.debug(_objects);
			return true;
		},


		/**
		 * Add Rich Object to HCObject Class
		 * @param  {Integer} Object Id
		 * @param  {JSON}    Object metadata in JSON format
		 *
		 * @return {Array}   List of ojbect Ids contain in RichObject
		 */
		parseRichObject: function($objectId, $data) {

			// Handle the WebService JSON Error case.
			if ( $.isArray($data) ) {
				$data = $data[0];
			}

			var id   = $data.id,
					maps = $data.maps,
					objs = $data.objects,
					objectId = 0,
					objectIdList = [],
					len  = 0,
					i    = 0;

			// Overlay maps
			if (maps !== undefined) {
				len = maps.length;
				for (i = 0 ; i < len ; i++ ) {
					if ( maps[i].tileType == "ArcGIS" ) {
					  HyperCities.mainMap.addMapByUrl(maps[i].tileUrl, 'ArcGIS', maps[i].opacity, {}, maps[i].layers);
					} else if (maps[i].tileType == "WMS") {
						HyperCities.mainMap.addMapByUrl(maps[i].tileUrl, 'WMS', maps[i].opacity, {}, maps[i].layers);
					} else {
					  HyperCities.util.debug("overlay map "+maps[i].id);
					  HyperCities.mapList.appendNewMap(maps[i].id, maps[i], true);
					}
				}
			}

			// Overlay objects
			if (objs !== undefined) {
				len = objs.length;
				for (i = 0 ; i < len ; i++ ) {
					objectId = parseInt(objs[i].id);
					HyperCities.util.debug(_id + "overlay children " + objectId + "of object " + id);
					//HyperCities.HCObject.appendNewObject(objectId, objs[i]);

					var data = {
						objectType  : objs[i].objectType,
						id          : objs[i].id,
						name        : objs[i].name,
						ownerId     : parseInt(objs[i].ownerId),
						stateId     : parseInt(objs[i].stateId),
						markerType  : parseInt(objs[i].markerTypeId),
						markerState : parseInt(objs[i].markerState),
						baseMapId   : parseInt(objs[i].baseMapId),
						markerKml   : objs[i].mapping.kml,
						view        : objs[i].mapping.view,
						linkUrl     : objs[i].linkUrl,
						bounds      : HyperCities.util.parseBoundingBox(objs[i].viewFormat),
						overlay     : null,
						dateFrom    : objs[i].mapping.dateFrom.date,
						dateTo      : objs[i].mapping.dateTo.date,
						isExternal  : (objs[i].isExternal === true),
						isHidden    : (objs[i].isHidden === true),
						isAdded     : false,
						maps        : objs[i].maps,
						objs        : objs[i].objs
					}

					HyperCities.HCObject.addObject(objs[i].objectType, objectId, data);
					HyperCities.HCObject.show(objectId);
					//HyperCities.collectionList.check(objectId);
					objectIdList.push(objectId);
				}
			}

			HyperCities.HCObject.show(id);

			return objectIdList;
		},

		/**
		 * Hide Rich Object
		 */
		hideRichObject: function($objectId, $skipList) {
			var $data = HyperCities.HCObject.get($objectId);
			if (!$data) { return; };

			HyperCities.debug(_id + "Hide Rich object (" + $objectId + ")");
			var	id    = $data.id,
				maps  = $data.maps || [],
				objs  = $data.objs || [],
				objId = -1,
				currentMap = [],
				oldMaps = [],
				len = 0,
				i   = 0,
				j   = 0;

			// Hide Overlay maps
			//oldMaps = $.map($data.maps, function ($node){ return $node.id;});
			oldMaps = maps;
			currentMap = HyperCities.session.get("map");
			for (j = currentMap.length - 1 ; j >= 0 ; j--) {
				if ( $.inArray(parseInt(currentMap[j].id), oldMaps) >= 0 ) {
					HyperCities.session.removeMap(currentMap[j]);
				}
			}

			// Hide objects (if it's not in skipList)
			len = objs.length;
			for (i = 0 ; i < len ; i++ ) {
				objId = parseInt(objs[i].id);
				if ( $.inArray(objId, $skipList) < 0 ) {
					HyperCities.HCObject.hide(objId);
					HyperCities.debug(_id + "Hide object (" + objId + ") in " + $objectId);
					//HyperCities.collectionList.uncheck(objId);
				}
			}
		},

		/**
		 * Get the Object from HCObject Class by giving object Id
		 * @param integer $id
		 * @return integer The index of object $id in _objects array, or -1 if not found
		 */
		getObjectIndex: function ($objectId) {
			var objectId = parseInt($objectId);

			return _getIndexById(objectId);
		},

		/**
		 * Get the Object form HCObject Class by giving object Id
		 * @param {Integer} $id
		 * @retur {Object} The HCObject, or null if not found
		 */
		get: function ($objectId) {
			var objectId    = parseInt($objectId),
				objectIndex = _getIndexById(objectId);

			if (objectIndex < 0) {
				return null;
			}
			return _objects[objectIndex];
		},

		/**
		 * Return the coordinates of _overlay (Marker, Polyline or Polygon)
		 * @return {Array} Array of GLatLng Object
		 */
		getLatLng: function ($objectId) {

			var item        = {},
				objectId    = parseInt($objectId),
				objectIndex = _getIndexById(objectId),
				latLng      = [];

			// If object doesn't exist, abort and return false
			if (objectIndex < 0) {
				return false;
			}

			item = _objects[objectIndex];

			// If we have the information of object's overlay, get center of the overlay
			if ( typeof(item) !== 'undefined' && item.overlay instanceof GOverlay ) {
				latLng = item.overlay.getCoords();
			}

			return latLng;
		},

		/**
		 * Show the object in Main Map by given object Id
		 */
		show: function ($objectId) {

			var isHidden = false,
				objectId = parseInt($objectId),
				objectIndex = _getIndexById(objectId);

			// If object doesn't exist, abort and return false
			if ( objectIndex < 0 ) {
				return false;
			}

			switch (_objects[objectIndex].objectType) {
				case HyperCities.config.HC_OBJECT_TYPE.FOLDER :  // Folder doesn't overlay on map
					break;
				default:
					//_setObjectState(objectIndex, isHidden);
					HyperCities.earth.append3DObject(objectId);
					HyperCities.earth.show3DObject(objectId);

					break;
			}

			return true;
		},
	
		/**
		 * Hide the object in Main Map by given object Id
		 */
		hide: function($objectId) {

			var isHidden = true,
//				isHighlight = false,
				objectId = parseInt($objectId),
				objectIndex = _getIndexById(objectId);

			// If object doesn't exist, abort and return false
			if ( objectIndex < 0 ) {
				return false;
			}

			switch (_objects[objectIndex].objectType) {
				case HyperCities.config.HC_OBJECT_TYPE.FOLDER :  // Folder doesn't overlay on map
					break;
				default:
					//_setObjectState(objectIndex, isHidden);
					HyperCities.earth.hide3DObject(objectId);
					break;
			}

			return true;
		},

		/**
		 * zoom to a certain collection by given object Id
		 */
		zoomTo: function($objectId) {
			
			var item = {},
				objectId = parseInt($objectId),
				objectIndex = _getIndexById(objectId);

			// If object doesn't exist, abort and return false
			if ( objectIndex < 0 ) {
				return false;
			}

			item = _objects[objectIndex];

			HyperCities.earth.flyTo(objectId, item.view);

			return true;
		},

		/**
		 * Check if object is visible by given object Id
		 * @param $objectId
		 * @return boolean
		 */
		isVisiable: function($objectId) {

			var objectId = parseInt($objectId),
				objectIndex = _getIndexById(objectId);

			// If object doesn't exist, abort and return false
			if ( objectIndex < 0 ) {
				return false;
			}

			return (_objects[objectIndex].isHidden === false);
		}

	}; // end of public variable/function
}(); // end of Object

// end of file
