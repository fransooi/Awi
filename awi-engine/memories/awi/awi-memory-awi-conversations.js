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
* @file awi-memory-awi-conversations.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Conversations memory bulb
*
*/
var awimemory = require( '../awi-memory' );

class MemoryAwiConversations extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'conversations';	
		this.classname = 'awi';
		this.name = 'Conversation Souvenir Chain';	
		this.properties.action = 'stores a thread of messages with one person';
		this.properties.inputs = [
			{ userInput: 'what to find in the messages', type: 'string' },
			{ kind: 'the kind of things to find', type: 'string', optional: true, default: 'all' },
		];
		this.properties.outputs = [ { memoryList: 'list of memories found', type: 'string.array' } ];
		this.properties.tags = [ 'memory', 'conversation' ];
		this.properties.content = [ 'text' ];
		//this.properties.topic = '';
		//this.properties.subTopics = [ '' ];
		//this.properties.interval = { from: 0, to: 0 };
	}
}
module.exports.Memory = MemoryAwiConversations;
