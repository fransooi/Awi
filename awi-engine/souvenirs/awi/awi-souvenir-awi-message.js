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
* @version 0.2
*
* @short Message souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirAwiMessage extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Message Souvenir Bubble';
		this.token = 'message';
		this.klass = 'awi';
		this.properties.action = 'remembers one conversation exchange';
		this.properties.subTopics.push( ...[ 'messenger', 'conversation' ] );
		this.properties.content = [ 'text', 'videos', 'images', 'photos', 'audio', 'links' ];
		this.properties.inputs = [ { userInput: 'the topic to remember', type: 'string' } ];
		this.properties.outputs = [ { memories: 'memories about the topic', type: 'object', default: false } ];
		this.properties.tags = [ 'memory', 'souvenir', 'messenger', 'message' ];
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
module.exports.Souvenir = SouvenirAwiMessage;
