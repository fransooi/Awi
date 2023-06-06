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
		var info = this.awi.utilities.compareTwoStrings( this.parameters.senderText + this.parameters.receiverText, line, control );
		if ( info.result > 0 )
		{
			var content = await this.getContent( line, parameters, control );
			return { success: 'found', data: { result: info.result, match: info, content: content.data.messageInfo } };
		}
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( control.editor, this.parameters.senderName + ' said: ' + this.parameters.senderText, { user: 'memory3' } );
		this.awi.editor.print( control.editor, this.parameters.receiverName + ' said: ' + this.parameters.receiverText, { user: 'memory3' } );
		this.awi.editor.print( control.editor, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {	messageInfo: this.parameters } };
	}
	async findSouvenirs( line, parameters, control )
	{
		var found = this.awi.utilities.matchTwoStrings( this.parameters.senderText + this.parameters.receiverText, line, { caseInsensitive: true } );
		if ( found.result > 0 )
		{
			return await this.getContent( line, parameters, control );
		}
		return { success: 'notfound' };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericMessage;
