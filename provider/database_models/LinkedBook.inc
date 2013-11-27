<?php
namespace HyperCities\Provider\ItemManagement;

/**
 * Represents a book linked to an object.
 *
 * @author David Shepard
 * @copyright Copyright 2010, The Regents of the University of California
 */
class LinkedBook extends DatabaseModel {
	protected	$book = NULL,
				$userId = 0,
				$pageNo = '',
				$objectId = '';
	
	public function __construct($data) {
		if (is_array($data)) {
			$this->__construct_from_array($data);
		}
	}
	
	public function __construct_from_array (array $data) {
		assign_if_set($data, array(
			'id'	=> &$this->id,
			'user_id' => &$this->userId,
			'book_id' => &$this->book,
			'meta_linked_model' => &$this->book,
			'page_no' => &$this->pageNo,
			'pageNo' => &$this->pageNo,
			'object_id' => &$this->objectId,
		));
		if (isset($data['bookId'])) {
			$this->book = new Book($data);
		}
		$this->loaded = TRUE;
	}
	
	public function __get($name) {
		$returnable = null;
		switch ($name) {
			case 'objectId':
				$returnable = $this->objectId;
				break;
			case 'pageNo':
				$returnable = $this->pageNo;
				break;
			case 'book':
				$returnable = $this->book;
				break;
		}
		return $returnable;
	}
	
	protected function create () {
		$this->book->commit();
		$query = "INSERT INTO book_objects (book_id, object_id, page_no, user_id) "
				." VALUES (?, ?, ?, ?) ";
		$objectId = &$id;
		$params = array (
			'type' => 'sisi', &$this->book->id, &$this->objectId, &$this->pageNo,
			&$this->userId
		);
		$this->id = $this->writeQuery($query, $params);
	}
	
	public function commit($id) {
		if (!$this->id) {
			$this->objectId = $id;
			$this->create();
		}
	}

	protected function load() {
		
	}

	protected function update() {
		
	}
}

?>
