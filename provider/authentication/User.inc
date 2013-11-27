<?php

namespace HyperCities\Provider\Authentication;
use \database;
use HyperCities\Provider\DatabaseError;
/**
 *
 * A user in the webservice.
 *
 * @author David Shepard
 */

class User {
	public $username, $email, $id, $sessionKey, $myCollectionsId, $firstName, $lastName;

	public function buildFromEmail($email) {
		$db = database::getInstance();
		$result = $db->preparedQuery("SELECT u.first_name, u.last_name, u.email, u.id, "
				. " o.id AS my_collections_id FROM users u, objects o WHERE u.email = ? AND o.owner_id = u.id"
				. " and o.title = 'My Collections'", array('type' => 's', &$email));
		$result = $db->preparedGetRows();
		$row = $result[0];
		$user = new User();
		$user->email = $row['email'];
		$user->username = $row['first_name'] . ' ' . $row['last_name'];
		$user->firstName = $row['first_name'];
		$user->lastName = $row['last_name'];
		$user->id = $row['id'];
		$user->myCollectionsId = $row['my_collections_id'];
		return $user;
	}

	public function __construct($id = null) {
		if ($id) {
			$id = (int)$id;
			$db = database::getInstance();
			$result = $db->preparedQuery ("SELECT u.first_name, u.last_name, u.email,"
					." o.id AS my_collections_id FROM users u, objects o WHERE u.id = ? AND o.owner_id = ?"
					." and o.title = 'My Collections'",
					array ('type' => 'ii', &$id, &$id));
			if (!$result) {
				throw new UserNotFoundException ($id);
			}
			$result = $db->preparedGetRows();
			$row = $result[0];
			$this->email = $row['email'];
			$this->username = $row['first_name'].' '.$row['last_name'];
			$this->firstName = $row['first_name'];
			$this->lastName = $row['last_name'];
			$this->id = $id;
			$this->myCollectionsId = $row['my_collections_id'];
		}
	}

	public static function buildFromArray (array $item) {
		$user = new User();
		$user->id = $item['id'];
		$user->firstName = $item['first_name'];
		$user->lastName = $item['last_name'];
		$user->email = $item['email'];
		return $user;
	}

	public function __get($key) {
		switch ($key) {
			case 'sessionKey':
				return $this->sessionKey;
				break;
			case 'id':
				return $this->id;
				break;
			case 'myCollectionsId':
				return $this->myCollectionsId;
				break;
		}
	}

	public function setSessionKey ($sessionKey) {
		$this->sessionKey = $sessionKey;
	}

	public static function getFromSession ($sessionId) {
		$db = database::getInstance();
		$result = $db->preparedQuery("SELECT user_id FROM webservice_sessions WHERE session_id = ?", array ('type' => 's', &$sessionId));
		if (!$result) {
			throw new SessionDoesNotExistException ($sessionId);
		}
		$row = $db->preparedGetRows();
		return new self($row[0]['user_id']);
	}

	/**
	 *
	 * @param <type> $action
	 * @param <type> $item
	 * @return <type>
	 * @throws DatabaseError, DeletedObjectException
	 */
	public function checkPrivileges ($action, $item) {
		$db = database::getInstance();
		// check role in database
		// First, check object's permissions in database
		//print "Item: ".$item;
		$action = strtolower($action);
		$result = $db->query ("SELECT owner_id, object_state_id FROM objects WHERE id = ".(int)$item);
		if ($result) {
			$result = $db->getRows();
			$objectState = $result[0]['object_state_id'];
			$owner = $result[0]['owner_id'];
			// Test if user has appropriate privileges
			// If user is owner, they can do aynthing; return true
			switch ($objectState) {
				case '1': // If it's a public collection, anyone can add to it.
					if ($action == 'add') return true;
					break;
				case '2': // If it's a protected collection, the owner can add to it; anyone else may have designated prviledges
					if ($owner == $this->id) return true;
					// Do nothing else; we have to check access rights
					break;
				case '3':
					if ($owner == $this->id) return true;
					// Do nothing else; we have to check access rights
					break;
				case '5':
					throw new DeletedObjectException();
					break;
			}
			// Now, get access rights from the database
			$result = $db->query ("SELECT access_right_id FROM objects_users WHERE object_id = $item AND user_id = ".(int)$this->id );
			if ($result) {
				$result = $db->getRows();
				if (count($result) == 0 || $result[0]['access_right_id'] == 0) return false;
				else $accessRight = $result[0]['access_right_id'];
			} else {
				return false;
			}
			switch ($accessRight) {
				// If a_r_id is 7, return true
				case '7':
					return true;
					break;
				case '5':
					if ($action == 'view' || $action == 'delete') return true;
					else return false;
					break;
				case '3':
					if ($action == 'view' || $action == 'edit') return true;
					else return false;
					break;
				case '2':
					if ($action == 'edit' || $action == 'view') return true;
					else return false;
					break;
				case '1':
					if ($action == 'view') return true;
					else return false;
					break;

				// If action is "View," and level is at least 1, return true
				// If
			}

		} else {
			throw new DatabaseError("Attempting to get user access rights to do Action $action on Item $item.");
		}
		// If it's OK, send it back
		// Default to false:
		return false;
	}
}
?>
