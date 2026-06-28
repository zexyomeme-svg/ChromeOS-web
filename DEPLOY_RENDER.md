# Deploying ChromeOS Web Desktop on Render

This project is prepared to run on Render as a **Python web service**.

## Why use a web service?
This app exposes:
- `/healthz` for health checks
- `/api/stats` for live runtime information

Those endpoints let the UI display real runtime data such as:
- CPU core count
- detected RAM
- process memory usage
- uptime
- adaptive performance profile

Because of that, a web service is the correct deployment target.

## Included Render config
The included `render.yaml` is already configured:
- Runtime: `python`
- Plan: `free`
- Build command: `echo 'No Python dependencies required'`
- Start command: `python run.py`
- Health check path: `/healthz`

## Deploy steps
1. Push the repository to GitHub.
2. In Render, create a new **Blueprint** or **Web Service**.
3. If you use a Blueprint, Render should detect `render.yaml` automatically.
4. Deploy.

## Local run commands
### Python
```bash
python run.py
```

### Node fallback
```bash
npm start
```

## Endpoints
- `/` — app
- `/healthz` — health status
- `/api/stats` — runtime stats for the desktop UI

## Adaptive behavior
The frontend polls `/api/stats` and automatically shifts between:
- `economy`
- `balanced`
- `performance`

This helps the UI scale more gracefully across smaller and larger environments.

## Requirements files
- `requirements.txt` — empty runtime requirements because the Python server uses the standard library only
- `requirements-dev.txt` — optional tooling like pytest, Ruff, Sentry, and OpenTelemetry

## Render notes
- The current config is suitable for a free Render web service.
- If you later add observability or tracing, the optional dev requirements already list packages you may want.
- If you prefer Node for local work, `backend/server.js` remains available, but the default Render deployment is Python.
