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
* @file awi-souvenir-awi-photo.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Photo souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericPhoto extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Photo Souvenir Bubble';
		this.token = 'photo';
		this.classname = 'generic';
		this.properties.action = 'remembers one photo';
		this.properties.inputs = [
			{ userInput: 'what to find in the photo', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { photoInfo: 'what was found', type: 'object.photoInfo', default: false } ];
		this.properties.tags = [ 'souvenir', 'photo' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		var info = this.awi.utilities.compareTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
		{
			var content = await this.getContent( line, parameters, control );
			return { success: 'found', data: { result: info.result, match: info, content: content.data.photoInfo } };
		}
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( control.editor, this.parameters.text, { user: 'memory3' } );
		this.awi.editor.print( control.editor, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {
				photoInfo: {
					receiverName: this.parameters.receiverName,
					path: path,
					text: text,
					date: this.awi.utilities.getTimestampFromStats( stats )
				} } };
	}
	async findSouvenirs( line, parameters, control )
	{
		var info = this.awi.utilities.matchTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
			return await this.getContent( line, parameters, control );
		return { success: 'notfound' };
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirGenericPhoto;
