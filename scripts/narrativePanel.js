/**
 * HyperCities narrativePanel Object
 *
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2009-07-20
 *
 */

HyperCities.narrativePanel = function () {
  // Do NOT access javascript generated DOM from here; elements don't exist yet

  // Private variables
  var _id = "[HyperCities.narrativePanel] ",

    // Map related variables
    _mapBounds  = null,
    _mapZoom    = null,

    // Timespan related variables
    _timespanStack = [],

    // narrativePanel related variables
    _panelSet      = [],    // Set of panel container
    _currentPanel  = 0,     // Current position in panelSet
    _currentPos    = [],    // Current position of autoPlay
    _checked       = [],    // Item checked by NarrativePanel
    _carryList     = [],    // Item should be carried to next highlight object
    _parentId      = null,  // The parentId of current panel
    _progressCount = 0,     // Progress Count for loading display

    // Dom element related variables 
    _initialized   = false,
    _zoomToExtent  = false,
    _originalMode  = HyperCities.config.MODE_DEFAULT,
    _currentMode   = HyperCities.config.MODE_NARRATIVE,
    _panelWrapper  = null,  // Assigned to $("#narrativePanelWrapper")
                            // in _init()
    _sidebarWidth  = 0,

    // Narrative options variables
    _isListView    = false,
    _isDateView    = true,

    //_contentExtensions = new Array(),

    IDS = {
      sidebarWrapper: "sidebarWrapper",
      panelWrapper: "narrativePanelWrapper"
    },

    // CSS classes constant used by narrativePanel
    CLASSES = {
      panel: "HCNarrativePanel",
      panelInfo: "HCNarrativePanelInfo",
      panelList: "HCNarrativePanelList",
      panelItem: "HCNarrativePanelItem",
      loading: "loading",
      closeBtn: "closeBtn",
      deleteBtn: "deleteBtn",
      editBtn: "editBtn",
      gripBtn: "gripBtn",
      centerBtn: "centerBtn",
      expandBtn: "expandBtn",
      overlayBtn: "overlayBtn",
      richObjBtn: "richObjBtn",
      collectionLink: "collectionLink",
      backBtn: "backBtn",
      listView: "listView",
      title: "title",
      author: "author",
      metadata: "HCNarrativeMetadata",
      toolbar: "toolbar",
      toolPanel: "toolPanel",
      toolPanelContent: "toolPanelContent",
      extDate: "extDate",
      content: "HCNarrativeContent",
      description: "description",
      blankLink: "blankLink",
      editCollectionBtn: "editCollectionBtn",
      deleteCollectionBtn: "deleteCollectionBtn",
      prevLink: "prevLink",
      nextLink: "nextLink",
      optionLink: "optionLink",
      options: "optionList",
      syncMapOn: "syncMapOn",
      syncMapOff: "syncMapOff",
      showExpandedBtn: "showExpandedBtn",
      showListBtn: "showListBtn",
      showDate: "showDate",
      showDatetime: "showDatetime",
      autoZoomOn: "autoZoomOn",
      autoZoomOff: "autoZoomOff",
      showBuildingOn: "showBuildingOn",
      showBuildingOff: "showBuildingOff",
      permaLink: "permaLink",
      permaLinkUrl: "permaLinkUrl",
      bookmarks: "bookmarks",
      bookCover: "bookCover",
      link: "link",
      selected: "selected",
      item: "item",
      first: "first"
    };

  // Private function goes here

  /**
   * Create Panel Dom Element
   * @return {Node} the new dom element
   */
    var _createPanelDom = function () {

    var totalPanels   = _panelSet.length,
      panelId       = totalPanels + 1,
      panelWidth    = _panelWrapper.width(),
      panelHeight   = _panelWrapper.height(),
      panelOffset   = 0,
      panelDom      = $(document.createElement("div")),
      panelInfo     = $(document.createElement("div")),
      panelList     = $(document.createElement("div")),
      panelInfoHtml = ['<div class="', CLASSES.closeBtn, '"></div>',
        '<div class="', CLASSES.backBtn,
        '" title="Back to previous collection"><</div>',
        '<div class="', CLASSES.loading, '"> Loading... </div>',
        '<div class="', CLASSES.toolbar, '">',
        '<div class="', CLASSES.showExpandedBtn,
        '" title="Expanded View"></div>',
        '<div class="', CLASSES.showListBtn, '" title="List View"></div>',
        '<span class="', CLASSES.prevLink, '">Prev</span> | ',
        '<span class="', CLASSES.nextLink, '">Next</span> | ',
        '<span class="', CLASSES.optionLink, '">Options</span> | ',
        '<span class="', CLASSES.permaLink, '">Link</span>',
        '</div>',
        '<div class="', CLASSES.toolPanel, '">',
        '<div class="', CLASSES.closeBtn, '"></div>',
        '<div class="', CLASSES.toolPanelContent, '"></div></div>'],
      loadingHtml   = ['<div class="', CLASSES.loading,
               '"> Loading... </div>'];

    // If this is not first panel, assign panelOffset
    // otherwise, remove back button
        if ( totalPanels > 0 ) {
            panelOffset = panelWidth;
        } 
    else {
      panelInfo.addClass(CLASSES.first);
    }

    // Create dom node for collection info (metadata)
    panelInfo.attr("id", "panelInfo_" + panelId)
      .addClass(CLASSES.panelInfo)
      .html(panelInfoHtml.join (''));

    // Create dom node for collection items container
    panelList.attr("id", "panelList_" + panelId)
      .addClass(CLASSES.panelList)
      .html(loadingHtml.join (''));

    // Create dom node of main narrative panel 
    panelDom.attr("id", "panel_" + panelId)
      .data("panelId", panelId)
      .addClass(CLASSES.panel)
      .css("left", panelOffset)
      .css("width", panelWidth - 10)
      .css("height", panelHeight)
      .append(panelInfo)
      .append(panelList)
      .bind('click', _panelClickHandler); // Bind Narrative Panel Click Event

    return panelDom;
    };

  /**
   * Create Dom Node of New Narrative Panel, and shift original one to left
   * @param {Integer} $collectionId collectionId of new panel
   * @param {Integer} $parentId parentId of collection in new panel
   */
  var _appendPanel = function ($collectionId, $parentId) {

    var panelDom   = _createPanelDom(),
      panelWidth = _panelWrapper.width(),
	  panelListDom = $("#panelList_" + _currentPanel),
	  prevItem     = null,
	  prevItemId   = null,
	  checkerDom   = null,
	  isChecked    = false;

    panelDom.data("collectionId", $collectionId)
      .data("parentId", $parentId)
      .appendTo(_panelWrapper);

	// Remove Previous Selected Item
	if (panelListDom) {
		prevItem = $("." + CLASSES.panelItem + "." + CLASSES.selected, panelListDom);
		if ( prevItem.length === 1 ) {
			prevItemId = parseInt(prevItem.data("id"));

			checkerDom = $("." + CLASSES.overlayBtn, prevItem);
			isChecked = checkerDom.hasClass(CLASSES.selected);

			if ( isChecked ) { // Remove Overlay if it's checked
				checkerDom.trigger("click")
					.parent().removeClass(CLASSES.selected);
			}

			checkerDom = $("." + CLASSES.richObjBtn, prevItem);
			isChecked = checkerDom.hasClass(CLASSES.selected);

			if ( isChecked ) { // Turn Off RichObject if it's checked
				setTimeout( function() {
						checkerDom.trigger({type:"click", skipList: _carryList})
						.parent().removeClass(CLASSES.selected);
						}, 1000);
				HyperCities.narrativePanel.unHighlightItem(prevItemId);
			}
			//HyperCities.mainMap.closeHCInfoWindow();
		} else if ( prevItem.length > 1 ) {
			HyperCities.util.debug("Error, more than one selected item.");
		}
	}

    // Add panel metadata
    _panelSet.push({collectionId: $collectionId, parentId: $parentId});
    _currentPanel = _panelSet.length;
    _currentPos[_currentPanel] = 0;
    //_contentExtensions[_currentPanel] = new HyperCities.ContentExtension();
    //_contentExtensions[_currentPanel].setDom(panelDom);

    // Store original timespan for rolling back
    if (HyperCities.control.timeSlider.getTime()) {
        // This check is done because on some browsers (e.g. Chrome),
        // Flash objects load so slowly that this call errors out and
        // prevents a collection accessed via permalink from loading.
        // BUG: Disabling it seems to have no side effects, but this
        // is a good place to start checking for bugs.
        _timespanStack.push(HyperCities.control.timeSlider.getTime());
    }
    

    // Show narrative if it's hidden
    if ( _panelWrapper.is(":hidden") ) {
      _panelWrapper.fadeIn();
    }

        // Swap the Panel, if it's not first panel
    if ( _currentPanel > 1 ) {
      $("." + CLASSES.panel, _panelWrapper).animate(
        {"left": "-=" + panelWidth + "px"}, "slow");
    }

    };

  /**
   * Setup the narrativePanel DOM variables and CSS style
   */
  var _init = function () {

    // calculate default panel width
    var urlWidthMatches = window.location.hash.match(/width=([\d]*)/),
      panelWidth = urlWidthMatches ?
        parseInt(urlWidthMatches[1]) : parseInt($(window).width()/3.0),
      sidebarDiv = $("#" + IDS.sidebarWrapper);

    // Initial private variables
    _mapBounds      = HyperCities.mainMap.getBounds();
    _mapZoom        = HyperCities.mainMap.getZoom();
    _timespanStack  = [];
    _checked        = [];
    _carryList      = [];
    _panelSet       = [];
    _currentPanel   = 0;
    _currentPos     = [];
    _progressCount  = 0;
    _sidebarWidth   = sidebarDiv.width();

    // Setup session Mode Variable
    _originalMode = HyperCities.session.get("mode");
    HyperCities.session.set("mode", _currentMode);

    // Get Dom Elements
    _panelWrapper = $("#" + IDS.panelWrapper, sidebarDiv);

    // Apply default width to narrativePanel
    _panelWrapper.width(panelWidth);

    // Change sidebar width
    sidebarDiv.width(panelWidth);

    // Change sidebar color scheme
    HyperCities.util.setSidebarStyle(_currentMode);

    _initialized = true;

    HyperCities.adjustLayout({sync: false});
  };

  /**
   * Hide the narrativePanel DOM and reset private variables
   */
  var _reset = function () {

    var sidebarDiv = $("#" + IDS.sidebarWrapper);

    // Note: don't reset _checked here, 
    //       we need to use _checked array to remove marker overlay
    //       _checked will be reset when next time narrative panel is initialized

    // Clean up variables
    _mapBounds     = null;
    _mapZoom       = null;
    _zoomToExtent  = false;
    _isListView    = false;
    _isDateView    = true;
    _timespanStack = [];
    _panelSet      = [];
    _currentPanel  = 0;
    //_contentExtensions = [];
    _parentId      = null;
    _progressCount = 0;

    // Enable auto map refresh
    HyperCities.earth.enableSync(true);

    // Clean up narrativePanel and Hide Panel
    _panelWrapper
      .fadeOut()
      .empty()
      .width(_sidebarWidth);

    // Restore sidebar width
    sidebarDiv.width(_sidebarWidth);

    // Restore sidebar color scheme
    HyperCities.util.setSidebarStyle(_originalMode);

    // Restore Session Mode Variable
    HyperCities.session.set("mode", _originalMode);

    // Update CollectionList
    if ( _originalMode === HyperCities.config.MODE_COLLECTION_LIST ) {
      setTimeout(function() {
        HyperCities.collectionList.update(HyperCities.mainMap.getBounds(),
          HyperCities.mainMap.getZoom(), true);
      }, 1000);
    }

    _initialized = false;

    HyperCities.adjustLayout({sync: false});
  };

  /**
   * Event Delegation Handler to process all click event on narrative panel
   * @param {Event} $event
   * @return {boolean} Always returns false to prevent event propagation
   */
  var _panelClickHandler = function ($event) {
    /**
     * Use ContentExtension to handle custom events.
     */
    //if (_contentExtensions[_currentPanel].handle ($event)) {
    //  return false;
    //}

    var target = $($event.target),
      index  = 0;

    if ( target.hasClass(CLASSES.collectionLink) ) {
      _expandCollection($event);
      return false;
    } else if ( target.hasClass(CLASSES.blankLink) ) {

      // disable trigger to avoid recursive call, use return true to trigger default event
      /*
      // Trigger the default click event for hyperlink
      target.trigger('click');
      */

      // return true to propagate default event
      return true;
    }
    else if ( target.hasClass(CLASSES.closeBtn) ) { // user click on Close Button
      _closeBtnClickHandler($event);
    }
    else if ( target.hasClass(CLASSES.centerBtn) ) { // user click on Center Item Button
      index = $("." + CLASSES.centerBtn, $("#panelList_" + _currentPanel)).index(target) + 2;
      _flyto(index);
    }
    else if ( target.hasClass(CLASSES.expandBtn) ) { // user click on Expand Collection Button
      _expandCollection($event);
    }
    else if ( target.hasClass(CLASSES.backBtn) ) { // user click on Back Prev Collection Button
      _closeNarrative($event);
    }
    else if ( target.hasClass(CLASSES.deleteBtn) || target.hasClass(CLASSES.deleteCollectionBtn) ) { // user click on Delete Item Button
      _deleteBtnClickHandler($event);
    }
    else if (target.hasClass(CLASSES.editBtn)) { // user click on edit item button
      _editBtnClickHandler($event);
    }
    else if ( target.hasClass(CLASSES.permaLinkUrl) ) { // user click on permaLinkUrl Box
      target.select();
    }
    else if ( target.hasClass(CLASSES.prevLink) ) { // user click on prev Link
      // if event is fired from toolbar, use current position as index
      if (target.parent().hasClass(CLASSES.toolbar)) {
        index = _currentPos[_currentPanel];
      } else {
        // otherwise use the position of the clicked item as index
        index = $("." + CLASSES.prevLink, $("#panelList_" + _currentPanel)).index(target) + 1;
      }

      _flyto(index - 1);
    }
    else if ( target.hasClass(CLASSES.nextLink) ) { // user click on next Link
      // if event is fired from toolbar, use current position as index
      if (target.parent().hasClass(CLASSES.toolbar)) {
        index = _currentPos[_currentPanel];
      } else {
        // otherwise use the position of the clicked item as index
        index = $("." + CLASSES.nextLink, $("#panelList_" + _currentPanel)).index(target) + 1;
      }

      _flyto(index + 1);
    }
    else if ( target.hasClass(CLASSES.optionLink) ) { // user click on option Link
      _openOptionToolPanel($event);
    }
    else if ( target.hasClass(CLASSES.permaLink) ) { // user click on permaLink Link
      _openLinkToolPanel($event);
    }
    else if ( target.parent().hasClass(CLASSES.toolPanelContent) ) { // user click on options choice link
      _optionsClickHandler($event);
    }
    else if ( target.hasClass(CLASSES.editCollectionBtn) ) {
      _updateCollection($event);
    }
    else if ( target.hasClass(CLASSES.showExpandedBtn) && _isListView == true ) {
      _showExpandedView($event)
    }
    else if ( target.hasClass(CLASSES.showListBtn) && _isListView == false ) {
      _showListView($event);
    }
    else if ( target.hasClass(CLASSES.overlayBtn) ) {
      _toggleKmlOverlay($event);
    }
    else if ( target.hasClass(CLASSES.richObjBtn) ) {
      _toggleRichObject($event);
    }
    else if ($("." + CLASSES.panelList).has(target).length !== 0) {
      // Select items on narrative panel and check target on which panel item
      var panelItemList = $("." + CLASSES.panelItem, $("#panelList_" + _currentPanel));
      // Click on panel item directly
      index = panelItemList.index(target) + 1;
      if (index === 0) {
        // Check if user click on children of panel item
        index = panelItemList.index(panelItemList.has(target)) + 1;
      }
      _flyto(index);
    }
    else {
      HyperCities.util.debug(_id + "[A2] Click Narrative Panel");
      HyperCities.util.debug(target);
    }

    return false;
  };

  /**
   * Fly to object of given $index in NarrativePanel
   * @param {Integer} target index of object, start from one
   */
  var _flyto = function ($index) {

    _currentPos[_currentPanel] = $index;

    var currentPos    = _currentPos[_currentPanel],
      panelListDom  = $("#panelList_" + _currentPanel),
      totalItems    = $("." + CLASSES.panelItem, panelListDom).length,
      prevItem      = null,
      currentItem   = null,
      prevItemId    = null,
      currentItemId = null,
      checkerDom    = null,
      isChecked     = false;

    if (currentPos < 1) { // We already at first item
      _currentPos[_currentPanel] = 1;
      alert("Already at the first item.");
      return false;
    }
    if (currentPos > totalItems) { // We already at last item
      _currentPos[_currentPanel] = totalItems;
      alert("Already at the last item.");
      return false;
    }

    currentItem = $("." + CLASSES.panelItem + ":nth-child("+currentPos+")", panelListDom);
    currentItemId = parseInt(currentItem.data("id"));

    // Get previously selected Dom first, but postpone the remove action 
    // after add the new items, and remove the unnecessary ones.
    prevItem = $("." + CLASSES.panelItem + "." + CLASSES.selected, panelListDom);

    // Turn on the current item overlay
    checkerDom = $("." + CLASSES.overlayBtn, currentItem);
//    checkerDom.trigger("click")
//        .parent().addClass(CLASSES.selected);
    isChecked = checkerDom.hasClass(CLASSES.selected);

    if ( isChecked ) { // Already turned on, center to it (and change zoom)
      //HyperCities.HCObject.panTo(currentItemId);
      HyperCities.HCObject.zoomTo(currentItemId);
    } else { // Add overlay and center to it
      checkerDom.trigger("click")
        .parent().addClass(CLASSES.selected);
      HyperCities.HCObject.show(currentItemId);
      if ( $.inArray(currentItemId, _checked) < 0 ) {
        _checked.push(currentItemId);
      }
    }
    HyperCities.narrativePanel.highlightItem(currentItemId);

    // Turn on Rich Object
    checkerDom = $("." + CLASSES.richObjBtn, currentItem);
    isChecked = checkerDom.hasClass(CLASSES.selected);
    if ( isChecked ) { // Already turned on, center to it (and change zoom)
      //HyperCities.HCObject.panTo(currentItemId);
      HyperCities.HCObject.zoomTo(currentItemId);
    } else {
      checkerDom.trigger("click")
        .parent().addClass(CLASSES.selected);

      // Scroll the panel to current item
      if (panelListDom[0].scrollTo) {
        panelListDom[0].scrollTo("#" + currentItem.attr("id"));
      }
    }

    // We should have at most one item selected at the same time, 
    // otherwise it's an error
    if ( prevItem.length === 1 ) {
      prevItemId = parseInt(prevItem.data("id"));

      checkerDom = $("." + CLASSES.overlayBtn, prevItem);
	  checkerDom.parent().removeClass("hover");
      isChecked = checkerDom.hasClass(CLASSES.selected);

      if ( isChecked ) { // Remove Overlay if it's checked
        checkerDom.trigger("click")
          .parent().removeClass(CLASSES.selected);
		 HyperCities.debug("Remove Overlay of " + prevItemId);
      }

      checkerDom = $("." + CLASSES.richObjBtn, prevItem);
	  checkerDom.parent().removeClass("hover");
      isChecked = checkerDom.hasClass(CLASSES.selected);

      if ( isChecked ) { // Turn Off RichObject if it's checked
        setTimeout( function() {
		  _carryList = [];
          checkerDom.trigger({type:"click", skipList: _carryList})
            .parent().removeClass(CLASSES.selected);
			HyperCities.debug("Remove RichObject " + prevItemId);
        }, 1000);
        HyperCities.narrativePanel.unHighlightItem(prevItemId);
      }

      //HyperCities.mainMap.closeHCInfoWindow();

    } else if ( prevItem.length > 1 ) {
      HyperCities.util.debug("Error, more than one selected item.");
    }
    HyperCities.HCObject.zoomTo(currentItemId);

    return false;
  };

  /**
   * Event listener for the "list" button.
   * @param {Event} $event
   */
  var _showListView = function ($event) {

    _isListView = true;
    items = $("#narrativePanelWrapper ."+CLASSES.panelItem);
    items.addClass(CLASSES.listView)
      .find("."+CLASSES.metadata).hide().end()
      .find("."+CLASSES.content).hide().end()
      .find("."+CLASSES.bookmarks).hide().end()
      .find("."+CLASSES.gripBtn).show().end()
      .find("."+CLASSES.editBtn).show().end()
      .find("."+CLASSES.deleteBtn).show();

	var itemOrder = 1;
	$.each(items, function () {
		var itemDom = $(this);
		itemDom.data("order", itemOrder);
		itemOrder++;
	});

    $("#narrativePanelWrapper ." + CLASSES.panelList).jScrollPane().sortable('enable');
  };

  /**
   * Event listener for the "expanded view" button.
   * 
   * @param {Event} $event
   */
  var _showExpandedView = function ($event) {
    HyperCities.util.debug("Expanede View");

    _isListView = false;
    items = $("#narrativePanelWrapper ."+CLASSES.panelItem);
    items.removeClass(CLASSES.listView)
      .find("."+CLASSES.metadata).show().end()
      .find("."+CLASSES.content).show().end()
      .find("."+CLASSES.bookmarks).show().end()
      .find("."+CLASSES.gripBtn).hide().end()
      .find("."+CLASSES.editBtn).hide().end()
      .find("."+CLASSES.deleteBtn).hide();

    $("#narrativePanelWrapper ." + CLASSES.panelList).jScrollPane().sortable('disable');
  };

    /**
   * Event listener for the "close" button.
   * 
   * @param {Event} $event
   */
  var _closeBtnClickHandler = function ($event) {

        var target = $($event.target);

        if ( target.parent().hasClass(CLASSES.toolPanel) ) { // It's toolPanel's Close Button
            _closeToolPanel($event);
        }
        else { // Otherwise, it's Main Panel's Close Button
            if ( confirm ("Do you want to close the collection and enter the "
             + "general Hypercities environment?\n\nIf so, you can "
             + "click the back button to return to the current "
             + "collection.")
           ) {
                _closeAllNarrative($event);
      }
        }

        

        return false;
    };

  /**
   * Event listener for the "edit" button.
   * @param {Event} $event
   */
  var _editBtnClickHandler = function ($event) {
  
    var target     = $($event.target),
      panelId    = _panelSet.length,
      itemId     = target.parent().data("id"),
      parentDom  = $("#panelInfo_" + panelId),
      parentId   = parseInt(parentDom.data("collectionId")),
      params     = {fmt: "mhc", cid: itemId, pid: parentId};;

    $.get("./queryCollectionData.php", params,
      function ($data) {
        // Open objectEdit Panel
        HyperCities.objectEditPanel.load(itemId, {
            "objectType": $data.objectType,
            "markerType": $data.markerStyle,
            "parentId"  : parentId,
            "objectData": $data
          }
        );
      },
      "json"
    );
  };

    /**
   * Event listener for the "delete" button.
   * @param {Event} $event
   */
  var _deleteBtnClickHandler = function ($event) {

        var target   = $($event.target),
      panelId      = _panelSet.length,
      hasPermision = (HyperCities.user.isLogin() === true),
      isDeleteLink = target.hasClass(CLASSES.deleteCollectionBtn),
      isCollection = target.prev().hasClass(CLASSES.expandBtn),
      itemId       = target.parent().data("id"),
      itemTitle    = target.next().next().text(),
      parentDom    = $("#panelInfo_" + panelId),
      parentId     = parentDom.data("collectionId"),
      response     = false;

        if ( !hasPermision ) {
            return false;
        }

        if ( isDeleteLink || isCollection ) {
            if ( isDeleteLink ) { // Get Collection Info
                itemTitle = parentDom.find(" ." + CLASSES.title).text();
                itemId    = parentDom.data("collectionId");
                parentId  = parentDom.data("parentId");
            }

            //      HyperCities.util.debug(_id + "[A2] Delete Collection " + itemId + " in collection " + parentId);
            response = window.confirm("Are you sure you want to delete collection "
                    + itemTitle + "?");
            if ( !response ) {
                return false;
            }

            // Call Delete Collection Function
            var params = {
                objectId: itemId,
                parentId: parentId
            };
            $.post("./deleteCollection.php", params,
        function ($response) {
          var success = $($response).find("Success > Message").text();
          var error   = $($response).find("Error > Message").text();

          if ( error.length > 0 ) {
            alert(error);
          }
          else {
            // Fade out deleted item
            $("#narrativePanelWrapper ." + CLASSES.panelItem + itemId).fadeOut();
            if ( isDeleteLink ) {
              _closeNarrative();
            }
          }
        },
        "xml"
      );
        }
        else {
            //      HyperCities.util.debug(_id + "[A2] Delete Item " + itemId + " in collection " + parentId);
            response = window.confirm("Are you sure you want to delete item "
                    + itemTitle + "?");
            if ( !response ) {
                return false;
            }

            // Call Delete Object Function
            var params = {
                objectId: itemId,
                parentId: parentId
            };
            $.post("./deleteObject.php", params, function ($response){
                var success = $($response).find("Success > Message").text();
                var error   = $($response).find("Error > Message").text();

                if ( error.length > 0 ) {
                    alert(error);
                }
                else {
                    // Fade out deleted item
                    // alert(success);
                    $("#narrativePanelWrapper ." + CLASSES.panelItem + itemId).fadeOut();
                }

            }, "xml");
        }

        return false;
    };

  /**
   * Event handler for options button.
   */
    var _optionsClickHandler = function ($event) {

        var target = $($event.target),
      syncMap = HyperCities.session.get("syncMap"),
      items;

        if ( target.hasClass(CLASSES.syncMapOn) && syncMap === false ) {
            HyperCities.util.debug("SyncMap On");

            HyperCities.session.set("syncMap", true)
            $("#narrativePanelWrapper ."+CLASSES.syncMapOn)
        .removeClass(CLASSES.link)
        .addClass(CLASSES.selected);
            $("#narrativePanelWrapper ."+CLASSES.syncMapOff)
        .removeClass(CLASSES.selected)
        .addClass(CLASSES.link);
        }
        else if ( target.hasClass(CLASSES.syncMapOff) && syncMap === true ) {
            HyperCities.util.debug("SyncMap Off");

            HyperCities.session.set("syncMap", false)
            $("#narrativePanelWrapper ."+CLASSES.syncMapOff)
        .removeClass(CLASSES.link)
        .addClass(CLASSES.selected);
            $("#narrativePanelWrapper ."+CLASSES.syncMapOn)
        .removeClass(CLASSES.selected)
        .addClass(CLASSES.link);
        }
        else if ( target.hasClass(CLASSES.showDate) && _isDateView == false ) {
            HyperCities.util.debug("Show Date");

            // Change Link Style
            _isDateView = true;
            $("#narrativePanelWrapper ."+CLASSES.showDate)
        .removeClass(CLASSES.link).addClass(CLASSES.selected);
            $("#narrativePanelWrapper ."+CLASSES.showDatetime)
        .removeClass(CLASSES.selected).addClass(CLASSES.link);
            $("#narrativePanelWrapper ."+CLASSES.extDate).hide();
        }
        else if ( target.hasClass(CLASSES.showDatetime) && _isDateView == true ) {
            HyperCities.util.debug("Show Date Time");

            _isDateView = false;
            $("#narrativePanelWrapper ."+CLASSES.showDatetime)
        .removeClass(CLASSES.link).addClass(CLASSES.selected);
            $("#narrativePanelWrapper ."+CLASSES.showDate)
        .removeClass(CLASSES.selected).addClass(CLASSES.link);
            $("#narrativePanelWrapper ."+CLASSES.extDate).show();
        }
        else if ( target.hasClass(CLASSES.autoZoomOn) && _zoomToExtent == false ) {
            HyperCities.util.debug("Auto ZoomIn On");

            _zoomToExtent = true;
            $("#narrativePanelWrapper ."+CLASSES.autoZoomOn)
        .removeClass(CLASSES.link).addClass(CLASSES.selected);
            $("#narrativePanelWrapper ."+CLASSES.autoZoomOff)
        .removeClass(CLASSES.selected).addClass(CLASSES.link);
        }
        else if ( target.hasClass(CLASSES.autoZoomOff) && _zoomToExtent == true ) {
            HyperCities.util.debug("Auto ZoomIn Off");

            _zoomToExtent = false;
            $("#narrativePanelWrapper ."+CLASSES.autoZoomOff)
        .removeClass(CLASSES.link).addClass(CLASSES.selected);
            $("#narrativePanelWrapper ."+CLASSES.autoZoomOn)
        .removeClass(CLASSES.selected).addClass(CLASSES.link);
        }
    else if ( target.hasClass(CLASSES.showBuildingOn) ) {
            $("#narrativePanelWrapper ."+CLASSES.showBuildingOn)
        .removeClass(CLASSES.link).addClass(CLASSES.selected);
            $("#narrativePanelWrapper ."+CLASSES.showBuildingOff)
        .removeClass(CLASSES.selected).addClass(CLASSES.link);

      HyperCities.earth.showBuilding(true);
        }
    else if ( target.hasClass(CLASSES.showBuildingOff) ) {
            $("#narrativePanelWrapper ."+CLASSES.showBuildingOff)
        .removeClass(CLASSES.link).addClass(CLASSES.selected);
            $("#narrativePanelWrapper ."+CLASSES.showBuildingOn)
        .removeClass(CLASSES.selected).addClass(CLASSES.link);

      HyperCities.earth.showBuilding(false);
        }
    };
  
  /**
   * Close narrative event handler.
   */
  var _closeAllNarrative = function ($event) {

    var timeStack = _timespanStack[_timespanStack.length-1],
      children  = [],
      richObjs  = [],
      totalChildren = 0;

//    HyperCities.util.debug(_id + "[A2] Close All Narrative Panel ");

    // Turn off all checked Rich Object
    richObjs = $("." + CLASSES.richObjBtn + "." + CLASSES.selected, _panelWrapper);
    richObjs.trigger("click");

    // Remove All marker Created in Narrative View
        children = $.map($("#narrativePanelWrapper" + " ." + CLASSES.panelItem), function ($node){
            return $($node).data("id");
        });
        totalChildren = children.length;

        // remove each child by yielding processes
        if ( totalChildren > 0 ) {
            setTimeout(function () {
                var childId = children.shift();

                _removeMarker(childId);

                if ( children.length > 0 ) {
                    setTimeout(arguments.callee, 10);
                }
            }, 10);
        }

        // Remove base map, if there is one
    HyperCities.session.set("baseMap", null);

    _reset();

    // remove/reset all elements from the view
    HyperCities.collectionList.uncheckAllItems();
    HyperCities.collectionList.collapseAllFolders();
    HyperCities.mapList.clearMaps();
        HyperCities.linkController.clearURL();

        // Switch to privious Timespan
        if ( typeof(timeStack) !== 'undefined' ) {
            HyperCities.control.timeSlider.setTime(timeStack.currentTimestamp, timeStack.startTimestamp, timeStack.endTimestamp, timeStack.activeTimestamp, true);
    }
  };

    

    /**
   * Left-arrow click handler (closes one narrative panel).
   */
  var _closeNarrative = function ($event) {

    var panelId    = _currentPanel,
		panelListDom = $("#panelList_" + _currentPanel),
		panelWidth = _panelWrapper.width(),
		prevItem     = null,
		prevItemId   = null,
		checkerDom   = null,
		isChecked    = false,
	    timeStack  = _timespanStack.pop(),
		children   = [],
	    totalChildren = 0;

    HyperCities.mainMap.resetMaxZoom();

    HyperCities.util.debug(_id + "[A2] Close Narrative Panel " + panelId);

    // Remove All marker Created in this panel
    children = $.map($("#panel_" + panelId + " ." + CLASSES.panelItem), 
      function ($node) {
        return $($node).data("id");
      }
    );
    totalChildren = children.length;

    // remove each child by yielding processes
    if ( totalChildren > 0 ) {
      setTimeout(function () {
        var childId = children.shift();

        _removeMarker(childId);

        if ( children.length > 0 ) {
          setTimeout(arguments.callee, 10);
        }
      }, 10);
    }

    // remove base map, if there is one
    HyperCities.mapList.clearMaps();
    /*
    var baseMap = $("#panelInfo_" + panelId).data("baseMap");
    if (baseMap != null && baseMap != ''
      && $("#panelInfo_" + panelId - 1).data("baseMap") != baseMap
      && $("#panelInfo_" + panelId - 2).data("baseMap") != baseMap) {
        HyperCities.mapList.removeMap(baseMap);
      }
    HyperCities.session.set("baseMap", null);
    */

    if ( panelId == 1 ) { // only one panel left, close narrative view
      _reset();
    }
    else {                // otherwise, roll back to previous panel

      // Close All tool panel
      _closeToolPanel();

	  // Uncheck the current checked Item
	  prevItem = $("." + CLASSES.panelItem + "." + CLASSES.selected, panelListDom);
	  if ( prevItem.length === 1 ) {
		  prevItemId = parseInt(prevItem.data("id"));

		  checkerDom = $("." + CLASSES.overlayBtn, prevItem);
		  isChecked = checkerDom.hasClass(CLASSES.selected);

		  if ( isChecked ) { // Remove Overlay if it's checked
			  checkerDom.trigger("click")
				  .parent().removeClass(CLASSES.selected);
		  }

		  checkerDom = $("." + CLASSES.richObjBtn, prevItem);
		  isChecked = checkerDom.hasClass(CLASSES.selected);

		  if ( isChecked ) { // Turn Off RichObject if it's checked
			  setTimeout( function() {
					  checkerDom.trigger({type:"click", skipList: _carryList})
					  .parent().removeClass(CLASSES.selected);
					  }, 1000);
			  HyperCities.narrativePanel.unHighlightItem(prevItemId);
		  }
		  //HyperCities.mainMap.closeHCInfoWindow();
	  } else if ( prevItem.length > 1 ) {
		  HyperCities.util.debug("Error, more than one selected item.");
	  }


      // Swap the Panel
      $("#narrativePanelWrapper ." + CLASSES.panel)
        .animate({"left": "+=" + panelWidth + "px"}, "slow", "linear",
          function () {
            $("#panel_" + panelId).remove();
          }
        );

      // Zoom to previous collection extent if _zoomToExtent is true
      if ( _zoomToExtent ) {
        //HyperCities.HCObject.zoomTo($("#panelInfo_" + (panelId - 1))
        //  .data("collectionId"));
      }

      _panelSet.pop();
      _parentId = $("#panelInfo_" + (panelId - 1)).data("parentId");
      _currentPanel--;
      if (typeof _panelSet[_currentPanel - 1]["maxZoom"] != "undefined") {
        HyperCities.mainMap.setMaxZoom(_panelSet[_currentPanel - 1].maxZoom);
      }

      // Update permalink URL
      HyperCities.linkController.updateURL("collections", 
        $("#panelInfo_" + (panelId - 1)).data("collectionId")
      );
    }

        // Switch to privious Timespan
        if ( typeof(timeStack) !== 'undefined' ) {
            HyperCities.control.timeSlider.setTime(timeStack.currentTimestamp,
        timeStack.startTimestamp, timeStack.endTimestamp,
        timeStack.activeTimestamp, true
      );
        }
    };

  /**
   * Toggle display of KML overlays.
   */
  var _toggleKmlOverlay = function ($event) {
  
    var targetDom = $($event.target),
      itemDom   = targetDom.parent(),
      isChecked = targetDom.hasClass(CLASSES.selected),
      itemId    = parseInt(itemDom.data("id"));

    targetDom.blur();

	targetDom.removeClass("hover");
    if ( isChecked ) {
      targetDom.removeClass(CLASSES.selected);
      _removeMarker(itemId);
    }
    else {
      targetDom.addClass(CLASSES.selected);
      HyperCities.HCObject.show(itemId);
      if ( $.inArray(itemId, _checked) < 0 ) {
        _checked.push(itemId);
      }
    }

    return false;
  };

  /**
   * Load the RichObject
   * 1.Add to HCObject if it's not existed yet
   * 2.Switch to it's mapType
   * 3.Apply it's view (center, tile, zoomLevel)
   * 4.Higilight marker and turn on info bubble.
   */
  var _loadRichObject = function ($data) {

    // Handle the WebService JSON Error case.
    if ( $.isArray($data) ) {
      $data = $data[0];
    }

    var itemId     = parseInt($data.id),
      //bubbleId   = parseInt($data.bubble.id),
      isMaximize = false;

    //HyperCities.mainMap.setMapType($data.mapType);
    HyperCities.mainMap.clearDynamicMaps();
    _carryList = HyperCities.HCObject.parseRichObject(itemId, $data);
		HyperCities.HCObject.zoomTo(itemId);
		// do it again after a short delay to make sure view changed correctly
		// some cases the view will not be changed correctly, for example, the inscription project
		if (itemId == 79063) {
			setTimeout(function() {
				HyperCities.HCObject.zoomTo(itemId);
			}, 5000);
		}
    HyperCities.narrativePanel.highlightItem(itemId);

		/*
			 // to be removed
    if (!isNaN(bubbleId)) {
      if ( $data.bubble.state === "max" ) {
        isMaximize = true;
      }
      HyperCities.HCObject.panTo(bubbleId);
      HyperCities.HCObject.showInfoWindow(bubbleId,
        {maximize: isMaximize}
      );
    } else {
      //if (HyperCities.mainMap.getCurrentMapType() === G_SATELLITE_3D_MAP) {
        HyperCities.HCObject.zoomTo(itemId);
      // } else {
      //  HyperCities.HCObject.panTo(itemId);
      // }
    }
		*/
  };

  /**
   * Toggle display of Rich Object
   */
  var _toggleRichObject = function ($event) {

    var targetDom    = $($event.target),
      itemDom      = targetDom.parent(),
      isChecked    = targetDom.hasClass(CLASSES.selected),
      itemId       = parseInt(itemDom.data("id")),
      skipIdList   = $event.skipList || [];

    targetDom.blur();

//    HyperCities.util.debug(_id + "[A2] Skip list of Collection " + itemId);
//    HyperCities.util.debug(skipIdList);

    if ( isChecked ) {
      targetDom.removeClass(CLASSES.selected);
      targetDom.removeClass("hover");
      _removeMarker(itemId);

      HyperCities.HCObject.hideRichObject(itemId, skipIdList);
      /*
      // no need to use ajax here, maps and objs have already been saved HCObject
      $.get("./provider/objects/"+itemId,
        function ($data) {
          // Handle the WebService JSON Error case.
          if ( $.isArray($data) ) {
            $data = $data[0];
          }
          if ( typeof(skipIdList) === 'undefined' ) {
            skipIdList = [];
          }
          HyperCities.HCObject.hideRichObject(itemId, $data, skipIdList);
        },
        "json"
      );
      */
    }
    else {
      targetDom.addClass(CLASSES.selected);

      if ( $.inArray(itemId, _checked) < 0 ) {
        _checked.push(itemId);
      }

      setTimeout(
        function () { // Turn On Rich Object
          $.get("./provider/objects/"+itemId, _loadRichObject, "json");
        },
        1000
      );
    }

    return false;
  };

  /**
   * Collection update panel event handler.
   */
  var _updateCollection = function ($event) {

    var panelId    = _panelSet.length,
      itemDom    = $("#panelInfo_" + panelId),
      itemId     = parseInt(itemDom.data("collectionId")),
      parentId   = itemDom.data("parentId"),
      params     = {fmt: "mhc", cid: itemId, pid: parentId};;

    $.get("./queryCollectionData.php", params,
      function ($data) {
        // Open objectEdit Panel
        HyperCities.objectEditPanel.load(itemId, {
            "objectType": $data.objectType,
            "markerType": $data.markerStyle,
            "parentId"  : parentId,
            "objectData": $data
          }
        );
      },
      "json"
    );
  };

  /**
   * Open a collection in the current narrative into its own panel.
   */
  var _expandCollection = function ($event) {

    var itemDom      = $($event.target).parent(),
      collectionId = parseInt(itemDom.data("id")),
      parentId = $("#panelInfo_" + _currentPanel).data("collectionId"),
      params       = {func : "narrativePanel.getNarrative"};

    HyperCities.mainMap.resetMaxZoom();

    if (!collectionId) {
      // assume this is a collection link
      collectionId = parseInt($($event.target).parent().attr('href').split('/')[1]);
    }

    $($event.target).blur();

    //HyperCities.util.debug(_id + "[A2] Expand to Collection " + itemId);

    // Append panel
    _appendPanel(collectionId, parentId);

    // Prepare query parameters
    params.cid = collectionId;
    params.pid = parentId;

    _parentId = parentId;

    //$.post("./getNarrative.php", params, _updatePanel, "xml");
    $.get("./provider/collections/" + collectionId, _updatePanel, "json");
  };

  /**
   * Format time strings for display.
   *
   * @param {String} $begin Begin time
   * @param {String} $end End time
   * @param {String} $when
   */
  var _formatTime = function ($begin, $end, $when) {

        var timeStr = "",
        timeArray = [],
        timeStyle = 'style="display: inline;"';

        if ( _isDateView ) {
            timeStyle = "";
        }

        if ( $when.length > 0 ) {
            if ( $when[0] == '-' ) {
                timeStr = "BCE ";
                $when = $when.substr(1, 19);
            }
            timeArray = [ $when.substr(0, 10),
            '<span class="', CLASSES.extDate, '" ', timeStyle, '>', $when.substr(11,8), '</span>'];

            return timeStr + timeArray.join('');
        }

        if ( $begin.length > 0 ) {
            if ( $begin[0] == '-' ) { // BCE Date
                timeStr = "BCE ";
                $begin = $begin.substr(1, 19);
            }
            timeArray = [ $begin.substr(0, 10),
            '<span class="', CLASSES.extDate, '" ', timeStyle, '>', $begin.substr(11,8), '</span>'];

      if ( $end.length <= 0 ) {  // End Date is unbounded
        timeArray.unshift("Existed since ");
      } 
      else {
        timeArray.push(" - ");
      }

            timeStr += timeArray.join('');
        }

        if ( $end.length > 0 ) {
            if ( $end[0] == '-' ) { // BCE Date
                timeStr += "BCE ";
                $end = $end.substr(1, 19);
            }
            timeArray = [ $end.substr(0, 10),
            '<span class="', CLASSES.extDate, '" ', timeStyle, '>', $end.substr(11,8), '</span>'];

      if ( $begin.length <= 0 ) { // Begin Date is unbounded
        timeArray.unshift("Existed until ");
      }
            timeStr += timeArray.join('');
        }

    if ( timeStr.length <= 0 ) { // No Time Specified
      timeStr = "Time: Not Specified";
    }

        return timeStr;
    };

    /**
   * Remove marker from map.
   * 
   * @param {Integer} $itemId Object id.
   */
  var _removeMarker = function ($itemId) {

    var itemId = parseInt($itemId),
      checkerIndex = $.inArray(itemId, _checked);

    if ( checkerIndex >= 0 ) {  // This item is checked in narrativePanel
      _checked.splice(checkerIndex, 1);
      //HyperCities.HCObject.hide(itemId);
        }

    // Hide object whether it is checked or not to make sure it will be removed
    HyperCities.HCObject.hide(itemId);
    };

  /**
   * Append narrative item to the current narrative panel.
   * 
   * @param {xml/json} $itemXml Data about the object
   * @param {Array} $openedList Opened items
   * @param {Array} $checkedList Checked items
   * @param {boolean} $isCollectionOwner Whether the user owns the collection.
   */
  var _appendNarrativeItem = function ($item, $openedList, $checkedList, $isCollectionOwner) {

    var panelListDom  = $("#panelList_" + _currentPanel),
      isNetworkLink = false, //( $itemXml.nodeName === "NetworkLink" ),
      isPlacemark   = true, //( $itemXml.nodeName === "Placemark" ),
      itemType      = $item.objectType,
      itemDom       = null,
      itemAttr      = {},
      itemJson      = $item,
      itemId        = $item.id,
      itemName      = $item.name,
      itemUrl       = decodeURI($item.linkUrl),
      creator       = $item.creator,
      description   = $item.description,
      timeStamp,//     = $("> TimeStamp", itemXml),
      timeSpan,//      = $("> TimeSpan", itemXml),
      timeBegin     = $item.mapping.dateFrom.date,
      timeEnd       = $item.mapping.dateTo.date,
      timeWhen = "",
      markerTypeId  = $item.markerTypeId,
      markerStateId = parseInt($item.state),
      isExternal    = false,
      itemOrderId   = 0,
      itemOrder     = 0,
      ownerId       = $item.owner,
      stateId       = $item.state,
      isEarthObject = true,
      zoomLevel     = parseInt($item.mapping.zoom),
      viewFormat = [
        'BBox=[', $item.mapping.swLon,
        '],[', $item.mapping.swLat,
        '],[', $item.mapping.neLon,
        '],[', $item.mapping.neLat,
        ']'],
      bBox = HyperCities.util.parseBoundingBox(viewFormat.join('')),
      maps          = $item.maps,
      objs          = $item.objects,
      bookmarks     = $item.bookmarks,
      view          = $item.mapping.view,
      isChecked     = ($.inArray(itemId, $checkedList) >= 0),
      isOpened      = ($.inArray(itemId, $openedList) >= 0),

      isEditable    = false,
      isDeletable   = false,
      itemStyle     = 'style="display: block;"',
      dateFrom      = null,
      dateTo        = null,
      domHtml       = [],
      totalItems    = 0;

	// TODO:: Fix bug in HyperCities.user.hasUpdatePrivilege
	isEditable = ($isCollectionOwner 
			|| HyperCities.user.hasUpdatePrivilege
			(itemId, ownerId, stateId));
	isDeletable = ($isCollectionOwner 
			|| HyperCities.user.hasDeletePrivilege
			(itemId, ownerId, stateId));

	if (HyperCities.user.getUserId() == 13) {
		isEditable = true;
		isDeletable = true;
	}
    // TODO:: Check "citationlist" is passed in web service
    //_contentExtensions[_currentPanel].extractCitations(itemId, itemXml.find("citationlist"));

    if ( _isListView ) {
      itemStyle = '';
    }

    // Convert 2D marker type to 3D
	if (isNaN(markerTypeId)) {
	  isNetworkLink = true;
	  isPlacemark = false;
	} else if (markerTypeId < 4) {
      markerTypeId = markerTypeId + 3;
    }

    dateFrom = HyperCities.util.parseDateTime(timeBegin);
    dateTo   = HyperCities.util.parseDateTime(timeEnd);

    // Set Collection Metadata
    domHtml = [ '<div class="', CLASSES.panelItem, ' ', CLASSES.panelItem,
          itemId, '" id="', CLASSES.panelItem, "_", _currentPanel,
          "_", itemId, '">', '<div class="', CLASSES.centerBtn,
          '" title="Center to ', itemName ,'"></div>', '<div class="',
          CLASSES.title, '" title="', itemName, '">', itemName,
          '</div>', '<div class="', CLASSES.metadata, '" ', itemStyle,
          '>', _formatTime(timeBegin, timeEnd, timeWhen), '<br/>',
          'Creator : ', creator, '</div>', '<div class="',
          CLASSES.content, '" ', itemStyle, '>', description,
          '</div>',
          '<span class="', CLASSES.prevLink, '">Prev</span> | ',
          '<span class="', CLASSES.nextLink, '">Next</span>',
          '</div>'
        ];

    if ( isExternal ) {
//      HyperCities.util.debug(_id + "[A2] Append External Kml " + itemId);
      itemAttr = {
        name       : itemName,
        ownerId    : ownerId,
        stateId    : stateId,
        linkUrl    : itemUrl,
        bounds     : bBox,
        isExternal : true,
        isHidden   : true,
        dateFrom   : dateFrom,
        dateTo     : dateTo,
        view       : view,
        maps       : maps,
        objs       : objs
      };

      //itemType = HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK;
      /*
      if (isEarthObject) {
        itemType = HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK;
      }
      else {
        itemType = HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK;
      }
      */

      // If the item is not in _check, it not overlayed on Map,
      // add it to the HCObject, and add check box.
      if ( !isChecked && ($.inArray(itemId, _checked) < 0 ) ) {
        HyperCities.HCObject.addObject(itemType, itemId, itemAttr);
        domHtml.splice(17, 0,
          //'<div class="', CLASSES.overlayBtn, '"></div>'
          '<div class="', CLASSES.richObjBtn, '"></div>'
        );
      }
      else {
        domHtml.splice(17, 0, 
          //'<div class="', CLASSES.overlayBtn,
          '<div class="', CLASSES.richObjBtn,
          ' ', CLASSES.selected ,'"></div>'
        );
      }
    }
    else if ( isNetworkLink ) {
//      HyperCities.util.debug(_id + "[A2] Append Network Link " + itemId);
      domHtml[13] = CLASSES.expandBtn;
      domHtml[14] = '" title="Open collection ';
      domHtml[16] = '">></div>';

      itemAttr = {
        name       : itemName,
        ownerId    : ownerId,
        stateId    : stateId,
        linkUrl    : itemUrl,
        bounds     : bBox,
        isExternal : false,
        isHidden   : true,
        dateFrom   : dateFrom,
        dateTo     : dateTo,
        view       : view,
        maps       : maps,
        objs       : objs
      };

      //itemType = HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK;
      /*
      if (isEarthObject) { 
        itemType = HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK;
      }
      else {
        itemType = HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK;
      }
      */
      HyperCities.HCObject.addObject(itemType, itemId, itemAttr);
    }
    else if ( isPlacemark ) {
      // HyperCities.util.debug(_id + "[A2] Append Placemark " + itemId);
      domHtml[31] = "Author : ";

      // If the item is not in _check, it not overlayed on Map,
      // add it to the HCObject, and add check box.
      if ( !isChecked && ($.inArray(itemId, _checked) < 0 ) ) {
        domHtml.splice(17, 0, '<div class="', CLASSES.richObjBtn,
          '"></div>'
        );
      }
      else {
        domHtml.splice(17, 0, '<div class="', CLASSES.richObjBtn, ' ',
          CLASSES.selected ,'"></div>'
        );
      }

      itemAttr = {
        name       : itemName,
        ownerId    : ownerId,
        stateId    : stateId,
        markerUrl  : itemUrl,
        markerKml  : $item.mapping.kml,
        description: description,
        zoomLevel  : zoomLevel,
        bounds     : bBox,
        markerType : markerTypeId,
        markerState: markerStateId,
        isExternal : false,
        isHidden   : false,
        dateFrom   : dateFrom,
        dateTo     : dateTo,
        objects    : null,
        view       : view,
        maps       : maps,
        objs       : objs
      };

      //itemType = HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT;
      /*
      if (isEarthObject) {
        itemType = HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT;
      }
      else {
        itemType = HyperCities.config.HC_OBJECT_TYPE.PLACEMARK;
      }
      */

      // If the item is not in _check, it not overlayed on Map,
      // add it to the HCObject, but NOT show it on map.
      if ( !isChecked && ($.inArray(itemId, _checked) < 0 ) ) {
        HyperCities.HCObject.addObject(itemType, itemId, itemAttr);
        // HyperCities.HCObject.show(itemId);
        //_checked.push(itemId);
      }
    }

    // Add edit function if user has permision
    if ( isEditable ) {
      domHtml.splice(17, 0, '<div class="', CLASSES.gripBtn, '"></div>');
      domHtml.splice(17, 0, '<div class="', CLASSES.editBtn, '"></div>');
    }

    if ( isDeletable ) {
      domHtml.splice(17, 0, '<div class="', CLASSES.deleteBtn, '"></div>');
    }

    itemDom = $(domHtml.join(''));
    itemDom.data("id", itemId)
      .data("order", itemOrder);
      // Don't highlight item on Hover
      //.hover( 
      //  function () {
      //    HyperCities.narrativePanel.highlightItem(itemId);
      //  },
      //  function () {
      //    HyperCities.narrativePanel.unHighlightItem(itemId);
      //  }
      //);

    if ( _isListView ) {
      itemDom.addClass(CLASSES.listView);
    }

    // Handle MediaObject
    itemDom.find("img.Itemshockwave")
      .replaceWith('<object></object>','shockwave');
    itemDom.find("img.Itemaudio").replaceWith('<object></object>','audio');
    itemDom.find("object")
      .prepend('<param name="wmode" value="transparent"/>');
    itemDom.find("object embed").each(
      function () {
        var target = $(this);
        target.attr('wmode', 'transparent');
      });

    // Handle href (open in new window)
    //_contentExtensions[_currentPanel].applyStyling(itemDom);
    var ImageSubId = 0;
    var ImagePanelObject = {
      id: itemId,
      title: itemName
    };

    if ( bookmarks && bookmarks.length > 0 ) {
      var bookmarksDiv = $('<div class="' + CLASSES.bookmarks +'"></div>');

      $.each(bookmarks, function($index) {
        var bookUid = "NB_" + $index + "_" + this.book.id,
          bookTitle = this.book.bookTitle,
          pageNo = this.pageNo,
          coverUrl = decodeURIComponent(this.book.coverUrl),
          bookDom = $('<div class="' + CLASSES.bookCover + '" id="' + bookUid
          +'"></div>');

        bookDom.data("Id", bookUid)
          .data("thumbnail", coverUrl)
          .data("bookTitle", bookTitle)
          .data("pageNo", pageNo);

        bookDom.append('<img src="' + coverUrl + '" title="' + this.title +
          '"><div class="pageNum"></div>');

        if (pageNo) {
          bookDom.find(".pageNum")
          .html("p." + pageNo);
        }

        bookDom.find("img").click(
          function(event) {
            var pageNo = $(this).parent().data("pageNo");
            HyperCities.mainMap.overlayBookViewer(bookUid, bookTitle, null, pageNo);
          }
        );
        bookmarksDiv.append(bookDom);
      });
      itemDom.find("."+CLASSES.content).before(bookmarksDiv);
    };

    itemDom.find("."+CLASSES.content+" img")
      .css("border", "1px solid #666666")
      .addClass(CLASSES.blankLink)
      .each( function () {
        var imageId = ImagePanelObject.id + "_" + ImageSubId++;

        var imageObject = {
          id: imageId,
          title: ImagePanelObject.title,
          sourceURL: $(this).attr("src"),
          height: 200,
          width: 320
        };

        var image = new Image();
        image.onload = function () {
          imageObject.height = this.height;
          imageObject.width  = this.width;
        };
        image.src = $(this).attr("src");

        var anchorNode = $(this).parent().get(0);

        if ( anchorNode.nodeName === "A" && anchorNode.href !== "" ) {
          $(this).css("border", "0px");
          return;
        } else {
          $(this).css("cursor", "pointer")
          .click(HyperCities.mainMap.overlayImageBox(imageObject));
        }
      }
    );

    itemDom.find("."+CLASSES.content+" a").each(
      function () {
        if (!$(this).hasClass(CLASSES.collectionLink)) $(this).attr('target','_blank').addClass(CLASSES.blankLink);
        else {
          $(this).removeClass(CLASSES.blankLink);
          $(this).children("img").removeClass(CLASSES.blankLink);
          $(this).children("img").addClass(CLASSES.collectionLink);
        }
      }
    );


    // Append Item
    $("." + CLASSES.loading, panelListDom).before(itemDom);

    // only update jScrollpane Once, when last item loaded
    if ( _progressCount == 0 ) {

      totalItems = $("." + CLASSES.panelItem, panelListDom).length;

      // remove loading Message
      $("." + CLASSES.loading, panelListDom).remove();

      if ( totalItems > 1 && isEditable ) {
        // since all item were loaded, make Items sortable
        panelListDom.sortable({
          axis: 'y',
          items: '.' + CLASSES.panelItem,
          cursor: 'move',
          handle: '.' + CLASSES.gripBtn,
          start: function (e) {
            panelListDom.data("sorting", 1);
          },
          update: function () {
            var sorted = panelListDom.sortable('toArray'),
              params = {
                orderId: [],
                order: []
              },
              itemOrder = 1;

            $.each(sorted, function () {
              if ( this.length <= 0 ) return;

              var itemDom = $('#' + this);

              if ( itemDom.data('order') != itemOrder ) {
                params.orderId.push(itemDom.data('id'));
                params.order.push(itemOrder);
              }
              itemOrder++;
            });

            $.post( "./updateOrder.php",
              {
			  "pid"   : panelListDom.data('collectionId'),
              "cid"   : params.orderId,
              "order" : params.order
              },
              _confirmUpdateOrder,
              "xml");
          }
        });

        if ( _isListView ) {
          $("." + CLASSES.gripBtn, panelListDom).show();
          $("." + CLASSES.editBtn, panelListDom).show();
          $("." + CLASSES.deleteBtn, panelListDom).show();
        } else {
          panelListDom.sortable('disable');
        }
      }

      panelListDom.jScrollPane({
        reinitialiseOnImageLoad: true,
        dragMinHeight: 15,
        animateTo: true
      });
    // Do not overlay the item by default
    // $("." + CLASSES.overlayBtn).click();
    }
  };

    /**
   * Confirm whether the update of the order of objects in the collection was
   * successfully saved.
   *
   * @param {xml/json} $data Response data from serevr.
   */
  var _confirmUpdateOrder = function ($data) {

        var success = $($data).find("Success").text(),
        error   = $($data).find("Error > Message").text(),
        panelId = _panelSet.length,
        sorted  = [],
        itemOrder = 1;

        if ( success.length > 0 ) {
            // HyperCities.util.debug("Update Order Success");
            // Server update success, so it's safe to update the order at client side
            sorted = $("#panelList_" + panelId).sortable('toArray');

            $.each(sorted, function () {
                if ( this.length <= 0 ) return;

                var itemDom = $('#' + this);

                if ( itemDom.data('order') != itemOrder ) {
                    itemDom.data('order', itemOrder)
                }
                itemOrder++;
            });
        }
        else if ( error.length > 0 ) {
            HyperCities.util.debug("Failed to update order of objects in collection.");
        }
    };

  var _updatePanel = function ($data) {

    var collectionId = $data.id,
      collectionName = $data.name,
      collectionUrl = $data.linkUrl,
      ownerId = $data.owner,
      stateId = $data.state,
      creator = $data.creator,
      description = $data.description,
      childrenList = $data.children,
      totalChildren = childrenList.length,
      showProgress = false,
      viewFormat = [
        'BBox=[', $data.mapping.swLon,
        '],[', $data.mapping.swLat,
        '],[', $data.mapping.neLon,
        '],[', $data.mapping.neLat,
        ']'],
      bBox = HyperCities.util.parseBoundingBox(viewFormat.join('')),
      panelDom = $("#panel_" + _currentPanel),
      panelInfoDom = $("#panelInfo_" + _currentPanel),
      panelListDom = $("#panelList_" + _currentPanel),
      domHtml = [],
      panelHeight = _panelWrapper.height(),
      infoHeight = 0,
      maxInfoHeight = (panelHeight / 4),
      timeBegin = $data.mapping.dateFrom.date,
      timeEnd = $data.mapping.dateTo.date,
      timeWhen = "",
      dateFrom = null,
      dateTo = null,
      /*
      isEditable = $data.isEditable,
      isDeletable = $data.isDeletable,
      */
      isEditable     = HyperCities.user.hasUpdatePrivilege
                (collectionId, ownerId, stateId),
      isDeletable    = HyperCities.user.hasDeletePrivilege
                (collectionId, ownerId, stateId),
      zoomLevel = 18,
      maps = $data.maps,
      maxZoom = $data.mapping.maxZoom,
      openedList = HyperCities.collectionList.getOpenedCollections(),
      checkedList = HyperCities.collectionList.getCheckedCollections(),
      objectHash = null;

    HyperCities.util.debug(_id + '[A2] Render Narrative Panel ' + collectionId);

    // Update permalink URL
    objectHash = window.location.hash.match(/object=(\d+)/);
    HyperCities.linkController.updateURL('collections', collectionId);

    if (maxZoom) {
      HyperCities.mainMap.setMaxZoom(maxZoom);
      _panelSet[_panelSet.length - 1].maxZoom = maxZoom;
    }

    // If parentId does not assign, this object might not load in HCObject yet.
    if ( isNaN(panelDom.data('parentId')) ) {
      HyperCities.HCObject.addObject(
        HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK,
        collectionId,
        {
          name       : collectionName,
          ownerId    : ownerId,
          stateId    : stateId,
          linkUrl    : collectionUrl,
          bounds     : bBox,
          isExternal : false,
          isHidden   : false
        }
      );
    }

    // Get collection timespan
    dateFrom = HyperCities.util.parseDateTime($data.mapping.dateFrom.date);
    dateTo = HyperCities.util.parseDateTime($data.mapping.dateTo.date);

    // Set Timespan to the range of collection
    if ( dateFrom !== null && dateTo !== null ) {
      HyperCities.control.timeSlider.setTime(null, dateFrom.getFullYear().toString(),
        dateTo.getFullYear().toString(), null, true);
    }

    // Set Collection Metadata
    domHtml = [
      '<div class="', CLASSES.title, '" title="', collectionName, '">',
      collectionName, '</div>', '<div class="', CLASSES.metadata, '">',
      _formatTime(timeBegin, timeEnd, timeWhen), '<br/>',
      'Creator : <span class="', CLASSES.author, '">', creator,
      '</span></div>', '<div class="', CLASSES.description, '">',
      description, '</div></div>'
    ];

    panelInfoDom.data("collectionId", collectionId)
      .data("parentId", _parentId)
      .data("ownerId", ownerId)
      .data("stateId", stateId)
      .find("." + CLASSES.loading)
      .after(domHtml.join(''))
      .remove();

    // Add ScrollBar to Description Field
    infoHeight = $("." + CLASSES.description, panelInfoDom).height();

    if ((infoHeight > maxInfoHeight) && (maxInfoHeight > 0)) {
      $("." + CLASSES.description, panelInfoDom).jScrollPaneRemove();
      $("." + CLASSES.description, panelInfoDom)
        .css("height", maxInfoHeight + "px")
        .jScrollPane({dragMinHeight: 15});
    }

    // Adjust panelList Height, the panelInfoDom.height is not accurate
    // (height() of element does not count border, padding and margin) 
    // should use panelListDom.offset.top
    panelListDom.jScrollPaneRemove();
    panelListDom.data("collectionId", collectionId)
      .css("height", panelHeight - panelListDom.offset().top - 5);

    // Add Edit/Delete button if user do have privilege
    if ( isEditable ) {

      domHtml = [ '<div class="', CLASSES.editCollectionBtn, 
        '" title="Edit Collection Info"></div>'
      ];

      if ( isDeletable ) {
        domHtml.push('<div class="', CLASSES.deleteCollectionBtn,
               '" title="Delete Collection"></div>');
      }

      $("." + CLASSES.showListBtn, panelInfoDom)
        .after(domHtml.join(''));
    }


    // Parse Object Info
    if ( totalChildren > 0 ) {
      // Initialize Progressbar
      if ( !showProgress ) {
        _progressCount = totalChildren;
        showProgress = true;
        //HyperCities.mainMap.addProgressbarPending(totalChildren);
      }

      // Add children
      setTimeout(
        function () {
          var itemDom = childrenList.splice(0,1);

          // Update Progressbar
          _progressCount--;
          //setTimeout(HyperCities.mainMap.addProgressbarFinished, 10, 1);

          _appendNarrativeItem(itemDom[0], openedList, checkedList, isDeletable);

          if ((childrenList.length > 0) && panelListDom.is(":visible")) {
            setTimeout(arguments.callee, 10);
          } else {
            if (objectHash != null && objectHash.length > 0) {
              _flyto(parseInt(objectHash[1]));
            } else {
              _flyto(1);
            }
          }

        },
        10
      );
    }
    else {
      $("." + CLASSES.loading, panelListDom).html("No item in this collection");
    }
  };

  var _updatePanelDeprecated = function ($data) {
    // HyperCities.util.debug(_id + "[A2] Render Narrative Panel");

    //TODO:: handel <error> xml

    var self = this,
      collectionXml = $("Document:first", $data),
      collectionId = collectionXml.attr("id"),
      collectionName = collectionXml.find("name:first").text(),
      collectionUrl = collectionXml.find("[nodeName=atom:link]:first")
        .attr("href"),
      creator = collectionXml.find("[nodeName=atom:name]:first")
        .text(),
      description = collectionXml.find("description:first").text(),
      viewFormat = collectionXml.find("ExtendedData:first > " +
        "[nodeName=hc:viewFormat]").text(),
      maxZoom = parseInt(collectionXml.find("ExtendedData:first > " +
        "[nodeName=hc:maxZoom]").text()),
      ownerId        = collectionXml.find("ExtendedData:first > "
                  + " [nodeName=hc:ownerId]").text(),
      stateId        = collectionXml.find("ExtendedData:first > "
                  + " [nodeName=hc:stateId]").text(),
            baseMap        = collectionXml.find("ExtendedData:first > "
                  + " [nodeName=hc:baseMap]").text(),
      isEditable     = parseInt(collectionXml.find("ExtendedData:first > "
                  + " [nodeName=hc:isEditable]").text()),
      isDeletable    = parseInt(collectionXml.find("ExtendedData:first > "
                  + " [nodeName=hc:isDeletable]").text()),
      /*
      isEditable     = (HyperCities.user.hasUpdatePrivilege
                (collectionId, ownerId, stateId)
                && _parentId !== null),
      isDeletable    = (HyperCities.user.hasDeletePrivilege
                (collectionId, ownerId, stateId)
                && _parentId !== null),
      */
      timeStamp      = $("> TimeStamp", collectionXml),
      timeSpan       = $("> TimeSpan", collectionXml),
      timeBegin      = timeSpan.find("begin").text(),
      timeEnd        = timeSpan.find("end").text(),
      timeWhen       = timeStamp.find("when").text(),
      dateFrom       = null,
      dateTo         = null,
      zoomLevel      = 18,
      bBox           = HyperCities.util.parseBoundingBox(viewFormat),
      panelDom       = $("#panel_" + _currentPanel),
      panelInfoDom   = $("#panelInfo_" + _currentPanel),
      panelListDom   = $("#panelList_" + _currentPanel),
      domHtml        = [],
      openedList     = HyperCities.collectionList.getOpenedCollections(),
      checkedList    = HyperCities.collectionList.getCheckedCollections(),
      childrenList   = collectionXml.children
                ("[nodeName=Placemark], [nodeName=NetworkLink]"),
      totalChildren  = childrenList.length,
      showProgress   = false,
      panelHeight    = _panelWrapper.height(),
      infoHeight     = 0,
      maxInfoHeight  = (panelHeight / 4);

    var object = window.location.hash.match(/object=(\d+)/);
    // Update permalink URL
    HyperCities.linkController.updateURL("collections", collectionId);

    if (maxZoom) {
      HyperCities.mainMap.setMaxZoom(maxZoom);
      _panelSet[_panelSet.length - 1].maxZoom = maxZoom;
    }

    // If parentId does not assign, this object might not load in HCObject yet.
    if ( isNaN(panelDom.data("parentId")) ) {
      HyperCities.HCObject.addObject(
        HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK,
        collectionId,
        {
          name       : collectionName,
          ownerId    : ownerId,
          stateId    : stateId,
          linkUrl    : collectionUrl,
          bounds     : bBox,
          isExternal : false,
          isHidden   : false
        }
      );
    }

    // We zoom to first object in the collection.
    // Zoom to collection extent if _zoomToExtent is true
    //if ( _zoomToExtent ) {
    //  HyperCities.HCObject.zoomTo(collectionId);
    //}

    // Get collection timespan
    if ( timeSpan.length > 0 ) { // It's time span
      dateFrom = HyperCities.util.parseDateTime(timeBegin);
      dateTo   = HyperCities.util.parseDateTime(timeEnd);
    }
    // otherwise look for stamp
    else if ( timeStamp.length > 0 ) {
      dateFrom = HyperCities.util.parseDateTime(timeWhen);
      if (dateFrom == null) {
        dateTo = null;
      }
      else {
        dateTo = dateFrom.clone();
      }
    }

    // Set Timespan to the range of collection
    if ( dateFrom !== null && dateTo !== null ) {
      HyperCities.control.timeSlider.setTime(null, dateFrom.getFullYear().toString(),
        dateTo.getFullYear().toString(), null, true);
    }

    // Set Collection Metadata
    domHtml = [ '<div class="', CLASSES.title, '" title="', collectionName, 
          '">', collectionName, '</div>', '<div class="',
          CLASSES.metadata, '">',
          _formatTime(timeBegin, timeEnd, timeWhen), '<br/>',
          'Creator : <span class="', CLASSES.author, '">', creator, 
          '</span></div>', '<div class="', CLASSES.description, '">',
          description, '</div></div>'
        ];

    panelInfoDom.data("collectionId", collectionId)
      .data("parentId", _parentId)
      .data("ownerId", ownerId)
      .data("stateId", stateId)
      .data("baseMap", baseMap)
      .find("." + CLASSES.loading)
      .after(domHtml.join(''))
      .remove();

    // Add ScrollBar to Description Field
    infoHeight = $("." + CLASSES.description, panelInfoDom).height();

    if ((infoHeight > maxInfoHeight) && (maxInfoHeight > 0)) {
      $("." + CLASSES.description, panelInfoDom).jScrollPaneRemove();
      $("." + CLASSES.description, panelInfoDom)
        .css("height", maxInfoHeight + "px")
        .jScrollPane({dragMinHeight: 15});
    }

    // Adjust panelList Height, the panelInfoDom.height is not accurate
    // (height() of element does not count border, padding and margin) 
    // should use panelListDom.offset.top
    panelListDom.jScrollPaneRemove();
    panelListDom.data("collectionId", collectionId)
      .css("height", panelHeight - panelListDom.offset().top - 5);

    // Add Edit/Delete button if user do have privilege
    if ( isEditable ) {

      domHtml = [ '<div class="', CLASSES.editCollectionBtn, 
        '" title="Edit Collection Info"></div>'
      ];

      if ( isDeletable ) {
        domHtml.push('<div class="', CLASSES.deleteCollectionBtn,
               '" title="Delete Collection"></div>');
      }

      $("." + CLASSES.showListBtn, panelInfoDom)
        .after(domHtml.join(''));
    }

    // Overlay baseMap, if any
    if ( typeof (baseMap) != 'undefined' && baseMap != ''
      && baseMap != null && baseMap != 0 ) {
        HyperCities.mapList.update(HyperCities.mainMap.getBounds(),
                       HyperCities.mainMap.getZoom(),
                       true, true);
        HyperCities.session.set("mode", HyperCities.config.MODE_NARRATIVE);
        HyperCities.mapList.addPostSyncOperation(
          function (baseMap) {
            //HyperCities.debug (_id + "Overlaying basemap " + baseMap);
            HyperCities.mapList.addMap(baseMap);
          },
          baseMap
        );
    }

    // Parse Object Info
    if ( totalChildren > 0 ) {
      // Initialize Progressbar
      if ( !showProgress ) {
        _progressCount = totalChildren;
        showProgress = true;
        //HyperCities.mainMap.addProgressbarPending(totalChildren);
      }

      // Add children
      setTimeout(
        function () {
          var itemDom = childrenList.splice(0,1);

          // Update Progressbar
          _progressCount--;
          //setTimeout(HyperCities.mainMap.addProgressbarFinished, 10, 1);

          _appendNarrativeItem(itemDom[0], openedList, checkedList, isDeletable);

          if ((childrenList.length > 0) && panelListDom.is(":visible")) {
            setTimeout(arguments.callee, 10);
          } else {
            if (object != null && object.length > 0) {
              _flyto(parseInt(object[1]));
            } else {
              _flyto(1);
            }
          }

        },
        10
      );

    }
    else {
      $("." + CLASSES.loading, panelListDom).html("No item in this collection");
    }
  };

  /**
   * Hide toolPanel and remove the content within toolPanel
   * We need to remove the content because toolPanel is shared by different tools
   */
  var _closeToolPanel = function () {
    $("." + CLASSES.toolPanel, _panelWrapper).hide()
      .find("." + CLASSES.toolPanelContent)
      .empty();
  };

  /**
   * Show toolPanel of $parentDom (<div id="panel_X" class="HCNarrativePanel">)
   * and assign $contentDom as its content.
   *
   * @param {dom} $parentDom Dom at which to append tool panel
   * @param {dom} $contentDom Content to append
   */
  var _createToolPanel = function ($parentDom, $contentDom) {
    var panelId    = $parentDom.data("panelId"),
      panelWidth = ($("#panelInfo_" + panelId, $parentDom).width() + 6),
      panelTop   = ($("#panelInfo_" + panelId, $parentDom).height() + 22);

    // Align the toolPanel to current narrativePanel, and append the $contentDom
    $("." + CLASSES.toolPanel, $parentDom)
      .css("top", panelTop)
      .css("width", panelWidth)
      .find("." + CLASSES.toolPanelContent)
        .html($contentDom)
      .end()
      .show();
  };

    /**
   * Open options panel.
   */
  var _openOptionToolPanel = function ($event) {
        var panelDom   = $($event.currentTarget),
        panelId    = panelDom.data("panelId"),
        optionDom  = [
      '<div class="', CLASSES.title, '">Customize the display</div>',
      '<div class="', CLASSES.options, '">Sync map</div>',
      ': <span class="', CLASSES.syncMapOn, '">On</span> ',
      '- <span class="', CLASSES.syncMapOff, '">Off</span><br/>',
      '<div class="', CLASSES.options, '">Time format</div>',
      ': <span class="', CLASSES.showDate, '">Date</span> ',
      '- <span class="', CLASSES.showDatetime, 
      '">Date and Time</span><br/>', '<div class="', CLASSES.options,
      '">Auto ZoomIn</div>', ': <span class="', CLASSES.autoZoomOn,
      '">On</span> ', '- <span class="', CLASSES.autoZoomOff, '">Off</span><br/>',
      '<div class="', CLASSES.options, '">3D buildings</div>',
      ': <span class="', CLASSES.showBuildingOn, '">On</span> ',
      '- <span class="', CLASSES.showBuildingOff, '">Off</span>',
    ];

        // Only create dom when panel doesn't exist
        if ( panelDom.find("."+CLASSES.options).length == 0 ) {
            _createToolPanel(panelDom, optionDom.join(''));

            // Bind event for option switch
            if ( HyperCities.session.get("syncMap") === true ) { // SyncMap On
                panelDom.find("."+CLASSES.syncMapOn).addClass(CLASSES.selected);
                panelDom.find("."+CLASSES.syncMapOff).addClass(CLASSES.link);
            }
            else {            // SyncMap Off
                panelDom.find("."+CLASSES.syncMapOff).addClass(CLASSES.selected);
                panelDom.find("."+CLASSES.syncMapOn).addClass(CLASSES.link);
            }

            if ( _isDateView ) { // Viwe Date Only
                panelDom.find("."+CLASSES.showDate).addClass(CLASSES.selected);
                panelDom.find("."+CLASSES.showDatetime).addClass(CLASSES.link);
            }
            else { // View DateTime
                panelDom.find("."+CLASSES.showDatetime).addClass(CLASSES.selected);
                panelDom.find("."+CLASSES.showDate).addClass(CLASSES.link);
            }

            if ( _zoomToExtent ) { // AutoZoom On
                panelDom.find("."+CLASSES.autoZoomOn).addClass(CLASSES.selected);
                panelDom.find("."+CLASSES.autoZoomOff).addClass(CLASSES.link);
            }
            else { // AutoZoom Off
                panelDom.find("."+CLASSES.autoZoomOff).addClass(CLASSES.selected);
                panelDom.find("."+CLASSES.autoZoomOn).addClass(CLASSES.link);
            }

            if (HyperCities.earth.isBuildingOn()) { // 3D buildings On
                panelDom.find("."+CLASSES.showBuildingOn).addClass(CLASSES.selected);
                panelDom.find("."+CLASSES.showBuildingOff).addClass(CLASSES.link);
            }
            else { // 3D buildings Off
                panelDom.find("."+CLASSES.showBuildingOn).addClass(CLASSES.link);
                panelDom.find("."+CLASSES.showBuildingOff).addClass(CLASSES.selected);
            }
        }
    };

    /**
   * Open link tool panel.
   */
  var _openLinkToolPanel = function ($event) {
        var panelDom     = $($event.currentTarget),
      panelId      = panelDom.data("panelId"),
      collectionId = panelDom.find("#panelInfo_" + panelId)
                   .data("collectionId"),
      linkWidth    = (panelDom.find("#panelInfo_" + panelId).width() - 4),
      linkUrl      = $(HyperCities.linkController.generatePermalink
                ('collection', collectionId)).html(),
      exportKmlUrl = linkUrl.substring(0, linkUrl.lastIndexOf("?")) +
              "provider/collections/" + collectionId + ".kml",
      exportTourUrl= linkUrl.substring(0, linkUrl.lastIndexOf("?")) +
              "provider/earth/collections/" + collectionId + ".kml",
      linkDom      = ['<div class="', CLASSES.title,
              '">Use this link to share this collection</div>',
              '<input class="', CLASSES.permaLinkUrl, '" value="',
              linkUrl, '" readonly="readonly">',
              '<div class="', CLASSES.title,
              '">View this collection as a KML file</div>',
              '<a href="' +exportKmlUrl+ '" target="_blank" class="'+CLASSES.blankLink+'">' 
                +exportKmlUrl+ '</a>',
              '<div class="', CLASSES.title,
              '">View this tour in Google Earth</div>',
              '<a href="' +exportTourUrl+ '" target="_blank" class="'+CLASSES.blankLink+'">' 
                +exportTourUrl+ '</a>'
            ];

        // Only create dom when panel doesn't exist
        if ( panelDom.find("."+CLASSES.permaLinkUrl).length == 0 ) {
            _createToolPanel(panelDom, linkDom.join(''));

            // Set Focus auto Select for permaLink Url
            panelDom.find("."+CLASSES.permaLinkUrl).css("width", linkWidth)
          .focus(
            function () {
              this.select();
            }
          );
        }
    };

    /**
   * Add base map to map.
   *
   * @param {Date} $mapDate Date object
   */
  var _overlayBaseMap = function ($mapDate) {
    
        var bounds = HyperCities.mainMap.getBounds(),
      zoom   = HyperCities.mainMap.getZoom(),
      year   = $mapDate.getFullYear().toString();

    HyperCities.mapList.update(bounds, zoom, false, false);

    HyperCities.mapList.overlayBaseMap(year, true);
    $("#loadingMessage").fadeOut("slow");
  };

  return {

    /**
     * Open narrative panel for a collection.  If current mode is not
     * narrative mode, initizlize the narrative mode. Otherwise, append new
     * panel to exist panelSet. If the collection is already in panelSet,
     * switch to that panel.
     *
     * @param {Integer} collectionId in HyperCities DB
     * @param {Object} options for creating new panel
     */
    load: function ($collectionId, $options) {
      // HyperCities.util.debug(_id + "[A2] Load Narrative Panel");

      var params = {func : "narrativePanel.getNarrative"},
        options = $options || {},
        collectionId = parseInt($collectionId), 
        parentId = parseInt(options.parentId);

      // TODO:: Check if panel already loaded

      // Setup Panel variables
      if (!isNaN(collectionId)) {
        params.cid = collectionId;
      } else {
        HyperCities.util.debug(_id + "[A2] Invalid collectionId");
        return false;
      }
      if (!isNaN(parentId)) {
        _parentId = parentId;
        params.pid = parentId;
      }
      if (typeof(options.zoom) === "boolean") {
        _zoomToExtent = options.zoom;
      }

      HyperCities.session.set("currentCollectionId", collectionId);

      // Disable auto map refresh in narrative mode
      // HyperCities.earth.enableSync(false);

      // Remove city icons in main map
      // HyperCities.mainMap.removeCities();

      // TODO:: Check if already rendered
      /*
      if (( _originalMode === HyperCities.config.MODE_NARRATIVE ) && 
        ( _panelSet.length > 0 ) &&
        ( _panelSet[_panelSet.length-1].collectionId == $collectionId )) {

        // update parentId
        _panelSet[_panelSet.length-1].parentId = _parentId;
        // HyperCities.util.debug(_id + "Duplicate Narrative Panel " + $collectionId);
        return false;
      }
      */

      // Setup narrativePanel variables
      if (!_initialized) {
        _init();
      }

      // Append the new panel
      _appendPanel(collectionId, parentId);

//    $.post("./getNarrative.php", params, _updatePanel, "xml");
      $.get("./provider/collections/" + collectionId, _updatePanel, "json");

    }, // end of load: function ()

    /**
     * Highlight item on map.
     * 
     * @param {Integer} $itemId Object id
     */
    highlightItem: function ($itemId) {
      //HyperCities.util.debug(_id + "Hover over object " + $itemId);

      var panelId = _panelSet.length;

      // Highlight the placemark
      //HyperCities.HCObject.highlight($itemId);

      // Highlight Item in NarrativePanel
      $("#panel_" + panelId + " ." + CLASSES.panelItem + $itemId).addClass("hover");

      return false;
    },

    /**
     * Remove highlight from map.
     * 
     * @param {Integer} $itemId Object id
     */
    unHighlightItem: function ($itemId) {
      //HyperCities.util.debug(_id + "Hover off object " + $itemId);

      var panelId = _panelSet.length;

      // unHighlight the placemark
      //HyperCities.HCObject.unHighlight($itemId);

      // unHighlight Item in NarrativePanel
      $("#panel_" + panelId + " ." + CLASSES.panelItem + $itemId).removeClass("hover").removeClass(CLASSES.selected);

      return false;
    },

    /**
     * Update the Metadata of Collection
     * @param {Integer} Collection Id
     * @param {Object} the data need to be updated
     */
    updateCollection: function ($collectionId, $data) {

      var itemDom = $("#panel_1"),
        itemId  = null,
        data    = $data || {};

      // Find the corrtect Item Dom
      while (itemDom.length) {
        itemId = $('.HCNarrativePanelInfo', itemDom)
              .data('collectionId');
        if (parseInt(itemId) === $collectionId) {
          break;
        } else {
          itemDom = itemDom.next();
        }
      }

      if (!itemDom.length) {
        HyperCities.debug("Item not found!");
        return;
      } else {
        itemDom = $('.HCNarrativePanelInfo', itemDom);
      }

      if (data.title) {
        $('.title', itemDom).html(data.title)
          .attr("title", data.title);
      }

      if (data.description) {
        $('.description', itemDom).html(data.description);
      }

      if (data.creator) {
        $('.author', itemDom).html(data.creator);
      }
    },

    /**
     * Compute CSS parameters for Narrative Panel
     * Should be called when the size of sidebar changes
     */
    checkResize: function () {

      var viewportHeight = $(window).height(),
        sidebarWidth   = $('#sidebarWrapper').width(),
        totalPanels    = _panelSet.length,
        panelId        = totalPanels + 1,
        toolPanelWidth = 0,
        toolPanelTop   = 0,
        infoHeight     = 0,
        maxInfoHeight  = viewportHeight / 4,
        panelDom,
        panelInfoDom,
        panelListDom,
        offsetLeft,
        offsetTop;

      _panelWrapper.css("width", sidebarWidth + "px");

      var hash = window.location.hash;
      if (hash.indexOf("width=") > -1) {
        hash = hash.replace(/width=[\d]*/, "width=" + sidebarWidth);
      } else {
        hash += "?width=" + sidebarWidth;
      }

      window.location.hash = hash;

      if (_panelWrapper.is(":visible")) {

        while (panelId-- > 1) {
          panelDom = $("#panel_" + panelId, _panelWrapper);
          panelInfoDom = $("#panelInfo_" + panelId, panelDom);
          panelListDom = $("#panelList_" + panelId, panelDom);
          offsetLeft = ( panelDom.data("panelId") - totalPanels ) * sidebarWidth;

          panelDom.css("width", (sidebarWidth - 10 ) + "px")
            .css("height", viewportHeight)
            .css("left", offsetLeft + "px");

          // Resize Collection Description Area
          infoHeight = $("." + CLASSES.description, panelInfoDom).height();

          $(".jScrollPaneContainer", panelDom).css("width", "auto");

          if ((infoHeight > maxInfoHeight) && (maxInfoHeight > 0)) {
            $("." + CLASSES.description, panelInfoDom).jScrollPaneRemove();
            $("." + CLASSES.description, panelInfoDom)
              .css("height", maxInfoHeight + "px")
              .jScrollPane({dragMinHeight: 15});
          }

          offsetTop = viewportHeight - panelListDom.offset().top - 5;

          // Reset jScrollPane
          panelListDom.jScrollPaneRemove();
          panelListDom.css("height", offsetTop)
            .jScrollPane({dragMinHeight: 15, animateTo: true});

        }

        // Resize Tool Panel
        toolPanelWidth = ($("#panelInfo_" + totalPanels).width() - 2);
        toolPanelTop   = ($("#panelInfo_" + totalPanels).height() + 15);

        $("."+CLASSES.toolPanel, _panelWrapper)
          .css("top", toolPanelTop)
          .css("width", toolPanelWidth);
      }
    },

	reloadRichObject: function($objId) {
		$.get("./provider/objects/"+$objId, _loadRichObject, "json");
	},

    /**
     * Get Ids of opened panels.
     *
     * @return {Array} Panel ids as integers.
     */
    getOpenedPanelIds: function () {

      var panelIds = [],
        index    = 0;

      //HyperCities.util.debug(_panelSet);
      for (index in _panelSet) {
        panelIds.push(_panelSet[index].collectionId);
      }
      return panelIds;
    } // end getOpenedPanels: function ()

  }; // end of public methods
}(); // end of Object

// end of file
