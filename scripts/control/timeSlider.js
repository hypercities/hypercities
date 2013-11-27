/**
 * HyperCities TimeSlider Control
 * @copyright (c) 2009, The Regents of the University of California
 */

HyperCities.control = HyperCities.control || {};
HyperCities.control.timeSlider = function() {

	var _id = "[HyperCities.control.timeSlider] ",

	// constants
			START_YEAR = 1700,                            // default start year
			END_YEAR = 2100,                              // default end year

	// private variables
	    _currentYear = new Date().getFullYear();      // current year
	    _startYear = START_YEAR,                      //
	    _endYear = END_YEAR,                          //
      _currentTime = new Date(),
      _startTime = new Date(),
      _endTime = new Date();


	return {

		init: function($config) {
      _startTime.setFullYear(START_YEAR);
      _endTime.setFullYear(END_YEAR);
			return true;
		},

		/**
		 * Get Time stamp from Google Earth.
		 * @return String yyyy-mm-ddThh:mm:sszzzzzz
		 */
		getTime: function() {
			//return HyperCities.earth.getTime();

      return _currentTime.toString("yyyy-mm-dd");
		},

		/**
		 *  Set Timespan
		 *  @params Number $current current year
		 *  @params Number $start start year
		 *  @params Number $end end year
		 *  @params Number $active actvie year
		 *  @params Boolean $updateMap deprecated for now
		 */
		setTime: function($current, $start, $end, $active, $updateMap) {
			
			var startTime = new Date();
			var endTime = new Date();
			startTime.setMonth(0);
			startTime.setDate(1);
			endTime.setMonth(11);
			endTime.setDate(31);

			// set start time and end time based on current time
      if ($current != undefined && $current != null && $current != "Invalid Date") {
        if ($current instanceof Date) {
          startTime = $current;
          endTime = $current;
        } else if (typeof($current) == "number") { 
          startTime.setFullYear($current);
          endTime.setFullYear($current);
        }

        _startTime = startTime;
        _endTIme = endTime;
			  HyperCities.earth.setTimespan( startTime.toString("yyyy-MM-dd"), endTime.toString("yyyy-MM-dd"));

        return true;
      }

			// otherwise, set time based on start and end time
      if ($start != undefined && $start != null && $start != "Invalid Date") {
        if ($start instanceof Date) {
          startTime = $start;
        } else if (typeof($start) == "number") { 
          startTime.setFullYear($start);
        } else if (parseInt($start)) {
          startTime.setFullYear($start);
        } 
      }

      if ($end != undefined && $end != null && $end != "Invalid Date") {
        if ($end instanceof Date) {
          endTime = $end;
        } else if (typeof($end) == "number") {
          endTime.setFullYear($end);
        } else if (parseInt($end)) {
          endTime.setFullYear($end);
        } 
      }

      _startTime = startTime;
      _endTIme = endTime;

			HyperCities.earth.setTimespan( startTime.toString("yyyy-MM-dd"), endTime.toString("yyyy-MM-dd"));
			return true;
		},

    /**
     * Get timespan from earth
     * @return Object {min: min date, max: max date}
     */
    getTimespan: function() {
      return HyperCities.earth.getTimespan();             

      //return {min: _startTime, max: _endTime};
    }
	};
}(); // end of Object
