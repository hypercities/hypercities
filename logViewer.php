<?php
ini_set('display_errors', 1);
require_once("includes/serverSession.inc");
require_once("includes/constants.inc");
cServerSession::start();
$uId = cServerSession::getUserId();
$email = cServerSession::getEmail();
if ($uId) {
	if ($uId == HC_SUPER_USER || in_array($uId, array (13, 15, 17, 19, 21, 94))) {
		$allowed = TRUE;
	} else {
		print $uId;
		die();
		$allowed = FALSE;
	}
} else {
	die("Not allowed");
	header("Location: index.php");
}
?>

<?php

function Sort_Directory_Files_By_Last_Modified($dir, $sort_type = 'descending', $date_format = "F d Y H:i:s.") {
	$files = scandir($dir);
	$array = array();
	foreach ($files as $file) {
		if ($file != '.' && $file != '..' && strpos($file, '.') !== 0) {
			$now = time();
			$last_modified = filemtime($dir . '/' .$file);

			$time_passed_array = array();

			$diff = $now - $last_modified;

			$days = floor($diff / (3600 * 24));

			if ($days) {
				$time_passed_array['days'] = $days;
			}

			$diff = $diff - ($days * 3600 * 24);

			$hours = floor($diff / 3600);

			if ($hours) {
				$time_passed_array['hours'] = $hours;
			}

			$diff = $diff - (3600 * $hours);

			$minutes = floor($diff / 60);

			if ($minutes) {
				$time_passed_array['minutes'] = $minutes;
			}

			$seconds = $diff - ($minutes * 60);

			$time_passed_array['seconds'] = $seconds;

			$array[] = array('file' => $file,
				'timestamp' => $last_modified,
				'date' => date($date_format, $last_modified),
				'time_passed' => $time_passed_array);
		}
	}

	//usort($array, create_function('$a, $b', 'return strcmp($a["timestamp"], $b["timestamp"]);'));
	usort($array, function($a, $b) {
			return strcmp($a["timestamp"], $b["timestamp"]);
		}
	);

	if ($sort_type == 'descending') {
		krsort($array);
	}

	return array($array, $sort_type);
}

?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>HyperCities Log Viewer</title>
		<style>
			td {
				border: 1px solid;
				padding: 10 px;
			}
		</style>
    </head>
    <body>
        <?php
			$path = "provider/logs/";
			if (isset($_GET['path'])) {
				$path .= str_replace("provider/logs/", '', $_GET['path']);
			}
			if (file_exists($path)) {
				if (filetype($path) == 'dir') { ?>
		Directory Listing:
				<ul>
				<?php
				// show list of files
				$directory = Sort_Directory_Files_By_Last_Modified($path);
				//$directory = dir($path);
				if (substr($path, -1) !== '/') $path .= '/';
				?>
				<?php foreach ($directory[0] as $file) { ?>
				<li><a href="logViewer.php?path=<?=$path.$file['file']?>"><?=$file['file']?></a></li>
				<?php }?> </ul>
		<?php //while (FALSE !== ($entry = $directory->read())) { ?>
					<?php //if (strpos($entry, '.') === 0) continue; ?>
				<!--li><a href="logViewer.php?path=<?//=$path.'/'.$entry?>"><?//=$entry?></a></li-->
				<?php //}?> </ul>
		<?php
			} else {
				$log_file_raw = file_get_contents($path);
				$log_file = json_decode($log_file_raw, TRUE);
				//print_r ($log_file);
			}
		} else {
			print "File not found";
		}
if (isset($log_file)) {

?>

Request Snapshot:
<? if (isset($log_file['url'])) { ?>
<ul>
	<li>URL: <?=$log_file['url']?></li>
	<?php if (isset($log_file['objectId']) && $log_file['objectId']) : ?>
		<li>Understood to be a request for <?=$log_file['objectType']?> # <?=$log_file['objectId']?></li>

	<?php else: ?>
		<li>Understood to be a request for <?=$log_file['objectType']?>.</li>
	<?php		endif;?>
	
</ul>
<? } ?>

<p>Request received at: <?=$log_file['received_at']?></p>

<table>
	<tr><th>Request Time</th><th>Data Finding Time</th><th>Templating Time</th></tr>
	<tr><td><?=$log_file['request_processing_time']?></td>
		<td><?=$log_file['data_finding_time']?></td>
		<td><?=$log_file['templating_time']?></td>
	</tr>
</table>

<p>Approximate Database Queries: <?=$log_file['total_queries']?></p>

<?php
if ($log_file['user'] && $log_file['token']) {?>
User Info:
	<ul>
		<li>User Id:<?=$log_file['user']?></li>
		<li>Token:<?=$log_file['token']?></li>
	</ul>
	<?
}
	?>

<br/>
<br/>
Messages:
<ul>
<?php
	foreach ($log_file['messages'] as $message) {?>
	<li><?=$message?></li>
	<?php
	}

?>
<!--/ul>
Errors:
<ul-->
<?php
	/*foreach ($log_file['errors'] as $message) {?>
	<li><?=$message?></li>
	<?php
	}*/

?>
</ul>
<h2>Objects: (<?=$log_file['totalObjects']?> total)</h2>
<table>
	<tr><th>ID</th><th>Title</th></tr>
	<?php foreach ($log_file['objects'] as $obj) : ?>
	<tr><td><?=$obj['id']?></td><td><?=$obj['name']?></td></tr>

	<? endforeach; ?>
</table>

<?php }?>
</body>
</html>
