<?php

namespace HyperCities\Provider\Authentication;

/**
 * Represents a set of permissions related to an object.
 *
 * @author David Shepard
 */
class PermissionSet {
	public $addTo, $edit, $view;

	public function __construct ($data = NULL) {
		if ($data) {
			foreach (array ("addTo", "edit", "view", "delete") as $perm) {
				if (array_search($perm, $data) !== FALSE) {
					$this->$perm = TRUE;
				}
			}
		}
	}

	public function __get ($name) {
		if ($this->$name) return true;
		else return false;
	}
}
?>