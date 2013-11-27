<?php
include_once("includes/connect_db.inc");

//get data from db
$get_id = $_GET['id'];
$sql_query = "SELECT * FROM maps m, cities c WHERE m.id='$get_id' AND c.id = m.city_id;";

$resultM = mysql_query($sql_query) or die ("gettting Map Info query failed". mysql_error());

$rowM = mysql_fetch_array($resultM);

$dom = new DOMDocument('1.0');
$map_data = $dom->appendChild($dom->createElement('ResultSet'));
$Result = $map_data->appendChild($dom->createElement("Result"));
$city = $Result->appendChild($dom->createElement("City"));
$city->appendChild($dom->createTextNode($rowM['name']));

$dt_from = $Result->appendChild($dom->createElement("Date_from"));
$dt_from->appendChild($dom->createTextNode($rowM['date_from']));
$dt_to = $Result->appendChild($dom->createElement("Date_to"));
$dt_to->appendChild($dom->createTextNode($rowM['date_to']));

$description = $Result->appendChild($dom->createElement("Description"));
$description->appendChild($dom->createTextNode($rowM['description']));

$title = $Result->appendChild($dom->createElement("Title"));
$title->appendChild($dom->createTextNode($rowM['title']));
$english_title = $Result->appendChild($dom->createElement("English_title"));
$english_title->appendChild($dom->createTextNode($rowM['title_en']));
$creator = $Result->appendChild($dom->createElement("Creator"));
$creator->appendChild($dom->createTextNode($rowM['creator']));
$pub_date = $Result->appendChild($dom->createElement("Publication_date"));
$pub_date->appendChild($dom->createTextNode($rowM['publication_date']));
$publisher = $Result->appendChild($dom->createElement("Publisher"));
$publisher->appendChild($dom->createTextNode($rowM['publisher']));
$copyright = $Result->appendChild($dom->createElement("Copyright"));
$copyright->appendChild($dom->createTextNode($rowM['copyright_notice']));
$height = $Result->appendChild($dom->createElement("Height"));
$height->appendChild($dom->createTextNode($rowM['height']));
$width = $Result->appendChild($dom->createElement("Width"));
$width->appendChild($dom->createTextNode($rowM['width']));

$scale = $Result->appendChild($dom->createElement("Scale"));
$scale->appendChild($dom->createTextNode($rowM['scale']));
$caption = $Result->appendChild($dom->createElement("Caption"));
$caption->appendChild($dom->createTextNode($rowM['caption']));
$english_caption = $Result->appendChild($dom->createElement("English_caption"));
$english_caption->appendChild($dom->createTextNode($rowM['caption_en']));

$collection_source = $Result->appendChild($dom->createElement("Collection_source"));
$collection_source->appendChild($dom->createTextNode($rowM['collection_source']));

$image_record = $Result->appendChild($dom->createElement("Image_record"));
$image_record->appendChild($dom->createTextNode($rowM['image_record']));
$call_number = $Result->appendChild($dom->createElement("Call_number"));
$call_number->appendChild($dom->createTextNode($rowM['call_number']));

$dom->formatOutput = true; // set the formatOutput attribute of domDocument to true
$map_xml = $dom->saveXML();
echo $map_list_xml;

$file_name = "export_file.xml";
$file_size = sizeof($map_xml);
header('Pragma: public');
header('Expires: 0');
header('Last-Modified: ' . gmdate('D, d M Y H:i ') . ' GMT');
header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
header('Cache-Control: private', false);
header('Content-Type: application/octet-stream');
header('Content-Length: ' . $file_size);
header('Content-Disposition: attachment; filename="' . $file_name . '";');
header('Content-Transfer-Encoding: binary');
echo $map_xml;
?>
