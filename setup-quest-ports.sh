#!/bin/bash

echo "🔌 Meta Quest Port Forwarding Setup"
echo "===================================="
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found. Please install Android Platform Tools."
    echo "   Download from: https://developer.android.com/studio/releases/platform-tools"
    exit 1
fi

# Check device connection
echo "📱 Checking Quest connection..."
DEVICE_STATUS=$(adb devices | grep -v "List" | grep -v "^$" | awk '{print $2}')

if [ -z "$DEVICE_STATUS" ]; then
    echo "❌ No Quest device found!"
    echo ""
    echo "Please:"
    echo "1. Connect Quest to computer via USB"
    echo "2. Put on Quest headset"
    echo "3. Accept 'Allow USB Debugging?' prompt"
    echo "4. Run this script again"
    exit 1
fi

if [ "$DEVICE_STATUS" = "unauthorized" ]; then
    echo "⚠️  Quest is connected but not authorized!"
    echo ""
    echo "Please:"
    echo "1. Put on Quest headset"
    echo "2. Look for 'Allow USB Debugging?' prompt"
    echo "3. Check 'Always allow from this computer'"
    echo "4. Click 'Allow'"
    echo "5. Run this script again"
    exit 1
fi

if [ "$DEVICE_STATUS" = "device" ]; then
    echo "✅ Quest is connected and authorized!"
    echo ""
    
    # Forward ports
    echo "🔀 Forwarding ports..."
    adb reverse tcp:5173 tcp:5173
    adb reverse tcp:3001 tcp:3001
    
    if [ $? -eq 0 ]; then
        echo "✅ Ports forwarded successfully!"
        echo ""
        echo "📱 On Quest Browser, navigate to:"
        echo "   https://localhost:5173/app.html"
        echo ""
        echo "🎮 WebXR should now work!"
    else
        echo "❌ Failed to forward ports"
        exit 1
    fi
else
    echo "⚠️  Unknown device status: $DEVICE_STATUS"
    exit 1
fi

