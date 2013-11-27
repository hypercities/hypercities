<?php
include('includes/util.inc');
preg_match('@^(?:http://)?([^/]+)@i', $_SERVER['HTTP_REFERER'], $matches);
$pattern = '/'.$_SERVER['SERVER_NAME'].'/';

if(!preg_match($pattern, $matches[0])) {

	HC_showForbidden();

} else {

    //fetch XML feed from posted url
    $url = $_GET["url"];

    $url = urldecode($url);

    $ch = curl_init();
    $timeout = 60;
    $userAgent = $_SERVER['HTTP_USER_AGENT'];
    $header[] = "Content-type: text/xml";


    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $header );
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);

    $tempPath = "uploadedKml";
    $targetPath = $_SERVER['SCRIPT_FILENAME'];
    $targetPath = str_replace('kmlProxy.php', '', $targetPath).$tempPath."/";
    $filename = "temp" . time() . ".kml";
    $targetFile =  str_replace('//','/',$targetPath).$filename;
    //echo $targetFile;

    $fp=fopen($targetFile, "w") or die("can't open file");


    $response = curl_exec($ch);

    if (curl_errno($ch)) {
    	HC_errorLog(curl_error($ch));
    }
    else {
        fwrite($fp, $response);
        fclose($fp);
        curl_close($ch);
        echo $response;
    } 
}
?>
