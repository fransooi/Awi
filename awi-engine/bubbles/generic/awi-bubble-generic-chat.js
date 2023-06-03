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
* @file awi-bubble-generic-chat.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Chat bubble
*
*/
var awibubble = require( '../awi-bubble' );

class BubbleGenericChat extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Chat';
		this.token = 'chat';
		this.classname = 'generic';
		this.questionCount = 1;
		this.properties.action = 'answers to generic questions';
		this.properties.inputs = [ { userInput: 'the question', type: 'string' } ];
		this.properties.outputs = [ { awiAnswer: 'the answer to the question', type: 'string' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'system', 'chat' ];
		this.empty = false;
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		this.empty = true;

		// Scan for internal commands in original line.
		var start = parameters.userInput.indexOf( '{chat:' );
		if ( start >= 0 )
		{
			do
			{
				var end = parameters.userInput.indexOf ( ':chat}', start );
				if ( end > 0 )
				{
					var embed = parameters.userInput.substring( start + 6, end );
					var space = embed.indexOf( ' ' );
					if ( space < 0 )
						space = embed.length;
					var ok = false;
					if ( space >= 0 )
					{
						switch ( embed.substring( 0, space ) )
						{
							case 'settemperature':
								var lineData = this.awi.utilities.extractLineParameters( embed, [ { name: 'temperature', type: 'number' } ] );
								ok = this.awi.personality.setTemperature( lineData.temperature );
								break;
							case 'setprompt':
								var lineData = this.awi.utilities.extractLineParameters( embed, [ { name: 'prompt', type: 'string' } ] );
								ok = this.awi.personality.setPrompt( lineData.prompt );
								break;
							case 'resume':
								ok = true;
								break;
						}
					}
					if ( !ok )
						return { success: false, error: 'awi:bad-command:iwa' };
					parameters.userInput = parameters.userInput.substring( 0, start ) + parameters.userInput.substring( end + 6 );
					start = parameters.userInput.indexOf( '{chat:' );
				}
				else
				{
					return { success: false, error: 'awi:bad-command:iwa' };
				}
			} while( start >= 0 );
			parameters.userInput = parameters.userInput.trim();
			if ( parameters.userInput.length == 0 )
				return { success: true, data: 'noprompt' };
		}
		this.parameters.userInput = parameters.userInput;

		// Scan the command for Basic keywords.
		var context = '';
		if ( this.awi.connectors.languages.current )
		{
			var foundKeywords = this.awi.language.scanForCommands( parameters.userInput );
			for ( var f = 0; f < foundKeywords.length; f++ )
			{
				var completion = foundKeywords[ f ].completion.trim();
				completion = completion.charAt( 0 ).toLowerCase() + completion.substring( 1 );
				completion = this.awi.utilities.replaceStringInText( completion, '###', '' );
				context += ( f + 2 ) + '.' + foundKeywords[ f ].instruction + ' is ' + completion + '\n';
			}
		}

		// Gather previous or relevant conversations
		var memories = await this.awi.extractContentFromMemories( line, { senderName: this.awi.config.getConfig( 'user' ).fullName }, { caseInsensitive: true } );
		//memories.push( ...this.awi.memoryManager.recall( parameters.userInput ) );
		var conversation = '';
		var takenote = '';
		if ( this.awi.getConfig( 'user' ).firstName != '' )
		{
			conversation = this.awi.personality.getMemoryPrompt( memories, this.awi.getConfig( 'user' ).firstName, this.awi.getPersonality().name, 5 );
			takenote = this.awi.getConfig( 'user' ).takeNote;
		}
		control.answerCount = this.useCount;
		var prompt = this.awi.personality.getPrompt( 'current' ,
		[
			{ name: 'context', content: context },
			{ name: 'takeNote', content: takenote },
			{ name: 'conversation', content: conversation },
			{ name: 'memories', content: memories.data.directExtracted + memories.data.indirectExtracted },
			{ name: 'task-question', content: parameters.userInput },
		], control );
		control.answerCount = undefined;
		this.awi.editor.print( this, prompt, { user: 'prompt' } );
		var answer = await this.sendCompletion( prompt, false, control );
		if ( answer.success )
		{
			var text =  this.awi.cleanResponse( answer.data.text );
			this.awi.editor.print( this, text, { user: 'awi' } );
			answer.data = text;
			this.empty = false;
		}
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
module.exports.Bubble = BubbleGenericChat;
