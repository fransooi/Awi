/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \      / ][   ]       Programmable
*     _/ /   \ \_\  \/ \/  / |  |        Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_]      link:
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-aozruntime-server.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Configuration management
*
*/
class Connector
{
	constructor( awi, options = {} )
	{
		this.awi = awi;
		this.options = options;
		this.version = '0.1';
		this.oClass = 'connector';
	}
	async connect( /*options*/ )
	{
		this.connectAnswer =
		{
			success: true,
			data:
			{
				name: this.name,
				classname: this.classname,
				prompt: this.name + ' connector version ' + this.version, version: this.version
			}
		}
		return this.connectAnswer;
	}
}
module.exports.Connector = Connector;
