<?php

namespace HyperCities\Provider\ItemManagement;
use HyperCities\Provider\Request;
use HyperCities\Provider\DatabaseError;
use HyperCities\Provider\Log;
use HyperCities\Provider\Authentication\AuthenticationManager;
use HyperCities\Provider\Authentication\UserNotAuthenticated;
use HyperCities\Provider\Authentication\UserNotFound;
use HyperCities\Provider\Models\Collection;
use \database;
/**
 * Manages collections.
 *
 * @author David Shepard
 */

class UpdateQuery {
	private $allowedValues = array(),
		$columnCorrespondences = array(),
		$valueTypes = array(),
		$values = array(),
		$tables = array();

	public function __construct () {
		
	}

	public function setAllowedValue ($value, $column, $type) {
		$this->allowedValues[] = $value;
		$this->columnCorrespondences[$value] = $column;
		$this->valueTypes[$value] = $type;
	}

	public function addTable ($table) {
	    if (!\in_array($table, $this->tables)) {
		$this->tables[] = $table;
	    }
	}

	public function setValues (array $values) {
		foreach ($this->allowedValues as $value) {
			if (isset($values[$value]) && $values[$value]) {
				$this->values[$value] = &$values[$value];
			}
		}
	}
	
	public function getQuery () {
		$keys = array();
		foreach (array_keys($this->values) as $key) {
			$keys[] = $this->columnCorrespondences[$key] ." = ? ";
		}
		return implode (", ", $keys);
	}

	public function getValueTypes () {
		$types = '';
		foreach ($this->values as $key => $value) {
			$types .= $this->valueTypes[$key];
		}
		return $types;
	}

	public function getParameters () {
		return array_values ($this->values);
	}
}

class CollectionManager extends ModelManager {

	static $name = 'Collection';

	public function __construct () {
		parent::__construct();
	}

	/**
	 *
	 * @param Request $request
	 * @return <type>
	 * @throws InsufficientPrvileges
	 */
	public static function create (Request $request) {
		$query = $request->query;
		$user = $request->user;
		if (!$user) {
			Log::write("User attempted to create collection without logging in.");
			throw new UserNotAuthenticated("Collection.create");
		}
		parent::requires(array ('title', 'descripton', 'state', 'addTo'), $query->requestData);
		//print "Creating collection";


		//print "Trying to create collection ...";
		$title       = $query->requestData['title'];
		$description = $query->requestData['description'];
		$creator     = $query->requestData['creator'];
		$copyright   = $query->requestData['copyright'];
		$state       = $query->requestData['state'];
		$password    = (empty($query->requestData['password'])) ? NULL : md5($query->requestData['password']);
		$addTo       = explode(",", $query->requestData['addTo']);
		foreach ($addTo as $collection) {
			$user->checkPrivileges('add', $collection);
		}
		//print_r ($addTo);
		$createTime  = "NOW()";
		$kml         = '';
		$dateFrom    = NULL;
		$dateTo      = NULL;
		$neLat       = NULL;
		$neLon       = NULL;
		$swLat       = NULL;
		$swLon       = NULL;
		$view        = NULL;
		//$userId      = cServerSession::getUserId();
		$userId      = $request->user->id;


		try {
			$result = \insertCollection($title, $description, $creator, $copyright, $createTime, $userId,
					$kml, $dateFrom, $dateTo, $neLat, $neLon, $swLat, $swLon, $view,
					$password, $state);

			$collectionId = $result["collectionId"];
			Log::write("Creating collection returned collection ID $collectionId");
			foreach ($addTo as $parentColId) {
				$objectRelationId = \insertObjectRelations(array($collectionId), $parentColId, $userId, $createTime);
			}
		}
		catch (\MysqlException $ex) {
			Log::write("Creating collection caused database exception.".$ex);
			throw new DatabaseError($ex->__toString());
			return;
		}
		parent::create($query, $collectionId);
		Log::write("Creating collection was successful.");
		return new CreatedMessage('collection', 'ID #'.$collectionId.' returned.', $collectionId);
	}

	/**
	 * Update existing collection.
	 *
	 * @param Request $request
	 * @param HCWSResponse $response
	 * @throws UserNotLoggedIn, InsufficicentPriviledges
	 *
	 */
	public static function update (Request $request) {
		Log::write("Request to update collection.");
		$query = $request->query;
		$user = $request->user;
		$db = database::getInstance();
		if (!$user) {
			throw new UserNotAuthenticated("Collection.update");
		}
		if (!$user->checkPrivileges("update", $query->requestData['id'])) {
			Log::writeUser($user, "Insufficient Prvileges to update collection $query->requestData[id].");
			throw new InsufficientPrivileges($query->itemId, "update", "User is not allowed to update this object.");
		}
		$userId = $request->user->id;

		$collectionId = $query->requestData['id'];
		$addTo = explode(',', $query->requestData['addTo']);
		//$oldAddTo = explode(',', $target->requestData['oldAddTo']);
		//$oldAddTo = self::getParentsOfObject($collectionId);
		//$removeFrom = explode(',', $query->requestData['removeFrom']);
		//$addedCollections = array_diff($addTo, $oldAddTo);
		//$deletedCollections = array_diff($oldAddTo, $addTo);
		//$deletedCollections = array_merge($deletedCollections, $removeFrom);
		//HC_debugLog("addedCollections=".print_r($addedCollections, true));
		//HC_debugLog("deletedCollections=".print_r($deletedCollections, true));

		if (isset($query->requestData['userIdArray'])) {
			$userIdArray = explode(',', $query->requestData['userIdArray']);
			$accessRightIdArray = explode(',', $query->requestData['accessRightIdArray']);
			$accessRightArray = array_combine($userIdArray, $accessRightIdArray);
		}

		$updateQuery = new UpdateQuery();
		$updateQuery->setAllowedValue('title', 'title', 's');
		$updateQuery->setAllowedValue('description', 'description', 's');
		$updateQuery->setAllowedValue('creator', 'creator', 's');
		$updateQuery->setAllowedValue('cpy', 'copyright', 's');
		$updateQuery->setAllowedValue('password', 'password', 's');
		$updateQuery->setAllowedValue('state', 'object_state_id', 's');
		$updateQuery->setValues($query->requestData);
		
		//$object['copyright'] = $target->requestData['copyright'];
		try {
			/*if (empty($query->requestData['addTo'])) {
				//$addTo = NULL;
				throw new Exception("Please select at least one collection to which this collection will be added.");
			}

			if (checkCircular($collectionId, $addTo)) {
				throw new Exception("Circular reference occurs.");
			}*/
			$params = array('type' => $updateQuery->getValueTypes().'i');
			foreach ($updateQuery->getParameters() as $param) {
				$params[] = &$param;
			}
			$params[] = &$collectionId;
			$result = $db->preparedQuery(
				"UPDATE objects SET ".$updateQuery->getQuery().' WHERE id = ?',
				$params
			);

			if (!$result) {
				throw new DatabaseError("Internal database error.");
				Log::write("Database Error: ".$db->getError());
			}
			//$result = update("objects", $object, "`id` = $collectionId");

			//update object_relation table
			/*foreach ($deletedCollections as $deletedParentId) {
				$result = delete("object_relations", "`object_id` = $deletedParentId and `subject_id`=$collectionId");
			}*/

			/*second find the new selected collection id which is selected in client side but not in DB*/
			/*foreach($addedCollections as $addedParentId) {
				$object = array('object_id' => $addedParentId,
						'subject_id' => $collectionId,
						'scope_id' => $addedParentId,
						'owner_id' => $userId,
						'created_at' => 'NOW()',
						'updated_at' => 'NOW()');
				$result = insert("object_relations", $object);

				$object = updateColTimeBoundBottomUp($addedParentId);
				HC_debugLog("boundary and timespan = ".print_r($object, true));
				/*
                        $boundary = calculateCollectionBoundary($addedParentId);
                        $timespan = calculateCollectionTimespan($addedParentId);
                        HC_debugLog("boundary=".print_r($boundary, true));
                        HC_debugLog("timespan=".print_r($timespan, true));

                        $result = updateCollectionTimeBoundary($addedParentId, $boundary['ne_lat'],
                                                                                                $boundary['ne_lon'], $boundary['sw_lat'],
                                                                                                $boundary['sw_lon'], $timespan['minDateFrom'],
                                                                                                $timespan['maxDateTo'], "NOW()");
				*/
			/*}

			if (!empty($accessRightArray)) {
				updatePrivilege($collectionId, $accessRightArray);
			}*/

			//HC_reportSuccess("Collection is updated successfully!");
		}
		catch (\MysqlException $e) {
			$message = 'Caught exception: '.$e->getMessage();
			Log::write($message);
			return new DatabaseError($message);
		}
		catch (\Exception $e) {
			$message = 'Caught exception: '.$e->getMessage();
			Log::write($message);
			return new DatabaseError($message);
		}
		return new ChangedMessage('Collection', 'collection.create', 'Collection updated');
	}

	/**
	 * Marks a collection as deleted and removes all its relationships from the database.
	 * To simply remove a collection from a collection, use the appropriate
	 * HCWSCollectionManager method.
	 *
	 * PLEASE NOTE: This does not delete objects in a collection. These must be
	 * deleted individually.
	 *
	 * @param Request $request
	 * @param HCWSResponse $response
	 */
	public static function delete (Request $request) {
		$query = $request->query;
		$objectId = (int)$query->itemId;
		$user = $request->user;
		if ($objectId == NULL) {
			// Get all collections
			return;
		}
		if (!$user) {
			throw new UserNotAuthenticated("Collection.delete");
		}
		if (!$user->checkPriviledges('delete', $objectId)) {
			throw new InsufficientPriviledges($user, 'Collection.delete', $objectId);
		}
		//$objectId = $request->requestData['objectId'];
		$db = database::getInstance();
		//$objectId = mysql_real_escape_string($request->itemId);

		//print $objectId;
		//$parentId = $request->requestData['parent_id'];
		$result = $db->preparedQuery("SELECT object_id FROM object_relations WHERE subject_id = ? ", array ('type' => 'i', $query->itemId));
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
			$allQueryOk = deleteCollection($objectId, $parentId);
			//print "Object deleted.";
			if ($parentId != HC_PUBLIC_COLLECTIONS_ID) {
				/*update the boundary of the collecton*/
				$boundary = calculateCollectionBoundary($parentId);
				$timespan = calculateCollectionTimespan($parentId);
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
			$response->addMessage (new ObjectDeletedMessage($objectId));
		else
			HC_reportError("Delete object error!");
		parent::delete($query, $response, $objectId);
	} // end public function delete

	public static function handle (Request $request) {
		$return = null;
		if (count($request->url) == 2) {
			if ($request->filename == 'roots') {
				$return = self::catalogRoots($request->query);
			} elseif ($request->url[0] == 'users') {
				$return = self::catalogByUser($request);
			} else {
				if (is_numeric($request->query->itemId)) $return = parent::handle ($request, get_class());
				else throw new \HyperCities\Provider\InvalidURL("Collection identifier must be a number.");
			}
		}
		elseif (count($request->url) == 3) {
			if ($request->filename == 'objects') {
				if ($request->method == 'POST') {
					$return = self::addObject($request->query->requestData['object_id'], $request->query->itemId, $response);
				}
				if ($request->method == 'GET') {
					$request->query->requestData['parent_id'] = $request->query->itemId;
					$request->query->itemType = "object";
					$request->query->hasParentCriteria = True;
					$return = PlacemarkManager::catalog($request);
				}
				if ($request->method == 'DELETE') {
					$return = self::removeObjectFromCollection($target, $request->query->requestData);
				}
			} elseif ($request->url[0] == 'users') {
				$return = self::catalogByUser($request->query);
			} elseif ($request->url[0] == 'collections') {
				if ($request->method == 'POST') {
					$return = self::addObject($request->query->requestData['object_id'], $request->query->itemId, $response);
				}
				if ($request->method == 'GET') {

					$request->query->requestData['parent_id'] = $request->query->itemId;
					$request->query->itemType = "object";
					$request->query->requestData['object_type_id'] = 2;
					$request->query->hasParentCriteria = True;
					$return = PlacemarkManager::catalog($request->query);
				}
				if ($request->method == 'DELETE') {
					$return = self::removeObjectFromCollection($target, $request->query->requestData);
				}
			}
		} elseif (count($request->url) == 4) { // /collections/12345/objects/1
			if ($request->url[2] == 'objects') {
				if ($request->method == 'POST') {
					$return = self::updateOrder($request);
				}
			}
		} else {
			// The get_class() is necessary because self in PHP always refers to
			// the current class. Thus, it does not call static child class methods from
			// the parent.
			$return = parent::handle ($request, get_class());
		}
		return $return;
	}

	public static function catalog (Request $request) {
		$request->query->requestData['object_type_id'] = 2;
		return PlacemarkManager::catalog($request);
	}

	public static function generateCollectionList (Request $request) {
		/**
		 * Expects:
		 *	Hierarchical list of collections, e.g.:
		 *		[ {"id": (string), "ch" : [] }, ]
		 */
		$collectionHierarchy = json_decode($request->query->requestData['collectionList']);

	}

	public static function catalogRoots (Request $target) {
		global $HC_BASE_COLLECTIONS;
		$items = array();
		$docNode = $response->setDocumentNode($target->itemId);
		foreach ( $HC_BASE_COLLECTIONS as $collection) {
			// Count total children of collections
			$item = new Collection($collection['id']);
			$items[] = $item;
			$item->toXMLAt($docNode);
		}
		return $items;
	}

	public static function catalogByUser (Request $request) {
		$query = $request->query;
		$db = database::getInstance();
		$items = array();
		if (isset($query->requestData['creator'])) {
			$owner_data = $query->requestData['creator'];
		} elseif (isset($query->requestData['creator_eppn'])) {
			$owner_data = $query->requestData['creator_eppn'];
		}
		if (is_numeric($owner_data)) {
			$user_id = $owner_data;
		} else {
			try {
			$user = AuthenticationManager::getUserByEmail($owner_data);
			$user_id = $user->id;
			} catch (UserNotFound $ex) {
				throw new ItemNotFound("No objects found.");
			}
		}
		// get from database
		$query = "SELECT o.id, o.title, o.description, o.copyright,"
				." o.owner_id, o.creator, om.ne_lat, om.ne_lon, om.sw_lat,"
				." om.sw_lon, o.object_state_id, o.object_type_id,"
				." om.kml, u.nickname, om.date_from, om.dateFrom_isBC,"
				." om.date_to, om.dateTo_isBC, om.basemap_id "
				." FROM objects AS o, object_mappings AS om, users AS u "
				." WHERE o.owner_id = ? AND o.owner_id = u.id AND o.id = om.object_id "
				." AND o.object_state_id != " . HC_OBJECT_DELETED
				." AND o.object_type_id = " . HC_OBJECT_TYPE_COLLECTION. " ;";
		$result = $db->preparedQuery($query, array('type' => 'i', &$user_id));
		$result = $db->preparedGetRows();
		foreach ($result as $row) {
			$items[] = Collection::buildFromArray($row);
		}
		foreach ($items as $item) {
			//$item->toXMLAt($docNode);
		}
		return $items;
	}

	public static function display (Request $request) {
		$query = $request->query;
		// Get collection
		$db = database::getInstance();
		//print "Displaying collection";
		//print_r ($target);
		$collection = new Collection($query->itemId);
		//print_r($collection);

		if ($query->hasGeoTemporalCriteria) {
			$swLat = $query->requestData['sw_lat'];
			$swLng = $query->requestData['sw_lon'];
			$neLat = $query->requestData['ne_lat'];
			$neLng = $query->requestData['ne_lon'];
			$dateFrom = $query->requestData['dateFrom'];
			$dateFromIsBC = $query->requestData['dateFromIsBC'];
			$dateTo = $query->requestData['dateTo'];
			$dateToIsBC = $query->requestData['dateToIsBC'];


			foreach (Collection::getCollectionByIdBound($collection->id, $swLat, $swLng, $neLat, $neLng, $dateFromIsBC, $dateFrom, $dateToIsBC, $dateTo) as $item) {
				switch ($item['object_type_id'] ) {
					case 3:
						$child = HCPlacemark::buildFromArray($item);
						break;
					case 2:
						$child = Collection::buildFromArray($item);
						break;
					case 4:
						$child = Collection::buildFromArray($item);
						break;
				}
				$collection->addChild($child);
			}
		}
		else {
			$collection->getChildren();
		}
		//$docNode = $response->setDocumentNode($target->itemId);
		//$folderNode = $docNode->createFolderNode($target->itemId, $row['title'], $row['description'], 1);
		//print json_encode($collection);
		//$collection->toXMLAt($docNode);
		return $collection;
		/*

        // Step 0: Get collection information

        $query_str = "SELECT o.id, o.title, o.description, o.copyright, o.owner_id, o.creator, "
                ."om.ne_lat, om.ne_lon, om.sw_lat, om.sw_lon, o.object_state_id, o.object_type_id, om.kml, "
                ."u.nickname, om.date_from, om.dateFrom_isBC, om.date_to, om.dateTo_isBC, om.basemap_id "
                ."FROM objects AS o, object_mappings AS om, users AS u "
                ."WHERE o.id = ? AND o.owner_id = u.id AND o.id = om.object_id "
                ."AND o.object_state_id != " . HC_OBJECT_DELETED;

        $params = array ('type' => 'i', $target->itemId);
        $result = $db->preparedQuery($query_str, $params);
        if (!$result) {

        }
        $rows = $db->preparedGetRows();
        if (sizeof($rows) == 0) {
            // Add message -- no collection
        }
        $row = $rows[0];

        $docNode = $response->setDocumentNode($target->itemId);
        $folderNode = $docNode->createFolderNode($target->itemId, $row['title'], $row['description'], 1);

        // Step 1 : Get children information of collection $cid
        $params = array('type'=>'i', $target->itemId);

        $query_str = "SELECT DISTINCT(om.object_id) AS id, "
                ."om.kml, om.ne_lat, om.ne_lon, om.sw_lat, om.sw_lon, o.object_state_id, "
                ."om.date_from, om.dateFrom_isBC, om.date_to, om.dateTo_isBC, "
                ."o.title, o.creator, o.description, o.owner_id, o.object_type_id, "
                //."oc.content, obr.id AS order_id, obr.order "
                ."obr.id AS order_id, obr.order "
                ."FROM object_mappings AS om, object_relations AS obr, objects AS o "
                //."LEFT JOIN contents AS oc ON o.content_id = oc.id "
                ."WHERE o.id = om.object_id AND o.id = obr.subject_id "
                ."AND obr.object_id = ? "
                ."AND o.object_state_id != ". HC_OBJECT_DELETED . " "   // Not being deleted
                ."ORDER BY obr.order ASC, obr.subject_id ASC";

//		HC_debugLog($query_str);
        $result = $db->preparedQuery($query_str, $params);

        if (!$result) {
            HC_errorLog("Fail to get collection's children : " . $db->getError());
            HC_reportError("Fail to get collection's children : Database Error");
        }

        $rows = $db->preparedGetRows();
//		HC_debugLog(var_export($rows,true));

        // If the collection $cid has no children, just return null
        if (sizeof($rows) == 0) {
            return null;
        }

        // Store children information in $collectionArray
        $collectionIdList = array();
        $collectionArray = array();
        foreach ($rows as $index => $item) {
            $collectionIdList[] = $item['id'];
            $collectionArray[$item['id']] = $item;
        }

        // Step 2 : Count Total Children of each children collection, if any
        $query_str = "SELECT obr.object_id AS id, COUNT(*) AS total "
                ."FROM objects AS o, object_relations AS obr "
                ."WHERE o.id = obr.object_id "
                ."AND o.object_state_id != ". HC_OBJECT_DELETED . " "
                ."AND obr.object_id IN (".implode(",", $collectionIdList).") ";

        $query_str .= "GROUP BY obr.object_id";
//		HC_debugLog($query_str);

        $result = $db->query($query_str);

        if (!$result) {
            HC_errorLog("Fail to count public collections : " . $db->getError());
            HC_reportError("Fail to count public collections : Database Error");
        }

        $rows = $db->getRows();
//		HC_debugLog(var_export($rows,true));

        $totalChildrenArray = array();
        foreach ($rows as $index => $item) {
            $totalChildrenArray[$item['id']] = $item['total'];
        }

        foreach ($collectionArray as $index => $item) {
            $totalChildren = $totalChildrenArray[$index];

            if ( empty($totalChildrenArray[$index]) ) {
                $totalChildren = 0;
            }

            $collectionArray[$index]['totalChildren'] = $totalChildren;
        }

        foreach ($collectionArray as $index => $item) {
            if ($item['object_type_id'] == HC_OBJECT_TYPE_COLLECTION) {
                print_r ($item);
            }
        }*/
	}

	/**
	 * Add an object to a collection.
	 *
	 * @param int $objectId Object Id
	 * @param int $collectionId Collection Id
	 * @param Request $query Target from original request
	 * @param HCWSResponse $response Response object
	 * @return void
	 */
	public static function addObject ($objectId, $collectionId, Request $request) {
		$query = $request->query;
		if (!HCWSUserManager::checkIfUserLoggedIn()) {
			throw new UserNotAuthenticated("Collection.addObject");
		}
		if (!HCWSUserManager::checkPriviledgesForAction('add', $collectionId)) {
			throw new InsufficientPriviledges(HCWSUserManager::$currentUser, 'Collection.addObject', $collectionId);
		}
		$db = database::getInstance();

		// Add object relation
		$objectRelationId = insertObjectRelations(array($objectId), $collectionId, HCWSUserManager::$currentUser->id, 'NOW()');
		// Recalculate collection bounds
		updateCollectionTimeBoundary($collectionId, $query->requestData['ne_lat'],$query->requestData['ne_lon'],
				$query->requestData['sw_lat'], $query->requestData['sw_lon'],
				$query->requestData['start'], $query->requestData['end'],
				'NOW()');
		//  Get the collection's bounds
		//  Check if the object's bounds are within the bounds; if not, update them

		return;
		// if object data is specified, create a new collection
		if (is_array($objectId)) { // If what arrives is a request that is external, this is HCWSRequest::requestData
			/*if (isset($object->filerCriteria['object_id'])) {
                // If the ID has been specified, we assume that the object already exists
                self::addObjectToCollection($object->requestData['object_id'], $collectionId, $response);
            } else { // Otherwise, create the object
                $objectId = HCWSObjectManager::create($object, $response);
                
                $objectRelationId = insertObjectRelations(array($object), $otherCollectionId, $userId, $createTime);
                updateCollectionTimeBoundary($otherCollectionId, $ne_lat, $ne_lon, $sw_lat, $sw_lon,
                                                                    $minDateFrom, $maxDateTo, $createTime);
            }*/
		} // end if (is_array ($object)
		else { // If the number is specified
			try {
				//$result = $db->preparedQuery ("SELECT ne_lat, ne_lon, sw_lat, sw_lon, date_from, dateFrom_isBC, date_to, dateTo_isBC FROM ")
				// NOTE: double-check that these relations don't already exist
				if (!$db->preparedQuery("SELECT id FROM object_relations WHERE object_id = $collectionId AND subject_id = $objectId ")) {
					$result = insertObjectRelations(
							array ($objectId), $collectionId, HCWSUserManager::$currentUser->id, "NOW()"
					);
					calculateCollectionBoundaryR($collectionId, true);
					calculateCollectionTimespanR($collectionId, true);
				}
				/*
                $result = $db->preparedQuery("SELECT ne_lat, ne_lon, sw_lat, sw_lon, date_from, dateFrom_isBC, date_to, dateTo_isBC from object_mappings WHERE object_id = ?", array('type' => 'i', $object->id));
                if ($result) {
                    $result = $db->preparedGetRows();
                }
                $lats = array();
                $lngs = array();
                $times = array();
                foreach ($result as $row) {
                    $lats[] = $row['ne_lat'];
                    $lats[] = $row['sw_lat'];
                    $lngs[] = $row['ne_lon'];
                    $lngs[] = $row['sw_lon'];
                    $times[] = ($row['dateFrom_isBC'] == 1) ? '-'.$row['date_from'] : $row['date_from'];
                    $times[] = ($row['dateTo_isBC'] == 1) ? '-'.$row['date_to'] : $row['date_to'];
                }
                $maxlat = max($lats);
                $minlat = min($lats);
                $minlng = min($lngs);
                $maxlng = max($lngs);
				*/
			} catch (MysqlException $ex) {

			} // end try/catch
			$response->addMessage(new ObjectUpdatedMessage($objectId));
		} // end else
	}

	public static function removeObjects (array $object, $collectionId) {

	}

	public static function getParentsOfObject ($objectId) {
		$db = database::getInstance();
		$query = "SELECT object_id FROM object_relations WHERE subject_id = ".(int)$objectId;
		$results = $db->query($query);
		//if (!$results) $results = $db->getRows();
		$results = $db->getRows();
		$ids = array();
		foreach ($results as $row) {
			$ids[] = $row['object_id'];
		}
		return $ids;
	}

	public static function removeObjectFromCollection ($object, $collectionId, $request) {
		$db = database::getInstance();
		$query = "DELETE object_id FROM object_relations WHERE subject_id = ? AND object_id = ?";
		$params = array ('type' => 'ii', &$object, &$collectionId);
		$result = $db->preparedQuery($query, $params);
		return new ObjectRemovedMessage ($object, $collectionId);
	}

	public static function updateOrder (Request $request) {
		$query = $request->query;
		parent::requires(array('order', 'orderId'), $query->requestData);
		parent::requireLogin($request);
		
		$collectionId = $query->itemId;
		$objectId = $query->requestData['objectId'];
		$request->user->checkPrivilegesForAction($collectionId, "edit");
		// check that object is in collection
		$collectionId = $request->query->itemId;
		$objectId = $request->query->requestData['objectId'];

		$order = $query->requestData['order'];
		$orderId = $query->requestData['orderId'];

		$query_str = "UPDATE `object_relations` SET `order` = $order, updated_at = NOW() "
					."WHERE `id` = $orderId";

		$result = $db->query($query_str);

		// Make sure we get single record
		if (!$result) {
			throw new ItemNotFound("Could not update order of object $objectId in collection $collectionId");
		}
		else return new OrderUpdatedMessage($objectId, "Object updated.");
	}
}
?>