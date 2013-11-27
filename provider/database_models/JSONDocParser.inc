<?php

namespace HyperCities\Provider\ItemManagement;

use \database;
use HyperCities\Provider\Authentication\User;

/**
 * Parses JSON docs containing objects.
 *
 * @author David Shepard
 * @copyright Copyright 2010, The Regents of the University of California
 */
class JsonDocParser {

	private $source_doc = NULL,
			/**
			 * NOTE: $objects contains the ORIGINAL ids from the parser, not
			 * the IDs that will be inserted into the database.
			 */
			$preserve_ids = FALSE,
			$objects = array(),
			$content_object_ids = array(),
			$user = NULL;

	public function __construct($doc, $user, $preserve_ids = FALSE) {
		$this->source_doc = $doc;
		$this->user = $user;
		$this->preserve_ids = $preserve_ids;
	}

	private function addObject($data) {
		/**
		 * All objects will be assigned to the person who uploaded them.
		 */
		$model = NULL;
		if (!in_array($data['id'], array_keys($this->objects))) {
			// We assume that an object is a collection if objectType is unset
			$object_id = $data['id'];
			if (!$this->preserve_ids) {
				// NOTE: Commented out 2011-04-07; not sure why check before unsetting
				// id was performed in first place. Think it has something to do with
				// updating, but we're not preserving when we import.
				//if ($this->validate_id($data['id'])) unset($data['id']);
				//unset($data['id']);
			}
			unset($data['id']);
			//$data['owner'] = $this->user->id;
			if ($this->user instanceof User) {
				$data['owner'] = $this->user->id;
			} else {
				$data['owner'] = $this->user;
			}
			$children = array();
			if (!isset($data['objectType']) || $data['objectType'] == 2) {
				$model = new ParsingObject(new Collection($data));
				if (!isset($data['children'])) {
					// TODO: CURL request to get children
				}
				$children = $data['children'];
			} else {
				$model = new ParsingObject(new RichMediaObject($data));
				if (isset($data['objects']))
					$children = $data['objects'];
				// suppress saving content if description is empty
				//if ($data['description'])
				//	$this->content_object_ids[$data['description']] = $object_id;
			}
			$this->objects[$object_id] = $model;
			if (!is_null($children)) {
				foreach ($children as $childData) {
					$child = $this->addObject($childData);
					/* if ($model instanceof Collection) $model->children[] = $child;
					  else $model->objects[] = $child; */
					$model->addObject($child);
				}
			}
		} else {
			$model = $this->objects[$data['id']];
		}
		return $model;
	}

	public function parse() {
		$object = NULL;
		$object = $this->addObject($this->source_doc);
		return $object;
	}

	public function loadContents($docUrl) {
		// take substr of doc
		$url = substr($docUrl, 0, strpos($docUrl, 'provider')) . "provider/contents/list?ids="
				. implode(",", array_keys($this->content_object_ids));
		$ch = curl_init($url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		$content_results_raw = curl_exec($ch);
		$content_results = json_decode($content_results_raw, TRUE);
		$contents = array();
		if (isset($content_results['id'])) {
			$contents[$content_results['id']] = $content_results;
		} else {
			foreach ($content_results as $cresult) {
				$contents[$cresult['id']] = $cresult['content'];
			}
		}
		foreach ($this->content_object_ids as $contId => $objId) {
			$this->objects[$objId]->model->content = new Content($contents[$contId]);
		}
	}

	public function getIds() {
		$obj_ids = array();
		foreach ($this->objects as $obj) {
			$obj_ids[] = $obj->id;
		}
		return $obj_ids;
	}

	private function validate_id ($id) {
		// check if ID is in the database
		$fs = FeatureStore::getInstance();
		if (!$fs[$id]) return FALSE;
		// check if user can access the object
		if ($this->user->checkPrivileges("UPDATE", $id)) return TRUE;
	}

	public function commit (Collection $collection = NULL) {
		$db = database::getInstance();
		$db->query("START TRANSACTION");
		if ($this->user instanceof User) {
			$user_id = $this->user->id;
		} else {
			$user_id = $this->user;
		}
		$status = FALSE;
		foreach ($this->objects as $object) {
			$status = $object->commit();
		}
		if ($status == TRUE) {
			$db->query("COMMIT");
		} else {
			$db->query("ROLLBACK");
		}
		return $status;
	}

}

?>
