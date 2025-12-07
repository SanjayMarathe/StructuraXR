# 🧮 Mathematical Analysis Agent System Architecture

## 🎯 Overview
A modular 5-agent system designed to provide deep, vector-specific structural analysis in WebXR. The system allows users to select a specific force vector and receive a comprehensive breakdown of stress propagation, mathematical derivations, and failure risks.

---

## 🤖 The 5-Agent System

### 1. 🧠 Structural Reasoning Agent
**Purpose:** Computes vector-specific stress propagation, detects failure points, and ranks causes of failure.
**Input:**
```json
{
  "vectorId": 1,
  "vector": { "origin": [0, 5, 0], "direction": [0, -1, 0], "magnitude": 5000 },
  "structure": [
    { "id": 0, "pos": [0, 0, 0], "size": [1, 1, 1], "material": "concrete" },
    { "id": 1, "pos": [0, 1, 0], "size": [1, 1, 1], "material": "steel" }
  ],
  "constraints": ["ground_fixed"]
}
```
**Output:**
```json
{
  "stressPath": [1, 0], // Block IDs in order of load transmission
  "criticalBlockId": 0,
  "failureMode": "compression",
  "safetyFactor": 1.2,
  "reasoning": "Load travels vertically from Block 1 to Block 0. Block 0 bears total weight + applied force."
}
```
**Logic:**
1. Raycast/Trace load path from vector origin through connected blocks.
2. Calculate cumulative load on each block in the path.
3. Compare stress vs material yield strength.

### 2. 📐 Math Derivation Agent
**Purpose:** Converts reasoning into step-by-step equations and numeric calculations.
**Input:** Output from Structural Reasoning Agent + Vector Data.
**Output:**
```json
{
  "equations": [
    "\\sigma = \\frac{F}{A}",
    "\\sigma_{total} = \\frac{F_{vector} + m g}{w d}"
  ],
  "steps": [
    "1. Calculate applied stress: 5000N / 1m² = 5000 Pa",
    "2. Add self-weight stress: (2400kg * 9.8) / 1m² = 23520 Pa",
    "3. Total Stress: 28.52 kPa"
  ]
}
```
**Logic:**
1. Identify relevant physics formulas based on failure mode (compression, tension, shear).
2. Substitute variables with actual values from the scene.
3. Format as LaTeX/Markdown.

### 3. 🎨 Visualization Mapping Agent
**Purpose:** Converts data into WebXR-compatible visual overlays.
**Input:** Reasoning Data + Math Data.
**Output:**
```json
{
  "highlights": [
    { "blockId": 1, "color": "#FFFF00", "opacity": 0.5 },
    { "blockId": 0, "color": "#FF0000", "opacity": 0.8 }
  ],
  "arrows": [
    { "start": [0, 1, 0], "end": [0, 0, 0], "color": "#FF0000", "label": "F_trans" }
  ]
}
```
**Logic:**
1. Map stress levels to color gradients (Green -> Red).
2. Generate arrow vectors for internal load paths.
3. Flag critical blocks for pulsing/highlighting.

### 4. 📝 Technical Report Writer Agent
**Purpose:** Generates human-readable summaries.
**Input:** All previous agent outputs.
**Output:**
```json
{
  "summary": "Vector #1 applies a 5kN compressive load to the top steel unit.",
  "riskAssessment": "Moderate risk. Block 0 is approaching yield limit (SF: 1.2).",
  "recommendation": "Increase cross-sectional area of Block 0 or change material to Steel."
}
```
**Logic:**
1. Synthesize technical data into natural language.
2. Provide actionable engineering advice.

### 5. ✅ Verification / Sanity Check Agent
**Purpose:** Ensures consistency and physics plausibility.
**Input:** All agent outputs.
**Output:**
```json
{
  "valid": true,
  "flags": [],
  "confidence": 0.98
}
```
**Logic:**
1. Check if Stress < Yield Strength matches Safety Factor > 1.
2. Ensure Force Balance (Sum of forces ≈ 0 for static equilibrium).
3. Flag hallucinations (e.g., negative mass, impossible stress values).

---

## 🔄 System Architecture & Flow

1.  **User Action:** User clicks "Mathematical Analysis" -> Selects "Vector #1".
2.  **Frontend:** Sends entire scene state + Vector #1 ID to `/api/analyze-vector`.
3.  **Backend Orchestrator:**
    *   Calls **Agent 1 (Reasoning)**.
    *   Passes Agent 1 result to **Agent 2 (Math)** & **Agent 3 (Vis)**.
    *   Passes all results to **Agent 4 (Report)**.
    *   Passes everything to **Agent 5 (Verify)**.
    *   If Agent 5 fails, retry or flag warning.
4.  **Frontend:** Receives JSON bundle.
    *   **Right Panel:** Displays Report, Math Equations, and Reasoning.
    *   **3D Scene:** Applies Highlights and Arrows from Vis Agent.

---

## 🛠️ Implementation Plan

### Phase 1: Frontend - Vector Identity
*   Update `ForceVectorManager` to assign auto-incrementing IDs (1, 2, 3...).
*   Render ID labels above vectors in 3D space.

### Phase 2: Frontend - UI Panel
*   Create `AnalysisPanel` component (Right sidebar).
*   Add vector selection dropdown.
*   Add sections for "Reasoning", "Calculations", "Report".

### Phase 3: Backend - Agent Logic
*   Implement `/api/analyze-vector` endpoint.
*   Use Chain-of-Thought prompting with Claude to simulate the 5 agents in a single efficient pass (or parallel calls if needed for complexity).

### Phase 4: Integration
*   Connect UI selection to API.
*   Parse response and update UI + Scene.
