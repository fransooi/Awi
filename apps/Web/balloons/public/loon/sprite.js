class Sprite extends Displayable
{
	constructor( loon, parent = {}, options = {} )
	{
		super( loon, parent, options );

		this.className = 'Sprite';
		if ( options.src )
		{
			var self = this;
			this.loaded = false;
			this.canvas = new Image();
			this.canvas.onload = function()
			{
				self.loaded = true;
				self.setDimension( { x: this.width, y: this.height } );
				if ( options.hotSpot )
					self.setHotspot( options.hotSpot );
			}
			this.canvas.src = options.src;
			this.isCanvas = false;
			this.isImage = true;
		}
		else if ( options.dimension )
		{
			self.setDimension( options.dimension );
			this.canvas = document.createElement( 'canvas' );
			this.canvas.width = this.dimension.x;
			this.canvas.height = this.dimension.y;
			this.loaded = true;
			this.isCanvas = true;
			this.isImage = false;
		}
	}
	update( deltaTime )
	{
		return super.update( deltaTime );
	}
	redraw( redrawInfo )	
	{
		if ( this.loaded && !this.destroyed )
		{
			redrawInfo.context.globalAlpha = this.alpha;
			if ( this.shadowColor != null )
			{
				redrawInfo.context.shadowOffsetX = this.shadow.x;
				redrawInfo.context.shadowOffsetY = this.shadow.y;
				redrawInfo.context.shadowBlur = this.shadow.blur;
				redrawInfo.context.shadowColor = this.root.utilities.getModernRGBAString( this.shadow.shadowColor );
			}
			var xDraw = redrawInfo.position.x;
			var yDraw = redrawInfo.position.y;
			var angle = redrawInfo.angle + this.angle ; 
			var scale = { x: redrawInfo.scale.x * this.scale.x, y: redrawInfo.scale.y * this.scale.y, z: 1 }; 
			var skew = { x: redrawInfo.skew.x + this.skew.x * scale.x, y: redrawInfo.skew.y + this.skew.y * scale.y, z: 0 }; 
			angle = 0;
			if ( angle == 0 && skew.x == 0 && skew.y == 0 )
			{
				var deltaX = this.hotSpot.x * scale.x;
				var deltaY = this.hotSpot.y * scale.y;
				var width = this.dimension.x * scale.x;
				var height = this.dimension.y * scale.y;
				redrawInfo.context.drawImage( this.canvas, 0, 0, this.canvas.width, this.canvas.height, xDraw - deltaX, yDraw - deltaY, width, height );
			}
			else
			{
				redrawInfo.context.save();	
				redrawInfo.context.translate( xDraw, yDraw );
				redrawInfo.context.rotate( angle );
				redrawInfo.context.transform( scale.x, skew.y * scale.y, skew.x * scale.x, scale.y, 0, 0 );
				redrawInfo.context.translate( -this.hotSpot.x, -this.hotSpot.y );
				redrawInfo.context.drawImage( this.canvas, 0, 0 );
				redrawInfo.context.restore();
			}
		}
		return redrawInfo;
	}
}

