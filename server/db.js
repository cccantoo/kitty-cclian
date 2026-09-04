/**
 * Kitty 账本 API · MySQL 连接与建表
 * - mysql2 连接池；启动时自动执行 schema.sql（幂等，可重复启动）
 * - 时间统一 UTC 毫秒 BIGINT（Date.now() 语义）
 */
"use strict";

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const cfg = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "kitty_db",
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true, // 仅在初始化建表时用到
  charset: "utf8mb4"
};

let pool = null;

/** 启动连接池 + 确保数据库存在 + 建表 */
async function init() {
  // 1) 不带 database 连接一次，必要时建库
  const boot = await mysql.createConnection({
    host: cfg.host, port: cfg.port,
    user: cfg.user, password: cfg.password,
    multipleStatements: false
  });
  await boot.query(
    "CREATE DATABASE IF NOT EXISTS `" + cfg.database + "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );
  await boot.end();

  // 2) 正式池
  pool = mysql.createPool(cfg);

  // 3) 幂等建表
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  return pool;
}

function getPool() {
  if (!pool) throw new Error("db not initialized");
  return pool;
}

/** 查询：query(sql, params) → rows；带事务的由调用方控制 conn */
async function query(sql, params) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

/** 简单事务执行器：fn(conn) → commit */
async function withTx(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { init, getPool, query, withTx };
