<?php

namespace HyperCities\Provider\ItemManagement;

use HyperCities\Provider\Output\BookRelatedCollectionResult;

/**
 * Description of BookServer
 *
 * @author David Shepard
 * @copyright Copyright 2010, The Regents of the University of California
 */
class BookServer extends ResourceServer {
	
	public function create() {
		
	}

	public function delete() {
		
	}

	public function get() {
		
	}
	
	public function getRelatedCollections($id, $request) {
		$bs = BookStore::getInstance();
		$data = $bs->getRelatedCollections($id);
		$fs = FeatureStore::getInstance();
		$fs->loadAll();
		return new BookRelatedCollectionResult($data);
	}

	public function handle($url, $method, $arguments) {
		$return = null;
		if ($url[2] == 'collections' && $method == 'GET') {
			$return = $this->getRelatedCollections($url[1], $arguments);
		}
		return $return;
	}

	public function update() {
		
	}
}

?>
