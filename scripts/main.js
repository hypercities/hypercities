/**
 * HyperCities Main Application
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2008-12-12
 * @version   0.7
 *
 */

// create applicatio namespace
HyperCities = function() {
  // do NOT access javascript generated DOM from here; elements don't exist yet
  // constants
  var MAP_WIDTH = 315,
  SIDEBAR_WIDTH = 315;

  // private variables
  var _id = "[HyperCities] ";
  //_queuedOperations = [];

  // private functions
  /**
   * Add Event Listener to the sidebar tab
   * @return void
   */
  var _initSideBarTabs = function() {

    $("#sidebarWrapper:first").resizable({
      handles: "w",
      helper: "proxy",
      resize: function(e, ui) {
        var defaultWidth = SIDEBAR_WIDTH,
        mapWidth = MAP_WIDTH,
        tolerance = 100,
        viewportWidth = $(window).width();

        if (ui.size.width < defaultWidth) {
          // Sidebar too small, close sidebar
          ui.helper.css("left", '');

          if (((ui.originalSize.width < defaultWidth) && (ui.size.width > tolerance)) 
            || ((ui.originalSize.width >= defaultWidth) && (ui.size.width >= (defaultWidth - tolerance)))) {
            ui.helper.css("right", defaultWidth + "px");
          } else {
            ui.helper.css("right", "0px");
          }

          ui.helper.css("border-left", "0px");
          ui.helper.css("border-right", "6px solid #CCCCCC");
        } else if (viewportWidth - ui.size.width < mapWidth) {
          // Map too small, close map
          if (((ui.originalPosition.left < mapWidth) && (ui.position.left > tolerance)) 
            || ((ui.originalPosition.left >= mapWidth) && (ui.position.left >= (mapWidth - tolerance)))) {
            ui.helper.css("left", mapWidth + "px");
          } else {
            ui.helper.css("left", "0px");
          }

          ui.helper.css("border-left", "6px solid #CCCCCC");
          ui.helper.css("border-right", "0px");

        } else {
          ui.helper.css("border-left", "6px solid #CCCCCC");
          ui.helper.css("border-right", "0px");
        }
      },

      stop: function(e, ui) {
        var defaultWidth = SIDEBAR_WIDTH - 5,
        mapWidth = MAP_WIDTH,
        tolerance = 100,
        viewportWidth = $(window).width();

        $(this).css("height", '');
        $(this).css("left", '');
        $(this).css("position", '');
        $(".ui-resizable-handle").css("width", "6px");
        if ($(this).width() < defaultWidth) {
          if (((ui.originalSize.width < defaultWidth) && (ui.size.width > tolerance)) 
            || ((ui.originalSize.width >= defaultWidth) && (ui.size.width >= (defaultWidth - tolerance)))) {
            $(this).css("width", defaultWidth + "px");
          } else {
            $(this).css("width", "0px");
            $(".ui-resizable-handle").css("width", "10px");
          }
        } else if (ui.position.left < mapWidth) {
          if (((ui.originalPosition.left < mapWidth) && (ui.position.left < tolerance)) 
            || ((ui.originalPosition.left >= mapWidth) && (ui.position.left <= (mapWidth - tolerance)))) {
            $(this).css("width", viewportWidth - 10 + "px");
          } else {
            $(this).css("width", viewportWidth - mapWidth - 10 + "px");
          }
        }

        HyperCities.adjustLayout();
      }
    });

    $("#worldMapTab").click(function() {
      $(this).blur();

      if ($(this).parent().hasClass('highlight')) return false;

      // set up the selected class
      $(".topTab").removeClass('highlight');
      $(this).parent().addClass('highlight');

      $("#loadingMessage").fadeIn("fast");

      $("#topPanel").fadeOut("normal", function() {
        $("#worldMapPanel").fadeIn("normal", function() {
          $("#loadingMessage").fadeOut("slow");
        });
      });
    });


    $("#searchTab").click(function() {
      $(this).blur();

      if ($(this).parent().hasClass('highlight')) return false;

      // set up the selected class
      $(".topTab").removeClass('highlight');
      $(this).parent().addClass('highlight');

      $("#loadingMessage").fadeIn("fast");
      $.ajax({
        url: "searchForm.html",
        cache: true,
        success: function(message) {
          $("#topPanel").fadeOut("normal", function() {
        $("#worldMapPanel").fadeOut("normal", function() {
                $("#topPanel").empty().append(message).fadeIn("normal", function() {
                // enable search function
                $("#addressSearchBtn").click(function() {
                  $("#addressSearchBtn").addClass("active");
                  $("#keywordSearchBtn").removeClass("active");
                  $("#keywordSearchForm").hide();
                  $("#addressSearchForm").show();
                });
                $("#keywordSearchBtn").click(function() {
                  $("#addressSearchBtn").removeClass("active");
                  $("#keywordSearchBtn").addClass("active")
                  $("#addressSearchForm").hide();
                  $("#keywordSearchForm").show();
                });

                HyperCities.search.init();

                if ($("#keywordSearchForm #resetBtn").length > 0) {
                  $("#keywordSearchForm #resetBtn").click(HyperCities.search.resetKeyword);
                }

                if ($("#keywordSearchForm #searchBtn").length > 0) {
                  $("#keywordSearchForm #searchBtn").click(HyperCities.search.searchKeyword);
                }

                if ($("#keywordSearchForm #clearBtn").length > 0) {
                  $("#keywordSearchForm #clearBtn").click(HyperCities.search.clearResults);
                }

                $("#loadingMessage").fadeOut("slow");
              });
          });
    });
        }
      });
    });

    $("#loginTab").click(function() {
      $(this).blur();
      HyperCities.user.tabClick();
      return;
    });

    $("#helpTab").click(function() {
      window.open("http://help.hypercities.com/", "HyperCities Documentation Wiki", "");
    });

    $("#mapTab").click(function() {
      $(this).blur();

      var latLonBox, zoom;

      latLonBox = HyperCities.mainMap.getBounds();
      zoom = HyperCities.mainMap.getZoom();

      if ($(this).parent().hasClass('highlight')) return false;

      // set up the selected class
      $(".intelliTab").removeClass('highlight');
      $(".intelliTab span").unbind().remove();
      $(this).parent().addClass('highlight');

      $("#loadingMessage").fadeIn("fast");
      $("#intelliList").fadeOut("normal", function() {
        HyperCities.intelliList.reset();
        $("#intelliList").show();
        HyperCities.mapList.update(latLonBox, zoom, true);
      });

      return false;
    });

    $("#collectionTab").click(function() {
      $(this).blur();

      var latLonBox, zoom;

      latLonBox = HyperCities.mainMap.getBounds();
      zoom = HyperCities.mainMap.getZoom();

      if ($(this).parent().hasClass('highlight')) return false;

      // set up the selected class
      $(".intelliTab").removeClass('highlight');
      $(this).parent().addClass('highlight');

      $("#loadingMessage").fadeIn("fast");
      $("#intelliList").fadeOut("normal", function() {
        HyperCities.intelliList.reset();
        $("#intelliList").show();
        HyperCities.collectionList.update(latLonBox, zoom, true);
      });

      return false;
    });

    $("#intelliSync").bind("click", function($event) {
      $(this).toggleClass("syncMap");

      HyperCities.collectionList.syncWithMap($(this).hasClass("syncMap"));

      HyperCities.mapList.syncWithMap($(this).hasClass("syncMap"));
    });
  };

  // public space
  return {
    // public properties
    config: {},
    // HyperCities Global Configuration
    mainMap: {},
    // Main Google Map Object Wrapper
  miniMap: {},
  // World Map Object Wrapper
    mapList: {},
    // MapList Wrapper
    intelliList: {},
    // IntelliList Wrapper
    dhtmlWindow: [],
    // HTML Window For Image Display
    dhtmlManager: null,
    // HTML Window Manager For Image Display
    dhtmlStacked: 0,
    // HTML Window Stack Counter For Image Display
    city: {},
    // City List Object Wrapper
    HCObject: {},
    // HyperCities Object Repository
    session: {},
    search: {},
    group: {},
    user: {},
    // 'Permalink' name changed to 'linkController'
    // because it manages more than permalinks.
    linkController: {},
    // Handles permalinks and URL bar
    embeddedApi: {},
    // Embedded API
    /**
     * Class used to manage extensions to content in both narrative mode
     * and bubbles.
     */
    ContentExtension: null,
    // public methods

    /**
     * Initialize HyperCities Earth
     * @return void
     */
    initEarth: function() {
      try {
        HyperCities.util.debug(_id + 'init() called.');

        // Check necessary environments were enabled
        if (!HyperCities.util.checkEnv()) return;

        // Instantiate and configure YUI Loader:
        ///*
        var yuiLoader = new YAHOO.util.YUILoader({
          base: "http://ajax.googleapis.com/ajax/libs/yui/2.8.0r4/build/",
          require: ["container", "dragdrop", "resize", "slider"],
          loadOptional: true,
          combine: false,
          filter: "MIN",
          allowRollup: true,
          onSuccess: function() {}
        });
        // Load the files using the insert() method.
        yuiLoader.insert();
        //*/

        // Init city object to get feature city list
        _initSideBarTabs();

        // Init GEarth
        HyperCities.earth.init('map3d');

        // Initial HyperCities Object Repository
        // HCObject involves accessing GMap, thus should be initialized
        // after GMap
        //HyperCities.HCObject.init();
        // Init Sidebar Tabs

        // Highlight the default Tab
        var url = document.location.toString();
        // Default Tab is World Map
        var tabAnchor = "#worldMapTab";
        if (url.match('#')) {
          // check if the URL contains an anchor
          tabAnchor = url.split('#')[1];
          if (tabAnchor == 'login') {
            // If the hash is 'login', causing $("#loginTab").click
            // to be called, this will immediately pop up the login
            // box. This code show the worldMap instead to be safe.
            tabAnchor = "#worldMapTab";
          } else {
            if ($('#' + tabAnchor + "Tab").length > 0) {
              tabAnchor = '#' + tabAnchor + 'Tab';
            }
            else tabAnchor = "#worldMapTab";
          }
        }

        HyperCities.miniMap.init("#worldMapPanel");
        $(tabAnchor).click();

        // Remove the Javascript warning message since we can execute js
        $("#warningMessage").remove();

      } catch (e) {
        alert(e);
      }
    },

    /**
     * Adjust the layout by current viewport
     * @param Object $opt: the adjustLayout options
     * @return void
     */
    adjustLayout: function($opt) {

      var options = $opt || {},
        doSync = true,
        currentMode = HyperCities.session.get("mode"),
        viewportHeight = $(window).height(),
        viewportWidth = $(window).width(),
        intelliListTop = $("#intelliListWrapper").position().top,
        paddingButtom = 5,
        sidebarWidth = $('#sidebarWrapper').width();

      $('#intelliListWrapper').css("height", viewportHeight - intelliListTop - paddingButtom);
      $('#intelliListWrapper > .jScrollPaneContainer').css("width", "auto");
      $('#intelliList').css("height", viewportHeight - intelliListTop - paddingButtom);
      if (viewportWidth - sidebarWidth - 10 < MAP_WIDTH) {
        sidebarWidth = SIDEBAR_WIDTH;
      }
      $('#contentWrapper').css("right", sidebarWidth + 10 + "px");
      $('#GTimeControl').css("width", (viewportWidth - sidebarWidth - 230) + "px");
      $('#GTCSlider').css("width", (viewportWidth - sidebarWidth - 345) + "px");
      $('#map').css("min-height", viewportHeight + "px");
      $('#map').css("height", viewportHeight + "px");

      //HyperCities.mainMap.checkResize();

      if (typeof(options.sync) === "boolean") {
        if (options.sync === false) {
          doSync = false;
        }
      }

      if (currentMode === HyperCities.config.MODE_NARRATIVE) {
        doSync = false;
        HyperCities.narrativePanel.checkResize();
      }

      if ((currentMode === HyperCities.config.MODE_ADD_OBJECT) 
        || (currentMode === HyperCities.config.MODE_EDIT_OBJECT)) {
        doSync = false;
        HyperCities.objectEditPanel.checkResize();
      }

      if (doSync) {
        HyperCities.syncSession();
      }
    },

    /**
     * Get Default value from server session variable
     * @return void
     */
    getDefault: function() {
      HyperCities.util.debug(_id + "Get Default value from server session variable");

      // Disable MapSync By default
      $("#intelliSync").removeClass("syncMap");
    },

    /**
     * sync the whole HyperCities environment(map, mapList, collection list,
     * timebar, etc.)
     * @param boolean $updateTimebar: If true, syncSession will set timebar 
     *                after mapList.update() is done.
     *                              This parameter is useful to prevent infinite
     *                              loop between timebar.setTime() and syncSession().
     */
    syncSession: function($updateTimebar) {

      HyperCities.util.debug(_id + "Doing Sync Here");

      var latLonBox, zoom, center, timespan, userId;

      center = HyperCities.mainMap.getCenter();
      latLonBox = HyperCities.mainMap.getBounds();
      zoom = HyperCities.mainMap.getZoom();
      userId = HyperCities.user.getUserId();
      timespan = HyperCities.mainMap.getTimespan();


      HyperCities.session.set("center", center);
      HyperCities.session.set("zoom", zoom);
      HyperCities.session.set("user", userId);

      // Update Map List / Collection List
      if (HyperCities.session.get("mode") !== HyperCities.config.MODE_NARRATIVE) {
        if ($("#mapTab").parent().hasClass('highlight')) {
          // Update Map List
          HyperCities.mapList.update(latLonBox, zoom, true, true, $updateTimebar);
        }
        else if ($("#collectionTab").parent().hasClass('highlight')) {
          // Update Map List, but no render
          HyperCities.mapList.update(null, null, false, true, false);
          // Update Collection List
          HyperCities.collectionList.update(latLonBox, zoom, true);
        }
      }

/*
      if (!HyperCities.session.isEqualSession(latLonBox, timespan, userId)) {

        try {
          // Previous timespan and bounds
          //var previousTimespan = HyperCities.session.get("currentTimespan"),
          //previousLatLonBox = HyperCities.session.get("currentBounds");

          // If the current bounds is different from the previuos one, then store it.
          HyperCities.session.set("currentBounds", latLonBox);
          HyperCities.session.set("currentTimespan", timespan);

        } catch(e) {
          HyperCities.debug("Error in syncing: " + e);
        }

        // Update _zoom and _center
        try {
          HyperCities.session.set("center", center);
          HyperCities.session.set("zoom", zoom);
          HyperCities.session.set("user", userId);
        } catch(e) {
          HyperCities.debug("Error in setting zoom and center!");
        }

        // Sync City Information based on current View and Zoomlevel
        if (zoom >= HyperCities.config.ZOOM_THRESHOLD) {
          setTimeout(function() {
            HyperCities.session.set("city", HyperCities.city.findCity(HyperCities.mainMap.getCenter()));
          },
          200);
        }
        else {
          HyperCities.session.set("city", null);
        }

        // Update Map List / Collection List
        if (HyperCities.session.get("mode") !== HyperCities.config.MODE_NARRATIVE) {
          if ($("#mapTab").parent().hasClass('highlight')) {
            // Update Map List
            HyperCities.mapList.update(latLonBox, zoom, true, true, $updateTimebar);
          }
          else if ($("#collectionTab").parent().hasClass('highlight')) {
            // Update Map List, but no render
            HyperCities.mapList.update(null, null, false, true, false);
            // Update Collection List
            HyperCities.collectionList.update(latLonBox, zoom, true);
          }
        }

        if (_queuedOperations != []) {
          for (var i in _queuedOperations) {
            _queuedOperations[i].operation(_queuedOperations[i].data);
            delete _queuedOperations[i];
          }

          // Empty _queuedOperations so that they don't repeat
          _queuedOperations = [];
        }

      } // end if for the duplicate session checking.
      else {
        HyperCities.debug(_id + "Same session, did not sync");
      }
      */
    },

    /**
     * This function is used to add things, like automatically checking objects,
     * that need to wait for the collection list and map list to sync with the
     * map. This is used by permalink and snapshot loaders.
     * @param Function $operation: A function that will be executed later.
     * @param Object $data: Arugments for the operation as a map.
     * @return void
     */
                 /*
    queueForSyncEnd: function($operation, $data) {
      _queuedOperations.push({
        operation: $operation,
        data: $data
      });
    },
    */

    /**
     * This function is deprecated, use HyperCities.util.debug instead.
     * Keep for backward compatibility.
     * @param Object $obj: the debug information
     * @return void
     */
    debug: function($obj) {
      HyperCities.util.debug($obj);
    }

  };
} (); // end of application

// Initialize application when DOM is ready
(function(window, undefined) {
  $(document).ready(HyperCities.initEarth);
})(this);

// Reset Layout when window resize
//$(window).resize(HyperCities.adjustLayout);

// end of file
