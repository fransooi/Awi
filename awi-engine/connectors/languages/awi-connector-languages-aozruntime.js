/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal 
* (_)|____| |____|\__/\__/  [_||_]  \     Assistant
*
* This file is open-source under the conditions contained in the 
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-connector-languages-aozruntime.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Connector to AOZ Runtime language (can be used for interanl commands)
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorLanguageAozRuntime extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Aoz Runtime';
		this.token = 'aozruntime';
		this.classname = 'language';
		this.version = '0.2.1';
		this.atom = options.atom;
	}
	async connect( options )
	{
		super.connect( options );

		// Load language info, sort it
		do
		{
			var answer = this.awi.utilities.loadJSON( this.awi.config.getEnginePath() + '/data/language.json', { encoding: 'utf8' } );
			this.language = answer.data;
			if ( !this.language )
				break;
			this.language.sort( function( a, b )
			{
				var commandA = a.prompt.substring( 0, a.prompt.indexOf( '\n' ) );
				var commandB = b.prompt.substring( 0, b.prompt.indexOf( '\n' ) );
				if ( commandA.length > commandB.length )
					return 1;
				if ( commandA.length < commandB.length )
					return -1;
				return 0;
			} );
	
			this.connected = true;
			this.connectAnswer.success = true;			
		} while( false )
		return this.connectAnswer;
	}	
	getImportPaths()
	{
		var toScan = []
		if ( this.aozConfig )
		{
			toScan.push( 'drive' );
			toScan.push( 'applications' );
			toScan.push( 'tutorials' );
			toScan.push( 'games' );
			toScan.push( 'demos' );
		}
		var importPaths = {};
		importPaths[ 'image' ] = 'image';
		importPaths[ 'sound' ] = 'sound';
		importPaths[ 'video' ] = 'video';
		importPaths[ 'music' ] = 'music';
		importPaths[ 'json' ] = 'json';
		importPaths[ 'text' ] = 'text';
		importPaths[ 'asset' ] = 'asset';
		return { toScan: toScan, importPaths: importPaths };
	}
	import( path, callback, options = {} )
	{
		var typeList =
		{
			image: [ '.png', '.jpg', '.jpeg' ],
			sound: [ '.wav', '.mp3', '.ogg' ],
			video: [ '.mp4' ],
			music: [ '.mod' ],
			json: [ '.json' ],
			text: [ '.txt', '*.asc' ],
		}
		
		var type = options.type;
		if ( !type )
		{
			var ext = this.awi.utilities.extname( path ).toLowerCase();
			for ( var t in typeList	)
			{
				for ( var tt = 0; tt < typeList[ t ].length; tt++ )
				{
					if ( ext == typeList[ t ][ tt ]	)
					{
						type = t;
						break;
					}
				}
				if ( type )
					break;
			}			
		}
		if ( !type )
			return { success: false, data: {}, error: 'awi:import-type-not-supported:iwa' }

		var importPaths = this.getImportPaths();
		var destinationPath = importPaths.importPaths[ type ];
		if ( destinationPath )
		{
			var answer = this.awi.system.copyFile( path, this.awi.utilities.normalize( destinationPath + '/' + this.awi.utilities.basename( path ) ) );
			if ( answer.success )
				return answer;
		}
		return { success: false, data: {}, error: 'awi:file-not-found:iwa' }
	}
	extractTokens( source, callback, extra )
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
			{ name: 'sqrt', token: 'Math.sqrt' },
			{ name: 'sqr', token: 'Math.sqrt' },
			{ name: 'abs', token: 'Math.abs' },
			{ name: 'min', token: 'Math.min' },
			{ name: 'max', token: 'Math.max' },
			{ name: 'rnd', token: 'Math.random' },
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
	close()
	{

	}
	scanForCommands( line )
	{
		var foundKeywords = [];
		var lineLower = line.toLowerCase();
		for ( var n = this.language.length - 1; n >= 0; n-- )
		{
			var found = false;
			var instruction = this.language[ n ].prompt.substring( 0, this.language[ n ].prompt.indexOf( '\n' ) );
			if ( instruction.length > 2 && lineLower.indexOf( ' ' + instruction.toLowerCase() + ' ' ) >= 0 )
			{
				for ( var f = 0; f < foundKeywords.length; f++ )
				{
					if ( foundKeywords[ f ].instruction.toLowerCase().indexOf( instruction ) >= 0 )
					{
						found = true;
						break;
					}
				}
				if ( !found )
					foundKeywords.push( { instruction: instruction, completion: this.language[ n ].completion } )
			}
		}
		return foundKeywords;
	}
	getCodeContext( tokens )
	{
		// Compute prompt
		var self = this;
		function getInstruction( instruction )
		{
			instruction = instruction.toLowerCase();
			if ( instruction == 'end' )
				return '';
			for ( var l = 0; l < self.language.length; l++ )
			{
				var line = self.language[ l ];
				if ( line.prompt.toLowerCase().indexOf( instruction ) == 0 )
				{
					if ( line.prompt.charAt( instruction.length ) == '\n' )
					{
						var text = line.completion.trim();
						text = text.charAt( 0 ).toLowerCase() + text.substring( 1 );
						text = this.awi.utilities.replaceStringInText( text, '###', '' );
						return text;
					}
				}
			}
			return '';
		}

		// Generate context
		var context = '';
		for ( var i = 0; i < tokens.instructions.length; i++ )
		{
			var text = getInstruction( tokens.instructions[ i ] );
			if ( text != '' )
				context += tokens.instructions[ i ] + ' is ' + text + '\n';
		}
		for ( var i = 0; i < tokens.functions.length; i++ )
		{
			var text = getInstruction( tokens.functions[ i ] );
			if ( text != '' )
				context += tokens.functions[ i ] + ' is ' + text + '\n';
		}
		for ( var i = 0; i < tokens.tokens.length; i++ )
		{
			var text = getInstruction( tokens.tokens[ i ] );
			if ( text != '' )
				context += tokens.tokens[ i ] + ' is ' + text + '\n';
		}
		for ( var i = 0; i < tokens.variables.length; i++ )
		{
			var variable = tokens.variables[ i ];
			switch ( variable.type )
			{
				case '0':
				case '1':
					context += variable.name + ' is a variable containing a number';
					break;
				case '2':
					context += variable.name + ' is a variable containing a string';
					break;
				case '3':
					context += variable.name + ' is a variable containing an object';
					break;
			}
		}
		return context;
	}
}
module.exports.Connector = ConnectorLanguageAozRuntime;
