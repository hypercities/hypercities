<?php

/**
 * Represents a search request
 *
 * @author    David Shepard
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-08-01
 * @version   $Id$
 *
 */
class HCSearchRequest {

    public $keywords = array();
    private $hasGTKeys;
    public $where, $swLat, $swLon, $neLat, $neLon, $start, $end, $startdateIsBC, $enddateIsBC;

    /**
     * Build request from given array, usally superglobal like $_GET or $_POST.
     *
     * @param array $request
     */
    public function __construct(array $request) {
	$db = database::getInstance();
	$this->keywords = $db->sanitizeData($request['keywords']);
	$this->where = $request['where'];
	// Put these in an array
	$hasGTKeys = TRUE;
	foreach (array('swLat', 'swLon', 'neLat', 'neLon', 'start', 'end') as $key) {
	    if (!array_key_exists($key, $request))
		$hasGTKeys = false;
	}
	if ($hasGTKeys) {
	    $this->hasGTKeys = TRUE;
	    $this->swLat = $db->sanitizeData($request['swLat']);
	    $this->swLon = $db->sanitizeData($request['swLon']);
	    $this->neLat = $db->sanitizeData($request['neLat']);
	    $this->neLon = $db->sanitizeData($request['neLon']);
	    $this->start = $db->sanitizeData($request['start']);
	    if ($this->swLat > $this->neLat) {
		$this->swLat = -180;
		$this->neLat = 180;
	    }
	    if ($this->swLon > $this->neLon) {
		$this->swLon = -180;
		$this->neLon = 180;
	    }
	    $this->end = $db->sanitizeData($request['end']);
	    if (substr($request['start'], 0, 1) == '-')
		$this->startdateIsBC = 1; else
		$this->startdateIsBC = 0;
	    if (substr($request['end'], 0, 1) == '-')
		$this->enddateIsBC = 1; else
		$this->enddateIsBC = 0;
	}
    }

    /**
     * Generate query representing the search terms.
     * 
     * @return string SQL query
     */
    public function generateQuery() {
	$conditions = " (o.title LIKE ? OR o.description LIKE ? OR c.content LIKE ? OR o.creator LIKE ? ) "
		. " AND c.id = o.content_id "
		. " AND o.object_state_id != " . HC_OBJECT_DELETED;
	$tables = " objects o, contents c ";
	if (!cServerSession::isAdmin()) {
	    $query .= " AND o.object_state_id = " . HC_OBJECT_PUBLIC;
	    if (cServerSession::getUserId()) {
		$query .= "OR o.object_state_id = " . HC_OBJECT_PRIVATE . " AND o.owner_id = " . cServerSession::getUserId();
	    }
	}
	$params = array('type' => 'sss', "%$this->keywords%", "%$this->keywords%", "%$this->keywords%");
	if ($this->where == 'CurrentView') {
	    // In case the viewport shows the same part of the world multiple times.
	    $tables .= ", object_mappings om ";
	    $conditions .= " AND om.object_id = o.id "
		    . " AND om.sw_lat >= ? AND om.sw_lon >= ? AND om.ne_lat <= ? AND om.ne_lon <= ?"
		    . " AND NOT (dateLarger (om.dateFrom_isBC, om.date_from, ?, ?)"
		    . " OR dateLarger (?, ?, om.dateTo_isBC, om.date_to))";
	    $params['type'] .= 'ddddisis';
	    array_push($params, $this->swLat, $this->swLon, $this->neLat, $this->neLon,
		    $this->enddateIsBC, $this->end, $this->startdateIsBC, $this->start);
	}
	$query = 'SELECT o.id FROM '.$tables.' WHERE '.$conditions;
	return $query;
    }

    /**
     * Generate parameters array with given term.
     * 
     * @param string $term
     * @return array Parameters array
     */
    public function generateParamsArray($term) {
	$word = "%$term%";
	$params = array(
	    'type' => 'ssss', &$word, &$word, &$word, &$word,
	);
	if ($this->hasGTKeys) {
	    $params['type'] .= 'ddddisis';
	    $params = array_merge($params, array(&$this->swLat, &$this->swLon,
			&$this->neLat, &$this->neLon, &$this->enddateIsBC, &$this->end,
			&$this->startdateIsBC, &$this->start)
	    );
	}
	return $params;
    }

// end public function generateArray()
}

?>
