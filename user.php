<?php
include_once("includes/connect_db.inc");
include_once("includes/serverSession.inc");
include_once("includes/user.inc");
include_once("includes/util.inc");
include_once("includes/dbUtil.inc");

cServerSession::start();
HC_checkReferer();

//sync client user to server
if (!empty($_POST['command']) && $_POST['command'] == "sync") {
	echo cServerSession::getSessionXml();
	exit(0);
}

//user logout
if (isset($_POST['command']) && $_POST['command']=="logout") {
	cServerSession::clearSession();
	exit(0);
}

//user login
if (!empty($_POST['username']) && !empty($_POST['password'])) {

	if(!get_magic_quotes_gpc()) {
		$_POST['username'] = addslashes($_POST['username']);
		$_POST['password'] = addslashes($_POST['password']);
	}

	$user = new cUser();
	$isLogin = $user->login($_POST['username'], $_POST['password']);

	if ($isLogin) echo cServerSession::getSessionXml();
	else HC_reportError("Login fail!");

	//query group table, to make sure it is admin or not
	//echo something for javascript initialize

	exit(0);
}

//query user info
if (isset($_POST['command']) && strcasecmp($_POST['command'], "queryUser") == 0) {

	$user = new cUser();
	$profile = $user->getProfileByLastname($_POST['username']);

	if (count($profile) < 1) HC_reportError("Cannot find user!");

	$dom = new DomDocument('1.0','utf-8');
	$users = $dom->appendChild($dom->createElement('Users'));

	foreach($profile as $row) {
		$user = $users->appendChild($dom->createElement('user'));
		$userId= $user->appendChild($dom->createElement('userId'));
		$userId->appendChild($dom->createTextNode($row['id']));
		$nickname = $user->appendChild($dom->createElement('username'));
		$nickname->appendChild($dom->createTextNode($row['last_name']));
	}

	$dom->formatOutput = true;
	header('Content-type: application/xml');
	echo $dom->saveXML();

	exit(0);
}

//check if the user exists by checking email
if (isset($_POST['command']) && strcasecmp($_POST['command'], "findAuthor") == 0) {

	$user = new cUser();
	$profile = $user->getProfileByEmail($_POST['email']);
	$response = array();

	if (count($profile) < 1) {
		$response['error']      = true;
		$response['message']    = "Cannot find user!";
	} else {
		$response['error']      = false;
		$response['id']         = $profile[0]['id'];
		$response['first_name'] = $profile[0]['first_name'];
		$response['last_name']  = $profile[0]['last_name'];
	}

	header('Content-type: application/json', true, 201);
	echo json_encode($response);

	exit(0);
}

// check if the user has the update privilege
if (isset($_POST['command']) && strcasecmp($_POST['command'], "hasUpdatePrivilege") == 0) {

	$userId             = $_POST['userId'];
	$objectId           = $_POST['objectId'];
	$user               = new cUser();
	$hasUpdatePrivilege = $user->hasUpdatePrivilege($userId, $objectId);
	$response           = array("hasUpdatePrivilege" => $hasUpdatePrivilege);

	header('Content-type: application/json', true, 201);
	echo json_encode($response);

	exit(0);
}
?>
