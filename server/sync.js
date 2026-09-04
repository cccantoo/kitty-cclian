/**
 * Kitty 账本 API · 数据同步（M2）
 * ----------------------------------------------------------
 * 设计（见 docs/server-persistence.md §5）：
 *  - POST /api/sync/push  批量 upsert（按表），last-write-wins
 *  - GET  /api/sync/pull  按表增量拉取（updated_at > since）
 *  - 客户端主键由服务端强绑定 user_id，保证幂等、跨用户隔离
 *  - 冲突：库内 updated_at 大于本次行 → 跳过写入并返回服务器权威行(conflicts)
 *  - 软删：行带 deleted_at 即墓碑，随增量同步到其它设备；60 天后物理清理
 * 时间全部 UTC 毫秒（Date.now()）
 */
"use strict";

const db = require("./db");

// 各表可写列（白名单，防客户端乱塞列）；user_id 一律服务端注入
const META = {
  books: {
    keyCols: ["id"],
    cols: ["id", "name", "icon", "is_default", "created_at", "updated_at", "deleted_at"]
  },
  accounts: {
    keyCols: ["book_id", "id"],
    cols: ["id", "book_id", "name", "icon", "order_no", "created_at", "updated_at", "deleted_at"]
  },
  categories: {
    keyCols: ["id"],
    cols: ["id", "type", "name", "icon", "created_at", "updated_at", "deleted_at"]
  },
  transactions: {
    keyCols: ["id"],
    cols: ["id", "book_id", "type", "amount_cents", "category_id", "account_id",
           "account_from", "account_to", "note", "tags_json", "ts",
           "created_at", "updated_at", "deleted_at"]
  },
  budgets: {
    keyCols: ["book_id", "month"],
    cols: ["book_id", "month", "total_cents", "cats_json", "updated_at", "deleted_at"]
  },
  memos: {
    keyCols: ["id"],
    cols: ["id", "title", "content", "color", "tags_json", "pinned", "archived",
           "trashed", "trashed_at", "created_at", "updated_at", "deleted_at"]
  },
  preferences: {
    keyCols: ["pkey"],
    cols: ["pkey", "pvalue", "source", "created_at", "updated_at", "deleted_at"]
  },
  messages: {
    keyCols: ["id"],
    cols: ["id", "role", "content", "tool_cards_json", "kind", "ts",
           "created_at", "updated_at", "deleted_at"]
  }
};

const MAX_ROWS_PER_TABLE = 1000;
const MAX_TOTAL = 5000;
const SOFT_DELETE_KEEP_MS = 60 * 24 * 3600 * 1000; // 软删行保留 60 天

/** 规范化布尔/数值列（MySQL 参数友好） */
const INT_COLS = new Set([
  "is_default", "order_no", "pinned", "archived", "trashed",
  "amount_cents", "total_cents", "ts", "created_at", "updated_at", "deleted_at", "trashed_at"
]);

function cleanRow(tableMeta, raw) {
  const row = {};
  for (const c of tableMeta.cols) {
    if (!(c in raw)) continue;
    let v = raw[c];
    if (INT_COLS.has(c)) {
      if (v === null || v === undefined || v === "") v = c === "deleted_at" || c === "trashed_at" ? null : 0;
      else v = Number(v);
    } else {
      v = (v === null || v === undefined) ? null : String(v);
    }
    row[c] = v;
  }
  return row;
}

/** 摘掉内部列 user_id */
function stripUserId(r) {
  if (!r || typeof r !== "object") return r;
  const { user_id, ...rest } = r;
  return rest;
}

/** 行主键条件 SQL（user_id 固定） */
function keyWhere(tableMeta) {
  return tableMeta.keyCols.map((c) => "`" + c + "` = ?").join(" AND ");
}

/** push：批量 upsert（事务），返回每表 accepted/invalid/conflicts */
async function pushTables(userId, tablesObj) {
  const out = {};
  const conn = await db.getPool().getConnection();
  try {
    await conn.beginTransaction();
    for (const [table, rawRows] of Object.entries(tablesObj || {})) {
      const meta = META[table];
      if (!meta) { out[table] = { accepted: 0, invalid: [{ index: -1, reason: "未知表" }], conflicts: [] }; continue; }
      if (!Array.isArray(rawRows) || rawRows.length > MAX_ROWS_PER_TABLE) {
        out[table] = { accepted: 0, invalid: [{ index: -1, reason: "rows 需为数组且 ≤ " + MAX_ROWS_PER_TABLE }], conflicts: [] };
        continue;
      }
      const res = { accepted: 0, invalid: [], conflicts: [] };
      for (let i = 0; i < rawRows.length; i++) {
        const row = cleanRow(meta, rawRows[i]);
        const missing = meta.keyCols.filter((c) => row[c] === undefined || row[c] === null);
        if (missing.length) { res.invalid.push({ index: i, reason: "缺少主键列: " + missing.join(",") }); continue; }
        if (row.updated_at == null) row.updated_at = Date.now();
        const up = Number(row.updated_at);

        // 1) 查现有行做冲突裁决（mysql2 query 返回 [rows, fields]）
        const existingRows = (await conn.query(
          "SELECT `" + meta.keyCols.join("`,`") + "`, updated_at, deleted_at FROM `" + table +
          "` WHERE user_id = ? AND " + keyWhere(meta),
          [userId].concat(meta.keyCols.map((c) => row[c]))
        ))[0];
        const existing = existingRows[0];
        if (existing && Number(existing.updated_at) > up) {
          // 服务器更新：拒绝本次写入，把权威行返回给客户端覆盖本地
          const serverRows = (await conn.query(
            "SELECT * FROM `" + table + "` WHERE user_id = ? AND " + keyWhere(meta),
            [userId].concat(meta.keyCols.map((c) => row[c]))
          ))[0];
          res.conflicts.push(serverRows[0] ? stripUserId(serverRows[0]) : null);
          continue;
        }
        // 2) upsert
        const cols = meta.cols.filter((c) => row[c] !== undefined);
        const sets = cols.map((c) => "`" + c + "` = ?");
        const sql = "INSERT INTO `" + table + "` (user_id, `" + cols.join("`,`") + "`) VALUES (" +
          ["?"].concat(cols.map(() => "?")).join(",") + ") ON DUPLICATE KEY UPDATE " + sets.join(", ");
        await conn.query(sql, [userId].concat(cols.map((c) => row[c]), cols.map((c) => row[c])));
        res.accepted += 1;
      }
      out[table] = res;
    }
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** pull：按表增量拉取 */
async function pullTable(userId, table, since, limit) {
  const meta = META[table];
  if (!meta) throw new Error("未知表: " + table);
  const n = Math.min(Math.max(Number(limit) || 200, 1), MAX_ROWS_PER_TABLE);
  const s = Number(since) || 0;
  const rows = await db.query(
    "SELECT * FROM `" + table + "` WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC LIMIT ?",
    [userId, s, n]
  );
  // 去掉内部列 user_id，客户端无需要
  return rows.map((r) => {
    const { user_id, ...rest } = r;
    return rest;
  });
}

/** 清理超过保留期的软删行（物理删除），幂等，可被定时任务周期调用 */
async function purgeExpired() {
  const cutoff = Date.now() - SOFT_DELETE_KEEP_MS;
  for (const table of Object.keys(META)) {
    await db.query(
      "DELETE FROM `" + table + "` WHERE deleted_at IS NOT NULL AND deleted_at < ?",
      [cutoff]
    );
  }
}

function registerSyncRoutes(app, authRequired) {
  app.post("/api/sync/push", authRequired, async (req, res) => {
    try {
      const body = req.body || {};
      const tables = body.tables || {};
      let total = 0;
      for (const arr of Object.values(tables)) total += Array.isArray(arr) ? arr.length : 0;
      if (total > MAX_TOTAL) return res.status(400).json({ error: "单次推送最多 " + MAX_TOTAL + " 行" });
      const result = await pushTables(req.user.id, tables);
      res.json({ ok: true, tables: result, serverTime: Date.now() });
    } catch (e) {
      res.status(500).json({ error: "推送失败: " + e.message });
    }
  });

  app.get("/api/sync/pull", authRequired, async (req, res) => {
    try {
      const table = String(req.query.table || "");
      const rows = await pullTable(req.user.id, table, req.query.since, req.query.limit);
      res.json({ ok: true, table, rows, serverTime: Date.now() });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // 清理软删（内部端点，可被 cron 调用；进程内也定时跑）
  app.post("/api/sync/purge", authRequired, async (_req, res) => {
    await purgeExpired();
    res.json({ ok: true });
  });
  const daily = setInterval(purgeExpired, 6 * 3600 * 1000);
  daily.unref();
}

module.exports = { registerSyncRoutes, purgeExpired };
