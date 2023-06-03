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
* @short Mails memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericMails extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'mails';
		this.classname = 'generic';
		this.name = 'Mails Souvenir Chain';
		this.properties.action = 'stores a list of mails';
		this.properties.inputs = [
			{ userInput: 'what to find in the mail', type: 'string' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'when the mail was sent', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [ { mailInfos: 'list of mails found', type: 'mailInfo.object.array' } ];
		this.properties.tags = [ 'memory', 'mails' ];
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
			this.awi.editor.print( this, 'Mail between: ' + souvenir.parameters.senderName + ' and ' + souvenir.parameters.receiverName, { user: 'memory2' } );
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
module.exports.Memory = MemoryGenericMails;
