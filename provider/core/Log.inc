<?php

namespace HyperCities\Provider;

/**
 * Webservice logging class. One public method, write, is used to send a message
 * to the log.
 *
 * Webservice files are stored like this:
 * logs
 *	2010
 *		/01 -- and inside, 2010-01-01.log, 2010-01-02.log, etc. ...
 *		/02
 *
 * @author David Shepard
 */
class Log {
	const log_location = 'provider/logs/';
	private static  $logFile,
                        $requestFile,
                        $requestFileName;
	private static $directoryConfirmed = FALSE;


	private static $instance;

        public static function initRequestFile () {
            if (!self::$requestFileName) {
			$year = date('Y');
			$month = date('m');
			$day = date('d');
			if (!self::$directoryConfirmed) {

				if (!@opendir(self::log_location.$year.'/'.$month)) {
					if (!@opendir(self::log_location.$year)) {
						mkdir(self::log_location.$year);
					}
					if (!@opendir(self::log_location.$year.'/'.$month)) {
						mkdir(self::log_location.$year.'/'.$month);
					}
					self::$directoryConfirmed = TRUE;
				}
			}
                        $hash = md5(microtime()."UIO023jf92m3ui9023");
			self::$requestFileName = self::log_location.$year.'/'.$month.'/'.date('Y-m-d').'-'.$hash.'.rlog';
                        self::write("Creating log file ".self::$requestFileName);
		}
        }

        private static function getRequestFile () {
            if (!self::$requestFile) {
			$year = date('Y');
			$month = date('m');
			$day = date('d');
			if (!self::$directoryConfirmed) {

				if (!@opendir(self::log_location.$year.'/'.$month)) {
					if (!@opendir(self::log_location.$year)) {
						mkdir(self::log_location.$year);
					}
					if (!@opendir(self::log_location.$year.'/'.$month)) {
						mkdir(self::log_location.$year.'/'.$month);
					}
					self::$directoryConfirmed = TRUE;
				}
			}
			self::$requestFile = fopen(self::$requestFileName, 'a');
		}
		return self::$requestFile;
        }

        private static function getFileHandle () {
		// if so, just fopen the file
		if (!self::$logFile) {
			$year = date('Y');
			$month = date('m');
			$day = date('d');
			if (!self::$directoryConfirmed) {
				
				if (!@opendir(self::log_location.$year.'/'.$month)) {
					if (!@opendir(self::log_location.$year)) {
						mkdir(self::log_location.$year);
					}
					if (!@opendir(self::log_location.$year.'/'.$month)) {
						mkdir(self::log_location.$year.'/'.$month);
					}
					self::$directoryConfirmed = TRUE;
				}
			}
			self::$logFile = fopen(self::log_location.$year.'/'.$month.'/'
									.date('Y-m-d').'.log', 'a');
		}
		return self::$logFile;
	}

	/**
	 * Write note to log file. Timestamp, namespace, class, and method will
	 * automatically be appended to beginning of each message.
	 *
	 * @param {string} $message Message to be written.
	 */
	public static function write ($message) {
		$date = date('M-Y-d H:i:s');
		$ip = $_SERVER['REMOTE_ADDR'];
		$bt = debug_backtrace();
		$namespace = @$bt[1]['namespace'];
		$class = @$bt[1]['class'];
		$method = @$bt[1]['function'];
		$type = @$bt[1]['type'];
		$object = @$bt[1]['object'];
		$handle = self::getFileHandle();
		//$handle = fopen('provider/logs/ws_log.log', 'a');
		fwrite($handle, "[$date]/($ip) {".$namespace.'\\'.$class.$type.$method.'} '
						.$message."\n");
		fclose(self::$logFile);
                $handle = self::getRequestFile();
                fwrite($handle, "[$date]/($ip) {".$namespace.'\\'.$class.$type.$method.'} '
						.$message."\n");
                fclose(self::$requestFile);
		self::$logFile = null;
                self::$requestFile = null;
	}

	public static function writeUser ($user, $message) {
		self::write('User '.$user->id.': '.$message);
	}

	/**
	 * Called at end of script, in ProviderInterface.
	 */
	public static function closeFile() {
		if (self::$logFile) fclose(self::$logFile);
	}
}
?>