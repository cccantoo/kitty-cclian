-- Kitty 账本 · 云端库 schema（MySQL 8 / InnoDB / utf8mb4）
-- 说明见 docs/server-persistence.md
-- 时间一律存 UTC 毫秒 BIGINT；业务行软删 deleted_at，保留 60 天后由清理任务物理删除。

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(64)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname      VARCHAR(64)  NOT NULL DEFAULT '',
  created_at    BIGINT       NOT NULL,
  updated_at    BIGINT       NOT NULL,
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  token      CHAR(64)        NOT NULL,
  expires_at BIGINT          NOT NULL,
  created_at BIGINT          NOT NULL,
  UNIQUE KEY uk_tokens_token (token),
  KEY idx_tokens_user (user_id),
  CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS books (
  id         VARCHAR(64)  NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(32)  NOT NULL,
  icon       VARCHAR(16)  NOT NULL DEFAULT '🐱',
  is_default TINYINT(1)   NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT NULL,
  PRIMARY KEY (user_id, id),
  KEY idx_books_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS accounts (
  id         VARCHAR(64)  NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  book_id    VARCHAR(64)  NOT NULL,
  name       VARCHAR(32)  NOT NULL,
  icon       VARCHAR(16)  NOT NULL DEFAULT '💵',
  order_no   INT          NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT NULL,
  PRIMARY KEY (user_id, book_id, id),
  KEY idx_accounts_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id         VARCHAR(64)  NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       ENUM('expense','income') NOT NULL,
  name       VARCHAR(32)  NOT NULL,
  icon       VARCHAR(255) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT NULL,
  PRIMARY KEY (user_id, id),
  KEY idx_categories_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id           BIGINT NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  book_id      VARCHAR(64) NOT NULL,
  type         ENUM('expense','income','transfer') NOT NULL,
  amount_cents BIGINT NOT NULL,
  category_id  VARCHAR(64) NULL,
  account_id   VARCHAR(64) NULL,
  account_from VARCHAR(64) NULL,
  account_to   VARCHAR(64) NULL,
  note         VARCHAR(255) NOT NULL DEFAULT '',
  tags_json    TEXT NULL,
  ts           BIGINT NOT NULL,
  created_at   BIGINT NOT NULL,
  updated_at   BIGINT NOT NULL,
  deleted_at   BIGINT NULL,
  PRIMARY KEY (user_id, id),
  KEY idx_tx_updated (user_id, updated_at),
  KEY idx_tx_query (user_id, book_id, type, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS budgets (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  book_id     VARCHAR(64) NOT NULL,
  month       CHAR(7)      NOT NULL,
  total_cents BIGINT       NOT NULL DEFAULT 0,
  cats_json   TEXT NULL,
  updated_at  BIGINT NOT NULL,
  deleted_at  BIGINT NULL,
  UNIQUE KEY uk_budgets (user_id, book_id, month),
  KEY idx_budgets_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS memos (
  id         BIGINT NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  title      VARCHAR(120) NOT NULL DEFAULT '',
  content    MEDIUMTEXT   NOT NULL,
  color      VARCHAR(16)  NOT NULL DEFAULT 'pink',
  tags_json  TEXT NULL,
  pinned     TINYINT(1) NOT NULL DEFAULT 0,
  archived   TINYINT(1) NOT NULL DEFAULT 0,
  trashed    TINYINT(1) NOT NULL DEFAULT 0,
  trashed_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT NULL,
  PRIMARY KEY (user_id, id),
  KEY idx_memos_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS preferences (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  pkey       VARCHAR(64) NOT NULL,
  pvalue     TEXT        NOT NULL,
  source     VARCHAR(16) NOT NULL DEFAULT 'manual',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT NULL,
  UNIQUE KEY uk_prefs (user_id, pkey),
  KEY idx_prefs_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
