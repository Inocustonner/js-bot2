import { local as storage2 } from "store2"
import axios from "axios"
import { promisePortConnection } from "../PortDriver"
import { createTab, closeTab, tabLoadedFuture, deleteAllCookie } from "../ChromeShortcuts"
import { DriverInterface } from "./DriverInterface"
let storage = storage2.namespace('settings')

type SOPair = [string, string]

enum ErrorCode {
  Released = 0x10
}

export interface RequestPacket {
  request: string,
  payload?: any,
  comment?: string,
  error_code?: number
}

const NULL_PROMISE = (): Promise<void> => new Promise<void>(r => r())

const execOlimpScript = (tabid: number) =>
  chrome.tabs.executeScript(tabid, { file: "content_script/olimp.js" })

export class OlimpDriver extends DriverInterface {
  #so_pairs: SOPair[]
  #port: chrome.runtime.Port
  #auth_cnt: number
  #tabid: number = -1

  #url: string
  #outcome: string

  #finished_f: boolean = false // set when received either 'success' of 'fail' from olimp

  #ready_promise_callback: Function = null
  #bet_promise_callback: Function = null
  #err: Function = null

  // NO THROW IN CONSTRUCTOR
  constructor() {
    super() // automatically binds this to functions it exports as abstract
    this.handler = this.handler.bind(this)
  }

  public setInfo(booker_url: string, outcome: string) {
    console.info(`Olimp: url ${booker_url}`)
    this.#url = booker_url
    this.#outcome = outcome
  }

  private async handler(rp: RequestPacket) {
    switch (rp.request) {
      case "success": {
        this.#finished_f = true

        this.#bet_promise_callback(true)
        console.info(
          "%cOlimp succeded",
          "background:#00ab66; color:#fff; font-size: 14px; font-weight: bold;"
        )
      } break

      case "fail": {
        this.#finished_f = true

        if (this.#bet_promise_callback) {
          if (rp.error_code != ErrorCode.Released) // if it is not forced by driver it self
            console.warn(rp.comment)

          this.#bet_promise_callback(false)
        }
        else {
          this.#err(`Olimp: failed ${rp.comment}`)
        }
      } break

      case "getInfo": {
        console.info('Olimp: requesting info', this.#so_pairs, this.#outcome)
        this.#port.postMessage({ so_pairs: this.#so_pairs, outcome: this.#outcome })
      } break

      case "ready": {
        this.#ready_promise_callback(rp.payload)
      } break

      case "getAuth": {
        if (this.#auth_cnt > 0) {
          this.#err('Olimp: Invalid Credentials. Unnable to authorize')
        } else this.#auth_cnt += 1
        console.info('Olimp: returning account credentials')
        this.#port.postMessage({
          login: storage.get("loginOlimp"),
          pwd: storage.get("pwdOlimp")
        })

        let port_promise = promisePortConnection('olimp_port')

        await tabLoadedFuture(this.#tabid)
        execOlimpScript(this.#tabid)

        this.#port = await port_promise
        this.#port.onMessage.addListener(this.handler)
      } break
    }
  }

  // koef
  public getReady(aproximate_stake: number): Promise<number> {
    return new Promise(async (r, err) => {

      // get so pairs
      let resp = (await axios.get(
        storage2.get("server_host") +
        `api/determinators/determine?outcome=${this.#outcome}`
      )).data
      if (resp.error)
        throw Error(
          `Olimp: Error in determing outcome for ${this.#outcome}: ${resp.error.reason}`
        )

      this.#so_pairs = resp as SOPair[]

      let port_promise = promisePortConnection('olimp_port')

      this.#tabid = (await createTab(this.#url)).id
      execOlimpScript(this.#tabid)

      this.#ready_promise_callback = r
      this.#err = err

      this.#port = await port_promise
      this.#port.onMessage.addListener(this.handler)
    })
  }

  public bet(stake: number): Promise<boolean> {
    return new Promise((r, err) => {
      this.#bet_promise_callback = r
      this.#err = err
      this.#port.postMessage({ stake: stake })
    })
  }

  public release(): Promise<void> {
    return new Promise<void>(r => {
      if (this.#finished_f) { // if releasing after full betting cycle
        r() // just complete promise to close openned tab
      } else { // if releasing after ready
        this.#bet_promise_callback = r
        // send rp to fail betting, and close open busket
        this.#port.postMessage({ error_rp: { request: 'fail', comment: 'forced closing', error_code: ErrorCode.Released } })
      }
    }).finally(() => {
      if (this.#tabid) closeTab(this.#tabid)
    })
  }
}
