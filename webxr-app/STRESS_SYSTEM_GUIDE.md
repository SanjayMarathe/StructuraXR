# 🎯 How to Use the Advanced Stress System

## ✅ Features Now Active

### 1. No Floating Blocks
- AI-generated structures automatically snap to ground
- Blocks must be supported or grounded
- Console shows corrections: "⚠️ Floating block detected!"

### 2. Force Vector Placement
- Interactive arrow placement
- Keyboard-controlled direction
- Visual red arrow in scene

### 3. Gradient Stress Visualization
- Per-vertex color gradients
- Blue → Yellow → Red spectrum
- Only appears AFTER force vector is placed

## 🎮 Step-by-Step Usage

### Step 1: Generate or Upload Structure
```
Option A: AI Generation
- Type prompt (e.g., "tower of cubes")
- Click "🤖 Generate with AI"
- Blocks appear (automatically non-floating)

Option B: CAD Upload
- Drag .glb file to drop zone
- Model appears centered on ground
```

### Step 2: Place Force Vector
```
1. Press F → Force placement mode starts
   Console: "🎯 Press arrow keys to set direction..."
   
2. Adjust direction:
   - Arrow Up/Down → Vertical tilt
   - Arrow Left/Right → Horizontal tilt
   - W/S → Forward/Backward tilt
   
3. Press F again → Confirm
   → Red arrow appears in scene
   Console: "✅ Force vector placed!"
```

### Step 3: Run Stress Test
```
1. Click "📊 Run Stress Test" button
   
2. Gradient colors appear:
   - Blue areas: Low stress
   - Yellow areas: Medium stress
   - Red areas: High stress
   
Console: "✅ Gradient stress visualization complete"
```

## 🎨 Understanding the Visualization

### Color Meaning:
- **🔵 Blue/Cyan**: Parts far from force or perpendicular to it
- **🟡 Yellow**: Parts moderately affected by force
- **🔴 Red**: Parts directly in line with force direction

### Stress Calculation:
- Distance from force origin
- Alignment with force direction
- Force magnitude

### Example:
```
Force pointing DOWN from top:
- Top of structure: Red (direct force)
- Middle: Yellow (medium distance)
- Bottom: Blue (far from force origin)
```

## ⚠️ Common Issues

### "Place a force vector first!"
**Problem**: Clicked stress test without force vector
**Solution**: Press F, adjust direction, press F again

### No colors appear
**Problem**: No objects in scene
**Solution**: Generate structure or upload CAD model first

### Console shows "Floating block detected"
**Not a problem!** This means the anti-float system is working
- Block was requested at bad position
- Automatically corrected to ground
- Continue normally

## 🔄 Workflow Summary

```
1. Generate/Upload Structure
   ↓
2. Press F (start force placement)
   ↓
3. Arrow Keys (adjust direction)
   ↓
4. Press F (confirm - red arrow appears)
   ↓
5. Click "Run Stress Test"
   ↓
6. View gradient stress colors!
```

## 🎯 Tips & Tricks

**Best Force Directions:**
- Downward (0, -1, 0): Simulates gravity
- Horizontal: Simulates wind/lateral load
- Angular: Complex stress patterns

**For Towers:**
- Place force at top pointing down
- See compression stress distribution

**For Bridges:**
- Place force at center pointing down
- See bending stress in beams

**For Complex Models:**
- Try different force directions
- Each shows different stress patterns

## 🔧 Keyboard Reference

| Key | Action |
|-----|--------|
| F | Start/Confirm force vector |
| ↑ | Tilt up |
| ↓ | Tilt down |
| ← | Tilt left |
| → | Tilt right |
| W | Forward |
| S | Backward |
| ESC | Cancel placement |

## 📊 Console Messages

### Success Messages:
```
✅ Block added at (x, y, z)
🎯 Force Vector System: Press F to place force vector
✅ Force vector placed!
🎨 Running gradient stress analysis
✅ Gradient stress visualization complete
💡 Blue = Low stress | Yellow = Medium | Red = High stress
```

### Warning Messages:
```
⚠️ Floating block detected! Fixed Y: 2.50 → 0.50
⚠️ Place a force vector first!
```

---

**Status**: All systems operational! Enjoy experimenting with structural stress visualization! 🚀
