
///////////////////////////////////////////////////////////////////////////////////
//
// ╔╗ ┌─┐┬  ┬   ┌─┐┌─┐┌┐┌┌─┐
// ╠╩╗├─┤│  │   │ ││ ││││└─┐
// ╚═╝┴ ┴┴─┘┴─┘o└─┘└─┘┘└┘└─┘ web-editor
//
// By Francois Lionet, part of Awi, (c) Francois Lionet 2022-2023
// World right reserved. Private for the moment, open-source in the future.
//
// A new way of programming for kids and adults with younger minds.
// Simple, fun, educative, fast, cross-platform, powerful.
// Driven by Awi server, client / server system for 100% online interface.
// Free for use and publish applications with, plus options: storage, tutorials etc.
// Ultra fast runtime tbm, for various languages and devices.
// Connectable to hardware with specific Balloons (arduino) for both editor and runtime
//
// For serious (ultra-fast) developping, access the end-laying code of the Balloon,
//   it's just Javascript. Develop professional libraries of Balloons with access, 
//   as in node, to online Balloons repositories... (with npm in the back). 
//   All handle during the drag & drop operation of the new library Balloons.
// Massive re-usabililty of code, will always adapt an work after versions.
// Suggested name for "mature" version-> balls!
// Runtime will be ultra-fast, code is minimal. 
// Exports to Javascript, then after C# (for Unity interface), 
//   then C for Arduino or Java etc.
// 
///////////////////////////////////////////////////////////////////////////////////
																											  
																											  
import React from 'react';
import { ChakraProvider, Box, Image, Icon, AbsoluteCenter, IconButton, Flex, theme } from '@chakra-ui/react';
import { Stack, StackDivider } from '@chakra-ui/react';
import { Tooltip } from '@chakra-ui/react'
import { useEffect, useState, useRef } from 'react';
import { VscAdd, VscCloudUpload, VscCloudDownload, VscDebugStart, VscDebugAlt, VscDebugStop, VscGift, VscGlobe, VscSettingsGear } from "react-icons/vsc";
import { withTheme } from '@emotion/react';

// Tools
////////////////////////////////////////////////////////////////////////
const Tool = React.forwardRef(({ children, ...rest }, ref) => (
	  <Box ref={ref} {...rest}>
		{children}
	  </Box>
  ) );
function ToolIcon( props )
{
	var styles = ( props.styles ? props.styles : {} );
	styles.boxSize = ( typeof styles.boxSize == 'undefined' ? 12 : styles.boxSize );
	styles.padding = ( typeof styles.padding == 'undefined' ? 0 : styles.padding );
	styles.color = ( typeof styles.color == 'undefined' ? 'white' : styles.color );
	styles.hoverBg = ( typeof styles.hoverBg == 'undefined' ? 'white' : styles.hoverBg );
	styles.hoverColor = ( typeof styles.hoverColor == 'undefined' ? 'black' : styles.hoverColor );
	var hover = 
	{
		background: styles.hoverBg,
		color: styles.hoverColor
	}
	var active = 
	{
		background: 'yellow',
		color: 'black'
	}
	function onClick( event )
	{

	}
	return (
		<Tooltip label={props.label} placement='right-start' >
			<Tool>
				<Icon as={props.icon} id={props.id} color={styles.color} p={styles.padding} boxSize={styles.boxSize} _hover={hover} _active={active} onClick={onClick} />
			</Tool>
		</Tooltip>
		);
};

// Editor
////////////////////////////////////////////////////////////////////////////
function Canvas( props )
{  
	const canvasRef = useRef( null );
	
	useEffect(
		function() 
		{
			const canvas = canvasRef.current;
			if ( canvas && window.Loon )
			{
				window.Loon.root.redraw();
			}
		}, [] );
	
	return <canvas ref={canvasRef} {...props}/>
}
  
function Editor( props )
{
	return (
		<Box width='100vw' height='100%' >
			<Canvas id='loon_canvas' width='100vw' height='500' ></Canvas>
		</Box>
		);
};

function App() 
{
	const [ dimension, setDimension ] = useState( { x: 0, y: 0 } );
	const [ height, setHeight ] = useState( 720 );
	const [ toolsWidth, setToolsWidth ] = useState( 360 );
	const [ separatorWidth, setSeparatorWidth ] = useState( 10 );
	const [ dragStartX, setDragStartX ] = useState( 0 );
	const [ dragStartToolsWidth, setDragStartToolsWidth ] = useState( 0 );
	const [ dragging, setDragging ] = useState( false );
	const [ firstLoop, setFirstLoop ] = useState( false );
	const [ mouse, setMouse ] = useState( { x: 0, y: 0 } );
	const [ engine, setEngine ] = useState( null );

	useEffect( 
		function()
		{
			function handleMouseMove( event ) 
			{
				console.log( 'Mouse, X: ' + event.clientX + ', Y: ' + event.clientY );
				setMouse( { x: event.clientX, y: event.clientY } );
			};
			window.addEventListener( 'mousemove', handleMouseMove );
	
			return function() 
			{
				window.removeEventListener( 'mousemove', handleMouseMove );			
			};
		}, [] );	
	useEffect( 
		function() 
		{
			if ( !window.handlingResize )
			{
				window.handlingResize = true;
				function handleResize() 
				{
					setDimension( { x: window.innerWidth, y: window.innerHeight } );
	
					var editor = document.getElementById( 'editor_box' );
					var width = window.innerWidth - toolsWidth - separatorWidth;
					editor.style.width = width + 'px';
					
					if ( window.Loon )
						window.Loon.root.setDimension( { x: width, y: window.innerHeight } );
				}
				window.addEventListener( 'resize', handleResize );
				setTimeout( function()
				{
					handleResize();
				}, 1000 );
			}
		}, [ dimension, toolsWidth, separatorWidth ] );
	useEffect( 
		function() 
		{
			if ( !window.loonLoading )
			{
				window.loonLoading = true;
				const script = document.createElement( "script" );
				script.src = "/loon/loon.js";
				script.async = true;
				script.onload = function()
				{					
					window.Loon = new window.LoonEngine( 'Loon', { canvasId: 'loon_canvas', backgroundColor: 'LightGray' } );
					window.Loon.init();
				}				
				document.body.appendChild( script );
			}
		}, [ ] );
	
	function onDrag( event )
	{
		if ( dragging )
		{
			console.log( 'On drag, X: ' + event.pageX );
			var deltaWidth = ( event.pageX - dragStartX );
			if ( deltaWidth != 0 )
			{
				var width = dragStartToolsWidth - deltaWidth;
				console.log( 'Width: ' + width );
				setToolsWidth( width );
				var editor = document.getElementById( 'editor_box' );
				editor.style.width = ( window.innerWidth - toolsWidth - separatorWidth ) + 'px';
			}
		}
	}
	function onDragStart( event )
	{
		setDragging( true );
		setDragStartX( event.pageX );
		setDragStartToolsWidth( toolsWidth );
		console.log( 'Start drag, X: ' + event.pageX );
	}
	function onDragEnd( event )
	{
		console.log( 'End drag, X: ' + event.pageX );

		var deltaWidth = ( event.pageX - dragStartX );
		if ( deltaWidth != 0 )
		{
			var width = dragStartToolsWidth - deltaWidth;
			if ( width < 64 )
				width = 64;
			if ( width > dimension.x * 0.66 )
				width = dimension.x * 0.66;
			setToolsWidth( width );
		}
		setDragging( false );
	}
	const toolIconStyle = 
	{
		boxSize: 12,
		padding: 1,
		color: 'white',
		hoverBg: 'LightSkyBlue',
		hoverColor: 'red'
	};

  	return (
		<ChakraProvider theme={theme}>
		<Flex bgColor='#D7DA00' h='100vh' v='100vw'>
			<Box id='tools_left' bgColor='LightSkyBlue' height='100%' width='48px' rounded='lg' boxShadow='dark-lg'>
				<Stack divider={<StackDivider />} spacing='0'>
					<ToolIcon icon={VscAdd} id='toolid_add' label='Add an new element' styles={toolIconStyle}  />
					<ToolIcon icon={VscCloudUpload} id='toolid_upload' label='Import' styles={toolIconStyle} />
					<ToolIcon icon={VscCloudDownload} id='toolid_download' label='Export' styles={toolIconStyle} />
					<ToolIcon icon={VscDebugStart} id='toolid_run' label='Play' styles={toolIconStyle} />
					<ToolIcon icon={VscDebugAlt} id='toolid_debug' label='Debug' styles={toolIconStyle} />
					<ToolIcon icon={VscDebugStop} id='toolid_stop'  label='Stop' styles={toolIconStyle} />
					<ToolIcon icon={VscGift} id='toolid_package' label='Package' styles={toolIconStyle} />
					<ToolIcon icon={VscGlobe} id='toolid_publish' label='Publish' styles={toolIconStyle} />
					<ToolIcon icon={VscSettingsGear} id='toolid_settings' label='Preferences' styles={toolIconStyle} />
				</Stack>
			</Box>
			<Box id='editor_box' bgColor='LightGoldenRodYellow' height='100%'  width='64px' rounded='lg' boxShadow='dark-lg'>
				<Editor id='editor' width='100%' height='100%' ></Editor>
			</Box>
			<Box id='separator' bgColor='#222222' draggable="true" onDrag={onDrag} onDragStart={onDragStart} onDragEnd={onDragEnd} height='100%' width={separatorWidth  + 'px'} rounded='lg' boxShadow='dark-lg'></Box>
			<Box id='tools_right' bgColor='LightCoral' height='100%'  top='0%' bottom='0%' width={toolsWidth  + 'px'} rounded='lg' boxShadow='dark-lg'></Box>
		</Flex>
		</ChakraProvider>
  	);
}
export default App;

