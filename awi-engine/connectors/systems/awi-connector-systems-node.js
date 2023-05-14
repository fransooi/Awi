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
* @file awi-connector-systems-node.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
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
	}
	close()
	{

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
					if ( software.DisplayIcon.toLowerCase().indexOf( filename.toLowerCase() ) >= 0 )
					{
						var file = await this.awi.utilities.getFileInfo( this.awi.utilities.normalize( software.DisplayIcon ) );
						if ( file.data )
							found.push( file.data );
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
			filters = [ filename ];
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
	async playFile( path, options )
	{
		var stdOut = '';
		var stdErr = '';
		var result;
		var exe = '""';
		var ext = this.awi.utilities.extname( path ).toLowerCase();
		if ( ext == '.mp3' || ext == '2.ogg' || ext == '.wav' )
			exe = 'wmplayer.exe';
		var execOptions = { cwd: ppath.normalize( this.awi.utilities.parse( path ).dir ) };
		var command = 'start ' + exe + ' "' + ppath.normalize( path ) + '"';
		var process = exec( command, execOptions, 
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
			return { success: true, data: process };
		return { success: false, error: 'awi:file-cannot-be-played:iwa' };
	}
	getPaths( type )
	{
		var newDirectories = [];
		var paths = this.awi.getConfig( 'user' ).paths;
		var machine = this.sourceDirectories[ os.platform() ];
		if ( machine[ type ] )
		{
			var homedir = this.awi.utilities.normalize( os.homedir() );
			var list = machine[ type ];
			for ( var d = 0; d < list.length; d++ )
			{
				if ( list[ d ].charAt( 0 ) == '*' )
				{
					newDirectories.push( homedir + '/' + list[ d ].substring( 1 ) );
				}
			}	
		}
		return { success: true, data: newDirectories };
	}
	async getFileAssociation( extension )
	{
		const associationKey = `HKCR\\${extension}`;
		const associationResult = await this.getAssociation([associationKey]);

		if ( associationResult[ associationKey ] ) 
		{
			const fileClass = associationResult[ associationKey ].values[ '' ];
			const fileClassKey = `HKCR\\${fileClass}`;
			const fileClassResult = await this.getAssociation( [ fileClassKey ] );

			if ( fileClassResult[ fileClassKey ] ) 
			{
				const openCommand = fileClassResult[ fileClassKey ].values[ '\\shell\\open\\command\\' ];
				const applicationPath = openCommand.split( '"' )[ 1 ];
				return { success: true, data: applicationPath };
			}
		}
		return { asnwer: false, error: 'awi:no-file-association-found:iwa' };
	}
	getFileType( ext )
	{
		ext = ext.toLowerCase();
		switch ( type )
		{
			case 'executable':
				return { success: ext == 'exe', data: 'executable' };
			case 'assets':
				var assets = [];
				for ( var a in this.assetsTypes )
					assets.push( ... this.assetsTypes[ a ] );
				return { success: true, data: assets };
			default:
				var assets = [];
				for ( var a in this.assetsTypes )
				{
					var found = this.assetsTypes.find( ext, 
						function( element )
						{
							return element == ext;
						} );
					if ( found )
						assets.push( ... found );
				}
				return { success: found.length > 0, data: assets };				
		}
	}
	getFileFilters( type )
	{
		switch ( type )
		{
			case 'executable':
				return { success: true, data: [ '*.exe' ] };
			case 'assets':
				var newAssets = [];
				var types = this.getFileType( type ).data;
				for ( var t = 0; t < types.length; t++ )
				{
					newAssets.push( '*.' + types[ t ] );
				}
				return { success: true, data: this.assetsTypes };
			default:
				return { success: false, error: 'awi:no-executable-files-on-this-system:iwas' };
		}
	}
	async run( path, options )
	{
		var stdOut = '';
		var stdErr = '';
		var result;
		var execOptions = { cwd: ppath.normalize( this.awi.utilities.parse( path ).dir ) };
		var command = ppath.normalize( path ) + options.commandLine;
		var process = execFile( command, execOptions, 
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
			return { success: true, data: process };
		return { success: false, error: 'awi:file-cannot-be-executed:iwa' };
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
}
module.exports.Connector = ConnectorSystemNode;
