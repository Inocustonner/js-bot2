import { default as axios } from "axios"
import * as $ from "jquery"

const urlParams = new URLSearchParams(location.search)
const mid: string = urlParams.get("mid")

const sendMessage = (msg: any): Promise<any> => {
  return new Promise(r => {
    chrome.runtime.sendMessage(msg, r)
  })
}

const finish = () => {
  sendMessage("success")
}

const getTableHtml = (outcome: string, koef: number): string => {
  return `<html>
<link type="text/css" rel="stylesheet" href="style.css">
<body>
<h1>INFO - Outcome: ${outcome} | Koef: ${koef} <h1>
${$(`.koeftable2`).prop("outerHTML")}
</body>
</html>`
}

const on_loaded = async () => {
  const { outcome, koef } = await sendMessage("getInfo")
  console.log("O K", outcome, koef)
  let postUrl = `http://192.168.6.3/api/store_data?dir=betpages&key=${$(
    `#match_live_name_${mid}`
  ).text()}.html`
  let data = getTableHtml(outcome, koef)
  console.log(postUrl)
  chrome.runtime.sendMessage({ action: "sendPost", data: [postUrl, data] })
  setTimeout(finish, 60 * 1000)
}

const onExists = (selector: string, parent?: HTMLElement): Promise<void> => {
  parent = parent ? parent : document.body
  return new Promise(r => {
    let observer = new MutationObserver(m => {
      if ($(selector).length) r()
    })
    observer.observe(parent, {
      subtree: true,
      childList: true,
    })
  })
}

onExists(`#odd${mid}`, $(".bing-table-width").get(0)).then(on_loaded)
