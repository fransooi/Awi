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
* @file awi-trees.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.2
*
* @short Base tree management
*
*/
class TreeNode 
{
	constructor( key, value = key, parent = null ) 
	{
	  	this.key = key;
	  	this.value = value;
	  	this.parent = parent;
		this.children = [];
	}
	  
	get isLeaf() 
	{
	  	return this.children.length === 0;
	}
  
	get hasChildren() 
	{
	  	return !this.isLeaf;
	}
}
module.exports.TreeNode = TreeNode

class Tree 
{
	constructor( key, value = key ) 
	{
	  	this.root = new TreeNode ( key, value );
		this.nodes = {};
	}
  
	*preOrderTraversal( node = this.root ) 
	{
	  	yield node;
	  	if ( node.children.length ) 
		{
			for ( let child of node.children ) 
			{
			  	yield* this.preOrderTraversal( child );
			}
		}
	}
  
	*postOrderTraversal( node = this.root ) 
	{	
		if ( node.children.length ) 
		{
			for ( let child of node.children ) 
			{
			 	yield* this.postOrderTraversal( child );
			}
		}	  	
		 yield node;
	}
  
	insert( parentNodeKey, key, value = key ) 
	{
	  	for ( let node of this.preOrderTraversal() ) 
		{
			if ( node.key === parentNodeKey ) 
			{
				var newNode = new TreeNode( key, value, node );
				node.children.push( newNode );
				this.nodes[ key ] = newNode;
		  		return true;
			}
	  	}
	  	return false;
	}

	getLength( parentNodeKey ) 
	{
		var count = 0;
		var parent = this.find( parentNodeKey );
	  	for ( let node of this.preOrderTraversal( parent ) ) 
			count ++;
	  	return count;
	}

	remove( key ) 
	{
	  	for ( let node of this.preOrderTraversal() ) 
		{
			const filtered = node.children.filter( c => c.key !== key );
			if ( filtered.length !== node.children.length ) 
			{
		  		node.children = filtered;
				this.nodes[ key ] = null;
		  		return true;
			}
	  	}
	  	return false;
	}

	find( key ) 
	{
		return this.nodes[ key ];
	}
}
module.exports.Tree = Tree