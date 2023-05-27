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
* @file awi-memory-videos.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Video memory bulb
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericAudios extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'audios';
		this.classname = 'generic';
		this.name = 'Audio Souvenir Chain';
		this.properties.action = 'stores information about audio files';
		this.properties.inputs = [
			{ userInput: 'what to find in the audio file', type: 'string', optional: false, default: '' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'interval of time when the audio file was recorded', type: 'string', optional: false, default: 'any' },
		];
		this.properties.outputs = [ { audioFiles: 'found audio files', type: 'audioFile.object.array' } ];
		this.properties.tags = [ 'memory', 'audio' ];
	}
	async play( line, parameters, control )
	{
		if ( !parameters.interval )
			parameters.interval = 'any';
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return await super.extractContent( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		var answer = await super.getContent( line, parameters, control );
		if ( answer.success == 'found' )
		{
			this.awi.editor.print( this, 'Audio file: ' + answer.data.audioInfo.path, { user: 'memory2' } );
			this.awi.editor.print( this, 'Recorded on the: ' + answer.data.audioInfo.date, { user: 'memory2' } );
			this.awi.editor.print( this, '', { user: 'memory2' } );
		}
	}
	async findSouvenirs( line, parameters, control )
	{
		var answer = await super.findSouvenirs( line, parameters, control );
		if ( answer.success == 'found' )
		{
			var content = ( typeof answer.data.direct.content[ 0 ] == 'undefined' ? answer.data.indirect.content[ 0 ] : answer.data.direct.content[ 0 ] );
			this.awi.editor.print( this, 'Audio file: ' + content.audioInfo.path, { user: 'memory2' } );
			this.awi.editor.print( this, 'Recorded on the: ' + content.audioInfo.date.text, { user: 'memory2' } );
			this.awi.editor.print( this, '', { user: 'memory2' } );
					}
		return answer;
			}
	async playback( line, parameter, control )
				{
		super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericAudios;
