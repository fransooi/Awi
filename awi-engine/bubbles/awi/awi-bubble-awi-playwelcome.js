/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal 
* (_)|____| |____|\__/\__/  [_||_]  \     Assistant
*
* This file is open-source under the conditions contained in the 
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-bubble-awi-welcome.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Welcome: displays welcome message, always called first. Can display nothing.
*        Can display animations, can depend on mood/news etc.
*/
var awibubbles = require( '../awi-bubbles' );

class BubbleAwiWelcome extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'PlayWelcome';
		this.token = 'playwelcome';
		this.classname = 'awi';
		this.properties.action = "displays user's welcome message and checks for initial parameters";
		this.properties.inputs = [ ];
		this.properties.outputs = [ ];
		this.properties.brackets = false;
		this.properties.tags = [ 'awi', 'system' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var config = this.awi.config.getConfig( 'user' );
		if ( config.firstName == '' )
		{
			var param = await this.awi.prompt.getParameters( [
				{ firstname: 'Please enter your first name: ', type: 'string', optional: false, default: '' },
				{ lastname: 'Please enter your last name: ', type: 'string', optional: false, default: '' },
				{ aikey: 'Please enter your open-ai key: ', type: 'string', optional: false, default: '' },
				] );
			if ( param.success )
			{
				var config = this.awi.config.getNewUserConfig();
				config.aiKey = param.data.aikey;
				config.firstName = param.data.firstname;
				config.lastName = param.data.lastname;
				config.fullName = param.data.firstname + ' ' + param.data.lastname;
				await this.awi.config.setNewUserConfig( param.data.firstname.toLowerCase(), config );
				var answer = await this.awi.config.saveConfigs();
				if ( answer.success )
				{
					this.awi.editor.print( this, 'User configuration "' + config.firstName + '" successfully created in ' + this.awi.config.getConfigurationPath() );
					this.awi.editor.print( this, 'Please now type "' + config.firstName + '" to login...' );
					var prompt = this.awi.config.getPrompt( 'question' );
					this.awi.editor.waitForInput( prompt, { toPrint: prompt } );
					return { success: true, data: {} };
				}
				this.awi.editor.print( this, 'Sorry I need these information to run.' );
				return { success: false, error: 'awi:config-not-set:iwa' };
			}
		}
		return { success: true, data: {} };
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
	async undo( options )
	{
		super.undo( options );
	}
	async redo( options )
	{
		super.redo( options );
	}
}
module.exports.Bubble = BubbleAwiWelcome;
