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
	async printData( line, parameters, control )
	{
		if ( control.memory.scanLevel > 0 && control.memory.level == 1 )
		{	
			this.awi.editor.print( this, this.parameters.text, { user: 'memory3' } );
			this.awi.editor.print( this, '-----------------------------------------------------------------------------', { user: 'memory3' } );
		}
	}
	async findSouvenirs( line, parameters, control )
	{
		if ( control.memory.scanLevel > 0 && control.memory.level == 1 )
		{	
			var info = this.awi.utilities.matchTwoStrings( this.parameters.text, line, { caseInsensitive: true } );
			if ( info.result > 0 )
				return { success: 'found', data: [ this ] };
		}
		return { success: 'notfound' };
	}
	async play( line, parameters, control, nested )
	{
		if ( !nested )
			control.memory.level = 1;
		else
			control.memory.level++;			
		var answer = await this[ control.memory.command ]( line, parameters, control );
		control.memory.level--;			
		return answer;
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirAwiVideo;
