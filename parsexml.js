// Copyright © Marc White, 2013

// Script to obtain, manipulate & return SSO met data from XML

var debugMode = true;

// Data is publicly available
var met23 = 'met23.xml';
var metSM = 'skymap.xml';
var metSM1 = 'skymap_add1.xml';

// Define the telescopeMet object that will hold & control the met data

var months = {
	01: "JAN",
	02: "FEB",
	03: "MAR",
	04: "APR",
	05: "MAY",
	06: "JUN",
	07: "JUL",
	08: "AUG",
	09: "SEP",
	10: "OCT",
	11: "NOV",
	12: "DEC"
}

function telescopeMet(telescope) {
	if (debugMode) {console.debug('Creating new telescopeMet object...')}
	if (telescope == '2.3') {
		this.url = met23;
	} else if (telescope == 'SM') {
		this.url = metSM;
	} else {
		window.alert('ERROR: Invalid telescope passed to telescopeMet');
	}
	this.telescope = telescope;
	this.initialiseData();
	this.utcoffset = -((new Date).getTimezoneOffset()) / 60.0;
	if (this.utcoffset >= 0) {
		this.utcoffset = '+'+this.utcoffset;
	} else {
		this.utcoffset = String(this.utcoffset);
	}
	this.updateData;
	// this.updateInt = 10000; // millisecs
	// this.startTimer();

	return this;
}

// Define telescopeMet internal functions
telescopeMet.prototype = {
	startTimer: function (interval) {
		// Make an initial read of the data
		this.updateData();
		if (debugMode) { console.debug('Initial data read performed'); }
		// Begin a repeat timer
		this.reloadTimer = setInterval(this.updateData.bind(this), interval);
		if (debugMode) { console.debug('Repeat reader running'); }
		return this;
	},
	stopTimer: function () {
		var that = this;
		clearInterval(that.reloadTimer);
	},
	initialiseData: function () {
		// Function to initialise the JSON data in the telescope object
		this.metdata = {
			temps: [
				{key: 'EXTERNAL', value: null},
				{key: 'INTERNAL', value: null},
				{key: 'MIRROR',   value: null},
				{key: 'DEWPOINT', value: null}
			],
			humid: null,
			conds: null,
			shttr: null,
			winds: null,
			windd: null,
			// obstm: null,
			obsdt: null
		};
		if (debugMode) { console.debug('Data initialised'); }
		return this;
	},
    checkRainSM: function ($data) {
		// Check if SM is 'raining' or not
		var intSensor = this.checkAndReturn($data.find('irs'));
		var extSensor = this.checkAndReturn($data.find('ers'));
		if ((intSensor == '1') || (extSensor == '1')) {
			return 'NO_OBSERVING';
		} else {
			return 'CLEAR';
		}
	},
	checkAndReturn: function ($elem) {
		// Check the error state of the requested variable
		// If ERROR/error value, return the error value
		// If not, return the measured value

		if (($elem.find('stat').text() == 'ERROR') || ($elem.find('stat').text() == 'STD_VAL')) {
		// if (false) {
			return null;
		} else {
			value = $elem.find('val').text();
			valuedigits = value.replace(/\D/g,'');
			// Check if the value digits are all 9, which is another error indicator
			// (if a temperature happens to be exactly 9.999, too bad so sad)
			// Only occurs for strings with numbers in them, i.e., numeric data values
			if ((valuedigits.length != 0) && (valuedigits.replace(/9/g,'') === '')) {
				if (debugMode) { console.debug('Made a value null based on recorded value.'); };
				return null;
			} else {
				return value;
			}
		}
	},
	parseDateTime: function ($data) {
		var xmldate = $data.find('date').text();
		var xmltime = $data.find('utc').text();

		// Break the date into day, month, year (2.3m) or year, month, day (SM)
		xmldate = xmldate.split('-')
		// Break the time into hrs, mins, secs
		// alert(xmldate)
		// alert(xmltime)
		// If telescope is SM, reverse the dates
		// If telescope is 2.3m, trim the ms of the secs
		if (this.telescope == 'SM') {
			var xmldate2 = xmldate.slice();
			xmldate[0] = xmldate2[2]
			xmldate[2] = xmldate2[0]
			xmldate[1] = months[xmldate[1]]
		} else if (this.telescope == '2.3') {
			xmltime = (xmltime.split('.'))[0]
		}
		xmldate = xmldate.join(' ');

		return xmldate+' '+xmltime;
	},
	updateData: function (callback) {
		// var thisMet = this;
		$.ajax(this.url, {
			type: 'GET',
			async: true,
			cache: false,
			timeout: 8500,
			datatype: 'xml',
			success: function (d) {
				if (debugMode) { console.debug('Inside GET jQuery method...'); }
				var $data = $(d);

				if (debugMode) { console.debug('Reading in data...');}
				// External temp
				this.metdata.temps[0].value = parseFloat(this.checkAndReturn($data.find('tdb'))) || null;
				// Dewpoint temp
				this.metdata.temps[3].value = parseFloat(this.checkAndReturn($data.find('dp'))) || null;
				this.metdata.humid = parseFloat(this.checkAndReturn($data.find('rh'))) || null;
				this.metdata.winds = parseFloat(this.checkAndReturn($data.find('ws'))) || null;
				this.metdata.windd = parseFloat(this.checkAndReturn($data.find('wd'))) || null;
				this.metdata.obsdt = this.parseDateTime($data) || null;

				if (this.telescope === '2.3') {
					// Internal temp
					this.metdata.temps[1].value = parseFloat(this.checkAndReturn($data.find('tint'))) || null;
					// Mirror temp
					this.metdata.temps[2].value = parseFloat(this.checkAndReturn($data.find('tm'))) || null;
					this.metdata.conds = this.checkAndReturn($data.find('rsens')) || null;
					this.metdata.shttr = this.checkAndReturn($data.find('sht')) || null;
				} else if (this.telescope === 'SM') {
					// Internal temp
					this.metdata.temps[1].value = parseFloat(this.checkAndReturn($data.find('it'))) || null;
					this.metdata.conds = this.checkRainSM($data) || null;
					this.metdata.shttr = this.checkAndReturn($data.find('shc')) || null;
					if (this.metdata.shttr == '0') { this.metdata.shttr = 'OPEN'; }
					else if (this.metdata.shttr == '1') { this.metdata.shttr = 'CLOSED'; }
					// Read in the add1 xml file to get the mirror temperature
					$.ajax(metSM1, {
						type: 'GET',
						async: false,
						cache: false,
						timeout: 8500,
						datatype: 'xml',
						success: function (d) {
							var $newdata = $(d);
							// Mirror temp
							this.metdata.temps[2].value = parseFloat(this.checkAndReturn($newdata.find('pmt'))) || null;
						}.bind(this),
						error: function () {
							this.metdata.temps[2].value = null;
						}.bind(this),
					});
				}
				if (debugMode) { console.debug('Read in the data as ', this.metdata); }
				if (callback) { callback(); }
			}.bind(this),
			error: function () { 
				this.initialiseData(); if (callback) { callback(); }; console.log('Inside error');
			}.bind(this)
		})

		// $.get(this.url, function (d) {
		// 	if (debugMode) { console.debug('Inside GET jQuery method...'); }
		// 	var $data = $(d);

		// 	if (debugMode) { console.debug('Reading in data...');}
		// 	// External temp
		// 	this.metdata.temps[0].value = parseFloat(this.checkAndReturn($data.find('tdb'))) || null;
		// 	// Dewpoint temp
		// 	this.metdata.temps[3].value = parseFloat(this.checkAndReturn($data.find('dp'))) || null;
		// 	this.metdata.humid = parseFloat(this.checkAndReturn($data.find('rh'))) || null;
		// 	this.metdata.winds = parseFloat(this.checkAndReturn($data.find('ws'))) || null;
		// 	this.metdata.windd = parseFloat(this.checkAndReturn($data.find('wd'))) || null;
		// 	// Mirror temp
		// 	this.metdata.temps[2].value = parseFloat(this.checkAndReturn($data.find('tm'))) || null;
		// 	this.metdata.obsdt = this.parseDateTime($data) || null;

		// 	if (this.telescope === '2.3') {
		// 		// Internal temp
		// 		this.metdata.temps[1].value = parseFloat(this.checkAndReturn($data.find('tint'))) || null;
		// 		this.metdata.conds = this.checkAndReturn($data.find('rsens'));
		// 		this.metdata.shttr = this.checkAndReturn($data.find('sht'));
		// 	} else if (this.telescope === 'SM') {
		// 		// Internal temp
		// 		this.metdata.temps[1].value = parseFloat(this.checkAndReturn($data.find('it'))) || null;
		// 		this.metdata.conds = this.checkRainSM($data);
		// 		this.metdata.shttr = this.checkAndReturn($data.find('ship'));
		// 	}
		// 	if (debugMode) { console.debug('Read in the data as ', this.metdata); }
		// 	if (callback) { callback(); }
		// }.bind(this));
	if (debugMode) { console.debug('Data updated!'); }

	return this;
	}
}