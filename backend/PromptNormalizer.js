/**
 * PROMPT NORMALIZATION LAYER
 * 
 * Normalizes user intent into one of three modes before template selection.
 * This prevents AI from interpreting intent incorrectly.
 */

export const IntentModes = {
    STABLE: 'stable',
    INTENTIONALLY_UNSTABLE: 'intentionally_unstable',
    BORDERLINE: 'borderline'
};

/**
 * Normalize user prompt to determine intent
 */
export function normalizeIntent(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Keywords for intentionally unstable
    const unstableKeywords = [
        'unstable', 'weak', 'collapse', 'fail', 'fragile', 'break',
        'unsafe', 'dangerous', 'risky', 'demonstrate failure', 'show collapse'
    ];
    
    // Keywords for stable
    const stableKeywords = [
        'stable', 'strong', 'solid', 'safe', 'robust', 'secure',
        'demo', 'demonstration', 'example', 'standard', 'normal'
    ];
    
    // Keywords for borderline/testing
    const borderlineKeywords = [
        'test', 'testing', 'borderline', 'marginal', 'limit', 'edge case',
        'challenge', 'stress test', 'evaluate'
    ];
    
    // Check for unstable intent
    if (unstableKeywords.some(keyword => lowerPrompt.includes(keyword))) {
        return IntentModes.INTENTIONALLY_UNSTABLE;
    }
    
    // Check for stable intent
    if (stableKeywords.some(keyword => lowerPrompt.includes(keyword))) {
        return IntentModes.STABLE;
    }
    
    // Check for borderline intent
    if (borderlineKeywords.some(keyword => lowerPrompt.includes(keyword))) {
        return IntentModes.BORDERLINE;
    }
    
    // Default to stable for safety
    return IntentModes.STABLE;
}

/**
 * Map prompt to template name
 */
export function mapPromptToTemplate(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Tower/stack keywords
    if (lowerPrompt.includes('tower') || lowerPrompt.includes('stack') || 
        lowerPrompt.includes('column') || lowerPrompt.includes('pillar') ||
        lowerPrompt.includes('vertical')) {
        return 'tower_stack';
    }
    
    // Bridge keywords
    if (lowerPrompt.includes('bridge') || lowerPrompt.includes('span') ||
        lowerPrompt.includes('cross') || lowerPrompt.includes('connect')) {
        return 'truss_bridge';
    }
    
    // Frame/building keywords
    if (lowerPrompt.includes('frame') || lowerPrompt.includes('building') ||
        lowerPrompt.includes('structure') || lowerPrompt.includes('rigid') ||
        lowerPrompt.includes('box')) {
        return 'frame_box';
    }
    
    // Cantilever/overhang keywords
    if (lowerPrompt.includes('cantilever') || lowerPrompt.includes('overhang') ||
        lowerPrompt.includes('beam') || lowerPrompt.includes('extend')) {
        return 'cantilever_beam';
    }
    
    // Default to tower_stack
    return 'tower_stack';
}

