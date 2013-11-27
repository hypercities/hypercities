/**
* HyperCities session Objects
*
* @author    HyperCities Tech Team
* @copyright Copyright 2008, The Regents of the University of California
* @date      2008-12-22
* @version   0.7
*
*/

HyperCities.user = function() {
	// do NOT access javascript generated DOM from here; elements don't exist yet
	// Private variable goes here
	var _id = "[HyperCities.user] ";
		_userId = null,
		_nickname = null,
		_login = false,
		_user = null,
		_group = null,
		_email = null,
		_photoUrl = null,
		_userCollecion = null,
		_defaultCollection = null,
		_sync = false,
		_neLat = 0,
		_neLon = 0,
		_swLat = 0,
		_swLon = 0;
		_doReload = false;	// true to reload profile page after sync user

	// Private method goes here
	/**
	 * Parse returned user data. Set user profile
	 * @param Object $data: user data
	 * @return void
	 */
	var _parseSync = function($data) {
		_sync = true;

		$($data).find("User").each(function() {

			_userId = parseInt($("userId", this).text());
			//user has not login
			if (_userId === undefined || _userId === null || isNaN(_userId)) {
				_userId = null;
			} else {
				_email = $("email", this).text();
				_nickname = $("nickname", this).text();
				_photoUrl = $("photoUrl", this).text();
				_userCollection = parseInt($("userCollection", this).text());
				_defaultCollection = $("defaultCollection", this).text();
				HyperCities.config.HC_COLLECTIONS.USER.id = _userCollection;
				_neLat = $("neLat", this).text();
				_neLon = $("neLon", this).text();
				_swLat = $("swLat", this).text();
				_swLon = $("swLon", this).text();
				//set _login to true
				_login = true;
				//show up add media control
				HyperCities.earth.setEarthAddMediaCtrl();
				HyperCities.syncSession();
				$("#loginTab").text("Profile");
			}
		});

		if (_doReload) _loadLoginForm();
	};

	var _loadLoginForm = function() {

		$("#loginTab").text("profile");
		// set up the selected class
		$(".topTab").removeClass('highlight');
		$("#loginTab").parent().addClass('highlight');

		$.ajax({
			url: "loginForm.php",
			cache: false,
			success: function(message) {
				$("#worldMapPanel").fadeOut("normal");
				$("#topPanel").fadeOut("normal", function() {
					$("#topPanel").empty().append(message).fadeIn("normal", function() {
						HyperCities.user.init();
						$("#loadingMessage").fadeOut("slow");
					});
				});
			}
		});
	};

	var _showFailMessage = function() {

		var errorBox = $(document.createElement("div"));
		errorBox.attr("id", "loginErrorBox");
		errorBox.html("It appears that you've entered an incorrect email or password. <br/>" + 'Please try again. Or <a href="./registration.php">register</a> a new account.');

		var closeBox = $(document.createElement("div"));
		closeBox.attr("id", "closeErrorBox");
		closeBox.click(function() {
			$("#loginErrorBox").remove();
		});

		var tipImage = $(document.createElement("div"));
		tipImage.attr("id", "errorBoxTip");

		errorBox.prepend(closeBox).append(tipImage);
		$("#loginForm").prepend(errorBox);

		$("#password").val("").focus();
	};

	/**
	 * Login callback function, for old login
	 */
	var _parseLogin = function($loginResult) {
		var error = $($loginResult).find("Error > Message").text();

		if (error.length > 0) {
			_login = false;
			_showFailMessage();
		} else {
			//success
			_login = true;
			_doReload = true;
			_parseSync($loginResult);
			//_loadLoginForm();
		}
	};

	/**
	 * Reset variables
	 * @return void
	 */
	var _resetUser = function() {

		_userId = null;
		_login = false;
		_user = null;
		_group = null;
		_email = null;
		_photoUrl = null;
		_userCollection = null;
		_defaultCollection = null;
		_sync = false;
		_neLat = 0;
		_neLon = 0;
		_swLat = 0;
		_swLon = 0;
		_doReload = false;
	};

	/**
	 * Log out callback function
	 * @return void
	 */
	var _parseLogout = function() {

		_resetUser();
		$("#worldMapTab").click();
		$("#loginTab").text("login");
		HyperCities.earth.removeEarthAddMediaCtrl();
		HyperCities.syncSession();
	};

	/**
	 * add event listener to login page element
	 * @return void
	 */
	var _addListener = function() {

		//add logout event handler
		if ($("#loginForm #logoutBtn")) $("#loginForm #logoutBtn").unbind("click").click(HyperCities.user.logout);

	};

	return {

		/**
		 * Basic user functions
		 */
		/**
		 * Add event listener for profile page
		 * @return void
		 */
		init: function() {

			_addListener();
		},

		/**
		 * The event handler when login tab is clicked
		 * @return void
		 */
		tabClick: function() {
			if (HyperCities.user.isLogin()) {
				if ($("#loginTab").parent().hasClass('highlight')) return false;

				_loadLoginForm();
			}
			else {
				window.open('./loginOpenId.php', 'Login using OpenId', 'width=640,height=480,scrollbars=1,toolbar=1,menubar=1');
			}
		},

		/**
		 * Sync user data
		 * @return viod
		 */
		sync: function($doReload) {

			HyperCities.util.debug(_id + "Sync user");
			var params = {
				command: "sync"
			};
			// if server session does not have user info, nothing will happen
			// (_parseSync will not be executed)
			$.post("./user.php", params, _parseSync, "xml");

			if ($doReload) {
				_doReload= true;
			} else {
				_doReload= false;
			}
		},

		/**
		 * user logout
		 * @return void
		 */
		logout: function() {
			var data = {
				command: "logout"
			};
			$.post("./user.php", data, _parseLogout, "text");
		},

		/**
		 * user login
		 * @return void
		 */
		login: function() {
			HyperCities.debug(_id + "Login");
			this.blur();

			if ($("#loginErrorBox").length > 0) $("#loginErrorBox").remove();

			var data = {
				command: "login",
				username: $("#username").val(),
				password: $("#password").val()
			};
			$.post("./user.php", data, _parseLogin, "xml");
		},

		/**
		 * User utility functions
		 */
		
		hasUpdatePrivilege: function($objectId, $ownerId, $stateId, $callback) {

			$ownerId = parseInt($ownerId);
			$stateId = parseInt($stateId);

			if (_userId === HyperCities.config.HC_USER_ADMIN || _userId === $ownerId) {
				if ($callback)
					$callback(true);
				else 
					return true;
			} else {

				var params = {
					command: "hasUpdatePrivilege",
					userId: _userId, 
					objectId: $objectId
				}

				// there is a bug for narrative mode here
				$.post("./user.php", params, function($response) {
							if ($callback) {
								$callback($response.hasUpdatePrivilege);
							}
						}, 
					"json"
				);
			}
		},

		hasDeletePrivilege: function($objectId, $ownerId, $stateId) {

			$ownerId = parseInt($ownerId);
			$stateId = parseInt($stateId);
			if (_userId === HyperCities.config.HC_USER_ADMIN || _userId === $ownerId) return true;
			else return false;
		},

		/**
		 * check user status functions
		 */
		isSync: function() {
			return _sync;
		},

		isLogin: function() {
			return _login;
		},

		isAdmin: function() {
			if (HyperCities.user.getUserId() === HyperCities.config.HC_USER_ADMIN) return true;
			else return false;
		},

		/**
		 * getter and setter functions
		 */
		getUserId: function() {
			return _userId;
		},

		getNickname: function() {
			return _nickname;
		}
	};
} (); // end of Object
// end of file


