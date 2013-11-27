<?php
include_once("includes/constants.inc");

/*this file is for uploading image*/
function t ($str) {
    return $str;
}
function to_json ($arr) {
    if (function_exists('json_encode')) return json_encode($arr);
    $str = array();
    foreach ($arr as $key => $val)
        $str[] = is_bool($val) ? "\"$key\":".($val ? "true" : "false")
						: "\"$key\":\"$val\"";

    return "{".implode(",", $str)."}";
}

$maxSize = 2048000; //2M

// get the one and only file element from the FILES array
$file = current($_FILES);

// verify upload was successful...
if ($file['error'] === UPLOAD_ERR_OK) {
	if ($file['size'] > $maxSize) {
		$error = "File's size is over 2MB, file is too big!";
	} else {
		$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
		switch ($ext) {
			// handle the Image File upload
			case 'jpg' : 
			case 'jpeg': 
			case 'gif' :
			case 'png' : 
			case 'bmp' :

				// Setup image upload Configuration
				$uploadPath = HC_UPLOAD_IMAGE_PATH;
				$imageMaxWidth = 1024;
				$randName = "Img_" . md5(uniqid(true));

				// and move the file to it's destination
				if ($ext =="jpeg" || $ext=="jpg") {
					$new_img = imagecreatefromjpeg($file['tmp_name']);
				}
				else if ($ext =="png") {
					$new_img = imagecreatefrompng($file['tmp_name']);
				}
				else if ($ext =="gif") {
					$new_img = imagecreatefromgif($file['tmp_name']);
				}
				else { 
					$new_img= $file['tmp_name'];
				}
				//      else if ($ext =="jpeg"){ $new_img = imagecreatefromjpeg($file['tmp_name']);}
				//      else if ($ext =="jpeg"){ $new_img = imagecreatefromjpeg($file['tmp_name']);}
				list($width, $height) = getimagesize($file['tmp_name']);
				$imageRatio=$width/$height;
				$doResize=false;

				// Resize only when image width > $imageMaxWidth
				if (($imageRatio>1) && ($width >= $imageMaxWidth)) {
					$doResize = true;
					$newWidth = $imageMaxWidth;
					$newHeight = $imageMaxWidth/$imageRatio;
				}
				else if (($imageRatio<=1) && ($height >= $imageMaxWidth)) {
					$doResize = true;
					$newHeight = $imageMaxWidth;
					$newWidth = $imageMaxWidth * $imageRatio;
				}

				if ($doResize) {
					//function for resize image.
					if (function_exists(imagecreatetruecolor)) {
						$resized_img = imagecreatetruecolor($newWidth,$newHeight);
					} else {
						die("Error: Please make sure you have GD library ver 2+");
					}
					//the resizing is going on here!
					imagecopyresized($resized_img, $new_img, 0, 0, 0, 0, $newWidth, 
									$newHeight, $width, $height
					);
					ImageJpeg($resized_img, "$uploadPath/$randName.$ext");
					$imageSize = getimagesize($resized_img);
					ImageDestroy ($resized_img);
				} 
				else {
					ImageJpeg($new_img, "$uploadPath/$randName.$ext");
					$imageSize = getimagesize($new_img);
				}
				ImageDestroy ($new_img);
				if (!@move_uploaded_file($file['tmp_name'], "$uploadPath/$file[name]")) {
					$error = t("Can't move uploaded file into the $uploadPath directory");
				}
				break;
			default:
				$error = t('File format is wrong!');
		}
	}
}
else {
	switch ($file['error']) {
		case UPLOAD_ERR_INI_SIZE:
		case UPLOAD_ERR_FORM_SIZE:
			$error = t('File is too big.');
			break;

		case UPLOAD_ERR_PARTIAL:
			$error = t('File was only partially uploaded.');
			break;

		case UPLOAD_ERR_NO_FILE:
			$error = t('No file was uploaded.');
			break;

		case UPLOAD_ERR_NO_TMP_DIR:
			$error = t('Upload folder not found.');
			break;

		case UPLOAD_ERR_CANT_WRITE:
			$error = t('Disk could not be written to.');
			break;

		case UPLOAD_ERR_EXTENSION:
			$error = t('This file\'s extension is not allowed.');
			break;
	}
}
// print results for AJAX handler
echo to_json(array(
	'error' => $error,
	'path' => $uploadPath,
	'file' => "$randName.$ext",
	'tmpfile' => $file['tmp_name'],
	'size' => $imageSize,
	'url' => "http://".$_SERVER['HTTP_HOST']."/".HC_UPLOAD_IMAGE_PATH."/".$randName.".".$ext)
);
?>
