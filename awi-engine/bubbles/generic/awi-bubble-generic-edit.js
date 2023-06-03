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
* @version 0.2
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
		this.properties.action = 'a file file';
		this.properties.inputs = [ { userInput: 'the name of the file to edit', type: 'string' } ];
		this.properties.outputs = [ { fileEdited: 'the last file edited', type: 'path' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'editor', 'media' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		if ( /^\d+$/.test( parameters.userInput ) )
		{
			var files = this.branch.getLastData( this, 'fileList' );
			if ( files && fileList.length > 0 )
			{
				var number = parseInt( parameters.userInput ) - 1;
				if ( number >= 0 && number < files.length )
				{
					var type = this.awi.system.getFileType( files[ number ].path );
					return await this.awi.system.playFile( files[ number ].path, type, 'edit', { } );
				}
				return { success: false, error: 'awi:not-found:iwa' };
			}
		}
		var path = this.awi.utilities.normalize( parameters.userInput )
		var answer = await this.awi.system.exists( path );
		if ( answer.success )
			return this.awi.system.playFile( path, type, 'edit', { } );

		var type = this.awi.system.getFileType( parameters.userInput );
		var paths = this.awi.system.getPaths( type );
		var answer = await this.awi.system.findFile( paths, parameters.userInput, { } );
		if ( !answer.success || answer.data.length == 0 )
			return { success: false, error: 'awi:not-found:iwa' };

		var files = answer.data;
		if ( files.length == 1 )
			return await this.awi.system.playFile( files[ 0 ].path, type, 'edit', { } );

		var result = [];
		this.awi.editor.print( this, [ 'I have found these files to edit:' ], { user: 'information' } );
		for ( var l = 0; l < files.length; l++ )
			result.push( ( l + 1 ) + '. ' + files[ l ].name );
		this.awi.editor.print( this, result, { user: 'information' } );
		var param = await this.awi.prompt.getParameters( [
			{ choice: 'Please enter a number between 1 and ' + files.length, type: 'number', interval: [ 1, files.length ], optional: false, default: 0 },
			] );
		if ( param.success )
			return await this.awi.system.playFile( files[ param.data.choice - 1 ].path, type, 'edit', { } );
		return param;
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
