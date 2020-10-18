import { Mutex } from "async-mutex"
import { local as storage2 } from "store2"
import axios from "axios"
import { createTab, closeTab, tabLoadedFuture, deleteAllCookie } from "./ChromeShortcuts"
import { promisePortConnection } from "./PortDriver"
import { OlimpDriver } from "./Drivers/OlimpDriver"

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

/* Returns success of betting */
export const betArb = async ({ bets }: Arb): Promise<boolean> => {
  let OlimpBet: Bet = bets.filter(b => b.bookmaker.toLowerCase() == "olimp")[0]
  console.debug(`%cBets:`, "background: #588BAE", bets)
	
	let booker_url: string
  try {
    let response = await axios.get(OlimpBet.url)
    if (response.status != 200)
      throw Error(`Return status !=200: ${response.status}`)

    let $t = response.data.match(/(?<=direct_link = ').+(?=')/g)
    if (!$t) {
      console.info("No event url")
      return new Promise(r => r(false))
    }

    booker_url = $t[0]

  } catch (e) {
    console.error(e)
    return new Promise(r => r(false))
  }
	
  let result = false
  let olimp = new OlimpDriver(booker_url, OlimpBet.outcome)

  TryBet: try {
    let koef = await olimp.getReady()
		
    if (koef < OlimpBet.koef) {
      console.warn(`Koef changed from ${OlimpBet.koef} to ${koef}`)
      break TryBet
    }
    let result = await olimp.bet(storage.get('stake'))
  } catch (e) {
    console.error(e)
  }
  finally {
    olimp.release()
  }
	return new Promise(r => r(result))
}
