<?php

include_once('includes/database.inc');
include_once('includes/dbUtil.inc');
include_once('includes/util.inc');
include_once("includes/serverSession.inc");

//session_start();
cServerSession::start();
HC_checkReferer();

$HC_POST = HC_cleanInput($_POST,
			array('id'=>'int',
				'date_from'=>'dtime',
				'date_to'=>'dtime',
				'publication_date'=>'dtime',
				'title'=>'str',
				'title_en'=>'str',
				'creator'=>'str',
				'publisher'=>'str',
				'copyright_notice'=>'str',
				'caption'=>'str',
				'caption_en'=>'str',
				'collection_source'=>'str',
				'call_number'=>'str',
				'map_size'=>'str',
				'scale'=>'str',
				'description'=>'str'),
			array('id'),
			array('date_from',
				'date_to',
				'publication_date',
				'title',
				'title_en',
				'creator',
				'publisher',
				'copyright_notice',
				'caption',
				'caption_en',
				'collection_source',
				'call_number',
				'map_size',
				'scale',
				'description')
			);

$userId = cServerSession::getUserId();

$mapId = $HC_POST['id'];

//HC_debugLog(var_dump($HC_POST, false));

$db = database::getInstance();

$params = array('type'=>'');
$query_str = "UPDATE `maps` SET ";
$totalUpdates = 0;

foreach ($HC_POST as $key => &$value) {
	if ( $key != "id" && $value !== NULL ) {
		if ( is_string($value) && strlen($value) == 0 ) {
			$query_str .= "`". $key . "` = NULL, ";
			$totalUpdates++;
		} else {
			$query_str .= "`". $key . "` = ?, ";
			$params['type'] .= "s";
			$params[] = &$value;
			$totalUpdates++;
		}
	}
}
$query_str .= "`updated_at` = NOW() WHERE `id` = ?";
$params['type'] .= "i";
$params[] = &$mapId;

//HC_debugLog(var_dump($params, false));
//HC_debugLog($query_str);
// If we need to change something. do it.
if ($totalUpdates > 0)  {
	$result = $db->preparedQuery($query_str, $params);

	if (!$result) {
		HC_errorLog("Fail to update map $mapId : " . $db->getError());
		HC_reportError("Database Error : Unable to update Map.");
	}
}

HC_reportSuccess();
?>
