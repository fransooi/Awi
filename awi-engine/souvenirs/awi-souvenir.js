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
* @short Parent class for souvenir bubbles
*
*/
var awibubbles = require( '../bubbles/awi-bubbles' )

class Souvenir extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.classname = 'souvenir';
		this.properties.topic = '';
		this.properties.subTopics = [];
		this.properties.interval = { start: 0, end : 0 };
		if ( options.parameters )
		{
			if ( options.parameters.topic )
				this.properties.topic = options.parameters.topic;
			if ( options.parameters.subTopics )
				this.properties.subTopics.push( ...options.parameters.subTopics );
			if ( options.parameters.interval )
				this.properties.interval = options.parameters.interval;
		}
	}
	async play( line, parameter, control )
	{
		super.play( line, parameter, control );
	}
	async transpile( line, parameter, control )
	{
		super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = Souvenir;
