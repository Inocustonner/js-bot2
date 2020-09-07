import * as $ from "jquery"
import { logTableAndParamsOnServer } from "./ServerLog"
import { findBetElem } from "./findBet"

const urlParams = new URLSearchParams(location.search)
const mid: string = urlParams.get("mid")

const sendRequest = (msg: any): Promise<any> => {
  return new Promise(r => {
    chrome.runtime.sendMessage(msg, r)
  })
}

interface ReturnStatus {
  status: string
  comment?: string
}

const finish = (status: ReturnStatus = { status: "success" }) => {
  sendRequest(status)
}

const on_loaded = async () => {
  const { outcome, section, koef, stake } = await sendRequest("getInfo")
  console.info("BettingInfo", outcome, section, koef, stake)

  try {
    let betElem: HTMLElement = findBetElem(section, outcome, mid)
    betElem.style.backgroundColor = "#FF1111" // red
  } catch (error) {
    logTableAndParamsOnServer(mid, outcome, section, koef, stake)
    finish({ status: "error", comment: error })
    return;
  }
  logTableAndParamsOnServer(mid, outcome, section, koef, stake) // maybe make it promise?
  finish()
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