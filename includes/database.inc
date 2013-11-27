<?php
// vim: ts=4:sw=4:fdc=2:nu:nospell

/**
 * @file
 * HyperCities database management singleton.
 *
 * Provides database connection and query wrappers.
 *
 * @author    HyperCities Tech Team
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-04-30
 * @version   $Id$
 *
 */

include_once("includes/util.inc");

/**
 * The MissingResultException class
 * It is used to handle missing result exception
 */
class MissingResultException extends Exception {
    public function __construct ($message) {
        parent::__construct($message, 10);
    }
}

/**
 * The database class
 * Usage:
 * $conn = database::getInstance();
 * $conn->query("SELECT id, name FROM cities");
 * var_dump($conn->numRows());
 * var_dump($conn->getRows());
 */

class database {

	// Allows single database connection
	private static $instance = false;
	private $connection,
			// Queries which have been executed and then "saved for later"
			$queryCache,
			// Data which has been prepared and then "saved for later"
			$dataCache = array(),
			// Result of the last query
			$result,
			// Prepare Statement
			$stmt;

	/**
	 * Construct the object
	 * Initialize the database connections
	 */
	private function __construct() {

		$connection = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

		// The "official" OO way was broken until PHP 5.2.9 and 5.3.0.
		// Use mysqli_connect_error() instead of $connection->connect_error to ensure
		// compatibility with PHP versions prior to 5.2.9 and 5.3.0.
		if (mysqli_connect_error()) {
			HC_errorLog('Database Connect Error (' . mysqli_connect_errno() . ') '
				. mysqli_connect_error());
		} else {
			$connection->set_charset("utf8");
			$this->connection = $connection;
		}
	}

	/**
	 * Takes array of bind parameters and binds them 
	 * to result of executed prepared stmt
	 */
    private function bindParameters(&$stmt, &$bind_params) {

		if (!is_array($bind_params[0])) {
			$funcArg = $bind_params;
		} else {
			$funcArg['type'] = "";
			foreach($bind_params as $params) {
				$funcArg['type'] .= $params[1];
				$funcArg[] = $params[0];
			}
		}
        return call_user_func_array(array($stmt, 'bind_param'), $funcArg);
    }

	/**
	 * Binds variables to a prepared statement for result storage
	 * @param Object $stmt: A statement identifier returned by
	 *						mysqli_stmt_init().
	 * @param Object $row: The variable to be bound.
	 * @return Boolean: TRUE on success or FALSE on failure.
	 */
	private function bindResults(&$stmt, &$row) {

        $metadata = $stmt->result_metadata();
		$fields = array();

        while ($field = $metadata->fetch_field()) {
            $fields[] = &$row[$field->name];
		}

        return call_user_func_array(array($stmt, 'bind_result'), $fields);
	}

	/**
	 * Get or create singleton instance
	 * @return Hypercities database instance
	 */
	public static function getInstance() {

		if (!self::$instance) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Execute the sql query 
	 * @param String the sql statement to execute
	 * @return result set of query
	 */	 
	public function query($sql) {

		$this->queryCache = $sql;
		$signature = md5($sql);

		if (array_key_exists($signature, $this->dataCache)) {
			$result = $this->dataCache[$signature];
		} else {
			$result = @$this->connection->query($sql);
			$this->dataCache[$signature] = $this->result = $result;
		}

		return $result;
	}

	/**
	 * Execute the prepared sql query 
	 * @param String query: the sql statement to execute
	 * @param array($val=>'i', $val=>'d', etc...)
	 * @return result set of query
	 */	 
    public function preparedQuery($query, $params)
    {
		$this->stmt = $this->connection->stmt_init();
		if ( $this->stmt->prepare($query) === false ) {
			HC_errorLog('Statement Prepare Error (' .  $this->stmt->errno . ') '
					. $this->stmt->error);
		} 
		else {

			$this->bindParameters($this->stmt, $params);

	        if ($this->stmt->execute()) {
				return $this->stmt;
	        } else {
				HC_errorLog('Statement Query Error (' . mysqli_connect_errno() . ') '
							. mysqli_connect_error());
	        }
		}
    }

	/**
	 * Return query result as associative array
	 * @param Object $stmt: the query statement
	 * @param Object $row: the returned query result
	 * @return array: the query result
	 */
	public function preparedGetRows() {
		
		$this->bindResults($this->stmt, $row);

		$result = array();
		while ($this->stmt->fetch()) {
			foreach($row as $key => $val) {
				$c[$key] = $val;
			}
			$result[] = $c;
		}
   
		$this->stmt->close();
		while($this->connection->next_result()) { } 
		return $result;
	}

	/**
	 * Get the rows from the most recently executed query
	 * @return array
	 */
	public function getRows() {

		/* fetch associative array */
		$assocRows = array();
                if (!is_object($this->result)) {
                    throw new MissingResultException("Getrows() called before query done.");
                }
		while ($row = $this->result->fetch_assoc()) {
			$assocRows[] = $row;
		}

		return $assocRows;
	}

	/**
	 * Gets the number of rows from the previous query
	 * @return int the number of rows
	 */
	public function numRows() {
		return $this->result->num_rows;
	}

	/**
	 * Gets the number of affected rows from the previous query
	 * @return int the number of affected rows
	 */
	public function affectedRows() {
		return $this->connection->affected_rows;
	}

	/**
	 * Gets the last insert Id from the previous query
	 * @return int the last insert Id
	 */
	public function insertId() {
		return $this->connection->insert_id;
	}

	/**
	 * Gets the error string from the previous query
	 * @return string of error number and message
	 */
	public function getError() {
		return 'Database Query Error (' . @$this->connection->errno . ') '
				. @$this->connection->error . "\n" . $this->queryCache;
	}

	/**
	 * Sanitize data
	 * @param String the data to be sanitized
	 * @return String the sanitized data
	 */
	public function sanitizeData($data) {
		return $this->connection->real_escape_string(trim($data));
	}

	/**
	 * Deconstruct the object
	 * close all of the database connections
	 */
	public function __deconstruct() {
		$this->connection->close();
	}
}
?>
