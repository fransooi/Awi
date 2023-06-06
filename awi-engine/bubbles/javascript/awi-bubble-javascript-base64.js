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
* @file awi-bubble-generic-bin.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Bin command: convert to binary
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleProgrammingBase64 extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Base64';
		this.token = 'base64';
		this.classname = 'programming';
		this.properties.action = 'converts an image to Base 64 Ascii code';
		this.properties.inputs = [ { userInput: 'the path or filter to the image', type: 'string' } ];
		this.properties.outputs = [ { base64: 'the image converted to base64', type: 'string.base64' } ];
		this.properties.brackets = true;
		this.properties.tags = [ 'programming' ];
	}
	async play( line, parameters, control )
	{
		super.play( line, parameters, control );

		var self = this;
		async function convert( path )
		{
			var image = await self.awi.system.readFile( path, 'base64' );
			if ( image.success )
			{
				var mime = self.awi.utilities.getMimeType( path );
				var result = 'data:[' + mime + ';base64,' + image.data;
				self.awi.editor.print( self, result.split( '\n' ), { user: 'code' } );
				return { success: true, data: result }
			}
			return image;
		}
		if ( /^\d+$/.test( parameters.userInput ) )
		{
			var files = this.branch.getLastData( this, 'fileList' );
			if ( files && files.length > 0 )
			{
				var number = parseInt( parameters.userInput ) - 1;
				if ( number >= 0 && number < files.length )
				{
					return convert( files[ number ].path );
				}
				return { success: false, error: 'awi:not-found:iwa' };
			}
		}
		var path = this.awi.utilities.normalize( parameters.userInput )
		var answer = await this.awi.system.exists( path );
		if ( answer.success )
			return convert( files[ 0 ].path );

		var type = this.awi.system.getFileType( parameters.userInput );
		if ( type != 'image' )
			return { success: false, error: 'awi:not-an-image:iwa' };
		var paths = this.awi.system.getPaths( type );
		var answer = await this.awi.system.findFile( paths, parameters.userInput, { } );
		if ( !answer.success || answer.data.length == 0 )
			return { success: false, error: 'awi:not-found:iwa' };

		var files = answer.data;
		if ( files.length == 1 )
			return convert( files[ 0 ].path );

		this.awi.editor.print( control.editor, [ 'You can convert these files: ' ], { user: 'information' } );
		var result = [];
		for ( var f = 0; f < files.length; f++ )
			result.push( ( f + 1 ) + '. ' + files[ f ].path );
		this.awi.editor.print( control.editor, result, { user: 'information' } );
		var param = await this.awi.prompt.getParameters( control.editor, [
			{ choice: 'Please enter a number between 1 and ' + files.length, type: 'number', interval: [ 1, files.length ], optional: false, default: 0 },
			], control );
		if ( param.success )
			return convert( files[ param.data.choice - 1 ].path );
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
module.exports.Bubble = BubbleProgrammingBase64;
