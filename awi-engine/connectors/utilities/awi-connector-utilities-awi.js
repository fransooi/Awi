var awiconnector = require( '../awi-connector' );

class ConnectorUtilitieAwi extends awiconnector.Connector
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Awi';
		this.token = 'awi';
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
		/*
		var regex = [ /([a-zA-Z]{3})\s(\d{1,2}),\s(\d{4})\s(\d{1,2}):(\d{2}):(\d{2})(am|pm|AM|PM)?/ ];
		var found = this.matchRegex( line, regex );
		while ( found )
		{
			var start = line.indexOf( found[ 0 ] );
			var end = start + found[ 0 ].length;
			line = line.substring( 0, start ) + line.substring( end );
			found = this.matchRegex( line, regex );
		}
		*/
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
		var param = {};
		for ( var p in props )
		{
			if ( p == 'type' || p == 'interval' || p == 'default' || p == 'optional' )
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
			id = root + ( root ? '-' : '' ) + count;
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
					id += '-' + time;
			}
			var numbers = '';
			for ( var n = 0; n < nNumbers; n++ )
				numbers += String.fromCharCode( 48 + Math.floor( Math.random() * 10 ) );
			id += '-' + numbers;
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
	compareTimestamps( timestamp1, timestamp2 )
	{
		var list = [ 'time', 'year', 'month', 'day', 'hours', 'minutes', 'seconds' ];
		function checkIt( type )
		{
			if ( timestamp1[ type ] && timestamp2[ type ] )
			{
				if ( timestamp1[ type ] < timestamp2[ type ] )
					return -1;
				if ( timestamp1[ type ] > timestamp2[ type ] )
					return 1;
				return 0;
			}					
		}
		var check;
		for ( var l = 0; l < list.length; l++ )
		{
			check = checkIt( list[ l ] );
			if ( check < 0 )
				return -1;
		}
		return check;
	}
	getTimestamp( matches, monthReplacement )
	{
		var [ _, month, day, year, hours, minutes, seconds, ampm ] = matches;
	
		// Convert month to number
		var monthList = 
		[
			"JanuFebrMarsApriMay JuneJulyAuguSeptOctoNoveDece",
			"JanvFevrMarsAvriMai JuinJuilAoutSeptOctoNoveDece",
			"JanvFévrMarsAvriMai JuinJuilAoûtSeptOctoNoveDéce",
		]
		var nMonth;
		month = month.substring( 0, 4 ).toLowerCase();
		for ( var n = 0; n < monthList.length; n++ )
		{		
			var nMonth = monthList[ n ].toLowerCase().indexOf( month );
			if ( nMonth >= 0 )
			{
				nMonth /= 4;
				nMonth++;
				break;
			}
		}
		if ( nMonth < 1 )
			nMonth = monthReplacement;
		month = nMonth;	
		var isPM = ( ampm === 'pm' || ampm === 'PM' );
		var newHours = ( isPM && hours !== '12' ) ? parseInt( hours ) + 12 : parseInt( hours );
		var timeInfo =
		{
			day: typeof day == 'undefined' ? 'DD' : this.fillString( day, '0', 2, 'start' ),
			month: typeof month == 'undefined' ? 'MM' : this.fillString( '' + month, '0', 2, 'start' ),
			year:  typeof year == 'undefined' ? 'YYYY' : this.fillString( year, '??', 4, 'start' ),
			hours:  typeof hours == 'undefined' ? 'HH' : this.fillString( hours, '0', 2, 'start' ),
			minutes:  typeof minutes == 'undefined' ? 'MM' : this.fillString( minutes, '0', 2, 'start' ),
			seconds: typeof seconds == 'undefined' ? 'SS' : this.fillString( seconds, '0', 2, 'start' ),
		};
		var timeString = this.format( '{year}-{month}-{day}.{hours}:{minutes}:{seconds}', timeInfo );
	
		var time;
		try
		{
			time = new Date( parseInt( year ), month - 1, parseInt( day ), newHours, parseInt( minutes ), parseInt( seconds ) ).getTime();
		}
		catch( e )
		{		
		}
		return { time: time, text: timeString, info: timeInfo };	
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
				result.dir += '/' + result.base;
				result.base = '';
			}
		}
		return result;
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
		var count = 0;
		for ( var w1 = 0; w1 < words1.length; w1++ )
		{
			for ( var w2 = 0; w2 < words2.length; w2++ )
			{
				if ( words1[ w1 ].indexOf( words2[ w2 ] ) >= 0 )
					count++;
			}
		}
		return { result: count / words1.length, score: count / words2.length, count: count };
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
}
module.exports.Connector = ConnectorUtilitieAwi