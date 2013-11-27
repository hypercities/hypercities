<?php

namespace HyperCities\Provider;

/**
 * Base class for messages to be returned to user, which do not result in abnormal
 * termination of program flow.
 *
 * @author David Shepard
 */
abstract class Message {
    protected $responseCode, $description;

    public function __construct ($messageCode, $message) {
        $this->responseCode = $messageCode;
        $this->description = $message;
    }

    public function toXMLAt ($node) {
        //self::$domDoc->addMessage ($this->type, $this->code, $this->description);
        $message = $node->createAndAppendNode("Message");
        $message->createAndAppendTextNodes (array(
                'type' => $this->responseCode,
                'description' => $this->description
            ));
        return $message;
    }

    public function getData () {
        return array('description' => $this->description, 'type' => $this->responseCode);
    }

    public function __get ($name) {
	switch ($name) {
	    case 'responseCode':
		return $this->responseCode;
		break;
	    case 'description':
		return $this->description;
		break;
	}
    }
}
?>