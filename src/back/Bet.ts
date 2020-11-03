import { Mutex } from "async-mutex"
import { local as storage2 } from "store2"
import axios from "axios"
import { createTab, closeTab, tabLoadedFuture, deleteAllCookie } from "./ChromeShortcuts"
import { promisePortConnection } from "./PortDriver"
import { OlimpDriver } from "./drivers/OlimpDriver"
import { PinnacleDriver } from "./drivers/PinnacleDriver"
import { DriverInterface } from "./drivers/DriverInterface"

let storage = storage2.namespace('settings')

interface Bet {
  bookmaker: string
  outcome: string
  koef: number
  url: string
}

interface Arb {
  id: string
  bets: Array<Bet>
}

interface EventRaw {
  id: string
  arbs: Array<Arb>
}

export interface BetEvent extends EventRaw {
  completed: boolean
}

export type BetData = EventRaw[]

/* TimedMap is the map where elements have live time */
// WARNING Errors may occure due-to this structure is not syncronized in data editing and etc.
// SYNCRONISE It With mutex!!!
type Timeout = any

export class TimedMap<K, V> extends Map<K, V> {
  #timeout_map: Map<K, Timeout>
  #liveTime: number
  rw_mut: Mutex

  constructor(secToLive: number, ...args: any) {
    super(...args)
    this.set = this.set.bind(this)
    this.refresh_timeout = this.refresh_timeout.bind(this)
    this.setLiveTime = this.setLiveTime.bind(this)

    this.#timeout_map = new Map()
    this.#liveTime = secToLive * 1000

    this.rw_mut = new Mutex()
  }

  setLiveTime(key: K) {
    this.#timeout_map.set(
      key,
      setTimeout(
        (key: K) =>
          this.rw_mut.acquire().then(release => (super.delete(key), release())),
        this.#liveTime,
        key
      )
    )
  }

  refresh_timeout(key: K) {
    clearTimeout(0 || this.#timeout_map.get(key))
    this.setLiveTime(key)
  }

  set(key: K, value: V): this {
    let had_key: boolean = super.has(key)
    super.set(key, value)
    if (!had_key) this.setLiveTime(key)
    else this.refresh_timeout(key)
    return this
  }

  update(key: K, updated_value: V): this {
    this.rw_mut.acquire().then(release => {
      this.set(key, { ...this.get(key), ...updated_value })
      release()
    })
    return this
  }
}
let TTL = 30 * 60 // 30 min

let tmap = new TimedMap<string, BetEvent>(TTL)

// isn't appending arbs issue
export const applyEvents = (events: BetEvent[]): void => {
  // NOTE: i concat because in filterBetData function i leave only arbs that are not presented in tmap
  // IMPORTANT: e$ maybe deleted after assignment and i don't know, if this happens will this code throw
  console.debug("before applyEvents", tmap.entries(), events)
  events.forEach(e => {
    let e$ = tmap.get(e.id)
    if (e$) {
      tmap.refresh_timeout(e.id)
      tmap.update(e.id, { completed: e$.completed || e.completed, arbs: e$.arbs.concat(e.arbs) } as BetEvent)
    } else tmap.set(e.id, e)
  })
  console.debug("after applyEvents", tmap.entries())
}

export const filterBetData = async (data: BetData): Promise<BetEvent[]> => {
  console.debug(data, "\nfiltered with\n", tmap.entries())
  const release = await tmap.rw_mut.acquire()
  try {
    let events = data.map(
      event =>
        ({
          id: event.id,
          completed: false || tmap.get(event.id)?.completed,
          arbs: event.arbs.filter(arb =>
            tmap.has(event.id)
              ? tmap.get(event.id).arbs.every(earb => earb.id != arb.id)
              : true
          )
        } as BetEvent)
    ).filter(e => e.completed != true) // filter out completed events

    return new Promise(r => r(events))
  } finally {
    release()
  }
}

const getBookerUrl = async (r_url: string): Promise<string> => {
  try {
    let response = await axios.get(r_url)
    if (response.status != 200)
      throw Error(`Couldn't get bookmaker url: return status(${response.status}) != 200`)

    let $t = response.data.match(/(?<=direct_link = ').+(?=')/g)
    if (!$t) {
      throw Error("No event url")
    }

    return new Promise(r => r($t[0]))
  } catch (e) {
    console.error(e)
    return new Promise(r => r(null))
  }
}

/* Returns success of betting */
export const betArb = async ({ bets }: Arb): Promise<boolean> => {
  console.debug(`%cBets:`, "background: #588BAE", bets)

  let OlimpBet: Bet = bets.filter(b => b.bookmaker.toLowerCase() == "olimp")[0]
  let PinnacleBet: Bet = bets.filter(b => b.bookmaker.toLowerCase() == "pinnacle")[0]

  if (!OlimpBet || !PinnacleBet) return new Promise(r => r(false))

  let result = false

  let pinnacle_url = await getBookerUrl(PinnacleBet.url)
  let olimp_url = await getBookerUrl(OlimpBet.url)
  if (!olimp_url || !pinnacle_url) return new Promise(r => r(false))

  let olimp: DriverInterface = new OlimpDriver()
  let pinnacle: DriverInterface = new PinnacleDriver()

  TryBet: try {
    olimp.setInfo(olimp_url, OlimpBet.outcome)
    pinnacle.setInfo(pinnacle_url, PinnacleBet.outcome)

    const inv_sum_calc = (k1: number, k2: number) => 1 / k1 + 1 / k2
    // const stakes_calc = (stake: number, inv_sum: number,
    //   k1: number, k2: number) => [stake / (inv_sum * k1), stake / (inv_sum * k2)]

    const stakes_calc_fixed_olimp = (stake: number,
      olimp_k1: number, k2: number) => [stake, stake * (k2 / olimp_k1)]

    let inv_sum = inv_sum_calc(OlimpBet.koef, PinnacleBet.koef)
    console.info(`${PinnacleBet.koef} ${OlimpBet.koef} inverse sum = ${inv_sum}`)

    let [olimp_apx_stake, pinnacle_apx_stake] =
      stakes_calc_fixed_olimp(storage.get('stake'), OlimpBet.koef, PinnacleBet.koef)
    // do the rounding

    let pin_koef = await pinnacle.getReady(pinnacle_apx_stake)
    let ol_koef = await olimp.getReady(olimp_apx_stake)

    inv_sum = inv_sum_calc(ol_koef, pin_koef)
    if (inv_sum >= 1) {
      console.warn(`Koefs have changed to not sufficient ${pin_koef} and ${ol_koef} inverse sum = ${inv_sum}`)
      result = false
      break TryBet
    }

    let [olimp_stake, pinnacle_stake] =
      stakes_calc_fixed_olimp(storage.get('stake'), ol_koef, pin_koef)

    if (!await pinnacle.bet(pinnacle_stake)) {
      result = false
      break TryBet
    }

    if (!await olimp.bet(olimp_stake)) {
      result = false
      break TryBet
    }

  } catch (e) {
    console.error(e)
  }
  finally {
    olimp.release()
    pinnacle.release()
  }
  return new Promise(r => r(result))
}
