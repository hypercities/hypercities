/**
 * HyperCities city Objects
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2008-12-22
 * @version   0.7
 *
 */

HyperCities.city = function() {
  // do NOT access javascript generated DOM from here; elements don't exist yet
  // Private variable
  var _id = "[HyperCities.city] ",
    _cities = new Array();
    _defaultRadius = 100000;

  // Private method
  /**
   * Parse cities from data
   * @param Object $data: data containing city information
   * @return void
   */
  var _parseCities = function($data) {
    HyperCities.util.debug(_id + "Parse Cities");

    // loop for each match on Cities/City
    $($data).find("City").each(function() {

      var cityId = $("id", this).text();

      _cities[cityId] = {
        id: cityId,
        name: $("city", this).text(),
        country: $("country", this).text(),
        neLat: parseFloat($("neLat", this).text()),
        neLon: parseFloat($("neLon", this).text()),
        swLat: parseFloat($("swLat", this).text()),
        swLon: parseFloat($("swLon", this).text()),
        zoom: parseInt($("zoom", this).text()),
        radius: _defaultRadius,
        marker: null,
        center: {lat:parseFloat($("lat", this).text()),
             lon:parseFloat($("lon", this).text())},
        defaultCenter: {lat:parseFloat($("lat", this).text()), 
                lon:parseFloat($("lon", this).text())},
        thumbnailUrl: $("thumbnail_url", this).text(),
        markers: {'normal': null, 'small': null},
        description: $("description", this).text(),
        timespan: {
          max: Date.today().set({
            day: 31,
            month: 11,
            hour: 23,
            minute: 59,
            second: 59
          }),
          min: Date.today().addYears( - 300)
        }
      };

    });

    HyperCities.miniMap.addCities(_cities);
    // handle permalinks to cities
    // NOTE: Exit point at the end of this IF statement
    // The function will exit here if a permalink to a city has been found
    if (HyperCities.session.get('city') != null) {
      HyperCities.util.debug(_id + "Trying new city parsing method");
      var city = HyperCities.city.getCityByName(HyperCities.session.get('city'));
      HyperCities.session.set("city", city);
      if (city == null) alert("Invalid City Name.");
      else {
        HyperCities.util.debug(_id + "City found" + city.name);
        HyperCities.mainMap.setCenter(city.defaultCenter, city.zoom);
        return;
      }
    }

    HyperCities.earth.addCities(_cities);

    // Adjust Layout and Do the first time Sync  
    HyperCities.adjustLayout();
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
    itemImg.html('<img src="./images/thumbError.gif" ALT="No featured cities in view" />');

    var itemTitle = $(document.createElement("div"));
    itemTitle.attr("id", "intelliTitle_error");
    itemTitle.attr("class", "intelliTitle");
    itemTitle.html("No featured cities in view.");

    var itemText = $(document.createElement("div"));
    itemText.attr("id", "intelliText_error");
    itemText.attr("class", "intelliText");
    itemText.html("No featured cities in view. Try zooming out, "
          + "or clicking on a city in the mini-map.");

    itemWrapper.append(itemImg).append(itemTitle).append(itemText);
    $("#intelliList").append(itemWrapper);

  };

  /**
   * The click city item event handler
   * @return void
   */
  var _clickCityItem = function() {
    var item = $(this);
    var cityId = item.attr('id').split('_')[1];
    var city = _cities[cityId];

    HyperCities.util.debug(_id + "Click City Item " + item.attr('id'));
    
    HyperCities.earth.goToCity(city);
  };

  return {

    /**
     * Initialize the city object. Send query to server to get city
     * infomation. Callback function: _parseCities
     * @return void
     */
    init: function() {

      // Get city list and call _parseCities to render cities on mini map
      $.post("./citiesList.php", {
        func: "city.init"
      },
      _parseCities, "xml");
    },

    /**
     * Set the zoom level of city
     * @param Number $cityId: the city ID
     * @param Number $zoom: the zoom level
     * @return void
     */
    setZoom: function($cityId, $zoom) {
      if ((typeof(_cities[$cityId]) === "undefined") || (typeof($zoom) !== "number")) return;

      _cities[$cityId].zoom = $zoom;
    },

    /**
     * Set center of a city
     * @deprecated
     * @param Number $cityId: the city ID
     * @param GLatLng $center: the lat lng coordinates
     * @return void
     */
/*
    setCenter: function($cityId, $center) {
      if ((typeof(_cities[$cityId]) === "undefined") 
        || (typeof($center) !== "object")) return;

      _cities[$cityId].center = $center;
    },
*/
    /**
     * Set marker object of the city
     * @deprecated
     * @param Number $cityId: the city ID
     * @param Object $marker: the marker
     * @return void
     */
/*
    setMarker: function($cityId, $marker) {
      if ((typeof(_cities[$cityId]) === "undefined") 
        || (typeof($marker) !== "object")) return;

      _cities[$cityId].marker = $marker;
    },
*/
    /**
     * Get city marker
     * @param Number $cityId: the city ID
     * @return void
     */
    getMarker: function($cityId) {
      return (typeof(_cities[$cityId]) === "undefined") ? null: _cities[$cityId].marker;
    },
    /**
     * Return the _cities array
     * @return Array _cities: an array containing all cities
     */
    getCities: function() {
      return _cities;
    },

    /**
     * Return the city object by given Id
     * @param Number $cityId: the city ID
     * @return Object: the city object
     */
    getCity: function($cityId) {
      return (typeof(_cities[$cityId]) === "undefined") ? null: _cities[$cityId];
    },

    /**
     * Get city object by name
     * @param String $name: the name of the city
     * @return Object: the city object
     */
    getCityByName: function($name) {
      HyperCities.util.debug(_id + "Getting City for " + $name + ".");
      for (i in _cities) {
        if (_cities[i].name == $name) return _cities[i];
      }
      return null;
    },

    /**
     * Return the city object that cloest to the given point
     * @param GLatLng $GLatLon: the given point
     * @return Object: the city object
     */
/*
      findCity: function($GLatLon) {

      var targetId = null;
      var minDistance = null;
      var distance = 0;

      if (typeof($GLatLon) !== 'object') return;

      for (var i in _cities) {
        distance = $GLatLon.distanceFrom(_cities[i].defaultCenter);
        if ((minDistance === null) || (distance < minDistance)) {
          minDistance = distance;
          targetId = i;
        }
      }

      if ((minDistance > _cities[targetId].radius) 
        && ! HyperCities.mainMap.inMap(_cities[targetId].defaultCenter)) return null;

      return _cities[targetId];
    },
*/

    /**
     * Render the city list to intelliList by given bounds
     * @param GLatLngBound $bounds: the given bounds
     * @return Array: the city list in this bounds
     */
    renderList: function($bounds) {

      HyperCities.util.debug(_id + "Render City List");
      HyperCities.intelliList.reset();

      for (var i in _cities) {

        // Do not show the city in list if it's out of view or intended to hide
        if (!HyperCities.mainMap.inMap(_cities[i].defaultCenter, $bounds) 
          || ($.inArray(_cities[i].id, HyperCities.config.HIDDEN_CITIES) >= 0)) continue;

        var itemWrapper = $(document.createElement("div"));
        itemWrapper.attr("id", "intelliItem_" + i);
        itemWrapper.attr("class", "intelliItem");

        var itemImg = $(document.createElement("div"));
        itemImg.attr("id", "intelliImg_" + i);
        itemImg.attr("class", "intelliImg");
        itemImg.html('<img src="' + _cities[i].thumbnailUrl 
              + '" ALT="' + _cities[i].name + '" />');

        var itemTitle = $(document.createElement("div"));
        itemTitle.attr("id", "intelliTitle_" + i);
        itemTitle.attr("class", "intelliTitle");
        itemTitle.html("<strong>" + _cities[i].name 
              + "</strong> " + _cities[i].country);

        var itemText = $(document.createElement("div"));
        itemText.attr("id", "intelliText_" + i);
        itemText.attr("class", "intelliText expand");
        itemText.html(_cities[i].description);

        itemText.wordWraps();
        itemWrapper.append(itemImg).append(itemTitle).append(itemText);

        // add event listener on item click
        itemWrapper.click(_clickCityItem);

        // add event listener on item hover
        itemWrapper.mouseover(function() {
          var cityId = $(this).attr('id').split('_')[1];

          //GEvent.trigger(HyperCities.city.getMarker(cityId), "mouseover");
        });

        itemWrapper.mouseout(function() {
          var cityId = $(this).attr('id').split('_')[1];

          //GEvent.trigger(HyperCities.city.getMarker(cityId), "mouseout");
        });

        $("#intelliList").append(itemWrapper);

        // Compute Height after DOM inserted, add expand link if necessary
        if (itemWrapper.height() > 64) {
          // Add Link
          var itemExpand = $(document.createElement("div"));
          itemExpand.attr("id", "intelliExpand_" + i);
          itemExpand.attr("class", "intelliExpand");
          itemExpand.html('<b>...</b> (<a href="#">more info</a>)');
          itemWrapper.append(itemExpand);

          // Bind Event Listener
          itemExpand.click(HyperCities.intelliList.toggleIntelliText);
        }

        // Hide all intelliText beyond 3rd line
        itemText.removeClass("expand");
      }

      var allCities = $(".intelliItem");
      var totalCities = allCities.length;

      if (totalCities == 0) _renderError();

      // Sort intelliItem Base on alphabetical ordering
      var sortMaps = $(".intelliItem").get();
      sortMaps.sort(function(a, b) {
        var keyA = $(a).children(".intelliTitle").text();
        var keyB = $(b).children(".intelliTitle").text();
        if (keyA < keyB) return - 1
        if (keyA > keyB) return 1
        return 0
      });
      $.each(sortMaps, function(index, row) {
        $("#intelliList").append(row);
      });

      $("#mapTab").html("City (" + totalCities + ")");
      HyperCities.intelliList.render($(".intelliItem"));
    }
  };
} (); // end of Object
// end of file

