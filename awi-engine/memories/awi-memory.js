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
* @file awi-memory.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Memory bulb
*
*/
var awibulbs = require( '../bubbles/awi-bulbs' )

class Memory extends awibulbs.Bulb
{
	constructor( awi, options = {} )
	{
		options.parentClass = 'newMemories';
		options.errorClass = 'newSouvenirs';
		super( awi, options );
		this.parameters.senderName = typeof this.parameters.senderName == 'undefined' ? '' : this.parameters.senderName;
		this.parameters.receiverName = typeof this.parameters.receiverName == 'undefined' ? '' : this.parameters.receiverName;
		this.classname = 'memory';
		this.oClass = 'memory';
		this.bubbleHash = {};
		}
	async play( line, parameters, control, nested )
	{
		return parameters;
	}
	async playback( line, parameter, control )
	{
		return parameters;
	}
	async extractContent( line, parameters, control )
	{
		var content = [];
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		while ( souvenir )
		{
			var answer = await souvenir.extractContent( line, parameters, control );
			if ( answer.success )
				content.push( answer.data );
			souvenir = this.getBubble( souvenir.properties.exits[ 'success' ] );
		}
		if ( content.length )
			return { success: 'found', content: content };
		return { success: 'notfound' };
	}
	async getContent( line, parameters, control )
		{
		var content = [];
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		while ( souvenir )
			{
			var answer = await souvenir.getContent( line, parameters, control );
			if ( answer.success )
				content.push( answer.data );
			souvenir = this.getBubble( souvenir.properties.exits[ 'success' ] );
			}
		if ( content.length )
			return { success: 'found', content: content };
		return { success: 'notfound' };
		}
	async findSouvenirs( line, parameters, control )
		{
		var directSouvenirs = [];
		var indirectSouvenirs = [];
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		while( souvenir )
			{
			var info1 = this.awi.utilities.matchTwoStrings( souvenir.parameters.receiverName, line, { caseInsensitive: true } );
			if ( info1.result >= 0.5 )
				{
				if ( parameters.senderName )
					{
					var info2 = this.awi.utilities.matchTwoStrings( souvenir.parameters.senderName, parameters.senderName, { caseInsensitive: true } );
					if ( info2.result == 1 )
						directSouvenirs.push( souvenir );
				}
				else
						{
					directSouvenirs.push( souvenir );
						}
					}
			else
						{
				var answer = await souvenir.findSouvenirs( line, parameters, control );
				if ( answer.success == 'found' )
					indirectSouvenirs.push( souvenir );
					}
			souvenir = this.getBubble( souvenir.properties.exits[ 'success' ] );
		} while ( souvenir );
		var directContent = [];
		var indirectContent = [];
		for ( var s = 0; s < directSouvenirs.length; s++ )
		{
			var answer = await directSouvenirs[ s ].getContent( line, parameters, control );
			directContent.push( answer.data );
		}
		for ( var s = 0; s < indirectSouvenirs.length; s++ )
		{
			var answer = await indirectSouvenirs[ s ].getContent( line, parameters, control );
			indirectContent.push( answer.data );
		}
		if ( directSouvenirs.length > 0 || indirectSouvenirs.length > 0 )
			return {
				success: 'found',
				data: {
					direct: { souvenirs: directSouvenirs, content: directContent },
					indirect: { souvenirs: indirectSouvenirs, content: indirectContent }
				} };
		return { success: 'notfound' };
				}
	addMemory( memory, control = {} )
	{
		return super.addBubble( memory, control );
			}
	addMemories( memories, parameters = {}, control = {} )
	{
		return super.addBubble( memories, parameters, control );
	}
	addSouvenir( souvenir, control = {} )
	{
		var hash = this.awi.utilities.objectHash( souvenir.parameters );
		if ( !this.bubbleHash[ hash ] )
		{
			this.bubbleHash[ hash ] = souvenir.key;
			return super.addBubble( souvenir, control );
		}
		return '';
	}
	addSouvenirs( commandList, parameters = {}, control = {} )
	{
		return super.addBubble( commandList, parameters, control );
	}
}
module.exports.Memory = Memory;
