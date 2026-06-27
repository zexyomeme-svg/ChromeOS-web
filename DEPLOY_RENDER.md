# Deploying ChromeOS Web Desktop on Render

This project is prepared to run on Render as a **Python web service**.

## Recommended Render setup
The included `render.yaml` is already configured for Render Blueprints.

### Included Render config
- Runtime: `python`
- Start command: `python run.py`
- Health check: `/healthz`
- Plan: `free`

## Why web service instead of static site?
This project exposes live runtime stats from `/api/stats` and adapts its behavior based on detected host resources. That requires a running server process.

## Deploy steps
1. Push this project to GitHub.
2. In Render, create a new **Blueprint** or **Web Service**.
3. If using Blueprint deployment, Render will detect `render.yaml`.
4. Deploy.

## Local run
```bash
python run.py
```

## Endpoints
- `/` — app
- `/healthz` — health check endpoint
- `/api/stats` — runtime stats endpoint

## Adaptive behavior
The UI polls `/api/stats` and automatically adjusts its performance profile:
- `economy`
- `balanced`
- `performance`

## Optional Node runner
If you prefer Node locally, you can also run:
```bash
npm start
```
This uses `backend/server.js`.
