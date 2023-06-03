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
* @file awi-bubble-generic-input.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Input command: input missing parameters
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericInput extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Input';
		this.token = 'input';
		this.classname = 'generic';
		this.properties.action = 'ask the user for input';
		this.properties.inputs = [ { inputInfo: 'information on the data to input', type: 'array' } ];
		this.properties.outputs = [];
		this.properties.brackets = false;
		this.properties.tags = [ 'generic', 'user', 'input' ];
	}
	async getParameters( parameters, data, control = {} )
	{
		var data = {};
		for ( var p = 0 ; p < parameters.length; p++ )
		{
			var bubble = this.bubl.newBubble( { token: 'input', classname: 'generic', parameters: {} }, [], control );
			var parameter = { inputInfo: this.awi.utilities.getBubbleParams( parameters[ p ] ) };
			var answer = await bubble.play( '', parameter, control );
			if ( !answer.success )
				return answer;
		}
		return { success: true, data: data };
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		if ( !parameters.inputInfo )
			return { success: false, error: 'awi:cancelled:iwa' };

		var self = this;
		var result;
		var firstResult;
		var firstType = '';
		var type = parameters.inputInfo.type;
		var dot = type.indexOf( '.' );
		if ( dot > 0 )
		{
			firstType = type.substring( 0, dot );
			type = type.substring( dot + 1 );
			if ( firstType == 'array' )
				firstResult = [];
		}

		this.properties.outputs[ 0 ] = {};
		this.properties.outputs[ 0 ][ parameters.inputInfo.name ] = description;
		this.properties.outputs[ 0 ].type = parameters.inputInfo.type;
		var text;
		var description = parameters.inputInfo.description;
		switch ( firstType )
		{
			case 'array':
				text = '\nPlease enter, line by line, ' + description + '.\nPress <return> to exit...', { user: 'awi' };
				break;
			case 'choices':
				text = '\n' + description + '\n';
				for ( var c = 0; c < parameters.inputInfo.choices.length; c++ )
				{
					var t = parameters.inputInfo.choices[ c ];
					if ( t == parameters.inputInfo.default )
						t += ' (default)';
					text += ' ' + ( c + 1 ) + '. ' + t + '\n';
				}
				text += 'Or press <return> for default.';
				break;
			case 'yesno':
				text = '\n' + description;
				break;
			default:
				text = '\nPlease enter ' + description
				break;
		}
		this.awi.editor.print( this, text.split( '\n' ), { user: 'question' } );

		var self = this;
		var finished = false;
		this.awi.editor.rerouteInput(
			function( line )
			{
				var start = 0;
				var c = self.awi.utilities.getCharacterType( line.charAt( start ) );
				while( c != 'letter' && c != 'number' && start < line.length )
				{
					start++;
					c = self.awi.utilities.getCharacterType( line.charAt( start ) );
				}
				line = line.substring( start );
				if ( line == '' )
				{
					result = '<___cancel___>';
				}
				else
				{
					if ( type == 'number' )
					{
						var number = parseInt( line );
						if ( !isNaN( number ) )
						{
							var interval = parameters.inputInfo.interval;
							if ( interval )
							{
								if ( number < interval.start || number < interval.end )
								{
									self.awi.editor.print( this, [ 'Please enter a number between ' + interval.start + ' and ' + interval.end + '...' ], { user: 'information' } );
									return;
								}
							}
							result = number;
						}
					}
					else
					{
						result = line;
					}
				}
				if ( result != '<___cancel___>' )
				{
					var prompt = self.awi.config.getPrompt( 'question' );
					switch ( firstType )
					{
						case 'array':
							var dot = result.indexOf( '.' );
							if ( dot >= 0 && dot < 8 )
								result = result.substring( dot + 1 ).trim();
							if ( result.length == '' )
							{
								result = firstResult;
								break;
							}
							firstResult.push( result );
							var p = prompt + ( firstResult.length+ 1 ) + '. ';
							self.awi.editor.waitForInput( p, { toPrint: p } );
							return;
						case 'choices':
							result = parseInt( result );
							var found;
							if ( !isNaN( result ) && result >= 0 && result <= parameters.inputInfo.choices.length )
								found = parameters.inputInfo.choices[ result - 1 ];
							if ( !found )
							{
								text.push(  + parameters.inputInfo.default + '.' );
								self.awi.editor.print( this, 'Please enter a number between 1 and ' + parameters.inputInfo.choices.length, { user: 'awi' } );
								self.awi.editor.waitForInput( prompt, { toPrint: prompt } );
								return;
							}
							else
							{
								result = found;
							}
							break;
						case 'yesno':
							if ( result == '<___cancel___>' )
							{
								result = parameters.inputInfo.default;
							}
							else
							{
								if ( result.charAt( 0 ).toLowerCase() == 'y' )
									result = 'yes';
								else
								{
									text.push( 'Please answer yes or no...' );
									self.awi.editor.print( this, text, { user: 'awi' } );
									self.awi.editor.waitForInput( prompt, { toPrint: prompt } );
									return;
								}
							}
							break;
					}
				}
				else
				{
					switch ( firstType )
					{
						case 'array':
							result = firstResult;
							break;
						case 'choices':
						case 'yesno':
							result = parameters.inputInfo.default;
							break;
					}
				}
				self.awi.editor.rerouteInput();
				finished = true;
			} );

		// Wait for input
		var prompt = this.awi.config.getPrompt( 'question' );
		if ( firstType == 'array' )
			prompt += '1. ';
		this.awi.editor.waitForInput( prompt, { toPrint: prompt } );
		return new Promise( ( resolve ) =>
		{
			const checkPaused = () =>
			{
				var handle = setInterval(
					function()
					{
						if ( finished )
						{
							clearInterval( handle );
							if ( result == '<___cancel___>' )
								resolve( { success: false, error: 'awi:cancelled:iwa' } );
							else
							{
								var data = {};
								data[ parameters.inputInfo.name ] = result;
								self.properties.outputs = [ {} ];
								self.properties.outputs[ 0 ].name = parameters.inputInfo.name;
								resolve( { success: true, data: data } );
							}
						}
					} );
			};
			checkPaused();
		} );
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
module.exports.Bubble = BubbleGenericInput;
