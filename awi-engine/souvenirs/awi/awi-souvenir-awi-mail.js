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
* @file awi-souvenir-awi-mail.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Mail souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirAwiMail extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Mail Souvenir Bubble';
		this.token = 'mail';
		this.klass = 'awi';
		this.properties.action = "remembers one mail exchange and it's content";
		this.properties.inputs = [ { userInput: 'what to find in the mails', type: 'string' } ],
		this.properties.outputs = [ { memoryList: 'list of memories found', type: 'string.array' } ];
		this.properties.subTopics.push( ...[ 'souvenir', 'mail' ] );
		this.properties.tags = [ 'memory', 'souvenir', 'mail' ];
		this.properties.content = [ 'text' ];
	}
	play( line, parameter, control )
	{
		super.play( line, parameter, control );
		return { success: true, data: [] }
	}
	transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirAwiMail;
