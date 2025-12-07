import * as THREE from 'three';
import { ForceVectorManager } from './ForceVector';
import { StructureManager } from './Structure';

enum VectorPlacementState {
    IDLE,
    SETTING_START,
    SETTING_END
}

enum BuildModeState {
    INACTIVE,
    ACTIVE
}

export type BlockType = 'cube' | 'rectangular_prism' | 'horizontal_rectangular_prism' | 'pyramid' | 'cylinder';

export class XRControllerManager {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private controllers: THREE.XRTargetRaySpace[] = [];
    private forceVectorManager: ForceVectorManager;
    private structureManager: StructureManager;
    private camera: THREE.Camera;
    
    // Vector placement state
    private placementState: VectorPlacementState = VectorPlacementState.IDLE;
    private vectorPlacementController: THREE.XRTargetRaySpace | null = null;
    private startPosition: THREE.Vector3 | null = null;
    private endPosition: THREE.Vector3 | null = null;
    private currentDepth: number = 2.0; // Default depth from camera (meters)
    
    // Build mode state
    private buildModeState: BuildModeState = BuildModeState.INACTIVE;
    private selectedBlockType: BlockType = 'cube';
    private buildModeController: THREE.XRTargetRaySpace | null = null;
    private previewBlock: THREE.Mesh | null = null;
    private blockTypes: BlockType[] = ['cube', 'rectangular_prism', 'horizontal_rectangular_prism', 'pyramid', 'cylinder'];
    private currentBlockTypeIndex: number = 0;
    
    // Visual indicators
    private startPointIndicator: THREE.Mesh | null = null;
    private endPointIndicator: THREE.Mesh | null = null;
    private tempArrow: THREE.ArrowHelper | null = null;
    private depthIndicator: THREE.Mesh | null = null;
    
    // Raycaster for block detection
    private raycaster: THREE.Raycaster = new THREE.Raycaster();

    private xrUIManager: any; // XRUIManager reference for exiting XR

    constructor(
        renderer: THREE.WebGLRenderer,
        scene: THREE.Scene,
        forceVectorManager: ForceVectorManager,
        structureManager: StructureManager,
        camera: THREE.Camera,
        xrUIManager?: any
    ) {
        this.renderer = renderer;
        this.scene = scene;
        this.forceVectorManager = forceVectorManager;
        this.structureManager = structureManager;
        this.camera = camera;
        this.xrUIManager = xrUIManager;
        this.setupControllers();
    }

    private setupControllers(): void {
        // Setup left controller (index 0)
        const controller0 = this.renderer.xr.getController(0);
        this.setupController(controller0, 0);
        this.scene.add(controller0);
        this.controllers.push(controller0);

        // Setup right controller (index 1)
        const controller1 = this.renderer.xr.getController(1);
        this.setupController(controller1, 1);
        this.scene.add(controller1);
        this.controllers.push(controller1);
    }

    private setupController(controller: THREE.XRTargetRaySpace, index: number): void {
        // Visual ray
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        const line = new THREE.Line(geometry);
        line.name = 'line';
        line.scale.z = 5;
        controller.add(line);

        // Store gamepad index for later use
        controller.userData.gamepadIndex = index;

        // Button mappings:
        // Primary button (trigger) - Place/confirm vector
        // Grip button - Start vector placement mode (hold)
        // Thumbstick - Adjust vector magnitude
        // A/X button - Increase magnitude
        // B/Y button - Decrease magnitude

        controller.addEventListener('selectstart', () => this.onTriggerPress(controller, index));
        controller.addEventListener('squeezestart', () => this.onGripPress(controller, index));
    }

    private onTriggerPress(controller: THREE.XRTargetRaySpace, index: number): void {
        // First check if we're clicking on a UI panel
        if (this.checkUIClick(controller)) {
            return; // UI was clicked, don't place vector
        }

        switch (this.placementState) {
            case VectorPlacementState.IDLE:
                // Start vector placement - set start point
                this.setStartPoint(controller, index);
                break;
            case VectorPlacementState.SETTING_START:
                // Confirm start point, move to setting end point
                this.confirmStartPoint(controller);
                break;
            case VectorPlacementState.SETTING_END:
                // Confirm end point and create vector
                this.confirmEndPoint(controller);
                break;
        }
    }

    private checkUIClick(controller: THREE.XRTargetRaySpace): boolean {
        // CSS3D panels handle their own pointer events
        // The browser will automatically handle clicks on HTML elements in CSS3D
        // So we don't need to manually check here - the UI will work naturally
        // Return false to allow vector placement if not clicking UI
        return false;
    }

    private onGripPress(controller: THREE.XRTargetRaySpace, index: number): void {
        // Cancel vector placement if in progress
        if (this.placementState !== VectorPlacementState.IDLE) {
            this.cancelVectorPlacement();
        }
    }

    private setStartPoint(controller: THREE.XRTargetRaySpace, index: number): void {
        // Calculate position based on controller ray and depth
        const position = this.getPointedPosition(controller, this.currentDepth);
        
        this.placementState = VectorPlacementState.SETTING_START;
        this.vectorPlacementController = controller;
        this.startPosition = position;
        this.currentDepth = 2.0; // Reset depth

        // Show notification
        this.updateVectorNotification('Point at START position, adjust depth, then press trigger');

        // Create visual indicator for start point
        this.createStartPointIndicator(position);

        console.log('🎯 VR: Setting start point at', position);
    }

    private confirmStartPoint(controller: THREE.XRTargetRaySpace): void {
        if (!this.startPosition) return;

        // Lock in start point and move to end point selection
        this.placementState = VectorPlacementState.SETTING_END;
        this.endPosition = this.getPointedPosition(controller, this.currentDepth);

        // Update notification
        this.updateVectorNotification('Point at END position, adjust depth, then press trigger');

        // Create visual indicator for end point
        this.createEndPointIndicator(this.endPosition);

        // Create temporary arrow from start to end
        this.updateTemporaryArrow();

        console.log('✅ VR: Start point confirmed, setting end point');
    }

    private confirmEndPoint(controller: THREE.XRTargetRaySpace): void {
        if (!this.startPosition) return;

        // Lock in end point
        this.endPosition = this.getPointedPosition(controller, this.currentDepth);

        // Calculate vector direction and magnitude
        const direction = new THREE.Vector3().subVectors(this.endPosition, this.startPosition);
        const magnitude = direction.length();
        direction.normalize();

        // Create the vector
        this.createVectorAtPosition(this.startPosition, direction, magnitude);

        // Clean up
        this.resetPlacementState();

        console.log('✅ VR: Vector created from', this.startPosition, 'to', this.endPosition);
    }

    private getPointedPosition(controller: THREE.XRTargetRaySpace, depth: number): THREE.Vector3 {
        // Get controller position and direction
        const controllerPos = new THREE.Vector3();
        controllerPos.setFromMatrixPosition(controller.matrixWorld);
        
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);

        // Calculate position at specified depth along the ray
        const position = controllerPos.clone().add(direction.multiplyScalar(depth));
        
        return position;
    }

    private resetPlacementState(): void {
        this.placementState = VectorPlacementState.IDLE;
        this.vectorPlacementController = null;
        this.startPosition = null;
        this.endPosition = null;
        this.currentDepth = 2.0;

        // Remove visual indicators
        this.removeStartPointIndicator();
        this.removeEndPointIndicator();
        this.removeTemporaryArrow();
        this.removeDepthIndicator();

        this.hideVectorNotification();
    }

    private cancelVectorPlacement(): void {
        this.resetPlacementState();
        console.log('❌ VR: Vector placement cancelled');
    }

    private createVectorAtPosition(position: THREE.Vector3, direction: THREE.Vector3, magnitude: number): void {
        // Use the new public method from ForceVectorManager
        this.forceVectorManager.createVectorFromVR(position, direction, magnitude);
    }

    private updateVectorNotification(message: string): void {
        const notification = document.getElementById('vector-notification');
        if (notification) {
            notification.textContent = message;
            notification.classList.add('show');
        }
    }

    private showVectorNotification(): void {
        const notification = document.getElementById('vector-notification');
        if (notification) {
            notification.classList.add('show');
        }
    }

    private hideVectorNotification(): void {
        const notification = document.getElementById('vector-notification');
        if (notification) {
            notification.classList.remove('show');
        }
    }

    private createStartPointIndicator(position: THREE.Vector3): void {
        this.removeStartPointIndicator();

        // Create a sphere to mark the start point
        const geometry = new THREE.SphereGeometry(0.05, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00, // Green for start
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });
        this.startPointIndicator = new THREE.Mesh(geometry, material);
        this.startPointIndicator.position.copy(position);
        this.scene.add(this.startPointIndicator);
    }

    private removeStartPointIndicator(): void {
        if (this.startPointIndicator) {
            this.scene.remove(this.startPointIndicator);
            this.startPointIndicator = null;
        }
    }

    private createEndPointIndicator(position: THREE.Vector3): void {
        this.removeEndPointIndicator();

        // Create a sphere to mark the end point
        const geometry = new THREE.SphereGeometry(0.05, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff0000, // Red for end
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        this.endPointIndicator = new THREE.Mesh(geometry, material);
        this.endPointIndicator.position.copy(position);
        this.scene.add(this.endPointIndicator);
    }

    private removeEndPointIndicator(): void {
        if (this.endPointIndicator) {
            this.scene.remove(this.endPointIndicator);
            this.endPointIndicator = null;
        }
    }

    private updateTemporaryArrow(): void {
        if (!this.startPosition || !this.endPosition) return;

        this.removeTemporaryArrow();

        const direction = new THREE.Vector3().subVectors(this.endPosition, this.startPosition);
        const magnitude = direction.length();
        direction.normalize();

        // Create temporary arrow from start to end
        const color = 0xff6666; // Lighter red for temporary
        this.tempArrow = new THREE.ArrowHelper(
            direction,
            this.startPosition,
            magnitude,
            color,
            0.3,
            0.2
        );
        this.scene.add(this.tempArrow);
    }

    private removeTemporaryArrow(): void {
        if (this.tempArrow) {
            this.scene.remove(this.tempArrow);
            this.tempArrow = null;
        }
    }

    private createDepthIndicator(controller: THREE.XRTargetRaySpace, depth: number): void {
        this.removeDepthIndicator();

        // Get position at current depth
        const position = this.getPointedPosition(controller, depth);

        // Create a ring to show depth
        const geometry = new THREE.RingGeometry(0.08, 0.12, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ccff, // Cyan for depth indicator
            emissive: 0x00ccff,
            emissiveIntensity: 0.3,
            side: THREE.DoubleSide
        });
        this.depthIndicator = new THREE.Mesh(geometry, material);
        this.depthIndicator.position.copy(position);
        
        // Orient ring to face camera (or controller if in XR)
        if (this.renderer.xr.isPresenting) {
            // In XR mode, face the controller
            const controllerPos = new THREE.Vector3();
            controllerPos.setFromMatrixPosition(controller.matrixWorld);
            this.depthIndicator.lookAt(controllerPos);
        } else {
            // In desktop mode, face camera
            const cameraPos = new THREE.Vector3();
            this.camera.getWorldPosition(cameraPos);
            this.depthIndicator.lookAt(cameraPos);
        }
        
        this.scene.add(this.depthIndicator);
    }

    private removeDepthIndicator(): void {
        if (this.depthIndicator) {
            this.scene.remove(this.depthIndicator);
            this.depthIndicator = null;
        }
    }

    public update(): void {
        // Check for button presses on controllers
        this.controllers.forEach((controller, index) => {
            const gamepad = navigator.getGamepads()[controller.userData.gamepadIndex];
            if (!gamepad) return;

            // X button (button 2 on left controller, button 3 on right controller)
            const xButtonIndex = index === 0 ? 2 : 3;
            if (gamepad.buttons[xButtonIndex]?.pressed) {
                if (!controller.userData.xButtonPressed) {
                    controller.userData.xButtonPressed = true;
                    this.handleDeleteBlock(controller);
                }
            } else {
                controller.userData.xButtonPressed = false;
            }

            // Y button (button 3 on left controller, button 4 on right controller)
            const yButtonIndex = index === 0 ? 3 : 4;
            if (gamepad.buttons[yButtonIndex]?.pressed) {
                if (!controller.userData.yButtonPressed) {
                    controller.userData.yButtonPressed = true;
                    this.toggleBuildMode(controller);
                }
            } else {
                controller.userData.yButtonPressed = false;
            }
        });

        // Check for Meta/Menu button on right controller (index 1) to exit XR
        if (this.controllers.length > 1 && this.xrUIManager) {
            const rightController = this.controllers[1];
            const gamepad = navigator.getGamepads()[rightController.userData.gamepadIndex];
            
            if (gamepad) {
                // Meta/Menu button is typically button index 3 or 4 on Quest controllers
                // Check both common positions
                if (gamepad.buttons[3]?.pressed || gamepad.buttons[4]?.pressed) {
                    console.log('🖥️ Meta button pressed - exiting XR to show 2D screen');
                    this.xrUIManager.exitXR();
                }
            }
        }

        if (this.placementState !== VectorPlacementState.IDLE && this.vectorPlacementController) {
            const gamepad = navigator.getGamepads()[this.vectorPlacementController.userData.gamepadIndex];
            
            if (gamepad) {
                // Use thumbstick Y axis (forward/back) to adjust depth
                const thumbstickY = gamepad.axes[3]; // Right thumbstick Y (forward = negative, back = positive)
                if (Math.abs(thumbstickY) > 0.1) {
                    // Invert so forward (negative) increases depth, back (positive) decreases depth
                    this.currentDepth = Math.max(0.5, Math.min(10.0, this.currentDepth - thumbstickY * 0.2));
                }

                // A button (button 0) - Always increases depth (works in both SETTING_START and SETTING_END)
                if (gamepad.buttons[0]?.pressed) {
                    if (!this.vectorPlacementController.userData.aButtonPressed) {
                        this.vectorPlacementController.userData.aButtonPressed = true;
                        this.currentDepth = Math.min(10.0, this.currentDepth + 0.1);
                        console.log(`⬆️ Depth increased to ${this.currentDepth.toFixed(2)}m`);
                    }
                } else {
                    this.vectorPlacementController.userData.aButtonPressed = false;
                }
                
                // X button (button 2) - Always decreases depth (works in both SETTING_START and SETTING_END)
                const xButtonIndex = 2;
                if (gamepad.buttons[xButtonIndex]?.pressed) {
                    if (!this.vectorPlacementController.userData.xButtonPressed) {
                        this.vectorPlacementController.userData.xButtonPressed = true;
                        this.currentDepth = Math.max(0.5, this.currentDepth - 0.1);
                        console.log(`⬇️ Depth decreased to ${this.currentDepth.toFixed(2)}m`);
                    }
                } else {
                    this.vectorPlacementController.userData.xButtonPressed = false;
                }
                
                // Additional controls when in SETTING_END state (after start is confirmed)
                if (this.placementState === VectorPlacementState.SETTING_END && this.startPosition && this.endPosition) {
                    // B button (button 1) - Move start position along vector direction
                    if (gamepad.buttons[1]?.pressed) { // B button
                        if (!this.vectorPlacementController.userData.bButtonPressed) {
                            this.vectorPlacementController.userData.bButtonPressed = true;
                            
                            // Calculate vector direction
                            const direction = new THREE.Vector3().subVectors(this.endPosition, this.startPosition);
                            direction.normalize();
                            
                            // Move start position along the vector direction
                            const moveAmount = 0.2; // Distance to move
                            this.startPosition.add(direction.multiplyScalar(moveAmount));
                            
                            // Update start point indicator
                            if (this.startPointIndicator) {
                                this.startPointIndicator.position.copy(this.startPosition);
                            }
                            
                            // Update temporary arrow
                            this.updateTemporaryArrow();
                            
                            console.log(`📍 Start position moved along vector to (${this.startPosition.x.toFixed(2)}, ${this.startPosition.y.toFixed(2)}, ${this.startPosition.z.toFixed(2)})`);
                        }
                    } else {
                        this.vectorPlacementController.userData.bButtonPressed = false;
                    }
                }
            }

            // Update current position based on controller pointing and depth
            const currentPosition = this.getPointedPosition(this.vectorPlacementController, this.currentDepth);

            // Update visual indicators
            if (this.placementState === VectorPlacementState.SETTING_START) {
                // Update start point indicator
                if (this.startPointIndicator) {
                    this.startPointIndicator.position.copy(currentPosition);
                }
                this.startPosition = currentPosition;
                
                // Show depth indicator
                this.createDepthIndicator(this.vectorPlacementController, this.currentDepth);
            } else if (this.placementState === VectorPlacementState.SETTING_END) {
                // Update end point indicator (only if not being adjusted by X button)
                if (this.endPointIndicator && !gamepad?.buttons[2]?.pressed) {
                    this.endPointIndicator.position.copy(currentPosition);
                }
                if (!gamepad?.buttons[2]?.pressed) {
                    this.endPosition = currentPosition;
                }
                
                // Update temporary arrow
                this.updateTemporaryArrow();
                
                // Show depth indicator
                this.createDepthIndicator(this.vectorPlacementController, this.currentDepth);
            }
        }

        // Update build mode preview
        if (this.buildModeState === BuildModeState.ACTIVE && this.buildModeController) {
            const previewPosition = this.getPointedPosition(this.buildModeController, this.currentDepth);
            if (this.previewBlock) {
                this.previewBlock.position.copy(previewPosition);
            } else {
                this.createPreviewBlock(previewPosition);
            }
        }
    }

    private handleDeleteBlock(controller: THREE.XRTargetRaySpace): void {
        // Only delete if not in vector placement or build mode
        if (this.placementState !== VectorPlacementState.IDLE || this.buildModeState === BuildModeState.ACTIVE) {
            return;
        }

        // Raycast to find block
        const controllerPos = new THREE.Vector3();
        controllerPos.setFromMatrixPosition(controller.matrixWorld);
        
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);

        this.raycaster.set(controllerPos, direction);
        
        // Get all block meshes
        const blockMeshes = this.structureManager.blocks.map(b => b.mesh);
        const intersects = this.raycaster.intersectObjects(blockMeshes, false);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object as THREE.Mesh;
            const block = this.structureManager.getBlockByMesh(hitMesh);
            
            if (block) {
                this.structureManager.removeBlock(block.id);
                console.log(`🗑️ Block #${block.id} deleted`);
                
                // Show notification
                this.updateVectorNotification(`🗑️ Block #${block.id} deleted`);
                setTimeout(() => {
                    this.hideVectorNotification();
                }, 1500);
            }
        } else {
            // No block found
            this.updateVectorNotification('❌ No block found - point at a block');
            setTimeout(() => {
                this.hideVectorNotification();
            }, 1500);
        }
    }

    private toggleBuildMode(controller: THREE.XRTargetRaySpace): void {
        // Only toggle if not in vector placement
        if (this.placementState !== VectorPlacementState.IDLE) {
            return;
        }

        if (this.buildModeState === BuildModeState.INACTIVE) {
            // Enter build mode
            this.buildModeState = BuildModeState.ACTIVE;
            this.buildModeController = controller;
            this.currentBlockTypeIndex = 0;
            this.selectedBlockType = this.blockTypes[0];
            this.currentDepth = 2.0;
            
            // Show build mode notification
            this.updateBuildModeNotification();
            console.log('🔨 Build mode activated');
        } else {
            // In build mode - cycle through block types
            this.currentBlockTypeIndex = (this.currentBlockTypeIndex + 1) % this.blockTypes.length;
            
            // If we've cycled back to the first type (after going through all), exit build mode
            if (this.currentBlockTypeIndex === 0) {
                // We've cycled through all types - exit build mode
                this.exitBuildMode();
            } else {
                // Cycle to next block type
                this.selectedBlockType = this.blockTypes[this.currentBlockTypeIndex];
                
                // Update preview
                if (this.buildModeController) {
                    const position = this.getPointedPosition(this.buildModeController, this.currentDepth);
                    this.createPreviewBlock(position);
                }
                
                // Update notification
                this.updateBuildModeNotification();
                console.log(`🔨 Block type: ${this.selectedBlockType}`);
            }
        }
    }

    private updateBuildModeNotification(): void {
        const typeNames: Record<BlockType, string> = {
            'cube': 'Cube',
            'rectangular_prism': 'Rectangular Prism',
            'horizontal_rectangular_prism': 'Horizontal Rectangular Prism',
            'pyramid': 'Pyramid',
            'cylinder': 'Cylinder'
        };
        this.updateVectorNotification(`🔨 Build Mode: ${typeNames[this.selectedBlockType]} - Press Y to cycle, Trigger to place, Y again to exit`);
    }

    private exitBuildMode(): void {
        this.buildModeState = BuildModeState.INACTIVE;
        this.buildModeController = null;
        this.currentBlockTypeIndex = 0;
        this.selectedBlockType = 'cube';
        
        // Remove preview block
        if (this.previewBlock) {
            this.scene.remove(this.previewBlock);
            this.previewBlock = null;
        }
        
        // Hide notification
        this.hideVectorNotification();
        console.log('🔨 Build mode deactivated');
    }

    private createPreviewBlock(position: THREE.Vector3): void {
        // Remove existing preview
        if (this.previewBlock) {
            this.scene.remove(this.previewBlock);
        }

        // Create preview geometry based on selected type
        let geometry: THREE.BufferGeometry;
        let size: THREE.Vector3;

        switch (this.selectedBlockType) {
            case 'cube':
                size = new THREE.Vector3(0.5, 0.5, 0.5);
                geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
                break;
            case 'rectangular_prism':
                size = new THREE.Vector3(0.4, 1.0, 0.4);
                geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
                break;
            case 'horizontal_rectangular_prism':
                size = new THREE.Vector3(1.0, 0.3, 0.5);
                geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
                break;
            case 'pyramid':
                size = new THREE.Vector3(0.5, 0.8, 0.5);
                geometry = new THREE.ConeGeometry(size.x / 2, size.y, 4);
                break;
            case 'cylinder':
                size = new THREE.Vector3(0.3, 0.8, 0.3);
                geometry = new THREE.CylinderGeometry(size.x, size.x, size.y, 32);
                break;
            default:
                size = new THREE.Vector3(0.5, 0.5, 0.5);
                geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        }

        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            opacity: 0.5,
            transparent: true,
            wireframe: false
        });
        
        this.previewBlock = new THREE.Mesh(geometry, material);
        this.previewBlock.position.copy(position);
        this.scene.add(this.previewBlock);
    }

    private placeBlockInBuildMode(controller: THREE.XRTargetRaySpace): void {
        if (this.buildModeState === BuildModeState.INACTIVE) {
            return;
        }

        const position = this.getPointedPosition(controller, this.currentDepth);
        
        // Determine size based on block type
        let size: THREE.Vector3;
        switch (this.selectedBlockType) {
            case 'cube':
                size = new THREE.Vector3(0.5, 0.5, 0.5);
                break;
            case 'rectangular_prism':
                size = new THREE.Vector3(0.4, 1.0, 0.4);
                break;
            case 'horizontal_rectangular_prism':
                size = new THREE.Vector3(1.0, 0.3, 0.5);
                break;
            case 'pyramid':
                size = new THREE.Vector3(0.5, 0.8, 0.5);
                break;
            case 'cylinder':
                size = new THREE.Vector3(0.3, 0.8, 0.3);
                break;
            default:
                size = new THREE.Vector3(0.5, 0.5, 0.5);
        }

        // Add block (convert to cube or cylinder for StructureManager)
        const blockType = (this.selectedBlockType === 'cylinder') ? 'cylinder' : 'cube';
        const block = this.structureManager.addBlock(blockType, position, size);
        
        // Stay in build mode for placing more blocks
        console.log(`✅ Placed ${this.selectedBlockType} at`, position);
        
        // Update preview position
        if (this.previewBlock) {
            this.previewBlock.position.copy(position);
        }
    }

    public setBlockType(type: BlockType): void {
        if (this.buildModeState === BuildModeState.ACTIVE) {
            this.selectedBlockType = type;
            this.currentBlockTypeIndex = this.blockTypes.indexOf(type);
            
            // Update preview
            if (this.buildModeController) {
                const position = this.getPointedPosition(this.buildModeController, this.currentDepth);
                this.createPreviewBlock(position);
            }
            
            this.updateBuildModeNotification();
            console.log(`🔨 Block type selected: ${type}`);
        }
    }

    public getControllers(): THREE.XRTargetRaySpace[] {
        return this.controllers;
    }
}

