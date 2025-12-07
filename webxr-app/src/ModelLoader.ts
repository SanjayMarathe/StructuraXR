import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export interface UploadedModel {
    mesh: THREE.Object3D;
    id: string;
    fileName: string;
}

export class ModelLoader {
    private scene: THREE.Scene;
    private gltfLoader: GLTFLoader;
    private objLoader: OBJLoader;
    private stlLoader: STLLoader;
    public uploadedModels: UploadedModel[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.gltfLoader = new GLTFLoader();
        this.objLoader = new OBJLoader();
        this.stlLoader = new STLLoader();
    }

    async loadFile(file: File): Promise<UploadedModel | null> {
        const fileName = file.name.toLowerCase();
        const fileExtension = fileName.split('.').pop();

        console.log('📁 Loading file:', file.name, 'Type:', fileExtension);

        try {
            const arrayBuffer = await file.arrayBuffer();
            let mesh: THREE.Object3D;

            if (fileExtension === 'gltf' || fileExtension === 'glb') {
                mesh = await this.loadGLTF(arrayBuffer, fileExtension);
            } else if (fileExtension === 'obj') {
                mesh = await this.loadOBJ(arrayBuffer);
            } else if (fileExtension === 'stl') {
                mesh = await this.loadSTL(arrayBuffer);
            } else {
                throw new Error('Unsupported file format');
            }

            // Position model in front of user
            mesh.position.set(0, 1, -2);
            
            // Calculate bounding box and scale to reasonable size
            const box = new THREE.Box3().setFromObject(mesh);
            const size = box.getSize(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z);
            
            // Target size: 1 meter (visible but not too large)
            const targetSize = 1.0;
            
            // Scale to target size (handles both too large and too small models)
            if (maxDimension > 0) {
                const scale = targetSize / maxDimension;
                mesh.scale.multiplyScalar(scale);
            }

            // Re-calculate box after scaling
            box.setFromObject(mesh);
            const finalSize = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            // Position like AI-generated blocks: center at half-height, centered horizontally
            mesh.position.set(
                -center.x,           // Center horizontally
                finalSize.y / 2,     // Center at half the height (bottom at y=0)
                -2 - center.z        // In front of user, centered in depth
            );

            // Enable shadows
            mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.scene.add(mesh);

            const uploadedModel: UploadedModel = {
                mesh,
                id: Math.random().toString(36).substr(2, 9),
                fileName: file.name
            };

            this.uploadedModels.push(uploadedModel);
            console.log('✅ Model loaded successfully:', file.name);
            
            return uploadedModel;
        } catch (error) {
            console.error('❌ Error loading model:', error);
            return null;
        }
    }

    private loadGLTF(arrayBuffer: ArrayBuffer, extension: string): Promise<THREE.Object3D> {
        return new Promise((resolve, reject) => {
            const blob = new Blob([arrayBuffer], { 
                type: extension === 'glb' ? 'model/gltf-binary' : 'model/gltf+json' 
            });
            const url = URL.createObjectURL(blob);

            this.gltfLoader.load(
                url,
                (gltf) => {
                    URL.revokeObjectURL(url);
                    resolve(gltf.scene);
                },
                undefined,
                (error) => {
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            );
        });
    }

    private loadOBJ(arrayBuffer: ArrayBuffer): Promise<THREE.Object3D> {
        return new Promise((resolve, reject) => {
            try {
                const text = new TextDecoder().decode(arrayBuffer);
                const object = this.objLoader.parse(text);
                
                // Add default material if none exists
                object.traverse((child) => {
                    if (child instanceof THREE.Mesh && !child.material) {
                        child.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
                    }
                });
                
                resolve(object);
            } catch (error) {
                reject(error);
            }
        });
    }

    private loadSTL(arrayBuffer: ArrayBuffer): Promise<THREE.Object3D> {
        return new Promise((resolve, reject) => {
            try {
                const geometry = this.stlLoader.parse(arrayBuffer);
                geometry.computeVertexNormals();
                
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0x888888,
                    metalness: 0.3,
                    roughness: 0.7
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                resolve(mesh);
            } catch (error) {
                reject(error);
            }
        });
    }

    public removeModel(id: string) {
        const index = this.uploadedModels.findIndex(m => m.id === id);
        if (index !== -1) {
            const model = this.uploadedModels[index];
            this.scene.remove(model.mesh);
            this.uploadedModels.splice(index, 1);
            console.log('🗑️ Model removed:', model.fileName);
        }
    }

    public clearAll() {
        this.uploadedModels.forEach(model => {
            this.scene.remove(model.mesh);
        });
        this.uploadedModels = [];
        console.log('🗑️ All models cleared');
    }

    public getAllMeshes(): THREE.Object3D[] {
        return this.uploadedModels.map(m => m.mesh);
    }

    public getSceneDescription(): string {
        return this.uploadedModels.map(m => 
            `${m.fileName} at (${m.mesh.position.x.toFixed(2)}, ${m.mesh.position.y.toFixed(2)}, ${m.mesh.position.z.toFixed(2)})`
        ).join('\n');
    }

    public async runStressTest(aiEvaluator?: (description: string) => Promise<{ stability: number; feedback: string }>): Promise<void> {
        console.log('🔍 Running stress test on uploaded models...');
        
        for (const model of this.uploadedModels) {
            console.log(`Analyzing model: ${model.fileName}`);
            
            // Collect all meshes in the model
            const meshes: THREE.Mesh[] = [];
            model.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    meshes.push(child);
                }
            });
            
            console.log(`  Found ${meshes.length} meshes to analyze`);
            
            // Analyze each mesh individually
            for (let i = 0; i < meshes.length; i++) {
                const mesh = meshes[i];
                
                // Calculate bounding box for this specific mesh
                const box = new THREE.Box3().setFromObject(mesh);
                const center = box.getCenter(new THREE.Vector3());
                const bottomY = box.min.y;
                const topY = box.max.y;
                const height = topY - bottomY;
                
                let stability = 1.0; // Default: assume stable
                
                // Physics-based stability calculation
                // Lower parts are more stable, higher parts less stable
                if (bottomY > 2.0) {
                    // Very high, likely unstable
                    stability = 0.1;
                } else if (bottomY > 1.0) {
                    // High, moderately unstable
                    stability = 0.4;
                } else if (bottomY > 0.5) {
                    // Mid-height, moderate stability
                    stability = 0.6;
                } else if (bottomY > 0.1) {
                    // Low but not grounded
                    stability = 0.75;
                } else if (bottomY >= -0.1 && bottomY <= 0.1) {
                    // Grounded - very stable
                    stability = 0.95;
                } else {
                    // Below ground (unusual)
                    stability = 0.5;
                }
                
                // Adjust based on height of the mesh itself
                // Tall thin pieces are less stable
                if (height > 1.0) {
                    stability *= 0.8; // Reduce stability for tall pieces
                }
                
                // Check for lateral support (how far from center)
                const distanceFromCenter = Math.sqrt(center.x * center.x + center.z * center.z);
                if (distanceFromCenter > 2.0) {
                    stability *= 0.7; // Reduce stability for pieces far from center
                }
                
                // If AI evaluator provided, use it for advanced analysis
                if (aiEvaluator && i % 5 === 0) { // Sample every 5th mesh to avoid too many AI calls
                    try {
                        const description = `Mesh ${i + 1}/${meshes.length} of ${model.fileName}: Position (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}), Bottom Y: ${bottomY.toFixed(2)}, Height: ${height.toFixed(2)}`;
                        const result = await aiEvaluator(description);
                        stability = result.stability;
                        console.log(`  AI Feedback for mesh ${i + 1}: ${result.feedback}`);
                    } catch (e) {
                        console.warn('  AI evaluation failed for mesh, using physics-based calculation');
                    }
                }
                
                // Apply color to this specific mesh
                this.applyStressColorToMesh(mesh, stability);
                
                console.log(`  Mesh ${i + 1}: Y=${bottomY.toFixed(2)}, Stability=${(stability * 100).toFixed(0)}%`);
            }
        }
        
        console.log('✅ Stress test complete - each mesh colored individually');
    }

    private applyStressColorToMesh(mesh: THREE.Mesh, stability: number): void {
        // stability: 0.0 (critical/red) → 1.0 (safe/green)
        const material = mesh.material as THREE.MeshStandardMaterial;
        
        // Create color gradient: Red → Yellow → Green
        let color: THREE.Color;
        if (stability < 0.5) {
            // Red to Yellow (0.0 → 0.5)
            const t = stability * 2; // 0 → 1
            color = new THREE.Color().lerpColors(
                new THREE.Color(0xff0000), // Red
                new THREE.Color(0xffff00), // Yellow
                t
            );
        } else {
            // Yellow to Green (0.5 → 1.0)
            const t = (stability - 0.5) * 2; // 0 → 1
            color = new THREE.Color().lerpColors(
                new THREE.Color(0xffff00), // Yellow
                new THREE.Color(0x00ff00), // Green
                t
            );
        }
        
        material.color = color;
        material.needsUpdate = true;
    }

    private applyStressColors(object: THREE.Object3D, stability: number): void {
        // Deprecated: kept for backwards compatibility
        // Now we use applyStressColorToMesh for individual mesh coloring
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                this.applyStressColorToMesh(child, stability);
            }
        });
    }

    public clearStressColors(): void {
        this.uploadedModels.forEach(model => {
            model.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    const material = child.material as THREE.MeshStandardMaterial;
                    material.color.setHex(0x888888); // Reset to gray
                    material.needsUpdate = true;
                }
            });
        });
    }
}

