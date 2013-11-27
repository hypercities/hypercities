<?php

/**
 * Represents a mapping.
 *
 * @author    David Shepard
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-06-21
 * @version   $Id$
 *
 */
class HCMapping {
    private $state, $marker, $kml, $view, $dateFrom, $dateFrom_isBC, $dateTo, $dateTo_IsBC, $basemap;
    private $neLat, $neLon, $swLat, $swLon;

    /**
     * Create new document.
     */
    public function __construct () {
        $this->dateFrom = 0;
        $this->dateFrom_isBC = 0;
        $this->dateTo = 0;
        $this->dateTo_IsBC = 0;
    }

    /**
     * Construct mapping with specified bounds.
     * 
     * @param String $kml
     * @param Float $ne_lat
     * @param Float $ne_lon
     * @param Float $sw_lat
     * @param Float $sw_lon
     * @param String $date_from
     * @param Boolean $dateFrom_isBC
     * @param String $date_to
     * @param Boolean $dateTo_isBC
     * @return HCMapping HCMapping created.
     */
    public static function withBounds ($kml, $ne_lat, $ne_lon, $sw_lat, $sw_lon, $date_from, $dateFrom_isBC, $date_to, $dateTo_isBC) {
        $mapping = new HCMapping();
        $mapping->kml = $kml;
        $mapping->neLat = $ne_lat;
        $mapping->neLon = $ne_lon;
        $mapping->swLat = $sw_lat;
        $mapping->swLon = $sw_lon;
        $sign = '';
        if ($dateFrom_isBC) $sign = '-';
        $mapping->dateFrom = new DateTime($sign.$date_from, new DateTimeZone("America/Los_Angeles"));
        if ($dateTo_isBC) $sign = '-';
        $mapping->dateTo = new DateTime($sign.$date_to, new DateTimeZone("America/Los_Angeles"));
        return $mapping;
    }

    /**
     * Expand bounds with given mapping. If any dimmension of $mapping is outside
     * of this object, this bounds will be expanded to include those bounds.
     * @param HCMapping $mapping Mapping to expand this mapping.
     */
    public function expandBounds (HCMapping $mapping) {
        if ($this->swLat) {
            if ($mapping->swLat < $this->swLat) $this->swLat = $mapping->swLat;
        } else {
            $this->swLat = $mapping->swLat;
        }
        if ($this->swLon) {
            if ($mapping->swLon < $this->swLon) $this->swLon = $mapping->swLon;
        } else {
            $this->swLon = $mapping->swLon;
        }
        if ($this->neLat) {
            if ($mapping->neLat > $this->neLat) $this->neLat = $mapping->neLat;
        } else {
            $this->neLat = $mapping->neLat;
        } if ($this->neLon) {
            if ($mapping->neLon > $this->neLon) $this->neLon = $mapping->neLon;
        } else {
            $this->neLon = $mapping->neLon;
        }
    }

    /**
     * Get mappings for a specific object from database.
     * 
     * @param {mixed} $id Object id
     * @return array Array of bounds associated with object.
     */
    public static function getMappingsForObject ($id) {
        $db = database::getInstance();
        $id = (int)$id;
        $db->query ("SELECT object_state_id, marker_style_id, kml, "
                            ." ne_lat, ne_lon, sw_lat, sw_lon, view, date_from,"
			    ." dateFrom_isBC, date_to, dateTo_isBC, basemap_id"
			    ." FROM object_mappings WHERE object_id = $id"
                       );
        $rows = $db->getRows();
        $mappings = array();
        foreach ($rows as $row) {
            $mapping = new HCMapping();
            $mapping->state = $row['object_state_id'];
            $mapping->marker = $row['marker_style_id'];
            $mapping->kml = $row['kml'];
            $mapping->neLat = $row['ne_lat'];
            $mapping->neLon = $row['ne_lon'];
            $mapping->swLat = $row['sw_lat'];
            $mapping->swLon = $row['sw_lon'];
            $mapping->dateFrom = $row['date_from'];
            $mapping->dateFrom_isBC = $row['dateFrom_isBC'];
            $mapping->dateTo = $row['date_to'];
            $mapping->dateTo_isBC = $row['dateTo_isBC'];
            $mapping->basemap = $row['basemap_id'];
            $mappings[] = $mapping;
        }
        return $mappings;
    }

    /**
     * Get bounding box that represents the geotemporal boundings.
     * 
     * @return String Bounding box.
     */
    public function getBoundingBox () {
        return 'BBox=['.$this->swLon.'],['.$this->swLat.'],['.$this->neLon.'],['.$this->neLat.']';
    }

    /**
     * Get earliest date of mapping.
     * 
     * @return {mixed}
     */
    public function getStart() {
        return $this->dateFrom;
    }

    /**
     * Get latest date of mapping.
     * @return mixed
     */
    public function getEnd() {
        return $this->dateTo;
        $string = '';
        if ($this->dateTo_isBC) $string .= '-';
        $string .= $this->dateTo;
        return $string;
    }

    public function __get ($name) {
        switch ($name) {
            case 'kml':
                return $this->kml;
                break;

        } // end switch ($name)
    } // end public function __get
} // end class HCMapping

/**
 * Represents a Placemark object in memory. This corresponds object type 3 in the
 * database.
 * Used mostly by the search engine (search.php).
 *
 * @author dshepard
 * @date 09-29-09
 */
class HCPlacemark extends HCSearchResult {
    public $id, $name, $description, $contentId, $creator, $kml, $owner_id, $order_id, $order, $state_id;
    public $mappings = array();

    /**
     * Construct a new Placemark from database. If $id is specified, object will
     * be filled in from database.
     * 
     * @param {mixed} $id
     */
    public function  __construct($id = NULL) {
        if ($id) {
            $this->id = (int)$id;
            $query = "SELECT title, description, creator, content_id FROM objects WHERE id = $this->id";
            $db = database::getInstance();
            $db->query($query);
            $row = $db->getRows();
            $this->name = $row[0]['title'];
            $this->description = $row[0]['description'];
            $this->contentId = $row[0]['content_id'];
            if (!$row[0]['description']) {
                $query = "SELECT content FROM contents WHERE id = $this->contentId ;";
                $db->query($query);
                $content_row = $db->getRows();
                $this->description = $content_row[0]['content'];
            }
            $this->mappings = HCMapping::getMappingsForObject($this->id);
            return;
            $rows = $db->query("SELECT kml FROM object_mappings WHERE object_id = $this->id");
            $rows = $db->getRows();
            //$rows = $db->getRows();
            foreach ($rows as $row) {
                if ($row['kml'] != '') $this->mappings[] = $row['kml'];
            }
        }
    }

    
    /**
     * Build Placemark from array.
     * 
     * @param array $item
     * @return HCPlacemark Object created.
     */
    public static function buildFromArray ($item) {
        $placemark = new HCPlacemark();
        $placemark->id = $item['id'];
        $placemark->name = $item['title'];
        $placemark->creator = $item['creator'];
        $placemark->description = $item['content'];
        $placemark->contentId = $item['content_id'];
        $placemark->kml = $item['kml'];
        $placemark->mappings[] = HCMapping::withBounds($item['kml'], $item['ne_lat'], $item['ne_lon'],
                $item['sw_lat'], $item['sw_lon'], $item['date_from'], $item['dateFrom_isBC'],
                $item['date_to'], $item['dateTo_isBC']
        );
        $placemark->owner = $item['owner_id'];
        $placemark->order_id = $item['order_id'];
        $placemark->order = $item['order'];
        $placemark->state_id = $item['object_state_id'];
        return $placemark;
    }
    
    /**
     * Create new HCPlacemark from given data.
     * 
     * @param mixed $id
     * @param string $title
     * @param string $name
     * @param string $description
     * @param string $kml
     * @param array $mappings
     */
    public static function construct ($id, $title, $name, $description, $kml, $mappings) {
        $item = new HCPlacemark();
        $this->id = $id;
        $this->title = $title;
        $this->name = $name;
        $this->description = $description;
        $this->kml = $kml;
    }

    public function __get($name) {
        switch ($name) {
            case 'id': return $this->id;
        }
    }
    public function getTotalWeight () {
        if ($this->weight) return $this->weight;
    }
    
    /**
     * Output Placemark as XML as child of $node.
     *
     * @param HCKmlNode $node 
     */
    public function toXMLAt(HCKmlNode $node) {
        $baseNode = $node->createPlacemarkNode($this->id);
        // Author
        /* $authorBase = $baseNode->createAndAppendNode('atom:author');
        $authorBase->createAndAppendList('atom:author', $this->authors);
        // Timespan
        $timespanBase = $baseNode->createAndAppendNode('TimeSpan');
        $timespanBase->createAndAppendTextNodes(array('begin' => $this->startTime, 'end' => $this->endTime));
         * 
         */
        // Link
        $baseNode->createAndAppendTextNode ('name', $this->name);
        $descNode = $baseNode->createAndAppendNode('description');
        $descNode->setAttribute('id', $this->contentId);
        //$baseNode->createAndAppendCDATASection ('description', $this->description);
        /* Removed this node; content will be accessed via a separate query.
        $edNode = $descNode->createAndAppendEDNode();
        $contentNode = $edNode->createAndAppendCDATASection ('content', $this->description);
        $contentNode->setAttribute('id', $this->contentId);
        $edNode->createAndAppendCDATASection ('citations', '');
         *
         */
        $link = $baseNode->createAndAppendNode('link');
        $link->createAndAppendTextNode ('href', "http://hypercities.ats.ucla.edu/collection/$this->id.kml");
        foreach ($this->mappings as $mappingObj) {
            $mapping = $mappingObj->kml;
            $sxe = simplexml_load_string($mapping);
            $markerDom = dom_import_simplexml($sxe);
            if ($markerDom == NULL) {
                //print "Defective KML in object $this->object :" . $mapping ." \n";
                continue;
            }
            $dom = $node->getDocument();
            $markerNode = $dom->importNode($markerDom, true);
            
            if ( ($itemNode = $markerNode->getElementsByTagName("Style")->item(0)) !== NULL ) {
                    $baseNode->appendChild($itemNode);
            }
            if ( ($itemNode = $markerNode->getElementsByTagName("Point")->item(0)) !== NULL ) {
                    $baseNode->appendChild($itemNode);
            }
            if ( ($itemNode = $markerNode->getElementsByTagName("LineString")->item(0)) !== NULL ) {
                    $baseNode->appendChild($itemNode);
            }
            if ( ($itemNode = $markerNode->getElementsByTagName("Polygon")->item(0)) !== NULL ) {
                    $baseNode->appendChild($itemNode);
            }
            if ( ($itemNode = $markerNode->getElementsByTagName("LookAt")->item(0)) !== NULL ) {
                    $baseNode->appendChild($itemNode);
            }
        } // end foreach ($this->mappings as $mapping)
        $ed = $baseNode->createAndAppendEDNode();
        $ed->createAndAppendTextNodes (array (
                'hc:viewFormat' => $this->mappings[0]->getBoundingBox(),
                'hc:orderId' => $this->order_id,
                'hc:order'  => $this->order,
                'hc:ownerId' => $this->owner,
                'hc:stateId' => $this->state_id,
            )
        );
    } // end public function toXMLAt(HCKmlNode $node)

} // end class HCPlacemark


?>