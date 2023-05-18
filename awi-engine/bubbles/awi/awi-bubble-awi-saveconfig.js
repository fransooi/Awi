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
* @file awi-bubble-awi-saveconfig.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Saveconfig: force save all configuration files
*
*/
var awibubbles = require( '../awi-bubbles' )

class BubbleAwiSaveConfig extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'SaveConfig';
		this.token = 'saveconfig';
		this.classname = 'awi';
		this.properties.action = 'save configuration files to the config folder';
		this.properties.inputs = [ { userInput: 'the name of the user or personality to save', type: 'string', optional: true, default: '' } ];
		this.properties.outputs = [ ];
		this.properties.brackets = false;
		this.properties.tags = [ 'system', 'config' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );		
		return this.awi.config.saveConfigs( parameters.userInput );
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
module.exports.Bubble = BubbleAwiSaveConfig;
