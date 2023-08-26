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
* @file awi-connector-utilities-parser.js
* @author FL (Francois Lionet)
* @date first pushed on 10/06/2023
* @version 0.3
*
* @short English language parser based on Compromise
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorUtilitiesParser extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Parser';
		this.token = 'parser';
		this.classname = 'utilities';
		this.version = '0.3';
		this.tags = {
			noun: {
				singular: {
					person: {},
					firstName: {},
					maleName: {},
					femaleName: {},
					lastName: {}
				},
				place: {
					country: {},
					city: {},
					region: {},
					address: {}
				},
				organization: {
					sportsTeam: {},
					company: {},
					school: {}
				},
				properNoun: {},
				honorific: {},
				plural: {},
				uncountable: {},
				pronoun: {},
				actor: {},
				activity: {},
				unit: {},
				demonym: {},
				possessive: {}
			},
			verb: {
				presentTense: {
					infinitive: {},
					gerund: {}
				},
				pastTense: {},
				perfectTense: {},
				futurePerfect: {},
				pluperfect: {},
				copula: {},
				modal: {},
				participle: {},
				particle: {},
				phrasalVerb: {}
			},
			value: {
				ordinal: {},
				cardinal: {
					romanNumeral: {},
				},
				multiple: {},
				fraction: {},
				textValue: {},
				numericValue: {},
				percent: {},
				money: {}
			},
			date: {
				month: {},
				weekDay: {},
				relativeDay: {},
				year: {},
				duration: {},
				time: {},
				holiday: {}
			},
			adjective: {
				comparable: {},
				comparative: {},
				superlative: {}
			},
			contraction: {},
			adverb: {},
			currency: {},
			determiner: {},
			conjunction: {},
			preposition: {},
			questionWord: {},
			pronoun: {},
			expression: {},
			abbreviation: {},
			url: {},
			hashTag: {},
			phoneNumber: {},
			atMention: {},
			emoji: {},
			emoticon: {},
			email: {},
			auxiliary: {},
			negative: {},
			acronym: {}
		}
	}
	async connect( options )
	{
		super.connect( options );
		var answer = await this.awi.utilities.loadJavascript( this.awi.config.getEnginePath() + '/data/libs/compromise.js' );
		if ( answer.success )
			this.compromise = answer.data.result;
		this.connected = answer.success;
		this.connectAnswer.success = answer.success;
		return this.connectAnswer;
	}
	findWordDefinition( source, names, task )
	{
		if ( typeof names == 'string' )
		{
			if ( typeof names == 'undefined' || typeof source == 'undefined' )
				return null;

			if ( task == 'find' )
			{
				var found = source.findIndex(
					function( element )
					{
						var pos = names.indexOf( element );
						if ( pos < 0 )
							return false;
						var bad = false;
						if ( pos > 0 )
							bad = ( names.charAt( pos - 1 ) != ' ' );
						if ( pos + element.length < names.length )
						{
							var c = names.charAt( pos + element.length );
							if ( c == 's' && names.charAt( pos + element.length ) == ' ' )
								return true;
							bad = ( c != ' ' );
						}
						return !bad;
					} );
					if ( found >= 0 )
						return source[ found ];
				return null;
			}
			for ( var s in source )
			{
				var found = source[ s ].names.findIndex(
					function( element )
					{
						var pos = names.indexOf( element );
						if ( pos < 0 )
							return false;
						var bad = false;
						if ( pos > 0 )
							bad = ( names.charAt( pos - 1 ) != ' ' );
						if ( pos + element.length < names.length )
						{
							var c = names.charAt( pos + element.length );
							if ( c == 's' && names.charAt( pos + element.length ) == ' ' )
								return true;
							bad = ( c != ' ' );
						}
						return !bad;
					} );
				if ( found >= 0 )
					return source[ s ];
			}
			return null;
		}
		var result = [];
		if ( typeof names != 'undefined' && typeof source != 'undefined' )
		{
			if ( task == 'find' )
			{
				var found = source.findIndex(
					function( element )
					{
						for ( var n = 0; n < names.length; n++ )
						{
							var name = names[ n ];
							var pos = name.indexOf( element );
							if ( pos >= 0 )
							{
								var bad = false;
								if ( pos > 0 )
									bad = ( name.charAt( pos - 1 ) != ' ' );
								if ( pos + element.length < name.length )
								{
									var c = name.charAt( pos + element.length );
									if ( c == 's' && name.charAt( pos + element.length ) == ' ' )
										return true;
									bad = ( c != ' ' );
								}
								return !bad;
							}
						}
					} );
					if ( found >= 0 )
						return source[ found ];
				return null;
			}
			for ( var s in source )
			{
				var found = source[ s ].names.findIndex(
					function( element )
					{
						for ( var n = 0; n < names.length; n++ )
						{
							var name = names[ n ];
							var pos = name.indexOf( element );
							if ( pos >= 0 )
							{
								var bad = false;
								if ( pos > 0 )
									bad = ( name.charAt( pos - 1 ) != ' ' );
								if ( pos + element.length < name.length )
								{
									var c = name.charAt( pos + element.length );
									if ( c == 's' && name.charAt( pos + element.length ) == ' ' )
										return true;
									bad = ( c != ' ' );
								}
								return !bad;
							}
						}
						return false;
					} );
				if ( found >= 0 )
					result.push( source[ s ] );
			}
		}
		return result;
	}
	async extractCommandFromLine( line, control )
	{
		var self = this;
		var toRemove = [];
		var toAdd = [];
		var tagsMap = {};
		var doc = nlp( line );
		var command;
		var rootDoc = doc.normalize( {
			whitespace: true,			// remove hyphens, newlines, and force one space between words
			case: true,					// keep only first-word, and 'entity' titlecasing
			punctuation: true,			// remove commas, semicolons - but keep sentence-ending punctuation
			unicode: true,				// visually romanize/anglicize 'Björk' into 'Bjork'.
			contractions: true,			// turn "isn't" to "is not"
			acronyms:true,				// remove periods from acronyms, like 'F.B.I.'
			//---these ones don't run unless you want them to---
			parentheses: true,			//remove words inside brackets (like these)
			possessives: true,			// turn "Google's tax return" to "Google tax return"
			plurals: true,				// turn "batmobiles" into "batmobile"
			verbs: true,				// turn all verbs into Infinitive form - "I walked" → "I walk"
			honorifics: true,			//turn 'Vice Admiral John Smith' to 'John Smith'
		} );
		function getTags( tags, text )
		{
			var text = '';
			for ( var tag in tags )
			{
				if ( tag != 'data' )
				{
					var arr = [];
					var str = text + ( text == '' ? '' : '.' ) + tag;
					getTags( tags[ tag ], str );
					var tagName = '#' + tag.charAt( 0 ).toUpperCase() + tag.substring( 1 );
					switch ( tagName )
					{
						case '#Noun':
							var newArr = [];
							arr = rootDoc.nouns().toSingular().out( 'array' );
							for ( var a = 0; a < arr.length; a++ )
								newArr.push( ...arr[ a ].split( ' ' ) );
							arr = newArr;
							break;
						default:
							arr = rootDoc.match( tagName ).out( 'array' );
							break;
					}
					if ( arr.length > 0 )
					{
						tagsMap[ tag ] = arr;
						text += str + ': ' + tagsMap[ tag ] + '\n';
					}
				}
			}
		}
		function extractDates( names )
		{
			var extraDates = self.findWordDefinition( self.awi.time.extraDates, names );
			for ( var e = 0; e < extraDates.length; e++ )
			{
				var quit = false;
				var extraDate = extraDates[ e ];
				for ( var a in self.awi.time.extraDateAdjectives )
				{
					var adjective = self.awi.time.extraDateAdjectives[ a ];
					for ( var n = 0; n < adjective.names.length; n++ )
					{
						var match = rootDoc.match( adjective.names[ n ] + ' ' + extraDate.names[ 0 ] ).text();
						if ( match )
						{
							extraDate.delta = adjective.delta;
							toRemove.push( adjective.names[ n ] );
							quit = true;
							break;
						}
					}
					if ( quit )
						break;
				}
				// Convert the dates to time interval
				command.parameters.date.push( self.awi.time.getTimeOrDate( extraDate, 'date' ) );
			}
		}
		function extractTimes( names )
		{
			var extraTimes = self.findWordDefinition( self.awi.time.extraTimes, names );
			for ( var e = 0; e < extraTimes.length; e++ )
			{
				var quit = false;
				var extraTime = extraTimes[ e ];
				for ( var a in self.awi.time.extraTimeAdjectives )
				{
					var adjective = self.awi.time.extraTimeAdjectives[ a ];
					for ( var n = 0; n < adjective.names.length; n++ )
					{
						var match = rootDoc.match( adjective.names[ n ] + ' ' + extraTime.names[ 0 ] ).text();
						if ( match )
						{
							extraTime.delta = adjective.delta;
							quit = true;
							break;
						}
					}
					if ( quit )
						break;
				}
				// Convert the dates to time interval
				command.parameters.time.push( self.awi.time.getTimeOrDate( extraTime, 'time' ) );
			}
		}
		async function getParameters( bubble, command )
		{
			for ( var tag in bubble.properties.parser )
			{
				var words = bubble.properties.parser[ tag ];
				if ( tag == 'evaluation' )
				{
					var found = false;
					var nouns = tagsMap[ 'noun' ];
					if ( nouns )
					{
						for ( var n = 0; n < nouns.length; n++ )
						{
							if ( self.awi.utilities.isExpression( nouns[ n ] ) )
							{
								command.parameters[ tag ] = nouns[ n ];
								toRemove.push( nouns[ n ] );
								found = true;
								break;
							}
						}
					}
					if ( !found && typeof tagsMap[ 'value' ] != 'undefined' )
					{
						var value = parseInt( tagsMap[ 'value' ] );
						if ( !isNaN( value ) )
						{
							command.parameters[ tag ] = value;
							toRemove.push( tagsMap[ 'value' ] );
						}
					}
				}
				else if ( tag == 'file' )
				{
					var nouns = tagsMap[ 'noun' ];
					command.parameters.file = self.awi.utilities.copyObject( self.awi.system.assetTypes.file );
					if ( typeof tagsMap[ 'noun' ] != 'undefined' && nouns.length > 0 )
					{
						var assetType = await self.awi.system.getAssetType( tagsMap[ 'noun' ] );
						if ( assetType )
						{
							if ( command.parameters.file.filters[ 0 ] == '*.*' )
							{
								command.parameters.file.filters = [];
								command.parameters.file.names = [];
							}
							command.parameters.file.filters.push( ...assetType.filters );
							command.parameters.file.names.push( ...assetType.names );
						}
					}
					for ( var n = 0; n < nouns.length; n++ )
					{
						if ( self.awi.utilities.isPath( nouns[ n ] ) )
						{
							toRemove.push( nouns[ n ] );
							toAdd.push( nouns[ n ] );
						}
					}
					if ( command.parameters.file.names.length > 0 )
					{
						var name =  command.parameters.file.names[ 0 ];
						var config = self.awi.config.getConfig( 'user' ).paths[ self.awi.config.platform ];
						command.parameters.file.paths = config[ name ];
					}
				}
				else if ( tag == 'date' )
				{
					command.parameters.date = [];
					extractDates( tagsMap[ 'date' ], 'date', toRemove );
					extractDates( tagsMap[ 'noun' ], 'date', toRemove );
				}
				else if ( tag == 'time' )
				{
					command.parameters.time = [];
					extractTimes( tagsMap[ 'date' ], 'time', toRemove );
					extractTimes( tagsMap[ 'noun' ], 'time', toRemove );
				}
				else if ( tag == 'person' )
				{
					command.parameters.person = [];
					if ( tagsMap[ 'firstName' ] )
					{
						for ( var f = 0; f < tagsMap[ 'firstName' ].length; f++ )
						{
							var person = self.awi.utilities.capitalize( tagsMap[ 'firstName' ][ f ] );
							toRemove.push( tagsMap[ 'firstName' ][ f ] );
							if ( tagsMap[ 'lastName' ] && tagsMap[ 'lastName' ].length == tagsMap[ 'firstName' ].length )
							{
								person += ' ' + self.awi.utilities.capitalize( tagsMap[ 'lastName' ][ f ] );
								toRemove.push( tagsMap[ 'lastName' ][ f ] );
							}
							command.parameters.person.push( person );
						}
					}
				}
				else if ( tag == 'what' )
				{
					command.parameters.what = [];
					if ( tagsMap[ 'noun' ] )
					{
						for ( var f = 0; f < tagsMap[ 'noun' ].length; f++ )
						{
							var found = self.findWordDefinition( bubble.properties.parser.what, tagsMap[ 'noun' ][ f ], 'find' );
							if ( found )
							{
								command.parameters.what.push( found );
								toRemove.push( found );
							}
						}
					}
				}
				else if ( tagsMap[ tag ] )
				{
					for ( var d = 0; d < tagsMap[ tag ].length; d++ )
					{
						var word = self.awi.utilities.removePunctuation( tagsMap[ tag ][ d ] );
						var found = 1;
						if ( tag != 'date' && tag != 'value' )
						{
							found = words.findIndex(
								function( element )
								{
									var pos = word.indexOf( element );
									if ( pos >= 0 )
									{
										var bad = false;
										if ( pos > 0 )
											bad = ( word.charAt( pos - 1 ) != ' ' );
										if ( pos + element.length < word.length )
											bad = ( word.charAt( pos + element.length ) != ' ' );
										return !bad;
									}
									return false;
								} );
						}
						else if ( tag == 'value' )
						{
							for ( var w = 0; w < words.length; w++ )
							{
								if ( words[ w ] == 'numeric' )
								{
									var value = parseInt( tagsMap[ tag ] );
									if ( !isNaN( value ) )
										command.parameters[ tag ] = value;
								}
							}
						}
						if ( found >= 0 )
						{
							if ( !command.parameters[ tag ] )
							{
								command.parameters[ tag ] = words[ found ];
								toRemove.push( words[ found ] );
							}
						}
					}
				}
				var found = true;
				if ( !command.token )
				{
					var selects = bubble.properties.select;
					for ( var s = 0; s < selects.length && !found; s++ )
					{
						found = true;
						var select = selects[ s ];
						for ( var ss = 0; ss < select.length; ss++ )
						{
							if ( typeof command.parameters[ select[ ss ] ] == 'undefined' )
								found = false;
						}
					}
				}
				if ( found )
				{
					// Check all mandatory values are here...
					for ( var i = 0; i < bubble.properties.inputs.length && found; i++ )
					{
						var info = self.awi.utilities.getBubbleParams( bubble.properties.inputs[ i ] );
						if ( !info.optional )
						{
							if ( typeof command.parameters[ info.name ] == 'undefined' )
								found = false;
						}
					}
				}
				if ( found )
				{
					command.token = bubble.token;
					command.classname = bubble.classname;
				}
			}
		}

		var myTags = this.awi.utilities.copyObject( this.tags );
		getTags( myTags, '' );

		command =
		{
			token: '',
			classname: '',
			parameters: {},
			options: {}
		};
		var terms = rootDoc.terms().out( 'array' );
		if ( !tagsMap.questionWord )
		{
			var list = [ [ 'please', 'awi' ], [ 'please', 'now' ], [ 'please' ], [ 'can', 'you' ], [ 'could', 'you' ], [ 'i', 'would', 'like', 'you', 'to' ], [ 'now' ] ];
			for ( var w = 0; w < terms.length; w++ )
			{
				var good = false;
				var word = terms[ w ];
				for ( var l = 0; l < list.length && !good; l++ )
				{
					var sublist = list[ l ];
					if ( sublist[ 0 ] == word )
					{
						good = true;
						for ( var ll = 1; ll < sublist.length && good; ll++ )
						{
							if ( w + ll >= terms.length || sublist[ ll ] != terms[ w + ll ] )
								good = false;
						}
						if ( good )
						{
							w += ll - 1;
							toRemove.push( ...sublist );
						}
					}
				}
				if ( !good )
					break;
			}
			word = terms[ w ];
			for ( classname in this.awi.bubbles )
			{
				if ( this.awi.bubbles[ classname ][ word ] )
				{
					command.token = word;
					command.classname = classname;
					await getParameters( this.awi.bubbles[ classname ][ word ], command );
					if ( command.token )
					{
						toRemove.push( word );
						break;
				}
			}
			}
			if ( !command.token )
			{
				for ( var classname in this.awi.bubbles )
				{
					for ( var token in this.awi.bubbles[ classname ] )
					{
						var bubble = this.awi.bubbles[ classname ][ token ];
						var verb = this.findWordDefinition( bubble.properties.parser.verb, word, 'find' );
						if ( verb )
						{
							await getParameters( bubble, command );
							if ( command.token )
								break;
						}
					}
					if ( command.token )
						break;
				}
			}
		}
		else
		{
			var word = terms[ 0 ];
			for ( var classname in this.awi.bubbles )
			{
				for ( var token in this.awi.bubbles[ classname ] )
				{
					var bubble = this.awi.bubbles[ classname ][ token ];
					var questionWord = this.findWordDefinition( bubble.properties.parser.questionWord, word, 'find' );
					if ( questionWord )
					{
						await getParameters( bubble, command );
						if ( command.token )
							break;
					}
				}
				if ( command.token )
					break;
			}
		}
		if ( !command.token )
		{
			command.token = 'chat';
			command.classname = 'generic';
			command.parameters.userInput = line;
		}
		else
		{
			// Calculates remaining of line...
			var newline = '';
			var terms = rootDoc.terms().out( 'array' );
			for ( var t = 0; t < terms.length; t++ )
			{
				var found = toRemove.findIndex(
					function( e )
					{
						return e == terms[ t ];
					} );
				if ( found < 0 )
					newline += terms[ t ] + ' ';
			}
			for ( var t = 0; t < toAdd.length; t++ )
				newline += toAdd[ t ] + ' ';
			line = newline.trim();
		}
		command.parameters.userInput = line;
		command.line = line;

		// Print out results...
		var text = [];
		text.push( 'command: ' + command.classname + '.' + command.token );
		for ( var p in command.parameters )
		{
			if ( p == 'file' )
			{
				var subText = 'file: ';
				for ( var n = 0; n < command.parameters.file.names.length; n++ )
					subText += command.parameters.file.names[ n ] + ', ';
				subText = subText.substring( 0, subText.length - 2 ) + ', filters: ';
				for ( var f = 0; f < command.parameters.file.filters.length; f++ )
					subText += command.parameters.file.filters[ f ] + ', ';
				subText = subText.substring( 0, subText.length - 2 ) + ', paths: ';
				for ( var p = 0; p < command.parameters.file.paths.length; p++ )
					subText += command.parameters.file.paths[ p ] + ', ';
				subText = subText.substring( 0, subText.length - 2 );
				text.push( subText );
			}
			else if ( p == 'date' )
			{
				for ( var d = 0; d < command.parameters.date.length; d++ )
				{
					var date = 'date: ' + command.parameters.date[ d ].date.text + ', ';
					date += 'from: ' + command.parameters.date[ d ].from.text + ', ';
					date += 'to: ' + command.parameters.date[ d ].to.text;
					text.push( date )
				}
			}
			else if ( p == 'time' )
			{
				for ( var d = 0; d < command.parameters.time.length; d++ )
				{
					var time = 'time: ' + command.parameters.time[ d ].time.text + ', ';
					time += 'from: ' + command.parameters.time[ d ].from.text + ', ';
					time += 'to: ' + command.parameters.time[ d ].to.text;
					text.push( time )
				}
			}
			else
			{
				text.push( p + ': ' + command.parameters[ p ] );
			}
		}
		this.awi.editor.print( control.editor, text, { user: 'parser' } );
		return command;
	}
}
module.exports.Connector = ConnectorUtilitiesParser;
