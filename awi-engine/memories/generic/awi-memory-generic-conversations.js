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
* @version 0.3
*
* @short Conversations memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericConversations extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'conversations';
		this.classname = 'generic';
		this.name = 'Conversation Souvenir Chain';
		this.properties.action = 'stores a thread of messages with one person';
		this.properties.inputs = [
			{ userInput: 'what to find in the messages', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'when the things were said', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [ { messageInfos: 'found messages', type: 'messageInfo.object.array' } ];
		this.properties.tags = [ 'memory', 'conversation' ];
	}
	async play( line, parameters, control )
	{
		if ( !parameters.interval )
			parameters.interval = 'any';
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return await super.extractContent( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		if ( souvenir )
		{
			this.awi.editor.print( control.editor, 'Conversation between: ' + souvenir.parameters.senderName + ' and ' + souvenir.parameters.receiverName + ',', { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'On the : ' + souvenir.parameters.date + '.', { user: 'memory2' } );
		}
		return await super.getContent( line, parameters, control );
	}
	async findSouvenirs( line, parameters, control )
	{
		return await super.findSouvenirs( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		return await super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericConversations;
