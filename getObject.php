<?php

include_once('includes/connect_db.inc');
include_once('includes/util.inc');
include_once('includes/dbUtil.inc');
include_once("includes/serverSession.inc");
include_once 'includes/HCDomDocumentWrapper.inc.php';
include_once 'includes/HCKmlDocWrapper.php';

cServerSession::start();


if( isset($_POST['object_id']) ) {

    $HC_POST = HC_sanitizeInput($_POST, array('object_id'=>'int'));

    $objectId = $HC_POST['object_id'];
    $creator = "";
    $title = "";
    $copyright = "";
    $content = "";
    $lat = "";
    $lon = "";
    $objectTypeId = "";

    //select content seperately, because some objects can have no content
	$queryString = "SELECT c.content FROM contents c, objects o WHERE o.id="
					.$objectId." AND o.content_id = c.id";
    $result = sqlCommand($queryString);
    foreach ($result as $row) {
        $content = $row['content'];
    }

    $result = select("objects", "id = $objectId");
    // If the user entered an invalid ID
    if ($result->affected_rows == 0) {
        $response = new HCDomDocument();
        
    }
    foreach ($result as $row) {
        $copyright = $row['copyright'];
        $title = $row['title'];
        $creator = $row['creator'];
        $objectTypeId = $row['object_type_id'];
    }

    //query geolocation of polygon, polyline
	$queryString4 = "SELECT gr.latitude, gr.longitude FROM `object_mappings` AS om,"
				. " `object_mappings_geo_references` AS omgr, `geo_references` AS gr"
				. " WHERE om.object_id = ".$objectId."	AND om.id = omgr.object_mapping_id"
				. " AND omgr.geo_reference_id = gr.id";
    $result4 = sqlCommand($queryString4);
    $firstItemFlag = true;
    $doc = new HCKmlDocWrapper();

    $placemark = $doc->createPlacemarkNode($objectId);
    $placemark->createAndAppendTextNodes( array (
        'id'        =>  $objectId,
        'name'     =>  $title,
        )
    );

    $objTimelines = $doc->kmlNode->createAndAppendNode('timelines');
	$queryString2= "SELECT kml, marker_style_id, date_from, date_to,"
				. " dateFrom_isBC, dateTo_isBC from object_mappings"
				. " where object_id =".$objectId;
    $result2 = sqlCommand($queryString2);
    foreach ($result2 as $row2) {
       $placemark->createMarkerFromKmlField ($row2['kml']);
    }

    foreach ($result4 as $row4) {
        if ($firstItemFlag) {
            $lat = $row4['latitude'];
            $lon = $row4['longitude'];
            $firstItemFlag = false;
        }
        else {
            $lat .= ", ".$row4['latitude'];
            $lon .= ", ".$row4['longitude'];
        }
    }

    //find the parent id
    $obj_collections = $doc->kmlNode->createAndAppendNode('collections');
    $queryString3= "SELECT object_id from object_relations where subject_id =".$objectId;
    $result3 = sqlCommand($queryString3);
    foreach ($result3 as $row3) {
        $obj_collections->createAndAppendTextNodes (array ('id' => $row3['object_id']));
    }

    //echo dom as xml
    $doc->formatOutput = true;
    $obj_full_info = $doc->saveXML($doc->kmlNode);
    header('Content-type: application/xml');
    echo $obj_full_info;
}
?>
