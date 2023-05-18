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
* @file awi-connector-editors-vscode.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Future connector to VsCode editor
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorEditorVscode extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'vscode';
		this.name = 'Vscode extension connector';
		this.classname = 'editor';
		this.version = '0.2';

		this.prompts = this.awi.getConfig( 'system' ).prompts;
		this.blockCursorOn = false;
		this.eventsActivated = false;
	}
	async connect( options )
	{
		return super.connect( options );
	}
	close()
	{

	}
	fillPaths( paths )
	{
	}
	activateEvents()
	{
	}
	deactivateEvents()
	{
	}
	blockCursor( onOff, callback, extra )
	{
	}
	wait( onOff, options = {} )
	{
	}
	interpretLine( line )
	{
		return line;
	}
	print( text, options )
	{
		var self = this;
		var user = typeof options.user == 'undefined' ? 'user' : options.user;		
		var row = this.getRow();
		if ( this.printUp )
		{
			function printLinesUp( lines )
			{
				for ( var l = 0; l < lines.length; l++ )
				{
					this.insertLine( row - 1, self.prompts[ user ] + lines[ l ] );
					row++;
				}
			}
			for ( var t = 0; t < text.length; t++ )
			{
				var line = this.interpretLine( text[ t ] );
				if ( !options.noJustify )
					printLinesUp( this.awi.utilities.justifyText( line, 80 ) );
				else
				{
					this.insertLine( row - 1, self.prompts[ user ] + line );
					row++;
				}
			}
		}
		else
		{
			function printLinesDown( lines )
			{
				for ( var l = 0; l < lines.length; l++ )
				{
					this.insertLine( row, self.prompts[ user ] + line );
					this.moveDown();
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
					this.insertLine( row, self.prompts[ user ] + line );
					this.moveDown();
					row++;
				}
			}
		}
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

	// Editing commands
	getLine( row )
	{
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
	}
	getColumn()
	{
	}
	getPosition()
	{
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
module.exports.Connector = ConnectorEditorVscode;
