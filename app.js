document.addEventListener('DOMContentLoaded', function() {
	var canvas = document.getElementById('renderCanvas');
	var engine = new BABYLON.Engine(canvas, true);
	var scene;
	var resetPositions = [];
	var cubePositions = [];
	var colors = [];
	var cube;
	var currentFaceElement = document.getElementById('currentFace');
	const PICK_COLOR = new BABYLON.Color4(0, 0, 1, 1);
	const DEFAULT_COLOR = new BABYLON.Color4(1, 1, 1, 1);
	var selectedFaceIndex = null;
  
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
	  var ambientLight = new BABYLON.HemisphericLight('ambientLight', new BABYLON.Vector3(0, 1, 0), scene);
	  ambientLight.intensity = 0.5;
  
	  camera.setPosition(new BABYLON.Vector3(0, 5, 10));
	  camera.attachControl(canvas, true);
	  cube = BABYLON.MeshBuilder.CreateBox('box', { size: 2 }, scene);
	  let faceMaterial = new BABYLON.StandardMaterial('faceMaterial', scene);
	  faceMaterial.diffuseColor = DEFAULT_COLOR;
	  cube.material = faceMaterial;
	  cube.isPickable = true;
	  cube.computeWorldMatrix(true);
	  cube.updateFacetData();
	  cube.enableEdgesRendering();
	  cube.edgesWidth = 5;
  
	  cubePositions = cube.getVerticesData(BABYLON.VertexBuffer.PositionKind);
	  colors = cube.getVerticesData(BABYLON.VertexBuffer.ColorKind);
	  if (!colors) {
		colors = Array.from({ length: (cubePositions.length / 3) * 4 }, () => 1);
	  }
	  resetPositions = Array.from(cubePositions);
  
	  let abstractPlane = new BABYLON.Plane(0, 1, 0, -15);
	  var plane = null;
	  let ind = [];
	  const indices = cube.getIndices();
  
	  scene.onPointerObservable.add((pickResult) => {
		if (pickResult.type === BABYLON.PointerEventTypes.POINTERDOWN) {
		  if (
			pickResult.pickInfo.hit &&
			pickResult.pickInfo.pickedMesh.name === 'box'
		  ) {
			if (!scene.getMeshByName('plane')) {
			  abstractPlane.normal = pickResult.pickInfo
				.getNormal()
				.normalize();
			  abstractPlane.d = -BABYLON.Vector3.Dot(
				abstractPlane.normal,
				pickResult.pickInfo.pickedPoint
			  );
			  selectedFaceIndex = pickResult.pickInfo.faceId;
  
			  plane = BABYLON.MeshBuilder.CreatePlane(
				'plane',
				{ sourcePlane: abstractPlane, size: 2 },
				scene
			  );
			  plane.position = pickResult.pickInfo.pickedPoint;
			  let mat = new BABYLON.StandardMaterial('planeMat', scene);
			  mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
			  mat.backFaceCulling = false;
			  mat.alpha = 0.0;
			  plane.material = mat;
  
			  var pointerDragBehavior = new BABYLON.PointerDragBehavior({
				dragAxis: new BABYLON.Vector3(0, 0, 1),
			  });
			  pointerDragBehavior.attach(plane);
			  cube.isPickable = false;
			  ind = [];
  
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
  
			  const highlightFace = (face, color) => {
				const facet = 2 * Math.floor(face);
				for (var i = 0; i < 6; i++) {
				  const vertex = indices[3 * facet + i];
				  colors[4 * vertex] = color.r;
				  colors[4 * vertex + 1] = color.g;
				  colors[4 * vertex + 2] = color.b;
				  colors[4 * vertex + 3] = color.a;
				}
  
				cube.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
			  };
  
			  highlightFace(selectedFaceIndex / 2, PICK_COLOR);
			  pointerDragBehavior.startDrag();
  
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
				scene.getMeshByName('plane').dispose();
				currentFaceElement.textContent = 'No face selected right now';
				cube.isPickable = true;
				cube.refreshBoundingInfo();
				cube.disableEdgesRendering();
				cube.enableEdgesRendering();
				highlightFace(selectedFaceIndex / 2, DEFAULT_COLOR);
				selectedFaceIndex = null;
			  });
  
			  plane.onAfterRenderObservable.add(() => {
				abstractPlane.d = -BABYLON.Vector3.Dot(
				  plane.position,
				  abstractPlane.normal
				);
			  });
			}
			currentFaceElement.textContent =
			  'Current face: ' +
			  pickResult.pickInfo.faceId;
		  }
		}
	  });
  
	  return scene;
	};
  
	function proj(plane, point) {
	  let ray = new BABYLON.Ray(point, plane.normal, 100);
	  let intersection = ray.intersectsPlane(plane);
  
	  if (intersection !== null) {
		let projectedPoint = ray.origin.add(ray.direction.scale(intersection));
		return projectedPoint;
	  }
	  if (intersection == null) {
		let ray2 = new BABYLON.Ray(point, plane.normal.scale(-1), 100);
		let intersection2 = ray2.intersectsPlane(plane);
		if (intersection2 != null) {
		  let projectedPoint = ray2.origin.add(ray2.direction.scale(intersection2));
		  return projectedPoint;
		}
	  }
	  return null;
	}
  
	document.getElementById('resetButton').addEventListener('click', function() {
	  cubePositions = Array.from(resetPositions);
	  cube.disableEdgesRendering();
	  cube.setVerticesData(BABYLON.VertexBuffer.PositionKind, cubePositions);
	  if (scene.getMeshByName('plane')) {
		scene.getMeshByName('plane').dispose();
	  }
	  cube.isPickable = true;
	  cube.enableEdgesRendering();
	  cube.edgesWidth = 5;
	  colors = Array.from({ length: (cubePositions.length / 3) * 4 }, () => 1);
	  cube.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
	  selectedFaceIndex = null;
	  currentFaceElement.textContent = 'No face selected right now';
	});
  
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
  
