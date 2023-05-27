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
* @version 0.2
*
* @short Bin command: convert to binary
*
*/
var awibubbles = require( '../awi-bubbles' )

class BubbleGenericBin extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Bin';
		this.token = 'bin';
		this.classname = 'generic';
		this.properties.action = 'converts an expression to a binary number';
		this.properties.inputs = [ { userInput: 'the expression to convert to binary', type: 'string' } ];
		this.properties.outputs = [ { bin: 'the expression converted to binary', type: 'number' } ];
		this.properties.brackets = true;
		this.properties.tags = [ 'conversions', 'mathematics', 'education', 'programming' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );

		var answer = await this.awi.language.doEval( parameters.userInput, {} );
		if ( answer.success )
		{
			var result = '%' + this.awi.utilities.toBin( answer.data, 16 );
			this.awi.editor.print( this, [ result ], { user: 'result' } );
			answer.data = result;
		}
		else
		{
			this.awi.editor.print( this, [ answer.error ], { user: 'error' } );
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
