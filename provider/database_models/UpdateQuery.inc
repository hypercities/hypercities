<?php

/**
 * Represents an UPDATE query in SQL.
 *
 * @author David Shepard
 * @copyright Copyright 2010, The Regents of the University of California
 */

namespace HyperCities\Provider\ItemManagement;

class UpdateQuery {
	private $allowedValues = array(),
		$columnCorrespondences = array(),
		$valueTypes = array(),
		$values = array(),
		$tables = array();

	public function __construct () {

	}

	public function setAllowedValue ($value, $column, $type) {
		$this->allowedValues[] = $value;
		$this->columnCorrespondences[$value] = $column;
		$this->valueTypes[$value] = $type;
	}

	public function addTable ($table) {
	    if (!\in_array($table, $this->tables)) {
		$this->tables[] = $table;
	    }
	}

	public function setValues (array $values) {
		foreach ($this->allowedValues as $value) {
			if (isset($values[$value]) && $values[$value]) {
				$this->values[$value] = &$values[$value];
			}
		}
	}

	public function getQuery () {
		$keys = array();
		foreach (array_keys($this->values) as $key) {
			$keys[] = $this->columnCorrespondences[$key] ." = ? ";
		}
		return implode (", ", $keys);
	}

	public function getValueTypes () {
		$types = '';
		foreach ($this->values as $key => $value) {
			$types .= $this->valueTypes[$key];
		}
		return $types;
	}

	public function getParameters () {
		return array_values ($this->values);
	}
}
?>
