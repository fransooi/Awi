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
* @file awi-bubble-awi-error.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Error management bubble
*
*/
var awibubbles = require( '../awi-bubbles' );

class BubbleAwiError extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Error';
		this.token = 'error';
		this.classname = 'awi';
		this.properties.action = 'handle errors';
		this.properties.inputs = [ ];
		this.properties.outputs = [ ];
		this.properties.brackets = false;
		this.properties.tags = [ 'awi' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return { success: 'end' };
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
module.exports.Bubble = BubbleAwiError;
