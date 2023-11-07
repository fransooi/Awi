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
* @file awi-souvenir-awi-message.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Message souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericMessage extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Message Souvenir Bubble';
		this.token = 'message';
		this.classname = 'generic';
		this.properties.action = 'remembers one conversation exchange';
		this.properties.inputs = [
			{ userInput: 'the topics to remember', type: 'string', optional: false, default: '' },
			{ from: 'the kind of topic to remember, example audio, video etc.', type: 'string', optional: true, default: '' } ];
		this.properties.outputs = [ { messageInfo: 'what was found', type: 'object.messageInfo', default: false } ];
		this.properties.tags = [ 'souvenir', 'messenger', 'message' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		var content = await this.getContent( line, parameters, control );
		var info = this.awi.utilities.matchTwoStrings( content, line, control );
		if ( info.result > 0 )
		{
			return { success: 'found', data: { result: info.result, match: info, content: content } };
		}
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		var texts = [];
		for ( var c = 0; c < this.parameters.conversation.length; c++ )
		{
			var message = this.parameters.conversation[ c ];
			var text = '';
			if ( message.name == this.parameters.senderName )
				text += 's:';
			else 
				text += 'r:';
			text += message.content;
			texts.push( text );
		}
		return texts;
	}
	async findIndirectSouvenirs( line, parameters, control )
	{
		var content = await this.getContent( line, parameters, control );
		var foundContent = [];
		for ( var c = 0; c < content.length; c++ )
		{
			var found = this.awi.utilities.matchTwoStrings( content[ c ].substring( 2 ), line, { caseInsensitive: true } );
			if ( found.result > 0 )
			{
				foundContent.push( content[ c ].substring( 2 ) );
			}	
		}
		return { success: foundContent.length > 0 ? 'found' : 'notfound', content: foundContent };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericMessage;
