/**
 * HyperCities mainMap Objects
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2008-12-22
 * @version   0.7
 *
 */

// create application namespace
HyperCities.mainMap = function() {
  // do NOT access javascript generated DOM from here; elements don't exist yet

  // constant
  var DEFAULT_TYPE = "GraphicsMagick",
    QUAD_TYPE = "MapCruncher",
    WEB_MAP_SERVICE = "Web Map Service",
    ARC_GIS_MAP = "ArcGIS",
    EPSG_4326   = new Proj4js.Proj("EPSG:4326"),
    EPSG_900913   = new Proj4js.Proj("EPSG:900913");

  // private 
  var _id = "[HyperCities.mainMap] ",
    _projections = {},
    _defaultLat = 0,
    _defaultLng = 0,
    _defaultZoom = {
      world: 2,
      city: 14
    },
    _maxZoom = 21,
    _enableSync = true, //enable map auto refresh
    _dataQueryOptions = {},
    _dynamicMapHolder = {},
    _queryTask = null,
    _query = null,
    _dataInfoWindowOptions,
    _dataOverlayOptions = {},
    _dataOverlays,
    _dataClickHandler = null;

  var _center,
    _zoom,
    _minTime,
    _maxTime;

  // Private functions
  /**
   * tile to quad key
   * @param $x
   * @param $y
   * @param $zoom
   * @return String quad
   */
  var _tileToQuadKey = function($x, $y, $zoom) {
    var mask,
      cell,
      quad = "";

    for (var i = $zoom; i > 0; i--) {
      mask = 1 << (i - 1);
      cell = 0;
      if (($x & mask) != 0) cell++;
      if (($y & mask) != 0) cell += 2;
      quad += cell;
    }

    return quad;
  };

  /**
   * Get tile url
   * @param Object $map: the map object
   * @return String newUrl: the url string
   */
  var _getTileUrl = function($map) {
    var tileType = $map.tileType;
    var tileUrl = $map.tileUrl;
    var tileHost = tileUrl.split(/\/+/g)[1],
      projection = $map.projection;

    if (tileType === DEFAULT_TYPE) {
      return function($GPoint, $zoom) {
        var newUrl = tileUrl;
        if (tileHost === "tiles.ats.ucla.edu") {
          newUrl = newUrl.replace(/tiles\.ats/, "tiles" 
              + ($GPoint.y + $GPoint.x) % 4 + ".ats");
        }

        return newUrl + "/" + $zoom + "/" + $GPoint.x + "/" 
              + $GPoint.y + ".png";
      };
    }else if (tileType === WEB_MAP_SERVICE) {
      HyperCities.util.debug("Found WMS map.");
      return function ($point, $zoom, c) {
        var upperLeftPoint = new GPoint($point.x*256,($point.y+1)*256);
        var lowerRightPoint = new GPoint(($point.x+1)*256,$point.y*256);
        var mapType = HyperCities.mainMap.getMapInstance().getCurrentMapType();
        var upperLeft = mapType.getProjection().fromPixelToLatLng(upperLeftPoint,$zoom,c);
        var lowerRight = mapType.getProjection().fromPixelToLatLng(lowerRightPoint,$zoom,c);
        var projectionCode = decodeURIComponent(url.match(/srs=([\d\w%]*)&/i)[1]);
        if (projectionCode) {
          var destProj = new Proj4js.Proj(projectionCode);
          var uL = Proj4js.transform(EPSG_4326, destProj, new Proj4js.Point(upperLeft.x, upperLeft.y));
          var lR = Proj4js.transform(EPSG_4326, destProj, new Proj4js.Point(lowerRight.x , lowerRight.y));
          var bbox=uL.x+","+uL.y+","+lR.x+","+lR.y;
        } else {
          var bbox = upperLeft.x + "," + upperLeft.y + "," + lowerRight.x
              + "," + lowerRight.y;
        }
        var url = tileUrl;
        url = url.replace(/{m_bbox}/i, bbox);
        // make sure exceptions show up in image, so the user can
        // see them immediately
        url = url.replace(/exceptions=[\w\d%.]/i, 
          "EXCEPTIONS=application%2Fvnd.ogc.se_inimage&SRS=EPSG%3A900913");
        var startMatches = url.match(/{tb_start:(\w+)}/);
        if (startMatches != null && startMatches.length > 0) {
          var startDateFormat = startMatches[1];
          var startDate = Date.parse(thisMovie('timeslider').getTimeBarValues().startYear + "-01-01");
          var matchIndex = url.indexOf('tb_start:');
          while (matchIndex != -1) {
            url = url.replace(/{tb_end:(\w+)}/, startDate.toString(startDateFormat));
            matchIndex = url.indexOf('tb_start:');
          }
        }
        var endMatches = url.match(/{tb_end:(\w+)}/);
        if (endMatches != null && endMatches.length > 0) {
          var endDateFormat = endMatches[1];
          var matchIndex = url.indexOf('tb_end:');
          var endDate = Date.parse(thisMovie('timeslider').getTimeBarValues().endYear + "-12-31");
          while (matchIndex != -1) {
            url = url.replace(/{tb_end:(\w+)}/, endDate.toString(endDateFormat));
            matchIndex = url.indexOf('tb_end:');
          }
        }
        return url ;
      }
    } else if (tileType == ARC_GIS_MAP) {
        return null;
    } else {
      return function($GPoint, $zoom) {
        var newUrl = tileUrl,
        key = _tileToQuadKey($GPoint.x, $GPoint.y, $zoom);

        if (tileHost === "tiles.ats.ucla.edu") {
          newUrl = newUrl.replace(/tiles\.ats/, "tiles" 
                      + (key % 10) % 4 + ".ats");
        }

        return newUrl + "/" + key + ".png";
      };
    }
  };

  var _urlParamsToObject = function ($url) {
    var query = $url.split("?")[1];
        var vars = query.split("&");
    var params = {};
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
      params[pair[0].toLowerCase()] = pair[1];
        }
        return params;
  }

  var _objectToUrlParamString = function ($params) {
        var params = [];
        for (var i in $params) {
            params.push(i + "=" + $params[i]);
        }
        return params.join("&");
    }

  return {

    /**
     * @method getCenter
     * @description Returns the point at the center of the map.
     * @return GLatLng
     */
    getCenter: function() {
      return center = HyperCities.earth.getCenter();
    },

    /**
     * Add map to Hypercities
     * @param Object $map: the map object
     * @param Number $opacity: the opacity value
     * @return void
     */
    addMap: function($map, $opacity) {
      HyperCities.earth.addMap($map, $opacity);
    },

    addMapByUrl: function ($url, $type, $opacity, $mapData, $layers) {
      var opacity = 1.0,
        addMapToEarth = null;
      if (typeof($opacity) != 'undefined') {
        opacity = $opacity;
      }
      // infer that it's from the whole world
      var tileOverlay;
      // load URL
      // register (by URL) with _dynamicMapHolder
      _dynamicMapHolder[$url + "," + $layers] = {
        url: $url,
        type: $type,
        layers: $layers,
        tileOverlay: tileOverlay
      };

      if ($type == 'ArcGIS') {
        addMapToEarth = function () {
          HyperCities.earth.addMapByUrl($url + "/generateKml?layers=" + $layers);
        }
      } else {
        HyperCities.util.debug("Found WMS map.");
        var params = _urlParamsToObject($url);
        delete(params.bbox);
        addMapToEarth = (function ($url, $params) {
          return function () {
            var baseUrl = $url.split("?")[0];
            delete($params.bbox);
            $params.width = 2048;
            $params.height = 2048;
            $params.srs = "EPSG:4326";
            HyperCities.earth.addWMSMap(baseUrl + "?" + _objectToUrlParamString(params));
          }
        })($url, params);
			}
      // do this last because sometimes adding the map to Earth doesn't work
      addMapToEarth();
    },

    getMapByUrl: function ($url, $layers) {
      var map = _dynamicMapHolder[$url + "," + $layers];
      // event is fired if the map may have not had time to load yet.
      if (typeof map == 'undefined') {
        HyperCities.util.debug("Warning: map not found.");
        return null;
      }
      return map;
    },

    removeMapByUrl: function ($url, $layers) {
      HyperCities.util.debug(_id + "Removing dynamic map at : " + $url + "," + $layers);
      var map = _dynamicMapHolder[$url + "," + $layers];
      // Handles second remove event from external frame. This second remove
      // event is fired if the map may have not had time to load yet.
      if (typeof map == 'undefined') {
        HyperCities.util.debug("Warning: map not found.");
        return false;
      }
      HyperCities.earth.removeMapByUrl($url + "/generateKml?layers="+ $layers)
      delete (_dynamicMapHolder[$url + "," + $layers]);
    },

    getDynamicMaps: function () {
      return _dynamicMapHolder;
    },

    clearDynamicMaps: function () {
      for (var i in _dynamicMapHolder) {
        HyperCities.mainMap.removeMapByUrl (_dynamicMapHolder[i].url, _dynamicMapHolder[i].layers);
      }
      _dynamicMapHolder = {};
    },


    /**
     * Remove map from HyperCities
     * @param Object $map: the map object
     * @return void
     */
    removeMap: function($map) {
      HyperCities.earth.removeMap($map.id);
    },

    /**
     * Refresh map
     * @param Object $map: the map object
     * @param Number $opacity: the opacity value
     * @return void
     */
    refreshMap: function($map, $opacity) {
      if ((typeof($map) === 'undefined') || ($map === null) 
        || (typeof($map.tileOverlay) === 'undefined') 
        || ($map.tileOverlay === null)) return;
      // if this is an ArcGIS server layer, it has a setOpacity method
        HyperCities.mainMap.removeMap($map);
        HyperCities.mainMap.addMap($map, $opacity);
    },

   
    /** 
     *  Set the timespan of map
     *  Generally we call timebar.setTime() to set timespan of timebar.
     *  It will in turn call this function. Call this function directly 
     *  may result inconsistency between timebar and map timespan.
     *  @param Date $startTime: the start time
     *  @param Date $endTime: the end time
     *  @return void
     */
    setTimespan: function($startTime, $endTime) {

      HyperCities.debug(_id + "Set Timespan " 
          + $startTime.toString("yyyy-MM-dd HH:mm:ss") 
          + " ~ " 
          + $endTime.toString("yyyy-MM-dd HH:mm:ss"));

      _minTime = ($startTime === "undefined") ? null: $startTime;
      _maxTime = ($endTime === "undefined") ? null: $endTime;

    },

    /**
     * Get map timespan
     * @return Object timespan: {min: min date, max: max date}
     */
    getTimespan: function() {
      return HyperCities.control.timeSlider.getTimespan();
    },

    /**
     * Check if given GLatLng is in Map View
     * @param GLatLng $GLatLng: a lat lng box
     * @param GLatLng $bounds: current view
     * @return Boolean: true if given lat lng box is in view, false
     *          otherwise
     */
    inMap: function($latLng, $bounds) {
			return HyperCities.earth.containsLatLng($bounds, $latLng);
    },

    /**
     * Retuen Boundary of Map. This function should always return a bounds 
     * @return GLatLngBounds: the boundary of current view
     */
    getBounds: function() {
      var bounds = HyperCities.earth.getBounds() || null;
      return bounds;
    },

    /**
     * Return Current zoomlevel of Map Object
     * @return Number _zoom: the zoom level
     */
    getZoom: function () {
      return HyperCities.earth.getZoom();
    },

    setMaxZoom: function ($zoom) {
      _maxZoom = $zoom;
    },

    resetMaxZoom: function () {
      _maxZoom = 21;
    },

    /**
     * Get the latitude and longitude of the added or edited object
     * @param {String} $objectType the type of object
     * @return {String} json format of latitude and longitude cooridates
     */
    getOverlayLatLng: function ($objectType) {

      // check the object type first, for editing object
      // if an object is edited, call corresponding getLatLng() based on its type
      if ($objectType === HyperCities.config.HC_OBJECT_TYPE.PLACEMARK) {
        return _GAddMediaControl.getLatLng();
      } else if ($objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT) {
        return HyperCities.earth.getEarthAddMediaCtrl().getLatLng();
      }

      // check current map type, for adding new object
      // if an object is added, call corresponding getLatLng() based on map type
      if (HyperCities.mainMap.getCurrentMapType() === G_SATELLITE_3D_MAP) {
        return HyperCities.earth.getEarthAddMediaCtrl().getLatLng();
      } else {
        return _GAddMediaControl.getLatLng();
      }
    },

    /**
     * Get current MapTypeId
     * @return MapTypeId
     */
    getMapTypeId: function() {
      return "EARTH";
    },

    /**
     * Check if the the given bounds is in view
     * @param {GLatLng|GLatLngBounds} the bounds need to check
     * @return Boolean: true if the bounds is in view, false otherwise
     */
    isInView: function($bound) {

      return HyperCities.earth.isInView($bound);
    },

    /**
     * the GMarker click handler
     * @param Number $index: the index in the intellilist
     * @return void
     */
    clickGMarkerHandler: function($index) {
      $("#intelliList .highlight").removeClass('highlight');
      var item = $("#intelliItem_" + $index, "#intelliList").addClass('highlight');
      HyperCities.debug(_id + "item.id=" + item.attr("id"));
      if ($("#intelliList .intelliItem").length > 1) {
        $("#intelliList")[0].scrollTo("#intelliItem_" + $index);
      }
    },

    /**
     * Add event listener
     * @param Object $nodeObj:
     * @return void
     */
    addEventListener: function($nodeObj) {
      GEvent.addListener($nodeObj.obj, 'click', function() {
        HyperCities.mainMap.clickGMarkerHandler($nodeObj.id);
      });
    },

    /**
     * Overlay googleBookViewer
     * @param String BookId
     * @param String BookTitle
     * @param String keyword
     * @return void
     */
    overlayBookViewer: function($bookId, $bookTitle, $keyword, $pageNo) {
        // Determin the minimize status of Panel
        var isMinimized = function(targetIndex) {
          return parseInt(HyperCities.dhtmlWindow[targetIndex].cfg.getProperty("height")) < 50 ? true: false;
        };

        // Get Panel Index in HyperCities.dhtmlWindow Array by PanelId
        var getWindowIndex = function(ObjectId) {

          var dWindows = HyperCities.dhtmlWindow,
            index    = dWindows.length;

          while (index--) {
            if (dWindows[index].id == ObjectId) {
              return index;
            }
          }
          return -1;
        };

        // Align the Stacked Area
        var alignStack = function() {
          var stackOffset = HyperCities.dhtmlStacked,
            i, new_y;

          for (i = HyperCities.dhtmlWindow.length - 1; i >= 0; i--) {
            if (isMinimized(i)) {
              HyperCities.dhtmlWindow[i].cfg.setProperty("context", ["map", "bl", "bl"]);
              new_y = HyperCities.dhtmlWindow[i].cfg.getProperty("y") - (35 * stackOffset--);
              HyperCities.dhtmlWindow[i].cfg.setProperty("xy", [0, new_y]);
            }
          }
        };

        // Toggle the Book Display Panel
        var togglePanel = function(PanelId) {
          var targetIndex = getWindowIndex(PanelId);
          var targetPanel = HyperCities.dhtmlWindow[targetIndex] || null;
          var pageNo = -1;

          if (!targetPanel) return;

          if (isMinimized(targetIndex)) {
            // Restore Panel Event
            YAHOO.util.Dom.removeClass(YAHOO.util.Dom.getElementsByClassName("bd", "div", PanelId), "hidden");
            YAHOO.util.Dom.removeClass(YAHOO.util.Dom.getElementsByClassName("ft", "div", PanelId), "hidden");
            YAHOO.util.Dom.removeClass(YAHOO.util.Dom.getElementsByClassName("yui-resize-handle", "div", PanelId), "hidden");
            YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.getElementsByClassName("container-toggle", "a", PanelId), "plus", "minus");

            targetPanel.cfg.setProperty("width", targetPanel.org_width);
            targetPanel.cfg.setProperty("height", targetPanel.org_height);
            // Reset XY only when the panel is stacked at left
            if (targetPanel.cfg.getProperty("x") == 10) {
              targetPanel.cfg.setProperty("xy", targetPanel.org_xy);
            }
            targetPanel.Resize.unlock(true);
            HyperCities.dhtmlStacked--;
          } else {
            // Minimize Panel Event
            // First save coordinate and size for restore
            targetPanel.org_width = targetPanel.cfg.getProperty("width");
            targetPanel.org_height = targetPanel.cfg.getProperty("height");
            targetPanel.org_xy = targetPanel.cfg.getProperty("xy");

            // Hide and minimize the Panel
            YAHOO.util.Dom.addClass(YAHOO.util.Dom.getElementsByClassName("bd", "div", PanelId), "hidden");
            YAHOO.util.Dom.addClass(YAHOO.util.Dom.getElementsByClassName("ft", "div", PanelId), "hidden");
            YAHOO.util.Dom.addClass(YAHOO.util.Dom.getElementsByClassName("yui-resize-handle", "div", PanelId), "hidden");
            YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.getElementsByClassName("container-toggle", "a", PanelId), "minus", "plus");

            targetPanel.cfg.setProperty("width", "200px");
            targetPanel.cfg.setProperty("height", "30px");
            targetPanel.Resize.lock(false);
            HyperCities.dhtmlStacked++;

            pageNo = googleBookPanel.getPageNumber();
            $("#" + $bookId + "> .pageNum", ".currentBook")
              .html("p." + pageNo)
              .parent()
              .data("pageNo", pageNo);
          }
          alignStack();
        };

        var PanelId = "BookPanel_" + $bookId,
          GBVPanelId = "GBV_" + PanelId,
          PanelIndex = getWindowIndex(PanelId),
          defaultWidth = 400,
          defaultHeight = 500,
          bookWidth = defaultWidth - 30,
          bookHeight = defaultHeight + 30,
          viewportHeight = $(window).height();

        if (defaultHeight > (viewportHeight - 120)) {
          defaultHeight = viewportHeight - 120;
          bookHeight = defaultHeight + 30;
        }

        HyperCities.debug("W " + defaultWidth + " H " + defaultHeight);

        // If Panel already existed, just focus it.
        if (PanelIndex >= 0) {
          if (isMinimized(PanelIndex)) togglePanel(PanelId);

          HyperCities.dhtmlManager.bringToTop(HyperCities.dhtmlWindow[PanelIndex]);
          HyperCities.dhtmlManager.focus(HyperCities.dhtmlWindow[PanelIndex]);
        } else {
          // Create Book Display Panel
          var bookViewerPanel = new YAHOO.widget.Panel(PanelId, {
            width: defaultWidth + "px",
            height: defaultHeight + "px",
            visible: false,
            constraintoviewport: true,
            draggable: true,
            close: true,
            autofillheight: "body",
            zIndex: 998,
            iframe: true,
            context: ["map", "tl", "tl"]
          });
          var bookGid = $bookId.split("_").reverse()[0];

          bookViewerPanel.setHeader("Book: " + $bookTitle);
          bookViewerPanel.setBody('<div id="' + GBVPanelId + '" style="width :'
              + bookWidth + 'px;  height:90%;"/>');
          bookViewerPanel.render(document.body);

          // Setup GoogleBook Viewer
          googleBookPanel = new google.books.DefaultViewer(document.getElementById(GBVPanelId));
          googleBookPanel.load(bookGid,
            function(){
              alert("Book loads failed!");
              HyperCities.objectEditPanel.removeBook($bookId);
            },
            function(){
              if ( $pageNo ) {
              googleBookPanel.goToPage($pageNo);
              };
              bookViewerPanel.show();
            }
            );
          googleBookPanel.highlight($keyword);

          // Apply custom CSS to ImgPanel Object
          var panelHeader = YAHOO.util.Dom.get(PanelId + "_h");
          YAHOO.util.Dom.addClass(PanelId, "refPanel");
          YAHOO.util.Dom.addClass(panelHeader, "refPanel");
          YAHOO.util.Dom.addClass(YAHOO.util.Dom.getElementsByClassName("bd", "div", PanelId), "refPanel");
          YAHOO.util.Dom.addClass(YAHOO.util.Dom.getElementsByClassName("ft", "div", PanelId), "refPanel");
          bookViewerPanel.cfg.setProperty("width", defaultWidth + "px");
          bookViewerPanel.cfg.setProperty("height", defaultHeight + "px");

          // Create Toggle Button
          var closeLink = YAHOO.util.Dom.getLastChild(PanelId);
          var toggleLink = document.createElement("a");
          toggleLink.setAttribute("class", "container-toggle minus");
          toggleLink.setAttribute("href", "#");
          toggleLink.innerHTML = "Toggle";
          toggleLink.onclick = function(PanelId) {
            return function() {
              togglePanel(PanelId);
            };
          } (PanelId);

          // Add double click event trigger to Panel header
          panelHeader.ondblclick = function(PanelId) {
            return function() {
              togglePanel(PanelId);
            };
          } (PanelId);

          // Destory Panel Object after close the panel
          closeLink.onclick = function(PanelId) {
            return function() {
              var targetIndex = getWindowIndex(PanelId),
                currentPage = googleBookPanel.getPageNumber();

              if (targetIndex < 0) return;

              if ( isNaN(currentPage)) {
                alert("Page Number is undefined!");
              } else {
                $("#" + $bookId + "> .pageNum", ".currentBook")
                  .html("p." + currentPage)
                  .parent()
                  .data("pageNo", currentPage); 
              }

              var needAlign = isMinimized(targetIndex);
              HyperCities.dhtmlManager.remove(HyperCities.dhtmlWindow[targetIndex]);
              HyperCities.dhtmlWindow[targetIndex].Resize.destroy();
              HyperCities.dhtmlWindow[targetIndex].destroy();
              HyperCities.dhtmlWindow.splice(targetIndex, 1);
              if (needAlign) {
                HyperCities.dhtmlStacked--;
                alignStack();
              }
            };
          } (PanelId);

          // Attach toggle button to Panel
          YAHOO.util.Dom.insertBefore(toggleLink, closeLink);

          // Generate the Resize Handler
          bookViewerPanel.Resize = new YAHOO.util.Resize(PanelId, {
            handles: ['br'],
            autoRatio: true,
            minWidth: defaultWidth,
            minHeight: defaultHeight,
            status: false
          });

          bookViewerPanel.Resize.on("startResize", function(args) {
            if (this.cfg.getProperty("constraintoviewport")) {
              var D = YAHOO.util.Dom;

              var clientRegion = D.getClientRegion();
              var elRegion = D.getRegion(this.element);

              this.Resize.set("maxWidth", clientRegion.right 
                - elRegion.left - YAHOO.widget.Overlay.VIEWPORT_OFFSET);
              this.Resize.set("maxHeight", clientRegion.bottom 
                - elRegion.top - YAHOO.widget.Overlay.VIEWPORT_OFFSET);
            } else {
              this.Resize.set("maxWidth", null);
              this.Resize.set("maxHeight", null);
            }
          },
          bookViewerPanel, true);

          bookViewerPanel.Resize.on("resize", function(args) {
            var panelHeight = args.height;
            var panelWidth = args.width;
            this.cfg.setProperty("height", panelHeight + "px");
            this.cfg.setProperty("width", panelWidth + "px");
          },
          bookViewerPanel, true);

          // Add new Panel to Overlay Manager
          if (HyperCities.dhtmlManager == null) {
            HyperCities.dhtmlManager = new YAHOO.widget.OverlayManager();
          }
          HyperCities.dhtmlManager.register(bookViewerPanel);
          HyperCities.dhtmlManager.bringToTop(bookViewerPanel);
          HyperCities.dhtmlManager.focus(bookViewerPanel);
          HyperCities.dhtmlWindow.push(bookViewerPanel);
        }
    },

    closeBookViewer: function($bookId) {
        // Determin the minimize status of Panel
        var isMinimized = function(targetIndex) {
          return parseInt(HyperCities.dhtmlWindow[targetIndex].cfg.getProperty("height")) < 50 ? true: false;
        };

        // Get Panel Index in HyperCities.dhtmlWindow Array by PanelId
        var getWindowIndex = function(ObjectId) {

          var dWindows = HyperCities.dhtmlWindow,
            index    = dWindows.length;

          while (index--) {
            if (dWindows[index].id == ObjectId) {
              return index;
            }
          }
          return -1;
        };

        // Align the Stacked Area
        var alignStack = function() {
          var stackOffset = HyperCities.dhtmlStacked,
            i, new_y;

          for (i = HyperCities.dhtmlWindow.length - 1; i >= 0; i--) {
            if (isMinimized(i)) {
              HyperCities.dhtmlWindow[i].cfg.setProperty("context", ["map", "bl", "bl"]);
              new_y = HyperCities.dhtmlWindow[i].cfg.getProperty("y") - (35 * stackOffset--);
              HyperCities.dhtmlWindow[i].cfg.setProperty("xy", [0, new_y]);
            }
          }
        };

        var PanelId = "BookPanel_" + $bookId,
          targetIndex = getWindowIndex(PanelId);

        if (targetIndex < 0) return;

        var needAlign = isMinimized(targetIndex);

        HyperCities.dhtmlManager.remove(HyperCities.dhtmlWindow[targetIndex]);
        HyperCities.dhtmlWindow[targetIndex].Resize.destroy();
        HyperCities.dhtmlWindow[targetIndex].destroy();
        HyperCities.dhtmlWindow.splice(targetIndex, 1);
        if (needAlign) {
          HyperCities.dhtmlStacked--;
          alignStack();
        }
        return false;
    },

    clearMap: function() {
      HyperCities.collectionList.uncheckAllItems();
      HyperCities.collectionList.collapseAllFolders();
      HyperCities.mapList.clearMaps();
      // disable earth clearFeature because it hides the timeslier.
      // it seems kml objects can be removed without clearFeautre();
      //HyperCities.earth.clearFeature();
      var startDate = new Date(),
          endDate   = new Date();
      // NOTE: Javascript Dates are offset by 1 year; this will return 1700
      startDate.setFullYear(1701, 0, 0);
      // setTime on timebar will triger HyperCities.syncSession, thus reloading intellilist and maplist
      HyperCities.timebar.setTime(null, startDate, endDate, null, true);
      HyperCities.linkController.clearURL();
    },

    /**
     * Overlay image box
     * @param Object object
     * @return void
     */
    overlayImageBox: function(object) {
      return function() {

        // Determin the minimize status of Panel
        var isMinimized = function(targetIndex) {
          return parseInt(HyperCities.dhtmlWindow[targetIndex].cfg.getProperty("height")) < 50 ? true: false;
        };

        // Get Panel Index in HyperCities.dhtmlWindow Array by PanelId
        var getWindowIndex = function(ObjectId) {

          var dWindows = HyperCities.dhtmlWindow,
            index    = dWindows.length;

          while (index--) {
            if (dWindows[index].id == ObjectId) {
              return index;
            }
          }
          return -1;
        };

        // Align the Stacked Area
        var alignStack = function() {
          var stackOffset = HyperCities.dhtmlStacked;
          for (var i = HyperCities.dhtmlWindow.length - 1; i >= 0; i--) {
            if (isMinimized(i)) {
              HyperCities.dhtmlWindow[i].cfg.setProperty("context", ["map", "bl", "bl"]);
              var new_y = HyperCities.dhtmlWindow[i].cfg.getProperty("y") - (35 * stackOffset--);
              HyperCities.dhtmlWindow[i].cfg.setProperty("xy", [0, new_y]);
            }
          }
        };

        // Toggle the Photo Display Panel
        var togglePanel = function(PanelId) {
          var targetIndex = getWindowIndex(PanelId);
          var targetPanel = HyperCities.dhtmlWindow[targetIndex] || null;

          if (!targetPanel) return;

          if (isMinimized(targetIndex)) {
            // Restore Panel Event
            YAHOO.util.Dom.removeClass(YAHOO.util.Dom.getElementsByClassName("bd", "div", PanelId), "hidden");
            YAHOO.util.Dom.removeClass(YAHOO.util.Dom.getElementsByClassName("ft", "div", PanelId), "hidden");
            YAHOO.util.Dom.removeClass(YAHOO.util.Dom.getElementsByClassName("yui-resize-handle", "div", PanelId), "hidden");
            YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.getElementsByClassName("container-toggle", "a", PanelId), "plus", "minus");

            targetPanel.cfg.setProperty("width", targetPanel.org_width);
            targetPanel.cfg.setProperty("height", targetPanel.org_height);
            // Reset XY only when the panel is stacked at left
            if (targetPanel.cfg.getProperty("x") == 10) {
              targetPanel.cfg.setProperty("xy", targetPanel.org_xy);
            }
            targetPanel.Resize.unlock(true);
            HyperCities.dhtmlStacked--;
          } else {
            // Minimize Panel Event
            // First save coordinate and size for restore
            targetPanel.org_width = targetPanel.cfg.getProperty("width");
            targetPanel.org_height = targetPanel.cfg.getProperty("height");
            targetPanel.org_xy = targetPanel.cfg.getProperty("xy");

            // Hide and minimize the Panel
            YAHOO.util.Dom.addClass(YAHOO.util.Dom.getElementsByClassName("bd", "div", PanelId), "hidden");
            YAHOO.util.Dom.addClass(YAHOO.util.Dom.getElementsByClassName("ft", "div", PanelId), "hidden");
            YAHOO.util.Dom.addClass(YAHOO.util.Dom.getElementsByClassName("yui-resize-handle", "div", PanelId), "hidden");
            YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.getElementsByClassName("container-toggle", "a", PanelId), "minus", "plus");

            targetPanel.cfg.setProperty("width", "200px");
            targetPanel.cfg.setProperty("height", "30px");
            targetPanel.Resize.lock(false);
            HyperCities.dhtmlStacked++;
          }
          alignStack();
        };

        var PanelId = "ImgPanel_" + object.id;
        var PanelIndex = getWindowIndex(PanelId);
        var defaultWidth = 320;
        var defaultHeight = parseInt(defaultWidth * (object.height * 1.0 / object.width)) + 64;
        var viewportHeight = $(window).height();

        if (defaultHeight > (viewportHeight - 120)) defaultHeight = viewportHeight - 120;

        HyperCities.debug("W " + defaultWidth + " H " + defaultHeight);

        // If Panel already existed, just focus it.
        if (PanelIndex >= 0) {
          if (isMinimized(PanelIndex)) togglePanel(PanelId);

          HyperCities.dhtmlManager.bringToTop(HyperCities.dhtmlWindow[PanelIndex]);
          HyperCities.dhtmlManager.focus(HyperCities.dhtmlWindow[PanelIndex]);
        } else {
          // Create Photo Display Panel
          var iframe = false;
          //if (_GMap.getCurrentMapType() == G_SATELLITE_3D_MAP) {
            iframe = true;
          //}
          var ImagePanel = new YAHOO.widget.Panel(PanelId, {
            width: defaultWidth + "px",
            height: defaultHeight + "px",
            visible: false,
            constraintoviewport: true,
            draggable: true,
            close: true,
            autofillheight: "body",
            zIndex: 998,
            iframe: iframe,
            context: ["map", "tl", "tl"]
          });

          ImagePanel.setHeader(object.title);
          ImagePanel.setBody("<img id=\"photo" + object.id + "\" src=\"" 
              + object.sourceURL + "\" style=\"width:100%;height:100%;min-width:" 
              + defaultWidth + "px;min-height:" + (defaultHeight - 64) + "px;\">");

          ImagePanel.render(document.body);
          ImagePanel.show();

          // Apply custom CSS to ImgPanel Object
          var panelHeader = YAHOO.util.Dom.get(PanelId + "_h");
          YAHOO.util.Dom.addClass(PanelId, "imgPanel");
          YAHOO.util.Dom.addClass(panelHeader, "imgPanel");
          YAHOO.util.Dom.addClass(YAHOO.util.Dom.getElementsByClassName("bd", "div", PanelId), "imgPanel");
          YAHOO.util.Dom.addClass(YAHOO.util.Dom.getElementsByClassName("ft", "div", PanelId), "imgPanel");
          ImagePanel.cfg.setProperty("width", defaultWidth + "px");
          ImagePanel.cfg.setProperty("height", defaultHeight + "px");

          // Create Toggle Button
          var closeLink = YAHOO.util.Dom.getLastChild(PanelId);
          var toggleLink = document.createElement("a");
          toggleLink.setAttribute("class", "container-toggle minus");
          toggleLink.setAttribute("href", "#");
          toggleLink.innerHTML = "Toggle";
          toggleLink.onclick = function(PanelId) {
            return function() {
              togglePanel(PanelId);
            };
          } (PanelId);

          // Add double click event trigger to Panel header
          panelHeader.ondblclick = function(PanelId) {
            return function() {
              togglePanel(PanelId);
            };
          } (PanelId);

          // Destory Panel Object after close the panel
          closeLink.onclick = function(PanelId) {
            return function() {
              var targetIndex = getWindowIndex(PanelId);
              if (targetIndex < 0) return;

              var needAlign = isMinimized(targetIndex);
              HyperCities.dhtmlManager.remove(HyperCities.dhtmlWindow[targetIndex]);
              HyperCities.dhtmlWindow[targetIndex].Resize.destroy();
              HyperCities.dhtmlWindow[targetIndex].destroy();
              HyperCities.dhtmlWindow.splice(targetIndex, 1);
              if (needAlign) {
                HyperCities.dhtmlStacked--;
                alignStack();
              }
            };
          } (PanelId);

          // Attach toggle button to Panel
          YAHOO.util.Dom.insertBefore(toggleLink, closeLink);

          // Generate the Resize Handler
          ImagePanel.Resize = new YAHOO.util.Resize(PanelId, {
            handles: ['br'],
            autoRatio: true,
            minWidth: defaultWidth,
            minHeight: defaultHeight,
            status: false
          });

          ImagePanel.Resize.on("startResize", function(args) {
            if (this.cfg.getProperty("constraintoviewport")) {
              var D = YAHOO.util.Dom;

              var clientRegion = D.getClientRegion();
              var elRegion = D.getRegion(this.element);

              this.Resize.set("maxWidth", clientRegion.right 
                - elRegion.left - YAHOO.widget.Overlay.VIEWPORT_OFFSET);
              this.Resize.set("maxHeight", clientRegion.bottom 
                - elRegion.top - YAHOO.widget.Overlay.VIEWPORT_OFFSET);
            } else {
              this.Resize.set("maxWidth", null);
              this.Resize.set("maxHeight", null);
            }
          },
          ImagePanel, true);

          ImagePanel.Resize.on("resize", function(args) {
            var panelHeight = args.height;
            var panelWidth = args.width;
            this.cfg.setProperty("height", panelHeight + "px");
            this.cfg.setProperty("width", panelWidth + "px");
          },
          ImagePanel, true);

          // Add new Panel to Overlay Manager
          if (HyperCities.dhtmlManager == null) {
            HyperCities.dhtmlManager = new YAHOO.widget.OverlayManager();
          }
          HyperCities.dhtmlManager.register(ImagePanel);
          HyperCities.dhtmlManager.bringToTop(ImagePanel);
          HyperCities.dhtmlManager.focus(ImagePanel);
          HyperCities.dhtmlWindow.push(ImagePanel);
        }

        return false;
      };
    }

  }
} (); // end of Object
// end of file

