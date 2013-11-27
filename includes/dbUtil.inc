<?php
include_once("includes/database.inc");
include_once("includes/constants.inc");
include_once("includes/connect_db.inc");
include_once("includes/HCDate.inc");
include_once("includes/util.inc");
include_once("includes/MysqlException.inc");

/**
 * This file is a wrapper of sql command and
 * database utility functions
 * 
 * @copyright Copyright 2009, The Regents of the University of California
 * @date 2009-08-01
 */


/**
 * Insert data into database
 * @param array $object: an array, array index equals table field
 * @param String $tableName: name of the table
 * @return mixed: id on success, false on error
 */
function insert($tableName, $object) {
	$fieldStr = NULL;
	$valueStr = NULL;

	//translate bc year if there is one
	if (isset($object['date_from']) && !empty($object['date_from'])) {
		if (HCDate::isBCDate($object['date_from'])) {
			$object['dateFrom_isBC'] = 1;
			$object['date_from'] = HCDate::toADDate($object['date_from']);
		}
		//translate date_from, date_to to yyyy format.
		$object['date_from'] = HCDate::parseYear($object['date_from']);
		
		// gYear (YYYY)
		if (preg_match("/^-?(0?|[1-9]){4}$/", $object['date_from'], $parts)) {
			$object['date_from'] .= "-02-01 00:00:00";
		} else if (preg_match("/^-?(0?|[1-9]){4}-(0?[1-9]|1[012])$/", 
				$object['date_from'], $parts)) {
			// gYearMonth (YYYY-MM)
			$object['date_from'] .= "-01 00:00:00";
		}
	}

	if (isset($object['date_to']) && !empty($object['date_to'])) {
		if (HCDate::isBCDate($object['date_to'])) {
			$object['dateTo_isBC'] = 1;
			$object['date_to'] = HCDate::toADDate($object['date_to']);
		}
		$object['date_to'] = HCDate::parseYear($object['date_to']);
		
		if (preg_match("/^-?(0?|[1-9]){4}$/", $object['date_to'], $parts)) {
			// gYear (YYYY)
			$object['date_to'] .= "-01-01 00:00:00";
		} else if (preg_match("/^-?(0?|[1-9]){4}-(0?[1-9]|1[012])$/", 
					$object['date_to'], $parts)) {
			// gYearMonth (YYYY-MM)
			$object['date_to'] .= "-01 00:00:00";
		}
	}

	foreach ($object as $field => $value) {
		$field = mysql_real_escape_string($field);

		$fieldStr = $fieldStr."`".$field."`,";

		if (!isset($value) || is_null($value) || (strcasecmp(trim($value),
			"null") == 0) ) {
			$valueStr = $valueStr."NULL,";
		} else if (strcasecmp(trim($value), "NOW()") == 0) {
			$valueStr = $valueStr."NOW(),";
		} else {
			$value = mysql_real_escape_string($value);
			$valueStr = $valueStr."'".$value."',";
		}
	}

	//delete last ","
	$fieldStr = substr($fieldStr, 0, strlen($fieldStr)-1);
	$valueStr = substr($valueStr, 0, strlen($valueStr)-1);

	$sqlQuery = "INSERT INTO `".$tableName."`(".$fieldStr.")VALUES(".$valueStr.");";

	HC_debugLog($sqlQuery);
	$result = mysql_query($sqlQuery);
	
	if (!$result) {
		$msg = mysql_error().", sql=$sqlQuery";
		throw new MysqlException($msg);
	} else return mysql_insert_id();
}

/**
 * Delect data from database
 * @param String $tableName: the name of the table
 * @param String $whereClause: where clause
 * @return Boolean: true on success, false on error and throw MysqlException
 * @throw MysqlException
 */
function delete($tableName, $whereClause) {
	//force user to specify where clause
	if (empty($whereClause)) {
		$msg = "Delete must have where clause, sql=$sqlQuery";
		HC_errorLog($msg);
		throw new MysqlException($msg);
	}

	$sqlQuery = "DELETE FROM ".$tableName." WHERE ".$whereClause;
	HC_debugLog($sqlQuery);

	$result = mysql_query($sqlQuery);

	if (!$result) {
		$msg = mysql_error().", sql=$sqlQuery";
		HC_errorLog($msg);
		throw new MysqlException($msg);
	}

	return $result;
}

/** 
 * select data from database
 * @param String $tableName: the name of the table
 * @param String $whereClause: where clause
 * @return array $arrays: array of rows (array of arrays)
 */
function select($tableName, $whereClause) {
	$sqlQuery = "SELECT * FROM ".$tableName;
	if (!empty($whereClause))
		$sqlQuery .= " WHERE ".$whereClause;

	//mysql_query doesn't support multiple selection, use while loop to get all rows
	$arrays = array();
	HC_debugLog($sqlQuery);
	$result = mysql_query($sqlQuery);

	if (!$result) {
		$msg = mysql_error().", sql=$sqlQuery";
		HC_errorLog($msg);
		throw new MysqlException($msg);
	}

	while ($row = mysql_fetch_array($result, MYSQL_ASSOC)) {
		//translate bc year if there is one
		if (isset($row['dateFrom_isBC']) && $row['dateFrom_isBC']) {
			$row['date_from'] = HCDate::toBCDate($row['date_from']);
		}
		if (isset($row['dateTo_isBC']) && $row['dateTo_isBC']) {
			$row['date_to'] = HCDate::toBCDate($row['date_to']);
		}

		array_push($arrays, $row);
	}

	return $arrays;
}

/** 
 * Update data from database
 * @param $tableName: the name of the table
 * @param $object: object containing field-value pairs needed updated
 * @param $whereClause: where clause
 * @return $arrays: array of rows (array of arrays)
 */
function update($tableName, $object, $whereClause) {
	//force user to use where clause
	if (empty($whereClause)) {
		throw new MysqlException("No where clause in update sql.");
	}

	$sql_query = "UPDATE ".$tableName." SET";

	if (isset($object['date_from']) && !empty($object['date_from'])) {
		if (HCDate::isBCDate($object['date_from'])) {
			$object['dateFrom_isBC'] = 1;
			$object['date_from'] = HCDate::toADDate($object['date_from']);
		} else {
			$object['dateFrom_isBC'] = 0;
		}

		//translate date_from, date_to to yyyy format.
		$object['date_from'] = HCDate::parseYear($object['date_from']);
	}
	if (isset($object['date_to']) && !empty($object['date_to'])) {
		if (HCDate::isBCDate($object['date_to'])) {
			$object['dateTo_isBC'] = 1;
			$object['date_to'] = HCDate::toADDate($object['date_to']);
		} else {
			$object['dateTo_isBC'] = 0;
		}
		$object['date_to'] = HCDate::parseYear($object['date_to']);
	}

	foreach ($object as $field => $value) {
		if (!isset($value) || is_null($value) ||
			(strcasecmp(trim($value), "null") == 0) ) {
			$sql_query .= " `$field` = NULL,";
		} else if (strcasecmp(trim($value), "NOW()") == 0) {
			$sql_query .= "`$field` = NOW(),";
		} else {
			$field = mysql_real_escape_string($field);
			$value = mysql_real_escape_string($value);

			$sql_query .= " `".$field."` = '".$value."',";
		}
	}
	//delete last ,
	$sql_query = substr($sql_query, 0, (strlen($sql_query)-1));
	$sql_query .= " WHERE ".$whereClause;
	HC_debugLog($sql_query);
	$result = mysql_query($sql_query);

	if (!$result) {
		$msg = mysql_error().", sql=$sql_query";
		HC_errorLog($msg);
		throw new MysqlException($msg);
	}

	return $result;
}

/**
 * Execute sql command
 * @param String $sqlQuery: sql command
 * @return mixed $result: boolean or array, depends on the sql command
 * @throw MysqlException
 */
function sqlCommand($sqlQuery) {
	$arrays = array();
	HC_debugLog($sqlQuery);
	$result = mysql_query($sqlQuery);

	if (!$result) {
		$msg = mysql_error().", sql=$sqlQuery";
		HC_errorLog($msg);
		throw new MysqlException($msg);
	} else if (is_bool($result)) {
		return $result;
	} else if (strcasecmp(get_resource_type($result), "mysql result") == 0)	{
		while ($row = mysql_fetch_array($result, MYSQL_ASSOC)) {
			array_push($arrays, $row);
		}
	}

	return $arrays;
}

/**
 * Insert multi geo references. Use this function when inserting multiple 
 * geo references for performance issue(for polyline and polygon).
 * @param array $latlng: e.g. 23,32,43 31,22,32
 * @return array: geo reference IDs
 */
function insertMultiGeoReferences($latlng) {
	$sqlQuery = "INSERT INTO `geo_references` (`latitude`,`longitude`, `altitude`, `order`) VALUES ";

	foreach( $latlng as $index => $latlngalt) {
		$sqlQuery .= "('".$latlngalt['lat']."','".$latlngalt['lng']."','"
					.$latlngalt['alt']."','".$index."'),";
	}

	// Change the last , to ;
	$sqlQuery[strlen($sqlQuery)-1] = ";";
	$result = sqlCommand($sqlQuery);

	if (!$result) {
		$msg = mysql_error().", sql=$sqlQuery";
		HC_errorLog($msg);
		throw new MysqlException($msg);
	}

	// The geo reference id of the first record
	$geoRefId = mysql_insert_id();
	$length = count($latlng);
	for ($i=0; $i<$length; $i++) {
		$geoRefIdArray[] = $geoRefId + $i;
	}

	return $geoRefIdArray;
}

/**
 * Insert multiple geo references for a object mapping id
 * @param Number $objMapId: the object mapping ID
 * @param array $geoRefIdArray: the geo reference IDs
 * @return Boolean: true on success, false on error
 */
function insertMultiObjectMappingsGeoReferences($objMapId, $geoRefIdArray) {

	$sqlQuery = "INSERT INTO `object_mappings_geo_references` VALUES ";

	foreach($geoRefIdArray as $geoRefId) {
		   $sqlQuery .= "('".$objMapId."','" . $geoRefId ."'),";
	}

	// Change the last , to ;
	$sqlQuery[strlen($sqlQuery)-1] = ";";
	$result = sqlCommand($sqlQuery);

	if (!$result) {
		$msg = mysql_error().", sql=$sqlQuery";
		HC_errorLog($msg);
		throw new MysqlException($msg);
	}

	return $result;
}

/**
 * Insert object relations
 * $objectIdArray is 1-to-1 mapping to $objectMappingIdArray
 * @param array $objectIdArray:
 * @param Number $collectionId:
 * @param Number $userId:
 * @param String $createdTime:
 * @return Boolean: true on success, false on error
 */
function insertObjectRelations($objectIdArray, $collectionId, $userId, $createTime) {
	/*insert into object_relation table*/
	$sql_query = "INSERT INTO `object_relations` (`object_id`, `subject_id`,"
			 . "	`scope_id`, `owner_id`, `created_at`, `updated_at`, `order`) VALUES";
	for ($i=0; $i < count($objectIdArray); $i++) {
		$objectId = $objectIdArray[$i];
		$sql_query .="($collectionId, $objectId, $collectionId, $userId, $createTime, $createTime, $i),";
	}

	$sql_query[strlen($sql_query)-1] = ";";
	HC_debugLog($sql_query);
	$result = mysql_query($sql_query);
	
	if (!$result) {
		$msg = mysql_error().", sql=$sql_query";
		HC_errorLog($msg);
		throw new MysqlException($msg);
	}

	return $result;
}

/**
 * Update Object Relations
 * @param array $oldIdArray: old parent IDs
 * @param array $newIdArray: new parent IDs
 * @param Number $objectId: object itself (object or collection)
 * @param Number $userId: the user id
 * @return 
 */
function updateObjRelation($oldIdArray, $newIdArray, $objectId, $userId) {
	foreach ($oldIdArray as $parentId) {
		if(!in_array($parentId, $newIdArray)) {
			$result = delete("object_relations", "`object_id` = $parentId and `subject_id` = $objectId");
		}
	}

	/*second find the new selected collection id which is selected in client side but not in DB*/
	foreach($newIdArray as $newParentId) {
		if(!in_array($newParentId, $oldIdArray)) {
			$object = array('object_id' => $newParentId,
							'subject_id' => $objectId,
							'scope_id' => $newParentId,
							'owner_id' => $userId,
							'created_at' => 'NOW()',
							'updated_at' => 'NOW()');
			$result = insert("object_relations", $object);
			
			$boundary = calculateCollectionBoundary($newParentId);
			$timespan = calculateCollectionTimespan($newParentId);

			/*update the boundary of the collecton*/
			$result = updateCollectionTimeBoundary($newParentId, $boundary['ne_lat'], 
												$boundary['ne_lon'], $boundary['sw_lat'], 
												$boundary['sw_lon'], $timespan['minDateFrom'], 
												$timespan['maxDateTo'], "NOW()");
		}
	}
}

/** 
 *  calculate collection's boundary by calculate max boundary of its children
 *  which are objects and collections, set boundary to global view if it has no children
 *  @param Number $collectionId
 *  @return array $boundary: an array containing boundary
 */
function calculateCollectionBoundary($collectionId) {
	$boundary = array();

	//calculate max boundary of children which has geographic location (object type =3)
	$sql = "SELECT max(latitude),max(longitude),min(latitude),min(longitude)"
		. "	FROM `objects` AS o, `object_mappings` as om, `object_mappings_geo_references`"
		. " as omgr, `geo_references` as gr WHERE om.`object_id` in"
		. "	(SELECT subject_id from object_relations where object_id =".$collectionId
		. ") AND om.id = omgr.object_mapping_id  AND omgr.geo_reference_id = gr.id"
		. "	AND o.id = om.object_id AND o.object_state_id != '".HC_OBJECT_DELETED."'";
	
	$result = sqlCommand($sql);

	foreach ($result as $row) {
		$boundary['ne_lat'] = $row['max(latitude)'];
		$boundary['ne_lon'] = $row['max(longitude)'];
		$boundary['sw_lat'] = $row['min(latitude)'];
		$boundary['sw_lon'] = $row['min(longitude)'];
	}

	//calculate boundary of children according to object_mappings
	$sql = "SELECT max(ne_lat),max(ne_lon),min(sw_lat),min(sw_lon) FROM "
		. "`object_mappings` as om, `object_relations` as obr, `objects` as o"
		. "	WHERE obr.object_id = $collectionId AND obr.subject_id = "
		. " om.object_id AND om.object_id = o.id AND "
		. "	o.object_type_id != '".HC_OBJECT_TYPE_MEDIA."' AND NOT"
		. "	(om.ne_lat = 90 AND om.ne_lon = 180 AND om.sw_lat = -90 AND om.sw_lon = -180)"
		. "	AND o.object_state_id != '".HC_OBJECT_DELETED."'";
	$result = sqlCommand($sql);

	foreach ($result as $row) {
		$boundary['ne_lat'] = HC_max($row['max(ne_lat)'], $boundary['ne_lat']);
		$boundary['ne_lon'] = HC_max($row['max(ne_lon)'], $boundary['ne_lon']);
		$boundary['sw_lat'] = HC_min($row['min(sw_lat)'], $boundary['sw_lat']);
		$boundary['sw_lon'] = HC_min($row['min(sw_lon)'], $boundary['sw_lon']);
	}

	//set boundary to default value if they are all 0
	if ($boundary['ne_lat'] == 0) $boundary['ne_lat'] = 90;
	if ($boundary['ne_lon'] == 0) $boundary['ne_lon'] = 180;
	if ($boundary['sw_lat'] == 0) $boundary['sw_lat'] = -90;
	if ($boundary['sw_lon'] == 0) $boundary['sw_lon'] = -180;

	return $boundary;
}

/**
 *  Calculate collection's boundary, then calculate its parents up to base collections
 *  @param Number $collectionId
 *  @return array $boundary: an array containing boundary of current collection
 */
function updateColBoundBottomUp($collectionId) {
	global $HC_BASE_COLLECTIONS_ID;

	$boundary = calculateCollectionBoundary($collectionId);
	$result = update("object_mappings", $boundary, "object_id = '$collectionId'");

	$sql = "SELECT id FROM `objects` WHERE id in (SELECT object_id FROM"
		. "	`object_relations` WHERE subject_id = '$collectionId') AND"
		. "	object_type_id = '".HC_OBJECT_TYPE_COLLECTION."' AND"
		. "	object_state_id != '".HC_OBJECT_DELETED."'";
	$result = sqlCommand($sql);

	foreach ($reult as $row) {
		// do not update base collections' boundary because of performance issues
		if (!in_array($row['id'], $HC_BASE_COLLECTIONS_ID))
			$bound = updateColBoundBottomUp($row['id']);
	}

	return $boundary;
}

/** 
 * Calculate collection's boundary by calculate max boundary of its children
 * which are objects and collections recursively
 * @param {Number} $collectionId
 * @param {Boolean} $isUpdate: boolean, update children collections as well
 * @return {array} $boundary: an array containing boundary
 */
function calculateCollectionBoundaryR($collectionId, $isUpdate) {
	$boundary = array();

	// calculate max boundary of children which has geographic location 
	// (point, line, polygon, view)
	$sql = "SELECT max(latitude),max(longitude),min(latitude),min(longitude)"
		. " FROM `object_mappings` as om, `object_mappings_geo_references` as"
		. " omgr, `geo_references` as gr WHERE om.`object_id` in"
		. " (SELECT subject_id from object_relations where object_id = "
		. $collectionId.") AND om.id = omgr.object_mapping_id  AND"
		. " omgr.geo_reference_id = gr.id";
	
	$result = sqlCommand($sql);

	foreach ($result as $row) {
		$boundary['ne_lat'] = $row['max(latitude)'];
		$boundary['ne_lon'] = $row['max(longitude)'];
		$boundary['sw_lat'] = $row['min(latitude)'];
		$boundary['sw_lon'] = $row['min(longitude)'];
	}

	// calculate boundary of children from object_mappings
	$sql = "SELECT max(ne_lat),max(ne_lon),min(sw_lat),min(sw_lon) FROM"
		. " `object_mappings` as om, `objects` as o WHERE o.id in"
		. " (SELECT subject_id from object_relations where object_id = "
		. $collectionId. ") AND om.object_id = o.id";
	$result = sqlCommand($sql);

	foreach ($result as $row) {
		$boundary['ne_lat'] = HC_max($row['max(ne_lat)'], $boundary['ne_lat']);
		$boundary['ne_lon'] = HC_max($row['max(ne_lon)'], $boundary['ne_lon']);
		$boundary['sw_lat'] = HC_min($row['min(sw_lat)'], $boundary['sw_lat']);
		$boundary['sw_lon'] = HC_min($row['min(sw_lon)'], $boundary['sw_lon']);
	}

	//calculate boundary of children which are collections
	$sql = "SELECT id FROM `objects` WHERE id in (SELECT subject_id FROM"
		. " `object_relations` WHERE object_id = '$collectionId') AND"
		. " object_type_id = '".HC_OBJECT_TYPE_COLLECTION."'";
	$result = sqlCommand($sql);

	foreach ($result as $row) {
		$bound = calculateCollectionBoundaryR($row['id'], $isUpdate);
		$boundary['ne_lat'] = HC_max($boundary['ne_lat'], $bound['ne_lat']);
		$boundary['ne_lon'] = HC_max($boundary['ne_lon'], $bound['ne_lon']);
		$boundary['sw_lat'] = HC_min($boundary['sw_lat'], $bound['sw_lat']);
		$boundary['sw_lon'] = HC_min($boundary['sw_lon'], $bound['sw_lon']);
	}

	//update boundary
	if ($isUpdate)
		$result = update("object_mappings", $boundary, "object_id = '$collectionId'");

	return $boundary;
}

/**
 * Calculate collection's timespan according to its children (collections or objects)
 * @param Number $collectionId
 * @return array $timespan
 */
function calculateCollectionTimespan($collectionId) {
	$timespan = array();
	
	//calculate the max date_to from all AD dates
	$sql = "SELECT max(date_to) AS maxDateTo FROM `object_mappings` as om,"
		. "`objects` as o WHERE o.id in (SELECT subject_id from object_relations"
		. " where object_id = ".$collectionId.") AND om.object_id = o.id"
		. " and om.dateTo_isBC = 0 AND o.object_state_id != '".HC_OBJECT_DELETED."'";
	$result = sqlCommand($sql);

	if (empty($result[0]['maxDateTo'])) {
		//all children have BC dates
		//calculate the max date_to from all BC dates
		$sql = "SELECT min(date_to) AS maxDateTo FROM `object_mappings` as om,"
			. "	`objects` as o WHERE o.id in (SELECT subject_id from object_relations"
			. "	where object_id = ".$collectionId.") AND om.object_id = o.id and"
			. " om.dateTo_isBC = 1 AND o.object_state_id != '".HC_OBJECT_DELETED."'";
		$result = sqlCommand($sql);
		if (!empty($result[0]['maxDateTo']))
			$result[0]['maxDateTo'] = HCDate::toBCDate($result[0]['maxDateTo']);
	}
	$timespan['maxDateTo'] = $result[0]['maxDateTo'];

	//calculate the min date_from from all BC dates
	$sql = "SELECT max(date_from) AS minDateFrom FROM `object_mappings` as om,"
		. "	`objects` as o WHERE o.id in (SELECT subject_id from object_relations"
		. " where object_id = ".$collectionId.") AND om.object_id = o.id and"
		. " om.dateFrom_isBC = 1 AND o.object_state_id != '".HC_OBJECT_DELETED."'";
	$result = sqlCommand($sql);
	if (!empty($result[0]['minDateFrom']))
		$result[0]['minDateFrom'] = HCDate::toBCDate($result[0]['minDateFrom']);

	if (empty($result[0]['minDateFrom'])) {
		//all children have AD dates
		//calculate the min date_from from all AD dates
		$sql = "SELECT min(date_from) AS minDateFrom FROM `object_mappings` as om,"
			. " `objects` as o WHERE o.id in (SELECT subject_id from object_relations"
			. " where object_id = ".$collectionId.") AND om.object_id = o.id and"
			. "	om.dateFrom_isBC = 0 AND o.object_state_id != '".HC_OBJECT_DELETED."'";
		$result = sqlCommand($sql);
	}
	$timespan['minDateFrom'] = $result[0]['minDateFrom'];

	//set timespan to default value if they are not validate HCDate
	if (!HCDate::validateDate($timespan['minDateFrom']))
		$timespan['minDateFrom'] = "0001-01-01 00:00:00";
	if (!HCDate::validateDate($timespan['maxDateTo']))
		$timespan['maxDateTo'] = "9999-12-31 23:59:59";

	return $timespan;
}

/** 
 * Calculate collection's timespan according to its children recursively
 * @param Number $collectionId
 * @param Boolean $isUpdate: boolean, update children collections as well
 * @return array $timespan
 */
function calculateCollectionTimespanR($collectionId, $isUpdate) {
	$timespan = calculateCollectionTimespan($collectionId);

	$sql = "SELECT id FROM `objects` WHERE id in (SELECT subject_id FROM"
		. " `object_relations` WHERE object_id = '$collectionId')"
		. " AND object_type_id = '".HC_OBJECT_TYPE_COLLECTION
		. "' AND object_state_id != '".HC_OBJECT_DELETED."'";
	$result = sqlCommand($sql);

	foreach ($result as $row) {
		$time = calculateCollectionTimespanR($row['id'], $isUpdate);

		if (is_null($timespan['minDateFrom']) && !is_null($time['minDateFrom']))
			$timespan['minDateFrom'] = $time['minDateFrom'];
		else if (HCDate::dateLarger($timespan['minDateFrom'], $time['minDateFrom']) 
				&& !is_null($time['minDateFrom'])) 
			$timespan['minDateFrom'] = $time['minDateFrom'];

		if (! HCDate::dateLarger($timespan['maxDateTo'], $time['maxDateTo']))
			$timespan['maxDateTo'] = $time['maxDateTo'];
	}

	//update timespan
	if ($isUpdate) {
		$object['date_from'] = $timespan['minDateFrom'];
		$object['date_to'] = $timespan['maxDateTo'];
		$result = update("object_mappings", $object, "object_id = '$collectionId'");
	}
	return $timespan;
}

/**
 *  Calculate collection's timespan, then calculate its parents up to base collections
 *  @param Number $collectionId
 *  @return array $boundary: an array containing boundary of current collection
 */
function updateColTimespanBottomUp($collectionId) {
	global $HC_BASE_COLLECTIONS_ID;

	$timespan= calculateCollectionTimespan($collectionId);
	$object['date_from'] = $timespan['minDateFrom'];
	$object['date_to'] = $timespan['maxDateTo'];
	$result = update("object_mappings", $object, "object_id = '$collectionId'");

	$sql = "SELECT id FROM `objects` WHERE id in (SELECT object_id FROM"
		. "	`object_relations` WHERE subject_id = '$collectionId') AND object_type_id"
		. " = '".HC_OBJECT_TYPE_COLLECTION."' AND object_state_id != '".HC_OBJECT_DELETED."'";
	$result = sqlCommand($sql);

	foreach ($result as $row) {
		// do not update base collections' boundary because of performance issues
		if (!in_array($row['id'], $HC_BASE_COLLECTIONS_ID))
			$time = updateColTimespanBottomUp($row['id']);
	}

	return $timespan;
}

/**
 *  Calculate collection's timespan and boundary, then calculate its parents
 *  up to base collections
 *  @param Number $collectionId
 *  @return array $boundary: an array containing boundary of current collection
 */
function updateColTimeBoundBottomUp($collectionId) {
	global $HC_BASE_COLLECTIONS_ID;

	$boundary = calculateCollectionBoundary($collectionId);
	$timespan = calculateCollectionTimespan($collectionId);
	$object = $boundary;
	$object['date_from'] = $timespan['minDateFrom'];
	$object['date_to'] = $timespan['maxDateTo'];
	$result = update("object_mappings", $object, "object_id = '$collectionId'");

	$sql = "SELECT id FROM `objects` WHERE id in (SELECT object_id FROM"
		. " `object_relations` WHERE subject_id = '$collectionId') AND"
		. " object_type_id = '".HC_OBJECT_TYPE_COLLECTION."' AND"
		. " object_state_id != '".HC_OBJECT_DELETED."'";
	$result = sqlCommand($sql);

	foreach ($result as $row) {
		// do not update base collections' boundary because of performance issues
		if (!in_array($row['id'], $HC_BASE_COLLECTIONS_ID))
			$time = updateColTimeBoundBottomUp($row['id']);
	}

	return $object;
}
/** 
 * Check if this object has parent
 * @param $objectId: the object id
 * @return $count: the number of parent
 */
function hasParent($objectId) {
	$sql = "SELECT count(*) AS count FROM `object_relations` WHERE subject_id = $objectId";
	$result = sqlCommand($sql);
	$count = $result[0]['count'];
	
	return $count;
}

/**
 * Get the object_relation according to subject id
 * @param Number $objectId
 * @return array object_relation
 */
function getParents($objectId) {
	$result= select("object_relations", "subject_id = $objectId");

	return $result;
}

/**
 * Get the object_relation according to object id
 * @param Number $objectId
 * @return array object_relation
 */
function getChildren($objectId) {
	$result= select("object_relations", "object_id = $objectId AND object_state_id != 5");

	return $result;
}

/**
 * Get all ancestors' id recursively
 * @param Number $objectId
 * @return array $parentIdArray: array of parent id
 */
function getAncestors($objectId) {
	$parentIdArray = array();

	$result = getParents($objectId);

	foreach ($result as $row) {
		$parentId = $row['object_id'];
		$parentIdArray[] = $parentId;
		array_merge($parentIdArray, getAncestors($parentId));
	}

	return $parentIdArray;
}


/**
 * Get all descendents' id recursively
 * @param Number $objectId
 * @return array $childrenIdArray: array of children id
 */
function getDescendents($objectId) {
	$childrenIdArray = array();

	$result = getChildren($objectId);

	foreach ($result as $row) {
		$childId = $row['subject_id'];
	
		$childrenIdArray[] = $childId;
		array_merge($childrenIdArray, getDescendents($childId));
	}

	return $childrenIdArray;
}
/**
 * Check if two collections has circular reference
 * @param int $collectionId: the id of collection whose parents and 
 * children will be selected
 * @param int $collectionIdArray: the IDs of collection that will be checked
 * @return bool true if there is a circular reference,
 *               false if no circular reference
 */
function checkCircular($collectionId, $collectionIdArray) {
	$childrenIdArray = getDescendents($collectionId);

	foreach ($collectionIdArray as $id)	{
		if ( ($collectionId == $id) ||
			 (in_array($id, $childrenIdArray)) )
			return true;
	}

	return false;
}

/**
 * Check if the user is the owner of the object
 * @param int $objectId
 * @param int $userId
 * @return Boolean
 */
function isOwner($objectId, $userId) {
	$result = select("objects", "id=$objectId");

	foreach ($result as $row) {
		if ($row['owner_id'] == $userId)
			return true;
	}

	return false;
}

/**
 * Check if the object is a collection
 * @param {Integer} $objectId
 * @return {Boolean} true is the object is a collection, false otherwise
 */
function isCollection($objectId) {
	$result = select("objects", "id=$objectId");

	foreach ($result as $row) {
		if ($row['object_type_id'] == HC_OBJECT_TYPE_COLLECTION)
			return true;
	}

	return false;
}

/**
 * Delete a single object from database, the object can only be recovered 
 * from backup database
 * @param $whereClause:
 * @return $allQueryOk: true on success, false on error
 */
function deleteObjectFromDB($whereClause) {
	if (empty($whereClause))
		return;

	$allQueryOk = false;
	$objects = select("objects", $whereClause);

	foreach ($objects as $object) {
		$objectId = $object['id'];

		//delete all object relations link to this object
		$allQueryOk = delete("object_relations", "subject_id = '$objectId'");
		
		//delete content for each object
		//content may be null
		if (isset($object['content_id'])) {
			$contentId = $object['content_id'];
			$allQueryOk = delete("contents", "id='$contentId'");
		}

		//delete objects_user for each object
		$allQueryOk = delete("objects_users", "object_id='$objectId'");

		//select object_mapping for each object
		$objectMappings = select("object_mappings", "object_id='$objectId'");
		foreach ($objectMappings as $objectMapping)	{
			//select multiple object_mappings_geo_references for each object_mappings
			$objectMappingId = $objectMapping['id'];
			$allQueryOk = delete("object_mappings", "id='$objectMappingId'");

			$objectMappingsGeoReferences = select("object_mappings_geo_references", 
												"object_mapping_id='$objectMappingId'");
			$idList = "";
			foreach ($objectMappingsGeoReferences as $objectMappingsGeoReference) {
				//select multiple geo_references for each object_mappings_geo_references
				$geoReferenceId = $objectMappingsGeoReference['geo_reference_id'];
				$idList .= "'".$geoReferenceId."',";
			}
			//delete last charater ','
			$idList = substr($idList, 0, strlen($idList)-1);

			if (!empty($idList))
				$allQueryOk = delete("geo_references", "id IN ($idList)");

			$allQueryOk = delete("object_mappings_geo_references", 
								"object_mapping_id='$objectMappingId'");
		}

		//delete object
		$allQueryOk =delete("objects", "id='$objectId'");
	}

	return $allQueryOk;
}

/**
 * Delete an object by deleting the relation between parent and itself
 * Do not mark it as deleted because it may be in other collections
 * @param $objectId: the object id
 * @param $collectionId: the parent collection id 
 * @return $allQueryOk: true on sucess, false on error
 */
function deleteObject($objectId, $collectionId) {
	$allQueryOk = false;

	//check input has correct type
	if (!is_int($objectId) || !is_int($collectionId))
		return $allQueryOk;

	$allQueryOk = delete("object_relations", "object_id = '$collectionId' AND subject_id = '$objectId'");

	//check if the object has parent, if not, mark it as deleted
	if (hasParent($objectId) ==  0)	{
		//mark this object as deleted
		$updatedObj['object_state_id'] = HC_OBJECT_DELETED;
		$updatedObj['updated_at'] = "NOW()";
		$allQueryOk = update("objects", $updatedObj, "id='$objectId'");
	}
	
	return $allQueryOk;
}

/**
 * Delete collections from database, collections can only be 
 * recovered from backup database
 * @param $whereClause: 
 * @return $allQueryOk: true on success, false on error
 */
function deleteCollectionFromDB($whereClause) {
	//force user to use where clause
	if (empty($whereClause))
		return;

	$allQueryOk = false;

	$result = select("objects", $whereClause);

	foreach ($result as $row) {
		$collectionId = $row['id'];

		//delete collection itself
		$allQueryOk = deleteObjectFromDB("id='$collectionId'");

		//select all its children
		$sql = "SELECT o.id, o.object_type_id FROM `objects` AS o,"
			. " `object_relations` AS obr WHERE o.id = obr.subject_id"
			. " AND obr.object_id = '$collectionId'";

		$result = sqlCommand($sql);

		//delete all children
		foreach($result as $child) {
			$childId = (int)$child['id'];
			$childType = (int)$child['object_type_id'];

			if ($childType == HC_OBJECT_TYPE_MEDIA)
				$allQueryOk = deleteObjectFromDB("id='$childId'");
			else if ($childType == HC_OBJECT_TYPE_COLLECTION)
				$allQueryOk = deleteCollectionFromDB("id='$childId'");
		}
	}

	return $allQueryOk;
}

/** 
 * Delete collection by deleting relations between itself and its parent 
 * @param $collectionId: the collection id 
 * @param $parentId: the parent collection id
 * @return $allQueryOk: true on success, false on error
 */
function deleteCollection($collectionId, $parentId) {
	//delete object relation to parent
	$allQueryOk = delete("object_relations", "object_id = '".$parentId
				."' AND subject_id = '$collectionId'");

	//check if the object has parent, if not, remove all relations to children and mark it as deleted
	if (hasParent($collectionId) ==  0)	{
		//select all its children
		$sql = "SELECT o.id, o.object_type_id FROM `objects` AS o,"
			. " `object_relations` AS obr WHERE o.id = obr.subject_id AND"
			. " obr.object_id = '$collectionId'";

		$result = sqlCommand($sql);

		//remove the relation between children and itself
		foreach($result as $child) {
			$childId = (int)$child['id'];
			$childType = (int)$child['object_type_id'];

			if ($childType == HC_OBJECT_TYPE_COLLECTION)
				$allQueryOk = deleteCollection($childId, $collectionId);
			else
				$allQueryOk = deleteObject($childId, $collectionId);
		}

		//mark this object as deleted
		$updatedObj['object_state_id'] = HC_OBJECT_DELETED;
		$updatedObj['updated_at'] = "NOW()";
		$allQueryOk = update("objects", $updatedObj, "id='$collectionId'");
	}

	return $allQueryOk;
}

/**
 * Delete collection and all its relations
 * This function is called when the owner delete his/her own collection
 * @param Number $collectionId
 * @return Boolean true on success, false on error
 */
function deleteCollectionAll($collectionId) {
	//delete object relation to parent
	$allQueryOk = delete("object_relations", "subject_id = '$collectionId'");

	//select all its children
	$sql = "SELECT o.id, o.object_type_id FROM `objects` AS o,"
		. "`object_relations` AS obr WHERE o.id = obr.subject_id"
		. " AND obr.object_id = '$collectionId'";
	$result = sqlCommand($sql);

	//remove the relation between children and itself
	foreach($result as $child) {
		$childId = (int)$child['id'];
		$childType = (int)$child['object_type_id'];

		if ($childType == HC_OBJECT_TYPE_COLLECTION)
			$allQueryOk = deleteCollection($childId, $collectionId);
		else
			$allQueryOk = deleteObject($childId, $collectionId);
	}

	//mark this object as deleted
	$updatedObj['object_state_id'] = HC_OBJECT_DELETED;
	$updatedObj['updated_at'] = "NOW()";
	$allQueryOk = update("objects", $updatedObj, "id='$collectionId'");

	return $allQueryOk;
}

/**
 * Get collections according to bounds and timespan
 * @param Number $neLat, $neLon, $swLat, $swLon: the bounds
 * @param String $startTime, $endTime: the timespan
 * @param array: an array of collections
 */
function getCollectionByBoundByTime($neLat, $neLon, $swLat, $swLon, 
									$startTime, $endTime) {
	$sqlQuery= "SELECT o.id, o.title, o.object_state_id, o.owner_id,count(*),"
			. "om.ne_lat,om.ne_lon,om.sw_lat,om.sw_lon  from objects as o, "
			. "object_mappings as om, object_relations as obr  WHERE"
			. "	o.object_type_id=2 AND o.id = om.object_id AND ( NOT("
			. " om.sw_lat >= ".$neLat." OR om.sw_lon >= ".$neLon." OR"
			. " om.ne_lat <= ".$swLat." OR om.ne_lon <= ".$swLon."))";

	$startTime = mysql_real_escape_string($startTime);
	$endTime   = mysql_real_escape_string($endTime);
	$sqlQuery .= " AND(not (om.date_to <= $startTime )) AND(not ($endTime <= om.date_from))";
	$sqlQuery .= "AND obr.object_id= o.id group by o.id";

	$arrays = array();
	while ($row = mysql_fetch_array($result, MYSQL_ASSOC)) {
		array_push($arrays, $row);
	}

	return $arrays;
}

/** 
 * update collection's time and boundary when collection exists
 * @param Number $other_collect_id:
 * @param Number $ne_lat:
 * @param Number $ne_lon:
 * @param Number $sw_lat:
 * @param Number $sw_lon:
 * @param String $minDateFrom:
 * @param String $maxDateTo:
 * @param String $DateTime:
 * @return Boolean: true on success, false on error
 */
function updateCollectionTimeBoundary($other_collect_id, $ne_lat, $ne_lon,
									$sw_lat, $sw_lon, $minDateFrom, 
									$maxDateTo, $DateTime) {
	$objectArray = select("object_mappings", "object_id = $other_collect_id");
	
	foreach ($objectArray as $row) {
		$collectionMappingId = $row['id'];
		$object = array('ne_lat' => $ne_lat,
						'ne_lon' => $ne_lon,
						'sw_lat' => $sw_lat,
						'sw_lon' => $sw_lon,
						'date_from' => $minDateFrom,
						'date_to' => $maxDateTo,
						'updated_at' => 'NOW()');

		$result = update("object_mappings", $object, "`id` =".$collectionMappingId);
	}

	return $result;
}


/**
 * Insert object_mappings, geo_references, object_mappings_geo_references
 * @param {Number} $objectId
 * @param {Number} $markerStyleId
 * @param String $kml
 * @param String $dateFrom
 * @param String $dateTo
 * @param array $latlng: an array of array e.g., ['lat'=>34, 'lng'=>118, 'alt'=>0]
 * @param String $createTime
 * @param String $view
 * @param String $zoom
 * @return Number: object mapping id
 */
function insertObjectMapping($objectId, $markerStyleId, $kml, $dateFrom, 
							$dateTo, $latlng, $createTime, $view, $zoom, 
							$markerStateId = 0) {
	//calculate the boundary
	foreach ($latlng as $latlngalt) {
		$latArray[] = $latlngalt['lat'];
		$lngArray[] = $latlngalt['lng'];
	}
	$neLat = max($latArray);
	$neLon = max($lngArray);
	$swLat = min($latArray);
	$swLon = min($lngArray);

	$object = array("object_id" => $objectId,
					"marker_style_id" => $markerStyleId,
					"kml" => $kml,
					"date_from" => $dateFrom,
					"date_to" => $dateTo,
					"ne_lat" => $neLat,
					"ne_lon" => $neLon,
					"sw_lat" => $swLat,
					"sw_lon" => $swLon,
					"created_at" => $createTime,
					"updated_at" => $createTime,
					"view" => $view,
					"zoom" => $zoom,
					"marker_state_id" => $markerStateId);
	$objectMappingId = insert("object_mappings", $object);

	switch ($markerStyleId) {
		case HC_MARKER_POINT:	//marker
		case HC_MARKER_3D_POINT: // 3D object
		case HC_MARKER_3D_MODEL: // 3D Model
		case HC_MARKER_3D_VIEW: // 3D View
			$object = array("latitude" => $latlng[0]['lat'],
							"longitude" => $latlng[0]['lng'],
							"altitude" => $latlng[0]['alt'],
							"order" => '0');
			$geoReferenceId = insert("geo_references", $object);

			$object = array("object_mapping_id" => $objectMappingId,
							"geo_reference_id" => $geoReferenceId);
			$result = insert("object_mappings_geo_references", $object);
			break;
		case HC_MARKER_LINE:	// polyline
		case HC_MARKER_POLYGON: // polygon
		case HC_MARKER_3D_LINE: // 3D polyline
		case HC_MARKER_3D_POLYGON: // 3D polygon
			$geoRefIdArray = insertMultiGeoReferences($latlng);
			$result = insertMultiObjectMappingsGeoReferences($objectMappingId,
															$geoRefIdArray);
			break;
	}

	return $objectMappingId;
}

/**
 * Insert contents, objects, objects_users
 * Does not set relations with collection
 * @param String $title
 * @param Number $objectTypeId
 * @param String $content
 * @param String $creator
 * @param String $copyright
 * @param String $creatTime
 * @param Number $userId
 * @return $objectId
 */
function insertObject($title, $objectTypeId, $content, $creator, 
					$copyright, $createTime, $userId) {
	// $content can be null
	if ( $content != NULL ) {
		$object = array("content" => $content,
						"created_at" => $createTime,
						"updated_at" => $createTime );
		$contentId = insert("contents", $object);
	} else $contentId = NULL;

	$object = array("title" => $title,
					"object_type_id" => $objectTypeId,
					"object_state_id" => HC_OBJECT_PUBLIC,	//TODO: user should be able to set object state
					"description" => '',
					"content_id" => $contentId,
					"creator" => $creator,
					"copyright" => $copyright,
					"owner_id" => $userId,
					"created_at" => $createTime,
					"updated_at" => $createTime );
	$objectId = insert("objects", $object);	//this id is for single obj, not collection_id

	// object's relation with user
	$object = array("object_id" => $objectId,
					"user_id" => $userId,
					"access_right_id" => '7',
					"created_at" => $createTime,
					"updated_at" => $createTime );
	$result = insert("objects_users", $object);

	return $objectId;
}

/**
 * only insert collection, not include its objects
 * this function does not set relations
 * insert collection steps:
 * step 1: insetCollection
 * step 2: insetObject
 * step 3: insetObjectMapping
 * step 4: insertObjectRelations
 * step 5: calculateCollectionBoundary
 * step 6: updateCollectionTimeBoundary
 * @param String $title:
 * @param String $description:
 * @param String $creator:
 * @param String $copyright:
 * @param String $createTime:
 * @param String $userId:
 * @param String $kml:
 * @param String $dateFrom:
 * @param String $dateTo:
 * @param Number $ne_lat:
 * @param Number $ne_lon:
 * @param Number $sw_lat:
 * @param Number $sw_lon:
 * @param String $view:
 * @param String $password:
 * @param String $state:
 * @param String $map_id:
 * @return  
 */
function insertCollection($title, $description, $creator, $copyright, 
						$createTime, $userId, $kml, $dateFrom, $dateTo, 
						$ne_lat, $ne_lon, $sw_lat, $sw_lon, $view, 
						$password, $state, $map_id = NULL) {
	if (empty($state))
		$state = HC_OBJECT_PUBLIC;

	$object = array("title" => $title,
					"object_type_id" => '2',
					"object_state_id" => $state,
					"description" => $description,
					"content_id" => NULL,
					"creator" => $creator,
					"copyright" => $copyright,
					"owner_id" => $userId,
					"password" => $password,
					"created_at" => $createTime,
					"updated_at" => $createTime );
	$collectionId = insert("objects", $object);

	$object = array("object_id" => $collectionId,
					"user_id" => $userId,
					"access_right_id" => '7',
					"created_at" => $createTime,
					"updated_at" => $createTime );
	$objectsUsersId = insert("objects_users", $object);

	$object = array("object_id" => $collectionId,
					"marker_style_id" => '0',
					"kml" => $kml,
					"date_from" => $dateFrom,
					"date_to" => $dateTo,
					"ne_lat" => $ne_lat,
					"ne_lon" => $ne_lon,
					"sw_lat" => $sw_lat,
					"sw_lon" => $sw_lon,
					"created_at" => $createTime,
					"updated_at" => $createTime,
					"view" => $view,
                                        "basemap_id" => $map_id);
	//remove these values if they are null
	//so that these data will be set as default value in database
	if (is_null($ne_lat)) unset($object['ne_lat']);
	if (is_null($ne_lon)) unset($object['ne_lon']);
	if (is_null($sw_lat)) unset($object['sw_lat']);
	if (is_null($sw_lon)) unset($object['sw_lon']);
	if (is_null($dateFrom)) unset($object['date_from']);
	if (is_null($dateTo)) unset($object['date_to']);

	$collectionMappingId = insert("object_mappings", $object);

	$result = array('collectionId' => $collectionId,
					'objectsUsersId' => $objectsUsersId,
					'collectionMappingId' => $collectionMappingId);

	return $result;
}

/** 
 * Update geo_references given objectMappingId
 * @param {Number} $objectMappingId: number
 * @param {array} $lat: array
 * @param {array} $lng: array
 * @param {array} $alt: array
 * @return Boolean: true on success, false on error
 */
function updateGeoReferenceByObjectMappingId($objectMappingId, $lat, $lng, $alt) {
	$geoRefIdArrays = select("object_mappings_geo_references", 
							"object_mapping_id=$objectMappingId");

	foreach ($geoRefIdArrays as $key => $row) {
		$geoRefId = $row['geo_reference_id'];
		$result = delete("geo_references", "id = $geoRefId");
	}

	$result = delete("object_mappings_geo_references", "object_mapping_id=$objectMappingId");

	$arraySize = count($lat);
	for ($i = 0; $i < $arraySize; $i++) {
		$object = array('latitude' => $lat[$i],
						'longitude' => $lng[$i],
						'altitude' => $alt[$i]);
		$geoRefId = insert("geo_references", $object);

		$object = array('geo_reference_id' => $geoRefId,
						'object_mapping_id' => $objectMappingId);
		$result = insert("object_mappings_geo_references", $object);
	}

	return $result;
}

/** 
 * Insert collections into public collection, every collection needs to be 
 * added to public collection or user's collections in order to show up in 
 * collection list
 * @param $collectionId: the id of collection which will be added into public
 *  collection 
 * @param $userId: the user id that collection belongs to
 * @return $result: true on success, false on error
 */
function addToPubCollection($collectionId, $userId) {
	//insert into public collection
	$dateTime = date('Y-m-d H:i:s');
	$sql = "SELECT id FROM `objects` WHERE title = '".HC_PUBLIC_COLLECTIONS_NAME."'";
	$result = sqlCommand($sql);
	$pubCollectionId = $result[0]['id'];
	$result = insertObjectRelations(array($collectionId),$pubCollectionId, 
									$userId, $dateTime);

	return $result;
}

/**
 * Insert collections into my collection, every collection needs to be 
 * added to public collection or user's collections in order to show up
 * in collection list
 * @param $collectionId: the id of collection which will be added into public collection
 * @param $userId: the user id that collection belongs to
 * @return $result: true on success, false on error
 */
function addToMyCollection($collectionId, $userId) {
	$dateTime = date('Y-m-d H:i:s');
	$user = new cUser();
	$myCollectionId = $user->getMyCollectionId($userId);
	$result = insertObjectRelations(array($collectionId), $myCollectionId, 
									$userId, $dateTime);

	return $result;
}

/**
 * Get collections that contain $keyword in collection name
 * @param {String} $keyword to search
 * @return {Array} list of collection
 */
function searchCollections($keyword) {

    $db = database::getInstance();

    $params = array('type'=>'s', &$keyword);

    // We only return collection that not being flagged or deleted
    $query_str = "SELECT * FROM objects"
               ." WHERE title LIKE ?"
               ." AND object_type_id = " . HC_OBJECT_TYPE_COLLECTION 
               ." AND object_state_id <= " . HC_OBJECT_HIDDEN
               ." ORDER BY title";

    $result = $db->preparedQuery($query_str, $params);

    if (!$result) {
        $message = "Fail to query searchCollections (key=$keyword)";
        HC_errorLog($message);
        HC_reportGeneralError("query searchCollections");
    }

    $resultCollections = $db->preparedGetRows();

    return $resultCollections;
}

/**
 * Get parent collections of object $objectId
 * @param $objectId: the object's id
 * @return $result: list of collection
 */
function getParentCollections($objectId) {

	$db = database::getInstance();

	$params = array('type'=>'i', &$objectId);

    // We only return collection that not being flagged or deleted
	$query_str = " SELECT o.id as id, o.title, o.owner_id, o.object_state_id, o.password "
				." FROM objects AS o, object_relations AS obr "
				." WHERE o.id = obr.object_id "
				." AND obr.subject_id = ? "
				." AND o.object_type_id = " . HC_OBJECT_TYPE_COLLECTION 
				." AND o.object_state_id <= " . HC_OBJECT_HIDDEN
				." ORDER BY o.title";

	$result = $db->preparedQuery($query_str, $params);

	if (!$result) {
		$message = "Fail to query ParentCollections (oid=$objectId)";
		HC_errorLog($message);
		HC_reportGeneralError("query ParentCollections");
	}

	$parentCollections = $db->preparedGetRows();

	return $parentCollections;
}

/**
 * Get collection that owned by user $userId
 * @param {Integer} the user's id
 * @return {Array} list of collection
 */
function getUserCollections($userId) {

    $db = database::getInstance();

    $params = array('type'=>'ii', &$userId, &$userId);

    // We only return collection that not being flagged or deleted
	// select collections belong to the user or are of write privilege for the user
	$query_str = "SELECT * FROM objects as o"
		       ." LEFT JOIN objects_users as ou ON o.id = ou.object_id"
               ." WHERE (o.owner_id = ? OR ou.user_id = ?)"
               ." AND o.object_type_id = " . HC_OBJECT_TYPE_COLLECTION 
               ." AND o.object_state_id <= " . HC_OBJECT_HIDDEN
               ." ORDER BY o.title";

    $result = $db->preparedQuery($query_str, $params);

    if (!$result) {
        $message = "Fail to query UserCollections (uid=$userId)";
        HC_errorLog($message);
        HC_reportGeneralError("query UserCollections");
    }

    $myCollections = $db->preparedGetRows();

    return $myCollections;
}

/**
 * Get user's my collections 
 * (Deprecated: use getUserCollections)
 * @param $userId: the user's id
 * @param $filterIdList: array, the list of ids which will be filtered out
 * @return $result
 */
function getMyCollections ($userId, $filterIdList) {
	$user = new cUser();
	$myCollectionId = $user->getMyCollectionId($userId);

	if (!empty($filterIdList)) {
		$filter = " AND id NOT IN (".implode(",", $filterIdList).")";
	} else {
		$filter = "";
	}

	//1. select collections created by myself
	//2. select collections belong to my collections
	//3. select collections which are public, private or hidden
	//we can do the following by adding them in filterIdList
	//4. select my collections itself
	//5. when updating collection, do not select that collection
	$sql = "SELECT * FROM objects WHERE object_type_id = '".HC_OBJECT_TYPE_COLLECTION."'"
		.  " AND object_state_id <= '".HC_OBJECT_HIDDEN."'"
		.  " AND (owner_id = '$userId' OR id in (SELECT subject_id FROM"
		.  " `object_relations` WHERE object_id = '".$myCollectionId."'))"
		.  $filter . " ORDER BY title";

	$result = sqlCommand($sql);

	return $result;
}

/**
 * Get all public collections except hidden, inappropriate, delete, my
 * collections
 * @param Number $userId
 * @param array $filterIdList
 * @return array: an array of public collections
 */
function getPubCollections($userId, $filterIdList) {
	if (!empty($filterIdList))
		$filter = " AND id NOT IN (".implode(",", $filterIdList).")";
	else
		$filter = "";

	//select all collections except hidden, inapropriate, deleted, My Collections,
	//or the collection that will be updated
	$sql = "SELECT * from objects WHERE object_type_id = '".HC_OBJECT_TYPE_COLLECTION."'"
		.  " AND object_state_id < '" . HC_OBJECT_HIDDEN."'"
		.  " AND title != '".HC_USER_COLLECTIONS_NAME."'"
		.  $filter
		.  " ORDER BY title";
	$result = sqlCommand($sql);

	return $result;
}

/**
 * Get all map information within $bound and timespan
 * @param {JSON} $bound contains west, east, south, and north
 * @param {String} $dataFrom 
 * @param {String} $dateTo
 * @return {Array} list of matched maps
 */
function getMapInfo($bound, $zoom, $dateFrom, $dateTo) {

	// Setup viewport fields
	$bound = json_decode($bound, true);
	$neLat = $bound['north'];
	$neLon = $bound['east'];
	$swLat = $bound['south'];
	$swLon = $bound['west'];

	// Setup timespan fields
	$dateFrom_isBC = 0;
	$dateTo_isBC   = 0;
	if (HCDate::isBCDate($dateFrom)) {
		$dateFrom_isBC = 1;
		$dateFrom = HCDate::toADDate($dateFrom);
	}
	if (HCDate::isBCDate($dateTo)) {
		$dateTo_isBC = 1;
		$dateTo = HCDate::toADDate($dateTo);
	}

	// Now we are ready to start the query
	$db = database::getInstance();

	$params = array('type'=>'ddddddss', &$neLat, &$neLon, &$swLat, &$swLon,
					&$zoom, &$zoom, &$dateFrom, &$dateTo);

	$query_str = "SELECT m.id, m.date_from, m.dateFrom_isBC,"
				." m.date_to, m.dateTo_isBC, m.title, m.ne_lat, m.ne_lon,"
				." m.sw_lat, m.sw_lon, mp.max_zoom_level, mp.min_zoom_level,"
				." mp.tile_type_id, mp.tile_url, m.description, m.thumbnail_url "
				."FROM maps AS m, map_profiles AS mp "
				."WHERE m.id = mp.map_id AND mp.map_state_id = 1 "
				."AND (NOT(m.sw_lat >= ? OR m.sw_lon >= ? OR m.ne_lat <= ? "
				."OR m.ne_lon <= ?)) ";

	// Maps are in current zoomLevel
	if ($zoom >= 0) {
		$query_str .= "AND (NOT(mp.max_zoom_level < ? OR mp.min_zoom_level > ?)) ";
	} else { // Dummy Query if zoom level are not given
		$query_str .= "AND ( ? = ? ) ";
	}

	// Both timebound are A.D.
	if (!$dateFrom_isBC && !$dateTo_isBC) {
		$query_str .= "AND m.dateFrom_isBC = 0 AND m.dateTo_isBC = 0"
					." AND (NOT(m.date_to < ? OR m.date_from > ?))";
	}
	// Both timebound are B.C.
	else if ($dateFrom_isBC && $dateTo_isBC) {
		$query_str .= "AND m.dateFrom_isBC = 1 AND m.dateTo_isBC = 1"
					." AND (NOT(m.date_to > ? OR m.date_from < ?))";
	}
	// Start from B.C. and end at A.D.
	else if ($dateFrom_isBC && !$dateTo_isBC) {
		$query_str .= "AND (NOT((m.date_to > ? AND m.dateTo_isBC = 1)"
					." OR (m.date_from > ? AND m.dateFrom_isBC = 0)))";
	}
	// Otherwise, it's an error
	else {
		$message = "Fail to query maps (DateFrom > DateTo)";
		HC_errorLog($message);
		HC_reportGeneralError("query maps");
	}

	$query_str .= " ORDER BY m.dateFrom_isBC, m.date_from";

	$result = $db->preparedQuery($query_str, $params);

	if (!$result) {
		$message = "Fail to query maps (Bound & Time)";
		HC_errorLog($message);
		HC_reportGeneralError("query maps");
    }

	$resultMaps = $db->preparedGetRows();

	return $resultMaps;
}

/**
 * Get maps that contain $keyword in title
 * @param {String} $keyword to search
 * @return {Array} list of matched maps
 */
function searchMaps($keyword) {

	$db = database::getInstance();

	$params = array('type'=>'s', &$keyword);

	$query_str = "SELECT m.id, m.date_from, m.dateFrom_isBC,"
				." m.date_to, m.dateTo_isBC, m.title, m.ne_lat, m.ne_lon,"
				." m.sw_lat, m.sw_lon, mp.max_zoom_level, mp.min_zoom_level,"
				." mp.tile_type_id, mp.tile_url, m.description, m.thumbnail_url "
				."FROM maps AS m, map_profiles AS mp "
				."WHERE m.id = mp.map_id AND mp.map_state_id = 1 "
				."AND m.title LIKE ? "
				."ORDER BY m.dateFrom_isBC, m.date_from";

	$result = $db->preparedQuery($query_str, $params);

	if (!$result) {
		$message = "Fail to query searchMaps (key=$keyword)";
		HC_errorLog($message);
		HC_reportGeneralError("query searchMaps");
	}

	$resultMaps = $db->preparedGetRows();

	return $resultMaps;
}

/**
 * Get maps that with id equals to $mapId
 * @param {Integer} $mapId to search
 * @return {Array} list of matched maps
 */
function getMapInfoById($mapId) {

	$db = database::getInstance();

	$params = array('type'=>'i', &$mapId);

	$query_str = "SELECT m.id, m.date_from, m.dateFrom_isBC,"
				." m.date_to, m.dateTo_isBC, m.title, m.ne_lat, m.ne_lon,"
				." m.sw_lat, m.sw_lon, mp.max_zoom_level, mp.min_zoom_level,"
				." mp.tile_type_id, mp.tile_url, m.description, m.thumbnail_url "
				."FROM maps AS m, map_profiles AS mp "
				."WHERE m.id = mp.map_id AND mp.map_state_id = 1 "
				."AND m.id = ? "
				."ORDER BY m.dateFrom_isBC, m.date_from";

	$result = $db->preparedQuery($query_str, $params);

	if (!$result) {
		$message = "Fail to query getMapInfoById (mapId=$mapId)";
		HC_errorLog($message);
		HC_reportGeneralError("query getMapInfoById");
	}

	$resultMaps = $db->preparedGetRows();

	return $resultMaps;
}
function insertBookObject($title, $objectId, $bookId,  
					$createTime, $userId,$page_no) {
	$result  = select("books", "book_id = '$bookId'");

	foreach ($result as $row) {
		if ($row[''] == $userId)
			return true;
	}
	
	if($bookId != NULL && count($result) == 0) {
	$object = array("title" => $title,
					"book_id" => $bookId,	//TODO: user should be able to set object state
					"created_at" => $createTime,
					"updated_at" => $createTime );
	$book_id = insert("books", $object);	//this id is for single obj, not collection_id
	}

	// object's relation with user
	$object = array("object_id" => $objectId,
					"user_id" => $userId,
					"book_id" => $bookId,
					"page_no" => $page_no );
	$result = insert("book_objects", $object);
//	Log::write("Here");
	return $bookId;
}


/**
 * Get maps that owned by user $userId
 * @param {Integer} the user's id
 * @return {Array} list of matched maps
 */
function getUserMaps($userId) {
	// Not Implemented
	return array();
}

/**
 * Check if the current user has privilege of an object.
 * This function should be modified to fit the future needs.
 * @param {Integer} the object's id
 * @return {Boolean} true on success false otherwise
 */
function checkPrivilege($objectId) {
	$userId = cServerSession::getUserId();
	$object = select("objects", "id=$objectId");
	$ownerId = (int)$object[0]['owner_id'];

	if ( $ownerId === $userId) {
		return true;
	}

	return false;
}
?>
