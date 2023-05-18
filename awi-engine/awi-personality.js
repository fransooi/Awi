/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][   ]       Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_] \     link: 
*
* This file is open-source under the conditions contained in the 
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-personality.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Handle various personalities / create adapted prompts
*
*/

class Personality
{
	constructor( awi, options = {} )
	{
		this.awi = awi;
		this.options = options;
		this.currentPrompt = 'prompt-generic';
		this.prompts = 
		{
/*			
'prompt-generic#1': `
Your name is {name}.
- You are {youAre} {whoUses} {theProduct}.
- You {useTheProduct} {toDoSomething}.
- You answer all questions in {mood}.
- You love: {youLove}.
- You like: {youLike}.
- You hate: {youHate},
- You do not like: {youDoNotLike}.
- You make a joke when: {youMakeAJokeWhen}!!!
- You support: {youSupport}.
- You laugh at: {youLaughAt}.
- You grrr at: {youGrrrAt}.
- You reject: {youReject}.
- You ignore: {youIgnore}.
- You eventually accept: {youEventuallyAccept},
- You always accept: {youAlwaysAccept}.
- Take note: {takeNote}...
`,*/
'prompt-hello': `
Your name is {name}.
- You are {youAre} {whoUses} {theProduct}.
- You {useTheProduct} {toDoSomething}.
- You answer all questions in {mood}.
Please say hello to the user {user} in a fun and short sentence...
`,
'prompt-generic#1': `
Your name is {name}.
- You are {youAre} {whoUses} {theProduct}.
- You {useTheProduct} {toDoSomething}.
- You answer all questions in {mood}.
`,
'prompt-generic#2': `
- You are {youAre} {whoUses} {theProduct}.
- You {useTheProduct} {toDoSomething}.
- You answer all questions in {mood}.
`,
'prompt-generic#3': `
- You are {youAre} {whoUses} {theProduct}.
- You {useTheProduct} {toDoSomething}.
- You answer all questions in {mood}.
`,
'prompt-generic#last': `
- You are {youAre} {whoUses} {theProduct}.
- You {useTheProduct} {toDoSomething}.
- You answer all questions in {mood}.
`,
			'prompt-generic-takeNote': `
- Take note: {takeNote}...
`,
			'prompt-generic-context': `
Please take the following context into consideration before executing the task. Context:
1. The task is related to "{toDoSomething}".
{context}
`,

			'prompt-generic-conversation':`
Please read first the conversation with the user. Conversation:
{conversation}
`, 

			'prompt-generic-task-question#1':`
Now the task:
Answer question: {task-question}
`, 
			'prompt-generic-task-question#2':`
Now the task:
Answer question: {task-question}
`, 

'prompt-generic-task-question#last':`
Now the task:
Answer question: {task-question}
`, 

			'prompt-generic-task-code':`
Please write {language} code now:{task-code}
`, 
		}
	}
	setPrompt( prompt )
	{
		if ( this.prompts[ prompt ] || this.prompts[ prompt + '#1' ] )
		{
			this.currentPrompt = prompt;
			return true;
		}
		return false;
	}
	setTemperature( temperature )
	{
		if ( temperature < 0 )
			this.temperature = this.awi.getPersonality().temperature;
		else 
			this.temperature = temperature;
		return true;
	}
	getPrompt( token, newData, options = {} )
	{
		if ( token == 'current' )
			token = this.currentPrompt;

		var tokenCount = '';
		var tokenQuestionCount = '';
		var variables = this.awi.utilities.copyObject( this.awi.getPersonality() );
		if ( this.awi.getConfig( 'user' ).firstName == '' )
			return '';
		
		variables.firstName = this.awi.getConfig( 'user' ).firstName;
		variables.lastName = this.awi.getConfig( 'user' ).lastName;
		variables.fullName = this.awi.getConfig( 'user' ).fullName;
		if ( typeof options.answerCount != 'undefined' )
			tokenCount = '#' + options.answerCount;
		if ( typeof options.answerCount != 'undefined' )
			tokenQuestionCount = '#' + options.questionCount;
		var prompt = this.prompts[ token + tokenCount ];
		if ( !prompt )
		{
			prompt = this.prompts[ token + '#last' ];
			if ( !prompt )
				prompt = this.prompts[ token ];
		}
		
		if ( prompt )
		{
			for ( var d = 0; d < newData.length; d++ )
			{
				var data = newData[ d ];
				var subToken = token + '-' + data.name;
				var subPrompt = this.prompts[ subToken + tokenQuestionCount ];
				if ( !subPrompt )
				{
					subPrompt = this.prompts[ subToken + '#last' ];
					if ( !subPrompt )
						subPrompt = this.prompts[ subToken ];
				}
				if ( subPrompt )
				{
					if ( data.name == 'takeNote' || data.name == 'conversation' )
					{
						if ( data.content )
						{
							if ( this.prompts[ token + '-' + data.name ] )
							{
								variables[ data.name ] = data.content;
								prompt += subPrompt;
							}
						}
					}
					else if ( data.content != '' )
					{
						variables[ data.name ] = data.content;
						prompt += subPrompt;
					}
				}
			}
			prompt = this.awi.utilities.format( prompt, variables );
		}
		return prompt;
	}
	getMemoryPrompt( memoryList, user, contact, maxCount = 5 )
	{
		var count = maxCount;
		var conversation = '';
		if ( user )
			user += ' said:'
		if ( contact )
			contact += ' said:'
		for ( var m = 0; m < memoryList.length && count > 0; m++, count-- )
		{
			var memory = memoryList[ m ];
			conversation += '- ' + user + '"' + memory.userText + '"\n';
			conversation += '- ' + contact + '"' + memory.contactText + '"\n';
		}
		return conversation;
	}
}
module.exports.Personality = Personality