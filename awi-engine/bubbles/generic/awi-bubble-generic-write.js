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
* @file awi-bubble-generic-code.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Code command: create code in the current language connector
*
*/
var awibubble = require( '../awi-bubble' )
var awimessages = require( '../../awi-messages' )

class BubbleGenericWrite extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Write';
		this.token = 'write';
		this.classname = 'generic';
		this.properties.action = 'write a text, code, resume, synthesis';
		this.properties.inputs = [ ];
		this.properties.editables =	[ ];
		this.properties.outputs = [ ];
		this.properties.brackets = false;
		this.properties.tags = [ 'editor', 'aoz', 'code' ];
	}
	async play( line, parameters, control )
	{
		return await super.play( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
}
module.exports.Bubble = BubbleGenericWrite;
