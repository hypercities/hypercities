<?php
include_once("includes/connect_db.inc");
include_once("includes/dbUtil.inc");
include_once("includes/util.inc");
include_once("includes/serverSession.inc");

/**
 * The bookmarks class
 * 
 * @copyright Copyright 2009, The Regents of the University of California
 */
class cBookmark {
	private $objectId, $bookmarks;
	
	/**
	 * Constructor overloading
	 */
	private function __callConstruct($name, $arg){
		return call_user_func_array(array($this, $name), $arg);
	}

	public function __construct()
	{
		$num = func_num_args();
		$args = func_get_args();
		
		switch($num)
		{
			case 1:
			$this->__callConstruct('__construct1', $args);
			break;
			default:
			throw new Exception();
		}
	}

	private function __construct1($objectId)
	{
		$this->objectId = $objectId;
		$this->getBookmarksById($objectId);
	}
	
	public function getBookmarksById($objectId) {

		$query = "SELECT BO.id, BO.book_id, BO.page_no, B.title, B.cover_url FROM book_objects
			as BO, books as B WHERE BO.object_id = $objectId AND BO.book_id = B.book_id";
		$result = sqlCommand($query);
		$this->bookmarks = array();
		foreach ($result as $row) {
			$this->bookmarks[] = array('book_id' => $row['book_id'], 'page_no' =>
				$row['page_no'], 'title' => $row['title'], 'cover_url' => urlencode($row['cover_url']));
		}

		return;
	}

	public function getBookmarks() {
		return $this->bookmarks;
	}
}
?>
