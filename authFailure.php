<?php
include_once 'includes/serverSession.inc';
cServerSession::start();

//$error = $_SESSION['error'];

$messages = array(
	'expiredToken' => array(
		'message' => 'Please have the instructor of this class report to the '
		. 'Moodle team or to the HyperCities team that an expired token was used.',
		'type' => 'Expired Token'
	),
	'notLoggedIn' => array(
		'title'	=> 'Not Logged In',
		'message' => 'Sorry, you must be logged in to HyperCities to use this feature.',
		'type'	=> 'Not Logged In'
	),
	'notEnrolled' => array(
		'title'	=> 'Not Enrolled',
		'message' => 'You are not allowed to view this class collection because you are not'
		. ' enrolled in this course. If you believe you have received this message'
		. ' in error, please have your instructor contact the Moodle'
		. ' team.',
		'type' => 'Not Enrolled'
	),
	'remoteConnectionFailure' => array(
		'message' => 'There was an error connecting to Moodle to authenticate your access'
		. ' to this class. Please contact the instructor of this course, or'
		. ' the HyperCities or Moodle teams.',
		'type' => 'RemoteConnectionFailure'
	)
);
if (isset($reason)) {
	$message = $messages[$reason];
} elseif (isset($_GET['reason'])) {
	$message = $messages[$_GET['reason']];
}
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
    <head>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
		<title>Error: <?php echo $message['title']; ?></title>
		<style type="text/css">
			#errorMessage {
				position: absolute;
				left: 30%;
				top: 30%;
				/*border: solid #000 1px;*/
				height: 30%;
				width: 37%;
			}
			#errorTitle {
				-moz-border-radius-topleft:15px;
				-moz-border-radius-topright:15px;
				webkit-border-top-left-radius:15px;
				-webkit-border-top-right-radius:15px;
				border-top-left-radius:15px;
				border-top-right-radius:15px;
				background-attachment:scroll;
				background-color:#33CCFF;
				background-image:url("./images/background-navmenu.gif");
				background-position:left top;
				background-repeat:repeat-x;
				border-left:4px solid #33CCFF;
				border-right:4px solid #33CCFF;
				border-top:4px solid #33CCFF;
				font-size:large;
				font-weight:bold;
				height:15%;
				padding:10px;
				text-align:center;
				color:#FFF;
			}
			#errorDescription {
				background-color:#FFF;
				border-left:4px solid #33CCFF;
				border-right:4px solid #33CCFF;
				font-size:small;
				font-weight: bold;
				height:67%;
				padding:10px;
			}
			#errorFooter {
				-moz-border-radius-bottomleft:15px;
				-moz-border-radius-bottomright:15px;
				-webkit-border-bottom-right-radius:15px;
				-webkit-border-bottom-left-radius:15px;
				background-attachment:scroll;
				background-color:#33CCFF;
				background-image:url("images/background-navmenu.gif");
				background-position:left top;
				background-repeat:repeat-x;
				border-bottom:4px solid #33CCFF;
				border-left:4px solid #33CCFF;
				border-right:4px solid #33CCFF;
				color:#FFFFFF;
				font-weight:bold;
				height:15%;
				padding:10px;
				text-align:center;
			}
			body {
				background-color: #FFF;
				font-family: Verdana, Geneva, sans-serif;
				color: #00F;
			}
		</style>
    </head>

    <body>
		<div id="errorMessage">
			<div id="errorTitle">Authentication Failure</div>
			<div id="errorDescription">
				<p><?php echo $message['message'] ?></p>
			</div>
			<div id="errorFooter">* * * <?php echo $message['type'] ?> * * * </div>
		</div>
    </body>
</html>

<?php
?>