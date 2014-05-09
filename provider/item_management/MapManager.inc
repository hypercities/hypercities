<?php

/**
 * Description of MapManager
 *
 * @author David Shepard
 */

namespace HyperCities\Provider\ItemManagement;
use HyperCities\Provider\Models\Map;
use HyperCities\Provider\Request;
use \database;

class MapManager extends ModelManager {
	//put your code here

	public static function catalog (Request $request) {
		$query = $request->query;
		$db = database::getInstance();
		if ($query->hasGeoTemporalCriteria) {
			$query_str = "SELECT m.id, c.name, year(m.date_from), m.dateFrom_isBC,"
					." year(m.date_to), m.dateTo_isBC, m.title, m.ne_lat, m.ne_lon,"
					." m.sw_lat, m.sw_lon, mp.max_zoom_level, mp.min_zoom_level,"
					." mp.tile_type_id, mp.tile_url, m.description, m.thumbnail_url"
					." from maps m, map_profiles mp, cities c WHERE m.city_id = c.id"
					." AND m.id = mp.map_id AND ( NOT( m.sw_lat >= ? OR m.sw_lon"
					." >= ? OR m.ne_lat <= ? OR m.ne_lon <= ?))";
			$result = $db->preparedQuery($query_str, array ('type'=>'ssss',
					$query->requestData['ne_lat'],
					$query->requestData['ne_lon'],
					$query->requestData['sw_lat'],
					$query->requestData['sw_lon']
					)
			);
			$result = $db->preparedGetRows();
			$return = array();
			foreach ($result as $row) {
				$return[] = Map::buildFromArray($row);
			}
		}
		return $return;
	}

	public static function search (Request $query) {

	}

	public static function display (Request $request) {
		$db = database::getInstance();
		$query_str = "SELECT m.id, c.name AS city, year(m.date_from) AS dateFrom, m.dateFrom_isBC,"
					." year(m.date_to) AS dateTo, m.dateTo_isBC, m.title, m.ne_lat, m.ne_lon,"
					." m.sw_lat, m.sw_lon, mp.max_zoom_level, mp.min_zoom_level,"
					." mp.tile_type_id, mp.tile_url, m.description, m.thumbnail_url"
					." FROM maps m, map_profiles mp, cities c WHERE m.city_id = c.id"
					." AND m.id = mp.map_id AND m.id = ?";
		$params = array ('type' => 'i', &$request->query->itemId);
		$db->preparedQuery($query_str, $params);
		$result = $db->preparedGetRows();
		$return = NULL;
		//foreach ($result as $row) {
		$return = Map::buildFromArray($result[0]);
		//}
		return $return;
	}
}
?>