/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal 
* (_)|____| |____|\__/\__/  [_||_]  \     Assistant
*
* This file is open-source under the conditions contained in the 
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-bubble-awi-help.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Help command: provides help about the awi-engine
*
*/
var awibubbles = require( '../awi-bubbles' );

class BubbleAwiHelp extends awibubbles.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Help';
		this.token = 'help';
		this.classname = 'awi';
		this.properties.action = 'provide help about using awi';
		this.properties.inputs = [ { userInput: 'the desired topic', type: 'string', optional: true, default: '' } ];
		this.properties.outputs = [ { helpTopic: 'help about the topic', type: 'string' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'system', 'help' ];
		this.properties.editables = 
		[
			{ name: 'welcome', type: 'text', content: `
Hello Awi help.
===============
1. Start any line with . to talk to Awi.
2. Type your question with or without command, Awi will answer.
3. Refine your questions until satisfied.
4. Press <ESCAPE> to erase the last prompt and go up in the conversation.
[wait]
Awi can do many things such as:
- Answer to general questions
- Refine a subject deeper and deeper 
- Find files and assets, import them for you
- Perform calculations and conversions
- Find mails from descriptions and extract data from them
- Copy, rename files on your computer with your authorisation
- Help you fix problems in software or hardware
etc.
[wait]
Such actions are called commands. As in a command line, you can 
directly call a command with it's name. 
Example, once the awi prompt is open after the initial ".awi", 
.find mypic*.png
..searching...
...<path>
...<path>
...<path>
.
You can ask help for the list of commands.
[wait]
Once a conversation has performed a bubble, and the result is the one
you expected (example, you found this kind of "blue" assets in your asset
directory), you can convert the conversation into a new command that will
be integrated to the list of commands. In the process "blue" will become 
a parameter. Ask for info on the subject by typing "help commands".
[wait]
You can also transpile the conversation into any language of your choice,
Aoz only for the moment, and it will become a function that, in our case,
will look for assets of a certain color.

Do you need help on a certain subject? If yes, just type ".help subject".
` 				},
			{ name: 'commands', type: 'text', content: `
Awi list of commands.
---------------------
This list is destined to grow.

Commands may or may not call Awi for a response.

.play filename.mp4/mp3/wav/ogg: Plays the given file. 
.calc <expression>: Calculates the result of a expression locally.
.hex <expression>: Displays the hexadecimal version of the expression.
.bin <expression>: Displays the binary version of the expression.
.run <application>: Launch an AOZ Application/accessory in the AOZ Viewer.
.find <file_name>: Locate a file in the Magic Drive and display its path
.import <file_name>: Same as above and adds the file in the resource folder.
.code <description>: Creates a procedure from the instructions.
.image <description>: Creates an image from the description.
.data <query>: Create Data segments with the result of the query.
.array <query>: Creates an array containing the elements from the query.
.prompt <fuzzy prompt>: Refines a prompt by asking the AI the best prompt.
.help displays that help (or an empty prompt).
` 				}
		]
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		var text = this.findEditable( parameters.userInput ); 
		if ( !text )
			text = this.findEditable( 'welcome' ); 
		text = text.content.split( '\r\n' ).join( '\n' ).split( '\n' )
		this.awi.editor.print( this, text, { user: 'awi' } );		
		return { success: true, data: text };
	}
	transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
	undo( options )
	{
		super.undo( options );
	}
	redo( options )
	{
		super.redo( options );
	}
}
module.exports.Bubble = BubbleAwiHelp;
