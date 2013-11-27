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

include_once('includes/dbUtil.inc');
include_once('includes/HCCollection.inc');
include_once('includes/HCKmlDocument.inc');
include_once('includes/serverSession.inc');

cServerSession::start();

$HC_GET = HC_sanitizeInput($_GET, 
			array('func'=>'str', 'cid'=>'int'),
			array('cid'));

$cid = $HC_GET['cid'];

$userId  = cServerSession::getUserId();
$isLogin = !empty($userId);
$isAdmin = cServerSession::isAdmin();

// Get Collection Metadata
$collectionInfo = HCCollection::getCollectionInfoById($cid, $isAdmin);

if ( $collectionInfo['object_type_id'] !== HC_OBJECT_TYPE_3D ) {
	HC_reportError("Original KML not found");
}

try {
	$sxe = simplexml_load_string($collectionInfo['kml']);
	if ($sxe) {
		header('Content-type: application/xml');
		echo $sxe->asXML();
	} // end if ($sxe)
}
catch (Exception $e) {
	// Log Exception
	sprint_r($e);
}

?>
