/**
 * HyperCities miniMap Objects
 *
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2011-01-15
 * @version   0.8
 *
 */

HyperCities.miniMap = function() {

  var _id          = "[HyperCities.miniMap] ",

    _defaultLat  = 20,
    _defaultLng  = 0,
    _defaultZoom = 0,
    _mapOptions,
    _mapDom,
    _GMap,
    _mapTypeId,
    _lat,
    _lng,
    _zoom,
    _center,

    /**
     * Create city marker at given LatLng
     * No need to check if it's in bounds, because we always show whole world.
     *
     * @param {Number} $cityId The Id of the city
     * @param {GLatLng} $LatLng The location to place the marker
     * @param {String} $title the tooltip text of marker
     * @return {GMarker} the marker object
     */
    _createCityMarker = function ($city, $latLng, $title) {
    
      var imgCity = {
      url: 'images/markerPoint.png',
            size: new google.maps.Size(10, 10),   // The size
      origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(5, 5)     // The anchor
      },
          imgHover = {
      url: 'images/markerPoint.png',
            size: new google.maps.Size(10, 10),   // The size
      origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(5, 5)     // The anchor
      },
          marker = new google.maps.Marker({
            position: $latLng,
            map: _GMap,
            icon: imgCity,
            title: $title
          });

      // Add hover effect of icon, and higher zIndex of the marker
      // Note: hover/unhover need to define seperately, because
      // we need to hover icon without calling HyperCities.cityMgr.mouseover
      google.maps.event.addListener(marker, 'hover',
        function() {
          this.setIcon(imgHover);
          this.setZIndex(999);
        });
      google.maps.event.addListener(marker, 'unhover',
        function() {
          this.setIcon(imgCity);
          this.setZIndex(undefined);
        });
    /*
      google.maps.event.addListener(marker, 'mouseover',
        function() {
          HyperCities.city.mouseover($cityId);
        });
      google.maps.event.addListener(marker, 'mouseout',
        function() {
          HyperCities.city.mouseout($cityId);
        });
    */

      // Pan/Fly to city on click
      google.maps.event.addListener(marker, 'click',
        function() {
          HyperCities.earth.goToCity($city);
        });

      return marker;
    };

  return {

    /**
     * Initialize the Mini Google Map
     * @param {String} $context The element ID to render the Google Map
     * @param {Object=} $opt_value (optional parameters)
     *          {Number} lat: default latitude of the map center
     *          {Number} lng: default longitude of the map center
     *          {Number} zoom: default zoom level of the map
     * @return void
     */
    init: function($context, $opt_value) {
      var options = $opt_value || {};

      // Assign default map center and zoom if it's given in $opt_value
      _mapDom = $($context);
      _lat = isNaN(options.lat) ? _defaultLat : options.lat;
      _lng = isNaN(options.lng) ? _defaultLng : options.lng;
      _zoom = isNaN(options.zoom) ? _defaultZoom : options.zoom;
      _center = new google.maps.LatLng(_lat, _lng);
      _mapTypeId = google.maps.MapTypeId.SATELLITE;

      // Assign mapOptions
      _mapOptions = {
        zoom: _zoom,
        center: _center,
        draggable: false,
        disableDefaultUI: true,
        disableDoubleClickZoom: true,
        scrollwheel: false,
        keyboardShortcuts: false,
        mapTypeId: _mapTypeId
      };
      _GMap = new google.maps.Map(_mapDom.get(0), _mapOptions);
    },

    /**
     * Add city markers to miniMap. once the marker is created,
     * the marker object will be stored in $cities[i].markers.small
     * @param {Array.<Object>} $cities Array of cities in HyperCities cityMgr
     */
    addCities: function($cities) {
      var isHidden = false, 
      center = null;

      for (var i in $cities) {
        isHidden = ($.inArray($cities[i].id, HyperCities.config.HIDDEN_CITIES) >= 0);

        // If the city is not supposed to hide, add marker and listeners
        if (!isHidden) {
          center = new google.maps.LatLng(
          $cities[i].center.lat, $cities[i].center.lon);
          $cities[i].markers.small = _createCityMarker($cities[i],
                                                    center,
                                                    $cities[i].name);
        } // end if
      } // end for
    }
  };
}(); // end of Object

// end of file

