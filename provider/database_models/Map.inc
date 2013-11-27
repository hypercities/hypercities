<?php

namespace HyperCities\Provider\ItemManagement;

use \DateTime;

/**
 * Represents a map in the database.
 *
 * @author David Shepard
 * @copyright Copyright 2010, Regents of the University of California
 */
class Map extends DatabaseModel {

	public	$city = 0,
			$title = '',
			$titleEn = '',
			$creator = '',
			$publicationDate = NULL,
			$publisher = '',
			$copyright = '',
			$description = '',
			$mapping = NULL,
			$width = 0.0,
			$height = 0.0,
			$scale = '',
			$caption = '',
			$captionEn = '',
			$collectionSource = '',
			$imageRecord = '',
			$thumbnailUrl = '',
			$callNumber = '',
			$state = 0,
			$tileType = 0,
			$tileUrl = '',
			$projection = '',
			$maxZoom = 0,
			$minZoom = 0;
	private $required_fields = array(
		'city', 'title', 'copyright', 'description', 'mapping', 'tileType', 'tileUrl',
		'maxZoom', 'minZoom'
	);
	private $tile_types = array("", "GraphicsMagick", "MapCruncher", "WMS", "ArcGIS");

	protected function __construct_from_array(array $data) {
		parent::__construct_from_array($data);
		if (isset($data['city']))
			$this->city = $data['city'];
		if (isset($data['title']))
			$this->title = $data['title'];
		if (isset($data['title_en']))
			$this->titleEn = $data['title_en'];
		if (isset($data['creator']))
			$this->creator = $data['creator'];
		if (isset($data['publication_date']))
			$this->publicationDate = new DateTime($data['publication_date']);
		if (isset($data['publisher']))
			$this->publisher = $data['publisher'];
		if (isset($data['copyright_notice']))
			$this->copyright = $data['copyright_notice'];
		if (isset($data['description']))
			$this->description = $data['description'];
		if (isset($data['width']))
			$this->width = $data['width'];
		if (isset($data['height']))
			$this->height = $data['height'];
		if (isset($data['scale']))
			$this->scale = $data['scale'];
		if (isset($data['caption_en']))
			$this->captionEn = $data['caption_en'];
		if (isset($data['caption']))
			$this->caption = $data['caption'];
		if (isset($data['collection_source']))
			$this->collectionSource = $data['collection_source'];
		if (isset($data['image_record']))
			$this->imageRecord = $data['image_record'];
		if (isset($data['thumbnail_url']))
			$this->thumbnailUrl = $data['thumbnail_url'];
		if (isset($data['call_number']))
			$this->callNumber = $data['call_number'];
		if (isset($data['ne_lat']) && isset($data['ne_lon'])) {
			$this->mapping = new Mapping($data);
		}
		if (isset($data['map_state_id']))
			$this->state = $data['map_state_id'];
		if (isset($data['tile_type_id']))
			$this->tileType = $this->tile_types[$data['tile_type_id']];
		if (isset($data['tile_url']))
			$this->tileUrl = $data['tile_url'];
		if (isset($data['max_zoom_level']))
			$this->maxZoom = $data['max_zoom_level'];
		if (isset($data['min_zoom_level']))
			$this->minZoom = $data['min_zoom_level'];
		if (isset($data['projection']))
			$this->projection = $data['projection'];
	}

	protected function create() {
		$this->validateRequiredFields();
		$query = 'INSERT INTO maps (city_id, date_from, dateFrom_isBC, date_to, dateTo_isBC, title, title_en,'
				. ' creator, publication_date, publisher, copyright_notice, description, ne_lat, ne_lon, sw_lat,'
				. ' sw_lon, width, height, scale, caption, caption_en, collection_source, image_record,'
				. ' thumbnail_url, call_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,'
				. ' ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW() )';

		$params = array('type' => 'isisisssssssddddiisssssss', &$this->city);
		array_merge($params, $this->mapping->getDBDate());
		$date = &$this->publicationDate->format(DATE_ATOM);
		$params[] = &$this->title;
		$params[] = &$this->titleEn;
		$params[] = &$this->creator;
		$params[] = &$date;
		$params[] = &$this->publisher;
		$params[] = &$this->copyright;
		$params[] = &$this->description;
		$params[] = &$this->mapping->neLat;
		$params[] = &$this->mapping->neLon;
		$params[] = &$this->mapping->swLat;
		$params[] = &$this->mapping->swLon;
		$params[] = &$this->width;
		$params[] = &$this->height;
		$params[] = &$this->scale;
		$params[] = &$this->caption;
		$params[] = &$this->captionEn;
		$params[] = &$this->collectionSource;
		$params[] = &$this->imageRecord;
		$params[] = &$this->thumbnailUrl;
		$params[] = &$this->callNumber;
		//);
		//$db = database::getInstance();
		//$db->preparedQuery($query, $params);
		print $query;
		print_r($params);
		die("DEBUG MODE: Map not saved.");
		$this->id = $this->writeQuery($query, $params);
		//$this->id = $this->db->insertId;
		if (!$this->id) {
			Log::write("Map creation failed.");
			throw new \HyperCities\Provider\DatabaseError("Could not create new map.");
		}
		$query = 'INSERT INTO map_profiles (map_id, map_state_id, tile_type_id, tile_url'
				. ' projection, max_zoom_level, min_zoom_level, description, created_at'
				. ' updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW() )';
		$params = array('type' => 'iiissiis', &$this->id, &$this->state, &$this->tileType,
			&$this->tileUrl, &$this->projection, &$this->maxZoom, &$this->minZoom, &$this->description
		);
		$this->writeQuery($query, $params);
	}

	protected function load() {
		
	}

	protected function update() {
		
	}

}

class LinkedMap extends Map {

	public  //$map,
			$opacity = NULL,
			$z_index = NULL,
			$layers = NULL,
			$mapData = NULL;

	/* public function __construct (Map $map, $opacity, $z_index) {
	  $this->map = $map;
	  $this->opacity = $opacity;
	  $this->z_index = $z_index;
	  } */

	protected function __construct_from_array(array $data) {
		parent::__construct_from_array($data);
		if (isset($data['opacity']))
			$this->opacity = (float) $data['opacity'];
		if (isset($data['z_index']))
			$this->z_index = $data['z_index'];
		if (isset($data['mapData'])) {
			$options = json_decode($data['mapData']);
			if ($options === NULL) {
				$this->mapData = $data['mapData'];
			} else {
				$this->mapData = $options;
			}
		}
		if (isset($data['map_data'])) {
			$options = json_decode($data['map_data']);
			if ($options === NULL) {
				$this->mapData = $data['map_data'];
			} else {
				$this->mapData = $options;
			}
		}
		if (isset($data['layers'])) {
			$layers = json_decode($data['layers']);
			if ($layers === NULL) {
				$this->layers = $data['layers'];
			} else {
				$this->layers = $layers;
			}
		}
	}
}

?>
