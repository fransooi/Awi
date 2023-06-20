
class AwiaRenderer extends AwiaUtilities
{
	constructor( options )
	{
		super( options );
		this.screenCanvasId = options.canvasId;
		this.screenCanvas = document.getElementById( this.screenCanvasId );
		this.screenContext = this.screenCanvas.getContext( '2d' );

		this.width = options.width;
		this.height = options.height;
		this.canvas = document.createElement( 'canvas' );
		this.context = this.canvas.getContext( '2d' );
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		this.visible = false;
		this.rendering = 0;
		this.backgroundColor = 0x00FFFFFF;
		this.sprites = [];
		this.images = {};

		var self = this;
		this.doResize = function()
		{
			var width, height;
			if ( !self.screenCanvas.parentElement || self.screenCanvas.parentElement === document.body )
			{
				width = window.innerWidth;
				height = window.innerHeight;
			}
			else
			{
				width = self.screenCanvas.parentElement.clientWidth;
				height = self.screenCanvas.parentElement.clientHeight;
			}
			self.screenCanvas.width = width;
			self.screenCanvas.height = height;
		};
		window.addEventListener( "resize", this.doResize );
		this.doResize();
	}
	setVisible( isVisible )
	{
		this.visible = isVisible;
	}
	startEvents( list )
	{
		this.eventList = list;
		for ( var e in list )
			this.screenCanvas.addEventListener( e, list[ e ] );
	}
	stopEvents()
	{
		for ( var e in this.eventList )
			this.screenCanvas.removeEventListener( e, this.eventList[ e ] );
	}
	async loadImage( name, options = {} )
	{
		var image;
		return new Promise(
			function( resolve )
			{
				if ( !image )
				{
					image = new Image();
					image.onload = function()
					{
						var imageDef = {
							canvas: this,
							width: this.width,
							height: this.height,
							hotspot: { x: 0, y: 0 } };
						if ( options.hotspot )
						{
							if ( options.hotspot.indexOf( '#center' ) >= 0 )
								imageDef.hotspot.x = this.width / 2;
							if ( options.hotspot.indexOf( '#middle' ) >= 0 )
								imageDef.hotspot.y = this.height / 2;
						}
						resolve( imageDef );
					}
					image.onerror = function()
					{
						resolve( null );
					}
					image.src = './assets/imgs/' + name + '.png';
				}
			} );
	}
	async loadImages( list, options = {} )
	{
		for ( var i = 0; i < list.length; i++ )
		{
			this.images[ list[ i ] ] = await this.loadImage( list[ i ], options );
		};
	}
	createSprites( list, options )
	{
		this.sprites.push( ...list );
	}
	render()
	{
		if ( this.visible && !this.rendering )
		{
			this.rendering++;
			this.context.globalAlpha = 1.0;
			this.context.fillStyle = this.getColorString( this.backgroundColor );
			this.context.fillRect( 0, 0, this.width, this.height );
			for ( var s = 0; s < this.sprites.length; s++ )
			{
				var sprite = this.sprites[ s ];
				var image = this.images[ sprite.image ];
				var x = sprite.position.x - image.hotspot.x * sprite.scale.x;
				var y = sprite.position.x - image.hotspot.x * sprite.scale.x;
				this.context.drawImage( image.canvas, 0, 0, image.width, image.height,
										x, y, image.width * sprite.scale.x, image.height * sprite.scale.y );
			}
			this.screenContext.clearRect( 0, 0, this.screenCanvas.width, this.screenCanvas.height );
			this.screenContext.drawImage( this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, this.screenCanvas.width, this.screenCanvas.height );
			this.rendering--;
		}
	}
	onMouseDown( event )
	{
		this.mouseDown = true;
		this.eventCallback( 'mousedown', event );
	}
	onMouseup( event )
	{
		this.mouseDown = false;
		this.eventCallback( 'mouseup', event );
	}
}
