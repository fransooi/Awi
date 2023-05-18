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
* @file awi-connector-documents-website.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Future connector to download wesites
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorDocumentWebsite extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Website downloader';
		this.token = 'website';
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
module.exports.Connector = ConnectorDocumentWebsite;
