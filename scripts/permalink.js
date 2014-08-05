/**
 * Manages interaction with the URL bar, and scans for permalinks
 *
 * @author    David Shepard
 * @copyright Copyright 2009, The Regents of the University of California
 * @date      2009-07-01
 * @version   $Id$
 *
 */

HyperCities.linkController = function () {
    var _id = "[Hypercities Link Controller] ";
    var _timingInterval = 10; // Number of miliiseconds between executions of this process.
    var _linkUpdateDelay = 3000; // The default wait for a link. Set to 0 once the first link has been parsed, or after 5 seconds.
    // This is necessary because the application is loaded asynchronously.
    var _lastHash = "",
	_lastSearch = "",
	_systemHashes = ["#", "#search", "#login", "#worldMap"],
	_moveMap = true,
	_commandMode = false,
	_threadHandle; // identifier returned by setInterval() for _pollHash thread

    /**
     * This function is the pseudo-thread. It checks if a new permalink has been
     * entered, and if so, applies it.
     *
     */
    var _pollHash = function () {
		if (window.location.hash == "#") return;
        // Skip hashes containing "width" if (and only if) it's the first argument
        // because this means that the permalink is in the query string.
        if (window.location.hash.toString().indexOf("#width=") > -1) return;
		if (window.location.search.toString().indexOf("?link=") > -1) return;
	
        if (_lastHash == "" && window.location.search != "" && _lastSearch != window.location.search.toString().substr(1)) {
            // Do not parse hashes intended for other parts of the application.
            if ($.inArray(window.location.hash, _systemHashes) != -1) return;
            _lastHash = window.location.search.toString().substr(1);
			_lastSearch = window.location.search.toString().substr(1);
            HyperCities.debug (_id + "Found permalink");
            _handlePermalink(window.location.search.toString().substr(1));
            return;
        }
        
        // Do not parse hashes intended for other parts of the application.
        if ($.inArray(window.location.hash, _systemHashes) != -1 ) return;
        // get new hash and remove hash from the beginning of it
        var currentHash = window.location.hash.substr(1).split("?")[0];
        // Because the view may move, the user may want to return to the previous view using a link
        
        // If the hash has not changed since last polled, do nothing
        if (currentHash == _lastHash || currentHash == "") return;
        // handle coordinates as ll, z
        if (currentHash.indexOf('ll') == 0) {
            _lastHash = currentHash;
            _zoomToCoords(currentHash);
            return;
        }
        
        
        // Otherwise, we parse it
        if (currentHash.indexOf(':') !== -1) {
			_lastHash = currentHash;
			HyperCities.embeddedApi.handle(currentHash);
			return;
		}
        _lastHash = currentHash;
        _handlePermalink(currentHash);
    }

    var _parseHashToCommand = function ($hash) {
        var commands = $hash.split(';'),
            func = '',
            args = '',
            pieces = [];
        for (var i in commands) {
            pieces = commands.split['='];
            func = pieces[0];
            args = pieces[1].split(',');
            // NOTE: we don't need loadNarrative here because that will be handled
            // as a regular permalink
            switch (func) {
            case 'showCollections':
                _showCollection(args);
                break;
            case 'showMaps':
                _showMaps(args);
                break;
            }
        }
    }

    var _zoomToCoords = function ($hash) {
        var lat = parseFloat($hash.substr($hash.indexOf("=") + 1, $hash.indexOf(",") - 1));
        if ($hash.indexOf("z") != -1) {
            var zoom = parseInt($hash.substr($hash.indexOf("=", $hash.indexOf("z")) + 1));
            HyperCities.debug($hash.substr($hash.indexOf("=", $hash.indexOf("z")) + 1));
            var lng = parseFloat($hash.substr($hash.indexOf(",") + 1, $hash.indexOf("&z") - 1 ));
            if (zoom == HyperCities.mainMap.getZoom()) HyperCities.mainMap.panTo(new GLatLng(lat, lng));
            else HyperCities.mainMap.setCenter(new GLatLng(lat, lng), zoom);
            return;
        } else {
            var lng = parseFloat($hash.substr($hash.indexOf(",") + 1));
            HyperCities.debug($hash.substr($hash.indexOf(",")));
            var zoom = HyperCities.mainMap.getZoom();
            HyperCities.mainMap.panTo(new GLatLng(lat, lng));
            return;
        }
        
        //HyperCities.debug($hash.substr($hash.indexOf("="), $hash.indexOf(",")));
        HyperCities.debug(_id + "Lat: " + lat + " Lon: " + lng + " Zoom: " + zoom);
        HyperCities.mainMap.setCenter(new GLatLng(lat, lng), zoom);
    };

    var _queryParse = function (qString) {
        // If a user has just entered a city name
        // Changed to allow both anchors and query strings
        //var qString = $hash;
        if (qString.indexOf('#') != -1) qString = qString.split('#')[1];
        if (qString.indexOf('/') != -1) {
            return {
                itemType : qString.split('/')[0],
                itemId : qString.split('/')[1]
            }
        }
        if (qString.indexOf('&') == -1) {
            HyperCities.debug(_id + " Assuming city was specified in URL.");
            return {
                item_type : 'city',
                city_name : qString
            };
        } // end city parsing
        var query = new Array();
        // remove the Question Mark at the beginning
        if (qString.indexOf('&')) {
            var pairs = qString.split("&");
        } else {
            var pairs = qString;
        }
        // allowable keywords
        var allowableVars = new Array("city", "ne_lat", "ne_lon", "sw_lat", "zoom",
            "sw_lon", "object_type", "item_id" // NOTE: item_id can refer to objects or maps, or any other item
            ); // TBC ...
        for (var i in pairs) {
            var keyval = pairs[i].split("=");
            query[keyval[0]] = keyval[1];
        // necessary because $.ajax functions require maps
                
        } // end for (i in pairs)
        var params = {
            // location
            neLat:query['neLat'],
            neLon: query["ne_lon"],
            swLat:query["sw_lat"],
            swLon:query['sw_lon'],
            centerLat: query['center_lat'],
            centerLon: query['center_lon'],
            // Style
            zoom:query["zoom"],
            itemType: query['item_type'],
            itemId: query['item_id']
        }
        return query;
    }

    var _handlePermalink = function ($hash) {
        HyperCities.debug (_id + "Handling permalink " + $hash);
        // TODO: edit this function so that it uses what is passed to it ($hash) rather than browser object
        var params = new Object();
        var query = _queryParse($hash);
        HyperCities.session.permalinkedItems.id = query['item_id'];
        HyperCities.session.permalinkedItems.type = query['item_type'];

        if (typeof(query.itemType) !== 'undefined') {
            switch (query.itemType.toLowerCase()) {
                case 'objects':
                    // get coordinates from database and center on these
                    params = { object_id   : query.itemId };
                    $.post("./getObject.php", params, _objectPermalinkCallback, "xml");
                    break;
                case 'collections':
                case '3dcollections':
                        
                    params.cid = parseInt(query.itemId);
                    params.func = 'narrativePanel.getNarrative';
                    // Set option zoom to ture,
                    // this method will auto zoom the map to the extent of collection.
                    // Because we don't have parentId information,
                    // set it to null will disable the delete button in narritive Panel
                    setTimeout(function() {
                        HyperCities.narrativePanel.load(params.cid, {
                            zoom: true
                        });
                    }, 2000);
                    break;
               case 'city':
                    var zoomToCity = function () {
                        var city = HyperCities.city.getCityByName(query.city_name.replace(/_/, " "));
                        if (typeof(city) == 'undefined') alert ("Invalid City Name.");
                        HyperCities.mainMap.removeCities();
                        HyperCities.mainMap.setCenter(city.defaultCenter, 14);
                    }
                    HyperCities.debug(_id + " Looking for " + query.city_name);
                    HyperCities.session.set("city", query.city_name.replace(/_/, " "));

                    if (_linkUpdateDelay != 0) {
                        setTimeout (zoomToCity, _linkUpdateDelay);
                    }
                    else {
                        zoomToCity();
                    }
                   break;
               default:
				   HyperCities.util.debug(_id + "Invalid item type found in URL.");
                   break;
            } // end switch (query.item_type)
           
            return; // leave function now -- permalink has been dispatched
        } // end checking if item is new-style permalink

        if (query['item_type'] == 'object') {
            HyperCities.mainMap.closeHCInfoWindow();
            // get coordinates from database and center on these
            
            var params = {
                object_id   : query['item_id']
            }
            $.post("./getObject.php", params, _objectPermalinkCallback, "xml");
        }
        else if (query.item_type == 'city') {
            var zoomToCity = function () {
                var city = HyperCities.city.getCityByName(query.city_name.replace(/_/, " "));
                if (typeof(city) == 'undefined') alert ("Invalid City Name.");
                HyperCities.mainMap.removeCities();
                HyperCities.mainMap.setCenter(city.defaultCenter, 14);
            }

			HyperCities.debug(_id + " Looking for " + query.city_name);
			HyperCities.session.set("city", query.city_name.replace(/_/, " "));

			if (_linkUpdateDelay != 0) {
				setTimeout (zoomToCity, _linkUpdateDelay);
			}
			else {
				zoomToCity();
			}
        } // end if a city
		else if (query['item_type'] == 'collection') {
            params.cid = parseInt(query['item_id']);
            // Set option zoom to ture,
            // this method will auto zoom the map to the extent of collection.
            // Because we don't have parentId information,
            // set it to null will disable the delete button in narritive Panel
            setTimeout(function() {
                HyperCities.narrativePanel.load(params.cid, {
                    zoom: true
                });
            }, 1000);
        } else {
            HyperCities.util.debug (_id + "Invalid item type.");
        }
    }; // end handlePermalink: function ()

	var _objectPermalinkCallback = function ($data) {

		if ($("Error", $data).length > 0) {
			alert ($("Error > message", $data).text());
			return;
		}

		// zoom to coordinates
		var id = parseInt($("id:first", $data).text());
            // Zoom to first coordinates because usually, this is close enough to the object
			// Zoom by default, if $moveMap is false
			if (_moveMap == true) {
				var coords = $($data).find("default\\:coordinates").text().split(',');
				HyperCities.util.debug("coords" + coords);
				// GMap coordinates are lon, lat rather than lat, lon
				var newCenter = new GLatLng(parseFloat(coords[1]), parseFloat(coords[0]));
				HyperCities.mainMap.setCenter(newCenter, 14);
			} else {
				_moveMap = false;
			}
            // update collection list
            $("#collectionTab").parent().addClass("highlight");
            $("#mapTab").parent().removeClass("highlight");
            $("#intelliList").hide();
            HyperCities.intelliList.reset();
            $("#intelliList").show();
            HyperCities.debug (HyperCities.mainMap.getMapInstance().getBounds());
            HyperCities.collectionList.update(HyperCities.mainMap.getBounds(), HyperCities.mainMap.getZoom(), true);
            
            HyperCities.debug(_id + "Checking collections ...");
            HyperCities.collectionList.openCollection(HyperCities.config.HC_COLLECTIONS.PUBLIC.id);
            $("kml > collections > id", $data).each( function () {
                // open each
                HyperCities.debug(_id + "Opening collection " + $(this).text());
                HyperCities.collectionList.openCollection($(this).text());
            });
            setTimeout ( function () {
				var isAdded = false;
				isAdded = HyperCities.HCObject.showInfoWindow(id, {maximize: true});
				if ( !isAdded ) {
					setTimeout(arguments.callee, 2000);
				}
            },
            4000);
            HyperCities.mainMap.getMapInstance().HCOldLatLng = HyperCities.mainMap.getCenter();
            return;
    } // end _objectPermalinkCallback = function ($data)

    // Public methods
    return {
        permalinkedItems : [],
        
        /**
         * Initializes the link controller object. This starts the thread listening
         * for updates to the permalinked object.
         */
        init: function() {
            HyperCities.debug(_id + "Starting permalink polling thread.");
            _threadHandle = setInterval (_pollHash, _timingInterval);
            setTimeout (function () {
                _linkUpdateDelay = 0;
            }, 5000);
        },

        updateURL : function ($itemType, $itemId) {
			$itemType = "3d" + $itemType;
            _lastHash = $itemType + "/" + $itemId;
            window.location.hash = $itemType + "/" + $itemId;
        },
        
        clearURL : function () {
            _lastHash = "";
            window.location.hash = "#";
            HyperCities.session.permalinkedItems = {
                type: null,
                id: -1,
                bounds: null
            };
        },

		loadObject: function ($hash) {
			_moveMap = false;
			_lastHash = "#" + $hash;
			_handlePermalink($hash);
		},

        handleZoomLink : function ($zoomLink) {
            var coordinates = _queryParse($zoomLink.substr(1));
            if (coordinates['z'] != undefined) {
                var latlng = coordinates['ll'].split(',');
                if (parseInt(coordinates['z']) == HyperCities.mainMap.getZoom())
                {
                    HyperCities.mainMap.getMapInstance().panTo(new GLatLng(parseFloat(latlng[0]), parseFloat(latlng[1])));
                    HyperCities.debug(_id + "Zoomed to : " + coordinates['ll']);
                }
                else {
                    HyperCities.mainMap.setCenter(new GLatLng(parseFloat(latlng[0]),
                        parseFloat(latlng[1])), parseInt(coordinates['z']));
                    HyperCities.debug(_id + "Zoomed to : " + coordinates['ll'] + " at zoom level " + coordinates['z'] + " Main map zoom: " + HyperCities.mainMap.getZoom());
                }
            } else {
                
                var lng = parseFloat($hash.substr($hash.indexOf(",") + 1));
                HyperCities.debug($hash.substr($hash.indexOf(",")));
                var zoom = HyperCities.mainMap.getZoom();
                HyperCities.mainMap.panTo(new GLatLng(lat, lng));
                
            }
            if (coordinates['ts'] != undefined) {
                var timespan = coordinates['ts'].split('-');
                HyperCities.mainMap.setTimespan({
                    min: parseInt(timespan[0]),
                    max: parseInt(timespan[1])
                    }, true);
            }
        },

        getPermalinkBase : function () {
            var locationBar = window.location.toString();
			return locationBar.substr(0, locationBar.indexOf('?'));
            if (locationBar.indexOf('#') != -1) {
                return locationBar.substr(0, locationBar.indexOf('#'));
            }
            if (locationBar.indexOf('?') != -1) {
                return locationBar.substr(0, locationBar.indexOf('?'));
            }
            else return locationBar;
        },
        /**
         * Generates textual permalinks with links.
         * @param $type     The item type. This should be singular, but will handle plurals and singulars.
         * @param $id       The item's ID number.
         */
        generatePermalink : function ($type, $id) {
            var urlBase = window.location.protocol + "//" + window.location.hostname + window.location.pathname;
		    $type = "3d" + $type;
            if ($type.substring($type.length - 1) != 's') $type += 's';
            return '<a href="'  + urlBase + '?' + $type + '/' + $id +'" id="objectPermalink">'
            + urlBase + '?' + $type + '/' + $id + '</a>';
        }
    }
}();
