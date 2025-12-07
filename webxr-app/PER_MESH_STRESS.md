# Per-Mesh Stress Testing - Implementation

## ✅ Updated: Individual Mesh Color Coding

The stress test now analyzes and colors **each mesh separately** instead of applying a single color to the entire model.

## 🎨 How It Works:

### 1. Mesh Discovery
For each uploaded CAD model:
- Traverses the entire model hierarchy
- Collects all individual meshes
- Analyzes each mesh independently

### 2. Per-Mesh Stability Calculation

Each mesh gets its own stability score (0.0 - 1.0) based on:

**Height-Based Stability:**
- **Grounded** (Y ≈ 0): `95%` stability → 🟢 Green
- **Low** (Y > 0.1): `75%` stability → 🟡 Yellow-Green
- **Mid** (Y > 0.5): `60%` stability → 🟡 Yellow
- **High** (Y > 1.0): `40%` stability → 🟠 Orange
- **Very High** (Y > 2.0): `10%` stability → 🔴 Red

**Additional Factors:**
- **Mesh Height**: Tall pieces (>1m) get 20% penalty
- **Distance from Center**: Far pieces (>2m) get 30% penalty
- **AI Evaluation** (optional): Every 5th mesh for performance

### 3. Color Gradient

Each mesh gets colored individually:
```
0% ──────── 50% ──────── 100%
🔴 Red  →  🟡 Yellow  →  🟢 Green
Critical  Moderate    Stable
```

## 📊 Example Output:

```
Analyzing model: bridge.glb
  Found 24 meshes to analyze
  Mesh 1: Y=0.00, Stability=95%  🟢
  Mesh 2: Y=0.00, Stability=95%  🟢
  Mesh 3: Y=0.52, Stability=60%  🟡
  Mesh 4: Y=1.20, Stability=32%  🟠
  Mesh 5: Y=2.30, Stability=8%   🔴
  ...
✅ Stress test complete - each mesh colored individually
```

## 🎯 Visual Results:

**Before** (old system):
- Entire model → Single color
- Example: Whole bridge → Yellow

**After** (new system):
- Bottom supports → Green (stable)
- Middle beams → Yellow (moderate)
- Top rails → Orange/Red (less stable)

## 🧪 How to Test:

1. **Upload a CAD model** with multiple parts (e.g., tower, bridge, building)
2. **Click "Run Stress Test"**
3. **Observe**: Different parts should have different colors!
   - Lower parts: Green/Yellow-Green
   - Middle parts: Yellow/Orange
   - Upper parts: Orange/Red

## 💡 Tips:

**For Best Results:**
- Use models with distinct parts at different heights
- Models like buildings, towers, bridges show color variation clearly
- Single-piece models may appear mostly one color (expected)

**Performance:**
- AI evaluation samples every 5th mesh to avoid slowdown
- Physics-based calculation is instant

## 🔧 Customization:

To adjust stability thresholds, edit `ModelLoader.ts`:

```typescript
// Height thresholds (line ~220)
if (bottomY > 2.0) {
    stability = 0.1;  // Very high → Red
} else if (bottomY > 1.0) {
    stability = 0.4;  // High → Orange
}
// ... etc
```

---

**Status**: ✅ Per-mesh stress testing fully functional!
