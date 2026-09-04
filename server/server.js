/**
 * Kitty 账本 API · Express 入口
 * 默认监听 127.0.0.1:8300（仅 nginx 可达）；本地联调可用 0.0.0.0
 */
"use strict";

require("./env"); // 最先加载：支持 server/.env（已有环境变量优先）

const express = require("express");
const db = require("./db");
const auth = require("./auth");

const PORT = Number(process.env.PORT || 8300);
const HOST = process.env.BIND_HOST || "127.0.0.1";
const corsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

const app = express();
app.use(express.json({ limit: "2mb" }));

// CORS（仅本地跨端口联调需要；生产同源可留空）
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (corsOrigins.includes("*") || corsOrigins.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function clientIp(req) {
  return req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
}

// 鉴权中间件：解析 Bearer token → req.user
async function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  const user = await auth.resolveToken(token);
  if (!user) {
    return res.status(401).json({ error: "未登录或登录已过期" });
  }
  req.user = user;
  req.token = token;
  next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "Kitty API", time: Date.now() });
});

// ---------- auth ----------
app.post("/api/auth/register", async (req, res) => {
  try {
    const r = await auth.register(req.body && req.body.username, req.body && req.body.password);
    if (r.error) return res.status(400).json({ error: r.error });
    res.status(201).json({ user: r.user, token: r.token, expiresAt: r.expiresAt });
  } catch (e) {
    res.status(500).json({ error: "注册失败: " + e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const r = await auth.login(req.body && req.body.username, req.body && req.body.password, clientIp(req));
    if (r.error) return res.status(401).json({ error: r.error });
    res.json({ user: r.user, token: r.token, expiresAt: r.expiresAt });
  } catch (e) {
    res.status(500).json({ error: "登录失败: " + e.message });
  }
});

app.post("/api/auth/logout", authRequired, async (req, res) => {
  try {
    await auth.logout(req.token);
    res.sendStatus(204);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/me", authRequired, (req, res) => {
  res.json({ user: req.user });
});

// M2 将在此处挂载 /api/sync/*（push / pull）

app.use((req, res) => {
  res.status(404).json({ error: "Not Found: " + req.path });
});
// 统一错误兜底
app.use((err, _req, res, _next) => {
  res.status(500).json({ error: "Server Error: " + (err && err.message) });
});

async function main() {
  await db.init();
  console.log("[Kitty API] MySQL 连接成功，表结构就绪");
  app.listen(PORT, HOST, () => {
    console.log(`[Kitty API] listening on http://${HOST}:${PORT}`);
  });
}

main().catch((e) => {
  console.error("[Kitty API] 启动失败:", e.message);
  console.error("请检查 server/.env 中的 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME（参考 .env.example）");
  process.exit(1);
});
