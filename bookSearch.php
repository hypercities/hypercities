<?php

$startIndex = 1;
$maxResults = 20;

function throw_error($message) {
	die(json_encode(array("message" => $message)));
}

if (isset($_GET['startIndex'])) $startIndex = $_GET['startIndex'];
if (isset($_GET['keyword'])) {
	$keyword = urlencode('"' . $_GET['keyword'] . '"');
} else {
	throw_error("Keyword not found");
}

$url = "http://www.google.com/books/feeds/volumes?q=$keyword&min-viewability=partial&start-index=$startIndex&max-results=$maxResults";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
$result = curl_exec($ch);

$doc = simplexml_load_string($result);

$results = array();

//print_r ($doc);

class BookSearchResult {
	public $id, $title, $author;

	public function __construct ($id, $title, $author) {
		$this->id = $id;
		$this->title = $title;
		$this->author = $author;
	}
}

foreach ($doc->entry as $entry) {
	//print_r ($entry);
	//die();
	$results[] = array (
		"id"	=> (string)$entry->id,
		"title" => (string)$entry->title,
		"thumbnail" => (string)$entry->link[0]->attributes()->href,
		//"author" => $entry->{"dc:creator"}
		"author" => array_map(function ($author) {
			return (string)$author;
		}, $entry->xpath("dc:creator"))
	);
	//$results[] = new BookSearchResult($entry->id[0], $entry->title[0],$entry->{"dc:creator"});
}

$results = array (
	"results" => $results
);

//echo json_encode($results, JSON_FORCE_OBJECT);
echo json_encode($results);


?>
