let timer = null;
let lastUrl = location.href;
let isPanelVisible = true;
let messageObserver = null;

/* 选择器配置 */
const SELECTORS = {
  userMessage: ".user-message-bubble-color",
  userMessageText: ".whitespace-pre-wrap",
  chatInput: "textarea",
  sidebarMenu: '[class*="sidebar"], [class*="conversation-list"], nav',
  aiMessage: '[data-message-author-role="assistant"]',
  /* 消息容器，用于监听新消息 */
  messageContainer: '[class*="react-scroll-to-bottom"], [class*="chat-messages"], main',
};

/* SVG 图标 */
const ICONS = {
  toggle: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
  empty: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`,
  goAnswer: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`,
};

/* 查找滚动容器 */
function findScrollContainer(element) {
  let el = element?.parentElement;
  while (el) {
    const style = getComputedStyle(el);
    if (
      style.overflow === "auto" ||
      style.overflow === "scroll" ||
      style.overflowY === "auto" ||
      style.overflowY === "scroll"
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

/* 获取问题列表数据 */
function handleQustionListByPage(delay = 1500) {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    const question = [];
    const doms = document.querySelectorAll(SELECTORS.userMessage);

    if (doms.length > 0) {
      for (let i = 0; i < doms.length; i++) {
        const id = window._customFun?.randomNum(10, "zimu");
        doms[i].setAttribute("id", id);
        /* 同时存储索引，用于跳转到对应的AI回答 */
        doms[i].setAttribute("data-question-index", i);

        const textDom = doms[i].querySelector(SELECTORS.userMessageText);
        const text = textDom ? textDom.innerText : doms[i].innerText;

        question.push({
          id,
          index: i,
          question: text,
        });
      }
    }

    const chatInput = document.querySelector(SELECTORS.chatInput);
    if (chatInput) {
      createDomInBody(question);
      /* 开始监听新消息 */
      observeNewMessages();
    } else {
      removeDom();
      stopObservingMessages();
    }
  }, delay);
}

/* 监听新消息（用于发送新对话后自动刷新） */
function observeNewMessages() {
  /* 如果已经在监听，先停止 */
  stopObservingMessages();

  /* 找到消息容器 */
  const userMsg = document.querySelector(SELECTORS.userMessage);
  if (!userMsg) return;

  /* 向上查找一个合适的容器来监听 */
  let container = userMsg.parentElement;
  for (let i = 0; i < 10 && container; i++) {
    if (container.children.length > 2) {
      break;
    }
    container = container.parentElement;
  }

  if (!container) return;

  let lastMessageCount = document.querySelectorAll(SELECTORS.userMessage).length;

  messageObserver = new MutationObserver(
    window._customFun?.debounce(() => {
      const currentCount = document.querySelectorAll(SELECTORS.userMessage).length;
      /* 如果用户消息数量增加，说明发送了新消息 */
      if (currentCount > lastMessageCount) {
        console.log("[问题目录] 检测到新消息，自动刷新...");
        lastMessageCount = currentCount;
        handleQustionListByPage(1000);
      }
    }, 1000)
  );

  messageObserver.observe(container, {
    childList: true,
    subtree: true,
  });
}

/* 停止监听新消息 */
function stopObservingMessages() {
  if (messageObserver) {
    messageObserver.disconnect();
    messageObserver = null;
  }
}

/* 创建切换按钮 */
function createToggleButton() {
  const existingBtn = document.getElementById("maodian-toggle-btn");
  if (existingBtn) return;

  const btn = document.createElement("button");
  btn.setAttribute("id", "maodian-toggle-btn");
  btn.setAttribute("class", "maodian-toggle-btn");
  btn.setAttribute("title", "显示/隐藏问题目录");
  btn.innerHTML = ICONS.toggle;

  btn.onclick = function () {
    const panel = document.getElementById("maodian-warp");
    if (panel) {
      isPanelVisible = !isPanelVisible;
      panel.classList.toggle("hidden", !isPanelVisible);
      btn.classList.toggle("active", isPanelVisible);
    }
  };

  document.body.appendChild(btn);
}

/* 生成 DOM 插入 body */
function createDomInBody(list = []) {
  removeDom();
  createToggleButton();

  const dom = document.createElement("div");
  dom.setAttribute("class", `maodian-warp${isPanelVisible ? "" : " hidden"}`);
  dom.setAttribute("id", "maodian-warp");

  let contentHtml = "";

  if (list.length === 0) {
    contentHtml = `
      <div class="maodian-empty">
        ${ICONS.empty}
        <div>暂无问题记录</div>
      </div>
    `;
  } else {
    list.forEach((item, i) => {
      contentHtml += `
        <div class="maodian-item" data-target="${item.id}" data-index="${item.index}" title="${escapeHtml(item.question)}">
          <div class="maodian-index">${i + 1}</div>
          <div class="maodian-text">${escapeHtml(item.question)}</div>
          <div class="maodian-go-answer" data-target-answer="${item.index}" title="跳转回答">
            ${ICONS.goAnswer}
          </div>
        </div>
      `;
    });
  }

  dom.innerHTML = `
    <div class="maodian-warp-tl">问题目录</div>
    <div class="maodian-warp-conetent">${contentHtml}</div>
    <div class="custom-tool-warp">
      <button class="custom-tool-btn refresh-btn" data-target="refresh">
        ${ICONS.refresh}
        <span>刷新</span>
      </button>
      <button class="custom-tool-btn close-btn" data-target="close">
        ${ICONS.close}
        <span>隐藏</span>
      </button>
    </div>
  `;

  dom.onclick = handleClickMao;
  document.body.appendChild(dom);

  /* 同步按钮状态 */
  const toggleBtn = document.getElementById("maodian-toggle-btn");
  if (toggleBtn) {
    toggleBtn.classList.toggle("active", isPanelVisible);
  }
}

/* HTML 转义，防止 XSS */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* 滚动到元素顶部（带间距） */
function scrollToElementTop(element, offset = 80) {
  if (!element) return;

  const scrollContainer = findScrollContainer(element);
  const rect = element.getBoundingClientRect();

  if (scrollContainer) {
    /* 有自定义滚动容器 */
    const containerRect = scrollContainer.getBoundingClientRect();
    const targetScrollTop =
      scrollContainer.scrollTop + rect.top - containerRect.top - offset;
    scrollContainer.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });
  } else {
    /* 使用 window 滚动 */
    const targetScrollTop = window.scrollY + rect.top - offset;
    window.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });
  }
}

/* 锚点跳转处理 */
function handleClickMao(event) {
  /* 检查是否点击了跳转回答按钮 */
  const answerBtn = event.target.closest("[data-target-answer]");
  if (answerBtn) {
    const answerIndex = parseInt(answerBtn.dataset.targetAnswer, 10);
    scrollToAnswer(answerIndex);
    return;
  }

  const target = event.target.closest("[data-target]");
  if (!target) return;

  const targetId = target.dataset.target;

  if (targetId === "refresh") {
    handleQustionListByPage(500);
    return;
  }

  if (targetId === "close") {
    isPanelVisible = false;
    const panel = document.getElementById("maodian-warp");
    const toggleBtn = document.getElementById("maodian-toggle-btn");
    if (panel) panel.classList.add("hidden");
    if (toggleBtn) toggleBtn.classList.remove("active");
    return;
  }

  /* 跳转到问题 - 使用顶部对齐 */
  const targetElement = document.getElementById(targetId);
  if (targetElement) {
    scrollToElementTop(targetElement, 80);

    /* 添加高亮动画效果 */
    targetElement.style.transition = "box-shadow 0.3s ease";
    targetElement.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.5)";
    setTimeout(() => {
      targetElement.style.boxShadow = "";
    }, 1500);
  }
}

/* 跳转到AI回答 */
function scrollToAnswer(questionIndex) {
  /* 获取所有 AI 回答 */
  const aiMessages = document.querySelectorAll(SELECTORS.aiMessage);

  if (aiMessages.length === 0) {
    console.log("[问题目录] 未找到AI回答");
    return;
  }

  /* 通过索引找到对应的 AI 回答 */
  const targetAnswer = aiMessages[questionIndex];

  if (!targetAnswer) {
    console.log("[问题目录] 未找到对应索引的AI回答:", questionIndex);
    return;
  }

  /* 滚动到元素顶部 */
  scrollToElementTop(targetAnswer, 80);

  /* 添加高亮效果 */
  targetAnswer.style.transition = "box-shadow 0.3s ease";
  targetAnswer.style.boxShadow = "0 0 0 3px rgba(34, 197, 94, 0.5)";
  setTimeout(() => {
    targetAnswer.style.boxShadow = "";
  }, 1500);
}

/* 移除 DOM */
function removeDom() {
  const maodianWarp = document.getElementById("maodian-warp");
  if (maodianWarp) {
    document.body.removeChild(maodianWarp);
  }
}

/* 移除所有相关 DOM（包括按钮） */
function removeAllDom() {
  removeDom();
  stopObservingMessages();
  const toggleBtn = document.getElementById("maodian-toggle-btn");
  if (toggleBtn) {
    document.body.removeChild(toggleBtn);
  }
}

/* 监听输入框 */
function handleSendNewQuestion() {
  const chatInput = document.querySelector(SELECTORS.chatInput);
  if (chatInput && !chatInput._bindedInput) {
    chatInput._bindedInput = true;
    chatInput.addEventListener(
      "input",
      window._customFun?.debounce(() => {
        handleQustionListByPage(2000);
      }, 2000)
    );

    /* 监听回车发送 */
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        /* 延迟刷新，等待消息发送完成 */
        setTimeout(() => {
          handleQustionListByPage(2000);
        }, 1500);
      }
    });
  }
}

/* 监听左边对话目录 */
function handleLeftMenuClick() {
  const sidebar = document.querySelector(SELECTORS.sidebarMenu);
  if (sidebar && !sidebar._bindedClick) {
    sidebar._bindedClick = true;
    sidebar.addEventListener(
      "click",
      window._customFun?.debounce(() => {
        handleQustionListByPage(1500);
        handleSendNewQuestion();
      }, 1500)
    );
  }
}

/* 监听 URL 变化（SPA 应用自动刷新） */
function handleUrlChange() {
  const checkUrl = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("[问题目录] 检测到 URL 变化，自动刷新...");
      setTimeout(() => {
        handleQustionListByPage(800);
        handleSendNewQuestion();
      }, 1200);
    }
  };

  /* 使用 MutationObserver 监听 DOM 变化来检测路由变化 */
  const observer = new MutationObserver(
    window._customFun?.debounce(checkUrl, 500)
  );
  observer.observe(document.body, { childList: true, subtree: true });

  /* 同时监听 popstate 事件 */
  window.addEventListener("popstate", () => {
    setTimeout(checkUrl, 500);
  });

  /* 拦截 pushState 和 replaceState */
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    setTimeout(checkUrl, 500);
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    setTimeout(checkUrl, 500);
  };
}

/* 初始化 */
window.onload = function () {
  window._customFun.refresh = function () {
    handleQustionListByPage(500);
  };

  /* 初始加载 */
  handleQustionListByPage(2500);

  /* 延时确保元素渲染完毕 */
  setTimeout(() => {
    handleLeftMenuClick();
    handleSendNewQuestion();
    handleUrlChange();
  }, 3000);
};
