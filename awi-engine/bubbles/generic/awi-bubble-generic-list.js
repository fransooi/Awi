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
* @version 0.2
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
		this.properties.inputs = [ { userInput: 'the name of the file to find, wildcards allowed', type: 'string' } ];
		this.properties.outputs = [ { fileList: 'the list of file information', type: 'path.array' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'system', 'file' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		if ( parameters.userInput )
		{
			var type = this.awi.system.getFileType( parameters.userInput );
			var paths = this.awi.system.getPaths( type, parameters.userInput );
			var answer = await this.awi.system.findFile( paths, parameters.userInput, { } );
			if ( !answer.success || answer.data.length == 0 )
				return { success: false, error: 'awi:not-found:iwa' };
			var files = answer.data;
			var result = [];
			if ( files.length > 0 )
			{
				this.awi.editor.print( this, [ 'I have found the following files:' ], { noJustify: true, user: 'information' } );
				for ( var l = 0; l < files.length; l++ )
					result.push( ( l + 1 ) + '. ' + files[ l ].path );
				this.awi.editor.print( this, result, { noJustify: true, user: 'information' } );
				return { success: true, data: files };
			}
		}
		return { success: false, error: 'awi:no-files-found:iwa' };
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
