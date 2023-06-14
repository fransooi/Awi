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
* @version 0.3
*
* @short Eval command: perform a calculation
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericEval extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );

		this.name = 'Eval';
		this.token = 'eval';
		this.classname = 'generic';
		this.properties.action = 'converts a string to a number';
		this.properties.inputs = [ { evaluation: 'the expression to convert', type: 'string' } ];
		this.properties.outputs = [ { evalValue: 'the last evaluated expression', type: 'number' } ];
		this.properties.parser = {
			verb: [ 'eval', 'evaluate', 'calculate', 'calc' ],
			evaluation: [ 'numeric' ] };
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var answer = await this.awi.language.doEval( '' + parameters.evaluation, {} );
		if ( answer.success )
		{
			this.awi.editor.print( control.editor, [ '' + answer.data ], { user: 'result' } );
		}
		else
		{
			this.awi.editor.print( control.editor, [ answer.error ], { user: 'awi' } );
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
