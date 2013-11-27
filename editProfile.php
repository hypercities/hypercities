<?php

/**
 * HyperCities Profile Editing Page
 *
 * @author    James Lee, Jay Tung, David Shepard
 * @copyright Copyright 2009, The Regents of the University of California
 * @date      2009-07-02
 * @version   0.1
 * @description  Allows a user to update their informations
 *
 */

include_once("includes/connect_db.inc");
include_once('includes/user.inc');
include_once('includes/countryOccupationList.inc');
include_once('includes/serverSession.inc');

cServerSession::start();
$target_path ="../uploads/";  
$error_flag = false;  // flag is true if form information is not complete
$error_array = array();
$password = 0; // store encrypted password in this variable
$passwordChanged = false;
$isOpenId = cServerSession::isOpenId();
$providerName = cServerSession::getVar("providerName");
$externalName = cServerSession::getVar('externalName');

if (strcasecmp($providerName, "shibboleth") == 0) {
	if (isset($_POST['submit'])) {
		$user_profile = $_POST;
		
		// check if all required fields are filled
		if ((//!isset($_POST['firstName']) || empty($_POST['firstName'])) ||
			//	(!isset($_POST['lastName'])  || empty($_POST['lastName'])) ||
				(!isset($_POST['birthyear']) || empty($_POST['birthyear'])) ||
				(!isset($_POST['city']) || empty($_POST['city'])) ||
				//(!isset($_POST['nickname']) || empty($_POST['nickname'])) ||
				(!isset($_POST['privacy']) || empty($_POST['privacy'])) 
				//( !$isOpenId && (!isset($_POST['oldPassword']) || empty($_POST['oldPassword'])) ))
				))
				{
			
			$error_flag = true;
			$error_message = "Please fill out all required fields.";
			array_push($error_array, $error_message);
		} else {	
			// all required fields are filled
			//check for more erroneous form input
			
			//only consider 1000~2999
			$pattern = "/^[12][\d]{3}$/";
			if (!is_numeric($_POST['birthyear'])|| !preg_match($pattern, $_POST['birthyear'])) {
				$error_flag = true;
				array_push($error_array, "birthyear is not numeric or 4 digits");
			}
		}
		
		//save photo file
		$target_path = $target_path . date( 'Y-m-d.H:i:s.') .basename( $_FILES['uploadedfile']['name']);
		if( $_FILES['uploadedfile']['error'] == UPLOAD_ERR_OK) {
			$ext = strtolower(pathinfo($_FILES['uploadedfile']['name'],PATHINFO_EXTENSION));
			
			switch ($ext) {
				case 'jpg': case 'jpeg': case 'gif':
				case 'png': case 'bmp':
					if(move_uploaded_file($_FILES['uploadedfile']['tmp_name'], $target_path)) {
						$_SESSION['photoUrl']=$target_path;
					} else {
						$error_flag = true;
						array_push($error_array, "There was an error uploading the file, please try again!");
					}
					break;   // file type is okay!
				default:
				//file format is wrong!;
					$error_flag=true;
					array_push($error_array, $_FILES['uploadedfile']['name']."file format is wrong!");
			}
		} else if( $_FILES['uploadedfile']['error'] == UPLOAD_ERR_NO_FILE) {
			$target_path=$_SESSION['photoUrl'];
		} else {
			$error_flag = true;
			array_push($error_array, "There was an error uploading the file, please try again!");
		}
		
		
		if (!$error_flag) {
			
			
			//update user
			$timestamp = date( 'Y-m-d H:i:s');
			
			// TODO : get the following from session
			$object['first_name'] = $externalName['first'];
			$object['last_name'] = $externalName['last'];
			$object['nickname'] = $externalName['first'];
			
			// Get the rest from form
			$object['privacy_level_id'] = $_POST['privacy'];
			$object['city_id'] = $_POST['hypercity'];
			$object['description'] = $_POST['description'];
			$object['gender'] = $_POST['gender'];
			$object['birth_year'] = $_POST['birthyear'];
			$object['occupation'] = $_POST['occupation'];
			$object['locality'] = $_POST['city'];
			$object['zipcode'] = $_POST['zipcode'];
			$object['country'] = $_POST['country'];
			$object['updated_at'] = $timestamp;
			$object['photo_url'] = $target_path;
			if (!$isOpenId)
				$object['password'] = $password;
			
			$user = new cUser();
			$userId = cServerSession::getUserId(); 
			$result = $user->updateUser($userId, $object);
			
			//reset user in session
			$sessionObj['nickname'] = $object['nickname'];
			$sessionObj['photo_url'] = $object['photo_url'];
			cServerSession::setSession($sessionObj);
			
			if ($result)
				$msg = "Your profile has been updated.";
			else $msg = "Updating your profile failed.";
			?>
<script>
	alert("<? echo $msg?>");
			
	self.close();
	window.opener.HyperCities.user.sync();
	window.opener.HyperCities.user.reload();
</script>
			<?
			
			exit;
		} else {
			// there is an error of the form, reset form to original value
			$user = new cUser();
			$user_profile = $user->getProfileInfo($_SESSION['userId']);
		}
	} else {
		// form has not submitted, query the user's profile
		$user = new cUser();
		$user_profile = $user->getProfileInfo($_SESSION['userId']);
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
		<h1>Edit Profile</h1>
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
	
		<div class="container"><table width="100%" border="0" cellpadding="2" cellspacing="0">
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
					<td colspan="3">These fields have been taken from your UCLA Logon.</td>
				</tr>
				<tr>
				<td bgcolor="FAFAFA" style="width:180px">
				<strong><span class="denotes"></span> First name:</strong></td>
				<td bgcolor="FAFAFA" style="width:150px">
				<strong><span class="denotes"></span> Last name:</strong></td>
				<td bgcolor="FAFAFA">
				<strong><span class="denotes"></span> E-Mail:</strong></td>
				<td bgcolor="FAFAFA">
				<strong><span class="denotes">*</span> Birth Year:</strong></td>
				</tr>
				<tr>
				<td bgcolor="F2F2F2">
				<p><?php echo $user_profile['first_name'] ?></p>
				</td>
				<td bgcolor="F2F2F2">
				<p><?php echo $user_profile['last_name']?></p>
				</td>
				<td bgcolor="F2F2F2">
				<p><?php echo $_SESSION['email']; ?></p>
				</td>
				<td bgcolor="F2F2F2">
				<input id="birthyear" name="birthyear" type="text" size="3" value="<?php echo $user_profile['birth_year']?>"/>
				</td>
				</tr>
				</table>
                <table>
                   <tr>
                    <td bgcolor="FAFAFA" style="width:180px">
                    <strong>Nickname:</strong> </td>
                    <td bgcolor="FAFAFA" style="width:180px">
                    <strong><span class="denotes"></span> Upload Your Photo:</strong>(file size must be smaller than 50KB)</td>
                    <td style="padding-left:20px"><?php echo "<img src='".$_SESSION['photoUrl']."' width=50 height=50>"; ?></td>
                  </tr>
                  <tr>
                     <td bgcolor="F2F2F2"><p><?php echo $user_profile['nickname']?></p>
                     </td>
                     <td bgcolor="F2F2F2">
                      <input name="uploadedfile" type="file" maxlength="50000"/>
                     </td>
                  </tr>
	
                </table>
	
				<table width="100%" cellpadding="3">
				<tr>
				<td bgcolor="FAFAFA" style="width:180px"><strong><span class="denotes">*</span> city:</strong> </td>
				<td bgcolor="FAFAFA" style="width:150px"><strong>zip code:</strong> </td>
				<td bgcolor="FAFAFA"><strong><span class="denotes">*</span> country:</strong> </td>
				</tr>
				<tr>
				<td bgcolor="F2F2F2"><input id="city" name="city" type="text" size="23" value="<?php echo $user_profile['locality']?>"/>
				</td>
				<td bgcolor="F2F2F2"><input id="zipcode" name="zipcode" type="text" size="6" value="<?php echo $user_profile['zipcode']?>"/>
				</td>
				<td bgcolor="F2F2F2">
                                  <select name="country">
                                    <option>select a country</option>
	<?php
	for($i=0; $i < count($country_list); $i++) {
		echo "<option value='".$country_list[$i]."'";
		if (strcmp($user_profile['country'], $country_list[$i]) == 0) {
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
				  <td bgcolor="FAFAFA"><strong>default hypercity:</strong></td>
				  </tr>
				  <tr>
				  <td bgcolor="F2F2F2">
                                  <select name="occupation">
				  <option class="prompt">Select your profession </option>
	<?php
	for($i=0; $i < count($occupation_list); $i++) {
		echo "<option value='".$occupation_list[$i]."'";
		if (strcmp($user_profile['occupation'], $occupation_list[$i]) == 0) {
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
				  <input name="gender" type="radio" value="M" 
	<?php if($user_profile['gender']=="M") echo "CHECKED"?>/>
				  Male </label>
				  <label>
				  <input name="gender" type="radio" value="F" <?php if($user_profile['gender']=="F") echo "CHECKED"?>/>
				  Female </label></td>
				  <td bgcolor="F2F2F2"> 
				  <select name='hypercity' id='hypercity'>
				  <option class="prompt">Choose your default hypercity </option>	
	<?php
	$sql_query = "SELECT name,id FROM cities;";
	$result = mysql_query($sql_query) or die(mysql_error());
	;
	while($row = mysql_fetch_assoc($result)) {
		echo "<option value='".$row['id']."'";
		if ($user_profile['city_id']==$row['id']) {
			echo "selected>".$row['name']."</option>";
		}
		else {
			echo ">".$row['name']."</option>";
		}
	}
	?></select>
				  </td>
				  </tr>
				  </table>
	
				  <table width="100%" cellpadding="3" style="padding-top:20px;">
				  <tr>
				  <td bgcolor="FAFAFA" ><span class="denotes">*</span><strong>privacy:</strong> (Make your profile)</td>
				  </tr>
				  <tr style="vertical-align:top">
				  <td bgcolor="F2F2F2" rowspan="3">
				  <label>
				  <input name="privacy" type="radio" value="1" style="vertical-align:middle"
	<?php if($user_profile['privacy_level_id']==1) echo "CHECKED"?>
                  />
				  Invisible to everyone
				  </label>
				  <br/>
				  <label>
				  <input name="privacy" type="radio" value="3"  style="vertical-align:middle"
	<?php if($user_profile['privacy_level_id']==3) echo "CHECKED"?>
                  />
				  Visible only to people in my groups
				  </label>
				  <br/>
				  <label>
				  <input name="privacy" type="radio" value="2"  style="vertical-align:middle"
	<?php if($user_profile['privacy_level_id']==2) echo "CHECKED"?>
                  />
				  Visible to everyone
				  </label>
				  </td>
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
							Please tell us about yourself. you are limited to 100 characters.</td>
						</tr>
					</table>
                    <table width="100%" cellpadding="3">
	
                      <tr>
                        <td bgcolor="F2F2F2"><textarea style="width:590px" name="description" cols="50" rows="5"><?php echo $user_profile['description']?></textarea>
                        </td>
	
                      </tr>
                     </table></td>
			</tr>
	  </table>
	</div>
<br />
	
	<table width="100%" border="0" cellpadding="2" cellspacing="0">
	<tr>
	<td><input type="submit" name="submit" class="btn" value="update" />
	<input type="reset" class="btn" value="reset" /></td>
	<td align="right"><input type="button" class="btn" onclick="javascript:history.go(-1)" value="Cancel" /></td>
	</tr>
	</table>
	<br /><br />
	</div>
	</div>
</body>
	
</form>
</html>
<?php
} else {


// check that all fields were entered properly (validation)
if (isset($_POST['submit'])) {
	$user_profile = $_POST;

	// check if all required fields are filled
	if ((!isset($_POST['firstName']) || empty($_POST['firstName'])) ||
		(!isset($_POST['lastName'])  || empty($_POST['lastName'])) ||
		(!isset($_POST['birthyear']) || empty($_POST['birthyear'])) ||
		(!isset($_POST['city']) || empty($_POST['city'])) ||
		(!isset($_POST['nickname']) || empty($_POST['nickname'])) ||
		(!isset($_POST['privacy']) || empty($_POST['privacy'])) ||
		( !$isOpenId && (!isset($_POST['oldPassword']) || empty($_POST['oldPassword'])) )) {
		
		$error_flag = true;
		$error_message = "Please fill out all required fields.";
		array_push($error_array, $error_message);
	} else {	
		// all required fields are filled
		//check for more erroneous form input

		//only consider 1000~2999
        $pattern = "/^[12][\d]{3}$/";
        if (!is_numeric($_POST['birthyear'])|| !preg_match($pattern, $_POST['birthyear'])) {
            $error_flag = true;
            array_push($error_array, "birthyear is not numeric or 4 digits");
        }

		if (!$isOpenId)	{
			// check if the password and confirm password are matched
			if ($_POST['password'] != $_POST['passwordConfirm']) {
				$error_flag = true;
				array_push($error_array, "Passwords did not match.");
			}

			// check if the old password is correct
			$sql_query = "SELECT password FROM users WHERE email='".$_SESSION['email']."';";
			$result = mysql_query($sql_query) or die(mysql_error());;
			$row = mysql_fetch_assoc($result);
			if ($row['password'] != $_POST['oldPassword']) {
				$error_flag = true;
				array_push($error_array, "Password is incorrect");
			}
		}	
    }

	//save photo file
    $target_path = $target_path . date( 'Y-m-d.H:i:s.') .basename( $_FILES['uploadedfile']['name']);
    if( $_FILES['uploadedfile']['error'] == UPLOAD_ERR_OK) {
		$ext = strtolower(pathinfo($_FILES['uploadedfile']['name'],PATHINFO_EXTENSION));
		
		switch ($ext) {
			case 'jpg': case 'jpeg': case 'gif':
			case 'png': case 'bmp':
				if(move_uploaded_file($_FILES['uploadedfile']['tmp_name'], $target_path)) {
					$_SESSION['photoUrl']=$target_path;
				} else {
					$error_flag = true;
					array_push($error_array, "There was an error uploading the file, please try again!");
				}
				break;   // file type is okay!
			default:
				//file format is wrong!;
				$error_flag=true;
				array_push($error_array, $_FILES['uploadedfile']['name']."file format is wrong!");
		}
	} else if( $_FILES['uploadedfile']['error'] == UPLOAD_ERR_NO_FILE){
       $target_path=$_SESSION['photoUrl'];
    } else {
        $error_flag = true;
        array_push($error_array, "There was an error uploading the file, please try again!");
    }


	if (!$error_flag) {

		if (!$isOpenId) {
			if ($_POST['password'] && (!empty($_POST['password'])) 
				&& $_POST['passwordConfirm'] && (!empty($_POST['passwordConfirm']))) { 
				// user changed password
				$password = md5($_POST['password']);
			} else {
				//do not encrypt old password, because it is done
				$password = $_POST['oldPassword'];
			}
		}

		//update user
		$timestamp = date( 'Y-m-d H:i:s');

		$object['first_name'] = $_POST['firstName'];
		$object['last_name'] = $_POST['lastName'];
		$object['nickname'] = $_POST['nickname'];
		$object['privacy_level_id'] = $_POST['privacy'];
		$object['city_id'] = $_POST['hypercity'];
		$object['description'] = $_POST['description'];
		$object['gender'] = $_POST['gender'];
		$object['birth_year'] = $_POST['birthyear'];
		$object['occupation'] = $_POST['occupation'];
		$object['locality'] = $_POST['city'];
		$object['zipcode'] = $_POST['zipcode'];
		$object['country'] = $_POST['country'];
		$object['updated_at'] = $timestamp;
		$object['photo_url'] = $target_path;
		if (!$isOpenId)
			$object['password'] = $password;
		
		$user = new cUser();
		$userId = cServerSession::getUserId(); 
		$result = $user->updateUser($userId, $object);

		//reset user in session
		$sessionObj['nickname'] = $object['nickname'];
		$sessionObj['photo_url'] = $object['photo_url'];
		cServerSession::setSession($sessionObj);

		if ($result)
			$msg = "Your profile has been updated.";
		else $msg = "Updating your profile failed.";
?>
<script>
	alert("<? echo $msg?>");
	
	self.close();
	window.opener.HyperCities.user.sync();
	window.opener.HyperCities.user.reload();
</script>
<?

		exit;
	} else {
		// there is an error of the form, reset form to original value
		$user = new cUser();
		$user_profile = $user->getProfileInfo($_SESSION['userId']);
    }
} else {
	// form has not submitted, query the user's profile
	$user = new cUser();
	$user_profile = $user->getProfileInfo($_SESSION['userId']);
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
		<h1>Edit Profile</h1>
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
		
		<div class="container"><table width="100%" border="0" cellpadding="2" cellspacing="0">
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
				<strong><span class="denotes">*</span> first name:</strong></td>
				<td bgcolor="FAFAFA" style="width:150px">
				<strong><span class="denotes">*</span> last name:</strong></td>
				<td bgcolor="FAFAFA">
				<strong><span class="denotes">*</span> E-Mail:</strong></td>
				<td bgcolor="FAFAFA">
				<strong><span class="denotes">*</span> Birth Year:</strong></td>
				</tr>
				<tr>
				<td bgcolor="F2F2F2">
				<input id="firstName" name="firstName" type="text" size="23" value="<?php echo $user_profile['first_name'] ?>"/>
				</td>
				<td bgcolor="F2F2F2">
				<input id="lastName" name="lastName" type="text" size="15" value="<?php echo $user_profile['last_name']?>"/>
				</td>
				<td bgcolor="F2F2F2">
				<input id="email" name="email" type="text" size="25" disabled="true" value="<?php echo $_SESSION['email']; ?>"/>
				</td>
				<td bgcolor="F2F2F2">
				<input id="birthyear" name="birthyear" type="text" size="3" value="<?php echo $user_profile['birth_year']?>"/>
				</td>
				</tr>
				</table>
                <table>
                   <tr>
                    <td bgcolor="FAFAFA" style="width:180px">
                    <strong><span class="denotes">*</span> Nickname:</strong> </td>
					<td bgcolor="FAFAFA" style="width:180px">
					<?php if(!$isOpenId) { ?>
					<strong><span class="denotes"></span> Upload Your Photo:</strong>(file size must be smaller than 50KB)
					<?php } ?>
					</td>
                    <td style="padding-left:20px"><?php echo "<img src='".$_SESSION['photoUrl']."' width=50 height=50>"; ?></td>
                  </tr>
                  <tr>
                     <td bgcolor="F2F2F2">
                     <input id="nickname" name="nickname" type="text" size="15" value="<?php echo $user_profile['nickname']?>"/>
                     </td>
					 <td bgcolor="F2F2F2">
					<?php if(!$isOpenId) { ?>
					  <input name="uploadedfile" type="file" maxlength="50000"/>
					<?php } ?>
                     </td>
                  </tr>
                  
                </table>

				<table width="100%" cellpadding="3">
				<tr>
				<td bgcolor="FAFAFA" style="width:180px"><strong><span class="denotes">*</span> city:</strong> </td>
				<td bgcolor="FAFAFA" style="width:150px"><strong>zip code:</strong> </td>
				<td bgcolor="FAFAFA"><strong><span class="denotes">*</span> country:</strong> </td>
				</tr>
				<tr>
				<td bgcolor="F2F2F2"><input id="city" name="city" type="text" size="23" value="<?php echo $user_profile['locality']?>"/>
				</td>
				<td bgcolor="F2F2F2"><input id="zipcode" name="zipcode" type="text" size="6" value="<?php echo $user_profile['zipcode']?>"/>
				</td>
				<td bgcolor="F2F2F2">
                                  <select name="country">
                                    <option>select a country</option>
				    <?php
				    for($i=0; $i < count($country_list); $i++) {
					    echo "<option value='".$country_list[$i]."'";
					    if (strcmp($user_profile['country'], $country_list[$i]) == 0) {
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
				  <td bgcolor="FAFAFA"><strong>default hypercity:</strong></td>
				  </tr>
				  <tr>
				  <td bgcolor="F2F2F2">
                                  <select name="occupation">
				  <option class="prompt">Select your profession </option>
				  <?php
				  for($i=0; $i < count($occupation_list); $i++) {
					  echo "<option value='".$occupation_list[$i]."'";
					  if (strcmp($user_profile['occupation'], $occupation_list[$i]) == 0) {
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
				  <input name="gender" type="radio" value="M" 
                    <?php if($user_profile['gender']=="M") echo "CHECKED"?>/>
				  Male </label>
				  <label>
				  <input name="gender" type="radio" value="F" <?php if($user_profile['gender']=="F") echo "CHECKED"?>/>
				  Female </label></td>
				  <td bgcolor="F2F2F2"> 
				  <select name='hypercity' id='hypercity'>
				  <option class="prompt">Choose your default hypercity </option>	
				  <?php
				  $sql_query = "SELECT name,id FROM cities;";
				  $result = mysql_query($sql_query) or die(mysql_error());;
				  while($row = mysql_fetch_assoc($result)) {
					  echo "<option value='".$row['id']."'";
                      if ($user_profile['city_id']==$row['id']) {
                         echo "selected>".$row['name']."</option>";
                      }
                      else {
                         echo ">".$row['name']."</option>";
                      }
				  }
				  ?>
				  </td>
				  </tr>
				  </table>

				  <table width="100%" cellpadding="3" style="padding-top:20px;">
				  <tr>
				  <? if (!$isOpenId) {?><td bgcolor="FAFAFA" style="width:340px"><strong><span class="denotes">*</span> old password:</strong> </td> <?} ?>
				  <td bgcolor="FAFAFA" ><span class="denotes">*</span><strong>privacy:</strong> (Make your profile)</td>
				  </tr>
				  <tr style="vertical-align:top">
					  <? if (!$isOpenId) {?><td bgcolor="F2F2F2"><input id="oldPassword" name="oldPassword" type="password" size="23" value="<?php echo $user_profile['password']?>"/>  </td><?} ?>
				  <td bgcolor="F2F2F2" rowspan="3">
				  <label>
				  <input name="privacy" type="radio" value="1" style="vertical-align:middle"
                     <?php if($user_profile['privacy_level_id']==1) echo "CHECKED"?>
                  />
				  Invisible to everyone
				  </label>
				  <br/>
				  <label>
				  <input name="privacy" type="radio" value="3"  style="vertical-align:middle"
                    <?php if($user_profile['privacy_level_id']==3) echo "CHECKED"?>
                  />
				  Visible only to people in my groups
				  </label>
				  <br/>
				  <label>
				  <input name="privacy" type="radio" value="2"  style="vertical-align:middle"
                    <?php if($user_profile['privacy_level_id']==2) echo "CHECKED"?>
                  />
				  Visible to everyone
				  </label>
				  </td>
				  </tr>
					
				  <? if (!$isOpenId) {?>
				  <tr>
				  <td bgcolor="FAFAFA"><strong><span> new password:</span></strong> (optional)</td>
				  </tr>
				  <tr>
				  <td bgcolor="F2F2F2"><input id="password" name="password" type="password" size="23" />
				  </td>
				  </tr>
				  </table>
				  <table width="100%" cellpadding="3">
				  <tr>
				  <td bgcolor="FAFAFA"><strong><span> confirm new password:</span></strong> (optional)</td>
				  </tr>
				  <tr>
				  <td bgcolor="F2F2F2"><input id="passwordConfirm" name="passwordConfirm" type="password" size="23" />
				  </tr>
				  <?} ?>
		  
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
							Please tell us about yourself. you are limited to 100 characters.</td>
						</tr>
					</table>
                    <table width="100%" cellpadding="3">

                      <tr>
                        <td bgcolor="F2F2F2"><textarea style="width:590px" name="description" cols="50" rows="5"><?php echo $user_profile['description']?></textarea>
                        </td>

                      </tr>
                     </table></td>
			</tr>
	  </table>
	</div>
<br />

	<table width="100%" border="0" cellpadding="2" cellspacing="0">
	<tr>
	<td><input type="submit" name="submit" class="btn" value="update" />
	<input type="reset" class="btn" value="reset" /></td>
	<td align="right"><input type="button" class="btn" onclick="javascript:history.go(-1)" value="Cancel" /></td>
	</tr>
	</table>
	<br /><br />
	</div>
	</div>
</body>
		
</form>
</html>

<?php

}

?>