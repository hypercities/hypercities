<?php

namespace HyperCities\Provider\ItemManagement;

use database;
use HyperCities\Provider\Log;
use HyperCities\Provider\Request;
use HyperCities\Provider\NotFoundError;

/**
 * DataStore
 *
 * @author David Shepard
 */
abstract class DataStore implements \ArrayAccess {

	protected $objects = array(),
				$db = NULL,
				$constraints = array(),
				$loadedObjects = array(),
			$linkedStores = array();

	protected function __construct() {
		$this->db = database::getInstance();
		$this->constraints['user'] = NULL;
	}

	abstract public static function getInstance();

	protected function load($id) {
		$object = $this->doSearch(array("objectId" => $id));
		$this->objects[$id] = $object;
		return $this->objects[$id];
	}

	public function offsetGet($offset) {
		$object = NULL;
		if (!isset($this->objects[$offset]))
			$object = $this->load($offset);
		else
			$object = $this->objects[$offset];
		return $object;
	}

	public function offsetExists($offset) {
		if (!isset($this->objects[$offset]))
			return FALSE;
		else
			return TRUE;
	}

	public function offsetSet($offset, $value) {
		Log::write("NON-FATAL PROGRAMMING ERROR: Attempted to offsetSet an instance of DataStore.");
	}

	public function offsetUnset($offset) {
		Log::write("NON-FATAL PROGRAMMING ERROR: Attempted to offsetUnset an instance of DataStore.");
	}

	/**
	 * Convert ID or list of IDs into proper SQL query.
	 * @param {mixed} $ids ID or list of ids
	 * @param {string} $field Name of ID field
	 * @param {SQL Query} $query Query object
	 * @param {array} $params array of parameters
	 */
	protected function processIds (&$ids, $field, $query, array &$params, $firstConditional = '') {
		if (strpos($ids, ',') !== FALSE) {
			//$query->addCondition(" AND o.id IN (?". str_repeat(',?', substr_count($data['objectId'], ',')).")");
			$temp_ids = array();
			foreach (explode(',', $ids) as $id) {
				$temp_ids[] .= (int) $id;
			}
			$query->addCondition(" $firstConditional $field IN (" . implode(',', $temp_ids) . ")");
			// The reason for the preceeding bizzare construct:
			// mysqli_bind_params() (which database::preparedQuery() uses
			// requires references, not values. References must have something to point to, and
			// there isn't another way to generate a variable-length list of references.
		} else {
			$query->addCondition(" $firstConditional $field = ?");
			$params['type'] .= 'i';
			//$id = $ids;
			$params[] = &$ids;
		}

	}

	abstract public function loadAll();

	abstract public function doSearch(array $data);

	public function process(Request $request) {
		$data = $request->requestData;
		if ($request->itemId == 'list') {
			if (isset($request['ids']))
				$data['objectId'] = $request['ids'];
		} else {
			$data['objectId'] = $request->itemId;
		}
		$data['objectType'] = $request->itemType;
		$this->constraints['userIsAdmin'] = FALSE;
		if ($request->user) {
			$this->constraints['userIsAdmin'] = $request->user->isAdmin;
		}
		return $this->doSearch($data);
	}

	public function addCreatedObject ($object) {
		$this->objects[$object->id] = $object;
	}

	protected function query ($query, $params=array()) {
		// We have to check for a length greater than 1 because $params always has
		// a 'type' element.
		$result = NULL;
		if (count($params) > 1) {
			$result = $this->db->preparedQuery($query, $params);
			$result = $this->db->preparedGetRows();
		} else {
			$result = $this->db->query($query);
			if ($result && $result->num_rows > 0) {
				$result = $this->db->getRows();
			} else {
				//Log::dbError("Nothing found for query $query and parameters " . print_r($params, TRUE));
				Log::dbError($query, $params, "Nothing found.");
				return FALSE;
				//throw new NotFoundError("No items found for supplied criteria.");
			}
		}
		return $result;
	}

}

?>
