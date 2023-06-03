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
* @short Messenger memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericMessenger extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'messenger';
		this.classname = 'generic';
		this.name = 'Messages Souvenir Chain';
		this.properties.action = 'stores a thread of messages with one person';
		this.properties.inputs = [
			{ userInput: 'what to find in the messages', type: 'string', optional: false, default: '' },
			{ from: 'what kind of content to remember', type: 'string', optional: true, default: 'any' },
			{ interval: 'interval of time when the message was written', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [ { messageInfos: 'list of messages found', type: 'messageInfo.object.array' } ];
		this.properties.tags = [ 'memory', 'messages' ];
	}
	async play( line, parameters, control, nested )
	{
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
			this.awi.editor.print( this, 'Conversation between ' + souvenir.parameters.senderName + ' and ' + souvenir.parameters.receiverName + ',', { user: 'memory2' } );
			this.awi.editor.print( this, 'On the ' + souvenir.parameters.date, { user: 'memory2' } );
		}
		return await super.getContent( line, parameters, control );
	}
	async findSouvenirs( line, parameters, control )
	{
		return await super.findSouvenirs( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericMessenger;
