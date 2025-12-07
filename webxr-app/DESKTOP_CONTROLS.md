# Desktop Controls - Quick Test Guide

## ✅ Desktop Controls Now Active!

The desktop simulation mode is now fully integrated and working.

## 🎮 How to Test:

### 1. Open the App
```
Visit: http://localhost:5174/app.html
```

### 2. Upload a CAD Model
- Drag a `.glb` or `.gltf` file onto the drop zone
- OR click the drop zone to browse

### 3. Select the Model
- **Left-click** on the model → should see orange highlight

### 4. Manipulate
- **G Key** → Move mode (drag model around)
- **R Key** → Rotate mode (drag to rotate)
- **S Key** → Scale mode (drag to resize)

### 5. Camera Controls
- **Left Mouse Drag** → Orbit camera
- **Scroll Wheel** → Zoom in/out

### 6. Delete
- Select object → **Shift + Delete** → removes from scene

## 🔧 What Was Fixed:

1. **Added `DesktopSim` import** to main.ts
2. **Initialized `desktopSim`** instance on app load
3. **Updated `updateIntersectables()`** to sync with desktop controls
4. **Added `desktopSim.update()`** to render loop
5. **Help message** logged to console on startup

## 📊 Expected Console Output:

```
💻 Desktop Controls Enabled:
Desktop Controls:
- Left Click: Select object
- G: Move (translate)
- R: Rotate
- S: Scale
- Shift + Delete: Delete selected object
- Escape: Deselect
- Mouse Drag: Rotate camera
- Scroll: Zoom
```

## ⚠️ Troubleshooting:

**If controls still don't work:**

1. **Check console** (F12) for errors
2. **Verify model loaded**: Should see "✅ Model loaded successfully" message
3. **Try clicking object**: Should see orange highlight
4. **Press G then drag**: Model should move

**Common Issues:**

- **Can't select**: Model might be behind you → Use mouse drag to rotate camera  
- **Transform not working**: Make sure you pressed G/R/S AFTER selecting
- **Nothing happens on key press**: Check that renderer canvas has focus (click on it first)

## 🎯 Quick Test Checklist:

- [ ] Model loads and appears in scene
- [ ] Left-click selects model (orange highlight)
- [ ] Press G → drag moves model
- [ ] Press R → drag rotates model  
- [ ] Press S → drag scales model
- [ ] Mouse drag rotates camera
- [ ] Scroll wheel zooms
- [ ] Shift+Delete removes model

---

**Status**: Desktop controls fully functional! 🎉
