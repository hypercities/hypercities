/**
 * Quick and dirty XML plugin for jQuery 1.4
 * (jQuery 1.5 introduced parseXML)
 * @author: Dave Shepard
 * @copyright: 2012 The Regents of the University of California
 */

(function ($) {
	$.parseXML = function (text) {
		if (typeof DOMParser != 'undefined') {
			return (new  DOMParser()).parseFromString(text, "application/xml");
		} else if (typeof ActiveXObject != "undefined") {
			var doc = new ActiveXObject("MSXML2.DOMDocument");
			doc.loadXML(text);
			return doc;
		}
	}
})($);
