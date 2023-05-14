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
* @file awi-bubble-awi-remember.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Remember command: dig a specific topid out of the memory
*
*/
var awibubbles = require( '../awi-bubbles' )

class BubbleAwiRemember extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Remember Action Bubble';
		this.token = 'remember';
		this.classname = 'awi';
		this.properties.action = 'recall all memories about a subject';
		this.properties.inputs = [ 
			{ userInput: 'the subject or person to remember', type: 'string', optional: true, default: '' },
			{ kind: 'what kind of things to remember', type: 'string', optional: true, default: 'all' },
			{ brain: 'brain to take memories from', type: 'string', optional: true, default: 'awi' },
		];
		this.properties.outputs = [ { memories: 'the list of memories', type: 'string.array' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'memory', 'souvenir', 'bubble' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );

		var memories = [];
		if ( parameters.kind == 'all' )
		{
			for ( var k in this.awi.memories[ parameters.brain ] )
			{
				if ( k != 'root' && k != 'current' && k != 'error' )
				{
					var answer = await this.awi.memories[ parameters.brain ][ k ].play( parameters.userInput, parameters );
					if ( answer.success )
					{
						memories.push( ...answer.data );
					}
				}
			}
		}
		else
		{
			var answer = await this.awi.memories[ parameters.brain ][ parameters.kind ].play( parameters.userInput, parameters );
			if ( answer.success )
			{
				memories.push( ...answer.data );
			}
		}
		if ( memories.length > 0 )
		{
			this.awi.editor.print( this, 'I have found ' + memories.length + ' memories(s).', { user: 'information' } );
			this.awi.editor.print( this, 'Memorizing...', { user: 'information' } );
			return { success: true, data: data }
		}
		this.awi.editor.print( this, [ 'I have no memories about this topic...' ], { user: 'information' } );
		this.awi.editor.print( this, [ 'Please type "help digest" for information on how to import your own data into Awi...' ], { user: 'information' } );
		this.awi.editor.print( this, [ 'Help digest' ], { user: 'command' } );
		return { success: false, error: 'awi:no-memories:iwa' }
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
	async undo( options )
	{
		super.undo( options );
	}
	async redo( options )
	{
		super.redo( options );
	}
}
module.exports.Bubble = BubbleAwiRemember;
