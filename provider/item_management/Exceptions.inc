<?php

namespace HyperCities\Provider\ItemManagement;

use HyperCities\Provider\Exception;
use HyperCities\Provider\NotFoundError;

class BadRequestError extends Exception {
	public $type, $action;
	public function __construct ($type, $action, $message) {
		parent::__construct(400, $message);
		$this->type = $type;
		$this->action = $action;
	}
}

class InsufficientPrivileges extends Exception {
	public $object, $action;
	public function __construct ($object, $action, $message) {
		parent::__construct(401, $message);
		$this->object = $object;
		$this->action = $action;
	}
}

class ItemNotFound extends NotFoundError {
	public function __construct($message) {
		parent::__construct($message);
	}
}

class UpdateFailureException extends Exception {
	public $object;
	public function __construct($object, $message) {
		$this->object = $object;
		parent::__construct($message);
	}
}

?>