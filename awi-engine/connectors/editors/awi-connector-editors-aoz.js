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
* @file awi-connector-editors-aoz.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Connector to Aoz editor (under progress)
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorEditorAozRuntime extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Aoz IDE';
		this.token = 'aozide';
		this.classname = 'editor';
		this.version = '0.2';

		this.output = awi.systemConfig.printCallback;
		this.connected = false;
		this.inputEnabled = false;
		this.reroute = undefined;
		this.range = { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } };
	}
	async connect( options )
	{
		super.connect( options );
		this.connected = true;
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}
	close()
	{

	}
	rerouteInput( route )
	{
		this.reroute = route;
	}
	disableInput()
	{
		this.inputEnabled = false;
	}
	waitForInput( line ) 
	{
		this.inputEnabled = true;
		if ( line )
			this.promptCallback( line );
	}
	newInput( input )
	{
		if ( this.inputEnabled )
		{
			if ( this.reroute )
				this.reroute( input, {}, {} );
			else
				this.awi.prompt.prompt( input, {}, {} );
		}
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
		var result = [];
		var prompt = this.awi.config.getPrompt( options.user );
		if ( !prompt )
			return;
		if ( typeof text == 'string' )
			text = text.split( '\n' );
		function printLinesDown( lines )
		{
			for ( var l = 0; l < lines.length; l++ )
			{
				console.log( prompt + lines[ l ] );
				result.push( prompt + lines[ l ] );
			}
		}
		for ( var t = 0; t < text.length; t++ )
		{
			var line = this.interpretLine( text[ t ] );
			if ( !options.noJustify )
				printLinesDown( this.awi.utilities.justifyText( line, 80 ) );
			else
			{
				console.log( prompt + line );
				result.push( prompt + line );
			}
		}
		this.promptCallback( result );
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
module.exports.Connector = ConnectorEditorAozRuntime;
