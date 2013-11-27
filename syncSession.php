<?php
include_once("include/serverSession.inc");
header("Content-Type: text/xml");

//writeToLog(cLog::cObject, "in syncSession, post is ".print_r($_POST, true));
cServerSession::synchronize($_POST);

// return some xml
$dom = new DomDocument('1.0');
$dom->formatOutput = true; // set the formatOutput attribute of domDocument to true 

$test_node = $dom->appendChild($dom->createElement("test"));
$test_node->appendChild($dom->createTextNode("testing"));

$returnXml = $dom->saveXML(); // put string in test1 
echo $returnXml;
?>
