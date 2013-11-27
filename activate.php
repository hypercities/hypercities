<?php
include_once("includes/connect_db.inc");
include_once("includes/util.inc");
include_once("includes/dbUtil.inc");


$hash = $_GET['hash'];
$stamp = $_GET['stamp'];
$success = false;
$email_id = "";
$admin_code = false;

if (!empty($hash) && !empty($stamp)) {
	// has hash and stamp information
	try {
		$sql= "UPDATE users SET user_state_id = 10  WHERE (password='".$hash."') AND"
			. " ( created_at ='".base64_decode($stamp)."')";
		$result = sqlCommand($sql);
		if ($result) $success = true;
		else $success = false;
	} catch (MysqlException $e)	{
		$message = 'Caught exception: '.$e->getMessage();
		HC_errorLog($message);
		$message = "Sorry! Activation failed! Database exception occurred.\n".
				   "Please try again. If it still has problem, please contact administrator.";
		HC_reportError($message);
	} catch (Exception $e) {
		$message = 'Caught exception: '.$e->getMessage();
		HC_errorLog($message);
		$message = "Sorry! Activation failed! Exception occurred.\n".
				   "Please try again. If it still has problem, please contact administrator.";
		HC_reportError($message);
	}
} else {
	echo "You have come to a page that doesn't exist.";
}

?>

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<link rel="stylesheet" type="text/css" href="css/regForm.css" />
<title>:: Hypercities :: </title>
</head>

<body>
<div id="regWrapper">
<?php	
if ($success) {
	$host  = $_SERVER['HTTP_HOST'];
	$uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
	$extra = "#login";
	$url = "http://$host$uri/$extra";

	header("refresh: 15; $url");

	echo "<h1>Your account has been activated</h1>";
	echo "Thanks for registering ".$email.".  Activation completed.<br>"; 
	if ($admin_code) {
		echo "You have been given $admin_code privileges<br>";
	}
	echo "You may now login to Hypercities.<br><br>";
	echo "<a href='".$url."'>Go to Hypercities</a>";

	echo "<br><br>You will now be redirected to Hypercities in 15 seconds.<br>";

} else {
	echo "<h1>Activation failed.</h1>";
	echo "Please register again or contact administrator.";
}
?>
</div>
</body>
