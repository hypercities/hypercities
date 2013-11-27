<?php
// vim: ts=4:sw=4:fdc=2:nu:nospell

/**
 * @filename: updateOrder.php
 * @description: This file update the object order within collection
 *
 * @param: $_POST
 * 
 * The following POST variables are allowed:
 * 
 * orderId	-- Array of relation id in object_relations table
 * order    -- Array of order value to be updated in object_relations table
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-05-30
 * @version   $Id$
 *
 */

include_once('includes/database.inc');
include_once('includes/dbUtil.inc');
include_once("includes/serverSession.inc");

//session_start();
cServerSession::start();
HC_checkReferer();

// Sanitize Input
// 1. Check Parameter Name and Size, size of $_POST['orderId'] and
// $_POST['order'] should be the same
if (!array_key_exists('cid', $_POST) || !array_key_exists('order', $_POST) 
		|| (sizeof($_POST['cid']) <= 0) || (sizeof($_POST['order']) <= 0)
		|| (sizeof($_POST['cid']) !== sizeof($_POST['order']))) {
	HC_reportError("Incorrect Input Parameters");
}

// 2. Check DataType of input, values in $_POST['orderId'] and
// $_POST['order'] should be integer
foreach ($_POST['cid'] as $index => $itemId) {

	$order = $_POST['order'][$index];

	if (!is_numeric($itemId) || !is_numeric($order))
		HC_reportError('Incorrect input type: all values should be int');

	$_POST['itemId'][$index] = intval($itemId);
	$_POST['order'][$index] = intval($order);
}
// 3. Check Parent id, $_POST['pid'] should be integer
if (!is_numeric($_POST['pid'])) {
	HC_reportError('Incorrect input type: all values should be int');
} else {
	$parentId = $_POST['pid'];
}

$error_count = 0;
$db = database::getInstance();

// Update the object order one by one, only after all data are sanitized
foreach ($_POST['cid'] as $index => $itemId) {

	$order = $_POST['order'][$index];

	$query_str = "UPDATE `object_relations` SET `order` = $order, updated_at = NOW() "
				."WHERE `object_id` = $parentId AND `subject_id` = $itemId";

	$result = $db->query($query_str);	

	// Make sure we get single record
	if (!$result) {
		HC_errorLog("Failed to update collection $itemId : " . $db->getError());
		$error_count++;
	}
	else if (($num_rows = $db->affectedRows()) != 1) {
		HC_errorLog("In getMediaObject : query [ $query_str ] resulted in $num_rows results");
		$error_count++;
	}
/*
	$query = "SELECT id, `order` FROM object_relations WHERE object_id = (SELECT object_id FROM"
		." object_relations WHERE id = ?) AND subject_id = (SELECT subject_id"
		." FROM object_relations WHERE id = ?)";
	$db->preparedQuery($query, array('type' => 'ii', &$orderId, &$orderId));

	$total_relations = $db->preparedGetRows();

	$query = "SELECT id FROM object_relations WHERE object_id = (SELECT object_id FROM"
		." object_relations WHERE id = ?) AND subject_id = (SELECT subject_id"
		." FROM object_relations WHERE id = ?) AND `order` IS NULL ORDER BY id";
	$db->preparedQuery($query, array('type' => 'ii', &$orderId, &$orderId));
	
	$result = $db->preparedGetRows();

	$without_order = array();
	foreach ($result as $row) {
		$without_order[] = $row['id'];
	}
	
	$query = "SELECT id FROM object_relations WHERE object_id = (SELECT object_id FROM"
		." object_relations WHERE id = ?) AND subject_id = (SELECT subject_id"
		." FROM object_relations WHERE id = ?) AND `order` IS NOT NULL";
	$db->preparedQuery($query, array('type' => 'ii', &$orderId, &$orderId));
	$result = $db->preparedGetRows();

	$with_order = array();
	foreach ($result as $row) {
		$with_order[] = $row['id'];
	}

	if (count($total_relations) > 1) {
		$ids_to_delete = array();
		if (count($with_order) == 1) {
			$ids_to_delete = array_diff ($without_order, $with_order);
		} elseif (count($with_order) == 0) {
			$ids_to_delete = array_diff ($without_order, array($orderId));
		} elseif (count($with_order) > 1) {
			$ids_to_delete = array_diff( array_merge($without_order, $with_order), array ($orderId));
		}

		if (count($ids_to_delete) > 0) {
			$query = "DELETE FROM object_relations WHERE id IN (".implode(',', $ids_to_delete).') AND id != ?';
			$db->preparedQuery ($query, array('type' => 'i', &$orderId));
		} else {
			HC_errorLog("Logic error in orderUpdate.php: found more than one relation between two objects"
						." but could not determine which to delete. The inputted obr.id was $orderId.");
		}
	}
	*/
}

// Generate KML Response
if ($error_count > 0) {
	HC_reportError("Unable to update order of $error_count items.");
}
else {
	HC_reportSuccess();
}
?>
