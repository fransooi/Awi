/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal 
* (_)|____| |____|\__/\__/  [_||_]  \     Assistant
*
* This file is open-source under the conditions contained in the 
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-bubble-awi-find.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Find command: find files in the registered users directories
*
*/
var awibubbles = require( '../awi-bubbles' )

class BubbleAwiFind extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Find';
		this.token = 'find';
		this.classname = 'awi';
		this.properties.action = 'find files in the registered user directories';
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
			var answer = await this.awi.language.getImportPaths();
			var importPaths = answer.data;
			answer = await this.awi.system.findFile( importPaths.toScan, parameters.userInput, { } );
			fileList = answer.data;
			var result = [];
			if ( fileList.length > 0 )
			{
				this.awi.editor.print( this, [ 'I have found the following files:' ], { noJustify: true, user: 'information' } );
				for ( var l = 0; l < fileList.length; l++ )
					result.push( ( l + 1 ) + '. ' + this.awi.utilities.removeBasePath( fileList[ l ].path, importPaths.toScan ) );		
				this.awi.editor.print( this, result, { noJustify: true, user: 'information' } );
				return { success: true, data: fileList };
			}
		}
		return { success: false, error: 'awi:no-files-found:iwa' };
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
	async undo( options )
	{
		super.undo( options );
	}
	async redo( options )
	{
		super.redo( options );
	}
}
module.exports.Bubble = BubbleAwiFind;
