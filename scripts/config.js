/**
 * HyperCities Global Configuration
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2009-06-18
 * @version   $Id$
 *
 */
 
HyperCities.config = function() {

	var _id = "[HyperCities.config] ";

	return {
		// System parameters
        HC_DEBUG: true,

		// Zoomlevel that switch between between city and collection mode
		ZOOM_THRESHOLD: 7,

		// Path for user upload files
		UPLOAD_AUDIO_PATH: "uploadedAudio",
		UPLOAD_IMAGE_PATH: "uploadedImage",
		UPLOAD_KML_PATH: "uploadedKml",

		// Path for Images
		IMG_HIGHLIGHT_MARKER_PATH: "images/markerHighlight.png",

		// Tile server domain name
		TILE_SERVER_PATH: "tiles.ats.ucla.edu",

		// Array of city ID that should not show on the map
		HIDDEN_CITIES: ["8", "11"],
        
		// User
		HC_USER_ADMIN: 17,

		// Path for Google Analytics Tracker
		EVENT_TRACKER_ENABLED: true,
		EVENT_VIEW_COLLECTION: "/collection/view/",
		EVENT_LIST_COLLECTION: "/collection/list/",
		EVENT_DETAIL_COLLECTION: "/collection/detail/",
		EVENT_VIEW_OBJECT: "/object/view/",
		EVENT_DETAIL_OBJECT: "/object/detail/",
		EVENT_VIEW_MAP: "/map/view/",
		EVENT_VIEW_CITY: "/city/",

		// Mode of system status
		MODE_DEFAULT: 0,
		MODE_MAP_LIST: 1,
		MODE_COLLECTION_LIST: 2,
		MODE_NARRATIVE: 3,
		MODE_ADD_OBJECT: 4,
		MODE_EDIT_OBJECT: 5,

		// Root Collection Id & Name
		HC_COLLECTIONS: { 
			PUBLIC   : {id : 1, name: "Public Collections"},
			EARTH    : {id : 2, name: "3D Collections"},
			CLASSES  : {id : 3, name: "Classes"},
			FEATURED : {id : 4, name: "Featured Collections"},
			PARTNER  : {id : 5, name: "Partner Collections"},
			USER     : {id : null, name: "My Collections"}
		},

		// Object Types in HyperCities
		HC_OBJECT_TYPE: {
			FOLDER      : 2,
			PLACEMARK   : 3,
			NETWORKLINK : 4,
			EARTHOBJECT : 5,
			EARTHNETWORKLINK: 6
		},

		// Marker Types in HyperCities
		HC_MARKER_STYLE: {
			EMPTY          : 0,
			POINT          : 1,
			POLYLINE       : 2,
			POLYGON        : 3,
			EARTH_POINT    : 4,
			EARTH_POLYLINE : 5,
			EARTH_POLYGON  : 6,
			EARTH_MODEL    : 7,
			EARTH_VIEW     : 8
		},

		// Marker State
		HC_MARKER_STATE: {
			VISIBLE        : 0,
			HIDDEN         : 1
		},

		// Object State
		HC_OBJECT_STATE: {
			"PUBLIC"    : 1,
			"PROTECTED" : 2, // Private, but show to public
			"PRIVATE"   : 3, // Private, and show only to member
			"FLAGGED"   : 4, // Being flagged inappropriate
			"DELETED"   : 5  // Being deleted by user
		},

		// access right
		HC_ACCESS_VIEW: 1,
		HC_ACCESS_EDIT: 2,
		HC_ACCESS_VIEW_EDIT: 3,
		HC_ACCESS_VIEW_DELETE: 5,
		HC_ACCESS_VIEW_EDIT_DELETE: 7
	};
}(); // end of Object
// end of file
