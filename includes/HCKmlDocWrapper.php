<?php

/**
 * This document extends HCDomDocument, and uses a decorator pattern.
 * This file also defines classes of other nodes that are used in KML.
 * @copyright Copyright 2009 The Regents of the University of California
 * @author David Shepard
 */

class HCKmlDocWrapper extends HCDomDocument {
    public $kmlNode, $docNode;
    private $id;

    /**
     * Create new document.
     * 
     * @param string $version Version; defaults to 1.0
     * @param string $encoding Encoding; defaults to utf-8
     */
    public function __construct ($version = '1.0', $encoding = 'utf-8') {
        parent::__construct($version, $encoding);
        self::$nodeClass = 'HCKmlNode';
        $this->kmlNode = new self::$nodeClass($this->doc->appendChild($this->doc->createElementNS('http://www.opengis.net/kml/2.2', 'kml')));
        $this->kmlNode->setAttributeNS('http://www.w3.org/2000/xmlns/' ,'xmlns:atom', 'http://www.w3.org/2005/Atom');

        $this->docNode = $this->kmlNode->createAndAppendNode('Document');
    }

    /**
     * Set id of document.
     * 
     * @param {mixed} $id Id of document to set.
     */
    public function setId ($id) {
        if (!$this->id) {
            $this->docNode->setAttribute('id', $id);
        }
        $this->docNode->createAndAppendTextNodes(
            array (
            'name'          => 'HyperCities_Collection_'.$id.'.kml',
            'description'   => 'HyperCities Collection '.$id,
            )
        );
    }

    /**
     * Create and append Placemark.
     * 
     * @param {mixed} $id
     * @return {mixed} Node created; Placemark element.
     */
    public function createPlacemarkNode ($id) {
        return $this->docNode->createAndAppendElementWithAttributes ('Placemark', $id);
    }

    public function createFolder ($id, $name, $description, $open = 1) {

    }

    public function appendPlacemark () {

    }

}

/**
 * Result node, for webservice.
 */
class HCKmlResult extends HCKmlNode {
    public $kmlNode, $docNode, $id;
    private $items = array();
    private $type;
    public function  __construct(HCDomNode $node, $id, $type) {
        parent::__construct($node);
        $this->kmlNode = new self::$nodeClass($this->doc->appendChild($this->doc->createElementNS('http://www.opengis.net/kml/2.2', 'kml')));
        $this->docNode = $this->kmlNode->createAndAppendNodeWithAttributes('Document', array('id'=>$id));
        $this->id = $id;
        $this->type = $type;
    }

    public function setMetadata ($id, $name, $creator, $objectType, $description, $ownerId, $stateId, $external, $baseMap) {
        if ($this->type == 'Placemark') {

        } elseif ($this->type == 'NetworkLink') {
            
        }
    }

    public function createPlacemark ($item) {
        $this->items[] = new HCPlacemarkNode($this->docNode, $item);
    }
}

class HCKmlFolder extends HCKmlNode {
    private $name, $description, $open;
    public function __construct (DomNode $node) {
        parent::__construct($node);
        $this->name = $this->createAndAppendNode ('name');
        $this->description = $this->createAndAppendNode ('description');
        $this->open = $this->createAndAppendNode ('open');
    }

    public function __get ($name) {
        //print "Get Called";
        switch ($name) {
            case 'name':
                return $this->name;
                break;
            case 'open':
                return $this->open;
                break;
            case 'description':
                return $this->open;
                break;
        } // end switch ($name)
    }

    public function __set ($name, $value) {
        switch ($name) {
            case 'name':
                $this->node->removeChild($this->name);
                $this->name = $this->node->createAndAppendTextNode('name', $value);
                break;
            case 'open':
                $this->node->removeChild($this->open);
                $this->open = $this->node->createAndAppendTextNode('open', $value);
                break;
            case 'description':
                $this->node->removeChild($this->description);
                $this->description = $this->node->createAndAppendTextNode('description', $value);
                break;
        }
    }
}

class HCKmlNode extends HCDomNode {

    /*public function __construct (DomNode $node) {
        parent::__construct ($node);
    }*/

    public function __construct ($node) {
        if ($node instanceof DOMNode)
            parent::__construct ($node);
        elseif ($node instanceof HCDomNode || is_subclass_of($node, HCDomNode))
            parent::__construct ($node->node);
        else die ('Invalid argument type passed to HCKmlNode::__construct. Excepted DomNode or HCDomNode subclass; got '.get_class($node));
    }
    
    public function createAndAppendEDNode () {
	$edNode = $this->createAndAppendNode ('ExtendedData');
	//$edNode->setAttribute('xmlns:hc', 'http://hypercities.ats.ucla.edu');
	return $edNode;
    }

    public function createPlacemarkNode ($id) {
        return $this->createAndAppendElementWithAttributes ('Placemark', array('id' => $id));
    }

    public function createPlacemark ($item) {
        $placemark = new HCPlacemarkNode($this->node, $item);
    } // end public function appendPlacemark

    public function createNetworkNode ($id, $name, $description) {
        $node = $this->createAndAppendElementWithAttributes ('NetworkLink', array('id' => $id));
		$node->createAndAppendTextNodes(array ( 'name' => $name, 'description' => $description));
		return $node;
    }

    /**
     * Create a folder node as a child of this element.
     * @param string $name Text for the name node
     * @param string $description Text for the description node
     * @param int $open 0 or 1, whether or not folder is open. Defaults to 1 (open).
     */
    public function createFolderNode ($id, $name, $description, $open = 1) {
        $node = $this->createAndAppendNode('Folder');
        $node->setAttribute("id", $id);
        $node->createAndAppendTextNodes(array (
            'name' => $name,
            'description' => $description,
            'open' => $open
        ));
        return $node;
    }

    public function createMarkerFromKmlField ($kml) {
        $sxe = simplexml_load_string($kml);
        $markerDom = dom_import_simplexml($sxe);
        //print $this->ownerDocument;
        $markerNode = $this->ownerDocument->importNode($markerDom, true);
        if ( ($itemNode = $markerNode->getElementsByTagName("Style")->item(0)) !== NULL ) {
            $this->node->appendChild($itemNode);
        }
        if ( ($itemNode = $markerNode->getElementsByTagName("Point")->item(0)) !== NULL ) {
            $this->node->appendChild($itemNode);
        }
        if ( ($itemNode = $markerNode->getElementsByTagName("LineString")->item(0)) !== NULL ) {
            $this->node->appendChild($itemNode);
        }
        if ( ($itemNode = $markerNode->getElementsByTagName("Polygon")->item(0)) !== NULL ) {
            $this->node->appendChild($itemNode);
        }
        if ( ($itemNode = $markerNode->getElementsByTagName("LookAt")->item(0)) !== NULL ) {
            $this->node->appendChild($itemNode);
        }
    }


}

/**
 * Represents extended data.
 *
 * This and the subsequent child classes of HCDomNode are used for compatibility
 * with the HCDomDocument::createAndAppendChild methods.
 */
class HCExtendedDataNode extends HCDomNode {

}

abstract class HCKmlFeature extends HCKmlNode {

    public function  __construct(DomNode $parentNode, $itemName) {
    // Passing the appended DomNode up the inheritance chain will assign it to $this->node
        parent::__construct($parentNode->appendChild($parentNode->ownerDocument->createElement($itemName)));
    }

    public function setMetadata ($id, $stateId, $title, $creator, $linkType) {
        $this->node->setAttribute('id', $id);

        //$boundBox = "BBox=[$sw_lng],[$sw_lat],[$ne_lng],[$ne_lat]";

        // Create Link URI
        $link = "http://hypercities.ats.ucla.edu/".$linkType."/".$id.".kml";

        // Append Metadata to $dom
        $this->createAndAppendTextNode('name', trim($title));
        $domAuthor = $this->createAndAppend('atom:author');
        $domAuthor->createAndAppendTextNode('atom:name', trim($creator));
        $this->createAndAppendElementWithAttributes('atom:link', array('href', $link));
    }

    public function setTimePrimitive ($dateFrom, $dateFromIsBC, $dateTo, $dateToIsBC) {

        $dateFromUnbounded = (strcmp($dateFrom, '9999-01-01 00:00:00') == 0 );
        $dateToUnbounded   = (strcmp($dateTo, '9999-12-31 23:59:59') == 0 );

        // StartDate and endDate are the same --> Create TimeStamp
        if (!strcmp($dateFrom, $dateTo) && !strcmp($dateFromIsBC, $dateToIsBC) &&
            !$dateFromUnbounded) {

            $docTime = $this->createAndAppend('TimeStamp');

            $timeString = HC_getKmlTimeString($dateFrom, $dateFromIsBC);
            $docTime->createAndAppendTextNode('when', $timeString);
        }
        // Create TimeSpan if startDate or endDate exists
        else if (!$dateFromUnbounded || !$dateToUnbounded) {

                $docTime = $this->createAndAppend('TimeSpan');

                if ( !$dateFromUnbounded ) {
                    $timeString = HC_getKmlTimeString($dateFrom, $dateFromIsBC);
                    $docTime->createAndAppendTextNode('begin', $timeString);
                }

                if ( !$dateToUnbounded ) {
                    $timeString = HC_getKmlTimeString($dateTo, $dateToIsBC);
                    $docTime->createAndAppendTextNode('end', $timeString);
                }
            } // end if
    } // end public function setTimePrimitive
}

/**
 * Represents a placemark.
 */
class HCPlacemarkNode extends HCKmlFeature {
    private $name, $description, $link;

    private $pointNode, $lookAtNode;

    /**
     *
     * @param DomNode $parentNode Parent node of Placemark
     * @param mixed $item Item to add.
     */
    public function __construct (DomNode $parentNode, $item) {
        parent::__construct($parentNode, 'Placemark');
        $this->setMetadata ($item['id'], $item['object_state_id'], $item['title'], $item['creator'], "object"); // ...

        try {
        //print "KML: " . $item['kml'];
            $sxe = simplexml_load_string($item['kml']);
            if ($sxe) {
                $markerDom = dom_import_simplexml($sxe);
                $markerNode = $this->importNode($markerDom, true);
                if (($itemNode = $markerNode->getElementsByTagName("Style")->item(0)) !== NULL ) {
                //$node->appendChild($itemNode);
                    $this->importNodesAsChildren($markerDom);
                }
                if (($itemNode = $markerNode->getElementsByTagName("Point")->item(0)) !== NULL ) {
                    $this->importNodesAsChildren($markerDom);
                }
                if (($itemNode = $markerNode->getElementsByTagName("LineString")->item(0)) !== NULL ) {
                    $this->importNodesAsChildren($markerDom);
                }
                if (($itemNode = $markerNode->getElementsByTagName("Polygon")->item(0)) !== NULL ) {
                    $this->importNodesAsChildren($markerDom);
                }
                if (($itemNode = $markerNode->getElementsByTagName("LookAt")->item(0)) !== NULL ) {
                    $this->importNodesAsChildren($markerDom);
                }
            // Remove ExtendedData attached by setMetadata
            } // end if ($sxe)
        }
        catch (Exception $e) {
            throw $e;
        }

        $collectionBound = "BBox=[".$item['sw_lon']."],[".$item['sw_lat']."],[".$item['ne_lon']."],[".$item['ne_lat']."]";
        $nodeHCData = $this->createAndAppendEDNode();
        $domHCData = $this->createAndAppendEDNode();
        $domHCData->createAndAppendTextNodes (array (
            'hc:viewFormat' => $collectionBound,
            'hc:orderId'    => $item['order_id'],
            'hc:order'      => $item['order'],
            'hc:ownerId'    => $ownerId,
            'hc:stateId'    => $item['object_state_id'],
            )
        );
    }

    public function addPoint ($lat, $lon) {

    }

    public function addLookAt($lat, $lon, $alt, $range, $tilt, $heading) {

    }
}

class HCPoint extends HCDomNode {

}

class HCLookAt extends HCDomNode {

}

class HCNetworkLinkNode extends HCKmlFeature {
    private $hcViewFormat, $ownerId, $stateId, $external, $baseMap;

    public function __construct ($node, $item) {
        parent::__construct($node);
        $this->setMetadata($item['id'], $item['object_state_id'], $item['title'], $item['creator'],
            $item['description'], $item['content'], // replace $item['content'] with $content->saveHTML();
            $item['date_from'], $item['dateFrom_isBC'],
            $item['date_to'], $item['dateTo_isBC'],
            $item['sw_lon'], $item['sw_lat'],
            $item['ne_lon'], $item['ne_lat'],
            "collection", $item['owner_id'],
            $item['base_map']
        );
        $node = $dom->appendChild($this->createElement('NetworkLink'));
        if ( $isExternal ) {
            $externalBit = '1';
            $collectionLink = str_replace('&','&amp;',$item['kml']);
        } else {
            $externalBit = '0';
            $collectionLink = "http://hypercities.ats.ucla.edu/collection/".$item['id'].".kml";
        }

        if ( $item['object_type_id'] == HC_OBJECT_TYPE_3D ) {
            $earthObjectBit = '1';
        } else {
            $earthObjectBit = '0';
        }
        $collectionBound = "BBox=[".$item['sw_lon']."],[".$item['sw_lat']."],[".$item['ne_lon']."],[".$item['ne_lat']."]";

        $nodeLink = $node->appendChild($this->createElement('link'));
        $nodeHref = $nodeLink->appendChild($this->createElement('href', $collectionLink));

        // Add HyperCities Extended Data

        $nodeHCData = $this->createAndAppendEDNode();
        $nodeHCData->createAndAppendTextNodes(array (
            'hc:boundChildren' => $item['boundChildren'],
            'hc:totalChildren' => $item['totalChildren'],
            'hc:viewFormat'=> $collectionBound,
            'hc:orderId'=> $item['order_id'],
            'hc:order'=> $item['order'],
            'hc:external'=> $externalBit,
            'hc:ownerId'=> $item['owner_id'],
            'hc:stateId'=> $item['object_state_id'],
            'hc:earthObject'=> $earthObjectBit
            )
        );
                /*
		$nodeHCDataBoundNodes = $nodeHCData->appendChild($this->createElement('hc:boundChildren', $item['boundChildren']));
		$nodeHCDataTotalNodes = $nodeHCData->appendChild($this->createElement('hc:totalChildren', $item['totalChildren']));
		$nodeHCDataViewFormat = $nodeHCData->appendChild($this->createElement('hc:viewFormat', $collectionBound));
		$nodeHCDataOrderId = $nodeHCData->appendChild($this->createElement('hc:orderId', $item['order_id']));
		$nodeHCDataOrder = $nodeHCData->appendChild($this->createElement('hc:order', $item['order']));
		$nodeHCDataExternal = $nodeHCData->appendChild($this->createElement('hc:external', $externalBit));
		$nodeHCDataOwnerId = $nodeHCData->appendChild($this->createElement('hc:ownerId', $item['owner_id']));
		$nodeHCDataStateId = $nodeHCData->appendChild($this->createElement('hc:stateId', $item['object_state_id']));
		$nodeHCDataEarthObject = $nodeHCData->appendChild($this->createElement('hc:earthObject', $earthObjectBit));
                 * 
                 */
    }

    public function setMetadata ($id, $stateId, $title, $creator, $snippet, $description, $dateFrom, $dateFromIsBC, $dateTo, $dateToIsBC, $sw_lng, $sw_lat, $ne_lng, $ne_lat, $ownerId, $baseMap = NULL) {
        parent::setMetadata($id, $stateId, $title, $creator, "collection");
        $boundBox = "BBox=[$sw_lng],[$sw_lat],[$ne_lng],[$ne_lat]";

        $domDescription = $this->createAndAppend('description');
        $processedContent = self::scrubContent(trim($description));
        //$processedContent = $description;

        //if ($dom !== $this->docNode) {
        //$edNode = $domDescription->createAndAppendElementWithAttributes('ExtendedData', array('xmlns:hc', 'http://hypercities.ats.ucla.edu'));

        //$contentDom = $edNode->createAndAppend('content');

        // Collection descriptions shouldn't have citations if they appear just in the
        // description box of narrative view.
        if ($description) {
            $edNode = $domDescription->createAndAppendEDNode();
            $descDom = new DomDocument();
            $descDom->loadHTML($processedContent);
            $citations = $descDom->getElementsByTagName('citation');
            $citationBase = $descDom->getElementsByTagName("citationlist")->item(0);
            if ($citationBase == NULL) $citationBase = $descDom->getElementsByTagName("CitationList")->item(0);
            if ($citations->length > 0 && $citationBase !== NULL) {
                $citationList = $this->createElement("citationlist");
                $citationsCollection = $citationBase->getElementsByTagName("citation");
                for ($i = 0; $i < $citationsCollection->length; $i++) {
                    $cit = $citationList->appendChild($this->createElement("citation"));
                    $cit->setAttribute('ref', $citationsCollection->item($i)->getAttribute('ref'));
                    $cit->appendChild($this->createCDATASection($descDom->saveXML($citationsCollection->item($i))));
                }
                $citations = $descDom->getElementsByTagName('citation');
                for ($i = 0; $i < $citations->length; $i++) {
                    $citationChildren = $citations->item($i)->cloneNode(TRUE); // Clone node and children
                    $replacement = $descDom->createElement('a');
                    $replacement->setAttribute('class', 'citationLink');
                    $replacement->setAttribute('id', $id.'_'.$citationChildren->getAttribute('ref'));
                    $replacement->appendChild($citationChildren);
                    $citations->item($i)->parentNode->replaceChild($replacement, $citations->item($i));
                }
                $citationBase->parentNode->removeChild($citationBase);
                $processedContent = $descDom->saveHTML();
            } //if ($citations->length > 0)
            $edNode->createAndAppendCDATANodes (array('content' => $processedContent));
            $edNode->importNodesAsChildren($citationsList);
        } // end if ($description)

        $domHCData = $this->createAndAppendEDNode();
        $domHCData->createAndAppendTextNodes (array (
            'hc:viewFormat' => $boundBox,
            'hc:ownerId'    => $ownerId,
            'hc:stateId'    => $stateId,
            'hc:external'   =>  0,
            'hc:baseMap'    => $baseMap
            )
        );

        $this->setTimePrimitive($dom, $dateFrom, $dateFromIsBC, $dateTo, $dateToIsBC);

        return $dom;
    } // end public function setMetadata
}

?>