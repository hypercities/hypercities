<?php
// vim: ts=4:sw=4:nu:nospell

/**
 * @file
 * HyperCities query script for Collection Narrative View
 *
 * Return the KML file that contain all children of given collection Id 
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-07-18
 * @version   $Id$
 *
 */

//ini_set('display_errors', 1);

include_once('includes/dbUtil.inc');
include_once('includes/HCCollection.inc');
include_once('includes/HCKmlDocument.inc');
include_once('includes/serverSession.inc');

cServerSession::start();

$HC_POST = HC_sanitizeInput($_POST, 
			array('func'=>'str', 'cid'=>'int'),
			array('func', 'cid'));

$cid = $HC_POST['cid'];

$userId  = cServerSession::getUserId();
$isLogin = !empty($userId);
$isAdmin = cServerSession::isAdmin();

// Get Collection Metadata
$collectionInfo = HCCollection::getCollectionInfoById($cid, $isAdmin);

// Get Children Info of Collection $cid
$children = HCCollection::getCollectionById($cid, $isAdmin);

// Create HyperCities KML Document
$dom = new HCKmlDocument();

// Set Collection Metadata
$dom->setMetadata($dom->docNode, $cid, 
		$collectionInfo['object_state_id'],
		$collectionInfo['title'], 
		$collectionInfo['creator'], 
		NULL,
		$collectionInfo['description'],
		$collectionInfo['date_from'], $collectionInfo['dateFrom_isBC'],
		$collectionInfo['date_to'], $collectionInfo['dateTo_isBC'],
		$collectionInfo['sw_lon'], $collectionInfo['sw_lat'],
		$collectionInfo['ne_lon'], $collectionInfo['ne_lat'],
		"collection", $collectionInfo['owner_id'],
		$collectionInfo['view'], $collectionInfo['zoom'], NULL,
		$userId, $collectionInfo['max_zoom']);

// Create Dom for collections
$dom->addCollections($dom->docNode, $children);

// Output Final KML Files
$dom->formatOutput = true;
$collection_xml = $dom->saveXML($dom->documentElement);
header('Content-type: application/xml');
echo $collection_xml;
?>
