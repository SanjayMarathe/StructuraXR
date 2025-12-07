# Meta Quest XR Debugging Guide

## 🔍 How to See Console Logs in XR Mode

When you're in VR on Meta Quest, you can't see the browser console directly. Here are several ways to debug:

---

## Method 1: Chrome Remote Debugging (Recommended)

### Setup:

1. **Enable USB Debugging on Quest:**
   - Put on Quest headset
   - Accept "Allow USB Debugging?" prompt
   - Connect Quest to computer via USB

2. **Forward Chrome DevTools port:**
   ```bash
   adb forward tcp:9222 tcp:9222
   ```

3. **Open Chrome DevTools:**
   - Open Chrome browser on your computer
   - Navigate to: `chrome://inspect`
   - You should see your Quest browser session listed
   - Click "inspect" to open DevTools

4. **View Console:**
   - The DevTools window will show Console tab
   - All `console.log()` messages will appear here
   - You can also see Network requests, errors, etc.

### Benefits:
- ✅ Real-time console logs
- ✅ Network request monitoring
- ✅ Breakpoint debugging
- ✅ Element inspection
- ✅ Performance profiling

---

## Method 2: ADB Logcat (Alternative)

### View Browser Logs:
```bash
# View all logs
adb logcat

# Filter for browser/JavaScript logs
adb logcat | grep -i "chromium\|console\|error"

# Clear logs and start fresh
adb logcat -c && adb logcat
```

### Benefits:
- ✅ Works without Chrome
- ✅ Shows system-level logs
- ✅ Can filter specific messages

---

## Method 3: On-Screen Debug UI (Built-in)

I can add an on-screen debug panel that shows console logs directly in VR. This would be a floating 3D panel that displays:
- Console logs
- API call status
- Error messages
- Network requests

Would you like me to add this feature?

---

## Method 4: Quest Browser Console (Limited)

Some Quest browsers have a built-in console:
1. While in browser (before entering VR)
2. Press certain key combinations (varies by browser)
3. Or use browser settings to enable developer tools

**Note:** This is limited and not always available.

---

## 🎯 Quick Debugging Steps

### 1. Check if Backend is Accessible:
```bash
# On your computer, test if backend is running:
curl http://localhost:3001/health

# Should return: {"status":"ok",...}
```

### 2. Test Port Forwarding:
```bash
# Check if port forwarding is active:
adb reverse --list

# Should show:
# tcp:5173 tcp:5173
# tcp:3001 tcp:3001
```

### 3. Test from Quest Browser:
- Before entering VR, open browser console
- Navigate to your app
- Check for any errors
- Then enter VR mode

---

## 🔧 Common Issues & Solutions

### Issue: "Failed to fetch" or Network Error

**Check:**
1. Backend server is running: `curl http://localhost:3001/health`
2. Port forwarding is active: `adb reverse --list`
3. Backend URL in console matches your setup

**Solution:**
- Restart port forwarding: `adb reverse tcp:3001 tcp:3001`
- Check backend is listening on correct port
- Verify no firewall blocking connections

### Issue: Console shows "Backend URL: http://localhost:3001" but API fails

**This means:**
- Port forwarding might not be working
- Backend might not be accessible from Quest

**Solution:**
- Use computer's IP address instead
- Update backend URL to use IP (e.g., `http://10.0.0.7:3001`)
- Make sure both Quest and computer are on same network

---

## 📱 Remote Debugging Setup Script

I can create a script that:
1. Checks Quest connection
2. Sets up port forwarding
3. Opens Chrome DevTools automatically
4. Shows helpful debugging info

Would you like me to create this?

---

## 💡 Pro Tips

1. **Use console.log() liberally** - They'll show in remote DevTools
2. **Add error boundaries** - Catch and display errors on-screen
3. **Network tab** - Monitor API calls in real-time
4. **Breakpoints** - Pause execution to inspect state
5. **Performance tab** - Check frame rates in VR

---

## 🚀 Quick Start

```bash
# 1. Connect Quest via USB
# 2. Run this command:
adb forward tcp:9222 tcp:9222

# 3. Open Chrome and go to:
chrome://inspect

# 4. Click "inspect" on your Quest browser session
# 5. Console logs will appear in DevTools!
```

