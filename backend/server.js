const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip',
};

function inferPerformanceProfile(stats) {
  if ((stats.totalMemMb || 0) < 768 || (stats.cpuCores || 0) < 1) return 'economy';
  if ((stats.totalMemMb || 0) < 4096 || (stats.cpuCores || 0) < 2) return 'balanced';
  return 'performance';
}

function runtimeStats() {
  const mem = process.memoryUsage();
  const totalMemMb = Math.round(os.totalmem() / 1024 / 1024);
  const freeMemMb = Math.round(os.freemem() / 1024 / 1024);
  const cpuCores = os.cpus()?.length || 0;
  return {
    environment: process.env.RENDER ? 'render' : 'node',
    render: {
      serviceName: process.env.RENDER_SERVICE_NAME || null,
      instanceId: process.env.RENDER_INSTANCE_ID || null,
      region: process.env.RENDER_REGION || null,
      gitCommit: process.env.RENDER_GIT_COMMIT || null,
      gitBranch: process.env.RENDER_GIT_BRANCH || null,
    },
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptimeSec: Math.round(process.uptime()),
      cpuCores,
      loadAvg: os.loadavg().map((value) => Number(value.toFixed(2))),
      totalMemMb,
      freeMemMb,
    },
    process: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      externalMb: Math.round(mem.external / 1024 / 1024),
      pid: process.pid,
    },
    performanceProfile: inferPerformanceProfile({ totalMemMb, cpuCores }),
    timestamp: new Date().toISOString(),
  };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendFile(req, res, filePath) {
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const etag = crypto.createHash('sha1').update(`${stat.mtimeMs}:${stat.size}:${filePath}`).digest('hex');
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304);
      res.end();
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600, must-revalidate',
      ETag: etag,
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

function safePathname(urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const cleaned = decoded === '/' ? '/index.html' : decoded;
  const normalized = path.normalize(cleaned).replace(/^([.][.][/\\])+/, '');
  return path.join(FRONTEND, normalized);
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    sendJson(res, 200, { ok: true, uptimeSec: Math.round(process.uptime()) });
    return;
  }

  if (req.url === '/api/stats') {
    sendJson(res, 200, runtimeStats());
    return;
  }

  const filePath = safePathname(req.url);
  if (!filePath.startsWith(FRONTEND)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  sendFile(req, res, filePath);
});

server.listen(PORT, () => {
  console.log(`ChromeOS Web node server listening on http://0.0.0.0:${PORT}`);
});
