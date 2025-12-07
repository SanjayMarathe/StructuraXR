import * as THREE from 'three';

export class VariantPreviewRenderer {
    private renderer: THREE.WebGLRenderer;
    private canvasCache: Map<number, string> = new Map();

    constructor() {
        // Create offscreen renderer for thumbnails
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            preserveDrawingBuffer: true 
        });
        this.renderer.setSize(200, 150);
        this.renderer.setClearColor(0x0a0a0a, 0);
    }

    public renderVariantPreview(buildInstructions: any[], variantId: number): string {
        // Check cache
        if (this.canvasCache.has(variantId)) {
            return this.canvasCache.get(variantId)!;
        }

        // Create mini scene
        const scene = new THREE.Scene();
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);

        // Add blocks from build instructions
        buildInstructions.forEach((instruction: any) => {
            const geometry = new THREE.BoxGeometry(...instruction.size);
            const material = new THREE.MeshStandardMaterial({ 
                color: this.getBlockColor(instruction.type),
                metalness: 0.3,
                roughness: 0.7
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(...instruction.pos);
            scene.add(mesh);
        });

        // Calculate bounding box to frame all blocks
        const boundingBox = new THREE.Box3();
        scene.children.forEach((child) => {
            if (child instanceof THREE.Mesh) {
                boundingBox.expandByObject(child);
            }
        });

        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        boundingBox.getCenter(center);
        boundingBox.getSize(size);

        // Position camera to fit all blocks
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = 50;
        const cameraDistance = maxDim / (2 * Math.tan((fov * Math.PI) / 360)) * 1.5;

        const camera = new THREE.PerspectiveCamera(fov, 200 / 150, 0.1, 1000);
        camera.position.set(
            center.x + cameraDistance * 0.7,
            center.y + cameraDistance * 0.7,
            center.z + cameraDistance * 0.7
        );
        camera.lookAt(center);

        // Render
        this.renderer.render(scene, camera);

        // Convert to base64
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        // Cache it
        this.canvasCache.set(variantId, dataURL);

        return dataURL;
    }

    private getBlockColor(type: string): number {
        const colors: { [key: string]: number } = {
            'concrete': 0x9e9e9e,
            'steel': 0x607d8b,
            'wood': 0x8d6e63,
            'glass': 0x81d4fa,
            'box': 0xaaaaaa,
            'default': 0xcccccc
        };
        return colors[type] || colors['default'];
    }

    public clearCache(): void {
        this.canvasCache.clear();
    }
}
