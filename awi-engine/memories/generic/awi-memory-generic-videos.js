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
* @file awi-memory-awi-videos.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Video memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericVideos extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'videos';
		this.classname = 'generic';
		this.name = 'Videos Souvenir Chain';
		this.properties.action = 'stores information about one videos';
		this.properties.inputs = [
			{ userInput: 'what to find in the video', type: 'string', optional: false, default: '' },
			{ type: 'what type of content to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'interval of time when the video was taken', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [	{ videoInfos: 'the list of videos found', type: 'videoInfo.object.array' } ];
		this.properties.tags = [ 'memory', 'videos' ];
	}
	async play( line, parameters, control, nested )
	{
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
			this.awi.editor.print( control.editor, 'Video file: ' + answer.data.audioInfo.path, { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'Recorded on the: ' + answer.data.audioInfo.date, { user: 'memory2' } );
			this.awi.editor.print( control.editor, '', { user: 'memory2' } );
		}
	}
	async findSouvenirs( line, parameters, control )
	{
		var answer = await super.findSouvenirs( line, parameters, control );
		if ( answer.success == 'found' )
		{
			var content = ( typeof answer.data.direct.content[ 0 ] == 'undefined' ? answer.data.indirect.content[ 0 ] : answer.data.direct.content[ 0 ] );
			this.awi.editor.print( control.editor, 'Video file: ' + content.videoInfo.path, { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'Recorded on the: ' + content.videoInfo.date.text, { user: 'memory2' } );
			this.awi.editor.print( control.editor, '', { user: 'memory2' } );
		}
		return answer;
	}
	async playback( line, parameter, control )
	{
		return await super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericVideos;
