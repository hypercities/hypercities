<?php

/**
 * Denotes a snapshot file.
 *
 * @author David Shepard
 * @copyright Copyright 2009, The Regents of the University of California
 * @date 2009-08-01
 */

class HCStateFile extends HCDomDocument {
    public $bounds, $center, $objects, $collections, $maps, $infowindow, $narrativePanels;

    public function __construct () {
        parent::__construct();
        $this->setRoot('Snapshot');
        //$this->bounds = new HCBounds($this);
        
        /*$this->objects = $this->root->createAndAppendNode('objects');
        $this->collections = $this->root->createAndAppendNode('collections');*/
        $this->openedCollections = $this->root->createAndAppendNode('OpenedCollections');
        $this->checkedCollections = $this->root->createAndAppendNode('CheckedCollections');
        $this->maps = $this->root->createAndAppendNode('maps');
        
    }

    public function setBounds ($bounds) {
        if (is_array ($bounds)) {
            /*$this->neLat = $bounds['neLat'];
            $this->neLon = $bounds['neLon'];
            $this->swLat = $bounds['swLat'];
            $this->swLon = $bounds['swLon'];
            $this->timeFrom = $bounds['timeFrom'];
            $this->timeTo = $bounds['timeTo'];*/
            $this->bounds = $this->root->createAndAppendNode('bounds');
            $this->bounds->createAndAppendTextNodes($bounds);
        /*$this->swLat = $this->bounds->createAndAppendNode('swLat');
        $this->swLon = $this->bounds->createAndAppendNode('swLon');
        $this->neLat = $this->bounds->createAndAppendNode('neLat');
        $this->neLon = $this->bounds->createAndAppendNode('neLon');
        $this->timeFrom = $this->root->createAndAppendNode('timeFrom');
        $this->timeTo = $this->root->createAndAppendNode('timeTo');*/
        }
    }
    public function setTimespan ($timespan) {
        if (is_array ($timespan)) {
            $this->timespan = $this->root->createAndAppendNode('timespan');
            $this->timespan->createAndAppendTextNodes($timespan);
        }
    }

    public function setCenter ($center) {
        if (is_array($center)) {
            $this->center = $this->root->createAndAppendNode('center');
            $this->center->createAndAppendTextNodes($center);
        }
    }

    public function setInfoWindow ($state, $id = null) {
        $this->infoWindow = $this->root->createAndAppendNode ('InfoWindow');
        $this->infoWindow->createAndAppendTextNodes(array ("state" => $state, "id" => $id));
    }
    public function setNarrativePanelStructure ($merged_ids) {
        $this->narrativePanels = $this->root->createAndAppendNode('NarrativePanels');
        $ids = explode(';', $merged_ids);
        $this->narrativePanels->createAndAppendList ('collection', $ids);
    }
}


?>
