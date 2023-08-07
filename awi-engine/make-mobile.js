var awiawi = require( './awi' );
const fs = require( 'fs' );
const { mkdirp } = require( 'mkdirp' );

var toIgnore = [
	'copy-to',
	'package',
	'connectors',
	'make-mobile',
	'awi-config.js',
	'awi-messages.js',
	'awi-personality.js',
	'awi-prompt.js',
	'awi.js',
	];
var toCopy = [
	'awi-connector-systems-mobile.js',
	'awi-connector-utilities-utilities.js',
	'awi-connector-utilities-time.js',
	'awi-connector-utilities-parser.js',
	'awi-connector-languages-javascript.js',
	'awi-connector-editors-mobile.js',
	'awi-connector-clients-openaibrowser.js',
	];
async function startAwi( prompt, config )
{
	var awi = new awiawi.Awi( config );
	var answer = await awi.connect( {} );
	if ( answer.success )
	{
		var filelist = [];
		var sourcePath = 'C:/Awi/awi-engine';
		var destinationPath = 'C:/Awi/apps/mobile/src/js/awi-engine';
		awi.utilities.deleteDirectory( destinationPath, { recursive: true, keepRoot: true } );

		var answer = await awi.system.getDirectory( sourcePath, { recursive: true, filters: [ '*.*' ] } );
		var files = awi.utilities.getFileArrayFromTree( answer.data );
		for ( var level = 1; level < 3; level++ )
		{
			for ( var f = 0; f < files.length; f++ )
			{
				var file = files[ f ];
				var path = awi.utilities.normalize( file.path );
				var subPath = path.substring( path.indexOf( 'awi-engine' ) + 11 );
				var copyPath = destinationPath + '/' + subPath;
				var dir = subPath.substring( 0, subPath.lastIndexOf( '/' ) );
				if ( file.path.indexOf( 'node_modules' ) >= 0 || file.path.indexOf( 'node' ) >= 0 )
					continue;
				if ( file.path.indexOf( '/data/' ) >= 0 )
				{
					if ( level > 1 )
						continue;
					if ( dir.length > 0 )
						mkdirp.sync( destinationPath + '/' + dir );
					fs.copyFileSync( path, copyPath );
					console.log( 'Copy: ' + file.path );
					continue;
				}
				if ( toIgnore.findIndex( function( e ){ return file.path.toLowerCase().indexOf( e.toLowerCase() ) >= 0;	} ) >= 0 )
				{
					if ( toCopy.findIndex( function( e ){ return file.path.toLowerCase().indexOf( e.toLowerCase() ) >= 0; } ) < 0 )
						continue;
				}
				if ( file.name.indexOf( '.json' ) >= 0 )
				{
					if ( level > 1 )
						continue;
					if ( dir.length > 0 )
						mkdirp.sync( destinationPath + '/' + dir );
					fs.copyFileSync( path, copyPath );
					console.log( 'Copy: ' + file.path );
				}
				else if ( file.name.indexOf( '.js' ) >= 0 )
				{
					var nSlash = subPath.split( '/' ).length - 1;
					if ( nSlash == level )
					{
						filelist.push( subPath );
						console.log( subPath );
					}
				}
			}
		}

		// Output list of files...
		setInterval( function()
		{
			var list = '';
			for ( var f = 0; f < filelist.length; f++ )
			{
				var file = filelist[ f ];
				var moduleName = file.substring( 0, file.lastIndexOf( '.' ) );
				moduleName = moduleName.split( '/' );
				moduleName = moduleName.pop();
				list += 'module.exports[ "' + moduleName + '" ] = require( "./' + filelist[ f ] + '" )\n';
			}
			fs.writeFileSync( sourcePath + '/awi-requires-new.js', list, { encoding: 'utf8' } );
			process.exit();
		}, 1000 );
	}
}

function getArguments()
{
	var thispath = __dirname;
	var answer =
	{
		config:
		{
			prompt: '',
			configurations: thispath + '/configs',
			engine: thispath,
			data: thispath + '/data',
			connectors:
			[
				{ name: 'systems.node', options: {}, default: true },
				{ name: 'utilities.utilities', options: {}, default: true },
				{ name: 'utilities.time', options: {}, default: true },
				{ name: 'utilities.parser', options: {}, default: true },
				{ name: 'clients.openainode', options: {}, default: true },
				{ name: 'editors.commandline', options: {}, default: true },
				{ name: 'languages.javascript', options: {}, default: true },
				{ name: 'importers.*', options: {} },
			],
		},
		prompt: ''
	};
	var error = false;
	var quit = false;
	for ( var a = 2; ( a < process.argv.length ) && !quit && !error; a++ )
	{
		var command = process.argv[ a ].toLowerCase();

		var pos;
		if( ( pos = command.indexOf( '--configurations=' ) ) >= 0 )
		{
			answer.config.configurations = command.substring( pos, command.length );
		}
		else if( ( pos = command.indexOf( '--engine=' ) ) >= 0 )
		{
			answer.config.engine = command.substring( pos, command.length );
		}
		else if( ( pos = command.indexOf( '--data=' ) ) >= 0 )
		{
			answer.config.data = command.substring( pos, command.length );
		}
		else if ( !error )
		{
			if ( answer.prompt.length > 0 )
				answer.prompt += ' ';
			answer.prompt += command;
		}
	}
	return { success: !error, data: answer };
};
var answer = getArguments();
if ( answer.success )
{
	startAwi( answer.data.prompt, answer.data.config );
}
