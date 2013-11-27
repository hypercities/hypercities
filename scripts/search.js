// vim: sw=4:ts=4:nu:nospell

/**
 * HyperCities search Object
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2009.05.06
 * @version   $Id$
 *
 */
 
HyperCities.search = function() {
	// do NOT access javascript generated DOM from here; elements don't exist yet
    
	// Private variable goes here
	var _id      = "[HyperCities.search] ";
	var _address = null;
	var _marker  = null;
	var _keyword = null;

        var _searchInProgress = false;
        var _placemarksReturned = 0;
        var _collectionsReturned = 0;

        var _addressForm = "";
        var _keywordForm = "";

        var _updateSearchResults = function ($data) {
            // pass to collectionList
            if ($($data).find("Error").length > 0) {
                $("#loadingMessage").fadeOut();
                alert ($("Error > Message", $data).text());
            } else {
                _searchInProgress = true;
                _placemarksReturned = 0;
                _collectionsReturned = 0;
                HyperCities.collectionList.parseSearchResult($data);
            }
            
        };

	var _setCity = function ($cityId) {
		return false;
	};
        
    
	return {

        init: function () {
            // Allow using "enter" key to submit to places API
            // removing this line makes the form POST back to the server
            $("#addressSearch").bind('submit', function () {
                return false;
            });
            var autocomplete = new google.maps.places.Autocomplete($("#address")[0]);
            google.maps.event.addListener(autocomplete, 'place_changed', function () {
                if (!$("#borders").attr("checked")) {
                    $("#borders").attr('checked', true);
                    $("#borders").click();
                    $("#borders").attr('checked', true);
                }
                var viewport = autocomplete.getPlace().geometry.viewport;
                if (typeof viewport != "undefined") {
                    var view = new geo.Bounds(
                        new geo.Point([viewport.getSouthWest().lat(), viewport.getSouthWest().lng()]),
                        new geo.Point([viewport.getNorthEast().lat(), viewport.getNorthEast().lng()])
                    );
                    HyperCities.earth.flyToBounds(view);
                } else {
                    HyperCities.earth.flyToPoint(autocomplete.getPlace().geometry.location);
                }
                return false;
            });
        },

		// reset the search keyword and address
		reset: function() {
			_address = null;
            _keyword = null;
			_marker  = null;
			$("#addressSearch #address").val("");
			$("#keywordSearch #keyword").val("");
			return false;
		},
        
		// reset the search keyword
		resetKeyword: function() {
			$(this).blur();
			_keyword = null;
			$("#keywordSearch #keyword").val("");
			return false;
		},
		// search the address
		searchAddress: function() {
			$(this).blur();
			_address = $("#addressSearch #address").val();
//			HyperCities.debug(_id + "Goto " + _address);
			HyperCities.mainMap.searchCenter(_address);
			return false;
		},

		// search the keyword
		searchKeyword: function() {
                    if ($("#keywordSearch #keyword").val() == '') {
                        alert ("Please enter at least one search term.");
                        return false;
                    }
                    $("#loadingMessage").show();
                    $(this).blur();
                    // Post to search.php
                    var params = {
                        keywords: $("#keywordSearch #keyword").val(),
                        where: $("#keywordSearch input:radio[name=where]:checked").val()
                    };
                    if (params.where == 'CurrentView') {
                        var currentBounds = HyperCities.mainMap.getBounds();
                        params.swLat = currentBounds.getSouthWest().lat();
                        params.swLon = currentBounds.getSouthWest().lng();
                        params.neLat = currentBounds.getNorthEast().lat();
                        params.neLon = currentBounds.getNorthEast().lng();
                        var currentTime = HyperCities.mainMap.getTimespan();
                        // BC date handling happens on server
                        params.start = currentTime.min.toString("yyyy-MM-dd HH:mm:ss");
                        params.end = currentTime.max.toString("yyyy-MM-dd HH:mm:ss");
                    }
                    $.post("./search.php", params, _updateSearchResults, "xml");
                    $("#keywordSearch #clearBtn").attr('disabled', '');
                    //alert("This feature is under construction.");
                    return false;
		},

                clearResults: function() {
                    HyperCities.intelliList.reset();
                    if ($('#collectionTab').parent().hasClass('highlight')) {
                        HyperCities.debug(_id + "Clearing collection list");
                        //HyperCities.mainMap.clearOverlays();
                        HyperCities.collectionList.uncheckAllItems();
                        HyperCities.collectionList.collapseAllFolders();
                        HyperCities.collectionList.update
                            (HyperCities.mainMap.getBounds(), HyperCities.mainMap.getBoundsZoomLevel(HyperCities.mainMap.getBounds()), true);
                    } else if ($('#mapTab').parent().hasClass('highlight')) {
                        HyperCities.mapList.update
                            (HyperCities.mainMap.getBounds(), HyperCities.mainMap.getBoundsZoomLevel(HyperCities.mainMap.getBounds()), true, true);
                    }
                    $('#mapAutoSync').attr('checked', true);
                    $('#searchResults').hide();
                    $('#searchResultsPlacemarks').text(0);
                    $('#searchResultsCollections').text(0);
                    return false;
                },

                storeFormData: function ($data) {
                    _addressForm = $("#addressSearch", $data);
                    _keywordForm = $("#keywordSearch", $data);
                    
                },

		removeAddressMarker: function() {
			if (_marker !== null) {
				HyperCities.mainMap.removeOverlay(_marker);
			}
		},

		addAddressMarker: function($response) {
			var place, point;

			if (!$response || $response.Status.code != 200) {
				alert("Sorry, we were unable to geocode this location");
			} 
			else {
//				HyperCities.debug($response);
				place = $response.Placemark[0];
				point = new GLatLng(place.Point.coordinates[1],
									place.Point.coordinates[0]);
				// Remove old marker
				if (_marker !== null) {
					HyperCities.mainMap.removeOverlay(_marker);
				}
				// Add new marker
				_marker = new GMarker(point);
				HyperCities.mainMap.setCenter(point);
				HyperCities.mainMap.addOverlay(_marker);
				_marker.openInfoWindowHtml(place.address);

				GEvent.addListener(_marker, "click", function() {
					var tmpListener = GEvent.addListener(_marker, "infowindowbeforeclose", function() {
							var latlng = HyperCities.mainMap.getCenter();
                  
							if (HyperCities.mainMap.getCurrentMapType() !== G_SATELLITE_3D_MAP)
								HyperCities.mainMap.getMapInstance().panTo(latlng);

							GEvent.removeListener(tmpListener);
						});

					_marker.openInfoWindowHtml(place.address);
				});
			}			
		},
           addResult: function ($type) {
               if (_searchInProgress) {
                   $("#searchResults").show();
                   if ($type == HyperCities.config.HC_OBJECT_TYPE.PLACEMARK) {
                       //var objects = parseInt ($("#searchResultsPlacemarks").text());
                       $("#searchResultsPlacemarks").text(++_placemarksReturned);
                   } else if ($type == HyperCities.config.HC_OBJECT_TYPE.NETWORKLINK) {
                       //var objects = parseInt ($("#searchResultsCollections").text());
                       $("#searchResultsCollections").text(++_collectionsReturned);
                   } else {
                       HyperCities.util.debug(_id + "Invalid object type entered.");
                   }
               }
           }, // end function addResult

           completeSearch : function () {
               _searchInProgress = false;
           }
	};
}(); // end of Object

// end of file
