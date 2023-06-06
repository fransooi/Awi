/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][   ]       Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal 
* (_)|____| |____|\__/\__/ [_| |_] \     Assistant
*
* This file is open-source under the conditions contained in the 
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file simple-node-prompt.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Starts Awi as simple command line prompt 
*
*/
var awiawi = require( './awi-engine/awi' );
async function startAwi( prompt, config )
{
	var data = {};
	var awi = new awiawi.Awi( config );
	var answer = await awi.connect( {} );
	if ( answer.success )
	{
		setTimeout( async function()
		{
			await awi.prompt.prompt( prompt, data, { editor: awi.editor.default } );
		}, 1000 )
	}
}

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
		{ name: 'utilities.awi', options: {}, default: true },
		{ name: 'clients.openainode', options: {}, default: true },
		{ name: 'editors.commandline', options: {}, default: true },
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
