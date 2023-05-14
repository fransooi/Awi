var awiawi = require( './awi-engine/awi' );
const fs = require( 'fs' );
const { mkdirp } = require( 'mkdirp' );

function extractModule( fileArray, module )
{
	var foundIndex = fileArray.findIndex( 
		function( element )
		{
			var pos = element.lastIndexOf( module );
			if ( pos >= 0 )
			{
				if ( pos + module.length == element.length )
					return true;
			}
			return false;
		} );
	var result = fileArray[ foundIndex ];
	fileArray.splice( foundIndex, 1 );
	return result;
}
async function startAwi( userConfig )
{
	var awi = new awiawi.Awi( userConfig );
	var answer = await awi.connect( {} );
	if ( answer.success )
	{
		var filelistNoRequire = [];
		var filelistRequire = [];
		var sourcePath = './awi-engine';
		var destinationPath = 'C:/AOZ_Studio/AOZ_Studio/app/aoz/runtime/awi-engine';
		awi.utilities.deleteDirectory( destinationPath, { recursive: true, keepRoot: true } );

		var answer = await awi.system.getDirectory( sourcePath, { recursive: true, filters: [ '*.*' ] } );		
		var files = awi.utilities.getFileArrayFromTree( answer.data );
		for ( var f = 0; f < files.length; f++ )
		{
			var file = files[ f ];
			var path = awi.utilities.normalize( file.path );
			var subPath = path.substring( path.indexOf( 'awi-engine' ) + 11 );
			var copyPath = destinationPath + '/' + subPath;
			var dir = subPath.substring( 0, subPath.lastIndexOf( '/' ) );
			var moduleName = file.name.substring( 0, file.name.length - 3 );
			if ( file.path.indexOf( 'node_modules' ) < 0 && file.path.indexOf( 'node' ) < 0 )
			{
				if ( file.name.indexOf( '.js' ) >= 0 && file.name.indexOf( '.json' ) < 0 )
				{
					if ( dir.length > 0 )
						mkdirp.sync( destinationPath + '/' + dir );
					console.log( file.name );
					var source = await awi.utilities.loadIfExist( file.path, { encoding: 'utf8' } );
					source = source.data.split( '\r\n' ).join( '\n' );
					var isRequire = false;
					var require = source.indexOf( 'require' );					
					while ( require >= 0 )
					{
						isRequire = true;
						var quote = source.indexOf( "'", require );
						var endQuote = source.indexOf( "'", quote + 1 );
						var endLine = endQuote;
						while ( source.charCodeAt( endLine ) >= 32 )
							endLine++;
						var name = source.substring( quote + 1, endQuote ).split( '/' );
						name = name[ name.length - 1 ];
						source = source.substring( 0, require ) + 'window.awi[ "' + name + '" ]' + source.substring( endLine );					
						require = source.indexOf( 'require', require + 1 );
					}
					var detect = 'module.exports';
					var exports = source.indexOf( detect );
					while ( exports >= 0 )
					{
						var classname = exports + detect.length;
						source =  source.substring( 0, exports ) + 'window.awi[ "' + moduleName + '" ]' + source.substring( classname );					
						exports = source.indexOf( detect, exports + 1 );
					}
					subPath = subPath.substring( 0, subPath.length - 3 );
					if ( isRequire )
						filelistRequire.push( subPath );
					else
						filelistNoRequire.push( subPath );
					fs.writeFileSync( copyPath, source, { encoding: 'utf8' } );
				}
				else
				{
					if ( file.path.indexOf( 'digested') < 0 && file.path.indexOf( 'todigest' ) < 0 )
					{
						if ( file.name.indexOf( 'package' ) < 0 )
						{
							mkdirp.sync( destinationPath + '/' + dir );
							fs.copyFileSync( path, copyPath );
						}
					}
				}
			}
		}
		mkdirp.sync( destinationPath + '/data/digested/messenger' );
		mkdirp.sync( destinationPath + '/data/todigest/messenger' );

		// Order file-list
		var last = [];
		last.push( extractModule( filelistRequire, 'awi-prompt' ) );
		last.push( extractModule( filelistRequire, 'awi' ) );
		filelistNoRequire.push( extractModule( filelistRequire, 'awi-bubbles' ) );
		filelistNoRequire.push( extractModule( filelistRequire, 'awi-bulbs' ) );
		filelistNoRequire.push( extractModule( filelistRequire, 'awi-souvenir' ) );
		filelistNoRequire.push( extractModule( filelistRequire, 'awi-memory' ) );
		filelistNoRequire.push( extractModule( filelistRequire, 'awi-memory-awi-error' ) );
		filelistNoRequire.push( extractModule( filelistRequire, 'awi-bubble-awi-error' ) );
		filelistNoRequire.push( extractModule( filelistRequire, 'awi-souvenir-awi-error' ) );
		filelistNoRequire.push( ...filelistRequire );
		filelistNoRequire.push( ...last );
		awi.utilities.saveJSON( destinationPath + '/files.json', filelistNoRequire );
	}
	process.exit();
}

console.log( 'jskfdj ');
startAwi( {
	user: 'francois',
	configurations: 'C:/Awi/configs',
	engine: 'C:/Awi/awi-engine',
	connectors: 
	[
		{ name: 'systems.node', options: {}, default: true },
		{ name: 'utilities.awi', options: {}, default: true },
		{ name: 'servers.node', options: {}, default: true },
		{ name: 'editors.commandline', options: {}, default: true },
		{ name: 'languages.aoz', options: {}, default: true },
		{ name: 'importers.*', options: {} },
	],
} );
