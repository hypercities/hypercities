<?php

/** 
 * Mysql Exception Class
 * Currently no special functions are added in this class.
 * It is only used to capture mysql exceptions.
 * 
 * @copyright Copyright 2009 The Regents of the University of California
 * @date 2009-08-01
 */
class MysqlException extends Exception
{
	public function __construct($message = null, $code = 0) {
		parent::__construct($message, $code);
	}

	// custom string representation of object
	public function __toString() {
		return parent::__toString(); 
	}
}
?>
