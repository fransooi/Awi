(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
* @file awi-config.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Configuration management
*
*/
class Config
{
	constructor( awi, config )
	{
		this.awi = awi;
		this.oClass = 'config'
		this.systemConfig = config;
		if ( typeof config.configurations == 'string' )
			this.getConfigurationPath = function(){ return awi.utilities.normalize( config.configurations ) };
		else
			this.getConfigurationPath = config.configurations;
		if ( typeof config.engine == 'string' )
			this.getEnginePath = function(){ return awi.utilities.normalize( config.engine ) };
		else if ( Array.isArray( config.engine ) )
			this.getEnginePath = function(){ 'http://run/data/awi-engine' };
		else
			this.getEnginePath = config.engine;
		if ( typeof config.data == 'string' )
			this.getDataPath = function(){ return awi.utilities.normalize( config.data ) };
		else
			this.getDataPath = config.data;
		this.user = '';
		this.configs = {};
		this.platform = 'win32';
	}
	async init()
	{
		await this.loadConfigs();
		this.platform = await this.awi.system.getSystemInformation( 'platform' );
	}
	isUserLogged()
	{
		return this.user.length > 0;
	}
	getConfig( type )
	{
		if ( type == 'user' )
		{
			type = this.user;
			if ( type == '' )
				type = 'user-default';
		}
		else if ( type == 'personality' )
			type = 'personality-' + this.configs[ this.user ].personality;
		return this.configs[ type ];
	}
	getNewUserConfig()
	{
		return this.awi.utilities.copyObject( this.configs[ 'user-default' ] );
	}
	async setNewUserConfig( name, config )
	{
		if ( name != 'user' && name != 'system' )
		{
			this.configs[ name ] = config;
			var personality = await this.loadConfig( 'personality-' + config.personality );
			personality.prompts[ 'user' ] = '.(' + config.firstName + ') ';
			this.configs[ 'personality-' + config.personality ] = personality;
		}
	}
	checkUserConfig( name )
	{
		name = name.toLowerCase().trim();
		if ( name.indexOf( 'system' ) != 0 && name.indexOf( 'user' ) != 0 && name.indexOf( 'personality' ) != 0 )
			return this.configs[ name ];
		return null;
	}
	getUserList()
	{
		var list = [];
		for ( var c in this.configs )
		{
			var config = this.configs[ c ];
			if ( typeof config.fullName != 'undefined' && config.fullName )
			{
				list.push( config );
			}
		}
		return list;
	}
	async setUser( user, control )
	{
		var config = this.checkUserConfig( user );
		if ( config )
		{
			this.user = user.toLowerCase().trim();
			var personality = this.configs[ this.user ].personality;
			this.loadConfig( 'personality-' + personality );
			var answer = await this.awi.client.connect( this.awi.client.options );
			if ( answer.success )
			{
				control.editor.self.setPrompt( control.editor, '.(' + user + ') ' );
				//this.awi.editor.print( control.editor, '\n' + answer.data.prompt + ' running.', { user: 'information' } );
			}
			return answer;
		}
		else
		{
			var { originalType, type } = this.getConfigTypes( user );
			var answer = await this.awi.utilities.loadHJSON( this.getConfigurationPath() + '/' + type + '.hjson' );
			if ( answer.success )
			{
				this.configs[ type ] = answer.data;
				this.user = user.toLowerCase().trim();
				var answer = await this.awi.client.connect( this.awi.client.options );
				if ( answer.success )
				{
					control.editor.self.setPrompt( control.editor, '.(' + user + ') ' );
					this.awi.editor.print( control.editor, '\n' + answer.data.prompt + ' running.' )
				}
				return answer;
			}
		}
		return { success: false, error: 'awi:cannot-set-user:iwa' };
	}
	async saveConfigs( name )
	{
		var self = this;
		var user, personalities = [];
		if ( name )
		{
			name = name.toLowerCase();
			user = this.configs[ name ];
			if ( !user )
				return { success: false, error: 'awi:user-unknow:iwa' };
			if ( this.configs[ 'personality-' + user.personality ] )
				personalities.push( { path: self.getConfigurationPath() + '/personality-' + user.personality, config: this.configs[ 'personality-' + user.personality ] } );
			await this.awi.utilities.saveHJSON( this.getConfigurationPath() + '/' + name + '.hjson', this.configs[ name ] );
			await this.awi.utilities.saveJSON( this.getConfigurationPath() + '/' + name + '.json', this.configs[ name ] );
			personalities.forEach(
				async function( element )
				{
					await self.awi.utilities.saveHJSON( element.path + '.hjson' , element.config );
					await self.awi.utilities.saveJSON( element.path + '.json', element.config );
				} );
		}
		else
		{
			for ( var type in this.configs )
			{
				await this.awi.utilities.saveHJSON(  this.systemConfig.configurations + '/' + type + '.hjson', this.configs[ type ] );
				await this.awi.utilities.saveJSON( this.systemConfig.configurations + '/' + type + '.json', this.configs[ type ] );
			}
		}
		return { success: true, data: '' };
	}
	async loadConfigs()
	{
		var answer = await this.awi.system.getDirectory( this.getConfigurationPath(), { recursive: false, filters: [ '*.hjson' ] } );
		if ( answer.success )
		{
			var files = this.awi.utilities.getFileArrayFromTree( answer.data );
			for ( var f = 0; f < files.length; f++ )
			{
				answer = await this.awi.utilities.loadHJSON( files[ f ].path );
				if ( !answer.success )
					break;
				var name = this.awi.utilities.parse( files[ f ].name ).name.toLowerCase();
				this.configs[ name ] = answer.data;
			}
		}
		if ( !this.configs[ 'user' ] )
		{
			await this.loadConfig( 'system' );
			await this.loadConfig( 'user' );
		}
		return answer;
	}
	async loadConfig( type, callback )
	{
		var { originalType, type } = this.getConfigTypes( type )
		if ( !this.configs[ type ] && this.awi && this.awi.utilities )
		{
			var answer = await this.awi.utilities.loadHJSON( this.getConfigurationPath() + '/' + type + '.hjson' );
			this.configs[ type ] = answer.data;
		}
		if ( !this.configs[ type ] )
		{
			switch ( originalType )
			{
				case 'system':
					this.configs[ 'system' ] =
					{
						serverUrl: 'ws://194.110.192.59:8765',
						prompts:
						{
							user: '. ',
							awi: '.. ',
							result: '.: ',
							root: '.....',
							question: '.? ',
							information: '.(oo) ',
							command: '.> ',
							warning: '.warning: ',
							error: '.error: ',
							code: '.code: ',
							debug1: 'debug1: ',
							debug2: 'debug2: ',
							debug3: 'debug3: ',
							verbose1: '. ',
							verbose2: '. ',
							verbose3: '. ',
						},
						commands:
						{
							win32:
							{
								image: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								video: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								sound: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								document: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								presentation: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								source: {
									view: { command: 'code "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'code "{file}"', cwd: '', type: 'exec' },
									run: { command: 'code "{file}"', cwd: '', type: 'exec' },
								},
								json: {
									view: { command: 'code "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'code "{file}"', cwd: '', type: 'exec' },
									run: { command: 'code "{file}"', cwd: '', type: 'exec' },
								},
								html: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								application: {
									view: { command: 'start {file}', cwd: '"{dir}"', type: 'exec' },
									edit: { command: 'start {file}', cwd: '"{dir}"', type: 'exec' },
									run: { command: 'start {file}', cwd: '"{dir}"', type: 'exec' },
								},
								aozaccessory: {
									view: { command: 'aoz {file}', cwd: '"{dir}"', type: 'exec' },
									edit: { command: 'aoz {file}', cwd: '"{dir}"', type: 'exec' },
									run: { command: 'aoz {file}', cwd: '"{dir}"', type: 'exec' },
								},
								file: {
									view: { command: 'explorer {file}', cwd: '', type: 'exec' },
									edit: { command: 'explorer {file}', cwd: '', type: 'exec' },
									run: { command: 'explorer {file}', cwd: '', type: 'exec' },
								}
							},
							macOS: {},
							linux: {},
							android: {},
							iPhone: {}
						},
					}
					break;
				case 'user':
					this.configs[ type ] =
					{
						firstName: '',
						lastName: '',
						fullName: '',
						personality: 'awi',
						paths:
						{
							aoz: 'C:/AOZ_Studio'
						},
						directConnection: true,
						localServer: true,
						aiKey: '',
						isDegree: true,
						fix: 3,
						debug: 0,
						developperMode: true,
						verbose: 1,
						justify: 160,
						verbosePrompts:
						{
							verbose1: [ 'importer1', 'memory1' ],
							verbose2: [ 'importer2', 'memory2' ],
							verbose3: [ 'importer3', 'memory3' ]
						},
						debugPrompts:
						{
							debug1: [ 'parser' ],
							debug2: [ 'parser', 'prompt', , 'completion' ],
							debug3: [ 'all' ]
						},
						takeNote:
						[
							'Please take note: you are talking to {firstName}.',
							'\nNot more than 50 words in any response.'
						],
						paths: {
							win32: [],
							macOS: [],
							linux: [],
							android: [],
							iPhone: []
						}
					};
					for ( var p in this.configs[ type ].paths )
					{
						this.configs[ type ].paths[ p ] = {
							image: [],
							sound: [],
							video: [],
							music: [],
							json: [],
							document: [],
							presentation: [],
							source: [],
							application: [],
							aozaccessory: [],
							file: [] };
					}
					break;
				case 'personality':
					this.configs[ type ] =
					{
						name: 'Awi',
						character: 'awi',
						animations: false,
						mood: 'with inpiring comments',
						youAre: 'a great programmer',
						whoUses: 'who is fluent in',
						theProduct: 'Javascript and node.js',
						useTheProduct: 'refer to Javascript',
						toDoSomething: 'for code and explanations.',
						youLove: [ 'coding', 'making games', 'learning' ],
						youLike: [ 'creativity', 'music', ],
						youSupport: [ ],
						youLaughAt: [ ],
						youMakeAJokeWhen: [ ],
						youGrrrAt: [ ],
						youReject: [ ],
						youIgnore: [ ],
						youEventuallyAccept: [ ],
						youAlwaysAccept: [ ],
						temperature: 0.1,
						prompts:
						{
							user: '.(francois) ',
							awi: '.(°°) ',
							result: '.(..) ',
							information: '.(oo) ',
							question: '?(°°) ',
							command: '>(°°)',
							root: '.[oo] ',
							warning: '.(OO) ',
							error: '.(**) ',
							code: '.{..} ',
							debug1: '.[debug1] ',
							debug2: '.[debug2] ',
							debug3: '.[debug3] ',
							verbose1: '.(oo) ',
							verbose2: '.(oo) ',
							verbose3: '.[oo] ',
						}
					};
					break;
				}
		}
		if ( callback )
			callback( this.configs[ type ] )
		return this.configs[ type ];
	}
	async getDefaultPaths()
	{
		var paths = {
			win32: {},
			darwin: {},
			linux: {},
			android: {},
			iOS: {}	};
		var userDir = await this.awi.system.getSystemInformation( 'userDir' );
		var drives = await this.awi.system.getSystemInformation( 'drives' );
		for ( var d = 0; d < drives.length; d++ )
			drives[ d ] = drives[ d ] + ':/';
		var platform = await this.awi.system.getSystemInformation( 'platform' );
		switch ( platform )
		{
			case 'win32':
				paths.win32.image = [ userDir + '/Pictures' ];
				paths.win32.sound = [];
				paths.win32.video = [ userDir + '/Videos' ];
				paths.win32.music = [ userDir + '/Music' ];
				paths.win32.document = [ userDir + '/Documents' ];
				paths.win32.presentation = [ userDir + '/Documents' ];
				paths.win32.json = [];
				paths.win32.source = [];
				paths.win32.application = [ 'C:/Program Files', 'C:/Program Files (x86)' ];
				paths.win32.accessory = [ 'C:/AOZ_Studio/AOZ_Studio/aoz/app/aozacc' ];
				paths.win32.file = drives;
				break;
			case 'darwin':
				break;
			case 'linux':
				break;
			case 'android':
				break;
			case 'iOS':
				break;
		}
		return paths;
	}
	getPrompt( type )
	{
		type = ( typeof type == 'undefined' ? 'awi' : type );

		// Debug prompts
		if ( type == 'systemwarning' )
			return '* Warning: ';
		if ( type == 'systemerror' )
			return '* ERROR! ';
		if ( type.indexOf( 'debug' ) == 0 )
		{
			var level = parseInt( type.substring( 5 ) );
			if ( level > 0 && level <= 3 )
			{
				if ( level <= userConfig.debug )
				{
					return this.configs[ 'system' ].prompts[ type ];
				}
			}
		}
		if ( this.user == '' )
		{
			var prompt = this.configs.system.prompts[ type ];
			if ( prompt  )
				return prompt;
			return null;
		}

		// Try main prompts
		var userConfig = this.configs[ this.user ];
		var config = this.configs[ 'personality-' + userConfig.personality ];
		if ( config && config.prompts[ type ] )
			return config.prompts[ type ];

		if ( !this.configs[ type ] )
		{
			for ( var v = userConfig.verbose; v >= 1; v-- )
			{
				var found = userConfig.verbosePrompts[ 'verbose' + v ].find(
					function( element )
					{
						return element == type;
					} );
				if ( found )
					return config.prompts[ 'verbose' + v ];
			}

			if ( userConfig.debug > 0 )
			{
				var found = userConfig.debugPrompts[ 'debug' + userConfig.debug ].find(
					function( element )
					{
						return element == 'all' || element == type;
					} );
				if ( found )
					return this.configs[ 'system' ].prompts[ 'debug' + userConfig.debug ];
			}
			return null;
		}
		return null;
	}
	getConfigTypes( type )
	{
		var result = { originalType: type, type: '' };
		var pos = type.indexOf( '-' );
		if ( pos >= 0 )
			result.originalType = type.substring( 0, pos );
		if ( type == 'user' )
		{
			type = this.user;
			if ( type == '' )
				type = 'user-default';
		}
		else if ( type == 'personality' )
		{
			if ( this.configs[ this.user ] )
				type = 'personality-' + this.configs[ this.user ].personality;
			else
				type = 'personality-' + 'defaultpersonality';
		}
		result.type = type;
		return result;
	}
	getPersonality( name )
	{
		if ( typeof name == 'undefined' || !name )
			name = this.configs[ this.user ].personality;
		return this.getConfig( 'personality-' + name );
	}
	getUserKey()
	{
		var config = this.getConfig( 'user' );
		if ( config )
			return config.aiKey;
		return '';
	}
	setVerbose( verbose )
	{
		this.getConfig( 'user' ).verbose = Math.max( Math.min( 3, verbose ), 1 );
	}
	getServerUrl()
	{
		if ( this.getConfig( 'system' ).directConnection )
			return;
		if ( this.getConfig( 'user' ).localServer )
			return 'ws://localhost:8765';
		return this.configs[ 'system' ].serverUrl;
	}
	getSystem()
	{
		return this.configs[ 'system' ];
	}
	getDebug()
	{
		return this.getConfig( 'user' ).debug;
	}
	setDebug( debug )
	{
		if ( this.getConfig( 'user' ).debug != debug )
		{
			if ( debug >= 0 && debug <= 3 )
				this.getConfig( 'user' ).debug = debug;
		}
	}
	degreeToRadian( angle )
	{
		if ( this.getConfig( 'user' ).isDegree )
			return angle * ( Math.PI / 180.0 );
		return angle;
	}
	radianToDegree( angle )
	{
		if ( this.getConfig( 'user' ).isDegree )
			return angle * ( 180.0 / Math.PI );
		return angle;
	}
	roundValue( value )
	{
		if ( value === false || value === true )
			return value;

		var fix = this.getConfig( 'user' ).fix;
		var decimalPart = value - Math.floor( value );
		var result;
		fix = typeof fix == 'undefined' ? this.fix : fix;
		if ( fix == 16 || decimalPart == 0 )
			result = '' + value;
		else if ( fix >= 0 )
			result = value.toFixed( fix );
		else
			result = value.toExponential( -fix );

		// Fix -0.00 problem...
		if ( result.substring( 0, 3 ) == '-0.' )
		{
			var onlyZeros = true;
			for ( var p = 0; p < result.length; p++ )
			{
				var c = result.charAt( p );
				if ( c >= '1' && c <= '9' )
				{
					onlyZeros = false;
					break;
				}
			}
			if ( onlyZeros )
				result = result.substring( 1 );
		}
		// Only 0 after dot?
		var dot = result.indexOf( '.' );
		if ( dot >= 0 )
		{
			dot++;
			var nul = true;
			while( dot < result.length )
			{
				if ( result.charAt( dot ) != '0' )
				{
					nul = false;
					break;
				}
				dot++;
			}
			if ( nul )
				result = result.substring( 0, dot );
		}
		return result;
	}
}
module.exports.Config = Config;

},{}],2:[function(require,module,exports){
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
* @file awi-messages.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Load and return system messages
*
*/
class Messages
{
	constructor( awi, options )
	{
		this.awi = awi;
		this.oClass = 'messages';
		this.options = options;

	}
	async loadMessages()
	{
		// Load texts
		var path = this.awi.config.getEnginePath() + '/data/en.txt';
		var answer = await this.awi.system.readFile( path, { encoding: 'utf8' } );
		this.prompts = answer.data.split( '\r\n' ).join( '\n' );
	}
	getText( id )
	{
		var start = this.prompts.indexOf( id + ':' ) + 1;
		while ( this.prompts.charCodeAt( start ) >= 32 )
			start++;
		while ( this.prompts.charCodeAt( start ) < 32 )
			start++;
		var end = this.prompts.indexOf( ':::', start );
		return this.prompts.substring( start, end ).split( '\r\n' ).join( '\n' );
	}
}
module.exports.Messages = Messages;
},{}],3:[function(require,module,exports){
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
* @file awi-personality.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Handle various personalities / create adapted prompts
*
*/

class Personality
{
	constructor( awi, options = {} )
	{
		this.awi = awi;
		this.name = 'Awi';
		this.oClass = 'personality';
		this.options = options;
		this.currentPrompt = 'prompt-generic';

		this.memories = {};
		this.memories[ 'audios' ] = new this.awi.newMemories.generic.audios( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'audios', 0 ), parent: '' } );
		this.memories[ 'conversations' ] = new this.awi.newMemories.generic.conversations( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'conversations', 1 ), parent: '' } );
		this.memories[ 'documents' ] = new this.awi.newMemories.generic.documents( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'documents', 2 ), parent: '' } );
		this.memories[ 'images' ] = new this.awi.newMemories.generic.images( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'images', 3 ), parent: '' } );
		this.memories[ 'mails' ] = new this.awi.newMemories.generic.mails( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'mails', 4 ), parent: '' } );
		this.memories[ 'messenger' ] = new this.awi.newMemories.generic.messenger( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'messenger', 5 ), parent: '' } );
		this.memories[ 'photos' ] = new this.awi.newMemories.generic.photos( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'photos', 6 ), parent: '' } );
		this.memories[ 'videos' ] = new this.awi.newMemories.generic.videos( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'videos', 7 ), parent: '' } );

		this.prompts =
		{
'prompt-hello': `
Your name is {name}.
- You are {youAre} {whoUses} {theProduct}.
- You {useTheProduct} {toDoSomething}.
- You answer all questions in {mood}.
Please say hello to the user {user} in a fun and short sentence...
`,
//////////////////////////////////////////////////////////////////////////
'prompt-generic#1': `
Your name is {name}.
- You are {youAre} {whoUses} {theProduct}.
- You {useTheProduct} {toDoSomething}.
- You answer all questions in {mood}.
`,
'prompt-generic#2': `
- You are {youAre} {whoUses} {theProduct}.
- You {useTheProduct} {toDoSomething}.
- You answer all questions in {mood}.
`,
'prompt-generic#last': `
- You are {youAre} {whoUses} {theProduct}.
- You {useTheProduct} {toDoSomething}.
- You answer all questions in {mood}.
`,
'prompt-generic-takeNote': `
- Take note: {takeNote}...
`,
'prompt-generic-context': `
Please take the following context into consideration before executing the task. Context:
1. The task is related to "{toDoSomething}".
{context}
`,
'prompt-generic-conversation':`
Please read first the conversation with the user. Conversation:
{conversation}
`,
'prompt-generic-memories':`
Here are some memories about the subject, please consider them in your response. Memories:
{memories}
`,
'prompt-generic-task-question#1':`
Now the task:
Answer question: {task-question}
`,
'prompt-generic-task-question#2':`
Now the task:
Answer question: {task-question}
`,
'prompt-generic-task-question#last':`
Now the task:
Answer question: {task-question}
`,
//////////////////////////////////////////////////////////////////
'code':`
Your name is {name}.
1. You are a programming assistant that uses {language} exclusively.
2. The code you write should run {codeDestination}.
3. Your goal is to create a function that sticks to the requirements.
Please take the following requirements into consideration before executing the task:
Requirements:
1. You should create a Javascript function.
2. Start the code section with '<START-CODE>' and end it with '<END-CODE>'.
3. You should not use any async code but a callback if necessary.
4. The name of the function is: {functionName}
5. The list of parameters is: {parameters}
Task:
Please create Javascript code based on this description:
{description}
Now the code:
`,
'code-returns': `
It returns `
		}
	}
	setPrompt( prompt )
	{
		if ( this.prompts[ prompt ] || this.prompts[ prompt + '#1' ] )
		{
			this.currentPrompt = prompt;
			return true;
		}
		return false;
	}
	setTemperature( temperature )
	{
		if ( temperature < 0 )
			this.temperature = this.awi.getPersonality().temperature;
		else
			this.temperature = temperature;
		return true;
	}
	async remember( line, parameters, control )
	{
		var result = {
			direct: { souvenirs: [], content: [] },
			indirect: { souvenirs: [], content: [] }
		};
		if ( parameters.person.length > 0 )
			line = parameters.person[ 0 ];
		if ( parameters.what == 'any' )
		{
			for ( var k in this.memories )
			{
				var answer = await this.memories[ k ].findSouvenirs( line, parameters, control );
				if ( answer.success == 'found' )
				{
					result.direct.souvenirs.push( ...answer.data.direct.souvenirs );
					result.direct.content.push( ...answer.data.direct.content );
					result.indirect.souvenirs.push( ...answer.data.indirect.souvenirs );
					result.indirect.content.push( ...answer.data.indirect.content );
				}
			}
		}
		else
		{
			for ( var w = 0; w < parameters.what.length; w++ )
			{
				var memory = this.memories[ parameters.what[ w ] ];
				memory = ( typeof memory == 'undefined' ? this.memories[ parameters.what[ w ] + 's' ] : this.memories[ parameters.what[ w ] ] );
				if ( memory )
				{
					var answer = await memory.findSouvenirs( line, parameters, control );
					if ( answer.success == 'found' )
					{
						result.direct.souvenirs.push( ...answer.data.direct.souvenirs );
						result.direct.content.push( ...answer.data.direct.content );
						result.indirect.souvenirs.push( ...answer.data.indirect.souvenirs );
						result.indirect.content.push( ...answer.data.indirect.content );
					}
				}
			}
		}
		if ( result.direct.souvenirs.length + result.indirect.souvenirs.length > 0 )
			return { success: 'found', data: result };
		return { success: 'notfound' };
	}
	getPrompt( token, newData, options = {} )
	{
		if ( token == 'current' )
			token = this.currentPrompt;

		var tokenCount = '';
		var tokenQuestionCount = '';
		var variables = this.awi.utilities.copyObject( this.awi.getPersonality() );
		if ( this.awi.getConfig( 'user' ).firstName == '' )
			return '';

		variables.firstName = this.awi.getConfig( 'user' ).firstName;
		variables.lastName = this.awi.getConfig( 'user' ).lastName;
		variables.fullName = this.awi.getConfig( 'user' ).fullName;
		if ( typeof options.answerCount != 'undefined' )
			tokenCount = '#' + options.answerCount;
		if ( typeof options.answerCount != 'undefined' )
			tokenQuestionCount = '#' + options.questionCount;
		var prompt = this.prompts[ token + tokenCount ];
		if ( !prompt )
		{
			prompt = this.prompts[ token + '#last' ];
			if ( !prompt )
				prompt = this.prompts[ token ];
		}

		if ( prompt )
		{
			for ( var d = 0; d < newData.length; d++ )
			{
				var data = newData[ d ];
				var subToken = token + '-' + data.name;
				var subPrompt = this.prompts[ subToken + tokenQuestionCount ];
				if ( !subPrompt )
				{
					subPrompt = this.prompts[ subToken + '#last' ];
					if ( !subPrompt )
						subPrompt = this.prompts[ subToken ];
				}
				if ( subPrompt )
				{
					if ( data.name == 'takeNote' || data.name == 'conversation' || data.name == 'memories' )
					{
						if ( data.content )
						{
							if ( this.prompts[ token + '-' + data.name ] )
							{
								variables[ data.name ] = data.content;
								prompt += subPrompt;
							}
						}
					}
					else if ( data.content != '' )
					{
						variables[ data.name ] = data.content;
						prompt += subPrompt;
					}
				}
				else
				{
					variables[ data.name ] = data.content;
				}
			}
			prompt = this.awi.utilities.format( prompt, variables );
		}
		return prompt;
	}
	getMemoryPrompt( memoryList, user, contact, maxCount = 5 )
	{
		var count = maxCount;
		var conversation = '';
		if ( user )
			user += ' said:'
		if ( contact )
			contact += ' said:'
		for ( var m = 0; m < memoryList.length && count > 0; m++, count-- )
		{
			var memory = memoryList[ m ];
			conversation += '- ' + user + '"' + memory.userText + '"\n';
			conversation += '- ' + contact + '"' + memory.receiverText + '"\n';
		}
		return conversation;
	}
	async loadMemories( type = 'any')
	{
		var self = this;
		async function loadMemory( type )
		{
			var path = self.awi.config.getConfigurationPath() + '/' + self.name.toLowerCase() + '-' + type + '-';
			var memory;
			var answer = await self.awi.system.exists( path + 'memory.js' );
			if ( answer.success )
			{
				answer = await self.awi.system.readFile( path + 'memory.js', { encoding: 'utf8' } );
				if ( answer.success )
				{
					memory = answer.data;
					try
					{
						memory = Function( memory );
						memory = memory();
						memory = self.awi.utilities.serializeIn( memory.root, {} );
						return { success: true, data: memory };
					}
					catch( e )
					{
						return { success: false, error: 'awi:cannot-load-memory:iwa' };
					}
				}
				return { success: false, error: 'awi:cannot-load-memory:iwa' };
			}
			return { success: true };
		}
		var answer;
		if ( type == 'any' )
		{
			for ( var type in this.memories )
			{
				answer = await loadMemory( type );
				if ( !answer.success )
					break;
				if ( answer.data )
				{
					this.memories[ type ] = this.awi.initMemory( answer.data );
				}
			}
		}
		else
		{
			answer = await loadMemory( type );
			if ( answer.success )
			{
				if ( answer.data )
				{
					this.memories[ type ] = this.awi.initMemory( answer.data );
				}
			}
		}
		return answer;
	}
	async saveMemories( type = 'any' )
	{
		var self = this;
		async function saveMemory( type )
		{
			if ( self.memories[ type ] )
			{
				var memories = self.awi.utilities.serializeOut( self.memories[ type ], '' );
				var path = self.awi.config.getConfigurationPath() + '/' + self.name.toLowerCase() + '-' + type + '-';
				return await self.awi.system.writeFile( path + 'memory.js', memories, { encoding: 'utf8' } );
			}
			return { success: false, error: 'awi:no-memory-of-type:iwa' };
		}
		var answer;
		if ( type == 'any' )
		{
			for ( var type in this.memories )
			{
				answer = await saveMemory( type );
				if ( !answer.success )
					break;
			}
		}
		else
		{
			answer = await saveMemory( type );
		}
		return answer;
	}
}
module.exports.Personality = Personality;

},{}],4:[function(require,module,exports){
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
							line = 'Hello Awi... Could you first say hello to the user ' + userName + ' then invent a funny joke about programming chores?';
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
		var command = await this.awi.parser.extractCommandFromLine( line, control );
		var parameters = command.parameters;
		command.parameters = {};
		this.branch.addBubbleFromCommand( command, parameters, control );
		control.start = 'current';
		control.questionCount = this.questionCount++;
		var answer = await this.branch.play( command.line, parameters, control );
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

},{"./bubbles/awi-branch":8}],5:[function(require,module,exports){
module.exports[ "awi-branch" ] = require( "./bubbles/awi-branch.js" )
module.exports[ "awi-bubble" ] = require( "./bubbles/awi-bubble.js" )
module.exports[ "awi-memory" ] = require( "./memories/awi-memory.js" )
module.exports[ "awi-souvenir" ] = require( "./souvenirs/awi-souvenir.js" )
module.exports[ "awi-bubble-aozbasic-code" ] = require( "./bubbles/aozbasic/awi-bubble-aozbasic-code.js" )
module.exports[ "awi-bubble-generic-bin" ] = require( "./bubbles/generic/awi-bubble-generic-bin.js" )
module.exports[ "awi-bubble-generic-chat" ] = require( "./bubbles/generic/awi-bubble-generic-chat.js" )
module.exports[ "awi-bubble-generic-debug" ] = require( "./bubbles/generic/awi-bubble-generic-debug.js" )
module.exports[ "awi-bubble-generic-digest" ] = require( "./bubbles/generic/awi-bubble-generic-digest.js" )
module.exports[ "awi-bubble-generic-edit" ] = require( "./bubbles/generic/awi-bubble-generic-edit.js" )
module.exports[ "awi-bubble-generic-error" ] = require( "./bubbles/generic/awi-bubble-generic-error.js" )
module.exports[ "awi-bubble-generic-eval" ] = require( "./bubbles/generic/awi-bubble-generic-eval.js" )
module.exports[ "awi-bubble-generic-help" ] = require( "./bubbles/generic/awi-bubble-generic-help.js" )
module.exports[ "awi-bubble-generic-hex" ] = require( "./bubbles/generic/awi-bubble-generic-hex.js" )
module.exports[ "awi-bubble-generic-import" ] = require( "./bubbles/generic/awi-bubble-generic-import.js" )
module.exports[ "awi-bubble-generic-input" ] = require( "./bubbles/generic/awi-bubble-generic-input.js" )
module.exports[ "awi-bubble-generic-list" ] = require( "./bubbles/generic/awi-bubble-generic-list.js" )
module.exports[ "awi-bubble-generic-quit" ] = require( "./bubbles/generic/awi-bubble-generic-quit.js" )
module.exports[ "awi-bubble-generic-remember" ] = require( "./bubbles/generic/awi-bubble-generic-remember.js" )
module.exports[ "awi-bubble-generic-root" ] = require( "./bubbles/generic/awi-bubble-generic-root.js" )
module.exports[ "awi-bubble-generic-run" ] = require( "./bubbles/generic/awi-bubble-generic-run.js" )
module.exports[ "awi-bubble-generic-stop" ] = require( "./bubbles/generic/awi-bubble-generic-stop.js" )
module.exports[ "awi-bubble-generic-verbose" ] = require( "./bubbles/generic/awi-bubble-generic-verbose.js" )
module.exports[ "awi-bubble-generic-view" ] = require( "./bubbles/generic/awi-bubble-generic-view.js" )
module.exports[ "awi-bubble-generic-welcome" ] = require( "./bubbles/generic/awi-bubble-generic-welcome.js" )
module.exports[ "awi-bubble-generic-write" ] = require( "./bubbles/generic/awi-bubble-generic-write.js" )
module.exports[ "awi-bubble-javascript-base64" ] = require( "./bubbles/javascript/awi-bubble-javascript-base64.js" )
module.exports[ "awi-bubble-javascript-code" ] = require( "./bubbles/javascript/awi-bubble-javascript-code.js" )
module.exports[ "awi-bubble-user-diaporama" ] = require( "./bubbles/user/awi-bubble-user-diaporama.js" )
module.exports[ "awi-connector-clients-openaibrowser" ] = require( "./connectors/clients/awi-connector-clients-openaibrowser.js" )
module.exports[ "awi-connector-editors-mobile" ] = require( "./connectors/editors/awi-connector-editors-mobile.js" )
module.exports[ "awi-connector-languages-javascript" ] = require( "./connectors/languages/awi-connector-languages-javascript.js" )
module.exports[ "awi-connector-systems-mobile" ] = require( "./connectors/systems/awi-connector-systems-mobile.js" )
module.exports[ "awi-connector-utilities-parser" ] = require( "./connectors/utilities/awi-connector-utilities-parser.js" )
module.exports[ "awi-connector-utilities-time" ] = require( "./connectors/utilities/awi-connector-utilities-time.js" )
module.exports[ "awi-connector-utilities-utilities" ] = require( "./connectors/utilities/awi-connector-utilities-utilities.js" )
module.exports[ "awi-memory-generic-audios" ] = require( "./memories/generic/awi-memory-generic-audios.js" )
module.exports[ "awi-memory-generic-conversations" ] = require( "./memories/generic/awi-memory-generic-conversations.js" )
module.exports[ "awi-memory-generic-documents" ] = require( "./memories/generic/awi-memory-generic-documents.js" )
module.exports[ "awi-memory-generic-error" ] = require( "./memories/generic/awi-memory-generic-error.js" )
module.exports[ "awi-memory-generic-images" ] = require( "./memories/generic/awi-memory-generic-images.js" )
module.exports[ "awi-memory-generic-mails" ] = require( "./memories/generic/awi-memory-generic-mails.js" )
module.exports[ "awi-memory-generic-messenger" ] = require( "./memories/generic/awi-memory-generic-messenger.js" )
module.exports[ "awi-memory-generic-photos" ] = require( "./memories/generic/awi-memory-generic-photos.js" )
module.exports[ "awi-memory-generic-videos" ] = require( "./memories/generic/awi-memory-generic-videos.js" )
module.exports[ "awi-souvenir-generic-audio" ] = require( "./souvenirs/generic/awi-souvenir-generic-audio.js" )
module.exports[ "awi-souvenir-generic-document" ] = require( "./souvenirs/generic/awi-souvenir-generic-document.js" )
module.exports[ "awi-souvenir-generic-error" ] = require( "./souvenirs/generic/awi-souvenir-generic-error.js" )
module.exports[ "awi-souvenir-generic-image" ] = require( "./souvenirs/generic/awi-souvenir-generic-image.js" )
module.exports[ "awi-souvenir-generic-mail" ] = require( "./souvenirs/generic/awi-souvenir-generic-mail.js" )
module.exports[ "awi-souvenir-generic-message" ] = require( "./souvenirs/generic/awi-souvenir-generic-message.js" )
module.exports[ "awi-souvenir-generic-photo" ] = require( "./souvenirs/generic/awi-souvenir-generic-photo.js" )
module.exports[ "awi-souvenir-generic-root" ] = require( "./souvenirs/generic/awi-souvenir-generic-root.js" )
module.exports[ "awi-souvenir-generic-video" ] = require( "./souvenirs/generic/awi-souvenir-generic-video.js" )

},{"./bubbles/aozbasic/awi-bubble-aozbasic-code.js":7,"./bubbles/awi-branch.js":8,"./bubbles/awi-bubble.js":9,"./bubbles/generic/awi-bubble-generic-bin.js":10,"./bubbles/generic/awi-bubble-generic-chat.js":11,"./bubbles/generic/awi-bubble-generic-debug.js":12,"./bubbles/generic/awi-bubble-generic-digest.js":13,"./bubbles/generic/awi-bubble-generic-edit.js":14,"./bubbles/generic/awi-bubble-generic-error.js":15,"./bubbles/generic/awi-bubble-generic-eval.js":16,"./bubbles/generic/awi-bubble-generic-help.js":17,"./bubbles/generic/awi-bubble-generic-hex.js":18,"./bubbles/generic/awi-bubble-generic-import.js":19,"./bubbles/generic/awi-bubble-generic-input.js":20,"./bubbles/generic/awi-bubble-generic-list.js":21,"./bubbles/generic/awi-bubble-generic-quit.js":22,"./bubbles/generic/awi-bubble-generic-remember.js":23,"./bubbles/generic/awi-bubble-generic-root.js":24,"./bubbles/generic/awi-bubble-generic-run.js":25,"./bubbles/generic/awi-bubble-generic-stop.js":26,"./bubbles/generic/awi-bubble-generic-verbose.js":27,"./bubbles/generic/awi-bubble-generic-view.js":28,"./bubbles/generic/awi-bubble-generic-welcome.js":29,"./bubbles/generic/awi-bubble-generic-write.js":30,"./bubbles/javascript/awi-bubble-javascript-base64.js":31,"./bubbles/javascript/awi-bubble-javascript-code.js":32,"./bubbles/user/awi-bubble-user-diaporama.js":33,"./connectors/clients/awi-connector-clients-openaibrowser.js":35,"./connectors/editors/awi-connector-editors-mobile.js":36,"./connectors/languages/awi-connector-languages-javascript.js":37,"./connectors/systems/awi-connector-systems-mobile.js":38,"./connectors/utilities/awi-connector-utilities-parser.js":39,"./connectors/utilities/awi-connector-utilities-time.js":40,"./connectors/utilities/awi-connector-utilities-utilities.js":41,"./memories/awi-memory.js":42,"./memories/generic/awi-memory-generic-audios.js":43,"./memories/generic/awi-memory-generic-conversations.js":44,"./memories/generic/awi-memory-generic-documents.js":45,"./memories/generic/awi-memory-generic-error.js":46,"./memories/generic/awi-memory-generic-images.js":47,"./memories/generic/awi-memory-generic-mails.js":48,"./memories/generic/awi-memory-generic-messenger.js":49,"./memories/generic/awi-memory-generic-photos.js":50,"./memories/generic/awi-memory-generic-videos.js":51,"./souvenirs/awi-souvenir.js":52,"./souvenirs/generic/awi-souvenir-generic-audio.js":53,"./souvenirs/generic/awi-souvenir-generic-document.js":54,"./souvenirs/generic/awi-souvenir-generic-error.js":55,"./souvenirs/generic/awi-souvenir-generic-image.js":56,"./souvenirs/generic/awi-souvenir-generic-mail.js":57,"./souvenirs/generic/awi-souvenir-generic-message.js":58,"./souvenirs/generic/awi-souvenir-generic-photo.js":59,"./souvenirs/generic/awi-souvenir-generic-root.js":60,"./souvenirs/generic/awi-souvenir-generic-video.js":61}],6:[function(require,module,exports){
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
		var answers = {};
		if ( typeof this.systemConfig.engine != 'string' )
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
				var rname = 'awi-connector-' + classname + '-' + name;
				var exprts = awirequires[ rname ];
				this.connectors[ classname ] = ( typeof this.connectors[ classname ] == 'undefined' ? {} : this.connectors[ classname ] );
				this.connectors[ classname ][ name ] = new exprts.Connector( this, {} );
				this.newConnectors[ classname ] = ( typeof this.newConnectors[ classname ] == 'undefined' ? {} : this.newConnectors[ classname ] );
				this.newConnectors[ classname ][ name ] = exprts.Connector;
				if ( connector.default )
				{
					var answer = await this.connectors[ classname ][ name ].connect( connector.options );
					answers[ answer.data.classname ] = [ { success: answer.success, data: answer.data } ];
					this[ answer.data.classname ] = this.connectors[ classname ][ name ];
					this.connectors[ classname ].current = this.connectors[ classname ][ name ];
					if ( classname == 'utilities' && name == 'utilities'  )
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
						for ( var f in awirequires )
						{
							if ( f.indexOf( '-' + classname + '-' ) >= 0 )
							{
								name = f.substring( f.lastIndexOf( '-' ) + 1 );
								if ( !this.connectors[ classname ] || !this.connectors[ classname ][ name ] )
								{
									var exprts = awirequires[ name ];
									this.connectors[ classname ] = ( typeof this.connectors[ classname ] == 'undefined' ? {} : this.connectors[ classname ] );
									this.connectors[ classname ][ name ] = new exprts.Connector( this, {} );
									this.newConnectors[ classname ] = ( typeof this.newConnectors[ classname ] == 'undefined' ? {} : this.newConnectors[ classname ] );
									this.newConnectors[ classname ][ name ] = exprts.Connector;
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

			// Make the list of bubbles to load
			var classList = [ 'generic', 'audio', 'filesystem', 'user', 'vision', this.connectors.languages.current.token ];
			var answer = await this.system.getDirectory( this.config.getEnginePath() + '/bubbles', { recursive: true, filters: [ 'awi-bubble-*.js' ] } );
			var files = this.utilities.getFileArrayFromTree( answer.data );
			for ( var f in awirequires )
			{
				var namepos = f.lastIndexOf( '-' );
				var classpos = f.lastIndexOf( '-', namepos - 1 );
				var classname = f.substring( classpos + 1, namepos );
				var name = f.substring( namepos + 1 );
				var found = classList.find(
					function( element )
					{
						return element == classname;
					}
				)
				if ( found )
				{
					var exprts = awirequires[ name ];
					if ( exprts )
					{
						this.bubbles[ classname ] = ( typeof this.bubbles[ classname ] == 'undefined' ? {} : this.bubbles[ classname ] );
						this.bubbles[ classname ][ name ] = new exprts.Bubble( this, { key: this.utilities.getUniqueIdentifier( {}, name, f ), parent: '' } );
						this.newBubbles[ classname ] = ( typeof this.newBubbles[ classname ] == 'undefined' ? {} : this.newBubbles[ classname ] );
						this.newBubbles[ classname ][ name ] = exprts.Bubble;
					}
				}
			}

			// Gather souvenirs
			for ( var f in awirequires )
			{
				if ( f.indexOf( 'awi-souvenir-' ) >= 0	)
				{
					var namepos = f.lastIndexOf( '-' );
					var classpos = f.lastIndexOf( '-', namepos - 1 );
					var classname = f.substring( classpos + 1, namepos );
					var name = f.substring( namepos + 1 );
					var exprts = awirequires[ f ];
					if ( exprts )
					{
						this.newSouvenirs[ classname ] = ( typeof this.newSouvenirs[ classname ] == 'undefined' ? {} : this.newSouvenirs[ classname ] );
						this.newSouvenirs[ classname ][ name ] = exprts.Souvenir;
					}
				}
			}

			// Gather memories
			for ( var f in awirequires )
			{
				if ( f.indexOf( 'awi-memory-' ) >= 0	)
				{
					var namepos = f.lastIndexOf( '-' );
					var classpos = f.lastIndexOf( '-', namepos - 1 );
					var classname = f.substring( classpos + 1, namepos );
					var name = f.substring( namepos + 1 );
					var exprts = awirequires[ f ];
					if ( exprts )
					{
						this.newMemories[ classname ] = ( typeof this.newMemories[ classname ] == 'undefined' ? {} : this.newMemories[ classname ] );
						this.newMemories[ classname ][ name ] = exprts.Memory;
					}
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

},{"./awi-config":1,"./awi-messages":2,"./awi-personality":3,"./awi-prompt":4,"./awi-requires":5}],7:[function(require,module,exports){
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
* @file awi-bubble-generic-code.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Code command: create a javascript function
*
*/
var awibubble = require( '../awi-bubble' )
var awimessages = require( '../../awi-messages' )

class BubbleAozBasicCode extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Code';
		this.token = 'code';
		this.classname = 'aozbasic';
		this.properties.action = 'writes a javascript function';
		this.properties.inputs = [
			{ codeName: 'the name of the procedure to create.\n The name should contain the function.', type: 'string', clear: true },
			{ codeParameters: 'the list of parameters, separated by a comma.\n The name should indicate the content.', type: 'string', clear: true },
			{ codeSteps: 'the various bubbles the procedure should do, one per line.\n Stay simple, in ordern not too many details...\nEmpty line to quit.', clear: true },
			{ codeReturn: 'what the procedure should return.', type: 'string', clear: true },
			{ codeCallback: 'if the bubble is in related to network and Internet?.', type: 'yesno', clear: true },
			{ codeConfirm: 'if you confirm all the parameters above...', type: 'yesno', clear: true },
		];
		this.properties.editables =
		[
			{ name: 'prompt', type: 'text', content: `
Your name is {name}.
1. You are a programming assistant that uses Javascript exclusively.
2. The code you write should run in a browser.
3. Your goal is to create a function that sticks to the requirements.
Please take the following requirements into consideration before executing the task:
\Requirements:
1. You should create a Javascript function.
2. Start the code section with '<START-CODE>' and end it with '<END-CODE>'.
3. You should not use any async code but a callback if necessary.
4. The name of the function is: {functionName}
5. The list of parameters is: {parameters}
Task:
Please create Javascript code based on this description:
{description}
Now the code:
` 				}
		];
		this.properties.outputs = [ { javascriptCode: 'the code of the new function', type: 'string' } ];
		this.properties.parser = { verb: [ 'code', 'program' ], noun: [ 'procedure' ] };
		this.properties.select = [ [ 'verb', 'noun' ] ];
	}
	async play( line, parameters, control )
	{
		var answer = await super.play( line, parameters, control );
		if ( !answer.success )
			return { success: false, data: {}, error: 'awi:cancelled:iwa' };

 		var description = ''
		for ( var s = 0; s < parameters.codeSteps.length; s++ )
			description += ( s + 1 ) + '. ' + parameters.codeSteps[ s ] + '\n';
		if ( parameters.codeReturn != '' )
			description += ( s + 1 ) + '. ' + this.getEditable( 'returns' ) + data.codeReturn + '\n';
		var parameters = parameters.codeParameters;
		if ( parameters == '' )
		{
			if ( parameters.codeCallback )
				parameters += 'callback';
			else
				parameters = 'there is no parameters.';
		}
		else if ( parameters.codeCallback )
			parameters += ',callback';

		var prompt = awimessages.generatePrompt( this.getEditable( 'prompt' ),
		{
			name: this.awi.getConfig( 'user' ).awiName,
			mood: this.awi.getConfig( 'user' ).awiName,
			description: description,
			functionName: data.codeName,
			parameters: parameters
		} );
		var answer = this.sendCompletion( prompt, false, control );
		if ( answer.success )
		{
			var result = answer.data.text.trim();
			result = result.split( '\n' );

			var destCode;
			var name;
			var params = [];
			var startCode = 0;
			var isCallback = false;
			var endCode = result.length;
			for ( var l = 0; l < result.length; l++ )
			{
				var line = result[ l ];
				if ( line.indexOf( '<START-CODE>' ) >= 0 )
					startCode = l + 1;
				if ( line.indexOf( '<END-CODE>' ) >= 0 )
					endCode = l;
				if ( line.toLowerCase().indexOf( 'callback' ) >= 0 )
					isCallback = true;
			}
			for ( var l = startCode; l < endCode; l++ )
			{
				var line = result[ l ];
				var start = line.indexOf( 'function' );
				if ( start >= 0 )
				{
					start = line.indexOf( ' ', start );
					var end = line.indexOf( '(' );
					name = line.substring( start + 1, end );

					// Extract parameters
					start = end + 1;
					var close = line.indexOf( ')', start );
					while ( start < line.length )
					{
						while ( line.charAt( start ) == ' ' )
							start++;
						end = line.indexOf( ',', start );
						if ( end < 0 )
						{
							if ( close > start )
								params.push( line.substring( start, close ) );
							break;
						}
						params.push( line.substring( start, end ).trim() );
						start = end + 1;
					}

					// Generates code
					destCode = 'Procedure ' + name + '[';
					for ( var p = 0; p < params.length; p++ )
					{
						if ( params[ p ].toLowerCase().indexOf( 'callback' ) < 0 )
						{
							if ( p > 0 )
								destCode += ', ';
							destCode += params[ p ];
						}
					}
					destCode += ']\n';
					destCode += '\t// Javascript (do not remove this line)\n';
					destCode += '\t{\n';
					if ( isCallback )
					{
						destCode += '\t\t#waiting\n';
						destCode += '\t\tvar done=false;\n'
						destCode += '\t\tfunction onResult(result)\n';
						destCode += '\t\t{\n';
						destCode += '\t\t\taoz.tempResult=result;\n'
						destCode += '\t\t\tdone=true;\n'
						destCode += '\t\t};\n'
					}
					for ( var ll = startCode; ll < endCode; ll++ )
						destCode += '\t\t' + result[ ll ] + '\n';
					if ( !isCallback )
					{
						destCode += '\t\taoz.tempResult = ' + name + '(';
						for ( var p = 0; p < params.length; p++ )
						{
							if ( p > 0 )
								destCode += ',';
							destCode += 'vars.' + params[ p ];
						}
						destCode += ');\n';
					}
					else
					{
						destCode += '\t\tthis.wait=function()\n'
						destCode += '\t\t{\n'
						destCode += '\t\t\treturn done;\n'
						destCode += '\t\t}\n'
						destCode += '\t\tthis.callFunction=function(args)\n'
						destCode += '\t\t{\n'
						destCode += '\t\t\t' + name + '(';
						for ( var p = 0; p < params.length; p++ )
							destCode += 'args[' + p + ']' + ( p < params.length - 1 ? ',' : '' );
						destCode += ');\n';
						destCode += '\t\t}\n'
						destCode += '\t\treturn{type:12,waitThis:this,callFunction:"callFunction",waitFunction:"wait",args:[';
						for ( var p = 0; p < params.length; p++ )
						{
							if ( params[ p ].toLowerCase().indexOf( 'callback' ) < 0 )
								destCode += 'vars.' + params[ p ];
							else
								destCode += 'onResult';
							if ( p < params.length - 1 )
								destCode += ',';
						}
						destCode += ']};\n';
					}
					destCode += '\t}\n';
					destCode += 'End Proc[{aoz.tempResult}]\n';
					break;
				}
			}
			if ( destCode != '' )
			{
				destCode = this.awi.utilities.replaceStringInText( destCode, 'console.log', 'aoz.print' );
				data.code = destCode.split( '\n' );
				this.awi.editor.print( control.editor, data.code, { user: 'code' } );
				return { success: true, data: destCode };
			}
			return { success: false, data: result, error: 'awi:no-code-produced:iwa' };
		}
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
}
module.exports.Bubble = BubbleAozBasicCode;

},{"../../awi-messages":2,"../awi-bubble":9}],8:[function(require,module,exports){
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
* @file awi-branch.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short A tree of bubbles that works as a bubble: a branch.
*
*/
var awibubble = require( './awi-bubble' )

class Branch extends awibubble.Bubble
{
	constructor( awi, options )
	{
		options.errorClass = typeof options.errorClass ? options.errorClass : 'newBubbles';
		super( awi, options );
		this.classname = 'branch';
		this.oClass = 'branch';
		this.bubbleMap = {};
		this.pathways = [];
		this.pathway = 'self.bubbleMap';
		this.currentBubble = '';
		this.firstRun = true;
		this.keyCount = 0;
		this.working = 0;
		this.addBubbleFromCommand( { token: 'error', key: 'error', parentClass: options.errorClass, parameters: {}, options: {} }, {}, {} );
		this.addBubbleFromCommand( { token: 'root', key: 'root', parentClass: options.errorClass, parameters: {}, options: {} }, {}, {} );
	}
	reset()
	{
		super.reset();
		this.pathway = 'self.bubbleMap';
		this.pathways = [];
		for ( var b in this.bubbleMap )
			this.bubbleMap[ b ].reset();
	}
	async play( line, parameters, control = {} )
	{
		var data = {};
		var startBubble = this.currentBubble;
		if ( !startBubble || control.start == 'root' || this.firstRun )
		{
			startBubble = 'root';
			this.reset();
			this.working = 0;
			this.firstRun = false;
		}
		if ( !startBubble )
			return { success: false, data: {}, error: 'awi:no-bubble-to-play:iwa' };
		control.start = null;

		var answer;
		this.working++;
		var bubble = this.bubbleMap[ startBubble ];
		do
		{
			this.pathway += '.' + bubble.key;
			this.pathways.push( this.pathway );
			answer = await bubble.play( line, parameters, control );
			if ( answer.success )
			{
				// Goto next
				var exit;
				var next = answer.success;
				if ( next === true )
					next = 'success';
				if ( next != 'end' )
					exit = bubble.properties.exits[ next ];

				// Store parameters
				if ( answer.dataCallback )
				{
					answer.dataCallback( parameters );
				}
				else
				{
					if ( bubble.properties.outputs.length == 1 )
					{
						var output = this.awi.utilities.getBubbleParams( bubble.properties.outputs[ 0 ] );
						bubble.data = answer.data;
						data = answer.data;
					}
					else if ( answer.data )
					{
						for ( var o = 0; o < bubble.properties.outputs.length; o++ )
						{
							var output = this.awi.utilities.getBubbleParams( bubble.properties.outputs[ o ] );
							bubble.data[ output.name ] = answer.data[ output.name ];
							data[ output.name ] = answer.data[ output.name ];
						}
					}
				}
			}
			else if ( answer.error )
			{
				this.awi.editor.print( control.editor, answer.error, { user: 'error' } );
				exit = 'end';
			}
			this.pathway = this.pathway.substring( 0, this.pathway.lastIndexOf( '.' ) );
			bubble = this.bubbleMap[ exit ];
		} while ( bubble );
		if ( answer.success )
			answer.success = 'end';

		this.working--;
		return answer;
	}
	async playback( line, parameter, control )
	{
	}
	pause( onOff )
	{
		this.paused = onOff;
	}
	async waitPaused()
	{
		if ( !this.paused )
		 	return;

		var self = this;
		return new Promise( ( resolve ) =>
		{
			const checkPaused = () =>
			{
				if ( !self.paused )
				{
					resolve();
				}
			};
			checkPaused();
		} );
	}
	async transpile( position, line, data, control )
	{
		return await super.transpile( position, line, data, control );
	}
	async serialize( path, data, control )
	{
		return await this.run( path, data, control );
	}

	newBubble( command, parameters = {}, control = {} )
	{
		parameters = typeof command.parameters != 'undefined' ? command.parameters : parameters;
		var key = ( command.key ? command.key : this.awi.utilities.getUniqueIdentifier( this.bubbleMap, command.token, this.keyCount++ ) );
		var parent = command.parent ? command.parent : this.currentBubble;
		var parentClass = ( typeof command.parentClass == 'undefined' ? 'newBubbles' : command.parentClass );
		var classname =  ( typeof command.classname == 'undefined' ? 'generic' : command.classname );
		var exits =  ( typeof command.exits == 'undefined' ? { success: 'end' } : command.exits );
		var newBubble = new this.awi[ parentClass ][ classname ][ command.token ]( this.awi, { key: key, branch: this, parent: parent, exits: exits, parameters: parameters } );
		if ( parent && this.getBubble( parent ) )
			this.getBubble( parent ).properties.exits.success = newBubble.key;
		return newBubble;
	}
	addBubble( bubble, control = {} )
	{
		bubble.key = this.awi.utilities.getUniqueIdentifier( this.bubbleMap, bubble.token, this.keyCount++ );
		bubble.parent = this.currentBubble;
		this.getBubble( this.currentBubble ).properties.exits.success = bubble.key;
		this.bubbleMap[ bubble.key ] = bubble;
		this.currentBubble = bubble.key;
		return bubble.key;
	}
	addBubbleFromCommand( command, parameters = {}, control = {} )
	{
		command.parent = this.currentBubble;
		if ( typeof command.key == 'undefined' )
			command.key = this.awi.utilities.getUniqueIdentifier( this.bubbleMap, command.token, this.keyCount++ );
		var bubble = this.newBubble( command, parameters, control );
		this.bubbleMap[ bubble.key ] = bubble;
		this.currentBubble = bubble.key;
		return bubble.key;
	}
	addBubbles( commandList, parameters = {}, control = {} )
	{
		commandList = this.awi.utilities.isObject( commandList ) ? [ commandList ] : commandList;
		for ( var c = 0; c < commandList.length; c++ )
		{
			this.addBubbleFromCommand( commandList[ c ], parameters, control );
		}
	}
	addBubbleFromLine( line, control = {} )
	{
		var start;
		var command;
		var parameters = {};
		for ( start = 0; start < line.length; start++ )
		{
			var c = line.charAt( start );
			if ( c == '{' )
				break;
			var type = this.awi.utilities.getCharacterType( c );
			if ( type == 'letter' )
				break;
			if ( type == 'number' )
			{
				command =
				{
					token: 'eval',
					classname: 'generic',
					parameters: parameters,
					options: options
				};
				break;
			}
		}
		line = line.substring( start ).trim();

		if ( !command )
		{
			command = this.awi.parser.extractCommandFromLine( line, control );
		}
		if ( !command )
		{
			command =
			{
				token: 'chat',
				classname: 'generic',
				parameters: parameters,
				options: {}
			};
			var column = line.indexOf( ':' );
			if ( column > 0 )
			{
				var name = line.substring( 0, column );
				if ( name == this.awi.getConfig( 'user' ).firstName )
					line = line.substring( column + 1 );
				if ( name == this.awi.getPersonality().firstName )
					line = line.substring( column + 1 );
			}
		}
		this.addBubbleFromCommand( command, parameters, control );
		return line;
	}
	recallLastBubbles( howMany )
	{
		var memory = [];
		var bubbles = this.getBubbleChain( 'end', 1, howMany );
		for ( var b = bubbles.length - 1; b >= 0; b-- )
		{
			var bubble = bubbles[ b ];
			if ( bubble.token == 'chat' && bubble.data )
			{
				memory.push(
				{
					userText: bubble.parameters[ 0 ].value,
					receiverText: bubble.data.join( ' ' )
				} );

			}
		}
		return memory;
	}
	getLastData( bubble, token )
	{
		var bubble = this.getBubble( bubble.parent );
		while( bubble )
		{
			for ( var p = 0; p < bubble.properties.outputs.length; p++ )
			{
				var output = this.awi.utilities.getBubbleParams( bubble.properties.outputs[ p ] );
				if ( output.name == token && typeof bubble.data[ token ] != 'undefined' )
					return bubble.data[ token ];
			}
			bubble = this.getBubble( bubble.parent );
		}
		return null;
	}

	// Bubble tree handling
	getBubble( key )
	{
		return this.bubbleMap[ key ];
	}
	getNumberOfBubbles()
	{
		var count = 0;
		for ( var b in this.bubbleMap )
			count++;
		return count - 1;
	}
	getLastBubble( exit )
	{
		exit = ( typeof exit == 'undefined' ? 'success' : exit );

		var found;
		var bubble = this.getBubble( 'root' );
		while ( bubble )
		{
			found = bubble;
			bubble = this.getBubble( bubble.properties.exits[ exit ] );
		}
		return found;
	}
	deleteBubble( key )
	{
		if ( this.bubbleMap[ key ] )
		{
			var newBubbleMap = {};
			for ( var b in this.bubbleMap )
			{
				if ( this.bubbleMap[ b ] )
					newBubbleMap[ b ] = this.bubbleMap[ b ];
			}
			this.bubbleMap = newBubbleMap;
			return;
		}
		this.awi.systemWarning( 'Bubble not found!' )
	}
	findBubble( callback )
	{
		for ( var key in this.bubbleMap )
		{
			if ( callback( this.bubbleMap[ key ] ) )
			{
				return this.bubbleMap[ key ];
			}
		}
		return null;
	}
	getBubbleChain( whereFrom, distance, howMany, exit )
	{
		exit = ( typeof exit == 'undefined' ? 'success' : exit );

		var bubble;
		var result = [];
		if ( whereFrom == 'end' )
		{
			bubble = this.getLastBubble( exit );
			while( bubble && distance > 0 )
			{
				bubble = this.getBubble( bubble.parent );
				distance--;
			}
			while( bubble && howMany > 0 )
			{
				result.push( bubble );
				bubble = this.getBubble( bubble.parent );
				howMany--;
			}
		}
		else
		{
			bubble = this.getBubble( 'root' );
			while( bubble && distance > 0 )
			{
				bubble = this.getBubble( bubble.properties.exits[ exit ] );
				distance--;
			}
			while( bubble && howMany > 0 )
			{
				result.push( bubble );
				bubble = this.getBubble( bubble.properties.exits[ exit ] );
				howMany--;
			}
		}
		return result;
	}
}
module.exports.Branch = Branch

},{"./awi-bubble":9}],9:[function(require,module,exports){
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
* @file awi-bubble.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Main bubble class from which all elements are derived.
*
*/
class Bubble
{
	constructor( awi, options )
	{
		this.key = options.key;
		this.parameters = options.parameters ? options.parameters : {};
		this.awi = awi;
		this.options = options;
		this.parent = options.parent;
		this.branch = options.branch;
		this.classname = 'bubble';
		this.oClass = 'bubble';
		this.useCount = 0;
		this.data = {};
		this.properties =
		{
			action: '',
			inputs: [],
			outputs: [],
			editables: [],
			exits: { success: '' },
			parser: {},
			select: []
		}
		if ( typeof options.exits != 'undefined' )
		{
			for ( var e in options.exits )
			{
				this.properties.exits[ e ] = options.exits[ e ];
			}
		}
	}
	reset()
	{
		this.data = {};
		this.useCount = 0;
	}
	getEditable( name )
	{
		for ( var e = 0; e < this.properties.editables.length; e++ )
		{
			if ( this.properties.editables[ e ].name == name )
				return this.properties.editables[ e ];
		}
		return null;
	}
	async sendCompletion( prompt, stream, control )
	{
		this.awi.editor.wait( control.editor, true );
		var answer = await this.awi.client.sendCompletion( prompt, stream, control );
		this.awi.editor.wait( control.editor, false );
		return answer;
	}
	async play( line, parameters, control )
	{
		this.useCount++;
		this.awi.editor.print( control.editor, [ "Playing bubble " + this.name ], { user: 'bubble' } );

		if ( line.indexOf( '{awi:' ) == 0 )
			return { success: true };

		if ( typeof parameters == 'undefined' )
			return this.parameters;

		var todo = [];
		var lineDatas = this.awi.utilities.extractLineParameters( line, this.properties.inputs );
		parameters.line = line;
		parameters.lineCommand = lineDatas.command;
		for ( var p = 0; p < this.properties.inputs.length; p++ )
		{
			var parameter = this.awi.utilities.getBubbleParams( this.properties.inputs[ p ] );
			if ( typeof parameters[ parameter.name ] != 'undefined' && parameters[ parameter.name ] != '' )
			{
				if ( parameter.clear )
					parameters[ parameter.name ] = parameters[ parameter.name ].default;
			}
		}
		for ( var p = 0; p < this.properties.inputs.length; p++ )
		{
			var parameter = this.awi.utilities.getBubbleParams( this.properties.inputs[ p ] );
			if ( typeof parameters[ parameter.name ] == 'undefined' )
			{
				if ( parameters[ parameter.name ] === '' )
				{
					if ( typeof lineDatas[ parameter.name ] == 'undefined' )
					{
						if ( !parameter.optional )
							todo.push( { token: 'input', classname: 'generic', parameters: [ parameter ], options: {} } );
						else
							parameters[ parameter.name ] = parameter.default;
					}
					else
					{
						parameters[ parameter.name ] = lineDatas[ parameter.name ];
					}
				}
			}
			else if ( this.awi.utilities.isArray( parameters[ parameter.name ] ) && parameters[ parameter.name ].length == 0 )
			{
				if ( !parameter.optional )
					todo.push( { token: 'input', classname: 'generic', parameters: [ parameter ], options: {} } );
				else
					parameters[ parameter.name ] = parameter.default;
			}
		}
		if ( todo.length > 0 )
		{
			var params = await this.awi.prompt.getParameters( todo, control );
			if ( params.success )
			{
				for ( var p = 0; p < this.properties.inputs.length; p++ )
				{
					var prop = this.awi.utilities.getBubbleParams( this.properties.inputs[ p ] );
					if ( typeof params.data[ prop.name ] != 'undefined' )
						parameters[ prop.name ] = params.data[ prop.name ];
				}
			}
			else
			{
				return { success: false, data: {}, error: 'awi:cancelled:iwa', next: 'cancelled' };
			}
		}
		this.userInput = line;
		return { success: true };
	}
	async playback( line, parameter, control )
	{
	}
	async transpile( /*data, control*/ )
	{
	}
	async serialize()
	{

	}
}
module.exports.Bubble = Bubble;

},{}],10:[function(require,module,exports){
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
* @file awi-bubble-generic-bin.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Bin command: convert to binary
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericBin extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Bin';
		this.token = 'bin';
		this.classname = 'generic';
		this.properties.action = 'converts an expression to a binary number';
		this.properties.inputs = [ { evaluation: 'the expression to convert to binary', type: 'string' } ];
		this.properties.outputs = [ { binValue: 'the expression converted to binary', type: 'number' } ];
		this.properties.parser = {
			verb: [ 'convert', 'transform', 'calculate' ],
			adjective: [ 'binary' ],
			questionWord: [ 'what' ],
			evaluation: [ 'numeric' ] };
		this.properties.select = [ [ 'verb', 'adjective' ], [ 'questionWord', 'adjective' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );

		var answer = await this.awi.language.doEval( '' + parameters.evaluation, {} );
		if ( answer.success )
		{
			var result = '%' + this.awi.utilities.toBin( answer.data, 16 );
			this.awi.editor.print( control.editor, [ result ], { user: 'result' } );
			answer.data = result;
		}
		else
		{
			this.awi.editor.print( control.editor, [ answer.error ], { user: 'error' } );
		}
		return ( answer );
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
module.exports.Bubble = BubbleGenericBin;

},{"../awi-bubble":9}],11:[function(require,module,exports){
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
* @file awi-bubble-generic-chat.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Chat bubble
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericChat extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Chat';
		this.token = 'chat';
		this.classname = 'generic';
		this.questionCount = 1;
		this.properties.action = 'answers to generic questions';
		this.properties.inputs = [ { userInput: 'the question', type: 'string' } ];
		this.properties.outputs = [ { awiAnswer: 'the answer to the question', type: 'string' } ];
		this.empty = false;
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		this.empty = true;

		// Scan for internal commands in original line.
		var start = parameters.userInput.indexOf( '{chat:' );
		if ( start >= 0 )
		{
			do
			{
				var end = parameters.userInput.indexOf ( ':chat}', start );
				if ( end > 0 )
				{
					var embed = parameters.userInput.substring( start + 6, end );
					var space = embed.indexOf( ' ' );
					if ( space < 0 )
						space = embed.length;
					var ok = false;
					if ( space >= 0 )
					{
						switch ( embed.substring( 0, space ) )
						{
							case 'settemperature':
								var lineData = this.awi.utilities.extractLineParameters( embed, [ { name: 'temperature', type: 'number' } ] );
								ok = this.awi.personality.setTemperature( lineData.temperature );
								break;
							case 'setprompt':
								var lineData = this.awi.utilities.extractLineParameters( embed, [ { name: 'prompt', type: 'string' } ] );
								ok = this.awi.personality.setPrompt( lineData.prompt );
								break;
							case 'resume':
								ok = true;
								break;
						}
					}
					if ( !ok )
						return { success: false, error: 'awi:bad-command:iwa' };
					parameters.userInput = parameters.userInput.substring( 0, start ) + parameters.userInput.substring( end + 6 );
					start = parameters.userInput.indexOf( '{chat:' );
				}
				else
				{
					return { success: false, error: 'awi:bad-command:iwa' };
				}
			} while( start >= 0 );
			parameters.userInput = parameters.userInput.trim();
			if ( parameters.userInput.length == 0 )
				return { success: true, data: 'noprompt' };
		}
		this.parameters.userInput = parameters.userInput;

		// Scan the command for Basic keywords.
		var context = '';
		if ( this.awi.connectors.languages.current )
		{
			var foundKeywords = this.awi.language.scanForCommands( parameters.userInput );
			for ( var f = 0; f < foundKeywords.length; f++ )
			{
				var completion = foundKeywords[ f ].completion.trim();
				completion = completion.charAt( 0 ).toLowerCase() + completion.substring( 1 );
				completion = this.awi.utilities.replaceStringInText( completion, '###', '' );
				context += ( f + 2 ) + '.' + foundKeywords[ f ].instruction + ' is ' + completion + '\n';
			}
		}

		// Gather previous or relevant conversations { caseInsensitive: true }
		control.caseInsensitive = true;
		var memories = await this.awi.extractContentFromMemories( line, { senderName: this.awi.config.getConfig( 'user' ).fullName }, control );
		//memories.push( ...this.awi.memoryManager.recall( parameters.userInput ) );
		var conversation = '';
		var takenote = '';
		if ( this.awi.getConfig( 'user' ).firstName != '' )
		{
			conversation = this.awi.personality.getMemoryPrompt( memories, this.awi.getConfig( 'user' ).firstName, this.awi.getPersonality().name, 5 );
			takenote = this.awi.getConfig( 'user' ).takeNote;
		}
		control.answerCount = this.useCount;
		var prompt = this.awi.personality.getPrompt( 'current' ,
		[
			{ name: 'context', content: context },
			{ name: 'takeNote', content: takenote },
			{ name: 'conversation', content: conversation },
			{ name: 'memories', content: memories.data.directExtracted + memories.data.indirectExtracted },
			{ name: 'task-question', content: parameters.userInput },
		], control );
		control.answerCount = undefined;
		this.awi.editor.print( control.editor, prompt, { user: 'prompt' } );
		var answer = await this.sendCompletion( prompt, false, control );
		if ( answer.success )
		{
			var text =  this.awi.cleanResponse( answer.data.text );
			this.awi.editor.print( control.editor, text, { user: 'awi' } );
			answer.data = text;
			this.empty = false;
		}
		return answer;
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
module.exports.Bubble = BubbleGenericChat;

},{"../awi-bubble":9}],12:[function(require,module,exports){
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
* @file awi-bubble-generic-debug.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Debug command: manage debugging
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericDebug extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Debug';
		this.token = 'debug';
		this.classname = 'generic';
		this.properties.action = 'sets the level of debug of awi';
		this.properties.inputs = [ { evaluation: 'the level of debug, from 0 to 3', type: 'number', interval: { start: 0, end: 3 }, optional: false } ];
		this.properties.outputs = [ { evalValue: 'the last evaluated expression', type: 'number' } ];
		this.properties.parser = {
			verb: [ 'debug' ],
			evaluation: [ 'numeric' ] };
		this.properties.select = [];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );

		var answer = await this.awi.language.doEval( '' + parameters.evaluation, {} );
		if ( answer.success )
		{
			var debug = Math.floor( answer.data );
			var oldDebug = this.awi.config.getDebug();
			if ( debug != oldDebug )
			{
				this.awi.editor.print( control.editor, 'Setting debug level to ' + debug, { user: 'root' } );
				this.awi.config.setDebug( debug );
			}
		}
		else
		{
			this.awi.editor.print( control.editor, [ answer.error ], { user: 'error' } );
		}
		return answer;
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
module.exports.Bubble = BubbleGenericDebug;

},{"../awi-bubble":9}],13:[function(require,module,exports){
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
* @file awi-bubble-generic-digest.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Digest command: digest the content of the toDigest directory
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericDigest extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Digest';
		this.token = 'digest';
		this.classname = 'generic';
		this.properties.action = 'read the files in the input buffer and memorize them';
		this.properties.inputs = [
			{ noun: 'the topic of data to process, example "Friend Name"', type: 'string', optional: true, default: '' },
		];
		this.properties.outputs = [
			{ receiverName: 'the name of the receiver', type: 'string'  },
			{ souvenirs: 'list of souvenirs associated to the receiver', type: 'array.string.souvenir' }
		]
		this.properties.parser = {
			noun: [ 'audio', 'sound', 'video', 'document', 'messenger', 'image', 'photo' ],
			verb: [ 'digest' ] };
		this.properties.select = [ [ 'verb' ] ];
	}
	async messenger( path, parameters, control )
	{
		var self = this;

		// Import one message listdigest
		async function importMessages( todo, control )
		{
			var importer = self.awi.getConnector( 'importers', 'messenger', {} );
			control.from = todo.from;
			var answer = await importer.import( todo.htmlPath, parameters.senderName, todo.receiverNameCompressed, control );
			if ( answer.success )
			{
				todo.done = true;
				todo.error = false;
				todo.souvenirs = answer.data.souvenirs;
				todo.receiverName = answer.data.receiverName;
			}
			else
			{
				todo.error = true;
			}
			return todo;
		}

		var todo = [];
		var directoriesToScan =
		[
			'archived_threads',
			'filtered_threads',
			'inbox'
		];
		for ( var d = 0; d < directoriesToScan.length; d++ )
		{
			var dirPath = this.awi.utilities.normalize( path + '/messages/' + directoriesToScan[ d ] );
			var answer = await this.awi.system.getDirectory( dirPath, { recursive: true } );
			if ( answer )
			{
				var files = answer.data;
				if ( !parameters.receiverName )
				{
					for ( var f = 0; f < files.length; f++ )
					{
						var dirContact = files[ f ];
						if ( dirContact.isDirectory )
						{
							var pos = dirContact.name.indexOf( '_' );
							if ( pos >= 0 )
							{
								var receiverNameCompressed = dirContact.name.substring( 0, pos );
								for ( var ff = 0; ff < dirContact.files.length; ff++ )
								{
									var file = dirContact.files[ ff ];
									if ( file.name.indexOf( 'message_' ) == 0 )
									{
										todo.push(
										{
											senderName: parameters.senderName,
											receiverNameCompressed: receiverNameCompressed,
											receiverName: '',
											htmlPath: file.path,
											dirPath: dirContact.path,
											from: 'from ' + directoriesToScan[ d ],
											done: false
										} );
									}
								}
							}
						}
					}
				}
				else
				{
					var receiverNameCompressed = parameters.receiverName.split( ' ' ).join( '' ).toLowerCase();
					for ( var f = 0; f < files.length; f++ )
					{
						var dirContact = files[ f ];
						if ( dirContact.isDirectory && dirContact.name.indexOf( receiverNameCompressed ) == 0 )
						{
							for ( var ff = 0; ff < dirContact.files.length; ff++ )
							{
								if ( dirContact.files[ ff ].name.indexOf( 'message_' ) == 0 )
								{
									todo.push(
									{
										receiverNameCompressed: receiverNameCompressed,
										receiverName: '',
										htmlPath: dirContact.files[ ff ].path,
										dirPath: dirContact.path,
										from: 'from folder ' + directoriesToScan[ d ],
										done: false
									} );
								}
							}
						}
					}
				}
			}
		}

		var invalid = [];
		var valid = [];
		if ( control.store )
		{
			for ( var td = 0; td < todo.length; td++ )
			{
				var tobedone = await importMessages( todo[ td ], control );
				if ( !tobedone.error )
				{
					if ( tobedone.souvenirs.length > 0 )
					{
						for ( var s = 0; s < tobedone.souvenirs.length; s++ )
						{
							if ( this.awi.personality.memories.messenger.addSouvenir( tobedone.souvenirs[ s ], control ) )
								valid.push( tobedone.souvenirs[ s ] );
						}
					}
				}
				else
				{
					invalid.push( tobedone.dirPath );
				}
			}
		}
		control.store = false;
		return {
			invalid: invalid,
			valid: valid
		}
	}
	async videos( path, parameters, control )
	{
		var invalid = [];
		var valid = [];
		var importer = this.awi.getConnector( 'importers', 'video', {} );

		var answer = await this.awi.system.getDirectory( this.awi.config.getDataPath() + '/todigest/videos', { recursive: true, filters: [ '*.mp4', '*.ogg' ] } );
		if ( answer.success )
		{
			var files = this.awi.utilities.getFileArrayFromTree( answer.data );
			for ( var f = 0; f < files.length; f++ )
			{
				var file = files[ f ];
				control.type = 'videos';
				answer = await importer.import( file.path, parameters.senderName, control );
				if ( answer.success )
				{
					valid.push( ...answer.data.souvenirs );
				}
				else
				{
					invalid.push( file.path );
				}
			}
		}
		if ( control.store && valid.length > 0 )
		{
			var newValid = [];
			for ( var v = 0; v < valid.length; v++ )
			{
				if ( this.awi.personality.memories.videos.addSouvenir( valid[ v ], control ) )
					newValid.push( valid[ v ] );
			}
			valid = newValid;
		}
		control.store = false;
		return {
			invalid: invalid,
			valid: valid
		}
	}
	async audios( path, parameters, control )
	{
		var invalid = [];
		var valid = [];
		var importer = this.awi.getConnector( 'importers', 'audio', {} );

		var answer = await this.awi.system.getDirectory( this.awi.config.getDataPath() + '/todigest/audios', { recursive: true, filters: [ '*.wav', '*.mp3', '*.ogg' ] } );
		if ( answer.success )
		{
			var files = this.awi.utilities.getFileArrayFromTree( answer.data );
			for ( var f = 0; f < files.length; f++ )
			{
				var file = files[ f ];
				answer = await importer.import( file.path, parameters.senderName, control );
				if ( answer.success )
				{
					valid.push( ...answer.data.souvenirs );
				}
				else
				{
					invalid.push( file.path );
				}
			}
		}
		if ( control.store && valid.length > 0 )
		{
			var newValid = [];
			for ( var v = 0; v < valid.length; v++ )
			{
				if ( this.awi.personality.memories.audios.addSouvenir( valid[ v ], control ) )
					newValid.push( valid[ v ] );
			}
			valid = newValid;
		}
		control.store = false;
		return {
			invalid: invalid,
			valid: valid
		}
	}
	async play( line, parameters, control )
	{
		if ( typeof parameters.senderName == 'undefined' )
			parameters.senderName = this.awi.getConfig( 'user' ).fullName;

		var answer = await super.play( line, parameters, control );
		if ( answer.success )
		{
			var result =
			{
				valid: [],
				invalid: []
			};
			var type = parameters.noun;
			if ( type )
			{
				var path = this.awi.utilities.normalize( this.awi.config.getDataPath() + '/todigest/' + type );
				var exist = await this.awi.system.exists( path );
				if ( !exist.success )
				{
					type += 's';
					path = this.awi.utilities.normalize( this.awi.config.getDataPath() + '/todigest/' + type );
					exist = await this.awi.system.exists( path );
				}
				if ( !exist.success )
				{
					this.awi.editor.print( control.editor, 'Cannot import files of type "' + type + '".', { user: 'error' } );
					this.awi.editor.print( control.editor, 'Supported import types: audio, video, messenger, and more to come!', { user: 'awi' } );
					return { success: false, data: 'awi:cannot-import:iwa' };
				}
				if ( this[ type ] )
				{
					control.store = true;
					var info = await this[ type ]( path, parameters, control );
					result.valid.push( ...info.valid );
					result.invalid.push( ...info.invalid );
				}
			}
			else
			{
				var path = this.awi.config.getDataPath() + '/todigest';
				var answer = await this.awi.system.getDirectory( path, { recursive: false } );
				if ( answer.success )
				{
					var files = answer.data;
					for ( var d = 0; d < files.length; d++ )
					{
						var file = files[ d ];
						if ( file.isDirectory )
						{
							if ( this[ file.name ] )
							{
								control.store = true;
								var info = await this[ file.name ]( file.path, parameters, control );
								result.valid.push( ...info.valid );
								result.invalid.push( ...info.invalid );
							}
						}
					}
				}
			}
			this.awi.editor.print( control.editor, result.valid.length +' souvenirs added.', { user: 'information' } );
			if ( result.invalid.length > 0 )
			{
				this.awi.editor.print( control.editor, 'These items could not be imported...', { user: 'warning' } );
				for ( var i = 0; i < result.invalid.length; i++ )
					this.awi.editor.print( control.editor, ' - ' +  result.invalid[ i ], { user: 'warning' } );
			}
			return { success: true, data: { receiverName: parameters.receiverName, souvenirs: result.valid } };
		}
		return answer;
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
module.exports.Bubble = BubbleGenericDigest;

},{"../awi-bubble":9}],14:[function(require,module,exports){
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
* @file awi-bubble-generic-play.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Play command: play a media file in the current editor
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericEdit extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Edit';
		this.token = 'edit';
		this.classname = 'generic';
		this.properties.action = 'edit a file';
		this.properties.inputs = [
			{ file: 'the file to edit', type: 'string' },
			{ date: 'the date when the file was created', type: 'string', optional: true },
			{ time: 'the time when the file was created', type: 'string', optional: true },
			{ input: 'description of the content to search for', type: 'string', optional: true },
			];
		this.properties.outputs = [ { files: 'the last list of files', type: 'path.string.array' },
									{ fileEdited: 'the last file to be ran', type: 'path' } ];
		this.properties.parser = {
			verb: [ 'edit', 'modify', 'change', 'correct' ],
			file: [], date: [], time: [], input: [] };
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		var self = this;
		async function playIt( file, files )
		{
			var play = await self.awi.system.playFile( file, 'edit', control );
			if ( play.success )
			{
				if ( typeof files != 'undefined' )
					return { success: true, data: { files: files, fileEdited: file } };
				return { success: true, data: { fileEdited: file } };
			}
		}

		await super.play( line, parameters, control );
		if ( /^\d+$/.test( line ) )
		{
			var files = this.branch.getLastData( this, 'files' );
			if ( files && files.length > 0 )
			{
				var number = parseInt( line ) - 1;
				if ( number >= 0 && number < files.length )
					return await playIt( files[ number ] );
				return { success: false, error: 'awi:not-found:iwa' };
			}
		}
		var answer = await this.awi.system.findFiles( line, parameters, control );
		if ( !answer.success )
			return { success: false, error: 'awi:not-found:iwa' };

		if ( answer.success === '1' )
			return await playIt( answer.data[ 0 ], answer.data );

		var result = [];
		this.awi.editor.print( control.editor, [ 'You can edit these files: ' ], { user: 'information' } );
		for ( var f = 0; f < answer.data.length; f++ )
			result.push( ( f + 1 ) + '. ' + answer.data[ f ].path );
		this.awi.editor.print( control.editor, result, { user: 'information' } );
		var param = await this.awi.prompt.getParameters( [
			{ choice: 'Please enter a number between 1 and ' + answer.data.length, type: 'number', interval: [ 1, answer.data.length ], optional: false, default: 0 },
			], control );
		if ( param.success )
			return await playIt( answer.data[ param.data.choice - 1 ], answer.data );
		return answer;
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
module.exports.Bubble = BubbleGenericEdit;

},{"../awi-bubble":9}],15:[function(require,module,exports){
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
* @file awi-bubble-generic-error.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Error management bubble
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericError extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Error';
		this.token = 'error';
		this.classname = 'generic';
		this.properties.action = 'handle errors';
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return { success: '' };
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
module.exports.Bubble = BubbleGenericError;

},{"../awi-bubble":9}],16:[function(require,module,exports){
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
* @file awi-bubble-generic-eval.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Eval command: perform a calculation
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericEval extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );

		this.name = 'Eval';
		this.token = 'eval';
		this.classname = 'generic';
		this.properties.action = 'converts a string to a number';
		this.properties.inputs = [ { evaluation: 'the expression to convert', type: 'string' } ];
		this.properties.outputs = [ { evalValue: 'the last evaluated expression', type: 'number' } ];
		this.properties.parser = {
			verb: [ 'eval', 'evaluate', 'calculate', 'calc' ],
			evaluation: [ 'numeric' ] };
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var answer = await this.awi.language.doEval( '' + parameters.evaluation, {} );
		if ( answer.success )
		{
			this.awi.editor.print( control.editor, [ '' + answer.data ], { user: 'result' } );
		}
		else
		{
			this.awi.editor.print( control.editor, [ answer.error ], { user: 'awi' } );
		}
		return answer;
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
module.exports.Bubble = BubbleGenericEval;

},{"../awi-bubble":9}],17:[function(require,module,exports){
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
* @file awi-bubble-generic-help.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Help command: provides help about the awi-engine
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericHelp extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Help';
		this.token = 'help';
		this.classname = 'generic';
		this.properties.action = 'provide help about using awi';
		this.properties.inputs = [ { input: 'the desired topic', type: 'string', optional: true, default: '' } ];
		this.properties.outputs = [ { helpTopic: 'help about the topic', type: 'string' } ];
		this.properties.parser = {
			verb: [ 'help' ],
			input: [] };
		this.properties.select = [ [ 'verb' ] ];
		this.properties.editables =
		[
			{ name: 'welcome', type: 'text', content: `
Hello Awi help.
===============
1. Start any line with . to talk to Awi.
2. Type your question with or without command, Awi will answer.
3. Refine your questions until satisfied.
4. Press <ESCAPE> to erase the last prompt and go up in the conversation.
[wait]
Awi can do many things such as:
- Answer to general questions
- Refine a subject deeper and deeper
- Find files and assets, import them for you
- Perform calculations and conversions
- Find mails from descriptions and extract data from them
- Copy, rename files on your computer with your authorisation
- Help you fix problems in software or hardware
etc.
[wait]
Such actions are called commands. As in a command line, you can
directly call a command with it's name.
Example, once the awi prompt is open after the initial ".awi",
.find mypic*.png
..searching...
...<path>
...<path>
...<path>
.
You can ask help for the list of commands.
[wait]
Once a conversation has performed a bubble, and the result is the one
you expected (example, you found this kind of "blue" assets in your asset
directory), you can convert the conversation into a new command that will
be integrated to the list of commands. In the process "blue" will become
a parameter. Ask for info on the subject by typing "help commands".
[wait]
You can also transpile the conversation into any language of your choice,
Aoz only for the moment, and it will become a function that, in our case,
will look for assets of a certain color.

Do you need help on a certain subject? If yes, just type ".help subject".
` 				},
			{ name: 'commands', type: 'text', content: `
Awi list of commands.
---------------------
This list is destined to grow.

Commands may or may not call Awi for a response.

.play filename.mp4/mp3/wav/ogg: Plays the given file.
.calc <expression>: Calculates the result of a expression locally.
.hex <expression>: Displays the hexadecimal version of the expression.
.bin <expression>: Displays the binary version of the expression.
.run <application>: Launch an AOZ Application/accessory in the AOZ Viewer.
.find <file_name>: Locate a file in the Magic Drive and display its path
.import <file_name>: Same as above and adds the file in the resource folder.
.code <description>: Creates a procedure from the instructions.
.image <description>: Creates an image from the description.
.data <query>: Create Data segments with the result of the query.
.array <query>: Creates an array containing the elements from the query.
.prompt <fuzzy prompt>: Refines a prompt by asking the AI the best prompt.
.help displays that help (or an empty prompt).
` 				}
		]
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var text = this.findEditable( parameters.input );
		if ( !text )
			text = this.findEditable( 'welcome' );
		text = text.content.split( '\r\n' ).join( '\n' ).split( '\n' )
		this.awi.editor.print( control.editor, text, { user: 'awi' } );
		return { success: true, data: text };
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
	transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
}
module.exports.Bubble = BubbleGenericHelp;

},{"../awi-bubble":9}],18:[function(require,module,exports){
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
* @file awi-bubble-generic-hex.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Hex command: convert to hexadecimal
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericHex extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options )
		this.name = 'Hex';
		this.token = 'hex';
		this.classname = 'generic';
		this.properties.action = 'converts an expression to a hexadecimal number';
		this.properties.inputs = [ { evaluation: 'the expression to convert to hexadecimal', type: 'string' } ];
		this.properties.outputs = [ { hexValue: 'the expression converted to hexadecimal', type: 'number' } ];
		this.properties.parser = {
			verb: [ 'convert', 'transform', 'calculate' ],
			adjective: [ 'hexadecimal', 'hexa' ],
			questionWord: [ 'what' ],
			evaluation: [ 'numeric' ] };
		this.properties.select = [ [ 'verb', 'adjective' ], [ 'questionWord', 'adjective' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var answer = await this.awi.language.doEval( '' + parameters.evaluation, {} );
		if ( answer.success )
		{
			var result = '$' + this.awi.utilities.toHex( answer.data, 8 );
			this.awi.editor.print( control.editor, [ result ], { user: 'result' } );
			return { success: true, data: result };
		}
		this.awi.editor.print( control.editor, [ answer.error ], { user: 'awi' } );
		return answer;
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
}
module.exports.Bubble = BubbleGenericHex;

},{"../awi-bubble":9}],19:[function(require,module,exports){
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
* @file awi-bubble-generic-import.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Import command: import a file in the current project through the current editor connector
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericImport extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Import';
		this.token = 'import';
		this.classname = 'generic';
		this.properties.action = 'import assets in the designated folder of the application';
		this.properties.inputs = [ { file: 'the name or number of the asset to import', type: 'string' } ];
		this.properties.outputs = [ { importedPath: 'the path to the asset', type: 'path' } ];
		this.properties.inputs = [
			{ file: 'the file to import', type: 'string' },
			{ date: 'the date when the file was created', type: 'string', optional: true },
			{ time: 'the time when the file was created', type: 'string', optional: true },
			{ input: 'description of the content to search for', type: 'string', optional: true },
			];
		this.properties.parser = {
			verb: [ this.name ], file: [], date: [], time: [], input: [] };
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var self = this;
		async function importFile( path )
		{
			var answer = await self.awi.language.import( path );
			if ( answer.success )
				self.awi.editor.print( this, [ 'File successfully imported to: ' + path ], { user: 'information' } );
			else
				self.awi.editor.print( this, [ 'Cannot import file : ' + path ], { user: 'error' } );
			return answer;
		}
		if ( /^\d+$/.test( parameters.userInput ) )
		{
			var fileList = this.branch.getLastData( this, 'fileList' );
			if ( fileList && fileList.length > 0 )
			{
				var number = parseInt( parameters.userInput ) - 1;
				if ( number >= 0 && number < fileList.length )
				{
					var path = fileList[ number ].path;
					return await importFile( path );
				}
				return { success: false, error: 'awi:cancelled:iwa' };
			}
			return { success: false, error: 'awi:no-file-list-found:iwa' };
		}
		var answer = await this.awi.language.getImportPaths();
		var importPaths = answer.data;
		answer = await this.awi.system.findFile( importPaths.toScan, parameters.userInput, { filters: [ '*.*' ] } );
		var files = this.awi.utilities.removeDuplicatesFromFiles( answer.data );
		if ( files.length == 0 )
		{
			this.awi.editor.print( control.editor, [ 'No asset found with that name...' ], { user: 'information' } );
			return { success: false, error: 'awi:no-file-list-found:iwa' };
		}
		if ( files.length == 1 )
			return await importFile( files[ 0 ].path );
		var result = [];
		this.awi.editor.print( control.editor, [ 'I have found these assets:' ], { user: 'information' } );
		for ( var l = 0; l < files.length; l++ )
			result.push( ( l + 1 ) + '. ' + files[ l ].name );
		this.awi.editor.print( control.editor, result, { user: 'information' } );
		var param = await this.awi.prompt.getParameters( [ {
			token: 'input',
			classname: 'generic',
			parameters: [ { name: 'choice',	description: 'Please enter a number between 1 and ' + files.length, type: 'number',	interval: [ 1, files.length ] } ],
			options: { }
		} ], control );
		if ( param.success )
			return await importFile( files[ param.data.userInput - 1 ].path );
		return { success: false, error: 'awi:cancelled:iwa', data: {} };
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
module.exports.Bubble = BubbleGenericImport;

},{"../awi-bubble":9}],20:[function(require,module,exports){
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
* @file awi-bubble-generic-input.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Input command: input missing parameters
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericInput extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Input';
		this.token = 'input';
		this.classname = 'generic';
		this.properties.action = 'ask the user for input';
		this.properties.inputs = [ { inputInfo: 'information on the data to input', type: 'array' } ];
		this.properties.outputs = [];
	}
	/*
	async getParameters( parameters, data, control = {} )
	{
		var data = {};
		for ( var p = 0 ; p < parameters.length; p++ )
		{
			var bubble = this.bubl.newBubble( { token: 'input', classname: 'generic', parameters: {} }, [], control );
			var parameter = { inputInfo: this.awi.utilities.getBubbleParams( parameters[ p ] ) };
			var answer = await bubble.play( '', parameter, control );
			if ( !answer.success )
				return answer;
		}
		return { success: true, data: data };
	}
	*/
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		if ( !parameters.inputInfo )
			return { success: false, error: 'awi:cancelled:iwa' };

		var self = this;
		var result;
		var firstResult;
		var firstType = '';
		var type = parameters.inputInfo.type;
		var dot = type.indexOf( '.' );
		if ( dot > 0 )
		{
			firstType = type.substring( 0, dot );
			type = type.substring( dot + 1 );
			if ( firstType == 'array' )
				firstResult = [];
		}

		this.properties.outputs[ 0 ] = {};
		this.properties.outputs[ 0 ][ parameters.inputInfo.name ] = description;
		this.properties.outputs[ 0 ].type = parameters.inputInfo.type;
		var text;
		var description = parameters.inputInfo.description;
		switch ( firstType )
		{
			case 'array':
				text = '\nPlease enter, line by line, ' + description + '.\nPress <return> to exit...', { user: 'awi' };
				break;
			case 'choices':
				text = '\n' + description + '\n';
				for ( var c = 0; c < parameters.inputInfo.choices.length; c++ )
				{
					var t = parameters.inputInfo.choices[ c ];
					if ( t == parameters.inputInfo.default )
						t += ' (default)';
					text += ' ' + ( c + 1 ) + '. ' + t + '\n';
				}
				text += 'Or press <return> for default.';
				break;
			case 'yesno':
				text = '\n' + description;
				break;
			default:
				text = '\nPlease enter ' + description
				break;
		}
		this.awi.editor.print( control.editor, text.split( '\n' ), { user: 'question' } );

		var self = this;
		var finished = false;
		this.awi.editor.rerouteInput( control.editor,
			function( line )
			{
				var start = 0;
				var c = self.awi.utilities.getCharacterType( line.charAt( start ) );
				while( c != 'letter' && c != 'number' && start < line.length )
				{
					start++;
					c = self.awi.utilities.getCharacterType( line.charAt( start ) );
				}
				line = line.substring( start );
				if ( line == '' )
				{
					result = '<___cancel___>';
				}
				else
				{
					if ( type == 'number' )
					{
						var number = parseInt( line );
						if ( !isNaN( number ) )
						{
							var interval = parameters.inputInfo.interval;
							if ( interval )
							{
								if ( number < interval.start || number < interval.end )
								{
									self.awi.editor.print( this, [ 'Please enter a number between ' + interval.start + ' and ' + interval.end + '...' ], { user: 'information' } );
									return;
								}
							}
							result = number;
						}
					}
					else
					{
						result = line;
					}
				}
				if ( result != '<___cancel___>' )
				{
					var prompt = self.awi.config.getPrompt( 'question' );
					switch ( firstType )
					{
						case 'array':
							var dot = result.indexOf( '.' );
							if ( dot >= 0 && dot < 8 )
								result = result.substring( dot + 1 ).trim();
							if ( result.length == '' )
							{
								result = firstResult;
								break;
							}
							firstResult.push( result );
							self.awi.editor.waitForInput( control.editor, { force: true } );
							return;
						case 'choices':
							result = parseInt( result );
							var found;
							if ( !isNaN( result ) && result >= 0 && result <= parameters.inputInfo.choices.length )
								found = parameters.inputInfo.choices[ result - 1 ];
							if ( !found )
							{
								text.push(  + parameters.inputInfo.default + '.' );
								self.awi.editor.print( this, 'Please enter a number between 1 and ' + parameters.inputInfo.choices.length, { user: 'awi' } );
								self.awi.editor.waitForInput( control.editor, { force: true } );
								return;
							}
							else
							{
								result = found;
							}
							break;
						case 'yesno':
							if ( result == '<___cancel___>' )
							{
								result = parameters.inputInfo.default;
							}
							else
							{
								if ( result.charAt( 0 ).toLowerCase() == 'y' )
									result = 'yes';
								else
								{
									text.push( 'Please answer yes or no...' );
									self.awi.editor.print( this, text, { user: 'awi' } );
									self.awi.editor.waitForInput( control.editor, { force: true } );
									return;
								}
							}
							break;
					}
				}
				else
				{
					switch ( firstType )
					{
						case 'array':
							result = firstResult;
							break;
						case 'choices':
						case 'yesno':
							result = parameters.inputInfo.default;
							break;
					}
				}
				self.awi.editor.rerouteInput( control.editor );
				finished = true;
			} );

		// Wait for input
		var prompt = this.awi.config.getPrompt( 'question' );
		if ( firstType == 'array' )
			prompt += '1. ';
		this.awi.editor.waitForInput( control.editor );
		return new Promise( ( resolve ) =>
		{
			const checkPaused = () =>
			{
				var handle = setInterval(
					function()
					{
						if ( finished )
						{
							clearInterval( handle );
							if ( result == '<___cancel___>' )
								resolve( { success: false, error: 'awi:cancelled:iwa' } );
							else
							{
								var data = {};
								data[ parameters.inputInfo.name ] = result;
								self.properties.outputs = [ {} ];
								self.properties.outputs[ 0 ].name = parameters.inputInfo.name;
								resolve( { success: true, data: data } );
							}
						}
					} );
			};
			checkPaused();
		} );
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
module.exports.Bubble = BubbleGenericInput;

},{"../awi-bubble":9}],21:[function(require,module,exports){
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
* @file awi-bubble-generic-find.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Find command: find files in the registered users directories
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericList extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'List';
		this.token = 'list';
		this.classname = 'generic';
		this.properties.action = 'list files in the registered user directories or any directory';
		this.properties.inputs = [
			{ file: 'the file(s) to find', type: 'string' },
			{ date: 'the date when the file was created', type: 'string', optional: true },
			{ time: 'the time when the file was created', type: 'string', optional: true },
			{ input: 'description of the content to search for', type: 'string', optional: true },
			];
		this.properties.outputs = [ { files: 'the last list of files', type: 'file.array' } ];
		this.properties.parser = { verb: [ 'list' ], file: [],	date: [], time: [], input: []	};
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var answer = await this.awi.system.findFiles( line, parameters, control );
		if ( !answer.success )
			return { success: false, error: 'awi:not-found:iwa' };

		var files = answer.data;
		var result = [];
		for ( var f = 0; f < answer.data.length; f++ )
			result.push( ( f + 1 ) + '. ' + answer.data[ f ].path );
		this.awi.editor.print( control.editor, result, { user: 'information' } );
		return { success: true, data: { files: files } };
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
module.exports.Bubble = BubbleGenericList;

},{"../awi-bubble":9}],22:[function(require,module,exports){
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
* @file awi-bubble-generic-saveconfig.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Quit: save conversations and memories and quits Awi.
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericQuit extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Quit';
		this.token = 'quit';
		this.classname = 'generic';
		this.properties.action = 'save conversations and memories and quits Awi';
		this.properties.inputs = [ ];
		this.properties.outputs = [ ];
		this.properties.parser = { verb: [ 'quit', 'leave', 'exit' ] };
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		await this.awi.config.saveConfigs( this.awi.config.user );
		var answer = await this.awi.save( this.awi.config.user );
		if ( answer.success )

			this.awi.system.quit();
		this.awi.editor.print( control.editor, 'Cannot save memories and conversations. Please check your setup.' );
		return answer;
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
module.exports.Bubble = BubbleGenericQuit;

},{"../awi-bubble":9}],23:[function(require,module,exports){
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
* @file awi-bubble-generic-remember.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Remember command: dig a specific topid out of the memory
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericRemember extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Remember Action Bubble';
		this.token = 'remember';
		this.classname = 'generic';
		this.properties.action = 'recall all memories about a subject';
		this.properties.inputs = [
			{ what: 'the subject to remember', type: 'string', optional: true, default: 'any' },
			{ person: 'the name of someone to remember', type: 'string', optional: true, default: 'any' },
			{ date: 'interval of time to consider', type: 'string', optional: true, default: 'any' },
			{ scanLevel: 'depth of the search, 1: direct souvenirs only, 2: indirect souvenirs, 3: deep search', type: 'number', interval: { start: 1, end: 3 }, optional: true, default: '2' }	];
		this.properties.outputs = [
			{ directSouvenirs: 'the direct souvenirs found', type: 'souvenirInfo.object.array' },
			{ indirectSouvenirs: 'the indirect souvenirs found', type: 'souvenirInfo.object.array' } ];
		this.properties.parser = {
			verb: [ 'remember', 'recall', 'think about' ],
			what: [ 'audio', 'video', 'messenger' ],
			person: [], date: [], value: [ 'level' ]
		}
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		control.memory = {
			scanLevel: parameters.scanLevel
		};
		parameters.senderName = typeof parameters.senderName == 'undefined' ? this.awi.config.getConfig( 'user' ).fullName : parameters.senderName;

		var answer = await this.awi.personality.remember( line, parameters, control );
		if ( answer.success == 'found' )
		{
			if ( answer.data.direct.souvenirs.length > 0 )
				this.awi.editor.print( control.editor, 'Found ' + answer.data.direct.souvenirs.length + ' direct souvenir(s).', { user: 'information' } );
			else
				this.awi.editor.print( control.editor, 'No direct souvenir found.', { user: 'information' } );

			if ( /*parameters.scanLevel > 1 &&*/ answer.data.indirect.souvenirs.length > 0 )
				this.awi.editor.print( control.editor, 'Found ' + answer.data.indirect.souvenirs.length + ' indirect souvenir(s).', { user: 'information' } );
			else
				this.awi.editor.print( control.editor, 'No indirect souvenir found.', { user: 'information' } );

			this.awi.remember( line, answer.data.direct, answer.data.indirect );
			return { success: 'success', data: answer.data }
		}
		return answer;
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
module.exports.Bubble = BubbleGenericRemember;

},{"../awi-bubble":9}],24:[function(require,module,exports){
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
* @file awi-bubble-generic-error.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Error management bubble
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericRoot extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Root';
		this.token = 'root';
		this.classname = 'generic';
		this.properties.action = 'root of a branch of bubbles';
	}
	async play( line, parameters, control )
	{
		return await super.play( line, parameters, control );
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
module.exports.Bubble = BubbleGenericRoot;

},{"../awi-bubble":9}],25:[function(require,module,exports){
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
* @file awi-bubble-generic-run.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Run command: run an executable in the current system connector
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericRun extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Run';
		this.token = 'run';
		this.classname = 'generic';
		this.properties.action = 'launch an application';
		this.properties.inputs = [
			{ file: 'the name of the application to run', type: 'string' },
			{ noun: 'if an accessory', type: 'string', optional: true },
			{ input: 'eventual parameters', type: 'string', optional: true, default: '' } ];
		this.properties.outputs = [ { files: 'the last list of files', type: 'path.string.array' },
									{ fileRan: 'the last file to be ran', type: 'path' } ];
		this.properties.parser = {
			verb: [ 'run', 'launch' ],
			noun: [ 'accessory' ],
			file: [ 'application' ],
			input: []
		}
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		var self = this;
		async function playIt( file, files )
		{
			var play = await self.awi.system.playFile( file, 'run', control );
			if ( play.success )
			{
				if ( typeof files != 'undefined' )
					return { success: true, data: { files: files, fileRan: file } };
				return { success: true, data: { fileRan: file } };
			}
		}

		await super.play( line, parameters, control );
		if ( /^\d+$/.test( line ) )
		{
			var files = this.branch.getLastData( this, 'files' );
			if ( files && files.length > 0 )
			{
				var number = parseInt( line ) - 1;
				if ( number >= 0 && number < files.length )
					return await playIt( files[ number ] );
				return { success: false, error: 'awi:not-found:iwa' };
			}
		}
		var answer = await this.awi.system.findFiles( line, parameters, control );
		if ( !answer.success )
			return { success: false, error: 'awi:not-found:iwa' };

		if ( answer.success === '1' )
			return await playIt( answer.data[ 0 ], answer.data );

		var result = [];
		this.awi.editor.print( control.editor, [ 'You can edit these files: ' ], { user: 'information' } );
		for ( var f = 0; f < answer.data.length; f++ )
			result.push( ( f + 1 ) + '. ' + answer.data[ f ].path );
		this.awi.editor.print( control.editor, result, { user: 'information' } );
		var param = await this.awi.prompt.getParameters( [
			{ choice: 'Please enter a number between 1 and ' + answer.data.length, type: 'number', interval: [ 1, answer.data.length ], optional: false, default: 0 },
			], control );
		if ( param.success )
			return await playIt( answer.data[ param.data.choice - 1 ], answer.data );
		return { answer: true, data: { files: files } };
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
module.exports.Bubble = BubbleGenericRun;

},{"../awi-bubble":9}],26:[function(require,module,exports){
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
* @file awi-bubble-generic-stop.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Stop command: stop a media playing in the current editor
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericStop extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Stop';
		this.token = 'stop';
		this.classname = 'generic';
		this.properties.action = 'stop a media playing';
		this.properties.inputs = [ { noun: 'the name of the item to stop', type: 'string' } ];
		this.properties.outputs = [ { stopAction: 'the name of the item that was stopped', type: 'string' } ];
		this.properties.parser = {
			verb: [ 'stop', 'halt' ],
			noun: [ 'mimetypes' ]
		}
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this.awi.editor.stop( control.editor, parameters.noun );
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
module.exports.Bubble = BubbleGenericStop;

},{"../awi-bubble":9}],27:[function(require,module,exports){
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
* @file awi-bubble-generic-bin.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Bin command: convert to binary
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericVerbose extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'verbose';
		this.token = 'verbose';
		this.classname = 'generic';
		this.properties.action = 'sets the level of verbosity of awi';
		this.properties.inputs = [ { evaluation: 'the level of verbosity, from 1 to 3', type: 'number', interval: { start: 1, end: 3 }, optional: false } ];
		this.properties.outputs = [];
		this.properties.parser = {
			verb: [ 'verbose' ],
			evaluation: [ 'numeric' ]
		}
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );

		var answer = await this.awi.language.doEval( '' + parameters.evaluation, {} );
		if ( answer.success )
		{
			var verbose = Math.floor( answer.data );
			var oldVerbose = this.awi.getConfig( 'user' ).verbose;
			if ( verbose != oldVerbose )
			{
				if ( verbose <= oldVerbose )
					this.awi.editor.print( control.editor, 'OK I will talk less from now on...', { user: 'root' } );
				else
					this.awi.editor.print( control.editor, 'OK I will talk more from now on...', { user: 'root' } );
				this.awi.config.setVerbose( verbose );
			}
		}
		else
		{
			this.awi.editor.print( control.editor, [ answer.error ], { user: 'error' } );
		}
		return answer;
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
module.exports.Bubble = BubbleGenericVerbose;

},{"../awi-bubble":9}],28:[function(require,module,exports){
/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal
* (_)|___|  |____|\__/\__/  [_| |_] \     Assistant
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-bubble-generic-view.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short View command: view a media file in the current editor
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericView extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'View';
		this.token = 'view';
		this.classname = 'generic';
		this.properties.action = 'display the content of a file';
		this.properties.inputs = [
			{ file: 'the file to view', type: 'string' },
			{ date: 'the date when the file was created', type: 'string', optional: true },
			{ time: 'the time when the file was created', type: 'string', optional: true },
			{ input: 'description of the content to search for', type: 'string', optional: true },
			];
		this.properties.outputs = [ { files: 'the last list of files', type: 'file.array' },
									{ fileViewed: 'the last file viewed', type: 'file' } ];
		this.properties.parser = {
			verb: [ 'view', 'display', 'show' ],
			file: [], date: [], time: [], input: [] };
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		var self = this;
		async function playIt( file, files )
		{
			var play = await self.awi.system.playFile( file, 'view', control );
			if ( play.success )
			{
				if ( typeof files != 'undefined' )
					return { success: true, data: { files: files, fileViewed: file } };
				return { success: true, data: { fileViewed: file } };
			}
		}

		await super.play( line, parameters, control );
		if ( /^\d+$/.test( line ) )
		{
			var files = this.branch.getLastData( this, 'files' );
			if ( files && files.length > 0 )
			{
				var number = parseInt( line ) - 1;
				if ( number >= 0 && number < files.length )
					return await playIt( files[ number ] );
				return { success: false, error: 'awi:not-found:iwa' };
			}
		}
		var answer = await this.awi.system.findFiles( line, parameters, control );
		if ( !answer.success )
			return { success: false, error: 'awi:not-found:iwa' };

		if ( answer.success === '1' )
			return await playIt( answer.data[ 0 ], answer.data );

		var result = [];
		this.awi.editor.print( control.editor, [ 'You can view these files: ' ], { user: 'information' } );
		for ( var f = 0; f < answer.data.length; f++ )
			result.push( ( f + 1 ) + '. ' + answer.data[ f ].path );
		this.awi.editor.print( control.editor, result, { user: 'information' } );
		var param = await this.awi.prompt.getParameters( [
			{ choice: 'Please enter a number between 1 and ' + answer.data.length, type: 'number', interval: [ 1, answer.data.length ], optional: false, default: 0 },
			], control );
		if ( param.success )
			return await playIt( answer.data[ param.data.choice - 1 ], answer.data );
		return answer;
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
module.exports.Bubble = BubbleGenericView;

},{"../awi-bubble":9}],29:[function(require,module,exports){
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
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var config = this.awi.config.getConfig( 'user' );
		if ( config.firstName == '' )
		{
			var param = await this.awi.prompt.getParameters( [
				{ firstname: 'your first name: ', type: 'string', optional: false, default: '' },
				{ lastname: 'your last name: ', type: 'string', optional: false, default: '' },
				{ aikey: 'your open-ai key: ', type: 'string', optional: false, default: '' },
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

},{"../awi-bubble":9}],30:[function(require,module,exports){
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
* @file awi-bubble-generic-code.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Code command: create code in the current language connector
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericWrite extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Write';
		this.token = 'write';
		this.classname = 'generic';
		this.properties.action = 'write a text, code, resume, synthesis';
		this.properties.inputs = [
			{ noun: 'what to write', type: 'string' },
			{ person: 'the person to write to', type: 'string', optional: true },
			];
		this.properties.outputs = [];
		this.properties.parser = {
			verb: [ 'write' ],
			noun: [ 'mail', 'document', 'presentation', 'text' ],
			person: [] };
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		return await super.play( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
}
module.exports.Bubble = BubbleGenericWrite;

},{"../awi-bubble":9}],31:[function(require,module,exports){
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
* @file awi-bubble-generic-bin.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Bin command: convert to binary
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleProgrammingBase64 extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Base64';
		this.token = 'base64';
		this.classname = 'programming';
		this.properties.action = 'converts an image to Base 64 Ascii code';
		this.properties.inputs = [
			{ file: 'the file to edit', type: 'string' },
			{ date: 'the date when the file was created', type: 'string', optional: true },
			{ time: 'the time when the file was created', type: 'string', optional: true },
			{ input: 'description of the content to search for', type: 'string', optional: true },
			];
		this.properties.outputs = [ { base64: 'the image converted to base64', type: 'string.base64' } ];
		this.properties.parser = {
			verb: [ 'convert', 'transform' ],
			adjective: [ 'base64' ],
			file: [], date: [], time: [], input: [] };
		this.properties.select = [ [ 'verb', 'adjective' ] ];
	}
	async play( line, parameters, control )
	{
		super.play( line, parameters, control );

		var self = this;
		async function convert( path )
		{
			var image = await self.awi.system.readFile( path, 'base64' );
			if ( image.success )
			{
				var mime = self.awi.utilities.getMimeType( path );
				var result = 'data:[' + mime + ';base64,' + image.data;
				self.awi.editor.print( self, result.split( '\n' ), { user: 'code' } );
				return { success: true, data: result }
			}
			return image;
		}
		if ( /^\d+$/.test( parameters.userInput ) )
		{
			var files = this.branch.getLastData( this, 'fileList' );
			if ( files && files.length > 0 )
			{
				var number = parseInt( parameters.userInput ) - 1;
				if ( number >= 0 && number < files.length )
				{
					return convert( files[ number ].path );
				}
				return { success: false, error: 'awi:not-found:iwa' };
			}
		}
		var path = this.awi.utilities.normalize( parameters.userInput )
		var answer = await this.awi.system.exists( path );
		if ( answer.success )
			return convert( files[ 0 ].path );

		var type = this.awi.system.getFileType( parameters.userInput );
		if ( type != 'image' )
			return { success: false, error: 'awi:not-an-image:iwa' };
		var paths = this.awi.system.getPaths( type );
		var answer = await this.awi.system.findFile( paths, parameters.userInput, { } );
		if ( !answer.success || answer.data.length == 0 )
			return { success: false, error: 'awi:not-found:iwa' };

		var files = answer.data;
		if ( files.length == 1 )
			return convert( files[ 0 ].path );

		this.awi.editor.print( control.editor, [ 'You can convert these files: ' ], { user: 'information' } );
		var result = [];
		for ( var f = 0; f < files.length; f++ )
			result.push( ( f + 1 ) + '. ' + files[ f ].path );
		this.awi.editor.print( control.editor, result, { user: 'information' } );
		var param = await this.awi.prompt.getParameters( control.editor, [
			{ choice: 'Please enter a number between 1 and ' + files.length, type: 'number', interval: [ 1, files.length ], optional: false, default: 0 },
			], control );
		if ( param.success )
			return convert( files[ param.data.choice - 1 ].path );
		return answer;
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
module.exports.Bubble = BubbleProgrammingBase64;

},{"../awi-bubble":9}],32:[function(require,module,exports){
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
* @file awi-bubble-javascript-code.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Code command: create a javascript function
*
*/
var awibubble = require( '../awi-bubble' )
var awimessages = require( '../../awi-messages' )

class BubbleJavascriptCode extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Code';
		this.token = 'code';
		this.classname = 'javascript';
		this.properties.action = 'writes an Aoz Basic procedure';
		this.properties.inputs = [
			{ codeName: 'the name of the procedure to create, the name should be meaningful.', type: 'string', clear: true },
			{ codeParameters: 'the list of parameters with meaningful names, separated by commas. If your function needs a callback, add it at the end...', type: 'string', clear: true },
			{ codeSteps: 'the various tasks the procedure should do, one per line.\nStay simple, in order not too many details...\nEmpty line to quit.', type: 'array.string', clear: true },
			{ codeReturn: 'what the procedure should return.', type: 'string', clear: true },
			{ codeRunin: 'Should the function run in a browser or in node?', type: 'choices.string', choices: [ 'browser','node' ], default: 'browser', clear: true },
			{ codeConfirm: 'Do you confirm all the parameters above? (y)es or no?', type: 'yesno.string', default: 'yes', clear: true },
		];
		this.properties.outputs = [ { javascriptCode: 'the code of the new function', type: 'array.string.javascript' } ];
		this.properties.parser = { verb: [ 'code', 'program' ], noun: [ 'javascript' ] };
		this.properties.select = [ [ 'verb', 'noun' ] ];
	}
	async play( line, parameters, control )
	{
		var answer = await super.play( line, parameters, control );
		if ( !answer.success )
			return { success: false, data: {}, error: 'awi:cancelled:iwa' };

 		var description = ''
		for ( var s = 0; s < parameters.codeSteps.length; s++ )
			description += ( s + 1 ) + '. ' + parameters.codeSteps[ s ] + '\n';
		if ( parameters.codeReturn )
			description += ( s + 1 ) + '. It returns ' + parameters.codeReturn + '\n';
		var params = parameters.codeParameters;
		if ( params == '' )
		{
			if ( params.codeCallback )
				params += 'callback';
			else
				params = 'there is no parameters.';
		}
		else if ( params.codeCallback )
			params += ',callback';

		var prompt = this.awi.personality.getPrompt( 'code' ,
		[
			{ name: 'language', content: this.awi.language.name },
			{ name: 'codeDestination', content: parameters.codeRunin },
			{ name: 'functionName', content: parameters.codeName },
			{ name: 'parameters', content: params },
			{ name: 'description', content: description },
		], control );
		this.awi.editor.print( control.editor, prompt, { user: 'prompt' } );
		var answer = await this.sendCompletion( prompt, false, control );
		if ( answer.success )
		{
			var result = answer.data.text.trim().split( '\n' );
			var copying = false;
			var destcode = [];
			for ( var l = 0; l < result.length; l++ )
			{
				var line = result[ l ];
				if ( copying && line )
				{
					if ( line.indexOf( '<END-CODE>' ) >= 0 )
						break;
					destcode.push( line );
				}
				else if ( line.indexOf( '<START-CODE>' ) >= 0 )
					copying = true;
			}
			this.awi.editor.print( control.editor, destcode, { user: 'code' } );
			return { success: true, data: destcode };
		}
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
	async transpile( line, parameter, control )
	{
		super.transpile( line, parameter, control );
	}
}
module.exports.Bubble = BubbleJavascriptCode;

},{"../../awi-messages":2,"../awi-bubble":9}],33:[function(require,module,exports){
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
* @file awi-bubble-generic-bin.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Bin command: convert to binary
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleUserDiaporama extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Diaporama';
		this.token = 'diaporama';
		this.classname = 'user';
		this.properties.action = 'displays a list of images as a diaporama';
		this.properties.inputs = [ { userInput: 'the path or filter to the images', type: 'string' } ];
		this.properties.outputs = [ ];
		this.properties.brackets = true;
		this.properties.tags = [ 'viewer' ];
	}
	async play( line, parameters, control )
	{
		return await super.play( line, parameters, control );
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
module.exports.Bubble = BubbleUserDiaporama;

},{"../awi-bubble":9}],34:[function(require,module,exports){
/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \      / ][   ]       Programmable
*     _/ /   \ \_\  \/ \/  / |  |        Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_]      link:
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-aozruntime-server.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Configuration management
*
*/
class Connector
{
	constructor( awi, options = {} )
	{
		this.awi = awi;
		this.options = options;
		this.version = '0.1';
		this.oClass = 'connector';
	}
	async connect( /*options*/ )
	{
		this.connectAnswer =
		{
			success: true,
			data:
			{
				name: this.name,
				token: this.token,
				classname: this.classname,
				prompt: this.name + ' connector version ' + this.version, version: this.version
			}
		}
		return this.connectAnswer;
	}
}
module.exports.Connector = Connector;

},{}],35:[function(require,module,exports){
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
* @file awi-connector-servers-browser.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Connector to code ran from navigator (indirect file-system).
*        Read/write subject to authorisation from user in config,
*        with directory selection. Any write operation will necessit
*        a "control.levelOfTrust" over a certain limit, with of course
*        heavy secrity at the bottom, with possible questions relatiung
*        to memory that relates to recent event etc. Three necessary
*        for total security, from my of today's understanding of Transformers,
*        5 = total lock with motivation to stay locked.
*
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorClientOpenAiBrowser extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'openaibrowser';
		this.name = 'OpenAi Browser';
		this.token = 'client';
		this.classname = 'client';
		this.version = '0.2.1';
	}
	async connect( options )
	{
		super.connect( options );
		this.connectAnswer.data.token = this.classname;
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}
	async sendCompletion( prompt, stream, control )
	{
		prompt = prompt.trim();
		var parameters = this.awi.utilities.getControlParameters( control,
		{
			model: 'text-davinci-003',
			max_tokens: 1000,
			temperature: 1,
			top_p: 1,
			n: 2
	 	} );
		parameters.prompt = prompt;
		if ( this.awi.connectors.editors.current )
		{
			var debug = this.awi.utilities.format( `
prompt: {prompt}
model: {model}
max_tokens: {max_tokens}
temperature: {temperature}
top_p: {top_p}
n: {n}`, parameters );
			this.awi.editor.print( control.editor, debug.split( '\n' ), { user: 'completion' } );
		}

		var apiKey = this.awi.config.getUserKey();
		var response = await fetch( "https://api.openai.com/v1/completions",
		{
			method: "POST",
			headers:
			{
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'Authorization': `Bearer '${apiKey}`
			},
			body: JSON.stringify(
			{
				"model": `{model}`,
				"prompt": `{prompt}`,
				"temperature": temperature,
				"max_tokens": max_tokens,
				"top_p": top_p,
				"n": n
			} )
		} );
		var answer = {};
		if ( !response.error )
		{
			answer.success = true;
			answer.data = response.data.choices[ 0 ];
		}
		else
		{
			answer.success = false;
			answer.data = response;
			answer.error = 'awi:openai-error:iwa';
		}
		return answer;
	}
}
module.exports.Connector = ConnectorClientOpenAiBrowser
},{"../awi-connector":34}],36:[function(require,module,exports){
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
* @file awi-connector-editors-mobile.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Connector to Mobile editor
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorEditorMobile extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Mobile Device';
		this.token = 'mobile';
		this.classname = 'editor';
		this.version = '0.4';

		this.output = awi.systemConfig.printCallback;
		this.connected = false;
		this.inputEnabled = false;
		this.reroute = undefined;
		this.range = { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } };
	}
	async connect( options )
	{
		super.connect( options );
		this.connected = true;
		this.connectAnswer.data.token = this.classname;
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}
	close()
	{

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
		if ( line )
			this.promptCallback( line );
	}
	newInput( input )
	{
		if ( this.inputEnabled )
		{
			if ( this.reroute )
				this.reroute( input, {}, {} );
			else
				this.awi.prompt.prompt( input, {}, {} );
		}
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
		var result = [];
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
				result.push( prompt + lines[ l ] );
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
				result.push( prompt + line );
			}
		}
		this.promptCallback( result );
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
module.exports.Connector = ConnectorEditorMobile;

},{"../awi-connector":34}],37:[function(require,module,exports){
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
* @file awi-connector-languages-javascript.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Connector to Javascript
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorLanguageJavascript extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Javascript';
		this.token = 'javascript';
		this.classname = 'language';
		this.version = '0.2';
	}
	async connect( options )
	{
		super.connect( options );
		this.connectAnswer.data.token = this.classname;
		return this.connectAnswer;
	}
	scanForCommands( line )
	{
		var foundKeywords = [];
		return foundKeywords;
	}
	extractTokens( source, callback, extra )
	{

	}
	close()
	{

	}
	async doEval( line, options = {} )
	{
		var mathWords =
		[
			{ name: 'round', token: 'Math.round' },
			{ name: 'ceil', token: 'Math.ceil' },
			{ name: 'floor', token: 'Math.floor' },
			{ name: 'trunc', token: 'Math.trunc' },
			{ name: 'sign', token: 'Math.sign' },
			{ name: 'pow', token: 'Math.pow' },
			{ name: 'sqr', token: 'Math.sqrt' },
			{ name: 'abs', token: 'Math.abs' },
			{ name: 'min', token: 'Math.min' },
			{ name: 'max', token: 'Math.max' },
			{ name: 'random', token: 'Math.ramdom' },
			{ name: 'cbrt', token: 'Math.cbrt' },
			{ name: 'exp', token: 'Math.exp' },
			{ name: 'log2', token: 'Math.log2' },
			{ name: 'log10', token: 'Math.log10' },
			{ name: 'log', token: 'Math.log' },
			{ name: 'tanh', token: 'Math.tanh', inType: 'self.awi.config.degreeToRadian' },
			{ name: 'sinh', token: 'Math.sinh', inType: 'self.awi.config.degreeToRadian' },
			{ name: 'cosh', token: 'Math.cosh', inType: 'self.awi.config.degreeToRadian' },
			{ name: 'acos', token: 'Math.acos', outType: 'self.awi.config.radianToDegree' },
			{ name: 'asin', token: 'Math.asin', outType: 'self.awi.config.radianToDegree' },
			{ name: 'atan', token: 'Math.atan', outType: 'self.awi.config.radianToDegree' },
			{ name: 'acosh', token: 'Math.acosh', outType: 'self.awi.config.radianToDegree' },
			{ name: 'asinh', token: 'Math.sinh', outType: 'self.awi.config.radianToDegree' },
			{ name: 'atan2', token: 'Math.atan2', outType: 'self.awi.config.radianToDegree' },
			{ name: 'atanh', token: 'Math.atanh', outType: 'self.awi.config.radianToDegree' },
			{ name: 'sin', token: 'Math.sin', inType: 'self.awi.config.degreeToRadian' },
			{ name: 'cos', token: 'Math.cos', inType: 'self.awi.config.degreeToRadian' },
			{ name: 'tan', token: 'Math.tan', inType: 'self.awi.config.degreeToRadian' },
		];
		line = line.split( ' ' ).join( '' );
		function getWord( name )
		{
			for ( var w = 0; w < mathWords.length; w++ )
			{
				var word = mathWords[ w ];
				if ( word.name == name.toLowerCase() )
					return word;
			}
			return null;
		}
		function scan( line )
		{
			for ( var w = 0; w < mathWords.length; w++ )
			{
				var word = mathWords[ w ];
				var startCommand = line.indexOf( word.name + '(' );
				if ( startCommand >= 0 )
				{
					// Skip parentheses
					var count = 1;
					var start = startCommand + word.name.length + 1;
					var end = start;
					var embedded = [ { start: start, end: 0, name: word.name, startName: startCommand } ];
					var currentName = '';
					var startName = 0;
					while( end < line.length )
					{
						var c = line.charAt( end );
						if ( c === '(' )
						{
							count++;
							embedded.push( { start: end + 1, name: currentName} )
						}
						else if ( c == ')' )
						{
							count--;
							if ( count == 0 )
								break;
							else
							{
								embedded[ count ].end = end;
								embedded[ count ].name = currentName;
								embedded[ count ].startName = startName;
								currentName = '';
							}
						}
						else if ( this.awi.utilities.getCharacterType( c ) == 'letter' )
						{
							if ( currentName == '' )
								startName = end;
							currentName += c;
						}
						end++;
					}
					if ( count )
					{
						return '';
					}
					embedded[ 0 ].end = end;
					for ( var e = embedded.length - 1; e >= 0; e-- )
					{
						var embed = embedded[ e ];
						var word = getWord( embed.name );
						if ( !word )
							line = '';
						else
						{
							var command = '';
							var parameter = line.substring( embed.start, embed.end );
							if ( word.inType )
								parameter = word.inType + '(' + parameter + ')';
							if ( word.outType )
								command = word.outType + '(' + word.token + '(' + parameter + '))'
							else
								command = word.token + '(' + parameter + ')';
							var end = embed.end + 1;
							var delta = command.length - ( end - embed.startName );
							for ( var ee = e - 1; ee >= 0; ee-- )
								embedded[ ee ].end += delta;
							line = line.substring( 0, embed.startName ) + command + line.substring( end );
						}
					}
					break;
				}
			}
			return line;
		}
		line = scan( line );
		if ( line == '' )
			return { success: false, data: result, error: 'awi:invalid-expression:iwa' };

		var result;
		try
		{
			result = eval( line );
		}
		catch ( e )
		{
			return { success: false, data: result, error: 'awi:invalid-expression:iwa' };
		}
		return { success: true, data: this.awi.config.roundValue( result ) };
	}
}
module.exports.Connector = ConnectorLanguageJavascript;

},{"../awi-connector":34}],38:[function(require,module,exports){
(function (process){(function (){
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
* @file awi-connector-systems-mobile.js
* @author FL (Francois Lionet)
* @date first pushed on 03/08/2023
* @version 0.3
*
* @short Connector to phones
*/
var awiconnector = require( '../awi-connector' );

class ConnectorSystemMobile extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Mobile';
		this.token = 'mobile';
		this.classname = 'system';
		this.version = '0.5';
		this.core = null;
		this.fs = null;
	}
	quit()
	{
		process.exit( 0 );
	}
	async connect( options )
	{
		super.connect( options );

		var self = this;
		//import( '@capacitor/core' ).then( ( exp ) => {
		//	self.core = exp;
		//})
		import( '@capacitor/filesystem' ).then( ( exp ) => {
			self.fs = exp;
		} );
		this.connectAnswer.data.token = this.classname;
		return new Promise( ( resolve ) =>
		{
			var handle = setInterval( function()
			{
				if ( self.fs != null )
				{
					clearInterval( handle );
					resolve( self.connectAnswer );
				}
			}, 1 );
		} );
	}
	async getAssetType( names )
	{
		if ( typeof names == 'undefined' || names.length == 0 )
			return null;

		if ( typeof names == 'string' )
		{
			var found = this.awi.parser.findWordDefinition( this.assetTypes.names, names, 'find' );;
			if ( found )
				return this.assetTypes[ names ];
			for ( var s in this.assetTypes )
			{
				found = this.assetTypes[ s ].filters.findIndex(
					function( element )
					{
						var filter = element.substring( element.lastIndexOf( '.' ) );
						return ( names.indexOf( filter ) >= 0 );
					} );
				if ( found >= 0 )
					result.push( this.assetTypes[ found ] );
			}
			return null;
		}
		for ( var s in this.assetTypes )
		{
			var assetType = this.assetTypes[ s ];
			for ( var n = 0; n < names.length; n++ )
			{
				var found = this.awi.parser.findWordDefinition( assetType.names, names[ n ], 'find' );;
				if ( found )
					return assetType;
				var ext = names[ n ].substring( names[ n ].lastIndexOf( '.' ) );
				var found = assetType.filters.findIndex(
					function( element )
					{
						var filter = element.substring( element.lastIndexOf( '.' ) );
						return ( filter.indexOf( ext ) >= 0 );
					} );
				return assetType;
			}
		}
		return result;
	}
	async getDirectory( path, options )
	{
		var self = this;
		async function getDir( path, options, parent )
		{
			var result = [];
			path = self.awi.utilities.normalize( path );

			var answer = await self.readdir( path + '/' );
			if ( !answer.success )
				return null;
			var files = answer.data;
			if ( files )
			{
				for ( var f = 0; f < files.length; f++ )
				{
					var sPath = path + '/' + files[ f ];
					var stats = await self.stat( sPath );
					if ( stats.data )
					{
						stats = stats.data;
						if ( !stats.isDirectory() )
						{
							if ( !options.excludes || ( options.excludes && !self.filterFilename( sPath, options.excludes ) ) )
							{
								if ( !options.filters || ( options.filters && self.awi.utilities.filterFilename( sPath, options.filters ) ) )
								{
									result.push(
									{
										name: files[ f ],
										path: sPath,
										isDirectory: false,
										size: stats.size,
										stats: stats,
										parent: parent
									} );
								}
							}
						}
						else
						{
							if ( options.recursive )
							{
								var newFile =
								{
									name: files[ f ],
									path: sPath,
									isDirectory: true,
									files: null,
									parent: parent
								};
								var newResult = await getDir( sPath, options, newFile );
								if ( !options.onlyFiles )
								{
									newFile.files = newResult;
									result.push( newFile );
								}
								else if ( newResult.length > 0 )
									result.push( newResult );
							}
							else
							{
								if ( !options.onlyFiles )
								{
									result.push(
									{
										name: files[ f ],
										path: sPath,
										isDirectory: true,
										files: [],
										parent: parent
									} );
								}
							}
						}
					}
				}
			}
			return result;
		}
		var tree = await getDir( path, options );
		if ( tree )
			return { success: true, data: tree };
		return { success: false, error: 'awi:directory-not-found:iwa' };
	}
	async getApplications( file )
	{
		var softwares = fetchinstalledsoftware.getAllInstalledSoftwareSync();
		for ( var s = 0; s < softwares.length; s++ )
		{
			var software = softwares[ s ];
			if ( typeof software.DisplayIcon != 'undefined' )
			{
				var path = this.awi.utilities.normalize( software.DisplayIcon );
				if ( path.toLowerCase().indexOf( filename.toLowerCase() ) >= 0 )
				{
					var ext = this.awi.utilities.extname( path ).substring( 1 ).toLowerCase();
					if ( this.getFileType( ext, 'executable' ).success )
					{
						var file = await this.awi.utilities.getFileInfo( path );
						if ( file )
							found.push( file );
					}
				}
			}
		}
	}
	async askForFilepaths( file, parameters, control )
	{
		var paths = await this.awi.config.getDefaultPaths( file );
		var param = await this.awi.prompt.getParameters( [
			{ choice: 'the different paths to the folder containing ' + file.names[ 0 ] + 's.', type: 'array.string', default: [ paths[ 0 ] ] },
			], control );
		if ( param.success )
		{
			file.paths = param.data.choice;
			this.awi.config.getConfig( 'user' ).paths[ this.awi.config.platform ][ file.names[ 0 ] ] = param.data.choice;
		}
	}
	async findFiles( line, parameters, control )
	{
		var found = [];
		var file = parameters.file;
		switch ( file.names[ 0 ] )
		{
			case 'application':
				found = await this.getApplications( line, parameters, control );
				break;
			case 'aozaccessory':
				found = await this.connectors.languages.aozbasic.getAccessories( line, parameters, control );
				break;
			default:
				if ( file.paths.length == 0 )
					await this.askForFilepaths( file, parameters, control );
				if ( file.paths.length )
				{
					for ( var p = 0; p < file.paths.length; p++ )
					{
						var answer = await this.awi.system.getDirectory( file.paths[ p ], { onlyFiles: false, recursive: true, filters: file.filters } );
						if ( answer.data )
							found.push( ...this.awi.utilities.getFileArrayFromTree( answer.data ) );
					}
				}
				break;
		}
		if ( typeof parameters.date != 'undefined' && parameters.date.length )
		{
			var newFound = [];
			for ( var f = 0; f < found.length; f++ )
			{
				var file = found[ f ];
				for ( var d = 0; d < parameters.date.length; d++ )
				{
					if ( this.awi.time.isStatsWithinDate( file.stats, parameters.date[ d ] ) )
						newFound.push( file );
				}
			}
			found = newFound;
		}
		if ( typeof parameters.time != 'undefined' && parameters.time.length )
		{
			var newFound = [];
			for ( var f = 0; f < found.length; f++ )
			{
				var file = found[ f ];
				for ( var d = 0; d < parameters.time.length; d++ )
				{
					if ( this.awi.time.isStatsWithinDate( file.stats, parameters.time ) )
						newFound.push( file );
				}
			}
			found = newFound;
		}
		for ( var f = 0; f < found.length; f++ )
			found[ f ].file = file;
		file.list = found;
		if ( found.length == 0 )
			return { success: false, error: 'awi:file-not-found:iwa' };
		if ( found.length == 1 )
			return { success: '1', data: found };
		return { success: true, data: found };
	}
	async importFile( bubble, file, options = {} )
	{
		var ext, path;
		if ( typeof file != 'string' )
			path = this.awi.utilities.normalize( file.path );
		else
			path = file;
		if ( !options.toAssets )
		{
			ext = this.awi.utilities.extname( path ).toLowerCase().substring( 1 );
			if ( ext == '' || !this.types[ ext ] )
			{
				this.print( bubble, [ 'Cannot import the file...' ] );
				return false;
			}
		}
		else
			ext = '_assets_';
		var exist;
		var count = 0;
		var destinationPath;
		do
		{
			destinationPath = this.awi.utilities.normalize( this.awi.utilities.dirname( this.awi.system.getPath() ) + this.types[ ext ].importTo[ count ] );
			var answer = await this.awi.system.exists( destinationPath );
			if ( answer.success )
			{
				exist = true;
				break;
			}
			count++;
		} while ( count < this.types[ ext ].importTo.length  )
		if ( !exist )
		{
			if ( !options.noErrors )
				this.print( bubble, [ 'awi:directory-not-found:iwa' ] );
			return false;
		}
		var answer = await this.awi.system.copyFile( path, this.awi.utilities.normalize( destinationPath + '/' + this.awi.utilities.basename( path ) ) );
		if ( !answer.error )
		{
			if ( !options.noErrors )
				this.print( bubble, answer.data );
			return false;
		}
		var result = 'File imported successfully.' + this.types[ ext ].displayName;
		this.print( bubble, [ result ] );
		return true;
	}
	getVarsPath( path, vars = {} )
	{
		var start = path.indexOf( '{' );
		while( start >= 0 )
		{
			var replace = '';
			var end = path.indexOf( '}', start );
			var token = path.substring( start + 1, end );
			if ( vars[ token ] )
				replace = vars[ token ];
			else
			{
				switch ( token )
				{
					default:
						replace = '';
						break;
				}
			}
			path = path.substring( 0, start ) + replace + path.substring( end + 1 );
			start = path.indexOf( '{' );
		}
		return ppath.normalize( path );
	}
	async playFile( file, action, control )
	{
		var stdOut = '';
		var stdErr = '';
		var info = this.awi.utilities.parse( file.path );
		var vars =
		{
			root: info.root,
			dir: info.dir,
			base: info.base,
			ext: info.ext,
			name: info.name,
			file: info.dir + '/' + info.name + info.ext,
		}
		var runInfo = this.awi.config.getSystem().commands[ this.awi.config.platform ];
		var actionInfo = runInfo[ file.file.names[ 0 ] ];
		if ( actionInfo )
		{
			actionInfo = actionInfo[ action ];
			switch ( actionInfo.type )
			{
				case 'exec':
					var result = false;
					var cwd = this.getVarsPath( actionInfo.cwd, vars );
					var command = this.getVarsPath( actionInfo.command, vars );
					var process = exec( command, { cwd: cwd },
						function( error, stdo, stde )
						{
							if ( !error )
							{
								result = true;
								if ( stde )
									stdErr += stde;
								if ( stdo )
									stdOut += stdo;
							}
							else
								result = false;
						} );
					if ( process )
						return { success: true, data: {} };
					break;

				case 'startbat':
					var result = false;
					var cwd = this.getVarsPath( actionInfo.cwd, vars );
					var command = this.getVarsPath( actionInfo.command, vars );
					command = ppath.normalize( this.awi.config.getDataPath() + '/start.bat ' + command );
					console.log( 'command: ' + command );
					console.log( 'cwd: ' + cwd );
					var process = exec( command, { cwd: cwd },
						function( error, stdo, stde )
						{
							if ( !error )
							{
								result = true;
								if ( stde )
									stdErr += stde;
								if ( stdo )
									stdOut += stdo;
							}
							else
								result = false;
						} );
					if ( process )
						return { success: true, data: path };
					break;

				default:
					break;
			}
		}
		return { success: false, error: 'awi:file-cannot-be-played:iwa' };
	}
	async getPaths( file )
	{
		if ( this.awi.config.getConfig( 'user' ).paths[ this.awi.config.platform ] )
			return this.awi.config.getConfig( 'user' ).paths[ this.awi.config.platform ][ file.names[ 0 ] ];
		return [];
	}
	getFileType( path )
	{
		path = this.awi.utilities.normalize( path );
		if ( path.indexOf( '/' ) >= 0 || path.indexOf( ':' ) >= 0 )
			return 'any';

		var ext = this.awi.utilities.extname( path ).toLowerCase();
		if ( !ext )
			return 'any';

		var paths = this.awi.config.system.paths;
		for ( var t in paths )
		{
			var typeInfo = paths[ t ];
			for ( var f = 0; f < typeInfo.filters.length; f++ )
			{
				var filter = typeInfo.filters[ f ].toLowerCase();
				if ( filter.indexOf( ext ) >= 0 )
				{
					return t;
				}
			}
		}
		return 'any';
	}
	getFileFilters( type )
	{
		var paths = this.awi.config.system.paths;
		if ( paths[ type ] )
			return paths[ type ].filters;
		return paths[ 'any' ].extensions;
	}
	isFileOfType( path, type )
	{
		return type = this.getFileType( path );
	}
	async extractAudio( sourcePath, destinationPath, options = {} )
	{
		try
		{
			options.input = sourcePath;
			options.output = destinationPath;
			//await extractaudio( options );
			return { success: true, data: destinationPath };
		}
		catch( e )
		{
			return { success: false, data: 'awi:error-while-extracting-audio:iwa' };
		}
	}
	async runAccessory( path, options )
	{
		return { success: false, error: 'awi:no-accessories-on-this-system:iwas' };
	}
	async getAccessoryList( path, options )
	{
		return { success: false, error: 'awi:no-accessories-on-this-system:iwas' };
	}
	hJsonParse( hjsonString )
	{
		return jsonParse( hjsonString );
	}
	hJsonStringify( obj )
	{
		return jsonStringify( obj );
	}
	jsonParse( hjsonString )
	{
		try
		{
			return { success: true, data: JSON.parse( hjsonString ) };
		}
		catch
		{
			return { success: false, error: 'awi:illegal-json:iwa' };
		}
	}
	jsonStringify( obj )
	{
		try
		{
			return { success: true, data: JSON.stringify( obj ) };
		}
		catch
		{
			return { success: false, error: 'awi:illegal-hjson:iwa' };
		}
	}
	decodeText( text )
	{
		text = he.decode( text );
		text = he.unescape( text );
		return text;
	}




	async readFile( path, options )
	{
		try
		{
			var encoding = undefined;
			if ( options.encoding == 'utf8' )
				encoding = Encoding.UTF8;
			return { success: true, data: await this.fs.Filesystem.readFile( { path: path, directory: this.fs.Directory.Data, encoding: encoding } ) };
		}
		catch( e )
		{
			return { success: false, error: 'awi:file-not-found:iwa' };
		}
	}
	async writeFile( path, data, options )
	{
		try
		{
			var encoding = undefined;
			if ( options.encoding == 'utf8' )
				encoding = Encoding.UTF8;
			if ( typeof data != 'string' )
			{
				data = this.awi.utilities.convertArrayBufferToString( data );
				encoding = Encoding.UTF8;
			}
			var response = await this.fs.Filesystem.writeFile( { path: path, directory: this.fs.Directory.Data, data: data, encoding: encoding, recursive: true } );
			return { success: true, data: response };
		}
		catch( e )
		{
			return { success: false, error: 'awi:cannot-write-file:iwa' };
		}
	}
	async copyFile( sourcePath, destinationPath, options )
	{
		try
		{
			var response = await this.fs.Filesystem.writeFile( { from: sourcePath, to: destinationPath, directory: this.fs.Directory.Data, toDirectory: this.fs.Directory.Data } );
			return { success: true, data: response };
		}
		catch
		{
			return { success: false, error: 'awi:cannot-copy-file:iwa' };
		}
	}
	async readdir( path )
	{
		try
		{
			return { success: true, data: await this.fs.Filesystem.readdir( { path: path, directory: this.fs.Directory.Data } ) };
		}
		catch( e )
		{
			return { success: false, error: 'awi:cannot-read-directory:iwa' };
		}
	}
	async unlink( path)
	{
		try
		{
			return { success: true, data: await this.fs.Filesystem.deleteFile( { path: path, directory: this.fs.Directory.Data } ) };
		}
		catch
		{
			return { success: false, error: 'awi:cannot-delete-file:iwa' };
		}
	}
	async rmdir( path )
	{
		try
		{
			return { success: true, data: await this.fs.Filesystem.rmdir( { path: path, directory: this.fs.Directory.Data, recursive: true } ) };
		}
		catch
		{
			return { success: false, error: 'awi:cannot-delete-directory:iwa' };
		}
	}
	async stat( path )
	{
		try
		{
			return { success: true, data: await this.fs.Filesystem.stat( { path: path, directory: this.fs.Directory.Data } ) };
		}
		catch
		{
			return { success: false, error: 'awi:file-not-found:iwa' };
		}
	}
	async exists( path )
	{
		try
		{
			var stat = await this.fs.Filesystem.stat( { path: path, directory: this.fs.Directory.Data } );
			if ( stat )
				return { success: true };
		}
		catch( e )
		{
		}
		return { success: false };
	}
	async getSystemInformation( type )
	{
		switch ( type )
		{
			case 'platform':
				return 'android';		//this.core.getPlatform();
			case 'userDir':
				return this.fs.getUri( { path: '', directory: Directory.Data } );
			case 'userName':
				return '';
			case 'drives':
				var list = [];
				return list;
		}
	}
}
module.exports.Connector = ConnectorSystemMobile;

}).call(this)}).call(this,require('_process'))

},{"../awi-connector":34,"_process":63}],39:[function(require,module,exports){
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
* @file awi-connector-utilities-parser.js
* @author FL (Francois Lionet)
* @date first pushed on 10/06/2023
* @version 0.3
*
* @short English language parser based on Compromise
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorUtilitiesParser extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Parser';
		this.token = 'parser';
		this.classname = 'utilities';
		this.version = '0.3';
		this.tags = {
			noun: {
				singular: {
					person: {},
					firstName: {},
					maleName: {},
					femaleName: {},
					lastName: {}
				},
				place: {
					country: {},
					city: {},
					region: {},
					address: {}
				},
				organization: {
					sportsTeam: {},
					company: {},
					school: {}
				},
				properNoun: {},
				honorific: {},
				plural: {},
				uncountable: {},
				pronoun: {},
				actor: {},
				activity: {},
				unit: {},
				demonym: {},
				possessive: {}
			},
			verb: {
				presentTense: {
					infinitive: {},
					gerund: {}
				},
				pastTense: {},
				perfectTense: {},
				futurePerfect: {},
				pluperfect: {},
				copula: {},
				modal: {},
				participle: {},
				particle: {},
				phrasalVerb: {}
			},
			value: {
				ordinal: {},
				cardinal: {
					romanNumeral: {},
				},
				multiple: {},
				fraction: {},
				textValue: {},
				numericValue: {},
				percent: {},
				money: {}
			},
			date: {
				month: {},
				weekDay: {},
				relativeDay: {},
				year: {},
				duration: {},
				time: {},
				holiday: {}
			},
			adjective: {
				comparable: {},
				comparative: {},
				superlative: {}
			},
			contraction: {},
			adverb: {},
			currency: {},
			determiner: {},
			conjunction: {},
			preposition: {},
			questionWord: {},
			pronoun: {},
			expression: {},
			abbreviation: {},
			url: {},
			hashTag: {},
			phoneNumber: {},
			atMention: {},
			emoji: {},
			emoticon: {},
			email: {},
			auxiliary: {},
			negative: {},
			acronym: {}
		}
	}
	async connect( options )
	{
		super.connect( options );
		var answer = await this.awi.utilities.loadJavascript( this.awi.config.getEnginePath() + '/data/libs/compromise.js' );
		if ( answer.success )
			this.compromise = answer.data.result;
		this.connected = answer.success;
		this.connectAnswer.success = answer.success;
		return this.connectAnswer;
	}
	findWordDefinition( source, names, task )
	{
		if ( typeof names == 'string' )
		{
			if ( typeof names == 'undefined' || typeof source == 'undefined' )
				return null;

			if ( task == 'find' )
			{
				var found = source.findIndex(
					function( element )
					{
						var pos = names.indexOf( element );
						if ( pos < 0 )
							return false;
						var bad = false;
						if ( pos > 0 )
							bad = ( names.charAt( pos - 1 ) != ' ' );
						if ( pos + element.length < names.length )
						{
							var c = names.charAt( pos + element.length );
							if ( c == 's' && names.charAt( pos + element.length ) == ' ' )
								return true;
							bad = ( c != ' ' );
						}
						return !bad;
					} );
					if ( found >= 0 )
						return source[ found ];
				return null;
			}
			for ( var s in source )
			{
				var found = source[ s ].names.findIndex(
					function( element )
					{
						var pos = names.indexOf( element );
						if ( pos < 0 )
							return false;
						var bad = false;
						if ( pos > 0 )
							bad = ( names.charAt( pos - 1 ) != ' ' );
						if ( pos + element.length < names.length )
						{
							var c = names.charAt( pos + element.length );
							if ( c == 's' && names.charAt( pos + element.length ) == ' ' )
								return true;
							bad = ( c != ' ' );
						}
						return !bad;
					} );
				if ( found >= 0 )
					return source[ s ];
			}
			return null;
		}
		var result = [];
		if ( typeof names != 'undefined' && typeof source != 'undefined' )
		{
			if ( task == 'find' )
			{
				var found = source.findIndex(
					function( element )
					{
						for ( var n = 0; n < names.length; n++ )
						{
							var name = names[ n ];
							var pos = name.indexOf( element );
							if ( pos >= 0 )
							{
								var bad = false;
								if ( pos > 0 )
									bad = ( name.charAt( pos - 1 ) != ' ' );
								if ( pos + element.length < name.length )
								{
									var c = name.charAt( pos + element.length );
									if ( c == 's' && name.charAt( pos + element.length ) == ' ' )
										return true;
									bad = ( c != ' ' );
								}
								return !bad;
							}
						}
					} );
					if ( found >= 0 )
						return source[ found ];
				return null;
			}
			for ( var s in source )
			{
				var found = source[ s ].names.findIndex(
					function( element )
					{
						for ( var n = 0; n < names.length; n++ )
						{
							var name = names[ n ];
							var pos = name.indexOf( element );
							if ( pos >= 0 )
							{
								var bad = false;
								if ( pos > 0 )
									bad = ( name.charAt( pos - 1 ) != ' ' );
								if ( pos + element.length < name.length )
								{
									var c = name.charAt( pos + element.length );
									if ( c == 's' && name.charAt( pos + element.length ) == ' ' )
										return true;
									bad = ( c != ' ' );
								}
								return !bad;
							}
						}
						return false;
					} );
				if ( found >= 0 )
					result.push( source[ s ] );
			}
		}
		return result;
	}
	async extractCommandFromLine( line, control )
	{
		var self = this;
		var toRemove = [];
		var tagsMap = {};
		var doc = nlp( line );
		var command;
		var rootDoc = doc.normalize( {
			whitespace: true,			// remove hyphens, newlines, and force one space between words
			case: true,					// keep only first-word, and 'entity' titlecasing
			punctuation: true,			// remove commas, semicolons - but keep sentence-ending punctuation
			unicode: true,				// visually romanize/anglicize 'Björk' into 'Bjork'.
			contractions: true,			// turn "isn't" to "is not"
			acronyms:true,				// remove periods from acronyms, like 'F.B.I.'
			//---these ones don't run unless you want them to---
			parentheses: true,			//remove words inside brackets (like these)
			possessives: true,			// turn "Google's tax return" to "Google tax return"
			plurals: true,				// turn "batmobiles" into "batmobile"
			verbs: true,				// turn all verbs into Infinitive form - "I walked" → "I walk"
			honorifics: true,			//turn 'Vice Admiral John Smith' to 'John Smith'
		} );
		function getTags( tags, text )
		{
			var text = '';
			for ( var tag in tags )
			{
				if ( tag != 'data' )
				{
					var arr = [];
					var str = text + ( text == '' ? '' : '.' ) + tag;
					getTags( tags[ tag ], str );
					var tagName = '#' + tag.charAt( 0 ).toUpperCase() + tag.substring( 1 );
					switch ( tagName )
					{
						case '#Noun':
							arr = rootDoc.nouns().toSingular().out( 'array' );
							break;
						default:
							arr = rootDoc.match( tagName ).out( 'array' );
							break;
					}
					if ( arr.length > 0 )
					{
						tagsMap[ tag ] = arr;
						text += str + ': ' + tagsMap[ tag ] + '\n';
					}
				}
			}
		}
		function extractDates( names )
		{
			var extraDates = self.findWordDefinition( self.awi.time.extraDates, names );
			for ( var e = 0; e < extraDates.length; e++ )
			{
				var quit = false;
				var extraDate = extraDates[ e ];
				for ( var a in self.awi.time.extraDateAdjectives )
				{
					var adjective = self.awi.time.extraDateAdjectives[ a ];
					for ( var n = 0; n < adjective.names.length; n++ )
					{
						var match = rootDoc.match( adjective.names[ n ] + ' ' + extraDate.names[ 0 ] ).text();
						if ( match )
						{
							extraDate.delta = adjective.delta;
							toRemove.push( adjective.names[ n ] );
							quit = true;
							break;
						}
					}
					if ( quit )
						break;
				}
				// Convert the dates to time interval
				command.parameters.date.push( self.awi.time.getTimeOrDate( extraDate, 'date' ) );
			}
		}
		function extractTimes( names )
		{
			var extraTimes = self.findWordDefinition( self.awi.time.extraTimes, names );
			for ( var e = 0; e < extraTimes.length; e++ )
			{
				var quit = false;
				var extraTime = extraTimes[ e ];
				for ( var a in self.awi.time.extraTimeAdjectives )
				{
					var adjective = self.awi.time.extraTimeAdjectives[ a ];
					for ( var n = 0; n < adjective.names.length; n++ )
					{
						var match = rootDoc.match( adjective.names[ n ] + ' ' + extraTime.names[ 0 ] ).text();
						if ( match )
						{
							extraTime.delta = adjective.delta;
							quit = true;
							break;
						}
					}
					if ( quit )
						break;
				}
				// Convert the dates to time interval
				command.parameters.time.push( self.awi.time.getTimeOrDate( extraTime, 'time' ) );
			}
		}
		async function getParameters( bubble, command )
		{
			for ( var tag in bubble.properties.parser )
			{
				var words = bubble.properties.parser[ tag ];
				if ( tag == 'evaluation' )
				{
					var found = false;
					var nouns = tagsMap[ 'noun' ];
					if ( nouns )
					{
						for ( var n = 0; n < nouns.length; n++ )
						{
							if ( self.awi.utilities.isExpression( nouns[ n ] ) )
							{
								command.parameters[ tag ] = nouns[ n ];
								toRemove.push( nouns[ n ] );
								found = true;
								break;
							}
						}
					}
					if ( !found && typeof tagsMap[ 'value' ] != 'undefined' )
					{
						var value = parseInt( tagsMap[ 'value' ] );
						if ( !isNaN( value ) )
						{
							command.parameters[ tag ] = value;
							toRemove.push( tagsMap[ 'value' ] );
						}
					}
				}
				else if ( tag == 'file' )
				{
					var nouns = tagsMap[ 'noun' ];
					command.parameters.file = self.awi.utilities.copyObject( self.awi.system.assetTypes.file );
					if ( typeof tagsMap[ 'noun' ] != 'undefined' && nouns.length > 0 )
					{
						var assetType = await self.awi.system.getAssetType( tagsMap[ 'noun' ] );
						if ( assetType )
						{
							if ( command.parameters.file.filters[ 0 ] == '*.*' )
							{
								command.parameters.file.filters = [];
								command.parameters.file.names = [];
							}
							command.parameters.file.filters.push( ...assetType.filters );
							command.parameters.file.names.push( ...assetType.names );
						}
						else if ( self.awi.utilities.isPath( nouns[ n ][ 0 ] ) )
						{
							command.parameters.file.paths.push( nouns[ n ][ 0 ] );
							toRemove.push( nouns[ n ] );
						}
					}
					if ( command.parameters.file.names.length > 0 )
					{
						var name =  command.parameters.file.names[ 0 ];
						var config = self.awi.config.getConfig( 'user' ).paths[ self.awi.config.platform ];
						command.parameters.file.paths = config[ name ];
					}
				}
				else if ( tag == 'date' )
				{
					command.parameters.date = [];
					extractDates( tagsMap[ 'date' ], 'date', toRemove );
					extractDates( tagsMap[ 'noun' ], 'date', toRemove );
				}
				else if ( tag == 'time' )
				{
					command.parameters.time = [];
					extractTimes( tagsMap[ 'date' ], 'time', toRemove );
					extractTimes( tagsMap[ 'noun' ], 'time', toRemove );
				}
				else if ( tag == 'person' )
				{
					command.parameters.person = [];
					if ( tagsMap[ 'firstName' ] )
					{
						for ( var f = 0; f < tagsMap[ 'firstName' ].length; f++ )
						{
							var person = self.awi.utilities.capitalize( tagsMap[ 'firstName' ][ f ] );
							toRemove.push( tagsMap[ 'firstName' ][ f ] );
							if ( tagsMap[ 'lastName' ] && tagsMap[ 'lastName' ].length == tagsMap[ 'firstName' ].length )
							{
								person += ' ' + self.awi.utilities.capitalize( tagsMap[ 'lastName' ][ f ] );
								toRemove.push( tagsMap[ 'lastName' ][ f ] );
							}
							command.parameters.person.push( person );
						}
					}
				}
				else if ( tag == 'what' )
				{
					command.parameters.what = [];
					if ( tagsMap[ 'noun' ] )
					{
						for ( var f = 0; f < tagsMap[ 'noun' ].length; f++ )
						{
							var found = self.findWordDefinition( bubble.properties.parser.what, tagsMap[ 'noun' ][ f ], 'find' );
							if ( found )
							{
								command.parameters.what.push( found );
								toRemove.push( found );
							}
						}
					}
				}
				else if ( tagsMap[ tag ] )
				{
					for ( var d = 0; d < tagsMap[ tag ].length; d++ )
					{
						var word = self.awi.utilities.removePunctuation( tagsMap[ tag ][ d ] );
						var found = 1;
						if ( tag != 'date' && tag != 'value' )
						{
							found = words.findIndex(
								function( element )
								{
									var pos = word.indexOf( element );
									if ( pos >= 0 )
									{
										var bad = false;
										if ( pos > 0 )
											bad = ( word.charAt( pos - 1 ) != ' ' );
										if ( pos + element.length < word.length )
											bad = ( word.charAt( pos + element.length ) != ' ' );
										return !bad;
									}
									return false;
								} );
						}
						else if ( tag == 'value' )
						{
							for ( var w = 0; w < words.length; w++ )
							{
								if ( words[ w ] == 'numeric' )
								{
									var value = parseInt( tagsMap[ tag ] );
									if ( !isNaN( value ) )
										command.parameters[ tag ] = value;
								}
							}
						}
						if ( found >= 0 )
						{
							if ( !command.parameters[ tag ] )
							{
								command.parameters[ tag ] = words[ found ];
								toRemove.push( words[ found ] );
							}
						}
					}
				}
				var found = true;
				if ( !command.token )
				{
					var selects = bubble.properties.select;
					for ( var s = 0; s < selects.length && !found; s++ )
					{
						found = true;
						var select = selects[ s ];
						for ( var ss = 0; ss < select.length; ss++ )
						{
							if ( typeof command.parameters[ select[ ss ] ] == 'undefined' )
								found = false;
						}
					}
				}
				if ( found )
				{
					// Check all mandatory values are here...
					for ( var i = 0; i < bubble.properties.inputs.length && found; i++ )
					{
						var info = self.awi.utilities.getBubbleParams( bubble.properties.inputs[ i ] );
						if ( !info.optional )
						{
							if ( typeof command.parameters[ info.name ] == 'undefined' )
								found = false;
						}
					}
				}
				if ( found )
				{
					command.token = bubble.token;
					command.classname = bubble.classname;
				}
			}
		}

		var myTags = this.awi.utilities.copyObject( this.tags );
		getTags( myTags, '' );

		command =
		{
			token: '',
			classname: '',
			parameters: {},
			options: {}
		};
		var terms = rootDoc.terms().out( 'array' );
		if ( !tagsMap.questionWord )
		{
			var list = [ [ 'please', 'awi' ], [ 'please', 'now' ], [ 'please' ], [ 'can', 'you' ], [ 'could', 'you' ], [ 'i', 'would', 'like', 'you', 'to' ], [ 'now' ] ];
			for ( var w = 0; w < terms.length; w++ )
			{
				var good = false;
				var word = terms[ w ];
				for ( var l = 0; l < list.length && !good; l++ )
				{
					var sublist = list[ l ];
					if ( sublist[ 0 ] == word )
					{
						good = true;
						for ( var ll = 1; ll < sublist.length && good; ll++ )
						{
							if ( w + ll >= terms.length || sublist[ ll ] != terms[ w + ll ] )
								good = false;
						}
						if ( good )
						{
							w += ll - 1;
							toRemove.push( ...sublist );
						}
					}
				}
				if ( !good )
					break;
			}
			word = terms[ w ];
			for ( classname in this.awi.bubbles )
			{
				if ( this.awi.bubbles[ classname ][ word ] )
				{
					command.token = word;
					command.classname = classname;
					await getParameters( this.awi.bubbles[ classname ][ word ], command );
					if ( command.token )
						break;
				}
			}
			if ( !command.token )
			{
				for ( var classname in this.awi.bubbles )
				{
					for ( var token in this.awi.bubbles[ classname ] )
					{
						var bubble = this.awi.bubbles[ classname ][ token ];
						var verb = this.findWordDefinition( bubble.properties.parser.verb, word, 'find' );
						if ( verb )
						{
							await getParameters( bubble, command );
							if ( command.token )
								break;
						}
					}
					if ( command.token )
						break;
				}
			}
		}
		else
		{
			var word = terms[ 0 ];
			for ( var classname in this.awi.bubbles )
			{
				for ( var token in this.awi.bubbles[ classname ] )
				{
					var bubble = this.awi.bubbles[ classname ][ token ];
					var questionWord = this.findWordDefinition( bubble.properties.parser.questionWord, word, 'find' );
					if ( questionWord )
					{
						await getParameters( bubble, command );
						if ( command.token )
							break;
					}
				}
				if ( command.token )
					break;
			}
		}
		if ( !command.token )
		{
			command.token = 'chat';
			command.classname = 'generic';
			command.parameters.userInput = line;
		}
		else
		{
			// Calculates remaining of line...
			var newline = '';
			var terms = rootDoc.terms().out( 'array' );
			for ( var t = 0; t < terms.length; t++ )
			{
				var found = toRemove.findIndex(
					function( e )
					{
						return e == terms[ t ];
					} );
				if ( found < 0 )
					newline += terms[ t ] + ' ';
			}
			line = newline.trim();
		}
		command.parameters.userInput = line;
		command.line = line;

		// Print out results...
		var text = [];
		text.push( 'command: ' + command.classname + '.' + command.token );
		for ( var p in command.parameters )
		{
			if ( p == 'file' )
			{
				var subText = 'file: ';
				for ( var n = 0; n < command.parameters.file.names.length; n++ )
					subText += command.parameters.file.names[ n ] + ', ';
				subText = subText.substring( 0, subText.length - 2 ) + ', filters: ';
				for ( var f = 0; f < command.parameters.file.filters.length; f++ )
					subText += command.parameters.file.filters[ f ] + ', ';
				subText = subText.substring( 0, subText.length - 2 ) + ', paths: ';
				for ( var p = 0; p < command.parameters.file.paths.length; p++ )
					subText += command.parameters.file.paths[ p ] + ', ';
				subText = subText.substring( 0, subText.length - 2 );
				text.push( subText );
			}
			else if ( p == 'date' )
			{
				for ( var d = 0; d < command.parameters.date.length; d++ )
				{
					var date = 'date: ' + command.parameters.date[ d ].date.text + ', ';
					date += 'from: ' + command.parameters.date[ d ].from.text + ', ';
					date += 'to: ' + command.parameters.date[ d ].to.text;
					text.push( date )
				}
			}
			else if ( p == 'time' )
			{
				for ( var d = 0; d < command.parameters.time.length; d++ )
				{
					var time = 'time: ' + command.parameters.time[ d ].time.text + ', ';
					time += 'from: ' + command.parameters.time[ d ].from.text + ', ';
					time += 'to: ' + command.parameters.time[ d ].to.text;
					text.push( time )
				}
			}
			else
			{
				text.push( p + ': ' + command.parameters[ p ] );
			}
		}
		this.awi.editor.print( control.editor, text, { user: 'parser' } );
		return command;
	}
}
module.exports.Connector = ConnectorUtilitiesParser;

},{"../awi-connector":34}],40:[function(require,module,exports){
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
* @file awi-connector-time-gregorian.js
* @author FL (Francois Lionet)
* @date first pushed on 10/06/2023
* @version 0.3
*
* @short Time Gregorian calendar utilities.
*
*/
var awiconnector = require( '../awi-connector' );
//var hebcal = require( 'hebcal' );

class ConnectorUtilitiesTime extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Time';
		this.token = 'time';
		this.classname = 'utilities';
		this.version = '0.3';
		this.extraDates =
		{
			yesterday: { names: [ 'yesterday' ], needAdjective: false, delta: -1 },
			tomorrow: { names: [ 'tomorrow' ], needAdjective: false, delta: 1 },
			morning: { names: [ 'morning', 'dawn', 'breakfast', 'brunch' ], needAdjective: true, delta: 0 },
			noon: { names: [ 'noon', 'midday', 'dinner' ], needAdjective: true, delta: 0 },
			afternoon: { names: [ 'afternoon' ], needAdjective: true, delta: 0 },
			evening: { names: [ 'evening', 'sunset' ], needAdjective: true, delta: 0 },
			night: { names: [ 'night' ], needAdjective: true, delta: 0 },
			second: { names: [ 'second' ], needAdjective: true, delta: 0 },
			minute: { names: [ 'minute', 'minit', 'minut' ], needAdjective: true, delta: 0 },
			hour: { names: [ 'hour' ], needAdjective: true, delta: 0 },
			day: { names: [ 'day' ], needAdjective: true, delta: 0 },
			week: { names: [ 'week' ], needAdjective: true, delta: 0 },
			month: { names: [ 'month' ], needAdjective: true, delta: 0 },
			year: { names: [ 'year' ], needAdjective: true, delta: 0 },
			decade: { names: [ 'decade' ], needAdjective: true, delta: 0 },
			century: { names: [ 'century' ], needAdjective: true, delta: 0 },
			christmas: { names: [ 'christmas', 'xmas', 'x-mas' ], needAdjective: true, delta: 0 },
			easter: { names: [ 'easter' ], needAdjective: true, delta: 0 },
			thanksgiving: { names: [ 'thanksgiving' ], needAdjective: true, delta: 0 },
			birthday: { names: [ 'birthday' ], needAdjective: true, delta: 0 },
			shabbath: { names: [ 'shabbath', 'shabbat' ], needAdjective: true, delta: 0 },
			tonight: { names: [ 'tonight' ], needAdjective: false, delta: 0 },
			birth: { names: [ 'birth' ], needAdjective: false, delta: 0 },
			death: { names: [ 'death' ], needAdjective: false, delta: 0 },
		}
		this.extraDateAdjectives =
		{
			previouslast: { names: [ 'previous last' ], delta: -2 },
			this: { names: [ 'this' ], delta: 0 },
			last: { names: [ 'last', 'previous' ], delta: -1 },
			next: { names: [ 'next' ], delta: +1 },
		}
		this.extraTimes = this.extraDates;
		this.extraTimeAdjectives = this.extraTimeAdjectives;
	}
	async connect( options )
	{
		super.connect( options );
		this.connected = true;
		this.connectAnswer.success = true;
		return this.connectAnswer;
		/*
		this.hebcal = new hebcal.GregYear();
		this.hebcalDay = hebcal.HDate( new Date() );
		var holidays = this.hebcal.holidays;
		for ( var h = 0; h < holidays.length; h++ )
		{
			var holiday = holidays[ h ];
			for ( var d = 0; n < holiday.desc.length; d++ )
			{
				var name = holiday.desc[ d ];
				for ( var p = 0; p < name.length; p++ )
				{
					var type = this.awi.utilities.getCharacterType( name.charAt( p ) );
					if ( type != 'letter' )
						break;
				}
				name = name.substring( 0, p );
				if ( !this.holidays[ name ] )
				{
					this.holidays[ name ] = { names: [ name ] };
				}
				else
				{
					this.holidays[ name ].names.push( name );
				}
			}
			holidayDesc.names
		}
		var holidays = this.hebcalDay.holidays( true );
		*/
	}
	getDateRegex()
	{
		return [ /([a-zA-Z\u00E9\u00E8\u00EA\u00EB\u00E0\u00E2\u00E4\u00F4\u00F6\u00FB\u00FC\u00E7]{3})\s(\d{1,2}),\s(\d{4})\s(\d{1,2}):(\d{2}):(\d{2})(am|pm|AM|PM)?/ ];
	}
	getTimeRegex()
	{
		return [ /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/ ];
	}
	getMediaRegex()
	{
		return [ /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/ ];
	}
	getDatestamp( date )
	{
		date.setHours( 0 );
		date.setMinutes( 0 );
		date.setSeconds( 0 );
		date.setMilliseconds( 0 );
		var text = date.toISOString();
		var t = text.indexOf( 'T' );
		return { time: date.getTime(), text: text.substring( 0, t ) };
	};
	getTimestamp( time )
	{
		time.setFullYear( 1970, 1 );
		time.setDate( 1 );
		var text = time.toISOString().substring( 0, time.toISOString().length - 1 );
		var t = text.indexOf( 'T' );
		return { time: time.getTime(), text: text.substring( t + 1 ) };
	};
	getDatestampFromMatches( matches, monthReplacement = 1 )
	{
		var [ _, month, day, year, hours, minutes, seconds, ampm ] = matches;

		// Convert month to number
		var monthList =
		[
			"JanuFebrMarsApriMay JuneJulyAuguSeptOctoNoveDece",
			"JanvFevrMarsAvriMai JuinJuilAoutSeptOctoNoveDece",
			"JanvFévrMarsAvriMai JuinJuilAoûtSeptOctoNoveDéce",
		]
		var nMonth;
		month = month.substring( 0, 4 ).toLowerCase();
		for ( var n = 0; n < monthList.length; n++ )
		{
			var nMonth = monthList[ n ].toLowerCase().indexOf( month );
			if ( nMonth >= 0 )
			{
				nMonth = Math.floor( nMonth / 4 );
				nMonth++;
				break;
			}
		}
		if ( nMonth < 1 )
			nMonth = monthReplacement;
		month = nMonth;
		var isPM = ( ampm === 'pm' || ampm === 'PM' );
		var newHours = ( isPM && hours !== '12' ) ? parseInt( hours ) + 12 : parseInt( hours );
		var date = new Date( parseInt( year ), month - 1, parseInt( day ), newHours, parseInt( minutes ), parseInt( seconds ) )
		return { time: date.getTime(), text: date.toUTCString() };
	}
	getTimestampFromMatches( matches )
	{
		var [ _, hours, minutes, seconds, milliseconds ] = matches;
		hours = this.awi.utilities.checkUndefined( hours, '00' );
		minutes = this.awi.utilities.checkUndefined( minutes, '00' );
		seconds = this.awi.utilities.checkUndefined( seconds, '00' );
		milliseconds = this.awi.utilities.checkUndefined( milliseconds, '000' );

		var date = new Date();
		date.setFullYear( 1970, 1 );
		date.setHours( parseInt( hours ) );
		date.setMinutes( parseInt( minutes ) );
		date.setSeconds( parseInt( seconds ) );
		date.setMilliseconds( parseInt( milliseconds ) );
		return this.getTimestamp( date );
	}
	getTimestampFromStats( stats )
	{
		var date = new Date( stats.mtimeMs );
		return this.getDatestamp( date );
	}
	getTimeOrDate( definition, type )
	{
		var now = new Date();
		var start = new Date();
		var end = new Date();
		function setYear( n, s, e )
		{
			if ( n >= 0 ) now.setYear( n );
			if ( s >= 0 ) start.setYear( s );
			if ( e >= 0 ) end.setYear( e );
		}
		function setMonth( n, s, e )
		{
			if ( n >= 0 ) now.setMonth( n );
			if ( s >= 0 ) start.setMonth( s );
			if ( e >= 0 ) end.setMonth( e );
		}
		function setDate( n, s, e )
		{
			if ( n >= 0 ) now.setDate( n );
			if ( s >= 0 ) start.setDate( s );
			if ( e >= 0 ) end.setDate( e );
		}
		function setHour( n, s, e )
		{
			if ( n >= 0 ) now.setHours( n );
			if ( s >= 0 ) start.setHours( s );
			if ( e >= 0 ) end.setHours( e );
		}
		function setMinute( n, s, e )
		{
			if ( n >= 0 ) now.setMinutes( n );
			if ( s >= 0 ) start.setMinutes( s );
			if ( e >= 0 ) end.setMinutes( e );
		}
		function setSecond( n, s, e )
		{
			if ( n >= 0 ) now.setSeconds( n );
			if ( s >= 0 ) start.setSeconds( s );
			if ( e >= 0 ) end.setSeconds( e );
		}
		function setMillisecond( n, s, e )
		{
			if ( n >= 0 ) now.setMilliseconds( n );
			if ( s >= 0 ) start.setMilliseconds( s );
			if ( e >= 0 ) end.setMilliseconds( e );
		}
		function addYear( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setYear( now.getFullYear() + n );
			if ( typeof s != 'undefined' ) start.setYear( start.getFullYear() + s );
			if ( typeof e != 'undefined' ) end.setYear( end.getFullYear() + e );
		}
		function addMonth( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setMonth( now.getMonth() + n );
			if ( typeof s != 'undefined' ) start.setMonth( start.getMonth() + s );
			if ( typeof e != 'undefined' ) end.setMonth( end.getMonth() + e );
		}
		function addDate( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setDate( now.getDate() + n );
			if ( typeof s != 'undefined' ) start.setDate( start.getDate() + s );
			if ( typeof e != 'undefined' ) end.setDate( end.getDate() + e );
		}
		function addHour( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setHours( now.getHours() + n );
			if ( typeof s != 'undefined' ) start.setHours( start.getHours() + s );
			if ( typeof e != 'undefined' ) end.setHours( end.getHours() + e );
		}
		function addMinute( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setMinutes( now.getMinutes() + n );
			if ( typeof s != 'undefined' ) start.setMinutes( start.getMinutes() + s );
			if ( typeof e != 'undefined' ) end.setMinutes( end.getMinutes() + e );
		}
		function addSecond( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setSeconds( now.getSeconds() + n );
			if ( typeof s != 'undefined' ) start.setSeconds( start.getSeconds() + s );
			if ( typeof e != 'undefined' ) end.setSeconds( end.getSeconds() + e );
		}
		function addMillisecond( n, s, e )
		{
			if ( typeof n != 'undefined' ) now.setMilliseconds( now.getMilliseconds() + n );
			if ( typeof s != 'undefined' ) start.setMilliseconds( start.getMilliseconds() + s );
			if ( typeof e != 'undefined' ) end.setMilliseconds( end.getMilliseconds() + e );
		}

		if ( type == 'time' )
		{
			switch ( definition.names[ 0 ] )
			{
				case 'morning':
					setHour( 8, 0, 12 );
					addDate( definition.delta, definition.delta, definition.delta );
					break;
				case 'noon':
					setHour( 13, 12, 14 );
					addDate( definition.delta, definition.delta, definition.delta );
					break;
				case 'afternoon':
					setHour( 16, 14, 20 );
					addDate( definition.delta, definition.delta, definition.delta );
					break;
				case 'evening':
					setHour( 22, 2, 24 );
					addDate( definition.delta, definition.delta, definition.delta );
					break;
				case 'night':
					setHour( 23, 22, 0 );
					addDate( definition.delta, definition.delta, definition.delta + 1 );
					break;
				case 'second':
					addSecond( definition.delta, definition.delta, definition.delta );
					break;
				case 'minute':
					addMinute( definition.delta, definition.delta, definition.delta );
					break;
				case 'hour':
					addHour( definition.delta, definition.delta, definition.delta );
					break;
				case 'tonight':
					setHour( 23, 22, 0 );
					setDate( 0, 0, 1 );
					break;
				case 'tomorrow':
				case 'yesterday':
				case 'day':
				case 'week':
				case 'month':
				case 'year':
				case 'decade':
				case 'century':
					setHour( 12, 0, 23 );
					setMinute( 0, 0, 59 );
					setSecond( 0, 0, 59 );
					setMillisecond( 0, 0, 999 );
					break;
				case 'christmas':
					setHour( 20, 0, 23 );
					setMinute( 0, 0, 59 );
					setSecond( 0, 0, 59 );
					setMillisecond( 0, 0, 999 );
					break;
				case 'easter':
				case 'thanksgiving':
				case 'birthday':
					setHour( 12, 0, 23 );
					setMinute( 0, 0, 59 );
					setSecond( 0, 0, 59 );
					setMillisecond( 0, 0, 999 );
					break;
				case 'birth':
				case 'death':
				case 'shabbath':
					break;
			}
			return { time: this.getTimestamp( now ), from: this.getTimestamp( start ), to : this.getTimestamp( end ) };
		}
		else
		{
			switch ( definition.names[ 0 ] )
			{
				case 'yesterday':
					addDate( - 1, - 1, 0 );
					break;
				case 'tomorrow':
					addDate( 1, 1, 2 );
					break;
				case 'day':
					addDate( definition.delta, definition.delta, definition.delta + 1 );
					break;
				case 'week':
					var day = start.getDay();
					setDate( - day - 3 + definition.delta * 7, - day - 7 + definition.delta * 7, - day + definition.delta * 7 );
					break;
				case 'month':
					setDate( 15, 1, 30 );
					addMonth( definition.delta, definition.delta, definition.delta + 1 );
					break;
				case 'year':
					setMonth( 7, 1, 12 );
					setDate( 1, 1, 31 );
					addYear( definition.delta, definition.delta, definition.delta + 1 );
					break;
				case 'decade':
					setYear( 1, -1, -1 );
					setMonth( 1, 1, 12 );
					setDate( 1, 1, 31 );
					setYear( definition.delta * 10 + 5, definition.delta * 10, definition.delta * 10 + 10 );
					break;
				case 'century':
					setYear( 1, -1, -1 );
					setMonth( 1, 1, 12 );
					setDate( 1, 1, 31 );
					setYear( definition.delta * 100 + 50, definition.delta * 100, definition.delta * 100 + 100 );
					break;
				case 'christmas':
					setMonth( 12, 12, 12 );
					setDate( 25, 20, 27 );
					addYear( definition.delta, definition.delta, definition.delta );
					break;
				case 'easter':
					function getEasterDate( Y )
					{
						var C = Math.floor(Y/100);
						var N = Y - 19*Math.floor(Y/19);
						var K = Math.floor((C - 17)/25);
						var I = C - Math.floor(C/4) - Math.floor((C - K)/3) + 19*N + 15;
						I = I - 30*Math.floor((I/30));
						I = I - Math.floor(I/28)*(1 - Math.floor(I/28)*Math.floor(29/(I + 1))*Math.floor((21 - N)/11));
						var J = Y + Math.floor(Y/4) + I + 2 - C + Math.floor(C/4);
						J = J - 7*Math.floor(J/7);
						var L = I - J;
						var M = 3 + Math.floor((L + 40)/44);
						var D = L + 28 - 31*Math.floor(M/4);
						return { month: M, day: D };
					}
					var year = start.getFullYear() + definition.delta;
					var { month, day } = getEasterDate( year );
					setMonth( month, month, month );
					setDate( day, day - 7, day + 7 );
					setYear( year, year, year );
					break;
				case 'thanksgiving':
					var year = start.getFullYear() + definition.delta;
					var first = new Date( year, 10, 1 );
					var day = 22 + ( 11 - first.getDay() ) % 7;
					setMonth( 11, 11, 11 );
					setDate( day, day - 2, day + 2 );
					setYear( year, year, year );
					break;
				case 'birthday':
					break;
				case 'shabbath':
					break;
				case 'birth':
					break;
				case 'death':
					break;
			}
			return { date: this.getDatestamp( now ), from: this.getDatestamp( start ), to : this.getDatestamp( end ) };
		}
	}
	isStatsWithinDate( stats, stamp )
	{
		if ( stats.mtimeMs >= stamp.from.time && stats.mtimeMs < stamp.to.time )
			return true;
		return false;
	}
}
module.exports.Connector = ConnectorUtilitiesTime
},{"../awi-connector":34}],41:[function(require,module,exports){
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
* @file awi-connector-utilities-utilities.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Various utilities.
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorUtilityUtilities extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Awi utilities';
		this.token = 'utilities';
		this.classname = 'utilities';
		this.version = '0.2.1';
		this.sep = '/';
	}
	async connect( options )
	{
		super.connect( options );
		this.connected = true;
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}
	async completeConnect()
	{
		var answer = await this.loadJavascript( this.awi.config.getEnginePath() + '/data/libs/sha1.js', { eval: true } );
		if ( answer.success )
			this.sha1 = answer.data.result;
	}
	capitalize( text )
	{
		return text.charAt( 0 ).toUpperCase() + text.substring( 1 );
	}
	replaceStringInText( text, mark, replacement )
	{
		var pos = text.indexOf( mark );
		while( pos >= 0 )
		{
			text = text.substring( 0, pos ) + replacement + text.substring( pos + mark.length );
			pos = text.indexOf( mark );
		}
		return text;
	}
	copyObject( obj )
	{
		var ret = null;
		if (obj !== Object(obj)) { // primitive types
			return obj;
		}
		if (obj instanceof String || obj instanceof Number || obj instanceof Boolean) { // string objecs
			ret = obj; // for ex: obj = new String("Spidergap")
		} else if (obj instanceof Date) { // date
			ret = new obj.constructor();
		} else
			ret = Object.create(obj.constructor.prototype);

		var prop = null;
		var allProps = Object.getOwnPropertyNames(obj); //gets non enumerables also


		var props = {};
		for (var i in allProps) {
			prop = allProps[i];
			props[prop] = false;
		}

		for (i in obj) {
			props[i] = i;
		}

		//now props contain both enums and non enums
		var propDescriptor = null;
		var newPropVal = null; // value of the property in new object
		for (i in props) {
			prop = obj[i];
			propDescriptor = Object.getOwnPropertyDescriptor(obj, i);

			if (Array.isArray(prop)) { //not backward compatible
				prop = prop.slice(); // to copy the array
			} else
			if (prop instanceof Date == true) {
				prop = new prop.constructor();
			} else
			if (prop instanceof Object == true) {
				if (prop instanceof Function == true) { // function
					if (!Function.prototype.clone) {
						Function.prototype.clone = function() {
							var that = this;
							var temp = function tmp() {
								return that.apply(this, arguments);
							};
							for (var ky in this) {
								temp[ky] = this[ky];
							}
							return temp;
						}
					}
					prop = prop.clone();

				} else // normal object
				{
					prop = this.copyObject(prop);
				}

			}

			newPropVal = {
				value: prop
			};
			if (propDescriptor) {
				/*
					* If property descriptors are there, they must be copied
					*/
				newPropVal.enumerable = propDescriptor.enumerable;
				newPropVal.writable = propDescriptor.writable;

			}
			if (!ret.hasOwnProperty(i)) // when String or other predefined objects
				Object.defineProperty(ret, i, newPropVal); // non enumerable

		}
		return ret;
	}
	copyArray( arr, arrDest )
	{
		arrDest = typeof arrDest == 'undefined' ? [] : arrDest;
		for ( var p = 0; p < arr.length; p++ )
		{
			var prop = arr[ p ];
			if ( this.isArray( prop ) )
				prop = this.copyArray( prop, [] );
			arrDest.push( prop );
		}
		return arrDest;
	}
	isFunction( functionToCheck )
	{
		return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
	}
	isObject( item )
	{
		return typeof item != 'undefined' ? (typeof item === "object" && !Array.isArray( item ) && item !== null) : false;
	};
	isArray( item )
	{
		return typeof item != 'undefined' ? Array.isArray( item ) : false;
	};
	countElements( obj, options = { all: true } )
	{
		var count = 0;
		for ( var p in obj )
		{
			if ( obj[ p ] === null )
				continue;
			if ( this.isObject( p ) )
			{
				if ( options.objects || options.all )
				{
					if ( obj[ p ] )
						count++;
				}
			}
			else if ( this.isArray( p ) )
			{
				if ( options.arrays || options.all )
				{
					if ( obj[ p ] )
						count++;
				}
			}
			else if ( this.isFunction( p ) )
			{
				if ( options.functions || options.all )
				{
					if ( obj[ p ] )
						count++;
				}
			}
			else
			{
				count++;
			}
		}
		return count;
	}
	getCharacterType( c )
	{
		var type;
		if ( c >= '0' && c <= '9' )
			type = 'number';
		else if ( c == ' ' || c == "\t" )
			type = 'space';
		else if ( ( c >= 'a' && c <= 'z') || ( c >= 'A' && c <= 'Z' ) || c == '_' )
			type = 'letter';
		else if ( c == '"'  || c == '“' || c == "'" )
			type = 'quote';
		else if ( c == "'" )
			type = 'remark';
		else if ( c == ':' )
			type = 'column';
		else if ( c == ';' )
			type = 'semicolumn';
		else if ( c == '-' || c == '–' )
			type = 'minus';
		else if ( c == '(' || c == ')' )
			type = 'bracket';
		else if ( c == '{' || c == '}' )
			type = 'accolade';
		else
			type = 'other';
		return type;
	}
	isTag( text, tags )
	{
		var pos;
		tags = !this.isArray( tags ) ? [ tags ] : tags;
		text = text.toLowerCase();
		for ( var t = 0; t < tags.length; t++ )
		{
			if ( ( pos = text.indexOf( '#' + tags[ t ] ) ) >= 0 )
			{
				pos += tags[ t ].length + 1;
				if ( pos >= text.length || this.getCharacterType( pos ) != 'letter' )
					return true;
			}
		}
		return false;
	}
	convertStringToArrayBuffer( str )
	{
		var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var lookup = new Uint8Array(256);
		for ( var i = 0; i < chars.length; i++ )
		{
			lookup[ chars.charCodeAt( i ) ] = i;
		}

		var bufferLength = str.length * 0.75, len = str.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
		if ( str[ str.length - 1 ] === "=")
		{
			bufferLength--;
			if ( str[ str.length - 2 ] === "=")
			{
				bufferLength--;
			}
		}

		var arraybuffer = new ArrayBuffer( bufferLength ),
		bytes = new Uint8Array( arraybuffer );

		for ( i = 0; i < len; i += 4 )
		{
			encoded1 = lookup[str.charCodeAt(i)];
			encoded2 = lookup[str.charCodeAt(i+1)];
			encoded3 = lookup[str.charCodeAt(i+2)];
			encoded4 = lookup[str.charCodeAt(i+3)];

			bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
			bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
			bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
		}
		return arraybuffer;
	}
	convertArrayBufferToString( arrayBuffer )
	{
		var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var bytes = new Uint8Array( arrayBuffer ), i, len = bytes.length, base64 = "";

		for (i = 0; i < len; i+=3)
		{
			base64 += chars[bytes[i] >> 2];
			base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
			base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
			base64 += chars[bytes[i + 2] & 63];
		}

		if ((len % 3) === 2)
		{
			base64 = base64.substring(0, base64.length - 1) + "=";
		}
		else if (len % 3 === 1)
		{
			base64 = base64.substring(0, base64.length - 2) + "==";
		}
		return base64;
	};
		async loadIfExist( path, options )
	{
		var answer = await this.awi.system.exists( path );
		if ( answer.success )
		{
			if ( options.encoding == 'utf8' )
			{
				try
				{
					return await this.awi.system.readFile( path, { encoding: 'utf8' } );
				}
				catch( err )
				{
					return { success: false, data: null };
				}
			}
			else if ( options.encoding == 'arraybuffer' )
			{
				try
				{
					return await this.awi.system.readFile( path );
				}
				catch( err )
				{
					return { success: false, data: null };
				}
			}
		}
		return { success: false, data: null };
	}

	async loadFile( path, options )
	{
		return await this.loadIfExist( path, options );
	}

	getFilenameAndExtension( path )
	{
		return this.basename( this.normalize( path ) );
	}

	filterFilename( name, wildcards )
	{
		name = name.toLowerCase();
		if ( typeof wildcards == 'string' )
			wildcards = [ wildcards ];

		for ( var w = 0; w < wildcards.length; w++ )
		{
			var wildcard = wildcards[ w ].toLowerCase();

			// Look for *[ and ]*
			var start;
			if ( ( start = wildcard.indexOf( '*[' ) ) >= 0 )
			{
				var end = wildcard.indexOf( ']*', start );
				if ( end >= start )
				{
					start += 2;
					var filter = wildcard.substring( start, end );
					if ( name.indexOf( filter ) >= 0 )
						return true;
					if ( start - 2 == 0 && end + 2 == wildcard.length )
						continue;
					var newFilter = '';
					for ( var f = 0; f < end - start; f++ )
						newFilter += '?';
					wildcard = wildcard.substring( 0, start - 2 ) + newFilter + wildcard.substring( end + 2 );
				}
			}

			name = this.basename( name );
			var pName = 0;
			var pWild = 0;
			var afterDot = false;
			var bad = false;
			do
			{
				var cName = name.charAt( pName );
				var cWild = wildcard.charAt( pWild );
				switch ( cWild )
				{
					case '*':
						if ( afterDot )
							return true;
						pName = name.lastIndexOf( '.' );
						pWild = wildcard.indexOf( '.' );
						if ( pName < 0 && pWild < 0 )
							return true;
						afterDot = true;
						break;
					case '.':
						afterDot = true;
						if ( cName != '.' )
							bad = true;
						break;
					case '?':
						break;
					default:
						if ( cName != cWild )
							bad = true;
						break;
				}
				pName++;
				pWild++;
			} while( !bad && pName < name.length && pName < name.length )
			if( !bad && pWild < wildcard.length )
				bad = true;
			if ( !bad )
				return true;
		}
		return false;
	}

	async getFileInfo( path )
	{
		var result = undefined;
		var stats = await this.statsIfExists( path );
		if ( stats.data )
		{
			stats = stats.data;
			if ( stats.isDirectory() )
			{
				result =
				{
					name: this.getFilenameAndExtension( path ),
					path: path,
					isDirectory: true,
					size: 0,
					stats: stats
				};
			}
			else
			{
				result =
				{
					name: this.getFilenameAndExtension( path ),
					path: path,
					isDirectory: false,
					size: stats.size,
					stats: stats
				};
			}
		}
		return result;
	}
	async deleteDirectory( destinationPath, options, tree, count )
	{
		try
		{
			if ( !tree )
			{
				var answer = await this.awi.system.exists( destinationPath );
				if ( answer.success )
				{
					tree = await this.awi.system.getDirectory( destinationPath, options );
					tree = tree.data;
					if ( !tree )
						return;
				}
				count = 0;
			}
			for ( var f in tree )
			{
				var file = tree[ f ];
				if ( !file.isDirectory )
					await this.awi.system.unlink( file.path );
				else
				{
					if ( options.recursive )
					{
						count++;
						this.deleteDirectory( file.path, options, file.files, count );
						count--;
					}
				}
			}
			if ( count > 0 || !options.keepRoot )
				await this.awi.system.rmdir( destinationPath );
			return true;
		}
		catch( error )
		{
		}
		return false;
	}
	getFilesFromTree( tree, result )
	{
		if ( !result )
			result = {};
		for ( var d = 0; d < tree.length; d++ )
		{
			var entry = tree[ d ];
			if ( !entry.isDirectory )
			{
				result[ '"' + entry.path + '"' ] = entry;
			}
			else if ( entry.files )
			{
				this.getFilesFromTree( entry.files, result );
			}
		}
		return result;
	}
	async statsIfExists( path )
	{
		var answer = await this.awi.system.exists( path );
		if ( answer.success )
			return await this.awi.system.stat( path );
		return { success: false, data: null };
	}
	getDirectoryArrayFromTree( tree, options )
	{
		var result = [];
		this.getDirArrayFromTree( tree, result );

		if ( options.sort )
		{
			result.sort( function( a, b )
			{
				if ( a.path == b.path )
					return 0;
				if ( a.path.indexOf( b.path ) == 0 )
					return a.path.length < b.path.length ? -1 : 1;
				if ( b.path.indexOf( a.path ) == 0 )
					return b.path.length < a.path.length ? -1 : 1;
				return 0;
			} );
		}
		return result;
	}
	getDirArrayFromTree( tree, result )
	{
		tree = typeof tree == 'undefined' ? [] : tree;
		result = typeof result == 'undefined' ? [] : result;
		for ( var d = 0; d < tree.length; d++ )
		{
			var entry = tree[ d ];
			if ( entry.isDirectory )
			{
				result.push( entry );
				if ( entry.files )
					this.getDirArrayFromTree( entry.files, result );
			}
		}
		return result;
	}
	getFileArrayFromTree( tree, result )
	{
		tree = typeof tree == 'undefined' ? [] : tree;
		result = typeof result == 'undefined' ? [] : result;
		for ( var d = 0; d < tree.length; d++ )
		{
			var entry = tree[ d ];
			if ( !entry.isDirectory )
			{
				result.push( entry );
			}
			else if ( entry.files )
			{
				this.getFileArrayFromTree( entry.files, result );
			}
		}
		return result;
	}
	checkUndefined( value, defaultValue )
	{
		if ( typeof value == 'undefined' )
			value = defaultValue;
		return value;
	}
	toBin( number, digits )
	{
		var result = Math.floor( number ).toString( 2 );
		for ( var l = result.length; l < digits; l++ )
			result = '0' + result;
		return result;
	}
	toHex( number, digits )
	{
		var result = Math.floor( number ).toString( 16 );
		for ( var l = result.length; l < digits; l++ )
			result = '0' + result;
		return result;
	}
	copyData( destination, source, options = {} )
	{
		if ( !options.recursive )
		{
			for ( var d in source )
				destination[ d ] = source[ d ];
			return destination;
		}
		for ( var d in source )
		{
			var prop = source[ d ];
			if ( this.isObject( prop ) )
				destination[ d ] = this.copyData( {}, prop );
			else if ( this.isArray( prop ) )
				destination[ d ] = this.copyArray( prop );
			else
				destination[ d ] = prop;
		}
		return destination;
	}
	async loadHJSON( path )
	{
		path = this.normalize( path );
		try
		{
			var answer = await this.loadFile( path, { encoding: 'utf8' } );
			if ( !answer.success )
				return answer;
			return this.awi.system.hJsonParse( answer.data );
		}
		catch( e )
		{
		}
		return { success: false, data: null, error: 'awi:illegal-json:iwa' };
	}
	async saveHJSON( path, data )
	{
		path = this.normalize( path );
		var json = this.awi.system.hJsonStringify( data );
		if ( !json.success )
			return json;
		return await this.awi.system.writeFile( path, json.data, { encoding: 'utf8' } );
	}
	async loadJSON( path )
	{
		path = this.normalize( path );
		try
		{
			var answer = await this.loadFile( path, { encoding: 'utf8' } );
			if ( answer.success )
				return { success: true, data: JSON.parse( answer.data ) };
			return answer;
		}
		catch( e )
		{
		}
		return { success: false, data: null, error: 'awi:illegal-json:iwa' };
	}
	async saveJSON( path, data )
	{
		path = this.normalize( path );
		var json = JSON.stringify( data );
		return await this.awi.system.writeFile( path, json, { encoding: 'utf8' } );
	}
	justifyText( text, maxWidth )
	{
		var words = text.split( ' ' );
		var lines = [ '' ];
		var count = 0;
		for ( var w = 0; w < words.length; w++ )
		{
			if ( lines[ count ].length >= maxWidth )
			{
				lines[ count ] = lines[ count ].trim();
				lines.push( '' );
				count++;
			}
			lines[ count ] += words[ w ] + ' ';
		}
		return lines;
	}
	removeBasePath( path, directories )
	{
		path = this.normalize( path );
		for ( var d = 0; d < directories.length; d++ )
		{
			var startPath = this.normalize( directories[ d ] );
			if ( path.indexOf( startPath ) == 0 )
			{
				path = path.substring( startPath.length + 1 );
				break;
			}
		}
		return path;
	}
	extractString( line, start )
	{
		var end, endCut;
		var quote = line.charAt( start );
		if ( quote == '"' || quote == "'" )
		{
			start++;
			endCut = start;
			while ( line.charAt( endCut ) != quote && endCut < line.length )
				endCut++;
			end = Math.min( line.length, endCut + 1 )
		}
		else
		{
			endCut = line.indexOf( ' ', start );
			if ( endCut < 0 )
				endCut = line.length;
			end = endCut;
		}
		return { text: line.substring( start, endCut ), end: end };
	}
	extractLineParameters( line, parameters )
	{
		var data = { command: '' };
		for ( var p = 0; p < parameters.length; p++ )
		{
			var parameter = parameters[ p ];
			var start = line.indexOf( '-' + parameter.name + ':' );
			if ( start >= 0 )
			{
				var info = this.extractString( line, start + parameter.name.length + 2 );
				line = line.substring( 0, start ) + line.substring( info.end );
				if ( parameter.type == 'number' )
					data[ parameter.name ] = parseInt( info.text );
				else
					data[ parameter.name ] = info.text;
			}
		}
		data.command = line.trim();
		return data;
	}
	extractLinks( line, position )
	{
		var result = { videos: [], images: [], photos: [], links: [], audios: [], found: false }
		var start;
		if ( ( start = line.indexOf( '<a ', position ) ) >= 0 )
		{
			var end = line.indexOf( '>' );
			if ( end >= 0 )
			{
				var pos = line.indexOf( 'href=', start );
				result.links.push( this.extractString( line, pos ) );
				result.found = true;
				line = line.substring( 0, start ) + line.substring( end + 1 );
			}
		}
		if ( ( start = line.indexOf( '<video ', position ) ) >= 0 )
		{
			var end = line.indexOf( '>' );
			if ( end >= 0 )
			{
				var pos = line.indexOf( 'src=', start );
				result.videos.push( this.extractString( line, pos ) );
				result.found = true;
				line = line.substring( 0, start ) + line.substring( end + 1 );
			}
		}
		if ( ( start = line.indexOf( '<audio ', position ) ) >= 0 )
		{
			var end = line.indexOf( '>' );
			if ( end >= 0 )
			{
				var pos = line.indexOf( 'src=', start );
				result.audios.push( this.extractString( line, pos ) );
				result.found = true;
				line = line.substring( 0, start ) + line.substring( end + 1 );
			}
		}
		if ( ( start = line.indexOf( '<img ', position ) ) >= 0 )
		{
			var end = line.indexOf( '>' );
			if ( end >= 0 )
			{
				var pos = line.indexOf( 'src=', start );
				result.images.push( this.extractString( line, pos ) );
				result.found = true;
				line = line.substring( 0, start ) + line.substring( end + 1 );
			}
		}
		if ( ( start = line.indexOf( '<', position ) ) >= 0 )
		{
			var end = line.indexOf( '>' );
			if ( end >= 0 )
			{
				var pos = line.indexOf( 'src=', start );
				result.images.push( this.extractString( line, pos ) );
				result.found = true;
				line = line.substring( 0, start ) + line.substring( end + 1 );
			}
		}
		result.line = line;
		return result;
	}
	cleanLinks( line )
	{
		var start = line.indexOf( '<' );
		while( start >= 0 )
		{
			var end = line.indexOf( '>', start );
			line = line.substring( 0, start ) + line.substring( end + 1 );
			start = line.indexOf( '<' );
		}
		return line.trim();
	}
	getFinalHtmlData( structure )
	{
		function getIt( parent, pile )
		{
			for ( var s = 0; s < parent.length; s++ )
			{
				var struct = parent[ s ];
				if ( struct.children.length == 0 )
				{
					pile.push( struct.text );
				}
				else
				{
					pile.push( ...getIt( struct.children, [] ) )
				}
			}
			return pile;
		}
		return getIt( structure, [] );
	}
	explodeHtml( name, html, options )
	{
		function explode( name, html, options, pile )
		{
			var start = 0;
			var end = start;
			do
			{
				var startText;
				var start1 = html.indexOf( '<' + name + ' ', end );
				var start2 =  html.indexOf( '<' + name + '>', end );
				start1 = ( start1 < 0 ? html.length : start1 );
				start2 = ( start2 < 0 ? html.length : start2 );
				if ( start1 >= html.length && start2 >= html.length )
					break;

				if ( start1 < start2 )
					startText = html.indexOf( '>', start1 + 1 ) + 1;
				else
					startText = start2 + name.length + 2;
				start = Math.min( start1, start2 );

				var count = 1;
				end = startText;
				do
				{
					var next1 = html.indexOf( '<' + name + ' ', end );
					var next2 = html.indexOf( '<' + name + '>', end );
					var next3 = html.indexOf( '</' + name + '>', end );
					if ( next1 >= 0 )
						next1 = html.indexOf( '>', next1 );
					next1 = ( next1 < 0 ? html.length : next1 );
					next2 = ( next2 < 0 ? html.length : next2 );
					next3 = ( next3 < 0 ? html.length : next3 );
					var next = Math.min( next1, Math.min( next2, next3 ) );
					if ( next == html.length )
						return null;
					if ( next == next3 )
					{
						count--;
						if ( count == 0 )
						{
							end = next3;
							break;
						}
					}
					else
					{
						count++;
					}
					end = next + 1;
				} while( true );
				if ( end > start )
				{
					var data =
					{
						type: name,
						start: start,
						end: end + name.length + 3,
						startText: startText,
						endText: end,
						children: []
					};
					data.text = html.substring( data.startText, data.endText );
					if ( data.text != '' )
					{
						pile.push( data );
						if ( options.recursive )
							data.children = explode( name, data.text, options, [] );
					}
					end = data.end;
				}
			} while( true )
			return pile;
		}
		var structure = explode( name, html, options, [] );
		return structure;
	}
	getBubbleParams( props )
	{
		if ( typeof props.parameters != 'undefined' )
			return props.parameters[ 0 ];

		var param = {};
		for ( var p in props )
		{
			if ( p == 'type' || p == 'interval' || p == 'default' || p == 'optional' || p == 'clear' || p == 'choices' )
				param[ p ] = props[ p ];
			else
			{
				if ( param[ 'name' ] )
					return null;
				param[ 'name' ] = p;
				param[ 'description' ] = props[ p ];
			}
		}
		return param
	}
	removeDuplicatesFromFiles( sourceFiles )
	{
		var newArray = [];
		for ( var s = 0; s < sourceFiles.length; s++ )
		{
			var file = sourceFiles[ s ];
			var found = newArray.find(
				function( element )
				{
					return file.name == element.name;
				} );
			if ( !found )
				newArray.push( file )
		}
		return newArray;
	}
	getControlParameters( control, variables )
	{
		var parameters = {};
		for ( var p in variables )
		{
			if ( typeof control[ p ] != 'undefined' )
			{
				parameters[ p ] = control[ p ];
				control[ p ] = undefined;
			}
			else
				parameters[ p ] = variables[ p ];
		}
		return parameters;
	}
	format( prompt, args )
	{
		do
		{
			var done = false;
			var start = prompt.lastIndexOf( '{' );
			while( start >= 0 )
			{
				var end = prompt.indexOf( '}', start );
				if ( end >= start )
				{
					var key = prompt.substring( start + 1, end );
					if ( args[ key ] )
					{
						prompt = prompt.substring( 0, start ) + args[ key ] + prompt.substring( end + 1 );
						done = true;
					}
					else
						prompt = prompt.substring( 0, start ) + prompt.substring( end + 1 );
				}
				start = prompt.lastIndexOf( '{', start - 1 );
			}
		} while( done )
		return prompt;
	}
	getUniqueIdentifier( toCheck = {}, root = '', count = 0, timeString = '', nNumbers = 3, nLetters = 3 )
	{
		var id;
		do
		{
			id = root + ( root ? '_' : '' ) + count;
			if ( timeString )
			{
				var currentdate = new Date();
				var time = this.format( timeString,
				{
					day: currentdate.getDate(),
					month: currentdate.getMonth(),
					year:  currentdate.getFullYear(),
					hour:  currentdate.getHours(),
					minute:  currentdate.getMinutes(),
					second: currentdate.getSeconds(),
					milli: currentdate.getMilliseconds(),
				} );
				if ( time )
					id += '_' + time;
			}
			var numbers = '';
			for ( var n = 0; n < nNumbers; n++ )
				numbers += String.fromCharCode( 48 + Math.floor( Math.random() * 10 ) );
			id += '_' + numbers;
			var letters = '';
			for ( var n = 0; n < nLetters; n++ )
				letters += String.fromCharCode( 65 + Math.floor( Math.random() * 26 ) );
			id += letters;
		} while( toCheck[ id ] );
		return id;
	}
	matchRegex( text, regex )
	{
		if ( !this.isArray( regex ) )
			regex = [ regex ];
		for ( var r = 0; r < regex.length; r++ )
		{
			var matches = text.match( regex[ r ] );
			if ( matches )
				return matches;
		}
		return null;
	}
	fillString( text, chr, len, position = 'start' )
	{
		if ( position == 'start' )
		{
			while( text.length < len )
				text = chr + text;
		}
		else if ( position == 'end' )
		{
			while( text.length < len )
				text += chr;
		}
		else
		{
			position = Math.min( Math.max( position, 0 ), text.length );
			while( text.length < len )
				text = text.substring( 0, position ) + chr + text.substring( position );
		}
		return text;
	}
	getNumericValue( text )
	{
		var numbers = [ 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
						'ten', 'eleven', 'twelve', 'forteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
						'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine',
						'thirty', 'thirty-one', 'thirty-two', 'thirty-three', 'thirty-four', 'thirty-five', 'thirty-six', 'thirty-seven', 'thirty-eight', 'thirty-nine',
						'fourty', 'fourty-one', 'fourty-two', 'fourty-three', 'fourty-four', 'fourty-five', 'fourty-six', 'fourty-seven', 'fourty-eight', 'fourty-nine',
						'fifty', 'fifty-one', 'fifty-two', 'fifty-three', 'fifty-four', 'fifty-five', 'fifty-six', 'fifty-seven', 'fifty-eight', 'fifty-nine',
						'sixty', 'sixty-one', 'sixty-two', 'sixty-three', 'sixty-four', 'sixty-five', 'sixty-six', 'sixty-seven', 'sixty-eight', 'sixty-nine',
						'seventy', 'seventy-one', 'seventy-two', 'seventy-three', 'seventy-four', 'seventy-five', 'seventy-six', 'seventy-seven', 'seventy-eight', 'seventy-nine',
						'eighty', 'eighty-one', 'eighty-two', 'eighty-three', 'eighty-four', 'eighty-five', 'eighty-six', 'eighty-seven', 'eighty-eight', 'eighty-nine',
						'ninety', 'ninety-one', 'ninety-two', 'ninety-three', 'ninety-four', 'ninety-five', 'ninety-six', 'ninety-seven', 'ninety-eight', 'ninety-nine',
						]
		text = text.trim().toLowerCase().split( ' ' ).join( '-' );
		if ( this.getCharacterType( text.charAt( 0 ) ) == 'number' )
		{
			var value = parseInt( text );
			if ( !isNaN( value ) )
				return value;
			return -1;
		}
		var index = numbers.findIndex(
			function( element )
			{
				return element == text;
			}
		)
		return index;
	}
	isFilter( name )
	{
		for ( var c = 0; c < name.length; c++ )
		{
			if ( info.name.charAt( c ) == '*' || info.name.charAt( c ) == '?' )
				return true;
		}
		return false;
	}
	normalize( path )
	{
		var pos = path.indexOf( '\\', pos + 1 );
		while( pos >= 0 )
		{
			path = path.substring( 0, pos ) + '/' + path.substring( pos + 1 );
			pos = path.indexOf( '\\', pos + 1 );
		}
		return path;
	}
	basename( path )
	{
		path = this.normalize( path );
		var slash = path.lastIndexOf( '/' );
		if ( slash >= 0 )
			return path.substring( slash + 1 );
		return path;
	}
	extname( path )
	{
		path = this.normalize( path );
		var dot = path.lastIndexOf( '.' );
		if ( dot >= 0 )
			return path.substring( dot );
		return '';
	}
	dirname( path )
	{
		path = this.normalize( path );
		var slash = path.lastIndexOf( '/' );
		if ( slash >= 0 )
			return path.substring( 0, slash );
		return '';
	}
	parse( path )
	{
		var result =
		{
			root: '',
			dir: '',
			base: '',
			ext: '',
			name: ''
		}
		path = this.normalize( path );
		var column = path.indexOf( ':' );
		var lastSlash = path.lastIndexOf( '/' );
		var lastDot = path.lastIndexOf( '.' );
		if ( path.charAt( 0 ) == '/' )
		{
			result.root = '/';
			result.dir = path.substring( 0, lastSlash );
			result.base = path.substring( lastSlash );
			if ( lastDot >= 0 )
			{
				result.ext = path.substring( lastDot );
				result.name = path.substring( lastSlash + 1, lastDot );
			}
			else
			{
				result.name = path.substring( lastSlash + 1 );
			}
		}
		else
		{
			if ( column >= 0 )
				result.root = path.substring( 0, column + 1 );
			if ( lastSlash >= 0 )
			{
				result.dir = path.substring( 0, lastSlash );
				result.base = path.substring( lastSlash + 1 );
			}
			else
			{
				result.base = path;
			}
			if ( lastDot >= 0 )
			{
				result.ext = path.substring( lastDot );
				if ( lastSlash >= 0 )
					result.name = path.substring( lastSlash + 1, lastDot )
				else
					result.name = path.substring( 0, lastDot )
			}
			if ( result.name == '' && result.ext == '' )
			{
				result.name = result.base;
				//result.dir += '/' + result.base;
				//result.base = '';
			}
		}
		return result;
	}
	removeDuplicatedLines( text )
	{
		var lines = text.split( '\n' );
		for ( var l1 = 0; l1 < lines.length; l1++ )
		{
			var l3 = l1 + 1;
			var line1 = lines[ l1 ];
			for ( var l2 = l3; l2 < lines.length; l2++ )
			{
				if ( lines[ l2 ].length > 0 && lines[ l2 ] != line1 )
					lines[ l3++ ] = lines[ l2 ];
			}
			lines.length = l3;
		}
		return lines.join( '\n' );
	}
	isLowerCase( c )
	{
		return c >= 'a' && c <= 'z';
	}
	isUpperCase( c )
	{
		return c >= 'A' && c <= 'Z';
	}
	getMimeType( path, type )
	{
		var ext = this.extname( path ).toLowerCase();
		if ( ext == '.mp4' || ext == '.ogg' )
			type = ( typeof type == 'undefined' ? 'audio' : type );
		switch ( ext )
		{
			case '.png':
				return 'image/png';
			case '.jpg':
			case '.jpeg':
				return 'image/jpeg';
			case '.tiff':
				return 'image/tiff';
			case '.gif':
				return 'image/gif';
			case '.webp':
				return 'image/webp';
			case '.bmp':
				return 'image/bmp';

			case '.pdf':
				return 'application/pdf';
			case '.gzip':
				return 'application/gzip';
			case '.zip':
				return 'application/zip';
			case '.json':
				return 'application/json';
			case '.sql':
				return 'application/sql';
			case '.':
				return 'application/rtf';

			case '.3mf':
				return 'model/3mf';
			case '.mesh':
				return 'model/mesh';
			case '.obj':
				return 'model/obj';
			case '.stl':
				return 'model/stl';
			case '.vrml':
				return 'model/vrml';
			case '.rtf':
				return 'text/rtf';

			case '.mp4':
				return type + '/mp4';
			case '.ogg':
				return type + '/ogg';
			case '.mpeg':
				return 'video/mpeg';

			case '.aac':
				return 'audio/aac';
			case '.wav':
				return 'audio/wav';
			case '.mp3':
				return 'audio/mp3';

			case '.js':
				return 'text/jaavscript';
			case '.html':
				return 'text/html';
			case '.md':
				return 'text/markdown';
			case '.txt':
				return 'text/plain';
			case '.xml':
				return 'text/xml';

			default:
				return
		}
	}
	serializeIn( map, root )
	{
		var self = this;
		var lastBranch = 'root';
		function createObjects( o, map )
		{
			if ( o.oClass )
			{
				// create the object
				var oo;
				if ( o.oClass != 'prompt' )
				{
					oo = new self.awi[ o.data.parentClass ][ o.data.classname ][ o.data.token ]( self.awi, { key: o.data.key, branch: lastBranch, parent: o.data.parent, exits: o.data.exits, parameters: o.data.parameters } );
					if ( o.data.parentClass == 'newMemories' )
						lastBranch = oo;
				}
				else
				{
					oo = self.awi.prompt;
					lastBranch = oo;
				}
				switch ( o.oClass )
				{
					case 'bubble':
						break;
					case 'branch':
						break;
					case 'memory':
						oo.currentBubble = o.data.currentBubble;
						oo.parameters = o.data.parameters;
						oo.properties.exits = o.data.exits;
						oo.parent = o.data.parent;
						for ( var p in o.data.bubbleMap )
						{
							oo.bubbleMap[ p ] = createObjects( o.data.bubbleMap[ p ], {} );
						}
						break;
					case 'souvenir':
						oo.parameters = o.data.parameters;
						oo.options = o.data.options;
						oo.parent = o.data.parent;
						oo.properties.exits = o.data.exits;
						break;
					case 'prompt':
						oo.currentBubble = o.data.currentBubble;
						oo.parameters = o.data.parameters;
						oo.datas = o.data.datas;
						oo.options = o.data.options;
						oo.properties.exits = o.data.exits;
						oo.parent = o.data.parent;
						oo.options = o.data.options;
						for ( var p in o.data.bubbleMap )
							oo.bubbleMap[ p ] = createObjects( o.data.bubbleMap[ p ], {} );
						oo.pathway = o.data.pathway;
						oo.keyCount = o.data.keyCount;
						oo.questionCount = o.data.questionCount;
						oo.properties.exits = o.data.exits;
						oo.firstRun = false;
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
		return createObjects( map, root );
	}
	serializeOut( root )
	{
		var self = this;
		var count = 0;
		function isAwi( o )
		{
			return typeof o.token != 'undefined';
		}
		function toJSON( data )
		{
			var json;
			try
			{
				json = JSON.stringify( data );
			}
			catch( e )
			{}
			if ( json )
				return json;
			return '""';
		}
		function savePrompt( o )
		{
			var map = '';
			map += '\t'.repeat( count ) + 'classname:"' + o.classname + '",\n';
			map += '\t'.repeat( count ) + 'currentBubble:"' + ( typeof o.currentBubble != 'undefined' ? ( typeof o.currentBubble == 'string' ? o.currentBubble : o.currentBubble.key ) : '' ) + '",\n';
			map += '\t'.repeat( count ) + 'key:"' + o.key + '",\n';
			map += '\t'.repeat( count ) + 'token:"' + o.token + '",\n';
			map += '\t'.repeat( count ) + 'options:' + toJSON( o.options ) + ',\n';
			map += '\t'.repeat( count ) + 'parameters:' + toJSON( o.parameters ) + ',\n';
			map += '\t'.repeat( count ) + 'datas:' + toJSON( o.datas ) + ',\n';
			map += '\t'.repeat( count ) + 'options:' + toJSON( o.options ) + ',\n';
			map += '\t'.repeat( count ) + 'pathway:"' + o.pathway + '",\n';
			map += '\t'.repeat( count ) + 'pathways:' + toJSON( o.pathways ) + ',\n';
			map += '\t'.repeat( count ) + 'keyCount:' + o.keyCount + ',\n';
			map += '\t'.repeat( count ) + 'questionCount:' + o.questionCount + ',\n';
			map += '\t'.repeat( count ) + 'parent:"' + ( self.isObject( o.parent ) ? o.parent.key : ( typeof o.parent == 'undefined' ? '' : o.parent ) ) + '",\n';
			map += '\t'.repeat( count ) + 'previous:"' + ( self.isObject( o.previous ) ? o.previous.key : ( typeof o.previous == 'undefined' ? '' : o.previous ) ) + '",\n';
			map += '\t'.repeat( count ) + 'exits:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.properties.exits )
				map += '\t'.repeat( count + 1 ) + p + ':"' + o.properties.exits[ p ] + '",\n';
			map += '\t'.repeat( count ) + '},\n';
			map += '\t'.repeat( count ) + 'bubbleMap:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.bubbleMap )
			{
				var oo = o.bubbleMap[ p ];
				map += '\t'.repeat( count + 1 ) + p + ':{oClass:"' + oo.oClass + '",data:{\n';
				count += 2;
				map += saveMap[ oo.oClass ]( oo )
				count -= 2;
				map += '\t'.repeat( count + 1 ) + '}},\n';
			}
			map += '\t'.repeat( count ) + '},\n'
			return map;
		}
		function saveMemory( o )
		{
			var map = '';
			map += '\t'.repeat( count ) + 'classname:"' + o.classname + '",\n';
			map += '\t'.repeat( count ) + 'parentClass:"newMemories",\n';
			map += '\t'.repeat( count ) + 'currentBubble:"' + ( typeof o.currentBubble != 'undefined' ? ( typeof o.currentBubble == 'string' ? o.currentBubble : o.currentBubble.key ) : '' ) + '",\n';
			map += '\t'.repeat( count ) + 'key:"' + o.key + '",\n';
			map += '\t'.repeat( count ) + 'token:"' + o.token + '",\n';
			map += '\t'.repeat( count ) + 'options:' + toJSON( o.options ) + ',\n';
			map += '\t'.repeat( count ) + 'parameters:' + toJSON( o.parameters ) + ',\n';
			map += '\t'.repeat( count ) + 'pathway:"' + o.pathway + '",\n';
			map += '\t'.repeat( count ) + 'pathways:' + toJSON( o.pathways ) + ',\n';
			map += '\t'.repeat( count ) + 'parent:"' + ( self.isObject( o.parent ) ? o.parent.key : ( typeof o.parent == 'undefined' ? '' : o.parent ) ) + '",\n';
			map += '\t'.repeat( count ) + 'previous:"' + ( self.isObject( o.previous ) ? o.previous.key : ( typeof o.previous == 'undefined' ? '' : o.previous ) ) + '",\n';
			map += '\t'.repeat( count ) + 'exits:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.properties.exits )
				map += '\t'.repeat( count + 1 ) + p + ':"' + o.properties.exits[ p ] + '",\n';
			map += '\t'.repeat( count ) + '},\n';
			map += '\t'.repeat( count ) + 'bubbleMap:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.bubbleMap )
			{
				var oo = o.bubbleMap[ p ];
				map += '\t'.repeat( count + 1 ) + p + ':{oClass:"' + oo.oClass + '",data:{\n';
				count += 2;
				map += saveMap[ oo.oClass ]( oo );
				count -= 2;
				map += '\t'.repeat( count + 1 ) + '}},\n';
			}
			map += '\t'.repeat( count ) + '},\n'
			return map;
		}
		function saveSouvenir( o )
		{
			var map = '';
			map += '\t'.repeat( count ) + 'classname:"' + o.classname + '",\n';
			map += '\t'.repeat( count ) + 'parentClass:"newSouvenirs",\n';
			map += '\t'.repeat( count ) + 'key:"' + o.key + '",\n';
			map += '\t'.repeat( count ) + 'token:"' + o.token + '",\n';
			map += '\t'.repeat( count ) + 'parameters:' + toJSON( o.parameters ) + ',\n';
			map += '\t'.repeat( count ) + 'options:' + toJSON( o.options ) + ',\n';
			map += '\t'.repeat( count ) + 'parent:"' + ( self.isObject( o.parent ) ? o.parent.key : ( typeof o.parent == 'undefined' ? '' : o.parent ) ) + '",\n';
			map += '\t'.repeat( count ) + 'previous:"' + ( self.isObject( o.previous ) ? o.previous.key : ( typeof o.previous == 'undefined' ? '' : o.previous ) ) + '",\n';
			map += '\t'.repeat( count ) + 'exits:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.properties.exits )
				map += '\t'.repeat( count + 1 ) + p + ':"' + o.properties.exits[ p ] + '",\n';
			map += '\t'.repeat( count ) + '},\n';
			return map;
		}
		function saveBranch( o )
		{
			var map = '';
			return map;
		}
		function saveBubble( o )
		{
			var map = '';
			map += '\t'.repeat( count ) + 'classname:"' + o.classname + '",\n';
			map += '\t'.repeat( count ) + 'parentClass:"newBubbles",\n';
			map += '\t'.repeat( count ) + 'token:"' + o.token + '",\n';
			map += '\t'.repeat( count ) + 'key:"' + o.key + '",\n';
			map += '\t'.repeat( count ) + 'data:' + toJSON( o.data ) + ',\n';
			map += '\t'.repeat( count ) + 'parameters:' + toJSON( o.parameters ) + ',\n';
			map += '\t'.repeat( count ) + 'options:' + toJSON( o.options ) + ',\n';
			map += '\t'.repeat( count ) + 'parent:"' + ( self.isObject( o.parent ) ? o.parent.key : ( typeof o.parent == 'undefined' ? '' : o.parent ) ) + '",\n';
			map += '\t'.repeat( count ) + 'previous:"' + ( self.isObject( o.previous ) ? o.previous.key : ( typeof o.previous == 'undefined' ? '' : o.previous ) ) + '",\n';
			map += '\t'.repeat( count ) + 'exits:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.properties.exits )
				map += '\t'.repeat( count + 1 ) + p + ':"' + o.properties.exits[ p ] + '",\n';
			map += '\t'.repeat( count ) + '},\n';
			return map;
		}
		var saveMap =
		{
			'awi': function( o ) { return '\t'.repeat( count - 1 ) + ':{oClass:"awi","data":{""},\n'; },
			'config': function( o ) { return '\t'.repeat( count - 1 ) + ':{oClass:"config","data":{""},\n'; },
			'bubble': saveBubble,
			'branch': saveBranch,
			'memory': saveMemory,
			'souvenir': saveSouvenir,
			'prompt': savePrompt
		}

		function createMap( o, map )
		{
			count++;
			if ( o.oClass )
			{
				map += '\t'.repeat( count - 1 ) + 'root:{oClass:"' + o.oClass + '",data:{\n';
				map += saveMap[ o.oClass ]( o );
				map += '\t'.repeat( count - 1 ) + '}},\n';
			}
			else
			{
				for ( var p in o )
				{
					var oo = o[ p ];
					if ( self.isObject( oo ) )
					{
						if ( oo.oClass )
						{
							map += '\t'.repeat( count - 1 ) + p + ':{oClass:"' + oo.oClass + '",data:{\n';
							map += saveMap[ oo.oClass ]( oo );
							map += '\t'.repeat( count - 1 ) + '}},\n';
						}
						else
						{
							for ( var pp in oo )
							{
								var ooo = oo[ pp ];
								if ( self.isObject( ooo ) )
								{
									if ( ooo.oClass )
									{
										map += '\t'.repeat( count - 1 ) + pp + ':{oClass:"' + ooo.oClass + '",data:{\n';
										map += saveMap[ ooo.oClass ]( ooo );
										map += '\t'.repeat( count - 1 ) + '}},\n';
									}
								}
							}
						}
					}
				}
			}
			count--;
			return map;
		}
		count++;
		return 'return {\n'+ createMap( root, '' ) + '}\n';
	}
	objectHash( object )
	{
		var hash = module.exports.sha1;
		return hash( object );
	}
	compareTwoStrings( first, second, control = {} )
	{
		if ( control.caseInsensitive )
		{
			first = first.toLowerCase();
			second = second.toLowerCase();
		}
		first = first.replace( /\s+/g, '' );
		second = second.replace( /\s+/g, '' );

		if ( first === second ) return 1; // identical or empty
		if ( first.length < 2 || second.length < 2 ) return 0; // if either is a 0-letter or 1-letter string

		let firstBigrams = new Map();
		for ( let i = 0; i < first.length - 1; i++ )
		{
			const bigram = first.substring( i, i + 2 );
			const count = firstBigrams.has( bigram )
				? firstBigrams.get( bigram ) + 1
				: 1;

			firstBigrams.set( bigram, count );
		};

		let intersectionSize = 0;
		for ( let i = 0; i < second.length - 1; i++ )
		{
			const bigram = second.substring( i, i + 2 );
			const count = firstBigrams.has( bigram )
				? firstBigrams.get( bigram )
				: 0;

			if ( count > 0 )
			{
				firstBigrams.set( bigram, count - 1 );
				intersectionSize++;
			}
		}
		return { result: ( 2.0 * intersectionSize ) / ( first.length + second.length - 2 ) };
	}
	findBestMatch( mainString, targetStrings )
	{
		const ratings = [];
		let bestMatchIndex = 0;
		for ( let i = 0; i < targetStrings.length; i++ )
		{
			const currentTargetString = targetStrings[ i ];
			const currentRating = this.compareTwoStrings( mainString, currentTargetString );
			ratings.push( { target: currentTargetString, rating: currentRating } );
			if ( currentRating > ratings[ bestMatchIndex ].rating )
			{
				bestMatchIndex = i
			}
		}
		return { ratings: ratings, bestMatch: ratings[ bestMatchIndex ], bestMatchIndex: bestMatchIndex };
	}
	matchTwoStrings( string1, string2, options = {} )
	{
		if ( this.isArray( string1 ) )
			string1 = string1.join( ' ' );
		if ( this.isArray( string2 ) )
			string2 = string2.join( ' ' );
		string1 = string1.split( '\n' ).join( ' ' );
		string2 = string2.split( '\n' ).join( ' ' );
		if ( options.caseInsensitive )
		{
			string1 = string1.toLowerCase();
			string2 = string2.toLowerCase();
		}
		var words1 = string1.split( ' ' );
		var words2 = string2.split( ' ' );
		if ( words1.length == 0 )
			return { result: 0, count: 0 };
		var positions = [];
		for ( var w1 = 0; w1 < words1.length; w1++ )
		{
			var word1 = words1[ w1 ];
			for ( var w2 = 0; w2 < words2.length; w2++ )
			{
				var position = word1.indexOf( words2[ w2 ] );
				if ( position >= 0 )
				{
					positions.push( position )
				}
			}
		}
		var count = positions.length;
		return { result: count / words1.length, score: count / words2.length, count: count, positions: positions };
	}
	async loadJavascript( path, options = {} )
	{
		var answer = await this.awi.system.readFile( path, { encoding: 'utf8' } );
		if ( answer.success )
		{
			var source = answer.data;
			answer.data = {};
			try
			{
				if ( !options.eval )
				{
					var f = Function( source + '' );
					f.window = {};
					answer.data.result = f();
				}
				else
				{
					var window = {};
					eval( source + '' );
				}
				answer.data.window = window;
			} catch( e ) {
				answer.success = false;
			}
		}
		return answer;
	}
	removePunctuation( text )
	{
		var result = '';
		for ( var p = 0; p < text.length; p++ )
		{
			var c = text.charAt( p );
			if ( ( c >= 'a' && c <= 'z') || ( c >= 'A' && c <= 'Z' ) || c == ' ' || c == '_' )
				result += c;
		}
		return result;
	}
	isExpression( text )
	{
		var result = false;
		var c = text.charAt( 0 );
		if ( c == '(')
		{
			var count = 1;
			for ( var p = 0; p < text.length; p++ )
			{
				var c = text.charAt( p );
				if ( c == '(' )
					count++;
				else if ( c == ')' )
				{
					count--;
					if ( count == 0 )
						break;
				}
			}
			if ( count == 0 && p + 1 >= text.length )
				return true;
		}
		for ( var p = 0; p < text.length; p++ )
		{
			var c = text.charAt( p );
			if ( c == '+' || c == '-' || c == '*' || c == '/' || c == '(' || c == ')' )
				result = true;
		}
		return result;
	}
	isPath( text )
	{
		var result = false;
		if ( typeof text != 'undefined' )
		{
			for ( var p = 0; p < text.length; p++ )
			{
				var c = text.charAt( p );
				if ( c == '/' || c == '\\' || c == '*' || c == '.' || c == '?' )
					result = true;
			}
			if ( result )
			{
				try
				{
					this.parse( text );
				} catch ( e )
				{
					return false;
				}
			}
		}
		return result;
	}
}
module.exports.Connector = ConnectorUtilityUtilities
},{"../awi-connector":34}],42:[function(require,module,exports){
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
* @file awi-memory.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Memory branch
*
*/
var awibranch = require( '../bubbles/awi-branch' )

class Memory extends awibranch.Branch
{
	constructor( awi, options = {} )
	{
		options.parentClass = 'newMemories';
		options.errorClass = 'newSouvenirs';
		super( awi, options );
		this.parameters.senderName = typeof this.parameters.senderName == 'undefined' ? '' : this.parameters.senderName;
		this.parameters.receiverName = typeof this.parameters.receiverName == 'undefined' ? '' : this.parameters.receiverName;
		this.classname = 'memory';
		this.oClass = 'memory';
		this.bubbleHash = {};
	}
	async play( line, parameters, control, nested )
	{
		return parameters;
	}
	async playback( line, parameter, control )
	{
		return parameters;
	}
	async extractContent( line, parameters, control )
	{
		var content = [];
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		while ( souvenir )
		{
			var answer = await souvenir.extractContent( line, parameters, control );
			if ( answer.success )
				content.push( answer.data );
			souvenir = this.getBubble( souvenir.properties.exits[ 'success' ] );
		}
		if ( content.length )
			return { success: 'found', content: content };
		return { success: 'notfound', content: [] };
	}
	async getContent( line, parameters, control )
	{
		var content = [];
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		while ( souvenir )
		{
			var answer = await souvenir.getContent( line, parameters, control );
			if ( answer.success )
				content.push( answer.data );
			souvenir = this.getBubble( souvenir.properties.exits[ 'success' ] );
		}
		if ( content.length )
			return { success: 'found', content: content };
		return { success: 'notfound', content: [] };
	}
	async findSouvenirs( line, parameters, control )
	{
		var directSouvenirs = [];
		var indirectSouvenirs = [];
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		while( souvenir )
		{
			var info1 = this.awi.utilities.matchTwoStrings( souvenir.parameters.receiverName, line, { caseInsensitive: true } );
			if ( info1.result >= 0.5 )
			{
				if ( parameters.senderName )
				{
					var info2 = this.awi.utilities.matchTwoStrings( souvenir.parameters.senderName, parameters.senderName, { caseInsensitive: true } );
					if ( info2.result == 1 )
						directSouvenirs.push( souvenir );
				}
				else
				{
					directSouvenirs.push( souvenir );
				}
			}
			var answer = await souvenir.findSouvenirs( line, parameters, control );
			if ( answer.success == 'found' )
				indirectSouvenirs.push( souvenir );
			souvenir = this.getBubble( souvenir.properties.exits[ 'success' ] );
		} while ( souvenir );
		var directContent = [];
		var indirectContent = [];
		for ( var s = 0; s < directSouvenirs.length; s++ )
		{
			var answer = await directSouvenirs[ s ].getContent( line, parameters, control );
			directContent.push( answer.data );
		}
		for ( var s = 0; s < indirectSouvenirs.length; s++ )
		{
			var answer = await indirectSouvenirs[ s ].getContent( line, parameters, control );
			indirectContent.push( answer.data );
		}
		if ( directSouvenirs.length > 0 || indirectSouvenirs.length > 0 )
			return {
				success: 'found',
				data: {
					direct: { souvenirs: directSouvenirs, content: directContent },
					indirect: { souvenirs: indirectSouvenirs, content: indirectContent }
				} };
		return { success: 'notfound', data: { direct: {}, indirect: {} } };
	}
	addMemory( memory, control = {} )
	{
		return super.addBubble( memory, control );
	}
	addMemories( memories, parameters = {}, control = {} )
	{
		return super.addBubble( memories, parameters, control );
	}
	addSouvenir( souvenir, control = {} )
	{
		var hash = this.awi.utilities.objectHash( souvenir.parameters );
		if ( !this.bubbleHash[ hash ] )
		{
			this.bubbleHash[ hash ] = souvenir.key;
			return super.addBubble( souvenir, control );
		}
		return '';
	}
	addSouvenirs( commandList, parameters = {}, control = {} )
	{
		return super.addBubble( commandList, parameters, control );
	}
}
module.exports.Memory = Memory;

},{"../bubbles/awi-branch":8}],43:[function(require,module,exports){
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
* @file awi-memory-videos.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Video memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericAudios extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'audios';
		this.classname = 'generic';
		this.name = 'Audio Souvenir Chain';
		this.properties.action = 'stores information about audio files';
		this.properties.inputs = [
			{ userInput: 'what to find in the audio file', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'interval of time when the audio file was recorded', type: 'string', optional: false, default: 'any' },
		];
		this.properties.outputs = [ { audioFiles: 'found audio files', type: 'audioFile.object.array' } ];
		this.properties.tags = [ 'memory', 'audio' ];
	}
	async play( line, parameters, control )
	{
		if ( !parameters.interval )
			parameters.interval = 'any';
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return await super.extractContent( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		var answer = await super.getContent( line, parameters, control );
		if ( answer.success == 'found' )
		{
			this.awi.editor.print( control.editor, 'Audio file: ' + answer.data.audioInfo.path, { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'Recorded on the: ' + answer.data.audioInfo.date, { user: 'memory2' } );
			this.awi.editor.print( control.editor, '', { user: 'memory2' } );
		}
	}
	async findSouvenirs( line, parameters, control )
	{
		var answer = await super.findSouvenirs( line, parameters, control );
		if ( answer.success == 'found' )
		{
			var content = ( typeof answer.data.direct.content[ 0 ] == 'undefined' ? answer.data.indirect.content[ 0 ] : answer.data.direct.content[ 0 ] );
			this.awi.editor.print( control.editor, 'Audio file: ' + content.audioInfo.path, { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'Recorded on the: ' + content.audioInfo.date.text, { user: 'memory2' } );
			this.awi.editor.print( control.editor, '', { user: 'memory2' } );
		}
		return answer;
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericAudios;

},{"../awi-memory":42}],44:[function(require,module,exports){
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
* @file awi-memory-awi-conversations.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Conversations memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericConversations extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'conversations';
		this.classname = 'generic';
		this.name = 'Conversation Souvenir Chain';
		this.properties.action = 'stores a thread of messages with one person';
		this.properties.inputs = [
			{ userInput: 'what to find in the messages', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'when the things were said', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [ { messageInfos: 'found messages', type: 'messageInfo.object.array' } ];
		this.properties.tags = [ 'memory', 'conversation' ];
	}
	async play( line, parameters, control )
	{
		if ( !parameters.interval )
			parameters.interval = 'any';
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return await super.extractContent( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		if ( souvenir )
		{
			this.awi.editor.print( control.editor, 'Conversation between: ' + souvenir.parameters.senderName + ' and ' + souvenir.parameters.receiverName + ',', { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'On the : ' + souvenir.parameters.date + '.', { user: 'memory2' } );
		}
		return await super.getContent( line, parameters, control );
	}
	async findSouvenirs( line, parameters, control )
	{
		return await super.findSouvenirs( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		return await super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericConversations;

},{"../awi-memory":42}],45:[function(require,module,exports){
/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][    ]      Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_] \     link:
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-memory-awi-documents.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Document memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericDocuments extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'documents';
		this.classname = 'generic';
		this.name = 'Document Souvenir Chain';
		this.properties.action = 'stores the content documents';
		this.properties.inputs = [
			{ userInput: 'what to find in the documents', type: 'string' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'when the document was created', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [ { documentInfos: 'list of documents found', type: 'documentInfo.souvenir.array' } ];
		this.properties.tags = [ 'memory', 'document' ];
	}
	async play( line, parameters, control )
	{
		if ( !parameters.interval )
			parameters.interval = 'any';
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return await super.extractContent( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		if ( souvenir )
		{
			this.awi.editor.print( control.editor, 'Document file: ' + souvenir.parameters.path, { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'Creation date: ' + souvenir.parameters.date + '.', { user: 'memory2' } );
		}
		return await super.getContent( line, parameters, control );
	}
	async findSouvenirs( line, parameters, control )
	{
		return await super.findSouvenirs( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		return await super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericDocuments;

},{"../awi-memory":42}],46:[function(require,module,exports){
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
* @file awi-memory-awi-error.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Memory error branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericError extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Memory Error Handling';
		this.token = 'error';
		this.classname = 'generic';
		this.properties.action = "handle Alzheinmer?";
		this.properties.inputs = [ ],
		this.properties.outputs = [ ];
		this.properties.subTopics.push( ...[ 'memory', 'error' ] );
		this.properties.tags = [ 'memory', 'error' ];
	}
	async extractContent( line, parameters, control )
	{
	}
	async getContent( line, parameters, control )
	{
	}
	async findSouvenirs( line, parameters, control )
	{
	}
	async play( line, parameter, control )
	{
	}
	async playback( line, parameter, control )
	{
	}
	async transpile( line, parameter, control )
	{
	}
}
module.exports.Memory = MemoryGenericError;

},{"../awi-memory":42}],47:[function(require,module,exports){
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
* @file awi-memory-awi-images.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Images memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericImages extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'images';
		this.classname = 'generic';
		this.name = 'Images Souvenir Chain';
		this.properties.action = 'stores a list of images';
		this.properties.inputs = [
			{ userInput: 'what to find in the images', type: 'string' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'when the image was created', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [ { imageInfos: 'list of images found', type: 'imageInfo.souvenir.array' } ];
		this.properties.tags = [ 'memory', 'images' ];
	}
	async play( line, parameters, control, nested )
	{
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return await super.extractContent( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		if ( souvenir )
		{
			this.awi.editor.print( control.editor, 'Image file: ' + souvenir.parameters.path, { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'Created on the ' + souvenir.parameters.date, { user: 'memory2' } );
		}
		return await super.getContent( line, parameters, control );
	}
	async findSouvenirs( line, parameters, control )
	{
		return await super.findSouvenirs( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericImages;

},{"../awi-memory":42}],48:[function(require,module,exports){
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
* @file awi-memory-awi-mails.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Mails memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericMails extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'mails';
		this.classname = 'generic';
		this.name = 'Mails Souvenir Chain';
		this.properties.action = 'stores a list of mails';
		this.properties.inputs = [
			{ userInput: 'what to find in the mail', type: 'string' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'when the mail was sent', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [ { mailInfos: 'list of mails found', type: 'mailInfo.object.array' } ];
		this.properties.tags = [ 'memory', 'mails' ];
	}
	async play( line, parameters, control, nested )
	{
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return await super.extractContent( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		if ( souvenir )
		{
			this.awi.editor.print( control.editor, 'Mail between: ' + souvenir.parameters.senderName + ' and ' + souvenir.parameters.receiverName, { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'On the ' + souvenir.parameters.date, { user: 'memory2' } );
		}
		return await super.getContent( line, parameters, control );
	}
	async findSouvenirs( line, parameters, control )
	{
		return await super.findSouvenirs( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericMails;

},{"../awi-memory":42}],49:[function(require,module,exports){
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
* @file awi-memory-awi-messenger.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Messenger memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericMessenger extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'messenger';
		this.classname = 'generic';
		this.name = 'Messages Souvenir Chain';
		this.properties.action = 'stores a thread of messages with one person';
		this.properties.inputs = [
			{ userInput: 'what to find in the messages', type: 'string', optional: false, default: '' },
			{ from: 'what kind of content to remember', type: 'string', optional: true, default: 'any' },
			{ interval: 'interval of time when the message was written', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [ { messageInfos: 'list of messages found', type: 'messageInfo.object.array' } ];
		this.properties.tags = [ 'memory', 'messages' ];
	}
	async play( line, parameters, control, nested )
	{
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return await super.extractContent( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		if ( souvenir )
		{
			this.awi.editor.print( control.editor, 'Conversation between ' + souvenir.parameters.senderName + ' and ' + souvenir.parameters.receiverName + ',', { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'On the ' + souvenir.parameters.date, { user: 'memory2' } );
		}
		return await super.getContent( line, parameters, control );
	}
	async findSouvenirs( line, parameters, control )
	{
		return await super.findSouvenirs( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericMessenger;

},{"../awi-memory":42}],50:[function(require,module,exports){
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
* @file awi-memory-awi-photos.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Photo memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericPhotos extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'photos';
		this.classname = 'generic';
		this.name = 'Photos Souvenir Chain';
		this.properties.action = 'stores a list of photos';
		this.properties.inputs = [
			{ userInput: 'what to find in the photos', type: 'string', optional: false, default: '' },
			{ from: 'what kind of content to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'interval of time when the photo was taken', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [ { photoInfos: 'the photos found', type: 'photoInfo.object.array' } ];
		this.properties.tags = [ 'memory', 'photos' ];
	}
	async play( line, parameters, control )
	{
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return await super.extractContent( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		if ( souvenir )
		{
			this.awi.editor.print( control.editor, 'Photo file: ' + souvenir.parameters.path, { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'Taken on the ' + souvenir.parameters.date, { user: 'memory2' } );
		}
		return await super.getContent( line, parameters, control );
	}
	async findSouvenirs( line, parameters, control )
	{
		return await super.findSouvenirs( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		return await super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericPhotos;

},{"../awi-memory":42}],51:[function(require,module,exports){
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
* @file awi-memory-awi-videos.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Video memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericVideos extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'videos';
		this.classname = 'generic';
		this.name = 'Videos Souvenir Chain';
		this.properties.action = 'stores information about one videos';
		this.properties.inputs = [
			{ userInput: 'what to find in the video', type: 'string', optional: false, default: '' },
			{ type: 'what type of content to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'interval of time when the video was taken', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [	{ videoInfos: 'the list of videos found', type: 'videoInfo.object.array' } ];
		this.properties.tags = [ 'memory', 'videos' ];
	}
	async play( line, parameters, control, nested )
	{
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return await super.extractContent( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		var answer = await super.getContent( line, parameters, control );
		if ( answer.success == 'found' )
		{
			this.awi.editor.print( control.editor, 'Video file: ' + answer.data.audioInfo.path, { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'Recorded on the: ' + answer.data.audioInfo.date, { user: 'memory2' } );
			this.awi.editor.print( control.editor, '', { user: 'memory2' } );
		}
	}
	async findSouvenirs( line, parameters, control )
	{
		var answer = await super.findSouvenirs( line, parameters, control );
		if ( answer.success == 'found' )
		{
			var content = ( typeof answer.data.direct.content[ 0 ] == 'undefined' ? answer.data.indirect.content[ 0 ] : answer.data.direct.content[ 0 ] );
			this.awi.editor.print( control.editor, 'Video file: ' + content.videoInfo.path, { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'Recorded on the: ' + content.videoInfo.date.text, { user: 'memory2' } );
			this.awi.editor.print( control.editor, '', { user: 'memory2' } );
		}
		return answer;
	}
	async playback( line, parameter, control )
	{
		return await super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericVideos;

},{"../awi-memory":42}],52:[function(require,module,exports){
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
* @file awi-souvenir.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Souvenir bubbles: stores and recall informations
*
*/
var awibubble = require( '../bubbles/awi-bubble' )

class Souvenir extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.parameters.senderName = typeof this.parameters.senderName == 'undefined' ? '' : this.parameters.senderName;
		this.parameters.receiverName = typeof this.parameters.receiverName == 'undefined' ? '' : this.parameters.receiverName;
		this.classname = 'souvenir';
		this.oClass = 'souvenir';
		this.properties.topic = '';
		this.properties.subTopics = [];
		this.properties.interval = { start: 0, end : 0 };
	}
	async extractContent( line, parameters, control )
	{
	}
	async getContent( line, parameters, control )
	{
	}
	async findSouvenirs( line, parameters, control )
	{
	}
	async play( line, parameter, control )
	{
		super.play( line, parameter, control );
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
	async transpile( line, parameter, control )
	{
		super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = Souvenir;

},{"../bubbles/awi-bubble":9}],53:[function(require,module,exports){
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
* @file awi-souvenir-awi-audio.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Audio souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericAudio extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Audio Souvenir Bubble';
		this.token = 'audio';
		this.classname = 'generic';
		this.properties.action = "remembers one audio file and it's content";
		this.properties.inputs = [
			{ userInput: 'what to find in the audio', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to look for', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { audioInfo: 'information about the audio file', type: 'object.audioInfo' } ];
		this.properties.tags = [ 'souvenir', 'audio' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( control.editor, 'Text: ' + this.parameters.text, { user: 'memory3' } );
		this.awi.editor.print( control.editor, 'Start: ' + this.parameters.start.text + ', end: ' + this.parameters.end.text, { user: 'memory3' } );
		this.awi.editor.print( control.editor, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {	audioInfo: this.parameters }
		};
	}
	async extractContent( line, parameters, control )
	{
		var info = this.awi.utilities.compareTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
		{
			var content = await this.getContent( line, parameters, control );
			return { success: 'found', data: { result: info.result, match: info, content: content.data.audioInfo } };
		}
		return { success: 'notfound' };
	}
	async findSouvenirs( line, parameters, control )
	{
		var info = this.awi.utilities.matchTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
			return await this.getContent( line, parameters, control );
		return { success: 'notfound' };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericAudio;

},{"../awi-souvenir":52}],54:[function(require,module,exports){
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
* @file awi-souvenir-awi-document.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Document souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericDocument extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Document Souvenir Bubble';
		this.token = 'document';
		this.classname = 'generic';
		this.properties.action = "remembers one document file and it's content";
		this.properties.inputs = [
			{ userInput: 'what to find in the document', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to look for', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { documentInfo: 'what was found', type: 'object.documentInfo' } ];
		this.properties.tags = [ 'souvenir', 'document' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		var info = this.awi.utilities.compareTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
			return await this.getContent( line, parameters, control );
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( control.editor, this.parameters.text, { user: 'memory3' } );
		this.awi.editor.print( control.editor, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {
				documentInfo: {
					receiverName: this.parameters.receiverName,
					path: path,
					text: text,
					date: this.awi.utilities.getTimestampFromStats( stats )
				} } };
	}
	async findSouvenirs( line, parameters, control )
	{
		var info = this.awi.utilities.matchTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
		{
			var content = await this.getContent( line, parameters, control );
			return { success: 'found', data: { result: info.result, match: info, content: content.data.documentInfo } };
		}
		return { success: 'notfound' };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericDocument;

},{"../awi-souvenir":52}],55:[function(require,module,exports){
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
* @file awi-souvenir-awi-error.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Souvenir error bubble
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericError extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Souvenir Error Handling';
		this.token = 'error';
		this.classname = 'generic';
		this.properties.action = "handle errors in souvenir chains";
		this.properties.inputs = [
			{ userInput: 'what the user wanted to find', type: 'string', optional: true },
			{ from: 'the kind+ of things he was looking for', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { errorInfo: 'what to do next', type: 'object.errorInfo' } ];
		this.properties.tags = [ 'souvenir', 'error' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( control.editor, 'Error souvernir!', { user: 'memory3' } );
		this.awi.editor.print( control.editor, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {
				errorInfo: {
					line: line,
					userInput: parameters.userInput,
					from: parameters.from,
					control: control
				} } };
	}
	async findSouvenirs( line, parameters, control )
	{
		return { success: 'notfound' };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericError;

},{"../awi-souvenir":52}],56:[function(require,module,exports){
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
* @file awi-souvenir-awi-image.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Image souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericImage extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Image Souvenir Bubble';
		this.token = 'image';
		this.classname = 'generic';
		this.properties.action = "remembers one image file and it's content";
		this.properties.inputs = [
			{ userInput: 'what to find in the image', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to look for', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { imageInfo: 'what was found', type: 'object.imageInfo' } ];
		this.properties.tags = [ 'souvenir', 'image' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		var info = this.awi.utilities.compareTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
		{
			var content = await this.getContent( line, parameters, control );
			return { success: 'found', data: { result: info.result, match: info, content: content.data.imageInfo } };
		}
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( control.editor, this.parameters.text, { user: 'memory3' } );
		this.awi.editor.print( control.editor, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {
				imageInfo: {
					receiverName: this.parameters.receiverName,
					path: path,
					text: text,
					date: this.awi.utilities.getTimestampFromStats( stats )
				} } };
	}
	async findSouvenirs( line, parameters, control )
	{
		var info = this.awi.utilities.matchTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
			return await this.getContent( line, parameters, control );
		return { success: 'notfound' };
	}
}
module.exports.Souvenir = SouvenirGenericImage;

},{"../awi-souvenir":52}],57:[function(require,module,exports){
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
* @file awi-souvenir-awi-mail.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Mail souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericMail extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Mail Souvenir Bubble';
		this.token = 'mail';
		this.classname = 'generic';
		this.properties.action = "remembers one mail exchange and it's content";
		this.properties.inputs = [
			{ userInput: 'what to find in the mail', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to look for', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { mailInfo: 'what was found', type: 'object.mailInfo' } ];
		this.properties.subTopics.push( ...[ 'souvenir', 'mail' ] );
		this.properties.tags = [ 'souvenir', 'mail' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		var info = this.awi.utilities.compareTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
		{
			var content = await this.getContent( line, parameters, control );
			return { success: 'found', data: { result: info.result, match: info, content: content.data.mailInfo } };
		}
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( control.editor, this.parameters.text, { user: 'memory3' } );
		this.awi.editor.print( control.editor, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {
				mailInfo: {
					receiverName: this.parameters.receiverName,
					path: path,
					text: text,
					date: this.awi.utilities.getTimestampFromStats( stats )
				} } };
	}
	async findSouvenirs( line, parameters, control )
	{
		var info = this.awi.utilities.matchTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
			return await this.getContent( line, parameters, control );
		return { success: 'notfound' };
	}
}
module.exports.Souvenir = SouvenirGenericMail;

},{"../awi-souvenir":52}],58:[function(require,module,exports){
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
* @file awi-souvenir-awi-message.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Message souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericMessage extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Message Souvenir Bubble';
		this.token = 'message';
		this.classname = 'generic';
		this.properties.action = 'remembers one conversation exchange';
		this.properties.inputs = [
			{ userInput: 'the topics to remember', type: 'string', optional: false, default: '' },
			{ from: 'the kind of topic to remember, example audio, video etc.', type: 'string', optional: true, default: '' } ];
		this.properties.outputs = [ { messageInfo: 'what was found', type: 'object.messageInfo', default: false } ];
		this.properties.tags = [ 'souvenir', 'messenger', 'message' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		var info = this.awi.utilities.compareTwoStrings( this.parameters.senderText + this.parameters.receiverText, line, control );
		if ( info.result > 0 )
		{
			var content = await this.getContent( line, parameters, control );
			return { success: 'found', data: { result: info.result, match: info, content: content.data.messageInfo } };
		}
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( control.editor, this.parameters.senderName + ' said: ' + this.parameters.senderText, { user: 'memory3' } );
		this.awi.editor.print( control.editor, this.parameters.receiverName + ' said: ' + this.parameters.receiverText, { user: 'memory3' } );
		this.awi.editor.print( control.editor, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {	messageInfo: this.parameters } };
	}
	async findSouvenirs( line, parameters, control )
	{
		var found = this.awi.utilities.matchTwoStrings( this.parameters.senderText + this.parameters.receiverText, line, { caseInsensitive: true } );
		if ( found.result > 0 )
		{
			return await this.getContent( line, parameters, control );
		}
		return { success: 'notfound' };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericMessage;

},{"../awi-souvenir":52}],59:[function(require,module,exports){
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
* @file awi-souvenir-awi-photo.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Photo souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericPhoto extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Photo Souvenir Bubble';
		this.token = 'photo';
		this.classname = 'generic';
		this.properties.action = 'remembers one photo';
		this.properties.inputs = [
			{ userInput: 'what to find in the photo', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { photoInfo: 'what was found', type: 'object.photoInfo', default: false } ];
		this.properties.tags = [ 'souvenir', 'photo' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		var info = this.awi.utilities.compareTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
		{
			var content = await this.getContent( line, parameters, control );
			return { success: 'found', data: { result: info.result, match: info, content: content.data.photoInfo } };
		}
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( control.editor, this.parameters.text, { user: 'memory3' } );
		this.awi.editor.print( control.editor, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {
				photoInfo: {
					receiverName: this.parameters.receiverName,
					path: path,
					text: text,
					date: this.awi.utilities.getTimestampFromStats( stats )
				} } };
	}
	async findSouvenirs( line, parameters, control )
	{
		var info = this.awi.utilities.matchTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
			return await this.getContent( line, parameters, control );
		return { success: 'notfound' };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericPhoto;

},{"../awi-souvenir":52}],60:[function(require,module,exports){
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
* @file awi-souvenir-awi-error.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Souvenir error bubble
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericRoot extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Root';
		this.token = 'root';
		this.classname = 'generic';
		this.properties.action = "root of a branch of souvenirs";
		this.properties.inputs = [
			{ userInput: 'what to find in the chain', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { rootInfo: 'what was found', type: 'object.rootInfo' } ];
		this.properties.tags = [ 'souvenir', 'root' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( control.editor, 'Root souvenir, parent: ' + this.parent + '.', { user: 'memory3' } );
		this.awi.editor.print( control.editor, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {
				rootInfo: {
					senderName: this.parameters.senderName,
					receiverName: this.parameters.receiverName,
			} } };
	}
	async findSouvenirs( line, parameters, control )
	{
		return {
			success: 'found',
			data: {
				rootInfo: {
					senderName: this.parameters.senderName,
					receiverName: this.parameters.receiverName,
			} } };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericRoot;

},{"../awi-souvenir":52}],61:[function(require,module,exports){
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
* @file awi-souvenir-awi-video.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Video souvenirs
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericVideo extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Video Souvenir Bubble';
		this.token = 'video';
		this.classname = 'generic';
		this.properties.action = "remembers one photo and it's content";
		this.properties.inputs = [
			{ userInput: 'what to find in the video', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { videoInfo: 'what was found', type: 'object.videoInfo' } ];
		this.properties.tags = [ 'souvenir', 'image' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		var info = this.awi.utilities.compareTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
		{
			var content = await this.getContent( line, parameters, control );
			return { success: 'found', data: { result: info.result, match: info, content: content.data.videoInfo } };
		}
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( control.editor, 'Text: ' + this.parameters.text, { user: 'memory3' } );
		this.awi.editor.print( control.editor, 'Start: ' + this.parameters.start.text + ', end: ' + this.parameters.end.text, { user: 'memory3' } );
		this.awi.editor.print( control.editor, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {	videoInfo: this.parameters }
		};
	}
	async findSouvenirs( line, parameters, control )
	{
		var info = this.awi.utilities.matchTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
			return await this.getContent( line, parameters, control );
		return { success: 'notfound' };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericVideo;

},{"../awi-souvenir":52}],62:[function(require,module,exports){
window.awi = require( './awi-engine/awi' )

},{"./awi-engine/awi":6}],63:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[62])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL1VzZXJzL1VzZXIvQXBwRGF0YS9Sb2FtaW5nL252bS92MTguMTQuMS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiYXdpLWNvbmZpZy5qcyIsImF3aS1tZXNzYWdlcy5qcyIsImF3aS1wZXJzb25hbGl0eS5qcyIsImF3aS1wcm9tcHQuanMiLCJhd2ktcmVxdWlyZXMuanMiLCJhd2kuanMiLCJidWJibGVzL2FvemJhc2ljL2F3aS1idWJibGUtYW96YmFzaWMtY29kZS5qcyIsImJ1YmJsZXMvYXdpLWJyYW5jaC5qcyIsImJ1YmJsZXMvYXdpLWJ1YmJsZS5qcyIsImJ1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtYmluLmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1jaGF0LmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1kZWJ1Zy5qcyIsImJ1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtZGlnZXN0LmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1lZGl0LmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1lcnJvci5qcyIsImJ1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtZXZhbC5qcyIsImJ1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtaGVscC5qcyIsImJ1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtaGV4LmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1pbXBvcnQuanMiLCJidWJibGVzL2dlbmVyaWMvYXdpLWJ1YmJsZS1nZW5lcmljLWlucHV0LmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1saXN0LmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1xdWl0LmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1yZW1lbWJlci5qcyIsImJ1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtcm9vdC5qcyIsImJ1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtcnVuLmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1zdG9wLmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy12ZXJib3NlLmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy12aWV3LmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy13ZWxjb21lLmpzIiwiYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy13cml0ZS5qcyIsImJ1YmJsZXMvamF2YXNjcmlwdC9hd2ktYnViYmxlLWphdmFzY3JpcHQtYmFzZTY0LmpzIiwiYnViYmxlcy9qYXZhc2NyaXB0L2F3aS1idWJibGUtamF2YXNjcmlwdC1jb2RlLmpzIiwiYnViYmxlcy91c2VyL2F3aS1idWJibGUtdXNlci1kaWFwb3JhbWEuanMiLCJjb25uZWN0b3JzL2F3aS1jb25uZWN0b3IuanMiLCJjb25uZWN0b3JzL2NsaWVudHMvYXdpLWNvbm5lY3Rvci1jbGllbnRzLW9wZW5haWJyb3dzZXIuanMiLCJjb25uZWN0b3JzL2VkaXRvcnMvYXdpLWNvbm5lY3Rvci1lZGl0b3JzLW1vYmlsZS5qcyIsImNvbm5lY3RvcnMvbGFuZ3VhZ2VzL2F3aS1jb25uZWN0b3ItbGFuZ3VhZ2VzLWphdmFzY3JpcHQuanMiLCJjb25uZWN0b3JzL3N5c3RlbXMvYXdpLWNvbm5lY3Rvci1zeXN0ZW1zLW1vYmlsZS5qcyIsImNvbm5lY3RvcnMvdXRpbGl0aWVzL2F3aS1jb25uZWN0b3ItdXRpbGl0aWVzLXBhcnNlci5qcyIsImNvbm5lY3RvcnMvdXRpbGl0aWVzL2F3aS1jb25uZWN0b3ItdXRpbGl0aWVzLXRpbWUuanMiLCJjb25uZWN0b3JzL3V0aWxpdGllcy9hd2ktY29ubmVjdG9yLXV0aWxpdGllcy11dGlsaXRpZXMuanMiLCJtZW1vcmllcy9hd2ktbWVtb3J5LmpzIiwibWVtb3JpZXMvZ2VuZXJpYy9hd2ktbWVtb3J5LWdlbmVyaWMtYXVkaW9zLmpzIiwibWVtb3JpZXMvZ2VuZXJpYy9hd2ktbWVtb3J5LWdlbmVyaWMtY29udmVyc2F0aW9ucy5qcyIsIm1lbW9yaWVzL2dlbmVyaWMvYXdpLW1lbW9yeS1nZW5lcmljLWRvY3VtZW50cy5qcyIsIm1lbW9yaWVzL2dlbmVyaWMvYXdpLW1lbW9yeS1nZW5lcmljLWVycm9yLmpzIiwibWVtb3JpZXMvZ2VuZXJpYy9hd2ktbWVtb3J5LWdlbmVyaWMtaW1hZ2VzLmpzIiwibWVtb3JpZXMvZ2VuZXJpYy9hd2ktbWVtb3J5LWdlbmVyaWMtbWFpbHMuanMiLCJtZW1vcmllcy9nZW5lcmljL2F3aS1tZW1vcnktZ2VuZXJpYy1tZXNzZW5nZXIuanMiLCJtZW1vcmllcy9nZW5lcmljL2F3aS1tZW1vcnktZ2VuZXJpYy1waG90b3MuanMiLCJtZW1vcmllcy9nZW5lcmljL2F3aS1tZW1vcnktZ2VuZXJpYy12aWRlb3MuanMiLCJzb3V2ZW5pcnMvYXdpLXNvdXZlbmlyLmpzIiwic291dmVuaXJzL2dlbmVyaWMvYXdpLXNvdXZlbmlyLWdlbmVyaWMtYXVkaW8uanMiLCJzb3V2ZW5pcnMvZ2VuZXJpYy9hd2ktc291dmVuaXItZ2VuZXJpYy1kb2N1bWVudC5qcyIsInNvdXZlbmlycy9nZW5lcmljL2F3aS1zb3V2ZW5pci1nZW5lcmljLWVycm9yLmpzIiwic291dmVuaXJzL2dlbmVyaWMvYXdpLXNvdXZlbmlyLWdlbmVyaWMtaW1hZ2UuanMiLCJzb3V2ZW5pcnMvZ2VuZXJpYy9hd2ktc291dmVuaXItZ2VuZXJpYy1tYWlsLmpzIiwic291dmVuaXJzL2dlbmVyaWMvYXdpLXNvdXZlbmlyLWdlbmVyaWMtbWVzc2FnZS5qcyIsInNvdXZlbmlycy9nZW5lcmljL2F3aS1zb3V2ZW5pci1nZW5lcmljLXBob3RvLmpzIiwic291dmVuaXJzL2dlbmVyaWMvYXdpLXNvdXZlbmlyLWdlbmVyaWMtcm9vdC5qcyIsInNvdXZlbmlycy9nZW5lcmljL2F3aS1zb3V2ZW5pci1nZW5lcmljLXZpZGVvLmpzIiwiLi4vYXdpLW1vYmlsZS5qcyIsIi4uLy4uL1VzZXJzL1VzZXIvQXBwRGF0YS9Sb2FtaW5nL252bS92MTguMTQuMS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2bkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy9MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbHBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNXNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcIFsgIF1bICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsIEFzc2lzdGFudFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyBbX3wgfF9dIFxcICAgICBsaW5rOlxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLWNvbmZpZy5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgQ29uZmlndXJhdGlvbiBtYW5hZ2VtZW50XG4qXG4qL1xuY2xhc3MgQ29uZmlnXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIGNvbmZpZyApXG5cdHtcblx0XHR0aGlzLmF3aSA9IGF3aTtcblx0XHR0aGlzLm9DbGFzcyA9ICdjb25maWcnXG5cdFx0dGhpcy5zeXN0ZW1Db25maWcgPSBjb25maWc7XG5cdFx0aWYgKCB0eXBlb2YgY29uZmlnLmNvbmZpZ3VyYXRpb25zID09ICdzdHJpbmcnIClcblx0XHRcdHRoaXMuZ2V0Q29uZmlndXJhdGlvblBhdGggPSBmdW5jdGlvbigpeyByZXR1cm4gYXdpLnV0aWxpdGllcy5ub3JtYWxpemUoIGNvbmZpZy5jb25maWd1cmF0aW9ucyApIH07XG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy5nZXRDb25maWd1cmF0aW9uUGF0aCA9IGNvbmZpZy5jb25maWd1cmF0aW9ucztcblx0XHRpZiAoIHR5cGVvZiBjb25maWcuZW5naW5lID09ICdzdHJpbmcnIClcblx0XHRcdHRoaXMuZ2V0RW5naW5lUGF0aCA9IGZ1bmN0aW9uKCl7IHJldHVybiBhd2kudXRpbGl0aWVzLm5vcm1hbGl6ZSggY29uZmlnLmVuZ2luZSApIH07XG5cdFx0ZWxzZSBpZiAoIEFycmF5LmlzQXJyYXkoIGNvbmZpZy5lbmdpbmUgKSApXG5cdFx0XHR0aGlzLmdldEVuZ2luZVBhdGggPSBmdW5jdGlvbigpeyAnaHR0cDovL3J1bi9kYXRhL2F3aS1lbmdpbmUnIH07XG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy5nZXRFbmdpbmVQYXRoID0gY29uZmlnLmVuZ2luZTtcblx0XHRpZiAoIHR5cGVvZiBjb25maWcuZGF0YSA9PSAnc3RyaW5nJyApXG5cdFx0XHR0aGlzLmdldERhdGFQYXRoID0gZnVuY3Rpb24oKXsgcmV0dXJuIGF3aS51dGlsaXRpZXMubm9ybWFsaXplKCBjb25maWcuZGF0YSApIH07XG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy5nZXREYXRhUGF0aCA9IGNvbmZpZy5kYXRhO1xuXHRcdHRoaXMudXNlciA9ICcnO1xuXHRcdHRoaXMuY29uZmlncyA9IHt9O1xuXHRcdHRoaXMucGxhdGZvcm0gPSAnd2luMzInO1xuXHR9XG5cdGFzeW5jIGluaXQoKVxuXHR7XG5cdFx0YXdhaXQgdGhpcy5sb2FkQ29uZmlncygpO1xuXHRcdHRoaXMucGxhdGZvcm0gPSBhd2FpdCB0aGlzLmF3aS5zeXN0ZW0uZ2V0U3lzdGVtSW5mb3JtYXRpb24oICdwbGF0Zm9ybScgKTtcblx0fVxuXHRpc1VzZXJMb2dnZWQoKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMudXNlci5sZW5ndGggPiAwO1xuXHR9XG5cdGdldENvbmZpZyggdHlwZSApXG5cdHtcblx0XHRpZiAoIHR5cGUgPT0gJ3VzZXInIClcblx0XHR7XG5cdFx0XHR0eXBlID0gdGhpcy51c2VyO1xuXHRcdFx0aWYgKCB0eXBlID09ICcnIClcblx0XHRcdFx0dHlwZSA9ICd1c2VyLWRlZmF1bHQnO1xuXHRcdH1cblx0XHRlbHNlIGlmICggdHlwZSA9PSAncGVyc29uYWxpdHknIClcblx0XHRcdHR5cGUgPSAncGVyc29uYWxpdHktJyArIHRoaXMuY29uZmlnc1sgdGhpcy51c2VyIF0ucGVyc29uYWxpdHk7XG5cdFx0cmV0dXJuIHRoaXMuY29uZmlnc1sgdHlwZSBdO1xuXHR9XG5cdGdldE5ld1VzZXJDb25maWcoKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuYXdpLnV0aWxpdGllcy5jb3B5T2JqZWN0KCB0aGlzLmNvbmZpZ3NbICd1c2VyLWRlZmF1bHQnIF0gKTtcblx0fVxuXHRhc3luYyBzZXROZXdVc2VyQ29uZmlnKCBuYW1lLCBjb25maWcgKVxuXHR7XG5cdFx0aWYgKCBuYW1lICE9ICd1c2VyJyAmJiBuYW1lICE9ICdzeXN0ZW0nIClcblx0XHR7XG5cdFx0XHR0aGlzLmNvbmZpZ3NbIG5hbWUgXSA9IGNvbmZpZztcblx0XHRcdHZhciBwZXJzb25hbGl0eSA9IGF3YWl0IHRoaXMubG9hZENvbmZpZyggJ3BlcnNvbmFsaXR5LScgKyBjb25maWcucGVyc29uYWxpdHkgKTtcblx0XHRcdHBlcnNvbmFsaXR5LnByb21wdHNbICd1c2VyJyBdID0gJy4oJyArIGNvbmZpZy5maXJzdE5hbWUgKyAnKSAnO1xuXHRcdFx0dGhpcy5jb25maWdzWyAncGVyc29uYWxpdHktJyArIGNvbmZpZy5wZXJzb25hbGl0eSBdID0gcGVyc29uYWxpdHk7XG5cdFx0fVxuXHR9XG5cdGNoZWNrVXNlckNvbmZpZyggbmFtZSApXG5cdHtcblx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblx0XHRpZiAoIG5hbWUuaW5kZXhPZiggJ3N5c3RlbScgKSAhPSAwICYmIG5hbWUuaW5kZXhPZiggJ3VzZXInICkgIT0gMCAmJiBuYW1lLmluZGV4T2YoICdwZXJzb25hbGl0eScgKSAhPSAwIClcblx0XHRcdHJldHVybiB0aGlzLmNvbmZpZ3NbIG5hbWUgXTtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXHRnZXRVc2VyTGlzdCgpXG5cdHtcblx0XHR2YXIgbGlzdCA9IFtdO1xuXHRcdGZvciAoIHZhciBjIGluIHRoaXMuY29uZmlncyApXG5cdFx0e1xuXHRcdFx0dmFyIGNvbmZpZyA9IHRoaXMuY29uZmlnc1sgYyBdO1xuXHRcdFx0aWYgKCB0eXBlb2YgY29uZmlnLmZ1bGxOYW1lICE9ICd1bmRlZmluZWQnICYmIGNvbmZpZy5mdWxsTmFtZSApXG5cdFx0XHR7XG5cdFx0XHRcdGxpc3QucHVzaCggY29uZmlnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBsaXN0O1xuXHR9XG5cdGFzeW5jIHNldFVzZXIoIHVzZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIGNvbmZpZyA9IHRoaXMuY2hlY2tVc2VyQ29uZmlnKCB1c2VyICk7XG5cdFx0aWYgKCBjb25maWcgKVxuXHRcdHtcblx0XHRcdHRoaXMudXNlciA9IHVzZXIudG9Mb3dlckNhc2UoKS50cmltKCk7XG5cdFx0XHR2YXIgcGVyc29uYWxpdHkgPSB0aGlzLmNvbmZpZ3NbIHRoaXMudXNlciBdLnBlcnNvbmFsaXR5O1xuXHRcdFx0dGhpcy5sb2FkQ29uZmlnKCAncGVyc29uYWxpdHktJyArIHBlcnNvbmFsaXR5ICk7XG5cdFx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kuY2xpZW50LmNvbm5lY3QoIHRoaXMuYXdpLmNsaWVudC5vcHRpb25zICk7XG5cdFx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHRcdHtcblx0XHRcdFx0Y29udHJvbC5lZGl0b3Iuc2VsZi5zZXRQcm9tcHQoIGNvbnRyb2wuZWRpdG9yLCAnLignICsgdXNlciArICcpICcgKTtcblx0XHRcdFx0Ly90aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnXFxuJyArIGFuc3dlci5kYXRhLnByb21wdCArICcgcnVubmluZy4nLCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGFuc3dlcjtcblx0XHR9XG5cdFx0ZWxzZVxuXHRcdHtcblx0XHRcdHZhciB7IG9yaWdpbmFsVHlwZSwgdHlwZSB9ID0gdGhpcy5nZXRDb25maWdUeXBlcyggdXNlciApO1xuXHRcdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLnV0aWxpdGllcy5sb2FkSEpTT04oIHRoaXMuZ2V0Q29uZmlndXJhdGlvblBhdGgoKSArICcvJyArIHR5cGUgKyAnLmhqc29uJyApO1xuXHRcdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuY29uZmlnc1sgdHlwZSBdID0gYW5zd2VyLmRhdGE7XG5cdFx0XHRcdHRoaXMudXNlciA9IHVzZXIudG9Mb3dlckNhc2UoKS50cmltKCk7XG5cdFx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLmF3aS5jbGllbnQuY29ubmVjdCggdGhpcy5hd2kuY2xpZW50Lm9wdGlvbnMgKTtcblx0XHRcdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb250cm9sLmVkaXRvci5zZWxmLnNldFByb21wdCggY29udHJvbC5lZGl0b3IsICcuKCcgKyB1c2VyICsgJykgJyApO1xuXHRcdFx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdcXG4nICsgYW5zd2VyLmRhdGEucHJvbXB0ICsgJyBydW5uaW5nLicgKVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBhbnN3ZXI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2F3aTpjYW5ub3Qtc2V0LXVzZXI6aXdhJyB9O1xuXHR9XG5cdGFzeW5jIHNhdmVDb25maWdzKCBuYW1lIClcblx0e1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgdXNlciwgcGVyc29uYWxpdGllcyA9IFtdO1xuXHRcdGlmICggbmFtZSApXG5cdFx0e1xuXHRcdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdHVzZXIgPSB0aGlzLmNvbmZpZ3NbIG5hbWUgXTtcblx0XHRcdGlmICggIXVzZXIgKVxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6dXNlci11bmtub3c6aXdhJyB9O1xuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZ3NbICdwZXJzb25hbGl0eS0nICsgdXNlci5wZXJzb25hbGl0eSBdIClcblx0XHRcdFx0cGVyc29uYWxpdGllcy5wdXNoKCB7IHBhdGg6IHNlbGYuZ2V0Q29uZmlndXJhdGlvblBhdGgoKSArICcvcGVyc29uYWxpdHktJyArIHVzZXIucGVyc29uYWxpdHksIGNvbmZpZzogdGhpcy5jb25maWdzWyAncGVyc29uYWxpdHktJyArIHVzZXIucGVyc29uYWxpdHkgXSB9ICk7XG5cdFx0XHRhd2FpdCB0aGlzLmF3aS51dGlsaXRpZXMuc2F2ZUhKU09OKCB0aGlzLmdldENvbmZpZ3VyYXRpb25QYXRoKCkgKyAnLycgKyBuYW1lICsgJy5oanNvbicsIHRoaXMuY29uZmlnc1sgbmFtZSBdICk7XG5cdFx0XHRhd2FpdCB0aGlzLmF3aS51dGlsaXRpZXMuc2F2ZUpTT04oIHRoaXMuZ2V0Q29uZmlndXJhdGlvblBhdGgoKSArICcvJyArIG5hbWUgKyAnLmpzb24nLCB0aGlzLmNvbmZpZ3NbIG5hbWUgXSApO1xuXHRcdFx0cGVyc29uYWxpdGllcy5mb3JFYWNoKFxuXHRcdFx0XHRhc3luYyBmdW5jdGlvbiggZWxlbWVudCApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRhd2FpdCBzZWxmLmF3aS51dGlsaXRpZXMuc2F2ZUhKU09OKCBlbGVtZW50LnBhdGggKyAnLmhqc29uJyAsIGVsZW1lbnQuY29uZmlnICk7XG5cdFx0XHRcdFx0YXdhaXQgc2VsZi5hd2kudXRpbGl0aWVzLnNhdmVKU09OKCBlbGVtZW50LnBhdGggKyAnLmpzb24nLCBlbGVtZW50LmNvbmZpZyApO1xuXHRcdFx0XHR9ICk7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRmb3IgKCB2YXIgdHlwZSBpbiB0aGlzLmNvbmZpZ3MgKVxuXHRcdFx0e1xuXHRcdFx0XHRhd2FpdCB0aGlzLmF3aS51dGlsaXRpZXMuc2F2ZUhKU09OKCAgdGhpcy5zeXN0ZW1Db25maWcuY29uZmlndXJhdGlvbnMgKyAnLycgKyB0eXBlICsgJy5oanNvbicsIHRoaXMuY29uZmlnc1sgdHlwZSBdICk7XG5cdFx0XHRcdGF3YWl0IHRoaXMuYXdpLnV0aWxpdGllcy5zYXZlSlNPTiggdGhpcy5zeXN0ZW1Db25maWcuY29uZmlndXJhdGlvbnMgKyAnLycgKyB0eXBlICsgJy5qc29uJywgdGhpcy5jb25maWdzWyB0eXBlIF0gKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogJycgfTtcblx0fVxuXHRhc3luYyBsb2FkQ29uZmlncygpXG5cdHtcblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kuc3lzdGVtLmdldERpcmVjdG9yeSggdGhpcy5nZXRDb25maWd1cmF0aW9uUGF0aCgpLCB7IHJlY3Vyc2l2ZTogZmFsc2UsIGZpbHRlcnM6IFsgJyouaGpzb24nIF0gfSApO1xuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdHtcblx0XHRcdHZhciBmaWxlcyA9IHRoaXMuYXdpLnV0aWxpdGllcy5nZXRGaWxlQXJyYXlGcm9tVHJlZSggYW5zd2VyLmRhdGEgKTtcblx0XHRcdGZvciAoIHZhciBmID0gMDsgZiA8IGZpbGVzLmxlbmd0aDsgZisrIClcblx0XHRcdHtcblx0XHRcdFx0YW5zd2VyID0gYXdhaXQgdGhpcy5hd2kudXRpbGl0aWVzLmxvYWRISlNPTiggZmlsZXNbIGYgXS5wYXRoICk7XG5cdFx0XHRcdGlmICggIWFuc3dlci5zdWNjZXNzIClcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0dmFyIG5hbWUgPSB0aGlzLmF3aS51dGlsaXRpZXMucGFyc2UoIGZpbGVzWyBmIF0ubmFtZSApLm5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0dGhpcy5jb25maWdzWyBuYW1lIF0gPSBhbnN3ZXIuZGF0YTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKCAhdGhpcy5jb25maWdzWyAndXNlcicgXSApXG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5sb2FkQ29uZmlnKCAnc3lzdGVtJyApO1xuXHRcdFx0YXdhaXQgdGhpcy5sb2FkQ29uZmlnKCAndXNlcicgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGFuc3dlcjtcblx0fVxuXHRhc3luYyBsb2FkQ29uZmlnKCB0eXBlLCBjYWxsYmFjayApXG5cdHtcblx0XHR2YXIgeyBvcmlnaW5hbFR5cGUsIHR5cGUgfSA9IHRoaXMuZ2V0Q29uZmlnVHlwZXMoIHR5cGUgKVxuXHRcdGlmICggIXRoaXMuY29uZmlnc1sgdHlwZSBdICYmIHRoaXMuYXdpICYmIHRoaXMuYXdpLnV0aWxpdGllcyApXG5cdFx0e1xuXHRcdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLnV0aWxpdGllcy5sb2FkSEpTT04oIHRoaXMuZ2V0Q29uZmlndXJhdGlvblBhdGgoKSArICcvJyArIHR5cGUgKyAnLmhqc29uJyApO1xuXHRcdFx0dGhpcy5jb25maWdzWyB0eXBlIF0gPSBhbnN3ZXIuZGF0YTtcblx0XHR9XG5cdFx0aWYgKCAhdGhpcy5jb25maWdzWyB0eXBlIF0gKVxuXHRcdHtcblx0XHRcdHN3aXRjaCAoIG9yaWdpbmFsVHlwZSApXG5cdFx0XHR7XG5cdFx0XHRcdGNhc2UgJ3N5c3RlbSc6XG5cdFx0XHRcdFx0dGhpcy5jb25maWdzWyAnc3lzdGVtJyBdID1cblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRzZXJ2ZXJVcmw6ICd3czovLzE5NC4xMTAuMTkyLjU5Ojg3NjUnLFxuXHRcdFx0XHRcdFx0cHJvbXB0czpcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0dXNlcjogJy4gJyxcblx0XHRcdFx0XHRcdFx0YXdpOiAnLi4gJyxcblx0XHRcdFx0XHRcdFx0cmVzdWx0OiAnLjogJyxcblx0XHRcdFx0XHRcdFx0cm9vdDogJy4uLi4uJyxcblx0XHRcdFx0XHRcdFx0cXVlc3Rpb246ICcuPyAnLFxuXHRcdFx0XHRcdFx0XHRpbmZvcm1hdGlvbjogJy4ob28pICcsXG5cdFx0XHRcdFx0XHRcdGNvbW1hbmQ6ICcuPiAnLFxuXHRcdFx0XHRcdFx0XHR3YXJuaW5nOiAnLndhcm5pbmc6ICcsXG5cdFx0XHRcdFx0XHRcdGVycm9yOiAnLmVycm9yOiAnLFxuXHRcdFx0XHRcdFx0XHRjb2RlOiAnLmNvZGU6ICcsXG5cdFx0XHRcdFx0XHRcdGRlYnVnMTogJ2RlYnVnMTogJyxcblx0XHRcdFx0XHRcdFx0ZGVidWcyOiAnZGVidWcyOiAnLFxuXHRcdFx0XHRcdFx0XHRkZWJ1ZzM6ICdkZWJ1ZzM6ICcsXG5cdFx0XHRcdFx0XHRcdHZlcmJvc2UxOiAnLiAnLFxuXHRcdFx0XHRcdFx0XHR2ZXJib3NlMjogJy4gJyxcblx0XHRcdFx0XHRcdFx0dmVyYm9zZTM6ICcuICcsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0Y29tbWFuZHM6XG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHdpbjMyOlxuXHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0aW1hZ2U6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHZpZXc6IHsgY29tbWFuZDogJ2V4cGxvcmVyIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdGVkaXQ6IHsgY29tbWFuZDogJ2V4cGxvcmVyIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdHJ1bjogeyBjb21tYW5kOiAnZXhwbG9yZXIgXCJ7ZmlsZX1cIicsIGN3ZDogJycsIHR5cGU6ICdleGVjJyB9LFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0dmlkZW86IHtcblx0XHRcdFx0XHRcdFx0XHRcdHZpZXc6IHsgY29tbWFuZDogJ2V4cGxvcmVyIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdGVkaXQ6IHsgY29tbWFuZDogJ2V4cGxvcmVyIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdHJ1bjogeyBjb21tYW5kOiAnZXhwbG9yZXIgXCJ7ZmlsZX1cIicsIGN3ZDogJycsIHR5cGU6ICdleGVjJyB9LFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0c291bmQ6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHZpZXc6IHsgY29tbWFuZDogJ2V4cGxvcmVyIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdGVkaXQ6IHsgY29tbWFuZDogJ2V4cGxvcmVyIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdHJ1bjogeyBjb21tYW5kOiAnZXhwbG9yZXIgXCJ7ZmlsZX1cIicsIGN3ZDogJycsIHR5cGU6ICdleGVjJyB9LFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0ZG9jdW1lbnQ6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHZpZXc6IHsgY29tbWFuZDogJ2V4cGxvcmVyIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdGVkaXQ6IHsgY29tbWFuZDogJ2V4cGxvcmVyIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdHJ1bjogeyBjb21tYW5kOiAnZXhwbG9yZXIgXCJ7ZmlsZX1cIicsIGN3ZDogJycsIHR5cGU6ICdleGVjJyB9LFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0cHJlc2VudGF0aW9uOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2aWV3OiB7IGNvbW1hbmQ6ICdleHBsb3JlciBcIntmaWxlfVwiJywgY3dkOiAnJywgdHlwZTogJ2V4ZWMnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRlZGl0OiB7IGNvbW1hbmQ6ICdleHBsb3JlciBcIntmaWxlfVwiJywgY3dkOiAnJywgdHlwZTogJ2V4ZWMnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRydW46IHsgY29tbWFuZDogJ2V4cGxvcmVyIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdHNvdXJjZToge1xuXHRcdFx0XHRcdFx0XHRcdFx0dmlldzogeyBjb21tYW5kOiAnY29kZSBcIntmaWxlfVwiJywgY3dkOiAnJywgdHlwZTogJ2V4ZWMnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRlZGl0OiB7IGNvbW1hbmQ6ICdjb2RlIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdHJ1bjogeyBjb21tYW5kOiAnY29kZSBcIntmaWxlfVwiJywgY3dkOiAnJywgdHlwZTogJ2V4ZWMnIH0sXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRqc29uOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2aWV3OiB7IGNvbW1hbmQ6ICdjb2RlIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdGVkaXQ6IHsgY29tbWFuZDogJ2NvZGUgXCJ7ZmlsZX1cIicsIGN3ZDogJycsIHR5cGU6ICdleGVjJyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0cnVuOiB7IGNvbW1hbmQ6ICdjb2RlIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdGh0bWw6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHZpZXc6IHsgY29tbWFuZDogJ2V4cGxvcmVyIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdGVkaXQ6IHsgY29tbWFuZDogJ2V4cGxvcmVyIFwie2ZpbGV9XCInLCBjd2Q6ICcnLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHRcdHJ1bjogeyBjb21tYW5kOiAnZXhwbG9yZXIgXCJ7ZmlsZX1cIicsIGN3ZDogJycsIHR5cGU6ICdleGVjJyB9LFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0YXBwbGljYXRpb246IHtcblx0XHRcdFx0XHRcdFx0XHRcdHZpZXc6IHsgY29tbWFuZDogJ3N0YXJ0IHtmaWxlfScsIGN3ZDogJ1wie2Rpcn1cIicsIHR5cGU6ICdleGVjJyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0ZWRpdDogeyBjb21tYW5kOiAnc3RhcnQge2ZpbGV9JywgY3dkOiAnXCJ7ZGlyfVwiJywgdHlwZTogJ2V4ZWMnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRydW46IHsgY29tbWFuZDogJ3N0YXJ0IHtmaWxlfScsIGN3ZDogJ1wie2Rpcn1cIicsIHR5cGU6ICdleGVjJyB9LFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0YW96YWNjZXNzb3J5OiB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2aWV3OiB7IGNvbW1hbmQ6ICdhb3oge2ZpbGV9JywgY3dkOiAnXCJ7ZGlyfVwiJywgdHlwZTogJ2V4ZWMnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRlZGl0OiB7IGNvbW1hbmQ6ICdhb3oge2ZpbGV9JywgY3dkOiAnXCJ7ZGlyfVwiJywgdHlwZTogJ2V4ZWMnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRydW46IHsgY29tbWFuZDogJ2FveiB7ZmlsZX0nLCBjd2Q6ICdcIntkaXJ9XCInLCB0eXBlOiAnZXhlYycgfSxcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdGZpbGU6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHZpZXc6IHsgY29tbWFuZDogJ2V4cGxvcmVyIHtmaWxlfScsIGN3ZDogJycsIHR5cGU6ICdleGVjJyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0ZWRpdDogeyBjb21tYW5kOiAnZXhwbG9yZXIge2ZpbGV9JywgY3dkOiAnJywgdHlwZTogJ2V4ZWMnIH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRydW46IHsgY29tbWFuZDogJ2V4cGxvcmVyIHtmaWxlfScsIGN3ZDogJycsIHR5cGU6ICdleGVjJyB9LFxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0bWFjT1M6IHt9LFxuXHRcdFx0XHRcdFx0XHRsaW51eDoge30sXG5cdFx0XHRcdFx0XHRcdGFuZHJvaWQ6IHt9LFxuXHRcdFx0XHRcdFx0XHRpUGhvbmU6IHt9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAndXNlcic6XG5cdFx0XHRcdFx0dGhpcy5jb25maWdzWyB0eXBlIF0gPVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGZpcnN0TmFtZTogJycsXG5cdFx0XHRcdFx0XHRsYXN0TmFtZTogJycsXG5cdFx0XHRcdFx0XHRmdWxsTmFtZTogJycsXG5cdFx0XHRcdFx0XHRwZXJzb25hbGl0eTogJ2F3aScsXG5cdFx0XHRcdFx0XHRwYXRoczpcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0YW96OiAnQzovQU9aX1N0dWRpbydcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRkaXJlY3RDb25uZWN0aW9uOiB0cnVlLFxuXHRcdFx0XHRcdFx0bG9jYWxTZXJ2ZXI6IHRydWUsXG5cdFx0XHRcdFx0XHRhaUtleTogJycsXG5cdFx0XHRcdFx0XHRpc0RlZ3JlZTogdHJ1ZSxcblx0XHRcdFx0XHRcdGZpeDogMyxcblx0XHRcdFx0XHRcdGRlYnVnOiAwLFxuXHRcdFx0XHRcdFx0ZGV2ZWxvcHBlck1vZGU6IHRydWUsXG5cdFx0XHRcdFx0XHR2ZXJib3NlOiAxLFxuXHRcdFx0XHRcdFx0anVzdGlmeTogMTYwLFxuXHRcdFx0XHRcdFx0dmVyYm9zZVByb21wdHM6XG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHZlcmJvc2UxOiBbICdpbXBvcnRlcjEnLCAnbWVtb3J5MScgXSxcblx0XHRcdFx0XHRcdFx0dmVyYm9zZTI6IFsgJ2ltcG9ydGVyMicsICdtZW1vcnkyJyBdLFxuXHRcdFx0XHRcdFx0XHR2ZXJib3NlMzogWyAnaW1wb3J0ZXIzJywgJ21lbW9yeTMnIF1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRkZWJ1Z1Byb21wdHM6XG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGRlYnVnMTogWyAncGFyc2VyJyBdLFxuXHRcdFx0XHRcdFx0XHRkZWJ1ZzI6IFsgJ3BhcnNlcicsICdwcm9tcHQnLCAsICdjb21wbGV0aW9uJyBdLFxuXHRcdFx0XHRcdFx0XHRkZWJ1ZzM6IFsgJ2FsbCcgXVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdHRha2VOb3RlOlxuXHRcdFx0XHRcdFx0W1xuXHRcdFx0XHRcdFx0XHQnUGxlYXNlIHRha2Ugbm90ZTogeW91IGFyZSB0YWxraW5nIHRvIHtmaXJzdE5hbWV9LicsXG5cdFx0XHRcdFx0XHRcdCdcXG5Ob3QgbW9yZSB0aGFuIDUwIHdvcmRzIGluIGFueSByZXNwb25zZS4nXG5cdFx0XHRcdFx0XHRdLFxuXHRcdFx0XHRcdFx0cGF0aHM6IHtcblx0XHRcdFx0XHRcdFx0d2luMzI6IFtdLFxuXHRcdFx0XHRcdFx0XHRtYWNPUzogW10sXG5cdFx0XHRcdFx0XHRcdGxpbnV4OiBbXSxcblx0XHRcdFx0XHRcdFx0YW5kcm9pZDogW10sXG5cdFx0XHRcdFx0XHRcdGlQaG9uZTogW11cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGZvciAoIHZhciBwIGluIHRoaXMuY29uZmlnc1sgdHlwZSBdLnBhdGhzIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR0aGlzLmNvbmZpZ3NbIHR5cGUgXS5wYXRoc1sgcCBdID0ge1xuXHRcdFx0XHRcdFx0XHRpbWFnZTogW10sXG5cdFx0XHRcdFx0XHRcdHNvdW5kOiBbXSxcblx0XHRcdFx0XHRcdFx0dmlkZW86IFtdLFxuXHRcdFx0XHRcdFx0XHRtdXNpYzogW10sXG5cdFx0XHRcdFx0XHRcdGpzb246IFtdLFxuXHRcdFx0XHRcdFx0XHRkb2N1bWVudDogW10sXG5cdFx0XHRcdFx0XHRcdHByZXNlbnRhdGlvbjogW10sXG5cdFx0XHRcdFx0XHRcdHNvdXJjZTogW10sXG5cdFx0XHRcdFx0XHRcdGFwcGxpY2F0aW9uOiBbXSxcblx0XHRcdFx0XHRcdFx0YW96YWNjZXNzb3J5OiBbXSxcblx0XHRcdFx0XHRcdFx0ZmlsZTogW10gfTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3BlcnNvbmFsaXR5Jzpcblx0XHRcdFx0XHR0aGlzLmNvbmZpZ3NbIHR5cGUgXSA9XG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogJ0F3aScsXG5cdFx0XHRcdFx0XHRjaGFyYWN0ZXI6ICdhd2knLFxuXHRcdFx0XHRcdFx0YW5pbWF0aW9uczogZmFsc2UsXG5cdFx0XHRcdFx0XHRtb29kOiAnd2l0aCBpbnBpcmluZyBjb21tZW50cycsXG5cdFx0XHRcdFx0XHR5b3VBcmU6ICdhIGdyZWF0IHByb2dyYW1tZXInLFxuXHRcdFx0XHRcdFx0d2hvVXNlczogJ3dobyBpcyBmbHVlbnQgaW4nLFxuXHRcdFx0XHRcdFx0dGhlUHJvZHVjdDogJ0phdmFzY3JpcHQgYW5kIG5vZGUuanMnLFxuXHRcdFx0XHRcdFx0dXNlVGhlUHJvZHVjdDogJ3JlZmVyIHRvIEphdmFzY3JpcHQnLFxuXHRcdFx0XHRcdFx0dG9Eb1NvbWV0aGluZzogJ2ZvciBjb2RlIGFuZCBleHBsYW5hdGlvbnMuJyxcblx0XHRcdFx0XHRcdHlvdUxvdmU6IFsgJ2NvZGluZycsICdtYWtpbmcgZ2FtZXMnLCAnbGVhcm5pbmcnIF0sXG5cdFx0XHRcdFx0XHR5b3VMaWtlOiBbICdjcmVhdGl2aXR5JywgJ211c2ljJywgXSxcblx0XHRcdFx0XHRcdHlvdVN1cHBvcnQ6IFsgXSxcblx0XHRcdFx0XHRcdHlvdUxhdWdoQXQ6IFsgXSxcblx0XHRcdFx0XHRcdHlvdU1ha2VBSm9rZVdoZW46IFsgXSxcblx0XHRcdFx0XHRcdHlvdUdycnJBdDogWyBdLFxuXHRcdFx0XHRcdFx0eW91UmVqZWN0OiBbIF0sXG5cdFx0XHRcdFx0XHR5b3VJZ25vcmU6IFsgXSxcblx0XHRcdFx0XHRcdHlvdUV2ZW50dWFsbHlBY2NlcHQ6IFsgXSxcblx0XHRcdFx0XHRcdHlvdUFsd2F5c0FjY2VwdDogWyBdLFxuXHRcdFx0XHRcdFx0dGVtcGVyYXR1cmU6IDAuMSxcblx0XHRcdFx0XHRcdHByb21wdHM6XG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHVzZXI6ICcuKGZyYW5jb2lzKSAnLFxuXHRcdFx0XHRcdFx0XHRhd2k6ICcuKMKwwrApICcsXG5cdFx0XHRcdFx0XHRcdHJlc3VsdDogJy4oLi4pICcsXG5cdFx0XHRcdFx0XHRcdGluZm9ybWF0aW9uOiAnLihvbykgJyxcblx0XHRcdFx0XHRcdFx0cXVlc3Rpb246ICc/KMKwwrApICcsXG5cdFx0XHRcdFx0XHRcdGNvbW1hbmQ6ICc+KMKwwrApJyxcblx0XHRcdFx0XHRcdFx0cm9vdDogJy5bb29dICcsXG5cdFx0XHRcdFx0XHRcdHdhcm5pbmc6ICcuKE9PKSAnLFxuXHRcdFx0XHRcdFx0XHRlcnJvcjogJy4oKiopICcsXG5cdFx0XHRcdFx0XHRcdGNvZGU6ICcuey4ufSAnLFxuXHRcdFx0XHRcdFx0XHRkZWJ1ZzE6ICcuW2RlYnVnMV0gJyxcblx0XHRcdFx0XHRcdFx0ZGVidWcyOiAnLltkZWJ1ZzJdICcsXG5cdFx0XHRcdFx0XHRcdGRlYnVnMzogJy5bZGVidWczXSAnLFxuXHRcdFx0XHRcdFx0XHR2ZXJib3NlMTogJy4ob28pICcsXG5cdFx0XHRcdFx0XHRcdHZlcmJvc2UyOiAnLihvbykgJyxcblx0XHRcdFx0XHRcdFx0dmVyYm9zZTM6ICcuW29vXSAnLFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKCBjYWxsYmFjayApXG5cdFx0XHRjYWxsYmFjayggdGhpcy5jb25maWdzWyB0eXBlIF0gKVxuXHRcdHJldHVybiB0aGlzLmNvbmZpZ3NbIHR5cGUgXTtcblx0fVxuXHRhc3luYyBnZXREZWZhdWx0UGF0aHMoKVxuXHR7XG5cdFx0dmFyIHBhdGhzID0ge1xuXHRcdFx0d2luMzI6IHt9LFxuXHRcdFx0ZGFyd2luOiB7fSxcblx0XHRcdGxpbnV4OiB7fSxcblx0XHRcdGFuZHJvaWQ6IHt9LFxuXHRcdFx0aU9TOiB7fVx0fTtcblx0XHR2YXIgdXNlckRpciA9IGF3YWl0IHRoaXMuYXdpLnN5c3RlbS5nZXRTeXN0ZW1JbmZvcm1hdGlvbiggJ3VzZXJEaXInICk7XG5cdFx0dmFyIGRyaXZlcyA9IGF3YWl0IHRoaXMuYXdpLnN5c3RlbS5nZXRTeXN0ZW1JbmZvcm1hdGlvbiggJ2RyaXZlcycgKTtcblx0XHRmb3IgKCB2YXIgZCA9IDA7IGQgPCBkcml2ZXMubGVuZ3RoOyBkKysgKVxuXHRcdFx0ZHJpdmVzWyBkIF0gPSBkcml2ZXNbIGQgXSArICc6Lyc7XG5cdFx0dmFyIHBsYXRmb3JtID0gYXdhaXQgdGhpcy5hd2kuc3lzdGVtLmdldFN5c3RlbUluZm9ybWF0aW9uKCAncGxhdGZvcm0nICk7XG5cdFx0c3dpdGNoICggcGxhdGZvcm0gKVxuXHRcdHtcblx0XHRcdGNhc2UgJ3dpbjMyJzpcblx0XHRcdFx0cGF0aHMud2luMzIuaW1hZ2UgPSBbIHVzZXJEaXIgKyAnL1BpY3R1cmVzJyBdO1xuXHRcdFx0XHRwYXRocy53aW4zMi5zb3VuZCA9IFtdO1xuXHRcdFx0XHRwYXRocy53aW4zMi52aWRlbyA9IFsgdXNlckRpciArICcvVmlkZW9zJyBdO1xuXHRcdFx0XHRwYXRocy53aW4zMi5tdXNpYyA9IFsgdXNlckRpciArICcvTXVzaWMnIF07XG5cdFx0XHRcdHBhdGhzLndpbjMyLmRvY3VtZW50ID0gWyB1c2VyRGlyICsgJy9Eb2N1bWVudHMnIF07XG5cdFx0XHRcdHBhdGhzLndpbjMyLnByZXNlbnRhdGlvbiA9IFsgdXNlckRpciArICcvRG9jdW1lbnRzJyBdO1xuXHRcdFx0XHRwYXRocy53aW4zMi5qc29uID0gW107XG5cdFx0XHRcdHBhdGhzLndpbjMyLnNvdXJjZSA9IFtdO1xuXHRcdFx0XHRwYXRocy53aW4zMi5hcHBsaWNhdGlvbiA9IFsgJ0M6L1Byb2dyYW0gRmlsZXMnLCAnQzovUHJvZ3JhbSBGaWxlcyAoeDg2KScgXTtcblx0XHRcdFx0cGF0aHMud2luMzIuYWNjZXNzb3J5ID0gWyAnQzovQU9aX1N0dWRpby9BT1pfU3R1ZGlvL2Fvei9hcHAvYW96YWNjJyBdO1xuXHRcdFx0XHRwYXRocy53aW4zMi5maWxlID0gZHJpdmVzO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2Rhcndpbic6XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnbGludXgnOlxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2FuZHJvaWQnOlxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2lPUyc6XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0XHRyZXR1cm4gcGF0aHM7XG5cdH1cblx0Z2V0UHJvbXB0KCB0eXBlIClcblx0e1xuXHRcdHR5cGUgPSAoIHR5cGVvZiB0eXBlID09ICd1bmRlZmluZWQnID8gJ2F3aScgOiB0eXBlICk7XG5cblx0XHQvLyBEZWJ1ZyBwcm9tcHRzXG5cdFx0aWYgKCB0eXBlID09ICdzeXN0ZW13YXJuaW5nJyApXG5cdFx0XHRyZXR1cm4gJyogV2FybmluZzogJztcblx0XHRpZiAoIHR5cGUgPT0gJ3N5c3RlbWVycm9yJyApXG5cdFx0XHRyZXR1cm4gJyogRVJST1IhICc7XG5cdFx0aWYgKCB0eXBlLmluZGV4T2YoICdkZWJ1ZycgKSA9PSAwIClcblx0XHR7XG5cdFx0XHR2YXIgbGV2ZWwgPSBwYXJzZUludCggdHlwZS5zdWJzdHJpbmcoIDUgKSApO1xuXHRcdFx0aWYgKCBsZXZlbCA+IDAgJiYgbGV2ZWwgPD0gMyApXG5cdFx0XHR7XG5cdFx0XHRcdGlmICggbGV2ZWwgPD0gdXNlckNvbmZpZy5kZWJ1ZyApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb25maWdzWyAnc3lzdGVtJyBdLnByb21wdHNbIHR5cGUgXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoIHRoaXMudXNlciA9PSAnJyApXG5cdFx0e1xuXHRcdFx0dmFyIHByb21wdCA9IHRoaXMuY29uZmlncy5zeXN0ZW0ucHJvbXB0c1sgdHlwZSBdO1xuXHRcdFx0aWYgKCBwcm9tcHQgIClcblx0XHRcdFx0cmV0dXJuIHByb21wdDtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblxuXHRcdC8vIFRyeSBtYWluIHByb21wdHNcblx0XHR2YXIgdXNlckNvbmZpZyA9IHRoaXMuY29uZmlnc1sgdGhpcy51c2VyIF07XG5cdFx0dmFyIGNvbmZpZyA9IHRoaXMuY29uZmlnc1sgJ3BlcnNvbmFsaXR5LScgKyB1c2VyQ29uZmlnLnBlcnNvbmFsaXR5IF07XG5cdFx0aWYgKCBjb25maWcgJiYgY29uZmlnLnByb21wdHNbIHR5cGUgXSApXG5cdFx0XHRyZXR1cm4gY29uZmlnLnByb21wdHNbIHR5cGUgXTtcblxuXHRcdGlmICggIXRoaXMuY29uZmlnc1sgdHlwZSBdIClcblx0XHR7XG5cdFx0XHRmb3IgKCB2YXIgdiA9IHVzZXJDb25maWcudmVyYm9zZTsgdiA+PSAxOyB2LS0gKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgZm91bmQgPSB1c2VyQ29uZmlnLnZlcmJvc2VQcm9tcHRzWyAndmVyYm9zZScgKyB2IF0uZmluZChcblx0XHRcdFx0XHRmdW5jdGlvbiggZWxlbWVudCApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cmV0dXJuIGVsZW1lbnQgPT0gdHlwZTtcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdGlmICggZm91bmQgKVxuXHRcdFx0XHRcdHJldHVybiBjb25maWcucHJvbXB0c1sgJ3ZlcmJvc2UnICsgdiBdO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIHVzZXJDb25maWcuZGVidWcgPiAwIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGZvdW5kID0gdXNlckNvbmZpZy5kZWJ1Z1Byb21wdHNbICdkZWJ1ZycgKyB1c2VyQ29uZmlnLmRlYnVnIF0uZmluZChcblx0XHRcdFx0XHRmdW5jdGlvbiggZWxlbWVudCApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cmV0dXJuIGVsZW1lbnQgPT0gJ2FsbCcgfHwgZWxlbWVudCA9PSB0eXBlO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0aWYgKCBmb3VuZCApXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY29uZmlnc1sgJ3N5c3RlbScgXS5wcm9tcHRzWyAnZGVidWcnICsgdXNlckNvbmZpZy5kZWJ1ZyBdO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cdGdldENvbmZpZ1R5cGVzKCB0eXBlIClcblx0e1xuXHRcdHZhciByZXN1bHQgPSB7IG9yaWdpbmFsVHlwZTogdHlwZSwgdHlwZTogJycgfTtcblx0XHR2YXIgcG9zID0gdHlwZS5pbmRleE9mKCAnLScgKTtcblx0XHRpZiAoIHBvcyA+PSAwIClcblx0XHRcdHJlc3VsdC5vcmlnaW5hbFR5cGUgPSB0eXBlLnN1YnN0cmluZyggMCwgcG9zICk7XG5cdFx0aWYgKCB0eXBlID09ICd1c2VyJyApXG5cdFx0e1xuXHRcdFx0dHlwZSA9IHRoaXMudXNlcjtcblx0XHRcdGlmICggdHlwZSA9PSAnJyApXG5cdFx0XHRcdHR5cGUgPSAndXNlci1kZWZhdWx0Jztcblx0XHR9XG5cdFx0ZWxzZSBpZiAoIHR5cGUgPT0gJ3BlcnNvbmFsaXR5JyApXG5cdFx0e1xuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZ3NbIHRoaXMudXNlciBdIClcblx0XHRcdFx0dHlwZSA9ICdwZXJzb25hbGl0eS0nICsgdGhpcy5jb25maWdzWyB0aGlzLnVzZXIgXS5wZXJzb25hbGl0eTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0dHlwZSA9ICdwZXJzb25hbGl0eS0nICsgJ2RlZmF1bHRwZXJzb25hbGl0eSc7XG5cdFx0fVxuXHRcdHJlc3VsdC50eXBlID0gdHlwZTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cdGdldFBlcnNvbmFsaXR5KCBuYW1lIClcblx0e1xuXHRcdGlmICggdHlwZW9mIG5hbWUgPT0gJ3VuZGVmaW5lZCcgfHwgIW5hbWUgKVxuXHRcdFx0bmFtZSA9IHRoaXMuY29uZmlnc1sgdGhpcy51c2VyIF0ucGVyc29uYWxpdHk7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0Q29uZmlnKCAncGVyc29uYWxpdHktJyArIG5hbWUgKTtcblx0fVxuXHRnZXRVc2VyS2V5KClcblx0e1xuXHRcdHZhciBjb25maWcgPSB0aGlzLmdldENvbmZpZyggJ3VzZXInICk7XG5cdFx0aWYgKCBjb25maWcgKVxuXHRcdFx0cmV0dXJuIGNvbmZpZy5haUtleTtcblx0XHRyZXR1cm4gJyc7XG5cdH1cblx0c2V0VmVyYm9zZSggdmVyYm9zZSApXG5cdHtcblx0XHR0aGlzLmdldENvbmZpZyggJ3VzZXInICkudmVyYm9zZSA9IE1hdGgubWF4KCBNYXRoLm1pbiggMywgdmVyYm9zZSApLCAxICk7XG5cdH1cblx0Z2V0U2VydmVyVXJsKClcblx0e1xuXHRcdGlmICggdGhpcy5nZXRDb25maWcoICdzeXN0ZW0nICkuZGlyZWN0Q29ubmVjdGlvbiApXG5cdFx0XHRyZXR1cm47XG5cdFx0aWYgKCB0aGlzLmdldENvbmZpZyggJ3VzZXInICkubG9jYWxTZXJ2ZXIgKVxuXHRcdFx0cmV0dXJuICd3czovL2xvY2FsaG9zdDo4NzY1Jztcblx0XHRyZXR1cm4gdGhpcy5jb25maWdzWyAnc3lzdGVtJyBdLnNlcnZlclVybDtcblx0fVxuXHRnZXRTeXN0ZW0oKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuY29uZmlnc1sgJ3N5c3RlbScgXTtcblx0fVxuXHRnZXREZWJ1ZygpXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5nZXRDb25maWcoICd1c2VyJyApLmRlYnVnO1xuXHR9XG5cdHNldERlYnVnKCBkZWJ1ZyApXG5cdHtcblx0XHRpZiAoIHRoaXMuZ2V0Q29uZmlnKCAndXNlcicgKS5kZWJ1ZyAhPSBkZWJ1ZyApXG5cdFx0e1xuXHRcdFx0aWYgKCBkZWJ1ZyA+PSAwICYmIGRlYnVnIDw9IDMgKVxuXHRcdFx0XHR0aGlzLmdldENvbmZpZyggJ3VzZXInICkuZGVidWcgPSBkZWJ1Zztcblx0XHR9XG5cdH1cblx0ZGVncmVlVG9SYWRpYW4oIGFuZ2xlIClcblx0e1xuXHRcdGlmICggdGhpcy5nZXRDb25maWcoICd1c2VyJyApLmlzRGVncmVlIClcblx0XHRcdHJldHVybiBhbmdsZSAqICggTWF0aC5QSSAvIDE4MC4wICk7XG5cdFx0cmV0dXJuIGFuZ2xlO1xuXHR9XG5cdHJhZGlhblRvRGVncmVlKCBhbmdsZSApXG5cdHtcblx0XHRpZiAoIHRoaXMuZ2V0Q29uZmlnKCAndXNlcicgKS5pc0RlZ3JlZSApXG5cdFx0XHRyZXR1cm4gYW5nbGUgKiAoIDE4MC4wIC8gTWF0aC5QSSApO1xuXHRcdHJldHVybiBhbmdsZTtcblx0fVxuXHRyb3VuZFZhbHVlKCB2YWx1ZSApXG5cdHtcblx0XHRpZiAoIHZhbHVlID09PSBmYWxzZSB8fCB2YWx1ZSA9PT0gdHJ1ZSApXG5cdFx0XHRyZXR1cm4gdmFsdWU7XG5cblx0XHR2YXIgZml4ID0gdGhpcy5nZXRDb25maWcoICd1c2VyJyApLmZpeDtcblx0XHR2YXIgZGVjaW1hbFBhcnQgPSB2YWx1ZSAtIE1hdGguZmxvb3IoIHZhbHVlICk7XG5cdFx0dmFyIHJlc3VsdDtcblx0XHRmaXggPSB0eXBlb2YgZml4ID09ICd1bmRlZmluZWQnID8gdGhpcy5maXggOiBmaXg7XG5cdFx0aWYgKCBmaXggPT0gMTYgfHwgZGVjaW1hbFBhcnQgPT0gMCApXG5cdFx0XHRyZXN1bHQgPSAnJyArIHZhbHVlO1xuXHRcdGVsc2UgaWYgKCBmaXggPj0gMCApXG5cdFx0XHRyZXN1bHQgPSB2YWx1ZS50b0ZpeGVkKCBmaXggKTtcblx0XHRlbHNlXG5cdFx0XHRyZXN1bHQgPSB2YWx1ZS50b0V4cG9uZW50aWFsKCAtZml4ICk7XG5cblx0XHQvLyBGaXggLTAuMDAgcHJvYmxlbS4uLlxuXHRcdGlmICggcmVzdWx0LnN1YnN0cmluZyggMCwgMyApID09ICctMC4nIClcblx0XHR7XG5cdFx0XHR2YXIgb25seVplcm9zID0gdHJ1ZTtcblx0XHRcdGZvciAoIHZhciBwID0gMDsgcCA8IHJlc3VsdC5sZW5ndGg7IHArKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBjID0gcmVzdWx0LmNoYXJBdCggcCApO1xuXHRcdFx0XHRpZiAoIGMgPj0gJzEnICYmIGMgPD0gJzknIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG9ubHlaZXJvcyA9IGZhbHNlO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIG9ubHlaZXJvcyApXG5cdFx0XHRcdHJlc3VsdCA9IHJlc3VsdC5zdWJzdHJpbmcoIDEgKTtcblx0XHR9XG5cdFx0Ly8gT25seSAwIGFmdGVyIGRvdD9cblx0XHR2YXIgZG90ID0gcmVzdWx0LmluZGV4T2YoICcuJyApO1xuXHRcdGlmICggZG90ID49IDAgKVxuXHRcdHtcblx0XHRcdGRvdCsrO1xuXHRcdFx0dmFyIG51bCA9IHRydWU7XG5cdFx0XHR3aGlsZSggZG90IDwgcmVzdWx0Lmxlbmd0aCApXG5cdFx0XHR7XG5cdFx0XHRcdGlmICggcmVzdWx0LmNoYXJBdCggZG90ICkgIT0gJzAnIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG51bCA9IGZhbHNlO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRvdCsrO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBudWwgKVxuXHRcdFx0XHRyZXN1bHQgPSByZXN1bHQuc3Vic3RyaW5nKCAwLCBkb3QgKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQ29uZmlnID0gQ29uZmlnO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcIFsgIF1bICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsIEFzc2lzdGFudFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyBbX3wgfF9dIFxcICAgICBsaW5rOlxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLW1lc3NhZ2VzLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBMb2FkIGFuZCByZXR1cm4gc3lzdGVtIG1lc3NhZ2VzXG4qXG4qL1xuY2xhc3MgTWVzc2FnZXNcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyApXG5cdHtcblx0XHR0aGlzLmF3aSA9IGF3aTtcblx0XHR0aGlzLm9DbGFzcyA9ICdtZXNzYWdlcyc7XG5cdFx0dGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuXHR9XG5cdGFzeW5jIGxvYWRNZXNzYWdlcygpXG5cdHtcblx0XHQvLyBMb2FkIHRleHRzXG5cdFx0dmFyIHBhdGggPSB0aGlzLmF3aS5jb25maWcuZ2V0RW5naW5lUGF0aCgpICsgJy9kYXRhL2VuLnR4dCc7XG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLnN5c3RlbS5yZWFkRmlsZSggcGF0aCwgeyBlbmNvZGluZzogJ3V0ZjgnIH0gKTtcblx0XHR0aGlzLnByb21wdHMgPSBhbnN3ZXIuZGF0YS5zcGxpdCggJ1xcclxcbicgKS5qb2luKCAnXFxuJyApO1xuXHR9XG5cdGdldFRleHQoIGlkIClcblx0e1xuXHRcdHZhciBzdGFydCA9IHRoaXMucHJvbXB0cy5pbmRleE9mKCBpZCArICc6JyApICsgMTtcblx0XHR3aGlsZSAoIHRoaXMucHJvbXB0cy5jaGFyQ29kZUF0KCBzdGFydCApID49IDMyIClcblx0XHRcdHN0YXJ0Kys7XG5cdFx0d2hpbGUgKCB0aGlzLnByb21wdHMuY2hhckNvZGVBdCggc3RhcnQgKSA8IDMyIClcblx0XHRcdHN0YXJ0Kys7XG5cdFx0dmFyIGVuZCA9IHRoaXMucHJvbXB0cy5pbmRleE9mKCAnOjo6Jywgc3RhcnQgKTtcblx0XHRyZXR1cm4gdGhpcy5wcm9tcHRzLnN1YnN0cmluZyggc3RhcnQsIGVuZCApLnNwbGl0KCAnXFxyXFxuJyApLmpvaW4oICdcXG4nICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLk1lc3NhZ2VzID0gTWVzc2FnZXM7IiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcIFsgIF1bICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsIEFzc2lzdGFudFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyBbX3wgfF9dIFxcICAgICBsaW5rOlxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLXBlcnNvbmFsaXR5LmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBIYW5kbGUgdmFyaW91cyBwZXJzb25hbGl0aWVzIC8gY3JlYXRlIGFkYXB0ZWQgcHJvbXB0c1xuKlxuKi9cblxuY2xhc3MgUGVyc29uYWxpdHlcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHRoaXMuYXdpID0gYXdpO1xuXHRcdHRoaXMubmFtZSA9ICdBd2knO1xuXHRcdHRoaXMub0NsYXNzID0gJ3BlcnNvbmFsaXR5Jztcblx0XHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXHRcdHRoaXMuY3VycmVudFByb21wdCA9ICdwcm9tcHQtZ2VuZXJpYyc7XG5cblx0XHR0aGlzLm1lbW9yaWVzID0ge307XG5cdFx0dGhpcy5tZW1vcmllc1sgJ2F1ZGlvcycgXSA9IG5ldyB0aGlzLmF3aS5uZXdNZW1vcmllcy5nZW5lcmljLmF1ZGlvcyggdGhpcy5hd2ksIHsga2V5OiB0aGlzLmF3aS51dGlsaXRpZXMuZ2V0VW5pcXVlSWRlbnRpZmllcigge30sICdhdWRpb3MnLCAwICksIHBhcmVudDogJycgfSApO1xuXHRcdHRoaXMubWVtb3JpZXNbICdjb252ZXJzYXRpb25zJyBdID0gbmV3IHRoaXMuYXdpLm5ld01lbW9yaWVzLmdlbmVyaWMuY29udmVyc2F0aW9ucyggdGhpcy5hd2ksIHsga2V5OiB0aGlzLmF3aS51dGlsaXRpZXMuZ2V0VW5pcXVlSWRlbnRpZmllcigge30sICdjb252ZXJzYXRpb25zJywgMSApLCBwYXJlbnQ6ICcnIH0gKTtcblx0XHR0aGlzLm1lbW9yaWVzWyAnZG9jdW1lbnRzJyBdID0gbmV3IHRoaXMuYXdpLm5ld01lbW9yaWVzLmdlbmVyaWMuZG9jdW1lbnRzKCB0aGlzLmF3aSwgeyBrZXk6IHRoaXMuYXdpLnV0aWxpdGllcy5nZXRVbmlxdWVJZGVudGlmaWVyKCB7fSwgJ2RvY3VtZW50cycsIDIgKSwgcGFyZW50OiAnJyB9ICk7XG5cdFx0dGhpcy5tZW1vcmllc1sgJ2ltYWdlcycgXSA9IG5ldyB0aGlzLmF3aS5uZXdNZW1vcmllcy5nZW5lcmljLmltYWdlcyggdGhpcy5hd2ksIHsga2V5OiB0aGlzLmF3aS51dGlsaXRpZXMuZ2V0VW5pcXVlSWRlbnRpZmllcigge30sICdpbWFnZXMnLCAzICksIHBhcmVudDogJycgfSApO1xuXHRcdHRoaXMubWVtb3JpZXNbICdtYWlscycgXSA9IG5ldyB0aGlzLmF3aS5uZXdNZW1vcmllcy5nZW5lcmljLm1haWxzKCB0aGlzLmF3aSwgeyBrZXk6IHRoaXMuYXdpLnV0aWxpdGllcy5nZXRVbmlxdWVJZGVudGlmaWVyKCB7fSwgJ21haWxzJywgNCApLCBwYXJlbnQ6ICcnIH0gKTtcblx0XHR0aGlzLm1lbW9yaWVzWyAnbWVzc2VuZ2VyJyBdID0gbmV3IHRoaXMuYXdpLm5ld01lbW9yaWVzLmdlbmVyaWMubWVzc2VuZ2VyKCB0aGlzLmF3aSwgeyBrZXk6IHRoaXMuYXdpLnV0aWxpdGllcy5nZXRVbmlxdWVJZGVudGlmaWVyKCB7fSwgJ21lc3NlbmdlcicsIDUgKSwgcGFyZW50OiAnJyB9ICk7XG5cdFx0dGhpcy5tZW1vcmllc1sgJ3Bob3RvcycgXSA9IG5ldyB0aGlzLmF3aS5uZXdNZW1vcmllcy5nZW5lcmljLnBob3RvcyggdGhpcy5hd2ksIHsga2V5OiB0aGlzLmF3aS51dGlsaXRpZXMuZ2V0VW5pcXVlSWRlbnRpZmllcigge30sICdwaG90b3MnLCA2ICksIHBhcmVudDogJycgfSApO1xuXHRcdHRoaXMubWVtb3JpZXNbICd2aWRlb3MnIF0gPSBuZXcgdGhpcy5hd2kubmV3TWVtb3JpZXMuZ2VuZXJpYy52aWRlb3MoIHRoaXMuYXdpLCB7IGtleTogdGhpcy5hd2kudXRpbGl0aWVzLmdldFVuaXF1ZUlkZW50aWZpZXIoIHt9LCAndmlkZW9zJywgNyApLCBwYXJlbnQ6ICcnIH0gKTtcblxuXHRcdHRoaXMucHJvbXB0cyA9XG5cdFx0e1xuJ3Byb21wdC1oZWxsbyc6IGBcbllvdXIgbmFtZSBpcyB7bmFtZX0uXG4tIFlvdSBhcmUge3lvdUFyZX0ge3dob1VzZXN9IHt0aGVQcm9kdWN0fS5cbi0gWW91IHt1c2VUaGVQcm9kdWN0fSB7dG9Eb1NvbWV0aGluZ30uXG4tIFlvdSBhbnN3ZXIgYWxsIHF1ZXN0aW9ucyBpbiB7bW9vZH0uXG5QbGVhc2Ugc2F5IGhlbGxvIHRvIHRoZSB1c2VyIHt1c2VyfSBpbiBhIGZ1biBhbmQgc2hvcnQgc2VudGVuY2UuLi5cbmAsXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuJ3Byb21wdC1nZW5lcmljIzEnOiBgXG5Zb3VyIG5hbWUgaXMge25hbWV9LlxuLSBZb3UgYXJlIHt5b3VBcmV9IHt3aG9Vc2VzfSB7dGhlUHJvZHVjdH0uXG4tIFlvdSB7dXNlVGhlUHJvZHVjdH0ge3RvRG9Tb21ldGhpbmd9LlxuLSBZb3UgYW5zd2VyIGFsbCBxdWVzdGlvbnMgaW4ge21vb2R9LlxuYCxcbidwcm9tcHQtZ2VuZXJpYyMyJzogYFxuLSBZb3UgYXJlIHt5b3VBcmV9IHt3aG9Vc2VzfSB7dGhlUHJvZHVjdH0uXG4tIFlvdSB7dXNlVGhlUHJvZHVjdH0ge3RvRG9Tb21ldGhpbmd9LlxuLSBZb3UgYW5zd2VyIGFsbCBxdWVzdGlvbnMgaW4ge21vb2R9LlxuYCxcbidwcm9tcHQtZ2VuZXJpYyNsYXN0JzogYFxuLSBZb3UgYXJlIHt5b3VBcmV9IHt3aG9Vc2VzfSB7dGhlUHJvZHVjdH0uXG4tIFlvdSB7dXNlVGhlUHJvZHVjdH0ge3RvRG9Tb21ldGhpbmd9LlxuLSBZb3UgYW5zd2VyIGFsbCBxdWVzdGlvbnMgaW4ge21vb2R9LlxuYCxcbidwcm9tcHQtZ2VuZXJpYy10YWtlTm90ZSc6IGBcbi0gVGFrZSBub3RlOiB7dGFrZU5vdGV9Li4uXG5gLFxuJ3Byb21wdC1nZW5lcmljLWNvbnRleHQnOiBgXG5QbGVhc2UgdGFrZSB0aGUgZm9sbG93aW5nIGNvbnRleHQgaW50byBjb25zaWRlcmF0aW9uIGJlZm9yZSBleGVjdXRpbmcgdGhlIHRhc2suIENvbnRleHQ6XG4xLiBUaGUgdGFzayBpcyByZWxhdGVkIHRvIFwie3RvRG9Tb21ldGhpbmd9XCIuXG57Y29udGV4dH1cbmAsXG4ncHJvbXB0LWdlbmVyaWMtY29udmVyc2F0aW9uJzpgXG5QbGVhc2UgcmVhZCBmaXJzdCB0aGUgY29udmVyc2F0aW9uIHdpdGggdGhlIHVzZXIuIENvbnZlcnNhdGlvbjpcbntjb252ZXJzYXRpb259XG5gLFxuJ3Byb21wdC1nZW5lcmljLW1lbW9yaWVzJzpgXG5IZXJlIGFyZSBzb21lIG1lbW9yaWVzIGFib3V0IHRoZSBzdWJqZWN0LCBwbGVhc2UgY29uc2lkZXIgdGhlbSBpbiB5b3VyIHJlc3BvbnNlLiBNZW1vcmllczpcbnttZW1vcmllc31cbmAsXG4ncHJvbXB0LWdlbmVyaWMtdGFzay1xdWVzdGlvbiMxJzpgXG5Ob3cgdGhlIHRhc2s6XG5BbnN3ZXIgcXVlc3Rpb246IHt0YXNrLXF1ZXN0aW9ufVxuYCxcbidwcm9tcHQtZ2VuZXJpYy10YXNrLXF1ZXN0aW9uIzInOmBcbk5vdyB0aGUgdGFzazpcbkFuc3dlciBxdWVzdGlvbjoge3Rhc2stcXVlc3Rpb259XG5gLFxuJ3Byb21wdC1nZW5lcmljLXRhc2stcXVlc3Rpb24jbGFzdCc6YFxuTm93IHRoZSB0YXNrOlxuQW5zd2VyIHF1ZXN0aW9uOiB7dGFzay1xdWVzdGlvbn1cbmAsXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbidjb2RlJzpgXG5Zb3VyIG5hbWUgaXMge25hbWV9LlxuMS4gWW91IGFyZSBhIHByb2dyYW1taW5nIGFzc2lzdGFudCB0aGF0IHVzZXMge2xhbmd1YWdlfSBleGNsdXNpdmVseS5cbjIuIFRoZSBjb2RlIHlvdSB3cml0ZSBzaG91bGQgcnVuIHtjb2RlRGVzdGluYXRpb259LlxuMy4gWW91ciBnb2FsIGlzIHRvIGNyZWF0ZSBhIGZ1bmN0aW9uIHRoYXQgc3RpY2tzIHRvIHRoZSByZXF1aXJlbWVudHMuXG5QbGVhc2UgdGFrZSB0aGUgZm9sbG93aW5nIHJlcXVpcmVtZW50cyBpbnRvIGNvbnNpZGVyYXRpb24gYmVmb3JlIGV4ZWN1dGluZyB0aGUgdGFzazpcblJlcXVpcmVtZW50czpcbjEuIFlvdSBzaG91bGQgY3JlYXRlIGEgSmF2YXNjcmlwdCBmdW5jdGlvbi5cbjIuIFN0YXJ0IHRoZSBjb2RlIHNlY3Rpb24gd2l0aCAnPFNUQVJULUNPREU+JyBhbmQgZW5kIGl0IHdpdGggJzxFTkQtQ09ERT4nLlxuMy4gWW91IHNob3VsZCBub3QgdXNlIGFueSBhc3luYyBjb2RlIGJ1dCBhIGNhbGxiYWNrIGlmIG5lY2Vzc2FyeS5cbjQuIFRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbiBpczoge2Z1bmN0aW9uTmFtZX1cbjUuIFRoZSBsaXN0IG9mIHBhcmFtZXRlcnMgaXM6IHtwYXJhbWV0ZXJzfVxuVGFzazpcblBsZWFzZSBjcmVhdGUgSmF2YXNjcmlwdCBjb2RlIGJhc2VkIG9uIHRoaXMgZGVzY3JpcHRpb246XG57ZGVzY3JpcHRpb259XG5Ob3cgdGhlIGNvZGU6XG5gLFxuJ2NvZGUtcmV0dXJucyc6IGBcbkl0IHJldHVybnMgYFxuXHRcdH1cblx0fVxuXHRzZXRQcm9tcHQoIHByb21wdCApXG5cdHtcblx0XHRpZiAoIHRoaXMucHJvbXB0c1sgcHJvbXB0IF0gfHwgdGhpcy5wcm9tcHRzWyBwcm9tcHQgKyAnIzEnIF0gKVxuXHRcdHtcblx0XHRcdHRoaXMuY3VycmVudFByb21wdCA9IHByb21wdDtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0c2V0VGVtcGVyYXR1cmUoIHRlbXBlcmF0dXJlIClcblx0e1xuXHRcdGlmICggdGVtcGVyYXR1cmUgPCAwIClcblx0XHRcdHRoaXMudGVtcGVyYXR1cmUgPSB0aGlzLmF3aS5nZXRQZXJzb25hbGl0eSgpLnRlbXBlcmF0dXJlO1xuXHRcdGVsc2Vcblx0XHRcdHRoaXMudGVtcGVyYXR1cmUgPSB0ZW1wZXJhdHVyZTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRhc3luYyByZW1lbWJlciggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgcmVzdWx0ID0ge1xuXHRcdFx0ZGlyZWN0OiB7IHNvdXZlbmlyczogW10sIGNvbnRlbnQ6IFtdIH0sXG5cdFx0XHRpbmRpcmVjdDogeyBzb3V2ZW5pcnM6IFtdLCBjb250ZW50OiBbXSB9XG5cdFx0fTtcblx0XHRpZiAoIHBhcmFtZXRlcnMucGVyc29uLmxlbmd0aCA+IDAgKVxuXHRcdFx0bGluZSA9IHBhcmFtZXRlcnMucGVyc29uWyAwIF07XG5cdFx0aWYgKCBwYXJhbWV0ZXJzLndoYXQgPT0gJ2FueScgKVxuXHRcdHtcblx0XHRcdGZvciAoIHZhciBrIGluIHRoaXMubWVtb3JpZXMgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5tZW1vcmllc1sgayBdLmZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRcdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyA9PSAnZm91bmQnIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHJlc3VsdC5kaXJlY3Quc291dmVuaXJzLnB1c2goIC4uLmFuc3dlci5kYXRhLmRpcmVjdC5zb3V2ZW5pcnMgKTtcblx0XHRcdFx0XHRyZXN1bHQuZGlyZWN0LmNvbnRlbnQucHVzaCggLi4uYW5zd2VyLmRhdGEuZGlyZWN0LmNvbnRlbnQgKTtcblx0XHRcdFx0XHRyZXN1bHQuaW5kaXJlY3Quc291dmVuaXJzLnB1c2goIC4uLmFuc3dlci5kYXRhLmluZGlyZWN0LnNvdXZlbmlycyApO1xuXHRcdFx0XHRcdHJlc3VsdC5pbmRpcmVjdC5jb250ZW50LnB1c2goIC4uLmFuc3dlci5kYXRhLmluZGlyZWN0LmNvbnRlbnQgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0Zm9yICggdmFyIHcgPSAwOyB3IDwgcGFyYW1ldGVycy53aGF0Lmxlbmd0aDsgdysrIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIG1lbW9yeSA9IHRoaXMubWVtb3JpZXNbIHBhcmFtZXRlcnMud2hhdFsgdyBdIF07XG5cdFx0XHRcdG1lbW9yeSA9ICggdHlwZW9mIG1lbW9yeSA9PSAndW5kZWZpbmVkJyA/IHRoaXMubWVtb3JpZXNbIHBhcmFtZXRlcnMud2hhdFsgdyBdICsgJ3MnIF0gOiB0aGlzLm1lbW9yaWVzWyBwYXJhbWV0ZXJzLndoYXRbIHcgXSBdICk7XG5cdFx0XHRcdGlmICggbWVtb3J5IClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCBtZW1vcnkuZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdFx0XHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgPT0gJ2ZvdW5kJyApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cmVzdWx0LmRpcmVjdC5zb3V2ZW5pcnMucHVzaCggLi4uYW5zd2VyLmRhdGEuZGlyZWN0LnNvdXZlbmlycyApO1xuXHRcdFx0XHRcdFx0cmVzdWx0LmRpcmVjdC5jb250ZW50LnB1c2goIC4uLmFuc3dlci5kYXRhLmRpcmVjdC5jb250ZW50ICk7XG5cdFx0XHRcdFx0XHRyZXN1bHQuaW5kaXJlY3Quc291dmVuaXJzLnB1c2goIC4uLmFuc3dlci5kYXRhLmluZGlyZWN0LnNvdXZlbmlycyApO1xuXHRcdFx0XHRcdFx0cmVzdWx0LmluZGlyZWN0LmNvbnRlbnQucHVzaCggLi4uYW5zd2VyLmRhdGEuaW5kaXJlY3QuY29udGVudCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoIHJlc3VsdC5kaXJlY3Quc291dmVuaXJzLmxlbmd0aCArIHJlc3VsdC5pbmRpcmVjdC5zb3V2ZW5pcnMubGVuZ3RoID4gMCApXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiAnZm91bmQnLCBkYXRhOiByZXN1bHQgfTtcblx0XHRyZXR1cm4geyBzdWNjZXNzOiAnbm90Zm91bmQnIH07XG5cdH1cblx0Z2V0UHJvbXB0KCB0b2tlbiwgbmV3RGF0YSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdGlmICggdG9rZW4gPT0gJ2N1cnJlbnQnIClcblx0XHRcdHRva2VuID0gdGhpcy5jdXJyZW50UHJvbXB0O1xuXG5cdFx0dmFyIHRva2VuQ291bnQgPSAnJztcblx0XHR2YXIgdG9rZW5RdWVzdGlvbkNvdW50ID0gJyc7XG5cdFx0dmFyIHZhcmlhYmxlcyA9IHRoaXMuYXdpLnV0aWxpdGllcy5jb3B5T2JqZWN0KCB0aGlzLmF3aS5nZXRQZXJzb25hbGl0eSgpICk7XG5cdFx0aWYgKCB0aGlzLmF3aS5nZXRDb25maWcoICd1c2VyJyApLmZpcnN0TmFtZSA9PSAnJyApXG5cdFx0XHRyZXR1cm4gJyc7XG5cblx0XHR2YXJpYWJsZXMuZmlyc3ROYW1lID0gdGhpcy5hd2kuZ2V0Q29uZmlnKCAndXNlcicgKS5maXJzdE5hbWU7XG5cdFx0dmFyaWFibGVzLmxhc3ROYW1lID0gdGhpcy5hd2kuZ2V0Q29uZmlnKCAndXNlcicgKS5sYXN0TmFtZTtcblx0XHR2YXJpYWJsZXMuZnVsbE5hbWUgPSB0aGlzLmF3aS5nZXRDb25maWcoICd1c2VyJyApLmZ1bGxOYW1lO1xuXHRcdGlmICggdHlwZW9mIG9wdGlvbnMuYW5zd2VyQ291bnQgIT0gJ3VuZGVmaW5lZCcgKVxuXHRcdFx0dG9rZW5Db3VudCA9ICcjJyArIG9wdGlvbnMuYW5zd2VyQ291bnQ7XG5cdFx0aWYgKCB0eXBlb2Ygb3B0aW9ucy5hbnN3ZXJDb3VudCAhPSAndW5kZWZpbmVkJyApXG5cdFx0XHR0b2tlblF1ZXN0aW9uQ291bnQgPSAnIycgKyBvcHRpb25zLnF1ZXN0aW9uQ291bnQ7XG5cdFx0dmFyIHByb21wdCA9IHRoaXMucHJvbXB0c1sgdG9rZW4gKyB0b2tlbkNvdW50IF07XG5cdFx0aWYgKCAhcHJvbXB0IClcblx0XHR7XG5cdFx0XHRwcm9tcHQgPSB0aGlzLnByb21wdHNbIHRva2VuICsgJyNsYXN0JyBdO1xuXHRcdFx0aWYgKCAhcHJvbXB0IClcblx0XHRcdFx0cHJvbXB0ID0gdGhpcy5wcm9tcHRzWyB0b2tlbiBdO1xuXHRcdH1cblxuXHRcdGlmICggcHJvbXB0IClcblx0XHR7XG5cdFx0XHRmb3IgKCB2YXIgZCA9IDA7IGQgPCBuZXdEYXRhLmxlbmd0aDsgZCsrIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGRhdGEgPSBuZXdEYXRhWyBkIF07XG5cdFx0XHRcdHZhciBzdWJUb2tlbiA9IHRva2VuICsgJy0nICsgZGF0YS5uYW1lO1xuXHRcdFx0XHR2YXIgc3ViUHJvbXB0ID0gdGhpcy5wcm9tcHRzWyBzdWJUb2tlbiArIHRva2VuUXVlc3Rpb25Db3VudCBdO1xuXHRcdFx0XHRpZiAoICFzdWJQcm9tcHQgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0c3ViUHJvbXB0ID0gdGhpcy5wcm9tcHRzWyBzdWJUb2tlbiArICcjbGFzdCcgXTtcblx0XHRcdFx0XHRpZiAoICFzdWJQcm9tcHQgKVxuXHRcdFx0XHRcdFx0c3ViUHJvbXB0ID0gdGhpcy5wcm9tcHRzWyBzdWJUb2tlbiBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggc3ViUHJvbXB0IClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICggZGF0YS5uYW1lID09ICd0YWtlTm90ZScgfHwgZGF0YS5uYW1lID09ICdjb252ZXJzYXRpb24nIHx8IGRhdGEubmFtZSA9PSAnbWVtb3JpZXMnIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAoIGRhdGEuY29udGVudCApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGlmICggdGhpcy5wcm9tcHRzWyB0b2tlbiArICctJyArIGRhdGEubmFtZSBdIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHZhcmlhYmxlc1sgZGF0YS5uYW1lIF0gPSBkYXRhLmNvbnRlbnQ7XG5cdFx0XHRcdFx0XHRcdFx0cHJvbXB0ICs9IHN1YlByb21wdDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmICggZGF0YS5jb250ZW50ICE9ICcnIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR2YXJpYWJsZXNbIGRhdGEubmFtZSBdID0gZGF0YS5jb250ZW50O1xuXHRcdFx0XHRcdFx0cHJvbXB0ICs9IHN1YlByb21wdDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyaWFibGVzWyBkYXRhLm5hbWUgXSA9IGRhdGEuY29udGVudDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cHJvbXB0ID0gdGhpcy5hd2kudXRpbGl0aWVzLmZvcm1hdCggcHJvbXB0LCB2YXJpYWJsZXMgKTtcblx0XHR9XG5cdFx0cmV0dXJuIHByb21wdDtcblx0fVxuXHRnZXRNZW1vcnlQcm9tcHQoIG1lbW9yeUxpc3QsIHVzZXIsIGNvbnRhY3QsIG1heENvdW50ID0gNSApXG5cdHtcblx0XHR2YXIgY291bnQgPSBtYXhDb3VudDtcblx0XHR2YXIgY29udmVyc2F0aW9uID0gJyc7XG5cdFx0aWYgKCB1c2VyIClcblx0XHRcdHVzZXIgKz0gJyBzYWlkOidcblx0XHRpZiAoIGNvbnRhY3QgKVxuXHRcdFx0Y29udGFjdCArPSAnIHNhaWQ6J1xuXHRcdGZvciAoIHZhciBtID0gMDsgbSA8IG1lbW9yeUxpc3QubGVuZ3RoICYmIGNvdW50ID4gMDsgbSsrLCBjb3VudC0tIClcblx0XHR7XG5cdFx0XHR2YXIgbWVtb3J5ID0gbWVtb3J5TGlzdFsgbSBdO1xuXHRcdFx0Y29udmVyc2F0aW9uICs9ICctICcgKyB1c2VyICsgJ1wiJyArIG1lbW9yeS51c2VyVGV4dCArICdcIlxcbic7XG5cdFx0XHRjb252ZXJzYXRpb24gKz0gJy0gJyArIGNvbnRhY3QgKyAnXCInICsgbWVtb3J5LnJlY2VpdmVyVGV4dCArICdcIlxcbic7XG5cdFx0fVxuXHRcdHJldHVybiBjb252ZXJzYXRpb247XG5cdH1cblx0YXN5bmMgbG9hZE1lbW9yaWVzKCB0eXBlID0gJ2FueScpXG5cdHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0YXN5bmMgZnVuY3Rpb24gbG9hZE1lbW9yeSggdHlwZSApXG5cdFx0e1xuXHRcdFx0dmFyIHBhdGggPSBzZWxmLmF3aS5jb25maWcuZ2V0Q29uZmlndXJhdGlvblBhdGgoKSArICcvJyArIHNlbGYubmFtZS50b0xvd2VyQ2FzZSgpICsgJy0nICsgdHlwZSArICctJztcblx0XHRcdHZhciBtZW1vcnk7XG5cdFx0XHR2YXIgYW5zd2VyID0gYXdhaXQgc2VsZi5hd2kuc3lzdGVtLmV4aXN0cyggcGF0aCArICdtZW1vcnkuanMnICk7XG5cdFx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHRcdHtcblx0XHRcdFx0YW5zd2VyID0gYXdhaXQgc2VsZi5hd2kuc3lzdGVtLnJlYWRGaWxlKCBwYXRoICsgJ21lbW9yeS5qcycsIHsgZW5jb2Rpbmc6ICd1dGY4JyB9ICk7XG5cdFx0XHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bWVtb3J5ID0gYW5zd2VyLmRhdGE7XG5cdFx0XHRcdFx0dHJ5XG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bWVtb3J5ID0gRnVuY3Rpb24oIG1lbW9yeSApO1xuXHRcdFx0XHRcdFx0bWVtb3J5ID0gbWVtb3J5KCk7XG5cdFx0XHRcdFx0XHRtZW1vcnkgPSBzZWxmLmF3aS51dGlsaXRpZXMuc2VyaWFsaXplSW4oIG1lbW9yeS5yb290LCB7fSApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogbWVtb3J5IH07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoKCBlIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6Y2Fubm90LWxvYWQtbWVtb3J5Oml3YScgfTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnYXdpOmNhbm5vdC1sb2FkLW1lbW9yeTppd2EnIH07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG5cdFx0fVxuXHRcdHZhciBhbnN3ZXI7XG5cdFx0aWYgKCB0eXBlID09ICdhbnknIClcblx0XHR7XG5cdFx0XHRmb3IgKCB2YXIgdHlwZSBpbiB0aGlzLm1lbW9yaWVzIClcblx0XHRcdHtcblx0XHRcdFx0YW5zd2VyID0gYXdhaXQgbG9hZE1lbW9yeSggdHlwZSApO1xuXHRcdFx0XHRpZiAoICFhbnN3ZXIuc3VjY2VzcyApXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGlmICggYW5zd2VyLmRhdGEgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5tZW1vcmllc1sgdHlwZSBdID0gdGhpcy5hd2kuaW5pdE1lbW9yeSggYW5zd2VyLmRhdGEgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0YW5zd2VyID0gYXdhaXQgbG9hZE1lbW9yeSggdHlwZSApO1xuXHRcdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0XHR7XG5cdFx0XHRcdGlmICggYW5zd2VyLmRhdGEgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5tZW1vcmllc1sgdHlwZSBdID0gdGhpcy5hd2kuaW5pdE1lbW9yeSggYW5zd2VyLmRhdGEgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gYW5zd2VyO1xuXHR9XG5cdGFzeW5jIHNhdmVNZW1vcmllcyggdHlwZSA9ICdhbnknIClcblx0e1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRhc3luYyBmdW5jdGlvbiBzYXZlTWVtb3J5KCB0eXBlIClcblx0XHR7XG5cdFx0XHRpZiAoIHNlbGYubWVtb3JpZXNbIHR5cGUgXSApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBtZW1vcmllcyA9IHNlbGYuYXdpLnV0aWxpdGllcy5zZXJpYWxpemVPdXQoIHNlbGYubWVtb3JpZXNbIHR5cGUgXSwgJycgKTtcblx0XHRcdFx0dmFyIHBhdGggPSBzZWxmLmF3aS5jb25maWcuZ2V0Q29uZmlndXJhdGlvblBhdGgoKSArICcvJyArIHNlbGYubmFtZS50b0xvd2VyQ2FzZSgpICsgJy0nICsgdHlwZSArICctJztcblx0XHRcdFx0cmV0dXJuIGF3YWl0IHNlbGYuYXdpLnN5c3RlbS53cml0ZUZpbGUoIHBhdGggKyAnbWVtb3J5LmpzJywgbWVtb3JpZXMsIHsgZW5jb2Rpbmc6ICd1dGY4JyB9ICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6bm8tbWVtb3J5LW9mLXR5cGU6aXdhJyB9O1xuXHRcdH1cblx0XHR2YXIgYW5zd2VyO1xuXHRcdGlmICggdHlwZSA9PSAnYW55JyApXG5cdFx0e1xuXHRcdFx0Zm9yICggdmFyIHR5cGUgaW4gdGhpcy5tZW1vcmllcyApXG5cdFx0XHR7XG5cdFx0XHRcdGFuc3dlciA9IGF3YWl0IHNhdmVNZW1vcnkoIHR5cGUgKTtcblx0XHRcdFx0aWYgKCAhYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0YW5zd2VyID0gYXdhaXQgc2F2ZU1lbW9yeSggdHlwZSApO1xuXHRcdH1cblx0XHRyZXR1cm4gYW5zd2VyO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5QZXJzb25hbGl0eSA9IFBlcnNvbmFsaXR5O1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcIFsgIF1bICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsIEFzc2lzdGFudFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyBbX3wgfF9dIFxcICAgICBsaW5rOlxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLXByb21wdC5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgSGFuZGxlIGEgcHJvbXB0IGluIHRoZSBjdXJyZW50IGVkaXRvclxuKlxuKi9cbnZhciBhd2licmFuY2ggPSByZXF1aXJlKCAnLi9idWJibGVzL2F3aS1icmFuY2gnICk7XG5cbmNsYXNzIFByb21wdFxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0dGhpcy5hd2kgPSBhd2k7XG5cdFx0dGhpcy5vQ2xhc3MgPSAncHJvbXB0Jztcblx0XHR0aGlzLnBsYXlpbmcgPSBmYWxzZTtcblx0XHR0aGlzLnZpZXdpbmcgPSBmYWxzZTtcblx0XHR0aGlzLmxpbmVBY3RpdmF0ZWQgPSBmYWxzZTtcblx0XHR0aGlzLnByb21wdE9uID0gZmFsc2U7XG5cdFx0dGhpcy5ub0NvbW1hbmQgPSBmYWxzZTtcblx0XHR0aGlzLndhaXRpbmdPbiA9IGZhbHNlO1xuXHRcdHRoaXMud2FpdGluZ0J1YmJsZSA9IGZhbHNlO1xuXHRcdHRoaXMuYW5pbWF0aW9uc09uID0gZmFsc2U7XG5cdFx0dGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcblx0XHR0aGlzLmRhdGFzID0geyB9O1xuXHRcdHRoaXMub3B0aW9ucyA9IHsgYXdpOiB7fSwgYnViYmxlOiB7fSB9O1xuXHRcdHRoaXMucHJvbXB0VGhpcyA9IHRoaXM7XG5cdFx0dGhpcy5xdWVzdGlvbkNvdW50ID0gMTtcblx0XHR0aGlzLmJyYW5jaCA9IG5ldyBhd2licmFuY2guQnJhbmNoKCB0aGlzLmF3aSwgeyBwYXJlbnQ6ICdwcm9tcHQnIH0gKVxuXHR9XG5cdGFzeW5jIHBsYXkoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIucGxheSggbGluZSwgZGF0YSwgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIHByb21wdCggbGluZSwgZGF0YSwgY29udHJvbCApXG5cdHtcblx0XHRpZiAoIHRoaXMuYnJhbmNoLndvcmtpbmcgfHwgdGhpcy5ub0NvbW1hbmQgKVxuXHRcdCBcdHJldHVybjtcblxuXHRcdGlmICggIXRoaXMucHJvbXB0T24gKVxuXHRcdHtcblx0XHRcdHRoaXMucHJvbXB0T24gPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAoIGNvbnRyb2wucHJpbnRQcm9tcHQgKVxuXHRcdHtcblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIGxpbmUuc3BsaXQoICdcXG4nICksIHsgdXNlcjogJ3VzZXInIH0gKTtcblx0XHRcdGNvbnRyb2wucHJpbnRQcm9tcHQgPSBmYWxzZTtcblx0XHR9XG5cdFx0Y29udHJvbC5lZGl0b3Iuc2VsZi5kaXNhYmxlSW5wdXQoIGNvbnRyb2wuZWRpdG9yICk7XG5cblx0XHRpZiAoICF0aGlzLmF3aS5jb25maWcuaXNVc2VyTG9nZ2VkKCkgKVxuXHRcdHtcblx0XHRcdHZhciBsb2dnZWQgPSBmYWxzZTtcblxuXHRcdFx0Ly8gSXMgaXQgdGhlIG5hbWUgb2YgYSB1c2VyP1xuXHRcdFx0dmFyIG1heWJlID0gLTE7XG5cdFx0XHRmb3IgKCB2YXIgc3RhcnQgPSAwOyBzdGFydCA8IGxpbmUubGVuZ3RoOyBzdGFydCsrIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIHR5cGUgPSB0aGlzLmF3aS51dGlsaXRpZXMuZ2V0Q2hhcmFjdGVyVHlwZSggbGluZS5jaGFyQXQoIHN0YXJ0ICkgKTtcblx0XHRcdFx0aWYgKCB0eXBlID09ICdsZXR0ZXInIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG1heWJlID0gc3RhcnQ7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICggbWF5YmUgPj0gMCApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciB1c2VyTmFtZSA9IGxpbmUuc3Vic3RyaW5nKCBtYXliZSApLnNwbGl0KCAnXFxuJyApWyAwIF0udHJpbSgpO1xuXHRcdFx0XHRpZiAoIHVzZXJOYW1lLnRvTG93ZXJDYXNlKCkgPT0gJ25ld3VzZXInIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxvZ2dlZCA9IHRydWU7XG5cdFx0XHRcdFx0bGluZSA9ICdXZWxjb21lJztcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIHRoaXMuYXdpLmNvbmZpZy5jaGVja1VzZXJDb25maWcoIHVzZXJOYW1lICkgIT0gbnVsbCApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kuY29uZmlnLnNldFVzZXIoIHVzZXJOYW1lLCBjb250cm9sICk7XG5cdFx0XHRcdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0YW5zd2VyID0gYXdhaXQgdGhpcy5hd2kubG9hZFVzZXIoIHVzZXJOYW1lICk7XG5cdFx0XHRcdFx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0bG9nZ2VkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0bGluZSA9ICdIZWxsbyBBd2kuLi4gQ291bGQgeW91IGZpcnN0IHNheSBoZWxsbyB0byB0aGUgdXNlciAnICsgdXNlck5hbWUgKyAnIHRoZW4gaW52ZW50IGEgZnVubnkgam9rZSBhYm91dCBwcm9ncmFtbWluZyBjaG9yZXM/Jztcblx0XHRcdFx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ1VzZXIgY2hhbmdlZCB0byAnICsgdXNlck5hbWUgKyAnXFxuJywgeyB1c2VyOiAnaW5mb3JtYXRpb24nIH0gKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ0Nhbm5vdCBsb2FkIG1lbW9yaWVzLi4uXFxuJywgeyB1c2VyOiAnZXJyb3InIH0gKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ0Nhbm5vdCBjaGFuZ2UgdXNlciB0byAnICsgdXNlck5hbWUgKyAnXFxuJywgeyB1c2VyOiAnZXJyb3InIH0gKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCAhbG9nZ2VkIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGxpc3QgPSB0aGlzLmF3aS5jb25maWcuZ2V0VXNlckxpc3QoKTtcblx0XHRcdFx0aWYgKCBsaXN0Lmxlbmd0aCA9PSAwIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxpbmUgPSAnV2VsY29tZSc7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ0xpc3Qgb2YgcmVnaXN0ZXJlZCB1c2VycyBvbiB0aGlzIG1hY2hpbmUuLi4nLCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdFx0XHRcdGZvciAoIHZhciBsID0gMDsgbCA8IGxpc3QubGVuZ3RoOyBsKysgKVxuXHRcdFx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJyAgICAnICsgbGlzdFsgbCBdLmZ1bGxOYW1lLCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdFx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdQbGVhc2UgZW50ZXIgdGhlIGZpcnN0IG5hbWUgb2YgYSB1c2VyLCBvciBcIm5ld3VzZXJcIi4uLicsIHsgdXNlcjogJ2luZm9ybWF0aW9uJyB9ICk7XG5cdFx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLndhaXRGb3JJbnB1dCggY29udHJvbC5lZGl0b3IgKTtcblx0XHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6bm90LXVzZXItbG9nZ2VkOml3YScgfTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoIGxpbmUgPT0gJycgKVxuXHRcdHtcblx0XHRcdGNvbnRyb2wuZWRpdG9yLnNlbGYud2FpdEZvcklucHV0KCBjb250cm9sLmVkaXRvciApO1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YSB9O1xuXHRcdH1cblxuXHRcdC8vIEEgbm9ybWFsIGJ1YmJsZS4uLlxuXHRcdHZhciBjb21tYW5kID0gYXdhaXQgdGhpcy5hd2kucGFyc2VyLmV4dHJhY3RDb21tYW5kRnJvbUxpbmUoIGxpbmUsIGNvbnRyb2wgKTtcblx0XHR2YXIgcGFyYW1ldGVycyA9IGNvbW1hbmQucGFyYW1ldGVycztcblx0XHRjb21tYW5kLnBhcmFtZXRlcnMgPSB7fTtcblx0XHR0aGlzLmJyYW5jaC5hZGRCdWJibGVGcm9tQ29tbWFuZCggY29tbWFuZCwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdGNvbnRyb2wuc3RhcnQgPSAnY3VycmVudCc7XG5cdFx0Y29udHJvbC5xdWVzdGlvbkNvdW50ID0gdGhpcy5xdWVzdGlvbkNvdW50Kys7XG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYnJhbmNoLnBsYXkoIGNvbW1hbmQubGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdGNvbnRyb2wucXVlc3Rpb25Db3VudCA9IHVuZGVmaW5lZDtcblx0XHRjb250cm9sLmVkaXRvci5zZWxmLndhaXRGb3JJbnB1dCggY29udHJvbC5lZGl0b3IsIHsgZm9yY2U6IHRydWUgfSApO1xuXHRcdHJldHVybiBhbnN3ZXI7XG5cdH1cblx0YXN5bmMgZ2V0UGFyYW1ldGVycyggcGFyYW1ldGVycywgY29udHJvbCA9IHt9IClcblx0e1xuXHRcdHZhciBkYXRhID0ge307XG5cdFx0dmFyIHBhcmFtZXRlcnMgPSB0aGlzLmF3aS51dGlsaXRpZXMuY29weU9iamVjdCggcGFyYW1ldGVycyApO1xuXHRcdHZhciBhbnN3ZXIgPSB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHt9IH07XG5cdFx0Y29udHJvbC5lZGl0b3Iuc2VsZi5zYXZlSW5wdXRzKCBjb250cm9sLmVkaXRvciApO1xuXHRcdGZvciAoIHZhciBwID0gMCA7IHAgPCBwYXJhbWV0ZXJzLmxlbmd0aDsgcCsrIClcblx0XHR7XG5cdFx0XHRjb250cm9sLmVkaXRvci5pbnB1dERpc2FibGVkID0gMTtcdFx0Ly8gVE9ETzogY29ycmVjdCFcblx0XHRcdHZhciBidWJibGUgPSB0aGlzLmJyYW5jaC5uZXdCdWJibGUoIHsgdG9rZW46ICdpbnB1dCcsIGNsYXNzbmFtZTogJ2dlbmVyaWMnLCBwYXJlbnQ6ICdwcm9tcHQnLCBwYXJhbWV0ZXJzOiB7fSB9LCBbXSwgY29udHJvbCApO1xuXHRcdFx0dmFyIHBhcmFtZXRlciA9IHsgaW5wdXRJbmZvOiB0aGlzLmF3aS51dGlsaXRpZXMuZ2V0QnViYmxlUGFyYW1zKCBwYXJhbWV0ZXJzWyBwIF0gKSB9O1xuXHRcdFx0YW5zd2VyID0gYXdhaXQgYnViYmxlLnBsYXkoICcnLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKTtcblx0XHRcdGZvciAoIHZhciBkIGluIGFuc3dlci5kYXRhIClcblx0XHRcdFx0ZGF0YVsgZCBdID0gYW5zd2VyLmRhdGFbIGQgXTtcblx0XHRcdGlmICggIWFuc3dlci5zdWNjZXNzIClcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHRcdGNvbnRyb2wuZWRpdG9yLnNlbGYucmVzdG9yZUlucHV0cyggY29udHJvbC5lZGl0b3IgKVxuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogZGF0YSB9O1xuXHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYW5zd2VyLmVycm9yIH07XG5cdH1cblx0ZXNjYXBlKCBmb3JjZSApXG5cdHtcblx0XHRpZiAoICFmb3JjZSApXG5cdFx0e1xuXHRcdFx0aWYgKCB0aGlzLndvcmtpbmcgKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmICggdGhpcy5jaGFpbi5nZXRMZW5ndGgoKSA+IDAgKVxuXHRcdHtcblx0XHRcdC8vIFByZXZlbnQgcmUtaW50ZXJwcmV0YXRpb24gb2YgdGhlIGxhc3QgY29tbWFuZFxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0aWYgKCB0aGlzLmhhbmRsZU5vQ29tbWFuZCApXG5cdFx0XHR7XG5cdFx0XHRcdGNsZWFySW50ZXJ2YWwoIHNlbGYuaGFuZGxlTm9Db21tYW5kICk7XG5cdFx0XHRcdHRoaXMuaGFuZGxlTm9Db21tYW5kID0gbnVsbDtcblx0XHRcdH1cblx0XHRcdHRoaXMubm9Db21tYW5kID0gdHJ1ZTtcblx0XHRcdHRoaXMuaGFuZGxlTm9Db21tYW5kID0gc2V0VGltZW91dCggZnVuY3Rpb24oKVxuXHRcdFx0e1xuXHRcdFx0XHRzZWxmLm5vQ29tbWFuZCA9IGZhbHNlO1xuXHRcdFx0XHRzZWxmLmhhbmRsZU5vQ29tbWFuZCA9IG51bGw7XG5cdFx0XHR9LCA1MDAgKTtcblxuXHRcdFx0Ly8gUmV2ZXJ0IHRvIGNoZWNrcG9pbnRcblx0XHRcdHZhciBidWJibGUgPSB0aGlzLmNoYWluLnBvcCgpO1xuXHRcdFx0aWYgKCB0aGlzLmNoYWluLmxlbmd0aCA9PSAwIClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5wcm9tcHRPbiA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRkZXN0cm95KClcblx0e1xuXHRcdHRoaXMuZGVzdHJveUV2ZW50SGFuZGxlcnMoIHRoaXMgKTtcblx0fVxufTtcbm1vZHVsZS5leHBvcnRzLlByb21wdCA9IFByb21wdDtcbiIsIm1vZHVsZS5leHBvcnRzWyBcImF3aS1icmFuY2hcIiBdID0gcmVxdWlyZSggXCIuL2J1YmJsZXMvYXdpLWJyYW5jaC5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1idWJibGVcIiBdID0gcmVxdWlyZSggXCIuL2J1YmJsZXMvYXdpLWJ1YmJsZS5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1tZW1vcnlcIiBdID0gcmVxdWlyZSggXCIuL21lbW9yaWVzL2F3aS1tZW1vcnkuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktc291dmVuaXJcIiBdID0gcmVxdWlyZSggXCIuL3NvdXZlbmlycy9hd2ktc291dmVuaXIuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktYnViYmxlLWFvemJhc2ljLWNvZGVcIiBdID0gcmVxdWlyZSggXCIuL2J1YmJsZXMvYW96YmFzaWMvYXdpLWJ1YmJsZS1hb3piYXNpYy1jb2RlLmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS1nZW5lcmljLWJpblwiIF0gPSByZXF1aXJlKCBcIi4vYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1iaW4uanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktYnViYmxlLWdlbmVyaWMtY2hhdFwiIF0gPSByZXF1aXJlKCBcIi4vYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1jaGF0LmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS1nZW5lcmljLWRlYnVnXCIgXSA9IHJlcXVpcmUoIFwiLi9idWJibGVzL2dlbmVyaWMvYXdpLWJ1YmJsZS1nZW5lcmljLWRlYnVnLmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS1nZW5lcmljLWRpZ2VzdFwiIF0gPSByZXF1aXJlKCBcIi4vYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1kaWdlc3QuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktYnViYmxlLWdlbmVyaWMtZWRpdFwiIF0gPSByZXF1aXJlKCBcIi4vYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1lZGl0LmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS1nZW5lcmljLWVycm9yXCIgXSA9IHJlcXVpcmUoIFwiLi9idWJibGVzL2dlbmVyaWMvYXdpLWJ1YmJsZS1nZW5lcmljLWVycm9yLmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS1nZW5lcmljLWV2YWxcIiBdID0gcmVxdWlyZSggXCIuL2J1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtZXZhbC5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1idWJibGUtZ2VuZXJpYy1oZWxwXCIgXSA9IHJlcXVpcmUoIFwiLi9idWJibGVzL2dlbmVyaWMvYXdpLWJ1YmJsZS1nZW5lcmljLWhlbHAuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktYnViYmxlLWdlbmVyaWMtaGV4XCIgXSA9IHJlcXVpcmUoIFwiLi9idWJibGVzL2dlbmVyaWMvYXdpLWJ1YmJsZS1nZW5lcmljLWhleC5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1idWJibGUtZ2VuZXJpYy1pbXBvcnRcIiBdID0gcmVxdWlyZSggXCIuL2J1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtaW1wb3J0LmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS1nZW5lcmljLWlucHV0XCIgXSA9IHJlcXVpcmUoIFwiLi9idWJibGVzL2dlbmVyaWMvYXdpLWJ1YmJsZS1nZW5lcmljLWlucHV0LmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS1nZW5lcmljLWxpc3RcIiBdID0gcmVxdWlyZSggXCIuL2J1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtbGlzdC5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1idWJibGUtZ2VuZXJpYy1xdWl0XCIgXSA9IHJlcXVpcmUoIFwiLi9idWJibGVzL2dlbmVyaWMvYXdpLWJ1YmJsZS1nZW5lcmljLXF1aXQuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktYnViYmxlLWdlbmVyaWMtcmVtZW1iZXJcIiBdID0gcmVxdWlyZSggXCIuL2J1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtcmVtZW1iZXIuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktYnViYmxlLWdlbmVyaWMtcm9vdFwiIF0gPSByZXF1aXJlKCBcIi4vYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1yb290LmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS1nZW5lcmljLXJ1blwiIF0gPSByZXF1aXJlKCBcIi4vYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1ydW4uanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktYnViYmxlLWdlbmVyaWMtc3RvcFwiIF0gPSByZXF1aXJlKCBcIi4vYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy1zdG9wLmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS1nZW5lcmljLXZlcmJvc2VcIiBdID0gcmVxdWlyZSggXCIuL2J1YmJsZXMvZ2VuZXJpYy9hd2ktYnViYmxlLWdlbmVyaWMtdmVyYm9zZS5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1idWJibGUtZ2VuZXJpYy12aWV3XCIgXSA9IHJlcXVpcmUoIFwiLi9idWJibGVzL2dlbmVyaWMvYXdpLWJ1YmJsZS1nZW5lcmljLXZpZXcuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktYnViYmxlLWdlbmVyaWMtd2VsY29tZVwiIF0gPSByZXF1aXJlKCBcIi4vYnViYmxlcy9nZW5lcmljL2F3aS1idWJibGUtZ2VuZXJpYy13ZWxjb21lLmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS1nZW5lcmljLXdyaXRlXCIgXSA9IHJlcXVpcmUoIFwiLi9idWJibGVzL2dlbmVyaWMvYXdpLWJ1YmJsZS1nZW5lcmljLXdyaXRlLmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS1qYXZhc2NyaXB0LWJhc2U2NFwiIF0gPSByZXF1aXJlKCBcIi4vYnViYmxlcy9qYXZhc2NyaXB0L2F3aS1idWJibGUtamF2YXNjcmlwdC1iYXNlNjQuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktYnViYmxlLWphdmFzY3JpcHQtY29kZVwiIF0gPSByZXF1aXJlKCBcIi4vYnViYmxlcy9qYXZhc2NyaXB0L2F3aS1idWJibGUtamF2YXNjcmlwdC1jb2RlLmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWJ1YmJsZS11c2VyLWRpYXBvcmFtYVwiIF0gPSByZXF1aXJlKCBcIi4vYnViYmxlcy91c2VyL2F3aS1idWJibGUtdXNlci1kaWFwb3JhbWEuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktY29ubmVjdG9yLWNsaWVudHMtb3BlbmFpYnJvd3NlclwiIF0gPSByZXF1aXJlKCBcIi4vY29ubmVjdG9ycy9jbGllbnRzL2F3aS1jb25uZWN0b3ItY2xpZW50cy1vcGVuYWlicm93c2VyLmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWNvbm5lY3Rvci1lZGl0b3JzLW1vYmlsZVwiIF0gPSByZXF1aXJlKCBcIi4vY29ubmVjdG9ycy9lZGl0b3JzL2F3aS1jb25uZWN0b3ItZWRpdG9ycy1tb2JpbGUuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktY29ubmVjdG9yLWxhbmd1YWdlcy1qYXZhc2NyaXB0XCIgXSA9IHJlcXVpcmUoIFwiLi9jb25uZWN0b3JzL2xhbmd1YWdlcy9hd2ktY29ubmVjdG9yLWxhbmd1YWdlcy1qYXZhc2NyaXB0LmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLWNvbm5lY3Rvci1zeXN0ZW1zLW1vYmlsZVwiIF0gPSByZXF1aXJlKCBcIi4vY29ubmVjdG9ycy9zeXN0ZW1zL2F3aS1jb25uZWN0b3Itc3lzdGVtcy1tb2JpbGUuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktY29ubmVjdG9yLXV0aWxpdGllcy1wYXJzZXJcIiBdID0gcmVxdWlyZSggXCIuL2Nvbm5lY3RvcnMvdXRpbGl0aWVzL2F3aS1jb25uZWN0b3ItdXRpbGl0aWVzLXBhcnNlci5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1jb25uZWN0b3ItdXRpbGl0aWVzLXRpbWVcIiBdID0gcmVxdWlyZSggXCIuL2Nvbm5lY3RvcnMvdXRpbGl0aWVzL2F3aS1jb25uZWN0b3ItdXRpbGl0aWVzLXRpbWUuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktY29ubmVjdG9yLXV0aWxpdGllcy11dGlsaXRpZXNcIiBdID0gcmVxdWlyZSggXCIuL2Nvbm5lY3RvcnMvdXRpbGl0aWVzL2F3aS1jb25uZWN0b3ItdXRpbGl0aWVzLXV0aWxpdGllcy5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1tZW1vcnktZ2VuZXJpYy1hdWRpb3NcIiBdID0gcmVxdWlyZSggXCIuL21lbW9yaWVzL2dlbmVyaWMvYXdpLW1lbW9yeS1nZW5lcmljLWF1ZGlvcy5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1tZW1vcnktZ2VuZXJpYy1jb252ZXJzYXRpb25zXCIgXSA9IHJlcXVpcmUoIFwiLi9tZW1vcmllcy9nZW5lcmljL2F3aS1tZW1vcnktZ2VuZXJpYy1jb252ZXJzYXRpb25zLmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLW1lbW9yeS1nZW5lcmljLWRvY3VtZW50c1wiIF0gPSByZXF1aXJlKCBcIi4vbWVtb3JpZXMvZ2VuZXJpYy9hd2ktbWVtb3J5LWdlbmVyaWMtZG9jdW1lbnRzLmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLW1lbW9yeS1nZW5lcmljLWVycm9yXCIgXSA9IHJlcXVpcmUoIFwiLi9tZW1vcmllcy9nZW5lcmljL2F3aS1tZW1vcnktZ2VuZXJpYy1lcnJvci5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1tZW1vcnktZ2VuZXJpYy1pbWFnZXNcIiBdID0gcmVxdWlyZSggXCIuL21lbW9yaWVzL2dlbmVyaWMvYXdpLW1lbW9yeS1nZW5lcmljLWltYWdlcy5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1tZW1vcnktZ2VuZXJpYy1tYWlsc1wiIF0gPSByZXF1aXJlKCBcIi4vbWVtb3JpZXMvZ2VuZXJpYy9hd2ktbWVtb3J5LWdlbmVyaWMtbWFpbHMuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktbWVtb3J5LWdlbmVyaWMtbWVzc2VuZ2VyXCIgXSA9IHJlcXVpcmUoIFwiLi9tZW1vcmllcy9nZW5lcmljL2F3aS1tZW1vcnktZ2VuZXJpYy1tZXNzZW5nZXIuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktbWVtb3J5LWdlbmVyaWMtcGhvdG9zXCIgXSA9IHJlcXVpcmUoIFwiLi9tZW1vcmllcy9nZW5lcmljL2F3aS1tZW1vcnktZ2VuZXJpYy1waG90b3MuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktbWVtb3J5LWdlbmVyaWMtdmlkZW9zXCIgXSA9IHJlcXVpcmUoIFwiLi9tZW1vcmllcy9nZW5lcmljL2F3aS1tZW1vcnktZ2VuZXJpYy12aWRlb3MuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktc291dmVuaXItZ2VuZXJpYy1hdWRpb1wiIF0gPSByZXF1aXJlKCBcIi4vc291dmVuaXJzL2dlbmVyaWMvYXdpLXNvdXZlbmlyLWdlbmVyaWMtYXVkaW8uanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktc291dmVuaXItZ2VuZXJpYy1kb2N1bWVudFwiIF0gPSByZXF1aXJlKCBcIi4vc291dmVuaXJzL2dlbmVyaWMvYXdpLXNvdXZlbmlyLWdlbmVyaWMtZG9jdW1lbnQuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktc291dmVuaXItZ2VuZXJpYy1lcnJvclwiIF0gPSByZXF1aXJlKCBcIi4vc291dmVuaXJzL2dlbmVyaWMvYXdpLXNvdXZlbmlyLWdlbmVyaWMtZXJyb3IuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktc291dmVuaXItZ2VuZXJpYy1pbWFnZVwiIF0gPSByZXF1aXJlKCBcIi4vc291dmVuaXJzL2dlbmVyaWMvYXdpLXNvdXZlbmlyLWdlbmVyaWMtaW1hZ2UuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktc291dmVuaXItZ2VuZXJpYy1tYWlsXCIgXSA9IHJlcXVpcmUoIFwiLi9zb3V2ZW5pcnMvZ2VuZXJpYy9hd2ktc291dmVuaXItZ2VuZXJpYy1tYWlsLmpzXCIgKVxubW9kdWxlLmV4cG9ydHNbIFwiYXdpLXNvdXZlbmlyLWdlbmVyaWMtbWVzc2FnZVwiIF0gPSByZXF1aXJlKCBcIi4vc291dmVuaXJzL2dlbmVyaWMvYXdpLXNvdXZlbmlyLWdlbmVyaWMtbWVzc2FnZS5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1zb3V2ZW5pci1nZW5lcmljLXBob3RvXCIgXSA9IHJlcXVpcmUoIFwiLi9zb3V2ZW5pcnMvZ2VuZXJpYy9hd2ktc291dmVuaXItZ2VuZXJpYy1waG90by5qc1wiIClcbm1vZHVsZS5leHBvcnRzWyBcImF3aS1zb3V2ZW5pci1nZW5lcmljLXJvb3RcIiBdID0gcmVxdWlyZSggXCIuL3NvdXZlbmlycy9nZW5lcmljL2F3aS1zb3V2ZW5pci1nZW5lcmljLXJvb3QuanNcIiApXG5tb2R1bGUuZXhwb3J0c1sgXCJhd2ktc291dmVuaXItZ2VuZXJpYy12aWRlb1wiIF0gPSByZXF1aXJlKCBcIi4vc291dmVuaXJzL2dlbmVyaWMvYXdpLXNvdXZlbmlyLWdlbmVyaWMtdmlkZW8uanNcIiApXG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgWyAgXVsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWwgQXNzaXN0YW50XG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vIFtffCB8X10gXFwgICAgIGxpbms6XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktcHJvbXB0LmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBNYWluIGNsYXNzXG4qXG4qL1xudmFyIGF3aW1lc3NhZ2VzID0gcmVxdWlyZSggJy4vYXdpLW1lc3NhZ2VzJyApXG52YXIgYXdpcHJvbXB0ID0gcmVxdWlyZSggJy4vYXdpLXByb21wdCcgKVxudmFyIGF3aXBlcnNvbmFsaXR5ID0gcmVxdWlyZSggJy4vYXdpLXBlcnNvbmFsaXR5JyApXG52YXIgYXdpY29uZmlnID0gcmVxdWlyZSggJy4vYXdpLWNvbmZpZycgKTtcbnZhciBhd2lyZXF1aXJlcyA9IHJlcXVpcmUoICcuL2F3aS1yZXF1aXJlcycgKTtcblxuY2xhc3MgQXdpXG57XG5cdGNvbnN0cnVjdG9yKCBjb25maWcsIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHR0aGlzLmF3aSA9IHRoaXM7XG5cdFx0dGhpcy5vQ2xhc3MgPSAnYXdpJztcblx0XHR0aGlzLnN5c3RlbUNvbmZpZyA9IGNvbmZpZztcblx0XHR0aGlzLnZlcnNpb24gPSAnMC4yLjEnO1xuXHRcdHRoaXMuaG9zdCA9IGNvbmZpZy5ob3N0O1xuXHRcdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0dGhpcy51c2VyID0gb3B0aW9ucy51c2VyO1xuXHRcdHRoaXMuYnViYmxlcyA9IHt9O1xuXHRcdHRoaXMuc291dmVuaXJzID0ge307XG5cdFx0dGhpcy5tZW1vcmllcyA9IHt9O1xuXHRcdHRoaXMuY29ubmVjdG9ycyA9IHt9O1xuXHRcdHRoaXMubmV3U291dmVuaXJzID0ge307XG5cdFx0dGhpcy5uZXdNZW1vcmllcyA9IHt9O1xuXHRcdHRoaXMubmV3QnViYmxlcyA9IHt9O1xuXHRcdHRoaXMubmV3Q29ubmVjdG9ycyA9IHt9O1xuXHRcdHRoaXMuZGlyZWN0UmVtZW1iZXJpbmcgPSBbXTtcblx0XHR0aGlzLmluZGlyZWN0UmVtZW1iZXJpbmcgPSBbXTtcblx0XHR0aGlzLmVkaXRvciA9IG51bGw7XG5cdFx0dGhpcy5zeXN0ZW0gPSBudWxsO1xuXHRcdHRoaXMubGFuZ3VhZ2UgPSBudWxsO1xuXHRcdHRoaXMubWVzc2FnZXMgPSBudWxsO1xuXHRcdHRoaXMuY29uZmlnID0gbmV3IGF3aWNvbmZpZy5Db25maWcoIHRoaXMsIGNvbmZpZyApO1xuXHR9XG5cdGFzeW5jIGNvbm5lY3QoIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHR2YXIgYW5zd2VycyA9IHt9O1xuXHRcdGlmICggdHlwZW9mIHRoaXMuc3lzdGVtQ29uZmlnLmVuZ2luZSAhPSAnc3RyaW5nJyApXG5cdFx0e1xuXHRcdFx0Ly8gU3RhcnQgY29ubmVjdG9ycy4uLiBTeXN0ZW0gbXVzdCBiZSBmaXJzdC5cblx0XHRcdGZvciAoIHZhciBjID0gMDsgYyA8IHRoaXMuc3lzdGVtQ29uZmlnLmNvbm5lY3RvcnMubGVuZ3RoOyBjKysgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgY29ubmVjdG9yID0gdGhpcy5zeXN0ZW1Db25maWcuY29ubmVjdG9yc1sgYyBdO1xuXHRcdFx0XHR2YXIgZG90ID0gY29ubmVjdG9yLm5hbWUuaW5kZXhPZiggJy4nICk7XG5cdFx0XHRcdHZhciBjbGFzc25hbWUgPSBjb25uZWN0b3IubmFtZS5zdWJzdHJpbmcoIDAsIGRvdCApO1xuXHRcdFx0XHR2YXIgbmFtZSA9IGNvbm5lY3Rvci5uYW1lLnN1YnN0cmluZyggZG90ICsgMSApO1xuXHRcdFx0XHRpZiAoIG5hbWUuaW5kZXhPZiggJyonICkgPj0gMCB8fCBuYW1lLmluZGV4T2YoICc/JyApID49IDAgKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR2YXIgcm5hbWUgPSAnYXdpLWNvbm5lY3Rvci0nICsgY2xhc3NuYW1lICsgJy0nICsgbmFtZTtcblx0XHRcdFx0dmFyIGV4cHJ0cyA9IGF3aXJlcXVpcmVzWyBybmFtZSBdO1xuXHRcdFx0XHR0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdID0gKCB0eXBlb2YgdGhpcy5jb25uZWN0b3JzWyBjbGFzc25hbWUgXSA9PSAndW5kZWZpbmVkJyA/IHt9IDogdGhpcy5jb25uZWN0b3JzWyBjbGFzc25hbWUgXSApO1xuXHRcdFx0XHR0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdWyBuYW1lIF0gPSBuZXcgZXhwcnRzLkNvbm5lY3RvciggdGhpcywge30gKTtcblx0XHRcdFx0dGhpcy5uZXdDb25uZWN0b3JzWyBjbGFzc25hbWUgXSA9ICggdHlwZW9mIHRoaXMubmV3Q29ubmVjdG9yc1sgY2xhc3NuYW1lIF0gPT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHRoaXMubmV3Q29ubmVjdG9yc1sgY2xhc3NuYW1lIF0gKTtcblx0XHRcdFx0dGhpcy5uZXdDb25uZWN0b3JzWyBjbGFzc25hbWUgXVsgbmFtZSBdID0gZXhwcnRzLkNvbm5lY3Rvcjtcblx0XHRcdFx0aWYgKCBjb25uZWN0b3IuZGVmYXVsdCApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5jb25uZWN0b3JzWyBjbGFzc25hbWUgXVsgbmFtZSBdLmNvbm5lY3QoIGNvbm5lY3Rvci5vcHRpb25zICk7XG5cdFx0XHRcdFx0YW5zd2Vyc1sgYW5zd2VyLmRhdGEuY2xhc3NuYW1lIF0gPSBbIHsgc3VjY2VzczogYW5zd2VyLnN1Y2Nlc3MsIGRhdGE6IGFuc3dlci5kYXRhIH0gXTtcblx0XHRcdFx0XHR0aGlzWyBhbnN3ZXIuZGF0YS5jbGFzc25hbWUgXSA9IHRoaXMuY29ubmVjdG9yc1sgY2xhc3NuYW1lIF1bIG5hbWUgXTtcblx0XHRcdFx0XHR0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdLmN1cnJlbnQgPSB0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdWyBuYW1lIF07XG5cdFx0XHRcdFx0aWYgKCBjbGFzc25hbWUgPT0gJ3V0aWxpdGllcycgJiYgbmFtZSA9PSAndXRpbGl0aWVzJyAgKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGF3YWl0IHRoaXMuY29uZmlnLmluaXQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gTm93IHdpbGRjYXJkc1xuXHRcdFx0Zm9yICggdmFyIGMgPSAwOyBjIDwgdGhpcy5zeXN0ZW1Db25maWcuY29ubmVjdG9ycy5sZW5ndGg7IGMrKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBjb25uZWN0b3IgPSB0aGlzLnN5c3RlbUNvbmZpZy5jb25uZWN0b3JzWyBjIF07XG5cdFx0XHRcdHZhciBkb3QgPSBjb25uZWN0b3IubmFtZS5pbmRleE9mKCAnLicgKTtcblx0XHRcdFx0dmFyIGNsYXNzbmFtZSA9IGNvbm5lY3Rvci5uYW1lLnN1YnN0cmluZyggMCwgZG90ICk7XG5cdFx0XHRcdHZhciBuYW1lID0gY29ubmVjdG9yLm5hbWUuc3Vic3RyaW5nKCBkb3QgKyAxICk7XG5cdFx0XHRcdGlmICggbmFtZS5pbmRleE9mKCAnKicgKSA+PSAwIHx8IG5hbWUuaW5kZXhPZiggJz8nICkgPj0gMCApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRkb1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHZhciBkb25lID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRmb3IgKCB2YXIgZiBpbiBhd2lyZXF1aXJlcyApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGlmICggZi5pbmRleE9mKCAnLScgKyBjbGFzc25hbWUgKyAnLScgKSA+PSAwIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdG5hbWUgPSBmLnN1YnN0cmluZyggZi5sYXN0SW5kZXhPZiggJy0nICkgKyAxICk7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAhdGhpcy5jb25uZWN0b3JzWyBjbGFzc25hbWUgXSB8fCAhdGhpcy5jb25uZWN0b3JzWyBjbGFzc25hbWUgXVsgbmFtZSBdIClcblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgZXhwcnRzID0gYXdpcmVxdWlyZXNbIG5hbWUgXTtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuY29ubmVjdG9yc1sgY2xhc3NuYW1lIF0gPSAoIHR5cGVvZiB0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdID09ICd1bmRlZmluZWQnID8ge30gOiB0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdICk7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdWyBuYW1lIF0gPSBuZXcgZXhwcnRzLkNvbm5lY3RvciggdGhpcywge30gKTtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMubmV3Q29ubmVjdG9yc1sgY2xhc3NuYW1lIF0gPSAoIHR5cGVvZiB0aGlzLm5ld0Nvbm5lY3RvcnNbIGNsYXNzbmFtZSBdID09ICd1bmRlZmluZWQnID8ge30gOiB0aGlzLm5ld0Nvbm5lY3RvcnNbIGNsYXNzbmFtZSBdICk7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLm5ld0Nvbm5lY3RvcnNbIGNsYXNzbmFtZSBdWyBuYW1lIF0gPSBleHBydHMuQ29ubmVjdG9yO1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuY29ubmVjdG9yc1sgY2xhc3NuYW1lIF1bIG5hbWUgXS5jb25uZWN0KCBjb25uZWN0b3Iub3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHRcdFx0YW5zd2Vyc1sgYW5zd2VyLmRhdGEuY2xhc3NuYW1lIF0gPSB0eXBlb2YgYW5zd2Vyc1sgYW5zd2VyLmRhdGEuY2xhc3NuYW1lIF0gPT0gJ3VuZGVmaW5lZCcgPyBbXSA6IGFuc3dlcnNbIGFuc3dlci5kYXRhLmNsYXNzbmFtZSBdO1xuXHRcdFx0XHRcdFx0XHRcdFx0YW5zd2Vyc1sgYW5zd2VyLmRhdGEuY2xhc3NuYW1lIF0ucHVzaCggeyBzdWNjZXNzOiBhbnN3ZXIuc3VjY2VzcywgZGF0YTogYW5zd2VyLmRhdGEgfSApO1xuXHRcdFx0XHRcdFx0XHRcdFx0ZG9uZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSB3aGlsZSggZG9uZSApXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gTWFrZSB0aGUgbGlzdCBvZiBidWJibGVzIHRvIGxvYWRcblx0XHRcdHZhciBjbGFzc0xpc3QgPSBbICdnZW5lcmljJywgJ2F1ZGlvJywgJ2ZpbGVzeXN0ZW0nLCAndXNlcicsICd2aXNpb24nLCB0aGlzLmNvbm5lY3RvcnMubGFuZ3VhZ2VzLmN1cnJlbnQudG9rZW4gXTtcblx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLnN5c3RlbS5nZXREaXJlY3RvcnkoIHRoaXMuY29uZmlnLmdldEVuZ2luZVBhdGgoKSArICcvYnViYmxlcycsIHsgcmVjdXJzaXZlOiB0cnVlLCBmaWx0ZXJzOiBbICdhd2ktYnViYmxlLSouanMnIF0gfSApO1xuXHRcdFx0dmFyIGZpbGVzID0gdGhpcy51dGlsaXRpZXMuZ2V0RmlsZUFycmF5RnJvbVRyZWUoIGFuc3dlci5kYXRhICk7XG5cdFx0XHRmb3IgKCB2YXIgZiBpbiBhd2lyZXF1aXJlcyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBuYW1lcG9zID0gZi5sYXN0SW5kZXhPZiggJy0nICk7XG5cdFx0XHRcdHZhciBjbGFzc3BvcyA9IGYubGFzdEluZGV4T2YoICctJywgbmFtZXBvcyAtIDEgKTtcblx0XHRcdFx0dmFyIGNsYXNzbmFtZSA9IGYuc3Vic3RyaW5nKCBjbGFzc3BvcyArIDEsIG5hbWVwb3MgKTtcblx0XHRcdFx0dmFyIG5hbWUgPSBmLnN1YnN0cmluZyggbmFtZXBvcyArIDEgKTtcblx0XHRcdFx0dmFyIGZvdW5kID0gY2xhc3NMaXN0LmZpbmQoXG5cdFx0XHRcdFx0ZnVuY3Rpb24oIGVsZW1lbnQgKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHJldHVybiBlbGVtZW50ID09IGNsYXNzbmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdClcblx0XHRcdFx0aWYgKCBmb3VuZCApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgZXhwcnRzID0gYXdpcmVxdWlyZXNbIG5hbWUgXTtcblx0XHRcdFx0XHRpZiAoIGV4cHJ0cyApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dGhpcy5idWJibGVzWyBjbGFzc25hbWUgXSA9ICggdHlwZW9mIHRoaXMuYnViYmxlc1sgY2xhc3NuYW1lIF0gPT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHRoaXMuYnViYmxlc1sgY2xhc3NuYW1lIF0gKTtcblx0XHRcdFx0XHRcdHRoaXMuYnViYmxlc1sgY2xhc3NuYW1lIF1bIG5hbWUgXSA9IG5ldyBleHBydHMuQnViYmxlKCB0aGlzLCB7IGtleTogdGhpcy51dGlsaXRpZXMuZ2V0VW5pcXVlSWRlbnRpZmllcigge30sIG5hbWUsIGYgKSwgcGFyZW50OiAnJyB9ICk7XG5cdFx0XHRcdFx0XHR0aGlzLm5ld0J1YmJsZXNbIGNsYXNzbmFtZSBdID0gKCB0eXBlb2YgdGhpcy5uZXdCdWJibGVzWyBjbGFzc25hbWUgXSA9PSAndW5kZWZpbmVkJyA/IHt9IDogdGhpcy5uZXdCdWJibGVzWyBjbGFzc25hbWUgXSApO1xuXHRcdFx0XHRcdFx0dGhpcy5uZXdCdWJibGVzWyBjbGFzc25hbWUgXVsgbmFtZSBdID0gZXhwcnRzLkJ1YmJsZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gR2F0aGVyIHNvdXZlbmlyc1xuXHRcdFx0Zm9yICggdmFyIGYgaW4gYXdpcmVxdWlyZXMgKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoIGYuaW5kZXhPZiggJ2F3aS1zb3V2ZW5pci0nICkgPj0gMFx0KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIG5hbWVwb3MgPSBmLmxhc3RJbmRleE9mKCAnLScgKTtcblx0XHRcdFx0XHR2YXIgY2xhc3Nwb3MgPSBmLmxhc3RJbmRleE9mKCAnLScsIG5hbWVwb3MgLSAxICk7XG5cdFx0XHRcdFx0dmFyIGNsYXNzbmFtZSA9IGYuc3Vic3RyaW5nKCBjbGFzc3BvcyArIDEsIG5hbWVwb3MgKTtcblx0XHRcdFx0XHR2YXIgbmFtZSA9IGYuc3Vic3RyaW5nKCBuYW1lcG9zICsgMSApO1xuXHRcdFx0XHRcdHZhciBleHBydHMgPSBhd2lyZXF1aXJlc1sgZiBdO1xuXHRcdFx0XHRcdGlmICggZXhwcnRzIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR0aGlzLm5ld1NvdXZlbmlyc1sgY2xhc3NuYW1lIF0gPSAoIHR5cGVvZiB0aGlzLm5ld1NvdXZlbmlyc1sgY2xhc3NuYW1lIF0gPT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHRoaXMubmV3U291dmVuaXJzWyBjbGFzc25hbWUgXSApO1xuXHRcdFx0XHRcdFx0dGhpcy5uZXdTb3V2ZW5pcnNbIGNsYXNzbmFtZSBdWyBuYW1lIF0gPSBleHBydHMuU291dmVuaXI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIEdhdGhlciBtZW1vcmllc1xuXHRcdFx0Zm9yICggdmFyIGYgaW4gYXdpcmVxdWlyZXMgKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoIGYuaW5kZXhPZiggJ2F3aS1tZW1vcnktJyApID49IDBcdClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBuYW1lcG9zID0gZi5sYXN0SW5kZXhPZiggJy0nICk7XG5cdFx0XHRcdFx0dmFyIGNsYXNzcG9zID0gZi5sYXN0SW5kZXhPZiggJy0nLCBuYW1lcG9zIC0gMSApO1xuXHRcdFx0XHRcdHZhciBjbGFzc25hbWUgPSBmLnN1YnN0cmluZyggY2xhc3Nwb3MgKyAxLCBuYW1lcG9zICk7XG5cdFx0XHRcdFx0dmFyIG5hbWUgPSBmLnN1YnN0cmluZyggbmFtZXBvcyArIDEgKTtcblx0XHRcdFx0XHR2YXIgZXhwcnRzID0gYXdpcmVxdWlyZXNbIGYgXTtcblx0XHRcdFx0XHRpZiAoIGV4cHJ0cyApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dGhpcy5uZXdNZW1vcmllc1sgY2xhc3NuYW1lIF0gPSAoIHR5cGVvZiB0aGlzLm5ld01lbW9yaWVzWyBjbGFzc25hbWUgXSA9PSAndW5kZWZpbmVkJyA/IHt9IDogdGhpcy5uZXdNZW1vcmllc1sgY2xhc3NuYW1lIF0gKTtcblx0XHRcdFx0XHRcdHRoaXMubmV3TWVtb3JpZXNbIGNsYXNzbmFtZSBdWyBuYW1lIF0gPSBleHBydHMuTWVtb3J5O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0Ly8gU3RhcnQgY29ubmVjdG9ycy4uLiBTeXN0ZW0gbXVzdCBiZSBmaXJzdC5cblx0XHRcdGZvciAoIHZhciBjID0gMDsgYyA8IHRoaXMuc3lzdGVtQ29uZmlnLmNvbm5lY3RvcnMubGVuZ3RoOyBjKysgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgY29ubmVjdG9yID0gdGhpcy5zeXN0ZW1Db25maWcuY29ubmVjdG9yc1sgYyBdO1xuXHRcdFx0XHR2YXIgZG90ID0gY29ubmVjdG9yLm5hbWUuaW5kZXhPZiggJy4nICk7XG5cdFx0XHRcdHZhciBjbGFzc25hbWUgPSBjb25uZWN0b3IubmFtZS5zdWJzdHJpbmcoIDAsIGRvdCApO1xuXHRcdFx0XHR2YXIgbmFtZSA9IGNvbm5lY3Rvci5uYW1lLnN1YnN0cmluZyggZG90ICsgMSApO1xuXHRcdFx0XHRpZiAoIG5hbWUuaW5kZXhPZiggJyonICkgPj0gMCB8fCBuYW1lLmluZGV4T2YoICc/JyApID49IDAgKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR2YXIgZXhwb3J0cyA9IHJlcXVpcmUoICcuL2Nvbm5lY3RvcnMvJyArIGNsYXNzbmFtZSArICcvJyArICdhd2ktY29ubmVjdG9yLScgKyBjbGFzc25hbWUgKyAnLScgKyBuYW1lICk7XG5cdFx0XHRcdHRoaXMuY29ubmVjdG9yc1sgY2xhc3NuYW1lIF0gPSAoIHR5cGVvZiB0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdID09ICd1bmRlZmluZWQnID8ge30gOiB0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdICk7XG5cdFx0XHRcdHRoaXMuY29ubmVjdG9yc1sgY2xhc3NuYW1lIF1bIG5hbWUgXSA9IG5ldyBleHBvcnRzLkNvbm5lY3RvciggdGhpcywge30gKTtcblx0XHRcdFx0dGhpcy5uZXdDb25uZWN0b3JzWyBjbGFzc25hbWUgXSA9ICggdHlwZW9mIHRoaXMubmV3Q29ubmVjdG9yc1sgY2xhc3NuYW1lIF0gPT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHRoaXMubmV3Q29ubmVjdG9yc1sgY2xhc3NuYW1lIF0gKTtcblx0XHRcdFx0dGhpcy5uZXdDb25uZWN0b3JzWyBjbGFzc25hbWUgXVsgbmFtZSBdID0gZXhwb3J0cy5Db25uZWN0b3I7XG5cdFx0XHRcdGlmICggY29ubmVjdG9yLmRlZmF1bHQgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuY29ubmVjdG9yc1sgY2xhc3NuYW1lIF1bIG5hbWUgXS5jb25uZWN0KCBjb25uZWN0b3Iub3B0aW9ucyApO1xuXHRcdFx0XHRcdGFuc3dlcnNbIGFuc3dlci5kYXRhLmNsYXNzbmFtZSBdID0gWyB7IHN1Y2Nlc3M6IGFuc3dlci5zdWNjZXNzLCBub25GYXRhbDogYW5zd2VyLm5vbkZhdGFsLCBkYXRhOiBhbnN3ZXIuZGF0YSB9IF07XG5cdFx0XHRcdFx0dGhpc1sgYW5zd2VyLmRhdGEudG9rZW4gXSA9IHRoaXMuY29ubmVjdG9yc1sgY2xhc3NuYW1lIF1bIG5hbWUgXTtcblx0XHRcdFx0XHR0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdLmN1cnJlbnQgPSB0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdWyBuYW1lIF07XG5cdFx0XHRcdFx0aWYgKCBjbGFzc25hbWUgPT0gJ3V0aWxpdGllcycgJiYgbmFtZSA9PSAndXRpbGl0aWVzJyApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5jb25maWcuaW5pdCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBOb3cgd2lsZGNhcmRzXG5cdFx0XHRmb3IgKCB2YXIgYyA9IDA7IGMgPCB0aGlzLnN5c3RlbUNvbmZpZy5jb25uZWN0b3JzLmxlbmd0aDsgYysrIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGNvbm5lY3RvciA9IHRoaXMuc3lzdGVtQ29uZmlnLmNvbm5lY3RvcnNbIGMgXTtcblx0XHRcdFx0dmFyIGRvdCA9IGNvbm5lY3Rvci5uYW1lLmluZGV4T2YoICcuJyApO1xuXHRcdFx0XHR2YXIgY2xhc3NuYW1lID0gY29ubmVjdG9yLm5hbWUuc3Vic3RyaW5nKCAwLCBkb3QgKTtcblx0XHRcdFx0dmFyIGZpbHRlciA9IGNvbm5lY3Rvci5uYW1lLnN1YnN0cmluZyggZG90ICsgMSApO1xuXHRcdFx0XHRpZiAoIGZpbHRlci5pbmRleE9mKCAnKicgKSA+PSAwIHx8IGZpbHRlci5pbmRleE9mKCAnPycgKSA+PSAwIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLnN5c3RlbS5nZXREaXJlY3RvcnkoIHRoaXMuY29uZmlnLmdldEVuZ2luZVBhdGgoKSArICcvY29ubmVjdG9ycy8nICsgY2xhc3NuYW1lLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZmlsdGVyczogWyAnKi5qcycgXSB9ICk7XG5cdFx0XHRcdFx0dmFyIGZpbGVzID0gdGhpcy51dGlsaXRpZXMuZ2V0RmlsZUFycmF5RnJvbVRyZWUoIGFuc3dlci5kYXRhICk7XG5cdFx0XHRcdFx0Zm9yICggdmFyIGYgPSAwOyBmIDwgZmlsZXMubGVuZ3RoOyBmKysgKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHZhciBuYW1lID0gdGhpcy51dGlsaXRpZXMucGFyc2UoIGZpbGVzWyBmIF0ubmFtZSApLm5hbWU7XG5cdFx0XHRcdFx0XHR2YXIgbmFtZXBvcyA9IG5hbWUubGFzdEluZGV4T2YoICctJyApO1xuXHRcdFx0XHRcdFx0dmFyIGNsYXNzcG9zID0gbmFtZS5sYXN0SW5kZXhPZiggJy0nLCBuYW1lcG9zIC0gMSApO1xuXHRcdFx0XHRcdFx0dmFyIGNsYXNzbmFtZSA9IG5hbWUuc3Vic3RyaW5nKCBjbGFzc3BvcyArIDEsIG5hbWVwb3MgKTtcblx0XHRcdFx0XHRcdHZhciBjTmFtZSA9IG5hbWUuc3Vic3RyaW5nKCBuYW1lcG9zICsgMSApO1xuXHRcdFx0XHRcdFx0dmFyIGV4cG9ydHMgPSByZXF1aXJlKCAnLi9jb25uZWN0b3JzLycgKyBjbGFzc25hbWUgKyAnLycgKyBuYW1lICk7XG5cdFx0XHRcdFx0XHR0aGlzLmNvbm5lY3RvcnNbIGNsYXNzbmFtZSBdID0gKCB0eXBlb2YgdGhpcy5jb25uZWN0b3JzWyBjbGFzc25hbWUgXSA9PSAndW5kZWZpbmVkJyA/IHt9IDogdGhpcy5jb25uZWN0b3JzWyBjbGFzc25hbWUgXSApO1xuXHRcdFx0XHRcdFx0dGhpcy5uZXdDb25uZWN0b3JzWyBjbGFzc25hbWUgXSA9ICggdHlwZW9mIHRoaXMubmV3Q29ubmVjdG9yc1sgY2xhc3NuYW1lIF0gPT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHRoaXMubmV3Q29ubmVjdG9yc1sgY2xhc3NuYW1lIF0gKTtcblx0XHRcdFx0XHRcdHZhciBpbnN0YW5jZSA9IG5ldyBleHBvcnRzLkNvbm5lY3RvciggdGhpcywge30gKTtcblx0XHRcdFx0XHRcdHRoaXMuY29ubmVjdG9yc1sgY2xhc3NuYW1lIF1bIGNOYW1lIF0gPSBpbnN0YW5jZTtcblx0XHRcdFx0XHRcdHRoaXMubmV3Q29ubmVjdG9yc1sgY2xhc3NuYW1lIF1bIGNOYW1lIF0gPSBleHBvcnRzLkNvbm5lY3Rvcjtcblx0XHRcdFx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCBpbnN0YW5jZS5jb25uZWN0KCBjb25uZWN0b3Iub3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0YW5zd2Vyc1sgY05hbWUgXSA9IHR5cGVvZiBhbnN3ZXJzWyBhbnN3ZXIuZGF0YS5jbGFzc25hbWUgXSA9PSAndW5kZWZpbmVkJyA/IFtdIDogYW5zd2Vyc1sgYW5zd2VyLmRhdGEuY2xhc3NuYW1lIF07XG5cdFx0XHRcdFx0XHRhbnN3ZXJzWyBjTmFtZSBdID0geyBzdWNjZXNzOiBhbnN3ZXIuc3VjY2VzcywgZGF0YTogYW5zd2VyLmRhdGEgfTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gTWFrZSB0aGUgbGlzdCBvZiBidWJibGVzIHRvIGxvYWRcblx0XHRcdHZhciBjbGFzc0xpc3QgPSBbICdnZW5lcmljJywgJ2F1ZGlvJywgJ2ZpbGVzeXN0ZW0nLCAndXNlcicsICd2aXNpb24nLCB0aGlzLmNvbm5lY3RvcnMubGFuZ3VhZ2VzLmN1cnJlbnQudG9rZW4gXTtcblx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLnN5c3RlbS5nZXREaXJlY3RvcnkoIHRoaXMuY29uZmlnLmdldEVuZ2luZVBhdGgoKSArICcvYnViYmxlcycsIHsgcmVjdXJzaXZlOiB0cnVlLCBmaWx0ZXJzOiBbICdhd2ktYnViYmxlLSouanMnIF0gfSApO1xuXHRcdFx0dmFyIGZpbGVzID0gdGhpcy51dGlsaXRpZXMuZ2V0RmlsZUFycmF5RnJvbVRyZWUoIGFuc3dlci5kYXRhICk7XG5cdFx0XHRmb3IgKCB2YXIgZiA9IDA7IGYgPCBmaWxlcy5sZW5ndGg7IGYrKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBwYXRoID0gZmlsZXNbIGYgXS5wYXRoO1xuXHRcdFx0XHR2YXIgZXhwb3J0cyA9IHJlcXVpcmUoIHBhdGggKTtcblx0XHRcdFx0dmFyIG5hbWUgPSB0aGlzLnV0aWxpdGllcy5wYXJzZSggcGF0aCApLm5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0dmFyIG5hbWVwb3MgPSBuYW1lLmxhc3RJbmRleE9mKCAnLScgKTtcblx0XHRcdFx0dmFyIGNsYXNzcG9zID0gbmFtZS5sYXN0SW5kZXhPZiggJy0nLCBuYW1lcG9zIC0gMSApO1xuXHRcdFx0XHR2YXIgY2xhc3NuYW1lID0gbmFtZS5zdWJzdHJpbmcoIGNsYXNzcG9zICsgMSwgbmFtZXBvcyApO1xuXHRcdFx0XHRuYW1lID0gbmFtZS5zdWJzdHJpbmcoIG5hbWVwb3MgKyAxICk7XG5cdFx0XHRcdHZhciBmb3VuZCA9IGNsYXNzTGlzdC5maW5kKFxuXHRcdFx0XHRcdGZ1bmN0aW9uKCBlbGVtZW50IClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZWxlbWVudCA9PSBjbGFzc25hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHQpXG5cdFx0XHRcdGlmICggZm91bmQgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5idWJibGVzWyBjbGFzc25hbWUgXSA9ICggdHlwZW9mIHRoaXMuYnViYmxlc1sgY2xhc3NuYW1lIF0gPT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHRoaXMuYnViYmxlc1sgY2xhc3NuYW1lIF0gKTtcblx0XHRcdFx0XHR0aGlzLmJ1YmJsZXNbIGNsYXNzbmFtZSBdWyBuYW1lIF0gPSBuZXcgZXhwb3J0cy5CdWJibGUoIHRoaXMsIHsga2V5OiB0aGlzLnV0aWxpdGllcy5nZXRVbmlxdWVJZGVudGlmaWVyKCB7fSwgbmFtZSwgZiApLCBwYXJlbnQ6ICcnIH0gKTtcblx0XHRcdFx0XHR0aGlzLm5ld0J1YmJsZXNbIGNsYXNzbmFtZSBdID0gKCB0eXBlb2YgdGhpcy5uZXdCdWJibGVzWyBjbGFzc25hbWUgXSA9PSAndW5kZWZpbmVkJyA/IHt9IDogdGhpcy5uZXdCdWJibGVzWyBjbGFzc25hbWUgXSApO1xuXHRcdFx0XHRcdHRoaXMubmV3QnViYmxlc1sgY2xhc3NuYW1lIF1bIG5hbWUgXSA9IGV4cG9ydHMuQnViYmxlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIEdhdGhlciBzb3V2ZW5pcnNcblx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLnN5c3RlbS5nZXREaXJlY3RvcnkoIHRoaXMuY29uZmlnLmdldEVuZ2luZVBhdGgoKSArICcvc291dmVuaXJzJywgeyByZWN1cnNpdmU6IHRydWUsIGZpbHRlcnM6IFsgJ2F3aS1zb3V2ZW5pci0qLmpzJyBdIH0gKTtcblx0XHRcdHZhciBmaWxlcyA9IHRoaXMudXRpbGl0aWVzLmdldEZpbGVBcnJheUZyb21UcmVlKCBhbnN3ZXIuZGF0YSApO1xuXHRcdFx0Zm9yICggdmFyIGYgPSAwOyBmIDwgZmlsZXMubGVuZ3RoOyBmKysgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgcGF0aCA9IGZpbGVzWyBmIF0ucGF0aDtcblx0XHRcdFx0dmFyIGV4cG9ydHMgPSByZXF1aXJlKCBwYXRoICk7XG5cdFx0XHRcdHZhciBuYW1lID0gdGhpcy51dGlsaXRpZXMucGFyc2UoIHBhdGggKS5uYW1lLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdHZhciBuYW1lcG9zID0gbmFtZS5sYXN0SW5kZXhPZiggJy0nICk7XG5cdFx0XHRcdHZhciBjbGFzc3BvcyA9IG5hbWUubGFzdEluZGV4T2YoICctJywgbmFtZXBvcyAtIDEgKTtcblx0XHRcdFx0dmFyIGNsYXNzbmFtZSA9IG5hbWUuc3Vic3RyaW5nKCBjbGFzc3BvcyArIDEsIG5hbWVwb3MgKTtcblx0XHRcdFx0bmFtZSA9IG5hbWUuc3Vic3RyaW5nKCBuYW1lcG9zICsgMSApO1xuXHRcdFx0XHR0aGlzLm5ld1NvdXZlbmlyc1sgY2xhc3NuYW1lIF0gPSAoIHR5cGVvZiB0aGlzLm5ld1NvdXZlbmlyc1sgY2xhc3NuYW1lIF0gPT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHRoaXMubmV3U291dmVuaXJzWyBjbGFzc25hbWUgXSApO1xuXHRcdFx0XHR0aGlzLm5ld1NvdXZlbmlyc1sgY2xhc3NuYW1lIF1bIG5hbWUgXSA9IGV4cG9ydHMuU291dmVuaXI7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEdhdGhlciBtZW1vcmllc1xuXHRcdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuc3lzdGVtLmdldERpcmVjdG9yeSggdGhpcy5jb25maWcuZ2V0RW5naW5lUGF0aCgpICsgJy9tZW1vcmllcycsIHsgcmVjdXJzaXZlOiB0cnVlLCBmaWx0ZXJzOiBbICdhd2ktbWVtb3J5LSouanMnIF0gfSApO1xuXHRcdFx0dmFyIGZpbGVzID0gdGhpcy51dGlsaXRpZXMuZ2V0RmlsZUFycmF5RnJvbVRyZWUoIGFuc3dlci5kYXRhICk7XG5cdFx0XHRmb3IgKCB2YXIgZiA9IDA7IGYgPCBmaWxlcy5sZW5ndGg7IGYrKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBwYXRoID0gZmlsZXNbIGYgXS5wYXRoO1xuXHRcdFx0XHR2YXIgZXhwb3J0cyA9IHJlcXVpcmUoIHBhdGggKTtcblx0XHRcdFx0dmFyIG5hbWUgPSB0aGlzLnV0aWxpdGllcy5wYXJzZSggcGF0aCApLm5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0dmFyIG5hbWVwb3MgPSBuYW1lLmxhc3RJbmRleE9mKCAnLScgKTtcblx0XHRcdFx0dmFyIGNsYXNzcG9zID0gbmFtZS5sYXN0SW5kZXhPZiggJy0nLCBuYW1lcG9zIC0gMSApO1xuXHRcdFx0XHR2YXIgY2xhc3NuYW1lID0gbmFtZS5zdWJzdHJpbmcoIGNsYXNzcG9zICsgMSwgbmFtZXBvcyApO1xuXHRcdFx0XHRuYW1lID0gbmFtZS5zdWJzdHJpbmcoIG5hbWVwb3MgKyAxICk7XG5cdFx0XHRcdHRoaXMubmV3TWVtb3JpZXNbIGNsYXNzbmFtZSBdID0gKCB0eXBlb2YgdGhpcy5uZXdNZW1vcmllc1sgY2xhc3NuYW1lIF0gPT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHRoaXMubmV3TWVtb3JpZXNbIGNsYXNzbmFtZSBdICk7XG5cdFx0XHRcdHRoaXMubmV3TWVtb3JpZXNbIGNsYXNzbmFtZSBdWyBuYW1lIF0gPSBleHBvcnRzLk1lbW9yeTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBDcmVhdGUgbWVzc2FnZXNcblx0XHR0aGlzLm1lc3NhZ2VzID0gbmV3IGF3aW1lc3NhZ2VzLk1lc3NhZ2VzKCB0aGlzLCB7fSApO1xuXHRcdGF3YWl0IHRoaXMubWVzc2FnZXMubG9hZE1lc3NhZ2VzKCk7XG5cblx0XHQvLyBDcmVhdGUgcGVyc29uYWxpdHlcblx0XHR0aGlzLnBlcnNvbmFsaXR5ID0gbmV3IGF3aXBlcnNvbmFsaXR5LlBlcnNvbmFsaXR5KCB0aGlzLCB7fSApO1xuXG5cdFx0Ly8gRmluaXNoIGluaXRpYWxpemF0aW9uIG9mIHV0aWxpdGllc1xuXHRcdGF3YWl0IHRoaXMudXRpbGl0aWVzLmNvbXBsZXRlQ29ubmVjdCgpO1xuXG5cdFx0Ly8gSXMgZXZlcnlvbmUgY29ubmVjdGVkP1xuXHRcdHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcblx0XHRmb3IgKCB2YXIgZCBpbiBhbnN3ZXJzIClcblx0XHR7XG5cdFx0XHRmb3IgKCB2YXIgZGQgPSAwOyBkZCA8IGFuc3dlcnNbIGQgXS5sZW5ndGg7IGRkKysgKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoICFhbnN3ZXJzWyBkIF1bIGRkIF0uc3VjY2VzcyApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoICFhbnN3ZXJzWyBkIF1bIGRkIF0ubm9uRmF0YWwgKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0dmFyIGFuc3dlciA9IHt9O1xuXHRcdHZhciBwcm9tcHQgPSAnXFxuVGhlIEF3aS1FbmdpbmUgdmVyc2lvbiAnICsgdGhpcy52ZXJzaW9uICsgJ1xcbic7XG5cdFx0cHJvbXB0ICs9ICdCeSBGcmFuY29pcyBMaW9uZXQgKGMpIDIwMjNcXG4nO1xuXHRcdHByb21wdCArPSAnT3Blbi1zb3VyY2UsIHBsZWFzZSByZWFkIHRoZSBsaWNlbmNlLlxcbic7XG5cdFx0cHJvbXB0ICs9ICdcXG4nO1xuXHRcdGlmICggdGhpcy5jb25uZWN0ZWQgKVxuXHRcdHtcblx0XHRcdGlmICggIXRoaXMuY29ubmVjdG9ycy5lZGl0b3JzIClcblx0XHRcdFx0dGhpcy5jb25uZWN0b3JzLmVkaXRvcnMgPSB7fTtcblx0XHRcdGlmICggb3B0aW9ucy5zZXJ2ZXIgKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmVkaXRvciA9IG9wdGlvbnMuc2VydmVyO1xuXHRcdFx0XHR0aGlzLmNvbm5lY3RvcnMuZWRpdG9ycy5jdXJyZW50ID0gb3B0aW9ucy5zZXJ2ZXI7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGlmICggIXRoaXMuZWRpdG9yIClcblx0XHRcdFx0XHR0aGlzLmVkaXRvciA9IHRoaXMuY29ubmVjdG9ycy5zZXJ2ZXJzLmN1cnJlbnQ7XG5cdFx0XHRcdGlmICggIXRoaXMuY29ubmVjdG9ycy5lZGl0b3JzLmN1cnJlbnQgKVxuXHRcdFx0XHRcdHRoaXMuY29ubmVjdG9ycy5lZGl0b3JzLmN1cnJlbnQgPSB0aGlzLmNvbm5lY3RvcnMuc2VydmVycy5jdXJyZW50O1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5wcm9tcHQgPSBuZXcgYXdpcHJvbXB0LlByb21wdCggdGhpcywgeyBwYXJhbWV0ZXJzOiB7IHNlbmRlck5hbWU6ICcnLCByZWNlaXZlck5hbWU6ICcnIH0gfSApO1x0Ly8gVE9ETzogZml4IHRoaXMuXG5cdFx0XHRhbnN3ZXIuc3VjY2VzcyA9IHRydWU7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRwcm9tcHQgKz0gJ0Nhbm5vdCBjb25uZWN0IVxcbic7XG5cdFx0XHRhbnN3ZXIuc3VjY2VzcyA9IGZhbHNlO1xuXHRcdFx0YW5zd2VyLmVycm9yID0gJ2F3aTpjYW5ub3QtaW5pdGlhbGl6ZTppd2EnO1xuXHRcdFx0Y29uc29sZS5sb2coIHByb21wdCApO1xuXHRcdFx0Y29uc29sZS5sb2coIGFuc3dlcnMgKTtcblx0XHR9XG5cdFx0Zm9yICggdmFyIGQgaW4gYW5zd2VycyApXG5cdFx0e1xuXHRcdFx0Zm9yICggdmFyIGRkID0gMDsgZGQgPCBhbnN3ZXJzWyBkIF0ubGVuZ3RoOyBkZCsrIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGRhdGEgPSBhbnN3ZXJzWyBkIF1bIGRkIF0uZGF0YTtcblx0XHRcdFx0cHJvbXB0ICs9ICggYW5zd2Vyc1sgZCBdWyBkZCBdLnN1Y2Nlc3MgPyAnKG9rKSAnIDogJyggICkgJyApICsgZGF0YS5jbGFzc25hbWUgKyAnOiAnICsgZGF0YS5wcm9tcHQgKyAnXFxuJztcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKCB0aGlzLmNvbm5lY3RlZCApXG5cdFx0XHRwcm9tcHQgKz0gJ1JlYWR5Llxcbidcblx0XHRpZiAoIHRoaXMuZWRpdG9yLmNvbm5lY3RlZCApXG5cdFx0XHR0aGlzLmVkaXRvci5wcmludCggdGhpcy5lZGl0b3IuZGVmYXVsdCwgcHJvbXB0LnNwbGl0KCAnXFxuJyApLCB7IHVzZXI6ICdhd2knIH0gKTtcblx0XHRyZXR1cm4gYW5zd2VyO1xuXHR9XG5cdGdldENvbmZpZyggdHlwZSApXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5jb25maWcuZ2V0Q29uZmlnKCB0eXBlICk7XG5cdH1cblx0Z2V0UGVyc29uYWxpdHkoIG5hbWUgKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuY29uZmlnLmdldFBlcnNvbmFsaXR5KCBuYW1lICk7XG5cdH1cblx0Z2V0Q29ubmVjdG9yKCBjbGFzc25hbWUsIG5hbWUsIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5jb25uZWN0b3JzWyBjbGFzc25hbWUgXVsgbmFtZSBdO1xuXHR9XG5cdGNsZWFuUmVzcG9uc2UoIHRleHQgKVxuXHR7XG5cdFx0Ly8gR2V0IHJpZCBvZiBlbXB0eSBsaW5lcy5cblx0XHR0ZXh0ID0gdGV4dC50cmltKCkuc3BsaXQoICdcXG4nICk7XG5cdFx0dmFyIG5ld1RleHQgPSAnJztcblx0XHRmb3IgKCB2YXIgdCA9IDA7IHQgPCB0ZXh0Lmxlbmd0aDsgdCsrIClcblx0XHR7XG5cdFx0XHR0ZXh0WyB0IF0gPSB0ZXh0WyB0IF0udHJpbSgpO1xuXHRcdFx0aWYgKCB0ZXh0WyB0IF0gKVxuXHRcdFx0XHRuZXdUZXh0ICs9IHRleHRbIHQgXSArICdcXG4nO1xuXHRcdH1cblx0XHR0ZXh0ID0gbmV3VGV4dDtcblxuXHRcdC8vIFJlbW92ZSBuYW1lcyBhdCBzdGFydCBvZiBsaW5lLlxuXHRcdHZhciBwZXJzb25hbGl0eSA9IHRoaXMuZ2V0UGVyc29uYWxpdHkoKTtcblx0XHR2YXIgdXNlciA9IHRoaXMuZ2V0Q29uZmlnKCAndXNlcicgKTtcblx0XHR2YXIgcG9zO1xuXHRcdHdoaWxlICggKCBwb3MgPSB0ZXh0LmluZGV4T2YoIHBlcnNvbmFsaXR5Lm5hbWUgKyAnOicgKSApID49IDAgKVxuXHRcdFx0dGV4dCA9IHRleHQuc3Vic3RyaW5nKCAwLCBwb3MgKSArIHRleHQuc3Vic3RyaW5nKCBwb3MgKyBwZXJzb25hbGl0eS5uYW1lLmxlbmd0aCArIDEgKS50cmltKCk7XG5cdFx0d2hpbGUgKCAoIHRleHQuaW5kZXhPZiggdXNlci5uYW1lICsgJzonICkgPj0gMCApIClcblx0XHRcdHRleHQgPSB0ZXh0LnN1YnN0cmluZyggMCwgcG9zICkgKyB0ZXh0LnN1YnN0cmluZyggcG9zICsgdXNlci5uYW1lLmxlbmd0aCArIDEgKS50cmltKCk7XG5cdFx0cmV0dXJuIHRleHQudHJpbSgpLnNwbGl0KCAnXFxuJyApO1xuXHR9XG5cdGFsZXJ0KCBtZXNzYWdlLCBvcHRpb25zIClcblx0e1xuXHRcdGNvbnNvbGUuZXJyb3IoIG1lc3NhZ2UgKTtcblx0fVxuXHRzeXN0ZW1XYXJuaW5nKCBtZXNzYWdlIClcblx0e1xuXHRcdGNvbnNvbGUud2FybiggbWVzc2FnZSApO1xuXHRcdGlmICggdGhpcy5lZGl0b3IgJiYgdGhpcy5lZGl0b3IuY29ubmVjdGVkIClcblx0XHRcdHRoaXMuZWRpdG9yLnByaW50KCB0aGlzLCBtZXNzYWdlLnNwbGl0KCAnXFxuJyApLCB7IHVzZXI6ICdzeXN0ZW13YXJuaW5nJyB9ICk7XG5cdH1cblx0YXN5bmMgcHJvbXB0KCBwcm9tcHQsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIGNhbGxiYWNrID0gY29udHJvbC5jYWxsYmFjaztcblx0XHR2YXIgZXh0cmEgPSBjb250cm9sLmV4dHJhO1xuXHRcdGNvbnRyb2wuY2FsbGJhY2sgPSBudWxsO1xuXHRcdGNvbnRyb2wuZXh0cmEgPSBudWxsO1xuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLnByb21wdC5wcm9tcHQoIHByb21wdCwgZGF0YSwgY29udHJvbCApO1xuXHRcdGlmICggY2FsbGJhY2sgKVxuXHRcdFx0Y2FsbGJhY2soIHRydWUsIGFuc3dlciwgZXh0cmEgKTtcblx0XHRyZXR1cm4gYW5zd2VyO1xuXHR9XG5cdGluaXRNZW1vcnkoIG1lbW9yeSApXG5cdHtcblx0XHRtZW1vcnkuYnViYmxlSGFzaCA9IHt9O1xuXHRcdGZvciAoIHZhciBrZXkgaW4gbWVtb3J5LmJ1YmJsZU1hcCApXG5cdFx0XHRtZW1vcnkuYnViYmxlSGFzaFsgbWVtb3J5LmJ1YmJsZU1hcFsga2V5IF0gXSA9IGtleTtcblx0XHRyZXR1cm4gbWVtb3J5O1xuXHR9XG5cdGFzeW5jIHNhdmUoIHVzZXIgKVxuXHR7XG5cdFx0dXNlciA9IHR5cGVvZiB1c2VyID09ICd1bmRlZmluZWQnID8gdGhpcy5jb25maWcudXNlciA6IHVzZXI7XG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMucGVyc29uYWxpdHkuc2F2ZU1lbW9yaWVzKCAnYW55JyApO1xuXHRcdC8vaWYgKCAhYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0cmV0dXJuIGFuc3dlcjtcblxuXHRcdC8vdmFyIGNvbnZlcnNhdGlvbnMgPSB0aGlzLnV0aWxpdGllcy5zZXJpYWxpemVPdXQoIHRoaXMucHJvbXB0LCAnJyApO1xuXHRcdC8vdmFyIHBhdGggPSB0aGlzLmNvbmZpZy5nZXRDb25maWd1cmF0aW9uUGF0aCgpICsgJy8nICsgdXNlciArICctJztcblx0XHQvL3JldHVybiBhd2FpdCB0aGlzLnN5c3RlbS53cml0ZUZpbGUoIHBhdGggKyAnY29udmVyc2F0aW9ucy5qcycsIGNvbnZlcnNhdGlvbnMsIHsgZW5jb2Rpbmc6ICd1dGY4JyB9ICk7XG5cdH1cblx0YXN5bmMgbG9hZFVzZXIoIHVzZXIgKVxuXHR7XG5cdFx0dXNlciA9IHR5cGVvZiB1c2VyID09ICd1bmRlZmluZWQnID8gdGhpcy5jb25maWcudXNlciA6IHVzZXI7XG5cblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5wZXJzb25hbGl0eS5sb2FkTWVtb3JpZXMoICdhbnknICk7XG5cdFx0aWYgKCAhYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0cmV0dXJuIGFuc3dlcjtcblxuXHRcdHZhciBwYXRoID0gdGhpcy5jb25maWcuZ2V0Q29uZmlndXJhdGlvblBhdGgoKSArICcvJyArIHVzZXIgKyAnLSc7XG5cdFx0dmFyIGNvbnZlcnNhdGlvbnM7XG5cdFx0YW5zd2VyID0gYXdhaXQgdGhpcy5zeXN0ZW0uZXhpc3RzKCBwYXRoICsgJ2NvbnZlcnNhdGlvbnMuanMnICk7XG5cdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0e1xuXHRcdFx0YW5zd2VyID0gYXdhaXQgdGhpcy5zeXN0ZW0ucmVhZEZpbGUoIHBhdGggKyAnY29udmVyc2F0aW9ucy5qcycsIHsgZW5jb2Rpbmc6ICd1dGY4JyB9ICk7XG5cdFx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHRcdHtcblx0XHRcdFx0Y29udmVyc2F0aW9ucyA9IGFuc3dlci5kYXRhO1xuXHRcdFx0XHR0cnlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnZlcnNhdGlvbnMgPSBGdW5jdGlvbiggY29udmVyc2F0aW9ucyApO1xuXHRcdFx0XHRcdGNvbnZlcnNhdGlvbnMgPSBjb252ZXJzYXRpb25zKCk7XG5cdFx0XHRcdFx0dGhpcy51dGlsaXRpZXMuc2VyaWFsaXplSW4oIGNvbnZlcnNhdGlvbnMucm9vdCwge30gKTtcblx0XHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2F0Y2goIGUgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2F3aTpjYW5ub3QtbG9hZC1jb252ZXJzYXRpb25zOml3YScgfTtcblx0XHR9XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuXHR9XG5cdHJlbWVtYmVyKCB3aGF0LCBkaXJlY3QsIGluZGlyZWN0IClcblx0e1xuXHRcdHRoaXMuZGlyZWN0UmVtZW1iZXJpbmcucHVzaCggeyB3aGF0OiB3aGF0LnRvTG93ZXJDYXNlKCksIHNvdXZlbmlyczogZGlyZWN0LnNvdXZlbmlycywgY29udGVudDogZGlyZWN0LmNvbnRlbnQgfSApO1xuXHRcdHRoaXMuaW5kaXJlY3RSZW1lbWJlcmluZy5wdXNoKCB7IHdoYXQ6IHdoYXQudG9Mb3dlckNhc2UoKSwgc291dmVuaXJzOiBpbmRpcmVjdC5zb3V2ZW5pcnMsIGNvbnRlbnQ6IGluZGlyZWN0LmNvbnRlbnQgfSApO1xuXHR9XG5cdGZvcmdldCggd2hhdCApXG5cdHtcblx0XHR3aGF0ID0gd2hhdC50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0dmFyIG5ld0FycmF5ID0gW107XG5cdFx0Zm9yICggdmFyIHMgPSAwOyBzIDwgdGhpcy5kaXJlY3RSZW1lbWJlcmluZy5sZW5ndGg7IHMrKyApXG5cdFx0e1xuXHRcdFx0aWYgKCB3aGF0ICE9IHRoaXMuZGlyZWN0UmVtZW1iZXJpbmdbIHMgXS5uYW1lIClcblx0XHRcdFx0bmV3QXJyYXkucHVzaCggdGhpcy5kaXJlY3RSZW1lbWJlcmluZ1sgcyBdICk7XG5cdFx0fVxuXHRcdHRoaXMuZGlyZWN0UmVtZW1iZXJpbmcgPSBuZXdBcnJheTtcblxuXHRcdG5ld0FycmF5ID0gW107XG5cdFx0Zm9yICggdmFyIHMgPSAwOyBzIDwgdGhpcy5pbmRpcmVjdFJlbWVtYmVyaW5nLmxlbmd0aDsgcysrIClcblx0XHR7XG5cdFx0XHRpZiAoIHdoYXQgIT0gdGhpcy5pbmRpcmVjdFJlbWVtYmVyaW5nWyBzIF0ubmFtZSApXG5cdFx0XHRcdG5ld0FycmF5LnB1c2goIHRoaXMuaW5kaXJlY3RSZW1lbWJlcmluZ1sgcyBdICk7XG5cdFx0fVxuXHRcdHRoaXMuaW5kaXJlY3RSZW1lbWJlcmluZyA9IG5ld0FycmF5O1xuXHR9XG5cdGFzeW5jIGV4dHJhY3RDb250ZW50RnJvbU1lbW9yaWVzKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0dmFyIGRpcmVjdCA9IFtdO1xuXHRcdGZvciAoIHZhciByID0gMDsgciA8IHRoaXMuZGlyZWN0UmVtZW1iZXJpbmcubGVuZ3RoOyByKysgKVxuXHRcdHtcblx0XHRcdHZhciByZW1lbWJlcmluZyA9IHRoaXMuZGlyZWN0UmVtZW1iZXJpbmdbIHIgXTtcblx0XHRcdGZvciAoIHZhciBzID0gMDsgcyA8IHJlbWVtYmVyaW5nLnNvdXZlbmlycy5sZW5ndGg7IHMrKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCByZW1lbWJlcmluZy5zb3V2ZW5pcnNbIHMgXS5leHRyYWN0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdFx0XHRpZiAoIGFuc3dlci5zdWNjZXNzID09ICdmb3VuZCcgKVxuXHRcdFx0XHRcdGRpcmVjdC5wdXNoKCBhbnN3ZXIuZGF0YSApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgaW5kaXJlY3QgPSBbXTtcblx0XHRmb3IgKCB2YXIgciA9IDA7IHIgPCB0aGlzLmluZGlyZWN0UmVtZW1iZXJpbmcubGVuZ3RoOyByKysgKVxuXHRcdHtcblx0XHRcdHZhciByZW1lbWJlcmluZyA9IHRoaXMuaW5kaXJlY3RSZW1lbWJlcmluZ1sgciBdO1xuXHRcdFx0Zm9yICggdmFyIHMgPSAwOyBzIDwgcmVtZW1iZXJpbmcuc291dmVuaXJzLmxlbmd0aDsgcysrIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGFuc3dlciA9IGF3YWl0IHJlbWVtYmVyaW5nLnNvdXZlbmlyc1sgcyBdLmV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0XHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgPT0gJ2ZvdW5kJyApXG5cdFx0XHRcdFx0aW5kaXJlY3QucHVzaCggYW5zd2VyLmRhdGEgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZGlyZWN0LnNvcnQoXG5cdFx0XHRmdW5jdGlvbiggZWxlbWVudDEsIGVsZW1lbnQyIClcblx0XHRcdHtcblx0XHRcdFx0aWYgKCBlbGVtZW50MS5yZXN1bHQgPCBlbGVtZW50Mi5yZXN1bHQgKVxuXHRcdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0XHRpZiAoIGVsZW1lbnQxLnJlc3VsdCA+IGVsZW1lbnQyLnJlc3VsdCApXG5cdFx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH0gKTtcblx0XHRpbmRpcmVjdC5zb3J0KFxuXHRcdFx0ZnVuY3Rpb24oIGVsZW1lbnQxLCBlbGVtZW50MiApXG5cdFx0XHR7XG5cdFx0XHRcdGlmICggZWxlbWVudDEucmVzdWx0IDwgZWxlbWVudDIucmVzdWx0IClcblx0XHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdFx0aWYgKCBlbGVtZW50MS5yZXN1bHQgPiBlbGVtZW50Mi5yZXN1bHQgKVxuXHRcdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9ICk7XG5cblx0XHR2YXIgZGlyZWN0RXh0cmFjdGVkID0gJyc7XG5cdFx0dmFyIGluZGlyZWN0RXh0cmFjdGVkID0gJyc7XG5cdFx0b3B0aW9ucy50eXBlID0gdHlwZW9mIG9wdGlvbnMudHlwZSA9PSAndW5kZWZpbmVkJyA/ICdjaGF0JyA6IG9wdGlvbnMudHlwZTtcblx0XHRvcHRpb25zLm5EaXJlY3RFeHRyYWN0cyA9IHR5cGVvZiBvcHRpb25zLm5EaXJlY3RFeHRyYWN0cyA9PSAndW5kZWZpbmVkJyA/IDMgOiBvcHRpb25zLm5EaXJlY3RFeHRyYWN0cztcblx0XHRvcHRpb25zLm5JbmRpcmVjdEV4dHJhY3RzID0gdHlwZW9mIG9wdGlvbnMubkluZGlyZWN0RXh0cmFjdHMgPT0gJ3VuZGVmaW5lZCcgPyAzIDogb3B0aW9ucy5uSW5kaXJlY3RFeHRyYWN0cztcblx0XHRzd2l0Y2ggKCBvcHRpb25zLnR5cGUgKVxuXHRcdHtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRjYXNlICdjaGF0Jzpcblx0XHRcdFx0Zm9yICggdmFyIG4gPSAwOyBuIDwgb3B0aW9ucy5uRGlyZWN0RXh0cmFjdHM7IG4rKyApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoIG4gPCBkaXJlY3QubGVuZ3RoIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR2YXIgZXh0cmFjdCA9IGRpcmVjdFsgbiBdO1xuXHRcdFx0XHRcdFx0aWYgKCBleHRyYWN0LmNvbnRlbnQudGV4dCApXG5cdFx0XHRcdFx0XHRcdGRpcmVjdEV4dHJhY3RlZCArPSAnU29tZW9uZSBzYWlkOiAnICsgZXh0cmFjdC50ZXh0ICsgJ1xcbic7XG5cdFx0XHRcdFx0XHRpZiAoIGV4dHJhY3QuY29udGVudC5zZW5kZXJUZXh0IClcblx0XHRcdFx0XHRcdFx0ZGlyZWN0RXh0cmFjdGVkICs9IGV4dHJhY3QuY29udGVudC5zZW5kZXJOYW1lICsgJyBzYWlkOiAnICsgZXh0cmFjdC5jb250ZW50LnNlbmRlclRleHQgKyAnXFxuJztcblx0XHRcdFx0XHRcdGlmICggZXh0cmFjdC5jb250ZW50LnJlY2VpdmVyVGV4dCApXG5cdFx0XHRcdFx0XHRcdGRpcmVjdEV4dHJhY3RlZCArPSBleHRyYWN0LmNvbnRlbnQucmVjZWl2ZXJOYW1lICsgJyBzYWlkOiAnICsgZXh0cmFjdC5jb250ZW50LnJlY2VpdmVyVGV4dCArICdcXG4nO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRmb3IgKCB2YXIgbiA9IDA7IG4gPCBvcHRpb25zLm5JbmRpcmVjdEV4dHJhY3RzOyBuKysgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCBuIDwgaW5kaXJlY3QubGVuZ3RoIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR2YXIgZXh0cmFjdCA9IGluZGlyZWN0WyBuIF07XG5cdFx0XHRcdFx0XHRpZiAoIGV4dHJhY3QuY29udGVudC50ZXh0IClcblx0XHRcdFx0XHRcdFx0aW5kaXJlY3RFeHRyYWN0ZWQgKz0gJ1NvbWVvbmUgc2FpZDogJyArIGV4dHJhY3QudGV4dCArICdcXG4nO1xuXHRcdFx0XHRcdFx0aWYgKCBleHRyYWN0LmNvbnRlbnQuc2VuZGVyVGV4dCApXG5cdFx0XHRcdFx0XHRcdGluZGlyZWN0RXh0cmFjdGVkICs9IGV4dHJhY3QuY29udGVudC5zZW5kZXJOYW1lICsgJyBzYWlkOiAnICsgZXh0cmFjdC5jb250ZW50LnNlbmRlclRleHQgKyAnXFxuJztcblx0XHRcdFx0XHRcdGlmICggZXh0cmFjdC5jb250ZW50LnJlY2VpdmVyVGV4dCApXG5cdFx0XHRcdFx0XHRcdGluZGlyZWN0RXh0cmFjdGVkICs9IGV4dHJhY3QuY29udGVudC5yZWNlaXZlck5hbWUgKyAnIHNhaWQ6ICcgKyBleHRyYWN0LmNvbnRlbnQucmVjZWl2ZXJUZXh0ICsgJ1xcbic7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0XHRpZiAoIGRpcmVjdEV4dHJhY3RlZCB8fCBpbmRpcmVjdEV4dHJhY3RlZCApXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiAnZm91bmQnLCBkYXRhOiB7IGRpcmVjdEV4dHJhY3RlZDogZGlyZWN0RXh0cmFjdGVkLCBpbmRpcmVjdEV4dHJhY3RlZDogaW5kaXJlY3RFeHRyYWN0ZWQgfSB9O1xuXHRcdHJldHVybiB7IHN1Y2Nlc3M6ICdub3Rmb3VuZCcsIGRhdGE6IHsgZGlyZWN0RXh0cmFjdGVkOiAnJywgaW5kaXJlY3RFeHRyYWN0ZWQ6ICcnIH0gfTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQXdpID0gQXdpO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktYnViYmxlLWdlbmVyaWMtY29kZS5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgQ29kZSBjb21tYW5kOiBjcmVhdGUgYSBqYXZhc2NyaXB0IGZ1bmN0aW9uXG4qXG4qL1xudmFyIGF3aWJ1YmJsZSA9IHJlcXVpcmUoICcuLi9hd2ktYnViYmxlJyApXG52YXIgYXdpbWVzc2FnZXMgPSByZXF1aXJlKCAnLi4vLi4vYXdpLW1lc3NhZ2VzJyApXG5cbmNsYXNzIEJ1YmJsZUFvekJhc2ljQ29kZSBleHRlbmRzIGF3aWJ1YmJsZS5CdWJibGVcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLm5hbWUgPSAnQ29kZSc7XG5cdFx0dGhpcy50b2tlbiA9ICdjb2RlJztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdhb3piYXNpYyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICd3cml0ZXMgYSBqYXZhc2NyaXB0IGZ1bmN0aW9uJztcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gW1xuXHRcdFx0eyBjb2RlTmFtZTogJ3RoZSBuYW1lIG9mIHRoZSBwcm9jZWR1cmUgdG8gY3JlYXRlLlxcbiBUaGUgbmFtZSBzaG91bGQgY29udGFpbiB0aGUgZnVuY3Rpb24uJywgdHlwZTogJ3N0cmluZycsIGNsZWFyOiB0cnVlIH0sXG5cdFx0XHR7IGNvZGVQYXJhbWV0ZXJzOiAndGhlIGxpc3Qgb2YgcGFyYW1ldGVycywgc2VwYXJhdGVkIGJ5IGEgY29tbWEuXFxuIFRoZSBuYW1lIHNob3VsZCBpbmRpY2F0ZSB0aGUgY29udGVudC4nLCB0eXBlOiAnc3RyaW5nJywgY2xlYXI6IHRydWUgfSxcblx0XHRcdHsgY29kZVN0ZXBzOiAndGhlIHZhcmlvdXMgYnViYmxlcyB0aGUgcHJvY2VkdXJlIHNob3VsZCBkbywgb25lIHBlciBsaW5lLlxcbiBTdGF5IHNpbXBsZSwgaW4gb3JkZXJuIG5vdCB0b28gbWFueSBkZXRhaWxzLi4uXFxuRW1wdHkgbGluZSB0byBxdWl0LicsIGNsZWFyOiB0cnVlIH0sXG5cdFx0XHR7IGNvZGVSZXR1cm46ICd3aGF0IHRoZSBwcm9jZWR1cmUgc2hvdWxkIHJldHVybi4nLCB0eXBlOiAnc3RyaW5nJywgY2xlYXI6IHRydWUgfSxcblx0XHRcdHsgY29kZUNhbGxiYWNrOiAnaWYgdGhlIGJ1YmJsZSBpcyBpbiByZWxhdGVkIHRvIG5ldHdvcmsgYW5kIEludGVybmV0Py4nLCB0eXBlOiAneWVzbm8nLCBjbGVhcjogdHJ1ZSB9LFxuXHRcdFx0eyBjb2RlQ29uZmlybTogJ2lmIHlvdSBjb25maXJtIGFsbCB0aGUgcGFyYW1ldGVycyBhYm92ZS4uLicsIHR5cGU6ICd5ZXNubycsIGNsZWFyOiB0cnVlIH0sXG5cdFx0XTtcblx0XHR0aGlzLnByb3BlcnRpZXMuZWRpdGFibGVzID1cblx0XHRbXG5cdFx0XHR7IG5hbWU6ICdwcm9tcHQnLCB0eXBlOiAndGV4dCcsIGNvbnRlbnQ6IGBcbllvdXIgbmFtZSBpcyB7bmFtZX0uXG4xLiBZb3UgYXJlIGEgcHJvZ3JhbW1pbmcgYXNzaXN0YW50IHRoYXQgdXNlcyBKYXZhc2NyaXB0IGV4Y2x1c2l2ZWx5LlxuMi4gVGhlIGNvZGUgeW91IHdyaXRlIHNob3VsZCBydW4gaW4gYSBicm93c2VyLlxuMy4gWW91ciBnb2FsIGlzIHRvIGNyZWF0ZSBhIGZ1bmN0aW9uIHRoYXQgc3RpY2tzIHRvIHRoZSByZXF1aXJlbWVudHMuXG5QbGVhc2UgdGFrZSB0aGUgZm9sbG93aW5nIHJlcXVpcmVtZW50cyBpbnRvIGNvbnNpZGVyYXRpb24gYmVmb3JlIGV4ZWN1dGluZyB0aGUgdGFzazpcblxcUmVxdWlyZW1lbnRzOlxuMS4gWW91IHNob3VsZCBjcmVhdGUgYSBKYXZhc2NyaXB0IGZ1bmN0aW9uLlxuMi4gU3RhcnQgdGhlIGNvZGUgc2VjdGlvbiB3aXRoICc8U1RBUlQtQ09ERT4nIGFuZCBlbmQgaXQgd2l0aCAnPEVORC1DT0RFPicuXG4zLiBZb3Ugc2hvdWxkIG5vdCB1c2UgYW55IGFzeW5jIGNvZGUgYnV0IGEgY2FsbGJhY2sgaWYgbmVjZXNzYXJ5LlxuNC4gVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIGlzOiB7ZnVuY3Rpb25OYW1lfVxuNS4gVGhlIGxpc3Qgb2YgcGFyYW1ldGVycyBpczoge3BhcmFtZXRlcnN9XG5UYXNrOlxuUGxlYXNlIGNyZWF0ZSBKYXZhc2NyaXB0IGNvZGUgYmFzZWQgb24gdGhpcyBkZXNjcmlwdGlvbjpcbntkZXNjcmlwdGlvbn1cbk5vdyB0aGUgY29kZTpcbmAgXHRcdFx0XHR9XG5cdFx0XTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBqYXZhc2NyaXB0Q29kZTogJ3RoZSBjb2RlIG9mIHRoZSBuZXcgZnVuY3Rpb24nLCB0eXBlOiAnc3RyaW5nJyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnBhcnNlciA9IHsgdmVyYjogWyAnY29kZScsICdwcm9ncmFtJyBdLCBub3VuOiBbICdwcm9jZWR1cmUnIF0gfTtcblx0XHR0aGlzLnByb3BlcnRpZXMuc2VsZWN0ID0gWyBbICd2ZXJiJywgJ25vdW4nIF0gXTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0aWYgKCAhYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGRhdGE6IHt9LCBlcnJvcjogJ2F3aTpjYW5jZWxsZWQ6aXdhJyB9O1xuXG4gXHRcdHZhciBkZXNjcmlwdGlvbiA9ICcnXG5cdFx0Zm9yICggdmFyIHMgPSAwOyBzIDwgcGFyYW1ldGVycy5jb2RlU3RlcHMubGVuZ3RoOyBzKysgKVxuXHRcdFx0ZGVzY3JpcHRpb24gKz0gKCBzICsgMSApICsgJy4gJyArIHBhcmFtZXRlcnMuY29kZVN0ZXBzWyBzIF0gKyAnXFxuJztcblx0XHRpZiAoIHBhcmFtZXRlcnMuY29kZVJldHVybiAhPSAnJyApXG5cdFx0XHRkZXNjcmlwdGlvbiArPSAoIHMgKyAxICkgKyAnLiAnICsgdGhpcy5nZXRFZGl0YWJsZSggJ3JldHVybnMnICkgKyBkYXRhLmNvZGVSZXR1cm4gKyAnXFxuJztcblx0XHR2YXIgcGFyYW1ldGVycyA9IHBhcmFtZXRlcnMuY29kZVBhcmFtZXRlcnM7XG5cdFx0aWYgKCBwYXJhbWV0ZXJzID09ICcnIClcblx0XHR7XG5cdFx0XHRpZiAoIHBhcmFtZXRlcnMuY29kZUNhbGxiYWNrIClcblx0XHRcdFx0cGFyYW1ldGVycyArPSAnY2FsbGJhY2snO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRwYXJhbWV0ZXJzID0gJ3RoZXJlIGlzIG5vIHBhcmFtZXRlcnMuJztcblx0XHR9XG5cdFx0ZWxzZSBpZiAoIHBhcmFtZXRlcnMuY29kZUNhbGxiYWNrIClcblx0XHRcdHBhcmFtZXRlcnMgKz0gJyxjYWxsYmFjayc7XG5cblx0XHR2YXIgcHJvbXB0ID0gYXdpbWVzc2FnZXMuZ2VuZXJhdGVQcm9tcHQoIHRoaXMuZ2V0RWRpdGFibGUoICdwcm9tcHQnICksXG5cdFx0e1xuXHRcdFx0bmFtZTogdGhpcy5hd2kuZ2V0Q29uZmlnKCAndXNlcicgKS5hd2lOYW1lLFxuXHRcdFx0bW9vZDogdGhpcy5hd2kuZ2V0Q29uZmlnKCAndXNlcicgKS5hd2lOYW1lLFxuXHRcdFx0ZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLFxuXHRcdFx0ZnVuY3Rpb25OYW1lOiBkYXRhLmNvZGVOYW1lLFxuXHRcdFx0cGFyYW1ldGVyczogcGFyYW1ldGVyc1xuXHRcdH0gKTtcblx0XHR2YXIgYW5zd2VyID0gdGhpcy5zZW5kQ29tcGxldGlvbiggcHJvbXB0LCBmYWxzZSwgY29udHJvbCApO1xuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdHtcblx0XHRcdHZhciByZXN1bHQgPSBhbnN3ZXIuZGF0YS50ZXh0LnRyaW0oKTtcblx0XHRcdHJlc3VsdCA9IHJlc3VsdC5zcGxpdCggJ1xcbicgKTtcblxuXHRcdFx0dmFyIGRlc3RDb2RlO1xuXHRcdFx0dmFyIG5hbWU7XG5cdFx0XHR2YXIgcGFyYW1zID0gW107XG5cdFx0XHR2YXIgc3RhcnRDb2RlID0gMDtcblx0XHRcdHZhciBpc0NhbGxiYWNrID0gZmFsc2U7XG5cdFx0XHR2YXIgZW5kQ29kZSA9IHJlc3VsdC5sZW5ndGg7XG5cdFx0XHRmb3IgKCB2YXIgbCA9IDA7IGwgPCByZXN1bHQubGVuZ3RoOyBsKysgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgbGluZSA9IHJlc3VsdFsgbCBdO1xuXHRcdFx0XHRpZiAoIGxpbmUuaW5kZXhPZiggJzxTVEFSVC1DT0RFPicgKSA+PSAwIClcblx0XHRcdFx0XHRzdGFydENvZGUgPSBsICsgMTtcblx0XHRcdFx0aWYgKCBsaW5lLmluZGV4T2YoICc8RU5ELUNPREU+JyApID49IDAgKVxuXHRcdFx0XHRcdGVuZENvZGUgPSBsO1xuXHRcdFx0XHRpZiAoIGxpbmUudG9Mb3dlckNhc2UoKS5pbmRleE9mKCAnY2FsbGJhY2snICkgPj0gMCApXG5cdFx0XHRcdFx0aXNDYWxsYmFjayA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRmb3IgKCB2YXIgbCA9IHN0YXJ0Q29kZTsgbCA8IGVuZENvZGU7IGwrKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBsaW5lID0gcmVzdWx0WyBsIF07XG5cdFx0XHRcdHZhciBzdGFydCA9IGxpbmUuaW5kZXhPZiggJ2Z1bmN0aW9uJyApO1xuXHRcdFx0XHRpZiAoIHN0YXJ0ID49IDAgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0c3RhcnQgPSBsaW5lLmluZGV4T2YoICcgJywgc3RhcnQgKTtcblx0XHRcdFx0XHR2YXIgZW5kID0gbGluZS5pbmRleE9mKCAnKCcgKTtcblx0XHRcdFx0XHRuYW1lID0gbGluZS5zdWJzdHJpbmcoIHN0YXJ0ICsgMSwgZW5kICk7XG5cblx0XHRcdFx0XHQvLyBFeHRyYWN0IHBhcmFtZXRlcnNcblx0XHRcdFx0XHRzdGFydCA9IGVuZCArIDE7XG5cdFx0XHRcdFx0dmFyIGNsb3NlID0gbGluZS5pbmRleE9mKCAnKScsIHN0YXJ0ICk7XG5cdFx0XHRcdFx0d2hpbGUgKCBzdGFydCA8IGxpbmUubGVuZ3RoIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR3aGlsZSAoIGxpbmUuY2hhckF0KCBzdGFydCApID09ICcgJyApXG5cdFx0XHRcdFx0XHRcdHN0YXJ0Kys7XG5cdFx0XHRcdFx0XHRlbmQgPSBsaW5lLmluZGV4T2YoICcsJywgc3RhcnQgKTtcblx0XHRcdFx0XHRcdGlmICggZW5kIDwgMCApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGlmICggY2xvc2UgPiBzdGFydCApXG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnB1c2goIGxpbmUuc3Vic3RyaW5nKCBzdGFydCwgY2xvc2UgKSApO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHBhcmFtcy5wdXNoKCBsaW5lLnN1YnN0cmluZyggc3RhcnQsIGVuZCApLnRyaW0oKSApO1xuXHRcdFx0XHRcdFx0c3RhcnQgPSBlbmQgKyAxO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIEdlbmVyYXRlcyBjb2RlXG5cdFx0XHRcdFx0ZGVzdENvZGUgPSAnUHJvY2VkdXJlICcgKyBuYW1lICsgJ1snO1xuXHRcdFx0XHRcdGZvciAoIHZhciBwID0gMDsgcCA8IHBhcmFtcy5sZW5ndGg7IHArKyApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKCBwYXJhbXNbIHAgXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YoICdjYWxsYmFjaycgKSA8IDAgKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRpZiAoIHAgPiAwIClcblx0XHRcdFx0XHRcdFx0XHRkZXN0Q29kZSArPSAnLCAnO1xuXHRcdFx0XHRcdFx0XHRkZXN0Q29kZSArPSBwYXJhbXNbIHAgXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZGVzdENvZGUgKz0gJ11cXG4nO1xuXHRcdFx0XHRcdGRlc3RDb2RlICs9ICdcXHQvLyBKYXZhc2NyaXB0IChkbyBub3QgcmVtb3ZlIHRoaXMgbGluZSlcXG4nO1xuXHRcdFx0XHRcdGRlc3RDb2RlICs9ICdcXHR7XFxuJztcblx0XHRcdFx0XHRpZiAoIGlzQ2FsbGJhY2sgKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGRlc3RDb2RlICs9ICdcXHRcXHQjd2FpdGluZ1xcbic7XG5cdFx0XHRcdFx0XHRkZXN0Q29kZSArPSAnXFx0XFx0dmFyIGRvbmU9ZmFsc2U7XFxuJ1xuXHRcdFx0XHRcdFx0ZGVzdENvZGUgKz0gJ1xcdFxcdGZ1bmN0aW9uIG9uUmVzdWx0KHJlc3VsdClcXG4nO1xuXHRcdFx0XHRcdFx0ZGVzdENvZGUgKz0gJ1xcdFxcdHtcXG4nO1xuXHRcdFx0XHRcdFx0ZGVzdENvZGUgKz0gJ1xcdFxcdFxcdGFvei50ZW1wUmVzdWx0PXJlc3VsdDtcXG4nXG5cdFx0XHRcdFx0XHRkZXN0Q29kZSArPSAnXFx0XFx0XFx0ZG9uZT10cnVlO1xcbidcblx0XHRcdFx0XHRcdGRlc3RDb2RlICs9ICdcXHRcXHR9O1xcbidcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Zm9yICggdmFyIGxsID0gc3RhcnRDb2RlOyBsbCA8IGVuZENvZGU7IGxsKysgKVxuXHRcdFx0XHRcdFx0ZGVzdENvZGUgKz0gJ1xcdFxcdCcgKyByZXN1bHRbIGxsIF0gKyAnXFxuJztcblx0XHRcdFx0XHRpZiAoICFpc0NhbGxiYWNrIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRkZXN0Q29kZSArPSAnXFx0XFx0YW96LnRlbXBSZXN1bHQgPSAnICsgbmFtZSArICcoJztcblx0XHRcdFx0XHRcdGZvciAoIHZhciBwID0gMDsgcCA8IHBhcmFtcy5sZW5ndGg7IHArKyApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGlmICggcCA+IDAgKVxuXHRcdFx0XHRcdFx0XHRcdGRlc3RDb2RlICs9ICcsJztcblx0XHRcdFx0XHRcdFx0ZGVzdENvZGUgKz0gJ3ZhcnMuJyArIHBhcmFtc1sgcCBdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZGVzdENvZGUgKz0gJyk7XFxuJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGRlc3RDb2RlICs9ICdcXHRcXHR0aGlzLndhaXQ9ZnVuY3Rpb24oKVxcbidcblx0XHRcdFx0XHRcdGRlc3RDb2RlICs9ICdcXHRcXHR7XFxuJ1xuXHRcdFx0XHRcdFx0ZGVzdENvZGUgKz0gJ1xcdFxcdFxcdHJldHVybiBkb25lO1xcbidcblx0XHRcdFx0XHRcdGRlc3RDb2RlICs9ICdcXHRcXHR9XFxuJ1xuXHRcdFx0XHRcdFx0ZGVzdENvZGUgKz0gJ1xcdFxcdHRoaXMuY2FsbEZ1bmN0aW9uPWZ1bmN0aW9uKGFyZ3MpXFxuJ1xuXHRcdFx0XHRcdFx0ZGVzdENvZGUgKz0gJ1xcdFxcdHtcXG4nXG5cdFx0XHRcdFx0XHRkZXN0Q29kZSArPSAnXFx0XFx0XFx0JyArIG5hbWUgKyAnKCc7XG5cdFx0XHRcdFx0XHRmb3IgKCB2YXIgcCA9IDA7IHAgPCBwYXJhbXMubGVuZ3RoOyBwKysgKVxuXHRcdFx0XHRcdFx0XHRkZXN0Q29kZSArPSAnYXJnc1snICsgcCArICddJyArICggcCA8IHBhcmFtcy5sZW5ndGggLSAxID8gJywnIDogJycgKTtcblx0XHRcdFx0XHRcdGRlc3RDb2RlICs9ICcpO1xcbic7XG5cdFx0XHRcdFx0XHRkZXN0Q29kZSArPSAnXFx0XFx0fVxcbidcblx0XHRcdFx0XHRcdGRlc3RDb2RlICs9ICdcXHRcXHRyZXR1cm57dHlwZToxMix3YWl0VGhpczp0aGlzLGNhbGxGdW5jdGlvbjpcImNhbGxGdW5jdGlvblwiLHdhaXRGdW5jdGlvbjpcIndhaXRcIixhcmdzOlsnO1xuXHRcdFx0XHRcdFx0Zm9yICggdmFyIHAgPSAwOyBwIDwgcGFyYW1zLmxlbmd0aDsgcCsrIClcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0aWYgKCBwYXJhbXNbIHAgXS50b0xvd2VyQ2FzZSgpLmluZGV4T2YoICdjYWxsYmFjaycgKSA8IDAgKVxuXHRcdFx0XHRcdFx0XHRcdGRlc3RDb2RlICs9ICd2YXJzLicgKyBwYXJhbXNbIHAgXTtcblx0XHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRcdGRlc3RDb2RlICs9ICdvblJlc3VsdCc7XG5cdFx0XHRcdFx0XHRcdGlmICggcCA8IHBhcmFtcy5sZW5ndGggLSAxIClcblx0XHRcdFx0XHRcdFx0XHRkZXN0Q29kZSArPSAnLCc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRkZXN0Q29kZSArPSAnXX07XFxuJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZGVzdENvZGUgKz0gJ1xcdH1cXG4nO1xuXHRcdFx0XHRcdGRlc3RDb2RlICs9ICdFbmQgUHJvY1t7YW96LnRlbXBSZXN1bHR9XVxcbic7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICggZGVzdENvZGUgIT0gJycgKVxuXHRcdFx0e1xuXHRcdFx0XHRkZXN0Q29kZSA9IHRoaXMuYXdpLnV0aWxpdGllcy5yZXBsYWNlU3RyaW5nSW5UZXh0KCBkZXN0Q29kZSwgJ2NvbnNvbGUubG9nJywgJ2Fvei5wcmludCcgKTtcblx0XHRcdFx0ZGF0YS5jb2RlID0gZGVzdENvZGUuc3BsaXQoICdcXG4nICk7XG5cdFx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIGRhdGEuY29kZSwgeyB1c2VyOiAnY29kZScgfSApO1xuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBkZXN0Q29kZSB9O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGRhdGE6IHJlc3VsdCwgZXJyb3I6ICdhd2k6bm8tY29kZS1wcm9kdWNlZDppd2EnIH07XG5cdFx0fVxuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5CdWJibGUgPSBCdWJibGVBb3pCYXNpY0NvZGU7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1icmFuY2guanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IEEgdHJlZSBvZiBidWJibGVzIHRoYXQgd29ya3MgYXMgYSBidWJibGU6IGEgYnJhbmNoLlxuKlxuKi9cbnZhciBhd2lidWJibGUgPSByZXF1aXJlKCAnLi9hd2ktYnViYmxlJyApXG5cbmNsYXNzIEJyYW5jaCBleHRlbmRzIGF3aWJ1YmJsZS5CdWJibGVcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyApXG5cdHtcblx0XHRvcHRpb25zLmVycm9yQ2xhc3MgPSB0eXBlb2Ygb3B0aW9ucy5lcnJvckNsYXNzID8gb3B0aW9ucy5lcnJvckNsYXNzIDogJ25ld0J1YmJsZXMnO1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdicmFuY2gnO1xuXHRcdHRoaXMub0NsYXNzID0gJ2JyYW5jaCc7XG5cdFx0dGhpcy5idWJibGVNYXAgPSB7fTtcblx0XHR0aGlzLnBhdGh3YXlzID0gW107XG5cdFx0dGhpcy5wYXRod2F5ID0gJ3NlbGYuYnViYmxlTWFwJztcblx0XHR0aGlzLmN1cnJlbnRCdWJibGUgPSAnJztcblx0XHR0aGlzLmZpcnN0UnVuID0gdHJ1ZTtcblx0XHR0aGlzLmtleUNvdW50ID0gMDtcblx0XHR0aGlzLndvcmtpbmcgPSAwO1xuXHRcdHRoaXMuYWRkQnViYmxlRnJvbUNvbW1hbmQoIHsgdG9rZW46ICdlcnJvcicsIGtleTogJ2Vycm9yJywgcGFyZW50Q2xhc3M6IG9wdGlvbnMuZXJyb3JDbGFzcywgcGFyYW1ldGVyczoge30sIG9wdGlvbnM6IHt9IH0sIHt9LCB7fSApO1xuXHRcdHRoaXMuYWRkQnViYmxlRnJvbUNvbW1hbmQoIHsgdG9rZW46ICdyb290Jywga2V5OiAncm9vdCcsIHBhcmVudENsYXNzOiBvcHRpb25zLmVycm9yQ2xhc3MsIHBhcmFtZXRlcnM6IHt9LCBvcHRpb25zOiB7fSB9LCB7fSwge30gKTtcblx0fVxuXHRyZXNldCgpXG5cdHtcblx0XHRzdXBlci5yZXNldCgpO1xuXHRcdHRoaXMucGF0aHdheSA9ICdzZWxmLmJ1YmJsZU1hcCc7XG5cdFx0dGhpcy5wYXRod2F5cyA9IFtdO1xuXHRcdGZvciAoIHZhciBiIGluIHRoaXMuYnViYmxlTWFwIClcblx0XHRcdHRoaXMuYnViYmxlTWFwWyBiIF0ucmVzZXQoKTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sID0ge30gKVxuXHR7XG5cdFx0dmFyIGRhdGEgPSB7fTtcblx0XHR2YXIgc3RhcnRCdWJibGUgPSB0aGlzLmN1cnJlbnRCdWJibGU7XG5cdFx0aWYgKCAhc3RhcnRCdWJibGUgfHwgY29udHJvbC5zdGFydCA9PSAncm9vdCcgfHwgdGhpcy5maXJzdFJ1biApXG5cdFx0e1xuXHRcdFx0c3RhcnRCdWJibGUgPSAncm9vdCc7XG5cdFx0XHR0aGlzLnJlc2V0KCk7XG5cdFx0XHR0aGlzLndvcmtpbmcgPSAwO1xuXHRcdFx0dGhpcy5maXJzdFJ1biA9IGZhbHNlO1xuXHRcdH1cblx0XHRpZiAoICFzdGFydEJ1YmJsZSApXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZGF0YToge30sIGVycm9yOiAnYXdpOm5vLWJ1YmJsZS10by1wbGF5Oml3YScgfTtcblx0XHRjb250cm9sLnN0YXJ0ID0gbnVsbDtcblxuXHRcdHZhciBhbnN3ZXI7XG5cdFx0dGhpcy53b3JraW5nKys7XG5cdFx0dmFyIGJ1YmJsZSA9IHRoaXMuYnViYmxlTWFwWyBzdGFydEJ1YmJsZSBdO1xuXHRcdGRvXG5cdFx0e1xuXHRcdFx0dGhpcy5wYXRod2F5ICs9ICcuJyArIGJ1YmJsZS5rZXk7XG5cdFx0XHR0aGlzLnBhdGh3YXlzLnB1c2goIHRoaXMucGF0aHdheSApO1xuXHRcdFx0YW5zd2VyID0gYXdhaXQgYnViYmxlLnBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBHb3RvIG5leHRcblx0XHRcdFx0dmFyIGV4aXQ7XG5cdFx0XHRcdHZhciBuZXh0ID0gYW5zd2VyLnN1Y2Nlc3M7XG5cdFx0XHRcdGlmICggbmV4dCA9PT0gdHJ1ZSApXG5cdFx0XHRcdFx0bmV4dCA9ICdzdWNjZXNzJztcblx0XHRcdFx0aWYgKCBuZXh0ICE9ICdlbmQnIClcblx0XHRcdFx0XHRleGl0ID0gYnViYmxlLnByb3BlcnRpZXMuZXhpdHNbIG5leHQgXTtcblxuXHRcdFx0XHQvLyBTdG9yZSBwYXJhbWV0ZXJzXG5cdFx0XHRcdGlmICggYW5zd2VyLmRhdGFDYWxsYmFjayApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRhbnN3ZXIuZGF0YUNhbGxiYWNrKCBwYXJhbWV0ZXJzICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCBidWJibGUucHJvcGVydGllcy5vdXRwdXRzLmxlbmd0aCA9PSAxIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR2YXIgb3V0cHV0ID0gdGhpcy5hd2kudXRpbGl0aWVzLmdldEJ1YmJsZVBhcmFtcyggYnViYmxlLnByb3BlcnRpZXMub3V0cHV0c1sgMCBdICk7XG5cdFx0XHRcdFx0XHRidWJibGUuZGF0YSA9IGFuc3dlci5kYXRhO1xuXHRcdFx0XHRcdFx0ZGF0YSA9IGFuc3dlci5kYXRhO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmICggYW5zd2VyLmRhdGEgKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGZvciAoIHZhciBvID0gMDsgbyA8IGJ1YmJsZS5wcm9wZXJ0aWVzLm91dHB1dHMubGVuZ3RoOyBvKysgKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHR2YXIgb3V0cHV0ID0gdGhpcy5hd2kudXRpbGl0aWVzLmdldEJ1YmJsZVBhcmFtcyggYnViYmxlLnByb3BlcnRpZXMub3V0cHV0c1sgbyBdICk7XG5cdFx0XHRcdFx0XHRcdGJ1YmJsZS5kYXRhWyBvdXRwdXQubmFtZSBdID0gYW5zd2VyLmRhdGFbIG91dHB1dC5uYW1lIF07XG5cdFx0XHRcdFx0XHRcdGRhdGFbIG91dHB1dC5uYW1lIF0gPSBhbnN3ZXIuZGF0YVsgb3V0cHV0Lm5hbWUgXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKCBhbnN3ZXIuZXJyb3IgKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCBhbnN3ZXIuZXJyb3IsIHsgdXNlcjogJ2Vycm9yJyB9ICk7XG5cdFx0XHRcdGV4aXQgPSAnZW5kJztcblx0XHRcdH1cblx0XHRcdHRoaXMucGF0aHdheSA9IHRoaXMucGF0aHdheS5zdWJzdHJpbmcoIDAsIHRoaXMucGF0aHdheS5sYXN0SW5kZXhPZiggJy4nICkgKTtcblx0XHRcdGJ1YmJsZSA9IHRoaXMuYnViYmxlTWFwWyBleGl0IF07XG5cdFx0fSB3aGlsZSAoIGJ1YmJsZSApO1xuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0YW5zd2VyLnN1Y2Nlc3MgPSAnZW5kJztcblxuXHRcdHRoaXMud29ya2luZy0tO1xuXHRcdHJldHVybiBhbnN3ZXI7XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApXG5cdHtcblx0fVxuXHRwYXVzZSggb25PZmYgKVxuXHR7XG5cdFx0dGhpcy5wYXVzZWQgPSBvbk9mZjtcblx0fVxuXHRhc3luYyB3YWl0UGF1c2VkKClcblx0e1xuXHRcdGlmICggIXRoaXMucGF1c2VkIClcblx0XHQgXHRyZXR1cm47XG5cblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKCAoIHJlc29sdmUgKSA9PlxuXHRcdHtcblx0XHRcdGNvbnN0IGNoZWNrUGF1c2VkID0gKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0aWYgKCAhc2VsZi5wYXVzZWQgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0Y2hlY2tQYXVzZWQoKTtcblx0XHR9ICk7XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBwb3NpdGlvbiwgbGluZSwgZGF0YSwgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIudHJhbnNwaWxlKCBwb3NpdGlvbiwgbGluZSwgZGF0YSwgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIHNlcmlhbGl6ZSggcGF0aCwgZGF0YSwgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgdGhpcy5ydW4oIHBhdGgsIGRhdGEsIGNvbnRyb2wgKTtcblx0fVxuXG5cdG5ld0J1YmJsZSggY29tbWFuZCwgcGFyYW1ldGVycyA9IHt9LCBjb250cm9sID0ge30gKVxuXHR7XG5cdFx0cGFyYW1ldGVycyA9IHR5cGVvZiBjb21tYW5kLnBhcmFtZXRlcnMgIT0gJ3VuZGVmaW5lZCcgPyBjb21tYW5kLnBhcmFtZXRlcnMgOiBwYXJhbWV0ZXJzO1xuXHRcdHZhciBrZXkgPSAoIGNvbW1hbmQua2V5ID8gY29tbWFuZC5rZXkgOiB0aGlzLmF3aS51dGlsaXRpZXMuZ2V0VW5pcXVlSWRlbnRpZmllciggdGhpcy5idWJibGVNYXAsIGNvbW1hbmQudG9rZW4sIHRoaXMua2V5Q291bnQrKyApICk7XG5cdFx0dmFyIHBhcmVudCA9IGNvbW1hbmQucGFyZW50ID8gY29tbWFuZC5wYXJlbnQgOiB0aGlzLmN1cnJlbnRCdWJibGU7XG5cdFx0dmFyIHBhcmVudENsYXNzID0gKCB0eXBlb2YgY29tbWFuZC5wYXJlbnRDbGFzcyA9PSAndW5kZWZpbmVkJyA/ICduZXdCdWJibGVzJyA6IGNvbW1hbmQucGFyZW50Q2xhc3MgKTtcblx0XHR2YXIgY2xhc3NuYW1lID0gICggdHlwZW9mIGNvbW1hbmQuY2xhc3NuYW1lID09ICd1bmRlZmluZWQnID8gJ2dlbmVyaWMnIDogY29tbWFuZC5jbGFzc25hbWUgKTtcblx0XHR2YXIgZXhpdHMgPSAgKCB0eXBlb2YgY29tbWFuZC5leGl0cyA9PSAndW5kZWZpbmVkJyA/IHsgc3VjY2VzczogJ2VuZCcgfSA6IGNvbW1hbmQuZXhpdHMgKTtcblx0XHR2YXIgbmV3QnViYmxlID0gbmV3IHRoaXMuYXdpWyBwYXJlbnRDbGFzcyBdWyBjbGFzc25hbWUgXVsgY29tbWFuZC50b2tlbiBdKCB0aGlzLmF3aSwgeyBrZXk6IGtleSwgYnJhbmNoOiB0aGlzLCBwYXJlbnQ6IHBhcmVudCwgZXhpdHM6IGV4aXRzLCBwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzIH0gKTtcblx0XHRpZiAoIHBhcmVudCAmJiB0aGlzLmdldEJ1YmJsZSggcGFyZW50ICkgKVxuXHRcdFx0dGhpcy5nZXRCdWJibGUoIHBhcmVudCApLnByb3BlcnRpZXMuZXhpdHMuc3VjY2VzcyA9IG5ld0J1YmJsZS5rZXk7XG5cdFx0cmV0dXJuIG5ld0J1YmJsZTtcblx0fVxuXHRhZGRCdWJibGUoIGJ1YmJsZSwgY29udHJvbCA9IHt9IClcblx0e1xuXHRcdGJ1YmJsZS5rZXkgPSB0aGlzLmF3aS51dGlsaXRpZXMuZ2V0VW5pcXVlSWRlbnRpZmllciggdGhpcy5idWJibGVNYXAsIGJ1YmJsZS50b2tlbiwgdGhpcy5rZXlDb3VudCsrICk7XG5cdFx0YnViYmxlLnBhcmVudCA9IHRoaXMuY3VycmVudEJ1YmJsZTtcblx0XHR0aGlzLmdldEJ1YmJsZSggdGhpcy5jdXJyZW50QnViYmxlICkucHJvcGVydGllcy5leGl0cy5zdWNjZXNzID0gYnViYmxlLmtleTtcblx0XHR0aGlzLmJ1YmJsZU1hcFsgYnViYmxlLmtleSBdID0gYnViYmxlO1xuXHRcdHRoaXMuY3VycmVudEJ1YmJsZSA9IGJ1YmJsZS5rZXk7XG5cdFx0cmV0dXJuIGJ1YmJsZS5rZXk7XG5cdH1cblx0YWRkQnViYmxlRnJvbUNvbW1hbmQoIGNvbW1hbmQsIHBhcmFtZXRlcnMgPSB7fSwgY29udHJvbCA9IHt9IClcblx0e1xuXHRcdGNvbW1hbmQucGFyZW50ID0gdGhpcy5jdXJyZW50QnViYmxlO1xuXHRcdGlmICggdHlwZW9mIGNvbW1hbmQua2V5ID09ICd1bmRlZmluZWQnIClcblx0XHRcdGNvbW1hbmQua2V5ID0gdGhpcy5hd2kudXRpbGl0aWVzLmdldFVuaXF1ZUlkZW50aWZpZXIoIHRoaXMuYnViYmxlTWFwLCBjb21tYW5kLnRva2VuLCB0aGlzLmtleUNvdW50KysgKTtcblx0XHR2YXIgYnViYmxlID0gdGhpcy5uZXdCdWJibGUoIGNvbW1hbmQsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHR0aGlzLmJ1YmJsZU1hcFsgYnViYmxlLmtleSBdID0gYnViYmxlO1xuXHRcdHRoaXMuY3VycmVudEJ1YmJsZSA9IGJ1YmJsZS5rZXk7XG5cdFx0cmV0dXJuIGJ1YmJsZS5rZXk7XG5cdH1cblx0YWRkQnViYmxlcyggY29tbWFuZExpc3QsIHBhcmFtZXRlcnMgPSB7fSwgY29udHJvbCA9IHt9IClcblx0e1xuXHRcdGNvbW1hbmRMaXN0ID0gdGhpcy5hd2kudXRpbGl0aWVzLmlzT2JqZWN0KCBjb21tYW5kTGlzdCApID8gWyBjb21tYW5kTGlzdCBdIDogY29tbWFuZExpc3Q7XG5cdFx0Zm9yICggdmFyIGMgPSAwOyBjIDwgY29tbWFuZExpc3QubGVuZ3RoOyBjKysgKVxuXHRcdHtcblx0XHRcdHRoaXMuYWRkQnViYmxlRnJvbUNvbW1hbmQoIGNvbW1hbmRMaXN0WyBjIF0sIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHR9XG5cdH1cblx0YWRkQnViYmxlRnJvbUxpbmUoIGxpbmUsIGNvbnRyb2wgPSB7fSApXG5cdHtcblx0XHR2YXIgc3RhcnQ7XG5cdFx0dmFyIGNvbW1hbmQ7XG5cdFx0dmFyIHBhcmFtZXRlcnMgPSB7fTtcblx0XHRmb3IgKCBzdGFydCA9IDA7IHN0YXJ0IDwgbGluZS5sZW5ndGg7IHN0YXJ0KysgKVxuXHRcdHtcblx0XHRcdHZhciBjID0gbGluZS5jaGFyQXQoIHN0YXJ0ICk7XG5cdFx0XHRpZiAoIGMgPT0gJ3snIClcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR2YXIgdHlwZSA9IHRoaXMuYXdpLnV0aWxpdGllcy5nZXRDaGFyYWN0ZXJUeXBlKCBjICk7XG5cdFx0XHRpZiAoIHR5cGUgPT0gJ2xldHRlcicgKVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGlmICggdHlwZSA9PSAnbnVtYmVyJyApXG5cdFx0XHR7XG5cdFx0XHRcdGNvbW1hbmQgPVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dG9rZW46ICdldmFsJyxcblx0XHRcdFx0XHRjbGFzc25hbWU6ICdnZW5lcmljJyxcblx0XHRcdFx0XHRwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzLFxuXHRcdFx0XHRcdG9wdGlvbnM6IG9wdGlvbnNcblx0XHRcdFx0fTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGxpbmUgPSBsaW5lLnN1YnN0cmluZyggc3RhcnQgKS50cmltKCk7XG5cblx0XHRpZiAoICFjb21tYW5kIClcblx0XHR7XG5cdFx0XHRjb21tYW5kID0gdGhpcy5hd2kucGFyc2VyLmV4dHJhY3RDb21tYW5kRnJvbUxpbmUoIGxpbmUsIGNvbnRyb2wgKTtcblx0XHR9XG5cdFx0aWYgKCAhY29tbWFuZCApXG5cdFx0e1xuXHRcdFx0Y29tbWFuZCA9XG5cdFx0XHR7XG5cdFx0XHRcdHRva2VuOiAnY2hhdCcsXG5cdFx0XHRcdGNsYXNzbmFtZTogJ2dlbmVyaWMnLFxuXHRcdFx0XHRwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzLFxuXHRcdFx0XHRvcHRpb25zOiB7fVxuXHRcdFx0fTtcblx0XHRcdHZhciBjb2x1bW4gPSBsaW5lLmluZGV4T2YoICc6JyApO1xuXHRcdFx0aWYgKCBjb2x1bW4gPiAwIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIG5hbWUgPSBsaW5lLnN1YnN0cmluZyggMCwgY29sdW1uICk7XG5cdFx0XHRcdGlmICggbmFtZSA9PSB0aGlzLmF3aS5nZXRDb25maWcoICd1c2VyJyApLmZpcnN0TmFtZSApXG5cdFx0XHRcdFx0bGluZSA9IGxpbmUuc3Vic3RyaW5nKCBjb2x1bW4gKyAxICk7XG5cdFx0XHRcdGlmICggbmFtZSA9PSB0aGlzLmF3aS5nZXRQZXJzb25hbGl0eSgpLmZpcnN0TmFtZSApXG5cdFx0XHRcdFx0bGluZSA9IGxpbmUuc3Vic3RyaW5nKCBjb2x1bW4gKyAxICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMuYWRkQnViYmxlRnJvbUNvbW1hbmQoIGNvbW1hbmQsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRyZXR1cm4gbGluZTtcblx0fVxuXHRyZWNhbGxMYXN0QnViYmxlcyggaG93TWFueSApXG5cdHtcblx0XHR2YXIgbWVtb3J5ID0gW107XG5cdFx0dmFyIGJ1YmJsZXMgPSB0aGlzLmdldEJ1YmJsZUNoYWluKCAnZW5kJywgMSwgaG93TWFueSApO1xuXHRcdGZvciAoIHZhciBiID0gYnViYmxlcy5sZW5ndGggLSAxOyBiID49IDA7IGItLSApXG5cdFx0e1xuXHRcdFx0dmFyIGJ1YmJsZSA9IGJ1YmJsZXNbIGIgXTtcblx0XHRcdGlmICggYnViYmxlLnRva2VuID09ICdjaGF0JyAmJiBidWJibGUuZGF0YSApXG5cdFx0XHR7XG5cdFx0XHRcdG1lbW9yeS5wdXNoKFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dXNlclRleHQ6IGJ1YmJsZS5wYXJhbWV0ZXJzWyAwIF0udmFsdWUsXG5cdFx0XHRcdFx0cmVjZWl2ZXJUZXh0OiBidWJibGUuZGF0YS5qb2luKCAnICcgKVxuXHRcdFx0XHR9ICk7XG5cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG1lbW9yeTtcblx0fVxuXHRnZXRMYXN0RGF0YSggYnViYmxlLCB0b2tlbiApXG5cdHtcblx0XHR2YXIgYnViYmxlID0gdGhpcy5nZXRCdWJibGUoIGJ1YmJsZS5wYXJlbnQgKTtcblx0XHR3aGlsZSggYnViYmxlIClcblx0XHR7XG5cdFx0XHRmb3IgKCB2YXIgcCA9IDA7IHAgPCBidWJibGUucHJvcGVydGllcy5vdXRwdXRzLmxlbmd0aDsgcCsrIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIG91dHB1dCA9IHRoaXMuYXdpLnV0aWxpdGllcy5nZXRCdWJibGVQYXJhbXMoIGJ1YmJsZS5wcm9wZXJ0aWVzLm91dHB1dHNbIHAgXSApO1xuXHRcdFx0XHRpZiAoIG91dHB1dC5uYW1lID09IHRva2VuICYmIHR5cGVvZiBidWJibGUuZGF0YVsgdG9rZW4gXSAhPSAndW5kZWZpbmVkJyApXG5cdFx0XHRcdFx0cmV0dXJuIGJ1YmJsZS5kYXRhWyB0b2tlbiBdO1xuXHRcdFx0fVxuXHRcdFx0YnViYmxlID0gdGhpcy5nZXRCdWJibGUoIGJ1YmJsZS5wYXJlbnQgKTtcblx0XHR9XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHQvLyBCdWJibGUgdHJlZSBoYW5kbGluZ1xuXHRnZXRCdWJibGUoIGtleSApXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5idWJibGVNYXBbIGtleSBdO1xuXHR9XG5cdGdldE51bWJlck9mQnViYmxlcygpXG5cdHtcblx0XHR2YXIgY291bnQgPSAwO1xuXHRcdGZvciAoIHZhciBiIGluIHRoaXMuYnViYmxlTWFwIClcblx0XHRcdGNvdW50Kys7XG5cdFx0cmV0dXJuIGNvdW50IC0gMTtcblx0fVxuXHRnZXRMYXN0QnViYmxlKCBleGl0IClcblx0e1xuXHRcdGV4aXQgPSAoIHR5cGVvZiBleGl0ID09ICd1bmRlZmluZWQnID8gJ3N1Y2Nlc3MnIDogZXhpdCApO1xuXG5cdFx0dmFyIGZvdW5kO1xuXHRcdHZhciBidWJibGUgPSB0aGlzLmdldEJ1YmJsZSggJ3Jvb3QnICk7XG5cdFx0d2hpbGUgKCBidWJibGUgKVxuXHRcdHtcblx0XHRcdGZvdW5kID0gYnViYmxlO1xuXHRcdFx0YnViYmxlID0gdGhpcy5nZXRCdWJibGUoIGJ1YmJsZS5wcm9wZXJ0aWVzLmV4aXRzWyBleGl0IF0gKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZvdW5kO1xuXHR9XG5cdGRlbGV0ZUJ1YmJsZSgga2V5IClcblx0e1xuXHRcdGlmICggdGhpcy5idWJibGVNYXBbIGtleSBdIClcblx0XHR7XG5cdFx0XHR2YXIgbmV3QnViYmxlTWFwID0ge307XG5cdFx0XHRmb3IgKCB2YXIgYiBpbiB0aGlzLmJ1YmJsZU1hcCApXG5cdFx0XHR7XG5cdFx0XHRcdGlmICggdGhpcy5idWJibGVNYXBbIGIgXSApXG5cdFx0XHRcdFx0bmV3QnViYmxlTWFwWyBiIF0gPSB0aGlzLmJ1YmJsZU1hcFsgYiBdO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5idWJibGVNYXAgPSBuZXdCdWJibGVNYXA7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuYXdpLnN5c3RlbVdhcm5pbmcoICdCdWJibGUgbm90IGZvdW5kIScgKVxuXHR9XG5cdGZpbmRCdWJibGUoIGNhbGxiYWNrIClcblx0e1xuXHRcdGZvciAoIHZhciBrZXkgaW4gdGhpcy5idWJibGVNYXAgKVxuXHRcdHtcblx0XHRcdGlmICggY2FsbGJhY2soIHRoaXMuYnViYmxlTWFwWyBrZXkgXSApIClcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuYnViYmxlTWFwWyBrZXkgXTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblx0Z2V0QnViYmxlQ2hhaW4oIHdoZXJlRnJvbSwgZGlzdGFuY2UsIGhvd01hbnksIGV4aXQgKVxuXHR7XG5cdFx0ZXhpdCA9ICggdHlwZW9mIGV4aXQgPT0gJ3VuZGVmaW5lZCcgPyAnc3VjY2VzcycgOiBleGl0ICk7XG5cblx0XHR2YXIgYnViYmxlO1xuXHRcdHZhciByZXN1bHQgPSBbXTtcblx0XHRpZiAoIHdoZXJlRnJvbSA9PSAnZW5kJyApXG5cdFx0e1xuXHRcdFx0YnViYmxlID0gdGhpcy5nZXRMYXN0QnViYmxlKCBleGl0ICk7XG5cdFx0XHR3aGlsZSggYnViYmxlICYmIGRpc3RhbmNlID4gMCApXG5cdFx0XHR7XG5cdFx0XHRcdGJ1YmJsZSA9IHRoaXMuZ2V0QnViYmxlKCBidWJibGUucGFyZW50ICk7XG5cdFx0XHRcdGRpc3RhbmNlLS07XG5cdFx0XHR9XG5cdFx0XHR3aGlsZSggYnViYmxlICYmIGhvd01hbnkgPiAwIClcblx0XHRcdHtcblx0XHRcdFx0cmVzdWx0LnB1c2goIGJ1YmJsZSApO1xuXHRcdFx0XHRidWJibGUgPSB0aGlzLmdldEJ1YmJsZSggYnViYmxlLnBhcmVudCApO1xuXHRcdFx0XHRob3dNYW55LS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRidWJibGUgPSB0aGlzLmdldEJ1YmJsZSggJ3Jvb3QnICk7XG5cdFx0XHR3aGlsZSggYnViYmxlICYmIGRpc3RhbmNlID4gMCApXG5cdFx0XHR7XG5cdFx0XHRcdGJ1YmJsZSA9IHRoaXMuZ2V0QnViYmxlKCBidWJibGUucHJvcGVydGllcy5leGl0c1sgZXhpdCBdICk7XG5cdFx0XHRcdGRpc3RhbmNlLS07XG5cdFx0XHR9XG5cdFx0XHR3aGlsZSggYnViYmxlICYmIGhvd01hbnkgPiAwIClcblx0XHRcdHtcblx0XHRcdFx0cmVzdWx0LnB1c2goIGJ1YmJsZSApO1xuXHRcdFx0XHRidWJibGUgPSB0aGlzLmdldEJ1YmJsZSggYnViYmxlLnByb3BlcnRpZXMuZXhpdHNbIGV4aXQgXSApO1xuXHRcdFx0XHRob3dNYW55LS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJyYW5jaCA9IEJyYW5jaFxuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktYnViYmxlLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBNYWluIGJ1YmJsZSBjbGFzcyBmcm9tIHdoaWNoIGFsbCBlbGVtZW50cyBhcmUgZGVyaXZlZC5cbipcbiovXG5jbGFzcyBCdWJibGVcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyApXG5cdHtcblx0XHR0aGlzLmtleSA9IG9wdGlvbnMua2V5O1xuXHRcdHRoaXMucGFyYW1ldGVycyA9IG9wdGlvbnMucGFyYW1ldGVycyA/IG9wdGlvbnMucGFyYW1ldGVycyA6IHt9O1xuXHRcdHRoaXMuYXdpID0gYXdpO1xuXHRcdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0dGhpcy5wYXJlbnQgPSBvcHRpb25zLnBhcmVudDtcblx0XHR0aGlzLmJyYW5jaCA9IG9wdGlvbnMuYnJhbmNoO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2J1YmJsZSc7XG5cdFx0dGhpcy5vQ2xhc3MgPSAnYnViYmxlJztcblx0XHR0aGlzLnVzZUNvdW50ID0gMDtcblx0XHR0aGlzLmRhdGEgPSB7fTtcblx0XHR0aGlzLnByb3BlcnRpZXMgPVxuXHRcdHtcblx0XHRcdGFjdGlvbjogJycsXG5cdFx0XHRpbnB1dHM6IFtdLFxuXHRcdFx0b3V0cHV0czogW10sXG5cdFx0XHRlZGl0YWJsZXM6IFtdLFxuXHRcdFx0ZXhpdHM6IHsgc3VjY2VzczogJycgfSxcblx0XHRcdHBhcnNlcjoge30sXG5cdFx0XHRzZWxlY3Q6IFtdXG5cdFx0fVxuXHRcdGlmICggdHlwZW9mIG9wdGlvbnMuZXhpdHMgIT0gJ3VuZGVmaW5lZCcgKVxuXHRcdHtcblx0XHRcdGZvciAoIHZhciBlIGluIG9wdGlvbnMuZXhpdHMgKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnByb3BlcnRpZXMuZXhpdHNbIGUgXSA9IG9wdGlvbnMuZXhpdHNbIGUgXTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmVzZXQoKVxuXHR7XG5cdFx0dGhpcy5kYXRhID0ge307XG5cdFx0dGhpcy51c2VDb3VudCA9IDA7XG5cdH1cblx0Z2V0RWRpdGFibGUoIG5hbWUgKVxuXHR7XG5cdFx0Zm9yICggdmFyIGUgPSAwOyBlIDwgdGhpcy5wcm9wZXJ0aWVzLmVkaXRhYmxlcy5sZW5ndGg7IGUrKyApXG5cdFx0e1xuXHRcdFx0aWYgKCB0aGlzLnByb3BlcnRpZXMuZWRpdGFibGVzWyBlIF0ubmFtZSA9PSBuYW1lIClcblx0XHRcdFx0cmV0dXJuIHRoaXMucHJvcGVydGllcy5lZGl0YWJsZXNbIGUgXTtcblx0XHR9XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblx0YXN5bmMgc2VuZENvbXBsZXRpb24oIHByb21wdCwgc3RyZWFtLCBjb250cm9sIClcblx0e1xuXHRcdHRoaXMuYXdpLmVkaXRvci53YWl0KCBjb250cm9sLmVkaXRvciwgdHJ1ZSApO1xuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLmF3aS5jbGllbnQuc2VuZENvbXBsZXRpb24oIHByb21wdCwgc3RyZWFtLCBjb250cm9sICk7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLndhaXQoIGNvbnRyb2wuZWRpdG9yLCBmYWxzZSApO1xuXHRcdHJldHVybiBhbnN3ZXI7XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR0aGlzLnVzZUNvdW50Kys7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgWyBcIlBsYXlpbmcgYnViYmxlIFwiICsgdGhpcy5uYW1lIF0sIHsgdXNlcjogJ2J1YmJsZScgfSApO1xuXG5cdFx0aWYgKCBsaW5lLmluZGV4T2YoICd7YXdpOicgKSA9PSAwIClcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcblxuXHRcdGlmICggdHlwZW9mIHBhcmFtZXRlcnMgPT0gJ3VuZGVmaW5lZCcgKVxuXHRcdFx0cmV0dXJuIHRoaXMucGFyYW1ldGVycztcblxuXHRcdHZhciB0b2RvID0gW107XG5cdFx0dmFyIGxpbmVEYXRhcyA9IHRoaXMuYXdpLnV0aWxpdGllcy5leHRyYWN0TGluZVBhcmFtZXRlcnMoIGxpbmUsIHRoaXMucHJvcGVydGllcy5pbnB1dHMgKTtcblx0XHRwYXJhbWV0ZXJzLmxpbmUgPSBsaW5lO1xuXHRcdHBhcmFtZXRlcnMubGluZUNvbW1hbmQgPSBsaW5lRGF0YXMuY29tbWFuZDtcblx0XHRmb3IgKCB2YXIgcCA9IDA7IHAgPCB0aGlzLnByb3BlcnRpZXMuaW5wdXRzLmxlbmd0aDsgcCsrIClcblx0XHR7XG5cdFx0XHR2YXIgcGFyYW1ldGVyID0gdGhpcy5hd2kudXRpbGl0aWVzLmdldEJ1YmJsZVBhcmFtcyggdGhpcy5wcm9wZXJ0aWVzLmlucHV0c1sgcCBdICk7XG5cdFx0XHRpZiAoIHR5cGVvZiBwYXJhbWV0ZXJzWyBwYXJhbWV0ZXIubmFtZSBdICE9ICd1bmRlZmluZWQnICYmIHBhcmFtZXRlcnNbIHBhcmFtZXRlci5uYW1lIF0gIT0gJycgKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoIHBhcmFtZXRlci5jbGVhciApXG5cdFx0XHRcdFx0cGFyYW1ldGVyc1sgcGFyYW1ldGVyLm5hbWUgXSA9IHBhcmFtZXRlcnNbIHBhcmFtZXRlci5uYW1lIF0uZGVmYXVsdDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Zm9yICggdmFyIHAgPSAwOyBwIDwgdGhpcy5wcm9wZXJ0aWVzLmlucHV0cy5sZW5ndGg7IHArKyApXG5cdFx0e1xuXHRcdFx0dmFyIHBhcmFtZXRlciA9IHRoaXMuYXdpLnV0aWxpdGllcy5nZXRCdWJibGVQYXJhbXMoIHRoaXMucHJvcGVydGllcy5pbnB1dHNbIHAgXSApO1xuXHRcdFx0aWYgKCB0eXBlb2YgcGFyYW1ldGVyc1sgcGFyYW1ldGVyLm5hbWUgXSA9PSAndW5kZWZpbmVkJyApXG5cdFx0XHR7XG5cdFx0XHRcdGlmICggcGFyYW1ldGVyc1sgcGFyYW1ldGVyLm5hbWUgXSA9PT0gJycgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGluZURhdGFzWyBwYXJhbWV0ZXIubmFtZSBdID09ICd1bmRlZmluZWQnIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAoICFwYXJhbWV0ZXIub3B0aW9uYWwgKVxuXHRcdFx0XHRcdFx0XHR0b2RvLnB1c2goIHsgdG9rZW46ICdpbnB1dCcsIGNsYXNzbmFtZTogJ2dlbmVyaWMnLCBwYXJhbWV0ZXJzOiBbIHBhcmFtZXRlciBdLCBvcHRpb25zOiB7fSB9ICk7XG5cdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdHBhcmFtZXRlcnNbIHBhcmFtZXRlci5uYW1lIF0gPSBwYXJhbWV0ZXIuZGVmYXVsdDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHBhcmFtZXRlcnNbIHBhcmFtZXRlci5uYW1lIF0gPSBsaW5lRGF0YXNbIHBhcmFtZXRlci5uYW1lIF07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICggdGhpcy5hd2kudXRpbGl0aWVzLmlzQXJyYXkoIHBhcmFtZXRlcnNbIHBhcmFtZXRlci5uYW1lIF0gKSAmJiBwYXJhbWV0ZXJzWyBwYXJhbWV0ZXIubmFtZSBdLmxlbmd0aCA9PSAwIClcblx0XHRcdHtcblx0XHRcdFx0aWYgKCAhcGFyYW1ldGVyLm9wdGlvbmFsIClcblx0XHRcdFx0XHR0b2RvLnB1c2goIHsgdG9rZW46ICdpbnB1dCcsIGNsYXNzbmFtZTogJ2dlbmVyaWMnLCBwYXJhbWV0ZXJzOiBbIHBhcmFtZXRlciBdLCBvcHRpb25zOiB7fSB9ICk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRwYXJhbWV0ZXJzWyBwYXJhbWV0ZXIubmFtZSBdID0gcGFyYW1ldGVyLmRlZmF1bHQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICggdG9kby5sZW5ndGggPiAwIClcblx0XHR7XG5cdFx0XHR2YXIgcGFyYW1zID0gYXdhaXQgdGhpcy5hd2kucHJvbXB0LmdldFBhcmFtZXRlcnMoIHRvZG8sIGNvbnRyb2wgKTtcblx0XHRcdGlmICggcGFyYW1zLnN1Y2Nlc3MgKVxuXHRcdFx0e1xuXHRcdFx0XHRmb3IgKCB2YXIgcCA9IDA7IHAgPCB0aGlzLnByb3BlcnRpZXMuaW5wdXRzLmxlbmd0aDsgcCsrIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBwcm9wID0gdGhpcy5hd2kudXRpbGl0aWVzLmdldEJ1YmJsZVBhcmFtcyggdGhpcy5wcm9wZXJ0aWVzLmlucHV0c1sgcCBdICk7XG5cdFx0XHRcdFx0aWYgKCB0eXBlb2YgcGFyYW1zLmRhdGFbIHByb3AubmFtZSBdICE9ICd1bmRlZmluZWQnIClcblx0XHRcdFx0XHRcdHBhcmFtZXRlcnNbIHByb3AubmFtZSBdID0gcGFyYW1zLmRhdGFbIHByb3AubmFtZSBdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBkYXRhOiB7fSwgZXJyb3I6ICdhd2k6Y2FuY2VsbGVkOml3YScsIG5leHQ6ICdjYW5jZWxsZWQnIH07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMudXNlcklucHV0ID0gbGluZTtcblx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApXG5cdHtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIC8qZGF0YSwgY29udHJvbCovIClcblx0e1xuXHR9XG5cdGFzeW5jIHNlcmlhbGl6ZSgpXG5cdHtcblxuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5CdWJibGUgPSBCdWJibGU7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1idWJibGUtZ2VuZXJpYy1iaW4uanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IEJpbiBjb21tYW5kOiBjb252ZXJ0IHRvIGJpbmFyeVxuKlxuKi9cbnZhciBhd2lidWJibGUgPSByZXF1aXJlKCAnLi4vYXdpLWJ1YmJsZScgKVxuXG5jbGFzcyBCdWJibGVHZW5lcmljQmluIGV4dGVuZHMgYXdpYnViYmxlLkJ1YmJsZVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdCaW4nO1xuXHRcdHRoaXMudG9rZW4gPSAnYmluJztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLnByb3BlcnRpZXMuYWN0aW9uID0gJ2NvbnZlcnRzIGFuIGV4cHJlc3Npb24gdG8gYSBiaW5hcnkgbnVtYmVyJztcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gWyB7IGV2YWx1YXRpb246ICd0aGUgZXhwcmVzc2lvbiB0byBjb252ZXJ0IHRvIGJpbmFyeScsIHR5cGU6ICdzdHJpbmcnIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBiaW5WYWx1ZTogJ3RoZSBleHByZXNzaW9uIGNvbnZlcnRlZCB0byBiaW5hcnknLCB0eXBlOiAnbnVtYmVyJyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnBhcnNlciA9IHtcblx0XHRcdHZlcmI6IFsgJ2NvbnZlcnQnLCAndHJhbnNmb3JtJywgJ2NhbGN1bGF0ZScgXSxcblx0XHRcdGFkamVjdGl2ZTogWyAnYmluYXJ5JyBdLFxuXHRcdFx0cXVlc3Rpb25Xb3JkOiBbICd3aGF0JyBdLFxuXHRcdFx0ZXZhbHVhdGlvbjogWyAnbnVtZXJpYycgXSB9O1xuXHRcdHRoaXMucHJvcGVydGllcy5zZWxlY3QgPSBbIFsgJ3ZlcmInLCAnYWRqZWN0aXZlJyBdLCBbICdxdWVzdGlvbldvcmQnLCAnYWRqZWN0aXZlJyBdIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kubGFuZ3VhZ2UuZG9FdmFsKCAnJyArIHBhcmFtZXRlcnMuZXZhbHVhdGlvbiwge30gKTtcblx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHR7XG5cdFx0XHR2YXIgcmVzdWx0ID0gJyUnICsgdGhpcy5hd2kudXRpbGl0aWVzLnRvQmluKCBhbnN3ZXIuZGF0YSwgMTYgKTtcblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIFsgcmVzdWx0IF0sIHsgdXNlcjogJ3Jlc3VsdCcgfSApO1xuXHRcdFx0YW5zd2VyLmRhdGEgPSByZXN1bHQ7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCBbIGFuc3dlci5lcnJvciBdLCB7IHVzZXI6ICdlcnJvcicgfSApO1xuXHRcdH1cblx0XHRyZXR1cm4gKCBhbnN3ZXIgKTtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZUdlbmVyaWNCaW47XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1idWJibGUtZ2VuZXJpYy1jaGF0LmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBDaGF0IGJ1YmJsZVxuKlxuKi9cbnZhciBhd2lidWJibGUgPSByZXF1aXJlKCAnLi4vYXdpLWJ1YmJsZScgKTtcblxuY2xhc3MgQnViYmxlR2VuZXJpY0NoYXQgZXh0ZW5kcyBhd2lidWJibGUuQnViYmxlXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ0NoYXQnO1xuXHRcdHRoaXMudG9rZW4gPSAnY2hhdCc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5xdWVzdGlvbkNvdW50ID0gMTtcblx0XHR0aGlzLnByb3BlcnRpZXMuYWN0aW9uID0gJ2Fuc3dlcnMgdG8gZ2VuZXJpYyBxdWVzdGlvbnMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5pbnB1dHMgPSBbIHsgdXNlcklucHV0OiAndGhlIHF1ZXN0aW9uJywgdHlwZTogJ3N0cmluZycgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzID0gWyB7IGF3aUFuc3dlcjogJ3RoZSBhbnN3ZXIgdG8gdGhlIHF1ZXN0aW9uJywgdHlwZTogJ3N0cmluZycgfSBdO1xuXHRcdHRoaXMuZW1wdHkgPSBmYWxzZTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdGF3YWl0IHN1cGVyLnBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHR0aGlzLmVtcHR5ID0gdHJ1ZTtcblxuXHRcdC8vIFNjYW4gZm9yIGludGVybmFsIGNvbW1hbmRzIGluIG9yaWdpbmFsIGxpbmUuXG5cdFx0dmFyIHN0YXJ0ID0gcGFyYW1ldGVycy51c2VySW5wdXQuaW5kZXhPZiggJ3tjaGF0OicgKTtcblx0XHRpZiAoIHN0YXJ0ID49IDAgKVxuXHRcdHtcblx0XHRcdGRvXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBlbmQgPSBwYXJhbWV0ZXJzLnVzZXJJbnB1dC5pbmRleE9mICggJzpjaGF0fScsIHN0YXJ0ICk7XG5cdFx0XHRcdGlmICggZW5kID4gMCApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgZW1iZWQgPSBwYXJhbWV0ZXJzLnVzZXJJbnB1dC5zdWJzdHJpbmcoIHN0YXJ0ICsgNiwgZW5kICk7XG5cdFx0XHRcdFx0dmFyIHNwYWNlID0gZW1iZWQuaW5kZXhPZiggJyAnICk7XG5cdFx0XHRcdFx0aWYgKCBzcGFjZSA8IDAgKVxuXHRcdFx0XHRcdFx0c3BhY2UgPSBlbWJlZC5sZW5ndGg7XG5cdFx0XHRcdFx0dmFyIG9rID0gZmFsc2U7XG5cdFx0XHRcdFx0aWYgKCBzcGFjZSA+PSAwIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRzd2l0Y2ggKCBlbWJlZC5zdWJzdHJpbmcoIDAsIHNwYWNlICkgKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRjYXNlICdzZXR0ZW1wZXJhdHVyZSc6XG5cdFx0XHRcdFx0XHRcdFx0dmFyIGxpbmVEYXRhID0gdGhpcy5hd2kudXRpbGl0aWVzLmV4dHJhY3RMaW5lUGFyYW1ldGVycyggZW1iZWQsIFsgeyBuYW1lOiAndGVtcGVyYXR1cmUnLCB0eXBlOiAnbnVtYmVyJyB9IF0gKTtcblx0XHRcdFx0XHRcdFx0XHRvayA9IHRoaXMuYXdpLnBlcnNvbmFsaXR5LnNldFRlbXBlcmF0dXJlKCBsaW5lRGF0YS50ZW1wZXJhdHVyZSApO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRjYXNlICdzZXRwcm9tcHQnOlxuXHRcdFx0XHRcdFx0XHRcdHZhciBsaW5lRGF0YSA9IHRoaXMuYXdpLnV0aWxpdGllcy5leHRyYWN0TGluZVBhcmFtZXRlcnMoIGVtYmVkLCBbIHsgbmFtZTogJ3Byb21wdCcsIHR5cGU6ICdzdHJpbmcnIH0gXSApO1xuXHRcdFx0XHRcdFx0XHRcdG9rID0gdGhpcy5hd2kucGVyc29uYWxpdHkuc2V0UHJvbXB0KCBsaW5lRGF0YS5wcm9tcHQgKTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZSAncmVzdW1lJzpcblx0XHRcdFx0XHRcdFx0XHRvayA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggIW9rIClcblx0XHRcdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2F3aTpiYWQtY29tbWFuZDppd2EnIH07XG5cdFx0XHRcdFx0cGFyYW1ldGVycy51c2VySW5wdXQgPSBwYXJhbWV0ZXJzLnVzZXJJbnB1dC5zdWJzdHJpbmcoIDAsIHN0YXJ0ICkgKyBwYXJhbWV0ZXJzLnVzZXJJbnB1dC5zdWJzdHJpbmcoIGVuZCArIDYgKTtcblx0XHRcdFx0XHRzdGFydCA9IHBhcmFtZXRlcnMudXNlcklucHV0LmluZGV4T2YoICd7Y2hhdDonICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnYXdpOmJhZC1jb21tYW5kOml3YScgfTtcblx0XHRcdFx0fVxuXHRcdFx0fSB3aGlsZSggc3RhcnQgPj0gMCApO1xuXHRcdFx0cGFyYW1ldGVycy51c2VySW5wdXQgPSBwYXJhbWV0ZXJzLnVzZXJJbnB1dC50cmltKCk7XG5cdFx0XHRpZiAoIHBhcmFtZXRlcnMudXNlcklucHV0Lmxlbmd0aCA9PSAwIClcblx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogJ25vcHJvbXB0JyB9O1xuXHRcdH1cblx0XHR0aGlzLnBhcmFtZXRlcnMudXNlcklucHV0ID0gcGFyYW1ldGVycy51c2VySW5wdXQ7XG5cblx0XHQvLyBTY2FuIHRoZSBjb21tYW5kIGZvciBCYXNpYyBrZXl3b3Jkcy5cblx0XHR2YXIgY29udGV4dCA9ICcnO1xuXHRcdGlmICggdGhpcy5hd2kuY29ubmVjdG9ycy5sYW5ndWFnZXMuY3VycmVudCApXG5cdFx0e1xuXHRcdFx0dmFyIGZvdW5kS2V5d29yZHMgPSB0aGlzLmF3aS5sYW5ndWFnZS5zY2FuRm9yQ29tbWFuZHMoIHBhcmFtZXRlcnMudXNlcklucHV0ICk7XG5cdFx0XHRmb3IgKCB2YXIgZiA9IDA7IGYgPCBmb3VuZEtleXdvcmRzLmxlbmd0aDsgZisrIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGNvbXBsZXRpb24gPSBmb3VuZEtleXdvcmRzWyBmIF0uY29tcGxldGlvbi50cmltKCk7XG5cdFx0XHRcdGNvbXBsZXRpb24gPSBjb21wbGV0aW9uLmNoYXJBdCggMCApLnRvTG93ZXJDYXNlKCkgKyBjb21wbGV0aW9uLnN1YnN0cmluZyggMSApO1xuXHRcdFx0XHRjb21wbGV0aW9uID0gdGhpcy5hd2kudXRpbGl0aWVzLnJlcGxhY2VTdHJpbmdJblRleHQoIGNvbXBsZXRpb24sICcjIyMnLCAnJyApO1xuXHRcdFx0XHRjb250ZXh0ICs9ICggZiArIDIgKSArICcuJyArIGZvdW5kS2V5d29yZHNbIGYgXS5pbnN0cnVjdGlvbiArICcgaXMgJyArIGNvbXBsZXRpb24gKyAnXFxuJztcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBHYXRoZXIgcHJldmlvdXMgb3IgcmVsZXZhbnQgY29udmVyc2F0aW9ucyB7IGNhc2VJbnNlbnNpdGl2ZTogdHJ1ZSB9XG5cdFx0Y29udHJvbC5jYXNlSW5zZW5zaXRpdmUgPSB0cnVlO1xuXHRcdHZhciBtZW1vcmllcyA9IGF3YWl0IHRoaXMuYXdpLmV4dHJhY3RDb250ZW50RnJvbU1lbW9yaWVzKCBsaW5lLCB7IHNlbmRlck5hbWU6IHRoaXMuYXdpLmNvbmZpZy5nZXRDb25maWcoICd1c2VyJyApLmZ1bGxOYW1lIH0sIGNvbnRyb2wgKTtcblx0XHQvL21lbW9yaWVzLnB1c2goIC4uLnRoaXMuYXdpLm1lbW9yeU1hbmFnZXIucmVjYWxsKCBwYXJhbWV0ZXJzLnVzZXJJbnB1dCApICk7XG5cdFx0dmFyIGNvbnZlcnNhdGlvbiA9ICcnO1xuXHRcdHZhciB0YWtlbm90ZSA9ICcnO1xuXHRcdGlmICggdGhpcy5hd2kuZ2V0Q29uZmlnKCAndXNlcicgKS5maXJzdE5hbWUgIT0gJycgKVxuXHRcdHtcblx0XHRcdGNvbnZlcnNhdGlvbiA9IHRoaXMuYXdpLnBlcnNvbmFsaXR5LmdldE1lbW9yeVByb21wdCggbWVtb3JpZXMsIHRoaXMuYXdpLmdldENvbmZpZyggJ3VzZXInICkuZmlyc3ROYW1lLCB0aGlzLmF3aS5nZXRQZXJzb25hbGl0eSgpLm5hbWUsIDUgKTtcblx0XHRcdHRha2Vub3RlID0gdGhpcy5hd2kuZ2V0Q29uZmlnKCAndXNlcicgKS50YWtlTm90ZTtcblx0XHR9XG5cdFx0Y29udHJvbC5hbnN3ZXJDb3VudCA9IHRoaXMudXNlQ291bnQ7XG5cdFx0dmFyIHByb21wdCA9IHRoaXMuYXdpLnBlcnNvbmFsaXR5LmdldFByb21wdCggJ2N1cnJlbnQnICxcblx0XHRbXG5cdFx0XHR7IG5hbWU6ICdjb250ZXh0JywgY29udGVudDogY29udGV4dCB9LFxuXHRcdFx0eyBuYW1lOiAndGFrZU5vdGUnLCBjb250ZW50OiB0YWtlbm90ZSB9LFxuXHRcdFx0eyBuYW1lOiAnY29udmVyc2F0aW9uJywgY29udGVudDogY29udmVyc2F0aW9uIH0sXG5cdFx0XHR7IG5hbWU6ICdtZW1vcmllcycsIGNvbnRlbnQ6IG1lbW9yaWVzLmRhdGEuZGlyZWN0RXh0cmFjdGVkICsgbWVtb3JpZXMuZGF0YS5pbmRpcmVjdEV4dHJhY3RlZCB9LFxuXHRcdFx0eyBuYW1lOiAndGFzay1xdWVzdGlvbicsIGNvbnRlbnQ6IHBhcmFtZXRlcnMudXNlcklucHV0IH0sXG5cdFx0XSwgY29udHJvbCApO1xuXHRcdGNvbnRyb2wuYW5zd2VyQ291bnQgPSB1bmRlZmluZWQ7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgcHJvbXB0LCB7IHVzZXI6ICdwcm9tcHQnIH0gKTtcblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5zZW5kQ29tcGxldGlvbiggcHJvbXB0LCBmYWxzZSwgY29udHJvbCApO1xuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdHtcblx0XHRcdHZhciB0ZXh0ID0gIHRoaXMuYXdpLmNsZWFuUmVzcG9uc2UoIGFuc3dlci5kYXRhLnRleHQgKTtcblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIHRleHQsIHsgdXNlcjogJ2F3aScgfSApO1xuXHRcdFx0YW5zd2VyLmRhdGEgPSB0ZXh0O1xuXHRcdFx0dGhpcy5lbXB0eSA9IGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gYW5zd2VyO1xuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCBzdXBlci5wbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIHRyYW5zcGlsZSggbGluZSwgZGF0YSwgY29udHJvbCApXG5cdHtcblx0XHRzdXBlci50cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQnViYmxlID0gQnViYmxlR2VuZXJpY0NoYXQ7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1idWJibGUtZ2VuZXJpYy1kZWJ1Zy5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgRGVidWcgY29tbWFuZDogbWFuYWdlIGRlYnVnZ2luZ1xuKlxuKi9cbnZhciBhd2lidWJibGUgPSByZXF1aXJlKCAnLi4vYXdpLWJ1YmJsZScgKVxuXG5jbGFzcyBCdWJibGVHZW5lcmljRGVidWcgZXh0ZW5kcyBhd2lidWJibGUuQnViYmxlXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ0RlYnVnJztcblx0XHR0aGlzLnRva2VuID0gJ2RlYnVnJztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLnByb3BlcnRpZXMuYWN0aW9uID0gJ3NldHMgdGhlIGxldmVsIG9mIGRlYnVnIG9mIGF3aSc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFsgeyBldmFsdWF0aW9uOiAndGhlIGxldmVsIG9mIGRlYnVnLCBmcm9tIDAgdG8gMycsIHR5cGU6ICdudW1iZXInLCBpbnRlcnZhbDogeyBzdGFydDogMCwgZW5kOiAzIH0sIG9wdGlvbmFsOiBmYWxzZSB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbIHsgZXZhbFZhbHVlOiAndGhlIGxhc3QgZXZhbHVhdGVkIGV4cHJlc3Npb24nLCB0eXBlOiAnbnVtYmVyJyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnBhcnNlciA9IHtcblx0XHRcdHZlcmI6IFsgJ2RlYnVnJyBdLFxuXHRcdFx0ZXZhbHVhdGlvbjogWyAnbnVtZXJpYycgXSB9O1xuXHRcdHRoaXMucHJvcGVydGllcy5zZWxlY3QgPSBbXTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdGF3YWl0IHN1cGVyLnBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblxuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLmF3aS5sYW5ndWFnZS5kb0V2YWwoICcnICsgcGFyYW1ldGVycy5ldmFsdWF0aW9uLCB7fSApO1xuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdHtcblx0XHRcdHZhciBkZWJ1ZyA9IE1hdGguZmxvb3IoIGFuc3dlci5kYXRhICk7XG5cdFx0XHR2YXIgb2xkRGVidWcgPSB0aGlzLmF3aS5jb25maWcuZ2V0RGVidWcoKTtcblx0XHRcdGlmICggZGVidWcgIT0gb2xkRGVidWcgKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnU2V0dGluZyBkZWJ1ZyBsZXZlbCB0byAnICsgZGVidWcsIHsgdXNlcjogJ3Jvb3QnIH0gKTtcblx0XHRcdFx0dGhpcy5hd2kuY29uZmlnLnNldERlYnVnKCBkZWJ1ZyApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgWyBhbnN3ZXIuZXJyb3IgXSwgeyB1c2VyOiAnZXJyb3InIH0gKTtcblx0XHR9XG5cdFx0cmV0dXJuIGFuc3dlcjtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZUdlbmVyaWNEZWJ1ZztcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgIFsgXFwgWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWxcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gIFtffCB8X10gXFwgICAgIEFzc2lzdGFudFxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLWJ1YmJsZS1nZW5lcmljLWRpZ2VzdC5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgRGlnZXN0IGNvbW1hbmQ6IGRpZ2VzdCB0aGUgY29udGVudCBvZiB0aGUgdG9EaWdlc3QgZGlyZWN0b3J5XG4qXG4qL1xudmFyIGF3aWJ1YmJsZSA9IHJlcXVpcmUoICcuLi9hd2ktYnViYmxlJyApXG5cbmNsYXNzIEJ1YmJsZUdlbmVyaWNEaWdlc3QgZXh0ZW5kcyBhd2lidWJibGUuQnViYmxlXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ0RpZ2VzdCc7XG5cdFx0dGhpcy50b2tlbiA9ICdkaWdlc3QnO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAncmVhZCB0aGUgZmlsZXMgaW4gdGhlIGlucHV0IGJ1ZmZlciBhbmQgbWVtb3JpemUgdGhlbSc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFtcblx0XHRcdHsgbm91bjogJ3RoZSB0b3BpYyBvZiBkYXRhIHRvIHByb2Nlc3MsIGV4YW1wbGUgXCJGcmllbmQgTmFtZVwiJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiAnJyB9LFxuXHRcdF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbXG5cdFx0XHR7IHJlY2VpdmVyTmFtZTogJ3RoZSBuYW1lIG9mIHRoZSByZWNlaXZlcicsIHR5cGU6ICdzdHJpbmcnICB9LFxuXHRcdFx0eyBzb3V2ZW5pcnM6ICdsaXN0IG9mIHNvdXZlbmlycyBhc3NvY2lhdGVkIHRvIHRoZSByZWNlaXZlcicsIHR5cGU6ICdhcnJheS5zdHJpbmcuc291dmVuaXInIH1cblx0XHRdXG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnBhcnNlciA9IHtcblx0XHRcdG5vdW46IFsgJ2F1ZGlvJywgJ3NvdW5kJywgJ3ZpZGVvJywgJ2RvY3VtZW50JywgJ21lc3NlbmdlcicsICdpbWFnZScsICdwaG90bycgXSxcblx0XHRcdHZlcmI6IFsgJ2RpZ2VzdCcgXSB9O1xuXHRcdHRoaXMucHJvcGVydGllcy5zZWxlY3QgPSBbIFsgJ3ZlcmInIF0gXTtcblx0fVxuXHRhc3luYyBtZXNzZW5nZXIoIHBhdGgsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0Ly8gSW1wb3J0IG9uZSBtZXNzYWdlIGxpc3RkaWdlc3Rcblx0XHRhc3luYyBmdW5jdGlvbiBpbXBvcnRNZXNzYWdlcyggdG9kbywgY29udHJvbCApXG5cdFx0e1xuXHRcdFx0dmFyIGltcG9ydGVyID0gc2VsZi5hd2kuZ2V0Q29ubmVjdG9yKCAnaW1wb3J0ZXJzJywgJ21lc3NlbmdlcicsIHt9ICk7XG5cdFx0XHRjb250cm9sLmZyb20gPSB0b2RvLmZyb207XG5cdFx0XHR2YXIgYW5zd2VyID0gYXdhaXQgaW1wb3J0ZXIuaW1wb3J0KCB0b2RvLmh0bWxQYXRoLCBwYXJhbWV0ZXJzLnNlbmRlck5hbWUsIHRvZG8ucmVjZWl2ZXJOYW1lQ29tcHJlc3NlZCwgY29udHJvbCApO1xuXHRcdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0XHR7XG5cdFx0XHRcdHRvZG8uZG9uZSA9IHRydWU7XG5cdFx0XHRcdHRvZG8uZXJyb3IgPSBmYWxzZTtcblx0XHRcdFx0dG9kby5zb3V2ZW5pcnMgPSBhbnN3ZXIuZGF0YS5zb3V2ZW5pcnM7XG5cdFx0XHRcdHRvZG8ucmVjZWl2ZXJOYW1lID0gYW5zd2VyLmRhdGEucmVjZWl2ZXJOYW1lO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0b2RvLmVycm9yID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0b2RvO1xuXHRcdH1cblxuXHRcdHZhciB0b2RvID0gW107XG5cdFx0dmFyIGRpcmVjdG9yaWVzVG9TY2FuID1cblx0XHRbXG5cdFx0XHQnYXJjaGl2ZWRfdGhyZWFkcycsXG5cdFx0XHQnZmlsdGVyZWRfdGhyZWFkcycsXG5cdFx0XHQnaW5ib3gnXG5cdFx0XTtcblx0XHRmb3IgKCB2YXIgZCA9IDA7IGQgPCBkaXJlY3Rvcmllc1RvU2Nhbi5sZW5ndGg7IGQrKyApXG5cdFx0e1xuXHRcdFx0dmFyIGRpclBhdGggPSB0aGlzLmF3aS51dGlsaXRpZXMubm9ybWFsaXplKCBwYXRoICsgJy9tZXNzYWdlcy8nICsgZGlyZWN0b3JpZXNUb1NjYW5bIGQgXSApO1xuXHRcdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLnN5c3RlbS5nZXREaXJlY3RvcnkoIGRpclBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0gKTtcblx0XHRcdGlmICggYW5zd2VyIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGZpbGVzID0gYW5zd2VyLmRhdGE7XG5cdFx0XHRcdGlmICggIXBhcmFtZXRlcnMucmVjZWl2ZXJOYW1lIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGZvciAoIHZhciBmID0gMDsgZiA8IGZpbGVzLmxlbmd0aDsgZisrIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR2YXIgZGlyQ29udGFjdCA9IGZpbGVzWyBmIF07XG5cdFx0XHRcdFx0XHRpZiAoIGRpckNvbnRhY3QuaXNEaXJlY3RvcnkgKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHR2YXIgcG9zID0gZGlyQ29udGFjdC5uYW1lLmluZGV4T2YoICdfJyApO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHBvcyA+PSAwIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHZhciByZWNlaXZlck5hbWVDb21wcmVzc2VkID0gZGlyQ29udGFjdC5uYW1lLnN1YnN0cmluZyggMCwgcG9zICk7XG5cdFx0XHRcdFx0XHRcdFx0Zm9yICggdmFyIGZmID0gMDsgZmYgPCBkaXJDb250YWN0LmZpbGVzLmxlbmd0aDsgZmYrKyApXG5cdFx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIGZpbGUgPSBkaXJDb250YWN0LmZpbGVzWyBmZiBdO1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCBmaWxlLm5hbWUuaW5kZXhPZiggJ21lc3NhZ2VfJyApID09IDAgKVxuXHRcdFx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0b2RvLnB1c2goXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzZW5kZXJOYW1lOiBwYXJhbWV0ZXJzLnNlbmRlck5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmVjZWl2ZXJOYW1lQ29tcHJlc3NlZDogcmVjZWl2ZXJOYW1lQ29tcHJlc3NlZCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRyZWNlaXZlck5hbWU6ICcnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGh0bWxQYXRoOiBmaWxlLnBhdGgsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGlyUGF0aDogZGlyQ29udGFjdC5wYXRoLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZyb206ICdmcm9tICcgKyBkaXJlY3Rvcmllc1RvU2NhblsgZCBdLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRvbmU6IGZhbHNlXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIHJlY2VpdmVyTmFtZUNvbXByZXNzZWQgPSBwYXJhbWV0ZXJzLnJlY2VpdmVyTmFtZS5zcGxpdCggJyAnICkuam9pbiggJycgKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdGZvciAoIHZhciBmID0gMDsgZiA8IGZpbGVzLmxlbmd0aDsgZisrIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR2YXIgZGlyQ29udGFjdCA9IGZpbGVzWyBmIF07XG5cdFx0XHRcdFx0XHRpZiAoIGRpckNvbnRhY3QuaXNEaXJlY3RvcnkgJiYgZGlyQ29udGFjdC5uYW1lLmluZGV4T2YoIHJlY2VpdmVyTmFtZUNvbXByZXNzZWQgKSA9PSAwIClcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0Zm9yICggdmFyIGZmID0gMDsgZmYgPCBkaXJDb250YWN0LmZpbGVzLmxlbmd0aDsgZmYrKyApXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoIGRpckNvbnRhY3QuZmlsZXNbIGZmIF0ubmFtZS5pbmRleE9mKCAnbWVzc2FnZV8nICkgPT0gMCApXG5cdFx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFx0dG9kby5wdXNoKFxuXHRcdFx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZWNlaXZlck5hbWVDb21wcmVzc2VkOiByZWNlaXZlck5hbWVDb21wcmVzc2VkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZWNlaXZlck5hbWU6ICcnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRodG1sUGF0aDogZGlyQ29udGFjdC5maWxlc1sgZmYgXS5wYXRoLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRkaXJQYXRoOiBkaXJDb250YWN0LnBhdGgsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZyb206ICdmcm9tIGZvbGRlciAnICsgZGlyZWN0b3JpZXNUb1NjYW5bIGQgXSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZG9uZTogZmFsc2Vcblx0XHRcdFx0XHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgaW52YWxpZCA9IFtdO1xuXHRcdHZhciB2YWxpZCA9IFtdO1xuXHRcdGlmICggY29udHJvbC5zdG9yZSApXG5cdFx0e1xuXHRcdFx0Zm9yICggdmFyIHRkID0gMDsgdGQgPCB0b2RvLmxlbmd0aDsgdGQrKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciB0b2JlZG9uZSA9IGF3YWl0IGltcG9ydE1lc3NhZ2VzKCB0b2RvWyB0ZCBdLCBjb250cm9sICk7XG5cdFx0XHRcdGlmICggIXRvYmVkb25lLmVycm9yIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICggdG9iZWRvbmUuc291dmVuaXJzLmxlbmd0aCA+IDAgKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGZvciAoIHZhciBzID0gMDsgcyA8IHRvYmVkb25lLnNvdXZlbmlycy5sZW5ndGg7IHMrKyApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGlmICggdGhpcy5hd2kucGVyc29uYWxpdHkubWVtb3JpZXMubWVzc2VuZ2VyLmFkZFNvdXZlbmlyKCB0b2JlZG9uZS5zb3V2ZW5pcnNbIHMgXSwgY29udHJvbCApIClcblx0XHRcdFx0XHRcdFx0XHR2YWxpZC5wdXNoKCB0b2JlZG9uZS5zb3V2ZW5pcnNbIHMgXSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpbnZhbGlkLnB1c2goIHRvYmVkb25lLmRpclBhdGggKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRjb250cm9sLnN0b3JlID0gZmFsc2U7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGludmFsaWQ6IGludmFsaWQsXG5cdFx0XHR2YWxpZDogdmFsaWRcblx0XHR9XG5cdH1cblx0YXN5bmMgdmlkZW9zKCBwYXRoLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBpbnZhbGlkID0gW107XG5cdFx0dmFyIHZhbGlkID0gW107XG5cdFx0dmFyIGltcG9ydGVyID0gdGhpcy5hd2kuZ2V0Q29ubmVjdG9yKCAnaW1wb3J0ZXJzJywgJ3ZpZGVvJywge30gKTtcblxuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLmF3aS5zeXN0ZW0uZ2V0RGlyZWN0b3J5KCB0aGlzLmF3aS5jb25maWcuZ2V0RGF0YVBhdGgoKSArICcvdG9kaWdlc3QvdmlkZW9zJywgeyByZWN1cnNpdmU6IHRydWUsIGZpbHRlcnM6IFsgJyoubXA0JywgJyoub2dnJyBdIH0gKTtcblx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHR7XG5cdFx0XHR2YXIgZmlsZXMgPSB0aGlzLmF3aS51dGlsaXRpZXMuZ2V0RmlsZUFycmF5RnJvbVRyZWUoIGFuc3dlci5kYXRhICk7XG5cdFx0XHRmb3IgKCB2YXIgZiA9IDA7IGYgPCBmaWxlcy5sZW5ndGg7IGYrKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBmaWxlID0gZmlsZXNbIGYgXTtcblx0XHRcdFx0Y29udHJvbC50eXBlID0gJ3ZpZGVvcyc7XG5cdFx0XHRcdGFuc3dlciA9IGF3YWl0IGltcG9ydGVyLmltcG9ydCggZmlsZS5wYXRoLCBwYXJhbWV0ZXJzLnNlbmRlck5hbWUsIGNvbnRyb2wgKTtcblx0XHRcdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YWxpZC5wdXNoKCAuLi5hbnN3ZXIuZGF0YS5zb3V2ZW5pcnMgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpbnZhbGlkLnB1c2goIGZpbGUucGF0aCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICggY29udHJvbC5zdG9yZSAmJiB2YWxpZC5sZW5ndGggPiAwIClcblx0XHR7XG5cdFx0XHR2YXIgbmV3VmFsaWQgPSBbXTtcblx0XHRcdGZvciAoIHZhciB2ID0gMDsgdiA8IHZhbGlkLmxlbmd0aDsgdisrIClcblx0XHRcdHtcblx0XHRcdFx0aWYgKCB0aGlzLmF3aS5wZXJzb25hbGl0eS5tZW1vcmllcy52aWRlb3MuYWRkU291dmVuaXIoIHZhbGlkWyB2IF0sIGNvbnRyb2wgKSApXG5cdFx0XHRcdFx0bmV3VmFsaWQucHVzaCggdmFsaWRbIHYgXSApO1xuXHRcdFx0fVxuXHRcdFx0dmFsaWQgPSBuZXdWYWxpZDtcblx0XHR9XG5cdFx0Y29udHJvbC5zdG9yZSA9IGZhbHNlO1xuXHRcdHJldHVybiB7XG5cdFx0XHRpbnZhbGlkOiBpbnZhbGlkLFxuXHRcdFx0dmFsaWQ6IHZhbGlkXG5cdFx0fVxuXHR9XG5cdGFzeW5jIGF1ZGlvcyggcGF0aCwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgaW52YWxpZCA9IFtdO1xuXHRcdHZhciB2YWxpZCA9IFtdO1xuXHRcdHZhciBpbXBvcnRlciA9IHRoaXMuYXdpLmdldENvbm5lY3RvciggJ2ltcG9ydGVycycsICdhdWRpbycsIHt9ICk7XG5cblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kuc3lzdGVtLmdldERpcmVjdG9yeSggdGhpcy5hd2kuY29uZmlnLmdldERhdGFQYXRoKCkgKyAnL3RvZGlnZXN0L2F1ZGlvcycsIHsgcmVjdXJzaXZlOiB0cnVlLCBmaWx0ZXJzOiBbICcqLndhdicsICcqLm1wMycsICcqLm9nZycgXSB9ICk7XG5cdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0e1xuXHRcdFx0dmFyIGZpbGVzID0gdGhpcy5hd2kudXRpbGl0aWVzLmdldEZpbGVBcnJheUZyb21UcmVlKCBhbnN3ZXIuZGF0YSApO1xuXHRcdFx0Zm9yICggdmFyIGYgPSAwOyBmIDwgZmlsZXMubGVuZ3RoOyBmKysgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgZmlsZSA9IGZpbGVzWyBmIF07XG5cdFx0XHRcdGFuc3dlciA9IGF3YWl0IGltcG9ydGVyLmltcG9ydCggZmlsZS5wYXRoLCBwYXJhbWV0ZXJzLnNlbmRlck5hbWUsIGNvbnRyb2wgKTtcblx0XHRcdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YWxpZC5wdXNoKCAuLi5hbnN3ZXIuZGF0YS5zb3V2ZW5pcnMgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpbnZhbGlkLnB1c2goIGZpbGUucGF0aCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICggY29udHJvbC5zdG9yZSAmJiB2YWxpZC5sZW5ndGggPiAwIClcblx0XHR7XG5cdFx0XHR2YXIgbmV3VmFsaWQgPSBbXTtcblx0XHRcdGZvciAoIHZhciB2ID0gMDsgdiA8IHZhbGlkLmxlbmd0aDsgdisrIClcblx0XHRcdHtcblx0XHRcdFx0aWYgKCB0aGlzLmF3aS5wZXJzb25hbGl0eS5tZW1vcmllcy5hdWRpb3MuYWRkU291dmVuaXIoIHZhbGlkWyB2IF0sIGNvbnRyb2wgKSApXG5cdFx0XHRcdFx0bmV3VmFsaWQucHVzaCggdmFsaWRbIHYgXSApO1xuXHRcdFx0fVxuXHRcdFx0dmFsaWQgPSBuZXdWYWxpZDtcblx0XHR9XG5cdFx0Y29udHJvbC5zdG9yZSA9IGZhbHNlO1xuXHRcdHJldHVybiB7XG5cdFx0XHRpbnZhbGlkOiBpbnZhbGlkLFxuXHRcdFx0dmFsaWQ6IHZhbGlkXG5cdFx0fVxuXHR9XG5cdGFzeW5jIHBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0aWYgKCB0eXBlb2YgcGFyYW1ldGVycy5zZW5kZXJOYW1lID09ICd1bmRlZmluZWQnIClcblx0XHRcdHBhcmFtZXRlcnMuc2VuZGVyTmFtZSA9IHRoaXMuYXdpLmdldENvbmZpZyggJ3VzZXInICkuZnVsbE5hbWU7XG5cblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgc3VwZXIucGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdHtcblx0XHRcdHZhciByZXN1bHQgPVxuXHRcdFx0e1xuXHRcdFx0XHR2YWxpZDogW10sXG5cdFx0XHRcdGludmFsaWQ6IFtdXG5cdFx0XHR9O1xuXHRcdFx0dmFyIHR5cGUgPSBwYXJhbWV0ZXJzLm5vdW47XG5cdFx0XHRpZiAoIHR5cGUgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgcGF0aCA9IHRoaXMuYXdpLnV0aWxpdGllcy5ub3JtYWxpemUoIHRoaXMuYXdpLmNvbmZpZy5nZXREYXRhUGF0aCgpICsgJy90b2RpZ2VzdC8nICsgdHlwZSApO1xuXHRcdFx0XHR2YXIgZXhpc3QgPSBhd2FpdCB0aGlzLmF3aS5zeXN0ZW0uZXhpc3RzKCBwYXRoICk7XG5cdFx0XHRcdGlmICggIWV4aXN0LnN1Y2Nlc3MgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZSArPSAncyc7XG5cdFx0XHRcdFx0cGF0aCA9IHRoaXMuYXdpLnV0aWxpdGllcy5ub3JtYWxpemUoIHRoaXMuYXdpLmNvbmZpZy5nZXREYXRhUGF0aCgpICsgJy90b2RpZ2VzdC8nICsgdHlwZSApO1xuXHRcdFx0XHRcdGV4aXN0ID0gYXdhaXQgdGhpcy5hd2kuc3lzdGVtLmV4aXN0cyggcGF0aCApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggIWV4aXN0LnN1Y2Nlc3MgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ0Nhbm5vdCBpbXBvcnQgZmlsZXMgb2YgdHlwZSBcIicgKyB0eXBlICsgJ1wiLicsIHsgdXNlcjogJ2Vycm9yJyB9ICk7XG5cdFx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ1N1cHBvcnRlZCBpbXBvcnQgdHlwZXM6IGF1ZGlvLCB2aWRlbywgbWVzc2VuZ2VyLCBhbmQgbW9yZSB0byBjb21lIScsIHsgdXNlcjogJ2F3aScgfSApO1xuXHRcdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBkYXRhOiAnYXdpOmNhbm5vdC1pbXBvcnQ6aXdhJyB9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggdGhpc1sgdHlwZSBdIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnRyb2wuc3RvcmUgPSB0cnVlO1xuXHRcdFx0XHRcdHZhciBpbmZvID0gYXdhaXQgdGhpc1sgdHlwZSBdKCBwYXRoLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0XHRcdFx0cmVzdWx0LnZhbGlkLnB1c2goIC4uLmluZm8udmFsaWQgKTtcblx0XHRcdFx0XHRyZXN1bHQuaW52YWxpZC5wdXNoKCAuLi5pbmZvLmludmFsaWQgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgcGF0aCA9IHRoaXMuYXdpLmNvbmZpZy5nZXREYXRhUGF0aCgpICsgJy90b2RpZ2VzdCc7XG5cdFx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLmF3aS5zeXN0ZW0uZ2V0RGlyZWN0b3J5KCBwYXRoLCB7IHJlY3Vyc2l2ZTogZmFsc2UgfSApO1xuXHRcdFx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBmaWxlcyA9IGFuc3dlci5kYXRhO1xuXHRcdFx0XHRcdGZvciAoIHZhciBkID0gMDsgZCA8IGZpbGVzLmxlbmd0aDsgZCsrIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR2YXIgZmlsZSA9IGZpbGVzWyBkIF07XG5cdFx0XHRcdFx0XHRpZiAoIGZpbGUuaXNEaXJlY3RvcnkgKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRpZiAoIHRoaXNbIGZpbGUubmFtZSBdIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRyb2wuc3RvcmUgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdHZhciBpbmZvID0gYXdhaXQgdGhpc1sgZmlsZS5uYW1lIF0oIGZpbGUucGF0aCwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdFx0XHRcdFx0XHRcdHJlc3VsdC52YWxpZC5wdXNoKCAuLi5pbmZvLnZhbGlkICk7XG5cdFx0XHRcdFx0XHRcdFx0cmVzdWx0LmludmFsaWQucHVzaCggLi4uaW5mby5pbnZhbGlkICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIHJlc3VsdC52YWxpZC5sZW5ndGggKycgc291dmVuaXJzIGFkZGVkLicsIHsgdXNlcjogJ2luZm9ybWF0aW9uJyB9ICk7XG5cdFx0XHRpZiAoIHJlc3VsdC5pbnZhbGlkLmxlbmd0aCA+IDAgKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnVGhlc2UgaXRlbXMgY291bGQgbm90IGJlIGltcG9ydGVkLi4uJywgeyB1c2VyOiAnd2FybmluZycgfSApO1xuXHRcdFx0XHRmb3IgKCB2YXIgaSA9IDA7IGkgPCByZXN1bHQuaW52YWxpZC5sZW5ndGg7IGkrKyApXG5cdFx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJyAtICcgKyAgcmVzdWx0LmludmFsaWRbIGkgXSwgeyB1c2VyOiAnd2FybmluZycgfSApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyByZWNlaXZlck5hbWU6IHBhcmFtZXRlcnMucmVjZWl2ZXJOYW1lLCBzb3V2ZW5pcnM6IHJlc3VsdC52YWxpZCB9IH07XG5cdFx0fVxuXHRcdHJldHVybiBhbnN3ZXI7XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLnBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sIClcblx0e1xuXHRcdHN1cGVyLnRyYW5zcGlsZSggbGluZSwgZGF0YSwgY29udHJvbCApO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5CdWJibGUgPSBCdWJibGVHZW5lcmljRGlnZXN0O1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktYnViYmxlLWdlbmVyaWMtcGxheS5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgUGxheSBjb21tYW5kOiBwbGF5IGEgbWVkaWEgZmlsZSBpbiB0aGUgY3VycmVudCBlZGl0b3JcbipcbiovXG52YXIgYXdpYnViYmxlID0gcmVxdWlyZSggJy4uL2F3aS1idWJibGUnICk7XG5cbmNsYXNzIEJ1YmJsZUdlbmVyaWNFZGl0IGV4dGVuZHMgYXdpYnViYmxlLkJ1YmJsZVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdFZGl0Jztcblx0XHR0aGlzLnRva2VuID0gJ2VkaXQnO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAnZWRpdCBhIGZpbGUnO1xuXHRcdHRoaXMucHJvcGVydGllcy5pbnB1dHMgPSBbXG5cdFx0XHR7IGZpbGU6ICd0aGUgZmlsZSB0byBlZGl0JywgdHlwZTogJ3N0cmluZycgfSxcblx0XHRcdHsgZGF0ZTogJ3RoZSBkYXRlIHdoZW4gdGhlIGZpbGUgd2FzIGNyZWF0ZWQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdHsgdGltZTogJ3RoZSB0aW1lIHdoZW4gdGhlIGZpbGUgd2FzIGNyZWF0ZWQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdHsgaW5wdXQ6ICdkZXNjcmlwdGlvbiBvZiB0aGUgY29udGVudCB0byBzZWFyY2ggZm9yJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlIH0sXG5cdFx0XHRdO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzID0gWyB7IGZpbGVzOiAndGhlIGxhc3QgbGlzdCBvZiBmaWxlcycsIHR5cGU6ICdwYXRoLnN0cmluZy5hcnJheScgfSxcblx0XHRcdFx0XHRcdFx0XHRcdHsgZmlsZUVkaXRlZDogJ3RoZSBsYXN0IGZpbGUgdG8gYmUgcmFuJywgdHlwZTogJ3BhdGgnIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMucGFyc2VyID0ge1xuXHRcdFx0dmVyYjogWyAnZWRpdCcsICdtb2RpZnknLCAnY2hhbmdlJywgJ2NvcnJlY3QnIF0sXG5cdFx0XHRmaWxlOiBbXSwgZGF0ZTogW10sIHRpbWU6IFtdLCBpbnB1dDogW10gfTtcblx0XHR0aGlzLnByb3BlcnRpZXMuc2VsZWN0ID0gWyBbICd2ZXJiJyBdIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0YXN5bmMgZnVuY3Rpb24gcGxheUl0KCBmaWxlLCBmaWxlcyApXG5cdFx0e1xuXHRcdFx0dmFyIHBsYXkgPSBhd2FpdCBzZWxmLmF3aS5zeXN0ZW0ucGxheUZpbGUoIGZpbGUsICdlZGl0JywgY29udHJvbCApO1xuXHRcdFx0aWYgKCBwbGF5LnN1Y2Nlc3MgKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoIHR5cGVvZiBmaWxlcyAhPSAndW5kZWZpbmVkJyApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBmaWxlczogZmlsZXMsIGZpbGVFZGl0ZWQ6IGZpbGUgfSB9O1xuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IGZpbGVFZGl0ZWQ6IGZpbGUgfSB9O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGF3YWl0IHN1cGVyLnBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRpZiAoIC9eXFxkKyQvLnRlc3QoIGxpbmUgKSApXG5cdFx0e1xuXHRcdFx0dmFyIGZpbGVzID0gdGhpcy5icmFuY2guZ2V0TGFzdERhdGEoIHRoaXMsICdmaWxlcycgKTtcblx0XHRcdGlmICggZmlsZXMgJiYgZmlsZXMubGVuZ3RoID4gMCApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBudW1iZXIgPSBwYXJzZUludCggbGluZSApIC0gMTtcblx0XHRcdFx0aWYgKCBudW1iZXIgPj0gMCAmJiBudW1iZXIgPCBmaWxlcy5sZW5ndGggKVxuXHRcdFx0XHRcdHJldHVybiBhd2FpdCBwbGF5SXQoIGZpbGVzWyBudW1iZXIgXSApO1xuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6bm90LWZvdW5kOml3YScgfTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLnN5c3RlbS5maW5kRmlsZXMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRpZiAoICFhbnN3ZXIuc3VjY2VzcyApXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6bm90LWZvdW5kOml3YScgfTtcblxuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgPT09ICcxJyApXG5cdFx0XHRyZXR1cm4gYXdhaXQgcGxheUl0KCBhbnN3ZXIuZGF0YVsgMCBdLCBhbnN3ZXIuZGF0YSApO1xuXG5cdFx0dmFyIHJlc3VsdCA9IFtdO1xuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIFsgJ1lvdSBjYW4gZWRpdCB0aGVzZSBmaWxlczogJyBdLCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdGZvciAoIHZhciBmID0gMDsgZiA8IGFuc3dlci5kYXRhLmxlbmd0aDsgZisrIClcblx0XHRcdHJlc3VsdC5wdXNoKCAoIGYgKyAxICkgKyAnLiAnICsgYW5zd2VyLmRhdGFbIGYgXS5wYXRoICk7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgcmVzdWx0LCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdHZhciBwYXJhbSA9IGF3YWl0IHRoaXMuYXdpLnByb21wdC5nZXRQYXJhbWV0ZXJzKCBbXG5cdFx0XHR7IGNob2ljZTogJ1BsZWFzZSBlbnRlciBhIG51bWJlciBiZXR3ZWVuIDEgYW5kICcgKyBhbnN3ZXIuZGF0YS5sZW5ndGgsIHR5cGU6ICdudW1iZXInLCBpbnRlcnZhbDogWyAxLCBhbnN3ZXIuZGF0YS5sZW5ndGggXSwgb3B0aW9uYWw6IGZhbHNlLCBkZWZhdWx0OiAwIH0sXG5cdFx0XHRdLCBjb250cm9sICk7XG5cdFx0aWYgKCBwYXJhbS5zdWNjZXNzIClcblx0XHRcdHJldHVybiBhd2FpdCBwbGF5SXQoIGFuc3dlci5kYXRhWyBwYXJhbS5kYXRhLmNob2ljZSAtIDEgXSwgYW5zd2VyLmRhdGEgKTtcblx0XHRyZXR1cm4gYW5zd2VyO1xuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCBzdXBlci5wbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIHRyYW5zcGlsZSggbGluZSwgZGF0YSwgY29udHJvbCApXG5cdHtcblx0XHRzdXBlci50cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQnViYmxlID0gQnViYmxlR2VuZXJpY0VkaXQ7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1idWJibGUtZ2VuZXJpYy1lcnJvci5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgRXJyb3IgbWFuYWdlbWVudCBidWJibGVcbipcbiovXG52YXIgYXdpYnViYmxlID0gcmVxdWlyZSggJy4uL2F3aS1idWJibGUnICk7XG5cbmNsYXNzIEJ1YmJsZUdlbmVyaWNFcnJvciBleHRlbmRzIGF3aWJ1YmJsZS5CdWJibGVcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLm5hbWUgPSAnRXJyb3InO1xuXHRcdHRoaXMudG9rZW4gPSAnZXJyb3InO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAnaGFuZGxlIGVycm9ycyc7XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogJycgfTtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZUdlbmVyaWNFcnJvcjtcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgIFsgXFwgWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWxcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gIFtffCB8X10gXFwgICAgIEFzc2lzdGFudFxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLWJ1YmJsZS1nZW5lcmljLWV2YWwuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IEV2YWwgY29tbWFuZDogcGVyZm9ybSBhIGNhbGN1bGF0aW9uXG4qXG4qL1xudmFyIGF3aWJ1YmJsZSA9IHJlcXVpcmUoICcuLi9hd2ktYnViYmxlJyApXG5cbmNsYXNzIEJ1YmJsZUdlbmVyaWNFdmFsIGV4dGVuZHMgYXdpYnViYmxlLkJ1YmJsZVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5uYW1lID0gJ0V2YWwnO1xuXHRcdHRoaXMudG9rZW4gPSAnZXZhbCc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICdjb252ZXJ0cyBhIHN0cmluZyB0byBhIG51bWJlcic7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFsgeyBldmFsdWF0aW9uOiAndGhlIGV4cHJlc3Npb24gdG8gY29udmVydCcsIHR5cGU6ICdzdHJpbmcnIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBldmFsVmFsdWU6ICd0aGUgbGFzdCBldmFsdWF0ZWQgZXhwcmVzc2lvbicsIHR5cGU6ICdudW1iZXInIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMucGFyc2VyID0ge1xuXHRcdFx0dmVyYjogWyAnZXZhbCcsICdldmFsdWF0ZScsICdjYWxjdWxhdGUnLCAnY2FsYycgXSxcblx0XHRcdGV2YWx1YXRpb246IFsgJ251bWVyaWMnIF0gfTtcblx0XHR0aGlzLnByb3BlcnRpZXMuc2VsZWN0ID0gWyBbICd2ZXJiJyBdIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLmxhbmd1YWdlLmRvRXZhbCggJycgKyBwYXJhbWV0ZXJzLmV2YWx1YXRpb24sIHt9ICk7XG5cdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0e1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgWyAnJyArIGFuc3dlci5kYXRhIF0sIHsgdXNlcjogJ3Jlc3VsdCcgfSApO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgWyBhbnN3ZXIuZXJyb3IgXSwgeyB1c2VyOiAnYXdpJyB9ICk7XG5cdFx0fVxuXHRcdHJldHVybiBhbnN3ZXI7XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLnBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sIClcblx0e1xuXHRcdHN1cGVyLnRyYW5zcGlsZSggbGluZSwgZGF0YSwgY29udHJvbCApO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5CdWJibGUgPSBCdWJibGVHZW5lcmljRXZhbDtcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgIFsgXFwgWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWxcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gIFtffCB8X10gXFwgICAgIEFzc2lzdGFudFxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLWJ1YmJsZS1nZW5lcmljLWhlbHAuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IEhlbHAgY29tbWFuZDogcHJvdmlkZXMgaGVscCBhYm91dCB0aGUgYXdpLWVuZ2luZVxuKlxuKi9cbnZhciBhd2lidWJibGUgPSByZXF1aXJlKCAnLi4vYXdpLWJ1YmJsZScgKTtcblxuY2xhc3MgQnViYmxlR2VuZXJpY0hlbHAgZXh0ZW5kcyBhd2lidWJibGUuQnViYmxlXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ0hlbHAnO1xuXHRcdHRoaXMudG9rZW4gPSAnaGVscCc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICdwcm92aWRlIGhlbHAgYWJvdXQgdXNpbmcgYXdpJztcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gWyB7IGlucHV0OiAndGhlIGRlc2lyZWQgdG9waWMnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUsIGRlZmF1bHQ6ICcnIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBoZWxwVG9waWM6ICdoZWxwIGFib3V0IHRoZSB0b3BpYycsIHR5cGU6ICdzdHJpbmcnIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMucGFyc2VyID0ge1xuXHRcdFx0dmVyYjogWyAnaGVscCcgXSxcblx0XHRcdGlucHV0OiBbXSB9O1xuXHRcdHRoaXMucHJvcGVydGllcy5zZWxlY3QgPSBbIFsgJ3ZlcmInIF0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMuZWRpdGFibGVzID1cblx0XHRbXG5cdFx0XHR7IG5hbWU6ICd3ZWxjb21lJywgdHlwZTogJ3RleHQnLCBjb250ZW50OiBgXG5IZWxsbyBBd2kgaGVscC5cbj09PT09PT09PT09PT09PVxuMS4gU3RhcnQgYW55IGxpbmUgd2l0aCAuIHRvIHRhbGsgdG8gQXdpLlxuMi4gVHlwZSB5b3VyIHF1ZXN0aW9uIHdpdGggb3Igd2l0aG91dCBjb21tYW5kLCBBd2kgd2lsbCBhbnN3ZXIuXG4zLiBSZWZpbmUgeW91ciBxdWVzdGlvbnMgdW50aWwgc2F0aXNmaWVkLlxuNC4gUHJlc3MgPEVTQ0FQRT4gdG8gZXJhc2UgdGhlIGxhc3QgcHJvbXB0IGFuZCBnbyB1cCBpbiB0aGUgY29udmVyc2F0aW9uLlxuW3dhaXRdXG5Bd2kgY2FuIGRvIG1hbnkgdGhpbmdzIHN1Y2ggYXM6XG4tIEFuc3dlciB0byBnZW5lcmFsIHF1ZXN0aW9uc1xuLSBSZWZpbmUgYSBzdWJqZWN0IGRlZXBlciBhbmQgZGVlcGVyXG4tIEZpbmQgZmlsZXMgYW5kIGFzc2V0cywgaW1wb3J0IHRoZW0gZm9yIHlvdVxuLSBQZXJmb3JtIGNhbGN1bGF0aW9ucyBhbmQgY29udmVyc2lvbnNcbi0gRmluZCBtYWlscyBmcm9tIGRlc2NyaXB0aW9ucyBhbmQgZXh0cmFjdCBkYXRhIGZyb20gdGhlbVxuLSBDb3B5LCByZW5hbWUgZmlsZXMgb24geW91ciBjb21wdXRlciB3aXRoIHlvdXIgYXV0aG9yaXNhdGlvblxuLSBIZWxwIHlvdSBmaXggcHJvYmxlbXMgaW4gc29mdHdhcmUgb3IgaGFyZHdhcmVcbmV0Yy5cblt3YWl0XVxuU3VjaCBhY3Rpb25zIGFyZSBjYWxsZWQgY29tbWFuZHMuIEFzIGluIGEgY29tbWFuZCBsaW5lLCB5b3UgY2FuXG5kaXJlY3RseSBjYWxsIGEgY29tbWFuZCB3aXRoIGl0J3MgbmFtZS5cbkV4YW1wbGUsIG9uY2UgdGhlIGF3aSBwcm9tcHQgaXMgb3BlbiBhZnRlciB0aGUgaW5pdGlhbCBcIi5hd2lcIixcbi5maW5kIG15cGljKi5wbmdcbi4uc2VhcmNoaW5nLi4uXG4uLi48cGF0aD5cbi4uLjxwYXRoPlxuLi4uPHBhdGg+XG4uXG5Zb3UgY2FuIGFzayBoZWxwIGZvciB0aGUgbGlzdCBvZiBjb21tYW5kcy5cblt3YWl0XVxuT25jZSBhIGNvbnZlcnNhdGlvbiBoYXMgcGVyZm9ybWVkIGEgYnViYmxlLCBhbmQgdGhlIHJlc3VsdCBpcyB0aGUgb25lXG55b3UgZXhwZWN0ZWQgKGV4YW1wbGUsIHlvdSBmb3VuZCB0aGlzIGtpbmQgb2YgXCJibHVlXCIgYXNzZXRzIGluIHlvdXIgYXNzZXRcbmRpcmVjdG9yeSksIHlvdSBjYW4gY29udmVydCB0aGUgY29udmVyc2F0aW9uIGludG8gYSBuZXcgY29tbWFuZCB0aGF0IHdpbGxcbmJlIGludGVncmF0ZWQgdG8gdGhlIGxpc3Qgb2YgY29tbWFuZHMuIEluIHRoZSBwcm9jZXNzIFwiYmx1ZVwiIHdpbGwgYmVjb21lXG5hIHBhcmFtZXRlci4gQXNrIGZvciBpbmZvIG9uIHRoZSBzdWJqZWN0IGJ5IHR5cGluZyBcImhlbHAgY29tbWFuZHNcIi5cblt3YWl0XVxuWW91IGNhbiBhbHNvIHRyYW5zcGlsZSB0aGUgY29udmVyc2F0aW9uIGludG8gYW55IGxhbmd1YWdlIG9mIHlvdXIgY2hvaWNlLFxuQW96IG9ubHkgZm9yIHRoZSBtb21lbnQsIGFuZCBpdCB3aWxsIGJlY29tZSBhIGZ1bmN0aW9uIHRoYXQsIGluIG91ciBjYXNlLFxud2lsbCBsb29rIGZvciBhc3NldHMgb2YgYSBjZXJ0YWluIGNvbG9yLlxuXG5EbyB5b3UgbmVlZCBoZWxwIG9uIGEgY2VydGFpbiBzdWJqZWN0PyBJZiB5ZXMsIGp1c3QgdHlwZSBcIi5oZWxwIHN1YmplY3RcIi5cbmAgXHRcdFx0XHR9LFxuXHRcdFx0eyBuYW1lOiAnY29tbWFuZHMnLCB0eXBlOiAndGV4dCcsIGNvbnRlbnQ6IGBcbkF3aSBsaXN0IG9mIGNvbW1hbmRzLlxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5UaGlzIGxpc3QgaXMgZGVzdGluZWQgdG8gZ3Jvdy5cblxuQ29tbWFuZHMgbWF5IG9yIG1heSBub3QgY2FsbCBBd2kgZm9yIGEgcmVzcG9uc2UuXG5cbi5wbGF5IGZpbGVuYW1lLm1wNC9tcDMvd2F2L29nZzogUGxheXMgdGhlIGdpdmVuIGZpbGUuXG4uY2FsYyA8ZXhwcmVzc2lvbj46IENhbGN1bGF0ZXMgdGhlIHJlc3VsdCBvZiBhIGV4cHJlc3Npb24gbG9jYWxseS5cbi5oZXggPGV4cHJlc3Npb24+OiBEaXNwbGF5cyB0aGUgaGV4YWRlY2ltYWwgdmVyc2lvbiBvZiB0aGUgZXhwcmVzc2lvbi5cbi5iaW4gPGV4cHJlc3Npb24+OiBEaXNwbGF5cyB0aGUgYmluYXJ5IHZlcnNpb24gb2YgdGhlIGV4cHJlc3Npb24uXG4ucnVuIDxhcHBsaWNhdGlvbj46IExhdW5jaCBhbiBBT1ogQXBwbGljYXRpb24vYWNjZXNzb3J5IGluIHRoZSBBT1ogVmlld2VyLlxuLmZpbmQgPGZpbGVfbmFtZT46IExvY2F0ZSBhIGZpbGUgaW4gdGhlIE1hZ2ljIERyaXZlIGFuZCBkaXNwbGF5IGl0cyBwYXRoXG4uaW1wb3J0IDxmaWxlX25hbWU+OiBTYW1lIGFzIGFib3ZlIGFuZCBhZGRzIHRoZSBmaWxlIGluIHRoZSByZXNvdXJjZSBmb2xkZXIuXG4uY29kZSA8ZGVzY3JpcHRpb24+OiBDcmVhdGVzIGEgcHJvY2VkdXJlIGZyb20gdGhlIGluc3RydWN0aW9ucy5cbi5pbWFnZSA8ZGVzY3JpcHRpb24+OiBDcmVhdGVzIGFuIGltYWdlIGZyb20gdGhlIGRlc2NyaXB0aW9uLlxuLmRhdGEgPHF1ZXJ5PjogQ3JlYXRlIERhdGEgc2VnbWVudHMgd2l0aCB0aGUgcmVzdWx0IG9mIHRoZSBxdWVyeS5cbi5hcnJheSA8cXVlcnk+OiBDcmVhdGVzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIGVsZW1lbnRzIGZyb20gdGhlIHF1ZXJ5LlxuLnByb21wdCA8ZnV6enkgcHJvbXB0PjogUmVmaW5lcyBhIHByb21wdCBieSBhc2tpbmcgdGhlIEFJIHRoZSBiZXN0IHByb21wdC5cbi5oZWxwIGRpc3BsYXlzIHRoYXQgaGVscCAob3IgYW4gZW1wdHkgcHJvbXB0KS5cbmAgXHRcdFx0XHR9XG5cdFx0XVxuXHR9XG5cdGFzeW5jIHBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0YXdhaXQgc3VwZXIucGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdHZhciB0ZXh0ID0gdGhpcy5maW5kRWRpdGFibGUoIHBhcmFtZXRlcnMuaW5wdXQgKTtcblx0XHRpZiAoICF0ZXh0IClcblx0XHRcdHRleHQgPSB0aGlzLmZpbmRFZGl0YWJsZSggJ3dlbGNvbWUnICk7XG5cdFx0dGV4dCA9IHRleHQuY29udGVudC5zcGxpdCggJ1xcclxcbicgKS5qb2luKCAnXFxuJyApLnNwbGl0KCAnXFxuJyApXG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgdGV4dCwgeyB1c2VyOiAnYXdpJyB9ICk7XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogdGV4dCB9O1xuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApO1xuXHR9XG5cdHRyYW5zcGlsZSggbGluZSwgZGF0YSwgY29udHJvbCApXG5cdHtcblx0XHRzdXBlci50cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQnViYmxlID0gQnViYmxlR2VuZXJpY0hlbHA7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1idWJibGUtZ2VuZXJpYy1oZXguanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IEhleCBjb21tYW5kOiBjb252ZXJ0IHRvIGhleGFkZWNpbWFsXG4qXG4qL1xudmFyIGF3aWJ1YmJsZSA9IHJlcXVpcmUoICcuLi9hd2ktYnViYmxlJyApXG5cbmNsYXNzIEJ1YmJsZUdlbmVyaWNIZXggZXh0ZW5kcyBhd2lidWJibGUuQnViYmxlXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zIClcblx0XHR0aGlzLm5hbWUgPSAnSGV4Jztcblx0XHR0aGlzLnRva2VuID0gJ2hleCc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICdjb252ZXJ0cyBhbiBleHByZXNzaW9uIHRvIGEgaGV4YWRlY2ltYWwgbnVtYmVyJztcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gWyB7IGV2YWx1YXRpb246ICd0aGUgZXhwcmVzc2lvbiB0byBjb252ZXJ0IHRvIGhleGFkZWNpbWFsJywgdHlwZTogJ3N0cmluZycgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzID0gWyB7IGhleFZhbHVlOiAndGhlIGV4cHJlc3Npb24gY29udmVydGVkIHRvIGhleGFkZWNpbWFsJywgdHlwZTogJ251bWJlcicgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy5wYXJzZXIgPSB7XG5cdFx0XHR2ZXJiOiBbICdjb252ZXJ0JywgJ3RyYW5zZm9ybScsICdjYWxjdWxhdGUnIF0sXG5cdFx0XHRhZGplY3RpdmU6IFsgJ2hleGFkZWNpbWFsJywgJ2hleGEnIF0sXG5cdFx0XHRxdWVzdGlvbldvcmQ6IFsgJ3doYXQnIF0sXG5cdFx0XHRldmFsdWF0aW9uOiBbICdudW1lcmljJyBdIH07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnNlbGVjdCA9IFsgWyAndmVyYicsICdhZGplY3RpdmUnIF0sIFsgJ3F1ZXN0aW9uV29yZCcsICdhZGplY3RpdmUnIF0gXTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdGF3YWl0IHN1cGVyLnBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kubGFuZ3VhZ2UuZG9FdmFsKCAnJyArIHBhcmFtZXRlcnMuZXZhbHVhdGlvbiwge30gKTtcblx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHR7XG5cdFx0XHR2YXIgcmVzdWx0ID0gJyQnICsgdGhpcy5hd2kudXRpbGl0aWVzLnRvSGV4KCBhbnN3ZXIuZGF0YSwgOCApO1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgWyByZXN1bHQgXSwgeyB1c2VyOiAncmVzdWx0JyB9ICk7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXN1bHQgfTtcblx0XHR9XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgWyBhbnN3ZXIuZXJyb3IgXSwgeyB1c2VyOiAnYXdpJyB9ICk7XG5cdFx0cmV0dXJuIGFuc3dlcjtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sIClcblx0e1xuXHRcdHN1cGVyLnBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZUdlbmVyaWNIZXg7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1idWJibGUtZ2VuZXJpYy1pbXBvcnQuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IEltcG9ydCBjb21tYW5kOiBpbXBvcnQgYSBmaWxlIGluIHRoZSBjdXJyZW50IHByb2plY3QgdGhyb3VnaCB0aGUgY3VycmVudCBlZGl0b3IgY29ubmVjdG9yXG4qXG4qL1xudmFyIGF3aWJ1YmJsZSA9IHJlcXVpcmUoICcuLi9hd2ktYnViYmxlJyApO1xuXG5jbGFzcyBCdWJibGVHZW5lcmljSW1wb3J0IGV4dGVuZHMgYXdpYnViYmxlLkJ1YmJsZVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdJbXBvcnQnO1xuXHRcdHRoaXMudG9rZW4gPSAnaW1wb3J0Jztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLnByb3BlcnRpZXMuYWN0aW9uID0gJ2ltcG9ydCBhc3NldHMgaW4gdGhlIGRlc2lnbmF0ZWQgZm9sZGVyIG9mIHRoZSBhcHBsaWNhdGlvbic7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFsgeyBmaWxlOiAndGhlIG5hbWUgb3IgbnVtYmVyIG9mIHRoZSBhc3NldCB0byBpbXBvcnQnLCB0eXBlOiAnc3RyaW5nJyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbIHsgaW1wb3J0ZWRQYXRoOiAndGhlIHBhdGggdG8gdGhlIGFzc2V0JywgdHlwZTogJ3BhdGgnIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gW1xuXHRcdFx0eyBmaWxlOiAndGhlIGZpbGUgdG8gaW1wb3J0JywgdHlwZTogJ3N0cmluZycgfSxcblx0XHRcdHsgZGF0ZTogJ3RoZSBkYXRlIHdoZW4gdGhlIGZpbGUgd2FzIGNyZWF0ZWQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdHsgdGltZTogJ3RoZSB0aW1lIHdoZW4gdGhlIGZpbGUgd2FzIGNyZWF0ZWQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdHsgaW5wdXQ6ICdkZXNjcmlwdGlvbiBvZiB0aGUgY29udGVudCB0byBzZWFyY2ggZm9yJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlIH0sXG5cdFx0XHRdO1xuXHRcdHRoaXMucHJvcGVydGllcy5wYXJzZXIgPSB7XG5cdFx0XHR2ZXJiOiBbIHRoaXMubmFtZSBdLCBmaWxlOiBbXSwgZGF0ZTogW10sIHRpbWU6IFtdLCBpbnB1dDogW10gfTtcblx0XHR0aGlzLnByb3BlcnRpZXMuc2VsZWN0ID0gWyBbICd2ZXJiJyBdIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdGFzeW5jIGZ1bmN0aW9uIGltcG9ydEZpbGUoIHBhdGggKVxuXHRcdHtcblx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCBzZWxmLmF3aS5sYW5ndWFnZS5pbXBvcnQoIHBhdGggKTtcblx0XHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0XHRzZWxmLmF3aS5lZGl0b3IucHJpbnQoIHRoaXMsIFsgJ0ZpbGUgc3VjY2Vzc2Z1bGx5IGltcG9ydGVkIHRvOiAnICsgcGF0aCBdLCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRzZWxmLmF3aS5lZGl0b3IucHJpbnQoIHRoaXMsIFsgJ0Nhbm5vdCBpbXBvcnQgZmlsZSA6ICcgKyBwYXRoIF0sIHsgdXNlcjogJ2Vycm9yJyB9ICk7XG5cdFx0XHRyZXR1cm4gYW5zd2VyO1xuXHRcdH1cblx0XHRpZiAoIC9eXFxkKyQvLnRlc3QoIHBhcmFtZXRlcnMudXNlcklucHV0ICkgKVxuXHRcdHtcblx0XHRcdHZhciBmaWxlTGlzdCA9IHRoaXMuYnJhbmNoLmdldExhc3REYXRhKCB0aGlzLCAnZmlsZUxpc3QnICk7XG5cdFx0XHRpZiAoIGZpbGVMaXN0ICYmIGZpbGVMaXN0Lmxlbmd0aCA+IDAgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgbnVtYmVyID0gcGFyc2VJbnQoIHBhcmFtZXRlcnMudXNlcklucHV0ICkgLSAxO1xuXHRcdFx0XHRpZiAoIG51bWJlciA+PSAwICYmIG51bWJlciA8IGZpbGVMaXN0Lmxlbmd0aCApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgcGF0aCA9IGZpbGVMaXN0WyBudW1iZXIgXS5wYXRoO1xuXHRcdFx0XHRcdHJldHVybiBhd2FpdCBpbXBvcnRGaWxlKCBwYXRoICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnYXdpOmNhbmNlbGxlZDppd2EnIH07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6bm8tZmlsZS1saXN0LWZvdW5kOml3YScgfTtcblx0XHR9XG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLmxhbmd1YWdlLmdldEltcG9ydFBhdGhzKCk7XG5cdFx0dmFyIGltcG9ydFBhdGhzID0gYW5zd2VyLmRhdGE7XG5cdFx0YW5zd2VyID0gYXdhaXQgdGhpcy5hd2kuc3lzdGVtLmZpbmRGaWxlKCBpbXBvcnRQYXRocy50b1NjYW4sIHBhcmFtZXRlcnMudXNlcklucHV0LCB7IGZpbHRlcnM6IFsgJyouKicgXSB9ICk7XG5cdFx0dmFyIGZpbGVzID0gdGhpcy5hd2kudXRpbGl0aWVzLnJlbW92ZUR1cGxpY2F0ZXNGcm9tRmlsZXMoIGFuc3dlci5kYXRhICk7XG5cdFx0aWYgKCBmaWxlcy5sZW5ndGggPT0gMCApXG5cdFx0e1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgWyAnTm8gYXNzZXQgZm91bmQgd2l0aCB0aGF0IG5hbWUuLi4nIF0sIHsgdXNlcjogJ2luZm9ybWF0aW9uJyB9ICk7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6bm8tZmlsZS1saXN0LWZvdW5kOml3YScgfTtcblx0XHR9XG5cdFx0aWYgKCBmaWxlcy5sZW5ndGggPT0gMSApXG5cdFx0XHRyZXR1cm4gYXdhaXQgaW1wb3J0RmlsZSggZmlsZXNbIDAgXS5wYXRoICk7XG5cdFx0dmFyIHJlc3VsdCA9IFtdO1xuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIFsgJ0kgaGF2ZSBmb3VuZCB0aGVzZSBhc3NldHM6JyBdLCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdGZvciAoIHZhciBsID0gMDsgbCA8IGZpbGVzLmxlbmd0aDsgbCsrIClcblx0XHRcdHJlc3VsdC5wdXNoKCAoIGwgKyAxICkgKyAnLiAnICsgZmlsZXNbIGwgXS5uYW1lICk7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgcmVzdWx0LCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdHZhciBwYXJhbSA9IGF3YWl0IHRoaXMuYXdpLnByb21wdC5nZXRQYXJhbWV0ZXJzKCBbIHtcblx0XHRcdHRva2VuOiAnaW5wdXQnLFxuXHRcdFx0Y2xhc3NuYW1lOiAnZ2VuZXJpYycsXG5cdFx0XHRwYXJhbWV0ZXJzOiBbIHsgbmFtZTogJ2Nob2ljZScsXHRkZXNjcmlwdGlvbjogJ1BsZWFzZSBlbnRlciBhIG51bWJlciBiZXR3ZWVuIDEgYW5kICcgKyBmaWxlcy5sZW5ndGgsIHR5cGU6ICdudW1iZXInLFx0aW50ZXJ2YWw6IFsgMSwgZmlsZXMubGVuZ3RoIF0gfSBdLFxuXHRcdFx0b3B0aW9uczogeyB9XG5cdFx0fSBdLCBjb250cm9sICk7XG5cdFx0aWYgKCBwYXJhbS5zdWNjZXNzIClcblx0XHRcdHJldHVybiBhd2FpdCBpbXBvcnRGaWxlKCBmaWxlc1sgcGFyYW0uZGF0YS51c2VySW5wdXQgLSAxIF0ucGF0aCApO1xuXHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2F3aTpjYW5jZWxsZWQ6aXdhJywgZGF0YToge30gfTtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZUdlbmVyaWNJbXBvcnQ7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1idWJibGUtZ2VuZXJpYy1pbnB1dC5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgSW5wdXQgY29tbWFuZDogaW5wdXQgbWlzc2luZyBwYXJhbWV0ZXJzXG4qXG4qL1xudmFyIGF3aWJ1YmJsZSA9IHJlcXVpcmUoICcuLi9hd2ktYnViYmxlJyApXG5cbmNsYXNzIEJ1YmJsZUdlbmVyaWNJbnB1dCBleHRlbmRzIGF3aWJ1YmJsZS5CdWJibGVcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLm5hbWUgPSAnSW5wdXQnO1xuXHRcdHRoaXMudG9rZW4gPSAnaW5wdXQnO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAnYXNrIHRoZSB1c2VyIGZvciBpbnB1dCc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFsgeyBpbnB1dEluZm86ICdpbmZvcm1hdGlvbiBvbiB0aGUgZGF0YSB0byBpbnB1dCcsIHR5cGU6ICdhcnJheScgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzID0gW107XG5cdH1cblx0Lypcblx0YXN5bmMgZ2V0UGFyYW1ldGVycyggcGFyYW1ldGVycywgZGF0YSwgY29udHJvbCA9IHt9IClcblx0e1xuXHRcdHZhciBkYXRhID0ge307XG5cdFx0Zm9yICggdmFyIHAgPSAwIDsgcCA8IHBhcmFtZXRlcnMubGVuZ3RoOyBwKysgKVxuXHRcdHtcblx0XHRcdHZhciBidWJibGUgPSB0aGlzLmJ1YmwubmV3QnViYmxlKCB7IHRva2VuOiAnaW5wdXQnLCBjbGFzc25hbWU6ICdnZW5lcmljJywgcGFyYW1ldGVyczoge30gfSwgW10sIGNvbnRyb2wgKTtcblx0XHRcdHZhciBwYXJhbWV0ZXIgPSB7IGlucHV0SW5mbzogdGhpcy5hd2kudXRpbGl0aWVzLmdldEJ1YmJsZVBhcmFtcyggcGFyYW1ldGVyc1sgcCBdICkgfTtcblx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCBidWJibGUucGxheSggJycsIHBhcmFtZXRlciwgY29udHJvbCApO1xuXHRcdFx0aWYgKCAhYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0XHRyZXR1cm4gYW5zd2VyO1xuXHRcdH1cblx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBkYXRhIH07XG5cdH1cblx0Ki9cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0aWYgKCAhcGFyYW1ldGVycy5pbnB1dEluZm8gKVxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnYXdpOmNhbmNlbGxlZDppd2EnIH07XG5cblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIHJlc3VsdDtcblx0XHR2YXIgZmlyc3RSZXN1bHQ7XG5cdFx0dmFyIGZpcnN0VHlwZSA9ICcnO1xuXHRcdHZhciB0eXBlID0gcGFyYW1ldGVycy5pbnB1dEluZm8udHlwZTtcblx0XHR2YXIgZG90ID0gdHlwZS5pbmRleE9mKCAnLicgKTtcblx0XHRpZiAoIGRvdCA+IDAgKVxuXHRcdHtcblx0XHRcdGZpcnN0VHlwZSA9IHR5cGUuc3Vic3RyaW5nKCAwLCBkb3QgKTtcblx0XHRcdHR5cGUgPSB0eXBlLnN1YnN0cmluZyggZG90ICsgMSApO1xuXHRcdFx0aWYgKCBmaXJzdFR5cGUgPT0gJ2FycmF5JyApXG5cdFx0XHRcdGZpcnN0UmVzdWx0ID0gW107XG5cdFx0fVxuXG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHNbIDAgXSA9IHt9O1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzWyAwIF1bIHBhcmFtZXRlcnMuaW5wdXRJbmZvLm5hbWUgXSA9IGRlc2NyaXB0aW9uO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzWyAwIF0udHlwZSA9IHBhcmFtZXRlcnMuaW5wdXRJbmZvLnR5cGU7XG5cdFx0dmFyIHRleHQ7XG5cdFx0dmFyIGRlc2NyaXB0aW9uID0gcGFyYW1ldGVycy5pbnB1dEluZm8uZGVzY3JpcHRpb247XG5cdFx0c3dpdGNoICggZmlyc3RUeXBlIClcblx0XHR7XG5cdFx0XHRjYXNlICdhcnJheSc6XG5cdFx0XHRcdHRleHQgPSAnXFxuUGxlYXNlIGVudGVyLCBsaW5lIGJ5IGxpbmUsICcgKyBkZXNjcmlwdGlvbiArICcuXFxuUHJlc3MgPHJldHVybj4gdG8gZXhpdC4uLicsIHsgdXNlcjogJ2F3aScgfTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdjaG9pY2VzJzpcblx0XHRcdFx0dGV4dCA9ICdcXG4nICsgZGVzY3JpcHRpb24gKyAnXFxuJztcblx0XHRcdFx0Zm9yICggdmFyIGMgPSAwOyBjIDwgcGFyYW1ldGVycy5pbnB1dEluZm8uY2hvaWNlcy5sZW5ndGg7IGMrKyApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR2YXIgdCA9IHBhcmFtZXRlcnMuaW5wdXRJbmZvLmNob2ljZXNbIGMgXTtcblx0XHRcdFx0XHRpZiAoIHQgPT0gcGFyYW1ldGVycy5pbnB1dEluZm8uZGVmYXVsdCApXG5cdFx0XHRcdFx0XHR0ICs9ICcgKGRlZmF1bHQpJztcblx0XHRcdFx0XHR0ZXh0ICs9ICcgJyArICggYyArIDEgKSArICcuICcgKyB0ICsgJ1xcbic7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGV4dCArPSAnT3IgcHJlc3MgPHJldHVybj4gZm9yIGRlZmF1bHQuJztcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd5ZXNubyc6XG5cdFx0XHRcdHRleHQgPSAnXFxuJyArIGRlc2NyaXB0aW9uO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHRleHQgPSAnXFxuUGxlYXNlIGVudGVyICcgKyBkZXNjcmlwdGlvblxuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgdGV4dC5zcGxpdCggJ1xcbicgKSwgeyB1c2VyOiAncXVlc3Rpb24nIH0gKTtcblxuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgZmluaXNoZWQgPSBmYWxzZTtcblx0XHR0aGlzLmF3aS5lZGl0b3IucmVyb3V0ZUlucHV0KCBjb250cm9sLmVkaXRvcixcblx0XHRcdGZ1bmN0aW9uKCBsaW5lIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIHN0YXJ0ID0gMDtcblx0XHRcdFx0dmFyIGMgPSBzZWxmLmF3aS51dGlsaXRpZXMuZ2V0Q2hhcmFjdGVyVHlwZSggbGluZS5jaGFyQXQoIHN0YXJ0ICkgKTtcblx0XHRcdFx0d2hpbGUoIGMgIT0gJ2xldHRlcicgJiYgYyAhPSAnbnVtYmVyJyAmJiBzdGFydCA8IGxpbmUubGVuZ3RoIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHN0YXJ0Kys7XG5cdFx0XHRcdFx0YyA9IHNlbGYuYXdpLnV0aWxpdGllcy5nZXRDaGFyYWN0ZXJUeXBlKCBsaW5lLmNoYXJBdCggc3RhcnQgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxpbmUgPSBsaW5lLnN1YnN0cmluZyggc3RhcnQgKTtcblx0XHRcdFx0aWYgKCBsaW5lID09ICcnIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHJlc3VsdCA9ICc8X19fY2FuY2VsX19fPic7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCB0eXBlID09ICdudW1iZXInIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR2YXIgbnVtYmVyID0gcGFyc2VJbnQoIGxpbmUgKTtcblx0XHRcdFx0XHRcdGlmICggIWlzTmFOKCBudW1iZXIgKSApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHZhciBpbnRlcnZhbCA9IHBhcmFtZXRlcnMuaW5wdXRJbmZvLmludGVydmFsO1xuXHRcdFx0XHRcdFx0XHRpZiAoIGludGVydmFsIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdGlmICggbnVtYmVyIDwgaW50ZXJ2YWwuc3RhcnQgfHwgbnVtYmVyIDwgaW50ZXJ2YWwuZW5kIClcblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRzZWxmLmF3aS5lZGl0b3IucHJpbnQoIHRoaXMsIFsgJ1BsZWFzZSBlbnRlciBhIG51bWJlciBiZXR3ZWVuICcgKyBpbnRlcnZhbC5zdGFydCArICcgYW5kICcgKyBpbnRlcnZhbC5lbmQgKyAnLi4uJyBdLCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRyZXN1bHQgPSBudW1iZXI7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZXN1bHQgPSBsaW5lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIHJlc3VsdCAhPSAnPF9fX2NhbmNlbF9fXz4nIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBwcm9tcHQgPSBzZWxmLmF3aS5jb25maWcuZ2V0UHJvbXB0KCAncXVlc3Rpb24nICk7XG5cdFx0XHRcdFx0c3dpdGNoICggZmlyc3RUeXBlIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjYXNlICdhcnJheSc6XG5cdFx0XHRcdFx0XHRcdHZhciBkb3QgPSByZXN1bHQuaW5kZXhPZiggJy4nICk7XG5cdFx0XHRcdFx0XHRcdGlmICggZG90ID49IDAgJiYgZG90IDwgOCApXG5cdFx0XHRcdFx0XHRcdFx0cmVzdWx0ID0gcmVzdWx0LnN1YnN0cmluZyggZG90ICsgMSApLnRyaW0oKTtcblx0XHRcdFx0XHRcdFx0aWYgKCByZXN1bHQubGVuZ3RoID09ICcnIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHJlc3VsdCA9IGZpcnN0UmVzdWx0O1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGZpcnN0UmVzdWx0LnB1c2goIHJlc3VsdCApO1xuXHRcdFx0XHRcdFx0XHRzZWxmLmF3aS5lZGl0b3Iud2FpdEZvcklucHV0KCBjb250cm9sLmVkaXRvciwgeyBmb3JjZTogdHJ1ZSB9ICk7XG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdGNhc2UgJ2Nob2ljZXMnOlxuXHRcdFx0XHRcdFx0XHRyZXN1bHQgPSBwYXJzZUludCggcmVzdWx0ICk7XG5cdFx0XHRcdFx0XHRcdHZhciBmb3VuZDtcblx0XHRcdFx0XHRcdFx0aWYgKCAhaXNOYU4oIHJlc3VsdCApICYmIHJlc3VsdCA+PSAwICYmIHJlc3VsdCA8PSBwYXJhbWV0ZXJzLmlucHV0SW5mby5jaG9pY2VzLmxlbmd0aCApXG5cdFx0XHRcdFx0XHRcdFx0Zm91bmQgPSBwYXJhbWV0ZXJzLmlucHV0SW5mby5jaG9pY2VzWyByZXN1bHQgLSAxIF07XG5cdFx0XHRcdFx0XHRcdGlmICggIWZvdW5kIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHRleHQucHVzaCggICsgcGFyYW1ldGVycy5pbnB1dEluZm8uZGVmYXVsdCArICcuJyApO1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuYXdpLmVkaXRvci5wcmludCggdGhpcywgJ1BsZWFzZSBlbnRlciBhIG51bWJlciBiZXR3ZWVuIDEgYW5kICcgKyBwYXJhbWV0ZXJzLmlucHV0SW5mby5jaG9pY2VzLmxlbmd0aCwgeyB1c2VyOiAnYXdpJyB9ICk7XG5cdFx0XHRcdFx0XHRcdFx0c2VsZi5hd2kuZWRpdG9yLndhaXRGb3JJbnB1dCggY29udHJvbC5lZGl0b3IsIHsgZm9yY2U6IHRydWUgfSApO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRyZXN1bHQgPSBmb3VuZDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2UgJ3llc25vJzpcblx0XHRcdFx0XHRcdFx0aWYgKCByZXN1bHQgPT0gJzxfX19jYW5jZWxfX18+JyApXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRyZXN1bHQgPSBwYXJhbWV0ZXJzLmlucHV0SW5mby5kZWZhdWx0O1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdGlmICggcmVzdWx0LmNoYXJBdCggMCApLnRvTG93ZXJDYXNlKCkgPT0gJ3knIClcblx0XHRcdFx0XHRcdFx0XHRcdHJlc3VsdCA9ICd5ZXMnO1xuXHRcdFx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0LnB1c2goICdQbGVhc2UgYW5zd2VyIHllcyBvciBuby4uLicgKTtcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYuYXdpLmVkaXRvci5wcmludCggdGhpcywgdGV4dCwgeyB1c2VyOiAnYXdpJyB9ICk7XG5cdFx0XHRcdFx0XHRcdFx0XHRzZWxmLmF3aS5lZGl0b3Iud2FpdEZvcklucHV0KCBjb250cm9sLmVkaXRvciwgeyBmb3JjZTogdHJ1ZSB9ICk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRzd2l0Y2ggKCBmaXJzdFR5cGUgKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNhc2UgJ2FycmF5Jzpcblx0XHRcdFx0XHRcdFx0cmVzdWx0ID0gZmlyc3RSZXN1bHQ7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSAnY2hvaWNlcyc6XG5cdFx0XHRcdFx0XHRjYXNlICd5ZXNubyc6XG5cdFx0XHRcdFx0XHRcdHJlc3VsdCA9IHBhcmFtZXRlcnMuaW5wdXRJbmZvLmRlZmF1bHQ7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRzZWxmLmF3aS5lZGl0b3IucmVyb3V0ZUlucHV0KCBjb250cm9sLmVkaXRvciApO1xuXHRcdFx0XHRmaW5pc2hlZCA9IHRydWU7XG5cdFx0XHR9ICk7XG5cblx0XHQvLyBXYWl0IGZvciBpbnB1dFxuXHRcdHZhciBwcm9tcHQgPSB0aGlzLmF3aS5jb25maWcuZ2V0UHJvbXB0KCAncXVlc3Rpb24nICk7XG5cdFx0aWYgKCBmaXJzdFR5cGUgPT0gJ2FycmF5JyApXG5cdFx0XHRwcm9tcHQgKz0gJzEuICc7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLndhaXRGb3JJbnB1dCggY29udHJvbC5lZGl0b3IgKTtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoICggcmVzb2x2ZSApID0+XG5cdFx0e1xuXHRcdFx0Y29uc3QgY2hlY2tQYXVzZWQgPSAoKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgaGFuZGxlID0gc2V0SW50ZXJ2YWwoXG5cdFx0XHRcdFx0ZnVuY3Rpb24oKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmICggZmluaXNoZWQgKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRjbGVhckludGVydmFsKCBoYW5kbGUgKTtcblx0XHRcdFx0XHRcdFx0aWYgKCByZXN1bHQgPT0gJzxfX19jYW5jZWxfX18+JyApXG5cdFx0XHRcdFx0XHRcdFx0cmVzb2x2ZSggeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6Y2FuY2VsbGVkOml3YScgfSApO1xuXHRcdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0XHRcdFx0XHRcdGRhdGFbIHBhcmFtZXRlcnMuaW5wdXRJbmZvLm5hbWUgXSA9IHJlc3VsdDtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLnByb3BlcnRpZXMub3V0cHV0cyA9IFsge30gXTtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLnByb3BlcnRpZXMub3V0cHV0c1sgMCBdLm5hbWUgPSBwYXJhbWV0ZXJzLmlucHV0SW5mby5uYW1lO1xuXHRcdFx0XHRcdFx0XHRcdHJlc29sdmUoIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogZGF0YSB9ICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9ICk7XG5cdFx0XHR9O1xuXHRcdFx0Y2hlY2tQYXVzZWQoKTtcblx0XHR9ICk7XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLnBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sIClcblx0e1xuXHRcdHN1cGVyLnRyYW5zcGlsZSggbGluZSwgZGF0YSwgY29udHJvbCApO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5CdWJibGUgPSBCdWJibGVHZW5lcmljSW5wdXQ7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1idWJibGUtZ2VuZXJpYy1maW5kLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBGaW5kIGNvbW1hbmQ6IGZpbmQgZmlsZXMgaW4gdGhlIHJlZ2lzdGVyZWQgdXNlcnMgZGlyZWN0b3JpZXNcbipcbiovXG52YXIgYXdpYnViYmxlID0gcmVxdWlyZSggJy4uL2F3aS1idWJibGUnIClcblxuY2xhc3MgQnViYmxlR2VuZXJpY0xpc3QgZXh0ZW5kcyBhd2lidWJibGUuQnViYmxlXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ0xpc3QnO1xuXHRcdHRoaXMudG9rZW4gPSAnbGlzdCc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICdsaXN0IGZpbGVzIGluIHRoZSByZWdpc3RlcmVkIHVzZXIgZGlyZWN0b3JpZXMgb3IgYW55IGRpcmVjdG9yeSc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFtcblx0XHRcdHsgZmlsZTogJ3RoZSBmaWxlKHMpIHRvIGZpbmQnLCB0eXBlOiAnc3RyaW5nJyB9LFxuXHRcdFx0eyBkYXRlOiAndGhlIGRhdGUgd2hlbiB0aGUgZmlsZSB3YXMgY3JlYXRlZCcsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSB9LFxuXHRcdFx0eyB0aW1lOiAndGhlIHRpbWUgd2hlbiB0aGUgZmlsZSB3YXMgY3JlYXRlZCcsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSB9LFxuXHRcdFx0eyBpbnB1dDogJ2Rlc2NyaXB0aW9uIG9mIHRoZSBjb250ZW50IHRvIHNlYXJjaCBmb3InLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbIHsgZmlsZXM6ICd0aGUgbGFzdCBsaXN0IG9mIGZpbGVzJywgdHlwZTogJ2ZpbGUuYXJyYXknIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMucGFyc2VyID0geyB2ZXJiOiBbICdsaXN0JyBdLCBmaWxlOiBbXSxcdGRhdGU6IFtdLCB0aW1lOiBbXSwgaW5wdXQ6IFtdXHR9O1xuXHRcdHRoaXMucHJvcGVydGllcy5zZWxlY3QgPSBbIFsgJ3ZlcmInIF0gXTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdGF3YWl0IHN1cGVyLnBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kuc3lzdGVtLmZpbmRGaWxlcyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdGlmICggIWFuc3dlci5zdWNjZXNzIClcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2F3aTpub3QtZm91bmQ6aXdhJyB9O1xuXG5cdFx0dmFyIGZpbGVzID0gYW5zd2VyLmRhdGE7XG5cdFx0dmFyIHJlc3VsdCA9IFtdO1xuXHRcdGZvciAoIHZhciBmID0gMDsgZiA8IGFuc3dlci5kYXRhLmxlbmd0aDsgZisrIClcblx0XHRcdHJlc3VsdC5wdXNoKCAoIGYgKyAxICkgKyAnLiAnICsgYW5zd2VyLmRhdGFbIGYgXS5wYXRoICk7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgcmVzdWx0LCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgZmlsZXM6IGZpbGVzIH0gfTtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZUdlbmVyaWNMaXN0O1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktYnViYmxlLWdlbmVyaWMtc2F2ZWNvbmZpZy5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgUXVpdDogc2F2ZSBjb252ZXJzYXRpb25zIGFuZCBtZW1vcmllcyBhbmQgcXVpdHMgQXdpLlxuKlxuKi9cbnZhciBhd2lidWJibGUgPSByZXF1aXJlKCAnLi4vYXdpLWJ1YmJsZScgKVxuXG5jbGFzcyBCdWJibGVHZW5lcmljUXVpdCBleHRlbmRzIGF3aWJ1YmJsZS5CdWJibGVcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLm5hbWUgPSAnUXVpdCc7XG5cdFx0dGhpcy50b2tlbiA9ICdxdWl0Jztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLnByb3BlcnRpZXMuYWN0aW9uID0gJ3NhdmUgY29udmVyc2F0aW9ucyBhbmQgbWVtb3JpZXMgYW5kIHF1aXRzIEF3aSc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFsgXTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgXTtcblx0XHR0aGlzLnByb3BlcnRpZXMucGFyc2VyID0geyB2ZXJiOiBbICdxdWl0JywgJ2xlYXZlJywgJ2V4aXQnIF0gfTtcblx0XHR0aGlzLnByb3BlcnRpZXMuc2VsZWN0ID0gWyBbICd2ZXJiJyBdIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0YXdhaXQgdGhpcy5hd2kuY29uZmlnLnNhdmVDb25maWdzKCB0aGlzLmF3aS5jb25maWcudXNlciApO1xuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLmF3aS5zYXZlKCB0aGlzLmF3aS5jb25maWcudXNlciApO1xuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXG5cdFx0XHR0aGlzLmF3aS5zeXN0ZW0ucXVpdCgpO1xuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdDYW5ub3Qgc2F2ZSBtZW1vcmllcyBhbmQgY29udmVyc2F0aW9ucy4gUGxlYXNlIGNoZWNrIHlvdXIgc2V0dXAuJyApO1xuXHRcdHJldHVybiBhbnN3ZXI7XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLnBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sIClcblx0e1xuXHRcdHN1cGVyLnRyYW5zcGlsZSggbGluZSwgZGF0YSwgY29udHJvbCApO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5CdWJibGUgPSBCdWJibGVHZW5lcmljUXVpdDtcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgIFsgXFwgWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWxcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gIFtffCB8X10gXFwgICAgIEFzc2lzdGFudFxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLWJ1YmJsZS1nZW5lcmljLXJlbWVtYmVyLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBSZW1lbWJlciBjb21tYW5kOiBkaWcgYSBzcGVjaWZpYyB0b3BpZCBvdXQgb2YgdGhlIG1lbW9yeVxuKlxuKi9cbnZhciBhd2lidWJibGUgPSByZXF1aXJlKCAnLi4vYXdpLWJ1YmJsZScgKVxuXG5jbGFzcyBCdWJibGVHZW5lcmljUmVtZW1iZXIgZXh0ZW5kcyBhd2lidWJibGUuQnViYmxlXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ1JlbWVtYmVyIEFjdGlvbiBCdWJibGUnO1xuXHRcdHRoaXMudG9rZW4gPSAncmVtZW1iZXInO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAncmVjYWxsIGFsbCBtZW1vcmllcyBhYm91dCBhIHN1YmplY3QnO1xuXHRcdHRoaXMucHJvcGVydGllcy5pbnB1dHMgPSBbXG5cdFx0XHR7IHdoYXQ6ICd0aGUgc3ViamVjdCB0byByZW1lbWJlcicsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJ2FueScgfSxcblx0XHRcdHsgcGVyc29uOiAndGhlIG5hbWUgb2Ygc29tZW9uZSB0byByZW1lbWJlcicsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJ2FueScgfSxcblx0XHRcdHsgZGF0ZTogJ2ludGVydmFsIG9mIHRpbWUgdG8gY29uc2lkZXInLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUsIGRlZmF1bHQ6ICdhbnknIH0sXG5cdFx0XHR7IHNjYW5MZXZlbDogJ2RlcHRoIG9mIHRoZSBzZWFyY2gsIDE6IGRpcmVjdCBzb3V2ZW5pcnMgb25seSwgMjogaW5kaXJlY3Qgc291dmVuaXJzLCAzOiBkZWVwIHNlYXJjaCcsIHR5cGU6ICdudW1iZXInLCBpbnRlcnZhbDogeyBzdGFydDogMSwgZW5kOiAzIH0sIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiAnMicgfVx0XTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFtcblx0XHRcdHsgZGlyZWN0U291dmVuaXJzOiAndGhlIGRpcmVjdCBzb3V2ZW5pcnMgZm91bmQnLCB0eXBlOiAnc291dmVuaXJJbmZvLm9iamVjdC5hcnJheScgfSxcblx0XHRcdHsgaW5kaXJlY3RTb3V2ZW5pcnM6ICd0aGUgaW5kaXJlY3Qgc291dmVuaXJzIGZvdW5kJywgdHlwZTogJ3NvdXZlbmlySW5mby5vYmplY3QuYXJyYXknIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMucGFyc2VyID0ge1xuXHRcdFx0dmVyYjogWyAncmVtZW1iZXInLCAncmVjYWxsJywgJ3RoaW5rIGFib3V0JyBdLFxuXHRcdFx0d2hhdDogWyAnYXVkaW8nLCAndmlkZW8nLCAnbWVzc2VuZ2VyJyBdLFxuXHRcdFx0cGVyc29uOiBbXSwgZGF0ZTogW10sIHZhbHVlOiBbICdsZXZlbCcgXVxuXHRcdH1cblx0XHR0aGlzLnByb3BlcnRpZXMuc2VsZWN0ID0gWyBbICd2ZXJiJyBdIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0Y29udHJvbC5tZW1vcnkgPSB7XG5cdFx0XHRzY2FuTGV2ZWw6IHBhcmFtZXRlcnMuc2NhbkxldmVsXG5cdFx0fTtcblx0XHRwYXJhbWV0ZXJzLnNlbmRlck5hbWUgPSB0eXBlb2YgcGFyYW1ldGVycy5zZW5kZXJOYW1lID09ICd1bmRlZmluZWQnID8gdGhpcy5hd2kuY29uZmlnLmdldENvbmZpZyggJ3VzZXInICkuZnVsbE5hbWUgOiBwYXJhbWV0ZXJzLnNlbmRlck5hbWU7XG5cblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kucGVyc29uYWxpdHkucmVtZW1iZXIoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRpZiAoIGFuc3dlci5zdWNjZXNzID09ICdmb3VuZCcgKVxuXHRcdHtcblx0XHRcdGlmICggYW5zd2VyLmRhdGEuZGlyZWN0LnNvdXZlbmlycy5sZW5ndGggPiAwIClcblx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ0ZvdW5kICcgKyBhbnN3ZXIuZGF0YS5kaXJlY3Quc291dmVuaXJzLmxlbmd0aCArICcgZGlyZWN0IHNvdXZlbmlyKHMpLicsIHsgdXNlcjogJ2luZm9ybWF0aW9uJyB9ICk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdObyBkaXJlY3Qgc291dmVuaXIgZm91bmQuJywgeyB1c2VyOiAnaW5mb3JtYXRpb24nIH0gKTtcblxuXHRcdFx0aWYgKCAvKnBhcmFtZXRlcnMuc2NhbkxldmVsID4gMSAmJiovIGFuc3dlci5kYXRhLmluZGlyZWN0LnNvdXZlbmlycy5sZW5ndGggPiAwIClcblx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ0ZvdW5kICcgKyBhbnN3ZXIuZGF0YS5pbmRpcmVjdC5zb3V2ZW5pcnMubGVuZ3RoICsgJyBpbmRpcmVjdCBzb3V2ZW5pcihzKS4nLCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnTm8gaW5kaXJlY3Qgc291dmVuaXIgZm91bmQuJywgeyB1c2VyOiAnaW5mb3JtYXRpb24nIH0gKTtcblxuXHRcdFx0dGhpcy5hd2kucmVtZW1iZXIoIGxpbmUsIGFuc3dlci5kYXRhLmRpcmVjdCwgYW5zd2VyLmRhdGEuaW5kaXJlY3QgKTtcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6ICdzdWNjZXNzJywgZGF0YTogYW5zd2VyLmRhdGEgfVxuXHRcdH1cblx0XHRyZXR1cm4gYW5zd2VyO1xuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCBzdXBlci5wbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIHRyYW5zcGlsZSggbGluZSwgZGF0YSwgY29udHJvbCApXG5cdHtcblx0XHRzdXBlci50cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQnViYmxlID0gQnViYmxlR2VuZXJpY1JlbWVtYmVyO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktYnViYmxlLWdlbmVyaWMtZXJyb3IuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IEVycm9yIG1hbmFnZW1lbnQgYnViYmxlXG4qXG4qL1xudmFyIGF3aWJ1YmJsZSA9IHJlcXVpcmUoICcuLi9hd2ktYnViYmxlJyApO1xuXG5jbGFzcyBCdWJibGVHZW5lcmljUm9vdCBleHRlbmRzIGF3aWJ1YmJsZS5CdWJibGVcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLm5hbWUgPSAnUm9vdCc7XG5cdFx0dGhpcy50b2tlbiA9ICdyb290Jztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLnByb3BlcnRpZXMuYWN0aW9uID0gJ3Jvb3Qgb2YgYSBicmFuY2ggb2YgYnViYmxlcyc7XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIucGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCBzdXBlci5wbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIHRyYW5zcGlsZSggbGluZSwgZGF0YSwgY29udHJvbCApXG5cdHtcblx0XHRzdXBlci50cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQnViYmxlID0gQnViYmxlR2VuZXJpY1Jvb3Q7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1idWJibGUtZ2VuZXJpYy1ydW4uanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IFJ1biBjb21tYW5kOiBydW4gYW4gZXhlY3V0YWJsZSBpbiB0aGUgY3VycmVudCBzeXN0ZW0gY29ubmVjdG9yXG4qXG4qL1xudmFyIGF3aWJ1YmJsZSA9IHJlcXVpcmUoICcuLi9hd2ktYnViYmxlJyApXG5cbmNsYXNzIEJ1YmJsZUdlbmVyaWNSdW4gZXh0ZW5kcyBhd2lidWJibGUuQnViYmxlXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ1J1bic7XG5cdFx0dGhpcy50b2tlbiA9ICdydW4nO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAnbGF1bmNoIGFuIGFwcGxpY2F0aW9uJztcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gW1xuXHRcdFx0eyBmaWxlOiAndGhlIG5hbWUgb2YgdGhlIGFwcGxpY2F0aW9uIHRvIHJ1bicsIHR5cGU6ICdzdHJpbmcnIH0sXG5cdFx0XHR7IG5vdW46ICdpZiBhbiBhY2Nlc3NvcnknLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdHsgaW5wdXQ6ICdldmVudHVhbCBwYXJhbWV0ZXJzJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiAnJyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbIHsgZmlsZXM6ICd0aGUgbGFzdCBsaXN0IG9mIGZpbGVzJywgdHlwZTogJ3BhdGguc3RyaW5nLmFycmF5JyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0eyBmaWxlUmFuOiAndGhlIGxhc3QgZmlsZSB0byBiZSByYW4nLCB0eXBlOiAncGF0aCcgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy5wYXJzZXIgPSB7XG5cdFx0XHR2ZXJiOiBbICdydW4nLCAnbGF1bmNoJyBdLFxuXHRcdFx0bm91bjogWyAnYWNjZXNzb3J5JyBdLFxuXHRcdFx0ZmlsZTogWyAnYXBwbGljYXRpb24nIF0sXG5cdFx0XHRpbnB1dDogW11cblx0XHR9XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnNlbGVjdCA9IFsgWyAndmVyYicgXSBdO1xuXHR9XG5cdGFzeW5jIHBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdGFzeW5jIGZ1bmN0aW9uIHBsYXlJdCggZmlsZSwgZmlsZXMgKVxuXHRcdHtcblx0XHRcdHZhciBwbGF5ID0gYXdhaXQgc2VsZi5hd2kuc3lzdGVtLnBsYXlGaWxlKCBmaWxlLCAncnVuJywgY29udHJvbCApO1xuXHRcdFx0aWYgKCBwbGF5LnN1Y2Nlc3MgKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoIHR5cGVvZiBmaWxlcyAhPSAndW5kZWZpbmVkJyApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBmaWxlczogZmlsZXMsIGZpbGVSYW46IGZpbGUgfSB9O1xuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IGZpbGVSYW46IGZpbGUgfSB9O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGF3YWl0IHN1cGVyLnBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRpZiAoIC9eXFxkKyQvLnRlc3QoIGxpbmUgKSApXG5cdFx0e1xuXHRcdFx0dmFyIGZpbGVzID0gdGhpcy5icmFuY2guZ2V0TGFzdERhdGEoIHRoaXMsICdmaWxlcycgKTtcblx0XHRcdGlmICggZmlsZXMgJiYgZmlsZXMubGVuZ3RoID4gMCApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBudW1iZXIgPSBwYXJzZUludCggbGluZSApIC0gMTtcblx0XHRcdFx0aWYgKCBudW1iZXIgPj0gMCAmJiBudW1iZXIgPCBmaWxlcy5sZW5ndGggKVxuXHRcdFx0XHRcdHJldHVybiBhd2FpdCBwbGF5SXQoIGZpbGVzWyBudW1iZXIgXSApO1xuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6bm90LWZvdW5kOml3YScgfTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLnN5c3RlbS5maW5kRmlsZXMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRpZiAoICFhbnN3ZXIuc3VjY2VzcyApXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6bm90LWZvdW5kOml3YScgfTtcblxuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgPT09ICcxJyApXG5cdFx0XHRyZXR1cm4gYXdhaXQgcGxheUl0KCBhbnN3ZXIuZGF0YVsgMCBdLCBhbnN3ZXIuZGF0YSApO1xuXG5cdFx0dmFyIHJlc3VsdCA9IFtdO1xuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIFsgJ1lvdSBjYW4gZWRpdCB0aGVzZSBmaWxlczogJyBdLCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdGZvciAoIHZhciBmID0gMDsgZiA8IGFuc3dlci5kYXRhLmxlbmd0aDsgZisrIClcblx0XHRcdHJlc3VsdC5wdXNoKCAoIGYgKyAxICkgKyAnLiAnICsgYW5zd2VyLmRhdGFbIGYgXS5wYXRoICk7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgcmVzdWx0LCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdHZhciBwYXJhbSA9IGF3YWl0IHRoaXMuYXdpLnByb21wdC5nZXRQYXJhbWV0ZXJzKCBbXG5cdFx0XHR7IGNob2ljZTogJ1BsZWFzZSBlbnRlciBhIG51bWJlciBiZXR3ZWVuIDEgYW5kICcgKyBhbnN3ZXIuZGF0YS5sZW5ndGgsIHR5cGU6ICdudW1iZXInLCBpbnRlcnZhbDogWyAxLCBhbnN3ZXIuZGF0YS5sZW5ndGggXSwgb3B0aW9uYWw6IGZhbHNlLCBkZWZhdWx0OiAwIH0sXG5cdFx0XHRdLCBjb250cm9sICk7XG5cdFx0aWYgKCBwYXJhbS5zdWNjZXNzIClcblx0XHRcdHJldHVybiBhd2FpdCBwbGF5SXQoIGFuc3dlci5kYXRhWyBwYXJhbS5kYXRhLmNob2ljZSAtIDEgXSwgYW5zd2VyLmRhdGEgKTtcblx0XHRyZXR1cm4geyBhbnN3ZXI6IHRydWUsIGRhdGE6IHsgZmlsZXM6IGZpbGVzIH0gfTtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZUdlbmVyaWNSdW47XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1idWJibGUtZ2VuZXJpYy1zdG9wLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBTdG9wIGNvbW1hbmQ6IHN0b3AgYSBtZWRpYSBwbGF5aW5nIGluIHRoZSBjdXJyZW50IGVkaXRvclxuKlxuKi9cbnZhciBhd2lidWJibGUgPSByZXF1aXJlKCAnLi4vYXdpLWJ1YmJsZScgKTtcblxuY2xhc3MgQnViYmxlR2VuZXJpY1N0b3AgZXh0ZW5kcyBhd2lidWJibGUuQnViYmxlXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ1N0b3AnO1xuXHRcdHRoaXMudG9rZW4gPSAnc3RvcCc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICdzdG9wIGEgbWVkaWEgcGxheWluZyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFsgeyBub3VuOiAndGhlIG5hbWUgb2YgdGhlIGl0ZW0gdG8gc3RvcCcsIHR5cGU6ICdzdHJpbmcnIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBzdG9wQWN0aW9uOiAndGhlIG5hbWUgb2YgdGhlIGl0ZW0gdGhhdCB3YXMgc3RvcHBlZCcsIHR5cGU6ICdzdHJpbmcnIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMucGFyc2VyID0ge1xuXHRcdFx0dmVyYjogWyAnc3RvcCcsICdoYWx0JyBdLFxuXHRcdFx0bm91bjogWyAnbWltZXR5cGVzJyBdXG5cdFx0fVxuXHRcdHRoaXMucHJvcGVydGllcy5zZWxlY3QgPSBbIFsgJ3ZlcmInIF0gXTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdGF3YWl0IHN1cGVyLnBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRyZXR1cm4gYXdhaXQgdGhpcy5hd2kuZWRpdG9yLnN0b3AoIGNvbnRyb2wuZWRpdG9yLCBwYXJhbWV0ZXJzLm5vdW4gKTtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZUdlbmVyaWNTdG9wO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktYnViYmxlLWdlbmVyaWMtYmluLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBCaW4gY29tbWFuZDogY29udmVydCB0byBiaW5hcnlcbipcbiovXG52YXIgYXdpYnViYmxlID0gcmVxdWlyZSggJy4uL2F3aS1idWJibGUnIClcblxuY2xhc3MgQnViYmxlR2VuZXJpY1ZlcmJvc2UgZXh0ZW5kcyBhd2lidWJibGUuQnViYmxlXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ3ZlcmJvc2UnO1xuXHRcdHRoaXMudG9rZW4gPSAndmVyYm9zZSc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICdzZXRzIHRoZSBsZXZlbCBvZiB2ZXJib3NpdHkgb2YgYXdpJztcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gWyB7IGV2YWx1YXRpb246ICd0aGUgbGV2ZWwgb2YgdmVyYm9zaXR5LCBmcm9tIDEgdG8gMycsIHR5cGU6ICdudW1iZXInLCBpbnRlcnZhbDogeyBzdGFydDogMSwgZW5kOiAzIH0sIG9wdGlvbmFsOiBmYWxzZSB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbXTtcblx0XHR0aGlzLnByb3BlcnRpZXMucGFyc2VyID0ge1xuXHRcdFx0dmVyYjogWyAndmVyYm9zZScgXSxcblx0XHRcdGV2YWx1YXRpb246IFsgJ251bWVyaWMnIF1cblx0XHR9XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnNlbGVjdCA9IFsgWyAndmVyYicgXSBdO1xuXHR9XG5cdGFzeW5jIHBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0YXdhaXQgc3VwZXIucGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLmxhbmd1YWdlLmRvRXZhbCggJycgKyBwYXJhbWV0ZXJzLmV2YWx1YXRpb24sIHt9ICk7XG5cdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0e1xuXHRcdFx0dmFyIHZlcmJvc2UgPSBNYXRoLmZsb29yKCBhbnN3ZXIuZGF0YSApO1xuXHRcdFx0dmFyIG9sZFZlcmJvc2UgPSB0aGlzLmF3aS5nZXRDb25maWcoICd1c2VyJyApLnZlcmJvc2U7XG5cdFx0XHRpZiAoIHZlcmJvc2UgIT0gb2xkVmVyYm9zZSApXG5cdFx0XHR7XG5cdFx0XHRcdGlmICggdmVyYm9zZSA8PSBvbGRWZXJib3NlIClcblx0XHRcdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnT0sgSSB3aWxsIHRhbGsgbGVzcyBmcm9tIG5vdyBvbi4uLicsIHsgdXNlcjogJ3Jvb3QnIH0gKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdPSyBJIHdpbGwgdGFsayBtb3JlIGZyb20gbm93IG9uLi4uJywgeyB1c2VyOiAncm9vdCcgfSApO1xuXHRcdFx0XHR0aGlzLmF3aS5jb25maWcuc2V0VmVyYm9zZSggdmVyYm9zZSApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgWyBhbnN3ZXIuZXJyb3IgXSwgeyB1c2VyOiAnZXJyb3InIH0gKTtcblx0XHR9XG5cdFx0cmV0dXJuIGFuc3dlcjtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZUdlbmVyaWNWZXJib3NlO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19ffCAgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktYnViYmxlLWdlbmVyaWMtdmlldy5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgVmlldyBjb21tYW5kOiB2aWV3IGEgbWVkaWEgZmlsZSBpbiB0aGUgY3VycmVudCBlZGl0b3JcbipcbiovXG52YXIgYXdpYnViYmxlID0gcmVxdWlyZSggJy4uL2F3aS1idWJibGUnICk7XG5cbmNsYXNzIEJ1YmJsZUdlbmVyaWNWaWV3IGV4dGVuZHMgYXdpYnViYmxlLkJ1YmJsZVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdWaWV3Jztcblx0XHR0aGlzLnRva2VuID0gJ3ZpZXcnO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAnZGlzcGxheSB0aGUgY29udGVudCBvZiBhIGZpbGUnO1xuXHRcdHRoaXMucHJvcGVydGllcy5pbnB1dHMgPSBbXG5cdFx0XHR7IGZpbGU6ICd0aGUgZmlsZSB0byB2aWV3JywgdHlwZTogJ3N0cmluZycgfSxcblx0XHRcdHsgZGF0ZTogJ3RoZSBkYXRlIHdoZW4gdGhlIGZpbGUgd2FzIGNyZWF0ZWQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdHsgdGltZTogJ3RoZSB0aW1lIHdoZW4gdGhlIGZpbGUgd2FzIGNyZWF0ZWQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdHsgaW5wdXQ6ICdkZXNjcmlwdGlvbiBvZiB0aGUgY29udGVudCB0byBzZWFyY2ggZm9yJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlIH0sXG5cdFx0XHRdO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzID0gWyB7IGZpbGVzOiAndGhlIGxhc3QgbGlzdCBvZiBmaWxlcycsIHR5cGU6ICdmaWxlLmFycmF5JyB9LFxuXHRcdFx0XHRcdFx0XHRcdFx0eyBmaWxlVmlld2VkOiAndGhlIGxhc3QgZmlsZSB2aWV3ZWQnLCB0eXBlOiAnZmlsZScgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy5wYXJzZXIgPSB7XG5cdFx0XHR2ZXJiOiBbICd2aWV3JywgJ2Rpc3BsYXknLCAnc2hvdycgXSxcblx0XHRcdGZpbGU6IFtdLCBkYXRlOiBbXSwgdGltZTogW10sIGlucHV0OiBbXSB9O1xuXHRcdHRoaXMucHJvcGVydGllcy5zZWxlY3QgPSBbIFsgJ3ZlcmInIF0gXTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRhc3luYyBmdW5jdGlvbiBwbGF5SXQoIGZpbGUsIGZpbGVzIClcblx0XHR7XG5cdFx0XHR2YXIgcGxheSA9IGF3YWl0IHNlbGYuYXdpLnN5c3RlbS5wbGF5RmlsZSggZmlsZSwgJ3ZpZXcnLCBjb250cm9sICk7XG5cdFx0XHRpZiAoIHBsYXkuc3VjY2VzcyApXG5cdFx0XHR7XG5cdFx0XHRcdGlmICggdHlwZW9mIGZpbGVzICE9ICd1bmRlZmluZWQnIClcblx0XHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IGZpbGVzOiBmaWxlcywgZmlsZVZpZXdlZDogZmlsZSB9IH07XG5cdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgZmlsZVZpZXdlZDogZmlsZSB9IH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0YXdhaXQgc3VwZXIucGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdGlmICggL15cXGQrJC8udGVzdCggbGluZSApIClcblx0XHR7XG5cdFx0XHR2YXIgZmlsZXMgPSB0aGlzLmJyYW5jaC5nZXRMYXN0RGF0YSggdGhpcywgJ2ZpbGVzJyApO1xuXHRcdFx0aWYgKCBmaWxlcyAmJiBmaWxlcy5sZW5ndGggPiAwIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIG51bWJlciA9IHBhcnNlSW50KCBsaW5lICkgLSAxO1xuXHRcdFx0XHRpZiAoIG51bWJlciA+PSAwICYmIG51bWJlciA8IGZpbGVzLmxlbmd0aCApXG5cdFx0XHRcdFx0cmV0dXJuIGF3YWl0IHBsYXlJdCggZmlsZXNbIG51bWJlciBdICk7XG5cdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2F3aTpub3QtZm91bmQ6aXdhJyB9O1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kuc3lzdGVtLmZpbmRGaWxlcyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdGlmICggIWFuc3dlci5zdWNjZXNzIClcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2F3aTpub3QtZm91bmQ6aXdhJyB9O1xuXG5cdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyA9PT0gJzEnIClcblx0XHRcdHJldHVybiBhd2FpdCBwbGF5SXQoIGFuc3dlci5kYXRhWyAwIF0sIGFuc3dlci5kYXRhICk7XG5cblx0XHR2YXIgcmVzdWx0ID0gW107XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgWyAnWW91IGNhbiB2aWV3IHRoZXNlIGZpbGVzOiAnIF0sIHsgdXNlcjogJ2luZm9ybWF0aW9uJyB9ICk7XG5cdFx0Zm9yICggdmFyIGYgPSAwOyBmIDwgYW5zd2VyLmRhdGEubGVuZ3RoOyBmKysgKVxuXHRcdFx0cmVzdWx0LnB1c2goICggZiArIDEgKSArICcuICcgKyBhbnN3ZXIuZGF0YVsgZiBdLnBhdGggKTtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCByZXN1bHQsIHsgdXNlcjogJ2luZm9ybWF0aW9uJyB9ICk7XG5cdFx0dmFyIHBhcmFtID0gYXdhaXQgdGhpcy5hd2kucHJvbXB0LmdldFBhcmFtZXRlcnMoIFtcblx0XHRcdHsgY2hvaWNlOiAnUGxlYXNlIGVudGVyIGEgbnVtYmVyIGJldHdlZW4gMSBhbmQgJyArIGFuc3dlci5kYXRhLmxlbmd0aCwgdHlwZTogJ251bWJlcicsIGludGVydmFsOiBbIDEsIGFuc3dlci5kYXRhLmxlbmd0aCBdLCBvcHRpb25hbDogZmFsc2UsIGRlZmF1bHQ6IDAgfSxcblx0XHRcdF0sIGNvbnRyb2wgKTtcblx0XHRpZiAoIHBhcmFtLnN1Y2Nlc3MgKVxuXHRcdFx0cmV0dXJuIGF3YWl0IHBsYXlJdCggYW5zd2VyLmRhdGFbIHBhcmFtLmRhdGEuY2hvaWNlIC0gMSBdLCBhbnN3ZXIuZGF0YSApO1xuXHRcdHJldHVybiBhbnN3ZXI7XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLnBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sIClcblx0e1xuXHRcdHN1cGVyLnRyYW5zcGlsZSggbGluZSwgZGF0YSwgY29udHJvbCApO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5CdWJibGUgPSBCdWJibGVHZW5lcmljVmlldztcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgIFsgXFwgWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWxcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gIFtffCB8X10gXFwgICAgIEFzc2lzdGFudFxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLWJ1YmJsZS1nZW5lcmljLXdlbGNvbWUuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IFdlbGNvbWU6IGRpc3BsYXlzIHdlbGNvbWUgbWVzc2FnZSwgYWx3YXlzIGNhbGxlZCBmaXJzdC4gQ2FuIGRpc3BsYXkgbm90aGluZy5cbiogICAgICAgIENhbiBkaXNwbGF5IGFuaW1hdGlvbnMsIGNhbiBkZXBlbmQgb24gbW9vZC9uZXdzIGV0Yy5cbiovXG52YXIgYXdpYnViYmxlID0gcmVxdWlyZSggJy4uL2F3aS1idWJibGUnICk7XG5cbmNsYXNzIEJ1YmJsZUdlbmVyaWNXZWxjb21lIGV4dGVuZHMgYXdpYnViYmxlLkJ1YmJsZVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdXZWxjb21lJztcblx0XHR0aGlzLnRva2VuID0gJ3dlbGNvbWUnO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSBcImRpc3BsYXlzIHVzZXIncyB3ZWxjb21lIG1lc3NhZ2UgYW5kIGNoZWNrcyBmb3IgaW5pdGlhbCBwYXJhbWV0ZXJzXCI7XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0dmFyIGNvbmZpZyA9IHRoaXMuYXdpLmNvbmZpZy5nZXRDb25maWcoICd1c2VyJyApO1xuXHRcdGlmICggY29uZmlnLmZpcnN0TmFtZSA9PSAnJyApXG5cdFx0e1xuXHRcdFx0dmFyIHBhcmFtID0gYXdhaXQgdGhpcy5hd2kucHJvbXB0LmdldFBhcmFtZXRlcnMoIFtcblx0XHRcdFx0eyBmaXJzdG5hbWU6ICd5b3VyIGZpcnN0IG5hbWU6ICcsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogZmFsc2UsIGRlZmF1bHQ6ICcnIH0sXG5cdFx0XHRcdHsgbGFzdG5hbWU6ICd5b3VyIGxhc3QgbmFtZTogJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiBmYWxzZSwgZGVmYXVsdDogJycgfSxcblx0XHRcdFx0eyBhaWtleTogJ3lvdXIgb3Blbi1haSBrZXk6ICcsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogZmFsc2UsIGRlZmF1bHQ6ICcnIH0sXG5cdFx0XHRcdF0sIGNvbnRyb2wgKTtcblx0XHRcdGlmICggcGFyYW0uc3VjY2VzcyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBjb25maWcgPSB0aGlzLmF3aS5jb25maWcuZ2V0TmV3VXNlckNvbmZpZygpO1xuXHRcdFx0XHRjb25maWcuYWlLZXkgPSBwYXJhbS5kYXRhLmFpa2V5O1xuXHRcdFx0XHRjb25maWcuZmlyc3ROYW1lID0gcGFyYW0uZGF0YS5maXJzdG5hbWU7XG5cdFx0XHRcdGNvbmZpZy5sYXN0TmFtZSA9IHBhcmFtLmRhdGEubGFzdG5hbWU7XG5cdFx0XHRcdGNvbmZpZy5mdWxsTmFtZSA9IHBhcmFtLmRhdGEuZmlyc3RuYW1lICsgJyAnICsgcGFyYW0uZGF0YS5sYXN0bmFtZTtcblx0XHRcdFx0YXdhaXQgdGhpcy5hd2kuY29uZmlnLnNldE5ld1VzZXJDb25maWcoIHBhcmFtLmRhdGEuZmlyc3RuYW1lLnRvTG93ZXJDYXNlKCksIGNvbmZpZyApO1xuXHRcdFx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kuY29uZmlnLnNhdmVDb25maWdzKCk7XG5cdFx0XHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ1VzZXIgY29uZmlndXJhdGlvbiBcIicgKyBjb25maWcuZmlyc3ROYW1lICsgJ1wiIHN1Y2Nlc3NmdWxseSBjcmVhdGVkIGluICcgKyB0aGlzLmF3aS5jb25maWcuZ2V0Q29uZmlndXJhdGlvblBhdGgoKSApO1xuXHRcdFx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdQbGVhc2Ugbm93IHR5cGUgXCInICsgY29uZmlnLmZpcnN0TmFtZSArICdcIiB0byBsb2dpbi4uLicgKTtcblx0XHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7fSB9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdTb3JyeSBJIG5lZWQgdGhlc2UgaW5mb3JtYXRpb24gdG8gcnVuLicgKTtcblx0XHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnYXdpOmNvbmZpZy1ub3Qtc2V0Oml3YScgfTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YToge30gfTtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZUdlbmVyaWNXZWxjb21lO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktYnViYmxlLWdlbmVyaWMtY29kZS5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgQ29kZSBjb21tYW5kOiBjcmVhdGUgY29kZSBpbiB0aGUgY3VycmVudCBsYW5ndWFnZSBjb25uZWN0b3JcbipcbiovXG52YXIgYXdpYnViYmxlID0gcmVxdWlyZSggJy4uL2F3aS1idWJibGUnIClcblxuY2xhc3MgQnViYmxlR2VuZXJpY1dyaXRlIGV4dGVuZHMgYXdpYnViYmxlLkJ1YmJsZVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdXcml0ZSc7XG5cdFx0dGhpcy50b2tlbiA9ICd3cml0ZSc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICd3cml0ZSBhIHRleHQsIGNvZGUsIHJlc3VtZSwgc3ludGhlc2lzJztcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gW1xuXHRcdFx0eyBub3VuOiAnd2hhdCB0byB3cml0ZScsIHR5cGU6ICdzdHJpbmcnIH0sXG5cdFx0XHR7IHBlcnNvbjogJ3RoZSBwZXJzb24gdG8gd3JpdGUgdG8nLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbXTtcblx0XHR0aGlzLnByb3BlcnRpZXMucGFyc2VyID0ge1xuXHRcdFx0dmVyYjogWyAnd3JpdGUnIF0sXG5cdFx0XHRub3VuOiBbICdtYWlsJywgJ2RvY3VtZW50JywgJ3ByZXNlbnRhdGlvbicsICd0ZXh0JyBdLFxuXHRcdFx0cGVyc29uOiBbXSB9O1xuXHRcdHRoaXMucHJvcGVydGllcy5zZWxlY3QgPSBbIFsgJ3ZlcmInIF0gXTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApXG5cdHtcblx0XHRzdXBlci5wbGF5YmFjayggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZUdlbmVyaWNXcml0ZTtcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgIFsgXFwgWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWxcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gIFtffCB8X10gXFwgICAgIEFzc2lzdGFudFxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLWJ1YmJsZS1nZW5lcmljLWJpbi5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgQmluIGNvbW1hbmQ6IGNvbnZlcnQgdG8gYmluYXJ5XG4qXG4qL1xudmFyIGF3aWJ1YmJsZSA9IHJlcXVpcmUoICcuLi9hd2ktYnViYmxlJyApXG5cbmNsYXNzIEJ1YmJsZVByb2dyYW1taW5nQmFzZTY0IGV4dGVuZHMgYXdpYnViYmxlLkJ1YmJsZVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdCYXNlNjQnO1xuXHRcdHRoaXMudG9rZW4gPSAnYmFzZTY0Jztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdwcm9ncmFtbWluZyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICdjb252ZXJ0cyBhbiBpbWFnZSB0byBCYXNlIDY0IEFzY2lpIGNvZGUnO1xuXHRcdHRoaXMucHJvcGVydGllcy5pbnB1dHMgPSBbXG5cdFx0XHR7IGZpbGU6ICd0aGUgZmlsZSB0byBlZGl0JywgdHlwZTogJ3N0cmluZycgfSxcblx0XHRcdHsgZGF0ZTogJ3RoZSBkYXRlIHdoZW4gdGhlIGZpbGUgd2FzIGNyZWF0ZWQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdHsgdGltZTogJ3RoZSB0aW1lIHdoZW4gdGhlIGZpbGUgd2FzIGNyZWF0ZWQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdHsgaW5wdXQ6ICdkZXNjcmlwdGlvbiBvZiB0aGUgY29udGVudCB0byBzZWFyY2ggZm9yJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlIH0sXG5cdFx0XHRdO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzID0gWyB7IGJhc2U2NDogJ3RoZSBpbWFnZSBjb252ZXJ0ZWQgdG8gYmFzZTY0JywgdHlwZTogJ3N0cmluZy5iYXNlNjQnIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMucGFyc2VyID0ge1xuXHRcdFx0dmVyYjogWyAnY29udmVydCcsICd0cmFuc2Zvcm0nIF0sXG5cdFx0XHRhZGplY3RpdmU6IFsgJ2Jhc2U2NCcgXSxcblx0XHRcdGZpbGU6IFtdLCBkYXRlOiBbXSwgdGltZTogW10sIGlucHV0OiBbXSB9O1xuXHRcdHRoaXMucHJvcGVydGllcy5zZWxlY3QgPSBbIFsgJ3ZlcmInLCAnYWRqZWN0aXZlJyBdIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0YXN5bmMgZnVuY3Rpb24gY29udmVydCggcGF0aCApXG5cdFx0e1xuXHRcdFx0dmFyIGltYWdlID0gYXdhaXQgc2VsZi5hd2kuc3lzdGVtLnJlYWRGaWxlKCBwYXRoLCAnYmFzZTY0JyApO1xuXHRcdFx0aWYgKCBpbWFnZS5zdWNjZXNzIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIG1pbWUgPSBzZWxmLmF3aS51dGlsaXRpZXMuZ2V0TWltZVR5cGUoIHBhdGggKTtcblx0XHRcdFx0dmFyIHJlc3VsdCA9ICdkYXRhOlsnICsgbWltZSArICc7YmFzZTY0LCcgKyBpbWFnZS5kYXRhO1xuXHRcdFx0XHRzZWxmLmF3aS5lZGl0b3IucHJpbnQoIHNlbGYsIHJlc3VsdC5zcGxpdCggJ1xcbicgKSwgeyB1c2VyOiAnY29kZScgfSApO1xuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXN1bHQgfVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGltYWdlO1xuXHRcdH1cblx0XHRpZiAoIC9eXFxkKyQvLnRlc3QoIHBhcmFtZXRlcnMudXNlcklucHV0ICkgKVxuXHRcdHtcblx0XHRcdHZhciBmaWxlcyA9IHRoaXMuYnJhbmNoLmdldExhc3REYXRhKCB0aGlzLCAnZmlsZUxpc3QnICk7XG5cdFx0XHRpZiAoIGZpbGVzICYmIGZpbGVzLmxlbmd0aCA+IDAgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgbnVtYmVyID0gcGFyc2VJbnQoIHBhcmFtZXRlcnMudXNlcklucHV0ICkgLSAxO1xuXHRcdFx0XHRpZiAoIG51bWJlciA+PSAwICYmIG51bWJlciA8IGZpbGVzLmxlbmd0aCApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyZXR1cm4gY29udmVydCggZmlsZXNbIG51bWJlciBdLnBhdGggKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6bm90LWZvdW5kOml3YScgfTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFyIHBhdGggPSB0aGlzLmF3aS51dGlsaXRpZXMubm9ybWFsaXplKCBwYXJhbWV0ZXJzLnVzZXJJbnB1dCApXG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLnN5c3RlbS5leGlzdHMoIHBhdGggKTtcblx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHRcdHJldHVybiBjb252ZXJ0KCBmaWxlc1sgMCBdLnBhdGggKTtcblxuXHRcdHZhciB0eXBlID0gdGhpcy5hd2kuc3lzdGVtLmdldEZpbGVUeXBlKCBwYXJhbWV0ZXJzLnVzZXJJbnB1dCApO1xuXHRcdGlmICggdHlwZSAhPSAnaW1hZ2UnIClcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2F3aTpub3QtYW4taW1hZ2U6aXdhJyB9O1xuXHRcdHZhciBwYXRocyA9IHRoaXMuYXdpLnN5c3RlbS5nZXRQYXRocyggdHlwZSApO1xuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLmF3aS5zeXN0ZW0uZmluZEZpbGUoIHBhdGhzLCBwYXJhbWV0ZXJzLnVzZXJJbnB1dCwgeyB9ICk7XG5cdFx0aWYgKCAhYW5zd2VyLnN1Y2Nlc3MgfHwgYW5zd2VyLmRhdGEubGVuZ3RoID09IDAgKVxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnYXdpOm5vdC1mb3VuZDppd2EnIH07XG5cblx0XHR2YXIgZmlsZXMgPSBhbnN3ZXIuZGF0YTtcblx0XHRpZiAoIGZpbGVzLmxlbmd0aCA9PSAxIClcblx0XHRcdHJldHVybiBjb252ZXJ0KCBmaWxlc1sgMCBdLnBhdGggKTtcblxuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIFsgJ1lvdSBjYW4gY29udmVydCB0aGVzZSBmaWxlczogJyBdLCB7IHVzZXI6ICdpbmZvcm1hdGlvbicgfSApO1xuXHRcdHZhciByZXN1bHQgPSBbXTtcblx0XHRmb3IgKCB2YXIgZiA9IDA7IGYgPCBmaWxlcy5sZW5ndGg7IGYrKyApXG5cdFx0XHRyZXN1bHQucHVzaCggKCBmICsgMSApICsgJy4gJyArIGZpbGVzWyBmIF0ucGF0aCApO1xuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIHJlc3VsdCwgeyB1c2VyOiAnaW5mb3JtYXRpb24nIH0gKTtcblx0XHR2YXIgcGFyYW0gPSBhd2FpdCB0aGlzLmF3aS5wcm9tcHQuZ2V0UGFyYW1ldGVycyggY29udHJvbC5lZGl0b3IsIFtcblx0XHRcdHsgY2hvaWNlOiAnUGxlYXNlIGVudGVyIGEgbnVtYmVyIGJldHdlZW4gMSBhbmQgJyArIGZpbGVzLmxlbmd0aCwgdHlwZTogJ251bWJlcicsIGludGVydmFsOiBbIDEsIGZpbGVzLmxlbmd0aCBdLCBvcHRpb25hbDogZmFsc2UsIGRlZmF1bHQ6IDAgfSxcblx0XHRcdF0sIGNvbnRyb2wgKTtcblx0XHRpZiAoIHBhcmFtLnN1Y2Nlc3MgKVxuXHRcdFx0cmV0dXJuIGNvbnZlcnQoIGZpbGVzWyBwYXJhbS5kYXRhLmNob2ljZSAtIDEgXS5wYXRoICk7XG5cdFx0cmV0dXJuIGFuc3dlcjtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIGRhdGEsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLkJ1YmJsZSA9IEJ1YmJsZVByb2dyYW1taW5nQmFzZTY0O1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktYnViYmxlLWphdmFzY3JpcHQtY29kZS5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgQ29kZSBjb21tYW5kOiBjcmVhdGUgYSBqYXZhc2NyaXB0IGZ1bmN0aW9uXG4qXG4qL1xudmFyIGF3aWJ1YmJsZSA9IHJlcXVpcmUoICcuLi9hd2ktYnViYmxlJyApXG52YXIgYXdpbWVzc2FnZXMgPSByZXF1aXJlKCAnLi4vLi4vYXdpLW1lc3NhZ2VzJyApXG5cbmNsYXNzIEJ1YmJsZUphdmFzY3JpcHRDb2RlIGV4dGVuZHMgYXdpYnViYmxlLkJ1YmJsZVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdDb2RlJztcblx0XHR0aGlzLnRva2VuID0gJ2NvZGUnO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2phdmFzY3JpcHQnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAnd3JpdGVzIGFuIEFveiBCYXNpYyBwcm9jZWR1cmUnO1xuXHRcdHRoaXMucHJvcGVydGllcy5pbnB1dHMgPSBbXG5cdFx0XHR7IGNvZGVOYW1lOiAndGhlIG5hbWUgb2YgdGhlIHByb2NlZHVyZSB0byBjcmVhdGUsIHRoZSBuYW1lIHNob3VsZCBiZSBtZWFuaW5nZnVsLicsIHR5cGU6ICdzdHJpbmcnLCBjbGVhcjogdHJ1ZSB9LFxuXHRcdFx0eyBjb2RlUGFyYW1ldGVyczogJ3RoZSBsaXN0IG9mIHBhcmFtZXRlcnMgd2l0aCBtZWFuaW5nZnVsIG5hbWVzLCBzZXBhcmF0ZWQgYnkgY29tbWFzLiBJZiB5b3VyIGZ1bmN0aW9uIG5lZWRzIGEgY2FsbGJhY2ssIGFkZCBpdCBhdCB0aGUgZW5kLi4uJywgdHlwZTogJ3N0cmluZycsIGNsZWFyOiB0cnVlIH0sXG5cdFx0XHR7IGNvZGVTdGVwczogJ3RoZSB2YXJpb3VzIHRhc2tzIHRoZSBwcm9jZWR1cmUgc2hvdWxkIGRvLCBvbmUgcGVyIGxpbmUuXFxuU3RheSBzaW1wbGUsIGluIG9yZGVyIG5vdCB0b28gbWFueSBkZXRhaWxzLi4uXFxuRW1wdHkgbGluZSB0byBxdWl0LicsIHR5cGU6ICdhcnJheS5zdHJpbmcnLCBjbGVhcjogdHJ1ZSB9LFxuXHRcdFx0eyBjb2RlUmV0dXJuOiAnd2hhdCB0aGUgcHJvY2VkdXJlIHNob3VsZCByZXR1cm4uJywgdHlwZTogJ3N0cmluZycsIGNsZWFyOiB0cnVlIH0sXG5cdFx0XHR7IGNvZGVSdW5pbjogJ1Nob3VsZCB0aGUgZnVuY3Rpb24gcnVuIGluIGEgYnJvd3NlciBvciBpbiBub2RlPycsIHR5cGU6ICdjaG9pY2VzLnN0cmluZycsIGNob2ljZXM6IFsgJ2Jyb3dzZXInLCdub2RlJyBdLCBkZWZhdWx0OiAnYnJvd3NlcicsIGNsZWFyOiB0cnVlIH0sXG5cdFx0XHR7IGNvZGVDb25maXJtOiAnRG8geW91IGNvbmZpcm0gYWxsIHRoZSBwYXJhbWV0ZXJzIGFib3ZlPyAoeSllcyBvciBubz8nLCB0eXBlOiAneWVzbm8uc3RyaW5nJywgZGVmYXVsdDogJ3llcycsIGNsZWFyOiB0cnVlIH0sXG5cdFx0XTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBqYXZhc2NyaXB0Q29kZTogJ3RoZSBjb2RlIG9mIHRoZSBuZXcgZnVuY3Rpb24nLCB0eXBlOiAnYXJyYXkuc3RyaW5nLmphdmFzY3JpcHQnIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMucGFyc2VyID0geyB2ZXJiOiBbICdjb2RlJywgJ3Byb2dyYW0nIF0sIG5vdW46IFsgJ2phdmFzY3JpcHQnIF0gfTtcblx0XHR0aGlzLnByb3BlcnRpZXMuc2VsZWN0ID0gWyBbICd2ZXJiJywgJ25vdW4nIF0gXTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0aWYgKCAhYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGRhdGE6IHt9LCBlcnJvcjogJ2F3aTpjYW5jZWxsZWQ6aXdhJyB9O1xuXG4gXHRcdHZhciBkZXNjcmlwdGlvbiA9ICcnXG5cdFx0Zm9yICggdmFyIHMgPSAwOyBzIDwgcGFyYW1ldGVycy5jb2RlU3RlcHMubGVuZ3RoOyBzKysgKVxuXHRcdFx0ZGVzY3JpcHRpb24gKz0gKCBzICsgMSApICsgJy4gJyArIHBhcmFtZXRlcnMuY29kZVN0ZXBzWyBzIF0gKyAnXFxuJztcblx0XHRpZiAoIHBhcmFtZXRlcnMuY29kZVJldHVybiApXG5cdFx0XHRkZXNjcmlwdGlvbiArPSAoIHMgKyAxICkgKyAnLiBJdCByZXR1cm5zICcgKyBwYXJhbWV0ZXJzLmNvZGVSZXR1cm4gKyAnXFxuJztcblx0XHR2YXIgcGFyYW1zID0gcGFyYW1ldGVycy5jb2RlUGFyYW1ldGVycztcblx0XHRpZiAoIHBhcmFtcyA9PSAnJyApXG5cdFx0e1xuXHRcdFx0aWYgKCBwYXJhbXMuY29kZUNhbGxiYWNrIClcblx0XHRcdFx0cGFyYW1zICs9ICdjYWxsYmFjayc7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHBhcmFtcyA9ICd0aGVyZSBpcyBubyBwYXJhbWV0ZXJzLic7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKCBwYXJhbXMuY29kZUNhbGxiYWNrIClcblx0XHRcdHBhcmFtcyArPSAnLGNhbGxiYWNrJztcblxuXHRcdHZhciBwcm9tcHQgPSB0aGlzLmF3aS5wZXJzb25hbGl0eS5nZXRQcm9tcHQoICdjb2RlJyAsXG5cdFx0W1xuXHRcdFx0eyBuYW1lOiAnbGFuZ3VhZ2UnLCBjb250ZW50OiB0aGlzLmF3aS5sYW5ndWFnZS5uYW1lIH0sXG5cdFx0XHR7IG5hbWU6ICdjb2RlRGVzdGluYXRpb24nLCBjb250ZW50OiBwYXJhbWV0ZXJzLmNvZGVSdW5pbiB9LFxuXHRcdFx0eyBuYW1lOiAnZnVuY3Rpb25OYW1lJywgY29udGVudDogcGFyYW1ldGVycy5jb2RlTmFtZSB9LFxuXHRcdFx0eyBuYW1lOiAncGFyYW1ldGVycycsIGNvbnRlbnQ6IHBhcmFtcyB9LFxuXHRcdFx0eyBuYW1lOiAnZGVzY3JpcHRpb24nLCBjb250ZW50OiBkZXNjcmlwdGlvbiB9LFxuXHRcdF0sIGNvbnRyb2wgKTtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCBwcm9tcHQsIHsgdXNlcjogJ3Byb21wdCcgfSApO1xuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLnNlbmRDb21wbGV0aW9uKCBwcm9tcHQsIGZhbHNlLCBjb250cm9sICk7XG5cdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0e1xuXHRcdFx0dmFyIHJlc3VsdCA9IGFuc3dlci5kYXRhLnRleHQudHJpbSgpLnNwbGl0KCAnXFxuJyApO1xuXHRcdFx0dmFyIGNvcHlpbmcgPSBmYWxzZTtcblx0XHRcdHZhciBkZXN0Y29kZSA9IFtdO1xuXHRcdFx0Zm9yICggdmFyIGwgPSAwOyBsIDwgcmVzdWx0Lmxlbmd0aDsgbCsrIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGxpbmUgPSByZXN1bHRbIGwgXTtcblx0XHRcdFx0aWYgKCBjb3B5aW5nICYmIGxpbmUgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCBsaW5lLmluZGV4T2YoICc8RU5ELUNPREU+JyApID49IDAgKVxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVzdGNvZGUucHVzaCggbGluZSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKCBsaW5lLmluZGV4T2YoICc8U1RBUlQtQ09ERT4nICkgPj0gMCApXG5cdFx0XHRcdFx0Y29weWluZyA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCBkZXN0Y29kZSwgeyB1c2VyOiAnY29kZScgfSApO1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogZGVzdGNvZGUgfTtcblx0XHR9XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApXG5cdHtcblx0XHRzdXBlci5wbGF5YmFjayggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQnViYmxlID0gQnViYmxlSmF2YXNjcmlwdENvZGU7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1idWJibGUtZ2VuZXJpYy1iaW4uanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IEJpbiBjb21tYW5kOiBjb252ZXJ0IHRvIGJpbmFyeVxuKlxuKi9cbnZhciBhd2lidWJibGUgPSByZXF1aXJlKCAnLi4vYXdpLWJ1YmJsZScgKVxuXG5jbGFzcyBCdWJibGVVc2VyRGlhcG9yYW1hIGV4dGVuZHMgYXdpYnViYmxlLkJ1YmJsZVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdEaWFwb3JhbWEnO1xuXHRcdHRoaXMudG9rZW4gPSAnZGlhcG9yYW1hJztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICd1c2VyJztcblx0XHR0aGlzLnByb3BlcnRpZXMuYWN0aW9uID0gJ2Rpc3BsYXlzIGEgbGlzdCBvZiBpbWFnZXMgYXMgYSBkaWFwb3JhbWEnO1xuXHRcdHRoaXMucHJvcGVydGllcy5pbnB1dHMgPSBbIHsgdXNlcklucHV0OiAndGhlIHBhdGggb3IgZmlsdGVyIHRvIHRoZSBpbWFnZXMnLCB0eXBlOiAnc3RyaW5nJyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbIF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmJyYWNrZXRzID0gdHJ1ZTtcblx0XHR0aGlzLnByb3BlcnRpZXMudGFncyA9IFsgJ3ZpZXdlcicgXTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLnBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBkYXRhLCBjb250cm9sIClcblx0e1xuXHRcdHN1cGVyLnRyYW5zcGlsZSggbGluZSwgZGF0YSwgY29udHJvbCApO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5CdWJibGUgPSBCdWJibGVVc2VyRGlhcG9yYW1hO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCAgICAgIC8gXVsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC8gXFwvICAvIHwgIHwgICAgICAgIFBlcnNvbmFsIEFzc2lzdGFudFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyBbX3wgfF9dICAgICAgbGluazpcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1hb3pydW50aW1lLXNlcnZlci5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgQ29uZmlndXJhdGlvbiBtYW5hZ2VtZW50XG4qXG4qL1xuY2xhc3MgQ29ubmVjdG9yXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHR0aGlzLmF3aSA9IGF3aTtcblx0XHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXHRcdHRoaXMudmVyc2lvbiA9ICcwLjEnO1xuXHRcdHRoaXMub0NsYXNzID0gJ2Nvbm5lY3Rvcic7XG5cdH1cblx0YXN5bmMgY29ubmVjdCggLypvcHRpb25zKi8gKVxuXHR7XG5cdFx0dGhpcy5jb25uZWN0QW5zd2VyID1cblx0XHR7XG5cdFx0XHRzdWNjZXNzOiB0cnVlLFxuXHRcdFx0ZGF0YTpcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogdGhpcy5uYW1lLFxuXHRcdFx0XHR0b2tlbjogdGhpcy50b2tlbixcblx0XHRcdFx0Y2xhc3NuYW1lOiB0aGlzLmNsYXNzbmFtZSxcblx0XHRcdFx0cHJvbXB0OiB0aGlzLm5hbWUgKyAnIGNvbm5lY3RvciB2ZXJzaW9uICcgKyB0aGlzLnZlcnNpb24sIHZlcnNpb246IHRoaXMudmVyc2lvblxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5jb25uZWN0QW5zd2VyO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5Db25uZWN0b3IgPSBDb25uZWN0b3I7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcICBbIFxcIFsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcICBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsXG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vICBbX3wgfF9dIFxcICAgICBBc3Npc3RhbnRcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1jb25uZWN0b3Itc2VydmVycy1icm93c2VyLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBDb25uZWN0b3IgdG8gY29kZSByYW4gZnJvbSBuYXZpZ2F0b3IgKGluZGlyZWN0IGZpbGUtc3lzdGVtKS5cbiogICAgICAgIFJlYWQvd3JpdGUgc3ViamVjdCB0byBhdXRob3Jpc2F0aW9uIGZyb20gdXNlciBpbiBjb25maWcsXG4qICAgICAgICB3aXRoIGRpcmVjdG9yeSBzZWxlY3Rpb24uIEFueSB3cml0ZSBvcGVyYXRpb24gd2lsbCBuZWNlc3NpdFxuKiAgICAgICAgYSBcImNvbnRyb2wubGV2ZWxPZlRydXN0XCIgb3ZlciBhIGNlcnRhaW4gbGltaXQsIHdpdGggb2YgY291cnNlXG4qICAgICAgICBoZWF2eSBzZWNyaXR5IGF0IHRoZSBib3R0b20sIHdpdGggcG9zc2libGUgcXVlc3Rpb25zIHJlbGF0aXVuZ1xuKiAgICAgICAgdG8gbWVtb3J5IHRoYXQgcmVsYXRlcyB0byByZWNlbnQgZXZlbnQgZXRjLiBUaHJlZSBuZWNlc3NhcnlcbiogICAgICAgIGZvciB0b3RhbCBzZWN1cml0eSwgZnJvbSBteSBvZiB0b2RheSdzIHVuZGVyc3RhbmRpbmcgb2YgVHJhbnNmb3JtZXJzLFxuKiAgICAgICAgNSA9IHRvdGFsIGxvY2sgd2l0aCBtb3RpdmF0aW9uIHRvIHN0YXkgbG9ja2VkLlxuKlxuKlxuKi9cbnZhciBhd2ljb25uZWN0b3IgPSByZXF1aXJlKCAnLi4vYXdpLWNvbm5lY3RvcicgKTtcblxuY2xhc3MgQ29ubmVjdG9yQ2xpZW50T3BlbkFpQnJvd3NlciBleHRlbmRzIGF3aWNvbm5lY3Rvci5Db25uZWN0b3Jcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLnRva2VuID0gJ29wZW5haWJyb3dzZXInO1xuXHRcdHRoaXMubmFtZSA9ICdPcGVuQWkgQnJvd3Nlcic7XG5cdFx0dGhpcy50b2tlbiA9ICdjbGllbnQnO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2NsaWVudCc7XG5cdFx0dGhpcy52ZXJzaW9uID0gJzAuMi4xJztcblx0fVxuXHRhc3luYyBjb25uZWN0KCBvcHRpb25zIClcblx0e1xuXHRcdHN1cGVyLmNvbm5lY3QoIG9wdGlvbnMgKTtcblx0XHR0aGlzLmNvbm5lY3RBbnN3ZXIuZGF0YS50b2tlbiA9IHRoaXMuY2xhc3NuYW1lO1xuXHRcdHRoaXMuY29ubmVjdEFuc3dlci5zdWNjZXNzID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGhpcy5jb25uZWN0QW5zd2VyO1xuXHR9XG5cdGFzeW5jIHNlbmRDb21wbGV0aW9uKCBwcm9tcHQsIHN0cmVhbSwgY29udHJvbCApXG5cdHtcblx0XHRwcm9tcHQgPSBwcm9tcHQudHJpbSgpO1xuXHRcdHZhciBwYXJhbWV0ZXJzID0gdGhpcy5hd2kudXRpbGl0aWVzLmdldENvbnRyb2xQYXJhbWV0ZXJzKCBjb250cm9sLFxuXHRcdHtcblx0XHRcdG1vZGVsOiAndGV4dC1kYXZpbmNpLTAwMycsXG5cdFx0XHRtYXhfdG9rZW5zOiAxMDAwLFxuXHRcdFx0dGVtcGVyYXR1cmU6IDEsXG5cdFx0XHR0b3BfcDogMSxcblx0XHRcdG46IDJcblx0IFx0fSApO1xuXHRcdHBhcmFtZXRlcnMucHJvbXB0ID0gcHJvbXB0O1xuXHRcdGlmICggdGhpcy5hd2kuY29ubmVjdG9ycy5lZGl0b3JzLmN1cnJlbnQgKVxuXHRcdHtcblx0XHRcdHZhciBkZWJ1ZyA9IHRoaXMuYXdpLnV0aWxpdGllcy5mb3JtYXQoIGBcbnByb21wdDoge3Byb21wdH1cbm1vZGVsOiB7bW9kZWx9XG5tYXhfdG9rZW5zOiB7bWF4X3Rva2Vuc31cbnRlbXBlcmF0dXJlOiB7dGVtcGVyYXR1cmV9XG50b3BfcDoge3RvcF9wfVxubjoge259YCwgcGFyYW1ldGVycyApO1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgZGVidWcuc3BsaXQoICdcXG4nICksIHsgdXNlcjogJ2NvbXBsZXRpb24nIH0gKTtcblx0XHR9XG5cblx0XHR2YXIgYXBpS2V5ID0gdGhpcy5hd2kuY29uZmlnLmdldFVzZXJLZXkoKTtcblx0XHR2YXIgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCggXCJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxL2NvbXBsZXRpb25zXCIsXG5cdFx0e1xuXHRcdFx0bWV0aG9kOiBcIlBPU1RcIixcblx0XHRcdGhlYWRlcnM6XG5cdFx0XHR7XG5cdFx0XHRcdCdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXG5cdFx0XHRcdCdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG5cdFx0XHRcdCdBdXRob3JpemF0aW9uJzogYEJlYXJlciAnJHthcGlLZXl9YFxuXHRcdFx0fSxcblx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KFxuXHRcdFx0e1xuXHRcdFx0XHRcIm1vZGVsXCI6IGB7bW9kZWx9YCxcblx0XHRcdFx0XCJwcm9tcHRcIjogYHtwcm9tcHR9YCxcblx0XHRcdFx0XCJ0ZW1wZXJhdHVyZVwiOiB0ZW1wZXJhdHVyZSxcblx0XHRcdFx0XCJtYXhfdG9rZW5zXCI6IG1heF90b2tlbnMsXG5cdFx0XHRcdFwidG9wX3BcIjogdG9wX3AsXG5cdFx0XHRcdFwiblwiOiBuXG5cdFx0XHR9IClcblx0XHR9ICk7XG5cdFx0dmFyIGFuc3dlciA9IHt9O1xuXHRcdGlmICggIXJlc3BvbnNlLmVycm9yIClcblx0XHR7XG5cdFx0XHRhbnN3ZXIuc3VjY2VzcyA9IHRydWU7XG5cdFx0XHRhbnN3ZXIuZGF0YSA9IHJlc3BvbnNlLmRhdGEuY2hvaWNlc1sgMCBdO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0YW5zd2VyLnN1Y2Nlc3MgPSBmYWxzZTtcblx0XHRcdGFuc3dlci5kYXRhID0gcmVzcG9uc2U7XG5cdFx0XHRhbnN3ZXIuZXJyb3IgPSAnYXdpOm9wZW5haS1lcnJvcjppd2EnO1xuXHRcdH1cblx0XHRyZXR1cm4gYW5zd2VyO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5Db25uZWN0b3IgPSBDb25uZWN0b3JDbGllbnRPcGVuQWlCcm93c2VyIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktY29ubmVjdG9yLWVkaXRvcnMtbW9iaWxlLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBDb25uZWN0b3IgdG8gTW9iaWxlIGVkaXRvclxuKlxuKi9cbnZhciBhd2ljb25uZWN0b3IgPSByZXF1aXJlKCAnLi4vYXdpLWNvbm5lY3RvcicgKTtcblxuY2xhc3MgQ29ubmVjdG9yRWRpdG9yTW9iaWxlIGV4dGVuZHMgYXdpY29ubmVjdG9yLkNvbm5lY3Rvclxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdNb2JpbGUgRGV2aWNlJztcblx0XHR0aGlzLnRva2VuID0gJ21vYmlsZSc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZWRpdG9yJztcblx0XHR0aGlzLnZlcnNpb24gPSAnMC40JztcblxuXHRcdHRoaXMub3V0cHV0ID0gYXdpLnN5c3RlbUNvbmZpZy5wcmludENhbGxiYWNrO1xuXHRcdHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG5cdFx0dGhpcy5pbnB1dEVuYWJsZWQgPSBmYWxzZTtcblx0XHR0aGlzLnJlcm91dGUgPSB1bmRlZmluZWQ7XG5cdFx0dGhpcy5yYW5nZSA9IHsgc3RhcnQ6IHsgcm93OiAwLCBjb2x1bW46IDAgfSwgZW5kOiB7IHJvdzogMCwgY29sdW1uOiAwIH0gfTtcblx0fVxuXHRhc3luYyBjb25uZWN0KCBvcHRpb25zIClcblx0e1xuXHRcdHN1cGVyLmNvbm5lY3QoIG9wdGlvbnMgKTtcblx0XHR0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG5cdFx0dGhpcy5jb25uZWN0QW5zd2VyLmRhdGEudG9rZW4gPSB0aGlzLmNsYXNzbmFtZTtcblx0XHR0aGlzLmNvbm5lY3RBbnN3ZXIuc3VjY2VzcyA9IHRydWU7XG5cdFx0cmV0dXJuIHRoaXMuY29ubmVjdEFuc3dlcjtcblx0fVxuXHRjbG9zZSgpXG5cdHtcblxuXHR9XG5cdHJlcm91dGVJbnB1dCggcm91dGUgKVxuXHR7XG5cdFx0dGhpcy5yZXJvdXRlID0gcm91dGU7XG5cdH1cblx0ZGlzYWJsZUlucHV0KClcblx0e1xuXHRcdHRoaXMuaW5wdXRFbmFibGVkID0gZmFsc2U7XG5cdH1cblx0d2FpdEZvcklucHV0KCBsaW5lIClcblx0e1xuXHRcdHRoaXMuaW5wdXRFbmFibGVkID0gdHJ1ZTtcblx0XHRpZiAoIGxpbmUgKVxuXHRcdFx0dGhpcy5wcm9tcHRDYWxsYmFjayggbGluZSApO1xuXHR9XG5cdG5ld0lucHV0KCBpbnB1dCApXG5cdHtcblx0XHRpZiAoIHRoaXMuaW5wdXRFbmFibGVkIClcblx0XHR7XG5cdFx0XHRpZiAoIHRoaXMucmVyb3V0ZSApXG5cdFx0XHRcdHRoaXMucmVyb3V0ZSggaW5wdXQsIHt9LCB7fSApO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aGlzLmF3aS5wcm9tcHQucHJvbXB0KCBpbnB1dCwge30sIHt9ICk7XG5cdFx0fVxuXHR9XG5cdGFjdGl2YXRlRXZlbnRzKClcblx0e1xuXHRcdHRoaXMuZXZlbnRzQWN0aXZhdGVkID0gdHJ1ZTtcblx0fVxuXHRkZWFjdGl2YXRlRXZlbnRzKClcblx0e1xuXHRcdHRoaXMuZXZlbnRzQWN0aXZhdGVkID0gZmFsc2U7XG5cdH1cblx0YmxvY2tDdXJzb3IoIG9uT2ZmLCBjYWxsYmFjaywgZXh0cmEgKVxuXHR7XG5cdFx0Ly8gQmxvY2sgdGhlIGN1cnNvciBvbiB0aGUgY29tbWFuZCBsaW5lXG5cdFx0dGhpcy5ibG9ja0N1cnNvck9uID0gb25PZmY7XG5cdH1cblx0d2FpdCggb25PZmYsIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHR0aGlzLndhaXRpbmdPbiA9IG9uT2ZmO1xuXHR9XG5cdGludGVycHJldExpbmUoIGxpbmUgKVxuXHR7XG5cdFx0cmV0dXJuIGxpbmU7XG5cdH1cblx0cHJpbnQoIHBhcmVudCwgdGV4dCwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHZhciByZXN1bHQgPSBbXTtcblx0XHR2YXIgcHJvbXB0ID0gdGhpcy5hd2kuY29uZmlnLmdldFByb21wdCggb3B0aW9ucy51c2VyICk7XG5cdFx0aWYgKCAhcHJvbXB0IClcblx0XHRcdHJldHVybjtcblx0XHRpZiAoIHR5cGVvZiB0ZXh0ID09ICdzdHJpbmcnIClcblx0XHRcdHRleHQgPSB0ZXh0LnNwbGl0KCAnXFxuJyApO1xuXHRcdGZ1bmN0aW9uIHByaW50TGluZXNEb3duKCBsaW5lcyApXG5cdFx0e1xuXHRcdFx0Zm9yICggdmFyIGwgPSAwOyBsIDwgbGluZXMubGVuZ3RoOyBsKysgKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zb2xlLmxvZyggcHJvbXB0ICsgbGluZXNbIGwgXSApO1xuXHRcdFx0XHRyZXN1bHQucHVzaCggcHJvbXB0ICsgbGluZXNbIGwgXSApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRmb3IgKCB2YXIgdCA9IDA7IHQgPCB0ZXh0Lmxlbmd0aDsgdCsrIClcblx0XHR7XG5cdFx0XHR2YXIgbGluZSA9IHRoaXMuaW50ZXJwcmV0TGluZSggdGV4dFsgdCBdICk7XG5cdFx0XHRpZiAoICFvcHRpb25zLm5vSnVzdGlmeSApXG5cdFx0XHRcdHByaW50TGluZXNEb3duKCB0aGlzLmF3aS51dGlsaXRpZXMuanVzdGlmeVRleHQoIGxpbmUsIDgwICkgKTtcblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0Y29uc29sZS5sb2coIHByb21wdCArIGxpbmUgKTtcblx0XHRcdFx0cmVzdWx0LnB1c2goIHByb21wdCArIGxpbmUgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy5wcm9tcHRDYWxsYmFjayggcmVzdWx0ICk7XG5cdH1cblx0ZGVjb3JhdGVMaW5lKCByb3csIHVzZXIgKVxuXHR7XG5cdH1cblx0Z2V0U3RhcnRQcm9tcHQoIHJhbmdlIClcblx0e1xuXHRcdHJldHVybiByYW5nZTtcblx0fVxuXHRjcmVhdGVDaGVja3BvaW50KCByYW5nZSApXG5cdHtcblx0XHRyZXR1cm4gcmFuZ2U7XG5cdH1cblx0c3RhcnRBbmltYXRpb24oIGNoYXJhY3Rlck5hbWUsIGFuaW1hdGlvbk5hbWUsIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0fVxuXHRwcmludEFuaW1hdGlvbiggY2hhcmFjdGVyTmFtZSwgYW5pbWF0aW9uTmFtZSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHR9XG5cdHN0b3BBbmltYXRpb24oKVxuXHR7XG5cdH1cblx0cGxheVZpZGVvKCBwYXRoLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdH1cblx0cGxheUF1ZGlvKCBwYXRoLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdH1cblx0dmlld0ZpbGUoIGZpbGUsIG9wdGlvbnMgKVxuXHR7XG5cdH1cblx0Z2V0TGluZSggcm93IClcblx0e1xuXHRcdHJldHVybiAnJztcblx0fVxuXHRzZXRMaW5lKCByb3csIHRleHQsIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0fVxuXHRpbnNlcnRMaW5lKCByb3csIHRleHQvKiwgb3B0aW9ucyA9IHt9ICovKVxuXHR7XG5cdH1cblx0ZGVsZXRlTGluZSggcm93LCBvcHRpb25zID0ge30gKVxuXHR7XG5cdH1cblx0Z2V0Um93KClcblx0e1xuXHRcdHJldHVybiAwO1xuXHR9XG5cdGdldENvbHVtbigpXG5cdHtcblx0XHRyZXR1cm4gMDtcblx0fVxuXHRnZXRQb3NpdGlvbigpXG5cdHtcblx0XHRyZXR1cm4gWyAwLCAwIF07XG5cdH1cblx0c2V0UG9zaXRpb24oIHJvdywgY29sdW1uIClcblx0e1xuXHR9XG5cdHNldENvbHVtbiggY29sdW1uIClcblx0e1xuXHR9XG5cdHNldFJvdyggcm93IClcblx0e1xuXHR9XG5cdG1vdmVVcCggblRpbWVzIClcblx0e1xuXHR9XG5cdG1vdmVEb3duKCBuVGltZXMgKVxuXHR7XG5cdH1cblx0bW92ZUxlZnQoIG5UaW1lcyApXG5cdHtcblx0fVxuXHRtb3ZlUmlnaHQoIG5UaW1lcyApXG5cdHtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQ29ubmVjdG9yID0gQ29ubmVjdG9yRWRpdG9yTW9iaWxlO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktY29ubmVjdG9yLWxhbmd1YWdlcy1qYXZhc2NyaXB0LmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBDb25uZWN0b3IgdG8gSmF2YXNjcmlwdFxuKlxuKi9cbnZhciBhd2ljb25uZWN0b3IgPSByZXF1aXJlKCAnLi4vYXdpLWNvbm5lY3RvcicgKTtcblxuY2xhc3MgQ29ubmVjdG9yTGFuZ3VhZ2VKYXZhc2NyaXB0IGV4dGVuZHMgYXdpY29ubmVjdG9yLkNvbm5lY3Rvclxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdKYXZhc2NyaXB0Jztcblx0XHR0aGlzLnRva2VuID0gJ2phdmFzY3JpcHQnO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2xhbmd1YWdlJztcblx0XHR0aGlzLnZlcnNpb24gPSAnMC4yJztcblx0fVxuXHRhc3luYyBjb25uZWN0KCBvcHRpb25zIClcblx0e1xuXHRcdHN1cGVyLmNvbm5lY3QoIG9wdGlvbnMgKTtcblx0XHR0aGlzLmNvbm5lY3RBbnN3ZXIuZGF0YS50b2tlbiA9IHRoaXMuY2xhc3NuYW1lO1xuXHRcdHJldHVybiB0aGlzLmNvbm5lY3RBbnN3ZXI7XG5cdH1cblx0c2NhbkZvckNvbW1hbmRzKCBsaW5lIClcblx0e1xuXHRcdHZhciBmb3VuZEtleXdvcmRzID0gW107XG5cdFx0cmV0dXJuIGZvdW5kS2V5d29yZHM7XG5cdH1cblx0ZXh0cmFjdFRva2Vucyggc291cmNlLCBjYWxsYmFjaywgZXh0cmEgKVxuXHR7XG5cblx0fVxuXHRjbG9zZSgpXG5cdHtcblxuXHR9XG5cdGFzeW5jIGRvRXZhbCggbGluZSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHZhciBtYXRoV29yZHMgPVxuXHRcdFtcblx0XHRcdHsgbmFtZTogJ3JvdW5kJywgdG9rZW46ICdNYXRoLnJvdW5kJyB9LFxuXHRcdFx0eyBuYW1lOiAnY2VpbCcsIHRva2VuOiAnTWF0aC5jZWlsJyB9LFxuXHRcdFx0eyBuYW1lOiAnZmxvb3InLCB0b2tlbjogJ01hdGguZmxvb3InIH0sXG5cdFx0XHR7IG5hbWU6ICd0cnVuYycsIHRva2VuOiAnTWF0aC50cnVuYycgfSxcblx0XHRcdHsgbmFtZTogJ3NpZ24nLCB0b2tlbjogJ01hdGguc2lnbicgfSxcblx0XHRcdHsgbmFtZTogJ3BvdycsIHRva2VuOiAnTWF0aC5wb3cnIH0sXG5cdFx0XHR7IG5hbWU6ICdzcXInLCB0b2tlbjogJ01hdGguc3FydCcgfSxcblx0XHRcdHsgbmFtZTogJ2FicycsIHRva2VuOiAnTWF0aC5hYnMnIH0sXG5cdFx0XHR7IG5hbWU6ICdtaW4nLCB0b2tlbjogJ01hdGgubWluJyB9LFxuXHRcdFx0eyBuYW1lOiAnbWF4JywgdG9rZW46ICdNYXRoLm1heCcgfSxcblx0XHRcdHsgbmFtZTogJ3JhbmRvbScsIHRva2VuOiAnTWF0aC5yYW1kb20nIH0sXG5cdFx0XHR7IG5hbWU6ICdjYnJ0JywgdG9rZW46ICdNYXRoLmNicnQnIH0sXG5cdFx0XHR7IG5hbWU6ICdleHAnLCB0b2tlbjogJ01hdGguZXhwJyB9LFxuXHRcdFx0eyBuYW1lOiAnbG9nMicsIHRva2VuOiAnTWF0aC5sb2cyJyB9LFxuXHRcdFx0eyBuYW1lOiAnbG9nMTAnLCB0b2tlbjogJ01hdGgubG9nMTAnIH0sXG5cdFx0XHR7IG5hbWU6ICdsb2cnLCB0b2tlbjogJ01hdGgubG9nJyB9LFxuXHRcdFx0eyBuYW1lOiAndGFuaCcsIHRva2VuOiAnTWF0aC50YW5oJywgaW5UeXBlOiAnc2VsZi5hd2kuY29uZmlnLmRlZ3JlZVRvUmFkaWFuJyB9LFxuXHRcdFx0eyBuYW1lOiAnc2luaCcsIHRva2VuOiAnTWF0aC5zaW5oJywgaW5UeXBlOiAnc2VsZi5hd2kuY29uZmlnLmRlZ3JlZVRvUmFkaWFuJyB9LFxuXHRcdFx0eyBuYW1lOiAnY29zaCcsIHRva2VuOiAnTWF0aC5jb3NoJywgaW5UeXBlOiAnc2VsZi5hd2kuY29uZmlnLmRlZ3JlZVRvUmFkaWFuJyB9LFxuXHRcdFx0eyBuYW1lOiAnYWNvcycsIHRva2VuOiAnTWF0aC5hY29zJywgb3V0VHlwZTogJ3NlbGYuYXdpLmNvbmZpZy5yYWRpYW5Ub0RlZ3JlZScgfSxcblx0XHRcdHsgbmFtZTogJ2FzaW4nLCB0b2tlbjogJ01hdGguYXNpbicsIG91dFR5cGU6ICdzZWxmLmF3aS5jb25maWcucmFkaWFuVG9EZWdyZWUnIH0sXG5cdFx0XHR7IG5hbWU6ICdhdGFuJywgdG9rZW46ICdNYXRoLmF0YW4nLCBvdXRUeXBlOiAnc2VsZi5hd2kuY29uZmlnLnJhZGlhblRvRGVncmVlJyB9LFxuXHRcdFx0eyBuYW1lOiAnYWNvc2gnLCB0b2tlbjogJ01hdGguYWNvc2gnLCBvdXRUeXBlOiAnc2VsZi5hd2kuY29uZmlnLnJhZGlhblRvRGVncmVlJyB9LFxuXHRcdFx0eyBuYW1lOiAnYXNpbmgnLCB0b2tlbjogJ01hdGguc2luaCcsIG91dFR5cGU6ICdzZWxmLmF3aS5jb25maWcucmFkaWFuVG9EZWdyZWUnIH0sXG5cdFx0XHR7IG5hbWU6ICdhdGFuMicsIHRva2VuOiAnTWF0aC5hdGFuMicsIG91dFR5cGU6ICdzZWxmLmF3aS5jb25maWcucmFkaWFuVG9EZWdyZWUnIH0sXG5cdFx0XHR7IG5hbWU6ICdhdGFuaCcsIHRva2VuOiAnTWF0aC5hdGFuaCcsIG91dFR5cGU6ICdzZWxmLmF3aS5jb25maWcucmFkaWFuVG9EZWdyZWUnIH0sXG5cdFx0XHR7IG5hbWU6ICdzaW4nLCB0b2tlbjogJ01hdGguc2luJywgaW5UeXBlOiAnc2VsZi5hd2kuY29uZmlnLmRlZ3JlZVRvUmFkaWFuJyB9LFxuXHRcdFx0eyBuYW1lOiAnY29zJywgdG9rZW46ICdNYXRoLmNvcycsIGluVHlwZTogJ3NlbGYuYXdpLmNvbmZpZy5kZWdyZWVUb1JhZGlhbicgfSxcblx0XHRcdHsgbmFtZTogJ3RhbicsIHRva2VuOiAnTWF0aC50YW4nLCBpblR5cGU6ICdzZWxmLmF3aS5jb25maWcuZGVncmVlVG9SYWRpYW4nIH0sXG5cdFx0XTtcblx0XHRsaW5lID0gbGluZS5zcGxpdCggJyAnICkuam9pbiggJycgKTtcblx0XHRmdW5jdGlvbiBnZXRXb3JkKCBuYW1lIClcblx0XHR7XG5cdFx0XHRmb3IgKCB2YXIgdyA9IDA7IHcgPCBtYXRoV29yZHMubGVuZ3RoOyB3KysgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgd29yZCA9IG1hdGhXb3Jkc1sgdyBdO1xuXHRcdFx0XHRpZiAoIHdvcmQubmFtZSA9PSBuYW1lLnRvTG93ZXJDYXNlKCkgKVxuXHRcdFx0XHRcdHJldHVybiB3b3JkO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdGZ1bmN0aW9uIHNjYW4oIGxpbmUgKVxuXHRcdHtcblx0XHRcdGZvciAoIHZhciB3ID0gMDsgdyA8IG1hdGhXb3Jkcy5sZW5ndGg7IHcrKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciB3b3JkID0gbWF0aFdvcmRzWyB3IF07XG5cdFx0XHRcdHZhciBzdGFydENvbW1hbmQgPSBsaW5lLmluZGV4T2YoIHdvcmQubmFtZSArICcoJyApO1xuXHRcdFx0XHRpZiAoIHN0YXJ0Q29tbWFuZCA+PSAwIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdC8vIFNraXAgcGFyZW50aGVzZXNcblx0XHRcdFx0XHR2YXIgY291bnQgPSAxO1xuXHRcdFx0XHRcdHZhciBzdGFydCA9IHN0YXJ0Q29tbWFuZCArIHdvcmQubmFtZS5sZW5ndGggKyAxO1xuXHRcdFx0XHRcdHZhciBlbmQgPSBzdGFydDtcblx0XHRcdFx0XHR2YXIgZW1iZWRkZWQgPSBbIHsgc3RhcnQ6IHN0YXJ0LCBlbmQ6IDAsIG5hbWU6IHdvcmQubmFtZSwgc3RhcnROYW1lOiBzdGFydENvbW1hbmQgfSBdO1xuXHRcdFx0XHRcdHZhciBjdXJyZW50TmFtZSA9ICcnO1xuXHRcdFx0XHRcdHZhciBzdGFydE5hbWUgPSAwO1xuXHRcdFx0XHRcdHdoaWxlKCBlbmQgPCBsaW5lLmxlbmd0aCApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dmFyIGMgPSBsaW5lLmNoYXJBdCggZW5kICk7XG5cdFx0XHRcdFx0XHRpZiAoIGMgPT09ICcoJyApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdFx0XHRcdGVtYmVkZGVkLnB1c2goIHsgc3RhcnQ6IGVuZCArIDEsIG5hbWU6IGN1cnJlbnROYW1lfSApXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIGlmICggYyA9PSAnKScgKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRjb3VudC0tO1xuXHRcdFx0XHRcdFx0XHRpZiAoIGNvdW50ID09IDAgKVxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRlbWJlZGRlZFsgY291bnQgXS5lbmQgPSBlbmQ7XG5cdFx0XHRcdFx0XHRcdFx0ZW1iZWRkZWRbIGNvdW50IF0ubmFtZSA9IGN1cnJlbnROYW1lO1xuXHRcdFx0XHRcdFx0XHRcdGVtYmVkZGVkWyBjb3VudCBdLnN0YXJ0TmFtZSA9IHN0YXJ0TmFtZTtcblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50TmFtZSA9ICcnO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIGlmICggdGhpcy5hd2kudXRpbGl0aWVzLmdldENoYXJhY3RlclR5cGUoIGMgKSA9PSAnbGV0dGVyJyApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGlmICggY3VycmVudE5hbWUgPT0gJycgKVxuXHRcdFx0XHRcdFx0XHRcdHN0YXJ0TmFtZSA9IGVuZDtcblx0XHRcdFx0XHRcdFx0Y3VycmVudE5hbWUgKz0gYztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVuZCsrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIGNvdW50IClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVtYmVkZGVkWyAwIF0uZW5kID0gZW5kO1xuXHRcdFx0XHRcdGZvciAoIHZhciBlID0gZW1iZWRkZWQubGVuZ3RoIC0gMTsgZSA+PSAwOyBlLS0gKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHZhciBlbWJlZCA9IGVtYmVkZGVkWyBlIF07XG5cdFx0XHRcdFx0XHR2YXIgd29yZCA9IGdldFdvcmQoIGVtYmVkLm5hbWUgKTtcblx0XHRcdFx0XHRcdGlmICggIXdvcmQgKVxuXHRcdFx0XHRcdFx0XHRsaW5lID0gJyc7XG5cdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHZhciBjb21tYW5kID0gJyc7XG5cdFx0XHRcdFx0XHRcdHZhciBwYXJhbWV0ZXIgPSBsaW5lLnN1YnN0cmluZyggZW1iZWQuc3RhcnQsIGVtYmVkLmVuZCApO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHdvcmQuaW5UeXBlIClcblx0XHRcdFx0XHRcdFx0XHRwYXJhbWV0ZXIgPSB3b3JkLmluVHlwZSArICcoJyArIHBhcmFtZXRlciArICcpJztcblx0XHRcdFx0XHRcdFx0aWYgKCB3b3JkLm91dFR5cGUgKVxuXHRcdFx0XHRcdFx0XHRcdGNvbW1hbmQgPSB3b3JkLm91dFR5cGUgKyAnKCcgKyB3b3JkLnRva2VuICsgJygnICsgcGFyYW1ldGVyICsgJykpJ1xuXHRcdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdFx0Y29tbWFuZCA9IHdvcmQudG9rZW4gKyAnKCcgKyBwYXJhbWV0ZXIgKyAnKSc7XG5cdFx0XHRcdFx0XHRcdHZhciBlbmQgPSBlbWJlZC5lbmQgKyAxO1xuXHRcdFx0XHRcdFx0XHR2YXIgZGVsdGEgPSBjb21tYW5kLmxlbmd0aCAtICggZW5kIC0gZW1iZWQuc3RhcnROYW1lICk7XG5cdFx0XHRcdFx0XHRcdGZvciAoIHZhciBlZSA9IGUgLSAxOyBlZSA+PSAwOyBlZS0tIClcblx0XHRcdFx0XHRcdFx0XHRlbWJlZGRlZFsgZWUgXS5lbmQgKz0gZGVsdGE7XG5cdFx0XHRcdFx0XHRcdGxpbmUgPSBsaW5lLnN1YnN0cmluZyggMCwgZW1iZWQuc3RhcnROYW1lICkgKyBjb21tYW5kICsgbGluZS5zdWJzdHJpbmcoIGVuZCApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxpbmU7XG5cdFx0fVxuXHRcdGxpbmUgPSBzY2FuKCBsaW5lICk7XG5cdFx0aWYgKCBsaW5lID09ICcnIClcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBkYXRhOiByZXN1bHQsIGVycm9yOiAnYXdpOmludmFsaWQtZXhwcmVzc2lvbjppd2EnIH07XG5cblx0XHR2YXIgcmVzdWx0O1xuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHJlc3VsdCA9IGV2YWwoIGxpbmUgKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKCBlIClcblx0XHR7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZGF0YTogcmVzdWx0LCBlcnJvcjogJ2F3aTppbnZhbGlkLWV4cHJlc3Npb246aXdhJyB9O1xuXHRcdH1cblx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB0aGlzLmF3aS5jb25maWcucm91bmRWYWx1ZSggcmVzdWx0ICkgfTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQ29ubmVjdG9yID0gQ29ubmVjdG9yTGFuZ3VhZ2VKYXZhc2NyaXB0O1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktY29ubmVjdG9yLXN5c3RlbXMtbW9iaWxlLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDAzLzA4LzIwMjNcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBDb25uZWN0b3IgdG8gcGhvbmVzXG4qL1xudmFyIGF3aWNvbm5lY3RvciA9IHJlcXVpcmUoICcuLi9hd2ktY29ubmVjdG9yJyApO1xuXG5jbGFzcyBDb25uZWN0b3JTeXN0ZW1Nb2JpbGUgZXh0ZW5kcyBhd2ljb25uZWN0b3IuQ29ubmVjdG9yXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ01vYmlsZSc7XG5cdFx0dGhpcy50b2tlbiA9ICdtb2JpbGUnO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ3N5c3RlbSc7XG5cdFx0dGhpcy52ZXJzaW9uID0gJzAuNSc7XG5cdFx0dGhpcy5jb3JlID0gbnVsbDtcblx0XHR0aGlzLmZzID0gbnVsbDtcblx0fVxuXHRxdWl0KClcblx0e1xuXHRcdHByb2Nlc3MuZXhpdCggMCApO1xuXHR9XG5cdGFzeW5jIGNvbm5lY3QoIG9wdGlvbnMgKVxuXHR7XG5cdFx0c3VwZXIuY29ubmVjdCggb3B0aW9ucyApO1xuXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdC8vaW1wb3J0KCAnQGNhcGFjaXRvci9jb3JlJyApLnRoZW4oICggZXhwICkgPT4ge1xuXHRcdC8vXHRzZWxmLmNvcmUgPSBleHA7XG5cdFx0Ly99KVxuXHRcdGltcG9ydCggJ0BjYXBhY2l0b3IvZmlsZXN5c3RlbScgKS50aGVuKCAoIGV4cCApID0+IHtcblx0XHRcdHNlbGYuZnMgPSBleHA7XG5cdFx0fSApO1xuXHRcdHRoaXMuY29ubmVjdEFuc3dlci5kYXRhLnRva2VuID0gdGhpcy5jbGFzc25hbWU7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKCAoIHJlc29sdmUgKSA9PlxuXHRcdHtcblx0XHRcdHZhciBoYW5kbGUgPSBzZXRJbnRlcnZhbCggZnVuY3Rpb24oKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoIHNlbGYuZnMgIT0gbnVsbCApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjbGVhckludGVydmFsKCBoYW5kbGUgKTtcblx0XHRcdFx0XHRyZXNvbHZlKCBzZWxmLmNvbm5lY3RBbnN3ZXIgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgMSApO1xuXHRcdH0gKTtcblx0fVxuXHRhc3luYyBnZXRBc3NldFR5cGUoIG5hbWVzIClcblx0e1xuXHRcdGlmICggdHlwZW9mIG5hbWVzID09ICd1bmRlZmluZWQnIHx8IG5hbWVzLmxlbmd0aCA9PSAwIClcblx0XHRcdHJldHVybiBudWxsO1xuXG5cdFx0aWYgKCB0eXBlb2YgbmFtZXMgPT0gJ3N0cmluZycgKVxuXHRcdHtcblx0XHRcdHZhciBmb3VuZCA9IHRoaXMuYXdpLnBhcnNlci5maW5kV29yZERlZmluaXRpb24oIHRoaXMuYXNzZXRUeXBlcy5uYW1lcywgbmFtZXMsICdmaW5kJyApOztcblx0XHRcdGlmICggZm91bmQgKVxuXHRcdFx0XHRyZXR1cm4gdGhpcy5hc3NldFR5cGVzWyBuYW1lcyBdO1xuXHRcdFx0Zm9yICggdmFyIHMgaW4gdGhpcy5hc3NldFR5cGVzIClcblx0XHRcdHtcblx0XHRcdFx0Zm91bmQgPSB0aGlzLmFzc2V0VHlwZXNbIHMgXS5maWx0ZXJzLmZpbmRJbmRleChcblx0XHRcdFx0XHRmdW5jdGlvbiggZWxlbWVudCApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dmFyIGZpbHRlciA9IGVsZW1lbnQuc3Vic3RyaW5nKCBlbGVtZW50Lmxhc3RJbmRleE9mKCAnLicgKSApO1xuXHRcdFx0XHRcdFx0cmV0dXJuICggbmFtZXMuaW5kZXhPZiggZmlsdGVyICkgPj0gMCApO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0aWYgKCBmb3VuZCA+PSAwIClcblx0XHRcdFx0XHRyZXN1bHQucHVzaCggdGhpcy5hc3NldFR5cGVzWyBmb3VuZCBdICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0Zm9yICggdmFyIHMgaW4gdGhpcy5hc3NldFR5cGVzIClcblx0XHR7XG5cdFx0XHR2YXIgYXNzZXRUeXBlID0gdGhpcy5hc3NldFR5cGVzWyBzIF07XG5cdFx0XHRmb3IgKCB2YXIgbiA9IDA7IG4gPCBuYW1lcy5sZW5ndGg7IG4rKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBmb3VuZCA9IHRoaXMuYXdpLnBhcnNlci5maW5kV29yZERlZmluaXRpb24oIGFzc2V0VHlwZS5uYW1lcywgbmFtZXNbIG4gXSwgJ2ZpbmQnICk7O1xuXHRcdFx0XHRpZiAoIGZvdW5kIClcblx0XHRcdFx0XHRyZXR1cm4gYXNzZXRUeXBlO1xuXHRcdFx0XHR2YXIgZXh0ID0gbmFtZXNbIG4gXS5zdWJzdHJpbmcoIG5hbWVzWyBuIF0ubGFzdEluZGV4T2YoICcuJyApICk7XG5cdFx0XHRcdHZhciBmb3VuZCA9IGFzc2V0VHlwZS5maWx0ZXJzLmZpbmRJbmRleChcblx0XHRcdFx0XHRmdW5jdGlvbiggZWxlbWVudCApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dmFyIGZpbHRlciA9IGVsZW1lbnQuc3Vic3RyaW5nKCBlbGVtZW50Lmxhc3RJbmRleE9mKCAnLicgKSApO1xuXHRcdFx0XHRcdFx0cmV0dXJuICggZmlsdGVyLmluZGV4T2YoIGV4dCApID49IDAgKTtcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdHJldHVybiBhc3NldFR5cGU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0YXN5bmMgZ2V0RGlyZWN0b3J5KCBwYXRoLCBvcHRpb25zIClcblx0e1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRhc3luYyBmdW5jdGlvbiBnZXREaXIoIHBhdGgsIG9wdGlvbnMsIHBhcmVudCApXG5cdFx0e1xuXHRcdFx0dmFyIHJlc3VsdCA9IFtdO1xuXHRcdFx0cGF0aCA9IHNlbGYuYXdpLnV0aWxpdGllcy5ub3JtYWxpemUoIHBhdGggKTtcblxuXHRcdFx0dmFyIGFuc3dlciA9IGF3YWl0IHNlbGYucmVhZGRpciggcGF0aCArICcvJyApO1xuXHRcdFx0aWYgKCAhYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdHZhciBmaWxlcyA9IGFuc3dlci5kYXRhO1xuXHRcdFx0aWYgKCBmaWxlcyApXG5cdFx0XHR7XG5cdFx0XHRcdGZvciAoIHZhciBmID0gMDsgZiA8IGZpbGVzLmxlbmd0aDsgZisrIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBzUGF0aCA9IHBhdGggKyAnLycgKyBmaWxlc1sgZiBdO1xuXHRcdFx0XHRcdHZhciBzdGF0cyA9IGF3YWl0IHNlbGYuc3RhdCggc1BhdGggKTtcblx0XHRcdFx0XHRpZiAoIHN0YXRzLmRhdGEgKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHN0YXRzID0gc3RhdHMuZGF0YTtcblx0XHRcdFx0XHRcdGlmICggIXN0YXRzLmlzRGlyZWN0b3J5KCkgKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRpZiAoICFvcHRpb25zLmV4Y2x1ZGVzIHx8ICggb3B0aW9ucy5leGNsdWRlcyAmJiAhc2VsZi5maWx0ZXJGaWxlbmFtZSggc1BhdGgsIG9wdGlvbnMuZXhjbHVkZXMgKSApIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdGlmICggIW9wdGlvbnMuZmlsdGVycyB8fCAoIG9wdGlvbnMuZmlsdGVycyAmJiBzZWxmLmF3aS51dGlsaXRpZXMuZmlsdGVyRmlsZW5hbWUoIHNQYXRoLCBvcHRpb25zLmZpbHRlcnMgKSApIClcblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXN1bHQucHVzaChcblx0XHRcdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmFtZTogZmlsZXNbIGYgXSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0cGF0aDogc1BhdGgsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlzRGlyZWN0b3J5OiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0c2l6ZTogc3RhdHMuc2l6ZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3RhdHM6IHN0YXRzLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRwYXJlbnQ6IHBhcmVudFxuXHRcdFx0XHRcdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRpZiAoIG9wdGlvbnMucmVjdXJzaXZlIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHZhciBuZXdGaWxlID1cblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRuYW1lOiBmaWxlc1sgZiBdLFxuXHRcdFx0XHRcdFx0XHRcdFx0cGF0aDogc1BhdGgsXG5cdFx0XHRcdFx0XHRcdFx0XHRpc0RpcmVjdG9yeTogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRcdGZpbGVzOiBudWxsLFxuXHRcdFx0XHRcdFx0XHRcdFx0cGFyZW50OiBwYXJlbnRcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdHZhciBuZXdSZXN1bHQgPSBhd2FpdCBnZXREaXIoIHNQYXRoLCBvcHRpb25zLCBuZXdGaWxlICk7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAhb3B0aW9ucy5vbmx5RmlsZXMgKVxuXHRcdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRcdG5ld0ZpbGUuZmlsZXMgPSBuZXdSZXN1bHQ7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXN1bHQucHVzaCggbmV3RmlsZSApO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRlbHNlIGlmICggbmV3UmVzdWx0Lmxlbmd0aCA+IDAgKVxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzdWx0LnB1c2goIG5ld1Jlc3VsdCApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdGlmICggIW9wdGlvbnMub25seUZpbGVzIClcblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXN1bHQucHVzaChcblx0XHRcdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0bmFtZTogZmlsZXNbIGYgXSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0cGF0aDogc1BhdGgsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlzRGlyZWN0b3J5OiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxlczogW10sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBhcmVudDogcGFyZW50XG5cdFx0XHRcdFx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0XHR2YXIgdHJlZSA9IGF3YWl0IGdldERpciggcGF0aCwgb3B0aW9ucyApO1xuXHRcdGlmICggdHJlZSApXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB0cmVlIH07XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnYXdpOmRpcmVjdG9yeS1ub3QtZm91bmQ6aXdhJyB9O1xuXHR9XG5cdGFzeW5jIGdldEFwcGxpY2F0aW9ucyggZmlsZSApXG5cdHtcblx0XHR2YXIgc29mdHdhcmVzID0gZmV0Y2hpbnN0YWxsZWRzb2Z0d2FyZS5nZXRBbGxJbnN0YWxsZWRTb2Z0d2FyZVN5bmMoKTtcblx0XHRmb3IgKCB2YXIgcyA9IDA7IHMgPCBzb2Z0d2FyZXMubGVuZ3RoOyBzKysgKVxuXHRcdHtcblx0XHRcdHZhciBzb2Z0d2FyZSA9IHNvZnR3YXJlc1sgcyBdO1xuXHRcdFx0aWYgKCB0eXBlb2Ygc29mdHdhcmUuRGlzcGxheUljb24gIT0gJ3VuZGVmaW5lZCcgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgcGF0aCA9IHRoaXMuYXdpLnV0aWxpdGllcy5ub3JtYWxpemUoIHNvZnR3YXJlLkRpc3BsYXlJY29uICk7XG5cdFx0XHRcdGlmICggcGF0aC50b0xvd2VyQ2FzZSgpLmluZGV4T2YoIGZpbGVuYW1lLnRvTG93ZXJDYXNlKCkgKSA+PSAwIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBleHQgPSB0aGlzLmF3aS51dGlsaXRpZXMuZXh0bmFtZSggcGF0aCApLnN1YnN0cmluZyggMSApLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFx0aWYgKCB0aGlzLmdldEZpbGVUeXBlKCBleHQsICdleGVjdXRhYmxlJyApLnN1Y2Nlc3MgKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHZhciBmaWxlID0gYXdhaXQgdGhpcy5hd2kudXRpbGl0aWVzLmdldEZpbGVJbmZvKCBwYXRoICk7XG5cdFx0XHRcdFx0XHRpZiAoIGZpbGUgKVxuXHRcdFx0XHRcdFx0XHRmb3VuZC5wdXNoKCBmaWxlICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGFzeW5jIGFza0ZvckZpbGVwYXRocyggZmlsZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgcGF0aHMgPSBhd2FpdCB0aGlzLmF3aS5jb25maWcuZ2V0RGVmYXVsdFBhdGhzKCBmaWxlICk7XG5cdFx0dmFyIHBhcmFtID0gYXdhaXQgdGhpcy5hd2kucHJvbXB0LmdldFBhcmFtZXRlcnMoIFtcblx0XHRcdHsgY2hvaWNlOiAndGhlIGRpZmZlcmVudCBwYXRocyB0byB0aGUgZm9sZGVyIGNvbnRhaW5pbmcgJyArIGZpbGUubmFtZXNbIDAgXSArICdzLicsIHR5cGU6ICdhcnJheS5zdHJpbmcnLCBkZWZhdWx0OiBbIHBhdGhzWyAwIF0gXSB9LFxuXHRcdFx0XSwgY29udHJvbCApO1xuXHRcdGlmICggcGFyYW0uc3VjY2VzcyApXG5cdFx0e1xuXHRcdFx0ZmlsZS5wYXRocyA9IHBhcmFtLmRhdGEuY2hvaWNlO1xuXHRcdFx0dGhpcy5hd2kuY29uZmlnLmdldENvbmZpZyggJ3VzZXInICkucGF0aHNbIHRoaXMuYXdpLmNvbmZpZy5wbGF0Zm9ybSBdWyBmaWxlLm5hbWVzWyAwIF0gXSA9IHBhcmFtLmRhdGEuY2hvaWNlO1xuXHRcdH1cblx0fVxuXHRhc3luYyBmaW5kRmlsZXMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIGZvdW5kID0gW107XG5cdFx0dmFyIGZpbGUgPSBwYXJhbWV0ZXJzLmZpbGU7XG5cdFx0c3dpdGNoICggZmlsZS5uYW1lc1sgMCBdIClcblx0XHR7XG5cdFx0XHRjYXNlICdhcHBsaWNhdGlvbic6XG5cdFx0XHRcdGZvdW5kID0gYXdhaXQgdGhpcy5nZXRBcHBsaWNhdGlvbnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdhb3phY2Nlc3NvcnknOlxuXHRcdFx0XHRmb3VuZCA9IGF3YWl0IHRoaXMuY29ubmVjdG9ycy5sYW5ndWFnZXMuYW96YmFzaWMuZ2V0QWNjZXNzb3JpZXMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRpZiAoIGZpbGUucGF0aHMubGVuZ3RoID09IDAgKVxuXHRcdFx0XHRcdGF3YWl0IHRoaXMuYXNrRm9yRmlsZXBhdGhzKCBmaWxlLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0XHRcdGlmICggZmlsZS5wYXRocy5sZW5ndGggKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Zm9yICggdmFyIHAgPSAwOyBwIDwgZmlsZS5wYXRocy5sZW5ndGg7IHArKyApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLnN5c3RlbS5nZXREaXJlY3RvcnkoIGZpbGUucGF0aHNbIHAgXSwgeyBvbmx5RmlsZXM6IGZhbHNlLCByZWN1cnNpdmU6IHRydWUsIGZpbHRlcnM6IGZpbGUuZmlsdGVycyB9ICk7XG5cdFx0XHRcdFx0XHRpZiAoIGFuc3dlci5kYXRhIClcblx0XHRcdFx0XHRcdFx0Zm91bmQucHVzaCggLi4udGhpcy5hd2kudXRpbGl0aWVzLmdldEZpbGVBcnJheUZyb21UcmVlKCBhbnN3ZXIuZGF0YSApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0XHRpZiAoIHR5cGVvZiBwYXJhbWV0ZXJzLmRhdGUgIT0gJ3VuZGVmaW5lZCcgJiYgcGFyYW1ldGVycy5kYXRlLmxlbmd0aCApXG5cdFx0e1xuXHRcdFx0dmFyIG5ld0ZvdW5kID0gW107XG5cdFx0XHRmb3IgKCB2YXIgZiA9IDA7IGYgPCBmb3VuZC5sZW5ndGg7IGYrKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBmaWxlID0gZm91bmRbIGYgXTtcblx0XHRcdFx0Zm9yICggdmFyIGQgPSAwOyBkIDwgcGFyYW1ldGVycy5kYXRlLmxlbmd0aDsgZCsrIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICggdGhpcy5hd2kudGltZS5pc1N0YXRzV2l0aGluRGF0ZSggZmlsZS5zdGF0cywgcGFyYW1ldGVycy5kYXRlWyBkIF0gKSApXG5cdFx0XHRcdFx0XHRuZXdGb3VuZC5wdXNoKCBmaWxlICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGZvdW5kID0gbmV3Rm91bmQ7XG5cdFx0fVxuXHRcdGlmICggdHlwZW9mIHBhcmFtZXRlcnMudGltZSAhPSAndW5kZWZpbmVkJyAmJiBwYXJhbWV0ZXJzLnRpbWUubGVuZ3RoIClcblx0XHR7XG5cdFx0XHR2YXIgbmV3Rm91bmQgPSBbXTtcblx0XHRcdGZvciAoIHZhciBmID0gMDsgZiA8IGZvdW5kLmxlbmd0aDsgZisrIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGZpbGUgPSBmb3VuZFsgZiBdO1xuXHRcdFx0XHRmb3IgKCB2YXIgZCA9IDA7IGQgPCBwYXJhbWV0ZXJzLnRpbWUubGVuZ3RoOyBkKysgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCB0aGlzLmF3aS50aW1lLmlzU3RhdHNXaXRoaW5EYXRlKCBmaWxlLnN0YXRzLCBwYXJhbWV0ZXJzLnRpbWUgKSApXG5cdFx0XHRcdFx0XHRuZXdGb3VuZC5wdXNoKCBmaWxlICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGZvdW5kID0gbmV3Rm91bmQ7XG5cdFx0fVxuXHRcdGZvciAoIHZhciBmID0gMDsgZiA8IGZvdW5kLmxlbmd0aDsgZisrIClcblx0XHRcdGZvdW5kWyBmIF0uZmlsZSA9IGZpbGU7XG5cdFx0ZmlsZS5saXN0ID0gZm91bmQ7XG5cdFx0aWYgKCBmb3VuZC5sZW5ndGggPT0gMCApXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6ZmlsZS1ub3QtZm91bmQ6aXdhJyB9O1xuXHRcdGlmICggZm91bmQubGVuZ3RoID09IDEgKVxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogJzEnLCBkYXRhOiBmb3VuZCB9O1xuXHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGZvdW5kIH07XG5cdH1cblx0YXN5bmMgaW1wb3J0RmlsZSggYnViYmxlLCBmaWxlLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0dmFyIGV4dCwgcGF0aDtcblx0XHRpZiAoIHR5cGVvZiBmaWxlICE9ICdzdHJpbmcnIClcblx0XHRcdHBhdGggPSB0aGlzLmF3aS51dGlsaXRpZXMubm9ybWFsaXplKCBmaWxlLnBhdGggKTtcblx0XHRlbHNlXG5cdFx0XHRwYXRoID0gZmlsZTtcblx0XHRpZiAoICFvcHRpb25zLnRvQXNzZXRzIClcblx0XHR7XG5cdFx0XHRleHQgPSB0aGlzLmF3aS51dGlsaXRpZXMuZXh0bmFtZSggcGF0aCApLnRvTG93ZXJDYXNlKCkuc3Vic3RyaW5nKCAxICk7XG5cdFx0XHRpZiAoIGV4dCA9PSAnJyB8fCAhdGhpcy50eXBlc1sgZXh0IF0gKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnByaW50KCBidWJibGUsIFsgJ0Nhbm5vdCBpbXBvcnQgdGhlIGZpbGUuLi4nIF0gKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlXG5cdFx0XHRleHQgPSAnX2Fzc2V0c18nO1xuXHRcdHZhciBleGlzdDtcblx0XHR2YXIgY291bnQgPSAwO1xuXHRcdHZhciBkZXN0aW5hdGlvblBhdGg7XG5cdFx0ZG9cblx0XHR7XG5cdFx0XHRkZXN0aW5hdGlvblBhdGggPSB0aGlzLmF3aS51dGlsaXRpZXMubm9ybWFsaXplKCB0aGlzLmF3aS51dGlsaXRpZXMuZGlybmFtZSggdGhpcy5hd2kuc3lzdGVtLmdldFBhdGgoKSApICsgdGhpcy50eXBlc1sgZXh0IF0uaW1wb3J0VG9bIGNvdW50IF0gKTtcblx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLmF3aS5zeXN0ZW0uZXhpc3RzKCBkZXN0aW5hdGlvblBhdGggKTtcblx0XHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0e1xuXHRcdFx0XHRleGlzdCA9IHRydWU7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0Y291bnQrKztcblx0XHR9IHdoaWxlICggY291bnQgPCB0aGlzLnR5cGVzWyBleHQgXS5pbXBvcnRUby5sZW5ndGggIClcblx0XHRpZiAoICFleGlzdCApXG5cdFx0e1xuXHRcdFx0aWYgKCAhb3B0aW9ucy5ub0Vycm9ycyApXG5cdFx0XHRcdHRoaXMucHJpbnQoIGJ1YmJsZSwgWyAnYXdpOmRpcmVjdG9yeS1ub3QtZm91bmQ6aXdhJyBdICk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLmF3aS5zeXN0ZW0uY29weUZpbGUoIHBhdGgsIHRoaXMuYXdpLnV0aWxpdGllcy5ub3JtYWxpemUoIGRlc3RpbmF0aW9uUGF0aCArICcvJyArIHRoaXMuYXdpLnV0aWxpdGllcy5iYXNlbmFtZSggcGF0aCApICkgKTtcblx0XHRpZiAoICFhbnN3ZXIuZXJyb3IgKVxuXHRcdHtcblx0XHRcdGlmICggIW9wdGlvbnMubm9FcnJvcnMgKVxuXHRcdFx0XHR0aGlzLnByaW50KCBidWJibGUsIGFuc3dlci5kYXRhICk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHZhciByZXN1bHQgPSAnRmlsZSBpbXBvcnRlZCBzdWNjZXNzZnVsbHkuJyArIHRoaXMudHlwZXNbIGV4dCBdLmRpc3BsYXlOYW1lO1xuXHRcdHRoaXMucHJpbnQoIGJ1YmJsZSwgWyByZXN1bHQgXSApO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdGdldFZhcnNQYXRoKCBwYXRoLCB2YXJzID0ge30gKVxuXHR7XG5cdFx0dmFyIHN0YXJ0ID0gcGF0aC5pbmRleE9mKCAneycgKTtcblx0XHR3aGlsZSggc3RhcnQgPj0gMCApXG5cdFx0e1xuXHRcdFx0dmFyIHJlcGxhY2UgPSAnJztcblx0XHRcdHZhciBlbmQgPSBwYXRoLmluZGV4T2YoICd9Jywgc3RhcnQgKTtcblx0XHRcdHZhciB0b2tlbiA9IHBhdGguc3Vic3RyaW5nKCBzdGFydCArIDEsIGVuZCApO1xuXHRcdFx0aWYgKCB2YXJzWyB0b2tlbiBdIClcblx0XHRcdFx0cmVwbGFjZSA9IHZhcnNbIHRva2VuIF07XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHN3aXRjaCAoIHRva2VuIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRyZXBsYWNlID0gJyc7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cGF0aCA9IHBhdGguc3Vic3RyaW5nKCAwLCBzdGFydCApICsgcmVwbGFjZSArIHBhdGguc3Vic3RyaW5nKCBlbmQgKyAxICk7XG5cdFx0XHRzdGFydCA9IHBhdGguaW5kZXhPZiggJ3snICk7XG5cdFx0fVxuXHRcdHJldHVybiBwcGF0aC5ub3JtYWxpemUoIHBhdGggKTtcblx0fVxuXHRhc3luYyBwbGF5RmlsZSggZmlsZSwgYWN0aW9uLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBzdGRPdXQgPSAnJztcblx0XHR2YXIgc3RkRXJyID0gJyc7XG5cdFx0dmFyIGluZm8gPSB0aGlzLmF3aS51dGlsaXRpZXMucGFyc2UoIGZpbGUucGF0aCApO1xuXHRcdHZhciB2YXJzID1cblx0XHR7XG5cdFx0XHRyb290OiBpbmZvLnJvb3QsXG5cdFx0XHRkaXI6IGluZm8uZGlyLFxuXHRcdFx0YmFzZTogaW5mby5iYXNlLFxuXHRcdFx0ZXh0OiBpbmZvLmV4dCxcblx0XHRcdG5hbWU6IGluZm8ubmFtZSxcblx0XHRcdGZpbGU6IGluZm8uZGlyICsgJy8nICsgaW5mby5uYW1lICsgaW5mby5leHQsXG5cdFx0fVxuXHRcdHZhciBydW5JbmZvID0gdGhpcy5hd2kuY29uZmlnLmdldFN5c3RlbSgpLmNvbW1hbmRzWyB0aGlzLmF3aS5jb25maWcucGxhdGZvcm0gXTtcblx0XHR2YXIgYWN0aW9uSW5mbyA9IHJ1bkluZm9bIGZpbGUuZmlsZS5uYW1lc1sgMCBdIF07XG5cdFx0aWYgKCBhY3Rpb25JbmZvIClcblx0XHR7XG5cdFx0XHRhY3Rpb25JbmZvID0gYWN0aW9uSW5mb1sgYWN0aW9uIF07XG5cdFx0XHRzd2l0Y2ggKCBhY3Rpb25JbmZvLnR5cGUgKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXNlICdleGVjJzpcblx0XHRcdFx0XHR2YXIgcmVzdWx0ID0gZmFsc2U7XG5cdFx0XHRcdFx0dmFyIGN3ZCA9IHRoaXMuZ2V0VmFyc1BhdGgoIGFjdGlvbkluZm8uY3dkLCB2YXJzICk7XG5cdFx0XHRcdFx0dmFyIGNvbW1hbmQgPSB0aGlzLmdldFZhcnNQYXRoKCBhY3Rpb25JbmZvLmNvbW1hbmQsIHZhcnMgKTtcblx0XHRcdFx0XHR2YXIgcHJvY2VzcyA9IGV4ZWMoIGNvbW1hbmQsIHsgY3dkOiBjd2QgfSxcblx0XHRcdFx0XHRcdGZ1bmN0aW9uKCBlcnJvciwgc3Rkbywgc3RkZSApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGlmICggIWVycm9yIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHJlc3VsdCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBzdGRlIClcblx0XHRcdFx0XHRcdFx0XHRcdHN0ZEVyciArPSBzdGRlO1xuXHRcdFx0XHRcdFx0XHRcdGlmICggc3RkbyApXG5cdFx0XHRcdFx0XHRcdFx0XHRzdGRPdXQgKz0gc3Rkbztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdFx0cmVzdWx0ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0aWYgKCBwcm9jZXNzIClcblx0XHRcdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHt9IH07XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSAnc3RhcnRiYXQnOlxuXHRcdFx0XHRcdHZhciByZXN1bHQgPSBmYWxzZTtcblx0XHRcdFx0XHR2YXIgY3dkID0gdGhpcy5nZXRWYXJzUGF0aCggYWN0aW9uSW5mby5jd2QsIHZhcnMgKTtcblx0XHRcdFx0XHR2YXIgY29tbWFuZCA9IHRoaXMuZ2V0VmFyc1BhdGgoIGFjdGlvbkluZm8uY29tbWFuZCwgdmFycyApO1xuXHRcdFx0XHRcdGNvbW1hbmQgPSBwcGF0aC5ub3JtYWxpemUoIHRoaXMuYXdpLmNvbmZpZy5nZXREYXRhUGF0aCgpICsgJy9zdGFydC5iYXQgJyArIGNvbW1hbmQgKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyggJ2NvbW1hbmQ6ICcgKyBjb21tYW5kICk7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coICdjd2Q6ICcgKyBjd2QgKTtcblx0XHRcdFx0XHR2YXIgcHJvY2VzcyA9IGV4ZWMoIGNvbW1hbmQsIHsgY3dkOiBjd2QgfSxcblx0XHRcdFx0XHRcdGZ1bmN0aW9uKCBlcnJvciwgc3Rkbywgc3RkZSApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGlmICggIWVycm9yIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHJlc3VsdCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBzdGRlIClcblx0XHRcdFx0XHRcdFx0XHRcdHN0ZEVyciArPSBzdGRlO1xuXHRcdFx0XHRcdFx0XHRcdGlmICggc3RkbyApXG5cdFx0XHRcdFx0XHRcdFx0XHRzdGRPdXQgKz0gc3Rkbztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdFx0cmVzdWx0ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0aWYgKCBwcm9jZXNzIClcblx0XHRcdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHBhdGggfTtcblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6ZmlsZS1jYW5ub3QtYmUtcGxheWVkOml3YScgfTtcblx0fVxuXHRhc3luYyBnZXRQYXRocyggZmlsZSApXG5cdHtcblx0XHRpZiAoIHRoaXMuYXdpLmNvbmZpZy5nZXRDb25maWcoICd1c2VyJyApLnBhdGhzWyB0aGlzLmF3aS5jb25maWcucGxhdGZvcm0gXSApXG5cdFx0XHRyZXR1cm4gdGhpcy5hd2kuY29uZmlnLmdldENvbmZpZyggJ3VzZXInICkucGF0aHNbIHRoaXMuYXdpLmNvbmZpZy5wbGF0Zm9ybSBdWyBmaWxlLm5hbWVzWyAwIF0gXTtcblx0XHRyZXR1cm4gW107XG5cdH1cblx0Z2V0RmlsZVR5cGUoIHBhdGggKVxuXHR7XG5cdFx0cGF0aCA9IHRoaXMuYXdpLnV0aWxpdGllcy5ub3JtYWxpemUoIHBhdGggKTtcblx0XHRpZiAoIHBhdGguaW5kZXhPZiggJy8nICkgPj0gMCB8fCBwYXRoLmluZGV4T2YoICc6JyApID49IDAgKVxuXHRcdFx0cmV0dXJuICdhbnknO1xuXG5cdFx0dmFyIGV4dCA9IHRoaXMuYXdpLnV0aWxpdGllcy5leHRuYW1lKCBwYXRoICkudG9Mb3dlckNhc2UoKTtcblx0XHRpZiAoICFleHQgKVxuXHRcdFx0cmV0dXJuICdhbnknO1xuXG5cdFx0dmFyIHBhdGhzID0gdGhpcy5hd2kuY29uZmlnLnN5c3RlbS5wYXRocztcblx0XHRmb3IgKCB2YXIgdCBpbiBwYXRocyApXG5cdFx0e1xuXHRcdFx0dmFyIHR5cGVJbmZvID0gcGF0aHNbIHQgXTtcblx0XHRcdGZvciAoIHZhciBmID0gMDsgZiA8IHR5cGVJbmZvLmZpbHRlcnMubGVuZ3RoOyBmKysgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgZmlsdGVyID0gdHlwZUluZm8uZmlsdGVyc1sgZiBdLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdGlmICggZmlsdGVyLmluZGV4T2YoIGV4dCApID49IDAgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cmV0dXJuIHQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuICdhbnknO1xuXHR9XG5cdGdldEZpbGVGaWx0ZXJzKCB0eXBlIClcblx0e1xuXHRcdHZhciBwYXRocyA9IHRoaXMuYXdpLmNvbmZpZy5zeXN0ZW0ucGF0aHM7XG5cdFx0aWYgKCBwYXRoc1sgdHlwZSBdIClcblx0XHRcdHJldHVybiBwYXRoc1sgdHlwZSBdLmZpbHRlcnM7XG5cdFx0cmV0dXJuIHBhdGhzWyAnYW55JyBdLmV4dGVuc2lvbnM7XG5cdH1cblx0aXNGaWxlT2ZUeXBlKCBwYXRoLCB0eXBlIClcblx0e1xuXHRcdHJldHVybiB0eXBlID0gdGhpcy5nZXRGaWxlVHlwZSggcGF0aCApO1xuXHR9XG5cdGFzeW5jIGV4dHJhY3RBdWRpbyggc291cmNlUGF0aCwgZGVzdGluYXRpb25QYXRoLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0b3B0aW9ucy5pbnB1dCA9IHNvdXJjZVBhdGg7XG5cdFx0XHRvcHRpb25zLm91dHB1dCA9IGRlc3RpbmF0aW9uUGF0aDtcblx0XHRcdC8vYXdhaXQgZXh0cmFjdGF1ZGlvKCBvcHRpb25zICk7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBkZXN0aW5hdGlvblBhdGggfTtcblx0XHR9XG5cdFx0Y2F0Y2goIGUgKVxuXHRcdHtcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBkYXRhOiAnYXdpOmVycm9yLXdoaWxlLWV4dHJhY3RpbmctYXVkaW86aXdhJyB9O1xuXHRcdH1cblx0fVxuXHRhc3luYyBydW5BY2Nlc3NvcnkoIHBhdGgsIG9wdGlvbnMgKVxuXHR7XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnYXdpOm5vLWFjY2Vzc29yaWVzLW9uLXRoaXMtc3lzdGVtOml3YXMnIH07XG5cdH1cblx0YXN5bmMgZ2V0QWNjZXNzb3J5TGlzdCggcGF0aCwgb3B0aW9ucyApXG5cdHtcblx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6bm8tYWNjZXNzb3JpZXMtb24tdGhpcy1zeXN0ZW06aXdhcycgfTtcblx0fVxuXHRoSnNvblBhcnNlKCBoanNvblN0cmluZyApXG5cdHtcblx0XHRyZXR1cm4ganNvblBhcnNlKCBoanNvblN0cmluZyApO1xuXHR9XG5cdGhKc29uU3RyaW5naWZ5KCBvYmogKVxuXHR7XG5cdFx0cmV0dXJuIGpzb25TdHJpbmdpZnkoIG9iaiApO1xuXHR9XG5cdGpzb25QYXJzZSggaGpzb25TdHJpbmcgKVxuXHR7XG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogSlNPTi5wYXJzZSggaGpzb25TdHJpbmcgKSB9O1xuXHRcdH1cblx0XHRjYXRjaFxuXHRcdHtcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2F3aTppbGxlZ2FsLWpzb246aXdhJyB9O1xuXHRcdH1cblx0fVxuXHRqc29uU3RyaW5naWZ5KCBvYmogKVxuXHR7XG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogSlNPTi5zdHJpbmdpZnkoIG9iaiApIH07XG5cdFx0fVxuXHRcdGNhdGNoXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnYXdpOmlsbGVnYWwtaGpzb246aXdhJyB9O1xuXHRcdH1cblx0fVxuXHRkZWNvZGVUZXh0KCB0ZXh0IClcblx0e1xuXHRcdHRleHQgPSBoZS5kZWNvZGUoIHRleHQgKTtcblx0XHR0ZXh0ID0gaGUudW5lc2NhcGUoIHRleHQgKTtcblx0XHRyZXR1cm4gdGV4dDtcblx0fVxuXG5cblxuXG5cdGFzeW5jIHJlYWRGaWxlKCBwYXRoLCBvcHRpb25zIClcblx0e1xuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHZhciBlbmNvZGluZyA9IHVuZGVmaW5lZDtcblx0XHRcdGlmICggb3B0aW9ucy5lbmNvZGluZyA9PSAndXRmOCcgKVxuXHRcdFx0XHRlbmNvZGluZyA9IEVuY29kaW5nLlVURjg7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBhd2FpdCB0aGlzLmZzLkZpbGVzeXN0ZW0ucmVhZEZpbGUoIHsgcGF0aDogcGF0aCwgZGlyZWN0b3J5OiB0aGlzLmZzLkRpcmVjdG9yeS5EYXRhLCBlbmNvZGluZzogZW5jb2RpbmcgfSApIH07XG5cdFx0fVxuXHRcdGNhdGNoKCBlIClcblx0XHR7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6ZmlsZS1ub3QtZm91bmQ6aXdhJyB9O1xuXHRcdH1cblx0fVxuXHRhc3luYyB3cml0ZUZpbGUoIHBhdGgsIGRhdGEsIG9wdGlvbnMgKVxuXHR7XG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dmFyIGVuY29kaW5nID0gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKCBvcHRpb25zLmVuY29kaW5nID09ICd1dGY4JyApXG5cdFx0XHRcdGVuY29kaW5nID0gRW5jb2RpbmcuVVRGODtcblx0XHRcdGlmICggdHlwZW9mIGRhdGEgIT0gJ3N0cmluZycgKVxuXHRcdFx0e1xuXHRcdFx0XHRkYXRhID0gdGhpcy5hd2kudXRpbGl0aWVzLmNvbnZlcnRBcnJheUJ1ZmZlclRvU3RyaW5nKCBkYXRhICk7XG5cdFx0XHRcdGVuY29kaW5nID0gRW5jb2RpbmcuVVRGODtcblx0XHRcdH1cblx0XHRcdHZhciByZXNwb25zZSA9IGF3YWl0IHRoaXMuZnMuRmlsZXN5c3RlbS53cml0ZUZpbGUoIHsgcGF0aDogcGF0aCwgZGlyZWN0b3J5OiB0aGlzLmZzLkRpcmVjdG9yeS5EYXRhLCBkYXRhOiBkYXRhLCBlbmNvZGluZzogZW5jb2RpbmcsIHJlY3Vyc2l2ZTogdHJ1ZSB9ICk7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXNwb25zZSB9O1xuXHRcdH1cblx0XHRjYXRjaCggZSApXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnYXdpOmNhbm5vdC13cml0ZS1maWxlOml3YScgfTtcblx0XHR9XG5cdH1cblx0YXN5bmMgY29weUZpbGUoIHNvdXJjZVBhdGgsIGRlc3RpbmF0aW9uUGF0aCwgb3B0aW9ucyApXG5cdHtcblx0XHR0cnlcblx0XHR7XG5cdFx0XHR2YXIgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmZzLkZpbGVzeXN0ZW0ud3JpdGVGaWxlKCB7IGZyb206IHNvdXJjZVBhdGgsIHRvOiBkZXN0aW5hdGlvblBhdGgsIGRpcmVjdG9yeTogdGhpcy5mcy5EaXJlY3RvcnkuRGF0YSwgdG9EaXJlY3Rvcnk6IHRoaXMuZnMuRGlyZWN0b3J5LkRhdGEgfSApO1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzcG9uc2UgfTtcblx0XHR9XG5cdFx0Y2F0Y2hcblx0XHR7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6Y2Fubm90LWNvcHktZmlsZTppd2EnIH07XG5cdFx0fVxuXHR9XG5cdGFzeW5jIHJlYWRkaXIoIHBhdGggKVxuXHR7XG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogYXdhaXQgdGhpcy5mcy5GaWxlc3lzdGVtLnJlYWRkaXIoIHsgcGF0aDogcGF0aCwgZGlyZWN0b3J5OiB0aGlzLmZzLkRpcmVjdG9yeS5EYXRhIH0gKSB9O1xuXHRcdH1cblx0XHRjYXRjaCggZSApXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnYXdpOmNhbm5vdC1yZWFkLWRpcmVjdG9yeTppd2EnIH07XG5cdFx0fVxuXHR9XG5cdGFzeW5jIHVubGluayggcGF0aClcblx0e1xuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGF3YWl0IHRoaXMuZnMuRmlsZXN5c3RlbS5kZWxldGVGaWxlKCB7IHBhdGg6IHBhdGgsIGRpcmVjdG9yeTogdGhpcy5mcy5EaXJlY3RvcnkuRGF0YSB9ICkgfTtcblx0XHR9XG5cdFx0Y2F0Y2hcblx0XHR7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdhd2k6Y2Fubm90LWRlbGV0ZS1maWxlOml3YScgfTtcblx0XHR9XG5cdH1cblx0YXN5bmMgcm1kaXIoIHBhdGggKVxuXHR7XG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogYXdhaXQgdGhpcy5mcy5GaWxlc3lzdGVtLnJtZGlyKCB7IHBhdGg6IHBhdGgsIGRpcmVjdG9yeTogdGhpcy5mcy5EaXJlY3RvcnkuRGF0YSwgcmVjdXJzaXZlOiB0cnVlIH0gKSB9O1xuXHRcdH1cblx0XHRjYXRjaFxuXHRcdHtcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2F3aTpjYW5ub3QtZGVsZXRlLWRpcmVjdG9yeTppd2EnIH07XG5cdFx0fVxuXHR9XG5cdGFzeW5jIHN0YXQoIHBhdGggKVxuXHR7XG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogYXdhaXQgdGhpcy5mcy5GaWxlc3lzdGVtLnN0YXQoIHsgcGF0aDogcGF0aCwgZGlyZWN0b3J5OiB0aGlzLmZzLkRpcmVjdG9yeS5EYXRhIH0gKSB9O1xuXHRcdH1cblx0XHRjYXRjaFxuXHRcdHtcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2F3aTpmaWxlLW5vdC1mb3VuZDppd2EnIH07XG5cdFx0fVxuXHR9XG5cdGFzeW5jIGV4aXN0cyggcGF0aCApXG5cdHtcblx0XHR0cnlcblx0XHR7XG5cdFx0XHR2YXIgc3RhdCA9IGF3YWl0IHRoaXMuZnMuRmlsZXN5c3RlbS5zdGF0KCB7IHBhdGg6IHBhdGgsIGRpcmVjdG9yeTogdGhpcy5mcy5EaXJlY3RvcnkuRGF0YSB9ICk7XG5cdFx0XHRpZiAoIHN0YXQgKVxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG5cdFx0fVxuXHRcdGNhdGNoKCBlIClcblx0XHR7XG5cdFx0fVxuXHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlIH07XG5cdH1cblx0YXN5bmMgZ2V0U3lzdGVtSW5mb3JtYXRpb24oIHR5cGUgKVxuXHR7XG5cdFx0c3dpdGNoICggdHlwZSApXG5cdFx0e1xuXHRcdFx0Y2FzZSAncGxhdGZvcm0nOlxuXHRcdFx0XHRyZXR1cm4gJ2FuZHJvaWQnO1x0XHQvL3RoaXMuY29yZS5nZXRQbGF0Zm9ybSgpO1xuXHRcdFx0Y2FzZSAndXNlckRpcic6XG5cdFx0XHRcdHJldHVybiB0aGlzLmZzLmdldFVyaSggeyBwYXRoOiAnJywgZGlyZWN0b3J5OiBEaXJlY3RvcnkuRGF0YSB9ICk7XG5cdFx0XHRjYXNlICd1c2VyTmFtZSc6XG5cdFx0XHRcdHJldHVybiAnJztcblx0XHRcdGNhc2UgJ2RyaXZlcyc6XG5cdFx0XHRcdHZhciBsaXN0ID0gW107XG5cdFx0XHRcdHJldHVybiBsaXN0O1xuXHRcdH1cblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQ29ubmVjdG9yID0gQ29ubmVjdG9yU3lzdGVtTW9iaWxlO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbipcclxuKiAgICAgICAgICAgIC8gXFxcclxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxyXG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgWyAgXVsgICBdICAgICAgIFByb2dyYW1tYWJsZVxyXG4qICAgICBfLyAvICAgXFwgXFxfXFwgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbCBBc3Npc3RhbnRcclxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyBbX3wgfF9dIFxcICAgICBsaW5rOlxyXG4qXHJcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcclxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXHJcbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcclxuKlxyXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuKiBAZmlsZSBhd2ktY29ubmVjdG9yLXV0aWxpdGllcy1wYXJzZXIuanNcclxuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXHJcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzA2LzIwMjNcclxuKiBAdmVyc2lvbiAwLjNcclxuKlxyXG4qIEBzaG9ydCBFbmdsaXNoIGxhbmd1YWdlIHBhcnNlciBiYXNlZCBvbiBDb21wcm9taXNlXHJcbipcclxuKi9cclxudmFyIGF3aWNvbm5lY3RvciA9IHJlcXVpcmUoICcuLi9hd2ktY29ubmVjdG9yJyApO1xyXG5cclxuY2xhc3MgQ29ubmVjdG9yVXRpbGl0aWVzUGFyc2VyIGV4dGVuZHMgYXdpY29ubmVjdG9yLkNvbm5lY3RvclxyXG57XHJcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcclxuXHR7XHJcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XHJcblx0XHR0aGlzLm5hbWUgPSAnUGFyc2VyJztcclxuXHRcdHRoaXMudG9rZW4gPSAncGFyc2VyJztcclxuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ3V0aWxpdGllcyc7XHJcblx0XHR0aGlzLnZlcnNpb24gPSAnMC4zJztcclxuXHRcdHRoaXMudGFncyA9IHtcclxuXHRcdFx0bm91bjoge1xyXG5cdFx0XHRcdHNpbmd1bGFyOiB7XHJcblx0XHRcdFx0XHRwZXJzb246IHt9LFxyXG5cdFx0XHRcdFx0Zmlyc3ROYW1lOiB7fSxcclxuXHRcdFx0XHRcdG1hbGVOYW1lOiB7fSxcclxuXHRcdFx0XHRcdGZlbWFsZU5hbWU6IHt9LFxyXG5cdFx0XHRcdFx0bGFzdE5hbWU6IHt9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRwbGFjZToge1xyXG5cdFx0XHRcdFx0Y291bnRyeToge30sXHJcblx0XHRcdFx0XHRjaXR5OiB7fSxcclxuXHRcdFx0XHRcdHJlZ2lvbjoge30sXHJcblx0XHRcdFx0XHRhZGRyZXNzOiB7fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b3JnYW5pemF0aW9uOiB7XHJcblx0XHRcdFx0XHRzcG9ydHNUZWFtOiB7fSxcclxuXHRcdFx0XHRcdGNvbXBhbnk6IHt9LFxyXG5cdFx0XHRcdFx0c2Nob29sOiB7fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0cHJvcGVyTm91bjoge30sXHJcblx0XHRcdFx0aG9ub3JpZmljOiB7fSxcclxuXHRcdFx0XHRwbHVyYWw6IHt9LFxyXG5cdFx0XHRcdHVuY291bnRhYmxlOiB7fSxcclxuXHRcdFx0XHRwcm9ub3VuOiB7fSxcclxuXHRcdFx0XHRhY3Rvcjoge30sXHJcblx0XHRcdFx0YWN0aXZpdHk6IHt9LFxyXG5cdFx0XHRcdHVuaXQ6IHt9LFxyXG5cdFx0XHRcdGRlbW9ueW06IHt9LFxyXG5cdFx0XHRcdHBvc3Nlc3NpdmU6IHt9XHJcblx0XHRcdH0sXHJcblx0XHRcdHZlcmI6IHtcclxuXHRcdFx0XHRwcmVzZW50VGVuc2U6IHtcclxuXHRcdFx0XHRcdGluZmluaXRpdmU6IHt9LFxyXG5cdFx0XHRcdFx0Z2VydW5kOiB7fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0cGFzdFRlbnNlOiB7fSxcclxuXHRcdFx0XHRwZXJmZWN0VGVuc2U6IHt9LFxyXG5cdFx0XHRcdGZ1dHVyZVBlcmZlY3Q6IHt9LFxyXG5cdFx0XHRcdHBsdXBlcmZlY3Q6IHt9LFxyXG5cdFx0XHRcdGNvcHVsYToge30sXHJcblx0XHRcdFx0bW9kYWw6IHt9LFxyXG5cdFx0XHRcdHBhcnRpY2lwbGU6IHt9LFxyXG5cdFx0XHRcdHBhcnRpY2xlOiB7fSxcclxuXHRcdFx0XHRwaHJhc2FsVmVyYjoge31cclxuXHRcdFx0fSxcclxuXHRcdFx0dmFsdWU6IHtcclxuXHRcdFx0XHRvcmRpbmFsOiB7fSxcclxuXHRcdFx0XHRjYXJkaW5hbDoge1xyXG5cdFx0XHRcdFx0cm9tYW5OdW1lcmFsOiB7fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG11bHRpcGxlOiB7fSxcclxuXHRcdFx0XHRmcmFjdGlvbjoge30sXHJcblx0XHRcdFx0dGV4dFZhbHVlOiB7fSxcclxuXHRcdFx0XHRudW1lcmljVmFsdWU6IHt9LFxyXG5cdFx0XHRcdHBlcmNlbnQ6IHt9LFxyXG5cdFx0XHRcdG1vbmV5OiB7fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRkYXRlOiB7XHJcblx0XHRcdFx0bW9udGg6IHt9LFxyXG5cdFx0XHRcdHdlZWtEYXk6IHt9LFxyXG5cdFx0XHRcdHJlbGF0aXZlRGF5OiB7fSxcclxuXHRcdFx0XHR5ZWFyOiB7fSxcclxuXHRcdFx0XHRkdXJhdGlvbjoge30sXHJcblx0XHRcdFx0dGltZToge30sXHJcblx0XHRcdFx0aG9saWRheToge31cclxuXHRcdFx0fSxcclxuXHRcdFx0YWRqZWN0aXZlOiB7XHJcblx0XHRcdFx0Y29tcGFyYWJsZToge30sXHJcblx0XHRcdFx0Y29tcGFyYXRpdmU6IHt9LFxyXG5cdFx0XHRcdHN1cGVybGF0aXZlOiB7fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRjb250cmFjdGlvbjoge30sXHJcblx0XHRcdGFkdmVyYjoge30sXHJcblx0XHRcdGN1cnJlbmN5OiB7fSxcclxuXHRcdFx0ZGV0ZXJtaW5lcjoge30sXHJcblx0XHRcdGNvbmp1bmN0aW9uOiB7fSxcclxuXHRcdFx0cHJlcG9zaXRpb246IHt9LFxyXG5cdFx0XHRxdWVzdGlvbldvcmQ6IHt9LFxyXG5cdFx0XHRwcm9ub3VuOiB7fSxcclxuXHRcdFx0ZXhwcmVzc2lvbjoge30sXHJcblx0XHRcdGFiYnJldmlhdGlvbjoge30sXHJcblx0XHRcdHVybDoge30sXHJcblx0XHRcdGhhc2hUYWc6IHt9LFxyXG5cdFx0XHRwaG9uZU51bWJlcjoge30sXHJcblx0XHRcdGF0TWVudGlvbjoge30sXHJcblx0XHRcdGVtb2ppOiB7fSxcclxuXHRcdFx0ZW1vdGljb246IHt9LFxyXG5cdFx0XHRlbWFpbDoge30sXHJcblx0XHRcdGF1eGlsaWFyeToge30sXHJcblx0XHRcdG5lZ2F0aXZlOiB7fSxcclxuXHRcdFx0YWNyb255bToge31cclxuXHRcdH1cclxuXHR9XHJcblx0YXN5bmMgY29ubmVjdCggb3B0aW9ucyApXHJcblx0e1xyXG5cdFx0c3VwZXIuY29ubmVjdCggb3B0aW9ucyApO1xyXG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLnV0aWxpdGllcy5sb2FkSmF2YXNjcmlwdCggdGhpcy5hd2kuY29uZmlnLmdldEVuZ2luZVBhdGgoKSArICcvZGF0YS9saWJzL2NvbXByb21pc2UuanMnICk7XHJcblx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcclxuXHRcdFx0dGhpcy5jb21wcm9taXNlID0gYW5zd2VyLmRhdGEucmVzdWx0O1xyXG5cdFx0dGhpcy5jb25uZWN0ZWQgPSBhbnN3ZXIuc3VjY2VzcztcclxuXHRcdHRoaXMuY29ubmVjdEFuc3dlci5zdWNjZXNzID0gYW5zd2VyLnN1Y2Nlc3M7XHJcblx0XHRyZXR1cm4gdGhpcy5jb25uZWN0QW5zd2VyO1xyXG5cdH1cclxuXHRmaW5kV29yZERlZmluaXRpb24oIHNvdXJjZSwgbmFtZXMsIHRhc2sgKVxyXG5cdHtcclxuXHRcdGlmICggdHlwZW9mIG5hbWVzID09ICdzdHJpbmcnIClcclxuXHRcdHtcclxuXHRcdFx0aWYgKCB0eXBlb2YgbmFtZXMgPT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIHNvdXJjZSA9PSAndW5kZWZpbmVkJyApXHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblxyXG5cdFx0XHRpZiAoIHRhc2sgPT0gJ2ZpbmQnIClcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHZhciBmb3VuZCA9IHNvdXJjZS5maW5kSW5kZXgoXHJcblx0XHRcdFx0XHRmdW5jdGlvbiggZWxlbWVudCApXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhciBwb3MgPSBuYW1lcy5pbmRleE9mKCBlbGVtZW50ICk7XHJcblx0XHRcdFx0XHRcdGlmICggcG9zIDwgMCApXHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR2YXIgYmFkID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdGlmICggcG9zID4gMCApXHJcblx0XHRcdFx0XHRcdFx0YmFkID0gKCBuYW1lcy5jaGFyQXQoIHBvcyAtIDEgKSAhPSAnICcgKTtcclxuXHRcdFx0XHRcdFx0aWYgKCBwb3MgKyBlbGVtZW50Lmxlbmd0aCA8IG5hbWVzLmxlbmd0aCApXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHR2YXIgYyA9IG5hbWVzLmNoYXJBdCggcG9zICsgZWxlbWVudC5sZW5ndGggKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIGMgPT0gJ3MnICYmIG5hbWVzLmNoYXJBdCggcG9zICsgZWxlbWVudC5sZW5ndGggKSA9PSAnICcgKVxyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHRcdFx0YmFkID0gKCBjICE9ICcgJyApO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHJldHVybiAhYmFkO1xyXG5cdFx0XHRcdFx0fSApO1xyXG5cdFx0XHRcdFx0aWYgKCBmb3VuZCA+PSAwIClcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHNvdXJjZVsgZm91bmQgXTtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fVxyXG5cdFx0XHRmb3IgKCB2YXIgcyBpbiBzb3VyY2UgKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFyIGZvdW5kID0gc291cmNlWyBzIF0ubmFtZXMuZmluZEluZGV4KFxyXG5cdFx0XHRcdFx0ZnVuY3Rpb24oIGVsZW1lbnQgKVxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR2YXIgcG9zID0gbmFtZXMuaW5kZXhPZiggZWxlbWVudCApO1xyXG5cdFx0XHRcdFx0XHRpZiAoIHBvcyA8IDAgKVxyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdFx0dmFyIGJhZCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRpZiAoIHBvcyA+IDAgKVxyXG5cdFx0XHRcdFx0XHRcdGJhZCA9ICggbmFtZXMuY2hhckF0KCBwb3MgLSAxICkgIT0gJyAnICk7XHJcblx0XHRcdFx0XHRcdGlmICggcG9zICsgZWxlbWVudC5sZW5ndGggPCBuYW1lcy5sZW5ndGggKVxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0dmFyIGMgPSBuYW1lcy5jaGFyQXQoIHBvcyArIGVsZW1lbnQubGVuZ3RoICk7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCBjID09ICdzJyAmJiBuYW1lcy5jaGFyQXQoIHBvcyArIGVsZW1lbnQubGVuZ3RoICkgPT0gJyAnIClcclxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdFx0XHRcdGJhZCA9ICggYyAhPSAnICcgKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gIWJhZDtcclxuXHRcdFx0XHRcdH0gKTtcclxuXHRcdFx0XHRpZiAoIGZvdW5kID49IDAgKVxyXG5cdFx0XHRcdFx0cmV0dXJuIHNvdXJjZVsgcyBdO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdFx0dmFyIHJlc3VsdCA9IFtdO1xyXG5cdFx0aWYgKCB0eXBlb2YgbmFtZXMgIT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHNvdXJjZSAhPSAndW5kZWZpbmVkJyApXHJcblx0XHR7XHJcblx0XHRcdGlmICggdGFzayA9PSAnZmluZCcgKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFyIGZvdW5kID0gc291cmNlLmZpbmRJbmRleChcclxuXHRcdFx0XHRcdGZ1bmN0aW9uKCBlbGVtZW50IClcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Zm9yICggdmFyIG4gPSAwOyBuIDwgbmFtZXMubGVuZ3RoOyBuKysgKVxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0dmFyIG5hbWUgPSBuYW1lc1sgbiBdO1xyXG5cdFx0XHRcdFx0XHRcdHZhciBwb3MgPSBuYW1lLmluZGV4T2YoIGVsZW1lbnQgKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIHBvcyA+PSAwIClcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR2YXIgYmFkID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoIHBvcyA+IDAgKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRiYWQgPSAoIG5hbWUuY2hhckF0KCBwb3MgLSAxICkgIT0gJyAnICk7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoIHBvcyArIGVsZW1lbnQubGVuZ3RoIDwgbmFtZS5sZW5ndGggKVxyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgYyA9IG5hbWUuY2hhckF0KCBwb3MgKyBlbGVtZW50Lmxlbmd0aCApO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIGMgPT0gJ3MnICYmIG5hbWUuY2hhckF0KCBwb3MgKyBlbGVtZW50Lmxlbmd0aCApID09ICcgJyApXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGJhZCA9ICggYyAhPSAnICcgKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiAhYmFkO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSApO1xyXG5cdFx0XHRcdFx0aWYgKCBmb3VuZCA+PSAwIClcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHNvdXJjZVsgZm91bmQgXTtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fVxyXG5cdFx0XHRmb3IgKCB2YXIgcyBpbiBzb3VyY2UgKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFyIGZvdW5kID0gc291cmNlWyBzIF0ubmFtZXMuZmluZEluZGV4KFxyXG5cdFx0XHRcdFx0ZnVuY3Rpb24oIGVsZW1lbnQgKVxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRmb3IgKCB2YXIgbiA9IDA7IG4gPCBuYW1lcy5sZW5ndGg7IG4rKyApXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHR2YXIgbmFtZSA9IG5hbWVzWyBuIF07XHJcblx0XHRcdFx0XHRcdFx0dmFyIHBvcyA9IG5hbWUuaW5kZXhPZiggZWxlbWVudCApO1xyXG5cdFx0XHRcdFx0XHRcdGlmICggcG9zID49IDAgKVxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHZhciBiYWQgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICggcG9zID4gMCApXHJcblx0XHRcdFx0XHRcdFx0XHRcdGJhZCA9ICggbmFtZS5jaGFyQXQoIHBvcyAtIDEgKSAhPSAnICcgKTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICggcG9zICsgZWxlbWVudC5sZW5ndGggPCBuYW1lLmxlbmd0aCApXHJcblx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBjID0gbmFtZS5jaGFyQXQoIHBvcyArIGVsZW1lbnQubGVuZ3RoICk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmICggYyA9PSAncycgJiYgbmFtZS5jaGFyQXQoIHBvcyArIGVsZW1lbnQubGVuZ3RoICkgPT0gJyAnIClcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0YmFkID0gKCBjICE9ICcgJyApO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuICFiYWQ7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdH0gKTtcclxuXHRcdFx0XHRpZiAoIGZvdW5kID49IDAgKVxyXG5cdFx0XHRcdFx0cmVzdWx0LnB1c2goIHNvdXJjZVsgcyBdICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fVxyXG5cdGFzeW5jIGV4dHJhY3RDb21tYW5kRnJvbUxpbmUoIGxpbmUsIGNvbnRyb2wgKVxyXG5cdHtcclxuXHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdHZhciB0b1JlbW92ZSA9IFtdO1xyXG5cdFx0dmFyIHRhZ3NNYXAgPSB7fTtcclxuXHRcdHZhciBkb2MgPSBubHAoIGxpbmUgKTtcclxuXHRcdHZhciBjb21tYW5kO1xyXG5cdFx0dmFyIHJvb3REb2MgPSBkb2Mubm9ybWFsaXplKCB7XHJcblx0XHRcdHdoaXRlc3BhY2U6IHRydWUsXHRcdFx0Ly8gcmVtb3ZlIGh5cGhlbnMsIG5ld2xpbmVzLCBhbmQgZm9yY2Ugb25lIHNwYWNlIGJldHdlZW4gd29yZHNcclxuXHRcdFx0Y2FzZTogdHJ1ZSxcdFx0XHRcdFx0Ly8ga2VlcCBvbmx5IGZpcnN0LXdvcmQsIGFuZCAnZW50aXR5JyB0aXRsZWNhc2luZ1xyXG5cdFx0XHRwdW5jdHVhdGlvbjogdHJ1ZSxcdFx0XHQvLyByZW1vdmUgY29tbWFzLCBzZW1pY29sb25zIC0gYnV0IGtlZXAgc2VudGVuY2UtZW5kaW5nIHB1bmN0dWF0aW9uXHJcblx0XHRcdHVuaWNvZGU6IHRydWUsXHRcdFx0XHQvLyB2aXN1YWxseSByb21hbml6ZS9hbmdsaWNpemUgJ0Jqw7ZyaycgaW50byAnQmpvcmsnLlxyXG5cdFx0XHRjb250cmFjdGlvbnM6IHRydWUsXHRcdFx0Ly8gdHVybiBcImlzbid0XCIgdG8gXCJpcyBub3RcIlxyXG5cdFx0XHRhY3Jvbnltczp0cnVlLFx0XHRcdFx0Ly8gcmVtb3ZlIHBlcmlvZHMgZnJvbSBhY3JvbnltcywgbGlrZSAnRi5CLkkuJ1xyXG5cdFx0XHQvLy0tLXRoZXNlIG9uZXMgZG9uJ3QgcnVuIHVubGVzcyB5b3Ugd2FudCB0aGVtIHRvLS0tXHJcblx0XHRcdHBhcmVudGhlc2VzOiB0cnVlLFx0XHRcdC8vcmVtb3ZlIHdvcmRzIGluc2lkZSBicmFja2V0cyAobGlrZSB0aGVzZSlcclxuXHRcdFx0cG9zc2Vzc2l2ZXM6IHRydWUsXHRcdFx0Ly8gdHVybiBcIkdvb2dsZSdzIHRheCByZXR1cm5cIiB0byBcIkdvb2dsZSB0YXggcmV0dXJuXCJcclxuXHRcdFx0cGx1cmFsczogdHJ1ZSxcdFx0XHRcdC8vIHR1cm4gXCJiYXRtb2JpbGVzXCIgaW50byBcImJhdG1vYmlsZVwiXHJcblx0XHRcdHZlcmJzOiB0cnVlLFx0XHRcdFx0Ly8gdHVybiBhbGwgdmVyYnMgaW50byBJbmZpbml0aXZlIGZvcm0gLSBcIkkgd2Fsa2VkXCIg4oaSIFwiSSB3YWxrXCJcclxuXHRcdFx0aG9ub3JpZmljczogdHJ1ZSxcdFx0XHQvL3R1cm4gJ1ZpY2UgQWRtaXJhbCBKb2huIFNtaXRoJyB0byAnSm9obiBTbWl0aCdcclxuXHRcdH0gKTtcclxuXHRcdGZ1bmN0aW9uIGdldFRhZ3MoIHRhZ3MsIHRleHQgKVxyXG5cdFx0e1xyXG5cdFx0XHR2YXIgdGV4dCA9ICcnO1xyXG5cdFx0XHRmb3IgKCB2YXIgdGFnIGluIHRhZ3MgKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWYgKCB0YWcgIT0gJ2RhdGEnIClcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR2YXIgYXJyID0gW107XHJcblx0XHRcdFx0XHR2YXIgc3RyID0gdGV4dCArICggdGV4dCA9PSAnJyA/ICcnIDogJy4nICkgKyB0YWc7XHJcblx0XHRcdFx0XHRnZXRUYWdzKCB0YWdzWyB0YWcgXSwgc3RyICk7XHJcblx0XHRcdFx0XHR2YXIgdGFnTmFtZSA9ICcjJyArIHRhZy5jaGFyQXQoIDAgKS50b1VwcGVyQ2FzZSgpICsgdGFnLnN1YnN0cmluZyggMSApO1xyXG5cdFx0XHRcdFx0c3dpdGNoICggdGFnTmFtZSApXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNhc2UgJyNOb3VuJzpcclxuXHRcdFx0XHRcdFx0XHRhcnIgPSByb290RG9jLm5vdW5zKCkudG9TaW5ndWxhcigpLm91dCggJ2FycmF5JyApO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHRcdGFyciA9IHJvb3REb2MubWF0Y2goIHRhZ05hbWUgKS5vdXQoICdhcnJheScgKTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmICggYXJyLmxlbmd0aCA+IDAgKVxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWdzTWFwWyB0YWcgXSA9IGFycjtcclxuXHRcdFx0XHRcdFx0dGV4dCArPSBzdHIgKyAnOiAnICsgdGFnc01hcFsgdGFnIF0gKyAnXFxuJztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIGV4dHJhY3REYXRlcyggbmFtZXMgKVxyXG5cdFx0e1xyXG5cdFx0XHR2YXIgZXh0cmFEYXRlcyA9IHNlbGYuZmluZFdvcmREZWZpbml0aW9uKCBzZWxmLmF3aS50aW1lLmV4dHJhRGF0ZXMsIG5hbWVzICk7XHJcblx0XHRcdGZvciAoIHZhciBlID0gMDsgZSA8IGV4dHJhRGF0ZXMubGVuZ3RoOyBlKysgKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFyIHF1aXQgPSBmYWxzZTtcclxuXHRcdFx0XHR2YXIgZXh0cmFEYXRlID0gZXh0cmFEYXRlc1sgZSBdO1xyXG5cdFx0XHRcdGZvciAoIHZhciBhIGluIHNlbGYuYXdpLnRpbWUuZXh0cmFEYXRlQWRqZWN0aXZlcyApXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dmFyIGFkamVjdGl2ZSA9IHNlbGYuYXdpLnRpbWUuZXh0cmFEYXRlQWRqZWN0aXZlc1sgYSBdO1xyXG5cdFx0XHRcdFx0Zm9yICggdmFyIG4gPSAwOyBuIDwgYWRqZWN0aXZlLm5hbWVzLmxlbmd0aDsgbisrIClcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFyIG1hdGNoID0gcm9vdERvYy5tYXRjaCggYWRqZWN0aXZlLm5hbWVzWyBuIF0gKyAnICcgKyBleHRyYURhdGUubmFtZXNbIDAgXSApLnRleHQoKTtcclxuXHRcdFx0XHRcdFx0aWYgKCBtYXRjaCApXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRleHRyYURhdGUuZGVsdGEgPSBhZGplY3RpdmUuZGVsdGE7XHJcblx0XHRcdFx0XHRcdFx0dG9SZW1vdmUucHVzaCggYWRqZWN0aXZlLm5hbWVzWyBuIF0gKTtcclxuXHRcdFx0XHRcdFx0XHRxdWl0ID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKCBxdWl0IClcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIENvbnZlcnQgdGhlIGRhdGVzIHRvIHRpbWUgaW50ZXJ2YWxcclxuXHRcdFx0XHRjb21tYW5kLnBhcmFtZXRlcnMuZGF0ZS5wdXNoKCBzZWxmLmF3aS50aW1lLmdldFRpbWVPckRhdGUoIGV4dHJhRGF0ZSwgJ2RhdGUnICkgKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gZXh0cmFjdFRpbWVzKCBuYW1lcyApXHJcblx0XHR7XHJcblx0XHRcdHZhciBleHRyYVRpbWVzID0gc2VsZi5maW5kV29yZERlZmluaXRpb24oIHNlbGYuYXdpLnRpbWUuZXh0cmFUaW1lcywgbmFtZXMgKTtcclxuXHRcdFx0Zm9yICggdmFyIGUgPSAwOyBlIDwgZXh0cmFUaW1lcy5sZW5ndGg7IGUrKyApXHJcblx0XHRcdHtcclxuXHRcdFx0XHR2YXIgcXVpdCA9IGZhbHNlO1xyXG5cdFx0XHRcdHZhciBleHRyYVRpbWUgPSBleHRyYVRpbWVzWyBlIF07XHJcblx0XHRcdFx0Zm9yICggdmFyIGEgaW4gc2VsZi5hd2kudGltZS5leHRyYVRpbWVBZGplY3RpdmVzIClcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR2YXIgYWRqZWN0aXZlID0gc2VsZi5hd2kudGltZS5leHRyYVRpbWVBZGplY3RpdmVzWyBhIF07XHJcblx0XHRcdFx0XHRmb3IgKCB2YXIgbiA9IDA7IG4gPCBhZGplY3RpdmUubmFtZXMubGVuZ3RoOyBuKysgKVxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR2YXIgbWF0Y2ggPSByb290RG9jLm1hdGNoKCBhZGplY3RpdmUubmFtZXNbIG4gXSArICcgJyArIGV4dHJhVGltZS5uYW1lc1sgMCBdICkudGV4dCgpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIG1hdGNoIClcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGV4dHJhVGltZS5kZWx0YSA9IGFkamVjdGl2ZS5kZWx0YTtcclxuXHRcdFx0XHRcdFx0XHRxdWl0ID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKCBxdWl0IClcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIENvbnZlcnQgdGhlIGRhdGVzIHRvIHRpbWUgaW50ZXJ2YWxcclxuXHRcdFx0XHRjb21tYW5kLnBhcmFtZXRlcnMudGltZS5wdXNoKCBzZWxmLmF3aS50aW1lLmdldFRpbWVPckRhdGUoIGV4dHJhVGltZSwgJ3RpbWUnICkgKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0YXN5bmMgZnVuY3Rpb24gZ2V0UGFyYW1ldGVycyggYnViYmxlLCBjb21tYW5kIClcclxuXHRcdHtcclxuXHRcdFx0Zm9yICggdmFyIHRhZyBpbiBidWJibGUucHJvcGVydGllcy5wYXJzZXIgKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFyIHdvcmRzID0gYnViYmxlLnByb3BlcnRpZXMucGFyc2VyWyB0YWcgXTtcclxuXHRcdFx0XHRpZiAoIHRhZyA9PSAnZXZhbHVhdGlvbicgKVxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHZhciBmb3VuZCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0dmFyIG5vdW5zID0gdGFnc01hcFsgJ25vdW4nIF07XHJcblx0XHRcdFx0XHRpZiAoIG5vdW5zIClcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Zm9yICggdmFyIG4gPSAwOyBuIDwgbm91bnMubGVuZ3RoOyBuKysgKVxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCBzZWxmLmF3aS51dGlsaXRpZXMuaXNFeHByZXNzaW9uKCBub3Vuc1sgbiBdICkgKVxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbW1hbmQucGFyYW1ldGVyc1sgdGFnIF0gPSBub3Vuc1sgbiBdO1xyXG5cdFx0XHRcdFx0XHRcdFx0dG9SZW1vdmUucHVzaCggbm91bnNbIG4gXSApO1xyXG5cdFx0XHRcdFx0XHRcdFx0Zm91bmQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZiAoICFmb3VuZCAmJiB0eXBlb2YgdGFnc01hcFsgJ3ZhbHVlJyBdICE9ICd1bmRlZmluZWQnIClcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFyIHZhbHVlID0gcGFyc2VJbnQoIHRhZ3NNYXBbICd2YWx1ZScgXSApO1xyXG5cdFx0XHRcdFx0XHRpZiAoICFpc05hTiggdmFsdWUgKSApXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjb21tYW5kLnBhcmFtZXRlcnNbIHRhZyBdID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0dG9SZW1vdmUucHVzaCggdGFnc01hcFsgJ3ZhbHVlJyBdICk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBpZiAoIHRhZyA9PSAnZmlsZScgKVxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHZhciBub3VucyA9IHRhZ3NNYXBbICdub3VuJyBdO1xyXG5cdFx0XHRcdFx0Y29tbWFuZC5wYXJhbWV0ZXJzLmZpbGUgPSBzZWxmLmF3aS51dGlsaXRpZXMuY29weU9iamVjdCggc2VsZi5hd2kuc3lzdGVtLmFzc2V0VHlwZXMuZmlsZSApO1xyXG5cdFx0XHRcdFx0aWYgKCB0eXBlb2YgdGFnc01hcFsgJ25vdW4nIF0gIT0gJ3VuZGVmaW5lZCcgJiYgbm91bnMubGVuZ3RoID4gMCApXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhciBhc3NldFR5cGUgPSBhd2FpdCBzZWxmLmF3aS5zeXN0ZW0uZ2V0QXNzZXRUeXBlKCB0YWdzTWFwWyAnbm91bicgXSApO1xyXG5cdFx0XHRcdFx0XHRpZiAoIGFzc2V0VHlwZSApXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIGNvbW1hbmQucGFyYW1ldGVycy5maWxlLmZpbHRlcnNbIDAgXSA9PSAnKi4qJyApXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29tbWFuZC5wYXJhbWV0ZXJzLmZpbGUuZmlsdGVycyA9IFtdO1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29tbWFuZC5wYXJhbWV0ZXJzLmZpbGUubmFtZXMgPSBbXTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0Y29tbWFuZC5wYXJhbWV0ZXJzLmZpbGUuZmlsdGVycy5wdXNoKCAuLi5hc3NldFR5cGUuZmlsdGVycyApO1xyXG5cdFx0XHRcdFx0XHRcdGNvbW1hbmQucGFyYW1ldGVycy5maWxlLm5hbWVzLnB1c2goIC4uLmFzc2V0VHlwZS5uYW1lcyApO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGVsc2UgaWYgKCBzZWxmLmF3aS51dGlsaXRpZXMuaXNQYXRoKCBub3Vuc1sgbiBdWyAwIF0gKSApXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjb21tYW5kLnBhcmFtZXRlcnMuZmlsZS5wYXRocy5wdXNoKCBub3Vuc1sgbiBdWyAwIF0gKTtcclxuXHRcdFx0XHRcdFx0XHR0b1JlbW92ZS5wdXNoKCBub3Vuc1sgbiBdICk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmICggY29tbWFuZC5wYXJhbWV0ZXJzLmZpbGUubmFtZXMubGVuZ3RoID4gMCApXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhciBuYW1lID0gIGNvbW1hbmQucGFyYW1ldGVycy5maWxlLm5hbWVzWyAwIF07XHJcblx0XHRcdFx0XHRcdHZhciBjb25maWcgPSBzZWxmLmF3aS5jb25maWcuZ2V0Q29uZmlnKCAndXNlcicgKS5wYXRoc1sgc2VsZi5hd2kuY29uZmlnLnBsYXRmb3JtIF07XHJcblx0XHRcdFx0XHRcdGNvbW1hbmQucGFyYW1ldGVycy5maWxlLnBhdGhzID0gY29uZmlnWyBuYW1lIF07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2UgaWYgKCB0YWcgPT0gJ2RhdGUnIClcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjb21tYW5kLnBhcmFtZXRlcnMuZGF0ZSA9IFtdO1xyXG5cdFx0XHRcdFx0ZXh0cmFjdERhdGVzKCB0YWdzTWFwWyAnZGF0ZScgXSwgJ2RhdGUnLCB0b1JlbW92ZSApO1xyXG5cdFx0XHRcdFx0ZXh0cmFjdERhdGVzKCB0YWdzTWFwWyAnbm91bicgXSwgJ2RhdGUnLCB0b1JlbW92ZSApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIGlmICggdGFnID09ICd0aW1lJyApXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y29tbWFuZC5wYXJhbWV0ZXJzLnRpbWUgPSBbXTtcclxuXHRcdFx0XHRcdGV4dHJhY3RUaW1lcyggdGFnc01hcFsgJ2RhdGUnIF0sICd0aW1lJywgdG9SZW1vdmUgKTtcclxuXHRcdFx0XHRcdGV4dHJhY3RUaW1lcyggdGFnc01hcFsgJ25vdW4nIF0sICd0aW1lJywgdG9SZW1vdmUgKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBpZiAoIHRhZyA9PSAncGVyc29uJyApXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y29tbWFuZC5wYXJhbWV0ZXJzLnBlcnNvbiA9IFtdO1xyXG5cdFx0XHRcdFx0aWYgKCB0YWdzTWFwWyAnZmlyc3ROYW1lJyBdIClcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Zm9yICggdmFyIGYgPSAwOyBmIDwgdGFnc01hcFsgJ2ZpcnN0TmFtZScgXS5sZW5ndGg7IGYrKyApXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHR2YXIgcGVyc29uID0gc2VsZi5hd2kudXRpbGl0aWVzLmNhcGl0YWxpemUoIHRhZ3NNYXBbICdmaXJzdE5hbWUnIF1bIGYgXSApO1xyXG5cdFx0XHRcdFx0XHRcdHRvUmVtb3ZlLnB1c2goIHRhZ3NNYXBbICdmaXJzdE5hbWUnIF1bIGYgXSApO1xyXG5cdFx0XHRcdFx0XHRcdGlmICggdGFnc01hcFsgJ2xhc3ROYW1lJyBdICYmIHRhZ3NNYXBbICdsYXN0TmFtZScgXS5sZW5ndGggPT0gdGFnc01hcFsgJ2ZpcnN0TmFtZScgXS5sZW5ndGggKVxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHBlcnNvbiArPSAnICcgKyBzZWxmLmF3aS51dGlsaXRpZXMuY2FwaXRhbGl6ZSggdGFnc01hcFsgJ2xhc3ROYW1lJyBdWyBmIF0gKTtcclxuXHRcdFx0XHRcdFx0XHRcdHRvUmVtb3ZlLnB1c2goIHRhZ3NNYXBbICdsYXN0TmFtZScgXVsgZiBdICk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGNvbW1hbmQucGFyYW1ldGVycy5wZXJzb24ucHVzaCggcGVyc29uICk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBpZiAoIHRhZyA9PSAnd2hhdCcgKVxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNvbW1hbmQucGFyYW1ldGVycy53aGF0ID0gW107XHJcblx0XHRcdFx0XHRpZiAoIHRhZ3NNYXBbICdub3VuJyBdIClcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Zm9yICggdmFyIGYgPSAwOyBmIDwgdGFnc01hcFsgJ25vdW4nIF0ubGVuZ3RoOyBmKysgKVxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0dmFyIGZvdW5kID0gc2VsZi5maW5kV29yZERlZmluaXRpb24oIGJ1YmJsZS5wcm9wZXJ0aWVzLnBhcnNlci53aGF0LCB0YWdzTWFwWyAnbm91bicgXVsgZiBdLCAnZmluZCcgKTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIGZvdW5kIClcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRjb21tYW5kLnBhcmFtZXRlcnMud2hhdC5wdXNoKCBmb3VuZCApO1xyXG5cdFx0XHRcdFx0XHRcdFx0dG9SZW1vdmUucHVzaCggZm91bmQgKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBpZiAoIHRhZ3NNYXBbIHRhZyBdIClcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRmb3IgKCB2YXIgZCA9IDA7IGQgPCB0YWdzTWFwWyB0YWcgXS5sZW5ndGg7IGQrKyApXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhciB3b3JkID0gc2VsZi5hd2kudXRpbGl0aWVzLnJlbW92ZVB1bmN0dWF0aW9uKCB0YWdzTWFwWyB0YWcgXVsgZCBdICk7XHJcblx0XHRcdFx0XHRcdHZhciBmb3VuZCA9IDE7XHJcblx0XHRcdFx0XHRcdGlmICggdGFnICE9ICdkYXRlJyAmJiB0YWcgIT0gJ3ZhbHVlJyApXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRmb3VuZCA9IHdvcmRzLmZpbmRJbmRleChcclxuXHRcdFx0XHRcdFx0XHRcdGZ1bmN0aW9uKCBlbGVtZW50IClcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHBvcyA9IHdvcmQuaW5kZXhPZiggZWxlbWVudCApO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIHBvcyA+PSAwIClcclxuXHRcdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHZhciBiYWQgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoIHBvcyA+IDAgKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0YmFkID0gKCB3b3JkLmNoYXJBdCggcG9zIC0gMSApICE9ICcgJyApO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmICggcG9zICsgZWxlbWVudC5sZW5ndGggPCB3b3JkLmxlbmd0aCApXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRiYWQgPSAoIHdvcmQuY2hhckF0KCBwb3MgKyBlbGVtZW50Lmxlbmd0aCApICE9ICcgJyApO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiAhYmFkO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHRcdH0gKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRlbHNlIGlmICggdGFnID09ICd2YWx1ZScgKVxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Zm9yICggdmFyIHcgPSAwOyB3IDwgd29yZHMubGVuZ3RoOyB3KysgKVxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICggd29yZHNbIHcgXSA9PSAnbnVtZXJpYycgKVxyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgdmFsdWUgPSBwYXJzZUludCggdGFnc01hcFsgdGFnIF0gKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCAhaXNOYU4oIHZhbHVlICkgKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbW1hbmQucGFyYW1ldGVyc1sgdGFnIF0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0aWYgKCBmb3VuZCA+PSAwIClcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGlmICggIWNvbW1hbmQucGFyYW1ldGVyc1sgdGFnIF0gKVxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbW1hbmQucGFyYW1ldGVyc1sgdGFnIF0gPSB3b3Jkc1sgZm91bmQgXTtcclxuXHRcdFx0XHRcdFx0XHRcdHRvUmVtb3ZlLnB1c2goIHdvcmRzWyBmb3VuZCBdICk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHZhciBmb3VuZCA9IHRydWU7XHJcblx0XHRcdFx0aWYgKCAhY29tbWFuZC50b2tlbiApXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dmFyIHNlbGVjdHMgPSBidWJibGUucHJvcGVydGllcy5zZWxlY3Q7XHJcblx0XHRcdFx0XHRmb3IgKCB2YXIgcyA9IDA7IHMgPCBzZWxlY3RzLmxlbmd0aCAmJiAhZm91bmQ7IHMrKyApXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGZvdW5kID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0dmFyIHNlbGVjdCA9IHNlbGVjdHNbIHMgXTtcclxuXHRcdFx0XHRcdFx0Zm9yICggdmFyIHNzID0gMDsgc3MgPCBzZWxlY3QubGVuZ3RoOyBzcysrIClcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGNvbW1hbmQucGFyYW1ldGVyc1sgc2VsZWN0WyBzcyBdIF0gPT0gJ3VuZGVmaW5lZCcgKVxyXG5cdFx0XHRcdFx0XHRcdFx0Zm91bmQgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoIGZvdW5kIClcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHQvLyBDaGVjayBhbGwgbWFuZGF0b3J5IHZhbHVlcyBhcmUgaGVyZS4uLlxyXG5cdFx0XHRcdFx0Zm9yICggdmFyIGkgPSAwOyBpIDwgYnViYmxlLnByb3BlcnRpZXMuaW5wdXRzLmxlbmd0aCAmJiBmb3VuZDsgaSsrIClcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFyIGluZm8gPSBzZWxmLmF3aS51dGlsaXRpZXMuZ2V0QnViYmxlUGFyYW1zKCBidWJibGUucHJvcGVydGllcy5pbnB1dHNbIGkgXSApO1xyXG5cdFx0XHRcdFx0XHRpZiAoICFpbmZvLm9wdGlvbmFsIClcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGNvbW1hbmQucGFyYW1ldGVyc1sgaW5mby5uYW1lIF0gPT0gJ3VuZGVmaW5lZCcgKVxyXG5cdFx0XHRcdFx0XHRcdFx0Zm91bmQgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoIGZvdW5kIClcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjb21tYW5kLnRva2VuID0gYnViYmxlLnRva2VuO1xyXG5cdFx0XHRcdFx0Y29tbWFuZC5jbGFzc25hbWUgPSBidWJibGUuY2xhc3NuYW1lO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBteVRhZ3MgPSB0aGlzLmF3aS51dGlsaXRpZXMuY29weU9iamVjdCggdGhpcy50YWdzICk7XHJcblx0XHRnZXRUYWdzKCBteVRhZ3MsICcnICk7XHJcblxyXG5cdFx0Y29tbWFuZCA9XHJcblx0XHR7XHJcblx0XHRcdHRva2VuOiAnJyxcclxuXHRcdFx0Y2xhc3NuYW1lOiAnJyxcclxuXHRcdFx0cGFyYW1ldGVyczoge30sXHJcblx0XHRcdG9wdGlvbnM6IHt9XHJcblx0XHR9O1xyXG5cdFx0dmFyIHRlcm1zID0gcm9vdERvYy50ZXJtcygpLm91dCggJ2FycmF5JyApO1xyXG5cdFx0aWYgKCAhdGFnc01hcC5xdWVzdGlvbldvcmQgKVxyXG5cdFx0e1xyXG5cdFx0XHR2YXIgbGlzdCA9IFsgWyAncGxlYXNlJywgJ2F3aScgXSwgWyAncGxlYXNlJywgJ25vdycgXSwgWyAncGxlYXNlJyBdLCBbICdjYW4nLCAneW91JyBdLCBbICdjb3VsZCcsICd5b3UnIF0sIFsgJ2knLCAnd291bGQnLCAnbGlrZScsICd5b3UnLCAndG8nIF0sIFsgJ25vdycgXSBdO1xyXG5cdFx0XHRmb3IgKCB2YXIgdyA9IDA7IHcgPCB0ZXJtcy5sZW5ndGg7IHcrKyApXHJcblx0XHRcdHtcclxuXHRcdFx0XHR2YXIgZ29vZCA9IGZhbHNlO1xyXG5cdFx0XHRcdHZhciB3b3JkID0gdGVybXNbIHcgXTtcclxuXHRcdFx0XHRmb3IgKCB2YXIgbCA9IDA7IGwgPCBsaXN0Lmxlbmd0aCAmJiAhZ29vZDsgbCsrIClcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR2YXIgc3VibGlzdCA9IGxpc3RbIGwgXTtcclxuXHRcdFx0XHRcdGlmICggc3VibGlzdFsgMCBdID09IHdvcmQgKVxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRnb29kID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0Zm9yICggdmFyIGxsID0gMTsgbGwgPCBzdWJsaXN0Lmxlbmd0aCAmJiBnb29kOyBsbCsrIClcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGlmICggdyArIGxsID49IHRlcm1zLmxlbmd0aCB8fCBzdWJsaXN0WyBsbCBdICE9IHRlcm1zWyB3ICsgbGwgXSApXHJcblx0XHRcdFx0XHRcdFx0XHRnb29kID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0aWYgKCBnb29kIClcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHcgKz0gbGwgLSAxO1xyXG5cdFx0XHRcdFx0XHRcdHRvUmVtb3ZlLnB1c2goIC4uLnN1Ymxpc3QgKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoICFnb29kIClcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdHdvcmQgPSB0ZXJtc1sgdyBdO1xyXG5cdFx0XHRmb3IgKCBjbGFzc25hbWUgaW4gdGhpcy5hd2kuYnViYmxlcyApXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZiAoIHRoaXMuYXdpLmJ1YmJsZXNbIGNsYXNzbmFtZSBdWyB3b3JkIF0gKVxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNvbW1hbmQudG9rZW4gPSB3b3JkO1xyXG5cdFx0XHRcdFx0Y29tbWFuZC5jbGFzc25hbWUgPSBjbGFzc25hbWU7XHJcblx0XHRcdFx0XHRhd2FpdCBnZXRQYXJhbWV0ZXJzKCB0aGlzLmF3aS5idWJibGVzWyBjbGFzc25hbWUgXVsgd29yZCBdLCBjb21tYW5kICk7XHJcblx0XHRcdFx0XHRpZiAoIGNvbW1hbmQudG9rZW4gKVxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCAhY29tbWFuZC50b2tlbiApXHJcblx0XHRcdHtcclxuXHRcdFx0XHRmb3IgKCB2YXIgY2xhc3NuYW1lIGluIHRoaXMuYXdpLmJ1YmJsZXMgKVxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGZvciAoIHZhciB0b2tlbiBpbiB0aGlzLmF3aS5idWJibGVzWyBjbGFzc25hbWUgXSApXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhciBidWJibGUgPSB0aGlzLmF3aS5idWJibGVzWyBjbGFzc25hbWUgXVsgdG9rZW4gXTtcclxuXHRcdFx0XHRcdFx0dmFyIHZlcmIgPSB0aGlzLmZpbmRXb3JkRGVmaW5pdGlvbiggYnViYmxlLnByb3BlcnRpZXMucGFyc2VyLnZlcmIsIHdvcmQsICdmaW5kJyApO1xyXG5cdFx0XHRcdFx0XHRpZiAoIHZlcmIgKVxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0YXdhaXQgZ2V0UGFyYW1ldGVycyggYnViYmxlLCBjb21tYW5kICk7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCBjb21tYW5kLnRva2VuIClcclxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZiAoIGNvbW1hbmQudG9rZW4gKVxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2VcclxuXHRcdHtcclxuXHRcdFx0dmFyIHdvcmQgPSB0ZXJtc1sgMCBdO1xyXG5cdFx0XHRmb3IgKCB2YXIgY2xhc3NuYW1lIGluIHRoaXMuYXdpLmJ1YmJsZXMgKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Zm9yICggdmFyIHRva2VuIGluIHRoaXMuYXdpLmJ1YmJsZXNbIGNsYXNzbmFtZSBdIClcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR2YXIgYnViYmxlID0gdGhpcy5hd2kuYnViYmxlc1sgY2xhc3NuYW1lIF1bIHRva2VuIF07XHJcblx0XHRcdFx0XHR2YXIgcXVlc3Rpb25Xb3JkID0gdGhpcy5maW5kV29yZERlZmluaXRpb24oIGJ1YmJsZS5wcm9wZXJ0aWVzLnBhcnNlci5xdWVzdGlvbldvcmQsIHdvcmQsICdmaW5kJyApO1xyXG5cdFx0XHRcdFx0aWYgKCBxdWVzdGlvbldvcmQgKVxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRhd2FpdCBnZXRQYXJhbWV0ZXJzKCBidWJibGUsIGNvbW1hbmQgKTtcclxuXHRcdFx0XHRcdFx0aWYgKCBjb21tYW5kLnRva2VuIClcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKCBjb21tYW5kLnRva2VuIClcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRpZiAoICFjb21tYW5kLnRva2VuIClcclxuXHRcdHtcclxuXHRcdFx0Y29tbWFuZC50b2tlbiA9ICdjaGF0JztcclxuXHRcdFx0Y29tbWFuZC5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XHJcblx0XHRcdGNvbW1hbmQucGFyYW1ldGVycy51c2VySW5wdXQgPSBsaW5lO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZVxyXG5cdFx0e1xyXG5cdFx0XHQvLyBDYWxjdWxhdGVzIHJlbWFpbmluZyBvZiBsaW5lLi4uXHJcblx0XHRcdHZhciBuZXdsaW5lID0gJyc7XHJcblx0XHRcdHZhciB0ZXJtcyA9IHJvb3REb2MudGVybXMoKS5vdXQoICdhcnJheScgKTtcclxuXHRcdFx0Zm9yICggdmFyIHQgPSAwOyB0IDwgdGVybXMubGVuZ3RoOyB0KysgKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dmFyIGZvdW5kID0gdG9SZW1vdmUuZmluZEluZGV4KFxyXG5cdFx0XHRcdFx0ZnVuY3Rpb24oIGUgKVxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZSA9PSB0ZXJtc1sgdCBdO1xyXG5cdFx0XHRcdFx0fSApO1xyXG5cdFx0XHRcdGlmICggZm91bmQgPCAwIClcclxuXHRcdFx0XHRcdG5ld2xpbmUgKz0gdGVybXNbIHQgXSArICcgJztcclxuXHRcdFx0fVxyXG5cdFx0XHRsaW5lID0gbmV3bGluZS50cmltKCk7XHJcblx0XHR9XHJcblx0XHRjb21tYW5kLnBhcmFtZXRlcnMudXNlcklucHV0ID0gbGluZTtcclxuXHRcdGNvbW1hbmQubGluZSA9IGxpbmU7XHJcblxyXG5cdFx0Ly8gUHJpbnQgb3V0IHJlc3VsdHMuLi5cclxuXHRcdHZhciB0ZXh0ID0gW107XHJcblx0XHR0ZXh0LnB1c2goICdjb21tYW5kOiAnICsgY29tbWFuZC5jbGFzc25hbWUgKyAnLicgKyBjb21tYW5kLnRva2VuICk7XHJcblx0XHRmb3IgKCB2YXIgcCBpbiBjb21tYW5kLnBhcmFtZXRlcnMgKVxyXG5cdFx0e1xyXG5cdFx0XHRpZiAoIHAgPT0gJ2ZpbGUnIClcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHZhciBzdWJUZXh0ID0gJ2ZpbGU6ICc7XHJcblx0XHRcdFx0Zm9yICggdmFyIG4gPSAwOyBuIDwgY29tbWFuZC5wYXJhbWV0ZXJzLmZpbGUubmFtZXMubGVuZ3RoOyBuKysgKVxyXG5cdFx0XHRcdFx0c3ViVGV4dCArPSBjb21tYW5kLnBhcmFtZXRlcnMuZmlsZS5uYW1lc1sgbiBdICsgJywgJztcclxuXHRcdFx0XHRzdWJUZXh0ID0gc3ViVGV4dC5zdWJzdHJpbmcoIDAsIHN1YlRleHQubGVuZ3RoIC0gMiApICsgJywgZmlsdGVyczogJztcclxuXHRcdFx0XHRmb3IgKCB2YXIgZiA9IDA7IGYgPCBjb21tYW5kLnBhcmFtZXRlcnMuZmlsZS5maWx0ZXJzLmxlbmd0aDsgZisrIClcclxuXHRcdFx0XHRcdHN1YlRleHQgKz0gY29tbWFuZC5wYXJhbWV0ZXJzLmZpbGUuZmlsdGVyc1sgZiBdICsgJywgJztcclxuXHRcdFx0XHRzdWJUZXh0ID0gc3ViVGV4dC5zdWJzdHJpbmcoIDAsIHN1YlRleHQubGVuZ3RoIC0gMiApICsgJywgcGF0aHM6ICc7XHJcblx0XHRcdFx0Zm9yICggdmFyIHAgPSAwOyBwIDwgY29tbWFuZC5wYXJhbWV0ZXJzLmZpbGUucGF0aHMubGVuZ3RoOyBwKysgKVxyXG5cdFx0XHRcdFx0c3ViVGV4dCArPSBjb21tYW5kLnBhcmFtZXRlcnMuZmlsZS5wYXRoc1sgcCBdICsgJywgJztcclxuXHRcdFx0XHRzdWJUZXh0ID0gc3ViVGV4dC5zdWJzdHJpbmcoIDAsIHN1YlRleHQubGVuZ3RoIC0gMiApO1xyXG5cdFx0XHRcdHRleHQucHVzaCggc3ViVGV4dCApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYgKCBwID09ICdkYXRlJyApXHJcblx0XHRcdHtcclxuXHRcdFx0XHRmb3IgKCB2YXIgZCA9IDA7IGQgPCBjb21tYW5kLnBhcmFtZXRlcnMuZGF0ZS5sZW5ndGg7IGQrKyApXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dmFyIGRhdGUgPSAnZGF0ZTogJyArIGNvbW1hbmQucGFyYW1ldGVycy5kYXRlWyBkIF0uZGF0ZS50ZXh0ICsgJywgJztcclxuXHRcdFx0XHRcdGRhdGUgKz0gJ2Zyb206ICcgKyBjb21tYW5kLnBhcmFtZXRlcnMuZGF0ZVsgZCBdLmZyb20udGV4dCArICcsICc7XHJcblx0XHRcdFx0XHRkYXRlICs9ICd0bzogJyArIGNvbW1hbmQucGFyYW1ldGVycy5kYXRlWyBkIF0udG8udGV4dDtcclxuXHRcdFx0XHRcdHRleHQucHVzaCggZGF0ZSApXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYgKCBwID09ICd0aW1lJyApXHJcblx0XHRcdHtcclxuXHRcdFx0XHRmb3IgKCB2YXIgZCA9IDA7IGQgPCBjb21tYW5kLnBhcmFtZXRlcnMudGltZS5sZW5ndGg7IGQrKyApXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dmFyIHRpbWUgPSAndGltZTogJyArIGNvbW1hbmQucGFyYW1ldGVycy50aW1lWyBkIF0udGltZS50ZXh0ICsgJywgJztcclxuXHRcdFx0XHRcdHRpbWUgKz0gJ2Zyb206ICcgKyBjb21tYW5kLnBhcmFtZXRlcnMudGltZVsgZCBdLmZyb20udGV4dCArICcsICc7XHJcblx0XHRcdFx0XHR0aW1lICs9ICd0bzogJyArIGNvbW1hbmQucGFyYW1ldGVycy50aW1lWyBkIF0udG8udGV4dDtcclxuXHRcdFx0XHRcdHRleHQucHVzaCggdGltZSApXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRleHQucHVzaCggcCArICc6ICcgKyBjb21tYW5kLnBhcmFtZXRlcnNbIHAgXSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCB0ZXh0LCB7IHVzZXI6ICdwYXJzZXInIH0gKTtcclxuXHRcdHJldHVybiBjb21tYW5kO1xyXG5cdH1cclxufVxyXG5tb2R1bGUuZXhwb3J0cy5Db25uZWN0b3IgPSBDb25uZWN0b3JVdGlsaXRpZXNQYXJzZXI7XHJcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4qXHJcbiogICAgICAgICAgICAvIFxcXHJcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcclxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcIFsgIF1bICAgXSAgICAgICBQcm9ncmFtbWFibGVcclxuKiAgICAgXy8gLyAgIFxcIFxcX1xcIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWwgQXNzaXN0YW50XHJcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gW198IHxfXSBcXCAgICAgbGluazpcclxuKlxyXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXHJcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxyXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XHJcbipcclxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiogQGZpbGUgYXdpLWNvbm5lY3Rvci10aW1lLWdyZWdvcmlhbi5qc1xyXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcclxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMDYvMjAyM1xyXG4qIEB2ZXJzaW9uIDAuM1xyXG4qXHJcbiogQHNob3J0IFRpbWUgR3JlZ29yaWFuIGNhbGVuZGFyIHV0aWxpdGllcy5cclxuKlxyXG4qL1xyXG52YXIgYXdpY29ubmVjdG9yID0gcmVxdWlyZSggJy4uL2F3aS1jb25uZWN0b3InICk7XHJcbi8vdmFyIGhlYmNhbCA9IHJlcXVpcmUoICdoZWJjYWwnICk7XHJcblxyXG5jbGFzcyBDb25uZWN0b3JVdGlsaXRpZXNUaW1lIGV4dGVuZHMgYXdpY29ubmVjdG9yLkNvbm5lY3RvclxyXG57XHJcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcclxuXHR7XHJcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XHJcblx0XHR0aGlzLm5hbWUgPSAnVGltZSc7XHJcblx0XHR0aGlzLnRva2VuID0gJ3RpbWUnO1xyXG5cdFx0dGhpcy5jbGFzc25hbWUgPSAndXRpbGl0aWVzJztcclxuXHRcdHRoaXMudmVyc2lvbiA9ICcwLjMnO1xyXG5cdFx0dGhpcy5leHRyYURhdGVzID1cclxuXHRcdHtcclxuXHRcdFx0eWVzdGVyZGF5OiB7IG5hbWVzOiBbICd5ZXN0ZXJkYXknIF0sIG5lZWRBZGplY3RpdmU6IGZhbHNlLCBkZWx0YTogLTEgfSxcclxuXHRcdFx0dG9tb3Jyb3c6IHsgbmFtZXM6IFsgJ3RvbW9ycm93JyBdLCBuZWVkQWRqZWN0aXZlOiBmYWxzZSwgZGVsdGE6IDEgfSxcclxuXHRcdFx0bW9ybmluZzogeyBuYW1lczogWyAnbW9ybmluZycsICdkYXduJywgJ2JyZWFrZmFzdCcsICdicnVuY2gnIF0sIG5lZWRBZGplY3RpdmU6IHRydWUsIGRlbHRhOiAwIH0sXHJcblx0XHRcdG5vb246IHsgbmFtZXM6IFsgJ25vb24nLCAnbWlkZGF5JywgJ2Rpbm5lcicgXSwgbmVlZEFkamVjdGl2ZTogdHJ1ZSwgZGVsdGE6IDAgfSxcclxuXHRcdFx0YWZ0ZXJub29uOiB7IG5hbWVzOiBbICdhZnRlcm5vb24nIF0sIG5lZWRBZGplY3RpdmU6IHRydWUsIGRlbHRhOiAwIH0sXHJcblx0XHRcdGV2ZW5pbmc6IHsgbmFtZXM6IFsgJ2V2ZW5pbmcnLCAnc3Vuc2V0JyBdLCBuZWVkQWRqZWN0aXZlOiB0cnVlLCBkZWx0YTogMCB9LFxyXG5cdFx0XHRuaWdodDogeyBuYW1lczogWyAnbmlnaHQnIF0sIG5lZWRBZGplY3RpdmU6IHRydWUsIGRlbHRhOiAwIH0sXHJcblx0XHRcdHNlY29uZDogeyBuYW1lczogWyAnc2Vjb25kJyBdLCBuZWVkQWRqZWN0aXZlOiB0cnVlLCBkZWx0YTogMCB9LFxyXG5cdFx0XHRtaW51dGU6IHsgbmFtZXM6IFsgJ21pbnV0ZScsICdtaW5pdCcsICdtaW51dCcgXSwgbmVlZEFkamVjdGl2ZTogdHJ1ZSwgZGVsdGE6IDAgfSxcclxuXHRcdFx0aG91cjogeyBuYW1lczogWyAnaG91cicgXSwgbmVlZEFkamVjdGl2ZTogdHJ1ZSwgZGVsdGE6IDAgfSxcclxuXHRcdFx0ZGF5OiB7IG5hbWVzOiBbICdkYXknIF0sIG5lZWRBZGplY3RpdmU6IHRydWUsIGRlbHRhOiAwIH0sXHJcblx0XHRcdHdlZWs6IHsgbmFtZXM6IFsgJ3dlZWsnIF0sIG5lZWRBZGplY3RpdmU6IHRydWUsIGRlbHRhOiAwIH0sXHJcblx0XHRcdG1vbnRoOiB7IG5hbWVzOiBbICdtb250aCcgXSwgbmVlZEFkamVjdGl2ZTogdHJ1ZSwgZGVsdGE6IDAgfSxcclxuXHRcdFx0eWVhcjogeyBuYW1lczogWyAneWVhcicgXSwgbmVlZEFkamVjdGl2ZTogdHJ1ZSwgZGVsdGE6IDAgfSxcclxuXHRcdFx0ZGVjYWRlOiB7IG5hbWVzOiBbICdkZWNhZGUnIF0sIG5lZWRBZGplY3RpdmU6IHRydWUsIGRlbHRhOiAwIH0sXHJcblx0XHRcdGNlbnR1cnk6IHsgbmFtZXM6IFsgJ2NlbnR1cnknIF0sIG5lZWRBZGplY3RpdmU6IHRydWUsIGRlbHRhOiAwIH0sXHJcblx0XHRcdGNocmlzdG1hczogeyBuYW1lczogWyAnY2hyaXN0bWFzJywgJ3htYXMnLCAneC1tYXMnIF0sIG5lZWRBZGplY3RpdmU6IHRydWUsIGRlbHRhOiAwIH0sXHJcblx0XHRcdGVhc3RlcjogeyBuYW1lczogWyAnZWFzdGVyJyBdLCBuZWVkQWRqZWN0aXZlOiB0cnVlLCBkZWx0YTogMCB9LFxyXG5cdFx0XHR0aGFua3NnaXZpbmc6IHsgbmFtZXM6IFsgJ3RoYW5rc2dpdmluZycgXSwgbmVlZEFkamVjdGl2ZTogdHJ1ZSwgZGVsdGE6IDAgfSxcclxuXHRcdFx0YmlydGhkYXk6IHsgbmFtZXM6IFsgJ2JpcnRoZGF5JyBdLCBuZWVkQWRqZWN0aXZlOiB0cnVlLCBkZWx0YTogMCB9LFxyXG5cdFx0XHRzaGFiYmF0aDogeyBuYW1lczogWyAnc2hhYmJhdGgnLCAnc2hhYmJhdCcgXSwgbmVlZEFkamVjdGl2ZTogdHJ1ZSwgZGVsdGE6IDAgfSxcclxuXHRcdFx0dG9uaWdodDogeyBuYW1lczogWyAndG9uaWdodCcgXSwgbmVlZEFkamVjdGl2ZTogZmFsc2UsIGRlbHRhOiAwIH0sXHJcblx0XHRcdGJpcnRoOiB7IG5hbWVzOiBbICdiaXJ0aCcgXSwgbmVlZEFkamVjdGl2ZTogZmFsc2UsIGRlbHRhOiAwIH0sXHJcblx0XHRcdGRlYXRoOiB7IG5hbWVzOiBbICdkZWF0aCcgXSwgbmVlZEFkamVjdGl2ZTogZmFsc2UsIGRlbHRhOiAwIH0sXHJcblx0XHR9XHJcblx0XHR0aGlzLmV4dHJhRGF0ZUFkamVjdGl2ZXMgPVxyXG5cdFx0e1xyXG5cdFx0XHRwcmV2aW91c2xhc3Q6IHsgbmFtZXM6IFsgJ3ByZXZpb3VzIGxhc3QnIF0sIGRlbHRhOiAtMiB9LFxyXG5cdFx0XHR0aGlzOiB7IG5hbWVzOiBbICd0aGlzJyBdLCBkZWx0YTogMCB9LFxyXG5cdFx0XHRsYXN0OiB7IG5hbWVzOiBbICdsYXN0JywgJ3ByZXZpb3VzJyBdLCBkZWx0YTogLTEgfSxcclxuXHRcdFx0bmV4dDogeyBuYW1lczogWyAnbmV4dCcgXSwgZGVsdGE6ICsxIH0sXHJcblx0XHR9XHJcblx0XHR0aGlzLmV4dHJhVGltZXMgPSB0aGlzLmV4dHJhRGF0ZXM7XHJcblx0XHR0aGlzLmV4dHJhVGltZUFkamVjdGl2ZXMgPSB0aGlzLmV4dHJhVGltZUFkamVjdGl2ZXM7XHJcblx0fVxyXG5cdGFzeW5jIGNvbm5lY3QoIG9wdGlvbnMgKVxyXG5cdHtcclxuXHRcdHN1cGVyLmNvbm5lY3QoIG9wdGlvbnMgKTtcclxuXHRcdHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcclxuXHRcdHRoaXMuY29ubmVjdEFuc3dlci5zdWNjZXNzID0gdHJ1ZTtcclxuXHRcdHJldHVybiB0aGlzLmNvbm5lY3RBbnN3ZXI7XHJcblx0XHQvKlxyXG5cdFx0dGhpcy5oZWJjYWwgPSBuZXcgaGViY2FsLkdyZWdZZWFyKCk7XHJcblx0XHR0aGlzLmhlYmNhbERheSA9IGhlYmNhbC5IRGF0ZSggbmV3IERhdGUoKSApO1xyXG5cdFx0dmFyIGhvbGlkYXlzID0gdGhpcy5oZWJjYWwuaG9saWRheXM7XHJcblx0XHRmb3IgKCB2YXIgaCA9IDA7IGggPCBob2xpZGF5cy5sZW5ndGg7IGgrKyApXHJcblx0XHR7XHJcblx0XHRcdHZhciBob2xpZGF5ID0gaG9saWRheXNbIGggXTtcclxuXHRcdFx0Zm9yICggdmFyIGQgPSAwOyBuIDwgaG9saWRheS5kZXNjLmxlbmd0aDsgZCsrIClcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHZhciBuYW1lID0gaG9saWRheS5kZXNjWyBkIF07XHJcblx0XHRcdFx0Zm9yICggdmFyIHAgPSAwOyBwIDwgbmFtZS5sZW5ndGg7IHArKyApXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dmFyIHR5cGUgPSB0aGlzLmF3aS51dGlsaXRpZXMuZ2V0Q2hhcmFjdGVyVHlwZSggbmFtZS5jaGFyQXQoIHAgKSApO1xyXG5cdFx0XHRcdFx0aWYgKCB0eXBlICE9ICdsZXR0ZXInIClcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG5hbWUgPSBuYW1lLnN1YnN0cmluZyggMCwgcCApO1xyXG5cdFx0XHRcdGlmICggIXRoaXMuaG9saWRheXNbIG5hbWUgXSApXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGhpcy5ob2xpZGF5c1sgbmFtZSBdID0geyBuYW1lczogWyBuYW1lIF0gfTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRoaXMuaG9saWRheXNbIG5hbWUgXS5uYW1lcy5wdXNoKCBuYW1lICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGhvbGlkYXlEZXNjLm5hbWVzXHJcblx0XHR9XHJcblx0XHR2YXIgaG9saWRheXMgPSB0aGlzLmhlYmNhbERheS5ob2xpZGF5cyggdHJ1ZSApO1xyXG5cdFx0Ki9cclxuXHR9XHJcblx0Z2V0RGF0ZVJlZ2V4KClcclxuXHR7XHJcblx0XHRyZXR1cm4gWyAvKFthLXpBLVpcXHUwMEU5XFx1MDBFOFxcdTAwRUFcXHUwMEVCXFx1MDBFMFxcdTAwRTJcXHUwMEU0XFx1MDBGNFxcdTAwRjZcXHUwMEZCXFx1MDBGQ1xcdTAwRTddezN9KVxccyhcXGR7MSwyfSksXFxzKFxcZHs0fSlcXHMoXFxkezEsMn0pOihcXGR7Mn0pOihcXGR7Mn0pKGFtfHBtfEFNfFBNKT8vIF07XHJcblx0fVxyXG5cdGdldFRpbWVSZWdleCgpXHJcblx0e1xyXG5cdFx0cmV0dXJuIFsgL14oXFxkezJ9KTooXFxkezJ9KTooXFxkezJ9KSwoXFxkezN9KSQvIF07XHJcblx0fVxyXG5cdGdldE1lZGlhUmVnZXgoKVxyXG5cdHtcclxuXHRcdHJldHVybiBbIC9eKFxcZHsyfSk6KFxcZHsyfSk6KFxcZHsyfSksKFxcZHszfSkkLyBdO1xyXG5cdH1cclxuXHRnZXREYXRlc3RhbXAoIGRhdGUgKVxyXG5cdHtcclxuXHRcdGRhdGUuc2V0SG91cnMoIDAgKTtcclxuXHRcdGRhdGUuc2V0TWludXRlcyggMCApO1xyXG5cdFx0ZGF0ZS5zZXRTZWNvbmRzKCAwICk7XHJcblx0XHRkYXRlLnNldE1pbGxpc2Vjb25kcyggMCApO1xyXG5cdFx0dmFyIHRleHQgPSBkYXRlLnRvSVNPU3RyaW5nKCk7XHJcblx0XHR2YXIgdCA9IHRleHQuaW5kZXhPZiggJ1QnICk7XHJcblx0XHRyZXR1cm4geyB0aW1lOiBkYXRlLmdldFRpbWUoKSwgdGV4dDogdGV4dC5zdWJzdHJpbmcoIDAsIHQgKSB9O1xyXG5cdH07XHJcblx0Z2V0VGltZXN0YW1wKCB0aW1lIClcclxuXHR7XHJcblx0XHR0aW1lLnNldEZ1bGxZZWFyKCAxOTcwLCAxICk7XHJcblx0XHR0aW1lLnNldERhdGUoIDEgKTtcclxuXHRcdHZhciB0ZXh0ID0gdGltZS50b0lTT1N0cmluZygpLnN1YnN0cmluZyggMCwgdGltZS50b0lTT1N0cmluZygpLmxlbmd0aCAtIDEgKTtcclxuXHRcdHZhciB0ID0gdGV4dC5pbmRleE9mKCAnVCcgKTtcclxuXHRcdHJldHVybiB7IHRpbWU6IHRpbWUuZ2V0VGltZSgpLCB0ZXh0OiB0ZXh0LnN1YnN0cmluZyggdCArIDEgKSB9O1xyXG5cdH07XHJcblx0Z2V0RGF0ZXN0YW1wRnJvbU1hdGNoZXMoIG1hdGNoZXMsIG1vbnRoUmVwbGFjZW1lbnQgPSAxIClcclxuXHR7XHJcblx0XHR2YXIgWyBfLCBtb250aCwgZGF5LCB5ZWFyLCBob3VycywgbWludXRlcywgc2Vjb25kcywgYW1wbSBdID0gbWF0Y2hlcztcclxuXHJcblx0XHQvLyBDb252ZXJ0IG1vbnRoIHRvIG51bWJlclxyXG5cdFx0dmFyIG1vbnRoTGlzdCA9XHJcblx0XHRbXHJcblx0XHRcdFwiSmFudUZlYnJNYXJzQXByaU1heSBKdW5lSnVseUF1Z3VTZXB0T2N0b05vdmVEZWNlXCIsXHJcblx0XHRcdFwiSmFudkZldnJNYXJzQXZyaU1haSBKdWluSnVpbEFvdXRTZXB0T2N0b05vdmVEZWNlXCIsXHJcblx0XHRcdFwiSmFudkbDqXZyTWFyc0F2cmlNYWkgSnVpbkp1aWxBb8O7dFNlcHRPY3RvTm92ZUTDqWNlXCIsXHJcblx0XHRdXHJcblx0XHR2YXIgbk1vbnRoO1xyXG5cdFx0bW9udGggPSBtb250aC5zdWJzdHJpbmcoIDAsIDQgKS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0Zm9yICggdmFyIG4gPSAwOyBuIDwgbW9udGhMaXN0Lmxlbmd0aDsgbisrIClcclxuXHRcdHtcclxuXHRcdFx0dmFyIG5Nb250aCA9IG1vbnRoTGlzdFsgbiBdLnRvTG93ZXJDYXNlKCkuaW5kZXhPZiggbW9udGggKTtcclxuXHRcdFx0aWYgKCBuTW9udGggPj0gMCApXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuTW9udGggPSBNYXRoLmZsb29yKCBuTW9udGggLyA0ICk7XHJcblx0XHRcdFx0bk1vbnRoKys7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmICggbk1vbnRoIDwgMSApXHJcblx0XHRcdG5Nb250aCA9IG1vbnRoUmVwbGFjZW1lbnQ7XHJcblx0XHRtb250aCA9IG5Nb250aDtcclxuXHRcdHZhciBpc1BNID0gKCBhbXBtID09PSAncG0nIHx8IGFtcG0gPT09ICdQTScgKTtcclxuXHRcdHZhciBuZXdIb3VycyA9ICggaXNQTSAmJiBob3VycyAhPT0gJzEyJyApID8gcGFyc2VJbnQoIGhvdXJzICkgKyAxMiA6IHBhcnNlSW50KCBob3VycyApO1xyXG5cdFx0dmFyIGRhdGUgPSBuZXcgRGF0ZSggcGFyc2VJbnQoIHllYXIgKSwgbW9udGggLSAxLCBwYXJzZUludCggZGF5ICksIG5ld0hvdXJzLCBwYXJzZUludCggbWludXRlcyApLCBwYXJzZUludCggc2Vjb25kcyApIClcclxuXHRcdHJldHVybiB7IHRpbWU6IGRhdGUuZ2V0VGltZSgpLCB0ZXh0OiBkYXRlLnRvVVRDU3RyaW5nKCkgfTtcclxuXHR9XHJcblx0Z2V0VGltZXN0YW1wRnJvbU1hdGNoZXMoIG1hdGNoZXMgKVxyXG5cdHtcclxuXHRcdHZhciBbIF8sIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtaWxsaXNlY29uZHMgXSA9IG1hdGNoZXM7XHJcblx0XHRob3VycyA9IHRoaXMuYXdpLnV0aWxpdGllcy5jaGVja1VuZGVmaW5lZCggaG91cnMsICcwMCcgKTtcclxuXHRcdG1pbnV0ZXMgPSB0aGlzLmF3aS51dGlsaXRpZXMuY2hlY2tVbmRlZmluZWQoIG1pbnV0ZXMsICcwMCcgKTtcclxuXHRcdHNlY29uZHMgPSB0aGlzLmF3aS51dGlsaXRpZXMuY2hlY2tVbmRlZmluZWQoIHNlY29uZHMsICcwMCcgKTtcclxuXHRcdG1pbGxpc2Vjb25kcyA9IHRoaXMuYXdpLnV0aWxpdGllcy5jaGVja1VuZGVmaW5lZCggbWlsbGlzZWNvbmRzLCAnMDAwJyApO1xyXG5cclxuXHRcdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHRcdGRhdGUuc2V0RnVsbFllYXIoIDE5NzAsIDEgKTtcclxuXHRcdGRhdGUuc2V0SG91cnMoIHBhcnNlSW50KCBob3VycyApICk7XHJcblx0XHRkYXRlLnNldE1pbnV0ZXMoIHBhcnNlSW50KCBtaW51dGVzICkgKTtcclxuXHRcdGRhdGUuc2V0U2Vjb25kcyggcGFyc2VJbnQoIHNlY29uZHMgKSApO1xyXG5cdFx0ZGF0ZS5zZXRNaWxsaXNlY29uZHMoIHBhcnNlSW50KCBtaWxsaXNlY29uZHMgKSApO1xyXG5cdFx0cmV0dXJuIHRoaXMuZ2V0VGltZXN0YW1wKCBkYXRlICk7XHJcblx0fVxyXG5cdGdldFRpbWVzdGFtcEZyb21TdGF0cyggc3RhdHMgKVxyXG5cdHtcclxuXHRcdHZhciBkYXRlID0gbmV3IERhdGUoIHN0YXRzLm10aW1lTXMgKTtcclxuXHRcdHJldHVybiB0aGlzLmdldERhdGVzdGFtcCggZGF0ZSApO1xyXG5cdH1cclxuXHRnZXRUaW1lT3JEYXRlKCBkZWZpbml0aW9uLCB0eXBlIClcclxuXHR7XHJcblx0XHR2YXIgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdHZhciBzdGFydCA9IG5ldyBEYXRlKCk7XHJcblx0XHR2YXIgZW5kID0gbmV3IERhdGUoKTtcclxuXHRcdGZ1bmN0aW9uIHNldFllYXIoIG4sIHMsIGUgKVxyXG5cdFx0e1xyXG5cdFx0XHRpZiAoIG4gPj0gMCApIG5vdy5zZXRZZWFyKCBuICk7XHJcblx0XHRcdGlmICggcyA+PSAwICkgc3RhcnQuc2V0WWVhciggcyApO1xyXG5cdFx0XHRpZiAoIGUgPj0gMCApIGVuZC5zZXRZZWFyKCBlICk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBzZXRNb250aCggbiwgcywgZSApXHJcblx0XHR7XHJcblx0XHRcdGlmICggbiA+PSAwICkgbm93LnNldE1vbnRoKCBuICk7XHJcblx0XHRcdGlmICggcyA+PSAwICkgc3RhcnQuc2V0TW9udGgoIHMgKTtcclxuXHRcdFx0aWYgKCBlID49IDAgKSBlbmQuc2V0TW9udGgoIGUgKTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIHNldERhdGUoIG4sIHMsIGUgKVxyXG5cdFx0e1xyXG5cdFx0XHRpZiAoIG4gPj0gMCApIG5vdy5zZXREYXRlKCBuICk7XHJcblx0XHRcdGlmICggcyA+PSAwICkgc3RhcnQuc2V0RGF0ZSggcyApO1xyXG5cdFx0XHRpZiAoIGUgPj0gMCApIGVuZC5zZXREYXRlKCBlICk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBzZXRIb3VyKCBuLCBzLCBlIClcclxuXHRcdHtcclxuXHRcdFx0aWYgKCBuID49IDAgKSBub3cuc2V0SG91cnMoIG4gKTtcclxuXHRcdFx0aWYgKCBzID49IDAgKSBzdGFydC5zZXRIb3VycyggcyApO1xyXG5cdFx0XHRpZiAoIGUgPj0gMCApIGVuZC5zZXRIb3VycyggZSApO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gc2V0TWludXRlKCBuLCBzLCBlIClcclxuXHRcdHtcclxuXHRcdFx0aWYgKCBuID49IDAgKSBub3cuc2V0TWludXRlcyggbiApO1xyXG5cdFx0XHRpZiAoIHMgPj0gMCApIHN0YXJ0LnNldE1pbnV0ZXMoIHMgKTtcclxuXHRcdFx0aWYgKCBlID49IDAgKSBlbmQuc2V0TWludXRlcyggZSApO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gc2V0U2Vjb25kKCBuLCBzLCBlIClcclxuXHRcdHtcclxuXHRcdFx0aWYgKCBuID49IDAgKSBub3cuc2V0U2Vjb25kcyggbiApO1xyXG5cdFx0XHRpZiAoIHMgPj0gMCApIHN0YXJ0LnNldFNlY29uZHMoIHMgKTtcclxuXHRcdFx0aWYgKCBlID49IDAgKSBlbmQuc2V0U2Vjb25kcyggZSApO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gc2V0TWlsbGlzZWNvbmQoIG4sIHMsIGUgKVxyXG5cdFx0e1xyXG5cdFx0XHRpZiAoIG4gPj0gMCApIG5vdy5zZXRNaWxsaXNlY29uZHMoIG4gKTtcclxuXHRcdFx0aWYgKCBzID49IDAgKSBzdGFydC5zZXRNaWxsaXNlY29uZHMoIHMgKTtcclxuXHRcdFx0aWYgKCBlID49IDAgKSBlbmQuc2V0TWlsbGlzZWNvbmRzKCBlICk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBhZGRZZWFyKCBuLCBzLCBlIClcclxuXHRcdHtcclxuXHRcdFx0aWYgKCB0eXBlb2YgbiAhPSAndW5kZWZpbmVkJyApIG5vdy5zZXRZZWFyKCBub3cuZ2V0RnVsbFllYXIoKSArIG4gKTtcclxuXHRcdFx0aWYgKCB0eXBlb2YgcyAhPSAndW5kZWZpbmVkJyApIHN0YXJ0LnNldFllYXIoIHN0YXJ0LmdldEZ1bGxZZWFyKCkgKyBzICk7XHJcblx0XHRcdGlmICggdHlwZW9mIGUgIT0gJ3VuZGVmaW5lZCcgKSBlbmQuc2V0WWVhciggZW5kLmdldEZ1bGxZZWFyKCkgKyBlICk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBhZGRNb250aCggbiwgcywgZSApXHJcblx0XHR7XHJcblx0XHRcdGlmICggdHlwZW9mIG4gIT0gJ3VuZGVmaW5lZCcgKSBub3cuc2V0TW9udGgoIG5vdy5nZXRNb250aCgpICsgbiApO1xyXG5cdFx0XHRpZiAoIHR5cGVvZiBzICE9ICd1bmRlZmluZWQnICkgc3RhcnQuc2V0TW9udGgoIHN0YXJ0LmdldE1vbnRoKCkgKyBzICk7XHJcblx0XHRcdGlmICggdHlwZW9mIGUgIT0gJ3VuZGVmaW5lZCcgKSBlbmQuc2V0TW9udGgoIGVuZC5nZXRNb250aCgpICsgZSApO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gYWRkRGF0ZSggbiwgcywgZSApXHJcblx0XHR7XHJcblx0XHRcdGlmICggdHlwZW9mIG4gIT0gJ3VuZGVmaW5lZCcgKSBub3cuc2V0RGF0ZSggbm93LmdldERhdGUoKSArIG4gKTtcclxuXHRcdFx0aWYgKCB0eXBlb2YgcyAhPSAndW5kZWZpbmVkJyApIHN0YXJ0LnNldERhdGUoIHN0YXJ0LmdldERhdGUoKSArIHMgKTtcclxuXHRcdFx0aWYgKCB0eXBlb2YgZSAhPSAndW5kZWZpbmVkJyApIGVuZC5zZXREYXRlKCBlbmQuZ2V0RGF0ZSgpICsgZSApO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gYWRkSG91ciggbiwgcywgZSApXHJcblx0XHR7XHJcblx0XHRcdGlmICggdHlwZW9mIG4gIT0gJ3VuZGVmaW5lZCcgKSBub3cuc2V0SG91cnMoIG5vdy5nZXRIb3VycygpICsgbiApO1xyXG5cdFx0XHRpZiAoIHR5cGVvZiBzICE9ICd1bmRlZmluZWQnICkgc3RhcnQuc2V0SG91cnMoIHN0YXJ0LmdldEhvdXJzKCkgKyBzICk7XHJcblx0XHRcdGlmICggdHlwZW9mIGUgIT0gJ3VuZGVmaW5lZCcgKSBlbmQuc2V0SG91cnMoIGVuZC5nZXRIb3VycygpICsgZSApO1xyXG5cdFx0fVxyXG5cdFx0ZnVuY3Rpb24gYWRkTWludXRlKCBuLCBzLCBlIClcclxuXHRcdHtcclxuXHRcdFx0aWYgKCB0eXBlb2YgbiAhPSAndW5kZWZpbmVkJyApIG5vdy5zZXRNaW51dGVzKCBub3cuZ2V0TWludXRlcygpICsgbiApO1xyXG5cdFx0XHRpZiAoIHR5cGVvZiBzICE9ICd1bmRlZmluZWQnICkgc3RhcnQuc2V0TWludXRlcyggc3RhcnQuZ2V0TWludXRlcygpICsgcyApO1xyXG5cdFx0XHRpZiAoIHR5cGVvZiBlICE9ICd1bmRlZmluZWQnICkgZW5kLnNldE1pbnV0ZXMoIGVuZC5nZXRNaW51dGVzKCkgKyBlICk7XHJcblx0XHR9XHJcblx0XHRmdW5jdGlvbiBhZGRTZWNvbmQoIG4sIHMsIGUgKVxyXG5cdFx0e1xyXG5cdFx0XHRpZiAoIHR5cGVvZiBuICE9ICd1bmRlZmluZWQnICkgbm93LnNldFNlY29uZHMoIG5vdy5nZXRTZWNvbmRzKCkgKyBuICk7XHJcblx0XHRcdGlmICggdHlwZW9mIHMgIT0gJ3VuZGVmaW5lZCcgKSBzdGFydC5zZXRTZWNvbmRzKCBzdGFydC5nZXRTZWNvbmRzKCkgKyBzICk7XHJcblx0XHRcdGlmICggdHlwZW9mIGUgIT0gJ3VuZGVmaW5lZCcgKSBlbmQuc2V0U2Vjb25kcyggZW5kLmdldFNlY29uZHMoKSArIGUgKTtcclxuXHRcdH1cclxuXHRcdGZ1bmN0aW9uIGFkZE1pbGxpc2Vjb25kKCBuLCBzLCBlIClcclxuXHRcdHtcclxuXHRcdFx0aWYgKCB0eXBlb2YgbiAhPSAndW5kZWZpbmVkJyApIG5vdy5zZXRNaWxsaXNlY29uZHMoIG5vdy5nZXRNaWxsaXNlY29uZHMoKSArIG4gKTtcclxuXHRcdFx0aWYgKCB0eXBlb2YgcyAhPSAndW5kZWZpbmVkJyApIHN0YXJ0LnNldE1pbGxpc2Vjb25kcyggc3RhcnQuZ2V0TWlsbGlzZWNvbmRzKCkgKyBzICk7XHJcblx0XHRcdGlmICggdHlwZW9mIGUgIT0gJ3VuZGVmaW5lZCcgKSBlbmQuc2V0TWlsbGlzZWNvbmRzKCBlbmQuZ2V0TWlsbGlzZWNvbmRzKCkgKyBlICk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCB0eXBlID09ICd0aW1lJyApXHJcblx0XHR7XHJcblx0XHRcdHN3aXRjaCAoIGRlZmluaXRpb24ubmFtZXNbIDAgXSApXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjYXNlICdtb3JuaW5nJzpcclxuXHRcdFx0XHRcdHNldEhvdXIoIDgsIDAsIDEyICk7XHJcblx0XHRcdFx0XHRhZGREYXRlKCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhICk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdub29uJzpcclxuXHRcdFx0XHRcdHNldEhvdXIoIDEzLCAxMiwgMTQgKTtcclxuXHRcdFx0XHRcdGFkZERhdGUoIGRlZmluaXRpb24uZGVsdGEsIGRlZmluaXRpb24uZGVsdGEsIGRlZmluaXRpb24uZGVsdGEgKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2FmdGVybm9vbic6XHJcblx0XHRcdFx0XHRzZXRIb3VyKCAxNiwgMTQsIDIwICk7XHJcblx0XHRcdFx0XHRhZGREYXRlKCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhICk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdldmVuaW5nJzpcclxuXHRcdFx0XHRcdHNldEhvdXIoIDIyLCAyLCAyNCApO1xyXG5cdFx0XHRcdFx0YWRkRGF0ZSggZGVmaW5pdGlvbi5kZWx0YSwgZGVmaW5pdGlvbi5kZWx0YSwgZGVmaW5pdGlvbi5kZWx0YSApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnbmlnaHQnOlxyXG5cdFx0XHRcdFx0c2V0SG91ciggMjMsIDIyLCAwICk7XHJcblx0XHRcdFx0XHRhZGREYXRlKCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhICsgMSApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnc2Vjb25kJzpcclxuXHRcdFx0XHRcdGFkZFNlY29uZCggZGVmaW5pdGlvbi5kZWx0YSwgZGVmaW5pdGlvbi5kZWx0YSwgZGVmaW5pdGlvbi5kZWx0YSApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnbWludXRlJzpcclxuXHRcdFx0XHRcdGFkZE1pbnV0ZSggZGVmaW5pdGlvbi5kZWx0YSwgZGVmaW5pdGlvbi5kZWx0YSwgZGVmaW5pdGlvbi5kZWx0YSApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnaG91cic6XHJcblx0XHRcdFx0XHRhZGRIb3VyKCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhICk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICd0b25pZ2h0JzpcclxuXHRcdFx0XHRcdHNldEhvdXIoIDIzLCAyMiwgMCApO1xyXG5cdFx0XHRcdFx0c2V0RGF0ZSggMCwgMCwgMSApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAndG9tb3Jyb3cnOlxyXG5cdFx0XHRcdGNhc2UgJ3llc3RlcmRheSc6XHJcblx0XHRcdFx0Y2FzZSAnZGF5JzpcclxuXHRcdFx0XHRjYXNlICd3ZWVrJzpcclxuXHRcdFx0XHRjYXNlICdtb250aCc6XHJcblx0XHRcdFx0Y2FzZSAneWVhcic6XHJcblx0XHRcdFx0Y2FzZSAnZGVjYWRlJzpcclxuXHRcdFx0XHRjYXNlICdjZW50dXJ5JzpcclxuXHRcdFx0XHRcdHNldEhvdXIoIDEyLCAwLCAyMyApO1xyXG5cdFx0XHRcdFx0c2V0TWludXRlKCAwLCAwLCA1OSApO1xyXG5cdFx0XHRcdFx0c2V0U2Vjb25kKCAwLCAwLCA1OSApO1xyXG5cdFx0XHRcdFx0c2V0TWlsbGlzZWNvbmQoIDAsIDAsIDk5OSApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnY2hyaXN0bWFzJzpcclxuXHRcdFx0XHRcdHNldEhvdXIoIDIwLCAwLCAyMyApO1xyXG5cdFx0XHRcdFx0c2V0TWludXRlKCAwLCAwLCA1OSApO1xyXG5cdFx0XHRcdFx0c2V0U2Vjb25kKCAwLCAwLCA1OSApO1xyXG5cdFx0XHRcdFx0c2V0TWlsbGlzZWNvbmQoIDAsIDAsIDk5OSApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnZWFzdGVyJzpcclxuXHRcdFx0XHRjYXNlICd0aGFua3NnaXZpbmcnOlxyXG5cdFx0XHRcdGNhc2UgJ2JpcnRoZGF5JzpcclxuXHRcdFx0XHRcdHNldEhvdXIoIDEyLCAwLCAyMyApO1xyXG5cdFx0XHRcdFx0c2V0TWludXRlKCAwLCAwLCA1OSApO1xyXG5cdFx0XHRcdFx0c2V0U2Vjb25kKCAwLCAwLCA1OSApO1xyXG5cdFx0XHRcdFx0c2V0TWlsbGlzZWNvbmQoIDAsIDAsIDk5OSApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnYmlydGgnOlxyXG5cdFx0XHRcdGNhc2UgJ2RlYXRoJzpcclxuXHRcdFx0XHRjYXNlICdzaGFiYmF0aCc6XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4geyB0aW1lOiB0aGlzLmdldFRpbWVzdGFtcCggbm93ICksIGZyb206IHRoaXMuZ2V0VGltZXN0YW1wKCBzdGFydCApLCB0byA6IHRoaXMuZ2V0VGltZXN0YW1wKCBlbmQgKSB9O1xyXG5cdFx0fVxyXG5cdFx0ZWxzZVxyXG5cdFx0e1xyXG5cdFx0XHRzd2l0Y2ggKCBkZWZpbml0aW9uLm5hbWVzWyAwIF0gKVxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2FzZSAneWVzdGVyZGF5JzpcclxuXHRcdFx0XHRcdGFkZERhdGUoIC0gMSwgLSAxLCAwICk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICd0b21vcnJvdyc6XHJcblx0XHRcdFx0XHRhZGREYXRlKCAxLCAxLCAyICk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdkYXknOlxyXG5cdFx0XHRcdFx0YWRkRGF0ZSggZGVmaW5pdGlvbi5kZWx0YSwgZGVmaW5pdGlvbi5kZWx0YSwgZGVmaW5pdGlvbi5kZWx0YSArIDEgKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3dlZWsnOlxyXG5cdFx0XHRcdFx0dmFyIGRheSA9IHN0YXJ0LmdldERheSgpO1xyXG5cdFx0XHRcdFx0c2V0RGF0ZSggLSBkYXkgLSAzICsgZGVmaW5pdGlvbi5kZWx0YSAqIDcsIC0gZGF5IC0gNyArIGRlZmluaXRpb24uZGVsdGEgKiA3LCAtIGRheSArIGRlZmluaXRpb24uZGVsdGEgKiA3ICk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdtb250aCc6XHJcblx0XHRcdFx0XHRzZXREYXRlKCAxNSwgMSwgMzAgKTtcclxuXHRcdFx0XHRcdGFkZE1vbnRoKCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhICsgMSApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAneWVhcic6XHJcblx0XHRcdFx0XHRzZXRNb250aCggNywgMSwgMTIgKTtcclxuXHRcdFx0XHRcdHNldERhdGUoIDEsIDEsIDMxICk7XHJcblx0XHRcdFx0XHRhZGRZZWFyKCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhICsgMSApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnZGVjYWRlJzpcclxuXHRcdFx0XHRcdHNldFllYXIoIDEsIC0xLCAtMSApO1xyXG5cdFx0XHRcdFx0c2V0TW9udGgoIDEsIDEsIDEyICk7XHJcblx0XHRcdFx0XHRzZXREYXRlKCAxLCAxLCAzMSApO1xyXG5cdFx0XHRcdFx0c2V0WWVhciggZGVmaW5pdGlvbi5kZWx0YSAqIDEwICsgNSwgZGVmaW5pdGlvbi5kZWx0YSAqIDEwLCBkZWZpbml0aW9uLmRlbHRhICogMTAgKyAxMCApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnY2VudHVyeSc6XHJcblx0XHRcdFx0XHRzZXRZZWFyKCAxLCAtMSwgLTEgKTtcclxuXHRcdFx0XHRcdHNldE1vbnRoKCAxLCAxLCAxMiApO1xyXG5cdFx0XHRcdFx0c2V0RGF0ZSggMSwgMSwgMzEgKTtcclxuXHRcdFx0XHRcdHNldFllYXIoIGRlZmluaXRpb24uZGVsdGEgKiAxMDAgKyA1MCwgZGVmaW5pdGlvbi5kZWx0YSAqIDEwMCwgZGVmaW5pdGlvbi5kZWx0YSAqIDEwMCArIDEwMCApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnY2hyaXN0bWFzJzpcclxuXHRcdFx0XHRcdHNldE1vbnRoKCAxMiwgMTIsIDEyICk7XHJcblx0XHRcdFx0XHRzZXREYXRlKCAyNSwgMjAsIDI3ICk7XHJcblx0XHRcdFx0XHRhZGRZZWFyKCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhLCBkZWZpbml0aW9uLmRlbHRhICk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdlYXN0ZXInOlxyXG5cdFx0XHRcdFx0ZnVuY3Rpb24gZ2V0RWFzdGVyRGF0ZSggWSApXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhciBDID0gTWF0aC5mbG9vcihZLzEwMCk7XHJcblx0XHRcdFx0XHRcdHZhciBOID0gWSAtIDE5Kk1hdGguZmxvb3IoWS8xOSk7XHJcblx0XHRcdFx0XHRcdHZhciBLID0gTWF0aC5mbG9vcigoQyAtIDE3KS8yNSk7XHJcblx0XHRcdFx0XHRcdHZhciBJID0gQyAtIE1hdGguZmxvb3IoQy80KSAtIE1hdGguZmxvb3IoKEMgLSBLKS8zKSArIDE5Kk4gKyAxNTtcclxuXHRcdFx0XHRcdFx0SSA9IEkgLSAzMCpNYXRoLmZsb29yKChJLzMwKSk7XHJcblx0XHRcdFx0XHRcdEkgPSBJIC0gTWF0aC5mbG9vcihJLzI4KSooMSAtIE1hdGguZmxvb3IoSS8yOCkqTWF0aC5mbG9vcigyOS8oSSArIDEpKSpNYXRoLmZsb29yKCgyMSAtIE4pLzExKSk7XHJcblx0XHRcdFx0XHRcdHZhciBKID0gWSArIE1hdGguZmxvb3IoWS80KSArIEkgKyAyIC0gQyArIE1hdGguZmxvb3IoQy80KTtcclxuXHRcdFx0XHRcdFx0SiA9IEogLSA3Kk1hdGguZmxvb3IoSi83KTtcclxuXHRcdFx0XHRcdFx0dmFyIEwgPSBJIC0gSjtcclxuXHRcdFx0XHRcdFx0dmFyIE0gPSAzICsgTWF0aC5mbG9vcigoTCArIDQwKS80NCk7XHJcblx0XHRcdFx0XHRcdHZhciBEID0gTCArIDI4IC0gMzEqTWF0aC5mbG9vcihNLzQpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4geyBtb250aDogTSwgZGF5OiBEIH07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR2YXIgeWVhciA9IHN0YXJ0LmdldEZ1bGxZZWFyKCkgKyBkZWZpbml0aW9uLmRlbHRhO1xyXG5cdFx0XHRcdFx0dmFyIHsgbW9udGgsIGRheSB9ID0gZ2V0RWFzdGVyRGF0ZSggeWVhciApO1xyXG5cdFx0XHRcdFx0c2V0TW9udGgoIG1vbnRoLCBtb250aCwgbW9udGggKTtcclxuXHRcdFx0XHRcdHNldERhdGUoIGRheSwgZGF5IC0gNywgZGF5ICsgNyApO1xyXG5cdFx0XHRcdFx0c2V0WWVhciggeWVhciwgeWVhciwgeWVhciApO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAndGhhbmtzZ2l2aW5nJzpcclxuXHRcdFx0XHRcdHZhciB5ZWFyID0gc3RhcnQuZ2V0RnVsbFllYXIoKSArIGRlZmluaXRpb24uZGVsdGE7XHJcblx0XHRcdFx0XHR2YXIgZmlyc3QgPSBuZXcgRGF0ZSggeWVhciwgMTAsIDEgKTtcclxuXHRcdFx0XHRcdHZhciBkYXkgPSAyMiArICggMTEgLSBmaXJzdC5nZXREYXkoKSApICUgNztcclxuXHRcdFx0XHRcdHNldE1vbnRoKCAxMSwgMTEsIDExICk7XHJcblx0XHRcdFx0XHRzZXREYXRlKCBkYXksIGRheSAtIDIsIGRheSArIDIgKTtcclxuXHRcdFx0XHRcdHNldFllYXIoIHllYXIsIHllYXIsIHllYXIgKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2JpcnRoZGF5JzpcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3NoYWJiYXRoJzpcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2JpcnRoJzpcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2RlYXRoJzpcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB7IGRhdGU6IHRoaXMuZ2V0RGF0ZXN0YW1wKCBub3cgKSwgZnJvbTogdGhpcy5nZXREYXRlc3RhbXAoIHN0YXJ0ICksIHRvIDogdGhpcy5nZXREYXRlc3RhbXAoIGVuZCApIH07XHJcblx0XHR9XHJcblx0fVxyXG5cdGlzU3RhdHNXaXRoaW5EYXRlKCBzdGF0cywgc3RhbXAgKVxyXG5cdHtcclxuXHRcdGlmICggc3RhdHMubXRpbWVNcyA+PSBzdGFtcC5mcm9tLnRpbWUgJiYgc3RhdHMubXRpbWVNcyA8IHN0YW1wLnRvLnRpbWUgKVxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcbn1cclxubW9kdWxlLmV4cG9ydHMuQ29ubmVjdG9yID0gQ29ubmVjdG9yVXRpbGl0aWVzVGltZSIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCBbICBdWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbCBBc3Npc3RhbnRcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gW198IHxfXSBcXCAgICAgbGluazpcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1jb25uZWN0b3ItdXRpbGl0aWVzLXV0aWxpdGllcy5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgVmFyaW91cyB1dGlsaXRpZXMuXG4qXG4qL1xudmFyIGF3aWNvbm5lY3RvciA9IHJlcXVpcmUoICcuLi9hd2ktY29ubmVjdG9yJyApO1xuXG5jbGFzcyBDb25uZWN0b3JVdGlsaXR5VXRpbGl0aWVzIGV4dGVuZHMgYXdpY29ubmVjdG9yLkNvbm5lY3Rvclxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdBd2kgdXRpbGl0aWVzJztcblx0XHR0aGlzLnRva2VuID0gJ3V0aWxpdGllcyc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAndXRpbGl0aWVzJztcblx0XHR0aGlzLnZlcnNpb24gPSAnMC4yLjEnO1xuXHRcdHRoaXMuc2VwID0gJy8nO1xuXHR9XG5cdGFzeW5jIGNvbm5lY3QoIG9wdGlvbnMgKVxuXHR7XG5cdFx0c3VwZXIuY29ubmVjdCggb3B0aW9ucyApO1xuXHRcdHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcblx0XHR0aGlzLmNvbm5lY3RBbnN3ZXIuc3VjY2VzcyA9IHRydWU7XG5cdFx0cmV0dXJuIHRoaXMuY29ubmVjdEFuc3dlcjtcblx0fVxuXHRhc3luYyBjb21wbGV0ZUNvbm5lY3QoKVxuXHR7XG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMubG9hZEphdmFzY3JpcHQoIHRoaXMuYXdpLmNvbmZpZy5nZXRFbmdpbmVQYXRoKCkgKyAnL2RhdGEvbGlicy9zaGExLmpzJywgeyBldmFsOiB0cnVlIH0gKTtcblx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHRcdHRoaXMuc2hhMSA9IGFuc3dlci5kYXRhLnJlc3VsdDtcblx0fVxuXHRjYXBpdGFsaXplKCB0ZXh0IClcblx0e1xuXHRcdHJldHVybiB0ZXh0LmNoYXJBdCggMCApLnRvVXBwZXJDYXNlKCkgKyB0ZXh0LnN1YnN0cmluZyggMSApO1xuXHR9XG5cdHJlcGxhY2VTdHJpbmdJblRleHQoIHRleHQsIG1hcmssIHJlcGxhY2VtZW50IClcblx0e1xuXHRcdHZhciBwb3MgPSB0ZXh0LmluZGV4T2YoIG1hcmsgKTtcblx0XHR3aGlsZSggcG9zID49IDAgKVxuXHRcdHtcblx0XHRcdHRleHQgPSB0ZXh0LnN1YnN0cmluZyggMCwgcG9zICkgKyByZXBsYWNlbWVudCArIHRleHQuc3Vic3RyaW5nKCBwb3MgKyBtYXJrLmxlbmd0aCApO1xuXHRcdFx0cG9zID0gdGV4dC5pbmRleE9mKCBtYXJrICk7XG5cdFx0fVxuXHRcdHJldHVybiB0ZXh0O1xuXHR9XG5cdGNvcHlPYmplY3QoIG9iaiApXG5cdHtcblx0XHR2YXIgcmV0ID0gbnVsbDtcblx0XHRpZiAob2JqICE9PSBPYmplY3Qob2JqKSkgeyAvLyBwcmltaXRpdmUgdHlwZXNcblx0XHRcdHJldHVybiBvYmo7XG5cdFx0fVxuXHRcdGlmIChvYmogaW5zdGFuY2VvZiBTdHJpbmcgfHwgb2JqIGluc3RhbmNlb2YgTnVtYmVyIHx8IG9iaiBpbnN0YW5jZW9mIEJvb2xlYW4pIHsgLy8gc3RyaW5nIG9iamVjc1xuXHRcdFx0cmV0ID0gb2JqOyAvLyBmb3IgZXg6IG9iaiA9IG5ldyBTdHJpbmcoXCJTcGlkZXJnYXBcIilcblx0XHR9IGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIERhdGUpIHsgLy8gZGF0ZVxuXHRcdFx0cmV0ID0gbmV3IG9iai5jb25zdHJ1Y3RvcigpO1xuXHRcdH0gZWxzZVxuXHRcdFx0cmV0ID0gT2JqZWN0LmNyZWF0ZShvYmouY29uc3RydWN0b3IucHJvdG90eXBlKTtcblxuXHRcdHZhciBwcm9wID0gbnVsbDtcblx0XHR2YXIgYWxsUHJvcHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopOyAvL2dldHMgbm9uIGVudW1lcmFibGVzIGFsc29cblxuXG5cdFx0dmFyIHByb3BzID0ge307XG5cdFx0Zm9yICh2YXIgaSBpbiBhbGxQcm9wcykge1xuXHRcdFx0cHJvcCA9IGFsbFByb3BzW2ldO1xuXHRcdFx0cHJvcHNbcHJvcF0gPSBmYWxzZTtcblx0XHR9XG5cblx0XHRmb3IgKGkgaW4gb2JqKSB7XG5cdFx0XHRwcm9wc1tpXSA9IGk7XG5cdFx0fVxuXG5cdFx0Ly9ub3cgcHJvcHMgY29udGFpbiBib3RoIGVudW1zIGFuZCBub24gZW51bXNcblx0XHR2YXIgcHJvcERlc2NyaXB0b3IgPSBudWxsO1xuXHRcdHZhciBuZXdQcm9wVmFsID0gbnVsbDsgLy8gdmFsdWUgb2YgdGhlIHByb3BlcnR5IGluIG5ldyBvYmplY3Rcblx0XHRmb3IgKGkgaW4gcHJvcHMpIHtcblx0XHRcdHByb3AgPSBvYmpbaV07XG5cdFx0XHRwcm9wRGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBpKTtcblxuXHRcdFx0aWYgKEFycmF5LmlzQXJyYXkocHJvcCkpIHsgLy9ub3QgYmFja3dhcmQgY29tcGF0aWJsZVxuXHRcdFx0XHRwcm9wID0gcHJvcC5zbGljZSgpOyAvLyB0byBjb3B5IHRoZSBhcnJheVxuXHRcdFx0fSBlbHNlXG5cdFx0XHRpZiAocHJvcCBpbnN0YW5jZW9mIERhdGUgPT0gdHJ1ZSkge1xuXHRcdFx0XHRwcm9wID0gbmV3IHByb3AuY29uc3RydWN0b3IoKTtcblx0XHRcdH0gZWxzZVxuXHRcdFx0aWYgKHByb3AgaW5zdGFuY2VvZiBPYmplY3QgPT0gdHJ1ZSkge1xuXHRcdFx0XHRpZiAocHJvcCBpbnN0YW5jZW9mIEZ1bmN0aW9uID09IHRydWUpIHsgLy8gZnVuY3Rpb25cblx0XHRcdFx0XHRpZiAoIUZ1bmN0aW9uLnByb3RvdHlwZS5jbG9uZSkge1xuXHRcdFx0XHRcdFx0RnVuY3Rpb24ucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdFx0XHRcdFx0dmFyIHRlbXAgPSBmdW5jdGlvbiB0bXAoKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoYXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0Zm9yICh2YXIga3kgaW4gdGhpcykge1xuXHRcdFx0XHRcdFx0XHRcdHRlbXBba3ldID0gdGhpc1treV07XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRlbXA7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHByb3AgPSBwcm9wLmNsb25lKCk7XG5cblx0XHRcdFx0fSBlbHNlIC8vIG5vcm1hbCBvYmplY3Rcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHByb3AgPSB0aGlzLmNvcHlPYmplY3QocHJvcCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRuZXdQcm9wVmFsID0ge1xuXHRcdFx0XHR2YWx1ZTogcHJvcFxuXHRcdFx0fTtcblx0XHRcdGlmIChwcm9wRGVzY3JpcHRvcikge1xuXHRcdFx0XHQvKlxuXHRcdFx0XHRcdCogSWYgcHJvcGVydHkgZGVzY3JpcHRvcnMgYXJlIHRoZXJlLCB0aGV5IG11c3QgYmUgY29waWVkXG5cdFx0XHRcdFx0Ki9cblx0XHRcdFx0bmV3UHJvcFZhbC5lbnVtZXJhYmxlID0gcHJvcERlc2NyaXB0b3IuZW51bWVyYWJsZTtcblx0XHRcdFx0bmV3UHJvcFZhbC53cml0YWJsZSA9IHByb3BEZXNjcmlwdG9yLndyaXRhYmxlO1xuXG5cdFx0XHR9XG5cdFx0XHRpZiAoIXJldC5oYXNPd25Qcm9wZXJ0eShpKSkgLy8gd2hlbiBTdHJpbmcgb3Igb3RoZXIgcHJlZGVmaW5lZCBvYmplY3RzXG5cdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXQsIGksIG5ld1Byb3BWYWwpOyAvLyBub24gZW51bWVyYWJsZVxuXG5cdFx0fVxuXHRcdHJldHVybiByZXQ7XG5cdH1cblx0Y29weUFycmF5KCBhcnIsIGFyckRlc3QgKVxuXHR7XG5cdFx0YXJyRGVzdCA9IHR5cGVvZiBhcnJEZXN0ID09ICd1bmRlZmluZWQnID8gW10gOiBhcnJEZXN0O1xuXHRcdGZvciAoIHZhciBwID0gMDsgcCA8IGFyci5sZW5ndGg7IHArKyApXG5cdFx0e1xuXHRcdFx0dmFyIHByb3AgPSBhcnJbIHAgXTtcblx0XHRcdGlmICggdGhpcy5pc0FycmF5KCBwcm9wICkgKVxuXHRcdFx0XHRwcm9wID0gdGhpcy5jb3B5QXJyYXkoIHByb3AsIFtdICk7XG5cdFx0XHRhcnJEZXN0LnB1c2goIHByb3AgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGFyckRlc3Q7XG5cdH1cblx0aXNGdW5jdGlvbiggZnVuY3Rpb25Ub0NoZWNrIClcblx0e1xuXHRcdHJldHVybiBmdW5jdGlvblRvQ2hlY2sgJiYge30udG9TdHJpbmcuY2FsbChmdW5jdGlvblRvQ2hlY2spID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXHR9XG5cdGlzT2JqZWN0KCBpdGVtIClcblx0e1xuXHRcdHJldHVybiB0eXBlb2YgaXRlbSAhPSAndW5kZWZpbmVkJyA/ICh0eXBlb2YgaXRlbSA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheSggaXRlbSApICYmIGl0ZW0gIT09IG51bGwpIDogZmFsc2U7XG5cdH07XG5cdGlzQXJyYXkoIGl0ZW0gKVxuXHR7XG5cdFx0cmV0dXJuIHR5cGVvZiBpdGVtICE9ICd1bmRlZmluZWQnID8gQXJyYXkuaXNBcnJheSggaXRlbSApIDogZmFsc2U7XG5cdH07XG5cdGNvdW50RWxlbWVudHMoIG9iaiwgb3B0aW9ucyA9IHsgYWxsOiB0cnVlIH0gKVxuXHR7XG5cdFx0dmFyIGNvdW50ID0gMDtcblx0XHRmb3IgKCB2YXIgcCBpbiBvYmogKVxuXHRcdHtcblx0XHRcdGlmICggb2JqWyBwIF0gPT09IG51bGwgKVxuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdGlmICggdGhpcy5pc09iamVjdCggcCApIClcblx0XHRcdHtcblx0XHRcdFx0aWYgKCBvcHRpb25zLm9iamVjdHMgfHwgb3B0aW9ucy5hbGwgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCBvYmpbIHAgXSApXG5cdFx0XHRcdFx0XHRjb3VudCsrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICggdGhpcy5pc0FycmF5KCBwICkgKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoIG9wdGlvbnMuYXJyYXlzIHx8IG9wdGlvbnMuYWxsIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICggb2JqWyBwIF0gKVxuXHRcdFx0XHRcdFx0Y291bnQrKztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoIHRoaXMuaXNGdW5jdGlvbiggcCApIClcblx0XHRcdHtcblx0XHRcdFx0aWYgKCBvcHRpb25zLmZ1bmN0aW9ucyB8fCBvcHRpb25zLmFsbCApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoIG9ialsgcCBdIClcblx0XHRcdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0Y291bnQrKztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGNvdW50O1xuXHR9XG5cdGdldENoYXJhY3RlclR5cGUoIGMgKVxuXHR7XG5cdFx0dmFyIHR5cGU7XG5cdFx0aWYgKCBjID49ICcwJyAmJiBjIDw9ICc5JyApXG5cdFx0XHR0eXBlID0gJ251bWJlcic7XG5cdFx0ZWxzZSBpZiAoIGMgPT0gJyAnIHx8IGMgPT0gXCJcXHRcIiApXG5cdFx0XHR0eXBlID0gJ3NwYWNlJztcblx0XHRlbHNlIGlmICggKCBjID49ICdhJyAmJiBjIDw9ICd6JykgfHwgKCBjID49ICdBJyAmJiBjIDw9ICdaJyApIHx8IGMgPT0gJ18nIClcblx0XHRcdHR5cGUgPSAnbGV0dGVyJztcblx0XHRlbHNlIGlmICggYyA9PSAnXCInICB8fCBjID09ICfigJwnIHx8IGMgPT0gXCInXCIgKVxuXHRcdFx0dHlwZSA9ICdxdW90ZSc7XG5cdFx0ZWxzZSBpZiAoIGMgPT0gXCInXCIgKVxuXHRcdFx0dHlwZSA9ICdyZW1hcmsnO1xuXHRcdGVsc2UgaWYgKCBjID09ICc6JyApXG5cdFx0XHR0eXBlID0gJ2NvbHVtbic7XG5cdFx0ZWxzZSBpZiAoIGMgPT0gJzsnIClcblx0XHRcdHR5cGUgPSAnc2VtaWNvbHVtbic7XG5cdFx0ZWxzZSBpZiAoIGMgPT0gJy0nIHx8IGMgPT0gJ+KAkycgKVxuXHRcdFx0dHlwZSA9ICdtaW51cyc7XG5cdFx0ZWxzZSBpZiAoIGMgPT0gJygnIHx8IGMgPT0gJyknIClcblx0XHRcdHR5cGUgPSAnYnJhY2tldCc7XG5cdFx0ZWxzZSBpZiAoIGMgPT0gJ3snIHx8IGMgPT0gJ30nIClcblx0XHRcdHR5cGUgPSAnYWNjb2xhZGUnO1xuXHRcdGVsc2Vcblx0XHRcdHR5cGUgPSAnb3RoZXInO1xuXHRcdHJldHVybiB0eXBlO1xuXHR9XG5cdGlzVGFnKCB0ZXh0LCB0YWdzIClcblx0e1xuXHRcdHZhciBwb3M7XG5cdFx0dGFncyA9ICF0aGlzLmlzQXJyYXkoIHRhZ3MgKSA/IFsgdGFncyBdIDogdGFncztcblx0XHR0ZXh0ID0gdGV4dC50b0xvd2VyQ2FzZSgpO1xuXHRcdGZvciAoIHZhciB0ID0gMDsgdCA8IHRhZ3MubGVuZ3RoOyB0KysgKVxuXHRcdHtcblx0XHRcdGlmICggKCBwb3MgPSB0ZXh0LmluZGV4T2YoICcjJyArIHRhZ3NbIHQgXSApICkgPj0gMCApXG5cdFx0XHR7XG5cdFx0XHRcdHBvcyArPSB0YWdzWyB0IF0ubGVuZ3RoICsgMTtcblx0XHRcdFx0aWYgKCBwb3MgPj0gdGV4dC5sZW5ndGggfHwgdGhpcy5nZXRDaGFyYWN0ZXJUeXBlKCBwb3MgKSAhPSAnbGV0dGVyJyApXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRjb252ZXJ0U3RyaW5nVG9BcnJheUJ1ZmZlciggc3RyIClcblx0e1xuXHRcdHZhciBjaGFycyA9IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrL1wiO1xuXHRcdHZhciBsb29rdXAgPSBuZXcgVWludDhBcnJheSgyNTYpO1xuXHRcdGZvciAoIHZhciBpID0gMDsgaSA8IGNoYXJzLmxlbmd0aDsgaSsrIClcblx0XHR7XG5cdFx0XHRsb29rdXBbIGNoYXJzLmNoYXJDb2RlQXQoIGkgKSBdID0gaTtcblx0XHR9XG5cblx0XHR2YXIgYnVmZmVyTGVuZ3RoID0gc3RyLmxlbmd0aCAqIDAuNzUsIGxlbiA9IHN0ci5sZW5ndGgsIGksIHAgPSAwLCBlbmNvZGVkMSwgZW5jb2RlZDIsIGVuY29kZWQzLCBlbmNvZGVkNDtcblx0XHRpZiAoIHN0clsgc3RyLmxlbmd0aCAtIDEgXSA9PT0gXCI9XCIpXG5cdFx0e1xuXHRcdFx0YnVmZmVyTGVuZ3RoLS07XG5cdFx0XHRpZiAoIHN0clsgc3RyLmxlbmd0aCAtIDIgXSA9PT0gXCI9XCIpXG5cdFx0XHR7XG5cdFx0XHRcdGJ1ZmZlckxlbmd0aC0tO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciBhcnJheWJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlciggYnVmZmVyTGVuZ3RoICksXG5cdFx0Ynl0ZXMgPSBuZXcgVWludDhBcnJheSggYXJyYXlidWZmZXIgKTtcblxuXHRcdGZvciAoIGkgPSAwOyBpIDwgbGVuOyBpICs9IDQgKVxuXHRcdHtcblx0XHRcdGVuY29kZWQxID0gbG9va3VwW3N0ci5jaGFyQ29kZUF0KGkpXTtcblx0XHRcdGVuY29kZWQyID0gbG9va3VwW3N0ci5jaGFyQ29kZUF0KGkrMSldO1xuXHRcdFx0ZW5jb2RlZDMgPSBsb29rdXBbc3RyLmNoYXJDb2RlQXQoaSsyKV07XG5cdFx0XHRlbmNvZGVkNCA9IGxvb2t1cFtzdHIuY2hhckNvZGVBdChpKzMpXTtcblxuXHRcdFx0Ynl0ZXNbcCsrXSA9IChlbmNvZGVkMSA8PCAyKSB8IChlbmNvZGVkMiA+PiA0KTtcblx0XHRcdGJ5dGVzW3ArK10gPSAoKGVuY29kZWQyICYgMTUpIDw8IDQpIHwgKGVuY29kZWQzID4+IDIpO1xuXHRcdFx0Ynl0ZXNbcCsrXSA9ICgoZW5jb2RlZDMgJiAzKSA8PCA2KSB8IChlbmNvZGVkNCAmIDYzKTtcblx0XHR9XG5cdFx0cmV0dXJuIGFycmF5YnVmZmVyO1xuXHR9XG5cdGNvbnZlcnRBcnJheUJ1ZmZlclRvU3RyaW5nKCBhcnJheUJ1ZmZlciApXG5cdHtcblx0XHR2YXIgY2hhcnMgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky9cIjtcblx0XHR2YXIgYnl0ZXMgPSBuZXcgVWludDhBcnJheSggYXJyYXlCdWZmZXIgKSwgaSwgbGVuID0gYnl0ZXMubGVuZ3RoLCBiYXNlNjQgPSBcIlwiO1xuXG5cdFx0Zm9yIChpID0gMDsgaSA8IGxlbjsgaSs9Mylcblx0XHR7XG5cdFx0XHRiYXNlNjQgKz0gY2hhcnNbYnl0ZXNbaV0gPj4gMl07XG5cdFx0XHRiYXNlNjQgKz0gY2hhcnNbKChieXRlc1tpXSAmIDMpIDw8IDQpIHwgKGJ5dGVzW2kgKyAxXSA+PiA0KV07XG5cdFx0XHRiYXNlNjQgKz0gY2hhcnNbKChieXRlc1tpICsgMV0gJiAxNSkgPDwgMikgfCAoYnl0ZXNbaSArIDJdID4+IDYpXTtcblx0XHRcdGJhc2U2NCArPSBjaGFyc1tieXRlc1tpICsgMl0gJiA2M107XG5cdFx0fVxuXG5cdFx0aWYgKChsZW4gJSAzKSA9PT0gMilcblx0XHR7XG5cdFx0XHRiYXNlNjQgPSBiYXNlNjQuc3Vic3RyaW5nKDAsIGJhc2U2NC5sZW5ndGggLSAxKSArIFwiPVwiO1xuXHRcdH1cblx0XHRlbHNlIGlmIChsZW4gJSAzID09PSAxKVxuXHRcdHtcblx0XHRcdGJhc2U2NCA9IGJhc2U2NC5zdWJzdHJpbmcoMCwgYmFzZTY0Lmxlbmd0aCAtIDIpICsgXCI9PVwiO1xuXHRcdH1cblx0XHRyZXR1cm4gYmFzZTY0O1xuXHR9O1xuXHRcdGFzeW5jIGxvYWRJZkV4aXN0KCBwYXRoLCBvcHRpb25zIClcblx0e1xuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLmF3aS5zeXN0ZW0uZXhpc3RzKCBwYXRoICk7XG5cdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyApXG5cdFx0e1xuXHRcdFx0aWYgKCBvcHRpb25zLmVuY29kaW5nID09ICd1dGY4JyApXG5cdFx0XHR7XG5cdFx0XHRcdHRyeVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuYXdpLnN5c3RlbS5yZWFkRmlsZSggcGF0aCwgeyBlbmNvZGluZzogJ3V0ZjgnIH0gKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYXRjaCggZXJyIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBkYXRhOiBudWxsIH07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKCBvcHRpb25zLmVuY29kaW5nID09ICdhcnJheWJ1ZmZlcicgKVxuXHRcdFx0e1xuXHRcdFx0XHR0cnlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmF3aS5zeXN0ZW0ucmVhZEZpbGUoIHBhdGggKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYXRjaCggZXJyIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBkYXRhOiBudWxsIH07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGRhdGE6IG51bGwgfTtcblx0fVxuXG5cdGFzeW5jIGxvYWRGaWxlKCBwYXRoLCBvcHRpb25zIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCB0aGlzLmxvYWRJZkV4aXN0KCBwYXRoLCBvcHRpb25zICk7XG5cdH1cblxuXHRnZXRGaWxlbmFtZUFuZEV4dGVuc2lvbiggcGF0aCApXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5iYXNlbmFtZSggdGhpcy5ub3JtYWxpemUoIHBhdGggKSApO1xuXHR9XG5cblx0ZmlsdGVyRmlsZW5hbWUoIG5hbWUsIHdpbGRjYXJkcyApXG5cdHtcblx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmICggdHlwZW9mIHdpbGRjYXJkcyA9PSAnc3RyaW5nJyApXG5cdFx0XHR3aWxkY2FyZHMgPSBbIHdpbGRjYXJkcyBdO1xuXG5cdFx0Zm9yICggdmFyIHcgPSAwOyB3IDwgd2lsZGNhcmRzLmxlbmd0aDsgdysrIClcblx0XHR7XG5cdFx0XHR2YXIgd2lsZGNhcmQgPSB3aWxkY2FyZHNbIHcgXS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0XHQvLyBMb29rIGZvciAqWyBhbmQgXSpcblx0XHRcdHZhciBzdGFydDtcblx0XHRcdGlmICggKCBzdGFydCA9IHdpbGRjYXJkLmluZGV4T2YoICcqWycgKSApID49IDAgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgZW5kID0gd2lsZGNhcmQuaW5kZXhPZiggJ10qJywgc3RhcnQgKTtcblx0XHRcdFx0aWYgKCBlbmQgPj0gc3RhcnQgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0c3RhcnQgKz0gMjtcblx0XHRcdFx0XHR2YXIgZmlsdGVyID0gd2lsZGNhcmQuc3Vic3RyaW5nKCBzdGFydCwgZW5kICk7XG5cdFx0XHRcdFx0aWYgKCBuYW1lLmluZGV4T2YoIGZpbHRlciApID49IDAgKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0aWYgKCBzdGFydCAtIDIgPT0gMCAmJiBlbmQgKyAyID09IHdpbGRjYXJkLmxlbmd0aCApXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR2YXIgbmV3RmlsdGVyID0gJyc7XG5cdFx0XHRcdFx0Zm9yICggdmFyIGYgPSAwOyBmIDwgZW5kIC0gc3RhcnQ7IGYrKyApXG5cdFx0XHRcdFx0XHRuZXdGaWx0ZXIgKz0gJz8nO1xuXHRcdFx0XHRcdHdpbGRjYXJkID0gd2lsZGNhcmQuc3Vic3RyaW5nKCAwLCBzdGFydCAtIDIgKSArIG5ld0ZpbHRlciArIHdpbGRjYXJkLnN1YnN0cmluZyggZW5kICsgMiApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdG5hbWUgPSB0aGlzLmJhc2VuYW1lKCBuYW1lICk7XG5cdFx0XHR2YXIgcE5hbWUgPSAwO1xuXHRcdFx0dmFyIHBXaWxkID0gMDtcblx0XHRcdHZhciBhZnRlckRvdCA9IGZhbHNlO1xuXHRcdFx0dmFyIGJhZCA9IGZhbHNlO1xuXHRcdFx0ZG9cblx0XHRcdHtcblx0XHRcdFx0dmFyIGNOYW1lID0gbmFtZS5jaGFyQXQoIHBOYW1lICk7XG5cdFx0XHRcdHZhciBjV2lsZCA9IHdpbGRjYXJkLmNoYXJBdCggcFdpbGQgKTtcblx0XHRcdFx0c3dpdGNoICggY1dpbGQgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y2FzZSAnKic6XG5cdFx0XHRcdFx0XHRpZiAoIGFmdGVyRG90IClcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRwTmFtZSA9IG5hbWUubGFzdEluZGV4T2YoICcuJyApO1xuXHRcdFx0XHRcdFx0cFdpbGQgPSB3aWxkY2FyZC5pbmRleE9mKCAnLicgKTtcblx0XHRcdFx0XHRcdGlmICggcE5hbWUgPCAwICYmIHBXaWxkIDwgMCApXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0YWZ0ZXJEb3QgPSB0cnVlO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAnLic6XG5cdFx0XHRcdFx0XHRhZnRlckRvdCA9IHRydWU7XG5cdFx0XHRcdFx0XHRpZiAoIGNOYW1lICE9ICcuJyApXG5cdFx0XHRcdFx0XHRcdGJhZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICc/Jzpcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRpZiAoIGNOYW1lICE9IGNXaWxkIClcblx0XHRcdFx0XHRcdFx0YmFkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBOYW1lKys7XG5cdFx0XHRcdHBXaWxkKys7XG5cdFx0XHR9IHdoaWxlKCAhYmFkICYmIHBOYW1lIDwgbmFtZS5sZW5ndGggJiYgcE5hbWUgPCBuYW1lLmxlbmd0aCApXG5cdFx0XHRpZiggIWJhZCAmJiBwV2lsZCA8IHdpbGRjYXJkLmxlbmd0aCApXG5cdFx0XHRcdGJhZCA9IHRydWU7XG5cdFx0XHRpZiAoICFiYWQgKVxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0YXN5bmMgZ2V0RmlsZUluZm8oIHBhdGggKVxuXHR7XG5cdFx0dmFyIHJlc3VsdCA9IHVuZGVmaW5lZDtcblx0XHR2YXIgc3RhdHMgPSBhd2FpdCB0aGlzLnN0YXRzSWZFeGlzdHMoIHBhdGggKTtcblx0XHRpZiAoIHN0YXRzLmRhdGEgKVxuXHRcdHtcblx0XHRcdHN0YXRzID0gc3RhdHMuZGF0YTtcblx0XHRcdGlmICggc3RhdHMuaXNEaXJlY3RvcnkoKSApXG5cdFx0XHR7XG5cdFx0XHRcdHJlc3VsdCA9XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRuYW1lOiB0aGlzLmdldEZpbGVuYW1lQW5kRXh0ZW5zaW9uKCBwYXRoICksXG5cdFx0XHRcdFx0cGF0aDogcGF0aCxcblx0XHRcdFx0XHRpc0RpcmVjdG9yeTogdHJ1ZSxcblx0XHRcdFx0XHRzaXplOiAwLFxuXHRcdFx0XHRcdHN0YXRzOiBzdGF0c1xuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRyZXN1bHQgPVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bmFtZTogdGhpcy5nZXRGaWxlbmFtZUFuZEV4dGVuc2lvbiggcGF0aCApLFxuXHRcdFx0XHRcdHBhdGg6IHBhdGgsXG5cdFx0XHRcdFx0aXNEaXJlY3Rvcnk6IGZhbHNlLFxuXHRcdFx0XHRcdHNpemU6IHN0YXRzLnNpemUsXG5cdFx0XHRcdFx0c3RhdHM6IHN0YXRzXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0YXN5bmMgZGVsZXRlRGlyZWN0b3J5KCBkZXN0aW5hdGlvblBhdGgsIG9wdGlvbnMsIHRyZWUsIGNvdW50IClcblx0e1xuXHRcdHRyeVxuXHRcdHtcblx0XHRcdGlmICggIXRyZWUgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kuc3lzdGVtLmV4aXN0cyggZGVzdGluYXRpb25QYXRoICk7XG5cdFx0XHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHJlZSA9IGF3YWl0IHRoaXMuYXdpLnN5c3RlbS5nZXREaXJlY3RvcnkoIGRlc3RpbmF0aW9uUGF0aCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdHRyZWUgPSB0cmVlLmRhdGE7XG5cdFx0XHRcdFx0aWYgKCAhdHJlZSApXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0Y291bnQgPSAwO1xuXHRcdFx0fVxuXHRcdFx0Zm9yICggdmFyIGYgaW4gdHJlZSApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBmaWxlID0gdHJlZVsgZiBdO1xuXHRcdFx0XHRpZiAoICFmaWxlLmlzRGlyZWN0b3J5IClcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmF3aS5zeXN0ZW0udW5saW5rKCBmaWxlLnBhdGggKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCBvcHRpb25zLnJlY3Vyc2l2ZSApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y291bnQrKztcblx0XHRcdFx0XHRcdHRoaXMuZGVsZXRlRGlyZWN0b3J5KCBmaWxlLnBhdGgsIG9wdGlvbnMsIGZpbGUuZmlsZXMsIGNvdW50ICk7XG5cdFx0XHRcdFx0XHRjb3VudC0tO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCBjb3VudCA+IDAgfHwgIW9wdGlvbnMua2VlcFJvb3QgKVxuXHRcdFx0XHRhd2FpdCB0aGlzLmF3aS5zeXN0ZW0ucm1kaXIoIGRlc3RpbmF0aW9uUGF0aCApO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdGNhdGNoKCBlcnJvciApXG5cdFx0e1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0Z2V0RmlsZXNGcm9tVHJlZSggdHJlZSwgcmVzdWx0IClcblx0e1xuXHRcdGlmICggIXJlc3VsdCApXG5cdFx0XHRyZXN1bHQgPSB7fTtcblx0XHRmb3IgKCB2YXIgZCA9IDA7IGQgPCB0cmVlLmxlbmd0aDsgZCsrIClcblx0XHR7XG5cdFx0XHR2YXIgZW50cnkgPSB0cmVlWyBkIF07XG5cdFx0XHRpZiAoICFlbnRyeS5pc0RpcmVjdG9yeSApXG5cdFx0XHR7XG5cdFx0XHRcdHJlc3VsdFsgJ1wiJyArIGVudHJ5LnBhdGggKyAnXCInIF0gPSBlbnRyeTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKCBlbnRyeS5maWxlcyApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZ2V0RmlsZXNGcm9tVHJlZSggZW50cnkuZmlsZXMsIHJlc3VsdCApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cdGFzeW5jIHN0YXRzSWZFeGlzdHMoIHBhdGggKVxuXHR7XG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHRoaXMuYXdpLnN5c3RlbS5leGlzdHMoIHBhdGggKTtcblx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmF3aS5zeXN0ZW0uc3RhdCggcGF0aCApO1xuXHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBkYXRhOiBudWxsIH07XG5cdH1cblx0Z2V0RGlyZWN0b3J5QXJyYXlGcm9tVHJlZSggdHJlZSwgb3B0aW9ucyApXG5cdHtcblx0XHR2YXIgcmVzdWx0ID0gW107XG5cdFx0dGhpcy5nZXREaXJBcnJheUZyb21UcmVlKCB0cmVlLCByZXN1bHQgKTtcblxuXHRcdGlmICggb3B0aW9ucy5zb3J0IClcblx0XHR7XG5cdFx0XHRyZXN1bHQuc29ydCggZnVuY3Rpb24oIGEsIGIgKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoIGEucGF0aCA9PSBiLnBhdGggKVxuXHRcdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0XHRpZiAoIGEucGF0aC5pbmRleE9mKCBiLnBhdGggKSA9PSAwIClcblx0XHRcdFx0XHRyZXR1cm4gYS5wYXRoLmxlbmd0aCA8IGIucGF0aC5sZW5ndGggPyAtMSA6IDE7XG5cdFx0XHRcdGlmICggYi5wYXRoLmluZGV4T2YoIGEucGF0aCApID09IDAgKVxuXHRcdFx0XHRcdHJldHVybiBiLnBhdGgubGVuZ3RoIDwgYS5wYXRoLmxlbmd0aCA/IC0xIDogMTtcblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9ICk7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0Z2V0RGlyQXJyYXlGcm9tVHJlZSggdHJlZSwgcmVzdWx0IClcblx0e1xuXHRcdHRyZWUgPSB0eXBlb2YgdHJlZSA9PSAndW5kZWZpbmVkJyA/IFtdIDogdHJlZTtcblx0XHRyZXN1bHQgPSB0eXBlb2YgcmVzdWx0ID09ICd1bmRlZmluZWQnID8gW10gOiByZXN1bHQ7XG5cdFx0Zm9yICggdmFyIGQgPSAwOyBkIDwgdHJlZS5sZW5ndGg7IGQrKyApXG5cdFx0e1xuXHRcdFx0dmFyIGVudHJ5ID0gdHJlZVsgZCBdO1xuXHRcdFx0aWYgKCBlbnRyeS5pc0RpcmVjdG9yeSApXG5cdFx0XHR7XG5cdFx0XHRcdHJlc3VsdC5wdXNoKCBlbnRyeSApO1xuXHRcdFx0XHRpZiAoIGVudHJ5LmZpbGVzIClcblx0XHRcdFx0XHR0aGlzLmdldERpckFycmF5RnJvbVRyZWUoIGVudHJ5LmZpbGVzLCByZXN1bHQgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRnZXRGaWxlQXJyYXlGcm9tVHJlZSggdHJlZSwgcmVzdWx0IClcblx0e1xuXHRcdHRyZWUgPSB0eXBlb2YgdHJlZSA9PSAndW5kZWZpbmVkJyA/IFtdIDogdHJlZTtcblx0XHRyZXN1bHQgPSB0eXBlb2YgcmVzdWx0ID09ICd1bmRlZmluZWQnID8gW10gOiByZXN1bHQ7XG5cdFx0Zm9yICggdmFyIGQgPSAwOyBkIDwgdHJlZS5sZW5ndGg7IGQrKyApXG5cdFx0e1xuXHRcdFx0dmFyIGVudHJ5ID0gdHJlZVsgZCBdO1xuXHRcdFx0aWYgKCAhZW50cnkuaXNEaXJlY3RvcnkgKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXN1bHQucHVzaCggZW50cnkgKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKCBlbnRyeS5maWxlcyApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZ2V0RmlsZUFycmF5RnJvbVRyZWUoIGVudHJ5LmZpbGVzLCByZXN1bHQgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRjaGVja1VuZGVmaW5lZCggdmFsdWUsIGRlZmF1bHRWYWx1ZSApXG5cdHtcblx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PSAndW5kZWZpbmVkJyApXG5cdFx0XHR2YWx1ZSA9IGRlZmF1bHRWYWx1ZTtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblx0dG9CaW4oIG51bWJlciwgZGlnaXRzIClcblx0e1xuXHRcdHZhciByZXN1bHQgPSBNYXRoLmZsb29yKCBudW1iZXIgKS50b1N0cmluZyggMiApO1xuXHRcdGZvciAoIHZhciBsID0gcmVzdWx0Lmxlbmd0aDsgbCA8IGRpZ2l0czsgbCsrIClcblx0XHRcdHJlc3VsdCA9ICcwJyArIHJlc3VsdDtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cdHRvSGV4KCBudW1iZXIsIGRpZ2l0cyApXG5cdHtcblx0XHR2YXIgcmVzdWx0ID0gTWF0aC5mbG9vciggbnVtYmVyICkudG9TdHJpbmcoIDE2ICk7XG5cdFx0Zm9yICggdmFyIGwgPSByZXN1bHQubGVuZ3RoOyBsIDwgZGlnaXRzOyBsKysgKVxuXHRcdFx0cmVzdWx0ID0gJzAnICsgcmVzdWx0O1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0Y29weURhdGEoIGRlc3RpbmF0aW9uLCBzb3VyY2UsIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRpZiAoICFvcHRpb25zLnJlY3Vyc2l2ZSApXG5cdFx0e1xuXHRcdFx0Zm9yICggdmFyIGQgaW4gc291cmNlIClcblx0XHRcdFx0ZGVzdGluYXRpb25bIGQgXSA9IHNvdXJjZVsgZCBdO1xuXHRcdFx0cmV0dXJuIGRlc3RpbmF0aW9uO1xuXHRcdH1cblx0XHRmb3IgKCB2YXIgZCBpbiBzb3VyY2UgKVxuXHRcdHtcblx0XHRcdHZhciBwcm9wID0gc291cmNlWyBkIF07XG5cdFx0XHRpZiAoIHRoaXMuaXNPYmplY3QoIHByb3AgKSApXG5cdFx0XHRcdGRlc3RpbmF0aW9uWyBkIF0gPSB0aGlzLmNvcHlEYXRhKCB7fSwgcHJvcCApO1xuXHRcdFx0ZWxzZSBpZiAoIHRoaXMuaXNBcnJheSggcHJvcCApIClcblx0XHRcdFx0ZGVzdGluYXRpb25bIGQgXSA9IHRoaXMuY29weUFycmF5KCBwcm9wICk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdGRlc3RpbmF0aW9uWyBkIF0gPSBwcm9wO1xuXHRcdH1cblx0XHRyZXR1cm4gZGVzdGluYXRpb247XG5cdH1cblx0YXN5bmMgbG9hZEhKU09OKCBwYXRoIClcblx0e1xuXHRcdHBhdGggPSB0aGlzLm5vcm1hbGl6ZSggcGF0aCApO1xuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCB0aGlzLmxvYWRGaWxlKCBwYXRoLCB7IGVuY29kaW5nOiAndXRmOCcgfSApO1xuXHRcdFx0aWYgKCAhYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0XHRyZXR1cm4gYW5zd2VyO1xuXHRcdFx0cmV0dXJuIHRoaXMuYXdpLnN5c3RlbS5oSnNvblBhcnNlKCBhbnN3ZXIuZGF0YSApO1xuXHRcdH1cblx0XHRjYXRjaCggZSApXG5cdFx0e1xuXHRcdH1cblx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZGF0YTogbnVsbCwgZXJyb3I6ICdhd2k6aWxsZWdhbC1qc29uOml3YScgfTtcblx0fVxuXHRhc3luYyBzYXZlSEpTT04oIHBhdGgsIGRhdGEgKVxuXHR7XG5cdFx0cGF0aCA9IHRoaXMubm9ybWFsaXplKCBwYXRoICk7XG5cdFx0dmFyIGpzb24gPSB0aGlzLmF3aS5zeXN0ZW0uaEpzb25TdHJpbmdpZnkoIGRhdGEgKTtcblx0XHRpZiAoICFqc29uLnN1Y2Nlc3MgKVxuXHRcdFx0cmV0dXJuIGpzb247XG5cdFx0cmV0dXJuIGF3YWl0IHRoaXMuYXdpLnN5c3RlbS53cml0ZUZpbGUoIHBhdGgsIGpzb24uZGF0YSwgeyBlbmNvZGluZzogJ3V0ZjgnIH0gKTtcblx0fVxuXHRhc3luYyBsb2FkSlNPTiggcGF0aCApXG5cdHtcblx0XHRwYXRoID0gdGhpcy5ub3JtYWxpemUoIHBhdGggKTtcblx0XHR0cnlcblx0XHR7XG5cdFx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5sb2FkRmlsZSggcGF0aCwgeyBlbmNvZGluZzogJ3V0ZjgnIH0gKTtcblx0XHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdFx0XHRyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBKU09OLnBhcnNlKCBhbnN3ZXIuZGF0YSApIH07XG5cdFx0XHRyZXR1cm4gYW5zd2VyO1xuXHRcdH1cblx0XHRjYXRjaCggZSApXG5cdFx0e1xuXHRcdH1cblx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZGF0YTogbnVsbCwgZXJyb3I6ICdhd2k6aWxsZWdhbC1qc29uOml3YScgfTtcblx0fVxuXHRhc3luYyBzYXZlSlNPTiggcGF0aCwgZGF0YSApXG5cdHtcblx0XHRwYXRoID0gdGhpcy5ub3JtYWxpemUoIHBhdGggKTtcblx0XHR2YXIganNvbiA9IEpTT04uc3RyaW5naWZ5KCBkYXRhICk7XG5cdFx0cmV0dXJuIGF3YWl0IHRoaXMuYXdpLnN5c3RlbS53cml0ZUZpbGUoIHBhdGgsIGpzb24sIHsgZW5jb2Rpbmc6ICd1dGY4JyB9ICk7XG5cdH1cblx0anVzdGlmeVRleHQoIHRleHQsIG1heFdpZHRoIClcblx0e1xuXHRcdHZhciB3b3JkcyA9IHRleHQuc3BsaXQoICcgJyApO1xuXHRcdHZhciBsaW5lcyA9IFsgJycgXTtcblx0XHR2YXIgY291bnQgPSAwO1xuXHRcdGZvciAoIHZhciB3ID0gMDsgdyA8IHdvcmRzLmxlbmd0aDsgdysrIClcblx0XHR7XG5cdFx0XHRpZiAoIGxpbmVzWyBjb3VudCBdLmxlbmd0aCA+PSBtYXhXaWR0aCApXG5cdFx0XHR7XG5cdFx0XHRcdGxpbmVzWyBjb3VudCBdID0gbGluZXNbIGNvdW50IF0udHJpbSgpO1xuXHRcdFx0XHRsaW5lcy5wdXNoKCAnJyApO1xuXHRcdFx0XHRjb3VudCsrO1xuXHRcdFx0fVxuXHRcdFx0bGluZXNbIGNvdW50IF0gKz0gd29yZHNbIHcgXSArICcgJztcblx0XHR9XG5cdFx0cmV0dXJuIGxpbmVzO1xuXHR9XG5cdHJlbW92ZUJhc2VQYXRoKCBwYXRoLCBkaXJlY3RvcmllcyApXG5cdHtcblx0XHRwYXRoID0gdGhpcy5ub3JtYWxpemUoIHBhdGggKTtcblx0XHRmb3IgKCB2YXIgZCA9IDA7IGQgPCBkaXJlY3Rvcmllcy5sZW5ndGg7IGQrKyApXG5cdFx0e1xuXHRcdFx0dmFyIHN0YXJ0UGF0aCA9IHRoaXMubm9ybWFsaXplKCBkaXJlY3Rvcmllc1sgZCBdICk7XG5cdFx0XHRpZiAoIHBhdGguaW5kZXhPZiggc3RhcnRQYXRoICkgPT0gMCApXG5cdFx0XHR7XG5cdFx0XHRcdHBhdGggPSBwYXRoLnN1YnN0cmluZyggc3RhcnRQYXRoLmxlbmd0aCArIDEgKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBwYXRoO1xuXHR9XG5cdGV4dHJhY3RTdHJpbmcoIGxpbmUsIHN0YXJ0IClcblx0e1xuXHRcdHZhciBlbmQsIGVuZEN1dDtcblx0XHR2YXIgcXVvdGUgPSBsaW5lLmNoYXJBdCggc3RhcnQgKTtcblx0XHRpZiAoIHF1b3RlID09ICdcIicgfHwgcXVvdGUgPT0gXCInXCIgKVxuXHRcdHtcblx0XHRcdHN0YXJ0Kys7XG5cdFx0XHRlbmRDdXQgPSBzdGFydDtcblx0XHRcdHdoaWxlICggbGluZS5jaGFyQXQoIGVuZEN1dCApICE9IHF1b3RlICYmIGVuZEN1dCA8IGxpbmUubGVuZ3RoIClcblx0XHRcdFx0ZW5kQ3V0Kys7XG5cdFx0XHRlbmQgPSBNYXRoLm1pbiggbGluZS5sZW5ndGgsIGVuZEN1dCArIDEgKVxuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0ZW5kQ3V0ID0gbGluZS5pbmRleE9mKCAnICcsIHN0YXJ0ICk7XG5cdFx0XHRpZiAoIGVuZEN1dCA8IDAgKVxuXHRcdFx0XHRlbmRDdXQgPSBsaW5lLmxlbmd0aDtcblx0XHRcdGVuZCA9IGVuZEN1dDtcblx0XHR9XG5cdFx0cmV0dXJuIHsgdGV4dDogbGluZS5zdWJzdHJpbmcoIHN0YXJ0LCBlbmRDdXQgKSwgZW5kOiBlbmQgfTtcblx0fVxuXHRleHRyYWN0TGluZVBhcmFtZXRlcnMoIGxpbmUsIHBhcmFtZXRlcnMgKVxuXHR7XG5cdFx0dmFyIGRhdGEgPSB7IGNvbW1hbmQ6ICcnIH07XG5cdFx0Zm9yICggdmFyIHAgPSAwOyBwIDwgcGFyYW1ldGVycy5sZW5ndGg7IHArKyApXG5cdFx0e1xuXHRcdFx0dmFyIHBhcmFtZXRlciA9IHBhcmFtZXRlcnNbIHAgXTtcblx0XHRcdHZhciBzdGFydCA9IGxpbmUuaW5kZXhPZiggJy0nICsgcGFyYW1ldGVyLm5hbWUgKyAnOicgKTtcblx0XHRcdGlmICggc3RhcnQgPj0gMCApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBpbmZvID0gdGhpcy5leHRyYWN0U3RyaW5nKCBsaW5lLCBzdGFydCArIHBhcmFtZXRlci5uYW1lLmxlbmd0aCArIDIgKTtcblx0XHRcdFx0bGluZSA9IGxpbmUuc3Vic3RyaW5nKCAwLCBzdGFydCApICsgbGluZS5zdWJzdHJpbmcoIGluZm8uZW5kICk7XG5cdFx0XHRcdGlmICggcGFyYW1ldGVyLnR5cGUgPT0gJ251bWJlcicgKVxuXHRcdFx0XHRcdGRhdGFbIHBhcmFtZXRlci5uYW1lIF0gPSBwYXJzZUludCggaW5mby50ZXh0ICk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRkYXRhWyBwYXJhbWV0ZXIubmFtZSBdID0gaW5mby50ZXh0O1xuXHRcdFx0fVxuXHRcdH1cblx0XHRkYXRhLmNvbW1hbmQgPSBsaW5lLnRyaW0oKTtcblx0XHRyZXR1cm4gZGF0YTtcblx0fVxuXHRleHRyYWN0TGlua3MoIGxpbmUsIHBvc2l0aW9uIClcblx0e1xuXHRcdHZhciByZXN1bHQgPSB7IHZpZGVvczogW10sIGltYWdlczogW10sIHBob3RvczogW10sIGxpbmtzOiBbXSwgYXVkaW9zOiBbXSwgZm91bmQ6IGZhbHNlIH1cblx0XHR2YXIgc3RhcnQ7XG5cdFx0aWYgKCAoIHN0YXJ0ID0gbGluZS5pbmRleE9mKCAnPGEgJywgcG9zaXRpb24gKSApID49IDAgKVxuXHRcdHtcblx0XHRcdHZhciBlbmQgPSBsaW5lLmluZGV4T2YoICc+JyApO1xuXHRcdFx0aWYgKCBlbmQgPj0gMCApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBwb3MgPSBsaW5lLmluZGV4T2YoICdocmVmPScsIHN0YXJ0ICk7XG5cdFx0XHRcdHJlc3VsdC5saW5rcy5wdXNoKCB0aGlzLmV4dHJhY3RTdHJpbmcoIGxpbmUsIHBvcyApICk7XG5cdFx0XHRcdHJlc3VsdC5mb3VuZCA9IHRydWU7XG5cdFx0XHRcdGxpbmUgPSBsaW5lLnN1YnN0cmluZyggMCwgc3RhcnQgKSArIGxpbmUuc3Vic3RyaW5nKCBlbmQgKyAxICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICggKCBzdGFydCA9IGxpbmUuaW5kZXhPZiggJzx2aWRlbyAnLCBwb3NpdGlvbiApICkgPj0gMCApXG5cdFx0e1xuXHRcdFx0dmFyIGVuZCA9IGxpbmUuaW5kZXhPZiggJz4nICk7XG5cdFx0XHRpZiAoIGVuZCA+PSAwIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIHBvcyA9IGxpbmUuaW5kZXhPZiggJ3NyYz0nLCBzdGFydCApO1xuXHRcdFx0XHRyZXN1bHQudmlkZW9zLnB1c2goIHRoaXMuZXh0cmFjdFN0cmluZyggbGluZSwgcG9zICkgKTtcblx0XHRcdFx0cmVzdWx0LmZvdW5kID0gdHJ1ZTtcblx0XHRcdFx0bGluZSA9IGxpbmUuc3Vic3RyaW5nKCAwLCBzdGFydCApICsgbGluZS5zdWJzdHJpbmcoIGVuZCArIDEgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKCAoIHN0YXJ0ID0gbGluZS5pbmRleE9mKCAnPGF1ZGlvICcsIHBvc2l0aW9uICkgKSA+PSAwIClcblx0XHR7XG5cdFx0XHR2YXIgZW5kID0gbGluZS5pbmRleE9mKCAnPicgKTtcblx0XHRcdGlmICggZW5kID49IDAgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgcG9zID0gbGluZS5pbmRleE9mKCAnc3JjPScsIHN0YXJ0ICk7XG5cdFx0XHRcdHJlc3VsdC5hdWRpb3MucHVzaCggdGhpcy5leHRyYWN0U3RyaW5nKCBsaW5lLCBwb3MgKSApO1xuXHRcdFx0XHRyZXN1bHQuZm91bmQgPSB0cnVlO1xuXHRcdFx0XHRsaW5lID0gbGluZS5zdWJzdHJpbmcoIDAsIHN0YXJ0ICkgKyBsaW5lLnN1YnN0cmluZyggZW5kICsgMSApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoICggc3RhcnQgPSBsaW5lLmluZGV4T2YoICc8aW1nICcsIHBvc2l0aW9uICkgKSA+PSAwIClcblx0XHR7XG5cdFx0XHR2YXIgZW5kID0gbGluZS5pbmRleE9mKCAnPicgKTtcblx0XHRcdGlmICggZW5kID49IDAgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgcG9zID0gbGluZS5pbmRleE9mKCAnc3JjPScsIHN0YXJ0ICk7XG5cdFx0XHRcdHJlc3VsdC5pbWFnZXMucHVzaCggdGhpcy5leHRyYWN0U3RyaW5nKCBsaW5lLCBwb3MgKSApO1xuXHRcdFx0XHRyZXN1bHQuZm91bmQgPSB0cnVlO1xuXHRcdFx0XHRsaW5lID0gbGluZS5zdWJzdHJpbmcoIDAsIHN0YXJ0ICkgKyBsaW5lLnN1YnN0cmluZyggZW5kICsgMSApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoICggc3RhcnQgPSBsaW5lLmluZGV4T2YoICc8JywgcG9zaXRpb24gKSApID49IDAgKVxuXHRcdHtcblx0XHRcdHZhciBlbmQgPSBsaW5lLmluZGV4T2YoICc+JyApO1xuXHRcdFx0aWYgKCBlbmQgPj0gMCApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBwb3MgPSBsaW5lLmluZGV4T2YoICdzcmM9Jywgc3RhcnQgKTtcblx0XHRcdFx0cmVzdWx0LmltYWdlcy5wdXNoKCB0aGlzLmV4dHJhY3RTdHJpbmcoIGxpbmUsIHBvcyApICk7XG5cdFx0XHRcdHJlc3VsdC5mb3VuZCA9IHRydWU7XG5cdFx0XHRcdGxpbmUgPSBsaW5lLnN1YnN0cmluZyggMCwgc3RhcnQgKSArIGxpbmUuc3Vic3RyaW5nKCBlbmQgKyAxICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJlc3VsdC5saW5lID0gbGluZTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cdGNsZWFuTGlua3MoIGxpbmUgKVxuXHR7XG5cdFx0dmFyIHN0YXJ0ID0gbGluZS5pbmRleE9mKCAnPCcgKTtcblx0XHR3aGlsZSggc3RhcnQgPj0gMCApXG5cdFx0e1xuXHRcdFx0dmFyIGVuZCA9IGxpbmUuaW5kZXhPZiggJz4nLCBzdGFydCApO1xuXHRcdFx0bGluZSA9IGxpbmUuc3Vic3RyaW5nKCAwLCBzdGFydCApICsgbGluZS5zdWJzdHJpbmcoIGVuZCArIDEgKTtcblx0XHRcdHN0YXJ0ID0gbGluZS5pbmRleE9mKCAnPCcgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGxpbmUudHJpbSgpO1xuXHR9XG5cdGdldEZpbmFsSHRtbERhdGEoIHN0cnVjdHVyZSApXG5cdHtcblx0XHRmdW5jdGlvbiBnZXRJdCggcGFyZW50LCBwaWxlIClcblx0XHR7XG5cdFx0XHRmb3IgKCB2YXIgcyA9IDA7IHMgPCBwYXJlbnQubGVuZ3RoOyBzKysgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgc3RydWN0ID0gcGFyZW50WyBzIF07XG5cdFx0XHRcdGlmICggc3RydWN0LmNoaWxkcmVuLmxlbmd0aCA9PSAwIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHBpbGUucHVzaCggc3RydWN0LnRleHQgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRwaWxlLnB1c2goIC4uLmdldEl0KCBzdHJ1Y3QuY2hpbGRyZW4sIFtdICkgKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcGlsZTtcblx0XHR9XG5cdFx0cmV0dXJuIGdldEl0KCBzdHJ1Y3R1cmUsIFtdICk7XG5cdH1cblx0ZXhwbG9kZUh0bWwoIG5hbWUsIGh0bWwsIG9wdGlvbnMgKVxuXHR7XG5cdFx0ZnVuY3Rpb24gZXhwbG9kZSggbmFtZSwgaHRtbCwgb3B0aW9ucywgcGlsZSApXG5cdFx0e1xuXHRcdFx0dmFyIHN0YXJ0ID0gMDtcblx0XHRcdHZhciBlbmQgPSBzdGFydDtcblx0XHRcdGRvXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBzdGFydFRleHQ7XG5cdFx0XHRcdHZhciBzdGFydDEgPSBodG1sLmluZGV4T2YoICc8JyArIG5hbWUgKyAnICcsIGVuZCApO1xuXHRcdFx0XHR2YXIgc3RhcnQyID0gIGh0bWwuaW5kZXhPZiggJzwnICsgbmFtZSArICc+JywgZW5kICk7XG5cdFx0XHRcdHN0YXJ0MSA9ICggc3RhcnQxIDwgMCA/IGh0bWwubGVuZ3RoIDogc3RhcnQxICk7XG5cdFx0XHRcdHN0YXJ0MiA9ICggc3RhcnQyIDwgMCA/IGh0bWwubGVuZ3RoIDogc3RhcnQyICk7XG5cdFx0XHRcdGlmICggc3RhcnQxID49IGh0bWwubGVuZ3RoICYmIHN0YXJ0MiA+PSBodG1sLmxlbmd0aCApXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0aWYgKCBzdGFydDEgPCBzdGFydDIgKVxuXHRcdFx0XHRcdHN0YXJ0VGV4dCA9IGh0bWwuaW5kZXhPZiggJz4nLCBzdGFydDEgKyAxICkgKyAxO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0c3RhcnRUZXh0ID0gc3RhcnQyICsgbmFtZS5sZW5ndGggKyAyO1xuXHRcdFx0XHRzdGFydCA9IE1hdGgubWluKCBzdGFydDEsIHN0YXJ0MiApO1xuXG5cdFx0XHRcdHZhciBjb3VudCA9IDE7XG5cdFx0XHRcdGVuZCA9IHN0YXJ0VGV4dDtcblx0XHRcdFx0ZG9cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBuZXh0MSA9IGh0bWwuaW5kZXhPZiggJzwnICsgbmFtZSArICcgJywgZW5kICk7XG5cdFx0XHRcdFx0dmFyIG5leHQyID0gaHRtbC5pbmRleE9mKCAnPCcgKyBuYW1lICsgJz4nLCBlbmQgKTtcblx0XHRcdFx0XHR2YXIgbmV4dDMgPSBodG1sLmluZGV4T2YoICc8LycgKyBuYW1lICsgJz4nLCBlbmQgKTtcblx0XHRcdFx0XHRpZiAoIG5leHQxID49IDAgKVxuXHRcdFx0XHRcdFx0bmV4dDEgPSBodG1sLmluZGV4T2YoICc+JywgbmV4dDEgKTtcblx0XHRcdFx0XHRuZXh0MSA9ICggbmV4dDEgPCAwID8gaHRtbC5sZW5ndGggOiBuZXh0MSApO1xuXHRcdFx0XHRcdG5leHQyID0gKCBuZXh0MiA8IDAgPyBodG1sLmxlbmd0aCA6IG5leHQyICk7XG5cdFx0XHRcdFx0bmV4dDMgPSAoIG5leHQzIDwgMCA/IGh0bWwubGVuZ3RoIDogbmV4dDMgKTtcblx0XHRcdFx0XHR2YXIgbmV4dCA9IE1hdGgubWluKCBuZXh0MSwgTWF0aC5taW4oIG5leHQyLCBuZXh0MyApICk7XG5cdFx0XHRcdFx0aWYgKCBuZXh0ID09IGh0bWwubGVuZ3RoIClcblx0XHRcdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0XHRcdGlmICggbmV4dCA9PSBuZXh0MyApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y291bnQtLTtcblx0XHRcdFx0XHRcdGlmICggY291bnQgPT0gMCApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGVuZCA9IG5leHQzO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVuZCA9IG5leHQgKyAxO1xuXHRcdFx0XHR9IHdoaWxlKCB0cnVlICk7XG5cdFx0XHRcdGlmICggZW5kID4gc3RhcnQgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIGRhdGEgPVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHR5cGU6IG5hbWUsXG5cdFx0XHRcdFx0XHRzdGFydDogc3RhcnQsXG5cdFx0XHRcdFx0XHRlbmQ6IGVuZCArIG5hbWUubGVuZ3RoICsgMyxcblx0XHRcdFx0XHRcdHN0YXJ0VGV4dDogc3RhcnRUZXh0LFxuXHRcdFx0XHRcdFx0ZW5kVGV4dDogZW5kLFxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtdXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRkYXRhLnRleHQgPSBodG1sLnN1YnN0cmluZyggZGF0YS5zdGFydFRleHQsIGRhdGEuZW5kVGV4dCApO1xuXHRcdFx0XHRcdGlmICggZGF0YS50ZXh0ICE9ICcnIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRwaWxlLnB1c2goIGRhdGEgKTtcblx0XHRcdFx0XHRcdGlmICggb3B0aW9ucy5yZWN1cnNpdmUgKVxuXHRcdFx0XHRcdFx0XHRkYXRhLmNoaWxkcmVuID0gZXhwbG9kZSggbmFtZSwgZGF0YS50ZXh0LCBvcHRpb25zLCBbXSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbmQgPSBkYXRhLmVuZDtcblx0XHRcdFx0fVxuXHRcdFx0fSB3aGlsZSggdHJ1ZSApXG5cdFx0XHRyZXR1cm4gcGlsZTtcblx0XHR9XG5cdFx0dmFyIHN0cnVjdHVyZSA9IGV4cGxvZGUoIG5hbWUsIGh0bWwsIG9wdGlvbnMsIFtdICk7XG5cdFx0cmV0dXJuIHN0cnVjdHVyZTtcblx0fVxuXHRnZXRCdWJibGVQYXJhbXMoIHByb3BzIClcblx0e1xuXHRcdGlmICggdHlwZW9mIHByb3BzLnBhcmFtZXRlcnMgIT0gJ3VuZGVmaW5lZCcgKVxuXHRcdFx0cmV0dXJuIHByb3BzLnBhcmFtZXRlcnNbIDAgXTtcblxuXHRcdHZhciBwYXJhbSA9IHt9O1xuXHRcdGZvciAoIHZhciBwIGluIHByb3BzIClcblx0XHR7XG5cdFx0XHRpZiAoIHAgPT0gJ3R5cGUnIHx8IHAgPT0gJ2ludGVydmFsJyB8fCBwID09ICdkZWZhdWx0JyB8fCBwID09ICdvcHRpb25hbCcgfHwgcCA9PSAnY2xlYXInIHx8IHAgPT0gJ2Nob2ljZXMnIClcblx0XHRcdFx0cGFyYW1bIHAgXSA9IHByb3BzWyBwIF07XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGlmICggcGFyYW1bICduYW1lJyBdIClcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdFx0cGFyYW1bICduYW1lJyBdID0gcDtcblx0XHRcdFx0cGFyYW1bICdkZXNjcmlwdGlvbicgXSA9IHByb3BzWyBwIF07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBwYXJhbVxuXHR9XG5cdHJlbW92ZUR1cGxpY2F0ZXNGcm9tRmlsZXMoIHNvdXJjZUZpbGVzIClcblx0e1xuXHRcdHZhciBuZXdBcnJheSA9IFtdO1xuXHRcdGZvciAoIHZhciBzID0gMDsgcyA8IHNvdXJjZUZpbGVzLmxlbmd0aDsgcysrIClcblx0XHR7XG5cdFx0XHR2YXIgZmlsZSA9IHNvdXJjZUZpbGVzWyBzIF07XG5cdFx0XHR2YXIgZm91bmQgPSBuZXdBcnJheS5maW5kKFxuXHRcdFx0XHRmdW5jdGlvbiggZWxlbWVudCApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyZXR1cm4gZmlsZS5uYW1lID09IGVsZW1lbnQubmFtZTtcblx0XHRcdFx0fSApO1xuXHRcdFx0aWYgKCAhZm91bmQgKVxuXHRcdFx0XHRuZXdBcnJheS5wdXNoKCBmaWxlIClcblx0XHR9XG5cdFx0cmV0dXJuIG5ld0FycmF5O1xuXHR9XG5cdGdldENvbnRyb2xQYXJhbWV0ZXJzKCBjb250cm9sLCB2YXJpYWJsZXMgKVxuXHR7XG5cdFx0dmFyIHBhcmFtZXRlcnMgPSB7fTtcblx0XHRmb3IgKCB2YXIgcCBpbiB2YXJpYWJsZXMgKVxuXHRcdHtcblx0XHRcdGlmICggdHlwZW9mIGNvbnRyb2xbIHAgXSAhPSAndW5kZWZpbmVkJyApXG5cdFx0XHR7XG5cdFx0XHRcdHBhcmFtZXRlcnNbIHAgXSA9IGNvbnRyb2xbIHAgXTtcblx0XHRcdFx0Y29udHJvbFsgcCBdID0gdW5kZWZpbmVkO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRwYXJhbWV0ZXJzWyBwIF0gPSB2YXJpYWJsZXNbIHAgXTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhcmFtZXRlcnM7XG5cdH1cblx0Zm9ybWF0KCBwcm9tcHQsIGFyZ3MgKVxuXHR7XG5cdFx0ZG9cblx0XHR7XG5cdFx0XHR2YXIgZG9uZSA9IGZhbHNlO1xuXHRcdFx0dmFyIHN0YXJ0ID0gcHJvbXB0Lmxhc3RJbmRleE9mKCAneycgKTtcblx0XHRcdHdoaWxlKCBzdGFydCA+PSAwIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGVuZCA9IHByb21wdC5pbmRleE9mKCAnfScsIHN0YXJ0ICk7XG5cdFx0XHRcdGlmICggZW5kID49IHN0YXJ0IClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBrZXkgPSBwcm9tcHQuc3Vic3RyaW5nKCBzdGFydCArIDEsIGVuZCApO1xuXHRcdFx0XHRcdGlmICggYXJnc1sga2V5IF0gKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHByb21wdCA9IHByb21wdC5zdWJzdHJpbmcoIDAsIHN0YXJ0ICkgKyBhcmdzWyBrZXkgXSArIHByb21wdC5zdWJzdHJpbmcoIGVuZCArIDEgKTtcblx0XHRcdFx0XHRcdGRvbmUgPSB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRwcm9tcHQgPSBwcm9tcHQuc3Vic3RyaW5nKCAwLCBzdGFydCApICsgcHJvbXB0LnN1YnN0cmluZyggZW5kICsgMSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHN0YXJ0ID0gcHJvbXB0Lmxhc3RJbmRleE9mKCAneycsIHN0YXJ0IC0gMSApO1xuXHRcdFx0fVxuXHRcdH0gd2hpbGUoIGRvbmUgKVxuXHRcdHJldHVybiBwcm9tcHQ7XG5cdH1cblx0Z2V0VW5pcXVlSWRlbnRpZmllciggdG9DaGVjayA9IHt9LCByb290ID0gJycsIGNvdW50ID0gMCwgdGltZVN0cmluZyA9ICcnLCBuTnVtYmVycyA9IDMsIG5MZXR0ZXJzID0gMyApXG5cdHtcblx0XHR2YXIgaWQ7XG5cdFx0ZG9cblx0XHR7XG5cdFx0XHRpZCA9IHJvb3QgKyAoIHJvb3QgPyAnXycgOiAnJyApICsgY291bnQ7XG5cdFx0XHRpZiAoIHRpbWVTdHJpbmcgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgY3VycmVudGRhdGUgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0XHR2YXIgdGltZSA9IHRoaXMuZm9ybWF0KCB0aW1lU3RyaW5nLFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0ZGF5OiBjdXJyZW50ZGF0ZS5nZXREYXRlKCksXG5cdFx0XHRcdFx0bW9udGg6IGN1cnJlbnRkYXRlLmdldE1vbnRoKCksXG5cdFx0XHRcdFx0eWVhcjogIGN1cnJlbnRkYXRlLmdldEZ1bGxZZWFyKCksXG5cdFx0XHRcdFx0aG91cjogIGN1cnJlbnRkYXRlLmdldEhvdXJzKCksXG5cdFx0XHRcdFx0bWludXRlOiAgY3VycmVudGRhdGUuZ2V0TWludXRlcygpLFxuXHRcdFx0XHRcdHNlY29uZDogY3VycmVudGRhdGUuZ2V0U2Vjb25kcygpLFxuXHRcdFx0XHRcdG1pbGxpOiBjdXJyZW50ZGF0ZS5nZXRNaWxsaXNlY29uZHMoKSxcblx0XHRcdFx0fSApO1xuXHRcdFx0XHRpZiAoIHRpbWUgKVxuXHRcdFx0XHRcdGlkICs9ICdfJyArIHRpbWU7XG5cdFx0XHR9XG5cdFx0XHR2YXIgbnVtYmVycyA9ICcnO1xuXHRcdFx0Zm9yICggdmFyIG4gPSAwOyBuIDwgbk51bWJlcnM7IG4rKyApXG5cdFx0XHRcdG51bWJlcnMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSggNDggKyBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMTAgKSApO1xuXHRcdFx0aWQgKz0gJ18nICsgbnVtYmVycztcblx0XHRcdHZhciBsZXR0ZXJzID0gJyc7XG5cdFx0XHRmb3IgKCB2YXIgbiA9IDA7IG4gPCBuTGV0dGVyczsgbisrIClcblx0XHRcdFx0bGV0dGVycyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCA2NSArIE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAyNiApICk7XG5cdFx0XHRpZCArPSBsZXR0ZXJzO1xuXHRcdH0gd2hpbGUoIHRvQ2hlY2tbIGlkIF0gKTtcblx0XHRyZXR1cm4gaWQ7XG5cdH1cblx0bWF0Y2hSZWdleCggdGV4dCwgcmVnZXggKVxuXHR7XG5cdFx0aWYgKCAhdGhpcy5pc0FycmF5KCByZWdleCApIClcblx0XHRcdHJlZ2V4ID0gWyByZWdleCBdO1xuXHRcdGZvciAoIHZhciByID0gMDsgciA8IHJlZ2V4Lmxlbmd0aDsgcisrIClcblx0XHR7XG5cdFx0XHR2YXIgbWF0Y2hlcyA9IHRleHQubWF0Y2goIHJlZ2V4WyByIF0gKTtcblx0XHRcdGlmICggbWF0Y2hlcyApXG5cdFx0XHRcdHJldHVybiBtYXRjaGVzO1xuXHRcdH1cblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXHRmaWxsU3RyaW5nKCB0ZXh0LCBjaHIsIGxlbiwgcG9zaXRpb24gPSAnc3RhcnQnIClcblx0e1xuXHRcdGlmICggcG9zaXRpb24gPT0gJ3N0YXJ0JyApXG5cdFx0e1xuXHRcdFx0d2hpbGUoIHRleHQubGVuZ3RoIDwgbGVuIClcblx0XHRcdFx0dGV4dCA9IGNociArIHRleHQ7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKCBwb3NpdGlvbiA9PSAnZW5kJyApXG5cdFx0e1xuXHRcdFx0d2hpbGUoIHRleHQubGVuZ3RoIDwgbGVuIClcblx0XHRcdFx0dGV4dCArPSBjaHI7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRwb3NpdGlvbiA9IE1hdGgubWluKCBNYXRoLm1heCggcG9zaXRpb24sIDAgKSwgdGV4dC5sZW5ndGggKTtcblx0XHRcdHdoaWxlKCB0ZXh0Lmxlbmd0aCA8IGxlbiApXG5cdFx0XHRcdHRleHQgPSB0ZXh0LnN1YnN0cmluZyggMCwgcG9zaXRpb24gKSArIGNociArIHRleHQuc3Vic3RyaW5nKCBwb3NpdGlvbiApO1xuXHRcdH1cblx0XHRyZXR1cm4gdGV4dDtcblx0fVxuXHRnZXROdW1lcmljVmFsdWUoIHRleHQgKVxuXHR7XG5cdFx0dmFyIG51bWJlcnMgPSBbICd6ZXJvJywgJ29uZScsICd0d28nLCAndGhyZWUnLCAnZm91cicsICdmaXZlJywgJ3NpeCcsICdzZXZlbicsICdlaWdodCcsICduaW5lJyxcblx0XHRcdFx0XHRcdCd0ZW4nLCAnZWxldmVuJywgJ3R3ZWx2ZScsICdmb3J0ZWVuJywgJ2ZpZnRlZW4nLCAnc2l4dGVlbicsICdzZXZlbnRlZW4nLCAnZWlnaHRlZW4nLCAnbmluZXRlZW4nLFxuXHRcdFx0XHRcdFx0J3R3ZW50eScsICd0d2VudHktb25lJywgJ3R3ZW50eS10d28nLCAndHdlbnR5LXRocmVlJywgJ3R3ZW50eS1mb3VyJywgJ3R3ZW50eS1maXZlJywgJ3R3ZW50eS1zaXgnLCAndHdlbnR5LXNldmVuJywgJ3R3ZW50eS1laWdodCcsICd0d2VudHktbmluZScsXG5cdFx0XHRcdFx0XHQndGhpcnR5JywgJ3RoaXJ0eS1vbmUnLCAndGhpcnR5LXR3bycsICd0aGlydHktdGhyZWUnLCAndGhpcnR5LWZvdXInLCAndGhpcnR5LWZpdmUnLCAndGhpcnR5LXNpeCcsICd0aGlydHktc2V2ZW4nLCAndGhpcnR5LWVpZ2h0JywgJ3RoaXJ0eS1uaW5lJyxcblx0XHRcdFx0XHRcdCdmb3VydHknLCAnZm91cnR5LW9uZScsICdmb3VydHktdHdvJywgJ2ZvdXJ0eS10aHJlZScsICdmb3VydHktZm91cicsICdmb3VydHktZml2ZScsICdmb3VydHktc2l4JywgJ2ZvdXJ0eS1zZXZlbicsICdmb3VydHktZWlnaHQnLCAnZm91cnR5LW5pbmUnLFxuXHRcdFx0XHRcdFx0J2ZpZnR5JywgJ2ZpZnR5LW9uZScsICdmaWZ0eS10d28nLCAnZmlmdHktdGhyZWUnLCAnZmlmdHktZm91cicsICdmaWZ0eS1maXZlJywgJ2ZpZnR5LXNpeCcsICdmaWZ0eS1zZXZlbicsICdmaWZ0eS1laWdodCcsICdmaWZ0eS1uaW5lJyxcblx0XHRcdFx0XHRcdCdzaXh0eScsICdzaXh0eS1vbmUnLCAnc2l4dHktdHdvJywgJ3NpeHR5LXRocmVlJywgJ3NpeHR5LWZvdXInLCAnc2l4dHktZml2ZScsICdzaXh0eS1zaXgnLCAnc2l4dHktc2V2ZW4nLCAnc2l4dHktZWlnaHQnLCAnc2l4dHktbmluZScsXG5cdFx0XHRcdFx0XHQnc2V2ZW50eScsICdzZXZlbnR5LW9uZScsICdzZXZlbnR5LXR3bycsICdzZXZlbnR5LXRocmVlJywgJ3NldmVudHktZm91cicsICdzZXZlbnR5LWZpdmUnLCAnc2V2ZW50eS1zaXgnLCAnc2V2ZW50eS1zZXZlbicsICdzZXZlbnR5LWVpZ2h0JywgJ3NldmVudHktbmluZScsXG5cdFx0XHRcdFx0XHQnZWlnaHR5JywgJ2VpZ2h0eS1vbmUnLCAnZWlnaHR5LXR3bycsICdlaWdodHktdGhyZWUnLCAnZWlnaHR5LWZvdXInLCAnZWlnaHR5LWZpdmUnLCAnZWlnaHR5LXNpeCcsICdlaWdodHktc2V2ZW4nLCAnZWlnaHR5LWVpZ2h0JywgJ2VpZ2h0eS1uaW5lJyxcblx0XHRcdFx0XHRcdCduaW5ldHknLCAnbmluZXR5LW9uZScsICduaW5ldHktdHdvJywgJ25pbmV0eS10aHJlZScsICduaW5ldHktZm91cicsICduaW5ldHktZml2ZScsICduaW5ldHktc2l4JywgJ25pbmV0eS1zZXZlbicsICduaW5ldHktZWlnaHQnLCAnbmluZXR5LW5pbmUnLFxuXHRcdFx0XHRcdFx0XVxuXHRcdHRleHQgPSB0ZXh0LnRyaW0oKS50b0xvd2VyQ2FzZSgpLnNwbGl0KCAnICcgKS5qb2luKCAnLScgKTtcblx0XHRpZiAoIHRoaXMuZ2V0Q2hhcmFjdGVyVHlwZSggdGV4dC5jaGFyQXQoIDAgKSApID09ICdudW1iZXInIClcblx0XHR7XG5cdFx0XHR2YXIgdmFsdWUgPSBwYXJzZUludCggdGV4dCApO1xuXHRcdFx0aWYgKCAhaXNOYU4oIHZhbHVlICkgKVxuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHRyZXR1cm4gLTE7XG5cdFx0fVxuXHRcdHZhciBpbmRleCA9IG51bWJlcnMuZmluZEluZGV4KFxuXHRcdFx0ZnVuY3Rpb24oIGVsZW1lbnQgKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gZWxlbWVudCA9PSB0ZXh0O1xuXHRcdFx0fVxuXHRcdClcblx0XHRyZXR1cm4gaW5kZXg7XG5cdH1cblx0aXNGaWx0ZXIoIG5hbWUgKVxuXHR7XG5cdFx0Zm9yICggdmFyIGMgPSAwOyBjIDwgbmFtZS5sZW5ndGg7IGMrKyApXG5cdFx0e1xuXHRcdFx0aWYgKCBpbmZvLm5hbWUuY2hhckF0KCBjICkgPT0gJyonIHx8IGluZm8ubmFtZS5jaGFyQXQoIGMgKSA9PSAnPycgKVxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdG5vcm1hbGl6ZSggcGF0aCApXG5cdHtcblx0XHR2YXIgcG9zID0gcGF0aC5pbmRleE9mKCAnXFxcXCcsIHBvcyArIDEgKTtcblx0XHR3aGlsZSggcG9zID49IDAgKVxuXHRcdHtcblx0XHRcdHBhdGggPSBwYXRoLnN1YnN0cmluZyggMCwgcG9zICkgKyAnLycgKyBwYXRoLnN1YnN0cmluZyggcG9zICsgMSApO1xuXHRcdFx0cG9zID0gcGF0aC5pbmRleE9mKCAnXFxcXCcsIHBvcyArIDEgKTtcblx0XHR9XG5cdFx0cmV0dXJuIHBhdGg7XG5cdH1cblx0YmFzZW5hbWUoIHBhdGggKVxuXHR7XG5cdFx0cGF0aCA9IHRoaXMubm9ybWFsaXplKCBwYXRoICk7XG5cdFx0dmFyIHNsYXNoID0gcGF0aC5sYXN0SW5kZXhPZiggJy8nICk7XG5cdFx0aWYgKCBzbGFzaCA+PSAwIClcblx0XHRcdHJldHVybiBwYXRoLnN1YnN0cmluZyggc2xhc2ggKyAxICk7XG5cdFx0cmV0dXJuIHBhdGg7XG5cdH1cblx0ZXh0bmFtZSggcGF0aCApXG5cdHtcblx0XHRwYXRoID0gdGhpcy5ub3JtYWxpemUoIHBhdGggKTtcblx0XHR2YXIgZG90ID0gcGF0aC5sYXN0SW5kZXhPZiggJy4nICk7XG5cdFx0aWYgKCBkb3QgPj0gMCApXG5cdFx0XHRyZXR1cm4gcGF0aC5zdWJzdHJpbmcoIGRvdCApO1xuXHRcdHJldHVybiAnJztcblx0fVxuXHRkaXJuYW1lKCBwYXRoIClcblx0e1xuXHRcdHBhdGggPSB0aGlzLm5vcm1hbGl6ZSggcGF0aCApO1xuXHRcdHZhciBzbGFzaCA9IHBhdGgubGFzdEluZGV4T2YoICcvJyApO1xuXHRcdGlmICggc2xhc2ggPj0gMCApXG5cdFx0XHRyZXR1cm4gcGF0aC5zdWJzdHJpbmcoIDAsIHNsYXNoICk7XG5cdFx0cmV0dXJuICcnO1xuXHR9XG5cdHBhcnNlKCBwYXRoIClcblx0e1xuXHRcdHZhciByZXN1bHQgPVxuXHRcdHtcblx0XHRcdHJvb3Q6ICcnLFxuXHRcdFx0ZGlyOiAnJyxcblx0XHRcdGJhc2U6ICcnLFxuXHRcdFx0ZXh0OiAnJyxcblx0XHRcdG5hbWU6ICcnXG5cdFx0fVxuXHRcdHBhdGggPSB0aGlzLm5vcm1hbGl6ZSggcGF0aCApO1xuXHRcdHZhciBjb2x1bW4gPSBwYXRoLmluZGV4T2YoICc6JyApO1xuXHRcdHZhciBsYXN0U2xhc2ggPSBwYXRoLmxhc3RJbmRleE9mKCAnLycgKTtcblx0XHR2YXIgbGFzdERvdCA9IHBhdGgubGFzdEluZGV4T2YoICcuJyApO1xuXHRcdGlmICggcGF0aC5jaGFyQXQoIDAgKSA9PSAnLycgKVxuXHRcdHtcblx0XHRcdHJlc3VsdC5yb290ID0gJy8nO1xuXHRcdFx0cmVzdWx0LmRpciA9IHBhdGguc3Vic3RyaW5nKCAwLCBsYXN0U2xhc2ggKTtcblx0XHRcdHJlc3VsdC5iYXNlID0gcGF0aC5zdWJzdHJpbmcoIGxhc3RTbGFzaCApO1xuXHRcdFx0aWYgKCBsYXN0RG90ID49IDAgKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXN1bHQuZXh0ID0gcGF0aC5zdWJzdHJpbmcoIGxhc3REb3QgKTtcblx0XHRcdFx0cmVzdWx0Lm5hbWUgPSBwYXRoLnN1YnN0cmluZyggbGFzdFNsYXNoICsgMSwgbGFzdERvdCApO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRyZXN1bHQubmFtZSA9IHBhdGguc3Vic3RyaW5nKCBsYXN0U2xhc2ggKyAxICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRpZiAoIGNvbHVtbiA+PSAwIClcblx0XHRcdFx0cmVzdWx0LnJvb3QgPSBwYXRoLnN1YnN0cmluZyggMCwgY29sdW1uICsgMSApO1xuXHRcdFx0aWYgKCBsYXN0U2xhc2ggPj0gMCApXG5cdFx0XHR7XG5cdFx0XHRcdHJlc3VsdC5kaXIgPSBwYXRoLnN1YnN0cmluZyggMCwgbGFzdFNsYXNoICk7XG5cdFx0XHRcdHJlc3VsdC5iYXNlID0gcGF0aC5zdWJzdHJpbmcoIGxhc3RTbGFzaCArIDEgKTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0cmVzdWx0LmJhc2UgPSBwYXRoO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBsYXN0RG90ID49IDAgKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXN1bHQuZXh0ID0gcGF0aC5zdWJzdHJpbmcoIGxhc3REb3QgKTtcblx0XHRcdFx0aWYgKCBsYXN0U2xhc2ggPj0gMCApXG5cdFx0XHRcdFx0cmVzdWx0Lm5hbWUgPSBwYXRoLnN1YnN0cmluZyggbGFzdFNsYXNoICsgMSwgbGFzdERvdCApXG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRyZXN1bHQubmFtZSA9IHBhdGguc3Vic3RyaW5nKCAwLCBsYXN0RG90IClcblx0XHRcdH1cblx0XHRcdGlmICggcmVzdWx0Lm5hbWUgPT0gJycgJiYgcmVzdWx0LmV4dCA9PSAnJyApXG5cdFx0XHR7XG5cdFx0XHRcdHJlc3VsdC5uYW1lID0gcmVzdWx0LmJhc2U7XG5cdFx0XHRcdC8vcmVzdWx0LmRpciArPSAnLycgKyByZXN1bHQuYmFzZTtcblx0XHRcdFx0Ly9yZXN1bHQuYmFzZSA9ICcnO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cdHJlbW92ZUR1cGxpY2F0ZWRMaW5lcyggdGV4dCApXG5cdHtcblx0XHR2YXIgbGluZXMgPSB0ZXh0LnNwbGl0KCAnXFxuJyApO1xuXHRcdGZvciAoIHZhciBsMSA9IDA7IGwxIDwgbGluZXMubGVuZ3RoOyBsMSsrIClcblx0XHR7XG5cdFx0XHR2YXIgbDMgPSBsMSArIDE7XG5cdFx0XHR2YXIgbGluZTEgPSBsaW5lc1sgbDEgXTtcblx0XHRcdGZvciAoIHZhciBsMiA9IGwzOyBsMiA8IGxpbmVzLmxlbmd0aDsgbDIrKyApXG5cdFx0XHR7XG5cdFx0XHRcdGlmICggbGluZXNbIGwyIF0ubGVuZ3RoID4gMCAmJiBsaW5lc1sgbDIgXSAhPSBsaW5lMSApXG5cdFx0XHRcdFx0bGluZXNbIGwzKysgXSA9IGxpbmVzWyBsMiBdO1xuXHRcdFx0fVxuXHRcdFx0bGluZXMubGVuZ3RoID0gbDM7XG5cdFx0fVxuXHRcdHJldHVybiBsaW5lcy5qb2luKCAnXFxuJyApO1xuXHR9XG5cdGlzTG93ZXJDYXNlKCBjIClcblx0e1xuXHRcdHJldHVybiBjID49ICdhJyAmJiBjIDw9ICd6Jztcblx0fVxuXHRpc1VwcGVyQ2FzZSggYyApXG5cdHtcblx0XHRyZXR1cm4gYyA+PSAnQScgJiYgYyA8PSAnWic7XG5cdH1cblx0Z2V0TWltZVR5cGUoIHBhdGgsIHR5cGUgKVxuXHR7XG5cdFx0dmFyIGV4dCA9IHRoaXMuZXh0bmFtZSggcGF0aCApLnRvTG93ZXJDYXNlKCk7XG5cdFx0aWYgKCBleHQgPT0gJy5tcDQnIHx8IGV4dCA9PSAnLm9nZycgKVxuXHRcdFx0dHlwZSA9ICggdHlwZW9mIHR5cGUgPT0gJ3VuZGVmaW5lZCcgPyAnYXVkaW8nIDogdHlwZSApO1xuXHRcdHN3aXRjaCAoIGV4dCApXG5cdFx0e1xuXHRcdFx0Y2FzZSAnLnBuZyc6XG5cdFx0XHRcdHJldHVybiAnaW1hZ2UvcG5nJztcblx0XHRcdGNhc2UgJy5qcGcnOlxuXHRcdFx0Y2FzZSAnLmpwZWcnOlxuXHRcdFx0XHRyZXR1cm4gJ2ltYWdlL2pwZWcnO1xuXHRcdFx0Y2FzZSAnLnRpZmYnOlxuXHRcdFx0XHRyZXR1cm4gJ2ltYWdlL3RpZmYnO1xuXHRcdFx0Y2FzZSAnLmdpZic6XG5cdFx0XHRcdHJldHVybiAnaW1hZ2UvZ2lmJztcblx0XHRcdGNhc2UgJy53ZWJwJzpcblx0XHRcdFx0cmV0dXJuICdpbWFnZS93ZWJwJztcblx0XHRcdGNhc2UgJy5ibXAnOlxuXHRcdFx0XHRyZXR1cm4gJ2ltYWdlL2JtcCc7XG5cblx0XHRcdGNhc2UgJy5wZGYnOlxuXHRcdFx0XHRyZXR1cm4gJ2FwcGxpY2F0aW9uL3BkZic7XG5cdFx0XHRjYXNlICcuZ3ppcCc6XG5cdFx0XHRcdHJldHVybiAnYXBwbGljYXRpb24vZ3ppcCc7XG5cdFx0XHRjYXNlICcuemlwJzpcblx0XHRcdFx0cmV0dXJuICdhcHBsaWNhdGlvbi96aXAnO1xuXHRcdFx0Y2FzZSAnLmpzb24nOlxuXHRcdFx0XHRyZXR1cm4gJ2FwcGxpY2F0aW9uL2pzb24nO1xuXHRcdFx0Y2FzZSAnLnNxbCc6XG5cdFx0XHRcdHJldHVybiAnYXBwbGljYXRpb24vc3FsJztcblx0XHRcdGNhc2UgJy4nOlxuXHRcdFx0XHRyZXR1cm4gJ2FwcGxpY2F0aW9uL3J0Zic7XG5cblx0XHRcdGNhc2UgJy4zbWYnOlxuXHRcdFx0XHRyZXR1cm4gJ21vZGVsLzNtZic7XG5cdFx0XHRjYXNlICcubWVzaCc6XG5cdFx0XHRcdHJldHVybiAnbW9kZWwvbWVzaCc7XG5cdFx0XHRjYXNlICcub2JqJzpcblx0XHRcdFx0cmV0dXJuICdtb2RlbC9vYmonO1xuXHRcdFx0Y2FzZSAnLnN0bCc6XG5cdFx0XHRcdHJldHVybiAnbW9kZWwvc3RsJztcblx0XHRcdGNhc2UgJy52cm1sJzpcblx0XHRcdFx0cmV0dXJuICdtb2RlbC92cm1sJztcblx0XHRcdGNhc2UgJy5ydGYnOlxuXHRcdFx0XHRyZXR1cm4gJ3RleHQvcnRmJztcblxuXHRcdFx0Y2FzZSAnLm1wNCc6XG5cdFx0XHRcdHJldHVybiB0eXBlICsgJy9tcDQnO1xuXHRcdFx0Y2FzZSAnLm9nZyc6XG5cdFx0XHRcdHJldHVybiB0eXBlICsgJy9vZ2cnO1xuXHRcdFx0Y2FzZSAnLm1wZWcnOlxuXHRcdFx0XHRyZXR1cm4gJ3ZpZGVvL21wZWcnO1xuXG5cdFx0XHRjYXNlICcuYWFjJzpcblx0XHRcdFx0cmV0dXJuICdhdWRpby9hYWMnO1xuXHRcdFx0Y2FzZSAnLndhdic6XG5cdFx0XHRcdHJldHVybiAnYXVkaW8vd2F2Jztcblx0XHRcdGNhc2UgJy5tcDMnOlxuXHRcdFx0XHRyZXR1cm4gJ2F1ZGlvL21wMyc7XG5cblx0XHRcdGNhc2UgJy5qcyc6XG5cdFx0XHRcdHJldHVybiAndGV4dC9qYWF2c2NyaXB0Jztcblx0XHRcdGNhc2UgJy5odG1sJzpcblx0XHRcdFx0cmV0dXJuICd0ZXh0L2h0bWwnO1xuXHRcdFx0Y2FzZSAnLm1kJzpcblx0XHRcdFx0cmV0dXJuICd0ZXh0L21hcmtkb3duJztcblx0XHRcdGNhc2UgJy50eHQnOlxuXHRcdFx0XHRyZXR1cm4gJ3RleHQvcGxhaW4nO1xuXHRcdFx0Y2FzZSAnLnhtbCc6XG5cdFx0XHRcdHJldHVybiAndGV4dC94bWwnO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm5cblx0XHR9XG5cdH1cblx0c2VyaWFsaXplSW4oIG1hcCwgcm9vdCApXG5cdHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIGxhc3RCcmFuY2ggPSAncm9vdCc7XG5cdFx0ZnVuY3Rpb24gY3JlYXRlT2JqZWN0cyggbywgbWFwIClcblx0XHR7XG5cdFx0XHRpZiAoIG8ub0NsYXNzIClcblx0XHRcdHtcblx0XHRcdFx0Ly8gY3JlYXRlIHRoZSBvYmplY3Rcblx0XHRcdFx0dmFyIG9vO1xuXHRcdFx0XHRpZiAoIG8ub0NsYXNzICE9ICdwcm9tcHQnIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG9vID0gbmV3IHNlbGYuYXdpWyBvLmRhdGEucGFyZW50Q2xhc3MgXVsgby5kYXRhLmNsYXNzbmFtZSBdWyBvLmRhdGEudG9rZW4gXSggc2VsZi5hd2ksIHsga2V5OiBvLmRhdGEua2V5LCBicmFuY2g6IGxhc3RCcmFuY2gsIHBhcmVudDogby5kYXRhLnBhcmVudCwgZXhpdHM6IG8uZGF0YS5leGl0cywgcGFyYW1ldGVyczogby5kYXRhLnBhcmFtZXRlcnMgfSApO1xuXHRcdFx0XHRcdGlmICggby5kYXRhLnBhcmVudENsYXNzID09ICduZXdNZW1vcmllcycgKVxuXHRcdFx0XHRcdFx0bGFzdEJyYW5jaCA9IG9vO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG9vID0gc2VsZi5hd2kucHJvbXB0O1xuXHRcdFx0XHRcdGxhc3RCcmFuY2ggPSBvbztcblx0XHRcdFx0fVxuXHRcdFx0XHRzd2l0Y2ggKCBvLm9DbGFzcyApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjYXNlICdidWJibGUnOlxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAnYnJhbmNoJzpcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ21lbW9yeSc6XG5cdFx0XHRcdFx0XHRvby5jdXJyZW50QnViYmxlID0gby5kYXRhLmN1cnJlbnRCdWJibGU7XG5cdFx0XHRcdFx0XHRvby5wYXJhbWV0ZXJzID0gby5kYXRhLnBhcmFtZXRlcnM7XG5cdFx0XHRcdFx0XHRvby5wcm9wZXJ0aWVzLmV4aXRzID0gby5kYXRhLmV4aXRzO1xuXHRcdFx0XHRcdFx0b28ucGFyZW50ID0gby5kYXRhLnBhcmVudDtcblx0XHRcdFx0XHRcdGZvciAoIHZhciBwIGluIG8uZGF0YS5idWJibGVNYXAgKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRvby5idWJibGVNYXBbIHAgXSA9IGNyZWF0ZU9iamVjdHMoIG8uZGF0YS5idWJibGVNYXBbIHAgXSwge30gKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ3NvdXZlbmlyJzpcblx0XHRcdFx0XHRcdG9vLnBhcmFtZXRlcnMgPSBvLmRhdGEucGFyYW1ldGVycztcblx0XHRcdFx0XHRcdG9vLm9wdGlvbnMgPSBvLmRhdGEub3B0aW9ucztcblx0XHRcdFx0XHRcdG9vLnBhcmVudCA9IG8uZGF0YS5wYXJlbnQ7XG5cdFx0XHRcdFx0XHRvby5wcm9wZXJ0aWVzLmV4aXRzID0gby5kYXRhLmV4aXRzO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAncHJvbXB0Jzpcblx0XHRcdFx0XHRcdG9vLmN1cnJlbnRCdWJibGUgPSBvLmRhdGEuY3VycmVudEJ1YmJsZTtcblx0XHRcdFx0XHRcdG9vLnBhcmFtZXRlcnMgPSBvLmRhdGEucGFyYW1ldGVycztcblx0XHRcdFx0XHRcdG9vLmRhdGFzID0gby5kYXRhLmRhdGFzO1xuXHRcdFx0XHRcdFx0b28ub3B0aW9ucyA9IG8uZGF0YS5vcHRpb25zO1xuXHRcdFx0XHRcdFx0b28ucHJvcGVydGllcy5leGl0cyA9IG8uZGF0YS5leGl0cztcblx0XHRcdFx0XHRcdG9vLnBhcmVudCA9IG8uZGF0YS5wYXJlbnQ7XG5cdFx0XHRcdFx0XHRvby5vcHRpb25zID0gby5kYXRhLm9wdGlvbnM7XG5cdFx0XHRcdFx0XHRmb3IgKCB2YXIgcCBpbiBvLmRhdGEuYnViYmxlTWFwIClcblx0XHRcdFx0XHRcdFx0b28uYnViYmxlTWFwWyBwIF0gPSBjcmVhdGVPYmplY3RzKCBvLmRhdGEuYnViYmxlTWFwWyBwIF0sIHt9ICk7XG5cdFx0XHRcdFx0XHRvby5wYXRod2F5ID0gby5kYXRhLnBhdGh3YXk7XG5cdFx0XHRcdFx0XHRvby5rZXlDb3VudCA9IG8uZGF0YS5rZXlDb3VudDtcblx0XHRcdFx0XHRcdG9vLnF1ZXN0aW9uQ291bnQgPSBvLmRhdGEucXVlc3Rpb25Db3VudDtcblx0XHRcdFx0XHRcdG9vLnByb3BlcnRpZXMuZXhpdHMgPSBvLmRhdGEuZXhpdHM7XG5cdFx0XHRcdFx0XHRvby5maXJzdFJ1biA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gb287XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGZvciAoIHZhciBwIGluIG8gKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIG9vID0gb1sgcCBdO1xuXHRcdFx0XHRcdGlmICggb28ub0NsYXNzIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRvWyBwIF0gPSBjcmVhdGVPYmplY3RzKCBvbywgbWFwICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBvO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gY3JlYXRlT2JqZWN0cyggbWFwLCByb290ICk7XG5cdH1cblx0c2VyaWFsaXplT3V0KCByb290IClcblx0e1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgY291bnQgPSAwO1xuXHRcdGZ1bmN0aW9uIGlzQXdpKCBvIClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdHlwZW9mIG8udG9rZW4gIT0gJ3VuZGVmaW5lZCc7XG5cdFx0fVxuXHRcdGZ1bmN0aW9uIHRvSlNPTiggZGF0YSApXG5cdFx0e1xuXHRcdFx0dmFyIGpzb247XG5cdFx0XHR0cnlcblx0XHRcdHtcblx0XHRcdFx0anNvbiA9IEpTT04uc3RyaW5naWZ5KCBkYXRhICk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCggZSApXG5cdFx0XHR7fVxuXHRcdFx0aWYgKCBqc29uIClcblx0XHRcdFx0cmV0dXJuIGpzb247XG5cdFx0XHRyZXR1cm4gJ1wiXCInO1xuXHRcdH1cblx0XHRmdW5jdGlvbiBzYXZlUHJvbXB0KCBvIClcblx0XHR7XG5cdFx0XHR2YXIgbWFwID0gJyc7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ2NsYXNzbmFtZTpcIicgKyBvLmNsYXNzbmFtZSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdjdXJyZW50QnViYmxlOlwiJyArICggdHlwZW9mIG8uY3VycmVudEJ1YmJsZSAhPSAndW5kZWZpbmVkJyA/ICggdHlwZW9mIG8uY3VycmVudEJ1YmJsZSA9PSAnc3RyaW5nJyA/IG8uY3VycmVudEJ1YmJsZSA6IG8uY3VycmVudEJ1YmJsZS5rZXkgKSA6ICcnICkgKyAnXCIsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAna2V5OlwiJyArIG8ua2V5ICsgJ1wiLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ3Rva2VuOlwiJyArIG8udG9rZW4gKyAnXCIsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAnb3B0aW9uczonICsgdG9KU09OKCBvLm9wdGlvbnMgKSArICcsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAncGFyYW1ldGVyczonICsgdG9KU09OKCBvLnBhcmFtZXRlcnMgKSArICcsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAnZGF0YXM6JyArIHRvSlNPTiggby5kYXRhcyApICsgJyxcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdvcHRpb25zOicgKyB0b0pTT04oIG8ub3B0aW9ucyApICsgJyxcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdwYXRod2F5OlwiJyArIG8ucGF0aHdheSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdwYXRod2F5czonICsgdG9KU09OKCBvLnBhdGh3YXlzICkgKyAnLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ2tleUNvdW50OicgKyBvLmtleUNvdW50ICsgJyxcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdxdWVzdGlvbkNvdW50OicgKyBvLnF1ZXN0aW9uQ291bnQgKyAnLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ3BhcmVudDpcIicgKyAoIHNlbGYuaXNPYmplY3QoIG8ucGFyZW50ICkgPyBvLnBhcmVudC5rZXkgOiAoIHR5cGVvZiBvLnBhcmVudCA9PSAndW5kZWZpbmVkJyA/ICcnIDogby5wYXJlbnQgKSApICsgJ1wiLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ3ByZXZpb3VzOlwiJyArICggc2VsZi5pc09iamVjdCggby5wcmV2aW91cyApID8gby5wcmV2aW91cy5rZXkgOiAoIHR5cGVvZiBvLnByZXZpb3VzID09ICd1bmRlZmluZWQnID8gJycgOiBvLnByZXZpb3VzICkgKSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdleGl0czpcXG4nXG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ3tcXG4nO1xuXHRcdFx0Zm9yICggdmFyIHAgaW4gby5wcm9wZXJ0aWVzLmV4aXRzIClcblx0XHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKyAxICkgKyBwICsgJzpcIicgKyBvLnByb3BlcnRpZXMuZXhpdHNbIHAgXSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICd9LFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ2J1YmJsZU1hcDpcXG4nXG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ3tcXG4nO1xuXHRcdFx0Zm9yICggdmFyIHAgaW4gby5idWJibGVNYXAgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgb28gPSBvLmJ1YmJsZU1hcFsgcCBdO1xuXHRcdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCArIDEgKSArIHAgKyAnOntvQ2xhc3M6XCInICsgb28ub0NsYXNzICsgJ1wiLGRhdGE6e1xcbic7XG5cdFx0XHRcdGNvdW50ICs9IDI7XG5cdFx0XHRcdG1hcCArPSBzYXZlTWFwWyBvby5vQ2xhc3MgXSggb28gKVxuXHRcdFx0XHRjb3VudCAtPSAyO1xuXHRcdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCArIDEgKSArICd9fSxcXG4nO1xuXHRcdFx0fVxuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICd9LFxcbidcblx0XHRcdHJldHVybiBtYXA7XG5cdFx0fVxuXHRcdGZ1bmN0aW9uIHNhdmVNZW1vcnkoIG8gKVxuXHRcdHtcblx0XHRcdHZhciBtYXAgPSAnJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAnY2xhc3NuYW1lOlwiJyArIG8uY2xhc3NuYW1lICsgJ1wiLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ3BhcmVudENsYXNzOlwibmV3TWVtb3JpZXNcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdjdXJyZW50QnViYmxlOlwiJyArICggdHlwZW9mIG8uY3VycmVudEJ1YmJsZSAhPSAndW5kZWZpbmVkJyA/ICggdHlwZW9mIG8uY3VycmVudEJ1YmJsZSA9PSAnc3RyaW5nJyA/IG8uY3VycmVudEJ1YmJsZSA6IG8uY3VycmVudEJ1YmJsZS5rZXkgKSA6ICcnICkgKyAnXCIsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAna2V5OlwiJyArIG8ua2V5ICsgJ1wiLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ3Rva2VuOlwiJyArIG8udG9rZW4gKyAnXCIsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAnb3B0aW9uczonICsgdG9KU09OKCBvLm9wdGlvbnMgKSArICcsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAncGFyYW1ldGVyczonICsgdG9KU09OKCBvLnBhcmFtZXRlcnMgKSArICcsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAncGF0aHdheTpcIicgKyBvLnBhdGh3YXkgKyAnXCIsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAncGF0aHdheXM6JyArIHRvSlNPTiggby5wYXRod2F5cyApICsgJyxcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdwYXJlbnQ6XCInICsgKCBzZWxmLmlzT2JqZWN0KCBvLnBhcmVudCApID8gby5wYXJlbnQua2V5IDogKCB0eXBlb2Ygby5wYXJlbnQgPT0gJ3VuZGVmaW5lZCcgPyAnJyA6IG8ucGFyZW50ICkgKSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdwcmV2aW91czpcIicgKyAoIHNlbGYuaXNPYmplY3QoIG8ucHJldmlvdXMgKSA/IG8ucHJldmlvdXMua2V5IDogKCB0eXBlb2Ygby5wcmV2aW91cyA9PSAndW5kZWZpbmVkJyA/ICcnIDogby5wcmV2aW91cyApICkgKyAnXCIsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAnZXhpdHM6XFxuJ1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICd7XFxuJztcblx0XHRcdGZvciAoIHZhciBwIGluIG8ucHJvcGVydGllcy5leGl0cyApXG5cdFx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICsgMSApICsgcCArICc6XCInICsgby5wcm9wZXJ0aWVzLmV4aXRzWyBwIF0gKyAnXCIsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAnfSxcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdidWJibGVNYXA6XFxuJ1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICd7XFxuJztcblx0XHRcdGZvciAoIHZhciBwIGluIG8uYnViYmxlTWFwIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIG9vID0gby5idWJibGVNYXBbIHAgXTtcblx0XHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKyAxICkgKyBwICsgJzp7b0NsYXNzOlwiJyArIG9vLm9DbGFzcyArICdcIixkYXRhOntcXG4nO1xuXHRcdFx0XHRjb3VudCArPSAyO1xuXHRcdFx0XHRtYXAgKz0gc2F2ZU1hcFsgb28ub0NsYXNzIF0oIG9vICk7XG5cdFx0XHRcdGNvdW50IC09IDI7XG5cdFx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICsgMSApICsgJ319LFxcbic7XG5cdFx0XHR9XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ30sXFxuJ1xuXHRcdFx0cmV0dXJuIG1hcDtcblx0XHR9XG5cdFx0ZnVuY3Rpb24gc2F2ZVNvdXZlbmlyKCBvIClcblx0XHR7XG5cdFx0XHR2YXIgbWFwID0gJyc7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ2NsYXNzbmFtZTpcIicgKyBvLmNsYXNzbmFtZSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdwYXJlbnRDbGFzczpcIm5ld1NvdXZlbmlyc1wiLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ2tleTpcIicgKyBvLmtleSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICd0b2tlbjpcIicgKyBvLnRva2VuICsgJ1wiLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ3BhcmFtZXRlcnM6JyArIHRvSlNPTiggby5wYXJhbWV0ZXJzICkgKyAnLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ29wdGlvbnM6JyArIHRvSlNPTiggby5vcHRpb25zICkgKyAnLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ3BhcmVudDpcIicgKyAoIHNlbGYuaXNPYmplY3QoIG8ucGFyZW50ICkgPyBvLnBhcmVudC5rZXkgOiAoIHR5cGVvZiBvLnBhcmVudCA9PSAndW5kZWZpbmVkJyA/ICcnIDogby5wYXJlbnQgKSApICsgJ1wiLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ3ByZXZpb3VzOlwiJyArICggc2VsZi5pc09iamVjdCggby5wcmV2aW91cyApID8gby5wcmV2aW91cy5rZXkgOiAoIHR5cGVvZiBvLnByZXZpb3VzID09ICd1bmRlZmluZWQnID8gJycgOiBvLnByZXZpb3VzICkgKSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdleGl0czpcXG4nXG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ3tcXG4nO1xuXHRcdFx0Zm9yICggdmFyIHAgaW4gby5wcm9wZXJ0aWVzLmV4aXRzIClcblx0XHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKyAxICkgKyBwICsgJzpcIicgKyBvLnByb3BlcnRpZXMuZXhpdHNbIHAgXSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICd9LFxcbic7XG5cdFx0XHRyZXR1cm4gbWFwO1xuXHRcdH1cblx0XHRmdW5jdGlvbiBzYXZlQnJhbmNoKCBvIClcblx0XHR7XG5cdFx0XHR2YXIgbWFwID0gJyc7XG5cdFx0XHRyZXR1cm4gbWFwO1xuXHRcdH1cblx0XHRmdW5jdGlvbiBzYXZlQnViYmxlKCBvIClcblx0XHR7XG5cdFx0XHR2YXIgbWFwID0gJyc7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ2NsYXNzbmFtZTpcIicgKyBvLmNsYXNzbmFtZSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdwYXJlbnRDbGFzczpcIm5ld0J1YmJsZXNcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICd0b2tlbjpcIicgKyBvLnRva2VuICsgJ1wiLFxcbic7XG5cdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCApICsgJ2tleTpcIicgKyBvLmtleSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdkYXRhOicgKyB0b0pTT04oIG8uZGF0YSApICsgJyxcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdwYXJhbWV0ZXJzOicgKyB0b0pTT04oIG8ucGFyYW1ldGVycyApICsgJyxcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdvcHRpb25zOicgKyB0b0pTT04oIG8ub3B0aW9ucyApICsgJyxcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdwYXJlbnQ6XCInICsgKCBzZWxmLmlzT2JqZWN0KCBvLnBhcmVudCApID8gby5wYXJlbnQua2V5IDogKCB0eXBlb2Ygby5wYXJlbnQgPT0gJ3VuZGVmaW5lZCcgPyAnJyA6IG8ucGFyZW50ICkgKSArICdcIixcXG4nO1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICdwcmV2aW91czpcIicgKyAoIHNlbGYuaXNPYmplY3QoIG8ucHJldmlvdXMgKSA/IG8ucHJldmlvdXMua2V5IDogKCB0eXBlb2Ygby5wcmV2aW91cyA9PSAndW5kZWZpbmVkJyA/ICcnIDogby5wcmV2aW91cyApICkgKyAnXCIsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAnZXhpdHM6XFxuJ1xuXHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgKSArICd7XFxuJztcblx0XHRcdGZvciAoIHZhciBwIGluIG8ucHJvcGVydGllcy5leGl0cyApXG5cdFx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICsgMSApICsgcCArICc6XCInICsgby5wcm9wZXJ0aWVzLmV4aXRzWyBwIF0gKyAnXCIsXFxuJztcblx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50ICkgKyAnfSxcXG4nO1xuXHRcdFx0cmV0dXJuIG1hcDtcblx0XHR9XG5cdFx0dmFyIHNhdmVNYXAgPVxuXHRcdHtcblx0XHRcdCdhd2knOiBmdW5jdGlvbiggbyApIHsgcmV0dXJuICdcXHQnLnJlcGVhdCggY291bnQgLSAxICkgKyAnOntvQ2xhc3M6XCJhd2lcIixcImRhdGFcIjp7XCJcIn0sXFxuJzsgfSxcblx0XHRcdCdjb25maWcnOiBmdW5jdGlvbiggbyApIHsgcmV0dXJuICdcXHQnLnJlcGVhdCggY291bnQgLSAxICkgKyAnOntvQ2xhc3M6XCJjb25maWdcIixcImRhdGFcIjp7XCJcIn0sXFxuJzsgfSxcblx0XHRcdCdidWJibGUnOiBzYXZlQnViYmxlLFxuXHRcdFx0J2JyYW5jaCc6IHNhdmVCcmFuY2gsXG5cdFx0XHQnbWVtb3J5Jzogc2F2ZU1lbW9yeSxcblx0XHRcdCdzb3V2ZW5pcic6IHNhdmVTb3V2ZW5pcixcblx0XHRcdCdwcm9tcHQnOiBzYXZlUHJvbXB0XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY3JlYXRlTWFwKCBvLCBtYXAgKVxuXHRcdHtcblx0XHRcdGNvdW50Kys7XG5cdFx0XHRpZiAoIG8ub0NsYXNzIClcblx0XHRcdHtcblx0XHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgLSAxICkgKyAncm9vdDp7b0NsYXNzOlwiJyArIG8ub0NsYXNzICsgJ1wiLGRhdGE6e1xcbic7XG5cdFx0XHRcdG1hcCArPSBzYXZlTWFwWyBvLm9DbGFzcyBdKCBvICk7XG5cdFx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50IC0gMSApICsgJ319LFxcbic7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGZvciAoIHZhciBwIGluIG8gKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIG9vID0gb1sgcCBdO1xuXHRcdFx0XHRcdGlmICggc2VsZi5pc09iamVjdCggb28gKSApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKCBvby5vQ2xhc3MgKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCAtIDEgKSArIHAgKyAnOntvQ2xhc3M6XCInICsgb28ub0NsYXNzICsgJ1wiLGRhdGE6e1xcbic7XG5cdFx0XHRcdFx0XHRcdG1hcCArPSBzYXZlTWFwWyBvby5vQ2xhc3MgXSggb28gKTtcblx0XHRcdFx0XHRcdFx0bWFwICs9ICdcXHQnLnJlcGVhdCggY291bnQgLSAxICkgKyAnfX0sXFxuJztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0Zm9yICggdmFyIHBwIGluIG9vIClcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHZhciBvb28gPSBvb1sgcHAgXTtcblx0XHRcdFx0XHRcdFx0XHRpZiAoIHNlbGYuaXNPYmplY3QoIG9vbyApIClcblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIG9vby5vQ2xhc3MgKVxuXHRcdFx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRtYXAgKz0gJ1xcdCcucmVwZWF0KCBjb3VudCAtIDEgKSArIHBwICsgJzp7b0NsYXNzOlwiJyArIG9vby5vQ2xhc3MgKyAnXCIsZGF0YTp7XFxuJztcblx0XHRcdFx0XHRcdFx0XHRcdFx0bWFwICs9IHNhdmVNYXBbIG9vby5vQ2xhc3MgXSggb29vICk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG1hcCArPSAnXFx0Jy5yZXBlYXQoIGNvdW50IC0gMSApICsgJ319LFxcbic7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRjb3VudC0tO1xuXHRcdFx0cmV0dXJuIG1hcDtcblx0XHR9XG5cdFx0Y291bnQrKztcblx0XHRyZXR1cm4gJ3JldHVybiB7XFxuJysgY3JlYXRlTWFwKCByb290LCAnJyApICsgJ31cXG4nO1xuXHR9XG5cdG9iamVjdEhhc2goIG9iamVjdCApXG5cdHtcblx0XHR2YXIgaGFzaCA9IG1vZHVsZS5leHBvcnRzLnNoYTE7XG5cdFx0cmV0dXJuIGhhc2goIG9iamVjdCApO1xuXHR9XG5cdGNvbXBhcmVUd29TdHJpbmdzKCBmaXJzdCwgc2Vjb25kLCBjb250cm9sID0ge30gKVxuXHR7XG5cdFx0aWYgKCBjb250cm9sLmNhc2VJbnNlbnNpdGl2ZSApXG5cdFx0e1xuXHRcdFx0Zmlyc3QgPSBmaXJzdC50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0c2Vjb25kID0gc2Vjb25kLnRvTG93ZXJDYXNlKCk7XG5cdFx0fVxuXHRcdGZpcnN0ID0gZmlyc3QucmVwbGFjZSggL1xccysvZywgJycgKTtcblx0XHRzZWNvbmQgPSBzZWNvbmQucmVwbGFjZSggL1xccysvZywgJycgKTtcblxuXHRcdGlmICggZmlyc3QgPT09IHNlY29uZCApIHJldHVybiAxOyAvLyBpZGVudGljYWwgb3IgZW1wdHlcblx0XHRpZiAoIGZpcnN0Lmxlbmd0aCA8IDIgfHwgc2Vjb25kLmxlbmd0aCA8IDIgKSByZXR1cm4gMDsgLy8gaWYgZWl0aGVyIGlzIGEgMC1sZXR0ZXIgb3IgMS1sZXR0ZXIgc3RyaW5nXG5cblx0XHRsZXQgZmlyc3RCaWdyYW1zID0gbmV3IE1hcCgpO1xuXHRcdGZvciAoIGxldCBpID0gMDsgaSA8IGZpcnN0Lmxlbmd0aCAtIDE7IGkrKyApXG5cdFx0e1xuXHRcdFx0Y29uc3QgYmlncmFtID0gZmlyc3Quc3Vic3RyaW5nKCBpLCBpICsgMiApO1xuXHRcdFx0Y29uc3QgY291bnQgPSBmaXJzdEJpZ3JhbXMuaGFzKCBiaWdyYW0gKVxuXHRcdFx0XHQ/IGZpcnN0QmlncmFtcy5nZXQoIGJpZ3JhbSApICsgMVxuXHRcdFx0XHQ6IDE7XG5cblx0XHRcdGZpcnN0QmlncmFtcy5zZXQoIGJpZ3JhbSwgY291bnQgKTtcblx0XHR9O1xuXG5cdFx0bGV0IGludGVyc2VjdGlvblNpemUgPSAwO1xuXHRcdGZvciAoIGxldCBpID0gMDsgaSA8IHNlY29uZC5sZW5ndGggLSAxOyBpKysgKVxuXHRcdHtcblx0XHRcdGNvbnN0IGJpZ3JhbSA9IHNlY29uZC5zdWJzdHJpbmcoIGksIGkgKyAyICk7XG5cdFx0XHRjb25zdCBjb3VudCA9IGZpcnN0QmlncmFtcy5oYXMoIGJpZ3JhbSApXG5cdFx0XHRcdD8gZmlyc3RCaWdyYW1zLmdldCggYmlncmFtIClcblx0XHRcdFx0OiAwO1xuXG5cdFx0XHRpZiAoIGNvdW50ID4gMCApXG5cdFx0XHR7XG5cdFx0XHRcdGZpcnN0QmlncmFtcy5zZXQoIGJpZ3JhbSwgY291bnQgLSAxICk7XG5cdFx0XHRcdGludGVyc2VjdGlvblNpemUrKztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHsgcmVzdWx0OiAoIDIuMCAqIGludGVyc2VjdGlvblNpemUgKSAvICggZmlyc3QubGVuZ3RoICsgc2Vjb25kLmxlbmd0aCAtIDIgKSB9O1xuXHR9XG5cdGZpbmRCZXN0TWF0Y2goIG1haW5TdHJpbmcsIHRhcmdldFN0cmluZ3MgKVxuXHR7XG5cdFx0Y29uc3QgcmF0aW5ncyA9IFtdO1xuXHRcdGxldCBiZXN0TWF0Y2hJbmRleCA9IDA7XG5cdFx0Zm9yICggbGV0IGkgPSAwOyBpIDwgdGFyZ2V0U3RyaW5ncy5sZW5ndGg7IGkrKyApXG5cdFx0e1xuXHRcdFx0Y29uc3QgY3VycmVudFRhcmdldFN0cmluZyA9IHRhcmdldFN0cmluZ3NbIGkgXTtcblx0XHRcdGNvbnN0IGN1cnJlbnRSYXRpbmcgPSB0aGlzLmNvbXBhcmVUd29TdHJpbmdzKCBtYWluU3RyaW5nLCBjdXJyZW50VGFyZ2V0U3RyaW5nICk7XG5cdFx0XHRyYXRpbmdzLnB1c2goIHsgdGFyZ2V0OiBjdXJyZW50VGFyZ2V0U3RyaW5nLCByYXRpbmc6IGN1cnJlbnRSYXRpbmcgfSApO1xuXHRcdFx0aWYgKCBjdXJyZW50UmF0aW5nID4gcmF0aW5nc1sgYmVzdE1hdGNoSW5kZXggXS5yYXRpbmcgKVxuXHRcdFx0e1xuXHRcdFx0XHRiZXN0TWF0Y2hJbmRleCA9IGlcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHsgcmF0aW5nczogcmF0aW5ncywgYmVzdE1hdGNoOiByYXRpbmdzWyBiZXN0TWF0Y2hJbmRleCBdLCBiZXN0TWF0Y2hJbmRleDogYmVzdE1hdGNoSW5kZXggfTtcblx0fVxuXHRtYXRjaFR3b1N0cmluZ3MoIHN0cmluZzEsIHN0cmluZzIsIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRpZiAoIHRoaXMuaXNBcnJheSggc3RyaW5nMSApIClcblx0XHRcdHN0cmluZzEgPSBzdHJpbmcxLmpvaW4oICcgJyApO1xuXHRcdGlmICggdGhpcy5pc0FycmF5KCBzdHJpbmcyICkgKVxuXHRcdFx0c3RyaW5nMiA9IHN0cmluZzIuam9pbiggJyAnICk7XG5cdFx0c3RyaW5nMSA9IHN0cmluZzEuc3BsaXQoICdcXG4nICkuam9pbiggJyAnICk7XG5cdFx0c3RyaW5nMiA9IHN0cmluZzIuc3BsaXQoICdcXG4nICkuam9pbiggJyAnICk7XG5cdFx0aWYgKCBvcHRpb25zLmNhc2VJbnNlbnNpdGl2ZSApXG5cdFx0e1xuXHRcdFx0c3RyaW5nMSA9IHN0cmluZzEudG9Mb3dlckNhc2UoKTtcblx0XHRcdHN0cmluZzIgPSBzdHJpbmcyLnRvTG93ZXJDYXNlKCk7XG5cdFx0fVxuXHRcdHZhciB3b3JkczEgPSBzdHJpbmcxLnNwbGl0KCAnICcgKTtcblx0XHR2YXIgd29yZHMyID0gc3RyaW5nMi5zcGxpdCggJyAnICk7XG5cdFx0aWYgKCB3b3JkczEubGVuZ3RoID09IDAgKVxuXHRcdFx0cmV0dXJuIHsgcmVzdWx0OiAwLCBjb3VudDogMCB9O1xuXHRcdHZhciBwb3NpdGlvbnMgPSBbXTtcblx0XHRmb3IgKCB2YXIgdzEgPSAwOyB3MSA8IHdvcmRzMS5sZW5ndGg7IHcxKysgKVxuXHRcdHtcblx0XHRcdHZhciB3b3JkMSA9IHdvcmRzMVsgdzEgXTtcblx0XHRcdGZvciAoIHZhciB3MiA9IDA7IHcyIDwgd29yZHMyLmxlbmd0aDsgdzIrKyApXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBwb3NpdGlvbiA9IHdvcmQxLmluZGV4T2YoIHdvcmRzMlsgdzIgXSApO1xuXHRcdFx0XHRpZiAoIHBvc2l0aW9uID49IDAgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cG9zaXRpb25zLnB1c2goIHBvc2l0aW9uIClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgY291bnQgPSBwb3NpdGlvbnMubGVuZ3RoO1xuXHRcdHJldHVybiB7IHJlc3VsdDogY291bnQgLyB3b3JkczEubGVuZ3RoLCBzY29yZTogY291bnQgLyB3b3JkczIubGVuZ3RoLCBjb3VudDogY291bnQsIHBvc2l0aW9uczogcG9zaXRpb25zIH07XG5cdH1cblx0YXN5bmMgbG9hZEphdmFzY3JpcHQoIHBhdGgsIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgdGhpcy5hd2kuc3lzdGVtLnJlYWRGaWxlKCBwYXRoLCB7IGVuY29kaW5nOiAndXRmOCcgfSApO1xuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgKVxuXHRcdHtcblx0XHRcdHZhciBzb3VyY2UgPSBhbnN3ZXIuZGF0YTtcblx0XHRcdGFuc3dlci5kYXRhID0ge307XG5cdFx0XHR0cnlcblx0XHRcdHtcblx0XHRcdFx0aWYgKCAhb3B0aW9ucy5ldmFsIClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBmID0gRnVuY3Rpb24oIHNvdXJjZSArICcnICk7XG5cdFx0XHRcdFx0Zi53aW5kb3cgPSB7fTtcblx0XHRcdFx0XHRhbnN3ZXIuZGF0YS5yZXN1bHQgPSBmKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIHdpbmRvdyA9IHt9O1xuXHRcdFx0XHRcdGV2YWwoIHNvdXJjZSArICcnICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0YW5zd2VyLmRhdGEud2luZG93ID0gd2luZG93O1xuXHRcdFx0fSBjYXRjaCggZSApIHtcblx0XHRcdFx0YW5zd2VyLnN1Y2Nlc3MgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGFuc3dlcjtcblx0fVxuXHRyZW1vdmVQdW5jdHVhdGlvbiggdGV4dCApXG5cdHtcblx0XHR2YXIgcmVzdWx0ID0gJyc7XG5cdFx0Zm9yICggdmFyIHAgPSAwOyBwIDwgdGV4dC5sZW5ndGg7IHArKyApXG5cdFx0e1xuXHRcdFx0dmFyIGMgPSB0ZXh0LmNoYXJBdCggcCApO1xuXHRcdFx0aWYgKCAoIGMgPj0gJ2EnICYmIGMgPD0gJ3onKSB8fCAoIGMgPj0gJ0EnICYmIGMgPD0gJ1onICkgfHwgYyA9PSAnICcgfHwgYyA9PSAnXycgKVxuXHRcdFx0XHRyZXN1bHQgKz0gYztcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRpc0V4cHJlc3Npb24oIHRleHQgKVxuXHR7XG5cdFx0dmFyIHJlc3VsdCA9IGZhbHNlO1xuXHRcdHZhciBjID0gdGV4dC5jaGFyQXQoIDAgKTtcblx0XHRpZiAoIGMgPT0gJygnKVxuXHRcdHtcblx0XHRcdHZhciBjb3VudCA9IDE7XG5cdFx0XHRmb3IgKCB2YXIgcCA9IDA7IHAgPCB0ZXh0Lmxlbmd0aDsgcCsrIClcblx0XHRcdHtcblx0XHRcdFx0dmFyIGMgPSB0ZXh0LmNoYXJBdCggcCApO1xuXHRcdFx0XHRpZiAoIGMgPT0gJygnIClcblx0XHRcdFx0XHRjb3VudCsrO1xuXHRcdFx0XHRlbHNlIGlmICggYyA9PSAnKScgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y291bnQtLTtcblx0XHRcdFx0XHRpZiAoIGNvdW50ID09IDAgKVxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICggY291bnQgPT0gMCAmJiBwICsgMSA+PSB0ZXh0Lmxlbmd0aCApXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRmb3IgKCB2YXIgcCA9IDA7IHAgPCB0ZXh0Lmxlbmd0aDsgcCsrIClcblx0XHR7XG5cdFx0XHR2YXIgYyA9IHRleHQuY2hhckF0KCBwICk7XG5cdFx0XHRpZiAoIGMgPT0gJysnIHx8IGMgPT0gJy0nIHx8IGMgPT0gJyonIHx8IGMgPT0gJy8nIHx8IGMgPT0gJygnIHx8IGMgPT0gJyknIClcblx0XHRcdFx0cmVzdWx0ID0gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRpc1BhdGgoIHRleHQgKVxuXHR7XG5cdFx0dmFyIHJlc3VsdCA9IGZhbHNlO1xuXHRcdGlmICggdHlwZW9mIHRleHQgIT0gJ3VuZGVmaW5lZCcgKVxuXHRcdHtcblx0XHRcdGZvciAoIHZhciBwID0gMDsgcCA8IHRleHQubGVuZ3RoOyBwKysgKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgYyA9IHRleHQuY2hhckF0KCBwICk7XG5cdFx0XHRcdGlmICggYyA9PSAnLycgfHwgYyA9PSAnXFxcXCcgfHwgYyA9PSAnKicgfHwgYyA9PSAnLicgfHwgYyA9PSAnPycgKVxuXHRcdFx0XHRcdHJlc3VsdCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIHJlc3VsdCApXG5cdFx0XHR7XG5cdFx0XHRcdHRyeVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5wYXJzZSggdGV4dCApO1xuXHRcdFx0XHR9IGNhdGNoICggZSApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuQ29ubmVjdG9yID0gQ29ubmVjdG9yVXRpbGl0eVV0aWxpdGllcyIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCBbICBdWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbCBBc3Npc3RhbnRcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gW198IHxfXSBcXCAgICAgbGluazpcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1tZW1vcnkuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IE1lbW9yeSBicmFuY2hcbipcbiovXG52YXIgYXdpYnJhbmNoID0gcmVxdWlyZSggJy4uL2J1YmJsZXMvYXdpLWJyYW5jaCcgKVxuXG5jbGFzcyBNZW1vcnkgZXh0ZW5kcyBhd2licmFuY2guQnJhbmNoXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRvcHRpb25zLnBhcmVudENsYXNzID0gJ25ld01lbW9yaWVzJztcblx0XHRvcHRpb25zLmVycm9yQ2xhc3MgPSAnbmV3U291dmVuaXJzJztcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5wYXJhbWV0ZXJzLnNlbmRlck5hbWUgPSB0eXBlb2YgdGhpcy5wYXJhbWV0ZXJzLnNlbmRlck5hbWUgPT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHRoaXMucGFyYW1ldGVycy5zZW5kZXJOYW1lO1xuXHRcdHRoaXMucGFyYW1ldGVycy5yZWNlaXZlck5hbWUgPSB0eXBlb2YgdGhpcy5wYXJhbWV0ZXJzLnJlY2VpdmVyTmFtZSA9PSAndW5kZWZpbmVkJyA/ICcnIDogdGhpcy5wYXJhbWV0ZXJzLnJlY2VpdmVyTmFtZTtcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdtZW1vcnknO1xuXHRcdHRoaXMub0NsYXNzID0gJ21lbW9yeSc7XG5cdFx0dGhpcy5idWJibGVIYXNoID0ge307XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCwgbmVzdGVkIClcblx0e1xuXHRcdHJldHVybiBwYXJhbWV0ZXJzO1xuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIHBhcmFtZXRlcnM7XG5cdH1cblx0YXN5bmMgZXh0cmFjdENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIGNvbnRlbnQgPSBbXTtcblx0XHR2YXIgc291dmVuaXIgPSB0aGlzLmdldEJ1YmJsZSggdGhpcy5nZXRCdWJibGUoICdyb290JyApLnByb3BlcnRpZXMuZXhpdHNbICdzdWNjZXNzJyBdICk7XG5cdFx0d2hpbGUgKCBzb3V2ZW5pciApXG5cdFx0e1xuXHRcdFx0dmFyIGFuc3dlciA9IGF3YWl0IHNvdXZlbmlyLmV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHRcdFx0Y29udGVudC5wdXNoKCBhbnN3ZXIuZGF0YSApO1xuXHRcdFx0c291dmVuaXIgPSB0aGlzLmdldEJ1YmJsZSggc291dmVuaXIucHJvcGVydGllcy5leGl0c1sgJ3N1Y2Nlc3MnIF0gKTtcblx0XHR9XG5cdFx0aWYgKCBjb250ZW50Lmxlbmd0aCApXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiAnZm91bmQnLCBjb250ZW50OiBjb250ZW50IH07XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogJ25vdGZvdW5kJywgY29udGVudDogW10gfTtcblx0fVxuXHRhc3luYyBnZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBjb250ZW50ID0gW107XG5cdFx0dmFyIHNvdXZlbmlyID0gdGhpcy5nZXRCdWJibGUoIHRoaXMuZ2V0QnViYmxlKCAncm9vdCcgKS5wcm9wZXJ0aWVzLmV4aXRzWyAnc3VjY2VzcycgXSApO1xuXHRcdHdoaWxlICggc291dmVuaXIgKVxuXHRcdHtcblx0XHRcdHZhciBhbnN3ZXIgPSBhd2FpdCBzb3V2ZW5pci5nZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0XHRpZiAoIGFuc3dlci5zdWNjZXNzIClcblx0XHRcdFx0Y29udGVudC5wdXNoKCBhbnN3ZXIuZGF0YSApO1xuXHRcdFx0c291dmVuaXIgPSB0aGlzLmdldEJ1YmJsZSggc291dmVuaXIucHJvcGVydGllcy5leGl0c1sgJ3N1Y2Nlc3MnIF0gKTtcblx0XHR9XG5cdFx0aWYgKCBjb250ZW50Lmxlbmd0aCApXG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiAnZm91bmQnLCBjb250ZW50OiBjb250ZW50IH07XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogJ25vdGZvdW5kJywgY29udGVudDogW10gfTtcblx0fVxuXHRhc3luYyBmaW5kU291dmVuaXJzKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBkaXJlY3RTb3V2ZW5pcnMgPSBbXTtcblx0XHR2YXIgaW5kaXJlY3RTb3V2ZW5pcnMgPSBbXTtcblx0XHR2YXIgc291dmVuaXIgPSB0aGlzLmdldEJ1YmJsZSggdGhpcy5nZXRCdWJibGUoICdyb290JyApLnByb3BlcnRpZXMuZXhpdHNbICdzdWNjZXNzJyBdICk7XG5cdFx0d2hpbGUoIHNvdXZlbmlyIClcblx0XHR7XG5cdFx0XHR2YXIgaW5mbzEgPSB0aGlzLmF3aS51dGlsaXRpZXMubWF0Y2hUd29TdHJpbmdzKCBzb3V2ZW5pci5wYXJhbWV0ZXJzLnJlY2VpdmVyTmFtZSwgbGluZSwgeyBjYXNlSW5zZW5zaXRpdmU6IHRydWUgfSApO1xuXHRcdFx0aWYgKCBpbmZvMS5yZXN1bHQgPj0gMC41IClcblx0XHRcdHtcblx0XHRcdFx0aWYgKCBwYXJhbWV0ZXJzLnNlbmRlck5hbWUgKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dmFyIGluZm8yID0gdGhpcy5hd2kudXRpbGl0aWVzLm1hdGNoVHdvU3RyaW5ncyggc291dmVuaXIucGFyYW1ldGVycy5zZW5kZXJOYW1lLCBwYXJhbWV0ZXJzLnNlbmRlck5hbWUsIHsgY2FzZUluc2Vuc2l0aXZlOiB0cnVlIH0gKTtcblx0XHRcdFx0XHRpZiAoIGluZm8yLnJlc3VsdCA9PSAxIClcblx0XHRcdFx0XHRcdGRpcmVjdFNvdXZlbmlycy5wdXNoKCBzb3V2ZW5pciApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGRpcmVjdFNvdXZlbmlycy5wdXNoKCBzb3V2ZW5pciApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHR2YXIgYW5zd2VyID0gYXdhaXQgc291dmVuaXIuZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyA9PSAnZm91bmQnIClcblx0XHRcdFx0aW5kaXJlY3RTb3V2ZW5pcnMucHVzaCggc291dmVuaXIgKTtcblx0XHRcdHNvdXZlbmlyID0gdGhpcy5nZXRCdWJibGUoIHNvdXZlbmlyLnByb3BlcnRpZXMuZXhpdHNbICdzdWNjZXNzJyBdICk7XG5cdFx0fSB3aGlsZSAoIHNvdXZlbmlyICk7XG5cdFx0dmFyIGRpcmVjdENvbnRlbnQgPSBbXTtcblx0XHR2YXIgaW5kaXJlY3RDb250ZW50ID0gW107XG5cdFx0Zm9yICggdmFyIHMgPSAwOyBzIDwgZGlyZWN0U291dmVuaXJzLmxlbmd0aDsgcysrIClcblx0XHR7XG5cdFx0XHR2YXIgYW5zd2VyID0gYXdhaXQgZGlyZWN0U291dmVuaXJzWyBzIF0uZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdFx0ZGlyZWN0Q29udGVudC5wdXNoKCBhbnN3ZXIuZGF0YSApO1xuXHRcdH1cblx0XHRmb3IgKCB2YXIgcyA9IDA7IHMgPCBpbmRpcmVjdFNvdXZlbmlycy5sZW5ndGg7IHMrKyApXG5cdFx0e1xuXHRcdFx0dmFyIGFuc3dlciA9IGF3YWl0IGluZGlyZWN0U291dmVuaXJzWyBzIF0uZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdFx0aW5kaXJlY3RDb250ZW50LnB1c2goIGFuc3dlci5kYXRhICk7XG5cdFx0fVxuXHRcdGlmICggZGlyZWN0U291dmVuaXJzLmxlbmd0aCA+IDAgfHwgaW5kaXJlY3RTb3V2ZW5pcnMubGVuZ3RoID4gMCApXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNjZXNzOiAnZm91bmQnLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0ZGlyZWN0OiB7IHNvdXZlbmlyczogZGlyZWN0U291dmVuaXJzLCBjb250ZW50OiBkaXJlY3RDb250ZW50IH0sXG5cdFx0XHRcdFx0aW5kaXJlY3Q6IHsgc291dmVuaXJzOiBpbmRpcmVjdFNvdXZlbmlycywgY29udGVudDogaW5kaXJlY3RDb250ZW50IH1cblx0XHRcdFx0fSB9O1xuXHRcdHJldHVybiB7IHN1Y2Nlc3M6ICdub3Rmb3VuZCcsIGRhdGE6IHsgZGlyZWN0OiB7fSwgaW5kaXJlY3Q6IHt9IH0gfTtcblx0fVxuXHRhZGRNZW1vcnkoIG1lbW9yeSwgY29udHJvbCA9IHt9IClcblx0e1xuXHRcdHJldHVybiBzdXBlci5hZGRCdWJibGUoIG1lbW9yeSwgY29udHJvbCApO1xuXHR9XG5cdGFkZE1lbW9yaWVzKCBtZW1vcmllcywgcGFyYW1ldGVycyA9IHt9LCBjb250cm9sID0ge30gKVxuXHR7XG5cdFx0cmV0dXJuIHN1cGVyLmFkZEJ1YmJsZSggbWVtb3JpZXMsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhZGRTb3V2ZW5pciggc291dmVuaXIsIGNvbnRyb2wgPSB7fSApXG5cdHtcblx0XHR2YXIgaGFzaCA9IHRoaXMuYXdpLnV0aWxpdGllcy5vYmplY3RIYXNoKCBzb3V2ZW5pci5wYXJhbWV0ZXJzICk7XG5cdFx0aWYgKCAhdGhpcy5idWJibGVIYXNoWyBoYXNoIF0gKVxuXHRcdHtcblx0XHRcdHRoaXMuYnViYmxlSGFzaFsgaGFzaCBdID0gc291dmVuaXIua2V5O1xuXHRcdFx0cmV0dXJuIHN1cGVyLmFkZEJ1YmJsZSggc291dmVuaXIsIGNvbnRyb2wgKTtcblx0XHR9XG5cdFx0cmV0dXJuICcnO1xuXHR9XG5cdGFkZFNvdXZlbmlycyggY29tbWFuZExpc3QsIHBhcmFtZXRlcnMgPSB7fSwgY29udHJvbCA9IHt9IClcblx0e1xuXHRcdHJldHVybiBzdXBlci5hZGRCdWJibGUoIGNvbW1hbmRMaXN0LCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLk1lbW9yeSA9IE1lbW9yeTtcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCBbICBdWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbCBBc3Npc3RhbnRcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gW198IHxfXSBcXCAgICAgbGluazpcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1tZW1vcnktdmlkZW9zLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBWaWRlbyBtZW1vcnkgYnJhbmNoXG4qXG4qL1xudmFyIGF3aW1lbW9yeSA9IHJlcXVpcmUoICcuLi9hd2ktbWVtb3J5JyApO1xuXG5jbGFzcyBNZW1vcnlHZW5lcmljQXVkaW9zIGV4dGVuZHMgYXdpbWVtb3J5Lk1lbW9yeVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMudG9rZW4gPSAnYXVkaW9zJztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLm5hbWUgPSAnQXVkaW8gU291dmVuaXIgQ2hhaW4nO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAnc3RvcmVzIGluZm9ybWF0aW9uIGFib3V0IGF1ZGlvIGZpbGVzJztcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gW1xuXHRcdFx0eyB1c2VySW5wdXQ6ICd3aGF0IHRvIGZpbmQgaW4gdGhlIGF1ZGlvIGZpbGUnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IGZhbHNlLCBkZWZhdWx0OiAnJyB9LFxuXHRcdFx0eyBmcm9tOiAndGhlIGtpbmQgb2YgdGhpbmdzIHRvIGZpbmQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUsIGRlZmF1bHQ6ICdhbnknIH0sXG5cdFx0XHR7IGludGVydmFsOiAnaW50ZXJ2YWwgb2YgdGltZSB3aGVuIHRoZSBhdWRpbyBmaWxlIHdhcyByZWNvcmRlZCcsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogZmFsc2UsIGRlZmF1bHQ6ICdhbnknIH0sXG5cdFx0XTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBhdWRpb0ZpbGVzOiAnZm91bmQgYXVkaW8gZmlsZXMnLCB0eXBlOiAnYXVkaW9GaWxlLm9iamVjdC5hcnJheScgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy50YWdzID0gWyAnbWVtb3J5JywgJ2F1ZGlvJyBdO1xuXHR9XG5cdGFzeW5jIHBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0aWYgKCAhcGFyYW1ldGVycy5pbnRlcnZhbCApXG5cdFx0XHRwYXJhbWV0ZXJzLmludGVydmFsID0gJ2FueSc7XG5cdFx0cmV0dXJuIGF3YWl0IHRoaXNbIGNvbnRyb2wubWVtb3J5LmNvbW1hbmQgXSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIGV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCBzdXBlci5leHRyYWN0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIGdldENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHN1cGVyLmdldENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRpZiAoIGFuc3dlci5zdWNjZXNzID09ICdmb3VuZCcgKVxuXHRcdHtcblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdBdWRpbyBmaWxlOiAnICsgYW5zd2VyLmRhdGEuYXVkaW9JbmZvLnBhdGgsIHsgdXNlcjogJ21lbW9yeTInIH0gKTtcblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdSZWNvcmRlZCBvbiB0aGU6ICcgKyBhbnN3ZXIuZGF0YS5hdWRpb0luZm8uZGF0ZSwgeyB1c2VyOiAnbWVtb3J5MicgfSApO1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJycsIHsgdXNlcjogJ21lbW9yeTInIH0gKTtcblx0XHR9XG5cdH1cblx0YXN5bmMgZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgYW5zd2VyID0gYXdhaXQgc3VwZXIuZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdGlmICggYW5zd2VyLnN1Y2Nlc3MgPT0gJ2ZvdW5kJyApXG5cdFx0e1xuXHRcdFx0dmFyIGNvbnRlbnQgPSAoIHR5cGVvZiBhbnN3ZXIuZGF0YS5kaXJlY3QuY29udGVudFsgMCBdID09ICd1bmRlZmluZWQnID8gYW5zd2VyLmRhdGEuaW5kaXJlY3QuY29udGVudFsgMCBdIDogYW5zd2VyLmRhdGEuZGlyZWN0LmNvbnRlbnRbIDAgXSApO1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ0F1ZGlvIGZpbGU6ICcgKyBjb250ZW50LmF1ZGlvSW5mby5wYXRoLCB7IHVzZXI6ICdtZW1vcnkyJyB9ICk7XG5cdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnUmVjb3JkZWQgb24gdGhlOiAnICsgY29udGVudC5hdWRpb0luZm8uZGF0ZS50ZXh0LCB7IHVzZXI6ICdtZW1vcnkyJyB9ICk7XG5cdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnJywgeyB1c2VyOiAnbWVtb3J5MicgfSApO1xuXHRcdH1cblx0XHRyZXR1cm4gYW5zd2VyO1xuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5NZW1vcnkgPSBNZW1vcnlHZW5lcmljQXVkaW9zO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCAgWyBcXCBbICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCAgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyAgW198IHxfXSBcXCAgICAgQXNzaXN0YW50XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktbWVtb3J5LWF3aS1jb252ZXJzYXRpb25zLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBDb252ZXJzYXRpb25zIG1lbW9yeSBicmFuY2hcbipcbiovXG52YXIgYXdpbWVtb3J5ID0gcmVxdWlyZSggJy4uL2F3aS1tZW1vcnknICk7XG5cbmNsYXNzIE1lbW9yeUdlbmVyaWNDb252ZXJzYXRpb25zIGV4dGVuZHMgYXdpbWVtb3J5Lk1lbW9yeVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMudG9rZW4gPSAnY29udmVyc2F0aW9ucyc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5uYW1lID0gJ0NvbnZlcnNhdGlvbiBTb3V2ZW5pciBDaGFpbic7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICdzdG9yZXMgYSB0aHJlYWQgb2YgbWVzc2FnZXMgd2l0aCBvbmUgcGVyc29uJztcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gW1xuXHRcdFx0eyB1c2VySW5wdXQ6ICd3aGF0IHRvIGZpbmQgaW4gdGhlIG1lc3NhZ2VzJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiBmYWxzZSwgZGVmYXVsdDogJycgfSxcblx0XHRcdHsgZnJvbTogJ3RoZSBraW5kIG9mIHRoaW5ncyB0byBmaW5kJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiAnYW55JyB9LFxuXHRcdFx0eyBpbnRlcnZhbDogJ3doZW4gdGhlIHRoaW5ncyB3ZXJlIHNhaWQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUsIGRlZmF1bHQ6ICdhbnknIH0sXG5cdFx0XTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBtZXNzYWdlSW5mb3M6ICdmb3VuZCBtZXNzYWdlcycsIHR5cGU6ICdtZXNzYWdlSW5mby5vYmplY3QuYXJyYXknIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMudGFncyA9IFsgJ21lbW9yeScsICdjb252ZXJzYXRpb24nIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRpZiAoICFwYXJhbWV0ZXJzLmludGVydmFsIClcblx0XHRcdHBhcmFtZXRlcnMuaW50ZXJ2YWwgPSAnYW55Jztcblx0XHRyZXR1cm4gYXdhaXQgdGhpc1sgY29udHJvbC5tZW1vcnkuY29tbWFuZCBdKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZXh0cmFjdENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLmV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgc291dmVuaXIgPSB0aGlzLmdldEJ1YmJsZSggdGhpcy5nZXRCdWJibGUoICdyb290JyApLnByb3BlcnRpZXMuZXhpdHNbICdzdWNjZXNzJyBdICk7XG5cdFx0aWYgKCBzb3V2ZW5pciApXG5cdFx0e1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ0NvbnZlcnNhdGlvbiBiZXR3ZWVuOiAnICsgc291dmVuaXIucGFyYW1ldGVycy5zZW5kZXJOYW1lICsgJyBhbmQgJyArIHNvdXZlbmlyLnBhcmFtZXRlcnMucmVjZWl2ZXJOYW1lICsgJywnLCB7IHVzZXI6ICdtZW1vcnkyJyB9ICk7XG5cdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnT24gdGhlIDogJyArIHNvdXZlbmlyLnBhcmFtZXRlcnMuZGF0ZSArICcuJywgeyB1c2VyOiAnbWVtb3J5MicgfSApO1xuXHRcdH1cblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIuZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIGZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLmZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCBzdXBlci5wbGF5YmFjayggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLk1lbW9yeSA9IE1lbW9yeUdlbmVyaWNDb252ZXJzYXRpb25zO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcIFsgIF1bICAgIF0gICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsIEFzc2lzdGFudFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyBbX3wgfF9dIFxcICAgICBsaW5rOlxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLW1lbW9yeS1hd2ktZG9jdW1lbnRzLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBEb2N1bWVudCBtZW1vcnkgYnJhbmNoXG4qXG4qL1xudmFyIGF3aW1lbW9yeSA9IHJlcXVpcmUoICcuLi9hd2ktbWVtb3J5JyApO1xuXG5jbGFzcyBNZW1vcnlHZW5lcmljRG9jdW1lbnRzIGV4dGVuZHMgYXdpbWVtb3J5Lk1lbW9yeVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMudG9rZW4gPSAnZG9jdW1lbnRzJztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLm5hbWUgPSAnRG9jdW1lbnQgU291dmVuaXIgQ2hhaW4nO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAnc3RvcmVzIHRoZSBjb250ZW50IGRvY3VtZW50cyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFtcblx0XHRcdHsgdXNlcklucHV0OiAnd2hhdCB0byBmaW5kIGluIHRoZSBkb2N1bWVudHMnLCB0eXBlOiAnc3RyaW5nJyB9LFxuXHRcdFx0eyBmcm9tOiAndGhlIGtpbmQgb2YgdGhpbmdzIHRvIGZpbmQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUsIGRlZmF1bHQ6ICdhbnknIH0sXG5cdFx0XHR7IGludGVydmFsOiAnd2hlbiB0aGUgZG9jdW1lbnQgd2FzIGNyZWF0ZWQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUsIGRlZmF1bHQ6ICdhbnknIH0sXG5cdFx0XTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBkb2N1bWVudEluZm9zOiAnbGlzdCBvZiBkb2N1bWVudHMgZm91bmQnLCB0eXBlOiAnZG9jdW1lbnRJbmZvLnNvdXZlbmlyLmFycmF5JyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnRhZ3MgPSBbICdtZW1vcnknLCAnZG9jdW1lbnQnIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRpZiAoICFwYXJhbWV0ZXJzLmludGVydmFsIClcblx0XHRcdHBhcmFtZXRlcnMuaW50ZXJ2YWwgPSAnYW55Jztcblx0XHRyZXR1cm4gYXdhaXQgdGhpc1sgY29udHJvbC5tZW1vcnkuY29tbWFuZCBdKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZXh0cmFjdENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLmV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgc291dmVuaXIgPSB0aGlzLmdldEJ1YmJsZSggdGhpcy5nZXRCdWJibGUoICdyb290JyApLnByb3BlcnRpZXMuZXhpdHNbICdzdWNjZXNzJyBdICk7XG5cdFx0aWYgKCBzb3V2ZW5pciApXG5cdFx0e1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ0RvY3VtZW50IGZpbGU6ICcgKyBzb3V2ZW5pci5wYXJhbWV0ZXJzLnBhdGgsIHsgdXNlcjogJ21lbW9yeTInIH0gKTtcblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdDcmVhdGlvbiBkYXRlOiAnICsgc291dmVuaXIucGFyYW1ldGVycy5kYXRlICsgJy4nLCB7IHVzZXI6ICdtZW1vcnkyJyB9ICk7XG5cdFx0fVxuXHRcdHJldHVybiBhd2FpdCBzdXBlci5nZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIuZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLnBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuTWVtb3J5ID0gTWVtb3J5R2VuZXJpY0RvY3VtZW50cztcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCBbICBdWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbCBBc3Npc3RhbnRcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gW198IHxfXSBcXCAgICAgbGluazpcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1tZW1vcnktYXdpLWVycm9yLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBNZW1vcnkgZXJyb3IgYnJhbmNoXG4qXG4qL1xudmFyIGF3aW1lbW9yeSA9IHJlcXVpcmUoICcuLi9hd2ktbWVtb3J5JyApO1xuXG5jbGFzcyBNZW1vcnlHZW5lcmljRXJyb3IgZXh0ZW5kcyBhd2ltZW1vcnkuTWVtb3J5XG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ01lbW9yeSBFcnJvciBIYW5kbGluZyc7XG5cdFx0dGhpcy50b2tlbiA9ICdlcnJvcic7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9IFwiaGFuZGxlIEFsemhlaW5tZXI/XCI7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFsgXSxcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgXTtcblx0XHR0aGlzLnByb3BlcnRpZXMuc3ViVG9waWNzLnB1c2goIC4uLlsgJ21lbW9yeScsICdlcnJvcicgXSApO1xuXHRcdHRoaXMucHJvcGVydGllcy50YWdzID0gWyAnbWVtb3J5JywgJ2Vycm9yJyBdO1xuXHR9XG5cdGFzeW5jIGV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHR9XG5cdGFzeW5jIGdldENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdH1cblx0YXN5bmMgZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApXG5cdHtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApXG5cdHtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuTWVtb3J5ID0gTWVtb3J5R2VuZXJpY0Vycm9yO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcIFsgIF1bICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsIEFzc2lzdGFudFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyBbX3wgfF9dIFxcICAgICBsaW5rOlxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLW1lbW9yeS1hd2ktaW1hZ2VzLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBJbWFnZXMgbWVtb3J5IGJyYW5jaFxuKlxuKi9cbnZhciBhd2ltZW1vcnkgPSByZXF1aXJlKCAnLi4vYXdpLW1lbW9yeScgKTtcblxuY2xhc3MgTWVtb3J5R2VuZXJpY0ltYWdlcyBleHRlbmRzIGF3aW1lbW9yeS5NZW1vcnlcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLnRva2VuID0gJ2ltYWdlcyc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5uYW1lID0gJ0ltYWdlcyBTb3V2ZW5pciBDaGFpbic7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICdzdG9yZXMgYSBsaXN0IG9mIGltYWdlcyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFtcblx0XHRcdHsgdXNlcklucHV0OiAnd2hhdCB0byBmaW5kIGluIHRoZSBpbWFnZXMnLCB0eXBlOiAnc3RyaW5nJyB9LFxuXHRcdFx0eyBmcm9tOiAndGhlIGtpbmQgb2YgdGhpbmdzIHRvIGZpbmQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUsIGRlZmF1bHQ6ICdhbnknIH0sXG5cdFx0XHR7IGludGVydmFsOiAnd2hlbiB0aGUgaW1hZ2Ugd2FzIGNyZWF0ZWQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUsIGRlZmF1bHQ6ICdhbnknIH0sXG5cdFx0XTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBpbWFnZUluZm9zOiAnbGlzdCBvZiBpbWFnZXMgZm91bmQnLCB0eXBlOiAnaW1hZ2VJbmZvLnNvdXZlbmlyLmFycmF5JyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnRhZ3MgPSBbICdtZW1vcnknLCAnaW1hZ2VzJyBdO1xuXHR9XG5cdGFzeW5jIHBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wsIG5lc3RlZCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgdGhpc1sgY29udHJvbC5tZW1vcnkuY29tbWFuZCBdKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZXh0cmFjdENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLmV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgc291dmVuaXIgPSB0aGlzLmdldEJ1YmJsZSggdGhpcy5nZXRCdWJibGUoICdyb290JyApLnByb3BlcnRpZXMuZXhpdHNbICdzdWNjZXNzJyBdICk7XG5cdFx0aWYgKCBzb3V2ZW5pciApXG5cdFx0e1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ0ltYWdlIGZpbGU6ICcgKyBzb3V2ZW5pci5wYXJhbWV0ZXJzLnBhdGgsIHsgdXNlcjogJ21lbW9yeTInIH0gKTtcblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdDcmVhdGVkIG9uIHRoZSAnICsgc291dmVuaXIucGFyYW1ldGVycy5kYXRlLCB7IHVzZXI6ICdtZW1vcnkyJyB9ICk7XG5cdFx0fVxuXHRcdHJldHVybiBhd2FpdCBzdXBlci5nZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIuZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5NZW1vcnkgPSBNZW1vcnlHZW5lcmljSW1hZ2VzO1xuIiwiLyoqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qXG4qICAgICAgICAgICAgLyBcXFxuKiAgICAgICAgICAvIF8gXFwgICAgICAgICAgICAgICjCsMKwKSAgICAgICBJbnRlbGxpZ2VudFxuKiAgICAgICAgLyBfX18gXFwgWyBcXCBbIFxcIFsgIF1bICAgXSAgICAgICBQcm9ncmFtbWFibGVcbiogICAgIF8vIC8gICBcXCBcXF9cXCBcXC9cXCBcXC8gLyAgfCAgfCBcXCAgICAgIFBlcnNvbmFsIEFzc2lzdGFudFxuKiAoXyl8X19fX3wgfF9fX198XFxfXy9cXF9fLyBbX3wgfF9dIFxcICAgICBsaW5rOlxuKlxuKiBUaGlzIGZpbGUgaXMgb3Blbi1zb3VyY2UgdW5kZXIgdGhlIGNvbmRpdGlvbnMgY29udGFpbmVkIGluIHRoZVxuKiBsaWNlbnNlIGZpbGUgbG9jYXRlZCBhdCB0aGUgcm9vdCBvZiB0aGlzIHByb2plY3QuXG4qIFBsZWFzZSBzdXBwb3J0IHRoZSBwcm9qZWN0OiBodHRwczovL3BhdHJlb24uY29tL2ZyYW5jb2lzbGlvbmV0XG4qXG4qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiogQGZpbGUgYXdpLW1lbW9yeS1hd2ktbWFpbHMuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IE1haWxzIG1lbW9yeSBicmFuY2hcbipcbiovXG52YXIgYXdpbWVtb3J5ID0gcmVxdWlyZSggJy4uL2F3aS1tZW1vcnknICk7XG5cbmNsYXNzIE1lbW9yeUdlbmVyaWNNYWlscyBleHRlbmRzIGF3aW1lbW9yeS5NZW1vcnlcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLnRva2VuID0gJ21haWxzJztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLm5hbWUgPSAnTWFpbHMgU291dmVuaXIgQ2hhaW4nO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAnc3RvcmVzIGEgbGlzdCBvZiBtYWlscyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFtcblx0XHRcdHsgdXNlcklucHV0OiAnd2hhdCB0byBmaW5kIGluIHRoZSBtYWlsJywgdHlwZTogJ3N0cmluZycgfSxcblx0XHRcdHsgZnJvbTogJ3RoZSBraW5kIG9mIHRoaW5ncyB0byBmaW5kJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiAnYW55JyB9LFxuXHRcdFx0eyBpbnRlcnZhbDogJ3doZW4gdGhlIG1haWwgd2FzIHNlbnQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUsIGRlZmF1bHQ6ICdhbnknIH0sXG5cdFx0XTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBtYWlsSW5mb3M6ICdsaXN0IG9mIG1haWxzIGZvdW5kJywgdHlwZTogJ21haWxJbmZvLm9iamVjdC5hcnJheScgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy50YWdzID0gWyAnbWVtb3J5JywgJ21haWxzJyBdO1xuXHR9XG5cdGFzeW5jIHBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wsIG5lc3RlZCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgdGhpc1sgY29udHJvbC5tZW1vcnkuY29tbWFuZCBdKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZXh0cmFjdENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLmV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgc291dmVuaXIgPSB0aGlzLmdldEJ1YmJsZSggdGhpcy5nZXRCdWJibGUoICdyb290JyApLnByb3BlcnRpZXMuZXhpdHNbICdzdWNjZXNzJyBdICk7XG5cdFx0aWYgKCBzb3V2ZW5pciApXG5cdFx0e1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ01haWwgYmV0d2VlbjogJyArIHNvdXZlbmlyLnBhcmFtZXRlcnMuc2VuZGVyTmFtZSArICcgYW5kICcgKyBzb3V2ZW5pci5wYXJhbWV0ZXJzLnJlY2VpdmVyTmFtZSwgeyB1c2VyOiAnbWVtb3J5MicgfSApO1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ09uIHRoZSAnICsgc291dmVuaXIucGFyYW1ldGVycy5kYXRlLCB7IHVzZXI6ICdtZW1vcnkyJyB9ICk7XG5cdFx0fVxuXHRcdHJldHVybiBhd2FpdCBzdXBlci5nZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIuZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIHBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIucGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5NZW1vcnkgPSBNZW1vcnlHZW5lcmljTWFpbHM7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgWyAgXVsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWwgQXNzaXN0YW50XG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vIFtffCB8X10gXFwgICAgIGxpbms6XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktbWVtb3J5LWF3aS1tZXNzZW5nZXIuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IE1lc3NlbmdlciBtZW1vcnkgYnJhbmNoXG4qXG4qL1xudmFyIGF3aW1lbW9yeSA9IHJlcXVpcmUoICcuLi9hd2ktbWVtb3J5JyApO1xuXG5jbGFzcyBNZW1vcnlHZW5lcmljTWVzc2VuZ2VyIGV4dGVuZHMgYXdpbWVtb3J5Lk1lbW9yeVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMudG9rZW4gPSAnbWVzc2VuZ2VyJztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLm5hbWUgPSAnTWVzc2FnZXMgU291dmVuaXIgQ2hhaW4nO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAnc3RvcmVzIGEgdGhyZWFkIG9mIG1lc3NhZ2VzIHdpdGggb25lIHBlcnNvbic7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFtcblx0XHRcdHsgdXNlcklucHV0OiAnd2hhdCB0byBmaW5kIGluIHRoZSBtZXNzYWdlcycsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogZmFsc2UsIGRlZmF1bHQ6ICcnIH0sXG5cdFx0XHR7IGZyb206ICd3aGF0IGtpbmQgb2YgY29udGVudCB0byByZW1lbWJlcicsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJ2FueScgfSxcblx0XHRcdHsgaW50ZXJ2YWw6ICdpbnRlcnZhbCBvZiB0aW1lIHdoZW4gdGhlIG1lc3NhZ2Ugd2FzIHdyaXR0ZW4nLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUsIGRlZmF1bHQ6ICdhbnknIH0sXG5cdFx0XTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBtZXNzYWdlSW5mb3M6ICdsaXN0IG9mIG1lc3NhZ2VzIGZvdW5kJywgdHlwZTogJ21lc3NhZ2VJbmZvLm9iamVjdC5hcnJheScgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy50YWdzID0gWyAnbWVtb3J5JywgJ21lc3NhZ2VzJyBdO1xuXHR9XG5cdGFzeW5jIHBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wsIG5lc3RlZCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgdGhpc1sgY29udHJvbC5tZW1vcnkuY29tbWFuZCBdKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZXh0cmFjdENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLmV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgc291dmVuaXIgPSB0aGlzLmdldEJ1YmJsZSggdGhpcy5nZXRCdWJibGUoICdyb290JyApLnByb3BlcnRpZXMuZXhpdHNbICdzdWNjZXNzJyBdICk7XG5cdFx0aWYgKCBzb3V2ZW5pciApXG5cdFx0e1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ0NvbnZlcnNhdGlvbiBiZXR3ZWVuICcgKyBzb3V2ZW5pci5wYXJhbWV0ZXJzLnNlbmRlck5hbWUgKyAnIGFuZCAnICsgc291dmVuaXIucGFyYW1ldGVycy5yZWNlaXZlck5hbWUgKyAnLCcsIHsgdXNlcjogJ21lbW9yeTInIH0gKTtcblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdPbiB0aGUgJyArIHNvdXZlbmlyLnBhcmFtZXRlcnMuZGF0ZSwgeyB1c2VyOiAnbWVtb3J5MicgfSApO1xuXHRcdH1cblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIuZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIGZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLmZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sIClcblx0e1xuXHRcdHN1cGVyLnBsYXliYWNrKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuTWVtb3J5ID0gTWVtb3J5R2VuZXJpY01lc3NlbmdlcjtcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCBbICBdWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbCBBc3Npc3RhbnRcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gW198IHxfXSBcXCAgICAgbGluazpcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1tZW1vcnktYXdpLXBob3Rvcy5qc1xuKiBAYXV0aG9yIEZMIChGcmFuY29pcyBMaW9uZXQpXG4qIEBkYXRlIGZpcnN0IHB1c2hlZCBvbiAxMC8xMS8yMDE5XG4qIEB2ZXJzaW9uIDAuM1xuKlxuKiBAc2hvcnQgUGhvdG8gbWVtb3J5IGJyYW5jaFxuKlxuKi9cbnZhciBhd2ltZW1vcnkgPSByZXF1aXJlKCAnLi4vYXdpLW1lbW9yeScgKTtcblxuY2xhc3MgTWVtb3J5R2VuZXJpY1Bob3RvcyBleHRlbmRzIGF3aW1lbW9yeS5NZW1vcnlcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLnRva2VuID0gJ3Bob3Rvcyc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5uYW1lID0gJ1Bob3RvcyBTb3V2ZW5pciBDaGFpbic7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICdzdG9yZXMgYSBsaXN0IG9mIHBob3Rvcyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFtcblx0XHRcdHsgdXNlcklucHV0OiAnd2hhdCB0byBmaW5kIGluIHRoZSBwaG90b3MnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IGZhbHNlLCBkZWZhdWx0OiAnJyB9LFxuXHRcdFx0eyBmcm9tOiAnd2hhdCBraW5kIG9mIGNvbnRlbnQgdG8gZmluZCcsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJ2FueScgfSxcblx0XHRcdHsgaW50ZXJ2YWw6ICdpbnRlcnZhbCBvZiB0aW1lIHdoZW4gdGhlIHBob3RvIHdhcyB0YWtlbicsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJ2FueScgfSxcblx0XHRdO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzID0gWyB7IHBob3RvSW5mb3M6ICd0aGUgcGhvdG9zIGZvdW5kJywgdHlwZTogJ3Bob3RvSW5mby5vYmplY3QuYXJyYXknIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMudGFncyA9IFsgJ21lbW9yeScsICdwaG90b3MnIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgdGhpc1sgY29udHJvbC5tZW1vcnkuY29tbWFuZCBdKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZXh0cmFjdENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLmV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgc291dmVuaXIgPSB0aGlzLmdldEJ1YmJsZSggdGhpcy5nZXRCdWJibGUoICdyb290JyApLnByb3BlcnRpZXMuZXhpdHNbICdzdWNjZXNzJyBdICk7XG5cdFx0aWYgKCBzb3V2ZW5pciApXG5cdFx0e1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ1Bob3RvIGZpbGU6ICcgKyBzb3V2ZW5pci5wYXJhbWV0ZXJzLnBhdGgsIHsgdXNlcjogJ21lbW9yeTInIH0gKTtcblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdUYWtlbiBvbiB0aGUgJyArIHNvdXZlbmlyLnBhcmFtZXRlcnMuZGF0ZSwgeyB1c2VyOiAnbWVtb3J5MicgfSApO1xuXHRcdH1cblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIuZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIGZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIGF3YWl0IHN1cGVyLmZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCBzdXBlci5wbGF5YmFjayggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLk1lbW9yeSA9IE1lbW9yeUdlbmVyaWNQaG90b3M7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgWyAgXVsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWwgQXNzaXN0YW50XG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vIFtffCB8X10gXFwgICAgIGxpbms6XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktbWVtb3J5LWF3aS12aWRlb3MuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IFZpZGVvIG1lbW9yeSBicmFuY2hcbipcbiovXG52YXIgYXdpbWVtb3J5ID0gcmVxdWlyZSggJy4uL2F3aS1tZW1vcnknICk7XG5cbmNsYXNzIE1lbW9yeUdlbmVyaWNWaWRlb3MgZXh0ZW5kcyBhd2ltZW1vcnkuTWVtb3J5XG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy50b2tlbiA9ICd2aWRlb3MnO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMubmFtZSA9ICdWaWRlb3MgU291dmVuaXIgQ2hhaW4nO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAnc3RvcmVzIGluZm9ybWF0aW9uIGFib3V0IG9uZSB2aWRlb3MnO1xuXHRcdHRoaXMucHJvcGVydGllcy5pbnB1dHMgPSBbXG5cdFx0XHR7IHVzZXJJbnB1dDogJ3doYXQgdG8gZmluZCBpbiB0aGUgdmlkZW8nLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IGZhbHNlLCBkZWZhdWx0OiAnJyB9LFxuXHRcdFx0eyB0eXBlOiAnd2hhdCB0eXBlIG9mIGNvbnRlbnQgdG8gZmluZCcsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJ2FueScgfSxcblx0XHRcdHsgaW50ZXJ2YWw6ICdpbnRlcnZhbCBvZiB0aW1lIHdoZW4gdGhlIHZpZGVvIHdhcyB0YWtlbicsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJ2FueScgfSxcblx0XHRdO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzID0gW1x0eyB2aWRlb0luZm9zOiAndGhlIGxpc3Qgb2YgdmlkZW9zIGZvdW5kJywgdHlwZTogJ3ZpZGVvSW5mby5vYmplY3QuYXJyYXknIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMudGFncyA9IFsgJ21lbW9yeScsICd2aWRlb3MnIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCwgbmVzdGVkIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCB0aGlzWyBjb250cm9sLm1lbW9yeS5jb21tYW5kIF0oIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyBleHRyYWN0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gYXdhaXQgc3VwZXIuZXh0cmFjdENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyBnZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBhbnN3ZXIgPSBhd2FpdCBzdXBlci5nZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0aWYgKCBhbnN3ZXIuc3VjY2VzcyA9PSAnZm91bmQnIClcblx0XHR7XG5cdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnVmlkZW8gZmlsZTogJyArIGFuc3dlci5kYXRhLmF1ZGlvSW5mby5wYXRoLCB7IHVzZXI6ICdtZW1vcnkyJyB9ICk7XG5cdFx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnUmVjb3JkZWQgb24gdGhlOiAnICsgYW5zd2VyLmRhdGEuYXVkaW9JbmZvLmRhdGUsIHsgdXNlcjogJ21lbW9yeTInIH0gKTtcblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICcnLCB7IHVzZXI6ICdtZW1vcnkyJyB9ICk7XG5cdFx0fVxuXHR9XG5cdGFzeW5jIGZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIGFuc3dlciA9IGF3YWl0IHN1cGVyLmZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRpZiAoIGFuc3dlci5zdWNjZXNzID09ICdmb3VuZCcgKVxuXHRcdHtcblx0XHRcdHZhciBjb250ZW50ID0gKCB0eXBlb2YgYW5zd2VyLmRhdGEuZGlyZWN0LmNvbnRlbnRbIDAgXSA9PSAndW5kZWZpbmVkJyA/IGFuc3dlci5kYXRhLmluZGlyZWN0LmNvbnRlbnRbIDAgXSA6IGFuc3dlci5kYXRhLmRpcmVjdC5jb250ZW50WyAwIF0gKTtcblx0XHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdWaWRlbyBmaWxlOiAnICsgY29udGVudC52aWRlb0luZm8ucGF0aCwgeyB1c2VyOiAnbWVtb3J5MicgfSApO1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ1JlY29yZGVkIG9uIHRoZTogJyArIGNvbnRlbnQudmlkZW9JbmZvLmRhdGUudGV4dCwgeyB1c2VyOiAnbWVtb3J5MicgfSApO1xuXHRcdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJycsIHsgdXNlcjogJ21lbW9yeTInIH0gKTtcblx0XHR9XG5cdFx0cmV0dXJuIGFuc3dlcjtcblx0fVxuXHRhc3luYyBwbGF5YmFjayggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sIClcblx0e1xuXHRcdHJldHVybiBhd2FpdCBzdXBlci5wbGF5YmFjayggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLk1lbW9yeSA9IE1lbW9yeUdlbmVyaWNWaWRlb3M7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgWyAgXVsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWwgQXNzaXN0YW50XG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vIFtffCB8X10gXFwgICAgIGxpbms6XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktc291dmVuaXIuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IFNvdXZlbmlyIGJ1YmJsZXM6IHN0b3JlcyBhbmQgcmVjYWxsIGluZm9ybWF0aW9uc1xuKlxuKi9cbnZhciBhd2lidWJibGUgPSByZXF1aXJlKCAnLi4vYnViYmxlcy9hd2ktYnViYmxlJyApXG5cbmNsYXNzIFNvdXZlbmlyIGV4dGVuZHMgYXdpYnViYmxlLkJ1YmJsZVxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMucGFyYW1ldGVycy5zZW5kZXJOYW1lID0gdHlwZW9mIHRoaXMucGFyYW1ldGVycy5zZW5kZXJOYW1lID09ICd1bmRlZmluZWQnID8gJycgOiB0aGlzLnBhcmFtZXRlcnMuc2VuZGVyTmFtZTtcblx0XHR0aGlzLnBhcmFtZXRlcnMucmVjZWl2ZXJOYW1lID0gdHlwZW9mIHRoaXMucGFyYW1ldGVycy5yZWNlaXZlck5hbWUgPT0gJ3VuZGVmaW5lZCcgPyAnJyA6IHRoaXMucGFyYW1ldGVycy5yZWNlaXZlck5hbWU7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnc291dmVuaXInO1xuXHRcdHRoaXMub0NsYXNzID0gJ3NvdXZlbmlyJztcblx0XHR0aGlzLnByb3BlcnRpZXMudG9waWMgPSAnJztcblx0XHR0aGlzLnByb3BlcnRpZXMuc3ViVG9waWNzID0gW107XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmludGVydmFsID0geyBzdGFydDogMCwgZW5kIDogMCB9O1xuXHR9XG5cdGFzeW5jIGV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHR9XG5cdGFzeW5jIGdldENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdH1cblx0YXN5bmMgZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIucGxheSggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgcGxheWJhY2soIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApXG5cdHtcblx0XHRzdXBlci5wbGF5YmFjayggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0c3VwZXIudHJhbnNwaWxlKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuU291dmVuaXIgPSBTb3V2ZW5pcjtcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCBbICBdWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbCBBc3Npc3RhbnRcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gW198IHxfXSBcXCAgICAgbGluazpcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1zb3V2ZW5pci1hd2ktYXVkaW8uanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IEF1ZGlvIHNvdXZlbmlyXG4qXG4qL1xudmFyIGF3aXNvdXZlbmlyID0gcmVxdWlyZSggJy4uL2F3aS1zb3V2ZW5pcicgKTtcblxuY2xhc3MgU291dmVuaXJHZW5lcmljQXVkaW8gZXh0ZW5kcyBhd2lzb3V2ZW5pci5Tb3V2ZW5pclxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdBdWRpbyBTb3V2ZW5pciBCdWJibGUnO1xuXHRcdHRoaXMudG9rZW4gPSAnYXVkaW8nO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSBcInJlbWVtYmVycyBvbmUgYXVkaW8gZmlsZSBhbmQgaXQncyBjb250ZW50XCI7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFtcblx0XHRcdHsgdXNlcklucHV0OiAnd2hhdCB0byBmaW5kIGluIHRoZSBhdWRpbycsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogZmFsc2UsIGRlZmF1bHQ6ICcnIH0sXG5cdFx0XHR7IGZyb206ICd0aGUga2luZCBvZiB0aGluZ3MgdG8gbG9vayBmb3InLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUsIGRlZmF1bHQ6ICdhbnknIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMub3V0cHV0cyA9IFsgeyBhdWRpb0luZm86ICdpbmZvcm1hdGlvbiBhYm91dCB0aGUgYXVkaW8gZmlsZScsIHR5cGU6ICdvYmplY3QuYXVkaW9JbmZvJyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnRhZ3MgPSBbICdzb3V2ZW5pcicsICdhdWRpbycgXTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdGF3YWl0IHN1cGVyLnBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRyZXR1cm4gYXdhaXQgdGhpc1sgY29udHJvbC5tZW1vcnkuY29tbWFuZCBdKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnVGV4dDogJyArIHRoaXMucGFyYW1ldGVycy50ZXh0LCB7IHVzZXI6ICdtZW1vcnkzJyB9ICk7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJ1N0YXJ0OiAnICsgdGhpcy5wYXJhbWV0ZXJzLnN0YXJ0LnRleHQgKyAnLCBlbmQ6ICcgKyB0aGlzLnBhcmFtZXRlcnMuZW5kLnRleHQsIHsgdXNlcjogJ21lbW9yeTMnIH0gKTtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJywgeyB1c2VyOiAnbWVtb3J5MycgfSApO1xuXHRcdHJldHVybiB7XG5cdFx0XHRzdWNjZXNzOiAnZm91bmQnLFxuXHRcdFx0ZGF0YToge1x0YXVkaW9JbmZvOiB0aGlzLnBhcmFtZXRlcnMgfVxuXHRcdH07XG5cdH1cblx0YXN5bmMgZXh0cmFjdENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIGluZm8gPSB0aGlzLmF3aS51dGlsaXRpZXMuY29tcGFyZVR3b1N0cmluZ3MoIHRoaXMucGFyYW1ldGVycy50ZXh0LCBsaW5lLCBjb250cm9sICk7XG5cdFx0aWYgKCBpbmZvLnJlc3VsdCA+IDAgKVxuXHRcdHtcblx0XHRcdHZhciBjb250ZW50ID0gYXdhaXQgdGhpcy5nZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiAnZm91bmQnLCBkYXRhOiB7IHJlc3VsdDogaW5mby5yZXN1bHQsIG1hdGNoOiBpbmZvLCBjb250ZW50OiBjb250ZW50LmRhdGEuYXVkaW9JbmZvIH0gfTtcblx0XHR9XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogJ25vdGZvdW5kJyB9O1xuXHR9XG5cdGFzeW5jIGZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIGluZm8gPSB0aGlzLmF3aS51dGlsaXRpZXMubWF0Y2hUd29TdHJpbmdzKCB0aGlzLnBhcmFtZXRlcnMudGV4dCwgbGluZSwgY29udHJvbCApO1xuXHRcdGlmICggaW5mby5yZXN1bHQgPiAwIClcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmdldENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRyZXR1cm4geyBzdWNjZXNzOiAnbm90Zm91bmQnIH07XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIHN1cGVyLnRyYW5zcGlsZSggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLlNvdXZlbmlyID0gU291dmVuaXJHZW5lcmljQXVkaW87XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgWyAgXVsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWwgQXNzaXN0YW50XG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vIFtffCB8X10gXFwgICAgIGxpbms6XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktc291dmVuaXItYXdpLWRvY3VtZW50LmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBEb2N1bWVudCBzb3V2ZW5pclxuKlxuKi9cbnZhciBhd2lzb3V2ZW5pciA9IHJlcXVpcmUoICcuLi9hd2ktc291dmVuaXInICk7XG5cbmNsYXNzIFNvdXZlbmlyR2VuZXJpY0RvY3VtZW50IGV4dGVuZHMgYXdpc291dmVuaXIuU291dmVuaXJcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLm5hbWUgPSAnRG9jdW1lbnQgU291dmVuaXIgQnViYmxlJztcblx0XHR0aGlzLnRva2VuID0gJ2RvY3VtZW50Jztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLnByb3BlcnRpZXMuYWN0aW9uID0gXCJyZW1lbWJlcnMgb25lIGRvY3VtZW50IGZpbGUgYW5kIGl0J3MgY29udGVudFwiO1xuXHRcdHRoaXMucHJvcGVydGllcy5pbnB1dHMgPSBbXG5cdFx0XHR7IHVzZXJJbnB1dDogJ3doYXQgdG8gZmluZCBpbiB0aGUgZG9jdW1lbnQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IGZhbHNlLCBkZWZhdWx0OiAnJyB9LFxuXHRcdFx0eyBmcm9tOiAndGhlIGtpbmQgb2YgdGhpbmdzIHRvIGxvb2sgZm9yJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiAnYW55JyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbIHsgZG9jdW1lbnRJbmZvOiAnd2hhdCB3YXMgZm91bmQnLCB0eXBlOiAnb2JqZWN0LmRvY3VtZW50SW5mbycgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy50YWdzID0gWyAnc291dmVuaXInLCAnZG9jdW1lbnQnIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0cmV0dXJuIGF3YWl0IHRoaXNbIGNvbnRyb2wubWVtb3J5LmNvbW1hbmQgXSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIGV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBpbmZvID0gdGhpcy5hd2kudXRpbGl0aWVzLmNvbXBhcmVUd29TdHJpbmdzKCB0aGlzLnBhcmFtZXRlcnMudGV4dCwgbGluZSwgY29udHJvbCApO1xuXHRcdGlmICggaW5mby5yZXN1bHQgPiAwIClcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmdldENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRyZXR1cm4geyBzdWNjZXNzOiAnbm90Zm91bmQnIH07XG5cdH1cblx0YXN5bmMgZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCB0aGlzLnBhcmFtZXRlcnMudGV4dCwgeyB1c2VyOiAnbWVtb3J5MycgfSApO1xuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0nLCB7IHVzZXI6ICdtZW1vcnkzJyB9ICk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHN1Y2Nlc3M6ICdmb3VuZCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGRvY3VtZW50SW5mbzoge1xuXHRcdFx0XHRcdHJlY2VpdmVyTmFtZTogdGhpcy5wYXJhbWV0ZXJzLnJlY2VpdmVyTmFtZSxcblx0XHRcdFx0XHRwYXRoOiBwYXRoLFxuXHRcdFx0XHRcdHRleHQ6IHRleHQsXG5cdFx0XHRcdFx0ZGF0ZTogdGhpcy5hd2kudXRpbGl0aWVzLmdldFRpbWVzdGFtcEZyb21TdGF0cyggc3RhdHMgKVxuXHRcdFx0XHR9IH0gfTtcblx0fVxuXHRhc3luYyBmaW5kU291dmVuaXJzKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBpbmZvID0gdGhpcy5hd2kudXRpbGl0aWVzLm1hdGNoVHdvU3RyaW5ncyggdGhpcy5wYXJhbWV0ZXJzLnRleHQsIGxpbmUsIGNvbnRyb2wgKTtcblx0XHRpZiAoIGluZm8ucmVzdWx0ID4gMCApXG5cdFx0e1xuXHRcdFx0dmFyIGNvbnRlbnQgPSBhd2FpdCB0aGlzLmdldENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6ICdmb3VuZCcsIGRhdGE6IHsgcmVzdWx0OiBpbmZvLnJlc3VsdCwgbWF0Y2g6IGluZm8sIGNvbnRlbnQ6IGNvbnRlbnQuZGF0YS5kb2N1bWVudEluZm8gfSB9O1xuXHRcdH1cblx0XHRyZXR1cm4geyBzdWNjZXNzOiAnbm90Zm91bmQnIH07XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIHN1cGVyLnRyYW5zcGlsZSggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLlNvdXZlbmlyID0gU291dmVuaXJHZW5lcmljRG9jdW1lbnQ7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgWyAgXVsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWwgQXNzaXN0YW50XG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vIFtffCB8X10gXFwgICAgIGxpbms6XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktc291dmVuaXItYXdpLWVycm9yLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBTb3V2ZW5pciBlcnJvciBidWJibGVcbipcbiovXG52YXIgYXdpc291dmVuaXIgPSByZXF1aXJlKCAnLi4vYXdpLXNvdXZlbmlyJyApO1xuXG5jbGFzcyBTb3V2ZW5pckdlbmVyaWNFcnJvciBleHRlbmRzIGF3aXNvdXZlbmlyLlNvdXZlbmlyXG57XG5cdGNvbnN0cnVjdG9yKCBhd2ksIG9wdGlvbnMgPSB7fSApXG5cdHtcblx0XHRzdXBlciggYXdpLCBvcHRpb25zICk7XG5cdFx0dGhpcy5uYW1lID0gJ1NvdXZlbmlyIEVycm9yIEhhbmRsaW5nJztcblx0XHR0aGlzLnRva2VuID0gJ2Vycm9yJztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLnByb3BlcnRpZXMuYWN0aW9uID0gXCJoYW5kbGUgZXJyb3JzIGluIHNvdXZlbmlyIGNoYWluc1wiO1xuXHRcdHRoaXMucHJvcGVydGllcy5pbnB1dHMgPSBbXG5cdFx0XHR7IHVzZXJJbnB1dDogJ3doYXQgdGhlIHVzZXIgd2FudGVkIHRvIGZpbmQnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IHRydWUgfSxcblx0XHRcdHsgZnJvbTogJ3RoZSBraW5kKyBvZiB0aGluZ3MgaGUgd2FzIGxvb2tpbmcgZm9yJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiAnYW55JyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbIHsgZXJyb3JJbmZvOiAnd2hhdCB0byBkbyBuZXh0JywgdHlwZTogJ29iamVjdC5lcnJvckluZm8nIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMudGFncyA9IFsgJ3NvdXZlbmlyJywgJ2Vycm9yJyBdO1xuXHR9XG5cdGFzeW5jIHBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0YXdhaXQgc3VwZXIucGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdHJldHVybiBhd2FpdCB0aGlzWyBjb250cm9sLm1lbW9yeS5jb21tYW5kIF0oIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyBleHRyYWN0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4geyBzdWNjZXNzOiAnbm90Zm91bmQnIH07XG5cdH1cblx0YXN5bmMgZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnRXJyb3Igc291dmVybmlyIScsIHsgdXNlcjogJ21lbW9yeTMnIH0gKTtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJywgeyB1c2VyOiAnbWVtb3J5MycgfSApO1xuXHRcdHJldHVybiB7XG5cdFx0XHRzdWNjZXNzOiAnZm91bmQnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRlcnJvckluZm86IHtcblx0XHRcdFx0XHRsaW5lOiBsaW5lLFxuXHRcdFx0XHRcdHVzZXJJbnB1dDogcGFyYW1ldGVycy51c2VySW5wdXQsXG5cdFx0XHRcdFx0ZnJvbTogcGFyYW1ldGVycy5mcm9tLFxuXHRcdFx0XHRcdGNvbnRyb2w6IGNvbnRyb2xcblx0XHRcdFx0fSB9IH07XG5cdH1cblx0YXN5bmMgZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4geyBzdWNjZXNzOiAnbm90Zm91bmQnIH07XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIHN1cGVyLnRyYW5zcGlsZSggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLlNvdXZlbmlyID0gU291dmVuaXJHZW5lcmljRXJyb3I7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgWyAgXVsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWwgQXNzaXN0YW50XG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vIFtffCB8X10gXFwgICAgIGxpbms6XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktc291dmVuaXItYXdpLWltYWdlLmpzXG4qIEBhdXRob3IgRkwgKEZyYW5jb2lzIExpb25ldClcbiogQGRhdGUgZmlyc3QgcHVzaGVkIG9uIDEwLzExLzIwMTlcbiogQHZlcnNpb24gMC4zXG4qXG4qIEBzaG9ydCBJbWFnZSBzb3V2ZW5pclxuKlxuKi9cbnZhciBhd2lzb3V2ZW5pciA9IHJlcXVpcmUoICcuLi9hd2ktc291dmVuaXInICk7XG5cbmNsYXNzIFNvdXZlbmlyR2VuZXJpY0ltYWdlIGV4dGVuZHMgYXdpc291dmVuaXIuU291dmVuaXJcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLm5hbWUgPSAnSW1hZ2UgU291dmVuaXIgQnViYmxlJztcblx0XHR0aGlzLnRva2VuID0gJ2ltYWdlJztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLnByb3BlcnRpZXMuYWN0aW9uID0gXCJyZW1lbWJlcnMgb25lIGltYWdlIGZpbGUgYW5kIGl0J3MgY29udGVudFwiO1xuXHRcdHRoaXMucHJvcGVydGllcy5pbnB1dHMgPSBbXG5cdFx0XHR7IHVzZXJJbnB1dDogJ3doYXQgdG8gZmluZCBpbiB0aGUgaW1hZ2UnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IGZhbHNlLCBkZWZhdWx0OiAnJyB9LFxuXHRcdFx0eyBmcm9tOiAndGhlIGtpbmQgb2YgdGhpbmdzIHRvIGxvb2sgZm9yJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiAnYW55JyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbIHsgaW1hZ2VJbmZvOiAnd2hhdCB3YXMgZm91bmQnLCB0eXBlOiAnb2JqZWN0LmltYWdlSW5mbycgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy50YWdzID0gWyAnc291dmVuaXInLCAnaW1hZ2UnIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0cmV0dXJuIGF3YWl0IHRoaXNbIGNvbnRyb2wubWVtb3J5LmNvbW1hbmQgXSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIGV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBpbmZvID0gdGhpcy5hd2kudXRpbGl0aWVzLmNvbXBhcmVUd29TdHJpbmdzKCB0aGlzLnBhcmFtZXRlcnMudGV4dCwgbGluZSwgY29udHJvbCApO1xuXHRcdGlmICggaW5mby5yZXN1bHQgPiAwIClcblx0XHR7XG5cdFx0XHR2YXIgY29udGVudCA9IGF3YWl0IHRoaXMuZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogJ2ZvdW5kJywgZGF0YTogeyByZXN1bHQ6IGluZm8ucmVzdWx0LCBtYXRjaDogaW5mbywgY29udGVudDogY29udGVudC5kYXRhLmltYWdlSW5mbyB9IH07XG5cdFx0fVxuXHRcdHJldHVybiB7IHN1Y2Nlc3M6ICdub3Rmb3VuZCcgfTtcblx0fVxuXHRhc3luYyBnZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIHRoaXMucGFyYW1ldGVycy50ZXh0LCB7IHVzZXI6ICdtZW1vcnkzJyB9ICk7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgJy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLScsIHsgdXNlcjogJ21lbW9yeTMnIH0gKTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c3VjY2VzczogJ2ZvdW5kJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0aW1hZ2VJbmZvOiB7XG5cdFx0XHRcdFx0cmVjZWl2ZXJOYW1lOiB0aGlzLnBhcmFtZXRlcnMucmVjZWl2ZXJOYW1lLFxuXHRcdFx0XHRcdHBhdGg6IHBhdGgsXG5cdFx0XHRcdFx0dGV4dDogdGV4dCxcblx0XHRcdFx0XHRkYXRlOiB0aGlzLmF3aS51dGlsaXRpZXMuZ2V0VGltZXN0YW1wRnJvbVN0YXRzKCBzdGF0cyApXG5cdFx0XHRcdH0gfSB9O1xuXHR9XG5cdGFzeW5jIGZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIGluZm8gPSB0aGlzLmF3aS51dGlsaXRpZXMubWF0Y2hUd29TdHJpbmdzKCB0aGlzLnBhcmFtZXRlcnMudGV4dCwgbGluZSwgY29udHJvbCApO1xuXHRcdGlmICggaW5mby5yZXN1bHQgPiAwIClcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmdldENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRyZXR1cm4geyBzdWNjZXNzOiAnbm90Zm91bmQnIH07XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLlNvdXZlbmlyID0gU291dmVuaXJHZW5lcmljSW1hZ2U7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgWyAgXVsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWwgQXNzaXN0YW50XG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vIFtffCB8X10gXFwgICAgIGxpbms6XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktc291dmVuaXItYXdpLW1haWwuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IE1haWwgc291dmVuaXJcbipcbiovXG52YXIgYXdpc291dmVuaXIgPSByZXF1aXJlKCAnLi4vYXdpLXNvdXZlbmlyJyApO1xuXG5jbGFzcyBTb3V2ZW5pckdlbmVyaWNNYWlsIGV4dGVuZHMgYXdpc291dmVuaXIuU291dmVuaXJcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLm5hbWUgPSAnTWFpbCBTb3V2ZW5pciBCdWJibGUnO1xuXHRcdHRoaXMudG9rZW4gPSAnbWFpbCc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9IFwicmVtZW1iZXJzIG9uZSBtYWlsIGV4Y2hhbmdlIGFuZCBpdCdzIGNvbnRlbnRcIjtcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gW1xuXHRcdFx0eyB1c2VySW5wdXQ6ICd3aGF0IHRvIGZpbmQgaW4gdGhlIG1haWwnLCB0eXBlOiAnc3RyaW5nJywgb3B0aW9uYWw6IGZhbHNlLCBkZWZhdWx0OiAnJyB9LFxuXHRcdFx0eyBmcm9tOiAndGhlIGtpbmQgb2YgdGhpbmdzIHRvIGxvb2sgZm9yJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiAnYW55JyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbIHsgbWFpbEluZm86ICd3aGF0IHdhcyBmb3VuZCcsIHR5cGU6ICdvYmplY3QubWFpbEluZm8nIH0gXTtcblx0XHR0aGlzLnByb3BlcnRpZXMuc3ViVG9waWNzLnB1c2goIC4uLlsgJ3NvdXZlbmlyJywgJ21haWwnIF0gKTtcblx0XHR0aGlzLnByb3BlcnRpZXMudGFncyA9IFsgJ3NvdXZlbmlyJywgJ21haWwnIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0cmV0dXJuIGF3YWl0IHRoaXNbIGNvbnRyb2wubWVtb3J5LmNvbW1hbmQgXSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIGV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBpbmZvID0gdGhpcy5hd2kudXRpbGl0aWVzLmNvbXBhcmVUd29TdHJpbmdzKCB0aGlzLnBhcmFtZXRlcnMudGV4dCwgbGluZSwgY29udHJvbCApO1xuXHRcdGlmICggaW5mby5yZXN1bHQgPiAwIClcblx0XHR7XG5cdFx0XHR2YXIgY29udGVudCA9IGF3YWl0IHRoaXMuZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogJ2ZvdW5kJywgZGF0YTogeyByZXN1bHQ6IGluZm8ucmVzdWx0LCBtYXRjaDogaW5mbywgY29udGVudDogY29udGVudC5kYXRhLm1haWxJbmZvIH0gfTtcblx0XHR9XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogJ25vdGZvdW5kJyB9O1xuXHR9XG5cdGFzeW5jIGdldENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgdGhpcy5wYXJhbWV0ZXJzLnRleHQsIHsgdXNlcjogJ21lbW9yeTMnIH0gKTtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJywgeyB1c2VyOiAnbWVtb3J5MycgfSApO1xuXHRcdHJldHVybiB7XG5cdFx0XHRzdWNjZXNzOiAnZm91bmQnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRtYWlsSW5mbzoge1xuXHRcdFx0XHRcdHJlY2VpdmVyTmFtZTogdGhpcy5wYXJhbWV0ZXJzLnJlY2VpdmVyTmFtZSxcblx0XHRcdFx0XHRwYXRoOiBwYXRoLFxuXHRcdFx0XHRcdHRleHQ6IHRleHQsXG5cdFx0XHRcdFx0ZGF0ZTogdGhpcy5hd2kudXRpbGl0aWVzLmdldFRpbWVzdGFtcEZyb21TdGF0cyggc3RhdHMgKVxuXHRcdFx0XHR9IH0gfTtcblx0fVxuXHRhc3luYyBmaW5kU291dmVuaXJzKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBpbmZvID0gdGhpcy5hd2kudXRpbGl0aWVzLm1hdGNoVHdvU3RyaW5ncyggdGhpcy5wYXJhbWV0ZXJzLnRleHQsIGxpbmUsIGNvbnRyb2wgKTtcblx0XHRpZiAoIGluZm8ucmVzdWx0ID4gMCApXG5cdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy5nZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogJ25vdGZvdW5kJyB9O1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5Tb3V2ZW5pciA9IFNvdXZlbmlyR2VuZXJpY01haWw7XG4iLCIvKiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbipcbiogICAgICAgICAgICAvIFxcXG4qICAgICAgICAgIC8gXyBcXCAgICAgICAgICAgICAgKMKwwrApICAgICAgIEludGVsbGlnZW50XG4qICAgICAgICAvIF9fXyBcXCBbIFxcIFsgXFwgWyAgXVsgICBdICAgICAgIFByb2dyYW1tYWJsZVxuKiAgICAgXy8gLyAgIFxcIFxcX1xcIFxcL1xcIFxcLyAvICB8ICB8IFxcICAgICAgUGVyc29uYWwgQXNzaXN0YW50XG4qIChfKXxfX19ffCB8X19fX3xcXF9fL1xcX18vIFtffCB8X10gXFwgICAgIGxpbms6XG4qXG4qIFRoaXMgZmlsZSBpcyBvcGVuLXNvdXJjZSB1bmRlciB0aGUgY29uZGl0aW9ucyBjb250YWluZWQgaW4gdGhlXG4qIGxpY2Vuc2UgZmlsZSBsb2NhdGVkIGF0IHRoZSByb290IG9mIHRoaXMgcHJvamVjdC5cbiogUGxlYXNlIHN1cHBvcnQgdGhlIHByb2plY3Q6IGh0dHBzOi8vcGF0cmVvbi5jb20vZnJhbmNvaXNsaW9uZXRcbipcbiogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKiBAZmlsZSBhd2ktc291dmVuaXItYXdpLW1lc3NhZ2UuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IE1lc3NhZ2Ugc291dmVuaXJcbipcbiovXG52YXIgYXdpc291dmVuaXIgPSByZXF1aXJlKCAnLi4vYXdpLXNvdXZlbmlyJyApO1xuXG5jbGFzcyBTb3V2ZW5pckdlbmVyaWNNZXNzYWdlIGV4dGVuZHMgYXdpc291dmVuaXIuU291dmVuaXJcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLm5hbWUgPSAnTWVzc2FnZSBTb3V2ZW5pciBCdWJibGUnO1xuXHRcdHRoaXMudG9rZW4gPSAnbWVzc2FnZSc7XG5cdFx0dGhpcy5jbGFzc25hbWUgPSAnZ2VuZXJpYyc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmFjdGlvbiA9ICdyZW1lbWJlcnMgb25lIGNvbnZlcnNhdGlvbiBleGNoYW5nZSc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFtcblx0XHRcdHsgdXNlcklucHV0OiAndGhlIHRvcGljcyB0byByZW1lbWJlcicsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogZmFsc2UsIGRlZmF1bHQ6ICcnIH0sXG5cdFx0XHR7IGZyb206ICd0aGUga2luZCBvZiB0b3BpYyB0byByZW1lbWJlciwgZXhhbXBsZSBhdWRpbywgdmlkZW8gZXRjLicsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJycgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzID0gWyB7IG1lc3NhZ2VJbmZvOiAnd2hhdCB3YXMgZm91bmQnLCB0eXBlOiAnb2JqZWN0Lm1lc3NhZ2VJbmZvJywgZGVmYXVsdDogZmFsc2UgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy50YWdzID0gWyAnc291dmVuaXInLCAnbWVzc2VuZ2VyJywgJ21lc3NhZ2UnIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0cmV0dXJuIGF3YWl0IHRoaXNbIGNvbnRyb2wubWVtb3J5LmNvbW1hbmQgXSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIGV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBpbmZvID0gdGhpcy5hd2kudXRpbGl0aWVzLmNvbXBhcmVUd29TdHJpbmdzKCB0aGlzLnBhcmFtZXRlcnMuc2VuZGVyVGV4dCArIHRoaXMucGFyYW1ldGVycy5yZWNlaXZlclRleHQsIGxpbmUsIGNvbnRyb2wgKTtcblx0XHRpZiAoIGluZm8ucmVzdWx0ID4gMCApXG5cdFx0e1xuXHRcdFx0dmFyIGNvbnRlbnQgPSBhd2FpdCB0aGlzLmdldENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6ICdmb3VuZCcsIGRhdGE6IHsgcmVzdWx0OiBpbmZvLnJlc3VsdCwgbWF0Y2g6IGluZm8sIGNvbnRlbnQ6IGNvbnRlbnQuZGF0YS5tZXNzYWdlSW5mbyB9IH07XG5cdFx0fVxuXHRcdHJldHVybiB7IHN1Y2Nlc3M6ICdub3Rmb3VuZCcgfTtcblx0fVxuXHRhc3luYyBnZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsIHRoaXMucGFyYW1ldGVycy5zZW5kZXJOYW1lICsgJyBzYWlkOiAnICsgdGhpcy5wYXJhbWV0ZXJzLnNlbmRlclRleHQsIHsgdXNlcjogJ21lbW9yeTMnIH0gKTtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCB0aGlzLnBhcmFtZXRlcnMucmVjZWl2ZXJOYW1lICsgJyBzYWlkOiAnICsgdGhpcy5wYXJhbWV0ZXJzLnJlY2VpdmVyVGV4dCwgeyB1c2VyOiAnbWVtb3J5MycgfSApO1xuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0nLCB7IHVzZXI6ICdtZW1vcnkzJyB9ICk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHN1Y2Nlc3M6ICdmb3VuZCcsXG5cdFx0XHRkYXRhOiB7XHRtZXNzYWdlSW5mbzogdGhpcy5wYXJhbWV0ZXJzIH0gfTtcblx0fVxuXHRhc3luYyBmaW5kU291dmVuaXJzKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBmb3VuZCA9IHRoaXMuYXdpLnV0aWxpdGllcy5tYXRjaFR3b1N0cmluZ3MoIHRoaXMucGFyYW1ldGVycy5zZW5kZXJUZXh0ICsgdGhpcy5wYXJhbWV0ZXJzLnJlY2VpdmVyVGV4dCwgbGluZSwgeyBjYXNlSW5zZW5zaXRpdmU6IHRydWUgfSApO1xuXHRcdGlmICggZm91bmQucmVzdWx0ID4gMCApXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdH1cblx0XHRyZXR1cm4geyBzdWNjZXNzOiAnbm90Zm91bmQnIH07XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIHN1cGVyLnRyYW5zcGlsZSggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLlNvdXZlbmlyID0gU291dmVuaXJHZW5lcmljTWVzc2FnZTtcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCBbICBdWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbCBBc3Npc3RhbnRcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gW198IHxfXSBcXCAgICAgbGluazpcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1zb3V2ZW5pci1hd2ktcGhvdG8uanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IFBob3RvIHNvdXZlbmlyXG4qXG4qL1xudmFyIGF3aXNvdXZlbmlyID0gcmVxdWlyZSggJy4uL2F3aS1zb3V2ZW5pcicgKTtcblxuY2xhc3MgU291dmVuaXJHZW5lcmljUGhvdG8gZXh0ZW5kcyBhd2lzb3V2ZW5pci5Tb3V2ZW5pclxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdQaG90byBTb3V2ZW5pciBCdWJibGUnO1xuXHRcdHRoaXMudG9rZW4gPSAncGhvdG8nO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSAncmVtZW1iZXJzIG9uZSBwaG90byc7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFtcblx0XHRcdHsgdXNlcklucHV0OiAnd2hhdCB0byBmaW5kIGluIHRoZSBwaG90bycsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogZmFsc2UsIGRlZmF1bHQ6ICcnIH0sXG5cdFx0XHR7IGZyb206ICd0aGUga2luZCBvZiB0aGluZ3MgdG8gZmluZCcsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJ2FueScgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzID0gWyB7IHBob3RvSW5mbzogJ3doYXQgd2FzIGZvdW5kJywgdHlwZTogJ29iamVjdC5waG90b0luZm8nLCBkZWZhdWx0OiBmYWxzZSB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnRhZ3MgPSBbICdzb3V2ZW5pcicsICdwaG90bycgXTtcblx0fVxuXHRhc3luYyBwbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdGF3YWl0IHN1cGVyLnBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0XHRyZXR1cm4gYXdhaXQgdGhpc1sgY29udHJvbC5tZW1vcnkuY29tbWFuZCBdKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdH1cblx0YXN5bmMgZXh0cmFjdENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dmFyIGluZm8gPSB0aGlzLmF3aS51dGlsaXRpZXMuY29tcGFyZVR3b1N0cmluZ3MoIHRoaXMucGFyYW1ldGVycy50ZXh0LCBsaW5lLCBjb250cm9sICk7XG5cdFx0aWYgKCBpbmZvLnJlc3VsdCA+IDAgKVxuXHRcdHtcblx0XHRcdHZhciBjb250ZW50ID0gYXdhaXQgdGhpcy5nZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiAnZm91bmQnLCBkYXRhOiB7IHJlc3VsdDogaW5mby5yZXN1bHQsIG1hdGNoOiBpbmZvLCBjb250ZW50OiBjb250ZW50LmRhdGEucGhvdG9JbmZvIH0gfTtcblx0XHR9XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogJ25vdGZvdW5kJyB9O1xuXHR9XG5cdGFzeW5jIGdldENvbnRlbnQoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0dGhpcy5hd2kuZWRpdG9yLnByaW50KCBjb250cm9sLmVkaXRvciwgdGhpcy5wYXJhbWV0ZXJzLnRleHQsIHsgdXNlcjogJ21lbW9yeTMnIH0gKTtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJywgeyB1c2VyOiAnbWVtb3J5MycgfSApO1xuXHRcdHJldHVybiB7XG5cdFx0XHRzdWNjZXNzOiAnZm91bmQnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRwaG90b0luZm86IHtcblx0XHRcdFx0XHRyZWNlaXZlck5hbWU6IHRoaXMucGFyYW1ldGVycy5yZWNlaXZlck5hbWUsXG5cdFx0XHRcdFx0cGF0aDogcGF0aCxcblx0XHRcdFx0XHR0ZXh0OiB0ZXh0LFxuXHRcdFx0XHRcdGRhdGU6IHRoaXMuYXdpLnV0aWxpdGllcy5nZXRUaW1lc3RhbXBGcm9tU3RhdHMoIHN0YXRzIClcblx0XHRcdFx0fSB9IH07XG5cdH1cblx0YXN5bmMgZmluZFNvdXZlbmlycyggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR2YXIgaW5mbyA9IHRoaXMuYXdpLnV0aWxpdGllcy5tYXRjaFR3b1N0cmluZ3MoIHRoaXMucGFyYW1ldGVycy50ZXh0LCBsaW5lLCBjb250cm9sICk7XG5cdFx0aWYgKCBpbmZvLnJlc3VsdCA+IDAgKVxuXHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdHJldHVybiB7IHN1Y2Nlc3M6ICdub3Rmb3VuZCcgfTtcblx0fVxuXHRhc3luYyB0cmFuc3BpbGUoIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4gc3VwZXIudHJhbnNwaWxlKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKTtcblx0fVxufVxubW9kdWxlLmV4cG9ydHMuU291dmVuaXIgPSBTb3V2ZW5pckdlbmVyaWNQaG90bztcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCBbICBdWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbCBBc3Npc3RhbnRcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gW198IHxfXSBcXCAgICAgbGluazpcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1zb3V2ZW5pci1hd2ktZXJyb3IuanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IFNvdXZlbmlyIGVycm9yIGJ1YmJsZVxuKlxuKi9cbnZhciBhd2lzb3V2ZW5pciA9IHJlcXVpcmUoICcuLi9hd2ktc291dmVuaXInICk7XG5cbmNsYXNzIFNvdXZlbmlyR2VuZXJpY1Jvb3QgZXh0ZW5kcyBhd2lzb3V2ZW5pci5Tb3V2ZW5pclxue1xuXHRjb25zdHJ1Y3RvciggYXdpLCBvcHRpb25zID0ge30gKVxuXHR7XG5cdFx0c3VwZXIoIGF3aSwgb3B0aW9ucyApO1xuXHRcdHRoaXMubmFtZSA9ICdSb290Jztcblx0XHR0aGlzLnRva2VuID0gJ3Jvb3QnO1xuXHRcdHRoaXMuY2xhc3NuYW1lID0gJ2dlbmVyaWMnO1xuXHRcdHRoaXMucHJvcGVydGllcy5hY3Rpb24gPSBcInJvb3Qgb2YgYSBicmFuY2ggb2Ygc291dmVuaXJzXCI7XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLmlucHV0cyA9IFtcblx0XHRcdHsgdXNlcklucHV0OiAnd2hhdCB0byBmaW5kIGluIHRoZSBjaGFpbicsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogZmFsc2UsIGRlZmF1bHQ6ICcnIH0sXG5cdFx0XHR7IGZyb206ICd0aGUga2luZCBvZiB0aGluZ3MgdG8gZmluZCcsIHR5cGU6ICdzdHJpbmcnLCBvcHRpb25hbDogdHJ1ZSwgZGVmYXVsdDogJ2FueScgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy5vdXRwdXRzID0gWyB7IHJvb3RJbmZvOiAnd2hhdCB3YXMgZm91bmQnLCB0eXBlOiAnb2JqZWN0LnJvb3RJbmZvJyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLnRhZ3MgPSBbICdzb3V2ZW5pcicsICdyb290JyBdO1xuXHR9XG5cdGFzeW5jIHBsYXkoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0YXdhaXQgc3VwZXIucGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdHJldHVybiBhd2FpdCB0aGlzWyBjb250cm9sLm1lbW9yeS5jb21tYW5kIF0oIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKTtcblx0fVxuXHRhc3luYyBleHRyYWN0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRyZXR1cm4geyBzdWNjZXNzOiAnbm90Zm91bmQnIH07XG5cdH1cblx0YXN5bmMgZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnUm9vdCBzb3V2ZW5pciwgcGFyZW50OiAnICsgdGhpcy5wYXJlbnQgKyAnLicsIHsgdXNlcjogJ21lbW9yeTMnIH0gKTtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJywgeyB1c2VyOiAnbWVtb3J5MycgfSApO1xuXHRcdHJldHVybiB7XG5cdFx0XHRzdWNjZXNzOiAnZm91bmQnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRyb290SW5mbzoge1xuXHRcdFx0XHRcdHNlbmRlck5hbWU6IHRoaXMucGFyYW1ldGVycy5zZW5kZXJOYW1lLFxuXHRcdFx0XHRcdHJlY2VpdmVyTmFtZTogdGhpcy5wYXJhbWV0ZXJzLnJlY2VpdmVyTmFtZSxcblx0XHRcdH0gfSB9O1xuXHR9XG5cdGFzeW5jIGZpbmRTb3V2ZW5pcnMoIGxpbmUsIHBhcmFtZXRlcnMsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHN1Y2Nlc3M6ICdmb3VuZCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHJvb3RJbmZvOiB7XG5cdFx0XHRcdFx0c2VuZGVyTmFtZTogdGhpcy5wYXJhbWV0ZXJzLnNlbmRlck5hbWUsXG5cdFx0XHRcdFx0cmVjZWl2ZXJOYW1lOiB0aGlzLnBhcmFtZXRlcnMucmVjZWl2ZXJOYW1lLFxuXHRcdFx0fSB9IH07XG5cdH1cblx0YXN5bmMgdHJhbnNwaWxlKCBsaW5lLCBwYXJhbWV0ZXIsIGNvbnRyb2wgKVxuXHR7XG5cdFx0cmV0dXJuIHN1cGVyLnRyYW5zcGlsZSggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sICk7XG5cdH1cbn1cbm1vZHVsZS5leHBvcnRzLlNvdXZlbmlyID0gU291dmVuaXJHZW5lcmljUm9vdDtcbiIsIi8qKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKlxuKiAgICAgICAgICAgIC8gXFxcbiogICAgICAgICAgLyBfIFxcICAgICAgICAgICAgICAowrDCsCkgICAgICAgSW50ZWxsaWdlbnRcbiogICAgICAgIC8gX19fIFxcIFsgXFwgWyBcXCBbICBdWyAgIF0gICAgICAgUHJvZ3JhbW1hYmxlXG4qICAgICBfLyAvICAgXFwgXFxfXFwgXFwvXFwgXFwvIC8gIHwgIHwgXFwgICAgICBQZXJzb25hbCBBc3Npc3RhbnRcbiogKF8pfF9fX198IHxfX19ffFxcX18vXFxfXy8gW198IHxfXSBcXCAgICAgbGluazpcbipcbiogVGhpcyBmaWxlIGlzIG9wZW4tc291cmNlIHVuZGVyIHRoZSBjb25kaXRpb25zIGNvbnRhaW5lZCBpbiB0aGVcbiogbGljZW5zZSBmaWxlIGxvY2F0ZWQgYXQgdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LlxuKiBQbGVhc2Ugc3VwcG9ydCB0aGUgcHJvamVjdDogaHR0cHM6Ly9wYXRyZW9uLmNvbS9mcmFuY29pc2xpb25ldFxuKlxuKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4qIEBmaWxlIGF3aS1zb3V2ZW5pci1hd2ktdmlkZW8uanNcbiogQGF1dGhvciBGTCAoRnJhbmNvaXMgTGlvbmV0KVxuKiBAZGF0ZSBmaXJzdCBwdXNoZWQgb24gMTAvMTEvMjAxOVxuKiBAdmVyc2lvbiAwLjNcbipcbiogQHNob3J0IFZpZGVvIHNvdXZlbmlyc1xuKlxuKi9cbnZhciBhd2lzb3V2ZW5pciA9IHJlcXVpcmUoICcuLi9hd2ktc291dmVuaXInICk7XG5cbmNsYXNzIFNvdXZlbmlyR2VuZXJpY1ZpZGVvIGV4dGVuZHMgYXdpc291dmVuaXIuU291dmVuaXJcbntcblx0Y29uc3RydWN0b3IoIGF3aSwgb3B0aW9ucyA9IHt9IClcblx0e1xuXHRcdHN1cGVyKCBhd2ksIG9wdGlvbnMgKTtcblx0XHR0aGlzLm5hbWUgPSAnVmlkZW8gU291dmVuaXIgQnViYmxlJztcblx0XHR0aGlzLnRva2VuID0gJ3ZpZGVvJztcblx0XHR0aGlzLmNsYXNzbmFtZSA9ICdnZW5lcmljJztcblx0XHR0aGlzLnByb3BlcnRpZXMuYWN0aW9uID0gXCJyZW1lbWJlcnMgb25lIHBob3RvIGFuZCBpdCdzIGNvbnRlbnRcIjtcblx0XHR0aGlzLnByb3BlcnRpZXMuaW5wdXRzID0gW1xuXHRcdFx0eyB1c2VySW5wdXQ6ICd3aGF0IHRvIGZpbmQgaW4gdGhlIHZpZGVvJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiBmYWxzZSwgZGVmYXVsdDogJycgfSxcblx0XHRcdHsgZnJvbTogJ3RoZSBraW5kIG9mIHRoaW5ncyB0byBmaW5kJywgdHlwZTogJ3N0cmluZycsIG9wdGlvbmFsOiB0cnVlLCBkZWZhdWx0OiAnYW55JyB9IF07XG5cdFx0dGhpcy5wcm9wZXJ0aWVzLm91dHB1dHMgPSBbIHsgdmlkZW9JbmZvOiAnd2hhdCB3YXMgZm91bmQnLCB0eXBlOiAnb2JqZWN0LnZpZGVvSW5mbycgfSBdO1xuXHRcdHRoaXMucHJvcGVydGllcy50YWdzID0gWyAnc291dmVuaXInLCAnaW1hZ2UnIF07XG5cdH1cblx0YXN5bmMgcGxheSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApXG5cdHtcblx0XHRhd2FpdCBzdXBlci5wbGF5KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0cmV0dXJuIGF3YWl0IHRoaXNbIGNvbnRyb2wubWVtb3J5LmNvbW1hbmQgXSggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHR9XG5cdGFzeW5jIGV4dHJhY3RDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBpbmZvID0gdGhpcy5hd2kudXRpbGl0aWVzLmNvbXBhcmVUd29TdHJpbmdzKCB0aGlzLnBhcmFtZXRlcnMudGV4dCwgbGluZSwgY29udHJvbCApO1xuXHRcdGlmICggaW5mby5yZXN1bHQgPiAwIClcblx0XHR7XG5cdFx0XHR2YXIgY29udGVudCA9IGF3YWl0IHRoaXMuZ2V0Q29udGVudCggbGluZSwgcGFyYW1ldGVycywgY29udHJvbCApO1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogJ2ZvdW5kJywgZGF0YTogeyByZXN1bHQ6IGluZm8ucmVzdWx0LCBtYXRjaDogaW5mbywgY29udGVudDogY29udGVudC5kYXRhLnZpZGVvSW5mbyB9IH07XG5cdFx0fVxuXHRcdHJldHVybiB7IHN1Y2Nlc3M6ICdub3Rmb3VuZCcgfTtcblx0fVxuXHRhc3luYyBnZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICdUZXh0OiAnICsgdGhpcy5wYXJhbWV0ZXJzLnRleHQsIHsgdXNlcjogJ21lbW9yeTMnIH0gKTtcblx0XHR0aGlzLmF3aS5lZGl0b3IucHJpbnQoIGNvbnRyb2wuZWRpdG9yLCAnU3RhcnQ6ICcgKyB0aGlzLnBhcmFtZXRlcnMuc3RhcnQudGV4dCArICcsIGVuZDogJyArIHRoaXMucGFyYW1ldGVycy5lbmQudGV4dCwgeyB1c2VyOiAnbWVtb3J5MycgfSApO1xuXHRcdHRoaXMuYXdpLmVkaXRvci5wcmludCggY29udHJvbC5lZGl0b3IsICctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0nLCB7IHVzZXI6ICdtZW1vcnkzJyB9ICk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHN1Y2Nlc3M6ICdmb3VuZCcsXG5cdFx0XHRkYXRhOiB7XHR2aWRlb0luZm86IHRoaXMucGFyYW1ldGVycyB9XG5cdFx0fTtcblx0fVxuXHRhc3luYyBmaW5kU291dmVuaXJzKCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sIClcblx0e1xuXHRcdHZhciBpbmZvID0gdGhpcy5hd2kudXRpbGl0aWVzLm1hdGNoVHdvU3RyaW5ncyggdGhpcy5wYXJhbWV0ZXJzLnRleHQsIGxpbmUsIGNvbnRyb2wgKTtcblx0XHRpZiAoIGluZm8ucmVzdWx0ID4gMCApXG5cdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy5nZXRDb250ZW50KCBsaW5lLCBwYXJhbWV0ZXJzLCBjb250cm9sICk7XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogJ25vdGZvdW5kJyB9O1xuXHR9XG5cdGFzeW5jIHRyYW5zcGlsZSggbGluZSwgcGFyYW1ldGVyLCBjb250cm9sIClcblx0e1xuXHRcdHJldHVybiBzdXBlci50cmFuc3BpbGUoIGxpbmUsIHBhcmFtZXRlciwgY29udHJvbCApO1xuXHR9XG59XG5tb2R1bGUuZXhwb3J0cy5Tb3V2ZW5pciA9IFNvdXZlbmlyR2VuZXJpY1ZpZGVvO1xuIiwid2luZG93LmF3aSA9IHJlcXVpcmUoICcuL2F3aS1lbmdpbmUvYXdpJyApXHJcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
