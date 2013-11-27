<?php
include_once("includes/dbUtil.inc");
include_once("includes/user.inc");
include_once("includes/serverSession.inc");

//session_start();
cServerSession::start();
HC_checkReferer();

/*
//test case
$_POST['userId'] = 19;
$_POST['collections'] = "8835,8594";
*/

$HC_POST = HC_cleanInput($_POST, array("userId" => "int", "collections" => "str"), 
								array("userId", "collections"), NULL);
$result = true;
$userId = $HC_POST['userId'];
$user = new cUser();
$myCollectionId = $user->getMyCollectionId($userId);
$oldIdArray = $user->getMyCollections($userId);

if (empty($HC_POST['collections'])) $newIdArray = array();
else $newIdArray = explode(",", $HC_POST['collections']);

//HC_debugLog($myCollectionId);
//HC_debugLog("oldIdArray = ".print_r($oldIdArray, true));
//HC_debugLog("newIdArray = ".print_r($newIdArray, true));

foreach ($oldIdArray as $childrenId) {
	if(!in_array($childrenId, $newIdArray))
		$result = delete("object_relations", "`object_id` = $myCollectionId"
						." and `subject_id` = $childrenId");
}

foreach($newIdArray as $newChildrenId) {
	if(!in_array($newChildrenId, $oldIdArray))
	{
		$object = array('object_id' => $myCollectionId,
						'subject_id' => $newChildrenId,
						'scope_id' => $myCollectionId,
						'owner_id' => $userId,
						'created_at' => 'NOW()',
						'updated_at' => 'NOW()');
		$result = insert("object_relations", $object);
	}
}

if ($result) HC_reportSuccess("'My Collections' was successfully updated.");
else HC_reportError("Updating 'My Collections' failed.");

?>
