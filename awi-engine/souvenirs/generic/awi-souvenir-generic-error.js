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
* @file awi-souvenir-awi-error.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Souvenir error bubble
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericError extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Souvenir Error Handling';
		this.token = 'error';
		this.classname = 'generic';
		this.properties.action = "handle errors in souvenir chains";
		this.properties.inputs = [
			{ userInput: 'what the user wanted to find', type: 'string', optional: true },
			{ from: 'the kind+ of things he was looking for', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { errorInfo: 'what to do next', type: 'object.errorInfo' } ];
		this.properties.tags = [ 'souvenir', 'error' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( this, 'Error souvernir!', { user: 'memory3' } );
		this.awi.editor.print( this, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {
				errorInfo: {
					line: line,
					userInput: parameters.userInput,
					from: parameters.from,
					control: control
				} } };
	}
	async findSouvenirs( line, parameters, control )
	{
		return { success: 'notfound' };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericError;
