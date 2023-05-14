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
* @file awi-connector-systems-aozruntime.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Connector to Aoz runtime
*/
var awiconnector = require( '../awi-connector' )

class ConnectorSystemAozRuntime extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.aoz = awi.host;
		this.name = 'Aoz Runtime';
		this.token = 'aozruntime';
		this.classname = 'system';
		this.version = '0.2';
		this.connected = false;
		this.commandComplete = false;
		this.commandAnswer = null;
		this.directories = [ 'drive', 'applications', 'tutorials', 'games', 'demos' ];		
		/*
		this.awi.config.getEnginePath =
			function()
			{
				return 'http://run/awi-engine';
			}
		this.awi.config.getConfigurationPath =
			function()
			{
				return 'application:';
			}
		*/
	}
	async connect( options )
	{
		super.connect( options );
		this.connected = true;
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}
	async waitForCommandEnd()
	{
		var self = this;
		return new Promise( ( resolve ) => 
		{
			const checkCompletion = () => 
			{
				var handle = setInterval( function()
				{
					if ( self.commandAnswer )
					{
						clearInterval( handle );
						resolve( self.commandAnswer );
					}
				}, 10 );
			};
			checkCompletion();
		} );
	}
	async findFile( path, options )
	{
		debugger;
	}
	async readFile( path, options )
	{
		var self = this;
		var opts = {};
		if ( typeof options.encoding == 'utf8' )
			opts.encoding = 'utf8';
		var descriptor = this.aoz.filesystem.getFile( path, { mustExist: true } );
		this.aoz.filesystem.loadFile( descriptor, opts, 
			function( response, data )
			{
				if ( response )
				{
					self.commandAnswer = { success: true, data: data };
				}
				else
				{
					self.commandAnswer = { success: false, error: 'awi:file-not-found:iwa' };
				}
			} );
		return await this.waitForCommandEnd();
	}
	async writeFile( path, data, options )
	{
		var self = this;
		var descriptor = this.aoz.filesystem.getFile( path, { mustExist: false } );
		this.aoz.filesystem.saveFile( descriptor, data, { encoding: options.encoding }, 
			function( response, data )
			{
				if ( response )
				{
					self.commandAnswer = { success: true, data: {} };
				}
				else
				{
					self.commandAnswer = { success: false, error: 'awi:file-not-found:iwa' };
				}
			} );
		return await this.waitForCommandEnd();
	}
	async copyFile( sourcePath, destinationPath, ptions )
	{
		var self = this;
		var descriptor = this.aoz.filesystem.getFile( sourcePath, { mustExist: true } );
		this.aoz.filesystem.loadFile( descriptor, {},
			function( response, data )
			{
				if ( response )
				{
					descriptor = self.aoz.filesystem.getFile( destinationPath, { mustExist: false } );
					self.aoz.filesystem.saveFile( descriptor, data, {}, 
						function( response )
						{
							if ( response )
							{
								self.commandAnswer = { success: true, data: {} };
							}
							else
							{
								self.commandAnswer = { success: false, error: 'awi:cannot-copy-file:iwa' };
							}
						} );
				}
				else
				{
					self.commandAnswer = { success: false, error: 'awi:file-not-found:iwa' };
				}
			} );
		return await this.waitForCommandEnd();
	}
	async getDirectory( path, options )
	{
		var tree = this.aoz.system.getDirectory( path, options );
		if ( tree )
			return { asnwer: true, data: tree };
		return { asnwer: false, error: 'awi:directory-not-found:iwa' };
	}
	async importFile( bubble, file, options = {} )
	{
	}
	getPaths( type )
	{
		var newDirectories = [];
		return { success: true, data: newDirectories };
	}
	async run( path, options )
	{
		return { success: false, error: 'awi:not-implemented:iwa' };
	}
	async runAccessory( path, options )
	{
		return { success: false, error: 'awi:no-accessories-on-this-system:iwas' };
	}
	async getAccessoryList( path, options )
	{	
		return { success: false, error: 'awi:no-accessories-on-this-system:iwas' };
	}
	async readdir( path, options )
	{
		debugger;
	}
	async unLink( path, options )
	{
		return { success: false, error: 'awi:cannot-access-filesystem:iwa' };
	}
	async rmdir( path, options )
	{
		return { success: false, error: 'awi:cannot-access-filesystem:iwa' };
	}
	async stat( path )
	{
		var self = this;
		var descriptor = this.aoz.filesystem.getFile( path, { mustExist: true } );
		this.aoz.filesystem.stat( descriptor, {}, 
			function( response, data )
			{
				if ( response )
				{
					self.commandAnswer = { success: true, data: data };
				}
				else
				{
					self.commandAnswer = { success: false, error: 'awi:file-not-found:iwa' };
				}
			} );
		return await this.waitForCommandEnd();
	}
	async exists( path )
	{
		var self = this;
		var descriptor = this.aoz.filesystem.getFile( path, { mustExist: true } );
		this.aoz.filesystem.exist( descriptor, {}, 
			function( response, data )
			{
				if ( response )
				{
					self.commandAnswer = { success: true, data: data };
				}
				else
				{
					self.commandAnswer = { success: false, error: 'awi:file-not-found:iwa' };
				}
			} );
		return await this.waitForCommandEnd();
	}
	hJsonParse( hjsonString )
	{
		try
		{
			return { success: true, data: JSON.parse( hjsonString ) };
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
			return { success: true, data: JSON.stringify( obj ) };
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
module.exports.Connector = ConnectorSystemAozRuntime;
