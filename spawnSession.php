<?php

    include_once 'includes/serverSession.inc';
    // Set authentication type and base collection
	cServerSession::setVar('providerName', $_GET['authType']);
    $_SESSION['redirect'] = true;
    $_SESSION['openId'] = "http://admin.cdh.ucla.edu/cdhit/jlogin.php";
    $_SESSION['oidType'] = 0;
    if (!strrpos($_GET['collection'], ' ')) {
	//$_SESSION['baseCollection'] = $_GET['collection'];
	cServerSession::setVar('baseCollection', $_GET['collection']);
    }
    $redirectUrl = $_SERVER['SERVER_NAME']
		    .substr($_SERVER['PHP_SELF'], 0,
			    strlen($_SERVER['PHP_SELF']) - strlen('spawnSession.php')
			    )
		    .'loginOidReturn.php';
    header("Location: http://admin.cdh.ucla.edu/cdhit/jlogin.php?site=http://$redirectUrl");
?>
