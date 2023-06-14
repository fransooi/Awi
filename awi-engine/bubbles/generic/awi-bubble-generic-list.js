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
* @file awi-bubble-generic-find.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Find command: find files in the registered users directories
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericList extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'List';
		this.token = 'list';
		this.classname = 'generic';
		this.properties.action = 'list files in the registered user directories or any directory';
		this.properties.inputs = [
			{ file: 'the file(s) to find', type: 'string' },
			{ date: 'the date when the file was created', type: 'string', optional: true },
			{ time: 'the time when the file was created', type: 'string', optional: true },
			{ input: 'description of the content to search for', type: 'string', optional: true },
			];
		this.properties.outputs = [ { files: 'the last list of files', type: 'file.array' } ];
		this.properties.parser = { verb: [ 'list' ], file: [],	date: [], time: [], input: []	};
		this.properties.select = [ [ 'verb' ] ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var answer = await this.awi.system.findFiles( line, parameters, control );
		if ( !answer.success )
			return { success: false, error: 'awi:not-found:iwa' };

		var files = answer.data;
		var result = [];
		for ( var f = 0; f < answer.data.length; f++ )
			result.push( ( f + 1 ) + '. ' + answer.data[ f ].path );
		this.awi.editor.print( control.editor, result, { user: 'information' } );
		return { success: true, data: { files: files } };
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
module.exports.Bubble = BubbleGenericList;
