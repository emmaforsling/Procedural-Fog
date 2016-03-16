/**
***********************************
* Project: Procedural Fog
* By: Emma Forsling Parborg
***********************************
* This file creates the scene, by utilizing the Three.js API and the FlyControls.js from http://threejs.org/examples/misc_controls_fly
* The image used to illustrate the outside (through the windowpane) is from http://learningthreejs.com/data/lets_do_a_sky/lets_do_a_sky.html
* This file contains following functions:
* 	animate()
* 	init()
* 	onDocumentMouseDown(event)
* 	onDocumentTouchStart(event)
*	onWindowResize()
* 	render()
* 	createStats()
* 	createControls
* 	changeToExponentialFog()			|
* 	changeToLinearFog(currentTime) | Functions activated by the GUI
* 	createWindowPane() 		|
* 	createDoor()			|
* 	createWindowCross()		| Functions that creates and adds the meshes to the scene: 
* 	createWalls() 			|
* 	createWindowFrames()	|
**/

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var $container, stats, start;
var camera, controls, scene, renderer;
			
var containerWidth = window.innerWidth,
	containerHeight = 600;

// Shaders
var shaderMaterial,			// for the windowpane
	shaderMaterial2;		// for the other meshes

// Uniforms for the shader
var uniforms;

// Meshes
var windowPane;							// uses shaderMaterial
var rightWall, leftWall, 				// uses shaderMaterial2
	backWall1, backWall2, 
	backWall3, backWall4, 
	floor, ceiling,
	windowFrame1, windowFrame2,
	windowFrame3, windowFrame4,
	windowCross1, windowCross2,
	door, doorknob;

// Size of the meshes
var plane_width  = 200,
	plane_height = 200;

// Plane segments for all the meshes
var segments_h = 64,
	segments_w  = 64;

// Used in functions changeToExponentialFog and changeToLinearFog
var increasingSpeedFactorForTheFog = 2.0;		// större tal på denna gör så att imman växer saktare
var increasingSizeFactorForTheFog = 2.0;		// större tal detta är desta större blir imma "cirkeln"
var x = 0.0;
var isClicked;

// Used to store all meshes available, and is then used for the mouse controll to check if a mesh is clicked
var objects = [];

// Texture
var hidden_message_tex;

// Gui components
var alternateFog;
var mystery;
var radius_for_the_fog;

console.log("Initializing!");
init();
console.log("Start rendering!");

/**
* Function that updates the scene and calls the render function
**/
function animate() {
	//console.log("Animating!");
	requestAnimationFrame(animate);
	controls.update(1.0);
	render();
}

/**
* Function that initializes all things for the scene. The function ends with a call to function animate()
**/
function init() {
	// Initialize variables to default values
	isClicked = false;				// isClicked to false, since the no click have been made on the window pane
	start = Date.now();				// the start time to the current time
	radius_for_the_fog = 0.0;		// the radius for the fog to 0.0

	// Initialize the raycaster (used in onDocumentMouseDown())
	raycaster = new THREE.Raycaster();
	
	// Initilize the camera
	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / containerHeight, 1, 2000 );
	camera.position.z = 50;
	camera.position.y = -20;

	// Initialize the scene
	scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2( 0x000000, 0.002 );

	// Load the hidden message texture
	hidden_message_tex = THREE.ImageUtils.loadTexture( "img/MySecretMessage.png" );
	hidden_message_tex.minFilter = THREE.LinearFilter;
	
	// Shader uniforms
	uniforms = {
	    wall: {type: "i", value: 5},
	    time: { type: "f", value: start},

	    cameraPosWorldSpace: { type: "v3", value: new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)},
	    mousePositionWorldSpace: {type: "v3", value: new THREE.Vector3(10,10,0.0)},

	    noise_type_fog_shape: { type: "i", value: 0},
	    noise_type_fog_color: {type: "i", value: 0},
	    planeWidth: { type: "f", value: plane_width},
	    planeHeight: { type: "f", value: plane_height},

	    container_width: { type: "f", value: containerWidth },
	    container_height: { type: "f", value: containerHeight},
	    
	    radius: {type: "f", value: radius_for_the_fog},
	    // Variable that can change if the user uses the GUI components 
	    mystery_function: {type: "i", value: mystery},
	    noise_frequency: {type: "f", value: 0.066},
	    noise_frequency_for_the_color: {type: "f", value: 0.066},
	    // Textures
		hidden_Texture: {type: "t", value: hidden_message_tex},
		cubeMap: {type: "t", value: new THREE.ImageUtils.loadTextureCube( ["img/posx.jpg", "img/negx.jpg", "img/posy.jpg", "img/negy.jpg", "img/posz.jpg", "img/negz.jpg"]) },
		cubeMapBlurr: {type: "t", value: new THREE.ImageUtils.loadTextureCube( ["img/posx.jpg", "img/negx.jpg", "img/posy.jpg", "img/negy.jpg", "img/posz.jpg", "img/blurr.jpg"])},
	};

	// Create custom material for the windowpane 
	shaderMaterial = new THREE.ShaderMaterial({
		uniforms: uniforms,
		vertexShader:   $('#vertexshader').text(),
		fragmentShader: $('#fragmentshader').text(),
		wireframe: false,
	});

	// Create custom material for the other meshes (with varying variables for the uniform wall - will in the shader determine which color they should have)
	shaderMaterialBack = new THREE.ShaderMaterial({
		uniforms: uniforms,
		uniforms: {wall: {type: "i", value: 0}},
		vertexShader:   $('#vertexshader-walls').text(),
		fragmentShader: $('#fragmentshader-walls').text(),
		wireframe: false,
	});
	shaderMaterialFloor = new THREE.ShaderMaterial({
		uniforms: uniforms,
		uniforms: {wall: {type: "i", value: 1}},
		vertexShader:   $('#vertexshader-walls').text(),
		fragmentShader: $('#fragmentshader-walls').text(),
		wireframe: false,
	});
	shaderMaterialWindowFrame = new THREE.ShaderMaterial({
		uniforms: uniforms,
		uniforms: {wall: {type: "i", value: 2}},
		vertexShader:   $('#vertexshader-walls').text(),
		fragmentShader: $('#fragmentshader-walls').text(),
		wireframe: false,
	});

	// Create the window (with the material shaderMaterial connected to it) and add it to the scene.
	createWindowPane();

	// Create the walls and add them to the scene, shaderMaterial2
	createWalls();

	// Create Window frames
	createWindowFrames();
	createWindowCross();
	createDoor();

	// Renderer
	renderer = new THREE.WebGLRenderer( { antialias: false } );
	renderer.setClearColor( scene.fog.color );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, containerHeight );

	// get the DOM element to attach to
	$container = $('#container');
	$container.append(renderer.domElement);	// attach the renderer-supplied DOM-element
	// container = document.getElementById( 'container' );
	// container.appendChild( renderer.domElement );

	// Controls
	createControls();
	createStats();

					

	//$container.append(stats.Element);	
	container.appendChild( stats.domElement );

	document.addEventListener( 'mousedown', onDocumentMouseDown, false );			// the event occurs when the user presses a mouse button over an element
	document.addEventListener( 'touchstart', onDocumentTouchStart, false );			// the event occurs when a finger is placed on a touch screen.

	window.addEventListener( 'resize', onWindowResize, false );

	animate();
}

/**
* Function that is called on mouse click event.
* In which the position for the mouse click is retrieved and used in order to determine if the windowframe have been clicked and 
* wheter or not the fog should be created. 
**/
function onDocumentMouseDown( event ) {

	// event.preventDefault();				// in order to get the dropdown list to work for dat.gui, 
											// event.preventDefault() can't be called.
	// Get the mouse position that is currently clicked by the user.
	var currentMousePosition = new THREE.Vector2();
	currentMousePosition.x = 	( event.clientX / renderer.domElement.clientWidth  ) * 2 - 1;			// mouse.x [-1,1]
	currentMousePosition.y = - 	( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;			// mouse.y [-1,1]
	
	// Create a raycaster containing the currentMousePosition
	raycaster.setFromCamera( currentMousePosition, camera );

	// Check if the raycaster intersects with the objects added to the variable objects.
	var intersects = raycaster.intersectObjects( objects );			// returns [{distance, point, face, faceIndex, indices, object},...]

	// Check if the mesh (the windowpane) has been clicked on 
	if ( intersects.length > 0 ) {
		// update the mouse position (world coordinates) to the shader
		uniforms.mousePositionWorldSpace.value = intersects[0].point;

		// update the start variable
		start = Date.now();

		// Check the GUI and se if any uniforms have to be updated.
		increasingSizeFactorForTheFog  = gui_content.Radius;
		alternateFog = gui_content.AlternateFog;

		if(gui_content.Noise === 'SimplexNoise'){
			uniforms.noise_type_fog_shape.value = 0;
		} else if(gui_content.Noise === 'PerlinNoise'){
			uniforms.noise_type_fog_shape.value = 1;
		}

		if(gui_content.AddNoise === 'None'){
			uniforms.noise_type_fog_color.value = 0;
		} else if(gui_content.AddNoise === 'SimplexNoise') {
			uniforms.noise_type_fog_color.value = 1;
		} else if(gui_content.AddNoise === 'PerlinNoise'){
			uniforms.noise_type_fog_color.value = 2;
		}
		radius_for_the_fog = 0.0;

		// Update variables used in describing how the fog shall increase/decrease
		isClicked = true;		// set the boolean isClicked to true, used in changeToExponentialFog() and changeToLinearFog()	
		x = 0.0;				// reset x = 0.0, used in function changeToExponentialFog() 

	} else {
		// Update variables used in describing how the fog shall increase/decrease,
		isClicked = false;
		x = 0.0;
	}


}

/**
* Function that registers mouse click events, and calls the function onDocumentMouseDown(event)
**/
function onDocumentTouchStart( event ) {
	event.preventDefault();
	event.clientX = event.touches[0].clientX;
	event.clientY = event.touches[0].clientY;
	onDocumentMouseDown( event );
}

/**
* Function that is called when the window is resized
**/
function onWindowResize() {
	// Update the camera and renderer
	camera.aspect = window.innerWidth / containerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, containerHeight);
	
	// Update the uniforms describing the size of the container
	uniforms.container_height.value = containerHeight;
	uniforms.container_width.value = containerWidth;
}

/** 
* Default fog function that updates the radius_for_the_fog variable. Is used to increase/decrease the radius in the shader.
* This fog, increases/decreases with the function radius = -sin(x/increasingSpeedFactor - 3.141)/e^(x/increasingSizeFactor - 3.141) 
**/
function changeToExponentialFog(){
	if(x!= 666){
		x = (isClicked) ? (x + 0.01) : (0.0); 
		radius_for_the_fog = (isClicked) ? ( -1.0/Math.exp(x/increasingSizeFactorForTheFog-3.141) * Math.sin((x/increasingSpeedFactorForTheFog)-3.141) ) : 0.0;			// 3.141 ty då blir det nära noll då x = 0
		x = (radius_for_the_fog < 0.0 ) ? 666 : x;
	} else {
		radius_for_the_fog = 0.0;
	}
}
/** 
* Other fog function that can be activated by the user in the GUI.
* The fog increase/decreases linearly. 
**/ 
function changeToLinearFog(currentTime){
	if(isClicked == true && currentTime >= 5){
		radius_for_the_fog -= 0.002 * increasingSizeFactorForTheFog;
	} else if(isClicked == true && currentTime < 5){
		radius_for_the_fog += 0.01 * increasingSizeFactorForTheFog;
	} else{
	 	radius_for_the_fog = 0.0;
	}					
}

/**
* Render function that renders the scene, and updates the uniforms for the shader and the stats displayed.
**/
function render()
{
	uniforms.cameraPosWorldSpace.value = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
	
	// Update the uniform time variable, by getting the time now and subtract it with the start time.
	var currentTime = 0.0025 * (Date.now() - start);
	uniforms.time.value = currentTime;
	
	// Check which fog function that shall be called (describing how fast the fog shall increase/decrease)
	if(alternateFog === 'ExponentialFog'){
		changeToExponentialFog();
	} else {
		changeToLinearFog(currentTime);
	}
	
	// Check the GUI and se if any uniforms have to be updated.
	mystery = gui_content.Mystery;
	uniforms.mystery_function.value = mystery;
	uniforms.noise_frequency.value = gui_content.NoiseFrequency;
	uniforms.noise_frequency_for_the_color.value = gui_content.NoiseMagnitude;
	uniforms.radius.value = radius_for_the_fog;

	// Render the scene and update the stats
	renderer.render( scene, camera );
	stats.update();
}

/**
* Function that create the stat-window displayed at the top left corner,
* displaying the FPS.
**/
function createStats(){
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	stats.domElement.style.zIndex = 100;
}

/*
* Function that sets the controls to the FlyControls, from http://threejs.org/examples/misc_controls_fly
* In which the keyboardbuttons:
*	 w a s d 			(to go foward,back,left right in the scene) 
*	 up,down,left,right (to rotate up,down,left,right in the scene)
*	 r,f 				(to move up/down in the scene)
* (have removed the functionality for the camera to follow the mouse movement)
**/
function createControls(){
	controls = new THREE.FlyControls(camera);
	controls.movementSpeed = 1.0;
	controls.domElement = container;
	controls.rollSpeed = Math.PI / 240;
	controls.autoForward = false;
	controls.dragToLook = false;
}

/*
* Function that intializes and adds the mesh for the windowpane to the scene.
**/
function createWindowPane(){
	windowPane = new THREE.Mesh( new THREE.PlaneGeometry(plane_width/3, plane_height/3, segments_w, segments_h), shaderMaterial );
	// set default position to (0,0,-100)
	windowPane.position.x = 0; windowPane.position.y = 0; windowPane.position.z = 0;//-plane_width/2;
	// update matrix
	windowPane.updateMatrix();
	windowPane.matrixAutoUpdate = false;
	// add it to the scene
	scene.add( windowPane );
	// push this mesh to objects (is used for the raycaster to handle mouse click events for this mesh)
	objects.push( windowPane );
}

/*
* Function that initializes and adds the meshes for the door to the scene.
**/
function createDoor(){
	// initialize the door mesh and the doorknob mesh
	door = new THREE.Mesh(new THREE.PlaneGeometry(plane_width/3, 2 * plane_height/3, 8, 8), shaderMaterialWindowFrame);
	doorknob = new THREE.Mesh(new THREE.SphereGeometry(2,16,16), shaderMaterialBack);
	
	// set its position
	door.position.x = 0;
	door.position.y = - plane_width/6;
	door.position.z = plane_width - 1.1;
	
	doorknob.position.x = 20;
	doorknob.position.y = - plane_width/ 6;
	doorknob.position.z = plane_width - 1.5;

	// rotate the door, so that the normal is facing the right way
	door.rotation.x = 3.14;
	
	// update matrix
	door.updateMatrix();
	door.matrixAutoUpdate = false;
	doorknob.updateMatrix();
	doorknob.matrixAutoUpdate = false;
	
	// add the door and the doorknob to the scene
	scene.add(door);
	scene.add(doorknob);
	
}

/*
* Function that initializes and adds the meshes for the "window cross" to the scene. 
**/
function createWindowCross(){
	var windowFrameSegmentsWidth = 8,  windowFrameSegmentsHeight = 8;
	// initialize the two meshes needed for the "window cross"
	windowCross1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2,plane_height/3, windowFrameSegmentsWidth, windowFrameSegmentsHeight), shaderMaterialWindowFrame);
	windowCross2 = new THREE.Mesh(new THREE.PlaneGeometry(plane_width/3, 1.2, windowFrameSegmentsWidth, windowFrameSegmentsHeight), shaderMaterialWindowFrame);
	// set the positions
	windowCross1.position.x = 0; 
	windowCross1.position.y = 0; 
	windowCross1.position.z = 1.1;

	windowCross2.position.x 	= 0;
	windowCross2.position.y 	= 0;
	windowCross2.position.z 	= 1.1;

	// update matrix
	windowCross1.updateMatrix();
	windowCross2.updateMatrix();

	windowCross1.matrixAutoUpdate = false;
	windowCross2.matrixAutoUpdate = false;

	// add them to the scene
	scene.add(windowCross1);
	scene.add(windowCross2);

}

/*
* Function that initializes and adds the window frame to the scene.
**/
function createWindowFrames(){
	var windowFrameSegmentsWidth = 8,  windowFrameSegmentsHeight = 8;
	windowFrame1 = new THREE.Mesh(new THREE.PlaneGeometry(5,plane_height/3 + 5, windowFrameSegmentsWidth, windowFrameSegmentsHeight), shaderMaterialWindowFrame);
	windowFrame2 = new THREE.Mesh(new THREE.PlaneGeometry(5,plane_height/3 + 5, windowFrameSegmentsWidth, windowFrameSegmentsHeight), shaderMaterialWindowFrame);
	windowFrame3 = new THREE.Mesh(new THREE.PlaneGeometry(plane_width/3, 5, windowFrameSegmentsWidth, windowFrameSegmentsHeight), shaderMaterialWindowFrame);
	windowFrame4 = new THREE.Mesh(new THREE.PlaneGeometry(plane_width/3, 5, windowFrameSegmentsWidth, windowFrameSegmentsHeight), shaderMaterialWindowFrame);

	windowFrame1.position.x 	= 100/3;
	windowFrame1.position.y 	= 0;
	windowFrame1.position.z 	= 1.1;

	windowFrame2.position.x 	= -100/3;
	windowFrame2.position.y 	= 0;
	windowFrame2.position.z 	= 1.1;

	windowFrame3.position.x 	= 0;
	windowFrame3.position.y 	= 100/3;
	windowFrame3.position.z 	= 1.1;

	windowFrame4.position.x 	= 0;
	windowFrame4.position.y 	= -100/3;
	windowFrame4.position.z 	= 1.1;

	windowFrame1.updateMatrix();
	windowFrame2.updateMatrix();
	windowFrame3.updateMatrix();
	windowFrame4.updateMatrix();

	windowFrame1.matrixAutoUpdate 	= false;
	windowFrame2.matrixAutoUpdate 	= false;
	windowFrame3.matrixAutoUpdate 	= false;
	windowFrame4.matrixAutoUpdate 	= false;

	scene.add(windowFrame1);
	scene.add(windowFrame2);
	scene.add(windowFrame3);
	scene.add(windowFrame4);
}

/*
* Initializing the meshes for the walls, ceiling and floor, and adds them to the scene
**/
function createWalls(){
	// create meshes and connect the material/shader to them
	rightWall 	= new THREE.Mesh( new THREE.PlaneGeometry(plane_width, plane_height, segments_w, segments_h), shaderMaterialBack);
	leftWall 	= new THREE.Mesh( new THREE.PlaneGeometry(plane_width, plane_height, segments_w, segments_h), shaderMaterialBack);
	backWall1 	= new THREE.Mesh( new THREE.PlaneGeometry(plane_width/3, plane_height, segments_w, segments_h), shaderMaterialBack);
	backWall2 	= new THREE.Mesh( new THREE.PlaneGeometry(plane_width/3, plane_height, segments_w, segments_h), shaderMaterialBack);
	backWall3 	= new THREE.Mesh( new THREE.PlaneGeometry(plane_width/3, plane_height/3, segments_w, segments_h), shaderMaterialBack);
	backWall4 	= new THREE.Mesh( new THREE.PlaneGeometry(plane_width/3, plane_height/3, segments_w, segments_h), shaderMaterialBack);
	floor 		= new THREE.Mesh( new THREE.PlaneGeometry(plane_width, plane_height, segments_w, segments_h), shaderMaterialFloor);
	ceiling 	= new THREE.Mesh( new THREE.PlaneGeometry(plane_width, plane_height, segments_w, segments_h), shaderMaterialFloor);
	frontWall	= new THREE.Mesh( new THREE.PlaneGeometry(plane_width, plane_height, segments_w, segments_h), shaderMaterialBack);


	// set position
	rightWall.position.x 	= plane_width/2;
	rightWall.position.y 	= 0;
	rightWall.position.z 	= plane_width/2;
	
	leftWall.position.x 	= - plane_width/2;
	leftWall.position.y 	= 0;
	leftWall.position.z 	= plane_width/2;

	backWall1.position.x 	= - plane_width/2 + plane_width/6;
	backWall1.position.y 	= 0;
	backWall1.position.z 	= 0;

	backWall2.position.x 	= plane_width/2 - plane_width/6;
	backWall2.position.y 	= 0;
	backWall2.position.z 	= 0;

	backWall3.position.x 	= 0;
	backWall3.position.y 	= - plane_width/2 + plane_width/6;
	backWall3.position.z 	= 0;

	backWall4.position.x 	= 0;
	backWall4.position.y 	= plane_width/2 - plane_width/6;
	backWall4.position.z 	= 0;

	ceiling.position.x 		= 0;
	ceiling.position.y 		= plane_width/2;
	ceiling.position.z 		= plane_width/2;
	
	floor.position.x 		= 0;
	floor.position.y 		= -plane_width/2;
	floor.position.z 		= plane_width/2;

	frontWall.position.x 	= 0;
	frontWall.position.y 	= 0;
	frontWall.position.z 	=  plane_width;

	// set rotation
	rightWall.rotation.y 	= - 3.14/2;
	leftWall.rotation.y 	= 3.14/2;
	floor.rotation.x 		= - 3.14/2;
	ceiling.rotation.x 		= 3.14/2;
	frontWall.rotation.x 	= 3.14;

	// update matrix
	rightWall.updateMatrix();
	leftWall.updateMatrix();
	backWall1.updateMatrix();
	backWall2.updateMatrix();
	backWall3.updateMatrix();
	backWall4.updateMatrix();
	floor.updateMatrix();
	ceiling.updateMatrix();
	frontWall.updateMatrix();
	
	// set matrixAutoUpdate to false
	rightWall.matrixAutoUpdate 	= false;
	leftWall.matrixAutoUpdate 	= false;
	backWall1.matrixAutoUpdate 	= false;
	backWall2.matrixAutoUpdate 	= false;
	backWall3.matrixAutoUpdate 	= false;
	backWall4.matrixAutoUpdate 	= false;
	floor.matrixAutoUpdate 		= false;
	ceiling.matrixAutoUpdate 	= false;
	frontWall.matrixAutoUpdate	= false;

	// add it to the scene
	scene.add(rightWall);
	scene.add(leftWall);
	scene.add(backWall1);
	scene.add(backWall2);
	scene.add(backWall3);
	scene.add(backWall4);
	scene.add(floor);
	scene.add(ceiling);
	scene.add(frontWall);


}