<?php

namespace HyperCities\Provider\ItemManagement;
use HyperCities\Provider\Log;
use \DateTimeZone, \DateTime, \database, \DATE_ATOM;
use \KmlParser, \cKml;

/**
 * Base mapping class for HyperCities.
 *
 * @author David Shepard
 * @copyright Copyright 2010, Regents of the University of California
 */
class Mapping extends DatabaseModel {

	public	$kml = '',
		$neLat = 0.0,
		$neLon = 0.0,
		$swLat = 0.0,
		$swLon = 0.0,
		$altitude = 0.0,
		$dateFrom = null,
		$dateTo = null,
		$view,
		$zoom,
		$markerType,
		$markerState,
		$isNetworkLink = FALSE,
		$isCollection = FALSE,
		$georeferences = array();
	private $crossesIDL = FALSE, // Does it cross the international date line?
		$crossesPole = FALSE,
		$lats = array(),
		$lngs = array(),
		$alts = array(),
		$title = ''; // necessary for building kml

	public function __construct($data = NULL) {
		parent::__construct($data);
		$this->updateDirection();
	}

	private function updateDirection() {
		if ($this->neLat < $this->swLat)
			$this->crossesPole = TRUE;
		if ($this->neLon < $this->swLon)
			$this->crossesIDL = TRUE;
	}

	protected function __construct_from_array(array $data) {
		// If an object ID has been specified in $data, then this object already exists in the
		// database. This means we are updating, and should load the values from the database
		// which will allow us to overwrite them with new values.
		if (isset($data['objectId'])) {
			$db = database::getInstance();
			$query = "SELECT id, kml, ne_lat, ne_lon, sw_lat, sw_lon, date_from, dateFrom_isBC,"
					. " date_to, dateTo_isBC, view, zoom, marker_style_id FROM object_mappings WHERE"
					. " object_id = ?";
			$params = array('type' => 'i', &$data['objectId']);
			$db->preparedQuery($query, $params);
			$result = $db->preparedGetRows();
			$this->__construct_from_array($result[0]);
		}
		parent::__construct_from_array($data);
		if (isset($data['object_type_id']) && ($data['object_type_id'] == 4 || $data['object_type_id'] == 6)) {
		    $this->isNetworkLink = TRUE;
		    $this->markerType = \HC_MARKER_EMPTY;
		} else {
		    if (isset($data['markerType']))
			$this->markerType = (int)$data['markerType'];
		    if (isset($data['marker_type_id']))
			    $this->markerType = (int)$data['marker_type_id'];
		    if (isset($data['marker_style_id']))
			    $this->markerType = (int)$data['marker_style_id'];
			if (isset($data['markerStyle']))
				$this->markerType = (int)$data['markerStyle'];
		}
		if (isset($data['markerState'])) {
			$this->markerState = $data['markerState'];
		}
		if (isset($data['objectType'])) {
			if ($data['objectType'] == 4 || $data['objectType'] == 6) {
				$this->isNetworkLink = TRUE;
			} elseif ($data['objectType'] == 2) {
				$this->isCollection = TRUE;
			}
		}
		if (isset($data['kml']))
			$this->kml = $data['kml'];
		if (isset($data['link'])) {
		    $this->kml = urldecode($data['link']);
		}
		if (isset($data['ne_lat']))
			$this->neLat = $data['ne_lat'];
		if (isset($data['ne_lon']))
			$this->neLon = $data['ne_lon'];
		if (isset($data['sw_lat']))
			$this->swLat = $data['sw_lat'];
		if (isset($data['sw_lon']))
			$this->swLon = $data['sw_lon'];
		if (isset($data['neLat']))
			$this->neLat = $data['neLat'];
		if (isset($data['neLon']))
			$this->neLon = $data['neLon'];
		if (isset($data['swLat']))
			$this->swLat = $data['swLat'];
		if (isset($data['swLon']))
			$this->swLon = $data['swLon'];
		if (isset($data['altitude']))
			$this->altitude = $data['altitude'];
		if (isset($data['north']))
			$this->neLat = $data['north'];
		if (isset($data['south']))
			$this->swLat = $data['south'];
		if (isset($data['east']))
			$this->neLon = $data['east'];
		if (isset($data['west']))
			$this->swLon = $data['west'];
		if (isset($data['title']))
			$this->title = $data['title'];
		if (isset($data['name']))
			$this->title = $data['name'];
		if (isset($data['georeferences'])) {
			foreach ($data['georeferences'] as $gref) {
				$this->lats[] = $gref['lat'];
				$this->lngs[] = $gref['lon'];
				$this->alts[] = $gref['alt'];
			}
		}
		//$sign = '';
		//if ($dateFrom_isBC) $sign = '-';
		//$this->dateFrom = new DateTime($sign.$date_from, new DateTimeZone("America/Los_Angeles"));
		$timeZone = new DateTimeZone("America/Los_Angeles");
		$sign = '';
		// handling inputted JSON
		if (isset($data['dateFrom']) && is_array($data['dateFrom'])) {
			$this->dateFrom = new DateTime($data['dateFrom']['date'], new DateTimeZone($data['dateFrom']['timezone']));
			$this->dateTo = new DateTime($data['dateTo']['date'], new DateTimeZone($data['dateTo']['timezone']));
		} else {
			if (isset($data['dateFrom']))
				$dateFrom = $data['dateFrom'];
			if (isset($data['date_from']))
				$dateFrom = $data['date_from'];
			if (isset($data['dateTo']))
				$dateTo = $data['dateTo'];
			if (isset($data['date_to']))
				$dateTo = $data['date_to'];
			if ($dateFrom instanceof DateTime) $this->dateFrom = $dateFrom;
			else {
			if (@$data['dateFrom_isBC'])
				$sign .= '-';
				$this->dateFrom = new DateTime($sign . $dateFrom, $timeZone);
				//if ($dateTo_isBC) $sign = '-';
				//$this->dateTo = new DateTime($sign.$date_to, new DateTimeZone("America/Los_Angeles"));
				$sign = '';
			}
			if ($dateTo instanceof  DateTime) $this->dateTo = $dateTo;
			else {
				if (@$data['dateTo_isBC'])
					$sign .= '-';
				$this->dateTo = new DateTime($sign . $dateTo, $timeZone);
			}
		}
		// NOTE: removed this from inside the above else clause, which handled if
		// the date had come from the database.
		if (isset($data['view']) && $data['view']) {
			if ($this->json_decode_clean($data['view'])) {
				$this->view = KmlParser::createViewFromArray($this->json_decode_clean($data['view'], TRUE));
			} elseif ($data['view'] === 'null') {
				$this->view = null;
			} else {
				$this->view = $data['view'];
			}
		}
		if (isset($data['zoom']))
			$this->zoom = $data['zoom'];
		$this->updateDirection();
	}

	public static function createFromPoint($lat, $lng, $alt) {
		$mapping = new Mapping();
		$mapping->neLat = $mapping->swLat = $lat;
		$mapping->neLon = $mapping->swLon = $lng;
		$mapping->altitude = $alt;
		$mapping->lats[] = $lat;
		$mapping->lngs[] = $lng;
		$mapping->alts[] = $alt;
		return $mapping;
	}

	protected function create() {
		
	}

	public function getDBDate() {
		$dateFrom_isBC = 0;
		$dateFrom = $this->dateFrom->format(\DATE_ATOM);
		$dateTo_isBC = 0;
		$dateTo = $this->dateTo->format(\DATE_ATOM);
		if ($this->dateFrom->format('Y') < 0) {
			$dateFrom_isBC = 1;
			$dateFrom = substr($this->dateFrom->format(DATE_ATOM), 1);
		}
		if ($this->dateTo->format('Y') < 0) {
			$dateTo_isBC = 1;
			$dateTo = substr($this->dateTo->format(DATE_ATOM), 1);
		}
		return array(&$dateFrom_isBC, &$dateFrom, &$dateTo_isBC, &$dateTo);
	}

	protected function createForObject($id) {
		Log::write("Creating object mapping for object $id.");
		// fill in default values:
		if (!$this->markerState)
			$this->markerState = 0;
		if (!$this->markerType)
			$this->markerType = 0;
		// Because collections can have NULL kml, but om.kml does not allow nulls
		if (!$this->kml)
			$this->kml = '';
		$latlng = array();
		for ($i = 0; $i < count($this->lats); $i++) {
			$latlng[] = array(
				'lat' => $this->lats[$i],
				'lng' => $this->lngs[$i],
				'alt' => $this->alts[$i],
			);
		}
		if (!$this->isNetworkLink && !$this->isCollection) {
			// Only create KML if it's a 2D object
			if (!($this->markerType >= 4 && $this->markerType <= 7) && !$this->kml) {
				$kml = new cKml($this->markerType, $latlng, $this->title, NULL, false, NULL, NULL, $this->view);
				$kml->createKml();
				$this->kml = $kml->dumpKml();
			} elseif (substr($this->kml, 0, 1) == '<') {
				// This handling is necessary because for KML links, we want to
				// use the remote file as the KML field
				$kml = $this->kml;
				// still necessary -- sometimes extra \ns are introduced at end of KML string
				$kml = \str_replace('\n', '', $kml);
				$kml = stripslashes($kml);
				$kml = \simplexml_load_string($kml);
				$this->kml = $kml->asXml();
			}
		}
		$query = "INSERT INTO object_mappings (object_id, kml, ne_lat, ne_lon,"
				. " sw_lat, sw_lon, date_from, dateFrom_isBC, date_to, dateTo_isBC,"
				. " view, zoom, marker_style_id, marker_state_id, created_at, updated_at) VALUES ("
				. " ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW() )";
		$dateFrom_isBC = 0;
		if ($this->dateFrom instanceof DateTime) {
			$dateFrom = $this->dateFrom->format(DATE_ATOM);
			if (0 > (int)$this->dateFrom->format('Y')) {
				$dateFrom_isBC = 1;
				$dateFrom = substr($this->dateFrom->format(DATE_ATOM), 1);
			}
		} else {
			$dateFrom = $this->dateFrom;
			if (substr($dateFrom, 0, 1) == '-') {
				$dateFrom_isBC = 1;
				$dateFrom = substr($dateFrom, 1);
			}
		}
		$dateTo_isBC = 0;
		if ($this->dateTo instanceof DateTime) {
			$dateTo = $this->dateTo->format(DATE_ATOM);
			if (0 > (int)$this->dateTo->format('Y')) {
				$dateTo_isBC = 1;
				$dateTo = substr($this->dateTo->format(DATE_ATOM), 1);
			}
		} else {
			$dateTo = $this->dateTo;
			if (substr($dateTo, 0, 1) == '-') {
				$dateTo_isBC = 1;
				$dateTo = substr($dateTo, 1);
			}
		}
		$object_id = $id;
		$params = array('type' => 'isddddsisisiii', &$object_id, &$this->kml, &$this->neLat,
			&$this->neLon, &$this->swLat, &$this->swLon, &$dateFrom, &$dateFrom_isBC,
			&$dateTo, &$dateTo_isBC, &$this->view, &$this->zoom, &$this->markerType,
			&$this->markerState
		);
		Log::write("Creating object mapping for objects: $query with params".print_r ($params, TRUE));
		$om_id = $this->writeQuery($query, $params);
		$db = database::getInstance();
		if ($this->markerType !== \HC_MARKER_EMPTY) {
		    $query = 'INSERT INTO geo_references (latitude, longitude, altitude, `order`)'
				. ' VALUES (?, ?, ?, ?)';
		    //$params = array ('type' => 'ddd', &$this->neLat, &$this->neLon, &$this->altitude);
		    for ($i = 0; $i < count($this->lats); $i++) {
			    $params = array('type' => 'dddi', &$this->lats[$i], &$this->lngs[$i], &$this->alts[$i], &$i);
			    //$db->preparedQuery($query, $params);
			    $gr_id = $this->writeQuery($query, $params);
			    //$gr_id = $db->insertId();
			    $db->preparedQuery('INSERT INTO object_mappings_geo_references (object_mapping_id, geo_reference_id) VALUES (?, ?)',
					    array('type' => 'ii', &$om_id, &$gr_id)
			    );
		    }
		}
	}

	public function commitForObject($id) {
		if (!$this->id)
			$this->createForObject($id);
		else
			$this->update($id);
	}

	protected function load() {

	}

	public function updateForObject($id) {
		$db = database::getInstance();
		$query = 'SELECT id FROM object_mappings WHERE object_id = ?';
		$objId = $id;
		$db->preparedQuery($query, array('type' => 'i', &$objId));
		$result = $db->preparedGetRows();
		if (count($result) > 1) {
			Log::write("Attempted to update mappings for object # $id. This object has multiple mappings and cannot be updated this way.");
			return;
		} else {
			$this->id = $result[0]['id'];
		}
		$toIsBC = 0;
		$fromIsBC = 0;
		$dateFrom = $this->dateFrom->format(DATE_ATOM);
		$dateTo = $this->dateTo->format(DATE_ATOM);
		if ((int) $this->dateFrom->format('Y') < 0) {
			$fromIsBC = 1;
			$dateFrom = substr($dateFrom, 1);
		}
		if ((int) $this->dateTo->format('Y') < 0) {
			$toIsBC = 1;
			$dateTo = substr($dateTo, 1);
		}
		$latlng = array();
		for ($i = 0; $i < count($this->lats); $i++) {
			$latlng[] = array(
				'lat' => $this->lats[$i],
				'lng' => $this->lngs[$i],
				'alt' => $this->lngs[$i],
			);
		}
		if (!$this->isNetworkLink) {
                    if (!($this->markerType >= 4 && $this->markerType <= 7)) {
                        $kml = new cKml($this->markerType, $latlng, $this->title, NULL, false, NULL, NULL, $this->view);
                        $kml->createKml();
                        $this->kml = $kml->dumpKml();
                    } else {
                        $kml = $this->kml;
                        // still necessary -- sometimes extra \ns are introduced at end of KML string
                        $kml = \str_replace('\n', '', $kml);
                        $kml = stripslashes($kml);
                        $this->kml = $kml;
                    }
		}
		$query = 'UPDATE object_mappings SET kml = ?, ne_lat = ?, ne_lon = ?,'
				. ' sw_lat = ?, sw_lon = ?, date_from = ?, dateFrom_isBC = ?,'
				. ' date_to = ?, dateTo_isBC = ?, view = ?, zoom = ?, marker_style_id = ?, '
				. ' marker_state_id = ?, updated_at = NOW() WHERE id = ?';

		$params = array('type' => 'sddddsisisiiii', &$this->kml, &$this->neLat,
			&$this->neLon, &$this->swLat, &$this->swLon, &$dateFrom, &$fromIsBC,
			&$dateTo, &$toIsBC, &$this->view, &$this->zoom, &$this->markerType,
			&$this->markerState, &$this->id,
		);
		$result = $db->preparedQuery($query, $params);
		$query = "SELECT geo_reference_id FROM object_mappings_geo_references WHERE object_mapping_id = $this->id";
		$result = $db->query($query);
		$result = $db->getRows();
		// delete old om_gr_ids and gr_ids
		foreach ($result as $row) {
			$db->query("DELETE FROM geo_references WHERE id = $row[geo_reference_id]");
		}
		// insert new ones
		//$coordsSize = count($this->lats);
		for ($i = 0; $i < count($this->lats); $i++) {
			$query = "INSERT INTO geo_references (latitude, longitude, altitude, `order`) VALUES (?,?,?,?)";
			$params = array('type' => 'dddi', &$this->lats[$i], &$this->lngs[$i], &$this->altitude, &$i);
			$db->preparedQuery($query, $params);
			$gr_id = $db->insertId();
			$query = "INSERT INTO object_mappings_geo_references (object_mapping_id, geo_reference_id) VALUES ($this->id, $gr_id)";
			$db->query($query);
		}
	}

	protected function update() {
		Log::write("Called Mapping::update. This really shouldn't be called.");
		$toIsBC = 0;
		$fromIsBC = 0;
		$dateFrom = $this->dateFrom->format(DATE_ATOM);
		$dateTo = $this->dateTo->format(DATE_ATOM);
		if ((int) $this->dateFrom->format('Y') < 0) {
			$fromIsBC = 1;
			$dateFrom = substr($dateFrom, 1);
		}
		print $dateFrom;
		if ((int) $this->dateTo->format('Y') < 0) {
			$toIsBC = 1;
			$dateTo = substr($dateTo, 1);
		}
		$query = 'UPDATE object_mappings SET kml = ?, ne_lat = ?, ne_lon = ?,'
				. ' sw_lat = ?, sw_lon = ?, date_from = ?, dateFrom_isBC = ?,'
				. ' date_to = ?, dateTo_isBC = ?, view = ?, zoom = ?, marker_style_id = ?, '
				. ' updated_at = NOW() WHERE id = ?';
		$params = array('type' => 'sddddsisisiii', &$this->kml, &$this->neLat,
			&$this->neLon, &$this->swLat, &$this->swLon, &$dateFrom, &$fromIsBC,
			&$dateTo, &$toIsBC, &$this->view, &$this->zoom, &$this->markerType,
			&$this->id,
		);
		$db = database::getInstance();
		$result = $db->preparedQuery($query, $params);
	}

	public function updateWithArray(array $data) {
		$this->__construct_from_array($data);
	}

	public function expandToContainPoint($lat, $lng, $alt = NULL) {
		$this->lats[] = $lat;
		$this->lngs[] = $lng;
		$this->alts[] = $alt;
		$expanded = FALSE;
		if ($lat > $this->neLat && $lat > $this->swLat) {
			$this->neLat = $lat;
			$expanded = TRUE;
		}
		if ($lat < $this->swLat && $lat < $this->swLat) {
			$this->swLat = $lat;
			$expanded = TRUE;
		}
		if ($lng > $this->swLon && $lng > $this->swLon) {
			$this->neLon = $lng;
			$expanded = TRUE;
		}
		if ($lng < $this->swLat && $lng > $this->neLon) {
			$this->swLat = $lng;
			$expanded = TRUE;
		}/*
		if ($this->neLat < $lat && $this->swLat < $lat) {
			$this->neLat = $lat;
			$expanded = TRUE;
		} elseif ($this->swLat < $lat && $this->neLat < $lat) {
			$this->swLat = $lat;
			$expanded = TRUE;
		}
		if ($this->neLon < $lng && $this->swLon < $lng) {
			$this->neLon = $lng;
			$expanded = TRUE;
		} elseif ($this->swLon < $lat && $this->neLon < $lng) {
			$this->swLon = $lng;
			$expanded = TRUE;
		}*/
		if ($alt && $alt > $this->altitude) {
			$this->altitude = alt;
		}
		return $expanded;
	}

	/**
	 * Get bounding box that represents the geotemporal boundings.
	 *
	 * @return String Bounding box.
	 */
	public function getBoundingBox() {
		return 'BBox=[' . $this->swLon . '],[' . $this->swLat . '],[' . $this->neLon . '],[' . $this->neLat . ']';
	}

	public function addGeoPt ($geopt) {
		$this->georeferences[] = $geopt;
	}

}
?>
