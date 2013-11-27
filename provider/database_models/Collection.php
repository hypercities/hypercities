<?php

namespace HyperCities\Provider\ItemManagement;
use \DateTimeZone, \database, \checkCircular;
use HyperCities\Provider\Authentication\MoodlePermissionsController;
use HyperCities\Provider\Authentication\PermissionSet;

/**
 * Represents a HyperCities collection in memory.
 *
 * @author David Shepard
 * @copyright Copyright 2010, Regents of the University of California
 */

class Collection extends RichMediaObject {

	public	$visibleChildren = array(),
			$children = array();
	private $permissionsController = NULL;
	protected	$itemName = 'collection';

	public function  __construct($data = NULL, $id = NULL) {
		$this->requiredFields = array('title', 'creator', 'owner', 'copyright',
			'objectType', 'mapping',
		);
		parent::__construct($data, $id);
	}

	public function __construct_from_id($id, $loadNow = false) {
		parent::__construct_from_id($id, $loadNow);
		$this->objects = &$this->children;
	}

	protected function __construct_from_array(array $data) {
		parent::__construct_from_array($data);
		$this->objectType = 2;
		$this->objects = &$this->children;
		if (isset($data['name']))
			$this->title = stripslashes($data['name']);
		if (isset($data['description'])) {
			$this->description = stripslashes($data['description']);
		}
		if (isset($data['external_permissions_id'])) {
			$this->externalPermissionsId = $data['external_permissions_id'];
		}
		if (isset($data['external_permissions_id']) && $data['external_permissions_id'])
			$this->loadExternalPermissions($data['external_permissions_id']);
	}

	private function loadExternalPermissions ($id) {
		$query = "SELECT url, additional_data FROM external_permissions WHERE id = ?";
		$db = database::getInstance();
		$objId = $id;
		$result = $db->preparedQuery($query, array('type' => 'i', &$objId));
		$result = $db->preparedGetRows();
		if (count($result) > 0) {
			$this->permissionsController = new MoodlePermissionsController($result[0]['url'], $result[0]['additional_data']);
		} else {
			print "Problem loading external permissions.";
		}
	}

	protected function create () {
		if (!$this->objectType) {
			$this->objectType = 2;
		}
		if (!$this->mapping) {
			$this->mapping = new Mapping(
				array (
					'north' => 90.0,
					'east'	=> 180.0,
					'south'	=> -90.0,
					'west'	=> -180.0,
					//'dateFrom' => new \DateTime("-9999-12-31", new DateTimeZone("America/Los_Angeles")),
					//'dateTo' => new \DateTime("9999-12-31", new DateTimeZone("America/Los_Angeles")),
					'dateFrom' => "-9999-12-31",
					'dateTo' => "9999-12-31",
					'objectType' => 2,
					'markerType' => 4,
					'markerState' => 0,
					'objectState' => 0,
					'zoom'	=> 0,
				)
			);
		}
		parent::create();
	}

	private function getUserPermissions ($user) {
		$permissions = new PermissionSet();
		$permissions->addTo = FALSE;
		$permissions->edit = FALSE;
		$permissions->delete = FALSE;
		/*if ($this->isNewObject()) {
			$permissions->addTo = TRUE;
			$permissions->edit = TRUE;
			$permissions->delete = TRUE;
		}*/
		if (is_numeric($user)) {
			$user = new HyperCities\Provider\Authentication\User($user);
		}
		if (!$this->title) $this->load ();
		if ($this->state == \HC_OBJECT_PUBLIC && !$this->permissionsController) {
			$permissions->addTo = TRUE;
			$permissions->delete = TRUE;
		} elseif ($this->owner == $user->id) {
			$permissions->addTo = TRUE;
			$permissions->delete = TRUE;
			$permissions->edit = TRUE;
		} elseif ($this->permissionsController) {
			$permissions = $this->permissionsController->checkAccess($this->id, $user);
		} else {
			$query = 'SELECT access_right_id FROM objects_users WHERE object_id = ? AND user_id = ?';
			$db = database::getInstance();
			$db->preparedQuery($query, array('type' => 'ii', &$this->id, &$user->id));
			$result = $db->preparedGetRows();
			if (count($result) > 0) {
				if ((int) $result[0]['access_right_id'] > 2) {
					$permissions->addTo = TRUE;
				} else {
					//throw new InsufficientPrivileges($this->id, "Add object", "User has insufficient privileges to add an object to collection $this->id.");
					$permissions->addTo = FALSE;
				}
			} else {
				//throw new InsufficientPrivileges($user->id, "Add object", "User has insufficient privileges to add an object to collection $this->id.");
				$permissions->addTo = FALSE;
			}
		}
		return $permissions;
	}

	public function addObjectAsUser ($object, $user, $index = -1) {
		//if ($canAdd) $this->addObject($object, $index);
		$userPerms = $this->getUserPermissions($user);
		if ($userPerms->addTo == TRUE) $this->addObject($object, $index);
		else {
			throw new InsufficientPrivileges($this->id, "Add object", "User has insufficient privileges to add an object to collection # $this->id.");
		}
		return TRUE;
	}

	public function addObjectWithPassword($object, $password, $index = -1) {
		$query = "SELECT password FROM objects WHERE id = ?";
		$id = $this->id;
		$db = database::getInstance();
		$db->preparedQuery($query, array('type' => 'i', &$id));
		// TODO: handle not finding collections
		$result = $db->preparedGetRows();
		if (count($result) > 0) {
			$db_pass = $result[0]['password'];
		} else {
			throw new NotFoundError();
		}
		if ($password == $db_pass) {

			$this->addObject($object, $index);
			return TRUE;
		} else {
			throw new InsufficientPrivileges($this->id, "Add object", "Password does not match.");
		}
	}

	private function checkCircularity ($object) {
		return checkCircular($object->id, array($this->id));
	}

	public function addObject($object, $index = -1, $delayBoundsRecalculation = FALSE) {
		if (!$this->children) {
			$fs = FeatureStore::getInstance();
			$this->children = $fs->doSearch(array ('parentId' => $this->id));
		}
		if ($object instanceof DatabaseModel) {
			// check permissions
			//if ($object instanceof self) {
			// NOTE: Calling checkCirularity returns TRUE if inserting an object
			// would create a circular object, and FALSE if it won't. Therefore, a
			// FALSE result is a desirable outcome, counterintuitive.
			// NOTE: Disabled 10-28-10 because of memory overruns
			/*if ($this->checkCircularity($object)) {
				throw new UpdateFailureException($object->id, "Adding $object->id ($object->title)"
						. " to $collection $this->id ($this->title) creates circular reference.");
			} else {*/
				if ($index == -1) {
					$this->children[] = $object;
				} else {
					$this->children = array_merge(
									array_slice($this->children, 0, $index - 1),
									$object,
									array_slice($this->children, $index)
					);
				}
			//}
			/*if (!$delayBoundsRecalculation)
				$this->recalculateBounds();*/
		} else {
			Log::write("Attempted to add object not derived from type DatabaseModel"
							. " to Collection $this->id ($this->title): " . print_r($object, TRUE)
			);
		}
	}

	public function addObjects(array $objects) {
		foreach ($objects as $object) {
			$this->addObject($object, FALSE);
		}
		$this->recalculateBounds();
	}

	public function removeObjectAsUser ($user, $object) {
		if ($this->getUserPermissions($user)->delete == FALSE) {
			throw new \InsufficientPriviledges($user, "Remove object", $object);
		} else {
			$query = "UPDATE object_relations SET object_state_id = " . \HC_OBJECT_DELETED
				. ' WHERE object_id = ? AND subject_id = ?';
			$result = $this->writeQuery($query, array('type' => 'ii', &$this->id, &$object->id));
		}
		$this->recalculateBounds(TRUE);
	}

	public function removeObject($object, $delayBoundsRecalculation = FALSE) {
		// remove object from collection: delete relation from database
		$query = "UPDATE object_relations SET object_state_id = " . \HC_OBJECT_DELETED
				. ' WHERE object_id = ? AND subject_id = ?';
		$result = $this->writeQuery($query, array('type' => 'ii', &$this->id, &$object->id));

		// contract mapping
		//$this->mapping->contract ($object->mapping);
		//$this->recalculateBounds (TRUE);
		// if !$delayBoundsRecalculation commit mapping
	}

	public function recalculateBounds($hard = FALSE) {
		if (!$hard) {
			// just commit mapping
		} else {
			\updateColTimeBoundBottomUp($this->id);
		}
	}

	public function setChildren(array $children) {
		$this->children = $children;
	}

	public function getChildren(array $criteria) {
		// load all children
		$fs = FeatureStore::getInstance();
		$criteria['parentId'] = $this->id;
		$this->children = $fs->doSearch($criteria);
	}

	public function commitChildren () {
		parent::commitChildren();
		return $this->commitRelations();
	}

	public function commitRelations() {
		// if not committed, we need to commit this
		$isCommitted = FALSE;
		if (!$this->id) {
			$this->commit(DatabaseModel::FORCE_CREATE);
			$isCommitted = TRUE;
		}
		// check to make sure that we're not inserting duplicates -- get child
		// IDs already in database and drop them from list
		//
		$query = "SELECT id, subject_id FROM object_relations WHERE object_id = ? ";
		$db = database::getInstance();
		$db->preparedQuery($query, array('type' => 'i', &$this->id));
		$result = $db->preparedGetRows();
		// check against all in the database
		$current_ids = array();
		$orders = array();
		$i = 1;
		foreach ($this->children as $child) {
			$current_ids[] = $child->id;
			$orders[$child->id] = $i;
			$i++;
		}
		$ids_from_db = array();
		if ($result) {
			foreach ($result as $row) {
				$ids_from_db[] = $row['subject_id'];
			}
			$new_ids = array_diff($current_ids, $ids_from_db);
		} else {
			$new_ids = $current_ids;
		}
		$ownerId = 0;
		if ($this->owner instanceof \HyperCities\Provider\Authentication\User) {
			$ownerId = $this->owner->id;
		} else {
			$ownerId = $this->owner;
		}
		// then add them to the database
		foreach ($new_ids as $id) {
			$query = "INSERT INTO object_relations (object_id, subject_id, owner_id,"
					." scope_id, `order`, created_at, updated_at) VALUES (?, ?, ?,"
					." ?, $orders[$id], NOW(), NOW())";
			$db->preparedQuery($query, array('type' => 'iiii', &$this->id, &$id, &$ownerId, &$this->id));
		}
		$this->recalculateBounds(TRUE);
		return $isCommitted;
	}
}

?>
