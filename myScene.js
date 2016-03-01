if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

			var $container, stats, start;
			var camera, controls, scene, renderer;
			
			

			var containerWidth = window.innerWidth,
				containerHeight = 600;

			// Shaders
			var shaderMaterial,
				shaderMaterial2;

			// Uniforms for the shader
			var uniforms;
			
			var sun_position;

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

			// Used in functions changeToFogOne and changeToFogTwo
			var increasingSpeedFactorForTheFog = 2.0;		// större tal på denna gör så att imman växer saktare
			var increasingSizeFactorForTheFog = 2.0;		// större tal detta är desta större blir imma "cirkeln"
			var x = 0.0;
			var isClicked;

			// Used to store all meshes available, and is then used for the mouse controll to check if a mesh is clicked
			var objects = [];

			// Texture
			var hidden_message_tex;
			
			// Gui components
			var fogOneOrTwo;
			var mystery;
			var radius_for_the_fog;

			console.log("Initializing!");
			init();
			console.log("Start rendering!");

			function animate() {
				//console.log("Animating!");
				requestAnimationFrame(animate);
				controls.update(1.0);
				render();
			}

			function init() {
				// Initialize the sun position
				sun_position = new THREE.Vector3();
				sun_position.x = -200.0; sun_position.y = 2000.0; sun_position.z = 300.0;

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

				    sunPosition: { type: "v3", value: new THREE.Vector3(sun_position.x, sun_position.y, sun_position.z)},
				    cameraPosWorldSpace: { type: "v3", value: new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z)},
				    mousePositionWorldSpace: {type: "v3", value: new THREE.Vector3(10,10,0.0)},

				    noise_type: { type: "i", value: 0},
				    planeWidth: { type: "f", value: plane_width},
				    planeHeight: { type: "f", value: plane_height},

				    container_width: { type: "f", value: containerWidth },
				    container_height: { type: "f", value: containerHeight},
				    
				    radius: {type: "f", value: radius_for_the_fog},
				    // Variable that can change if the user uses the GUI components 
				    mystery_function: {type: "i", value: mystery},
				    noise_frequency: {type: "f", value: 0.1},
				    // Textures
					hidden_Texture: {type: "t", value: hidden_message_tex},
					cubeMap: {type: "t", value: new THREE.ImageUtils.loadTextureCube( ["img/posx.jpg", "img/negx.jpg", "img/posy.jpg", "img/negy.jpg", "img/posz.jpg", "img/negz.jpg"]) },
					cubeMapBlurr: {type: "t", value: new THREE.ImageUtils.loadTextureCube( ["img/posx.jpg", "img/negx.jpg", "img/posy.jpg", "img/negy.jpg", "img/posz.jpg", "img/blurr.jpg"])},
				};

				// create the custom material
				shaderMaterial = new THREE.ShaderMaterial({
					uniforms: uniforms,
					vertexShader:   $('#vertexshader').text(),
					fragmentShader: $('#fragmentshader').text(),
					wireframe: false,
				});

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
				createFlyControls();
				createStats();

								

				//$container.append(stats.Element);	
				container.appendChild( stats.domElement );

				document.addEventListener( 'mousedown', onDocumentMouseDown, false );
				document.addEventListener( 'touchstart', onDocumentTouchStart, false );

				window.addEventListener( 'resize', onWindowResize, false );

				animate();
			}

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
					fogOneOrTwo = gui_content.FogOneOrTwo;

					if(gui_content.Noise === 'SimplexNoise'){
						uniforms.noise_type.value = 0;
					} else if(gui_content.Noise === 'PerlinNoise'){
						uniforms.noise_type.value = 1;
					}

					// Update variables used in describing how the fog shall increase/decrease
					isClicked = true;		// set the boolean isClicked to true, used in changeToFogOne() and changeToFogTwo()	
					x = 0.0;				// reset x = 0.0, used in function changeToFogOne() 

				} else {
					// Update variables used in describing how the fog shall increase/decrease,
					isClicked = false;
					x = 0.0;
				}


			}

			function onDocumentTouchStart( event ) {
				event.preventDefault();
				event.clientX = event.touches[0].clientX;
				event.clientY = event.touches[0].clientY;
				onDocumentMouseDown( event );
			}

			function onWindowResize() {
				// Update the camera and renderer
				camera.aspect = window.innerWidth / containerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize( window.innerWidth, containerHeight);
				
				// Update the uniforms describing the size of the container
				uniforms.container_height.value = containerHeight;
				uniforms.container_width.value = containerWidth;
			}

			/* The fog increases and decreases with the function radius = -sin(x - 3.141/increasingSpeedFactor)/e^(x - 3.141/increasingSizeFactor) */
			function changeToFogOne(){
				if(x!= 666){
					x = (isClicked) ? (x + 0.01) : (0.0); 
					radius_for_the_fog = (isClicked) ? ( -1.0/Math.exp(x/increasingSizeFactorForTheFog-3.141) * Math.sin((x/increasingSpeedFactorForTheFog)-3.141) ) : 0.0;			// 3.141 ty då blir det nära noll då x = 0
					x = (radius_for_the_fog < 0.0 ) ? 666 : x;
				} else {
					radius_for_the_fog = 0.0;
				}
			}
			/* The fog increase/decreases linearly. */ 
			function changeToFogTwo(currentTime){
				if(isClicked == true && currentTime >= 5){
					radius_for_the_fog -= 0.01 * increasingSizeFactorForTheFog * 0.2;
				} else if(isClicked == true && currentTime < 5){
					radius_for_the_fog += 0.05 * increasingSizeFactorForTheFog * 0.2;
				} else{
				 	radius_for_the_fog = 0.0;
				}					
			}

			function render()
			{
				// Updating sunposition
				sun_position.x = 4.0 * Math.sin(0.001 * (Date.now() - start)) * 100;

				// Update the uniforms for the sun position, camera position and time.
				uniforms.sunPosition.value = new THREE.Vector3(sun_position.x, sun_position.y, sun_position.z);
				uniforms.cameraPosWorldSpace.value = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
				
				// Update the uniform time variable, by getting the time now and subtract it with the start time.
				var currentTime = 0.0025 * (Date.now() - start);
				uniforms.time.value = currentTime;
				
				// Check which fog function that shall be called (describing how fast the fog shall increase/decrease)
				if(fogOneOrTwo == 0){
					changeToFogOne() 
				} else {
					changeToFogTwo(currentTime);
				}
				
				// Check the GUI and se if any uniforms have to be updated.
				mystery = gui_content.Mystery;
				uniforms.mystery_function.value = mystery;
				uniforms.noise_frequency.value = gui_content.NoiseFrequency;
				uniforms.radius.value = radius_for_the_fog;

				// Render the scene and update the stats
				renderer.render( scene, camera );
				stats.update();
			}

			function createStats(){
				stats = new Stats();
				stats.domElement.style.position = 'absolute';
				stats.domElement.style.top = '0px';
				stats.domElement.style.zIndex = 100;
			}

			function createFlyControls(){
				controls = new THREE.FlyControls(camera);
				controls.movementSpeed = 1.0;
				controls.domElement = container;
				controls.rollSpeed = Math.PI / 240;
				controls.autoForward = false;
				controls.dragToLook = false;
			}

			function createControls(){
				controls = new THREE.TrackballControls( camera, renderer.domElement );
				controls.rotateSpeed = 2.0;
				controls.zoomSpeed = 1.2;
				controls.panSpeed = 0.8;
				controls.noZoom = false;
				controls.noPan = false;
				controls.staticMoving = true;
				controls.dynamicDampingFactor = 0.3;
				controls.keys = [ 65, 83, 68 ];
			}

			function createWindowPane(){
				windowPane = new THREE.Mesh( new THREE.PlaneGeometry(plane_width/3, plane_height/3, segments_w, segments_h), shaderMaterial );
				// set default position to (0,0,-100)
				windowPane.position.x = 0; windowPane.position.y = 0; windowPane.position.z = 0;//-plane_width/2;
				// update matrix
				windowPane.updateMatrix();
				windowPane.matrixAutoUpdate = false;
				// add it to the scene
				scene.add( windowPane );

				objects.push( windowPane );
			}

			/*
			* Initializing the meshes for the door and adds them to the scene
			**/
			function createDoor(){
				door = new THREE.Mesh(new THREE.PlaneGeometry(plane_width/3, 2 * plane_height/3, 8, 8), shaderMaterialWindowFrame);
				door.position.x = 0;
				door.position.y = - plane_width/6;
				door.position.z = plane_width - 1.1;
				door.rotation.x = 3.14;
				door.updateMatrix();
				door.matrixAutoUpdate = false;
				scene.add(door);
			
				doorknob = new THREE.Mesh(new THREE.SphereGeometry(2,16,16), shaderMaterialBack);
				doorknob.position.x = 20;
				doorknob.position.y = - plane_width/ 6;
				doorknob.position.z = plane_width - 1.5;
				door.updateMatrix();
				door.matrixAutoUpdate = false;
				scene.add(doorknob);
			}

			/*
			* Initializing the meshes for the "window cross" (is there to make the window look more lika a window than a painting)
			**/
			function createWindowCross(){
				var windowFrameSegmentsWidth = 8,  windowFrameSegmentsHeight = 8;
				windowCross1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2,plane_height/3, windowFrameSegmentsWidth, windowFrameSegmentsHeight), shaderMaterialWindowFrame);
				windowCross2 = new THREE.Mesh(new THREE.PlaneGeometry(plane_width/3, 1.2, windowFrameSegmentsWidth, windowFrameSegmentsHeight), shaderMaterialWindowFrame);

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

				scene.add(windowCross1);
				scene.add(windowCross2);

			}

			/*
			* Initializing the window frame
			**/
			function createWindowFrames(){
				// windowFrame1 = new THREE.Mesh( new THREE.PlaneGeometry(plane_width, plane_height, segments_w, segments_h), shaderMaterialBack);
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