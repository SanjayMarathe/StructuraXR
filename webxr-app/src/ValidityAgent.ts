import * as THREE from 'three';

interface Block {
    type: string;
    pos: number[];
    size: number[];
}

export class StructureValidityAgent {
    
    /**
     * Validates a structure to ensure no floating blocks
     * Returns { valid: boolean, issues: string[] }
     */
    public validateStructure(blocks: Block[]): { valid: boolean; issues: string[] } {
        const issues: string[] = [];
        
        if (blocks.length === 0) {
            issues.push('No blocks in structure');
            return { valid: false, issues };
        }

        // Check each block for support
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const hasSupport = this.hasSupport(block, blocks, i);
            
            if (!hasSupport) {
                issues.push(`Block ${i} at position (${block.pos.join(', ')}) is floating`);
            }
        }

        const valid = issues.length === 0;
        
        if (valid) {
            console.log('✅ Structure validation passed - no floating blocks');
        } else {
            console.warn(`❌ Structure validation failed:\n${issues.join('\n')}`);
        }

        return { valid, issues };
    }

    /**
     * Check if a block has support (either ground or another block)
     */
    private hasSupport(block: Block, allBlocks: Block[], currentIndex: number): boolean {
        const [x, y, z] = block.pos;
        const [width, height, depth] = block.size;
        
        // Check if on the ground (y position close to half of height)
        const onGround = Math.abs(y - height / 2) < 0.1;
        if (onGround) {
            return true;
        }

        // Check if supported by another block below
        const bottomY = y - height / 2;
        
        // Look for blocks that could be supporting this one
        for (let i = 0; i < allBlocks.length; i++) {
            if (i === currentIndex) continue; // Skip self
            
            const otherBlock = allBlocks[i];
            const [ox, oy, oz] = otherBlock.pos;
            const [ow, oh, od] = otherBlock.size;
            
            const otherTopY = oy + oh / 2;
            
            // Check if the other block's top surface is touching this block's bottom
            const verticallyAligned = Math.abs(bottomY - otherTopY) < 0.1;
            
            if (verticallyAligned) {
                // Check horizontal overlap
                const xOverlap = this.checkOverlap(
                    x - width / 2, x + width / 2,
                    ox - ow / 2, ox + ow / 2
                );
                
                const zOverlap = this.checkOverlap(
                    z - depth / 2, z + depth / 2,
                    oz - od / 2, oz + od / 2
                );
                
                if (xOverlap && zOverlap) {
                    return true; // Supported by this block
                }
            }
        }

        return false; // No support found
    }

    /**
     * Check if two ranges overlap
     */
    private checkOverlap(min1: number, max1: number, min2: number, max2: number): boolean {
        return !(max1 < min2 || max2 < min1);
    }

    /**
     * Fix floating blocks by moving them down to supported positions
     * Returns fixed structure
     */
    public fixFloatingBlocks(blocks: Block[]): Block[] {
        const fixedBlocks: Block[] = [];
        const processedIndices = new Set<number>();
        
        // Sort blocks by Y position (bottom to top)
        const sortedIndices = blocks
            .map((block, index) => ({ block, index, y: block.pos[1] }))
            .sort((a, b) => a.y - b.y)
            .map(item => item.index);

        for (const index of sortedIndices) {
            const block = { ...blocks[index], pos: [...blocks[index].pos], size: [...blocks[index].size] };
            
            // Check if needs fixing
            if (!this.hasSupport(block, fixedBlocks, -1)) {
                // Find the highest support surface below this block
                const supportY = this.findSupportSurface(block, fixedBlocks);
                
                // Move block to supported position
                const [, , ] = block.pos;
                const [, height, ] = block.size;
                block.pos[1] = supportY + height / 2;
                
                console.log(`🔧 Fixed floating block ${index}: moved to y=${block.pos[1].toFixed(2)}`);
            }
            
            fixedBlocks.push(block);
            processedIndices.add(index);
        }

        return fixedBlocks;
    }

    /**
     * Find the highest support surface for a block
     */
    private findSupportSurface(block: Block, placedBlocks: Block[]): number {
        const [x, , z] = block.pos;
        const [width, , depth] = block.size;
        
        let highestSupport = 0; // Ground level
        
        for (const otherBlock of placedBlocks) {
            const [ox, oy, oz] = otherBlock.pos;
            const [ow, oh, od] = otherBlock.size;
            
            // Check horizontal overlap
            const xOverlap = this.checkOverlap(
                x - width / 2, x + width / 2,
                ox - ow / 2, ox + ow / 2
            );
            
            const zOverlap = this.checkOverlap(
                z - depth / 2, z + depth / 2,
                oz - od / 2, oz + od / 2
            );
            
            if (xOverlap && zOverlap) {
                const topY = oy + oh / 2;
                highestSupport = Math.max(highestSupport, topY);
            }
        }
        
        return highestSupport;
    }

    /**
     * Get a detailed validation report
     */
    public getValidationReport(blocks: Block[]): string {
        const { valid, issues } = this.validateStructure(blocks);
        
        if (valid) {
            return `✅ VALID STRUCTURE\n━━━━━━━━━━━━━━━━━━━\nTotal Blocks: ${blocks.length}\nAll blocks properly supported\nNo floating components detected`;
        } else {
            return `❌ INVALID STRUCTURE\n━━━━━━━━━━━━━━━━━━━\nTotal Blocks: ${blocks.length}\nFloating Blocks: ${issues.length}\n\nIssues:\n${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}`;
        }
    }
}
