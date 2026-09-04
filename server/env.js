/**
 * 极简 .env 加载器（零依赖）
 * - server.js 最先 require 本模块
 * - 已存在的 process.env 优先（systemd / shell 注入不会被覆盖）
 * - 只解析行首 KEY=VALUE；支持 # 注释与单双引号值
 */
"use strict";

const fs = require("fs");
const path = require("path");

function loadEnv() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (let raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (!key) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv();
