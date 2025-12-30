#!/bin/bash

# Registers the the-palace:// protocol handler on macOS.
# Run: chmod +x scripts/setup-protocol.sh && ./scripts/setup-protocol.sh

set -euo pipefail

APP_NAME="ThePalaceHandler"
APP_DIR="$HOME/Applications/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"

mkdir -p "$MACOS_DIR"

cat > "$MACOS_DIR/$APP_NAME" << 'HANDLER'
#!/bin/bash
URL="$1"

ACTION=$(echo "$URL" | sed -n 's|the-palace://\([^?]*\).*|\1|p')
PATH_PARAM=$(echo "$URL" | sed -n 's|.*path=\([^&]*\)|\1|p' | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")

case "$ACTION" in
  open|launch)
    [ -d "$PATH_PARAM" ] && windsurf "$PATH_PARAM" || true
    [ -d "$PATH_PARAM" ] && code "$PATH_PARAM" || true
    ;;
  terminal)
    [ -d "$PATH_PARAM" ] && open -a Terminal "$PATH_PARAM" || true
    ;;
  *)
    ;;
esac
HANDLER

chmod +x "$MACOS_DIR/$APP_NAME"

cat > "$CONTENTS_DIR/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>app.palace.protocol</string>
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

/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -R -f "$APP_DIR"

echo "Installed protocol handler: the-palace://"
