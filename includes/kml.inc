<?php
class cKml
{
	private $type, 
			$latlng, 
			$kmlOutput, 
			$title, 
			$desc, 
			$style, 
			$styleContent, 
			$usestyle,
			$model, 
			$view;

	//constructor overloading
	public function __construct() {
        $num = func_num_args();
        $args = func_get_args();
        switch($num){
			case 1:
				$this->__callConstructor('__construct1', $args);
				break;
			case 8:
				$this->__callConstructor('__construct8', $args);
				break;
			default:
				throw new Exception("No construct found.");
        }
    }

    public function __construct1($args){
    	$kml = new SimpleXMLElement($args);
		$this->traverseKml($kml);
	}

	/**
	 * constructor of cKml
	 * @param string $type:
	 * @param string $latlng: the string e.g., 34,118,0 35,119,0
							or an array ["34, 118, 0", "35, 119, 0"]
	 * @param string $title: 
	 * @param string $style: the style name
	 * @param SimpleXMLElement $styleContent:
	 * @param boolean $usestyle:
	 * @param well-formed xml string or SimpleXMLElement $model: 
	 * @param well-formed xml string or SimpleXMLElement $view:
	 */
	public function __construct8($type, $latlng, $title, $style, $usestyle, 
					$styleContent, $model, $view) {
		$this->type = $type;

		if (is_array($latlng)) {
			$temp1 = array();
			foreach ($latlng as $coord) {
				// Keep in mind the format of coordinates! (lng, lat, alt)
				$temp = array();
				$temp[] = $coord['lng'];
				$temp[] = $coord['lat'];
				$temp[] = $coord['alt'];
				$temp1[] = implode(',', $temp);
			}
			$this->latlng = implode(' ', $temp1);
		} else $this->latlng = $latlng;

		$this->title = $title;
		$this->style = (empty($style)) ? NULL : $style;
		$this->usestyle = (empty($usestyle)) ? NULL : $usestyle;
		
		//$styleContent is an array store all styles
		//such as style, styleMap
		$this->styleContent = (empty($styleContent)) ? NULL : $styleContent;
		
		//convert string to SimpleXMLElement
		if (!empty($model) && is_string($model))
			$model = new SimpleXMLElement($model);
		$this->model = $model;	//for 3d object
		
		if (!empty($view) && is_string($view))
			$view = new SimpleXMLElement($view);
		$this->view = $view;	//view of object in earth mode
	}

    private function __callConstructor($name, $arg) {
        return call_user_func_array(array($this, $name), $arg);
	}

	public function createKml() {

		switch($this->type)	{
			case HC_MARKER_POINT:
			case HC_MARKER_3D_POINT:
				// Creates the Document.
				$dom = new DOMDocument('1.0', 'UTF-8');
				// Creates the root KML element and appends it to the root document.
				$node = $dom->createElementNS('http://www.opengis.net/kml/2.2', 'kml');
				$parNode = $dom->appendChild($node);
				$node = $dom->createElement('Placemark');
				$placeNode = $parNode->appendChild($node);
				// Create name, and description elements and assigns them the 
				// values of the name and address columns from the results.
				$nameNode = $dom->createElement('name', $this->title);
				$placeNode->appendChild($nameNode);
				$descNode = $dom->createElement('description', $this->desc);
				$placeNode->appendChild($descNode);
				//create style
				if($this->usestyle) {
					$nodeStyle = $dom->createElement('styleUrl', '#'.$this->style);
					$placeNode->appendChild($nodeStyle);
				}
			
				if($this->usestyle)	{
					foreach ($this->styleContent as $key => $value)	{
						$domnode = dom_import_simplexml($value);
						$domnode = $dom->importNode($domnode, true);
						$placeNode->appendChild($domnode);
					}
				}

				// Creates a Point element.
				$pointNode = $dom->createElement('Point');
				$placeNode->appendChild($pointNode);
				// Creates a coordinates element and gives it the value of 
				// the lng and lat columns from the results.
				$coorNode = $dom->createElement('coordinates', $this->latlng);
				$pointNode->appendChild($coorNode);
				
				if (!empty($this->view)) {
					$domnode = dom_import_simplexml($this->view);
					$domnode = $dom->importNode($domnode, true);
					$node->appendChild($domnode);
				}

				$this->kmlOutput = $dom->saveXML();
				
			break;

			case HC_MARKER_LINE:
			case HC_MARKER_3D_LINE:
				$dom = new DOMDocument('1.0', 'UTF-8');
				$node = $dom->createElementNS('http://www.opengis.net/kml/2.2', 'kml');
				$parNode = $dom->appendChild($node);
				$node = $dom->createElement('Placemark');
				$placeNode = $parNode->appendChild($node);
				$nameNode = $dom->createElement('name', $this->title);
				$placeNode->appendChild($nameNode);
				$node = $dom->createElement('description', $this->desc);
				$parNode->appendChild($node);
				//create style
				if($this->usestyle)	{
					$nodeStyle = $dom->createElement('styleUrl', '#'.$this->style);
					$placeNode->appendChild($nodeStyle);
				} else {
					$styleNode = $dom->createElement('styleUrl', '#redLine');
					$placeNode->appendChild($styleNode);
				}

				if($this->usestyle) {
					foreach ($this->styleContent as $key => $value)	{
						$domnode = dom_import_simplexml($value);
						$domnode = $dom->importNode($domnode, true);
						$placeNode->appendChild($domnode);
					}
				} else {
					$node = $dom->createElement('Style');
					$node->setAttribute('id', 'redLine');
					$StyleNode = $parNode->appendChild($node);
					$node = $dom->createElement('LineStyle');
					$lineStyle = $StyleNode->appendChild($node);
					$colorNode = $dom->createElement('color', '7f0000ff');
					$lineStyle->appendChild($colorNode);
					$widthNode = $dom->createElement('width', '5');
					$lineStyle->appendChild($widthNode);
				}

				$descNode = $dom->createElement('description', $this->desc);
				$placeNode->appendChild($descNode);
				$LineStringNode = $dom->createElement('LineString');
				$placeNode->appendChild($LineStringNode);
				$altNode = $dom->createElement('altitudeMode', 'absolute');
				$LineStringNode->appendChild($altNode);
				$coorNode = $dom->createElement('coordinates', $this->latlng);

				$LineStringNode->appendChild($coorNode);
				
				if (!empty($this->view)) {
					$domnode = dom_import_simplexml($this->view);
					$domnode = $dom->importNode($domnode, true);
					$node->appendChild($domnode);
				}
				$this->kmlOutput = $dom->saveXML();
	
			break;

			case HC_MARKER_POLYGON:
			case HC_MARKER_3D_POLYGON:
				$dom = new DOMDocument('1.0', 'UTF-8');
				$node = $dom->createElementNS('http://www.opengis.net/kml/2.2', 'kml');
				$parNode = $dom->appendChild($node);
				$node = $dom->createElement('Placemark');
				$placeNode = $parNode->appendChild($node);
				$nameNode = $dom->createElement('name', $this->title);
				$placeNode->appendChild($nameNode);
				//create style
				if($this->usestyle)	{
					$nodeStyle = $dom->createElement('styleUrl', '#'.$this->style);
					$placeNode->appendChild($nodeStyle);
				} else {
					$styleNode = $dom->createElement('styleUrl', '#transRedPoly');
					$placeNode->appendChild($styleNode);
				}

				if($this->usestyle)	{
					foreach ($this->styleContent as $key => $value)	{
						$domnode = dom_import_simplexml($value);
						$domnode = $dom->importNode($domnode, true);
						$placeNode->appendChild($domnode);
					}
				} else {
					$node = $dom->createElement('style');
					$node->setAttribute('id', 'transRedpoly');
					$stylenode = $parNode->appendChild($node);
					$node = $dom->createElement('linestyle');
					$linestyle = $stylenode->appendChild($node);
					$widthnode = $dom->createElement('width', '1.5');
					$linestyle->appendChild($widthnode);
					$node = $dom->createElement('polystyle');
					$polystyle = $stylenode->appendChild($node);
					$colornode = $dom->createElement('color', '7d0000ff');
					$polystyle->appendChild($colornode);
				}

				$node = $dom->createElement('Polygon');
				$polyNode = $placeNode->appendChild($node);
				$extrudeNode = $dom->createElement('extrude', '1');
				$polyNode->appendChild($extrudeNode);
				$altModeNode = $dom->createElement('altitudeMode', 'relativeToGround');
				$polyNode->appendChild($altModeNode);
				$outBoundNode = $dom->createElement('outerBoundaryIs');
				$polyNode->appendChild($outBoundNode);
				$LinearRingNode = $dom->createElement('LinearRing');
				$outBoundNode->appendChild($LinearRingNode);
				$coorNode = $dom->createElement('coordinates', $this->latlng);
				$LinearRingNode->appendChild($coorNode);
				
				if (!empty($this->view)) {
					$domnode = dom_import_simplexml($this->view);
					$domnode = $dom->importNode($domnode, true);
					$placeNode->appendChild($domnode);
				}

				$this->kmlOutput = $dom->saveXML();
			break;
			
			case HC_MARKER_3D_MODEL:
				// Creates the Document.
				$dom = new DOMDocument('1.0', 'UTF-8');
				// Creates the root KML element and appends it to the root document.
				$node = $dom->createElementNS('http://www.opengis.net/kml/2.2', 'kml');
				$parNode = $dom->appendChild($node);
				$node = $dom->createElement('Placemark');
				$placeNode = $parNode->appendChild($node);
				// Create name, and description elements and assigns them the 
				// values of the name and address columns from the results.
				$nameNode = $dom->createElement('name', $this->title);
				$placeNode->appendChild($nameNode);
				$descNode = $dom->createElement('description', $this->desc);
				$placeNode->appendChild($descNode);

				//create style
				if($this->usestyle) {
					$nodeStyle = $dom->createElement('styleUrl', '#'.$this->style);
					$placeNode->appendChild($nodeStyle);
				}
				if($this->usestyle && !empty($this->styleContent)) {
					foreach ($this->styleContent as $key => $value)	{
						$domnode = dom_import_simplexml($value);
						$domnode = $dom->importNode($domnode, true);
						$placeNode->appendChild($domnode);
					}
				}
				
				if (!empty($this->model)) {
					$domnode = dom_import_simplexml($this->model);
					$domnode = $dom->importNode($domnode, true);
					$placeNode->appendChild($domnode);
				}

				if (!empty($this->view)) {
					$domnode = dom_import_simplexml($this->view);
					$domnode = $dom->importNode($domnode, true);
					$placeNode->appendChild($domnode);
				}
				
				$this->kmlOutput = $dom->saveXML();
			break;
			case HC_MARKER_3D_VIEW:
				// Creates the Document.
				$dom = new DOMDocument('1.0', 'UTF-8');
				// Creates the root KML element and appends it to the root document.
				$node = $dom->createElementNS('http://www.opengis.net/kml/2.2', 'kml');
				$parNode = $dom->appendChild($node);

				if($this->usestyle && !empty($this->styleContent)) {
					foreach ($this->styleContent as $key => $value)	{
						$domnode = dom_import_simplexml($value);
						$domnode = $dom->importNode($domnode, true);
						$parNode->appendChild($domnode);
					}
				}

				$node = $dom->createElement('Placemark');
				$placeNode = $parNode->appendChild($node);
				// Create name, and description elements and assigns them the 
				// values of the name and address columns from the results.
				$nameNode = $dom->createElement('name', $this->title);
				$placeNode->appendChild($nameNode);
				$descNode = $dom->createElement('description', $this->desc);
				$placeNode->appendChild($descNode);
				//create style
				if($this->usestyle) {
					$nodeStyle = $dom->createElement('styleUrl', '#'.$this->style);
					$placeNode->appendChild($nodeStyle);
				}
				
				if (!empty($this->view)) {
					$domnode = dom_import_simplexml($this->view);
					$domnode = $dom->importNode($domnode, true);
					$placeNode->appendChild($domnode);
				}
				
				$this->kmlOutput = $dom->saveXML();
			break;

		}

		$this->kmlOutput = preg_replace("/\n/", ' ', $this->kmlOutput);
	}

	public function dumpKml() {
		return $this->kmlOutput;
	}
	
	private function elementHandler($node) {
		$name = $node->getName();
		
		if (strcasecmp($name, "Placemark") == 0) {
			$this->title = $node->name;
			$this->desc = $node->description;
			$this->style = $index = substr((String)$node->styleUrl,1);
		} else if (strcasecmp($name, "point") == 0) {
			$this->type = HC_MARKER_POINT;
		} else if (strcasecmp($name, "LineString") == 0) {
			$this->type = HC_MARKER_LINE;
		} else if (strcasecmp($name, "Polygon") == 0) {
			$this->type = HC_MARKER_POLYGON;			
		} else if (strcasecmp($name, "coordinates") == 0) {
			$this->latlng = $node;
		} else if (strcasecmp($name, "style") == 0) {
			$this->styleContent[$this->style] = $node;
			$this->usestyle = true;
		} else if (strcasecmp($name, "styleMap") == 0) {
			array_push($this->styleContent, $node);
			$this->usestyle = true;
		} else if (strcasecmp($name, "Model") == 0) {
			$this->model = $node;
		} else if (strcasecmp($name, "LookAt") == 0) {
			$this->view = $node;
		} else if (strcasecmp($name, "Camera") == 0) {
			$this->view = $node;
		}
	}
	
	//traverse the whoe kml document
	private function traverseKml($node) {
		$this->elementHandler($node);

		if ($node->children()) {
			foreach ($node->children() as $child) {
				$this->traverseKml($child);
			}
		}
	}
	
	//setters and getters
	public function setLatlng($latlng) {
		$this->latlng = $latlng;
	}

	public function setView($view) {
		if (!empty($view) && is_string($view))
			$this->view = new SimpleXMLElement($view);
	}

	public function setTitle($title) {
		$this->title = $title;
	}

	public function setDescription($description) {
		$this->desc = $description;
	}
}
?>
