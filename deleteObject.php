<?php
include_once('includes/connect_db.inc');
include_once('includes/util.inc');
include_once('includes/dbUtil.inc');
include_once('includes/serverSession.inc');

cServerSession::start();
HC_checkReferer();


$HC_POST = HC_cleanInput($_POST, array('objectId'=>'int', 'parentId'=>'int'), 
						array('objectId', 'parentId'), null);

$objectId = $HC_POST['objectId'];
$parentId = $HC_POST['parentId'];

try {
	//do not delete object from database, remove object relation and mark 
	//the object as "deleted" if all relations are gone
	$allQueryOk = deleteObject($objectId, $parentId);

	//do not update Public collection's boundary and time because of performance issues
	if ($parentId != HC_PUBLIC_COLLECTIONS_ID) {
		//update the boundary and timespan of the collection and its parents 
		//up to base collections
		$object = updateColTimeBoundBottomUp($parentId);
	}

	if ($allQueryOk) HC_reportSuccess("Object successfully deleted.");
	else HC_reportError("Object deletion error!");

} catch (MysqlException $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("deleting the object");
} catch (Exception $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportGeneralError("deleting the object");
}
?>
