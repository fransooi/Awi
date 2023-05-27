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
* @file awi-bubble-generic-eval.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Eval command: perform a calculation
*
*/
var awibubbles = require( '../awi-bubbles' )

class BubbleGenericEval extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );

		this.name = 'Eval';
		this.token = 'eval';
		this.classname = 'generic';
		this.properties.action = 'converts a string to a number';
		this.properties.inputs = [ { userInput: 'the expression to convert', type: 'string' } ];
		this.properties.outputs = [ { evalValue: 'the last evaluated expression', type: 'number' } ];
		this.properties.brackets = true;
		this.properties.tags = [ 'mathematics', 'education', 'programming' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var answer = await this.awi.language.doEval( parameters.userInput, {} );
		if ( answer.success )
		{
			this.awi.editor.print( this, [ '' + answer.data ], { user: 'result' } );
		}
		else
		{
			this.awi.editor.print( this, [ answer.error ], { user: 'awi' } );
		}
		return answer;
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
module.exports.Bubble = BubbleGenericEval;
