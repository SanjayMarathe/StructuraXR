/**
 * GEOMETRY VALIDATION SYSTEM
 * 
 * Anti-hallucination safeguards that ensure all geometry is:
 * - Deterministic
 * - Numeric
 * - Grounded
 * - Physically sensible at geometry level
 */

/**
 * Validate a single block
 */
export function validateBlock(block) {
    const errors = [];
    
    // Check required fields
    if (!block.type || (block.type !== 'cube' && block.type !== 'cylinder')) {
        errors.push('Block type must be "cube" or "cylinder"');
    }
    
    if (!Array.isArray(block.pos) || block.pos.length !== 3) {
        errors.push('Block pos must be [x, y, z] array');
    }
    
    if (!Array.isArray(block.size) || block.size.length !== 3) {
        errors.push('Block size must be [width, height, depth] array');
    }
    
    // Validate dimensions
    if (block.size) {
        const [width, height, depth] = block.size;
        
        // No negative dimensions
        if (width <= 0 || height <= 0 || depth <= 0) {
            errors.push('All dimensions must be positive');
        }
        
        // No zero thickness
        if (width < 0.1 || height < 0.1 || depth < 0.1) {
            errors.push('Dimensions too small (minimum 0.1m)');
        }
        
        // Reasonable maximum (prevent unbounded)
        if (width > 20 || height > 20 || depth > 20) {
            errors.push('Dimensions too large (maximum 20m)');
        }
        
        // Aspect ratio check (height / base width)
        const baseWidth = Math.max(width, depth);
        const aspectRatio = height / baseWidth;
        if (aspectRatio > 20) {
            errors.push('Aspect ratio too extreme (height/base > 20)');
        }
    }
    
    // Validate position
    if (block.pos) {
        const [x, y, z] = block.pos;
        
        // Check for NaN or Infinity
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
            errors.push('Position contains invalid numbers (NaN or Infinity)');
        }
        
        // Reasonable bounds
        if (Math.abs(x) > 50 || Math.abs(y) > 50 || Math.abs(z) > 50) {
            errors.push('Position out of reasonable bounds (±50m)');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate entire structure
 */
export function validateStructure(blocks) {
    if (!Array.isArray(blocks)) {
        return {
            valid: false,
            errors: ['Structure must be an array of blocks']
        };
    }
    
    if (blocks.length === 0) {
        return {
            valid: false,
            errors: ['Structure must contain at least one block']
        };
    }
    
    if (blocks.length > 100) {
        return {
            valid: false,
            errors: ['Structure too complex (maximum 100 blocks)']
        };
    }
    
    const allErrors = [];
    const blockErrors = [];
    
    blocks.forEach((block, index) => {
        const validation = validateBlock(block);
        if (!validation.valid) {
            blockErrors.push({
                blockIndex: index,
                errors: validation.errors
            });
            allErrors.push(...validation.errors.map(e => `Block ${index}: ${e}`));
        }
    });
    
    // Check for disconnected components (basic check)
    // This is a simplified check - full connectivity analysis would be more complex
    const positions = blocks.map(b => b.pos);
    const minX = Math.min(...positions.map(p => p[0]));
    const maxX = Math.max(...positions.map(p => p[0]));
    const minY = Math.min(...positions.map(p => p[1]));
    const maxY = Math.max(...positions.map(p => p[1]));
    const minZ = Math.min(...positions.map(p => p[2]));
    const maxZ = Math.max(...positions.map(p => p[2]));
    
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const spanZ = maxZ - minZ;
    
    // Warn if structure is too spread out (might be disconnected)
    if (spanX > 30 || spanY > 30 || spanZ > 30) {
        allErrors.push('Structure spans too large an area (possible disconnected components)');
    }
    
    return {
        valid: allErrors.length === 0,
        errors: allErrors,
        blockErrors
    };
}

/**
 * Clamp parameter to valid range
 */
export function clampParameter(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Validate and clamp template parameters
 */
export function validateAndClampParameters(template, params, intent) {
    const validated = { ...params };
    const ranges = template.paramRanges;
    
    // Clamp all parameters to valid ranges
    Object.keys(ranges).forEach(key => {
        const range = ranges[key];
        validated[key] = clampParameter(validated[key], range.min, range.max);
    });
    
    // Adjust parameters based on intent
    if (intent === 'intentionally_unstable') {
        // Make structures taller/narrower for instability
        if (validated.height && validated.width) {
            validated.height = Math.min(validated.height * 1.5, ranges.height.max);
            validated.width = Math.max(validated.width * 0.7, ranges.width.min);
            validated.depth = Math.max(validated.depth * 0.7, ranges.depth.min);
        }
    } else if (intent === 'stable') {
        // Make structures more stable
        if (validated.height && validated.width) {
            validated.width = Math.max(validated.width, validated.height * 0.2);
            validated.depth = Math.max(validated.depth, validated.height * 0.2);
        }
    }
    
    return validated;
}

