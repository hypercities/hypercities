<?php

/**
 * Description of HCUserManager
 *
 * @author David Shepard
 */
class HCUserManager extends HCItemManager {
    public function handle (HCWSRequest $request, HCWSResponse $response) {
	$data = null;
	if (count($request->url) == 3) {
            $node = $response->result;
            if ($request->url[2] == 'collections') {
                if ($request->method == 'GET') {
                    //$request->target->requestCriteria['parent_id'] = $request->target->itemId;
		    $url = $request->url;
		    //print_r ($url);
		    $request->target->requestCriteria['owner'];
                    $request->target->itemType = "collection";
                    $data = HCWSCollectionManager::catalog($request->target, $node);
                }
            }
        } else {
            // The get_class() is necessary because self in PHP always refers to
            // the current class. Thus, it does not call child class methods from
            // the parent.
            parent::handle ($request, $response, get_class());
        }
	return $data;
    }
}
?>