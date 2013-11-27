<?php
/**
 * Return the data of object cid,
 * If fmt contain 'c', returns the content of collection
 * If fmt contain 'm', returns the metadata of collection
 * If fmt contain 'h', returns the HyperCities Ext Data of collection
 */
include_once("includes/serverSession.inc");
include_once("includes/dbUtil.inc");
include_once("includes/user.inc");
include_once('includes/HCCollection.inc');

// Start session
cServerSession::start();
HC_checkReferer();

//test case
/*
$_GET['fmt'] = "cmh";
$_GET['cid'] = 16314;
$_GET['cid'] = 16292;
$_GET['cid'] = 16084;
//*/

$HC_GET = HC_sanitizeInput($_GET,
							array('fmt'=>'str', 'cid'=>'int'),
							array('fmt', 'cid'));

$getMeta = (strpos($HC_GET['fmt'], 'm') !== false);
$getHCData = (strpos($HC_GET['fmt'], 'h') !== false);
$getContent = (strpos($HC_GET['fmt'], 'c') !== false);
$objectId = $HC_GET['cid'];

$userId = cServerSession::getUserId();
$isAdmin = cServerSession::isAdmin();

try {

	$result = array();

	// Get Collection Metadata
	$collectionInfo = HCCollection::getCollectionInfoById($objectId, $isAdmin);

	// Always return objectId, title and ownerId field
	$result['id'] = $objectId;
	$result['title'] = $collectionInfo['title'];
	$result['owner'] = $collectionInfo['owner_id'];

	if ($getMeta) { // Add Metadata to result set
		$result['creator'] = $collectionInfo['creator'];
		$result['copyright'] = $collectionInfo['copyright'];
		$result['dateFrom'] = HC_getKmlTimeString($collectionInfo['date_from'],
													$collectionInfo['dateFrom_isBC']);
		$result['dateTo'] = HC_getKmlTimeString($collectionInfo['date_to'],
												$collectionInfo['dateTo_isBC']);
		$result['description'] = trim($collectionInfo['description']);

		if ($collectionInfo['object_type_id'] === HC_OBJECT_TYPE_KML ||
			$collectionInfo['object_type_id'] === HC_OBJECT_TYPE_3D_NETWORKLINK) {
			$result['linkUrl'] = $collectionInfo['kml'];
		}

		$result['parents'] = array();
		$parentCollections = getParentCollections($objectId);
		// trim whitespaces in collection name
		foreach ($parentCollections as &$collection) {
			$result['parents'][] = array('id' => $collection['id'],
				'title' => trim($collection['title']),
				'owner' => $collection['owner_id']);
		}
		unset($collection);
	}

	if ($getContent) { // Add Content to result set
		$result['content'] = trim($collectionInfo['content']);
	}

	if ($getHCData) { // Add HyperCities Ext Data to result set
		$result['markerState'] = $collectionInfo['marker_state_id'];
		$result['objectType'] = $collectionInfo['object_type_id'];
		$result['markerStyle'] = $collectionInfo['marker_style_id'];

		$result['coauthors'] = array();
		$coauthors = HCCollection::getCollectionPrivilege($objectId);
		foreach ($coauthors as $coauthor) {
			$result['coauthors'][] = array(
				'userId' => $coauthor['user_id'],
				'accessRight' => $coauthor['access_right_id'],
				'email' => $coauthor['email'],
				'firstName' => $coauthor['first_name'],
				'lastName' => $coauthor['last_name']);
		}
	}

	header('Content-type: application/json');
	echo json_encode($result);

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
