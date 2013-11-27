<?php

/**
 * Common basetype for actions that decorate models.
 *
 * @author David Shepard
 * @copyright Copyright 2010, The Regents of the University of California
 */

namespace HyperCities\Provider\ItemManagement;

use HyperCities\Provider\ItemManagement\DatabaseModel;

abstract class ModelDecorator {

	protected $model;

	public function __construct($model) {
		if ($model instanceof DatabaseModel) {
			$this->model = $model;
		} else {
			Log::write("Attempted to assign invalid model class to ModelDecorator.");
		}
	}

}

?>
