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
* @file awi-memory-awi-mails.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Mails memory bulb
*
*/
var awimemory = require( '../awi-memory' );

class MemoryAwiMails extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'mails';	
		this.classname = 'awi';
		this.name = 'Mails Souvenir Chain';	
		this.properties.action = 'stores a list of mails';
		this.properties.inputs = [
			{ userInput: 'what to find in the mails', type: 'string' },
			{ kind: 'the kind of things to find', type: 'string', optional: true, default: 'all' },
		];
		this.properties.outputs = [ { memoryList: 'list of memories found', type: 'string.array' } ];
		this.properties.tags = [ 'memory', 'mails' ];
		this.properties.content = [ 'text', 'images', 'photos', 'audio', 'video' ];
		//this.properties.topic = '';
		//this.properties.subTopics = [ '' ];
		//this.properties.interval = { from: 0, to: 0 };
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
module.exports.Memory = MemoryAwiMails;
