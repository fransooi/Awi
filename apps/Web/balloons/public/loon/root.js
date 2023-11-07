class Root extends Displayable
{
	constructor( loon, parent = {}, options = {} )
	{
		super( loon, parent, options );

		this.className = 'Root';
		this.canvas = document.getElementById( options.canvasId );
		this.dimension = { x: this.canvas.width, y: this.canvas.height };

		setTimeout( 
			function()
			{
				var handle = setInterval(
					function()
					{
						var movement = new MovementLine( loon, self, 
						{
							position: { x: self.dimension.x / 2 + ( Math.random() - 0.5 ) * self.dimension.x, y: self.dimension.y + 100, z: 0 },
							end: { y: -100 },
							speed: 250 + ( Math.random() - 0.5 ) * 250,
							direction: 'up'
						} );
						self.addToDisplaylist( movement );

						var scale = 0.10 + Math.random() * 0.3;
						var bubble = new Sprite( loon, movement, 
						{
							src: '/images/bubble-colors.png',
							position: { x: 0, y: 0, z: 0 },
							scale: { x: scale, y: scale, z: 1 },
							hotSpot: { x: 'center', y: 'middle' },
							duration: 1000 * 1000
						} );
						movement.addToDisplaylist( bubble );
					}, 100 );
			})
	
		var self = this;
		this.updateHandle = setInterval(
			function()
			{
				self.toUpdate.display = true;
				var redraw = self.update( new Date().getTime() - self.time );
				if ( redraw )
					self.redraw();
				self.checkToDestroy();
			}, options.refreshRateMs ? options.refreshRateMs : 20 ); 
	}
	setDimension( width, height )
	{
		super.setDimension( width, height );
		if ( this.toUpdate.display )
		{
			this.canvas.width = this.dimension.x;
			this.canvas.height = this.dimension.y;
		}
	}
	destroy()
	{
		this.destroyed = true;		
	}
	update( deltaTime )
	{
		return super.update( deltaTime );
	}
	redraw()
	{
		var redrawInfo = super.enterRedraw( {}, this.canvas );		
		redrawInfo = super.redraw( redrawInfo );
		return super.exitRedraw( redrawInfo );
	}
}

