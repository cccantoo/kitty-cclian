# Kitty 账本 · 服务器持久化与登录 · 设计方案（v1）

> 状态：已定稿（2026-09-04）。技术栈：前端 PWA（现有，不变） + 后端 **Node + MySQL**（生产服务器已有 MySQL）
> 认证：用户名 + 密码（bcrypt） + 服务端 token 表
> 同步：多设备**双向增量同步**，last-write-wins（按 `updated_at` 毫秒时间戳）
> 首期上云：账本/账户/分类/交易/预算 + 备忘录 + AI 偏好。聊天记录与 AI API Key 暂不上云。

---

## 1. 总体架构

```
浏览器 PWA（本地 IndexedDB + localStorage 缓存，离线可读写）
   │  HTTPS
   ▼
Nginx（静态托管 + /api 反向代理 → Node 后端；/api/chat 继续直连 DeepSeek 不动）
   ▼
Node 后端（Express）  ——  auth 中间件 + 同步 API
   ▼
MySQL（kitty_db）—— 全量账号与业务数据
```

- **本地仍是最快读写层**：改动先落 IndexedDB/localStorage，再排队同步到服务器。
- **服务器是"账号数据副本 + 多设备汇聚点"**：任何设备登录同账号，都能拿到一致数据。
- 同步失败不阻塞本地使用，重试队列 + 下次启动补拉。

## 2. 通用约定（所有业务表）

- 主键沿用客户端 id（文本 id 用 `VARCHAR(64)`，IndexedDB 数字 id 用 `BIGINT`），**客户端生成、幂等 upsert**。
- 时间一律存 **UTC 毫秒 BIGINT**（`Date.now()` 语义，避免时区与 JS 转换），命名 `created_at / updated_at / deleted_at`。
- `deleted_at IS NULL` = 存活；软删记录保留 60 天供他端拉取后定时物理清理。
- 每行 `updated_at` 用于增量拉取（`since` 游标）与冲突裁决（后写覆盖）。

## 3. 表结构与 DDL（MySQL 8 · InnoDB · utf8mb4）

### 3.1 账号

```sql
CREATE TABLE users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(64)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname      VARCHAR(64)  NOT NULL DEFAULT '',
  created_at    BIGINT       NOT NULL,
  updated_at    BIGINT       NOT NULL,
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE auth_tokens (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  token      CHAR(64)        NOT NULL,
  expires_at BIGINT          NOT NULL,
  created_at BIGINT          NOT NULL,
  UNIQUE KEY uk_tokens_token (token),
  KEY idx_tokens_user (user_id),
  CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.2 业务数据（user 级归属，含软删）

```sql
CREATE TABLE books (              -- 账本
  id         VARCHAR(64) NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(32) NOT NULL,
  icon       VARCHAR(16) NOT NULL DEFAULT '🐱',
  is_default TINYINT(1)  NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, deleted_at BIGINT NULL,
  PRIMARY KEY (user_id, id),                     -- 复合主键，同 id 不同用户互不干扰
  KEY idx_books_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE accounts (           -- 账户，隶属于账本
  id         VARCHAR(64) NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  book_id    VARCHAR(64) NOT NULL,
  name       VARCHAR(32) NOT NULL,
  icon       VARCHAR(16) NOT NULL DEFAULT '💵',
  order_no   INT         NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, deleted_at BIGINT NULL,
  PRIMARY KEY (user_id, book_id, id),
  KEY idx_accounts_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (         -- 分类（全用户全局，账本共用；与前端一致）
  id         VARCHAR(64) NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       ENUM('expense','income') NOT NULL,
  name       VARCHAR(32) NOT NULL,
  icon       VARCHAR(255) NOT NULL,
  created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, deleted_at BIGINT NULL,
  PRIMARY KEY (user_id, id),
  KEY idx_categories_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE transactions (       -- 交易（金额一律存“分”）
  id             BIGINT NOT NULL,
  user_id        BIGINT UNSIGNED NOT NULL,
  book_id        VARCHAR(64) NOT NULL,
  type           ENUM('expense','income','transfer') NOT NULL,
  amount_cents   BIGINT NOT NULL,
  category_id    VARCHAR(64) NULL,
  account_id     VARCHAR(64) NULL,
  account_from   VARCHAR(64) NULL,
  account_to     VARCHAR(64) NULL,
  note           VARCHAR(255) NOT NULL DEFAULT '',
  tags_json      TEXT NULL,
  ts             BIGINT NOT NULL,          -- 业务发生时间
  created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, deleted_at BIGINT NULL,
  PRIMARY KEY (user_id, id),
  KEY idx_tx_updated (user_id, updated_at),
  KEY idx_tx_query (user_id, book_id, type, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE budgets (            -- 预算（一账本一月一条）
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  book_id      VARCHAR(64) NOT NULL,
  month        CHAR(7)      NOT NULL,       -- 'YYYY-MM'
  total_cents  BIGINT       NOT NULL DEFAULT 0,
  cats_json    TEXT NULL,
  updated_at   BIGINT NOT NULL, deleted_at BIGINT NULL,
  UNIQUE KEY uk_budgets (user_id, book_id, month),
  KEY idx_budgets_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE memos (              -- 备忘录
  id          BIGINT NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(120) NOT NULL DEFAULT '',
  content     MEDIUMTEXT NOT NULL,
  color       VARCHAR(16) NOT NULL DEFAULT 'pink',
  tags_json   TEXT NULL,
  pinned      TINYINT(1) NOT NULL DEFAULT 0,
  archived    TINYINT(1) NOT NULL DEFAULT 0,
  trashed     TINYINT(1) NOT NULL DEFAULT 0,
  trashed_at  BIGINT NULL,
  created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, deleted_at BIGINT NULL,
  PRIMARY KEY (user_id, id),
  KEY idx_memos_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE preferences (        -- AI 偏好 / 记忆（user 级唯一 key）
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  pkey       VARCHAR(64) NOT NULL,
  pvalue     TEXT NOT NULL,
  source     VARCHAR(16) NOT NULL DEFAULT 'manual',
  created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, deleted_at BIGINT NULL,
  UNIQUE KEY uk_prefs (user_id, pkey),
  KEY idx_prefs_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.3 金额与 JSON 说明

- 金额用 **分（int）** 存储：`amount_cents = Math.round(amount * 100)`，避免浮点误差；API 层与前端仍然传元、后端换算。
- `tags_json / cats_json` 用 JSON 字符串；服务器不解析只透传（归客户端 schema 管），降低耦合。

## 4. 登录与鉴权

流程：注册/登录 → 校验通过 → 生成 32 字节随机 hex token（64 字符）入库 → 返回 `{ token, expiresIn }`。

- token 默认 **90 天** 过期；客户端存 IndexedDB（`kitty_session`），请求头 `Authorization: Bearer <token>`。
- 登出 = 删除该 token 行（可针对单设备）；修改密码 = 清空该用户所有 token。
- 安全：bcrypt cost=10；登录限流（同 IP/用户名 5 次失败 → 锁 15 分钟）；用户名小写唯一；所有接口走 HTTPS。

```
POST /api/auth/register { username, password }        → 201 { token, user }
POST /api/auth/login    { username, password }        → 200 { token, user }
POST /api/auth/logout   (auth)                        → 204
GET  /api/me            (auth)                        → 200 { user }
```

## 5. 同步设计（多设备双向）

### 5.1 原则

- 客户端为主：任何增删改先写本地 → 本地 `sync_queue`（IndexedDB 或内存队列）→ 批量 push。
- 服务器返回 `serverTime` 作为下次 pull 的 since。
- **冲突**：同行双方都改 → 保留 `updated_at` 大的一方（last-write-wins），推送时返回被服务器覆盖的冲突行，客户端据此刷新本地。

### 5.2 API

```
POST /api/sync/push                  （鉴权）请求体按表分批：
  { table:"transactions", rows:[ {…行数据含 id/updated_at/deleted_at }, …] , clientSince }
  → { accepted: n, conflicts: [被覆盖的行…], serverTime }

GET /api/sync/pull?since=<ms>&limit=500&table=transactions
  → { rows: 该用户该表 updated_at > since 的行, serverTime }
```

- `since=0` 首次登录 → 拉该用户全量；本地已有数据时以**本地为准合并**（见 5.3 首启流程）。
- 分批：每表每次 ≤500 行，用返回的 serverTime 翻页直到拉完。

### 5.3 首启/换设备流程

1. 本地无账号数据（新设备）→ 登录后全量 pull 直接落地。
2. 本地已有数据（老用户升级）→ 登录后先 **push 本地全量**（上行合并），再 pull 增量；以本地为准、服务器补缺。
3. 双向写入的幂等性由"客户端主键 + 按 user 复合主键 upsert"保证。

### 5.4 触发时机（MVP 够用）

- 登录成功后立即同步一次
- 每次记账/备忘/偏好变更后：本地写成功 → 防抖 2 秒批量 push
- 回到前台（visibilitychange）与每次启动补一次 pull + 清失败重试队列
- 提供手动「立即同步」入口（记忆抽屉数据区）

## 6. 本地 ↔ 云端字段映射

| 本地 | 云端 | 说明 |
|---|---|---|
| transaction.amount(元,float) | amount_cents | ×100 取整 |
| budgets localStorage JSON | budgets 行 (book_id,month) | 拆行 |
| accounts 挂在 book.accounts | accounts 表 | 拉取后按 book_id 回装 book.accounts |
| memos/pinned/archived/trashed | 同名列 | 直接同步 |
| preferences {key,value,source} | preferences(pkey,pvalue,source) | key→pkey |
| messages 聊天 | 不上云 | 保留本地 |
| kitty_ai_config(API Key) | 不上云 | 仍只进本机代理 |

同步时忽略纯本地字段（如 `kitty_active_book` 活动账本、memoUI 视图状态等），不污染云端。

## 7. 后端工程结构（建议）

```
server/                    # 独立于静态前端的 Node 服务，生产由 systemd 托管
├── server.js              # Express 入口（端口 8300 内网，仅本机 nginx 可达）
├── db.js                  # mysql2 pool + 建表 SQL（首次启动自动 CREATE TABLE IF NOT EXISTS）
├── auth.js                # 注册/登录/鉴权中间件/限流/bcrypt/token
├── sync.js                # push/pull 路由（批量 upsert + 增量查询 + 冲突返回）
├── schema.sql             # 完整 DDL（也供手工导入）
├── .env.example           # DB_HOST/DB_USER/DB_PASS/DB_NAME/TOKEN_TTL…
└── package.json           # express mysql2 bcryptjs(或 native bcrypt) cors
```

- 本地开发：Node 跑在 8300，`node server.js`（静态 + API 复用现有 8444 的 https 也行，dev 用 http://localhost:8300/api）
- 生产：nginx 增加 `location /api/ { proxy_pass http://127.0.0.1:8300; }`，注意现有 `location = /api/chat` 优先级高于前缀匹配，DeepSeek 代理不受影响。

## 8. 里程碑（建议实现顺序）

1. **M1 后端骨架 + 登录**：schema、注册/登录/登出/me、token 鉴权、限流
2. **M2 同步 API**：push/pull 批量 upsert、冲突返回、软删保留
3. **M3 前端登录 UI + 会话**：登录页/注册页、token 存取、401 处理
4. **M4 前端同步层**：统一 `syncEngine`，把现有所有 add/update/delete 包一层入队；首启合并；手动同步入口
5. **M5 联调收尾**：双设备场景、断网重试、备份导出对齐（导出 JSON 保留，仍可整包导入）

## 9. 已知取舍 / 风险

- last-write-wins 对"同一条记录两边都改"会丢一份改动；MVP 可接受，之后可升级为按字段合并。
- 离线本地是主存储 → 首次账号体系上线时，老用户数据**留在本地不自动上云**，需用户在设置里主动「登录并上传」，隐私更稳。
- MySQL 在公网需确认只允许本机回环访问 Node（Node 走 127.0.0.1），不开公网 3306。
