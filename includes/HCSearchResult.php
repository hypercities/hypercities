<?php

/**
 * Represents an item returned by a search result.
 *
 * @author dshepard
 * @copyright Copyright 2009, The Regents of the University of California
 * @date 2009-08-01
 * 
 */
abstract class HCSearchResult implements IComparable {
    /**
     * Refers to the object.
     * @var mixed The object to which it refers
     */
    private $object;
    /**
     * The weight of this object, in particular.
     * @var integer
     */
    private $weight;
    private $foundTerms;
    /**
     * The weight of this object and all its children
     * @var integer
     */
    protected $totalWeight;

    protected $children;

    /**
     * Does this item have one or more "base" collections for an immediate ancestor?
     *
     * @var enum -- see CONSTS
     */
    protected $parentIsRoot = NULL;
    private static $userMyCollectionId;

    /**
     * An array of HCSearchAtoms found in the current object.
     *
     * @var array of HCSearchAtoms
     */
    private $hits = array();

    private $hitValues = array();

    protected function getValueOfTerm(HCSearchAtom $term) {
        return $this->hitValues[array_search($term, $this->hits)];
    }

    const TITLE_COEFFICIENT = 10;
    const DESCRIPTION_COEFFICIENT = 5;
    const CONTENT_COEFFICIENT = 1;

    private static $ITEM_TYPE_CLASS_RELATIONS = array (
            2 => 'HCCollection',
            3 => 'HCPlacemark',
            4 => 'HCPlacemark',
    );

    /**
     * Create search result of correct type (HCCollection or HCPlacemark), 
     * filling in fields from database.
     * 
     * @param int $id
     * @return HCPlacemark or HCCollection result as object.
     */
    public static function factory ($id) {
        if (is_numeric($id)) {
            // find type from database
            $db = database::getInstance();
            $db->query("SELECT id, object_type_id FROM objects WHERE id = $id");
            $row = $db->getRows();
            //if (!isset(self::$ITEM_TYPE_CLASS_RELATIONS[(int)$row[0]['object_type_id']]))
            //    return NULL;
            //throw new InvalidArgumentException("Item $id has invalid type -- $row[0][object_type_id].", NULL);
            $class = self::$ITEM_TYPE_CLASS_RELATIONS[(int)$row[0]['object_type_id']];
            return new $class($id);
            // return proper type
        } else { // If it's a complete record
            throw new InvalidArgumentException("Argument passed to HCSearchResult::factory () must be numeric. ", 0);
        }
    }

    /**
     * Build set of HCPlacemarks and HCCollections from array, inferring
     * correct type from $item['object_type_id'].
     * 
     * @param array $items Items to build
     * @return array Array of HCPlacemarks and HCCollections
     */
    public static function buildFromArray (array $items) {
        $newItems = array();
        //print_r ($items);
        foreach ($items as $item) {
            // Necessary because $className::methodName() fails in PHP
            switch ($item['object_type_id']) {
                case '2':
                    //array_push($newItems, HCCollection::buildFromArray($item));
                    $newItems[] = HCCollection::buildFromArray($item);
                    break;
                case '3':
                    array_push($newItems, HCPlacemark::buildFromArray($item));
                    break;
                case '4':
                    array_push($newItems, HCPlacemark::buildFromArray($item));
                    break;
            }
        }
        return $newItems;
    }

    public function __construct(&$object) {
        $this->object = &$object;
    }

    const DISPLAY_AT_ROOT = 1;
    const IS_CHILD_ONLY = 0;
    const IS_CHILD_AND_ROOT = 2;

    /**
     * Checks if thsi object's parent is a root collection, e.g. Public Collections.
     *
     * @return boolean
     */
    public function isParentRoot () {
        if ($this->parentIsRoot == NULL) {
            $db = database::getInstance();
            $db->query("SELECT object_id FROM object_relations WHERE subject_id = $this->id ");
            $rows = $db->getRows();
            $rootParents = array();
            // If this collection has no parents, it's a root collection, e.g. Public Collections
            if (count($rows) == 0) $this->parentIsRoot = self::DISPLAY_AT_ROOT;
            else {
                //$this->parentIsRoot = self::IS_CHILD_ONLY;
                foreach ($rows as $row) {
                    //print "Testing parentage of $this->id ... \n";
                    if (self::isCollectionRoot($row['object_id'])) array_push($rootParents, $row['object_id']);
                } // foreach ($rows as $row)
                if (count ($rootParents) == count($rows)) {
                    print "$this->id has ".count($rootParents)." root parents and ".count($rows)." total parents. It is therefore only a child.\n";
                    $this->parentIsRoot = self::IS_CHILD_ONLY;
                }
                else {
                    print "$this->id has ".count($rootParents)." root parents and ".count($rows)." total parents. It is therefore child and root.\n";
                    $this->parentIsRoot = self::IS_CHILD_AND_ROOT;
                }
                /*
                if (count($rows) > 1) {
                    if ($isParentRoot) {
                        $this->parentIsRoot = self::IS_CHILD_AND_ROOT;
                        //print "Yes, it's a child and a root";
                    }
                    else {
                        $this->parentIsRoot = self::IS_CHILD_ONLY;
                        //print "It's only a child;\n";
                    }
                } else {
                    $this->parentIsRoot = self::DISPLAY_AT_ROOT;
                } // end if (count($rows) > 1)
                 * 
                */
            } // end if (count($rows) == 0)
        } // end if ($this->parentIsRoot === NULL)
        return $this->parentIsRoot;
    } // end public function isParentRoot ()

    public function __get ($name) {
        switch ($name) {
            case 'weight':
                return $this->totalWeight;
                break;
            default:
                die ("Illegal access error for member $name on class HCSearchResult on ".$this->object->name);
        } // end switch ($name)
    }

    public function  __toString() {
        return "Object $this->name with id $this->id \n\n";
    }

    public function addHit (HCSearchAtom $term, $weight = 0) {
        $this->hits[] = $term;
        if ($weight == 0) $this->hitValues[count($this->hits) - 1] = $this->calculateWeightForAtom($term);
        else $this->hitValues[count($this->hits) - 1] = $weight;

        // Store to database
        /*
        $db = database::getInstance();
        $result = $db->query("SELECT weight FROM search_hits WHERE object_id = $this->id AND atom_id = $term->id ");
        $result = $db->getRows();
        if (count($result) > 0) {
            $db->query("UPDATE search_hits SET weight = $weight WHERE object_id = $this->id AND atom_id = $term->id ");
        } else {
            $db->query("INSERT INTO search_hits (weight, object_id, atom_id) VALUES($weight, $this->id, $term->id) ");
        }*/
    }

    /**
     * Calculates weight for search atom
     *
     * @param HCSearchAtom $atom 
     */
    public function calculateWeightForAtom (HCSearchAtom $atom) {
        //if (in_array($atom, $this->foundTerms)) return;
        //else {
        $null_array = array();
        $this->totalWeight += self::TITLE_COEFFICIENT * count(preg_match_all('/$atom->term/', $this->title, $nullArray));
        $this->totalWeight += self::DESCRIPTION_COEFFICIENT * count(preg_match_all('/$atom->term/', $this->description, $nullArray));
        $this->totalWeight += self::CONTENT_COEFFICIENT * count(preg_match_all('/$atom->term/', $this->content, $nullArray));
        //}
    }

    /**
     * Get weight of this result.
     */
    public function getTotalWeight () {
        if (count($this->children) != 0) {
            foreach ($this->children as $child) {
                $this->totalWeight += $child->getTotalWeight();
            }
        } else {
            $this->totalWeight = $this->weight;
        }
        return $this->totalWeight;
    }

    /**
     * Compare objects' weight.
     * 
     * @param self $a
     * @param self $b
     * @return {int} 0 if objects have equal weight; -1 if $a is lighter and 1
     *		     if $b is lighter
     */
    static function compare(self $a, self $b) {
        if ($a->weight == $b->weight) return 0;
        return ($a->weight < $b->weight) ? -1 : 1;
    }

    /**
     * Checks if a collection is a root collection, i.e. if it is "Public Collections,"
     * "Class Collections," or any other "base collection" we create.
     *
     * @param int $id Id of the collection to be created.
     * @return boolean True if the collection is a root; False if not.
     */
    public static function isCollectionRoot ($id) {
        if (!self::$userMyCollectionId) {
            if (!cServerSession::getUserCollectionId()) self::$userMyCollectionId = -2;
            else self::$userMyCollectionId = @cServerSession::getUserCollectionId();
        }
        if ($id == HC_PUBLIC_COLLECTIONS_ID || $id == self::$userMyCollectionId
                || $id == HC_3D_COLLECTIONS_ID || $id == HC_CLASSES_COLLECTIONS_ID
                || $id == HC_FEATURED_COLLECTIONS_ID || $id == HC_PARTNER_COLLECTIONS_ID
        ) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * Checks if object is root collection.
     *
     * @return boolean
     */
    public function isRoot () {
        $id = $this->id;
        if (!self::$userMyCollectionId) {
            if (!cServerSession::getUserCollectionId()) self::$userMyCollectionId = -2;
            else self::$userMyCollectionId = @cServerSession::getUserCollectionId();
        }
        if ($id == HC_PUBLIC_COLLECTIONS_ID || $id == self::$userMyCollectionId
                || $id == HC_3D_COLLECTIONS_ID || $id == HC_CLASSES_COLLECTIONS_ID
                || $id == HC_FEATURED_COLLECTIONS_ID || $id == HC_PARTNER_COLLECTIONS_ID
        ) {
            return true;
        }
        else {
            return false;
        }
    }
}

/**
 * Allows comparing objects. Based on Java's Comparable interface.
 *
 */
interface IComparable {
    static function compare(self $a, self $b);
}
?>
