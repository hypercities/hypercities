<?php

namespace HyperCities\Provider\ItemManagement;
use \database;
use \pow;
use HyperCities\Provider\Request;
use HyperCities\Provider\Models\Placemark;
use HyperCities\Provider\Models\Model;
use HyperCities\Provider\Authentication\AuthenticationManager;
use HyperCities\Provider\Authentication\UserNotFound;

/*class SelectQuery {
	public $fields;
	public $tables, $conditions, $order = array();

	public function __construct () {

	}

	public function __toString() {
		return 'SELECT ' . $this->fields .' FROM ' .implode(', ', $this->tables)
				.' WHERE '.implode(' ', $this->conditions) . ' ORDER BY '.implode(', ' , $this->order);
	}

	public function addCondition ($condition) {
		$this->conditions[] = $condition;
	}
}*/

class SelectQuery {

    public $fields = array (), $itemTable;
    private $tables = array(),
            $conditions = array (),
            $order = array();
    private $parameters = array('type' => '');

    public function __construct() {

    }

    public function __toString() {
        $string = 'SELECT ' . implode(', ', $this->fields) . ' FROM ' . implode(', ', $this->tables);
        if ($this->conditions) $string .= ' WHERE ' . implode(' ', $this->conditions);
        if ($this->order) $string .= ' ORDER BY ' . implode(', ', $this->order);
        return $string;
    }

    public function addTable($table) {
        if (!in_array($table, $this->tables)) {
            $this->tables[] = $table;
        }
    }

    public function addCondition($condition) {
        $this->conditions[] = $condition;
    }
    public function removeCondition ($condition) {
	if ($index = array_search($condition, $this->conditions)) {
	    unset ($this->conditions[$index]);
	}
    }

    public function addParameter(&$parameter, $type = 's') {
        $this->parameters['type'] .= $type;
        $this->parameters[] = &$parameter;
    }

    public function addFields ($field) {
        if (!in_array($field, $this->fields)) $this->fields[] = $field;
    }

}

class PlacemarkManager extends ModelManager {

	public static function handle (Request $request) {
		if (count($request->url) == 2) {
			if ($request->url[1] == 'search') {
				$data = self::search($request);
			}
			else if (count($request->url) == 3) {

			} else {
				$data = parent::handle($request, get_class());
			}
			return $data;
		} else {
			$data = parent::handle($request, get_class());
		}
		return $data;
	}

	public static function catalog (Request $request) {
		$query = $request->query;
		$sqlQuery = new SelectQuery();
		$params = array('type' => '');
		$setLimit = TRUE;
		$sqlQuery->fields = 'DISTINCT(om.object_id) AS id, om.kml, om.ne_lat, '
				.' om.ne_lon, om.sw_lat, om.sw_lon, o.object_state_id, '
				.' om.date_from, om.dateFrom_isBC, om.date_to, om.dateTo_isBC, '
				.' o.title, o.creator, o.description, o.owner_id, o.object_type_id, '
				.' u.email, o.content_id';
		$sqlQuery->tables[] = 'object_mappings AS om';
		$sqlQuery->tables[] = 'users AS u';
		$sqlQuery->tables[] = ' objects AS o ';
		$sqlQuery->conditions[] = ' o.id = om.object_id ';
		$sqlQuery->conditions[] = ' AND u.id = o.owner_id ';
		$sqlQuery->conditions[] = ' AND o.object_state_id != 5 ';
		// if it has a user specified
		if ($query->hasParentCriteria) {
			$sqlQuery->tables[] = 'object_relations AS obr';
			$sqlQuery->conditions[] = ' AND obr.object_id = ?';
			$sqlQuery->conditions[] = ' AND obr.subject_id = o.id';
			$params['type'] .= 'i';
			$parentid = &$query->requestData['parent_id'];
			$params[] = &$parentid;
			$setLimit = FALSE;
			$sqlQuery->order[] = 'obr.order ASC';
			$sqlQuery->order[] = 'obr.subject_id ASC';
		}
		if ($query->hasUserCriteria) {
			try {
				if (isset($query->requestData['creator_eppn'])) {
					$user = AuthenticationManager::getUserByEmail($query->requestData['creator_eppn']);
					$id = $user->id;
				} else {
					$id = $query->requestData['creator'];
				}
				$sqlQuery->conditions[] = ' AND o.owner_id = ?';
				$params['type'] .= 'i';
				$params[] = &$id;
				$setLimit = FALSE;
			} catch (UserNotFound $ex) {
				throw new ItemNotFound("Nothing found for user.");
			}
		}
		if (isset($query->requestData['object_type_id'])) {
			$sqlQuery->conditions[] = ' AND o.object_type_id = ?';
			$params['type'] .= 'i';
			$params[] = &$query->requestData['object_type_id'];
		}
		$db = database::getInstance();
		//if ($setLimit) $limit = " LIMIT 200";
		//else
		$limit = "";
		if (count($params) > 1) {
			$db->preparedQuery($sqlQuery . $limit, $params);
			$rows = $db->preparedGetRows();
		} else {
			$rows = $db->query($sqlQuery . $limit);
			$rows = $db->getRows();
		}
		if (!$rows) {
			throw new ItemNotFound('Nothing found.');
		}
		$result = Model::buildFromArray($rows);
		return $result;
	}

	public static function search (Request $request) {
		$query = $request->query;
		$db = database::getInstance();
		$center_lat = (float)$query->requestData['center_lat'];
		$center_lon = (float)$query->requestData['center_lon'];
		if (isset($query->requestData['limit'])) $limit = (int)$query->requestData['limit'];
		else $limit = 20;
		for ($i = 0; $i < 22; $i++) {
			$sw_lat = $center_lat - (.0006 * pow(2, $i));
			$ne_lat = $center_lat + (.0006 * pow(2, $i));
			$sw_lon = $center_lon - (.0006 * pow(2, $i));
			$ne_lon = $center_lon + (.0006 * pow(2, $i));
			$query_str = " SELECT o.id, o.object_type_id, o.title, om.ne_lat, "
					." om.ne_lon, om.sw_lat, om.sw_lon"
					." FROM objects o, object_mappings om"
					." WHERE om.sw_lat >= ? AND om.sw_lon >= ? "
					." AND om.ne_lat <= ? AND om.ne_lon <= ? "
					." AND o.id = om.object_id ;";
			$db->preparedQuery($query_str, array('type' => 'ssss', &$sw_lat, &$sw_lon,
					&$ne_lat, &$ne_lon));
			$rows = $db->preparedGetRows();
			// Break if we find more objects
			if (count($rows) >= $limit) break;
			//else print "Nothing found for BBox=$sw_lat,$sw_lon,$ne_lat,$ne_lon";
		}
		return Model::buildFromArray(array_slice($rows, 0, 20));
	}

	public static function create (Request $request) {
		/* Temporarily disabled for development purposes ...
		if (!request->user) {
			throw new UserNotAuthenticated("Object.update");
		}
		 * 
		 */
		$query = $request->query;
		$allQueryOk = true;
		//print "Making object";
		$title = $query->requestData['title'];
		$content = $query->requestData['content'];
		$creator = $query->requestData['creator'];
		$copyright = $query->requestData['copyright'];
		$type = $query->requestData['type'];
		$lat = $query->requestData['lat'];
		$lng = $query->requestData['lng'];
		$latArray = LatLngString::string2Array($lat);
		$lngArray = LatLngString::string2Array($lng);
		$query->requestData['ne_lat'] = $ne_lat = max($latArray);
		$query->requestData['ne_lon'] = $ne_lon = max($lngArray);
		$query->requestData['sw_lat'] = $sw_lat = min($latArray);
		$query->requestData['sw_lon'] = $sw_lon = min($lngArray);
		$alt = 0;
		switch ($query->requestData['type']) {
			case "marker":
				$markerStyleId = 1;
				break;
			case "line":
				$markerStyleId = 2;
				break;
			case "polygon":
				$markerStyleId = 3;
				break;
		}
		$createTime = date( 'Y-m-d H:i:s');
		$view = KmlParser::createView($latArray[0], $lngArray[0], $alt, null, null, null);
		//create KML content
		$kmlObj = new cKml($type, $lat, $lng, $title, "", "", false, null, $view);
		$kmlObj->createKml();
		$kml = $kmlObj->dumpKml();

		$userId = $request->user->id;
		//print "Parsing Timespan";
		$result = parseTimespan($query->requestData, $query->requestData['yearCounter']);
		$minDateFrom = $query->requestData['start'] = $result[0];
		$maxDateTo = $query->requestData['end'] = $result[1];
		$dateFromArray = $result[2];
		$dateToArray = $result[3];

		// 1. insert new object
		//print "inserting objects";
		//print "T: $title Co: $content Cr: $creator Cop: $copyright cTime: $createTime uId: $userId";
		$objectId = insertObject($title, HC_OBJECT_TYPE_MEDIA, $content, $creator,
				$copyright, $createTime, $userId);

		$objectIdArray = array($objectId);
		//print "adding message";
		$response->addMessage(new ObjectCreatedMessage($objectId));


		for($i = 0; $i < count($dateFromArray); $i++) {
			$dateFrom = $dateFromArray[$i];
			$dateTo = $dateToArray[$i];
			$objectMappingId = insertObjectMapping($objectId, $markerStyleId, $kml, $dateFrom,
					$dateTo, $lat, $lng, $alt, $createTime, $view);
		}

		//3. insert a new collection
		if (!empty($query->requestData['newcollection'])) {
			$newCollectionTitle = $query->requestData['newcollection'];
			$description = '';
			$kml = '';
			$result = insertCollection($newCollectionTitle, $description, $creator, $copyright,
					$createTime, $userId, $kml, $minDateFrom, $maxDateTo, $ne_lat,
					$ne_lon, $sw_lat, $sw_lon, $view);

			$collectionId = $result['collectionId'];

			$objectRelationId = insertObjectRelations($objectIdArray, $collectionId, $userId, $createTime);

			//add new collection into public collection and my collection
			$result = addToPubCollection($collectionId, $userId);
			$result = addToMyCollection($collectionId, $userId);
		}

		//7. update if add to others' collection
		if(!empty($query->requestData['collections'])) {
			$collectionIdArray = explode(',',$query->requestData['collections']);
			foreach( $collectionIdArray as $collectionId) {
				CollectionManager::addObject($objectId, $collectionId, $query, $response);
				/*
                        $objectRelationId = insertObjectRelations($objectIdArray, $otherCollectionId, $userId, $createTime);
                        $allQueryOk = updateCollectionTimeBoundary($otherCollectionId, $ne_lat,
                                                                    $ne_lon, $sw_lat, $sw_lon,
                                                                    $minDateFrom, $maxDateTo, $createTime);
                     * 
				*/
			}
		}
		if (empty($allQueryOk)) {
			$response->addMessage (new ObjectAdditionFailureMessage($allQueryOk));
		}
		parent::create($query, $response, $objectId);
		return new CreatedMessage("object", "Object successfully created.", $objectId);
	} // end public function create

	//public static function display (Target $target, $node) {
	public static function display (Request $request) {
		//$db = database::getInstance();
		$query = $request->query;
		// get from database
		$placemark = new Placemark($query->itemId);
		//$docNode = $response->setDocumentNode($query->itemId);
		//$placemark->toXMLAt($docNode);
		return $placemark;
	}

	public static function update (Request $request) {
		$query = $request->query;
		if (!$request->user) {
			throw new UserNotAuthenticated("Object.update");
		}
		$userId = $request->user->id;
		if (!$request->user->checkPrivileges('update', $request->query->itemId)) {
			throw new InsufficientPriviledges($user, 'Object.update', $request->query->itemId);
		}
		$objectId = $query->itemId;
		$title = $query->requestData['title'];
		$content =$query->requestData['content'];
		$creator = $query->requestData['creator'];
		$copyright = $query->requestData['copyright'];
		$createTime = date('Y-m-d H:i:s');

		//$lat, $lng are arrays, it will has only one element in marker's case
		if (!is_array($query->requestData['lat']))
			$lat = LatLngString::string2Array($query->requestData['lat']);
		else
			$lat = $query->requestData['lat'];

		if (!is_array($query->requestData['lng']))
			$lng = LatLngString::string2Array($query->requestData['lng']);
		else
			$lng = $query->requestData['lng'];

		$alt = array(0);	//default value of altitude
		if (!empty($query->requestData['alt']))
			$alt = $query->requestData['alt'];	//for 3d objects

		$neLat = max($lat);
		$neLon = max($lng);
		$swLat = min($lat);
		$swLon = min($lng);

		if (!empty($query->requestData['view']))
			$view = $query->requestData['view'];
		else {
			//use first element of $lat, $lng to create view
			$view = KmlParser::createView($lat[0], $lng[0], $alt[0], null, null, null);
		}

		//generate new kml
		$sql = "select kml from `object_mappings` where object_id = $objectId";
		$result = sqlCommand($sql);
		$kmlStr = $result[0]['kml'];
		$kmlObj = new cKml($kmlStr);
		$kmlObj->setLat($lat);
		$kmlObj->setLng($lng);
		$kmlObj->setView($view);
		$kmlObj->setTitle($title);
		$kmlObj->createKml();
		$kml = $kmlObj->dumpKml();

		$addTo = explode(',', $query->requestData['addTo']);
		$oldAddTo = explode(',', $query->requestData['oldAddTo']);
		$addedCollections = array_diff($addTo, $oldAddTo);
		$deletedCollections = array_diff($oldAddTo, $addTo);

		$dateFrom0 = $query->requestData['dateFrom0'];
		$dateTo0 = $query->requestData['dateTo0'];
		if (substr($query->requestData['dateFrom'], -3) == 'BCE') $dateFrom0 = TRUE;
		if (substr($query->requestData['dateTo'], -3) == 'BCE') $dateTo0 = TRUE;
		$bcTo0 = $query->requestData['bcTo0'];
		if ($bcFrom0)
			$dateFrom0 = HCDate::toBCDate($dateFrom0);
		if ($bcTo0)
			$dateTo0 = HCDate::toBCDate($dateTo0);
		$minDateFrom = $dateFrom0;
		$maxDateTo = $dateTo0;


		$sql = "select id from `object_mappings` where object_id = $objectId";
		$row = sqlCommand($sql);
		$objectMappingId = $row[0]['id'];


		try {
			/*1.update object table*/
			$object = array('title' => $title,
					'creator' => $creator,
					'copyright' => $copyright);
			$result = update("objects", $object, "`id` = $objectId");

			/*2. update content table*/
			$object = array('content' => $content);
			$result = update("contents", $object, "`id` = (SELECT content_id from `objects` where id=$objectId )");

			/*3. update object_mappings*/
			$object = array('kml' => $kml,
					'date_from' => $minDateFrom,
					'date_to' => $maxDateTo,
					'updated_at' => $createTime,
					'ne_lat' => $neLat,
					'ne_lon' => $neLon,
					'sw_lat' => $swLat,
					'sw_lon' => $swLon,
					'view' => $view);
			$result = update("object_mappings", $object, "id = $objectMappingId");

			//update geo_reference
			$result = updateGeoReferenceByObjectMappingId($objectMappingId, $lat, $lng, $alt);
			// TODO: Implement updating object adding

			//update object_relation table
			/*
                foreach ($deletedCollections as $deletedParentId)
                {
                        $result = delete("object_relations", "`object_id` = $deletedParentId and `subject_id`=$objectId");
                }
                // Removed here: updating collection associations will be exclusively left to the \\
                foreach($addedCollections as $addedParentId)
                {
                        $object = array('object_id' => $addedParentId,
                                                        'subject_id' => $objectId,
                                                        'scope_id' => $addedParentId,
                                                        'owner_id' => $userId,
                                                        'created_at' => 'NOW()',
                                                        'updated_at' => 'NOW()');
                        $result = insert("object_relations", $object);

                        $boundary = calculateCollectionBoundary($addedParentId);
                        $timespan = calculateCollectionTimespan($addedParentId);
                        HC_debugLog("boundary=".print_r($boundary, true));
                        HC_debugLog("timespan=".print_r($timespan, true));

                        //update the boundary of the collecton
                        $result = updateCollectionTimeBoundary($addedParentId, $boundary['ne_lat'],
                                                                $boundary['ne_lon'], $boundary['sw_lat'],
                                                                $boundary['sw_lon'], $timespan['minDateFrom'],
                                                                $timespan['maxDateTo'], "NOW()");
                }
             * 
			*/

			//HC_reportSuccess("Object updated successfully!");
			$response->addMessage(new ObjectUpdatedMessage($id));
		}
		catch (MysqlException $e) {
			$response->addError(new DatabaseFailureException($e));
			//$message = 'Caught exception: '.$e->getMessage();
			//HC_errorLog($message);
			//$message = "Object updated failed! Database exception occurred.";
			//HC_reportError($message);
		}
		catch (Exception $e) {
			$response->addError(new DatabaseFailureException($e));
			$message = 'Caught exception: '.$e->getMessage();
			HC_errorLog($message);
			$message = "Object updated failed! ".$message;
			HC_reportError($message);
		}
		parent::update($request, $response);
	}

	/**
	 * Marks an object as deleted and removes all its relationships from the database.
	 * To simply remove an object from a collection, use the appropriate
	 * CollectionManager method.
	 *
	 * @param Request $query
	 * @param Response $response
	 */
	public static function delete (Request $request) {
		$query = $request->query;
		$objectId = (int)$query->itemId;

		if (!$request->user) {
			throw new UserNotAuthenticated("Object.delete");
		}
		
		if (!$request->user->checkPrivlieges("delete", $objectId)) {
			throw new InsufficientPriviledges($request->user, 'Object.delete', $objectId);
		}
		//$objectId = $request->requestData['objectId'];
		$db = database::getInstance();
		//$objectId = mysql_real_escape_string($request->itemId);

		//print $objectId;
		//$parentId = $request->requestData['parent_id'];
		$result = $db->preparedQuery("SELECT object_id FROM object_relations WHERE subject_id = ? ", array ('type' => 'i', $objectId));
		if ($result) {
			$result = $db->preparedGetRows();
		} else {
			//print $db->getError();
		}
		//print_r ($result);

		//do not delete object from database, remove object relation and mark the object as "deleted" if all relations are gone
		//$allQueryOk = deleteObject($objectId, $parentId);
		$allQueryOk = TRUE;

		//do not update Public collection's boundary and time because of performance issues
		foreach ($result as $row) {
			$parentId = (int)$row['object_id'];
			$allQueryOk = deleteObject($objectId, $parentId);
			//print "Object deleted.";
			if ($parentId != HC_PUBLIC_COLLECTIONS_ID) {
				/*update the boundary of the collecton*/
				$boundary = calculateCollectionBoundary($parentId);
				$timespan = calculateCollectionTimespan($parentId);
				//print "Bounds calculated.";
				HC_debugLog("boundary=".print_r($boundary, true));
				HC_debugLog("timespan=".print_r($timespan, true));

				$object['ne_lat'] = $boundary['ne_lat'];
				$object['ne_lon'] = $boundary['ne_lon'];
				$object['sw_lat'] = $boundary['sw_lat'];
				$object['sw_lon'] = $boundary['sw_lon'];
				$object['date_from'] = $timespan['minDateFrom'];
				$object['date_to'] = $timespan['maxDateTo'];
				$object['updated_at'] = "NOW()";
				$allQueryOk = update("object_mappings", $object, "object_id='$parentId'");
				//print "Relation with collection $parentId erased.";
			}
			//else print "Public collections found. Skipping/";
		}
		// Now mark it as deleted
		$db->preparedQuery ("UPDATE objects SET object_state_id = 5 WHERE id = ?", array ('type' => 'i', $objectId));

		if ($allQueryOk)
		//HC_reportSuccess("Delete object success!");
			return new DeletedMessage($objectId);
		else
			HC_reportError("Delete object error!");
		parent::delete($query, $response, $objectId);
	} // end public function delete
}
?>