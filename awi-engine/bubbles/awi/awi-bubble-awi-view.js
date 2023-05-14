/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal 
* (_)|___|  |____|\__/\__/  [_||_]  \     Assistant
*
* This file is open-source under the conditions contained in the 
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-bubble-awi-view.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short View command: view a media file in the current editor
*
*/
var awibubbles = require( '../awi-bubbles' );

class BubbleAwiView extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'View';
		this.token = 'view';
		this.classname = 'awi';
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
			var fileList = this.bulb.getLastData( this, 'fileList' );
			if ( fileList && fileList.length > 0 )
			{
				var number = parseInt( parameters.userInput ) - 1;
				if ( number >= 0 && number < fileList.length )
				{
					var path = fileList( number );
					return await this.awi.editor.viewFile( path, { } );
				}
			}
		}
		if ( this.awi.system.exists( parameters.userInput ).success )
		{
			return await this.awi.editor.viewFile( parameters.userInput, { } );
		}
		var files = await this.awi.system.findFile( this, parameters.userInput, { wantPath: true, intention: 'view' } );
		files = files.data;
		if ( files.length == 1 )
		{
			return await this.awi.editor.viewFile( files[ 0 ], { } );
		}
		this.awi.editor.print( this, [ 'You can view these files: ' ], { user: 'information' } );
		var result = [];
		for ( var f = 0; f < files.length; f++ )
			result.push( ( f + 1 ) + '. ' + files[ f ] );
		this.awi.editor.print( this, result, { user: 'information' } );
		var param = await this.awi.prompt.getParameters( [ { choice: 'Please enter the number of the file to display, from 1 to ' + files.length, type: 'number', interval: [ 1, files.length ] } ] );
		if ( param.success )
		{
			return this.awi.editor.viewFile( files[ param.data.choice ], { } );
		}
		return answer;
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
module.exports.Bubble = BubbleAwiView;
