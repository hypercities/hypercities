<?php

namespace HyperCities\Provider\ItemManagement;

use HyperCities\Provider\Log;
use HyperCities\Provider\NotFoundError;
use HyperCities\Provider\Request;
use HyperCities\Provider\GeoPt;

/**
 * Class for managing database access to books.
 *
 * @author David Shepard
 * @copyright Copyright 2010, Regents of the University of California
 */
class BookStore extends DataStore {

	private static $instance = NULL;
	private $object_ids = array();

	/**
	 * Singleton constructor
	 * 
	 * @return BookStore.
	 */
	public static function getInstance() {
		if (!self::$instance) {
			self::$instance = new self();
		}
		return self::$instance;
	}
	
	protected function __construct () {
		parent::__construct();
		/*$this->linkedStores = array (
			'objects' => new RelatedStore(FeatureStore::getInstance(), "book_objects", 
					"book_id", "object_id", 'HyperCities\Provider\ItemManagement\LinkedBook'),
		);*/
	}

	protected function load ($id) {
		$object = $this->doSearch(array ("objectId" => $id));
		// Because we know books exist at least in Google ...
		if (!$object) {
			$object = new Book($id);
			$this->objects[$id] = $object;
		}
		return $object;
	}

	private function autoconstruct_models($data) {
		$this->object_ids[] = $data['book_id'];
		$model = $this->objects[$data['book_id']] = new Book($data);
		return $model;
	}
	
	public function loadAll() {
		$ids_to_load = array_diff($this->object_ids, $this->loadedObjects);
		$query = 'SELECT book_id, title, cover_url FROM books WHERE book_id ';
		if (count($ids_to_load) > 1) {
			$query .= ' IN (\''. implode('\', \'', $ids_to_load) . "')";
		} elseif (count($ids_to_load) == 1) {
			$query .= ' = \''.$ids_to_load[0].'\'';
		} else {
			return;
		} 
		$result = $this->db->query($query);
		if (!$result) {
			//print_r ($result);
		}
		// then put into each object
		try {
			$records = $this->db->getRows();
		} catch (\MissingResultException $ex) {
			throw new ItemNotFound("Could not find any objects based on supplied criteria.");
		}
		foreach ($records as $row) {
			$this->objects[$row['book_id']]->updateWithArray($row);
		}
		$this->loadedObjects = array_merge($this->object_ids, $this->loadedObjects);
	}
	
	public function getRelatedCollections ($bookId) {
		$query = "SELECT DISTINCT o.id, o.object_type_id FROM objects o, (SELECT obr.object_id "
				."FROM object_relations obr WHERE subject_id IN "
				." (SELECT object_id FROM book_objects WHERE book_id = ? )) AS c"
				."  WHERE c.object_id = o.id";
		$results = $this->query($query, array('type' => 's', &$bookId));
		$fs = FeatureStore::getInstance();
		$objects = $fs->addObjects($results);
		foreach ($objects as $row) {
			$this[$bookId]->addRelatedCollection($row);
		}
		return $this[$bookId];
	}


        public function get_modified_data(array $data) {
                $k = 1234;
                if (isset($data['objectId'])) {
                  $this->db->preparedQuery("SELECT object_id FROM book_objects WHERE book_id = ?",
                    array('type' => 's', &$k));
                $results = $this->db->preparedGetRows();
                
                $return_data = array ("url" =>"books/1234.kml" ,"objectType" => "objects");
                $objectId_data = array();
                foreach ($results as $result) {
                  $objectId_data[] = $result['object_id'];
                }
                $return_data['object_id'] = $objectId_data;
                 
                //if (count($result) != 1) {
                //        throw new ItemNotFound("Could not recognize supplied user " . $data['objectId']);
                //}
                // $params['type'] .= 'i';
                // $data = array ("objectId" => $result[0]['object_id'] ,"url" =>"books/1234.kml" ,"objectType" => "objects");
                $data = $return_data;
               }
                return $data;
        }

	/**
	 * Find books
	 * 
	 * @param array $data
	 * @param boolean $deep
	 * @return array of results, or FALSE on finding nothing 
	 */
	public function doSearch(array $data, $deep = TRUE) {
		$returnable = array();
		$query = new SelectQuery();
		$query->addFields('book_id');
		$query->addTable('books');
		$params = array('type' => '');
		$firstConditional = TRUE;
		if ($objectId = get_first_existent_key(array('objectId', 'object_id', 'google_id', 'googleId', 'bookId', 'book_id'), $data)) {
			$condition = '';
			if (!$firstConditional) {
				$condition .= ' AND ';
				$firstConditional = FALSE;
			}
			$condition .= " book_id = ? ";
			$query->addCondition('book_id = ?');
			$params['type'] .= 's';
			$params[] = &$objectId;
		}
		$result = $this->query($query, $params);
		Log::queryCounter();
		if (!$result) {
			Log::dbError($query, $params, $this->db->getError());
		}
		//Log::write(count($result) . " objects found.");
		if (count($result) == 0) {
			Log::dbError($query, $params, "Nothing found.");
		}
		$returnable = array();

		foreach ($result as $row) {
			if (!isset($this->objects[$row['book_id']])) {
				$returnable[] = $this->autoconstruct_models($row);
			} else {
				$returnable[] = $this->objects[$row['book_id']];
			}
		}
		// generate objects
		Log::registerObjects($returnable);
		if (count($returnable) == 1) $returnable = $returnable[0];
		return $returnable;
	}
}

?>
