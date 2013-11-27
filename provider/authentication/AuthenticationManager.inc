<?php

/**
 * HyperCities Authentication Manager.
 *
 * @author		David Shepard
 * @copyright	(c) 2010, The Regents of the University of California
 * @date		2010-01-01
 * @version		$Id
 */


namespace HyperCities\Provider\Authentication;

use HyperCities\Provider\Request;
use HyperCities\Provider\Log;
use HyperCities\Provider\Redirect;
use \database;
use \cUser;
use \cServerSession;

// Exceptions
use HyperCities\Provider\RemoteConnectionFailure;

class SessionStartedMessage extends \HyperCities\Provider\Message {
	public $token, $tokenName;

	public function __construct ($token, $tokenName) {
		$this->token = $token;
		$this->tokenName = $tokenName;
	}
}

class AuthenticationManager {

	/**
	 *
	 * @param Request $request
	 * @param Response $response
	 * @return mixed Response or Message.
	 * @throws AuthenticationFailure
	 */
	public static function handle (Request $request) {
		$return = null;
		switch ($request->url[1]) {
			case 'login':
			case 'login.kml':
				Log::write("Login request received.");
				$user = self::authenticateUser($request['email'],
						$request['password']
				);
				$return = new AuthenticationSucceeded($user->sessionKey);
				break;
			case 'generateToken':
				self::generateSessionKey($request);
				break;
			case 'startSession':
			    $return = self::start_session($request);
			    break;
			case 'startRemoteAuthRequest':
			    $return = self::start_remote_auth_request($request);
			    break;
			case 'initRequest':
				$return = self::generateAndRegisterSessionKey($request->user);
				break;
		}
		return $return;
	}

	private static function start_session (Request $request) {
	    Log::write ("Starting new session.");
		$key = session_id();
		Log::token($key);
	    Log::write("Session started with key $key.");
		return new SessionStartedMessage($key, 'token');
	}

	private static function start_remote_auth_request (Request $request) {
	     if (!$request->token) {
		 throw new AuthenticationError("You must acquire a key before attempting to authenticate.");
	     }
	     if ($request->user) {
		 throw new AuthenticationError("You have already logged in. Please start a new session.");
	     }
	     return new Redirect ("loginOpenId.php");
	}

	public static function createOidUserWithDefaults ($email, $firstname, $lastname, $nickname, $gender, $birthyear, $providerName, $providerUrl) {
		$query_str = "INSERT INTO users (email, first_name, last_name, nickname,"
					." privacy_level_id, user_state_id, gender, birth_year,"
					." lastlogin_from, lastlogin_at, created_at, updated_at)"
					." VALUES (?, ?, ?, ?, 2, 10, 'M', 1900, $_SERVER[REMOTE_ADDR], NOW(), NOW(), NOW() )";
		$db = database::getInstance();
		$values = array ();
		$values['email'] = $email;
		$values['firstName'] = $firstname;
		$values['lastName'] = $lastname;
		$values['nickname'] = $nickname;
		$values['privacy'] = '2';
		$values['user_state_id'] = '1';
		$values['gender'] = $gender;
		$values['birthyear'] = $birthyear;
		$values['created_at'] = 'NOW()';
		$values['updated_at'] = 'NOW()';
		$values['password'] = null;
		$values['city'] = null;
		$values['description'] = null;
		$values['photo_url'] = null;
		$values['occupation'] = null;
		$values['locality'] = null;
		$values['zipcode'] = null;
		$values['country'] = null;
		$values['hypercity'] = null;
		$user = new cUser();
		$userId = $user->createUser($values);
		//activate user automatically
		$user->activateUser($userId);
		$user->createOpenIdUser($userId,
			$providerUrl,
			$providerName,
			'0'
		);
		return new User($userId);
	}

	static function authenticateUser ($email, $password) {
		$db = database::getInstance();
		$pwd = md5($password);
		Log::write("User attemping to log in with $email.");
		$result = $db->preparedQuery (
				"SELECT id FROM users WHERE email = ? and password = ?",
				array ('type'=>'ss', &$email, &$pwd));
		if (!$result) {
			Log::write("Authentication Error for $email and $password. ".$db->getError());
			throw new AuthenticationFailure ($email, $password);
		}
		$result = $db->preparedGetRows();
		if (count($result) !== 1) {
			throw new UserNotFound("User not found with email $email.");
		}
		Log::write("Found user with $email.");
		$row = $result[0];
		$user = new User ($row['id']);
		$_SESSION['userId'] = $row['id'];
		return $user;
	}

	public static function getUserByEmail ($email) {
		$db = database::getInstance();
		$db->preparedQuery('SELECT id FROM users WHERE email = ?', array ('type' => 's', &$email));
		$result = $db->preparedGetRows();
		if (!$result) throw new UserNotFound("User $email does not exist.");
		return new User ($result[0]['id']);
	}
}
?>
