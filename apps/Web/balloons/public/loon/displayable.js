class Displayable extends Item
{
	constructor( loon, parent = {}, options = {} )
	{
		super( loon, parent, options );
		this.className = 'Displayable';

		this.slopes =
		{
			up: { x: 0, y: -1, z: 0 },
			up_left: { x: -1, y: -1, z: 0 },
			left: { x: -1, y: 0, z: 0 },
			down_left: { x: -1, y: 1, z: 0 },
			down: { x: 0, y: 1, z: 0 },
			down_right: { x: 1, y: 1, z: 0 },
			right: { x: 1, y: 0, z: 0 },
			up_right: { x: 1, y: -1, z: 0 },
		}
		this.displayList = [];
		this.toDestroy = [];
		this.destroyed = false;
		this.transmit = {};
		this.toUpdate = { list: false, display: false };
		this.position = { x: 0, y: 0, z: 0 };
		this.dimension = { x: 0, y: 0, z: 0 };
		this.scale = { x: 1, y: 1, z: 1 };
		this.hotSpot = { x: 0, y: 0, z: 0 };
		this.skew = { x: 0, y: 0, z: 0 };
		if ( typeof options.position != 'undefined' )
			this.setPosition( options.position );
		if ( typeof options.dimension != 'undefined' )
			this.setDimension( options.dimension );
		if ( typeof options.scale != 'undefined' )
			this.setScale( options.scale );
		if ( typeof options.hotSpot != 'undefined' )
			this.setHotspot( options.hotSpot );
		this.setAngle( typeof options.angle != 'undefined' ? options.angle : 'up' );
		this.backgroundColor = options.backgroundColor;
		this.shadow = options.shadow;
		this.alpha = ( typeof options.alpha != 'undefined' ? options.alpha : 1.0 );
		this.visible = ( typeof options.visible != 'undefined' ? options.visible : true );
		this.active = ( typeof options.active != 'undefined' ? options.active : true );
		this.width = 0;
		this.height = 0;
	}
	setPosition( position )
	{
		if ( position.x != this.position.x )
		{
			var x = position.x;
			switch ( x )
			{
				case 'left':
					x = 0;
					break;
				case 'center':
					x = this.parent.dimension.x / 2;
					break;
				case 'right':
					x = this.parent.dimension.x - this.dimension.x;
					break;
				default:
					break;
			}
			this.position.x = x;
			this.toUpdate.display = true;
		}
		if ( position.y != this.position.y )
		{
			var y = position.y;
			switch ( y )
			{
				case 'top':
					y = 0;
					break;
				case 'center':
					y = this.parent.dimension.y / 2;
					break;
				case 'bottom':
					y = this.parent.dimension.y - this.dimension.y;
					break;
				default:
					break;
			}
			this.position.y = y;
			this.toUpdate.display = true;
		}
		if ( position.z != this.position.z )
		{
			var z = position.z;
			switch ( z )
			{
				case 'back':
					z = 0;
					break;
				case 'middle':
					z = 50;
					break;
				case 'front':
					z = 100;
					break;
				default:
					break;
			}
			this.position.z = z;
			this.toUpdate.display = true;
		}
	}
	setDimension( dimension )
	{
		if ( dimension.x != this.dimension.x )
		{
			var x = dimension.x;
			switch ( x )
			{
				case 'cover':
					x = this.parent.dimension.x;
					break;
				case 'half':
					x = this.parent.dimension.x / 2;
					break;
				default:
					break;
			}
			this.dimension.x = x;
			this.toUpdate.display = true;
		}
		if ( dimension.y != this.dimension.y )
		{
			var y = dimension.y;
			switch ( y )
			{
				case 'cover':
					y = this.parent.dimension.y;
					break;
				case 'half':
					y = this.parent.dimension.y / 2;
					break;
				default:
					break;
			}
			this.dimension.y = y;
			this.toUpdate.display = true;
		}
	}
	setHotspot( hotSpot )
	{
		if ( hotSpot.x != this.hotSpot.x )
		{
			var x = hotSpot.x;
			switch ( x )
			{
				case 'left':
					x = 0;
					break;
				case 'center':
					x = this.dimension.x / 2;
					break;
				case 'right':
					x = this.dimension.x;
					break;
				default:
					break;
			}
			this.hotSpot.x = x;
			this.toUpdate.display = true;
		}
		if ( hotSpot.y != this.hotSpot.y )
		{
			var y = hotSpot.y;
			switch ( y )
			{
				case 'top':
					y = 0;
					break;
				case 'middle':
					y = this.dimension.y / 2;
					break;
				case 'bottom':
					y = this.dimension.y;
					break;
				default:
					break;
			}
			this.hotSpot.y = y;
			this.toUpdate.display = true;
		}
	}
	setAngle( angle )
	{
		if ( typeof angle == 'string' )
		{
			this.direction = angle;
			var direction = this.slopes[ angle ];
			if ( direction )
				this.angle = this.utilities.getAngle( { x: 0, y: 0, z: 0 }, direction );
			this.toUpdate.display = true;
		}
		else if ( angle != this.angle )
		{
			this.angle = angle;
			this.toUpdate.display = true;
		}
	}
	setScale( scale )
	{
		if ( scale.x != this.scale.x )
		{
			var x = scale.x;
			switch ( x )
			{
				case 'cover':
					x = this.parent.dimension.x / this.dimension.x;
					break;
				case 'half':
					x = ( this.parent.dimension.x / this.dimension.x ) / 2;
					break;
				default:
					break;
			}
			this.scale.x = x;
			this.toUpdate.display = true;
		}
		if ( scale.y != this.scale.y )
		{
			var y = scale.y;
			switch ( y )
			{
				case 'cover':
					scaleY = this.parent.dimension.y / this.dimension.y;
					break;
				case 'half':
					scaleY = ( this.parent.dimension.y / this.dimension.y ) / 2;
					break;
				default:
					break;
			}
			this.scale.y = y;
			this.toUpdate.display = true;
		}
	}
	addToDisplaylist( displayItem, position, otherItem )
	{
		if ( this.displayList.find( function( element ) { return displayItem == element; } ) )
			return false;

		if ( typeof position == 'string' )
		{
			switch( position )
			{
				case 'before':
					var index = this.displayList.findIndex( function( element ) { return otherItem == element; } );
					if ( index >= 0 )
						this.displayList.splice( index, 0, displayItem );
					break;
				case 'after':
					var index = this.displayList.findIndex( function( element ) { return otherItem == element; } );
					if ( index >= 0 )
						this.displayList.splice( index + 1, 0, displayItem );
					break;
				case 'first':
					this.displayList.splice( 0, 0, displayItem );
					break;
				case 'last':
				default:
					this.displayList.push( displayItem );
					break;
			}
			this.toUpdate.list = true;
			return;
		}
		this.displayList.push( displayItem );
		this.toUpdate.list = true;
	}
	removeFromDisplayList( displayItem )
	{
		var index = this.displayList.findIndex( function( element )
		{
			return displayItem == element;
		} );
		if ( index >= 0 )
		{
			this.displayList.splice( index, 1 );
			this.toUpdate.list = true;
		}
	}
	destroy()
	{
		if ( !this.destroyed )
		{
			this.destroyed = true;
			this.root.toDestroy.push( { item: this, parent: this.parent } );
		}
	}
	checkToDestroy()
	{
		for ( var d = 0; d < this.toDestroy.length; d++ )
		{
			var toDestroy = this.toDestroy[ d ];
			if ( toDestroy )
			{
				toDestroy.parent.removeFromDisplayList( toDestroy.item );
			}
		}
		toDestroy = [];				
	}
	update( deltaTime )
	{
		if ( this.destroyed )
			return false;

		var redraw = super.update( deltaTime );
		if ( this.toUpdate.list )
		{
			this.displayList.sort(
				function( element1, element2 )
				{
					if ( element1.position.z < element2.position.z )
						return -1;
					if ( element1.position.z > element2.position.z )
						return 1;
					return 0;
				} );
			this.toUpdate.list = false;
			redraw = true;
		}
		if ( redraw || this.toUpdate.display )
		{
			for ( var d = 0; d < this.displayList.length; d++ )
			{
				var toDisplay = this.displayList[ d ];
				if ( toDisplay.active )
				{
					redraw |= toDisplay.update( deltaTime );
				}
			}
			this.toUpdate.display = false;
			redraw = true;
		}
		return redraw;
	}
	enterRedraw( redrawInfo = {}, canvas )
	{
		this.redrawInfoEntry = redrawInfo;

		this.redrawInfo = {};
		if ( typeof redrawInfo.context != 'undefined' )
		{
			this.redrawInfo.context = redrawInfo.context;
			this.redrawInfo.angle = redrawInfo.angle;
			this.redrawInfo.position = this.utilities.copyObject( redrawInfo.position );
			this.redrawInfo.dimension = this.utilities.copyObject( redrawInfo.dimension );
			this.redrawInfo.scale = this.utilities.copyObject( redrawInfo.scale );
			this.redrawInfo.skew = this.utilities.copyObject( redrawInfo.skew );
		}
		else if ( typeof canvas != 'undefined' )
		{
			this.redrawInfo =
			{
				context: canvas.getContext( '2d' ),
				position: { x: 0, y: 0, z: 0 },
				dimension: { x: canvas.width, y: canvas.height, z: 0 },
				scale: { x: 1, y: 1, z: 1 },
				skew: { x: 0, y: 0, z: 0 },
				angle: 0
			}
		}
		return this.redrawInfo;
	}
	exitRedraw( redrawInfo )
	{
		for ( var d = 0; d < this.displayList.length; d++ )
		{
			var toDisplay = this.displayList[ d ];
			if ( toDisplay.visible )
			{
				redrawInfo = toDisplay.enterRedraw( redrawInfo );
				toDisplay.redraw( redrawInfo );
				if ( toDisplay.transmit.position )
				{
					redrawInfo.position.x += toDisplay.position.x;
					redrawInfo.position.y += toDisplay.position.y;
				}
				redrawInfo = toDisplay.exitRedraw( redrawInfo );			
			}
		}
		return this.redrawInfoEntry;
	}
	redraw( redrawInfo = {} )
	{
		if ( this.destroyed )
			return redrawInfo;
		if ( this.backgroundColor )
		{
			if ( this.backgroundColor != 'transparent' )
			{
				redrawInfo.context.fillStyle = this.backgroundColor;
				redrawInfo.context.fillRect( 0, 0, this.dimension.x, this.dimension.y );
			}
			else
			{
				redrawInfo.context.clearRect( 0, 0, this.dimension.x, this.dimension.y );
			}
		}
		return redrawInfo;
	}
}
