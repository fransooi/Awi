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
* @file awi-connector-importers-messenger.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
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
	async import( path, senderName, receiverNameCompressed, options = {} )
	{
		receiverNameCompressed = receiverNameCompressed.split( ' ' ).join( '' );
		
		options.minimumTextLength = ( typeof options.minimumTextLength == 'undefined' ? 50 : options.minimumTextLength );
		options.from = ( typeof options.from == 'undefined' ? 'from inbox' : options.from );
		var answer = await this.awi.utilities.loadIfExist( path, { encoding: 'utf8' } );
		var html = answer.data;
		if ( !html )
			return answer;

		var result = {};
		if ( options.result )
			result = options.result;
		result.directMemories = new this.awi.newMemories.awi.messenger( this.awi, [], 
		{
			action: 'stores a thread of messages on Messenger with ' + receiverName,
			concerns: [ senderName, receiverName ]
		} );
		if ( html )
		{
			var bodies = this.awi.utilities.explodeHtml( 'body', html, {} );
			var structure = this.awi.utilities.explodeHtml( 'div', bodies[ 0 ].text, { recursive: true } );
			var data = [];
			for ( var s = 0; s < structure.length; s++ )
			{
				data.push( this.awi.utilities.getFinalHtmlData( structure ) );
			}
			var texts = { sender: '', receiver: '' };
			var videos = [];
			var audios = [];
			var images = [];
			var photos = [];
			var links = [];
			var previousName = '';
			var currentName = '';
			var receiverName = '';
			for ( var d = 0; d < data.length; d++ )
			{
				for ( var dd = 0; dd < data[ d ].length; dd++ )
				{
					var line = data[ d ][ dd ];
					if ( receiverName == '' )
					{
						var code = line.split( ' ' ).join( '' ).toLowerCase();
						if ( code != receiverNameCompressed )
							continue;
						result.contactName = line;
						this.awi.editor.print( this, 'Importing conversation with ' + result.contactName + ' ' + options.from, { user: 'information' } )
						receiverName = line;
					}
					if ( line == receiverName )
						currentName = 'receiver';
					if ( line == senderName )
						currentName = 'sender';
				  	if ( currentName != previousName )
					{
						if ( texts[ 'sender' ].length >= options.minimumTextLength && texts[ 'receiver' ].length >= options.minimumTextLength )
						{
							const regex = [ /([a-zA-Z]{3})\s(\d{1,2}),\s(\d{4})\s(\d{1,2}):(\d{2}):(\d{2})(am|pm|AM|PM)?/ ];
							var interval = { start: 0, end : 0 };
							if ( this.awi.utilities.matchRegex( texts.sender, regex ) )
							{	
								var textArray = texts.sender.split( '\n' );
								texts.sender = '';
								for ( var t = 0; t < textArray.length; t++ )
								{
									var text = textArray[ t ];
									var timestamp = this.awi.utilities.matchRegex( text, regex );
									if ( timestamp )
									{
										timestamp = this.awi.utilities.getTimestamp( timestamp );
										if ( !interval.start )
											interval.start = timestamp;
										interval.end = timestamp;
									}
									else
									{
										texts.sender += text + '\n';
									}
								}
							}
							if ( this.awi.utilities.matchRegex( texts.receiver, regex ) )
							{	
								var textArray = texts.receiver.split( '\n' );
								texts.receiver = '';
								for ( var t = 0; t < textArray.length; t++ )
								{
									var text = textArray[ t ];
									var timestamp = this.awi.utilities.matchRegex( text, regex );
									if ( timestamp )
									{
										timestamp = this.awi.utilities.getTimestamp( timestamp );
										if ( !interval.start || timestamp.time < interval.start.time )
											interval.start = timestamp;
										if ( !interval.end || timestamp.time > interval.end.time )
											interval.end = timestamp;
									}
									else
									{
										texts.receiver += text + '\n';
									}
								}
							}
							result.directMemories.addSouvenir( 
							{ 
								token: 'message', 
								parameters: 
								{
									userText: texts[ 'sender' ].split( '\n' ).join( ' ' ),
									contactText: texts[ 'receiver' ].split( '\n' ).join( ' ' ),
									videos: videos,
									audios: audios,
									images: images,
									images: photos,
									links: links,
									topic: receiverName,
									interval: interval
								},
								classname: 'awi',
								options: {}, 
								onSuccess: {}, 
								onError: '' 
							}, [], {} );
							texts = { sender: '', receiver: '' };
							videos = [];
							audios = [];
							images = [];
							photos = [];
							links = [];
						}
						previousName = currentName;
					}
					if ( line != receiverName && line != senderName && currentName != '' )
					{
						line = line.trim();
						if ( line.length > 8 )
						{
							var content = this.awi.utilities.extractLinks( line );
							if ( content.found )
							{
								videos.push( ...content.videos );
								audios.push( ...content.audios );
								images.push( ...content.images );
								images.push( ...content.photos );
								links.push( ...content.links );
							}
							else
								texts[ currentName ] += line + '\n';
						}
					}
				}
			}
		}
		return { success: true, data: result };
	}
}
module.exports.Connector = ConnectorImporterMessenger;
