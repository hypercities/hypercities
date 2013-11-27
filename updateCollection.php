<?php
// vim: ts=4:sw=4:fdc=2:nu:nospell

/**
 * @file
 * Update the information of collection.
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-04-30
 * @version   $Id$
 *
 */

include_once('includes/dbUtil.inc');
include_once('includes/util.inc');
include_once("includes/kmlParser.inc");
include_once("includes/database.inc");

/**
 * Update coauthors
 * @param {Number} $object
 * @param {Array} $coauthors
 */
function updateCoauthor($objectId, $coauthors) {
	$db = database::getInstance();
	$query = "SELECT user_id FROM objects_users WHERE object_id = ?";
	$db->preparedQuery($query, array('type' => 'i', &$objectId));
	$result = $db->preparedGetRows();

	$oldCoauthors = array();
	if (count($result) > 0) {
		foreach ($result as $row) {
			$oldCoauthors[] = $row['user_id'];
		}
	}

	$coauthorsToDelete = array_diff($oldCoauthors, $coauthors);
	$coauthorsToAdd = array_diff($coauthors, $oldCoauthors);
	
	if (count($coauthorsToDelete) > 0) {
		$query = "DELETE FROM objects_users WHERE object_id = $objectId AND";
		if (count($coauthorsToDelete) >= 1) {
			$query .= " user_id IN (".implode(',', $coauthorsToDelete).")";
		}
		$db->query($query);
	}
	
	if (count($coauthorsToAdd) > 0) {
		$query = 'INSERT INTO objects_users (object_id, user_id, access_right_id,'
			. 'created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())';

		foreach ($coauthorsToAdd as $coauthor) {
			$coauthor = (int)$coauthor;
			$accessRight = 7;
			$params = array('type' => 'iii', &$objectId, &$coauthor, &$accessRight);
			$db->preparedQuery($query, $params);
		} 
	}
}


// Test cases for php command line interface
if (!empty($argc) && strstr($argv[0], basename(__FILE__))) {

	$_POST['objectId'] = 15630;
	$_POST['creator'] = "jay";
	$_POST['title'] = "Jay's world";
	$_POST['copyright'] = "CCBY";
	$_POST['content'] = "test update collection privilege";
	$_POST['parents'] = '13765';
	$_POST['state'] = HC_OBJECT_PRIVATE;

	// Following fields are not yet implemented
	// data will not received from the client
	$_POST['password'] = "123";
	$_POST['userIdArray'] = "19,17";
	$_POST['accessRightIdArray'] = "7,5";

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

$HC_POST = HC_cleanInput($_POST, array('objectId'           => 'int',
									   'title'              => 'str',
									   'state'              => 'int',
									   'password'           => 'str',
									   'content'            => 'str',
									   'creator'            => 'str',
									   'copyright'          => 'str',
									   'parents'            => 'str',
									   'view'               => 'str',
									   'coauthors'          => 'str',
									   'shareAll'           => 'int',
									   'userIdArray'        => 'str',
									   'accessRightIdArray' => 'str'),
								 array('objectId',
									   'title',
									   'state'),
								 array('content', 
									   'creator', 
									   'password', 
									   'copyright', 
									   'parents',
									   'view',
									   'coauthors', 
									   'userIdArray', 
									   'accessRightIdArray'));

$collectionId = $HC_POST['objectId'];
$parents = explode(',', $HC_POST['parents']);
$oldParents = array();
$coauthors = (empty($HC_POST['coauthors'])) ? array() : explode(',', $HC_POST['coauthors']);
$userId = cServerSession::getUserId();

$object['title'] = $HC_POST['title'];
$object['object_state_id'] = $HC_POST['state'];
$object['description'] = $HC_POST['content'];
$object['creator'] = $HC_POST['creator'];
$object['password'] = trim($HC_POST['password']);
$object['password'] = (empty($HC_POST['password'])) ? NULL : md5($HC_POST['password']);
$object['copyright'] = $HC_POST['copyright'];


try {
	if (empty($HC_POST['parents'])) {
		throw new Exception("Please select at least one collection to which"
							." this collection will be added.");
	}

	if (checkCircular($collectionId, $parents)) {
		throw new Exception("Circular reference occurs.");
	}

	$result = update("objects", $object, "`id` = $collectionId");

	//update object view
	if (!empty($HC_POST['view'])) {
		$view = json_decode($HC_POST['view'], true);
		$view = KmlParser::createViewFromArray($view);
		$object = array("view" => $view);

		$result = update("object_mappings", $object, "`object_id` = $collectionId");
	}
	
	//select the old parents
	$result = getParents($collectionId);
	foreach ($result as $row) {
		$oldParents[] = $row['object_id'];
	}

	$deletedCollections = array_diff($oldParents, $parents);
	$addedCollections = array_diff($parents, $oldParents);

	//update object_relation table
	foreach ($deletedCollections as $deletedParentId) {
		$result = delete("object_relations", "`object_id` = $deletedParentId"
						." and `subject_id`=$collectionId");
	}

	foreach ($addedCollections as $addedParentId) {
		$object = array('object_id' => $addedParentId,
						'subject_id' => $collectionId,
						'scope_id' => $addedParentId,
						'owner_id' => $userId,
						'created_at' => 'NOW()',
						'updated_at' => 'NOW()');
		$result = insert("object_relations", $object);
			
		$object = updateColTimeBoundBottomUp($addedParentId);
		HC_debugLog("boundary and timespan = ".print_r($object, true));
	}

	// Update access right not implemented yet
	/*
	if (!empty($accessRightArray)) {
		updatePrivilege($collectionId, $accessRightArray);
	}
	 */

	updateCoauthor($collectionId, $coauthors);

	if ($HC_POST['shareAll']) {
		// TODO: recursively share all objects belonging to the user in the collection
		// TODO: check the privilege for each dhild
		$query = "SELECT ore.subject_id FROM (object_relations AS ore, objects AS o)"
		       . " LEFT JOIN objects_users AS ou ON ou.object_id = ore.subject_id"
			   . " WHERE (o.owner_id = $userId OR ou.user_id = $userId) AND o.id = ore.subject_id"
			   . " AND ore.object_id = $collectionId";
		$children = sqlCommand($query);

		foreach ($children as $child) {
			$objectId = $child['subject_id'];

			updateCoauthor($objectId, $coauthors);
		}
	}
	
	HC_reportSuccess("Collection updated successfully!");

} catch (MysqlException $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("updating the collection");
} catch (Exception $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportGeneralError("updating the collection");
}
?>
