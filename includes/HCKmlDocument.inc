<?php 

include_once('includes/util.inc');
include_once('includes/user.inc');
include_once('includes/bookmark.inc');

class HCKmlDocument extends DOMDocument {
	public $rootNode;
	public $kmlNode;
	public $docNode;

	public function __construct ($version = '1.0', $encoding = 'utf-8') {
		parent::__construct($version, $encoding);

		// Creates the root KML Document.
		$this->kmlNode = $this->appendChild($this->createElementNS('http://www.opengis.net/kml/2.2', 'kml'));
		$this->kmlNode->setAttributeNS('http://www.w3.org/2000/xmlns/' ,'xmlns:atom', 'http://www.w3.org/2005/Atom');

		$this->docNode = $this->kmlNode->appendChild($this->createElement('Document'));
	}
	
	/**
	 * @method: setName
	 * @param: $name
	 */
	public function setName ($name) {
		$this->docNode->appendChild($this->createElement('name', trim($name)));
	}

	/**
	 * @method: setMetadata 
	 * @param: $dom
	 */
	public function setMetadata ($dom, $id, $stateId, $title, $creator, $snippet,
		$description, $dateFrom, $dateFromIsBC, $dateTo, $dateToIsBC, $sw_lng, $sw_lat,
		$ne_lng, $ne_lat, $linkType, $ownerId, $view, $zoom, $baseMap = NULL, $userId, $maxZoom = NULL) {

		// Set $dom element Id
		$dom->setAttribute('id', $id);

		$boundBox = "BBox=[$sw_lng],[$sw_lat],[$ne_lng],[$ne_lat]";

		// Create Link URI
		$link = "http://".$_SERVER['SERVER_NAME']
			.str_replace(strrchr($_SERVER['SCRIPT_NAME'], '/'), '', $_SERVER['SCRIPT_NAME'])
			."/provider/".$linkType."s/".$id.".kml";

		// Append Metadata to $dom                
		$domName = $dom->appendChild($this->createElement('name', trim($title)));
		//$domName = $dom->appendChild($this->createElement('name', $this->createCDATASection (trim($title))));
                //$domName->appendChild());
		$domAuthor = $dom->appendChild($this->createElement('atom:author'));
		$domAuthor->appendChild($this->createElement('atom:name', trim($creator)));
		$domLink = $dom->appendChild($this->createElement('atom:link'));
		$domLink->setAttribute('href', $link);
/*
		if ( $snippet !== NULL && strlen($snippet) > 0 ) {
			$domSnippet = $dom->appendChild($this->createElement('Snippet', trim(strip_tags($snippet))));
		} 
		else { // No snippet provided, grep first 100 characters from description
			$maxLen = 200;
			$snippet = trim(strip_tags($description));
			$textLen = strlen($snippet);

			if ( $textLen > 0 ) {
				while ( $maxLen < $textLen ) {
					$char = $snippet[$maxLen];
					if ( ctype_space($char) ) {
						$snippet = substr($snippet, 0, $maxLen) . " ...";
						break;
					}
					$maxLen--;
				}

				$domSnippet = $dom->appendChild($this->createElement('Snippet', trim($snippet)));
			}
		}
*/
		$domDescription = $dom->appendChild($this->createElement('description'));
		$processedContent = self::scrubContent(trim($description));
		//$processedContent = $description;

		if ($dom !== $this->docNode) {
			$edNode = $domDescription->appendChild($this->createElement('ExtendedData'));
			$edNode->setAttribute('xmlns:hc', 'http://hypercities.ats.ucla.edu');
			$contentDom = $edNode->appendChild($this->createElement('content'));


			// Collection descriptions shouldn't have citations if they appear just in the
			// description box of narrative view.
			if ($description) {
				$descDom = new DomDocument();
				$descDom->loadHTML($processedContent);
				$citations = $descDom->getElementsByTagName('citation');
				$citationBase = $descDom->getElementsByTagName("citationlist")->item(0);
				if ($citationBase == NULL) $citationBase = $descDom->getElementsByTagName("CitationList")->item(0);
				if ($citations->length > 0 && $citationBase !== NULL) {
					//$citB = $descDom->getElementsByTagName("citationlist");
					//$citationBase = $descDom->getElementsByTagName("citationlist")->item(0);
					//if ($citationBase == NULL) $citationBase = $descDom->getElementsByTagName("CitationList")->item(0);
					//$citationList = $citationBase->cloneNode(TRUE);
					$citationList = $this->createElement("citationlist");
					//if ($citations->length !== 0) {
					$citationsCollection = $citationBase->getElementsByTagName("citation");
					for ($i = 0; $i < $citationsCollection->length; $i++) {
						$cit = $citationList->appendChild($this->createElement("citation"));
						$cit->setAttribute('ref', $citationsCollection->item($i)->getAttribute('ref'));
						$cit->appendChild($this->createCDATASection($descDom->saveXML($citationsCollection->item($i))));
					}
					$edNode->appendChild($this->importNode($citationList, TRUE));
					$citations = $descDom->getElementsByTagName('citation');
					for ($i = 0; $i < $citations->length; $i++) {
						$citationChildren = $citations->item($i)->cloneNode(TRUE); // Clone node and children
						$replacement = $descDom->createElement('a');
						$replacement->setAttribute('class', 'citationLink');
						$replacement->setAttribute('id', $id.'_'.$citationChildren->getAttribute('ref'));
						//$replacement->setAttribute('href', '#');
						//$replacement->setAttribute('onclick', "HyperCities.narrativePanel.showCitation($id, '".$citationChildren->getAttribute('ref')."')");
						$replacement->appendChild($citationChildren);
						$citations->item($i)->parentNode->replaceChild($replacement, $citations->item($i));
					}
					$citationBase->parentNode->removeChild($citationBase);
					$processedContent = $descDom->saveHTML();
				} //if ($citations->length > 0)
				$contentDom->appendChild($this->createCDATASection($processedContent));
			} // end if ($description)
		} // end if ($dom != $this->docNode)
		else {
			$domDescription->appendChild($this->createCDATASection(trim($processedContent)));
		} // end if ($description && $dom !== $this->docNode)
                
		// Add HyperCities Extended Data
        $domHCData = $dom->appendChild($this->createElement('ExtendedData'));
		$domHCData->setAttribute('xmlns:hc', 'http://hypercities.ats.ucla.edu');
		$domHCDataViewFormat = $domHCData->appendChild($this->createElement('hc:viewFormat', $boundBox));
		$domHCDataOwnerId = $domHCData->appendChild($this->createElement('hc:ownerId', $ownerId));
		$domHCDataStateId = $domHCData->appendChild($this->createElement('hc:stateId', $stateId));
		$domExternal = $domHCData->appendChild($this->createElement('hc:external', 0));
		$domBasemap = $domHCData->appendChild($this->createElement('hc:baseMap', $baseMap));
		$domZoom = $domHCData->appendChild($this->createElement('hc:zoom', $zoom));
		$domView = $domHCData->appendChild($this->createElement('hc:view'));
		$domHCData->appendChild($this->createElement('hc:maxZoom', $maxZoom));
		try {
			$sxe = simplexml_load_string($view);
			if ($sxe) {
				$markerDom = dom_import_simplexml($sxe);
				$markerNode = $this->importNode($markerDom, true);
				$domView->appendChild($markerNode);
			}
		}
		catch (Exception $e) {
			// Log Exception
			//sprint_r($e);
		}

		// check the privilege
		$this->appendPrivilege($domHCData, $ownerId, $userId, $id);

		$this->appendBookmark($domHCData, $id);

		$this->setTimePrimitive($dom, $dateFrom, $dateFromIsBC, $dateTo, $dateToIsBC);

		return $dom;
	} // end public function setMetadata

	private function appendBookmark($domHCData, $objectId) {

		$bookmarks = new cBookmark($objectId);

		$jstr = json_encode($bookmarks->getBookmarks());

		$domBookmark = $domHCData->appendChild($this->createElement('hc:bookmarks', $jstr));
	}

	/**
	 * Check the edit and delete privilege and append to dom node
	 * @param {DOMNode} $domHCData
	 * @param {Integer} $ownerId
	 * @param {Integer} $userId
	 * @param {Integer} $objectId
	 * @return void
	 */
	private function appendPrivilege($domHCData, $ownerId, $userId, $objectId) {
		if ($ownerId == $userId) {
			$hasUpdatePrivilege = true;
		} else {
			$user               = new cUser();
			$hasUpdatePrivilege = $user->hasUpdatePrivilege($userId, $objectId);
		}

		$domIsEditable = $domHCData->appendChild($this->createElement('hc:isEditable',
			(int)$hasUpdatePrivilege));
		$domIsDeletable= $domHCData->appendChild($this->createElement('hc:isDeletable',
			(int)$hasUpdatePrivilege));
	}

	/**
	 * @method: setTimePrimitive
	 * @param: $dom
	 */
	public function setTimePrimitive ($dom, $dateFrom, $dateFromIsBC, $dateTo, $dateToIsBC) {

		$dateFromUnbounded = (strcmp($dateFrom, '9999-01-01 00:00:00') == 0 );
		$dateToUnbounded   = (strcmp($dateTo, '9999-12-31 23:59:59') == 0 );

		// StartDate and endDate are the same --> Create TimeStamp
		if (!strcmp($dateFrom, $dateTo) && !strcmp($dateFromIsBC, $dateToIsBC) &&
			!$dateFromUnbounded) {

			$docTime = $dom->appendChild($this->createElement('TimeStamp'));

			$timeString = HC_getKmlTimeString($dateFrom, $dateFromIsBC);
			$docTime->appendChild($this->createElement('when', $timeString));
		}
		// Create TimeSpan if startDate or endDate exists
		else if (!$dateFromUnbounded || !$dateToUnbounded) {

			$docTime = $dom->appendChild($this->createElement('TimeSpan'));

			if ( !$dateFromUnbounded ) {
				$timeString = HC_getKmlTimeString($dateFrom, $dateFromIsBC);
				$docTime->appendChild($this->createElement('begin', $timeString));
			}

			if ( !$dateToUnbounded ) {
				$timeString = HC_getKmlTimeString($dateTo, $dateToIsBC);
				$docTime->appendChild($this->createElement('end', $timeString));
			}
		} // end if

	} // end public function setTimePrimitive

	/**
	 * @method: appendFolder
	 * @param: $dom
	 */
	public function appendFolder ($dom, $folderId, $folderName, $totalChildren, $boundChildren, $isOpen, $hasCheckBox) {
			
		$openStr = 0;
		if ( $isOpen == true ) {
			$openStr = 1;
		}

		$checkBoxStr = 0;
		if ( $hasCheckBox == true ) {
			$checkBoxStr = 1;
		}

		$node = $dom->appendChild($this->createElement('Folder'));
		$node->setAttribute('id', $folderId);

		$folderName = $node->appendChild($this->createElement('name', $folderName));
		$folderOpen = $node->appendChild($this->createElement('open', $openStr));

		// Add HyperCities Extended Data
		$HCData = $node->appendChild($this->createElement('ExtendedData'));
		$HCData->setAttribute('xmlns:hc', 'http://hypercities.ats.ucla.edu');

		if ( is_numeric($boundChildren) ) {
			$HCDataBoundNodes = $HCData->appendChild($this->createElement('hc:boundChildren', intval($boundChildren)));
		}
		if ( is_numeric($totalChildren) ) {
			$HCDataTotalNodes = $HCData->appendChild($this->createElement('hc:totalChildren', intval($totalChildren)));
		}
		$HCDataCheckBox = $HCData->appendChild($this->createElement('hc:checkBox', $checkBoxStr));

		return $node;
	}
	
	public static function scrubContent ($rawContent) {
		// Tags to remove and to remove all content
		// BUG: XML elements are stripped because Word uses them for formatting. May cause problems later

                // Only work if there is text in the argument; DOMDocument::loadHTML throws an error
                // if a blank string is loaded.
		if ($rawContent) {
			$content = new DOMDocument('1.0', 'utf-8');

			//Since loadHTML does not actively try to figure out what the html you are trying to 
			//load is encoded in (like most browsers do), you have to specify it in the html head
			$rawContent = "<head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'/></head>".$rawContent;

			$content->loadHTML($rawContent);
		} else return;
                
		
		foreach (array ('head', 'style', 'script', 'head', 'link', 'meta', 'form', 'xml') as $tag) {
			$element_list = $content->getElementsByTagName($tag);
			for ($i = 0; $i < $element_list->length; $i++) {
				//$content->removeChild ($element_list->item($i));
				$element_list->item($i)->parentNode->removeChild($element_list->item($i));
			}
		}

                // HyperCities-specific tags
                $element_list = $content->getElementsByTagName('innerlink');
                for ($i = 0; $i < $element_list->length; $i++) {
                    // replace element with <a href="javascript: HyperCities.
                }
		
		// cleaning other elements
		/*foreach (array ('div', 'body') as $tag) {
			$element_list = $content->getElementsByTagName($tag);
			for ($i = 0; $i < $element_list->length; $i++) {
				$child_nodes = $element_list->item($i)->childNodes;
				for ($j = 0; $j < $child_nodes->length; $j++) {
					print_r ($element_list->item($i));
					$element_list->item($i)->parentNode->replaceChild($child_nodes->item($j), $element_list->item($i));
					//print_r($child_nodes);
				}
				//$element_list->item($i)->parentNode->replaceChild($child_nodes->item($j)->cloneNode(), $element_list->item($i));
				//$element_list->item($i)->parentNode->textContent .= $element_list->item($i)->textContent;
				$element_list->item($i)->parentNode->removeChild($element_list->item($i));
			}
		} // end foreach (array ('div', 'body') as $tag)
		*/
		//$content_raw = $content->saveHTML();
                return $content->saveHTML();
                // \<(\/*)body(.*)\>
		//preg_replace('/\<[/]*body[-\s\w="/.:]*>/', '', $content_raw);
		//preg_replace('/<body[-\s\w=\/".:]*/', '', $content_raw);
		//preg_replace('/\<[/]*html[-\s\w="/.:]*>/', '', $content_raw);
		//preg_replace('/\<!DOCTYPE(.*)>/', '', $content_raw);
                //echo $content_raw;
		//die();
	}

	/**
	 * @method: appendPlacemark
	 * @param: $dom
	 */
	public function appendPlacemark ($dom, $item) {

		$node = $dom->appendChild($this->createElement('Placemark'));
		//$this->scrubContent($item['content']);

		$this->setMetadata($node, $item['id'], $item['object_state_id'], $item['title'], $item['creator'], 
				$item['description'], $item['content'], // replace $item['content'] with $content->saveHTML();
				$item['date_from'], $item['dateFrom_isBC'], 
				$item['date_to'], $item['dateTo_isBC'], 
				$item['sw_lon'], $item['sw_lat'],
				$item['ne_lon'], $item['ne_lat'],
				"object", $item['owner_id'], $item['view'], $item['zoom']);

//		$debug_kml = $node->appendChild($$this->createElement('kml'));
//		$debug_kml->appendChild($this->createCDATASection($markerKml));

		// Create Marker Style From KML Field
		try {
//HC_debugLog("KML: " . print_r($item['kml'], true));
			$sxe = simplexml_load_string($item['kml']);
			if ($sxe) {
				$markerDom = dom_import_simplexml($sxe);
				$markerNode = $this->importNode($markerDom, true);
				if (($itemNode = $markerNode->getElementsByTagName("Style")->item(0)) !== NULL ) {
					$node->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("styleUrl")->item(0)) !== NULL ) {
					$node->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("Point")->item(0)) !== NULL ) {
					$node->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("LineString")->item(0)) !== NULL ) {
					$node->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("Polygon")->item(0)) !== NULL ) {
					$node->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("LookAt")->item(0)) !== NULL ) {
					$node->appendChild($itemNode);
				}

				// Remove ExtendedData attached by setMetadata
				$nodeHCData = $node->getElementsByTagName('ExtendedData');
				if ( $nodeHCData->length > 0 ) {
					$node->removeChild($nodeHCData->item(($nodeHCData->length)-1));
				}
			} // end if ($sxe)
		}
		catch (Exception $e) {
			// Log Exception
	//sprint_r($e);
		}

		$collectionBound = "BBox=[".$item['sw_lon']."],[".$item['sw_lat']."],[".$item['ne_lon']."],[".$item['ne_lat']."]";

		// Add HyperCities Extended Data
		$nodeHCData = $node->appendChild($this->createElement('ExtendedData'));
		$nodeHCData->setAttribute('xmlns:hc', 'http://hypercities.ats.ucla.edu');

		$nodeHCDataViewFormat = $nodeHCData->appendChild($this->createElement('hc:viewFormat', $collectionBound));
		$nodeHCDataOrderId = $nodeHCData->appendChild($this->createElement('hc:orderId', $item['order_id']));
		$nodeHCDataOrder = $nodeHCData->appendChild($this->createElement('hc:order', $item['order']));
		$nodeHCDataOwnerId = $nodeHCData->appendChild($this->createElement('hc:ownerId', $item['owner_id']));
		$nodeHCDataStateId = $nodeHCData->appendChild($this->createElement('hc:stateId', $item['object_state_id']));
		$nodeHCDataStyleId = $nodeHCData->appendChild($this->createElement('hc:markerType', $item['marker_style_id']));
		$nodeHCZoom = $nodeHCData->appendChild($this->createElement('hc:zoom', $item['zoom']));
		$nodeHCDataMarkerStateId = $nodeHCData->appendChild($this->createElement('hc:markerState', $item['marker_state_id']));
		$nodeHCDataMaps = $nodeHCData->appendChild($this->createElement('hc:maps', $item['maps']));
		$nodeHCDataObjs = $nodeHCData->appendChild($this->createElement('hc:objs', $item['objs']));

		try {
			if ($item['view']) {
				$sxe = simplexml_load_string($item['view']);
				if ($sxe) {
					$markerDom = dom_import_simplexml($sxe);
					$markerNode = $this->importNode($markerDom, true);
					$nodeHCDataView = $nodeHCData->appendChild($this->createElement('hc:view'));
					$nodeHCDataView = $nodeHCDataView->appendChild($markerNode);
				}
			}
		} catch (Exception $e) {
			// Log Exception
			//sprint_r($e);
		}

		// check the privilege
		$userId = cServerSession::getUserId();
		$this->appendPrivilege($nodeHCData, $item['owner_id'], $userId, $item['id']);
		$this->appendBookmark($nodeHCData, $item['id']);
	} // end public function appendPlacemark

	/**
	 * @method: append3DPlacemark
	 * @param: $dom
	 */
	public function append3DPlacemark ($dom, $item) {

		$node = $dom->appendChild($this->createElement('Placemark'));
		//$this->scrubContent($item['content']);
                //print_r($item);

		$this->setMetadata($node, $item['id'], $item['object_state_id'], $item['title'], $item['creator'], 
				$item['description'], $item['content'], // replace $item['content'] with $content->saveHTML();
				$item['date_from'], $item['dateFrom_isBC'], 
				$item['date_to'], $item['dateTo_isBC'], 
				$item['sw_lon'], $item['sw_lat'],
				$item['ne_lon'], $item['ne_lat'],
				"object", $item['owner_id'], $item['view'], $item['zoom']);

//		$debug_kml = $node->appendChild($$this->createElement('kml'));
//		$debug_kml->appendChild($this->createCDATASection($markerKml));

		// Create Marker Style From KML Field
		try {
//print "KML: " . $item['kml'];
			$sxe = simplexml_load_string($item['kml']);
			if ($sxe) {
				$markerDom = dom_import_simplexml($sxe);
				$markerNode = $this->importNode($markerDom, true);
				$node->appendChild($markerNode);

				// Remove ExtendedData attached by setMetadata
				$nodeHCData = $node->getElementsByTagName('ExtendedData');
				if ( $nodeHCData->length > 0 ) {
					$node->removeChild($nodeHCData->item(($nodeHCData->length)-1));
				}
			} // end if ($sxe)
		}
		catch (Exception $e) {
			// Log Exception
	//sprint_r($e);
		}

		$collectionBound = "BBox=[".$item['sw_lon']."],[".$item['sw_lat']."],[".$item['ne_lon']."],[".$item['ne_lat']."]";

		// Add HyperCities Extended Data
		$nodeHCData = $node->appendChild($this->createElement('ExtendedData'));
		$nodeHCData->setAttribute('xmlns:hc', 'http://hypercities.ats.ucla.edu');

		$nodeHCDataViewFormat = $nodeHCData->appendChild($this->createElement('hc:viewFormat', $collectionBound));
		$nodeHCDataOrderId = $nodeHCData->appendChild($this->createElement('hc:orderId', $item['order_id']));
		$nodeHCDataOrder = $nodeHCData->appendChild($this->createElement('hc:order', $item['order']));
		$nodeHCDataExternal = $nodeHCData->appendChild($this->createElement('hc:external', '0'));
		$nodeHCDataOwnerId = $nodeHCData->appendChild($this->createElement('hc:ownerId', $item['owner_id']));
		$nodeHCDataStateId = $nodeHCData->appendChild($this->createElement('hc:stateId', $item['object_state_id']));
		$nodeHCDataStyleId = $nodeHCData->appendChild($this->createElement('hc:markerType', $item['marker_style_id']));
		$nodeHCDataMarkerStateId = $nodeHCData->appendChild($this->createElement('hc:markerState', $item['marker_state_id']));
		$nodeHCDataEarthObject = $nodeHCData->appendChild($this->createElement('hc:earthObject', '1'));
		$nodeHCDataMaps = $nodeHCData->appendChild($this->createElement('hc:maps', $item['maps']));
		$nodeHCDataObjs = $nodeHCData->appendChild($this->createElement('hc:objs', $item['objs']));

		// check the privilege
		$userId = cServerSession::getUserId();
		$this->appendPrivilege($nodeHCData, $item['owner_id'], $userId, $item['id']);
		$this->appendBookmark($nodeHCData, $item['id']);
	} // end public function appendPlacemark

	/**
	 * @method: appendNetworkLink
	 * @param: $dom
	 */
	public function appendNetworkLink ($dom, $item, $isExternal) {
		
		$node = $dom->appendChild($this->createElement('NetworkLink'));
		$this->setMetadata($node, $item['id'], $item['object_state_id'], $item['title'], $item['creator'], 
				$item['description'], $item['content'], 
				$item['date_from'], $item['dateFrom_isBC'], 
				$item['date_to'], $item['dateTo_isBC'], 
				$item['sw_lon'], $item['sw_lat'],
				$item['ne_lon'], $item['ne_lat'],
				"collection", $item['owner_id'], $item['view'], $item['zoom']);

		if ( $isExternal ) {
			$externalBit = '1';
			if ( $item['object_type_id'] == HC_OBJECT_TYPE_3D ) { // 3D kml hosted by HyperCities
				// In this case $item['kml'] is not the link
				$collectionLink = "http://".$_SERVER['SERVER_NAME']."/kml/".$item['id'].".kml";
			} 
			else {
				$collectionLink = str_replace('&','&amp;',$item['kml']);
			}
		} else {
			$externalBit = '0';
			//$collectionLink = "http://".$_SERVER['SERVER_NAME']."/collection/".$item['id'].".kml";
			$collectionLink = "http://".$_SERVER['SERVER_NAME']
				.str_replace(strrchr($_SERVER['SCRIPT_NAME'], '/'), '', $_SERVER['SCRIPT_NAME'])
				."/provider/collections/".$item['id'].".kml";
		}

		if ( $item['object_type_id'] == HC_OBJECT_TYPE_3D || 
			 $item['object_type_id'] == HC_OBJECT_TYPE_3D_NETWORKLINK ) {
			$earthObjectBit = '1';
		} else {
			$earthObjectBit = '0';
		}

		$collectionBound = "BBox=[".$item['sw_lon']."],[".$item['sw_lat']."],[".$item['ne_lon']."],[".$item['ne_lat']."]";

		$nodeLink = $node->appendChild($this->createElement('link'));
		$nodeHref = $nodeLink->appendChild($this->createElement('href', $collectionLink));

		// Remove ExtendedData attached by setMetadata
		try {
			$nodeHCData = $node->getElementsByTagName('ExtendedData');
			if ( $nodeHCData->length > 0 ) {
				$node->removeChild($nodeHCData->item(($nodeHCData->length)-1));
			}
		}
		catch (Exception $e) {
		}
		// Add HyperCities Extended Data
		$nodeHCData = $node->appendChild($this->createElement('ExtendedData'));
		$nodeHCData->setAttribute('xmlns:hc', 'http://hypercities.ats.ucla.edu');

		$nodeHCDataBoundNodes = $nodeHCData->appendChild($this->createElement('hc:boundChildren', $item['boundChildren']));
		$nodeHCDataTotalNodes = $nodeHCData->appendChild($this->createElement('hc:totalChildren', $item['totalChildren']));
		$nodeHCDataViewFormat = $nodeHCData->appendChild($this->createElement('hc:viewFormat', $collectionBound));
		$nodeHCDataOrderId = $nodeHCData->appendChild($this->createElement('hc:orderId', $item['order_id']));
		$nodeHCDataOrder = $nodeHCData->appendChild($this->createElement('hc:order', $item['order']));
		$nodeHCDataExternal = $nodeHCData->appendChild($this->createElement('hc:external', $externalBit));
		$nodeHCDataOwnerId = $nodeHCData->appendChild($this->createElement('hc:ownerId', $item['owner_id']));
		$nodeHCDataStateId = $nodeHCData->appendChild($this->createElement('hc:stateId', $item['object_state_id']));
		$nodeHCDataEarthObject = $nodeHCData->appendChild($this->createElement('hc:earthObject', $earthObjectBit));
		$nodeHCDataView = $nodeHCData->appendChild($this->createElement('hc:view'));
		$nodeHCDataMaps = $nodeHCData->appendChild($this->createElement('hc:maps', $item['maps']));
		$nodeHCDataObjs = $nodeHCData->appendChild($this->createElement('hc:objs', $item['objs']));

		try {
			$sxe = simplexml_load_string($item['view']);
			if ($sxe) {
				$markerDom = dom_import_simplexml($sxe);
				$markerNode = $this->importNode($markerDom, true);
				$nodeHCDataView->appendChild($markerNode);
			}
		} catch (Exception $e) {
			// Log Exception
			//sprint_r($e);
		}

		// check the privilege
		$userId = cServerSession::getUserId();
		$this->appendPrivilege($nodeHCData, $item['owner_id'], $userId, $item['id']);
		$this->appendBookmark($nodeHCData, $item['id']);
	}

	/**
	 * @method: addCollections
	 * @param: $dom
	 */
	public function addCollections ($dom, $userCollectionArray, $skipList = array()) {

		$idList = array();

		foreach ($userCollectionArray as $index => $item) {

			if ( in_array($item['id'], $skipList) ) {
				continue;
			}
			$idList[] = $item['id'];

			if ( $item['object_type_id'] == HC_OBJECT_TYPE_COLLECTION ) { 
				// Is Collection, Create NetworkLink
				$this->appendNetworkLink($dom, $item, false);

			}
			else if ( $item['object_type_id'] == HC_OBJECT_TYPE_KML ) { 
				// Is KML, Create External NetworkLink
				$this->appendNetworkLink($dom, $item, true);

			}
			else if ( $item['object_type_id'] == HC_OBJECT_TYPE_MEDIA ) { 
				// Is OBJECT, Create Placemark
				$this->appendPlacemark($dom, $item);

			}
			else if ( $item['object_type_id'] == HC_OBJECT_TYPE_3D_NETWORKLINK ) {
				// Is 3D Collection, Create External NetworkLink
				$this->appendNetworkLink($dom, $item, true);
			}
			else if ( $item['object_type_id'] == HC_OBJECT_TYPE_3D ) {
				// Is 3D Collection in Hypercities, Create 3D Marker
				$this->append3DPlacemark($dom, $item, true);
				//$this->appendNetworkLink($dom, $item, true);
			}
		}

		// update ExtendedData attached by setFolder
		try {
			$nodeHCData = $dom->getElementsByTagName('ExtendedData')->item(0);
			$nodeHCDataBoundNodes = $nodeHCData->getElementsByTagName('hc:boundChildren')->item(0);
			$nodeHCDataBoundNodes->nodeValue = sizeof($idList);
		}
		catch (Exception $e) {
			// Log Exception
		}

		return $idList;
	}

} // end class HCDomDocument
