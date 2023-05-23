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
* @version 0.2
*
* @short Memory error bulb
*
*/
var awimemory = require( '../awi-memory' );

class MemoryAwiError extends awimemory.Memory
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
	async play( line, parameter, control )
	{
		super.play( line, parameter, control );
		return { success: true, data: [] }
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Memory = MemoryAwiError;
