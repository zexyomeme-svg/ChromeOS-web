from __future__ import annotations

import json
import mimetypes
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from .runtime_stats import get_runtime_stats

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / 'frontend'
INDEX_FILE = FRONTEND_DIR / 'index.html'

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('image/svg+xml', '.svg')


class ChromeOSRequestHandler(BaseHTTPRequestHandler):
    server_version = 'ChromeOSWebPython/1.0'

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path or '/'

        if path == '/healthz':
            self._send_json(HTTPStatus.OK, {'ok': True})
            return

        if path == '/api/stats':
            self._send_json(HTTPStatus.OK, get_runtime_stats())
            return

        self._serve_static(path)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def _send_json(self, status: HTTPStatus, payload: dict) -> None:
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_static(self, requested_path: str) -> None:
        relative = requested_path.lstrip('/') or 'index.html'
        safe_relative = Path(unquote(relative))
        target = (FRONTEND_DIR / safe_relative).resolve()

        if requested_path == '/':
            target = INDEX_FILE.resolve()

        if FRONTEND_DIR.resolve() not in target.parents and target != FRONTEND_DIR.resolve():
            self._send_text(HTTPStatus.FORBIDDEN, 'Forbidden')
            return

        if target.is_dir():
            target = target / 'index.html'

        if not target.exists() or not target.is_file():
            self._send_text(HTTPStatus.NOT_FOUND, 'Not found')
            return

        content_type = mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
        body = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-cache' if target.suffix == '.html' else 'public, max-age=3600, must-revalidate')
        self.end_headers()
        self.wfile.write(body)

    def _send_text(self, status: HTTPStatus, message: str) -> None:
        body = message.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run(host: str = '0.0.0.0', port: int | None = None) -> None:
    bind_port = int(port or os.getenv('PORT', '3000'))
    server = ThreadingHTTPServer((host, bind_port), ChromeOSRequestHandler)
    print(f'ChromeOS Web Python server listening on http://{host}:{bind_port}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
