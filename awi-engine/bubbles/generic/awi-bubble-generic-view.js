/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal
* (_)|___|  |____|\__/\__/  [_| |_] \     Assistant
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-bubble-generic-view.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short View command: view a media file in the current editor
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericView extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'View';
		this.token = 'view';
		this.classname = 'generic';
		this.properties.action = 'display the content of a file';
		this.properties.inputs = [ { userInput: 'the name of the file to display', type: 'string' } ];
		this.properties.outputs = [ { viewedPath: 'the last viewed file', type: 'path' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'programming', 'assets' ];
	}
	async play( line, parameters, control )
	{
		super.play( line, parameters, control );
		if ( /^\d+$/.test( parameters.userInput ) )
		{
			var files = this.branch.getLastData( this, 'fileList' );
			if ( files && files.length > 0 )
			{
				var number = parseInt( parameters.userInput ) - 1;
				if ( number >= 0 && number < files.length )
				{
					var type = this.awi.system.getFileType( files[ number ].path );
					return await this.awi.system.playFile( files[ number ].path, type, 'view', { } );
				}
				return { success: false, error: 'awi:not-found:iwa' };
			}
		}
		var path = this.awi.utilities.normalize( parameters.userInput )
		var answer = await this.awi.system.exists( path );
		if ( answer.success )
			return await this.awi.system.playFile( files[ 0 ].path, type, 'view', { } );

		var type = this.awi.system.getFileType( parameters.userInput );
		var paths = this.awi.system.getPaths( type );
		var answer = await this.awi.system.findFile( paths, parameters.userInput, { } );
		if ( !answer.success || answer.data.length == 0 )
			return { success: false, error: 'awi:not-found:iwa' };

		var files = answer.data;
		if ( files.length == 1 )
			return await this.awi.system.playFile( files[ 0 ].path, type, 'view', { } );

		this.awi.editor.print( control.editor, [ 'You can view these files: ' ], { user: 'information' } );
		var result = [];
		for ( var f = 0; f < files.length; f++ )
			result.push( ( f + 1 ) + '. ' + files[ f ].path );
		this.awi.editor.print( control.editor, result, { user: 'information' } );
		var param = await this.awi.prompt.getParameters( [
			{ choice: 'Please enter a number between 1 and ' + files.length, type: 'number', interval: [ 1, files.length ], optional: false, default: 0 },
			], control );
		if ( param.success )
			return await this.awi.system.playFile( files[ param.data.choice - 1 ].path, type, 'view', { } );
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
module.exports.Bubble = BubbleGenericView;
