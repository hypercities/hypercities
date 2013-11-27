<?php
// vim: ts=4:sw=4:fdc=2:nu:nospell

/**
 * Represents a collection in memory,and provides collection management functions.
 *
 * 
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-06-21
 * @version   $Id$
 *
 */

include_once("includes/util.inc");
include_once("includes/database.inc");
include_once("includes/HCSearchResult.php");

class HCCollection extends HCSearchResult {
    public $name, $description;
    private $author, $order;
    public $visibleChildren = array();
    private $totalChildren = 0;

    public $mappings;
    private $creator, $owner_id, $object_type_id, $order_id;
    

    /**
     * Construct a new HCCollection object. If passed a collection ID, it will
     * query the database for that item and fill in the fields from the database.
     * 
     * @param {int} $id ID of the collection
     */
    public function  __construct($id = NULL) {
        if ($id) {
            $this->id = (int)$id;
            $db = database::getInstance();
            $query = "SELECT DISTINCT(om.object_id) AS id, "
		    ."om.kml, om.ne_lat, om.ne_lon, om.sw_lat, om.sw_lon, o.object_state_id, "
		    ."om.date_from, om.dateFrom_isBC, om.date_to, om.dateTo_isBC, "
		    ."o.title, o.creator, o.description, o.owner_id, o.object_type_id "
		    //."obr.id AS order_id, obr.order "
		    //."oc.content, obr.id AS order_id, obr.order "
		    //."FROM object_mappings AS om, object_relations AS obr, objects AS o "
		    ."FROM object_mappings AS om, objects AS o "
		    //."LEFT JOIN contents AS oc ON o.content_id = oc.id "
		    ."WHERE o.id = om.object_id " //AND o.id = obr.subject_id "
		    ."AND o.id = $this->id ";
		    //."AND o.object_state_id != ". HC_OBJECT_DELETED . " "   // Not being deleted
		    //."ORDER BY obr.order ASC, obr.subject_id ASC";
            $db = database::getInstance();
            $result = $db->query($query);
            //if (!$result) echo $db->getError();
            $row = $db->getRows();
            $this->name = $row[0]['title'];
            $this->description = $row[0]['description'];
            $this->author = $row[0]['creator'];
            $this->mappings = HCMapping::withBounds($row[0]['kml'],
			$row[0]['ne_lat'], $row[0]['ne_lon'], $row[0]['sw_lat'],
			$row[0]['sw_lon'], $row[0]['date_from'],
			$row[0]['dateFrom_isBC'], $row[0]['date_to'],
			$row[0]['dateTo_isBC']
		    );
            $this->creator = $row[0]['creator'];
            $this->owner_id = $row[0]['owner_id'];
            $this->object_type_id = $row[0]['object_type_id'];
            //$this->order_id = $row[0]['order_id'];
            //$this->order = $row[0]['order'];
        }
    }

    public function __get($name) {
        switch ($name) {
            case 'id': return $this->id;
        }
    }
    
    /**
     * Get all children of the collection.
     * @param {Target} $target Optional. Target with geotemporal criteria.
     */
    public function getChildren(Target $target = NULL) {
        if ($target && $target->hasGeoTemporalCriteria) {
            $dateFromIsBC = substr($target->requestData['start_time'], 0, 1) == '-';
            $dateFrom = substr($target->requestData['start_time'], 1);
            $dateToIsBC = substr($target->requestData['end_time'], 0, 1) == '-';
            $dateTo = substr($target->requestData['start_end'], 1);
            $children = self::getCollectionByIdBound($this->id,
                    $target->requestData['swLat'],
                    $target->requestData['swLng'],
                    $target->requestData['neLat'],
                    $target->requestData['neLng'],
                    $dateFromIsBC, $dateFrom, $dateToIsBC, $dateTo);
        } else {
            $children = self::getCollectionById($this->id);
        }
        // Create children
        if ($children) {
            $childObjects = HCSearchResult::buildFromArray($children);
            foreach ($childObjects as $child) $this->addChild($child);
        }
    }

    /**
     * Build new HCCollection object from an array.
     * 
     * @param array $item
     * @return {HCCollection} new HCCollection object.
     */
    public static function buildFromArray (array $item) {
        $collection = new HCCollection();
        $collection->name = $item['title'];
        $collection->id = $item['id'];
        $collection->description = $item['description'];
        $collection->author = $item['creator'];
        $collection->mappings = HCMapping::withBounds(null, $item['ne_lat'], 
		$item['ne_lon'], $item['sw_lat'], $item['sw_lon'],
		$item['date_from'], $item['dateFrom_isBC'], $item['date_to'],
		$item['dateTo_isBC']
	);
        return $collection;
    }
    
    /**
     * Add a Placemark or Collection as a child of this object. This change
     * happens only in memory, not in the database.
     * 
     * @param {HCCollection or HCPlacemark} $child Child to be added
     */
    public function addChild($child) {
        if ($child instanceof HCCollection || $child instanceof HCPlacemark) {
	    $this->visibleChildren[] = &$child;
	}
        else throw new InvalidArgumentException(
		"HCCollection::addChild() argument must be HCCollection or HCPlacemark.",
		"INVALID_ARGUMENT"
	);
    } // public function addChild($child)

    /**
     * Return number of children in view.
     * 
     * @return {int} Number of children in view
     */
    public function getBoundChildren() {
        return count ($this->visibleChildren);
    }

    //private static $TOTAL_CHILDREN_QUERY = "SELECT COUNT(*) AS total FROM object_relations WHERE object_state_id != 5 AND object_id = ";
    private static $TOTAL_CHILDREN_QUERY = "SELECT COUNT(*) AS total FROM object_relations obr, objects o WHERE o.object_state_id != 5 AND o.id = obr.object_id AND o.id = ";

    /**
     * Return collection's total children.
     * 
     * @return {int} Colleciton's total children.
     */
    public function getTotalChildren() {
        if ($this->totalChildren == 0) {
            $db = database::getInstance();
            $db->query(self::$TOTAL_CHILDREN_QUERY . $this->id);
            $row = $db->getRows();
            $this->totalChildren = $row[0]['total'];
        } // end if ($this->totalChildren == 0)
        return $this->totalChildren;
    } // public function getTotalChildren()


    /**
     * Returns object data as KML.
     * @param {HCKmlNode} $node Node at which to place this data
     */
    public function toXMLAt(HCKmlNode $node) {
        // If it has children, create a folder node
        //if ($this->getBoundChildren() != 0) {
            $baseNode = $node->createFolderNode($this->id, $this->name, $this->description);
        /*} else { // otherwise, create a NetworkLink node
            $baseNode = $node->createNetworkNode($this->id);
            $baseNode->createAndAppendTextNodes(array(
                    'name' => $this->name,
                    'description' => $this->description,
                    'open'  => 1
                ));
        }*/
        //$baseNode->createAndAppendTextNode('open', 1);
        // Author
        $authorBase = $baseNode->createAndAppendNode('atom:author');
        $authorBase->createAndAppendTextNode('atom:name', $this->author);
        // Timespan
        /*$timespanBase = $baseNode->createAndAppendNode('TimeSpan');
        $timespanBase->createAndAppendTextNodes(array('begin' => $this->startTime, 'end' => $this->endTime));*/
        // Link
        $link = $baseNode->createAndAppendNode('link');
        $link->createAndAppendTextNode ('href',
		"http://hypercities.ats.ucla.edu/collection/$this->id.kml");
        $edNode = $baseNode->createAndAppendEDNode();
        $extendedData = array(
                'hc:boundChildren' => $this->getBoundChildren(),
                'hc:totalChildren' => $this->getTotalChildren(),
                'hc:viewFormat' => $this->mappings->getBoundingBox(),
                'hc:orderId' => $this->order_id,
                'hc:order' => $this->order,
                'hc:external' => 0,
                'weight' => $this->getTotalWeight(),
                'hc:checkBox' => (int)!($this->isRoot()),
                'hc:preventUpdate' => 1
            );
        
        $edNode->createAndAppendTextNodes($extendedData);
        foreach ($this->visibleChildren as $child) {
	    $child->toXMLAt($baseNode);
	}
    }

	/**
	 * Return all Object Mapping Id that within given bounding box
	 * Query Item using Geo_References, Collection using latlng box
	 * @param {float} $west West coordinate
	 * @param {float} $south South coordinate
	 * @param {float} $east East
	 * @param {float} $north North coordinate
	 */
	private function getMappingInView($west, $south, $east, $north) {

		$db = database::getInstance();

		$mappingList = array();
		$params = array('type'=>'dddd', &$north, &$south, &$east, &$west);

		// Get Object's mapping Id in bounding box
		$query_str = "SELECT DISTINCT omgr.object_mapping_id AS id "
			."FROM geo_references AS gr, object_mappings_geo_references"
			." AS omgr WHERE omgr.geo_reference_id = gr.id "
			."AND gr.latitude < ? AND gr.latitude > ? ";

		// Case 1) Normal Bounding Box
		if ( $east >= $west ) {
			$query_str .= "AND gr.longitude < ? AND gr.longitude > ? ";
		} 
		// Case 2) Bounding Box acrossing longitude 180 to -180 ($east < $west)
		else {
			$query_str .= "AND (( gr.longitude > -180 AND gr.longitude < ? ) "
				."OR ( gr.longitude < 180 AND gr.longitude > ? )) ";
		}

		$result = $db->preparedQuery($query_str, $params);

		if (!$result) {
			HC_errorLog("Fail to get Mapping in view: " . $db->getError());
			HC_reportError("Fail to get Mapping in view : Database Error");
		}

		$rows = $db->preparedGetRows();
		foreach ($rows as $index => $item) {
			$mappingList[] = $item['id'];
		}

		// Get Collection's mapping Id in bounding box
		$query_str = "SELECT DISTINCT om.id "
			."FROM objects AS o, object_mappings AS om "
			."WHERE o.id = om.object_id "
			." AND o.object_type_id != " . HC_OBJECT_TYPE_MEDIA
			." AND o.object_type_id != " . HC_OBJECT_TYPE_3D
			." AND NOT (om.sw_lat >= ? OR om.ne_lat <= ? ";
		
		// Case 1) Normal Bounding Box
		if ( $east >= $west ) {
			$query_str .= "OR om.sw_lon >= ? OR om.ne_lon <= ?)";
		}
		// Case 2) Bounding Box acrossing longitude 180 to -180 ($east < $west)
		else {
			$query_str .= ") AND (( om.sw_lon > -180 AND om.sw_lon < ? ) "
				."OR ( om.ne_lon < 180 AND om.ne_lon > ? )) ";
		}

		$result = $db->preparedQuery($query_str, $params);

		if (!$result) {
			HC_errorLog("Fail to get Mapping in view: " . $db->getError());
			HC_reportError("Fail to get Mapping in view : Database Error");
		}

		$rows = $db->preparedGetRows();
		
		foreach ($rows as $index => $item) {
			$mappingList[] = $item['id'];
		}

		return implode(",", $mappingList);
	}

	/**
	 * Returns the number of children of collection $cid by querying the
	 * database.
	 * 
	 *  @param $cid: the collection id need to count the children number
	 *  @param $isAdmin: does the query issue by admin user
	 */
	static function getCollectionChildrenNumber($cid, $uid, $isAdmin = false) {

		$db = database::getInstance();

		if ( $uid ) {
			$params = array('type'=>'ii', &$cid, &$uid);
		} else {
			$params = array('type'=>'i', &$cid);
		}

		$query_str = "SELECT obr.object_id AS id, COUNT(*) AS total "
			."FROM objects AS o, object_relations AS obr "
			."WHERE obr.object_id = ? "
			."AND o.id = obr.object_id "
			."AND o.object_state_id != ". HC_OBJECT_DELETED;

		// If not Admin, only count Public and Private Visible Collections
		if (!$isAdmin) { 
			$query_str .= " AND (o.object_state_id = " . HC_OBJECT_PUBLIC 
				." OR o.object_state_id = " . HC_OBJECT_PRIVATE ;
			if ( $uid ) {
				$query_str .= " OR o.owner_id = ? ";
			}
			$query_str .= " ) ";
		} 

		$query_str .= "GROUP BY obr.object_id";
//		HC_debugLog($query_str);

		$result = $db->preparedQuery($query_str, $params);

		if (!$result) {
			HC_errorLog("Fail to count children of collection $cid :"
				    . $db->getError());
			HC_reportError("Fail to count children of collection $cid"
					." : Database Error");
		}

		$row = $db->preparedGetRows();

		return Intval($row[0]['total']);
	}

	/**
	 * Return the 3D collections in the given timespan.
	 *
	 * @param {float} $swLat
	 * @param {float} $swLng
	 * @param {float} $neLat
	 * @param {float} $neLng
	 * @param {boolean} $dateFromIsBC
	 * @param {string} $dateFrom
	 * @param {boolean} $dateToIsBC
	 * @param {string} $dateTo
	 * @param {boolean} $isAdmin
	 * @return {array} Number of 3D collections in Timespan
	 */
	static function get3DCollection($swLat, $swLng, $neLat, $neLng, 
					$dateFromIsBC, $dateFrom,
					$dateToIsBC, $dateTo, $isAdmin = false) {
		$db = database::getInstance();

		$params = array('type'=>'isis', &$dateToIsBC, &$dateTo,
				&$dateFromIsBC, &$dateFrom);

		$query_str = "SELECT DISTINCT(om.object_id) AS id,"
			." o.title, o.creator, o.description, o.object_state_id,"
			." o.object_type_id, om.kml, om.ne_lat, om.ne_lon,"
			." om.sw_lat, om.sw_lon, om.date_from, om.dateFrom_isBC,"
			." om.date_to, om.dateTo_isBC "
			."FROM objects AS o, object_mappings AS om "
			."WHERE o.id = om.object_id "
			."AND o.object_type_id = " . HC_OBJECT_TYPE_3D . " "
			."AND o.object_state_id != ". HC_OBJECT_DELETED . " "
			."AND NOT (dateLarger(om.dateFrom_isBC, om.date_from, ?, ?) "
			."OR dateLarger(?, ?, om.dateTo_isBC, om.date_to)) ";

		// If not Admin, only show Public and Private Visible Collections
		if (!$isAdmin) { 
			$query_str .= "AND (o.object_state_id = " . HC_OBJECT_PUBLIC 
				." OR o.object_state_id = " . HC_OBJECT_PRIVATE . ") ";
		}

		$result = $db->preparedQuery($query_str, $params);

		if (!$result) {
			HC_errorLog("Fail to get 3D collections : " . $db->getError());
			HC_reportError("Fail to get 3D collections : Database Error");
		}

		return $db->preparedGetRows();
	}

	/**
	 * Get coauthors for a collection.
	 */
	static function getCollectionPrivilege($cid) {
	
		$db = database::getInstance();
		$params = array('type'=>'i', &$cid);
		$query = "SELECT ou.user_id, ou.access_right_id, u.email, u.first_name, "
			."u.last_name FROM objects_users as ou "
			."LEFT JOIN users AS u ON ou.user_id = u.id "
			."WHERE ou.object_id = ?";

		$result = $db->preparedQuery($query, $params);

		// if something wrong happens, $result would be null.
		if (!$result) {
			HC_errorLog("Fail to get collection $cid : " . $db->getError());
		}

		$rows = $db->preparedGetRows();

		return $rows;
	}

	/**
	 * Return the collection Information of collection $cid
	 * @param {int} $cid Collection identifier
	 * @param {boolean} $isAdmin Whether user is admin. Defaults to false.
	 */
	static function getCollectionInfoById($cid, $isAdmin = false) {

		$db = database::getInstance();

		$params = array('type'=>'i', &$cid);

		$query_str = "SELECT o.id, o.title, o.description, o.copyright,"
			." o.owner_id, o.creator, om.ne_lat, om.ne_lon, om.sw_lat,"
			." om.sw_lon, o.object_state_id, o.object_type_id, "
			." om.marker_style_id, om.marker_state_id, "
			." oc.content, om.view, om.zoom, "
			." om.kml, u.nickname, om.date_from, om.dateFrom_isBC,"
			." om.date_to, om.dateTo_isBC, om.basemap_id, om.max_zoom "
//			." ou.user_id, ou.access_right_id,"
//			." u2.email, u2.first_name, u2.last_name "
			."FROM object_mappings AS om, users AS u, objects AS o "
			."LEFT JOIN contents AS oc ON o.content_id = oc.id "
//			."LEFT JOIN objects_users AS ou ON ou.object_id = o.id "
//			."LEFT JOIN users AS u2 ON ou.user_id = u2.id "
			."WHERE o.id = ? AND o.owner_id = u.id AND o.id = om.object_id "
			."AND o.object_state_id != " . HC_OBJECT_DELETED;

		$result = $db->preparedQuery($query_str, $params);

		if (!$result) {
			HC_errorLog("Fail to get collection $cid : " . $db->getError());
			HC_reportError("Fail to get collection $cid : Database Error");
		}

		$rows = $db->preparedGetRows();
		// Make sure we get single record
		if (sizeof($rows) != 1) {
		    HC_errorLog("In getMediaObject : query [ $query_str ] "
				."resulted in ".sizeof($rows)." results"
			    );
		    HC_reportError("Fail to get collection Info $cid :"
				  ." Multiple or Zero Instances"
			    );
		}

		// David, 10-14-09: If there is no creator specified, just use
		// the author's nickname
		if (!$rows[0]['creator']) {
			$rows[0]['creator'] = $rows[0]['nickname'];
		}

		$collection = $rows[0];

		return $collection;
	}

	/**
	 * Return the children of a list of collections, ignoring bounding box
	 * and timespan.
	 *
	 * @param {array} $idList List of ids.
	 * @param {boolean} $isAdmin Whether user is admin. Defaults to false.
	 */
	static function getCollectionByIdList($idList, $isAdmin = false) {

		$db = database::getInstance();

		// Step 1 : Get children information of collection $cid
		$params = array('type'=>'i', &$cid);

		$query_str = "SELECT DISTINCT(om.object_id) AS id, "
			." om.kml, om.ne_lat, om.ne_lon, om.sw_lat, om.sw_lon, om.zoom,"
			." o.object_state_id, om.date_from, om.dateFrom_isBC,"
			." om.date_to, om.dateTo_isBC, o.title, o.creator,"
			." o.description, o.owner_id, o.object_type_id,"
			." o.content_id, oc.content "
			."FROM object_mappings AS om, objects AS o "
			."LEFT JOIN contents AS oc ON o.content_id = oc.id "
			."WHERE o.id = om.object_id AND o.id IN ( ".$idList.") "
			."AND o.object_state_id != ". HC_OBJECT_DELETED . " "   // Not being deleted
			."ORDER BY o.title ASC";

//		HC_debugLog($query_str);
		$result = $db->preparedQuery($query_str, $params);

		if (!$result) {
			HC_errorLog("Fail to get collection's children : " . $db->getError());
			HC_reportError("Fail to get collection's children : Database Error");
		}
		
		$rows = $db->preparedGetRows();
//		HC_debugLog(var_export($rows,true));

		// If the collection $cid has no children, just return null
		if (sizeof($rows) == 0) {
			 return null;
		}

		// Store children information in $collectionArray
		$collectionIdList = array();
		$collectionArray = array();
		foreach ($rows as $index => $item) {
			$collectionIdList[] = $item['id'];
			$collectionArray[$item['id']] = $item;
		}

//		HC_debugLog(implode(",", $collectionIdList));

		// Step 2 : Count Total Children of each children collection, if any
		$query_str = "SELECT obr.object_id AS id, COUNT(*) AS total "
			."FROM objects AS o, object_relations AS obr "
			."WHERE o.id = obr.object_id "
			."AND o.object_state_id != ". HC_OBJECT_DELETED . " "
			."AND obr.object_id IN (".implode(",", $collectionIdList).") ";

		$query_str .= "GROUP BY obr.object_id";
//		HC_debugLog($query_str);

		$result = $db->query($query_str);

		if (!$result) {
			HC_errorLog("Fail to count public collections : " . $db->getError());
			HC_reportError("Fail to count public collections : Database Error");
		}

		$rows = $db->getRows();
//		HC_debugLog(var_export($rows,true));

		$totalChildrenArray = array();
		foreach ($rows as $index => $item) {
			$totalChildrenArray[$item['id']] = $item['total'];
		}

		foreach ($collectionArray as $index => $item) {
			$totalChildren = @$totalChildrenArray[$index];

			if ( empty($totalChildrenArray[$index]) ) {
				$totalChildren = 0;
			}

			$collectionArray[$index]['totalChildren'] = $totalChildren;
		}
		return $collectionArray;
	}

	/**
	 * Return the children of collection $cid, ignoring the bounding box and timespan.
	 * @param {int} $cid Collection id.
	 * @param {boolean} $isAdmin. If the user is admin. Defaults to false.
	 */
	static function getCollectionById($cid, $isAdmin = false) {

		$db = database::getInstance();

		// Step 1 : Get children information of collection $cid
		$params = array('type'=>'i', &$cid);

		$query_str = "SELECT DISTINCT(om.object_id) AS id, o.title, o.creator,"
			." om.kml, om.ne_lat, om.ne_lon, om.sw_lat, om.sw_lon, om.zoom,"
			." o.object_state_id, om.marker_style_id, om.marker_state_id,"
			." om.date_from, om.dateFrom_isBC, om.date_to, om.dateTo_isBC,"
			." om.view, om.basemap_id, "
			." o.description, o.owner_id, o.object_type_id, o.content_id,"
			." oc.content, obr.id AS order_id, obr.order "
			."FROM object_mappings AS om, object_relations AS obr, objects AS o "
			."LEFT JOIN contents AS oc ON o.content_id = oc.id "
			."WHERE o.id = om.object_id AND o.id = obr.subject_id "
			."AND obr.object_id = ? "
			."AND o.object_state_id != ". HC_OBJECT_DELETED . " "   // Not being deleted
			."ORDER BY obr.order ASC, o.title ASC";

//		HC_debugLog($query_str);
		$result = $db->preparedQuery($query_str, $params);

		if (!$result) {
			HC_errorLog("Fail to get collection's children : " . $db->getError());
			HC_reportError("Fail to get collection's children : Database Error");
                        
		}
                //print $db->getError();
		
		$rows = $db->preparedGetRows();
                //print "Got child rows";
//		HC_debugLog(var_export($rows,true));

		// If the collection $cid has no children, just return null
		if (sizeof($rows) == 0) {
			 return null;
		}

		// Store children information in $collectionArray
		$collectionIdList = array();
		$collectionArray = array();
		foreach ($rows as $index => $item) {
	
			// select maps for rich objects
			$maps = array();
			$params = array('type'=>'i', &$item['id']);
			$query = "SELECT omap.map_id FROM objects_maps AS omap"
				." WHERE omap.object_id = ?";
			$result = $db->preparedQuery($query, $params);

			if (!$result) {
				$item['maps'] = null;
			} else {
				$record = $db->preparedGetRows();
				foreach ($record as $map) {
					$maps[] = $map['map_id'];
				}
				$item['maps'] = implode(',', $maps);
			}

			// select objects for rich objects
			$objs = array();
			$params = array('type'=>'i', &$item['id']);
			$query = "SELECT obr.subject_id FROM object_relations AS obr"
					." WHERE obr.object_id = ?";
			$result = $db->preparedQuery($query, $params);

			if (!$result) {
				$item['objs'] = null;
			} else {
				$record = $db->preparedGetRows();
				foreach ($record as $obj) {
					$objs[] = $obj['subject_id'];
				}
				$item['objs'] = implode(',', $objs);
			}


			$collectionIdList[] = $item['id'];
			$collectionArray[$item['id']] = $item;
		}

//		HC_debugLog(implode(",", $collectionIdList));

		// Step 2 : Count Total Children of each children collection, if any
		$query_str = "SELECT obr.object_id AS id, COUNT(*) AS total "
			."FROM objects AS o, object_relations AS obr "
			."WHERE o.id = obr.object_id "
			."AND o.object_state_id != ". HC_OBJECT_DELETED . " "
			."AND obr.object_id IN (".implode(",", $collectionIdList).") ";

		$query_str .= "GROUP BY obr.object_id";
//		HC_debugLog($query_str);

		$result = $db->query($query_str);

		if (!$result) {
			HC_errorLog("Fail to count public collections : " . $db->getError());
			HC_reportError("Fail to count public collections : Database Error");
		}

		$rows = $db->getRows();
//		HC_debugLog(var_export($rows,true));

		$totalChildrenArray = array();
		foreach ($rows as $index => $item) {
			$totalChildrenArray[$item['id']] = $item['total'];
		}

		foreach ($collectionArray as $index => $item) {
			$totalChildren = @$totalChildrenArray[$index];

			if ( empty($totalChildrenArray[$index]) ) {
				$totalChildren = 0;
			}

			$collectionArray[$index]['totalChildren'] = $totalChildren;
		}
		return $collectionArray;
	}

	/**
	 * Return the children of collection $cid, within given timespan and
	 * bounding box.
	 * 
	 * @param {float} $swLat
	 * @param {float} $swLng
	 * @param {float} $neLat
	 * @param {float} $neLng
	 * @param {boolean} $dateFromIsBC
	 * @param {string} $dateFrom
	 * @param {boolean} $dateToIsBC
	 * @param {string} $dateTo
	 * @param {boolean} $isAdmin
	 * @return {array} Children of collection.
	 */
	static function getCollectionByIdBound($cid, $swLat, $swLng, $neLat,
					       $neLng, $dateFromIsBC, $dateFrom,
					       $dateToIsBC, $dateTo, $isAdmin = false) {
		$db = database::getInstance();

		// Get List of Object Mapping ID that within View
		//$mappingList = self::getMappingInView($swLng, $swLat, $neLng, $neLat);

		// Get Object's mapping Id in bounding box
		$queryMappingStr = "SELECT DISTINCT omgr.object_mapping_id AS id "
			."FROM geo_references AS gr, object_mappings_geo_references"
			." AS omgr WHERE omgr.geo_reference_id = gr.id "
			."AND gr.latitude < ? AND gr.latitude > ? ";

		// Case 1) Normal Bounding Box
		if ( $neLng >= $swLng ) {
			$queryMappingStr .= "AND gr.longitude < ? AND gr.longitude > ? ";
		} 
		// Case 2) Bounding Box acrossing longitude 180 to -180 ($east < $west)
		else {
			$queryMappingStr .= "AND (( gr.longitude > -180 AND gr.longitude < ? ) "
				."OR ( gr.longitude < 180 AND gr.longitude > ? )) ";
        }

        $queryMappingStr .= "UNION ";

        // Get Collection's mapping Id in bounding box
		$queryMappingStr .= "SELECT DISTINCT om.id "
			."FROM objects AS o, object_mappings AS om "
			."WHERE o.id = om.object_id "
			." AND o.object_type_id != " . HC_OBJECT_TYPE_MEDIA
			." AND o.object_type_id != " . HC_OBJECT_TYPE_3D
			." AND NOT (om.sw_lat >= ? OR om.ne_lat <= ? ";
		
		// Case 1) Normal Bounding Box
		if ( $neLng >= $swLng ) {
			$queryMappingStr .= "OR om.sw_lon >= ? OR om.ne_lon <= ?)";
		}
		// Case 2) Bounding Box acrossing longitude 180 to -180 ($east < $west)
		else {
			$queryMappingStr .= ") AND (( om.sw_lon > -180 AND om.sw_lon < ? ) "
				."OR ( om.ne_lon < 180 AND om.ne_lon > ? )) ";
		}



		//HC_debugLog($mappingList);

		// Get Information of Collection $cid
        $params = array('type'=>'iddddddddisis', &$cid, 
                        &$neLat, &$swLat, &$neLng, &$swLng,
                        &$neLat, &$swLat, &$neLng, &$swLng,
						&$dateToIsBC, &$dateTo, &$dateFromIsBC, &$dateFrom);

		$query_str = "SELECT DISTINCT(om.object_id) AS id,"
			." o.title, o.description, o.copyright, o.owner_id, o.creator,"
			." om.kml, om.ne_lat, om.ne_lon, om.sw_lat, om.sw_lon, om.zoom,"
			." o.object_state_id, o.object_type_id, om.date_from, om.dateFrom_isBC,"
			." om.date_to, om.dateTo_isBC, om.marker_style_id, om.marker_state_id,"
			." om.basemap_id, om.view,"
			." o.content_id, obr.id AS order_id, obr.order "
			."FROM objects AS o, object_mappings AS om, object_relations AS obr "
			."WHERE o.id = om.object_id AND o.id = obr.subject_id "
			."AND obr.object_id = ? "
			."AND o.object_state_id != ". HC_OBJECT_DELETED . " "   // Not being deleted
			."AND om.id IN ($queryMappingStr) "                         // In View
			."AND NOT (dateLarger(om.dateFrom_isBC, om.date_from, ?, ?) "
			."OR dateLarger(?, ?, om.dateTo_isBC, om.date_to)) ";

		// If not Admin, only show Public and Private Visible Collections
		if (!$isAdmin) { 
			$query_str .= "AND (o.object_state_id = " . HC_OBJECT_PUBLIC 
				." OR o.object_state_id = " . HC_OBJECT_PRIVATE . ") ";
		}

		$query_str .= "ORDER BY obr.order ASC, obr.subject_id ASC";
//		HC_debugLog($query_str);
		$result = $db->preparedQuery($query_str, $params);

		if (!$result) {
			HC_errorLog("Fail to get collection's children : " . $db->getError());
			HC_reportError("Fail to get collection's children : Database Error");
		}
//		HC_debugLog(var_export($db->preparedGetRows(), true));
		
		$rows = $db->preparedGetRows();
//		HC_debugLog(var_export($rows,true));

		$collectionIdList = array();
		$collectionArray = array();
		$boundChildrenArray = array();
		foreach ($rows as $index => $item) {
			$collectionIdList[] = $item['id'];
			$collectionArray[$item['id']] = $item;

			// If it's object or external kml add zero children for it, 
			// otherwise, it will be deleted in next step
			if ($item['object_type_id'] > HC_OBJECT_TYPE_COLLECTION) {
				$boundChildrenArray[$item['id']] = 0;
			}
		}

//		HC_debugLog(implode(",", $collectionIdList));
		if ( sizeof($collectionIdList) == 0 ) {
			return null;
		}

		// Step 2 : Count Bounded Children of each collection
        $params = array('type'=>'ddddddddss', 
                        &$neLat, &$swLat, &$neLng, &$swLng,
                        &$neLat, &$swLat, &$neLng, &$swLng,
                        &$dateFrom, &$dateTo);

		$query_str = "SELECT obr.object_id AS id, COUNT(DISTINCT(o.id))"
			." AS children FROM object_mappings AS om, objects AS o,"
			." object_relations AS obr "
			."WHERE o.id = om.object_id AND o.id = obr.subject_id "
			."AND om.id IN ($queryMappingStr) "
//			."AND (om.id IN ($mappingList) "
//			."OR o.object_type_id = " . HC_OBJECT_TYPE_KML . " "
//			."OR o.object_type_id = " . HC_OBJECT_TYPE_COLLECTION . ") "

			."AND o.object_state_id != ". HC_OBJECT_DELETED . " "
			."AND obr.object_id IN (".implode(",", $collectionIdList).") ";

		// Both timebound are A.D.
		if ($dateFromIsBC == 0 && $dateToIsBC == 0) {
			$query_str .= "AND om.dateFrom_isBC = 0 AND om.dateTo_isBC = 0"
						." AND (NOT(om.date_to < ? OR om.date_from > ?)) ";
		}
		// Both timebound are B.C.
		else if ($dateFromIsBC == 1 && $dateToIsBC == 1) {
			$query_str .= "AND om.dateFrom_isBC = 1 AND om.dateTo_isBC = 1"
						." AND (NOT(om.date_to > ? OR om.date_from < ?)) ";
		}
		// Start from B.C. and end at A.D.
		else if ($dateFromIsBC == 1 && $dateToIsBC == 0) {
			$query_str .= "AND (NOT((om.date_to > ? AND om.dateTo_isBC = 1)"
						." OR (om.date_from > ? AND om.dateFrom_isBC = 0))) ";
		}

		// If not Admin, only show Public and Private Visible Collections
		if (!$isAdmin) {
			$query_str .= "AND (o.object_state_id = " . HC_OBJECT_PUBLIC 
						." OR o.object_state_id = " . HC_OBJECT_PRIVATE . ") ";
		}

		$query_str .= "GROUP BY obr.object_id";
//		HC_debugLog($query_str);

		$result = $db->preparedQuery($query_str, $params);

		if (!$result) {
			HC_errorLog("Fail to count children of collection $cid :"
				    . $db->getError());
			HC_reportError("Fail to count children of collection $cid"
					." : Database Error");
		}

		$rows = $db->preparedGetRows();
//		HC_debugLog(var_export($rows,true));

		$collectionIdList = array();
		foreach ($rows as $index => $item) {
			$collectionIdList[] = $item['id'];
			$boundChildrenArray[$item['id']] = $item['children'];
		}
		$mergedArray = array_intersect_key($collectionArray, $boundChildrenArray);
		//print_r(array_keys($mergedArray));
//		HC_debugLog(var_export($boundChildrenArray,true));
//		HC_debugLog(var_export($collectionArray,true));

		foreach ($mergedArray as $index => $item) {
			$mergedArray[$index]['boundChildren'] = $boundChildrenArray[$index];
		}
//		HC_debugLog(var_export($mergedArray,true));

		if ( sizeof($collectionIdList) == 0 ) {
			return $mergedArray;
		}

		// Step 3 : Count Total Children of each collection, if any
		$query_str = "SELECT obr.object_id AS id, COUNT(*) AS total "
			."FROM objects AS o, object_relations AS obr "
			."WHERE o.id = obr.subject_id "
			."AND o.object_state_id != ". HC_OBJECT_DELETED . " "
			."AND obr.object_id IN (".implode(",", $collectionIdList).") ";

		// If not Admin, only count Public and Private Visible Collections
		if (!$isAdmin) { 
			$query_str .= "AND (o.object_state_id = " . HC_OBJECT_PUBLIC 
				." OR o.object_state_id = " . HC_OBJECT_PRIVATE . ") ";
		}

		$query_str .= "GROUP BY obr.object_id";
//		HC_debugLog($query_str);

		$result = $db->query($query_str);

		if (!$result) {
			HC_errorLog("Fail to count public collections : " . $db->getError());
			HC_reportError("Fail to count public collections : Database Error");
		}

		$rows = $db->getRows();
//		HC_debugLog(var_export($rows,true));

		$totalChildrenArray = array();
		foreach ($rows as $index => $item) {
			$totalChildrenArray[$item['id']] = $item['total'];
		}
                //print_r($totalChildrenArray);
//		HC_debugLog(var_export($boundChildrenArray,true));
//		HC_debugLog(var_export($collectionArray,true));

		foreach ($mergedArray as $index => $item) {
			if (isset($totalChildrenArray[$index])) {
				$mergedArray[$index]['totalChildren'] = $totalChildrenArray[$index];
			} else {
				$mergedArray[$index]['totalChildren'] = 0;
			}
		}
		return $mergedArray;
		/*
		foreach ($collectionArray as $index => $item) {
			if (isset($totalChildrenArray[$index])) {
				$collectionArray[$index]['totalChildren'] = $totalChildrenArray[$index];
			} else {
				$collectionArray[$index]['totalChildren'] = 0;
			}
		}
//		HC_debugLog(var_export($mergedArray,true));
		return $collectionArray;
		*/
	}
} // end of HCCollection Class
?>
