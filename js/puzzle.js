function puzzle(){
	//CONSTANTS
	VOXEL = 2;
	X_DIMENS = 2;
	Y_DIMENS = 3;
	Z_DIMENS = 4;
	var pivotCenter = new THREE.Vector3(0, 0, 0);
		
	this.userMovingFace = false; //To prevent moving the cube while trying to move a face

	var meshToCubiesMap; //Map using cubie mesh uuid as key and cubie as values
	var cubiesMap; //Map using cubie uuid as key and cubie as value
	var normalizedCubiesToCoordsMap; //Map using cubie uuid as key and Vector3 as value to represent normalized coordinates.
	var clickableCubies; //Array with meshes for raycaster
	var cubiesMoving = []; //Array with cubies actually moving
	var angleSteps = 13, actualStep, angleDelta; //Params for moving animation; TBD remove magical number, calculate according to size
	var movingType; //Which face we are moving. The value indicates face's normal
	var scrambling, scramblingIndex = 0;	
	var clickStart; //Intersection point between raycaster and puzzle, used to detect which face was clicked
	var clickedCubie; //Stores clicked cubie to calculate movement
	var directionMoving = {xCount: 0, yCount: 0, zCount: 0}; //"Statistic" method to determine direction done (TBD better)
	
	var cubieMat = new THREE.MeshPhongMaterial({
		map: THREE.ImageUtils.loadTexture('img/stickers.png')
	});
		
	//Setting vectors for UV mapping
	var redText    = [new THREE.Vector2(0/2, 2/3), new THREE.Vector2(1/2, 2/3), new THREE.Vector2(1/2, 3/3), new THREE.Vector2(0/2, 3/3)];
	var orangeText = [new THREE.Vector2(1/2, 2/3), new THREE.Vector2(2/2, 2/3), new THREE.Vector2(2/2, 3/3), new THREE.Vector2(1/2, 3/3)];
	var blueText   = [new THREE.Vector2(0/2, 1/3), new THREE.Vector2(1/2, 1/3), new THREE.Vector2(1/2, 2/3), new THREE.Vector2(0/2, 2/3)];
	var greenText  = [new THREE.Vector2(1/2, 1/3), new THREE.Vector2(2/2, 1/3), new THREE.Vector2(2/2, 2/3), new THREE.Vector2(1/2, 2/3)];
	var yellowText = [new THREE.Vector2(0/2, 0/3), new THREE.Vector2(1/2, 0/3), new THREE.Vector2(1/2, 1/3), new THREE.Vector2(0/2, 1/3)];
	var whiteText  = [new THREE.Vector2(1/2, 0/3), new THREE.Vector2(2/2, 0/3), new THREE.Vector2(2/2, 1/3), new THREE.Vector2(1/2, 1/3)];
	var blackText  = new THREE.Vector2(0, 0);
	
	this.init = function(scene){
		this.initCameraX = VOXEL * X_DIMENS * 2;
		this.initCameraY = VOXEL * Y_DIMENS * 2;
		this.initCameraZ = VOXEL * Z_DIMENS * 2;
		
		var cubieGeom;
		
		clickableCubies = [];
		meshToCubiesMap = [];
		cubiesMap = [];
		normalizedCubiesToCoordsMap = [];
		for(var y = 0; y < Y_DIMENS; y++){
			for(var x = 0; x < X_DIMENS; x++){
				for(var z = 0; z < Z_DIMENS; z++){					
					cubieGeom = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL);
					
					cubieGeom.faceVertexUvs[0] = [];
					cubieGeom.faceVertexUvs[0][0]  = (x == X_DIMENS - 1) ? [redText[0],    redText[1],    redText[3]]    : [blackText, blackText, blackText];
					cubieGeom.faceVertexUvs[0][1]  = (x == X_DIMENS - 1) ? [redText[1],    redText[2],    redText[3]]    : [blackText, blackText, blackText];					
					cubieGeom.faceVertexUvs[0][2]  = (x == 0) 			 ? [orangeText[0], orangeText[1], orangeText[3]] : [blackText, blackText, blackText];
					cubieGeom.faceVertexUvs[0][3]  = (x == 0) 			 ? [orangeText[1], orangeText[2], orangeText[3]] : [blackText, blackText, blackText];
					cubieGeom.faceVertexUvs[0][4]  = (y == Y_DIMENS - 1) ? [blueText[0],   blueText[1],   blueText[3]]   : [blackText, blackText, blackText];
					cubieGeom.faceVertexUvs[0][5]  = (y == Y_DIMENS - 1) ? [blueText[1],   blueText[2],   blueText[3]]   : [blackText, blackText, blackText];
					cubieGeom.faceVertexUvs[0][6]  = (y == 0) 			 ? [greenText[0],  greenText[1],  greenText[3]]  : [blackText, blackText, blackText];
					cubieGeom.faceVertexUvs[0][7]  = (y == 0) 			 ? [greenText[1],  greenText[2],  greenText[3]]  : [blackText, blackText, blackText];
					cubieGeom.faceVertexUvs[0][8]  = (z == Z_DIMENS - 1) ? [yellowText[0], yellowText[1], yellowText[3]] : [blackText, blackText, blackText];
					cubieGeom.faceVertexUvs[0][9]  = (z == Z_DIMENS - 1) ? [yellowText[1], yellowText[2], yellowText[3]] : [blackText, blackText, blackText];
					cubieGeom.faceVertexUvs[0][10] = (z == 0) 			 ? [whiteText[0],  whiteText[1],  whiteText[3]]  : [blackText, blackText, blackText];
					cubieGeom.faceVertexUvs[0][11] = (z == 0) 			 ? [whiteText[1],  whiteText[2],  whiteText[3]]  : [blackText, blackText, blackText];
									
					//Mesh if offsetted to its position and then added to an Object3D placed in the center
					//This way, when we rotate Object3D, we pivot meshes around center
					var cubie = new THREE.Mesh(cubieGeom, cubieMat);
					cubie.position.set(
						(x - X_DIMENS / 2) * VOXEL + 1/2 * VOXEL, 
						(y - Y_DIMENS / 2) * VOXEL + 1/2 * VOXEL, 
						(z - Z_DIMENS / 2) * VOXEL + 1/2 * VOXEL
					);				
					clickableCubies.push(cubie);					
					var cubiePivot = new THREE.Object3D();
					cubiePivot.add(cubie);
					cubiePivot.position.set(pivotCenter.x, pivotCenter.y, pivotCenter.z);
					cubiesMap[cubiePivot.uuid] = cubiePivot;
					meshToCubiesMap[cubie.uuid] = cubiePivot;
					//In a 3x3x3, center will be (0, 0, 0), blue center (0, 1, 0), etc.
					normalizedCubiesToCoordsMap[cubiePivot.uuid] = new THREE.Vector3(x - X_DIMENS / 2 + 1/2, y - Y_DIMENS / 2 + 1/2, z - Z_DIMENS / 2 + 1/2);			
					if(insideCube(x, y, z))
						continue;
					scene.add(cubiePivot);
				}
			}
		}

		actualStep = angleSteps;
		scrambling = false;
		scramblingIndex = 0;
	}
	
	//Method used for mouse pressed event
	this.findFaceClicked = function(raycaster, controls){
		if(actualStep !== angleSteps)
			return;	
		var intersects = raycaster.intersectObjects(clickableCubies, true);
		if (intersects.length) {
			this.userMovingFace = true;
			controls.enabled = false;
			clickStart = intersects[0].point;
			clickedCubie = meshToCubiesMap[intersects[0].object.uuid];
		}		
	}
	
	//Method used for mouse moved event
	this.guessDirectionMoving = function(raycaster){
		var intersects = raycaster.intersectObjects(clickableCubies, true);
		if (intersects.length) {
			intersects[0].point.sub(clickStart);
			if(intersects[0].point.length() >= 1){
				//Detect direction turning
				var maxVal = Math.max(Math.max(Math.abs(intersects[0].point.x), Math.abs(intersects[0].point.y)), Math.abs(intersects[0].point.z));		
				if(maxVal === Math.abs(intersects[0].point.x))
					directionMoving.xCount += 1 * intersects[0].point.x;
				else if(maxVal === Math.abs(intersects[0].point.y))
					directionMoving.yCount += 1 * intersects[0].point.y;
				else if(maxVal === Math.abs(intersects[0].point.z))
					directionMoving.zCount += 1 * intersects[0].point.z;
			}
		}
	}
	
	//Method used for mouse released event
	this.guessMovingFaceAndDirection = function(controls){
		//We unnormalize cubie's center coordinates
		var cubieCenter = normalizedCubiesToCoordsMap[clickedCubie.uuid].clone();
		cubieCenter.multiplyScalar(VOXEL);
		
		//We can know the face that was clicked because it'll be the corresponding to the biggest component of distance vector between center and point clicked
		var x = clickStart.x - cubieCenter.x;
		var y = clickStart.y - cubieCenter.y;
		var z = clickStart.z - cubieCenter.z;
		
		//faceClicked will be the normal vector of the face clicked
		var faceClicked;
		var max = Math.max(Math.max(Math.abs(x), Math.abs(y)), Math.abs(z));
		if(max === Math.abs(x))
			faceClicked = new THREE.Vector3(Math.abs(x) / x, 0, 0);
		else if(max === Math.abs(y))
			faceClicked = new THREE.Vector3(0, Math.abs(y) / y, 0);
		else
			faceClicked = new THREE.Vector3(0, 0, Math.abs(z) / z);

		//Find face to move
		//We find the highest value in directionMoving and it's sign
		var direction = Math.max(Math.max(Math.abs(directionMoving.xCount), Math.abs(directionMoving.yCount)), Math.abs(directionMoving.zCount));		
		if(direction === Math.abs(directionMoving.xCount))
			direction = (Math.abs(directionMoving.xCount) / directionMoving.xCount > 0) ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-1, 0, 0);
		else if(direction === Math.abs(directionMoving.yCount))
		direction = (Math.abs(directionMoving.yCount) / directionMoving.yCount > 0) ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0);
		else if(direction === Math.abs(directionMoving.zCount))
			direction = (Math.abs(directionMoving.zCount) / directionMoving.zCount > 0) ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 0, -1);
		
		//The face we are trying to move is the perpendicular to the one we clicked and the direction we moved the mouse -> cross product
		var faceToMove = new THREE.Vector3();
		faceToMove.crossVectors(faceClicked, direction);
		
		//Find the layer
		//faceToMove is a vector normal to the face we are moving, only one component should be different from 0 
		var layer, type;
		if(faceToMove.x !== 0){
			layer = normalizedCubiesToCoordsMap[clickedCubie.uuid].x + X_DIMENS/2 - 1/2;
			type = 'x';
		}
		else if(faceToMove.y !== 0){
			layer = normalizedCubiesToCoordsMap[clickedCubie.uuid].y + Y_DIMENS/2 - 1/2;
			type = 'y';
		}
		else if(faceToMove.z !== 0){
			layer = normalizedCubiesToCoordsMap[clickedCubie.uuid].z + Z_DIMENS/2 - 1/2;
			type = 'z';
		}
		
		//We want to know the sign of the not null component
		var inverted = new THREE.Vector3(1, 1, 1);
		inverted = inverted.dot(faceToMove) < 0;
		
		//Reset everything for next move
		directionMoving = {xCount: 0, yCount: 0, zCount: 0}
		controls.enabled = true;
		this.userMovingFace = false;	
		
		//Sometimes faceToMove can be (0,0,0), we want to prevent it
		if(faceToMove.length())
			this.moveCuboid(type, layer, inverted);
	}
	
	this.moveCuboid = function(type, layer, inverted){
		cubiesMoving.length = 0;
		
		Object.keys(normalizedCubiesToCoordsMap).forEach(
			function(key){
				//console.log(normalizedCubiesToCoordsMap[key]);
				switch(type){
					case 'x':
						if((normalizedCubiesToCoordsMap[key].x - 1/2 + X_DIMENS/2) === layer)
							cubiesMoving.push(cubiesMap[key]);
						break;
					case 'y':
						if((normalizedCubiesToCoordsMap[key].y - 1/2 + Y_DIMENS/2) === layer)
							cubiesMoving.push(cubiesMap[key]);
						break;
					case 'z':
						if((normalizedCubiesToCoordsMap[key].z - 1/2 + Z_DIMENS/2) === layer)
							cubiesMoving.push(cubiesMap[key]);
						break;
				}				
			});	
		/*
		cubiesMoving.forEach(function(e){
			console.log(normalizedCubiesToCoordsMap[e.uuid]); 			
		});
		console.log(cubiesMoving.length);
		*/
		angleDelta = ((inverted) ? -1 : 1) * Math.PI / 2 / angleSteps;
		actualStep--;
		
		movingType = type;
		
		var normal;
		switch(type){
			case 'x':
				normal = new THREE.Vector3(1, 0, 0);
				break;
			case 'y':
				normal = new THREE.Vector3(0, 1, 0);
				break;
			case 'z':				
				normal = new THREE.Vector3(0, 0, 1);
				break;
		}		
		
		updateNormalizedCoords(normal, inverted);
	}
	
	this.animate = function(){
		if(actualStep === angleSteps)
			return;
		actualStep--;
		var doNextMove = false;
		cubiesMoving.forEach(function(c){
			switch(movingType){
				case 'x':
					rotateAroundWorldAxis(c, new THREE.Vector3(1, 0, 0), angleDelta);
					break;
				case 'y':
					rotateAroundWorldAxis(c, new THREE.Vector3(0, 1, 0), angleDelta);
					break;
				case 'z':
					rotateAroundWorldAxis(c, new THREE.Vector3(0, 0, 1), angleDelta);
					break;
			}
			if(actualStep < 0){
				switch(movingType){
					case 'x':
						c.rotation.x = Math.round(c.rotation.x / Math.PI * 2) * Math.PI / 2;
						break;
					case 'y':
						c.rotation.y = Math.round(c.rotation.y / Math.PI * 2) * Math.PI / 2;
						break;
					case 'z':
						c.rotation.z = Math.round(c.rotation.z / Math.PI * 2) * Math.PI / 2;
						break;
				}
				actualStep = angleSteps;
				doNextMove = true;
			}
		});
		if(doNextMove){
			if(scrambling)
				this.scramble();
		}
	}
	
	this.scramble = function(){
		scrambling = true;
		var axis = ['x', 'y', 'z']
		axis = axis[Math.floor(Math.random() * 3)];				
		var layer = Math.floor(Math.random() * ((axis === 'x') ? X_DIMENS : (axis === 'y') ? Y_DIMENS : Z_DIMENS));
		var inverted = Math.floor(((Math.random() * 2) % 2 === 0));
		scramblingIndex++;
		if(scramblingIndex === 100){
			scrambling = false;
			scramblingIndex = 0;
		}
		this.moveCuboid(axis, layer, inverted);
	}
	
	this.isScrambling = function(){
		return scrambling;
	}
	
	this.reset = function(scene){
		scene.children.splice(1, scene.children.length - 1);
		this.init(scene);
	}
	
	this.changeDimensions = function(x, y, z){
		if(x)
			X_DIMENS = x;
		if(y)
			Y_DIMENS = y;
		if(z)
			Z_DIMENS = z;
	}
	
	//Applies 90 degree turn to coords
	/*
	If we want to make a turn in x, x component stays the same and y and z are turned 90 degrees.
	a stores value of x component
	b stores cross product with normal
	New value of coord is (old x normal + old.x) in case move is inverted and (old x -normal + old.x) if not
	*/
	function updateNormalizedCoords(normal, inverted){
		cubiesMoving.forEach(function(e){
			var old = normalizedCubiesToCoordsMap[e.uuid];
			var a = new THREE.Vector3();
			a.multiplyVectors(old, normal);
			var b = new THREE.Vector3();
			b.crossVectors(old, normal);
			if(!inverted)
				b.negate();
			normalizedCubiesToCoordsMap[e.uuid].addVectors(a, b);
		});
		/*
		cubiesMoving.forEach(function(e){
			console.log(normalizedCubiesToCoordsMap[e.uuid]); 			
		});
		console.log(cubiesMoving.length);
		*/
	}
	
	//Used to find surface cubies so inner ones are not rendered
	function insideCube(x, y, z){
		return !(x == 0 || (x == X_DIMENS - 1) || y == 0 || (y == Y_DIMENS - 1) || z == 0 || z == (Z_DIMENS - 1));
	}
	
	// Rotate an object around an arbitrary axis in world space   
	function rotateAroundWorldAxis(object, axis, radians) {
		var rotWorldMatrix = new THREE.Matrix4();
		rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
	
		rotWorldMatrix.multiply(object.matrix); // pre-multiply
	
		object.matrix = rotWorldMatrix;
		object.rotation.setFromRotationMatrix(object.matrix);
	}
}