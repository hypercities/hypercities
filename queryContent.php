<?php
include_once('includes/connect_db.inc');
include_once('includes/util.inc');
include_once('includes/dbUtil.inc');
include_once('includes/serverSession.inc');
include_once('includes/bookmark.inc');

cServerSession::start();
HC_checkReferer();

if(isset($_POST['object_id'])) {
	$content= "";
	$query_str = "SELECT c.content, o.title, o.creator, o.copyright, o.owner_id"
				." FROM contents c, objects o WHERE o.id=".$_POST['object_id']
				." AND o.content_id = c.id";

	$result = mysql_query($query_str)
		or die('the query of gettting content info failed :'. mysql_error());
	HC_debugLog($query_str);
	while($row = mysql_fetch_array($result)) {
		$content = $row['content'];
		$copyright = $row['copyright'];
		$title = $row['title'];
		$creator = $row['creator'];
		$ownerId = $row['owner_id'];
	}

	$dom = new DomDocument('1.0','utf-8');

	$object = $dom->appendChild($dom->createElement('object'));
	$query_parent = "SELECT obr.object_id, o.title, obr.subject_id,latitude,"
					."longitude,kml,om.date_from, om.dateFrom_isBC, om.date_to,"
					." dateTo_isBC from object_relations as obr, objects as o,"
					." object_mappings as om, object_mappings_geo_references as omgr,"
					." geo_references as gr where obr.object_id in"
					."(SELECT object_id from object_relations where subject_id = "
					.$_POST['object_id'].") and obr.subject_id = o.id"
					." and o.id = om.object_id and om.id = omgr.object_mapping_id"
					." and omgr.geo_reference_id = gr.id";
	$query_parent .= " ORDER BY obr.order ASC, obr.subject_id ASC";
	$result_parent = mysql_query($query_parent)
			or die('the query of gettting parent info failed :'. mysql_error());

	$parent_array = array();
	$title_array = array();
	$lat_array = array();
	$lng_array = array();
	$kml_array = array();
	$date_from_array = array();
	$date_to_array = array();
	while($row = mysql_fetch_array($result_parent)) {
		if (!in_array($row['subject_id'], $parent_array[$row['object_id']])) {
			$parent_array[$row['object_id']][]= $row['subject_id'];
		}
		$title_array[$row['subject_id']] = $row['title'];
		$lat_array[$row['subject_id']] = $row['latitude'];
		$lng_array[$row['subject_id']] = $row['longitude'];
		$kml_array[$row['subject_id']] = $row['kml'];

		if ($row['dateFrom_isBC']) {
			//delete heading 0
			$row['date_from'] = ltrim(preg_replace("/^0+/", ' ', $row['date_from']));
			$row['date_from'] = HCDate::toBCDate($row['date_from']);
		}

		if ($row['dateTo_isBC']) {
			//delete heading 0
			$row['date_to'] = ltrim(preg_replace("/^0+/", ' ', $row['date_to']));
			$row['date_to'] = HCDate::toBCDate($row['date_to']);
		}
		$date_from_array[$row['subject_id']] = $row['date_from'];
		$date_to_array[$row['subject_id']] = $row['date_to'];

	}
	if (isset($_POST['parent_id'])) {
		$tmp_pre_obj_id = $pre_obj_id = 0;
		$next_obj_id = 0;
		$found_flag = false;
		foreach($parent_array[$_POST['parent_id']] as $index => $obj_id) {
			if($found_flag) {
				$next_obj_id = $obj_id;
				$found_flag = false;
			}
			if($obj_id == $_POST['object_id']) {
				$pre_obj_id = $tmp_pre_obj_id;
				$found_flag = true;
			}
			$tmp_pre_obj_id = $obj_id;
		}
		$parent = $object->appendChild($dom->createElement('parent'));
		$parent_id = $parent->appendChild($dom->createElement('id'));
		$parent_id->appendChild($dom->createTextNode($_POST['parent_id']));
		if($pre_obj_id !=0) {
			$previous_id = $parent->appendChild($dom->createElement('previous_id'));
			$previous_id->appendChild($dom->createTextNode($pre_obj_id));
			$previous_title = $parent->appendChild($dom->createElement('previous_title'));
			$previous_title->appendChild($dom->createTextNode($title_array[$pre_obj_id]));
			$previous_lat = $parent->appendChild($dom->createElement('previous_lat'));
			$previous_lat->appendChild($dom->createTextNode($lat_array[$pre_obj_id]));
			$previous_lng = $parent->appendChild($dom->createElement('previous_lng'));
			$previous_lng->appendChild($dom->createTextNode($lng_array[$pre_obj_id]));
			$previous_kml = $parent->appendChild($dom->createElement('previous_kml'));
			$previous_kml->appendChild($dom->createTextNode($kml_array[$pre_obj_id]));
			//get startTime, endTime
			$previous_starTime = $parent->appendChild($dom->createElement('previous_startTime'));
			$previous_starTime->appendChild($dom->createTextNode($date_from_array[$pre_obj_id]));
			$previous_endTime = $parent->appendChild($dom->createElement('previous_endTime'));
			$previous_endTime->appendChild($dom->createTextNode($date_to_array[$pre_obj_id]));
		}
		if ($next_obj_id != 0) {
			$next_id = $parent->appendChild($dom->createElement('next_id'));
			$next_id->appendChild($dom->createTextNode($next_obj_id));
			$next_title = $parent->appendChild($dom->createElement('next_title'));
			$next_title->appendChild($dom->createTextNode($title_array[$next_obj_id]));
			$next_lat = $parent->appendChild($dom->createElement('next_lat'));
			$next_lat->appendChild($dom->createTextNode($lat_array[$next_obj_id]));
			$next_lng = $parent->appendChild($dom->createElement('next_lng'));
			$next_lng->appendChild($dom->createTextNode($lng_array[$next_obj_id]));
			$next_kml = $parent->appendChild($dom->createElement('next_kml'));
			$next_kml->appendChild($dom->createTextNode($kml_array[$pre_obj_id]));
			//get startTime, endTime
			$next_starTime = $parent->appendChild($dom->createElement('next_startTime'));
			$next_starTime->appendChild($dom->createTextNode($date_from_array[$next_obj_id]));
			$next_endTime = $parent->appendChild($dom->createElement('next_endTime'));
			$next_endTime->appendChild($dom->createTextNode($date_to_array[$next_obj_id]));

		}
		unset($parent_array[$_POST['parent_id']]);
	}
	if (!isset($_POST['parent_id'])) {
		foreach ($parent_array as $k => $v) {
			$tmp_pre_obj_id = $pre_obj_id = 0;
			$next_obj_id = 0;
			$found_flag = false;
			foreach ($v as $index => $obj_id) {
				if ($found_flag) {
					$next_obj_id = $obj_id;
					$found_flag = false;
				}
				if ($obj_id == $_POST['object_id']) {
					$pre_obj_id = $tmp_pre_obj_id;
					$found_flag = true;
				}
				$tmp_pre_obj_id = $obj_id;	
			}
			$parent = $object->appendChild($dom->createElement('parent'));
			$parent_id = $parent->appendChild($dom->createElement('id'));
			$parent_id->appendChild($dom->createTextNode($k));
			if ($pre_obj_id !=0) {
				$previous_id = $parent->appendChild($dom->createElement('previous_id'));
				$previous_id->appendChild($dom->createTextNode($pre_obj_id));
				$previous_title = $parent->appendChild($dom->createElement('previous_title'));
				$previous_title->appendChild($dom->createTextNode($title_array[$pre_obj_id]));
				$previous_lat = $parent->appendChild($dom->createElement('previous_lat'));
				$previous_lat->appendChild($dom->createTextNode($lat_array[$pre_obj_id]));
				$previous_lng = $parent->appendChild($dom->createElement('previous_lng'));
				$previous_lng->appendChild($dom->createTextNode($lng_array[$pre_obj_id]));
				//get startTime, endTime
				$previous_starTime = $parent->appendChild($dom->createElement('previous_startTime'));
				$previous_starTime->appendChild($dom->createTextNode($date_from_array[$pre_obj_id]));
				$previous_endTime = $parent->appendChild($dom->createElement('previous_endTime'));
				$previous_endTime->appendChild($dom->createTextNode($date_to_array[$pre_obj_id]));
			}
			if($next_obj_id !=0) {
				$next_id = $parent->appendChild($dom->createElement('next_id'));
				$next_id->appendChild($dom->createTextNode($next_obj_id));
				$next_title = $parent->appendChild($dom->createElement('next_title'));
				$next_title->appendChild($dom->createTextNode($title_array[$next_obj_id]));
				$next_lat = $parent->appendChild($dom->createElement('next_lat'));
				$next_lat->appendChild($dom->createTextNode($lat_array[$next_obj_id]));
				$next_lng = $parent->appendChild($dom->createElement('next_lng'));
				$next_lng->appendChild($dom->createTextNode($lng_array[$next_obj_id]));
				//get startTime, endTime
				$next_starTime = $parent->appendChild($dom->createElement('next_startTime'));
				$next_starTime->appendChild($dom->createTextNode($date_from_array[$next_obj_id]));
				$next_endTime = $parent->appendChild($dom->createElement('next_endTime'));
				$next_endTime->appendChild($dom->createTextNode($date_to_array[$next_obj_id]));
			}
		}
	}

	$obj_id = $object->appendChild($dom->createElement('id'));
	$obj_id->appendChild($dom->createTextNode($_POST['object_id']));
	$obj_creator = $object->appendChild($dom->createElement('creator'));
	$obj_creator->appendChild($dom->createTextNode($creator));
	$obj_title = $object->appendChild($dom->createElement('title'));
	$obj_title->appendChild($dom->createTextNode($title));
	$obj_copyright = $object->appendChild($dom->createElement('copyright'));
	$obj_copyright->appendChild($dom->createTextNode($copyright));
	$objOwnerId = $object->appendChild($dom->createElement('ownerId'));
	$objOwnerId->appendChild($dom->createTextNode($ownerId));
	$start_time = $object->appendChild($dom->createElement('startTime'));
	$start_time->appendChild($dom->createTextNode($date_from_array[$_POST['object_id']]));
	$end_time = $object->appendChild($dom->createElement('endTime'));
	$end_time->appendChild($dom->createTextNode($date_to_array[$_POST['object_id']]));


	$desc_base = $object->appendChild($dom->createElement('description'));
	$ed_node = $desc_base->appendChild($dom->createElement('ExtendedData'));
	$obj_content = $ed_node->appendChild($dom->createElement('content'));
	$ed_node->setAttribute('xmlns:hc', 'http://hypercities.ats.ucla.edu');
        
	$descDom = new DomDocument();
	$descDom->loadHTML($content);
	$citations = $descDom->getElementsByTagName('citation');

	if ($citations->length > 0) {
		$id = $_POST['object_id'];
		$citationBase = $descDom->getElementsByTagName("citationlist")->item(0);
		$citationList = $dom->createElement("citationlist");
		$citationsCollection = $citationBase->getElementsByTagName("citation");
		for ($i = 0; $i < $citationsCollection->length; $i++) {
			$cit = $citationList->appendChild($dom->createElement("citation"));
			$cit->setAttribute('ref', $citationsCollection->item($i)->getAttribute('ref'));
			$cit->appendChild($dom->createCDATASection(
					$descDom->saveXML($citationsCollection->item($i))
				)
			);
		}
		$ed_node->appendChild($dom->importNode($citationList, TRUE));
		$citations = $descDom->getElementsByTagName('citation');
		for ($i = 0; $i < $citations->length; $i++) {
			$citationChildren = $citations->item($i)->cloneNode(TRUE); // Clone node and children
			$replacement = $descDom->createElement('a');
			$replacement->setAttribute('class', 'citationLink');
			$replacement->setAttribute('id',
										$id.'_'.$citationChildren->getAttribute('ref')
			);
			$replacement->appendChild($citationChildren);
			$citations->item($i)->parentNode->replaceChild(
					$replacement, $citations->item($i)
			);
		}
		$citationBase->parentNode->removeChild($citationBase);
		$processedContent = $descDom->saveHTML();
	} else {
		$processedContent = $content;
	}
	$obj_content->appendChild($dom->createCDATASection($processedContent));
	$citation_list = $ed_node->appendChild($dom->createElement('citationlist'));

	$obj_bookmarks = new cBookmark($_POST['object_id']);
	$bookmarks_jstr = json_encode($obj_bookmarks->getBookmarks());
	$bookmarks = $ed_node->appendChild($dom->createElement('hc:bookmarks', $bookmarks_jstr));

	$dom->formatOutput = true;
	$obj_full_info = $dom->saveXML();
	header('Content-type: application/xml');
	echo $obj_full_info;
} else {

}
?>
