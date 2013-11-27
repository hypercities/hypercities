<?php

header("Content-type:application/xml");

//ini_set ('display_errors', 1);

include_once 'includes/database.inc';
include_once 'includes/util.inc';
include_once 'includes/constants.inc';
include_once 'includes/serverSession.inc';
include_once 'includes/HCSearchRequest.inc';
include_once 'includes/HCDomDocumentWrapper.inc.php';
include_once 'includes/HCKmlDocWrapper.php';
include_once 'includes/HCSearchAtom.php';
include_once 'includes/HCSearchResult.php';
include_once 'includes/HCCollection.inc';
include_once 'includes/HCPlacemark.php';
include_once 'includes/HCSearchResultsDocument.php';



class HCSearchEngine {
    static $request;
    static $result;
    public function __construct() {
        if ($_POST) self::$request = new HCSearchRequest($_POST);
        elseif ($_GET) self::$request = new HCSearchRequest($_GET);
    }

    public static function main () {
        // do search
        //new HCSearchEngine();
        $db = database::getInstance();
        //$result = $db->query($query);
        self::$result = new HCSearchResultsDocument(self::$request);
        self::$result->doSearches();
        return self::$result->buildResponse()->saveXML();
        
        
        $result = $db->preparedQuery(self::$request->generateQuery(),
									self::$request->generateArray());
        //print self::$request->generateQuery();
        //print_r (self::$request->generateArray());
        if (!$result) {
            return $db->getError();
        }
        $result = $db->preparedGetRows();
        if (!(count($result) > 0)) {
            self::$result = $Result = new HCDomDocument();
            $Result->setRoot('Error');
            $Result->root->createAndAppendTextNodes(array(
                    'Code' => 'NO_RESULTS_FOUND',
                    'Message' => 'Query returned no results.'
                ));
            return $Result->saveXML();
        }
        // Otherwise, continue and find the results.
        $Result = new HCSearchResultsDocument($HC_POST['keywords']);
        foreach ($result as $row) {
            $Result->addItemAndParents($row['id']);
        }
        $Response = $Result->buildResponse();
        return $Response->saveXML();
    }

    public static function getRequest() {
        return self::$request;
    }
}

$engine = new HCSearchEngine();
echo HCSearchEngine::main();

?>