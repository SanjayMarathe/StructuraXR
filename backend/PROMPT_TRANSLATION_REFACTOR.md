# PROMPT → STRUCTURE TRANSLATION LAYER REFACTOR

## ✅ COMPLETED REFACTORING

This refactoring **ONLY** affects the prompt-to-structure translation layer. **NO physics, stress, force, or math systems were modified.**

---

## 🎯 GOAL ACHIEVED

Vague prompts like:
- "Give me a tower"
- "Make a weak bridge"
- "Create an unstable structure"

Now translate to:
- ✅ Deterministic template selection
- ✅ Dimensioned numeric parameters
- ✅ Grounded, physically sensible geometry
- ✅ Simulation-ready structural inputs

---

## 🏗️ ARCHITECTURE

### 1. **Prompt Normalization Layer** (`PromptNormalizer.js`)
- Normalizes user intent into: `stable`, `intentionally_unstable`, or `borderline`
- Maps prompts to canonical templates: `tower_stack`, `truss_bridge`, `frame_box`, `cantilever_beam`
- **NO AI involvement** - pure keyword matching

### 2. **Structure Templates** (`StructureTemplates.js`)
- Four canonical templates with parametric generation functions
- Each template has:
  - `generate(parameters)` - deterministic block array generation
  - `defaultParams` - safe defaults
  - `paramRanges` - valid parameter bounds

### 3. **Geometry Validator** (`GeometryValidator.js`)
- Anti-hallucination safeguards:
  - No negative dimensions
  - No zero thickness
  - No floating elements (basic check)
  - No extreme aspect ratios
  - No unbounded values
- Parameter clamping to valid ranges

### 4. **Template Geometry Builder** (`TemplateGeometryBuilder.js`)
- Expands template parameters into block arrays
- **NO AI** - pure parametric math
- Validates output before returning

### 5. **AI Parameter Selector** (in `server.js`)
- AI's **ONLY** job: Select numeric parameters within ranges
- AI **NEVER** generates geometry
- AI **NEVER** outputs meshes, vertices, or CAD commands
- Strict JSON output format enforced

---

## 🔄 FLOW

```
User Prompt
    ↓
[Prompt Normalizer]
    ├─→ Intent: stable/unstable/borderline
    └─→ Template: tower_stack/truss_bridge/etc.
    ↓
[AI Parameter Selector]
    └─→ { height: 12, width: 4, depth: 4, levels: 6, ... }
    ↓
[Parameter Validator]
    └─→ Clamp to valid ranges, adjust for intent
    ↓
[Template Geometry Builder]
    └─→ Deterministic block array generation
    ↓
[Geometry Validator]
    └─→ Final validation
    ↓
Simulation Layer (UNCHANGED)
```

---

## 📋 TEMPLATES

### `tower_stack`
- Vertical compression structures
- Parameters: height, width, depth, levels
- Generates: Stacked blocks from ground up

### `truss_bridge`
- Tension + compression bridges
- Parameters: height, width, depth, span
- Generates: Two supports + deck span

### `frame_box`
- Rigid building frames
- Parameters: height, width, depth, levels
- Generates: Corner columns + connecting beams

### `cantilever_beam`
- Overhang failure demonstrations
- Parameters: height, width, depth, span
- Generates: Support column + overhanging beam

---

## 🛡️ SAFEGUARDS

### Parameter Validation
- All parameters clamped to template-defined ranges
- Intent-based adjustments (unstable = taller/narrower)
- No NaN or Infinity values

### Geometry Validation
- Block-level validation (dimensions, position)
- Structure-level validation (span, complexity)
- Automatic fallback to defaults if validation fails

### AI Constraints
- Strict JSON output format
- No markdown, no explanations
- Only numeric parameters allowed
- Template name must match selected template

---

## 📊 EXAMPLE TRANSFORMATIONS

### Input: "Give me a tower"
```
Intent: stable
Template: tower_stack
AI Output: { height: 12, width: 4, depth: 4, levels: 6, material: "concrete" }
Result: 6 stacked blocks, 4m x 4m base, 12m tall
```

### Input: "Make an unstable tower"
```
Intent: intentionally_unstable
Template: tower_stack
AI Output: { height: 16, width: 2, depth: 2, levels: 8, material: "wood" }
Result: 8 stacked blocks, 2m x 2m base, 16m tall (tall/narrow = unstable)
```

### Input: "Create a bridge"
```
Intent: stable
Template: truss_bridge
AI Output: { height: 3, width: 1, depth: 1, span: 6, material: "steel" }
Result: Two 1m x 1m supports, 6m span deck
```

---

## ✅ VERIFICATION

- ✅ No physics systems modified
- ✅ No stress solvers modified
- ✅ No force equations modified
- ✅ No deformation math modified
- ✅ No failure thresholds modified
- ✅ Only prompt translation layer refactored
- ✅ All geometry is deterministic
- ✅ All geometry is validated
- ✅ All geometry is template-based

---

## 🚀 USAGE

The API endpoints work exactly the same:

```bash
POST /api/generate-structure
{
  "prompt": "tower"
}

POST /api/generate-variants
{
  "prompt": "bridge",
  "count": 5
}
```

But now:
- ✅ Output is deterministic
- ✅ No AI geometry hallucination
- ✅ All structures are buildable
- ✅ All structures are validated

---

## 📝 FILES MODIFIED

1. `backend/StructureTemplates.js` - NEW
2. `backend/PromptNormalizer.js` - NEW
3. `backend/GeometryValidator.js` - NEW
4. `backend/TemplateGeometryBuilder.js` - NEW
5. `backend/server.js` - MODIFIED (generate-structure and generate-variants endpoints)

## 📝 FILES NOT MODIFIED

- All physics systems
- All stress calculations
- All force vector systems
- All math derivation systems
- All simulation logic
- Frontend code (except API calls work the same)

---

## 🎯 SUCCESS CRITERIA MET

- ✅ Vague prompts → Deterministic structures
- ✅ No AI geometry hallucination
- ✅ Template-based generation only
- ✅ Parameter validation enforced
- ✅ Geometry validation enforced
- ✅ Physics systems untouched
- ✅ Simulation layer receives clean inputs

