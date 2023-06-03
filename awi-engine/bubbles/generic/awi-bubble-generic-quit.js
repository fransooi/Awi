/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal
* (_)|____| |____|\__/\__/  [_| |_] \     Assistant
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-bubble-generic-saveconfig.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Quit: save conversations and memories and quits Awi.
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericQuit extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Quit';
		this.token = 'quit';
		this.classname = 'generic';
		this.properties.action = 'save conversations and memories and quits Awi';
		this.properties.inputs = [ ];
		this.properties.outputs = [ ];
		this.properties.brackets = false;
		this.properties.tags = [ 'system', 'config' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		await this.awi.config.saveConfigs( this.awi.config.user );
		var answer = await this.awi.save( this.awi.config.user );
		if ( answer.success )

			this.awi.system.quit();
		this.awi.editor.print( this, 'Cannot save memories and conversations. Please check your setup.' );
		return answer;
	}
	async playback( line, parameters, control )
	{
		return await super.playback( line, parameters, control );
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
}
module.exports.Bubble = BubbleGenericQuit;
