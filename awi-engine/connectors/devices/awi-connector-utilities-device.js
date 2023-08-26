/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][   ]       Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_] \     link:
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-connector-utilities-files.js
* @author FL (Francois Lionet)
* @date first pushed on 19/08/2023
* @version 0.3
*
* @short List all the files on the device

*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorUtilitiesDevice extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Device';
		this.token = 'device';
		this.classname = 'utilities';
		this.version = '0.5';
	}
	async connect( options )
	{
		super.connect( options );
	}
}
module.exports.Connector = ConnectorUtilitiesDevice;
