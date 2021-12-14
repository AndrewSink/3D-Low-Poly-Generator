import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js'
import * as dat from 'lil-gui'

//Ugh, don't ask about this stuff
var userUploaded = false

// Creates empty mesh container
const myMesh = new THREE.Mesh();

// Debug
const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// STLExport
const exporter = new STLExporter();

// Parameters
const stlLoader = new STLLoader()

//Material
const material = new THREE.MeshNormalMaterial()
material.flatShading = true
material.side = THREE.DoubleSide;

const modifier = new SimplifyModifier();

const MAX_FACE_COUNT_PER_ITERATION = 250;

const renderTimeout = ()=> {
    return new Promise((resolve,reject)=>{
        window.requestAnimationFrame(()=>{
            resolve();
        })
    })
}

let modifierInProgress = false;
let modifierProgressPercentage = 0;

const iterativeModifier = async ({decimationFaceCount, geometry, updateCallback})=>{
    modifierInProgress = true;
    modifierProgressPercentage = 0;
    let startingFaceCount = geometry.attributes.position.count
    let currentFaceCount = startingFaceCount;
    let targetFaceCount = startingFaceCount - decimationFaceCount;
    let totalFacesToDecimate = startingFaceCount - targetFaceCount;
    let remainingFacesToDecimate = currentFaceCount - targetFaceCount;

    let iterationFaceCount = currentFaceCount - MAX_FACE_COUNT_PER_ITERATION;
    
    let simplifiedGeometry = geometry;
    while(iterationFaceCount > targetFaceCount) {
        console.log({currentFaceCount, iterationFaceCount, targetFaceCount});
        simplifiedGeometry = modifier.modify(simplifiedGeometry, MAX_FACE_COUNT_PER_ITERATION);
        await renderTimeout();
        updateCallback(simplifiedGeometry)
        await renderTimeout();
        currentFaceCount =  simplifiedGeometry.attributes.position.count;
        iterationFaceCount = currentFaceCount - MAX_FACE_COUNT_PER_ITERATION;
        remainingFacesToDecimate = currentFaceCount - targetFaceCount;
        modifierProgressPercentage = Math.floor( ((totalFacesToDecimate - remainingFacesToDecimate)/totalFacesToDecimate) * 100 );
    }
    
    simplifiedGeometry = modifier.modify(simplifiedGeometry, currentFaceCount - targetFaceCount );
    updateCallback(simplifiedGeometry)
    modifierProgressPercentage = 100;
    modifierInProgress = false;
}


const rotateControls = gui.addFolder('Rotation')

const rotateX = {
    RotateX: function () {
        console.clear();
        myMesh.rotation.x = myMesh.rotation.x + (-90 * Math.PI / 180);
        myMesh.geometry.computeBoundingBox();
        var bbox = myMesh.geometry.boundingBox;
        myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)
    }
}

rotateControls.add(rotateX, 'RotateX')

const rotateY = {
    RotateY: function () {
        console.clear();
        myMesh.rotation.y = myMesh.rotation.y + (-90 * Math.PI / 180);
        myMesh.geometry.computeBoundingBox();
        var bbox = myMesh.geometry.boundingBox;
        myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)
    }
}

rotateControls.add(rotateY, 'RotateY')

const rotateZ = {
    RotateZ: function () {
        console.clear();
        myMesh.rotation.z = myMesh.rotation.z + (-90 * Math.PI / 180);
        myMesh.geometry.computeBoundingBox();
        var bbox = myMesh.geometry.boundingBox;
        myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)
    }
}

rotateControls.add(rotateZ, 'RotateZ')



const decimateControls = gui.addFolder('Decimation')


const decimate = { amount: .25 }
decimateControls.add(decimate, 'amount', .01, .50, .01).name('Decimation Percentage')


// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Camera
const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 2000)

scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

stlLoader.load(
    './models/test.stl',
    function (geometry) {

        myMesh.material = material;
        myMesh.geometry = geometry;

        var tempGeometry = new THREE.Mesh(geometry, material)
        myMesh.position.copy = (tempGeometry.position)


        geometry.computeVertexNormals();
        myMesh.geometry.center()

        myMesh.rotation.x = -90 * Math.PI / 180;

        myMesh.geometry.computeBoundingBox();
        var bbox = myMesh.geometry.boundingBox;

        myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)

        camera.position.x = ((bbox.max.x * 3));
        camera.position.y = ((bbox.max.y * 3));
        camera.position.z = ((bbox.max.z * 3));


        const size = 1000;
        const divisions = (size / 10);

        const gridHelper = new THREE.GridHelper(size, divisions);
        scene.add(gridHelper);

        scene.add(myMesh);

        myMesh.geometry = modifier.modify(geometry, 0)
        console.log('Face Count:', myMesh.geometry.attributes.position.count)

 

        const updateScene = {
            Update: function () {
                console.clear();
                console.time('updateScene')
                const count = Math.floor(myMesh.geometry.attributes.position.count * decimate.amount);
                iterativeModifier({decimationFaceCount:count, geometry: myMesh.geometry, updateCallback: (geometry)=>{
                    myMesh.geometry = geometry;
                    scene.add(myMesh);
                }}).then(()=>{
                    console.log('Face Count:', myMesh.geometry.attributes.position.count)
                    console.timeEnd('updateScene')
                }).catch(error=> console.error(error))
            }
        }

        decimateControls.add(updateScene, 'Update')


        const resetScene = {
            Reset: function () {
                console.clear();
                if (userUploaded == false) {
                    myMesh.geometry = modifier.modify(geometry, 0)
                    console.log('Face Count:', myMesh.geometry.attributes.position.count)
                    scene.add(myMesh);
                  } else if (userUploaded == true) {
                    geometry = tempGeometry
                    myMesh.geometry = geometry;
                    myMesh.geometry = modifier.modify(geometry, 0)
                    console.log('Face Count:', myMesh.geometry.attributes.position.count)

                  }

            }
        }

        const exportModel = {
            Export: function () {
                var str = exporter.parse(myMesh);
                var blob = new Blob([str], { type: 'text/plain' });
                var link = document.createElement('a');
                link.style.display = 'none';
                document.body.appendChild(link);
                link.href = URL.createObjectURL(blob);
                link.download = 'Model.stl';
                link.click();
            }
        }
        
        decimateControls.add(resetScene, 'Reset')
        decimateControls.add(exportModel, 'Export')


        function tick() {
            var currentTri = (Math.floor(myMesh.geometry.attributes.position.count))
            document.getElementById("currentTri").innerHTML = currentTri;
            if(!modifierInProgress){
                var targetTri = myMesh.geometry.attributes.position.count - (Math.floor(( decimate.amount * myMesh.geometry.attributes.position.count)))
                document.getElementById("targetTri").innerHTML = targetTri;
                
                var time = Math.floor(( decimate.amount * myMesh.geometry.attributes.position.count) * .00267)
                document.getElementById("time").innerHTML = time; 
            }
            document.getElementById("progress").innerHTML = `${modifierProgressPercentage}%`;
            
            render()
            controls.update()
            window.requestAnimationFrame(tick)
        }

        function render() {
            renderer.render(scene, camera)
        }

        tick()

        document.getElementById('file-selector').addEventListener('change', openFile, false);
        
        function openFile (evt) {
            console.clear();
            const fileObject = evt.target.files[0];
        
            const reader = new FileReader();
            reader.readAsArrayBuffer(fileObject) ;
            reader.onload = function ()
            {
                if (userUploaded == false) {
                    userUploaded = true;
                  }
                const geometry = stlLoader.parse(this.result);
                tempGeometry = geometry;
                myMesh.geometry = geometry;
                myMesh.geometry.center()
        
                myMesh.rotation.x = -90 * Math.PI / 180;
        
                myMesh.geometry.computeBoundingBox();
                var bbox = myMesh.geometry.boundingBox;
        
                myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)
        
                camera.position.x = ((bbox.max.x * 3));
                camera.position.y = ((bbox.max.y * 3));
                camera.position.z = ((bbox.max.z * 3));
                scene.add(myMesh);
                myMesh.geometry = modifier.modify(geometry, 0)
                console.log('Face Count:', myMesh.geometry.attributes.position.count)
            };
        };
    }
)


console.log("Well, aren't you curious? You can see face count, processing time, and more right here in the console!")


