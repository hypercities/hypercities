<?php

namespace HyperCities\Provider\ItemManagement;

use HyperCities\Provider\Log;
use HyperCities\Provider\Request;
use HyperCities\Provider\NotFoundError;

/**
 * Datastore for maps.
 *
 * @author David Shepard
 * @copyright Regents of the University of California, 2010
 */
class MapStore extends DataStore {

	private static $instance = NULL;

	public function loadAll() {

		$query = "SELECT m.id, c.name AS city, date(m.date_from) as date_from,"
				. " date(m.date_to) as date_to, m.title, m.title_en, m.creator,"
				. " date(m.publication_date) as publication_date, m.publisher,"
				. " m.copyright_notice, m.width, m.height, m.scale, m.caption,"
				. " m.caption_en, m.collection_source, m.call_number, m.ne_lat,"
				. " m.ne_lon, m.sw_lat, m.sw_lon, mp.max_zoom_level, mp.min_zoom_level,"
				. " mp.tile_type_id, mp.tile_url, m.description, m.thumbnail_url"
				. " FROM maps m, map_profiles mp, cities c WHERE m.id IN ("
				. implode(',', array_keys($this->objects)) . " ) AND "
				. " c.id = m.city_id AND mp.map_id = m.id ";
		$result = $this->db->query($query);
		if (!$result) {
			return 0;
		}
		$results = $this->db->getRows();
		foreach ($results as $row) {
			$this->objects[$row['id']]->updateWithArray($row);
		}
	}

	public function addObject($id, $value) {
		$this->objects[$id] = $value;
	}

	public static function getInstance() {
		if (!self::$instance) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	protected function processTimeCriteria($start, $end, $queryTable, array &$dbParams) {

		if ($start instanceof DateTime) {

		}
	}

	public function doSearch(array $data) {
		$query = new SelectQuery();
		$query->addFields("m.id");
		$query->addTable("maps m");
		$query->addTable("map_profiles mp");
		$params = array('type' => '');
		$objectType = "";
		$firstConditional = TRUE;
		$data = array_merge($data, $this->constraints);
		/* foreach ($this->locks as $lock) {
		  Log::write("Operating under lock constraint: " . print_r($lock, TRUE));
		  $data = array_merge($data, $lock);
		  } */
		//Log::write("Received request to search for maps: " . print_r($data, TRUE));
		$objectType = 'maps';
		$query->addTable('maps m');
		// Looking for one object?

		if (isset($data['objectId'])) {
			$condition = '';
			if (!$firstConditional) $condition = 'AND';
			$this->processIds($data['objectId'], 'm.id', $query, $params, $condition);
			/*$query->addCondition(" m.id = ?");
			$params['type'] .= 'i';
			$params[] = &$data['objectId'];*/
			if ($firstConditional) $firstConditional = FALSE;
		}
		if (@$data['linkedTo']) {
			$query->addTable("objects_maps oms");
			$query->addFields("oms.z_index, oms.opacity, oms.tile_url as oms_tile_url, oms.layers, oms.map_data, oms.tile_type_id, mp.tile_url as mp_tile_url ");
			//$query->addCondition("oms.object_id = ? ");
			// Dynamic maps join on dummy dynamic map entry in maps
			if (!$firstConditional) $query->addCondition("AND oms.map_id = m.id ");
			else $query->addCondition("oms.map_id = m.id ");
			$this->processIds($data['linkedTo'], 'oms.object_id', $query, $params, 'AND');
			$firstConditional = FALSE;
			//$params['type'] .= 'i';
			//$params[] = &$data['linkedTo'];
		}
		// apply initial criteria
		// if a user is specified, check this user's permissions
		// general user search, e.g. looking for items created by a user

		if (@$data['userId']) {
			$query->addCondition("AND m.owner_id = ?");
			$params['type'] .= 'i';
			$params[] = &$data['userId'];
			if ($this->constraints['user'] == $data['userId'] || @$this->constraints['userIsAdmin']) {
				// Show all public items or protected items because the user is not an administrator
				$query->addCondition(" OR (m.object_state_id = 1 OR m.object_state_id = 2)");
			}
		} else {
			if (!@$this->constraints['userIsAdmin']) {
				$query->addTable("map_profiles mp");

				$conditional = "";
				if (!$firstConditional) {
					$conditional = " AND ";
				}
				if (@$this->constraints['userId']) {
					$query->addCondition("$conditional (m.owner_id = ? OR (mp.map_state_id = 1 OR mp.map_state_id = 2) AND mp.map_id = m.id)");

					$params['type'] .= 'i';
					$params[] = &$this->constraints['user'];
				} else {
					$query->addCondition("$conditional (mp.map_state_id = 1 OR mp.map_state_id = 2) AND mp.map_id = m.id");
				}
			}
		}

		// title criteria
		if (@$data['text']) {
			$text = '%' . $data['text'] . '%';

			$query->addCondition(" AND (m.title LIKE ? OR m.description LIKE ? OR m.creator LIKE ? )");
			$params['type'] .= 'sss';
			$params[] = &$text;
			$params[] = &$text;
			$params[] = &$text;
		}
		// bounds criteria?
		/* if ($data->hasBoundsConditions) {
		  //$query->addConditions(" AND $query->mappingTable.ne_lat < ? …");
		  $mapping = new Mapping($data);
		  $query->addCondition($mapping->generateInclusiveQuery($data->tableName));
		  // add parameters
		  } */
		if (@$data['city']) {
			$query->addTable('cities c');
			$query_str = "SELECT id FROM cities WHERE name LIKE ?";
			$cityName = '%' . $data['city'] . '%';
			$this->db->preparedQuery($query_str, array('type' => 's', &$cityName));
			$cities = $this->db->preparedGetRows();
			$query->addCondition(" AND m.city_id = ?");
			$params['type'] .= 'i';
			$params[] = &$cities[0]['id'];
		}
		if (@$data['neLat']) {
			Log::write("Bounds params found:" . print_r($data, TRUE));
			/* $query->addCondition("AND $mappingTable.sw_lat >= ? AND m.sw_lon >= ? AND m.ne_lat <= ? AND m.ne_lon <= ?"); */
			$params['type'] .= 'dddd';
			$params[] = &$data['swLat'];
			$params[] = &$data['swLon'];
			$params[] = &$data['neLat'];
			$params[] = &$data['neLon'];
			$north = $data['neLat'];
			$south = $data['swLat'];
			$east = $data['neLon'];
			$west = $data['swLon'];
			$query->addCondition(" AND NOT (m.sw_lat >= ? OR m.ne_lat <= ? ");
			if ($east >= $west) {
				$query->addCondition("OR m.sw_lon >= ? OR m.ne_lon <= ?)");
			}
			// Case 2) Bounding Box acrossing longitude 180 to -180 ($east < $west)
			else {
				$query->addCondition(") AND (( m.sw_lon > -180 AND m.sw_lon < ? ) "
						. "OR ( m.ne_lon < 180 AND m.ne_lon > ? )) ");
			}
		}
		if (isset($data['bbox'])) {
			// BBOX is NESW
			//$query->addCondition("AND m.sw_lat >= ? AND m.sw_lon >= ? AND m.ne_lat <= ? AND m.ne_lon <= ?");
			$params['type'] .= 'dddd';
			$bbox_coordinates = explode(',', $data['bbox']);
			if (count($bbox_coordinates) != 4) {
				throw new BadRequestError("Map", "GET", "Invalid bounding box. Bounding box must be N,E,S,W in decimal degrees.");
			}
			foreach ($bbox_coordinates as $coord) {
				if (!is_numeric($coord)) throw new BadRequestError("Map", "GET", "Invalid bounding box. Bounding box must be N,E,S,W in decimal degrees.");
			}
			$north = $bbox_coordinates[0];
			$east = $bbox_coordinates[1];
			$south = $bbox_coordinates[2];
			$west = $bbox_coordinates[3];
			$params[] = &$north;
			$params[] = &$south;
			$params[] = &$east;
			$params[] = &$west;
			$query->addCondition(" AND NOT (m.sw_lat >= ? OR m.ne_lat <= ? ");
			if ($east >= $west) {
				$query->addCondition("OR m.sw_lon >= ? OR m.ne_lon <= ?)");
			}
			// Case 2) Bounding Box acrossing longitude 180 to -180 ($east < $west)
			else {
				$query->addCondition(") AND (( m.sw_lon > -180 AND m.sw_lon < ? ) "
						. "OR ( m.ne_lon < 180 AND m.ne_lon > ? )) ");
			}
		}
		if (isset($data['start']) && isset($data['end'])) {
			$start = NULL;
			$end = NULL;
			$startIsBC = 0;
			$endIsBC = 0;
			if ($data['start'] instanceof DateTime) {
				$start = $data['start']->format(ATOM_DATE);
			} else {
				$start = $data['start'];
			}
			if (substr($start, 0, 1) == '-') {
				$startIsBC = 1;
				$start = substr($start, 1);
			}
			if ($data['end'] instanceof DateTime) {
				$end = $data['end']->format(ATOM_DATE);
			} else {
				$end = $data['end'];
			}
			if (substr($end, 0, 1) == '-') {
				$endIsBC = 1;
				$end = substr($end, 1);
			}
			// TODO: figure out isBC
			$query->addCondition("AND NOT (dateLarger(m.dateFrom_isBC, m.date_from, ?, ?) "
					. "OR dateLarger(?, ?, m.dateTo_isBC, m.date_to)) ");
			$params['type'] .= 'isis';
			$params[] = &$endIsBC;
			$params[] = &$end;
			$params[] = &$startIsBC;
			$params[] = &$start;
		}
		//print $query;
		//print_r ($params);
		// run query
		Log::write("Looking for maps: querying $query with params " . print_r($params, TRUE));
		if (count($params) > 1) {
			$result = $this->db->preparedQuery($query, $params);
			if (!$result) {
				Log::write("Database error when doing query." . $this->db->getError());
			}
			$result = $this->db->preparedGetRows();
		} else {
			$result = $this->db->query($query);
			if (!$result) {
				return FALSE;
			}
			$result = $this->db->getRows();
		}
		Log::write(count($result) . " maps found.");
		if (count($result) == 0) {
			//Log::write("No maps found for query $query and parameters " . print_r($params, TRUE));
			//throw new NotFoundError("No items found for supplied criteria.");
			return false;
		}
		//print_r ($result);
		$returnable = array();


		
		foreach ($result as $row) {
			if (isset($data['linkedTo'])) {
				if (!$row['oms_tile_url']) {
					$row['tile_url'] = $row['mp_tile_url'];
				} else {
					$row['tile_url'] = $row['oms_tile_url'];
				}

				$map = new LinkedMap($row);
			} else {
				$map = new Map($row);
			}
			$this->objects[$row['id']] = $map;
			$returnable[] = $map;
		}
		//print_r ($returnable);
		// generate objects
		Log::registerMaps($returnable);
		return $returnable;
	}

}

?>
