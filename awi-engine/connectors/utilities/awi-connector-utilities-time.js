/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][   ]       Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_] \     link:
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-connector-time-gregorian.js
* @author FL (Francois Lionet)
* @date first pushed on 10/06/2023
* @version 0.3
*
* @short Time Gregorian calendar utilities.
*
*/
var awiconnector = require( '../awi-connector' );
//var hebcal = require( 'hebcal' );

class ConnectorUtilitiesTime extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Time';
		this.token = 'time';
		this.classname = 'utilities';
		this.version = '0.3';
		this.extraDates =
		{
			yesterday: { names: [ 'yesterday' ], needAdjective: false, delta: -1 },
			tomorrow: { names: [ 'tomorrow' ], needAdjective: false, delta: 1 },
			morning: { names: [ 'morning', 'dawn', 'breakfast', 'brunch' ], needAdjective: true, delta: 0 },
			noon: { names: [ 'noon', 'midday', 'dinner' ], needAdjective: true, delta: 0 },
			afternoon: { names: [ 'afternoon' ], needAdjective: true, delta: 0 },
			evening: { names: [ 'evening', 'sunset' ], needAdjective: true, delta: 0 },
			night: { names: [ 'night' ], needAdjective: true, delta: 0 },
			second: { names: [ 'second' ], needAdjective: true, delta: 0 },
			minute: { names: [ 'minute', 'minit', 'minut' ], needAdjective: true, delta: 0 },
			hour: { names: [ 'hour' ], needAdjective: true, delta: 0 },
			day: { names: [ 'day' ], needAdjective: true, delta: 0 },
			week: { names: [ 'week' ], needAdjective: true, delta: 0 },
			month: { names: [ 'month' ], needAdjective: true, delta: 0 },
			year: { names: [ 'year' ], needAdjective: true, delta: 0 },
			decade: { names: [ 'decade' ], needAdjective: true, delta: 0 },
			century: { names: [ 'century' ], needAdjective: true, delta: 0 },
			christmas: { names: [ 'christmas', 'xmas', 'x-mas' ], needAdjective: true, delta: 0 },
			easter: { names: [ 'easter' ], needAdjective: true, delta: 0 },
			thanksgiving: { names: [ 'thanksgiving' ], needAdjective: true, delta: 0 },
			birthday: { names: [ 'birthday' ], needAdjective: true, delta: 0 },
			shabbath: { names: [ 'shabbath', 'shabbat' ], needAdjective: true, delta: 0 },
			tonight: { names: [ 'tonight' ], needAdjective: false, delta: 0 },
			birth: { names: [ 'birth' ], needAdjective: false, delta: 0 },
			death: { names: [ 'death' ], needAdjective: false, delta: 0 },
		}
		this.extraDateAdjectives =
		{
			previouslast: { names: [ 'previous last' ], delta: -2 },
			this: { names: [ 'this' ], delta: 0 },
			last: { names: [ 'last', 'previous' ], delta: -1 },
			next: { names: [ 'next' ], delta: +1 },
		}
		this.extraTimes = this.extraDates;
		this.extraTimeAdjectives = this.extraTimeAdjectives;
	}
	async connect( options )
	{
		super.connect( options );
		this.connected = true;
		this.connectAnswer.success = true;
		return this.connectAnswer;
		/*
		this.hebcal = new hebcal.GregYear();
		this.hebcalDay = hebcal.HDate( new Date() );
		var holidays = this.hebcal.holidays;
		for ( var h = 0; h < holidays.length; h++ )
		{
			var holiday = holidays[ h ];
			for ( var d = 0; n < holiday.desc.length; d++ )
			{
				var name = holiday.desc[ d ];
				for ( var p = 0; p < name.length; p++ )
				{
					var type = this.awi.utilities.getCharacterType( name.charAt( p ) );
					if ( type != 'letter' )
						break;
				}
				name = name.substring( 0, p );
				if ( !this.holidays[ name ] )
				{
					this.holidays[ name ] = { names: [ name ] };
				}
				else
				{
					this.holidays[ name ].names.push( name );
				}
			}
			holidayDesc.names
		}
		var holidays = this.hebcalDay.holidays( true );
		*/
	}
	getDateRegex()
	{
		return [ /([a-zA-Z\u00E9\u00E8\u00EA\u00EB\u00E0\u00E2\u00E4\u00F4\u00F6\u00FB\u00FC\u00E7]{3})\s(\d{1,2}),\s(\d{4})\s(\d{1,2}):(\d{2}):(\d{2})(am|pm|AM|PM)?/ ];
	}
	getTimeRegex()
	{
		return [ /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/ ];
	}
	getMediaRegex()
	{
		return [ /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/ ];
	}
	getDatestamp( date )
	{
		date.setHours( 0 );
		date.setMinutes( 0 );
		date.setSeconds( 0 );
		date.setMilliseconds( 0 );
		var text = date.toISOString();
		var t = text.indexOf( 'T' );
		return { time: date.getTime(), text: text.substring( 0, t ) };
	};
	getTimestamp( time )
	{
		time.setFullYear( 1970, 1 );
		time.setDate( 1 );
		var text = time.toISOString().substring( 0, time.toISOString().length - 1 );
		var t = text.indexOf( 'T' );
		return { time: time.getTime(), text: text.substring( t + 1 ) };
	};
	getDatestampFromMatches( matches, monthReplacement = 1 )
	{
		var [ _, month, day, year, hours, minutes, seconds, ampm ] = matches;

		// Convert month to number
		var monthList =
		[
			"JanuFebrMarsApriMay JuneJulyAuguSeptOctoNoveDece",
			"JanvFevrMarsAvriMai JuinJuilAoutSeptOctoNoveDece",
			"JanvFévrMarsAvriMai JuinJuilAoûtSeptOctoNoveDéce",
		]
		var nMonth;
		month = month.substring( 0, 4 ).toLowerCase();
		for ( var n = 0; n < monthList.length; n++ )
		{
			var nMonth = monthList[ n ].toLowerCase().indexOf( month );
			if ( nMonth >= 0 )
			{
				nMonth = Math.floor( nMonth / 4 );
				nMonth++;
				break;
			}
		}
		if ( nMonth < 1 )
			nMonth = monthReplacement;
		month = nMonth;
		var isPM = ( ampm === 'pm' || ampm === 'PM' );
		var newHours = ( isPM && hours !== '12' ) ? parseInt( hours ) + 12 : parseInt( hours );
		var date = new Date( parseInt( year ), month - 1, parseInt( day ), newHours, parseInt( minutes ), parseInt( seconds ) )
		return { time: date.getTime(), text: date.toUTCString() };
	}
	getTimestampFromMatches( matches )
	{
		var [ _, hours, minutes, seconds, milliseconds ] = matches;
		hours = this.awi.utilities.checkUndefined( hours, '00' );
		minutes = this.awi.utilities.checkUndefined( minutes, '00' );
		seconds = this.awi.utilities.checkUndefined( seconds, '00' );
		milliseconds = this.awi.utilities.checkUndefined( milliseconds, '000' );

		var date = new Date();
		date.setFullYear( 1970, 1 );
		date.setHours( parseInt( hours ) );
		date.setMinutes( parseInt( minutes ) );
		date.setSeconds( parseInt( seconds ) );
		date.setMilliseconds( parseInt( milliseconds ) );
		return this.getTimestamp( date );
	}
	getTimestampFromStats( stats )
	{
		var date = new Date( stats.mtimeMs );
		return this.getDatestamp( date );
	}
	getTimeOrDate( definition, type )
	{
		var now = new Date();
		var start = new Date();
		var end = new Date();
		function setYear( n, s, e )
		{
			if ( n >= 0 ) now.setYear( n );
			if ( s >= 0 ) start.setYear( s );
			if ( e >= 0 ) end.setYear( e );
		}
		function setMonth( n, s, e )
		{
			if ( n >= 0 ) now.setMonth( n );
			if ( s >= 0 ) start.setMonth( s );
			if ( e >= 0 ) end.setMonth( e );
		}
		function setDate( n, s, e )
		{
			if ( n >= 0 ) now.setDate( n );
			if ( s >= 0 ) start.setDate( s );
			if ( e >= 0 ) end.setDate( e );
		}
		function setHour( n, s, e )
		{
			if ( n >= 0 ) now.setHours( n );
			if ( s >= 0 ) start.setHours( s );
			if ( e >= 0 ) end.setHours( e );
		}
		function setMinute( n, s, e )
		{
			if ( n >= 0 ) now.setMinutes( n );
			if ( s >= 0 ) start.setMinutes( s );
			if ( e >= 0 ) end.setMinutes( e );
		}
		function setSecond( n, s, e )
		{
			if ( n >= 0 ) now.setSeconds( n );
			if ( s >= 0 ) start.setSeconds( s );
			if ( e >= 0 ) end.setSeconds( e );
		}
		function setMillisecond( n, s, e )
		{
			if ( n >= 0 ) now.setMilliseconds( n );
			if ( s >= 0 ) start.setMilliseconds( s );
			if ( e >= 0 ) end.setMilliseconds( e );
		}
		function addYear( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setYear( now.getFullYear() + n );
			if ( typeof s != 'undefined' ) start.setYear( start.getFullYear() + s );
			if ( typeof e != 'undefined' ) end.setYear( end.getFullYear() + e );
		}
		function addMonth( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setMonth( now.getMonth() + n );
			if ( typeof s != 'undefined' ) start.setMonth( start.getMonth() + s );
			if ( typeof e != 'undefined' ) end.setMonth( end.getMonth() + e );
		}
		function addDate( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setDate( now.getDate() + n );
			if ( typeof s != 'undefined' ) start.setDate( start.getDate() + s );
			if ( typeof e != 'undefined' ) end.setDate( end.getDate() + e );
		}
		function addHour( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setHours( now.getHours() + n );
			if ( typeof s != 'undefined' ) start.setHours( start.getHours() + s );
			if ( typeof e != 'undefined' ) end.setHours( end.getHours() + e );
		}
		function addMinute( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setMinutes( now.getMinutes() + n );
			if ( typeof s != 'undefined' ) start.setMinutes( start.getMinutes() + s );
			if ( typeof e != 'undefined' ) end.setMinutes( end.getMinutes() + e );
		}
		function addSecond( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setSeconds( now.getSeconds() + n );
			if ( typeof s != 'undefined' ) start.setSeconds( start.getSeconds() + s );
			if ( typeof e != 'undefined' ) end.setSeconds( end.getSeconds() + e );
		}
		function addMillisecond( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setMilliseconds( now.getMilliseconds() + n );
			if ( typeof s != 'undefined' ) start.setMilliseconds( start.getMilliseconds() + s );
			if ( typeof e != 'undefined' ) end.setMilliseconds( end.getMilliseconds() + e );
		}

		if ( type == 'time' )
		{
			switch ( definition.names[ 0 ] )
			{
				case 'morning':
					setHour( 8, 0, 12 );
					addDate( definition.delta, definition.delta, definition.delta );
					break;
				case 'noon':
					setHour( 13, 12, 14 );
					addDate( definition.delta, definition.delta, definition.delta );
					break;
				case 'afternoon':
					setHour( 16, 14, 20 );
					addDate( definition.delta, definition.delta, definition.delta );
					break;
				case 'evening':
					setHour( 22, 2, 24 );
					addDate( definition.delta, definition.delta, definition.delta );
					break;
				case 'night':
					setHour( 23, 22, 0 );
					addDate( definition.delta, definition.delta, definition.delta + 1 );
					break;
				case 'second':
					addSecond( definition.delta, definition.delta, definition.delta );
					break;
				case 'minute':
					addMinute( definition.delta, definition.delta, definition.delta );
					break;
				case 'hour':
					addHour( definition.delta, definition.delta, definition.delta );
					break;
				case 'tonight':
					setHour( 23, 22, 0 );
					setDate( 0, 0, 1 );
					break;
				case 'tomorrow':
				case 'yesterday':
				case 'day':
				case 'week':
				case 'month':
				case 'year':
				case 'decade':
				case 'century':
					setHour( 12, 0, 23 );
					setMinute( 0, 0, 59 );
					setSecond( 0, 0, 59 );
					setMillisecond( 0, 0, 999 );
					break;
				case 'christmas':
					setHour( 20, 0, 23 );
					setMinute( 0, 0, 59 );
					setSecond( 0, 0, 59 );
					setMillisecond( 0, 0, 999 );
					break;
				case 'easter':
				case 'thanksgiving':
				case 'birthday':
					setHour( 12, 0, 23 );
					setMinute( 0, 0, 59 );
					setSecond( 0, 0, 59 );
					setMillisecond( 0, 0, 999 );
					break;
				case 'birth':
				case 'death':
				case 'shabbath':
					break;
			}
			return { time: this.getTimestamp( now ), from: this.getTimestamp( start ), to : this.getTimestamp( end ) };
		}
		else
		{
			switch ( definition.names[ 0 ] )
			{
				case 'yesterday':
					addDate( - 1, - 1, 0 );
					break;
				case 'tomorrow':
					addDate( 1, 1, 2 );
					break;
				case 'day':
					addDate( definition.delta, definition.delta, definition.delta + 1 );
					break;
				case 'week':
					var day = start.getDay();
					setDate( - day - 3 + definition.delta * 7, - day - 7 + definition.delta * 7, - day + definition.delta * 7 );
					break;
				case 'month':
					setDate( 15, 1, 30 );
					addMonth( definition.delta, definition.delta, definition.delta + 1 );
					break;
				case 'year':
					setMonth( 7, 1, 12 );
					setDate( 1, 1, 31 );
					addYear( definition.delta, definition.delta, definition.delta + 1 );
					break;
				case 'decade':
					setYear( 1, -1, -1 );
					setMonth( 1, 1, 12 );
					setDate( 1, 1, 31 );
					setYear( definition.delta * 10 + 5, definition.delta * 10, definition.delta * 10 + 10 );
					break;
				case 'century':
					setYear( 1, -1, -1 );
					setMonth( 1, 1, 12 );
					setDate( 1, 1, 31 );
					setYear( definition.delta * 100 + 50, definition.delta * 100, definition.delta * 100 + 100 );
					break;
				case 'christmas':
					setMonth( 12, 12, 12 );
					setDate( 25, 20, 27 );
					addYear( definition.delta, definition.delta, definition.delta );
					break;
				case 'easter':
					function getEasterDate( Y )
					{
						var C = Math.floor(Y/100);
						var N = Y - 19*Math.floor(Y/19);
						var K = Math.floor((C - 17)/25);
						var I = C - Math.floor(C/4) - Math.floor((C - K)/3) + 19*N + 15;
						I = I - 30*Math.floor((I/30));
						I = I - Math.floor(I/28)*(1 - Math.floor(I/28)*Math.floor(29/(I + 1))*Math.floor((21 - N)/11));
						var J = Y + Math.floor(Y/4) + I + 2 - C + Math.floor(C/4);
						J = J - 7*Math.floor(J/7);
						var L = I - J;
						var M = 3 + Math.floor((L + 40)/44);
						var D = L + 28 - 31*Math.floor(M/4);
						return { month: M, day: D };
					}
					var year = start.getFullYear() + definition.delta;
					var { month, day } = getEasterDate( year );
					setMonth( month, month, month );
					setDate( day, day - 7, day + 7 );
					setYear( year, year, year );
					break;
				case 'thanksgiving':
					var year = start.getFullYear() + definition.delta;
					var first = new Date( year, 10, 1 );
					var day = 22 + ( 11 - first.getDay() ) % 7;
					setMonth( 11, 11, 11 );
					setDate( day, day - 2, day + 2 );
					setYear( year, year, year );
					break;
				case 'birthday':
					break;
				case 'shabbath':
					break;
				case 'birth':
					break;
				case 'death':
					break;
			}
			return { date: this.getDatestamp( now ), from: this.getDatestamp( start ), to : this.getDatestamp( end ) };
		}
	}
	isStatsWithinDate( stats, stamp )
	{
		if ( stats.mtimeMs >= stamp.from.time && stats.mtimeMs < stamp.to.time )
			return true;
		return false;
	}
}
module.exports.Connector = ConnectorUtilitiesTime