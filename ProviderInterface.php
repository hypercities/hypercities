<?php
/**
 * HyperCities Webservice Server Interface
 *
 * @author    David Shepard
 * @copyright Copyright 2009, The Regents of the University of California
 * @date      2009-07-02
 * @version   0.4
 * @description Front-end interface for HyperCities webservice.
 *
 */

namespace HyperCities\Provider;

ini_set('memory_limit', "256M");
ini_set('session.use_only_cookies', 0);
ini_set('session.use_trans_sid', 1);

require_once 'includes/connect_db.inc';
require_once 'includes/kmlParser.inc';
require_once 'includes/constants.inc';
require_once 'includes/dbUtil.inc';
include_once 'includes/database.inc';
include_once 'includes/util.inc';
require_once 'includes/HCDomDocumentWrapper.inc.php';
include_once 'includes/HCKmlDocWrapper.php';
require_once 'includes/user.inc';

$versionBase = 'provider/';

require_once $versionBase . 'core/ServiceSettings.php';

if (ServiceSettings::DEBUG_MODE == TRUE) {
	ini_set('display_errors', 1);
	ini_set('xdebug.remote_host', '128.97.230.16');
}
$profile = FALSE;
if (isset($_GET['profile']) || isset($_POST['profile'])) {
	$profile = TRUE;
}
if ($profile) {
	require_once 'includes/xhprof_lib/utils/callgraph_utils.php';
	require_once 'includes/xhprof_lib/utils/xhprof_lib.php';
	require_once 'includes/xhprof_lib/utils/xhprof_runs.php';
	if ($profile) \xhprof_enable();
}

//require_once $versionBase . 'core/utilities.inc';
require_once $versionBase . 'core/Exception.inc';
require_once $versionBase . 'core/DelayedLogger.inc';
require_once $versionBase . 'core/Message.php';
require_once $versionBase . 'core/Request.php';

// Authentication Modules
require_once $versionBase . 'authentication/AuthenticationManager.inc';
require_once $versionBase . 'authentication/Exceptions.inc';
require_once $versionBase . 'authentication/Messages.inc';
require_once $versionBase . 'authentication/User.inc';
require_once $versionBase . 'authentication/PermissionSet.inc';

require_once $versionBase . 'database_models/SelectQuery.inc';
require_once $versionBase . 'database_models/UpdateQuery.inc';
require_once $versionBase . 'item_management/ModelManager.inc';
require_once $versionBase . 'item_management/ActivityManager.inc';
require_once $versionBase . 'item_management/MapManager.inc';
require_once $versionBase . 'item_management/Exceptions.inc';
require_once $versionBase . 'item_management/Messages.inc';
require_once $versionBase . '/database_models/helperFunctions.inc';
require_once $versionBase . '/database_models/DatabaseModel.inc';
require_once $versionBase . '/database_models/Content.inc';
require_once $versionBase . '/database_models/Mapping.inc';
require_once $versionBase . '/database_models/Map.inc';
require_once $versionBase . '/database_models/Exceptions.inc';
require_once $versionBase . '/database_models/ModelDecorator.inc';
require_once $versionBase . '/database_models/ParsingObject.inc';
require_once $versionBase . '/database_models/JSONDocParser.inc';
require_once $versionBase . '/database_models/LinkedBook.inc';
require_once $versionBase . '/database_models/Book.inc';

// Datastores
require_once $versionBase . 'database_models/DataStore.inc';
require_once $versionBase . 'database_models/RelatedStore.php';
require_once $versionBase . 'database_models/FeatureStore.inc';
require_once $versionBase . 'database_models/MapStore.php';
require_once $versionBase . 'database_models/BookStore.inc';


// Helper classes
require_once $versionBase . '/database_models/GeoPt.inc';

require_once $versionBase . 'method_stubs.inc';
require_once $versionBase . 'database_models/RichMediaObject.inc';
require_once $versionBase . 'database_models/Collection.php';
require_once $versionBase . 'resources/ResourceServer.inc';
require_once $versionBase . 'resources/BookServer.inc';
require_once $versionBase . 'resources/EarthServer.inc';

require_once $versionBase . 'output/KmlResponse.php';
require_once $versionBase . 'output/TemplatingDispatcher.inc';
require_once $versionBase . 'output/Geoscribe.inc';
require_once $versionBase . 'output/Earth.inc';

use \HCKmlNode;
use HyperCities\Provider\ItemManagement;
use HyperCities\Provider\Output\Dispatcher;
use HyperCities\Provider\Output\KmlResponse;
use HyperCities\Provider\Authentication\AuthenticationManager;

Log::start();


$allowable_objects_in_url = array ('users', 'objects', 'collections', 'contents',
	'descriptions', 'maps', 'services', 'books'	);

$request = new Request();

if (isset($_GET['test']) && $_GET['test'] == 1) {
	Log::write("Test mode enabled. This request will not write to the database.");
	ItemManagement\DatabaseModel::setTest();
}
try {
	$request->init();
	Log::processingTime();
	// specific handler?
	$responseClass = NULL;
	switch ($request->itemType) {
		case 'users':
			$responseClass = 'HyperCities\\Provider\\Authentication\\AuthenticationManager';
			break;
		case 'activities':
			$responseClass = 'HyperCities\\Provider\\ItemManagement\\ActivityManager';
			break;
	}
	if (!$responseClass) {
		$new_classes = array (
			'/^earth/i' => 'EarthServer',
			'/^(?<resourceName>collectionListDocuments)(\/(?P<id>[\w\d]+)(\/(?P<command>\w+)(\/(?<secondId>[\d,]+)|)|)|)$/' => 'CollectionListServer',
		);
		$result = null;
		$responseClass = null;
		$resourceServerName = "";
		$resourceServer = NULL;
		foreach ($new_classes as $k => $v) {
			$matches = array();
			if (preg_match($k, $_GET['url'], $matches)) {
				$resourceServerName = 'HyperCities\\Provider\\ItemManagement\\'.$v;
				$resourceServer = new $resourceServerName;
				break;
			}
		}
		if ($resourceServer) {
			$data = array_merge($request->requestData, $matches);
			$result = $resourceServer->handle($_GET['url'], $_SERVER['REQUEST_METHOD'], $data);
		} elseif (in_array($request->itemType, $allowable_objects_in_url)) {
		Log::write('Using Stella to handle general request for HyperCities data.');
		if ($request->method == 'GET') {
			if ($request->itemId == 'roots') {
				Log::write("Getting roots.");
				$result = get_roots($request);
			} else {
				if (count($request->url) > 2) {
					switch ($request->url[2]) {
							case 'collections':
								$result = get_related_collections_for_book($request);
								break;
							case 'description':
							case 'content':
								$result = get_content($request);
								break;
							default:
								print "get_objects";
								$result = get_objects($request);
					}
				} elseif ($request->url[0] == 'contents' || $request->url[0] == 'descriptions') {
					$result = get_content($request);
				} elseif ($request->url[0] == "services") {
					$result = validate_users($request);
				}else {
					$result = get_objects($request);
				}
			}
		} elseif ($request->method == 'POST') {
			if (count($request->url) == 1)
				$result = create_objects($request);
			else {
			    $result = update_objects($request);
			}
		} elseif ($request->method == 'DELETE') {
			$result = delete_object($request);
		}
	} else {
		Log::write(implode('/', $request->url) . ' not found.');
		throw new InvalidURL(implode('/', $request->url) . ' not found.');
	}
	}
	elseif ($responseClass) {
		Log::write('Module call found: Will be handled by ' . $responseClass);
		$responder = new $responseClass();
		$result = $responder::handle($request);
	} 
} catch (Exception $ex) {
	Log::write('Exception occurred: ' . $ex);
	$result = $ex;
}

Log::dataFindingTime();
// Do templating
$dispatcher = new Dispatcher();
$templatedData = $dispatcher->createTemplates($result, $request->template);
$headerType = '';
// Figure out which schema to use
if ($result instanceof Exception || $result instanceof Message) {
	$responseCode = $result->responseCode;
} else {
	$responseCode = 200;
}
$output = '';
if ($request->format == 'json') {
	if (is_string ($templatedData)) $output = $templatedData;
	else {
		if ($profile) {
			$profiler_namespace = 'hypercities';  // namespace for your application
			$xhprof_data = \xhprof_disable();
			$xhprof_runs = new \XHProfRuns_Default();
			$run_id = $xhprof_runs->save_run($xhprof_data, $profiler_namespace);
		 
			// url to the XHProf UI libraries (change the host name and path)
			$profiler_url = sprintf('/xhprof/index.php?run=%s&source=%s', $run_id,
				$profiler_namespace
			);
			$templatedData = array(
				"data" => $templatedData,
				"profilerUrl" => $profiler_url,
			);
		}
		$output = json_encode ($templatedData);
	}
	// Handle cross-domain requests via JSONP
	if ($request->callback) {
		$output = $request->callback . '(' . $output . ')';
	}
	$headerType = 'application/json';
} elseif ($request->format == 'kml') {
	$headerType = 'application/xml';
	$response = new KmlResponse();
	// TODO: Figure out how to append these items
	if (is_array($templatedData)) {
		foreach ($templatedData as $row) {
			$row->toXMLAt($baseNode);
		}
	} else {
		if (!($templatedData instanceof Exception || $templatedData instanceof Message)) {
			// Check if the object is a collection. If true, append document node. 
			if (isCollection($templatedData->id)) {
				$baseNode = $response->setDocumentNode($templatedData->id);
			} else {
				$baseNode = $response->kmlNode;
			}
		} else {
			$baseNode = $response->setDocumentNode(NULL);
		}
		$templatedData->toXMLAt($baseNode);
	}
	$output = $response->saveXml();
	// remove any "default" namespaces that have slipped through
	$output = preg_replace('/\<default:/', '<', $output);
	$output = preg_replace('/\<\/default:/', '</', $output);
}

Log::templatingTime();
header('Content-type: ' . $headerType, true, (int) $responseCode);
echo $output;
?>
