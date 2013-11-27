<?php
include_once("includes/connect_db.inc");
include_once("includes/dbUtil.inc");
include_once("includes/util.inc");
include_once("includes/email.inc");
include_once("includes/serverSession.inc");

/**
 * The user class
 * 
 * @copyright Copyright 2009, The Regents of the University of California
 */
class cUser {
	private $userId,
			$nickname,
			$password,
			$email,
		   	$registrationTimeStamp;
	
	/**
	 * Constructor overloading
	 */
	private function __callConstruct($name, $arg){
		return call_user_func_array(array($this, $name), $arg);
	}

	public function __construct()
	{
		$num = func_num_args();
		$args = func_get_args();
		
		switch($num)
		{
			case 0:
			$this->__callConstruct('__construct0', $args);
			break;
			case 1:
			$this->__callConstruct('__construct1', $args);
			break;
			case 4:
			$this->__callConstruct('__construct4', $args);
			break;
			case 5:
			$this->__callConstruct('__construct5', $args);
			break;
			default:
			throw new Exception();
		}
	}

	private function __construct0()
	{
		$this->userId = NULL;
	}

	private function __construct1($userId)
	{
		$this->userId = $userId;
	}
	
	private function __construct4($userId, $nickname, $password, $email) {
		$this->userId = $userId;
		$this->nickname = $nickname;
		$this->password = $password;
		$this->email = $email;
	}
	
	private function __construct5($userId, $nickname, $password, $email, 
								$registrationTimeStamp) {
		$this->userId = $userId;
		$this->nickname = $nickname;
		$this->password = $password;
		$this->email = $email;
		$this->registrationTimeStamp = $registrationTimeStamp;
	}

	/** OpenId related functions **/
	/**
	 * Get user id by OpenId url. The mapping between user id and 
	 * OpenId url is one to many.
	 * @param String $openId: The openId url. 
	 * @return Number $userId: The user id.
	 */
	public function getUserIdByOpenId($openId) {
		$userId = null;

		$sql = "SELECT user_id FROM `user_openids` WHERE openid_url = '"
			. mysql_real_escape_string($openId)."'";
		$result = sqlCommand($sql);

		//there should be only one record in the result
		foreach ($result as $row) {
			$userId = $row['user_id'];
		}

		return $userId;
	}

	/** 
	 * Get My Collections Id
	 * @param Number $userId: user id
	 * @return Number: my collection id
	 */
	public function getMyCollectionId($userId) {
		$result = select("objects", "owner_id = ". $userId
					. " AND title='".HC_USER_COLLECTIONS_NAME."'");

		return $result[0]['id'];
	}

	/** 
	 * Get my collections IDs
	 * @param Number $userId: user id
	 * @return array $myCollections: array of collections IDs
	 */
	public function getMyCollections($userId) {
		$myCollectionId = $this->getMyCollectionId($userId);
		$sql = "SELECT subject_id FROM `object_relations` WHERE object_id = '$myCollectionId'";
		$result = sqlCommand($sql);

		$myCollections = array();
		foreach ($result as $row) {
			$myCollections[] = $row['subject_id'];
		}

		return $myCollections;
	}

	/** 
	 * Get OpenId url by user id. 
	 * @param Number $userId
	 * @return String $openId: array of OpenId urls.
	 */
	public function getOpenIdsByUser($userId) {
		$openIDs = array();
		
		$sql = "SELECT openid_url FROM `user_openids` WHERE user_id = $userId";
		$result = sqlCommand($sql);

		foreach ($result as $row) {
			$openIDs[] = $row['openid_url'];
		}

		return $openIDs;
	}

	/** 
	 * Login using OpenId, set server session if login successes
	 * @param String $openId: the OpenId url
	 * @return Boolean $isLogin: true is login successes, false if failed.
	 */
	public function loginByOpenId($openId) {
		$isLogin = false;
		$userId = $this->getUserIdByOpenId($openId);
		$profile = $this->getProfileInfo((int)$userId);

		if (!empty($profile)) {
			//login success
			$isLogin= true;
			
			//set up session variable
			cServerSession::setSession(array("isOpenId" => true));
			
			if (isset($_SESSION['openIdPhoto'])) {
				$profile['photo_url'] = $_SESSION['openIdPhoto'];
			}

			$this->initUser($profile);
		}

		return $isLogin;
	}
	
	/**
	 * Log in using Shibboleth, UCLA campus authentication service. Set server
	 * session if login was successful.
	 * @param String $eppn User ePPN. See UCLA Knowledge Base for explanation.
	 * @return boolean $isLogin: true indicates success; false indicates failure.
	 */
	public function loginByEppn($eppn) {
		$isLogin = false;
		$userId = null;

		$sql = "SELECT id FROM `users` WHERE email = '". mysql_real_escape_string($eppn)."'";
		$result = sqlCommand($sql);

		//there should be only one record in the result
		foreach ($result as $row) {
			$userId = $row['id'];
		}
		$profile = $this->getProfileInfo($userId);
		
		if (!empty($profile)) {
			$isLogin = true;
			cServerSession::setSession(array("isOpenId" => true));
			$this->initUser($profile);
		}
		return $isLogin;
	}

	/** 
	 * Log in using email. This function is called when server can get email
	 * from OpenId provider and the user has been logged in successfully
	 * @param String $email: The email retreived from OpenId provider.
	 * @return Boolean: true on success, false on failure
	 */
	public function loginByEmail($email) {
		$email = mysql_real_escape_string($email);
		$sql = "SELECT * FROM `users` WHERE email = '$email'";
		$result = sqlCommand($sql);
		
		if (empty($result[0])) {
			return false;
		} else {
			$this->initUser($result[0]);
			return true;
		}	
	}
	
	/** 
	 * Log in using fullname. This function is called when server can get 
	 * fullname from OpenId provider and the user has been logged in successfully
	 * @param String $fullname: The fullname retreived from OpenId provider.
	 * @return Boolean: true on success, false on failure
	 */
	public function loginByFullname($fullname) {
		$isLogin = false;
		$fullname = mysql_real_escape_string($fullname);
		$nameArray = explode(" ", $fullname);
		$firstName = $nameArray[0];
		$lastName = $nameArray[1];

		$sql = "SELECT * FROM `users` WHERE `first_name` = '$firstName' AND `last_name` = '$lastName'";
		$result = sqlCommand($sql);

		if (empty($result[0])) {
			return false;
		} else {
			$this->initUser($result[0]);
			return true;
		}
	}

	/**
	 * Insert openId user. The user must be created first.
	 * @param $userId: the user id that open id attaches to.
	 * @param $openId: the openId url.
	 * @return true on success or false on error
	 */
	public function createOpenIdUser($userId, $openId, $providerName, $oidType) {
		$object = array();
		$object['user_id'] = $userId;
		$object['openid_url'] = $openId;
		$object['provider_name'] = $providerName;
		$object['oid_type'] = $oidType;
		$result = insert("user_openids", $object);

		return $result;
	}

	//end of OpenId related functions

	
	/**
	 * Activate users by setting user_state_id to 10
	 * @param Number $userId: user id
	 * @return Boolean $result: true on success, false on fail
	 */
	public function activateUser($userId) {
		$sql = "UPDATE `users` SET `user_state_id` = '10' WHERE `id` = '".mysql_real_escape_string($userId)."'";
		$result = sqlCommand($sql);

		return $result;
	}

	/**
	 * Insert a new user into database and create "My Collections" for the user
	 * @param array $params: array containing all needed user infomation
	 * @return mixed $result: user id if success, false if fail. 
	 */
	public function createUser($params) {
		$timestamp = date( 'Y-m-d H:i:s');
		$this->registrationTimeStamp = $timestamp;
		$object = array();

		$object['email'] = $params['email'];
		$object['password'] = md5($params['password']);
		$object['first_name'] = $params['firstName'];
		$object['last_name'] = $params['lastName'];
		$object['nickname'] = $params['nickname'];
		$object['privacy_level_id'] = $params['privacy'];
		$object['city_id'] = $params['hypercity'];
		$object['user_state_id'] = '1';
		$object['description'] = $params['description'];
		$object['gender'] = $params['gender'];
		$object['birth_year'] = $params['birthyear'];
		$object['photo_url'] = $params['photo_url'];
		$object['occupation'] = $params['occupation'];
		$object['locality'] = $params['city'];
		$object['zipcode'] = $params['zipcode'];
		$object['country'] = $params['country'];
		$object['created_at'] = $timestamp;
		$object['updated_at'] = $timestamp;

		$result = insert("users", $object);

		$this->createMyCollection($result, $params['nickname']);

		return $result;
	}
	/**
	 * Create My Collection for new user
	 * @param $userId: the user id
	 * @param $nickname: the user's nickname
	 * @return $myCollectionId: the "My Collections" id of the user
	 */
	public function createMyCollection($userId, $nickname) {
		//check if "My Collections" already exists
		$sql = "SELECT id FROM `objects` WHERE title='"
			.HC_USER_COLLECTIONS_NAME."' AND object_type_id = '"
			.HC_OBJECT_TYPE_COLLECTION."' AND owner_id = '".$userId."'";

		$result = sqlCommand($sql);

		if (empty($result[0])) {
			//create "My Collections"
			$title = HC_USER_COLLECTIONS_NAME;
			$description = "These are my collections";
			$creator = $nickname;
			$copyright = "";
			$createTime = "NOW()";
			$kml = "";
			$dateFrom = null;
			$dateTo = null;
			$ne_lat = null;
			$ne_lon = null;
			$sw_lat = null;
			$sw_lon = null;
			$view = null;

			$result = insertCollection($title, $description, $creator, $copyright, $createTime, $userId,
				$kml, $dateFrom, $dateTo, $ne_lat, $ne_lon, $sw_lat, $sw_lon, $view, NULL, HC_OBJECT_PUBLIC);
			$myCollectionId = $result['collectionId'];
		}

		return $myCollectionId;
	}

	/**
	 * Set default collection for the user
	 * @param Number $collectionId: the collection ID
	 * @return void
	 */
	public function setDefaultCollection($collectionId) {
		$object = array("collection_id" => $collectionId);
		$result = update("users", $object, "`id` = $this->userId");
	}

	/**
	 * Get default collection info
	 * @param Number $collectionId: the collection ID
	 * @return array: the collection info
	 */
	public function getCollectionInfo($collectionId) {
		//default value
		$result = array(array("title" => "No default collection",
							"ne_lat" => 0,
							"ne_lon" => 0,
							"sw_lat" => 0,
							"sw_lon" => 0));
		
		if (!empty($collectionId) && (strcasecmp(trim($collectionId), "null") != 0)) {
			$sql = "select o.title, om.ne_lat, om.ne_lon, om.sw_lat, om.sw_lon"
				. " from `objects` as o, `object_mappings` as om where o.id = "
				. $collectionId. " and om.object_id = o.id";
			$result = sqlCommand($sql);
		}
		
		HC_debugLog(print_r($result, true));
		
		if (empty($result))
			return null;

		//only one record in result, return it
		return $result[0];
	}

	/**
	 * Update user login info when user log in
	 * @param Number $userId: the user ID
	 * @return Boolean: true on success false on error
	 */
	public function updateLoginInfo($userId) {
		$timestamp = date( 'Y-m-d H:i:s');
		$ip = $_SERVER['REMOTE_ADDR']; 
		$sql = "update `users` SET `lastlogin_at` = '".$timestamp.
				"',`lastlogin_from` = '".$ip."'  where id='".$userId."'";  
		$result = sqlCommand($sql);

		return $result;
	}

	/**
	 * Initial session. Set user profile in session. Update login info.
	 * This function is called after user login.
	 * @param $profile: The user's profile 
	 * @return void
	 */
	private function initUser($profile) {
		$userId = $profile['id'];
		$nickname = $profile['nickname'];
        if (!$nickname) $nickname = $profile['first_name'].' '.$profile['last_name'];
		$email = $profile['email'];
		$defaultCity = $profile['city_id'];
		$photo_url = $profile['photo_url'];
		$collectionId = $profile['collection_id'];
		$myCollectionId = $this->getMyCollectionId($userId);
		$isAdmin = ($profile['user_state_id'] === HC_SUPER_USER);

		//select default collection title
		$result = $this->getCollectionInfo($collectionId);
		$title = $result['title'];
		$neLat = $result['ne_lat'];
		$neLon = $result['ne_lon'];
		$swLat = $result['sw_lat'];
		$swLon = $result['sw_lon'];
		
		if ( strlen($photo_url) == 0 ) {
			$photo_url = "./images/avatarError.gif";
		}
		
		//setup server sesssion
		cServerSession::initialize_session($userId, $email, $nickname,
											$photo_url, $myCollectionId, $title,
											$neLat, $neLon, $swLat, $swLon, $isAdmin);
		
		$this->updateLoginInfo($userId);
	}

	/**
	 * Log in user
	 * @param Sring $username: the user name
	 * @param String $password: the password
	 * @return void
	 */
	public function login($username, $password) {
		$sql = "select * from users where email='" . $username 
			. "' and password='".md5($password)."' and user_state_id >=10";
		$result = sqlCommand($sql);

		if (empty($result[0])) {
			$isLogin = false;
		} else {
			$isLogin = true;
			$row = $result[0];
			$this->initUser($row);
		}
	
		return $isLogin;
	}

	/** 
	 * Update user profile
	 * @param Number $userId: int, user's id
	 * @param Object $object: object, containing all user's information that needs to be updated
	 * @return Boolean $result: true on success, false on error
	 */
	public function updateUser($userId, $object) {
		$result = update("users", $object, "id = $userId LIMIT 1");	

		return $result;
	}

	/**
	 * Getters and setters
	 */
	public function getPassword() {
		return $this->password;
	}

	public function getEmail() {
		return $this->email;
	}
	
	public function getUserId() {
		return $this->userId;
	}
	
	public function getRegistrationTimeStamp() {
		return $this->registrationTimeStamp;
	}
    
	/**
	 * Get user profile
	 * @param Number $userId: user's email if it is a string, 
	 *						or user id if it is an integer
	 * @return array $userProfile: user's profile
	 */
	public function getProfileInfo($userId) {
		$userProfile = select("users", "id = '$userId'");

		return $userProfile[0];
	}

	/**
	 * Get user's profile given last name 
	 * warning: there might be multiple users having the same nickname
	 * @param {string} $nickname user's lastname 
	 * @return {array} $userProfile array of user's profile
	 */
	public function getProfileByLastname($lastname) {
		$userProfile = select("users", "last_name= '$lastname'");
	
		return $userProfile;
	}

	/**
	 * Get user's profile given email
	 * warning: there might be multiple users having the same email
	 * @param {string} $nickname user's lastname 
	 * @return {array} $userProfile array of user's profile
	 */
	public function getProfileByEmail($email) {
		$userProfile = select("users", "email= '$email'");
	
		return $userProfile;
	}

	/**
	 * Check if the user has update privilege.
	 * @param {Number} $userId
	 * @param {Number} $objectId
	 */
	public function hasUpdatePrivilege($userId, $objectId) {

		if (!$userId)
			return false;

		if ($userId == HC_SUPER_USER) return true;
		
		// if user has admin role ...
		$userData = select("users", "id = '$userId'");
		if ($userData['user_state_id'] == HC_USER_IS_ADMIN) return true;
		
		$privilege = select("objects_users", "user_id = '$userId' and object_id = '$objectId'");

		// TODO: rewrite in the future
		if (count($privilege) > 0) {
			return true;
		} else {
			return false;
		}
	}
}
?>
