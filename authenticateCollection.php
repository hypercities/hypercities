<?php

/**
 * Verify that a user is able to see a collection when it's loaded as the base
 * collection. Used for Moodle integration.
 *
 *	1. When a user arrives at index.php, if $_SESSION['baseCollection'] is set, and
 *		$_SESSION['baseCollectionAuthenticated'] is not set, or is false, they are
 *		redirected to authenticateCollection.php.
 *	2. authenticateCollection.php authenticates by checking Moodle (or another remote
 *		server). If authentication is successful
 *		a. set $_SESSION["baseCollectionAuthenticated"] to true
 *		b. redirect to index.php.
 *		c. If authentication fails, redirect to authFailure.php?reason=notEnrolled
 *	3. When index.php checks if baseCollectionAuthenticated is set, and it is,
 *		it sets a javascript variable, which loads HyperCities at that collection.
 */

namespace HyperCities\Provider\Authentication;
\ini_set ("display_errors", 1);
require_once "includes/serverSession.inc";
require_once "includes/database.inc";
require_once "provider/core/Exception.inc";
require_once "provider/authentication/Encryptor.php";
//require_once "provider/core/Log.inc";
require_once "provider/core/DelayedLogger.inc";
require_once "provider/core/Message.php";
require_once "provider/authentication/AuthenticationManager.inc";
require_once "provider/authentication/Exceptions.inc";
require_once "provider/authentication/Messages.inc";
require_once "provider/authentication/PermissionSet.inc";
require_once "provider/authentication/User.inc";

use \cServerSession;
use \database;
use HyperCities\Provider\Log;
use HyperCities\Provider\RemoteConnectionFailure;

Log::start();

function redirect($url) {
  Log::store();
  header('Location: '.$url);
  die();
}

$baseCollection = \cServerSession::getVar("baseCollection");
if ($baseCollection) {
	Log::write("Base Collection set: $baseCollection");
	$user = new User(\cServerSession::getUserId());
//	print_r ($user);
//	print "\nBase Collection: ";
//	print $baseCollection;
	try {
		$permissions = AuthenticationManager::checkExternalCollection($baseCollection, $user);
		if ($permissions === TRUE) {
			cServerSession::setVar('baseCollectionAuthenticated', TRUE);
			//header("Location: index.php?");
			//die();
			redirect("index.php?");
		}
	    if ($permissions->view) {
		    cServerSession::setVar('baseCollectionAuthenticated', TRUE);
		    //header("Location: index.php?collections/$baseCollection");
		    //die();
			redirect("index.php?collections/$baseCollection");
	    } else {
		    cServerSession::unsetVar('baseCollection');
			//print_r ($permissions);
			//die();
		    redirect("authFailure.php?reason=notEnrolled");
		    //die();
	    }
	} catch (RemoteConnectionFailure $ex) {
		//print_r ($ex);
		Log::write(print_r ($ex, TRUE));
		//print "There was a problem trying to authenticate you.";
		//die();
		//Log::store();
	    redirect ("authFailure.php?reason=remoteConnectionFailure");
		//die();
	}
} else {
    Log::write("No base collection set.");
}


?>
