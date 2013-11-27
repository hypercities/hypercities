<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<?php
	require_once 'includes/serverSession.inc';
?>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>HyperCities JSON Data Importer</title>
    </head>
    <body>
		<?php
		cServerSession::start();
		if (!cServerSession::getUserId()) {
			header ("Location: authFailure.php?reason=notLoggedIn");
			die("Sorry, you must log into HyperCities using the main HyperCities interface to use this feature.");
		}
		?>
		<p>To import your collection from another server, please enter the URL of
			the collection below. This must have the extension ".export,"
			for example, <em>http://hypercities.ats.ucla.edu/provider/collections/12345.export</em>.
			No other extension should be attached. For example, <em>http://hypercities.ats.ucla.edu/provider/collections/12345.kml.export</em>
			will not work.
		</p>
			<p>This is an importer for HyperCities' native <strong>JSON</strong> data format. This will not work for KML.
			</p>
        <form action="provider/objects" method="post">
			<input type="text" name="docUrl" style="width:500px" />
			<input type="hidden" name="new" value="1" />
			<input type="submit" value="submit" />
		</form>
    </body>
</html>
