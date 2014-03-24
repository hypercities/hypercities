<?php
include_once("includes/serverSession.inc");
include_once('includes/constants.inc');
include_once('includes/connect_db.inc');

if (isset($_GET['cid']) && isset($_GET['mid']) && isset($_GET['oid'])) {
  if (is_numeric($_GET['cid']) &&  is_numeric($_GET['mid']) && is_numeric($_GET['oid'])) {
    cServerSession::synchronize($_GET['oid'],$_GET['cid'],$_GET['mid']);
  } else {
    cServerSession::start();
  }
}

if (isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] != '' && $_SERVER['QUERY_STRING'] != '?') {
  $link_pieces = explode('/', $_SERVER['QUERY_STRING']);
  cServerSession::setVar('permalink', array('type'=> $link_pieces[0], 'id'=>(int)$link_pieces[1]));
  header("Location: .");
  die();
}

$baseCollection = cServerSession::getVar('baseCollection');
$baseCollectionAuthenticated = cServerSession::getVar('baseCollectionAuthenticated');
if ($baseCollection) {
  if (!$baseCollectionAuthenticated) {
    header("Location: authenticateCollection.php");
    die();
  } else {
    cServerSession::setVar('permalink', array ('type' => 'collections', 'id' => $baseCollection));
  }
}

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
    <?php
        // Detect Chrome Frame plugin for IE
        if (stripos($_SERVER['HTTP_USER_AGENT'], "MSIE") && !stripos($_SERVER['HTTP_USER_AGENT'], "chromeframe")) {
            header("Location: chromeInstall.php");
            die();
        }
    ?>
    <meta http-equiv="X-UA-Compatible" content="chrome=1" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <link rel="shortcut icon" href="images/favicon.ico" />

    <!-- Include stylesheets -->
    <link rel="stylesheet" type="text/css" href="css/jScrollPane.css" />
    <link rel="stylesheet" type="text/css" href="css/HCTreeview.css" />
    <link rel="stylesheet" type="text/css" href="css/objectEditPanel.css" />
    <link rel="stylesheet" type="text/css" href="css/jQueryUI.css" />
    <link rel="stylesheet" type="text/css" href="css/main.css" />
    <link rel="stylesheet" type="text/css" href="css/dsrte.css" />
    <link rel="stylesheet" type="text/css" href="css/content.css" />
    <link rel="stylesheet" type="text/css" href="css/dhtmlwindow.css" />
    <link rel="stylesheet" type="text/css" href="css/loginForm.css" />
<!--    <link rel="stylesheet" type="text/css" href="css/openid.css" />-->
    <link rel="stylesheet" type="text/css" href="css/jHtmlArea.css" />
    <link rel="stylesheet" type="text/css" href="http://s7.addthis.com/static/r07/widget07.css" />

    <!--[if  IE]>
    <link rel="stylesheet" type="text/css" href="css/ie.css" />
    <![endif]-->

    <!-- Include API scripts first -->
    <script type="text/javascript" src="http://www.google.com/jsapi"></script>
    <script type="text/javascript">
      google.load("earth", "1");
      // do not load css for search to avoid unmatched link error
      google.load("jquery", "1.4.1");
      google.load("jqueryui", "1.7.2");
      google.load("yui", "2.7.0");
      google.load("books", "0");
    </script>
    <script src="http://maps.googleapis.com/maps/api/js?key=<?=GMAP_API_KEY?>&sensor=false&libraries=places" type="text/javascript"></script>

  <!-- Permalink handling -->
  <script type="text/javascript">
    var initOpts = new Object();
    <?php
      $permalink = cServerSession::getVar('permalink');
      if ($permalink) {
        $id = $permalink['id'];
        // load mapping from database
        $sql = "SELECT ne_lat, ne_lon, sw_lat, sw_lon, zoom FROM object_mappings WHERE object_id = $id ;";
        $result = mysql_query ($sql);
        $row = mysql_fetch_assoc ($result);
        // create new options object
        ?>
          
          <?php if ($permalink['type'] == '') { ?> //initOpts.zoom = 2; <?php } ?>
          initOpts.permalink = {
            type: '<?= $permalink['type'] ?>',
            id:   <?= $permalink['id'] ?>,
            isBase: false
          };
        <?php
        if ($baseCollection && $baseCollectionAuthenticated) { ?>
          initOpts.permalink.isBase = true;
          initOpts.permalink.view = 'intelliList';
      <?php }
        cServerSession::unsetVar('permalink');
      }
      
    ?>
  </script>

   
    <!-- DateJS Script Start -->
    <script type="text/javascript" src="scripts/datejs/date-en-US.js"></script>
    <script type="text/javascript" src="scripts/datejs/core.js"></script>
    <script type="text/javascript" src="scripts/datejs/parser.js"></script>
    <script type="text/javascript" src="scripts/datejs/sugarpak.js"></script>
    <script type="text/javascript" src="scripts/datejs/time.js"></script>
    <!-- DateJs Script End -->
    
  <!-- Include JQuery Plugins -->
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.mousewheel.pack.js"></script>
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.maskedinput.pack.js"></script>
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.jScrollPane.js"></script> 
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.jWordWrap.min.js"></script>
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.jeditable.min.js"></script>
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.autogrow.js"></script>
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.cookie.js"></script>
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.openid.js"></script>
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.jHtmlArea.js"></script>
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.dateEntry.js"></script>
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.formPrompt.js"></script>
    <script type="text/javascript" src="scripts/jqueryPlugin/jquery.xml.js"></script>

    <!-- Proj4js scripts; must be included before they are referenced in files below -->
    <script type="text/javascript" src="scripts/utils/proj4js-combined.js"></script>
    <script type="text/javascript" src="scripts/utils/EPSG900913.js"></script>

    <!-- Include HyperCities app-specific scripts: -->
    <script type="text/javascript" src="scripts/main.js"></script>
    <script type="text/javascript" src="scripts/config.js"></script>
    <script type="text/javascript" src="scripts/session.js"></script>
    <script type="text/javascript" src="scripts/map.js"></script>
    <script type="text/javascript" src="scripts/miniMap.js"></script> 
    <script type="text/javascript" src="scripts/user.js"></script>
    <script type="text/javascript" src="scripts/city.js"></script>
    <script type="text/javascript" src="scripts/mapList.js"></script>
    <script type="text/javascript" src="scripts/HCObject.js"></script>
    <script type="text/javascript" src="scripts/collectionList.js"></script>
    <script type="text/javascript" src="scripts/narrativePanel.js"></script>
    <script type="text/javascript" src="scripts/objectEditPanel.js"></script>
    <script type="text/javascript" src="scripts/intelliList.js"></script>
    <script type="text/javascript" src="scripts/permalink.js"></script>
    <script type="text/javascript" src="scripts/search.js"></script>
    <script type="text/javascript" src="scripts/util.js"></script>
    <script type="text/javascript" src="scripts/embeddedApi.js"></script>
    <script type="text/javascript" src="scripts/control/timeSlider.js"></script>

    <!-- Include Google Earth specific scripts: -->
    <script type="text/javascript" src="scripts/earth.js"></script>
    <script type="text/javascript" src="scripts/HCEarthControl.js"></script>
    <script type="text/javascript" src="scripts/HCEarthBtn.js"></script>
    <script type="text/javascript" src="scripts/utils/extensions-0.2.1.pack.js"></script>

<title>Hypercities Earth</title>
</head>


<body class="yui-skin-sam">

<div id="loadingMessage">
  <div id="loadingMessageWrapper">
    <img src="./images/ajax-loader.gif" alt="Loading..." />
      <span>Loading ...</span>
  </div>
  <div id="dr">
    <div class="dr r1"></div>
  </div>
</div>


<div id="warningMessage">
  <noscript>You must enable JavaScript!</noscript>
</div>

<div id="blackoutPanel">
</div>

<!-- [ content  wrapper ] -->
<div id="contentWrapper">
  <div id="map" class="gmap_full"></div>
  <div id="map3d" class="gearth_full"></div>
  <div id="ds">
    <div class="ds v1 o1"></div>
    <div class="ds v2 o2"></div>
    <div class="ds v3 o3"></div>
    <div class="ds v4 o4"></div>
    <div class="ds v5 o5"></div>
  </div>
</div>

<!-- [ Sidebar  wrapper ] -->
<div id="sidebarWrapper" class="dark">
    <div id="topTabWrapper">
        <ul id="topTab">
      <li class="topTab blue">
        <a id="worldMapTab" href="#worldMap">world</a>
      </li>
            <li class="topTab green">
               <a id="searchTab" href="#search">search</a>
            </li>
            <li class="topTab red">
                <!-- This tab should not change the hash, since it has nothing to show if the user is not logged in. -->
               <a id="loginTab" href="javascript:void(0)">Login</a>
            </li>
            <li class="topTab yellow">
                <!-- This tab should not change the hash, since it has nothing to show if the user is not logged in. -->
               <a id="helpTab" href="javascript:void(0)">Help</a>
            </li>
        </ul>
    </div>

    <div id="topPanelWrapper">
        <div id="topPanel"></div>
    <div id="worldMapPanel">Loading World Map ...</div>
    </div>

  <div id="mapPanelWrapper">
    <div id="mapPanel">
      <div class='options'>
        <input id="mapAutoSync" type="checkbox" checked="checked"/>
        automatically refresh maps and collections 
      </div>
    </div>
    <div id="earthPanel">
      <div class='options'>
        <input id="buildings" type="checkbox"/>
        3D buildings
      </div>
      <div class='options'>
        <input id="roads" type="checkbox"/>
        Roads
      </div>
      <div class='options'>
        <input id="borders" type="checkbox"/>
        Borders
      </div>
      <div class='options'>
        <input id="terrain" type="checkbox"/>
        Terrain
      </div>
      <div class='options'>
        <input id="images" type="checkbox"/>historical image
      </div>
    </div>
  </div>

    <div id="intelliTabWrapper">
        <ul id="intelliTab">
            <li class="intelliTab highlight">
                <a id="mapTab" href="#">city</a>
            </li>
            <li class="intelliTab">
                <a id="collectionTab" href="#">collection</a>
            </li>
            <!--<li class="intelliSync">
                <div id="intelliSync" class="syncMap"></div>
            </li>-->
        </ul>
    </div>

    <div id="toolPanelWrapper">
        <div id="toolPanel"></div>
    </div>

    <div id="intelliListWrapper">
        <div id="intelliList"></div>
    </div>

    <div id="narrativePanelWrapper">
    </div>

    <div id="objectEditPanelWrapper">
    </div>

</div>

<div id="bookViewer"></div>

<div id="helpPanelWrapper">
    <div id="helpPanel">
        <div id="helpPanelClose"></div>
        <div id="helpPanelFrame">
            <iframe></iframe>
        </div>
    </div>
</div>


<script type="text/javascript">
  var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
  document.write(unescape("%3Cscript src='" + gaJsHost + "google-analytics.com/ga.js' type='text/javascript'%3E%3C/script%3E"));
</script> 
<script type="text/javascript">
try {
  var pageTracker = _gat._getTracker("<?php echo GOOGLE_ANALYTICS_TRACKER_KEY ?>");
  pageTracker._trackPageview();
  HyperCities._4328.A();
} catch(err) {}
</script>


</body>
</html>
