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
* @short Main class
*
*/
var awimessages = require( './awi-messages' )
var awiprompt = require( './awi-prompt' )
var awipersonality = require( './awi-personality' )
var awiconfig = require( './awi-config' );
var awirequires = require( './awi-requires' );

class Awi
{
	constructor( config, options = {} )
	{
		this.awi = this;
		this.oClass = 'awi';
		this.systemConfig = config;
		this.version = '0.2.1';
		this.host = config.host;
		this.options = options;
		this.user = options.user;
		this.bubbles = {};
		this.souvenirs = {};
		this.memories = {};
		this.connectors = {};
		this.newSouvenirs = {};
		this.newMemories = {};
		this.newBubbles = {};
		this.newConnectors = {};
		this.directRemembering = [];
		this.indirectRemembering = [];
		this.editor = null;
		this.system = null;
		this.language = null;
		this.messages = null;
		this.config = new awiconfig.Config( this, config );
	}
	async connect( options = {} )
	{
		var self = this;
		var answers = {};
		var files =
		{
			bubbles: {},
			connectors: {},
			memories: {},
			souvenirs: {}
		}
		async function createConnector( classname, name, options, def )
		{
			var exports = require( './connectors/' + classname + '/' + 'awi-connector-' + classname + '-' + name );
			self.connectors[ classname ] = ( typeof self.connectors[ classname ] == 'undefined' ? {} : self.connectors[ classname ] );
			self.newConnectors[ classname ] = ( typeof self.newConnectors[ classname ] == 'undefined' ? {} : self.newConnectors[ classname ] );
			self.connectors[ classname ][ name ] = new exports.Connector( self, options );
			self.newConnectors[ classname ][ name ] = exports.Connector;
			if ( def )
			{
				var answer = await self.connectors[ classname ][ name ].connect( options );
				answers[ answer.data.classname ] = [ { success: answer.success, nonFatal: answer.nonFatal, data: answer.data } ];
				self[ answer.data.token ] = self.connectors[ classname ][ name ];
				self.connectors[ classname ].current = self.connectors[ classname ][ name ];
				if ( classname == 'utilities' && name == 'utilities' )
					await self.config.init();
			}
		}
		async function createBubble( classname, name, options = {} )
		{
			self.bubbles[ classname ] = ( typeof self.bubbles[ classname ] == 'undefined' ? {} : self.bubbles[ classname ] );
			options.key = self.utilities.getUniqueIdentifier( {}, name, f );
			options.parent = '';
			var exports = require( './bubbles/' + classname + '/' + 'awi-bubble-' + classname + '-' + name );
			self.bubbles[ classname ][ name ] = new exports.Bubble( self, options );
			self.newBubbles[ classname ] = ( typeof self.newBubbles[ classname ] == 'undefined' ? {} : self.newBubbles[ classname ] );
			self.newBubbles[ classname ][ name ] = exports.Bubble;
		}
		async function createMemory( classname, name )
		{
			var exports = require( './memories/' + classname + '/' + 'awi-memory-' + classname + '-' + name );
			self.newMemories[ classname ] = ( typeof self.newMemories[ classname ] == 'undefined' ? {} : self.newMemories[ classname ] );
			self.newMemories[ classname ][ name ] = exports.Memory;
		}
		async function createSouvenir( classname, name )
		{
			var exports = require( './souvenirs/' + classname + '/' + 'awi-souvenir-' + classname + '-' + name );
			self.newSouvenirs[ classname ] = ( typeof self.newSouvenirs[ classname ] == 'undefined' ? {} : self.newSouvenirs[ classname ] );
			self.newSouvenirs[ classname ][ name ] = exports.Souvenir;
		}
		async function createIt( element, elementname, classname, name )
		{
			switch ( elementname )
			{
				case 'connectors':
					await createConnector( classname, name, element.options, element.default );
					return;
				case 'bubbles':
					await createBubble( classname, name, element.options );
					return;
				case 'memories':
					await createMemory( classname, name, element.options );
					return;
				case 'souvenirs':
					await createSouvenir( classname, name, element.options );
					return;
			}
		}
		for ( var c = 0; c < this.systemConfig.elements.length; c++ )
		{
			var element = this.systemConfig.elements[ c ];
			var dot = element.name.indexOf( '.' );
			var dot2 = element.name.indexOf( '.', dot + 1 );
			var elementname = element.name.substring( 0, dot );
			var classname = element.name.substring( dot + 1, dot2 );
			var name = element.name.substring( dot2 + 1 );
			if ( name.indexOf( '*' ) >= 0 || name.indexOf( '?' ) >= 0 )
			{
				name += '.js';
				if ( files[ elementname ][ classname ] == null )
				{
					var answer = await this.system.getDirectory( this.config.getEnginePath() + '/' + elementname + '/' + classname, { recursive: true, filters: [ name ] } );
					files[ elementname ][ classname ] = this.utilities.getFileArrayFromTree( answer.data );
				}
				for ( var f = 0; f < files[ elementname ][ classname ].length; f++ )
				{
					var file = files[ elementname ][ classname ][ f ];
					name = file.name.substring( 0, file.name.lastIndexOf( '.' ) );
					name = name.substring( name.lastIndexOf( '-' ) + 1 );
					await createIt( element, elementname, classname, name );
				}
			}
			else
			{
				await createIt( element, elementname, classname, name );
			}
		}

		// Create messages
		this.messages = new awimessages.Messages( this, {} );
		await this.messages.loadMessages();

		// Create personality
		this.personality = new awipersonality.Personality( this, {} );

		// Is everyone connected?
		this.connected = true;
		for ( var d in answers )
		{
			for ( var dd = 0; dd < answers[ d ].length; dd++ )
			{
				if ( !answers[ d ][ dd ].success )
				{
					if ( !answers[ d ][ dd ].nonFatal )
					{
						this.connected = false;
						break;
					}
				}
			}
		}
		var answer = {};
		var prompt = '\nThe Awi-Engine version ' + this.version + '\n';
		prompt += 'By Francois Lionet (c) 2023\n';
		prompt += 'Open-source, please read the licence.\n';
		prompt += '\n';
		if ( this.connected )
		{
			if ( !this.connectors.editors )
				this.connectors.editors = {};
			if ( options.editor )
			{
				this.editor = options.editor;
				this.connectors.editors.current = options.editor;
			}
			this.prompt = new awiprompt.Prompt( this, { parameters: { senderName: '', receiverName: '' } } );	// TODO: fix this.
			answer.success = true;
		}
		else
		{
			prompt += 'Cannot connect!\n';
			answer.success = false;
			answer.error = 'awi:cannot-initialize:iwa';
			console.log( prompt );
			console.log( answers );
		}
		for ( var d in answers )
		{
			for ( var dd = 0; dd < answers[ d ].length; dd++ )
			{
				var data = answers[ d ][ dd ].data;
				prompt += ( answers[ d ][ dd ].success ? '(ok) ' : '(  ) ' ) + data.classname + ': ' + data.prompt + '\n';
			}
		}
		if ( this.connected )
			prompt += 'Ready.\n'
		if ( this.editor.connected && !options.fromAwi )
			this.editor.print( this.editor.default, prompt.split( '\n' ), { user: 'awi' } );
		return answer;
	}
	getConfig( type )
	{
		return this.config.getConfig( type );
	}
	getPersonality( name )
	{
		return this.config.getPersonality( name );
	}
	getConnector( classname, name, options = {} )
	{
		return this.connectors[ classname ][ name ];
	}
	cleanResponse( text )
	{
		// Get rid of empty lines.
		text = text.trim().split( '\n' );
		var newText = '';
		for ( var t = 0; t < text.length; t++ )
		{
			text[ t ] = text[ t ].trim();
			if ( text[ t ] )
				newText += text[ t ] + '\n';
		}
		text = newText;

		// Remove names at start of line.
		var personality = this.getPersonality();
		var user = this.getConfig( 'user' );
		var pos;
		while ( ( pos = text.indexOf( personality.name + ':' ) ) >= 0 )
			text = text.substring( 0, pos ) + text.substring( pos + personality.name.length + 1 ).trim();
		while ( ( text.indexOf( user.name + ':' ) >= 0 ) )
			text = text.substring( 0, pos ) + text.substring( pos + user.name.length + 1 ).trim();
		return text.trim().split( '\n' );
	}
	alert( message, options )
	{
		console.error( message );
	}
	systemWarning( message )
	{
		console.warn( message );
		if ( this.editor && this.editor.connected )
			this.editor.print( this, message.split( '\n' ), { user: 'systemwarning' } );
	}
	async prompt( prompt, data, control )
	{
		var callback = control.callback;
		var extra = control.extra;
		control.callback = null;
		control.extra = null;
		var answer = await this.prompt.prompt( prompt, data, control );
		if ( callback )
			callback( true, answer, extra );
		return answer;
	}
	initMemory( memory )
	{
		//memory.bubbleHash = {};
		//for ( var key in memory.bubbleMap )
		//	memory.bubbleHash[ memory.bubbleMap[ key ] ] = key;
		return memory;
	}
	async save( user )
	{
		user = typeof user == 'undefined' ? this.config.user : user;
		var answer = await this.personality.saveMemories( 'any' );
		//if ( !answer.success )
			return answer;

		//var conversations = this.utilities.serializeOut( this.prompt, '' );
		//var path = this.config.getConfigurationPath() + '/' + user + '-';
		//return await this.system.writeFile( path + 'conversations.js', conversations, { encoding: 'utf8' } );
	}
	async loadUser( user )
	{
		user = typeof user == 'undefined' ? this.config.user : user;

		var answer = await this.personality.loadMemories( 'any' );
		if ( !answer.success )
			return answer;

		var path = this.config.getConfigurationPath() + '/' + user + '-';
		var conversations;
		answer = await this.system.exists( path + 'conversations.js' );
		if ( answer.success )
		{
			answer = await this.system.readFile( path + 'conversations.js', { encoding: 'utf8' } );
			if ( answer.success )
			{
				conversations = answer.data;
				try
				{
					conversations = Function( conversations );
					conversations = conversations();
					this.utilities.serializeIn( conversations.root, {} );
					return { success: true };
				}
				catch( e )
				{
				}
			}
			return { success: false, error: 'awi:cannot-load-conversations:iwa' };
		}
		return { success: true };
	}
	remember( what, direct, indirect )
	{
		this.directRemembering.push( { what: what.toLowerCase(), souvenirs: direct.souvenirs, content: direct.content } );
		this.indirectRemembering.push( { what: what.toLowerCase(), souvenirs: indirect.souvenirs, content: indirect.content } );
	}
	forget( what )
	{
		what = what.toLowerCase();

		var newArray = [];
		for ( var s = 0; s < this.directRemembering.length; s++ )
		{
			if ( what != this.directRemembering[ s ].name )
				newArray.push( this.directRemembering[ s ] );
		}
		this.directRemembering = newArray;

		newArray = [];
		for ( var s = 0; s < this.indirectRemembering.length; s++ )
		{
			if ( what != this.indirectRemembering[ s ].name )
				newArray.push( this.indirectRemembering[ s ] );
		}
		this.indirectRemembering = newArray;
	}
	async extractContentFromMemories( line, parameters, control, options = {} )
	{
		var direct = [];
		for ( var r = 0; r < this.directRemembering.length; r++ )
		{
			var remembering = this.directRemembering[ r ];
			for ( var s = 0; s < remembering.souvenirs.length; s++ )
			{
				var answer = await remembering.souvenirs[ s ].extractContent( line, parameters, control );
				if ( answer.success == 'found' )
					direct.push( answer.data );
			}
		}
		var indirect = [];
		for ( var r = 0; r < this.indirectRemembering.length; r++ )
		{
			var remembering = this.indirectRemembering[ r ];
			for ( var s = 0; s < remembering.souvenirs.length; s++ )
			{
				var answer = await remembering.souvenirs[ s ].extractContent( line, parameters, control );
				if ( answer.success == 'found' )
					indirect.push( answer.data );
			}
		}
		direct.sort(
			function( element1, element2 )
			{
				if ( element1.result < element2.result )
					return 1;
				if ( element1.result > element2.result )
					return -1;
				return 0;
			} );
		indirect.sort(
			function( element1, element2 )
			{
				if ( element1.result < element2.result )
					return 1;
				if ( element1.result > element2.result )
					return -1;
				return 0;
			} );

		var directExtracted = '';
		var indirectExtracted = '';
		options.type = typeof options.type == 'undefined' ? 'chat' : options.type;
		options.nDirectExtracts = typeof options.nDirectExtracts == 'undefined' ? 3 : options.nDirectExtracts;
		options.nIndirectExtracts = typeof options.nIndirectExtracts == 'undefined' ? 3 : options.nIndirectExtracts;
		switch ( options.type )
		{
			default:
			case 'chat':
				for ( var n = 0; n < options.nDirectExtracts; n++ )
				{
					if ( n < direct.length )
					{
						var extract = direct[ n ];
						if ( extract.content )
							directExtracted += extract.content;
					}
				}
				for ( var n = 0; n < options.nIndirectExtracts; n++ )
				{
					if ( n < indirect.length )
					{
						var extract = indirect[ n ];
						if ( extract.content )
							indirectExtracted += extract.content;
					}
				}
				break;
		}
		if ( directExtracted || indirectExtracted )
			return { success: 'found', data: { directExtracted: directExtracted, indirectExtracted: indirectExtracted } };
		return { success: 'notfound', data: { directExtracted: '', indirectExtracted: '' } };
	}
}
module.exports.Awi = Awi;
