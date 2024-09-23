import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/build/three.module.js';
import { GLTFLoader } from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/controls/OrbitControls.js';
import { AlvaARConnectorTHREE } from './alva_ar_three.js';

class ARCamView {
    constructor(container, width, height, x = 0, y = 0, z = -10, scale = 1.0) {
        this.applyPose = AlvaARConnectorTHREE.Initialize(THREE);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setClearColor(0, 0);
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.rotation.reorder('YXZ');
        this.camera.updateProjectionMatrix();

        this.scene = new THREE.Scene();
        this.scene.add(new THREE.AmbientLight(0x808080));
        this.scene.add(new THREE.HemisphereLight(0x404040, 0xf0f0f0, 1));
        
        // Aggiunta di luci direzionali
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);

        // Aggiunta di una luce spot
        const spotLight = new THREE.SpotLight(0xffffff);
        spotLight.position.set(10, 10, 10);
        spotLight.castShadow = true;
        this.scene.add(spotLight);

        this.scene.add(this.camera);

        container.appendChild(this.renderer.domElement);

        // Caricamento del modello ASTRONAVE.glb
        const loader = new GLTFLoader();
        loader.load('./ASTRONAVE.glb', (gltf) => {
            this.object = gltf.scene;
            this.object.scale.set(scale, scale, scale); // Imposta la scala
            this.object.position.set(x, y, z); // Imposta la posizione
            this.object.rotation.x = -Math.PI / 2; // Ruota di -90 gradi sull'asse X
            this.object.visible = false; // Lo rendiamo visibile solo quando necessario
            this.scene.add(this.object); // Aggiungi l'oggetto alla scena
        }, undefined, function (error) {
            console.error(error);
        });

        const render = () => {
            requestAnimationFrame(render.bind(this));
            this.renderer.render(this.scene, this.camera);
        }

        render();
    }

    updateCameraPose(pose) {
        this.applyPose(pose, this.camera.quaternion, this.camera.position);

        if (this.object) {
            this.object.visible = true;
        }
    }

    lostCamera() {
        if (this.object) {
            this.object.visible = false;
        }
    }
}

// Classe ARCamIMUView
class ARCamIMUView {
    constructor(container, width, height) {
        this.applyPose = AlvaARConnectorTHREE.Initialize(THREE);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setClearColor(0, 0);
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);

        this.raycaster = new THREE.Raycaster();

        this.ground = new THREE.Mesh(
            new THREE.CircleGeometry(1000, 64),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                depthTest: true,
                opacity: 0.1,
                side: THREE.DoubleSide
            })
        );

        this.ground.rotation.x = Math.PI / 2; // 90 deg
        this.ground.position.y = 0; // Imposta la posizione Y del piano a 0

        this.scene = new THREE.Scene();
        this.scene.add(new THREE.AmbientLight(0x808080));
        this.scene.add(new THREE.HemisphereLight(0x404040, 0xf0f0f0, 1));
        this.scene.add(this.ground);
        this.scene.add(this.camera);

        container.appendChild(this.renderer.domElement);

        const render = () => {
            requestAnimationFrame(render.bind(this));
            this.renderer.render(this.scene, this.camera);
        }

        render();
    }

    updateCameraPose(pose) {
        this.applyPose(pose, this.camera.quaternion, this.camera.position);

        this.ground.position.x = this.camera.position.x;
        this.ground.position.z = this.camera.position.z;

        this.scene.children.forEach(obj => obj.visible = true);
    }

    lostCamera() {
        this.scene.children.forEach(obj => obj.visible = false);
    }

     addObjectAt(x, y, scale = 1.0) {
        const el = this.renderer.domElement;

        const coord = new THREE.Vector2((x / el.offsetWidth) * 2 - 1, -(y / el.offsetHeight) * 2 + 1);

        this.raycaster.setFromCamera(coord, this.camera);

        const intersections = this.raycaster.intersectObjects([this.ground]);

        if (intersections.length > 0) {
            const point = intersections[0].point;

            // Carica l'astronave invece di creare un icosaedro
            const loader = new GLTFLoader();
            loader.load('./ASTRONAVE.glb', (gltf) => {
                const object = gltf.scene;
                object.scale.set(scale, scale, scale); // Imposta la scala
                object.position.set(point.x, point.y, point.z); // Imposta la posizione
                object.custom = true;
                this.scene.add(object); // Aggiungi l'astronave alla scena
            }, undefined, function (error) {
                console.error(error);
            });
        }
    }
    reset() {
        this.scene.children.filter(o => o.custom).forEach(o => this.scene.remove(o));
    }
}

// Classe ARSimpleView
class ARSimpleView {
    constructor(container, width, height, mapView = null) {
        this.applyPose = AlvaARConnectorTHREE.Initialize(THREE);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setClearColor(0, 0);
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.rotation.reorder('YXZ');
        this.camera.updateProjectionMatrix();

        this.scene = new THREE.Scene();
        this.scene.add(new THREE.AmbientLight(0x808080));
        this.scene.add(new THREE.HemisphereLight(0x404040, 0xf0f0f0, 1));
        this.scene.add(this.camera);

        this.body = document.body;

        container.appendChild(this.renderer.domElement);

        if (mapView) {
            this.mapView = mapView;
            this.mapView.camHelper = new THREE.CameraHelper(this.camera);
            this.mapView.scene.add(this.mapView.camHelper);
        }
    }

    updateCameraPose(pose) {
        this.applyPose(pose, this.camera.quaternion, this.camera.position);

        this.renderer.render(this.scene, this.camera);

        this.body.classList.add("tracking");
    }

    lostCamera() {
        this.body.classList.remove("tracking");
    }

    createObjectWithPose(pose, scale = 1.0) {
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale), new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.1
        }));

        scale *= 0.25;

        const cube = new THREE.Mesh(new THREE.BoxGeometry(scale, scale, scale), new THREE.MeshNormalMaterial({ flatShading: true }));
        cube.position.z = scale * 0.5;

        plane.add(cube);
        plane.custom = true;

        this.applyPose(pose, plane.quaternion, plane.position);
        this.scene.add(plane);

        if (this.mapView) {
            this.mapView.scene.add(plane.clone());
        }
    }

    reset() {
        this.scene.children.filter(o => o.custom).forEach(o => this.scene.remove(o));

        if (this.mapView) {
            this.mapView.scene.children.filter(o => o.custom).forEach(o => this.mapView.scene.remove(o));
        }
    }
}

// Classe ARSimpleMap
class ARSimpleMap {
    constructor(container, width, height) {
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setClearColor(new THREE.Color('rgb(255, 255, 255)'));
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height, false);
        this.renderer.domElement.style.width = width + 'px';
        this.renderer.domElement.style.height = height + 'px';

        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 10000);
        this.scene = new THREE.Scene();
        this.scene.add(new THREE.AmbientLight(0x404040));

        container.appendChild(this.renderer.domElement);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    addObject(object) {
        this.scene.add(object);
    }

    removeObject(object) {
        this.scene.remove(object);
    }

    updateCamera(pose) {
        this.camera.quaternion.set(pose.orientation[0], pose.orientation[1], pose.orientation[2], pose.orientation[3]);
        this.camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    }
}


export { ARCamView, ARCamIMUView, ARSimpleView, ARSimpleMap };
