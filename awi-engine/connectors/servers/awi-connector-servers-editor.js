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
* @file awi-connector-servers-editor.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Connector opening a WebSocket server on the machine
*        to receive / send prompts.
*/
var awiawi = require( '../../awi' );
var awiconnector = require( '../awi-connector' );
const ws = require( 'ws' );

class ConnectorServerEditor extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Editor Server';
		this.token = 'editor';
		this.classname = 'server';
		this.version = '0.2.1';
		this.connected = false;
		this.editors = {};
	}
	async connect( options )
	{
		super.connect( options );
		if ( !this.wsServer )
		{
			var self = this;
			this.wsServer = new ws.Server( { port: 1033 } );
			this.wsServer.on( 'connection', function( ws )
			{
				var connection = ws;
				console.log( 'User connected.' );
				connection.on( 'message',
					function( json )
					{
						var message = JSON.parse( json );
						if ( message.command == 'connect' )
						{
							self.user_connect( connection, message );
						}
						else
						{
							var editor = self.editors[ message.handle ];
							if ( editor )
							{
								editor.lastMessage = message;
								try
								{
									self[ 'command_' + message.command ]( editor, message );
									return;
								} catch( e ) { }
								this.reply( editor, { error: 'awi:unknown-command:iwa' } );
							}
						}
					} );
				connection.on( 'close',
					function( reasonCode, description )
					{
						console.log( 'User disconnected.' );
						self.close( null, { connection: connection } );
					} );

			} );
		}
		this.connected = true;
		this.connectAnswer.data.token = this.classname;
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}
	async user_connect( connection, message )
	{
		var handle = this.awi.utilities.getUniqueIdentifier( this.editors, message.data.key.substring( 0, 5 ), 0 );
		var editor = {
			handle: handle,
			lastMessage: message,
			inputDisabled: 0,
			reroute: undefined,
			connection: connection,
			config: message.data.config,
			toAsk: [],
			resultText: [],
			resultTextClean: [],
			self: this,
			awi: this };
		this.editors[ handle ] = editor;

		var config = message.data.config;
		config.configurations = typeof config.configurations == 'undefined' ? this.awi.config.getConfigurationPath() : config.configurations;
		config.engine = typeof config.engine == 'undefined' ? this.awi.config.getEnginePath() : config.engine;
		config.data = typeof config.data == 'undefined' ? this.awi.config.getDataPath() : config.data;
		editor.awi = new awiawi.Awi( config );
		var answer = await editor.awi.connect( { fromAwi: this.awi, preserveConnectors: [ 'servers-editor' ] } );
		if ( answer.success )
		{
			setTimeout( async function()
			{
				var response = {
					responseTo: 'connect',
					callbackId: message.callbackId,
					data: {
						handle: handle,
					} };
				connection.send( JSON.stringify( response ) );
			}, 500 )
		}
	}
	reply( editor, response )
	{
		response.handle = editor.lastMessage.handle;
		response.responseTo = editor.lastMessage.command;
		response.callbackId = editor.lastMessage.callbackId;
		editor.connection.send( JSON.stringify( response ) );
	}
	sendMessage( editor, command )
	{
		editor.connection.send( JSON.stringify( command ) );
	}
	async command_ask( editor, message )
	{
		editor.resultText = [];
		editor.resultTextClean = [];
		if ( editor.inputDisabled == 0 )
		{
			if ( editor.reroute )
				editor.reroute( message.data.prompt, {}, { editor: editor } );
			else
				editor.awi.prompt.prompt( message.data.prompt, {}, { editor: editor } );
		}
		else
		{
			editor.toAsk.push( message );
			if ( editor.toAsk.length == 1 )
			{
				editor.handleAsk = setInterval(
					function()
					{
						if ( editor.inputDisabled == 0 )
						{
							if ( editor.toAsk.length > 0 )
							{
								var message = editor.toAsk.pop();
								if ( editor.reroute )
									editor.reroute( message.data.prompt, {}, { editor: editor } );
								else
									editor.awi.prompt.prompt( message.data.prompt, {}, { editor: editor } );
							}
							else
							{
								clearInterval( editor.handleAsk );
								editor.handleAsk = null;
							}
						}
					}, 100 );
			}
		}
	}
	async command_understand( editor, message )
	{
		var buffer = editor.awi.utilities.convertStringToArrayBuffer( message.data.promptAudio );
		var view = new Uint8Array( buffer );
		//var path = await editor.awi.system.getTempPath( 'ask', 'webm' );
		var path = '/home/francois/temp/sound.webm';
		var answer = await editor.awi.system.writeFile( path, view, {} );
		if ( answer.success )
		{
			var transcription = await editor.awi.client.createTranscription( '', path, { response_format: 'srt' } );
			if ( transcription.success )
			{
				// Convert SRT to text
				var lines = transcription.data.split( '\n' );
				var prompt = '';
				for ( var l = 0; l < lines.length; l++ )
				{
					var number = parseInt( lines[ l ] );
					if ( isNaN( number ) || number == 0 )
						break;
					for ( var ll = 2; ll + l < lines.length; ll++ )
					{
						if ( !lines[ ll + l ] )
							break;
						prompt += lines[ ll + l ] + ' ';
					}
				}
				message.data.prompt = prompt;
				await this.command_ask( editor, message );
			}
		}
	}
	print( editor, text, options = {} )
	{
		var prompt = this.awi.config.getPrompt( options.user );
		if ( !prompt )
			return;
		if ( typeof text == 'string' )
			text = text.split( '\n' );
		function printLinesDown( lines )
		{
			for ( var l = 0; l < lines.length; l++ )
			{
				console.log( prompt + lines[ l ] );
				if ( editor )
				{
					editor.resultText.push( prompt + lines[ l ] );
					editor.resultTextClean.push( lines[ l ] );
				}
			}
		}
		for ( var t = 0; t < text.length; t++ )
		{
			var line = this.interpretLine( text[ t ] );
			if ( !options.noJustify )
				printLinesDown( this.awi.utilities.justifyText( line, 80 ) );
			else
			{
				console.log( prompt + line );
				if ( editor )
				{
					editor.resultText.push( prompt + line );
					editor.resultTextClean.push( lines[ l ] );
				}
			}
		}
	}
	rerouteInput( editor, route )
	{
		editor.reroute = route;
	}
	disableInput( editor )
	{
		editor.inputDisabled++;
	}
	setPrompt( editor, prompt )
	{
	}
	saveInputs( editor )
	{
		editor.pushedInputs = editor.inputDisabled;
		editor.inputDisabled = 1;
	}
	restoreInputs( editor )
	{
		editor.inputDisabled = editor.inputDisabled;
	}
	waitForInput( editor, options = {} )
	{
		editor.inputDisabled--;

		if ( options.force || editor.inputDisabled == 0 )
		{
			editor.inputDisabled = 0;
			var response = {
				data: {
					text: editor.resultText.join( '\n' ),
					textClean: editor.resultTextClean.join( '\n' )
				} };
			this.reply( editor, response );
			editor.resultText = [];
			editor.resultTextClean = [];
		}
	}
	close( editor, options = {} )
	{
		var newEditors = {};
		if ( options.connection )
		{
			for ( var handle in this.editors )
			{
				if ( this.editors[ handle ].connection != options.connection )
					newEditors[ handle ] = this.editors[ handle ];
			}
		}
		else
		{
			var handle = editor;
			if ( this.awi.utilities.isObject( editor ) )
				handle = editor.handle;
			for ( var e in this.editors )
			{
				if ( e != handle )
					newEditors[ e ] = this.editors[ e ];
			}
		}
		this.editors = newEditors;
	}
	activateEvents( editor )
	{
		editor.eventsActivated = true;
	}
	deactivateEvents( editor )
	{
		editor.eventsActivated = false;
	}
	blockCursor( editor, onOff, callback, extra )
	{
		editor.blockCursorOn = onOff;
	}
	wait( editor, onOff, options = {} )
	{
		editor.waitingOn = onOff;
	}
	interpretLine( line )
	{
		return line;
	}
}
module.exports.Connector = ConnectorServerEditor;
