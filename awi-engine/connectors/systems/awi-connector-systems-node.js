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
* @file awi-connector-systems-node.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Connector to Node
*/
var awiconnector = require( '../awi-connector' );
const fs = require( 'fs' );
const ppath = require( 'path' );
const hjson = require( 'hjson' );
const { exec, spawn, execFile } = require( 'child_process' );
const fetchinstalledsoftware = require( 'fetch-installed-software' )
const { promisify } = require( 'util' );
const regedit = require( 'regedit' );
const os = require( 'os' );
const he = require( 'he' );
const extractaudio = require( 'ffmpeg-extract-audio' );
const sha1 = require('sha1');

class ConnectorSystemNode extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Node';
		this.token = 'node';
		this.classname = 'system';
		this.version = '0.2';
		this.rootPath = '';
		this.getAssociation = promisify( regedit.list );
		this.assetTypes =
		{
			image: { names: [ 'image', 'photo', 'drawing', 'painting', 'sketch' ], filters: [ '*.png', '*.jpg', '*.jpeg', '*.gif', '*.psd', '*.psp', '*.webm' ], paths: [] },
			sound: { names: [ 'sound', 'audio', 'sample', 'wave' ], filters: [ '*.wav', '*.mp3', '*.ogg' ], paths: [] },
			video: { names: [ 'video', 'clip', 'film', 'movie' ], filters: [ '*.mp4', '*.ogg', '*.avi' ], paths: [] },
			music: { names: [ 'music', 'midi', 'module', 'tracker' ], filters: [ '*.mp3', '*.ogg', '*.flac', '*.mod' ], paths: [] },
			json: { names: [ 'json' ], filters: [ '*.json' ], paths: [] },
			document: { names: [ 'document', 'text', 'letter' ], filters: [ '*.docx', '*.doc', '*.rtf', '*.txt', '*.asc' ], paths: [] },
			presentation: { names: [ 'presentation', 'slides' ], filters: [ '*.pptx', '*.ppt' ], paths: [] },
			source: { names: [ 'source' ], filters: [ '*.js', '*.ts', '*.py', '*.c', '*.cpp', '*.h', '*.cs' ], paths: [] },
			application: { names: [ 'application', 'executable', 'program', 'app' ], filters: [ '*.exe' ], paths: [] },
			aozaccessory: { names: [ 'aozaccessory', 'accessory' ], filters: [ '*.aozacc' ], paths: [] },
			file: { names: [ 'file' ], filters: [ '*.*' ], paths: [] },
		}
	}
	quit()
	{
		if ( this.tempDirectoryPath )
			awi.utilities.deleteDirectory( this.tempDirectoryPath, { recursive: true, keepRoot: false } );
		process.exit( 0 );
	}
	async connect( options )
	{
		super.connect( options );
		this.connectAnswer.success = true;
		this.connectAnswer.data.token = this.classname;
		return this.connectAnswer;
	}
	async getAssetType( names )
	{
		if ( typeof names == 'undefined' || names.length == 0 )
			return null;

		if ( typeof names == 'string' )
		{
			var found = this.awi.parser.findWordDefinition( this.assetTypes.names, name, 'find' );;
			if ( found )
				return this.assetTypes[ names ];
			for ( var s in this.assetTypes )
			{
				found = this.assetTypes[ s ].filters.findIndex(
					function( element )
					{
						var filter = element.substring( element.lastIndexOf( '.' ) );
						return ( names.indexOf( filter ) >= 0 );
					} );
				if ( found >= 0 )
					result.push( this.assetTypes[ found ] );
			}
			return null;
		}
		for ( var s in this.assetTypes )
		{
			var assetType = this.assetTypes[ s ];
			for ( var n = 0; n < names.length; n++ )
			{
				var found = this.awi.parser.findWordDefinition( assetType.names, names[ n ], 'find' );;
				if ( found )
					return assetType;
				var dot = names[ n ].lastIndexOf( '.' );
				if ( dot >= 0 )
				{
				var ext = names[ n ].substring( names[ n ].lastIndexOf( '.' ) );
				var found = assetType.filters.findIndex(
					function( element )
					{
						var filter = element.substring( element.lastIndexOf( '.' ) );
						return ( filter.indexOf( ext ) >= 0 );
					} );
					if ( found >= 0 )
				return assetType;
			}
		}
		}
		return null;
	}
	async getDirectory( path, options )
	{
		var self = this;
		async function getDir( path, options, parent )
		{
			var result = [];
			path = self.awi.utilities.normalize( path );

			var answer = await self.readdir( path + '/' );
			if ( !answer.success )
				return null;
			var files = answer.data;
			if ( files )
			{
				for ( var f = 0; f < files.length; f++ )
				{
					var sPath = path + '/' + files[ f ];
					var stats = await self.stat( sPath );
					if ( stats.data )
					{
						stats = stats.data;
						if ( !stats.isDirectory() )
						{
							if ( !options.excludes || ( options.excludes && !self.filterFilename( sPath, options.excludes ) ) )
							{
								if ( !options.filters || ( options.filters && self.awi.utilities.filterFilename( sPath, options.filters ) ) )
								{
									result.push(
									{
										name: files[ f ],
										path: sPath,
										isDirectory: false,
										size: stats.size,
										stats: stats,
										parent: parent
									} );
								}
							}
						}
						else
						{
							if ( options.recursive )
							{
								var newFile =
								{
									name: files[ f ],
									path: sPath,
									isDirectory: true,
									files: null,
									parent: parent
								};
								var newResult = await getDir( sPath, options, newFile );
								if ( !options.onlyFiles )
								{
									newFile.files = newResult;
									result.push( newFile );
								}
								else if ( newResult.length > 0 )
									result.push( newResult );
							}
							else
							{
								if ( !options.onlyFiles )
								{
									result.push(
									{
										name: files[ f ],
										path: sPath,
										isDirectory: true,
										files: [],
										parent: parent
									} );
								}
							}
						}
					}
				}
			}
			return result;
		}
		var tree = await getDir( path, options );
		if ( tree )
			return { success: true, data: tree };
		return { success: false, error: 'awi:directory-not-found:iwa' };
	}
	async getApplications( file )
	{
		var softwares = fetchinstalledsoftware.getAllInstalledSoftwareSync();
		for ( var s = 0; s < softwares.length; s++ )
		{
			var software = softwares[ s ];
			if ( typeof software.DisplayIcon != 'undefined' )
			{
				var path = this.awi.utilities.normalize( software.DisplayIcon );
				if ( path.toLowerCase().indexOf( filename.toLowerCase() ) >= 0 )
				{
					var ext = this.awi.utilities.extname( path ).substring( 1 ).toLowerCase();
					if ( this.getFileType( ext, 'executable' ).success )
					{
						var file = await this.awi.utilities.getFileInfo( path );
						if ( file )
							found.push( file );
					}
				}
			}
		}
	}
	async askForFilepaths( file, parameters, control )
	{
		var paths = await this.awi.config.getDefaultPaths( file );
		this.awi.config.getConfig( 'user' ).paths = paths;
		file.paths = paths[ this.awi.config.platform ][ file.names[ 0 ] ];
		/*
		var param = await this.awi.prompt.getParameters( [
			{ choice: 'the different paths to the folder containing ' + file.names[ 0 ] + 's.', type: 'array.string', default: [ paths[ 0 ] ] },
			], control );
		if ( param.success )
		{
			file.paths = param.data.choice;
			this.awi.config.getConfig( 'user' ).paths[ this.awi.config.platform ][ file.names[ 0 ] ] = param.data.choice;
		}
		*/
	}
	async findFiles( line, parameters, control )
	{
		var found = [];
		var file = parameters.file;
		switch ( file.names[ 0 ] )
		{
			case 'application':
				found = await this.getApplications( line, parameters, control );
				break;
			case 'aozaccessory':
				found = await this.connectors.languages.aozbasic.getAccessories( line, parameters, control );
				break;
			default:
				if ( file.paths.length == 0 )
					await this.askForFilepaths( file, parameters, control );
				if ( file.paths.length )
				{
					for ( var p = 0; p < file.paths.length; p++ )
					{
						var answer = await this.awi.system.getDirectory( file.paths[ p ], { onlyFiles: false, recursive: true, filters: file.filters } );
						if ( answer.data )
							found.push( ...this.awi.utilities.getFileArrayFromTree( answer.data ) );
					}
				}
				break;
		}
		if ( typeof parameters.date != 'undefined' && parameters.date.length )
		{
			var newFound = [];
			for ( var f = 0; f < found.length; f++ )
			{
				var file = found[ f ];
				for ( var d = 0; d < parameters.date.length; d++ )
				{
					if ( this.awi.time.isStatsWithinDate( file.stats, parameters.date[ d ] ) )
						newFound.push( file );
				}
			}
			found = newFound;
		}
		if ( typeof parameters.time != 'undefined' && parameters.time.length )
		{
			var newFound = [];
			for ( var f = 0; f < found.length; f++ )
			{
				var file = found[ f ];
				for ( var d = 0; d < parameters.time.length; d++ )
				{
					if ( this.awi.time.isStatsWithinDate( file.stats, parameters.time ) )
						newFound.push( file );
				}
			}
			found = newFound;
		}
		for ( var f = 0; f < found.length; f++ )
			found[ f ].file = file;
		file.list = found;
		if ( found.length == 0 )
			return { success: false, error: 'awi:file-not-found:iwa' };
		if ( found.length == 1 )
			return { success: '1', data: found };
		return { success: true, data: found };
	}
	async importFile( bubble, file, options = {} )
	{
		var ext, path;
		if ( typeof file != 'string' )
			path = this.awi.utilities.normalize( file.path );
		else
			path = file;
		if ( !options.toAssets )
		{
			ext = this.awi.utilities.extname( path ).toLowerCase().substring( 1 );
			if ( ext == '' || !this.types[ ext ] )
			{
				this.print( bubble, [ 'Cannot import the file...' ] );
				return false;
			}
		}
		else
			ext = '_assets_';
		var exist;
		var count = 0;
		var destinationPath;
		do
		{
			destinationPath = this.awi.utilities.normalize( this.awi.utilities.dirname( this.awi.system.getPath() ) + this.types[ ext ].importTo[ count ] );
			var answer = await this.awi.system.exists( destinationPath );
			if ( answer.success )
			{
				exist = true;
				break;
			}
			count++;
		} while ( count < this.types[ ext ].importTo.length  )
		if ( !exist )
		{
			if ( !options.noErrors )
				this.print( bubble, [ 'awi:directory-not-found:iwa' ] );
			return false;
		}
		var answer = await this.awi.system.copyFile( path, this.awi.utilities.normalize( destinationPath + '/' + this.awi.utilities.basename( path ) ) );
		if ( !answer.error )
		{
			if ( !options.noErrors )
				this.print( bubble, answer.data );
			return false;
		}
		var result = 'File imported successfully.' + this.types[ ext ].displayName;
		this.print( bubble, [ result ] );
		return true;
	}
	getVarsPath( path, vars = {} )
	{
		var start = path.indexOf( '{' );
		while( start >= 0 )
		{
			var replace = '';
			var end = path.indexOf( '}', start );
			var token = path.substring( start + 1, end );
			if ( vars[ token ] )
				replace = vars[ token ];
			else
			{
				switch ( token )
				{
					default:
						replace = '';
						break;
				}
			}
			path = path.substring( 0, start ) + replace + path.substring( end + 1 );
			start = path.indexOf( '{' );
		}
		return ppath.normalize( path );
	}
	async playFile( file, action, control )
	{
		var stdOut = '';
		var stdErr = '';
		var info = this.awi.utilities.parse( file.path );
		var vars =
		{
			root: info.root,
			dir: info.dir,
			base: info.base,
			ext: info.ext,
			name: info.name,
			file: info.dir + '/' + info.name + info.ext,
		}
		var runInfo = this.awi.config.getSystem().commands[ this.awi.config.platform ];
		var actionInfo = runInfo[ file.file.names[ 0 ] ];
		if ( actionInfo )
		{
			actionInfo = actionInfo[ action ];
			switch ( actionInfo.type )
			{
				case 'exec':
					var result = false;
					var cwd = this.getVarsPath( actionInfo.cwd, vars );
					var command = this.getVarsPath( actionInfo.command, vars );
					var process = exec( command, { cwd: cwd },
						function( error, stdo, stde )
						{
							if ( !error )
							{
								result = true;
								if ( stde )
									stdErr += stde;
								if ( stdo )
									stdOut += stdo;
							}
							else
								result = false;
						} );
					if ( process )
						return { success: true, data: {} };
					break;

				case 'startbat':
					var result = false;
					var cwd = this.getVarsPath( actionInfo.cwd, vars );
					var command = this.getVarsPath( actionInfo.command, vars );
					command = ppath.normalize( this.awi.config.getDataPath() + '/start.bat ' + command );
					console.log( 'command: ' + command );
					console.log( 'cwd: ' + cwd );
					var process = exec( command, { cwd: cwd },
						function( error, stdo, stde )
						{
							if ( !error )
							{
								result = true;
								if ( stde )
									stdErr += stde;
								if ( stdo )
									stdOut += stdo;
							}
							else
								result = false;
						} );
					if ( process )
						return { success: true, data: path };
					break;

				default:
					break;
			}
		}
		return { success: false, error: 'awi:file-cannot-be-played:iwa' };
	}
	async getPaths( file )
	{
		if ( this.awi.config.getConfig( 'user' ).paths[ this.awi.config.platform ] )
			return this.awi.config.getConfig( 'user' ).paths[ this.awi.config.platform ][ file.names[ 0 ] ];
		return [];
	}
	getFileType( path )
	{
		path = this.awi.utilities.normalize( path );
		if ( path.indexOf( '/' ) >= 0 || path.indexOf( ':' ) >= 0 )
			return 'any';

		var ext = this.awi.utilities.extname( path ).toLowerCase();
		if ( !ext )
			return 'any';

		var paths = this.awi.config.system.paths;
		for ( var t in paths )
		{
			var typeInfo = paths[ t ];
			for ( var f = 0; f < typeInfo.filters.length; f++ )
			{
				var filter = typeInfo.filters[ f ].toLowerCase();
				if ( filter.indexOf( ext ) >= 0 )
				{
					return t;
				}
			}
		}
		return 'any';
	}
	getFileFilters( type )
	{
		var paths = this.awi.config.system.paths;
		if ( paths[ type ] )
			return paths[ type ].filters;
		return paths[ 'any' ].extensions;
	}
	isFileOfType( path, type )
	{
		return type = this.getFileType( path );
	}
	async extractAudio( sourcePath, destinationPath, options = {} )
	{
		try
		{
			options.input = sourcePath;
			options.output = destinationPath;
			await extractaudio( options );
			return { success: true, data: destinationPath };
		}
		catch( e )
		{
			return { success: false, data: 'awi:error-while-extracting-audio:iwa' };
		}
	}
	async runAccessory( path, options )
	{
		return { success: false, error: 'awi:no-accessories-on-this-system:iwas' };
	}
	async getAccessoryList( path, options )
	{
		return { success: false, error: 'awi:no-accessories-on-this-system:iwas' };
	}
	async readFile( path, options )
	{
		try
		{
			return { success: true, data: fs.readFileSync( path, options ) };
		}
		catch( e )
		{
			return { success: false, error: 'awi:file-not-found:iwa' };
		}
	}
	async writeFile( path, data, options )
	{
		try
		{
			return { success: true, data: fs.writeFileSync( path, data, options ) };
		}
		catch( e )
		{
			return { success: false, error: 'awi:cannot-write-file:iwa' };
		}
	}
	async copyFile( sourcePath, destinationPath, options )
	{
		try
		{
			return { success: true, data: fs.copyFileSync( sourcePath, destinationPath, options ) };
		}
		catch
		{
			return { success: false, error: 'awi:cannot-copy-file:iwa' };
		}
	}
	async readdir( path )
	{
		try
		{
			return { success: true, data: fs.readdirSync( path ) };
		}
		catch( e )
		{
			return { success: false, error: 'awi:cannot-read-directory:iwa' };
		}
	}
	async unlink( path)
	{
		try
		{
			return { success: true, data: fs.unlinkSync( path ) };
		}
		catch
		{
			return { success: false, error: 'awi:cannot-delete-file:iwa' };
		}
	}
	async rmdir( path, options )
	{
		try
		{
			return { success: true, data: fs.rmdirSync( path, options ) };
		}
		catch
		{
			return { success: false, error: 'awi:cannot-delete-directory:iwa' };
		}
	}
	async stat( path )
	{
		try
		{
			return { success: true, data: fs.statSync( path ) };
		}
		catch
		{
			return { success: false, error: 'awi:file-not-found:iwa' };
		}
	}
	async exists( path )
	{
		return { success: fs.existsSync( path ), data: {} };
	}
	async getTempPath( base, extension )
	{
		while( true )
		{
			var name = base + '_' + Math.floor( Math.random() * 100000 ) + '.' + extension;
			var path = this.awi.utilities.normalize( this.tempDirectoryPath + '/' + name );
			var answer = await this.exists( path );
			if ( !answer.success )
				return path;
		}
	}
	hJsonParse( hjsonString )
	{
		try
		{
			return { success: true, data: hjson.parse( hjsonString ) };
		}
		catch
		{
			return { success: false, error: 'awi:illegal-hjson:iwa' };
		}
	}
	hJsonStringify( obj )
	{
		try
		{
			return { success: true, data: hjson.stringify( obj ) };
		}
		catch
		{
			return { success: false, error: 'awi:illegal-hjson:iwa' };
		}
	}
	jsonParse( hjsonString )
	{
		try
		{
			return { success: true, data: JSON.parse( hjsonString ) };
		}
		catch
		{
			return { success: false, error: 'awi:illegal-json:iwa' };
		}
	}
	jsonStringify( obj )
	{
		try
		{
			return { success: true, data: JSON.stringify( obj ) };
		}
		catch
		{
			return { success: false, error: 'awi:illegal-hjson:iwa' };
		}
	}
	decodeText( text )
	{
		text = he.decode( text );
		text = he.unescape( text );
		return text;
	}
	async getSystemInformation( type )
	{
		switch ( type )
		{
			case 'platform':
				return os.platform();
			case 'userDir':
				return this.awi.utilities.normalize( os.homedir() );
			case 'userName':
				return os.userInfo().username;
			case 'drives':
				var list = [];
				if ( os.platform == 'win32' )
				{
					for ( var l = 0; l < 26; l++ )
					{
						var answer = await this.exists( String.fromCharCode( 65 + l ) + ':' );
						if ( answer.success )
							list.push( String.fromCharCode( 65 + l ) );
					}
				}
				return list;
		}
	}
	toSha1( object )
	{
		return sha1( object );
	}
}
module.exports.Connector = ConnectorSystemNode;
