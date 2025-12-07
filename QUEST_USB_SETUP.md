# Meta Quest USB Debugging Setup

## Step-by-Step Instructions

### 1. Enable Developer Mode on Quest

**On your phone (Oculus app):**
1. Open Oculus app
2. Go to Settings → Developer Mode
3. Toggle "Developer Mode" ON

**On Quest headset:**
1. Put on your Quest headset
2. You should see a prompt asking to enable Developer Mode
3. Accept/Enable it

### 2. Connect Quest to Computer

1. Use a USB-C cable to connect Quest to your Mac
2. Put on the headset
3. You should see a prompt: **"Allow USB Debugging?"**
4. Check **"Always allow from this computer"**
5. Click **"Allow"**

### 3. Verify Connection

Run this command to check if Quest is authorized:
```bash
adb devices
```

You should see:
```
List of devices attached
2G0YC1ZF870D6Z	device
```
(Note: "device" instead of "unauthorized")

### 4. Forward Ports

Once authorized, run:
```bash
adb reverse tcp:5173 tcp:5173
adb reverse tcp:3001 tcp:3001
```

### 5. Access on Quest

1. Open **Meta Quest Browser** on your headset
2. Navigate to: `https://localhost:5173/app.html`
3. Accept any certificate warnings (localhost is safe)
4. WebXR should work!

## Troubleshooting

**If Quest shows as "unauthorized":**
- Make sure you accepted the USB debugging prompt on the headset
- Try unplugging and replugging the USB cable
- Make sure Developer Mode is enabled

**If "adb reverse" doesn't work:**
- Make sure Quest shows as "device" (not "unauthorized")
- Try: `adb kill-server` then `adb start-server`
- Reconnect the USB cable

**If localhost doesn't work:**
- Make sure ports are forwarded: `adb reverse tcp:5173 tcp:5173`
- Check that Vite is running: `lsof -i :5173`
- Try refreshing the browser on Quest

