<?php

namespace HyperCities\Provider\Authentication;

use HyperCities\Provider\Message;

class AuthenticationSucceeded extends Message {
    private $sessionKey;
    public function __construct ($sessionkey) {
        parent::__construct ("AUTHENTICATION_SUCCESSFUL",
		"Authentication was successful. Your session token is below.");
        $this->sessionKey = $sessionkey;
    }

    public function getData () {
        $array = parent::getData();
        $array['token'] = $this->sessionKey;
    }
    public function toXMLAt ($node) {
        $message = parent::toXML($node);
        $message->createAndAppendTextNode ('token', $this->sessionKey);
        return $message;
    }
}
?>