<?php

namespace HyperCities\Provider;

use HyperCities\Provider\Authentication\AuthenticationManager;
use HyperCities\Provider\Authentication\User;
use HyperCities\Provider\Log;

/**
 * Request received from outside. Provides access to all request data and the
 * user who is making the request.
 *
 * @author David Shepard
 */
class Request implements \ArrayAccess {

	public	$query,
			$url,
			$referer = '',
			$encrypt = FALSE,
			$filename,
			$extension,
			$method,
			$callback,
			$user,
			$httpScheme = '';
	private $token = null;
	private $requestData = array();

	const KML_OUTPUT = 0;
	const JSON_OUTPUT = 1;
	private $format, $template;
	private static $valid_items = array('objects', 'users', 'contents', 'maps',
		'collections', 'images', 'scenes', 'activities', 'mrobjects', 'collectionListDocuments');

	public function __construct() {
		self::$valid_criteria = array_merge(self::$valid_criteria, self::$valid_mapping_criteria,
				self::$valid_name_criteria, self::$valid_parent_criteria, self::$valid_user_criteria);
	}

	public function init() {
		Log::url($_SERVER['REQUEST_URI']);
		Log::method($_SERVER['REQUEST_METHOD']);
		$url_components = explode('/', $_GET['url']);
		$this->method = $_SERVER['REQUEST_METHOD'];

		// if there are no slashes, or if there's only one compontent to the URL
		// i.e. 1 slash, we're listing items
		// To remove terminal empty strings, in case the URL was terminated with a slash
		if ($url_components[count($url_components) - 1] == '') {
			unset($url_components[count($url_components) - 1]);
		}
		$this->url = $url_components;
		$this->findOutputFormat($this->url);
		// Set item type
		$item = array_pop($url_components);
		if (strrpos($item, '.')) {
			$components = explode('.', $item);
			if (strcasecmp($components[1], 'kml') == 0)
				$this->format = self::KML_OUTPUT;
			if (strcasecmp($components[1], 'json') == 0)
				$this->format = self::JSON_OUTPUT;
			$item = $components[0];
		} else {
			$this->output;
		}
		// because $array[] = increments the value of the index, causing a
		// phantom index problem
		$url_components[count($url_components)] = $item;

		// If the user entered an extra slash at the beginning of the array, remove it
		if ($url_components[0] == '/' || $url_components == '') {
			$url_components = array_slice($url_components, 1);
		}
		$this->itemId = 'list';

		if (count($url_components) == 1 /*&& in_array($url_components[0], self::$valid_items)*/ ) {
			$this->itemType = $url_components[0];
		}
		// URL is of the form /collections or /objects and $_POST['action'] is set
		// Determine action from actions
		elseif ($url_components[0] == 'users' && count($url_components) >= 2) {
			if (count($url_components) == 2) {
				if (in_array($url_components[1], array("objects", "collections"))) $this->itemType = $url_components[1];
				else $this->itemType = $url_components[0];
			} else {
				$this->itemType = $url_components[1];
				$this->itemId = $url_components[2];
				$this->setCriteria(array('creator' => $url_components[1]));
			}
		}
		// URL is of the form /collectinos/1234, so display info about one item
		// Action is Display
		elseif (count($url_components) >= 2 ) {
			$this->itemType = $url_components[0];
			$this->itemId = $url_components[1];
		} else {
			throw new InvalidURL($_GET['url'] . ' not found.');
		}
		if (isset($this->url[1]) && $this->url[1] == 'roots') {
			$this->template = 'client';
			$this->output = self::JSON_OUTPUT;
		}
		$input_data = array();
		if ($this->method == 'POST') {
			$input_data = $_POST;
		} elseif ($this->method == 'GET') {
			$input_data = $_GET;
		} elseif ($this->method == 'DELETE') {
			// split into variables
			$DELETE = array();
			parse_str(file_get_contents("php://input"), $DELETE);
			$input_data = $DELETE;
		}

		if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS']) $this->httpScheme = 'HTTPS';
		else $this->httpScheme = 'HTTP';
		if (isset($_SERVER['HTTP_REFERER'])) $this->referer = $_SERVER['HTTP_REFERER'];
		$this->setCriteria($input_data);
		$this->start_session($input_data);
		if (isset($_SESSION['userId'])) $this->user = new User($_SESSION['userId']);
		Log::user($this->user);

		$lastUrl = $this->url[count($this->url) - 1];
		if (strrpos($lastUrl, '.') == true) {
			$pieces = explode('.', $lastUrl);
			$this->filename = $pieces[0];
			$this->extension = $pieces[1];
		} else {
			$this->filename = $lastUrl;
		}

		Log::setObjectType ($this->itemType);
	}

	private function start_session (array $input = NULL) {
		if (isset($input['token'])) {
			session_name ('token');
			session_id($input['token']);
		}
		@session_start();
		$_SESSION['ready'] = TRUE;
	}

	private function findOutputFormat($url) {
		$template = '';
		// search for two periods
		$filename = $url[count($url) - 1];
		if (substr_count($filename, '.') > 1) {
			throw new URLException("Too many periods in url $url");
		}
		$ext = array_pop(explode('.', $filename));
		switch ($ext) {
			case 'hub':
				$this->template = 'hubble';
				$this->format = self::KML_OUTPUT;
				break;
			case 'kml':
				$this->template = 'full';
				$this->format = self::KML_OUTPUT;
				break;
			case 'js':
				$this->template = 'full';
				$this->format = self::JSON_OUTPUT;
				break;
			case 'nar':
				$this->template = 'narrative';
				$this->format = self::JSON_OUTPUT;
				break;
			case 'all':
				$this->template = 'all';
				$this->format = self::JSON_OUTPUT;
				break;
			case 'export':
				$this->template = 'export';
				$this->format = self::JSON_OUTPUT;
				break;
			default:
				$this->template = 'full';
				$this->format = self::JSON_OUTPUT;
				break;
		}
	}

	public function __get($name) {
		$ret = NULL;
		switch ($name) {
			case 'token':
				return $this->token;
				break;
			case 'template':
				return $this->template;
				break;
			case 'format':
				if ($this->format == self::JSON_OUTPUT)
					return 'json';
				if ($this->format == self::KML_OUTPUT)
					return 'kml';
				break;
			case 'encode':
				return $this->encrypt;
				break;
			case 'itemType':
				$ret = $this->itemType;
				break;
			case 'itemId':
				$ret = $this->itemId;
				break;
			case 'hasGeoTemporalCriteria':
				$ret = $this->hasGeoTemporalCriteria;
				break;
			case 'hasUserCriteria':
				$ret = $this->hasUserCriteria;
				break;
			case 'requestData':
				$ret = $this->requestData;
				break;
		}
		return $ret;
	}

	public function offsetExists($offset) {
		if (!isset($this->requestData[$offset]))
			return FALSE;
		else
			return true;
	}

	public function offsetGet($offset) {
		if (isset($this->requestData[$offset]))
			return $this->requestData[$offset];
		else
			return FALSE;
	}

	public function offsetSet($offset, $value) {
		$this->requestData[$offset] = $value;
	}

	public function offsetUnset($offset) {
	}

	public $itemType, $itemId;
	private $hasGeoTemporalCriteria, $hasUserCriteria, $hasParentCriteria, $hasNameCriteria;
	private static $valid_criteria = array(
		// Used by system -- filters collections
		'object_type_id', 'objectType',
		// User-inputted criteria
		'name',
	);
	private static $valid_mapping_criteria = array(
		'ne_lat', 'ne_lon', 'sw_lat', 'sw_lon', 'start_time', 'end_time',
		'neLat', 'neLon', 'swLat', 'swLon',
		'north', 'east', 'south', 'west',
	);
	private static $valid_user_criteria = array(
		'creator',
		'creator_eppn',
		'userId'
	);
	private static $valid_parent_criteria = array('parent_id');
	private static $valid_name_criteria = array('name');
	private $criteriaGroups = array();

	private function setCriteria(array $criteria) {
		if (ServiceSettings::VALIDATE_CRITERIA == true) {
			foreach ($criteria as $key => $criterion) {
				// TODO: Double check if $criterion here should be $key instead
				if (in_array($criterion, self::$valid_criteria))
					Log::write("Invalid criteria: $key");
			} // end foreach ($criteria as $criterion)
		} // end criteria validation -- if (ServiceSettings::VALIDATE_CRITERIA)
		else {
			foreach ($criteria as $k => $v)
				$this->requestData[$k] = mysql_real_escape_string($v);
		}
		foreach (self::$valid_criteria as $criterion) {
			if (in_array($criterion, array_keys($criteria))) {
				$this->requestData[$criterion] = $criteria[$criterion];
			} // end if (in_array($criterion, array_keys($criteria)))
		} // end foreach (self::$valid_criteria as $criterion)
		if ($this->requestData) { // Set critera flags
			if (self::array_has_keys($this->requestData, self::$valid_mapping_criteria))
				$this->hasGeoTemporalCriteria = true;
			if (self::array_has_keys($this->requestData, self::$valid_user_criteria))
				$this->hasUserCriteria = true;
			if (self::array_has_keys($this->requestData, array('parent_id')))
				$this->hasParentCriteria = TRUE;
			if (self::array_has_keys($this->requestData, array('name')))
				$this->hasNameCriteria = TRUE;
		} // end if ($this->filterCriteria)
	} // end public function setCriteria

	private static function array_has_keys(array $array, $keys) {
		$haystack = array_keys($array);
		if (is_array($keys)) {
			$valid_keys = array();
			foreach ($keys as $key) {
				if (in_array($key, $haystack)) {
					$valid_keys[] = $key;
				}
			} // end foreach ($keys as $key)
			return $valid_keys;
		} else {
			if (in_array($keys, $haystack))
				return true;
			else
				return false;
		}
	}

}

?>
