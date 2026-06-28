# ChromeOS Web Desktop

A ChromeOS-inspired web desktop built as a browser app with a Python-first server runner, a Node fallback runner, live runtime stats, profiles, virtual desks, and a more realistic ChromeOS-style UI.

## What this project is
This project aims to feel like a modern ChromeOS desktop in the browser:
- centered shelf
- launcher-first workflow
- quick settings panel
- overview mode for windows and desks
- multi-profile local state
- optional widgets instead of fake desktop clutter
- live host/runtime stats when served through Python or Node

It is not a real operating system, but it is organized and deployed like a proper web app.

## Project structure
```text
backend/
  __init__.py
  runtime_stats.py      # Python runtime and host stats helpers
  server.py             # Python HTTP server
  server.js             # Node HTTP server
frontend/
  index.html
  assets/
    css/styles.css
    js/app.js
run.py                  # Main Python entry point
render.yaml             # Render Blueprint / deployment config
package.json            # Node runner scripts
requirements.txt        # Runtime dependencies (none required)
requirements-dev.txt    # Optional dev / observability tools
README.md
DEPLOY_RENDER.md
```

## Run locally
### Python
```bash
python run.py
```
Open:
```text
http://localhost:3000
```

### Node
```bash
npm start
```

### Node using package script name for Python
```bash
npm run start:py
```

## Main features
- ChromeOS-inspired boot and lock screen
- profile selection with local per-profile state
- launcher-based app discovery
- centered shelf with running app indicators
- overview mode for open windows and desks
- virtual desks / multiple desktops
- quick settings with system information
- notifications center
- local files, notes, tasks, mail, calendar, media, drawing, and more
- live runtime stats from `/api/stats`
- adaptive UI behavior based on detected CPU / RAM profile
- browser fallback when server runtime stats are unavailable

## Included apps
- Browser
- Files
- Text
- Notes
- Calculator
- Calendar
- Camera
- Gallery
- Terminal
- Tasks
- Mail
- Clock
- Canvas
- Media
- Settings

## Endpoints
- `/` — main app
- `/healthz` — health check
- `/api/stats` — runtime stats used by the UI

## Keyboard shortcuts
- `Ctrl + Space` — open Launcher
- `Alt + Tab` — cycle windows on the current desk
- `Ctrl + Alt + L` — lock screen
- `Ctrl + S` — save in Text
- `Escape` — close open panels / exit overview

## Requirements files
### `requirements.txt`
Runtime dependencies are intentionally empty because the Python server uses only the standard library.

### `requirements-dev.txt`
Optional tools researched and prepared for future development:
- `pytest` — tests
- `ruff` — linting / formatting
- `sentry-sdk` — error monitoring
- `opentelemetry-*` — observability / metrics / tracing

## Persistence
- user data is stored in browser `localStorage`
- profiles keep separate desktop/app state
- imported files and generated content are browser-local

## Notes
- External websites may not fully load inside the in-app Browser if the destination blocks iframes.
- The UI intentionally avoids fake ChromeOS desktop behavior like permanent desktop app icons.
- The shelf, launcher, quick settings, overview, and profiles are the primary interaction model.
- For deployment details, see `DEPLOY_RENDER.md`.
