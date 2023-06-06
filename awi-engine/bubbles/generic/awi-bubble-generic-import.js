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
* @file awi-bubble-generic-import.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Import command: import a file in the current project through the current editor connector
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericImport extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Import';
		this.token = 'import';
		this.classname = 'generic';
		this.properties.action = 'import assets in the designated folder of the application';
		this.properties.inputs = [ { userInput: 'the name or number of the asset to import', type: 'string' } ];
		this.properties.outputs = [ { importedPath: 'the path to the asset', type: 'path' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'programming', 'assets' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var self = this;
		async function importFile( path )
		{
			var answer = await self.awi.language.import( path );
			if ( answer.success )
				self.awi.editor.print( this, [ 'File successfully imported to: ' + path ], { user: 'information' } );
			else
				self.awi.editor.print( this, [ 'Cannot import file : ' + path ], { user: 'error' } );
			return answer;
		}
		if ( /^\d+$/.test( parameters.userInput ) )
		{
			var fileList = this.branch.getLastData( this, 'fileList' );
			if ( fileList && fileList.length > 0 )
			{
				var number = parseInt( parameters.userInput ) - 1;
				if ( number >= 0 && number < fileList.length )
				{
					var path = fileList[ number ].path;
					return await importFile( path );
				}
				return { success: false, error: 'awi:cancelled:iwa' };
			}
			return { success: false, error: 'awi:no-file-list-found:iwa' };
		}
		var answer = await this.awi.language.getImportPaths();
		var importPaths = answer.data;
		answer = await this.awi.system.findFile( importPaths.toScan, parameters.userInput, { filters: [ '*.*' ] } );
		var files = this.awi.utilities.removeDuplicatesFromFiles( answer.data );
		if ( files.length == 0 )
		{
			this.awi.editor.print( control.editor, [ 'No asset found with that name...' ], { user: 'information' } );
			return { success: false, error: 'awi:no-file-list-found:iwa' };
		}
		if ( files.length == 1 )
			return await importFile( files[ 0 ].path );
		var result = [];
		this.awi.editor.print( control.editor, [ 'I have found these assets:' ], { user: 'information' } );
		for ( var l = 0; l < files.length; l++ )
			result.push( ( l + 1 ) + '. ' + files[ l ].name );
		this.awi.editor.print( control.editor, result, { user: 'information' } );
		var param = await this.awi.prompt.getParameters( [ {
			token: 'input',
			classname: 'generic',
			parameters: [ { name: 'choice',	description: 'Please enter a number between 1 and ' + files.length, type: 'number',	interval: [ 1, files.length ] } ],
			options: { }
		} ], control );
		if ( param.success )
			return await importFile( files[ param.data.userInput - 1 ].path );
		return { success: false, error: 'awi:cancelled:iwa', data: {} };
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
module.exports.Bubble = BubbleGenericImport;
