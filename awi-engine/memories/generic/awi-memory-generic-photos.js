/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][   ]       Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_] \     link:
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-memory-awi-photos.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Photo memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericPhotos extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'photos';
		this.classname = 'generic';
		this.name = 'Photos Souvenir Chain';
		this.properties.action = 'stores a list of photos';
		this.properties.inputs = [
			{ userInput: 'what to find in the photos', type: 'string', optional: false, default: '' },
			{ from: 'what kind of content to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'interval of time when the photo was taken', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [ { photoInfos: 'the photos found', type: 'photoInfo.object.array' } ];
		this.properties.tags = [ 'memory', 'photos' ];
	}
	async play( line, parameters, control )
	{
		return await this[ control.memory.command ]( line, parameters, control );
	}
	async extractContent( line, parameters, control )
	{
		return await super.extractContent( line, parameters, control );
	}
	async getContent( line, parameters, control )
	{
		var souvenir = this.getBubble( this.getBubble( 'root' ).properties.exits[ 'success' ] );
		if ( souvenir )
		{
			this.awi.editor.print( this, 'Photo file: ' + souvenir.parameters.path, { user: 'memory2' } );
			this.awi.editor.print( this, 'Taken on the ' + souvenir.parameters.date, { user: 'memory2' } );
		}
		return await super.getContent( line, parameters, control );
	}
	async findSouvenirs( line, parameters, control )
	{
		return await super.findSouvenirs( line, parameters, control );
	}
	async playback( line, parameter, control )
	{
		return await super.playback( line, parameter, control );
	}
}
module.exports.Memory = MemoryGenericPhotos;
