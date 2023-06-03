/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal
* (_)|____| |____|\__/\__/  [_| |_] \     Assistant
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file awi-bubble-generic-import.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Runacc command: run an accessory in the current editor if it contains
*        accessories
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericRunacc extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Runacc';
		this.token = 'runacc',
		this.classname = 'generic';
		this.properties.action = 'launch an accessory';
		this.properties.inputs = [ { userInput: 'the name of an accessory to run', type: 'string' } ];
		this.properties.outputs = [ { runaccPath: 'the last accessory ran', type: 'path' } ];
		this.properties.brackets = false;
		this.properties.tags = [ 'aoz', 'programming' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		if ( parameters.userInput )
		{
			var accInfos = [];
			var accList = await this.awi.system.getAccessoryList( parameters.userInput, {} );
			accList = accList.data;
			if( accList && accList.length > 0 )
			{
				for( var l = 0; l < accList.length; l++ )
				{
					var accFile = accList[ l ];
					var json = this.awi.system.getAccessoryInfos( accFile );
					if( json )
					{
						var filename = this.awi.utilities.basename( accFile );
						if ( filename.toLowerCase().indexOf( data.lastInput.toLowerCase() ) >= 0 )
							accInfos.push( { json: json, accFile: accFile } );
					}
				}
				if ( accInfos.length ==  0 )
				{
					this.awi.editor.print( this, [ 'Sorry I cannot find ' + parameters.userInput ], { user: 'information' } );
					return { success: false, data: data, error: 'awi:acc-not-found:iwa', error1: parameters.userInput }
				}
				if ( accInfos.length == 1 )
				{
					return await this.awi.system.runAccessory( accInfos[ 0 ].accFile );
				}
				var param = await this.awi.prompt.getParameters( [ { choice: 'the accessory to run, between 1 and' + accInfos.length, type: 'number' } ] );
				if ( param.success )
				{
					var acc = accInfos[ param.data.choice ];
					return this.awi.system.runAccessory( acc.accFile );
				}
			}
		}
		return { success: false, data: data, error: 'awi:cancelled:iwa' };
	}
	async playback( line, parameters, control )
	{
		return await super.playback( line, parameters, control );
	}
	async transpile( line, data, control )
	{
		super.transpile( line, data, control );
	}
}
module.exports.Bubble = BubbleGenericRunacc;
