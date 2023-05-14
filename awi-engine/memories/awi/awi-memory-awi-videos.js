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
* @file awi-memory-awi-videos.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Video memory bulb
*
*/
var awimemory = require( '../awi-memory' );

class MemoryAwiVideos extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'videos';	
		this.classname = 'awi';
		this.name = 'Videos Souvenir Chain';	
		this.properties.action = 'stores a list of videos';
		this.properties.inputs = [
			{ userInput: 'what to find in the video', type: 'string' },
		];
		this.properties.outputs = [ { memoryList: 'list of memories found', type: 'string.array' } ];
		this.properties.tags = [ 'memory', 'video' ];
		this.properties.content = [ 'video' ];
		this.properties.subTopics.push( ... [ 'memory', 'videos' ] );
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
module.exports.Memory = MemoryAwiVideos;
