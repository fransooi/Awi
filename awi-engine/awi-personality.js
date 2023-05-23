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
		this.oClass = 'personality';		
		this.options = options;
		this.currentPrompt = 'prompt-generic';

		this.memories = {};
		this.memories[ 'audios' ] = new this.awi.newMemories.generic.audios( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'audios', 0 ), parent: '' } );
		this.memories[ 'conversations' ] = new this.awi.newMemories.generic.conversations( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'conversations', 1 ), parent: '' } );
		this.memories[ 'documents' ] = new this.awi.newMemories.generic.documents( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'documents', 2 ), parent: '' } );
		this.memories[ 'images' ] = new this.awi.newMemories.generic.images( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'images', 3 ), parent: '' } );
		this.memories[ 'mails' ] = new this.awi.newMemories.generic.mails( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'mails', 4 ), parent: '' } );
		this.memories[ 'messenger' ] = new this.awi.newMemories.generic.messenger( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'messenger', 5 ), parent: '' } );
		this.memories[ 'photos' ] = new this.awi.newMemories.generic.photos( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'photos', 6 ), parent: '' } );
		this.memories[ 'videos' ] = new this.awi.newMemories.generic.videos( this.awi, { key: this.awi.utilities.getUniqueIdentifier( {}, 'videos', 7 ), parent: '' } );

		this.prompts = 
		{
'prompt-hello': `
Your name is {name}.
- You are {youAre} {whoUses} {theProduct}.
- You {useTheProduct} {toDoSomething}.
- You answer all questions in {mood}.
Please say hello to the user {user} in a fun and short sentence...
`,
//////////////////////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////////////////
'code':`
Your name is {name}.
1. You are a programming assistant that uses {language} exclusively.
2. The code you write should run {codeDestination}.
3. Your goal is to create a function that sticks to the requirements.
Please take the following requirements into consideration before executing the task:
Requirements:
1. You should create a Javascript function.
2. Start the code section with '<START-CODE>' and end it with '<END-CODE>'.
3. You should not use any async code but a callback if necessary.
4. The name of the function is: {functionName}
5. The list of parameters is: {parameters}
Task:
Please create Javascript code based on this description:
{description}
Now the code:
`, 
'code-returns': `	
It returns ` 			
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
	async remember( line, parameters, control )
	{
		var directSouvenirs = [];
		var indirectSouvenirs = [];
		if ( parameters.kind == 'all' )
		{
			for ( var k in this.awi.memories )
			{
				var answer = await this.awi.memories[ k ].play( line, parameters, { start: 'root', memory: { command: 'findSouvenirs', scanLevel: parameters.scanLevel } } );
				if ( answer.success == 'found' )
				{
					if ( answer.data.directSouvenirs )
						directSouvenirs.push( ...answer.data.directSouvenirs );
					if ( answer.data.indirectSouvenirs )
						indirectSouvenirs.push( ...answer.data.indirectSouvenirs );
				}
			}
		}
		else if ( typeof this.awi.memories[ parameters.kind ] != 'undefined' )
		{
			var answer = await this.awi.memories[ parameters.kind ].play( line, parameters, { start: 'root', memory: { command: 'findSouvenirs', scanLevel: parameters.scanLevel } } );
			if ( answer.success == 'found' )
			{
				if ( answer.data.directSouvenirs )
					directSouvenirs.push( ...answer.data.directSouvenirs );
				if ( answer.data.indirectSouvenirs )
					indirectSouvenirs.push( ...answer.data.indirectSouvenirs );
			}
		}
		if ( directSouvenirs.length + indirectSouvenirs.length > 0 )
			return { success: 'found', data: { directSouvenirs: directSouvenirs, indirectSouvenirs: indirectSouvenirs } };
		return { success: 'notfound', data: { directSouvenirs: [], indirectSouvenirs: [] } };
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
				else
				{
					variables[ data.name ] = data.content;
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
	async loadMemories( user, type = 'all')
	{
		user = typeof user == 'undefined' ? this.awi.config.user : user;

		var self = this;
		async function loadMemory( type )
		{
			var path = self.awi.config.getConfigurationPath() + '/' + user + '-' + type + '-';
			var memory;
			var answer = await self.awi.system.exists( path + 'memory.js' );
			if ( answer.success )
			{
				answer = await self.awi.system.readFile( path + 'memory.js', { encoding: 'utf8' } );
				if ( answer.success )
				{
					memory = answer.data;
					try
					{
						memory = Function( memory );
						memory = memory();
						memory = self.awi.utilities.serializeIn( memory.root, {} );
						return { success: true, data: memory };
					}
					catch( e )
					{
						return { success: false, error: 'awi:cannot-load-memory:iwa' };
					}
				}
				return { success: false, error: 'awi:cannot-load-memory:iwa' };
			}
			return { success: true };
		}
		var answer;
		if ( type == 'all' )
		{
			for ( var type in this.memories )
			{
				answer = await loadMemory( type );
				if ( !answer.success )
					break;
				if ( answer.data )
				{
					this.memories[ type ].addMemory( answer.data, { parent: this.memories[ type ].key } )
				}
			}
		}
		else
		{
			answer = await loadMemory( type );
			if ( answer.success )
			{
				if ( answer.data )
				{
					this.memories[ type ].addMemory( answer.data, { parent: this.memories[ type ].key } )
				}
			}
		}
		return answer;
	}
	async saveMemories( user, type = 'all' )
	{
		user = typeof user == 'undefined' ? this.awi.config.user : user;

		var self = this;
		async function saveMemory( type )
		{
			if ( self.memories[ type ] )
			{
				var memories = self.awi.utilities.serializeOut( self.memories[ type ], '' );
				var path = self.awi.config.getConfigurationPath() + '/' + user + '-' + type + '-';
				return await self.awi.system.writeFile( path + 'memory.js', memories, { encoding: 'utf8' } );
			}
			return { success: false, error: 'awi:no-memory-of-type:iwa' };
		}
		var answer;
		if ( type == 'all' )
		{
			for ( var type in this.memories )
			{
				answer = await saveMemory( type );
				if ( !answer.success )
					break;
			}
		}
		else
		{
			answer = await saveMemory( type );
		}
		return answer;
	}
}
module.exports.Personality = Personality
