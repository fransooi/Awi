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
* @version 0.2
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
		this.connector = awi.connectors.editors.current;
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
			this.connector.blockCursor( true );
		}
		if ( control.printPrompt )
		{
			this.awi.editor.print( this, line.split( '\n' ), { user: 'user' } );
			control.printPrompt = false;
		}
		if ( control.range && control.range.start )
		{
			var line2 = this.connector.getLine( control.range.start.row + 1 );
			if ( line2 != '' )
			{
				line += line2;
				this.connector.deleteLine( control.range.start.row + 1 );
				this.connector.setLine( control.range.start.row, line );
			}
			this.connector.decorateLine( control.range.start.row, 'user' );
		}

		this.awi.editor.disableInput();

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
					var answer = await this.awi.config.setUser( userName );
					if ( answer.success )
					{
						answer = await this.awi.loadUser( userName );
						if ( answer.success )
						{
							logged = true;
							line = 'Please say hello to ' + userName + ' with a short joke about programming...';
							this.awi.editor.print( this, 'User changed to ' + userName + '\n', { user: 'information' } );
						}
						else
							this.awi.editor.print( this, 'Cannot load memories...\n', { user: 'error' } );
					}
					else
						this.awi.editor.print( this, 'Cannot change user to ' + userName + '\n', { user: 'error' } );
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
					this.awi.editor.print( this, 'List of registered users on this machine...', { user: 'information' } );
					for ( var l = 0; l < list.length; l++ )
						this.awi.editor.print( this, '    ' + list[ l ].fullName, { user: 'information' } );
					this.awi.editor.print( this, 'Please enter the first name of a user, or "newuser"...', { user: 'information' } );
					this.awi.editor.waitForInput( this.awi.config.getPrompt( 'question' ) );
					return { success: false, error: 'awi:not-user-logged:iwa' };
				}
			}
		}
		if ( line == '' )
		{
			this.awi.editor.waitForInput( this.awi.config.getPrompt( 'user' ) );
			return { success: true, data };
		}

		// A normal bubble...
		line = this.branch.addBubbleFromLine( line, {} );
		control.start = 'current';
		control.questionCount = this.questionCount++;
		var answer = await this.branch.play( line, data, control );
		control.questionCount = undefined;
		if ( answer.success && answer.data == 'noprompt' )
			this.awi.editor.waitForInput( '' );
		else
			this.awi.editor.waitForInput( this.awi.config.getPrompt( 'user' ) );
		return answer;
	}
	async getParameters( parameters, data, control = {} )
	{
		var data = {};
		var parameters = this.awi.utilities.copyObject( parameters );
		var answer = { success: true, data: {} };
		for ( var p = 0 ; p < parameters.length; p++ )
		{
			var bubble = this.branch.newBubble( { token: 'input', classname: 'generic', parent: 'prompt', parameters: {} }, [], control );
			var parameter = { inputInfo: this.awi.utilities.getBubbleParams( parameters[ p ] ) };
			answer = await bubble.play( '', parameter, control );
			if ( !answer.success )
				break;
			for ( var d in answer.data )
				data[ d ] = answer.data[ d ];
		}
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
			this.connector.revertToCheckpoint( bubble.checkpoint );
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
	wait( bubble, onOff, options = {} )
	{
		this.connector.wait( onOff, options );
	}
	getLineYesOrNo( bubble, line, defaultAnswer, defaultAnswerReturn )
	{
		if ( typeof defaultAnswer != 'undefined' && line == '' )
			return defaultAnswerReturn;
		var yes = 'Yes';
		var no = 'No';
		if ( line.charAt( 0 ).toLowerCase() == yes.charAt( 0 ) )
			return true;
		if ( line.charAt( 0 ).toLowerCase() == no.charAt( 0 ) )
			return false;
		this.print( bubble, [ 'Please answer yes or no...' ] );
		return undefined;
	}
	removeBasePath( path )
	{
		path = this.awi.utilities.normalize( path );
		for ( var d = 0; d < this.directories.length; d++ )
		{
			var startPath = this.awi.utilities.normalize( this.awi.config.getConfig( 'user' ).path[ this.directories[ d ] ] );
			if ( startPath && path.indexOf( startPath ) == 0 )
			{
				path = path.substring( startPath.length + 1 );
				break;
			}
		}
		return path;
	}
	playVideo( bubble, path, options = {} )
	{
		return this.editorConnector.playVideo( path, options );
	}
	playAudio( bubble, path, options = {} )
	{
		return this.editorConnector.playAudio( path, options );
	}
	viewFile( bubble, file, options = {} )
	{
		return this.editorConnector.viewFile( file.path, options );
	}


	// Comment selected code
	commentSelectedCode( source )
	{
		// Not more than 20 lines
		var temp = source.split( '\r\n' ).join( '\n' ).split( '\n' );
		if ( temp.length == 0 )
			return;
		if ( temp.length > 20 )
		{
			this.editorConnector.alert( 'Cannot comment more than 20 lines...' );
			return;
		}

		// Connects to server
		var self = this;
		this.editorConnector.showPanel( 'wait', '...working...' );
		this.awiManager.connect( {}, function( response )
		{
			if ( response )
			{
				// Get the tokens of the block
				var saveSource = source;
				this.editorConnector.extractTokens( source, {}, function( response, tokens )
				{
					if ( response )
					{
						var source = saveSource.split( '\r\n' ).join( '\n' ).split( '\n' );

						// Remove comments and empty lines...
						var lines = [];
						var linesIndex = [];
						for ( var l = 0; l < source.length; l++ )
						{
							var line = source[ l ].trim();
							if ( line != '' )
							{
								var comment = line.indexOf( '//' );
								if ( comment != 0 )
								{
									lines.push( source[ l ] );
									linesIndex.push( l );
								}
							}
						}

						// Generate prompt
						var prompt = this.awi.utilities.format( self.awiManager.getPrompt( 'ai-comment-code-prompt' ),
						{
							name: this.awi.getConfig( 'user' ).awiMame,
							mood: this.awi.getConfig( 'user' ).awiMood,
							bubble: '',
							context: this.messages.generateContext( tokens ),
							code: lines.join( '\n' )
						} );

						self.awi.client.sendCompletion( prompt, false, function( response, data )
						{
							if ( response && data.response && data.data.response )
							{
								var result = data.data.data.choices[ 0 ].text.trim();

								// Parse results and create the remarks
								var temp = result.split( '\n' );
								result = [];
								for ( var l = 0; l < temp.length; l++ )
								{
									temp[ l ] = temp[ l ].trim();
									if ( temp[ l ] != '' )
										result.push( temp[ l ] );
								}
								var newLines = [];
								for ( var l = 0; l < Math.min( result.length, lines.length ); l++ )
								{
									var resultLine = result[ l ];
									var start = resultLine.indexOf( ':' ) + 1;
									var plus = resultLine.substring( start ).trim();

									// Eliminates duplication of the line.
									var lineSource = lines[ l ].trim();
									var pos = plus.indexOf( lineSource );
									if ( pos >= 0 )
										plus = plus.substring( 0, pos ) + plus.substring( pos + lineSource.length ).trim();
									plus = plus.charAt( 0 ).toUpperCase() + plus.substring( 1 );

									// Remove - or :
									if ( plus.charAt( 0 ) == ':' )
										plus = plus.substring( 1 ).trim();
									if ( plus.charAt( 0 ) == '-' )
										plus = plus.substring( 1 ).trim();

									// Count the tabs of original source
									var tab = 0;
									var code = lines[ l ];
									for ( var p = 0; p < code.length; p++ )
									{
										if ( code.charAt( p ) == ' ' )
											tab++;
										else if ( code.charAt( p ) == '\t' )
											tab += 4;
										else
											break;
									}
									var nTabs = Math.floor( tab / 4 );
									var tabs = '';
									if ( nTabs )
										tabs += '\t'.repeat( nTabs );
									var nSpaces = tab - nTabs * 4;
									if ( nSpaces )
										tabs += ' '.repeat( nSpaces );
									while ( plus.length > 80 )
									{
										var space = Math.min( plus.length, 80 );
										var sp = plus.indexOf( ' ' );
										while( sp >= 0 && sp < 80 )
										{
											space = sp;
											sp = plus.indexOf( ' ', sp + 1 );
										}
										newLines.push( tabs + '// ' + plus.substring( 0, space ) );
										plus = plus.substring( space + 1 );
									}
									if ( plus.length > 0 )
										newLines.push( tabs + '// ' + plus );

									// Push back original line.
									newLines.push( lines[ l ] );
								}
								var row = self.editorConnector.getRow();
								self.editorConnector.moveToBeginningOfLine();
								for ( var l = 0; l < newLines.length; l++ )
								{
									self.editorConnector.insertLine( row, newLines[ l ] );
								}
							}
							self.editorConnector.destroyPanel( 'wait' );
						} );
					}
				} );
			}
			else
			{
				self.editorConnector.destroyPanel( 'wait' );
			}
		} );
	}
};
module.exports.Prompt = Prompt;
