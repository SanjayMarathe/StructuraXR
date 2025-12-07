/**
 * STRUCTURE TEMPLATE SYSTEM
 * 
 * This module defines canonical structural templates that can be parametrically expanded
 * into deterministic block geometries. NO AI HALLUCINATION ALLOWED.
 */

export const StructureTemplates = {
    /**
     * Vertical compression structure - towers, columns, stacks
     */
    tower_stack: {
        name: 'Tower Stack',
        description: 'Vertical compression structure',
        generate: (params) => {
            const { height, width, depth, levels, material } = params;
            const blocks = [];
            const blockHeight = height / levels;
            const baseY = blockHeight / 2; // First block bottom at y=0
            
            for (let i = 0; i < levels; i++) {
                blocks.push({
                    type: 'cube',
                    pos: [0, baseY + (i * blockHeight), -2],
                    size: [width, blockHeight, depth]
                });
            }
            
            return blocks;
        },
        defaultParams: {
            height: 2,
            width: 0.5,
            depth: 0.5,
            levels: 4,
            span: 0,
            material: 'concrete'
        },
        paramRanges: {
            height: { min: 0.5, max: 5 },
            width: { min: 0.125, max: 1.25 },
            depth: { min: 0.125, max: 1.25 },
            levels: { min: 2, max: 15 },
            span: { min: 0, max: 0 }
        }
    },

    /**
     * Tension + compression bridge structure
     */
    truss_bridge: {
        name: 'Truss Bridge',
        description: 'Tension and compression bridge',
        generate: (params) => {
            const { height, width, depth, span, material } = params;
            const blocks = [];
            const supportWidth = Math.max(0.5, width * 0.3);
            const deckThickness = 0.2;
            
            // Left support
            blocks.push({
                type: 'cube',
                pos: [-span / 2, height / 2, -2],
                size: [supportWidth, height, depth]
            });
            
            // Right support
            blocks.push({
                type: 'cube',
                pos: [span / 2, height / 2, -2],
                size: [supportWidth, height, depth]
            });
            
            // Deck/span
            blocks.push({
                type: 'cube',
                pos: [0, height + deckThickness / 2, -2],
                size: [span + supportWidth, deckThickness, depth]
            });
            
            return blocks;
        },
        defaultParams: {
            height: 0.75,
            width: 0.25,
            depth: 0.25,
            levels: 0,
            span: 1.5,
            material: 'steel'
        },
        paramRanges: {
            height: { min: 0.25, max: 2 },
            width: { min: 0.125, max: 0.75 },
            depth: { min: 0.125, max: 0.75 },
            levels: { min: 0, max: 0 },
            span: { min: 0.5, max: 3.75 }
        }
    },

    /**
     * Rigid building frame
     */
    frame_box: {
        name: 'Frame Box',
        description: 'Rigid building frame',
        generate: (params) => {
            const { height, width, depth, levels, material } = params;
            const blocks = [];
            const levelHeight = height / levels;
            const columnWidth = Math.max(0.3, width * 0.15);
            const beamDepth = Math.max(0.2, depth * 0.1);
            
            // Columns at corners
            const corners = [
                [-width / 2, 0, -2 - depth / 2],
                [width / 2, 0, -2 - depth / 2],
                [-width / 2, 0, -2 + depth / 2],
                [width / 2, 0, -2 + depth / 2]
            ];
            
            // Generate columns
            corners.forEach(([x, y, z]) => {
                for (let i = 0; i < levels; i++) {
                    blocks.push({
                        type: 'cube',
                        pos: [x, (i + 0.5) * levelHeight, z],
                        size: [columnWidth, levelHeight, columnWidth]
                    });
                }
            });
            
            // Generate beams between columns at each level
            for (let i = 1; i <= levels; i++) {
                const beamY = i * levelHeight;
                // Front beam
                blocks.push({
                    type: 'cube',
                    pos: [0, beamY, -2 - depth / 2],
                    size: [width, beamDepth, columnWidth]
                });
                // Back beam
                blocks.push({
                    type: 'cube',
                    pos: [0, beamY, -2 + depth / 2],
                    size: [width, beamDepth, columnWidth]
                });
                // Left beam
                blocks.push({
                    type: 'cube',
                    pos: [-width / 2, beamY, -2],
                    size: [columnWidth, beamDepth, depth]
                });
                // Right beam
                blocks.push({
                    type: 'cube',
                    pos: [width / 2, beamY, -2],
                    size: [columnWidth, beamDepth, depth]
                });
            }
            
            return blocks;
        },
        defaultParams: {
            height: 1.5,
            width: 1,
            depth: 1,
            levels: 3,
            span: 0,
            material: 'steel'
        },
        paramRanges: {
            height: { min: 0.5, max: 3 },
            width: { min: 0.5, max: 2.5 },
            depth: { min: 0.5, max: 2.5 },
            levels: { min: 2, max: 8 },
            span: { min: 0, max: 0 }
        }
    },

    /**
     * Overhang failure demonstration
     */
    cantilever_beam: {
        name: 'Cantilever Beam',
        description: 'Overhang failure demonstration',
        generate: (params) => {
            const { height, width, depth, span, material } = params;
            const blocks = [];
            const supportWidth = Math.max(0.5, width * 0.4);
            
            // Support column
            blocks.push({
                type: 'cube',
                pos: [-span / 2, height / 2, -2],
                size: [supportWidth, height, depth]
            });
            
            // Cantilever beam (overhang)
            blocks.push({
                type: 'cube',
                pos: [span / 4, height + 0.1, -2],
                size: [span, 0.2, depth]
            });
            
            return blocks;
        },
        defaultParams: {
            height: 0.5,
            width: 0.25,
            depth: 0.25,
            levels: 0,
            span: 1,
            material: 'concrete'
        },
        paramRanges: {
            height: { min: 0.25, max: 1.5 },
            width: { min: 0.125, max: 0.5 },
            depth: { min: 0.125, max: 0.5 },
            levels: { min: 0, max: 0 },
            span: { min: 0.25, max: 2.5 }
        }
    }
};

/**
 * Get template by name
 */
export function getTemplate(templateName) {
    return StructureTemplates[templateName] || StructureTemplates.tower_stack;
}

/**
 * Get all available template names
 */
export function getAvailableTemplates() {
    return Object.keys(StructureTemplates);
}

