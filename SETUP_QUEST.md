# Meta Quest Setup Guide

## Quick Setup for Meta Quest

### Option 1: USB Debugging (Recommended for Development)

1. **Enable Developer Mode on Quest:**
   - Open Oculus app on your phone
   - Go to Settings → Developer Mode → Enable
   - Put on Quest headset and accept developer mode prompt

2. **Connect Quest to Computer via USB**

3. **Forward ports using ADB:**
   ```bash
   # Forward Vite dev server (port 5173)
   adb reverse tcp:5173 tcp:5173
   
   # Forward backend API (port 3001)
   adb reverse tcp:3001 tcp:3001
   ```

4. **On Quest Browser:**
   - Open Meta Quest Browser
   - Navigate to: `https://localhost:5173/app.html`
   - Accept the certificate warning if prompted
   - WebXR will work because localhost bypasses certificate validation

### Option 2: Network Access (For Demo/Testing)

1. **Make sure both Quest and computer are on same WiFi network**

2. **Find your computer's IP address:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   (Should show something like `10.0.0.7`)

3. **On Quest Browser:**
   - Navigate to: `https://10.0.0.7:5173/app.html`
   - You'll see a certificate warning - click "Advanced" → "Proceed anyway"
   - If it says "Unsupported Protocol", try HTTP first: `http://10.0.0.7:5173/app.html`
   - Then switch back to HTTPS after accepting certificate

### Option 3: Use ngrok for Proper HTTPS (Best for Demos)

1. **Install ngrok:**
   ```bash
   brew install ngrok  # macOS
   # or download from https://ngrok.com
   ```

2. **Start ngrok tunnel:**
   ```bash
   ngrok http 5173
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

4. **Update backend URL** in `webxr-app/src/main.ts`:
   ```typescript
   const agentManager = new AgentManager('http://localhost:3001');
   // Change to your ngrok URL if backend is also tunneled
   ```

5. **On Quest Browser:**
   - Navigate to the ngrok HTTPS URL
   - No certificate warnings!

## Troubleshooting

**"Unsupported Protocol" error:**
- Make sure you're using HTTPS (not HTTP)
- Try USB debugging method (localhost works best)
- Check that Vite is running with `--host` flag

**"WebXR not available":**
- Make sure you're using HTTPS (required for WebXR)
- Check that you're in a WebXR-compatible browser (Meta Quest Browser)
- Try refreshing the page

**Can't see structures:**
- Make sure backend is running on port 3001
- Check browser console for errors
- Verify API key is set in `backend/.env`

## Current Server Status

- **Frontend:** Running on port 5173 (HTTPS enabled)
- **Backend:** Running on port 3001
- **Access:** `https://localhost:5173/app.html` (USB) or `https://10.0.0.7:5173/app.html` (Network)

