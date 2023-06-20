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

class BubbleGenericVerbose extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'verbose';
		this.token = 'verbose';
		this.classname = 'generic';
		this.properties.action = 'sets the level of verbosity of awi';
		this.properties.inputs = [ { evaluation: 'the level of verbosity, from 1 to 3', type: 'number', interval: { start: 1, end: 3 }, optional: false } ];
		this.properties.outputs = [];
		this.properties.parser = {
			verb: [ 'verbose' ],
			evaluation: [ 'numeric' ]
		}
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );

		var answer = await this.awi.language.doEval( '' + parameters.evaluation, {} );
		if ( answer.success )
		{
			var verbose = Math.floor( answer.data );
			var oldVerbose = this.awi.getConfig( 'user' ).verbose;
			if ( verbose != oldVerbose )
			{
				if ( verbose <= oldVerbose )
					this.awi.editor.print( control.editor, 'OK I will talk less from now on...', { user: 'root' } );
				else
					this.awi.editor.print( control.editor, 'OK I will talk more from now on...', { user: 'root' } );
				this.awi.config.setVerbose( verbose );
			}
		}
		else
		{
			this.awi.editor.print( control.editor, [ answer.error ], { user: 'error' } );
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
module.exports.Bubble = BubbleGenericVerbose;
