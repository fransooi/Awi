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
