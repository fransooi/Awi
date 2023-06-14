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
* @file awi-connector-importers-audio.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Import audio file content
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorImporterAudio extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Audio importer';
		this.token = 'audio';
		this.classname = 'importer';
		this.version = '0.2';
	}
	async connect( options )
	{
		super.connect( options );
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}
	async import( path, senderName, control = {} )
	{
		this.awi.editor.print( control.editor, 'Transcripting audio to text from file ' + path + '.', { user: 'importer1' } )
		var transcription = await this.awi.client.createTranscription( '', path, { response_format: 'srt' } );
		if ( transcription.success )
		{
			var stats = await this.awi.system.stat( path );
			stats = stats.data;
			var typeSouvenir = typeof control.typeSouvenir != 'undefined' ? control.typeSouvenir : 'audio';
			var numberOfSouvenirs = 0;

			// Convert SRT to array
			var lines = transcription.data.split( '\n' );
			var souvenirs = [];
			for ( var l = 0; l < lines.length; l++ )
			{
				var number = parseInt( lines[ l ] );
				if ( isNaN( number ) || number == 0 )
					break;
				var arrow = lines[ l + 1 ].indexOf( '-->' );
				var start = lines[ l + 1 ].substring( 0, arrow ).trim();
				var end = lines[ l + 1 ].substring( arrow + 3 ).trim();
				const regex = this.awi.time.getMediaRegex();
				start = this.awi.time.getTimestampFromMatches( this.awi.utilities.matchRegex( start, regex ) );
				end = this.awi.time.getTimestampFromMatches( this.awi.utilities.matchRegex( end, regex ) );
				var text = '';
				for ( var ll = 2; ll + l < lines.length; ll++ )
				{
					if ( !lines[ ll + l ] )
						break;
					text += lines[ ll + l ] + ' ';
				}
				var key = this.awi.utilities.getUniqueIdentifier( {}, typeSouvenir, Math.floor( Math.random() * 100 ) );
				var souvenir = new this.awi.newSouvenirs.generic[ typeSouvenir ]( this.awi, { key: key, parent: '', parameters:
				{
					senderName: senderName,
					receiverName: '',
					path: path,
					text: text,
					date: this.awi.time.getTimestampFromStats( stats ),
					start: start,
					end: end
				} } );
				souvenirs.push( souvenir );
				numberOfSouvenirs++;
				l += ll;
				this.awi.editor.print( control.editor, 'From: ' + start.text + ' to ' + end.text , { user: 'importer3' } )
				this.awi.editor.print( control.editor, text, { user: 'importer3' } )
				this.awi.editor.print( control.editor, '--------------------------------------------------------------------------------', { user: 'importer3' } )
			}
			this.awi.editor.print( control.editor, 'Number of lines: ' + numberOfSouvenirs , { user: 'importer2' } )
			return { success: true, data: { souvenirs: souvenirs } };
		}
		return transcription;
	}
}
module.exports.Connector = ConnectorImporterAudio;
