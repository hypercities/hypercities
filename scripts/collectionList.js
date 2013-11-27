/**
 * HyperCities collectionList Object
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2008-12-22
 * @version   $Id$
 *
 */

HyperCities.collectionList = function () {
    // do NOT access javascript generated DOM from here; elements don't exist yet

    // Private variable goes here
    var _id        = "[HyperCities.collectionList] ",

    // Map Related Variables
    _mapBounds  = null,
    _mapZoom    = null,
    _oldBaseMap = null,
  _resizeJScroll = false,

    // Time Related Variables
    _timespan  = null,

    // intelliList Related Variables
    _initialized   = false,
    _doRender      = true,
  _originalMode  = HyperCities.config.MODE_DEFAULT,
    _opened        = [],  // Open folders ( elements are all integers )
    _checked       = [],  // Checked checkboxes ( elements are all integers )
    _updated       = [],  // Object or Collection that has been updated
    _skipList      = [],  // Root Level Collection Id, don't update
    _progressCount = 0,
    _queuedOperations = [], // Queued actions to take after an update of the collectionList is complete.
                            // This is used by snapshots and permalinks.

  // CSS classes constant used by treeview
  CLASSES = {
    main: "HCTreeview",
    folder: "folder",
    folderLink: "folderLink",
    marker: "marker",
    markerLink: "markerLink",
    collection: "collection",
    narrative: "narrative",
    editItem: "editItem",
    item: "item",
    noItem: "noItem",
    checkBox: "folderChecker",
    noCheckBox: "noChecker",
    external: "external",
    checked: "checked",
    enabled: "enabled",
    loading: "loading",
    expandable: "expandable",
    expandableHitarea: "expandable-hitarea",
    lastExpandable: "lastExpandable",
    lastExpandableHitarea: "lastExpandable-hitarea",
    collapsable: "collapsable",
    collapsableHitarea: "collapsable-hitarea",
    lastCollapsable: "lastCollapsable",
    lastCollapsableHitarea: "lastCollapsable-hitarea",
    last: "last",
    hitarea: "hitarea",
    myCollection: "myCollection"
  },

  HTML = {
    editDomHtml: ['<img src="./images/editIcon.gif" alt="Edit" title="Edit" class="', CLASSES.editItem, '"/>'
    ]
  };

  // Private method goes here
  /**
   * Determin current visiable list (Temp function)
   */
  var _getCurrentRoot = function () {

    if ($("#objectListWrapper").is(":visible")) {
      return $("#objectListWrapper");
    } else {
      return $("#treeviewWrapper");
    }
  };

    /**
     * Setup the Dom Node of ObjectList
     * @return jQuery $("#objectListWrapper")
     */
  var _initObjectList = function () {

        var treeWrapper = $(document.createElement("div")),
      treeRoot    = $(document.createElement("ul"));

        treeRoot.attr("id", "objectListWrapper")
        .addClass(CLASSES.main)
        .bind('HCUpdateFinish', _adjustLayout)   // Bind Adjust jScrollPane Event
        .bind('click', _listClickHandler);       // Bind Collection List Click Event

        treeWrapper.append(treeRoot);

        // Reset ObjectList and append Collection Tree Dom
    $("#panelBody")
      .find(".objectPanel")
      .append(treeWrapper);

        return treeRoot;
  };

    /**
     * Setup the Dom Node of Collection Tree
     * @return jQuery $("#treeviewWrapper")
     */
    var _initCollectionList = function () {

        var treeWrapper = $(document.createElement("div")),
      treeRoot    = $(document.createElement("ul"));

    if (HyperCities.session.get("baseCollection") > 0) {
      $('<div />', {
          id: "baseCollectionReset",
          text: "Exit Single-Collection Mode",
          click: function () {
            var message = "Are you sure you want to enter the general HyperCities viewing environment?"
                + "\n\nYou are currently viewing a single course collection. If you enter the"
                + " general HyperCities environment, you will be able to see all publicly-viewable"
                + " collections in HyperCities. However,"
                + " you may not be able to see the collection you have been viewing"
                + " anymore.";
            if (confirm(message)) {
              HyperCities.util.debug("Remove base collection");
              HyperCities.session.set("baseCollection", 0);
              HyperCities.intelliList.reset();
              HyperCities.collectionList.update(null, null, true);
              $.get("clearBaseCollection.php");
              $("#baseCollectionReset").hide();
            }
          }
        }
      ).appendTo(treeWrapper);
        //treeWrapper.append(resetCollectionList);
    }

        treeRoot.attr("id", "treeviewWrapper")
        .addClass(CLASSES.main)
        .bind('HCUpdateFinish', _adjustLayout)   // Bind Adjust jScrollPane Event
        .bind('click', _listClickHandler);       // Bind Collection List Click Event

        treeWrapper.append(treeRoot);

        // Reset intelliList and append Collection Tree Dom
        HyperCities.intelliList.reset();
    $("#intelliList").append(treeWrapper);

        return treeRoot;
    };

  /**
   * Clear collection list.
   */
    var _resetCollectionList = function () {

        // Clean up variables
        _mapBounds = null;
        _mapZoom   = null;
        _timespan  = null;
        _initialized = false;
        _doRender  = true;
        _opened    = [];
        _checked   = [];
        _updated   = [];
        _skipList  = [];
        _progressCount = 0;

    };

  /**
   * Adjust Layout for jScrollPane
   */
  var _adjustLayout = function () {
    // TODO: Only adjust layout and remove loading message
    // after all Ajax call is done

    // HyperCities.debug(_id + "[A2] Progress Count (Adjust Layout) " + _progressCount);
    if ( _progressCount == 0 ) {
      setTimeout( function () {
        $('#intelliList').jScrollPane();
        if (_resizeJScroll == true) {
          // This adjustment is necessary in Single-Collection mode.
          // Applying jScrollPane to the intellilist when there's only
          // one collection visible prevents it from expanding.
          // This adjustment makes it the correct height.
          $('.jScrollPaneContainer').height($("#sidebarWrapper").height()
            - ($('#topTabWrapper').height() + $('#topPanelWrapper').height()
              // 30 is a fudge factor to compensate for padding
              + $('#mapPanelWrapper').height() + $('#intelliTabWrapper').height() + 30));
          //_resizeJScroll = false;
        }

        if ($("#objectListWrapper").is(":visible")) {
          $("#panelBody")
            .find(".objectPanel")
            .jScrollPane();
        }
      }, 100);
      $("#loadingMessage").fadeOut("slow");
      for (var i in _queuedOperations) {
        var operation = _queuedOperations.pop();
        _queuedOperations[i].op(_queuedOperations[i].data);
      }
      _queuedOperations = [];
    } // end if ( _progressCount == 0 )

    setTimeout(function (){
      if ($("#loadingMessage")) {
        $("#loadingMessage").fadeOut("slow",
          function (){
          // HyperCities.debug("Loading message is stuck. Remove it manually.")
          }
        );
      }
    }, 5000);
  };

    /**
   * Apply corresponding last class to given Dom Node
   * @param {jQuery} $lastNodeDom
   */
    var _applyLastClass = function ($lastNodeDom) {

        var lastNodeId  = $lastNodeDom.data("id"),
        isItem      = $lastNodeDom.hasClass(CLASSES.item),
    isNoItem    = $lastNodeDom.hasClass(CLASSES.noItem),
        isExternal  = $lastNodeDom.hasClass(CLASSES.external),
        isOpened    = ($.inArray(parseInt(lastNodeId), _opened) !== -1);

        if ( isItem || isNoItem || isExternal ) {
            $lastNodeDom.addClass(CLASSES.last);
        }
        // Not an Item, it's Collapsable or Expandable
        else if ( isOpened ) {
            $lastNodeDom.addClass(CLASSES.lastCollapsable)
            .find(">div." + CLASSES.hitarea)
            .addClass(CLASSES.lastCollapsableHitarea);
        }
        else {
            $lastNodeDom.addClass(CLASSES.lastExpandable)
            .find(">div." + CLASSES.hitarea)
            .addClass(CLASSES.lastExpandableHitarea);
        }
    };

    /**
   * Event Delegation Handler to process all click event on collection tree
   * @param {Event} $event
   * @return {boolean} Always return false to prevent event propagation
   */
  var _listClickHandler = function ($event) {

    var target = $($event.target);

    if ( target.hasClass(CLASSES.hitarea) ) { // user click on Open/Close Folder
      _toggleFolder($event);
    }
    else if ( target.hasClass(CLASSES.checkBox) ) { // user click on CheckBox
      _toggleCheckBox($event);
    }
    else if ( target.hasClass(CLASSES.folderLink) ) { // user click on Folder Link
      _zoomToCollection($event);
    }
    else if ( target.hasClass(CLASSES.markerLink) ) { // user click on Marker Link
      _zoomToCollection($event);
      _openItemInfoWindow($event);
    }
    else if ( target.hasClass(CLASSES.editItem) ) { // user click on edit link
      _openEditMediaPanel($event);
    }
    else if ( target.hasClass(CLASSES.narrative) ) { // user click on Narrative Link
      _openNarrativePanel($event);
    }
    else {
      //HyperCities.debug(_id + "[A2] Click Collection Tree");
      HyperCities.debug(target);
    }
    return false;
  };

  /**
   * Append edit icon in the collection list if it is editable.
   * @param {jQuery} $folderDom
   * @param {Integer} $checkerId
   */
  var _appendEditIcon = function ($folderDom, $checkerId) {
  
    var isEditable = $folderDom.data('isEditable');

    if (isEditable === undefined) {
      // the first time to check privilege
      var markerAttr = HyperCities.HCObject.get($checkerId);

      HyperCities.user.hasUpdatePrivilege($checkerId, 
          markerAttr.ownerId,
          markerAttr.stateId, 
          function($isEditable){
            if ( !$isEditable ) {
              $folderDom.find("." + CLASSES.editItem).remove();
              $folderDom.data('isEditable', false);
            } 
            else {
              // check if the icon has been added
              if ($folderDom.find("." + CLASSES.editItem).length === 0) {
                $folderDom.find("." + CLASSES.markerLink + ", ."
                  + CLASSES.folderLink).before(HTML.editDomHtml.join (''));
                $("."+CLASSES.editItem, $folderDom).show();
              } else {
                $("."+CLASSES.editItem, $folderDom).show();
              }

              $folderDom.data('isEditable', true);
            }
          }
      );
    } else {
      // privilege has been checked before
      if (isEditable) {
        // check if the icon has been added
        if ($folderDom.find("." + CLASSES.editItem).length === 0) {
          $folderDom.find("." + CLASSES.markerLink + ", ." +
              CLASSES.folderLink).before(HTML.editDomHtml.join (''));
          $("."+CLASSES.editItem, $folderDom).show();
        } else {
          $("."+CLASSES.editItem, $folderDom).show();
        }
      } 
    }
  };

  /**
   * Check all checkBox that has id equals to $checkerId
   * @param {Integer} $checkerId
   */
  var _checkItem = function ($checkerId) {

    var currentRoot   = _getCurrentRoot(),
      index         = 0,
      totalChildren = 0,
      showLoading   = false,
      isCollection  = true,
      isExternal    = false,
      folderDom,
      folderId,
      folderIndex,
      targetDom,
      children,
      targetArray = currentRoot.find("." + CLASSES.checkBox + $checkerId);

    index = targetArray.length;
    // Check every checkbox that has the same ID
    while ( index-- > 0 ) {
      targetDom = $(targetArray[index]);

      targetDom.addClass(CLASSES.checked);

      // Get Folder Information
      folderDom    = targetDom.parent();
      folderId     = $checkerId;
      folderIndex  = $.inArray($checkerId, _opened);
      isCollection = folderDom.hasClass(CLASSES.collection);
      isExternal   = folderDom.hasClass(CLASSES.external);

      // If the folder is closed, open the folder
      // Note: External collection can be check but cannot be opened
      if ( isCollection && !isExternal && folderIndex < 0
         && typeof(folderId) !== 'undefined' ) {
        _setFolderStatus(folderId, true);
      }

      // Get Children Information
      children = $.map(folderDom.find(">ul>li"),
        function ($node){
          return $($node).data("id");
        }
      );
      totalChildren = children.length;

      // Check each child by yielding processes
      if ( totalChildren > 0 ) {
        // Initialize Progressbar
        if ( !showLoading ) {
          showLoading = true;
          // HyperCities.debug(folderId + " Init " + totalChildren);
          // HyperCities.mainMap.addProgressbarPending(totalChildren);
        }

        setTimeout(function () {
          var childId = children.shift();

          _setCheckBoxStatus(childId, true);

          if ( children.length > 0 ) {
            setTimeout(arguments.callee, 10);
          }

          // Update Progressbar
          // HyperCities.debug($checkerId + "(" +folderId + ") Step 1");
          // setTimeout(HyperCities.mainMap.addProgressbarFinished, 10, 1);

        }, 10);
      }

      // Enable the Link, edit Icon and bind hover event for Item
      if ( !isCollection ) {
        $("."+CLASSES.markerLink, targetDom.next())
          .addClass(CLASSES.enabled)
          .hover(
            function () {
              HyperCities.collectionList.highlightItem(folderId);
            },
            function () {
              HyperCities.collectionList.unHighlightItem(folderId);
            }
        );
      }

      if ( !isCollection || isExternal ) {
        _appendEditIcon(folderDom, $checkerId);
      }

      // Show Loading Icon for External Collection
      if ( isExternal ) {
        folderDom.find("img." + CLASSES.loading).show();
        $("."+CLASSES.editItem, targetDom.next()).show();
      }

    //TODO:: implement Default Check Logic
    }

    // Overlay the Item on Map. Do not overlay for collections
    if ( !isCollection ) {
      HyperCities.HCObject.show($checkerId);
    }

    if ( $.inArray($checkerId, _checked) < 0 ) {
      _checked.push($checkerId);
    }
  };

  // unCheck all checkBox with the same id
  var _uncheckItem = function ($checkerId) {

    var currentRoot   = _getCurrentRoot(),
      index         = 0,
      totalChildren = 0,
      isCollection  = true,
      isExternal    = false,
      checkerIndex,
      folderDom,
      children,
      targetDom,
      targetArray = currentRoot.find("." + CLASSES.checkBox + $checkerId);

    index = targetArray.length;
    // uncheck every checkbox that has the same ID
    while ( index-- > 0 ) {
      targetDom = $(targetArray[index]);

      targetDom.removeClass(CLASSES.checked);

      // Get Folder Information
      folderDom = targetDom.parent();
      isCollection = folderDom.hasClass(CLASSES.collection);
      isExternal = folderDom.hasClass(CLASSES.external);

      // Get Children Information
      children = $.map(folderDom.find(">ul>li"),
        function ($node){
          return $($node).data("id");
        }
      );
      totalChildren = children.length;

      // uncheck each child by yielding processes
      if ( totalChildren > 0 ) {
        setTimeout(function () {
          var childId = children.shift();

          _setCheckBoxStatus(childId, false);

          if ( children.length > 0 ) {
            setTimeout(arguments.callee, 10);
          }
        }, 10);
      }

      // Disable the Link for Item
      if ( !isCollection ) {
        $("."+CLASSES.markerLink, targetDom.next())
          .removeClass(CLASSES.enabled)
          .unbind('mouseenter mouseleave');

        $("."+CLASSES.editItem, targetDom.next()).hide();
      }

      if ( isExternal ) {
        $("."+CLASSES.editItem, targetDom.next()).hide();
      }
    //TODO:: remove parent's check if it's not default check
    }

    // remove Overlay of the Item (or KML)
    if ( isExternal || !isCollection ) {
      HyperCities.HCObject.hide($checkerId);
    }

    // If necessary, close infoWindow
    if ( $checkerId === HyperCities.session.get("infoWin") ) {
      HyperCities.mainMap.closeHCInfoWindow();
    }

    checkerIndex = $.inArray($checkerId, _checked);
    if ( checkerIndex >= 0 ) {
      _checked.splice(checkerIndex, 1);
    }
  };

  /**
   * Event handler for user clicking on Narrative Mode icon. Should
   * not be called except by event handler.
   */
  var _openNarrativePanel = function ($event) {

    var folderDom    = $($event.target).parent().prev(),
      itemId       = folderDom.data("id"),
      collectionId = folderDom.parent().parent().parent().data("id");

    $($event.target).blur();
    // Alternate method for opening narrative of root folder in Single-Collection mode
    if (typeof(itemId) == 'undefined' || itemId == null) {
      itemId = $($event.target).parent().parent().data("id");
    }

    //HyperCities.debug(_id + "[A2] Open Narrative of item " + itemId + " under collection " + collectionId);

    // Google Analytics Event Tracker
    HyperCities.util.eventTracker(HyperCities.config.EVENT_DETAIL_COLLECTION, itemId);
    HyperCities.narrativePanel.load(itemId, {
      zoom: true,
      parentId: collectionId
    });

    return false;
  };

  /**
   * Open InfoWindow of certain object
   */
  var _openItemInfoWindow = function ($event) {

    var folderDom    = $($event.target).parent().prev(),
      itemId       = folderDom.data("id"),
      collectionId = folderDom.parent().parent().parent().data("id");

    $($event.target).blur();

    // If item URL is not enabled, do nothing
    if ( $($event.target).hasClass(CLASSES.enabled) ) {
      HyperCities.HCObject.showInfoWindow(itemId, 
        {collectionId: collectionId}
      );
    }

    return false;
  };

  /**
   * Open the edit media panel
   * The interface is the same as add media panel, except that
   * the objectId and type should pass into load function as arguments.
   */
  var _openEditMediaPanel = function ($event) {

    var folderDom  = $($event.target).parent().prev(),
      itemId     = parseInt(folderDom.data("id")),
      parentId   = parseInt(folderDom.parent().parent().parent().data("id")),
      isExternal = folderDom.hasClass(CLASSES.external),
      itemObject = HyperCities.HCObject.get(itemId),
      params     = {fmt: "mhc", cid: itemId, pid: parentId};

    $($event.target).blur();

    if (HyperCities.user.isLogin() === true) { // Make sure user is login
      if (itemObject) {
        // We should have the object in HCObject Class before editing
        // however, the information we have is limited.
        // Get detail data before start editing
        $.get("./queryCollectionData.php", params,
          function ($data) {
            // Open objectEdit Panel
            HyperCities.objectEditPanel.load(itemId, {
                //"objectType": itemObject.objectType,
                "objectType": $data.objectType,
                "markerType": itemObject.markerType,
                "parentId"  : parentId,
                "objectData": $data
              }
            );

            // Make the overlay of object editable
          },
          "json"
        );
      } else {
        alert("Error on opening the object.")
      }
    }

    return false;
  };

  /**
   * Zoom to the extent of a collection's bounds. Event handler.
   */
  var _zoomToCollection = function ($event) {
    var folderDom    = $($event.target).parent().prev(),
      collectionId = folderDom.data("id");
    $($event.target).blur();
    HyperCities.HCObject.zoomTo(collectionId);
    return false;
  };

  /**
   * Update Dom Node of single Placemark based on $data. If the dom does not
   * exist,  call _createPlacemark to create the new dom, and append it to
   * $parentNode.
   *
   * @param {node} $parentNode Node to which to append data
   * @param {xml/json} $data data to parse
   * @param {array} $outList
   * @param {array} $checkList
   * @return {dom element} The marker dom element.
   */
  var _updatePlacemark = function ($parentNode, $data, $outList, $checkList) {
    //HyperCities.debug(_id + "[A2] Update Placemark");

    var markerName    = $("name:first", $data).text(),
      markerUrl     = decodeURI($("[nodeName=atom:link]", $data).attr("href")),
      markerId      = parseInt($($data).attr("id")),
      ownerId       = parseInt($("ExtendedData:last > [nodeName=hc:ownerId]", $data).text()),
      stateId       = parseInt($("ExtendedData:last > [nodeName=hc:stateId]", $data).text()),
      markerTypeId  = parseInt($("ExtendedData:last > [nodeName=hc:markerType]", $data).text()),
      //isEarthObject = parseInt($("ExtendedData:last > [nodeName=hc:earthObject]", $data).text()),
      isEarthObject = 1,
      zoomLevel     = parseInt($("ExtendedData:last > [nodeName=hc:zoom]", $data).text()),
      viewFormat    = $("ExtendedData:last > [nodeName=hc:viewFormat]", $data).text(),
      view          = ($("[nodeName=hc:view]", $data).children().length === 0) ?
              null: (new XMLSerializer()).serializeToString(
              $("[nodeName=hc:view]", $data).children().get(0)),
      bBox          = HyperCities.util.parseBoundingBox(viewFormat),
      isInView      = HyperCities.mainMap.isInView(bBox),
      isChecked     = ($.inArray(parseInt(markerId), _checked) !== -1),
      markerState   = parseInt($("ExtendedData:last > [nodeName=hc:markerState]", $data).text()),
      parentChecked = ($.inArray(parseInt($parentNode.parent().data("id")), _checked) !== -1),
      markerDom     = null,
      markerAttr    = {},
      markerIndex   = null,
      dateFrom      = $("TimeSpan > begin",$data).text(),
      dateTo        = $("TimeSpan > end",$data).text(),
      //isEditable    = HyperCities.user.hasUpdatePrivilege(markerId, ownerId, stateId),
      domHtml       = ['<a href="', markerUrl, '" class="', CLASSES.markerLink, '">', markerName, '</a>'],
      editDomHtml   = ['<img src="./images/editIcon.gif" alt="Edit" title="Edit ', markerName, '" class="', CLASSES.editItem, '"/>'];

    // If item is not in view, don't event try to update it
    if ( !isInView ) {
      return false;
    }

    // update checker status
    if ( isChecked || parentChecked ) {
      markerIndex = $.inArray(markerId, $checkList.item);
      // Item not checked, check it (add it to $checkList.item)
      if ( markerIndex < 0 ) {
        $checkList.item.push(markerId);
      }
      isChecked = true;
    }

    // try to get marker dom
    markerDom = $("li." + CLASSES.item + markerId, $parentNode);
               
    // if marker dom does not exist, create dom
    if ( markerDom.length <= 0 ) { 
      //HyperCities.debug(_id + "[A2] Create Placemark " + markerId);
      markerAttr = {
        name             : markerName,
        ownerId          : ownerId,
        stateId          : stateId,
        markerType       : markerTypeId,
        markerState      : markerState,
        view             : view,
        dateFrom         : dateFrom,
        dateTo           : dateTo,
        markerUrl        : markerUrl,
        markerKml        : $data,
        zoomLevel        : zoomLevel,
        bounds           : bBox,
        isExternal       : false,
        isHidden         : (!isInView || !isChecked),
        isEarthObject    : isEarthObject
      };

      if (isEarthObject) {
        markerDom = _create3DPlacemark(markerId, markerAttr);
      } else {
        markerDom = _createPlacemark(markerId, markerAttr);
      }
    }

    // we are safe to update markerDom now
//    HyperCities.debug(_id + "[A2] Update Placemark " + markerId);

    // Since item still be shown in collection tree, remove it from $outList.item
    markerIndex = $.inArray(markerId, $outList.item);
    if ( markerIndex >= 0 ) {
      $outList.item.splice(markerIndex, 1);
    }

    // Check Earth Object (Now everything is earth)
    //if ( isEarthObject === 1 ) {
    //  domHtml[5] = "(E) " + markerName;
    //}

    // Update Link Name
    markerDom.find("> div." + CLASSES.marker).html(domHtml.join (''));

    // Update CheckBox Style
    if ( isChecked ) {
      markerDom.find("." + CLASSES.checkBox).addClass(CLASSES.checked);
    } 
    else {
      markerDom.find("." + CLASSES.checkBox).removeClass(CLASSES.checked);
    }

    /*
    // the following codes have been moved to _checkItem()
    // Update Edit Button, item only editable when it was checked
    if ( !isEditable ) {
      markerDom.find("." + CLASSES.editItem).remove();
    } 
    else {
      markerDom.find("." + CLASSES.markerLink).before(editDomHtml.join (''));
    }
    */

    return markerDom;
  };

  /**
   * Update Dom Node of single NetworkLink based on $data, if the dom not exist,
   * call _createNetworkLink to create the new dom, and append it to $parentNode.
   * returns the link dom element.
   *
   * @param {node} $parentNode node Node to which to append data
   * @param {xml/json} $data xml to parse
   * @param {array} $outList
   * @param {array} $checkList
   * @return {dom element} The marker dom element.
   */
  var _updateNetworkLink = function ($parentNode, $data, $outList, $checkList) {
    var data = $($data).children("ExtendedData:last");

    var linkName      = $("name:first", $data).text(),
      linkUrl       = decodeURI($("[nodeName=link] > href", $data).text()),
      linkId        = $($data).attr("id"),
      totalChildren = parseInt($("[nodeName=hc:totalChildren]", data).text()),
      boundChildren = parseInt($("[nodeName=hc:boundChildren]", data).text()),
      isExternal    = parseInt($("[nodeName=hc:external]", data).text()),
      ownerId       = parseInt($("[nodeName=hc:ownerId]", data).text()),
      stateId       = parseInt($("[nodeName=hc:stateId]", data).text()),
      viewFormat    = $("[nodeName=hc:viewFormat]", data).text(),
      view          = ($("[nodeName=hc:view]", data).children().length === 0) ?
              null: (new XMLSerializer()).serializeToString(
              $("[nodeName=hc:view]", data).children().get(0)),
      isEarthObject = parseInt($("[nodeName=hc:earthObject]", data).text()),
      bBox          = HyperCities.util.parseBoundingBox(viewFormat),
      isInView      = HyperCities.mainMap.isInView(bBox),
      preventUpdate = parseInt($("[nodeName=hc:preventUpdate]", data).text()),
      isOpened      = ($.inArray(parseInt(linkId), _opened) !== -1),
      isChecked     = ($.inArray(parseInt(linkId), _checked) !== -1),
      parentChecked = ($.inArray(parseInt($parentNode.parent().data("id")), _checked) !== -1),
      checkerDom    = null,
      dateFrom      = $("TimeSpan > begin",$data).text(),
      dateTo        = $("TimeSpan > end",$data).text(),
      linkDom       = null,
      linkAttr      = {},
      linkIndex     = null,
      //isEditable    = HyperCities.user.hasUpdatePrivilege(linkId, ownerId, stateId),
      updateFolder  = false,
      domHtml       = ['<img src="./images/navIcon.gif" alt="Narrative Mode" title="Open ', linkName, 
               ' in Narrative Mode" class="', CLASSES.narrative, '"/>',
               '<a href="', linkUrl, '" title="Zoom to ', linkName, '" class="', CLASSES.folderLink, '">',
               linkName, '</a>', ' (', boundChildren, '/', totalChildren, ')',
               '<img src="./images/loading.gif" alt="Loading..." class="', CLASSES.loading, '"/>'],
      editDomHtml   = ['<img src="./images/editIcon.gif" alt="Edit" title="Edit ', linkName, '" class="', CLASSES.editItem, '"/>'];

    // HyperCities.debug(_id + "[A2] Update NetworkLink " + linkId);

    // If item is not in view, or it has no children, don't event try to update it
    if ( !isInView || (isNaN(totalChildren) && (isExternal === 0)) ) {
      return false;
    }

    // update checker status
    if ( isChecked || parentChecked ) {
    linkIndex = $.inArray(linkId, $checkList.item);
    // Item not checked, check it (add it to $checkList.item)
    if ( linkIndex < 0 ) {
    $checkList.item.push(linkId);
    }
    isChecked = true;
    }

    // Try to get link dom
    linkDom = $("li." + CLASSES.collection + linkId, $parentNode);

    // If link dom doesn't exist, create a new one
    if ( linkDom.length <= 0 ) {
      //HyperCities.util.debug (_id + "Adding new dom for " + linkId)
      linkAttr = {
        name       : linkName,
        ownerId    : ownerId,
        stateId    : stateId,
        linkUrl    : linkUrl,
        dateFrom         : dateFrom,
        dateTo           : dateTo,
        bounds     : bBox,
        view       : view, 
        isExternal : (isExternal === 1),
        isHidden   : (!isInView || !isChecked),
        isEarthObj : (isEarthObject === 1)
      };

      linkDom = _createNetworkLink(linkId, linkAttr);

      // Setup Open State
      // if link is external then it can only be checked, 
      // and cannot be opened (so remove div.CLASSES.hitarea)
      if ( isExternal ) {
        linkDom.addClass(CLASSES.external)
          .find(">div." + CLASSES.hitarea)
          .remove().end()
          .find(">div." + CLASSES.checkBox)
          .addClass(CLASSES.external).end()
          .find(">div." + CLASSES.folder)
          .addClass(CLASSES.external);
      }
      // It's not external, and thus can be opend
      else {
        // set folder collapsable if it's opened
        if ( isOpened ) {
          linkDom.addClass(CLASSES.collapsable)
            .find(">div." + CLASSES.hitarea)
            .addClass(CLASSES.collapsableHitarea).end()
            .find(">ul").show();
        }
        // set folder expandable if it's closed
        else {
          linkDom.addClass(CLASSES.expandable)
            .find(">div." + CLASSES.hitarea)
            .addClass(CLASSES.expandableHitarea).end()
            .find(">ul").hide();
        }
      }
    }

    // we are safe to update linkDom now 
//    HyperCities.debug(_id + "[A2] Update NetworkLink " + linkId);

    // Since item still be shown in collection tree, remove it from $outList.item
    linkIndex = $.inArray(linkId, $outList.item);
    if ( linkIndex >= 0 ) {
      $outList.item.splice(linkIndex, 1);
    }

    // Check Earth Object
    if ( isEarthObject === 1 ) {
      domHtml[12] = "(E) " + linkName;
    }

    // If there's no total children number, just display folder name, (in this case, also remove narrative Icon)
    // If there's no bound children number, just display total children number
    boundChildren = parseInt(linkDom.data("boundChildren"));
    if ( isExternal || isNaN(totalChildren) ) {
      domHtml.splice(16, 2); // remove "NaN" from list
      domHtml.splice(14,6); // Remove folder children counter
      domHtml.splice(0,5);  // Remove Narrative Icon
    }
    else if ( isNaN(boundChildren) || !isOpened ) {
      domHtml.splice(15,2); // Remove folder boundChildren counter
    }
    else {
      domHtml[15] = boundChildren;
    }

    // Update Link Name
    linkDom.data("totalChildren", totalChildren)
      .data("boundChildren", boundChildren)
      .data("name", linkName)
      .data("uri", linkUrl)
      .find(">div." + CLASSES.folder)
      .html(domHtml.join (''))
      .find("img." + CLASSES.loading).hide();

    // Update CheckBox Style
    if ( isChecked ) {
      linkDom.find("." + CLASSES.checkBox).addClass(CLASSES.checked);
    }
    else {
      linkDom.find("." + CLASSES.checkBox).removeClass(CLASSES.checked);
    }

    /*
    // the following codes have been moved to _checkItem()
        // Update Edit Button, item only editable when it was checked
        if ( !isEditable ) {
            linkDom.find("." + CLASSES.editItem).remove();
        }
        else {
            linkDom.find("." + CLASSES.folderLink).before(editDomHtml.join (''));
        }
    */

    // Update Link Children if it's open or checked, and not been updated
    if ( !preventUpdate && (isOpened || isChecked ) ) {
      _getCollection(linkId, isExternal);
    }

    return linkDom;
  };

  var _removeItem = function ($parentNode, $itemId) {

    var childNode = $("li." + CLASSES.collection + $itemId + ">ul", $parentNode),
      children,
      totalChildren;

    // Get Children Information and recursivly remove all children
    children = $.map(childNode.find(">li"), 
      function ($node) {
        return $($node).data("id");
      }
    );

    totalChildren = children.length;
    _progressCount += totalChildren;

//    HyperCities.debug(_id + "[A2] Progress Count (RemoveItem " + $itemId + " Add children)" + _progressCount);
    while ( totalChildren-- > 0 ) {
      _removeItem(childNode, children[totalChildren]);
    }

    // After remove all children, we remove item itself
    HyperCities.HCObject.removeObject($itemId);

    if ( $("li." + CLASSES.item + $itemId, $parentNode).length > 0 ) {
      // Remove Dom Element
      _removePlacemark($parentNode, $itemId);
    }
    else if ( $("li." + CLASSES.collection + $itemId, $parentNode).length > 0 ) {
      // Remove Dom Element
      _removeNetworkLink($parentNode, $itemId);
    }

        // If necessary, close infoWindow
        if ( parseInt($itemId) === HyperCities.session.get("infoWin") ) {
            HyperCities.mainMap.closeHCInfoWindow();
        }
    };

  var _removeNetworkLink = function ($parentNode, $linkId) {
    // HyperCities.debug(_id + "[A2] Remove NetworkLink " + $linkId);

    var currentRoot = _getCurrentRoot(),
      targetArray = $("li." + CLASSES.collection + $linkId, $parentNode),
      isLastNode,
      index,
      targetDom;

    // Remove Dom
    index = targetArray.length;
    while ( index-- > 0 ) {
      targetDom = $(targetArray[index]);
      isLastNode = ( targetDom.hasClass(CLASSES.lastCollapsable) 
        || targetDom.hasClass(CLASSES.lastExpandable) 
        || targetDom.hasClass(CLASSES.last)
      );

      // if is last element, apply last class to previous element
      if ( isLastNode ) {
        _applyLastClass(targetDom.prev("li"));
      }

      targetDom.remove();
    }

    _progressCount--;

    // HyperCities.debug(_id + "[A2] Progress Count (Remove NetworkLink " + $linkId + ")" + _progressCount);
    currentRoot.trigger('HCUpdateFinish');
  };

  var _removePlacemark = function ($parentNode, $markerId) {
    // HyperCities.debug(_id + "[A2] Remove Placemark " + $markerId);

    var currentRoot = _getCurrentRoot(),
      targetArray = $("li." + CLASSES.item + $markerId, $parentNode),
      isLastNode,
      index,
      targetDom;

    // Remove Dom
    index = targetArray.length;
    while ( index-- > 0 ) {
      targetDom = $(targetArray[index]);
      isLastNode = targetDom.hasClass(CLASSES.last);

      // if is last element, apply last class to previous element
      if ( isLastNode ) {
        _applyLastClass(targetDom.prev("li"));
      }

      targetDom.remove();
    }

    _progressCount--;
    // HyperCities.debug(_id + "[A2] Progress Count (Remove Placemark " + $markerId + ")" + _progressCount);
    currentRoot.trigger('HCUpdateFinish');
  };

  // update folder dom according to $data
  var _updateFolder = function ($folderDom, $data) {

    var currentRoot = _getCurrentRoot(),
      index       = 0,
      outList     = {}, // Only Object can passed by reference, list to be removed
      checkList   = {}, // Only Object can passed by reference, list to be checked
      childrenList,
      totalChild,
      totalUpdated = 0,
      childDom,
      domHtml,
      tempDom,
      newDom = $(document.createElement("ul"));

    outList.item = $.map($folderDom.find(">li"), function ($node){
      return $($node).data("id");
    });
    checkList.item = [];

    childrenList = $($data).children(
      "[nodeName=Placemark], [nodeName=NetworkLink], [nodeName=Folder]"
    );
    totalChild = childrenList.length;
    while ( index < totalChild ) {

      childDom = childrenList[index++];

      // Append dom nodes for NetworkLink (Collection)
      if ( childDom.nodeName == "NetworkLink" ) {
        tempDom = _updateNetworkLink($folderDom, childDom, outList, checkList);
        HyperCities.search.addResult(HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK);
      }
      // Append dom nodes for Placemark (Object)
      else if ( childDom.nodeName == "Placemark" ) {
        tempDom = _updatePlacemark($folderDom, childDom, outList, checkList);
        HyperCities.search.addResult(HyperCities.config.HC_OBJECT_TYPE.PLACEMARK);
      } else if ( childDom.nodeName == "Folder") {
        var id = parseInt($(childDom).attr('id'));
        _updated.push(id);
        tempDom = _updateNetworkLink ($folderDom, childDom, outList, checkList);
        _setFolderStatus (id, true, false, tempDom);
        _updateFolder($('ul', tempDom), $(childDom));
      } else {
        tempDom = false;
      }

      if ( tempDom != false ) {
        totalUpdated++;
        newDom.append(tempDom);
        tempDom = null;
      }
    }
    $folderDom.append(newDom.find(">li"));
    newDom = null;

    // Remove Last class for not-last elements
    $folderDom.find(">li:not(:last-child)")
      .removeClass(CLASSES.last)
      .removeClass(CLASSES.lastCollapsable)
      .removeClass(CLASSES.lastExpandable).end()
      .find(">li>div." + CLASSES.hitarea + ":not(:last-child)")
      .removeClass(CLASSES.lastCollapsableHitarea)
      .removeClass(CLASSES.lastExpandableHitarea);

    // Remove objects still in outList After update all Item
    while ( (outList.item).length > 0 ) {
      _removeItem($folderDom, (outList.item).shift());
    }

    // We are safe to check all objects that in checkList now, because all new dom were append
    while ( (checkList.item).length > 0 ) {
      _checkItem((checkList.item).shift());
    }

    // Update Last Dom Element Class
    _applyLastClass($folderDom.find(">li:last"));

    // Update bounded children and prepare new counter of folder 
    tempDom = $folderDom.parent();
    tempDom.data("boundChildren", totalUpdated);
    domHtml = [ 
      '<img src="./images/navIcon.gif" alt="Narrative Mode" title="Open ',
      tempDom.data("name"),
      ' in Narrative Mode" class="', CLASSES.narrative, '"/>',
      '<a href="', tempDom.data("uri"), '" title="Zoom to ',
      tempDom.data("name"), '" class="', CLASSES.folderLink, '">',
      tempDom.data("name"), '</a>', ' (', totalUpdated, '/',
      tempDom.data("totalChildren"), ')',
      '<img src="./images/loading.gif" alt="Loading..." class="',
      CLASSES.loading, '"/>'
    ];

    if (isNaN(tempDom.data("totalChildren"))) {
      domHtml.splice(16,2);
    }

    // Root Folder, remove Narrative Icon and Zoom in link
                
    if ( tempDom.find(">div." + CLASSES.folder).hasClass(CLASSES.noCheckBox) && HyperCities.session.get("baseCollection") !== 0) {
      domHtml.splice(0,12);
      domHtml.splice(1,1);
    }

    // External Link, remove Narrative Icon 
    if ( tempDom.find(">div." + CLASSES.folder).hasClass(CLASSES.external) ) {
      domHtml.splice(0,5);
    }

    // Update folder Name and remove loading icon 
    tempDom.find(">div." + CLASSES.folder)
      .html(domHtml.join(''))
      .find("img." + CLASSES.loading).hide();

    // Show message if no item in view
    if ( totalUpdated > 0 ) {
      $folderDom.find(">li." + CLASSES.noItem).hide();
    } else {
      $folderDom.find(">li." + CLASSES.noItem).show();
    }

    _progressCount--;
    //HyperCities.debug(_id + "[A2] Progress Count (Finish Update " + folderId +")" + _progressCount);

    currentRoot.trigger('HCUpdateFinish');
  };

  /**
   * Toggle folder event handler
   *
   * @param {Event} $event
   */
  var _toggleFolder = function ($event) {

    var currentRoot = _getCurrentRoot(),
      folderDom   = $($event.target).parent(),
      folderId    = parseInt(folderDom.data("id")),
      folderIndex = $.inArray(folderId, _opened);

    if ( typeof(folderId) !== 'undefined' ) {
      if ( folderIndex >= 0 ) {     // collapse Collection
        _setFolderStatus(folderId, false);
      }
      else {                                // expand Collection
        _setFolderStatus(folderId, true);
      }
    }

    currentRoot.trigger('HCUpdateFinish');
  };

  /**
   * Check or uncheck folder.
   *
   * @param {Integer} $folderId Id of folder to check or uncheck
   * @param {boolean} $opened Whether folder shoudl be opened or closed.
   * @param {boolean} $doUpdate Whether to update the folder's contents once
   *                it has been opened. Defaults to True.
   * @param {dom} $folderDom Optional folder dom to manipulate
   */
  var _setFolderStatus = function ($folderId, $opened, $doUpdate, $folderDom) {

    var currentRoot = _getCurrentRoot(),
      folderIndex = $.inArray($folderId, _opened),
      folderDom   = null,
      isExternal  = false,
      domHtml     = null;

    if (typeof ($folderDom) != 'undefined') {
      folderDom = $($folderDom);
    } else {
      folderDom = currentRoot.find("li." + CLASSES.collection + $folderId);
    }

    // Get folder status
    isExternal = folderDom.hasClass(CLASSES.external);
    domHtml = [
      '<img src="./images/navIcon.gif" alt="Narrative Mode" title="Open ',
      folderDom.data("name"), ' in Narrative Mode" class="',
      CLASSES.narrative, '"/>', '<a href="', folderDom.data("uri"),
      '" title="Zoom to ', folderDom.data("name"), '" class="',
      CLASSES.folderLink, '">', folderDom.data("name"), '</a>', ' (',
      folderDom.data("boundChildren"), '/',
      folderDom.data("totalChildren"), ')',
      '<img src="./images/loading.gif" alt="Loading..." class="',
      CLASSES.loading, '"/>'
    ];

    // Folder closed, remove bound Children count
    if ( !$opened || isNaN(folderDom.data("boundChildren")) ) {
      domHtml.splice(15,2);
    }

    if ( !$opened || isNaN(folderDom.data("totalChildren")) ) {
      domHtml.splice(14,domHtml.length-14);
    }


    // Root Folder, remove Narrative Icon and Zoom in link
    if (folderDom.find(">div."+CLASSES.folder).hasClass(CLASSES.noCheckBox)) {
      domHtml.splice(0,12);
      domHtml.splice(1,1);
    }

    // External Link, remove Narrative Icon
    if (folderDom.find(">div."+CLASSES.folder).hasClass(CLASSES.external)) {
      domHtml.splice(0,5);
    }

    if ( $opened && (folderIndex < 0) ) { // Should Be Opened and Not Opened
      //HyperCities.debug(_id + "Folder " + $folderId + " Opened");
      _opened.push($folderId);
      // Google Analytics Event Tracker
      HyperCities.util.eventTracker(HyperCities.config.EVENT_LIST_COLLECTION, $folderId);

      if ( !isExternal ) { // Show Children only if it's not external collection
        folderDom.removeClass(CLASSES.expandable)
          .addClass(CLASSES.collapsable)
          .filter("." + CLASSES.lastExpandable)
          .removeClass(CLASSES.lastExpandable)
          .addClass(CLASSES.lastCollapsable).end()
          .find(">div." + CLASSES.hitarea)
          .removeClass(CLASSES.expandableHitarea)
          .addClass(CLASSES.collapsableHitarea)
          .filter("." + CLASSES.lastExpandableHitarea)
          .removeClass(CLASSES.lastExpandableHitarea)
          .addClass(CLASSES.lastCollapsableHitarea).end().end()
          .find(">ul").show().end()
          .find(">div." + CLASSES.folder)
          .html(domHtml.join(''));
      }
      if (typeof ($doUpdate) == 'undefined' || $doUpdate == true) {
        _getCollection($folderId, isExternal);
      }
    }
    else if ( !$opened && (folderIndex >= 0) ) { // Open but should be closed
      //HyperCities.debug(_id + "Folder " + $folderId + " Closed");
      _opened.splice(folderIndex, 1);
      if ( !isExternal ) { // Hide Children only if it's not external collection
        folderDom.removeClass(CLASSES.collapsable)
          .addClass(CLASSES.expandable)
          .filter("." + CLASSES.lastCollapsable)
          .removeClass(CLASSES.lastCollapsable)
          .addClass(CLASSES.lastExpandable).end()
          .find(">div." + CLASSES.hitarea)
          .removeClass(CLASSES.collapsableHitarea)
          .addClass(CLASSES.expandableHitarea)
          .filter("." + CLASSES.lastCollapsableHitarea)
          .removeClass(CLASSES.lastCollapsableHitarea)
          .addClass(CLASSES.lastExpandableHitarea).end().end()
          .find(">ul").hide().end()
          .find(">div." + CLASSES.folder)
          .html(domHtml.join(''))
          .find("img." + CLASSES.loading).hide();
      }
    }
    };

  /**
   * Toggle CheckBox event handler
   *
   * @param {Event} $evnet
   */
  var _toggleCheckBox = function ($event) {

        var checkerDom   = $($event.target),
      folderDom    = $($event.target).parent(),
      itemId       = parseInt(folderDom.data("id")),
      checkerId    = parseInt(checkerDom.data("id")),
      itemObject   = HyperCities.HCObject.get(checkerId),
      checkerIndex = $.inArray(checkerId, _checked);
/*
    if ((HyperCities.mainMap.getCurrentMapType() !== G_SATELLITE_3D_MAP) &&
      (itemObject.objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT || 
      itemObject.objectType === HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK)) {
      var ans = confirm("This is a 3D object. Do you want to switch to earth mode to edit it?");
      if (!ans) {
        return;
      } else {
        HyperCities.mainMap.setMapType("EARTH");
      }
    }
*/
        if ( typeof(checkerId) !== 'undefined' ) {
            if ( checkerIndex >= 0 ) { // Already Checked, so uncheck it
                _setCheckBoxStatus(checkerId, false);
            }
            else { // Not Checked, so check it
                _setCheckBoxStatus(checkerId, true);
            }
        }

    // HyperCities.util.debug(_checked);
    };

  /**
   * Sets status of checkbox.
   *
   * @param {Integer} $checkerId (the same as Object Id)
   * @param {Boolean} the check status need to be set
   */
  var _setCheckBoxStatus = function ($checkerId, $checked) {

    var checkerIndex = $.inArray($checkerId, _checked);

    if ( $checked && (checkerIndex < 0) ) { // Should Be Checked and Not Checked
      // HyperCities.debug(_id + "Folder " + $checkerId + " checked");
      _checkItem($checkerId);
    }
    else if ( !$checked && (checkerIndex >= 0) ) { // Should Be unchecked and still Checked
      // HyperCities.debug(_id + "Folder " + $checkerId + " unchecked");
      _uncheckItem($checkerId);
    }
  };

  /**
   * Create dom element of Folder
   */ 
  var _createFolder = function ($folderId, $folderAttr) {

    var folderDom = $(document.createElement("li")),
      childDom  = $(document.createElement("ul")),
      domHtml   = ['<div class="', CLASSES.hitarea, '"></div>',
             '<div class="', CLASSES.folder, ' ', 
             CLASSES.noCheckBox, '"></div>'
           ],
      msgHtml   = ['<li class="', CLASSES.noItem, 
        '">No item available in current view</li>'
      ];


    if (HyperCities.session.get("baseCollection") !== 0 ) {
      domHtml = ['<div class="', CLASSES.hitarea, '"></div>',
              '<div class="', , '"></div>',
              '<div class="', CLASSES.folder, '"></div>']
    }
    
    var html = $(document.createElement("li"));
    html.data("id", $folderId)
      .addClass(CLASSES.collection)
      .addClass(CLASSES.collection + $folderId)
      .html(domHtml.join(''))
      .append(childDom.html(msgHtml.join('')));

        // Don't put folderId in element's id attribute, it's not unique in dom tree.
        folderDom.data("id", $folderId)
      .addClass(CLASSES.collection)
      .addClass(CLASSES.collection + $folderId)
      .html(domHtml.join(''))
      .append(childDom.html(msgHtml.join('')));

    // Add Item to HyperCities.HCObject
    HyperCities.HCObject.addObject(HyperCities.config.HC_OBJECT_TYPE.FOLDER,
                     $folderId, $folderAttr);
        return folderDom;
    };

  /**
   * Create dom element of NetworkLink
   */
    var _createNetworkLink = function ($linkId, $linkAttr) {
    var linkDom    = $(document.createElement("li")),
      childDom   = $(document.createElement("ul")),
      linkType   = HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK,
      domHtml    = ['<div class="', CLASSES.hitarea, '"></div>',
              '<div class="', CLASSES.checkBox, '"></div>',
              '<div class="', CLASSES.folder, '"></div>'],
      msgHtml    = ['<li class="', CLASSES.noItem, 
              '">No item available in current view</li>'
             ];

    // Don't put linkId in element's id attribute, it's not unique in dom tree.
    linkDom.data("id", $linkId)
      .addClass(CLASSES.collection)
      .addClass(CLASSES.collection + $linkId)
      .html(domHtml.join (''))
      .append(childDom.html(msgHtml.join('')));
                        
    if (typeof($linkAttr.opened) != 'undefined' && $linkAttr.opened == true) {
      linkDom.addClass(CLASSES.collapsable);
    }
    // Setup CheckBox
    checkerDom = $("." + CLASSES.checkBox, linkDom);
    checkerDom.data("id", $linkId)
      .addClass(CLASSES.checkBox + $linkId);

    // Add Item to HyperCities.HCObject
    if ( $linkAttr.isEarthObj ) {
      linkType = HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK;
    }

    HyperCities.HCObject.addObject(linkType, $linkId, $linkAttr);

        return linkDom;
    };

  /**
   * Create dom element of Placemark
   */
  var _createPlacemark = function ($markerId, $markerAttr) {

    var markerDom     = $(document.createElement("li")),
      checkerDom    = null,
      objectType    = HyperCities.config.HC_OBJECT_TYPE.PLACEMARK,
      domHtml       = [
        '<div class="', CLASSES.checkBox, '"></div>',
        '<div class="', CLASSES.marker, '"></div>'
      ];

    // Don't put markerId in element's id attribute, it's not unique in dom tree.
    markerDom.data("id", $markerId)
      .addClass(CLASSES.item)
      .addClass(CLASSES.item + $markerId)
      .html(domHtml.join (''));

    // Set CheckBox Style
    checkerDom = $("." + CLASSES.checkBox, markerDom);
    checkerDom.data("id", $markerId)
      .addClass(CLASSES.checkBox + $markerId);

    // Add Item to HyperCities.HCObject
    HyperCities.HCObject.addObject(objectType, $markerId, $markerAttr);

    return markerDom;
  };

  /**
   * Create dom element of 3D Placemark
   */
  var _create3DPlacemark = function ($markerId, $markerAttr) {

    var markerDom     = $(document.createElement("li")),
      checkerDom    = null,
      objectType    = HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT,
      domHtml       = [
        '<div class="', CLASSES.checkBox, '"></div>',
        '<div class="', CLASSES.marker, '"></div>'
      ];

    // Don't put markerId in element's id attribute, it's not unique in dom tree.
    markerDom.data("id", $markerId)
      .addClass(CLASSES.item)
      .addClass(CLASSES.item + $markerId)
      .html(domHtml.join (''));

    // Set CheckBox Style
    checkerDom = $("." + CLASSES.checkBox, markerDom);
    checkerDom.data("id", $markerId)
      .addClass(CLASSES.checkBox + $markerId);

    // Add Item to HyperCities.HCObject
    HyperCities.HCObject.addObject(objectType, $markerId, $markerAttr);

    return markerDom;
  };


  /**
   * Update colleciton list with a folder returned from the server, and all
   * open subfolders.
   *
   * @param {node} $parentNode Node at which to append the text
   * @param {xml/json} $data Data to be parsed
   * @param {boolean} $deep Whether to parse the lower levels of the collection
   *                        in $data. Defaults to false. Note: Setting this to
   *                        true prevents the collection list from doing
   *                        follow-up queries for subcollections.
   * @return {node} Node at which the folder was created
   *
   */
  var _parseFolder = function ($parentNode, $data, $deep) {
    // HyperCities.debug(_id + "[A2] Parse Folder");

    var folderName    = $("name:first", $data).text(),
      folderId      = $($data).attr("id"),
      totalChildren = parseInt(
        $("ExtendedData:first > [nodeName=hc:totalChildren]", $data).text()),
      boundChildren = parseInt(
        $("ExtendedData:first > [nodeName=hc:boundChildren]", $data).text()),
      hasCheckBox   = parseInt(
        $("ExtendedData:first > [nodeName=hc:checkBox]", $data).text()),
      ownerId       = parseInt(
        $("ExtendedData:last > [nodeName=hc:ownerId]", $data).text()),
      stateId       = parseInt(
        $("ExtendedData:last > [nodeName=hc:stateId]", $data).text()),
      isOpened      = ($.inArray(parseInt(folderId), _opened) !== -1),
      folderAttr    = {},
      folderDom     = null,
      domHtml       = [
        folderName, ' (', '', '/', totalChildren, ')',
        '<img src="./images/loading.gif" alt="Loading..." class="',
        CLASSES.loading, '"/>'
      ];

    // Try to get folder dom
    folderDom = $("li." + CLASSES.collection + folderId, $parentNode);

    // Skip the root level object
    // _skipList.push(folderId);

    // If folder dom doesn't exist, create a new one
    if (folderDom.length <= 0) {
      folderAttr = {
        name        : folderName,
        ownerId     : ownerId,
        stateId     : stateId,
        children    : totalChildren,
        hasCheckBox : (hasCheckBox === 1)
      };

      folderDom = _createFolder(folderId, folderAttr);

      // User's My Collection always show as first item
      if ( folderName === HyperCities.config.HC_COLLECTIONS.USER.name ) {
        folderDom.addClass(CLASSES.myCollection)
          .removeClass(CLASSES.lastCollapsable)
          .removeClass(CLASSES.lastExpandable)
          .find(">.hitarea")
            .removeClass(CLASSES.lastCollapsableHitarea)
            .removeClass(CLASSES.lastExpandableHitarea)
            .end()
          .prependTo($parentNode);
      } 
      else { // Other Folder appended as processing order
        $parentNode
          .find(">li:last")
            .removeClass(CLASSES.last)
            .removeClass(CLASSES.lastCollapsable)
            .removeClass(CLASSES.lastExpandable)
            .find(">.hitarea")
              .removeClass(CLASSES.lastCollapsableHitarea)
              .removeClass(CLASSES.lastExpandableHitarea)
              .end()
            .end()
          .append(folderDom);
      }
        }

    _progressCount+= folderDom.length;
    //HyperCities.debug(_id + "[A2] Progress Count (Begin Update " + folderId +")" + _progressCount);

    // If there's no total children number, just display folder name
    // If there's no bound children number, just display total children number
    boundChildren = parseInt(folderDom.data("boundChildren"));
    if (isNaN(totalChildren)) {
      domHtml.splice(1,5);
    } 
    else if (isNaN(boundChildren) || !isOpened) {
      domHtml.splice(2,2);
    } 
    else {
      domHtml[2] = boundChildren;
    }

        folderDom.each(
      function () {
        _progressCount--;

        // Update Open/Close Status
        if ( isOpened ) {
          $(this).addClass(CLASSES.collapsable)
            .find(">div." + CLASSES.hitarea)
              .addClass(CLASSES.collapsableHitarea)
              .end()
            .find(">ul")
            .show();
        }
        else {
          $(this).addClass(CLASSES.expandable)
            .find(">div." + CLASSES.hitarea)
              .addClass(CLASSES.expandableHitarea)
              .end()
            .find(">ul")
              .hide();
        }

        // Update title of Folder
        $(this).data("totalChildren", totalChildren)
          .data("boundChildren", boundChildren)
          .data("name", folderName)
          .data("uri", null)
          .find(">div." + CLASSES.folder)
            .html('<img src="./images/navIcon.gif" alt="Narrative Mode" '
              + 'title="Open in Narrative Mode" class="' +
            CLASSES.narrative + '"/> '+ domHtml.join (''))
          .find("img." + CLASSES.loading)
            .hide();

        // Update Tree Status
        if ( totalChildren <= 0 ) {
          $(this).removeClass(CLASSES.expandable)
            .find(">div." + CLASSES.folder)
              .prev().removeClass(CLASSES.hitarea);
        } else {
          $(this).addClass(CLASSES.expandable)
            .find(">div." + CLASSES.folder)
              .prev().addClass(CLASSES.hitarea);
        }

        // Load Update content of folder if it's opened
        if (typeof ($deep) !== 'undefined' || $deep == true) {
          _parseCollection($data);
        } else {
          if ( isOpened ) {
            _getCollection(folderId, false);
          }
        }
      }
    );

    if (folderDom.length >= 1) {
      return folderDom[0];
    } else {
      return null;
    }
    };

  /**
   * Parse collection list once it has been returned from the server.
   *
   * @param {xml/json} $data HyperCities Collection List, includes only
   *                         meta collections, i.e. My Collections,
   *                         Featured Collections, Partner Collections,
   *                         Classes, Public Collections, etc.
   */
  var _parseCollectionList = function ($data) {
        //    HyperCities.debug(_id + "[A2] Parse CollectionList");

        var treeRoot, treeChildren = [];

        // Create or Get collection tree root
        treeRoot = $("#treeviewWrapper");
        if ( treeRoot.length <= 0 ) {
            treeRoot = _initCollectionList();
        }

        // Reset Update Status
        _updated  = [];
        _skipList = [];
        _progressCount = 0;

        // Append folders to collection tree

    if ($("Document > Folder", $data).length == 0) {
      $("Document", $data).each(
        function () {
          var self = this;
          treeChildren.push(_parseFolder(treeRoot, self));
        }
      );
    } else {
      $("Document > Folder", $data).each(
        function () {
          var self = this;
          treeChildren.push(_parseFolder(treeRoot, self));
        }
      );
    }

    // Remove My Collection if user not login
    if ( HyperCities.user.getUserId() === null ) {
      // Remove My Collection
      if ( HyperCities.config.HC_COLLECTIONS.USER.id !== null ) {
        _removeItem(treeRoot, HyperCities.config.HC_COLLECTIONS.USER.id);
        HyperCities.config.HC_COLLECTIONS.USER.id = null;
      }
    }
        $("#treeviewWrapper").trigger('HCUpdateFinish');
        return treeChildren;
    };

  /**
   * Parse data for a specific collection once it has been returned from the 
   * server.
   * 
   * @param {xml/json} $data Data to be parsed.
   */
  var _parseCollection = function ($data) {

    var currentRoot = _getCurrentRoot(),
      folderXml,
      folderDom,
      folderId,
      index;

    if ($("Document", $data).length > 0) {
      folderXml = $("Document", $data);
    } else if ($($data).is("Folder")) {
      folderXml = $($data);
    } else if ($("Folder", $data).length > 0) {
      folderXml = $("Folder", $data);
    }

    folderId  = folderXml.attr("id");
    folderDom = currentRoot.find("li." + CLASSES.collection + folderId);

//    HyperCities.debug(_id + "[A2] Parse Collection " + folderId);

    _progressCount+= folderDom.length;
    //HyperCities.debug(_id + "[A2] Progress Count (Begin Update " + folderId +")" + _progressCount);

    index = folderDom.length;
    while ( index-- > 0 ) {
      _updateFolder($(">ul", folderDom[index]), folderXml);
    }
  };

  /**
   * Do AJAX query to get collection information from server.
   *
   * @param {Integer} $collectionId Collection identifier
   * @param {boolean} $isExternal Whether the collection is a KML network link.
   *                KML Network links are not updated in this way.
   */
  var _getCollection = function ($collectionId, $isExternal) {
    // HyperCities.debug(_id + "[A2] Get Collection");

    // Skip Update First Level Folder
    if ( $.inArray($collectionId, _skipList) >= 0 ) {
      // HyperCities.debug(_id + "[A2] Skip update Collection " + $collectionId);
      return;
    }

    var isUpdated = ($.inArray($collectionId, _updated) >= 0 ),
      currentRoot = _getCurrentRoot(),
      params = {
        func : "collectionList.getCollection",
        cid : $collectionId
      },
      yearFrom,
      yearTo;


    // we don't need to update multiple times in Single Round
    if ( isUpdated ) {
      // Hide Loading Icon
      currentRoot.find("." + CLASSES.collection + $collectionId)
        .find("img." + CLASSES.loading + ":first").hide();
      return;
    }
    else {
      _updated.push($collectionId);
    }

    // Setup query mapBounds, input should be a GLatLngBounds Object
    if ( !_mapBounds ) {
      _mapBounds = HyperCities.mainMap.getBounds();
    }

    // Assign coordinates after update test, for search engine, because
    // at this point, _mapBounds is undefined
    // Setup query mapBounds and mapZoom
    params.neLat = _mapBounds.north;
    params.neLng = _mapBounds.east;
    params.swLat = _mapBounds.south;
    params.swLng = _mapBounds.west;
    params.zoom  = HyperCities.mainMap.getZoom();

    // Show Loading Icon
    currentRoot.find("." + CLASSES.collection + $collectionId)
      .find("img." + CLASSES.loading + ":first").show();

    if ((typeof(_timespan) == 'undefined') || (_timespan === null)) {
      _timespan = HyperCities.mainMap.getTimespan();
    }

    // Only update collection for non external collection
    if ( !$isExternal ) {
      // Setup query timespan
      if ((typeof(_timespan) !== 'undefined') && (_timespan !== null) &&
        (_timespan.min instanceof Date) && (_timespan.max instanceof Date)) {

        params.dateFromIsBC = 0;
        params.dateToIsBC = 0;

        yearFrom = _timespan.min.getFullYear();
        yearTo   = _timespan.max.getFullYear();

        // Change negative year to positive and assign BC flag
        if ( yearFrom < 0 ) {
          params.dateFromIsBC = 1;
          yearFrom = -1 * yearFrom;
        }

        if ( yearTo < 0 ) {
          params.dateToIsBC = 1;
          yearTo = -1 * yearTo;
        }

        params.dateFrom = yearFrom + _timespan.min.toString("-MM-dd");
        params.dateTo   = yearTo + _timespan.max.toString("-MM-dd");

        // Pad leading zero to make it four digits
        while (params.dateFrom.length < 10) {
          params.dateFrom = "0" + params.dateFrom;
        }

        while (params.dateTo.length < 10) {
          params.dateTo = "0" + params.dateTo;
        }
      } // end if, end of timespan params process

      $.post("./getCollection.php", params, _parseCollection, "xml");
    }
  };

  /**
   * Update collection with data returned by server.
   *
   * @param {xml/json} $data Data returned by server
   */
    var _updateCollection = function ($data) {

        var collectionId = parseInt($data.id),
      title        = $data.title,
      creator      = $data.author,
      //copyright    = $data.copyright,
      description  = $data.description,
      userId       = (HyperCities.user.getUserId() === null) ? HyperCities.config.HC_USER_ADMIN : HyperCities.user.getUserId();
      state        = parseInt($data.stateId),
      oldAddTo     = [];    // the original parent collections of this collection


        HyperCities.debug(_id + "Update collection " + collectionId);

    //tab1 "content"
        var tab1 = $('<div class="HCUpdateColDiv">'
            +'<div class="form-item"><label> Title:  </label> <input type="text"'
      +' id="title"></div>'
            +'<div class="form-item"><label> Author: </label><input type="text"'
      +' id="creator"></div>'
            //+'<div class="form-item"><label> Copyright: </label><input type="text" id="copyright"></div>'
            +'<div class="form-item"><label> Description: </label><textarea '
      +'rows="5" cols="30" id="description"></textarea></div>'
            +'<div class="form-item"><div style="width:100px;height:80px;float:'
      +'left"><label> State: </label></div>'
            +'<div id="publicDiv"><input type="radio" name="state" value="1" id'
      +'="public">Public</div>'
            +'<div id="protectedDiv"><input type="radio" name="state" value="2"'
      +' id="protected">Protected</div>'
            +'<div id="hiddenDiv"><input type="radio" name="state" value="3" id'
      +'="hidden">Hidden</div>'
            //+'<input type="radio" name="state" value="4">Inappropriate'
            //+'<input type="radio" name="state" value="5">Delete'
            +'</div><br/>  <div class="HCBottomBar"><input type="button" '
      +'id="next" value="Next"></div>');
        $("#title", tab1).val(title);
        $("#description", tab1).val(description);
        $("#creator", tab1).val(creator);
        //$("#copyright", tab1).val(copyright);

    //select state
    $("input:radio:eq("+(state-1)+")", tab1).attr("checked", true);

    //show password if state = protected
    if (state === HyperCities.config.HC_OBJECT_STATE.PROTECTED)
    {
      if ($("#protectedDiv div").length < 1)
      {
        var password = $("<div style='position:relative;left:20px'>"
                + "keycode:<input type='password' id='password'"
                + "></div>");
        $("#protectedDiv", tab1).append(password);
      }
    }
    //show options for private state
    $("#protected", tab1).click(function () {

      if ($("#protectedDiv div").length < 1)
      {
        var password = $("<div style='position:relative;left:20px'>"
                + "password:<input type='password' id='password'></div>");
        $("#protectedDiv", tab1).append(password);
      }
    });

        $("#next", tab1).click( function () {
            HyperCities.mainMap.getInfoWindow().selectTab(1);
        });

    //tab2 "add to"
    var tab2 = $("<div><b><span id='addOwnCTitle'>Add it to other "
          + "collections:</span></b>"
          + "<div id='treePanel' style='height:300px; overflow:auto'>"
          + "<ul id='tree'></ul>"
          + "</div>"
          + "<div class='HCBottomBar'><input type='button' id='next' "
          + "value='next'></div></div>");

    /*
        var tab2 = $("<div><div><b><span id='addOwnCTitle'>Add it to my collections:</span></b>"
            + "<div id='own_collections'></div></div>"
            + "<div><b><span id='addOtherCTitle'>Add it to other collections:</span></b>"
            + "<div id='other_collections'></div></div>"
      + "<div class='HCBottomBar'><input type='button' id='next' value='Next'></div></div>");
        HyperCities.util.loadCollectionList(tab2, null, collectionId);
    */

        $("#next", tab2).click( function () {
            HyperCities.mainMap.getInfoWindow().selectTab(2);
        });

    //tab3 "share"
    var tab3 = $("<div><div><b><span class='infoWinTitle'>Share this "
          +"collection with your friends:</span></b></div>"
          +"<div id='addUser'><div><span class='infoWinTitle'>Please "
          +"enter your friend's last name:</span></div>"
          +"<div style='width:400px;height:30px'><input id='username'"
          +" type='text'/><input type='button' id='addUserBtn' "
          +"value='add'></div></div>"
          +"<div class='collectionPanel' style='width:400px;height:"
          +"280px'></div>"
                +"<div class='HCBottomBar'></div></div>"
      );
    HyperCities.util.loadUserList($(".collectionPanel", tab3), collectionId);

    $("#addUserBtn", tab3).click(function (){
      
      var username = $("#username", tab3).val();
      var params = {command: "queryUser", username: username};

      $.post("./user.php", params, function ($data){
                var error = $($data).find("Error > Message").text();

                if ( error.length > 0 ) {
                    alert(error);
                }
                else
                {
          $($data).find("Users > user").each(
            function () {
              var userId     = parseInt($("userId", this).text());
              var username   = $("username", this).text();
              var accessId   = HyperCities.config.HC_ACCESS_VIEW;
              var userItem   = $("<div id="+userId+"></div>");
              var checkbox   = $("<div style='float: left'>"
                        +"<input type='checkbox'/></div>");
              var username   = $("<div style='width:120px; "
                +"float:left'><span>"+username+"</span></div>");
              var accessItem = HyperCities.util.loadAccessId(
                userId, accessId
              );

              userItem.append(checkbox).append(username).append(
                accessItem
              );
              $(".collectionPanel").append(userItem);
            }
          );
        }
            }, "xml");
    });

    var updateBtn = $("<input type='button' id='updateBtn' value='Update'>");
        updateBtn.click( function (){

            var title              = $.trim($("#title").val());
            var objectStateId      = $("input[name=state]:checked").val();
            var description        = $.trim($("#description").val());
            var creator            = $.trim($("#creator").val());
            var copyright          = $.trim($("#copyright").val());
      var password           = $("#password").val();
            var addTo              = [];
      var userIdArray        = [];
      var accessRightIdArray = [];
    

      $(".checkboxChecked").next().each(
        function (){
          addTo.push($(this).attr("id"));
        }
      );

      /*
            $("input[name=otherOption]:checked").each(function() {
                addTo.push($(this).data("collectionId"));
            });
            $("input[name=ownOption]:checked").each(function() {
                addTo.push($(this).data("collectionId"));
                });
       */

      if (addTo.length === 0) {
        alert("Please check at least one collection!");
        return;
      }

      $("select").each(
        function (){
          userIdArray.push($(this).data("userId"));
          accessRightIdArray.push($("option[selected]", this).val());
        }
      );

      var params = {
              collectionId: collectionId,
              title: title,
              objectStateId: objectStateId,
              password: password,
              description: description,
              creator: creator,
              //copyright: copyright,
              addTo: addTo.toString(),
              oldAddTo: oldAddTo.toString(),
              userIdArray: userIdArray.toString(),
              accessRightIdArray: accessRightIdArray.toString()
      };
           
      $.post("./updateCollection.php", params,
        function ($response){
          var success = $($response).find("Success > Message").text();
          var error   = $($response).find("Error > Message").text();

          if ( error.length > 0 ) {
            alert(error);
          }
          else
          {
            alert(success);
          }

          HyperCities.mainMap.closeInfoWindow();
        },
        "xml");
      }
    );

    //tabInfoWindow variables
    var label1 = "1. Content";
    var label2 = "2. Add to";
    var label3 = "3. Share";
    var updateWindow;

    if (HyperCities.user.isAdmin()) {
      tab3.find("#addUser").remove();
      tab3.find(".collectionPanel").css("height", "330px");
    }

    tab3.find("div:last").append(updateBtn);
    updateWindow = [ new GInfoWindowTab(label1, tab1.get(0)),
             new GInfoWindowTab(label2, tab2.get(0)),
             new GInfoWindowTab(label3, tab3.get(0))];

    var map = HyperCities.mainMap.getMapInstance();
    var infoWinOpenHandle = GEvent.addListener(map, "infowindowopen",
      function (){
      //load collection list after info window is opened
        var tree = HyperCities.util.loadCollectionTree($("#tree", tab2),
                                oldAddTo,
                                collectionId,
                                true
                              );
    });

    var infoWinCloseHandle = GEvent.addListener(map, "infowindowclose", 
      function () {
        GEvent.removeListener(infoWinOpenHandle);
      }
    );

        HyperCities.mainMap.openInfoWindow("tabsHtml", HyperCities.mainMap.getCenter(),
                      updateWindow, 
                      {maxWidth: 400, noCloseOnClick:true}
                    );
    };

    return {

    /**
     * Update the collection list.
     *
     * @param {GLatLngBounds} $mapBounds Bounds to search for objects within
     * @param {Integer} $mapZoom Map zoom
     * @param {Boolean} $doRender Update collection list. Defaults to true.
     */
    update: function ($mapBounds, $mapZoom, $doRender) {
      // HyperCities.debug(_id + "[A2] Update Collection List");

      var params = {func: "collectionList.getCollectionList"},
        yearFrom,
        yearTo;

      $("#loadingMessage").fadeIn("fast");

      _doRender = false;
      if ( typeof($doRender) === "boolean" ) {
        _doRender = $doRender;
      }

      // Setup System Mode
      _originalMode = HyperCities.session.get("mode");
      if ( _doRender ) {
        HyperCities.session.set("mode", HyperCities.config.MODE_COLLECTION_LIST);
        //HyperCities.mapList.removeMapsProxy();
      }


      // Setup query mapBounds, input should be a GLatLngBounds Object
      if ( $mapBounds ) {
        _mapBounds = $mapBounds;
      } else {
        _mapBounds = HyperCities.mainMap.getBounds();
      }

      // Setup query mapZoom, input should be a number and must be integer
      if ( typeof($mapZoom) === "number" ) {
        _mapZoom = parseInt($mapZoom);
      } else {
        _mapZoom = HyperCities.mainMap.getZoom();
      }

      params.neLat = _mapBounds.north;
      params.neLng = _mapBounds.east;
      params.swLat = _mapBounds.south;
      params.swLng = _mapBounds.west;
      params.zoom  = _mapZoom;

      // Setup query timespan
      _timespan = HyperCities.mainMap.getTimespan();
      if ((typeof(_timespan) !== 'undefined') &&
          (_timespan.min instanceof Date) &&
          (_timespan.max instanceof Date)) {

        params.dateFromIsBC = 0;
        params.dateToIsBC = 0;

        yearFrom = _timespan.min.getFullYear();
        yearTo   = _timespan.max.getFullYear();

        // Change negative year to positive and assign BC flag
        if ( yearFrom < 0 ) {
          params.dateFromIsBC = 1;
          yearFrom = -1 * yearFrom;
        }

        if ( yearTo < 0 ) {
          params.dateToIsBC = 1;
          yearTo = -1 * yearTo;
        }

        params.dateFrom = yearFrom + _timespan.min.toString("-MM-dd");
        params.dateTo   = yearTo + _timespan.max.toString("-MM-dd");

        // Pad leading zero to make it four digits
        while (params.dateFrom.length < 10) {
          params.dateFrom = "0" + params.dateFrom;
        }

        while (params.dateTo.length < 10) {
          params.dateTo = "0" + params.dateTo;
        }
      } // end if, end of timespan params process

      // jay: disable this line so that we can see collections in worldwide level
      // if ( _mapZoom < HyperCities.config.ZOOM_THRESHOLD ) {
      //   HyperCities.city.renderList(_mapBounds);
      // } else {
      var baseCollection = HyperCities.session.get("baseCollection");
      if (baseCollection == null || baseCollection == 0) {
        $.post("./getCollectionList.php", params, _parseCollectionList, "xml");
      } else {
        params.cid = HyperCities.session.get("baseCollection");
        _resizeJScroll = true;
        $.post("./getCollection.php", params, _parseCollectionList, 'xml');
      }
      //}
    },

    /**
     * Hide loading icon.
     *
     * @param {HyperCities.config.HC_OBJECTTYPE} $type Object type.
     * @param {Integer} $id Item id
     */
    hideLoading: function ($type, $id) {

      var currentRoot = _getCurrentRoot();

      // Hide Loading Icon
      switch ($type) {
        case HyperCities.config.HC_OBJECT_TYPE.FOLDER :
          break;
        case HyperCities.config.HC_OBJECT_TYPE.PLACEMARK :
          break;
        case HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK :
          currentRoot.find("." + CLASSES.collection + $id)
            .find("img." + CLASSES.loading).hide();
          break;
        case HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT : // TODO
        case HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK : // TODO
          currentRoot.find("." + CLASSES.collection + $id)
            .find("img." + CLASSES.loading).hide();
          break;
        default:
          return false;
      }
    },

    /**
     * Highlight item on map.
     *
     * @param {Integer} $itemId Object id
     */
    highlightItem: function ($itemId) {
      // HyperCities.debug(_id + "Hover over object " + $itemId);
      var currentRoot = _getCurrentRoot();

      // Highlight the placemark
      // HyperCities.HCObject.highlight($itemId);

      // Highlight Item in Collection list
      currentRoot.find("." + CLASSES.item + $itemId + " ." + CLASSES.markerLink)
        .addClass("hover");
      return false;
    },

    /**
     * Remove highlight from item.
     *
     * @param {Integer} $item Item id
     */
    unHighlightItem: function ($itemId) {
      // HyperCities.debug(_id + "Hover off object " + $itemId);
      var currentRoot = _getCurrentRoot();
      // unHighlight the placemark
      // HyperCities.HCObject.unHighlight($itemId);
      // unHighlight Item in Collection list
      currentRoot.find("." + CLASSES.item + $itemId + " ." + CLASSES.markerLink)
        .removeClass("hover");
      return false;
    },

    /**
     * Remove item
     * @param {Ingeter} $item Item id
     */
    removeItem: function ($itemId) {

      // we remove item from HCObject, not handle it's children
      HyperCities.HCObject.removeObject($itemId);

      // Temp:: Need to rewrite
      if ( $("li." + CLASSES.item + $itemId).length > 0 ) {
        // Remove Dom Element
        $("li." + CLASSES.item + $itemId).remove();
      }
      else if ( $("li." + CLASSES.collection + $itemId).length > 0 ) {
        // Remove Dom Element
        $("li." + CLASSES.collection + $itemId).remove();
      }

    },
    /**
     * Get list of ids of currently opened collections.
     * The original opened collections will not be altered.
     * @return {Array} array of opened collections
     */
    getOpenedCollections: function () {
      return _opened.slice(0);
    },

    /**
     * Get list of currently checked items.
     * The original checked collections will not be altered.
     * @return {Array} Checked items
     */
    getCheckedCollections: function () {
      return _checked.slice(0);
    },

    /**
     * Open a collection.
     * @param {Integer} id Collection id
     */
    openCollection: function ($id) {
      var itemId = parseInt($id);

      if ( !isNaN(itemId) ) {
        _setFolderStatus (itemId, true);
      }
        },

    /**
     * Check a list of collections
     *
     * @param {Array} $list Ids to check
     */
    check: function ($list) {
      var ids, id, index,
        isFocused = $("#collectionTab").parent().hasClass("highlight");

      if ($list instanceof Array) {
        ids = $list;
      }
      else {
        ids = [$list];
      }

      index = ids.length;
      while ( index-- > 0 ) {
        id = parseInt(ids[index]);
        if ( !isNaN(id) ) {
          if ( isFocused ) {
            _checkItem(id);
          } else {
            HyperCities.HCObject.show(id);
            if ( $.inArray(id, _checked) < 0 ) {
              _checked.push(id);
            }
          }
        }
      }
    },

    /**
     * Uncheck collections
     *
     * @param {Array} $list array of items
     */
    uncheck: function ($list) {
      var ids, id, index, checkerIndex,
        isFocused = $("#collectionTab").parent().hasClass("highlight");

      if ($list instanceof Array) {
        ids = $list;
      }
      else {
        ids = [$list];
      }

      index = ids.length;
      while ( index-- > 0 ) {
        id = parseInt(ids[index]);
        if ( !isNaN(id) ) {
          HyperCities.debug("uncheck collection " + id);
          if ( isFocused ) {
            _uncheckItem(id);
          } else {
            HyperCities.HCObject.hide(id);

            checkerIndex = $.inArray(id, _checked);
            if ( checkerIndex >= 0 ) {
              _checked.splice(checkerIndex, 1);
            }
                    }
        }
      }
    },

        /**
     * Uncheck all checked items and remove all overlays on the map.
     */
        uncheckAllItems: function () {
            var isFocused = $("#collectionTab").parent().hasClass("highlight");

            // uncheck each checkedItem by yielding processes
            if ( _checked.length > 0 ) {
                setTimeout(function () {
                    var itemId = _checked[0];

                    if ( isFocused ) {
                        _uncheckItem(itemId);
                    } else {
            HyperCities.HCObject.hide(itemId);
                        _checked.shift();
                    }

                    if ( _checked.length > 0 ) {
                        setTimeout(arguments.callee, 10);
                    }
                }, 10);
            }
        },

        /**
     * Collapse all folders and return back to a basic list of root
     * collections so that only Public Collections, Featured Collections, 
     * etc. are visible.
     */
    collapseAllFolders: function () {
      var isFocused = $("#collectionTab").parent().hasClass("highlight");

      // collapse each openedItem by yielding processes
      if ( _opened.length > 0 && isFocused ) {
        _progressCount = _opened.length;

        setTimeout(function () {
          var folderId = _opened[0];

          _setFolderStatus(folderId, false);

          if ( _opened.length > 0 ) {
            setTimeout(arguments.callee, 10);
          }

          _progressCount--;
          $("#treeviewWrapper").trigger('HCUpdateFinish');
        }, 10);
      } else {
        HyperCities.util.debug("Not Focus!!");
        _opened = [];
      }
    },

    /**
     * Collapse certain folders.
     * 
     * @param {Array} $folders Folder ids to close
     */
    collapseFolders: function ($folders) {
            if ($folders instanceof Array) {
                for (var i in $folders) {
                    _setFolderStatus($folders[i], false);
                }
            }
        },

    /**
     * Update a specific collection with the specified data.
     *
     * @param {xml/json} $data Data to use to update the collection. The
     *             collection to be updated will be inferred from
     *             the data supplied.
     */
        updateCollection: function ($data) {
            _updateCollection($data);
        },

        /**
     * Add an operation to be done after the following sync.
     * 
     * @param {function} $op Method to be called.
     * @param {object} $data arguments as an array
     */
    queuePostSyncOperation: function ($op, $data) {
            _queuedOperations.push({op:$op, data:$data});
        },

        /**
     * Parse search result returned by search engine and display it in the
     * collection list.
     * 
     * @param {xml/json} $data Data returned by search.
     */
    parseSearchResult: function ($data) {
            HyperCities.debug(_id + "Search result returned");
            if (!$('#collectionList').hasClass('highlight')) {
                $('#mapAutoSync').attr('checked', false);
                $('#mapTab').parent().removeClass('highlight');
                $('#collectionTab').parent().addClass('highlight');
            }
            // Don't reset collection list -- items will be automatically be removed
            HyperCities.intelliList.reset();
            _resetCollectionList();
            // Create or Get collection tree root
            var treeRoot = $("#treeviewWrapper");
            if ( treeRoot.length <= 0 ) {
                treeRoot = _initCollectionList();
            }
            // Append folders to collection tree
            $("Document > Folder", $data).each (function () {
                var id = parseInt($(this).attr('id'));
                //HyperCities.debug (_id + "Parsing search result " + id);'

                if ($.inArray(id, _opened) === -1) {
                    _opened.push(id);
                }
                else {
                    _setFolderStatus(id, true);
                }
                _parseFolder(treeRoot, this, true);
                //_setFolderStatus(id, true, false, this);
            })
            $("#loadingMessage").fadeOut();
            HyperCities.search.completeSearch();
        },

    /**
     * Parse Object List for objectEditPanel
     */
    parseObjectList: function ($data) {
      //HyperCities.debug(_id + "[A2] Parse CollectionList");

      var treeRoot, treeChildren = [];

      // Create or Get collection tree root
      treeRoot = $("#objectListWrapper");
      if ( treeRoot.length <= 0 ) {
        treeRoot = _initObjectList();
      }

      // Reset Update Status
      _updated  = [];
      _skipList = [];
      _progressCount = 0;

      // Append folders to collection tree
      if ($("Document > Folder", $data).length == 0) {
        $("Document", $data).each(
          function () {
            var self = this;
            treeChildren.push(_parseFolder(treeRoot, self));
          }
        );
      } else {
        $("Document > Folder", $data).each(
          function () {
            var self = this;
            treeChildren.push(_parseFolder(treeRoot, self));
          }
        );
      }

      $("#objectListWrapper").trigger('HCUpdateFinish');
      return treeChildren;
    },

    syncWithMap: function($flag) {
      if ( typeof($flag) !== 'boolean' ) {
         return;
      }

      _syncMap = $flag;
//      HyperCities.debug(_id + "Sync Map "+_syncMap);
    }
  }; // end of public methods
}(); // end of Object

// end of file
