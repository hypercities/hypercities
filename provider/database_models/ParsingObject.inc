<?php

namespace HyperCities\Provider\ItemManagement;

/**
 * Insulates a class from accidental double-commits as it is being parsed.
 *
 * @author David Shepard
 * @copyright Copyright 2010, The Regents of the University of California
 */
class ParsingObject extends ModelDecorator {

	private	$isCommitted;
	public	$model;

	public function commit() {
		if ($this->isCommitted)
			return TRUE;
		$isCommitted = $this->model->commitChildren();
		if (!$isCommitted) $this->model->commit(DatabaseModel::FORCE_CREATE);
		$this->isCommitted = TRUE;
		return TRUE;
	}

	public function __get($name) {
		switch ($name) {
			case 'isCommitted':
				return $this->isCommitted;
			case 'id':
				return $this->model->id;
		}
	}

	public function addObject ($object) {
		if ($this->model instanceof Collection) $this->model->objects[] = $object;
		else $this->model->objects[] = $object;
	}
}

?>
