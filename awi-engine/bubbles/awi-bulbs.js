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
* @file awi-bubble-awi-bulb.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short A tree of bubbles that works as a bubble: a bulb.
*
*/
var awitree = require( '../trees/awi-trees' );


class Bulb extends awitree.Tree
{
	constructor( awi, options )
	{
		super( 'treeroot', {}, null );
		this.awi = awi;
		this.id = options.id; 		
		this.key = options.id;
		this.classname = 'bulb';
		this.oClass = 'bulb';
		this.options = options;
		this.parameters = options.parameters ? options.parameters : {};
		this.useCount = 0;
		this.idCount = 0;
		options.errorClass = typeof options.errorClass ? options.errorClass : 'newBubbles';
		this.addBubble( { token: 'error', parentClass: options.errorClass, parameters: [], options: {}, onSuccess: {}, onError: '' }, [], {} );
		this.currentBubble = null;
		this.addBubble( { token: 'root', parentClass: options.errorClass, parameters: [], options: {}, onSuccess: {}, onError: '' }, [], {} );
		this.pathway = 'self.nodes';
		this.pathways = [];
		this.working = 0;
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
		if ( options.exits )		
		{
			for ( var s in options.exits )
				this.properties.exits[ s ] = options.exits[ s ];
		}		
	}
	reset()
	{
		super.reset()
		this.pathway = 'self.nodes';
		this.pathways = [];
	}
	newBubble( command, parameters = [], control = {} )
	{
		if ( !parameters || parameters.length == 0 )
			parameters = command.parameters;
		var id = ( command.id ? command.id : this.awi.utilities.getUniqueIdentifier( this.nodes, command.token, this.idCount++ ) );
		var parent = command.parent ? command.parent : this.currentBubble;
		var parentClass = ( typeof command.parentClass == 'undefined' ? 'newBubbles' : command.parentClass );
		var classname =  ( typeof command.classname == 'undefined' ? 'awi' : command.classname );
		var exits =  ( typeof command.exits == 'undefined' ? { success: '' } : command.exits );
		var newBubble = new this.awi[ parentClass ][ classname ][ command.token ]( this.awi, { id: id, bulb: this, parent: parent, exits: exits, parameters: parameters } );		if ( typeof parent != 'string' )
		{
			parent.properties.exits.success = newBubble;
		}
		return newBubble;
	}
	addBubbles( commandList, control = {} )
	{
		for ( var c = 0; c < commandList.length; c++ )
		{
			this.addBubble( commandList[ c ], commandList[ c ].parameters, control );
		}
	}
	addBubble( command, parameters = [], control = {} )
	{
		var bubble, parentId;
		var doNew = true;
		if ( typeof command.properties != 'undefined' && typeof command.properties.exits != 'undefined' )
		{
			bubble = command;
			doNew = false;
		}
		if ( this.currentBubble )
		{
			command.parent = this.currentBubble;
			command.id = this.awi.utilities.getUniqueIdentifier( this.nodes, command.token, this.idCount++ );
			parentId = command.parent.id;
		}
		else
		{
			command.parent = 'treeroot';
			command.id = command.token;
			parentId = 'treeroot';
		}
		if ( doNew )
			bubble = this.newBubble( command, parameters, control );
		bubble.previous = bubble.parent;
		this.insert( parentId, bubble.id, bubble );		
		if ( bubble.previous && typeof bubble.previous != 'string' )
			bubble.previous.properties.exits.success = bubble;
		this.currentBubble = bubble;
		return bubble.id;
	}
	addBubbleFromLine( line, control = {} )
	{
		var start;
		var command;
		var parameters = [];
		parameters.push( { name: 'originalInput', value: line } );
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
					classname: 'awi',
					parameters: parameters, 
					options: options, 
					exits: {}
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
						options: {}, 
						exits: {}
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
				classname: 'awi',
				parameters: parameters, 
				options: {}, 
				exits: {}
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
		this.addBubble( command, parameters, control );
		return line;
	}
	deleteBubble( id )
	{
		if ( this.remove( id ) )
			this.awi.systemWarning( 'Bubble not found!' )
	}
	reset()
	{
		for ( var node in this.nodes ) 
		{
			if ( this.nodes[ node ].value )
				this.nodes[ node ].value.reset();
		}
	}
	async play( line, parameters, control = {} )
	{
		var bubble = this.currentBubble;
		if ( !bubble || control.start == 'root' || bubble.token == 'root' )
		{
			bubble = this.getBubble( 'root' );
			this.currentBubble = bubble;
			this.reset();
			this.working = 0;
		}
		if ( !bubble )
			return { success: false, data: {}, error: 'awi:no-bubble-to-play:iwa' };
		control.start = null;

		var answer;
		this.working++;
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
					}
					else
					{
						for ( var o = 0; o < bubble.properties.length; o++ )
						{
							var output = this.awi.utilities.getBubbleParams( bubble.properties.outputs[ o ] );
							bubble.data[ output.name ] = answer.data[ output.name ];
						}
					}
				}
			}
			else if ( answer.error )
			{
				this.awi.editor.print( this, answer.error.split( '\n' ), { user: 'error' } );
				exit = null;
			}
			this.pathway = this.pathway.substring( 0, this.pathway.lastIndexOf( '.' ) );
			bubble = exit;
		} while ( bubble );
		if ( answer.success )
			answer.success = 'end';
		this.working--;
		return answer;
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
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
		return await this.run( position, 'transpile', line, data, control );
	}
	async serialize( position, path, data, control )
	{
		return await this.run( position, 'serialize', path, data, control );
	}
	getLastData( bubble, token )
	{
		var bubble = bubble.previous;
		while( bubble )
		{
			for ( var p = 0; p < bubble.properties.outputs.length; p++ )
			{
				var output = this.awi.utilities.getBubbleParams( bubble.properties.outputs[ p ] );
				if ( output.name == token )
					return bubble.data;
			}
			bubble = bubble.previous;
		}
		return null;
	}
	getBubble( id )
	{
		if ( typeof id == 'string' )
		{
			if ( this.nodes[ id ] )
				return this.nodes[ id ].value;
		}
		return undefined;
	}
	getLastBubble( exit )
	{
		exit = ( typeof exit == 'undefined' ? 'success' : exit );

		var found;
		var bubble = this.getBubble( 'root' );
		while ( bubble && typeof bubble != 'string' )
		{
			found = bubble;
			bubble = bubble.properties.exits[ exit ];
		}
		return found;
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
				bubble = bubble.previous;
				distance--;
			}
			while( bubble && howMany > 0 )
			{
				result.push( bubble );
				bubble = bubble.previous;
				howMany--;
			}
		}
		else
		{
			bubble = this.getBubble( 'root' );
			while( bubble && distance > 0 )
			{
				bubble = bubble.exits[ exit ];
				distance--;
			}
			while( bubble && howMany > 0 )
			{
				result.push( bubble );
				bubble = bubble.exits[ exit ];
				howMany--;
			}
		}
		return result;
	}
	getNumberOfBubbles()
	{
		return Math.max( this.getLength() - 1, 0 );
	}
	recallLastBubbles( howMany )
	{
		var memory = [];
		var bubbles = this.getBubbleChain( 'end', 1, howMany );
		for ( var b = bubbles.length - 1; b >= 0; b-- )
		{
			var bubble = bubbles[ b ];
			if ( bubble.token == 'chat' )
			{
				if ( !bubble.empty )
				{
					for ( var p = 0; p < bubble.parameters.length; p++ )
					{
						if ( bubble.parameters[ p ].name == 'userInput' )
						{
							memory.push( 
							{
								userText: bubble.parameters[ p ].value,
								contactText: bubble.data.join( ' ' )
							} );
							break;
						}
					}
				}
			}
		}
		return memory;
	}
}
module.exports.Bulb = Bulb

