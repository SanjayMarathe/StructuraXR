import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export class DesktopSimulation {
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private orbitControls: OrbitControls;
    private transformControls: TransformControls;
    private scene: THREE.Scene;
    private selectedObject: THREE.Object3D | null = null;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private intersectables: THREE.Object3D[] = [];

    constructor(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        this.camera = camera;
        this.renderer = renderer;
        this.scene = scene;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // OrbitControls for camera movement
        this.orbitControls = new OrbitControls(camera, renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.minDistance = 1;
        this.orbitControls.maxDistance = 50;

        // TransformControls for object manipulation
        this.transformControls = new TransformControls(camera, renderer.domElement);
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.orbitControls.enabled = !event.value;
        });
        this.scene.add(this.transformControls);

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Mouse click for object selection
        this.renderer.domElement.addEventListener('click', (event) => this.onClick(event));

        // Keyboard shortcuts
        window.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'g':
                case 'G':
                    this.transformControls.setMode('translate');
                    break;
                case 'r':
                case 'R':
                    this.transformControls.setMode('rotate');
                    break;
                case 's':
                case 'S':
                    this.transformControls.setMode('scale');
                    break;
                case 'Escape':
                    this.deselectObject();
                    break;
                case 'Delete':
                case 'Backspace':
                    if (this.selectedObject && event.shiftKey) {
                        this.deleteSelectedObject();
                    }
                    break;
            }
        });

        // Mouse move for raycasting
        this.renderer.domElement.addEventListener('pointermove', (event) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        });
    }

    private onClick(event: MouseEvent): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.intersectables, true);

        if (intersects.length > 0) {
            let object = intersects[0].object;
            
            // Find root interactable
            while (object.parent && !this.intersectables.includes(object)) {
                object = object.parent;
            }

            if (this.intersectables.includes(object)) {
                this.selectObject(object);
            }
        } else {
            this.deselectObject();
        }
    }

    private selectObject(object: THREE.Object3D): void {
        if (this.selectedObject) {
            this.highlightObject(this.selectedObject, false);
        }

        this.selectedObject = object;
        this.transformControls.attach(this.selectedObject);
        this.highlightObject(this.selectedObject, true);
        
        console.log('Selected object:', this.selectedObject);
    }

    private deselectObject(): void {
        if (this.selectedObject) {
            this.highlightObject(this.selectedObject, false);
            this.transformControls.detach();
            this.selectedObject = null;
        }
    }

    private deleteSelectedObject(): void {
        if (this.selectedObject) {
            this.scene.remove(this.selectedObject);
            this.transformControls.detach();
            this.selectedObject = null;
            console.log('Object deleted');
        }
    }

    private highlightObject(object: THREE.Object3D, highlight: boolean): void {
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const material = child.material as THREE.MeshStandardMaterial;
                if (material.emissive) {
                    material.emissive.setHex(highlight ? 0xffaa00 : 0x000000);
                    material.emissiveIntensity = highlight ? 0.3 : 0;
                }
            }
        });
    }

    public setIntersectables(objects: THREE.Object3D[]): void {
        this.intersectables = objects;
    }

    public update(): void {
        this.orbitControls.update();
    }

    public getControls(): { orbit: OrbitControls; transform: TransformControls } {
        return {
            orbit: this.orbitControls,
            transform: this.transformControls
        };
    }

    public showHelp(): string {
        return `
Desktop Controls:
- Left Click: Select object
- G: Move (translate)
- R: Rotate
- S: Scale
- Shift + Delete: Delete selected object
- Escape: Deselect
- Mouse Drag: Rotate camera
- Scroll: Zoom
        `.trim();
    }
}
