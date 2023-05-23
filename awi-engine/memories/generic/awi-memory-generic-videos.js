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

class MemoryAwiVideos extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'videos';
		this.classname = 'generic';
		this.name = 'Videos Souvenir Chain';
		this.properties.action = 'stores information about videos';
		this.properties.inputs = [
			{ userInput: 'what to find in the video', type: 'string' },
			{ interval: 'interval of time when the video was recorded', type: 'string', optional: false, default: 'any' },
		];
		this.properties.outputs = [ { memoryList: 'list of memories found', type: 'string.array' } ];
		this.properties.tags = [ 'memory', 'video' ];
		this.properties.content = [ 'video' ];
		this.properties.subTopics.push( ... [ 'memory', 'videos' ] );
	}
	async play( line, parameters, control, nested )
	{
		if ( !parameters.interval )
			parameters.interval = 'any';
		if ( !nested )
			control.memory.level = 1;
		else
			control.memory.level++;
		var answer = await this[ control.memory.command ]( line, parameters, control );
		control.memory.level--;
		return answer;
	}
	async playback( line, parameter, control )
	{
		super.playback( line, parameter, control );
	}
	async printData( line, parameters, control )
	{
		if ( control.memory.scanLevel > 0 && control.memory.level == 1 )
		{
			var text = 'Video recorded between ' + parameters.interval;
			this.awi.editor.print( this, text, { user: 'memory2' } );

			var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
			while( souvenir )
			{
				if ( souvenir.parameters )
					await souvenir.play( line, {}, control );
				souvenir = this.getBubble( souvenir.properties.exits[ 'success' ] );
			};
		}
	}
	async findSouvenirs( line, parameters, control )
	{
		var directSouvenirs = [];
		var indirectSouvenirs = [];
		this.awi.prompt.waitForInput = true;
		if ( control.memory.scanLevel > 0 && control.memory.level == 1 )
		{
			var bubble = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
			while( bubble )
			{
				if ( bubble.parameters )
				{
					var info2 = this.awi.utilities.matchTwoStrings( bubble.parameters.senderName, parameters.senderName, { caseInsensitive: true } );
					if ( info2.result == 1 )
					{
						var within = this.awi.utilities.isStatsWithinInterval( bubble.parameters.stats, parameters.interval );
						if ( within )
							directSouvenirs.push( bubble );
					}
				}
				bubble = this.getBubble( bubble.properties.exits[ 'success' ] );
			};
			if ( directSouvenirs.length > 0 )
			{
				this.awi.prompt.waitForInput = true;
				if ( control.memory.scanLevel > 1 )
				{
					var text = '';
					for ( var s = 0; s < directSouvenirs.length; s++ )
					{
						var answer = await directSouvenirs[ s ].play( parameters.userInput, parameters, control, true );
						if ( answer.success = 'found' )
						{
							for ( var ss = 0; ss < answer.data.indirectSouvenirs.length; ss++ )
								text += answer.data.indirectSouvenirs[ ss ].parameters.text;
						}
					}
					var bubble = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
					while( bubble )
					{
						var found = directSouvenirs.findIndex(
							function( element )
							{
								return element === bubble;
							} );
						if ( found < 0 )
						{
							control.start = 'root';
							control.caseInsensitive = true;
							var answer = await bubble.play( text, parameters, control, true );
							if ( answer.success = 'found' )
								indirectSouvenirs.push( ...answer.data.indirectSouvenirs );
						}
						bubble = this.getBubble( bubble.properties.exits[ 'success' ] );
					};
				}
				this.awi.prompt.waitForInput = false;
			}
			return { success: 'found', data: { directSouvenirs: directSouvenirs }, indirectSouvenirs: indirectSouvenirs };
		}
		if ( control.memory.scanLevel > 1 && control.memory.level == 2 )
		{
			var bubble = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
			while( bubble )
			{
				var answer = await bubble.play( parameters.userInput, parameters, this.awi.utilities.copyObject( control ) );
				if ( answer.success == 'found' )
					indirectSouvenirs.push( ...answer.data );
				bubble = this.getBubble( bubble.properties.exits[ 'success' ] );
			};
			if ( indirectSouvenirs.length > 0 )
				return { success: 'found', data: { indirectSouvenirs: directSouvenirs } };
		}
		return { success: 'notfound' };
	}
}
module.exports.Memory = MemoryAwiVideos;
