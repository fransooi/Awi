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
* @file awi-connector-servers-node.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Connector to open-ai via Open-AI node library
*
*/
var awiconnector = require( '../awi-connector' );
const fs = require( 'fs' );
const { Configuration, OpenAIApi } = require( 'openai' );

class ConnectorClientOpenAiNode extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Openai Node';
		this.token = 'openainode';
		this.classname = 'client';
		this.version = '0.2.1';

		this.cancelled = false;
		this.connected = false;
		this.handleSendInterval = 0;
		this.messageCount = 0;
	}
	async connect( options )
	{
		super.connect( options );
		if ( !this.openai )
		{
			var key = this.awi.config.getUserKey();
			if ( key != '' )
			{
				this.configuration = new Configuration(
				{
					apiKey: key,
				} );
				this.openai = new OpenAIApi( this.configuration );
			}
		}
		this.connectAnswer.data.token = this.classname;
		this.connectAnswer.success = this.openai ? true : false;
		this.connectAnswer.nonFatal = true;
		return this.connectAnswer;
	}
	async createTranscription( prompt, path, control )
	{
		var answer = {};
		if ( this.configuration )
		{
			prompt = prompt.trim();
			var parameters = this.awi.utilities.getControlParameters( control,
			{
				model: 'whisper-1',
				response_format: 'json',
				temperature: 0,
				language: 'en'
			} );

			var debug = this.awi.utilities.format( `
prompt: {prompt}
model: {model}
temperature: {temperature}
response_format: {response_format}
language: {language}`, parameters );
			this.awi.editor.print( control.editor, debug.split( '\n' ), { user: 'completion' } );

			var response;
			try
			{
				response = await this.openai.createTranscription
				(
					fs.createReadStream( path ),
					"whisper-1",
					prompt,
					parameters.response_format,
					parameters.temperature,
					parameters.language
				);
			}
			catch( e )
			{
				answer.success = false;
				answer.error = e;
				return answer;
			}

			if ( !response.error )
			{
				answer.success = true;
				if ( typeof response.data.text != 'undefined' )
					answer.data = response.data.text;
				else
					answer.data = response.data;
			}
			else
			{
				answer.success = false;
				answer.data = response;
				answer.error = 'awi:openai-error:iwa';
			}
		}
		return answer;
	}
	async sendCompletion( prompt, stream, control )
	{
		var answer = {};
		if ( this.configuration )
		{
			prompt = prompt.trim();
			var parameters = this.awi.utilities.getControlParameters( control,
			{
				model: 'text-davinci-003',
				max_tokens: 1000,
				temperature: 1,
				top_p: 1,
				n: 2
			 } );
			parameters.prompt = prompt;
			if ( this.awi.connectors.editors.current )
			{
				var debug = this.awi.utilities.format( `
model: {model}
max_tokens: {max_tokens}
temperature: {temperature}
top_p: {top_p}
n: {n}`, parameters );
				this.awi.editor.print( control.editor, debug.split( '\n' ), { user: 'completion' } );
			}
			var response;
			try
			{
				response = await this.openai.createCompletion(
				{
					prompt: prompt,
					model: "text-davinci-003",
					max_tokens: parameters.max_tokens,
					temperature: parameters.temperature,
					top_p: 1,
					n: parameters.n
				} );
			}
			catch( e )
			{
				answer.success = false;
				answer.error = e.message;
				return answer;
			}

			if ( !response.error )
			{
				answer.success = true;
				answer.data = response.data.choices[ 0 ];
			}
			else
			{
				answer.success = false;
				answer.data = response;
				answer.error = 'awi:openai-error:iwa';
			}
			return answer;
		}
		answer.success = false;
		answer.error = 'awi:openai-not-connected:iwa';
		return answer;
	}
}
module.exports.Connector = ConnectorClientOpenAiNode