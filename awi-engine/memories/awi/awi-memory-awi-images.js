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
* @file awi-memory-awi-images.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Images memory bulb
*
*/
var awimemory = require( '../awi-memory' );

class MemoryAwiImages extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'images';	
		this.classname = 'awi';
		this.name = 'Images Souvenir Chain';	
		this.properties.action = 'stores a list of images';
		this.properties.inputs = [
			{ userInput: 'what to find in the images', type: 'string' },
		];
		this.properties.outputs = [ { memoryList: 'list of memories found', type: 'string.array' } ];
		this.properties.tags = [ 'memory', 'images' ];
		this.properties.content = [ 'images' ];
		this.properties.subTopics.push( ... [ 'memory', 'images' ] );
	}
	remember( line, data, callback, options )
	{
		return { memory: '', memories: [] };
	}
	learn( line, data, callback, extra )
	{

	}
	pushNewSouvenir( command, options = {} )
	{
	}
}
module.exports.Memory = MemoryAwiImages;
