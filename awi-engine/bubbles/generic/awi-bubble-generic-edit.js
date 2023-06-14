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
* @file awi-bubble-generic-play.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Play command: play a media file in the current editor
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericEdit extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Edit';
		this.token = 'edit';
		this.classname = 'generic';
		this.properties.action = 'edit a file';
		this.properties.inputs = [
			{ file: 'the file to edit', type: 'string' },
			{ date: 'the date when the file was created', type: 'string', optional: true },
			{ time: 'the time when the file was created', type: 'string', optional: true },
			{ input: 'description of the content to search for', type: 'string', optional: true },
			];
		this.properties.outputs = [ { files: 'the last list of files', type: 'path.string.array' },
									{ fileEdited: 'the last file to be ran', type: 'path' } ];
		this.properties.parser = {
			verb: [ 'edit', 'modify', 'change', 'correct' ],
			file: [], date: [], time: [], input: [] };
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		var self = this;
		async function playIt( file, files )
		{
			var play = await self.awi.system.playFile( file, 'edit', control );
			if ( play.success )
			{
				if ( typeof files != 'undefined' )
					return { success: true, data: { files: files, fileEdited: file } };
				return { success: true, data: { fileEdited: file } };
			}
		}

		await super.play( line, parameters, control );
		if ( /^\d+$/.test( line ) )
		{
			var files = this.branch.getLastData( this, 'files' );
			if ( files && files.length > 0 )
			{
				var number = parseInt( line ) - 1;
				if ( number >= 0 && number < files.length )
					return await playIt( files[ number ] );
				return { success: false, error: 'awi:not-found:iwa' };
			}
		}
		var answer = await this.awi.system.findFiles( line, parameters, control );
		if ( !answer.success )
			return { success: false, error: 'awi:not-found:iwa' };

		if ( answer.success === '1' )
			return await playIt( answer.data[ 0 ], answer.data );

		var result = [];
		this.awi.editor.print( control.editor, [ 'You can edit these files: ' ], { user: 'information' } );
		for ( var f = 0; f < answer.data.length; f++ )
			result.push( ( f + 1 ) + '. ' + answer.data[ f ].path );
		this.awi.editor.print( control.editor, result, { user: 'information' } );
		var param = await this.awi.prompt.getParameters( [
			{ choice: 'Please enter a number between 1 and ' + answer.data.length, type: 'number', interval: [ 1, answer.data.length ], optional: false, default: 0 },
			], control );
		if ( param.success )
			return await playIt( answer.data[ param.data.choice - 1 ], answer.data );
		return answer;
	}
	async playback( line, parameters, control )
	{
		return await super.playback( line, parameters, control );
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
}
module.exports.Bubble = BubbleGenericEdit;
