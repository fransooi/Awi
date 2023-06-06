/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][   ]       Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_] \     link:
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-memory-awi-error.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Memory error branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericError extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Memory Error Handling';
		this.token = 'error';
		this.classname = 'generic';
		this.properties.action = "handle Alzheinmer?";
		this.properties.inputs = [ ],
		this.properties.outputs = [ ];
		this.properties.subTopics.push( ...[ 'memory', 'error' ] );
		this.properties.tags = [ 'memory', 'error' ];
	}
	async extractContent( line, parameters, control )
	{
	}
	async getContent( line, parameters, control )
	{
	}
	async findSouvenirs( line, parameters, control )
	{
	}
	async play( line, parameter, control )
	{
	}
	async playback( line, parameter, control )
	{
	}
	async transpile( line, parameter, control )
	{
	}
}
module.exports.Memory = MemoryGenericError;
