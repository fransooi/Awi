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
* @file awi-bubble-awi-run.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Run command: run an executable in the current system connector
*
*/
var awibubbles = require( '../awi-bubbles' )

class BubbleAwiRun extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );

		this.name = 'Run';
		this.token = 'run';
		this.classname = 'awi';
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
			var fileList = this.bulb.getLastData( this, 'fileList' );
			if ( fileList && fileList.length > 0 )
			{
				var number = parseInt( parameters.userInput ) - 1;
				if ( number >= 0 && number < fileList.length )
				{
					var path = fileList( number );
					var ext = this.awi.utilities.extname( path ).toLowerCase();
					if ( this.awi.system.isFileOfType( 'executable', ext ).success )
						return await this.awi.system.run( path, {} );
					return { success: false, error: 'awi:not-aoz-file:iwa', error1: path }
				}
			}
		}
		var ext = this.awi.utilities.extname( parameters.userInput ).toLowerCase();
		if ( ext.length > 0 && this.awi.system.isFileOfType( 'executable', ext ).success && this.awi.system.exists( parameters.userInput ).success )
			return await this.awi.system.run( parameters.userInput, {} );
		else
		{
			var answer = await this.awi.system.findFile( 'executable', parameters.userInput, {} );
			if ( !answer.success )
				return answer;
			var files = answer.data;
			if ( files.length == 1 )
				return await this.awi.system.run( files[ 0 ].path, { commandLine: '' } );
			var result = [];
			this.awi.editor.print( this, [ 'I have found these applications:' ], { user: 'information' } );
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
				return await this.awi.system.run( files[ param.data.userInput - 1 ].path, { commandLine: '' } );
 			return param;
		}	
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
module.exports.Bubble = BubbleAwiRun;
