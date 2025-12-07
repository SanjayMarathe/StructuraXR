import * as THREE from 'three';

/**
 * Pixelated Stress Visualizer
 * Creates pixelated texture gradients to show exactly which parts of blocks are affected by stress
 */
export class PixelatedStressVisualizer {
    private pixelSize: number = 8; // Size of each "pixel" in the texture (8x8 pixels per cell)
    private textureSize: number = 64; // Overall texture size (64x64 = 8x8 grid of pixels)

    /**
     * Apply pixelated stress visualization to a block
     * @param mesh The block mesh to visualize
     * @param baseColor The base color from LLM analysis (hex string like "#00FF00")
     * @param stressIntensity Optional stress intensity (0-1) for gradient variation
     */
    public applyPixelatedStress(mesh: THREE.Mesh, baseColor: string, stressIntensity: number = 1.0): void {
        const geometry = mesh.geometry;
        if (!geometry) return;

        // Parse base color
        const color = new THREE.Color(baseColor);
        
        // Create pixelated texture
        const texture = this.createPixelatedTexture(color, stressIntensity);
        
        // Update material to use texture
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material) {
            // Store original material properties
            if (!material.userData.originalMap) {
                material.userData.originalMap = material.map;
                material.userData.originalEmissive = material.emissive.clone();
            }
            
            // Apply pixelated texture
            material.map = texture;
            material.needsUpdate = true;
            
            // Also apply emissive for glow effect
            material.emissive.copy(color);
            material.emissiveIntensity = 0.3;
        }
    }

    /**
     * Create a pixelated texture showing stress gradient
     */
    private createPixelatedTexture(baseColor: THREE.Color, intensity: number): THREE.DataTexture {
        const size = this.textureSize;
        const pixelSize = this.pixelSize;
        const data = new Uint8Array(size * size * 4); // RGBA
        
        // Calculate number of cells (pixels) in the texture
        const cellsPerSide = size / pixelSize;
        
        // Create gradient pattern based on position
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                
                // Determine which "pixel cell" we're in
                const cellX = Math.floor(x / pixelSize);
                const cellY = Math.floor(y / pixelSize);
                
                // Create gradient pattern: higher stress in center, lower at edges
                // This simulates how stress might be distributed across a block
                const centerX = cellsPerSide / 2;
                const centerY = cellsPerSide / 2;
                const distFromCenter = Math.sqrt(
                    Math.pow(cellX - centerX, 2) + Math.pow(cellY - centerY, 2)
                );
                const maxDist = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
                
                // Stress intensity varies from center (high) to edges (low)
                // But we also add some randomness for pixelation effect
                const normalizedDist = distFromCenter / maxDist;
                const cellStress = (1.0 - normalizedDist * 0.5) * intensity;
                
                // Add pixelation noise - each cell gets slightly different intensity
                const cellNoise = (cellX + cellY) % 3; // 0, 1, or 2
                const noiseFactor = 1.0 - (cellNoise * 0.1); // Vary by 0-20%
                const finalIntensity = Math.max(0.3, Math.min(1.0, cellStress * noiseFactor));
                
                // Calculate color based on intensity
                // Higher intensity = brighter/more saturated color
                const r = Math.floor(baseColor.r * 255 * finalIntensity);
                const g = Math.floor(baseColor.g * 255 * finalIntensity);
                const b = Math.floor(baseColor.b * 255 * finalIntensity);
                
                data[index] = r;     // R
                data[index + 1] = g;  // G
                data[index + 2] = b; // B
                data[index + 3] = 255; // A (fully opaque)
            }
        }
        
        const texture = new THREE.DataTexture(data, size, size);
        texture.needsUpdate = true;
        texture.magFilter = THREE.NearestFilter; // Pixelated look
        texture.minFilter = THREE.NearestFilter; // Pixelated look
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }

    /**
     * Create a directional pixelated texture (stress flows in a direction)
     * Useful for showing how force vectors affect different parts of a block
     */
    public applyDirectionalPixelatedStress(
        mesh: THREE.Mesh, 
        baseColor: string, 
        direction: THREE.Vector3,
        intensity: number = 1.0
    ): void {
        const geometry = mesh.geometry;
        if (!geometry) return;

        const color = new THREE.Color(baseColor);
        const texture = this.createDirectionalPixelatedTexture(color, direction, intensity);
        
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material) {
            if (!material.userData.originalMap) {
                material.userData.originalMap = material.map;
                material.userData.originalEmissive = material.emissive.clone();
            }
            
            material.map = texture;
            material.needsUpdate = true;
            material.emissive.copy(color);
            material.emissiveIntensity = 0.3;
        }
    }

    /**
     * Create directional pixelated texture showing stress flow
     */
    private createDirectionalPixelatedTexture(
        baseColor: THREE.Color, 
        direction: THREE.Vector3,
        intensity: number
    ): THREE.DataTexture {
        const size = this.textureSize;
        const pixelSize = this.pixelSize;
        const data = new Uint8Array(size * size * 4);
        
        const cellsPerSide = size / pixelSize;
        
        // Normalize direction to 2D (for texture mapping)
        const dir2D = new THREE.Vector2(direction.x, direction.z).normalize();
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                
                const cellX = Math.floor(x / pixelSize);
                const cellY = Math.floor(y / pixelSize);
                
                // Calculate position relative to center
                const relX = (cellX / cellsPerSide) - 0.5;
                const relY = (cellY / cellsPerSide) - 0.5;
                const relPos = new THREE.Vector2(relX, relY);
                
                // Stress is higher in the direction of force
                const alignment = relPos.dot(dir2D);
                const distFromCenter = relPos.length();
                
                // Combine alignment with distance for gradient
                const cellStress = (0.5 + alignment * 0.5) * (1.0 - distFromCenter * 0.3) * intensity;
                
                // Pixelation noise
                const cellNoise = (cellX + cellY * 7) % 4;
                const noiseFactor = 1.0 - (cellNoise * 0.08);
                const finalIntensity = Math.max(0.4, Math.min(1.0, cellStress * noiseFactor));
                
                const r = Math.floor(baseColor.r * 255 * finalIntensity);
                const g = Math.floor(baseColor.g * 255 * finalIntensity);
                const b = Math.floor(baseColor.b * 255 * finalIntensity);
                
                data[index] = r;
                data[index + 1] = g;
                data[index + 2] = b;
                data[index + 3] = 255;
            }
        }
        
        const texture = new THREE.DataTexture(data, size, size);
        texture.needsUpdate = true;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }

    /**
     * Clear pixelated stress visualization and restore original material
     */
    public clearPixelatedStress(mesh: THREE.Mesh): void {
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material && material.userData.originalMap !== undefined) {
            material.map = material.userData.originalMap;
            material.emissive.copy(material.userData.originalEmissive);
            material.emissiveIntensity = 0;
            material.needsUpdate = true;
            
            // Clean up
            delete material.userData.originalMap;
            delete material.userData.originalEmissive;
        }
    }

    /**
     * Set pixel size (default 8x8 pixels per cell)
     */
    public setPixelSize(size: number): void {
        this.pixelSize = Math.max(2, Math.min(16, size));
    }

    /**
     * Set texture size (default 64x64)
     */
    public setTextureSize(size: number): void {
        this.textureSize = Math.max(32, Math.min(256, size));
    }
}

