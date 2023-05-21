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
* @file awi-connector-importers-video.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Import video content: srt
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorImporterVideo extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Video importer';
		this.token = 'video';
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
		var destinationPath = this.awi.config.getDataPath() + '/digested/audios/' + this.awi.utilities.parse( path ).name + '.mp3';	
		this.awi.editor.print( this, 'Extracting audio from ' + path + '.', { user: 'importer1' } )
		var answer = await this.awi.system.extractAudio( path, destinationPath, {} );
		if ( answer.success )
		{
			var importer = this.awi.getConnector( 'importers', 'audio', {} );
			return await importer.import( destinationPath, senderName, { typeMemory: 'videos', typeSouvenir: 'video' } ); 
		}
		return answer;
	}
}
module.exports.Connector = ConnectorImporterVideo;
