/**
 * TEMPLATE GEOMETRY BUILDER
 * 
 * Expands template parameters into deterministic block arrays.
 * NO AI INVOLVEMENT - Pure parametric generation.
 */

import { getTemplate } from './StructureTemplates.js';
import { validateStructure } from './GeometryValidator.js';

/**
 * Build geometry from template and parameters
 */
export function buildGeometryFromTemplate(templateName, parameters) {
    const template = getTemplate(templateName);
    
    if (!template) {
        throw new Error(`Unknown template: ${templateName}`);
    }
    
    // Generate blocks using template
    const blocks = template.generate(parameters);
    
    // Validate generated geometry
    const validation = validateStructure(blocks);
    
    if (!validation.valid) {
        console.warn('⚠️ Generated geometry failed validation:', validation.errors);
        // Return empty array - system should regenerate
        return [];
    }
    
    return blocks;
}

/**
 * Generate variant by adjusting parameters
 */
export function generateVariant(templateName, baseParams, variantIndex, totalVariants) {
    const template = getTemplate(templateName);
    const ranges = template.paramRanges;
    
    // Create parameter variation
    const variantParams = { ...baseParams };
    
    // Vary parameters based on variant index
    const variationFactor = (variantIndex / totalVariants) * 0.4 + 0.8; // 0.8 to 1.2
    
    // Helper function to clamp values
    function clamp(value, min, max) {
        if (!isFinite(value)) return min;
        return Math.max(min, Math.min(max, value));
    }
    
    if (variantParams.height) {
        variantParams.height = clamp(
            variantParams.height * variationFactor,
            ranges.height.min,
            ranges.height.max
        );
    }
    
    if (variantParams.width) {
        variantParams.width = clamp(
            variantParams.width * (1 / variationFactor),
            ranges.width.min,
            ranges.width.max
        );
    }
    
    if (variantParams.span) {
        variantParams.span = clamp(
            variantParams.span * variationFactor,
            ranges.span.min,
            ranges.span.max
        );
    }
    
    // Vary levels if applicable
    if (variantParams.levels && ranges.levels.max > 0) {
        const levelVariation = Math.floor((variantIndex % 3) - 1); // -1, 0, or +1
        variantParams.levels = clamp(
            variantParams.levels + levelVariation,
            ranges.levels.min,
            ranges.levels.max
        );
    }
    
    return buildGeometryFromTemplate(templateName, variantParams);
}

