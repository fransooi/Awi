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
* @file awi-bubble-generic-stop.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Stop command: stop a media playing in the current editor
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericStop extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Stop';
		this.token = 'stop';
		this.classname = 'generic';
		this.properties.action = 'stop a media playing';
		this.properties.inputs = [ { noun: 'the name of the item to stop', type: 'string' } ];
		this.properties.outputs = [ { stopAction: 'the name of the item that was stopped', type: 'string' } ];
		this.properties.parser = {
			verb: [ 'stop', 'halt' ],
			noun: [ 'mimetypes' ]
		}
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this.awi.editor.stop( control.editor, parameters.noun );
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
module.exports.Bubble = BubbleGenericStop;
