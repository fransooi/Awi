/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][   ]       Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_] \     link: 
*
* This file is open-source under the conditions contained in the 
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-souvenir-awi-image.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Image souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirAwiImage extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Image Souvenir Bubble';
		this.token = 'image';
		this.classname = 'awi';
		this.properties.action = "remembers one image file and it's content";
		this.properties.inputs = [ { userInput: 'what to find in the image', type: 'string' } ],
		this.properties.outputs = [ { memoryList: 'list of memories found', type: 'string.array' } ];
		this.properties.subTopics.push( ...[ 'souvenir', 'image' ] );
		this.properties.tags = [ 'memory', 'souvenir', 'image' ];
		this.properties.content = [ 'image' ];
	}
	async play( line, parameter, control )
	{
		super.play( line, parameter, control );
		return { success: true, data: [] }
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirAwiImage;
