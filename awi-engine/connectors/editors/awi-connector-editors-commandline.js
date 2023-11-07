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
* @version 0.3
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
		this.noInput = 0;
		this.editors = {};
	}
	async connect( options )
	{
		super.connect( options );
		this.default = this.addEditor();
		this.connected = true;
		this.connectAnswer.data.token = this.classname;
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}
	addEditor()
	{
		var rline = readline.createInterface(
		{
			input: process.stdin,
			output: process.stdout,
		} );
		var handle = this.awi.utilities.getUniqueIdentifier( this.editors, 'cmd', 0 );
		var editor = {
			handle: handle,
			readline: rline,
			inputEnabled: false,
			reroute: undefined,
			self: this,
			awi: this };
		this.editors[ handle ] = editor;

		var self = this;
		rline.on( 'line', function( input )
		{
			if ( self.noInput == 0 )
			{
				if ( editor.reroute )
					editor.reroute( input, {}, { editor: editor } );
				else
					self.awi.prompt.prompt( input, {}, { editor: editor } );
			}
			else
			{
				self.noInput--;
			}
		} );
		return editor;
	}

	rerouteInput( editor, route )
	{
		editor.reroute = route;
	}
	disableInput( editor )
	{
		editor.inputEnabled = false;
		editor.readline.pause();
	}
	setPrompt( editor, prompt )
	{
		editor.readline.setPrompt( prompt );
	}
	waitForInput( editor, options = {} )
	{
		editor.inputEnabled = true;
		editor.readline.prompt( true );
		return;
	}
	saveInputs( editor )
	{
		editor.pushedInputs = editor.inputDisabled;
		editor.inputDisabled = 1;
	}
	restoreInputs( editor )
	{
		editor.inputDisabled = editor.inputDisabled;
	}
	close( editor )
	{
		if ( editor.handleNoInput )
			clearInterval( editor.handleNoInput );
	}
	wait( editor, onOff, options = {} )
	{
		editor.waitingOn = onOff;
	}
	interpretLine( line )
	{
		return line;
	}
	print( editor, text, options = {} )
	{
		options.user = typeof options.user == 'undefined' ? 'awi' : options.user;

		var prompt = this.awi.config.getPrompt( options.user );
		if ( !prompt )
			return;

		var self = this;
		//var justify = this.awi.getConfig( 'user' ).justify;
		var justify = 80;
		if ( typeof text == 'string' )
			text = text.split( '\n' );
		function printLinesDown( lines )
		{
			for ( var l = 0; l < lines.length; l++ )
			{
				self.noInput++;
				editor.readline.write( prompt + lines[ l ] + '\n' );
			}
		}
		for ( var t = 0; t < text.length; t++ )
		{
			var line = this.interpretLine( text[ t ] );
			if ( !options.noJustify )
			{
				printLinesDown( this.awi.utilities.justifyText( line, justify ) );
			}
			else
			{
				this.noInput++;
				editor.readline.write( prompt + line + '\n' );
			}
		}
	}
}
module.exports.Connector = ConnectorEditorCommandline;
