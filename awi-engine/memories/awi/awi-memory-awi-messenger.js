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
* @file awi-memory-awi-messenger.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Messenger memory bulb
*
*/
var awimemory = require( '../awi-memory' );

class MemoryAwiMessenger extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'messenger';
		this.classname = 'awi';
		this.name = 'Messages Souvenir Chain';
		this.properties.action = 'stores a thread of messages with one person';
		this.properties.inputs = [
			{ userInput: 'what to find in the messages', type: 'string' },
			{ kind: 'the kind of things to find', type: 'string', optional: true, default: 'all' },
		];
		this.properties.outputs = [ { memoryList: 'list of memories found', type: 'string.array' } ];
		this.properties.tags = [ 'memory', 'mails' ];
		this.properties.content = [ 'text', 'images', 'photos', 'audio', 'video' ];
		this.properties.subTopics.push( ... [ 'memory', 'messenger', 'conversation' ] );
	}
	async play( line, parameters, control )
	{
		var answer = await super.play( line, parameters, control )
		return answer;
	}
}
module.exports.Memory = MemoryAwiMessenger;
