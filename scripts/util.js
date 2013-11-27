/**
* HyperCities utility Objects
* Put misc functions here
*
* @author    HyperCities Tech Team 
* @copyright Copyright 2008, The Regents of the University of California
* @date      2009-8-27
* @version   
*
*/

HyperCities.util = function() {

	var _id = "[HyperCities.util] ";

	return {

    /**
     * Check if the cookie is enabled in browser.
     * @return bool
     */
    checkEnv: function() {
      var isIE = false;

      $.each($.browser, function(i, val) {
        if (i == "msie" && val == true) isIE = true;
      });

      if (!navigator.cookieEnabled) {
        $("#warningMessage").html("You must enable Cookies.");
        return false;
      } else if (isIE) {
        var messageDiv = $(document.createElement('div'));
        messageDiv
          .attr('id', 'upgradeMessage')
          .attr('width', '100%')
          .attr('height', '100%')
          .text("Running HyperCities on Internet Explorer requires "
            + "installing the free Google Chrome Frame plugin. \n\n"
            + "You can also view the site in the Firefox, Chrome, "
            + "or Safari browsers without installing any additional "
            + "plugins.");

        var warningDiv = $(document.createElement('div'));
        messageDiv.append(warningDiv);
        warningDiv
          .attr('id', 'ieWarningMessage')
          .attr('width', '100%')
          .attr('height', '100%');

        $('body').append(messageDiv);

        CFInstall.check({node: "ieWarningMessage"});
        return false;
      }
      return true;
    },

		/**
		 *  Function for printing debug message,
		 *  handling the case that Firebug does not installed.
		 *  @param $obj: the object to be print to the debug console
		 */
		debug: function($obj) {
			if (!HyperCities.config.HC_DEBUG) return;

			if (window.console && window.console.log) {
				window.console.log($obj);
			}
		},

		/**
		 *  Function for checking a certain condition
		 *  @param {Boolean} $cond the condition which should be true
		 *         {String}  $msg  the message that should be displayed if assertion fails.
		 */
		assert: function($cond, $msg) {
			if (!$cond) {
				HyperCities.util.debug("[Assertion Failed] " + $msg);
			}
		},

		/**
		 *  Convert the BBox String to GLatLngBound Object
		 *  i.e BBox=[-122.92020400],[-34.60841800],[139.53004181],[57.14749100]
		 */
		parseBoundingBox: function($bBoxString) {

			var pattern = /^BBox=\[(-?\d+(?:\.\d*)?)\],\[(-?\d+(?:\.\d*)?)\],\[(-?\d+(?:\.\d*)?)\],\[(-?\d+(?:\.\d*)?)\]/i,
			bBoxArray = pattern.exec($bBoxString),
			bBox = {},
			bounds = {};

			if (bBoxArray === null) {
				return null;
			}
			else {
				bBox.west = parseFloat(bBoxArray[1]);
				bBox.south = parseFloat(bBoxArray[2]);
				bBox.east = parseFloat(bBoxArray[3]);
				bBox.north = parseFloat(bBoxArray[4]);
			}

			//bounds = new GLatLngBounds(new GLatLng(bBox.south, bBox.west), new GLatLng(bBox.north, bBox.east));

			return bBox;
		},

		/**
		 * This is an UI helper function
		 * Load users' privilege to an object
		 * @param DomElement $container: a container where to put the user list
		 * @param Number $objectId: the object ID
		 */
		loadUserList: function($container, $objectId) {
			var userList = $("<div></div>");
			var isAdmin = (HyperCities.user.isAdmin()) ? 1: 0;
			var params = {
				objectId: $objectId,
				isAdmin: isAdmin
			};

			$.post("queryPrivilege.php", params, function($data) {

				$($data).find("Folder > privilege").each(function() {

					var userId = parseInt($("userId", this).text());
					var username = $("username", this).text();
					var accessId = parseInt($("accessId", this).text());
					var userItem = $("<div id=" + userId + "></div>");
					var checkbox = $("<div style='float: left'><input type='checkbox'/></div>");
					var username = $("<div style='width:120px; float:left'><span>" + username + "</span></div>");
					var accessItem = HyperCities.util.loadAccessId(userId, accessId);

					userItem.append(checkbox).append(username).append(accessItem);
					userList.append(userItem);
				});
			},
			"xml");

			$container.append(userList);
		},

		/**
		 * This is an UI helper function
		 * @param int $accessId: the access right id
		 * @return jQuery accessItem: jquery object containing div of access item
		 */
		loadAccessId: function($userId, $accessId) {
			var accessItem = $("<div><select>"
			//+ "<option value='0'>None</option>"
			+ "<option value='1'>View</option>" + "<option value='2'>Edit</option>" + "<option value='3'>View/Edit</option>" + "<option value='5'>View/Delete</option>" + "<option value='7'>View/Edit/Delete</option>" + "</select></div>");

			accessItem.find("select").data("userId", $userId);
			$("option[value=" + $accessId + "]", accessItem).attr("selected", true);

			return accessItem;
		},

		/**
		 * Returns the class name of the argument or undefined if
		 * it's not a valid JavaScript object.
		 * @param Object obj: the object that will be checked
		 * @param String: the object class name
		 */
		getObjectClass: function(obj) {
			if (obj && obj.constructor && obj.constructor.toString) {
				var arr = obj.constructor.toString().match(/function\s*(\w+)/);

				if (arr && arr.length == 2) {
					return arr[1];
				}
			}

			return undefined;
		},

		/**
		 * Set the sidebar CSS style based on different MODE
		 * @param {MODE} HyperCities.config.MODE_XXXX
		 */
		setSidebarStyle: function($mode) {
			var sidebarDiv = $("#sidebarWrapper"),
				oldClass   = "light",
				newClass   = "dark";

			// These are mode with light color scheme, switch CSS class
			if ($mode === HyperCities.config.MODE_EDIT_OBJECT ||
				$mode === HyperCities.config.MODE_ADD_OBJECT ||
				$mode === HyperCities.config.MODE_NARRATIVE) {
				oldClass = "dark";
				newClass = "light";
			}

			// Apply CSS class to sidebar and resize-handle
			sidebarDiv
				.removeClass(oldClass)
				.addClass(newClass)
				.find(".ui-resizable-handle")
					.removeClass(oldClass)
					.addClass(newClass);
		},

		/** 
		 * Display ajax returned messages
		 * @param $response: xml, returned message
		 * @return void
		 */
		ajaxReport: function($response) {
			var success = $($response).find("Success > Message").text();
			var error = $($response).find("Error > Message").text();

			if (success.length > 0) {
				alert(success);
			}
			else if (error.length > 0) {
				alert(error);
			}
		},

		/**
		 *  Convert Dom Element to XML String
		 *  @param Object $xmlNode
		 *  @return mixed: String on success, false on error
		 */
		xml2Str: function($xmlNode) {
			try {
				// Gecko-based browsers, Safari, Opera.
				return (new XMLSerializer()).serializeToString($xmlNode);
			}
			catch(e) {
				try {
					// Internet Explorer.
					return $xmlNode.xml;
				}
				catch(e) {
					//Other browsers without XML Serializer
					alert('Xmlserializer not supported');
				}
			}
			return false;
		},

		/**
		 *  Convert XML String to Dom Element
		 *  @param String $xmlStr
		 *  @return Object xmlNode
		 */
		str2Xml: function($xmlStr) {
			var browserName = navigator.appName,
			doc;

			if (browserName == 'Microsoft Internet Explorer') {
				doc = new ActiveXObject('Microsoft.XMLDOM');
				doc.async = 'false';
				doc.loadXML($xmlStr);
			} else {
				doc = (new DOMParser()).parseFromString($xmlStr, 'text/xml');
			}
			return doc;
		},

		/**
		 * Event Tracker for Google Analytics
		 * @param String $eventType: defined in HyperCities.config
		 * @param Number $linkId:
		 * @return Boolean: true on success, false on error
		 */
		eventTracker: function($eventType, $linkId) {

			if (HyperCities.config.EVENT_TRACKER_ENABLED) {
				switch ($eventType) {
				case HyperCities.config.EVENT_VIEW_COLLECTION:
				case HyperCities.config.EVENT_LIST_COLLECTION:
				case HyperCities.config.EVENT_DETAIL_COLLECTION:
				case HyperCities.config.EVENT_VIEW_OBJECT:
				case HyperCities.config.EVENT_DETAIL_OBJECT:
				case HyperCities.config.EVENT_VIEW_MAP:
					pageTracker._trackPageview($eventType + $linkId);
					break;
				case HyperCities.config.EVENT_VIEW_CITY:
					// Replace space in city name with underscore
					pageTracker._trackPageview($eventType + encodeURIComponent($linkId.replace(" ", "_")));
					break;
				default:
					return false;
				}
			}
			return true;
		},

		/**
		 * Get file name from file_path string
		 */
		fileFromPath: function ($file) {
			return $file.replace(/.*(\/|\\)/, "");
		},

		/**
		 * Get file extension from file_path string
		 */
		getExt: function ($file) {
			return (/[.]/.exec($file)) ? /[^.]+$/.exec($file.toLowerCase()) : '';
		},

		/**
		 * Parse time string into date object.
		 * @param {String} $timeStr (-YYYY-MM-DDTHH:MM:SSZZZZZZ)
		 * @return {Date} Date object.
		 */
		parseDateTime: function ($timeStr) {
			//HyperCities.util.debug(_id + "[A2] Parse time primitive " + $timeStr);

			var dateStr, year, dateObject;

			if ( $timeStr[0] == '-' ) { // BCE Date
				dateStr = $timeStr.substr(1,19);
				// need to give base, because we might have -0001
				year = parseInt($timeStr.substr(0,5), 10) + 1; 
			} else { // CE Date
				dateStr = $timeStr.substr(0,19);
				year = parseInt($timeStr.substr(0,4), 10);
			}

			//HyperCities.util.debug(_id + "[A2] Parse time primitive " + timeString);
			dateObject = Date.parse(dateStr);
			if ( dateObject ) { // dateObject might be null if timeString is not well format or missing
				dateObject.setFullYear(year);
			}

			return dateObject;
		},

		/**
		 * check if the argument is a valid date
		 * @param String $date: the date string
		 * @return Boolean: true on valid, false on invalid
		 */
		validateDate: function($date) {
			$date = $.trim($date);

			// gYear (YYYY)
			var re = new RegExp("^-?(0?|[1-9]){4}$");
			if (re.test($date)) {
				HyperCities.debug($date + " is in YYYY format");
				return true;
			}

			// gYearMonth (YYYY-MM)
			re = new RegExp("^-?(0?|[1-9]){4}-(0?[1-9]|1[012])$");
			if (re.test($date)) {
				HyperCities.debug($date + " is in YYYY-MM format");
				return true;
			}

			// date (YYYY-MM-DD)
			re = new RegExp("^-?((0?|[1-9]){4})-(0?[1-9]|1[012])-(0?[1-9]|[123][0-9])$");
			if (re.test($date)) {
				HyperCities.debug($date + " is in YYYY-MM-DD format");
				var parts = re.exec($date);
				return Date.validateDay(parseInt(parts[3]), parseInt(parts[4]), parseInt(parts[1]));
			}

			// YYYY-MM-DD hh:mm:ss
			re = new RegExp("^-?((0?|[1-9]){4})-(0?[1-9]|1[012])-(0?[1-9]|[123][0-9])" + "[ ]+(0?[0-9]|[1][0-9]|[2][0-3]):([0-5]?[0-9]):([0-5]?[0-9])$");
			if (re.test($date)) {
				HyperCities.debug($date + " is in YYYY-MM-DD hh:mm:ss format");
				var parts = re.exec($date);
				return Date.validateDay(parseInt(parts[3]), parseInt(parts[4]), parseInt(parts[1]));
			}

			// dateTime (YYYY-MM-DDThh:mm:ssZ)
			re = new RegExp("^-?((0?|[1-9]){4})-(0?[1-9]|1[012])-(0?[1-9]|[123][0-9])" + "T(0?[0-9]|[1][0-9]|[2][0-3]):([0-5]?[0-9]):([0-5]?[0-9])[Z]$");
			if (re.test($date)) {
				HyperCities.debug($date + " is in YYYY-MM-DDThh:mm:ssZ format");
				var parts = re.exec($date);
				return Date.validateDay(parseInt(parts[3]), parseInt(parts[4]), parseInt(parts[1]));
			}

			// dateTime (YYYY-MM-DDThh:mm:sszzzzzz)
			re = new RegExp("/^-?((0?|[1-9]){4})-(0?[1-9]|1[012])-(0?[1-9]|" + "[123][0-9])T(0?[0-9]|[1][0-9]|[2][0-3]):([0-5]?[0-9])" + ":([0-5]?[0-9])[+-]([0-9]{2}|[1][0-9]|[2][0-3]):([0-5][0-9])$/");
			if (re.test($date)) {
				HyperCities.debug($date + " is in YYYY-MM-DDThh:mm:sszzzzzz format");
				var parts = re.exec($date);
				return Date.validateDay(parseInt(parts[3]), parseInt(parts[4]), parseInt(parts[1]));
			}

			HyperCities.debug($date + " is in unknown format");
			return false;
		},

		/**
		 * MD5 (Message-Digest Algorithm)
		 * http://www.webtoolkit.info/
		 * @param String string: the string needs to be encoded
		 * @return String: the encoded string
		 **/
		MD5: function(string) {

			function RotateLeft(lValue, iShiftBits) {
				return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
			}

			function AddUnsigned(lX, lY) {
				var lX4, lY4, lX8, lY8, lResult;
				lX8 = (lX & 0x80000000);
				lY8 = (lY & 0x80000000);
				lX4 = (lX & 0x40000000);
				lY4 = (lY & 0x40000000);
				lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
				if (lX4 & lY4) {
					return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
				}
				if (lX4 | lY4) {
					if (lResult & 0x40000000) {
						return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
					} else {
						return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
					}
				} else {
					return (lResult ^ lX8 ^ lY8);
				}
			}

			function F(x, y, z) {
				return (x & y) | ((~x) & z);
			}
			function G(x, y, z) {
				return (x & z) | (y & (~z));
			}
			function H(x, y, z) {
				return (x ^ y ^ z);
			}
			function I(x, y, z) {
				return (y ^ (x | (~z)));
			}

			function FF(a, b, c, d, x, s, ac) {
				a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
				return AddUnsigned(RotateLeft(a, s), b);
			};

			function GG(a, b, c, d, x, s, ac) {
				a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
				return AddUnsigned(RotateLeft(a, s), b);
			};

			function HH(a, b, c, d, x, s, ac) {
				a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
				return AddUnsigned(RotateLeft(a, s), b);
			};

			function II(a, b, c, d, x, s, ac) {
				a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
				return AddUnsigned(RotateLeft(a, s), b);
			};

			function ConvertToWordArray(string) {
				var lWordCount;
				var lMessageLength = string.length;
				var lNumberOfWords_temp1 = lMessageLength + 8;
				var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
				var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
				var lWordArray = Array(lNumberOfWords - 1);
				var lBytePosition = 0;
				var lByteCount = 0;
				while (lByteCount < lMessageLength) {
					lWordCount = (lByteCount - (lByteCount % 4)) / 4;
					lBytePosition = (lByteCount % 4) * 8;
					lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
					lByteCount++;
				}
				lWordCount = (lByteCount - (lByteCount % 4)) / 4;
				lBytePosition = (lByteCount % 4) * 8;
				lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
				lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
				lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
				return lWordArray;
			};

			function WordToHex(lValue) {
				var WordToHexValue = "",
				WordToHexValue_temp = "",
				lByte, lCount;
				for (lCount = 0; lCount <= 3; lCount++) {
					lByte = (lValue >>> (lCount * 8)) & 255;
					WordToHexValue_temp = "0" + lByte.toString(16);
					WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
				}
				return WordToHexValue;
			};

			function Utf8Encode(string) {
				string = string.replace(/\r\n/g, "\n");
				var utftext = "";

				for (var n = 0; n < string.length; n++) {

					var c = string.charCodeAt(n);

					if (c < 128) {
						utftext += String.fromCharCode(c);
					}
					else if ((c > 127) && (c < 2048)) {
						utftext += String.fromCharCode((c >> 6) | 192);
						utftext += String.fromCharCode((c & 63) | 128);
					}
					else {
						utftext += String.fromCharCode((c >> 12) | 224);
						utftext += String.fromCharCode(((c >> 6) & 63) | 128);
						utftext += String.fromCharCode((c & 63) | 128);
					}

				}

				return utftext;
			};

			var x = Array();
			var k, AA, BB, CC, DD, a, b, c, d;
			var S11 = 7,
			S12 = 12,
			S13 = 17,
			S14 = 22;
			var S21 = 5,
			S22 = 9,
			S23 = 14,
			S24 = 20;
			var S31 = 4,
			S32 = 11,
			S33 = 16,
			S34 = 23;
			var S41 = 6,
			S42 = 10,
			S43 = 15,
			S44 = 21;

			string = Utf8Encode(string);

			x = ConvertToWordArray(string);

			a = 0x67452301;
			b = 0xEFCDAB89;
			c = 0x98BADCFE;
			d = 0x10325476;

			for (k = 0; k < x.length; k += 16) {
				AA = a;
				BB = b;
				CC = c;
				DD = d;
				a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
				d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
				c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
				b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
				a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
				d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
				c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
				b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
				a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
				d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
				c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
				b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
				a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
				d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
				c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
				b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
				a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
				d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
				c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
				b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
				a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
				d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
				c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
				b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
				a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
				d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
				c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
				b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
				a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
				d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
				c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
				b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
				a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
				d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
				c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
				b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
				a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
				d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
				c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
				b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
				a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
				d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
				c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
				b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
				a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
				d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
				c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
				b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
				a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
				d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
				c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
				b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
				a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
				d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
				c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
				b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
				a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
				d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
				c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
				b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
				a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
				d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
				c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
				b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
				a = AddUnsigned(a, AA);
				b = AddUnsigned(b, BB);
				c = AddUnsigned(c, CC);
				d = AddUnsigned(d, DD);
			}

			var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);

			return temp.toLowerCase();
		}
	};
} (); // end of Object
// end of file

