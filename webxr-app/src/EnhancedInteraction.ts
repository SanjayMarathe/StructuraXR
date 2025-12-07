import * as THREE from 'three';

export class EnhancedInteraction {
    private raycaster: THREE.Raycaster;
    private workingMatrix: THREE.Matrix4;
    private controller1: THREE.XRTargetRaySpace;
    private controller2: THREE.XRTargetRaySpace;
    private scene: THREE.Scene;
    private selectedObject: THREE.Object3D | null = null;
    private intersectables: THREE.Object3D[] = [];
    
    // Transform state
    private isScaling = false;
    private isRotating = false;
    private initialDistance = 0;
    private initialScale = new THREE.Vector3();
    private initialRotation = new THREE.Euler();
    
    // Controller positions
    private controller1Position = new THREE.Vector3();
    private controller2Position = new THREE.Vector3();

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        this.scene = scene;
        this.raycaster = new THREE.Raycaster();
        this.workingMatrix = new THREE.Matrix4();

        // Setup controllers
        this.controller1 = this.setupController(renderer, 0);
        this.controller2 = this.setupController(renderer, 1);
    }

    private setupController(renderer: THREE.WebGLRenderer, index: number): THREE.XRTargetRaySpace {
        const controller = renderer.xr.getController(index);
        
        // Visual ray
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        const material = new THREE.LineBasicMaterial({ color: 0x00ffff });
        const line = new THREE.Line(geometry, material);
        line.name = 'line';
        line.scale.z = 5;
        controller.add(line);

        controller.addEventListener('selectstart', (event) => this.onSelectStart(event));
        controller.addEventListener('selectend', (event) => this.onSelectEnd(event));
        controller.addEventListener('squeezestart', (event) => this.onSqueezeStart(event));
        controller.addEventListener('squeezeend', (event) => this.onSqueezeEnd(event));

        this.scene.add(controller);
        return controller;
    }

    private onSelectStart(event: any) {
        const controller = event.target;
        const intersections = this.getIntersections(controller);

        if (intersections.length > 0) {
            const intersection = intersections[0];
            let object = intersection.object;
            
            // Find the root interactable object
            while (object.parent && !this.intersectables.includes(object)) {
                object = object.parent;
            }
            
            if (this.intersectables.includes(object)) {
                this.selectedObject = object;
                controller.attach(this.selectedObject);
                this.highlightObject(this.selectedObject, true);
            }
        }
    }

    private onSelectEnd(_event: any) {
        if (this.selectedObject) {
            this.scene.attach(this.selectedObject);
            this.highlightObject(this.selectedObject, false);
            this.selectedObject = null;
        }
    }

    private onSqueezeStart(_event: any) {
        if (!this.selectedObject) return;
        
        // Enable two-handed manipulation
        this.controller1Position.setFromMatrixPosition(this.controller1.matrixWorld);
        this.controller2Position.setFromMatrixPosition(this.controller2.matrixWorld);
        
        this.initialDistance = this.controller1Position.distanceTo(this.controller2Position);
        this.initialScale.copy(this.selectedObject.scale);
        this.initialRotation.copy(this.selectedObject.rotation);
        
        this.isScaling = true;
        this.isRotating = true;
    }

    private onSqueezeEnd(_event: any) {
        this.isScaling = false;
        this.isRotating = false;
    }

    private highlightObject(object: THREE.Object3D, highlight: boolean) {
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const material = child.material as THREE.MeshStandardMaterial;
                if (material.emissive) {
                    material.emissive.setHex(highlight ? 0x00ffff : 0x000000);
                    material.emissiveIntensity = highlight ? 0.3 : 0;
                }
            }
        });
    }

    private getIntersections(controller: THREE.XRTargetRaySpace) {
        this.workingMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix);
        return this.raycaster.intersectObjects(this.intersectables, true);
    }

    public setIntersectables(objects: THREE.Object3D[]) {
        this.intersectables = objects;
    }

    public update() {
        if (this.selectedObject && (this.isScaling || this.isRotating)) {
            this.controller1Position.setFromMatrixPosition(this.controller1.matrixWorld);
            this.controller2Position.setFromMatrixPosition(this.controller2.matrixWorld);
            
            const currentDistance = this.controller1Position.distanceTo(this.controller2Position);
            
            if (this.isScaling && this.initialDistance > 0) {
                const scaleMultiplier = currentDistance / this.initialDistance;
                this.selectedObject.scale.copy(this.initialScale).multiplyScalar(scaleMultiplier);
            }
            
            if (this.isRotating) {
                const direction = new THREE.Vector3().subVectors(this.controller2Position, this.controller1Position);
                const angle = Math.atan2(direction.z, direction.x);
                this.selectedObject.rotation.y = angle;
            }
        }
    }
}
