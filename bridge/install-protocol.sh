#!/bin/bash
# THE PALACE - Protocol Handler Installer for macOS
# Creates a .app bundle that registers the the-palace:// protocol

APP_NAME="ThePalaceHandler"
APP_DIR="$HOME/Applications/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🏰 Installing The Palace Protocol Handler..."

# Create app structure
mkdir -p "$MACOS_DIR"

# Create the executable script
cat > "$MACOS_DIR/$APP_NAME" << 'HANDLER_SCRIPT'
#!/bin/bash
URL="$1"

# Parse the URL
ACTION=$(echo "$URL" | sed -n 's|the-palace://\([^?]*\).*|\1|p')
PATH_PARAM=$(echo "$URL" | sed -n 's|.*path=\([^&]*\)|\1|p' | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")

case "$ACTION" in
    "open"|"launch")
        [ -d "$PATH_PARAM" ] && code "$PATH_PARAM"
        ;;
    "terminal")
        [ -d "$PATH_PARAM" ] && open -a Terminal "$PATH_PARAM"
        ;;
    "finder")
        [ -d "$PATH_PARAM" ] && open "$PATH_PARAM"
        ;;
esac
HANDLER_SCRIPT

chmod +x "$MACOS_DIR/$APP_NAME"

# Create Info.plist
cat > "$CONTENTS_DIR/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.palace.handler</string>
    <key>CFBundleName</key>
    <string>ThePalaceHandler</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleExecutable</key>
    <string>ThePalaceHandler</string>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>The Palace Protocol</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>the-palace</string>
            </array>
        </dict>
    </array>
    <key>LSBackgroundOnly</key>
    <true/>
</dict>
</plist>
PLIST

# Register the app with Launch Services
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -R -f "$APP_DIR"

echo ""
echo "✅ Protocol handler installed!"
echo ""
echo "📍 Location: $APP_DIR"
echo "🔗 Protocol: the-palace://"
echo ""
echo "Test it with:"
echo "  open 'the-palace://open?path=/Users/bashar/Desktop'"
echo ""
