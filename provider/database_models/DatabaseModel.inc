<?php

namespace HyperCities\Provider\ItemManagement;

use \database;
use HyperCities\Provider\Log;

/**
 * Base class for all HyperCities geotemporal entities in the database.
 *
 * @author David Shepard
 * @copyright Copyright 2010, Regents of the University of California
 */
abstract class DatabaseModel {
	const COLLECTION = 2;
	const PLACEMARK_2D = 3;
	const NETWORK_LINK_2D = 4;
	const PLACEMARK_3D = 5;
	const NETWORK_LINK_3D = 6;
	const RICH_MEDIA_OBJECT = 7;
	const EXTERNAL_DATA_SOURCE = 8;
	const MOODLE_ACTIVITY_COLLECTION = 9;

	/**
	 * Used in implementations of this::commit()
	 */
	const FORCE_CREATE = 1;

	protected   //$id,
				$parents,
				$loaded = FALSE,
				$requiredFields = array();
	protected	$isDirty = NULL; // has been saved to DB
	protected static $store;
	protected static	$db = NULL,
					$testMode = FALSE;
					// TODO: fix by making this protected and making a new MapTemplate object
	public $id;

	public function __construct($data) {
		if (is_array($data)) {
			$this->__construct_from_array($data);
		} elseif (is_scalar($data)) {
			$this->__construct_from_id($data, TRUE);
		}
	}

	/**
	 * Should be overridden in each derived class and called.
	 *
	 * @param array $data
	 */
	protected function __construct_from_array(array $data) {
		if (isset($data['id']))
			$this->id = $data['id'];
	}

	protected function __construct_from_id($id, $loadNow = false) {
		$this->id = $id;
		if ($loadNow)
			$this->load();
	}

	abstract protected function load();

	public function getParents($lazyLoad = TRUE) {
		if ($lazyLoad && $this->parents) {
			return $this->parents;
		} else {
			$criteria = array(
				'childId' => $this->id,
			);
			//$searchEngine = ItemLocate::getInstance();
			$fs = FeatureStore::getInstance();
			$this->parents = $fs->doSearch($criteria);
		}
	}

	protected function isNewObject () {
		if (!is_numeric($this->id)) return TRUE;
	}

	public function __get($name) {
		switch ($name) {
			case 'id':
				return $this->id;
				break;
		}
	}

	abstract protected function create();

	/**
	 * Commmit an update to the database.
	 */
	abstract protected function update();

	/**
	 * Update an object (in memory) with supplied data.
	 *
	 * NOTE: After calling this method, one must call commit() to write this object
	 * to the database.
	 * @param array $data
	 */
	public function updateWithArray($data) {
		//Log::write ("Loading object $data[id].");
		if (!$this->loaded)
			$this->load();
		// update fields in this object
		//Log::write ("Updating object $data[id].");
		if ($data instanceof \HyperCities\Provider\Request) {
			$data = $data->requestData;
		}
		if (isset($data['id']))
			unset($data['id']);
		if (isset($data['objectId']))
			unset($data['objectId']);
		$this->__construct_from_array($data);
		// if content is specified, update that
		// if new mappings are specified, update those
		// if changes to the maps are specified, update those
		// if changes to the objects are specified, update those
	}

	public function commit($create = NULL) {
		if (self::$testMode) {
			Log::write("In test mode. Pretending to commit object.");
			$this->id = static::$pseudoIdCounter++;
			return FALSE;
		}
		// Create new object
		if (!$this->id || $create == self::FORCE_CREATE) {
			$this->create();
			return true;
		} else {
			$this->update();
			return true;
		}
	}

	/**
	 * Validates that required fields have been filled.
	 * @throws MissingFieldException
	 */
	protected function validateRequiredFields() {
		$missingFields = array();
		foreach ($this->requiredFields as $field) {
			if (!isset($this->$field))
				$missingFields[] = $field;
		}
		if ($missingFields) {
			throw new MissingFieldException($this->itemName . ' ' . $this->id, $missingFields);
		}
	}

	public static function setTest($file = NULL) {
		self::$testMode = TRUE;
	}

	protected function query($query, array $params) {
		Log::queryCounter();
		$refcode = md5(time() . "178jkd8023ksad902134");
		if (!self::$db) {
			self::$db = database::getInstance();
		}
		Log::query((string)$query, $params);
		//Log::write('Doing query: ' . $query . ' for params ' . print_r($params, TRUE));
		$status = self::$db->preparedQuery($query, $params);
		if (!$status) {
			if (!$status) {
				//Log::write("DATABASE ERROR (Reference code $refcode): " . self::$db->getError());
				Log::dbError($refcode, $query, $params);
				throw new \HyperCities\Provider\DatabaseError("Database Error occurred."
						. "Please report the following error code to the HyperCities team: $refcode.");
			}
		}
		return self::$db->preparedGetRows();
	}

	protected function writeQuery($query, array $params) {
		Log::queryCounter();
		Log::writeQuery((string)$query, $params);
		$refcode = md5(time() . "178jkd8023ksad902134");
		//Log::write('Doing write query (refcode $refcode) : ' . $query . ' for params ' . print_r($params, TRUE));
		if (self::$testMode) {
			//Log::write('This query is simply a test. The database will not be affected.');
			return TRUE;
		} else {
			if (!self::$db) {
				self::$db = database::getInstance();
			}
			self::$db->preparedQuery($query, $params);
			/*if (!$status) {
				Log::dbError($refcode . self::$db->getError(), $query, $params);
				/*throw new \HyperCities\Provider\DatabaseError("Database Error occurred."
						. "Please report the following error code to the HyperCities team: $refcode.");*/
			//}
			if (stripos($query, 'INSERT INTO') === 0) {
				return self::$db->insertId();
			} else {
				return TRUE;
			}
		}
	}

	protected function insertId() {
		return self::$db->insertId();
	}

	protected function json_decode_clean($jsondata) {
		if (!is_array($jsondata)) {
			$attempt = json_decode ($jsondata, TRUE);
			if ($attempt === NULL) {
				return json_decode(stripslashes($jsondata), TRUE);
			} else {
				return $attempt;
			}
		} else
			return $jsondata;
	}

}

?>
