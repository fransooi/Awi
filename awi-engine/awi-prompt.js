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
* @file awi-prompt.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Handle a prompt in the current editor
*
*/
var awibranch = require( './bubbles/awi-branch' );

class Prompt
{
	constructor( awi, options = {} )
	{
		this.awi = awi;
		this.oClass = 'prompt';
		this.playing = false;
		this.viewing = false;
		this.lineActivated = false;
		this.promptOn = false;
		this.noCommand = false;
		this.waitingOn = false;
		this.waitingBubble = false;
		this.animationsOn = false;
		this.connected = false;
		this.datas = { };
		this.options = { awi: {}, bubble: {} };
		this.promptThis = this;
		this.questionCount = 1;

		this.types =
		{
			png: { importTo: [ '/resources/1.images', '/resources/images', '/resources/1.Images', '/resources/Images' ], displayName: 'images' },
			jpg: { importTo: [ '/resources/1.images', '/resources/images', '/resources/1.Images', '/resources/Images' ], displayName: 'images' },
			jpeg: { importTo: [ '/resources/1.images', '/resources/images', '/resources/1.Images', '/resources/Images' ], displayName: 'images' },
			mp3: { importTo: [ '/resources/5.samples', '/resources/5.sounds', '/resources/5.Samples', '/resources/5.Sounds', '/resources/Sounds', '/resources/Samples' ], displayName: 'sounds' },
			wav: { importTo: [ '/resources/5.samples', '/resources/5.sounds', '/resources/5.Samples', '/resources/5.Sounds', '/resources/Sounds', '/resources/Samples' ], displayName: 'sounds' },
			mp4: { importTo: [ '/resources/assets', '/resources/Assets' ], displayName: 'assets' },
			_assets_: { importTo: [ '/resources/assets' ], displayName: 'assets' }
		}
		this.animations =
		{
			awi:
			{
				type: 'oneline',
				anims:
				{
					thinking:
					{
						speed: 5,
						loop: -1,
						definition: [ '(...)' ]
					},
					neutral:
					{
						speed: 3,
						loop: -1,
						definition: [ '(°°)' ]
					},
					success:
					{
						speed: 3,
						loop: -1,
						definition: [ '(**)' ]
					},
					error:
					{
						speed: 3,
						loop: -1,
						definition: [ '(!!)' ]
					},
					question:
					{
						speed: 3,
						loop: -1,
						definition: [ '(??)' ]
					},
					waiting:
					{
						speed: 4,
						loop: -1,
						wink: 0,
						cling: 5,
						definition: [ '(.)', '(..)', '(...)', '(..)' ]
					},
					winkLeft:
					{
						speed: 1,
						loop: 1,
						definition: [ '(-°)' ]
					},
					winkRight:
					{
						speed: 1,
						loop: 1,
						definition: [ '(°-)' ]
					},
				}
			}
		}
		this.branch = new awibranch.Branch( this.awi, { parent: 'prompt' } )
	}
	async play( line, data, control )
	{
		super.play( line, data, control );
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
	async prompt( line, data, control )
	{
		if ( this.branch.working || this.noCommand )
		 	return;

		if ( !this.promptOn )
		{
			this.promptOn = true;
		}
		if ( control.printPrompt )
		{
			this.awi.editor.print( control.editor, line.split( '\n' ), { user: 'user' } );
			control.printPrompt = false;
		}
		control.editor.self.disableInput( control.editor );

		if ( !this.awi.config.isUserLogged() )
		{
			var logged = false;

			// Is it the name of a user?
			var maybe = -1;
			for ( var start = 0; start < line.length; start++ )
			{
				var type = this.awi.utilities.getCharacterType( line.charAt( start ) );
				if ( type == 'letter' )
				{
					maybe = start;
					break;
				}
			}
			if ( maybe >= 0 )
			{
				var userName = line.substring( maybe ).split( '\n' )[ 0 ].trim();
				if ( userName.toLowerCase() == 'newuser' )
				{
					logged = true;
					line = 'Welcome';
				}
				if ( this.awi.config.checkUserConfig( userName ) != null )
				{
					var answer = await this.awi.config.setUser( userName, control );
					if ( answer.success )
					{
						answer = await this.awi.loadUser( userName );
						if ( answer.success )
						{
							logged = true;
							line = '';	//'Please say hello to ' + userName + ' with a short joke about programming...';
							this.awi.editor.print( control.editor, 'User changed to ' + userName + '\n', { user: 'information' } );
						}
						else
							this.awi.editor.print( control.editor, 'Cannot load memories...\n', { user: 'error' } );
					}
					else
						this.awi.editor.print( control.editor, 'Cannot change user to ' + userName + '\n', { user: 'error' } );
				}
			}
			if ( !logged )
			{
				var list = this.awi.config.getUserList();
				if ( list.length == 0 )
				{
					line = 'Welcome';
				}
				else
				{
					this.awi.editor.print( control.editor, 'List of registered users on this machine...', { user: 'information' } );
					for ( var l = 0; l < list.length; l++ )
						this.awi.editor.print( control.editor, '    ' + list[ l ].fullName, { user: 'information' } );
					this.awi.editor.print( control.editor, 'Please enter the first name of a user, or "newuser"...', { user: 'information' } );
					this.awi.editor.waitForInput( control.editor );
					return { success: false, error: 'awi:not-user-logged:iwa' };
				}
			}
		}
		if ( line == '' )
		{
			control.editor.self.waitForInput( control.editor );
			return { success: true, data };
		}

		// A normal bubble...
		line = this.branch.addBubbleFromLine( line, {} );
		control.start = 'current';
		control.questionCount = this.questionCount++;
		var answer = await this.branch.play( line, data, control );
		control.questionCount = undefined;
		control.editor.self.waitForInput( control.editor, { force: true } );
		return answer;
	}
	async getParameters( parameters, control = {} )
	{
		var data = {};
		var parameters = this.awi.utilities.copyObject( parameters );
		var answer = { success: true, data: {} };
		control.editor.self.saveInputs( control.editor );
		for ( var p = 0 ; p < parameters.length; p++ )
		{
			control.editor.inputDisabled = 1;		// TODO: correct!
			var bubble = this.branch.newBubble( { token: 'input', classname: 'generic', parent: 'prompt', parameters: {} }, [], control );
			var parameter = { inputInfo: this.awi.utilities.getBubbleParams( parameters[ p ] ) };
			answer = await bubble.play( '', parameter, control );
			for ( var d in answer.data )
				data[ d ] = answer.data[ d ];
			if ( !answer.success )
				break;
		}
		control.editor.self.restoreInputs( control.editor )
		if ( answer.success )
			return { success: true, data: data };
		return { success: false, error: answer.error };
	}
	escape( force )
	{
		if ( !force )
		{
			if ( this.working )
				return;
		}
		if ( this.chain.getLength() > 0 )
		{
			// Prevent re-interpretation of the last command
			var self = this;
			if ( this.handleNoCommand )
			{
				clearInterval( self.handleNoCommand );
				this.handleNoCommand = null;
			}
			this.noCommand = true;
			this.handleNoCommand = setTimeout( function()
			{
				self.noCommand = false;
				self.handleNoCommand = null;
			}, 500 );

			// Revert to checkpoint
			var bubble = this.chain.pop();
			if ( this.chain.length == 0 )
			{
				this.promptOn = false;
			}
		}
	}
	destroy()
	{
		this.destroyEventHandlers( this );
	}
};
module.exports.Prompt = Prompt;
