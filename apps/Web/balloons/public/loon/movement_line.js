class MovementLine extends Displayable
{
	constructor( loon, parent = {}, options = {} )
	{
		super( loon, parent, options );
		this.className = 'Displayable';

		this.mode = 'stopped';
		this.number = -1;
		this.movementList = [];
		this.transmit.position = true;
		this.destroyAtEnd = ( typeof options.destroyAtEnd != 'undefined' ? options.destroyAtEnd : true );
		if ( typeof options.list != 'undefined' )
			this.movementList = options.list;
		else
			this.movementList.push( options );
		this.nextMovement();
	}
	previousMovement()
	{
		if ( this.number > 0 )
			this.setMovement( this.movementList[ --this.number ] );
	}
	nextMovement()
	{
		if ( this.number < this.movementList.length - 1 )
			this.setMovement( this.movementList[ ++this.number ] );
	}
	setMovement( movement )
	{
		this.duration = typeof movement.duration != 'undefined' ? movement.duration : 1000;
		this.speed = typeof movement.speed != 'undefined' ? movement.speed : 1.0;
		this.direction = movement.direction;		
		if ( typeof movement.end != 'undefined' )
			this.end = this.utilities.getCoordinates( movement.end, this.dimension, this.parent );
		if ( typeof this.direction == 'undefined' )
		{
			this.angle = this.utilities.getAngle( this.start, this.end );
		}
		else
		{
			var direction = this.slopes[ this.direction ];
			if ( direction )
				this.angle = this.utilities.getAngle( { x: 0, y: 0, z: 0 }, direction );
		}
		this.setMode( typeof movement.mode != 'undefined' ? movement.mode : 'playing' );
		if ( typeof movement.duration != 'undefined' )
		{
			var self = this;
			this.durationHandle = setTimeout( 
				function()
				{
					self.setMode( 'stopped' );
				}, movement.duration );
		}		
		this.toUpdate.display = true;
	}
	setMode( mode )
	{
		if ( this.mode != mode )
		{
			if ( this.durationHandle != null )
			{
				clearTimeout( this.durationHandle );
				this.durationHandle = null;
			}
			this.mode = mode;
		}		
	}
	update( deltaTime )
	{
		if ( this.mode == 'playing' )
		{
			if ( this.speed != 0 )
			{
				var x = Math.cos( this.angle ) * this.speed * deltaTime / 1000;
				var y = Math.sin( this.angle ) * this.speed * deltaTime / 1000;
				this.setPosition( { x: this.position.x + x, y: this.position.y + y, z: 0 } );
				if ( this.end )
				{
					var distance;
					if ( typeof this.end.x == 'undefined' )
						distance = this.utilities.getDistance( { x: this.position.x, y: this.position.y, z: 0 }, { x: this.position.x, y: this.end.y, z: 0 } );
					else if ( typeof this.end.y == 'undefined' )
						distance = this.utilities.getDistance( { x: this.position.x, y: this.position.y, z: 0 }, { x: this.end.x, y: this.position.y, z: 0 } );
					else
						distance = this.utilities.getDistance( { x: this.position.x, y: this.position.y, z: 0 }, this.end );
					if ( distance < 3 )
					{
						this.setMode( 'stopped' );
						this.destroy();
					}
				}
				this.toUpdate.display = true;
				return true;
			}
		}
		return false;
	}
}
