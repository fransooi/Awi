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
* @file awi-bubble-javascript-code.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Code command: create a javascript function
*
*/
var awibubble = require( '../awi-bubble' )
var awimessages = require( '../../awi-messages' )

class BubbleJavascriptCode extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Code';
		this.token = 'code';
		this.classname = 'javascript';
		this.properties.action = 'writes an Aoz Basic procedure';
		this.properties.inputs = [
			{ codeName: 'the name of the procedure to create, the name should be meaningful.', type: 'string' },
			{ codeParameters: 'the list of parameters with meaningful names, separated by commas. If your function needs a callback, add it at the end...', type: 'string' },
			{ codeSteps: 'the various tasks the procedure should do, one per line.\nStay simple, in order not too many details...\nEmpty line to quit.', type: 'array.string' },
			{ codeReturn: 'what the procedure should return.', type: 'string' },
			{ codeRunin: 'Should the function run in a browser or in node?', type: 'choices.string', choices: [ 'browser','node' ], default: 'browser' },
			{ codeConfirm: 'Do you confirm all the parameters above? (y)es or no?', type: 'yesno.string', default: 'yes' },
		];
		this.properties.outputs = [ { javascriptCode: 'the code of the new function', type: 'array.string.javascript' } ];
		this.properties.parser = { verb: [ 'code', 'program' ], noun: [ 'javascript' ] };
		this.properties.select = [ [ 'verb', 'noun' ] ];
	}
	async play( line, parameters, control )
	{
		var answer = await super.play( line, parameters, control );
		if ( !answer.success )
			return { success: false, data: {}, error: 'awi:cancelled:iwa' };

 		var description = ''
		for ( var s = 0; s < parameters.codeSteps.length; s++ )
			description += ( s + 1 ) + '. ' + parameters.codeSteps[ s ] + '\n';
		if ( parameters.codeReturn )
			description += ( s + 1 ) + '. It returns ' + parameters.codeReturn + '\n';
		var params = parameters.codeParameters;
		if ( params == '' )
		{
			if ( params.codeCallback )
				params += 'callback';
			else
				params = 'there is no parameters.';
		}
		else if ( params.codeCallback )
			params += ',callback';

		var prompt = this.awi.personality.getPrompt( 'code' ,
		[
			{ name: 'language', content: this.awi.language.name },
			{ name: 'codeDestination', content: parameters.codeRunin },
			{ name: 'functionName', content: parameters.codeName },
			{ name: 'parameters', content: params },
			{ name: 'description', content: description },
		], control );
		this.awi.editor.print( control.editor, prompt, { user: 'prompt' } );
		var answer = await this.sendCompletion( prompt, false, control );
		if ( answer.success )
		{
			var result = answer.data.text.trim().split( '\n' );
			var copying = false;
			var destcode = [];
			for ( var l = 0; l < result.length; l++ )
			{
				var line = result[ l ];
				if ( copying && line )
				{
					if ( line.indexOf( '<END-CODE>' ) >= 0 )
						break;
					destcode.push( line );
				}
				else if ( line.indexOf( '<START-CODE>' ) >= 0 )
					copying = true;
			}
			this.awi.editor.print( control.editor, destcode, { user: 'code' } );
			return { success: true, data: destcode };
		}
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
	async transpile( line, parameter, control )
	{
		super.transpile( line, parameter, control );
	}
}
module.exports.Bubble = BubbleJavascriptCode;
