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
* @file awi-souvenir-awi-error.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Souvenir error bubble
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirAwiError extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Souvenir Error Handling';
		this.token = 'error';
		this.classname = 'awi';
		this.properties.action = "handle Alzheinmer?";
		this.properties.inputs = [ ],
		this.properties.outputs = [ ];
		this.properties.subTopics.push( ...[ 'souvenir', 'error' ] );
		this.properties.tags = [ 'memory', 'souvenir', 'document' ];
		this.properties.content = [ 'text' ];
	}
	async play( line, parameter, control )
	{
		super.play( line, parameter, control );
		return { success: true, data: [] }
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirAwiError;
