import * as THREE from 'three';

export class InteractionManager {
    private raycaster: THREE.Raycaster;
    private workingMatrix: THREE.Matrix4;
    private controllers: THREE.XRTargetRaySpace[];
    private scene: THREE.Scene;
    private selectedObject: THREE.Object3D | null = null;
    private intersectables: THREE.Object3D[] = [];

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        this.scene = scene;
        this.raycaster = new THREE.Raycaster();
        this.workingMatrix = new THREE.Matrix4();
        this.controllers = [];

        // Setup controllers
        this.setupController(renderer, 0);
        this.setupController(renderer, 1);
    }

    private setupController(renderer: THREE.WebGLRenderer, index: number) {
        const controller = renderer.xr.getController(index);
        
        // Visual ray
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        const line = new THREE.Line(geometry);
        line.name = 'line';
        line.scale.z = 5;
        controller.add(line);

        controller.addEventListener('selectstart', (event) => this.onSelectStart(event));
        controller.addEventListener('selectend', (event) => this.onSelectEnd(event));

        this.scene.add(controller);
        this.controllers.push(controller);
    }

    private onSelectStart(event: any) {
        const controller = event.target;
        const intersections = this.getIntersections(controller);

        if (intersections.length > 0) {
            const intersection = intersections[0];
            let object = intersection.object;
            
            // Find the root interactable object (in case we hit a child mesh)
            while (object.parent && !this.intersectables.includes(object)) {
                object = object.parent;
            }
            
            // Only select if we found a valid interactable
            if (this.intersectables.includes(object)) {
                this.selectedObject = object;
                controller.attach(this.selectedObject);
                
                // Highlight all meshes in the object
                this.selectedObject.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        const material = child.material as THREE.MeshStandardMaterial;
                        if (material.emissive) {
                            material.emissive.setHex(0x444444);
                        }
                    }
                });
            }
        }
    }

    private onSelectEnd(event: any) {
        const controller = event.target;
        
        if (this.selectedObject) {
            // Detach and re-attach to scene (world)
            this.scene.attach(this.selectedObject);
            
            // Remove highlight from all meshes
            this.selectedObject.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    const material = child.material as THREE.MeshStandardMaterial;
                    if (material.emissive) {
                        material.emissive.setHex(0x000000);
                    }
                }
            });
            
            this.selectedObject = null;
        }
    }

    private getIntersections(controller: THREE.XRTargetRaySpace) {
        this.workingMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix);
        return this.raycaster.intersectObjects(this.intersectables, true); // Recursive for complex models
    }

    public setIntersectables(objects: THREE.Object3D[]) {
        this.intersectables = objects;
    }

    public update() {
        // Optional: Hover effects
    }
}
