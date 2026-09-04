/**
 * Kitty 账本 API · 认证模块
 * - 用户名 + 密码（bcryptjs cost=10）
 * - 登录签发 32 字节随机 hex token 入库（auth_tokens），可单设备登出 / 改密全踢
 * - 简单内存限流：同 key（IP:username）失败 N 次锁窗口
 */
"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("./db");

const TTL_DAYS = Number(process.env.TOKEN_TTL_DAYS || 90);
const RATE_MIN = Number(process.env.RATE_WINDOW_MIN || 15);
const RATE_MAX = Number(process.env.RATE_MAX_FAILS || 5);

// 简易内存限流（单进程够用；将来可挪 Redis/DB）
const failMap = new Map(); // key -> { count, lockUntil }

function rateKey(ip, username) {
  return (ip || "?") + "|" + String(username || "").toLowerCase();
}
function rateCheck(key) {
  const rec = failMap.get(key);
  if (rec && rec.lockUntil > Date.now()) return rec.lockUntil;
  return 0;
}
function rateFail(key) {
  const rec = failMap.get(key) || { count: 0, lockUntil: 0 };
  rec.count += 1;
  if (rec.count >= RATE_MAX) {
    rec.lockUntil = Date.now() + RATE_MIN * 60 * 1000;
    rec.count = 0;
  }
  failMap.set(key, rec);
}
function rateClear(key) {
  failMap.delete(key);
}
// 定期清理过期 key，防内存膨胀
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of failMap) {
    if (v.lockUntil < now && v.count === 0) failMap.delete(k);
    else if (v.lockUntil < now) { v.count = 0; }
  }
}, 10 * 60 * 1000).unref();

function now() { return Date.now(); }

/** 用户名规范：小写、字母数字下划线、3-20 位 */
function validUsername(u) {
  return /^[a-z0-9_]{3,20}$/.test(String(u || "").toLowerCase());
}

async function hashPassword(pw) {
  return bcrypt.hash(String(pw), 10);
}

async function newToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const createdAt = now();
  const expiresAt = createdAt + TTL_DAYS * 24 * 3600 * 1000;
  await db.query(
    "INSERT INTO auth_tokens (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [userId, token, expiresAt, createdAt]
  );
  return { token, expiresAt };
}

/** 注册 */
async function register(username, password) {
  const uname = String(username || "").trim().toLowerCase();
  if (!validUsername(uname)) {
    return { error: "用户名需为 3-20 位小写字母/数字/下划线" };
  }
  if (!password || String(password).length < 6) {
    return { error: "密码至少 6 位" };
  }
  const existing = await db.query("SELECT id FROM users WHERE username = ?", [uname]);
  if (existing.length) return { error: "用户名已被注册" };
  const createdAt = now();
  const hash = await hashPassword(password);
  await db.query(
    "INSERT INTO users (username, password_hash, nickname, created_at, updated_at) VALUES (?, ?, '', ?, ?)",
    [uname, hash, createdAt, createdAt]
  );
  const [user] = await db.query("SELECT id, username, nickname FROM users WHERE username = ?", [uname]);
  const tok = await newToken(user.id);
  return { user, token: tok.token, expiresAt: tok.expiresAt };
}

/** 登录 */
async function login(username, password, ip) {
  const uname = String(username || "").trim().toLowerCase();
  const key = rateKey(ip, uname);
  const locked = rateCheck(key);
  if (locked) {
    const mins = Math.ceil((locked - now()) / 60000);
    return { error: `尝试次数过多，请 ${mins} 分钟后再试` };
  }
  const rows = await db.query("SELECT * FROM users WHERE username = ?", [uname]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(String(password || ""), user.password_hash));
  if (!ok) {
    rateFail(key);
    return { error: "用户名或密码错误" };
  }
  rateClear(key);
  const tok = await newToken(user.id);
  return {
    user: { id: user.id, username: user.username, nickname: user.nickname || "" },
    token: tok.token,
    expiresAt: tok.expiresAt
  };
}

/** 按 Bearer token 解析用户（鉴权中间件用） */
async function resolveToken(token) {
  if (!token) return null;
  const rows = await db.query(
    "SELECT t.user_id AS uid, u.username, u.nickname, t.expires_at FROM auth_tokens t JOIN users u ON u.id = t.user_id WHERE t.token = ?",
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  if (row.expires_at <= now()) return null;
  return { id: row.uid, username: row.username, nickname: row.nickname || "" };
}

/** 登出：删除该 token */
async function logout(token) {
  await db.query("DELETE FROM auth_tokens WHERE token = ?", [token]);
}

/** 修改密码：全设备踢下线 */
async function changePassword(userId, newPw) {
  if (!newPw || String(newPw).length < 6) return { error: "密码至少 6 位" };
  const hash = await hashPassword(newPw);
  const t = now();
  await db.query("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [hash, t, userId]);
  await db.query("DELETE FROM auth_tokens WHERE user_id = ?", [userId]);
  return {};
}

module.exports = {
  register, login, logout, resolveToken, changePassword, validUsername
};
