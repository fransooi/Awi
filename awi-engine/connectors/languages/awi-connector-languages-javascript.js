/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal
* (_)|____| |____|\__/\__/  [_| |_] \     Assistant
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-connector-languages-javascript.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Connector to Javascript
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorLanguageJavascript extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Javascript';
		this.token = 'javascript';
		this.classname = 'language';
		this.version = '0.2';
	}
	async connect( options )
	{
		return super.connect( options );
	}
	scanForCommands( line )
	{
		var foundKeywords = [];
		return foundKeywords;
	}
	extractTokens( source, callback, extra )
	{

	}
	close()
	{

	}
	async doEval( line, options = {} )
	{
		var mathWords =
		[
			{ name: 'round', token: 'Math.round' },
			{ name: 'ceil', token: 'Math.ceil' },
			{ name: 'floor', token: 'Math.floor' },
			{ name: 'trunc', token: 'Math.trunc' },
			{ name: 'sign', token: 'Math.sign' },
			{ name: 'pow', token: 'Math.pow' },
			{ name: 'sqr', token: 'Math.sqrt' },
			{ name: 'abs', token: 'Math.abs' },
			{ name: 'min', token: 'Math.min' },
			{ name: 'max', token: 'Math.max' },
			{ name: 'random', token: 'Math.ramdom' },
			{ name: 'cbrt', token: 'Math.cbrt' },
			{ name: 'exp', token: 'Math.exp' },
			{ name: 'log2', token: 'Math.log2' },
			{ name: 'log10', token: 'Math.log10' },
			{ name: 'log', token: 'Math.log' },
			{ name: 'tanh', token: 'Math.tanh', inType: 'self.awi.config.degreeToRadian' },
			{ name: 'sinh', token: 'Math.sinh', inType: 'self.awi.config.degreeToRadian' },
			{ name: 'cosh', token: 'Math.cosh', inType: 'self.awi.config.degreeToRadian' },
			{ name: 'acos', token: 'Math.acos', outType: 'self.awi.config.radianToDegree' },
			{ name: 'asin', token: 'Math.asin', outType: 'self.awi.config.radianToDegree' },
			{ name: 'atan', token: 'Math.atan', outType: 'self.awi.config.radianToDegree' },
			{ name: 'acosh', token: 'Math.acosh', outType: 'self.awi.config.radianToDegree' },
			{ name: 'asinh', token: 'Math.sinh', outType: 'self.awi.config.radianToDegree' },
			{ name: 'atan2', token: 'Math.atan2', outType: 'self.awi.config.radianToDegree' },
			{ name: 'atanh', token: 'Math.atanh', outType: 'self.awi.config.radianToDegree' },
			{ name: 'sin', token: 'Math.sin', inType: 'self.awi.config.degreeToRadian' },
			{ name: 'cos', token: 'Math.cos', inType: 'self.awi.config.degreeToRadian' },
			{ name: 'tan', token: 'Math.tan', inType: 'self.awi.config.degreeToRadian' },
		];
		line = line.split( ' ' ).join( '' );
		function getWord( name )
		{
			for ( var w = 0; w < mathWords.length; w++ )
			{
				var word = mathWords[ w ];
				if ( word.name == name.toLowerCase() )
					return word;
			}
			return null;
		}
		function scan( line )
		{
			for ( var w = 0; w < mathWords.length; w++ )
			{
				var word = mathWords[ w ];
				var startCommand = line.indexOf( word.name + '(' );
				if ( startCommand >= 0 )
				{
					// Skip parentheses
					var count = 1;
					var start = startCommand + word.name.length + 1;
					var end = start;
					var embedded = [ { start: start, end: 0, name: word.name, startName: startCommand } ];
					var currentName = '';
					var startName = 0;
					while( end < line.length )
					{
						var c = line.charAt( end );
						if ( c === '(' )
						{
							count++;
							embedded.push( { start: end + 1, name: currentName} )
						}
						else if ( c == ')' )
						{
							count--;
							if ( count == 0 )
								break;
							else
							{
								embedded[ count ].end = end;
								embedded[ count ].name = currentName;
								embedded[ count ].startName = startName;
								currentName = '';
							}
						}
						else if ( this.awi.utilities.getCharacterType( c ) == 'letter' )
						{
							if ( currentName == '' )
								startName = end;
							currentName += c;
						}
						end++;
					}
					if ( count )
					{
						return '';
					}
					embedded[ 0 ].end = end;
					for ( var e = embedded.length - 1; e >= 0; e-- )
					{
						var embed = embedded[ e ];
						var word = getWord( embed.name );
						if ( !word )
							line = '';
						else
						{
							var command = '';
							var parameter = line.substring( embed.start, embed.end );
							if ( word.inType )
								parameter = word.inType + '(' + parameter + ')';
							if ( word.outType )
								command = word.outType + '(' + word.token + '(' + parameter + '))'
							else
								command = word.token + '(' + parameter + ')';
							var end = embed.end + 1;
							var delta = command.length - ( end - embed.startName );
							for ( var ee = e - 1; ee >= 0; ee-- )
								embedded[ ee ].end += delta;
							line = line.substring( 0, embed.startName ) + command + line.substring( end );
						}
					}
					break;
				}
			}
			return line;
		}
		line = scan( line );
		if ( line == '' )
			return { success: false, data: result, error: 'awi:invalid-expression:iwa' };

		var result;
		try
		{
			result = eval( line );
		}
		catch ( e )
		{
			return { success: false, data: result, error: 'awi:invalid-expression:iwa' };
		}
		return { success: true, data: this.awi.config.roundValue( result ) };
	}
}
module.exports.Connector = ConnectorLanguageJavascript;
