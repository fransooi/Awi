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
* @file awi-connector-servers-browser.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Connector to code ran from navigator (indirect file-system).
*        Read/write subject to authorisation from user in config,
*        with directory selection. Any write operation will necessit
*        a "control.levelOfTrust" over a certain limit, with of course
*        heavy secrity at the bottom, with possible questions relatiung 
*        to memory that relates to recent event etc. Three necessary 
*        for total security, from my of today's understanding of Transformers,
*        5 = total lock with motivation to stay locked.
* 
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorClientOpenAiBrowser extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'openaibrowser';
		this.name = 'OpenAi Browser';
		this.classname = 'client';
		this.version = '0.2.1';
	}
	async connect( options )
	{
		super.connect( options );
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}	
	async sendCompletion( prompt, stream, control )
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
prompt: {prompt}
model: {model}
max_tokens: {max_tokens}
temperature: {temperature}
top_p: {top_p}
n: {n}`, parameters );
			this.awi.editor.print( this, debug.split( '\n' ), { user: 'completion' } );
		}

		var apiKey = this.awi.config.getUserKey();
		var response = await fetch( "https://api.openai.com/v1/completions", 
		{
			method: "POST",
			headers: 
			{
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'Authorization': `Bearer '${apiKey}`
			},
			body: JSON.stringify(
			{
				"model": `{model}`,
				"prompt": `{prompt}`,
				"temperature": temperature,
				"max_tokens": max_tokens,
				"top_p": top_p,
				"n": n
			} )
		} );
		var answer = {};
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
}
module.exports.Connector = ConnectorClientOpenAiBrowser