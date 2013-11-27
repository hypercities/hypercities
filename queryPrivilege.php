<?php

include_once('includes/connect_db.inc');
include_once('includes/util.inc');
include_once('includes/dbUtil.inc');
include_once("includes/serverSession.inc");

//test case
//$_POST['objectId'] = 14704;
//$_POST['isAdmin'] = 0;

//session_start();
cServerSession::start();
HC_checkReferer();

$HC_POST = HC_cleanInput($_POST, array("objectId" => "int", "isAdmin" => "int"),
							array("objectId", "isAdmin"), NULL);

$isAdmin = $HC_POST['isAdmin'];
$objectId = $HC_POST['objectId'];
$sql = "SELECT object_state_id FROM `objects` AS o WHERE o.id = $objectId";
$result = sqlCommand($sql);
$objectState = $result[0]['object_state_id'];

$sql = "SELECT * FROM `objects_users` AS ou, `users` AS u WHERE ou.object_id ="
		." $objectId AND u.id = ou.user_id";
$result = sqlCommand($sql);

$dom = new DomDocument('1.0','utf-8');
$folder = $dom->appendChild($dom->createElement('Folder'));

foreach ($result as $row) {
	$privilege = $folder->appendChild($dom->createElement('privilege'));
	$objectId = $privilege->appendChild($dom->createElement('objectId'));
	$objectId->appendChild($dom->createTextNode($row['object_id']));
	$userId = $privilege->appendChild($dom->createElement('userId'));
	$userId->appendChild($dom->createTextNode($row['userId']));
	$username = $privilege->appendChild($dom->createElement('username'));
	$username->appendChild($dom->createTextNode($row['nickname']));
	$accessId = $privilege->appendChild($dom->createElement('accessId'));
	$accessId->appendChild($dom->createTextNode($row['access_right_id']));
}

if($isAdmin) {
	//select all users who do not have an objects_users entry for this object
	$objectId = $HC_POST['objectId'];
	$sql = "SELECT * FROM `users` AS u WHERE u.id NOT IN (SELECT user_id"
			." FROM `objects_users` AS ou WHERE ou.object_id = $objectId)";
	$result = sqlCommand($sql);

	foreach ($result as $row) {
		$privilege = $folder->appendChild($dom->createElement('privilege'));
		$objectIdNode = $privilege->appendChild($dom->createElement('objectId'));
		$objectIdNode->appendChild($dom->createTextNode($objectId));
		$userId = $privilege->appendChild($dom->createElement('userId'));
		$userId->appendChild($dom->createTextNode($row['id']));
		$username = $privilege->appendChild($dom->createElement('username'));
		$username->appendChild($dom->createTextNode($row['nickname']));
		$accessId = $privilege->appendChild($dom->createElement('accessId'));

		//create default access privilege
		//default privilege for public object: view
		//default privilege for protected object: view
		//default privilege for hidden object: none
		if ($objectState == HC_OBJECT_PUBLIC)
			$accessId->appendChild($dom->createTextNode(1));
		else if ($objectState == HC_OBJECT_PRIVATE)
			$accessId->appendChild($dom->createTextNode(1));
		else if ($objectState == HC_OBJECT_HIDDEN)
			$accessId->appendChild($dom->createTextNode(0));
	}
}
 
$dom->formatOutput = true;
header('Content-type: application/xml');
echo $dom->saveXML();

?>
