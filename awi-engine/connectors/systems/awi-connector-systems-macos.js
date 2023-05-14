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
* @file awi-connector-systems-macos.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Connector to macOS
*/
var awiconnector = require( '../awi-connector' );

class ConnectorSystemMacos extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'macos';
		this.token = 'macOs';
		this.classname = 'system';
		this.version = '0.2';
	}
	close()
	{

	}
	async connect( options )
	{
		return super.connect( options );
	}
	s( path, options )
	{

	}
	readFile( path, options )
	{

	}
	writeFile( path, options )
	{

	}
	copyFile( path, options )
	{

	}
	readdir( path, options )
	{

	}
	unLink( path, options )
	{

	}
	rmdir( path, options )
	{

	}
	stat( path )
	{

	}
	exists( path )
	{

	}
}
module.exports.Connector = ConnectorSystemMacos;
