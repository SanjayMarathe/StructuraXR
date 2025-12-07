import * as THREE from 'three';

export interface UIButtonConfig {
    label: string;
    onClick: () => void;
    color?: number;
}

export class FloatingUI {
    private panel: THREE.Group;
    private buttons: THREE.Mesh[] = [];
    private raycaster: THREE.Raycaster;
    private hoveredButton: THREE.Mesh | null = null;

    constructor() {
        this.panel = new THREE.Group();
        this.raycaster = new THREE.Raycaster();
    }

    public createPanel(buttons: UIButtonConfig[], position: THREE.Vector3): THREE.Group {
        const panelWidth = 0.6;
        const panelHeight = buttons.length * 0.12 + 0.1;
        
        // Background panel
        const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            opacity: 0.9,
            transparent: true,
            side: THREE.DoubleSide
        });
        const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
        this.panel.add(panelMesh);

        // Create buttons
        buttons.forEach((buttonConfig, index) => {
            const button = this.createButton(buttonConfig, index, buttons.length);
            this.panel.add(button);
        });

        this.panel.position.copy(position);
        this.panel.lookAt(new THREE.Vector3(0, position.y, 0)); // Face user
        
        return this.panel;
    }

    private createButton(config: UIButtonConfig, index: number, total: number): THREE.Group {
        const buttonGroup = new THREE.Group();
        const buttonWidth = 0.5;
        const buttonHeight = 0.08;
        const spacing = 0.12;
        const startY = (total - 1) * spacing / 2;
        
        // Button background
        const geometry = new THREE.PlaneGeometry(buttonWidth, buttonHeight, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: config.color || 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.2,
            side: THREE.DoubleSide
        });
        
        const buttonMesh = new THREE.Mesh(geometry, material);
        buttonMesh.userData = { onClick: config.onClick, label: config.label };
        this.buttons.push(buttonMesh);
        
        buttonGroup.add(buttonMesh);
        
        // Button text (using simple plane with canvas texture)
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 512, 128);
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.label, 256, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const textMesh = new THREE.Mesh(geometry, textMaterial);
        textMesh.position.z = 0.001; // Slightly in front
        buttonGroup.add(textMesh);
        
        buttonGroup.position.y = startY - index * spacing;
        buttonGroup.position.z = 0.01;
        
        return buttonGroup;
    }

    public checkInteraction(controller: THREE.XRTargetRaySpace): void {
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        
        const intersects = this.raycaster.intersectObjects(this.buttons, false);
        
        // Reset previous hover
        if (this.hoveredButton) {
            (this.hoveredButton.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
            this.hoveredButton = null;
        }
        
        // Set new hover
        if (intersects.length > 0) {
            this.hoveredButton = intersects[0].object as THREE.Mesh;
            (this.hoveredButton.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
        }
    }

    public triggerHoveredButton(): void {
        if (this.hoveredButton && this.hoveredButton.userData.onClick) {
            console.log('Button clicked:', this.hoveredButton.userData.label);
            this.hoveredButton.userData.onClick();
        }
    }

    public getPanel(): THREE.Group {
        return this.panel;
    }

    public setPosition(position: THREE.Vector3): void {
        this.panel.position.copy(position);
    }

    public lookAt(target: THREE.Vector3): void {
        this.panel.lookAt(target);
    }
}
