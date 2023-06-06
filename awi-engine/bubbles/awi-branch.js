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
* @file awi-branch.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short A tree of bubbles that works as a bubble: a branch.
*
*/
var awibubble = require( './awi-bubble' )

class Branch extends awibubble.Bubble
{
	constructor( awi, options )
	{
		options.errorClass = typeof options.errorClass ? options.errorClass : 'newBubbles';
		super( awi, options );
		this.classname = 'branch';
		this.oClass = 'branch';
		this.bubbleMap = {};
		this.pathways = [];
		this.pathway = 'self.bubbleMap';
		this.currentBubble = '';
		this.firstRun = true;
		this.keyCount = 0;
		this.working = 0;
		this.addBubbleFromCommand( { token: 'error', key: 'error', parentClass: options.errorClass, parameters: {}, options: {} }, {}, {} );
		this.addBubbleFromCommand( { token: 'root', key: 'root', parentClass: options.errorClass, parameters: {}, options: {} }, {}, {} );
	}
	reset()
	{
		super.reset();
		this.pathway = 'self.bubbleMap';
		this.pathways = [];
		for ( var b in this.bubbleMap )
			this.bubbleMap[ b ].reset();
	}
	async play( line, parameters, control = {} )
	{
		var data = {};
		var startBubble = this.currentBubble;
		if ( !startBubble || control.start == 'root' || this.firstRun )
		{
			startBubble = 'root';
			this.reset();
			this.working = 0;
			this.firstRun = false;
		}
		if ( !startBubble )
			return { success: false, data: {}, error: 'awi:no-bubble-to-play:iwa' };
		control.start = null;

		var answer;
		this.working++;
		var bubble = this.bubbleMap[ startBubble ];
		do
		{
			this.pathway += '.' + bubble.key;
			this.pathways.push( this.pathway );
			answer = await bubble.play( line, parameters, control );
			if ( answer.success )
			{
				// Goto next
				var exit;
				var next = answer.success;
				if ( next === true )
					next = 'success';
				if ( next != 'end' )
					exit = bubble.properties.exits[ next ];

				// Store parameters
				if ( answer.dataCallback )
				{
					answer.dataCallback( parameters );
				}
				else
				{
					if ( bubble.properties.outputs.length == 1 )
					{
						var output = this.awi.utilities.getBubbleParams( bubble.properties.outputs[ 0 ] );
						bubble.data = answer.data;
						data = answer.data;
					}
					else if ( answer.data )
					{
						for ( var o = 0; o < bubble.properties.outputs.length; o++ )
						{
							var output = this.awi.utilities.getBubbleParams( bubble.properties.outputs[ o ] );
							bubble.data[ output.name ] = answer.data[ output.name ];
							data[ output.name ] = answer.data[ output.name ];
						}
					}
				}
			}
			else if ( answer.error )
			{
				this.awi.editor.print( control.editor, answer.error, { user: 'error' } );
				exit = 'end';
			}
			this.pathway = this.pathway.substring( 0, this.pathway.lastIndexOf( '.' ) );
			bubble = this.bubbleMap[ exit ];
		} while ( bubble );
		if ( answer.success )
			answer.success = 'end';

		this.working--;
		return answer;
	}
	async playback( line, parameter, control )
	{
	}
	pause( onOff )
	{
		this.paused = onOff;
	}
	async waitPaused()
	{
		if ( !this.paused )
		 	return;

		var self = this;
		return new Promise( ( resolve ) =>
		{
			const checkPaused = () =>
			{
				if ( !self.paused )
				{
					resolve();
				}
			};
			checkPaused();
		} );
	}
	async transpile( position, line, data, control )
	{
		return await super.transpile( position, line, data, control );
	}
	async serialize( path, data, control )
	{
		return await this.run( path, data, control );
	}

	newBubble( command, parameters = {}, control = {} )
	{
		parameters = typeof command.parameters != 'undefined' ? command.parameters : parameters;
		var key = ( command.key ? command.key : this.awi.utilities.getUniqueIdentifier( this.bubbleMap, command.token, this.keyCount++ ) );
		var parent = command.parent ? command.parent : this.currentBubble;
		var parentClass = ( typeof command.parentClass == 'undefined' ? 'newBubbles' : command.parentClass );
		var classname =  ( typeof command.classname == 'undefined' ? 'generic' : command.classname );
		var exits =  ( typeof command.exits == 'undefined' ? { success: 'end' } : command.exits );
		var newBubble = new this.awi[ parentClass ][ classname ][ command.token ]( this.awi, { key: key, branch: this, parent: parent, exits: exits, parameters: parameters } );
		if ( parent && this.getBubble( parent ) )
			this.getBubble( parent ).properties.exits.success = newBubble.key;
		return newBubble;
	}
	addBubble( bubble, control = {} )
	{
		bubble.key = this.awi.utilities.getUniqueIdentifier( this.bubbleMap, bubble.token, this.keyCount++ );
		bubble.parent = this.currentBubble;
		this.getBubble( this.currentBubble ).properties.exits.success = bubble.key;
		this.bubbleMap[ bubble.key ] = bubble;
		this.currentBubble = bubble.key;
		return bubble.key;
	}
	addBubbleFromCommand( command, parameters = {}, control = {} )
	{
		command.parent = this.currentBubble;
		if ( typeof command.key == 'undefined' )
			command.key = this.awi.utilities.getUniqueIdentifier( this.bubbleMap, command.token, this.keyCount++ );
		var bubble = this.newBubble( command, parameters, control );
		this.bubbleMap[ bubble.key ] = bubble;
		this.currentBubble = bubble.key;
		return bubble.key;
	}
	addBubbles( commandList, parameters = {}, control = {} )
	{
		commandList = this.awi.utilities.isObject( commandList ) ? [ commandList ] : commandList;
		for ( var c = 0; c < commandList.length; c++ )
		{
			this.addBubbleFromCommand( commandList[ c ], parameters, control );
		}
	}
	addBubbleFromLine( line, control = {} )
	{
		var start;
		var command;
		var parameters = {};
		for ( start = 0; start < line.length; start++ )
		{
			var c = line.charAt( start );
			if ( c == '{' )
				break;
			var type = this.awi.utilities.getCharacterType( c );
			if ( type == 'letter' )
				break;
			if ( type == 'number' )
			{
				command =
				{
					token: 'eval',
					classname: 'generic',
					parameters: parameters,
					options: options
				};
				break;
			}
		}
		line = line.substring( start ).trim();

		var classname;
		if ( !command )
		{
			for ( classname in this.awi.bubbles )
			{
				var token;
				var space = -1, column, start;
				var count = 2;
				do
				{
					start = space + 1;
					space = line.indexOf( ' ', start );
					column = line.indexOf( ':', start );
					if ( space >= 0 && column >= 0 )
						space = Math.min( space, column );
					else if ( space < 0 && column >= 0 )
						space = column;
					else if ( space < 0 )
						space = line.length;
					token = line.substring( start, space ).toLowerCase();
				} while ( !this.awi.newBubbles[ classname ][ token ] && space < line.length && count-- > 0 )

				if ( this.awi.bubbles[ classname ][ token ] )
				{
					command =
					{
						token: token,
						classname: classname,
						parameters: parameters,
						options: {}
					};
					line = line.substring( space ).trim();
					break;
				}
			}
		}
		if ( !command )
		{
			command =
			{
				token: 'chat',
				classname: 'generic',
				parameters: parameters,
				options: {}
			};
			var column = line.indexOf( ':' );
			if ( column > 0 )
			{
				var name = line.substring( 0, column );
				if ( name == this.awi.getConfig( 'user' ).firstName )
					line = line.substring( column + 1 );
				if ( name == this.awi.getPersonality().firstName )
					line = line.substring( column + 1 );
			}
		}
		this.addBubbleFromCommand( command, parameters, control );
		return line;
	}
	recallLastBubbles( howMany )
	{
		var memory = [];
		var bubbles = this.getBubbleChain( 'end', 1, howMany );
		for ( var b = bubbles.length - 1; b >= 0; b-- )
		{
			var bubble = bubbles[ b ];
			if ( bubble.token == 'chat' && bubble.data )
			{
				memory.push(
				{
					userText: bubble.parameters[ 0 ].value,
					receiverText: bubble.data.join( ' ' )
				} );

			}
		}
		return memory;
	}
	getLastData( bubble, token )
	{
		var bubble = this.getBubble( bubble.parent );
		while( bubble )
		{
			for ( var p = 0; p < bubble.properties.outputs.length; p++ )
			{
				var output = this.awi.utilities.getBubbleParams( bubble.properties.outputs[ p ] );
				if ( output.name == token )
					return bubble.data;
			}
			bubble = this.getBubble( bubble.parent );
		}
		return null;
	}

	// Bubble tree handling
	getBubble( key )
	{
		return this.bubbleMap[ key ];
	}
	getNumberOfBubbles()
	{
		var count = 0;
		for ( var b in this.bubbleMap )
			count++;
		return count - 1;
	}
	getLastBubble( exit )
	{
		exit = ( typeof exit == 'undefined' ? 'success' : exit );

		var found;
		var bubble = this.getBubble( 'root' );
		while ( bubble )
		{
			found = bubble;
			bubble = this.getBubble( bubble.properties.exits[ exit ] );
		}
		return found;
	}
	deleteBubble( key )
	{
		if ( this.bubbleMap[ key ] )
		{
			var newBubbleMap = {};
			for ( var b in this.bubbleMap )
			{
				if ( this.bubbleMap[ b ] )
					newBubbleMap[ b ] = this.bubbleMap[ b ];
			}
			this.bubbleMap = newBubbleMap;
			return;
		}
		this.awi.systemWarning( 'Bubble not found!' )
	}
	findBubble( callback )
	{
		for ( var key in this.bubbleMap )
		{
			if ( callback( this.bubbleMap[ key ] ) )
			{
				return this.bubbleMap[ key ];
			}
		}
		return null;
	}
	getBubbleChain( whereFrom, distance, howMany, exit )
	{
		exit = ( typeof exit == 'undefined' ? 'success' : exit );

		var bubble;
		var result = [];
		if ( whereFrom == 'end' )
		{
			bubble = this.getLastBubble( exit );
			while( bubble && distance > 0 )
			{
				bubble = this.getBubble( bubble.parent );
				distance--;
			}
			while( bubble && howMany > 0 )
			{
				result.push( bubble );
				bubble = this.getBubble( bubble.parent );
				howMany--;
			}
		}
		else
		{
			bubble = this.getBubble( 'root' );
			while( bubble && distance > 0 )
			{
				bubble = this.getBubble( bubble.properties.exits[ exit ] );
				distance--;
			}
			while( bubble && howMany > 0 )
			{
				result.push( bubble );
				bubble = this.getBubble( bubble.properties.exits[ exit ] );
				howMany--;
			}
		}
		return result;
	}
}
module.exports.Branch = Branch
