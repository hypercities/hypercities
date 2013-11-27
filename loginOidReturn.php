<?php
ini_set('display_errors', 1);
set_include_path(get_include_path() . PATH_SEPARATOR . "includes");
require_once("includes/util.inc");
require_once("includes/dbUtil.inc");
require_once("includes/serverSession.inc");
require_once("includes/user.inc");
require_once("includes/Auth/OpenID/Consumer.php");
require_once("includes/Auth/OpenID/FileStore.php");
require_once("includes/Auth/OpenID/SReg.php");
require_once("includes/Auth/OpenID/AX.php");
require_once("includes/OAuth/twitterOAuth.php");
require_once("includes/facebook-client/facebook.php");
require_once("includes/OAuth/myspace.php");
require_once("includes/Auth/OpenID/OAuth.php");

// start session (needed for YADIS)

cServerSession::start();
//session_start();
if (!isset($_SESSION['redirect']) || $_SESSION['redirect'] == false) {
    ?>
    <script type="text/javascript">
	function loginSuccess()	{
		self.close();
		window.opener.HyperCities.user.sync(true);
	}
</script>
<?php
}

if (isset($_POST['providerName']) && $_POST['providerName'] == "HyperCities Legacy") {
    $_SESSION['providerName'] = $_POST['providerName'];
    $_SESSION['openId'] = $_POST['openId'];
    $_SESSION['oidType'] = $_POST['oidType'];
}

$providerName = $_SESSION['providerName'];
$openId = $_SESSION['openId'];
$oidType = $_SESSION['oidType'];

if (strcasecmp($providerName, "Twitter") == 0) {
	
	/* If the access tokens are already set skip to the API call */
    if ($_SESSION['oauth_access_token'] === NULL
		&& $_SESSION['oauth_access_token_secret'] === NULL)
	{
		/* Create TwitterOAuth object with app key/secret and token key/secret from default phase */
		$to = new TwitterOAuth(TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET, 
								$_SESSION['oauth_request_token'],
								$_SESSION['oauth_request_token_secret']);
		/* Request access tokens from twitter */
		$tok = $to->getAccessToken();

		/* Save the access tokens. Normally these would be saved in a database for future use. */
		$_SESSION['oauth_access_token'] = $tok['oauth_token'];
		$_SESSION['oauth_access_token_secret'] = $tok['oauth_token_secret'];
    }

    /* Create TwitterOAuth with app key/secret and user access key/secret */
    $to = new TwitterOAuth(TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET, 
							$_SESSION['oauth_access_token'],
							$_SESSION['oauth_access_token_secret']);
    /* Run request on twitter API as user. */
    $content = $to->OAuthRequest('https://twitter.com/account/verify_credentials.xml',
								array(), 'GET');
	HC_debugLog("content=".$content);

	$xml = new SimpleXMLElement($content);
	$screenName = $xml->screen_name;
	$openId = $openId.$screenName;
	$_SESSION['openId'] = $openId;
	$_SESSION['openIdPhoto'] = $xml->profile_image_url;
}
else if (strcasecmp($providerName, "Facebook") == 0) {
	$fb = new Facebook(FACEBOOK_CONSUMER_KEY, FACEBOOK_CONSUMER_SECRET);

	if ($fb->get_loggedin_user()) {
		$fbUserId = $fb->get_loggedin_user();
		$info = $fb->api_client->users_getInfo($fbUserId, array('name', 'pic_square_with_logo'));
		HC_debugLog("info=".print_r($info, true));

		$openId = $openId.$info[0]['uid'];
		$_SESSION['openId'] = $openId;
		$_SESSION['openIdPhoto'] = $info[0]['pic_square_with_logo'];
	}
}
// For legacy HyperCities users
else if (strcasecmp($providerName, "HyperCities Legacy") == 0) {
    $username = mysql_real_escape_string($_POST['username']);
    $password = mysql_real_escape_string($_POST['password']);
} else {
	// create file storage area for OpenID data
	$store = new Auth_OpenID_FileStore('./oid_store');

	// create OpenID consumer
	// read response from OpenID provider
	$consumer = new Auth_OpenID_Consumer($store);
	$returnUrl = "http://".$_SERVER['SERVER_NAME']."/".$_SERVER['PHP_SELF'];
	$response = $consumer->complete($returnUrl);
	HC_debugLog("response status=".$response->status);
	//HC_debugLog("response message=".$response->message);

	// set session variable depending on authentication result
	if ($response->status == Auth_OpenID_SUCCESS) {
		if (strcasecmp($providerName, "Google") == 0) {
			// get ax information, this is for google OpenId
			$ax = Auth_OpenID_AX_FetchResponse::fromSuccessResponse($response);
			$email = $ax->getSingle('http://axschema.org/contact/email');
		}
		/*
		else if (strcasecmp($providerName, "MySpace") == 0)
		{
			$oauth_resp = Auth_OpenID_OAuthResponse::fromSuccessResponse($response);
			$authorized_request_token = $oauth_resp->authorized_request_token;
			if ($authorized_request_token){
				$ms = new MySpace(CONSUMER_KEY, CONSUMER_SECRET, $authorized_request_token->key, $authorized_request_token->secret);
				$access_token = $ms->getAccessToken();

				$ms = new MySpace(CONSUMER_KEY, CONSUMER_SECRET, $access_token->key, $access_token->secret);

				$userid = $ms->getCurrentUserId();

				// Use the userID (fetched in the previous step) to get user's profile, friends and other info
				$profile_data = $ms->getProfile($userid);
				$friends_data = $ms->getFriends($userid);

				HC_debugLog("profile=".print_r($profile_data, true));
				HC_debugLog("friends_data=".print_r($friends_data, true));
			}

		}
		*/
		else {
			// get user profile if openId provider support simple registration
			$sreg = new Auth_OpenID_SRegResponse();
			$obj = $sreg->fromSuccessResponse($response);
			$data = $obj->contents(); 
			HC_debugLog(print_r($data, true));
			$email = $data['email'];
		}
	} else {
		//login fail
?>
		Login failed. Click <a href="loginOpenId.php">here</a> to login again.
<?php
        die();
	}
}

//save email in session, google openId registration need this
if (!empty($email)) $_SESSION["email"] = $email;

$isLogin = false;
$user = new cUser();

if (!empty($email)) {
	$isLogin = $user->loginByEmail($email);
} else if (!empty($username)) {
    $isLogin = $user->login($username, $password);
    if (!$isLogin) {
		header('Location: loginOpenId.php#legacy');
		die();
    }
} else {
	$isLogin = $user->loginByOpenId($openId);
}

if ($isLogin) {
    if (!isset($_SESSION['redirect']) || $_SESSION['redirect'] == false) {
	// If login request came from within HyperCities, need to close window
?>
<script type="text/javascript">
	loginSuccess();
</script>
<?php
    } else { // Otherwise, user is coming from Moodle or through another route
	// where login was done before accessing HyperCities
	$_SESSION['redirect'] = false;
	
	header('Location: index.php');
    }
}
else {
	//user has not registered
	//redirect to registration page with pre-filled information
	header('Location: registration.php?isOpenId');
}
?>

