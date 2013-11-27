<?php
require_once 'includes/constants.inc';

if (!isset($_POST['openid_identifier'])) {
?>

﻿<!--!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"-->
<!--html xmlns="http://www.w3.org/1999/xhtml" -->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:fb="http://www.facebook.com/2008/fbml"> 
<head>
<title>HyperCities OpenID Plugin</title>
<link rel="stylesheet" type="text/css" media="screen" href="css/openid.css" />
</head>
<body>

<p>HyperCities allows you to login using a pre-existing account from any of the 
	providers below. Please select a provider to login.  First time users of
	HyperCities will need to complete a registration form after logging in.</p>

<p>HyperCities does not store your username or password, or receive any personal
	information from the website you choose.</p>
	
<p>Please note that all sessions have a two-hour limit. If you plan to work for
	longer than that, please log out before the time limit and log back in.
</p>

<h2>Please choose your provider</h2>
<form class="openid" method="post" action="<?php echo $_SERVER['PHP_SELF']; ?>"> 
	<div><ul class="providers"> 
			<li class="openid" title="OpenID"><img src="images/openId/openidW.png" alt="icon" /> 
			<span><strong>http://{your-openid-url}</strong></span></li> 
			<li class="direct" title="Google"> 
			<img src="images/openId/googleW.png" alt="icon" />
				<span>https://www.google.com/accounts/o8/id</span></li>
			<li class="direct" title="Facebook"> 
			<img src="images/openId/facebookW.png" alt="icon" />
				<span>http://www.facebook.com/</span></li>
			<li class="username" title="Yahoo"> 
			<img src="images/openId/yahooW.png" alt="icon" />
				<span>http://yahoo.com/<strong>username</strong></span></li>
			<li class="username" title="MySpace"> 
			<img src="images/openId/myspaceW.png" alt="icon" />
				<span>http://www.myspace.com/<strong>username</strong></span></li>
			<li class="username" title="AOL"> 
			<img src="images/openId/aolW.png" alt="icon" />
				<span>http://openid.aol.com/<strong>username</strong></span></li>
			<li class="direct" title="Twitter"> 
			<img src="images/openId/twitterW.png" alt="icon" />
				<span>http://twitter.com/</span></li>
			<li class="legacy" title="HyperCities Legacy">
			<img src="images/openId/hypercitiesW.png" alt="HyperCities Legacy" /><span></span></li>
			<!--
			<li class="username" title="MyOpenID"> 
			<img src="images/openId/myopenid.png" alt="icon" /><span>http://<strong>username</strong>.myopenid.com/</span></li> 
			<li class="username" title="Flickr"> 
			<img src="images/openId/flickr.png" alt="icon" /><span>http://flickr.com/<strong>username</strong>/</span></li> 
			<li class="username" title="Technorati"> 
			<img src="images/openId/technorati.png" alt="icon" /><span>http://technorati.com/people/technorati/<strong>username</strong>/</span></li> 
			<li class="username" title="Wordpress"> 
			<img src="images/openId/wordpress.png" alt="icon" /><span>http://<strong>username</strong>.wordpress.com</span></li> 
			<li class="username" title="Blogger"> 
			<img src="images/openId/blogger.png" alt="icon" /><span>http://<strong>username</strong>.blogspot.com/</span></li> 
			<li class="username" title="LiveJournal"> 
			<img src="images/openId/livejournal.png" alt="icon" /><span>http://<strong>username</strong>.livejournal.com</span></li> 
			<li class="username" title="ClaimID"> 
			<img src="images/openId/claimid.png" alt="icon" /><span>http://claimid.com/<strong>username</strong></span></li> 
			<li class="username" title="Vidoop"> 
			<img src="images/openId/vidoop.png" alt="icon" /><span>http://<strong>username</strong>.myvidoop.com/</span></li> 
			<li class="username" title="Verisign"> 
			<img src="images/openId/verisign.png" alt="icon" /><span>http://<strong>username</strong>.pip.verisignlabs.com/</span></li> 
			-->
	</ul></div>
    <div id="openIdLogin">
	<fieldset id="openId_Provider">
		<label for="openid_username">Enter your <span>Provider user name</span></label> 
		<div><span></span><input type="text" name="openid_username" /><span></span> 
			<input type="submit" value="Login" /></div> 
	</fieldset> 
	<fieldset id="openId_Identifier">
		<label for="openid_identifier">Enter your
			<a class="openid_logo" href="http://openid.net">OpenID</a></label>
		<div><input type="text" name="openid_identifier" /> 
			<input type="submit" value="Login" /></div> 
	</fieldset> 
	<input type="hidden" name="providerName" />
	<input type="hidden" name="oidType" />
    </div>
    
</form>

<div id="legacyLogin">
    <br/>
	<p id="loginFailureMessage" style="color: #FF0000"></p>
        <p>This login is for people who created accounts on HyperCities prior to
			January 2010.  All other users should choose another provider to login.</p>
        <form method="post" action="./loginOidReturn.php">
            <!--form method="post" action="<?php echo $_SERVER['PHP_SELF'];?>"-->
            <table>
                <tr>
		<div class="formItem">
			<td><label> Email: </label></td>
			<td><input id="username" type="text" name="username" class="textbox" /></td>
		</div>
                    </tr>

		<div class="formItem">
			<td><label> Password: </label></td>
			<td><input id="password" type="password" name="password" class="textbox" /></td>
		</div>
            <tr><td>
                <input type="hidden" name="providerName" value="HyperCities Legacy" />
                <input type="hidden" name="openid_identifier" value="HyperCities Legacy" />
                <input type="hidden" name="oidType" value="0" /></td>
                <td style="text-align: right">
					<input id="loginBtn" type="submit" value="Login" name="submit" />
				</td>
            </tr>
            </table>
        </form>
    </div>

<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.3.1/jquery.min.js"></script>
<script type="text/javascript" src="scripts/jqueryPlugin/jquery.openid.js"></script>
<script type="text/javascript">  $(function() { $("form.openid:eq(0)").openid(); });</script>
<script type="text/javascript" src="http://static.ak.connect.facebook.com/js/api_lib/v0.4/FeatureLoader.js.php"></script>
<script type="text/javascript">  FB.init('<?php echo FACEBOOK_CONSUMER_KEY ?>',"xd_receiver.htm"); </script>
</body>

<?php
} else {
	// include files
	set_include_path(get_include_path() . PATH_SEPARATOR . "includes");
	include_once("includes/util.inc");
	require_once("includes/Auth/OpenID/Consumer.php");
	require_once("includes/Auth/OpenID/FileStore.php");
	require_once("includes/Auth/OpenID/SReg.php");
	require_once("includes/Auth/OpenID/AX.php");
	require_once("includes/Auth/OpenID/OAuth.php");
	require_once("includes/OAuth/twitterOAuth.php");
	include_once("includes/serverSession.inc");

	function preprocessOID($openId) {
		if(preg_match("/^http:\/\/yahoo.com/", $openId, $matches)) {
			//$openId is not a valid url in case of yahoo openid, 
			//it is an openId url that will be stored in database
			//strip the username to make it a valid url so that user can be
			//redirected to yahoo authentication
			return $matches[0];
		}

		return $openId;
	}


	// start session (needed for YADIS)
	//session_start();
	cServerSession::start();
	HC_checkReferer();

	// check for form input
	$_POST = HC_cleanInput($_POST, array('openid_identifier' => 'str',
										'providerName' => 'str',
										'oidType' => 'int'),
									array('openid_identifier', 'providerName',
											'oidType'),
			NULL);

	//set openId in session
	$_SESSION['openId'] = $_POST['openid_identifier'];
	$_SESSION['providerName'] = $_POST['providerName'];
	$_SESSION['oidType'] = $_POST['oidType'];

	//process openId before using it
	$openid_identifier = preprocessOID($_POST['openid_identifier']);
	$providerName = $_POST['providerName'];
	$oidType = $_POST['oidType'];
	$returnUrl = "http://".$_SERVER['SERVER_NAME']."/"
				.dirname($_SERVER['PHP_SELF'])."/"."loginOidReturn.php";

	HC_debugLog("openid_identifier=".$openid_identifier);
	HC_debugLog("providerName=".$providerName);
	HC_debugLog("oidType=".$oidType);
	HC_debugLog("return url=".$returnUrl);

	//process openId. facebook and twitter have their own api for login	
	if (strcasecmp($providerName, "Facebook") == 0) {
		header('Location: ' . $returnUrl);
		exit(0);
	}
	else if (strcasecmp($providerName, "twitter") == 0) {
		/* Create TwitterOAuth object with app key/secret */
		$to = new TwitterOAuth(TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET);
		/* Request tokens from twitter */
		$tok = $to->getRequestToken();

		/* Save tokens for later */
		$_SESSION['oauth_request_token'] = $token = $tok['oauth_token'];
		$_SESSION['oauth_request_token_secret'] = $tok['oauth_token_secret'];
		$_SESSION['oauth_state'] = "start";

		/* Build the authorization URL */
		$url = $to->getAuthorizeURL($token);

		header('Location: ' . $url);
		exit(0);
	}
	else {
		// create file storage area for OpenID data
		$store = new Auth_OpenID_FileStore('./oid_store');

		// create OpenID consumer
		$consumer = new Auth_OpenID_Consumer($store);

		// begin sign-in process
		// create an authentication request to the OpenID provider
		$auth = $consumer->begin($openid_identifier);
		if (!$auth) {
			HC_errorLog("Please enter a valid OpenID.");
			HC_reportError("Please enter a valid OpendID");
		}

		if (strcasecmp($providerName, "Google") == 0) {
			//google OpenId uses attibute exchange
			$ax = new Auth_OpenID_AX_FetchRequest("http://openid.net/srv/ax/1.0");
			$ax->add(Auth_OpenID_AX_AttrInfo::make('http://axschema.org/contact/email',
													1, true, "email"));
			$auth->addExtension($ax);
		} else if (strcasecmp($providerName, "MySpace") == 0) {
			//MySpaceId
			$oauth_req = new Auth_OpenID_OAuthRequest(MYSPACE_CONSUMER_KEY);
			$auth->addExtension($oauth_req);
		} else {
			//other OpenId provider, assume they use simple registration
			$sreg = Auth_OpenID_SRegRequest::build(array('email', 'fullname', 'dob',
														'language'), array('nickname'));
			if (!$sreg) {
				HC_errorLog("ERROR: Unable to build Simple Registration request.");
			}
			$auth->addExtension($sreg);
		}

		// redirect to OpenID provider for authentication
		$url = $auth->redirectURL("http://".$_SERVER['SERVER_NAME'], $returnUrl);
		header('Location: ' . $url);
		exit(0);
	}
}
?> 

