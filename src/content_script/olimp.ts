import * as $ from "jquery"
import { findBetElem } from "./findBet"
import { ensure_authorization } from "./autohorization"
import { Port } from "./Port"
import { RequestPacket } from "../back/drivers/OlimpDriver"

const urlParams = new URLSearchParams(location.search)
const mid: string = urlParams.get("mid")
const sleep = async (sec: number) => new Promise(r => setTimeout(r, sec * 1000))

const submit_button_selector = '.busket-pay>[name=formsubmit]'
const stake_input_selector = '[name=singlebet_sum0]'
const clear_button_selector = '.clearAllbasket'

const checkKoefEnabled = true

export const port = new Port('olimp_port')

const finish = (status: RequestPacket = { request: "success" }) => {
  port.sendRequest(status)
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
  await ensure_authorization();
	
	console.log("Requesting info")
  port.sendRequest({ request: "getInfo" })

	const { so_pairs, outcome } = await port.receiveRequest()
	
  console.info("BettingInfo", so_pairs, outcome)
  // await sleep(2)

  let clear_b: HTMLElement

  try {
    // Get koef element and mark it in red for logging
    let koefEl: HTMLElement = findBetElem(so_pairs, mid)
    koefEl.style.backgroundColor = "#FF1111" // red

    // check if koef has changed
    let bkKoef = parseFloat(koefEl.innerText)
		
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
		
		port.sendRequest({ request: "ready", payload: bkKoef})
		
		const { stake, error_rp } = await port.receiveRequest()
		// koef is not valid, remove basket
		if (error_rp) {
			clear_b?.click()
			finish(error_rp)
			return
		}
		
    input.value = stake.toString()
    // get buttons and try to submit

    let submit_b = document.querySelector(submit_button_selector) as HTMLElement
    await submit(submit_b, clear_b)

  } catch (error) {
    clear_b?.click()
    console.debug(error)
    if (typeof error == "object") error = error.stack
    finish({ request: "fail", comment: error })
    return
  }
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

    let t: NodeJS.Timeout | number
    if (timeout)
      t = setTimeout(
        () => e(`Element '${selector}' didn't appear. Timeout `),
        timeout * 1000
      )

    let observer = new MutationObserver(m => {
      if (exists(selector)) {
        clearTimeout(t as number)
        r(parent.querySelector(selector) as HTMLElement)
      }
    })
    observer.observe(parent, {
      subtree: true,
      childList: true,
    })
  })
}

onExists(`#odd${mid}`, document.body, 8)
  .then(on_loaded)
  .catch(() =>
    finish({
      request: "fail",
      comment: "waiting timedout",
      error_code: 1
    })
  )
