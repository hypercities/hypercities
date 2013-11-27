<?php
// vim: ts=4:sw=4:fdc=2:nu:nospell

/**
 * @file
 * HyperCities query script for Main Collection List.
 *
 * Return the KML file that contain all collections in View and Timespan
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-08-21
 * @version   $Id$
 *
 */

include_once('includes/dbUtil.inc');
include_once('includes/HCCollection.inc');
include_once('includes/HCKmlDocument.inc');
include_once('includes/serverSession.inc');

cServerSession::start();
HC_checkReferer();

$HC_POST = HC_sanitizeInput($_POST, 
			array('func'=>'str', 'dateFrom'=>'dtime', 'dateTo'=>'dtime',
				'dateFromIsBC'=>'int', 'dateToIsBC'=>'int', 'zoom'=>'int',
				'swLat'=>'float', 'swLng'=>'float', 'neLat'=>'float', 'neLng'=>'float',),
			array('func', 'swLat', 'swLng', 'neLat', 'neLng', 'zoom', 
				'dateFrom', 'dateTo', 'dateFromIsBC', 'dateToIsBC'));

$neLat = $HC_POST['neLat'];
$neLng = $HC_POST['neLng'];
$swLat = $HC_POST['swLat'];
$swLng = $HC_POST['swLng'];
$dateFromIsBC = $HC_POST['dateFromIsBC'];
$dateFrom = $HC_POST['dateFrom'];
$dateToIsBC = $HC_POST['dateToIsBC'];
$dateTo = $HC_POST['dateTo'];

$userId  = cServerSession::getUserId();
$isLogin = !empty($userId);
$isAdmin = cServerSession::isAdmin();

// Create HyperCities KML Document
$dom = new HCKmlDocument();
$dom->setName("HyperCities Collection List");

// Part 1 : If user is login, generate User's Collection Folder
if ( $isLogin ) {
	$userCollectionId = cServerSession::getUserCollectionId() ;

	// Get User's Collections
	$totalCollections = HCCollection::getCollectionChildrenNumber($userCollectionId, $userId, $isAdmin);

	// Create Folder Dom
	$userCollectionDom = $dom->appendFolder($dom->docNode, 
			$userCollectionId, HC_USER_COLLECTIONS_NAME, 
			$totalCollections, null, true, false);

}

// Part 2 : Generate Meta-Collection Folders
foreach ( $HC_BASE_COLLECTIONS as $collection) {

	// Count total children of collections
	$totalChildren = HCCollection::getCollectionChildrenNumber($collection['id'], $userId, $isAdmin);

	// Create Folder Dom
	// appendFolder($dom, $folderId, $folderName, $totalChildren, $boundChildren, $isOpen, $hasCheckBox)
	$metaCollectionDom = $dom->appendFolder($dom->docNode,
		$collection['id'], $collection['name'],
		$totalChildren, null, false, false);
}

// Output Final KML Files
$dom->formatOutput = true;
$collection_xml = $dom->saveXML($dom->documentElement);
header('Content-type: application/xml');
echo $collection_xml;

?>
