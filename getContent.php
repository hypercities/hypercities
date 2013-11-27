<?php
// vim: ts=4:sw=4:nu:nospell

/**
 * @file
 * HyperCities query script for Object Content.
 *
 * Return the KML file that contain all children of given collection Id 
 * in View and Timespan
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-06-28
 * @version   $Id$
 *
 */

include_once('includes/dbUtil.inc');
include_once('includes/HCCollection.inc');
include_once('includes/serverSession.inc');

cServerSession::start();
HC_checkReferer();

$HC_POST = HC_sanitizeInput($_POST, 
			array('func'=>'str', 'cid'=>'int', 'pid'=>'int'),
			array('func', 'cid'), 
			array('pid'));

$cid = $HC_POST['cid'];
$pid = $HC_POST['pid'];

$isLogin = false;
$isAdmin = false;
$openPublichFolder = '1';

// Creates the root KML Document.
$dom = new DomDocument('1.0','utf-8');
$kml = $dom->appendChild($dom->createElementNS('http://www.opengis.net/kml/2.2', 'kml'));

// Creates HyperCities Collection List document
$kmlDoc = $kml->appendChild($dom->createElement('Document'));
$kmlDoc->setAttribute('id', $cid);
$docName = $kmlDoc->appendChild($dom->createElement('name', 'HyperCities_Item_'.$cid.'.kml'));
$docDescription = $kmlDoc->appendChild($dom->createElement('description', "HyperCities Item $cid"));

// Get Children Info of Collection $cid
$children = HCCollection::getCollectionById($cid, $isAdmin);

// Loop through each children Node 
foreach ($children as $index => $item) {
	if ( $item['object_type_id'] == HC_OBJECT_TYPE_MEDIA ) { 
		// Is OBJECT, Create Placemark
		$node = $kmlDoc->appendChild($dom->createElement('Placemark'));
		$node->setAttribute('id', $item['object_id']);

		$objectLink = "http:".$_SERVER['HTTP_HOST']."/object/".$item['object_id'].".kml";

		$nodeName = $node->appendChild($dom->createElement('name', $item['title']));
		$nodeDescription = $node->appendChild($dom->createElement('description'));
		$nodeDescription->appendChild($dom->createCDATASection($item['description']));

		$nodeLink = $node->appendChild($dom->createElement('link'));
		$nodeHref = $nodeLink->appendChild($dom->createElement('href', $objectLink));

		// Create Marker Style From KML Field
		$sxe = simplexml_load_string($item['kml']);
		$markerDom = dom_import_simplexml($sxe);
		$markerNode = $dom->importNode($markerDom, true);
		$node->appendChild($markerNode->getElementsByTagName("Style")->item(0));
		$node->appendChild($markerNode->getElementsByTagName("Point")->item(0));
		$node->appendChild($markerNode->getElementsByTagName("LineString")->item(0));
		$node->appendChild($markerNode->getElementsByTagName("Polygon")->item(0));
		$node->appendChild($markerNode->getElementsByTagName("LookAt")->item(0));

	} else if ( $item['object_type_id'] == HC_OBJECT_TYPE_COLLECTION ) { 
		// Is Collection, Create NetworkLink
		$node = $kmlDoc->appendChild($dom->createElement('NetworkLink'));
		$node->setAttribute('id', $item['object_id']);

		$collectionLink = "http://".$_SERVER['HTTP_HOST']."/collection/".$item['object_id'].".kml";
		$collectionBound = "BBox=[".$item['sw_lon']."],[".$item['sw_lat']."],["
							.$item['ne_lon']."],[".$item['ne_lat']."]";

		$nodeName = $node->appendChild($dom->createElement('name', $item['title']));
		$nodeOpen = $node->appendChild($dom->createElement('open', '0'));
		$nodeLink = $node->appendChild($dom->createElement('link'));
		$nodeHref = $nodeLink->appendChild($dom->createElement('href', $collectionLink));

		// Add HyperCities Extended Data
		$nodeHCData = $node->appendChild($dom->createElement('ExtendedData'));
		$nodeHCData->setAttribute('xmlns:hc', 'http://hypercities.ats.ucla.edu');

		$nodeHCDataViewFormat = $nodeHCData->appendChild($dom->createElement('hc:viewFormat', $collectionBound));
		$nodeHCDataExternal = $nodeHCData->appendChild($dom->createElement('hc:external', '0'));
	} else if ( $item['object_type_id'] == HC_OBJECT_TYPE_KML ) { 
		// Is KML, Create External NetworkLink
		$node = $kmlDoc->appendChild($dom->createElement('NetworkLink'));
		$node->setAttribute('id', $item['object_id']);

		$collectionBound = "BBox=[".$item['sw_lon']."],[".$item['sw_lat']."],["
							.$item['ne_lon']."],[".$item['ne_lat']."]";

		$nodeName = $node->appendChild($dom->createElement('name', $item['title']));
		$nodeOpen = $node->appendChild($dom->createElement('open', '0'));
		$nodeLink = $node->appendChild($dom->createElement('link'));
		$nodeHref = $nodeLink->appendChild($dom->createElement('href', htmlentities($item['kml'])));

		// Add HyperCities Extended Data
		$nodeHCData = $node->appendChild($dom->createElement('ExtendedData'));
		$nodeHCData->setAttribute('xmlns:hc', 'http://hypercities.ats.ucla.edu');

		$nodeHCDataViewFormat = $nodeHCData->appendChild($dom->createElement('hc:viewFormat', $collectionBound));
		$nodeHCDataExternal = $nodeHCData->appendChild($dom->createElement('hc:external', '1'));
	}
}

// Output Final KML Files
$dom->formatOutput = true;
$collection_xml = $dom->saveXML($dom->documentElement);
header('Content-type: application/xml');
echo $collection_xml;
?>
