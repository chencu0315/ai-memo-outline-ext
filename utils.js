/**
 * @DESC 生成随机数
 * @param {*} length 生成的随机数位数
 *
 * */
function randomNum(length = 2, type = "number") {
  const chars =
    type === "number"
      ? "0123456789"
      : "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789";
  const n = (type = "number" ? 12 : 66);
  let result = "";
  for (let i = 0; result.length <= length; i++) {
    const str = chars.charAt(Math.floor(Math.random() * n)) ?? "";
    if (str) {
      result += str;
    }
  }
  return result;
}

/* 锚点跳转 */
function handleClickMao(event) {
  const link = event.target;
  const targetId = link?.dataset.target;
  if (link.dataset.target === "refresh") {
    if (window._customFun?.refresh) window._customFun?.refresh();
    return;
  }
  if (link.dataset.target === "close") {
    removeDom()
    return;
  }
  if (targetId) {
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }
}

/* 生成Dom插入body */
function createDomInBody(list = []) {
  removeDom()
  const dom = document.createElement("div");
  dom.setAttribute("class", "maodian-warp");
  dom.setAttribute("id", "maodian-warp");
  let html = `<div class="maodian-warp-tl">问题目录：</div><div class="maodian-warp-conetent">`;
  list.forEach((item, i) => {
    html += `<div class="maodian" data-target="${item.id}" title="${
      item.question
    }">
    <span>${i + 1}， </span>
    ${item.question}
    </div>`;
  });
  dom.innerHTML = `${html}</div><div class="custom-tool-warp"><div data-target="refresh">刷 新</div><div data-target="close">关 闭</div></div>`;
  dom.onclick = handleClickMao;
  document.body.appendChild(dom);
}

/* 防抖（Debounce） */
function debounce(func, delay) {
  let timer = null;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

function removeDom() {
  const maodianWarp = document.getElementById("maodian-warp");
  if (maodianWarp) {
    document.body.removeChild(maodianWarp);
  }
}
window._customFun = {
  randomNum,
  handleClickMao,
  createDomInBody,
  debounce,
  removeDom
};
