<?php
/**
 * Represents a basic GeoPt in 3D
 *
 * @author David Shepard
 * @copyright Copyright 2010, The Regents of the University of California
 */
namespace HyperCities\Provider;
class GeoPt {
    private	$latitude = NULL,
			$longitude = NULL,
			$altitude = NULL;
	public function  __construct($latitude, $longitude = NULL, $altitude = NULL) {
		if (is_array($latitude)) {
			$this->__construct_from_array ($latitude);
		} else {
			$this->latitude = $latitude;
			$this->longitude = $longitude;
			$this->altitude = $altitude;
		}
	}

	private function __construct_from_array (array $data) {
		$lat_set = FALSE;
		$lon_set = FALSE;
		if (isset($data['latitude'])) {
			$this->latitude = $data['latitude'];
			$lat_set = TRUE;
		} elseif (isset($data['lat'])) {
			$this->latitude = $data['longitude'];
			$lat_set = TRUE;
		}
		if (isset($data['longitude'])) {
			$this->longitude = $data['longitude'];
			$lon_set = TRUE;
		} elseif (isset($data['lng'])) {
			$this->longitude = $data['lng'];
			$lon_set = TRUE;
		} elseif (isset($data['lon'])) {
			$this->longitude = $data['on'];
			$lon_set = TRUE;
		}
		if (isset($data['altitude'])) {
			$this->altitude = $data['altitude'];
		} elseif (isset($data['alt'])) {
			$this->altitude = $data['alt'];
		}
		if (!$lat_set && !$lon_set) {
			return FALSE;
		}
	}

	public function __get ($name) {
		$return = NULL;
		switch ($name) {
			case 'latitude':
			case 'lat':
				$return = $this->latitude;
				break;
			case 'longitude':
			case 'lng':
			case 'lon':
				$return = $this->longitude;
				break;
			case 'altitude':
			case 'alt':
				$return = $this->altitude;
				break;
			case 'is3D':
				$return = ($this->altitude === NULL) ? FALSE : TRUE;
				break;
			case 'is2D':
				$return = ($this->altitude === NULL) ? TRUE : FALSE;
				break;
		}
		return $return;
	}
}
?>
