<?php
include_once("includes/connect_db.inc");
include_once("includes/util.inc");
include_once("includes/kml.inc");
include_once("includes/dbUtil.inc");
include_once("includes/kmlParser.inc");
include_once("includes/user.inc");


//test case
/* CASE 1
$_POST['creator'] = 'Jay';
$_POST['title'] = 'Point Case';
$_POST['copyright'] = 'CCBY';
$_POST['content'] = 'Type the description of here.<br>Also, we support some <b>Basic</b> HTML tags.';
$_POST['markerType'] = 1;
$_POST['latlng'] = '{"latlng": [{"lng": -118.3046875, "lat": 34.30714385628804, "alt": 0}]}';
$_POST['dateFrom'] = '1700-03-11T00:00:00-08:00';
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
$_POST['markerType'] = 6; 
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
									'markerType' => 'int', 'creator' => 'str', 
									'copyright' => 'str', 'latlng' => 'str', 
									'dateFrom' => 'dtime', 'dateTo' => 'dtime', 
									'parents' => 'str', 'zoom' => 'int', 
									'view' => 'str', 'objectType' => 'int',
									'isHidden' => 'int'),
								array('title', 'markerType', 'latlng', 'dateFrom', 
									'dateTo', 'parents', 'objectType'),
								array('content', 'creator', 'copyright', 'zoom', 
									'view', 'isHidden'));

$title = $HC_POST['title'];
$content = $HC_POST['content'];
$creator = $HC_POST['creator'];
$copyright = $HC_POST['copyright'];
$markerStyleId = $HC_POST['markerType'];
$markerStateId = $HC_POST['isHidden'];
$objType = $HC_POST['objectType'];
$latlng = json_decode($HC_POST['latlng'], true);
$latlng = $latlng['latlng'];
$zoom = $HC_POST['zoom'];

if (!empty($HC_POST['view'])) {
	$view = json_decode($HC_POST['view'], true);
} else {
	// for 2d objects, use lat, lng of first point
	$view = array("lat"=>$latlng[0]['lat'], "lng"=>$latlng[0]['lng'], "alt"=> 0); 
}

$view = KmlParser::createViewFromArray($view);
$createTime = date( 'Y-m-d H:i:s');
$userId = cServerSession::getUserId();
$parents = explode(',', $HC_POST['parents']);
$dateFrom = $HC_POST['dateFrom'];
$dateTo = $HC_POST['dateTo'];

//create KML content
$kmlObj = new cKml($markerStyleId, $latlng, $title, NULL, false, NULL, NULL, $view);
$kmlObj->createKml();
$kml = $kmlObj->dumpKml();

// use kml passed by client side
if ($objType == HC_OBJECT_TYPE_3D)
	$kml = $HC_POST['kml'];

try {
	// Insert new object
	$objectId = insertObject($title, $objType, $content, $creator, 
							$copyright, $createTime, $userId);
	$objectMappingId = insertObjectMapping($objectId, $markerStyleId, $kml, $dateFrom,
								 $dateTo, $latlng, $createTime, $view, $zoom, $markerStateId);

	// Add this object to collections
	foreach($parents as $addedParentId) {
		$object = array('object_id' => (int)$addedParentId,
						'subject_id' => $objectId,
						'scope_id' => (int)$addedParentId,
						'owner_id' => $userId,
						'created_at' => 'NOW()',
						'updated_at' => 'NOW()');
		$result = insert("object_relations", $object);
			
		// Update parent collections' timespan and boundary up to the root collections
		$object = updateColTimeBoundBottomUp($addedParentId);
	}

	HC_reportSuccess("Object added successfully.");
} catch (MysqlException $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("adding your object");
} catch (Exception $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportGeneralError("adding your object");
}
?>
