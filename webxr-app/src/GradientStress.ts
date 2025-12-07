import * as THREE from 'three';
import type { ForceVector } from './ForceVector';

export class GradientStressVisualizer {
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public applyGradientStress(mesh: THREE.Mesh, forceVector: ForceVector): void {
        // Calculate stress based on force vector direction and position
        const meshPosition = new THREE.Vector3();
        mesh.getWorldPosition(meshPosition);
        
        // Distance from force origin
        const distance = meshPosition.distanceTo(forceVector.position);
        
        // Direction alignment (dot product)
        const meshToForce = new THREE.Vector3().subVectors(meshPosition, forceVector.position).normalize();
        const alignment = meshToForce.dot(forceVector.direction);
        
        // Calculate stress intensity
        // Objects in line with force direction experience more stress
        // Objects closer to force origin experience more stress
        let stressIntensity = 0.0;
        
        if (distance < 5.0) { // Within range of force
            const distanceFactor = 1.0 - (distance / 5.0); // 1.0 at origin, 0.0 at max distance
            const alignmentFactor = Math.max(0, alignment); // 0.0 to 1.0
            stressIntensity = distanceFactor * alignmentFactor * forceVector.magnitude;
        }
        
        // Apply gradient shader to mesh
        this.applyGradientShader(mesh, stressIntensity, forceVector);
    }

    private applyGradientShader(mesh: THREE.Mesh, stressIntensity: number, forceVector: ForceVector): void {
        // Create vertex colors for gradient effect
        const geometry = mesh.geometry;
        
        if (!geometry.attributes.position) return;
        
        const positions = geometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);
        
        const meshWorldMatrix = mesh.matrixWorld;
        const localToWorld = new THREE.Vector3();
        
        for (let i = 0; i < positions.count; i++) {
            // Get vertex position in world space
            localToWorld.fromBufferAttribute(positions, i);
            localToWorld.applyMatrix4(meshWorldMatrix);
            
            // Calculate stress at this vertex based on distance from force
            const distToForce = localToWorld.distanceTo(forceVector.position);
            const dirToVertex = new THREE.Vector3().subVectors(localToWorld, forceVector.position).normalize();
            const alignment = dirToVertex.dot(forceVector.direction);
            
            // Vertices in line with force direction get more stress
            let vertexStress = 0.0;
            if (distToForce < 3.0 && alignment > 0) {
                const distFactor = 1.0 - (distToForce / 3.0);
                vertexStress = distFactor * alignment * stressIntensity;
            }
            
            // Map stress to color
            const color = this.getStressColor(vertexStress);
            
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Update material to use vertex colors
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.vertexColors = true;
        material.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
    }

    private getStressColor(stress: number): THREE.Color {
        // Map stress (0.0 - 1.0) to gradient
        // Low stress (0.0): Blue/Cyan
        // Medium stress (0.5): Yellow
        // High stress (1.0): Red
        
        if (stress < 0.5) {
            // Blue to Yellow (0.0 → 0.5)
            const t = stress * 2;
            return new THREE.Color().lerpColors(
                new THREE.Color(0x00aaff), // Cyan
                new THREE.Color(0xffff00), // Yellow
                t
            );
        } else {
            // Yellow to Red (0.5 → 1.0)
            const t = (stress - 0.5) * 2;
            return new THREE.Color().lerpColors(
                new THREE.Color(0xffff00), // Yellow
                new THREE.Color(0xff0000), // Red
                t
            );
        }
    }

    public clearStressVisualization(mesh: THREE.Mesh): void {
        const geometry = mesh.geometry;
        
        if (geometry.attributes.color) {
            geometry.deleteAttribute('color');
        }
        
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.vertexColors = false;
        material.color.setHex(0xaaaaaa); // Reset to gray
        material.needsUpdate = true;
    }

    public applyStressToScene(objects: THREE.Object3D[], forceVector: ForceVector): void {
        console.log('🎨 Applying gradient stress visualization...');
        
        objects.forEach(obj => {
            obj.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    this.applyGradientStress(child, forceVector);
                }
            });
        });
        
        console.log('✅ Gradient stress applied');
    }

    public clearSceneStress(objects: THREE.Object3D[]): void {
        objects.forEach(obj => {
            obj.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    this.clearStressVisualization(child);
                }
            });
        });
    }
}
