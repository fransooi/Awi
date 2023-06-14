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
		var answers = {};
		if ( options.fromAwi )
		{
			this.bubbles = {};
			this.newBubbles = options.fromAwi.newBubbles;
			for ( var classname in this.newBubbles )
			{
				if ( !this.bubbles[ classname ] )
					this.bubbles[ classname ] = {};
				for ( var name in this.newBubbles[ classname ] )
					this.bubbles[ classname ][ name ] = new this.newBubbles[ classname ][ name ]( this, options.fromAwi.bubbles[ classname ][ name ].options );
			}
			this.connectors = {};
			this.newConnectors = options.fromAwi.newConnectors;
			for ( var classname in options.fromAwi.connectors )
			{
				if ( !this.connectors[ classname ] )
					this.connectors[ classname ] = {};
				for ( var name in options.fromAwi.connectors[ classname ] )
				{
					var srcConnector = options.fromAwi.connectors[ classname ][ name ];
					if ( name != 'current' )
					{
						var found = options.preserveConnectors.find(
							function( element )
							{
								return element == classname + '-' + name
							} );
						if ( !found )
						{
							var connector = new this.newConnectors[ classname ][ name ]( this, srcConnector.options );
							var answer = await connector.connect( srcConnector.options );
							answers[ connector.classname ] = [ { success: answer.success, nonFatal: answer.nonFatal, data: answer.data } ];
							this[ connector.classname ] = connector;
							this.connectors[ classname ][ name ] = connector;
							this.connectors[ classname ].current = connector;
							if ( classname == 'utilities' )
								await this.config.loadConfigs();
						}
						else
						{
							this[ srcConnector.classname ] = srcConnector;
							this.connectors[ classname ][ name ] = srcConnector;
							this.connectors[ classname ].current = srcConnector;
						}
					}
				}
			}
			this.newSouvenirs = options.fromAwi.newSouvenirs;
			this.newMemories = options.fromAwi.newMemories;
		}
		else
		{
			if ( typeof this.systemConfig.engine != 'string' )
			{
				var files = this.systemConfig.engine;

				// Start connectors... System must be first.
				for ( var c = 0; c < this.systemConfig.connectors.length; c++ )
				{
					var connector = this.systemConfig.connectors[ c ];
					var dot = connector.name.indexOf( '.' );
					var classname = connector.name.substring( 0, dot );
					var name = connector.name.substring( dot + 1 );
					if ( name.indexOf( '*' ) >= 0 || name.indexOf( '?' ) >= 0 )
						break;
					var exports = window.awi[ 'awi-connector-' + classname + '-' + name ];
					this.connectors[ classname ] = ( typeof this.connectors[ classname ] == 'undefined' ? {} : this.connectors[ classname ] );
					this.connectors[ classname ][ name ] = new exports.Connector( this, {} );
					this.newConnectors[ classname ] = ( typeof this.newConnectors[ classname ] == 'undefined' ? {} : this.newConnectors[ classname ] );
					this.newConnectors[ classname ][ name ] = exports.Connector;
					if ( connector.default )
					{
						var answer = await this.connectors[ classname ][ name ].connect( connector.options );
						answers[ answer.data.classname ] = [ { success: answer.success, data: answer.data } ];
						this[ answer.data.classname ] = this.connectors[ classname ][ name ];
						this.connectors[ classname ].current = this.connectors[ classname ][ name ];
						if ( classname == 'utilities' && name == 'awi'  )
						{
							await this.config.init();
						}
					}
				}

				// Now wildcards
				for ( var c = 0; c < this.systemConfig.connectors.length; c++ )
				{
					var connector = this.systemConfig.connectors[ c ];
					var dot = connector.name.indexOf( '.' );
					var classname = connector.name.substring( 0, dot );
					var name = connector.name.substring( dot + 1 );
					if ( name.indexOf( '*' ) >= 0 || name.indexOf( '?' ) >= 0 )
					{
						do
						{
							var done = false;
							for ( var f = 0; f < files.length; f++ )
							{
								if ( files[ f ].indexOf( '-' + classname + '-' ) >= 0 )
								{
									name = files[ f ].substring( files[ f ].lastIndexOf( '-' ) + 1 );
									if ( !this.connectors[ classname ] || !this.connectors[ classname ][ name ] )
									{
										//var exports = window.awi[ classname ];
										var exports = window.awi[ 'awi-connector-' + classname + '-' + name ];
										this.connectors[ classname ] = ( typeof this.connectors[ classname ] == 'undefined' ? {} : this.connectors[ classname ] );
										this.connectors[ classname ][ name ] = new exports.Connector( this, {} );
										this.newConnectors[ classname ] = ( typeof this.newConnectors[ classname ] == 'undefined' ? {} : this.newConnectors[ classname ] );
										this.newConnectors[ classname ][ name ] = exports.Connector;
										var answer = await this.connectors[ classname ][ name ].connect( connector.options );
										answers[ answer.data.classname ] = typeof answers[ answer.data.classname ] == 'undefined' ? [] : answers[ answer.data.classname ];
										answers[ answer.data.classname ].push( { success: answer.success, data: answer.data } );
										done = true;
									}
								}
							}
						} while( done )
					}
				}

				// Bubbles tree
				for ( var f = 0; f < files.length; f++ )
				{
					if ( files[ f ].indexOf( '-bubble-' ) >= 0 )
					{
						var namepos = files[ f ].lastIndexOf( '-' );
						var name = files[ f ].substring( namepos + 1 );
						var classpos = files[ f ].lastIndexOf( '-', namepos - 1 );
						var classname = files[ f ].substring( classpos + 1, namepos );
						var exports = window.awi[ 'awi-bubble-' + classname + '-' + name ];
						this.bubbles[ classname ] = ( typeof this.bubbles[ classname ] == 'undefined' ? {} : this.bubbles[ classname ] );
						this.bubbles[ classname ][ name ] = new exports.Bubble( this, { key: this.utilities.getUniqueIdentifier( {}, name, f ), parent: '' } );
						this.newBubbles[ classname ] = ( typeof this.newBubbles[ classname ] == 'undefined' ? {} : this.newBubbles[ classname ] );
						this.newBubbles[ classname ][ name ] = exports.Bubble;
					}
				}

				// Gather souvenirs
				for ( var f = 0; f < files.length; f++ )
				{
					if ( files[ f ].indexOf( '-souvenir-' ) >= 0 )
					{
						var namepos = files[ f ].lastIndexOf( '-' );
						var name = files[ f ].substring( namepos + 1 );
						var classpos = files[ f ].lastIndexOf( '-', namepos - 1 );
						var classname = files[ f ].substring( classpos + 1, namepos );
						var exports = window.awi[ 'awi-souvenir-' + classname + '-' + name ];
						this.newSouvenirs[ classname ] = ( typeof this.newSouvenirs[ classname ] == 'undefined' ? {} : this.newSouvenirs[ classname ] );
						this.newSouvenirs[ classname ][ name ] = exports.Souvenir;
					}
				}

				// Gather memories
				for ( var f = 0; f < files.length; f++ )
				{
					if ( files[ f ].indexOf( '-memory-' ) >= 0 )
					{
						var namepos = files[ f ].lastIndexOf( '-' );
						var name = files[ f ].substring( namepos + 1 );
						var classpos = files[ f ].lastIndexOf( '-', namepos - 1 );
						var classname = files[ f ].substring( classpos + 1, namepos );
						var exports = window.awi[ 'awi-memory-' + classname + '-' + name ];
						this.newMemories[ classname ] = ( typeof this.newMemories[ classname ] == 'undefined' ? {} : this.newMemories[ classname ] );
						this.newMemories[ classname ][ name ] = exports.Memory;
					}
				}
			}
			else
			{
				// Start connectors... System must be first.
				for ( var c = 0; c < this.systemConfig.connectors.length; c++ )
				{
					var connector = this.systemConfig.connectors[ c ];
					var dot = connector.name.indexOf( '.' );
					var classname = connector.name.substring( 0, dot );
					var name = connector.name.substring( dot + 1 );
					if ( name.indexOf( '*' ) >= 0 || name.indexOf( '?' ) >= 0 )
						break;
					var exports = require( './connectors/' + classname + '/' + 'awi-connector-' + classname + '-' + name );
					this.connectors[ classname ] = ( typeof this.connectors[ classname ] == 'undefined' ? {} : this.connectors[ classname ] );
					this.connectors[ classname ][ name ] = new exports.Connector( this, {} );
					this.newConnectors[ classname ] = ( typeof this.newConnectors[ classname ] == 'undefined' ? {} : this.newConnectors[ classname ] );
					this.newConnectors[ classname ][ name ] = exports.Connector;
					if ( connector.default )
					{
						var answer = await this.connectors[ classname ][ name ].connect( connector.options );
						answers[ answer.data.classname ] = [ { success: answer.success, nonFatal: answer.nonFatal, data: answer.data } ];
						this[ answer.data.token ] = this.connectors[ classname ][ name ];
						this.connectors[ classname ].current = this.connectors[ classname ][ name ];
						if ( classname == 'utilities' && name == 'utilities' )
						{
							await this.config.init();
						}
					}
				}

				// Now wildcards
				for ( var c = 0; c < this.systemConfig.connectors.length; c++ )
				{
					var connector = this.systemConfig.connectors[ c ];
					var dot = connector.name.indexOf( '.' );
					var classname = connector.name.substring( 0, dot );
					var filter = connector.name.substring( dot + 1 );
					if ( filter.indexOf( '*' ) >= 0 || filter.indexOf( '?' ) >= 0 )
					{
						var answer = await this.system.getDirectory( this.config.getEnginePath() + '/connectors/' + classname, { recursive: true, filters: [ '*.js' ] } );
						var files = this.utilities.getFileArrayFromTree( answer.data );
						for ( var f = 0; f < files.length; f++ )
						{
							var name = this.utilities.parse( files[ f ].name ).name;
							var namepos = name.lastIndexOf( '-' );
							var classpos = name.lastIndexOf( '-', namepos - 1 );
							var classname = name.substring( classpos + 1, namepos );
							var cName = name.substring( namepos + 1 );
							var exports = require( './connectors/' + classname + '/' + name );
							this.connectors[ classname ] = ( typeof this.connectors[ classname ] == 'undefined' ? {} : this.connectors[ classname ] );
							this.newConnectors[ classname ] = ( typeof this.newConnectors[ classname ] == 'undefined' ? {} : this.newConnectors[ classname ] );
							var instance = new exports.Connector( this, {} );
							this.connectors[ classname ][ cName ] = instance;
							this.newConnectors[ classname ][ cName ] = exports.Connector;
							var answer = await instance.connect( connector.options );
							answers[ cName ] = typeof answers[ answer.data.classname ] == 'undefined' ? [] : answers[ answer.data.classname ];
							answers[ cName ] = { success: answer.success, data: answer.data };
						}
					}
				}

				// Make the list of bubbles to load
				var classList = [ 'generic', 'audio', 'filesystem', 'user', 'vision', this.connectors.languages.current.token ];
				var answer = await this.system.getDirectory( this.config.getEnginePath() + '/bubbles', { recursive: true, filters: [ 'awi-bubble-*.js' ] } );
				var files = this.utilities.getFileArrayFromTree( answer.data );
				for ( var f = 0; f < files.length; f++ )
				{
					var path = files[ f ].path;
					var exports = require( path );
					var name = this.utilities.parse( path ).name.toLowerCase();
					var namepos = name.lastIndexOf( '-' );
					var classpos = name.lastIndexOf( '-', namepos - 1 );
					var classname = name.substring( classpos + 1, namepos );
					name = name.substring( namepos + 1 );
					var found = classList.find(
						function( element )
						{
							return element == classname;
						}
					)
					if ( found )
					{
						this.bubbles[ classname ] = ( typeof this.bubbles[ classname ] == 'undefined' ? {} : this.bubbles[ classname ] );
						this.bubbles[ classname ][ name ] = new exports.Bubble( this, { key: this.utilities.getUniqueIdentifier( {}, name, f ), parent: '' } );
						this.newBubbles[ classname ] = ( typeof this.newBubbles[ classname ] == 'undefined' ? {} : this.newBubbles[ classname ] );
						this.newBubbles[ classname ][ name ] = exports.Bubble;
					}
				}

				// Gather souvenirs
				var answer = await this.system.getDirectory( this.config.getEnginePath() + '/souvenirs', { recursive: true, filters: [ 'awi-souvenir-*.js' ] } );
				var files = this.utilities.getFileArrayFromTree( answer.data );
				for ( var f = 0; f < files.length; f++ )
				{
					var path = files[ f ].path;
					var exports = require( path );
					var name = this.utilities.parse( path ).name.toLowerCase();
					var namepos = name.lastIndexOf( '-' );
					var classpos = name.lastIndexOf( '-', namepos - 1 );
					var classname = name.substring( classpos + 1, namepos );
					name = name.substring( namepos + 1 );
					this.newSouvenirs[ classname ] = ( typeof this.newSouvenirs[ classname ] == 'undefined' ? {} : this.newSouvenirs[ classname ] );
					this.newSouvenirs[ classname ][ name ] = exports.Souvenir;
				}

				// Gather memories
				var answer = await this.system.getDirectory( this.config.getEnginePath() + '/memories', { recursive: true, filters: [ 'awi-memory-*.js' ] } );
				var files = this.utilities.getFileArrayFromTree( answer.data );
				for ( var f = 0; f < files.length; f++ )
				{
					var path = files[ f ].path;
					var exports = require( path );
					var name = this.utilities.parse( path ).name.toLowerCase();
					var namepos = name.lastIndexOf( '-' );
					var classpos = name.lastIndexOf( '-', namepos - 1 );
					var classname = name.substring( classpos + 1, namepos );
					name = name.substring( namepos + 1 );
					this.newMemories[ classname ] = ( typeof this.newMemories[ classname ] == 'undefined' ? {} : this.newMemories[ classname ] );
					this.newMemories[ classname ][ name ] = exports.Memory;
				}
			}

		}
		// Create messages
		this.messages = new awimessages.Messages( this, {} );
		await this.messages.loadMessages();

		// Create personality
		this.personality = new awipersonality.Personality( this, {} );

		// Finish initialization of utilities
		await this.utilities.completeConnect();

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
			if ( options.server )
			{
				this.editor = options.server;
				this.connectors.editors.current = options.server;
			}
			else
			{
				if ( !this.editor )
					this.editor = this.connectors.servers.current;
				if ( !this.connectors.editors.current )
					this.connectors.editors.current = this.connectors.servers.current;
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
		if ( this.editor.connected )
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
		memory.bubbleHash = {};
		for ( var key in memory.bubbleMap )
			memory.bubbleHash[ memory.bubbleMap[ key ] ] = key;
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
						if ( extract.content.text )
							directExtracted += 'Someone said: ' + extract.text + '\n';
						if ( extract.content.senderText )
							directExtracted += extract.content.senderName + ' said: ' + extract.content.senderText + '\n';
						if ( extract.content.receiverText )
							directExtracted += extract.content.receiverName + ' said: ' + extract.content.receiverText + '\n';
					}
				}
				for ( var n = 0; n < options.nIndirectExtracts; n++ )
				{
					if ( n < indirect.length )
					{
						var extract = indirect[ n ];
						if ( extract.content.text )
							indirectExtracted += 'Someone said: ' + extract.text + '\n';
						if ( extract.content.senderText )
							indirectExtracted += extract.content.senderName + ' said: ' + extract.content.senderText + '\n';
						if ( extract.content.receiverText )
							indirectExtracted += extract.content.receiverName + ' said: ' + extract.content.receiverText + '\n';
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
