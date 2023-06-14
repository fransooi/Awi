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
* @file awi-connector-systems-iphone.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Connector to iPhone
*/
var awiconnector = require( '../awi-connector' );

class ConnectorSystemIPhone extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'iPhone';
		this.token = 'iphone';
		this.classname = 'system';
		this.version = '0.2';
	}
	close()
	{

	}
	async connect( options )
	{
		super.connect( options );
		this.connectAnswer.data.token = this.classname;
		return this.connectAnswer;
	}
	findFile( path, options )
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
module.exports.Connector = ConnectorSystemIPhone;
