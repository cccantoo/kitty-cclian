/**
 * Kitty 账本 · IndexedDB 封装
 * ----------------------------------------------------------
 * 5 张表：
 *   transactions : 记账流水
 *   memos        : 备忘录
 *   categories   : 分类（含 icon 路径）
 *   preferences  : 用户偏好（AI 记忆核心）
 *   messages     : 聊天消息
 * ========================================================== */

(function (global) {
  const DB_NAME = "kitty-ledger";
  const DB_VERSION = 1;
  const STORE = {
    TX: "transactions",
    MEMO: "memos",
    CAT: "categories",
    PREF: "preferences",
    MSG: "messages"
  };

  // 默认分类（启动时若数据库为空则填充）
  // icon 路径必须与 icons/kitty/ 下真实文件名对齐
  const DEFAULT_CATEGORIES = [
    // ===== expense 支出 =====
    { id: "cat-food-dining",  type: "expense", name: "餐饮",   icon: "icons/kitty/drink-snack/4_22_bread-bag.png" },
    { id: "cat-dessert",      type: "expense", name: "甜品",   icon: "icons/kitty/dessert/7_22_pudding.png" },
    { id: "cat-drink",        type: "expense", name: "饮品",   icon: "icons/kitty/drink-snack/4_43_drink-cup.png" },
    { id: "cat-fruit",        type: "expense", name: "水果",   icon: "icons/kitty/fruit/11_31_strawberry.png" },
    { id: "cat-snack",        type: "expense", name: "零食",   icon: "icons/kitty/drink-snack/4_41_chips.png" },
    { id: "cat-shopping",     type: "expense", name: "购物",   icon: "icons/kitty/office-life/10_32_handbag.png" },
    { id: "cat-traffic",      type: "expense", name: "交通",   icon: "icons/kitty/life-travel/8_32_car-mini.png" },
    { id: "cat-home",         type: "expense", name: "居家",   icon: "icons/kitty/life-travel/5_22_house.png" },
    { id: "cat-entertain",    type: "expense", name: "娱乐",   icon: "icons/kitty/life-travel/5_21_camera.png" },
    { id: "cat-comm",         type: "expense", name: "通讯",   icon: "icons/kitty/life-travel/5_13_telephone.png" },
    { id: "cat-learn",        type: "expense", name: "学习",   icon: "icons/kitty/life-travel/5_33_notebook.png" },
    { id: "cat-medical",      type: "expense", name: "医疗",   icon: "icons/kitty/office-life/10_42_soap-dispenser.png" },
    { id: "cat-else",         type: "expense", name: "其他",   icon: "icons/kitty/misc/3_43_mango.png" },
    // ===== income 收入 =====
    { id: "cat-salary",       type: "income",  name: "工资",   icon: "icons/kitty/misc/3_33_birthday-cake.png" },
    { id: "cat-gift",         type: "income",  name: "红包",   icon: "icons/kitty/dessert/7_33_apple-bag.png" },
    { id: "cat-invest",       type: "income",  name: "理财",   icon: "icons/kitty/office-life/10_23_envelope.png" },
    { id: "cat-else-in",      type: "income",  name: "其他",   icon: "icons/kitty/misc/3_41_plush-bag.png" }
  ];

  const DEFAULT_ACCOUNTS = [
    { id: "acc-cash",     name: "现金", icon: "💵", order: 0 },
    { id: "acc-wechat",   name: "微信", icon: "💚", order: 1 },
    { id: "acc-alipay",   name: "支付宝", icon: "💙", order: 2 },
    { id: "acc-card",     name: "银行卡", icon: "💳", order: 3 },
    { id: "acc-other",    name: "其他",  icon: "🪙", order: 4 }
  ];

  // ============================================================
  // 多账本（kitty_books 存于 localStorage，账本内嵌独立账户列表）
  //   账本结构: { id, name, icon, isDefault, createdAt, accounts: [...] }
  // 兼容迁移：历史无 bookId 的交易一律归属默认账本 book-default；
  //           旧单账本预算 kitty_budgets → kitty_budgets_<bookId>。
  // ============================================================
  const DEFAULT_BOOK_ID = "book-default";
  const BOOK_KEY = "kitty_books";
  const ACTIVE_BOOK_KEY = "kitty_active_book";

  function cloneDefaultAccounts() {
    return DEFAULT_ACCOUNTS.map((a) => Object.assign({}, a));
  }
  function budgetsKey(bookId) {
    return "kitty_budgets_" + (bookId || activeBookId());
  }
  function activeBookId() {
    return localStorage.getItem(ACTIVE_BOOK_KEY) || DEFAULT_BOOK_ID;
  }
  function setActiveBookId(id) {
    localStorage.setItem(ACTIVE_BOOK_KEY, id);
  }
  function loadBudgets(bookId) {
    try {
      const v = JSON.parse(localStorage.getItem(budgetsKey(bookId)) || "{}");
      return (v && typeof v === "object") ? v : {};
    } catch (_) { return {}; }
  }
  function saveBudgets(obj, bookId) {
    localStorage.setItem(budgetsKey(bookId), JSON.stringify(obj || {}));
  }
  function removeBudgets(bookId) {
    localStorage.removeItem(budgetsKey(bookId));
  }
  function migrateLegacyBudgets() {
    try {
      const legacy = localStorage.getItem("kitty_budgets");
      if (legacy && legacy !== "{}" && legacy !== "null") {
        saveBudgets(JSON.parse(legacy), DEFAULT_BOOK_ID);
      }
      localStorage.removeItem("kitty_budgets");
    } catch (_) { /* 旧数据损坏则忽略 */ }
  }
  // 保证至少有一个账本；首启把历史 kitty_accounts 迁成默认账本的账户组
  function ensureBooks() {
    let books = null;
    try {
      const raw = JSON.parse(localStorage.getItem(BOOK_KEY) || "null");
      if (Array.isArray(raw) && raw.length) books = raw;
    } catch (_) { books = null; }

    if (!books) {
      let accs = [];
      try { accs = JSON.parse(localStorage.getItem("kitty_accounts") || "[]"); } catch (_) { accs = []; }
      if (!Array.isArray(accs) || accs.length === 0) accs = cloneDefaultAccounts();
      books = [{
        id: DEFAULT_BOOK_ID,
        name: "Kitty 账本",
        icon: "🐱",
        isDefault: true,
        createdAt: Date.now(),
        accounts: accs
      }];
      saveBooks(books);
    } else {
      let dirty = false;
      if (!books.some((b) => b.isDefault)) { books[0].isDefault = true; dirty = true; }
      for (const b of books) {
        if (!b.name) { b.name = "未命名账本"; dirty = true; }
        if (!b.icon) { b.icon = "🐱"; dirty = true; }
        if (!Array.isArray(b.accounts) || b.accounts.length === 0) { b.accounts = cloneDefaultAccounts(); dirty = true; }
      }
      if (dirty) saveBooks(books);
    }
    migrateLegacyBudgets();
    return books;
  }
  function books() { return ensureBooks(); }
  function saveBooks(list) {
    localStorage.setItem(BOOK_KEY, JSON.stringify(list || []));
  }
  function currentBook() {
    const list = ensureBooks();
    const id = activeBookId();
    return list.find((b) => b.id === id) || list.find((b) => b.isDefault) || list[0];
  }

  let _db = null;

  // ---------- 打开数据库 ----------
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE.TX)) {
          const store = db.createObjectStore(STORE.TX, { keyPath: "id", autoIncrement: true });
          store.createIndex("ts", "ts", { unique: false });
          store.createIndex("type", "type", { unique: false });
          store.createIndex("categoryId", "categoryId", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE.MEMO)) {
          db.createObjectStore(STORE.MEMO, { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE.CAT)) {
          db.createObjectStore(STORE.CAT, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE.PREF)) {
          db.createObjectStore(STORE.PREF, { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE.MSG)) {
          const store = db.createObjectStore(STORE.MSG, { keyPath: "id", autoIncrement: true });
          store.createIndex("ts", "ts", { unique: false });
        }
      };

      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ---------- 通用 API ----------
  function tx(storeName, mode) {
    if (!_db) throw new Error("db not ready");
    return _db.transaction(storeName, mode).objectStore(storeName);
  }

  function add(storeName, record) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName, "readwrite").add(record);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function put(storeName, record) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName, "readwrite").put(record);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // keyPath + autoIncrement 的表（tx/memo/pref/msg）主键是数字，
  // 但 DOM dataset / JSON 导入拿到的可能是字符串 → 统一归一化，否则 get/del 静默失败
  function normKey(key) {
    if (typeof key === "string" && /^\d+$/.test(key)) return Number(key);
    return key;
  }

  function get(storeName, key) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName, "readonly").get(normKey(key));
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function all(storeName) {
    return new Promise((resolve, reject) => {
      const results = [];
      const req = tx(storeName, "readonly").openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          // 兜底注入主键 id：部分浏览器 getAll() 不会把 autoIncrement 主键写回 value，
          // 导致记录缺 id，后续 get(id)/update/delete 会因 key=undefined 报 DataError
          results.push({ ...cursor.value, id: (cursor.value && cursor.value.id !== undefined) ? cursor.value.id : cursor.key });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function del(storeName, key) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName, "readwrite").delete(normKey(key));
      req.onsuccess = (e) => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function clear(storeName) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName, "readwrite").clear();
      req.onsuccess = (e) => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // 通过索引查
  function byIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName, "readonly").index(indexName).getAll(value);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ---------- 初始化 + 注入默认数据 ----------
  async function init() {
    await openDB();

    // categories 初始化
    const cats = await all(STORE.CAT);
    if (cats.length === 0) {
      for (const c of DEFAULT_CATEGORIES) await put(STORE.CAT, c);
    }
    // preferences 默认偏好
    const prefs = await all(STORE.PREF);
    if (!prefs.find((p) => p.key === "system.initialized")) {
      await add(STORE.PREF, { key: "system.initialized", value: "1", source: "system", ts: Date.now() });
    }

    // accounts 存在 localStorage（轻量；历史兼容，多账本时代账户挂在各账本上）
    if (!localStorage.getItem("kitty_accounts")) {
      localStorage.setItem("kitty_accounts", JSON.stringify(DEFAULT_ACCOUNTS));
    }

    // 账本：保证默认账本存在 + 迁移旧预算（历史数据自动归入默认账本）
    ensureBooks();

    return true;
  }

  // ---------- 业务封装 ----------
  async function listTransactions({ from, to, type, categoryId, bookId } = {}) {
    const all = await this.all(STORE.TX);
    const bookOf = (t) => (t && t.bookId) || DEFAULT_BOOK_ID; // 历史记录归默认账本
    return all
      .filter((t) => (bookId === undefined || bookOf(t) === bookId)
                     && (!from || t.ts >= from) && (!to || t.ts <= to)
                     && (!type || t.type === type)
                     && (!categoryId || t.categoryId === categoryId))
      .sort((a, b) => b.ts - a.ts);
  }

  async function addTransaction({ type, amount, categoryId, accountId, accountFrom, accountTo, note, ts, tags, bookId }) {
    const isTransfer = type === "transfer";
    return this.add(STORE.TX, {
      type, amount: Number(amount),
      bookId: bookId || DEFAULT_BOOK_ID,
      categoryId: isTransfer ? null : categoryId,
      accountId: isTransfer ? null : (accountId || "acc-cash"),
      accountFrom: isTransfer ? (accountFrom || "acc-cash") : null,
      accountTo: isTransfer ? (accountTo || "acc-wechat") : null,
      note: note || "",
      tags: tags || [],
      ts: ts || Date.now(),
      createdAt: Date.now()
    });
  }

  async function updateTransaction(id, patch) {
    const t = await this.get(STORE.TX, id);
    return this.put(STORE.TX, { ...t, ...patch, id });
  }
  // 删除交易前先记云墓碑（供云同步把删除传播到其它设备）
  async function deleteTransaction(id) {
    const t = await this.get(STORE.TX, id);
    if (t) {
      const now = Date.now();
      putTomb("transactions", String(id), {
        id: t.id, book_id: t.bookId || DEFAULT_BOOK_ID, type: t.type || "expense",
        amount_cents: Math.round((Number(t.amount) || 0) * 100),
        category_id: t.categoryId || null, account_id: t.accountId || null,
        account_from: t.accountFrom || null, account_to: t.accountTo || null,
        note: t.note || "", tags_json: JSON.stringify(t.tags || []),
        ts: t.ts || t.createdAt || now,
        created_at: t.createdAt || now, updated_at: now, deleted_at: now
      });
    }
    return this.del(STORE.TX, id);
  }

  // categories
  async function allCategories() { return this.all(STORE.CAT); }
  // 用户自建分类：id 用前缀 + 时间戳 + 随机，避免和默认分类冲突
  async function addCategory({ name, type, icon }) {
    const id = "cat-c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const record = {
      id,
      type: type === "income" ? "income" : "expense",
      name: String(name || "").trim(),
      icon: icon || "icons/kitty/misc/3_43_mango.png"
    };
    await this.put(STORE.CAT, record);
    return record;
  }

  // preferences
  async function allPreferences() { return this.all(STORE.PREF); }
  async function addPreference({ key, value, source }) {
    return this.add(STORE.PREF, { key, value, source: source || "manual", ts: Date.now() });
  }
  async function updatePreference(id, patch) {
    const p = await this.get(STORE.PREF, id);
    return this.put(STORE.PREF, { ...p, ...patch, id });
  }
  // 同步墓碑（本地物理删除时留一条服务端行格式的删除标记，供云同步传播）
  function tombKeyOf(t) { return "kitty_tombs_" + t; }
  function putTomb(table, key, row) {
    try {
      const store = JSON.parse(localStorage.getItem(tombKeyOf(table)) || "{}") || {};
      store[String(key)] = row;
      localStorage.setItem(tombKeyOf(table), JSON.stringify(store));
    } catch (_) { /* 忽略损坏 */ }
  }
  function listTombs(table, keepMs) {
    try {
      const store = JSON.parse(localStorage.getItem(tombKeyOf(table)) || "{}") || {};
      const now = Date.now();
      const out = [];
      for (const k of Object.keys(store)) {
        const r = store[k];
        if (r && r.deleted_at) {
          if (!keepMs || now - Number(r.deleted_at) < keepMs) out.push(r);
        }
      }
      return out;
    } catch (_) { return []; }
  }
  // 应用层（如删账本）也可主动记墓碑：行需为服务端行格式并带 updated_at/deleted_at
  function addTomb(table, key, row) {
    putTomb(table, key, Object.assign({}, row, { updated_at: Date.now(), deleted_at: Date.now() }));
  }
  async function deletePreference(id) {
    const p = await this.get(STORE.PREF, id);
    if (p) {
      const now = Date.now();
      putTomb("preferences", "p:" + p.key, {
        pkey: p.key, pvalue: String(p.value === undefined || p.value === null ? "" : p.value),
        source: p.source || "manual", created_at: p.ts || now, updated_at: now, deleted_at: now
      });
    }
    return this.del(STORE.PREF, id);
  }

  // memos（备忘录：标题/正文/标签 + 待办清单行 + 颜色 + 状态）
  //  - content 为纯文本，行首 "[ ] "/"[x] " 解析为待办清单
  //  - color: 预设颜色 key；pinned 置顶；archived 归档；trashed 软删进回收站
  async function allMemos() {
    const list = await this.all(STORE.MEMO);
    return list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
  }
  async function addMemo({ title, content, tags, color, pinned, archived, trashed, trashedAt }) {
    const now = Date.now();
    return this.add(STORE.MEMO, {
      title: String(title || "").trim(),
      content: content || "",
      tags: tags || [],
      color: color || "pink",
      pinned: !!pinned,
      archived: !!archived,
      trashed: !!trashed,
      trashedAt: trashedAt || null,
      createdAt: now,
      updatedAt: now
    });
  }
  // noTouch=true 时（勾选待办/置顶/归档/回收站等元操作）不刷新 updatedAt，避免列表排序跳动
  async function updateMemo(id, patch) {
    const m = await this.get(STORE.MEMO, id);
    const { noTouch, ...rest } = patch || {};
    const now = Date.now();
    return this.put(STORE.MEMO, { ...m, ...rest, id, updatedAt: noTouch ? (m.updatedAt || now) : now });
  }
  async function deleteMemo(id) {
    const m = await this.get(STORE.MEMO, id);
    if (m) {
      const now = Date.now();
      putTomb("memos", String(id), {
        id: m.id, title: m.title || "", content: m.content || "", color: m.color || "pink",
        tags_json: JSON.stringify(m.tags || []),
        pinned: m.pinned ? 1 : 0, archived: m.archived ? 1 : 0, trashed: m.trashed ? 1 : 0,
        trashed_at: m.trashedAt || null,
        created_at: m.createdAt || now, updated_at: now, deleted_at: now
      });
    }
    return this.del(STORE.MEMO, id);
  }

  // messages（聊天记录，云同步用 allMessages）
  async function addMessage({ role, content, toolCalls, kind }) {
    return this.add(STORE.MSG, { role, content, toolCalls: toolCalls || null, kind: kind || "text", ts: Date.now() });
  }
  async function allMessages() {
    return (await this.all(STORE.MSG)).sort((a, b) => a.ts - b.ts);
  }
  async function recentMessages(limit = 40) {
    const list = await this.all(STORE.MSG);
    return list.sort((a, b) => b.ts - a.ts).slice(0, limit).reverse();
  }
  async function clearMessages() { return this.clear(STORE.MSG); }

  // ---------- 文本日期解析（记账 / AI 用） ----------
  // 从自然语言提取「哪天」，返回该日 0 点毫秒；识别不出返回 null（调用方回退当前时间）
  function parseDateText(text) {
    if (!text) return null;
    const t = String(text);
    const relWords = [
      ["今天", 0], ["今日", 0], ["当天", 0],
      ["明天", 1], ["明日", 1], ["后天", 2],
      ["昨天", -1], ["昨日", -1], ["前天", -2], ["大前天", -3]
    ];
    for (const [w, off] of relWords) {
      if (t.includes(w)) return dayStart(off);
    }
    const rel = t.match(/(\d{1,3})\s*(?:个)?\s*(?:天|日)\s*(?:前|以前|之前)/);
    if (rel) return dayStart(-Number(rel[1]));
    const md = t.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号)/);
    if (md) {
      const now = new Date();
      const d = new Date(now.getFullYear(), Number(md[1]) - 1, Number(md[2]), 12, 0, 0, 0);
      if (d.getTime() > now.getTime() + 7 * 24 * 3600 * 1000) {
        d.setFullYear(d.getFullYear() - 1); // 明显晚于今天 → 按去年（补记习惯）
      }
      return d.getTime();
    }
    const ym = t.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号)/);
    if (ym) {
      return new Date(Number(ym[1]), Number(ym[2]) - 1, Number(ym[3]), 12, 0, 0, 0).getTime();
    }
    return null;

    function dayStart(offsetDays) {
      const n = new Date();
      n.setDate(n.getDate() + offsetDays);
      n.setHours(0, 0, 0, 0);
      return n.getTime();
    }
  }

  // 全局导出
  global.KLDB = {
    STORE,
    init, openDB,
    add, put, get, all, del, clear, byIndex,
    listTransactions, addTransaction, updateTransaction, deleteTransaction,
    parseDateText,
    allCategories, addCategory, allPreferences, addPreference, updatePreference, deletePreference,
    allMemos, addMemo, updateMemo, deleteMemo,
    addMessage, allMessages, recentMessages, clearMessages,
    // 多账本
    DEFAULT_BOOK_ID,
    cloneDefaultAccounts,
    books, saveBooks,
    activeBookId, setActiveBookId, currentBook,
    loadBudgets, saveBudgets, removeBudgets,
    listTombs, addTomb
  };
})(window);
