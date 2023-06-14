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
* @file awi-bubble-generic-bin.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Bin command: convert to binary
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericBin extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Bin';
		this.token = 'bin';
		this.classname = 'generic';
		this.properties.action = 'converts an expression to a binary number';
		this.properties.inputs = [ { evaluation: 'the expression to convert to binary', type: 'string' } ];
		this.properties.outputs = [ { binValue: 'the expression converted to binary', type: 'number' } ];
		this.properties.parser = {
			verb: [ 'convert', 'transform', 'calculate' ],
			adjective: [ 'binary' ],
			questionWord: [ 'what' ],
			evaluation: [ 'numeric' ] };
		this.properties.select = [ [ 'verb', 'adjective' ], [ 'questionWord', 'adjective' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );

		var answer = await this.awi.language.doEval( '' + parameters.evaluation, {} );
		if ( answer.success )
		{
			var result = '%' + this.awi.utilities.toBin( answer.data, 16 );
			this.awi.editor.print( control.editor, [ result ], { user: 'result' } );
			answer.data = result;
		}
		else
		{
			this.awi.editor.print( control.editor, [ answer.error ], { user: 'error' } );
		}
		return ( answer );
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
module.exports.Bubble = BubbleGenericBin;
