# 🏰 THE PALACE - COCKPIT SYSTEM

## Overview

The Cockpit transforms The Palace from a passive dashboard into an active **Command Center**. 
It breaks through the browser sandbox to give you direct control over your local development environment.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  VERCEL (the-palace-livid.vercel.app)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Frontend UI with Action Buttons                        │   │
│  │  [Launch] [Pulse] [Terminal]                            │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                     │
│                           │ WebSocket / Deep Links              │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  YOUR MAC (localhost)                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Palace Bridge Server (ws://localhost:9999)              │   │
│  │  • Receives commands from frontend                       │   │
│  │  • Executes local actions (open IDE, git status, etc)    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Protocol Handler (the-palace://)                        │   │
│  │  • Fallback when bridge is offline                       │   │
│  │  • Direct deep links from browser                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start the Bridge Server

Open a terminal and run:

```bash
cd ~/Desktop/palace-v1\ 2
npm run bridge
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║   🏰 THE PALACE - LOCAL SIDECAR BRIDGE                     ║
║   Status:    ONLINE                                        ║
║   Port:      9999                                          ║
╚════════════════════════════════════════════════════════════╝
```

### 2. Install the Protocol Handler (Optional)

For deep link support (works even when bridge is offline):

```bash
npm run bridge:install
```

Test it:
```bash
open "the-palace://open?path=/Users/bashar/Desktop"
```

### 3. Use the Cockpit

1. Visit https://the-palace-livid.vercel.app
2. Click "Desktop Projects" to enter Local Ecosystem
3. Each project card has three action buttons:
   - **Launch** (🟢) - Opens folder in Windsurf/VS Code
   - **Pulse** (🔵) - Shows git status, branch, uncommitted changes
   - **Terminal** (🟣) - Opens Terminal at project path

## Connection States

The dot in the top-right of each card shows bridge status:

- 🟢 **Green** - Bridge connected, full functionality
- 🟠 **Orange** - Bridge offline, deep links only (Launch/Terminal still work)

## Commands Reference

### Bridge Server Commands

| Action | Description |
|--------|-------------|
| `launch` | Opens path in Windsurf (code command) |
| `pulse` | Returns git status, branch, changes |
| `terminal` | Opens macOS Terminal at path |
| `open` | Opens path in Finder |

### Deep Link Format

```
the-palace://[action]?path=[encoded-path]
```

Examples:
- `the-palace://open?path=/Users/bashar/Desktop/palace-v1`
- `the-palace://terminal?path=/Users/bashar/Desktop/nordiqflow`

## Security

### Path Restrictions

The bridge only accepts paths under allowed directories:
```typescript
const allowedPaths = ['/Users/bashar/Desktop']
```

Modify `bridge/server.ts` to add more allowed paths.

### Network Security

- Bridge runs on localhost only (not exposed to network)
- WebSocket connections are local-only
- No authentication required for local connections

### Production Safety

- The Vercel deployment cannot execute commands directly
- All actions require the local bridge server running
- Deep links require explicit user approval (macOS prompt)

## Troubleshooting

### Bridge won't start
```bash
# Check if port is in use
lsof -i :9999

# Kill existing process
kill -9 $(lsof -t -i :9999)
```

### "code" command not found
Install the Windsurf/VS Code shell command:
1. Open Windsurf
2. Cmd+Shift+P → "Shell Command: Install 'code' command in PATH"

### Deep links not working
Re-register the protocol handler:
```bash
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -R -f ~/Applications/ThePalaceHandler.app
```

## Running Locally (Full Command Center Mode)

For the complete local experience:

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Bridge server
npm run bridge
```

Then visit http://localhost:3000 for the full Command Center experience with zero latency.

---

**The Palace Cockpit** - Your Desktop, Commanded.
