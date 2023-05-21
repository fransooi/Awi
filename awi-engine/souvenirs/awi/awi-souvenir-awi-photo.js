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
* @file awi-souvenir-awi-photo.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Photo souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirAwiPhoto extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Photo Souvenir Bubble';
		this.token = 'photo';
		this.klass = 'awi';
		this.properties.action = 'remembers one photo';
		this.properties.subTopics.push( ...[ 'photo' ] );
		this.properties.content = [ 'photos' ];
		this.properties.inputs = [ { userInput: 'what to find in the photo', type: 'string' } ];
		this.properties.outputs = [ { memories: 'memories about the photo', type: 'object', default: false } ];
		this.properties.tags = [ 'memory', 'souvenir', 'photo' ];
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
module.exports.Souvenir = SouvenirAwiPhoto;
