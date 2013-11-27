<?php

/**
 * Represents a search term in memory
 *
 * @author    David Shepard
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-08-01
 * @version   $Id$
 *
 */

class HCSearchAtom {
    public $term;
    private $weight;
    private $id;
    static $request;
    /**
     * Is it in the database already, and has it already been searched for?
     * 
     * @var Boolean
     */
    private $indexed;

    /**
     *
     * @param String $term -- Name of the term as a string
     * @param HCRequest child $request Subclass of the term
     */
    public function  __construct($term, $request = NULL) {
        if (is_subclass_of($request, 'HCSearchRequest') || is_a($request, 'HCSearchRequest')) {
            //self::$request = $request;
            self::$request = HCSearchEngine::$request;
        } else {
            if (!(is_null($request)))
                die ("Invalid request passed to HCSearchAtom::__construct() with term $term. Request type was ".get_class($request));
        }
        $this->term = $term;
        // TODO: Implement search indexing
        $db = database::getInstance();
        $result = $db->preparedQuery("SELECT id FROM search_atoms WHERE name = ? ",
            array ('type'=> 's', &$term)
        );
        //print_r ($db->preparedGetRows());
        $result = $db->preparedGetRows();
        if (count($result) > 0) {
            //$result = $db->preparedGetRows();
            $this->id = $result[0]['id'];
            $db->query("UPDATE search_atoms SET last_searched_for = NOW() WHERE id = $this->id");
            //$this->indexed = TRUE;
        } else {
            //print "Result not in DB. Getting dates.";
            $result = $db->preparedQuery ("INSERT INTO search_atoms (name, added_at, last_searched_for)"
                . " VALUES (?, NOW(), NOW())",
                array ('type' => 's', &$term)
            );
            $this->id = $db->insertId();
            //print 'Item search id: '.$this->id;
            $this->indexed = FALSE;
        }
        return;
        
    } // end public function  __construct($term)

    /**
     * If the term has been indexed in the database, just get the results from
     * the database.
     * Otherwise, do the standard query.
     *
     * @return array Array of ids of hits, which should be processed by HCSearchResultsDocument into objects
     */
    public function doSearch() {
        $db = database::getInstance();
        // if there are results in the database
        if ($this->indexed == TRUE) {
            print "Doing indexed search for term $this->term";
            $result = $db->preparedQuery ("SELECT object_id, weight FROM search_hits WHERE atom_id = $this->id");
            if ($result) {
                return $db->getRows();
            }
        } else { // If it is not indexed, do REGEX search
           //print "Doing unindexed search for term $this->term";
           $result = $db->preparedQuery(self::$request->generateQuery(), self::$request->generateParamsArray($this->term));
            if (!$result) {
                echo $db->getError();
            } else {
                $result = $db->preparedGetRows();
                if (count($result) > 500) {
                    throw new HCSearchResultLimitExceeded($this->term);
                }
                //print 'Getting '.count($result).' rows';
                // Add to database
                /*foreach ($result as $row) {
                    $weight = 0;
                    $db->query("SELECT o.title, o.description, c.contents FROM objects o, contents c WHERE id = $row[id]");
                    $item = $db->getRows();

                    $db->query("INSERT INTO search_hits (atom_id, object_id, weight) VALUES ($this->id, $row[id], $this->calculateWeight) ");
                }*/
            }
            //$result = $db->preparedGetRows();
        }
        return $result;
    } // end public function doSearch()
    /**
     * Add search term hit for object
     * @param mixed $id Object id
     * @param mixed $weight Weight to add
     */
    public function addHit ($id, $weight = 1) {
      // If $id is array, iterate over each of these
      if (is_array($id)) {
	foreach ($id as $i) $this->addHit ($i);
	return;
      } // end if is_array
      // otherwise, index it
      $db = database::getInstance();
      $result = $db->query ("INSERT INTO search_hits (atom_id, object_id, weight) VALUES ($this->id, $id, $weight)");
      if (!$result) throw new DatabaseFailureException("Indexing item.");
    } // end public function addResult
}

?>
