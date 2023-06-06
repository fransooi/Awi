/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][    ]      Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_] \     link:
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-memory-awi-documents.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Document memory branch
*
*/
var awimemory = require( '../awi-memory' );

class MemoryGenericDocuments extends awimemory.Memory
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.token = 'documents';
		this.classname = 'generic';
		this.name = 'Document Souvenir Chain';
		this.properties.action = 'stores the content documents';
		this.properties.inputs = [
			{ userInput: 'what to find in the documents', type: 'string' },
			{ from: 'the kind of things to find', type: 'string', optional: true, default: 'any' },
			{ interval: 'when the document was created', type: 'string', optional: true, default: 'any' },
		];
		this.properties.outputs = [ { documentInfos: 'list of documents found', type: 'documentInfo.souvenir.array' } ];
		this.properties.tags = [ 'memory', 'document' ];
	}
	async play( line, parameters, control )
	{
		if ( !parameters.interval )
			parameters.interval = 'any';
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
			this.awi.editor.print( control.editor, 'Document file: ' + souvenir.parameters.path, { user: 'memory2' } );
			this.awi.editor.print( control.editor, 'Creation date: ' + souvenir.parameters.date + '.', { user: 'memory2' } );
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
module.exports.Memory = MemoryGenericDocuments;
