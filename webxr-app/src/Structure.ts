import * as THREE from 'three';

export interface StructureBlock {
    mesh: THREE.Mesh;
    type: 'cube' | 'cylinder';
    id: number;
    size: THREE.Vector3;
    label: THREE.Sprite;
}

export class StructureManager {
    private scene: THREE.Scene;
    public blocks: StructureBlock[] = [];
    private nextBlockId: number = 1;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public addBlock(type: 'cube' | 'cylinder', position: THREE.Vector3, size: THREE.Vector3) {
        let geometry: THREE.BufferGeometry;
        if (type === 'cube') {
            geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        } else {
            // Original: CylinderGeometry(size.x / 2, size.x / 2, size.y, 32);
            // Instruction: CylinderGeometry(size.x, size.x, size.y, 32);
            // Assuming size.x is intended as radius for cylinder
            geometry = new THREE.CylinderGeometry(size.x, size.x, size.y, 32);
        }

        const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa }); // Changed color
        const mesh = new THREE.Mesh(geometry, material);
        
        // CRITICAL: Validate and fix floating blocks
        const fixedPosition = this.validateAndFixPosition(position, size);
        mesh.position.copy(fixedPosition);
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        
        // Create numeric ID starting from 1 (matching vector numbering style)
        const blockId = this.nextBlockId++;
        
        // Create label at the top of the block (same style as vectors)
        const labelPosition = fixedPosition.clone().add(new THREE.Vector3(0, size.y / 2 + 0.3, 0));
        const label = this.createLabel(`#${blockId}`, labelPosition);
        this.scene.add(label);
        
        const block: StructureBlock = {
            mesh,
            id: blockId,
            type,
            size,
            label
        };
        this.blocks.push(block);
        console.log(`✅ Block #${blockId} added at (${fixedPosition.x.toFixed(2)}, ${fixedPosition.y.toFixed(2)}, ${fixedPosition.z.toFixed(2)})`);
        return block;
    }

    private validateAndFixPosition(requestedPos: THREE.Vector3, size: THREE.Vector3): THREE.Vector3 {
        const halfHeight = size.y / 2;
        const groundLevel = halfHeight; // Center at half-height means bottom touches ground
        
        // Check if block would be floating (not on ground and no support below)
        // A small tolerance (0.01) is added to account for floating point inaccuracies
        const wouldFloat = requestedPos.y > groundLevel + 0.01; 
        
        if (!wouldFloat) {
            // Already grounded, return as-is
            return requestedPos;
        }
        
        // Check if there's a supporting block below
        const hasSupport = this.checkForSupportBelow(requestedPos, size);
        
        if (hasSupport) {
            // Has support, allow floating position
            console.log(`  Block supported by structure below`);
            return requestedPos;
        }
        
        // No support and would float - fix it to ground level
        const fixedY = groundLevel;
        console.log(`  ⚠️ Floating block detected! Fixed Y: ${requestedPos.y.toFixed(2)} → ${fixedY.toFixed(2)}`);
        return new THREE.Vector3(requestedPos.x, fixedY, requestedPos.z);
    }

    private checkForSupportBelow(position: THREE.Vector3, size: THREE.Vector3): boolean {
        // Check if any existing block is directly below and can support this block
        const checkRadius = Math.max(size.x, size.z) * 0.5;
        
        for (const block of this.blocks) {
            const blockTop = block.mesh.position.y + block.size.y / 2;
            // const blockBottom = block.mesh.position.y - block.size.y / 2; // Not used
            
            // Check if this block is below the requested position and close enough vertically
            // The new block's bottom must be close to the existing block's top
            const newBlockBottomY = position.y - size.y / 2;
            
            // Check if the existing block's top is within a small range below the new block's bottom
            if (blockTop < newBlockBottomY + 0.1 && blockTop > newBlockBottomY - 0.1) { // Tolerance for vertical alignment
                // Check horizontal overlap
                const dx = Math.abs(block.mesh.position.x - position.x);
                const dz = Math.abs(block.mesh.position.z - position.z);
                const blockRadius = Math.max(block.size.x, block.size.z) * 0.5;
                
                // Simple overlap check (sum of radii)
                if (dx < (checkRadius + blockRadius) && dz < (checkRadius + blockRadius)) {
                    return true; // Found support
                }
            }
        }
        
        return false;
    }

    private createLabel(text: string, position: THREE.Vector3): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');
        
        // High resolution canvas for crisp text (same as ForceVector)
        canvas.width = 256;
        canvas.height = 128;
        
        // Glow effect (same style as vectors)
        context.shadowColor = '#ff0044';
        context.shadowBlur = 15;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        
        // Text style (same as vectors)
        context.fillStyle = '#ff0044'; // Neon Red
        context.font = 'bold 60px "Outfit", Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Draw text
        context.fillText(text, 128, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false, // Always visible on top
            depthWrite: false
        });
        const sprite = new THREE.Sprite(material);
        
        sprite.position.copy(position);
        sprite.scale.set(0.5, 0.25, 1); // Same scale as vectors
        sprite.renderOrder = 999; // Ensure it renders on top
        
        return sprite;
    }

    public clear() {
        this.blocks.forEach(b => {
            this.scene.remove(b.mesh);
            this.scene.remove(b.label);
        });
        this.blocks = [];
        this.nextBlockId = 1; // Reset counter when clearing
    }

    public runStressTest() {
        // Simple Hackathon Logic:
        // Green = Supported (y < 0.3 OR touching another supported object)
        // Red = Unsupported (floating)
        
        // Reset all to Red first
        this.blocks.forEach(b => (b.mesh.material as THREE.MeshStandardMaterial).color.setHex(0xff0000));

        let changed = true;
        const supported = new Set<string>();

        // Pass 1: Grounded objects
        this.blocks.forEach(b => {
            // Check if close to floor (y=0 is floor, center is at y=height/2)
            // Assuming floor is at y=0
            const bottomY = b.mesh.position.y - (b.mesh.geometry.boundingBox?.min.y || 0); // approx
            // Simple check: if center y is low enough
            if (b.mesh.position.y < 0.6) { // Generous floor threshold
                supported.add(b.id.toString());
                (b.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x00ff00);
            }
        });

        // Pass 2: Propagate support (Iterative)
        for (let i = 0; i < 5; i++) { // 5 passes to propagate up
            this.blocks.forEach(b => {
                if (supported.has(b.id.toString())) return;

                // Check collision with any supported block
                const isTouchingSupported = this.blocks.some(other => {
                    if (!supported.has(other.id.toString())) return false;
                    if (other.id === b.id) return false;
                    
                    const dist = b.mesh.position.distanceTo(other.mesh.position);
                    return dist < 1.0; // Simple distance check, refine based on size
                });

                if (isTouchingSupported) {
                    supported.add(b.id.toString());
                    (b.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x00ff00);
                }
            });
        }
    }

    public getSceneDescription(): string {
        // Serialize for AI
        return this.blocks.map(b => 
            `${b.type} at (${b.mesh.position.x.toFixed(2)}, ${b.mesh.position.y.toFixed(2)}, ${b.mesh.position.z.toFixed(2)})`
        ).join('\n');
    }

    public removeBlock(blockId: number): boolean {
        const blockIndex = this.blocks.findIndex(b => b.id === blockId);
        if (blockIndex === -1) {
            return false;
        }

        const block = this.blocks[blockIndex];
        this.scene.remove(block.mesh);
        this.scene.remove(block.label);
        this.blocks.splice(blockIndex, 1);
        console.log(`🗑️ Block #${blockId} removed`);
        return true;
    }

    public getBlockByMesh(mesh: THREE.Mesh): StructureBlock | null {
        return this.blocks.find(b => b.mesh === mesh) || null;
    }
}
