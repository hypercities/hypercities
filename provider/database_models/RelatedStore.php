<?php
namespace HyperCities\Provider\ItemManagement;

/**
 * Handles relationships between DataStore classes, representing relations between
 * models (or resources, depending on how you look at it) that are public facing.
 * That is to say, these are things one would want to access independently, for
 * example, Maps and Objects, which have relations but may be accessed independently
 * of each other. The other relation is of course Books and Objects.
 * 
 * Usage: each DataStore subclass has a number of RelationalModel instances.
 * Each time we call loadAll(), it iterates over each RelationalModel relation
 * and uses that to generate calls to retrieve all the related records from the database.
 * Logic for retrieving fields is contained in the 
 *
 * @author David Shepard
 * 
 */

class RelatedStore extends DataStore {
	protected $objects = array(),
			$linkedStore = NULL,
			$mediatingTable = "",
			$baseField = "",
			$linkingField = "",
			$linkingModel = "";
	
	static $instance;
	
	public function __construct($linkedStore, $mediatingTable, $baseField, $linkingField, $linkingModel) {
		parent::__construct();
		$this->linkedStore = $linkedStore;
		$this->mediatingTable = $mediatingTable;
		$this->baseField = $baseField;
		$this->linkingField = $linkingField;
		$this->linkingModel = $linkingModel;
	}
	
	public function getLinked (array $objectIds) {
		if (count($objectIds) > 1) {
			$query = "SELECT * FROM $this->mediatingTable WHERE $this->baseField IN ("
				.implode(",", $objectIds).") ";
		} else {
			$query = "SELECT * FROM $this->mediatingTable WHERE $this->baseField = "
				.implode(",", $objectIds);
		}
		$result = $this->db->query($query);
		if ($result->num_rows > 0) {
			$result = $this->db->getRows();
		} else {
			return array();
		}
		$returnable = array();
		if ($result !== FALSE) {
			foreach ($result as $row) {
				$row['meta_linked_model'] = $this->linkedStore[$row[$this->linkingField]];
				$returnable[] = new $this->linkingModel($row);
			}
		}
		return $returnable;
	}
	
	/**
	 * Loads models from related datastore.
	 * 
	 * Avoids circular loading because DataStore::loadAll() works only on objects
	 * that are not loaded.
	 */
	public function loadAll() {
		$this->linkedStore->loadAll();
	}	

	public function doSearch(array $data) {
		
	}

	public static function getInstance() {
		if (!self::$instance) self::$instance = new static();
		return self::$instance;
	}
}
?>
