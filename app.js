document.addEventListener('DOMContentLoaded', function() {
	var canvas = document.getElementById('renderCanvas');
	var engine = new BABYLON.Engine(canvas, true);
	var scene;
	var resetPositions = [];
	var cubePositions = [];
	var cube;
	var currentFaceElement = document.getElementById('currentFace');
  
	var createScene = function() {
	  scene = new BABYLON.Scene(engine);
	  const camera = new BABYLON.ArcRotateCamera(
		'Camera',
		0,
		0,
		10,
		new BABYLON.Vector3(0, 0, 0),
		scene
	  );
	  camera.setPosition(new BABYLON.Vector3(0, 5, 10));
	  camera.attachControl(canvas, true);
	  cube = BABYLON.MeshBuilder.CreateBox('box', { size: 2 }, scene);
	  let faceMaterial = new BABYLON.StandardMaterial('faceMaterial', scene);
	  faceMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
	  cube.material = faceMaterial;
	  cube.isPickable = true;
	  cube.computeWorldMatrix(true);
	  cube.updateFacetData();
	  cube.enableEdgesRendering();
	  cube.edgesWidth = 5;
  
	  cubePositions = cube.getVerticesData(BABYLON.VertexBuffer.PositionKind);
	  resetPositions = Array.from(cubePositions);
  
	  let abstractPlane = new BABYLON.Plane(0, 1, 0, -15);
	  var plane = null;
	  let ind = [];
  
	  // makes cube pickable again
	  scene.onKeyboardObservable.add(function(event) {
		if (
		  event.event.type === 'keydown' &&
		  (event.event.key === 'r' || event.event.key === 'R')
		) {
		  scene.getMeshByName('plane').dispose();
		  currentFaceElement.textContent = 'No face selected right now';
		  cube.isPickable = true;
		}
	  });
  
	  scene.onPointerObservable.add((pickResult) => {
		if (pickResult.type === BABYLON.PointerEventTypes.POINTERDOWN){
			if (
				pickResult.pickInfo.hit &&
				pickResult.pickInfo.pickedMesh.name === 'box'
			) {
			  if (!scene.getMeshByName('plane')) {
				// abstractNormal is the actual plane on which we would project points(vertices) of the cube
				// we should shift the abstract mathematical plane along with the mesh representation of the plane
				abstractPlane.normal = pickResult.pickInfo
				  .getNormal()
				  .normalize();
				abstractPlane.d = -BABYLON.Vector3.Dot(
				  abstractPlane.normal,
				  pickResult.pickInfo.pickedPoint
				);
  
				// Mesh representation of abstract plane, which is supposed to be invisible
				plane = BABYLON.MeshBuilder.CreatePlane(
				  'plane',
				  { sourcePlane: abstractPlane, size: 2 },
				  scene
				); //scene is optional and defaults to the current scene
				plane.position = pickResult.pickInfo.pickedPoint;
				let mat = new BABYLON.StandardMaterial('planeMat', scene);
				mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
				mat.backFaceCulling = false;
				mat.alpha = 0.0;
				plane.material = mat;
  
				// add dragBehavior to the plane representation
				var pointerDragBehavior = new BABYLON.PointerDragBehavior({
				  dragAxis: new BABYLON.Vector3(0, 0, 1),
				});
				pointerDragBehavior.attach(plane);
				cube.isPickable = false;
				ind = [];
  
				// get a plane that touches the picked point and store all the indices of the vertices that lie on the plane
				for (let i = 0; i < cubePositions.length; i += 3) {
				  let v = new BABYLON.Vector3(
					cubePositions[i],
					cubePositions[i + 1],
					cubePositions[i + 2]
				  );
				  if (pointOnPlane(v, abstractPlane)) {
					ind.push(i);
				  }
				}
  
				//when the plane is dragged, update all the vertices after projecting onto the mathematical plane
				pointerDragBehavior.onDragObservable.add((event) => {
				  for (let i = 0; i < ind.length; i++) {
					let poi = new BABYLON.Vector3(
					  cubePositions[ind[i]],
					  cubePositions[ind[i] + 1],
					  cubePositions[ind[i] + 2]
					);
					let pp = proj(abstractPlane, poi);
					cubePositions[ind[i]] = pp.x;
					cubePositions[ind[i] + 1] = pp.y;
					cubePositions[ind[i] + 2] = pp.z;
				  }
				  cube.setVerticesData(
					BABYLON.VertexBuffer.PositionKind,
					cubePositions
				  );
				});
  
				//when the plane drag is complete, update all the vertices after projecting onto the mathematical plane so that the last
				//location of the mesh representation is touched
				pointerDragBehavior.onDragEndObservable.add((event) => {
				  for (let i = 0; i < ind.length; i++) {
					let poi = new BABYLON.Vector3(
					  cubePositions[ind[i]],
					  cubePositions[ind[i] + 1],
					  cubePositions[ind[i] + 2]
					);
					let pp = proj(abstractPlane, poi);
					cubePositions[ind[i]] = pp.x;
					cubePositions[ind[i] + 1] = pp.y;
					cubePositions[ind[i] + 2] = pp.z;
				  }
				  cube.setVerticesData(
					BABYLON.VertexBuffer.PositionKind,
					cubePositions
				  );
				  cube.disableEdgesRendering();
				  cube.enableEdgesRendering();
				});
  
				// Synchronize mathematical plane and its mesh representation
				plane.onAfterRenderObservable.add(() => {
				  abstractPlane.d = -BABYLON.Vector3.Dot(
					plane.position,
					abstractPlane.normal
				  );
				});
			  }
			  currentFaceElement.textContent =
				'Current face: ' +
				pickResult.pickInfo.faceId +
				". Press 'R' to reset the face";
			}
		}
	  });
	  return scene;
	};
  
function proj(plane, point) {
  let ray = new BABYLON.Ray(point, plane.normal, 100);
  let intersection = ray.intersectsPlane(plane);
  // Calculates the intersection between the ray and the plane

  if (intersection !== null) {
    let projectedPoint = ray.origin.add(ray.direction.scale(intersection));
    // Calculates the projected point by adding the scaled direction vector of the ray to the ray's origin
    return projectedPoint;
  }

  // If the intersection is null (no valid intersection), return null or handle it as needed
  return null;
}

  
	// reset plane vertices to their original positions
	document
	  .getElementById('resetButton')
	  .addEventListener('click', function() {
		cubePositions = [];
		cubePositions = Array.from(resetPositions);
		cube.setVerticesData(
		  BABYLON.VertexBuffer.PositionKind,
		  cubePositions
		);
		scene.getMeshByName('plane').dispose();
		cube.isPickable = true;
		cube.disableEdgesRendering();
		cube.enableEdgesRendering();
		currentFaceElement.textContent = 'No face selected right now';
	  });
	
	  // Checks if a point lies on a plane or not
	  function pointOnPlane(point, plane) {
		let md = BABYLON.Vector3.Dot(plane.normal, point);
		if (Math.abs(md + plane.d) < 0.00001) {
		  return true;
		}
		return false;
	  }
	
	  function runRenderLoop() {
		engine.runRenderLoop(function() {
		  scene.render();
		});
	  }
	
	  function onResize() {
		window.addEventListener('resize', function() {
		  engine.resize();
		});
	  }
	
	  createScene();
	  runRenderLoop();
	  onResize();
	});
