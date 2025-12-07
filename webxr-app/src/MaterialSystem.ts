import * as THREE from 'three';

export const MaterialType = {
    STEEL: 'steel',
    CONCRETE: 'concrete',
    WOOD: 'wood',
    ALUMINUM: 'aluminum'
} as const;
export type MaterialType = typeof MaterialType[keyof typeof MaterialType];

export const BoundaryCondition = {
    FIXED: 'fixed',
    PINNED: 'pinned',
    FREE: 'free'
} as const;
export type BoundaryCondition = typeof BoundaryCondition[keyof typeof BoundaryCondition];

export const ForceType = {
    COMPRESSION: 'compression',
    TENSION: 'tension',
    SHEAR: 'shear',
    BENDING: 'bending'
} as const;
export type ForceType = typeof ForceType[keyof typeof ForceType];

export interface MaterialProperties {
    type: MaterialType;
    density: number; // kg/m³
    maxCompression: number; // Pa
    maxTension: number; // Pa
    maxShear: number; // Pa
    youngsModulus: number; // Pa
}

export interface BlockProperties {
    mesh: THREE.Mesh;
    material: MaterialProperties;
    boundaryCondition: BoundaryCondition;
    mass: number; // kg
    volume: number; // m³
    stress: number; // 0.0 - 2.0+ (>1.0 = failure)
    failed: boolean;
}

export class MaterialLibrary {
    private static materials: Map<MaterialType, MaterialProperties> = new Map([
        [MaterialType.STEEL, {
            type: MaterialType.STEEL,
            density: 7850, // kg/m³
            maxCompression: 400e6, // 400 MPa
            maxTension: 400e6,
            maxShear: 250e6,
            youngsModulus: 200e9
        }],
        [MaterialType.CONCRETE, {
            type: MaterialType.CONCRETE,
            density: 2400,
            maxCompression: 30e6, // 30 MPa
            maxTension: 3e6, // Much weaker in tension
            maxShear: 5e6,
            youngsModulus: 30e9
        }],
        [MaterialType.WOOD, {
            type: MaterialType.WOOD,
            density: 600,
            maxCompression: 30e6,
            maxTension: 60e6, // Stronger in tension
            maxShear: 10e6,
            youngsModulus: 11e9
        }],
        [MaterialType.ALUMINUM, {
            type: MaterialType.ALUMINUM,
            density: 2700,
            maxCompression: 300e6,
            maxTension: 300e6,
            maxShear: 200e6,
            youngsModulus: 69e9
        }]
    ]);

    public static getMaterial(type: MaterialType): MaterialProperties {
        return this.materials.get(type)!;
    }

    public static getAllMaterials(): MaterialType[] {
        return Array.from(this.materials.keys());
    }
}

export class SimulationBlock {
    public properties: BlockProperties;
    private originalPosition: THREE.Vector3;
    private originalScale: THREE.Vector3;
    private deformationFactor = 1.0;

    constructor(
        mesh: THREE.Mesh,
        materialType: MaterialType = MaterialType.STEEL,
        boundary: BoundaryCondition = BoundaryCondition.FREE
    ) {
        const material = MaterialLibrary.getMaterial(materialType);
        
        // Calculate volume from mesh bounding box
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const volume = size.x * size.y * size.z;

        // Calculate mass = density × volume
        const mass = material.density * volume;

        this.properties = {
            mesh,
            material,
            boundaryCondition: boundary,
            mass,
            volume,
            stress: 0.0,
            failed: false
        };

        this.originalPosition = mesh.position.clone();
        this.originalScale = mesh.scale.clone();
    }

    public calculateStress(appliedForce: number, forceType: ForceType): void {
        let limit: number;
        
        switch (forceType) {
            case ForceType.COMPRESSION:
                limit = this.properties.material.maxCompression;
                break;
            case ForceType.TENSION:
                limit = this.properties.material.maxTension;
                break;
            case ForceType.SHEAR:
                limit = this.properties.material.maxShear;
                break;
            case ForceType.BENDING:
                // Bending combines tension and compression
                limit = Math.min(this.properties.material.maxTension, this.properties.material.maxCompression);
                break;
        }

        // Heuristic: stress = applied_force / material_limit
        this.properties.stress = Math.abs(appliedForce) / limit;

        // Check for failure
        if (this.properties.stress >= 1.0) {
            this.properties.failed = true;
        }
    }

    public applyDeformation(scaleFactor: number = 10.0): void {
        // Exaggerated deformation for visualization
        // Scale mesh based on stress (not real elastic deformation)
        
        if (this.properties.boundaryCondition === BoundaryCondition.FIXED) {
            return; // Fixed blocks don't deform
        }

        this.deformationFactor = 1.0 + (this.properties.stress * 0.1 * scaleFactor);
        
        // Apply non-uniform scaling based on stress
        this.properties.mesh.scale.copy(this.originalScale).multiplyScalar(this.deformationFactor);
    }

    public resetDeformation(): void {
        this.properties.mesh.scale.copy(this.originalScale);
        this.properties.mesh.position.copy(this.originalPosition);
        this.deformationFactor = 1.0;
    }

    public reset(): void {
        this.resetDeformation();
        this.properties.stress = 0.0;
        this.properties.failed = false;
        
        // Reset color
        if (Array.isArray(this.properties.mesh.material)) {
            this.properties.mesh.material.forEach(m => (m as THREE.MeshStandardMaterial).emissive.setHex(0x000000));
        } else {
            (this.properties.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        }
    }

    public getVonMisesColor(): THREE.Color {
        // Von Mises stress color mapping
        // 0.0 → Green (safe)
        // 0.5 → Yellow (moderate)
        // 0.8 → Orange (high)
        // 1.0+ → Red (failure)

        const stress = this.properties.stress;

        if (stress < 0.3) {
            // Green to light green
            return new THREE.Color().lerpColors(
                new THREE.Color(0x00ff00), // Green
                new THREE.Color(0x88ff00),
                stress / 0.3
            );
        } else if (stress < 0.6) {
            // Light green to yellow
            const t = (stress - 0.3) / 0.3;
            return new THREE.Color().lerpColors(
                new THREE.Color(0x88ff00),
                new THREE.Color(0xffff00), // Yellow
                t
            );
        } else if (stress < 1.0) {
            // Yellow to orange to red
            const t = (stress - 0.6) / 0.4;
            return new THREE.Color().lerpColors(
                new THREE.Color(0xffff00), // Yellow
                new THREE.Color(0xff0000), // Red
                t
            );
        } else {
            // Failure - bright red
            return new THREE.Color(0xff0000);
        }
    }

    public getMaterialInfo(): string {
        return `${this.properties.material.type} | ${this.properties.mass.toFixed(2)}kg | ${this.properties.boundaryCondition}`;
    }
}
