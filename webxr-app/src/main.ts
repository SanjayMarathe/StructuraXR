import * as THREE from 'three';
import { XRButton } from 'three/examples/jsm/webxr/XRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { InteractionManager } from './Interaction';
import { StructureManager } from './Structure';
import { AgentManager } from './Agent';
import { ModelLoader } from './ModelLoader';
import { DragDropUploader } from './DragDrop';
import { DesktopSimulation } from './DesktopSim';
import { ForceVectorManager } from './ForceVector';
import { GradientStressVisualizer } from './GradientStress';
import { PixelatedStressVisualizer } from './PixelatedStressVisualizer';
import { FEASimulationEngine } from './FEAEngine';
import { MaterialType, BoundaryCondition } from './MaterialSystem';
import { VariantPreviewSystem, type StructureVariant } from './VariantPreview';
import { VariantPreviewRenderer } from './VariantRenderer';
import { StructureValidityAgent } from './ValidityAgent';
import { XRUIManager } from './XRUIManager';
import { XRControllerManager } from './XRControllerManager';

// 1. Setup Scene
const scene = new THREE.Scene();
// Background will be transparent in XR mode for passthrough
scene.background = new THREE.Color(0x202020);
scene.fog = new THREE.Fog(0x202020, 10, 50);

// Grid
const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
scene.add(gridHelper);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 3);

// Renderer with alpha channel for passthrough
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true // Enable alpha channel for passthrough transparency
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
// Background will be transparent in XR mode (set by XRUIManager)
renderer.setClearColor(0x202020, 1);
document.body.appendChild(renderer.domElement);

// VR Button - Meta Quest will enable passthrough automatically when background is transparent
const xrButton = XRButton.createButton(renderer);
document.body.appendChild(xrButton);

// Controllers & Hands (Visuals)
const controllerModelFactory = new XRControllerModelFactory();
const handModelFactory = new XRHandModelFactory();

// Grip 0 (Left)
const controllerGrip0 = renderer.xr.getControllerGrip(0);
controllerGrip0.add(controllerModelFactory.createControllerModel(controllerGrip0));
scene.add(controllerGrip0);

// Hand 0 (Left)
const hand0 = renderer.xr.getHand(0);
hand0.add(handModelFactory.createHandModel(hand0));
scene.add(hand0);

// Grip 1 (Right)
const controllerGrip1 = renderer.xr.getControllerGrip(1);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip1);

// Hand 1 (Right)
const hand1 = renderer.xr.getHand(1);
hand1.add(handModelFactory.createHandModel(hand1));
scene.add(hand1);

// Managers
const structureManager = new StructureManager(scene);
const interactionManager = new InteractionManager(renderer, scene);

// Detect backend URL - use localhost if port forwarding, otherwise use current host
function getBackendUrl(): string {
    // If we're on localhost (Quest with port forwarding), use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }
    
    // Otherwise, use the same hostname as the frontend
    // This works when accessing via IP address (e.g., http://10.0.0.7:5173)
    const hostname = window.location.hostname;
    const port = '3001';
    return `http://${hostname}:${port}`;
}

const backendUrl = getBackendUrl();
console.log(`🔗 Backend URL: ${backendUrl}`);
const agentManager = new AgentManager(backendUrl);
const modelLoader = new ModelLoader(scene);

// Initialize Desktop Controls (always available for non-VR mode)
const desktopSim = new DesktopSimulation(camera, renderer, scene);
console.log('💻 Desktop Controls Enabled:');
console.log(desktopSim.showHelp());

// Initialize Force Vector and Gradient Stress Systems
const forceVectorManager = new ForceVectorManager(scene, camera, renderer);
const gradientStress = new GradientStressVisualizer(scene);
const pixelatedStressVisualizer = new PixelatedStressVisualizer();
console.log('🎯 Force Vector System: Press F to place force vector');

// Initialize FEA Simulation Engine
const feaEngine = new FEASimulationEngine();
console.log('🔬 FEA Simulation Engine initialized');

// Initialize Variant Preview System
const variantPreview = new VariantPreviewSystem();
const variantRenderer = new VariantPreviewRenderer();
const validityAgent = new StructureValidityAgent();

// Initialize XR UI Manager for floating panels and passthrough
const xrUIManager = new XRUIManager(scene, camera, renderer);
console.log('🎮 XR UI Manager initialized - Floating panels will appear in VR');

// Connect variant preview to XR UI Manager
variantPreview.setXRUIManager(xrUIManager);
console.log('🎨 Variant Preview System initialized');

// Initialize XR Controller Manager for VR controls
const xrControllerManager = new XRControllerManager(renderer, scene, forceVectorManager, structureManager, camera, xrUIManager);
console.log('🎮 XR Controller Manager initialized - Controllers can create vectors, delete blocks, and build structures');

// Setup FEA UI Controls
let selectedMesh: THREE.Mesh | null = null;

// Material selector
const materialSelect = document.getElementById('materialSelect') as HTMLSelectElement;
const boundarySelect = document.getElementById('boundarySelect') as HTMLSelectElement;
const deformScaleInput = document.getElementById('deformScale') as HTMLInputElement;
const deformValueSpan = document.getElementById('deformValue') as HTMLSpanElement;

if (materialSelect && boundarySelect && deformScaleInput && deformValueSpan) {
    // Material change handler
    materialSelect.addEventListener('change', () => {
        if (selectedMesh) {
            const materialType = materialSelect.value as MaterialType;
            const boundary = boundarySelect.value as BoundaryCondition;
            
            // Re-add block with new material
            feaEngine.removeBlock(selectedMesh);
            feaEngine.addBlock(selectedMesh, materialType, boundary);
            
            console.log(`✅ Material changed to ${materialType} for selected block`);
        } else {
            console.warn('⚠️ No block selected. Click a block first.');
        }
    });

    // Boundary condition change handler
    boundarySelect.addEventListener('change', () => {
        if (selectedMesh) {
            const materialType = materialSelect.value as MaterialType;
            const boundary = boundarySelect.value as BoundaryCondition;
            
            // Re-add block with new boundary
            feaEngine.removeBlock(selectedMesh);
            feaEngine.addBlock(selectedMesh, materialType, boundary);
            
            console.log(`✅ Boundary changed to ${boundary} for selected block`);
        } else {
            console.warn('⚠️ No block selected. Click a block first.');
        }
    });

    // Deformation scale slider
    deformScaleInput.addEventListener('input', () => {
        const scale = parseFloat(deformScaleInput.value);
        feaEngine.setDeformationScale(scale);
        deformValueSpan.textContent = `${scale}x`;
    });
}

// 2. Interaction Loop
interactionManager.setIntersectables(scene.children);

// 3. UI Integration (Expose to Window for HTML buttons)
// @ts-ignore
window.app = {
    spawnStructure: async (prompt: string) => {
        // Check if we have required managers
        if (!agentManager) {
            console.error('❌ AgentManager not initialized');
            return;
        }
        if (!xrUIManager) {
            console.error('❌ XRUIManager not initialized');
            return;
        }
        // Show loading state
        const generateBtn = document.querySelector('button[onclick*="spawnStructure"]') as HTMLButtonElement;
        const originalText = generateBtn?.innerHTML || '';
        
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Generating variants...';
            generateBtn.style.opacity = '0.7';
            generateBtn.style.cursor = 'wait';
        }
        
        console.log('🎨 Generating structure variants...');
        
        try {
            // Generate 5 variants
            console.log('📡 Calling backend API to generate variants...');
            console.log(`🔗 Backend URL: ${backendUrl}`);
            console.log(`📝 Prompt: "${prompt}"`);
            console.log(`🎮 XR Mode: ${xrUIManager.isInXR() ? 'YES' : 'NO'}`);
            
            const variantsData = await agentManager.generateVariants(prompt, 5);
            console.log(`✅ Received ${variantsData.length} variants from backend`);
            
            if (!variantsData || variantsData.length === 0) {
                throw new Error('No variants returned from backend');
            }
            
            console.log('🔍 Validating variants for floating blocks...');
            
            // Validate and fix each variant
            const validatedVariants = variantsData.map((v, index) => {
                const validation = validityAgent.validateStructure(v.data);
                
                if (!validation.valid) {
                    console.warn(`⚠️ Variant ${index + 1} has ${validation.issues.length} floating blocks - auto-fixing...`);
                    // Auto-fix floating blocks
                    const fixedData = validityAgent.fixFloatingBlocks(v.data);
                    
                    // Verify the fix worked
                    const revalidation = validityAgent.validateStructure(fixedData);
                    if (revalidation.valid) {
                        console.log(`✅ Variant ${index + 1} fixed successfully`);
                    } else {
                        console.error(`❌ Variant ${index + 1} could not be fully fixed`);
                    }
                    
                    return { ...v, data: fixedData };
                } else {
                    console.log(`✅ Variant ${index + 1} valid - no floating blocks`);
                    return v;
                }
            });
            
            // Generate 3D previews for each variant
            const variants: StructureVariant[] = validatedVariants.map((v, index) => {
                const preview = variantRenderer.renderVariantPreview(v.data, index);
                return {
                    id: index,
                    description: v.description || `${prompt} - Variant ${index + 1}`,
                    preview: preview, // Base64 image
                    buildInstructions: v.data
                };
            });
            
            console.log('✅ Generated 3D previews for all variants');
            console.log('✅ All variants validated - no floating blocks');
            
            // Show variant selection UI
            variantPreview.showVariants(variants, (selectedVariant) => {
                console.log(`✅ User selected variant ${selectedVariant.id + 1}`);
                
                // Clear existing structure
                structureManager.clear();
                
                // Build the selected variant
                const data = selectedVariant.buildInstructions;
                data.forEach((d: any, index: number) => {
                    console.log(`  Block ${index + 1}:`, d);
                    structureManager.addBlock(d.type, new THREE.Vector3(...d.pos), new THREE.Vector3(...d.size));
                });
                console.log("✅ Structure spawn complete! Total blocks:", structureManager.blocks.length);
                
                // Auto-register all generated blocks with FEA engine
                structureManager.blocks.forEach(block => {
                    feaEngine.addBlock(block.mesh, MaterialType.STEEL, BoundaryCondition.FREE);
                });
                
                // Update intersectables
                updateIntersectables();
                
                // Show success notification (works in both desktop and XR)
                if (xrUIManager.isInXR()) {
                    // In XR, show notification in floating panel
                    const notification = document.getElementById('vector-notification');
                    if (notification) {
                        notification.textContent = `✅ ${selectedVariant.description} created!`;
                        notification.classList.add('show');
                        setTimeout(() => {
                            notification.classList.remove('show');
                        }, 3000);
                    }
                } else {
                    // Desktop mode
                    alert(`✅ ${selectedVariant.description} created!`);
                }
            });
            
        } catch (error: any) {
            console.error('❌ Error generating variants:', error);
            
            // Show error notification (works in both desktop and XR)
            const errorMessage = error?.message || 'Error generating structure variants. Check console for details.';
            
            if (xrUIManager.isInXR()) {
                // In XR, show notification in floating panel
                const notification = document.getElementById('vector-notification');
                if (notification) {
                    notification.textContent = `❌ ${errorMessage}`;
                    notification.style.background = 'rgba(255, 0, 68, 0.2)';
                    notification.style.borderColor = 'rgba(255, 0, 68, 0.6)';
                    notification.style.color = '#ff0044';
                    notification.classList.add('show');
                    setTimeout(() => {
                        notification.classList.remove('show');
                        // Reset to default styling
                        notification.style.background = 'rgba(255, 0, 68, 0.15)';
                        notification.style.borderColor = 'rgba(255, 0, 68, 0.5)';
                    }, 5000);
                }
            } else {
                // Desktop mode
                alert(`Error: ${errorMessage}`);
            }
        } finally {
            // Restore button state
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = originalText;
                generateBtn.style.opacity = '1';
                generateBtn.style.cursor = 'pointer';
            }
        }
    },
    analyze: async () => {
        const blockDesc = structureManager.getSceneDescription();
        const modelDesc = modelLoader.getSceneDescription();
        const combinedDesc = [blockDesc, modelDesc].filter(d => d.length > 0).join('\n');
        
        if (combinedDesc.length === 0) {
            alert('No structures or models to analyze. Generate or upload something first!');
            return;
        }
        
        const feedback = await agentManager.analyzeStructure(combinedDesc);
        console.log("Feedback:", feedback);
        alert(feedback); 
    },
    runStressTest: async () => {
        // Check if force vector has been placed
        if (!forceVectorManager.hasActiveVector()) {
            alert('⚠️ Place a force vector first!\n\n1. Press F to start\n2. Click to set position\n3. Use arrow keys to adjust direction\n4. Press F again to confirm\n\nThen run stress test again.');
            return;
        }

        const forceVector = forceVectorManager.getActiveVector();
        if (!forceVector) return;

        console.log('🔬 Running SolidWorks-style FEA simulation...');
        
        // Collect all objects and register with FEA engine if not already
        const allObjects = [
            ...structureManager.blocks.map(b => b.mesh),
            ...modelLoader.getAllMeshes()
        ];

        // Auto-register any unregistered blocks
        allObjects.forEach(obj => {
            if (obj instanceof THREE.Mesh) {
                if (!feaEngine.getBlock(obj)) {
                    feaEngine.addBlock(obj, MaterialType.STEEL, BoundaryCondition.FREE);
                    console.log(`📦 Auto-registered block with default material (Steel, Free)`);
                }
            }
        });

        // Run FEA simulation
        const results = feaEngine.runSimulation(forceVector);
        
        // Show summary
        console.log(feaEngine.getSimulationSummary());
        
        // Alert user of results
        const failureWarning = results.failedBlocks > 0 
            ? `\n\n⚠️ ${results.failedBlocks} blocks FAILED (stress > 100%)`
            : '\n\n✅ All blocks safe!';
            
        alert(`FEA Simulation Complete!\n\nMax Stress: ${(results.maxStress * 100).toFixed(1)}%\nFailed Blocks: ${results.failedBlocks}/${results.totalBlocks}${failureWarning}`);
    },
    resetSimulation: () => {
        feaEngine.resetSimulation();
        console.log('🔄 FEA simulation reset - colors and deformations cleared');
    },
    clearVector: () => {
        forceVectorManager.clearVectors();
        feaEngine.clearVectors();
    },

    openAnalysisPanel: () => {
        const panel = document.getElementById('analysis-panel');
        const selector = document.getElementById('vector-selector') as HTMLSelectElement;
        const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement;
        
        if (!panel || !selector || !analyzeBtn) return;
        
        // Show panel (works in both desktop and XR)
        panel.style.display = 'block';
        
        // If in XR, show the floating panel
        if (typeof xrUIManager !== 'undefined' && xrUIManager.isInXR()) {
            xrUIManager.showPanel('right');
        }
        
        // Populate dropdown
        selector.innerHTML = '<option value="">-- Select a Force Vector --</option>';
        const vectors = forceVectorManager.getVectors();
        
        if (vectors.length === 0) {
            const option = document.createElement('option');
            option.text = "No vectors placed yet";
            option.disabled = true;
            selector.add(option);
        } else {
            vectors.forEach(v => {
                const option = document.createElement('option');
                option.value = v.id.toString();
                option.text = `Vector #${v.id} (${v.magnitude.toFixed(1)}N)`;
                selector.add(option);
            });
        }
        
        // Handle selection change
        selector.onchange = () => {
            analyzeBtn.disabled = !selector.value;
        };
        
        // Handle analyze click
        analyzeBtn.onclick = async () => {
            const vectorId = parseInt(selector.value);
            if (!vectorId) return;
            
            // Show loading
            document.getElementById('analysis-results')!.style.display = 'none';
            document.getElementById('analysis-loading')!.style.display = 'block';
            analyzeBtn.disabled = true;
            
            // Reset all progress bars
            const agentStates = [
                { id: 1, name: 'Structural Reasoning', icon: '🧠', status: 'Waiting...', text: 'Waiting...', progress: 0 },
                { id: 2, name: 'Math Derivation', icon: '📐', status: 'Waiting...', text: 'Waiting...', progress: 0 },
                { id: 3, name: 'Visualization Mapping', icon: '🎨', status: 'Waiting...', text: 'Waiting...', progress: 0 },
                { id: 4, name: 'Technical Report Writer', icon: '📝', status: 'Waiting...', text: 'Waiting...', progress: 0 },
                { id: 5, name: 'Verification', icon: '✅', status: 'Waiting...', text: 'Waiting...', progress: 0 }
            ];
            
            // Helper function to update agent progress
            const updateAgentProgress = (agentId: number, progress: number, status: string, text: string) => {
                const progressBar = document.getElementById(`agent-${agentId}-progress`) as HTMLElement;
                const statusEl = document.getElementById(`agent-${agentId}-status`) as HTMLElement;
                const textEl = document.getElementById(`agent-${agentId}-text`) as HTMLElement;
                const percentEl = document.getElementById(`agent-${agentId}-percent`) as HTMLElement;
                
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (statusEl) statusEl.textContent = status;
                if (textEl) textEl.textContent = text;
                if (percentEl) percentEl.textContent = `${Math.round(progress)}%`;
            };
            
            // Reset all agents
            agentStates.forEach(agent => {
                updateAgentProgress(agent.id, 0, 'Waiting...', 'Waiting...');
            });
            
            // Simulate agent progress with staggered starts
            const simulateAgentProgress = (agentId: number, delay: number) => {
                return new Promise<void>((resolve) => {
                    setTimeout(() => {
                        const stages = [
                            { progress: 10, status: 'Initializing...', text: 'Connecting to DigitalOcean...' },
                            { progress: 30, status: 'Processing...', text: 'Analyzing structure data...' },
                            { progress: 50, status: 'Processing...', text: 'Running calculations...' },
                            { progress: 70, status: 'Processing...', text: 'Generating results...' },
                            { progress: 90, status: 'Finalizing...', text: 'Completing analysis...' },
                            { progress: 100, status: 'Complete ✅', text: 'Analysis complete!' }
                        ];
                        
                        let stageIndex = 0;
                        const interval = setInterval(() => {
                            if (stageIndex < stages.length) {
                                const stage = stages[stageIndex];
                                updateAgentProgress(agentId, stage.progress, stage.status, stage.text);
                                stageIndex++;
                            } else {
                                clearInterval(interval);
                                resolve();
                            }
                        }, 300 + Math.random() * 200); // Randomize timing slightly
                    }, delay);
                });
            };
            
            // Start all agents with staggered delays
            const agentPromises = [
                simulateAgentProgress(1, 0),
                simulateAgentProgress(2, 200),
                simulateAgentProgress(3, 400),
                simulateAgentProgress(4, 600),
                simulateAgentProgress(5, 800)
            ];
            
            try {
                const vector = forceVectorManager.getVectorById(vectorId);
                if (!vector) throw new Error('Vector not found');
                
                // Prepare data
                const vectorData = {
                    origin: vector.position.toArray(),
                    direction: vector.direction.toArray(),
                    magnitude: vector.magnitude * 1000 // Convert to Newtons (heuristic)
                };
                
                const structureData = structureManager.blocks.map((b) => ({
                    id: b.id, // Use actual block ID (1-indexed, matching visual labels)
                    pos: b.mesh.position.toArray(),
                    size: [b.size.x, b.size.y, b.size.z], // Use actual size property
                    material: 'steel' // Default for now, could get from FEA engine
                }));
                
                // Call API (this runs in parallel with progress simulation)
                const apiPromise = fetch(`${backendUrl}/api/analyze-vector`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ vectorId, vectorData, structureData })
                }).then(res => res.json());
                
                // Wait for both API and progress simulation (whichever finishes last)
                const [result] = await Promise.all([
                    apiPromise,
                    Promise.all(agentPromises)
                ]);
                
                if (result.success) {
                    const data = result.data;
                    
                    // Ensure all agents show complete
                    for (let i = 1; i <= 5; i++) {
                        updateAgentProgress(i, 100, 'Complete ✅', 'Analysis complete!');
                    }
                    
                    // Small delay to show completion before switching to results
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Store analysis data for PDF export
                    (window as any).currentAnalysisData = {
                        vectorId: vectorId,
                        vectorData: vectorData,
                        analysisData: data,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Update UI
                    document.getElementById('reasoning-content')!.innerHTML = `
                        <p><strong>Stress Path:</strong> [${data.reasoning.stressPath.map((id: number) => `#${id}`).join(' → ')}]</p>
                        <p><strong>Critical Block:</strong> #${data.reasoning.criticalBlockId}</p>
                        <p><strong>Failure Mode:</strong> ${data.reasoning.failureMode}</p>
                        <p><strong>Safety Factor:</strong> ${data.reasoning.safetyFactor}</p>
                        <p><em>${data.reasoning.explanation}</em></p>
                    `;
                    
                    // Render math equations with MathJax
                    const mathContent = document.getElementById('math-content')!;
                    mathContent.innerHTML = `
                        <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:4px; margin-bottom:10px;">
                            ${data.math.equations.map((eq: string) => {
                                // Wrap LaTeX in display math delimiters for MathJax
                                return `<div style="margin-bottom:10px; text-align:center;">\\[${eq}\\]</div>`;
                            }).join('')}
                        </div>
                        <ul style="padding-left:20px; margin:0;">
                            ${data.math.steps.map((step: string) => {
                                // Check if step contains LaTeX and render it inline
                                const hasLatex = /\\[a-zA-Z]|\\frac|\\sigma|\\times/.test(step);
                                if (hasLatex) {
                                    // Replace LaTeX expressions with inline math delimiters
                                    // Simple approach: wrap the entire step if it contains LaTeX
                                    return `<li>\\(${step}\\)</li>`;
                                }
                                return `<li>${step}</li>`;
                            }).join('')}
                        </ul>
                    `;
                    
                    // Trigger MathJax to render the equations
                    if ((window as any).MathJax && (window as any).MathJax.typesetPromise) {
                        (window as any).MathJax.typesetPromise([mathContent]).catch((err: any) => {
                            console.warn('MathJax rendering error:', err);
                        });
                    }
                    
                    document.getElementById('report-content')!.innerHTML = `
                        <p><strong>Summary:</strong> ${data.report.summary}</p>
                        <p><strong>Risk:</strong> <span style="color:${data.report.riskAssessment.includes('High') ? '#ff4444' : '#00ff88'}">${data.report.riskAssessment}</span></p>
                        <p><strong>Recommendation:</strong> ${data.report.recommendation}</p>
                    `;
                    
                    document.getElementById('verification-content')!.innerHTML = `
                        <p><strong>Valid:</strong> ${data.verification.valid ? '✅ Yes' : '❌ No'}</p>
                        <p><strong>Confidence:</strong> ${(data.verification.confidence * 100).toFixed(0)}%</p>
                    `;
                    
                    // Apply Visualization (Highlights) with Pixelated Stress Gradient
                    // Reset first - clear any existing pixelated textures
                    structureManager.blocks.forEach(b => {
                        pixelatedStressVisualizer.clearPixelatedStress(b.mesh);
                        if (Array.isArray(b.mesh.material)) {
                            b.mesh.material.forEach(m => (m as THREE.MeshStandardMaterial).emissive.setHex(0x000000));
                        } else {
                            (b.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
                        }
                    });
                    
                    // Apply pixelated stress visualization (find blocks by ID, not array index)
                    data.visualization.highlights.forEach((h: any) => {
                        const block = structureManager.blocks.find(b => b.id === h.blockId);
                        if (block) {
                            // Use pixelated texture instead of simple emissive color
                            const opacity = h.opacity !== undefined ? h.opacity : 1.0;
                            pixelatedStressVisualizer.applyPixelatedStress(block.mesh, h.color, opacity);
                        }
                    });
                    
                    // Show results
                    document.getElementById('analysis-loading')!.style.display = 'none';
                    document.getElementById('analysis-results')!.style.display = 'block';
                } else {
                    // Update all agents to show error
                    for (let i = 1; i <= 5; i++) {
                        updateAgentProgress(i, 0, 'Error ❌', 'Analysis failed');
                    }
                    alert('Analysis failed: ' + result.error);
                    document.getElementById('analysis-loading')!.style.display = 'none';
                }
            } catch (e) {
                console.error(e);
                // Update all agents to show error
                for (let i = 1; i <= 5; i++) {
                    const progressBar = document.getElementById(`agent-${i}-progress`) as HTMLElement;
                    const statusEl = document.getElementById(`agent-${i}-status`) as HTMLElement;
                    const textEl = document.getElementById(`agent-${i}-text`) as HTMLElement;
                    if (progressBar) progressBar.style.width = '0%';
                    if (statusEl) statusEl.textContent = 'Error ❌';
                    if (textEl) textEl.textContent = 'Connection failed';
                }
                alert('Error running analysis');
                document.getElementById('analysis-loading')!.style.display = 'none';
            } finally {
                analyzeBtn.disabled = false;
            }
        };
    },
    openComprehensiveAnalysis: () => {
        const panel = document.getElementById('comprehensive-analysis-panel');
        const analyzeBtn = document.getElementById('comprehensive-analyze-btn') as HTMLButtonElement;
        
        if (!panel || !analyzeBtn) return;
        
        // Show panel (works in both desktop and XR)
        panel.style.display = 'block';
        
        // If in XR, show the floating panel
        if (typeof xrUIManager !== 'undefined' && xrUIManager.isInXR()) {
            xrUIManager.showPanel('comprehensive');
        }
        
        // Handle comprehensive analyze click
        analyzeBtn.onclick = async () => {
            const blocks = structureManager.blocks;
            
            if (blocks.length === 0) {
                alert('No blocks to analyze. Generate or create a structure first!');
                return;
            }
            
            // Show loading
            document.getElementById('comprehensive-analysis-results')!.style.display = 'none';
            document.getElementById('comprehensive-analysis-loading')!.style.display = 'block';
            analyzeBtn.disabled = true;
            
            // Prepare structure data
            const structureData = blocks.map((b) => ({
                id: b.id,
                pos: b.mesh.position.toArray(),
                size: [b.size.x, b.size.y, b.size.z],
                material: 'steel'
            }));
            
            // Prepare vector data (if any vectors exist)
            const vectors = forceVectorManager.getVectors();
            const vectorData = vectors.length > 0 ? vectors.map(v => ({
                origin: v.position.toArray(),
                direction: v.direction.toArray(),
                magnitude: v.magnitude * 1000
            })) : null;
            
            // Create progress indicators for each block + summary
            const progressContainer = document.getElementById('comprehensive-progress-container')!;
            progressContainer.innerHTML = '';
            
            // Add progress for each block
            blocks.forEach((block, index) => {
                const blockProgress = document.createElement('div');
                blockProgress.className = 'agent-section';
                blockProgress.id = `block-${block.id}-progress`;
                blockProgress.innerHTML = `
                    <div class="agent-header">
                        <span class="agent-icon">📦</span>
                        <span class="agent-name">Block #${block.id} Analysis</span>
                        <span id="block-${block.id}-status" class="agent-status" style="margin-left: auto;">Waiting...</span>
                    </div>
                    <div class="agent-progress-container">
                        <div class="agent-progress-bar">
                            <div id="block-${block.id}-progress-bar" class="agent-progress-fill"></div>
                        </div>
                        <div class="agent-progress-text">
                            <span id="block-${block.id}-text">Waiting...</span>
                            <span id="block-${block.id}-percent">0%</span>
                        </div>
                    </div>
                `;
                progressContainer.appendChild(blockProgress);
            });
            
            // Add summary progress
            const summaryProgress = document.createElement('div');
            summaryProgress.className = 'agent-section';
            summaryProgress.style.background = 'rgba(0, 255, 136, 0.15)';
            summaryProgress.innerHTML = `
                <div class="agent-header">
                    <span class="agent-icon">📋</span>
                    <span class="agent-name">Summary Agent</span>
                    <span id="summary-status" class="agent-status" style="margin-left: auto;">Waiting...</span>
                </div>
                <div class="agent-progress-container">
                    <div class="agent-progress-bar">
                        <div id="summary-progress-bar" class="agent-progress-fill"></div>
                    </div>
                    <div class="agent-progress-text">
                        <span id="summary-text">Waiting for block analyses...</span>
                        <span id="summary-percent">0%</span>
                    </div>
                </div>
            `;
            progressContainer.appendChild(summaryProgress);
            
            // Helper function to update block progress
            const updateBlockProgress = (blockId: number, progress: number, status: string, text: string) => {
                const progressBar = document.getElementById(`block-${blockId}-progress-bar`) as HTMLElement;
                const statusEl = document.getElementById(`block-${blockId}-status`) as HTMLElement;
                const textEl = document.getElementById(`block-${blockId}-text`) as HTMLElement;
                const percentEl = document.getElementById(`block-${blockId}-percent`) as HTMLElement;
                
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (statusEl) statusEl.textContent = status;
                if (textEl) textEl.textContent = text;
                if (percentEl) percentEl.textContent = `${Math.round(progress)}%`;
            };
            
            const updateSummaryProgress = (progress: number, status: string, text: string) => {
                const progressBar = document.getElementById('summary-progress-bar') as HTMLElement;
                const statusEl = document.getElementById('summary-status') as HTMLElement;
                const textEl = document.getElementById('summary-text') as HTMLElement;
                const percentEl = document.getElementById('summary-percent') as HTMLElement;
                
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (statusEl) statusEl.textContent = status;
                if (textEl) textEl.textContent = text;
                if (percentEl) percentEl.textContent = `${Math.round(progress)}%`;
            };
            
            // Simulate progress for each block
            const simulateBlockProgress = (blockId: number, delay: number) => {
                return new Promise<void>((resolve) => {
                    setTimeout(() => {
                        const stages = [
                            { progress: 10, status: 'Initializing...', text: 'Connecting to DigitalOcean...' },
                            { progress: 30, status: 'Processing...', text: 'Analyzing block stress...' },
                            { progress: 50, status: 'Processing...', text: 'Running calculations...' },
                            { progress: 70, status: 'Processing...', text: 'Generating results...' },
                            { progress: 90, status: 'Finalizing...', text: 'Completing analysis...' },
                            { progress: 100, status: 'Complete ✅', text: 'Analysis complete!' }
                        ];
                        
                        let stageIndex = 0;
                        const interval = setInterval(() => {
                            if (stageIndex < stages.length) {
                                const stage = stages[stageIndex];
                                updateBlockProgress(blockId, stage.progress, stage.status, stage.text);
                                stageIndex++;
                            } else {
                                clearInterval(interval);
                                resolve();
                            }
                        }, 400 + Math.random() * 300);
                    }, delay);
                });
            };
            
            // Start all block analyses with staggered delays
            const blockPromises = blocks.map((block, index) => 
                simulateBlockProgress(block.id, index * 300)
            );
            
            try {
                // Call comprehensive analysis API
                const apiPromise = fetch(`${backendUrl}/api/comprehensive-analysis`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        structureData,
                        vectorData: vectorData || []
                    })
                }).then(res => res.json());
                
                // Wait for API and progress simulation
                const [result] = await Promise.all([
                    apiPromise,
                    Promise.all(blockPromises)
                ]);
                
                if (result.success) {
                    const { blockAnalyses, summary } = result.data;
                    
                    // Mark all blocks as complete
                    blocks.forEach(block => {
                        updateBlockProgress(block.id, 100, 'Complete ✅', 'Analysis complete!');
                    });
                    
                    // Simulate summary progress
                    updateSummaryProgress(10, 'Initializing...', 'Synthesizing results...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    updateSummaryProgress(50, 'Processing...', 'Analyzing overall stress...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    updateSummaryProgress(100, 'Complete ✅', 'Summary complete!');
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Display summary
                    const summaryContent = document.getElementById('comprehensive-summary-content')!;
                    summaryContent.innerHTML = `
                        <p><strong>Overall Summary:</strong> ${summary.overallSummary || summary.structuralIntegrity || 'Analysis complete'}</p>
                        <p><strong>Overall Risk:</strong> <span style="color:${summary.overallRisk === 'High' ? '#ff4444' : summary.overallRisk === 'Medium' ? '#ffaa00' : '#00ff88'}">${summary.overallRisk}</span></p>
                        <p><strong>Safety Factor:</strong> ${summary.safetyFactor?.toFixed(2) || 'N/A'}</p>
                        <p><strong>Critical Blocks:</strong> [${(summary.criticalBlocks || []).map((id: number) => `#${id}`).join(', ')}]</p>
                        <div style="margin-top: 10px;">
                            <strong>Key Findings:</strong>
                            <ul style="padding-left: 20px; margin: 5px 0;">
                                ${(summary.keyFindings || []).map((finding: string) => `<li>${finding}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="margin-top: 10px;">
                            <strong>Recommendations:</strong>
                            <ul style="padding-left: 20px; margin: 5px 0;">
                                ${(summary.recommendations || []).map((rec: string) => `<li>${rec}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                    
                    // Display each block analysis
                    const blocksContainer = document.getElementById('comprehensive-blocks-container')!;
                    blocksContainer.innerHTML = '';
                    
                    blockAnalyses.forEach((blockAnalysis: any) => {
                        const blockSection = document.createElement('div');
                        blockSection.className = 'agent-section';
                        blockSection.style.marginTop = '15px';
                        blockSection.innerHTML = `
                            <div class="agent-header">
                                <span class="agent-icon">📦</span>
                                <span class="agent-name">Block #${blockAnalysis.blockId}</span>
                            </div>
                            <div class="agent-content">
                                <div style="margin-bottom: 10px;">
                                    <strong>Stress Type:</strong> ${blockAnalysis.analysis.reasoning?.stressType || 'N/A'}<br>
                                    <strong>Failure Mode:</strong> ${blockAnalysis.analysis.reasoning?.failureMode || 'N/A'}<br>
                                    <strong>Safety Factor:</strong> ${blockAnalysis.analysis.reasoning?.safetyFactor?.toFixed(2) || 'N/A'}<br>
                                    <strong>Risk:</strong> <span style="color:${blockAnalysis.analysis.report?.riskAssessment === 'High' ? '#ff4444' : blockAnalysis.analysis.report?.riskAssessment === 'Medium' ? '#ffaa00' : '#00ff88'}">${blockAnalysis.analysis.report?.riskAssessment || 'Unknown'}</span>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <strong>Summary:</strong> ${blockAnalysis.analysis.report?.summary || 'No summary available'}
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <strong>Recommendation:</strong> ${blockAnalysis.analysis.report?.recommendation || 'No recommendation'}
                                </div>
                                ${blockAnalysis.analysis.math?.equations?.length > 0 ? `
                                    <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:4px; margin-top: 10px;">
                                        <strong>Equations:</strong>
                                        ${blockAnalysis.analysis.math.equations.map((eq: string) => 
                                            `<div style="margin:5px 0; text-align:center;">\\[${eq}\\]</div>`
                                        ).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                        blocksContainer.appendChild(blockSection);
                    });
                    
                    // Apply pixelated visualization colors to blocks
                    blockAnalyses.forEach((blockAnalysis: any) => {
                        const block = blocks.find(b => b.id === blockAnalysis.blockId);
                        if (block && blockAnalysis.analysis.visualization) {
                            const colorHex = blockAnalysis.analysis.visualization.color || '#ffffff';
                            const opacity = blockAnalysis.analysis.visualization.opacity !== undefined 
                                ? blockAnalysis.analysis.visualization.opacity 
                                : 1.0;
                            // Use pixelated texture instead of simple emissive color
                            pixelatedStressVisualizer.applyPixelatedStress(block.mesh, colorHex, opacity);
                        }
                    });
                    
                    // Trigger MathJax rendering
                    if ((window as any).MathJax && (window as any).MathJax.typesetPromise) {
                        (window as any).MathJax.typesetPromise([blocksContainer, summaryContent]).catch((err: any) => {
                            console.warn('MathJax rendering error:', err);
                        });
                    }
                    
                    // Show results
                    document.getElementById('comprehensive-analysis-loading')!.style.display = 'none';
                    document.getElementById('comprehensive-analysis-results')!.style.display = 'block';
                } else {
                    alert('Comprehensive analysis failed: ' + result.error);
                    document.getElementById('comprehensive-analysis-loading')!.style.display = 'none';
                }
            } catch (e) {
                console.error(e);
                alert('Error running comprehensive analysis');
                document.getElementById('comprehensive-analysis-loading')!.style.display = 'none';
            } finally {
                analyzeBtn.disabled = false;
            }
        };
    },
    uploadModel: async (file: File) => {
        console.log("📤 Uploading model:", file.name);
        const model = await modelLoader.loadFile(file);
        if (model) {
            console.log("✅ Model uploaded and added to scene");
            updateIntersectables();
        } else {
            alert('Failed to load model. Please check the file format.');
        }
    }
};

// PDF Download Function
(window as any).downloadAnalysisPDF = async function() {
    const analysisData = (window as any).currentAnalysisData;
    if (!analysisData) {
        alert('No analysis data available. Please run an analysis first.');
        return;
    }

    // Load jsPDF dynamically if not already loaded
    let jsPDF: any = null;
    
    // Check if jsPDF is already loaded
    if (typeof (window as any).jspdf !== 'undefined') {
        const jspdfModule = (window as any).jspdf;
        jsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule;
    } else if (typeof (window as any).jsPDF !== 'undefined') {
        jsPDF = (window as any).jsPDF;
    }

    // If not loaded, load it dynamically
    if (!jsPDF) {
        try {
            // Show loading message
            const btn = document.getElementById('download-pdf-btn') as HTMLButtonElement;
            let originalText = '📥 Download Analysis PDF';
            if (btn) {
                originalText = btn.innerHTML;
                btn.innerHTML = '⏳ Loading PDF library...';
                btn.disabled = true;
            }

            // Load jsPDF from CDN
            await new Promise<void>((resolve, reject) => {
                if (document.querySelector('script[src*="jspdf"]')) {
                    // Already loading, wait for it
                    const checkInterval = setInterval(() => {
                        if (typeof (window as any).jspdf !== 'undefined') {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        reject(new Error('Timeout waiting for jsPDF'));
                    }, 5000);
                } else {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                    script.onload = () => {
                        console.log('✅ jsPDF loaded');
                        resolve();
                    };
                    script.onerror = () => {
                        console.error('❌ Failed to load jsPDF');
                        reject(new Error('Failed to load jsPDF'));
                    };
                    document.head.appendChild(script);
                }
            });

            // Get jsPDF after loading
            if (typeof (window as any).jspdf !== 'undefined') {
                const jspdfModule = (window as any).jspdf;
                jsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule;
            }

            // Restore button
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }

            if (!jsPDF) {
                throw new Error('jsPDF not accessible after loading');
            }
        } catch (error) {
            console.error('Error loading jsPDF:', error);
            alert('Failed to load PDF library. Please check your internet connection and try again.');
            const btn = document.getElementById('download-pdf-btn') as HTMLButtonElement;
            if (btn) {
                btn.innerHTML = '📥 Download Analysis PDF';
                btn.disabled = false;
            }
            return;
        }
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;
    const lineHeight = 7;
    const sectionSpacing = 10;

    // Helper function to add text with word wrap
    function addText(text: string, fontSize: number = 11, isBold: boolean = false, color: number[] = [0, 0, 0]) {
        doc.setFontSize(fontSize);
        doc.setTextColor(color[0], color[1], color[2]);
        if (isBold) {
            doc.setFont(undefined, 'bold');
        } else {
            doc.setFont(undefined, 'normal');
        }
        
        const maxWidth = pageWidth - 2 * margin;
        const lines = doc.splitTextToSize(text, maxWidth);
        
        if (yPos + lines.length * lineHeight > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
        }
        
        lines.forEach((line: string) => {
            doc.text(line, margin, yPos);
            yPos += lineHeight;
        });
        
        if (isBold) {
            doc.setFont(undefined, 'normal');
        }
    }

    // Title
    doc.setFontSize(18);
    doc.setTextColor(0, 255, 136); // Primary color
    doc.setFont(undefined, 'bold');
    doc.text('Mathematical Analysis Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight * 2;

    // Vector Information
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`Vector #${analysisData.vectorId} Analysis`, margin, yPos);
    yPos += lineHeight;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const vectorInfo = `Origin: [${analysisData.vectorData.origin.map((v: number) => v.toFixed(2)).join(', ')}]
Direction: [${analysisData.vectorData.direction.map((v: number) => v.toFixed(2)).join(', ')}]
Magnitude: ${(analysisData.vectorData.magnitude / 1000).toFixed(2)} kN`;
    addText(vectorInfo, 10, false, [0, 0, 0]);
    yPos += sectionSpacing;

    const data = analysisData.analysisData;

    // 1. Structural Reasoning
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('🧠 Structural Reasoning', margin, yPos);
    yPos += lineHeight * 1.5;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    addText(`Stress Path: [${data.reasoning.stressPath.map((id: number) => `#${id}`).join(' → ')}]`, 11, false, [0, 0, 0]);
    addText(`Critical Block: #${data.reasoning.criticalBlockId}`, 11, false, [0, 0, 0]);
    addText(`Failure Mode: ${data.reasoning.failureMode}`, 11, false, [0, 0, 0]);
    addText(`Safety Factor: ${data.reasoning.safetyFactor}`, 11, false, [0, 0, 0]);
    addText(data.reasoning.explanation, 11, false, [0, 0, 0]);
    yPos += sectionSpacing;

    // 2. Math Derivation
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('📐 Math Derivation', margin, yPos);
    yPos += lineHeight * 1.5;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    addText('Equations:', 11, true, [0, 0, 0]);
    data.math.equations.forEach((eq: string) => {
        // Convert LaTeX to readable format (simplified)
        const readableEq = eq
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
            .replace(/\\sigma/g, 'σ')
            .replace(/\\times/g, '×')
            .replace(/\\cdot/g, '·')
            .replace(/\{/g, '')
            .replace(/\}/g, '')
            .replace(/\\/g, '');
        addText(readableEq, 11, false, [0, 0, 0]);
    });
    
    yPos += lineHeight;
    addText('Calculation Steps:', 11, true, [0, 0, 0]);
    data.math.steps.forEach((step: string) => {
        // Remove LaTeX formatting for PDF
        const cleanStep = step
            .replace(/\\[a-zA-Z]+/g, '')
            .replace(/\{/g, '')
            .replace(/\}/g, '');
        addText(cleanStep, 11, false, [0, 0, 0]);
    });
    yPos += sectionSpacing;

    // 3. Technical Report
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('📝 Technical Report', margin, yPos);
    yPos += lineHeight * 1.5;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    addText(`Summary: ${data.report.summary}`, 11, false, [0, 0, 0]);
    yPos += lineHeight;
    addText(`Risk Assessment: ${data.report.riskAssessment}`, 11, false, [0, 0, 0]);
    yPos += lineHeight;
    addText(`Recommendation: ${data.report.recommendation}`, 11, false, [0, 0, 0]);
    yPos += sectionSpacing;

    // 4. Verification
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('✅ Verification', margin, yPos);
    yPos += lineHeight * 1.5;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    addText(`Valid: ${data.verification.valid ? 'Yes' : 'No'}`, 11, false, [0, 0, 0]);
    addText(`Confidence: ${(data.verification.confidence * 100).toFixed(0)}%`, 11, false, [0, 0, 0]);
    yPos += sectionSpacing;

    // Footer
    const footerY = pageHeight - margin;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date(analysisData.timestamp).toLocaleString()}`, margin, footerY);
    doc.text('StructuraXR - WebXR Structural Analysis', pageWidth - margin, footerY, { align: 'right' });

    // Generate filename
    const filename = `analysis_vector_${analysisData.vectorId}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Save PDF
    doc.save(filename);
    console.log('✅ PDF downloaded:', filename);
};

// Helper function to update all interactable objects
function updateIntersectables() {
    const allObjects = [
        ...structureManager.blocks.map(b => b.mesh),
        ...modelLoader.getAllMeshes()
    ];
    interactionManager.setIntersectables(allObjects);
    desktopSim.setIntersectables(allObjects);
}

// Setup file upload handler
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
    
    if (dropZone && fileInput) {
        // Initialize drag-drop uploader
        new DragDropUploader(dropZone, async (file) => {
            // @ts-ignore
            await window.app.uploadModel(file);
        });
        
        // Also make drop zone clickable to trigger file picker
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Handle traditional file input
        fileInput.addEventListener('change', async (event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                // @ts-ignore
                await window.app.uploadModel(file);
                target.value = '';
            }
        });
    }
});

// 4. Render Loop
renderer.setAnimationLoop(() => {
    interactionManager.update();
    desktopSim.update(); // Update desktop controls
    xrUIManager.update(); // Update XR floating UI panels
    xrControllerManager.update(); // Update XR controller interactions
    renderer.render(scene, camera);
});

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    xrUIManager.resize(window.innerWidth, window.innerHeight);
});