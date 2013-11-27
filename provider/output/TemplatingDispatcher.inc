<?php

namespace HyperCities\Provider\Output;

use \database;
use HyperCities\Provider\Models\Model;
use HyperCities\Provider\Log;
use HyperCities\Provider\ItemManagement\Collection;
use HyperCities\Provider\ItemManagement\Content;
use HyperCities\Provider\Models\Placemark;
use HyperCities\Provider\ItemManagement\Mapping;
use \HCKmlNode;

function get_base_url () {
  return 'http://'.$_SERVER['SERVER_NAME'].str_replace("ProviderInterface.php", '', $_SERVER['PHP_SELF']);
}

function get_url_for_object($object) {
	$type = 'objects';
	if ($object instanceof Collection)
		$type = 'collections';
	return 'http://' . $_SERVER['SERVER_NAME'] . str_replace("ProviderInterface.php", '', $_SERVER['PHP_SELF']) . 'provider/' . $type . '/' . $object->id;
}

class Min {

	public $id, $name;

	public function __construct($id, $name) {
		$this->id = $id;
		$this->name = $name;
	}

	public function toXmlAt(HCKmlNode $baseNode) {
		
	}

}

abstract class Total extends Min {

	public static function create($model) {
		$wrapped = null;
		switch (get_class($model)) {
			case 'HyperCities\\Provider\\Models\\Collection':
			case 'HyperCities\\Provider\\ItemManagement\\Collection':
				$wrapped = new CollectionTotal($model);
				break;
			case 'HyperCities\\Provider\\Models\\Placemark':
				$wrapped = new PlacemarkTotal($model);
				break;
			case 'HyperCities\\Provider\\ItemManagement\\RichMediaObject':
				$wrapped = new RichMediaObject($model);
				break;
		}
		return $wrapped;
	}

}

abstract class Exporter extends Total {
	public static function create($model) {
		$wrapped = null;
		switch (get_class($model)) {
			case 'HyperCities\\Provider\\Models\\Collection':
			case 'HyperCities\\Provider\\ItemManagement\\Collection':
				$wrapped = new CollectionExporter($model);
				break;
			case 'HyperCities\\Provider\\ItemManagement\\RichMediaObject':
				$wrapped = new RichMediaObjectWithExporter($model);
				break;
			default:
				print get_class($model);
		}
		return $wrapped;
	}
}

class ClientCollection extends Min {

	public	$description,
			$creator,
			$mapping,
			$linkUrl;

	public function __construct($model) {
		parent::__construct($model->id, $model->title);
		$this->description = $model->description;
		$this->creator = $model->creator;
		$this->mapping = new MappingTotal($model->mapping);
		$this->linkUrl = get_url_for_object($model);
	}
}

class MappingTotal {

	public $dateFrom, $dateTo, $neLat, $neLon, $swLat, $swLon, $kml, $view, $zoom, $markerStyle;

	public function __construct($mapping) {
		$this->dateFrom = $mapping->dateFrom;
		$this->dateTo = $mapping->dateTo;
		$this->neLat = $mapping->neLat;
		$this->neLon = $mapping->neLon;
		$this->swLat = $mapping->swLat;
		$this->swLon = $mapping->swLon;
		$this->kml = $mapping->kml;
		$this->view = $mapping->view;
		$this->zoom = $mapping->zoom;
		@$this->markerStyle = $mapping->markerType;
	}

	public function getBBox () {
		return "[$this->neLat],[$this->neLon],[$this->swLat],[$this->swLon]";
	}

}

class CollectionTotal extends Min {

  public $description, $creator, $mapping, $linkUrl, $state, $copyright, $owner, $hcPermalink;
	public $children = array();
	protected $childHolder = array();

	public function __construct(Collection $collection) {
		parent::__construct($collection->id, $collection->title);
		$this->owner = $collection->owner;
		$this->creator = $collection->creator;
		$this->mapping = new MappingTotal($collection->mapping);
		$this->description = $collection->description;
		$this->childHolder = $collection->children;
		$this->state = $collection->state;
		$this->copyright = $collection->copyright;
		$this->linkUrl = get_url_for_object($collection);
		$this->hcPermalink = get_base_url().'spawnSession.php?authType=shibboleth&collection='.$this->id;
		foreach ($this->childHolder as $child) {
			$item = Total::create($child);
			$this->children[] = $item;
		}
	}

	public function prepare() {
		if ($this->childHolder) {
			foreach ($this->childHolder as $child) {
				$item = Total::create($child);
				if ($item instanceof CollectionTotal) {
					$item->prepare();
				}
				$this->children[] = $item;
			}
		}
	}

	public function toXmlAt(HCKmlNode $node) {
		// $this->prepare();
		if (count($this->children) > 0)
			$baseNode = $node->createFolderNode($this->id, $this->name, $this->description);
		else
			$baseNode = $node->createNetworkNode($this->id, $this->name, $this->description);
		// Author
		$authorBase = $baseNode->createAndAppendNode('atom:author');
		$authorBase->createAndAppendTextNode('atom:name', $this->creator);
		// Timespan
		// Link
		$edNode = $baseNode->createAndAppendEDNode();
		$extendedData = array(
			'hc:external' => 0,
		);

		$edNode->createAndAppendTextNodes($extendedData);
		foreach ($this->children as $child) {
			$child->toXmlAt($baseNode);
		}
	}

}

class ContentTotal {
	public $content, $id, $objectId;

	public function __construct ($item) {
		$this->id = $item->id;
		$this->content = $item->content;
		$this->objectId = $item->objectId;
	}
}

class FlatObject extends Min {

	public	$description,
			$creator,
			$mapping,
			$linkUrl,
			$copyright,
			$state,
			$owner,
			$orderId,
			$isEarthObject,
			$isExternal,
			$markerTypeId;
	private $mappingObj,
	$type;

	public function __construct($item, $makeView = TRUE) {
		parent::__construct($item->id, $item->title);
		$this->creator = $item->creator;
		//$this->content = $item->content->id;
		$this->content = $item->content;
		$this->mapping = new MappingTotal($item->mapping);
		$this->mappingObj = $item->mapping;
		$this->orderId = $item->order;
		if ($item->objectType == 4 || $item->objectType == 6) {
			$this->linkUrl = $item->mapping->kml;
			$this->mapping->kml = $item->mapping->kml;
			$makeView = FALSE;
		} else {
			$this->linkUrl = get_url_for_object($item);
		}
		$this->creator = $item->creator;
		$this->copyright = $item->copyright;
		$this->state = $item->state;
		$this->type = $item->objectType;
		$this->owner = $item->owner;
		$isEarth = 0;
		$this->ownerId = $item->owner;
		if ($this->mapping) {
			$this->markerTypeId = $item->mapping->markerType;
			$this->viewFormat = $item->mapping->getBoundingBox();
		}
		$this->objectType = $item->objectType;
		$isEarth = 0;
		if ($this->markerTypeId >= 4 && $this->markerTypeId <= 7) {
			$isEarth = 1;
		}
		$this->isEarthObject = $isEarth;
		$isExternal = 0;
		if ($this->type == 4 || $this->type == 6) {
			$isExternal = 1;
		}
		$this->isExternal = $isExternal;
		if ($item->content instanceof Content) {
			$this->description = $item->content->id;
		} else {
			$this->description = $item->content;
		}
		if ($makeView) {
			$tempObject = new FlatObject($item, FALSE);
			$doc = new \HCKmlDocWrapper();
			$doc->setId($item->id);
			$tempObject->toXmlAt($doc->docNode);
			$kml = preg_replace('/\<default:/', '<', $doc->saveXML());
			$kml = preg_replace('/\<\/default:/', '</', $kml);
			$this->mapping->kml = $kml;
		}
	}

	public function toXmlAt(HCKmlNode $node) {
		if ($this->type == 4 || $this->type == 6) {
			$baseNode = $node->createAndAppendElementWithAttributes('NetworkLink', array('id' => $this->id));
		} else {
			$baseNode = $node->createAndAppendElementWithAttributes('Placemark', array('id' => $this->id));
		}
		$baseNode->createAndAppendTextNode('name', $this->name);
		// Author
		$authorBase = $baseNode->createAndAppendNode('atom:author');
		$authorBase->createAndAppendTextNode('atom:name', $this->creator);
		// Timespan
		$timespanBase = $baseNode->createAndAppendNode('TimeSpan');
		$timespanBase->createAndAppendTextNodes(array(
			'begin' => $this->mapping->dateFrom->format(DATE_ATOM),
			'end' => $this->mapping->dateTo->format(DATE_ATOM)
				)
		);
		// Link

		$descNode = $baseNode->createAndAppendNode('description');
		if ($this->content instanceof Content)
			$descNode->setAttribute('id', $this->content->id);
		else
			$descNode->setAttribute('id', $this->content);
		//Removed this node; content will be accessed via a separate query.
		$edNode = $baseNode->createAndAppendEDNode();
		$mapping = $this->mapping->kml;
		$sxe = @simplexml_load_string($mapping);
		$markerDom = @dom_import_simplexml($sxe);
		if ($markerDom) {
			$dom = $node->getDocument();
			$markerNode = $dom->importNode($markerDom, true);

			if (($itemNode = $markerNode->getElementsByTagName("Style")->item(0)) !== NULL) {
				$baseNode->appendChild($itemNode);
			}
			if (($itemNode = $markerNode->getElementsByTagName("Point")->item(0)) !== NULL) {
				$baseNode->appendChild($itemNode);
			}
			if (($itemNode = $markerNode->getElementsByTagName("LineString")->item(0)) !== NULL) {
				$baseNode->appendChild($itemNode);
			}
			if (($itemNode = $markerNode->getElementsByTagName("Polygon")->item(0)) !== NULL) {
				$baseNode->appendChild($itemNode);
			}
			if (($itemNode = $markerNode->getElementsByTagName("LookAt")->item(0)) !== NULL) {
				$baseNode->appendChild($itemNode);
			}
			if (($itemNode = $markerNode->getElementsByTagName("Model")->item(0)) !== NULL) {
				$baseNode->appendChild($itemNode);
			}
		}

		$edNode->createAndAppendTextNodes(array(
			'hc:boundChildren' => 0,
			'hc:totalChildren' => 0,
			'hc:viewFormat' => $this->mappingObj->getBoundingBox(),
			'hc:orderId' => $this->mappingObj->orderId,
			'hc:order' => $this->mappingObj->order,
			'hc:ownerId' => $this->owner,
			'hc:stateId' => $this->state,
			'hc:earthObject' => $this->isEarthObject,
			'hc:external' => $this->isExternal,
				)
		);
	}

}

class RichMediaObject extends Min {

	public	$description,
			$creator,
			$copyright,
			$mapping,
			$content,
			$ownerId,
			$stateId,
			$markerTypeId,
			$objectType,
			$maps = array(),
			$objects = array(),
			$isEarthObject,
			$markerType,
			$mapType,
			$linkUrl,
			$buildings,
			$coauthors = array(),
            $parents = array(),
			$bookmarks = array();
	private $objectMapping,
	$type = 0;

	public function __construct($item) {
		parent::__construct($item->id, $item->title);
		$path = parse_url($_SERVER['PHP_SELF'], PHP_URL_PATH);
		$path = substr($path, 0, strlen($path) - strlen('ProviderInterface.php'));
		$this->linkUrl = get_url_for_object($item);
		$this->copyright = $item->copyright;
		$this->creator = $item->creator;
		$this->state = $item->state;
		$this->owner = $item->owner;
		$this->objectMapping = $item->mapping;
		$this->mapping = new MappingTotal($item->mapping);
		$isEarth = 0;
		$this->type = $item->objectType;
		$this->stateId = $item->state;
		$this->ownerId = $item->owner;
		$this->objectType = $item->objectType;
		$this->buildings = $item->buildings;
		// Suppress error display because some objects lack mappings due to bugs
		@$this->markerTypeId = $item->mapping->markerType;
		$this->mapType = $item->mapType;
		$this->bubble = $item->bubble;
		if ($this->markerTypeId >= 4 && $this->markerTypeId <= 7) {
			$isEarth = 1;
		}
		$this->isEarthObject = $isEarth;

		if ($item->content instanceof Content) {
			$this->description = $item->content->content;
			$this->content = $item->content->id;
		} else {
			$this->description = $item->content;
			$this->content = $item->content;
		}

        $this->parents = $item->parents;

		if ($item->maps) {
			foreach ($item->maps as $map) {
				$this->maps[] = $map;
			}
		}
		if ($item->objects) {
			foreach ($item->objects as $object) {
				$this->objects[] = new FlatObject($object);
			}
		}
		if ($item->bookmarks) {
			foreach ($item->bookmarks as $bookmark) {
				$this->bookmarks[] = new LinkedBook($bookmark);
			}
		}
		if ($item->coauthors) {
			foreach ($item->coauthors as $coauthor) {
				$this->coauthors[] = $coauthor;
			}
		}
	}

	public function prepare() {

	}

	public function toXmlAt(HCKmlNode $node) {
		$isNL = false;
		if ($this->type == 4 || $this->type == 6) {
			$baseNode = $node->createAndAppendElementWithAttributes('NetworkLink', array('id' => $this->id));
			$isNL = true;
		} else {
			$baseNode = $node->createAndAppendElementWithAttributes('Placemark', array('id' => $this->id));
		}
		$baseNode->createAndAppendTextNode('name', $this->name);
		// Author
		$authorBase = $baseNode->createAndAppendNode('atom:author');
		$authorBase->createAndAppendTextNode('atom:name', $this->creator);
		// Timespan
		$timespanBase = $baseNode->createAndAppendNode('TimeSpan');
		if ($this->mapping->dateFrom instanceof \DateTime) {
			$dateFrom = $this->mapping->dateFrom->format(DATE_ATOM);
		} else {
			$dateFrom = $this->mapping->dateFrom;
		}
		if ($this->mapping->dateTo instanceof \DateTime) {
			$dateTo = $this->mapping->dateTo->format(DATE_ATOM);
		} else {
			$dateTo = $this->mapping->dateTo;
		}
		$timespanBase->createAndAppendTextNodes(array(
			'begin' => $dateFrom,
			'end' => $dateTo,
				)
		);
		// Link
		$link = $baseNode->createAndAppendElementWithAttributes('atom:link', array
					('href' => get_url_for_object($this) . ".kml"));
		if ($isNL) {
			$nLink = $baseNode->createAndAppendNode('link');
			$nLink->createAndAppendTextNode('href', $this->objectMapping->kml);
		}
		$descNode = $baseNode->createAndAppendTextNode('description', $this->description);
		$descNode->setAttribute('id', $this->content);
		//Removed this node; content will be accessed via a separate query.
		$edNode = $baseNode->createAndAppendEDNode();

		$edNode->createAndAppendTextNode('hc:earthObject', $this->isEarthObject);
		$edNode->createAndAppendTextNodes(array(
			'hc:boundChildren' => 0,
			'hc:totalChildren' => 0,
			'hc:markerTypeId' => $this->objectMapping->markerType,
			'hc:ownerId' => $this->owner,
			'hc:stateId' => $this->state,
			'hc:mapType' => $this->mapType,
		));
		$viewNode = $edNode->createAndAppendNode("hc:view");
		$view = new \DomDocument();
		if (substr($this->objectMapping->view, 0, 1) == '<') {
			$view->loadXML($this->objectMapping->view);
			$viewNode->importNodesAsChildren($view->documentElement);
		} 
		$mapping = $this->mapping->kml;
		if (substr($mapping, 0, 1) == '<') {
			$sxe = @simplexml_load_string($mapping, NULL, LIBXML_NSCLEAN);
			$markerDom = dom_import_simplexml($sxe);
			if ($markerDom == NULL) {
				Log::write("Defective KML in object $this->id :" . $mapping);
			} else {
				$dom = $node->getDocument();
				$markerNode = $dom->importNode($markerDom, true);

				if (($itemNode = $markerNode->getElementsByTagName("Style")->item(0)) !== NULL) {
					$baseNode->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("Point")->item(0)) !== NULL) {
					$baseNode->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("LineString")->item(0)) !== NULL) {
					$baseNode->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("Polygon")->item(0)) !== NULL) {
					$baseNode->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("LookAt")->item(0)) !== NULL) {
					$baseNode->appendChild($itemNode);
				}
			}
		}

		$edNode->createAndAppendTextNodes(array(
			'hc:viewFormat' => $this->objectMapping->getBoundingBox(),
				)
		);
		$roNode = $edNode->createAndAppendNode('RichObject');
		if ($this->maps) {
			$mapsNode = $roNode->createAndAppendNode('Maps');
			foreach ($this->maps as $map) {
				$mapNode = $mapsNode->createAndAppendNode('Map');
				$mapNode->createAndAppendTextNodes(array(
					'id' => $map->id,
					'url' => $map->tileUrl
				));
			}
		}
		if ($this->objects) {
			$objectsNode = $roNode->createAndAppendNode('Objects');
			foreach ($this->objects as $object) {
				$object->toXmlAt($objectsNode);
			}
		}
	}

}

class GeoPt {
	public	$lat,
			$lon,
			$alt;
	public function __construct () {
		$args = func_get_args();
		switch (count($args)) {
			case 1:
				// We have a GeoPt
				if ($args[0] instanceof \HyperCities\Provider\GeoPt) {
					$this->lat = (float)$args[0]->lat;
					$this->lon = (float)$args[0]->lon;
					$this->alt = (float)$args[0]->alt;
				}
				break;
			case 3:
				$this->lat = (float)$args[0];
				$this->lon = (float)$args[1];
				$this->alt = (float)$args[2];
				break;
		}
		if (!$this->lat && $this->lon) {
			print_r ($args);
		}
	}
}

class CollectionExporter extends CollectionTotal {
	public function prepare () {
		if ($this->childHolder) {
			foreach ($this->childHolder as $child) {
				$item = Exporter::create($child);
				if ($item instanceof CollectionExporter) $item->prepare();
				$this->children[] = $item;
			}
		}
	}
}

class MappingExporter extends MappingTotal {
	public $georeferences = array();

	public function __construct ($mapping) {
		parent::__construct($mapping);
		foreach ($mapping->georeferences as $gref) {
			$this->georeferences[] = new GeoPt($gref);
		}
	}
}

class RichMediaObjectWithExporter extends RichMediaObject {
	public function __construct ($item) {
		parent::__construct($item);
		$this->mapping = new MappingExporter ($item->mapping);
		if ($item->content) $this->content = $item->content->text;
	}
}

class RichMediaObjectWithDescription extends RichMediaObject {
	public	$content;
	public function __construct ($item) {
		parent::__construct($item);
		$this->content = $item->content;
	}
}

class MoodleChild extends Min {

	public $owners = array();

	public function __construct($item) {
		parent::__construct($item->id, $item->title);
		$item->getUsers();
		foreach ($item->users as $user) {
			if (!in_array($user->email, $this->owners)) $this->owners[] = $user->email;
		}
	}

}

class Moodle extends Min {

	public $owners = array(),
			$hcPermalink = '',
			$children = array();

	public function __construct($item) {
		parent::__construct($item->id, $item->title);
		$this->hcPermalink = get_base_url().'spawnSession.php?authType=shibboleth&collection='.$this->id;
		$this->hcNarrative = get_base_url().'#collections/'.$this->id;
		$query = "SELECT email FROM users WHERE id = $item->owner;";
		$db = database::getInstance();
		$db->query($query);
		$result = $db->getRows();

		foreach ($result as $row) {
			$this->owners[] = $row['email'];
		}
		
		if (method_exists($item, 'getUsers')) {
			$item->getUsers();
			foreach ($item->users as $user) {
				if (!in_array($user->email, $this->owners)) $this->owners[] = $user->email;
			}
		}

		if ($item->objects && is_array ($item->objects)) {
			foreach ($item->objects as $child) {
				if ($child instanceof Collection)
					$this->children[] = new MoodleChild($child);
			}
		} elseif ($item->children && is_array ($item->children)) {
			// TODO: children or visibleChildren?
			foreach ($item->children as $child) {
				if ($child instanceof Collection)
					$this->children[] = new MoodleChild($child);
			}
		}
	}
}

class MoodleUser {
	public $ePPN;

	public function __construct ($user) {
		$this->ePPN = $user->email;
	}
}

class PlacemarkTotal extends Min {

	public $link, $creator, $mappings, $content, $order_id;

	/* public function __construct ($id, $name, $description, $link, $author, $mappings) {
	  parent::__construct($id, $name, $description);
	  $this->link = $link;
	  $this->author = $author;
	  $this->mappings = $mappings;
	  } */

	public function __construct(Placemark $pl) {
		parent::__construct($pl->id, $pl->name);
		//$this->link = $pl->link;
		$this->creator = $pl->author;
		$this->mappings = $pl->mappings;
		$this->content = $pl->contentId;
		$this->order_id = $pl->order_id;
	}

	public function toXmlAt(HCKmlNode $node) {
		$baseNode = $node->createPlacemarkNode($this->id);
		// Author
		$authorBase = $baseNode->createAndAppendNode('atom:author');
		$authorBase->createAndAppendTextNode('atom:author', $this->creator);
		// Timespan
		$timespanBase = $baseNode->createAndAppendNode('TimeSpan');
		$timespanBase->createAndAppendTextNodes(array(
			'begin' => $this->mappings[0]->dateFrom->format(DATE_ATOM),
			'end' => $this->mappings[0]->dateTo->format(DATE_ATOM)
				)
		);
		// Link
		$baseNode->createAndAppendTextNode('name', $this->name);
		$descNode = $baseNode->createAndAppendNode('description');
		$descNode->setAttribute('id', $this->content);
		//Removed this node; content will be accessed via a separate query.
		$edNode = $baseNode->createAndAppendEDNode();
		foreach ($this->mappings as $mappingObj) {
			$mapping = $mappingObj->kml;
			$sxe = simplexml_load_string($mapping);
			$markerDom = dom_import_simplexml($sxe);
			if ($markerDom == NULL) {
				continue;
			}
			$dom = $node->getDocument();
			$markerNode = $dom->importNode($markerDom, true);

			if (($itemNode = $markerNode->getElementsByTagName("Style")->item(0)) !== NULL) {
				$baseNode->appendChild($itemNode);
			}
			if (($itemNode = $markerNode->getElementsByTagName("Point")->item(0)) !== NULL) {
				$baseNode->appendChild($itemNode);
			}
			if (($itemNode = $markerNode->getElementsByTagName("LineString")->item(0)) !== NULL) {
				$baseNode->appendChild($itemNode);
			}
			if (($itemNode = $markerNode->getElementsByTagName("Polygon")->item(0)) !== NULL) {
				$baseNode->appendChild($itemNode);
			}
			if (($itemNode = $markerNode->getElementsByTagName("LookAt")->item(0)) !== NULL) {
				$baseNode->appendChild($itemNode);
			}
		} // end foreach ($this->mappings as $mapping)
		$edNode->createAndAppendTextNodes(array(
			'hc:viewFormat' => $this->mappings[0]->getBoundingBox(),
			'hc:orderId' => $this->order_id,
				)
		);
	}

}

class PlacemarkMoodle extends Min {

	public $users;

	public function __construct(\HCPlacemark $item) {
		parent::__construct($item);
		$users = array();
		foreach ($item['users'] as $user) {
			$users[] = TemplatingDispatcher::dispatch($user, 'Moodle');
		}
		$this->users = $users;
	}

}

class CollectionNarrative extends Min {

	public $children = array();

	public function __construct(Collection $collection) {
		parent::__construct($collection->id, $collection->name);
		foreach ($collection->children as $child) {
			if ($child instanceof Collection)
				$this->children = new CollectionNarrative($child);
			elseif ($child instanceof \HyperCities\Provider\ItemManagement\RichMediaObject) {
				//$this->children[] = new PlacemarkNarrative($child);
				$this->children[] = new PlacemarkNarrative($child);
			}
		}
	}

}

class PlacemarkNarrative extends Min {

	public $content;

	public function __construct($item) {
		parent::__construct($item->id, $item->title);
		//$this->content = $item->getContentText();
		$this->content = $item->content;
	}
}


/**
 * Determines which output templates should be used.
 *
 * @author David Shepard
 */
class Dispatcher {

	public function __construct() {

	}

	private function total($data) {
		if ($data instanceof Collection) {
			$templatedData = new CollectionTotal($data);
		} elseif ($data instanceof Placemark) {
			$templatedData = new PlacemarkTotal($data);
		} elseif ($data instanceof \HyperCities\Provider\ItemManagement\
				RichMediaObject) {
			$templatedData = new RichMediaObject($data);
		} elseif ($data instanceof Content) {
			$templatedData = new ContentTotal($data);
		} else {
			$templatedData = $data;
		}
		return $templatedData;
	}

	private function all ($data) {
		if ($data instanceof Collection) {
			$templatedData = new CollectionTotal($data);
			$templatedData->prepare();
		} elseif ($data instanceof Placemark) {
			$templatedData = new PlacemarkTotal($data);
		} elseif ($data instanceof \HyperCities\Provider\ItemManagement\
				RichMediaObject) {
			$templatedData = new RichMediaObjectWithDescription($data);
		} elseif ($data instanceof Content) {
			$templatedData = new ContentTotal($data);
		} else {
			$templatedData = $data;
		}
		return $templatedData;
	}

	private function narrative($data) {
		if ($data instanceof Collection) {
			$templatedData = new CollectionNarrative($data);
		} else {
			$templatedData = new PlacemarkNarrative($data);
		}
		return $templatedData;
	}

	private function client($data) {
		$returnable = NULL;
		if (is_array($data)) {
			$returnable = array();
			foreach ($data as $datum) {
				$returnable[] = $this->client($data);
			}
			return $returnable;
		} else {
			if ($data instanceof Collection) {
				$returnable = new ClientCollection($data);
			} elseif ($data instanceof \HyperCities\Provider\ItemManagement\RichMediaObject) {
				$returnable = new RichMediaObject($data);
			}
		}
		return $returnable;
	}

	private function export ($data) {
		if ($data instanceof Collection) {
			$templatedData = new CollectionExporter($data);
			$templatedData->prepare();
		} elseif ($data instanceof \HyperCities\Provider\ItemManagement\RichMediaObjectObject) {
			$templatedData = new RichMediaObjectWithExporter($data);
			//$templatedData->prepare();
		} else {
			$templatedData = $data;
		}
		return $templatedData;
	}

	public function createTemplates($data, $format) {
		$templatedData = null;
		if (is_array($data)) {
			$templatedData = array();
			foreach ($data as $row) {
				$templatedData[] = $this->createTemplates($row, $format);
			}
		} elseif ($data instanceof HyperCities\Provider\Exception) {
			$templatedData = $data;
		} else {
			switch ($format) {
				case 'client':
					$templatedData = $this->client($data);
					break;
				case 'min':
					if ($data instanceof Collection) {
						$templatedData = new CollectionMin($data);
					} elseif ($data instanceof Placemark) {
						$templatedData = new PlacemarkMin($data);
					}
					break;
				case 'narrative':
					$templatedData = $this->narrative($data);
					break;
				case 'all':
					$templatedData = $this->all($data);
					break;
				case 'export':
					$templatedData = $this->export($data);
					break;
				default:
					$templatedData = $this->total($data);
					break;
			}
		}
		return $templatedData;
	}

}

?>
