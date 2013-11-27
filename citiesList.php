<?php
include_once('includes/connect_db.inc');
include_once('includes/util.inc');
include_once('includes/serverSession.inc');
include_once('includes/dbUtil.inc');

cServerSession::start();
HC_checkReferer();

$default_thumbnail_url = './files/defaultCity.gif';
$query_str = "SELECT c.id, c.name, c.country, c.lat, c.lon, c.zoom,"
			. " c.thumbnail_url FROM cities c order by c.name";
try {
	$result = sqlCommand($query_str); 
} catch (MysqlException $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("adding your object");
} catch (Exception $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportGeneralError("adding your object");
}

$dom = new DomDocument('1.0', 'utf-8');
$cities_data = $dom->appendChild($dom->createElement('Cities'));

foreach($result as $row) {
	$Result = $cities_data->appendChild($dom->createElement('City'));
	$id = $Result->appendChild($dom->createElement('id'));
	$id->appendChild($dom->createTextNode($row['id']));
	$city = $Result->appendChild($dom->createElement('city'));
	$city->appendChild($dom->createTextNode($row['name']));
	$country = $Result->appendChild($dom->createElement('country'));
	$country->appendChild($dom->createTextNode($row['country']));
	$lat = $Result->appendChild($dom->createElement('lat'));
	$lat->appendChild($dom->createTextNode($row['lat']));
	$lon = $Result->appendChild($dom->createElement('lon'));
	$lon->appendChild($dom->createTextNode($row['lon']));
	$zoom = $Result->appendChild($dom->createElement('zoom'));
	$zoom->appendChild($dom->createTextNode($row['zoom']));
	$thumbnail_url = $Result->appendChild($dom->createElement('thumbnail_url'));

	if($row['thumbnail_url'] == NULL) {
		$thumbnail_url->appendChild($dom->createTextNode($default_thumbnail_url));
	} else {
		$thumbnail_url->appendChild($dom->createTextNode($row['thumbnail_url']));
	}
}

$dom->formatOutput = true;
$map_list_xml = $dom->saveXML();
header('Content-type: application/xml');
echo $map_list_xml;

?>
