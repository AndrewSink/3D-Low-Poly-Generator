import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier'
import * as dat from 'lil-gui'
import { MeshBasicMaterial } from 'three'

//v1.2.2
console.log('v1.2.2');

//Ugh, don't ask about this stuff
var userUploaded = false

// Creates empty mesh container
var myMesh = new THREE.Mesh();

// Creates another empty mesh container
var tempGeometry = new THREE.Mesh();
var scanGeometry = new THREE.Mesh()

// Updated GUI
let gui = new dat.GUI()
const rotateControls = gui.addFolder('Rotation')
rotateControls.close()
const decimateControls = gui.addFolder('Decimation')
const exportControls = gui.addFolder('Export')

//Should detect if user is on mobile or not
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    exportControls.close()
    rotateControls.close()
    gui.close()
    var link = document.getElementById('input');
    link.style.display = 'none';
} else {
    // console.log('Non-mobile device detected');
}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
// scene.background = new THREE.Color(0xD3D3D3);



// STLExport
const exporter = new STLExporter();

// OBJExport
const objExporter = new OBJExporter();

// GLTFExport
const gltfExporter = new GLTFExporter();


// Parameters
const stlLoader = new STLLoader()

//Material
const material = new THREE.MeshNormalMaterial()
material.flatShading = true
material.side = THREE.DoubleSide;


//Add Grid Helper
const size = 1000;
const divisions = (size / 10);
const gridHelper = new THREE.GridHelper(size, divisions);
scene.add(gridHelper);


const modifier = new SimplifyModifier();

const MAX_FACE_COUNT_PER_ITERATION = 250;

const renderTimeout = () => {
    return new Promise((resolve, reject) => {
        window.requestAnimationFrame(() => {
            resolve();
        })
    })
}

let modifierInProgress = false;
let modifierProgressPercentage = 0;

const iterativeModifier = async ({ decimationFaceCount, geometry, updateCallback }) => {
    modifierInProgress = true;
    modifierProgressPercentage = 0;
    let startingFaceCount = geometry.attributes.position.count
    let currentFaceCount = startingFaceCount;
    let targetFaceCount = startingFaceCount - decimationFaceCount;
    let totalFacesToDecimate = startingFaceCount - targetFaceCount;
    let remainingFacesToDecimate = currentFaceCount - targetFaceCount;

    let iterationFaceCount = currentFaceCount - MAX_FACE_COUNT_PER_ITERATION;

    let simplifiedGeometry = geometry;
    while (iterationFaceCount > targetFaceCount) {
        // console.log({ currentFaceCount, iterationFaceCount, targetFaceCount });
        simplifiedGeometry = modifier.modify(simplifiedGeometry, MAX_FACE_COUNT_PER_ITERATION);
        await renderTimeout();
        updateCallback(simplifiedGeometry)
        await renderTimeout();
        currentFaceCount = simplifiedGeometry.attributes.position.count;
        iterationFaceCount = currentFaceCount - MAX_FACE_COUNT_PER_ITERATION;
        remainingFacesToDecimate = currentFaceCount - targetFaceCount;
        modifierProgressPercentage = Math.floor(((totalFacesToDecimate - remainingFacesToDecimate) / totalFacesToDecimate) * 100);
    }

    simplifiedGeometry = modifier.modify(simplifiedGeometry, currentFaceCount - targetFaceCount);
    updateCallback(simplifiedGeometry)
    modifierProgressPercentage = 100;
    modifierInProgress = false;
}

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

const decimate = { amount: 25 }
decimateControls.add(decimate, 'amount', 1, 50, 1).name('Triangle Reduction %')


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
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 2000)

// scene.add(camera)

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
        var tempGeometry = new THREE.Mesh()
        tempGeometry.geometry = geometry
        geometry.computeVertexNormals();
        myMesh.geometry.center()
        myMesh.rotation.x = -90 * Math.PI / 180;
        myMesh.geometry.computeBoundingBox();
        var bbox = myMesh.geometry.boundingBox;
        myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)
        tempGeometry.position.copy(myMesh.position)

        camera.position.set(60, 60, 120);


        tempGeometry.geometry = modifier.modify(geometry, 0)
        myMesh.geometry = modifier.modify(geometry, 0)
        console.log('Initial Vertex Count:', ((myMesh.geometry.attributes.position.count * 6) - 12))
        console.log('Initial Triangle Count:', ((myMesh.geometry.attributes.position.count * 6) - 12) / 3)

        scene.add(myMesh);


        function tick() {
            var currentTri = (Math.floor(((myMesh.geometry.attributes.position.count * 6) - 12) / 3))
            document.getElementById("currentTri").innerHTML = currentTri;
            if (!modifierInProgress) {
                var targetTri = (((myMesh.geometry.attributes.position.count * 6) - 12) / 3) - (Math.floor(((decimate.amount * .01) * (((myMesh.geometry.attributes.position.count * 6) - 12) / 3))))
                document.getElementById("targetTri").innerHTML = targetTri;

                var time = Math.floor(((decimate.amount * .01) * myMesh.geometry.attributes.position.count) * .00267)
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

        document.getElementById('defaults').addEventListener('change', consoleLogger);

        function consoleLogger() {
            var e = document.getElementById("defaults").value
            if (e == "frog") {
                function loadFrog() {
                    stlLoader.load(
                        './models/frog.stl',
                        function (geometry) {
                            console.clear()
                            myMesh.material = material;
                            myMesh.geometry = geometry;

                            tempGeometry = new THREE.Mesh(myMesh.geometry, myMesh.material)
                            myMesh.position.copy = (tempGeometry.position)

                            geometry.computeVertexNormals();
                            myMesh.geometry.center()
                            myMesh.rotation.x = -90 * Math.PI / 180;
                            myMesh.geometry.computeBoundingBox();
                            var bbox = myMesh.geometry.boundingBox;
                            myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)

                            tempGeometry.geometry = modifier.modify(geometry, 0)
                            myMesh.geometry = modifier.modify(geometry, 0)
                            console.log('Initial Vertex Count:', ((myMesh.geometry.attributes.position.count * 6) - 12))
                            console.log('Initial Triangle Count:', ((myMesh.geometry.attributes.position.count * 6) - 12) / 3)
                        })
                }
                loadFrog()
            } if (e == "sculpture") {
                function loadSculpture() {
                    stlLoader.load(
                        './models/bust.stl',
                        function (geometry) {
                            console.clear()
                            myMesh.material = material;
                            myMesh.geometry = geometry;

                            tempGeometry = new THREE.Mesh(myMesh.geometry, myMesh.material)
                            myMesh.position.copy = (tempGeometry.position)

                            geometry.computeVertexNormals();
                            myMesh.geometry.center()
                            myMesh.rotation.x = -90 * Math.PI / 180;
                            myMesh.geometry.computeBoundingBox();
                            var bbox = myMesh.geometry.boundingBox;
                            myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)

                            tempGeometry.geometry = modifier.modify(geometry, 0)
                            myMesh.geometry = modifier.modify(geometry, 0)
                            console.log('Initial Vertex Count:', ((myMesh.geometry.attributes.position.count * 6) - 12))
                            console.log('Initial Triangle Count:', ((myMesh.geometry.attributes.position.count * 6) - 12) / 3)
                        })
                }
                loadSculpture()
            }

            if (e == "bunny") {
                function loadBunny() {
                    stlLoader.load(
                        './models/test.stl',
                        function (geometry) {
                            console.clear()
                            myMesh.material = material;
                            myMesh.geometry = geometry;

                            tempGeometry = new THREE.Mesh(myMesh.geometry, myMesh.material)
                            myMesh.position.copy = (tempGeometry.position)

                            geometry.computeVertexNormals();
                            myMesh.geometry.center()
                            myMesh.rotation.x = -90 * Math.PI / 180;
                            myMesh.geometry.computeBoundingBox();
                            var bbox = myMesh.geometry.boundingBox;
                            myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)

                            tempGeometry.geometry = modifier.modify(geometry, 0)
                            myMesh.geometry = modifier.modify(geometry, 0)
                            console.log('Initial Vertex Count:', ((myMesh.geometry.attributes.position.count * 6) - 12))
                            console.log('Initial Triangle Count:', ((myMesh.geometry.attributes.position.count * 6) - 12) / 3)
                        })
                }
                loadBunny()
            }
            if (e == "scan") {
                function loadScan() {
                    stlLoader.load(
                        './models/scan.stl',
                        function (geometry) {
                            console.clear()
                            myMesh.material = material;
                            myMesh.geometry = geometry;

                            tempGeometry = new THREE.Mesh(myMesh.geometry, myMesh.material)
                            myMesh.position.copy = (tempGeometry.position)

                            geometry.computeVertexNormals();
                            myMesh.geometry.center()
                            myMesh.rotation.x = -90 * Math.PI / 180;
                            myMesh.geometry.computeBoundingBox();
                            var bbox = myMesh.geometry.boundingBox;
                            myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)

                            tempGeometry.geometry = modifier.modify(geometry, 0)
                            myMesh.geometry = modifier.modify(geometry, 0)
                            console.log('Initial Vertex Count:', ((myMesh.geometry.attributes.position.count * 6) - 12))
                            console.log('Initial Triangle Count:', ((myMesh.geometry.attributes.position.count * 6) - 12) / 3)
                        })
                }
                loadScan()
            }
        }

        const updateScene = {
            Update: function () {
                console.clear();
                console.time('updateScene')
                console.log('Initial Vertex Count:', ((myMesh.geometry.attributes.position.count * 6) - 12))
                console.log('Initial Triangle Count:', (((myMesh.geometry.attributes.position.count * 6) - 12) / 3))

                const count = Math.floor(myMesh.geometry.attributes.position.count * (decimate.amount * .01));
                iterativeModifier({
                    decimationFaceCount: count, geometry: myMesh.geometry, updateCallback: (geometry) => {
                        myMesh.geometry = geometry;
                    }
                }).then(() => {
                    console.log('Updated Vertex Count:', ((myMesh.geometry.attributes.position.count * 6) - 12))
                    console.log('Updated Triangle Count:', (((myMesh.geometry.attributes.position.count * 6) - 12) / 3))
                    console.timeEnd('updateScene')
                }).catch(error => console.error(error))
            }
        }

        decimateControls.add(updateScene, 'Update').name('Decimate')

        const resetScene = {
            Reset: function () {
                console.clear();

                myMesh.geometry = tempGeometry.geometry
                myMesh.geometry = modifier.modify(tempGeometry.geometry, 0)

                console.log('Vertex Count:', ((myMesh.geometry.attributes.position.count * 6) - 12))
                console.log('Triangle Count:', (((myMesh.geometry.attributes.position.count * 6) - 12) / 3))
            }
        }
        decimateControls.add(resetScene, 'Reset')

        document.getElementById('file-selector').addEventListener('change', openFile, false);

        function openFile(evt) {
            console.clear();
            const fileObject = evt.target.files[0];

            const reader = new FileReader();
            reader.readAsArrayBuffer(fileObject);
            reader.onload = function () {

                var geometry = stlLoader.parse(this.result);

                myMesh.material = material;
                myMesh.geometry = geometry;

                tempGeometry = new THREE.Mesh(geometry, material)
                myMesh.position.copy = (tempGeometry.position)

                geometry.computeVertexNormals();
                myMesh.geometry.center()
                myMesh.rotation.x = -90 * Math.PI / 180;
                myMesh.geometry.computeBoundingBox();
                var bbox = myMesh.geometry.boundingBox;
                myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)


                myMesh.geometry = modifier.modify(geometry, 0)
                tempGeometry.geometry = modifier.modify(geometry, 0)

                console.log('Face Count:', myMesh.geometry.attributes.position.count)
            };
        };
    })

const exportModel = {
    Export: function () {
        myMesh.rotation.x = Math.PI / 180;
        console.log('rotated')
        setTimeout(() => {
            var str = exporter.parse(myMesh, { binary: true });
            var blob = new Blob([str], { type: 'text/plain' });
            var link = document.createElement('a');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.href = URL.createObjectURL(blob);
            link.download = 'Model.stl';
            link.click();
            console.log('exported')
            myMesh.rotation.x = -90 * Math.PI / 180;
        }, "200")
    }
}


const exportOBJ = {
    Export: function () {
        myMesh.rotation.x = Math.PI / 180;
        console.log('rotated')
        setTimeout(() => {
            var str = objExporter.parse(myMesh);
            var blob = new Blob([str], { type: 'text/plain' });
            var link = document.createElement('a');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.href = URL.createObjectURL(blob);
            link.download = 'Model.obj';
            link.click();
            console.log('exported')
            myMesh.rotation.x = -90 * Math.PI / 180;
        }, "200")
    }
}


exportControls.add(exportModel, 'Export').name("Export STL")
exportControls.add(exportOBJ, 'Export').name("Export OBJ")

// console.log("Well, aren't you curious? You can see face count, processing time, and more right here in the console!")




// const exportGLTF = {
//     Export: function () {
//         var str = gltfExporter.parse(myMesh);
//         var blob = new Blob([str], { type: 'text/plain' });
//         var link = document.createElement('a');
//         link.style.display = 'none';
//         document.body.appendChild(link);
//         link.href = URL.createObjectURL(blob);
//         link.download = 'Model.gltf';
//         link.click();
//     }
// }

// exportControls.add(exportGLTF, 'Export').name("Export GLTF")