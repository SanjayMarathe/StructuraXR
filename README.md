# 🏗️ VR Structural Playground

An immersive WebXR application that lets users design and test engineering structures in virtual reality using AI-powered generation and analysis.

## Features

- 🎮 **Full VR Support** - Works on Meta Quest headset via browser
- 🤖 **AI Structure Generation** - Describe structures in natural language, Claude generates 3D models
- 📁 **CAD Model Upload** - Import GLTF, GLB, STL, or OBJ files directly into VR
- ✋ **Hand Tracking & Controllers** - Grab, move, and manipulate objects in VR
- 📊 **Stress Visualization** - Real-time color-coded stability analysis (Green = Stable, Red = Unstable)
- 🔍 **AI Analysis Agent** - Get expert feedback on your structural designs

## Tech Stack

- **Frontend:** Three.js + WebXR API, TypeScript, Vite
- **Backend:** Node.js, Express, Anthropic Claude SDK
- **VR Hardware:** Meta Quest (2/3/Pro)

## Project Structure

```
metaquest_app/
├── webxr-app/          # Frontend VR application
│   ├── src/
│   │   ├── main.ts           # Main scene setup
│   │   ├── Interaction.ts    # VR controller/hand interaction
│   │   ├── Structure.ts      # Building block management
│   │   └── Agent.ts          # Backend API client
│   └── index.html
└── backend/            # Backend API server
    ├── server.js             # Express server + Claude integration
    └── .env                  # API credentials
```

## Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure API key
# Edit .env and add your Anthropic API key:
# ANTHROPIC_API_KEY=sk-ant-api03-...

# Start server
npm start
```

The backend will run on `http://localhost:3001`

### 2. Frontend Setup

```bash
cd webxr-app

# Dependencies should already be installed
# If not, run: npm install

# Start dev server
npm run dev -- --host
```

The frontend will run on `http://localhost:5174` (or similar)

### 3. Connect to Meta Quest

**Option A: USB Connection (Recommended for Development)**
1. Connect Quest to computer via USB
2. Enable Developer Mode on Quest
3. Run: `adb reverse tcp:5174 tcp:5174`
4. Run: `adb reverse tcp:3001 tcp:3001`
5. Open Meta Quest Browser
6. Navigate to `http://localhost:5174`

**Option B: WiFi Connection (For Demo/Testing)**
1. Both Quest and computer must be on same network
2. Use ngrok or similar for HTTPS: `ngrok http 5174`
3. Update backend URL in `webxr-app/src/main.ts` to your computer's local IP
4. Open the ngrok HTTPS URL in Quest Browser

## Usage

1. **On Desktop/Laptop:**
   - Type a structure description (e.g., "pyramid of cubes", "suspension bridge")
   - Click "Generate (AI)" to create the structure
   - **Upload CAD Models**: Click "Choose File" and select a GLTF, GLB, STL, or OBJ file
   - Click "Run Stress Test" to visualize stability
   - Click "Analyze (AI Agent)" to get expert feedback

2. **In VR Headset:**
   - Look at objects and pull the trigger (or pinch) to grab them
   - Move your hand to reposition objects
   - Release to drop them
   - Green objects = stable, Red objects = unstable

## Example Prompts

- "Two towers connected by a bridge"
- "A pyramid made of cubes"
- "Three pillars with a roof"
- "A long wall with support columns"
- "A simple house frame"

## Development Notes

- **HTTPS Required:** WebXR requires a secure context. Use localhost or HTTPS in production.
- **CORS:** The backend proxy solves CORS issues when calling the Anthropic API.
- **Physics:** Currently uses simple distance-based collision detection. Can be upgraded to Cannon.js or Ammo.js.
- **Hand Tracking:** Automatically enabled when controllers are put down.

## Troubleshooting

**"Nothing appears when I click Generate"**
- Check browser console for errors
- Verify backend is running on port 3001
- Verify API key is set in `backend/.env`

**"Backend connection error"**
- Make sure backend server is running (`npm start` in backend folder)
- Check that port 3001 is not blocked
- If on Quest via USB, verify `adb reverse tcp:3001 tcp:3001` was run

**"VR Button doesn't appear"**
- WebXR only works on HTTPS or localhost
- Only Meta Quest Browser supports WebXR (not Chrome/Firefox on Quest)

## Future Enhancements

- [ ] Physics engine integration (Cannon.js)
- [ ] Multi-user collaboration
- [ ] Advanced materials (wood, steel, concrete)
- [ ] Save/load structures
- [ ] Real structural engineering calculations
- [ ] Wind/earthquake simulations

## License

MIT

---

Built for Hackathon - VR Structural Playground 🚀
