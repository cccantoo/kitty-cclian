/**
 * Kitty 账本 · 主应用入口（app.js）
 * ----------------------------------------------------------
 * 负责：
 *   - 启动时初始化 IndexedDB
 *   - hash 路由（三大页切换）
 *   - 顶部 + 底部 Tab
 *   - 记忆抽屉（drawer）
 *   - 聊天发送 + 渲染
 *   - 记账列表渲染、添加
 *   - 备忘录列表渲染、添加
 *   - Toast / Modal 工具
 *   - AI 占位（MOCK 模式，v2 接 DeepSeek）
 * ========================================================== */

(function (app) {
  // ============================================================
  // 状态
  // ============================================================
  // Kitty 头像（AI = 苹果猫 · 用户 = 唱片猫）
  const AVATAR_AI = "icons/kitty/dessert/7_41_apple.png";
  const AVATAR_USER = "icons/kitty/misc/3_12_vinyl-music.png";

  // Kitty 图标库：用户自建分类时可选（96 个 @1x）
  const KITTY_ICONS = [
    "icons/kitty/dessert/7_11_flower-kitty.png", "icons/kitty/dessert/7_12_strawberry-cake.png", "icons/kitty/dessert/7_13_snow-mountain.png", "icons/kitty/dessert/7_21_packaged-kitty.png",
    "icons/kitty/dessert/7_22_pudding.png", "icons/kitty/dessert/7_23_icecream-cone.png", "icons/kitty/dessert/7_31_riceball.png", "icons/kitty/dessert/7_32_fries.png",
    "icons/kitty/dessert/7_33_apple-bag.png", "icons/kitty/dessert/7_41_apple.png", "icons/kitty/dessert/7_42_chips-square.png", "icons/kitty/dessert/7_43_cherry-fruit.png",
    "icons/kitty/drink-snack/4_11_candy-skewer.png", "icons/kitty/drink-snack/4_12_strawberry-cake.png", "icons/kitty/drink-snack/4_13_ramen-bowl.png", "icons/kitty/drink-snack/4_21_cola.png",
    "icons/kitty/drink-snack/4_22_bread-bag.png", "icons/kitty/drink-snack/4_23_icecream-sundae.png", "icons/kitty/drink-snack/4_31_coconut-water.png", "icons/kitty/drink-snack/4_32_frying-pan.png",
    "icons/kitty/drink-snack/4_33_milk-box.png", "icons/kitty/drink-snack/4_41_chips.png", "icons/kitty/drink-snack/4_42_toaster.png", "icons/kitty/drink-snack/4_43_drink-cup.png",
    "icons/kitty/fruit/11_11_pineapple.png", "icons/kitty/fruit/11_12_cherry.png", "icons/kitty/fruit/11_13_coconut.png", "icons/kitty/fruit/11_21_orange.png",
    "icons/kitty/fruit/11_22_pineapple-slice.png", "icons/kitty/fruit/11_23_watermelon.png", "icons/kitty/fruit/11_31_strawberry.png", "icons/kitty/fruit/11_32_peach.png",
    "icons/kitty/fruit/11_33_mango.png", "icons/kitty/fruit/11_41_dragonfruit.png", "icons/kitty/fruit/11_42_mangosteen.png", "icons/kitty/fruit/11_43_pear.png",
    "icons/kitty/life-travel/5_11_ramen-bowl.png", "icons/kitty/life-travel/5_12_makeup-bag.png", "icons/kitty/life-travel/5_13_telephone.png", "icons/kitty/life-travel/5_21_camera.png",
    "icons/kitty/life-travel/5_22_house.png", "icons/kitty/life-travel/5_23_perfume.png", "icons/kitty/life-travel/5_31_train.png", "icons/kitty/life-travel/5_32_singing.png",
    "icons/kitty/life-travel/5_33_notebook.png", "icons/kitty/life-travel/5_41_coconut-drink.png", "icons/kitty/life-travel/5_42_car.png", "icons/kitty/life-travel/5_43_pen-holder.png",
    "icons/kitty/life-travel/8_11_notebook.png", "icons/kitty/life-travel/8_12_plane.png", "icons/kitty/life-travel/8_13_house-cat.png", "icons/kitty/life-travel/8_21_basket-kitty.png",
    "icons/kitty/life-travel/8_22_suitcase.png", "icons/kitty/life-travel/8_23_paper-bag.png", "icons/kitty/life-travel/8_31_bicycle.png", "icons/kitty/life-travel/8_32_car-mini.png",
    "icons/kitty/life-travel/8_33_umbrella.png", "icons/kitty/life-travel/8_41_shopping-bag.png", "icons/kitty/life-travel/8_42_shopping-cart.png", "icons/kitty/life-travel/8_43_crystal-ball.png",
    "icons/kitty/misc/3_11_cupcake.png", "icons/kitty/misc/3_12_vinyl-music.png", "icons/kitty/misc/3_13_chinese-knot.png", "icons/kitty/misc/3_21_fork-kitty.png",
    "icons/kitty/misc/3_22_hotpot.png", "icons/kitty/misc/3_23_icecream.png", "icons/kitty/misc/3_31_bubble-tea.png", "icons/kitty/misc/3_32_omurice.png",
    "icons/kitty/misc/3_33_birthday-cake.png", "icons/kitty/misc/3_41_plush-bag.png", "icons/kitty/misc/3_42_polaroid.png", "icons/kitty/misc/3_43_mango.png",
    "icons/kitty/office-life/10_11_milk-bottle.png", "icons/kitty/office-life/10_12_radio.png", "icons/kitty/office-life/10_13_chips-bag.png", "icons/kitty/office-life/10_21_laptop.png",
    "icons/kitty/office-life/10_22_walkie-talkie.png", "icons/kitty/office-life/10_23_envelope.png", "icons/kitty/office-life/10_31_guitar.png", "icons/kitty/office-life/10_32_handbag.png",
    "icons/kitty/office-life/10_33_straw-hat.png", "icons/kitty/office-life/10_41_note-pad.png", "icons/kitty/office-life/10_42_soap-dispenser.png", "icons/kitty/office-life/10_43_popcorn.png",
    "icons/kitty/sweet-home/9_11_house.png", "icons/kitty/sweet-home/9_12_gashapon.png", "icons/kitty/sweet-home/9_13_hello-pack.png", "icons/kitty/sweet-home/9_21_bubble-tea-pearl.png",
    "icons/kitty/sweet-home/9_22_sushi-box.png", "icons/kitty/sweet-home/9_23_icecream-bowl.png", "icons/kitty/sweet-home/9_31_candy-jar.png", "icons/kitty/sweet-home/9_32_pancake.png",
    "icons/kitty/sweet-home/9_33_donut.png",     "icons/kitty/sweet-home/9_41_chips.png", "icons/kitty/sweet-home/9_42_coffee-cup.png", "icons/kitty/sweet-home/9_43_juice-box.png"
  ];

  // 账本 emoji 图标（新建/编辑账本时可选）
  const BOOK_ICONS = [
    "🐱", "🏠", "✈️", "🏖️", "💼", "🛍️", "🎒", "🍼",
    "🎓", "💍", "🎁", "🎵", "🎬", "📚", "🏦", "💊",
    "🍽️", "🚗", "🐶", "⚽"
  ];

  // 备忘录贴纸颜色（key → 背景色）；沿用柔粉主题
  const MEMO_COLORS = {
    pink:  "#FFE7F0",
    peach: "#FFEAD9",
    lemon: "#FFF6CC",
    mint:  "#DDF4E7",
    sky:   "#DEEEFA",
    lilac: "#ECE1F9"
  };
  const MEMO_COLOR_LABELS = { pink: "粉", peach: "杏", lemon: "柠", mint: "薄荷", sky: "天空", lilac: "淡紫" };
  const MEMO_SORTS = [
    { key: "updated", label: "最近更新", title: "排序：最近更新" },
    { key: "oldest",  label: "最早创建", title: "排序：最早创建" },
    { key: "title",   label: "标题 A-Z", title: "排序：标题 A-Z" }
  ];
  // 待办行识别：行首 [ ] / [x] / [X]
  const MEMO_TODO_RE = /^\[([ xX])\]\s?(.*)$/;

  const state = {
    books: [],
    activeBook: null,
    categories: [],
    prefs: [],
    memos: [],
    txs: [],
    accounts: [],
    chatHistory: [],
    reportOffset: 0,   // 报表：0=本月，-1=上月
    budgetOffset: 0,   // 预算：0=本月
    memoUI: { view: "list", q: "", tag: null, sort: "updated" } // 备忘视图状态
  };

  // AI 配置（localStorage 持久化）
  // { mode: "mock" | "deepseek", model: "deepseek-v4-flash" | "deepseek-v4-pro" | "deepseek-v4-flash-vision-exp", apiKey: "sk-..." }
  function loadAIConfig() {
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem("kitty_ai_config") || "{}") || {}; }
    catch (_) { cfg = {}; }
    // 旧模型名自动迁移到 v4 系列
    const LEGACY_MODEL = { "deepseek-chat": "deepseek-v4-flash", "deepseek-reasoner": "deepseek-v4-pro" };
    if (cfg.model && LEGACY_MODEL[cfg.model]) cfg.model = LEGACY_MODEL[cfg.model];
    return cfg;
  }
  function saveAIConfig(cfg) {
    localStorage.setItem("kitty_ai_config", JSON.stringify(cfg));
  }

  // ============================================================
  // 启动
  // ============================================================
  async function boot() {
    try {
      await KLDB.init();
      state.books = KLDB.books();
      state.activeBook = KLDB.currentBook();
      KLDB.setActiveBookId(state.activeBook.id); // 持久化当前账本
      state.categories = await KLDB.allCategories();
      state.prefs = await KLDB.allPreferences();
      state.memos = await KLDB.allMemos();
      state.accounts = Array.isArray(state.activeBook.accounts) ? state.activeBook.accounts : [];
      state.txs = await KLDB.listTransactions({ bookId: state.activeBook.id });
      state.chatHistory = await KLDB.recentMessages(40);
      console.log("[boot] kitty-ledger ready", state);

      // 注册 Service Worker
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js").catch(() => {});
      }

      // 默认进入 chat
      if (!location.hash) location.hash = "#chat";

      setupRoutes();
      setupTabs();
      setupMemoryDrawer();
      setupChat();
      setupLedger();
      setupBooks();
      setupMemo();
      setupAISettings();
      renderAll();

      // 渲染回放历史会话
      renderChatHistory();

      toast("Kitty 已就绪 ✨", "success");
    } catch (err) {
      console.error("[boot] fail", err);
      toast("初始化失败 " + err.message, "error");
    }
  }

  // ============================================================
  // 路由（hash）
  // ============================================================
  function setupRoutes() {
    window.addEventListener("hashchange", () => {
      const tab = location.hash.replace("#", "");
      showPage(tab);
      highlightTab(tab);
    });
    const initial = location.hash.replace("#", "") || "chat";
    showPage(initial);
    highlightTab(initial);
  }
  function showPage(name) {
    document.querySelectorAll(".page").forEach((p) => {
      p.classList.toggle("hidden", p.dataset.page !== name);
    });
  }
  function highlightTab(name) {
    document.querySelectorAll(".tab-bar .tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === name);
    });
  }
  function setupTabs() {
    document.querySelectorAll(".tab-bar .tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const name = tab.dataset.tab;
        if (location.hash !== "#" + name) location.hash = "#" + name;
      });
    });
  }

  // ============================================================
  // 记忆 Drawer
  // ============================================================
  function setupMemoryDrawer() {
    const drawer = document.getElementById("memoryDrawer");
    document.getElementById("btnMemory").addEventListener("click", () => {
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
      renderPrefs();
    });
    drawer.querySelectorAll("[data-drawer-close]").forEach((el) => {
      el.addEventListener("click", () => {
        drawer.classList.remove("open");
        drawer.setAttribute("aria-hidden", "true");
      });
    });
    document.getElementById("btnAddPref").addEventListener("click", () => openPrefModal());
    document.getElementById("btnExport").addEventListener("click", exportJSON);
    document.getElementById("btnImport").addEventListener("click", importJSON);
    document.getElementById("btnClearAll").addEventListener("click", clearAllData);
  }

  // ============================================================
  // 聊天
  // ============================================================
  function setupChat() {
    const input = document.getElementById("chatInput");
    const send = document.getElementById("btnChatSend");
    const send_ = () => { closeQuickMenu(); sendChat(input.value.trim()); };
    send.addEventListener("click", send_);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send_(); }
    });
    document.getElementById("btnChatAttach").addEventListener("click", toggleQuickMenu);
  }

  // ＋ 快捷菜单（记一笔 / 本月报表 / 预算）
  let quickMenuEl = null;
  function closeQuickMenu() {
    if (quickMenuEl) { quickMenuEl.remove(); quickMenuEl = null; }
  }
  function toggleQuickMenu() {
    if (quickMenuEl) { closeQuickMenu(); return; }
    const composer = document.querySelector(".chat-composer");
    const attach = document.getElementById("btnChatAttach");
    const menu = document.createElement("div");
    menu.className = "chat-quick";
    menu.innerHTML = `
      <button data-qa="tx">🌸 手动记一笔</button>
      <button data-qa="chart">📊 本月报表</button>
      <button data-qa="budget">🎯 预算与进度</button>`;
    composer.appendChild(menu);
    quickMenuEl = menu;
    menu.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-qa]");
      if (!btn) return;
      const v = btn.dataset.qa;
      if (v === "tx") { closeQuickMenu(); openTxModal(); }
      else gotoLedgerView(v);
    });
    // 点菜单外任意处关闭
    setTimeout(() => {
      document.addEventListener("click", function h(e) {
        if (!quickMenuEl) { document.removeEventListener("click", h); return; }
        if (!quickMenuEl.contains(e.target) && e.target !== attach && !attach.contains(e.target)) {
          closeQuickMenu();
          document.removeEventListener("click", h);
        }
      });
    }, 0);
  }
  function gotoLedgerView(view) {
    closeQuickMenu();
    if (location.hash !== "#ledger") location.hash = "#ledger";
    document.querySelectorAll(".lt-tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
    document.querySelectorAll(".lt-view").forEach((v) => v.classList.toggle("active", v.dataset.view === view));
    if (view === "chart") renderCharts();
    if (view === "budget") renderBudget();
  }

  async function sendChat(text) {
    if (!text) return;
    const input = document.getElementById("chatInput");
    input.value = "";
    renderMessage({ role: "user", content: text, ts: Date.now() });
    await KLDB.addMessage({ role: "user", content: text });
    state.chatHistory.push({ role: "user", content: text, ts: Date.now() });

    // 调用 AI（DeepSeek 或本地 Mock）
    const typingEl = showTyping();
    let reply;
    try {
      reply = await aiReply(text, {
        prefs: state.prefs.filter((p) => !p.key.startsWith("system.")),
        categories: state.categories,
        recentTx: state.txs.slice(0, 20)
      });
    } finally {
      removeTyping(typingEl);
    }

    renderMessage({ role: "assistant", content: reply.text, ts: Date.now(), toolCards: reply.cards || [] });

    // 处理 AI 触发的副作用（mock 路径返回 actions；deepseek 路径已在工具里直接落库）
    if (reply.actions && reply.actions.length) {
      for (const act of reply.actions) await applyAction(act);
    }
    if (reply.preferencesAdded && reply.preferencesAdded.length) {
      for (const p of reply.preferencesAdded) {
        await KLDB.addPreference({ key: p.key, value: p.value, source: "ai" });
      }
      state.prefs = await KLDB.allPreferences();
      renderPrefsCount();
      renderPrefNotice(reply.text, reply.preferencesAdded);
    }
    state.chatHistory.push({ role: "assistant", content: reply.text, ts: Date.now() });
    await KLDB.addMessage({ role: "assistant", content: reply.text, toolCalls: reply.cards || null });

    // 滚动到底
    const list = document.getElementById("chatList");
    list.scrollTop = list.scrollHeight;

    // 触发其它页刷新（如新建了记账）
    if (reply.wroteTx || (reply.actions && reply.actions.some((a) => a.type === "addTransaction"))) {
      await reloadActiveTx();
      renderLedger();
      renderCharts();
      renderBudget();
      renderMemo();
    }
  }

  // ============================================================
  // AI 适配层：DeepSeek（真 AI）优先，本地 Mock 兜底
  // ============================================================
  async function aiReply(userText, ctx) {
    const cfg = loadAIConfig();
    if (cfg.mode === "deepseek" && cfg.apiKey) {
      try {
        const r = await KLAI.chat({
          userText,
          history: state.chatHistory,           // 最近 12 轮由 ai.js 截取
          prefs: ctx.prefs,                     // 长期偏好 → system prompt（记忆）
          categories: ctx.categories,
          bookName: state.activeBook ? state.activeBook.name : "",
          accounts: state.accounts,
          config: cfg
        });
        // 工具副作用已在 ai.js 里直接落库，这里只刷新 UI
        if (r.prefsAdded && r.prefsAdded.length) {
          state.prefs = await KLDB.allPreferences();
          renderPrefsCount();
          renderPrefNotice(r.text, r.prefsAdded);
        }
        // 预算被 AI 改过也要触发列表/报表/预算刷新（复用 wroteTx 通道）
        return { text: r.text, cards: r.cards, actions: [], preferencesAdded: [], wroteTx: !!(r.wroteTx || r.wroteBudget) };
      } catch (e) {
        console.warn("[ai] DeepSeek 失败，回退 MOCK:", e.message);
        toast("AI 调用失败，先用本地模式回复（" + e.message.slice(0, 60) + "）", "error");
      }
    }
    return mockReply(userText, ctx);
  }

  // Mock 实现：识别 + 解析 → 记账
  async function mockReply(userText, ctx) {
    const reply = { text: "", cards: [], actions: [], preferencesAdded: [] };

    // 0) 预算优先：预算/限额相关一律写记账栏预算（kitty_budgets），绝不进长期记忆
    if (/预算|限额|额度/.test(userText)) {
      const budgets = loadBudgets();
      const n = new Date();
      const key = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
      const isQuery = /(剩|还剩|剩多少|多少|查|看看|超|用了|花|情况|怎么样)/.test(userText);
      const mSet = userText.match(/(\d+(?:\.\d+)?)\s*(千|k|K)?/);
      if (mSet && !isQuery) {
        let total = parseFloat(mSet[1]);
        if (mSet[2]) total *= 1000;
        budgets[key] = Object.assign(budgets[key] || { total: 0, cats: {} }, { total });
        saveBudgets(budgets);
        renderBudget();
        reply.text = `好嘞，${key} 的总预算设为 ¥ ${total.toFixed(2)} 啦 🎀`;
        reply.cards.push({ icon: "🎀", title: `预算已设置 · ${key}`, detail: `总预算 ¥ ${total.toFixed(2)}` });
        return reply;
      }
      // 查询预算使用情况
      const budget = budgets[key] || { total: 0, cats: {} };
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const spent = ctx.recentTx
        .filter((t) => t.type === "expense" && t.ts >= monthStart.getTime())
        .reduce((s, t) => s + t.amount, 0);
      if (budget.total > 0) {
        const remain = budget.total - spent;
        reply.text = remain >= 0
          ? `本月预算 ¥ ${budget.total.toFixed(2)}，已花 ¥ ${spent.toFixed(2)}，还剩 ¥ ${remain.toFixed(2)}${remain / budget.total < 0.2 ? "，要省着点花哦～" : " ✨"}`
          : `本月预算 ¥ ${budget.total.toFixed(2)}，已花 ¥ ${spent.toFixed(2)}，超支 ¥ ${(spent - budget.total).toFixed(2)} 啦 ⚠️`;
        reply.cards.push({ icon: "🎯", title: `${key} 预算`, detail: `预算 ¥${budget.total.toFixed(2)} · 已花 ¥${spent.toFixed(2)}` });
      } else {
        reply.text = "这个月还没设预算哦～跟我说「这个月预算 3000」就能设置 🎀";
      }
      return reply;
    }

    // 1) 偏好学习：识别「记住 / 别再 / 我喜欢 / 我不想 / 以后 / 我以后」
    const prefMatch = userText.match(/(记住|以后(?:别|不要|不|我)?|别再|我喜欢|我不想|我的偏好)[，：:]?\s*([^\n。!?,;]{2,40})/);
    if (prefMatch) {
      const key = prefMatch[1];
      const value = prefMatch[2].trim();
      reply.preferencesAdded.push({ key: key, value: value });
      reply.text = `好嘞，已经记住啦 ✨\n「${value}」`;
    }

    // 2) 意图：记账？ 识别金额 + 类别关键词
    const amtMatch = userText.match(/(\d+(?:\.\d+)?)\s*(?:块|元|毛|块毛|圆|￥|¥)?/);
    const catMap = [
      { kw: /(吃|餐|饭|面|粉|锅|包|咖啡|可乐|圣代|牛奶)/,                           id: "cat-food-dining",  name: "餐饮", icon: "icons/kitty/drink-snack/4_22_bread-bag.png" },
      { kw: /(奶茶|果茶|柠檬茶|汽水|柠檬水|星巴克|喜茶|瑞幸|蜜雪|茶|水|可乐|饮料)/, id: "cat-drink",        name: "饮品", icon: "icons/kitty/drink-snack/4_43_drink-cup.png" },
      { kw: /(甜品|蛋糕|布丁|冰激凌|冰淇淋|蛋挞|泡芙|糖)/,                          id: "cat-dessert",      name: "甜品", icon: "icons/kitty/dessert/7_22_pudding.png" },
      { kw: /(水果|芒果|草莓|菠萝|樱桃|苹果|梨|西瓜|桃子|火龙果|橙|香蕉|葡萄)/,         id: "cat-fruit",        name: "水果", icon: "icons/kitty/fruit/11_31_strawberry.png" },
      { kw: /(零食|薯片|饼干|巧克力|糖果|话梅|瓜子|花生)/,                            id: "cat-snack",        name: "零食", icon: "icons/kitty/drink-snack/4_41_chips.png" },
      { kw: /(打车|出租|地铁|公交|高铁|火车|机票|加油|油费|停车|过路|滴滴|公交卡)/,        id: "cat-traffic",      name: "交通", icon: "icons/kitty/life-travel/8_32_car-mini.png" },
      { kw: /(买|购|衣服|裤|鞋|包|化妆|护肤)/,                                       id: "cat-shopping",     name: "购物", icon: "icons/kitty/office-life/10_32_handbag.png" },
      { kw: /(房租|水电|网费|物业|家居|装修)/,                                        id: "cat-home",         name: "居家", icon: "icons/kitty/life-travel/5_22_house.png" },
      { kw: /(游戏|电影|演出|唱歌|KTV|旅游|玩|拍|相机)/,                              id: "cat-entertain",    name: "娱乐", icon: "icons/kitty/life-travel/5_21_camera.png" },
      { kw: /(手机|话费|流量|宽带|电话|充值)/,                                        id: "cat-comm",         name: "通讯", icon: "icons/kitty/life-travel/5_13_telephone.png" },
      { kw: /(书|课|学|培训|文具|笔记本)/,                                            id: "cat-learn",        name: "学习", icon: "icons/kitty/life-travel/5_33_notebook.png" },
      { kw: /(药|医院|门诊|看病|牙)/,                                                id: "cat-medical",      name: "医疗", icon: "icons/kitty/office-life/10_42_soap-dispenser.png" }
    ];
    const catHit = catMap.find((c) => c.kw.test(userText));
    if (amtMatch && catHit && !prefMatch) {
      const amount = parseFloat(amtMatch[1]);
      reply.actions.push({
        type: "addTransaction",
        data: { type: "expense", amount, categoryId: catHit.id, note: userText.slice(0, 40), ts: Date.now() }
      });
      reply.text = `好～记下来了 ✨`;
      reply.cards.push({
        icon: "🌸",
        title: `已记一笔 · ${catHit.name}`,
        detail: `¥ ${amount.toFixed(2)} · ${new Date().toLocaleDateString("zh-CN")} · ${userText.slice(0, 30)}`
      });
      return reply;
    }

    // 3) 问「最大开销 / 最多花在哪 / 统计」
    if (/最大|最多|主要|什么花|总结|概况/.test(userText)) {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const monthTx = ctx.recentTx.filter((t) => t.type === "expense" && t.ts >= monthStart.getTime());
      const byCat = {};
      for (const t of monthTx) byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount;
      const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (top.length === 0) { reply.text = "本月还没有记账哦～先跟我说一笔吧 ✨"; return reply; }
      const total = top.reduce((s, [, v]) => s + v, 0);
      const lines = top.map(([cid, v], i) => {
        const cat = ctx.categories.find((c) => c.id === cid);
        return `${i + 1}. ${cat ? cat.name : cid}：¥ ${v.toFixed(2)} (${(v / total * 100).toFixed(1)}%)`;
      });
      reply.text = `这个月你一共支出 ¥ ${total.toFixed(2)}，主要花在：\n\n${lines.join("\n")}\n\n想看详细报表吗～`;
      reply.cards.push({
        icon: "📊",
        title: `本月支出概览 ¥${total.toFixed(2)}`,
        detail: lines.slice(0, 3).join(" · ")
      });
      return reply;
    }

    // 4) 兜底对话
    const prefTail = ctx.prefs.length
      ? `\n\n（我目前记得你的偏好：${ctx.prefs.slice(0, 3).map((p) => "「" + p.value + "」").join("、")}…）`
      : "";
    reply.text = `收到～告诉 Kitty 怎么记就行，比如：\n• "今天吃饭 35 元"\n• "打车花了 18"\n• "记住，我不喜欢香菜"\n• "这个月我最大开销是什么？"\n\n${prefTail}`;
    return reply;
  }

  async function applyAction(act) {
    if (act.type === "addTransaction") {
      await KLDB.addTransaction(Object.assign({}, act.data, { bookId: activeBook().id }));
      return;
    }
    if (act.type === "deleteTransaction") {
      await KLDB.deleteTransaction(act.data.id);
      return;
    }
    if (act.type === "addMemo") {
      await KLDB.addMemo(act.data);
      return;
    }
  }

  // ============================================================
  // 记账页
  // ============================================================
  function setupLedger() {
    document.querySelectorAll(".lt-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const view = tab.dataset.view;
        document.querySelectorAll(".lt-tab").forEach((t) => t.classList.toggle("active", t === tab));
        document.querySelectorAll(".lt-view").forEach((v) => v.classList.toggle("active", v.dataset.view === view));
        if (view === "chart") renderCharts();
        if (view === "budget") renderBudget();
      });
    });
    document.getElementById("btnAddTx").addEventListener("click", () => openTxModal());

    // 月份导航（报表 / 预算各自独立）
    const bindMonthNav = (prevId, nextId, getKey, setKey, rerender) => {
      document.getElementById(prevId).addEventListener("click", () => { setKey(getKey() - 1); rerender(); });
      document.getElementById(nextId).addEventListener("click", () => { setKey(getKey() + 1); rerender(); });
    };
    bindMonthNav("chartPrev", "chartNext",
      () => state.reportOffset, (v) => { state.reportOffset = v; }, renderCharts);
    bindMonthNav("budgetPrev", "budgetNext",
      () => state.budgetOffset, (v) => { state.budgetOffset = v; }, renderBudget);
  }

  function renderLedger() {
    // 顶部 summary（本月）
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const mTx = state.txs.filter((t) => t.ts >= monthStart.getTime());
    const income = mTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = mTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    document.getElementById("sumIncome").textContent = "¥ " + income.toFixed(2);
    document.getElementById("sumExpense").textContent = "¥ " + expense.toFixed(2);
    document.getElementById("sumBalance").textContent = "¥ " + (income - expense).toFixed(2);

    // 列表（按日分组）
    const list = document.getElementById("txList");
    if (state.txs.length === 0) {
      list.innerHTML = '<div class="empty-hint">还没有记账～<br>从会话页说一句话开始记录吧 ✨</div>';
      return;
    }
    const byDay = {};
    for (const t of state.txs) {
      const d = new Date(t.ts);
      const dayKey = d.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
      (byDay[dayKey] = byDay[dayKey] || []).push(t);
    }

    const html = Object.entries(byDay).map(([day, items]) => `
      <div class="tx-day-group">
        <div class="tx-day-header">${day}</div>
        ${items.map((t) => {
          if (t.type === "transfer") {
            const from = state.accounts.find((a) => a.id === t.accountFrom);
            const to = state.accounts.find((a) => a.id === t.accountTo);
            return `
            <div class="tx-item" data-id="${t.id}">
              <div class="tx-icon tx-icon-transfer">🔄</div>
              <div class="tx-body">
                <div class="tx-title">转账</div>
                <div class="tx-note">${from ? from.name : "?"} → ${to ? to.name : "?"}${t.note ? " · " + escapeHtml(t.note) : ""}</div>
              </div>
              <div class="tx-amt transfer">¥ ${t.amount.toFixed(2)}</div>
            </div>`;
          }
          const cat = state.categories.find((c) => c.id === t.categoryId);
          const sign = t.type === "income" ? "+" : "-";
          const cls = t.type === "income" ? "income" : "expense";
          return `
            <div class="tx-item" data-id="${t.id}">
              <div class="tx-icon">${cat ? `<img src="${cat.icon}" alt="${cat.name}">` : "💰"}</div>
              <div class="tx-body">
                <div class="tx-title">${escapeHtml(cat ? cat.name : "其他")}</div>
                <div class="tx-note">${escapeHtml(t.note || "")}</div>
              </div>
              <div class="tx-amt ${cls}">${sign} ¥ ${t.amount.toFixed(2)}</div>
            </div>`;
        }).join("")}
      </div>`).join("");
    list.innerHTML = html;
  }

  // ============================================================
  // 多账本（切换 / 新建 / 编辑 / 删除 / 默认）
  //  - 账本数据相互独立：交易、报表、预算、账户都跟随当前账本
  //  - 历史无 bookId 的记录自动属于默认账本 book-default
  // ============================================================
  function activeBook() {
    if (state.activeBook && state.books.some((b) => b.id === state.activeBook.id)) return state.activeBook;
    state.activeBook = KLDB.currentBook();
    return state.activeBook;
  }

  async function reloadActiveTx() {
    state.txs = await KLDB.listTransactions({ bookId: activeBook().id });
  }

  function syncActiveBook() {
    const b = activeBook();
    state.accounts = Array.isArray(b.accounts) ? b.accounts : [];
    return b;
  }

  function renderBookSwitch() {
    const ic = document.getElementById("bookSwitchIcon");
    const nm = document.getElementById("bookSwitchName");
    if (!ic || !nm) return;
    const b = activeBook();
    ic.textContent = b.icon || "🐱";
    nm.textContent = b.name;
  }

  function setupBooks() {
    document.getElementById("btnBookSwitch").addEventListener("click", openBookSheet);
    document.getElementById("btnNewBook").addEventListener("click", () => openBookForm(null));
    const sheet = document.getElementById("bookSheet");
    sheet.querySelectorAll("[data-booksheet-close]").forEach((el) => {
      el.addEventListener("click", closeBookSheet);
    });
  }

  function openBookSheet() {
    state.books = KLDB.books();
    renderBookSheet();
    const s = document.getElementById("bookSheet");
    s.classList.add("open");
    s.setAttribute("aria-hidden", "false");
  }
  function closeBookSheet() {
    const s = document.getElementById("bookSheet");
    if (!s) return;
    s.classList.remove("open");
    s.setAttribute("aria-hidden", "true");
  }

  function renderBookSheet() {
    state.books = KLDB.books();
    const body = document.getElementById("bookSheetBody");
    const cur = activeBook();
    body.innerHTML = (state.books.map((bk) => {
      const isActive = bk.id === cur.id;
      return `
      <div class="book-row ${isActive ? "active" : ""}" data-id="${escapeHtml(bk.id)}">
        <button type="button" class="book-row-main" data-switch="${escapeHtml(bk.id)}">
          <span class="book-row-icon">${bk.icon || "🐱"}</span>
          <span class="book-row-name"><span class="bk-name">${escapeHtml(bk.name)}</span>${bk.isDefault ? '<span class="bk-default-tag">默认</span>' : ""}</span>
          ${isActive ? '<span class="book-row-check">✓</span>' : ""}
        </button>
        <button type="button" class="book-row-more" data-more="${escapeHtml(bk.id)}" aria-label="管理账本">⋯</button>
      </div>`;
    }).join("") || '<div class="empty-hint small">还没有账本，先新建一个吧 ✨</div>');

    body.querySelectorAll("[data-switch]").forEach((btn) => {
      btn.addEventListener("click", () => switchBook(btn.dataset.switch));
    });
    body.querySelectorAll("[data-more]").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); openBookActions(btn.dataset.more); });
    });
  }

  function openBookActions(id) {
    const bk = state.books.find((x) => x.id === id);
    if (!bk) return;
    const isActive = bk.id === activeBook().id;
    const canDelete = !bk.isDefault && state.books.length > 1;
    const body = document.getElementById("bookSheetBody");
    body.innerHTML = `
      <button type="button" class="book-act-back" id="bookActBack">‹ 返回账本列表</button>
      <div class="book-row ${isActive ? "active" : ""}" style="pointer-events:none">
        <span class="book-row-icon">${bk.icon || "🐱"}</span>
        <span class="book-row-name"><span class="bk-name">${escapeHtml(bk.name)}</span>${bk.isDefault ? '<span class="bk-default-tag">默认</span>' : ""}</span>
      </div>
      <div class="book-act-list">
        ${!bk.isDefault ? '<button type="button" class="book-act-item" data-act="default">⭐ 设为默认账本</button>' : ""}
        <button type="button" class="book-act-item" data-act="rename">✏️ 重命名 / 换图标</button>
        ${canDelete
          ? '<button type="button" class="book-act-item danger" data-act="delete">🗑️ 删除账本（含该账本记录）</button>'
          : '<div class="book-act-item danger" style="opacity:.45">🗑️ 默认账本不可删除</div>'}
      </div>`;
    document.getElementById("bookActBack").addEventListener("click", renderBookSheet);
    const def = body.querySelector('[data-act="default"]');
    if (def) def.addEventListener("click", () => setDefaultBook(bk.id));
    body.querySelector('[data-act="rename"]').addEventListener("click", () => openBookForm(bk.id));
    const del = body.querySelector('[data-act="delete"]');
    if (del) del.addEventListener("click", () => deleteBook(bk.id));
  }

  async function switchBook(id) {
    const nb = state.books.find((b) => b.id === id);
    if (!nb) { toast("账本不存在", "error"); return; }
    state.activeBook = nb;
    KLDB.setActiveBookId(id);
    state.accounts = Array.isArray(nb.accounts) ? nb.accounts : [];
    state.txs = await KLDB.listTransactions({ bookId: id });
    renderBookSwitch();
    renderLedger();
    renderCharts();
    renderBudget();
    closeBookSheet();
    toast("已切换到「" + nb.name + "」✨", "success");
  }

  function openBookForm(bookId) {
    const isEdit = !!bookId;
    const bk = isEdit ? state.books.find((x) => x.id === bookId) : null;
    const curIcon = (bk && bk.icon) || "🐱";
    showModal({
      title: isEdit ? "编辑账本 ✏️" : "新建账本 🌸",
      bodyHtml: `
        <div class="form-group">
          <label class="form-label">账本名称</label>
          <input type="text" id="bkName" class="form-input" maxlength="12" placeholder="如：日常账本、旅行账本…" value="${escapeHtml((bk && bk.name) || "")}">
        </div>
        <div class="form-group">
          <label class="form-label">选个图标</label>
          <div class="icon-pick-emoji" id="bkIcons">
            ${BOOK_ICONS.map((ic) => `<button type="button" class="icon-cell ${ic === curIcon ? "active" : ""}" data-icon="${ic}">${ic}</button>`).join("")}
          </div>
        </div>`,
      onConfirm: async () => {
        const name = String(document.getElementById("bkName").value || "").trim();
        const sel = document.querySelector("#bkIcons .icon-cell.active");
        const icon = (sel && sel.dataset.icon) || "🐱";
        if (!name) { toast("填个账本名称哦", "error"); return false; }
        state.books = KLDB.books();
        if (!isEdit && state.books.some((x) => x.name === name)) { toast("已有同名账本，换个名字吧", "error"); return false; }
        if (isEdit) {
          const target = state.books.find((x) => x.id === bookId);
          if (!target) return false;
          target.name = name;
          target.icon = icon;
          KLDB.saveBooks(state.books);
          if (target.id === activeBook().id) { state.activeBook = target; syncActiveBook(); renderBookSwitch(); }
          toast("账本已更新 ✨", "success");
          renderBookSheet();
        } else {
          const nb = {
            id: "book-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            name, icon, isDefault: false, createdAt: Date.now(),
            accounts: KLDB.cloneDefaultAccounts()
          };
          state.books.push(nb);
          KLDB.saveBooks(state.books);
          await switchBook(nb.id);
          toast("新建账本「" + nb.name + "」✨", "success");
        }
        return true;
      }
    });
    const box = document.getElementById("bkIcons");
    box.addEventListener("click", (e) => {
      const cell = e.target.closest(".icon-cell");
      if (!cell) return;
      box.querySelectorAll(".icon-cell").forEach((c) => c.classList.toggle("active", c === cell));
    });
  }

  function setDefaultBook(id) {
    state.books = KLDB.books();
    const bk = state.books.find((x) => x.id === id);
    if (!bk || bk.isDefault) { renderBookSheet(); return; }
    for (const b of state.books) b.isDefault = (b.id === id);
    KLDB.saveBooks(state.books);
    toast("「" + bk.name + "」已成为默认账本 ✨", "success");
    renderBookSheet();
  }

  async function deleteBook(id) {
    const bk = state.books.find((x) => x.id === id);
    if (!bk) { renderBookSheet(); return; }
    if (bk.isDefault) { toast("默认账本不能删除哦", "error"); renderBookSheet(); return; }
    if (state.books.length <= 1) { toast("至少要保留一个账本", "error"); renderBookSheet(); return; }
    const list = await KLDB.listTransactions({ bookId: id });
    if (!confirm(`删除账本「${bk.name}」？\n该账本下的 ${list.length} 笔记录将一并删除，无法恢复。`)) { renderBookSheet(); return; }
    for (const t of list) await KLDB.deleteTransaction(t.id);
    KLDB.removeBudgets(id);
    state.books = state.books.filter((x) => x.id !== id);
    KLDB.saveBooks(state.books);
    if (state.activeBook && state.activeBook.id === id) {
      await switchBook(KLDB.currentBook().id); // 内部刷新视图并关闭弹层
    } else {
      closeBookSheet();
      syncActiveBook();
      renderBookSwitch();
    }
    toast("账本「" + bk.name + "」已删除", "success");
  }

  // ============================================================
  // 报表（饼图 / TOP / 热力图）+ 预算
  // ============================================================
  const CHART_COLORS = ["#FF8FB5", "#FFB6C1", "#FFA07A", "#FF69B4", "#FFC0CB", "#F4A7B9", "#E6A0D8",
    "#FFD1DC", "#FF7F50", "#DDA0DD", "#FFB7C5", "#87CEEB", "#98D8C8", "#F5DEB3", "#CBC3E3", "#FF6F91"];

  function monthRange(offset) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end, key: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"), label: d.getFullYear() + "年" + (d.getMonth() + 1) + "月" };
  }
  function monthTx(offset) {
    const { start, end } = monthRange(offset);
    return state.txs.filter((t) => t.ts >= start.getTime() && t.ts < end.getTime());
  }
  function fmtMoney(n) { return "¥ " + Number(n).toFixed(2); }

  function renderCharts() {
    const body = document.getElementById("chartBody");
    if (!body) return;
    const { label } = monthRange(state.reportOffset);
    document.getElementById("chartMonth").textContent = label;

    const mTx = monthTx(state.reportOffset);
    const expenseTx = mTx.filter((t) => t.type === "expense");
    const incomeTx = mTx.filter((t) => t.type === "income");
    const totalExp = expenseTx.reduce((s, t) => s + t.amount, 0);
    const totalInc = incomeTx.reduce((s, t) => s + t.amount, 0);

    if (mTx.length === 0) {
      body.innerHTML = '<div class="empty-hint">这个月还没有数据哦～</div>';
      return;
    }

    // ---- 分类聚合 ----
    const byCat = {};
    for (const t of expenseTx) {
      const cid = t.categoryId || "cat-else";
      byCat[cid] = (byCat[cid] || 0) + t.amount;
    }
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const catName = (cid) => { const c = state.categories.find((x) => x.id === cid); return c ? c.name : "其他"; };

    // ---- SVG 甜甜圈 ----
    const R = 60, C = 2 * Math.PI * R;
    let acc = 0;
    const arcs = entries.map(([cid, v], i) => {
      const len = (v / totalExp) * C;
      const seg = `
        <circle cx="80" cy="80" r="${R}" fill="none" stroke="${CHART_COLORS[i % CHART_COLORS.length]}" stroke-width="26"
          stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 80 80)"></circle>`;
      acc += len;
      return seg;
    }).join("");
    const donut = `
      <div class="chart-donut-wrap">
        <svg viewBox="0 0 160 160" class="chart-donut">
          <circle cx="80" cy="80" r="${R}" fill="none" stroke="#FFE3EC" stroke-width="26"></circle>
          ${arcs}
          <text x="80" y="74" text-anchor="middle" class="donut-label">本月支出</text>
          <text x="80" y="94" text-anchor="middle" class="donut-value">${totalExp.toFixed(0)}</text>
        </svg>
        <div class="chart-legend">
          ${entries.slice(0, 8).map(([cid, v], i) => `
            <div class="legend-row">
              <span class="legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
              <span class="legend-name">${escapeHtml(catName(cid))}</span>
              <span class="legend-val">${fmtMoney(v)} · ${(v / totalExp * 100).toFixed(1)}%</span>
            </div>`).join("")}
          ${entries.length > 8 ? `<div class="legend-row more">…共 ${entries.length} 个分类</div>` : ""}
        </div>
      </div>`;

    // ---- TOP5 条形 ----
    const maxV = entries[0][1] || 1;
    const topBars = entries.slice(0, 5).map(([cid, v], i) => `
      <div class="bar-row">
        <span class="bar-rank">${i + 1}</span>
        <span class="bar-name">${escapeHtml(catName(cid))}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(v / maxV * 100).toFixed(1)}%;background:${CHART_COLORS[i % CHART_COLORS.length]}"></div></div>
        <span class="bar-val">${fmtMoney(v)}</span>
      </div>`).join("");

    // ---- 日历热力图 ----
    const { start } = monthRange(state.reportOffset);
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const firstWeekday = (start.getDay() + 6) % 7; // 周一=0
    const dayMap = {};
    for (const t of expenseTx) {
      const d = new Date(t.ts).getDate();
      dayMap[d] = (dayMap[d] || 0) + t.amount;
    }
    const maxDay = Math.max(1, ...Object.values(dayMap));
    const level = (v) => v <= 0 ? 0 : Math.min(4, Math.ceil(v / maxDay * 4));
    let cells = "";
    for (let i = 0; i < firstWeekday; i++) cells += '<span class="hm-cell blank"></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const v = dayMap[d] || 0;
      cells += `<span class="hm-cell lv${level(v)}" title="${d}日支出 ${fmtMoney(v)}">${d}</span>`;
    }
    const heatmap = `
      <div class="chart-card">
        <div class="chart-card-title">📅 每日支出热力</div>
        <div class="hm-grid">${cells}</div>
        <div class="hm-scale">少 <span class="hm-cell lv1"></span><span class="hm-cell lv2"></span><span class="hm-cell lv3"></span><span class="hm-cell lv4"></span> 多</div>
      </div>`;

    body.innerHTML = `
      <div class="chart-summary">
        <div class="cs-item">收入 <b class="income">${fmtMoney(totalInc)}</b></div>
        <div class="cs-item">支出 <b class="expense">${fmtMoney(totalExp)}</b></div>
        <div class="cs-item">结余 <b>${fmtMoney(totalInc - totalExp)}</b></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-title">🍰 分类占比</div>
        ${donut}
      </div>
      <div class="chart-card">
        <div class="chart-card-title">🏆 支出 TOP5</div>
        ${topBars}
      </div>
      ${heatmap}`;
  }

  // ---------- 预算（跟随当前账本） ----------
  function loadBudgets() { return KLDB.loadBudgets(activeBook().id); }
  function saveBudgets(b) { KLDB.saveBudgets(b, activeBook().id); }

  function renderBudget() {
    const body = document.getElementById("budgetBody");
    if (!body) return;
    const { key, label, start, end } = monthRange(state.budgetOffset);
    document.getElementById("budgetMonth").textContent = label;

    const budgets = loadBudgets();
    const budget = budgets[key] || { total: 0, cats: {} };
    const mTx = monthTx(state.budgetOffset);
    const expenseTx = mTx.filter((t) => t.type === "expense");
    const totalExp = expenseTx.reduce((s, t) => s + t.amount, 0);

    // 剩余天数（仅当月有意义）
    const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));

    // ---- 总预算进度 ----
    let totalHtml;
    if (budget.total > 0) {
      const pct = Math.min(999, totalExp / budget.total * 100);
      const over = totalExp > budget.total;
      totalHtml = `
        <div class="chart-card">
          <div class="chart-card-title">🎯 本月总预算 ${fmtMoney(budget.total)}</div>
          <div class="budget-big">
            <span class="budget-spent ${over ? "over" : ""}">${fmtMoney(totalExp)}</span>
            <span class="budget-remain">${over ? "已超支 " + fmtMoney(totalExp - budget.total) + " ⚠️" : "剩余 " + fmtMoney(budget.total - totalExp)}</span>
          </div>
          <div class="prog-track"><div class="prog-fill ${over ? "over" : ""}" style="width:${Math.min(100, pct).toFixed(1)}%"></div></div>
          <div class="budget-meta">${over ? "超标 " + pct.toFixed(0) + "%" : pct.toFixed(0) + "% 已用"} · 本月还剩 ${daysLeft} 天</div>
        </div>`;
    } else {
      totalHtml = `
        <div class="chart-card">
          <div class="chart-card-title">🎯 本月总预算</div>
          <div class="empty-hint small">还没设预算，先给这个月定个小目标吧 ✨</div>
        </div>`;
    }

    // ---- 分类预算进度 ----
    const byCat = {};
    for (const t of expenseTx) byCat[t.categoryId || "cat-else"] = (byCat[t.categoryId || "cat-else"] || 0) + t.amount;
    const catBudgetEntries = Object.entries(budget.cats || {}).filter(([, v]) => v > 0);
    let catsHtml;
    if (catBudgetEntries.length === 0) {
      catsHtml = '<div class="empty-hint small">还没有分类预算。点下方按钮给「餐饮」「购物」等单独设预算 💗</div>';
    } else {
      catsHtml = catBudgetEntries.map(([cid, limit]) => {
        const spent = byCat[cid] || 0;
        const pct = Math.min(999, spent / limit * 100);
        const over = spent > limit;
        const cat = state.categories.find((c) => c.id === cid);
        return `
          <div class="bar-row">
            <span class="bar-rank">${cat ? `<img src="${cat.icon}" class="bar-cat-icon">` : "•"}</span>
            <span class="bar-name">${escapeHtml(cat ? cat.name : "其他")}</span>
            <div class="bar-track">
              <div class="bar-fill ${over ? "over" : ""}" style="width:${Math.min(100, pct).toFixed(1)}%"></div>
            </div>
            <span class="bar-val ${over ? "over-text" : ""}">${spent.toFixed(0)}/${limit}</span>
          </div>`;
      }).join("");
    }

    body.innerHTML = `
      ${totalHtml}
      <div class="chart-card">
        <div class="chart-card-title">🗂 分类预算</div>
        ${catsHtml}
      </div>
      <button class="btn-primary btn-edit-budget" id="btnEditBudget">✏️ 编辑本月预算</button>`;

    document.getElementById("btnEditBudget").addEventListener("click", () => openBudgetModal(key));
  }

  function openBudgetModal(monthKeyStr) {
    const budgets = loadBudgets();
    const budget = budgets[monthKeyStr] || { total: 0, cats: {} };
    const expCats = state.categories.filter((c) => c.type === "expense");
    showModal({
      title: "编辑预算 · " + monthKeyStr,
      bodyHtml: `
        <div class="form-group">
          <label class="form-label">本月总预算（¥）</label>
          <input type="number" id="mBudgetTotal" class="form-input" value="${budget.total || ""}" placeholder="e.g. 3000" step="1" inputmode="decimal">
        </div>
        <div class="form-group">
          <label class="form-label">分类预算（¥，不填 = 不限）</label>
          ${expCats.map((c) => `
            <div class="budget-cat-row">
              <img src="${c.icon}" class="bar-cat-icon"><span>${c.name}</span>
              <input type="number" class="form-input budget-cat-input" data-cat="${c.id}" value="${(budget.cats || {})[c.id] || ""}" placeholder="—" step="1" inputmode="decimal">
            </div>`).join("")}
        </div>`,
      onConfirm: () => {
        const total = parseFloat(document.getElementById("mBudgetTotal").value) || 0;
        const cats = {};
        document.querySelectorAll(".budget-cat-input").forEach((inp) => {
          const v = parseFloat(inp.value);
          if (v > 0) cats[inp.dataset.cat] = v;
        });
        budgets[monthKeyStr] = { total, cats };
        saveBudgets(budgets);
        renderBudget();
        toast("预算已保存 ✨", "success");
        return true;
      }
    });
  }

  function openTxModal() {
    const accOpts = state.accounts.map((a) => `<option value="${a.id}">${a.icon} ${a.name}</option>`).join("");
    showModal({
      title: "记一笔 🌸",
      bodyHtml: `
        <div id="mTxMainWrap">
          <div class="type-toggle">
            <button class="active" data-type="expense">支出</button>
            <button data-type="income">收入</button>
            <button data-type="transfer">转账</button>
          </div>
          <div class="form-group">
            <label class="form-label">金额</label>
            <input type="number" id="mTxAmt" class="form-input" placeholder="0.00" step="0.01" inputmode="decimal">
          </div>
          <div id="mTxCatWrap" class="form-group">
            <label class="form-label">分类</label>
            <div class="cat-grid" id="mTxCats"></div>
            <button type="button" class="btn-add-cat" id="mTxNewCatBtn">＋ 新增分类</button>
          </div>
          <div id="mTxAccWrap" class="form-group">
            <label class="form-label">账户</label>
            <select id="mTxAcc" class="form-select">${accOpts}</select>
          </div>
          <div id="mTxTransferWrap" class="form-group hidden">
            <label class="form-label">转出账户</label>
            <select id="mTxAccFrom" class="form-select">${accOpts}</select>
            <label class="form-label" style="margin-top:10px">转入账户</label>
            <select id="mTxAccTo" class="form-select">${accOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea id="mTxNote" class="form-textarea" placeholder="（可选）"></textarea>
          </div>
        </div>

        <!-- 新增分类（内联切换） -->
        <div id="mTxNewCatWrap" class="hidden">
          <div class="form-group">
            <label class="form-label">分类名称</label>
            <input type="text" id="mNewCatName" class="form-input" placeholder="如：宠物、健身…" maxlength="8">
          </div>
          <div class="form-group">
            <label class="form-label">选一个 Kitty 图标</label>
            <div class="icon-pick" id="mNewCatIcons"></div>
          </div>
          <div class="form-row">
            <button type="button" class="btn-secondary" id="mNewCatBack">← 返回记账</button>
            <button type="button" class="btn-primary" id="mNewCatSave">保存分类</button>
          </div>
        </div>
      `,
      onConfirm: async () => {
        const amount = parseFloat(document.getElementById("mTxAmt").value);
        const note = document.getElementById("mTxNote").value.trim();
        const type = document.querySelector(".type-toggle button.active").dataset.type;
        if (!amount || amount <= 0) { toast("请填金额", "error"); return false; }

        if (type === "transfer") {
          const from = document.getElementById("mTxAccFrom").value;
          const to = document.getElementById("mTxAccTo").value;
          if (from === to) { toast("转出和转入不能是同一个账户哦", "error"); return false; }
          await KLDB.addTransaction({ type: "transfer", amount, accountFrom: from, accountTo: to, note, bookId: activeBook().id });
        } else {
          const catActive = document.querySelector("#mTxCats .cat-cell.active");
          if (!catActive) { toast("选个分类", "error"); return false; }
          await KLDB.addTransaction({
            type, amount,
            categoryId: catActive.dataset.cat,
            accountId: document.getElementById("mTxAcc").value,
            note,
            bookId: activeBook().id
          });
        }
        await reloadActiveTx();
        renderLedger();
        renderCharts();
        renderBudget();
        toast(type === "transfer" ? "转账完成 ✨" : "已记录 ✨", "success");
        return true;
      }
    });

    // post-render 事件
    const modalEl = document.querySelector(".modal");
    const footerEl = modalEl.querySelector(".modal-footer");
    let currentTxType = "expense"; // 新增分类跟随当前类型

    // 渲染分类网格
    const renderCats = (type) => {
      const cats = state.categories.filter((c) => c.type === type);
      const wrap = document.getElementById("mTxCats");
      if (!wrap) return;
      wrap.innerHTML = cats.map((c, i) => `
        <button class="cat-cell ${i === 0 ? "active" : ""}" data-cat="${c.id}">
          <img src="${c.icon}" alt="${c.name}"><span>${c.name}</span>
        </button>`).join("");
      modalEl.querySelectorAll(".cat-cell").forEach((cell) => {
        cell.addEventListener("click", () => {
          modalEl.querySelectorAll(".cat-cell").forEach((c) => c.classList.toggle("active", c === cell));
        });
      });
    };

    // 渲染 Kitty 图标选择器
    const renderIconPicker = (selected) => {
      const box = document.getElementById("mNewCatIcons");
      box.innerHTML = KITTY_ICONS.map((p) => `
        <button type="button" class="icon-cell ${p === selected ? "active" : ""}" data-icon="${p}">
          <img src="${p}" alt="">
        </button>`).join("");
      box.querySelectorAll(".icon-cell").forEach((cell) => {
        cell.addEventListener("click", () => {
          box.querySelectorAll(".icon-cell").forEach((c) => c.classList.toggle("active", c === cell));
          box.dataset.sel = cell.dataset.icon;
        });
      });
    };

    // 在「记一笔」与「新增分类」视图间切换
    const showNewCat = (show) => {
      document.getElementById("mTxMainWrap").classList.toggle("hidden", show);
      document.getElementById("mTxNewCatWrap").classList.toggle("hidden", !show);
      footerEl.style.display = show ? "none" : "";
      if (show) {
        document.getElementById("mNewCatName").value = "";
        const box = document.getElementById("mNewCatIcons");
        box.dataset.sel = "";
        renderIconPicker(null);
      }
    };

    document.getElementById("mTxNewCatBtn").addEventListener("click", () => showNewCat(true));
    document.getElementById("mNewCatBack").addEventListener("click", () => showNewCat(false));
    document.getElementById("mNewCatSave").addEventListener("click", async () => {
      const name = document.getElementById("mNewCatName").value.trim();
      const icon = document.getElementById("mNewCatIcons").dataset.sel;
      if (!name) { toast("填个分类名哦", "error"); return; }
      if (!icon) { toast("选个图标哦", "error"); return; }
      try {
        const cat = await KLDB.addCategory({ name, type: currentTxType, icon });
        state.categories = await KLDB.allCategories();
        renderCats(currentTxType);
        modalEl.querySelectorAll(".cat-cell").forEach((c) => {
          c.classList.toggle("active", c.dataset.cat === cat.id);
        });
        showNewCat(false);
        toast("分类「" + cat.name + "」创建成功 ✨", "success");
      } catch (e) {
        toast("创建失败：" + (e.message || e), "error");
      }
    });

    renderCats("expense");

    modalEl.querySelectorAll(".type-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        modalEl.querySelectorAll(".type-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
        const t = btn.dataset.type;
        currentTxType = t === "transfer" ? "expense" : t;
        renderCats(t === "income" ? "income" : "expense");
        document.getElementById("mTxCatWrap").classList.toggle("hidden", t === "transfer");
        document.getElementById("mTxAccWrap").classList.toggle("hidden", t === "transfer");
        document.getElementById("mTxTransferWrap").classList.toggle("hidden", t !== "transfer");
      });
    });
  }

  // ============================================================
  // 备忘录 v2
  //  主列表 = 未归档未删除；归档/回收站为独立视图
  //  正文行首 "[ ] text" / "[x] text" = 待办清单（卡片上可直接勾选）
  //  支持：颜色贴纸 / 置顶 / 标签筛选 / 全文搜索 / 排序 / 复制
  // ============================================================
  function setupMemo() {
    document.getElementById("btnAddMemo").addEventListener("click", () => openMemoEditor(null));
    setupMemoEditor();
    const search = document.getElementById("memoSearch");
    search.addEventListener("input", (e) => {
      state.memoUI.q = e.target.value.trim().toLowerCase();
      renderMemo();
    });
    document.getElementById("btnMemoArchived").addEventListener("click", () => switchMemoView("archived"));
    document.getElementById("btnMemoTrash").addEventListener("click", () => switchMemoView("trash"));
    document.getElementById("btnMemoBack").addEventListener("click", () => switchMemoView("list"));
    document.getElementById("btnMemoSort").addEventListener("click", cycleMemoSort);
    document.getElementById("btnMemoClearTrash").addEventListener("click", clearMemoTrash);
    document.getElementById("memoList").addEventListener("click", onMemoListClick);
  }

  function switchMemoView(view) {
    state.memoUI.view = view;
    if (view === "list") state.memoUI.tag = null;
    renderMemo();
  }

  function cycleMemoSort() {
    const idx = MEMO_SORTS.findIndex((s) => s.key === state.memoUI.sort);
    state.memoUI.sort = MEMO_SORTS[(idx + 1) % MEMO_SORTS.length].key;
    const cur = MEMO_SORTS.find((s) => s.key === state.memoUI.sort);
    toast("排序：" + cur.label, "success");
    renderMemo();
  }

  async function refreshMemoStore() {
    state.memos = await KLDB.allMemos();
  }

  // 当前视图对应的备忘集合（回收站优先级最高）
  function memoViewBase() {
    const v = state.memoUI.view;
    return state.memos.filter((m) => v === "trash" ? !!m.trashed
      : v === "archived" ? (!!m.archived && !m.trashed)
      : (!m.trashed && !m.archived));
  }

  function memoMatches(m, q) {
    if (!q) return true;
    return (m.title || "").toLowerCase().includes(q)
      || (m.content || "").toLowerCase().includes(q)
      || (m.tags || []).some((t) => String(t || "").toLowerCase().includes(q));
  }

  function memoBg(m) { return MEMO_COLORS[m.color] || MEMO_COLORS.pink; }

  function memoTodos(m) {
    let done = 0, total = 0;
    for (const line of String(m.content || "").split("\n")) {
      const mm = line.match(MEMO_TODO_RE);
      if (!mm) continue;
      total++;
      if (mm[1].toLowerCase() === "x") done++;
    }
    return { done, total };
  }

  function renderMemo() {
    const list = document.getElementById("memoList");
    const v = state.memoUI.view;
    const q = state.memoUI.q;
    syncMemoChrome();

    let items = memoViewBase();
    if (q) items = items.filter((m) => memoMatches(m, q));
    if (v === "list" && state.memoUI.tag) items = items.filter((m) => (m.tags || []).includes(state.memoUI.tag));
    sortMemos(items);

    if (items.length === 0) {
      list.innerHTML = memoEmptyHtml();
      return;
    }
    list.innerHTML = items.map(memoCardHtml).join("");
  }

  function sortMemos(items) {
    const s = state.memoUI.sort;
    items.sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (s === "title") return String(a.title || "").localeCompare(String(b.title || ""), "zh");
      if (s === "oldest") return (a.createdAt || 0) - (b.createdAt || 0);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  // 标签筛选 chips / 归档与回收站计数 / 子头部
  function syncMemoChrome() {
    const v = state.memoUI.view;
    const archN = state.memos.filter((m) => m.archived && !m.trashed).length;
    const trashN = state.memos.filter((m) => m.trashed).length;
    badge(document.getElementById("memoArchivedCount"), archN);
    badge(document.getElementById("memoTrashCount"), trashN);
    document.getElementById("btnMemoArchived").classList.toggle("on", v === "archived");
    document.getElementById("btnMemoTrash").classList.toggle("on", v === "trash");
    document.getElementById("btnMemoSort").title = (MEMO_SORTS.find((s) => s.key === state.memoUI.sort) || MEMO_SORTS[0]).title;

    const subbar = document.getElementById("memoSubbar");
    const subhead = document.getElementById("memoSubhead");
    const inList = v === "list";
    subbar.classList.toggle("hidden", !inList);
    subhead.classList.toggle("hidden", inList);
    if (!inList) {
      document.getElementById("memoSubheadTitle").textContent = v === "archived" ? "📥 归档" : "🗑️ 回收站";
      const n = memoViewBase().length;
      document.getElementById("memoSubheadCount").textContent = n ? `${n} 条` : "";
      const clear = document.getElementById("btnMemoClearTrash");
      clear.classList.toggle("hidden", !(v === "trash" && n > 0));
    }
    if (inList) renderMemoChips();
  }

  function badge(el, n) {
    if (!el) return;
    el.textContent = n;
    el.classList.toggle("hidden", !n);
  }

  function renderMemoChips() {
    const box = document.getElementById("memoChips");
    const counts = new Map();
    for (const m of memoViewBase()) {
      for (const t of (m.tags || [])) {
        const tag = String(t || "").trim();
        if (!tag) continue;
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    const tags = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const sel = state.memoUI.tag;
    if (tags.length === 0) {
      // 还没有任何标签时给出引导，避免"看不出这个功能"
      box.innerHTML = '<span class="memo-chips-hint">🏷 尚无标签 · 编辑备忘时在「标签」框输入回车，就能按主题筛选</span>';
      return;
    }
    let html = `<button type="button" class="memo-chip ${!sel ? "on" : ""}" data-tag="">全部</button>`;
    html += tags.map(([t, c]) => `<button type="button" class="memo-chip ${sel === t ? "on" : ""}" data-tag="${escapeHtml(t)}">#${escapeHtml(t)} ${c}</button>`).join("");
    box.innerHTML = html;
    box.querySelectorAll(".memo-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const t = chip.dataset.tag || null;
        // 再次点击已选中的标签 = 取消筛选
        state.memoUI.tag = (t && t === sel) ? null : t;
        renderMemo();
        if (t && state.memoUI.tag === t) toast("已筛选：#" + t, "success");
      });
    });
  }

  // 点卡片上的 #标签 → 回到主列表并按该标签筛选
  function gotoMemoTag(tag) {
    state.memoUI.view = "list";
    state.memoUI.tag = tag || null;
    state.memoUI.q = "";
    document.getElementById("memoSearch").value = "";
    document.getElementById("memoSubbar").classList.remove("hidden");
    document.getElementById("memoSubhead").classList.add("hidden");
    renderMemo();
    toast(tag ? "已筛选：#" + tag : "已显示全部", "success");
  }

  function memoCardHtml(m) {
    const v = state.memoUI.view;
    const cls = ["memo-card"];
    if (m.pinned) cls.push("pinned");
    if (v === "archived") cls.push("archived");
    if (v === "trash") cls.push("trashed");
    const lines = String(m.content || "").split("\n");
    const todo = memoTodos(m);
    const showLines = [];
    let more = false;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const mm = lines[i].match(MEMO_TODO_RE);
      if (mm) {
        showLines.push(`<div class="memo-todo-row ${mm[1].toLowerCase() === "x" ? "done" : ""}" data-line="${i}">
          <span class="memo-todo-box">${mm[1].toLowerCase() === "x" ? "✓" : ""}</span>
          <span class="memo-todo-text">${escapeHtml(mm[2])}</span>
        </div>`);
      } else {
        showLines.push(`<div class="memo-line">${escapeHtml(lines[i])}</div>`);
      }
      if (showLines.length >= 5) { more = true; break; }
    }
    const bodyHtml = showLines.length
      ? showLines.join("") + (more ? '<div class="memo-line dim">…</div>' : "")
      : '<div class="memo-line dim">（无正文，点卡片补一句吧）</div>';

    // 卡片 meta 的 #标签可点击：点一下即按该标签筛选
    const tagsHtml = (m.tags || []).map((t) => `<span class="memo-tag memo-tag-link" data-taglink="${escapeHtml(t)}">#${escapeHtml(t)}</span>`).join("");
    const statusHtml = v === "archived"
      ? '<span class="memo-tag arch-tag">已归档</span>'
      : v === "trash"
        ? '<span class="memo-tag arch-tag">回收站</span>'
        : "";
    const progHtml = todo.total ? `<span class="memo-tag memo-progress">待办 ${todo.done}/${todo.total}</span>` : "";
    const dateStr = new Date(m.updatedAt || m.createdAt).toLocaleDateString("zh-CN");

    const tools = memoCardTools(m, v);
    return `
      <div class="${cls.join(" ")}" data-id="${m.id}" style="background:${memoBg(m)}">
        <div class="memo-card-top">
          <div class="memo-card-title">${escapeHtml(m.title || "（无标题）")}</div>
          <div class="memo-card-tools">${tools}</div>
        </div>
        <div class="memo-card-body">${bodyHtml}</div>
        <div class="memo-card-meta">
          ${statusHtml}${progHtml}${tagsHtml}
          <span class="memo-tag">${dateStr}</span>
        </div>
      </div>`;
  }

  function memoCardTools(m, v) {
    if (v === "trash") {
      return `
        <button type="button" class="memo-card-btn" data-act="restore" title="恢复">↩️</button>
        <button type="button" class="memo-card-btn" data-act="purge" title="彻底删除">🗑️</button>`;
    }
    if (v === "archived") {
      return `
        <button type="button" class="memo-card-btn" data-act="restore" title="移回列表">📤</button>
        <button type="button" class="memo-card-btn" data-act="trash" title="移到回收站">🗑️</button>`;
    }
    return `
      <button type="button" class="memo-card-btn ${m.pinned ? "on" : ""}" data-act="pin" title="置顶/取消置顶">📌</button>
      <button type="button" class="memo-card-btn" data-act="archive" title="归档">📥</button>
      <button type="button" class="memo-card-btn" data-act="trash" title="移到回收站">🗑️</button>`;
  }

  function memoEmptyHtml() {
    const v = state.memoUI.view;
    const q = state.memoUI.q;
    const base = memoViewBase().length;
    if (v === "trash") return `<div class="empty-hint">${q || base ? "没有匹配的备忘" : "回收站空空如也～<br>删除的备忘会先来这里，可随时恢复 ✨"}</div>`;
    if (v === "archived") return `<div class="empty-hint">${q || base ? "没有匹配的备忘" : "还没有归档的备忘～<br>主列表点 📥 可归档 ✨"}</div>`;
    return q ? '<div class="empty-hint">没有找到匹配的备忘～<br>换个关键词试试 🔍</div>'
      : '<div class="empty-hint">还没有备忘录～<br>记录想记住的事 ✨</div>';
  }

  function onMemoListClick(e) {
    const card = e.target.closest(".memo-card");
    if (!card) return;
    const id = card.dataset.id;
    const btn = e.target.closest(".memo-card-btn");
    if (btn) { e.stopPropagation(); runMemoAction(id, btn.dataset.act); return; }
    const tagLink = e.target.closest("[data-taglink]");
    if (tagLink) { e.stopPropagation(); gotoMemoTag(tagLink.dataset.taglink); return; }
    const row = e.target.closest(".memo-todo-row");
    if (row) { e.stopPropagation(); toggleMemoTodo(id, Number(row.dataset.line)); return; }
    if (state.memoUI.view === "list") { editMemo(id); return; }
    if (state.memoUI.view === "archived") { runMemoAction(id, "restore"); return; }
    toast("回收站里的备忘：↩️ 恢复 或 🗑️ 彻底删除", "");
  }

  async function toggleMemoTodo(id, lineIdx) {
    const m = state.memos.find((x) => String(x.id) === String(id));
    if (!m || !Number.isInteger(lineIdx)) return;
    const lines = String(m.content || "").split("\n");
    const l = lines[lineIdx];
    const mm = l && l.match(MEMO_TODO_RE);
    if (!mm) return;
    const done = mm[1].toLowerCase() === "x";
    lines[lineIdx] = (done ? "[ ] " : "[x] ") + mm[2];
    await KLDB.updateMemo(m.id, { content: lines.join("\n"), noTouch: true });
    await refreshMemoStore();
    renderMemo();
  }

  async function runMemoAction(id, act) {
    const m = state.memos.find((x) => String(x.id) === String(id));
    if (!m) return;
    try {
      if (act === "pin") {
        await KLDB.updateMemo(m.id, { pinned: !m.pinned, noTouch: true });
        toast(m.pinned ? "已取消置顶" : "已置顶 📌", "success");
      } else if (act === "archive") {
        await KLDB.updateMemo(m.id, { archived: true, trashed: false, trashedAt: null, noTouch: true });
        toast("已归档 📥", "success");
      } else if (act === "restore") {
        await KLDB.updateMemo(m.id, { archived: false, trashed: false, trashedAt: null, noTouch: true });
        toast("已恢复 ✨", "success");
      } else if (act === "trash") {
        await KLDB.updateMemo(m.id, { trashed: true, archived: false, trashedAt: Date.now(), noTouch: true });
        toast("已移到回收站", "success");
      } else if (act === "purge") {
        if (!confirm(`彻底删除「${m.title || "（无标题）"}」？此操作无法恢复。`)) return;
        await KLDB.deleteMemo(m.id);
        toast("已彻底删除", "success");
      }
    } catch (err) {
      toast("操作失败：" + (err && err.message ? err.message : err), "error");
      return;
    }
    await refreshMemoStore();
    renderMemo();
  }

  async function clearMemoTrash() {
    const n = state.memos.filter((m) => m.trashed).length;
    if (!n) return;
    if (!confirm(`清空回收站？将彻底删除 ${n} 条备忘，无法恢复。`)) return;
    for (const m of state.memos.filter((x) => x.trashed)) await KLDB.deleteMemo(m.id);
    await refreshMemoStore();
    renderMemo();
    toast("回收站已清空", "success");
  }

  // ---------- 新建 / 编辑：全屏大编辑区（对标 Apple 备忘录 / Keep） ----------
  // 当前编辑会话（id=null 表示新建）
  let memoEditing = null;

  function openMemoEditor(existing = null) {
    memoEditing = {
      id: existing ? existing.id : null,
      color: (existing && MEMO_COLORS[existing.color]) ? existing.color : "pink",
      tags: Array.isArray(existing && existing.tags) ? existing.tags.slice() : [],
      dirty: false
    };
    document.getElementById("meTitle").value = (existing && existing.title) || "";
    document.getElementById("meContent").value = (existing && existing.content) || "";
    document.getElementById("meTagInput").value = "";
    document.getElementById("meHeadTitle").textContent = existing ? "编辑备忘" : "新建备忘";
    renderMeColors();
    renderMeTags();
    updateMeCount();
    const wrap = document.getElementById("memoEditor");
    wrap.classList.add("open");
    wrap.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      const t = existing ? document.getElementById("meContent") : document.getElementById("meTitle");
      t.focus();
    }, 60);
  }

  function closeMemoEditor() {
    const wrap = document.getElementById("memoEditor");
    if (!wrap) return;
    wrap.classList.remove("open");
    wrap.setAttribute("aria-hidden", "true");
    memoEditing = null;
  }

  function renderMeColors() {
    const box = document.getElementById("meColors");
    if (!box) return;
    const cur = memoEditing ? memoEditing.color : "pink";
    box.innerHTML = Object.keys(MEMO_COLORS).map((key) => `
      <div class="memo-color-item">
        <button type="button" class="memo-color-dot ${key === cur ? "on" : ""}" data-mcolor="${key}" style="background:${MEMO_COLORS[key]}" aria-label="${MEMO_COLOR_LABELS[key]}">${key === cur ? "✓" : ""}</button>
      </div>`).join("");
  }

  function renderMeTags() {
    const row = document.getElementById("meTags");
    if (!row || !memoEditing) return;
    row.innerHTML = memoEditing.tags.map((t) => `
      <span class="me-tag-chip">#${escapeHtml(t)}<button type="button" class="me-tag-x" data-tag="${escapeHtml(t)}">✕</button></span>`).join("");
  }

  function commitMeTag() {
    const inp = document.getElementById("meTagInput");
    const raw = (inp.value || "").trim();
    if (!raw) { inp.value = ""; return; }
    const space = Math.max(0, 8 - memoEditing.tags.length);
    const adds = Array.from(new Set(raw.split(/[\s,，]+/).filter(Boolean))).slice(0, space);
    if (space === 0) { toast("最多 8 个标签哦", "error"); inp.value = ""; return; }
    if (adds.length) {
      memoEditing.tags = memoEditing.tags.concat(adds);
      memoEditing.dirty = true;
      inp.value = "";
      renderMeTags();
      inp.focus();
    }
  }

  function updateMeCount() {
    const el = document.getElementById("meCount");
    const ta = document.getElementById("meContent");
    if (!el || !ta) return;
    const content = ta.value;
    const chars = content.replace(/\s/g, "").length;
    const todo = memoTodos({ content });
    el.textContent = todo.total
      ? `${chars} 字 · 待办 ${todo.done}/${todo.total}`
      : `${chars} 字`;
  }

  function saveMemoEditor() {
    if (!memoEditing) return;
    const title = document.getElementById("meTitle").value.trim();
    let content = document.getElementById("meContent").value;
    content = content.replace(/\s+$/, "");
    if (!title && !content) { toast("标题或内容总得填一个吧", "error"); return; }
    const color = memoEditing.color;
    const tags = memoEditing.tags;
    (async () => {
      try {
        if (memoEditing.id) {
          await KLDB.updateMemo(memoEditing.id, { title, content, tags, color });
        } else {
          await KLDB.addMemo({ title, content, tags, color });
        }
        const wasNew = !memoEditing.id;
        closeMemoEditor();
        await refreshMemoStore();
        renderMemo();
        toast(wasNew ? "已新建 ✨" : "已保存 ✨", "success");
      } catch (e) {
        toast("保存失败：" + ((e && e.message) || e), "error");
      }
    })();
  }

  // 全屏编辑器事件（元素常驻，启动时绑定一次）
  function setupMemoEditor() {
    const ed = document.getElementById("memoEditor");
    if (!ed) return;
    document.getElementById("meCancel").addEventListener("click", () => {
      if (memoEditing && memoEditing.dirty) {
        if (!confirm("还有未保存的修改，确定放弃吗？")) return;
      }
      closeMemoEditor();
    });
    document.getElementById("meSave").addEventListener("click", saveMemoEditor);
    document.getElementById("meTitle").addEventListener("input", () => { if (memoEditing) memoEditing.dirty = true; });
    document.getElementById("meContent").addEventListener("input", () => {
      if (!memoEditing) return;
      memoEditing.dirty = true;
      updateMeCount();
    });
    // 待办插入（光标处）
    document.getElementById("meAddTodo").addEventListener("click", () => {
      const ta = document.getElementById("meContent");
      const add = "[ ] ";
      const v = ta.value;
      const idx = ta.selectionStart != null ? ta.selectionStart : v.length;
      ta.value = v.slice(0, idx) + add + v.slice(idx);
      memoEditing.dirty = true;
      updateMeCount();
      ta.focus();
      const pos = idx + add.length;
      try { ta.setSelectionRange(pos, pos); } catch (_) { /* iOS */ }
    });
    // 复制
    document.getElementById("meCopy").addEventListener("click", () => {
      const title = document.getElementById("meTitle").value.trim();
      const content = document.getElementById("meContent").value;
      const txt = ((title || "") + "\n" + content).trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => toast("已复制 📋", "success")).catch(() => toast("复制失败", "error"));
      } else {
        toast("当前浏览器不支持复制", "error");
      }
    });
    // 颜色
    document.getElementById("meColors").addEventListener("click", (e) => {
      const dot = e.target.closest(".memo-color-dot");
      if (!dot) return;
      if (!memoEditing) return;
      memoEditing.color = dot.dataset.mcolor;
      memoEditing.dirty = true;
      renderMeColors();
    });
    // 标签：常显输入框，回车/失焦提交
    const tagInput = document.getElementById("meTagInput");
    tagInput.addEventListener("click", () => { if (memoEditing) tagInput.focus(); });
    tagInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commitMeTag(); }
      if (e.key === "Escape") { tagInput.value = ""; tagInput.blur(); }
    });
    tagInput.addEventListener("blur", () => commitMeTag());
    // 删除标签 chip
    document.getElementById("meTags").addEventListener("click", (e) => {
      const x = e.target.closest(".me-tag-x");
      if (!x || !memoEditing) return;
      memoEditing.tags = memoEditing.tags.filter((t) => t !== x.dataset.tag);
      memoEditing.dirty = true;
      renderMeTags();
    });
  }

  function editMemo(id) {
    const m = state.memos.find((x) => String(x.id) === String(id));
    if (m) openMemoEditor(m);
  }

  // ============================================================
  // 偏好管理
  // ============================================================
  function renderPrefs() {
    const list = document.getElementById("prefList");
    const prefs = state.prefs.filter((p) => !p.key.startsWith("system."));
    if (prefs.length === 0) {
      list.innerHTML = '<div class="empty-hint small">还没有偏好。<br>试着说「记住，我不喜欢吃香菜」✨</div>';
      return;
    }
    list.innerHTML = prefs.map((p) => `
      <div class="pref-item" data-id="${p.id}">
        <div class="pref-body">
          <div class="pref-key">${escapeHtml(p.key)}</div>
          <div class="pref-value">${escapeHtml(p.value)}</div>
          <div class="pref-source">来源：${escapeHtml(p.source || "manual")} · ${new Date(p.ts).toLocaleString("zh-CN")}</div>
        </div>
        <div class="pref-actions">
          <button data-act="edit" title="编辑">✏️</button>
          <button data-act="del" title="删除">🗑️</button>
        </div>
      </div>`).join("");
    list.querySelectorAll(".pref-item").forEach((item) => {
      const id = item.dataset.id;
      item.querySelector('[data-act="edit"]').addEventListener("click", () => editPref(id));
      item.querySelector('[data-act="del"]').addEventListener("click", async () => {
        if (!confirm("确定删除这条偏好吗？")) return;
        await KLDB.deletePreference(id);
        state.prefs = await KLDB.allPreferences();
        renderPrefs();
        renderPrefsCount();
        toast("已删除", "success");
      });
    });
  }

  function renderPrefsCount() {
    const n = state.prefs.filter((p) => !p.key.startsWith("system.")).length;
    const el = document.getElementById("memCount");
    if (n > 0) { el.textContent = n; el.classList.remove("hidden"); }
    else el.classList.add("hidden");
  }

  function renderPrefNotice(msg, prefs) {
    const list = document.getElementById("chatList");
    const note = document.createElement("div");
    note.className = "msg-system";
    note.innerHTML = `🧠 已记住：${prefs.map((p) => "<b>" + escapeHtml(p.value) + "</b>").join("、")}`;
    list.appendChild(note);
    list.scrollTop = list.scrollHeight;
  }

  function openPrefModal() {
    showModal({
      title: "新增偏好",
      bodyHtml: `
        <div class="form-group">
          <label class="form-label">字段名</label>
          <input type="text" id="mPrefKey" class="form-input" placeholder="e.g. 饮食偏好">
        </div>
        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea id="mPrefVal" class="form-textarea" placeholder="e.g. 不喜欢吃香菜"></textarea>
        </div>
      `,
      onConfirm: async () => {
        const key = document.getElementById("mPrefKey").value.trim();
        const value = document.getElementById("mPrefVal").value.trim();
        if (!key || !value) { toast("字段名和内容都得填", "error"); return false; }
        await KLDB.addPreference({ key, value, source: "manual" });
        state.prefs = await KLDB.allPreferences();
        renderPrefs();
        renderPrefsCount();
        toast("已添加 ✨", "success");
        return true;
      }
    });
  }

  function editPref(id) {
    const p = state.prefs.find((x) => String(x.id) === String(id));
    if (!p) return;
    showModal({
      title: "编辑偏好",
      bodyHtml: `
        <div class="form-group">
          <label class="form-label">字段名</label>
          <input type="text" id="mPrefKey" class="form-input" value="${escapeHtml(p.key)}">
        </div>
        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea id="mPrefVal" class="form-textarea">${escapeHtml(p.value)}</textarea>
        </div>
      `,
      onConfirm: async () => {
        const key = document.getElementById("mPrefKey").value.trim();
        const value = document.getElementById("mPrefVal").value.trim();
        if (!key || !value) return false;
        await KLDB.updatePreference(id, { key, value });
        state.prefs = await KLDB.allPreferences();
        renderPrefs();
        renderPrefsCount();
        return true;
      }
    });
  }

  // ============================================================
  // 数据管理
  // ============================================================
  async function exportJSON() {
    // 导出全部账本（含各自账户与预算）+ 全量交易
    const data = {
      exportedAt: new Date().toISOString(),
      version: 2,
      books: state.books.map((b) => ({
        id: b.id, name: b.name, icon: b.icon || "🐱",
        isDefault: !!b.isDefault, createdAt: b.createdAt,
        accounts: b.accounts || [],
        budgets: KLDB.loadBudgets(b.id)
      })),
      transactions: await KLDB.listTransactions({}),
      memos: state.memos,
      preferences: state.prefs.filter((p) => !p.key.startsWith("system.")),
      categories: state.categories
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kitty-ledger-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("已导出 ✨", "success");
  }
  function importJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const txCount = Array.isArray(data.transactions) ? data.transactions.length : 0;
        if (!confirm(`将导入 ${data.books?.length || 0} 个账本、${txCount} 笔交易、${data.memos?.length || 0} 条备忘（合并，不去重）。继续？`)) return;

        // 1) 账本（含账户）+ 各账本预算
        state.books = KLDB.books();
        if (Array.isArray(data.books) && data.books.length) {
          for (const b of data.books) {
            const exist = state.books.find((x) => x.id === b.id);
            if (exist) {
              exist.name = b.name || exist.name;
              exist.icon = b.icon || exist.icon;
              if (Array.isArray(b.accounts) && b.accounts.length) exist.accounts = b.accounts;
            } else {
              state.books.push({
                id: b.id, name: b.name || "导入账本", icon: b.icon || "🐱",
                isDefault: false, createdAt: b.createdAt || Date.now(),
                accounts: Array.isArray(b.accounts) && b.accounts.length ? b.accounts : KLDB.cloneDefaultAccounts()
              });
            }
            if (b.budgets && typeof b.budgets === "object") KLDB.saveBudgets(b.budgets, b.id);
          }
          if (!state.books.some((x) => x.isDefault)) state.books[0].isDefault = true;
          KLDB.saveBooks(state.books);
        } else if (data.budgets && typeof data.budgets === "object") {
          // v1 备份：旧预算并入默认账本
          KLDB.saveBudgets(data.budgets, KLDB.DEFAULT_BOOK_ID);
        }

        // 2) 交易：v1 备份无 bookId → 落默认账本；缺失账本的交易也归默认账本
        const validIds = new Set(state.books.map((b) => b.id));
        if (Array.isArray(data.transactions)) for (const t of data.transactions) {
          const { id, bookId, ...rest } = t;
          const targetBook = (bookId && validIds.has(bookId)) ? bookId : KLDB.DEFAULT_BOOK_ID;
          await KLDB.addTransaction(Object.assign({}, rest, { bookId: targetBook }));
        }
        if (Array.isArray(data.memos)) for (const m of data.memos) await KLDB.addMemo(m);
        if (Array.isArray(data.preferences)) for (const p of data.preferences) {
          await KLDB.addPreference({ key: p.key, value: p.value, source: p.source || "import" });
        }
        state.books = KLDB.books();
        await reloadActiveTx();
        state.memos = await KLDB.allMemos();
        state.prefs = await KLDB.allPreferences();
        syncActiveBook();
        state.memoUI = { view: "list", q: "", tag: null, sort: "updated" };
        document.getElementById("memoSearch").value = "";
        renderAll();
        renderBookSwitch();
        toast("已导入 ✨", "success");
      } catch (err) {
        toast("导入失败：" + err.message, "error");
      }
    };
    input.click();
  }
  async function clearAllData() {
    if (!confirm("⚠️ 这会清空所有记账、备忘录、偏好、账本与预算。确定吗？")) return;
    await KLDB.clear(KLDB.STORE.TX);
    await KLDB.clear(KLDB.STORE.MEMO);
    await KLDB.clear(KLDB.STORE.PREF);
    // 移除账本 / 活动账本 / 全部预算 / 旧账户存储 → 重新 init 出全新默认账本
    for (const key of Object.keys(localStorage)) {
      if (key === "kitty_books" || key === "kitty_active_book" || key === "kitty_accounts" || key.startsWith("kitty_budgets")) {
        localStorage.removeItem(key);
      }
    }
    await KLDB.init();
    state.books = KLDB.books();
    state.activeBook = KLDB.currentBook();
    KLDB.setActiveBookId(state.activeBook.id);
    state.prefs = await KLDB.allPreferences();
    await reloadActiveTx();
    syncActiveBook();
    state.memoUI = { view: "list", q: "", tag: null, sort: "updated" };
    document.getElementById("memoSearch").value = "";
    renderAll();
    renderBookSwitch();
    toast("已清空", "success");
  }

  // ============================================================
  // 渲染助手
  // ============================================================
  function renderAll() {
    renderBookSwitch();
    renderLedger();
    renderCharts();
    renderBudget();
    renderMemo();
    renderPrefsCount();
  }

  function renderChatHistory() {
    const list = document.getElementById("chatList");
    // 清掉占位欢迎（第一条预设）
    const first = list.querySelector(".msg-bot");
    const welcome = first ? first.outerHTML : "";

    state.chatHistory.forEach((m) => {
      if (m.role === "tool") return; // 跳过工具消息
      renderMessage({
        role: m.role,
        content: m.content || "",
        toolCards: m.toolCalls,
        ts: m.ts,
        append: true
      });
    });
    list.scrollTop = list.scrollHeight;
    // 如果没有历史消息，保留欢迎语
    if (state.chatHistory.length === 0 && welcome) {
      list.innerHTML = welcome;
    }
  }

  function renderMessage(m, append = false) {
    const list = document.getElementById("chatList");
    // 清掉静态欢迎占位（第一个未被标记为 live 的消息）
    const placeholder = list.querySelector(".chat-msg:not([data-live])");
    if (placeholder) placeholder.remove();

    const div = document.createElement("div");
    div.className = "chat-msg msg-" + m.role;
    div.dataset.live = "1";
    const avatarHtml = `<img class="msg-avatar-img" src="${m.role === "user" ? AVATAR_USER : AVATAR_AI}" alt="">`;
    const toolHtml = (m.toolCards || []).map((c) => `
      <div class="tool-card">
        <div class="tool-card-icon">${c.icon || "✨"}</div>
        <div class="tool-card-body">
          <div class="tool-card-title">${escapeHtml(c.title || "")}</div>
          <div class="tool-card-detail">${escapeHtml(c.detail || "")}</div>
        </div>
      </div>`).join("");

    div.innerHTML = `
      <div class="msg-avatar">${avatarHtml}</div>
      <div class="msg-bubble">
        <div class="msg-text">${escapeHtml(m.content || "")}</div>
        ${toolHtml}
        <div class="msg-meta">${new Date(m.ts || Date.now()).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</div>
      </div>`;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  }

  // 「正在输入」气泡
  function showTyping() {
    const list = document.getElementById("chatList");
    const placeholder = list.querySelector(".chat-msg:not([data-live])");
    if (placeholder) placeholder.remove();
    const div = document.createElement("div");
    div.className = "chat-msg msg-bot msg-typing";
    div.dataset.live = "1";
    div.innerHTML = `
      <div class="msg-avatar"><img class="msg-avatar-img" src="${AVATAR_AI}" alt=""></div>
      <div class="msg-bubble">
        <div class="msg-text typing-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
      </div>`;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
    return div;
  }
  function removeTyping(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // ============================================================
  // AI 设置（模式 / 模型 / API Key / 测试连接）
  // ============================================================
  function setupAISettings() {
    document.getElementById("btnAI").addEventListener("click", () => openAISettingsModal());
  }

  function openAISettingsModal() {
    const cfg = loadAIConfig();
    showModal({
      title: "⚙️ AI 设置",
      bodyHtml: `
        <div class="form-group">
          <label class="form-label">AI 模式</label>
          <select id="mAiMode" class="form-select">
            <option value="mock">本地模式（离线 · 关键词匹配）</option>
            <option value="deepseek">DeepSeek 大模型（真 AI，推荐）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">模型</label>
          <select id="mAiModel" class="form-select">
            <option value="deepseek-v4-flash">deepseek-v4-flash（快 · 日常记账推荐）</option>
            <option value="deepseek-v4-pro">deepseek-v4-pro（强 · 复杂分析推荐）</option>
            <option value="deepseek-v4-flash-vision-exp">deepseek-v4-flash-vision-exp（视觉实验版）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">DeepSeek API Key</label>
          <input type="password" id="mAiKey" class="form-input" placeholder="sk-..." value="${escapeHtml(cfg.apiKey || "")}" autocomplete="off">
          <p class="hint small">Key 只存在手机本地浏览器（localStorage），经本机 server 代理转发给 DeepSeek，不落服务端、不上传别处。</p>
        </div>
        <div class="form-group">
          <button class="btn-secondary" id="mAiTest" style="width:100%">🔗 测试连接</button>
        </div>`,
      onConfirm: async () => {
        const mode = document.getElementById("mAiMode").value;
        const model = document.getElementById("mAiModel").value;
        const apiKey = document.getElementById("mAiKey").value.trim();
        if (mode === "deepseek" && !apiKey) {
          toast("DeepSeek 模式需要填 API Key", "error");
          return false;
        }
        saveAIConfig({ mode, model, apiKey });
        toast(mode === "deepseek" ? "已切换到 DeepSeek，Kitty 满血复活 🎀" : "已切换到本地模式", "success");
        return true;
      }
    });

    // 回填当前配置
    document.getElementById("mAiMode").value = cfg.mode || (cfg.apiKey ? "deepseek" : "mock");
    document.getElementById("mAiModel").value = cfg.model || "deepseek-v4-flash";

    // 测试连接
    document.getElementById("mAiTest").addEventListener("click", async () => {
      const btn = document.getElementById("mAiTest");
      const apiKey = document.getElementById("mAiKey").value.trim();
      const model = document.getElementById("mAiModel").value;
      if (!apiKey) { toast("先填 API Key 再测试", "error"); return; }
      btn.disabled = true;
      btn.textContent = "测试中…";
      try {
        await KLAI.testConnection({ apiKey, model });
        toast("连接成功 ✨ 可以放心切到 DeepSeek 模式", "success");
      } catch (e) {
        toast("连接失败：" + e.message.slice(0, 80), "error");
      } finally {
        btn.disabled = false;
        btn.textContent = "🔗 测试连接";
      }
    });
  }

  // ============================================================
  // 通用：Modal
  // ============================================================
  function showModal({ title, bodyHtml, onConfirm, extraBtn }) {
    let modal = document.querySelector(".modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal";
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="modal-panel">
        <div class="modal-header">
          <h2>${escapeHtml(title)}</h2>
          <button class="btn-close" data-modal-close>✕</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer">
          ${extraBtn ? `<button class="btn-secondary danger" data-extra>${extraBtn.label}</button>` : ""}
          <button class="btn-secondary" data-modal-close>取消</button>
          <button class="btn-primary" data-modal-confirm>确定</button>
        </div>
      </div>`;
    modal.classList.add("open");

    modal.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", () => modal.classList.remove("open")));
    modal.querySelector("[data-modal-confirm]").addEventListener("click", async () => {
      try {
        const ok = await onConfirm();
        if (ok !== false) modal.classList.remove("open");
      } catch (e) {
        console.error("[modal:confirm]", e);
        toast("保存失败：" + ((e && e.message) || e), "error");
      }
    });
    if (extraBtn) {
      modal.querySelector("[data-extra]").addEventListener("click", async () => {
        try {
          const ok = await extraBtn.onClick();
          if (ok !== false) modal.classList.remove("open");
        } catch (e) {
          console.error("[modal:extra]", e);
          toast("操作失败：" + ((e && e.message) || e), "error");
        }
      });
    }
  }

  // ============================================================
  // 通用：Toast
  // ============================================================
  let _toastTimer;
  function toast(msg, type = "") {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.className = "toast show " + type;
    el.textContent = msg;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  // ============================================================
  // 工具
  // ============================================================
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ============================================================
  // 启动
  // ============================================================
  document.addEventListener("DOMContentLoaded", boot);

  // 暴露调试
  app.KLDebug = { state };
})(window);
