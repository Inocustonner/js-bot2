import { Mutex } from "async-mutex"
import { local as storage2 } from "store2"
import { default as axios } from "axios"
import { createTab, closeTab, tabLoadedFuture, deleteAllCookie } from "./ChromeShortcuts"

let storage = storage2.namespace('settings')

type SOPair = [string, string]

interface BettingInfo {
  SOPairs: SOPair[]
  koef: number
  stake: number
  rawoutcome: string
}

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
export class TimedMap<K, V> extends Map<K, V> {
  #timeout_map: Map<K, NodeJS.Timeout>
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

const execOlimpScript = (tabid: number) =>
  chrome.tabs.executeScript(tabid, { file: "content_script/olimp.js" })

const betOlimp = async (
  tabid: number,
  betinfo: BettingInfo
): Promise<boolean> => {
  execOlimpScript(tabid)

  let handler = async function(
    msg: any,
    _: chrome.runtime.MessageSender,
    ret?: (...args: any) => void
  ) {
    let comment
    let error_code
    if (typeof msg == "object") {
      error_code = msg.error_code
      comment = msg.comment
      msg = msg.status
    }

    switch (msg) {
      case "success":
        this.r(true)
        console.info(
          "%cStonks📈",
          "background:#00ab66; color:#fff; font-size: 14px; font-weight: bold;"
        )
        break
      case "fail":
        console.warn(comment)
        this.r(false)
				if (error_code == 1)
					deleteAllCookie()
        break
      case "getInfo":
        console.info("bettingInfo", betinfo)
        ret(betinfo)
        break
      case "getAuth":
        if (this.auth_cnt > 0) {
          console.error("Invalid Credentials. Unnable to auth")
          this.r(false)
        }
        console.info("returning auth")
        ret({ login: storage.get("login"), pwd: storage.get("pwd") })
        await tabLoadedFuture(tabid)
        execOlimpScript(tabid)
        this.auth_cnt += 1
        break
    }
  }
  /* DONT EVEN LOOK BELOW, JUST LEAVE IT AS IT IS */
  let nh: any
  return new Promise<boolean>(r => {
    nh = handler.bind({ betinfo: betinfo, auth_cnt: 0, r: r })
    chrome.runtime.onMessage.addListener(nh)
  }).finally(() => chrome.runtime.onMessage.removeListener(nh))
}

/* Returns success of betting */
export const betArb = async ({ bets }: Arb): Promise<boolean> => {
  let OlimpBet: Bet = bets.filter(b => b.bookmaker.toLowerCase() == "olimp")[0]
  console.debug(`%cBets:`, "background: #588BAE", bets)
  try {
    let response = await axios.get(OlimpBet.url)
    let so_pairs_future = axios.get(
		storage2.get("server_host") +
		`api/determinators/determine?outcome=${OlimpBet.outcome}`
    )

    if (response.status != 200)
      throw Error(`Return status !=200: ${response.status}`)

    let $t = response.data.match(/(?<=direct_link = ').+(?=')/g)
    if (!$t) {
      console.info("No event url")
      return new Promise(r => r(false))
    }

    let booker_url = $t[0]
    console.info("Bookmaker url: ", booker_url)

    let so_pairs = (await so_pairs_future).data

    if (so_pairs.error) {
      throw Error(
        `Error in determing outcome for ${OlimpBet.outcome}: ${so_pairs.error.reason}`
      )
    }

    let betInfo: BettingInfo = {
      SOPairs: so_pairs,
      koef: OlimpBet.koef,
      stake: storage.get("stake"),
      rawoutcome: OlimpBet.outcome,
    }
    let tabid = (await createTab(booker_url)).id
    let result = await betOlimp(tabid, betInfo)

    closeTab(tabid)
    return new Promise(r => r(result))
  } catch (e) {
    console.error(e)
    return new Promise(r => r(false))
  }
}
