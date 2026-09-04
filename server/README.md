# Kitty API（server/）

云端持久化后端：Node + Express + MySQL。表结构与设计见 [`docs/server-persistence.md`](../docs/server-persistence.md)。

## 本地开发（用你本机 MySQL 联调）

```bash
cd server
npm install
# 配置连接：把 .env.example 复制为 .env，填上 DB_PASSWORD
cp .env.example .env    # Windows: copy .env.example .env
node server.js
```

> Windows（cmd / PowerShell）不要用 `export`——那是 bash 语法。直接用 `.env` 文件即可；或临时设置：
> - PowerShell：`$env:DB_PASSWORD="你的密码"` 然后 `node server.js`
> - cmd：`set DB_PASSWORD=你的密码` 然后 `node server.js`

启动时会自动：
1. 创建数据库 `kitty_db`（utf8mb4）
2. 幂等执行 `schema.sql` 建全部表（users/auth_tokens/books/accounts/categories/transactions/budgets/memos/preferences）

## 快速自测（curl）

```bash
# 注册
curl -s http://127.0.0.1:8300/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"demo01","password":"123456"}'

# 登录 → 拿到 token
curl -s http://127.0.0.1:8300/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"demo01","password":"123456"}'

# 带 token 访问
curl -s http://127.0.0.1:8300/api/me -H 'Authorization: Bearer <token>'

# 登出
curl -s -X POST http://127.0.0.1:8300/api/auth/logout -H 'Authorization: Bearer <token>'
```

## 同步接口自测（登录后）

先登录拿 token（PowerShell 示例）：

```powershell
$body = '{"username":"demo01","password":"123456"}'
$r = Invoke-RestMethod http://127.0.0.1:8300/api/auth/login -Method Post -ContentType 'application/json' -Body $body
$r.token        # 复制
```

拉取（首次 since=0 全量）：

```powershell
curl.exe -s "http://127.0.0.1:8300/api/sync/pull?table=books&since=0" -H "Authorization: Bearer 粘贴TOKEN"
```

推送一笔记账（amount_cents 存分；updated_at 为毫秒时间戳）：

```powershell
$push = '{"tables":{"transactions":[{"id":1,"book_id":"book-default","type":"expense","amount_cents":1250,"category_id":"cat-food-dining","account_id":"acc-alipay","note":"奶茶","ts":1750000000000,"created_at":1750000000000,"updated_at":1750000000000}]}}'
curl.exe -s -X POST http://127.0.0.1:8300/api/sync/push -H "Authorization: Bearer 粘贴TOKEN" -H "Content-Type: application/json" -d $push
```

预期返回 `{"ok":true,"tables":{"transactions":{"accepted":1,...}}}`；再次同参数推送 `accepted` 仍为 1（幂等 upsert）。

## 生产部署（nginx 反代）

1. 服务器 `git pull` 拿到 `server/`，进入后 `npm install --omit=dev`（或 `npm ci`）。
2. 用 systemd 托管，指向 `server/server.js`，端口 8300 只监听 127.0.0.1；环境变量 DB_PASSWORD 等放 systemd unit 或 `/etc/kitty-api.env`。
3. nginx 增加前缀反代（`location = /api/chat` 精确匹配优先级更高，DeepSeek 代理不受影响）：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8300;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

4. `systemctl reload nginx`。安全：3306 不要对公网开放，仅回环访问。
