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
* @file awi-bubble-generic-bubbles.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Main bubble class from which all elements are derived.
*
*/
class Bubble
{
	constructor( awi, options )
	{
		this.key = options.key; 		
		this.parameters = options.parameters ? options.parameters : {};
		this.awi = awi;
		this.options = options;
		this.parent = options.parent;
		this.bulb = options.bulb;
		this.classname = 'bubble';
		this.oClass = 'bubble';
		this.useCount = 0;
		this.data = {};
		this.properties = 
		{
			action: '',
			inputs: [],
			outputs: [],
			brackets: false,
			tags: [],
			editables: [],
			exits: { success: '' }
		}
		if ( typeof options.exits != 'undefined' )
		{
			for ( var e in options.exits )
			{
				this.properties.exits[ e ] = options.exits[ e ];
			}
		}
	}
	reset()
	{
		this.data = {};
		this.useCount = 0;
	}
	getEditable( name )
	{
		for ( var e = 0; e < this.properties.editables.length; e++ )
		{
			if ( this.properties.editables[ e ].name == name )
				return this.properties.editables[ e ];
		}
		return null;
	}
	async sendCompletion( prompt, stream, options )
	{
		this.awi.editor.wait( this, true );
		var answer = await this.awi.client.sendCompletion( prompt, stream, options );
		this.awi.editor.wait( this, false );
		return answer;
	}
	async play( line, parameters, control )
	{
		this.useCount++;
		this.awi.editor.print( this, [ "Playing bubble " + this.name ], { user: 'bubble' } );

		if ( line.indexOf( '{awi:' ) == 0 )
			return { success: true };

		if ( control.range )
		{
			this.startPrompt = this.awi.editor.getStartPrompt( control.range );
			this.checkpoint = this.awi.editor.createCheckpoint();
		}
		if ( typeof parameters == 'undefined' )
			return this.parameters;

		var todo = [];
		var lineDatas = this.awi.utilities.extractLineParameters( line, this.properties.inputs );
		parameters.userInput = lineDatas.command;
		for ( var p = 0; p < this.properties.inputs.length; p++ )
		{
			var parameter = this.awi.utilities.getBubbleParams( this.properties.inputs[ p ] );
			if ( typeof parameters[ parameter.name ] != 'undefined' && parameters[ parameter.name ] != '' )
			{
				if ( parameter.clear )
					parameters[ parameter.name ] = parameters[ parameter.name ].default;
			}
		}
		for ( var p = 0; p < this.properties.inputs.length; p++ )
		{
			var parameter = this.awi.utilities.getBubbleParams( this.properties.inputs[ p ] );
			if ( typeof parameters[ parameter.name ] == 'undefined' || parameters[ parameter.name ] == '' )
			{
				if ( typeof lineDatas[ parameter.name ] == 'undefined' )
				{
					if ( !parameter.optional )
						todo.push( { token: 'input', classname: 'generic', parameters: [ parameter ], options: {} } );
					else
						parameters[ parameter.name ] = parameter.default;
				}
				else
				{
					parameters[ parameter.name ] = lineDatas[ parameter.name ];
				}
			}
		}
		if ( todo.length > 0 )
		{
			var params = await this.awi.prompt.getParameters( todo, control );
			if ( params.success )
			{
				for ( var p = 0; p < this.properties.inputs.length; p++ )
				{
					var prop = this.awi.utilities.getBubbleParams( this.properties.inputs[ p ] );
					if ( typeof params.data[ prop.name ] != 'undefined' )
						parameters[ prop.name ] = params.data[ prop.name ];
				}						
			}
			else
			{
				return { success: false, data: {}, error: 'awi:cancelled:iwa', next: 'cancelled' };
			}
		}
		this.userInput = line;
		return { success: true };
	}
	async playback( line, parameter, control )
	{
	}
	async transpile( /*data, control*/ )
	{
	}
	async serialize()
	{

	}
}
module.exports.Bubble = Bubble;
