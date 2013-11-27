/**
 * HyperCities earth Objects
 *
 * @author    HyperCities Team 
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2009-01-30
 * @version   0.1
 *
 */

// create application namespace
HyperCities.earth = function() {

  // constants
  var _id           = "[HyperCities.earth] ",
    _showBuilding = false,
    _showTerrain  = true,
    _showBorder   = false,
    _showRoad     = false,
    _showImages   = false,
    _enableSync   = true,

    IDS = {
      earthPanel: "earthPanel",
      autoSync: "mapAutoSync",
      showBuilding: "buildings",
      showTerrain: "terrain",
      showBorder: "borders",
      showRoad: "roads",
      showImages: "images"
    },

  // Private variables
    _GEarth,         // GEarth Instance
    _GEarthEx,       // GEarth Extension
    _GEarthInitOpts, // GEarth Init Options
    _GEarthVersion,  // GEarth Plugin Version
    _maps = new Array(),
    _proxy = new Array(),
    _addMediaCtrl = null,
    _dynamicMapHolder = {};

  /** 
   *  This array store 3D objects
   *  The format of 3D Object = { id:
   *               obj:
   *               isHidden: }
   */
  var _collections = new Object(), 
    _blackoutOverlay;
    // event handler
    //_zoomendHandlers = [],
    //_dragendHandlers = [];

  /**
   * Initialize earth built-in layer behavior.
   * @return void
   */
  var _initEarthPanel = function() {

    var geLayers = _GEarth.getLayerRoot(),
      earthPanelId = "#" + IDS.earthPanel,
      autoSync = $("#" + IDS.autoSync),
      building = $("#" + IDS.showBuilding, earthPanelId),
      terrain  = $("#" + IDS.showTerrain, earthPanelId),
      border   = $("#" + IDS.showBorder, earthPanelId),
      road     = $("#" + IDS.showRoad, earthPanelId),
      images   = $("#" + IDS.showImages, earthPanelId);

    // Check default options
    terrain.attr('checked', true);
    images.attr('checked', true);

    // Disable 3D buildings by default
    geLayers.enableLayerById(_GEarth.LAYER_BUILDINGS, 0);

    autoSync.click(function() {
      _enableSync = autoSync.attr('checked');

      if (_enableSync) {
        HyperCities.debug(_id + "Enable auto refresh");
        _enableSync = true;
      }
      else {
        HyperCities.debug(_id + "Disable auto refresh");
        _enableSync = false;
      }
    });

    building.click(
      function() {
        _showBuilding = building.attr('checked');

        if (_showBuilding) {
          geLayers.enableLayerById(_GEarth.LAYER_BUILDINGS, 1);
        } else {
          geLayers.enableLayerById(_GEarth.LAYER_BUILDINGS, 0);
        }
      }
    );

    terrain.click(
      function() {
        _showTerrain = terrain.attr('checked');

        if (_showTerrain) {
          geLayers.enableLayerById(_GEarth.LAYER_TERRAIN, 1);
        } else {
          geLayers.enableLayerById(_GEarth.LAYER_TERRAIN, 0);
        }
      }
    );

    road.click(
      function() {
        _showRoad = road.attr('checked');

        if (_showRoad) {
          geLayers.enableLayerById(_GEarth.LAYER_ROADS, 1);
        } else {
          geLayers.enableLayerById(_GEarth.LAYER_ROADS, 0);
        }
      }
    );

    border.click(
      function() {
        _showBorder = border.attr('checked');

        if (_showBorder) {
          geLayers.enableLayerById(_GEarth.LAYER_BORDERS, 1);
        } else {
          geLayers.enableLayerById(_GEarth.LAYER_BORDERS, 0);
        }
      }
    );

    images.click(
      function() {
        _showImages = images.attr('checked');

        if (_showImages) {
          _GEarth.getTime().getControl().setVisibility(true);
          _GEarth.getTime().setHistoricalImageryEnabled(true);
          var extents = _GEarth.getTime().getControl().getExtents();
          var begin = new Date(extents.getBegin().get());
          var end = new Date(extents.getEnd().get());
          //HyperCities.timebar.setTime(begin, begin, end, null, false);
        } else {
          //_GEarth.getTime().getControl().setVisibility(true);
          _GEarth.getTime().setHistoricalImageryEnabled(false);
        }
      }
    );
  };

  /**
   * Setup earth system options
   * @return void
   */
  var _initSystemOptions = function() {
    // Get plugin version info
    _GEarthVersion = _GEarth.getPluginVersion();

    // Setup the GENavigationControl
    var geNavControl = _GEarth.getNavigationControl();
    geNavControl.setVisibility(_GEarth.VISIBILITY_SHOW);
    geNavControl.getScreenXY().setXUnits(_GEarth.UNITS_PIXELS);
    geNavControl.getScreenXY().setYUnits(_GEarth.UNITS_INSET_PIXELS);

    // Setup the GEOptions
    var geOptions = _GEarth.getOptions();
    geOptions.setStatusBarVisibility(true);
    geOptions.setScaleLegendVisibility(true);

    // Enable GETimeControl
    var geTime = _GEarth.getTime();
    geTime.getControl().setVisibility(_GEarth.VISIBILITY_SHOW);
    var timeSpan = _GEarth.createTimeSpan('GEarthTime');
    timeSpan.getBegin().set("1700-01-01");
    timeSpan.getEnd().set("2012-12-31");
    geTime.setTimePrimitive(timeSpan);

    geTime.setHistoricalImageryEnabled(false);

		_GEarth.getOptions().setFlyToSpeed(0.5);
  };

  /**
   * A null event handler. It is used to disable current event handler
   * @return void
   */
  var _nullHandler = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
  };

  /**
   * Blackout the earth, remove all event handler.
   * @return void
   */
  var _disableScreen = function() {
    _blackoutOverlay = _GEarth.createScreenOverlay('');
    _blackoutOverlay.getScreenXY().set(0, _GEarth.UNITS_PIXELS, 0, _GEarth.UNITS_PIXELS);
    _blackoutOverlay.getOverlayXY().set(0, _GEarth.UNITS_PIXELS, 0, _GEarth.UNITS_PIXELS);
    _blackoutOverlay.getSize().set(1, _GEarth.UNITS_FRACTION, 1, _GEarth.UNITS_FRACTION);
    _blackoutOverlay.getColor().set("cc000000");
    _GEarth.getFeatures().appendChild(_blackoutOverlay);

    google.earth.addEventListener(_GEarth.getWindow(), "click", _nullHandler, true);
    google.earth.addEventListener(_GEarth.getWindow(), "dblclick", _nullHandler, true);
    google.earth.addEventListener(_GEarth.getWindow(), "mouseover", _nullHandler, true);
    google.earth.addEventListener(_GEarth.getWindow(), "mousedown", _nullHandler, true);
    google.earth.addEventListener(_GEarth.getWindow(), "mouseup", _nullHandler, true);
    google.earth.addEventListener(_GEarth.getWindow(), "mouseout", _nullHandler, true);
    google.earth.addEventListener(_GEarth.getWindow(), "mousemove", _nullHandler, true);

    _GEarth.getNavigationControl().setVisibility(_GEarth.VISIBILITY_HIDE);
  };

  /**
   * show earth, restore all event handler
   * @return void
   */
  var _enableScreen = function() {
    _GEarth.getFeatures().removeChild(_blackoutOverlay);
    _blackoutOverlay = null;

    google.earth.removeEventListener(_GEarth.getWindow(), "click", _nullHandler, true);
    google.earth.removeEventListener(_GEarth.getWindow(), "dblclick", _nullHandler, true);
    google.earth.removeEventListener(_GEarth.getWindow(), "mouseover", _nullHandler, true);
    google.earth.removeEventListener(_GEarth.getWindow(), "mousedown", _nullHandler, true);
    google.earth.removeEventListener(_GEarth.getWindow(), "mouseup", _nullHandler, true);
    google.earth.removeEventListener(_GEarth.getWindow(), "mouseout", _nullHandler, true);
    google.earth.removeEventListener(_GEarth.getWindow(), "mousemove", _nullHandler, true);

    _GEarth.getNavigationControl().setVisibility(_GEarth.VISIBILITY_SHOW);
  };

  /**
   * get earth plugin and api version
   * @return void
   */
  var _getSystemVersion = function() {
    HyperCities.debug(_id + "Google earth plugin version: " + _GEarth.getPluginVersion());
    HyperCities.debug(_id + "Google earth version: " + _GEarth.getEarthVersion());
    HyperCities.debug(_id + "Google earth API version: " + _GEarth.getApiVersion());
  };

  var _parseWMSCapabilities = function ($data) {
      if (_GEarth == null) return;

      var overlay = _GEarth.createGroundOverlay("");
      overlay.setIcon(_GEarth.createIcon(""));
      overlay.getIcon().setHref($data.url + "&bbox=" +
        $data.minx + "," + $data.miny + "," + $data.maxx + "," + $data.maxy
      );
      overlay.setLatLonBox(_GEarth.createLatLonBox(""));

      var latLonBox = overlay.getLatLonBox();
      //latLonBox.setBox(-90, -180, 90, 180, 0);
      latLonBox.setBox($data.maxy, $data.miny, $data.maxx, $data.minx, 0);
      _dynamicMapHolder[$data.url] = _GEarth.getFeatures().appendChild(overlay);
  };

  /**
   * The callback function of google.earth.createInstance
   * Initialize the google earth instance for HyperCities
   * @param  GEPlugin $pluginInstance
   * @return void
   */
  var _initCallback = function($pluginInstance) {
    var timeStamp = null;
    var timer;

    if ($pluginInstance !== null) {
      HyperCities.util.debug(_id + "Google earth instance is created.");

      // We can now manipulate _GEarth using the full Google Earth API.
      _GEarth = $pluginInstance;
      _GEarth.getWindow().setVisibility(true);
      _GEarthEx = new GEarthExtensions(_GEarth);

      // Initialize
      _initSystemOptions();
      _initEarthPanel();
      HyperCities.city.init();
      
      
      // add an dummy screen overlay in order to show time slider
			var imagePath = "dummy.png";
      var icon = _GEarth.createIcon('');
      icon.setHref(imagePath);
      var overlay = _GEarth.createScreenOverlay("dummyTimeSliderBtn");
      overlay.setDrawOrder(99);
      overlay.setVisibility(true);
      overlay.setIcon(icon);
      overlay.getOverlayXY().set(100, _GEarth.UNITS_PIXELS, 2, _GEarth.UNITS_INSET_PIXELS);
      overlay.getScreenXY().set(0, _GEarth.UNITS_FRACTION, 1, _GEarth.UNITS_FRACTION);
      overlay.getSize().set(0, _GEarth.UNITS_PIXELS, 0, _GEarth.UNITS_PIXELS);
      var timeSpan = _GEarth.createTimeSpan('');
      timeSpan.getBegin().set('-2000');
      timeSpan.getEnd().set('3000');
      overlay.setTimePrimitive(timeSpan);

			_GEarth.getFeatures().appendChild(overlay);



      // Add event listener
      //HyperCities.earth.addEventListener(_GEarth.getGlobe(), 'dragend', _dragendHandler);
      google.earth.addEventListener(_GEarth.getView(), 'viewchangeend', function(){
        if(timer){
          clearTimeout(timer);
        }
          timer = setTimeout(function() {
            var zoom = HyperCities.earth.getZoom();

            if (zoom >= HyperCities.config.ZOOM_THRESHOLD) {
              HyperCities.earth.hideCities();
            }
            else {
              HyperCities.earth.showCities();
            }

            if (HyperCities.session.get("mode") !== HyperCities.config.MODE_NARRATIVE) {
              if (_enableSync) {
                HyperCities.syncSession(true);
              } 
            }

          }, 500);
        }
      );


      HyperCities.user.sync();


			// init permalink
			/**
			 * TODO: Remove this from Global Var
			 *
			 * initOpts is expected to be the following:
			 *  initOpts.permalink = {
			 *    type: collection/object
			 *    id: number
			 *    view?: intellilist/narrative (defaults to intellilist
			 *        for object and narrative for collection)
			 *    isBase: boolean. Whether the permalink is a "Base Collection",
			 *      meaning that the user will be only allowed to view this collection.
			 *  }
			 */
			if (typeof (initOpts.permalink) != 'undefined') {
				// HyperCities.util.debug("Permalink found.");
				var permalink = initOpts.permalink;
				// set session.baseCollection
				if (permalink.isBase) {
					HyperCities.session.set("baseCollection", permalink.id);
				}
				// switch to collectionList view
				if (typeof(permalink.view) != 'undefined' || permalink.view == 'intelliList') {
					$("#collectionTab").click();
				} else {
					HyperCities.linkController.loadObject(permalink.type + '/' + permalink.id);
					$("#mapTap").parent().removeClass("highlight");
				}
			//} else {
				//HyperCities.city.init();
			}

			// Permalink handling -- permalink is handled in a separate pseudo-thread
			// which is initialized by HyperCities.linkController.init();
			HyperCities.linkController.init();

    } else {
      HyperCities.util.debug(_id + "Fail to create google earth instance.");
    }
  };

  var _failureCallback = function($errorCode) {
    HyperCities.util.debug(_id + "Error : " + $errorCode);
  };

  var _addCities = function($placemark, $city) {

    google.earth.addEventListener($placemark, 'mouseover', function($event) {
      // Define a custom icon.
      var icon = _GEarth.createIcon('');
      //icon.setHref('../images/markerCity.png');
      icon.setHref('http://linuxdev.ats.ucla.edu/~jay/devHC/branches/hypercitiesEarth/images/markerCity_over.png');
      $placemark.getStyleSelector().getIconStyle().setIcon(icon); //apply the icon to the style
    });

    google.earth.addEventListener($placemark, 'click', function($event) {
      HyperCities.debug(_id + "Goto city " + $city.name);

      $event.preventDefault();

      var lookAt = HyperCities.earth.getLookAt();
      lookAt.setLatitude($city.center.lat);
      lookAt.setLongitude($city.center.lon);
      lookAt.setRange(HyperCities.earth.getAltFromZoom($city.zoom));

      _GEarth.getView().setAbstractView(lookAt);

      $placemark.setVisibility(false);
/*

      //HyperCities.mainMap.setCenter($center, $zoom);
      HyperCities.session.set("city", $city);
      HyperCities.util.eventTracker(
        HyperCities.config.EVENT_VIEW_CITY,
        $city.name
      );
*/
      //set timespan from 0 to current year to query all maps when click a city
      HyperCities.control.timeSlider.setTime(null, 0, new Date().getFullYear(), 
        null, false
      );
      
    });


  };

  return {

    init: function($context, $options) {
      _GEarthInitOpts = $options || {};

      if (!google.earth.isSupported()) {
        HyperCities.util.debug(_id + "Google Earth Browser Plug-in and API " +
          "are not supported on the current browser and operating system.");
      } else if (!google.earth.isInstalled()) {
        HyperCities.util.debug(_id + "Google Earth Browser Plug-in is not " +
          "installed on the user's machine.");
      }
      
      google.earth.createInstance($context, _initCallback, _failureCallback);
    },

    //each puclic function should return immediately if _GEarth is null
    /*********************
     *  Basic functions  *
     *********************/

    /** 
     *  Add event listener
     *  @param Object $target
     *  @param String $eventName
     *  @param Function $eventHandler
     *  @return Boolean: true is addEventListener success, false if it failed
     */
    /*
    addEventListener: function($target, $eventName, $eventHandler) {
      if (_GEarth == null) return false;

      if ($eventName === "dragend") {
        var oldMouseX;
        var oldMouseY;
        var newMouseX;
        var newMouseY;

        var func1 = function($event) {
          oldMouseX = $event.getScreenX();
          oldMouseY = $event.getScreenY();
        }

        var func2 = function($event) {
          newMouseX = $event.getScreenX();
          newMouseY = $event.getScreenY();
          if ((typeof(oldMouseX) !== 'undefined') && (typeof(oldMouseY) !== 'undefined') && (typeof(newMouseX) !== 'undefined') && (typeof(newMouseY) !== 'undefined') && oldMouseX != 0 && oldMouseY != 0 && newMouseX != 0 && newMouseY != 0 && ! ((oldMouseX == newMouseX) && (oldMouseY == newMouseY))) {
            HyperCities.debug(_id + "Dragend event occurs.");
            $eventHandler();
          }
        }

        //only add handlers when _dragendHandlers is empty
        if (_dragendHandlers.length == 0) {
          HyperCities.debug(_id + "Add dragend event listener.");
          google.earth.addEventListener($target, 'mousedown', func1);
          google.earth.addEventListener($target, 'mouseup', func2);
          _dragendHandlers.push(func1);
          _dragendHandlers.push(func2);
        }
      } else {
        google.earth.addEventListener($target, $eventName, $eventHandler);
      }

      return true;
    },
    */

    /** 
     *  Remove event listener
     *  @param Object $target
     *  @param Dtring $eventName
     *  @return Boolean: true is removeEventListener success, false if it failed
     */
    /*
    removeEventListener: function($target, $eventName) {
      if (_GEarth == null) return false;

      if ($eventName == "dragend") {
        HyperCities.debug(_id + "Remove dragend listener");
        var mouseup = _dragendHandlers.pop();
        var mousedown = _dragendHandlers.pop();
        google.earth.removeEventListener($target, "mouseup", mouseup);
        google.earth.removeEventListener($target, "mousedown", mousedown);
        mouseup = null;
        mousedown = null;
      }

      return false;
    },
    */

    /**
     *
     *
     */
    showAdd3DObjWindow: function() {
      HyperCities.mainMap.getAddMediaControl().showKmlWindow();
    },

    /** 
     *  Blackout screen to show map info div in earth mode
     *  @param DOMElement $container: the DOM element containing map info windrw
     *  @param DOMElement $mapInfoDiv: the div element containing map info
     *  @return void
     */
    blackoutScreen: function($container, $mapInfoDiv) {
      if (_GEarth == null) return;

      HyperCities.debug(_id + "blackoutScreen");

      _disableScreen();

      var top = $mapInfoDiv.position().top - 1;
      var left = $mapInfoDiv.position().left - 2;
      var width = $mapInfoDiv.width() + 12;
      var height = $mapInfoDiv.height() + 12;

      //create iframe to show map info window
      //only iframe can show DOM object on top of earth
      var iframe = $(document.createElement('iframe'));
      iframe.attr('id', 'blackoutIframe');
      iframe.css("frameborder", 0);
      iframe.css("position", "absolute");
      iframe.css("top", top);
      iframe.css("left", left);
      iframe.css("height", height);
      iframe.css("width", width);
      iframe.css("z-index", 999);

      //append iframe first
      $container.append(iframe);
    },

    /** 
     *  Remove blackout iframe from earth
     *  @return void
     */
    removeBlackout: function() {
      if (_GEarth == null) return;

      HyperCities.debug(_id + "removeBlackout");
      $("#blackoutIframe").remove();
      _enableScreen();
    },

    /****************************
     *  KML utility functions
     ****************************/

    /** 
     * Fetch KML
     * @param string $kmlUrl
     * @param function $callback
     * @return 
     */
    fetchKml: function($kmlUrl, $callback) {
      if (_GEarth == null)
        return;

      HyperCities.debug(_id + "Fetch KML URL: "+$kmlUrl);
      google.earth.fetchKml(_GEarth, $kmlUrl, $callback);
    },

    /** 
     * Fetch KML. This function is called for 3D object preview
     * @param string $kmlUrl
     * @param function $callback
     * @return 
     */
    fetchKmlLink: function($kmlUrl, $options) {
      if (_GEarth == null) return false;

      HyperCities.debug(_id + "Fetch KML Link: " + $kmlUrl);
      var options = $options || {};

      try {
        google.earth.fetchKml(_GEarth, $kmlUrl, function($object) {
          var self = this;
          if ($object !== null) {
            if (typeof(options.success) === 'function') {
              options.success.call(self, $object);
            }
          } else {
            if (typeof(options.error) === 'function') {
              options.error.call(self);
            }
          }
            
        });
      } catch ($e) {
        if (typeof(options.error) === 'function') {
          options.error.call(self);
        }
      }
    },

    /** 
     *
     *
     *
     */
    netLinkFinishedLoading: function($plugin, $kmlObject) {
      if (_GEarth == null) return;

      //HyperCities.debug(_id + "$kmlObject="+$kmlObject);
      if ($kmlObject) {
        //this line has problem
        _collections.push($kmlObject);
      }
    },

    /**
     * Recursively traverse the KML object and apply function to it
     * @param KmlObject $node: the kml object
     * @param function $func: the function that is going to be applied to kml object 
     * @return 
     */
    traverseKml: function($node, $func) {

      if (_GEarth == null) return;

      var type = $node.getType();
      $func($node);

      //only KmlDocument and KmlFolder have children
      if (type === 'KmlDocument' || type === 'KmlFolder') {
        if ($node.getFeatures().hasChildNodes()) {
          var subNodes = $node.getFeatures().getChildNodes();
          var length = subNodes.getLength();
          for (var i = 0; i < length; i++) {
            var eachSubNode = subNodes.item(i);
            HyperCities.earth.traverseKml(eachSubNode, $func);
          }
        }
        else HyperCities.debug(_id + "This node has no children.");
      }
    },

    /**
     * Get earth Kml object for 2D NetworkLink
     * 2D NetworkLink will show up in 3D but cannot be removed due to
     * earth plugin's bug. We acquire earth object for 2D NL manually for
     * future remove/hide/show.
     */
    get2DKmlOverlay: function() {
      var children = _GEarth.getFeatures().getChildNodes();
      var length = children.getLength();

      // Get 3D Kml object right after 2D NL is added. It will be the
      // last object.
      return children.item(length-1);
    },

    /** 
     * Append Kml Object to earth
     * @param KmlObject $kmlObject
     * @return void
     */
    appendKmlObject: function($kmlObject, $objectId) {
      if (_GEarth == null) return;

      HyperCities.debug(_id + "Append Kml object " + $objectId + " .");
      // check if the object has been appended
      if (!$kmlObject.getParentNode()) {
        _GEarth.getFeatures().appendChild($kmlObject);

        // disable this feature
        /*
        // set timeSlider to the time of kml object
        var time = $kmlObject.getTimePrimitive();
        if (time !== undefined && time !== null) {
          if (time.getType() === "KmlTimeStamp") {
            var current = new Date(time.getWhen().get());
            HyperCities.control.timeSlider.setTime(current, current, current, null, false);
          } else if (time.getType() === "KmlTimeSpan") {
            var begin = new Date(time.getBegin().get());
            var end = new Date(time.getEnd().get());
            HyperCities.control.timeSlider.setTime(null, begin, end, null, false);
          }
        }
        */
      }
    },

    /** 
     * Remove google kml object from earth 
     * @param google.KmlObject $kmlObject: google kml object
     * @return
     */
    removeKmlObject: function($kmlObject) {
      if (_GEarth == null) return;
      
      HyperCities.debug(_id + "Remove Kml object.");
      if ($kmlObject)
        _GEarthEx.dom.removeObject($kmlObject);
    },

    /**
     * Clone Kml object by $objectId
     * @param {int} $objectId the object id
     * @return {Object} cloned kml object
     */
    cloneKmlObject: function($objectId) {
      if (_GEarth == null) return;
      
      var obj = HyperCities.earth.get3DObject($objectId).obj;
      return _GEarth.parseKml(obj.getKml());
    },

    /** 
     * Create 3D object on earth and save it in _collections
     * @param {Object} $item: an HCObject item passed from HCObject.js
     * @return
     */
    add3DObject: function($item) {

      if (_GEarth == null) return false;

      var objectId    = parseInt($item.id),
        objectType    = parseInt($item.objectType),
        markerType    = parseInt($item.markerType),
        markerState   = parseInt($item.markerState),
        //kml           = $("kml", $item.kml).get(0),
        kml           = $item.kml,
        url           = $item.url,
        bounds        = $item.bounds,
        startTime     = new Date($item.startTime),
        endTime       = new Date($item.endTime),
        earthObj      = HyperCities.earth.get3DObject(objectId);

      // check if this object has been added
      if (earthObj !== null && earthObj !== undefined) {
        // remove 3d object and release memory
        HyperCities.earth.remove3DObject(objectId);
      } 

      switch (objectType) {
        case HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT:

					var kmlString = null;

					if (kml) {
						if (typeof kml !== "string")
							kmlString = (new XMLSerializer()).serializeToString(kml).toString();
						else
							kmlString = kml;
					}
 
					var obj = _GEarth.parseKml(kmlString);

          if (obj === undefined) return false;
          
          // set marker state first
          obj.setVisibility(!markerState);
 
          // set timespan
          var timeSpan = _GEarth.createTimeSpan('');
          if (startTime.toString() != "Invalid Date")
            timeSpan.getBegin().set(startTime.toString("yyyy-MM-dd"));
          if (endTime.toString() != "Invalid Date")
            timeSpan.getEnd().set(endTime.toString("yyyy-MM-dd"));
          obj.setTimePrimitive(timeSpan);

          _collections[objectId] = {id: objectId, obj: obj};
          break;

        case HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK:
        case HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK:
          _collections[objectId] = {id: objectId, url: url, type: objectType, startTime:
            startTime, endTime: endTime};
          break;

        default:
          alert("No object type defined.");
      }

      return true;
    },

    /** 
     * Get Kml Object by $objectId
     * @param int $objectId: the object id
     * @return Object 3DObject
     */
    get3DObject: function($objectId) {
      if (_GEarth == null) return;

      return _collections[$objectId];
    },


    /** 
     * Append 3D object on earth. The 3D object should be created before calling this
     * function.
     * @param {Object} $item: an HCObject item passed from HCObject
     * @return
     */
    append3DObject: function($objectId) {

      if (_GEarth == null) return false;

      if (_collections[$objectId]) {

        var type  = _collections[$objectId].type,
            obj   = _collections[$objectId].obj,
            re    = new RegExp("^https?:\/\/"),
            url   = _collections[$objectId].url;

        // if 3D object exist, append it on earth
        if (obj) {
          HyperCities.earth.appendKmlObject(obj, $objectId);
          return true;
        }
      

        // For network link and earth network link, if 3D object do not exist, create and
        // append it
        if (type === HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK ||
            type === HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK) {
       
          if (re.test(url)) {

            HyperCities.earth.fetchKml(url, function($kmlObject) {
              if ($kmlObject) {

                var timeSpan = _GEarth.createTimeSpan('');
                var startTime = _collections[$objectId].startTime;
                var endTime = _collections[$objectId].endTime;

                if (startTime.toString() != "Invalid Date")
                  timeSpan.getBegin().set(startTime.toString("yyyy-MM-dd"));
                if (endTime.toString() != "Invalid Date")
                  timeSpan.getEnd().set(endTime.toString("yyyy-MM-dd"));
                $kmlObject.setTimePrimitive(timeSpan);

                _collections[$objectId].obj = $kmlObject;
                HyperCities.earth.appendKmlObject($kmlObject, $objectId);
              } else alert("Cannot fetch KML from " + url);
            });

          }
          else {

            var kmlObj = _GEarth.parseKml(url);

            if (kmlObj) {
              _collections[$objectId].obj = kmlObj;
              HyperCities.earth.appendKmlObject(kmlObj, $objectId);
            } else {
              alert("parseKml returns no object!");
            }
          }
        }
      }
    },

    /** 
     *  Remove 3D object from earth and _collections
     *  @param Object $3DObject: customized 3D object
     *  @return void
     */
    remove3DObject: function($objectId) {
      if (_GEarth == null) return;

      if (_collections[$objectId]) {
        var obj = _collections[$objectId].obj;
        if (obj) {
          if (obj.getParentNode())
            _GEarthEx.dom.removeObject(_collections[$objectId].obj);
          obj.release();
        }
        delete _collections[$objectId]; 
      }
    },

    /** 
     * Show 3D object by adding it to earth.
     * Object is acquired from  _collections
     * @param int $objectId: the object id
     * @return void
     */
    show3DObject: function($objectId) {

      if (_GEarth == null) return;
      
      // due to performance issue, check visibility before setting it
      if (_collections[$objectId] &&
        _collections[$objectId].obj &&
        !_collections[$objectId].obj.getVisibility()) {
        _collections[$objectId].obj.setVisibility(true);

      _GEarth.getTime().setTimePrimitive(
        _collections[$objectId].obj.getTimePrimitive()
      );
    /*
        // set timeslider to the time of 
        var time = _collections[$objectId].obj.getTimePrimitive();
        if (time !== undefined && time !== null) {
          if (time.getType() === "KmlTimeStamp") {
            var current = new Date(time.getWhen().get());
            HyperCities.control.timeSlider.setTime(current, current, current, null, false);
          } else if (time.getType() === "KmlTimeSpan") {
            var begin = new Date(time.getBegin().get());
            var end = new Date(time.getEnd().get());
            HyperCities.control.timeSlider.setTime(begin, end, begin, null, false);
          }
        }
    */
      }
    },

    /** 
     * Hide 3D object by remove it from earth.
     * Object will still be in _collections
     * @param int $objectId: the object id
     * @return void
     */
    hide3DObject: function($objectId) {

      if (_GEarth == null) return;

      // due to performance issue, check visibility before setting it
      if (_collections[$objectId] &&
        _collections[$objectId].obj &&
        _collections[$objectId].obj.getVisibility()) {
        _collections[$objectId].obj.setVisibility(false);
      }

      // Reset timbar to current
      _GEarth.getTime().setHistoricalImageryEnabled(false);
    },

    emptyCollections: function() {
      if (_GEarth == null) return;

      HyperCities.debug(_id + "Remove all 3D objects.");

      for (var i in _collections) {
        HyperCities.earth.remove3DObject(_collections[i]);
      }

      _collections = new Object();
    },


    /****************************
     *  Map utility functions
     ****************************/

    /** 
     * Add map on earth
     * @param {Object} $map: a map object passed from HyperCities.mainMap
     * @return void
     */
    addMap: function($map, $opacity) {
      if (_GEarth == null) return;

      var mapId = $map.id,
        mapUrl = $map.tileUrl,
        regExp = new RegExp("http://"+HyperCities.config.TILE_SERVER_PATH, "g"),
        link = null,
        networkLink = null;

      // append doc.kml to map url
      if (mapUrl.charAt(mapUrl.length - 1) !== "/") {
        mapUrl = mapUrl + "/doc.kml";
      } else {
        mapUrl = mapUrl + "doc.kml";
      }

      //check the tile server to see if it has doc.kml
      //only http:\/\/tiles.ats.ucla.edu has doc.kml
      if (!mapUrl.match(regExp)) {
        alert("This map may not show in Earth mode because it is in the old format.");
        return;
      }

      HyperCities.util.debug(_id + " Add map " + mapId);

      //add network link for super overlay
      link = _GEarth.createLink("");
      link.setHref(mapUrl);
      networkLink = _GEarth.createNetworkLink("");
      networkLink.setName("Map" + mapId);
      //networkLink.setFlyToView(true);
      networkLink.setLink(link);

      // fetch network link 
      if (typeof(_maps[mapId]) === 'undefined' || _maps[mapId] == null) {

        HyperCities.earth.fetchKml(mapUrl, function($kmlObj) {
          if ($kmlObj) {
            // add timespan to map
            var map = HyperCities.mapList.getMap(mapId);
            var timespan = _GEarth.createTimeSpan("");
            timespan.getBegin().set(map.dateFrom.toString("yyyy-MM-dd"));
            timespan.getEnd().set(map.dateTo.toString("yyyy-MM-dd"));
            $kmlObj.setTimePrimitive(timespan);

            $kmlObj.setOpacity(Math.pow($opacity, 2));
            _GEarth.getFeatures().appendChild($kmlObj);
            _maps[mapId] = $kmlObj;
            HyperCities.mapList.setMapOverlay(mapId, $kmlObj, $opacity);
          } else {
            alert(_id + "Cannot fetch " + mapUrl);
          }
        });

      } else {
        // map already exist, show it on earth and set opacity
        _maps[mapId].setVisibility(true);
        _maps[mapId].setOpacity(Math.pow($opacity, 2));
        HyperCities.mapList.setMapOverlay(mapId, _maps[mapId], $opacity);
      }
    },

    addMapByUrl: function ($mapUrl) {
      if (_GEarth == null) return;

      google.earth.fetchKml(_GEarth, $mapUrl, function ($kmlObject) {
        if ($kmlObject) {
          _dynamicMapHolder[$mapUrl] = _GEarth.getFeatures().appendChild($kmlObject);
        }
      });
    },
    
    addWMSMap: function ($mapUrl) {
      $.get("./getWMSCapabilities.php", {url: encodeURIComponent($mapUrl)},
        _parseWMSCapabilities, "json"
        );
      
    },

    /** 
     *  Remove map from earth and _maps
     *  @param Number $mapId: the id of the map
     *  @return Boolean
     */
    removeMap: function($mapId) {
      if (_GEarth == null) return;

      HyperCities.debug(_id + " Remove map " + $mapId);
      if (typeof(_maps[$mapId]) !== "undefined" && _maps[$mapId] !== null) {
        //_GEarth.getFeatures().removeChild(_maps[$mapId]);
        //_maps[$mapId] = null;
        _maps[$mapId].setVisibility(false);
        return true;
      }
    },

    /**
     * Remove map added dynamically
     * @param String $mapUrl url of map
     * @return void
     */
    removeMapByUrl: function ($mapUrl) {
      _GEarth.getFeatures().removeChild(_dynamicMapHolder[$mapUrl]);
    },

    /** 
     *  Add map polygon when cursor hover over intellist
     *  @param {Number} $mapId: the map id
     *  @param {Object} $proxy: the proxy object passed from HyperCities.mainMap
     */
    addMapsProxy: function($mapId, $neLat, $neLon, $swLat, $swLon) {
      if (_GEarth == null) return;

      if (typeof(_proxy[$mapId]) === 'undefined' || _proxy[$mapId] == null) {
        //fisrt time add this proxy, create a new polygon
        var polygon = this.createPolygon($neLat, $neLon, $swLat, $swLon);
        //add polygon into both _maps and earth
        this.addPolygon($mapId, polygon);
      } else {
        //HyperCities.debug(_id + "Polygon exists.");
        //the polygon already exist, set visibility to true
        polygon = _proxy[$mapId];
        polygon.setVisibility(true);
      }
    },

    /** 
     *  Create map polygon
     *  @param Object $proxy: the map proxy passed from HyperCities.mainMap
     *  @return KmlPlacemark polygonPlacemark: placemark of the polygon
     */
    createPolygon: function($neLat, $neLon, $swLat, $swLon) {
      if (_GEarth == null) return;
      //HyperCities.debug(_id + "Create polygon.");

      var nBound = $neLat;
      var sBound = $swLat;
      var eBound = $neLon;
      var wBound = $swLon;
      var polyColor = '330000ff';
      var isFill = true;
      var isOutline = true;
      var lineColor = 'ff003ff3';
      var lineWidth = 1;

      var polygonPlacemark = _GEarth.createPlacemark('');
      var polygon = _GEarth.createPolygon('');
      polygonPlacemark.setGeometry(polygon);
      var outer = _GEarth.createLinearRing('');
      polygon.setOuterBoundary(outer);

      // If polygonPlacemark doesn't already have a Style associated
      // with it, we create it now.
      if (!polygonPlacemark.getStyleSelector()) {
        polygonPlacemark.setStyleSelector(_GEarth.createStyle(''));
      }
      var polyStyle = polygonPlacemark.getStyleSelector().getPolyStyle();
      polyStyle.getColor().set(polyColor);
      polyStyle.setFill(isFill);
      polyStyle.setOutline(isOutline);
      //polygon.setExtrude(1);
      var lineStyle = polygonPlacemark.getStyleSelector().getLineStyle();
      lineStyle.getColor().set(lineColor);
      lineStyle.setWidth(lineWidth);

      // Square outer boundary.
      var coords = outer.getCoordinates();
      coords.pushLatLngAlt(nBound, wBound, 0);
      coords.pushLatLngAlt(nBound, eBound, 0);
      coords.pushLatLngAlt(sBound, eBound, 0);
      coords.pushLatLngAlt(sBound, wBound, 0);

      return polygonPlacemark;
    },

    /** 
     *  Add map polygon on earth
     *  @param {Number} $mapId:
     *  @param {KmlPlacemark} $polygon: 
     *  @return void
     */
    addPolygon: function($mapId, $polygon) {
      if (_GEarth == null) return;

      //save the polygon in _maps and earth
      _proxy[$mapId] = $polygon;
      _GEarth.getFeatures().appendChild($polygon);
    },

    /** 
     *  Remove map polygon from earth by hiding it
     *  @param Number $mapId:
     *  @param KmlPlacemark $polygon: 
     *  @return void
     */
    removePolygon: function($mapId) {
      if (_GEarth == null) return;

      //remove polygon by set visibility to false
      _proxy[$mapId].setVisibility(false);
    },

    /****************************
     *  Earth utility functions
     ****************************/
    /**
     * Get current view (KmlLookAt)
     * @return KmlLookAt
     */
    getLookAt: function() {
      if (_GEarth == null) return null;

      return _GEarth.getView().copyAsLookAt(_GEarth.ALTITUDE_ABSOLUTE);
    },

    getCenter: function() {
                 
      if (_GEarth == null) return null;

      var lookAt = HyperCities.earth.getLookAt();
      var center = {lat: lookAt.getLatitude(), lon: lookAt.getLongitude()};

      return center;
    },

    /**
     * Get current view 
     * @return String: camera 
     */
    getCamera: function() {
      if (_GEarth == null) return null;

      return _GEarth.getView().copyAsCamera(_GEarth.ALTITUDE_ABSOLUTE);
    },

    /**
     * Set view to earth
     * @param Object $type: GLatLng or KmlLookAt or KmlCamera
     * @param Object $view: the view to be set
     * @return void
     */
    setView: function($type, $view) {
      if (_GEarth == null) return;

      HyperCities.debug(_id + "Set earth's view");

      if ($type == "google.maps.LatLng") {
        var lookAt = _GEarth.getView().copyAsLookAt(_GEarth.ALTITUDE_ABSOLUTE);
        lookAt.setLatitude($view.lat());
        lookAt.setLongitude($view.lng());
        _GEarth.getView().setAbstractView(lookAt);
      }
      else if ($type == "KmlLookAt") {
        _GEarth.getView().setAbstractView($view);
      }
    },

    /**
     * Get altitude from zoom level
     * @param {int} $zoom
     * @return {int} altitude
     */
    getAltFromZoom: function($zoom) {
      return Math.round(Math.exp((26-$zoom)*Math.log(2)));
    },

    /**
     * Get zoom level from altitude
     * @param {int} $alt
     * @return {int} zoom
     */
    getZoomFromAlt: function($alt) {
      return Math.round(26-(Math.log($alt)/Math.log(2)));
    },

    getZoom: function() {

      if (_GEarth == null) return null;

      var alt = null,
        lookAt = null,
        zoom = 0;

      lookAt = _GEarth.getView().copyAsLookAt(_GEarth.ALTITUDE_ABSOLUTE);
      alt = lookAt.getRange();
      zoom = Math.round(26-(Math.log(alt)/Math.log(2)));

      return zoom;
    },

    /**
     * Get bounds from current view
     * @return Object
     */
    getBounds: function() {

      if (_GEarth == null) return null;

      var kmlLatLonBox = _GEarth.getView().getViewportGlobeBounds() || null;

      var latlonbox = {north: kmlLatLonBox.getNorth(),
                       south: kmlLatLonBox.getSouth(),
                       east: kmlLatLonBox.getEast(),
                       west: kmlLatLonBox.getWest()};

      return latlonbox;
    },

    /**
     * Clear features on earth except earth controls
     */
    clearFeature: function() {
      var container = _GEarth.getFeatures(),
        objList   = container.getChildNodes(),
        idList    = [];

      if ( _addMediaCtrl ) {
        idList = _addMediaCtrl.getOverlayIdList();
      }

      for (var i=0; i<objList.getLength(); i++) {
        var kmlObject = objList.item(i);
        if ( $.inArray(kmlObject.getId(), idList) < 0) {
          container.removeChild(kmlObject);
        }
      }
    },

    /**
     * Get object bounds
     * @param {KmlObject} $kmlObject
     * @return {GLatLngBounds} bounds
     */
    getObjectBounds: function($kmlObject) {
      try {
        var bounds = _GEarthEx.dom.computeBounds($kmlObject);

        if (!bounds.isEmpty()) {
          myBounds = {south: bounds.south(), west: bounds.west(), north: bounds.north(),
             east: bounds.east()};

          return myBounds;
        } else {
          return null;
        }
      } catch ($e){
        HyperCities.util.debug(_id + "Cannot get the boundary of the object. " +
        $e);
        return null;
      }
    },

    /**
     * Given a bound, check if the bound is partially or entirely in view
     * @param Object $bound {north, south, east, west}
     * @return boolean
     */
    isInView: function($bound) {

      if (_GEarth == null) return null;

      var viewBounds = HyperCities.earth.getBounds();

      if (HyperCities.earth.intersect(viewBounds, $bound)) 
        return true;
      else 
        return false;
    },

    /**
     * Check if the point is in the bound.
     * @param Object $bound {north, south, east, west}
     * @param Object $point {lat, lon}
     * @return Boolean
     */
    containsLatLng: function($bound, $point) {

      if (_GEarth == null) return null;

      var lat,
          lon,
          north,
          south,
          east,
          west;

      lat = $point.lat;
      lon = $point.lon;
      north = $bound.north;
      south = $bound.south;
      east = $bound.east;
      west = $bound.west;

      // check latitude
      if (lat <= north && lat >= south) {
        
        // check longitude 
        if (east >= west) {

          if (lon <= east && lon >= west)
            return true;
          else 
            return false;

        } else {
        
          if (lon >= east && lon <= west)
            return true;
          else 
            return false;
        }

      } 

      return false;
    },

    /**
     * Check if two bounds intersect each other
     * @param Object $bound1 {north, south, east, west}
     * @param Object $bound2 {north, south, east, west}
     */
    intersect: function($bound1, $bound2) {
      
      var ne, nw, se, sw;

      ne = {lat: $bound2.north, lon: $bound2.east};
      nw = {lat: $bound2.north, lon: $bound2.west};
      se = {lat: $bound2.south, lon: $bound2.east};
      sw = {lat: $bound2.south, lon: $bound2.west};

      if (HyperCities.earth.containsLatLng($bound1, ne) ||
          HyperCities.earth.containsLatLng($bound1, nw) ||
          HyperCities.earth.containsLatLng($bound1, se) ||
          HyperCities.earth.containsLatLng($bound1, sw)) {
        return true;
      }

	  if (!($bound1.west > $bound2.east
		  || $bound1.east < $bound2.west
		  || $bound1.north < $bound2.south
		  || $bound1.south > $bound2.north)) {
	    return true;
	  }

      return false;
    },

    flyToPoint: function ($point) {
        if (_GEarth == null) return null;

        var lookAt = _GEarth.getView().copyAsLookAt(_GEarth.ALTITUDE_RELATIVE_TO_GROUND);
        lookAt.setLatitude($point.lat());
        lookAt.setLongitude($point.lng());
        lookAt.setRange(100.0);
        _GEarth.getView().setAbstractView(lookAt);
    },

    flyToBounds: function ($bounds, $zoom) {
        if (_GEarth == null) return null;

        var lookAt = _GEarthEx.view.createBoundsView($bounds, { 
                aspectRatio: $("#map3d").width() / $("#map3d").height()
            }
        );
        _GEarth.getView().setAbstractView(lookAt);
    },

    /**
     * Fly to an object. if a view is given, fly to that view. Otherwise
     * fly to the view defined in that object. Otherwise fly to the bounds of that
     * object. This function is called after an object has been added to HCObject.
     * @param {int} $objectId the object id
     * @param {string} $view the view string
     */
    flyTo: function($objectId, $view) {
      if (_GEarth == null) return null;

      if ($view !== undefined && $view !== null) {
        var view = HyperCities.earth.getEarth().parseKml($view); 
        view.setAltitudeMode(_GEarth.ALTITUDE_ABSOLUTE);
        HyperCities.earth.getEarth().getView().setAbstractView(view);
        return;
      }

      var _3DObject = HyperCities.earth.get3DObject($objectId);

      if (_3DObject !== null && _3DObject !== undefined) {
					try {
						_GEarthEx.util.flyToObject(_3DObject.obj, {
							boundsFallback: false,
							aspectRatio: 1.0
						});
					} catch (err) {
						HyperCities.util.debug(err);
					}
      }
    },

    /**
     * Fly to an object; if the object is a feature and has an explicitly defined
     * abstract view, that view is used. Otherwise, attempts to calculate a bounds
     * view of the object and flies to that (assuming options.boundsFallback is
     * true). This function is called when previewing an KML in objectEditPanel.
     * @param {KmlObject} $kmlObject: the object to fly to
     * @param {Object} $options: flyto options
     */
    flyToObject: function($kmlObject, $options) {
      if (_GEarth == null) return null;

      var bounds = HyperCities.earth.getObjectBounds($kmlObject);
      if (bounds == null) {
        alert("We cannot get the KML boundary. If this is a network link, "
          + "try to zoom to it manually.");
        return false;
      }
      
      _GEarthEx.util.flyToObject($kmlObject, {
        boundsFallback: true, aspectRatio: 1.0});
    },

    /**
     * Set Earth Plugin timespan
     * @param {String} $startTime yyyy-mm-ddThh:mm:sszzzzzz or yyyy-mm-dd
     * @param {String} $endTime yyyy-mm-ddThh:mm:sszzzzzz or yyyy-mm-dd
     */
    setTimespan: function($startTime, $endTime) {

      if (_GEarth == null) return null;

      HyperCities.util.debug(_id + "Set timespan " + $startTime + " - " +
          $endTime);

      var timeSpan = _GEarth.getTime().getTimePrimitive();

      // create a timespan if it does not exist
      if (!timeSpan || timeSpan.getType() !== "KmlTimeSpan") {
        timeSpan = _GEarth.createTimeSpan('');
      }

      if ($startTime && $startTime !== "NaN-aN-aN") timeSpan.getBegin().set($startTime);
      if ($endTime && $endTime !== "NaN-aN-aN") timeSpan.getEnd().set($endTime);

      _GEarth.getTime().setTimePrimitive(timeSpan);
    },


    /**
     * Get earth timespan. This function is supposed to be called only by timeSlider.
     * @return Object {min: min date, max: max date}
     */
    getTimespan: function() {
      
      if (_GEarth == null) return null;

      var time = _GEarth.getTime().getTimePrimitive(),
          min,
          max;

      if (!time) {
        HyperCities.util.debug(_id + "Time does not exist.");
        return null;
      } 
      else if (time.getType() == "KmlTimeSpan") {
        min = new Date(time.getBegin().get());
        max = new Date(time.getEnd().get());
      }
      else if (time.getType() == "KmlTimeStamp") {
        min = new Date();
        min.setFullYear(0);
        max = new Date(time.getWhen().get());
      }

      return {min: min, max: max};
    },

    /**
     * Get Earth TimeStamp. This function is supposed to be called only by timeSlider.
     * @return String yyyy-mm-ddThh:mm:sszzzzzz
     */
    getTime: function() {
      
      if (_GEarth == null) return false;

      // time is either a KmlTimeStamp or KmlTimeSpan or null
      var time = _GEarth.getTime().getTimePrimitive();

      if (!time) {
        HyperCities.util.debug(_id + "Time does not exist.");
        return null;
      } 
      else if (time.getType() == "KmlTimeSpan") {
        return time.getBegin().get();
      }
      else if (time.getType() == "KmlTimeStamp") {
        return time.getWhen().get();
      }

    },

    /** 
     * Return Current center in JSON format
     */
    getView: function () {

      var view    = null,
        jsonStr = [];

      view = HyperCities.earth.getCamera();
      jsonStr = [
        '{"lng": "', view.getLongitude(), 
        '", "lat": "', view.getLatitude(),
        '", "alt": "', view.getAltitude(),
        '", "heading": "', view.getHeading(),
        '", "roll": "', view.getRoll(),
        '", "tilt": "', view.getTilt(),
        '"}'
      ];

      return jsonStr.join('');
    },



    /****************************
     *  Getter and Setter functions 
     ****************************/
    /**
     * Get google earth plugin object
     * @return GEPlugin
     */
    getEarth: function() {
      return _GEarth;
    },

    /**
     * Set earth object
     * @param GEPlugin $earth:
     * @return void
     */
    setEarth: function($earth) {
      _GEarth = $earth;
    },

    /**
     * Create and append earth addMediaControl after users login
     * @param
     * @return void
     */
    setEarthAddMediaCtrl: function() {
      if (_GEarth == null) return false;

      if (_addMediaCtrl == null)
        _addMediaCtrl = new HCEarthControl(_GEarth, _GEarthEx);

      _addMediaCtrl.setVisibility(true);
    },

    /**
     * Get earth addMediaControl
     * @return Object
     */
    getEarthAddMediaCtrl:function() {
      if (_GEarth == null) return false;
      
      return _addMediaCtrl;
    },

    /**
     * Remove earth addMediaControl after users logout
     * @param
     * @return
     */
    removeEarthAddMediaCtrl: function() {
      if (_GEarth == null) return false;

      _addMediaCtrl.setVisibility(false);
    },

    getEarthEx: function() {
      if (_GEarth == null) return false;

      return _GEarthEx;     
    },

    getCollections: function() {
      if (_GEarth == null) return false;

      return _collections;
    },

    isBuildingOn: function() {
      if (_GEarth == null) return false;

      return _showBuilding;    
    },

    showBuilding: function($buildingOn) {
      if (_GEarth == null) return false;

      $("#" + IDS.showBuilding, "#" + IDS.earthPanel)
        .attr('checked', $buildingOn);

      _showBuilding = $buildingOn;

      if (_showBuilding) {
        _GEarth.getLayerRoot().enableLayerById(_GEarth.LAYER_BUILDINGS, 1);
      }
      else {
        _GEarth.getLayerRoot().enableLayerById(_GEarth.LAYER_BUILDINGS, 0);
      }
    },

    /**
     * Add city marker on earth
     * @param Object $cities
     * @return void
     */
    addCities: function($cities) {
     
      var isHidden = false,
          i,
          swLatLng, 
          neLatLng,
          bounds, 
          zoom, 
          center, 
          icon, 
          marker;

      for (i in $cities) {
        isHidden = ($.inArray($cities[i].id, HyperCities.config.HIDDEN_CITIES) >= 0);

        if (!isHidden) { // Add Marker and Listener
          // Create the placemark.
          var placemark = _GEarth.createPlacemark('');
          placemark.setName($cities[i].name);

          // Define a custom icon.
          var icon = _GEarth.createIcon('');
          //icon.setHref('../images/markerCity.png');
          icon.setHref('http://linuxdev.ats.ucla.edu/~jay/devHC/branches/hypercitiesEarth/images/markerCity.png');

          var style = _GEarth.createStyle(''); //create a new style
          style.getIconStyle().setIcon(icon); //apply the icon to the style
          placemark.setStyleSelector(style); //apply the style to the placemark

          // Set the placemark's location.  
          var point = _GEarth.createPoint('');
          point.setLatitude($cities[i].center.lat);
          point.setLongitude($cities[i].center.lon);
          placemark.setGeometry(point);

          var timeSpan = _GEarth.createTimeSpan('city_' + $cities[i].id);
          timeSpan.getBegin().set($cities[i].timespan.min.toString("yyyy-mm-dd"));
          timeSpan.getEnd().set($cities[i].timespan.max.toString("yyyy-mm-dd"));
          placemark.setTimePrimitive(timeSpan);

          _addCities(placemark, $cities[i]);

          $cities[i].marker = placemark;

          // Add the placemark to Earth.
          _GEarth.getFeatures().appendChild(placemark);
        } // end if
      } // end for
           
    },

    goToCity: function($city) {
      HyperCities.debug(_id + "Goto city " + $city.name);

      var lookAt = HyperCities.earth.getLookAt();
      lookAt.setLatitude($city.center.lat);
      lookAt.setLongitude($city.center.lon);
      lookAt.setRange(HyperCities.earth.getAltFromZoom($city.zoom));

      _GEarth.getView().setAbstractView(lookAt);

      if ($city.markers.normal) {
        $city.markers.normal.setVisibility(false);
      }

      /*
      // wait for the view change to get correct zoom level
      setTimeout( function() {
        HyperCities.syncSession(true);
      }, 1500);
      */

      //set timespan from 0 to current year to query all maps when click a city
      HyperCities.control.timeSlider.setTime(null, 0, new Date().getFullYear(), 
        null, false
      );
    },

    showCities: function() {
      var cities = HyperCities.city.getCities();

      for (var i in cities) {
        if (cities[i].marker) {
          cities[i].marker.setVisibility(true);
        }
      }

    },

    hideCities: function($marker) {
      var cities = HyperCities.city.getCities();

      for (var i in cities) {
        if (cities[i].marker) {
          cities[i].marker.setVisibility(false);
        }
      }

    },
    
    /**
     * set enable sync option
     * @param Boolean $flag: the value to be set
     * @return void
     */
    enableSync: function($flag) {

      if ($flag)
        HyperCities.debug(_id + "Enable auto map refresh.");
      else
        HyperCities.debug(_id + "Disable auto map refresh.");

      _enableSync = $flag;
    },

    /**
     * Restore _enableSync based on the value of auto sync
     * @return void
     */
    restoreSync: function() {
      if ($("#mapAutoSync").attr('checked')) HyperCities.earth.enableSync(true);
      else HyperCities.earth.enableSync(false);
    }

  };
} (); // end of Object

