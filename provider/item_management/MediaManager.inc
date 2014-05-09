<?php

namespace HyperCities\Provider\ItemManagement;

use HyperCities\Provider\Request;
use HyperCities\Provider\Authentication\AuthenticationManager;
use \database;

/**
 * Allows uploading, downloading, etc. of images and other media.
 *
 * @author David Shepard
 */
class MediaManager extends ModelManager {

    /**
     * Necessary because of PHP 5.2's nonexistant late static binding.
     * 
     * @param Request $request
     * @param HCWSResponse $response
     */
    public static function handle (Request $request) {
        parent::handle($request, $response, get_class());
    }

    public static function validateFilename (Request $request) {
        // Check if the file is a valid Linux filename
	$query = $request->query;
        $filename = $query->requestData['filename'];
        $invalid_characters = array();
        foreach (array (' ', ',') as $character) {
            if (strrpos($filename, $character)) $invalid_characters[] = $character;
        }
        if ($invalid_characters != array()) {
            $response->addError (new InvalidCharactersError ($invalid_characters));
            return false;
        }
        if (file_exists('uploadedImage/'.$filename)) {
            $response->addError(new FileExistsError ($filename));
            return false;
        } else {
            $response->addMessage (new FileDoesNotExistMessage ($filename));
            return true;
        }
    }

    public static function create (Request $request) {
        if (!AuthenticationManager::checkIfUserLoggedIn()) {
            throw new UserNotAuthenticated("Media.create");
        }
        parent::requires(array ('filename'), $target->requestData);
        if (!self::validateFilename($target, $response)) return false;
        $db = database::getInstance();
        // Write to database
        $query_str = "INSERT INTO users_files (filename, user_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW()) ;";
        $db->preparedQuery ($query_str, array('type'=>'si', &$target->requestData['filename'], &AuthenticationManager::$currentUser->id));
        if (move_uploaded_file($_FILES['imageData']['tmp_name'], 'uploadedImage/'.$target->requestData['filename'])) {
            $response->addMessage(new FileCreatedMessage($target->requestData['filename']));
        } else {
            $response->addMessage(new FileNotCreatedError($target->requestData['filename']));
        }
    }

    public static function delete (Request $request) {
        $db = database::getInstance();
        $query_str = "SELECT user_id FROM users_files WHERE filename = ? ";
        $result = $db->preparedQuery($query_str, array('type' => 's', $target->requestData['filename']));
        if ($result) {
            $result = $db->preparedGetRows();
        }
        if ($result[0]['user_id'] == AuthenticationManager::$currentUser) {
            // delete file
            unlink('uploadedImage/'.$target->requestData['filename']);
            // send message
            $response->addMessage(new FileCreatedMessage($target->requestData['filename']));
        } else {
            $response->addMessage(new InsufficientPriviledges(AuthenticationManager::$currentUser, "Media.delete", $target->requestData['filename']));
        }
    }

    public static function catalog (Request $request, HCWSResponse $reponse) {
	$db = database::getInstance();
	$userId = AuthenticationManager::$currentUser->id;
	$query_str = "SELECT id, filename, created_at, updated_at FROM users_files WHERE user_id = $userId";
	$result = $db->query($query_str);
	if (!$result) {
	    $result = $db->getRows();
	}
	print_r ($result);
    }
}
?>