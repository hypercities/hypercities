<?php
// vim: ts=4:sw=4:fdc=2:nu:nospell

/**
 * Definitions of constants for HyperCities.
 *
 * @author    Chen-Kuei (James) Lee, Jay Tung 
 * @copyright Copyright 2008-2009, The Regents of the University of California
 * @date      2009-04-30
 * @version   $Id$
 *
 */

// Log files
define('HC_ERROR_LOGFILE', 'error.log');
define('HC_DEBUG_LOGFILE', 'debug.log');

// Object types
define('HC_OBJECT_TYPE_LIST', 1);
define('HC_OBJECT_TYPE_COLLECTION', 2);
define('HC_OBJECT_TYPE_MEDIA', 3);
define('HC_OBJECT_TYPE_KML', 4);
define('HC_OBJECT_TYPE_3D', 5);
define('HC_OBJECT_TYPE_3D_NETWORKLINK', 6);

// Object State
define('HC_OBJECT_PUBLIC', 1);
define('HC_OBJECT_PRIVATE', 2); // Private, but show to public
define('HC_OBJECT_HIDDEN', 3);  // Private, but show only to member
define('HC_OBJECT_FLAGGED', 4); // Being flagged inappropriate
define('HC_OBJECT_DELETED', 5); // Being deleted by user

// Marker style
define('HC_MARKER_EMPTY', 0);
define('HC_MARKER_POINT', 1);
define('HC_MARKER_LINE', 2);
define('HC_MARKER_POLYGON', 3);
define('HC_MARKER_3D_POINT', 4);
define('HC_MARKER_3D_LINE', 5);
define('HC_MARKER_3D_POLYGON', 6);
define('HC_MARKER_3D_MODEL', 7);
define('HC_MARKER_3D_VIEW', 8);

// Root Collection Id & Name
define('HC_PUBLIC_COLLECTIONS_ID', 1);
define('HC_PUBLIC_COLLECTIONS_NAME', 'Public Collections');
define('HC_3D_COLLECTIONS_ID', 2);
define('HC_3D_COLLECTIONS_NAME', '3D Collections');
define('HC_CLASSES_COLLECTIONS_ID', 3);
define('HC_CLASSES_COLLECTIONS_NAME', 'Classes');
define('HC_FEATURED_COLLECTIONS_ID', 4);
define('HC_FEATURED_COLLECTIONS_NAME', 'Featured Collections');
define('HC_PARTNER_COLLECTIONS_ID', 5);
define('HC_PARTNER_COLLECTIONS_NAME', 'Partner Collections');

define('HC_USER_COLLECTIONS_NAME', 'My Collections');

$HC_BASE_COLLECTIONS_ID = array(HC_PUBLIC_COLLECTIONS_ID, HC_CLASSES_COLLECTIONS_ID, HC_FEATURED_COLLECTIONS_ID, HC_PARTNER_COLLECTIONS_ID);
$HC_BASE_COLLECTIONS = array (
    array('id' => HC_FEATURED_COLLECTIONS_ID, 'name' => HC_FEATURED_COLLECTIONS_NAME),
    array('id' => HC_PARTNER_COLLECTIONS_ID, 'name' => HC_PARTNER_COLLECTIONS_NAME),
    array('id' => HC_CLASSES_COLLECTIONS_ID, 'name' => HC_CLASSES_COLLECTIONS_NAME),
    array('id' => HC_PUBLIC_COLLECTIONS_ID, 'name' => HC_PUBLIC_COLLECTIONS_NAME),
);
// Database Configuration
define('DB_HOST', '');
define('DB_USER', '');
define('DB_PASS', '');
define('DB_NAME', '');

// Path for user upload files
define('HC_UPLOAD_AUDIO_PATH', 'uploadedAudio');
define('HC_UPLOAD_IMAGE_PATH', 'uploadedImage');
define('HC_UPLOAD_KML_PATH', 'uploadedKml');

// User constants
// Dave 2012-03-07: Swapped Default User and Super User; I think these are backwards
define('HC_DEFAULT_USER', 1);
define('HC_SUPER_USER', 1);
define('HC_USER_IS_ADMIN', 11);

// Administrator email configuration
define('HC_SMTP_HOST', '');
define('HC_EMAIL_ADDRESS', '');
define('HC_EMAIL_PASSWORD', '');

// API Keys:

// Map API v3 key
define('GMAP_API_KEY', '');
define('GOOGLE_ANALYTICS_TRACKER_KEY', '');
define('TWITTER_CONSUMER_KEY', '');
define('TWITTER_CONSUMER_SECRET', '');
define('FACEBOOK_CONSUMER_KEY', '');
define('FACEBOOK_CONSUMER_SECRET', '');
define('MYSPACE_CONSUMER_KEY', '');

define('HC_CAPATH', '');
?>
