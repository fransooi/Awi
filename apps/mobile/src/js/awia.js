
class Awia extends AwiaRenderer
{
	constructor( canvasId, options )
	{
		options.canvasId = canvasId;
		super( options );
		this.awi = null;
		options.loadAwi = typeof options.loadAwi == 'undefined' ? true : options.loadAwi;
		options.runAwi = typeof options.runAwi == 'undefined' ? true : options.runAwi;
		options.width = typeof options.loadAwi == 'undefined' ? 1440 : options.width;
		options.height = typeof options.runAwi == 'undefined' ? 3040 : options.height;
		this.options = options;
	}
	onMouseDown()
	{
	}
	onMouseUp()
	{
	}
	onMouseMove()
	{
	}
	async run()
	{
		var self = this;
		var done = false;
		this.startEvents( {
			mousedown:
				function( event )
				{
					self.onMouseDown( event )
				} }, {
			mouseup:
				function( event )
				{
					self.onMouseUp( event )
				} }, {
			mousemove:
				function( event )
				{
					self.onMouseMove( event )
				} } );

		var success = await this.runAwi( this.options );
		if ( success )
		{
			var self = this;
			this.update = function()
			{
				self.render();
				window.requestAnimationFrame( self.update );
			}
			window.requestAnimationFrame( self.update );
		}
		done = true;

		return new Promise(
			function( resolve )
			{
				function check()
				{
					var handle = setInterval(
						function()
						{
							if ( done )
							{
								clearInterval( handle );
								resolve( success );
							}
						}, 1 );
				};
				check();
		} );
	}

	async runAwi( args = {} )
	{
		var control = {};
		var data = {};
		function getArgs( args, defaults )
		{
			for ( var a in defaults )
			{
				if ( typeof args[ a ] == 'undefined' )
					args[ a ] = defaults[ a ];
			}
			return args;
		}

		var args = getArgs( args,
		{
			prompt: '',
			configurations: './configs',
			engine: [],
			data: './data',
			connectors:
			[
				{ name: 'systems.mobile', options: {}, default: true },
				{ name: 'utilities.utilities', options: {}, default: true },
				{ name: 'utilities.time', options: {}, default: true },
				{ name: 'utilities.parser', options: {}, default: true },
				{ name: 'clients.openaibrowser', options: {}, default: true },
				{ name: 'editors.mobile', options: {}, default: true },
				{ name: 'languages.javascript', options: {}, default: true },
				{ name: 'importers.*', options: {} },
			]
		} );
		args.printCallback =
			function( response )
			{
				debugger;
			};
		this.awi = new window.awi.Awi( args );
		return await this.awi.connect( '', data, control );
	}
}
