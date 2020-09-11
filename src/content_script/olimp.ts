import * as $ from "jquery"
import { logTableAndParamsOnServer } from "./ServerLog"
import { findBetElem } from "./findBet"

const urlParams = new URLSearchParams(location.search)
const mid: string = urlParams.get("mid")
const sleep = async (sec: number) => new Promise(r => setTimeout(r, sec * 1000))

const submit_button_selector = '.busket-pay>[name=formsubmit]'
const stake_input_selector = '[name=singlebet_sum0]'
const clear_button_selector = '.clearAllbasket'

const checkKoef = false

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

const submit = async (submit_butt: HTMLElement, clear_butt: HTMLElement) => {
  const clearBasket = () => clear_butt.click()
  const warning_info_timeout = 3
  submit_butt.click()
  try {
    await onExists('#error-wraper-betslip>.warning-infoblock .accept_icon', null, warning_info_timeout) 
  } catch (e) {
    let msg = $('#error-wraper-betslip').text()
    clearBasket()
    throw msg
  }
}

const on_loaded = async () => {
  const { outcome, section, koef, stake, rawoutcome } = await sendRequest(
    "getInfo"
  )
  
  console.info("BettingInfo", outcome, section, koef, stake)
  await sleep(5)

  let clear_b: HTMLElement
  
  try {
    // Get koef element and mark it in red for logging
    let koefEl: HTMLElement = findBetElem(section, outcome, mid)
    koefEl.style.backgroundColor = "#FF1111" // red

    // check if koef has changed
    let bkKoef = parseFloat(koefEl.innerText)
    if (checkKoef && bkKoef - koef < 0) {
      throw `Koef has changed from ${koef} to ${bkKoef}`
    }

    // click on koef and wait for basket to show up
    koefEl.click()
    let elemInBasket = await onExists(
      `.busket-body [value="${koefEl.getAttribute("data-id")}"`,
      null,
      10
    )
    // get clear button
    clear_b = document.querySelector(clear_button_selector) as HTMLElement

    // fill the basket
    let basketEl: HTMLElement = elemInBasket.parentElement;
    let input = basketEl.querySelector(stake_input_selector) as HTMLInputElement
    // if input is not found, then we are in express bet.
    if (input == null) {
      // switch back to ordinar
      (document.querySelector('.busket-nav>#bn1') as HTMLElement).click()
      await onExists(stake_input_selector, basketEl, 5)
      input = basketEl.querySelector(stake_input_selector) as HTMLInputElement
    }
    input.value = stake
    // get buttons and try to submit
    
    let submit_b = document.querySelector(submit_button_selector) as HTMLElement
    await submit(submit_b, clear_b)

  } catch (error) {
    clear_b?.click()
    logTableAndParamsOnServer(mid, outcome, section, koef, stake, rawoutcome)
    console.debug(error)
    if (typeof error == "object") error = error.stack
    finish({ status: "fail", comment: error })
    return
  }
  logTableAndParamsOnServer(mid, outcome, section, koef, stake, rawoutcome) // maybe make it promise?
  finish()
}

const onExists = (
  selector: string,
  parent?: HTMLElement,
  timeout: number = 0
): Promise<HTMLElement> => {
  parent = parent ? parent : document.body
  return new Promise((r, e) => {
    const exists = (selector: string) => $(selector).length
    // if already exists
    if (exists(selector)) r(parent.querySelector(selector) as HTMLElement)

    let t: number
    if (timeout)
      t = setTimeout(
        () => e(`Element '${selector}' didn't appear. Timeout `),
        timeout * 1000
      )

    let observer = new MutationObserver(m => {
      if (exists(selector)) {
        clearTimeout(t)
        r(parent.querySelector(selector) as HTMLElement)
      }
    })
    observer.observe(parent, {
      subtree: true,
      childList: true,
    })
  })
}

onExists(`#odd${mid}`, $(".bing-table-width").get(0), 15)
  .then(on_loaded)
  .catch(() =>
    finish({
      status: "fail",
      comment: "waiting timedout",
    })
  )
