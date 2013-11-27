<?php
// vim: ts=4:sw=4:fdc=2:nu:nospell

/**
 * @file
 * Update the information of single object within collection.
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-04-30
 * @version   $Id$
 *
 */

include_once("includes/connect_db.inc");
include_once("includes/dbUtil.inc");
include_once("includes/util.inc");
include_once("includes/user.inc");
include_once("includes/kml.inc");
include_once("includes/kmlParser.inc");
include_once("includes/serverSession.inc");


//test case
/* CASE 1
$_POST['objectId'] = 16078;
$_POST['creator'] = 'Jay2';
$_POST['title'] = 'test update point';
$_POST['copyright'] = 'CCBY';
$_POST['content'] = 'update point content';
$_POST['markerType'] = 1;
$_POST['objectType'] = 3;
$_POST['latlng'] = '{"latlng": [{"lng": -118.3046875, "lat": 34.30714385628804, "alt": 0}]}';
$_POST['dateFrom'] = '-0001-03-11T00:00:00-08:00';
$_POST['dateTo'] = '2010-03-11T00:00:00-08:00';
$_POST['view'] = '{"lng": -118.3046875, "lat": 34.30714385628804, "alt": 0}';
$_POST['zoom'] = 15;
$_POST['parents'] = '15630';
 */
/* CASE 2
$_POST['creator'] = 'Jay';
$_POST['title'] = 'Poly Case';
$_POST['copyright'] = 'CCBYNC';
$_POST['content'] = 'Type the description of here.<br/>Also, we support some <b>Basic</b> HTML tags.';
$_POST['type'] = 6; 
$_POST['latlng'] = '{"latlng": [{"lng": -113.5546875, "lat": 43.83452678223684, "alt": 0}, {"lng": -67.5, "lat": 65.2198939361321, "alt": 0}, {"lng": -41.1328125, "lat": 21.94304553343818, "alt": 0}, {"lng": -87.890625, "lat": 30.14512718337613, "alt": 0}]}';
$_POST['dateFrom'] = '-1700-03-11T00:00:00-08:00';
$_POST['dateTo'] = '2010-03-11T00:00:00-08:00';
$_POST['view'] = '{"lng": -102.3046875, "lat": 34.30714385628804, "alt": 0, "heading": 0, "tilt": 0, "roll": 0}';
$_POST['zoom'] = 15;
$_POST['parents'] = '15630';
*/

cServerSession::start();
HC_checkReferer();

$HC_POST = HC_cleanInput($_POST, array('title' => 'str', 'content' => 'str', 
									'markerType' => 'int', 'objectType' => 'int',
									'creator' => 'str',	'copyright' => 'str', 
									'latlng' => 'str', 'dateFrom' => 'dtime', 
									'dateTo' => 'dtime', 'parents' => 'str', 
									'zoom' => 'int', 'view' => 'str', 
									'objectId' => 'int', 'kml' => 'str',
									'isHidden' => 'int'),
								array('title', 'objectType', 'markerType', 'latlng', 
									'dateFrom', 'dateTo', 'parents', 'objectId'),
								array('content', 'creator', 'copyright', 'zoom', 
									'view', 'kml', 'isHidden'));

$objectId = $HC_POST['objectId'];
$title = $HC_POST['title'];
$content = $HC_POST['content'];
$creator = $HC_POST['creator'];
$copyright = $HC_POST['copyright'];
$markerStyleId = $HC_POST['markerType'];
$markerStateId = $HC_POST['isHidden'];
$objectType= $HC_POST['objectType'];
$latlng = json_decode($HC_POST['latlng'], true);
$latlng = $latlng['latlng'];

if ($latlng == "" || $latlng == NULL) 
	HC_reportError('Missing required field: latlng');

$zoom = $HC_POST['zoom'];
$createTime = date( 'Y-m-d H:i:s');
$userId = cServerSession::getUserId();
$parents = explode(',', $HC_POST['parents']);
$oldParents = array();
$dateFrom = $HC_POST['dateFrom'];
$dateTo = $HC_POST['dateTo'];

//calculate the boundary
foreach ($latlng as $latlngalt) {
	$latArray[] = $latlngalt['lat'];
	$lngArray[] = $latlngalt['lng'];
	$altArray[] = $latlngalt['alt'];
}
$neLat = max($latArray);
$neLon = max($lngArray);
$swLat = min($latArray);
$swLon = min($lngArray);

if (!empty($HC_POST['view'])) {
	$view = json_decode($HC_POST['view'], true);
	$view = KmlParser::createViewFromArray($view);
}	

//create KML content
if (empty($HC_POST['kml'])) {
	// for 2D objects
	$kmlObj = new cKml($markerStyleId, $latlng, $title, NULL, false, NULL, NULL, $view);
	$kmlObj->createKml();
	$kml = $kmlObj->dumpKml();
} else {
	// for 3D objects
	$kml = $HC_POST['kml'];
}


try {
	//select the object mapping id
	$sql = "select id from `object_mappings` where object_id = $objectId";
	$row = sqlCommand($sql);
	$objectMappingId = $row[0]['id'];

	//select the old parents
	$result = getParents($objectId);
	foreach ($result as $row) {
		$oldParents[] = $row['object_id'];
	}

	$deletedCollections = array_diff($oldParents, $parents);
	$addedCollections = array_diff($parents, $oldParents);

	// 1.update object table
	$object = array('title' => $title,
					'creator' => $creator,
					'copyright' => $copyright);
	$result = update("objects", $object, "`id` = $objectId");

	// 2. update content table
	$object = select("objects", "id=$objectId");
	$contentId = $object['content_id'];
	if (empty($contentId)) {
		$object = array("content" => $content,
						"created_at" => $createTime,
						"updated_at" => $createTime );
		$contentId = insert("contents", $object);

		$object = array("content_id" => $contentId);
		$result = update("objects", $object, "id = $objectId");
	} else {
		$object = array('content' => $content);
		$result = update("contents", $object, 
					"`id` = (SELECT content_id from `objects` where id=$objectId )"	);
	}

	// 3. update object_mappings
	$object = array('kml' => $kml,
					'date_from' => $dateFrom,
					'date_to' => $dateTo,
					'updated_at' => $createTime,
					'ne_lat' => $neLat,
					'ne_lon' => $neLon,
					'sw_lat' => $swLat,
					'sw_lon' => $swLon,
					'marker_state_id' => $markerStateId);

	// if there is a view, update it. No use right now. Only view in kml that counts
	$object['view'] = $view;

	$result = update("object_mappings", $object, "id = $objectMappingId");
	
	//update geo_reference
	$result = updateGeoReferenceByObjectMappingId($objectMappingId, $latArray, $lngArray, $altArray);
	
	//update object_relation table
	foreach ($deletedCollections as $deletedParentId) {
		$result = delete("object_relations",
						"`object_id` = $deletedParentId and `subject_id`=$objectId");
	}

	//second find the new selected collection id which is selected in 
	//client side but not in DB
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

	HC_reportSuccess("Object updated successfully.");
}
catch (MysqlException $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("updating the object");
}
catch (Exception $e)  {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportGeneralError("updating the object");
}
?>
