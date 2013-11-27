<?php
include_once("includes/dbUtil.inc");
include_once("includes/serverSession.inc");

//test case
/*
$_POST['title']       = "newCollection1";
$_POST['description'] = "This is a test for adding a new collection.";
$_POST['creator']     = "Jay";
$_POST['copyright']   = "CCBY";
$_POST['state']       = 2;
$_POST['password']    = "123";
$_POST['addTo']       = "13771";
*/

//session_start();
cServerSession::start();
HC_checkReferer();


$_POST = HC_cleanInput($_POST, array('title' => 'str', 
                                     'description' => 'str', 
									 'creator' => 'str',
                                     'copyright' => 'str', 
									 'state' => 'int', 
									 'password' => 'str', 
									 'parents' => 'str', 
									 'responseType' => 'str'),  
						array('title', 'description', 'state', 'parents'), 
						array('creator', 'copyright', 'password', 'responseType'));

$title         = $_POST['title'];
$description   = $_POST['description'];
$creator       = $_POST['creator'];
$copyright     = $_POST['copyright'];
$state         = $_POST['state'];
$password      = trim($_POST['password']);
$password      = (empty($_POST['password'])) ? NULL : md5($_POST['password']);
$addTo         = explode(",", $_POST['parents']);
$createTime    = "NOW()";
$kml           = '';
$dateFrom      = NULL;
$dateTo        = NULL;
$neLat         = NULL;
$neLon         = NULL;
$swLat         = NULL;
$swLon         = NULL;
$view          = NULL;
$userId        = cServerSession::getUserId();
$responseType  = $_POST['responseType'];

try
{
	$result = insertCollection($title, $description, $creator, $copyright, $createTime, $userId,
								$kml, $dateFrom, $dateTo, $neLat, $neLon, $swLat, $swLon, $view,
								$password, $state);

	$collectionId = $result["collectionId"];

	foreach ($addTo as $parentColId) {
		$objectRelationId = insertObjectRelations(array($collectionId), $parentColId, $userId, $createTime);
	}

	if (strcasecmp($responseType, "json") == 0) {
		$responseJson = '{"id":' . $collectionId
						. ', "title": "' . $title
						. '", "owner":' . $userId . '}';
		HC_reportSuccess($responseJson);
	} else {
		HC_reportSuccess("Collection created successfully.\n"
			." Please note the collection will not show up in the collection list\n"
			." until you add a new object to it.");
	}	
}
catch (MysqlException $e)
{
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("creating the collection");
}
catch (Exception $e)
{
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportGeneralError("creating the collection");
}
?>
