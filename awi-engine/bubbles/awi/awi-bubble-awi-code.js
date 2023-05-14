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
* @file awi-bubble-awi-code.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Code command: create code in the current language connector
*
*/
var awibubbles = require( '../awi-bubbles' )
var awimessages = require( '../../awi-messages' )

class BubbleAwiCode extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Code';
		this.token = 'code';
		this.classname = 'awi';
		this.properties.action = 'code a function or procedure';
		this.properties.inputs = [ 
			{ codeName: 'the name of the procedure to create.\n The name should contain the function.', type: 'string', clear: true },
			{ codeParameters: 'the list of parameters, separated by a comma.\n The name should indicate the content.', type: 'string', clear: true },
			{ codeSteps: 'the various bubbles the procedure should do, one per line.\n Stay simple, in ordern not too many details...\nEmpty line to quit.', clear: true },
			{ codeReturn: 'what the procedure should return.', type: 'string', clear: true },
			{ codeCallback: 'if the bubble is in related to network and Internet?.', type: 'yesno', clear: true },
			{ codeConfirm: 'if you confirm all the parameters above...', type: 'yesno', clear: true },
		];
		this.properties.editables =
		[
			{ name: 'prompt', type: 'text', content: `
Your name is {name}. {name} is pronounced like 'hah-wee'.
1. You are a programming assistant that uses Javascript exclusively.
2. You only use Javascript instructions and functions in all the code your create or explain.
Please take the following requirements into consideration before executing the bubble:
\Requirements:
1. You should create a Javascript function, destined to run inside a browser.
2. Start the code section with '<START-CODE>' and end it with '<END-CODE>'.
3. You should not use any async code but a callback if necessary.
4. The name of the function is: {functionName}
5. The list of parameters is: {parameters}
Bubble:
Please create Javascript code based on this description:
{description}
Now the code:
` 				}
		];
		this.properties.outputs = [ { code: 'the code of the new procedure', type: 'code.string' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'editor', 'aoz', 'code' ];
	}
	async play( line, parameters, control )
	{
		var answer = await super.execute( line, parameters, control );
		if ( !answer.success )
			return { success: false, data: {}, error: 'awi:cancelled:iwa' };

 		var description = ''
		for ( var s = 0; s < parameters.codeSteps.length; s++ )
			description += ( s + 1 ) + '. ' + parameters.codeSteps[ s ] + '\n';
		if ( parameters.codeReturn != '' )
			description += ( s + 1 ) + '. ' + this.getEditable( 'returns' ) + data.codeReturn + '\n';
		var parameters = parameters.codeParameters;
		if ( parameters == '' )
		{
			if ( parameters.codeCallback )
				parameters += 'callback';
			else				
				parameters = 'there is no parameters.';
		}
		else if ( parameters.codeCallback )
			parameters += ',callback';

		var prompt = awimessages.generatePrompt( this.getEditable( 'prompt' ), 
		{
			name: this.awi.getConfig( 'user' ).awiName,
			mood: this.awi.getConfig( 'user' ).awiName,
			description: description,
			functionName: data.codeName,
			parameters: parameters
		} );
		var answer = this.sendCompletion( prompt, false, control );
		if ( answer.success )
		{
			var result = answer.data.text.trim();
			result = result.split( '\n' );

			var destCode;
			var name;
			var params = [];
			var startCode = 0;
			var isCallback = false;
			var endCode = result.length;
			for ( var l = 0; l < result.length; l++ )
			{
				var line = result[ l ];
				if ( line.indexOf( '<START-CODE>' ) >= 0 )
					startCode = l + 1;
				if ( line.indexOf( '<END-CODE>' ) >= 0 )
					endCode = l;
				if ( line.toLowerCase().indexOf( 'callback' ) >= 0 )
					isCallback = true;
			}
			for ( var l = startCode; l < endCode; l++ )
			{
				var line = result[ l ];
				var start = line.indexOf( 'function' );
				if ( start >= 0 )
				{
					start = line.indexOf( ' ', start );
					var end = line.indexOf( '(' );
					name = line.substring( start + 1, end );

					// Extract parameters
					start = end + 1;
					var close = line.indexOf( ')', start );
					while ( start < line.length )
					{
						while ( line.charAt( start ) == ' ' )
							start++;
						end = line.indexOf( ',', start );
						if ( end < 0 )
						{
							if ( close > start )
								params.push( line.substring( start, close ) );
							break;
						}
						params.push( line.substring( start, end ).trim() );
						start = end + 1;
					}

					// Generates code
					destCode = 'Procedure ' + name + '[';
					for ( var p = 0; p < params.length; p++ )
					{
						if ( params[ p ].toLowerCase().indexOf( 'callback' ) < 0 )
						{
							if ( p > 0 )
								destCode += ', ';
							destCode += params[ p ];
						}
					}
					destCode += ']\n';
					destCode += '\t// Javascript (do not remove this line)\n';
					destCode += '\t{\n';
					if ( isCallback )
					{
						destCode += '\t\t#waiting\n';
						destCode += '\t\tvar done=false;\n'
						destCode += '\t\tfunction onResult(result)\n';
						destCode += '\t\t{\n';
						destCode += '\t\t\taoz.tempResult=result;\n'
						destCode += '\t\t\tdone=true;\n'
						destCode += '\t\t};\n'
					}
					for ( var ll = startCode; ll < endCode; ll++ )
						destCode += '\t\t' + result[ ll ] + '\n';
					if ( !isCallback )
					{
						destCode += '\t\taoz.tempResult = ' + name + '(';
						for ( var p = 0; p < params.length; p++ )
						{
							if ( p > 0 )
								destCode += ',';
							destCode += 'vars.' + params[ p ];
						}
						destCode += ');\n';
					}
					else
					{
						destCode += '\t\tthis.wait=function()\n'
						destCode += '\t\t{\n'
						destCode += '\t\t\treturn done;\n'
						destCode += '\t\t}\n'
						destCode += '\t\tthis.callFunction=function(args)\n'
						destCode += '\t\t{\n'
						destCode += '\t\t\t' + name + '(';
						for ( var p = 0; p < params.length; p++ )
							destCode += 'args[' + p + ']' + ( p < params.length - 1 ? ',' : '' );
						destCode += ');\n';
						destCode += '\t\t}\n'
						destCode += '\t\treturn{type:12,waitThis:this,callFunction:"callFunction",waitFunction:"wait",args:[';
						for ( var p = 0; p < params.length; p++ )
						{
							if ( params[ p ].toLowerCase().indexOf( 'callback' ) < 0 )
								destCode += 'vars.' + params[ p ];
							else
								destCode += 'onResult';
							if ( p < params.length - 1 )
								destCode += ',';
						}
						destCode += ']};\n';
					}
					destCode += '\t}\n';
					destCode += 'End Proc[{aoz.tempResult}]\n';
					break;
				}
			}
			if ( destCode != '' )
			{
				destCode = this.awi.utilities.replaceStringInText( destCode, 'console.log', 'aoz.print' );
				data.code = destCode.split( '\n' );
				this.awi.editor.print( self, data.code, { user: 'code' } );
				return { success: true, data: destCode };
			}
			return { success: false, data: result, error: 'awi:no-code-produced:iwa' };
		}
	}
}
module.exports.Bubble = BubbleAwiCode;
