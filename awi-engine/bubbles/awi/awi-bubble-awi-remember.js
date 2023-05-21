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
			{ scanLevel: 'depth of the search, 1: direct souvenirs only, 2: indirect souvenirs, 3: deep search', type: 'number', interval: { start: 1, end: 3 }, optional: true, default: '2' },
		];
		this.properties.outputs = [ { memories: 'the list of memories', type: 'string.array' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'memory', 'souvenir', 'bubble' ];
	}
	async play( line, parameters, control )
	{
		var previousLine = line;
		await super.play( line, parameters, control );

		var directSouvenirs = [];
		var indirectSouvenirs = [];
		if ( parameters.kind == 'all' )
		{
			for ( var k in this.awi.memories[ parameters.brain ] )
			{
				if ( k != 'root' && k != 'current' && k != 'error' )
				{
					var answer = await this.awi.memories[ parameters.brain ][ k ].play( previousLine, parameters, { start: 'root', memory: { command: 'findSouvenirs', scanLevel: parameters.scanLevel } } );
					if ( answer.success == 'found' )
					{
						if ( answer.data.directSouvenirs )
							directSouvenirs.push( ...answer.data.directSouvenirs );
						if ( answer.data.indirectSouvenirs )
							indirectSouvenirs.push( ...answer.data.indirectSouvenirs );
					}
				}
			}
		}
		else
		{
			var answer = await this.awi.memories[ parameters.brain ][ parameters.kind ].play( previousLine, parameters, { start: 'root', memory: { command: 'findSouvenirs', scanLevel: parameters.scanLevel } } );
			if ( answer.success == 'found' )
			{
				if ( answer.data.directSouvenirs )
					directSouvenirs.push( ...answer.data.directSouvenirs );
				if ( answer.data.indirectSouvenirs )
					indirectSouvenirs.push( ...answer.data.indirectSouvenirs );
			}
		}
		async function printSouvenirs( memories )
		{
			for ( var l = 0; l < memories.length; l++ )
			{
				var memory = memories[ l ];
				await memory.play( '', {}, { start: 'root', memory: { command: 'printData', scanLevel: parameters.scanLevel } } );
			}
		}
		if ( directSouvenirs.length > 0 )
		{
			this.awi.editor.print( this, 'Found ' + directSouvenirs.length + ' direct souvenir(s).', { user: 'information' } );
			printSouvenirs( directSouvenirs );
		}
		else 
			this.awi.editor.print( this, 'No direct souvenir found.', { user: 'information' } );

		if ( parameters.scanLevel > 1 && indirectSouvenirs.length > 0 )
		{
			this.awi.editor.print( this, 'Found ' + indirectSouvenirs.length + ' indirect souvenir(s).', { user: 'information' } );
			printSouvenirs( indirectSouvenirs );
		}
		else 
			this.awi.editor.print( this, 'No indirect souvenir found.', { user: 'information' } );

		return { success: 'success', data: answer.data }
	}
	async playback( line, parameters, control )
	{
		return await super.playback( line, parameters, control );		
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
}
module.exports.Bubble = BubbleAwiRemember;
