import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GradientAIClient } from './GradientAIClient.js';
import { normalizeIntent, mapPromptToTemplate } from './PromptNormalizer.js';
import { getTemplate } from './StructureTemplates.js';
import { validateAndClampParameters } from './GeometryValidator.js';
import { buildGeometryFromTemplate, generateVariant } from './TemplateGeometryBuilder.js';

// Re-export for easier access
export { normalizeIntent, mapPromptToTemplate } from './PromptNormalizer.js';
export { getTemplate } from './StructureTemplates.js';
export { validateAndClampParameters } from './GeometryValidator.js';
export { buildGeometryFromTemplate, generateVariant } from './TemplateGeometryBuilder.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize DigitalOcean GradientAI client
const gradientAI = new GradientAIClient(
    process.env.DIGITALOCEAN_INFERENCE_KEY,
    process.env.GRADIENT_MODEL || 'llama3.3-70b-instruct'
);

// Middleware
app.use(cors()); // Allow all origins for development
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'VR Structural Playground Backend is running' });
});

// Generate structure endpoint - FREE-FORM GEOMETRY GENERATION
app.post('/api/generate-structure', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log('📐 Generating structure from prompt:', prompt);

        // AI generates free-form block geometry based on prompt
        const message = await gradientAI.messages_create({
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: `You are a structural engineer creating a 3D structure from a user's description.

USER PROMPT: "${prompt}"

Generate a structure that EXACTLY matches what the user asked for. Create blocks using the following format:

AVAILABLE BLOCK TYPES:
- "cube": Standard cube
- "rectangular_prism": Vertical rectangular block
- "horizontal_rectangular_prism": Horizontal rectangular block
- "pyramid": Pyramid/triangular block
- "cylinder": Cylindrical block

OUTPUT FORMAT (ONLY JSON, no markdown, no explanations):
{
  "blocks": [
    {
      "type": "cube" | "rectangular_prism" | "horizontal_rectangular_prism" | "pyramid" | "cylinder",
      "pos": [x, y, z],  // Position in 3D space (meters)
      "size": [width, height, depth]  // Dimensions in meters (all positive, reasonable sizes 0.1-5.0)
    },
    ...
  ]
}

RULES:
- All blocks must be grounded (y position should be at least size[1]/2 to touch ground)
- Use reasonable dimensions (0.1 to 5.0 meters)
- Create structures that match the prompt exactly (e.g., "bridge" = spans with supports, "tower" = vertical stack, "house" = building shape)
- Ensure blocks are physically connected and stable
- Use appropriate block types for the structure (e.g., cylinders for columns, cubes for building blocks)
- Minimum 1 block, maximum 50 blocks
- All positions and sizes must be numeric arrays of length 3
- Output ONLY the JSON object, nothing else

CRITICAL: Output ONLY valid JSON. No markdown, no explanations, no text before or after. Start with { and end with }.`
            }]
        });

        const responseText = message.text || message.content[0].text;
        console.log('✅ AI structure generation:', responseText.substring(0, 200));

        // Parse AI response
        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        let aiOutput;
        try {
            aiOutput = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError.message);
            // Try to repair common issues
            cleanText = cleanText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
            try {
                aiOutput = JSON.parse(cleanText);
            } catch (repairError) {
                throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
            }
        }

        // Validate and fix the generated structure
        if (!aiOutput.blocks || !Array.isArray(aiOutput.blocks)) {
            throw new Error('AI response missing blocks array');
        }

        // Validate each block
        const validatedBlocks = [];
        for (const block of aiOutput.blocks) {
            if (!block.type || !block.pos || !block.size) {
                console.warn('⚠️ Skipping invalid block:', block);
                continue;
            }

            // Validate block type
            const validTypes = ['cube', 'rectangular_prism', 'horizontal_rectangular_prism', 'pyramid', 'cylinder'];
            if (!validTypes.includes(block.type)) {
                console.warn(`⚠️ Invalid block type: ${block.type}, defaulting to cube`);
                block.type = 'cube';
            }

            // Validate and clamp dimensions
            const size = [
                Math.max(0.1, Math.min(5.0, block.size[0] || 0.5)),
                Math.max(0.1, Math.min(5.0, block.size[1] || 0.5)),
                Math.max(0.1, Math.min(5.0, block.size[2] || 0.5))
            ];

            // Ensure block is grounded (y position at least half height)
            const pos = [
                block.pos[0] || 0,
                Math.max(size[1] / 2, block.pos[1] || size[1] / 2), // Ground at y = size[1]/2
                block.pos[2] || 0
            ];

            validatedBlocks.push({
                type: block.type,
                pos: pos,
                size: size
            });
        }

        if (validatedBlocks.length === 0) {
            throw new Error('No valid blocks generated');
        }

        console.log(`✅ Generated ${validatedBlocks.length} blocks`);

        res.json({ success: true, data: validatedBlocks });
    } catch (error) {
        console.error('❌ Error generating structure:', error);
        res.status(500).json({
            error: 'Failed to generate structure',
            details: error.message
        });
    }
});

// Analyze structure endpoint
app.post('/api/analyze-structure', async (req, res) => {
    try {
        const { sceneDescription } = req.body;

        if (!sceneDescription) {
            return res.status(400).json({ error: 'Scene description is required' });
        }

        console.log('🔍 Analyzing structure...');

        const message = await gradientAI.messages_create({
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: `Analyze this structural engineering layout for stability and suggest improvements. The scene contains:
${sceneDescription}

Provide:
1. A brief stability assessment (2-3 sentences)
2. Specific weak points or floating blocks
3. One actionable improvement suggestion

Keep the response concise and practical.`
            }]
        });

        const feedback = message.text || message.content[0].text;
        console.log('✅ Analysis complete');

        res.json({ success: true, feedback });
    } catch (error) {
        console.error('❌ Error analyzing structure:', error);
        res.status(500).json({
            error: 'Failed to analyze structure',
            details: error.message
        });
    }
});

// Vector Analysis Endpoint (5-Agent System)
app.post('/api/analyze-vector', async (req, res) => {
    try {
        const { vectorId, vectorData, structureData } = req.body;

        if (!vectorId || !vectorData || !structureData) {
            return res.status(400).json({ error: 'Missing required data (vectorId, vectorData, structureData)' });
        }

        console.log(`🧮 Running 5-Agent Analysis for Vector #${vectorId}...`);

        const systemPrompt = `You are a sophisticated 5-Agent Structural Analysis System. 
You will perform a deep analysis of a specific force vector applied to a structure.

INPUT DATA:
Vector ID: ${vectorId}
Vector: ${JSON.stringify(vectorData)}
Structure: ${JSON.stringify(structureData)}

You must act as 5 distinct agents and output a SINGLE JSON object containing the results from all agents.

CRITICAL: Your response must be ONLY valid JSON. Do NOT include any explanatory text, markdown, or comments before or after the JSON. Start your response with { and end with }.

AGENTS & RESPONSIBILITIES:

1. 🧠 Structural Reasoning Agent:
   - Trace the load path from the vector origin.
   - Identify which blocks carry the load.
   - Detect potential failure modes (compression, tension, shear, overturning).
   - Estimate a safety factor (heuristic).

2. 📐 Math Derivation Agent:
   - Provide relevant physics equations for the identified stress.
   - Show a step-by-step calculation using the vector magnitude.
   - Use LaTeX format for equations (e.g., \\sigma = F/A).
   - CRITICAL: In JSON strings, escape backslashes as \\\\ (double backslash) for LaTeX.
   - Example: "equations": ["\\\\sigma = F/A", "\\\\tau = V/A"]

3. 🎨 Visualization Mapping Agent:
   - Return a list of "highlights" (blockId, color hex, opacity) to visualize stress.
   - Return a list of "arrows" (start, end, color) to show load path.
   - Use Green (#00FF00) for safe, Yellow (#FFFF00) for warning, Red (#FF0000) for critical.

4. 📝 Technical Report Writer Agent:
   - Write a concise "summary" of the analysis.
   - Provide a "riskAssessment" (Low/Medium/High).
   - Give a "recommendation" for improvement.

5. ✅ Verification Agent:
   - Check if the results are physically plausible.
   - Set "valid": true/false.

CRITICAL: You MUST output ONLY valid JSON. No explanations, no markdown, no text before or after the JSON.

OUTPUT FORMAT (ONLY JSON, NO OTHER TEXT):
{
  "reasoning": {
    "stressPath": [blockIds...],
    "criticalBlockId": number,
    "failureMode": "string",
    "safetyFactor": number,
    "explanation": "string"
  },
  "math": {
    "equations": ["string (LaTeX)..."],
    "steps": ["string..."]
  },
  "visualization": {
    "highlights": [{"blockId": number, "color": "hex", "opacity": number}],
    "arrows": [{"start": [x,y,z], "end": [x,y,z], "color": "hex", "label": "string"}]
  },
  "report": {
    "summary": "string",
    "riskAssessment": "string",
    "recommendation": "string"
  },
  "verification": {
    "valid": boolean,
    "confidence": number
  }
}

REMEMBER: Output ONLY the JSON object above. No "Here is...", no explanations, no markdown code blocks. Just the raw JSON.`;

        const message = await gradientAI.messages_create({
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: systemPrompt
            }]
        });

        const responseText = message.text || message.content[0].text;
        console.log('✅ Agent Analysis Complete');
        console.log('📥 Raw response length:', responseText.length);
        console.log('📥 Raw response preview:', responseText.substring(0, 200));

        // Extract JSON from response (handle cases where AI adds explanatory text)
        let cleanText = responseText.trim();

        // Remove markdown code blocks if present
        cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();

        // Try to find JSON object in the response
        // Look for first { and last } - but be smarter about nested braces
        const firstBrace = cleanText.indexOf('{');
        let lastBrace = cleanText.lastIndexOf('}');

        // If we found braces, extract the JSON portion
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
            console.log('📦 Extracted JSON from response');
        } else {
            console.warn('⚠️ Could not find JSON braces, using full response');
        }

        // Helper function to repair common JSON issues, especially truncated LaTeX strings
        const repairJSON = (jsonString) => {
            let repaired = jsonString;

            // First, try to find and fix incomplete strings in arrays (common with LaTeX equations)
            // Look for patterns like: "equations": ["\\sigma = F/A", "\\tau = 
            // and close them properly
            const incompleteStringPattern = /("equations"\s*:\s*\[[^\]]*")([^"]*?)(?=\s*[,\]\}])/g;
            let match;
            while ((match = incompleteStringPattern.exec(repaired)) !== null) {
                const incompletePart = match[2];
                // If the incomplete part doesn't end with a quote, it's likely truncated
                if (!incompletePart.endsWith('"') && incompletePart.length > 0) {
                    // Find where to insert the closing quote
                    const matchEnd = match.index + match[0].length;
                    // Check if there's a comma, bracket, or brace after
                    const afterMatch = repaired.substring(matchEnd);
                    const nextComma = afterMatch.indexOf(',');
                    const nextBracket = afterMatch.indexOf(']');
                    const nextBrace = afterMatch.indexOf('}');

                    let insertPos = matchEnd;
                    if (nextComma !== -1 && (nextBracket === -1 || nextComma < nextBracket)) {
                        insertPos = matchEnd + nextComma;
                        repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                    } else if (nextBracket !== -1) {
                        insertPos = matchEnd + nextBracket;
                        repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                    } else if (nextBrace !== -1) {
                        insertPos = matchEnd + nextBrace;
                        repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                    }
                    break; // Only fix the first occurrence to avoid infinite loops
                }
            }

            // Fix incomplete strings (common when JSON is cut off)
            // Count quotes to see if we have unclosed strings
            const quoteCount = (repaired.match(/"/g) || []).length;
            if (quoteCount % 2 !== 0) {
                // Odd number of quotes means unclosed string
                // Find the last unescaped quote
                let lastQuoteIndex = -1;
                for (let i = repaired.length - 1; i >= 0; i--) {
                    if (repaired[i] === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
                        lastQuoteIndex = i;
                        break;
                    }
                }

                if (lastQuoteIndex !== -1) {
                    const afterLastQuote = repaired.substring(lastQuoteIndex + 1);
                    // If there's content after the last quote that looks incomplete, close it
                    if (afterLastQuote.trim() && !afterLastQuote.trim().match(/^\s*[:,\]\}]/)) {
                        // Find where the string should end
                        const nextComma = afterLastQuote.indexOf(',');
                        const nextBrace = afterLastQuote.indexOf('}');
                        const nextBracket = afterLastQuote.indexOf(']');

                        let insertPos = lastQuoteIndex + 1;
                        if (nextComma !== -1 && nextComma < 50) { // Only if comma is close
                            insertPos = lastQuoteIndex + 1 + nextComma;
                            repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                        } else if (nextBracket !== -1 && nextBracket < 50) {
                            insertPos = lastQuoteIndex + 1 + nextBracket;
                            repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                        } else if (nextBrace !== -1 && nextBrace < 50) {
                            insertPos = lastQuoteIndex + 1 + nextBrace;
                            repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                        } else {
                            // Just close it at the end if we can't find a good spot
                            repaired += '"';
                        }
                    }
                }
            }

            // Fix incomplete arrays/objects at the end
            const openBraces = (repaired.match(/{/g) || []).length;
            const closeBraces = (repaired.match(/}/g) || []).length;
            const openBrackets = (repaired.match(/\[/g) || []).length;
            const closeBrackets = (repaired.match(/\]/g) || []).length;

            // Close unclosed arrays first (they're inside objects)
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
                repaired += ']';
            }
            // Then close unclosed objects
            for (let i = 0; i < openBraces - closeBraces; i++) {
                repaired += '}';
            }

            return repaired;
        };

        let analysisData;
        try {
            analysisData = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError.message);
            console.error('❌ Attempted to parse (first 500 chars):', cleanText.substring(0, 500));

            // Try to repair the JSON
            console.log('🔧 Attempting to repair JSON...');
            try {
                const repaired = repairJSON(cleanText);
                analysisData = JSON.parse(repaired);
                console.log('✅ JSON repair successful!');
            } catch (repairError) {
                console.error('❌ JSON repair failed:', repairError.message);

                // Last resort: try to extract just the essential parts manually
                console.log('🔧 Attempting manual extraction...');
                try {
                    // Try to extract each section individually using regex
                    const reasoningMatch = cleanText.match(/"reasoning"\s*:\s*\{[^}]*"explanation"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
                    const mathMatch = cleanText.match(/"math"\s*:\s*\{[^}]*"equations"\s*:\s*\[(.*?)\]/s);
                    const reportMatch = cleanText.match(/"report"\s*:\s*\{[^}]*"summary"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
                    const verificationMatch = cleanText.match(/"verification"\s*:\s*\{[^}]*"valid"\s*:\s*(true|false)/);

                    // If we can extract some data, create a partial response
                    if (reasoningMatch || mathMatch || reportMatch || verificationMatch) {
                        console.warn('⚠️ Using partial data extraction due to JSON parse failure');
                        analysisData = {
                            reasoning: {
                                stressPath: [1],
                                criticalBlockId: 1,
                                failureMode: "compression",
                                safetyFactor: 1.0,
                                explanation: reasoningMatch ? reasoningMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : "Analysis incomplete due to JSON parsing error."
                            },
                            math: {
                                equations: mathMatch ? mathMatch[1].split(',').map((eq) => eq.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\\\/g, '\\')) : ["\\sigma = F/A"],
                                steps: ["Analysis incomplete - please try again."]
                            },
                            visualization: {
                                highlights: [],
                                arrows: []
                            },
                            report: {
                                summary: reportMatch ? reportMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : "Analysis encountered a parsing error. Please try running the analysis again.",
                                riskAssessment: "Unknown",
                                recommendation: "Please retry the analysis to get complete results."
                            },
                            verification: {
                                valid: false,
                                confidence: 0.0
                            }
                        };
                        console.warn('⚠️ Returning partial analysis data');
                    } else {
                        throw new Error(`Invalid JSON response from AI: ${parseError.message}. Could not repair or extract partial data.`);
                    }
                } catch (extractError) {
                    console.error('❌ Manual extraction also failed:', extractError.message);
                    throw new Error(`Invalid JSON response from AI: ${parseError.message}. Response preview: ${cleanText.substring(0, 200)}`);
                }
            }
        }

        res.json({ success: true, data: analysisData });
    } catch (error) {
        console.error('❌ Error in vector analysis:', error);
        res.status(500).json({
            error: 'Failed to analyze vector',
            details: error.message
        });
    }
});

// Block Analysis Endpoint (5-Agent System per block)
app.post('/api/analyze-block', async (req, res) => {
    try {
        const { blockId, blockData, structureData, vectorData } = req.body;

        if (!blockId || !blockData || !structureData) {
            return res.status(400).json({ error: 'Missing required data (blockId, blockData, structureData)' });
        }

        console.log(`🧮 Running 5-Agent Analysis for Block #${blockId}...`);

        const systemPrompt = `You are a sophisticated 5-Agent Structural Analysis System. 
You will perform a deep analysis of stress and forces on a specific block in a structure.

INPUT DATA:
Block ID: ${blockId}
Block Data: ${JSON.stringify(blockData)}
Structure: ${JSON.stringify(structureData)}
${vectorData ? `Force Vectors: ${JSON.stringify(vectorData)}` : 'No force vectors applied'}

You must act as 5 distinct agents and output a SINGLE JSON object containing the results from all agents.

CRITICAL: Your response must be ONLY valid JSON. Do NOT include any explanatory text, markdown, or comments before or after the JSON. Start your response with { and end with }.

AGENTS & RESPONSIBILITIES:

1. 🧠 Structural Reasoning Agent:
   - Analyze the stress distribution on this specific block.
   - Identify load paths through this block.
   - Detect potential failure modes (compression, tension, shear, bending).
   - Estimate a safety factor (heuristic).

2. 📐 Math Derivation Agent:
   - Provide relevant physics equations for the stress on this block.
   - Show step-by-step calculations using block dimensions and forces.
   - Use LaTeX format for equations (e.g., \\sigma = F/A).
   - CRITICAL: In JSON strings, escape backslashes as \\\\ (double backslash) for LaTeX.
   - Example: "equations": ["\\\\sigma = F/A", "\\\\tau = V/A"]

3. 🎨 Visualization Mapping Agent:
   - Return stress level for this block (color hex, opacity).
   - Use Green (#00FF00) for safe, Yellow (#FFFF00) for warning, Red (#FF0000) for critical.

4. 📝 Technical Report Writer Agent:
   - Write a concise "summary" of the block's stress analysis.
   - Provide a "riskAssessment" (Low/Medium/High).
   - Give a "recommendation" for this specific block.

5. ✅ Verification Agent:
   - Check if the results are physically plausible.
   - Set "valid": true/false.

CRITICAL: You MUST output ONLY valid JSON. No explanations, no markdown, no text before or after the JSON.

OUTPUT FORMAT (ONLY JSON, NO OTHER TEXT):
{
  "reasoning": {
    "stressType": "string (compression/tension/shear/bending)",
    "failureMode": "string",
    "safetyFactor": number,
    "explanation": "string"
  },
  "math": {
    "equations": ["string (LaTeX)..."],
    "steps": ["string..."]
  },
  "visualization": {
    "color": "hex",
    "opacity": number
  },
  "report": {
    "summary": "string",
    "riskAssessment": "string",
    "recommendation": "string"
  },
  "verification": {
    "valid": boolean,
    "confidence": number
  }
}

REMEMBER: Output ONLY the JSON object above. No "Here is...", no explanations, no markdown code blocks. Just the raw JSON.`;

        const message = await gradientAI.messages_create({
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: systemPrompt
            }]
        });

        const responseText = message.text || message.content[0].text;
        console.log(`✅ Block #${blockId} Analysis Complete`);

        // Extract JSON from response (same logic as vector analysis)
        let cleanText = responseText.trim();
        cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        // Use the same repair function
        const repairJSON = (jsonString) => {
            let repaired = jsonString;

            // Fix incomplete strings in arrays
            const incompleteStringPattern = /("equations"\s*:\s*\[[^\]]*")([^"]*?)(?=\s*[,\]\}])/g;
            let match;
            while ((match = incompleteStringPattern.exec(repaired)) !== null) {
                const incompletePart = match[2];
                if (!incompletePart.endsWith('"') && incompletePart.length > 0) {
                    const matchEnd = match.index + match[0].length;
                    const afterMatch = repaired.substring(matchEnd);
                    const nextComma = afterMatch.indexOf(',');
                    const nextBracket = afterMatch.indexOf(']');
                    const nextBrace = afterMatch.indexOf('}');

                    let insertPos = matchEnd;
                    if (nextComma !== -1 && (nextBracket === -1 || nextComma < nextBracket)) {
                        insertPos = matchEnd + nextComma;
                        repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                    } else if (nextBracket !== -1) {
                        insertPos = matchEnd + nextBracket;
                        repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                    } else if (nextBrace !== -1) {
                        insertPos = matchEnd + nextBrace;
                        repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                    }
                    break;
                }
            }

            const quoteCount = (repaired.match(/"/g) || []).length;
            if (quoteCount % 2 !== 0) {
                let lastQuoteIndex = -1;
                for (let i = repaired.length - 1; i >= 0; i--) {
                    if (repaired[i] === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
                        lastQuoteIndex = i;
                        break;
                    }
                }

                if (lastQuoteIndex !== -1) {
                    const afterLastQuote = repaired.substring(lastQuoteIndex + 1);
                    if (afterLastQuote.trim() && !afterLastQuote.trim().match(/^\s*[:,\]\}]/)) {
                        const nextComma = afterLastQuote.indexOf(',');
                        const nextBracket = afterLastQuote.indexOf(']');
                        const nextBrace = afterLastQuote.indexOf('}');

                        let insertPos = lastQuoteIndex + 1;
                        if (nextComma !== -1 && nextComma < 50) {
                            insertPos = lastQuoteIndex + 1 + nextComma;
                            repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                        } else if (nextBracket !== -1 && nextBracket < 50) {
                            insertPos = lastQuoteIndex + 1 + nextBracket;
                            repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                        } else if (nextBrace !== -1 && nextBrace < 50) {
                            insertPos = lastQuoteIndex + 1 + nextBrace;
                            repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                        } else {
                            repaired += '"';
                        }
                    }
                }
            }

            const openBraces = (repaired.match(/{/g) || []).length;
            const closeBraces = (repaired.match(/}/g) || []).length;
            const openBrackets = (repaired.match(/\[/g) || []).length;
            const closeBrackets = (repaired.match(/\]/g) || []).length;

            for (let i = 0; i < openBrackets - closeBrackets; i++) {
                repaired += ']';
            }
            for (let i = 0; i < openBraces - closeBraces; i++) {
                repaired += '}';
            }

            return repaired;
        };

        let analysisData;
        try {
            analysisData = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError.message);
            try {
                const repaired = repairJSON(cleanText);
                analysisData = JSON.parse(repaired);
                console.log('✅ JSON repair successful!');
            } catch (repairError) {
                console.error('❌ JSON repair failed:', repairError.message);
                throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
            }
        }

        res.json({ success: true, data: analysisData, blockId });
    } catch (error) {
        console.error('❌ Error in block analysis:', error);
        res.status(500).json({
            error: 'Failed to analyze block',
            details: error.message
        });
    }
});

// Comprehensive Analysis Endpoint (analyzes all blocks + summary)
app.post('/api/comprehensive-analysis', async (req, res) => {
    try {
        const { structureData, vectorData } = req.body;

        if (!structureData || !Array.isArray(structureData) || structureData.length === 0) {
            return res.status(400).json({ error: 'Missing or empty structureData' });
        }

        console.log(`🧮 Running Comprehensive Analysis for ${structureData.length} blocks...`);

        // Step 1: Analyze each block with 5 agents
        const blockAnalyses = [];
        for (const block of structureData) {
            try {
                console.log(`  📦 Analyzing Block #${block.id}...`);
                const blockAnalysisPrompt = `You are a sophisticated 5-Agent Structural Analysis System. 
You will perform a deep analysis of stress and forces on Block #${block.id} in a structure.

INPUT DATA:
Block ID: ${block.id}
Block Position: [${block.pos.join(', ')}]
Block Size: [${block.size.join(', ')}]
Block Material: ${block.material || 'steel'}
All Blocks: ${JSON.stringify(structureData)}
${vectorData ? `Force Vectors: ${JSON.stringify(vectorData)}` : 'No force vectors applied'}

You must act as 5 distinct agents and output a SINGLE JSON object.

CRITICAL: Your response must be ONLY valid JSON. Do NOT include any explanatory text, markdown, or comments before or after the JSON. Start your response with { and end with }.

AGENTS & RESPONSIBILITIES:

1. 🧠 Structural Reasoning Agent:
   - Analyze stress distribution on Block #${block.id}.
   - Identify load paths through this block.
   - Detect potential failure modes (compression, tension, shear, bending).
   - Estimate a safety factor (heuristic).

2. 📐 Math Derivation Agent:
   - Provide relevant physics equations for stress on this block.
   - Show step-by-step calculations using block dimensions and forces.
   - Use LaTeX format for equations (e.g., \\sigma = F/A).
   - CRITICAL: In JSON strings, escape backslashes as \\\\ (double backslash) for LaTeX.

3. 🎨 Visualization Mapping Agent:
   - Return stress level for this block (color hex, opacity).
   - Use Green (#00FF00) for safe, Yellow (#FFFF00) for warning, Red (#FF0000) for critical.

4. 📝 Technical Report Writer Agent:
   - Write a concise "summary" of the block's stress analysis.
   - Provide a "riskAssessment" (Low/Medium/High).
   - Give a "recommendation" for this specific block.

5. ✅ Verification Agent:
   - Check if the results are physically plausible.
   - Set "valid": true/false.

OUTPUT FORMAT (ONLY JSON, NO OTHER TEXT):
{
  "blockId": ${block.id},
  "reasoning": {
    "stressType": "string",
    "failureMode": "string",
    "safetyFactor": number,
    "explanation": "string"
  },
  "math": {
    "equations": ["string (LaTeX)..."],
    "steps": ["string..."]
  },
  "visualization": {
    "color": "hex",
    "opacity": number
  },
  "report": {
    "summary": "string",
    "riskAssessment": "string",
    "recommendation": "string"
  },
  "verification": {
    "valid": boolean,
    "confidence": number
  }
}

REMEMBER: Output ONLY the JSON object above. No "Here is...", no explanations, no markdown code blocks. Just the raw JSON.`;

                const message = await gradientAI.messages_create({
                    max_tokens: 2048,
                    messages: [{
                        role: 'user',
                        content: blockAnalysisPrompt
                    }]
                });

                const responseText = message.text || message.content[0].text;

                // Extract JSON
                let cleanText = responseText.trim();
                cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
                const firstBrace = cleanText.indexOf('{');
                const lastBrace = cleanText.lastIndexOf('}');

                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    cleanText = cleanText.substring(firstBrace, lastBrace + 1);
                }

                // Repair JSON if needed (same function as vector analysis)
                const repairJSON = (jsonString) => {
                    let repaired = jsonString;
                    const incompleteStringPattern = /("equations"\s*:\s*\[[^\]]*")([^"]*?)(?=\s*[,\]\}])/g;
                    let match;
                    while ((match = incompleteStringPattern.exec(repaired)) !== null) {
                        const incompletePart = match[2];
                        if (!incompletePart.endsWith('"') && incompletePart.length > 0) {
                            const matchEnd = match.index + match[0].length;
                            const afterMatch = repaired.substring(matchEnd);
                            const nextComma = afterMatch.indexOf(',');
                            const nextBracket = afterMatch.indexOf(']');
                            const nextBrace = afterMatch.indexOf('}');

                            let insertPos = matchEnd;
                            if (nextComma !== -1 && (nextBracket === -1 || nextComma < nextBracket)) {
                                insertPos = matchEnd + nextComma;
                                repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                            } else if (nextBracket !== -1) {
                                insertPos = matchEnd + nextBracket;
                                repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                            } else if (nextBrace !== -1) {
                                insertPos = matchEnd + nextBrace;
                                repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                            }
                            break;
                        }
                    }

                    const quoteCount = (repaired.match(/"/g) || []).length;
                    if (quoteCount % 2 !== 0) {
                        let lastQuoteIndex = -1;
                        for (let i = repaired.length - 1; i >= 0; i--) {
                            if (repaired[i] === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
                                lastQuoteIndex = i;
                                break;
                            }
                        }

                        if (lastQuoteIndex !== -1) {
                            const afterLastQuote = repaired.substring(lastQuoteIndex + 1);
                            if (afterLastQuote.trim() && !afterLastQuote.trim().match(/^\s*[:,\]\}]/)) {
                                const nextComma = afterLastQuote.indexOf(',');
                                const nextBracket = afterLastQuote.indexOf(']');
                                const nextBrace = afterLastQuote.indexOf('}');

                                let insertPos = lastQuoteIndex + 1;
                                if (nextComma !== -1 && nextComma < 50) {
                                    insertPos = lastQuoteIndex + 1 + nextComma;
                                    repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                                } else if (nextBracket !== -1 && nextBracket < 50) {
                                    insertPos = lastQuoteIndex + 1 + nextBracket;
                                    repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                                } else if (nextBrace !== -1 && nextBrace < 50) {
                                    insertPos = lastQuoteIndex + 1 + nextBrace;
                                    repaired = repaired.substring(0, insertPos) + '"' + repaired.substring(insertPos);
                                } else {
                                    repaired += '"';
                                }
                            }
                        }
                    }

                    const openBraces = (repaired.match(/{/g) || []).length;
                    const closeBraces = (repaired.match(/}/g) || []).length;
                    const openBrackets = (repaired.match(/\[/g) || []).length;
                    const closeBrackets = (repaired.match(/\]/g) || []).length;

                    for (let i = 0; i < openBrackets - closeBrackets; i++) {
                        repaired += ']';
                    }
                    for (let i = 0; i < openBraces - closeBraces; i++) {
                        repaired += '}';
                    }

                    return repaired;
                };

                let blockAnalysis;
                try {
                    blockAnalysis = JSON.parse(cleanText);
                } catch (parseError) {
                    try {
                        const repaired = repairJSON(cleanText);
                        blockAnalysis = JSON.parse(repaired);
                    } catch (repairError) {
                        console.warn(`⚠️ Failed to parse analysis for Block #${block.id}, skipping...`);
                        continue;
                    }
                }

                blockAnalyses.push({
                    blockId: block.id,
                    analysis: blockAnalysis
                });
            } catch (error) {
                console.error(`❌ Error analyzing Block #${block.id}:`, error);
                // Continue with other blocks even if one fails
            }
        }

        if (blockAnalyses.length === 0) {
            throw new Error('No blocks could be analyzed');
        }

        console.log(`✅ Analyzed ${blockAnalyses.length} blocks, generating summary...`);

        // Step 2: Summary agent analyzes overall stress from all block analyses
        const summaryPrompt = `You are a Summary Agent for Comprehensive Structural Analysis.
You will synthesize the results from ${blockAnalyses.length} individual block analyses into an overall structural assessment.

BLOCK ANALYSES:
${JSON.stringify(blockAnalyses, null, 2)}

STRUCTURE DATA:
${JSON.stringify(structureData)}

${vectorData ? `FORCE VECTORS:\n${JSON.stringify(vectorData)}` : 'No force vectors applied'}

You must output a SINGLE JSON object with overall structural assessment.

CRITICAL: Your response must be ONLY valid JSON. Do NOT include any explanatory text, markdown, or comments before or after the JSON. Start your response with { and end with }.

OUTPUT FORMAT (ONLY JSON, NO OTHER TEXT):
{
  "overallSummary": "string - Overall structural health assessment",
  "criticalBlocks": [blockIds...],
  "overallRisk": "Low" | "Medium" | "High",
  "keyFindings": ["string..."],
  "recommendations": ["string..."],
  "safetyFactor": number,
  "structuralIntegrity": "string - assessment of overall integrity"
}

REMEMBER: Output ONLY the JSON object above. No "Here is...", no explanations, no markdown code blocks. Just the raw JSON.`;

        const summaryMessage = await gradientAI.messages_create({
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: summaryPrompt
            }]
        });

        const summaryResponseText = summaryMessage.text || summaryMessage.content[0].text;

        // Extract JSON from summary
        let summaryCleanText = summaryResponseText.trim();
        summaryCleanText = summaryCleanText.replace(/```json/g, '').replace(/```/g, '').trim();
        const summaryFirstBrace = summaryCleanText.indexOf('{');
        const summaryLastBrace = summaryCleanText.lastIndexOf('}');

        if (summaryFirstBrace !== -1 && summaryLastBrace !== -1 && summaryLastBrace > summaryFirstBrace) {
            summaryCleanText = summaryCleanText.substring(summaryFirstBrace, summaryLastBrace + 1);
        }

        let summaryData;
        try {
            summaryData = JSON.parse(summaryCleanText);
        } catch (parseError) {
            // Try repair
            const repairJSON = (jsonString) => {
                let repaired = jsonString;
                const quoteCount = (repaired.match(/"/g) || []).length;
                if (quoteCount % 2 !== 0) {
                    repaired += '"';
                }
                const openBraces = (repaired.match(/{/g) || []).length;
                const closeBraces = (repaired.match(/}/g) || []).length;
                for (let i = 0; i < openBraces - closeBraces; i++) {
                    repaired += '}';
                }
                return repaired;
            };

            try {
                const repaired = repairJSON(summaryCleanText);
                summaryData = JSON.parse(repaired);
            } catch (repairError) {
                // Fallback summary
                summaryData = {
                    overallSummary: "Comprehensive analysis completed for all blocks.",
                    criticalBlocks: blockAnalyses.filter(b => b.analysis.report?.riskAssessment === 'High').map(b => b.blockId),
                    overallRisk: "Medium",
                    keyFindings: ["Analysis completed for all blocks"],
                    recommendations: ["Review individual block analyses for details"],
                    safetyFactor: 1.0,
                    structuralIntegrity: "Requires review"
                };
            }
        }

        console.log('✅ Comprehensive Analysis Complete');

        res.json({
            success: true,
            data: {
                blockAnalyses,
                summary: summaryData
            }
        });
    } catch (error) {
        console.error('❌ Error in comprehensive analysis:', error);
        res.status(500).json({
            error: 'Failed to perform comprehensive analysis',
            details: error.message
        });
    }
});

// Generate variants endpoint - FREE-FORM MULTI-AGENT GENERATION
app.post('/api/generate-variants', async (req, res) => {
    try {
        const { prompt, count = 5 } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log(`🎨 Generating ${count} variants for: "${prompt}"`);

        // Multi-agent free-form structure generation
        const message = await gradientAI.messages_create({
            max_tokens: 4096,
            messages: [{
                role: 'user',
                content: `You are a team of ${count} structural engineering agents. Each agent will interpret the user's prompt and create a unique structural design that EXACTLY matches different interpretations of the prompt.

USER PROMPT: "${prompt}"

Each agent should:
1. Interpret the prompt from a different perspective
2. Create a structure that matches their interpretation EXACTLY
3. Use appropriate block types and arrangements
4. Make each variant unique and meaningful

AVAILABLE BLOCK TYPES:
- "cube": Standard cube
- "rectangular_prism": Vertical rectangular block
- "horizontal_rectangular_prism": Horizontal rectangular block
- "pyramid": Pyramid/triangular block
- "cylinder": Cylindrical block

Output ONLY this JSON array (no markdown, no explanations):
[
  {
    "blocks": [
      {
        "type": "cube" | "rectangular_prism" | "horizontal_rectangular_prism" | "pyramid" | "cylinder",
        "pos": [x, y, z],
        "size": [width, height, depth]
      },
      ...
    ],
    "description": "Brief description of this variant's interpretation"
  },
  ... (${count} total variants)
]

RULES FOR EACH VARIANT:
- All blocks must be grounded (y position should be at least size[1]/2)
- Use reasonable dimensions (0.1 to 5.0 meters)
- Minimum 1 block, maximum 50 blocks per variant
- Each variant should be a different interpretation of the prompt
- Ensure blocks are physically connected and stable
- Output ONLY the JSON array, nothing else

CRITICAL: Output ONLY valid JSON. No markdown, no explanations, no text before or after. Start with [ and end with ].`
            }]
        });

        const responseText = message.text || message.content[0].text;
        console.log('✅ AI variants generation:', responseText.substring(0, 300));

        // Parse AI response
        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');

        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            cleanText = cleanText.substring(firstBracket, lastBracket + 1);
        }

        let aiVariants;
        try {
            aiVariants = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError.message);
            // Try to repair
            cleanText = cleanText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
            try {
                aiVariants = JSON.parse(cleanText);
            } catch (repairError) {
                throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
            }
        }

        // STEP 2: Validate and generate geometry for each variant
        const variants = [];
        for (let i = 0; i < Math.min(count, aiVariants.length); i++) {
            const variant = aiVariants[i];

            if (!variant.blocks || !Array.isArray(variant.blocks)) {
                console.warn(`⚠️ Variant ${i} missing blocks array, skipping`);
                continue;
            }

            // Validate and fix each block
            const validatedBlocks = [];
            for (const block of variant.blocks) {
                if (!block.type || !block.pos || !block.size) {
                    console.warn('⚠️ Skipping invalid block:', block);
                    continue;
                }

                // Validate block type
                const validTypes = ['cube', 'rectangular_prism', 'horizontal_rectangular_prism', 'pyramid', 'cylinder'];
                if (!validTypes.includes(block.type)) {
                    console.warn(`⚠️ Invalid block type: ${block.type}, defaulting to cube`);
                    block.type = 'cube';
                }

                // Validate and clamp dimensions
                const size = [
                    Math.max(0.1, Math.min(5.0, block.size[0] || 0.5)),
                    Math.max(0.1, Math.min(5.0, block.size[1] || 0.5)),
                    Math.max(0.1, Math.min(5.0, block.size[2] || 0.5))
                ];

                // Ensure block is grounded
                const pos = [
                    block.pos[0] || 0,
                    Math.max(size[1] / 2, block.pos[1] || size[1] / 2),
                    block.pos[2] || 0
                ];

                validatedBlocks.push({
                    type: block.type,
                    pos: pos,
                    size: size
                });
            }

            if (validatedBlocks.length === 0) {
                console.warn(`⚠️ Variant ${i} has no valid blocks, skipping`);
                continue;
            }

            variants.push({
                id: i + 1,
                data: validatedBlocks,
                description: variant.description || `Variant ${i + 1}`
            });
        }

        // If we don't have enough variants, fill with diverse templates
        if (variants.length < count) {
            const usedTemplates = new Set(variants.map(v => {
                // Extract template from description or use default
                const desc = v.description.toLowerCase();
                if (desc.includes('tower') || desc.includes('stack')) return 'tower_stack';
                if (desc.includes('bridge') || desc.includes('truss')) return 'truss_bridge';
                if (desc.includes('frame') || desc.includes('box')) return 'frame_box';
                if (desc.includes('cantilever') || desc.includes('beam')) return 'cantilever_beam';
                return 'tower_stack';
            }));

            for (let i = variants.length; i < count; i++) {
                // Use a template that hasn't been used yet
                let templateName = availableTemplates.find(t => !usedTemplates.has(t));
                if (!templateName) {
                    // All templates used, cycle through them
                    templateName = availableTemplates[i % availableTemplates.length];
                }
                usedTemplates.add(templateName);

                const template = getTemplate(templateName);
                const defaultBlocks = buildGeometryFromTemplate(templateName, template.defaultParams);
                variants.push({
                    description: `${template.name} - Variant ${i + 1}`,
                    data: defaultBlocks
                });
            }
        }

        console.log(`✅ Generated ${variants.length} diverse variants`);
        res.json({ success: true, variants });
    } catch (error) {
        console.error('❌ Error generating variants:', error);
        res.status(500).json({
            error: 'Failed to generate variants',
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints:`);
    console.log(`   - POST http://localhost:${PORT}/api/generate-structure`);
    console.log(`   - POST http://localhost:${PORT}/api/generate-variants`);
    console.log(`   - POST http://localhost:${PORT}/api/analyze-structure`);
});
