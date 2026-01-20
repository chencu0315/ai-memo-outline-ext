let timer = null;
/* 获得对话集数据 */
function handleQustionListByPage(delay = 1500) {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    /* 获取问题的dome */
    const question = [];
    var doms = document.getElementsByClassName('hTtAuuC5');
    console.log('doms', doms.length)
    if (doms.length > 0) {
      for (let i = 0; i < doms.length; i++) {
        const targetDom = doms[i].getElementsByTagName('span')
        if (targetDom.length > 0) {
          const id = window._customFun?.randomNum(10, "zimu");
          doms[i].setAttribute("id", id);
          question.push({
            id,
            question: targetDom[0].innerText,
          });
        }
      }
    }
    /* 是否存在对话框 */
    var doms2 =  document.getElementsByClassName('yc-editor')
    if (doms2.length > 0) {
      const newArr = question?.reverse()
      window._customFun?.createDomInBody(newArr);
    } else {
      window._customFun?.removeDom()
    }
  }, delay);
}

/* 监听发送新对话 */
function handleSendNewQuestion() {
  /* 对话框 输入内容1.5秒后不输入则重新生成问题目录 */
  var doms2 =  document.getElementsByClassName('yc-editor')
  if (doms2.length > 0) {
    doms2[0].addEventListener("input", window._customFun?.debounce(
      () => {
        handleQustionListByPage(2000)
      },
      2000
    ));
  }
}

/* 监听左边对话目录 */
function handleLeftMenuClick() {
  var doms1 = document.getElementsByClassName("eudR7YGV")
  if (doms1.length < 1) {
    return false
  }
  var doms2 = doms1[0].querySelectorAll(".rc-virtual-list-holder-inner")
  if (doms2.length > 0) {
    doms2[0].addEventListener("click", window._customFun?.debounce(
      () => {
        handleQustionListByPage(2000)
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
  setTimeout(() => {
    handleQustionListByPage(1000);
    handleSendNewQuestion()
    handleLeftMenuClick()
  }, 5000)
}

