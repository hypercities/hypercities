<?php

namespace HyperCities\Provider\Authentication;

use HyperCities\Provider\Exception;

class InsufficientPrivileges extends Exception {
    public function __construct ($message) {
	parent::__construct(401, $message);
    }
}

abstract class AuthFailure extends Exception {
    public function __construct ($message) {
	parent::__construct(403, $message);
    }
}

class AuthenticationError extends AuthFailure {
    public function __construct($message) {
	parent::__construct($message);
    }
}

class UserNotAuthenticated extends AuthFailure {
    public function __construct ($message) {
	parent::__construct($message);
    }
}

class UserNotFound extends AuthFailure {
    public function __construct($message) {
	parent::__construct($message);
    }
}
?>