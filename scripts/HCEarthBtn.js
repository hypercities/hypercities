// vim: sw=4:ts=4:nu:nospell

/**
 * HyperCities Earth Control Button Object
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008, The Regents of the University of California
 * @date      2010-01-04
 * @version   0.7
 *
 */

// Create Namespace
/**
 * The Earth Control Button
 * @param Object $ge: the google earth plugin instance
 * @param Object $gex: the google earth extension library instance
 * @param Number x: the x coordinate of the button in pixel
 * @param Number y: the y coordinate of the button in pixel
 * @param String $imagePath: the path of the image file
 * @param $id {string} the id of the button
 */
var HCEarthBtn = function($id, $ge, $gex, x, y, width, height, $imagePath) {

	//private variables
	var _GEarth         = $ge,
		_GEarthEx       = $gex,
		_state          = "hide",	//default state
		_overlayReg     = null,
		_overlayHover   = null,
		_overlayDown    = null,
		_self           = this,
		_drawOrder      = 99,
		_id             = $id,            // the id of the button
		_overlayIds     = [];             // the ids of the screen overlay of button

	/**
	 * Create an screen overlay for the button and add it to earth
	 * @param String suffix: the suffix of image file name
	 * @param Number drawOrder: the draw order
	 * @param Boolean visible: the visibility of the button
	 */
	var _addOverlayForState = function(suffix, drawOrder, visible) {
		var overlayId = _id + suffix;
		_overlayIds.push(overlayId);

		// Create the loading overlay.
		var icon = _GEarth.createIcon('');
		icon.setHref($imagePath + suffix + '.png');

		var overlay = _GEarth.createScreenOverlay(overlayId);
		overlay.setDrawOrder(drawOrder || 0);
		overlay.setVisibility(visible || false);
		overlay.setIcon(icon);
		overlay.getOverlayXY().set(x, _GEarth.UNITS_INSET_PIXELS, y, _GEarth.UNITS_INSET_PIXELS);
		overlay.getScreenXY().set(0, _GEarth.UNITS_FRACTION, 1, _GEarth.UNITS_FRACTION);
		overlay.getSize().set(width, _GEarth.UNITS_PIXELS, height, _GEarth.UNITS_PIXELS);
		_GEarth.getFeatures().appendChild(overlay);

		return overlay;
	};

	/**
	 * Set the visibility of the images
	 * @param String $state: the state of the button
	 * @return void
	 */
	var _setVisibility = function($state) {
		_overlayHover.setVisibility($state === "hover");
		_overlayDown.setVisibility($state === "down");
		_overlayReg.setVisibility($state === "show");
	};


	//previlidge variables
    this.id            = " [HCEarthBtn] "
	this.setState      = function($state) {
		_state = $state;
		_setVisibility(_state);
	};
	this.getState      = function() {
		return _state;
	};
	this.getGEarth      = function() {
		return _GEarth;
	};
	this.getGEarthEx    = function() {
		return _GEarthEx;
	};
	// NOTE: if you have many screen overlay controls, you should collapse
	// this code down to one listener per event to handle all controls.
	this.isMouseOnButton = function(mx, my) {
		var over = false,
            divWidth = $("#map3d").width(),
            xCoord = divWidth - x,
            yCoord = y;

        if (xCoord <= mx && mx <= xCoord + width &&
		yCoord <= my && my <= yCoord + height) {
          over = true;
        }

        return over;
	};


	//constructor codes start from here
	_overlayReg = _addOverlayForState('', _drawOrder, false);
	_overlayHover = _addOverlayForState('_hover', _drawOrder+1, false);
	_overlayDown = _addOverlayForState('_down', _drawOrder+2, false);
		
	google.earth.addEventListener(_GEarth.getWindow(), 'mousedown', function(evt) {
		if (_state === "hide") return;
		
		// left click
		if (evt.getButton() != 0) return;

		if (_self.isMouseOnButton(evt.getClientX(), evt.getClientY())) {
			if (_state === "down") {
				_self.setState("show");
			} else {
				_self.setState("down");
			}
			//event.preventDefault();
			//return false;
		}
	});

	google.earth.addEventListener(_GEarth.getWindow(), 'mousemove', function(evt) {
		if (_state === "hide") return;

		if (_self.isMouseOnButton(evt.getClientX(), evt.getClientY())) {
			if (_state !== "down") {
				_self.setState("hover");
			}
		} else {
			if (_state !== "down") {
				_self.setState("show");
			}
		}
	});

	/*
	google.earth.addEventListener(_GEarth.getWindow(), 'mouseup', function(evt) {
		if (_state === "hide") return;

		var buttonDown = (_state === "down");
		if (buttonDown) {
			_setVisibility(_self.isMouseOnButton(evt.getClientX(), evt.getClientY()) ? 'hover' : '');
			event.preventDefault();
			return false;
		}
	});
	*/

	this.getOverlayIdList = function() {
		return _overlayIds;
	}
}

/**
 * Show the button on earth
 */
HCEarthBtn.prototype.show = function() {
	this.setState("show");
};

/**
 * Show the button on earth
 */
HCEarthBtn.prototype.hide = function() {
	this.setState("hide");
};

/**
 * Get id of KmlScreenOverlay
 * @return overlayIds {array} an array of overlay ids
 */
HCEarthBtn.prototype.getOverlayIds = function() {
	return this.getOverlayIdList();
}

/**
 * Add click event handler
 * @param Function $func: the click event handler
 * @return void
 */
HCEarthBtn.prototype.click = function($func) {

	var _this = this;
	var _GEarth = this.getGEarth();

	google.earth.addEventListener(_GEarth.getWindow(), 'click', function(evt) {

		if (_this.getState() === "hide")
			return;

		if (evt.getButton() === 0 && _this.isMouseOnButton(evt.getClientX(), evt.getClientY())) {
			$func();
		}
	});
};
