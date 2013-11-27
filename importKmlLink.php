<?php
include_once("includes/connect_db.inc");
include_once("includes/util.inc");
include_once("includes/kml.inc");
include_once("includes/dbUtil.inc");
include_once('includes/serverSession.inc');
include_once('includes/kmlParser.inc');

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
									'objectType' => 'int', 'view' => 'str'),
								array('link', 'title', 'bound', 'dateFrom', 
									'dateTo', 'parents', 'objectType'), 
								array('creator', 'copyright', 'zoom', 'view'));

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

if (!empty($HC_POST['view'])) {
	$view = json_decode($HC_POST['view'], true);
	$view = KmlParser::createViewFromArray($view);
} else $view = NULL;


try {
	// insert it as a single object
	// insert into table contents, objects, objects_users//
	$objectId = insertObject($title, $objType, '', $creator, $copyright, 
							$createTime, $userId);
	$allQueryOk = !empty($objectId);

	// insert into object_mappings table, 
	// no geoReference for kml link
	$object = array('object_id' => $objectId,
					'marker_style_id' => $markerStyleId,
					'kml' => $link,
					'date_from' => $dateFrom,
					'date_to' => $dateTo,
					'ne_lat' => $neLat,
					'ne_lon' => $neLon,
					'sw_lat' => $swLat,
					'sw_lon' => $swLon,
					'created_at' => $createTime,
					'updated_at' => $createTime,
					'view' => $view,
					'zoom' => $zoom);
	$objectMappingId = insert("object_mappings", $object);
	$allQueryOk = !empty($objectMappingId);

	foreach($parents as $addedParentId) {
		$object = array('object_id' => (int)$addedParentId,
						'subject_id' => $objectId,
						'scope_id' => (int)$addedParentId,
						'owner_id' => $userId,
						'created_at' => 'NOW()',
						'updated_at' => 'NOW()');
		$result = insert("object_relations", $object);
			
		$object = updateColTimeBoundBottomUp($addedParentId);
	}

	if (!$allQueryOk) HC_reportError("KML imported failed!");
	else HC_reportSuccess("KML imported successfully!");

} catch (MysqlException $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("importing the KML link");
} catch (Exception $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
    HC_reportGeneralError("importing the KML link");
}
?>
