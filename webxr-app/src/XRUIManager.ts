import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

export class XRUIManager {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private renderer: THREE.WebGLRenderer;
    private cssRenderer: CSS3DRenderer;
    private isXRActive: boolean = false;
    private uiPanels: Map<string, CSS3DObject> = new Map();
    private panelGroups: Map<string, THREE.Group> = new Map();

    constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        // Create CSS3D renderer for HTML panels
        this.cssRenderer = new CSS3DRenderer();
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
        this.cssRenderer.domElement.style.position = 'absolute';
        this.cssRenderer.domElement.style.top = '0';
        this.cssRenderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(this.cssRenderer.domElement);

        this.setupXRListeners();
    }

    private setupXRListeners(): void {
        this.renderer.xr.addEventListener('sessionstart', () => {
            this.isXRActive = true;
            this.hideHTMLUI();
            this.createFloatingPanels();
            this.enablePassthrough();
        });

        this.renderer.xr.addEventListener('sessionend', () => {
            this.isXRActive = false;
            this.showHTMLUI();
            this.removeFloatingPanels();
        });
    }

    private enablePassthrough(): void {
        const session = this.renderer.xr.getSession();
        if (!session) return;

        // Set scene background to transparent for passthrough
        this.scene.background = null;
        this.scene.fog = null;
        
        // Enable transparent rendering
        this.renderer.setClearColor(0x000000, 0);

        // Request passthrough reference space (Meta Quest supports this)
        session.requestReferenceSpace('local-floor').then((refSpace) => {
            console.log('✅ XR session started with local-floor reference space');
            
            // Check for passthrough features
            if ('enabledFeatures' in session) {
                const features = session.enabledFeatures as string[];
                console.log('📋 Available XR features:', features);
                
                // Meta Quest passthrough is typically available through the session
                // The browser handles passthrough automatically when background is transparent
            }
        }).catch((err) => {
            console.warn('⚠️ Could not request reference space:', err);
        });

        // Try to enable passthrough mode if the API supports it
        // Meta Quest browsers handle passthrough when:
        // 1. Scene background is transparent
        // 2. WebXR session is active
        // 3. Device supports passthrough (Quest 2/3/Pro)
        console.log('🌐 Passthrough enabled - structures will appear in real world');
    }

    private hideHTMLUI(): void {
        // Hide all HTML UI elements (but keep variant preview accessible)
        const uiElements = document.querySelectorAll('#ui, .glass-panel, #vector-notification');
        uiElements.forEach((el) => {
            // Don't hide variant preview container - it needs to be visible for XR
            if (el.id !== 'variantPreviewContainer') {
                (el as HTMLElement).style.display = 'none';
            }
        });
    }

    private showHTMLUI(): void {
        // Show HTML UI elements when exiting XR
        const ui = document.getElementById('ui');
        if (ui) {
            ui.style.display = 'block';
        }
    }

    private createFloatingPanels(): void {
        // Create left panel (main controls)
        this.createPanel('left', '#ui', new THREE.Vector3(-1.5, 1.6, -1.5), new THREE.Euler(0, Math.PI / 4, 0));
        
        // Create right panel (analysis panel) - will be shown when needed
        const analysisPanel = document.getElementById('analysis-panel');
        if (analysisPanel) {
            this.createPanel('right', '#analysis-panel', new THREE.Vector3(1.5, 1.6, -1.5), new THREE.Euler(0, -Math.PI / 4, 0));
        }
        
        // Create comprehensive analysis panel - will be shown when needed
        const comprehensivePanel = document.getElementById('comprehensive-analysis-panel');
        if (comprehensivePanel) {
            this.createPanel('comprehensive', '#comprehensive-analysis-panel', new THREE.Vector3(1.5, 1.6, -1.5), new THREE.Euler(0, -Math.PI / 4, 0));
        }
        
        // Create controls reference panel (always visible in XR, positioned to the right)
        const controlsPanel = document.getElementById('xr-controls-panel');
        if (controlsPanel) {
            // Position it to the right of the analysis panel
            this.createPanel('controls', '#xr-controls-panel', new THREE.Vector3(2.8, 1.6, -1.5), new THREE.Euler(0, -Math.PI / 4, 0));
        }
    }

    private createPanel(id: string, htmlElementId: string, position: THREE.Vector3, rotation: THREE.Euler): void {
        const htmlElement = document.getElementById(htmlElementId.replace('#', ''));
        if (!htmlElement) {
            console.warn(`⚠️ Could not find element: ${htmlElementId}`);
            return;
        }

        // Clone the element for 3D rendering
        const clone = htmlElement.cloneNode(true) as HTMLElement;
        clone.style.display = 'block';
        clone.style.width = '400px';
        clone.style.maxWidth = '400px';
        clone.style.pointerEvents = 'auto';
        clone.style.backgroundColor = 'rgba(10, 10, 10, 0.95)'; // Ensure background is visible
        
        // Create CSS3D object
        const cssObject = new CSS3DObject(clone);
        cssObject.scale.set(0.001, 0.001, 0.001); // Scale down HTML to VR size (1px = 1mm)

        // Create group for positioning and make it face the user
        const group = new THREE.Group();
        group.add(cssObject);
        group.position.copy(position);
        group.rotation.copy(rotation);

        this.scene.add(group);
        this.uiPanels.set(id, cssObject);
        this.panelGroups.set(id, group);

        // Initially hide right panel (analysis panel) and comprehensive panel
        if (id === 'right' || id === 'comprehensive') {
            group.visible = false;
        }
        
        // Controls panel is always visible in XR
        if (id === 'controls') {
            group.visible = true;
        }

        console.log(`✅ Created floating panel: ${id} at position`, position);
    }

    private removeFloatingPanels(): void {
        this.panelGroups.forEach((group) => {
            this.scene.remove(group);
        });
        this.uiPanels.clear();
        this.panelGroups.clear();
    }

    public update(): void {
        if (this.isXRActive && this.cssRenderer) {
            // Update CSS3D renderer
            this.cssRenderer.render(this.scene, this.camera);
        }
    }

    public resize(width: number, height: number): void {
        this.cssRenderer.setSize(width, height);
    }

    public showPanel(id: string): void {
        const group = this.panelGroups.get(id);
        if (group) {
            group.visible = true;
        }
    }

    public hidePanel(id: string): void {
        const group = this.panelGroups.get(id);
        if (group) {
            group.visible = false;
        }
    }

    public createVariantSelectionPanel(htmlElement: HTMLElement): void {
        // Remove existing variant panel if any
        const existingGroup = this.panelGroups.get('variants');
        if (existingGroup) {
            this.scene.remove(existingGroup);
            this.panelGroups.delete('variants');
            this.uiPanels.delete('variants');
        }

        // Clone the element for 3D rendering
        const clone = htmlElement.cloneNode(true) as HTMLElement;
        clone.style.display = 'block';
        clone.style.width = '800px'; // Larger for better visibility in VR
        clone.style.maxWidth = '800px';
        clone.style.maxHeight = '600px';
        clone.style.overflowY = 'auto';
        clone.style.pointerEvents = 'auto';
        clone.style.backgroundColor = 'rgba(10, 10, 10, 0.95)';
        clone.style.zIndex = '10000';
        
        // Ensure all interactive elements are clickable
        const buttons = clone.querySelectorAll('button, div[style*="cursor: pointer"]');
        buttons.forEach(btn => {
            (btn as HTMLElement).style.pointerEvents = 'auto';
        });
        
        // Create CSS3D object
        const cssObject = new CSS3DObject(clone);
        cssObject.scale.set(0.001, 0.001, 0.001);

        // Create group for positioning - center it in front of user
        const group = new THREE.Group();
        group.add(cssObject);
        group.position.set(0, 1.6, -1.2); // Closer to user for better visibility
        group.rotation.set(0, 0, 0); // Face forward

        this.scene.add(group);
        this.uiPanels.set('variants', cssObject);
        this.panelGroups.set('variants', group);
        
        // Make sure it's visible
        group.visible = true;
        
        // Force update CSS3D renderer
        if (this.cssRenderer) {
            this.cssRenderer.render(this.scene, this.camera);
        }
        
        console.log('✅ Created variant selection panel in XR');
        console.log('   Position:', group.position);
        console.log('   Visible:', group.visible);
        console.log('   Panel size: 800px x 600px');
        console.log('   Variants count:', htmlElement.querySelectorAll('#variantGrid > div').length);
    }

    public removeVariantSelectionPanel(): void {
        const group = this.panelGroups.get('variants');
        if (group) {
            this.scene.remove(group);
            this.panelGroups.delete('variants');
            this.uiPanels.delete('variants');
        }
    }

    public isInXR(): boolean {
        return this.isXRActive;
    }

    public exitXR(): void {
        const session = this.renderer.xr.getSession();
        if (session) {
            session.end();
            console.log('✅ Exiting XR mode - returning to 2D screen');
        }
    }
}

