<?php

namespace HyperCities\Provider\ItemManagement;

use HyperCities\Provider\ItemManagement\BadRequestError;
use HyperCities\Provider\Authentication\User;
use \database;
use \DateTimeZone, \DateTime;
use \KmlParser;
use HyperCities\Provider\Log;

class Book extends DatabaseModel {

	public	$title = "",
			$coverUrl = "",
			$id = NULL,
			$book_id,
			$g_book_id,
			$relatedCollections = array(),
			$urls = array();

	protected	$itemName = 'book';

	public function __construct ($data = NULL, $id = NULL) {
		//$this->requiredFields = array('title', 'book_id', 'g_book_id', 'urls');
//		$this->requiredFields = array('book_id');
		if ($data instanceof \DOMDocument) {
			$this->__construct_from_kml($data);
			return;
		} else {
			parent::__construct($data);
			if (is_array($data)) {
				$this->__construct_from_array($data);
			} elseif (is_null($data)) {
				// implicitly return blank object
			}
		}
	}

	protected function __construct_from_id($id, $loadNow = false) {
		parent::__construct_from_id($id, $loadNow);
		$this->book_id = $id;
	}

	protected function __construct_from_array(array $data) {
		if (isset($data['bookId'])) $data['id'] = $data['bookId'];
		parent::__construct_from_array($data);
		if (isset($data['title']))
			$this->title = stripslashes($data['title']);
		if (isset($data['bookTitle'])) $this->title = $data['bookTitle'];
		elseif (isset($data['book_id'])) {
			$this->book_id = stripslashes($data['book_id']);
			$this->id = stripslashes($data['book_id']);
		}
		if (isset($data['googleId'])) {
			$this->book_id = $data['googleId'];
			$this->id = $data['googleId'];
		}
		if (isset($data['g_book_id'])) {
			$this->book_id = $data['g_book_id'];
			$this->id = $data['g_book_id'];
		}
		if (isset($data['urls']))
			$this->owner = $data['owner'];
		// Set $loaded to prevent it from loading again
		if (isset($data['coverUrl'])) {
			$this->coverUrl = $data['coverUrl'];
		}
		if (isset($data['cover_url'])) {
			$this->coverUrl = $data['cover_url'];
		}
		$this->loaded = TRUE;
	}

	protected function load() {
		// TODO: implement
	}

	public function prepare() {
		$this->load();
	}

	protected function create() {
		$this->validateRequiredFields();
		$query = "INSERT INTO books(book_id, title, cover_url, created_at, updated_at) VALUES(?, ?, ?, NOW(), NOW())";
		$this->writeQuery($query, array('type' => 'sss', &$this->id, &$this->title, &$this->coverUrl));
		$this->isDirty = FALSE;
	}

	protected function update() {
		// TODO: implement
	}

	public function delete() {
		// TODO: implement
	}
	
	public function commit() {
		if ($this->isDirty !== FALSE) {
			$result = $this->query("SELECT book_id FROM books WHERE book_id = ?", 
					array('type' => 's', &$this->book_id));
			if (count($result) == 0) {
				$this->create();
			} else {
				$this->isDirty = FALSE;
			}
		}
	}
	
	public function addRelatedCollection($collection) {
		$this->relatedCollections[] = $collection;
	}
}

?>
