<?php

namespace HyperCities\Provider;

/**
 * Base HyperCities exception. These exceptions contain HTTP Response codes, and
 * are renderable by the webservice. All exceptions returned to the user should
 * be derived from this.
 *
 * @author David Shepard
 */
abstract class Exception extends \Exception {
    public $message;
    public $responseCode;

    public function __construct ($code, $message) {
	$this->responseCode = $code;
	$this->message = $message;
    }

	public function toXmlAt ($node) {
		return $node->createAndAppendTextNodes (array (
			'message' => $this->message,
			'responseCode' => $this->responseCode,
		));
	}
}

class SystemError extends Exception {
    public function __construct($message) {
	parent::__construct(500, $message);
    }
}

class DatabaseError extends SystemError {
    public function __construct($message) {
	parent::__construct($message);
    }
}

class RemoteConnectionFailure extends SystemError {
    public function __construct($message) {
	parent::__construct($message);
    }
}

class NotFoundError extends Exception {
    public $url;
    public function __construct($message) {
	parent::__construct(404, $message);
	$this->url = 'htpp://'.$_SERVER['HTTP_HOST'].'/'.$_GET['url'];
    }
}

class InvalidURL extends NotFoundError {
    public function __construct($message) {
	parent::__construct($message);
    }
}

class InvalidTarget extends NotFoundError {
    public function __construct($message) {
	parent::__construct($message);
    }
}

class Redirect {
    public  $url = '';
    public function __construct ($url) {
	//parent::__construct(302, "Redirect for authentication.");
	$this->url = $url;
    }
}

?>