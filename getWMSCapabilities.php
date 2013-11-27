<?php

require_once "includes/util.inc";

HC_checkReferer();

// do request
$url = parse_url(urldecode($_GET['url']));
$params = array();
parse_str($url["query"], $params);
$params['request'] = "GetCapabilities";

$query_array = array();
foreach( $params as $key => $key_value ){
	$query_array[] = $key . '=' . urlencode( $key_value );
}
$requested_layers = isset($params['layers']) ? $params['layers'] :
		isset($params['LAYERS']) ? $params['layers'] : array();

$param_string = implode( '&', $query_array );
$ch = curl_init($url["scheme"] . "://" . $url["host"] . $url["path"] . "?" . $param_string);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
$data = curl_exec($ch);

curl_close($ch);
// check for exceptions

// parse XML and find all layers
$get_capabilities_doc = simplexml_load_string($data);

$exceptions = $get_capabilities_doc->xpath("//ServiceException");

if (count($exceptions) !== 0) {
	die(json_encode($exceptions));
}


$layer_elements = $get_capabilities_doc->xpath("//Layer");
//print_r($layer_elements);


$layers = array();
// TODO: search for supported SRSes
foreach($layer_elements as $layer_element) {
	// If the user requested specific layers, include only these
	if ($requested_layers) {
		if (in_array($layer_element->Name, $requested_layers)) {
			$bbox = $layer_element->BoundingBox;
			$layers[] = array(
				'srs' => (string)$layer_element->SRS,
				'bbox' => array(
					"minx" => (float)$bbox["minx"],
					"miny" => (float)$bbox["miny"],
					"maxx" => (float)$bbox["maxx"],
					"maxy" => (float)$bbox["maxy"],
				),
			);
		}
	} else { // otherwise, include all layers
		$bbox = $layer_element->BoundingBox;
		$layers[] = array(
			'srs' => (string)$layer_element->SRS,
			'bbox' => array(
				"minx" => (float)$bbox["minx"],
				"miny" => (float)$bbox["miny"],
				"maxx" => (float)$bbox["maxx"],
				"maxy" => (float)$bbox["maxy"],
			),
		);
	}
}

// find bounding boxes for desired layers and compute the maximum bounding box
$max_bounds = array(
	'minx' => null,
	'miny' => null,
	'maxx' => null,
	'maxy' => null,
	'url' => urldecode($_GET['url']),
);

foreach($layers as $layer)  {
	$bbox = $layer["bbox"];
	if ( $bbox["minx"] == -180 && $bbox["miny"] == -90 &&
			$bbox["maxx"] == 180 && $bbox["maxy"] == 90) {
		continue;
	}
	foreach ($max_bounds as $k => &$v) {
		if ($v === null) {
			$v = $layer["bbox"][$k];
		} elseif (strpos("min", $k) === 0) {
			if ($v > $layer["bbox"][$k]) $v = $layer["bbox"][$k];
		} elseif (strpos("max", $k) === 0) {
			if ($v < $layer["bbox"][$k]) $v = $layer["bbox"][$k];
		}
	}
}

header("Content-Type:application/json");
echo json_encode($max_bounds);
?>
