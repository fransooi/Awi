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
* @file awi-connector-languages-python.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Connector to Python
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorLanguagePython extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Python';
		this.token = 'python';
		this.classname = 'language';
		this.version = '0.2';
	}
	async connect( options )
	{
		return super.connect( options );
	}	
	extractTokens( source, callback, extra )
	{

	}
	close()
	{

	}
}
module.exports.Connector = ConnectorLanguagePython;
