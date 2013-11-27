<?php
include_once('includes/connect_db.inc');
include_once('includes/util.inc');

HC_checkReferer();
$tile_types = array("", "GraphicsMagick", "MapCruncher");

if( isset($_GET['id']) && is_numeric($_GET['id']) ) 
{
	$ownerId = mysql_real_escape_string($_GET['userId']);
	$mapId = mysql_real_escape_string($_GET['id']);

	$query_str = "SELECT m.id, c.name, date(m.date_from) as date_from,"
		. " date(m.date_to) as date_to, m.title, m.title_en, m.creator,"
		. " date(m.publication_date) as publication_date, m.publisher,"
		. " m.copyright_notice, m.width, m.height, m.scale, m.caption,"
		. " m.caption_en, m.collection_source, m.call_number, m.ne_lat,"
		. " m.ne_lon, m.sw_lat, m.sw_lon, mp.max_zoom_level, mp.min_zoom_level,"
		. " mp.tile_type_id, mp.tile_url, m.description, m.thumbnail_url, m.owner_id"
		. " from maps m, map_profiles mp, cities c WHERE m.city_id = c.id"
		. " AND m.id = mp.map_id AND m.id = $mapId Limit 1";

	//echo $query_str;
	$result = mysql_query($query_str) or die('the query of gettting maps info failed :'. mysql_error());
	while($row = mysql_fetch_array($result))
	{
		if ( isset($_GET['type']) == "xml" ) {
			$dom = new DomDocument('1.0','utf-8');
			$Result = $dom->appendChild($dom->createElement('Map'));
			$id = $Result->appendChild($dom->createElement('id'));
			$id->appendChild($dom->createTextNode($row['id']));
			$city = $Result->appendChild($dom->createElement('city'));
			$city->appendChild($dom->createTextNode($row['name']));
			$date_from = $Result->appendChild($dom->createElement('date_from'));
			$date_from->appendChild($dom->createTextNode($row['date_from']));
			$date_to = $Result->appendChild($dom->createElement('date_to'));
			$date_to->appendChild($dom->createTextNode($row['date_to']));
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
			$dom->formatOutput = true;
			$map_info_xml = $dom->saveXML();
			header('Content-type: application/xml');
			echo $map_info_xml;
		} else {

			$isEditable = ($ownerId == $row['owner_id']);

			$thumbnail_url = str_replace("50", "100", $row['thumbnail_url']);
			$handle = curl_init($thumbnail_url);
			curl_setopt($handle,  CURLOPT_RETURNTRANSFER, TRUE);

			/* Get the HTML or whatever is linked in $url. */
			$response = curl_exec($handle);

			/* Check for 404 (file not found). */
			$httpCode = curl_getinfo($handle, CURLINFO_HTTP_CODE);
			curl_close($handle);

			if($httpCode != 200 && $httpCode != 301 && $httpCode != 302) {
				$thumbnail_url = "./images/thumbDummy". ($row['id']%5+1) .".gif";
			}

?>
<div id="mapInfo_<?= $row['id']; ?>">
	<div class="thumbnail">
		<img src="<?= $thumbnail_url ?>">
	</div>

	<div class="formItem first">
		<div class="label"> City </div>
		<div class="formData"><?= $row['name']; ?></div>
	</div>

	<div class="formItem short">
		<div class="label"> Map Date (yyyy-mm-dd)</div>
		<div class="formData">
			<span id="date_from" <? if ($isEditable) {?>class="editableD" <?};?>><?= $row['date_from']; ?></span> &nbsp;to&nbsp; <span id="date_to" class="editableD"><?= $row['date_to']; ?></span>
		</div>
	</div>

	<div class="formItem short">
		<div class="label"> Publish Date (yyyy-mm-dd)</div>
		<div class="formData">
			<span id="publication_date" <? if ($isEditable) {?>class="editableD" <?};?>><?= $row['publication_date'] ? $row['publication_date'] : "N/A" ; ?></span>
		</div>
	</div>

	<div class="formItem short">
		<div class="label"> Title </div>
		<div class="formData">
			<span id="title" <? if ($isEditable) {?>class="editableW" <?};?>><?= $row['title'] ? $row['title'] : "N/A" ; ?></span>
		</div>
	</div>

	<div class="formItem">
		<div class="label"> English Title </div>
		<div class="formData">
			<span id="title_en" <? if ($isEditable) {?>class="editableW" <?};?>><?= $row['title_en'] ? $row['title_en'] : "N/A" ; ?></span>
		</div>
	</div>

	<div class="formItem">
		<div class="label"> Creator </div>
		<div class="formData">
			<span id="creator" <? if ($isEditable) {?>class="editableW" <?};?>><?= $row['creator'] ? $row['creator'] : "N/A" ; ?></span>
		</div>
	</div>

	<div class="formItem">
		<div class="label"> Publisher </div>
		<div class="formData">
			<span id="publisher" <? if ($isEditable) {?>class="editableW" <?};?>><?= $row['publisher'] ? $row['publisher'] : "N/A" ; ?></span>
		</div>
	</div>

	<div class="formItem">
		<div class="label"> Copyright </div>
		<div class="formData">
			<span id="copyright_notice" <? if ($isEditable) {?>class="editableW" <?};?>><?= $row['copyright_notice'] ? $row['copyright_notice'] : "N/A" ; ?></span>
		</div>
	</div>

	<div class="formItem">
		<div class="label"> Caption </div>
		<div class="formData">
			<span id="caption" <? if ($isEditable) {?>class="editableW" <?};?>><?= $row['caption'] ? $row['caption'] : "N/A" ; ?></span>
		</div>
	</div>

	<div class="formItem">
		<div class="label"> English Caption</div>
		<div class="formData">
			<span id="caption_en" <? if ($isEditable) {?>class="editableW" <?};?>><?= $row['caption_en'] ? $row['caption_en'] : "N/A" ; ?></span>
		</div>
	</div>

	<div class="formItem">
		<div class="label"> Collection Source </div>
		<div class="formData">
			<span id="collection_source" <? if ($isEditable) {?>class="editableW" <?};?>><?= $row['collection_source'] ? $row['collection_source'] : "N/A" ; ?></span>
		</div>
	</div>

	<div class="formItem">
		<div class="label"> Call Number </div>
		<div class="formData">
			<span id="call_number" <? if ($isEditable) {?>class="editableW" <?};?>><?= $row['call_number'] ? $row['call_number'] : "N/A" ; ?></span>
		</div>
	</div>
	<div class="formItem">
		<div class="label"> Map Size (W x H)</div>
<?      if ( $row['width'] == null || $row['height'] == null )
			$map_size = "N/A";
		else
			$map_size = $row['width'] . " x " . $row['height'] . " (cm)";
?>
		<div class="formData"><span id="map_size" <? if ($isEditable) {?>class="editableS" <?};?>><?= $map_size ?></span></div> 
	</div>

	<div class="formItem">
		<div class="label"> Scale </div>
		<div class="formData">
			<span id="scale" <? if ($isEditable) {?>class="editableW" <?};?>><?= $row['scale'] ? $row['scale'] : "N/A" ; ?></span>
		</div>
	</div>

	<div class="formItem">
		<div class="label"> Notes </div>
		<div class="formData">
			<span id="description" <? if ($isEditable) {?>class="editableA" <?};?>><?= $row['description'] ? $row['description'] : "N/A" ; ?></span>
		</div>
	</div>

</div>
<?
		}
	}

}
else
{
	HC_reportError("Missing required fields");
}
?>
