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
* @file awi-connector-importers-messenger.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Connector to Messenger HTML backup files
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorImporterMessenger extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Messenger importer';
		this.token = 'messenger';
		this.classname = 'importer';
		this.version = '0.2';
	}
	async connect( options )
	{
		super.connect( options );
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}


	extractTokens( source, callback, extra )
	{
	}
	close()
	{

	}
	async import( path, senderName, receiverNameCompressed, control = {} )
	{
		receiverNameCompressed = receiverNameCompressed.split( ' ' ).join( '' );

		control.minimumTextLength = ( typeof control.minimumTextLength == 'undefined' ? 5 : control.minimumTextLength );

		var souvenirs = [];
		var receiverName = '';
		for ( var nFile = 1; ; nFile++ )
		{
			var answer = await this.awi.utilities.loadJSON( path + '/message_' + nFile + '.json', { encoding: 'utf8' } );
			if ( !answer.success )
				break;

			var ok = false;
			var messages = answer.data;
			for ( var n = 0; n < messages.participants.length; n++ )
			{
				if ( messages.participants[ n ].name.toLowerCase() == senderName.toLowerCase() )
					ok = true;
				else
					receiverName = messages.participants[ n ].name;
			}
			if ( ok )
			{
				var timestart, timeend;
				var conversation = [];
				for ( var nMessage = messages.messages.length - 1; nMessage>= 0 ; nMessage-- )
				{
					var message = messages.messages[ nMessage ];
					if ( !timestart )
						timestart = message.timestamp_ms;
					var time = message.timestamp_ms;

					if ( time - timestart > 24 * 60 * 60 * 1000 )
					{
						var text = [];
						for ( var c = 0; c < conversation.length; c++ )
						{
							var mess = conversation[ c ];								
							if ( mess.content )
								text.push( mess.name + ' said: ' + message.content );
							if ( mess.photos )
								text.push( mess.photos.length + ' photo' + ( mess.photos.length < 2 ? ',' : 's,' ) );
							if ( mess.videos )
								text.push( mess.videos.length + ' photo' + ( mess.videos.length < 2 ? ',' : 's,' ) );
							if ( mess.audio )
								text.push( mess.audio.length + ' audio file' + ( mess.audio.length < 2 ? ',' : 's,' ) );
							if ( mess.links )
								text.push( mess.links.length + ' link' + ( mess.links.length < 2 ? ',' : 's,' ) );							
						}
						this.awi.editor.print( control.editor, text, { user: 'importer3' } );
						this.awi.editor.print( control.editor, '---------------------------------------------------------' , { user: 'importer2' } );
						var souvenir = new this.awi.newSouvenirs.generic.message( this.awi,
						{
							key: this.awi.utilities.getUniqueIdentifier( {}, 'souvenir_messenger', Math.floor( Math.random() * 1000000 ), '', 5, 5 ),
							parent: '',
							parameters:
							{
								path: path,
								senderName: senderName,
								receiverName: receiverName,
								interval: { start: timestart, end: timeend },
								conversation: conversation
							}
						} );
						souvenirs.push( souvenir );
						timestart = time;
						conversation = [];
					}
					var mess = 
					{
						name: message.sender_name
					};
					if ( message.content && message.content.length > control.minimumTextLength )
						mess.content = this.awi.system.decodeText( message.content );
					if ( message.photos )
						mess.photos = message.photos;
					if ( message.videos )
						mess.photos = message.videos;
					if ( message.audio )
						mess.audio = message.audio;
					if ( message.files )
						mess.files = message.files;
					conversation.push( mess );
					timeend = time;
				}
			}
		}
		if ( souvenirs.length > 0 )
			this.awi.editor.print( control.editor, 'Imported conversation with ' + receiverName, { user: 'importer1' } );
		return { success: true, data: { souvenirs: souvenirs } };
	}
}
module.exports.Connector = ConnectorImporterMessenger;
