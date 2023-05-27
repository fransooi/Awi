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
* @file awi-souvenir-awi-audio.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Audio souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirGenericAudio extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Audio Souvenir Bubble';
		this.token = 'audio';
		this.classname = 'generic';
		this.properties.action = "remembers one audio file and it's content";
		this.properties.inputs = [
			{ userInput: 'what to find in the audio', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to look for', type: 'string', optional: true, default: 'any' } ];
		this.properties.outputs = [ { audioInfo: 'information about the audio file', type: 'object.audioInfo' } ];
		this.properties.tags = [ 'souvenir', 'audio' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		this.awi.editor.print( this, 'Text: ' + this.parameters.text, { user: 'memory3' } );
		this.awi.editor.print( this, 'Start: ' + this.parameters.start.text + ', end: ' + this.parameters.end.text, { user: 'memory3' } );
		this.awi.editor.print( this, '------------------------------------------------------------', { user: 'memory3' } );
		return {
			success: 'found',
			data: {	audioInfo: this.parameters }
		};
	}
	async extractContent( line, parameters, control )
	{
		var info = this.awi.utilities.compareTwoStrings( this.parameters.text, line, control );
		if ( info.result > 0 )
		{
			var content = await this.getContent( line, parameters, control );
			return { success: 'found', data: { result: info.result, match: info, content: content.data.audioInfo } };
		}
		return { success: 'notfound' };
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
module.exports.Souvenir = SouvenirGenericAudio;
