class Utilities
{
	constructor( loon, options = {} )
	{
		this.className = 'Utilities';
		this.loon = loon;
		this.options = options;
	}
	isObject( item )
	{
		return typeof item != 'undefined' ? (typeof item === "object" && !Array.isArray(item) && item !== null) : false;
	}
	isArray( item )
	{
		return typeof item != 'undefined' ? item.constructor == Array : false;
	}
	copyObject( source, dest = {} )
	{
		for ( var p in source )
			dest[ p ] = source[ p ];
		return dest;
	}
	getCoordinates( coords, dimension, parent )
	{
		if ( !coords )
			coords = { x: 0, y: 0, z: 0 };

		var x = coords.x;		
		switch ( x )
		{
			case 'left':
				x = 0;
				break;
			case 'center':
				x = parent.dimension.x / 2;
				break;
			case 'right':
				x = parent.dimension.x - dimension.x;
				break;
			case 'cover':
				x = parent.dimension.x;
				break;
			case 'half':
				x = parent.dimension.x / 2;
				break;
			default:
				break;
		}
		coords.x = x;

		var y = coords.y;		
		switch ( y )
		{
			case 'top':
				y = 0;
				break;
			case 'middle':
				y = parent.dimension.y / 2;
				break;
			case 'bottom':
				y = parent.dimension.y - dimension.y;
				break;
			case 'cover':
				y = parent.dimension.y;
				break;
			case 'half':
				y = parent.dimension.y / 2;
				break;
			default:
				break;
		}
		coords.y = y;
		return coords;
	}
	getDistance( pivot, point )
	{
		var xDiff = point.x - pivot.x;
		var yDiff = point.y - pivot.y;
		return Math.sqrt( xDiff * xDiff + yDiff * yDiff );
	};	
	getAngle( pivot, point, radian = true )
	{
		var angle = Math.atan2( -( point.y - pivot.y ), point.x - pivot.x );
		if ( angle <= 0)
			angle = Math.abs( angle );
		else
			angle = Math.PI * 2 - angle;
		return angle;
	};
	getRotatedPoint( pivot, point, angle )
	{
		var x, y, distance, diffX, diffY;
		diffX = point.x - pivot.x;
		diffY = point.y - pivot.y;
		distance = Math.sqrt( diffX * diffX + diffY * diffY );
		angle += Math.atan2( diffY, diffX );
		x = pivot.x + distance * Math.cos( angle );
		y = pivot.y + distance * Math.sin( angle );
		return { x: x, y: y };
	};	
	getRotatedBox( point, dimension, rotation )
	{
		var x1 = point.x - ( dimension.x / 2 ), y1 = point.y - ( dimension.y / 2 ), x2 = point.x + ( dimension.x / 2 ), y2 = point.y - ( dimension.y / 2 );
		var x3 = point.x + ( dimension.x / 2 ), y3 = point.y + ( dimension.y / 2 ), x4 = point.x - ( dimension.x / 2 ), y4 = point.y + ( dimension.y / 2 );
	
		var c = this.getRotatedPoint( x, y, x1, y1, rotation );
		x1 = c.x; y1 = c.y;
	
		c = this.getRotatedPoint( x, y, x2, y2, rotation );
		x2 = c.x; y2 = c.y;
	
		c = this.getRotatedPoint( x, y, x3, y3, rotation );
		x3 = c.x; y3 = c.y;
	
		c = this.getRotatedPoint( x, y, x4, y4, rotation );
		x4 = c.x; y4 = c.y;
	
		return [ { x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }, { x: x4, y: y4 }, { x: x1, y: y1 } ];
	};
	
}

