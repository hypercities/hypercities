<?php
ini_set("memory_limit", "256M");

include_once("includes/connect_db.inc");
include_once("includes/util.inc");
include_once("includes/kml.inc");
include_once("includes/dbUtil.inc");
include_once("includes/kmlParser.inc");
include_once("includes/serverSession.inc");
include_once("includes/MysqlException.inc");

$warningMsg;

function readKml ($targetFile) {
	$xmlstr = '';
	$read_lim = 8192; //size in bytes to load into memory
	$fh = fopen($targetFile, "r");
	$size = filesize($targetFile); //total file size

	while ($size > 0) {
		$read_len = ($size > $read_lim) ? $read_lim : $size; //read length
		$xmlstr .= fread($fh, $read_len);
		$size -= $read_len;
	}

	fclose($fh);
	return $xmlstr;
}

// the warning handler. This handler will not interrupt the execution of the script
function warningHandler ($errno, $errstr, $errfile, $errline) {
	global $warningMsg;

	switch ($errno) {	
		case E_USER_WARNING:
			HC_debugLog("Catch warning. Warning message: $errstr");
			$warningMsg .= $errstr;
		break;
	}
	return true;
}

function genTargetFileName ($filename) {
	$pathinfo = pathinfo($filename);
	$mainFilename = $pathinfo['filename'];
	$extFilename = $pathinfo['extension'];
	$timestamp = time();
	$targetFilename = str_replace(" ", "_", $mainFilename)."_".$timestamp.".".$extFilename;

	return $targetFilename;
}

$old_error_handler = set_error_handler("warningHandler");

cServerSession::start();
HC_checkReferer();

if (!empty($_POST['HCCommand']) && $_POST['HCCommand'] == "upload") {
	if (!empty($_FILES)) {
		$tempFile = $_FILES['HCKMLFile']['tmp_name'];
		$targetFileName = genTargetFileName($_FILES['HCKMLFile']['name']);
		// Todo:: Check mimetype and file extention
		$targetPath = str_replace('uploadKmlFile.php', '', $_SERVER['SCRIPT_FILENAME']).HC_UPLOAD_KML_PATH."/";
		$targetFile = $targetPath.$targetFileName;
		// Uncomment the following line if you want to make the directory if it doesn't exist
		//$result = mkdir(str_replace('//','/',$targetPath), 0777, true);

		try {
			$result = move_uploaded_file($tempFile,$targetFile);
			if (!$result)
				throw new Exception("Cannot move uploaded file.");

			chmod($targetFile, 0644);
			$pathinfo = pathinfo($targetFile);
			$ext = $pathinfo['extension'];
			$mainFilename = $pathinfo['filename'];
			
			if (strcasecmp($ext, "kmz") == 0) {
				//extract kmz 
				$unzipDir = $targetPath.substr($targetFileName, 0, strrpos($targetFileName, '.'));
				exec("unzip $targetFile -d $unzipDir");

				// find .kml
				//$targetFile = $unzipDir."/doc.kml";
				if ($handle = opendir($unzipDir)) {
					while (false !== ($file = readdir($handle))) {
						$pathinfo = pathinfo($file);
						if (isset($pathinfo['extension']) && (strcasecmp($pathinfo['extension'], "kml") == 0)) {
							$targetFile = $unzipDir."/".$file;
							break;
						}
					}
				}

				closedir($handle);
			}

			HC_debugLog("targetFile=".$targetFile);

			$url = "http://".$_SERVER['HTTP_HOST']."/".HC_UPLOAD_KML_PATH."/".$targetFileName;
			$kmzUrl = "http://".$_SERVER['HTTP_HOST']."/".HC_UPLOAD_KML_PATH."/".$mainFilename."/";
		
			//read kml file
			$xmlstr = readKml($targetFile);

			//parse kml file: first round
			$kmlParser = new KmlParser();
			$kmlParser->parseKml($xmlstr);
			$objList = $kmlParser->getObjectList();
			$root = $objList[0];

			// save parsed kml object in session for later use
			cServerSession::setVar("kmzUrl", $kmzUrl);
			cServerSession::setVar("kmlfile", $targetFile);
			//cServerSession::setVar("kmlParser", serialize($kmlParser));

			//HC_reportSuccess($url);
			$meta = array(
				"success" => !empty($root),
				"url" => $url,
				"title" => $root['title'],
				"author" => $root['creator'],
				"startTime" => $root['date_from'],
				"endTime" => $root['date_to'],
				"newObjectNo" => 0,
				"updateObjectNo" => 0,
				"unauthObj" => $kmlParser->getUnauthObjList()
			);

			echo json_encode($meta);
			
		} catch (MysqlException $e) {
			$message = 'Caught exception: '.$e->getMessage();
			HC_errorLog($message);
			$message = "Sorry! KML file upload failed! Database exception occurred.\n".
					   "Please try again. If the problem persists, please contact an administrator.";
			HC_reportError($message);
		} catch (Exception $e) {
			$message = 'Caught exception: '.$e->getMessage();
			HC_errorLog($message);
			$message = "Sorry! KML file uploaded failed! Exception occurred.\n".
					   "Please try again. If it still has problem, please contact administrator.";
			HC_reportError($message);
		}
	}
}


if (!empty($_POST['HCCommand']) && $_POST['HCCommand'] == "commit") {

	try {
		$HC_POST = HC_cleanInput($_POST, 
								array('title'=>'str', 'copyright' => 'str',
									'creator' => 'str', 'dateFrom' => 'str',
									'dateTo' => 'str', 'view' => 'str', 
									'zoom' => 'int', 'parents' => 'str',
									'objectType' => 'int', 'link' => 'str',
									'bounds' => 'str'),
								array('title', 'dateFrom', 'dateTo',
									'parents', 'objectType', 'link', 'bounds'),
								array('creator', 'copyright', 'zoom', 'view'));

		$title = $HC_POST['title'];
		$creator = $HC_POST['creator'];
		$copyright = $HC_POST['copyright'];
		$dateFrom = $HC_POST['dateFrom'];
		$dateTo = $HC_POST['dateTo'];
		$bcFrom = (int)HCDate::isBCDate($dateFrom);
		$bcTo = (int)HCDate::isBCDate($dateTo);
		$dateFrom = HCDate::toADDate($dateFrom);
		$dateTo = HCDate::toADDate($dateTo);
		$userId = cServerSession::getUserId();
		$parents = explode(',', $HC_POST['parents']);

		if (!empty($HC_POST['view'])) {
			$view = json_decode($HC_POST['view'], true);
			$view = KmlParser::createViewFromArray($view);
		} else $view = NULL;

		$zoom = $HC_POST['zoom'];

		$objType = $HC_POST['objectType'];	// HC_OBJECT_TYPE_MEDIA or HC_OBJECT_TYPE_3D
		$link = urldecode($HC_POST['link']);	// use kmzUrl in session instead
		$kmzUrl = cServerSession::getVar("kmzUrl");
		$bound = json_decode($HC_POST['bounds'], true);


		//read kml file
		$xmlstr = readKml(cServerSession::getVar("kmlfile"));

		//commit to database
		$kmlParser = new KmlParser($userId, $title, $creator, $copyright,
								$dateFrom, $dateTo, $view, $zoom, $kmzUrl, 
								$objType, $bound);
		$kmlParser->parseKml($xmlstr);
		$kmlParser->precommit();
		HC_debugLog($kmlParser);
		$ids = $kmlParser->commitToDb();
		
		//get parameters from parsed kml
		//$kmlCollectionId = $kmlParser->getCollectionId();
	
		// insert the object relations
		foreach($ids as $id) {
			if (!is_numeric($id)) continue;
			foreach($parents as $addedParentId) {
				if (!is_numeric($addedParentId)) continue;
				// check if we already have this relation
				// (we will this relation if we are going to update it)
				$relations = select("object_relations", 
					"object_id = $addedParentId AND subject_id = $id");
				HC_debugLog("Old relation:".print_r($relations, true));

				// if there is no relation, insert it
				if (count($relations) == 0) {
					$object = array('object_id' => $addedParentId,
						'subject_id' => $id,
						'scope_id' => $addedParentId,
						'owner_id' => $userId,
						'created_at' => 'NOW()',
						'updated_at' => 'NOW()');
					$result = insert("object_relations", $object);
				}

				$object = updateColTimeBoundBottomUp($addedParentId);
				HC_debugLog("boundary and timespan = ".print_r($object, true));
			}
		}

		header('Content-type: application/json', true, 201);
		echo json_encode(array("type" => $objType, "id" => $ids[0]));

	} catch (MysqlException $e) {
		$message = 'Caught exception: '.$e->getMessage();
		HC_errorLog($message);
		$message = "Sorry, saving your KML file caused a database exception.\n".
				   "Please try again. If the problem persists, please contact an administrator.";
		HC_reportError($message);
	} catch (UnsupportedElementError $e) {
		$message = 'Unsupported Element: '.$e->getMessage();
		HC_errorLog($message);
		$message = "Error: Your KML file contains only NetworkLinks. "
					." You may have downloaded a KML file that does not have any data,"
					." only links to remotely-stored KML.\n\n"
					." Please check your file in a text editor and try again.";
		HC_reportError($message);
	} catch (Exception $e) {
		$message = 'Caught exception: '.$e->getMessage();
		HC_errorLog($message);
		
		$message = "Sorry! KML file save failed! Exception occurred.\n".
				   "Please try again. If it still has problem, please contact administrator.";
		HC_reportError($message);
	}
}
?>
