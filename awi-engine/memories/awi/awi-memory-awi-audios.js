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
* @file awi-memory-awi-videos.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Video memory bulb
*
*/
var awimemory = require( '../awi-memory' );

class MemoryAwiAudios extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'audios';	
		this.classname = 'awi';
		this.name = 'Audio Souvenir Chain';	
		this.properties.action = 'stores information about audio files';
		this.properties.inputs = [
			{ userInput: 'what to find in the audio file', type: 'string' },
			{ interval: 'interval of time when the audio file was recorded', type: 'string', optional: false, default: 'any' },
		];
		this.properties.outputs = [ { memoryList: 'list of memories found', type: 'string.array' } ];
		this.properties.tags = [ 'memory', 'audio' ];
		this.properties.content = [ 'audio' ];
		this.properties.subTopics.push( ... [ 'memory', 'audioss' ] );
	}
	async play( line, parameters, control, nested )
	{		
		if ( !parameters.interval )
			parameters.interval = 'any';
		if ( !nested )
			control.memory.level = 1;
		else
			control.memory.level++;
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
	async printData( line, parameters, control )
	{
		if ( control.memory.scanLevel > 0 && control.memory.level == 1 )
		{	
			var text = 'Audio file recorded on the XXX:XXX';
			this.awi.editor.print( this, text, { user: 'memory2' } );

			var souvenir = this.getBubble( 'root' ).properties.exits[ 'success' ];
			while( souvenir )
			{
				if ( souvenir.parameters )
					await souvenir.play( line, {}, control );
				souvenir = souvenir.properties.exits[ 'success' ];
			};
		}
	}
	async findSouvenirs( line, parameters, control )
	{
		var directSouvenirs = [];
		var indirectSouvenirs = [];
		if ( control.memory.scanLevel > 0 && control.memory.level == 1 )
		{	
			var bubble = this.getBubble( 'root' ).properties.exits[ 'success' ];
			while( bubble )
			{
				if ( bubble.parameters )
				{
					var info2 = this.awi.utilities.matchTwoStrings( bubble.parameters.senderName, parameters.senderName, { caseInsensitive: true } );
					if ( info2.result == 1 /*&& info1.score >= 1*/ )
					{
						directSouvenirs.push( bubble );
					}
				}
				bubble = bubble.properties.exits[ 'success' ];
			} while ( bubble );

			if ( control.memory.scanLevel > 1 )
			{	
				var bubble = this.getBubble( 'root' ).properties.exits[ 'success' ];
				while( bubble )
				{
					var found = directSouvenirs.findIndex( 
						function( element )
						{
							return element === bubble;
						} );
					if ( found < 0 && bubble.parameters )
					{
						control.start = 'root';
						control.caseInsensitive = true;
						this.awi.prompt.waitForInput = true;
						var answer = await bubble.play( parameters.userInput, parameters, control, true );
						if ( answer.success = 'found' )
							indirectSouvenirs.push( ...answer.data.indirectSouvenirs );
						this.awi.prompt.waitForInput = false;
					}
					bubble = bubble.properties.exits[ 'success' ];
				};
			}	
		}
		if ( control.memory.scanLevel > 1 && control.memory.level == 2 )
		{	
			var bubble = this.getBubble( 'root' ).properties.exits[ 'success' ];
			while( bubble )
			{
				if ( bubble.parameters && bubble.parameters.conversation && bubble.parameters.conversation.length )
				{
					var info3 = this.awi.utilities.matchTwoStrings( bubble.parameters.conversation, parameters.userInput, { caseInsensitive: true } );
					if ( info3.result > 0 )
						indirectSouvenirs.push( bubble );
				}
				bubble = bubble.properties.exits[ 'success' ];
			};
		}

		control.memory.level--;
		if ( directSouvenirs.length > 0 || indirectSouvenirs.length > 0 )
			return { success: 'found', data: { directSouvenirs: directSouvenirs, indirectSouvenirs: indirectSouvenirs } };
		return { success: 'notfound', data: { directSouvenirs: [], indirectSouvenirs: [] } };
	}
}
module.exports.Memory = MemoryAwiAudios;
