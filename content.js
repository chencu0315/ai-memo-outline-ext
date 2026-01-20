// content.js
// Memo Outline Navigator (Megi-like) for https://a.memofun.net/* (including /c/<uuid>)
// 说明：
// 1) 强烈建议你在站点消息节点上加 data-*（见 SELECTORS）以保证稳定。
// 2) 如果你不方便改站点，就把 SELECTORS.userMessage / messageItem 改成你页面真实选择器即可。
// 3) 已支持 SPA 路由切换：/c/xxx 切到 /c/yyy 会自动重置并重新扫描。

(() => {
  // =========================
  // Config (no magic numbers)
  // =========================
  const CONFIG = {
    // Panel
    defaultPanelWidthPx: 320,
    minPanelWidthPx: 240,
    maxPanelWidthPx: 520,
    panelZIndex: 2147483647,

    // Behavior
    scrollBehavior: "smooth",
    maxTitleLength: 72,

    // Performance
    scanDebounceMs: 140,
    activeUpdateDebounceMs: 90,
    mutationDebounceMs: 160,

    // UI details
    resizeHandleWidthPx: 10,
    headerHeightPx: 44,
    borderWidthPx: 1,
    radiusPx: 12,
    gapPx: 8,
    paddingPx: 12,
    itemPaddingPx: 10,

    // Filtering / Rendering
    emptyText: "No questions found.",
    panelTitle: "Outline",
    searchPlaceholder: "Search questions…",
    toggleButtonText: "Outline",
  };

  /**
   * 推荐你在站点消息节点上加这些属性：
   * - 每条消息外层：data-chat-item="1"
   * - 角色：data-role="user" / "assistant"
   * - 消息 id：data-msg-id="uuid-or-increasing-id"
   * - 可选：用户消息标题：data-outline-title="xxx"
   */
  const SELECTORS = {
    messageItem: '[data-chat-item="1"]',
    userMessage: '[data-chat-item="1"][data-role="user"]',

    // Attributes
    messageIdAttr: "data-msg-id",
    outlineTitleAttr: "data-outline-title",

    // 如果你的消息列表有一个稳定容器，可填这里（否则默认观察 document.body）
    // e.g. chatContainer: '[data-chat-container="1"]'
    chatContainer: "",
  };

  // ==================================
  // Utilities
  // ==================================
  const clampText = (text, maxLen) => {
    const normalized = String(text || "").replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLen) return normalized;
    const ellipsis = "…";
    const sliceLen = Math.max(0, maxLen - ellipsis.length);
    return normalized.slice(0, sliceLen) + ellipsis;
  };

  const debounce = (fn, waitMs) => {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), waitMs);
    };
  };

  const safeQueryAll = (selector) => {
    if (!selector) return [];
    try {
      return Array.from(document.querySelectorAll(selector));
    } catch {
      return [];
    }
  };

  const getScrollTopDist = (el) => {
    const rect = el.getBoundingClientRect();
    return rect.top;
  };

  const isInViewport = (el) => {
    const rect = el.getBoundingClientRect();
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewWidth = window.innerWidth || document.documentElement.clientWidth;
    const verticallyVisible = rect.bottom > 0 && rect.top < viewHeight;
    const horizontallyVisible = rect.right > 0 && rect.left < viewWidth;
    return verticallyVisible && horizontallyVisible;
  };

  // ==================================
  // UI (Shadow DOM + minimal, Megi-ish)
  // ==================================
  const createPanel = () => {
    // Host
    const host = document.createElement("div");
    host.id = "memo-outline-host";
    host.style.position = "fixed";
    host.style.top = "0";
    host.style.right = "0";
    host.style.height = "100vh";
    host.style.width = `${CONFIG.defaultPanelWidthPx}px`;
    host.style.zIndex = String(CONFIG.panelZIndex);

    // Shadow root
    const shadow = host.attachShadow({ mode: "open" });

    // CSS variables so numbers are centralized
    const style = document.createElement("style");
    style.textContent = `
      :host {
        --w: ${CONFIG.defaultPanelWidthPx}px;
        --minw: ${CONFIG.minPanelWidthPx}px;
        --maxw: ${CONFIG.maxPanelWidthPx}px;
        --border: ${CONFIG.borderWidthPx}px;
        --radius: ${CONFIG.radiusPx}px;
        --gap: ${CONFIG.gapPx}px;
        --pad: ${CONFIG.paddingPx}px;
        --itempad: ${CONFIG.itemPaddingPx}px;
        --headerh: ${CONFIG.headerHeightPx}px;
        --resizew: ${CONFIG.resizeHandleWidthPx}px;

        all: initial;
      }

      .panel {
        box-sizing: border-box;
        height: 100vh;
        width: 100%;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
        background: rgba(20, 20, 20, 0.92);
        color: #fff;
        border-left: var(--border) solid rgba(255,255,255,0.12);
        backdrop-filter: blur(10px);
        display: flex;
        flex-direction: column;
        position: relative;
      }

      .header {
        box-sizing: border-box;
        height: var(--headerh);
        padding: 0 var(--pad);
        display: flex;
        align-items: center;
        gap: var(--gap);
        border-bottom: var(--border) solid rgba(255,255,255,0.10);
      }

      .title {
        font-size: 13px;
        opacity: 0.9;
        flex: 1;
        user-select: none;
      }

      .btn {
        box-sizing: border-box;
        border: var(--border) solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.08);
        color: #fff;
        border-radius: calc(var(--radius) - 2px);
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
      }
      .btn:hover { background: rgba(255,255,255,0.12); }

      .searchWrap {
        box-sizing: border-box;
        padding: var(--pad);
        padding-top: calc(var(--pad) - 2px);
        border-bottom: var(--border) solid rgba(255,255,255,0.08);
      }

      .search {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 12px;
        border: none;
        outline: none;
        background: rgba(255,255,255,0.08);
        color: #fff;
        border-radius: var(--radius);
        font-size: 13px;
      }

      .list {
        box-sizing: border-box;
        padding: var(--pad);
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
      }

      .item {
        cursor: pointer;
        padding: var(--itempad);
        border-radius: var(--radius);
        background: rgba(255,255,255,0.06);
        border: var(--border) solid rgba(255,255,255,0.06);
        font-size: 13px;
        line-height: 1.25;
      }
      .item:hover { background: rgba(255,255,255,0.10); }
      .item.active {
        background: rgba(255,255,255,0.16);
        border-color: rgba(255,255,255,0.18);
      }

      .meta {
        margin-top: 6px;
        font-size: 11px;
        opacity: 0.65;
      }

      .empty {
        opacity: 0.7;
        padding: 12px;
        font-size: 13px;
      }

      .resizeHandle {
        position: absolute;
        top: 0;
        left: calc(var(--resizew) * -1);
        width: var(--resizew);
        height: 100%;
        cursor: ew-resize;
      }

      .collapsed {
        display: none !important;
      }

      /* Floating toggle (outside panel) */
      .floatingToggle {
        position: fixed;
        right: 12px;
        bottom: 12px;
        z-index: ${CONFIG.panelZIndex};
        border: ${CONFIG.borderWidthPx}px solid rgba(255,255,255,0.16);
        background: rgba(20,20,20,0.78);
        color: #fff;
        border-radius: ${CONFIG.radiusPx}px;
        padding: 10px 12px;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
        backdrop-filter: blur(10px);
      }
      .floatingToggle:hover { background: rgba(20,20,20,0.88); }
    `;
    shadow.appendChild(style);

    // Panel DOM
    const panel = document.createElement("div");
    panel.className = "panel";

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resizeHandle";

    const header = document.createElement("div");
    header.className = "header";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = CONFIG.panelTitle;

    const collapseBtn = document.createElement("button");
    collapseBtn.className = "btn";
    collapseBtn.type = "button";
    collapseBtn.textContent = "Hide";

    header.appendChild(title);
    header.appendChild(collapseBtn);

    const searchWrap = document.createElement("div");
    searchWrap.className = "searchWrap";

    const search = document.createElement("input");
    search.className = "search";
    search.placeholder = CONFIG.searchPlaceholder;

    searchWrap.appendChild(search);

    const list = document.createElement("div");
    list.className = "list";

    panel.appendChild(resizeHandle);
    panel.appendChild(header);
    panel.appendChild(searchWrap);
    panel.appendChild(list);

    shadow.appendChild(panel);

    // Floating toggle in main DOM (not shadow)
    const floatingToggle = document.createElement("div");
    floatingToggle.className = "floatingToggle";
    floatingToggle.textContent = CONFIG.toggleButtonText;
    floatingToggle.style.display = "none";

    return {
      host,
      shadow,
      panel,
      list,
      search,
      collapseBtn,
      resizeHandle,
      floatingToggle,
    };
  };

  const ui = createPanel();

  // Mount UI
  document.documentElement.appendChild(ui.host);
  document.documentElement.appendChild(ui.floatingToggle);

  // ==================================
  // State
  // ==================================
  let items = []; // { id, title, el, index }
  let activeId = "";
  let observer = null;
  let lastUrl = location.href;

  // Persist width/collapsed in storage (best-effort)
  const storageKey = "memo_outline_settings_v1";
  const loadSettings = async () => {
    try {
      const raw = await chrome.storage.local.get([storageKey]);
      return raw && raw[storageKey] ? raw[storageKey] : null;
    } catch {
      return null;
    }
  };
  const saveSettings = async (settings) => {
    try {
      await chrome.storage.local.set({ [storageKey]: settings });
    } catch {
      // ignore
    }
  };

  const applyWidth = (widthPx) => {
    const w = Math.min(CONFIG.maxPanelWidthPx, Math.max(CONFIG.minPanelWidthPx, widthPx));
    ui.host.style.width = `${w}px`;
    return w;
  };

  const setCollapsed = (collapsed) => {
    if (collapsed) {
      ui.host.style.display = "none";
      ui.floatingToggle.style.display = "block";
    } else {
      ui.host.style.display = "block";
      ui.floatingToggle.style.display = "none";
    }
  };

  // ==================================
  // Core logic: scan & render
  // ==================================
  const getUserMessageTitle = (el) => {
    const explicit = el.getAttribute(SELECTORS.outlineTitleAttr);
    if (explicit) return clampText(explicit, CONFIG.maxTitleLength);

    const raw = el.innerText || el.textContent || "";
    return clampText(raw, CONFIG.maxTitleLength);
  };

  const resolveUserMessageNodes = () => {
    const nodes = safeQueryAll(SELECTORS.userMessage);
    return nodes;
  };

  const computeItemId = (el, index) => {
    const attrId = el.getAttribute(SELECTORS.messageIdAttr);
    if (attrId) return attrId;
    // fallback: stable-ish id based on index
    return `idx-${index}`;
  };

  const renderList = () => {
    const q = (ui.search.value || "").trim().toLowerCase();
    ui.list.innerHTML = "";

    const filtered = q
      ? items.filter((x) => (x.title || "").toLowerCase().includes(q))
      : items;

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = CONFIG.emptyText;
      ui.list.appendChild(empty);
      return;
    }

    filtered.forEach((x) => {
      const div = document.createElement("div");
      div.className = "item";
      div.dataset.id = x.id;

      const title = document.createElement("div");
      title.textContent = x.title || "(empty)";

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `#${x.index + 1}`;

      div.appendChild(title);
      div.appendChild(meta);

      div.addEventListener("click", () => {
        // If your site has a dedicated scroll API, you can call it here:
        // window.scrollToMessage?.(x.id);

        x.el.scrollIntoView({ behavior: CONFIG.scrollBehavior, block: "start" });
        setActive(x.id);
      });

      ui.list.appendChild(div);
    });

    setActive(activeId);
  };

  const setActive = (id) => {
    activeId = id || "";
    const nodes = ui.shadow.querySelectorAll(".item");
    nodes.forEach((n) => {
      n.classList.toggle("active", n.dataset.id === activeId);
    });
  };

  const scanMessages = () => {
    const nodes = resolveUserMessageNodes();
    const next = nodes.map((el, index) => {
      return {
        id: computeItemId(el, index),
        title: getUserMessageTitle(el),
        el,
        index,
      };
    });

    items = next;

    // Keep activeId if still exists
    const stillExists = activeId && items.some((x) => x.id === activeId);
    if (!stillExists) activeId = items.length ? items[items.length - 1].id : "";

    renderList();
    updateActiveByScroll();
  };

  const updateActiveByScroll = () => {
    if (!items.length) return;

    // Strategy:
    // - Prefer the nearest visible user message to the top of viewport
    // - Fallback to nearest by distance
    const topReference = 0;
    let best = null;
    let bestDist = Infinity;

    for (const x of items) {
      const dist = Math.abs(getScrollTopDist(x.el) - topReference);
      const visibleBoost = isInViewport(x.el) ? 0 : 1; // visible preferred
      const score = dist + visibleBoost * (window.innerHeight || 0);

      if (score < bestDist) {
        best = x;
        bestDist = score;
      }
    }

    if (best) setActive(best.id);
  };

  const debouncedScan = debounce(scanMessages, CONFIG.scanDebounceMs);
  const debouncedActive = debounce(updateActiveByScroll, CONFIG.activeUpdateDebounceMs);
  const debouncedMutation = debounce(() => debouncedScan(), CONFIG.mutationDebounceMs);

  // ==================================
  // Mutation observer
  // ==================================
  const disconnectObserver = () => {
    if (observer) {
      try {
        observer.disconnect();
      } catch {
        // ignore
      }
      observer = null;
    }
  };

  const connectObserver = () => {
    disconnectObserver();

    const root =
      (SELECTORS.chatContainer && document.querySelector(SELECTORS.chatContainer)) ||
      document.body ||
      document.documentElement;

    observer = new MutationObserver(() => {
      // New messages / rerender
      debouncedMutation();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });
  };

  // ==================================
  // SPA route watcher
  // ==================================
  const resetForNewRoute = () => {
    // Clear search (optional)
    ui.search.value = "";
    activeId = "";
    items = [];
    ui.list.innerHTML = "";

    // Reconnect observer and rescan
    connectObserver();
    debouncedScan();
  };

  const onUrlMaybeChanged = () => {
    const current = location.href;
    if (current === lastUrl) return;
    lastUrl = current;
    resetForNewRoute();
  };

  const wrapHistoryMethod = (methodName) => {
    const original = history[methodName];
    history[methodName] = function (...args) {
      const ret = original.apply(this, args);
      onUrlMaybeChanged();
      return ret;
    };
  };

  // ==================================
  // Resize behavior
  // ==================================
  const enableResize = () => {
    let isResizing = false;
    let startX = 0;
    let startWidth = CONFIG.defaultPanelWidthPx;

    const onMouseMove = (e) => {
      if (!isResizing) return;
      const deltaX = startX - e.clientX; // moving left increases width
      const nextWidth = startWidth + deltaX;
      const applied = applyWidth(nextWidth);
      saveSettings({ widthPx: applied, collapsed: ui.host.style.display === "none" });
    };

    const onMouseUp = () => {
      if (!isResizing) return;
      isResizing = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    ui.resizeHandle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = ui.host.getBoundingClientRect().width;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      e.preventDefault();
    });
  };

  // ==================================
  // UI events
  // ==================================
  ui.search.addEventListener("input", renderList);

  ui.collapseBtn.addEventListener("click", async () => {
    setCollapsed(true);
    await saveSettings({
      widthPx: ui.host.getBoundingClientRect().width,
      collapsed: true,
    });
  });

  ui.floatingToggle.addEventListener("click", async () => {
    setCollapsed(false);
    await saveSettings({
      widthPx: ui.host.getBoundingClientRect().width,
      collapsed: false,
    });
    debouncedScan();
  });

  window.addEventListener("scroll", debouncedActive, { passive: true });
  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");
  window.addEventListener("popstate", onUrlMaybeChanged);

  // ==================================
  // Init
  // ==================================
  const init = async () => {
    // Load settings
    const settings = await loadSettings();
    if (settings && typeof settings.widthPx === "number") {
      applyWidth(settings.widthPx);
    } else {
      applyWidth(CONFIG.defaultPanelWidthPx);
    }

    if (settings && typeof settings.collapsed === "boolean") {
      setCollapsed(settings.collapsed);
    } else {
      setCollapsed(false);
    }

    enableResize();
    connectObserver();
    scanMessages();
  };

  init();
})();
