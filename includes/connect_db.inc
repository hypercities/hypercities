<?php

/**
 * Basic HyperCities mysql connection.
 * mysqli connection is handled in database.inc.
 * 
 */

include_once('includes/constants.inc');
mysql_connect(DB_HOST,DB_USER,DB_PASS) or die( "Unable to connect to database" );
mysql_select_db(DB_NAME) or die( "Unable to select database" );


mysql_query("SET NAMES 'utf8'");
mysql_query("SET CHARACTER_SET_CLIENT=utf8");
mysql_query("SET CHARACTER_SET_RESULTS=utf8"); 
?>
