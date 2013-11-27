<?php

namespace HyperCities\Provider\ItemManagement;

/**
 * Represents a SQL SELECT query. This assists with constructing dynamic SQL
 * queries with variable numbers of arguments. Used in DataStore instances.
 *
 * @author dshepard
 * @copyright Copyright 2010, The Regents of the University of California
 */
class SelectQuery {

    public $fields = array(), $itemTable;
    private $tables = array(),
			$conditions = array(),
			$order = array();
    private $parameters = array('type' => '');

	private static $function_mappings = array (
		'addConditions'	=> 'conditions',
		'addFields'		=> 'fields',
		'addTables'		=> 'tables',
		'addOrders'		=> 'order',
	);

    public function __construct() {

    }

    public function __toString() {
        $string = 'SELECT ' . implode(', ', $this->fields) . ' FROM ' . implode(', ', $this->tables);
        if ($this->conditions)
            $string .= ' WHERE ' . implode(' ', $this->conditions);
        if ($this->order)
            $string .= ' ORDER BY ' . implode(', ', $this->order);
        return $string;
    }

    public function addTable($table) {
        $tables = func_get_args();
        foreach ($tables as $table) {
            if (!in_array($table, $this->tables)) {
                $this->tables[] = $table;
            }
        }
    }

    public function addCondition($condition) {
        $this->conditions[] = $condition;
    }

	public function  __call ($name, $arguments) {
		/**
		 * Handles adding data, i.e. addFields, addTables, addConditions, addOrders
		 */
		if (strpos($name, 'add') === 0) {
			if (!isset(self::$function_mappings[$name])) {
				die ("Attempted to call undefined method SelectQuery::$name");
			}
			$array = &$this->{self::$function_mappings[$name]};
			foreach ($arguments as $arg) {
				if (!in_array($arg, $array)) $array[] = $arg;
			}
			return;
		}
	}

	public function addOrder ($parameter) {
		if (array_search($parameter, $this->order) === FALSE) $this->order[] = $parameter;
	}

    public function addParameter(&$parameter, $type = 's') {
        $this->parameters['type'] .= $type;
        $this->parameters[] = &$parameter;
    }


    /*public function addFields($field) {
        foreach (func_get_args () as $field) {
            if (!in_array($field, $this->fields))
                $this->fields[] = $field;
        }
    }*/

}

?>
