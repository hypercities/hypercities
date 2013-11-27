<?php
/**
 * NOTE:: This is the old version of query script for maps
 * Switch to new version in the near future.
 */
include('includes/connect_db.inc');
include('includes/util.inc');

//session_start();
HC_checkReferer();
$tile_types = array("", "GraphicsMagick", "MapCruncher", "Web Map Service", "ArcGIS");

if (isset($_POST['neLat']) && isset($_POST['neLon']) &&
	isset($_POST['swLat']) && isset($_POST['swLon']) &&
	isset($_POST['dateFrom_BC']) && isset($_POST['dateTo_BC']) &&
	is_numeric($_POST['neLat']) && is_numeric($_POST['neLon']) &&
	is_numeric($_POST['swLat']) && is_numeric($_POST['swLon'])) {

	$neLat = mysql_real_escape_string($_POST['neLat']);
	$neLon = mysql_real_escape_string($_POST['neLon']);
	$swLat = mysql_real_escape_string($_POST['swLat']);
	$swLon = mysql_real_escape_string($_POST['swLon']);

	$query_str = "SELECT m.id, c.name, year(m.date_from), m.dateFrom_isBC,"
		." year(m.date_to), m.dateTo_isBC, m.title, m.ne_lat, m.ne_lon,"
		." m.sw_lat, m.sw_lon, mp.projection, mp.max_zoom_level, mp.min_zoom_level,"
		." mp.tile_type_id, mp.tile_url, m.description, m.thumbnail_url"
		." from maps m, map_profiles mp, cities c WHERE m.city_id = c.id"
		." AND mp.map_state_id = 1 "
		." AND m.id = mp.map_id AND ( NOT( m.sw_lat >= $neLat OR m.sw_lon"
		." >= $neLon OR m.ne_lat <= $swLat OR m.ne_lon <= $swLon))";

	if(isset($_POST['startTime']) && isset($_POST['endTime'])) {
		$start_time = mysql_real_escape_string($_POST['startTime']);
		$end_time   = mysql_real_escape_string($_POST['endTime']);

		// Both timebound are A.D.
		if ($_POST['dateFrom_BC'] == 0 && $_POST['dateTo_BC'] == 0) {
			$query_str .= " AND ( NOT ( m.date_to < '$start_time' OR m.date_from > '$end_time' ))";
			$query_str .= " AND m.dateFrom_isBC = 0 AND m.dateTo_isBC = 0";
		// Both timebound are B.C.
		} else if ($_POST['dateFrom_BC'] == 1 && $_POST['dateTo_BC'] == 1) {
			$query_str .= " AND ( NOT ( m.date_to > '$start_time' OR m.date_from < '$end_time' ))";
			$query_str .= " AND m.dateFrom_isBC = 1 AND m.dateTo_isBC = 1";
		// Start from B.C. and end at A.D.
		} else {
			$query_str .= " AND ( NOT (( m.date_from > '$end_time' AND m.dateFrom_isBC = 0) OR ";
			$query_str .= "            ( m.date_to > '$start_time' AND m.dateTo_isBC = 1)))";  
		}
	}

	$query_str .= " ORDER BY m.dateFrom_isBC, m.date_from";

	$result = mysql_query($query_str) or die('Gettting map info failed :'. mysql_error());

	$dom = new DomDocument('1.0','utf-8');
	$maps_data = $dom->appendChild($dom->createElement('Maps'));

	while ($row = mysql_fetch_array($result)) {
		$Result = $maps_data->appendChild($dom->createElement('Map'));
		$id = $Result->appendChild($dom->createElement('id'));
		$id->appendChild($dom->createTextNode($row['id']));
		$city = $Result->appendChild($dom->createElement('city'));
		$city->appendChild($dom->createTextNode($row['name']));
		$date_from = $Result->appendChild($dom->createElement('date_from'));

		if ($row['dateFrom_isBC'] == 1) {
			$date_from->appendChild($dom->createTextNode(
					sprintf("-%d",$row['year(m.date_from)'])
				)
			);
		} else {
			$date_from->appendChild($dom->createTextNode(
					sprintf("%d",$row['year(m.date_from)'])
				)
			);
		}

		$date_to = $Result->appendChild($dom->createElement('date_to'));
		if ( $row['dateTo_isBC'] == 1 ) {
			$date_to->appendChild($dom->createTextNode(
					sprintf("-%d",$row['year(m.date_to)'])
				)
			);
		} else {
			$date_to->appendChild($dom->createTextNode(
					sprintf("%d",$row['year(m.date_to)'])
				)
			);
		}

		$title = $Result->appendChild($dom->createElement('title'));
		$title->appendChild($dom->createTextNode($row['title']));
		$neLat = $Result->appendChild($dom->createElement('neLat'));
		$neLat->appendChild($dom->createTextNode($row['ne_lat']));
		$neLon = $Result->appendChild($dom->createElement('neLon'));
		$neLon->appendChild($dom->createTextNode($row['ne_lon']));
		$swLat = $Result->appendChild($dom->createElement('swLat'));
		$swLat->appendChild($dom->createTextNode($row['sw_lat']));
		$swLon = $Result->appendChild($dom->createElement('swLon'));
		$swLon->appendChild($dom->createTextNode($row['sw_lon']));
		$projection = $Result->appendChild($dom->createElement('projection'));
		$projection->appendChild($dom->createTextNode($row['projection']));
		$minZoom = $Result->appendChild($dom->createElement('minZoom'));
		$minZoom->appendChild($dom->createTextNode($row['min_zoom_level']));
		$maxZoom = $Result->appendChild($dom->createElement('maxZoom'));
		$maxZoom->appendChild($dom->createTextNode($row['max_zoom_level']));
		$description = $Result->appendChild($dom->createElement('description'));
		$description->appendChild($dom->createTextNode($row['description']));
		$tile_type = $Result->appendChild($dom->createElement('tile_type'));
		$tile_type->appendChild($dom->createTextNode($tile_types[$row['tile_type_id']]));
		$tile_url = $Result->appendChild($dom->createElement('tile_url'));
		$tile_url->appendChild($dom->createTextNode($row['tile_url']));
		$thumbnail_url = $Result->appendChild($dom->createElement('thumbnail_url'));

		if (HC_checkUrl($row['thumbnail_url'])) {
			$thumbnail_url->appendChild($dom->createTextNode($row['thumbnail_url']));
		} else {
			$thumbnail_url->appendChild($dom->createTextNode("./images/thumbError.gif"));
		}
	}

	$dom->formatOutput = true;
	$maps_list_xml = $dom->saveXML();
	header('Content-type: application/xml');
	echo $maps_list_xml;
}
else {
	HC_reportError("Missing required fields");
}
?>
