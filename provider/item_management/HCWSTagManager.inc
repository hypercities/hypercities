<?php


/**
 * Manages tags for objects
 *
 * @author David
 */
class HCWSTagManager extends HCWSItemManager {
    private static $terms = array();
    public static function getTag ($tag) {
        if (array_key_exists($tag, self::$terms)) {
            return self::$terms[$tag];
        } else {
            return self::$terms[$tag] = new Tag($tag);
        }
        /*
        $result = $db->preparedQuery("SELECT id FROM tags WHERE name = ?", array('type' => 's', $tag) );
        if (!$result || $db->numRows() == 0) {
            $db->preparedQuery("INSERT INTO tags (name, created_at, updated_at) VALUES (?, NOW(), NOW())", array('type' => 's', $tag) );
        }
         *
         */
    }

    
}

class Tag {
    private $name, $id;

    public function __construct ($term) {
        $db = database::getInstance();
        if (is_numeric($term)) {
            $db->preparedQuery("SELECT name FROM tags WHERE id = ?", array('type' => 'i', $term) );
            $result = $db->preparedGetRows();
            $this->name = $result[0]['name'];
            $this->id = $term;
        } else {
            $this->name = $term;
            $db->preparedQuery("SELECT id FROM tags WHERE name = ?", array('type' => 's', $term) );
            //print_r ($result);
            $result = $db->preparedGetRows();
            //if (!$result || $db->numRows() == 0) {
            if (!$result || count($result) == 0) {
                //print "Adding term ... ".$term;
                $db->preparedQuery("INSERT INTO tags (name, created_at, updated_at) VALUES (?, NOW(), NOW())", array('type' => 's', $term) );
                $this->id = $db->insertId();
                //print "insert ID: $this->id";
            } else {
                $this->id = $result[0]['id'];
            }
        }
    }

    public function __get ($name) {
        switch ($name) {
            case 'name':
                return $this->name;
                break;
            case 'id':
                return $this->id;
                break;
        }
    }

    public function __toString() {
        return $this->name;
    }

    public function tagObject ($objectId) {
        $db = database::getInstance();
        $result = $db->query("INSERT INTO objects_tags (tag_id, object_id, created_at, updated_at) VALUES($this->id, $objectId, NOW(), NOW())");
    }
}

?>