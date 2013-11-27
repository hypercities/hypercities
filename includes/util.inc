<?php
// vim: ts=4:sw=4:fdc=2:nu:nospell

/**
 * @file
 * HyperCities utility library.
 *
 * Several functions are provided for error reporting and error logging.
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-04-30
 * @version   $Id$
 *
 */

include_once("includes/constants.inc");
include_once("includes/HCDate.inc");

/**
 * Check page request referee
 * @return void
 */
function HC_checkReferer() {

	// Get host name from URL
	preg_match('@^(?:http://)?([^/]+)@i', $_SERVER['HTTP_REFERER'], $matches);
	$referer_host = $matches[1];
	$correct_host = $_SERVER['SERVER_NAME'];

	// Show forbidden and exit if referer_host != correct_host
	if (strncmp($referer_host, $correct_host, strlen($correct_host))) {
		HC_showForbidden(); 
	} 
}

/**
 * Log forbidden access and display customized 403 page.
 * @return void
 */
function HC_showForbidden() {

	HC_errorLog("403 Forbidden");

	header('HTTP/1.1 403 Forbidden');

	echo "<!DOCTYPE HTML PUBLIC \"-//IETF//DTD HTML 2.0//EN\">\n";
	echo "<html><head>\n";
	echo "<title>403 Forbidden</title>\n";
	echo "</head><body>\n";
	echo "<h1>Forbidden</h1>\n";
	echo "<p>You don't have permission to access "
		.$_SERVER['REQUEST_URI']." on this server.</p>\n";
	echo "<hr>\n";
	echo "<address>Apache/2.2.9 (Fedora) Server at "
		.$_SERVER['HTTP_HOST']." Port 80</address>\n";
	echo "</body></html>\n";

	exit(0);
}

/**
 * Log error message and return the message with XML format.
 *
 * @param String $errorMsg: A string containing error message.
 * @return void
 */
function HC_reportError($errorMsg) {

	HC_errorLog("reportError: $errorMsg");

	header('Content-type: application/xml');

	$dom = new DomDocument('1.0','utf-8');
	$xml = $dom->appendChild($dom->createElement('Error'));
	$msg = $xml->appendChild($dom->createElement('Message'));
	$msg->appendChild($dom->createTextNode($errorMsg));

	$dom->formatOutput = true;
	echo $dom->saveXML();

	exit(0);
}

/**
 * Report database error
 * @param String $operationName: the database operation
 * @return void
 */
function HC_reportDBError ($operationName) {
	HC_reportError("Sorry, $operationName failed. Please try again.\n"
				. "If the problem happens another time, "
				. "please contact the administrator \nand report that a "
				. "'database error' occurred.");
}

/**
 * Report general error
 * @param String $operationName: the general operation
 * @return void
 */
function HC_reportGeneralError ($operationName) {
	HC_reportError("Sorry, $operationName failed. Please try again.\n"
				. "If the problem happens another time, "
				. "please contact the administrator \nand report that a "
				. "'general error' occurred.");
}

/**
 * Return success message with XML format.
 * @param String $msg: the success message
 * @return void
 */
function HC_reportSuccess($msg) {

	header('Content-type: application/xml');

	$dom = new DomDocument('1.0','utf-8');
	$xml = $dom->appendChild($dom->createElement('Success'));
	$time = $xml->appendChild($dom->createElement('time'));
	$time->appendChild($dom->createTextNode(date('Y-m-d H:i:s')));
	if (isset($msg) && !is_null($msg) ) {
		$message = $xml->appendChild($dom->createElement('Message'));
		$message->appendChild($dom->createTextNode(trim($msg)));
	}
	
	$dom->formatOutput = true;
	echo $dom->saveXML();

	exit(0);
}

/**
 * Log message to file.
 *
 * @param String $msg:
 *   A string containing the message.
 * @param String $logFile:
 *   A string containing file name that the message should be logged.
 * @return: TRUE on success or FALSE on failure.
 */
function HC_Log($msg, $logFile) {

	$timestamp = date('[D M d H:i:s T Y] ');
	$client    = '[' . HC_getClientIP() . '] ';
	$uri       = 'no uri';
	$referer   = 'no referer';
	$msg       = print_r($msg, true);

	if (isset($_SERVER['REQUEST_URI']))
		$uri = $_SERVER['REQUEST_URI'];
	
	if (isset($_SERVER['HTTP_REFERER']))
		$referer = 'referer: ' . $_SERVER['HTTP_REFERER'];
	
	$msg = $timestamp . $client . $uri . " - " . $msg . ", ". $referer . "\n";

	return error_log($msg, 3, $logFile);
}

/**
 * Log error message to HC_ERROR_LOGFILE.
 *
 * @param String $errorMsg: A string containing error message.
 * @return Boolean: TRUE on success or FALSE on failure.
 */
function HC_errorLog($errorMsg) {
	return HC_Log($errorMsg, HC_ERROR_LOGFILE);
}

/**
 * Log debug message to HC_DEBUG_LOGFILE.
 *
 * @param String $debugMsg: A string containing debug message.
 * @return Boolean: TRUE on success or FALSE on failure.
 */
function HC_debugLog($debugMsg) {
	return HC_Log($debugMsg, HC_DEBUG_LOGFILE);
}

/**
 * Get client IP address.
 * @return String $ip: the client IP address
 */
function HC_getClientIP() {

    $ip = "unknown";

	if (getenv("HTTP_CLIENT_IP") && strcasecmp(getenv("HTTP_CLIENT_IP"), "unknown")) {
		$ip = getenv("HTTP_CLIENT_IP");
	} else if (getenv("HTTP_X_FORWARDED_FOR") 
			&& strcasecmp(getenv("HTTP_X_FORWARDED_FOR"), 
			"unknown")) {
		$ip = getenv("HTTP_X_FORWARDED_FOR");
	} else if (getenv("REMOTE_ADDR") && strcasecmp(getenv("REMOTE_ADDR"), "unknown")) {
		$ip = getenv("REMOTE_ADDR");
	} else if (isset($_SERVER['REMOTE_ADDR']) && $_SERVER['REMOTE_ADDR'] && 
			strcasecmp($_SERVER['REMOTE_ADDR'], "unknown")) {
		$ip = $_SERVER['REMOTE_ADDR'];
	}

	return($ip);
}

/**
 * Create KML Time String
 * @param String $date: the date string
 * @param Boolean $dataIsBC: indicate if $date is a BC date
 * @return String $timeString: the time string
 */
function HC_getKmlTimeString($date, $dateIsBC) {
    if (is_null($date)) return NULL;

    $timeString = $date;

	$timeString[10] = "T";

	$timeString .= date("P");

	if ( $dateIsBC == '1' ) {
		$timeString = "-". $timeString;
	}

	return $timeString;
}

/**
 * Check if a URL is valid
 * @param String $url
 * @return Boolean TRUE if return http response is 200, 301 or 302
 */
function HC_checkUrl($url) {

	$handle = curl_init(trim($url));
	curl_setopt($handle,  CURLOPT_RETURNTRANSFER, TRUE);

	/* Get the HTML or whatever is linked in $url. */
	$response = curl_exec($handle);

	/* Check for 404 (file not found). */
	$httpCode = curl_getinfo($handle, CURLINFO_HTTP_CODE);
	curl_close($handle);

	if($httpCode == 200 || $httpCode == 301 || $httpCode == 302) {
		return true;
	} else {
		return false;
	}
}

/**
 * Sanitize Input Data
 *
 * HC_sanitizeInput($_POST, array('id'=>'int', 'name' => 'str'), 
 *					array('id', 'name'), null);
 *
 * @param array $data
 * @param array $dataFormat
 * @param array $required required fields
 * @param array $optional optional fields
 * @return array $data
 */
function HC_sanitizeInput($data, $dataFormat, $required = NULL, $optional = NULL) {

	$data = array_intersect_key($data, $dataFormat); 

	// Check required field is set
	if ($required) {
		foreach ($required as $key) {
			if (!array_key_exists($key, $data)) {
				HC_reportError('Missing required field : ' . $key);
			}
		}
	}

	// Sanitize Input data
	foreach ($data as $key => $val) {

		$value = $data[$key];
		$type  = $dataFormat[$key];
		$cleanValue = NULL;

		switch ($type) {

			case 'int': // integer
				if (!is_numeric($value))
					HC_reportError('Incorrect input type: ' . $key . ' should be int');

				$cleanValue = intval($value);
				break;

			case 'float': // float
				if (!is_numeric($value))
					HC_reportError('Incorrect input type: ' . $key . ' should be float');

				$cleanValue = floatval($value);
				break;

			case 'str': // string
				$cleanValue = trim($value);
				break;

			case 'dtime': // dateTime, check if it is a HCDate 
				$cleanValue = trim($value);
				if (!HCDate::validateDate($value))
					HC_reportError('Incorrect input type: ' . $key . ' should be date');

				break;

			case 'urlenc': // encoded URL
				$cleanValue = urlencode(trim($value));
				break;

			case 'urldec': // decoded URL
				$cleanValue = urldecode(trim($value));
				break;
		}

		$data[$key] = $cleanValue;
	}

	// Set missing optional field 
	if ($optional) {
		foreach ($optional as $key) {
			if (!array_key_exists($key, $data)) {
				$data[$key] = NULL;
			}
		}
	}

	return $data;
}


/**
 * Clean Input Data
 * This function differs from HC_sanitizeInput in the following aspects:
 * 1. fields not specified in $dataFormat will not be removed
 * 2. data containing string "null" will be converted to NULL
 *
 * e.g., HC_cleanInput($_POST, array('id'=>'int', 'name' => 'str'), 
 *					array('id', 'name'), null);
 *
 * @param array $data
 * @param array $dataFormat
 * @param array $required required fields
 * @param array $optional optional fields
 * @return array $data
 */
function HC_cleanInput($data, $dataFormat, $required = NULL, $optional = NULL) {

	//unset element which has value of "null"
	//it will be converted to NULL after sanitized
	foreach ($data as $key => $value)
	{
		if (strcasecmp($value, "null") == 0)
			unset($data[$key]);
	}

	//save different data in $data against $dataFormat, these data will not be sanitized
	$dataDiff = array_diff_key($data, $dataFormat);
	
	//sanitized data specified in $dataFormat only
	$dataSanitized = HC_sanitizeInput($data, $dataFormat, $required, $optional);
	
	//merge diff data and sanitized data	
	$data = array_merge($dataDiff, $dataSanitized);

	return $data;
}

/** 
 * Return max value, this function can handle NULL. 
 * If one is NULL, return the other
 * If both are NULL, return NULL
 * @param Number $value1
 * @param Number $value2
 * @return Number: the max value
 */
function HC_max($value1, $value2)
{
	if (is_null($value1)) return $value2;
	if (is_null($value2)) return $value1;

	return max($value1, $value2);
}

/** 
 * Return min value, this function can handle NULL. 
 * If one is NULL, return the other
 * If both are NULL, return NULL
 * @param Number $value1
 * @param Number $value2
 * @return Number: the min value
 */
function HC_min($value1, $value2)
{
	if (is_null($value1)) return $value2;
	if (is_null($value2)) return $value1;

	return min($value1, $value2);
}

?>
