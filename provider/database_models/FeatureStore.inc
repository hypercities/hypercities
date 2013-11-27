<?php

namespace HyperCities\Provider\ItemManagement;

use HyperCities\Provider\Log;
use HyperCities\Provider\NotFoundError;
use HyperCities\Provider\Request;
use HyperCities\Provider\GeoPt;
use HyperCities\Provider\Authentication\UserNotFound;

/**
 * Class for managing database access of placemarks and collections.
 *
 * @author David Shepard
 * @copyright Copyright 2010, Regents of the University of California
 */
class FeatureStore extends DataStore {

	private static $instance = NULL;
	private $feature_ids = array(),
			$collection_ids = array();
	
	public function __construct() {
		parent::__construct();
		$this->linkedStores = array (
			'bookmarks' => new RelatedStore(BookStore::getInstance(), "book_objects", 
					"object_id", "book_id",  'HyperCities\Provider\ItemManagement\LinkedBook'),
		);
	}

	/**
	 * Singleton constructor
	 * 
	 * @return FeatureStore.
	 */
	public static function getInstance() {
		if (!self::$instance) {
			self::$instance = new self();
			//RichMediaObject::setStore(self::$instance);
		}
		return self::$instance;
	}

	protected function load ($id) {
		if (!is_numeric($id)) {
			switch ($id) {
				case 'PUBLIC_COLLECTIONS':
				case 'PUBLIC':
					$id = \HC_PUBLIC_COLLECTIONS_ID;
					break;
				case 'FEATURED_COLLECTIONS':
				case 'FEATURED':
					$id = \HC_FEATURED_COLLECTIONS_ID;
					break;
				case 'CLASS_COLLECTIONS':
				case 'CLASS':
					$id = \HC_CLASSES_COLLECTIONS_ID;
					break;
			}
		}
		if (isset($this->objects[$id])) {
			$object = $this->objects[$id];
		} elseif (self::$instance != $this && isset(self::$instance->objects[$id])) {
			$object = self::$instance->objects[$id];
		} else {
			$object = $this->doSearch(array ("objectId" => $id));
			$object = $object[0];
		}
		return $object;
	}
	
	public function addObjects($data) {
		$returnable = NULL;
		if (is_array($data)) {
			$returnable = array();
			foreach ($data as $item) {
				if (is_array($item)) {
					$returnable[] = $this->autoconstruct_models($item);
				} else {
					$returnable[] = $this->autoconstruct_models(array('id' => $item, 'objectType' => '3'));
				}
			}
		} else { // if it's an ID
			$returnable = $this->autoconstruct_models(array('id' => $item, 'objectType' => '3'));
		}
		return $returnable;
	}

	private function autoconstruct_models($data) {
		$model = NULL;
		switch ($data['object_type_id']) {
			case '2':
				$this->collection_ids[] = (int) $data['id'];
				$model = new Collection($data);
				break;
			case '3':
			case '4':
			case '5':
			case '6':
			case '7':
				$this->feature_ids[] = (int) $data['id'];
				$model = new RichMediaObject($data);
				break;
		}
		$this->objects[$data['id']] = $model;
		return $model;
	}

	protected function processGTBounds(array $data, SelectQuery $query, array &$params, $mappingTable) {
		if (@$data['neLat']) {
			//Log::write("Bounds params found:" . print_r($data, TRUE));
			$params['type'] .= 'dddd';
			$params[] = &$data['swLat'];
			$params[] = &$data['swLon'];
			$params[] = &$data['neLat'];
			$params[] = &$data['neLon'];
			$north = $data['neLat'];
			$south = $data['swLat'];
			$east = $data['neLon'];
			$west = $data['swLon'];
			$query->addCondition(" AND NOT (om.sw_lat >= ? OR om.ne_lat <= ? ");
			if ($east >= $west) {
				$query->addCondition("OR om.sw_lon >= ? OR om.ne_lon <= ?)");
			}
			// Case 2) Bounding Box acrossing longitude 180 to -180 ($east < $west)
			else {
				$query->addCondition(") AND (( om.sw_lon > -180 AND om.sw_lon < ? ) "
						. "OR ( om.ne_lon < 180 AND om.ne_lon > ? )) ");
			}
		}
		if (@$data['bbox']) {
			// BBOX is NESW
			$query->addCondition(" AND NOT (om.sw_lat >= ? OR om.ne_lat <= ? OR om.sw_lon >= ? OR om.ne_lon <= ?)");
			$params['type'] .= 'dddd';
			$bbox_coordinates = explode(',', $data['bbox']);
			$params[] = &$bbox_coordinates[2];
			$params[] = &$bbox_coordinates[3];
			$params[] = &$bbox_coordinates[0];
			$params[] = &$bbox_coordinates[1];
		}

		if (isset($data['start']) && isset($data['end'])) {
			$start = NULL;
			$end = NULL;
			$startIsBC = 0;
			$endIsBC = 0;
			if ($data['start'] instanceof DateTime) {
				$start = $data['start']->format(ATOM_DATE);
			} else {
				$start = $data['start'];
			}
			if (substr($start, 0, 1) == '-') {
				$startIsBC = 1;
				$start = substr($start, 1);
			}
			if ($data['end'] instanceof DateTime) {
				$end = $data['end']->format(ATOM_DATE);
			} else {
				$end = $data['end'];
			}
			if (substr($end, 0, 1) == '-') {
				$endIsBC = 1;
				$end = substr($end, 1);
			}
			// TODO: figure out isBC
			$query->addCondition("AND NOT (dateLarger(om.dateFrom_isBC, om.date_from, ?, ?) "
					. "OR dateLarger(?, ?, om.dateTo_isBC, om.date_to)) ");
			$params['type'] .= 'isis';
			$params[] = $endIsBC;
			$params[] = $end;
			$params[] = $startIsBC;
			$params[] = $start;
		}
	}

	public function loadAll() {
		// first, get object metadata
		$ids_to_load = array_diff(array_merge($this->feature_ids, $this->collection_ids), $this->loadedObjects);
		$query = 'SELECT id, title, description, creator, owner_id, content_id, external_permissions_id, '
				. ' object_type_id, object_state_id, copyright, info_bubble_id, info_bubble_state,'
				. ' map_type '
				. ' FROM objects WHERE id';
		if ($ids_to_load == array()) {
			return;
		}
		if (count($ids_to_load) > 1) {
			$query .= ' IN ('. implode(',', $ids_to_load) . ")";
		} else {
			$query .= ' = '.(int)$ids_to_load[0];
		}
		$result = $this->db->query($query);
		// then put into each object
		try {
			$records = $this->db->getRows();
		} catch (\MissingResultException $ex) {
			throw new ItemNotFound("Could not find any objects based on supplied criteria.");
		}
		foreach ($records as $row) {
			$this->objects[$row['id']]->updateWithArray($row);
		}

		// get privilege
		$query = "SELECT object_id, user_id, access_right_id FROM objects_users "
				."WHERE object_id";
		if (count($ids_to_load) > 1) {
			$query .= ' IN ('. implode(',', $ids_to_load) . ")";
		} else {
			$query .= ' = '.(int)$ids_to_load[0];
		}
		$result = $this->db->query($query);
		// then put into each object
		try {
			$records = $this->db->getRows();
		} catch (\MissingResultException $ex) {
			throw new ItemNotFound("Could not find any objects based on supplied criteria.");
		}
		foreach ($records as $row) {
			$this->objects[$row['object_id']]->addCoauthors($row);
		}

		// get mappings
		$query = "SELECT id, kml, ne_lat, ne_lon, sw_lat, sw_lon, date_from,"
				. ' dateFrom_isBC, date_to, dateTo_isBC, object_id, marker_style_id,'
				. ' zoom, view FROM object_mappings WHERE object_id ';
		if (count($ids_to_load) > 1) {
			$safe_ids = array_filter($ids_to_load, function ($item) {
				if (is_numeric ($item)) return TRUE;
				else return false;
			});
			$query .= ' IN ('. implode(',', $safe_ids) . ")";
		} else {
			$query .= ' = '.(int) $ids_to_load[0];
		}
		$result = $this->db->query($query);
		try {
			$records = $this->db->getRows();
		} catch (\MissingResultException $ex) {
			throw new ItemNotFound("Could not find any objects based on supplied criteria.");
		}
		$mapping_obj_ids = array();
		foreach ($records as $record) {
			$mapping_obj_ids[$record['id']] = $record['object_id'];
			$this->objects[$record['object_id']]->addMapping(new Mapping($record));
		}
		$content_ids = array();
		foreach ($this->objects as $feature) {
			if (!$feature instanceof Collection && $feature->content != NULL && $feature->content->id != NULL) {
				$content_id = $feature->content->id;
			} else continue;
			$query = "SELECT c.content, o.id FROM contents c, objects o WHERE c.id = ? AND o.content_id = c.id";
			$contents = $this->query($query, array('type' => 'i', &$content_id));
				foreach ($contents as $content) {
					$this->objects[$content['id']]->content
							->updateWithArray($content);
			}
		}
		$content_ids = array();
		foreach ($this->objects as $feature) {
			if ($feature instanceof RichMediaObject && $feature->content_id) {
				$content_ids[] = $feature->content_id;
			}
		}
		$query = "SELECT c.content, o.id FROM contents c, objects o WHERE c.id IN (".implode(",", $content_ids).")";
		$contents = $this->query($query);
		if ($contents && count($contents) > 0) {
			foreach ($contents as $content) {
				$this->objects[$content['id']]->content->text = $content['content'];
			}
		}
		$query = "SELECT omgr.object_mapping_id, gr.* "
				." FROM object_mappings_geo_references omgr, geo_references gr "
				." WHERE object_mapping_id IN (".implode(',', array_keys($mapping_obj_ids)).")"
				." AND gr.id = omgr.geo_reference_id ";
		$result = $this->db->query($query);
		$result = $this->db->getRows();
		foreach ($result as $row) {
			$this->objects[$mapping_obj_ids[$row['object_mapping_id']]]->mapping->addGeoPt(new GeoPt($row));
		}

		// get total child count
		$query = "SELECT object_id, COUNT(*) as children FROM object_relations WHERE "
				." object_id IN (".implode(',', $ids_to_load).") AND object_state_id "
				." != 5 GROUP BY object_id";
		$this->db->query($query);
		$result = $this->db->getRows();

		foreach ($result as $row) {
			$this->objects[$row['object_id']]->totalChildren = $row['children'];
		}

        // get object's parents and positions
        $query = "SELECT id, subject_id, object_id, `order` FROM object_relations WHERE subject_id ";
        
        if (count($ids_to_load) > 1) { 
            $query .= " IN (".implode(",", $ids_to_load) . ")";
        } else {
            $query .= " = ".(int)$ids_to_load[0];
        }

        $result = $this->db->query($query);
        $result = $this->db->getRows();
        foreach ($result as $row) {
            $this->objects[$row['subject_id']]->parents[$row['object_id']] = (int)$row['id'];
        }

		foreach ($this->objects as $k => $object) {
			if (!\is_object($object)) Log::write("Non-object encountered, with id $k");
			else $object->loadMaps();
		}
		
		foreach ($this->linkedStores as $field => $store) {
			$linkedItems = $store->getLinked($ids_to_load);
			foreach ($linkedItems as $item) {
				array_push($this->objects[$item->objectId]->$field, $item);
			}
			$store->loadAll();
		}

		//$ms = MapStore::getInstance();
		//$ms->doSearch(array ('linkedTo' => implode(',', $this->feature_ids)));
		
		// TODO: get users related to each object
		// We don't need to do content here ...
		//"SELECT o.id, c.content FROM objects o, contents c where o.content_id = c.id AND c.id IN (" . implode(',' $content_ids) . ")";
		$this->loadedObjects = array_merge($this->feature_ids, $this->collection_ids, $this->loadedObjects);
	}

	/**
	 * Find objects or collections.
	 * 
	 * @param array $data
	 * @param boolean $deep
	 * @return array of results, or FALSE on finding nothing 
	 */
	public function doSearch(array $data, $deep = TRUE) {
		//$db = database::getInstance();
		//$data = $request;
		//Log::write ("Data: ".print_r ($data, TRUE));
		$firstConditional = TRUE;
		$query = new SelectQuery();
		$params = array('type' => '');
		//print_r ($data);
		$objectType = "";
		$data = array_merge($data, $this->constraints);
		/* foreach ($this->locks as $lock) {
		  Log::write("Operating under lock constraint: " . print_r($lock, TRUE));
		  $data = array_merge($data, $lock);
		  } */
		//$query->addFields("DISTINCT (o.id), o.object_type_id");
		$query->addFields("DISTINCT (o.id)", "o.object_type_id");
		$query->addTables('objects o');
		$query->addCondition(" o.title != 'My Collections' ");
		$firstConditional = FALSE;

		if (@$data['objectType'] == 'collections' || @$data['objectType'] == 'collection') {
			//Log::write("Received request to search for collections: " . print_r($data, TRUE));
			$query->addCondition(' AND o.object_type_id = 2 ');
			$firstConditional = FALSE;
		} else {
			//Log::write("Received request to search for objects: " . print_r($data, TRUE));
			switch (@$data['objectType']) {
				case 'collections':
					$objectType = 2;
					break;
				case 'placemark':
					$objectType = 3;
					break;
				case '3d placemark':
					$objectType = 4;
					break;
				// TODO: fill in
				default:
					if (is_int(@$data['objectType']))
						$objectType = $data['objectType'];
					break;
			}
			if ($objectType) {
				$query->addCondition(' o.object_type_id = ' . $objectType);
				$firstConditional = FALSE;
			}
		}

		// TODO:: base collection criteria
		// -- NOTE: do base collection criteria by doing global search and then
		// -- simply starting at this collection ID in constructing the return document.
		//
		// Looking for one object?
		// apply initial criteria
		// if a user is specified, check this user's permissions
		// general user search, e.g. looking for items created by a user
		if (isset($data['creator_eppn'])) {
			$this->db->preparedQuery("SELECT id, user_state_id FROM users users WHERE email = ?",
					array('type' => 's', &$data['creator_eppn']));
			$result = $this->db->preparedGetRows();
			/*$data['userId'] = $result[0]['id'];
			$data['userIsAdmin'] = FALSE;
			if ($result[0]['user_state_id'] == 11) {
				$data['userIsAdmin'] = TRUE;
				}*/
			if (count($result) != 1) {
			  throw new UserNotFound("Could not recognize supplied user.");
			}
			$query->addCondition(" AND o.owner_id = ? ");
			$params['type'] .= 'i';
			$params[] = &$result[0]['id'];
			$firstConditional = FALSE;
		}
		elseif (@$data['userId']) {
			$cond = '';
			if (!$firstConditional)
				$cond = 'AND ';
			$query->addCondition("$cond o.owner_id = ?");
			$params['type'] .= 'i';
			$params[] = &$data['userId'];
			if ($this->constraints['user'] == $data['userId'] || $this->constraints['userIsAdmin']) {
				// Show all public items or protected items because the user is not an administrator
				$query->addCondition(" OR (o.object_state_id = 1 OR o.object_state_id = 2)");
				$firstConditional = FALSE;
			}
		} else {
			if (!@$this->constraints['userIsAdmin']) {
				if (@$this->constraints['userId']) {
					if ($firstConditional)
						if ($data['objectType'] == 'maps') {
							$query->addCondition("AND (m.owner_id = ? OR (mp.map_state_id = 1 OR mp.map_state_id = 2))");
						} else {
							$query->addCondition("AND (o.owner_id = ? OR (o.object_state_id = 1 OR o.object_state_id = 2))");
						}
					$params['type'] .= 'i';
					$params[] = &$this->constraints['user'];
				} else {
					$cond = '';
					if (!$firstConditional) $cond = 'AND ';
						$query->addCondition("$cond (o.object_state_id = 1 OR o.object_state_id = 2)");
				}
			}
		}
		if (@$data['objectId']) {
			if (strpos($data['objectId'], ',') !== FALSE) {
				//$query->addCondition(" AND o.id IN (?". str_repeat(',?', substr_count($data['objectId'], ',')).")");
				$temp_ids = array();
				foreach (explode(',', $data['objectId']) as $id) {
					$temp_ids[] .= (int) $id;
				}
				$query->addCondition(" AND o.id IN (" . implode(',', $temp_ids) . ")");
				// The reason for the preceeding bizzare construct:
				// mysqli_bind_params() (which database::preparedQuery() uses
				// requires references, not values. References must have something to point to, and
				// there isn't another way to generate a variable-length list of references.
				
			} else {
				$query->addCondition(" AND o.id = ?");
				$params['type'] .= 'i';
				$params[] = &$data['objectId'];
			}
		}
		// child of a particular object?
		if (isset($data['parentId']) && $data['parentId']) {
			$query->addTables("object_relations obr");
			$query->addFields('obr.order');
			
			$query->addOrder('obr.`order`');
			if (is_array($data['parentId'])) {
				$temp_ids = array();
				foreach (explode(',', $data['parentId']) as $id) {
					$temp_ids[] .= (int) $id;
				}
				$query->addConditions("AND obr.object_id=(".implode(',', $temp_ids).")","AND obr.subject_id=o.id");
			} else {
				$query->addConditions("AND obr.object_id=?","AND obr.subject_id=o.id");
			$params['type'] .= 'i';
			$params[] = &$data['parentId'];	
			}
			
		}
		if (@$data['childId']) {
			$query->addTable('object_relations obr');
			$query->addCondition(" AND obr.subject_id = $data[childId] ");
			$query->addCondition(" AND obr.object_id = o.id ");
		}
		// title criteria
		if (@$data['text']) {
			$text = '%' . $data['text'] . '%';

			$params['type'] .= 'sss';
			$params[] = &$text;
			$params[] = &$text;
			$params[] = &$text;

			if (@$data['objectType'] == 'collection') {
				$query->addCondition(
						" AND (o.title LIKE ? OR o.description LIKE ? OR o.creator LIKE ? )"
				);
			} else {
				$params['type'] .= 's';
				$query->addTable("contents c");
				$query->addCondition(
						" AND (o.title LIKE ? OR o.description LIKE ? OR o.creator LIKE ?  OR c.content LIKE ? )"
				);
				$params[] = &$text;
			}
		}
		// bounds criteria?
		/* if ($data->hasBoundsConditions) {
		  //$query->addConditions(" AND $query->mappingTable.ne_lat < ? …");
		  $mapping = new Mapping($data);
		  $query->addCondition($mapping->generateInclusiveQuery($data->tableName));
		  // add parameters
		  } */

		if (isset($data['neLat']) && isset($data['neLon']) && isset($data['swLat']) && isset($data['swLon'])) {
			$query->addTable('object_mappings om');
            $query->addCondition("AND om.object_id = obr.object_id");
			//Log::write("Bounds params found:" . print_r($data, TRUE));
			/* $query->addCondition("AND om.sw_lat >= ? AND om.sw_lon >= ? AND om.ne_lat <= ? AND om.ne_lon <= ?"); */
			$params['type'] .= 'dddd';
			$params[] = &$data['swLat'];
			$params[] = &$data['swLon'];
			$params[] = &$data['neLat'];
			$params[] = &$data['neLon'];
			$north = $data['neLat'];
			$south = $data['swLat'];
			$east = $data['neLon'];
			$west = $data['swLon'];
			$query->addCondition(" AND NOT (om.sw_lat >= ? OR om.ne_lat <= ? ");
			if ($east >= $west) {
				$query->addCondition("OR om.sw_lon >= ? OR om.ne_lon <= ?)");
			}
			// Case 2) Bounding Box acrossing longitude 180 to -180 ($east < $west)
			else {
				$query->addCondition(") AND (( om.sw_lon > -180 AND om.sw_lon < ? ) "
						. "OR ( om.ne_lon < 180 AND om.ne_lon > ? )) ");
			}
		} elseif (isset($data['bbox'])) {
			$query->addTable('object_mappings om');
            $query->addCondition("AND om.object_id = obr.object_id");
			// BBOX is NESW
			$query->addCondition("AND om.sw_lat >= ? AND om.sw_lon >= ? AND om.ne_lat <= ? AND om.ne_lon <= ?");
			$params['type'] .= 'dddd';
			$bbox_coordinates = explode(',', $data['bbox']);
			$params[] = &$bbox_coordinates[2];
			$params[] = &$bbox_coordinates[3];
			$params[] = &$bbox_coordinates[0];
			$params[] = &$bbox_coordinates[1];
		}
		if (isset($data['start']) && isset($data['end'])) {
			$query->addTable('object_mappings om');
			$start = NULL;
			$end = NULL;
			$startIsBC = 0;
			$endIsBC = 0;
			if ($data['start'] instanceof DateTime) {
				$start = $data['start']->format(ATOM_DATE);
			} else {
				$start = $data['start'];
			}
			if (substr($start, 0, 1) == '-') {
				$startIsBC = 1;
				$start = substr($start, 1);
			}
			if ($data['end'] instanceof DateTime) {
				$end = $data['end']->format(ATOM_DATE);
			} else {
				$end = $data['end'];
			}
			if (substr($end, 0, 1) == '-') {
				$endIsBC = 1;
				$end = substr($end, 1);
			}
			// TODO: figure out isBC
			$query->addCondition("AND NOT (dateLarger(om.dateFrom_isBC, om.date_from, ?, ?) "
					. "OR dateLarger(?, ?, om.dateTo_isBC, om.date_to)) ");
			$params['type'] .= 'isis';
			$params[] = &$endIsBC;
			$params[] = &$end;
			$params[] = &$startIsBC;
			$params[] = &$start;
		}
//		print $query;
//		print_r($params);
		//die();
		// run query
		//Log::write("Looking for objects/collections: querying $query with params " . print_r($params, TRUE));
		//$result = $this->db->preparedQuery($query, $params);
		// If the $params array has more than one member (the first member is always 'type',
		// do a regular query, not a prepared query.
		/*if (count($params) > 1) {
			$result = $this->db->preparedQuery($query, $params);
			$result = $this->db->preparedGetRows();
		} else {
			$result = $this->db->query($query);
			if ($result) {
				$result = $this->db->getRows();
			} else {
				//Log::dbError("Nothing found for query $query and parameters " . print_r($params, TRUE));
				Log::dbError($query, $params, "Nothing found.");
				return FALSE;
				//throw new NotFoundError("No items found for supplied criteria.");
			}
		}*/
		$result = $this->query($query, $params);
		Log::queryCounter();
		if (!$result) {
			Log::dbError($query, $params, $this->db->getError());
		}
		//
		//$result = $this->db->preparedGetRows();
		//Log::write(count($result) . " objects found.");
		if (count($result) == 0) {
			Log::dbError($query, $params, "Nothing found.");
		}
		$returnable = array();

		foreach ($result as $row) {
			if (!isset($this->objects[$row['id']])) {
				$returnable[] = $this->autoconstruct_models($row);
			} else {
				$returnable[] = $this->objects[$row['id']];
			}
			if ($deep) {
				//$childData['parentId'] = $row['id'];
				$objects_to_link = $this->doSearch(array('parentId' => $row['id']), FALSE);
				// then link each item to the parent object
				foreach ($objects_to_link as $object) {
					$this->objects[$row['id']]->addChild($object);
				}
			}
		}
		// generate objects
		Log::registerObjects($returnable);
		return $returnable;
	}

	// Specialized functions
	public function getParentsOf ($object) {
		$objectId = NULL;
		if ($object instanceof DatabaseModel) {
			$objectId = $object->id;
		} elseif (is_numeric ($object)) {
			$objectId = (int)$object;
		} else {
			throw new \InvalidArgumentException("Invalid argument for FeatureStore::getParents");
		}
		$data = array (
			'childId' => $objectId
		);
		return $this->doSearch($data);
	}
}

?>
