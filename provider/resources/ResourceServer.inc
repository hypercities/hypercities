<?php

namespace HyperCities\Provider\ItemManagement;

/**
 * Description of Resource
 *
 * @author ${user}
 * @date ${date}
 * @copyright (c) 2010 Regents of the University of California
 */
abstract class ResourceServer {
	// database stuff
    private static $table = '';

	// Can be implemented in ResourceResponder class same way
	// for distinct classes.
	// Use the DataStore to get the data.
	
	public function __call($name, $arguments) {
		switch ($name) {
			// handle unimplemented methods
			// implementing this method prevents this code from being reached.
			case 'get':
			case 'create':
			case 'update':
			case 'delete':
				throw new MethodNotImplementedException("Method $name not implemented for this object.");
				break;
			default:
				throw new MethodNotImplementedException();
		}
	}
	public function handle ($url, $method, $arguments) {
		switch (strtoupper($method)) {
			case 'GET':
				$return = $this->get($arguments);
				break;
			
		}
		return $return;
	}

	// create some kind of response object to show unimplemented methods

	private function decomposeUrlToCriteria($url) {
		// for example, for objects/collections
		$pieces = explode('/', $url);
		$criteria = array();
		if (end($pieces) == 'collections') $criteria['objectType'] = 2;
		if ($pieces[0] == 'users') $criteria['creatorId'] = $pieces[1];
		elseif (count($pieces) == 3) {
			$criteria['objectId'] = $pieces[1];
		}
		// how to handle maps?
		return $pieces;
	}

	// Pass in request object
	public function handle_objects_Request ($url, $method, $arguments) {
		$data = array_merge($this->decomposeUrlToCriteria($url), $arguments);
		switch ($method) {
			case 'GET':
				$this->get($arguments);
				break;
			case 'POST':
				if (isset($data['objectId'])) $this->update();
				else $this->create($arguments);
				break;
			case 'DELETE':
				$this->delete();
				break;
		}
	}

}
?>
