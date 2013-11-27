<?php
include_once('includes/util.inc');

HC_checkReferer();
//fetch image from posted url
$url = $_GET["url"];

$url = urldecode($url);
$urlArray = parse_url($url);

$ch = curl_init();
$timeout = 10;
$userAgent = $_SERVER['HTTP_USER_AGENT'];
$referer = $urlArray['scheme']."://".$urlArray['host']."/";

curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $timeout);
curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
curl_setopt($ch, CURLOPT_REFERER, $referer);

$response = curl_exec($ch);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);
header('Content-type: '.$content_type);
echo $response;
?>
