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
* @file awi-connector-editors-promptserver.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Connector opening a WebSocket server on the machine
*        to receive / send prompts.
*/
var awiconnector = require( '../awi-connector' );
const ws = require( 'ws' );

class ConnectorEditorPromptServer extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Prompt Server';
		this.token = 'promptserver';
		this.classname = 'editor';
		this.version = '0.2.1';
		this.connected = false;
		this.inputEnabled = false;
		this.reroute = undefined;
		this.connections = {};
		this.range = { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } };
	}
	async connect( options )
	{
		super.connect( options );

		var self = this;
		this.wsServer = new ws.Server( { port: 1033 } );
		this.wsServer.on( 'connection', function( ws )
		{
			var wsConnectionPending = ws;
			console.log( 'User connected.' );
			self.print( self, 'Hello... :)', { user: 'awi' } );
//			setTimeout( function()
//			{
//				self.waitForInput( self.awi.config.getPrompt( 'user' ) );
//			}, 1000 );
			wsConnectionPending.on( 'message',
				function( json )
				{
					var message = JSON.parse( json );
					if ( message.command == 'connect' )
					{
						self.doConnect(  message, wsConnectionPending );
					}
					else
					{
						var connection = self.connections[ message.handle ];
						if ( connection )
						{
							try
							{
								self[ 'command_' + message.command ]( message, connection );
								return;
							}
							catch( e )
						{
						}
							this.reply( { error: 'awi:unknown-command:iwa' }, message );
						}
					}
				} );
			wsConnectionPending.on( 'close',
				function( reasonCode, description )
				{
					console.log( 'User disconnected.' );
					self.wsConnection = null;
				} );
		} );

		this.connected = true;
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}
	async doConnect( message, connection )
	{
		if ( message.data.key && !this.connections[ message.key ] )
		{
			var handle = this.awi.utilities.getUniqueIdentifier( this.connections, 'awi', this.connectionCount );
			this.connections[ handle ] =
			{
				key: message.key,
				handle: handle,
				connection: connection,
				config: message.config,
				awi: this
			}
			var response =
			{
				responseTo: 'connect',
				data:
				{
					handle: handle
				}
			}
			this.reply( response, message, connection );
		}
	}
	reply( response, message, connection )
	{
		response.responseTo = message.command;
		response.callbackId = message.callbackId;
		connection.send( JSON.stringify( response ) );
	}
	async command_ask( message, connection )
	{
		if ( this.inputEnabled )
		{
			if ( this.reroute )
				this.reroute( message.data.text, {}, {} );
			else
				this.awi.prompt.prompt( message.data.text, {}, {} );
		}
	}
	rerouteInput( route )
	{
		this.reroute = route;
	}
	disableInput()
	{
		this.inputEnabled = false;
	}
	waitForInput( line )
	{
		this.inputEnabled = true;
		console.log( 'Waiting for input from ' + line );
		var message =
		{
			type: 'waitForInput',
			data:
			{
				text: line
			}
		}
		if ( this.wsConnection )
		{
			var self = this;
			setTimeout(
				function()
		{
					self.wsConnection.send( JSON.stringify( message ) );
				}, 500 );
		}
	}
	close()
	{
	}
	fillPaths( paths )
	{
		for ( var p in paths )
			paths[ p ] = this.atom.aozConfig.installInformation.runPaths[ p ];
	}
	activateEvents()
	{
		this.eventsActivated = true;
	}
	deactivateEvents()
	{
		this.eventsActivated = false;
	}
	blockCursor( onOff, callback, extra )
	{
		// Block the cursor on the command line
		this.blockCursorOn = onOff;
	}
	wait( onOff, options = {} )
	{
		this.waitingOn = onOff;
	}
	interpretLine( line )
	{
		return line;
	}
	print( parent, text, options = {} )
	{
		var result = '';

		var prompt = this.awi.config.getPrompt( options.user );
		if ( !prompt )
			return;
		var row = 0;
		if ( typeof text == 'string' )
			text = text.split( '\n' );
		function printLinesDown( lines )
		{
			for ( var l = 0; l < lines.length; l++ )
			{
				result += prompt + lines[ l ] + '/n';
				row++;
			}
		}
		for ( var t = 0; t < text.length; t++ )
		{
			var line = this.interpretLine( text[ t ] );
			if ( !options.noJustify )
				printLinesDown( this.awi.utilities.justifyText( line, 80 ) );
			else
			{
				result += prompt + line + '\n';
				row++;
			}
		}

		// Send message.
		if ( this.wsConnection )
		{
			var response =
			{
				type: 'response',
				data:
				{
				text: result
			}
			}
			console.log( 'Sending response: ' + result );
			this.wsConnection.send( JSON.stringify( response ) );
		}
	}
	decorateLine( row, user )
	{
	}
	getStartPrompt( range )
	{
		return range;
	}
	createCheckpoint( range )
	{
		return range;
	}
	startAnimation( characterName, animationName, options = {} )
	{
	}
	printAnimation( characterName, animationName, options = {} )
	{
	}
	stopAnimation()
	{
	}
	playVideo( path, options = {} )
	{
	}
	playAudio( path, options = {} )
	{
	}
	viewFile( file, options )
	{
	}
	getLine( row )
	{
		return '';
	}
	setLine( row, text, options = {} )
	{
	}
	insertLine( row, text/*, options = {} */)
	{
	}
	deleteLine( row, options = {} )
	{
	}
	getRow()
	{
		return 0;
	}
	getColumn()
	{
		return 0;
	}
	getPosition()
	{
		return [ 0, 0 ];
	}
	setPosition( row, column )
	{
	}
	setColumn( column )
	{
	}
	setRow( row )
	{
	}
	moveUp( nTimes )
	{
	}
	moveDown( nTimes )
	{
	}
	moveLeft( nTimes )
	{
	}
	moveRight( nTimes )
	{
	}
}
module.exports.Connector = ConnectorEditorPromptServer;
