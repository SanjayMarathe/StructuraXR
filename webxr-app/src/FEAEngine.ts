import * as THREE from 'three';
import type { ForceVector } from './ForceVector';
import { SimulationBlock, ForceType, MaterialType, BoundaryCondition } from './MaterialSystem';

export class FEASimulationEngine {
    private blocks: Map<THREE.Mesh, SimulationBlock> = new Map();
    private gravity = 9.81; // m/s²
    private deformationScale = 5.0; // Exaggeration factor
    private currentForceVector: ForceVector | null = null; // Store for vertex calculations

    constructor() {}

    public addBlock(
        mesh: THREE.Mesh,
        material: MaterialType = MaterialType.STEEL,
        boundary: BoundaryCondition = BoundaryCondition.FREE
    ): SimulationBlock {
        const block = new SimulationBlock(mesh, material, boundary);
        this.blocks.set(mesh, block);
        return block;
    }

    public removeBlock(mesh: THREE.Mesh): void {
        this.blocks.delete(mesh);
    }

    public getBlock(mesh: THREE.Mesh): SimulationBlock | undefined {
        return this.blocks.get(mesh);
    }

    public getAllBlocks(): SimulationBlock[] {
        return Array.from(this.blocks.values());
    }

    public runSimulation(forceVector: ForceVector): {
        totalBlocks: number;
        failedBlocks: number;
        maxStress: number;
        results: Map<THREE.Mesh, { stress: number; failed: boolean }>;
    } {
        console.log('🔬 Running FEA simulation...');
        
        // Store force vector for gradient calculations
        this.currentForceVector = forceVector;

        const results = new Map<THREE.Mesh, { stress: number; failed: boolean }>();
        let failedCount = 0;
        let maxStress = 0;

        this.blocks.forEach((block, mesh) => {
            // Calculate distance and direction from force origin
            const meshPosition = new THREE.Vector3();
            mesh.getWorldPosition(meshPosition);

            const distanceToForce = meshPosition.distanceTo(forceVector.position);
            const directionToMesh = new THREE.Vector3()
                .subVectors(meshPosition, forceVector.position)
                .normalize();

            // Calculate force alignment (dot product)
            const alignment = directionToMesh.dot(forceVector.direction);

            // Heuristic force calculation
            // Force decreases with distance (1/r²-like)
            const distanceFactor = 1.0 / Math.max(1.0, Math.pow(distanceToForce, 2));
            
            // Force magnitude based on alignment and distance
            // Increased scaling from 1e6 to 1e8 for more visible stress
            const effectiveForce = forceVector.magnitude * Math.abs(alignment) * distanceFactor * 1e8;

            console.log(`  Debug: dist=${distanceToForce.toFixed(2)}, align=${alignment.toFixed(2)}, force=${effectiveForce.toFixed(0)}N`);

            // Determine force type based on direction
            if (alignment > 0.7) {
                // Force pointing towards mesh - compression
                block.calculateStress(effectiveForce, ForceType.COMPRESSION);
            } else if (alignment < -0.7) {
                // Force pointing away - tension
                block.calculateStress(effectiveForce, ForceType.TENSION);
            } else {
                // Perpendicular - shear
                block.calculateStress(effectiveForce, ForceType.SHEAR);
            }

            // Add gravitational stress for non-fixed blocks
            if (block.properties.boundaryCondition !== BoundaryCondition.FIXED) {
                const gravitationalForce = block.properties.mass * this.gravity;
                const gravityStress = gravitationalForce / block.properties.material.maxCompression;
                block.properties.stress += gravityStress;
            }

            // Apply deformation visualization
            block.applyDeformation(this.deformationScale);

            // Apply Von Mises color
            this.applyVonMisesColoring(block);

            // Track results
            results.set(mesh, {
                stress: block.properties.stress,
                failed: block.properties.failed
            });

            if (block.properties.failed) {
                failedCount++;
            }

            maxStress = Math.max(maxStress, block.properties.stress);

            console.log(`Block: ${block.getMaterialInfo()} | Stress: ${(block.properties.stress * 100).toFixed(1)}% | ${block.properties.failed ? '❌ FAILED' : '✅ Safe'}`);
        });

        console.log(`✅ Simulation complete: ${failedCount}/${this.blocks.size} blocks failed`);

        return {
            totalBlocks: this.blocks.size,
            failedBlocks: failedCount,
            maxStress,
            results
        };
    }

    private applyVonMisesColoring(block: SimulationBlock): void {
        // Apply per-vertex gradient coloring
        block.properties.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const geometry = child.geometry;
                
                if (!geometry.attributes.position) return;
                
                const positions = geometry.attributes.position;
                const colors = new Float32Array(positions.count * 3);
                
                // Get world matrix for transforming vertices
                child.updateMatrixWorld(true);
                const worldMatrix = child.matrixWorld;
                const vertex = new THREE.Vector3();
                
                // For each vertex, calculate individual stress
                for (let i = 0; i < positions.count; i++) {
                    // Get vertex position in world space
                    vertex.fromBufferAttribute(positions, i);
                    vertex.applyMatrix4(worldMatrix);
                    
                    // Calculate stress at this specific vertex
                    // This creates the gradient effect within the block
                    const vertexStress = this.calculateVertexStress(vertex, block);
                    
                    // Get color for this stress level
                    const color = this.getStressColor(vertexStress, block.properties.failed);
                    
                    colors[i * 3] = color.r;
                    colors[i * 3 + 1] = color.g;
                    colors[i * 3 + 2] = color.b;
                }
                
                // Apply vertex colors
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                
                // Enable vertex colors in material
                const material = child.material as THREE.MeshStandardMaterial;
                material.vertexColors = true;
                
                // IMPORTANT: Set base color to white so vertex colors show properly
                material.color.setHex(0xffffff);
                
                // Add emissive glow for failed blocks
                if (block.properties.failed) {
                    material.emissive = new THREE.Color(0xff0000);
                    material.emissiveIntensity = 0.5;
                    console.log(`  ⚠️ FAILED BLOCK - Applied red emissive glow`);
                } else {
                    material.emissive = new THREE.Color(0x000000);
                    material.emissiveIntensity = 0;
                }
                
                material.needsUpdate = true;
                geometry.attributes.color.needsUpdate = true;
                
                console.log(`  Applied vertex colors to ${positions.count} vertices (failed: ${block.properties.failed})`);
            }
        });
    }

    private calculateVertexStress(vertex: THREE.Vector3, block: SimulationBlock): number {
        if (!this.currentForceVector) {
            return block.properties.stress;
        }

        // Calculate stress based on vertex distance from force origin
        // Closer to force = higher stress
        const distToForce = vertex.distanceTo(this.currentForceVector.position);
        
        // Get block center distance for comparison
        const blockCenter = new THREE.Vector3();
        block.properties.mesh.getWorldPosition(blockCenter);
        const blockDistToForce = blockCenter.distanceTo(this.currentForceVector.position);
        
        // Calculate stress multiplier based on relative position
        // If vertex is closer to force than block center: higher stress
        // If vertex is farther: lower stress
        const stressRatio = blockDistToForce > 0.01 ? distToForce / blockDistToForce : 1.0;
        
        // Vertices closer to force get MORE stress (inverted ratio)
        // This creates a gradient from red (near force) to green (far from force)
        const localStressMultiplier = Math.max(0.5, Math.min(1.5, 2.0 - stressRatio));
        
        const baseStress = block.properties.stress;
        const vertexStress = baseStress * localStressMultiplier;
        
        return Math.min(vertexStress, 2.0); // Cap at 200%
    }

    private getStressColor(stress: number, isFailed: boolean): THREE.Color {
        // Von Mises stress color mapping with proper red for failures
        
        if (isFailed || stress >= 1.0) {
            // FAILED: Bright red
            return new THREE.Color(0xff0000);
        } else if (stress < 0.3) {
            // Green to light green (0% - 30%)
            return new THREE.Color().lerpColors(
                new THREE.Color(0x00ff00), // Green
                new THREE.Color(0x88ff00),
                stress / 0.3
            );
        } else if (stress < 0.6) {
            // Light green to yellow (30% - 60%)
            const t = (stress - 0.3) / 0.3;
            return new THREE.Color().lerpColors(
                new THREE.Color(0x88ff00),
                new THREE.Color(0xffff00), // Yellow
                t
            );
        } else {
            // Yellow to orange to red (60% - 100%)
            const t = (stress - 0.6) / 0.4;
            return new THREE.Color().lerpColors(
                new THREE.Color(0xffff00), // Yellow
                new THREE.Color(0xff8800), // Orange
                t
            );
        }
    }

    public resetSimulation(): void {
        this.blocks.forEach(block => {
            block.resetDeformation();
            block.properties.stress = 0;
            block.properties.failed = false;

            // Reset color to neutral gray
            block.properties.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    const material = child.material as THREE.MeshStandardMaterial;
                    
                    // Remove vertex colors
                    if (child.geometry.attributes.color) {
                        child.geometry.deleteAttribute('color');
                    }
                    
                    // Disable vertex coloring
                    material.vertexColors = false;
                    
                    // Reset to default color
                    material.color.setHex(0xaaaaaa);
                    material.emissive.setHex(0x000000);
                    material.emissiveIntensity = 0;
                    material.needsUpdate = true;
                }
            });
        });

        console.log('🔄 Simulation reset');
    }

    public setDeformationScale(scale: number): void {
        this.deformationScale = scale;
        // Trigger update if needed (requires re-running simulation loop usually)
    }

    public clearVectors(): void {
        this.currentForceVector = null;
        // Reset all blocks to original state (no stress)
        this.blocks.forEach((block) => {
            block.reset();
        });
        console.log('🔄 FEA Engine state cleared');
    }

    public getSimulationSummary(): string {
        const totalBlocks = this.blocks.size;
        const failedBlocks = this.getAllBlocks().filter(b => b.properties.failed).length;
        const avgStress = this.getAllBlocks().reduce((sum, b) => sum + b.properties.stress, 0) / totalBlocks;

        return `
📊 Simulation Summary:
━━━━━━━━━━━━━━━━━━━
Total Blocks: ${totalBlocks}
Failed: ${failedBlocks} (${((failedBlocks / totalBlocks) * 100).toFixed(1)}%)
Average Stress: ${(avgStress * 100).toFixed(1)}%
Safe: ${totalBlocks - failedBlocks}

${failedBlocks > 0 ? '⚠️ Structure has failures!' : '✅ Structure is safe'}
        `.trim();
    }
}
