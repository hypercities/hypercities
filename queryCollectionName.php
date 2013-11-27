<?php
/**
 * Return Array of tuple {id, name, ownerId} of matched result
 * If func is set to 'k', returns the collections which's name contains key
 * If func is set to 'u', returns the collections that owned by current user
 * If func is set to 'p', returns the collections which's parent of cid
 */
include_once("includes/serverSession.inc");
include_once("includes/dbUtil.inc");
include_once("includes/user.inc");

// Start session
cServerSession::start();
HC_checkReferer();

//test case
/*
$_GET['func'] = "k";
$_GET['key'] = "berling";
$_GET['cid'] = 9860;
*/

$HC_GET = HC_sanitizeInput($_GET, 
						array('func'=>'str', 'key'=>'str', 'cid'=>'int'), 
						array('func'), array('key', 'cid'));

$queryType = $HC_GET['func'];
$objectId = $HC_GET['cid'];
$keyword = $HC_GET['key'];
$userId = cServerSession::getUserId();

try {

	$result = array();
	$baseCollectionId = NULL;
	if (cServerSession::getVar("baseCollection")) {
		$baseCollectionId = cServerSession::getVar("baseCollection");
		// load from database
		$rsc = mysql_query("SELECT id, title, owner_id, object_state_id"
						." FROM objects WHERE id = $baseCollectionId;"
				) or die("Could not get $baseCollectionId: ".mysql_error());
		if ($rsc) {
			$collection = mysql_fetch_array($rsc);
		}
		// If the user is the collection's owner, don't include it here, because
		// it will be included in the regular search
		//
		if ($collection['owner_id'] != cServerSession::getUserId() 
				|| $collection['object_state_id'] == 1) {
			// append to results
			$result[] = array(
				'id' => $collection['id'],
				'title' => "<b>" . $collection['title'] . "</b>",
				'owner' => $collection['owner_id'],
			);
		}
		unset($collection);
	}

	// If key is given, always query by key
	if (!strncmp($queryType, "k", 1) && $keyword) {

		$resultCollections = searchCollections("%$keyword%");

		// trim whitespaces in collection name
		foreach ($resultCollections as &$collection) {
			if ($collection['id'] == $baseCollectionId) continue;
			// Hiehlight search keyword
			$title = preg_replace("/($keyword)/i",
				"<b>\${1}</b>", 
				trim($collection['title']));
			if ($collection['id'] == $baseCollectionId) $title = "<b>".$title."</b>";

			$result[] = array('id' => $collection['id'],
				'title' => $title,
				'owner' => $collection['owner_id']);
		}
		unset($collection);
		unset($title);
	}

	// If user is login, query user's owned collection 
	else if (!strncmp($queryType, "u", 1) && $userId) {
		
		$myCollections = getUserCollections($userId);

		// trim whitespaces in collection name
		foreach ($myCollections as &$collection) {
			$result[] = array('id' => $collection['id'],
				'title' => trim($collection['title']),
				'owner' => $collection['owner_id'],
				'state' => $collection['object_state_id'],
				'hasPwd' => !empty($collection['password']));
		}
		unset($collection);
	}

	// If objectId is given, query object's parent collection
	else if (!strncmp($queryType, "p", 1) && $objectId) {

		$parentCollections = getParentCollections($objectId);

		// trim whitespaces in collection name
		foreach ($parentCollections as &$collection) {
			if ($collection['id'] == $baseCollectionId) continue;
			$result[] = array('id' => $collection['id'],
				'title' => trim($collection['title']),
				'owner' => $collection['owner_id'],
				'state' => $collection['object_state_id'],
				'hasPwd' => !empty($collection['password']));
		}
		unset($collection);
	}

	header('Content-type: application/json');
	echo json_encode(array("collections" => $result));

} catch (MysqlException $e) {

	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("query collection names");

} catch (Exception $e) {

	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportGeneralError("query collection names");

}
?>
