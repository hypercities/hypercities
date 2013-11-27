<?php

include_once("includes/serverSession.inc");
include_once("includes/dbUtil.inc");
include_once("includes/user.inc");

// Start session
cServerSession::start();
HC_checkReferer();


$HC_POST = HC_sanitizeInput($_POST, array('id'=>'int', 'password'=>'str'), 
						array('id', 'password'), NULL);

$id = $HC_POST['id'];
$password = $HC_POST['password'];


try {

	$result = select("objects", "id = $id");

	if (strcmp($result[0]['password'], $password) == 0)
		$auth = true;
	else 
		$auth = false;

	header('Content-type: application/json');
	echo json_encode(array('auth' => $auth, 'id' => $id));

} catch (MysqlException $e) {

	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportDBError("check password");

} catch (Exception $e) {

	$message = 'Caught exception: '.$e->getMessage();
	HC_errorLog($message);
	HC_reportGeneralError("check password");

}
?>
