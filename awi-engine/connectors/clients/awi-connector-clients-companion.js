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
* @file awi-connector-servers-server.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Connector to Open-Ai via companion server
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorClientCompanion extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options )
		this.name = 'Companion Server client';
		this.token = 'companion';
		this.classname = 'client';
		this.version = '0.2.1';

		this.url = awi.config.getServerUrl();

		this.cancelled = false;
		this.connected = false;
		this.connecting = false;
		this.prompts = {}
		this.callbacks = {};
		this.connectionHandle = '';
		this.handleTimeout = 0;
		this.handleSendInterval = 0;
		this.tryConnectings = [];
		this.waitingConnectings = false;		
		this.messageCount = 0;
	}
	async connect( options ) 
	{
		super.connect( options );
		if ( this.connected ) 
		 	return; 

		this.connectAnswer = null;
		doConnect( {}, 
			function( response, data )
			{
				this.connectAnswer = data;
			}, extra );

		return new Promise( ( resolve ) => 
		{
			const checkConnection = () => 
			{
				if ( this.connectedAnswer ) 
				{
					resolve( this.connectedAnswer );
				} 
			};
			checkConnection();
		} );
	}	
	async doConnect( options = {}, callback, extra )
	{
		if ( this.connected )
		{
			callback( true, {}, extra );
			return true;
		}
		if ( this.connecting )
		{
			callback( false, {}, extra );
			return false;
		}
		
		var self = this;
		self.connecting = true;
		function onOpen()
		{
			self.handleSendInterval = setInterval( function()
			{
				if ( self.wsClient.readyState == 1 )
				{
					if ( !self.waiting && self.messages.length > 1 )
					{
						var messageInfo = self.messages.pop();
						self.sendMessageAndCallback( messageInfo );
					}
				}
			}, 500 );

			var message = 
			{
				command: 'connect',
				name: 'aoz',
				data: { key: 'Some identification data' }
			};
			self.sendMessage( message, false, function( success, data, extra  )
			{
				if ( success )
				{					
					self.connectionHandle = data.handle;
					var coded = '';
					var code = data.code;
					var aikey = self.awi.config.getUserKey();
					if ( typeof aikey == 'undefined' || aikey == '' )	
					{
						if ( !options.noErrors )
							self.awi.alert( 'Please insert your OpenAI key...' );
						callback( false, 'awi:openai_connect_error:iwa', extra );
						self.connecting = false;
						return;
					}
					for ( var c = 0; c < aikey.length; c++ )
						coded += String.fromCharCode( aikey.charCodeAt( c ) ^ code.charCodeAt( c ) );		
					var message = 
					{
						handle: self.connectionHandle,
						command: 'openAPI',
						name: 'openai',
						data: { key: coded }
					};
					self.sendMessage( message, false, function( success, data, extra )
					{
						self.connected = success;
						self.connecting = false;
						callback( success, { name: self.name, data: { prompt: 'Awi Server Connector ' + self.version, version: self.version } }, extra );
					}, 'force' );
				}
				else
				{
					self.connecting = false;
					callback( false, 'awi:openai_connect_error:iwa', extra );
				}
			}, 'force' );
		}
		function onMessage( data )
		{
			self.waiting = false;
			var responseData = data.data;
			if ( responseData )
			{
				if ( typeof responseData == 'string' )
				{
					try
					{
						responseData = JSON.parse( responseData );
					}
					catch ( e )
					{
						responseData = {};
					}
				}
				if ( self.awi.connectors.editors.current )
					self.awi.editor.print( self, [ 'Message received: ' +  responseData.toString() ], { user: 'debug3' } );
				if ( responseData.callbackId )
				{
					var callback = self.callbacks[ responseData.callbackId ];
					if ( callback )
					{
						if ( !callback.stream )
							self.callbacks[ responseData.callbackId ] = undefined;
						callback.callback( true, responseData, callback.extra );
					}
				}
			}
		}
		function onError( /*message*/ )
		{
			self.connected = false;
			self.connecting = false;
			self.waiting = false;
			self.wsClient.close();
			self.wsClient = null;
			callback( false, 'awi:network_error:iwa', self.systemCallbackExtra );	
			if ( !options.noErrors )
				self.awi.alert( 'Awi server disconnected...', false, null );
		}
		this.wsClient = new websocket( this.url );
		this.wsClient.onopen = onOpen;
		this.wsClient.onmessage = onMessage;
		this.wsClient.onerror = onError;
	}
	sendCompletion( prompt, stream, callback, extra )
	{
		var message = 
		{
			handle: this.connectionHandle,
			command: 'callAPI',
			name: 'openai',
			data: 
			{
				command: 'createCompletion',
				options: {
					prompt: prompt,
					max_tokens: 1000,
					temperature: 0.0,
					top_p: 1,
					n: 1
				}
			}
		};
		this.sendMessageAndCallback( { message: message, callback: 
			function( success, answer, options )
			{
				if ( answer.response && answer.data.response )
				{
					callback( true, answer.data.data.choices[ 0 ], options );
				}
			}, extra: extra, stream: stream } );
	}
	sendMessage( message, stream, callback, extra )
	{
		this.sendMessageAndCallback( { message: message, callback: callback, extra: extra, stream: stream } );
	}
	sendMessageAndCallback( messageInfo )
	{
		if ( this.waiting )
		{
			this.messages.push( messageInfo );
			return;
		}
		if ( this.connected || ( typeof messageInfo.extra != 'undefined' && messageInfo.extra == 'force' ) )
		{
			if ( this.handleTimeout )
			{
				clearTimeout( this.handleTimeout );
				this.handleTimeout = null;
			}

			var self = this;
			this.waiting = true;
			self.handleTimeout = setTimeout( function()
			{
				self.cancelled = true;
				self.waiting = false;
				clearTimeout( self.handleTimeout );
				self.handleTimeout = null;
				messageInfo.callback( false, 'awi:ai-time_out:iwa', messageInfo.extra );
			}, 1000 * 30 );

			messageInfo.callbackId = this.awi.utilities.getUniqueIdentifier( self.callbacks, 'awi', this.messageCount++, '{day}/{month}/{year}.{hour}:{minute}:{second}:{milli}' );
			messageInfo.message.callbackId = messageInfo.callbackId;
			self.callbacks[ messageInfo.callbackId ] = messageInfo;
			self.cancelled = false;
			self.wsClient.send( JSON.stringify( messageInfo.message ) );
			if ( self.awi.connectors.editors.current )
				self.awi.editor.print( self, [ 'Message sent: ' +  messageInfo.message.toString() ], { user: 'debug3' } );
		}
	}
}
module.exports.Connector = ConnectorClientCompanion