<?php
namespace HyperCities\Provider\ItemManagement;

/**
 * Description of ContentManager
 *
 * @author daveshepard
 */

use HyperCities\Provider\Request;
use HyperCities\Provider\Models\Content;
use \database;


class ContentManager extends ModelManager {
	
    public static function display (Request $request) {
		$db = database::getInstance();
		//print_r ($request->query->itemId);
		$id = (int)$request->query->itemId;
		$db->preparedQuery ('SELECT c.id, c.content FROM contents c WHERE c.id = ? ',
			array ('type' => 'i', &$id)
		);
		$result = $db->preparedGetRows();
		// EXIT POINT: throw error
		if (count($result) == 0) {
			throw new ItemNotFound("Item $id not found.");
		}
		$item = Content::fromArray($result[0]);
		//print_r ($item);
		return $item;
	}

	public static function handle (Request $request) {
		$returnable = null;
		if (count($request->url) == 1 && $request->method == 'GET') {
			throw new BadRequestError("content", "catalog", "Listing all content items is not allowed.");
		} else {
			$returnable = parent::handle($request, get_class());
		}
		return $returnable;
	}

	public static function getForObject ($id) {
		$db = database::getInstance();
		$query = "SELECT o.id AS objectId, c.content FROM objects o, contents c WHERE o.id = ? AND "
				."c.id = o.content_id";
		$oid = &$id;
		$result = $db->preparedQuery($query, array('type' => 'i', $oid));
		$result = $db->preparedGetRows();
		return new Content($result[0]);
	}

	public static function getById ($id) {
		$db = database::getInstance();
		$query = "SELECT o.id AS objectId, c.content FROM objects o, contents c WHERE c.id = ? AND "
				."o.content_id = ?";
		$oid = &$id;
		$result = $db->preparedQuery($query, array('type' => 'ii', $oid, $oid));
		$result = $db->preparedGetRows();
		return new Content($result[0]);
	}
}
?>