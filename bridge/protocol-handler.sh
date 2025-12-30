#!/bin/bash
# THE PALACE - Deep Link Protocol Handler
# Handles the-palace:// URLs on macOS
#
# Installation:
# 1. Run: chmod +x bridge/protocol-handler.sh
# 2. Create the .app bundle (see bridge/install-protocol.sh)

URL="$1"

# Parse the URL: the-palace://action?path=/some/path
ACTION=$(echo "$URL" | sed -n 's|the-palace://\([^?]*\).*|\1|p')
PATH_PARAM=$(echo "$URL" | sed -n 's|.*path=\([^&]*\)|\1|p' | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> ~/Desktop/palace-v1\ 2/bridge/protocol.log
}

log "Received: $URL"
log "Action: $ACTION, Path: $PATH_PARAM"

case "$ACTION" in
    "open"|"launch")
        if [ -d "$PATH_PARAM" ]; then
            code "$PATH_PARAM"
            log "Opened in Windsurf: $PATH_PARAM"
        else
            osascript -e "display notification \"Path not found: $PATH_PARAM\" with title \"The Palace\""
            log "Error: Path not found"
        fi
        ;;
    "terminal")
        if [ -d "$PATH_PARAM" ]; then
            open -a Terminal "$PATH_PARAM"
            log "Opened Terminal: $PATH_PARAM"
        fi
        ;;
    "finder")
        if [ -d "$PATH_PARAM" ]; then
            open "$PATH_PARAM"
            log "Opened Finder: $PATH_PARAM"
        fi
        ;;
    *)
        osascript -e "display notification \"Unknown action: $ACTION\" with title \"The Palace\""
        log "Error: Unknown action"
        ;;
esac
