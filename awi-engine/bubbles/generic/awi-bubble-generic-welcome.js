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
* @file awi-bubble-generic-welcome.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Welcome: displays welcome message, always called first. Can display nothing.
*        Can display animations, can depend on mood/news etc.
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericWelcome extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Welcome';
		this.token = 'welcome';
		this.classname = 'generic';
		this.properties.action = "displays user's welcome message and checks for initial parameters";
		this.properties.inputs = [ ];
		this.properties.outputs = [ ];
		this.properties.brackets = false;
		this.properties.tags = [ 'generic' ];
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
				], control );
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
					this.awi.editor.print( control.editor, 'User configuration "' + config.firstName + '" successfully created in ' + this.awi.config.getConfigurationPath() );
					this.awi.editor.print( control.editor, 'Please now type "' + config.firstName + '" to login...' );
					var prompt = this.awi.config.getPrompt( 'question' );
					this.awi.editor.waitForInput( control.editor );
					return { success: true, data: {} };
				}
				this.awi.editor.print( control.editor, 'Sorry I need these information to run.' );
				return { success: false, error: 'awi:config-not-set:iwa' };
			}
		}
		return { success: true, data: {} };
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
module.exports.Bubble = BubbleGenericWelcome;
