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
* @file awi-bubble-awi-stop.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Stop command: stop a media playing in the current editor
*
*/
var awibubbles = require( '../awi-bubbles' );

class BubbleAwiStop extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Stop';
		this.token = 'stop';
		this.classname = 'awi';
		this.properties.action = 'stop a media playing';
		this.properties.inputs = [ { userInput: 'the name of the item to stop', type: 'string' } ];
		this.properties.outputs = [ { stopAction: 'the name of the item that was stopped', type: 'string' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'editor', 'media' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this.awi.editor.stop( this, parameters.userInput );
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
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
module.exports.Bubble = BubbleAwiStop;
