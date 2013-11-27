<?php

/**
 * Find the bounds of all the objects. Report as XML.
 *
 * @param array $url_components -- Catches (and discards) URL components
 */
function get_bounds (array $url_components) {
    /* @CUSTOMIZE: This query should be modified to acquire the bounds of your entire repository. */
    $query = "SELECT MIN(sw_lon) AS sw_lon, MIN(sw_lat) AS sw_lat, MAX(ne_lat) AS ne_lat, MAX(ne_lon) AS ne_lon,
            MIN(date_from) AS start_time, MAX(date_to) AS end_time FROM object_mappings;";
    $result = mysql_query($query) or die ("Could not find system boundaries. ".mysql_error());
    $doc = new HCDomDocument();
    if (mysql_num_rows($result) !== 1) die ("Error: Row result was invalid. Bounds query returned ".mysql_num_rows($result)." rows.");
    $row = mysql_fetch_assoc($result);
    $doc->setRoot("statistics");
    $bounds = $doc->root->createAndAppendNode("bounds");
    $bounds->createAndAppendTextNodes(
        array(
            "sw_lat" => $row['sw_lat'],
            "sw_lon" => $row['sw_lon'],
            "ne_lat" => $row['ne_lat'],
            "ne_lon" => $row['ne_lon'],
            "start_time" => $row['start_time'],
            "end_time" =>   $row['end_time'],
        )
    );
    header('Content-type: application/xml');
    echo $doc->saveXML();
}

class CrossDomainManager {
    /**
     * @url domains/add
     * @param string $domain Domain to authorize
     * @return shared secret
     */
    public static function addDomain ($domain) {
	// check if domains are in crossdomain.xml
	// if so, return new message: it's already there
	// otherwise, generate new shared secret
	//
    }
    /**
     * @url domains/update
     * @param <type> $domain
     * @param <type> $secret
     */
    public static function updateDomain ($domain, $secret) {
	// check if domain already in crossdomain.xml
	// if not, return error
	// if so, check that shared secret matches
	// if not, return error
	// if so, add new domain
    }

    public static function requestRemoteUpdate () {
	
    }

    public static function updateSharedSecret ($domain, $old_secret, $new_secret) {
	
    }

    public static function refreshCDXML () {

    }
}

?>