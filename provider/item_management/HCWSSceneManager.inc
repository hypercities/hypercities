<?php

/**
 * Manages creating, updating, and deleting scenes.
 *
 * @author daveshepard
 */

class HCWSSceneManager extends HCWSItemManager {

    public static function handle (HCWSRequest $request, HCWSResponse $response) {
        print "Handling scene request";
        parent::handle($request, $response, get_class());
    }

    public static function create (Target $target, HCWSResponse $response) {
	parent::requires($target, array('id', 'title', 'creator', 'description', 'timespan', 'BBox'));
	parent::checkLogin("create");
        
	$content = $target->requestData['content'];
	$title = $target->requestData['title'];
	$creator = $target->requestData['creator'];
	$user_id = HCWSUserManager::$currentUser->id;
	$objects = explode(',', $target->requestData['objects']);
	$maps = explode(',', $target->requestData['maps']);
	$transparencies = explode(',', $target->requestData['map_transparencies']);
	// NOTE: need to store session keys in objectBank!
	$query = "INSERT INTO contents (content, created_at, updated_at) VALUES (?, NOW(), NOW())";
	$db->preparedQuery ($query, array ('type'=>'s', $target->requestData['content']));
	$content_id = $db->lastInsertId();
	$query = "INSERT INTO objects (title, creator, user_id, content_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())";
	$db->preparedQuery($query, array ('type' =>'ssii', $title, $creator, $user_id, $content_id));
	$object_id = $db->lastInsertId();
	$query = "INSERT INTO object_mappings (ne_lat, ne_lon, sw_lat, sw_lon, kml, dateFrom, dateFrom_IsBC, dateTo, dateTo_isBC, view) "
		."VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?) ;";
	$params = array ('type' => 'iiiissss', $target->requestData['ne_lat'], $target->requestData['ne_lon'], $target->requestData['sw_lat'], $target->requestData['sw_lon'],
		$target->requestData['dateFrom'], $target->requestData['dateFrom_isBC'], $target->requestData['dateTo'], $target->requestData['dateTo_isBC'],
                $target->requestData['zoom']
		);
	$db->query ($query, $params);
	$query = "INSERT INTO object_relations (object_id, subject_id) VALUES ";

	foreach ($objects as $object) {
	    $db->query($query . (int)$object.')');
	}
	$values = array();
	foreach ($objects as $object) {
	    $values[] = '('.$object_id.', '.(int)$object.', NOW(), NOW() )';
	}
	$query .= implode(',', $values);
	$db->query($query);
	$query = "INSERT INTO objects_maps (object_id, map_id, opacity) VALUES ";
	//$params = array('type' => '');
	/*
	for ($i = 0; $i < count($maps); $i++) {
	    $query .= "VALUES ($object_id, ?, ?),";
	    $params['type'] .= 'ii';
	    $params[] = $maps[$i];
	    $params[] = $transparencies[$i];
	}
	 *
	 */
	$params = array();
	for ($i = 0; $i < count($maps); $i++) {
	    //$query .= '('.$object_id.', '.$maps[$i].', '.$transparencies[$i].'),';
	    $params[] = '('.$object_id.', '.(int)$maps[$i].', '.(int)$transparencies[$i].')';
	    //if ($i == count($maps - 1)) $query .= ',';
	}
	$query .= implode(',', $params);
	$db->query($query);
	//$db->preparedQuery($query, $params);
	// Return that the object was created
	$response->addMessage(new ObjectCreatedMessage($object_id));
        // Add to collections
        if ($target->requestData['addTo']) {
            $collections = explode(',', $target->requestData['addTo']);
            foreach ($collections as $collectionId) {
                try {
                    HCWSCollectionManager::addObject($object_id, $collectionId, $target, $response);
                } catch (InsufficientPriviledges $ex) {
                    $response->addError($ex);
                } // end try/catch
            } // end foreach ($collections as $collectionId)
        } // end if ($target->requestData['collections'])
    } // end public static function create

    public static function display (Target $target, HCWSResponse $response) {
	$id = (int)$target->itemId;
        $db = database::getInstance();
        // om.view contains the zoom value
	$query = "SELECT o.id, o.title, ... FROM objects o, object_mappings om, object_relations obr WHERE obr.object_id = $id AND o.id = obr.subject_id AND om.object_id = o.id ;";
	$db->query($query);
	$rows = $db->getRows();
	if (!count($rows) > 0) {
            
	}
	$folderNode = $response->createFolder($id);
	$folder->createAndAppendTextNodes(array (
		'name' => $row['name'],
	));
	foreach ($rows as $row) {

	}
    }

    public static function update (Target $target, HCWSResponse $response) {

    }

    public static function delete (Target $target, HCWSResponse $response) {
	$id = (int)$target->requestData['id'];
	HCWSUserManager::checkPriviledgesForAction("delete", $id);
    }

}
?>