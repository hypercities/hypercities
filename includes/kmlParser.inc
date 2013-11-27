<?php
// vim: ts=4:sw=4:fdc=2:nu:nospell
/**
 * @file
 * HyperCities kml parser.
 *
 * Provides kml parse functions.
 *
 * @author    HyperCities Team
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-05-21
 * @version   $Id$
 *
 */

include_once("includes/dbUtil.inc");
include_once("includes/kml.inc");
include_once("includes/MysqlException.inc");

//TODO: add style id in kml. modify kml.inc
 
//test case
/*
function readKml($targetFile)
{
	$xmlstr = '';

	$read_lim = 8192; //size in bytes to load into memory
	$fh = fopen($targetFile, "r");
	$size = filesize($targetFile); //total file size

	while ($size > 0) {
		$read_len = ($size > $read_lim) ? $read_lim : $size; //read length
		$xmlstr .= fread($fh, $read_len);
		$size -= $read_len;
	}

	fclose($fh);

	return $xmlstr;
}

try
{
	//$targetFile = "uploadedKml/UCLAETCRF__REP_AedesCastoris_1269552085/doc.kml";
	$targetFile = "uploadedKml/FilipinotownTrim.kml";

	if ($handle = opendir('uploadedKml/editor_1298418579')) {
		while (false !== ($file = readdir($handle))) {
			$pathinfo = pathinfo($file);
			if (isset($pathinfo['extension']) && strcasecmp($pathinfo['extension'], "kml") == 0) {
				$targetFile = $file;
				break;
			}
		}
	}

	//read kml file
	$xmlstr = readKml($targetFile);

	//parse kml file
	$userId = 19;
	$title = "test";
	$creator = "jay";
	$copyright = "jay";
	$minDateFrom = "2005-01-01 00:00:00";
	$maxDateTo = "2005-01-02 00:00:00";
	$view =
		"<Camera><latitude>1</latitude><longitude>1</longitude><altitude>2</altitude><tilt>2</tilt><heading>2</heading><roll>2</roll></Camera>";
	$zoom = 13;
	$url = "http://linuxdev.ats.ucla.edu/~jay/hypercities/trunk/uploadedKml/Brandenburg+Gate1259704501/";
	$bound = array("north" => 34, "east" => 118, "south" => 33, "west" => 119);

	$kmlParser = new KmlParser($userId, $title, $creator, $copyright, 
							$minDateFrom, $maxDateTo, $view, $zoom, $url,
							HC_OBJECT_TYPE_MEDIA, $bound);
	$kmlParser->parseKml($xmlstr);
	//$kmlParser->precommit();
	HC_debugLog($kmlParser);

	//commit to database
	//$ids = $kmlParser->commitToDb();
} catch(MysqlException $e) {
	HC_debugLog('Caught mysql exception: ' . $e->getMessage());
	HC_errorLog('Caught mysql exception: ' . $e->getMessage());
} catch(Exception $e) {
	HC_debugLog('Caught exception: ' . $e->getMessage());
	HC_errorLog('Caught exception: ' . $e->getMessage());
}
 */

class UnsupportedElementError extends Exception {
	private $nodeName;
	public function  __construct($message, $nodeName) {
		parent::__construct($message);
		$this->nodeName = $nodeName;
	}

	public function  __toString() {
		return $this->message."\n Error: encountered unsupported node $this->nodeName when parsing document.";
	}
}

class KmlParser {
	//store required field of parsed object, for validation usage
	private $COLLECTION_REQUIRED_FIELDS = array("title", "objectTypeId", 
												"date_from", "date_to", "objectList",
												"creator", "view", "zoom"),
			$OBJECT_REQUIRED_FIELDS = array("title", "markerStyleId", 
											"objectTypeId", "latlngalt", 
											"date_from", "date_to",
											"creator", "view", "zoom", "kml",),

			$kml,		//SimpleXMLElement, 
			$kmlStr,	//string, kml content
			
			//root object parameters. Note: root could be document, folder, placemark
			$userId, 
			$title,
			$creator,
			$copyright,
			$collectionTimeFrom,
			$collectionTimeTo,
			$collectionId,
			$collectionMap,
			$view,
			$zoom,
			$objType,		//should be called mapType. It is used to determine 3d or 2d object
			$bound,			// boundary passed from client side, only for network links now
			$objectList = array(),//store parsed placemarks, folders, or documents
			$url,			//for 3D object we have to change local href to http href
			$unauthObjList = array();

	/**
	 * Construct the object
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
			case 0:
				$this->__callConstruct('__construct0', $args);
				break;
			case 11:
				$this->__callConstruct('__construct11', $args);
				break;
			default:
				throw new Exception("No constructor found.");
		}
	}

	public function __construct0() {
	
	}

	public function __construct11($userId, $title, $creator, $copyright, 
								$collectionTimeFrom, $collectionTimeTo, 
								$view, $zoom, $url, $objType, $bound) {
		$this->userId = $userId;
		$this->title = $title;
		$this->creator = $creator;
		$this->copyright = $copyright;
		$this->collectionTimeFrom = $collectionTimeFrom;
		$this->collectionTimeTo = $collectionTimeTo;
		$this->view = $view;
		$this->zoom = $zoom;
		$this->url = $url;
		$this->objType = $objType;
		$this->bound = $bound;
	}

	/**
	 * Deconstruct the object
	 */
	public function __deconstruct() {
	}
	
	//setters and getters 
	public function getObjectList() {
		return $this->objectList;
	}

	public function getUnauthObjList() {
		return $this->unauthObjList;
	}

	public function getCollectionId() {
		return $this->collectionId;
	}
	//end of setters and getters


	//private functions

	/**
	 * Dispatch handler to each node, currently only use it to find first document
	 * (document, folder, or placemark) node
	 * @param $node: kml root
	 * @return void
	 */
	private function elementHandler($node) {
		$name = $node->getName();
		
		if (strcasecmp($name, "kml") == 0) {
			foreach ($node as $child) {
				$this->elementHandler($child);
			}
		} else if (strcasecmp($name, "document") == 0) {
			$this->objectList[] = $this->parseDocument($node);
		} else if (strcasecmp($name, "folder") == 0) {
			$this->objectList[] = $this->parseFolder($node);
		} else if (strcasecmp($name, "placemark") == 0) {
			$this->objectList[] = $this->parsePlacemark($node);
		}
	}

	/** 
	 * Traverse the whole kml document, currently it simply call elementHandler()
	 * @param $node: the kml root
	 * @return void
	 */
	private function traverseKml($node) {
		$this->elementHandler($node);
	}
	
	/** 
	 * Parse the style from kml root
	 * @param $node: the root from which parse begins
	 * @return void
	 */
	private function parseStyle($node) {
		foreach ($node->xpath('//Style') as $style) {
			$this->styleMappingArray[$style["id"]] = array($node);
		}
		return;
		// TODO: dead code
		$name = $node->getName();
		
		if (strcasecmp($name, "style") == 0) {
			foreach($node->attributes() as $key => $value) {
				//$index is the id of style, without '#' ahead
				$index = (String)$value;
				$this->styleMappingArray[$index] = array($node);
			}
		}

		if ($node->children()) {
			foreach ($node->children() as $child) {
				$this->parseStyle($child);
			}
		}

	}
	
	/** 
	 * Parse styleMap
	 * @param $styleMap: a SimpleXMLElement object 
	 * @return $object array of styleMap and styles
	 */
	private function parseStyleMap($styleMap) {
		$object = array($styleMap);	//put $styleMap into an array

		foreach ($styleMap as $child) {
			$name = $node->getName();

			if (strcasecmp($name, "Pair") == 0) {
				$pair = $child;

				foreach($pair as $child) {
					$name = $node->getName();

					if (strcasecmp($name, "styleUrl") == 0) {
						$index = $this->parseStyleUrl($child);

						//every element in styleMappingArray is an array
						//if it is style, it will has only one element, so get first element
						$object[] = $this->styleMappingArray[$index][0];
					}
				}
			}
		}
	
		return $object;
	}

	/** 
	 * Parse style url
	 * @param $styleUrl: a SimpleXMLElement object
	 * @return $styleUrl: a string
	 */
	private function parseStyleUrl($styleUrl) {
		//if styleUrl starts with '#', store it without '#'
		//todo: if styleUrl does not start with '#', it may be a network link
		if (strcasecmp( substr((String)$styleUrl, 0, 1), "#") == 0)
			$styleUrl = substr((String)$styleUrl, 1);
		else
			$styleUrl = (string)$styleUrl;

		return $styleUrl;
	}
	
	/** 
	 * Parse point
	 * @param $point: a SimpleXMLElement object
	 * @return $result: an array 
	 */
	private function parsePoint($point) {
		/* to be removed
		if ($this->objType == HC_OBJECT_TYPE_MEDIA) {
			$result['type'] = HC_MARKER_POINT;
		}

		if ($this->objType == HC_OBJECT_TYPE_3D) {
			$result['type'] = HC_MARKER_3D_POINT;
		}
		 */

		// default settings, may be changed later (in precommit)
		$result['markerStyleId'] = HC_MARKER_POINT;
		$result['objectTypeId'] = HC_OBJECT_TYPE_MEDIA;

		foreach ($point as $child) {
			$name = $child->getName();

			$latLng = $this->parseCoordinates($child);
			$result = array_merge($result, $latLng);
		}

		return $result;
	}

	/** 
	 * Parse coordinates 
	 * @param $coordinate: a SimpleXMLElement object
	 * @return $result: an array 
	 */
	private function parseCoordinates($coordinate) {
		// save latlngalt string for generating kml
		$result["latLngAltStr"] = $coordinate;
		$token = preg_split("/[\s]+/", $coordinate);

		foreach( $token as $key => $value) {
			$pieces = explode(",", $value);

			if (count($pieces) > 1) {	// skip empty $pieces

				$temp['lng'] = (double)$pieces[0];
				$temp['lat'] = (double)$pieces[1];

				if (count($pieces) > 2)	$temp['alt'] = (double)$pieces[2];
				else $temp['alt'] = 0;
				
				$result["latlngalt"][] = $temp;
			}
		}	
		
		return $result;
	}

	/** 
	 * Parse LineString
	 * @param $lineString: a SimpleXMLElement object
	 * @return $result: an array 
	 */
	private function parseLineString($lineString) {
		/* to be removed
		if ($this->objType == HC_OBJECT_TYPE_MEDIA) {
			$result['type'] = HC_MARKER_LINE;
		}

		if ($this->objType == HC_OBJECT_TYPE_3D) {
			$result['type'] = HC_MARKER_3D_LINE;
		}
		 */

		// default settings, may be changed later (in precommit)
		$result['markerStyleId'] = HC_MARKER_LINE;
		$result['objectTypeId'] = HC_OBJECT_TYPE_MEDIA;

		foreach ($lineString as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "coordinates") == 0) {
				$latLng = $this->parseCoordinates($child);
				$result = array_merge($result, $latLng);
			}
		}

		return $result;
	}	
		
	/** 
	 * Parse polygon 
	 * @param $polygon: a SimpleXMLElement object
	 * @return $result: an array 
	 */
	private function parsePolygon($polygon) {
		/* to be removed
		if ($this->objType == HC_OBJECT_TYPE_MEDIA) {
			$result['type'] = HC_MARKER_POLYGON;
		}

		if ($this->objType == HC_OBJECT_TYPE_3D) {
			$result['type'] = HC_MARKER_3D_POLYGON;
		}
		 */

		// default settings, may be changed later (in precommit)
		$result['markerStyleId'] = HC_MARKER_POLYGON;
		$result['objectTypeId'] = HC_OBJECT_TYPE_MEDIA;

		foreach ($polygon as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "outerBoundaryIs") == 0) {
				$outerBoundaryIs = $child;

				foreach ($outerBoundaryIs as $child) {
					$name = $child->getName();
					
					if (strcasecmp($name, "LinearRing") == 0) {
						$linearRing = $child;

						foreach ($linearRing as $child) {
							$name = $child->getName();
							
							if (strcasecmp($name, "coordinates") == 0) {
								$latLng = $this->parseCoordinates($child);
								$result = array_merge($result, $latLng);
							}
						}
					}
				}
			}
		}	

		return $result;
	}


	/** 
	 * Parse MultiGeometry
	 * @param $multi: a SimpleXMLElement object
	 * @return $result: an array
	 */
	private function parseMultiGeometry($multi) {
		foreach ($multi as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "Point") == 0) {
				$result = $this->parsePoint($child);	
			} else if (strcasecmp($name, "LineString") == 0) {
				$result = $this->parseLineString($child);
			} else if (strcasecmp($name, "Polygon") == 0) {
				$result = $this->parsePolygon($child);	
			} else if (strcasecmp($name, "MultiGeometry") == 0)	{
				$result = $this->parseMultiGeometry($child);	
			}
		}

		return $result;
	}

	/** 
	 * Parse Location 
	 * @param $location: a SimpleXMLElement object
	 * @return $result: an array
	 */
	private function parseLocation($location) {
		
		foreach ($location as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "latitude") == 0) {
				$latlngalt['lat'] = (float)$child;
			} else if (strcasecmp($name, "longitude") == 0) {
				$latlngalt['lng'] = (float)$child;
			} else if (strcasecmp($name, "altitude") == 0) {
				$latlngalt['alt'] = (float)$child;
			}
			
		}

		$result["latlngalt"][] = $latlngalt; 
		$result["latLngAltStr"] = $latlngalt['lng'] . ","
								. $latlngalt['lat'] . ","
								. $latlngalt['alt'];

		return $result;
	}

	/** 
	 * Parse link for network link
	 * @param {SimpleXMLElement} $link: a reference of SimpleXMLElement object
	 * @return {String} $result: a url
	 */
	private function parseLink($link) {
		foreach ($link as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "href") == 0) {
				// change local file specification to http
				if (!preg_match("/^http:\/\//i", $child)) 
					return (string)$this->url.$child;

				return (string)$child;
			}
		}
	}

	/** 
	 * Parse Model
	 * @param $model: a SimpleXMLElement object
	 * @return $result: an array
	 */
	private function parseModel($model) {
		//3d object
		// $result['type'] = HC_MARKER_3D_MODEL;
		$result['markerStyleId'] = HC_MARKER_3D_MODEL;
		$result['objectTypeId'] = HC_OBJECT_TYPE_3D;
		$result['model'] = &$model;

		foreach ($model as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "location") == 0) {
				$location= $this->parseLocation($child);
				$result = array_merge($result, $location);
			} else if (strcasecmp($name, "link") == 0) {
				$child->href = $this->parseLink($child);
			}
		}		

		return $result;
	}

	
	/** 
	 * Parse TimeStamp
	 * @param $timestamp: a SimpleXMLElement object
	 * @return $result: an array
	 */
	private function parseTimeStamp($timestamp) {
		foreach ($timestamp as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "when") == 0) {
				if(strlen($child)==4) {
					$result['date_from'] = (string)$child . "-01-01 00:00:00";
					$result['date_to'] = (string)$child . "-12-31 23:59:59";
				} else {
					$result['date_from'] = (string)$timestamp->when;
					$result['date_to'] = (string)$timestamp->when;
				}
			}
		}	
		
		return $result;
	}
	
	/** 
	 * parse TimeSpan 
	 * @param $timespan: a SimpleXMLElement object
	 * @return $result: an array
	 */
	private function parseTimeSpan($timespan) {
		foreach ($timespan as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "begin") == 0) {
				$date = (string)$child;

				if (preg_match("/^-?(0?|[1-9]){4}$/", $date, $parts)) {
					// gYear (YYYY)
					$result['date_from'] = $date . "-01-01 00:00:00";
				} else if (preg_match("/^-?(0?|[1-9]){4}-(0?[1-9]|1[012])$/", $date, $parts)) {
					// gYearMonth (YYYY-MM)
					$result['date_from'] = $date.  "-01 00:00:00";
				} else {
					$result['date_from'] = $date;
				}
			} else if (strcasecmp($name, "end") == 0) {
				$date = (string)$child;

				if (preg_match("/^-?(0?|[1-9]){4}$/", $date, $parts)) {
					// gYear (YYYY)
					$result['date_to'] = $date . "-12-31 23:59:59";
				} else if (preg_match("/^-?(0?|[1-9]){4}-(0?[1-9]|1[012])$/", $date, $parts)) {
					// gYearMonth (YYYY-MM)
					$result['date_to'] = $date.  "-31 23:59:59";
				} else {
					$result['date_to'] = $date;
				}
			}
		}	

		return $result;
	}

	/**
	 * Parse the author
	 * @param {SimpleXMLElement} $author
	 * @return {string} $author 
	 */
	private function parseAuthor($author) {
		$creator = "";

		foreach ($author as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "name") == 0) {
				$creator = (string) $child;
			}
		}

		return $creator;
	}

	/** 
	 * Parse placemark and set collection's timespan
	 * @param $placemark: a SimpleXMLElement object
	 * @return $object: array, parsed object
	 */
	private function parsePlacemark($placemark) {

		/*
		$object['creator'] = $this->creator;
		$object['copyright'] = $this->copyright;
		$object['style'] = NULL;
		$object['model'] = NULL;
		 */
		$object['id'] = NULL;

		foreach ($placemark->attributes() as $key => $value) {
			if (strcasecmp($key, "id") == 0 && is_numeric((String)$value)) {
				// This placemark has an id, it should be updated
				 $object['id'] = (String)$value;

				if (!checkPrivilege($object['id'])) {
					// no privilege to update this object, save the object id and return
					$this->unauthObjList[] = $object['id'];
					$object['id'] = NULL;
					return;
				}
			}
		}

		foreach ($placemark->children("atom", true) as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "author") == 0) {
				$object['creator'] = $this->parseAuthor($child);
			}
		}

		if (isset($placemark->Style) && isset($placemark->Style['id'])) {
			$object['style'] = (string)$placemark->Style['id'];
		}

		foreach ($placemark as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "name") == 0)	{
				$object['title'] = (string)$child;
			} else if (strcasecmp($name, "description") == 0) {
				$object['content'] = (string)$child;
			} else if (strcasecmp($name, "styleUrl") == 0) {
				$object['style'] = (string)$this->parseStyleUrl($child);
			} else if (strcasecmp($name, "Point") == 0) {
				$result = $this->parsePoint($child);
				$object = array_merge($object, $result);
			} else if (strcasecmp($name, "LineString") == 0) {
				$result = $this->parseLineString($child);
				$object = array_merge($object, $result);
			} else if (strcasecmp($name, "Polygon") == 0) {
				$result = $this->parsePolygon($child);
				$object = array_merge($object, $result);
			} else if (strcasecmp($name, "Model") == 0) {
				$result = $this->parseModel($child);
				$object = array_merge($object, $result);
			} else if (strcasecmp($name, "TimeSpan") == 0) {
				$result = $this->parseTimeSpan($child);
				$object = array_merge($object, $result);
			} else if (strcasecmp($name, "TimeStamp") == 0) {
				$result = $this->parseTimeStamp($child);
				$object = array_merge($object, $result);
			} else if (strcasecmp($name, "LookAt") == 0) {
				$object['view'] = $child->asXML();
			} else if (strcasecmp($name, "Camera") == 0) {
				$object['view'] = $child->asXML();
			} else if (strcasecmp($name, "MultiGeometry") == 0)	{
				$result = $this->parseMultiGeometry($child);
				$object = array_merge($object, $result);
			} else {
				HC_debugLog("unknown tag " . $name);
			}
		}
		
		// for view-only object, create required fields
		if (!empty($object['view']) && empty($object['objectTypeId'])) {
			$object['objectTypeId'] = HC_OBJECT_TYPE_3D;
			$object['markerStyleId'] = HC_MARKER_3D_VIEW;
			//$object['type'] = HC_MARKER_3D_VIEW;
			$temp = simplexml_load_string($object['view']);

			$object['latlngalt'][] = array('lat' => (string)$temp->latitude,
											'lng' => (string)$temp->longitude,
											'alt' => 0);
		}

		if (is_null($object['title']))
			$object['title'] = "";

		/*
		//use user input view as default view
		if (empty($object['view'])) {
			$object['view'] = $this->view;
		}

		//if no timespan for object in kml, use collection timespan instead
		if (empty($object['date_from']) && !empty($this->collectionTimeFrom)) {
			$object['date_from'] = $this->collectionTimeFrom;
		}
		if (empty($object['date_to']) && !empty($this->collectionTimeTo)) {
			$object['date_to'] = $this->collectionTimeTo;
		}

		//use user input zoom as default view
		if (empty($object['zoom'])) {
			$object['zoom'] = $this->zoom;
		}

		//create kml for placemark
		if (!empty($object['type'])) {
			$kmlObj = new cKml($object['type'], $object['latLngAltStr'], 
								$object['title'], $object['style'], true,
								$this->styleMappingArray[$object['style']], 
								$object['model'], $object['view']);
			$kmlObj->createKml();
			$object['kml'] = $kmlObj->dumpKml();
			$object['kml'] = preg_replace("/\n/", '', $object['kml']);
		}
		*/

		return $object;
	}
	
	/**
	 * Parse network link as external object (kml or 3d kml)
	 * @param {SimpleXMLElement} $networkLink: the network link element
	 * @return {array} $object: the parsed external object
	 */
	private function parseNetworkLink($networkLink) {
		/*
		$object['creator'] = $this->creator;
		$object['copyright'] = $this->copyright;
		$object['style'] = NULL;
		$object['model'] = NULL;
		 */
		$object['markerStyleId'] = HC_MARKER_EMPTY;
		$object['objectTypeId'] = HC_OBJECT_TYPE_KML;

		foreach ($networkLink as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "name") == 0)	{
				$object['title'] = (string)$child;
			} else if (strcasecmp($name, "description") == 0) {
				$object['content'] = (string)$child;
			} else if (strcasecmp($name, "styleUrl") == 0) {
				$object['style'] = (string)$this->parseStyleUrl($child);
			} else if (strcasecmp($name, "TimeSpan") == 0) {
				$result = $this->parseTimeSpan($child);
				$object = array_merge($object, $result);
			} else if (strcasecmp($name, "TimeStamp") == 0) {
				$result = $this->parseTimeStamp($child);
				$object = array_merge($object, $result);
			} else if (strcasecmp($name, "LookAt") == 0) {
				$object['view'] = $child->asXML();
			} else if (strcasecmp($name, "Camera") == 0) {
				$object['view'] = $child->asXML();
			} else if (strcasecmp($name, "Link") == 0) {
				$object['kml'] = $this->parseLink($child);
			} else {
				HC_debugLog("unknown tag " . $name);
			}
		}

		if (is_null($object['title']))
			$object['title'] = "";

		/*
		//if no timespan for object in kml, use collection timespan instead
		if (empty($object['date_from']) && !empty($this->collectionTimeFrom)) {
			$object['date_from'] = $this->collectionTimeFrom;
		}
		if (empty($object['date_to']) && !empty($this->collectionTimeTo)) {
			$object['date_to'] = $this->collectionTimeTo;
		}
		
		//use user input view as defaul view
		if (empty($object['view'])) {
			$object['view'] = $this->view;
		}

		//use user input zoom as defaul view
		if (empty($object['zoom'])) {
			$object['zoom'] = $this->zoom;
		}
		*/

		return $object;
	}

	/** 
	 * Parse document
	 * @param $document: a SimpleXMLElement object, document root node
	 * @return $collection: an array containing all information
	 */	 
	private function parseDocument($document) {

		$collection = array();
		//collection parameters
		/*
		$collection['id'] = NULL;
		$collection['title'] = $this->title;
		$collection['description'] = NULL;
		$collection['creator'] = $this->creator;
		$collection['copyright'] = $this->copyright;
		$collection['userId'] = $this->userId;
		$collection['date_from'] = $this->collectionTimeFrom;	
		$collection['date_to'] = $this->collectionTimeTo;	
		$collection['view'] = NULL;
		 */
		$collection['objectTypeId'] = HC_OBJECT_TYPE_COLLECTION;	
		$collection['objectList'] = array();

		// try to find collection id first (for updating)
		if ($document['id']) {
			$collection["id"] = (String)$document["id"];
		}
		/*
		foreach ($document->attributes() as $key => $value) {
			if (strcasecmp($key, "id") == 0) {
				// This collection has an id, it should be updated
				// but skip it for now
				if (is_numeric($value)) $collection['id'] = (string)$value;
			}
		}*/

		foreach ($document as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "name") == 0) {
				$collection['title'] = (string)$child;
			} else if (strcasecmp($name, "description") == 0) {
				$collection['description'] = (string)$child;
			} else if (strcasecmp($name, "TimeSpan") == 0) {
				$result = $this->parseTimeSpan($child);
				$collection = array_merge($collection, $result);
			} else if (strcasecmp($name, "TimeStamp") == 0) {
				$result = $this->parseTimeStamp($child);
				$collection = array_merge($collection, $result);
			} else if (strcasecmp($name, "LookAt") == 0) {
				$collection['view'] = $child->asXML();
			} else if (strcasecmp($name, "Camera") == 0) {
				$collection['view'] = $child->asXML();
			} else if (strcasecmp($name, "map") == 0) {
				$collection['map'] = (string)$child;
			} else if (strcasecmp($name, "Style") == 0) {
				//	
			} else if (strcasecmp($name, "styleUrl") == 0) {
				//	
			} else if (strcasecmp($name, "NetworkLink") == 0) {
				$object = $this->parseNetworkLink($child);
				if (!empty($object))
					$collection['objectList'][] = $object;
			} else if (strcasecmp($name, "Placemark") == 0) {
				$object = $this->parsePlacemark($child);
				if (!empty($object))
					$collection['objectList'][] = $object;
			} else if (strcasecmp($name, "Folder") == 0) {
				$object = $this->parseFolder($child);
				if (!empty($object))
					$collection['objectList'][] = $object;
			}
		}
	
		/*
		//use user input view as defaul view
		if (empty($collection['view'])) {
			$collection['view'] = $this->view;
		}

		$collection = $this->validate($collection, $this->COLLECTION_REQUIRED_FIELDS);
		 */

		return $collection;
	}

	/** 
	 * Parse Folder
	 * @param $child: SimpleXMLElement Folder node
	 * @return $collection: an array
	 */
	private function parseFolder($folder) {
		//collection parameters
		/*
		$collection['title'] = NULL;
		$collection['description'] = NULL;
		$collection['creator'] = $this->creator;
		$collection['copyright'] = $this->copyright;
		$collection['userId'] = $this->userId;
		$collection['objectTypeId'] = HC_OBJECT_TYPE_COLLECTION;	
		$collection['date_from'] = $this->collectionTimeFrom;	
		$collection['date_to'] = $this->collectionTimeTo;	
		$collection['view'] = NULL;	
		 */
		$collection['objectTypeId'] = HC_OBJECT_TYPE_COLLECTION;	
		$collection['objectList'] = array();

		if ($folder['id'] && is_numeric($folder['id'])) {
			$collection["id"] = (String)$folder["id"];
		}
		foreach ($folder as $child) {
			$name = $child->getName();

			if (strcasecmp($name, "name") == 0) {
				$collection['title'] = (string)$child;
			} else if (strcasecmp($name, "description") == 0) {
				$collection['description'] = (string)$child;
			} else if (strcasecmp($name, "TimeSpan") == 0) {
				$result = $this->parseTimeSpan($child);
				$collection = array_merge($collection, $result);
			} else if (strcasecmp($name, "TimeStamp") == 0) {
				$result = $this->parseTimeStamp($child);
				$collection = array_merge($collection, $result);
			} else if (strcasecmp($name, "LookAt") == 0) {
				$collection['view'] = $child->asXML();
			} else if (strcasecmp($name, "Camera") == 0) {
				$collection['view'] = $child->asXML();
			} else if (strcasecmp($name, "Style") == 0)	{
				//	
			} else if (strcasecmp($name, "styleUrl") == 0) {
				//	
			} else if (strcasecmp($name, "NetworkLink") == 0) {
				$object = $this->parseNetworkLink($child);
				if (!empty($object))
					$collection['objectList'][] = $object;
			} else if (strcasecmp($name, "Placemark") == 0) {
				$object = $this->parsePlacemark($child);
				if (!empty($object))
					$collection['objectList'][] = $object;
			} else if (strcasecmp($name, "Folder") == 0) {
				$object = $this->parseFolder($child);
				if (!empty($object))
					$collection['objectList'][] = $object;
			}
		}

		/*
		//use user input view as defaul view
		if (empty($collection['view'])) {
			$collection['view'] = $this->view;
		}
		
		$collection = $this->validate($collection, $this->COLLECTION_REQUIRED_FIELDS);
		 */

		return $collection;
	}

	/** 
	 * Check if parse success
	 * @param $object: an object that needs to be validated. Timespan will be modified if
	 * it is not valid.
	 * @return void 
	 */
	private function validate(&$object, $required) {
		if (empty($object)) {
			//throw new Exception("Parse error!! No object parsed.");
			$msg = "Parse Warning: Empty object. No objects parsed.";
			trigger_error($msg, E_USER_WARNING);
			return NULL;
		}

		//check if object has required field
		$keys = array_keys($object);
		$diff = array_diff($required, $keys);

		if (!empty($diff)) {
			$field = current($diff);
			$msg = "Parse Warning: Required field $field missing in object. Object not parsed.";
			trigger_error($msg, E_USER_WARNING);
			return NULL;
		}

		//check if object has required field with null value
		foreach ($object as $field => $value) {
			if (array_search($field, $required) && is_null($value)) {
				$msg = "Parse Warning: Field $field missing value. Object not parsed.";
				trigger_error($msg, E_USER_WARNING);
				return NULL;
			}
		}

		//check if the date in object is valid
		if (isset($object['date_from'])) {
			if (!HCDate::validateDate($object['date_from'])) {
				if (HCDate::validateDate($this->collectionTimeFrom)) {
					$msg = "Warning: Placemark $object[title] has invalid start time '$object[date_from]'."
						 . "Using user-specified timespan $this->collectionTimeFrom instead.";
					$object['date_from'] = $this->collectionTimeFrom; 
					trigger_error($msg, E_USER_WARNING);
					return NULL;
				} else {
					$msg = "Parse Error: Placemark $object[title] has invalid timespan $object[date_from]."
						 . "User-specified timespan '$this->collectionTimeFrom' is invalid.";
					throw new Exception($msg);
					return NULL;
				}
			}
		}

		if (isset($object['date_to'])) {
			if (!HCDate::validateDate($object['date_to'])) {
				if (HCDate::validateDate($this->collectionTimeTo)) {
					$msg = "Parse Warning: Placemark $object[title] has invalid end time '$object[date_to]' ."
						 . "Using user-specified timespan '$this->collectionTimeTo' instead.";
					$object['date_to'] = $this->collectionTimeTo; 
					trigger_error($msg, E_USER_WARNING);
					return NULL;
				} else {
					$msg = "Parse Error: Placemark $object[title] has invalid end time $object[title]."
						 . "User-specified timespan '$this->collectionTimeTo' is invalid.";
					throw new Exception($msg);
					return NULL;
				}
			}
		}
	}

	//end of private functions

	// public functions
	/**
	 * Parse Kml string
	 * @param String kmlStr: the kml string needs to be parsed
	 * @return Boolean: true if one or more objects parsed successfully
	 *					false if no object parsed successfully
	 */
	public function parseKml($kmlStr) {
		//we only support the following encoding
		$encoding = mb_detect_encoding($kmlStr, "ASCII, UTF-8, ISO-8859-1");

		if (!$encoding) {
			throw new Exception("Parse error: This file's character encoding "
							. "is not supported by HyperCities.\n"
							. "Please use your editor to change the character"
							. "encoding to ASCII, UTF-8 or ISO-8859-1.");
		}

		//convert input string to UTF-8 if it is not UTF-8 encoded
		if (strcasecmp($encoding, "UTF-8") != 0) {
			$kmlStr= iconv($encoding, "UTF-8//TRANSLIT", $kmlStr);

			if (!$kmlStr) {
				throw new Exception("Error: Error while translating this file to"
								. "	UTF-8 encoding.\n Please make sure your file"
								. "is in one of the following character encodings:"
								. "	ASCII, UTF-8 or ISO-8859-1");
			}
		}

		$this->kmlStr = $kmlStr;

		try {
			$this->kml = new SimpleXMLElement($this->kmlStr);
		} catch (Exception $e) {
			$error = libxml_get_last_error();
		    libxml_clear_errors();
			throw new Exception("Parse Error: ".$e->getMessage()."\n".$error->message);
		}

		/*
		if (isset($this->kml->Document->NetworkLink)
			&& $this->kml->Document->count() == count($this->kml->Document->NetworkLink)
			) {
			throw new UnsupportedElementError("Found file with only NetworkLinks.",
				'NetworkLink'
			);
		}
		 */

		//traverse kml and parse style first
		$this->parseStyle($this->kml);

		//then traverse kml and parse other elements
		$this->traverseKml($this->kml);

		return true;
	}

	/**
	 * Set metadata passed from client. This information is used to insert new objects.
	 * @param
	 * @return void
	 */
	public function setMetadata($userId, $title, $creator, $copyright, 
								$collectionTimeFrom, $collectionTimeTo, 
								$view, $zoom, $url, $objType, $bound) {
		$this->userId = $userId;
		$this->title = $title;
		$this->creator = $creator;
		$this->copyright = $copyright;
		$this->collectionTimeFrom = $collectionTimeFrom;
		$this->collectionTimeTo = $collectionTimeTo;
		$this->view = $view;
		$this->zoom = $zoom;
		$this->url = $url;
		$this->objType = $objType;
		$this->bound = $bound;
	}

	/**
	 * Set object information using metadata
	 * @param {Object} $object
	 * @return void
	 */
	private function precommitObject(&$object, $index) {

		if (!isset($object['creator'])) {
			$object['creator'] = $this->creator;
		}
		if (!isset($object['date_from'])) {
			$object['date_from'] = $this->collectionTimeFrom;
		}
		if (!isset($object['date_to'])) {
			$object['date_to'] = $this->collectionTimeTo;
		}
		if (!isset($object['view']) && $index == 0) {
			// set the view that a user sets in preview only to the first object
			$object['view'] = $this->view;
		}
		if (!isset($object['zoom'])) {
			$object['zoom'] = $this->zoom;
		}
		if (!isset($object['style'])) {
			$object['style'] = NULL;
		}
		if (!isset($object['model'])) {
			$object['model'] = NULL;
		}

		// if the map type is 3D
		if ($this->objType == HC_OBJECT_TYPE_3D) {
			switch ($object['markerStyleId']) {
				case HC_MARKER_POINT:
					$object['markerStyleId'] = HC_MARKER_3D_POINT;
					break;
				case HC_MARKER_LINE:
					$object['markerStyleId'] = HC_MARKER_3D_LINE;
					break;
				case HC_MARKER_POLYGON:
					$object['markerStyleId'] = HC_MARKER_3D_POLYGON;
					break;
				case HC_MARKER_:
					$object['markerStyleId'] = HC_MARKER_3D_POLYGON;
					break;
			}

			switch ($object['objectTypeId']) {
				case HC_OBJECT_TYPE_MEDIA:
					$object['objectTypeId'] = HC_OBJECT_TYPE_3D;
					break;
				case HC_OBJECT_TYPE_KML:
					$object['objectTypeId'] = HC_OBJECT_TYPE_3D_NETWORKLINK;
					$object['latlngalt'] = array(array("lat" => $this->bound['north'],
													   "lng" => $this->bound['east']),
												 array("lat" => $this->bound['south'], 
													   "lng" => $this->bound['west']));


					break;
			}
		}
		
		//create kml for placemark
		$useStyle = isset($this->styleMappingArray[$object['style']]);
		$styleContent = ($useStyle) ? $this->styleMappingArray[$object['style']]:NULL;
		$kmlObj = new cKml($object['markerStyleId'], $object['latLngAltStr'], 
			$object['title'], $object['style'], $useStyle,
			$styleContent, $object['model'], $object['view']);
		$kmlObj->createKml();
		$object['kml'] = $kmlObj->dumpKml();
		$object['kml'] = preg_replace("/\n/", '', $object['kml']);

		$this->validate($object, $this->OBJECT_REQUIRED_FIELDS);
	}

	/**
	 * Set collection information using metadata
	 * @param {Object} $collection
	 * @return void
	 */
	private function precommitCollection(&$collection) {
		// this will set the title of all collections which do not 
		// have titles to the title provided by user
		if (!empty($this->title) && empty($collection['title'])) {
			$collection['title'] = $this->title;
		}
		if (!empty($this->creator) && empty($collection['creator'])) {
			$collection['creator'] = $this->creator;
		}
		if (!empty($this->collectionTimeFrom) && empty($collection['date_from'])) {
			$collection['date_from'] = $this->collectionTimeFrom;
		}
		if (!empty($this->collectionTimeTo)&& empty($collection['date_to'])) {
			$collection['date_to'] = $this->collectionTimeTo;
		}
		if (!isset($collection['view'])) {
			$collection['view'] = $this->view;
		}
		if (!isset($collection['zoom'])) {
			$collection['zoom'] = $this->zoom;
		}

		$this->validate($collection, $this->COLLECTION_REQUIRED_FIELDS);

		foreach ($collection['objectList'] as $index => &$object) {
			if ($object['objectTypeId'] == HC_OBJECT_TYPE_COLLECTION) {
				$this->precommitCollection($object);
			} else {
				$this->precommitObject($object, $index);
			}
		}
	}

	/**
	 * Apply metadata to each object. If an object misses a required field,
	 * use the information in metadata. Otherwise it will not pass validation.
	 * @return {boolean} true if it passed validation, otherwise false.
	 */
	public function precommit() {
		foreach ($this->objectList as $index => &$object) {
			if ($object['objectTypeId'] == HC_OBJECT_TYPE_COLLECTION) {
				$this->precommitCollection($object);
			} else {
				$this->precommitObject($object, $index);
			}
		}
	}

	/**
	 * Commit object to database
	 * @param $object: an array
	 * @return $result: an array containing objectId, objectMappingId
	 */
	private function commitObject($object) {
		//object specific parameters
		$id = $object['id'];
		$title = $object['title'];
		$content = !empty($object['content'])  ? $object['content'] : "<i>(no content)</i>";
		$style = $object['style'];
		$creator = $object['creator'];
		$copyright = $object['copyright'];
		$latlngalt = $object['latlngalt'];
		$dateFrom = $object['date_from'];
		$dateTo = $object['date_to'];			
		$view = $object['view'];
		$zoom = $object['zoom'];
		$objectTypeId = $object['objectTypeId'];
		$kml = $object['kml'];
		$markerStyleId = $object['markerStyleId'];

		if (!empty($id)) {
			// this object only contains fields that are allowed to update
			$updatedObj = array(
				"creator" => $creator,
				"title" => $title,
			);
			update("objects", $updatedObj, "id = $id");

			$updatedObjMapping = array(
				"kml" => $kml,
				"date_from" => $dateFrom,
				"date_to" => $dateTo
			);
			update("object_mappings", $updatedObjMapping, "object_id = $id");

			$result['objectId'] = $id;
		} else {
			$objectId = insertObject($title, $objectTypeId, $content, $creator, 
				$copyright, "NOW()", $this->userId);
			$objectMappingId = insertObjectMapping($objectId, $markerStyleId, 
				$kml, $dateFrom, $dateTo, 
				$latlngalt, "NOW()", $view,
				$zoom);
			$result = array("objectId" => $objectId, "objectMappingId" => $objectMappingId);
		}

		return $result;
	}

	/** 
	 * Commit collection to database
	 * @param $collection: an array
	 * @return $result: an array containing collectionId
	 */
	private function commitCollection($collection) {
		$objectIdArray = array();

		//for each object, insert into DB
		foreach($collection['objectList'] as $object) {
			if ($object['objectTypeId'] == HC_OBJECT_TYPE_MEDIA 
				|| $object['objectTypeId'] == HC_OBJECT_TYPE_3D 
				|| $object['objectTypeId'] == HC_OBJECT_TYPE_KML 
				|| $object['objectTypeId'] == HC_OBJECT_TYPE_3D_NETWORKLINK) {
				$result = $this->commitObject($object);
				$objectIdArray[] = $result['objectId'];
			} else if ($object['objectTypeId'] == HC_OBJECT_TYPE_COLLECTION) {
				$result = $this->commitCollection($object);
				$objectIdArray[] = $result['collectionId'];
			}
	   	}

		if (!empty($collection['id'])) {
			// this collection needs to be updated, but skip it for now
		
			$result['collectionId'] = $collection['id'];
			HC_debugLog("Found an existing collection $collection[id].");
		} else {
			//insert collection
			$result = insertCollection($collection['title'], $collection['description'],
				$collection['creator'], $collection['copyright'], 
				"NOW()", $this->userId, '', 
				$collection['date_from'], $collection['date_to'],
				NULL, NULL, NULL, NULL, $collection['view'], 
				NULL, HC_OBJECT_PUBLIC);

			if (!empty($collection['objectList']) && !empty($objectIdArray) ) {
				//insert into object_relation table 
				$result2 = insertObjectRelations($objectIdArray, $result['collectionId'], 
					$this->userId, "NOW()");
			} else {
				HC_debugLog("No objects in collection \"".$collection['title']."\"");
			}

			//calculate and update collection time and boundary;
			$this->boundary = calculateCollectionBoundaryR($result['collectionId'], true);
			$this->timespan = calculateCollectionTimespanR($result['collectionId'], true);
		}

		return $result;
	}

	/** 
	 * Commit parsed data to database
	 * @return void
	 */
	public function commitToDb() {
		if (empty($this->objectList)) {
			throw new Exception("No objects in this file. Please check"
							. " that this file contains valid KML. \n"
						    . "Please note <Placemark> must be contained"
							. " in <Document>.");
		}

		$ids = array();
		foreach ($this->objectList as $object) {
			if ($object['objectTypeId'] == HC_OBJECT_TYPE_COLLECTION) {
				$result = $this->commitCollection($object);
				$ids[] = $result['collectionId'];
			} else {
				$result = $this->commitObject($object);
				$ids[] = $result['objectId'];
			}
		}

		return $ids;
	}

	//end of public functions


	//static functions
	/** 
	 * Create view from array
	 * @param array $viewArray
	 * @return String: <Camera> tag
	 */
	public static function createViewFromArray($viewArray) {

		if (empty($viewArray['lat'])) $viewArray['lat'] = 0;
		if (empty($viewArray['lng'])) $viewArray['lng'] = 0;
		if (empty($viewArray['alt'])) $viewArray['alt'] = 0;
		if (empty($viewArray['heading'])) $viewArray['heading'] = 0;
		if (empty($viewArray['tilt'])) $viewArray['tilt'] = 0;
		if (empty($viewArray['roll'])) $viewArray['roll'] = 0;

		$view = KmlParser::createView($viewArray['lat'], $viewArray['lng'], 
								$viewArray['alt'], $viewArray['roll'],
								$viewArray['tilt'], $viewArray['heading']);
		return $view;
	}

	/** 
	 * Create view
	 * @param {Number} $lat
	 * @param {Number} $lng 
	 * @param {Number} $alt 
	 * @param {Number} $roll
	 * @param {Number} $tilt 
	 * @param {Number} $heading
	 * @return string: <Camera> tag
	 */
	public static function createView($lat, $lng, $alt, $roll, $tilt, $heading) {

		//default values
		if (empty($roll)) $roll= 0;
		if (empty($tilt)) $tilt = 0;
		if (empty($heading)) $heading = 0;

		$view = '<Camera>';
		$view .= '<longitude>'.$lng.'</longitude>';
		$view .= '<latitude>'.$lat.'</latitude>';
		$view .= '<altitude>'.$alt.'</altitude>';
		$view .= '<roll>'.$roll.'</roll>';
		$view .= '<tilt>'.$tilt.'</tilt>';
		$view .= '<heading>'.$heading.'</heading>';
		$view .= '<altitudeMode>absolute</altitudeMode>';
		$view .= '</Camera>';
		return $view;
	}
	
	/** 
	 * Set view
	 * @param viewString: the kml string of view
	 * @param $lat, $lng, $alt, $range, $tilt, $heading
	 */
	public static function setView($viewString, $lat, $lng, $alt, $range, 
								$tilt, $heading) {
		$view = new SimpleXMLElement($viewString);
		if (!empty($lat))
			$view->latitude = $lat;
		if (!empty($lng))
			$view->longitude = $lng;
		if (!empty($alt))
			$view->altitude = $alt;
		if (!empty($range))
			$view->range = $range;
		if (!empty($tilt))
			$view->tilt = $tilt;
		if (!empty($heading))
			$view->heading = $heading;
			
		return $view->asXML();
	}

	//end of static functions
}
?>
