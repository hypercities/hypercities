<?php

namespace HyperCities\Provider\ItemManagement;

class MethodNotImplementedException extends HyperCities\Provider\Exception {
	public function __construct($message = "Method not implemented") {
		parent::__construct(500, $message);
	}
}

?>
