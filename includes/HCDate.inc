<?php
// vim: ts=4:sw=4:fdc=2:nu:nospell

/**
* @file
* HyperCities Generic date handling class
*
* Generic date handling class. Have ability of processing BC date
*
* @author    HyperCities Tech Team
* @copyright Copyright 2008-2009, The Regents of the University of California
* @date      2009-07-03
* @version   $Id$
*
* Feel free to modify this class to make it better
*/

//test case
/*
$date = "0000-01-01";
echo HCDate::validateDate($date);
*/

class HCDate
{
	/**
	* the year
	* @var int
	*/
	var $year = NULL;

	/**
	* the month
	* @var int
	*/
	var $month = NULL;

	/**
	* the day
	* @var int
	*/
	var $day = NULL;

	/**
	* the hour
	* @var int
	*/
	var $hour = NULL;

	/**
	* the minute
	* @var int
	*/
	var $minute = NULL;

	/**
	* the second
	* @var int
	*/
	var $second = NULL;
	
	private function __callConstruct($name, $arg){
		return call_user_func_array(array($this, $name), $arg);
	}

	/**
	* Constructor
	*
	* Creates a new HCDate Object initialized to the current date/time.
	* If no date is passed, the current date/time is used.
	*
	* @param HCDate $date optional:  date/time to initialize
	* @return object HCDate: the new HCDate object
	*/
	//constructor overload
	public function __construct()
	{
		$num = func_num_args();
		$args = func_get_args();
		switch($num)
		{
			case 0:
			$this->__callConstruct('__construct0', NULL);
			break;
			case 1:
			$this->__callConstruct('__construct1', $args);
			break;
			case 6:
			$this->__callConstruct('__construct6', $args);
			break;
			default:
			throw new Exception();
		}
	}

	//initilize new HCDate object to current time
	public function __construct0()
	{
		$this->setDate(date("Y-m-d H:i:s"));
	}

	//initilize new HCDate object to the same date as $date
	public function __construct1($date)
	{
		$this->setDate($date);
	}

	//initilize new HCDate object according to given parameters
	//parameters can be null
	public function __construct6($year, $month, $day, $hour, $minute, $second)
	{
		$this->year = $year;
		$this->month = $month;
		$this->day = $day;
		$this->hour = $hour;
		$this->minute = $minute;
		$this->second = $second;
	}

	/**
	* Set the fields of a Date object based on the input date and format
	*
	* @access public
	* @param string $date input date
	* @param int $format Optional format constant (DATE_FORMAT_*) of the input date.
	*                    This parameter isn't really needed anymore, but you could
	*                    use it to force DATE_FORMAT_UNIXTIME.
	*/
	public function setDate($date)
	{
		if (is_a($date, 'HCDate'))
			$this->copy($date);
		else if (preg_match('/^(\d{4})-?(\d{2})-?(\d{2})([T\s]?(\d{2}):?(\d{2}):?(\d{2})(\.\d+)?(Z|[\+\-]\d{2}:?\d{2})?)?$/i', $date, $regs))
		{
			// DATE_FORMAT_ISO, ISO_BASIC, ISO_EXTENDED, and TIMESTAMP
			// These formats are extremely close to each other.  This regex
			// is very loose and accepts almost any butchered format you could
			// throw at it.  e.g. 2003-10-07 19:45:15 and 2003-10071945:15
			// are the same thing in the eyes of this regex, even though the
			// latter is not a valid ISO 8601 date.
			$this->year       = $regs[1];
			$this->month      = $regs[2];
			$this->day        = $regs[3];
			$this->hour       = isset($regs[5])?$regs[5]:0;
			$this->minute     = isset($regs[6])?$regs[6]:0;
			$this->second     = isset($regs[7])?$regs[7]:0;

		} else {
			// unknown format
			$this->year       = 0;
			$this->month      = 1;
			$this->day        = 1;
			$this->hour       = 0;
			$this->minute     = 0;
			$this->second     = 0;
		}
	}

	/**
	* Copy values from another HCDate object
	*
	* Makes this HCDate a copy of another HCDate object.
	*
	* @access public
	* @param object Date $date Date to copy from
	*/
	public function copy($date)
	{
		$this->year = $date->year;
		$this->month = $date->month;
		$this->day = $date->day;
		$this->hour = $date->hour;
		$this->minute = $date->minute;
		$this->second = $date->second;
	}
	
	/**
	 * compare AD dates
	 * @param $date1
	 * @param $date2
	 * @return true if $date1 is larger, false if $date2 is larger or equal
	 */
	public static function dateLarger($date1, $date2)
	{
		//NULL will be always smaller
		if (is_null($date1))
			return false;
		if (is_null($date2))
			return true;

		//$dateArray1 = $date1.explode();
		//if ($date1)
		if (HCDate::isBCDate($date1) && HCDate::isADDate($date2))
		{
			//HC_debugLog("$date1 is BC date, $date2 is AD date");
			return false;
		}
		else if (HCDate::isADDate($date1) && HCDate::isBCDate($date2))
		{
			//HC_debugLog("$date1 is AD date, $date2 is BC date");
			return true;
		}
		else if (HCDate::isBCDate($date1) && HCDate::isBCDate($date2))
		{
			//HC_debugLog("$date1, $date2 are BC dates");
			$tok1= strtok($date1, ":- ");
			$date1Array = array();
			while ($tok1 !== false)
			{
				//trim leading 0s
				$tok1 = ltrim($tok1, "0");
				array_push($date1Array, $tok1);
				$tok1 = strtok(":- ");
			}
			$tok2 = strtok($date2, ":- ");
			$date2Array = array();
			while ($tok2 !== false)
			{
				//trim leading 0s
				$tok2 = ltrim($tok2, "0");
				array_push($date2Array, $tok2);
				$tok2 = strtok(":- ");
			}

			$size = count($date1Array);
			for ($i=0; $i < $size; $i++)
			{
				if ($i==0)
				{
					//compare bc year( which has been changed to ad year)
					if (intval($date1Array[$i]) < intval($date2Array[$i]))
						return true;
					if (intval($date1Array[$i]) > intval($date2Array[$i]))
						return false;

					//if equal, then compare next element
				}
				else
				{
					//compare month, day, minutes, etc.
					if (intval($date1Array[$i]) > intval($date2Array[$i]))
						return true;
					if (intval($date1Array[$i]) < intval($date2Array[$i]))
						return false;
	
					//if all equal, then return false;
				}
			}
		}
		else if (HCDate::isADDate($date1) && HCDate::isADDate($date2))
		{
			//HC_debugLog("$date1, $date2 are AD dates");
			$tok1= strtok($date1, ":- ");
			$date1Array = array();
			while ($tok1 !== false)
			{
				array_push($date1Array, $tok1);
				$tok1 = strtok(":- ");
			}
			$tok2 = strtok($date2, ":- ");
			$date2Array = array();
			while ($tok2 !== false)
			{
				array_push($date2Array, $tok2);
				$tok2 = strtok(":- ");
			}

			$size = min(count($date1Array), count($date2Array));
			for ($i=0; $i < $size; $i++)
			{
				if (intval($date1Array[$i]) > intval($date2Array[$i]))
					return true;
				if (intval($date1Array[$i]) < intval($date2Array[$i]))
					return false;

				//if equal, then compare next element
				//if all equal, then return false;
			}
		}
	}


	/* parse positive year to yyyy format to make sure DB insert correctly
	*	@param $date: the postive date to be parsed.
	*	@return $date: a positive year in "yyyy" format.
	*/
	public static function parseYear($date)
	{
		//HC_debugLog('$date.strpos(\'-\')='.strpos($date, '-'));
		//padding leading 0s if $date has less than 4 digits
		if (strpos($date, '-') <= 3)
		{
			$headZero = "";
			//'-' is the delimiter of date
			$headZeroLength = 4-strpos($date, '-');
			for ($i=0; $i < $headZeroLength; $i++)
				$headZero = $headZero.'0';

			//HC_debugLog('$headZero='.$headZero);
			$date = $headZero.$date;
		}

		return $date;
	}
	
	public static function isADDate($date) {
		return !HCDate::isBCDate($date);
	}
	
	public static function isBCDate($date) {
		if (is_null($date))
			return;

		if (strcmp(substr($date, 0, 1), "-") == 0) {
			//HC_debugLog("$date is BC date");
			return true;
		} else {
			//HC_debugLog("$date is AD date");
			return false;
		}
	}
	
	/* change a positive year to negative year by plus negative sign ahead.
		@param $adDate: the positive date to be changed.
		@return $bcDate: a negative year.
	*/
	public static function toBCDate($adDate)
	{
		if (HCDate::isBCDate($adDate))	//already a bc date
			return;

		$bcDate = "-".$adDate;
		//$year = date('Y', strtotime($adDate));
		//$bcYear = "-".$year;
		//$bcDate = date("Y-m-d", mktime(0, 0, 0, date("m", $adDate), date("d", $adDate), $bcYear));
		return $bcDate;
	}
	
	/* change a negative year to positive year by delete negative sign ahead.
		@param string $bcDate: the negative date to be changed.
		@return string $adDate: a positive year.
	*/
	public static function toADDate($bcDate)
	{
		if (!HCDate::isBCDate($bcDate))	//already a ad date
			return $bcDate;

		$adDate = substr($bcDate, 1);
		//trim leading '-' and 0
		//$adDate = ltrim($bcDate, "-0");
		return $adDate;
	}

	/** check if the argument is a valid date
	 *  @param string $date: the date string
	 *  @return boolean: true on valid, false on invalid
	 */
	public static function validateDate($date)
	{
		$date = trim($date);

		// gYear (YYYY)
		if (preg_match("/^-?(0?|[1-9]){4}$/", $date, $parts))
		{
			return true;
		}
		// gYearMonth (YYYY-MM)
		else if (preg_match("/^-?(0?|[1-9]){4}-(0?[1-9]|1[012])$/", $date, $parts))
		{
			return true;
		}
		// date (YYYY-MM-DD)
		else if (preg_match ("/^-?((0?|[1-9]){4})-(0?[1-9]|1[012])-(0?[1-9]|[123][0-9])$/", $date, $parts))
		{
			return true;
			//return checkdate($parts[3],$parts[4],$parts[1]);
		}
		// YYYY-MM-DD hh:mm:ss
		else if (preg_match ("/^-?((0?|[1-9]){4})-(0?[1-9]|1[012])-(0?[1-9]|[123][0-9])[ ]+(0?[0-9]|[1][0-9]|[2][0-3]):([0-5]?[0-9]):([0-5]?[0-9])$/", $date, $parts))
		{
			return true;
			//return checkdate($parts[3],$parts[4],$parts[1]);
		}
		// dateTime (YYYY-MM-DDThh:mm:ssZ)
		else if (preg_match ("/^-?((0?|[1-9]){4})-(0?[1-9]|1[012])-(0?[1-9]|[123][0-9])T(0?[0-9]|[1][0-9]|[2][0-3]):([0-5]?[0-9]):([0-5]?[0-9])[Z]$/", $date, $parts))
		{
			return true;
			//return checkdate($parts[3],$parts[4],$parts[1]);
		}
		// dateTime (YYYY-MM-DDThh:mm:sszzzzzz)
		else if (preg_match ("/^-?((0?|[1-9]){4})-(0?[1-9]|1[012])-(0?[1-9]|[123][0-9])T(0?[0-9]|[1][0-9]|[2][0-3]):([0-5]?[0-9]):([0-5]?[0-9])[+-]([0-9]{2}|[1][0-9]|[2][0-3]):([0-5][0-9])$/", $date, $parts))
		{
			return true;
			//return checkdate($parts[3],$parts[4],$parts[1]);
		}
		else
			return false;

		return false;
	}
}
?>
