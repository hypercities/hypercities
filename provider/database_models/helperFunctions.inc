<?php

namespace HyperCities\Provider\ItemManagement;

function assign_if_set ($data, $assignments) {
	foreach ($assignments as $k => &$v) {
		if (isset($data[$k])) {
			$v = $data[$k];
		}
	}
}

function get_first_existent_key(array $keys, array $values) {
	foreach ($keys as $key) {
		if (isset($values[$key])) return $values[$key];
	}
}

?>
