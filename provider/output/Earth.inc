<?php
/**
 * KML template classes for exporting to Google Earth.
 * 
 */
namespace HyperCities\Provider\Output\Earth;

const OBJECT = 'object';
const RICH_OBJECT = 'richObject';
const OBJECT_STYLE = 'objectStyle';
const MAP = 'overlay';
const BALLOON_STYLE = 'baseBalloonStyle';
const PLAY_MODE = 'pause';
const MAX_RECURSION_LEVEL = 5;

use HyperCities\Provider\ItemManagement\Collection;
use HyperCities\Provider\Output\Min;
use \HCKmlNode;
use HyperCities\Provider\Output\MappingTotal;

class TourDocument {
	private $id = NULL,
			$name = '',
			$description = '',
			$recursionLevel = 1,
			$objects = array(),
			$maps = array(),
			$steps = array(),
			$styles = array();
	
	public function __construct (Collection $collection) {
		$this->id = $collection->id;
		$this->name = $collection->title;
		$this->description = $collection->description;
		$this->objects = $collection->objects;
	}
	
	private function extractObjects () {
		$fs = FeatureStore::getInstance();
		$this->object = $fs->objects;
	}
	
	public function __get($name) {
		switch ($name) {
			case 'id':
				$return = $this->id;
		}
		return $return;
	}
	
	public function addStep ($tourStep) {
		$this->steps[] = $tourStep;
	}
	
	public function addObjects ($objects) {
		$this->objects = array_merge($this->objects, $objects);
	}
	
	public function addMaps ($maps) {
		$this->maps = array_merge($this->maps, $maps);
	}

	/**
	 * Add balloon style for the whole tour document
	 */
	private function addBalloonStyle (HCKmlNode $node) {
		$styleNode = $node->createAndAppendElementWithAttributes("Style", array(
			"id" => BALLOON_STYLE
		));
		$balloonStyle = $styleNode->createAndAppendNode("BalloonStyle");
		$balloonStyle->createAndAppendCDATASection("text", 
			'<font size="+1"><strong>$[name]</strong></font><br/><br/>$[description]'
		);

		return $styleNode;
	}

	public function toXMLAt (HCKmlNode $node) {
		// add balloon style
		$this->addBalloonStyle($node);

		$tourRoot = $node->createAndAppendNode("gx:Tour");
		$tourRoot->createAndAppendTextNodes(array(
			"name" => "Tour: ".$this->name,
			"description" => $this->description,
		));

		$playlistRoot = $tourRoot->createAndAppendNode("gx:Playlist");

		// hide all object at beginning, turn on each by each in later steps
		$auNode = $playlistRoot->createAndAppendNode("gx:AnimatedUpdate");
		$update = $auNode->createAndAppendNode("Update");
		$update->createAndAppendNode("targetHref");
		$bubbleUpdate = $update->createAndAppendNode("Change");

		foreach ($this->objects as $object) {
			
			if ($object->objectType == HC_OBJECT_TYPE_COLLECTION) {
				$plNode = $bubbleUpdate->createAndAppendElementWithAttributes("NetworkLink", array(
					"targetId" => OBJECT.$object->id,
				));
			} elseif ($object->maps || $object->objects) {
				$plNode = $bubbleUpdate->createAndAppendElementWithAttributes("Folder", array(
					"targetId" => RICH_OBJECT.$object->id,
				));
			} elseif ($object->objectType == HC_OBJECT_TYPE_KML || $object->objectType == HC_OBJECT_TYPE_3D_NETWORKLINK) {
				$plNode = $bubbleUpdate->createAndAppendElementWithAttributes("NetworkLink", array(
					"targetId" => OBJECT.$object->id,
				));
			} else {
				$plNode = $bubbleUpdate->createAndAppendElementWithAttributes("Placemark", array(
					"targetId" => OBJECT.$object->id,
				));
			}

			$plNode->createAndAppendTextNodes(array("visibility" => 0));
		}

		foreach ($this->steps as $step) {
			// AnimatedUpdates
			$step->toKmlAt($playlistRoot);
		}

		/* objects and maps
		 * Stop process sub-collections if recursion level reaches maximum.
		 * It is used to prevent infinite loop running out of server resources
		 * due to bad object relations in database.
		 */
		if ($this->recursionLevel <= MAX_RECURSION_LEVEL) {
			$folderNode = $node->createFolderNode("folder".$this->id, $this->name, "description: " . $this->description);
			foreach ($this->objects as $object) {
				$object->isIdEnable = true;
				$pl = new RichMediaObject($object);
				$pl->toXMLAt($folderNode);
			}
			foreach ($this->maps as $map) {
				$map = new TourMap($map);
				$map->toXMLAt($folderNode);
			}
		}
		
		// comment out sub objects for now
		//$subObjectsFolderNode = $node->createFolderNode("subObjectsFolder".$this->id, $this->name, "Sub objects");
		// TODO: try each object as a folder rather than an object
	}
}


class TourMap {
	private	$map = NULL;
	public function __construct ($map) {
		$this->map = $map;
	}
	
	public function toXMLAt (HCKmlNode $node) {
		$nlNode = $node->createNetworkNode(MAP.$this->map->id, $this->map->name, $this->map->description);
		$nlNode->createAndAppendNodes(array("open" => 0));
		$linkNode = $nlNode->createAndAppendNode("Link");
		$linkNode->createAndAppendNodes(array("href" => $this->map->tileUrl));
	}
}


class TourStep {
	private $object = NULL,
			$prevObj = NULL,
			$nextObj = NULL,
			$showObjects = array(),
			$hideObjects = array(),
			$showMaps = array(),
			$hideMaps = array();
	
	public function __construct ($object, $prevObj, $nextObj, $hideObjects, $hideMaps) {
		$this->object = $object;
		$this->prevObj = $prevObj;
		$this->nextObj = $nextObj;
		$this->hideObjects = $hideObjects;
		$this->hideMaps = $hideMaps;
	}

	/**
	 *  Add FlyTo in tour
	 */
	private function addFlyTo(\HCKmlNode $node) {
		$flyTo = $node->createAndAppendNode("gx:FlyTo");
		$flyTo->createAndAppendTextNode("gx:duration", 1.0);
		$view = new \DomDocument();
		if (substr($this->object->mapping->view, 0, 1) == '<') {
			$view->loadXML($this->object->mapping->view);
			$flyTo->importNodesAsChildren($view->documentElement);			
		}

		return $flyTo;
	}

	/**
	 * Add timespan in tour
	 */
	private function addTimespan(\HCKmlNode $flyTo) {
		$timespan = $flyTo->createAndAppendNode("TimeSpan");
		$timespan->createAndAppendTextNodes(array(
			"begin" => $this->object->mapping->dateFrom->format(DATE_ATOM),
			"end"	=> $this->object->mapping->dateTo->format(DATE_ATOM),
		));

		return $timespan;
	}

	/**
	 * Add object node in AnimatedUpdate->Update->Change in tour step
	 */
	private function addObjectNode(HCKmlNode $node, $object, $visibility) {

		if ($object->objectType == HC_OBJECT_TYPE_COLLECTION) {
			$objNode = $node->createAndAppendElementWithAttributes("NetworkLink", array(
				"targetId" => OBJECT.$object->id,
			));
			
			if ($visibility) {
				$objNode->createAndAppendTextNodes(array(
					"visibility" => 1,
					"gx:balloonVisibility" => 1,
					"styleUrl" => "#".BALLOON_STYLE,
				));
			} else {
				$objNode->createAndAppendTextNodes(array("visibility" => 0));
			}
		} elseif ($object->maps || $object->objects) {
			$objNode = $node->createAndAppendElementWithAttributes("Folder", array(
				"targetId" => RICH_OBJECT.$object->id,
			));
			// richObject has to add placemark in it for showing ballon
			$pmNode = $node->createAndAppendElementWithAttributes("Placemark", array(
				"targetId" => OBJECT.$object->id,
			));

			if ($visibility) {
				$objNode->createAndAppendTextNodes(array(
					"visibility" => 1,
				));
				$pmNode->createAndAppendTextNodes(array(
					"visibility" => 1,
					"gx:balloonVisibility" => 1,
					"styleUrl" => "#".BALLOON_STYLE,
				));
			} else {
				$objNode->createAndAppendTextNodes(array("visibility" => 0));
			}

		} elseif ($object->objectType == HC_OBJECT_TYPE_KML || $object->objectType == HC_OBJECT_TYPE_3D_NETWORKLINK) {
			$objNode = $node->createAndAppendElementWithAttributes("NetworkLink", array(
				"targetId" => OBJECT.$object->id,
			));
			
			if ($visibility) {
				$objNode->createAndAppendTextNodes(array(
					"visibility" => 1,
					"gx:balloonVisibility" => 1,
					"styleUrl" => "#".BALLOON_STYLE,
				));
			} else {
				$objNode->createAndAppendTextNodes(array("visibility" => 0));
			}
		} else {
			$objNode = $node->createAndAppendElementWithAttributes("Placemark", array(
				"targetId" => OBJECT.$object->id,
			));
			
			if ($visibility) {
				$objNode->createAndAppendTextNodes(array(
					"visibility" => 1,
					"gx:balloonVisibility" => 1,
					"styleUrl" => "#".BALLOON_STYLE,
				));
			} else {
				$objNode->createAndAppendTextNodes(array("visibility" => 0));
			}
		}

		return $objNode;
	}

	/**
	 * Add tour control
	 */
	private function addTourControl(HCKmlNode $node) {
		$tourControl = $node->createAndAppendNode("gx:TourControl");
		$tourControl->createAndAppendTextNodes(array(
			"gx:playMode" => PLAY_MODE
		));

		return $tourControl;
	}
	
	public function toKMLAt (\HCKmlNode $node) {
		$auNode = $node->createAndAppendNode("gx:AnimatedUpdate");
		// no need to set duration
		$update = $auNode->createAndAppendNode("Update");
		$update->createAndAppendNode("targetHref");
		$bubbleUpdate = $update->createAndAppendNode("Change");

		// hide previous object
		if ($this->prevObj) {
			$objNode = $this->addObjectNode($bubbleUpdate, $this->prevObj, 0);
		}

		// show current object and balloon
		$objNode = $this->addObjectNode($bubbleUpdate, $this->object, 1);

		// FlyTos
		$flyTo = $this->addFlyTo($node);

		// timespan, appended to FlyTo
		$timespan = $this->addTimespan($flyTo);

		// add tour control
		$tourControl = $this->addTourControl($node);
	}
}

/**
 * This class is for earth output only
 */
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
			$isIdEnable,
			$bookmarks;
			
	private $objectMapping,
			$type = 0;

	public function __construct($item) {
		parent::__construct($item->id, $item->title);
		$path = parse_url($_SERVER['PHP_SELF'], PHP_URL_PATH);
		$path = substr($path, 0, strlen($path) - strlen('ProviderInterface.php'));
		//TODO: add back
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
		$this->objects = $item->objects;

		if ($item->content instanceof \HyperCities\Provider\ItemManagement\Content) {
			if ($item->bookmarks) {
				foreach ($item->bookmarks as $bookmark) {
					$title = $bookmark->book->title;
					$bookId = $bookmark->book->book_id;
					$pageNo = $bookmark->pageNo;
					$coverUrl = $bookmark->book->coverUrl;

					$this->description .= "<a href='http://books.google.com/books?id="
						.$bookId."&pg="
						.$pageNo."'><img src='"
						.$coverUrl."' /></a><br/>";
				}
				$this->bookmarks = $item->bookmarks;
			}

			$this->description .= $item->content->content;
			$this->content = $item->content->id;
	
		} else {
			$this->description = $item->textContent;
			$this->content = $item->content;
		}

		if ($item->maps) {
			foreach ($item->maps as $map) {
				$this->maps[] = $map;
			}
		}


		$this->isIdEnable = $item->isIdEnable;
	}

	/**
	 * We use <Folder> to store rich objects.
	 */
	private function addRichObject(HCKmlNode $node, $isNL) {

		if ($this->isIdEnable) {
			$roNode = $node->createAndAppendElementWithAttributes('Folder', array('id' =>
				RICH_OBJECT.$this->id));
		} else {
			$roNode = $node->createAndAppendNode('Folder');
		}

		$name = $roNode->createAndAppendTextNode('name', $this->name);

		$this->addPlacemark($roNode, $isNL);

		if ($this->maps) {
			foreach ($this->maps as $map) {
				$this->addMap($roNode, $map);
			}
		}

		if ($this->objects) {
			foreach ($this->objects as $object) {
				$object->isIdEnable = false;
				$ro = new RichMediaObject($object);
				$ro->toXmlAt($roNode);
			}
		}

		return $roNode;
	}

	/**
	 * Add timespan in exported kml.
	 */
	private function addTimeSpan(HCKmlNode $node) {

		$timespanBase = $node->createAndAppendNode('TimeSpan');

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
			'end' => $dateTo,)
		);

		return $timespanBase;
	}

	/**
	 * Add object mapping
	 * @param {HCKmlNode} $node
	 * @param {String} $mapping
	 */
	private function addMapping(HCKmlNode $node, $mapping) {

		$baseNode = $node;
	
		if (substr($mapping, 0, 1) == '<') {
			$sxe = @simplexml_load_string($mapping, NULL, LIBXML_NSCLEAN);
			$markerDom = dom_import_simplexml($sxe);

			if ($markerDom == NULL) {
				HC_errorLog("Defective KML in object $this->id :" . $mapping ." \n");
				Log::write("Defective KML in object $this->id :" . $mapping);
			} else {
				$dom = $node->getDocument();
				//$dom = $node;
				$markerNode = $dom->importNode($markerDom, true);

				if (($itemNode = $markerNode->getElementsByTagName("Point")->item(0)) !== NULL) {
					$baseNode->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("LineString")->item(0)) !== NULL) {
					$baseNode->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("Polygon")->item(0)) !== NULL) {
					$baseNode->appendChild($itemNode);
				}
				if (($itemNode = $markerNode->getElementsByTagName("Style")->item(0)) !== NULL) {
					$styleIdAttr = $dom->createAttribute("id");
					$styleIdAttr->appendChild($dom->createTextNode(OBJECT_STYLE.$this->id));
					$itemNode->appendChild($styleIdAttr);
					$baseNode->appendChild($itemNode);
				}

				if (($itemNode = $markerNode->getElementsByTagName("LookAt")->item(0)) !== NULL) {
					$baseNode->appendChild($itemNode);
				}
			}
		}
		$baseNode->createAndAppendTextNode("styleUrl", "#".OBJECT_STYLE.$this->id);

		return $baseNode;
	}

	/**
	 * Add Maps
	 */
	private function AddMap(HCKmlNode $node, $map) {

		$mapUrl = (substr($map->tileUrl, -1, 1) === "/") ? $map->tileUrl :
			$map->tileUrl."/" ;

		if ($map->id === 0) {
			// this is a dynamic map
			$layer = array_pop($map->layers);
			if (is_null($layer)) {
				$mapUrl = $mapUrl."generateKml";
			} else {
				$mapUrl = $mapUrl."generateKml?layer=".$layer;
			}
		} else {
			// this is a map on our tile server
			$mapUrl = $mapUrl."doc.kml";
		}

		$nlNode = $node->createAndAppendNode('NetworkLink');
		$nlNode->createAndAppendTextNode('name', $map->tileType." map: ".$map->title);
		$link = $nlNode->createAndAppendNode('Link');
		$link->createAndAppendTextNode('href', $mapUrl);

		return $nlNode;
	}
	
	/**
	 * Add Placemark
	 */
	private function addPlacemark(HCKmlNode $node, $isNL) {

		if ($isNL) {
			if ($this->isIdEnable) {
				$baseNode = $node->createAndAppendElementWithAttributes('NetworkLink',
					array('id' => OBJECT.$this->id));
			} else {
				$baseNode = $node->createAndAppendNode('NetworkLink');
			}
		} else {
			if ($this->isIdEnable) {
				$baseNode = $node->createAndAppendElementWithAttributes('Placemark',
					array('id' => OBJECT.$this->id));
			} else {
				$baseNode = $node->createAndAppendNode('Placemark');
			}
		}

		$baseNode->createAndAppendTextNode('name', $this->name);
		// Author
		$authorBase = $baseNode->createAndAppendNode('atom:author');
		$authorBase->createAndAppendTextNode('atom:name', $this->creator);
		// TO DO: create popup without pointer: http://code.google.com/apis/kml/forum/advanced.html?place=topic%2Fkml-support-advanced%2FRTYwNihhsHs%2Fdiscussion
		$baseNode->createAndAppendCDATASection('description', $this->description);
		// Timespan
		$this->addTimeSpan($baseNode);
		// Link
		$link = $baseNode->createAndAppendElementWithAttributes('atom:link', array
					('href' => \HyperCities\Provider\Output\get_url_for_object($this) . ".kml"));
		if ($isNL) {
			$nLink = $baseNode->createAndAppendNode('Link');
			$nLink->createAndAppendTextNode('href', $this->objectMapping->kml);
		}
		if (is_string($this->content)) {
			$descNode = $baseNode->createAndAppendNode('description');
			$descNode->setAttribute('id', $this->content);
		} elseif ($this->content instanceof Content) {
			$baseNode->createAndAppendCDATASection(array('description' => $this->description));
		}
	
		$mapping = $this->mapping->kml;
		$this->addMapping($baseNode, $mapping);

		return $baseNode;
	}

	public function toXmlAt(HCKmlNode $node) {
		$isNL = ($this->type == HC_OBJECT_TYPE_KML || 
			$this->type == HC_OBJECT_TYPE_3D_NETWORKLINK ) ? true : false;

		if ($this->type == HC_OBJECT_TYPE_COLLECTION) {
			$nlNode = $node->createAndAppendElementWithAttributes('NetworkLink', 
				array('id' => OBJECT.$this->id));

			$scriptPath = $_SERVER['SERVER_NAME'].$_SERVER['REQUEST_URI'];
			$scriptPath  = substr($scriptPath, 0, strrpos($scriptPath, "/") );

			$subCollectionUrl = $scriptPath."/".$this->id.".kml";
			$name = $nlNode->createAndAppendTextNode('name', $this->name);
			$link = $nlNode->createAndAppendNode('Link');
			$link->createAndAppendTextNode('href', $subCollectionUrl);
		} else if ($this->maps || $this->objects) {
			$this->addRichObject($node, $isNL);
		} else {
			$this->addPlacemark($node, $isNL);
		}
	}
}
?>
