# Kitty 账本 · 生产上线手册（后端 + 账号体系）

> 面向首次把「云端持久化 + 登录」部署到生产服务器的完整操作与验收清单。
> 前置：nginx 已按 `deploy/nginx.conf` 托管前端静态站；服务器有 MySQL 8。

---

## 0. 总体形态

```
用户浏览器 → nginx(:5201) ─┬─ 静态前端 + SW
                           ├─ /api/chat  → DeepSeek（已有）
                           └─ /api/*     → Node Kitty API(127.0.0.1:8300) → MySQL(kitty_db)
```

## 1. 服务器预检

```bash
node -v && npm -v          # 建议 Node ≥ 16（无则安装：curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs）
mysql -uroot -p -e "SELECT VERSION();"   # MySQL 8
ss -lnt | grep 8300 || true              # 8300 未被占用
```

## 2. 代码与依赖

```bash
cd /var/www/kitty-cclian
sudo git pull
cd server
sudo npm ci                 # 按 package-lock.json 安装
```

## 3. 后端配置 server/.env

```bash
sudo cp .env.example .env
sudo nano .env              # 填真实值
```

要点：
- `DB_HOST=127.0.0.1`、`DB_USER/DB_PASSWORD` 建议用**专用账号**（见第 4 步），不要直接用 root
- `DB_NAME=kitty_db`
- `PORT=8300`、`BIND_HOST=127.0.0.1`（只给本机 nginx 访问）
- `CORS_ORIGIN=` 留空（生产同源，不需要跨域白名单）
- `TOKEN_TTL_DAYS=90`、`RATE_WINDOW_MIN=15`、`RATE_MAX_FAILS=5`

## 4. MySQL 建库授权（服务启动时会自动建库建表）

```sql
CREATE DATABASE IF NOT EXISTS kitty_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'kitty'@'127.0.0.1' IDENTIFIED BY '换一个强密码';
GRANT ALL PRIVILEGES ON kitty_db.* TO 'kitty'@'127.0.0.1';
FLUSH PRIVILEGES;
```

> `.env` 里就用 `DB_USER=kitty` + 上面的密码。首次 `node server.js` 会自动执行
> `server/schema.sql` 建全部表（幂等，可重复启动）。

## 5. systemd 托管

创建 `/etc/systemd/system/kitty-api.service`：

```ini
[Unit]
Description=Kitty Ledger API
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/kitty-cclian/server
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=3
EnvironmentFile=/var/www/kitty-cclian/server/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kitty-api
sudo systemctl status kitty-api      # 看到 "listening on http://127.0.0.1:8300" 即成功
journalctl -u kitty-api -f           # 看日志
```

> `ExecStart` 的 node 路径按 `which node` 实际结果改；进程只监听 127.0.0.1，不暴露公网。

## 6. nginx 反代

在现有站点 conf（`deploy/nginx.conf` 复制到 `/etc/nginx/conf.d/` 的版本）里已含：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8300;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

> `location = /api/chat` 与 `location = /api/health` 是精确匹配，优先级更高，DeepSeek 代理不受影响。

## 7. 接口验收（curl，走 nginx 同源）

```bash
curl -s https://cclian-kitty.art:5201/api/health

# 注册 / 登录
curl -s -X POST https://cclian-kitty.art:5201/api/auth/register \
  -H 'Content-Type: application/json' -d '{"username":"demo01","password":"123456"}'

curl -s -X POST https://cclian-kitty.art:5201/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"demo01","password":"123456"}'   # 记下 token

# 同步（鉴权）
curl -s -X POST https://cclian-kitty.art:5201/api/sync/push \
  -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
  -d '{"tables":{"books":[{"id":"book-default","name":"Kitty账本","icon":"🐱","is_default":1,"created_at":1750000000000,"updated_at":1750000000000}]}}'

curl -s "https://cclian-kitty.art:5201/api/sync/pull?table=books&since=0&limit=1000" \
  -H "Authorization: Bearer <token>"
```

## 8. 前端发版与 PWA 更新

- 每次发版：本地 commit → 服务器 `git pull` → 若 server/ 有改动需 `systemctl restart kitty-api` → 若 nginx conf 变了要 reload
- 手机端 PWA：**重新打开页面 1~2 次** 触发 SW 更新（每次改前端资源都会升 `?v=` 与 SW 缓存名）
- 静态资源已带 immutable 长缓存 + SW cache-first，务必遵循仓库「发版约定」（改 css/js/index 必须同步升版本号）

## 9. 手机端功能验收清单

- [ ] 🧠 记忆抽屉 → 账号与云端 → 注册新账号成功
- [ ] 登录后自动出现一次静默同步；账本/记录在 🧠 手动「📤 上传云端」后进库
- [ ] 手机开一条新记录/新备忘，~15 秒后 Network 出现 `/api/sync/push`
- [ ] 第二台设备登录同账号 → 数据合并/恢复一致（含聊天记录）
- [ ] 一台删除备忘/账本 → 上传 → 另一台拉取后删除同步生效
- [ ] 退出并清空 → 重登同账号 → 数据（含聊天）完整恢复
- [ ] 换账号登录 → 被要求先清空本机，旧账号数据不泄露

## 10. 运维

```bash
# 每日备份（crontab -e）
0 3 * * * mysqldump -ukitty -p'密码' kitty_db > /var/backups/kitty_db_$(date +\%F).sql && gzip /var/backups/kitty_db_$(date +\%F).sql

# 常用
systemctl status/restart kitty-api
journalctl -u kitty-api -n 200
tail -f /var/log/nginx/access.log | grep /api
```

安全提醒：
- MySQL 3306 只允许本机回环访问，不要暴露公网
- `server/.env` 不入库（已在 .gitignore），改它直接改服务器文件
- 如需临时多源联调才在 `CORS_ORIGIN` 填白名单，生产留空
