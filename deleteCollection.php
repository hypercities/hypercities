<?php
include_once('includes/connect_db.inc');
include_once('includes/util.inc');
include_once('includes/dbUtil.inc');
include_once('includes/serverSession.inc');
///*
cServerSession::start();
HC_checkReferer();

$HC_POST = HC_cleanInput($_POST, array('objectId'=>'int', 'parentId'=>'int'), 
							array('objectId', 'parentId'), null);

$objectId = $HC_POST['objectId'];
$parentId = $HC_POST['parentId'];
$userId = cServerSession::getUserId();
//*/
///* For Quick Manual Delete
//$userId = 13;
//$objectId = 16269;
//$parentId = 13763;
//*/

try {
	if (isOwner($objectId, $userId)) {
		//if current user is the owner, delete this collection from all 
		//other collections and mark it as deleted
		$allQueryOk = deleteCollectionAll($objectId);
	} else {
		//do not delete object from database, simply mark the object as "deleted"
		$allQueryOk = deleteCollection($objectId, $parentId);
	}

	//do not update Public collection's boundary and time because of performance issues
	if ($parentId != HC_PUBLIC_COLLECTIONS_ID) {
		/*update the boundary of the collecton*/
		$object = updateColTimeBoundBottomUp($parentId);
	}

	if ($allQueryOk) HC_reportSuccess("Delete collection success!");
	else HC_reportError("Delete collection error!");
} catch (MysqlException $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("deleting the collection");
} catch (Exception $e) {
	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportGeneralError("deleting the collection");
}
?>
