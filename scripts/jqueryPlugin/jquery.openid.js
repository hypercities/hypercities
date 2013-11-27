//jQuery OpenID Plugin 1.1 Copyright 2009 Jarrett Vance http://jvance.com/pages/jQueryOpenIdPlugin.xhtml
$.fn.openid = function() {
	var $this = $(this);
	var $usr = $this.find('input[name=openid_username]');
	var $id = $this.find('input[name=openid_identifier]');
	var $front = $this.find('div:has(input[name=openid_username])>span:eq(0)');
	var $end = $this.find('div:has(input[name=openid_username])>span:eq(1)');
	var $usrfs = $this.find('fieldset:has(input[name=openid_username])');
	var $idfs = $this.find('fieldset:has(input[name=openid_identifier])');
	var $providerName = $this.find('input[name=providerName]');
	var $oidType = $this.find('input[name=oidType]');

	var submitusr = function() {
			if ($usr.val().length < 1) {
				$usr.focus();
				return false;
			}
			$id.val($front.text() + $usr.val() + $end.text());
			return true;
		};

	var submitid = function() {
		if ($id.val().length < 1) {
			$id.focus();
			return false;
		}
		return true;

	};
	var direct = function() {
            $("#legacyLogin").hide();
		var $li = $(this);
		$providerName.val($li.attr("title"));
		$oidType.val("0");

		if ($li.attr("title") == "Facebook")
		{
			var callback = function(){
				$li.parent().find('li').removeClass('highlight');
				$li.addClass('highlight');
				$usrfs.fadeOut();
				$idfs.fadeOut();

				var link = $this.find("li.highlight span").text();

				$this.unbind('submit').submit(function() {
						var link = $this.find("li.highlight span").text();
						$id.val($this.find("li.highlight span").text());
						});
				$this.submit();
				return false;
			}

			FB.Connect.requireSession(callback);
			return;
		}
		$li.parent().find('li').removeClass('highlight');
		$li.addClass('highlight');
		$usrfs.fadeOut();
		$idfs.fadeOut();

		var link = $this.find("li.highlight span").text();

		$this.unbind('submit').submit(function() {
				var link = $this.find("li.highlight span").text();
				$id.val($this.find("li.highlight span").text());
				});
		$this.submit();
		return false;
	};

        var legacy = function () {
            var $li = $(this);
            $oidType.val("2");

            $li.parent().find('li').removeClass('highlight');
            $li.addClass('highlight');
            $usrfs.hide();
            $idfs.hide();
            $("#legacyLogin").show();
            //$this.unbind('submit').submit(submitid);
            return false;
        };

	var openid = function() {
            $("#legacyLogin").hide();
		var $li = $(this);
		$oidType.val("2");
		$li.parent().find('li').removeClass('highlight');
		$li.addClass('highlight');
		$usrfs.hide();
		$idfs.show();
		$id.focus();
		$this.unbind('submit').submit(submitid);
		return false;
	};

	var username = function() {
            $("#legacyLogin").hide();
		var $li = $(this);
		$providerName.val($li.attr("title"));
		$oidType.val("1");

		$li.parent().find('li').removeClass('highlight');
		$li.addClass('highlight');
		$idfs.hide();
		$usrfs.show();
		$this.find('label[for=openid_username] span').text($li.attr("title"));
		$front.text($li.find("span").text().split("username")[0]);
		$end.text("").text($li.find("span").text().split("username")[1]);
		$id.focus();
		$this.unbind('submit').submit(submitusr);
		return false;
	};

	var shib = function () {
		var components = window.location.href.split('/');
		components.pop();
		window.location = "http://admin.cdh.ucla.edu/cdhit/jlogin.php?site="
						+ components.join('/') + "/loginOidReturn.php";
	}

	//$this.find('li span').hide();
        $this.find('li.legacy').click(legacy);
	$this.find('li.direct').click(direct);
	$this.find('li.openid').click(openid);
	$this.find('li.username').click(username);
	if (window.location.hash == '#legacy') {
	    $("#loginFailureMessage").text("Username and password not recognized. Please try again.");
	    legacy();
	}
	$id.keypress(function(e) {
			if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
			return submitid();
			}
			});
	$usr.keypress(function(e) {
			if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
			return submitusr();
			}
			});
	//$this.find('li').css('line-height', 0).css('cursor', 'pointer');
	$this.find('li').css('cursor', 'pointer');
	//$this.find('li:eq(0)').click();
	return this;
};
