<?php

namespace HyperCities\Provider;

use \DateTime;

/**
 * More sophisticated logger class; only writes at end of file.
 *
 * @author dshepard
 * @copyright Copyright 2010, The Regents of the University of California
 */
class Log {
	const log_location = 'provider/logs/';

	private static $instance;
	public	$token,
			$user,
			$url,
			$method,
			$objects = array(),
			$objectType = '',
			$maps = array(),
			$action = '',
			$messages = array(),
			$queries = array(),
			$queryCounter = 0,
			$dbErrors = array();
	public	$start_date,
			$start_time = 0.0,
			$req_complete_at = 0.0,
			$data_complete_at = 0.0,
			$templating_complete_at = 0.0;

	private function __construct() {
		$this->start_date = new DateTime(null, new \DateTimeZone("America/Los_Angeles"));
		$this->start_time = microtime(true);
	}

	private static function getInstance() {
		if (!self::$instance) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/* public static function logToken ($token) {
	  self::$token = $token;
	  }

	  public static function user ($user) {
	  $log = self::getInstance();
	  $log->user = $user;
	  } */

	public static function __callStatic($name, $arguments) {
		$log = self::getInstance();
		switch ($name) {
			case 'start':
				// simply construct file
				break;
			case 'url':
				$log->url = $arguments[0];
				break;
			case 'method':
				$log->method = $arguments[0];
				break;
			case 'token':
				$log->token = $arguments[0];
				break;
			case 'user':
				$log->user = $arguments[0];
				break;
			case 'processingTime':
				$log->req_complete_at = microtime(true);
				break;
			case 'dataFindingTime':
				$log->data_complete_at = microtime(true);
				break;
			case 'setObjectType':
				$log->objectType = $arguments[0];
			case 'templatingTime':
				$log->templating_complete_at = microtime(true);
				break;
			case 'logFileTime':
				$log->file_writing_time = microtime(true);
			case 'registerObject':
				$log->objects[] = $arguments[0];
				break;
			case 'registerObjects':
				foreach ($arguments[0] as $obj) {
					$log->objects[] = $obj;
				}
				break;
			case 'setAction':
				$log->action = $arguments[0];
				break;
			case 'registerMaps':
				foreach ($arguments[0] as $obj) {
					$log->maps[] = $obj;
				}
				break;
			case 'write':
				$log->messages[] = $arguments[0];
				break;
			case 'queryCounter':
				$log->queryCounter++;
				break;
			case 'writeQuery':
			case 'query':
				$log->queries[] = array('query' => $arguments[0], 'params' => $arguments[1]);
				break;
			case 'dbError':
				$log->queries[] = array('refCode' => $arguments[2], 'query' => $arguments[0], 'params' => $arguments[1]);
		}
	}

	/* public static function processingTime() {
	  $this->req_complete_at = microtime();
	  }

	  public static function dataFindingTime() {
	  $this->data_complete_at = microtime();
	  }

	  public static function templatingTime() {
	  $this->templating_complete_at = microtime();
	  }

	  public static function registerObject ($object) {

	  }

	  public static function setAction ($action) {

	  }

	  public static function logFeatures () {

	  }

	  public static function logMaps () {

	  }

	  public static function write () {

	  } */

	/* public static function writeQuery($query, $params) {
	  $this->queries[] = "Query: $query\nParams: ".print_r ($params, TRUE);
	  } */

	public static function initRequestFile() {
		//if (!self::$requestFileName) {
			$year = date('Y');
			$month = date('m');
			$day = date('d');
			//if (!self::$directoryConfirmed) {

				if (!@opendir(self::log_location . $year . '/' . $month)) {
					if (!@opendir(self::log_location . $year)) {
						mkdir(self::log_location . $year);
					}
					if (!@opendir(self::log_location . $year . '/' . $month)) {
						mkdir(self::log_location . $year . '/' . $month);
					}
					//self::$directoryConfirmed = TRUE;
				//}
			}
			//$hash = md5(microtime()."UIO023jf92m3ui9023");
			$time = microtime() * 100000;
			$requestFileName = self::log_location . $year . '/' . $month . '/' . date('Y-m-d') . '-' . $time . '.reqlog';
			//self::write("Creating log file " . self::$requestFileName);
			return $requestFileName;
		//}

	}

	private static function getRequestFile() {
		if (!self::$requestFile) {
			$year = date('Y');
			$month = date('m');
			$day = date('d');
			if (!self::$directoryConfirmed) {

				if (!@opendir(self::log_location . $year . '/' . $month)) {
					if (!@opendir(self::log_location . $year)) {
						mkdir(self::log_location . $year);
					}
					if (!@opendir(self::log_location . $year . '/' . $month)) {
						mkdir(self::log_location . $year . '/' . $month);
					}
					self::$directoryConfirmed = TRUE;
				}
			}
			self::$requestFile = fopen(self::$requestFileName, 'a');
		}
		return self::$requestFile;
	}

	private static function getFileHandle() {
		// if so, just fopen the file
		if (!self::$logFile) {
			$year = date('Y');
			$month = date('m');
			$day = date('d');
			if (!self::$directoryConfirmed) {

				if (!@opendir(self::log_location . $year . '/' . $month)) {
					if (!@opendir(self::log_location . $year)) {
						mkdir(self::log_location . $year);
					}
					if (!@opendir(self::log_location . $year . '/' . $month)) {
						mkdir(self::log_location . $year . '/' . $month);
					}
					self::$directoryConfirmed = TRUE;
				}
			}
			self::$logFile = fopen(self::log_location . $year . '/' . $month . '/'
							. date('Y-m-d') . '.log', 'a');
		}
		return self::$logFile;
	}

	public static function store() {
		//$fh = fopen(date_format(new DateTime(), DATE_ATOM) . "-".microtime()."reqlog2", 'w');
		
		//$fh = fopen("LOG" . date_format(new DateTime(), "Y-m-d") . "-" . (microtime() * 1000) . ".reqlog2", 'w');
		$log = self::getInstance();
		$rpt = $log->req_complete_at - $log->start_time;
		$logData = array (
			'received_at' => $log->start_date->format(\DATE_ATOM),
			'request_processing_time'	=> $rpt,
			'data_finding_time'	=> ($log->data_complete_at - $log->req_complete_at),
			'templating_time'	=> ($log->templating_complete_at - $log->data_complete_at),
			'total_time'		=> $log->templating_complete_at - $log->start_time,
			//'file_writing_time' => microtime(true) - $log->templating_complete_at,
			'messages'	=> $log->messages,
			'url'	=> $log->url,
			'method'=> $log->method,
			'user'	=> $log->user,
			'objects'	=> array(),
			'objectType' => $log->objectType,
			'totalObjects' => count($log->objects),
			'total_queries' => $log->queryCounter,
			'maps'	=> $log->maps,
		);
		foreach ($log->objects as $obj) {
			$logData['objects'][] = array (
				'id'	=>	$obj->id,
				'name'	=>	$obj->title,
			);
		}
		$logData['queries'] = $log->queries;
		$fh = fopen(self::initRequestFile(), 'w');
		fwrite($fh, json_encode($logData));
		fclose($fh);
	}

}

?>
