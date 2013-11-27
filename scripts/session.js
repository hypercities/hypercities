// vim: sw=4:ts=4:nu:nospell

/**
 * HyperCities session Objects
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2008-12-22
 * @version   0.7
 *
 */
 
HyperCities.session = function () {
	// do NOT access javascript generated DOM from here; elements don't exist yet

	// Private variables
	var _id         = "[HyperCities.session] ",
		_user       = null,
		_group      = null,
		_mode       = null,
		_city       = null,
		_zoom       = null,
		_center     = null,
		_baseMap    = null,
		_syncMap    = false,
		_infoWin    = null,
		_maxInfoWin = false,
		_maps       = [],
		_maxMaps    = 2 ,
		_currentBounds = null,          // Stores a GLatLngBounds object
		_currentTimespan = null,
		_baseCollection = 0,
		_loadedSnapshots = [],
		_permalinksRendered = false,
		_authedCollection = [],         // Store authenticated collections when adding object to collections

		_currectCollectionId = null;

    /**
	 * Check if the given mapId is in _maps array
	 * @param {Integer} $mapId Map's id
	 */
    var _inSession = function ($mapId) {
        var i ;

        for ( i in _maps ) {
            if ( _maps[i].id == $mapId ) {
                return i;
            }
        }

        return -1;
    };

    /**
	 * Check if the given mapId is the base Map.
	 * 
	 * @param {Integer} $mapId Map's id
	 */
    var _isBaseMap = function ($mapId) {
        if (_baseMap === null) // BaseMap not set
            return false;
        else if (_baseMap.id != $mapId) // Not the baseMap
            return false;
        return true;
    };

    /**
	 * Remove map from map.
	 * 
	 * @param {Integer} $mapId Map id to remove
	 */
	var _removeMap = function ($mapId) {
        var index, map;

        index = _inSession($mapId);

        // Map is in session, remove it.
        if (index >= 0) {
            map = _maps.splice(index, 1);
            HyperCities.mainMap.removeMap(map[0]);
            HyperCities.mapList.unHighlight(map[0].id);
        }

        // If it's also the baseMap, reset the baseMap
        if (_baseMap !== null && _baseMap.id == $mapId) _baseMap = null;

        // If we don't have any map overlay, remove blankMap
        //if (_maps.length === 0) HyperCities.mainMap.resetMapType();

        return map;
    };

	/**
	 * Add Authed Collection Id to session
	 * @param {Integer} $collectionId
	 */
	var _addAuthedCollection = function ($collectionId) {

		var collectionId = parseInt($collectionId),
			index        = $.inArray(collectionId, _authedCollection);

		if ( index < 0 ) {
			_authedCollection.push(collectionId);	
		}
	};

    /**
	 * Add Map Object to session
	 * 
	 * @param {Map object} $map Map object
	 * @param {Boolean} $isBaseMap Whether the map is the basemap
	 */
    var _addMap = function ($map, $isBaseMap) {
        var index, totalMaps, removedMap;

        // Count total maps we are overlayed now
        totalMaps = _maps.length ;

        if (_baseMap !== null) totalMaps++;

        // To set baseMap, just replace the old one. 
        if ( $isBaseMap ) {
            // if old baseMap is not in session, remove hightlight
            if (_baseMap !== null && (_inSession(_baseMap.id) < 0)) {
                HyperCities.debug("Session Remove Base Map");
                HyperCities.mapList.unHighlight(_baseMap.id);
                HyperCities.mainMap.removeMap(_baseMap);
            }
            _baseMap = $map;
            return;
        }

        if (_maps.length === 0) {
            //HyperCities.mainMap.addBlankMap();
        } else {
            // we have at least one map,
            // so check if Map already overlaid
            index = _inSession($map.id);
            // If map already overlaid, 
            if (index >= 0) {
                // If it's not the last one
                // bring the selected map to the end of queue
                if (index != _maxMaps - 1) {
                    removedMap = _maps.splice(index, 1);
                    _maps.push($map);
                }
                return;
            }
        }

        // If it's not base Map, then map not yet overlay
        if (_baseMap === null || $map.id !== _baseMap.id) _maps.push($map);

        // if necessary, remove extra overlay 
        if (_maps.length > _maxMaps)  {
            removedMap = _maps.shift();
            HyperCities.mainMap.removeMap(removedMap);
            HyperCities.mapList.unHighlight(removedMap.id);
        }
    };

    /**
	 * Set the city currently being viewed
	 *
	 * @param {Integer} $cityId Id of the city.
	 */
	var _setCity = function ($cityId) {
        _city = $cityId;
        //HyperCities.mainMap.setCity(_city);
    };

    
	return {
    	
    	permalinkedItems: { type: '', id:-1, bounds: null
    			},
    	permalinksRendered: false,

		/**
		 * Reset cookies and client session variables.
		 * 
		 */
		reset: function () {
			_user       = null;
			_group      = null;
			_mode       = null;
			_city       = null;
			_zoom       = null;
			_center     = null;
			_baseMap    = null;
			_syncMap    = false;
			_infoWin    = null;
			_currentTimespan = null;
			_currentBounds = null;
			_maxInfoWin = false;
			_maps.splice(0, _maps.length);
			_authedCollection = [];
			HyperCities.mainMap.resetMapType();
//			HyperCities.debug(_id + "Reset Session");
			return true;
		},
       
		/**
		 * Compares whether the session currently stored has the same bounds
		 * and same timespan.
		 *
		 * @param {Object {north: Number, south: Number, east: Number, west: Number }} $bounds Bounds of map
		 * @param {Object min: {Integer}, max: {Integer} } $timespan
		 * @param {Integer} $userId User's Id
		 * @return {boolean} True if the sessions are equal, false if the
		 *					 session is not initialized or is different.
		 */
        /*
		isEqualSession: function ($bounds, $timespan, $userId) {
			// If the current session (either bounds or timespan) is not even
			// initialized, then the session is not the same.
			if( _currentBounds == null || _currentTimespan == null ) return false;

			try {
				// Compare Date.valueOf because Date objects are not equal even
				// if they represent the same time.
			   var result = (
				  (_currentBounds.north == $bounds.north ) &&
				  (_currentBounds.south == $bounds.south ) &&
				  (_currentBounds.west == $bounds.west ) &&
				  (_currentBounds.east == $bounds.east ) &&
				  ($timespan.max.valueOf() == _currentTimespan.max.valueOf()) &&
				  ($timespan.min.valueOf() == _currentTimespan.min.valueOf()) &&
				  ($userId == _user)
				);
			} catch(e) {
				HyperCities.debug(_id + "Error in isEqualSession: "+e);
			}

			return result;
		},
        */


		/**
		 * Set client session variable
		 * 
		 * @param {String} $key String of key to set
		 * @param {Mixed} $value Value to apply
		 */
		set: function ($key, $value) {

			if ((typeof($key) !== 'string') || (typeof($value) === 'undefined')) {
				return false;
			}

//          HyperCities.debug(_id + _maps.length);
            switch ($key) {
                case "user"   : _user = $value; break;
                case "group"  : _group = $value; break;
				case "mode"   : _mode = $value; break;
                case "map"    : _addMap($value, false); break;
                case "baseMap": _addMap($value, true); break;
				case "syncMap": _syncMap = ($value === true); break;
                case "city"   : _setCity($value); break;
                case "zoom"   : _zoom = $value; break;
                case "center" : _center = $value; break;
				case "infoWin"    : _infoWin = $value; break;
				case "maxInfoWin" : _maxInfoWin = ($value === true); break;
				case "currentTimespan" : _currentTimespan = $value; break;
				case "currentBounds": _currentBounds = $value; break;
				case "baseCollection" : _baseCollection = $value; break;
				case "authedCollection" : _addAuthedCollection($value); break;
				case "currentCollectionId": _currentCollectionId = $value; break;
                default       : return false;
            }
            return true;
        },

		/**
		 * Get client session variable
		 *
		 * @param {String} $key Item to get
		 */
		get: function ($key) {

			if (typeof($key) !== 'string') {
				return 'undefined';
			}

            switch ($key) {
                case "user"   : return _user;
                case "group"  : return _group;
				case "mode"   : return _mode;
                case "map"    : return _maps;
                case "baseMap": return _baseMap;
				case "syncMap": return _syncMap;
                case "city"   : return _city;
                case "zoom"   : return _zoom;
                case "center" : return _center;
				case "infoWin"    : return _infoWin;
				case "maxInfoWin" : return _maxInfoWin;
                case "permalinksRendered": return _permalinksRendered;
				case "currentTimespan" : return _currentTimespan;
				case "currentBounds": return _currentBounds;
				case "baseCollection" : return _baseCollection;
				case "authedCollection" : return _authedCollection;
				case "currentCollectionId": return _currentCollectionId;
                default       : return 'undefined';
            }
        },

        /**
		 * Remove map from movie
		 * 
		 * @param {Map object} $map Map object to remove
		 */
		removeMap: function ($map) {
            if (typeof($map) === 'undefined')
                return false;
            return _removeMap($map.id);
        },
        
        /**
		 * Re-zoom map to coordinates supplied by data.
		 * 
		 * @param {xml/json} $data Data to use to update bounds
		 */
		rezoomMap : function ($data) {
			HyperCities.debug("Zooming to new coordinates.");
			var neLat = parseFloat($($data).find('neLat').text()),
				neLon = parseFloat($($data).find('neLon').text()),
				swLat = parseFloat($($data).find('swLat').text()),
				swLon = parseFloat($($data).find('swLon').text()),
				map = HyperCities.mainMap.getMapInstance(),
				bounds = new GLatLngBounds(new GLatLng(neLat, neLon),
										   new GLatLng(swLat, swLon)
				);
			//map.setZoom(map.getBoundsZoomLevel(bounds));
			map.setCenter(bounds.getCenter),
			map.getBoundsZoomLevel(bounds);
    	}
    };
}(); // end of Object

// end of file
