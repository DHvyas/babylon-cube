document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('renderCanvas');
    var engine = new BABYLON.Engine(canvas, true);
    var scene, cube, faceMaterial, pickedFace, faceIndex;
  
    function createScene() {
      scene = new BABYLON.Scene(engine);
      var camera = new BABYLON.ArcRotateCamera(
        'camera',
        0,
        0,
        10,
        new BABYLON.Vector3(0, 0, 0),
        scene
      );
      camera.attachControl(canvas, true);
  
      cube = BABYLON.MeshBuilder.CreateBox('cube', {}, scene);
      cube.enableEdgesRendering();
      cube.edgesWidth = 5;
  
      faceMaterial = new BABYLON.StandardMaterial('faceMaterial', scene);
      faceMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
      cube.material = faceMaterial;
      var dragBehavior = new BABYLON.PointerDragBehavior({ dragAxis: BABYLON.Vector3.Zero() });
      // Selecting a Face
      scene.onPointerDown = function (event, pickResult) {
        if (pickResult.hit && pickResult.pickedMesh === cube) {
          faceIndex = Math.floor(pickResult.faceId / 2);
          pickedFace = pickResult.getNormal(true);
          faceMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
          let dragVector = new BABYLON.Vector3(
            pickedFace.x,
            pickedFace.y,
            pickedFace.z
          );
          dragBehavior.options.dragAxis = dragVector;
          //console.log('Selected face index:', faceIndex);
          //console.log('Picked face normal:', pickedFace);
        }
      };
  
      dragBehavior.onDragStartObservable.add((event) => {
        // Get the positions of the vertices of the clicked face before the drag starts
        positions = cube.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        indices = cube.getIndices();
        oldFacePositions = [];
        // Loop through each vertex of the clicked face and add its position to the oldFacePositions array
        for (let i = 0; i < 6; i++) {
          const vertexIndex = indices[3 * faceIndex * 2 + i];
          const vertexPosition = new BABYLON.Vector3(
            positions[3 * vertexIndex],
            positions[3 * vertexIndex + 1],
            positions[3 * vertexIndex + 2]
          );
          if (!oldFacePositions.some((pos) => pos.equals(vertexPosition))) {
            oldFacePositions.push(vertexPosition);
          }
        }
        //console.log('Old face positions:', oldFacePositions);
        //console.log('Picked face normal:', pickedFace);
      });
      // Extruding the Face
      dragBehavior.onDragObservable.add(function (event) {
        if (pickedFace) {
          var dragDistance = event.dragDistance;
          var extrusionVector = pickedFace.scale(dragDistance);
          //If the extrusion vector contains any negative element, the cube scales inwards so making sure all axes are positive
          if(extrusionVector.x < 0){
            extrusionVector.x = extrusionVector.x * -1;
          }
          else if(extrusionVector.y < 0){
            extrusionVector.y = extrusionVector.y * -1;
          }
          else if(extrusionVector.z < 0){
            extrusionVector.z = extrusionVector.z * -1;
          }
          cube.scaling = cube.scaling.add(extrusionVector);
          cube.position = cube.position.subtract(extrusionVector.scale(0.5));
        }
      });
      cube.addBehavior(dragBehavior);
  
      // Reset Button
      var resetButton = document.getElementById('resetButton');
      resetButton.addEventListener('click', function () {
        faceMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        cube.scaling = new BABYLON.Vector3(1, 1, 1);
        pickedFace = null;
      });
    }
  
    function runRenderLoop() {
      engine.runRenderLoop(function () {
        scene.render();
      });
    }
  
    function onResize() {
      window.addEventListener('resize', function () {
        engine.resize();
      });
    }
  
    createScene();
    runRenderLoop();
    onResize();
  });
  