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
* @file awi-souvenir-awi-message.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Message souvenir
*
*/
var awisouvenir = require( '../awi-souvenir' );

class SouvenirAwiMessage extends awisouvenir.Souvenir
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Message Souvenir Bubble';
		this.token = 'message';
		this.klass = 'awi';
		this.properties.action = 'remembers one conversation exchange';
		this.properties.subTopics.push( ...[ 'messenger', 'conversation' ] );
		this.properties.content = [ 'text', 'videos', 'images', 'photos', 'audio', 'links' ];
		this.properties.inputs = [ 
			{ userInput: 'the name of the user to remember', type: 'string' },
			{ rememberTopic: 'the topic to remember, example audio, video etc.', type: 'string', optional: true, default: '' },
		];
		this.properties.outputs = [ { memories: 'memories about the topic', type: 'object', default: false } ];
		this.properties.tags = [ 'memory', 'souvenir', 'messenger', 'message' ];
		this.data = {};
	}
	async play( line, parameters, control )
	{
		super.play( line, parameters, control );
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async printData( line, parameters, control )
	{
		this.awi.editor.print( this, this.parameters.conversation, { user: 'memory3' } );
		this.awi.editor.print( this, '------------------------------------------------------------', { user: 'memory3' } );
	}
	
	async findSouvenirs( line, parameters, control )
	{
		var content = true;
		var found = false;
		if ( control.souvenir.quick )
		{
			if ( parameters.userInput )
			{
				var match = this.awi.utilities.matchTwoStrings( this.parameters.contactName, parameters.userInput, { caseInsensitive: true } );
				console.log( 'scanning: ' + this.parameters.contactText );
				if ( match > 0 )
					found = true;
			}
			if ( typeof parameters.rememberContent != 'undefined' )
			{
				var match = this.awi.utilities.matchTwoStrings( this.properties.content, parameters.rememberContent, { lowercase: true } );
				if ( match == 0 )
					content = false;
			}

			var self = this;
			if ( content & found )
			{				
				return { success: true, dataCallback: 
					function( destinationData )
					{
						if ( !self.data.quickMemories )
							destinationData.quickMemories = [];
						var text = self.parameters.contactName + ' said: ' + self.parameters.contactText;
						destinationData.quickMemories.push( text );
					} };
			}
			return { success: true, dataCallback: function(){} };
		}
	}
	async transpile( line, parameter, control )
	{
		return super.transpile( line, parameter, control );
	}
}
module.exports.Souvenir = SouvenirAwiMessage;
