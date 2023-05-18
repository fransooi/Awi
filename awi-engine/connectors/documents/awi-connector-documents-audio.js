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
* @file awi-connector-documents-audio.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Future connector to Audio documents
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorDocumentAudio extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'audio';
		this.name = 'Audio Files';
		this.classname = 'document';
	}
	close()
	{

	}
	async connect( options )
	{
		return super.connect( options );
	}
}
module.exports.Connector = ConnectorDocumentAudio;
