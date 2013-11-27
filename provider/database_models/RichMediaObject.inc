<?php

namespace HyperCities\Provider\ItemManagement;

use HyperCities\Provider\ItemManagement\BadRequestError;
use HyperCities\Provider\Authentication\User;
use \database;
use \DateTimeZone, \DateTime;
use \KmlParser;
use HyperCities\Provider\Log;

class RichMediaObject extends DatabaseModel {

	public	$title,
			$creator,
			$owner,
			$copyright,
			$objectType,
			//$markerType,
			//$view,
			//$zoom,
			$totalChildren = 0,
			$order,
			$mapping,
			$state,
			$content = NULL,
			$bubble = array(),
			$objects = array(),
			$maps = array(),
			$mapType = NULL,
			$parents = array(),
			$users = array(),
			$coauthors = array(),
			$bookmarks = array(),
			$externalPermissionsId = NULL;

	protected	$itemName = 'object';
	private $allowed_map_types = array('NONE', 'ROADMAP', 'SATELLITE', 'HYBRID', 'TERRAIN', 'EARTH', 'BLANK');

	public function __construct ($data = NULL, $id = NULL) {
		$this->requiredFields = array('title', 'creator', 'owner', 'copyright',
			'objectType', 'mapping', 'state'
		);
		if ($data instanceof \DOMDocument) {
			$this->__construct_from_kml($data);
			return;
		} else {
			// implicitly calls $this->__construct_from_array if $data is array, etc.
			parent::__construct($data);
		}
	}

	protected function __construct_from_id($id, $loadNow = false) {
		parent::__construct_from_id($id, $loadNow);
	}

	protected function __construct_from_array(array $data) {
		parent::__construct_from_array($data);
		if (isset($data['title']))
			$this->title = stripslashes($data['title']);
		elseif (isset($data['name']))
			$this->title = stripslashes($data['name']);
		if (isset($data['creator']))
			$this->creator = $data['creator'];
		if (isset($data['owner']))
			$this->owner = (int) $data['owner'];
		if (isset($data['owner_id']))
			$this->owner = (int)$data['owner_id'];
		if (isset($data['ownerId']))
			$this->owner = (int)$data['ownerId'];
		if (isset($data['copyright']))
			$this->copyright = $data['copyright'];
		if (isset($data['state']))
			$this->state = $data['state'];
		if (isset($data['object_state_id']))
			$this->state = $data['object_state_id'];
		if (!$this->state) $this->state = 2;
		if (isset($data['objectType']))
			$this->objectType = (int) $data['objectType'];
		if (isset($data['object_type_id']))
			$this->objectType = (int) $data['object_type_id'];
		if (isset($data['order']))
			$this->order = $data['order'];
		if (isset($data['mapType']))
			$mapType = $data['mapType'];
		if (isset($data['map_type']))
			$mapType = $data['map_type'];
		if (isset($data['coauthors'])) {
			if (is_string($data['coauthors'])) $this->coauthors = explode(',', $data['coauthors']);
			else $this->coauthors = $data['coauthors'];
		}
		if (isset($mapType)) {
			if (in_array($mapType, $this->allowed_map_types)) {
				$this->mapType = $mapType;
			} else {
				Log::write("Invalid mapType constant encountered.");
			}
		} else {
			if (!$this->mapType)
				$this->mapType = 'NONE';
		}
		if (isset($data['bubble'])) {
			// From HTTP request
			$bubble = $this->json_decode_clean($data['bubble']);
			if ($bubble !== NULL && isset($bubble['id']) && isset($bubble['state'])
					&& ($bubble['state'] == 'max' || $bubble['state'] == 'min')) {
				$this->bubble = $bubble;
			} else {
				//Log::write("Problem decoding bubble string:" . $data['bubble']);
			}
		} elseif (isset($data['info_bubble_id']) && isset($data['info_bubble_state'])) {
			// From database
			$this->bubble = array('id' => $data['info_bubble_id'], 'state' => $data['info_bubble_state']);
		}
		// other objects
		// This prevents retrieving the data with the content from
		$subData = $data;
		if ($this->id)
			$subData['objectId'] = $this->id;
		elseif (isset($data['id']))
			$subData['objectId'] = $data['id'];
		unset($subData['id']);
		if (isset($subData['description']) && $subData['description']) {
			$this->content = new Content($subData['description']);
		} elseif (isset($subData['content'])) {
			$this->content = new Content($subData['content'], $this->id);
		} elseif (isset($subData['content_id'])) {
			$this->content = new Content($subData['content_id'], $this->id);
		}
		if (isset($subData['mapping'])) {
			$this->mapping = new Mapping($subData['mapping']);
		} elseif (isset($subData['bounds']) || isset($subData['bound'])) {
			$bounds = NULL;
			if (isset($subData['bounds']))
				$bounds = $subData['bounds'];
			if (isset($subData['bound']))
				$bounds = $subData['bound'];
			$subData = array_merge($subData, json_decode(stripslashes($bounds), TRUE));
			try {
				$this->mapping = new Mapping($subData);
			} catch (Exception $ex) {
				Log::write("Problem building mapping for object $this->id.");
			}
		} elseif (isset($subData['latlng']) || isset($subData['neLat']) || isset($subData['ne_lat'])) {
			$mappings = json_decode(stripslashes(@$subData['latlng']), TRUE);
			if ($mappings === NULL) {
				try {
					$this->mapping = new Mapping($subData);
				} catch (Exception $ex) {
					Log::write("Problem building mapping for object $this->id.");
				}
			} else {
				$latlngs = $mappings['latlng'];
				$firstPoint = array_shift ($latlngs);
				$tempRegion = Mapping::createFromPoint($firstPoint['lat'], $firstPoint['lng'], $firstPoint['alt']);
				foreach ($latlngs as $latlng) {
					$tempRegion->expandToContainPoint($latlng['lat'], $latlng['lng'], $latlng['alt']);
				}
				$this->mapping = $tempRegion;
				// To set dateFrom and dateTo
				$this->mapping->updateWithArray($data);
			}
		}
		if (isset($data['baseMap'])) {
			$maps = @json_decode(stripslashes($data['baseMap']), TRUE);
			if (isset($maps['baseMap'])) $this->maps = $maps['baseMap'];
		}
		if (isset($subData['objects']) && is_string($subData['objects'])) {
			$this->objects = explode(',', $subData['objects']);
		}
		if (isset($data['bookmarks'])) {
			if (is_string($data['bookmarks']) && $books = json_decode(stripslashes($data['bookmarks']), TRUE)) {
				$books = $books['bookmarks'];
			} elseif (is_array($data['bookmarks'])) {
				$books = $data['bookmarks'];
			}
			foreach ($books as $bookmark) {
				$this->bookmarks[] = new LinkedBook ($bookmark);
			}
		}		
		// Set $loaded to prevent it from loading again
		$this->loaded = TRUE;
	}

	/**
	 * Fill out this object from a KML node
	 * 
	 * @param {XML Element} $kml A Placemark or NetworkLink KML node
	 */
	private function __construct_from_kml ($kml) {
		$data = array();
		if ($kml->hasAttribute ('id')) $data['id'] = $kml->getAttribute('id');
		for ($i = 0; $i < $kml->childNodes->length; $i++) {
			$node = $kml->childNodes->item(0);
			switch ($node->nodeName) {
				case 'name':
					$data['title'] = $node->textContent;
					break;
				case 'description':
					$data['description'] = $node->textContent;
					break;
			}
		}
		// DRY: Rely on __construct_from_array to handle assignments
		$this->__construct_from_array($data);
	}

	private function __construct_from_kml_old ($kmlObj, $ignoreId = TRUE) {
		if (!$ignoreId && $kmlObj->id) {
			parent::__construct ($kmlObj->id);
		}
		$this->title = $field->title;
		$this->content = new Content ($kmlObj->description);
		$collection['creator'] = $this->creator;
		$collection['copyright'] = $this->copyright;
		$collection['userId'] = $this->userId;
		$collection['objectTypeId'] = HC_OBJECT_TYPE_COLLECTION;
		$collection['date_from'] = $this->collectionTimeFrom;
		$collection['date_to'] = $this->collectionTimeTo;
		$collection['view'] = NULL;
		$collection['objectList'] = array();
		// To ensure unique objects, when about to construct a new object (in other
		// words, when recursing in collections), get object from $fs, then call
		// $thatObj::updateFromKml(). If that doesn't exist, create a new object.
		// Either way, add new object as child of that collection.
	}

	protected function load() {
		$fs = FeatureStore::getInstance();
		$ms = MapStore::getInstance();
		if (!$this->title) {
			$fs->loadAll();
		}
		$this->maps = $ms->doSearch(array('objectType' => 'maps', 'linkedTo' => $this->id));
		$this->objects = $fs->doSearch(array('objectType' => 'objects', 'parentId' => $this->id));
		$this->loaded = TRUE;
	}

	public function loadMaps() {
		$ms = MapStore::getInstance();
		$this->maps = $ms->doSearch(array('objectType' => 'maps', 'linkedTo' => $this->id));
	}

	public function prepare() {
		$this->load();
	}

	public function setMapping(Mapping $mapping) {
		$this->mapping = $mapping;
	}

	/**
	 * Commits only the children of this object.
	 */
	public function commitChildren() {
		$orderCounter = 0;
		if ($this->owner instanceof User) {
			$ownerId = $this->owner->id;
		} else {
			$ownerId = $this->owner;
		}
		$db = database::getInstance();
		foreach ($this->objects as $object) {
			/*
			 * Don't think this is necessary
			$createRelation = TRUE;
			if ($object->id) {
				$createRelation = FALSE;
			}*/
			$object->commit();
		}
	}

	public static function setStore ($store) {
		if (self::$store instanceof DataStore) self::$store = $store;
	}

	protected function create() {
		$this->validateRequiredFields();
		$db = database::getInstance();
		$query = "";
		$params = array('type' => '');
		if ($this->content instanceof Content) {
			$this->content->commit();
			$content_id = $this->content->id;
		} else {
			$content_id = $this->content;
		}
		$query = 'INSERT INTO objects (title, object_type_id, creator, owner_id,'
				. ' copyright, object_state_id, content_id, map_type, info_bubble_id, '
				. 'info_bubble_state, external_permissions_id, created_at, updated_at)'
				. ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW() ) ';
		$params['type'] = 'sisisiisisi';
		$params[] = &$this->title;
		$params[] = &$this->objectType;
		$params[] = &$this->creator;
		$params[] = &$this->owner;
		$params[] = &$this->copyright;
		$params[] = &$this->state;
		$params[] = &$content_id;
		$params[] = &$this->mapType;
		$params[] = &$this->bubble['id'];
		$params[] = &$this->bubble['state'];
		$params[] = &$this->externalPermissionsId;
		//$db->preparedQuery($query, $params);
		$this->id = $this->writeQuery($query, $params);
		Log::write("Created object with id # $this->id.");
		$this->mapping->commitForObject($this->id);
		// Now add the objects_maps data
		if (count($this->maps) > 0) {
			$query = 'INSERT INTO objects_maps (object_id, map_id, opacity, z_index,'
					.' tile_url, layers, map_data, tile_type_id, created_at, updated_at)'
					.' VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW() ) ';
			$tile_types = array (
				0 => 0,
				'WMS'	=> 3,
				'ArcGIS' => 4,
			);
			foreach ($this->maps as $map) {
				$layers = isset($map['layers']) ? json_encode($map['layers']) : "[]";
				$tileType = isset($map['tileType']) ? $tile_types[$map['tileType']] : 0;
				if (!isset($map['mapData'])) $map['mapData'] = '';
				if (!isset($map['id'])) $map['id'] = 0;
				if (!isset($map['tileUrl'])) $map['tileUrl'] = '';
				$params = array('type' => 'iidisssi', &$this->id, &$map['id'], 
					&$map['opacity'], &$map['z-index'], &$map['tileUrl'], &$layers,
					&$map['mapData'], &$tileType,
					//json_encode (array ('tileUrl' => $map['tileUrl'], 'layers' => $map['layers']  ), \JSON_FORCE_OBJECT)
					);
				//if ($map['id'] != 0) {
					$this->writeQuery($query, $params);
				//}
			}
		}

		if ($this->objects != NULL && count($this->objects) > 0) {
			$query = 'INSERT INTO object_relations (object_id, subject_id, scope_id,'
					. ' owner_id, `order`, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW() )';
			$order = 0;
			foreach ($this->objects as $object) {
				if (!(is_null($object) || $object == 'null')) {
					$object_id = NULL;
					if (is_numeric($object)) {
						$object_id = $object;
					} else {
						$object_id = $object->id;
					}
					$params = array(
						'type' => 'iiiii', &$this->id, &$object_id, &$this->id, &$this->owner, &$order
					);
					if ($object_id != 0) {
						$this->writeQuery($query, $params);
					}
					$order++;
				} // end if
			} // end foreach
		} // end function
		
		if ($this->bookmarks !== NULL) {
			foreach ($this->bookmarks as $book) $book->commit($this->id);
		}

		if ($this->coauthors != NULL && count($this->coauthors) > 0) {
			$query = 'INSERT INTO objects_users (object_id, user_id, access_right_id,'
				. 'created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())';

			foreach ($this->coauthors as $coauthor) {
				$coauthor = (int)$coauthor;
				$accessRight = 7;
				$params = array('type' => 'iii', &$this->id, &$coauthor, &$accessRight);
				$this->writeQuery($query, $params);
			} 
		}

		//self::$store->addCreatedObject($this);

		//Log::write("Created object and mapping links for object # $this->id.");
	}

	protected function update() {
		// updating the object
		$query = new UpdateQuery();
		$query->addTable("objects o");

		$query = 'UPDATE objects SET title = ?, creator = ?, owner_id = ?, copyright = ?,'
				. ' object_state_id = ?, updated_at = NOW ()';
		$query = 'UPDATE objects SET ';
		$params = array('type' => '');
		if ($this->title !== '(no change)') {
			$query .= " title = ?, ";
			$params['type'] .= 's';
			$params[] = &$this->title;
		}
		if ($this->creator !== '(no change)') {
			$query .= " creator = ?, ";
			$params['type'] .= 's';
			$params[] = &$this->creator;
		}
		if ($this->copyright !== '(no change)') {
			$query .= " copyright = ?, ";
			$params['type'] .= 's';
			$params[] = &$this->copyright;
		}
		if ($this->state !== '(no change)') {
			$query .= " object_state_id = ?, ";
			$params['type'] .= 'i';
			$params[] = &$this->state;
		}
		if ($this->owner !== '(no change)') {
			$query .= " owner_id = ?, ";
			$params['type'] .= 'i';
			$params[] = &$this->owner;
		}
		if ($this->mapType !== '(no change)') {
			$query .= " map_type = ?, ";
			$params['type'] .= 's';
			$params[] = &$this->mapType;
		}
		if ($this->bubble !== '(no change)') {
			$query .= "info_bubble_id = ?, info_bubble_state = ?, ";
			$params['type'] .= 'is';
			$params[] = &$this->bubble['id'];
			$params[] = &$this->bubble['state'];
		}

		$query .= ' updated_at = NOW() WHERE id = ?';
		$params['type'] .= 'i';
		$params[] = &$this->id;

		$db = database::getInstance();
		Log::write("Updating object metadata for object $this->id.");
		$this->writeQuery($query, $params);
		if (is_array($this->mapping)) {
			foreach ($this->mapping as $mapping) {
				$mapping->commit($this->id);
			}
		} else {
			$this->mapping->updateForObject($this->id);
		}
		if ($this->content && $this->content instanceof Content) {
			$this->content->commit();
		}

		// then compare associations between this RMO and maps
		$query = "SELECT id, map_id, layers, opacity, z_index, tile_url, map_data FROM objects_maps WHERE object_id = ?";
		$maps = $this->query($query, array('type' => 'i', &$this->id));
		//$maps = $db->preparedGetRows();
		$old_map_ids = array();
		$old_maps = array();
		$oms_ids = array();
		/**
		 * Please note: remotely-stored maps' uniqueness is determined by a combination of their
		 * URL and the layers shown, because it's possible that a user may want
		 * the same map service on with different layers. Changes to layers result 
		 * in the deletion of an old objects_maps entry and creation of a new one.
		 */
		foreach ($maps as $map) {
			$id = (!isset($map['id']) || $map['id'] == 0) ? md5($map['tile_url'] . $map['layers']) : $map['map_id'];
			$old_map_ids[] = $id;
			$oms_ids[$id] = $map['id'];
			$old_maps[$id] = $map;
		}
		$new_map_ids = array();
		$new_maps = array();
		foreach ($this->maps as $map) {
			$id = (!isset($map['id']) || $map['id'] == 0 || $map['id'] == NULL) ? md5($map['tileUrl'] . $map['layers']) : $map['id'];
			$new_map_ids[] = $id;
			$new_maps[$id] = $map;
		}
		// figure out which maps are new
		// if the opacity has changed, update it
		// if the map is no longer included in the RO, remove the mapping
		$maps_to_add = array_diff($new_map_ids, $old_map_ids);
		$maps_to_keep = array_intersect($new_map_ids, $old_map_ids);
		$maps_to_remove = array_diff($old_map_ids, $new_map_ids);
		$tile_types = array(0 => 0, 'WMS' => 3, 'ArcGIS' => 4);
		foreach ($maps_to_add as $map) {
			$id = isset($new_maps[$map]['id']) ? $new_maps[$map]['id'] : 0;
			$layers = isset($new_maps[$map]['layers']) ? json_encode($new_maps[$map]['layers']) : "[]";
			$tileUrl = isset($new_maps[$map]['tileUrl']) ? $new_maps[$map]['tileUrl'] : '';
			$mapData = isset($new_maps[$map]['mapData']) ? json_encode($new_maps[$map]['mapData'])
						: "{}";
			$tileType = isset($new_maps[$map]['tileType']) ? $tile_types[$new_maps[$map]['tileType']] : $tile_types['ArcGIS'];
			$query = 'INSERT INTO objects_maps (object_id, map_id, opacity, z_index,'
					.' tile_url, map_data, layers, tile_type_id, created_at, updated_at)'
					. ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW() )';
			$params = array('type' => 'iidisssi', &$this->id, &$id, 
				&$new_maps[$map]['opacity'],
				&$new_maps[$map]['z-index'], &$tileUrl, 
				&$mapData, &$layers, &$tileType);
			$this->writeQuery($query, $params);
		}
		$map_updates = array();
		if (count($maps_to_keep) > 0) {
			foreach ($maps_to_keep as $id) {
				if ($old_maps[$id]['opacity'] != $new_maps[$id]['opacity']
						|| $old_maps[$id]['z_index'] != $new_maps[$id]['z-index']) {
					$map_updates[$id] = $new_maps[$id];
				}
			}
		}
		// Removing maps for object
		foreach ($maps_to_remove as $map) {
			Log::write("Removing old map #$map for object $this->id");
			$this->writeQuery("DELETE FROM objects_maps WHERE id = ?", array('type' => 'i', &$oms_ids[$map]));
		}
		//Log::write("Updating map relations for rich object $this->id.");
		//print ("Altering map relations for rich object $this->id.");
		foreach ($map_updates as $id => $map) {
			$result = $this->writeQuery("UPDATE objects_maps SET opacity = ?, map_data = ?, z_index = ? WHERE id = ?",
							array('type' => 'dsii', &$map['opacity'], &$map['mapData'], &$map['z-index'], &$oms_ids[$id])
			);
		}
		// compare associations between this MRO and objects
		$query = "SELECT subject_id FROM object_relations WHERE object_id = ?";
		Log::write("Updating object relations for Rich Object $this->id.");
		$db->preparedQuery($query, array('type' => 'i', &$this->id));
		$result = $db->preparedGetRows();
		$objects_from_db = array();
		if (count($result) > 0) {
			foreach ($result as $row) {
				$objects_from_db[] = $row['subject_id'];
			}
			Log::write("Object already linked to " . print_r($objects_from_db, TRUE));
		} else {
			Log::write("Object has no other objects.");
		}
		// get objects linked in this version of the object
		$objects_from_model_object = array();
		foreach ($this->objects as $object) {
			if ($object instanceof Model) {
				$id = $object->id;
			} else {
				$id = $object;
			}
			$objects_from_model_object[] = $id;
		}
		$objects_to_add = array_diff($objects_from_model_object, $objects_from_db);
		$objects_to_remove = array_diff($objects_from_db, $objects_from_model_object);
		if (count($objects_to_remove) > 0) {
			foreach ($objects_to_remove as $object) {
				//$query = "DELETE FROM object_relations WHERE object_id = ? AND subject_id = ?";
				$query = "UPDATE object_relations SET object_state_id = 5 WHERE object_id = ? AND subject_id = ?";
				// TODO:: Enable updating objects
				$this->writeQuery($query, array('type' => 'ii', &$this->id, &$object));
			}
		}
		if (count($objects_to_add) > 0) {
			foreach ($objects_to_add as $object) {
				if ($object == $this->id) {
					Log::write("ERROR: Cannot link object to self. Object relation will not be created.");
					continue;
				}
				if ($object == 0) {
					Log::write("ERROR: Attempt to link object to NULL or 0. Not adding object.");
					continue;
				}
				$query = "INSERT INTO object_relations (object_id, subject_id, scope_id, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())";
				// TODO:: Enable updating objects
				$this->writeQuery($query, array('type' => 'iiii', &$this->id, &$object, &$this->id, &$this->owner));
			}
		}
		//return new ChangedMessage("Rich Media Object", "Updated", "Object $this->id updated.");
		if ($this->bookmarks) {
			$this->updateBookmarks();
		}

		// update privilege
		$query = "SELECT user_id FROM objects_users WHERE object_id = ?";
		$db->preparedQuery($query, array('type' => 'i', &$this->id));
		$result = $db->preparedGetRows();
	
		$oldCoauthors = array();
		if (count($result) > 0) {
			foreach ($result as $row) {
				$oldCoauthors[] = $row['user_id'];
			}
		}

		$coauthorsToDelete = array_diff($oldCoauthors, $this->coauthors);
		$coauthorsToAdd = array_diff($this->coauthors, $oldCoauthors);
		
		if (count($coauthorsToDelete) > 0) {
			$query = "DELETE FROM objects_users WHERE object_id = $this->id AND";
			if (count($coauthorsToDelete) > 1) {
				$query .= " user_id IN (".implode(',', $coauthorsToDelete).")";
			} elseif (count($coauthorsToDelete) == 1) {
				$query .= " user_id = ".$coauthorsToDelete[0];
			}
			HC_debugLog($query);
			self::$db->query($query);
		}
		
		if (count($coauthorsToAdd) > 0) {
			$query = 'INSERT INTO objects_users (object_id, user_id, access_right_id,'
				. 'created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())';

			foreach ($coauthorsToAdd as $coauthor) {
				$coauthor = (int)$coauthor;
				$accessRight = 7;
				$params = array('type' => 'iii', &$this->id, &$coauthor, &$accessRight);
				$this->writeQuery($query, $params);
			} 
		}
	}
	
	/**
	 * Update bookmarks.
	 * 
	 * @param type $objectId
	 * @param array of LinkedBooks $newLinkedBooks 
	 */
	public function updateBookmarks () {
		// get all book_objects from database
		$query = "SELECT id, book_id, page_no FROM book_objects WHERE object_id = ?";
		$result = $this->query($query, array('type' => 'i', &$this->id));
		// diff against existing ones, based on page number
		$existing_bookmarks = array();
		foreach ($result as $row) {
			$existing_bookmarks[$row['book_id']."//-//".$row['page_no']] = $row;
		}
		$new_bookmarks = array();
		foreach ($this->bookmarks as $row) {
			$new_bookmarks[$row->book->id.'//-//'.$row->pageNo] = $row;
		}
		// Those in the database but not in $new_bookmarks have to be deleted
		$deletes = array_diff(array_keys($existing_bookmarks), array_keys($new_bookmarks));
		// Those in $new_bookmarks but not in the db have to be added
		$creates = array_diff(array_keys($new_bookmarks), array_keys($existing_bookmarks));
		$records_to_create = array_map(function ($hash) use ($new_bookmarks) {
			return $new_bookmarks[$hash];
		}, $creates);
		$ids_to_delete = array_map(function ($hash) use ($existing_bookmarks) {
			return $existing_bookmarks[$hash]['id'];
		}, $deletes);
		//print_r ($ids_to_delete);
		if (count($ids_to_delete) > 0) {
			$query = "DELETE FROM book_objects WHERE ";
			if (count($ids_to_delete) > 1) {
				$query .= " id IN (".implode(',', $ids_to_delete).")";
			} elseif (count($ids_to_delete) == 1) {
				$query .= " id = ".end($ids_to_delete);
			}
			self::$db->query($query);
		}
		foreach ($creates as $create_id) {
			$new_bookmarks[$create_id]->commit($this->id);
		}
	}

	public function delete() {
		// delete mappings
		// preemptively load parents in order to have them to recalculate bounds
		$this->getParents();
		$query = "UPDATE object_relations SET object_state_id = " . \HC_OBJECT_DELETED . " WHERE object_id = ?";
		$this->writeQuery($query, array('type' => 'i', &$this->id));
		//$query = "UPDATE objects_maps SET object_state_id = ".\HC_OBJECT_DELETED." WHERE object_id = ?";
		//$this->writeQuery ($query, array ('type' => 'i', &$this->id));
		// set self to 'deleted'
		$query = "UPDATE objects SET object_state_id = 5 WHERE id = ?";
		Log::write("Set status of object $this->id to 'deleted'.");
		$this->writeQuery($query, array('type' => 'i', &$this->id));
		$db = database::getInstance();
		foreach ($this->parents as $parent) {
			$parent->removeObject($this);
		}
		//$db->preparedQuery ($query, array ('type' => 'i', &$this->id));
		//print $query .= $this->id;
	}

	public function getUsers() {
		$db = database::getInstance();
		// get owner
		$query = "SELECT u.id, u.email, u.first_name, u.last_name FROM users u WHERE u.id = ?";
		$db->preparedQuery($query, array('type'=>'i', &$this->owner));
		$result = $db->preparedGetRows();
		$this->users[] = User::buildFromArray($result[0]);
		// get users and names
		$query = "SELECT ou.user_id AS id, ou.access_right_id AS access_right, u.email"
				. " FROM objects_users ou, users u"
				. " WHERE ou.object_id = ? AND ou.user_id = u.id AND ou.access_right_id > 1;";
		$db->preparedQuery($query, array('type' => 'i', &$this->id));
		$result = $db->preparedGetRows();
		if ($result) {
			foreach ($result as $row) {
				@$this->users[] = User::buildFromArray($row);
			}
		}
		//if ($owner && array_search($owner, $this->users) === FALSE) $this->users[] = $owner;
		return $this->users;
	}

	public function addMapping($data) {
		$this->mapping = $data;
	}

	public function addChild($child) {
		$this->objects[] = $child;
	}

	public function addCoauthors($data) {
		$this->coauthors[] = $data['user_id'];
	}

	public function addObject($object, $index = -1, $delayBoundsRecalculation = FALSE) {
		if ($object instanceof DatabaseModel) {
			// check permissions
			// NOTE: Calling checkCirularity returns TRUE if inserting an object
			// would create a circular object, and FALSE if it won't. Therefore, a
			// FALSE result is a desirable outcome, counterintuitively.
			if ($this->checkCircularity($object)) {
				throw new UpdateFailureException($object->id, "Adding $object->id ($object->title)"
						. " to collection $this->id ($this->title) creates circular reference.");
			} else {
				if ($index == -1) {
					$this->children[] = $object;
				} else {
					$this->children = array_merge(
									array_slice($this->children, 0, $index - 1),
									$object,
									array_slice($this->children, $index)
					);
}
			}
			/*if (!$delayBoundsRecalculation)
				$this->recalculateBounds();*/
		} else {
			Log::write("Attempted to add object not derived from type DatabaseModel"
							. " to Collection $this->id ($this->title): " . print_r($object, TRUE)
			);
		}
	}

}

?>
