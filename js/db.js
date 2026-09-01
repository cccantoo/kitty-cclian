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
      const req = tx(storeName, "readonly").getAll();
      req.onsuccess = (e) => resolve(e.target.result);
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

    // accounts 存在 localStorage（轻量）
    if (!localStorage.getItem("kitty_accounts")) {
      localStorage.setItem("kitty_accounts", JSON.stringify(DEFAULT_ACCOUNTS));
    }

    return true;
  }

  // ---------- 业务封装 ----------
  async function listTransactions({ from, to, type, categoryId } = {}) {
    const all = await this.all(STORE.TX);
    return all
      .filter((t) => (!from || t.ts >= from) && (!to || t.ts <= to)
                     && (!type || t.type === type)
                     && (!categoryId || t.categoryId === categoryId))
      .sort((a, b) => b.ts - a.ts);
  }

  async function addTransaction({ type, amount, categoryId, accountId, accountFrom, accountTo, note, ts, tags }) {
    const isTransfer = type === "transfer";
    return this.add(STORE.TX, {
      type, amount: Number(amount),
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
    return this.put(STORE.TX, { ...t, ...patch });
  }
  async function deleteTransaction(id) {
    return this.del(STORE.TX, id);
  }

  // categories
  async function allCategories() { return this.all(STORE.CAT); }

  // preferences
  async function allPreferences() { return this.all(STORE.PREF); }
  async function addPreference({ key, value, source }) {
    return this.add(STORE.PREF, { key, value, source: source || "manual", ts: Date.now() });
  }
  async function updatePreference(id, patch) {
    const p = await this.get(STORE.PREF, id);
    return this.put(STORE.PREF, { ...p, ...patch });
  }
  async function deletePreference(id) { return this.del(STORE.PREF, id); }

  // memos
  async function allMemos() {
    const list = await this.all(STORE.MEMO);
    return list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
  }
  async function addMemo({ title, content, tags }) {
    const now = Date.now();
    return this.add(STORE.MEMO, { title, content: content || "", tags: tags || [], pinned: false, createdAt: now, updatedAt: now });
  }
  async function updateMemo(id, patch) {
    const m = await this.get(STORE.MEMO, id);
    return this.put(STORE.MEMO, { ...m, ...patch, updatedAt: Date.now() });
  }
  async function deleteMemo(id) { return this.del(STORE.MEMO, id); }

  // messages
  async function addMessage({ role, content, toolCalls, kind }) {
    return this.add(STORE.MSG, { role, content, toolCalls: toolCalls || null, kind: kind || "text", ts: Date.now() });
  }
  async function recentMessages(limit = 40) {
    const list = await this.all(STORE.MSG);
    return list.sort((a, b) => b.ts - a.ts).slice(0, limit).reverse();
  }
  async function clearMessages() { return this.clear(STORE.MSG); }

  // 全局导出
  global.KLDB = {
    STORE,
    init, openDB,
    add, put, get, all, del, clear, byIndex,
    listTransactions, addTransaction, updateTransaction, deleteTransaction,
    allCategories, allPreferences, addPreference, updatePreference, deletePreference,
    allMemos, addMemo, updateMemo, deleteMemo,
    addMessage, recentMessages, clearMessages
  };
})(window);
