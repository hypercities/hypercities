<?php
include_once("includes/connect_db.inc");
include_once("includes/util.inc");
include_once("includes/kml.inc");
include_once("includes/dbUtil.inc");
include_once("includes/MysqlException.inc");
include_once("includes/serverSession.inc");
include_once("includes/kmlParser.inc");

// Test Case
/* CASE 1
$_POST['link'] = 'http://maps.google.com/maps/ms?ie=UTF8&hl=en&vps=1&jsv=213a&msa=0&output=nl&msid=108919828383338171460.000464b8749e82a283927';
$_POST['creator'] = 'Jay';
$_POST['title'] = 'KML Link';
$_POST['copyright'] = 'CCBY';
$_POST['type'] = 4;
$_POST['bound'] = '{"west": -122.92020400, "south": -34.60841800, "east": 4.35472700, "north": 55.95077900}'; 
$_POST['dateFrom'] = '1700-03-11T00:00:00-08:00';
$_POST['dateTo'] = '2010-03-11T00:00:00-08:00';
$_POST['zoom'] = 15;
$_POST['parents'] = '15630';
*/
cServerSession::start();
HC_checkReferer();

$HC_POST = HC_cleanInput($_POST, array('link'=>'urldec', 'title' => 'str',
									'creator' => 'str',	'copyright' => 'str',
									'markerType' => 'int', 'bound' => 'str',
									'dateFrom' => 'dtime', 'dateTo' => 'dtime', 
									'zoom' => 'int', 'parents' => 'str',
									'objectType' => 'int', 'objectId' => 'int',
									'view' => 'str'),
								array('link', 'title', 'bound', 'dateFrom', 
									'dateTo', 'parents', 'objectType'), 
								array('creator', 'copyright', 'zoom', 'view'));
$objectId = $HC_POST['objectId'];
$title = $HC_POST['title'];
$creator = $HC_POST['creator'];
$copyright = $HC_POST['copyright'];
$link = $HC_POST['link'];
$bound = json_decode($HC_POST['bound'], true);
$neLat = $bound['north'];
$neLon = $bound['east'];
$swLat = $bound['south'];
$swLon = $bound['west'];
$createTime = date( 'Y-m-d H:i:s');
$markerStyleId = HC_MARKER_EMPTY;	// no marker for kml or 3d kml 
$objType = $HC_POST['objectType'];	// HC_OBJECT_TYPE_KML or HC_OBJECT_TYPE_3D_NETWORKLINK
$userId = cServerSession::getUserId();
$parents = explode(',', $HC_POST['parents']);
$dateFrom = $HC_POST['dateFrom'];
$dateTo = $HC_POST['dateTo'];
$zoom = $HC_POST['zoom'];

try {
	//select the old parents
	$result = getParents($objectId);
	foreach ($result as $row) {
		$oldParents[] = $row['object_id'];
	}

	$deletedCollections = array_diff($oldParents, $parents);
	$addedCollections = array_diff($parents, $oldParents);


	//update object table
	$object = array('title' => $title,
					'creator' => $creator,
					'copyright' => $copyright);
	$result = update("objects", $object, "`id` = $objectId");

	//no need to insert geo_references
	$object = array('kml' => $link,
					'date_from' => $dateFrom,
					'date_to' => $dateTo,
					'updated_at' => $createTime,
					'ne_lat' => $neLat,
					'ne_lon' => $neLon,
					'sw_lat' => $swLat,
					'sw_lon' => $swLon,
					'zoom' => $zoom);

	// if there is a view, update it
	if (!empty($HC_POST['view'])) {
		$view = json_decode($HC_POST['view'], true);
		$view = KmlParser::createViewFromArray($view);
		$object['view'] = $view;
	}	

	$result = update("object_mappings", $object, "`object_id` = $objectId");	


	// delete object relations
	foreach ($deletedCollections as $deletedParentId) {
		$result = delete("object_relations", "`object_id` = $deletedParentId"
						." and `subject_id`=$objectId");
	}

	foreach($addedCollections as $addedParentId) {
		$object = array('object_id' => $addedParentId,
						'subject_id' => $objectId,
						'scope_id' => $addedParentId,
						'owner_id' => $userId,
						'created_at' => 'NOW()',
						'updated_at' => 'NOW()');
		$result = insert("object_relations", $object);
			

		$object = updateColTimeBoundBottomUp($addedParentId);
		HC_debugLog("boundary and timespan = ".print_r($object, true));
	}

	HC_reportSuccess("Object updated successfully!");
}
catch (MysqlException $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("updating the KML link");
}
catch (Exception $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportGeneralError("updating the KML link");
}
?>
