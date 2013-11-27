<?php
include_once("includes/util.inc");
include_once('includes/serverSession.inc');

//session_start();
cServerSession::start();


if(isset($_SESSION['nickname']) && !empty($_SESSION['nickname'])) {
?>

  <div id="loginForm">
    <div class="formItem">
    	<div>
        	<img class="userPhoto" src="<?= $_SESSION['photoUrl']; ?>" />
    	</div>
        <div id='nickname' class="subItem">
	    	<?= $_SESSION['nickname']; ?>
	    </div>
	    <div class="subItem">
	    	[ <a href='javascript:void(0)' 
				 onClick="window.open('./editProfile.php','Edit Profile',
									'width=1024,height=768,scrollbars=1')">
				edit profile</a>
			]
	    	<input id="logoutBtn" type="submit" value="Logout" name="submit">
	    </div>
<!--
		<div id='groups'>
		[ <a href=# onclick="HyperCities.group.init();">Groups</a> ]
		</div>
-->
	</div>
<!--
	<div id="defaultCollectionDiv" class="formItem">
		<a id="defaultCollection" href="javascript:void(0);">Default Collection: </a>
		<span id="defaultCollectionTitle">No default collection</span>
	</div>

      <div class="formItem">
          <a id="mySnapshots" href="javascript:void(0);">Manage My Snapshots</a>
      </div>
      <div class="formItem"-->
		<!--a id="myCollection" href="javascript:void(0);">Manage My Collections</a-->
		<!--a id="tokenGen" href="javascript:void(0);">Generate Webservice Token</a>
                <a id="tokenHelp" href="javascript:void(0);">?</a>
                <span id="serviceToken"></span>
	</div -->
  </div>

<?
  } else {
?>

  <form id="login" name="login">
  <div id="loginForm">Log in, or
	<a href='javascript:void(0)' onClick="window.open('./registration.php','Registration','width=1024,height=768,scrollbars=1,toolbar=1,menubar=1')">register</a>
	, to use HyperCities<br/>
		<div class="formItem">
			<label> Email: </label>
			<input id="username" type="text" name="username" class="textbox">
		</div>

		<div class="formItem">
			<label> Password: </label>
			<input id="password" type="password" name="password" class="textbox">
		</div>

	<div class="formItem">
		<input id="remember" type="checkbox" name="remember">
		<span>Remember me on this computer<br/>
			<b>(Don't check if on a shared computer)</b>
		</span>
	</div>

	<input id="loginBtn" type="submit" value="Login" name="submit">
	<a id="openIdLogin" href="javascript:void(0);" onclick="window.open('./loginOpenId.php','Login using OpenId','width=640,height=480,scrollbars=1,toolbar=1,menubar=1')">Login using <img src="images/openId/openidW.png" alt="OpenID"/></a>
<!--
	<a id="forgotBtn" href="javascript:void(0);" onclick="loadForgotPassword()">Forgot Password?</a>
-->
  </div>
  </form>

 <? } ?>
