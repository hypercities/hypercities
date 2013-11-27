<?php
namespace HyperCities\Provider\Output;
/**
 * Class for managing database access to books.
 *
 * @author David Shepard
 * @copyright Copyright 2010, Regents of the University of California
 */
class Book extends Min {
	public $bookTitle = "",
			$coverUrl = "";
	
	public function __construct($book) {
		parent::__construct($book->id, NULL);
		$this->bookTitle = $book->title;
		$this->coverUrl = $book->coverUrl;
	}
}

class LinkedBook {
	public	$book = NULL,
			$pageNo = NULL;
	
	public function __construct ($bookmark) {
		$this->book = new Book($bookmark->book);
		$this->pageNo = $bookmark->pageNo;
	}
}

class BookRelatedCollectionResult extends Book {
	public $collections;
	
	public function __construct ($book) {
		parent::__construct($book);
		foreach ($book->relatedCollections as $collection) {
			$this->collections[] = array(
				'title' => $collection->title,
				'jsonLink' => get_base_url()."provider/collections/".$collection->id,
				'kmlLink' => get_base_url()."provider/collections/".$collection->id.".kml",
			);
		}
	}
}
?>
