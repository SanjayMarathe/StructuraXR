export class DragDropUploader {
    private dropZone: HTMLElement;
    private onFileUpload: (file: File) => void;

    constructor(dropZone: HTMLElement, onFileUpload: (file: File) => void) {
        this.dropZone = dropZone;
        this.onFileUpload = onFileUpload;
        this.setupEventListeners();
        this.styleDropZone();
    }

    private setupEventListeners(): void {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop zone when item is dragged over
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.highlight(true), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.highlight(false), false);
        });

        // Handle dropped files
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this), false);
    }

    private preventDefaults(e: Event): void {
        e.preventDefault();
        e.stopPropagation();
    }

    private highlight(active: boolean): void {
        if (active) {
            this.dropZone.classList.add('drag-active');
            this.dropZone.style.borderColor = '#00ff88';
            this.dropZone.style.backgroundColor = 'rgba(0, 255, 136, 0.1)';
        } else {
            this.dropZone.classList.remove('drag-active');
            this.dropZone.style.borderColor = '#666';
            this.dropZone.style.backgroundColor = 'transparent';
        }
    }

    private handleDrop(e: DragEvent): void {
        const dt = e.dataTransfer;
        const files = dt?.files;

        if (files && files.length > 0) {
            this.handleFiles(files);
        }
    }

    private handleFiles(files: FileList): void {
        Array.from(files).forEach(file => {
            if (this.isValidFile(file)) {
                console.log('📁 File dropped:', file.name);
                this.onFileUpload(file);
            } else {
                alert(`Invalid file type: ${file.name}. Please upload .gltf, .glb, .stl, or .obj files.`);
            }
        });
    }

    private isValidFile(file: File): boolean {
        const validExtensions = ['.gltf', '.glb', '.stl', '.obj'];
        return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    }

    private styleDropZone(): void {
        this.dropZone.style.border = '2px dashed #666';
        this.dropZone.style.borderRadius = '8px';
        this.dropZone.style.padding = '20px';
        this.dropZone.style.textAlign = 'center';
        this.dropZone.style.transition = 'all 0.3s ease';
        this.dropZone.style.cursor = 'pointer';
        this.dropZone.innerHTML = `
            <div style="pointer-events: none;">
                <div style="font-size: 3rem; margin-bottom: 10px;">📁</div>
                <div style="font-size: 1rem; color: #ccc;">Drag & Drop CAD Files Here</div>
                <div style="font-size: 0.8rem; color: #888; margin-top: 5px;">or click to browse</div>
                <div style="font-size: 0.7rem; color: #666; margin-top: 10px;">Supported: .gltf, .glb, .stl, .obj</div>
            </div>
        `;
    }
}
