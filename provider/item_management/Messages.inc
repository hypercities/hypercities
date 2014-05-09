<?php

namespace HyperCities\Provider\ItemManagement;
use HyperCities\Provider\Message;


class CreatedMessage extends Message {
	public $type, $id;

	public function __construct ($type, $message, $id) {
		parent::__construct(201, $message);
		$this->type = $type;
		$this->id = $id;
	}

	public function toXmlAt ($node) {
		$baseNode = parent::toXMLAt($node);
		$baseNode->createAndAppendTextNodes (array (
			'type'	=> $this->type,
			'id'	=> $this->id
		));
	}
}

class ChangedMessage extends Message {
	public $type, $action;

	public function __construct ($type, $action, $message) {
		parent::__construct(202, $message);
		$this->type = $type;
		$this->action = $action;
	}
}

class OrderUpdatedMessage extends Message {
	public $type, $id;

	public function __construct ($id, $message) {
		$this->id = $id;
	}
}

?>