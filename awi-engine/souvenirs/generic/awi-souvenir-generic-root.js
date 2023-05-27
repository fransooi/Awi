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

class SouvenirGenericRoot extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Root';
		this.token = 'root';
		this.classname = 'generic';
		this.properties.action = "root of a branch of souvenirs";
		this.properties.inputs = [
			{ userInput: 'what to find in the chain', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { rootInfo: 'what was found', type: 'object.rootInfo' } ];
		this.properties.tags = [ 'souvenir', 'root' ];
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
		this.awi.editor.print( this, 'Root souvenir, parent: ' + this.parent + '.', { user: 'memory3' } );
		this.awi.editor.print( this, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {
				rootInfo: {
					senderName: this.parameters.senderName,
					receiverName: this.parameters.receiverName,
			} } };
	}
	async findSouvenirs( line, parameters, control )
	{
		return {
			success: 'found',
			data: {
				rootInfo: {
					senderName: this.parameters.senderName,
					receiverName: this.parameters.receiverName,
			} } };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericRoot;
