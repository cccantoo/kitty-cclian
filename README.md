# 🐱 Kitty 账本 · KittyLedger

一款粉色 Kitty 风格的 PWA 记账应用，**带持久记忆的聊天式 AI 记账助手 + 全功能账本 + 备忘录**。

> v0.1 · 2026-09-01 起步：项目骨架 + 96 个手切 Kitty 图标

---

## ✨ 核心特性

- 💬 **会话式记账**：跟 Kitty 说话，自动识别金额/类别，写入账本
- 📒 **多账本**：任意新建/切换/重命名/删除账本（可设默认），交易、报表、预算、账户相互独立
- 🧠 **持久记忆**：自动学习你的偏好，可查看/编辑/删除
- 💰 **全面账本**：金额、分类、账户、备注、标签、收入/支出、**转账（账户互转）**
- 📊 **月度报表**：分类占比甜甜圈图 / 支出 TOP5 / 每日热力图，月份前后翻页
- 🎯 **预算管理**：月度总预算 + 分类预算，进度条超支自动变红 ⚠️
- 📝 **备忘录**：CRUD + 搜索 + 标签
- 🌸 **粉色 Kitty 视觉**：圆角、阴影、Kitty 蝴蝶结 🦋
- 📱 **iPhone 加桌面**：HTTPS 自签证书 + manifest.json，PWA 模式

---

## 🚀 快速启动

```bash
cd H:/my_work_space/kitty-ledger
node server.js
# HTTPS 启动后访问：
#   电脑：https://localhost:8444
#   iPhone：https://<电脑局域网 IP>:8444
```

启动后控制台会打印：
```
[Kitty 账本 (kitty-ledger)] HTTPS 服务器已启动:
  电脑访问: https://localhost:8444
  手机访问: https://<你的电脑IP>:8444
  注意: 手机首次打开需点击"高级"→"继续访问"
```

### 在 iPhone 上加桌面

1. iPhone 连同一 Wi-Fi，打开 Safari
2. 输入上面的 `https://<电脑IP>:8444`
3. 首次会弹"此连接非私密" → 点「高级」→ 「继续访问」
4. 点底部分享按钮（方块带向上箭头）→「添加到主屏幕」
5. 主屏出现 Kitty 粉图标 ✅

---

## 🏗 技术栈

- **前端**：原生 HTML / CSS / JS（无框架，沿用 purple-workbench 套路）
- **持久化**：IndexedDB（账本/备忘录/分类/消息/偏好） + localStorage（账户/AI 模式）
- **服务器**：Node.js 本地 HTTPS（自签证书，850 KB）
- **PWA**：manifest.json + Service Worker 离线缓存
- **图标**：自切 96 个 Kitty 图标 @1x/@2x/@3x
- **AI（v0.2 已接 DeepSeek）**：真 AI 对话 + function calling 自动记账/查账/存偏好；本地 Mock 自动兜底。详见下方「🤖 AI 接入」

---

## 📁 目录结构

```
kitty-ledger/
├── server.js           HTTPS 服务器
├── cert.pem / key.pem  自签证书（一年有效）
├── manifest.json       PWA 配置
├── sw.js               离线缓存
├── index.html          入口
├── css/style.css       粉色主题
├── js/
│   ├── db.js           IndexedDB 封装（5 张表）
│   ├── ai.js           DeepSeek 客户端 + 工具调用循环（4 个工具）
│   └── app.js          主应用：路由 / 聊天 / 记账 / 备忘 / 偏好 / AI 设置
├── icons/
│   ├── app/            PWA icon（SVG + 512×512 PNG）
│   └── kitty/          96 个手切图标（@1x/@2x/@3x）
├── iconskitty_raw/     8 张原始大图（小红书源图）
└── scripts/
    ├── cut_icons.py    图标切图脚本（可改 labels 重跑）
    ├── inspect_images.py  图片尺寸检查
    └── make_app_icon.py   PWA icon 生成
```

---

## 🧠 记忆系统设计

按层分：
1. **会话短期上下文**（最新 40 条消息）→ `IndexedDB.messages`
2. **用户长期偏好**（用户告诉 AI 的事实）→ `IndexedDB.preferences`
   - 自动学习关键词：「记住 / 以后 / 别再 / 我喜欢 / 我不想」
   - 右上角 🧠 按钮 → 抽屉管理（增/改/删）
3. **结构化账本事实库** → `IndexedDB.transactions`（AI 通过函数调用查询）
4. **历史对话摘要**（v2 启用）

AI 每次回复会注入系统提示词：
```
[UserPrefs]
  - 饮食偏好：不喜欢吃香菜
  - 交通习惯：开车上班

[RecentTx]（最近 20 条）
  - 2026-09-01 餐饮 ¥35
  ...

[Tools]
  - addTransaction, queryTransactions, setPreference, ...
```

---

## 🗺 路线图

- ✅ **v0.1 骨架** — HTML/CSS/JS/IndexedDB/PWA/96 图标/对话记账/账本/备忘/偏好抽屉
- ✅ **v0.2 智能** — DeepSeek API 真接入：function calling 自动记账 / 查账 / 月度统计 / 长期偏好记忆；模型三选（v4-flash / v4-pro / v4-flash-vision-exp）；上下文最近 100 轮
- ✅ **v0.3 完善（当前）** — 转账（账户互转）、报表（甜甜圈/TOP5/热力图 + 月份导航）、预算（总预算 + 分类预算 + 超支预警）
- ✅ **v0.3.5（本次）** — 多账本：新建/切换/重命名/删除/默认账本，交易报表预算账户随账本隔离；修复支出/收入/转账切换高亮 bug
- ⏭️ **v0.4 美化** — Kitty 字体、动画、磁贴风格、暗黑模式、对话摘要压缩

---

## 🤖 AI 接入（v0.2）

**架构**：浏览器 → 本机 `server.js` 代理（`POST /api/chat`）→ `api.deepseek.com`

- API Key 存在浏览器 localStorage（`kitty_ai_config`），请求时经 `X-API-Key` 头透传给本机代理，**服务端不落盘**
- 首次使用：App 内右上角 **⚙️** → 模式选 DeepSeek → 填 API Key → 「测试连接」→ 保存
- 也可在服务端设 `DEEPSEEK_API_KEY` 环境变量作为默认 key

**记忆实现**（每次请求注入 system prompt）：
1. 用户长期偏好（IndexedDB `preferences`，AI 可用 `set_preference` 工具自动写入）
2. 最近 12 轮对话（IndexedDB `messages`）
3. 当前时间 + 全部分类定义

**AI 可用的 4 个工具**（function calling，直接读写本地 IndexedDB）：

| 工具 | 作用 | 示例触发语 |
|---|---|---|
| `add_transaction` | 记一笔（AI 判断支出/收入 + 分类） | 「我买了狼牙土豆 12 元」 |
| `query_transactions` | 按月/类型/分类查流水 | 「看看我这周的餐饮账单」 |
| `get_monthly_stats` | 月度统计 + 分类排行 | 「这个月花最多的是什么？」 |
| `set_preference` | 存长期偏好 | 「记住，我月薪 1.5 万」 |

失败自动回退本地 Mock 模式，聊天不中断。

---

## 🐞 已知限制

- iOS Safari PWA 后台被杀后状态可能丢失（iOS 限制）
- 自签证书首次需手动信任
- reasoner 模型（R1）响应较慢，日常记账建议 `deepseek-chat`

---

## 📜 致谢

参考项目：**purple-workbench** —— 在此基础上做了 Hello Kitty 改造。
图标源：xiaohongshu.com 公开素材（仅学习用）。
