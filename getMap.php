<?php
/**
 * HyperCities query script for maps
 *
 * Return the JSON string that contain all maps match the query constrains
 *
 * @author    HyperCities Tech Team
 * @copyright (c) 2008-2010, by HyperCities Tech Team
 * @date      2010-04-01
 * @version   $Id$
 *
 * Here's the possible type of queries, 'func' is a required field
 * $_GET['func'] = 'b'; // Query the maps that match the timespan and viewport
 * $_GET['func'] = 'u'; // Query the maps that are owned by current login user
 * $_GET['func'] = 'k'; // Query the maps that has keyword in map title
 * $_GET['func'] = 'm'; // Query the maps that has id equals to 'mid'
 *
 * Here's the possible query constrains, all are optional fields
 * $_GET['dateFrom'] = '-0300-03-11T00:00:00-08:00';
 * $_GET['dateTo']   = '2010-12-31T00:00:00-08:00';
 * $_GET['key']      = 'berlin';
 * $_GET['mid']      = 12;
 * $_GET['zoom']     = 12;
 * $_GET['bound']    = '{"west": -122.92020400, "south": -34.60841800, '
 *                   . ' "east": 4.35472700, "north": 55.95077900}';
 *
 * Here's the possible return formats, 'fmt' is optional field
 * If 'fmt' contain 'c', returns the description of map
 * If 'fmt' contain 'm', returns the metadata of map
 * If 'fmt' contain 'h', returns the HyperCities Ext Data of map
 * $_GET['fmt'] = 'mhc';
 */

include_once("includes/dbUtil.inc");
include_once("includes/user.inc");

$tile_types = array("", "GraphicsMagick", "MapCruncher");

// Test cases for php command line interface
if (!empty($argc) && strstr($argv[0], basename(__FILE__))) {

	$_GET['func'] = 'b';
	$_GET['fmt'] = "h";
	$_GET['zoom'] = 12;
	$_GET['bound'] = '{"west": -120, "south": 32, "east": -100, "north": 34}';
	$_GET['dateFrom'] = '1700-01-01T00:00:00-08:00';
	$_GET['dateTo'] = '2010-12-31T00:00:00-08:00';

} else { // Start regular setup

	// Check HTTP Referee
	HC_checkReferer();

	// Start session
	include_once("includes/serverSession.inc");
	cServerSession::start();

	// Get session variables
	$userId = cServerSession::getUserId();
	$isAdmin = cServerSession::isAdmin();
}

$HC_GET = HC_sanitizeInput($_GET,
							array('func'=>'str', 'key'=>'str',
							'mid'=>'int', 'bound'=>'str', 'zoom'=>'int',
							'dateFrom'=>'dtime', 'dateTo'=>'dtime',
							'fmt'=>'str'),
							array('func'),
							array('key', 'mid', 'bound', 'zoom',
							'dateFrom', 'dateTo', 'fmt'));

$queryType = $HC_GET['func'];
$getMeta = (strpos($HC_GET['fmt'], 'm') !== false);
$getHCData = (strpos($HC_GET['fmt'], 'h') !== false);
$getContent = (strpos($HC_GET['fmt'], 'c') !== false);
$keyword = $HC_GET['key'];
$mapId = $HC_GET['mid'];

try {

	$mapInfo = array();

	// Query the maps that match the timespan and viewport
	if (!strncmp($queryType, "b", 1)) {

		// Assign default bound if we don't get one from client
		if (!$HC_GET['bound']) {
			$HC_GET['bound'] = '{"west": -180, "south": -90, '
							. '"east": 180, "north": 90}';
		}
		if (!$HC_GET['zoom']) {
			$HC_GET['zoom'] = -1;
		}

		// Assign default timespan if we don't get one from client
		if (!$HC_GET['dateFrom']) {
			$HC_GET['dateFrom'] = "-9999-01-01T00:00:00-08:00";
		}
		if (!$HC_GET['dateTo']) {
			$HC_GET['dateTo'] = "9999-01-01T00:00:00-08:00";
		}

		$mapInfo = getMapInfo($HC_GET['bound'], $HC_GET['zoom'],
								$HC_GET['dateFrom'], $HC_GET['dateTo']);
	}

	// Query the maps that has keyword in map title
	else if (!strncmp($queryType, "k", 1) && $keyword) {
		$mapInfo = searchMaps("%$keyword%");
	}

	// Query the maps that has id equals to 'mid'
	else if (!strncmp($queryType, "m", 1)  && $mapId) {
		$mapInfo = getMapInfoById($mapId);
	}

	// Query the maps that are owned by current login user
	else if (!strncmp($queryType, "u", 1) && $userId) {
		$mapInfo = getUserMaps($userId);
	}

	$result = array();

	foreach ($mapInfo as &$map) {

		// Always return mapId, title, mapTime
		$mapData = array();
		$mapData['opacity'] = 1.0;
		$mapData['z_index'] = 0;

		//$mapData['map'] = array();
		$mapData['id'] = $map['id'];
		$mapData['title'] = $map['title'];

		if ($getMeta) { // Add Metadata to mapData set
			$mapData['mapping']['dateFrom']['date'] = HC_getKmlTimeString($map['date_from'],
				$map['dateFrom_isBC']);
			$mapData['mapping']['dateTo']['date'] = HC_getKmlTimeString($map['date_to'],
				$map['dateTo_isBC']);

			$mapData['mapping']['neLat'] = $map['ne_lat'];
			$mapData['mapping']['neLon'] = $map['ne_lon'];
			$mapData['mapping']['swLat'] = $map['sw_lat'];
			$mapData['mapping']['swLon'] = $map['sw_lon'];
		}

		if ($getContent) { // Add Content to result set
			$mapData['description'] = $map['description'];
		}

		if ($getHCData) { // Add HyperCities Ext Data to result set
			$mapData['maxZoom'] = $map['max_zoom_level'];
			$mapData['minZoom'] = $map['min_zoom_level'];

			$mapData['tileType'] = $tile_types[$map['tile_type_id']];
			$mapData['tileUrl'] = $map['tile_url'];

			$mapData['thumbnailUrl'] = "./images/thumbError.gif";

			if (HC_checkUrl($map['thumbnail_url'])) {
				$mapData['thumbnailUrl'] = $map['thumbnail_url'];
			}
		}

		$result[] = $mapData;
		unset($mapData);
	}
	unset($map);

	header('Content-type: application/json');
	echo json_encode(array("maps" => $result));

} catch (MysqlException $e) {

	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("query maps");

} catch (Exception $e) {

	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportGeneralError("query maps");

}
?>
