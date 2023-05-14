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
* @file awi-bubble-awi-input.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Input command: input missing parameters 
*
*/
var awibubbles = require( '../awi-bubbles' )

class BubbleAwiInput extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Input';
		this.token = 'input';
		this.classname = 'awi';
		this.properties.action = 'ask the user for input';
		this.properties.inputs = [ { inputInfo: 'information on the data to input', type: 'array' } ];
		this.properties.outputs = [];
		this.properties.brackets = false;
		this.properties.tags = [ 'awi', 'user', 'input' ];
	}
	async getParameters( parameters, data, control = {} )
	{
		var data = {};
		for ( var p = 0 ; p < parameters.length; p++ )
		{
			var bubble = this.bubl.newBubble( { token: 'input', classname: 'awi', parameters: {}, exits: [] }, [], control );
			var parameter = { inputInfo: this.awi.utilities.getBubbleParams( parameters[ p ] ) };
			var answer = await bubble.play( '', parameter, control );
			if ( !answer.success )
				return answer;
		}
		return { success: true, data: data };
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var self = this;
		var description = parameters.inputInfo.description.charAt( 0 ).toLowerCase() + parameters.inputInfo.description.substring( 1 );
		this.properties.outputs[ 0 ] = {};
		this.properties.outputs[ 0 ][ parameters.inputInfo.name ] = description;
		this.properties.outputs[ 0 ].type = parameters.inputInfo.type;
		this.awi.editor.print( this, [ this.awi.utilities.capitalize( description ) ], { user: 'question' } );
		
		var result;
		var self = this;
		this.awi.editor.rerouteInput( 
			function( line )
			{
				var start = 0;
				var c = self.awi.utilities.getCharacterType( line.charAt( start ) );
				while( c != 'letter' && c != 'number' )
				{
					start++;
					c = self.awi.utilities.getCharacterType( line.charAt( start ) );
				}
				line = line.substring( start );
				if ( parameters.inputInfo.type == 'number' )
				{
					var number = parseInt( line );
					if ( !isNaN( number ) )
					{
						var interval = parameters.inputInfo.interval;
						if ( interval )
						{
							if ( number < interval.start || number < interval.end )
							{
								self.awi.editor.print( this, [ 'Please enter a number between ' + interval.start + ' and ' + interval.end + '...' ], { user: 'information' } );
								return;
							}
						}
						result = number;
					}
				}
				else
				{
					result = line;
				}
				//;
				//self.awi.editor.waitForInput( prompt, { toPrint: prompt } );
				self.awi.editor.rerouteInput();
			} );

		// Wait for input
		var prompt = this.awi.config.getPrompt( 'question' );
		this.awi.editor.waitForInput( prompt, { toPrint: prompt } );
		return new Promise( ( resolve ) => 
		{
			const checkPaused = () => 
			{
				var handle = setInterval( 
					function()
					{
						if ( typeof result != 'undefined' ) 
						{
							clearInterval( handle );
							var data = {};
							data[ parameters.inputInfo.name ] = result;
							resolve( { success: true, data: data } );
						} 
					} );
			};
			checkPaused();
		} );
	}
	async transpile( line, data, control )
	{
		super.transpile( control );
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
module.exports.Bubble = BubbleAwiInput;
