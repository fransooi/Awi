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

		control.minimumTextLength = ( typeof control.minimumTextLength == 'undefined' ? 20 : control.minimumTextLength );
		control.from = ( typeof control.from == 'undefined' ? 'from inbox' : control.from );
		var answer = await this.awi.utilities.loadIfExist( path, { encoding: 'utf8' } );
		var html = answer.data;
		if ( !html )
			return answer;

		var souvenirs = [];
		var receiverName = '';
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
			var date;
			var currentName = '';
			var currentText = '';
			var self = this;
			function saveMemories()
			{
				var senderText = self.awi.utilities.removeDuplicatedLines( self.awi.system.decodeText( texts.sender ) );
				var receiverText = self.awi.utilities.removeDuplicatedLines( self.awi.system.decodeText( texts.receiver ) );
				if ( senderText.length >= control.minimumTextLength || receiverText.length >= control.minimumTextLength )
				{
					var nWordsSender = senderText.split( ' ' ).length;
					var nWordsReceiver = receiverText.split( ' ' ).length;
					self.awi.editor.print( self, senderName + ' said: ' + senderText, { user: 'importer2' } );
					self.awi.editor.print( self, receiverName + ' said: ' + receiverText, { user: 'importer2' } );
					var text = [
						' - ' + nWordsSender + nWordsReceiver + ' words,',
						' - ' + videos.length + ' video' + ( videos.length < 2 ? ',' : 's,' ),
						' - ' + audios.length + ' audio clip' + ( audios.length < 2 ? ',' : 's,' ),
						' - ' + images.length + ' image' + ( images.length < 2 ? ',' : 's,' ),
						' - ' + links.length + ' link' + ( links.length < 2 ? '.' : 's.' ),
					];
					self.awi.editor.print( self, text, { user: 'importer3' } );
					self.awi.editor.print( self, '---------------------------------------------------------' , { user: 'importer2' } );
					var souvenir = new self.awi.newSouvenirs.generic.message( self.awi,
					{
						key: self.awi.utilities.getUniqueIdentifier( {}, 'souvenir_messenger', Math.floor( Math.random() * 1000000 ), '', 5, 5 ),
						parent: '',
						parameters:
						{
							path: path,
							senderName: senderName,
							receiverName: receiverName,
							date: date,
							senderText: senderText,
							receiverText: receiverText,
							videos: videos,
							audios: audios,
							images: images,
							links: links
						}
					} );
					souvenirs.push( souvenir );
				}
				texts = { sender: '', receiver: '' };
				videos = [];
				audios = [];
				images = [];
				photos = [];
				links = [];
				date = { time: 0, text: '', info: {} }
			}
			for ( var d = 0; d < data.length; d++ )
			{
				var startLine;
				var fromTo = data[ d ][ data[ d ].length - 1 ];
				for ( var dd = 0; dd < data[ d ].length; dd++ )
				{
					var line = data[ d ][ dd ];
					if ( line.charAt( 0 ) != '<' )
					{
						var code = line.split( ' ' ).join( '' ).toLowerCase();
						if ( code != receiverNameCompressed )
							continue;
						receiverName = line;
						startLine = d;
						break;
					}
				}
				for ( var dd = data[ d ].length - 2; dd > startLine; dd-- )
				{
					var line = data[ d ][ dd ];

					const regex = this.awi.time.getDateRegex();
					var found = this.awi.utilities.matchRegex( line, regex );
					if ( found )
					{
						date = this.awi.time.getDatestampFromMatches( found );
						continue;
					}
					if ( line == receiverName || line == senderName )
					{
						if ( line == senderName )
							currentName = 'sender';
						else
							currentName = 'receiver';
						texts[ currentName ] = currentText;
						currentText = '';
						if ( texts.sender && texts.receiver )
							saveMemories();
						continue;
					}
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
						if ( text )
						{
							currentText += text + ' ';
						}
					}
				}
			}
			saveMemories();
			if ( souvenirs.length > 0 )
				this.awi.editor.print( control.editor, 'Imported conversation with ' + receiverName, { user: 'importer1' } );
		}
		return { success: true, data: { souvenirs: souvenirs } };
	}
}
module.exports.Connector = ConnectorImporterMessenger;
