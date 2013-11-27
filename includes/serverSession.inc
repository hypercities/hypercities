<?php

/**
 * HyperCities Server Session Class
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2009, The Regents of the University of California
 * @date      2009-07-02
 * @version   0.1
 * @description Controls server session and server variables.
 *
 */
class cServerSession
{
	/**
	 * Session maintainance functions
	 */

	/**
	 * initialize session and set session variables
	 * @return void
	 */
	static function initialize_session($userId, $email, $nickname, $photoUrl, 
								$userCollection, $defaultCollection, $neLat, 
								$neLon, $swLat, $swLon, $isAdmin) {
		cServerSession::start();

		$_SESSION['userId'] = $userId;
		$_SESSION['email'] = $email;
		$_SESSION['nickname'] = $nickname;
		$_SESSION['photoUrl'] = $photoUrl;
		$_SESSION['userCollection'] = $userCollection;
		$_SESSION['defaultCollection'] = $defaultCollection;
		$_SESSION['neLat'] = $neLat;
		$_SESSION['neLon'] = $neLon;
		$_SESSION['swLat'] = $swLat;
		$_SESSION['swLon'] = $swLon;
		$_SESSION['isAdmin'] = $isAdmin;
	}

	/**
	 * Start session
	 * @return void
	 */
	static function start() {
		if ( !isset($_SESSION['ready']) ) {
			@session_start();
			$_SESSION ['ready'] = TRUE; 
		}
	}

	/**
	 * Clear session
	 * @return void
	 */
	static function clearSession() {
		// Unset all of the session variables.
		$_SESSION = array();

		// If it's desired to kill the session, also delete the session cookie.
		// Note: This will destroy the session, and not just the session data!
		if (isset($_COOKIE[session_name()])) {
			setcookie(session_name(), '', time()-42000, '/');
		}

		// Finally, destroy the session.
		session_destroy();
	}

	static function synchronize($post) {
		session_start();
		if (isset($_SESSION['email']) && !empty($_SESSION['email'])) {
			$_SESSION['user_id'] = $post['user_id'];
			$_SESSION['email'] = $post['email'];
			$_SESSION['name'] = $post['name'];
		}
	}
	//end of session maintainance functions

	/**
	 * Getter and setter functions
	 */

	/**
	 * The following five functions are general functions to access session
	 * variables
	 */ 
	public static function setVar($fld , $val) { 
		self::start();
		$_SESSION[$fld] = $val;
	} 
	public static function unsetVar($fld) { 
		self::start();
		unset($_SESSION[$fld]); 
	} 
	public static function getVar($fld) { 
		self::start();
		if (isset($_SESSION[$fld]))
			return $_SESSION[$fld];
		else return NULL;
	} 
	public static function issetVar($fld) { 
		self::start();
		return isset($_SESSION[$fld]); 
	} 

	/** 
	 * Set session variables
	 * @param array $object: associative array which is going to be added to
	 *						session 
	 * @return void
	 */
	static function setSession($object) {
		cServerSession::start();
		$_SESSION = array_merge($_SESSION, $object);
	}

	/**
	 * The following functions are getters and setters for each session
	 * variables. You can use getVar() and setVar() to access session variables,
	 * or write a function here if you want to do something particularly when
	 * accessing session variables.
	 */

	static function setOidCidMid($oid, $cid, $mid){
		cServerSession::start();
		$_SESSION['oid'] = $oid;
		$_SESSION['cid'] = $cid;
		$_SESSION['mid'] = $mid;
	}

	static function getEmail(){
		cServerSession::start();
		if (isset($_SESSION['email']))
			return $_SESSION['email'];
		else return NULL;
	}

	static function getUserId(){
		cServerSession::start();
		if (isset($_SESSION['userId']))
			return (int)$_SESSION['userId'];
		else return NULL;
	}

	static function getUserCollectionId(){
		cServerSession::start();
		if (isset($_SESSION['userCollection']))
			return $_SESSION['userCollection'];
		else return NULL;
	}
	
	static function getPhotoUrl(){
		cServerSession::start();
		if (isset($_SESSION['photoUrl']))
			return $_SESSION['photoUrl'];
		else return NULL;
	}

	static function getOid(){
		cServerSession::start();
		if (isset($_SESSION['oid']))
			return $_SESSION['oid'];
		else return NULL;
	}

	static function getCid(){
		cServerSession::start();
		if (isset($_SESSION['cid']))
			return $_SESSION['cid'];
		else return NULL;
	}

	static function getMid(){
		cServerSession::start();
		if (isset($_SESSION['mid']))
			return $_SESSION['mid'];
		else return NULL;
	}

	/**
	 * Get session variables in XML format
	 * @return String: session variables in XML format
	 */
	static function getSessionXml() {
		cServerSession::start();
		$dom = new DomDocument('1.0','utf-8');
		$user = $dom->appendChild($dom->createElement('User'));
		$userId = $user->appendChild($dom->createElement("userId"));
		$userId->appendChild($dom->createTextNode(self::getUserId()));
		$email = $user->appendChild($dom->createElement("email"));
		$email->appendChild($dom->createTextNode(self::getEmail()));
		$nickname = $user->appendChild($dom->createElement("nickname"));
		$nickname->appendChild($dom->createTextNode(self::getVar("nickname")));
		$photoUrl = $user->appendChild($dom->createElement("photoUrl"));
		$photoUrl->appendChild($dom->createTextNode(self::getPhotoUrl()));
		$userCollection = $user->appendChild($dom->createElement("userCollection"));
		$userCollection->appendChild($dom->createTextNode(self::getVar("userCollection")));
		$defaultCollection = $user->appendChild($dom->createElement("defaultCollection"));
		$defaultCollection->appendChild($dom->createTextNode(self::getVar("defaultCollection")));
		$neLat = $user->appendChild($dom->createElement("neLat"));
		$neLat->appendChild($dom->createTextNode(self::getVar("neLat")));
		$neLon = $user->appendChild($dom->createElement("neLon"));
		$neLon->appendChild($dom->createTextNode(self::getVar("neLon")));
		$swLat = $user->appendChild($dom->createElement("swLat"));
		$swLat->appendChild($dom->createTextNode(self::getVar("swLat")));
		$swLon = $user->appendChild($dom->createElement("swLon"));
		$swLon->appendChild($dom->createTextNode(self::getVar("swLon")));
		$baseCollection = $user->appendChild($dom->createElement("baseCollection"));
		$baseCollection->appendChild($dom->createTextNode(self::getVar("baseCollection")));

		$dom->formatOutput = true;
		header('Content-type: application/xml');
		return $dom->saveXML();
	}
	//end of getters and setters

	/**
	 * status check functions
	 */

	/**
	* Check if the current user is admin
	* @return Boolean: true if the current user is admin,
	*					false otherwise
	*/
	static function isAdmin() {
		cServerSession::start();
		return ($_SESSION['isAdmin'] === true);
	}
	
	/**
	 * Check if the current user is using OpendID
	 * @return Boolean: true if the current user is admin,
	 *					false otherwise
	 */
	static function isOpenId() {
		cServerSession::start();
		if (isset($_SESSION['isOpenId'])) return $_SESSION['isOpenId'];
		else return false;
	}
	//end of status check functions
}
?>
