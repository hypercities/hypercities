<?php 

//namespace HyperCities\Webservice;

namespace HyperCities\Provider\ItemManagement;
use HyperCities\Provider\Request;
use HyperCities\Provider\Query;

abstract class ModelManager {
    static $id = "Abstract Model";
    static $searchAtoms = array();
    public function __construct () {

    }

    private static $valid_actions = array (
            'create', 'update', 'view', 'catalog', 'delete'
    );
    /**
     * Redesign:
     *
     * Take Request, which has User and QueryData (formerly target) enclosed
     */
    /**
     * @method handle
     * Handles requests and determines where the requests go based on
     * URL content and request type. Should be overridden in each subclass
     * for URLs with three components, e.g. /collections/1234/objects, which
     * would handle objects that refer to children.
     * Should only be called for the request coming directly from outside. Objects
     * calling methods of other objects, e.g. HCWSCollectionManager trying to get
     * all the objects from HCWSObjectManger in that collection should call
     * HCWSObjectManger::display(), not HCWSObjectManager::handle(). Consequently,
     * they should generate their own targets.
     * @param $request HCWSSIRequest Request to process.
     * @param $response HCWebserviceResponse Response document to which to attach the
     * XML nodes.
     * @param $responder Class to call.
     *
     */
    public static function handle (Request $request, $responder = NULL) {
        //$node = $response->result;
	$return = null;
        $action = "";
	$query = $request->query;
        try {
            switch ($request->method) {
                case 'POST':
                    if (is_numeric($query->itemId)) $action = 'update';
                    else $action = 'create';
                    //$return = call_user_func(array($responder, $action), $request);
                    $return = static::$action($request);
                    break;
                case 'GET':
                    if (is_numeric($query->itemId)) $action = 'display';
                    else $action = 'catalog';
                    //$return = call_user_func(array($responder, $action), $request);
					$return = static::$action($request);
                    break;
                case 'DELETE':
                    $action = 'delete';
                    //$return = call_user_func(array($responder, $action), $request);
					$return = static::$action($request);
                    break;
            } // end switch ($request->method)
        } catch (HCException $ex) {
            $return = $response->addError($ex);
        }
	return $return;
    }

    public static function requires ($requirements, $inputs) {
        $missing = array();
        foreach ($requirements as $req) {
            if (isset($inputs[$req])) array_push ($missing, $req);
        }
        return $missing;
    }

    /**
     * Checks if user has established a session, and if the session key is valid.
     * 
     * @param String $action Name of action called.
     * @throws UserNotAuthenticated
     * 
     */
    public static function requireLogin (Request $request) {
        if (!$request->user)
            throw new UserNotAuthenticated();
    }

    /*
	 * Index terms if there are any terms in the given target.
    */
    private static function indexTermsForObject (Query $target, $objectId) {
        if (isset($target->requestData['keywords'])) {
            //self::addSearchHit(explode(',', $target->requestData['keywords']), $objectId);

            foreach (explode(',', $target->requestData['keywords']) as $term) {
                //$tag = TagManager::getTag($term);
                //$tag->tagObject($objectId);
            }
        }
    }

    private static function updateTagsForObject (array $tags, $object) {
        foreach ($tags as $tag) {

        }
    }
    /**
     * Follow-up actions to take place after an object has been created.
     * Protected because it should never be called outside one of its child classes.
     *
     */

    protected static function create (Query $target, $objectId) {
        /*if (isset($target->requestData['keywords'])) {
	self::addSearchHit(explode(',', $target->requestData['keywords']), $objectId);
	}*/
        self::indexTermsForObject($target, $objectId);
    } // end protected static function create

    protected static function update (Query $target, $objectId) {
        self::indexTermsForObject($target, $objectId);
    }

    protected static function delete (Query $target, $objectId) {
        // get all terms from database
        $db = database::getInstance();
        //$result = $db->query ("SELECT object_id FROM seach_hits WHERE object_id = $objectId");
        //$rows = $db->getRows();
        // Remove hit from search terms
        $db->query ("DELETE FROM search_hits WHERE object_id = $objectId");
    }

}
?>