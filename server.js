// HTTPS 本地开发服务器 — 用于手机 PWA 安装测试
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8444;
const ROOT = __dirname;
const APP_NAME = 'Kitty 账本 (kitty-ledger)';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pem': 'application/x-pem-file'
};

// ============================================================
// API 路由：DeepSeek 代理（POST /api/chat）
// 前端把 API Key 放在 X-API-Key 请求头，服务端不落盘，仅透传。
// 这样浏览器不用直连 DeepSeek，规避 CORS 与 Key 暴露。
// ============================================================
function handleAPI(req, res) {
  const url = req.url.split('?')[0];
  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ok: true, app: APP_NAME }));
  }
  if (url === '/api/chat' && req.method === 'POST') return proxyChat(req, res);
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'API not found' }));
}

function proxyChat(req, res) {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 5e6) req.destroy(); });
  req.on('end', () => {
    const apiKey = (req.headers['x-api-key'] || process.env.DEEPSEEK_API_KEY || '').trim();
    if (!apiKey) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: '缺少 DeepSeek API Key：请在 App 的 ⚙️ AI 设置里填写，或给 server.js 设置 DEEPSEEK_API_KEY 环境变量' }));
    }
    const upstream = https.request({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 120000
    }, (ur) => {
      res.writeHead(ur.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      ur.pipe(res);
    });
    upstream.on('timeout', () => upstream.destroy(new Error('上游超时')));
    upstream.on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '请求 DeepSeek 失败: ' + e.message }));
    });
    upstream.write(body);
    upstream.end();
  });
}

// 总入口：API 优先，其余走静态文件
function handleRequest(req, res) {
  if (req.url.startsWith('/api/')) return handleAPI(req, res);
  return serveFile(req, res);
}

function serveFile(req, res) {
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(ROOT, 'index.html'), (err2, data2) => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

// 启动 HTTPS 服务器（优先）
const keyPath = path.join(ROOT, 'key.pem');
const certPath = path.join(ROOT, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  try {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);

    const httpsServer = https.createServer({ key, cert }, handleRequest);
    httpsServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[${APP_NAME}] HTTPS 服务器已启动:`);
      console.log(`  电脑访问: https://localhost:${PORT}`);
      console.log(`  手机访问: https://<你的电脑IP>:${PORT}`);
      console.log(`  注意: 手机首次打开需点击"高级"→"继续访问"`);
    });
    httpsServer.on('error', (e) => {
      console.error('HTTPS Server Error:', e.message);
    });
  } catch (e) {
    console.error('HTTPS 启动失败:', e.message);
    console.error('错误详情:', e.stack);
    startHTTP();
  }
} else {
  console.log('未找到证书文件，使用 HTTP');
  startHTTP();
}

function startHTTP() {
  http.createServer(handleRequest).listen(PORT, '0.0.0.0', () => {
    console.log(`[${APP_NAME}] HTTP 服务器已启动: http://localhost:${PORT}`);
  });
}
