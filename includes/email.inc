<?php
require_once("Mail.php");

/**
 * The email class
 */
class cEmail {

	private $host, 
		$username, 
		$password,
		$errorMessage;

	/**
	 * Constructor
	 * @param String $host: the SMTP server
	 * @param String $username: the user name
	 * @param String $password: the password
	 * @return void
	 */
	public function __construct($host, $username, $password) {
		$this->host = $host;
		$this->username = $username;
		$this->password = $password;
	}

	/**
	 * Return the error message if an error occurs, 
	 * otherwise return NULL.
	 * @return String: the error message
	 */
	public function getErrorMessage() {
		return $this->errorMessage;
	}

	/**
	 * Send an email
	 * @param String $to: the reciever's email address
	 * @param String $subject: the subject of email
	 * @param String $message: the message body
	 * @return Boolean: true on success, false on error.
	 *				Call $this->getErrorMessage() to get the error message.
	 */
	public function email($to, $subject, $message) {
		$headers = array ('From' => "Hypercities", 
						'To' => $to, 
						'Content-type' => 'text/html', 
						'Subject' => $subject);
		
		$smtp = Mail::factory('smtp', array ('host' => $this->host, 
											'auth' => true, 
											'username' => $this->username, 
											'password' => $this->password));

		$mail = $smtp->send($to, $headers, $message);
		
		if (PEAR::isError($mail)) {
			$this->errorMessage = $mail->getMessage();
			return false;
		}
		
		return true;
	}
	
	/**
	 * Send activation email to user
	 * @param Object $user: the user object
	 * @return Boolean: true on success, false on error
	 */
	public function emailActivation($user) {		
		$passwd = $user->getPassword();
		$timestamp = $user->getRegistrationTimeStamp();
		$emailAddress = $user->getEmail();
		
		$host  = $_SERVER['HTTP_HOST'];
		$uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
		$extra = "activate.php?hash=".md5($passwd)
				."&stamp=".base64_encode($timestamp);
		
		$url = "http://$host$uri/$extra";
		
		//send out email with link to activate.php?hash=[password]&stamp=[timestamp]
		$subject = "Complete your registration with Hypercities";
		$message = "<html>"
				. "To complete your registration with Hypercities,"
				. "click on the following link.<br><br>"
				. "<a href=\"$url\">Activate my account</a><br><br>"
				. "or copy and paste the following URL in to your browser.<br><br>"
				. $url. "<br><br>Thanks!<br>The Hypercities Team<br>"
				. "</html>";
		
		return $this->email($emailAddress, $subject, $message);
	}
}

?>
