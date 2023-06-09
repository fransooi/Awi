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
* @file awi-bubble-generic-debug.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Debug command: manage debugging
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericDebug extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Debug';
		this.token = 'debug';
		this.classname = 'generic';
		this.properties.action = 'sets the level of debug of awi';
		this.properties.inputs = [ { evaluation: 'the level of debug, from 0 to 3', type: 'number', interval: { start: 0, end: 3 }, optional: false } ];
		this.properties.outputs = [ { evalValue: 'the last evaluated expression', type: 'number' } ];
		this.properties.parser = {
			verb: [ 'debug' ],
			evaluation: [ 'numeric' ] };
		this.properties.select = [];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );

		var answer = await this.awi.language.doEval( '' + parameters.evaluation, {} );
		if ( answer.success )
		{
			var debug = Math.floor( answer.data );
			var oldDebug = this.awi.config.getDebug();
			if ( debug != oldDebug )
			{
				this.awi.editor.print( control.editor, 'Setting debug level to ' + debug, { user: 'root' } );
				this.awi.config.setDebug( debug );
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
module.exports.Bubble = BubbleGenericDebug;
