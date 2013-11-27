<?php
namespace HyperCities\Provider\ItemManagement;
use HyperCities\Provider\Output\Earth\TourStep;
use HyperCities\Provider\Output\Earth\TourDocument;

use \database;

/**
 * Serves collections to Google Earth.
 *
 * @author David Shepard
 * @copyright Copyright 2011, The Regents of the University of California
 */
class EarthServer extends ResourceServer {

	public function get ($request) {
		$db = database::getInstance();
		$fs = FeatureStore::getInstance();
		$ms = MapStore::getInstance();
		// Necessary due to lack of array dereferencing in PHP < 5.4
		$url_pieces = explode("/", $request["url"]);
		$item_pieces = explode(".", $url_pieces[2]);
		$itemId = $item_pieces[0];
		// $itemId = $request->url[2];
		/*$rootCollection = $fs->doSearch(array(
			"objectId" => $itemId
		));*/
		$rootCollection = $fs[$itemId];
		$query = "SELECT obr.subject_id AS id, o.object_state_id, o.object_type_id, obr.object_id"
				." FROM object_relations obr, objects o WHERE obr.object_id IN "
				." (SELECT subject_id FROM object_relations obr WHERE object_id = ?) "
				." AND o.id = obr.subject_id AND o.object_state_id != ".HC_OBJECT_DELETED
				." GROUP BY object_id";
		$db->preparedQuery($query, array("type" => 'i', &$itemId));
		$objectList = $db->preparedGetRows();
		$objectsToObjects = array();
		foreach ($objectList as $object) {
			if (!isset($objectsToObjects[$object['object_id']])) $objectsToObjects[$object['object_id']] = array();
			$objectsToObjects[$object['object_id']][] = $object['id'];
		}
		$query = "SELECT om.map_id AS id, mp.tile_url, om.object_id "
				." FROM objects_maps om, map_profiles mp"
				." WHERE om.object_id IN (SELECT subject_id FROM object_relations "
				." WHERE object_id = ?) AND mp.map_id = om.map_id ";
//				." GROUP BY om.object_id";
		$db->preparedQuery($query, array("type" => 'i', &$itemId));
		$mapList = $db->preparedGetRows();
		$objectsToMaps = array();
		foreach ($mapList as $map) {
			if (!isset($objectsToMaps[$map['object_id']])) $objectsToMaps[$map['object_id']] = array();
			$objectsToMaps[$map['object_id']][] = $map['id'];
		}


		// generate tour
		$uniqueObjectIDs = array_unique(array_merge(array_keys($objectsToObjects), array_map(function ($item) {
			return $item['id'];
		}, $objectList)));
		$fs->loadAll();
		$uniqueMapIDs = array_unique(array_map(function ($item) {
			return $item['id'];
		}, $mapList));
		$doc = new TourDocument($rootCollection);
		//foreach ($rootCollection->objects as $object) {
		for ($i = 0; $i < count($rootCollection->objects); $i++) {
			$object = $rootCollection->objects[$i];
			$prevObj= ($i == 0)? NULL : $rootCollection->objects[$i-1];
			$nextObj= ($i == count($rootCollection->objects)-1)? NULL : $rootCollection->objects[$i+1];

			$object->prepare();
			$hideObjects = array_diff($uniqueObjectIDs, array_map(function ($item){
					return $item->id;
				}, $object->objects)
			);
			$hideMaps = array_diff($uniqueMapIDs, array_map(function ($item) {
					return $item->id;
				}, is_array($object->maps) ? $object->maps : array())
			);
			$tourStep = new TourStep($object, $prevObj, $nextObj, $hideObjects, $hideMaps);
			$doc->addStep($tourStep);
		}		
		// append each to document
		// Tourdocument should infer object list from collection--it has all the
		// objects in it.
		//
		//$doc->addObjects($objects);
		//$doc->addMaps($maps);
		// start generating tour data
		// generate object list for each item, and fade everythign else out
		
		return $doc;
	}
	
	public function create() {
		
	}
	public function update() {
		
	}
	public function delete() {
		
	}
}

?>
