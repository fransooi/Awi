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
		this.editor = null;
		this.system = null;
		this.language = null;
		this.messages = null;
		this.config = new awiconfig.Config( this, config );
	}
	async connect( options )
	{
		var answers = {};
			
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
					if ( classname == 'utilities' )
					{
						await this.config.loadConfigs();
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
					this.bubbles[ classname ][ name ] = new exports.Bubble( this, { id: this.utilities.getUniqueIdentifier( {}, name, f ), previous: '', parent: '' } );
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
					//this.souvenirs[ classname ] = ( typeof this.souvenirs[ classname ] == 'undefined' ? {} : this.souvenirs[ classname ] );
					//this.souvenirs[ name ] = new exports.Souvenir( this, {} );
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
					this.memories[ classname ] = ( typeof this.memories[ classname ] == 'undefined' ? {} : this.memories[ classname ] );
					this.memories[ classname ][ name ] = new exports.Memory( this, { id: this.utilities.getUniqueIdentifier( {}, name, f ), previous: '', parent: '' } );
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
					this[ answer.data.classname ] = this.connectors[ classname ][ name ];
					this.connectors[ classname ].current = this.connectors[ classname ][ name ];
					if ( classname == 'utilities' )
					{
						await this.config.loadConfigs();
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
			var classList = [ 'awi', 'audio', 'filesystem', 'user', 'vision', this.connectors.languages.current.token ];
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
					this.bubbles[ classname ][ name ] = new exports.Bubble( this, { id: this.utilities.getUniqueIdentifier( {}, name, f ), previous: '', parent: '' } );
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
				//this.souvenirs[ classname ] = ( typeof this.souvenirs[ classname ] == 'undefined' ? {} : this.souvenirs[ classname ] );
				//this.souvenirs[ name ] = new exports.Souvenir( this, {} );
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
				this.memories[ classname ] = ( typeof this.memories[ classname ] == 'undefined' ? {} : this.memories[ classname ] );
				this.memories[ classname ][ name ] = new exports.Memory( this, { id: this.utilities.getUniqueIdentifier( {}, name, f ), previous: '', parent: '' } );
				this.newMemories[ classname ] = ( typeof this.newMemories[ classname ] == 'undefined' ? {} : this.newMemories[ classname ] );
				this.newMemories[ classname ][ name ] = exports.Memory;
			}
		}

		// Create personality
		this.personality = new awipersonality.Personality( this, {} );

		// Create messages
		this.messages = new awimessages.Messages( this, {} );
		await this.messages.loadMessages();

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
			this.prompt = new awiprompt.Prompt( this, {} );
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
			this.editor.print( this, prompt.split( '\n' ), { user: 'awi' } );
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
	async save( user )
	{
		user = typeof user == 'undefined' ? this.config.user : user;
		var memories = this.utilities.serializeOut( this.memories, '' );
		var conversations = this.utilities.serializeOut( this.prompt, '' );
		var path = this.config.getConfigurationPath() + '/' + user + '-';
		var answer1 = await this.system.writeFile( path + 'memories.js', memories, { encoding: 'utf8' } );
		var answer2 = await this.system.writeFile( path + 'conversations.js', conversations, { encoding: 'utf8' } );
		var answer3 = await this.config.saveConfigs( user );
		if ( answer1.success && answer2.success && answer3.success )
			return { success: true };
		if ( !answer1.success )
			return answer1;
		if ( !answer2.success )
			return answer2;
		return answer3;		
	}
	async load( user )
	{
		var self = this;
		var lastBulb = 'root';
		function fromJSON( json, def )
		{
			var data;
			try
			{
				data = JSON.parse( json );
			}
			catch( e )
			{}
			if ( data )
				return data;
			return def;
		}
		function createObjects( o, map )
		{
			if ( o.oClass )
			{
				// create the object
				var oo;
				if ( o.oClass != 'prompt' )
				{
					oo = new self[ o.data.parentClass ][ o.data.classname ][ o.data.token ]( self, { id: o.data.key, bulb: lastBulb, parent: o.data.parent, exits: o.data.exits, parameters: o.data.parameters } );
					if ( o.data.parentClass == 'newMemories' )
						lastBulb = oo;
				}
				else
				{
					oo = self.prompt;
					lastBulb = oo;
				}
				switch ( o.oClass )
				{
					case 'bubble':
						break;
					case 'bulb':
						break;
					case 'memory':
						oo.currentBubble = o.data.currentBubble;
						oo.parameters = fromJSON( o.data.parameters, o.data.parametersType );
						oo.properties.exits = o.data.exits;
						oo.parent = o.data.parent;
						oo.previous = o.data.previous;
						for ( var p in o.data.nodes )
						{
							oo.nodes[ p ] = createObjects( o.data.nodes[ p ], {} );
						}
						break;
					case 'souvenir':
						oo.parameters = fromJSON( o.data.parameters, o.data.parametersType );
						oo.options = fromJSON( o.data.options, {} );
						oo.parent = o.data.parent;
						oo.previous = o.data.previous;
						oo.properties.exits = o.data.exits;
						 break;
					case 'prompt':
						oo.currentBubble = o.data.currentBubble;
						oo.parameters = fromJSON( o.data.parameters, o.data.parametersType );
						oo.datas = fromJSON( o.data.datas, {} );
						oo.options = fromJSON( o.data.options, {} );
						oo.properties.exits = o.data.exits;
						oo.parent = o.data.parent;
						oo.previous = o.data.previous;
						oo.options = fromJSON( o.data.options, {} );
						for ( var p in o.data.nodes )
							oo.nodes[ p ] = createObjects( o.data.nodes[ p ], {} );
						oo.pathway = o.data.pathway;
						oo.idCount = o.data.idCount;
						oo.questionCount = o.data.questionCount;
						oo.properties.exits = o.data.exits;
						break
				}
				return oo;
			}
			else
			{
				for ( var p in o )
				{
					var oo = o[ p ];
					if ( oo.oClass )
					{
						o[ p ] = createObjects( oo, map );
					}
				}
				return o;
			}
		}
		user = typeof user == 'undefined' ? this.config.user : user;
		var path = this.config.getConfigurationPath() + '/' + user + '-';
		var memories, conversations;
		var answer1 = await this.system.exists( path + 'memories.js' );
		if ( answer1.success )
		{
			answer1 = await this.system.readFile( path + 'memories.js', { encoding: 'utf8' } );
			if ( answer1.success )
				memories = answer1.data;
		}
		var answer2 = await this.system.exists( path + 'conversations.js' );
		if ( answer2.success )
		{
			answer2 = await this.system.readFile( path + 'conversations.js', { encoding: 'utf8' } );
			if ( answer2.success )
				conversations = answer2.data;
		}
		if ( memories )
		{
			try
			{
				memories = Function( memories );
				memories = memories();
			}
			catch( e )
			{
				memories = null;
			}
		}
		if ( conversations )
		{
			try
			{
				conversations = Function( conversations );
				conversations = conversations();
			}
			catch( e )
			{
				conversations = null;
			}
		}
		if ( memories && conversations )
		{
			this.memories = createObjects( memories, {} );
			createObjects( conversations.root, {} );
		}
		return { success: true };
	}
}
module.exports.Awi = Awi;
