<?php

/**
 * The response sent back to the server. Ultimately, it's an XML document.
 *
 * @author David Shepard
 */

namespace HyperCities\Provider\Output;
use \HCKmlNode, HCDomDocument;

class KmlResponse extends \HCDomDocument {
    public $result, $messages, $kmlNode;
    static $classMessages = array();
    public $resultNode, $messagesNode, $documentNode;

    public function __construct () {
        parent::__construct();
        self::$nodeClass = '\HCKmlNode';
		$this->setRoot('kml');
        $this->messages = array();
    }

	public function setRoot () {
		$this->kmlNode = $this->root = new self::$nodeClass($this->doc->appendChild($this->doc->createElementNS('http://www.opengis.net/kml/2.2', 'kml')));
		$this->kmlNode->setAttributeNS('http://www.w3.org/2000/xmlns/' ,'xmlns:atom', 'http://www.w3.org/2005/Atom');
		$this->kmlNode->setAttributeNS('http://www.w3.org/2000/xmlns/' ,'xmlns:gx', 'http://www.google.com/kml/ext/2.2');
    }

    public function addMessage (Message $message) {
        array_push($this->messages, $message);
    }

    public function setDocumentNode ($id) {
        // create KML node
        $this->documentNode = new HCKmlNode($this->kmlNode->createAndAppendNode('Document'));
        return $this->documentNode;
    }
}
?>
