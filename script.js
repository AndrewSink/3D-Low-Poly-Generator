// Wait for all CDN scripts to load
window.addEventListener('load', function () {

    //v2.0.0
    console.log('v2.0.0');

    //Ugh, don't ask about this stuff
    var userUploaded = false

    // Creates empty mesh container
    var myMesh = new THREE.Mesh();

    // Creates another empty mesh container
    var tempGeometry = new THREE.Mesh();

    // Custom UI Controls (replacing lil-gui)
    const decimate = { amount: 25 }

    // Helper function to format time in minutes and seconds
    function formatTime(totalSeconds) {
        if (totalSeconds < 60) {
            return `${totalSeconds}s`;
        } else {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}m ${seconds}s`;
        }
    }

    // ModelStats class to cache expensive calculations
    class ModelStats {
        constructor(geometry) {
            this.geometry = geometry;
            this._triangleCount = null;
            this._vertexCount = null;
        }

        get triangleCount() {
            if (this._triangleCount === null) {
                this._triangleCount = Math.floor(((this.geometry.attributes.position.count * 6) - 12) / 3);
            }
            return this._triangleCount;
        }

        get vertexCount() {
            if (this._vertexCount === null) {
                this._vertexCount = ((this.geometry.attributes.position.count * 6) - 12);
            }
            return this._vertexCount;
        }

        invalidateCache() {
            this._triangleCount = null;
            this._vertexCount = null;
        }

        updateGeometry(geometry) {
            this.geometry = geometry;
            this.invalidateCache();
        }
    }

    // Global model stats instance
    let modelStats = null;

    // Mobile menu functionality
    let isMobile = window.innerWidth <= 768;
    let sidebarOpen = false;

    // Consolidated resize handler for mobile UI and Three.js canvas
    window.addEventListener('resize', function () {
        const wasMobile = isMobile;
        isMobile = window.innerWidth <= 768;

        // If switching from mobile to desktop, ensure sidebar is visible
        if (wasMobile && !isMobile) {
            document.getElementById('sidebar').classList.remove('sidebar-closed', 'sidebar-open');
            document.getElementById('sidebar-overlay').classList.remove('active');
            document.getElementById('mobile-menu-toggle').classList.remove('active');
            sidebarOpen = false;
        }
        // If switching from desktop to mobile, close sidebar
        else if (!wasMobile && isMobile) {
            document.getElementById('sidebar').classList.add('sidebar-closed');
            document.getElementById('sidebar').classList.remove('sidebar-open');
            sidebarOpen = false;
        }

        // Update Three.js canvas sizes (only if camera and renderer are initialized)
        if (typeof camera !== 'undefined' && typeof renderer !== 'undefined') {
            const newSizes = getCanvasSize();
            sizes.width = newSizes.width;
            sizes.height = newSizes.height;

            // Update camera
            camera.aspect = sizes.width / sizes.height;
            camera.updateProjectionMatrix();

            // Update renderer
            renderer.setSize(sizes.width, sizes.height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }
    });

    // Mobile menu toggle functionality
    function toggleMobileMenu() {
        console.log('toggleMobileMenu called, sidebarOpen:', sidebarOpen);
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const toggle = document.getElementById('mobile-menu-toggle');

        console.log('Elements found:', { sidebar, overlay, toggle });

        sidebarOpen = !sidebarOpen;

        if (sidebarOpen) {
            sidebar.classList.remove('sidebar-closed');
            sidebar.classList.add('sidebar-open');
            overlay.classList.add('active');
            toggle.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        } else {
            sidebar.classList.remove('sidebar-open');
            sidebar.classList.add('sidebar-closed');
            overlay.classList.remove('active');
            toggle.classList.remove('active');
            document.body.style.overflow = ''; // Restore scroll
        }
    }

    // Event listeners for mobile menu (setup immediately since we're already in window.load)
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const overlay = document.getElementById('sidebar-overlay');

    if (menuToggle && overlay) {
        menuToggle.addEventListener('click', toggleMobileMenu);
        overlay.addEventListener('click', toggleMobileMenu);

        // Close menu on escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && sidebarOpen && isMobile) {
                toggleMobileMenu();
            }
        });

        // Initialize mobile state
        if (isMobile) {
            document.getElementById('sidebar').classList.add('sidebar-closed');
        }
    } else {
        console.error('Mobile menu elements not found:', { menuToggle, overlay });
    }

    //Should detect if user is on mobile or not for file upload
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Keep file upload visible on mobile - users might want to upload files
        // var fileUploadSection = document.querySelector('.control-group:has(#file-selector)');
        // if (fileUploadSection) {
        //     fileUploadSection.style.display = 'none';
        // }
    } else {
        // console.log('Non-mobile device detected');
    }

    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()
    // scene.background = new THREE.Color(0xD3D3D3);



    // STLExport
    const exporter = new THREE.STLExporter();

    // OBJExport
    const objExporter = new THREE.OBJExporter();

    // GLTFExport
    const gltfExporter = new THREE.GLTFExporter();


    // Parameters
    const stlLoader = new THREE.STLLoader()

    //Material
    const material = new THREE.MeshNormalMaterial()
    material.flatShading = true
    material.side = THREE.DoubleSide;


    //Add Grid Helper (will be dynamically sized based on model)
    let gridHelper = null;

    // Function to create/update grid based on model bounding box
    function updateGridHelper(boundingBox) {
        // Remove existing grid
        if (gridHelper) {
            scene.remove(gridHelper);
        }

        // Calculate the largest dimension of the bounding box
        const width = boundingBox.max.x - boundingBox.min.x;
        const height = boundingBox.max.y - boundingBox.min.y;
        const depth = boundingBox.max.z - boundingBox.min.z;
        const maxDimension = Math.max(width, height, depth);

        // Set grid size to 2x the largest dimension
        const gridSize = maxDimension * 2;
        const divisions = Math.max(10, Math.floor(gridSize / 10)); // At least 10 divisions

        // Create new grid helper
        gridHelper = new THREE.GridHelper(gridSize, divisions);
        scene.add(gridHelper);
    }

    // Consolidated model setup function to eliminate code duplication
    function setupModel(geometry, modelName = 'Unknown') {
        console.clear();

        // Clean up previous geometry to prevent memory leaks
        if (myMesh.geometry && myMesh.geometry !== geometry) {
            myMesh.geometry.dispose();
        }

        // Clean up previous temp geometry
        if (tempGeometry && tempGeometry.geometry) {
            tempGeometry.geometry.dispose();
        }

        // Set up mesh
        myMesh.material = material;
        myMesh.geometry = geometry;

        // Reset SimplifyModifier initialization flag for new model
        modifierInitialized = false;

        // Create temp geometry for reset functionality
        tempGeometry = new THREE.Mesh(myMesh.geometry, myMesh.material);
        myMesh.position.copy = (tempGeometry.position);

        // Standard geometry processing
        geometry.computeVertexNormals();
        myMesh.geometry.center();
        myMesh.rotation.x = -90 * Math.PI / 180;
        myMesh.geometry.computeBoundingBox();

        const bbox = myMesh.geometry.boundingBox;
        myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2);

        // Update grid helper based on model size
        updateGridHelper(bbox);

        // Update controls target to center on the model
        controls.target.set(0, myMesh.position.y, 0);
        controls.update();

        // Store original geometry for reset functionality
        tempGeometry.geometry = geometry.clone();

        // Create/update model stats
        modelStats = new ModelStats(geometry);

        // Skip SimplifyModifier initialization - we'll do it lazily when user clicks Decimate
        console.log(`Model loaded: ${modelName}`);
        console.log('Skipping SimplifyModifier initialization - will initialize on first decimation');
        console.log('Initial Vertex Count:', modelStats.vertexCount);
        console.log('Initial Triangle Count:', modelStats.triangleCount);
    }

    // Consolidated model loading function
    function loadModel(filePath, modelName) {
        return stlLoader.load(filePath, function (geometry) {
            setupModel(geometry, modelName);
        });
    }

    // Initial grid (will be updated when model loads)
    const initialSize = 1000;
    const initialDivisions = (initialSize / 10);
    gridHelper = new THREE.GridHelper(initialSize, initialDivisions);
    scene.add(gridHelper);


    const modifier = new THREE.SimplifyModifier();
    let modifierInitialized = false; // Track if SimplifyModifier has been initialized

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
        let startingFaceCount = geometry.attributes.position.count;
        let currentFaceCount = startingFaceCount;
        let targetFaceCount = startingFaceCount - decimationFaceCount;
        let totalFacesToDecimate = startingFaceCount - targetFaceCount;
        let remainingFacesToDecimate = currentFaceCount - targetFaceCount;

        let iterationFaceCount = currentFaceCount - MAX_FACE_COUNT_PER_ITERATION;

        let simplifiedGeometry = geometry;
        let previousGeometry = null;

        while (iterationFaceCount > targetFaceCount) {
            // Store previous geometry for cleanup
            previousGeometry = simplifiedGeometry;

            simplifiedGeometry = modifier.modify(simplifiedGeometry, MAX_FACE_COUNT_PER_ITERATION);
            await renderTimeout();
            updateCallback(simplifiedGeometry);
            await renderTimeout();

            // Clean up previous geometry if it's not the original
            if (previousGeometry && previousGeometry !== geometry) {
                previousGeometry.dispose();
            }

            currentFaceCount = simplifiedGeometry.attributes.position.count;
            iterationFaceCount = currentFaceCount - MAX_FACE_COUNT_PER_ITERATION;
            remainingFacesToDecimate = currentFaceCount - targetFaceCount;
            modifierProgressPercentage = Math.floor(((totalFacesToDecimate - remainingFacesToDecimate) / totalFacesToDecimate) * 100);
        }

        // Final decimation step
        previousGeometry = simplifiedGeometry;
        simplifiedGeometry = modifier.modify(simplifiedGeometry, currentFaceCount - targetFaceCount);
        updateCallback(simplifiedGeometry);

        // Clean up the last intermediate geometry
        if (previousGeometry && previousGeometry !== geometry) {
            previousGeometry.dispose();
        }

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

    // Rotation functions (moved from lil-gui)
    const rotateY = {
        RotateY: function () {
            console.clear();
            myMesh.rotation.y = myMesh.rotation.y + (-90 * Math.PI / 180);
            myMesh.geometry.computeBoundingBox();
            var bbox = myMesh.geometry.boundingBox;
            myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)
        }
    }

    const rotateZ = {
        RotateZ: function () {
            console.clear();
            myMesh.rotation.z = myMesh.rotation.z + (-90 * Math.PI / 180);
            myMesh.geometry.computeBoundingBox();
            var bbox = myMesh.geometry.boundingBox;
            myMesh.position.y = ((bbox.max.z - bbox.min.z) / 2)
        }
    }


    // Sizes - account for sidebar on desktop
    const getCanvasSize = () => {
        const isMobileView = window.innerWidth <= 768;
        return {
            width: isMobileView ? window.innerWidth : window.innerWidth - 320,
            height: window.innerHeight
        };
    };

    const sizes = getCanvasSize();

    // Consolidated resize handler will be added to the existing one above

    // Camera
    const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 2000)

    // scene.add(camera)

    // Controls
    const controls = new THREE.OrbitControls(camera, canvas)
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
            setupModel(geometry, 'Bunny (Default)');

            camera.position.set(60, 60, 120);
            scene.add(myMesh);


            // Cache values to avoid unnecessary DOM updates
            let lastTriCount = -1;
            let lastTargetTri = -1;
            let lastTimeInSeconds = -1;
            let lastProgress = -1;

            function tick() {
                // Update model stats if geometry changed
                if (modelStats && modelStats.geometry !== myMesh.geometry) {
                    modelStats.updateGeometry(myMesh.geometry);
                }

                // Only update DOM when values actually change
                if (modelStats) {
                    const currentTri = modelStats.triangleCount;
                    if (currentTri !== lastTriCount) {
                        document.getElementById("currentTri").innerHTML = currentTri;
                        lastTriCount = currentTri;
                    }

                    if (!modifierInProgress) {
                        const targetTri = Math.floor(currentTri - (decimate.amount * 0.01 * currentTri));
                        if (targetTri !== lastTargetTri) {
                            document.getElementById("targetTri").innerHTML = targetTri;
                            lastTargetTri = targetTri;
                        }

                        const timeInSeconds = Math.floor((decimate.amount * 0.01 * myMesh.geometry.attributes.position.count) * 0.00267);
                        if (timeInSeconds !== lastTimeInSeconds) {
                            document.getElementById("time").innerHTML = formatTime(timeInSeconds);
                            lastTimeInSeconds = timeInSeconds;
                        }
                    }
                }

                if (modifierProgressPercentage !== lastProgress) {
                    document.getElementById("progress").innerHTML = `${modifierProgressPercentage}%`;
                    lastProgress = modifierProgressPercentage;
                }

                render();
                controls.update();
                window.requestAnimationFrame(tick);
            }

            function render() {
                renderer.render(scene, camera)
            }

            tick()

            document.getElementById('defaults').addEventListener('change', consoleLogger);

            function consoleLogger() {
                const e = document.getElementById("defaults").value;

                // Use consolidated loading function for all models
                switch (e) {
                    case "frog":
                        loadModel('./models/frog.stl', 'Frog');
                        break;
                    case "sculpture":
                        loadModel('./models/bust.stl', 'Sculpture');
                        break;
                    case "bunny":
                        loadModel('./models/test.stl', 'Bunny');
                        break;
                    case "scan":
                        loadModel('./models/scan.stl', 'Scan');
                        break;
                    default:
                        console.warn('Unknown model selection:', e);
                }
            }

            const updateScene = {
                Update: function () {
                    console.clear();
                    console.time('updateScene');

                    if (modelStats) {
                        console.log('Initial Vertex Count:', modelStats.vertexCount);
                        console.log('Initial Triangle Count:', modelStats.triangleCount);
                    }

                    // Lazy initialization of SimplifyModifier on first decimation
                    if (!modifierInitialized) {
                        console.log('First decimation - initializing SimplifyModifier...');
                        console.time('SimplifyModifier Lazy Initialization');

                        // Initialize the modifier with the current geometry
                        myMesh.geometry = modifier.modify(myMesh.geometry, 0);
                        modifierInitialized = true;

                        console.timeEnd('SimplifyModifier Lazy Initialization');
                        console.log('SimplifyModifier initialized, proceeding with decimation...');
                    }

                    const count = Math.floor(myMesh.geometry.attributes.position.count * (decimate.amount * 0.01));
                    iterativeModifier({
                        decimationFaceCount: count,
                        geometry: myMesh.geometry,
                        updateCallback: (geometry) => {
                            myMesh.geometry = geometry;
                            // Update model stats with new geometry
                            if (modelStats) {
                                modelStats.updateGeometry(geometry);
                            }
                        }
                    }).then(() => {
                        if (modelStats) {
                            console.log('Updated Vertex Count:', modelStats.vertexCount);
                            console.log('Updated Triangle Count:', modelStats.triangleCount);
                        }
                        console.timeEnd('updateScene');
                    }).catch(error => console.error(error));
                }
            }

            // Custom control event listeners
            document.getElementById('decimate-btn').addEventListener('click', updateScene.Update);

            const resetScene = {
                Reset: function () {
                    console.clear();

                    // Reset to original geometry
                    myMesh.geometry = tempGeometry.geometry.clone();

                    // Update model stats with reset geometry
                    if (modelStats) {
                        modelStats.updateGeometry(myMesh.geometry);
                    }

                    // Reset the modifier initialization flag
                    modifierInitialized = false;
                    console.log('Reset to original geometry - SimplifyModifier will re-initialize on next decimation');

                    if (modelStats) {
                        console.log('Vertex Count:', modelStats.vertexCount);
                        console.log('Triangle Count:', modelStats.triangleCount);
                    }
                }
            }
            document.getElementById('reset-btn').addEventListener('click', resetScene.Reset);

            // Rotation button event listeners
            document.getElementById('rotate-x-btn').addEventListener('click', rotateX.RotateX);
            document.getElementById('rotate-y-btn').addEventListener('click', rotateY.RotateY);
            document.getElementById('rotate-z-btn').addEventListener('click', rotateZ.RotateZ);

            // Slider event listener
            const slider = document.getElementById('decimate-slider');
            const sliderValue = document.getElementById('decimate-value');

            slider.addEventListener('input', function () {
                decimate.amount = parseInt(this.value);
                sliderValue.textContent = this.value + '%';
            });

            // Combined file upload handler to prevent duplicate listeners
            document.getElementById('file-selector').addEventListener('change', function (evt) {
                // Update display name
                const fileName = this.files[0] ? this.files[0].name : 'No file selected';
                document.getElementById('file-name').textContent = fileName;

                // Handle file opening
                if (this.files[0]) {
                    openFile(evt);
                }
            }, false);

            function openFile(evt) {
                console.clear();
                const fileObject = evt.target.files[0];

                // Show file size and estimated processing time
                const fileSizeMB = (fileObject.size / (1024 * 1024)).toFixed(2);
                console.log(`Loading STL file: ${fileObject.name} (${fileSizeMB} MB)`);

                // Update UI to show loading state
                document.getElementById('file-name').textContent = `Loading ${fileObject.name}...`;

                const reader = new FileReader();
                reader.readAsArrayBuffer(fileObject);
                reader.onload = function () {
                    console.time('STL Processing');
                    console.log('File loaded into memory, parsing STL...');

                    // Parse STL (can be slow for large files)
                    console.time('STL Parsing');
                    var geometry = stlLoader.parse(this.result);
                    console.timeEnd('STL Parsing');

                    console.log(`Parsed geometry: ${geometry.attributes.position.count} vertices`);

                    // Use consolidated setup function
                    console.time('Geometry Processing');
                    setupModel(geometry, fileObject.name);
                    console.timeEnd('Geometry Processing');

                    console.timeEnd('STL Processing');

                    if (modelStats) {
                        console.log(`Final triangle count: ${modelStats.triangleCount}`);
                    }

                    // Update UI to show completion
                    document.getElementById('file-name').textContent = fileObject.name;
                };

                // Handle file reading progress for large files
                reader.onprogress = function (e) {
                    if (e.lengthComputable) {
                        const percentLoaded = Math.round((e.loaded / e.total) * 100);
                        document.getElementById('file-name').textContent = `Loading... ${percentLoaded}%`;
                    }
                };
            };
        })

    // Consolidated download function to prevent memory leaks
    function downloadFile(blob, filename, fileType) {
        console.log(`Exporting ${fileType}...`);

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.style.display = 'none';
        link.href = url;
        link.download = filename;

        // Add to DOM, click, then clean up immediately
        document.body.appendChild(link);
        link.click();

        // Clean up to prevent memory leaks
        document.body.removeChild(link);

        // Clean up blob URL after a short delay to ensure download started
        setTimeout(() => {
            URL.revokeObjectURL(url);
            console.log(`${fileType} export completed and cleaned up`);
        }, 100);
    }

    // Temporary rotation helper to avoid code duplication
    function withTemporaryRotation(callback) {
        const originalRotation = myMesh.rotation.x;
        myMesh.rotation.x = Math.PI / 180;

        setTimeout(() => {
            callback();
            myMesh.rotation.x = originalRotation;
        }, 200);
    }

    const exportModel = {
        Export: function () {
            withTemporaryRotation(() => {
                const str = exporter.parse(myMesh, { binary: true });
                const blob = new Blob([str], { type: 'application/octet-stream' });
                downloadFile(blob, 'Model.stl', 'STL');
            });
        }
    };

    const exportOBJ = {
        Export: function () {
            withTemporaryRotation(() => {
                const str = objExporter.parse(myMesh);
                const blob = new Blob([str], { type: 'text/plain' });
                downloadFile(blob, 'Model.obj', 'OBJ');
            });
        }
    };


    // Export button event listeners (setup immediately since we're already in window.load)
    const exportSTLBtn = document.getElementById('export-stl-btn');
    const exportOBJBtn = document.getElementById('export-obj-btn');

    if (exportSTLBtn && exportOBJBtn) {
        exportSTLBtn.addEventListener('click', exportModel.Export);
        exportOBJBtn.addEventListener('click', exportOBJ.Export);
    }

    // Cleanup function to prevent memory leaks on page unload
    function cleanup() {
        console.log('Cleaning up resources...');

        // Dispose of Three.js resources
        if (myMesh && myMesh.geometry) {
            myMesh.geometry.dispose();
        }
        if (tempGeometry && tempGeometry.geometry) {
            tempGeometry.geometry.dispose();
        }
        if (material) {
            material.dispose();
        }
        if (gridHelper && gridHelper.geometry) {
            gridHelper.geometry.dispose();
        }
        if (renderer) {
            renderer.dispose();
        }

        // Clear any pending timeouts/intervals
        if (typeof tickAnimationId !== 'undefined') {
            cancelAnimationFrame(tickAnimationId);
        }

        console.log('Cleanup completed');
    }

    // Add cleanup listener
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);

}); // End of window load event listener
