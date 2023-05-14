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
* @file awi-bubble-awi-play.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Play command: play a media file in the current editor
*
*/
var awibubbles = require( '../awi-bubbles' );

class BubbleAwiPlay extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Play';
		this.token = 'play';
		this.classname = 'awi';
		this.properties.action = 'play a media file';
		this.properties.inputs = [ { userInput: 'the name of the media file to play', type: 'string' } ];
		this.properties.outputs = [ { fileViewed: 'the last file played', type: 'path' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'editor', 'media' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		if ( /^\d+$/.test( parameters.userInput ) )
		{
			var fileList = this.bulb.getLastData( this, 'fileList' );
			if ( fileList && fileList.length > 0 )
			{
				var number = parseInt( parameters.userInput ) - 1;
				if ( number >= 0 && number < fileList.length )
				{
					var path = fileList[ number ];
					var answer = await this.awi.editor.playFile( path, { } );
					return answer;
				}
			}
		}
		if ( this.awi.system.exists( parameters.userInput ).success )
			return await this.awi.system.playFile( parameters.userInput, {} );
		else
		{
			var directories = this.awi.system.getPaths( 'assets' );
			var answer = await this.awi.system.findFile( directories, parameters.userInput, {} );
			if ( !answer.success )
				return answer;
			var files = answer.data;
			if ( files.length == 1 )
				return await this.awi.system.playFile( files[ 0 ].path, { commandLine: '' } );
			var result = [];
			this.awi.editor.print( this, [ 'I have found these files:' ], { user: 'information' } );
			for ( var l = 0; l < files.length; l++ )
				result.push( ( l + 1 ) + '. ' + files[ l ].name );
			this.awi.editor.print( this, result, { user: 'information' } );
			var param = await this.awi.prompt.getParameters( 
			[ { 
					token: 'input', 
					parameters: [ { name: 'choice', description: 'Please enter a number between 1 and ' + files.length, type: 'number', interval: [ 1, files.length ] } ], 
					options: {}, 
					onSuccess: {}, 
					onError: '' 
			} ] );			
			if ( param.success )
				return await this.awi.system.playFile( files[ param.data.userInput - 1 ].path, { commandLine: '' } );
 			return param;
		}
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
	async undo( options )
	{
		super.undo( callback, options );
	}
	async redo( options )
	{
		super.redo( options );
	}
}
module.exports.Bubble = BubbleAwiPlay;
