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
			{ userInput: 'the topic of data to process, example "Friend Name"', type: 'string', optional: true, default: '' },
			{ senderName: 'Your name, as stated in the conversation...', type: 'string' },
		];
		this.properties.outputs = [
			{ receiverName: 'the name of the receiver', type: 'string'  },
			{ souvenirs: 'list of souvenirs associated to the receiver', type: 'array.string.souvenir' }
		]
		this.properties.brackets = false;
		this.properties.tags = [ 'generic', 'memory', 'souvenirs' ];
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
			var type = parameters.userInput;
			if ( type )
			{
				var path = this.awi.utilities.normalize( this.awi.config.getDataPath() + '/todigest/' + type );
				var exist = await this.awi.system.exists( path );
				if ( !exist.success )
				{
					path = this.awi.utilities.normalize( this.awi.config.getDataPath() + '/todigest/' + type + 's' );
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
