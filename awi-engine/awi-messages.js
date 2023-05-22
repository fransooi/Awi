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
* @file awi-messages.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Load and return system messages
*
*/
class Messages
{
	constructor( awi, options )
	{
		this.awi = awi;
		this.oClass = 'messages';
		this.options = options;

	}
	async loadMessages()
	{
		// Load texts
		var path = this.awi.config.getEnginePath() + '/data/en.txt';
		var answer = await this.awi.system.readFile( path, { encoding: 'utf8' } );
		this.prompts = answer.data.split( '\r\n' ).join( '\n' );
	}
	getText( id )
	{
		var start = this.prompts.indexOf( id + ':' ) + 1;
		while ( this.prompts.charCodeAt( start ) >= 32 )
			start++;
		while ( this.prompts.charCodeAt( start ) < 32 )
			start++;
		var end = this.prompts.indexOf( ':::', start );
		return this.prompts.substring( start, end ).split( '\r\n' ).join( '\n' );
	}
}
module.exports.Messages = Messages;