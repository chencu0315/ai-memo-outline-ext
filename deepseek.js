let timer = null;
/* 获得对话集数据 */
function handleQustionListByPage(delay = 1500) {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    /* 获取问题的dome */
    const question = [];
    var doms = document.getElementsByClassName("fbb737a4");
    if (doms.length > 0) {
      for (let i = 0; i < doms.length; i++) {
        const id = window._customFun?.randomNum(10, "zimu");
        doms[i].setAttribute("id", id);
        question.push({
          id,
          question: doms[i].innerText,
        });
      }
    }
    var doms1 = document.getElementById("chat-input"); // 是否存在对话框
    if (doms1) {
      window._customFun?.createDomInBody(question);
    } else {
      window._customFun?.removeDom();
    }
  }, delay);
}

/* 监听发送新对话 */
function handleSendNewQuestion() {
  /* 对话框 输入内容1.5秒后不输入则重新生成问题目录 */
  var doms1 = document.getElementById("chat-input");
  if (doms1) {
    doms1.addEventListener(
      "input",
      window._customFun?.debounce(() => {
        handleQustionListByPage();
      }, 2000)
    );
  }
}

/* 监听左边对话目录 */
function handleLeftMenuClick() {
  var doms1 = document.getElementsByClassName("_03210fb");
  if (doms1.length > 0) {
    doms1[0].addEventListener("click", () => {
      handleQustionListByPage();
      handleSendNewQuestion();
    });
  }
}

window.onload = function () {
  window._customFun.refresh = function () {
    handleQustionListByPage();
  };
  handleQustionListByPage(3000);
  setTimeout(() => {
    handleLeftMenuClick();
    handleSendNewQuestion();
  }, 3000);
};
