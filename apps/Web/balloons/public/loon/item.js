
class Item
{
	constructor( loon, parent = {}, options = {} )
	{
		this.loon = loon;
		this.parent = parent;
		this.root = loon.root;
		this.utilities = loon.utilities;
		this.name = options.name ? options.name : '';
		this.className = 'Item';

		this.time = new Date().getTime();
	}
	update( deltaTime )
	{
		this.time += deltaTime;
		return false;
	}
}
