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
* @file awi-bubble-generic-hex.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Hex command: convert to hexadecimal
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericHex extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options )
		this.name = 'Hex';
		this.token = 'hex';
		this.classname = 'generic';
		this.properties.action = 'converts an expression to a hexadecimal number';
		this.properties.inputs = [ { userInput: 'the expression to convert to hexadecimal', type: 'string' } ];
		this.properties.outputs = [ { hexValue: 'the expression converted to hexadecimal', type: 'number' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'conversions', 'mathematics', 'education', 'programming' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var answer = await this.awi.language.doEval( parameters.userInput, {} );
		if ( answer.success )
		{
			var result = '$' + this.awi.utilities.toHex( answer.data, 8 );
			this.awi.editor.print( control.editor, [ result ], { user: 'result' } );
			return { success: true, data: result };
		}
		this.awi.editor.print( control.editor, [ answer.error ], { user: 'awi' } );
		return answer;
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
}
module.exports.Bubble = BubbleGenericHex;
