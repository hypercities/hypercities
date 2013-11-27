<?php

namespace HyperCities\Provider\ItemManagement;

use HyperCities\Provider\Log;
use \database;

/**
 * Description of Content
 *
 * @author David Shepard
 * @copyright Copyright 2010, Regents of the University of California
 */
class Content extends DatabaseModel {

	private $text,
			$textContent,
			$objectId;

	public function __construct($data, $id = NULL, $objectId = NULL) {
		if ($objectId) {
			$this->text = $data;
			$this->id = $id;
			$this->objectId = $objectId;
		}
		elseif ($id) {
			$query = "SELECT c.id, c.content FROM contents c, objects o WHERE o.id = ? AND c.id = o.content_id";
			$params = array('type' => 'i', &$id);
			$db = database::getInstance();
			$db->preparedQuery($query, $params);
			$rows = $db->preparedGetRows();
			/* if (!$rows || count($rows) == 0) {
			  if (isset($data['content']))
			  $this->text = $data['content'];
			  elseif (isset($data['description']))
			  $this->text = $data['description'];
			  } else {
			  parent::__construct($rows[0]['id']);
			  $this->text = $rows[0]['content'];
			  } */
			if (count($rows) == 1) {
				parent::__construct_from_id($rows[0]['id']);
				$this->text = $rows[0]['content'];
				if (is_array($data)) {
					if (isset($data['content']))
						//$this->text = stripslashes($data['content']);
						$this->text = $this->remove_escapes ($data['content']);
					elseif (isset($data['description']))
						$this->text = $this->remove_escapes($data['description']);
				} else {
					$this->text = $this->remove_escapes($data);
				}
			} elseif (count($rows) > 1) {
				Log::write("Multiple content items returned for one object.");
			}
		} else {
			//parent::__construct($data);
			if (is_array($data)) {
				parent::__construct_from_array ($data);
				if (isset($data['content']))
					//$this->text = stripslashes($data['content']);
					$this->text = $this->remove_escapes ($data['content']);
				elseif (isset($data['description']))
					//$this->text = stripslashes($data['description']);
					$this->text = $this->remove_escapes ($data['description']);
			} else {
				//$this->text = stripslashes($data);
				$this->text = $this->remove_escapes ($data);
			}
		}
	}

	private function remove_escapes ($content) {
		$content = str_replace('\n', '', $content);
		$content = str_replace('\t', '', $content);
		return stripslashes($content);
	}

	private function scrub ($data) {
		if (!\is_string($data)) {
			Log::write("Content passed in to content object # $this->id that was not a string.");
		} else {
			// parse as HTML
			// find <body> element and remove
			// extract other elements: script, head, style, iframe, marquee, blink, form
			if ($data) {
				$content = new DOMDocument('1.0', 'utf-8');

				//Since loadHTML does not actively try to figure out what the html you are trying to
				//load is encoded in (like most browsers do), you have to specify it in the html head
				$data = "<head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'/></head>" . $data;

				$content->loadHTML($data);
			} else
				return;


			foreach (array('head', 'style', 'script', 'head', 'link', 'meta', 'form', 'xml', 'marquee', 'blink') as $tag) {
				$element_list = $content->getElementsByTagName($tag);
				for ($i = 0; $i < $element_list->length; $i++) {
					//$content->removeChild ($element_list->item($i));
					$element_list->item($i)->parentNode->removeChild($element_list->item($i));
				}
			}

			// HyperCities-specific tags
			$element_list = $content->getElementsByTagName('innerlink');
			for ($i = 0; $i < $element_list->length; $i++) {
				// replace element with <a href="javascript: HyperCities.
			}

			// cleaning other elements
			foreach (array('div', 'body') as $tag) {
				$element_list = $content->getElementsByTagName($tag);
				for ($i = 0; $i < $element_list->length; $i++) {
					$child_nodes = $element_list->item($i)->childNodes;
					for ($j = 0; $j < $child_nodes->length; $j++) {
						print_r($element_list->item($i));
						$element_list->item($i)->parentNode->replaceChild($child_nodes->item($j), $element_list->item($i));
						//print_r($child_nodes);
					}
					//$element_list->item($i)->parentNode->replaceChild($child_nodes->item($j)->cloneNode(), $element_list->item($i));
					//$element_list->item($i)->parentNode->textContent .= $element_list->item($i)->textContent;
					$element_list->item($i)->parentNode->removeChild($element_list->item($i));
				}
			} // end foreach (array ('div', 'body') as $tag)

			return $content->saveHTML();
		}
	}

	protected function __construct_from_array(array $data) {
		parent::__construct($data['id']);
		//$this->text = $this->scrub($data['content']);
		$content = $data['content'];
		$content = str_replace('\n', '', $content);
		$content = str_replace('\t', '', $content);
		$this->text = stripslashes($content);
	}

	protected function create() {
		$db = database::getInstance();
		if ($this->text === "") $this->text == "(empty)";
		$query = 'INSERT INTO contents (content, created_at, updated_at) VALUES (?, NOW(), NOW() )';
		$params = array('type' => 's', &$this->text);
		$result = $db->preparedQuery($query, $params);
		//print "Saved content.".$db->insertId();
		if ($result) {
			$this->id = $db->insertId();
		} else {
			Log::write("Creating content failed. " . $db->getError());
		}
	}

	protected function load() {
		$data = $this->query("SELECT content FROM contents WHERE id = ?", array('type' => 'i', &$this->id));
		$this->textContent = $data[0]['content'];
	}

	protected function update() {
		$query = "UPDATE contents SET content = ? WHERE id = ?";
		$this->writeQuery($query, array('type' => 'si', &$this->text, &$this->id));
	}

	public function updateWithArray(array $data) {
		$this->text = $data['content'];
	}

	public function __get($name) {
		switch ($name) {
			case 'id':
				return $this->id;
			case 'content':
				return $this->text;
			case 'objectId':
				return $this->objectId;
			case 'textContent':
				if (!$this->text) $this->load();
				return $this->textContent;
		}
	}
}

?>
