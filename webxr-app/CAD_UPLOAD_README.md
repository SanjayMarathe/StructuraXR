# CAD Model Upload Feature

This feature allows users to upload GLTF, GLB, STL, or OBJ files directly into the VR scene.

## Supported File Formats

- **GLTF** (.gltf) - Standard glTF JSON format
- **GLB** (.glb) - Binary glTF format (recommended)
- **STL** (.stl) - Stereolithography CAD format
- **OBJ** (.obj) - Wavefront OBJ format

## How It Works

### 1. File Upload (Client-Side)
The file is read using the browser's `FileReader` API - no backend required.

### 2. Model Loading
Based on the file extension, the appropriate Three.js loader is used:
- `GLTFLoader` for .gltf and .glb files
- `STLLoader` for .stl files
- `OBJLoader` for .obj files

### 3. Auto-Scaling
Models are automatically scaled to fit within a 1.5-meter bounding box to ensure they're not too large or too small for VR interaction.

### 4. Positioning
Models are positioned at `(0, 1, -2)` - directly in front of the user at eye level, 2 meters away.

### 5. VR Interaction
Uploaded models are automatically added to the interactable objects list, so you can:
- Grab them with VR controllers (trigger button)
- Move them around the scene
- Release them anywhere

## Usage

### Desktop/Laptop:
1. Click the "Choose File" button in the UI
2. Select a GLTF, GLB, STL, or OBJ file
3. The model will appear in front of the camera

### In VR:
1. Have someone on a laptop upload the file
2. Point your controller at the model
3. Pull the trigger to grab it
4. Move your hand to reposition
5. Release the trigger to drop it

## Code Architecture

### `ModelLoader.ts`
Main class that handles:
- File reading via `FileReader`
- Format detection from file extension
- Loading with appropriate Three.js loader
- Auto-scaling and positioning
- Managing uploaded models list

### `main.ts` Integration
- Instantiates `ModelLoader`
- Adds file upload event listener
- Updates interactables when new models are loaded
- Exposes `window.app.uploadModel()` for programmatic use

### `Interaction.ts` Updates
- **Recursive raycasting**: Detects meshes inside complex 3D models
- **Parent selection**: Grabs the root object instead of individual child meshes
- **Traverse highlighting**: Highlights all meshes in a model when selected

## Example Test Files

To test this feature, you can download free models from:
- **Sketchfab**: https://sketchfab.com/3d-models?features=downloadable&sort_by=-likeCount
- **Thingiverse**: https://www.thingiverse.com/ (STL files)
- **Free3D**: https://free3d.com/3d-models/obj (OBJ files)

## Limitations

- **Materials**: OBJ files without MTL files will use a default gray material
- **Textures**: Embedded textures in GLTF/GLB work, but external texture paths in GLTF may fail
- **File Size**: Very large models (10MB+) may cause performance issues
- **Animations**: GLTF animations are loaded but not played automatically

## Future Enhancements

- [ ] Material editor for uploaded models
- [ ] Model library/gallery
- [ ] Rotation controls
- [ ] Scale controls
- [ ] Snap-to-grid functionality
- [ ] Export combined scene as GLTF
- [ ] Texture upload support for OBJ files

## Troubleshooting

**"Failed to load model"**
- Check that the file format is correct
- Try converting to GLB (most reliable format)
- Ensure the file isn't corrupted

**"Model is too small/large"**
- The auto-scaling should handle this, but you can manually edit the scale multiplier in `ModelLoader.ts` (line 55)

**"Can't grab the model in VR"**
- Make sure the model was successfully loaded (check console)
- Try grabbing different parts of the model
- The model may be behind you - turn around!

**"Model has no color"**
- OBJ files need MTL files for materials
- STL files use a default gray material
- Use GLTF/GLB for full material support
