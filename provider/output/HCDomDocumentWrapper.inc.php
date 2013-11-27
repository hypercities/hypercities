<?php

/**
 * This class is used to add features to a DOMDocument. It wraps a DOMDocument
 * object and returns only wrapped HCDomNodes.
 *
 * @author David Shepard
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-07-01
 * @version $Id$
 */

namespace HyperCities\Provider\Output;

class DomDocument {
    public $doc;
    public $root;

    /**
     * Name of class of child nodes. Set in __construct to 'HCDomNode'; can be
     * changed by extending class.
     * 
     * @var {String} 
     */
    protected static $nodeClass;

    /**
     * Create new Dom Document.
     * 
     * @param {String} $version Defaults to 1.0
     * @param {String} $encoding Defaults to utf-8
     */
    public function  __construct($version = '1.0', $encoding = 'utf-8') {
        $this->doc = new \DOMDocument($version, $encoding);
        $this->doc->formatOutput = true;
        self::$nodeClass = 'HCDomNode';
    }

    /**
     * Set root node of document.
     * 
     * @param {String} $name Name of root.
     */
    public function setRoot ($name) {
    	$this->root = new self::$nodeClass(
		$this->doc->appendChild($this->doc->createElement($name)));
        
    }

    /**
     * Output XML as string, starting at optional $node.
     * 
     * @param {HCDomNode or child} $node Node at which to start
     * @return {String} XML content of document.
     */
    public function saveXML ($node = NULL) {
        if (is_a($node, 'HCDomNode') || is_subclass_of($node, 'HCDomNode')) {
            $node = $node->getNode();
        }
    	//print_r($this->doc);
    	$this->doc->formatOutput = true;
        return $this->doc->saveXML($node);
    }
}

/**
 * Wraps a node for use in an HCDomDocument. Generally, these should only be
 * constructed by calls to HCDomDocument::$root->appendChild, or other similar
 * methods on HCDomNode.
 * 
 */
class HCDomNode {
    protected $node, $ownerDocument;
    protected static $classname;

    public function  __construct(\DOMNode $node) {
        $this->node = $node;
        $this->ownerDocument = $this->node->ownerDocument;
        self::$classname = get_class($this);
    }

    /**
     * Overrides DomNode::appendChild() and performs same function.
     * @param DomNode $child Child to be appended. Please note this is a DomNode
     * and not an HCDomNode.
     */
    public function appendChild (\DomNode $child) {
        $this->node->appendChild($child);
    }

    public function setAttributeNS ($a, $b, $c) {
        $this->node->setAttributeNS ($a, $b, $c);
    }

    public function createAndAppendNode ($name) {
        if (strrpos($name, ':') !== -1) {
            $node = $this->node->appendChild($this->node->ownerDocument->createElementNS('http://hypercities.ats.ucla.edu/', $name));
        } else {
            $node = $this->node->appendChild($this->node->ownerDocument->createElement($name));
        }
        return new self::$classname ($node);
    }

    public function getNode () {
        return $this->node;
    }

    /**
     * Creates a text node as a child of this node from an inputted string.
     *
     * @param string $name Node name
     * @param string $value Text to be created in the node.
     * @return mixed The element created
     */

    public function createAndAppendTextNode ($name, $value) {//, $doc) {
	$element = $this->createAndAppendNode($name);
	$element->appendChild(
	$this->ownerDocument->createTextNode($value));
        return $element;
    } // end function createAndAppendTextNodes

    /**
     * Create CDATA node and append to node.
     * @param string $name Name of node
     * @param string $value Content to be wrapped in CDATA Element
     * @return HCDomNode Node created. 
     */
    public function createAndAppendCDATASection ($name, $value) {
        $element = $this->createAndAppendNode($name);
        $element->appendChild($this->ownerDocument->createCDATASection($value));
        return $element;
    }

    /**
     * Create a series of text nodes as children of this node from an inputted array.
     * 
     * @param Array $elements Array of form node_name => text_content
     * @return Array array of references to each element
     */
    public function createAndAppendTextNodes (array $input) {
        $elements = array();
        foreach ($input as $key => $value) {
            $element = $this->createAndAppendNode($key);
            if (is_array($value)) {
                $element->createAndAppendTextNodes($value);
            } else {
                $element->appendChild($this->ownerDocument->createTextNode($value));
            }
            $elements[$key] = $element;
        }
        return $elements;
    } // end function createAndAppendTextNodes

    /**
     * Create and append multiple nodes containing CDATA to this node.
     *
     * @param array Array of form $nodename => $data
     * @return array array of created elements 
     */
    public function createAndAppendCDATANodes ($input) {
        $elements = array();
        foreach ($input as $key => $value) {
            $element = $this->createAndAppendNode($key);
            $element->appendChild($this->ownerDocument->createCDATASection($value));
            $elements[$key] = $element;
        }
        return $elements;
    }

    /**
     * Creates a list of text nodes with identical names but different values
     * @param String $name Name of nodes to create
     * @param Array $values Values of nodes
     */
    public function createAndAppendList ($name, array $values) {
        foreach ($values as $value) {
            $element = $this->node->appendChild($this->node->ownerDocument->createElement($name));
            $element->appendChild($this->node->ownerDocument->createTextNode($value));
        }
    }

    /**
     * Set attribute of node.
     * @param string $key Atribute name
     * @param string $value Attribute value
     */
    public function setAttribute ($key, $value) {
        if (strrpos ($key, ':')) $attribute = 
		$this->node->setAttributeNS("http://hypercities.ats.ucla.edu/",
					    $key, $value
			);
        else $this->node->setAttribute($key, $value);
    }

    /**
     * Create and append element with multiple attributes.
     * 
     * @param string $name Element name.
     * @param array Arrary of attributes and values, in form name=>data
     * @return array Elements created.
     */
    public function createAndAppendElementWithAttributes ($name, $attributes)
    {
        $element = $this->createAndAppendNode($name);
        foreach ($attributes as $key => $value) {
        	$element->setAttribute($key, $value);
        }
        return $element;
    }

    /**
     * Import nodes from another document into this document as children of this
     * node.
     * 
     * @param array $nodes Array of nodes.
     * @param boolean $deep Whether or not to import the children of the node.
     */
    public function importNodesAsChildren ($nodes, $deep = TRUE) {
        $this->node->appendChild($this->ownerDocument->importNode($nodes, $deep));
    }

    /**
     * Get document that this element is a member of.
     * @return mixed Document this element is composed of.
     */
    public function getDocument () {
        return $this->ownerDocument;
    }
}

?>