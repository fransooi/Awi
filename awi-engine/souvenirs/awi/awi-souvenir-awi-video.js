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
* @file awi-souvenir-awi-video.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Video souvenirs
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirAwiVideo extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Video Souvenir Bubble';
		this.token = 'video';
		this.klass = 'awi';
		this.properties.action = 'remembers one video';
		this.properties.subTopics.push( ...[ 'video' ] );
		this.properties.content = [ 'video' ];
		this.properties.inputs = [ { userInput: 'what to find in the video', type: 'string' } ];
		this.properties.outputs = [ { memories: 'video found', type: 'object', default: false } ];
		this.properties.tags = [ 'memory', 'souvenir', 'video' ];
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
module.exports.Souvenir = SouvenirAwiVideo;
