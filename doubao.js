let timer = null;
/* 获得对话集数据 */
function handleQustionListByPage(delay = 1500) {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    /* 获取问题的dome */
    const question = [];
    var doms = document.querySelectorAll('div[data-testid="message_text_content"]');
    if (doms.length > 0) {
      for (let i = 0; i < doms.length; i++) {
        if (doms[i].children.length === 0) {
          const id = window._customFun?.randomNum(10, "zimu");
          doms[i].setAttribute("id", id);
          question.push({
            id,
            question: doms[i].innerText,
          });
        }
      }
    }
    var doms1 = document.querySelector('textarea[data-testid="chat_input_input"]'); // 是否存在对话框
    if (doms1) {
      window._customFun?.createDomInBody(question);
    } else {
      window._customFun?.removeDom()
    }
  }, delay);
}

/* 监听发送新对话 */
function handleSendNewQuestion() {
  /* 对话框 输入内容1.5秒后不输入则重新生成问题目录 */
  var doms1 =  document.querySelector('textarea[data-testid="chat_input_input"]');
  if (doms1) {
    doms1.addEventListener("input", window._customFun?.debounce(
      () => {
        handleQustionListByPage(1000)
      },
      2000
    ));
  }
}

/* 监听左边对话目录 */
function handleLeftMenuClick() {
  var doms1 = document.getElementsByClassName("sidebar-J0yblC")
  if (doms1.length > 0) {
    doms1[0].addEventListener("click", window._customFun?.debounce(
      () => {
        /* 是否存在对话框 */
        handleQustionListByPage(500)
        handleSendNewQuestion()
      },
      1500
    ))
  }
}


window.onload = function () {
  window._customFun.refresh = function () {
    handleQustionListByPage(1000); 
  }
 handleQustionListByPage(3600)

 /* 延时器确保元素渲染完毕 */
 setTimeout(() => {
  handleLeftMenuClick()
  handleSendNewQuestion()
 }, 3600)
}