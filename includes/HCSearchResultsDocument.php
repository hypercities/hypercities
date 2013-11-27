<?php

/**
 * Result from a search. Begins life as a flat collection of objects and collections.
 * This data glob converts itself into a well-formed KML document, suitable for being
 * interpreted on the client end into the Collection List.
 *
 * @author David Shepard
 * @copyright Copyright 2009, The Regents of the University of California
 * @date 2009-08-01
 */
class HCSearchResultsDocument {
    /**
     * This will eventually be an array of the search terms entered, broken down
     * into words. For now, version 1.0, it's a single HCSearchAtom with the whole
     * string.
     * 
     * @var array
     */
    private $terms;
    /**
     * A flat list of all objects and collections. Structure is maintained by traversing
     * each collection to find its children, or even if it is meant to be displayed.
     * @var array
     */
    private $objects = array();
    /**
     * A flat list of the results returned by the query. These are all added each time
     * there is a hit. To generate the document, traverse from these downwards.
     * @var array
     */
    private $results = array();

    private $mapping;

    public static $otherUsersMyCollections;

    /**
     * Add terms into document.
     * 
     * @param array $terms Array of terms.
     */
    public function __construct ($terms) {
        if (is_a($terms, "HCSearchRequest")) {
            $this->terms[] = new HCSearchAtom($terms->keywords, HCSearchEngine::$request);
            /*foreach (explode(' ', $terms->keywords) as $term) {
                $this->terms[] = new HCSearchAtom ($term);
            }*/
        } else {
            $this->terms[] = new HCSearchAtom($terms);

            /*foreach (explode(' ', $terms) as $term) {
                $this->terms[] = new HCSearchAtom($term);
            }*/
        }

        $mapping = new HCMapping();

    	$db = database::getInstance();
    	$query = "SELECT id FROM objects WHERE title = 'My Collections'";
        // If the user is not logged in, this function always throws several warnings,
        // so it's important to suppress warnings from it.
    	if (@cServerSession::getUserCollectionId()) {
            $query .= " AND id != ".cServerSession::getUserCollectionId();
        }
        //print_r ($db->query($query)->num_rows);
        $result = $db->query($query);
    	if ($result || count ($result) > 0) {
            
            $result = $db->getRows();
        } else {
            print "Could not get users' My Collections.".$db->getError();
        }
    	foreach ($result as $row) {
    		self::$otherUsersMyCollections[] = $row['id'];
    	}
    }

    /**
     * Do searches with given terms.
     */
    public function doSearches () {
        //print_r ($this->terms);
        
        foreach ($this->terms as $term) {
            $results = $term->doSearch();
            foreach ($results as $result) {
                $this->addItemAndParents($result);//, $term);
            } // end foreach ($results as $result)
        } // end foreach ($this->terms as $term)
    }

    /**
     * Add given item and all its parents to the doucment, all the way up to
     * the root.
     * 
     * @param HCCollection or HCPlacemark $item 
     */
    public function addItemAndParents ($item) {
        // If this is a record from the database, meaning it's already indexed,
        // we do the construction here
        if (is_array ($item)) {
            if (in_array($item['id'], self::$otherUsersMyCollections)) return;
            $itemId = $item['id'];
            // build new search result, linking it to this term
            if (!array_key_exists($itemId, $this->objects)) {
                $itemObject = $this->objects[$itemId] = HCSearchResult::factory($itemId);
            } else {
                $itemObject = &$this->objects[$itemId];
            }
            //$itemObject->addHit ($itemObject, $item['weight']);
            if ((HCCollection::isCollectionRoot($itemId))) return;
            // get parent from database
            $query = "SELECT object_id FROM object_relations WHERE subject_id ="
		    ." $itemId AND object_id NOT IN ("
		    .implode(', ', self::$otherUsersMyCollections).")";
            //print "Getting parents of item $itemId";
            $db = database::getInstance();
            $db->query($query);
            $result = $db->getRows();
            // add each parent as parent of the assigned object
            foreach ($result as $row) {
                // If it's not a root collection, add it as a parent.
                //if ((!HCCollection::isCollectionRoot($row['object_id'])) && (!in_array($row['object_id'], self::$otherUsersMyCollections))) {
                if ($row['object_id'] != 0) {
                    $this->addItemAndParents($row['object_id']);
                    $this->objects[$row['object_id']]->addChild($itemObject);
                }
            } // end foreach ($result as $row)
        } else { /* TODO: The following will probably never be used, so delete it. */
            if (in_array($item, self::$otherUsersMyCollections)) return;
            if (!array_key_exists($item, $this->objects)) {
                $newItem = HCSearchResult::factory($item);
                if ($newItem != NULL)
                    $itemObject = $this->objects[$item] = $newItem;
                else return;
                //$itemObject = $this->objects[$item] = HCSearchResult::factory($item);
            } else {
                $itemObject = &$this->objects[$item];
            }
            // If it's a root collection, return
            //if ((HCCollection::isCollectionRoot($item)) || (in_array($item, self::$otherUsersMyCollections))) return;
            if ((HCCollection::isCollectionRoot($item))) return;
            // get parent from database
            $query = "SELECT object_id FROM object_relations WHERE subject_id ="
		    ." $item AND object_id NOT IN ("
		    .implode(', ', self::$otherUsersMyCollections).")";
            //print $query;
            $db = database::getInstance();
            $db->query($query);
            $result = $db->getRows();
            //$result = $db->getRows();
            // add each parent as parent of the assigned object
            //print_r ($result);
            foreach ($result as $row) {
                // If it's not a root collection, add it as a parent.
                //print "Can we add collection $row[object_id] as parent of $item ? \n";
                //if ((!HCCollection::isCollectionRoot($row['object_id'])) && (!in_array($row['object_id'], self::$otherUsersMyCollections))) {
                if ($row['object_id'] != 0) {
                    $this->addItemAndParents($row['object_id']);
                    $this->objects[$row['object_id']]->addChild($itemObject);
                }
            } // end foreach ($result as $row)
        }
    } // end public function addItemAndParents ($item)

    /**
     * Calculate weight of each result and then sort them, using HCSearchResult::
     * compare.
     */
    private function sortResults() {
        // Step 1: Calculate total weight
        foreach ($this->objects as $object) {
            foreach ($this->terms as $term) {
                $object->calculateWeightForAtom($term);
            }
        }
        // Step 2: Find objects' total weight
        foreach ($this->objects as $object) {
            if ($object->isParentRoot()) {
                array_push($this->results, $object);
                $object->calculateTotalWeight();
            }
        }
        usort($this->results, array('HCSearchResult', 'compare'));
    }

    /**
     * Calculate total bounds of objects in document.
     */
    private function calculateBounds () {
        // Calculate bounds of all objects
        $this->mapping;
    }

    /**
     * Extends bounds of document using given bounds.
     * 
     * @param HCMapping $bounds 
     */
    private function addBounds (HCMapping $bounds) {
        if ($this->mapping) {
            $this->mapping->expandBounds($bounds);
        } else {
            $this->mapping = $bounds;
        }
    }

    /**
     * Returns response as KML.
     */
    public function buildResponse() {
        //ksort($this->objects);
        // Build document root
        $response = new HCKmlDocWrapper();
        
        foreach ($this->objects as $object) {
            if ($object->isRoot()) {
                $this->addBounds($object->mappings);
                $object->toXMLAt($response->docNode);
            } else {
                //print "is not root";
            }
        }
        $response->docNode->createAndAppendTextNode('bounds',
		    $this->mapping->getBoundingBox());
        $timespan = $response->docNode->createAndAppendNode('TimeSpan');
        $timespan->createAndAppendTextNodes(array(
            'start' => $this->mapping->getStart()->format("Y"),
            'end'   => $this->mapping->getEnd()->format("Y")
        ));
        return $response;
    }
    
    /**
     * Gets all of a collection's parents. This is a recursive function. It
     * stops when it hits a root collection, as defined in
     * HCCollection::isCollectionRoot().
     * TODO: Figure out way of determining a user's My Collections.
     *
     */
    public function getCollectionParents ($id) {
        // get parent from database
        $query = "SELECT object_id FROM object_relations WHERE subject_id = $id";
        $result = $db->query($query);
        // $result = $db->getRows();
        // add each parent as parent of the assigned object
        foreach ($result as $row) {
            $this->addItemAsParentOf($id, $row['object_id']);
            if (!HCCollection::isCollectionRoot($row['object_id'])) {
                    getCollectionParents($row['object_id']);
            }
        }
    }
}
?>