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
* @file awi-aozruntime-server.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Starts Awi as server for Aoz Studio runtime
*
*/
var awiawi = require( './awi-engine/awi' );
async function startAwi( userConfig )
{
	var awi = new awiawi.Awi( userConfig );
	var answer = await awi.connect( {} );
	if ( answer.success )
	{
		console.log( 'Waiting for connection...')
	}
}
startAwi( 
{ 
	user: 'awi',
	configurations: 'C:/Awi/configs',
	engine: 'C:/Awi/awi-engine',
	data: 'C:/Awi/data',
	connectors: 
	[
		{ name: 'systems.node', options: {}, default: true },
		{ name: 'utilities.awi', options: {}, default: true },
		{ name: 'servers.node', options: {}, default: true },
		{ name: 'editors.aoz', options: {}, default: true },
		{ name: 'languages.aoz', options: {}, default: true },
		{ name: 'importers.*', options: {} },
	],
} );
