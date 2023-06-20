
class Awia extends AwiaRenderer
{
	constructor( canvasId, options )
	{
		options.canvasId = canvasId;
		super( options );
	}
	onMouseDown()
	{
		debugger;
	}
	onMouseUp()
	{
		debugger;
	}
	onMouseMove()
	{
		debugger;
	}
	async run()
	{
		var self = this;
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
		await this.loadImages( [ 'awi-red', 'awi-white' ], { hotspot: '#center #middle' } );
		this.createSprites( [
		{
			name: 'awi',
			image: 'awi-red',
			position: { x: this.width / 2, y: this.height / 2 },
			scale: { x: 1, y: 1 },
			visible: true
		} ] );
		this.setVisible( true );

		var self = this;
		this.update = function()
		{
			self.render();
			window.requestAnimationFrame( self.update );
		}
		window.requestAnimationFrame( self.update );
	}
}
