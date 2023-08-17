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
* @file awi-connector-utilities-utilities.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Various utilities.
*
*/
var awiconnector = require( '../awi-connector' );

class ConnectorUtilityUtilities extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Awi utilities';
		this.token = 'utilities';
		this.classname = 'utilities';
		this.version = '0.2.1';
		this.sep = '/';
	}
	async connect( options )
	{
		super.connect( options );
		this.connected = true;
		this.connectAnswer.success = true;
		return this.connectAnswer;
	}
	capitalize( text )
	{
		return text.charAt( 0 ).toUpperCase() + text.substring( 1 );
	}
	replaceStringInText( text, mark, replacement )
	{
		var pos = text.indexOf( mark );
		while( pos >= 0 )
		{
			text = text.substring( 0, pos ) + replacement + text.substring( pos + mark.length );
			pos = text.indexOf( mark );
		}
		return text;
	}
	copyObject( obj )
	{
		var ret = null;
		if (obj !== Object(obj)) { // primitive types
			return obj;
		}
		if (obj instanceof String || obj instanceof Number || obj instanceof Boolean) { // string objecs
			ret = obj; // for ex: obj = new String("Spidergap")
		} else if (obj instanceof Date) { // date
			ret = new obj.constructor();
		} else
			ret = Object.create(obj.constructor.prototype);

		var prop = null;
		var allProps = Object.getOwnPropertyNames(obj); //gets non enumerables also


		var props = {};
		for (var i in allProps) {
			prop = allProps[i];
			props[prop] = false;
		}

		for (i in obj) {
			props[i] = i;
		}

		//now props contain both enums and non enums
		var propDescriptor = null;
		var newPropVal = null; // value of the property in new object
		for (i in props) {
			prop = obj[i];
			propDescriptor = Object.getOwnPropertyDescriptor(obj, i);

			if (Array.isArray(prop)) { //not backward compatible
				prop = prop.slice(); // to copy the array
			} else
			if (prop instanceof Date == true) {
				prop = new prop.constructor();
			} else
			if (prop instanceof Object == true) {
				if (prop instanceof Function == true) { // function
					if (!Function.prototype.clone) {
						Function.prototype.clone = function() {
							var that = this;
							var temp = function tmp() {
								return that.apply(this, arguments);
							};
							for (var ky in this) {
								temp[ky] = this[ky];
							}
							return temp;
						}
					}
					prop = prop.clone();

				} else // normal object
				{
					prop = this.copyObject(prop);
				}

			}

			newPropVal = {
				value: prop
			};
			if (propDescriptor) {
				/*
					* If property descriptors are there, they must be copied
					*/
				newPropVal.enumerable = propDescriptor.enumerable;
				newPropVal.writable = propDescriptor.writable;

			}
			if (!ret.hasOwnProperty(i)) // when String or other predefined objects
				Object.defineProperty(ret, i, newPropVal); // non enumerable

		}
		return ret;
	}
	copyArray( arr, arrDest )
	{
		arrDest = typeof arrDest == 'undefined' ? [] : arrDest;
		for ( var p = 0; p < arr.length; p++ )
		{
			var prop = arr[ p ];
			if ( this.isArray( prop ) )
				prop = this.copyArray( prop, [] );
			arrDest.push( prop );
		}
		return arrDest;
	}
	isFunction( functionToCheck )
	{
		return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
	}
	isObject( item )
	{
		return typeof item != 'undefined' ? (typeof item === "object" && !Array.isArray( item ) && item !== null) : false;
	};
	isArray( item )
	{
		return typeof item != 'undefined' ? Array.isArray( item ) : false;
	};
	countElements( obj, options = { all: true } )
	{
		var count = 0;
		for ( var p in obj )
		{
			if ( obj[ p ] === null )
				continue;
			if ( this.isObject( p ) )
			{
				if ( options.objects || options.all )
				{
					if ( obj[ p ] )
						count++;
				}
			}
			else if ( this.isArray( p ) )
			{
				if ( options.arrays || options.all )
				{
					if ( obj[ p ] )
						count++;
				}
			}
			else if ( this.isFunction( p ) )
			{
				if ( options.functions || options.all )
				{
					if ( obj[ p ] )
						count++;
				}
			}
			else
			{
				count++;
			}
		}
		return count;
	}
	getCharacterType( c )
	{
		var type;
		if ( c >= '0' && c <= '9' )
			type = 'number';
		else if ( c == ' ' || c == "\t" )
			type = 'space';
		else if ( ( c >= 'a' && c <= 'z') || ( c >= 'A' && c <= 'Z' ) || c == '_' )
			type = 'letter';
		else if ( c == '"'  || c == '“' || c == "'" )
			type = 'quote';
		else if ( c == "'" )
			type = 'remark';
		else if ( c == ':' )
			type = 'column';
		else if ( c == ';' )
			type = 'semicolumn';
		else if ( c == '-' || c == '–' )
			type = 'minus';
		else if ( c == '(' || c == ')' )
			type = 'bracket';
		else if ( c == '{' || c == '}' )
			type = 'accolade';
		else
			type = 'other';
		return type;
	}
	isTag( text, tags )
	{
		var pos;
		tags = !this.isArray( tags ) ? [ tags ] : tags;
		text = text.toLowerCase();
		for ( var t = 0; t < tags.length; t++ )
		{
			if ( ( pos = text.indexOf( '#' + tags[ t ] ) ) >= 0 )
			{
				pos += tags[ t ].length + 1;
				if ( pos >= text.length || this.getCharacterType( pos ) != 'letter' )
					return true;
			}
		}
		return false;
	}
	convertStringToArrayBuffer( str )
	{
		var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var lookup = new Uint8Array(256);
		for ( var i = 0; i < chars.length; i++ )
		{
			lookup[ chars.charCodeAt( i ) ] = i;
		}

		var bufferLength = str.length * 0.75, len = str.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
		if ( str[ str.length - 1 ] === "=")
		{
			bufferLength--;
			if ( str[ str.length - 2 ] === "=")
			{
				bufferLength--;
			}
		}

		var arraybuffer = new ArrayBuffer( bufferLength ),
		bytes = new Uint8Array( arraybuffer );

		for ( i = 0; i < len; i += 4 )
		{
			encoded1 = lookup[str.charCodeAt(i)];
			encoded2 = lookup[str.charCodeAt(i+1)];
			encoded3 = lookup[str.charCodeAt(i+2)];
			encoded4 = lookup[str.charCodeAt(i+3)];

			bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
			bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
			bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
		}
		return arraybuffer;
	}
	convertArrayBufferToString( arrayBuffer )
	{
		var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var bytes = new Uint8Array( arrayBuffer ), i, len = bytes.length, base64 = "";

		for (i = 0; i < len; i+=3)
		{
			base64 += chars[bytes[i] >> 2];
			base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
			base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
			base64 += chars[bytes[i + 2] & 63];
		}

		if ((len % 3) === 2)
		{
			base64 = base64.substring(0, base64.length - 1) + "=";
		}
		else if (len % 3 === 1)
		{
			base64 = base64.substring(0, base64.length - 2) + "==";
		}
		return base64;
	};
		async loadIfExist( path, options )
	{
		var answer = await this.awi.system.exists( path );
		if ( answer.success )
		{
			if ( options.encoding == 'utf8' )
			{
				try
				{
					return await this.awi.system.readFile( path, { encoding: 'utf8' } );
				}
				catch( err )
				{
					return { success: false, data: null };
				}
			}
			else if ( options.encoding == 'arraybuffer' )
			{
				try
				{
					return await this.awi.system.readFile( path );
				}
				catch( err )
				{
					return { success: false, data: null };
				}
			}
		}
		return { success: false, data: null };
	}

	async loadFile( path, options )
	{
		return await this.loadIfExist( path, options );
	}

	getFilenameAndExtension( path )
	{
		return this.basename( this.normalize( path ) );
	}

	filterFilename( name, wildcards )
	{
		name = name.toLowerCase();
		if ( typeof wildcards == 'string' )
			wildcards = [ wildcards ];

		for ( var w = 0; w < wildcards.length; w++ )
		{
			var wildcard = wildcards[ w ].toLowerCase();

			// Look for *[ and ]*
			var start;
			if ( ( start = wildcard.indexOf( '*[' ) ) >= 0 )
			{
				var end = wildcard.indexOf( ']*', start );
				if ( end >= start )
				{
					start += 2;
					var filter = wildcard.substring( start, end );
					if ( name.indexOf( filter ) >= 0 )
						return true;
					if ( start - 2 == 0 && end + 2 == wildcard.length )
						continue;
					var newFilter = '';
					for ( var f = 0; f < end - start; f++ )
						newFilter += '?';
					wildcard = wildcard.substring( 0, start - 2 ) + newFilter + wildcard.substring( end + 2 );
				}
			}

			name = this.basename( name );
			var pName = 0;
			var pWild = 0;
			var afterDot = false;
			var bad = false;
			do
			{
				var cName = name.charAt( pName );
				var cWild = wildcard.charAt( pWild );
				switch ( cWild )
				{
					case '*':
						if ( afterDot )
							return true;
						pName = name.lastIndexOf( '.' );
						pWild = wildcard.indexOf( '.' );
						if ( pName < 0 && pWild < 0 )
							return true;
						afterDot = true;
						break;
					case '.':
						afterDot = true;
						if ( cName != '.' )
							bad = true;
						break;
					case '?':
						break;
					default:
						if ( cName != cWild )
							bad = true;
						break;
				}
				pName++;
				pWild++;
			} while( !bad && pName < name.length && pName < name.length )
			if( !bad && pWild < wildcard.length )
				bad = true;
			if ( !bad )
				return true;
		}
		return false;
	}

	async getFileInfo( path )
	{
		var result = undefined;
		var stats = await this.statsIfExists( path );
		if ( stats.data )
		{
			stats = stats.data;
			if ( stats.isDirectory() )
			{
				result =
				{
					name: this.getFilenameAndExtension( path ),
					path: path,
					isDirectory: true,
					size: 0,
					stats: stats
				};
			}
			else
			{
				result =
				{
					name: this.getFilenameAndExtension( path ),
					path: path,
					isDirectory: false,
					size: stats.size,
					stats: stats
				};
			}
		}
		return result;
	}
	async deleteDirectory( destinationPath, options, tree, count )
	{
		try
		{
			if ( !tree )
			{
				var answer = await this.awi.system.exists( destinationPath );
				if ( answer.success )
				{
					tree = await this.awi.system.getDirectory( destinationPath, options );
					tree = tree.data;
					if ( !tree )
						return;
				}
				count = 0;
			}
			for ( var f in tree )
			{
				var file = tree[ f ];
				if ( !file.isDirectory )
					await this.awi.system.unlink( file.path );
				else
				{
					if ( options.recursive )
					{
						count++;
						this.deleteDirectory( file.path, options, file.files, count );
						count--;
					}
				}
			}
			if ( count > 0 || !options.keepRoot )
				await this.awi.system.rmdir( destinationPath );
			return true;
		}
		catch( error )
		{
		}
		return false;
	}
	getFilesFromTree( tree, result )
	{
		if ( !result )
			result = {};
		for ( var d = 0; d < tree.length; d++ )
		{
			var entry = tree[ d ];
			if ( !entry.isDirectory )
			{
				result[ '"' + entry.path + '"' ] = entry;
			}
			else if ( entry.files )
			{
				this.getFilesFromTree( entry.files, result );
			}
		}
		return result;
	}
	async statsIfExists( path )
	{
		var answer = await this.awi.system.exists( path );
		if ( answer.success )
			return await this.awi.system.stat( path );
		return { success: false, data: null };
	}
	getDirectoryArrayFromTree( tree, options )
	{
		var result = [];
		this.getDirArrayFromTree( tree, result );

		if ( options.sort )
		{
			result.sort( function( a, b )
			{
				if ( a.path == b.path )
					return 0;
				if ( a.path.indexOf( b.path ) == 0 )
					return a.path.length < b.path.length ? -1 : 1;
				if ( b.path.indexOf( a.path ) == 0 )
					return b.path.length < a.path.length ? -1 : 1;
				return 0;
			} );
		}
		return result;
	}
	getDirArrayFromTree( tree, result )
	{
		tree = typeof tree == 'undefined' ? [] : tree;
		result = typeof result == 'undefined' ? [] : result;
		for ( var d = 0; d < tree.length; d++ )
		{
			var entry = tree[ d ];
			if ( entry.isDirectory )
			{
				result.push( entry );
				if ( entry.files )
					this.getDirArrayFromTree( entry.files, result );
			}
		}
		return result;
	}
	getFileArrayFromTree( tree, result )
	{
		tree = typeof tree == 'undefined' ? [] : tree;
		result = typeof result == 'undefined' ? [] : result;
		for ( var d = 0; d < tree.length; d++ )
		{
			var entry = tree[ d ];
			if ( !entry.isDirectory )
			{
				result.push( entry );
			}
			else if ( entry.files )
			{
				this.getFileArrayFromTree( entry.files, result );
			}
		}
		return result;
	}
	checkUndefined( value, defaultValue )
	{
		if ( typeof value == 'undefined' )
			value = defaultValue;
		return value;
	}
	toBin( number, digits )
	{
		var result = Math.floor( number ).toString( 2 );
		for ( var l = result.length; l < digits; l++ )
			result = '0' + result;
		return result;
	}
	toHex( number, digits )
	{
		var result = Math.floor( number ).toString( 16 );
		for ( var l = result.length; l < digits; l++ )
			result = '0' + result;
		return result;
	}
	copyData( destination, source, options = {} )
	{
		if ( !options.recursive )
		{
			for ( var d in source )
				destination[ d ] = source[ d ];
			return destination;
		}
		for ( var d in source )
		{
			var prop = source[ d ];
			if ( this.isObject( prop ) )
				destination[ d ] = this.copyData( {}, prop );
			else if ( this.isArray( prop ) )
				destination[ d ] = this.copyArray( prop );
			else
				destination[ d ] = prop;
		}
		return destination;
	}
	async loadHJSON( path )
	{
		path = this.normalize( path );
		try
		{
			var answer = await this.loadFile( path, { encoding: 'utf8' } );
			if ( !answer.success )
				return answer;
			return this.awi.system.hJsonParse( answer.data );
		}
		catch( e )
		{
		}
		return { success: false, data: null, error: 'awi:illegal-json:iwa' };
	}
	async saveHJSON( path, data )
	{
		path = this.normalize( path );
		var json = this.awi.system.hJsonStringify( data );
		if ( !json.success )
			return json;
		return await this.awi.system.writeFile( path, json.data, { encoding: 'utf8' } );
	}
	async loadJSON( path )
	{
		path = this.normalize( path );
		try
		{
			var answer = await this.loadFile( path, { encoding: 'utf8' } );
			if ( answer.success )
				return { success: true, data: JSON.parse( answer.data ) };
			return answer;
		}
		catch( e )
		{
		}
		return { success: false, data: null, error: 'awi:illegal-json:iwa' };
	}
	async saveJSON( path, data )
	{
		path = this.normalize( path );
		var json = JSON.stringify( data );
		return await this.awi.system.writeFile( path, json, { encoding: 'utf8' } );
	}
	justifyText( text, maxWidth )
	{
		var words = text.split( ' ' );
		var lines = [ '' ];
		var count = 0;
		for ( var w = 0; w < words.length; w++ )
		{
			if ( lines[ count ].length >= maxWidth )
			{
				lines[ count ] = lines[ count ].trim();
				lines.push( '' );
				count++;
			}
			lines[ count ] += words[ w ] + ' ';
		}
		return lines;
	}
	removeBasePath( path, directories )
	{
		path = this.normalize( path );
		for ( var d = 0; d < directories.length; d++ )
		{
			var startPath = this.normalize( directories[ d ] );
			if ( path.indexOf( startPath ) == 0 )
			{
				path = path.substring( startPath.length + 1 );
				break;
			}
		}
		return path;
	}
	extractString( line, start )
	{
		var end, endCut;
		var quote = line.charAt( start );
		if ( quote == '"' || quote == "'" )
		{
			start++;
			endCut = start;
			while ( line.charAt( endCut ) != quote && endCut < line.length )
				endCut++;
			end = Math.min( line.length, endCut + 1 )
		}
		else
		{
			endCut = line.indexOf( ' ', start );
			if ( endCut < 0 )
				endCut = line.length;
			end = endCut;
		}
		return { text: line.substring( start, endCut ), end: end };
	}
	extractLineParameters( line, parameters )
	{
		var data = { command: '' };
		for ( var p = 0; p < parameters.length; p++ )
		{
			var parameter = parameters[ p ];
			var start = line.indexOf( '-' + parameter.name + ':' );
			if ( start >= 0 )
			{
				var info = this.extractString( line, start + parameter.name.length + 2 );
				line = line.substring( 0, start ) + line.substring( info.end );
				if ( parameter.type == 'number' )
					data[ parameter.name ] = parseInt( info.text );
				else
					data[ parameter.name ] = info.text;
			}
		}
		data.command = line.trim();
		return data;
	}
	extractLinks( line, position )
	{
		var result = { videos: [], images: [], photos: [], links: [], audios: [], found: false }
		var start;
		if ( ( start = line.indexOf( '<a ', position ) ) >= 0 )
		{
			var end = line.indexOf( '>' );
			if ( end >= 0 )
			{
				var pos = line.indexOf( 'href=', start );
				result.links.push( this.extractString( line, pos ) );
				result.found = true;
				line = line.substring( 0, start ) + line.substring( end + 1 );
			}
		}
		if ( ( start = line.indexOf( '<video ', position ) ) >= 0 )
		{
			var end = line.indexOf( '>' );
			if ( end >= 0 )
			{
				var pos = line.indexOf( 'src=', start );
				result.videos.push( this.extractString( line, pos ) );
				result.found = true;
				line = line.substring( 0, start ) + line.substring( end + 1 );
			}
		}
		if ( ( start = line.indexOf( '<audio ', position ) ) >= 0 )
		{
			var end = line.indexOf( '>' );
			if ( end >= 0 )
			{
				var pos = line.indexOf( 'src=', start );
				result.audios.push( this.extractString( line, pos ) );
				result.found = true;
				line = line.substring( 0, start ) + line.substring( end + 1 );
			}
		}
		if ( ( start = line.indexOf( '<img ', position ) ) >= 0 )
		{
			var end = line.indexOf( '>' );
			if ( end >= 0 )
			{
				var pos = line.indexOf( 'src=', start );
				result.images.push( this.extractString( line, pos ) );
				result.found = true;
				line = line.substring( 0, start ) + line.substring( end + 1 );
			}
		}
		if ( ( start = line.indexOf( '<', position ) ) >= 0 )
		{
			var end = line.indexOf( '>' );
			if ( end >= 0 )
			{
				var pos = line.indexOf( 'src=', start );
				result.images.push( this.extractString( line, pos ) );
				result.found = true;
				line = line.substring( 0, start ) + line.substring( end + 1 );
			}
		}
		result.line = line;
		return result;
	}
	cleanLinks( line )
	{
		var start = line.indexOf( '<' );
		while( start >= 0 )
		{
			var end = line.indexOf( '>', start );
			line = line.substring( 0, start ) + line.substring( end + 1 );
			start = line.indexOf( '<' );
		}
		return line.trim();
	}
	getFinalHtmlData( structure )
	{
		function getIt( parent, pile )
		{
			for ( var s = 0; s < parent.length; s++ )
			{
				var struct = parent[ s ];
				if ( struct.children.length == 0 )
				{
					pile.push( struct.text );
				}
				else
				{
					pile.push( ...getIt( struct.children, [] ) )
				}
			}
			return pile;
		}
		return getIt( structure, [] );
	}
	explodeHtml( name, html, options )
	{
		function explode( name, html, options, pile )
		{
			var start = 0;
			var end = start;
			do
			{
				var startText;
				var start1 = html.indexOf( '<' + name + ' ', end );
				var start2 =  html.indexOf( '<' + name + '>', end );
				start1 = ( start1 < 0 ? html.length : start1 );
				start2 = ( start2 < 0 ? html.length : start2 );
				if ( start1 >= html.length && start2 >= html.length )
					break;

				if ( start1 < start2 )
					startText = html.indexOf( '>', start1 + 1 ) + 1;
				else
					startText = start2 + name.length + 2;
				start = Math.min( start1, start2 );

				var count = 1;
				end = startText;
				do
				{
					var next1 = html.indexOf( '<' + name + ' ', end );
					var next2 = html.indexOf( '<' + name + '>', end );
					var next3 = html.indexOf( '</' + name + '>', end );
					if ( next1 >= 0 )
						next1 = html.indexOf( '>', next1 );
					next1 = ( next1 < 0 ? html.length : next1 );
					next2 = ( next2 < 0 ? html.length : next2 );
					next3 = ( next3 < 0 ? html.length : next3 );
					var next = Math.min( next1, Math.min( next2, next3 ) );
					if ( next == html.length )
						return null;
					if ( next == next3 )
					{
						count--;
						if ( count == 0 )
						{
							end = next3;
							break;
						}
					}
					else
					{
						count++;
					}
					end = next + 1;
				} while( true );
				if ( end > start )
				{
					var data =
					{
						type: name,
						start: start,
						end: end + name.length + 3,
						startText: startText,
						endText: end,
						children: []
					};
					data.text = html.substring( data.startText, data.endText );
					if ( data.text != '' )
					{
						pile.push( data );
						if ( options.recursive )
							data.children = explode( name, data.text, options, [] );
					}
					end = data.end;
				}
			} while( true )
			return pile;
		}
		var structure = explode( name, html, options, [] );
		return structure;
	}
	getBubbleParams( props )
	{
		if ( typeof props.parameters != 'undefined' )
			return props.parameters[ 0 ];

		var param = {};
		for ( var p in props )
		{
			if ( p == 'type' || p == 'interval' || p == 'default' || p == 'optional' || p == 'clear' || p == 'choices' )
				param[ p ] = props[ p ];
			else
			{
				if ( param[ 'name' ] )
					return null;
				param[ 'name' ] = p;
				param[ 'description' ] = props[ p ];
			}
		}
		return param
	}
	removeDuplicatesFromFiles( sourceFiles )
	{
		var newArray = [];
		for ( var s = 0; s < sourceFiles.length; s++ )
		{
			var file = sourceFiles[ s ];
			var found = newArray.find(
				function( element )
				{
					return file.name == element.name;
				} );
			if ( !found )
				newArray.push( file )
		}
		return newArray;
	}
	getControlParameters( control, variables )
	{
		var parameters = {};
		for ( var p in variables )
		{
			if ( typeof control[ p ] != 'undefined' )
			{
				parameters[ p ] = control[ p ];
				control[ p ] = undefined;
			}
			else
				parameters[ p ] = variables[ p ];
		}
		return parameters;
	}
	format( prompt, args )
	{
		do
		{
			var done = false;
			var start = prompt.lastIndexOf( '{' );
			while( start >= 0 )
			{
				var end = prompt.indexOf( '}', start );
				if ( end >= start )
				{
					var key = prompt.substring( start + 1, end );
					if ( args[ key ] )
					{
						prompt = prompt.substring( 0, start ) + args[ key ] + prompt.substring( end + 1 );
						done = true;
					}
					else
						prompt = prompt.substring( 0, start ) + prompt.substring( end + 1 );
				}
				start = prompt.lastIndexOf( '{', start - 1 );
			}
		} while( done )
		return prompt;
	}
	getUniqueIdentifier( toCheck = {}, root = '', count = 0, timeString = '', nNumbers = 3, nLetters = 3 )
	{
		var id;
		do
		{
			id = root + ( root ? '_' : '' ) + count;
			if ( timeString )
			{
				var currentdate = new Date();
				var time = this.format( timeString,
				{
					day: currentdate.getDate(),
					month: currentdate.getMonth(),
					year:  currentdate.getFullYear(),
					hour:  currentdate.getHours(),
					minute:  currentdate.getMinutes(),
					second: currentdate.getSeconds(),
					milli: currentdate.getMilliseconds(),
				} );
				if ( time )
					id += '_' + time;
			}
			var numbers = '';
			for ( var n = 0; n < nNumbers; n++ )
				numbers += String.fromCharCode( 48 + Math.floor( Math.random() * 10 ) );
			id += '_' + numbers;
			var letters = '';
			for ( var n = 0; n < nLetters; n++ )
				letters += String.fromCharCode( 65 + Math.floor( Math.random() * 26 ) );
			id += letters;
		} while( toCheck[ id ] );
		return id;
	}
	matchRegex( text, regex )
	{
		if ( !this.isArray( regex ) )
			regex = [ regex ];
		for ( var r = 0; r < regex.length; r++ )
		{
			var matches = text.match( regex[ r ] );
			if ( matches )
				return matches;
		}
		return null;
	}
	fillString( text, chr, len, position = 'start' )
	{
		if ( position == 'start' )
		{
			while( text.length < len )
				text = chr + text;
		}
		else if ( position == 'end' )
		{
			while( text.length < len )
				text += chr;
		}
		else
		{
			position = Math.min( Math.max( position, 0 ), text.length );
			while( text.length < len )
				text = text.substring( 0, position ) + chr + text.substring( position );
		}
		return text;
	}
	getNumericValue( text )
	{
		var numbers = [ 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
						'ten', 'eleven', 'twelve', 'forteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
						'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine',
						'thirty', 'thirty-one', 'thirty-two', 'thirty-three', 'thirty-four', 'thirty-five', 'thirty-six', 'thirty-seven', 'thirty-eight', 'thirty-nine',
						'fourty', 'fourty-one', 'fourty-two', 'fourty-three', 'fourty-four', 'fourty-five', 'fourty-six', 'fourty-seven', 'fourty-eight', 'fourty-nine',
						'fifty', 'fifty-one', 'fifty-two', 'fifty-three', 'fifty-four', 'fifty-five', 'fifty-six', 'fifty-seven', 'fifty-eight', 'fifty-nine',
						'sixty', 'sixty-one', 'sixty-two', 'sixty-three', 'sixty-four', 'sixty-five', 'sixty-six', 'sixty-seven', 'sixty-eight', 'sixty-nine',
						'seventy', 'seventy-one', 'seventy-two', 'seventy-three', 'seventy-four', 'seventy-five', 'seventy-six', 'seventy-seven', 'seventy-eight', 'seventy-nine',
						'eighty', 'eighty-one', 'eighty-two', 'eighty-three', 'eighty-four', 'eighty-five', 'eighty-six', 'eighty-seven', 'eighty-eight', 'eighty-nine',
						'ninety', 'ninety-one', 'ninety-two', 'ninety-three', 'ninety-four', 'ninety-five', 'ninety-six', 'ninety-seven', 'ninety-eight', 'ninety-nine',
						]
		text = text.trim().toLowerCase().split( ' ' ).join( '-' );
		if ( this.getCharacterType( text.charAt( 0 ) ) == 'number' )
		{
			var value = parseInt( text );
			if ( !isNaN( value ) )
				return value;
			return -1;
		}
		var index = numbers.findIndex(
			function( element )
			{
				return element == text;
			}
		)
		return index;
	}
	isFilter( name )
	{
		for ( var c = 0; c < name.length; c++ )
		{
			if ( info.name.charAt( c ) == '*' || info.name.charAt( c ) == '?' )
				return true;
		}
		return false;
	}
	normalize( path )
	{
		var pos = path.indexOf( '\\', pos + 1 );
		while( pos >= 0 )
		{
			path = path.substring( 0, pos ) + '/' + path.substring( pos + 1 );
			pos = path.indexOf( '\\', pos + 1 );
		}
		return path;
	}
	basename( path )
	{
		path = this.normalize( path );
		var slash = path.lastIndexOf( '/' );
		if ( slash >= 0 )
			return path.substring( slash + 1 );
		return path;
	}
	extname( path )
	{
		path = this.normalize( path );
		var dot = path.lastIndexOf( '.' );
		if ( dot >= 0 )
			return path.substring( dot );
		return '';
	}
	dirname( path )
	{
		path = this.normalize( path );
		var slash = path.lastIndexOf( '/' );
		if ( slash >= 0 )
			return path.substring( 0, slash );
		return '';
	}
	parse( path )
	{
		var result =
		{
			root: '',
			dir: '',
			base: '',
			ext: '',
			name: ''
		}
		path = this.normalize( path );
		var column = path.indexOf( ':' );
		var lastSlash = path.lastIndexOf( '/' );
		var lastDot = path.lastIndexOf( '.' );
		if ( path.charAt( 0 ) == '/' )
		{
			result.root = '/';
			result.dir = path.substring( 0, lastSlash );
			result.base = path.substring( lastSlash );
			if ( lastDot >= 0 )
			{
				result.ext = path.substring( lastDot );
				result.name = path.substring( lastSlash + 1, lastDot );
			}
			else
			{
				result.name = path.substring( lastSlash + 1 );
			}
		}
		else
		{
			if ( column >= 0 )
				result.root = path.substring( 0, column + 1 );
			if ( lastSlash >= 0 )
			{
				result.dir = path.substring( 0, lastSlash );
				result.base = path.substring( lastSlash + 1 );
			}
			else
			{
				result.base = path;
			}
			if ( lastDot >= 0 )
			{
				result.ext = path.substring( lastDot );
				if ( lastSlash >= 0 )
					result.name = path.substring( lastSlash + 1, lastDot )
				else
					result.name = path.substring( 0, lastDot )
			}
			if ( result.name == '' && result.ext == '' )
			{
				result.name = result.base;
				//result.dir += '/' + result.base;
				//result.base = '';
			}
		}
		return result;
	}
	removeDuplicatedLines( text )
	{
		var lines = text.split( '\n' );
		for ( var l1 = 0; l1 < lines.length; l1++ )
		{
			var l3 = l1 + 1;
			var line1 = lines[ l1 ];
			for ( var l2 = l3; l2 < lines.length; l2++ )
			{
				if ( lines[ l2 ].length > 0 && lines[ l2 ] != line1 )
					lines[ l3++ ] = lines[ l2 ];
			}
			lines.length = l3;
		}
		return lines.join( '\n' );
	}
	isLowerCase( c )
	{
		return c >= 'a' && c <= 'z';
	}
	isUpperCase( c )
	{
		return c >= 'A' && c <= 'Z';
	}
	getMimeType( path, type )
	{
		var ext = this.extname( path ).toLowerCase();
		if ( ext == '.mp4' || ext == '.ogg' )
			type = ( typeof type == 'undefined' ? 'audio' : type );
		switch ( ext )
		{
			case '.png':
				return 'image/png';
			case '.jpg':
			case '.jpeg':
				return 'image/jpeg';
			case '.tiff':
				return 'image/tiff';
			case '.gif':
				return 'image/gif';
			case '.webp':
				return 'image/webp';
			case '.bmp':
				return 'image/bmp';

			case '.pdf':
				return 'application/pdf';
			case '.gzip':
				return 'application/gzip';
			case '.zip':
				return 'application/zip';
			case '.json':
				return 'application/json';
			case '.sql':
				return 'application/sql';
			case '.':
				return 'application/rtf';

			case '.3mf':
				return 'model/3mf';
			case '.mesh':
				return 'model/mesh';
			case '.obj':
				return 'model/obj';
			case '.stl':
				return 'model/stl';
			case '.vrml':
				return 'model/vrml';
			case '.rtf':
				return 'text/rtf';

			case '.mp4':
				return type + '/mp4';
			case '.ogg':
				return type + '/ogg';
			case '.mpeg':
				return 'video/mpeg';

			case '.aac':
				return 'audio/aac';
			case '.wav':
				return 'audio/wav';
			case '.mp3':
				return 'audio/mp3';

			case '.js':
				return 'text/jaavscript';
			case '.html':
				return 'text/html';
			case '.md':
				return 'text/markdown';
			case '.txt':
				return 'text/plain';
			case '.xml':
				return 'text/xml';

			default:
				return
		}
	}
	serializeIn( map, root )
	{
		var self = this;
		var lastBranch = 'root';
		function createObjects( o, map )
		{
			if ( o.oClass )
			{
				// create the object
				var oo;
				if ( o.oClass != 'prompt' )
				{
					oo = new self.awi[ o.data.parentClass ][ o.data.classname ][ o.data.token ]( self.awi, { key: o.data.key, branch: lastBranch, parent: o.data.parent, exits: o.data.exits, parameters: o.data.parameters } );
					if ( o.data.parentClass == 'newMemories' )
						lastBranch = oo;
				}
				else
				{
					oo = self.awi.prompt;
					lastBranch = oo;
				}
				switch ( o.oClass )
				{
					case 'bubble':
						break;
					case 'branch':
						break;
					case 'memory':
						oo.currentBubble = o.data.currentBubble;
						oo.parameters = o.data.parameters;
						oo.properties.exits = o.data.exits;
						oo.parent = o.data.parent;
						for ( var p in o.data.bubbleMap )
						{
							oo.bubbleMap[ p ] = createObjects( o.data.bubbleMap[ p ], {} );
						}
						break;
					case 'souvenir':
						oo.parameters = o.data.parameters;
						oo.options = o.data.options;
						oo.parent = o.data.parent;
						oo.properties.exits = o.data.exits;
						break;
					case 'prompt':
						oo.currentBubble = o.data.currentBubble;
						oo.parameters = o.data.parameters;
						oo.datas = o.data.datas;
						oo.options = o.data.options;
						oo.properties.exits = o.data.exits;
						oo.parent = o.data.parent;
						oo.options = o.data.options;
						for ( var p in o.data.bubbleMap )
							oo.bubbleMap[ p ] = createObjects( o.data.bubbleMap[ p ], {} );
						oo.pathway = o.data.pathway;
						oo.keyCount = o.data.keyCount;
						oo.questionCount = o.data.questionCount;
						oo.properties.exits = o.data.exits;
						oo.firstRun = false;
						break
				}
				return oo;
			}
			else
			{
				for ( var p in o )
				{
					var oo = o[ p ];
					if ( oo.oClass )
					{
						o[ p ] = createObjects( oo, map );
					}
				}
				return o;
			}
		}
		return createObjects( map, root );
	}
	serializeOut( root )
	{
		var self = this;
		var count = 0;
		function isAwi( o )
		{
			return typeof o.token != 'undefined';
		}
		function toJSON( data )
		{
			var json;
			try
			{
				json = JSON.stringify( data );
			}
			catch( e )
			{}
			if ( json )
				return json;
			return '""';
		}
		function savePrompt( o )
		{
			var map = '';
			map += '\t'.repeat( count ) + 'classname:"' + o.classname + '",\n';
			map += '\t'.repeat( count ) + 'currentBubble:"' + ( typeof o.currentBubble != 'undefined' ? ( typeof o.currentBubble == 'string' ? o.currentBubble : o.currentBubble.key ) : '' ) + '",\n';
			map += '\t'.repeat( count ) + 'key:"' + o.key + '",\n';
			map += '\t'.repeat( count ) + 'token:"' + o.token + '",\n';
			map += '\t'.repeat( count ) + 'options:' + toJSON( o.options ) + ',\n';
			map += '\t'.repeat( count ) + 'parameters:' + toJSON( o.parameters ) + ',\n';
			map += '\t'.repeat( count ) + 'datas:' + toJSON( o.datas ) + ',\n';
			map += '\t'.repeat( count ) + 'options:' + toJSON( o.options ) + ',\n';
			map += '\t'.repeat( count ) + 'pathway:"' + o.pathway + '",\n';
			map += '\t'.repeat( count ) + 'pathways:' + toJSON( o.pathways ) + ',\n';
			map += '\t'.repeat( count ) + 'keyCount:' + o.keyCount + ',\n';
			map += '\t'.repeat( count ) + 'questionCount:' + o.questionCount + ',\n';
			map += '\t'.repeat( count ) + 'parent:"' + ( self.isObject( o.parent ) ? o.parent.key : ( typeof o.parent == 'undefined' ? '' : o.parent ) ) + '",\n';
			map += '\t'.repeat( count ) + 'previous:"' + ( self.isObject( o.previous ) ? o.previous.key : ( typeof o.previous == 'undefined' ? '' : o.previous ) ) + '",\n';
			map += '\t'.repeat( count ) + 'exits:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.properties.exits )
				map += '\t'.repeat( count + 1 ) + p + ':"' + o.properties.exits[ p ] + '",\n';
			map += '\t'.repeat( count ) + '},\n';
			map += '\t'.repeat( count ) + 'bubbleMap:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.bubbleMap )
			{
				var oo = o.bubbleMap[ p ];
				map += '\t'.repeat( count + 1 ) + p + ':{oClass:"' + oo.oClass + '",data:{\n';
				count += 2;
				map += saveMap[ oo.oClass ]( oo )
				count -= 2;
				map += '\t'.repeat( count + 1 ) + '}},\n';
			}
			map += '\t'.repeat( count ) + '},\n'
			return map;
		}
		function saveMemory( o )
		{
			var map = '';
			map += '\t'.repeat( count ) + 'classname:"' + o.classname + '",\n';
			map += '\t'.repeat( count ) + 'parentClass:"newMemories",\n';
			map += '\t'.repeat( count ) + 'currentBubble:"' + ( typeof o.currentBubble != 'undefined' ? ( typeof o.currentBubble == 'string' ? o.currentBubble : o.currentBubble.key ) : '' ) + '",\n';
			map += '\t'.repeat( count ) + 'key:"' + o.key + '",\n';
			map += '\t'.repeat( count ) + 'token:"' + o.token + '",\n';
			map += '\t'.repeat( count ) + 'options:' + toJSON( o.options ) + ',\n';
			map += '\t'.repeat( count ) + 'parameters:' + toJSON( o.parameters ) + ',\n';
			map += '\t'.repeat( count ) + 'pathway:"' + o.pathway + '",\n';
			map += '\t'.repeat( count ) + 'pathways:' + toJSON( o.pathways ) + ',\n';
			map += '\t'.repeat( count ) + 'parent:"' + ( self.isObject( o.parent ) ? o.parent.key : ( typeof o.parent == 'undefined' ? '' : o.parent ) ) + '",\n';
			map += '\t'.repeat( count ) + 'previous:"' + ( self.isObject( o.previous ) ? o.previous.key : ( typeof o.previous == 'undefined' ? '' : o.previous ) ) + '",\n';
			map += '\t'.repeat( count ) + 'exits:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.properties.exits )
				map += '\t'.repeat( count + 1 ) + p + ':"' + o.properties.exits[ p ] + '",\n';
			map += '\t'.repeat( count ) + '},\n';
			map += '\t'.repeat( count ) + 'bubbleMap:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.bubbleMap )
			{
				var oo = o.bubbleMap[ p ];
				map += '\t'.repeat( count + 1 ) + p + ':{oClass:"' + oo.oClass + '",data:{\n';
				count += 2;
				map += saveMap[ oo.oClass ]( oo );
				count -= 2;
				map += '\t'.repeat( count + 1 ) + '}},\n';
			}
			map += '\t'.repeat( count ) + '},\n'
			return map;
		}
		function saveSouvenir( o )
		{
			var map = '';
			map += '\t'.repeat( count ) + 'classname:"' + o.classname + '",\n';
			map += '\t'.repeat( count ) + 'parentClass:"newSouvenirs",\n';
			map += '\t'.repeat( count ) + 'key:"' + o.key + '",\n';
			map += '\t'.repeat( count ) + 'token:"' + o.token + '",\n';
			map += '\t'.repeat( count ) + 'parameters:' + toJSON( o.parameters ) + ',\n';
			map += '\t'.repeat( count ) + 'options:' + toJSON( o.options ) + ',\n';
			map += '\t'.repeat( count ) + 'parent:"' + ( self.isObject( o.parent ) ? o.parent.key : ( typeof o.parent == 'undefined' ? '' : o.parent ) ) + '",\n';
			map += '\t'.repeat( count ) + 'previous:"' + ( self.isObject( o.previous ) ? o.previous.key : ( typeof o.previous == 'undefined' ? '' : o.previous ) ) + '",\n';
			map += '\t'.repeat( count ) + 'exits:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.properties.exits )
				map += '\t'.repeat( count + 1 ) + p + ':"' + o.properties.exits[ p ] + '",\n';
			map += '\t'.repeat( count ) + '},\n';
			return map;
		}
		function saveBranch( o )
		{
			var map = '';
			return map;
		}
		function saveBubble( o )
		{
			var map = '';
			map += '\t'.repeat( count ) + 'classname:"' + o.classname + '",\n';
			map += '\t'.repeat( count ) + 'parentClass:"newBubbles",\n';
			map += '\t'.repeat( count ) + 'token:"' + o.token + '",\n';
			map += '\t'.repeat( count ) + 'key:"' + o.key + '",\n';
			map += '\t'.repeat( count ) + 'data:' + toJSON( o.data ) + ',\n';
			map += '\t'.repeat( count ) + 'parameters:' + toJSON( o.parameters ) + ',\n';
			map += '\t'.repeat( count ) + 'options:' + toJSON( o.options ) + ',\n';
			map += '\t'.repeat( count ) + 'parent:"' + ( self.isObject( o.parent ) ? o.parent.key : ( typeof o.parent == 'undefined' ? '' : o.parent ) ) + '",\n';
			map += '\t'.repeat( count ) + 'previous:"' + ( self.isObject( o.previous ) ? o.previous.key : ( typeof o.previous == 'undefined' ? '' : o.previous ) ) + '",\n';
			map += '\t'.repeat( count ) + 'exits:\n'
			map += '\t'.repeat( count ) + '{\n';
			for ( var p in o.properties.exits )
				map += '\t'.repeat( count + 1 ) + p + ':"' + o.properties.exits[ p ] + '",\n';
			map += '\t'.repeat( count ) + '},\n';
			return map;
		}
		var saveMap =
		{
			'awi': function( o ) { return '\t'.repeat( count - 1 ) + ':{oClass:"awi","data":{""},\n'; },
			'config': function( o ) { return '\t'.repeat( count - 1 ) + ':{oClass:"config","data":{""},\n'; },
			'bubble': saveBubble,
			'branch': saveBranch,
			'memory': saveMemory,
			'souvenir': saveSouvenir,
			'prompt': savePrompt
		}

		function createMap( o, map )
		{
			count++;
			if ( o.oClass )
			{
				map += '\t'.repeat( count - 1 ) + 'root:{oClass:"' + o.oClass + '",data:{\n';
				map += saveMap[ o.oClass ]( o );
				map += '\t'.repeat( count - 1 ) + '}},\n';
			}
			else
			{
				for ( var p in o )
				{
					var oo = o[ p ];
					if ( self.isObject( oo ) )
					{
						if ( oo.oClass )
						{
							map += '\t'.repeat( count - 1 ) + p + ':{oClass:"' + oo.oClass + '",data:{\n';
							map += saveMap[ oo.oClass ]( oo );
							map += '\t'.repeat( count - 1 ) + '}},\n';
						}
						else
						{
							for ( var pp in oo )
							{
								var ooo = oo[ pp ];
								if ( self.isObject( ooo ) )
								{
									if ( ooo.oClass )
									{
										map += '\t'.repeat( count - 1 ) + pp + ':{oClass:"' + ooo.oClass + '",data:{\n';
										map += saveMap[ ooo.oClass ]( ooo );
										map += '\t'.repeat( count - 1 ) + '}},\n';
									}
								}
							}
						}
					}
				}
			}
			count--;
			return map;
		}
		count++;
		return 'return {\n'+ createMap( root, '' ) + '}\n';
	}
	objectHash( objct )
	{
		return this.awi.system.toSha1( objct );
	}
	compareTwoStrings( first, second, control = {} )
	{
		if ( control.caseInsensitive )
		{
			first = first.toLowerCase();
			second = second.toLowerCase();
		}
		first = first.replace( /\s+/g, '' );
		second = second.replace( /\s+/g, '' );

		if ( first === second ) return 1; // identical or empty
		if ( first.length < 2 || second.length < 2 ) return 0; // if either is a 0-letter or 1-letter string

		let firstBigrams = new Map();
		for ( let i = 0; i < first.length - 1; i++ )
		{
			const bigram = first.substring( i, i + 2 );
			const count = firstBigrams.has( bigram )
				? firstBigrams.get( bigram ) + 1
				: 1;

			firstBigrams.set( bigram, count );
		};

		let intersectionSize = 0;
		for ( let i = 0; i < second.length - 1; i++ )
		{
			const bigram = second.substring( i, i + 2 );
			const count = firstBigrams.has( bigram )
				? firstBigrams.get( bigram )
				: 0;

			if ( count > 0 )
			{
				firstBigrams.set( bigram, count - 1 );
				intersectionSize++;
			}
		}
		return { result: ( 2.0 * intersectionSize ) / ( first.length + second.length - 2 ) };
	}
	findBestMatch( mainString, targetStrings )
	{
		const ratings = [];
		let bestMatchIndex = 0;
		for ( let i = 0; i < targetStrings.length; i++ )
		{
			const currentTargetString = targetStrings[ i ];
			const currentRating = this.compareTwoStrings( mainString, currentTargetString );
			ratings.push( { target: currentTargetString, rating: currentRating } );
			if ( currentRating > ratings[ bestMatchIndex ].rating )
			{
				bestMatchIndex = i
			}
		}
		return { ratings: ratings, bestMatch: ratings[ bestMatchIndex ], bestMatchIndex: bestMatchIndex };
	}
	matchTwoStrings( string1, string2, options = {} )
	{
		if ( this.isArray( string1 ) )
			string1 = string1.join( ' ' );
		if ( this.isArray( string2 ) )
			string2 = string2.join( ' ' );
		string1 = string1.split( '\n' ).join( ' ' );
		string2 = string2.split( '\n' ).join( ' ' );
		if ( options.caseInsensitive )
		{
			string1 = string1.toLowerCase();
			string2 = string2.toLowerCase();
		}
		var words1 = string1.split( ' ' );
		var words2 = string2.split( ' ' );
		if ( words1.length == 0 )
			return { result: 0, count: 0 };
		var positions = [];
		for ( var w1 = 0; w1 < words1.length; w1++ )
		{
			var word1 = words1[ w1 ];
			for ( var w2 = 0; w2 < words2.length; w2++ )
			{
				var position = word1.indexOf( words2[ w2 ] );
				if ( position >= 0 )
				{
					positions.push( position )
				}
			}
		}
		var count = positions.length;
		return { result: count / words1.length, score: count / words2.length, count: count, positions: positions };
	}
	async loadJavascript( path, options = {} )
	{
		var answer = await this.awi.system.readFile( path, { encoding: 'utf8' } );
		if ( answer.success )
		{
			var source = answer.data;
			answer.data = {};
			try
			{
				if ( !options.eval )
				{
					var f = Function( source + '' );
					f.window = {};
					answer.data.result = f();
				}
				else
				{
					var window = {};
					eval( source + '' );
				}
				answer.data.window = window;
			} catch( e ) {
				answer.success = false;
			}
		}
		return answer;
	}
	removePunctuation( text )
	{
		var result = '';
		for ( var p = 0; p < text.length; p++ )
		{
			var c = text.charAt( p );
			if ( ( c >= 'a' && c <= 'z') || ( c >= 'A' && c <= 'Z' ) || c == ' ' || c == '_' )
				result += c;
		}
		return result;
	}
	isExpression( text )
	{
		var result = false;
		var c = text.charAt( 0 );
		if ( c == '(')
		{
			var count = 1;
			for ( var p = 0; p < text.length; p++ )
			{
				var c = text.charAt( p );
				if ( c == '(' )
					count++;
				else if ( c == ')' )
				{
					count--;
					if ( count == 0 )
						break;
				}
			}
			if ( count == 0 && p + 1 >= text.length )
				return true;
		}
		for ( var p = 0; p < text.length; p++ )
		{
			var c = text.charAt( p );
			if ( c == '+' || c == '-' || c == '*' || c == '/' || c == '(' || c == ')' )
				result = true;
		}
		return result;
	}
	isPath( text )
	{
		var result = false;
		if ( typeof text != 'undefined' )
		{
			for ( var p = 0; p < text.length; p++ )
			{
				var c = text.charAt( p );
				if ( c == '/' || c == '\\' || c == '*' || c == '.' || c == '?' )
					result = true;
			}
			if ( result )
			{
				try
				{
					this.parse( text );
				} catch ( e )
				{
					return false;
				}
			}
		}
		return result;
	}
}
module.exports.Connector = ConnectorUtilityUtilities