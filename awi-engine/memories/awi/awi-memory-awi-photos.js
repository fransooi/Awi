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
* @file awi-memory-awi-photos.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Photo memory bulb
*
*/
var awimemory = require( '../awi-memory' );

class MemoryAwiPhotos extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'photos';	
		this.classname = 'awi';
		this.name = 'Photos Souvenir Chain';	
		this.properties.action = 'stores a list of photos';
		this.properties.inputs = [
			{ userInput: 'what to find in the photos', type: 'string' },
		];
		this.properties.outputs = [ { memoryList: 'list of memories found', type: 'string.array' } ];
		this.properties.tags = [ 'memory', 'photos' ];
		this.properties.content = [ 'photos' ];
		this.properties.subTopics.push( ... [ 'memory', 'photos' ] );
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
module.exports.Memory = MemoryAwiPhotos;
