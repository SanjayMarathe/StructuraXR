import * as THREE from 'three';

export interface StructureVariant {
    id: number;
    description: string;
    preview: string; // Base64 image or simple description
    buildInstructions: any; // The actual structure data
}

export class VariantPreviewSystem {
    private container: HTMLElement;
    private variants: StructureVariant[] = [];
    private onSelectCallback: ((variant: StructureVariant) => void) | null = null;
    private xrUIManager: any = null; // Reference to XRUIManager for XR mode

    constructor() {
        this.container = this.createPreviewContainer();
        document.body.appendChild(this.container);
    }

    public setXRUIManager(xrUIManager: any): void {
        this.xrUIManager = xrUIManager;
    }

    private createPreviewContainer(): HTMLElement {
        const container = document.createElement('div');
        container.id = 'variantPreviewContainer';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(20px);
            border: 2px solid rgba(0, 255, 136, 0.3);
            border-radius: 20px;
            padding: 30px;
            z-index: 10000;
            display: none;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            pointer-events: auto;
        `;
        return container;
    }

    public showVariants(variants: StructureVariant[], onSelect: (variant: StructureVariant) => void): void {
        this.variants = variants;
        this.onSelectCallback = onSelect;
        
        this.container.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #00ff88; font-family: 'Outfit', sans-serif; font-size: 1.8rem; margin: 0 0 10px 0;">
                    Choose Your Structure
                </h2>
                <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">
                    Select one of these AI-generated variants
                </p>
            </div>
            <div id="variantGrid" style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-top: 20px;
            "></div>
            <div style="text-align: center; margin-top: 25px;">
                <button id="cancelVariants" style="
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 12px 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: 'Outfit', sans-serif;
                    font-size: 1rem;
                    transition: all 0.3s;
                ">
                    Cancel
                </button>
            </div>
        `;

        const grid = this.container.querySelector('#variantGrid') as HTMLElement;
        
        variants.forEach((variant, index) => {
            const card = this.createVariantCard(variant, index);
            grid.appendChild(card);
        });

        // Cancel button
        const cancelBtn = this.container.querySelector('#cancelVariants') as HTMLButtonElement;
        cancelBtn.addEventListener('click', () => this.hide());
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.15)';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        });

        // If in XR mode, create floating 3D panel (don't show HTML version)
        if (this.xrUIManager && this.xrUIManager.isInXR()) {
            console.log('🎮 XR Mode: Creating 3D variant selection panel');
            // Hide HTML container in XR (will show as 3D panel)
            this.container.style.display = 'none';
            
            // Wait for DOM to update, then create 3D panel
            setTimeout(() => {
                // Re-show container temporarily so it can be cloned
                this.container.style.display = 'block';
                console.log('📦 Cloning variant container for 3D panel...');
                this.xrUIManager.createVariantSelectionPanel(this.container);
                // Hide HTML version after cloning
                this.container.style.display = 'none';
                console.log('✅ Variant selection panel should now be visible in XR');
            }, 100); // Increased timeout to ensure DOM is ready
        } else {
            // Desktop mode - show HTML container
            console.log('💻 Desktop Mode: Showing HTML variant selection');
            this.container.style.display = 'block';
            this.container.style.zIndex = '10000';
        }
    }

    private createVariantCard(variant: StructureVariant, index: number): HTMLElement {
        const card = document.createElement('div');
        card.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(0, 255, 136, 0.2);
            border-radius: 12px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        `;

        // Use actual preview image if available, otherwise show loading or emoji
        const previewContent = variant.preview 
            ? `<img src="${variant.preview}" style="width: 100%; height: 150px; border-radius: 8px; object-fit: cover; margin-bottom: 15px;" />`
            : `<div style="
                width: 100%;
                height: 150px;
                background: linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 204, 255, 0.1));
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 15px;
                font-size: 3rem;
                color: rgba(255, 255, 255, 0.3);
            ">
                🏗️
            </div>`;

        card.innerHTML = `
            ${previewContent}
            <h3 style="
                color: #00ff88;
                font-family: 'Outfit', sans-serif;
                font-size: 1.1rem;
                margin: 0 0 8px 0;
            ">
                Variant ${index + 1}
            </h3>
            <p style="
                color: rgba(255, 255, 255, 0.6);
                font-size: 0.85rem;
                line-height: 1.4;
                margin: 0;
            ">
                ${variant.description}
            </p>
        `;

        // Hover effects
        card.addEventListener('mouseenter', () => {
            card.style.background = 'rgba(0, 255, 136, 0.1)';
            card.style.borderColor = 'rgba(0, 255, 136, 0.6)';
            card.style.transform = 'translateY(-5px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.background = 'rgba(255, 255, 255, 0.05)';
            card.style.borderColor = 'rgba(0, 255, 136, 0.2)';
            card.style.transform = 'translateY(0)';
        });

        // Click to select
        card.addEventListener('click', () => {
            if (this.onSelectCallback) {
                this.onSelectCallback(variant);
                this.hide();
            }
        });

        return card;
    }

    public hide(): void {
        this.container.style.display = 'none';
        
        // Remove XR floating panel if it exists
        if (this.xrUIManager) {
            this.xrUIManager.removeVariantSelectionPanel();
        }
    }

    public isVisible(): boolean {
        return this.container.style.display !== 'none';
    }
}
