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
		this.properties.topic = '';
		this.properties.subTopics = [];
		this.properties.interval = { start: null, end: null };
		if ( options.parameters )
		{
			if ( options.parameters.topic )
				this.properties.topic = options.parameters.topic;
			if ( options.parameters.subTopics )
				this.properties.subTopics.push( ...options.parameters.subTopics );
			if ( options.parameters.interval )
				this.properties.interval = options.parameters.interval;
		}
	}
	remember( line, data, callback, options )
	{

	}
	recallWord( word )
	{
		var result = 
		{
			user: { totalCount: 0, wordCount: 0, probability: 0, text: '' },
			contact: { totalCount: 0, wordCount: 0, probability: 0, text: '' }
		};		

		function analyse( text )
		{
			var totalCount = 0;
			var wordCount = 0;
			var words = text.toLowerCase().split( '\n' ).join( ' ' ).split( ' ' );
			for ( var w = 0; w < words.length; w++ )
			{
				if ( word == words[ w ] )
					wordCount++;
				totalCount++;
			}
			if ( wordCount > 0 )
				return { totalCount: totalCount, wordCount: wordCount, probability: wordCount / totalCount, text: text }
			return null;
		}
		for ( var c = 0; c < this.commands.length; c++ )
		{
			var command = this.commands[ c ];
			for ( var p = 0; p < command.parameters.length; p++ )
			{
				var parameter = command.parameters [ p ];
				for ( var pp in parameter )
				{
					if ( pp == 'userText' )
					{
						info = analyse( parameter.userText );
						if ( info )
						{
							result.user.wordCount += info.wordCount;
							result.user.totalCount = info.totalCount;
							result.user.probability += info.wordCount / info.totalCount;
							result.user.text = info.text;
						}
					}
					if ( pp == 'contactText' )
					{
						var info = analyse( parameter.contactText );
						if ( info )
						{
							result.contact.wordCount += info.wordCount;
							result.contact.totalCount = info.totalCount;
							result.contact.probability += info.wordCount / info.totalCount;
							result.contact.text = info.text;
						}						
					}
				}
			}
		}
		if ( !result.user.wordCount && !result.contact.wordCount )
			return null;
		return result;
	}
	learn( line, data, callback, options )
	{

	}
	addMemory( command, parameters = [] )
	{
		if ( this.awi.utilities.isArray( command ) )
		{
			for ( var c = 0; c < command.length; c++ )
			{
				this.addSouvenir( command[ c ], parameters );
			}
		}
		else
		{
			command.errorClass = 'newMemories';
			command.parentClass = 'newMemories';
			return super.addBubble( command, parameters, {} );
		}
	}
	addSouvenir( command, parameters = [] )
	{
		command.errorClass = 'newSouvenirs';
		command.parentClass = 'newSouvenirs';
		return super.addBubble( command, parameters, {} );
	}
	addMemoryFromLine( line, control = {} )
	{
		return super.addBubbleFromLine( line, /*{ source: 'newSouvenirs' }*/ );
	}
}
module.exports.Memory = Memory;
