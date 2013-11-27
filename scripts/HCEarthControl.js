// vim: sw=4:ts=4:nu:nospell

/**
 * HyperCities Earth Control Object
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2010-01-04
 * @version   0.7
 *
 */

// Create Namespace
/**
 * The Earth Control Class
 * @param Object $ge: the google earth plugin instance
 * @param Object $gex: the google earth extension instance
 */
var HCEarthControl = function($ge, $gex) {

	// private variables
	// remove the trailing characters after # (for permalink)
	var _baseUrl             = window.location.href.replace(/#[\w\W]*/g, "");
		_addMediaBtnPath     = _baseUrl+"images/add3D",
		_addPlacemarkBtnPath = _baseUrl+"images/add3DPlacemark",
		_addPolylineBtnPath  = _baseUrl+"images/add3DPolyline",
		_addPolygonBtnPath   = _baseUrl+"images/add3DPolygon",
		_addKmlBtnPath       = _baseUrl+"images/add3DKml",
		_addFolderBtnPath    = _baseUrl+"images/add3DFolder",
		_reset3DBtnPath      = _baseUrl+"images/reset3D",
		_self                = this;

	// priviledge variables
	this.GEarth                   = $ge;
	this.GEarthEx                 = $gex;
    this.id                       = "[HCEarthControl] ";
	this.addMediaBtn              = new HCEarthBtn("addMedia", $ge, $gex, 100, 2, 42, 42, _addMediaBtnPath);
	this.addPlacemark             = new HCEarthBtn("addPlacemark", $ge, $gex, 100, 42, 42, 42, _addPlacemarkBtnPath);
	this.addPolyline              = new HCEarthBtn("addPolyline", $ge, $gex, 100, 82, 42, 42, _addPolylineBtnPath);
	this.addPolygon               = new HCEarthBtn("addPolygon", $ge, $gex, 100, 122, 42, 42, _addPolygonBtnPath);
	this.addKml                   = new HCEarthBtn("addKml", $ge, $gex, 100, 162, 42, 42, _addKmlBtnPath);
	this.addFolder                = new HCEarthBtn("addFolder", $ge, $gex, 100, 202, 42, 42, _addFolderBtnPath);
	this.reset3D                  = new HCEarthBtn("reset3D", $ge, $gex, 144, 2, 42, 42, _reset3DBtnPath);
	this.overlayIdList            = [];     // stores all screen overlay of earth control button
	this.state                    = "fold";	// default state
	this.visibility               = false;	// default visibility
	this.obj                      = null;
	this.draggingStyle            = _self.GEarthEx.dom.buildStyle({
										icon: {
											stockIcon: 'paddle/red-circle',
											hotSpot: { left: '50%', bottom: 0 }
										}
									});
	this.targetScreenOverlay      = {
										icon: 'http://maps.google.com/mapfiles/kml/shapes/cross-hairs.png',
										overlayXY: { left: '50%', top: '50%' },
										screenXY: { left: 0, top: 0 },
										size: { width: 32, height: 32 }
									};




	//constructor codes start from here

	this.fold = function() {
		// If add media button is hidden, do nothing
		if (!this.visibility) return;

		this.state = "fold";
		this.addPlacemark.hide();
		this.addPolyline.hide();
		this.addPolygon.hide();
		this.addKml.hide();
		this.addFolder.hide();
	}

	this.unfold = function() {
		// If add media button is hidden, do nothing
		if (!this.visibility) return;

		this.state = "unfold";
		this.addPlacemark.show();
		this.addPolyline.show();
		this.addPolygon.show();
		this.addKml.show();
		this.addFolder.show();
	}

	this.editPlacemark = function() {
		var pm = _self.obj;

		_self.GEarthEx.edit.makeDraggable(pm, {
			dropCallback: function() {},
			draggingStyle: _self.draggingStyle,
			targetScreenOverlay: _self.targetScreenOverlay
		});

	}

	this.editPolyline = function() {
		var pm = _self.obj;
		_self.GEarthEx.edit.editLineString(pm.getGeometry());
	}

	this.editPolygon = function() {
		var pm = _self.obj;
		_self.GEarthEx.edit.editLineString(pm.getGeometry().getOuterBoundary());
	}


	//add event listener
	/**
	 * add media button click event handler
	 */
	this.addMediaBtn.click(function(){
		// If add media button is hidden, do nothing
		if (!_self.visibility) return;

		if (_self.state === "fold") {
			_self.state = "unfold";
			_self.addPlacemark.show();
			_self.addPolyline.show();
			_self.addPolygon.show();
			_self.addKml.show();
			_self.addFolder.show();
		} else if (_self.state === "unfold") {
			HyperCities.earth.restoreSync();
			_self.state = "fold";
			_self.addPlacemark.hide();
			_self.addPolyline.hide();
			_self.addPolygon.hide();
			_self.addKml.hide();
			_self.addFolder.hide();
		}
	});

	this.addPlacemark.click(function() {

		HyperCities.earth.enableSync(false);
		_self.fold();

		var pm = _self.GEarthEx.dom.addPointPlacemark([0, 0, 0], {
			icon: {
				stockIcon: 'paddle/blu-circle',
				hotSpot: { left: '50%', bottom: 0 }
			},
			altitudeMode: _self.GEarth.ALTITUDE_RELATIVE_TO_GROUND
		});

		_self.GEarthEx.edit.place(pm, {
			dropCallback: function() {

				_self.GEarthEx.edit.makeDraggable(pm, {
					dropCallback: function() {},
					draggingStyle: _self.draggingStyle,
					targetScreenOverlay: _self.targetScreenOverlay
				});

				HyperCities.objectEditPanel.load(null, {
						objectType: HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT,
						markerType: HyperCities.config.HC_MARKER_STYLE.EARTH_POINT
					}
				);
			},
			draggingStyle: _self.draggingStyle,
			targetScreenOverlay: _self.targetScreenOverlay
		}); 


		// save the reference so that getLatLng() can access this placemark
		_self.obj = pm;

	});

	this.addPolyline.click(function(){
			
		HyperCities.earth.enableSync(false);

		var placemark = _self.GEarthEx.dom.addLineStringPlacemark({
			lineString: [],
			style: {
				line: { width: 3, color: '#0f0' }
			}
		});

		// save the reference so that getLatLng() can access this placemark
		_self.obj = placemark;

		var coords = placemark.getGeometry().getCoordinates();

		_self.GEarthEx.edit.drawLineString(placemark.getGeometry(), {
			drawCallback: function(coordIndex) {
				var coord = coords.get(coordIndex);
				coords.setLatLngAlt(coordIndex, coord.getLatitude(), coord.getLongitude(), 100);
			},
			finishCallback: function() {
				_self.GEarthEx.edit.editLineString(placemark.getGeometry());
				HyperCities.objectEditPanel.load(null, {
						objectType: HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT,
						markerType: HyperCities.config.HC_MARKER_STYLE.EARTH_POLYLINE
					}
				);
			}
		});
	});

	this.addPolygon.click(function(){
			
		HyperCities.earth.enableSync(false);

		var placemark = _self.GEarthEx.dom.addPlacemark({

			polygon: {
				polygon: [],
				extrude: true,
				altitudeMode: geo.ALTITUDE_RELATIVE_TO_GROUND,
				tessellate: true 
			},

			style: {
				line: { width: 3, color: '#0f0'},
				poly: '#ff0'
			}
		});

		// save the reference so that getLatLng() can access this placemark
		_self.obj = placemark;	

		var coords = placemark.getGeometry().getOuterBoundary().getCoordinates();

		_self.GEarthEx.edit.drawLineString(placemark.getGeometry().getOuterBoundary(), {
			drawCallback: function(coordIndex) {
				var coord = coords.get(coordIndex);
				coords.setLatLngAlt(coordIndex, coord.getLatitude(), coord.getLongitude(), 100);
			},
			finishCallback: function() {
				_self.GEarthEx.edit.editLineString(placemark.getGeometry().getOuterBoundary());
				HyperCities.objectEditPanel.load(null, {
						objectType: HyperCities.config.HC_OBJECT_TYPE.EARTHOBJECT,
						markerType: HyperCities.config.HC_MARKER_STYLE.EARTH_POLYGON
					}
				);
			}
		});
	});

	this.addKml.click(function(){
		HyperCities.earth.enableSync(false);
		HyperCities.objectEditPanel.load(null, {
				objectType: HyperCities.config.HC_OBJECT_TYPE.EARTHNETWORKLINK
			}
		);
	});

	this.addFolder.click(function(){
		HyperCities.earth.enableSync(false);
		HyperCities.objectEditPanel.load(null, {
				objectType: HyperCities.config.HC_OBJECT_TYPE.FOLDER
			}
		);
	});

	// show reset button in 3D
	this.reset3D.show();

	// add reset event handler to reset3D button
	this.reset3D.click(function() {
		HyperCities.mainMap.clearMap();
	});

	$.merge(this.overlayIdList, this.addMediaBtn.getOverlayIds());
	$.merge(this.overlayIdList, this.addPlacemark.getOverlayIds());
	$.merge(this.overlayIdList, this.addPolyline.getOverlayIds());
	$.merge(this.overlayIdList, this.addPolygon.getOverlayIds());
	$.merge(this.overlayIdList, this.addKml.getOverlayIds());
	$.merge(this.overlayIdList, this.addFolder.getOverlayIds());
	$.merge(this.overlayIdList, this.reset3D.getOverlayIds());
	//end of constructor
};

/**
 * Set the visibility of the earth control
 */
HCEarthControl.prototype.setVisibility = function($visibility) {
	this.visibility = $visibility;

	if (this.visibility) this.addMediaBtn.show();
	else this.addMediaBtn.hide();

};

/**
 * Edit 3D object
 */
HCEarthControl.prototype.editObject = function() {

	if ( this.obj === undefined ) 
		alert("Cannot acquire object.");

	HyperCities.earth.enableSync(false);

	var geometry   = this.obj.getGeometry(),
		type       = (geometry !== null) ? geometry.getType() :
											this.obj.getAbstractView().getType();

	switch (type) {
		case "KmlPoint":
			this.editPlacemark();
			break;
		case "KmlLineString":
			this.editPolyline();
			break;
		case "KmlPolygon":
			this.editPolygon();
			break;
		case "KmlLookAt":
		case "KmlCamera":
			break;
	}
}

/**
 * Set editing object. This function is called before editing object.
 * @return {void}
 */
HCEarthControl.prototype.setObject = function($obj) {

	if ( $obj !== undefined ) 
		this.obj = $obj;
}

/**
 * Stop edit object
 * @return {void}
 */
HCEarthControl.prototype.stopEdit = function() {

	var geometry   = this.obj.getGeometry(),
		type       = (geometry !== null) ? geometry.getType() :
											this.obj.getAbstractView().getType();

	switch (type) {
		case "KmlPoint":
			break;
		case "KmlLineString":
			this.GEarthEx.edit.endEditLineString(geometry);
			break;
		case "KmlPolygon":
			this.GEarthEx.edit.endEditLineString(geometry.getOuterBoundary());
			break;
		case "KmlLookAt":
		case "KmlCamera":
			break;
	}

}

HCEarthControl.prototype.unfold = function() {
	// If add media button is hidden, do nothing
	if (!this.visibility) return;

	HyperCities.util.debug("unfold");

	this.state = "unfold";
	this.addPlacemark.hide();
	this.addPolyline.hide();
	this.addPolygon.hide();
	this.addKml.hide();
	this.addFolder.hide();
}

HCEarthControl.prototype.fold = function() {
	// If add media button is hidden, do nothing
	if (!this.visibility) return;

	HyperCities.util.debug("fold");

	this.state = "fold";
	this.addPlacemark.show();
	this.addPolyline.show();
	this.addPolygon.show();
	this.addKml.show();
	this.addFolder.show();
}

/**
 * Reset earth add media control
 * @return {void}
 */
HCEarthControl.prototype.reset = function() {

	// If add media button is hidden, do nothing
	if (!this.visibility) return;

	if (this.state === "unfold") {
		HyperCities.earth.restoreSync();
		this.state = "fold";
		this.addPlacemark.hide();
		this.addPolyline.hide();
		this.addPolygon.hide();
		this.addKml.hide();
		this.addFolder.hide();
	}

	// remove edited object from earth
	if (this.obj !== null) {
		this.stopEdit();
		HyperCities.earth.removeKmlObject(this.obj);
		this.obj = null;
	}

}

/**
 * Get the kml of added or edited object
 * @return {String} kml string
 */
HCEarthControl.prototype.getObjKml = function() {
	if (this.obj === null)
		return null;
	else {
		// set view to obj before returning kml string
        var view = HyperCities.earth.getCamera();
        // remove timespan, avoiding getting wrong timespan
        view.setTimePrimitive(null);
		this.obj.setAbstractView(view);
		var kml = this.obj.getKml();
		/*
		// remove all namespaces to prevent simple xml adding ns prefix
		kml = kml.replace(/<kml\b[^>]*>/g, '<kml>');
		*/
		// remove the following ns. It seems to be redundant.
		kml = kml.replace(/xmlns:kml="http:\/\/www\.opengis\.net\/kml\/2\.2"/g, '');
		kml = kml.replace(/>[\n\t\s]+</g, '><');
		return kml;
	}
}

/**
 * Get control button ids
 * @return idList {array}
 */
HCEarthControl.prototype.getOverlayIdList = function() {
	return this.overlayIdList;
}

/**
 * Get latitude, longitude and altitude
 * @return {String} latlng in json format
 */
HCEarthControl.prototype.getLatLng = function() {
	
	if ( this.obj === undefined ) 
		alert("Cannot get latitude and longitude of object.");

	var geometry   = this.obj.getGeometry(),
		type       = (geometry !== null) ? geometry.getType() :
											this.obj.getAbstractView().getType(),
		view       = this.obj.getAbstractView();
		json       = {};

	HyperCities.debug(this.id + type);

	json.latlng = [];

	switch (type) {
		case "KmlPoint":
			json.latlng.push({lat: geometry.getLatitude(), 
							lng: geometry.getLongitude(),
							alt: geometry.getAltitude()});
			break;
		case "KmlLineString":
			var coordArray = geometry.getCoordinates();
			var length = coordArray.getLength();
			for (var i=0; i<length; i++) {
				json.latlng.push({lat: coordArray.get(i).getLatitude(), 
							lng: coordArray.get(i).getLongitude(),
							alt: coordArray.get(i).getAltitude()});
			}
			break;
		case "KmlPolygon":
			var coordArray = geometry.getOuterBoundary().getCoordinates();
			var length = coordArray.getLength();
			for (var i=0; i<length; i++) {
				json.latlng.push({lat: coordArray.get(i).getLatitude(), 
							lng: coordArray.get(i).getLongitude(),
							alt: coordArray.get(i).getAltitude()});
			}
			break;
		case "KmlModel":
			json.latlng.push({lat: geometry.getLocation().getLatitude(), 
							lng: geometry.getLocation().getLongitude(),
							alt: geometry.getLocation().getAltitude()});
			break;
		case "KmlLookAt":
		case "KmlCamera":
			json.latlng.push({lat: view.getLatitude(), 
							lng: view.getLongitude(),
							alt: 0});
			break;
	}

	return jsonStr = JSON.stringify(json);
}
