<?php

namespace HyperCities\Provider;

// models
use HyperCities\Provider\ItemManagement\DatabaseModel;
use HyperCities\Provider\ItemManagement\RichMediaObject;
use HyperCities\Provider\ItemManagement\Collection;
use HyperCities\Provider\ItemManagement\Content;
use HyperCities\Provider\ItemManagement\Map;
use HyperCities\Provider\Authentication\User;
use HyperCities\Provider\Authentication\UserNotAuthenticated;
// errors and messages
use HyperCities\Provider\ItemManagement\BadRequestError;
use HyperCities\Provider\ItemManagement\InsufficientPrivileges;
use HyperCities\Provider\ItemManagement\CreatedMessage;
use HyperCities\Provider\ItemManagement\ChangedMessage;
use HyperCities\Provider\ItemManagement\ItemLocate;
use HyperCities\Provider\ItemManagement\FeatureStore;
use HyperCities\Provider\ItemManagement\MapStore;
use HyperCities\Provider\ItemManagement\BookStore;
use HyperCities\Provider\ItemManagement\JsonDocParser;
use \database, \updateColTimeBoundBottomUp;
use HyperCities\Provider\Log;

/**
 * Helper function. Shorthand for checking if user is logged in and throwing exception
 * if not.
 * 
 * @param Request $request
 * @throws UserNotAuthenticated if the user has not been authenticated.
 */
function require_login (Request $request) {
	if (!isset($request->user) || !$request->user) {
		throw new UserNotAuthenticated("Sorry, login required to perform this function.");
	}
}

/**
 * Throws exception if method has not been accessed over HTTPS.
 * @return boolean true if HTTPS is enabled.
 * @throws Authentication\AuthenticationError
 */
function require_https () {
	if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
	else throw new Authentication\AuthenticationError ("This method must be accessed over HTTPS.");
}

/**
 * Handles all external requests for objects and maps.
 *
 * @param Request $request
 * @return Collection
 */
function get_objects(Request $request) {
	Log::write("Doing search request with Datastore to get objects of type " . print_r($request->itemType, TRUE));
	
	if ($request->itemType == 'maps') {
		$datastore = MapStore::getInstance();
	} elseif ($request->itemType == 'books') {
		$datastore = BookStore::getInstance();
	} else {
		$datastore = FeatureStore::getInstance();
	}
	//$data = $request->requestData;
	//$search_engine->initialize($request);
	$result = $datastore->process($request);
	if (count($result) == 0) {
		throw new ItemManagement\ItemNotFound("Nothing found for supplied criteria.");
	}
	if (is_array($result) && count($result) == 1) {
		$result = $result[0];
	}
	$criteria = array();
	if ($result instanceof Collection) {
		if ($request['start'] && $request['end']) {
			$criteria['start'] = $request['start'];
			$criteria['end'] = $request['end'];
		}
		if (isset($request['bbox'])) {
			$criteria['bbox'] = $request['bbox'];
		} elseif (isset($request['neLat'])) {
			$criteria['neLat'] = $request['neLat'];
			$criteria['neLon'] = $request['neLon'];
			$criteria['swLat'] = $request['swLat'];
			$criteria['swLon'] = $request['swLon'];
		} elseif (isset($request['north'])) {
			$criteria['neLat'] = $request['north'];
			$criteria['neLon'] = $request['east'];
			$criteria['swLat'] = $request['south'];
			$criteria['swLon'] = $request['west'];
		}
		$deep = FALSE;
		if (isset($request['deep'])) {
			$deep = (int)$request['deep'];
		}
		if ($deep !== -1) {
			get_children($result, $criteria, $deep);
		}
	} elseif (is_array($result)) {
		foreach ($result as $row) {
			get_children($row, $criteria);
		}
    }
	$datastore->loadAll();
	$ms = MapStore::getInstance();
	$ms->loadAll();
	if (!$result) {
		throw new NotFoundError("No items found for supplied criteria.");
	} else {
		return $result;
	}
}

/**
 * Not a request handler; used for deep queries by get_objects above.
 *
 * @param array $collection
 * @param array $criteria
 */
function get_children($collection, array $criteria, $deep = FALSE) {
	$fs = FeatureStore::getInstance();
	if ($collection instanceof Collection) {
		$criteria['parentId'] = $collection->id;
		$objects = $fs->doSearch($criteria);
		$collection->children = $objects;
		if ($deep) {
			if (is_array($objects) && count($objects) > 0) {
				$i = 0;
				foreach ($objects as $obj) {
					if ($obj instanceof Collection) {
						get_children($obj, $criteria);
					}
					$i++;
				}
			} elseif ($objects instanceof Collection) {
				get_children($objects, $criteria);
			}
		}
	}
}

/**
 * Responds to /roots
 * @global array $HC_BASE_COLLECTIONS_ID
 * @param Request $request
 * @return array Models
 */
function get_roots(Request $request) {
	$HC_BASE_COLLECTIONS_ID = array(1, 3, 4);//, 5);
	$fs = FeatureStore::getInstance();
	$models = array();
	foreach ($HC_BASE_COLLECTIONS_ID as $id) {
		$model = $fs->doSearch(array('objectType' => 'collections', 'objectId' => $id, 'userIsAdmin' => 0));
		$models[] = $model[0];
	}
	$fs->loadAll();
	return $models;
}

function get_related_collections_for_book(Request $request) {
	$server = new ItemManagement\BookServer();
	return $server->handle($request->url, 'GET', $request);
}

/**
 * Creates a new object, map, or collection.
 *
 * @param Request $request
 * @return CreatedMessage 
 */
function create_objects(Request $request) {
	if (!(isset($_SERVER['HTTPS']) || (isset($request->user) || !$request->user))) {
		throw new Authentication\AuthenticationError("Authentication Failure or HTTPS failure.");
	}
	Log::write("Received request to create object.");
	if (isset($request['doc']) || isset($request['docUrl'])) {
		return parse_json_doc($request);
	}
	// infer which kind of object we're trying to create by parsing the URL
	$model = NULL;
	$data = $request->requestData;
	if ($request->user) {
		$user = $request->user;
	} else {
		$user = User::buildFromEmail($request['owner']);
		if (!$user) {
            throw new UserNotAuthenticated("Sorry. You must be logged in to edit an object.");
        }
		$data['ownerId'] = $user->id;
	}

	$type = '';

	if ($request->url[0] == 'objects') {
		$model = new RichMediaObject($data);
	} elseif ($request->url[0] == 'maps') {
		$model = new Map($data);
	} elseif ($request->url[0] == 'collections') {
		$model = new Collection($data);
	}
	if ($model == NULL) {
		throw new BadRequestError($type, "CREATE", "Item type not found.");
	} else {
		$message = $model->commit();
		if ($message === FALSE) {
			return new CreatedMessage($data['objectType'], "Item Created", 0);
		}
	}
	// place this object in appropriate collections
	Log::write("Item created with id $model->id: $model->title");
	add_object_to_collections($model, $request, NULL, $user);
	return new CreatedMessage($data['objectType'], "Item created", $model->id);
}

function add_object_to_collections($model, Request $request, $collections = null, $user = NULL) {
	if (!$user) $user = $request->user;
	if (isset($request['parents'])) {
		$collectionPasswords = array();
		if (isset($request['collectionPasswords'])) {
			$raw_pwd_data = json_decode(stripslashes($request['collectionPasswords']), TRUE);
			if (is_array($raw_pwd_data)) {
				foreach ($raw_pwd_data as $pwd) {
					$collectionPasswords[(string) $pwd['id']] = $pwd['password'];
				}
			}
		}
		$fs = FeatureStore::getInstance();
		if (is_null ($collections)) {
			$collections = $fs->doSearch(array(
					'objectId' => $request['parents']
				));
			$fs->loadAll();
		} elseif (is_array($collections) && $collections != array()) {
			$collections = $fs->doSearch(array(
					'objectId' => implode(',', $collections)
				));
			$fs->loadAll();
		}
		foreach ($collections as $collection) {
			$validated = FALSE;
			if (count($collectionPasswords) > 0) {
				if (isset($collectionPasswords[(string) $collection->id])) {
					$validated = $collection->addObjectWithPassword($model, $collectionPasswords[(string) $collection->id]);
				}
			}
			if (!$validated) {
				$validated = $collection->addObjectAsUser($model, $user);
			}
			if ($validated) {
				$collection->commitRelations();
			}
		}
	}
}

/**
 * Updates an existing object, map, or collection.
 * 
 * @param Request $request
 * @return ChangedMessage 
 */
function update_objects(Request $request) {
	require_login($request);
	$id = $request->itemId;
	//Log::write("Received request to update object/collection # $id");
	if ($request->user) {
		$user = $request->user;
	} else {
		throw new UserNotAuthenticated("Sorry. You must be logged in to edit an object.");
	}

	// get original item
	$model = NULL;
	$fs = FeatureStore::getInstance();
	if ($request->itemType == 'maps') {
		$model = new Models\Map($request->itemId);
	} else {
		switch ($request['objectType']) {
			case 2:
				$model = new Collection($request->itemId);
			default:
				$model = $fs[$request->itemId];
				break;
		}
	}
	// if it doesn't exist, throw not found error
	// TODO: check permissions on object

	if (!$model)
		throw new ItemNotFound("Object $id not found.");

	// handle KML upload
	// NOTE: short-circuits and exits once we enter this block. This is intentional,
	// because uploading a KML file has its own logic
	if (!empty($_FILES)) {
		if (is_uploaded_file($_FILES['HCKmlFile']['tmp_name'])) {
			$fileContents = file_get_contents($_FILES['HCKmlFile']['tmp_name']);
		} else {
			throw new ItemManagement\ItemNotFound("Sorry, you have requested access to a file that was not uploaded.");
		}
		$success = parse_kml_document($fileContents, $user, $model);
		if ($success) return new ChangedMessage($model->objectType, "UPDATED", "KML File used to update this object.");
		// TODO: implement error-handling code
		else return false;
	}
 	// get old parents
	// apply new values
	$model->updateWithArray($request);
	$message = $model->commit();
	// If we're in TEST mode ...
	if ($message == FALSE) {
		return new ChangedMessage("Rich Media Object", "Updated", "Object $model->id updated.");
	}
	$collectionIds = explode(',', $request['parents']);
	$original_parents = array();
	$db = database::getInstance();
	$modelId = $model->id;
	Log::write("Updating collection memberships.");
	$query = "SELECT obr.object_id FROM object_relations obr, objects o"
			." WHERE obr.subject_id = ? AND o.object_type_id = 2 AND o.id = obr.object_id";
	$db->preparedQuery($query, array('type' => 'i', &$modelId));
	$result = $db->preparedGetRows();
	foreach ($result as $row) {
		$original_parents[] = $row['object_id'];
	}
	$parents_to_keep = array_intersect($original_parents, $collectionIds);
	$parents_to_drop = array_diff($original_parents, $collectionIds);
	$parents_to_add = array_diff($collectionIds, $original_parents);
	Log::write('Parents snapshot: To Keep: ' . print_r($parents_to_keep, TRUE));
	Log::write('Parents snapshot: To Drop: ' . print_r($parents_to_drop, TRUE));
	Log::write('Parents snapshot: To Add: ' . print_r($parents_to_add, TRUE));
	// TODO: use the parent's ID ahead of time
	foreach ($parents_to_keep as $parent) {
		@updateColTimeBoundBottomUp((int) $parent);
	}
	foreach ($parents_to_drop as $parent) {
		// delete from DB
		$db->preparedQuery("DELETE FROM object_relations WHERE object_id = ? AND subject_id = ?",
				array('type' => 'ii', &$parent, &$modelId)
		);
		// recalculate bounds
		@updateColTimeBoundBottomUp((int)$parent);
	}
	add_object_to_collections($model, $request, $parents_to_add);
	return new ItemManagement\ChangedMessage("Rich Media Object", "Updated", "Object $model->id updated.");
}

function delete_object(Request $request) {
	require_login();
	if ($request->user) {
		$user = $request->user;
	} else {
		throw new UserNotAuthenticated("Sorry. You must be logged in to delete an object.");
	}
	$model = NULL;
	switch ($request->itemType) {
		case 'objects':
			$model = new RichMediaObject($request->itemId);
			break;
		case 'collections':
			$model = new Collection($request->itemId);
			break;
		case 'maps':
			$model = new Map($request->itemId);
			break;
	}
	$user = new User($request['userId']);
	if ($user->checkPrivileges("DELETE", $model->id)) {
		$model->delete();
	} else {
		throw new InsufficientPrivileges($model->id, "DELETE", "Sorry, you are not allowed to delete this object.");
	}
	return new ChangedMessage("object", "DELETED", "Object $model->id deleted.");
}

function get_content (Request $request) {
	// get content by id
	if ($request->url[0] == 'contents' || $request->url[0] == 'descriptions') {
		$query = "SELECT c.id, o.id AS object_id, content FROM contents c, objects o "
				." WHERE c.id = o.content_id AND c.id ";
	} elseif ($request->url[0] == 'objects') { // get content for an object
		$query = "SELECT c.id, c.content, o.description FROM contents c, objects o "
				." AND o.id ";
	}
	if ($request->itemId == 'list') {
		$temp_ids = array();
		foreach (explode(',', $request['ids']) as $id) {
			$temp_ids[] .= (int) $id;
		}
		$query .= " IN (" . implode(',', $temp_ids) . ")";
	} else {
		$query .= ' = '.(int)$request->itemId;
	}
	$db = database::getInstance();
	$result = $db->query($query);
	$result = $db->getRows();
	if (count($result) == 0) {
		throw new ItemManagement\ItemNotFound("No content found for specified item.");
	} elseif (count($result) == 1) {
		if ($result[0]['content']) $return = new Content($result[0]['content'], $result[0]['id'], $result[0]['object_id']);
		else $return = new Content($result[0]['content'], $result[0]['id'], $result[0]['object_id']);
	} else {
		$return = array();
		foreach ($result as $row) {
			$return[] = new Content($row['content'], $row['id'], $row['object_id']);
		}
	}
	return $return;
}


/**
 * Parse a JSON doc from another HyperCities web feed and turn it into a series of objects.
 * 
 * Important notes:
 * This has a switch, specified in the URL. 'update', if set to false, or not set,
 * will create new objects from every object in the feed. If set to true, it will
 * attempt to update existings objects with that ID. First, though, it will check
 * the user's permissions. If IDs that do not exist in the database are found, it
 * will generate new objects from those objects.
 *
 * @param Request $request
 * @return CreatedMessage
 */
function parse_json_doc (Request $request) {
	require_login ($request);
	// check what we have -- if it's a doc, or if it's a url
	$docData = NULL;
	$update = FALSE;
	if ($request['update'] && $request['update'] = 'true') {
		$update = TRUE;
	}
	$user = $request->user;
	if (isset ($request['docUrl'])) {
		$ch = curl_init($request['docUrl']);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		// default setting is GET; no need to set method
		$raw = curl_exec($ch);
		$docData = json_decode($raw, TRUE);
	} else {
		$docData = $request['doc'];
	}
	$doc = new JsonDocParser($docData, $user);
	$root = $doc->parse($update);
	$status = $doc->commit();
	if ($status == TRUE) {
		$fs = FeatureStore::getInstance();
		if ($root->model instanceof Collection) {
			Log::write("Adding collection to existing collection.");
			$fs[$user->myCollectionsId]->addObjectAsUser ($root->model, $user);
		} else {
			Log::write("Adding collection to new collection.");
			$container_data = $docData;
			unset ($container_data['id']);
			$container = new Collection($container_data);
			$container->commit();
			$container->addObjectAsUser($root->model, $user);
			$container->commitRelations();
			$fs[$user->myCollectionsId]->addObjectAsUser ($root->model, $user);
		}
		$fs[$user->myCollectionsId]->commitRelations();		
		calculateCollectionBoundary($root->model->id);
		return new CreatedMessage("objects", "Successfully parsed JSON document."
											." The following IDs were returned: ", implode(",", $doc->getIds()));
	}
	$allowed_functions = array (
		'new_objects'		=> 'POST => /objects', // this is what is currently implemented; a new collection will be created with these objects
		'new_collection'	=> 'POST => /collections', // if objects have IDs, they will be overwritten
		'update_collection' => 'POST => /collections/{num}',
		'update_object'		=> 'POST 1 object to /objects/{num}',
	);
	// link all the top-level objects to the user's My Collections
}

class UserMessage extends Message {
	//public $code = 200;

	public function __construct ($message) {
		$this->code = 200;
		$this->message = $message;
	}
}

/**
 * Responds to: GET /services/emailValidate
 */
function validate_users (Request $request) {
	$db = database::getInstance();
	$foundUsers = array();
	$query = "SELECT id FROM users WHERE email = ?";
	$params = array ("type" => "s");
	//$userEmails = explode(',', urldecode($request['userEmails']));
	$userEmails = explode(',', $request['userEmails']);;
	if (!$userEmails || !$userEmails[0]) {
		throw new BadRequestError("USERS", "VALIDATE", "List of emails not formatted correctly.");
	}
	foreach ($userEmails as $email) {
		$params[0] = &$email;
		$db->preparedQuery($query, $params);
		if (count($db->preparedGetRows()) == 1) $foundUsers[] = $email;
	}
	if (count($foundUsers) == count($userEmails)) {
		return new UserMessage("All users recognized.");
	} else {
		$uniqueMissingUsers = array_unique(array_diff($userEmails, $foundUsers));
		throw new ItemManagement\ItemNotFound("The following users are not recognized: ".print_r ($uniqueMissingUsers, TRUE));
	}
}

/**
 * Called by create_objects or update_objects, if it discovers that there is a document in
 * the request. This returns the appropriate collection object, which it is the caller's
 * responsibility to commit.
 *
 * @param Request $request
 */
function parse_kml_document ($kml, $user, $collection = NULL) {
	//require_login ($request);
	$parser = new KmlParser($collection);

	$parser->parseKml($kml);
	// get KML document
	// parse it
	// either create new collection or update collection depending on params
	// use $parser->objectList to create new/locate existing collection and update
	// it
	// if it succeeds ...
	return TRUE;
}

?>
