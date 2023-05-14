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
* @file awi-bubble-awi-digest.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Digest command: digest the content of the toDigest directory
*
*/
var awibubbles = require( '../awi-bubbles' )

class BubbleAwiDigest extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Digest';
		this.token = 'digest';
		this.classname = 'awi';
		this.properties.action = 'read the files in the input buffer and memorize them';
		this.properties.inputs = [ 
			{ userInput: 'the topic of data to process, example "Friend Name"', type: 'string', optional: true, default: '' },
			{ senderName: 'Your name, as stated in the conversation...', type: 'string' }, 
		];
		this.properties.outputs = [ ];
		this.properties.brackets = false;
		this.properties.tags = [ 'awi', 'memory', 'souvenirs' ];
	}
	async messenger( dirPath, parameters )
	{
		var self = this;

		// Import one message list
		async function importMessages( todo, options )
		{
			var answer = await self.awi.connectors.importers.messenger.import( todo.htmlPath, parameters.senderName, todo.contactNameCompressed, { result: todo, from: todo.from } ); 
			if ( answer.success )
			{
				todo.done = true;
				todo.error = false;
				todo.directMemories = answer.data.directMemories;
				todo.videoMemories = answer.data.videoMemories;
				todo.audioMemories = answer.data.audioMemories;
				todo.directMemories = answer.data.directMemories;
				todo.directMemories = answer.data.directMemories;
				todo.contactName = answer.data.contactName;
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
			var path = this.awi.utilities.normalize( dirPath + '/messages/' + directoriesToScan[ d ] );
			var answer = await this.awi.system.getDirectory( path, { recursive: true } );
			var tree = answer.data;
			if ( tree )
			{
				if ( !parameters.contactName )
				{
					for ( var f = 0; f < tree.length; f++ )
					{
						var dirContact = tree[ f ];
						if ( dirContact.isDirectory )
						{
							var pos = dirContact.name.indexOf( '_' );
							if ( pos >= 0 )
							{
								var contactNameCompressed = dirContact.name.substring( 0, pos );
								for ( var ff = 0; ff < dirContact.files.length; ff++ )
								{
									var file = dirContact.files[ ff ];
									if ( file.name.indexOf( 'message_' ) == 0 )
									{
										todo.push( 
										{ 
											contactNameCompressed: contactNameCompressed, 
											contactName: '',
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
					var contactNameCompressed = parameters.contactName.split( ' ' ).join( '' ).toLowerCase();
					for ( var f = 0; f < tree.length; f++ )
					{
						var dirContact = tree[ f ];
						if ( dirContact.isDirectory && dirContact.name.indexOf( contactNameCompressed ) == 0 )
						{
							for ( var ff = 0; ff < dirContact.files.length; ff++ )
							{
								if ( dirContact.files[ ff ].name.indexOf( 'message_' ) == 0 )
								{
									todo.push( 
									{ 
										contactNameCompressed: contactNameCompressed, 
										contactName: '',
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

		var addedDirect = 0;		
		var invalid = [];
		var valid = [];
		for ( var td = 0; td < todo.length; td++ )
		{
			var tobedone = await importMessages( todo[ td ], {} );
			if ( !tobedone.error )
			{
				var done = false;
				var number = tobedone.directMemories.getNumberOfBubbles();
				if ( number > 0 )
				{
					var parameters =
					{
						topic: tobedone.contactName,
						subTopics: [ 'messenger', 'conversation' ],
						referencePath: tobedone.htmlPath
					}
					self.awi.memories.awi.messenger.addMemory( tobedone.directMemories, parameters );
					addedDirect += number;
					done = true;
				}
				if ( done )
					valid.push( tobedone );
			}
			else
			{
				invalid.push( tobedone );
			}
		}
		return {
			addedConversations: todo.length,
			addedDirect: addedDirect,
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
				addedConversations: 0,
				addedDirect: 0,
				valid: [],
				invalid: []
			}	
			parameters.contactName = parameters.userInput;
	
			var path = this.awi.utilities.normalize ( this.awi.config.getDataPath() );
			var answer = await this.awi.system.getDirectory( path, { recursive: false } );
			var tree = answer.data;
			if ( tree )
			{
				for ( var d = 0; d < tree.length; d++ )
				{
					var dir = tree[ d ];
					if ( this[ dir.name ] )
					{
						var info = await this[ dir.name ]( dir.path, parameters );
						result.addedConversations += info.addedConversations;
						result.addedDirect += info.addedDirect;
						result.valid.push( ...info.valid );
						result.invalid.push( ...info.invalid );
					}
				}
			}
	
			this.awi.editor.print( this, result.addedConversations + ' conversation(s) imported!', { user: 'information' } );
			this.awi.editor.print( this, 'Number of direct memories: ' + result.addedDirect + '.', { user: 'information' } );
			if ( result.invalid.length > 0 )
			{
				this.awi.editor.print( self, 'These conversations could not be imported...', { user: 'warning' } );
				for ( var i = 0; i < result.invalid.length; i++ )
				{
					this.awi.editor.print( this, ' - ' +  result.invalid[ i ].contactNameCompressed, { user: 'warning' } );
				}
			}
			return { success: true, data: { name: parameters.receiverName, result: result } };
		}
		return answer;
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
	async undo( options )
	{
		super.undo( options );
	}
	async redo( options )
	{
		super.redo( options );
	}
}
module.exports.Bubble = BubbleAwiDigest;
