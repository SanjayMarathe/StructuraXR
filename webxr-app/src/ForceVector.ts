import * as THREE from 'three';

export interface ForceVector {
    id: number;
    position: THREE.Vector3;
    direction: THREE.Vector3;
    magnitude: number;
    arrow: THREE.ArrowHelper;
    labels: THREE.Sprite[];
}

export class ForceVectorManager {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private renderer: THREE.WebGLRenderer;
    private vectors: ForceVector[] = [];
    private nextId: number = 1;
    private activeVector: ForceVector | null = null;
    private isPlacingVector = false;
    private isWaitingForClick = false;
    private tempArrow: THREE.ArrowHelper | null = null;
    private tempDirection: THREE.Vector3 = new THREE.Vector3(0, -1, 0);
    private tempMagnitude: number = 1.5;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;

    constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.setupKeyboardControls();
        this.setupMouseControls();
    }

    private setupKeyboardControls(): void {
        window.addEventListener('keydown', (event) => {
            if (event.key === 'f' || event.key === 'F') {
                if (!this.isPlacingVector && !this.isWaitingForClick) {
                    this.startPlacingVector();
                } else if (this.isPlacingVector) {
                    this.confirmVector();
                }
            } else if (event.key === 'Escape') {
                this.cancelPlacing();
            } else if (this.isPlacingVector) {
                this.adjustVectorDirection(event.key);
            }
        });
    }

    private setupMouseControls(): void {
        this.renderer.domElement.addEventListener('click', (event) => {
            if (this.isWaitingForClick) {
                this.handleMouseClick(event);
            }
        });

        this.renderer.domElement.addEventListener('pointermove', (event) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        });
    }

    private startPlacingVector(): void {
        console.log('🎯 STEP 1: Click anywhere in the scene to place force origin');
        this.showNotification();
        this.isWaitingForClick = true;
    }

    private showNotification(): void {
        const notification = document.getElementById('vector-notification');
        if (notification) {
            notification.classList.add('show');
        }
    }

    private hideNotification(): void {
        const notification = document.getElementById('vector-notification');
        if (notification) {
            notification.classList.remove('show');
        }
    }

    private handleMouseClick(event: MouseEvent): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast to get 3D position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Create an invisible plane at y=0 to intersect with
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, intersectPoint);

        if (intersectPoint) {
            // Place arrow at clicked position, slightly above ground
            intersectPoint.y = 1.5;
            this.createTemporaryArrow(intersectPoint);
            this.isWaitingForClick = false;
            this.isPlacingVector = true;
            console.log(`📍 Force placed at (${intersectPoint.x.toFixed(2)}, ${intersectPoint.y.toFixed(2)}, ${intersectPoint.z.toFixed(2)})`);
            console.log('🎯 STEP 2: Use arrow keys to adjust direction, F to confirm, ESC to cancel');
        }
    }

    private createTemporaryArrow(position: THREE.Vector3): void {
        this.tempDirection = new THREE.Vector3(0, -1, 0); // Default down
        this.tempMagnitude = 1.5;
        const color = 0xff0000;
        
        this.tempArrow = new THREE.ArrowHelper(this.tempDirection, position, this.tempMagnitude, color, 0.3, 0.2);
        this.scene.add(this.tempArrow);
    }

    private adjustVectorDirection(key: string): void {
        if (!this.tempArrow) return;

        // A key: Move start position further down the line (along vector direction)
        if (key === 'a' || key === 'A') {
            const moveAmount = 0.3; // Distance to move along the vector
            const moveVector = this.tempDirection.clone().multiplyScalar(moveAmount);
            const newPosition = this.tempArrow.position.clone().add(moveVector);
            this.tempArrow.position.copy(newPosition);
            console.log(`📍 Start position moved along vector to (${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${newPosition.z.toFixed(2)})`);
            return;
        }

        // X key: Move both start and end position up (Y axis positive)
        if (key === 'x' || key === 'X') {
            const moveAmount = 0.3; // Distance to move up
            const newPosition = this.tempArrow.position.clone();
            newPosition.y += moveAmount;
            this.tempArrow.position.copy(newPosition);
            console.log(`⬆️ Vector moved up to (${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${newPosition.z.toFixed(2)})`);
            return;
        }

        let newDir = this.tempDirection.clone();
        
        switch(key) {
            case 'ArrowUp':
                newDir.y += 0.2;
                break;
            case 'ArrowDown':
                newDir.y -= 0.2;
                break;
            case 'ArrowLeft':
                newDir.x -= 0.2;
                break;
            case 'ArrowRight':
                newDir.x += 0.2;
                break;
            case 'w':
            case 'W':
                newDir.z -= 0.2;
                break;
            case 's':
            case 'S':
                newDir.z += 0.2;
                break;
            case '+':
            case '=':
                // Increase magnitude
                this.tempMagnitude = Math.min(this.tempMagnitude + 0.5, 5.0);
                this.tempArrow.setLength(this.tempMagnitude, 0.3, 0.2);
                console.log(`Magnitude: ${this.tempMagnitude.toFixed(1)}`);
                return;
            case '-':
            case '_':
                // Decrease magnitude
                this.tempMagnitude = Math.max(this.tempMagnitude - 0.5, 0.5);
                this.tempArrow.setLength(this.tempMagnitude, 0.3, 0.2);
                console.log(`Magnitude: ${this.tempMagnitude.toFixed(1)}`);
                return;
        }
        
        newDir.normalize();
        this.tempDirection = newDir;
        this.tempArrow.setDirection(newDir);
        console.log(`Direction: (${newDir.x.toFixed(2)}, ${newDir.y.toFixed(2)}, ${newDir.z.toFixed(2)})`);
    }

    private confirmVector(): void {
        if (!this.tempArrow) return;

        const origin = this.tempArrow.position.clone();
        const id = this.nextId++;
        
        // Calculate tip position
        const tipPosition = origin.clone().add(this.tempDirection.clone().multiplyScalar(this.tempMagnitude));

        // Create ID label at base
        const idLabel = this.createLabel(`#${id}`, origin.clone().add(new THREE.Vector3(0, 0.2, 0)));
        this.scene.add(idLabel);

        // Create Force Value label at tip
        const forceValue = (this.tempMagnitude * 1000).toFixed(0); // Heuristic: 1 unit = 1000N
        const valueLabel = this.createLabel(`${forceValue}N`, tipPosition.clone().add(new THREE.Vector3(0, 0.1, 0)));
        this.scene.add(valueLabel);

        const vector: ForceVector = {
            id: id,
            position: origin,
            direction: this.tempDirection.clone(),
            magnitude: this.tempMagnitude,
            arrow: this.tempArrow,
            labels: [idLabel, valueLabel]
        };

        this.vectors.push(vector);
        this.activeVector = vector;
        this.isPlacingVector = false;
        this.tempArrow = null;
        this.hideNotification();

        console.log(`✅ Force vector #${id} placed!`);
    }

    private createLabel(text: string, position: THREE.Vector3): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');
        
        // High resolution canvas for crisp text
        canvas.width = 256;
        canvas.height = 128;
        
        // Glow effect
        context.shadowColor = '#ff0044';
        context.shadowBlur = 15;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        
        // Text style
        context.fillStyle = '#ff0044'; // Neon Red
        context.font = 'bold 60px "Outfit", Arial'; // Larger font for canvas, scaled down in 3D
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Draw text
        context.fillText(text, 128, 64);
        
        // Add a subtle border/background for readability (optional, keeping it clean as requested)
        // context.strokeStyle = 'rgba(255, 0, 68, 0.5)';
        // context.lineWidth = 2;
        // context.strokeText(text, 128, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false, // Always visible on top
            depthWrite: false
        });
        const sprite = new THREE.Sprite(material);
        
        sprite.position.copy(position);
        sprite.scale.set(0.5, 0.25, 1); // Smaller scale in 3D
        sprite.renderOrder = 999; // Ensure it renders on top
        
        return sprite;
    }

    private cancelPlacing(): void {
        if (this.tempArrow) {
            this.scene.remove(this.tempArrow);
            this.tempArrow = null;
        }
        this.isPlacingVector = false;
        this.isWaitingForClick = false;
        this.hideNotification();
        console.log('❌ Vector placement cancelled');
    }

    public getActiveVector(): ForceVector | null {
        return this.activeVector;
    }

    public getAllVectors(): ForceVector[] {
        return this.vectors;
    }

    public clearVectors(): void {
        this.vectors.forEach(vector => {
            this.scene.remove(vector.arrow);
            vector.labels.forEach(label => this.scene.remove(label));
        });
        this.vectors = [];
        this.activeVector = null;
        this.isPlacingVector = false;
        if (this.tempArrow) {
            this.scene.remove(this.tempArrow);
            this.tempArrow = null;
        }
        console.log('🗑️ All force vectors cleared');
    }

    public getVectors(): ForceVector[] {
        return this.vectors;
    }

    public getVectorById(id: number): ForceVector | undefined {
        return this.vectors.find(v => v.id === id);
    }

    public hasActiveVector(): boolean {
        return this.activeVector !== null;
    }

    // Public method for VR controller vector creation
    public createVectorFromVR(position: THREE.Vector3, direction: THREE.Vector3, magnitude: number): void {
        const id = this.nextId++;
        
        // Calculate tip position
        const tipPosition = position.clone().add(direction.clone().multiplyScalar(magnitude));

        // Create arrow
        const color = 0xff0000;
        const arrow = new THREE.ArrowHelper(direction, position, magnitude, color, 0.3, 0.2);
        this.scene.add(arrow);

        // Create ID label at base
        const idLabel = this.createLabel(`#${id}`, position.clone().add(new THREE.Vector3(0, 0.2, 0)));
        this.scene.add(idLabel);

        // Create Force Value label at tip
        const forceValue = (magnitude * 1000).toFixed(0); // Heuristic: 1 unit = 1000N
        const valueLabel = this.createLabel(`${forceValue}N`, tipPosition.clone().add(new THREE.Vector3(0, 0.1, 0)));
        this.scene.add(valueLabel);

        const vector: ForceVector = {
            id: id,
            position: position.clone(),
            direction: direction.clone(),
            magnitude: magnitude,
            arrow: arrow,
            labels: [idLabel, valueLabel]
        };

        this.vectors.push(vector);
        this.activeVector = vector;

        console.log(`✅ Force vector #${id} placed from VR controller!`);
    }
}
