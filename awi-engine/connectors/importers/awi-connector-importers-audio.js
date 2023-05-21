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
* @version 0.2
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
	async import( path, senderName, options = {} )
	{		
		this.awi.editor.print( this, 'Transcripting audio to text from file ' + path + '.', { user: 'importer1' } )
		var transcription = await this.awi.client.createTranscription( '', path, { response_format: 'srt' } );
		if ( transcription.success )
		{
			var stats = await this.awi.system.stat( path );
			stats = stats.data;
			var typeMemory = typeof options.typeMemory != 'undefined' ? options.typeMemory : 'audios';
			var typeSouvenir = typeof options.typeSouvenir != 'undefined' ? options.typeSouvenir : 'audio';
			var memory = new this.awi.newMemories.awi[ typeMemory ]( this.awi, [], {} );
			memory.parameters = { senderName: senderName, path: path, stats: stats };		
			var numberOfSouvenirs = 0;

			// Convert SRT to array
			var lines = transcription.data.split( '\n' );
			var data = [];
			for ( var l = 0; l < lines.length; l++ )
			{
				var number = parseInt( lines[ l ] );
				if ( isNaN( number ) || number == 0 )
					break;
				var arrow = lines[ l + 1 ].indexOf( '-->' );
				var start = lines[ l + 1 ].substring( 0, arrow ).trim();
				var end = lines[ l + 1 ].substring( arrow + 3 ).trim();
				const regex = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/;
				start = this.awi.utilities.getMediaTimestamp( this.awi.utilities.matchRegex( start, regex ) );
				end = this.awi.utilities.getMediaTimestamp( this.awi.utilities.matchRegex( end, regex ) );
				var text = '';
				for ( var ll = 2; ll + l < lines.length; ll++ )
				{
					if ( !lines[ ll + l ] )
						break;
					text += lines[ ll + l ] + ' ';
				}
				memory.addSouvenir( 
				{ 
					token: typeSouvenir, 
					classname: 'awi',
					parameters: 
					{
						text: text,
						start: start,
						end: end,
					},
					options: {}, 
					onSuccess: {}, 
					onError: '' 
				}, [], {} );	
				numberOfSouvenirs++;
				l += ll;
				this.awi.editor.print( this, 'From: ' + start.text + ' to ' + end.text , { user: 'importer3' } )
				this.awi.editor.print( this, text, { user: 'importer3' } )				
				this.awi.editor.print( this, '--------------------------------------------------------------------------------', { user: 'importer3' } )
			}
			this.awi.editor.print( this, 'Number of lines: ' + numberOfSouvenirs , { user: 'importer2' } )
			return { success: true, data: { memories: memory, numberOfMemories: 1, numberOfSouvenirs: numberOfSouvenirs } };
		}
		return answer;
	}
}
module.exports.Connector = ConnectorImporterAudio;
