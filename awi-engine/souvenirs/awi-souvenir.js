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
* @file awi-souvenir.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Souvenir bubbles: stores and recall informations
*
*/
var awibubbles = require( '../bubbles/awi-bubbles' )

class Souvenir extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.parameters.senderName = typeof this.parameters.senderName == 'undefined' ? '' : this.parameters.senderName;
		this.parameters.receiverName = typeof this.parameters.receiverName == 'undefined' ? '' : this.parameters.receiverName;
		this.classname = 'souvenir';
		this.oClass = 'souvenir';
		this.properties.topic = '';
		this.properties.subTopics = [];
		this.properties.interval = { start: 0, end : 0 };
	}
	async extractContent( line, parameters, control )
	{
	}
	async getContent( line, parameters, control )
		{
		}
	async findSouvenirs( line, parameters, control )
	{
	}
	async play( line, parameter, control )
	{
		super.play( line, parameter, control );
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
	async transpile( line, parameter, control )
	{
		super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = Souvenir;
