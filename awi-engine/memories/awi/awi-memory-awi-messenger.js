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
			{ interval: 'interval of time when the message was sent', type: 'string', optional: true, default: 'all' },
			{ memoryContent: 'what kind of content to remember', type: 'string', optional: true, default: 'all' },
		];
		this.properties.outputs = [ { memoryList: 'list of memories found', type: 'string.array' } ];
		this.properties.tags = [ 'memory', 'mails' ];
		this.properties.content = [ 'text', 'images', 'photos', 'audio', 'video' ];
		this.properties.subTopics.push( ... [ 'memory', 'messenger', 'conversation' ] );
	}
	async play( line, parameters, control, nested )
	{		
		if ( !nested )
			control.memory.level = 1;
		else
			control.memory.level++;

		switch ( control.memory.command )
		{
			case 'printData':
				return await this.printData( line, parameters, control );
			case 'findSouvenirs':
				return await this.findSouvenirs( line, parameters, control );
			default:
				break;
		}
	}
	async printData( line, parameters, control )
	{
		if ( control.memory.scanLevel > 0 && control.memory.level == 1 )
		{	
			var text = 'Conversation between ' + this.parameters.senderName + ' and ' + this.parameters.contactName;
			this.awi.editor.print( this, text, { user: 'memory2' } );

			var souvenir = this.getBubble( 'root' );
			do
			{
				if ( souvenir.parameters && souvenir.parameters.contactName )
					await souvenir.play( line, {}, control );
				souvenir = souvenir.properties.exits[ 'success' ];
			} while ( souvenir );
		}
	}
	async findSouvenirs( line, parameters, control )
	{
		var directSouvenirs = [];
		var indirectSouvenirs = [];
		if ( control.memory.scanLevel > 0 && control.memory.level == 1 )
		{	
			var bubble = this.getBubble( 'root' );
			do
			{
				if ( bubble.parameters && bubble.parameters.contactName )
				{
					var info1 = this.awi.utilities.matchTwoStrings( bubble.parameters.contactName, parameters.userInput, { caseInsensitive: true } );
					var info2 = this.awi.utilities.matchTwoStrings( bubble.parameters.senderName, parameters.senderName, { caseInsensitive: true } );
					if ( info2.result == 1 && info1.score >= 1 )
					{
						directSouvenirs.push( bubble );
					}
				}
				bubble = bubble.properties.exits[ 'success' ];
			} while ( bubble );

			if ( control.memory.scanLevel > 1 )
			{	
				var bubble = this.getBubble( 'root' );
				do
				{
					var found = directSouvenirs.findIndex( 
						function( element )
						{
							return element === bubble;
						} );
					if ( found < 0 && bubble.parameters && bubble.parameters.contactName )
					{
						control.start = 'root';
						control.caseInsensitive = true;
						this.awi.prompt.waitForInput = true;
						var answer = await bubble.play( parameters.userInput, parameters, control, true );
						if ( answer.success = 'found' )
							indirectSouvenirs.push( ...answer.data.indirectSouvenirs );
						this.awi.prompt.waitForInput = false;
					}
					bubble = bubble.properties.exits[ 'success' ];
				} while ( bubble );
			}	
		}
		if ( control.memory.scanLevel > 1 && control.memory.level == 2 )
		{	
			var bubble = this.getBubble( 'root' );
			do
			{
				if ( bubble.parameters && bubble.parameters.conversation && bubble.parameters.conversation.length )
				{
					var info3 = this.awi.utilities.matchTwoStrings( bubble.parameters.conversation, parameters.userInput, { caseInsensitive: true } );
					if ( info3.result > 0 )
						indirectSouvenirs.push( bubble );
				}
				bubble = bubble.properties.exits[ 'success' ];
			} while ( bubble );
		}

		control.memory.level--;
		if ( directSouvenirs.length > 0 || indirectSouvenirs.length > 0 )
			return { success: 'found', data: { directSouvenirs: directSouvenirs, indirectSouvenirs: indirectSouvenirs } };
		return { success: 'notfound', data: { directSouvenirs: [], indirectSouvenirs: [] } };
	}
}
module.exports.Memory = MemoryAwiMessenger;
