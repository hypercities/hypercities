<?php

include_once("includes/connect_db.inc");
include_once('includes/email.inc');
include_once('includes/user.inc');
include_once('includes/countryOccupationList.inc');
include_once('includes/util.inc');
include_once("includes/serverSession.inc");
include_once("includes/dbUtil.inc");

cServerSession::start();

$error_flag = false;  // flag is true if form information is not complete
$error_array = array();
$target_path = "../".HC_UPLOAD_IMAGE_PATH."/";
$providerName = cServerSession::getVar('providerName');
$externalName = cServerSession::getVar('externalName');


//if this is an OpenId registration
if (isset($_GET['isOpenId']) || (isset($_POST['isOpenId']) 
	&& (boolean)$_POST['isOpenId'] )) {
	$isOpenId = true;
	HC_debugLog("This is an OpenId registration");
}
else {
	$isOpenId = false;
}

if (strcasecmp($providerName, "shibboleth") == 0) {
	// check that all fields were entered properly (validation)
if (isset($_POST['submit'])) {
	try {
		if ($isOpenId) {
			if (//(!isset($_POST['firstName']) || empty($_POST['firstName']))
				//|| (!isset($_POST['lastName']) || empty($_POST['lastName']))
				 (!isset($_POST['birthyear']) || empty($_POST['birthyear']))
				|| (!isset($_POST['city']) || empty($_POST['city']))
				|| (strcmp($_POST['country'], "select a country") == 0)
				|| (!isset($_POST['privacy']) || empty($_POST['privacy'])))
			{
				$error_flag = true;
				$error_message = "Please fill out all required fields.";
				array_push($error_array, $error_message);
			}
		}
		else  {
			if (//(!isset($_POST['firstName']) || empty($_POST['firstName']))
				//|| (!isset($_POST['lastName']) || empty($_POST['lastName']))
				 (!isset($_POST['birthyear']) || empty($_POST['birthyear']))
				|| (!isset($_POST['city']) || empty($_POST['city']))
				|| (!isset($_POST['email']) || empty($_POST['email']))
				|| (strcmp($_POST['country'], "select a country") == 0)
				|| (!isset($_POST['privacy']) || empty($_POST['privacy']))
				//|| (!isset($_POST['password']) || empty($_POST['password']))
				//|| (!isset($_POST['passwordConfirm'])
				//|| empty($_POST['passwordConfirm']))
				)
			{
				$error_flag = true;
				$error_message = "Please fill out all required fields.";
				array_push($error_array, $error_message);
			}
		}

		if (!$error_flag) {
			// all required fields are filled
			//check for more erroneous form input
			if ($isOpenId) {
				if (!isset($_POST['certify']) || empty($_POST['certify'])) {
					$error_flag = true;
					array_push($error_array, "Please read the Terms of Service and check the certify box.");
				}
				//only consider 1000~2999
				$pattern = "/^[12][\d]{3}$/";
				if (!is_numeric($_POST['birthyear'])
					|| !preg_match($pattern, $_POST['birthyear']))
				{
					$error_flag = true;
					array_push($error_array, "birthyear is not numeric or 4 digits");
				}
			}
			else {
				if ($_POST['password'] != $_POST['passwordConfirm']) {
					$error_flag = true;
					array_push($error_array, "Passwords did not match.");
				}
				if (!isset($_POST['certify']) || empty($_POST['certify'])) {
					$error_flag = true;
					array_push($error_array,
							"Please read the Terms of Service and check the agreement box.");
				}
				//only consider 1000~2999
				$pattern = "/^[12][\d]{3}$/";
				if (!is_numeric($_POST['birthyear'])
						|| !preg_match($pattern, $_POST['birthyear']))
				{
					$error_flag = true;
					array_push($error_array, "birthyear is not numeric or 4 digits");
				}

				// Check if email address is valid syntax (ie. name@domain.com)
				$pattern = "/^([_a-z0-9-]+)(\.[_a-z0-9-]+)*@([a-z0-9-]+)(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/";

				if (!preg_match($pattern, $_POST['email'])) {
					$error_flag = true;
					array_push($error_array, "Email address is invalid");
				}
				else{
					$sql= "SELECT email FROM users WHERE email='".$_POST['email']."'";
					$result = sqlCommand($sql);
					if (!empty($result)) {
						$error_flag = true;
						array_push($error_array, "The email address is already registered.");
					}
				}
			}
		}
		//save photo file
		//$timestamp = date( 'Y-m-d H:i:s');
		$target_path = $target_path.date('Y-m-d.H:i:s.')
						.basename($_FILES['uploadedfile']['name']);
		if ($_FILES['uploadedfile']['error'] == UPLOAD_ERR_OK) {
			$ext = strtolower(pathinfo($_FILES['uploadedfile']['name'],PATHINFO_EXTENSION));
			switch ($ext) {
				case 'jpg': case 'jpeg': case 'gif':
				case 'png': case 'bmp':
					if (move_uploaded_file($_FILES['uploadedfile']['tmp_name'],
						$target_path))
					{
						//echo "The file ".  basename( $_FILES['uploadedfile']['name']). " has been uploaded";
					} else {
						$error_flag = true;
						//echo "There was an error uploading the file, please try again!";
						array_push($error_array,
								"There was an error uploading the file, please try again!");
					}
					break;   // file type is okay!
				default:
					//echo "file format is wrong!";
					$error_flag=true;
					array_push($error_array, "file format is wrong!");
					//throw new InvalidFileTypeException($ext);
			}
		} else if ($_FILES['uploadedfile']['error'] == UPLOAD_ERR_NO_FILE) {
			$target_path="";
		}
		else {
			$error_flag = true;
			//echo "There was an error uploading the file, please try again!";
			array_push($error_array, "There was an error uploading the file, please try again!");
		}
		//save photo url
		$_POST['photo_url'] = $target_path;

		if (!$error_flag) {
			// all required fields were entered correctly
			// put this user in database
			

				$info = $_POST;
				if (!empty($_SESSION["email"])) $info["email"] = $_SESSION["email"];
				$info['firstName'] = $externalName['first'];
				$info['nickname'] = $externalName['first'];
				$info['lastName'] = $externalName['last'];

				print_r ($info);

				$user = new cUser();
				$userId = $user->createUser($info);

				//activate user automatically
				$user->activateUser($userId);
				$user->createOpenIdUser($userId, $_SESSION['openId'],
										$_SESSION['providerName'],
										$_SESSION['oidType']);
				//login automatically
				$user->loginByOpenId($_SESSION['openId']);
				if (!isset($_SESSION['redirect']) || $_SESSION['redirect'] == false) {
?>

				<script type="text/javascript">
				self.close();
				window.opener.HyperCities.user.sync();
				window.opener.HyperCities.user.reload();
				</script>

<?php
				} else {
				    header("Location: index.php");
			}
			
			

			exit;
		}
	}
	catch (MysqlException $e) {
		$message = 'Caught exception: '.$e->getMessage();
		HC_errorLog($message);
		$message = "Sorry, registration failed. Please try again."
					." If you experience the same problem again, please contact"
					." the administrator and report that a database error occurred.";
		echo $message;
	}
	catch (Exception $e) {
		$message = 'Caught exception: '.$e->getMessage();
		HC_errorLog($message);
		$message = "Sorry, registration failed. Please try again."
					." If you experience the same problem again, please contact"
					." the administrator and report that a general error occurred.";
		echo $message;
	}
}
?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<link rel="stylesheet" type="text/css" href="css/regForm.css" />

<title>:: Hypercities :: </title>
</head>
<body>

<div id="regWrapper">
	<h1>Registration</h1>
	<!--
		After submitting this form, you will receive a confirmation email with a temporary password.  After logging in, you may change your password
		and edit your profile.<br /><br />-->
	<div class="error" font="red">
<?php
if ($error_flag) {
	foreach($error_array as $message) {
		echo "<div>";
		echo $message;
		echo "</div>";
	}
}
?>
	</div>

	<form enctype='multipart/form-data' name='registration' method='POST' action='<?php echo $_SERVER['PHP_SELF']?>'>

		<div class="container">
			<table width="100%" border="0" cellpadding="2" cellspacing="0">
				<tr>
					<td>
						<table width="100%" cellpadding="3">
							<tr>
								<td bgcolor="#FFFFFF">
									<b>My Profile</b><br />
									Please fill the columns in detail. Fields marked with <span class="denotes">*</span> are mandatory.
								</td>
							</tr>
						</table>
						<table width="100%" cellpadding="3">
							<tr>
								<td bgcolor="FAFAFA" style="width:180px">
									<strong>First name:</strong>			</td>
								<td bgcolor="FAFAFA" style="width:150px">
									<strong>Last name:</strong>			</td>
								<td bgcolor="FAFAFA">
									<strong><span class="denotes">*</span> Birth Year:</strong>			</td>
							</tr>
							<tr>
								<td bgcolor="F2F2F2">
									<?php echo $externalName['first']; ?>
								</td>
								<td bgcolor="F2F2F2">
									<?php echo $externalName['last']; ?>
								</td>
								<td bgcolor="F2F2F2">
									<input id="birthyear" name="birthyear" type="text" size="3" value="<?php echo $_POST['birthyear']?>"/>
								</td>
							</tr>
						</table>
						<table>
							<tr>
								<td bgcolor="FAFAFA" style="width:180px">
									<strong><span class="denotes">*</span> Nickname:</strong> </td>
								<td bgcolor="FAFAFA" style="width:180px">
									<strong><span class="denotes"></span> Upload Your Photo:</strong>(file size must be smaller than 50KB)</td>
							</tr>
							<td bgcolor="F2F2F2">
								<?php echo $externalName['first']; ?>
							</td>
							<td bgcolor="F2F2F2">
								<input name="uploadedfile" type="file" maxlength="50000"/>
							</td>

							<tr>
							</tr>
						</table>
						<table width="100%" cellpadding="3">
							<tr>
								<td bgcolor="FAFAFA" style="width:180px"><strong><span class="denotes">*</span> city:</strong> </td>
								<td bgcolor="FAFAFA" style="width:150px"><strong>zip code:</strong> </td>
								<td bgcolor="FAFAFA"><strong><span class="denotes">*</span> country:</strong> </td>
							</tr>
							<tr>
								<td bgcolor="F2F2F2"><input id="city" name="city" type="text" size="23" value="<?php echo $_POST['city']?>"/>
								</td>
								<td bgcolor="F2F2F2"><input id="zipcode" name="zipcode" type="text" size="6" value="<?php echo $_POST['zipcode']?>"/>
								</td>
								<td bgcolor="F2F2F2">
									<select name="country">
										<option>select a country</option>
<?php
for ($i=0; $i < count($country_list); $i++) {
	echo "<option value='".$country_list[$i]."'";
	if (strcmp($_POST['country'], $country_list[$i]) == 0) {
		echo "selected>".$country_list[$i]."</option>";
	}
	else {
		echo ">".$country_list[$i]."</option>";
	}
}
?>
									</select>
								</td>
							</tr>
							<tr>

							</tr>

						</table>

						<table width="100%" cellpadding="3" style="padding-top:20px;">
							<tr>
								<td bgcolor="FAFAFA" style="width: 180px"><strong>occupation:</strong> </td>
								<td bgcolor="FAFAFA" style="width: 150px"><strong>gender:</strong> </td>
								<!--<td bgcolor="FAFAFA"><strong>upload photo :</strong> </td>-->
								<!--td bgcolor="FAFAFA"><strong>default hypercity:</strong></td-->
								</tr>
								<tr>
									<td bgcolor="F2F2F2">                                  <select name="occupation">
											<option class="prompt">Select your profession </option>
<?php
/*for ($i=0; $i < count($occupation_list); $i++) {
	echo "<option value='".$occupation_list[$i]."'";
	if (strcmp($_POST['occupation'], $occupation_list[$i]) == 0) {
		echo "selected>".$occupation_list[$i]."</option>";
	}
	else {
		echo ">".$occupation_list[$i]."</option>";
	}
	}*/
?>
										</select>
									</td>
									<!--<td bgcolor="F2F2F2"><a class="btn" href="#">browse</a></td>-->
									<td bgcolor="F2F2F2"><label>
											<input name="gender" type="radio" value="M" CHECKED/>
											Male </label>
										<label>
											<input name="gender" type="radio" value="F" />
											Female </label></td>
									<!--td bgcolor="F2F2F2">

										<select name='hypercity' id='hypercity'>
											<option class="prompt">Choose your default hypercity </option>
<?php
/*
$sql_query = "SELECT name,id FROM cities;";
$result = mysql_query($sql_query) or die(mysql_error());;
while($row = mysql_fetch_assoc($result)) {
	if ($_POST['hypercity'] == $row['id']) {
		echo "<option value='".$row['id']."' selected>".$row['name']."</option>";
	}
	else
		echo "<option value='".$row['id']."'>".$row['name']."</option>";
}*/
?>
										</select>
										</td-->
									</tr>
								</table>

								<table width="100%" cellpadding="3" style="padding-top:20px;">
									<tr>
<?php
//hide password if it is an OpenId registration
if (!$isOpenId) {
?>
										<td bgcolor="FAFAFA" style="width:340px"><strong><span class="denotes">*</span> password:</strong> </td>
<?php
}
?>
										<td bgcolor="FAFAFA" ><span class="denotes">*</span><strong>privacy:</strong> (Make your profile)</td>
									</tr>
									<tr style="vertical-align:top">
<?php
//hide password if it is an OpenId registration
if (!$isOpenId) {
?>
										<td bgcolor="F2F2F2"><input id="password" name="password" type="password" size="23" /></td>
<?php
}
?>
										<td bgcolor="F2F2F2" rowspan="3">
											<label>
												<input name="privacy" type="radio" value="1" style="vertical-align:middle"/>
												Invisible to everyone
											</label>
											<br/>
											<label>
												<input name="privacy" type="radio" value="3" checked="checked" style="vertical-align:middle"/>
												Visible only to people in my groups
											</label>
											<br/>
											<label>
												<input name="privacy" type="radio" value="2" style="vertical-align:middle"/>
												Visible to everyone
											</label>
										</td>
									</tr>

<?php
//hide password if it is an OpenId registration
if (!$isOpenId) {
?>
									<tr>
										<td bgcolor="FAFAFA"><strong><span class="denotes">*</span> confirm password:</strong> </td>
									</tr>
									<tr>
										<td bgcolor="F2F2F2"><input id="passwordConfirm" name="passwordConfirm" type="password" size="23" /></td>
									</tr>
<?php
}
?>
								</table>
								<table width="100%" cellpadding="3" style="padding-top:20px;">
									<tr>
										<td bgcolor="FAFAFA"><strong><span>admin code:</span></strong> (Leave blank if you don't know what it is.)</td>
										</tr>
										<tr>
											<td bgcolor="F2F2F2"><input id="code" name="code" type="text" size="10" /></td>
										</tr>
								</table></td>
							</tr>
						</table>
					</div>
					<br />
					<div class="container"><table width="100%" border="0" cellpadding="2" cellspacing="0">
							<tr>
								<td>
									<table width="100%" cellpadding="3">
										<tr>
											<td bgcolor="#FFFFFF">
												<b>About Me</b><br />
												Please tell us about yourself. you are limited to 255 characters.</td>
										</tr>
									</table>
									<table width="100%" cellpadding="3">

										<tr>
											<td bgcolor="F2F2F2"><textarea style="width:590px" name="description" cols="50" rows="5"><?php echo stripslashes(urldecode($_POST['description']))?></textarea>
											</td>

										</tr>
								</table></td>
							</tr>
						</table>
					</div>
					<br />
					<div class="container">
						<table width="100%" border="0" cellpadding="2" cellspacing="0">
							<tr>
								<td>
									<table width="100%" cellpadding="3">
										<tr> <td bgcolor="#FFFFFF"> <b>Terms of Service</b></td> </tr>
									</table>
									<table width="100%" cellpadding="3">
										<tr>
											<td bgcolor="F2F2F2" colspan="2">
												<?php include("./includes/termsOfService.inc");?>
											</td>
										</tr>

										<tr><td style="width:20px">
												<input type="checkbox" name="certify" value="certify"/></td>
											<td><strong> I certify that I have read all sections of the Terms of Service contained in this box and I agree with all of these terms.</strong><br/>
										</td></tr>
									</table>
								</td>
							</tr>
						</table>
					</div>
					<br />

					<table width="100%" border="0" cellpadding="2" cellspacing="0">
						<tr>
							<td><input type="submit" name="submit" class="btn" value="submit" />
								<input type="reset" class="btn" value="reset" /></td>
							<td align="right"><input type="button" class="btn" onclick="window.close()" value="Cancel" /></td>
						</tr>
					</table>
					<br /><br />
				</div>
			</div>

			<input type="hidden" name="isOpenId" value="<?php echo $isOpenId?>" />
		</td>
	</tr>
</table>
</form>
</body>
</html>

<?php
} else {
	

// check that all fields were entered properly (validation)
if (isset($_POST['submit'])) {
	try {
		if ($isOpenId) {
			if ((!isset($_POST['firstName']) || empty($_POST['firstName'])) 
				|| (!isset($_POST['lastName']) || empty($_POST['lastName']))
				|| (!isset($_POST['birthyear']) || empty($_POST['birthyear']))
				|| (!isset($_POST['city']) || empty($_POST['city']))
				|| (strcmp($_POST['country'], "select a country") == 0)
				|| (!isset($_POST['privacy']) || empty($_POST['privacy'])))
			{
				$error_flag = true;
				$error_message = "Please fill out all required fields.";
				array_push($error_array, $error_message);
			}
		}
		else  {
			if ((!isset($_POST['firstName']) || empty($_POST['firstName'])) 
				|| (!isset($_POST['lastName']) || empty($_POST['lastName']))
				|| (!isset($_POST['birthyear']) || empty($_POST['birthyear']))
				|| (!isset($_POST['city']) || empty($_POST['city']))
				|| (!isset($_POST['email']) || empty($_POST['email']))
				|| (strcmp($_POST['country'], "select a country") == 0)
				|| (!isset($_POST['privacy']) || empty($_POST['privacy']))
				|| (!isset($_POST['password']) || empty($_POST['password']))
				|| (!isset($_POST['passwordConfirm'])
				|| empty($_POST['passwordConfirm'])))
			{
				$error_flag = true;
				$error_message = "Please fill out all required fields.";
				array_push($error_array, $error_message);
			}
		}

		if (!$error_flag) {
			// all required fields are filled
			//check for more erroneous form input
			if ($isOpenId) {
				if (!isset($_POST['certify']) || empty($_POST['certify'])) {
					$error_flag = true;
					array_push($error_array, "Please read the Terms of Service and check the certify box.");
				}
				//only consider 1000~2999
				$pattern = "/^[12][\d]{3}$/";
				if (!is_numeric($_POST['birthyear'])
					|| !preg_match($pattern, $_POST['birthyear']))
				{
					$error_flag = true;
					array_push($error_array, "birthyear is not numeric or 4 digits");
				}
			}
			else {
				if ($_POST['password'] != $_POST['passwordConfirm']) {
					$error_flag = true;
					array_push($error_array, "Passwords did not match.");
				}
				if (!isset($_POST['certify']) || empty($_POST['certify'])) {
					$error_flag = true;
					array_push($error_array, 
							"Please read the Terms of Service and check the agreement box.");
				}
				//only consider 1000~2999
				$pattern = "/^[12][\d]{3}$/";
				if (!is_numeric($_POST['birthyear'])
						|| !preg_match($pattern, $_POST['birthyear']))
				{
					$error_flag = true;
					array_push($error_array, "birthyear is not numeric or 4 digits");
				}

				// Check if email address is valid syntax (ie. name@domain.com)
				$pattern = "/^([_a-z0-9-]+)(\.[_a-z0-9-]+)*@([a-z0-9-]+)(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/";

				if (!preg_match($pattern, $_POST['email'])) {
					$error_flag = true;
					array_push($error_array, "Email address is invalid");
				}
				else{
					$sql= "SELECT email FROM users WHERE email='".$_POST['email']."'";
					$result = sqlCommand($sql);
					if (!empty($result)) {
						$error_flag = true;
						array_push($error_array, "The email address is already registered.");
					}
				}
			}
		}
		//save photo file
		//$timestamp = date( 'Y-m-d H:i:s');
		$target_path = $target_path.date('Y-m-d.H:i:s.')
						.basename($_FILES['uploadedfile']['name']);
		if ($_FILES['uploadedfile']['error'] == UPLOAD_ERR_OK) {
			$ext = strtolower(pathinfo($_FILES['uploadedfile']['name'],PATHINFO_EXTENSION));
			switch ($ext) {
				case 'jpg': case 'jpeg': case 'gif':
				case 'png': case 'bmp':
					if (move_uploaded_file($_FILES['uploadedfile']['tmp_name'],
						$target_path))
					{
						//echo "The file ".  basename( $_FILES['uploadedfile']['name']). " has been uploaded";
					} else {
						$error_flag = true;
						//echo "There was an error uploading the file, please try again!";
						array_push($error_array,
								"There was an error uploading the file, please try again!");
					}
					break;   // file type is okay!
				default:
					//echo "file format is wrong!";
					$error_flag=true;
					array_push($error_array, "file format is wrong!");
					//throw new InvalidFileTypeException($ext);
			}
		} else if ($_FILES['uploadedfile']['error'] == UPLOAD_ERR_NO_FILE) {
			$target_path="";
		}
		else {
			$error_flag = true;
			//echo "There was an error uploading the file, please try again!";
			array_push($error_array, "There was an error uploading the file, please try again!");
		}
		//save photo url
		$_POST['photo_url'] = $target_path;

		if (!$error_flag) {
			// all required fields were entered correctly
			// put this user in database
			if ($isOpenId) {
				if (!empty($_SESSION["email"])) $_POST["email"] = $_SESSION["email"];
				$user = new cUser();
				$userId = $user->createUser($_POST);

				//activate user automatically
				$user->activateUser($userId);
				$user->createOpenIdUser($userId, $_SESSION['openId'],
										$_SESSION['providerName'],
										$_SESSION['oidType']);
				//login automatically
				$user->loginByOpenId($_SESSION['openId']);
				if (!isset($_SESSION['redirect']) || $_SESSION['redirect'] == false) {
?>

				<script type="text/javascript">
				self.close();
				window.opener.HyperCities.user.sync();
				window.opener.HyperCities.user.reload();
				</script>

<?php
				} else {
				    header("Location: index.php");
			}
			}
			else {
				$user = new cUser(null,$_POST['nickname'] , $_POST['password'],
									$_POST['email']);
				$user->createUser($_POST);
				// send activation email to user
				$myEmail = new cEmail("smtp.gmail.com",
									"hypercitiesproject@gmail.com", "hyper4cities"
						);
				$myEmail->emailActivation($user);
				//forward to a confirmation page
				$host  = $_SERVER['HTTP_HOST'];
				$uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
				$extra = 'regConfirm.php';
				header("Location: http://$host$uri/$extra");
			}

			exit;
		}
	}
	catch (MysqlException $e) {
		$message = 'Caught exception: '.$e->getMessage();
		HC_errorLog($message);
		$message = "Sorry, registration failed. Please try again."
					." If you experience the same problem again, please contact"
					." the administrator and report that a database error occurred.";
		echo $message;
	}
	catch (Exception $e) {
		$message = 'Caught exception: '.$e->getMessage();
		HC_errorLog($message);
		$message = "Sorry, registration failed. Please try again."
					." If you experience the same problem again, please contact"
					." the administrator and report that a general error occurred.";
		echo $message;
	}
}
?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<link rel="stylesheet" type="text/css" href="css/regForm.css" />

<title>:: Hypercities :: </title>
</head>
<body>

<div id="regWrapper">
	<h1>Registration</h1>
	<!--
		After submitting this form, you will receive a confirmation email with a temporary password.  After logging in, you may change your password 
		and edit your profile.<br /><br />-->
	<div class="error" font="red">
<?php
if ($error_flag) {
	foreach($error_array as $message) {
		echo "<div>";
		echo $message;
		echo "</div>";
	}
}
?>
	</div>

	<form enctype='multipart/form-data' name='registration' method='POST' action='<?php echo $_SERVER['PHP_SELF']?>'>

		<div class="container">
			<table width="100%" border="0" cellpadding="2" cellspacing="0">
				<tr>
					<td>
						<table width="100%" cellpadding="3">
							<tr>
								<td bgcolor="#FFFFFF">
									<b>My Profile</b><br />
									Please fill the columns in detail. Fields marked with <span class="denotes">*</span> are mandatory.
								</td>
							</tr>
						</table>
						<table width="100%" cellpadding="3">
							<tr>
								<td bgcolor="FAFAFA" style="width:180px">
									<strong><span class="denotes">*</span> first name:</strong>			</td>
								<td bgcolor="FAFAFA" style="width:150px">
									<strong><span class="denotes">*</span> last name:</strong>			</td>

<?php
//hide email if it is an OpenId registration
if (!$isOpenId) {
?>
								<td bgcolor="FAFAFA">
									<strong><span class="denotes">*</span> E-Mail:</strong>				</td>
<?php
}
?>
								<td bgcolor="FAFAFA">
									<strong><span class="denotes">*</span> Birth Year:</strong>			</td>
							</tr>
							<tr>
								<td bgcolor="F2F2F2">
									<input id="firstName" name="firstName" type="text" size="23" value="<?php echo $_POST['firstName'] ?>"/>								
								</td>
								<td bgcolor="F2F2F2">
									<input id="lastName" name="lastName" type="text" size="15" value="<?php echo $_POST['lastName']?>"/>								
								</td>
<?php
//hide email if it is an OpenId registration
if (!$isOpenId) {
?>
								<td bgcolor="F2F2F2">
									<input id="email" name="email" type="text" size="25" value="<?php echo $_POST['email']?>"/>
								</td>
<?php
}
?>
								<td bgcolor="F2F2F2">
									<input id="birthyear" name="birthyear" type="text" size="3" value="<?php echo $_POST['birthyear']?>"/>							
								</td>
							</tr>
						</table>
						<table>
							<tr>
								<td bgcolor="FAFAFA" style="width:180px">
									<strong><span class="denotes">*</span> Nickname:</strong> </td>
								<td bgcolor="FAFAFA" style="width:180px">
									<strong><span class="denotes"></span> Upload Your Photo:</strong>(file size must be smaller than 50KB)</td>
							</tr>
							<td bgcolor="F2F2F2">
								<input id="nickname" name="nickname" type="text" size="15" value="<?php echo $_POST['nickname']?>"/>
							</td>
							<td bgcolor="F2F2F2">
								<input name="uploadedfile" type="file" maxlength="50000"/>
							</td>   

							<tr>
							</tr>
						</table>
						<table width="100%" cellpadding="3">
							<tr>
								<td bgcolor="FAFAFA" style="width:180px"><strong><span class="denotes">*</span> city:</strong> </td>
								<td bgcolor="FAFAFA" style="width:150px"><strong>zip code:</strong> </td>
								<td bgcolor="FAFAFA"><strong><span class="denotes">*</span> country:</strong> </td>
							</tr>
							<tr>
								<td bgcolor="F2F2F2"><input id="city" name="city" type="text" size="23" value="<?php echo $_POST['city']?>"/>
								</td>
								<td bgcolor="F2F2F2"><input id="zipcode" name="zipcode" type="text" size="6" value="<?php echo $_POST['zipcode']?>"/>
								</td>
								<td bgcolor="F2F2F2">
									<select name="country">
										<option>select a country</option>
<?php
for ($i=0; $i < count($country_list); $i++) {
	echo "<option value='".$country_list[$i]."'";
	if (strcmp($_POST['country'], $country_list[$i]) == 0) {
		echo "selected>".$country_list[$i]."</option>";
	}
	else {
		echo ">".$country_list[$i]."</option>";
	}
}
?> 
									</select>
								</td>
							</tr>
							<tr>

							</tr>

						</table>

						<table width="100%" cellpadding="3" style="padding-top:20px;">
							<tr>
								<td bgcolor="FAFAFA" style="width: 180px"><strong>occupation:</strong> </td>
								<td bgcolor="FAFAFA" style="width: 150px"><strong>gender:</strong> </td>
								<!--<td bgcolor="FAFAFA"><strong>upload photo :</strong> </td>-->
								<!--td bgcolor="FAFAFA"><strong>default hypercity:</strong></td-->
								</tr>
								<tr>
									<td bgcolor="F2F2F2">                                  <select name="occupation">
											<option class="prompt">Select your profession </option>
<?php
for ($i=0; $i < count($occupation_list); $i++) {
	echo "<option value='".$occupation_list[$i]."'";
	if (strcmp($_POST['occupation'], $occupation_list[$i]) == 0) {
		echo "selected>".$occupation_list[$i]."</option>";
	}
	else {
		echo ">".$occupation_list[$i]."</option>";
	}
}
?> 
										</select>
									</td>
									<!--<td bgcolor="F2F2F2"><a class="btn" href="#">browse</a></td>-->
									<td bgcolor="F2F2F2"><label>
											<input name="gender" type="radio" value="M" CHECKED/>
											Male </label>
										<label>
											<input name="gender" type="radio" value="F" />
											Female </label></td>
									<!--td bgcolor="F2F2F2">

										<select name='hypercity' id='hypercity'>
											<option class="prompt">Choose your default hypercity </option>	
<?php 
/*$sql_query = "SELECT name,id FROM cities;";
$result = mysql_query($sql_query) or die(mysql_error());;
while($row = mysql_fetch_assoc($result)) {
	if ($_POST['hypercity'] == $row['id']) {
		echo "<option value='".$row['id']."' selected>".$row['name']."</option>";
	}
	else
		echo "<option value='".$row['id']."'>".$row['name']."</option>";
}*/
?>
										</select>
										</td-->
									</tr>
								</table>

								<table width="100%" cellpadding="3" style="padding-top:20px;"> 
									<tr>
<?php
//hide password if it is an OpenId registration
if (!$isOpenId) {
?>
										<td bgcolor="FAFAFA" style="width:340px"><strong><span class="denotes">*</span> password:</strong> </td>
<?php
}
?>
										<td bgcolor="FAFAFA" ><span class="denotes">*</span><strong>privacy:</strong> (Make your profile)</td>
									</tr>
									<tr style="vertical-align:top">
<?php
//hide password if it is an OpenId registration
if (!$isOpenId) {
?>
										<td bgcolor="F2F2F2"><input id="password" name="password" type="password" size="23" /></td>
<?php
}
?>
										<td bgcolor="F2F2F2" rowspan="3">
											<label>
												<input name="privacy" type="radio" value="1" style="vertical-align:middle"/>
												Invisible to everyone
											</label>
											<br/>
											<label>
												<input name="privacy" type="radio" value="3" checked="checked" style="vertical-align:middle"/>
												Visible only to people in my groups
											</label>
											<br/>
											<label>
												<input name="privacy" type="radio" value="2" style="vertical-align:middle"/>
												Visible to everyone
											</label>
										</td>
									</tr>

<?php
//hide password if it is an OpenId registration
if (!$isOpenId) {
?>
									<tr>
										<td bgcolor="FAFAFA"><strong><span class="denotes">*</span> confirm password:</strong> </td>
									</tr>
									<tr>
										<td bgcolor="F2F2F2"><input id="passwordConfirm" name="passwordConfirm" type="password" size="23" /></td>
									</tr>
<?php
}
?>
								</table>
								<table width="100%" cellpadding="3" style="padding-top:20px;">
									<tr>
										<td bgcolor="FAFAFA"><strong><span>admin code:</span></strong> (Leave blank if you don't know what it is.)</td>
										</tr>
										<tr>
											<td bgcolor="F2F2F2"><input id="code" name="code" type="text" size="10" /></td>
										</tr>
								</table></td>
							</tr>
						</table>
					</div>
					<br />
					<div class="container"><table width="100%" border="0" cellpadding="2" cellspacing="0">
							<tr>
								<td>
									<table width="100%" cellpadding="3">
										<tr>
											<td bgcolor="#FFFFFF">
												<b>About Me</b><br />
												Please tell us about yourself. you are limited to 255 characters.</td>
										</tr>
									</table>
									<table width="100%" cellpadding="3">

										<tr>
											<td bgcolor="F2F2F2"><textarea style="width:590px" name="description" cols="50" rows="5"><?php echo stripslashes(urldecode($_POST['description']))?></textarea>
											</td>

										</tr>
								</table></td>
							</tr>
						</table>
					</div>
					<br />
					<div class="container">
						<table width="100%" border="0" cellpadding="2" cellspacing="0">
							<tr>
								<td>
									<table width="100%" cellpadding="3">
										<tr> <td bgcolor="#FFFFFF"> <b>Terms of Service</b></td> </tr>
									</table>
									<table width="100%" cellpadding="3">
										<tr>
											<td bgcolor="F2F2F2" colspan="2">
												<?php include("./includes/termsOfService.inc");?>
											</td>
										</tr>

										<tr><td style="width:20px">
												<input type="checkbox" name="certify" value="certify"/></td>
											<td><strong> I certify that I have read all sections of the Terms of Service contained in this box and I agree with all of these terms.</strong><br/>
										</td></tr>
									</table>
								</td>
							</tr>
						</table>
					</div>
					<br />

					<table width="100%" border="0" cellpadding="2" cellspacing="0">
						<tr>
							<td><input type="submit" name="submit" class="btn" value="submit" />
								<input type="reset" class="btn" value="reset" /></td>
							<td align="right"><input type="button" class="btn" onclick="window.close()" value="Cancel" /></td>
						</tr>
					</table>
					<br /><br />
				</div>
			</div>

			<input type="hidden" name="isOpenId" value="<?php echo $isOpenId?>" />
		</td>
	</tr>
</table>
</form>
</body>
</html>

<?php
}
?>