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
		
		options.minimumTextLength = ( typeof options.minimumTextLength == 'undefined' ? 20 : options.minimumTextLength );
		options.from = ( typeof options.from == 'undefined' ? 'from inbox' : options.from );
		var answer = await this.awi.utilities.loadIfExist( path, { encoding: 'utf8' } );
		var html = answer.data;
		if ( !html )
			return answer;

		var result = {};
		var numberOfSouvenirs = 0;
		var importing = '';
		var souvenirCount = 0;
		if ( options.result )
			result = options.result;
		result.memories = new this.awi.newMemories.awi.messenger( this.awi, [], {} );
		result.memories.parameters = { senderName: senderName, contactName: '', contactNameCompressed: receiverNameCompressed };
		if ( html )
		{
			var bodies = this.awi.utilities.explodeHtml( 'body', html, {} );
			var structure = this.awi.utilities.explodeHtml( 'div', bodies[ 0 ].text, { recursive: true } );
			var data = [];
			for ( var s = 0; s < structure.length; s++ )
			{
				data.push( this.awi.utilities.getFinalHtmlData( structure ) );
			}
			var conversations = { sender: [], receiver: [] };
			var texts = { sender: '', receiver: '' };
			var videos = [];
			var audios = [];
			var images = [];
			var photos = [];
			var links = [];
			var currentName = '';
			var receiverName = '';
			var self = this;
			var interval = { start: 0, end : 0 };
			function saveMemories()
			{
				function cleanText( text )
				{
					const regex = /([a-zA-Z\u00E9\u00E8\u00EA\u00EB\u00E0\u00E2\u00E4\u00F4\u00F6\u00FB\u00FC\u00E7]{3})\s(\d{1,2}),\s(\d{4})\s(\d{1,2}):(\d{2}):(\d{2})(am|pm|AM|PM)?/;
					var found = self.awi.utilities.matchRegex( text, regex );
					while ( found )
					{	
						var start = text.indexOf( found[ 0 ] );
						var c = text.charAt( start - 1 );
						if ( c != ' ' )
						{
							found[ 1 ] = c + found[ 1 ];
							found[ 0 ] = c + found[ 0 ];
						}
						var timestamp = self.awi.utilities.getTimestamp( found );
						if ( !interval.start )
							interval.start = timestamp;
						interval.end = timestamp;
						var start = text.indexOf( found[ 0 ] );
						var end = start + found[ 0 ].length;
						text = text.substring( 0, start ) + text.substring( end + 1 );
						found = self.awi.utilities.matchRegex( texts.sender, regex );
					}
					text = self.awi.utilities.removeDuplicatedLines( text );
					return text;
				}
				function extractStamp( text )
				{
					var start = {};
					var end = {};
					var filter = 'contient des données du ';
					var found = false;
					text = text.toLowerCase();
					if ( text.indexOf( filter ) == 0 )
					{
						var words = text.substring( filter.length ).split( ' ' );
						start.day = words[ 0 ];
						start.month = words[ 1 ];
						start.year = words[ 2 ].substring( 0, words[ 2 ].length - 1 );
						start.hours = words[ 3 ].substring( 0, words[ 3 ].indexOf( ':' ) );
						start.minutes = words[ 3 ].substring( words[ 3 ].indexOf( ':' ) + 1 );
						end.day = words[ 5 ];
						end.month = words[ 6 ];
						end.year = words[ 7 ].substring( 0, words[ 7 ].length - 1 )
						end.hours = words[ 8 ].substring( 0, words[ 8 ].indexOf( ':' ) );
						end.minutes = words[ 8 ].substring( words[ 8 ].indexOf( ':' ) + 1 );
						found = true;			
					}
					var filter = +'contains data from ';
					if ( text.indexOf( filter ) == 0 )
					{
						var words = text.substring( filter.length ).split( ' ' );
						start.month = words[ 0 ];
						start.day = words[ 1 ];
						start.year = words[ 2 ].substring( 0, words[ 2 ].length - 1 );
						start.hours = words[ 3 ].substring( 0, words[ 3 ].indexOf( ':' ) );
						start.minutes = words[ 3 ].substring( words[ 3 ].indexOf( ':' ) + 1 );
						end.month = words[ 5 ];
						end.day = words[ 6 ];
						end.year = words[ 7 ].substring( 0, words[ 7 ].length - 1 )
						end.hours = words[ 8 ].substring( 0, words[ 8 ].indexOf( ':' ) );
						end.minutes = words[ 8 ].substring( words[ 8 ].indexOf( ':' ) + 1 );
						found = true;
					}
					if ( found )
					{
						var matches = [ '_', start.month, start.day, start.year, start.hours, start.minutes, '00', '' ];
						var startStamp = self.awi.utilities.getTimestamp( matches, '1' );
						matches = [ '_', end.month, end.day, end.year, end.hours, end.minutes, '00', '' ];
						var endStamp = self.awi.utilities.getTimestamp( matches, '1' );
						return { startStamp: startStamp, endStamp: endStamp };
					}
					return null;
				}
				var conversation = '';
				var len = Math.max( conversations.sender.length, conversations.receiver.length );
				for ( var c = 0; c < len; c++ )
				{
					var sender = conversations.sender[ c ];
					var receiver = conversations.receiver[ c ];
					if ( typeof sender != 'undefined' && sender )
					{
						sender = cleanText( sender );
						if ( sender.length )
						{
							sender = self.awi.system.decodeText( sender )
							conversation += senderName + ' said: ' + sender + '\n';
						}
					}
					if ( typeof receiver != 'undefined' && receiver )
					{
						receiver = cleanText( receiver );
						if ( receiver.length )
						{
							receiver = self.awi.system.decodeText( receiver )
							conversation += receiverName + ' said: ' + receiver + '\n';
						}
					}
				}	

				var stamp;			
				for ( c = len - 1; c > 0; c-- )
				{
					var text = conversations.sender[ c ];
					if ( text )
					{
						stamp = extractStamp( text );
						if ( stamp )
							break;
					}
					text = conversations.receiver[ c ];
					if ( text )
					{
						stamp = extractStamp( text );
						if ( stamp )
							break;
					}
				}
				if ( !stamp )
					stamp = {};
				if ( conversation.length > options.minimumTextLength )
				{
					// Remove duplicated / empty lines
					if ( conversation.length > 10 )
					{
						self.awi.editor.print( self, 'Imported conversation with ' + receiverName, { user: 'importer1' } );
						var testLines = conversation.split( '\n' );
						var testWords = conversation.split( ' ' );
						var text = [
							' - ' + testLines.length + ' lines,',
							' - ' + testWords.length + ' words,',
							' - ' + videos.length + ' video' + ( videos.length < 2 ? ',' : 's,' ),
							' - ' + audios.length + ' audio clip' + ( audios.length < 2 ? ',' : 's,' ),
							' - ' + images.length + ' image' + ( images.length < 2 ? ',' : 's,' ),
							' - ' + links.length + ' link' + ( links.length < 2 ? '.' : 's.' ),
						];
						self.awi.editor.print( self, text, { user: 'importer2' } );
						self.awi.editor.print( self, conversation , { user: 'importer3' } );
						self.awi.editor.print( self, '---------------------------------------------------------' , { user: 'importer2' } );
						result.memories.addSouvenir( 
						{ 
							token: 'message', 
							parameters: 
							{
								conversation: conversation,
								videos: videos,
								audios: audios,
								images: images,
								images: photos,
								links: links,
								contactName: receiverName,
								interval: interval
							},
							startStamp: stamp.startStamp,
							endStamp: stamp.endStamp,
							classname: 'awi',
							options: {}, 
							onSuccess: {}, 
							onError: '' 
						}, [], {} );	
						souvenirCount++;
						numberOfSouvenirs++;		
					}
					conversations = { sender: [], receiver: [] };
					texts = { sender: '', receiver: '' };
					videos = [];
					audios = [];
					images = [];
					photos = [];
					links = [];
				}
			}
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
						result.memories.parameters.contactName = line;
						receiverName = line;
					}
					if ( line == receiverName )
						currentName = 'receiver';
					if ( line == senderName )
						currentName = 'sender';
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
							var text = this.awi.utilities.cleanLinks( content.line );
							if ( text == 'j' )
								debugger;
							if ( text )
							{
								var pos = Math.max( conversations.receiver.length, conversations.sender.length )
								conversations[ currentName ][ pos ] = text;
							}
						}
					}
				}
			}
			saveMemories();
		}
		return { success: true, numberOfSouvenirs: numberOfSouvenirs, data: result };
	}
}
module.exports.Connector = ConnectorImporterMessenger;
