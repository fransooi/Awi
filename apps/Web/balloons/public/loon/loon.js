
class LoonEngine
{
	constructor( name, options = {} )
	{
		window.Loon = this;

		this.className = 'LoonEngine';
		this.name = name;
		this.options = options;
		this.loaded = false;
	}
	init()
	{
		var self = this;
		this.loadJavascript( 
			[
				'/loon/utilities.js',
				'/loon/item.js',
				'/loon/displayable.js',
				'/loon/sprite.js',
				'/loon/movement_line.js',
				'/loon/root.js',
			], function( success, data, extra )
			{
				if ( success )
				{
					self.loaded = true;
					self.utilities = new Utilities( self, self.options );
					self.root = new Root( self, self, self.options );
				}
			} );			
	}
	loadJavascript( fileList, callback, extra )
	{
		var errors = [];
		var loaded = 0;
		var toLoad = fileList.length;
		var loadFile = function loadJavascriptFile( number )
		{
			var script = document.createElement( 'script' );
			script.type = 'text/javascript';
			script.onload = function ()
			{
				console.log( 'Loaded Javascript code: ' + fileList[ number ] );

				loaded++;
				number++;
				if ( number < toLoad )
					loadFile( number );
			};
			script.onerror = function ()
			{
				console.log( 'Error loading Javascript code: ' + fileList[ number ] );

				errors.push( fileList[ i ] );
				loaded++;
				number++;
				if ( number < toLoad )
					loadFile( number );
			};
			script.src = fileList[ number ];
			document.body.appendChild( script );
		}
	
		var start = new Date().getTime();
		loadFile( 0 );
			
		var handle = setInterval( function()
		{
			if ( loaded == toLoad )
			{
				clearInterval( handle );
				var time = new Date().getTime() - start;
				if ( errors.length == 0 )
				{
					console.log( "loaded javascript!" );
					callback( true, { time: time }, extra );
				}
				else
				{				
					callback( false, { time: time, errors: errors }, extra );
				}
				return;
			}
		}, 20 );
	}	
}
window.LoonEngine = LoonEngine;
