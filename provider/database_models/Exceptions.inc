<?php

namespace HyperCities\Provider\ItemManagement;
use HyperCities\Provider\Exception;

class MissingFieldException extends Exception {
    public $itemType, $missingFields;
    public function __construct ($itemType, array $missingFields) {
	parent::__construct (500, "MISSING_FIELDS");
	$this->itemType = $itemType;
	$this->missingFields = $missingFields;
    }
}

?>
