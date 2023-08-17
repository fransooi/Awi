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
function getArguments()
{
	var thispath = __dirname;
	var answer =
	{
		config:
		{
	prompt: '',
	configurations: thispath + '/configs',
	engine: thispath + '/awi-engine',
	data: thispath + '/data',
	connectors:
	[
		{ name: 'systems.node', options: {}, default: true },
				{ name: 'utilities.utilities', options: {}, default: true },
				{ name: 'utilities.time', options: {}, default: true },
				{ name: 'utilities.parser', options: {}, default: true },
		{ name: 'clients.openainode', options: {}, default: true },
		{ name: 'servers.editor', options: {}, default: true },
		{ name: 'languages.javascript', options: {}, default: true },
		{ name: 'importers.*', options: {} },
			],
		},
		prompt: ''
	};

	var error = false;
	var quit = false;
	for ( var a = 2; ( a < process.argv.length ) && !quit && !error; a++ )
	{
		var command = process.argv[ a ].toLowerCase();

		var pos;
		if( ( pos = command.indexOf( '--configurations=' ) ) >= 0 )
		{
			answer.config.configurations = command.substring( pos, command.length );
		}
		else if( ( pos = command.indexOf( '--engine=' ) ) >= 0 )
		{
			answer.config.engine = command.substring( pos, command.length );
		}
		else if( ( pos = command.indexOf( '--data=' ) ) >= 0 )
		{
			answer.config.data = command.substring( pos, command.length );
		}
		else if ( !error )
		{
			if ( answer.prompt.length > 0 )
				answer.prompt += ' ';
			answer.prompt += command;
		}
	}
	return { success: !error, data: answer };
};

var answer = getArguments();
if ( answer.success )
{
	startAwi( answer.data.prompt, answer.data.config );
}
