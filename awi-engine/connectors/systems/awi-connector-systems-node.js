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
		this.assetsTypes =
		{
			image: [ '.png', '.jpg', '.jpeg' ],
			sound: [ '.wav', '.mp3', '.ogg' ],
			video: [ '.mp4' ],
			music: [ '.mod' ],
			json: [ '.json' ],
			text: [ '.txt', '*.asc' ],
			document: [ '.docx', '*.doc', '*.rtf' ],
		}
		this.sourceDirectories =
		{
			win32:
			{
				assets: [ '*Desktop', '*Documents', '*Pictures', '*Music', '*Downloads', '*Videos' ],
			}
		};
		try 
		{
			this.tempDirectoryPath = fs.mkdtempSync( ppath.join( os.tmpdir(), 'awi' ) );
		} catch { }
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
		return this.connectAnswer;
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
	async findFile( directories, filename, options )
	{
		var filters;
		var found = [];
		if ( directories == 'executable' )
		{
			var softwares = fetchinstalledsoftware.getAllInstalledSoftwareSync();
			for ( var s = 0; s < softwares.length; s++ )
			{
				var software = softwares[ s ];
				/*
				for ( var p in software )
				{
					if ( software[ p ].toLowerCase().indexOf( filename.toLowerCase() ) >= 0 )
					{
						console.log( software[ p ] );
						break;
					}
				}
				*/
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
			return { success: found.length > 0, data: found };
		}
		if ( typeof options.type != 'undefined' )
		{
			filters = this.getFileFilters( options.type );
			if ( !filters.success )
				return filters;
			filters = filters.data;
		}
		else
		{
			if ( directories[ 0 ].toLowerCase() == filename )
			{
				var info = this.awi.utilities.parse( filename );
				var name = info.name ? info.name : '*';
				var ext = info.ext ? info.ext : '*';
				filters = [ name + ext ];
				directories[ 0 ] = info.dir;
			}
			else
			{
				filters = [ filename ];
			}
		}
		for ( var d = 0; d < directories.length; d++ )
		{
			var answer = await this.awi.system.getDirectory( directories[ d ], { onlyFiles: false, recursive: true, filters: filters } );
			if ( answer.data )
			{
				var files = this.awi.utilities.getFileArrayFromTree( answer.data );
				found.push( ...files );
			}
		}
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
	async playFile( path, type, action, options )
	{
		var stdOut = '';
		var stdErr = '';
		var result;
		var info = this.awi.utilities.parse( path );
		var vars =
		{
			root: info.root,
			dir: info.dir,
			base: info.base,
			ext: info.ext,
			name: info.name,
			file: info.dir + '/' + info.name + info.ext,
		}
		var paths = this.awi.config.getCurrentSystem().paths;
		var pathInfo = paths[ type ];
		if ( pathInfo )
		{
			var actionInfo = pathInfo[ action ];
			if ( actionInfo )
			{
				switch ( actionInfo.type )
				{
					case 'exec':
						var result = false;
						var cwd = this.getPath( actionInfo.cwd, vars );
						var command = this.getPath( actionInfo.command, vars );
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
					case 'startbat':
						var result = false;
						var cwd = this.getPath( actionInfo.cwd, vars );
						var command = this.getPath( actionInfo.command, vars );
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
		}
		return { success: false, error: 'awi:file-cannot-be-played:iwa' };
	}
	getPath( path, vars = {} )
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
						bnreak;
				}
			}
			path = path.substring( 0, start ) + replace + path.substring( end + 1 );
			start = path.indexOf( '{' );
		}
		return ppath.normalize( path );
	}
	getPaths( type, path )
	{
		if ( type == 'any' )
			return [ path ];

		var directories = [];
		var paths = this.awi.config.getCurrentSystem().paths;
		if ( !paths[ type ] )
			type = 'any';
		var typeInfo = paths[ type ];
		for ( var f = 0; f < typeInfo.libraries.length; f++ )
		{
			var path = this.getPath( typeInfo.libraries[ f ] );
			directories.push( path );
		}
		return directories;
	}
	getFileType( path )
	{
		path = this.awi.utilities.normalize( path );
		if ( path.indexOf( '/' ) >= 0 || path.indexOf( ':' ) >= 0 )
			return 'any';

		var ext = this.awi.utilities.extname( path ).toLowerCase();
		if ( !ext )
			return 'any';

		var paths = this.awi.config.getCurrentSystem().paths;
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
		var paths = this.awi.config.getCurrentSystem().paths;
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
}
module.exports.Connector = ConnectorSystemNode;
