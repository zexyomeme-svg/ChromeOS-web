# ChromeOS Web Desktop

A ChromeOS-inspired web desktop with profiles, apps, virtual desks, widgets, live runtime stats, and Render-ready deployment.

## Project structure
```text
backend/
  __init__.py
  runtime_stats.py
  server.py
  server.js
frontend/
  index.html
  assets/
    css/styles.css
    js/app.js
run.py
render.yaml
package.json
requirements.txt
```

## Run the project
### Python
```bash
python run.py
```
Then open `http://localhost:3000`.

### Node
```bash
npm start
```
Then open `http://localhost:3000`.

## Major features
- ChromeOS-inspired desktop UI
- Boot flow and multi-profile sign-in / lock screen
- Floating shelf with running app indicators
- Launcher with search across apps, files, notes, tasks, mail, events, and profiles
- Draggable, minimizable, maximizable, multi-window apps
- Quick settings and notification center
- Virtual desks / multiple desktops
- Desktop widget rail
- Persistent local storage profiles and data
- Live runtime stats via `/api/stats`
- Adaptive performance profile based on detected CPU / RAM

## Included apps
- Browser
- Files
- Text editor
- Notes
- Calculator
- Calendar
- Camera
- Gallery
- Terminal
- Tasks
- Mail
- Clock
- Canvas (paint app)
- Media player
- Settings

## Render-ready files
- `run.py`
- `backend/server.py`
- `render.yaml`
- `requirements.txt`
- `DEPLOY_RENDER.md`

## Shortcuts
- `Ctrl + Space` — open Launcher
- `Alt + Tab` — cycle windows on the current desk
- `Ctrl + Alt + L` — lock screen
- `Ctrl + S` — save in Text editor

## Notes
- Data persists in `localStorage` and is stored per profile.
- External websites may not load in the in-app Browser preview if the site blocks iframes or if the preview has no network access.
- Imported files, notes, tasks, mail, wallpapers, and settings are saved locally in the browser.
