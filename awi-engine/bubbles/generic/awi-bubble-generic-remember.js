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
* @file awi-bubble-generic-remember.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.3
*
* @short Remember command: dig a specific topid out of the memory
*
*/
var awibubble = require( '../awi-bubble' )

class BubbleGenericRemember extends awibubble.Bubble
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Remember Action Bubble';
		this.token = 'remember';
		this.classname = 'generic';``
		this.properties.action = 'recall all memories about a subject';
		this.properties.inputs = [
			{ userInput: 'the subject or person to remember', type: 'string', optional: true, default: '' },
			{ from: 'what kind of things to remember', type: 'string', optional: true, default: 'any' },
			{ when: 'interval of time to consider', type: 'string', optional: true, default: 'any' },
			{ scanLevel: 'depth of the search, 1: direct souvenirs only, 2: indirect souvenirs, 3: deep search', type: 'number', interval: { start: 1, end: 3 }, optional: true, default: '2' }	];
		this.properties.outputs = [
			{ directSouvenirs: 'the direct souvenirs found', type: 'souvenirInfo.object.array' },
			{ indirectSouvenirs: 'the indirect souvenirs found', type: 'souvenirInfo.object.array' } ];
		this.properties.tags = [ 'memory', 'souvenir', 'bubble' ];
	}
	async play( line, parameters, control )
	{
		await super.play( line, parameters, control );
		control.memory = {
			scanLevel: parameters.scanLevel
		};
		parameters.senderName = typeof parameters.senderName == 'undefined' ? this.awi.config.getConfig( 'user' ).fullName : parameters.senderName;

		var answer = await this.awi.personality.remember( line, parameters, control );
		if ( answer.success == 'found' )
		{
			if ( answer.data.direct.souvenirs.length > 0 )
				this.awi.editor.print( control.editor, 'Found ' + answer.data.direct.souvenirs.length + ' direct souvenir(s).', { user: 'information' } );
			else
				this.awi.editor.print( control.editor, 'No direct souvenir found.', { user: 'information' } );

			if ( parameters.scanLevel > 1 && answer.data.indirect.souvenirs.length > 0 )
				this.awi.editor.print( control.editor, 'Found ' + answer.data.indirect.souvenirs.length + ' indirect souvenir(s).', { user: 'information' } );
			else
				this.awi.editor.print( control.editor, 'No indirect souvenir found.', { user: 'information' } );

			this.awi.remember( line, answer.data.direct, answer.data.indirect );
			return { success: 'success', data: answer.data }
		}
		return answer;
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
module.exports.Bubble = BubbleGenericRemember;
