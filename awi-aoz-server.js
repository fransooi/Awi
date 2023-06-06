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
* @version 0.3
*
* @short Starts Awi as server for Aoz Studio runtime
*
*/
var awiawi = require( './awi-engine/awi' );
async function startAwi( prompt, config )
{
	var awi = new awiawi.Awi( config );
	var answer = await awi.connect( {} );
	if ( answer.success )
	{
		console.log( 'Waiting for connection...' );
	}
}
var thispath = __dirname;
startAwi( '', {
	prompt: '',
	configurations: thispath + '/configs',
	engine: thispath + '/awi-engine',
	data: thispath + '/data',
	connectors:
	[
		{ name: 'systems.node', options: {}, default: true },
		{ name: 'utilities.awi', options: {}, default: true },
		{ name: 'clients.openainode', options: {}, default: true },
		{ name: 'servers.editor', options: {}, default: true },
		{ name: 'languages.javascript', options: {}, default: true },
		{ name: 'importers.*', options: {} },
	], } );
