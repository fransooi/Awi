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
* @file awi-bubble-generic-run.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Run command: run an executable in the current system connector
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericRun extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );

		this.name = 'Run';
		this.token = 'run';
		this.classname = 'generic';
		this.properties.action = 'launch an application';
		this.properties.inputs = [ { userInput: 'the name of the application to run with its parameters', type: 'string' } ];
		this.properties.outputs = [ { runPath: 'the path to the application that was run', type: 'path' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'system', 'applications' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		if ( /^\d+$/.test( parameters.userInput ) )
		{
			var files = this.branch.getLastData( this, 'fileList' );
			if ( files && files.length > 0 )
			{
				var number = parseInt( parameters.userInput ) - 1;
				if ( number >= 0 && number < files.length )
				{
					var path = files[ number ].path;
					if ( this.awi.system.isFileOfType( path, 'executable' ) )
						return await this.awi.system.playFile( path, type, 'run', { } );
					return { success: false, error: 'awi:not-executable-file:iwa', error1: path }
				}
				return { success: false, error: 'awi:not-found:iwa' };
			}
		}
		var ext = this.awi.utilities.extname( parameters.userInput ).substring( 1 ).toLowerCase();
		if ( this.awi.system.getFileType( ext, 'executable' ).success )
		{
			if ( this.awi.system.exists( parameters.userInput ).success )
				return await this.awi.system.run( parameters.userInput, {} );
		}
		else
		{
			var type = this.awi.system.getFileType( parameters.userInput );
			var paths = this.awi.system.getPaths( type );
			var answer = await this.awi.system.findFile( paths, parameters.userInput, { } );
			if ( !answer.success || answer.data.length == 0 )
				return { success: false, error: 'awi:not-found:iwa' };

			var files = answer.data;
			if ( files.length == 1 )
				return await this.awi.system.playFile( files[ 0 ].path, type, 'run', { } );

			var result = [];
			this.awi.editor.print( control.editor, [ 'I have found these applications:' ], { user: 'information' } );
			for ( var l = 0; l < files.length; l++ )
				result.push( ( l + 1 ) + '. ' + files[ l ].name );
			this.awi.editor.print( control.editor, result, { user: 'information' } );
			var param = await this.awi.prompt.getParameters( [
				{ choice: 'Please enter a number between 1 and ' + files.length, type: 'number', interval: [ 1, files.length ], optional: false, default: 0 },
				], control );
			if ( param.success )
				return await this.awi.system.playFile( files[ param.data.choice - 1 ].path, type, 'run', { } );
			return param;
		}
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
module.exports.Bubble = BubbleGenericRun;
