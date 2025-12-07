# 🔬 SolidWorks-Style FEA Simulation System

## ✅ System Overview

This is a **lightweight, deterministic FEA-inspired simulation** for WebXR, modeled after SolidWorks Simulation but without full finite element solvers. It uses heuristic formulas for fast, visual stress analysis.

---

## 📦 Core Components

### 1. **Material System** (`MaterialSystem.ts`)

#### Material Library
Pre-defined engineering materials with realistic properties:

| Material | Density (kg/m³) | Max Compression (MPa) | Max Tension (MPa) | Max Shear (MPa) |
|----------|-----------------|----------------------|-------------------|-----------------|
| **Steel** | 7850 | 400 | 400 | 250 |
| **Concrete** | 2400 | 30 | 3 (weak!) | 5 |
| **Wood** | 600 | 30 | 60 (strong!) | 10 |
| **Aluminum** | 2700 | 300 | 300 | 200 |

#### Boundary Conditions
- **FREE**: No constraints, object can move/deform
- **PINNED**: Can rotate but not translate
- **FIXED**: No movement or rotation (anchor point)

#### Force Types
- **COMPRESSION**: Force pushing into object
- **TENSION**: Force pulling outward
- **SHEAR**: Perpendicular sliding force
- **BENDING**: Combination of tension/compression

### 2. **FEA Engine** (`FEAEngine.ts`)

Performs heuristic stress analysis:

#### Stress Calculation Formula
```
stress = applied_force / material_limit
```

Where:
- `applied_force` = external force × alignment × distance_factor
- `material_limit` = max compression/tension/shear for material
- `stress < 1.0` → Safe
- `stress ≥ 1.0` → **FAILURE**

#### Force Application
```typescript
effective_force = magnitude × |alignment| × (1/distance²) × 1e6
```

- Distance decay: 1/r² (inverse square law)
- Alignment: dot product of force direction and position vector
- Scaled to Pascals (1e6) for realistic units

---

## 🎨 Visualization

### Von Mises Color Gradient

SolidWorks-style color mapping:

| Stress Level | Color | Meaning |
|--------------|-------|---------|
| 0% - 30% | 🟢 Green | Safe |
| 30% - 60% | 🟡 Yellow | Moderate |
| 60% - 100% | 🟠 Orange → 🔴 Red | High |
| 100%+ | 🔴 Bright Red + Glow | **FAILURE** |

### Deformation Visualization

**Exaggerated mesh scaling** (not real elastic deformation):

```typescript
deformation_factor = 1.0 + (stress × 0.1 × scale_factor)
```

- Default scale: 5x exaggeration
- Adjustable: 1x - 20x
- **Fixed blocks** don't deform

---

## 🎮 User Interface

### FEA Settings Panel (Top Left)

**📦 Material Selection**
- Drop-down for selected block
- Shows density in kg/m³
- Applied on selection

**🔗 Boundary Condition**
- Free / Pinned / Fixed
- Affects stress calculation

**⚙️ Deformation Scale**
- Slider: 1x - 20x
- Real-time visual feedback

**🔄 Reset Button**
- Clears all stress colors
- Resets deformations
- Clears failure states

---

## 🔬 Workflow

### Step 1: Build Structure
```
Generate with AI or upload CAD model
```

### Step 2: Assign Properties
```
1. Click a block to select
2. Choose material (Steel/Concrete/Wood/Aluminum)
3. Set boundary condition (Free/Pinned/Fixed)
```

### Step 3: Place Force Vector
```
1. Press F
2. Click where to apply force
3. Adjust direction with arrow keys
4. Adjust magnitude with +/-
5. Press F to confirm
```

### Step 4: Run Simulation
```
Click "Run Stress Test"
→ FEA engine calculates stress
→ Von Mises colors applied
→ Deformations shown
→ Failures detected
```

### Step 5: Analyze Results
```
Console shows:
- Stress % per block
- Failed blocks (❌)
- Safe blocks (✅)
- Material info
```

---

## 📊 Example Use Cases

### Tower Under Gravity
```
Material: Concrete
Boundary: Bottom blocks = FIXED
Force: Downward from top (compression)

Result:
- Top: Red (high compression)
- Middle: Yellow (moderate)
- Bottom (fixed): Blue (minimal)
```

### Bridge Under Load
```
Material: Steel beams
Boundary: Ends = PINNED
Force: Center, pointing down

Result:
- Center beam: Red (max bending)
- Support beams: Orange/Yellow
- Anchors: Green
```

### Cantilever Beam
```
Material: Wood
Boundary: One end = FIXED
Force: Free end, horizontal

Result:
- Fixed end: Red (tension top, compression bottom)
- Middle: Yellow (moderate bending)
- Free end: Orange (shear + deflection)
```

---

## 🧮 Technical Details

### Heuristic vs. Real FEA

| Real FEA (SolidWorks) | This System (Heuristic) |
|-----------------------|-------------------------|
| Mesh elements | Rigid blocks |
| Stiffness matrices | Simple stress = F/A |
| Iterative solvers | Direct calculation |
| Minutes to solve | Instant (ms) |
| Accurate deformation | Exaggerated visualization |

### Assumptions & Simplifications

1. **No Mesh Refinement**: Treats entire block as uniform
2. **Linear Material**: No plastic deformation
3. **Static Load**: No dynamic/time-varying forces
4. **No Contact**: Blocks don't interact with each other
5. **Simplified Geometry**: Boxes and cylinders only

### When This Works Well

✅ Conceptual stress visualization
✅ Educational demonstrations
✅ Quick failure detection
✅ Comparative analysis
✅ WebXR/VR real-time visualization

### When to Use Real FEA

❌ Precise numerical results
❌ Complex geometries (organic shapes)
❌ Dynamic/impact analysis
❌ Material nonlinearity
❌ Regulatory compliance

---

## 🎯 API Usage

### Initialize FEA Engine

```typescript
import { FEASimulationEngine } from './FEAEngine';
import { MaterialType, BoundaryCondition } from './MaterialSystem';

const feaEngine = new FEASimulationEngine();
```

### Add Blocks

```typescript
// Add with default (Steel, Free)
feaEngine.addBlock(mesh);

// Add with custom properties
feaEngine.addBlock(
    mesh,
    MaterialType.CONCRETE,
    BoundaryCondition.FIXED
);
```

### Run Simulation

```typescript
const results = feaEngine.runSimulation(forceVector);

console.log(`Failed: ${results.failedBlocks}/${results.totalBlocks}`);
console.log(`Max Stress: ${(results.maxStress * 100).toFixed(1)}%`);
```

### Reset

```typescript
feaEngine.resetSimulation(); // Clears colors, deformations, failures
```

### Adjust Deformation

```typescript
feaEngine.setDeformationScale(10.0); // 10x exaggeration
```

---

## 🔍 Console Output Example

```
🔬 Running FEA simulation...
Block: steel | 15.70kg | free | Stress: 45.2% | ✅ Safe
Block: steel | 15.70kg | free | Stress: 78.9% | ✅ Safe
Block: concrete | 4.80kg | free | Stress: 112.3% | ❌ FAILED
Block: steel | 15.70kg | fixed |  Stress: 8.1% | ✅ Safe
✅ Simulation complete: 1/4 blocks failed

📊 Simulation Summary:
━━━━━━━━━━━━━━━━━━━
Total Blocks: 4
Failed: 1 (25.0%)
Average Stress: 61.1%
Safe: 3

⚠️ Structure has failures!
```

---

## 🚀 Future Enhancements

Potential additions to make it more SolidWorks-like:

1. **Load Cases**: Save/load different force configurations
2. **Factor of Safety**: Display FS values, not just stress
3. **Mesh Simplification**: Auto-tesselate CAD models
4. **Reports**: Generate PDF summaries
5. **Optimization**: Suggest material changes
6. **Modal Analysis**: Simple vibration modes
7. **Contact Detection**: Blocks transfer forces
8. **Thermal**: Temperature-based stress

---

## 📝 Summary

This system provides a **lightweight, visual approximation** of SolidWorks Simulation for WebXR environments. It's perfect for:

- 🎓 **Education**: Teaching stress concepts
- 🎨 **Visualization**: Showing force distribution
- ⚡ **Speed**: Real-time analysis in VR
- 🎯 **Accessibility**: No expensive software needed

**Not suitable for**:
- ❌ Engineering certification
- ❌ Safety-critical analysis
- ❌ Publication-quality results

Think of it as "**SolidWorks Simulation for VR**" — visual, interactive, educational! 🚀
