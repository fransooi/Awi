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

class BubbleUserDiaporama extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Diaporama';
		this.token = 'diaporama';
		this.classname = 'user';
		this.properties.action = 'displays a list of images as a diaporama';
		this.properties.inputs = [ { userInput: 'the path or filter to the images', type: 'string' } ];
		this.properties.outputs = [ ];
		this.properties.brackets = true;
		this.properties.tags = [ 'viewer' ];
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
module.exports.Bubble = BubbleUserDiaporama;
