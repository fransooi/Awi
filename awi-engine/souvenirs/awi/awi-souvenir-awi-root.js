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

class SouvenirAwiRoot extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Root';
		this.token = 'root';
		this.klass = 'awi';
		this.properties.action = "root of a branch of souvenirs";
		this.properties.inputs = [ ],
		this.properties.outputs = [ ];
		this.properties.subTopics.push( ...[ 'souvenir', 'error' ] );
		this.properties.tags = [ 'memory', 'souvenir', 'document' ];
		this.properties.content = [ 'text' ];
	}
	play( line, parameter, control )
	{
		super.play( line, parameter, control );
		return { success: true, data: {} }
	}
	transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirAwiRoot;
