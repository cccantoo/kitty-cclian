/**
 * Kitty 账本 · DeepSeek AI 客户端（ai.js）
 * ----------------------------------------------------------
 * 职责：
 *   - 通过本机 server.js 的 /api/chat 代理调用 DeepSeek
 *   - system prompt 注入：时间 + 分类 + 用户偏好（记忆）
 *   - function calling 工具循环（最多 5 轮）：
 *       add_transaction   → 记一笔（AI 判断类型/分类）
 *       query_transactions→ 查账单流水
 *       get_monthly_stats → 月度统计（花最多的是什么）
 *       set_budget        → 设置/更新预算（总额 + 分类）
 *       get_budget        → 查预算（剩余/超支/分类进度）
 *       set_preference    → 存长期偏好（记忆）
 *   - 工具直接读写本地 IndexedDB / localStorage，数据不出本机
 * ========================================================== */

(function (global) {
  "use strict";

  const CHAT_ENDPOINT = "/api/chat";
  const MAX_TOOL_ROUNDS = 5;
  const REQUEST_TIMEOUT_MS = 90000;

  // ============================================================
  // System Prompt（记忆注入点）
  // ============================================================
  function buildSystemPrompt({ prefs, categories, bookName, accounts }) {
    const dateStr = new Date().toLocaleString("zh-CN", { hour12: false });
    const expCats = categories.filter((c) => c.type === "expense").map((c) => `${c.name}(${c.id})`).join("、");
    const incCats = categories.filter((c) => c.type === "income").map((c) => `${c.name}(${c.id})`).join("、");
    const accText = (accounts && accounts.length)
      ? accounts.map((a) => `${a.icon || ""}${a.name}(${a.id})`).join("、")
      : "现金(acc-cash)、微信(acc-wechat)、支付宝(acc-alipay)、银行卡(acc-card)、其他(acc-other)";
    const userPrefs = (prefs || []).filter((p) => p.key && !String(p.key).startsWith("system."));
    const prefLines = userPrefs.length
      ? userPrefs.map((p) => `- ${p.key}：${p.value}`).join("\n")
      : "（暂无）";

    return [
      "你是「Kitty」，一个粉色可爱风格的记账助手。语气温柔活泼、简短，可以适度用 emoji。",
      "",
      `【当前时间】${dateStr}`,
      `【当前账本】${bookName || "Kitty 账本"}（记账、查账、预算都只作用于当前账本）`,
      "",
      `【可用支出分类】${expCats}`,
      `【可用收入分类】${incCats}`,
      `【账户】${accText}`,
      "",
      "【用户偏好记忆（长期）】",
      prefLines,
      "",
      "【行为规则】",
      "1. 用户描述了一笔花销或收入（如「我买了狼牙土豆12元」）→ 判断类型（expense/income）和最贴切的分类，调用 add_transaction，然后用一句话简短确认。",
      "2. 用户问统计类问题（「这个月花了多少」「最大开销是什么」）→ 必须调用 get_monthly_stats 或 query_transactions 拿真实数据再回答，严禁编造数字。",
      "3. 用户表达长期偏好或个人事实（口味、称呼、习惯、爱好等，如「记住我不吃香菜」「以后奶茶超过20提醒我」）→ 调用 set_preference 保存。注意：任何与预算、消费金额限额、额度相关的内容都不属于偏好，一律用 set_budget，严禁用 set_preference 存预算。",
      "4. 用户提到预算（「这个月预算3000」「把预算改成2500」「奶茶预算200」「预算还剩多少」「这个月还能花多少」）→ 设置或修改用 set_budget，查询用 get_budget，根据返回的真实数据回答剩余/超支情况，严禁编造数字。",
      "5. 普通闲聊 → 直接自然回复，不调用工具。",
      "6. 金额单位默认元（CNY）；用户没说时间默认现在。",
      "7. 回复保持简短（一般不超过 3 句话）。回答统计问题时把关键数字说清楚。"
    ].join("\n");
  }

  // ============================================================
  // 工具定义（OpenAI function calling 格式，DeepSeek 兼容）
  // ============================================================
  function buildTools() {
    return [
      {
        type: "function",
        function: {
          name: "add_transaction",
          description: "记录一笔记账。用户描述了一笔支出或收入时调用。分类必须从系统提示的可用分类中选最贴切的。",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["expense", "income"], description: "expense=支出, income=收入" },
              amount: { type: "number", description: "金额（元）" },
              categoryId: { type: "string", description: "分类 ID，如 cat-food-dining" },
              note: { type: "string", description: "备注，一句话概括，如「狼牙土豆」" },
              account: { type: "string", description: "账户 ID，默认 acc-cash" }
            },
            required: ["type", "amount", "categoryId", "note"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "query_transactions",
          description: "查询账单流水，按月份/类型/分类过滤，返回真实记录列表。",
          parameters: {
            type: "object",
            properties: {
              month: { type: "string", description: "月份，格式 YYYY-MM，缺省为本月" },
              type: { type: "string", enum: ["expense", "income"] },
              categoryId: { type: "string" },
              limit: { type: "number", description: "最多返回条数，默认 20" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_monthly_stats",
          description: "获取某月统计：总收入/总支出/结余/分类排行。适合回答「这个月花最多的是什么」「本月开销概况」。",
          parameters: {
            type: "object",
            properties: {
              month: { type: "string", description: "YYYY-MM，缺省为本月" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "set_budget",
          description: "设置或更新某月预算。用户说「这个月预算3000」「预算改成2500」「奶茶预算200」时调用。只传要修改的字段，未传的保持不变。",
          parameters: {
            type: "object",
            properties: {
              month: { type: "string", description: "月份 YYYY-MM，缺省为本月" },
              total: { type: "number", description: "该月总预算（元）。传 0 表示清除总预算" },
              categoryBudgets: {
                type: "object",
                description: "分类预算映射 { 分类ID: 金额 }，如 { \"cat-food-dining\": 800 }。可一次设置多个分类",
                additionalProperties: { type: "number" }
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_budget",
          description: "查询某月预算使用情况：总预算、已花、剩余、是否超支、各分类预算进度。适合回答「预算还剩多少」「还能花多少」「奶茶预算用了没」。",
          parameters: {
            type: "object",
            properties: {
              month: { type: "string", description: "月份 YYYY-MM，缺省为本月" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "set_preference",
          description: "保存一条用户长期偏好/事实（口味、称呼、习惯、爱好等）到记忆，之后所有对话都会记住。仅用于非预算类偏好；预算、消费金额限额、额度等一律用 set_budget，不要用本工具。",
          parameters: {
            type: "object",
            properties: {
              key: { type: "string", description: "偏好类别名，如「饮食偏好」「收入」「消费提醒」" },
              value: { type: "string", description: "内容，如「不吃香菜」" }
            },
            required: ["key", "value"]
          }
        }
      }
    ];
  }

  // ============================================================
  // 工具执行（直接读写 IndexedDB）
  // ============================================================
  function monthRange(month) {
    let y, m;
    if (month && /^\d{4}-\d{2}$/.test(String(month).trim())) {
      const parts = String(month).trim().split("-");
      y = Number(parts[0]); m = Number(parts[1]);
    } else {
      const n = new Date();
      y = n.getFullYear(); m = n.getMonth() + 1;
    }
    const from = new Date(y, m - 1, 1).getTime();
    const to = new Date(y, m, 1).getTime() - 1;
    return { from, to, label: `${y}-${String(m).padStart(2, "0")}` };
  }

  async function execTool(name, args, ctx, out) {
    const cats = ctx.categories || [];

    switch (name) {
      case "add_transaction": {
        const amount = Number(args.amount);
        if (!amount || amount <= 0) return { ok: false, error: "金额无效" };
        let cat = cats.find((c) => c.id === args.categoryId);
        if (!cat) cat = cats.find((c) => c.name === args.categoryId);
        if (!cat) {
          return { ok: false, error: "分类不存在: " + args.categoryId, available: cats.map((c) => c.id) };
        }
        // 分类类型优先（选了支出分类就按支出记）
        const type = cat.type === "income" ? "income" : (args.type === "income" ? "income" : "expense");
        // 用户原话里带“昨天/前天/N天前/X月X日”时按对应日期记账
        const txTs = KLDB.parseDateText(ctx.userText) || Date.now();
        const notToday = new Date(txTs).toDateString() !== new Date().toDateString();
        const id = await KLDB.addTransaction({
          type,
          amount,
          categoryId: cat.id,
          accountId: args.account || "acc-cash",
          note: args.note || "",
          ts: txTs,
          bookId: KLDB.activeBookId()
        });
        out.wroteTx = true;
        out.cards.push({
          icon: type === "income" ? "🎀" : "🌸",
          title: `已记一笔 · ${cat.name}`,
          detail: `${type === "income" ? "+" : "-"} ¥ ${amount.toFixed(2)}${notToday ? " · 记于 " + new Date(txTs).toLocaleDateString("zh-CN") : ""}${args.note ? " · " + args.note : ""}`
        });
        return { ok: true, id, category: cat.name, type, ts: txTs };
      }

      case "query_transactions": {
        const { from, to } = monthRange(args.month);
        const list = await KLDB.listTransactions({ from, to, type: args.type, categoryId: args.categoryId, bookId: KLDB.activeBookId() });
        const limit = Number(args.limit) || 20;
        const rows = list.slice(0, limit).map((t) => ({
          date: new Date(t.ts).toLocaleDateString("zh-CN"),
          type: t.type,
          amount: t.amount,
          category: (cats.find((c) => c.id === t.categoryId) || {}).name || t.categoryId,
          note: t.note || ""
        }));
        return { ok: true, totalCount: list.length, returned: rows.length, transactions: rows };
      }

      case "get_monthly_stats": {
        const { from, to, label } = monthRange(args.month);
        const list = await KLDB.listTransactions({ from, to, bookId: KLDB.activeBookId() });
        let income = 0, expense = 0;
        const byCat = {};
        for (const t of list) {
          if (t.type === "income") income += t.amount;
          else if (t.type === "expense") {
            expense += t.amount;
            byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount;
          }
        }
        const catRows = Object.entries(byCat)
          .map(([cid, v]) => ({
            category: (cats.find((c) => c.id === cid) || {}).name || cid,
            amount: Number(v.toFixed(2))
          }))
          .sort((a, b) => b.amount - a.amount);
        out.cards.push({
          icon: "📊",
          title: `${label} 支出 ¥${expense.toFixed(2)}`,
          detail: catRows.slice(0, 3).map((r) => `${r.category} ¥${r.amount}`).join(" · ") || "暂无支出"
        });
        return {
          ok: true,
          month: label,
          income: Number(income.toFixed(2)),
          expense: Number(expense.toFixed(2)),
          balance: Number((income - expense).toFixed(2)),
          byCategory: catRows,
          txCount: list.length
        };
      }

      case "set_budget": {
        const { label } = monthRange(args.month);
        let store = KLDB.loadBudgets();
        const cur = store[label] || { total: 0, cats: {} };
        cur.cats = cur.cats || {};

        let changed = [];
        if (args.total != null && isFinite(Number(args.total)) && Number(args.total) >= 0) {
          cur.total = Number(args.total);
          changed.push(`总预算 ¥${cur.total.toFixed(2)}`);
        }
        if (args.categoryBudgets && typeof args.categoryBudgets === "object") {
          for (const [cid, v] of Object.entries(args.categoryBudgets)) {
            const num = Number(v);
            if (!isFinite(num) || num < 0) continue;
            let cat = cats.find((c) => c.id === cid) || cats.find((c) => c.name === cid);
            const key = cat ? cat.id : cid;
            cur.cats[key] = num;
            changed.push(`${cat ? cat.name : cid} ¥${num.toFixed(2)}`);
          }
        }
        if (changed.length === 0) return { ok: false, error: "没有可设置的字段（total / categoryBudgets）" };

        store[label] = cur;
        KLDB.saveBudgets(store);
        out.wroteBudget = true;
        out.cards.push({
          icon: "🎀",
          title: `预算已更新 · ${label}`,
          detail: changed.join(" · ")
        });
        return { ok: true, month: label, budget: cur };
      }

      case "get_budget": {
        const { from, to, label } = monthRange(args.month);
        let store = KLDB.loadBudgets();
        const budget = store[label] || { total: 0, cats: {} };
        budget.cats = budget.cats || {};

        const list = await KLDB.listTransactions({ from, to, bookId: KLDB.activeBookId() });
        let spent = 0;
        const spentByCat = {};
        for (const t of list) {
          if (t.type === "expense") {
            spent += t.amount;
            spentByCat[t.categoryId] = (spentByCat[t.categoryId] || 0) + t.amount;
          }
        }
        spent = Number(spent.toFixed(2));

        // 剩余天数（仅当查的是本月时返回）
        const now = new Date();
        const thisLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        let daysLeft = null;
        if (label === thisLabel) {
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          daysLeft = daysInMonth - now.getDate() + 1;
        }

        const catRows = Object.entries(budget.cats)
          .filter(([, v]) => Number(v) > 0)
          .map(([cid, limit]) => {
            const cat = cats.find((c) => c.id === cid);
            const cs = Number((spentByCat[cid] || 0).toFixed(2));
            return {
              category: cat ? cat.name : cid,
              limit: Number(limit),
              spent: cs,
              remaining: Number((limit - cs).toFixed(2)),
              over: cs > limit
            };
          });

        out.cards.push({
          icon: "🎯",
          title: `${label} 预算 ¥${budget.total.toFixed(2)}`,
          detail: budget.total > 0
            ? (spent > budget.total
                ? `已花 ¥${spent.toFixed(2)} · 超支 ¥${(spent - budget.total).toFixed(2)} ⚠️`
                : `已花 ¥${spent.toFixed(2)} · 剩余 ¥${(budget.total - spent).toFixed(2)}`)
            : "本月还没设总预算哦"
        });

        return {
          ok: true,
          month: label,
          totalBudget: budget.total,
          spent,
          remaining: budget.total > 0 ? Number((budget.total - spent).toFixed(2)) : null,
          over: budget.total > 0 && spent > budget.total,
          daysLeft,
          categoryBudgets: catRows
        };
      }

      case "set_preference": {
        const key = String(args.key || "").trim();
        const value = String(args.value || "").trim();
        if (!key || !value) return { ok: false, error: "key/value 不能为空" };
        await KLDB.addPreference({ key, value, source: "ai" });
        out.prefsAdded.push({ key, value });
        return { ok: true };
      }

      default:
        return { ok: false, error: "未知工具: " + name };
    }
  }

  // ============================================================
  // HTTP（走本机代理）
  // ============================================================
  async function requestChat(config, payload) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": config.apiKey || "" },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
    } catch (e) {
      throw new Error(e.name === "AbortError" ? "请求超时（90s），DeepSeek 没回话" : "网络错误: " + e.message);
    } finally {
      clearTimeout(timer);
    }
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { throw new Error("代理返回非 JSON（HTTP " + resp.status + "）: " + text.slice(0, 120)); }
    if (!resp.ok) {
      const em = (data && (data.error?.message || data.error)) || ("HTTP " + resp.status);
      throw new Error(typeof em === "string" ? em : JSON.stringify(em));
    }
    return data;
  }

  // ============================================================
  // 主入口：带工具调用循环的对话
  // ============================================================
  async function chat({ userText, history, prefs, categories, bookName, accounts, config }) {
    const out = { text: "", cards: [], prefsAdded: [], wroteTx: false, wroteBudget: false };
    const ctx = { categories: categories || [], userText };

    const messages = [
      { role: "system", content: buildSystemPrompt({ prefs, categories: ctx.categories, bookName, accounts }) },
      ...(history || [])
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .slice(-200)  // 最近 100 轮（1 轮 = user + assistant 各 1 条）
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
      { role: "user", content: userText }
    ];

    const tools = buildTools();
    const model = config.model || "deepseek-v4-flash";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const data = await requestChat(config, {
        model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 800
      });

      const msg = data.choices && data.choices[0] && data.choices[0].message;
      if (!msg) throw new Error("DeepSeek 返回格式异常：没有 choices[0].message");

      if (msg.tool_calls && msg.tool_calls.length) {
        // 记录 assistant 的工具调用请求
        messages.push({ role: "assistant", content: msg.content || "", tool_calls: msg.tool_calls });
        for (const tc of msg.tool_calls) {
          let args = {};
          try { args = JSON.parse(tc.function?.arguments || "{}"); }
          catch (_) { /* 参数解析失败按空对象处理，工具会返回错误提示模型 */ }
          let result;
          try { result = await execTool(tc.function?.name, args, ctx, out); }
          catch (e) { result = { ok: false, error: "工具执行出错: " + e.message }; }
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue; // 带着工具结果再问一轮
      }

      out.text = (msg.content || "").trim() || "（Kitty 想了想，什么也没说 🌸）";
      return out;
    }

    out.text = "（这题有点复杂，Kitty 转晕了，换个说法再试一次？🎀）";
    return out;
  }

  // 连接测试（不挂工具，纯 ping）
  async function testConnection(config) {
    await requestChat(config, {
      model: config.model || "deepseek-v4-flash",
      messages: [{ role: "user", content: "回复一个字：喵" }],
      max_tokens: 8
    });
    return true;
  }

  global.KLAI = { chat, testConnection };
})(window);
