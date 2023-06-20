
class AwiaUtilities
{
	constructor( options )
	{
		this.awia = this;
		this.options = options;
	}
	getColorString = function( color )
	{
		var colorString = color.toString( 16 );
		while ( colorString.length < 6 )
			colorString = '0' + colorString;
		return ( '#' + colorString ).toUpperCase();
	}
}
//window.AwiaUtilities = AwiaUtilities;
