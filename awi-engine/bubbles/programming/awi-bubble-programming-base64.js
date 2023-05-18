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
* @file awi-bubble-awi-bin.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Bin command: convert to binary
*
*/
var awibubbles = require( '../awi-bubbles' )

class BubbleProgrammingBase64 extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Base64';
		this.token = 'base64';
		this.classname = 'programming';
		this.properties.action = 'converts an image to Base 64 Ascii code';
		this.properties.inputs = [ { userInput: 'the path or filter to the image', type: 'string' } ];
		this.properties.outputs = [ { base64: 'the image converted to base64', type: 'string' } ];
		this.properties.brackets = true;
		this.properties.tags = [ 'programming' ];
	}
	async play( line, parameters, control )
	{
		return await super.play( line, parameters, control );		
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
module.exports.Bubble = BubbleProgrammingBase64;
