<?php
/**
 * HyperCities Activity Manager.
 *
 * @author		David Shepard
 * @copyright	(c) 2010, The Regents of the University of California
 * @date		2010-01-01
 * @version		$Id
 */

namespace HyperCities\Provider\ItemManagement;

use \database;
use HyperCities\Provider\DatabaseError;
use HyperCities\Provider\RemoteConnectionFailure;
use HyperCities\Provider\Request;
use HyperCities\Provider\Authentication\AuthenticationManager;
use HyperCities\Provider\Log;

class ActivityCreatedMessage {
	public $url,
			$id;
	public function __construct ($url, $id) {
		$this->url = $url;
		$this->id = $id;
	}
}

/**
 * ActivityManager: manages the creation of activities for Moodle or other externally-managed
 * collections.
 *
 * @author David Shepard
 */
class ActivityManager {

	public static function handle (Request $request) {
		$data = null;
		if (count($request->url) == 1) {
			switch ($request->method) {
				case 'POST':
					$data = self::create($request);
					break;
			}
		} elseif (count ($request->url) == 2) {
			switch ($request->url[count($request->url) - 1]) {
				case 'test':
					$data = self::test($request);
					break;
			}
		}
		return $data;
	}

	/**
	 * Test code. To be deleted.
	 *
	 * @url /activities/test
	 * @param Request $request
	 * @return DatabaseError
	 */
	public static function test (Request $request) {
		$req = new Request();
		$req->query->requestData = array (
				'activityNumber'	=> 1,
				'courseUrl'			=> 'http://example.com/',
				'privilegeUrl'		=> 'http://example.com/privileges',
				'ownerEppn'			=> 'dshepard@ucla.edu',
				'userEppn'			=> 'dshepard@ucla.edu',
				'collection'		=> 14721,
				'collectionTitle'	=> 'Test activity creation'
		);
		$x = self::create($req);
		return $x;
		// get Joe's email
		$user = new \HyperCities\Provider\Authentication\User();
		//$user->email = "jkluk@ucla.edu";
		//$user->email = "joe.luk@gmail.com";
		$user->email = "dshepard@ucla.edu";
		// do query
		$perms = AuthenticationManager::checkExternalCollection(16434, $user);
		if ($perms->addTo) {
			return new ActivityCreatedMessage("It worked! $user->email can add to this collection!");
		} else {
			return new DatabaseError("Sorry, $user->email is not allowed to add to this collection.");
		}
	}

	/**
	 * Creates a new activity.
	 * URL is /activities
	 *
	 * @param Target $query Target
	 */
	public static function create (Request $request) {
		//$query = $request->requestData;
		$db = database::getInstance();
		Log::write("Creating new activity.");
		//Log::write(print_r($request, TRUE));
		$query_str = 'INSERT INTO external_permissions '
				.' (url, additional_data, created_at, updated_at) VALUES (?, ?, NOW(), NOW())';
		$additional_data = 'activityNumber='.$request['activityNumber'].'&courseUrl='.$request['courseUrl'];
		$privilegeUrl = $request['privilegeUrl'];
		$params = array('type'=>'ss', &$privilegeUrl, &$additional_data);
		$db->preparedQuery($query_str, $params);
		$permissionId = $db->insertId();
		try {
			$user = AuthenticationManager::getUserByEmail($request['ownerEppn']);
		} catch (\HyperCities\Provider\Authentication\UserNotFound $ex) {
			$email = $request['ownerEppn'];
			$user = AuthenticationManager::createOidUserWithDefaults($email, $email,
					$email, $email, 'M', 1900, 'shibboleth', 'http://admin.cdh.ucla.edu/cdhit/jlogin.php'
			);
		}

		Log::write($request['userEppn'].' attempting to create new activity for '.$request['ownerEppn'].'.');

		$collection_data = array (
			'title' => stripslashes($request['collectionTitle']),
			'state'	=> 1,
			'creator' => $user->firstName . ' ' . $user->lastName,
			'copyright' => 'CC BY',
			'owner'	=> $user->id,
			'description' => stripslashes($request['collectionTitle']),
			'external_permissions_id' => $permissionId,
		);
		if (isset($request['collection']) || isset ($request['collectionId'])) {
			$cid = 0;
			if ($request['collection']) $cid = $request['collection'];
			if ($request['collectionId']) $cid = $request['collectionId'];
			$fs = FeatureStore::getInstance();
			if ($cid) {
				$child_collection = $fs->doSearch(array('objectId' => $cid));
				$fs->loadAll();
				$mapping = $child_collection[0]->mapping;
				$collection_data['mapping'] = array (
					'north' => $mapping->neLat,
					'south' => $mapping->swLat,
					'east' => $mapping->neLon,
					'west' => $mapping->swLon,
					'dateFrom' => $mapping->dateFrom,
					'dateTo' => $mapping->dateTo,
					'objectType' => 2,
					'markerType' => \HC_MARKER_EMPTY,
					'kml'	=> ' ',
					'zoom'	=> 14, // default value for collections; not required
				);
			}
		}
		$collection = new Collection($collection_data);
		
		if (isset($child_collection)) $collection->addChild($child_collection[0]);
		$collection->commit();
		//@\updateColTimeBoundBottomUp((int)$request['collection']);
		$id = $collection->id;
		Log::write("New activity created, with external_permissions_id $permissionId, using collection $id.");
		$url = "http://".$_SERVER['HTTP_HOST'].'/provider/collections/'.$id.'.mdl';
		return new ActivityCreatedMessage($url, $id);
	}

	/**
	 * Validate access to the collection.
	 *
	 * @param HCWSUser $user
	 * @param <type> $collectionId
	 * @return <type>
	 */
	public static function validate (\HCWSUser $user, $collectionId) {
		// get url from external_permissions
		$db = \database::getInstance();
		$query = 'SELECT url, additional_data FROM external_permissions WHERE id = '
				.'(SELECT external_permissions_id FROM objects WHERE id = '
				.(int)$collectionId.');';
		$result = $db->query($query);
		if (!$result) $result = $db->getRows();
		$data = 'activityId='.$result[0]['additional_data'].'&userId='.$user->id;
		$params = array('http' => array('method' => 'POST','content' => $data));
		$ctx = stream_context_create($params);
		$fp = @fopen($url, 'rb', false, $ctx);
		if (!$fp) {
			throw new Exception("Problem with $url.");
		}
		$response = @stream_get_contents($fp);
		if ($response === false) {
			throw new RemoteConnectionFailure("Problem reading data from $url.");
		}
		$request_data = json_decode($response);
		// NOTE: Exit point
		if (isset($request_data['error'])) {
			return false;
		} else return $request_data['capabilities'];
	}
}
?>