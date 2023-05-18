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
* @file awi-connector-editors-adobe.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Future connector to Adobe software (puppets actors etc.)
*
*/
var awiconnector = require( '../awi-connector' );
const readline = require('readline');

class ConnectorEditorCommandline extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Node Command-line';
		this.token = 'commandline';
		this.classname = 'editor';
		this.version = '0.2';
		this.connected = false;
		this.inputEnabled = false;
		this.inputHandle = null;
		this.reroute = undefined;
		this.range = { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } };
		this.readline = readline.createInterface(
		{
			input: process.stdin,
			output: process.stdout,
		} );			
		var self = this;
		var control = {};
		var data = {};
		this.readline.on( 'line', function( input )
		{
			if ( self.inputEnabled )
			{
				if ( self.reroute )
					self.reroute( input, data, control );
				else
					self.awi.prompt.prompt( input, data, control );
			}
		} );
	}
	async connect( options )
	{
		super.connect( options );
		this.connected = true;
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}	
	rerouteInput( route )
	{
		this.reroute = route;
	}
	disableInput()
	{
		this.inputEnabled = false;
	}
	waitForInput( line, options = {} ) 
	{
		if ( !this.inputEnabled )		
		{
			var self = this;
			if ( this.inputHandle )
				clearTimeout( this.inputHandle );
			this.inputHandle = setTimeout(
				function()
				{
					self.inputEnabled = true;
					self.inputHandle = null;
				}, 250 );
			if ( line )
				this.readline.write( line );
			return;
		}
		if ( options.toPrint )
			this.readline.write( options.toPrint );
	}
	close()
	{
	}
	fillPaths( paths )
	{
		for ( var p in paths )
			paths[ p ] = this.atom.aozConfig.installInformation.runPaths[ p ];
	}
	activateEvents()
	{
		this.eventsActivated = true;
	}
	deactivateEvents()
	{
		this.eventsActivated = false;
	}
	blockCursor( onOff, callback, extra )
	{
		// Block the cursor on the command line
		this.blockCursorOn = onOff;
	}
	wait( onOff, options = {} )
	{
		this.waitingOn = onOff;
	}
	interpretLine( line )
	{
		return line;
	}
	print( parent, text, options = {} )
	{
		options.user = typeof options.user == 'undefined' ? 'awi' : options.user;
		
		var prompt = this.awi.config.getPrompt( options.user );
		if ( !prompt )
			return;
		var row = 0;
		if ( typeof text == 'string' )
			text = text.split( '\n' );
		var self = this;
		function printLinesDown( lines )
		{
			for ( var l = 0; l < lines.length; l++ )
			{
				self.readline.write( prompt + lines[ l ] + '\n' );
				//console.log( prompt + lines[ l ] );
				row++;
			}
		}
		for ( var t = 0; t < text.length; t++ )
		{
			var line = this.interpretLine( text[ t ] );
			if ( !options.noJustify )
				printLinesDown( this.awi.utilities.justifyText( line, 80 ) );
			else
			{
				this.readline.write( prompt + line + '\n' );
				row++;
			}
		}
	}
	decorateLine( row, user )
	{
	}
	getStartPrompt( range )
	{
		return range;
	}
	createCheckpoint( range )
	{
		return range;
	}
	startAnimation( characterName, animationName, options = {} )
	{
	}
	printAnimation( characterName, animationName, options = {} )
	{
	}
	stopAnimation()
	{
	}
	playVideo( path, options = {} )
	{
	}
	playAudio( path, options = {} )
	{
	}
	viewFile( file, options )
	{
	}
	getLine( row )
	{
		return '';
	}
	setLine( row, text, options = {} )
	{
	}
	insertLine( row, text/*, options = {} */)
	{
	}
	deleteLine( row, options = {} )
	{
	}
	getRow()
	{
		return 0;
	}
	getColumn()
	{
		return 0;
	}
	getPosition()
	{
		return [ 0, 0 ];
	}
	setPosition( row, column )
	{
	}
	setColumn( column )
	{
	}
	setRow( row )
	{
	}	
	moveUp( nTimes )
	{
	}
	moveDown( nTimes )
	{
	}
	moveLeft( nTimes )
	{
	}
	moveRight( nTimes )
	{
	}
}
module.exports.Connector = ConnectorEditorCommandline;
