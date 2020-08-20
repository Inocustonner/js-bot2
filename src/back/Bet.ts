import { Mutex } from 'async-mutex'

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
class TimedMap<K, V> extends Map<K, V> {
  #liveTime: number
  rw_mut: Mutex
  constructor(secToLive: number, ...args: any) {
    super(...args)
    this.set = this.set.bind(this)
    this.#liveTime = secToLive * 1000
    this.rw_mut = new Mutex()
  }

  set(key: K, value: V): this {
    super.set(key, value)
    // delete element on timeout
    setTimeout((key: K) =>
      this.rw_mut.acquire().then(
        (release) => (super.delete(key), release())
      )
    , this.#liveTime, key)
    return this
  }

  update(key: K, updated_value: V): this {
    this.rw_mut.acquire().then(
      (release) => {
        this.set(key, { ...this.get(key), ...updated_value })
        release()
      }
    )
    return this
  }
}
let TTL = 20 * 60 // 20 mins

let tmap = new TimedMap<string, BetEvent>(TTL)

// isn't appending arbs issue
export const applyEvents = (events: BetEvent[]): void => {
  // NOTE: i concat because in filterBetData function i leave only arbs that are not presented in tmap
  // IMPORTANT: e$ maybe deleted after assignment and i don't know, if this happens will this code throw
  console.debug('before applyEvents', tmap, events)
  events.forEach(e => {
    let e$ = tmap.get(e.id)
    if (e$) tmap.update(e.id, { arbs: e$.arbs.concat(e.arbs) } as BetEvent)
    else tmap.set(e.id, e)
  })
  console.debug('after applyEvents', tmap)
}

// refactor
export const filterBetData = async (data: BetData): Promise<BetEvent[]> => {
  console.debug(data, "\nfiltered with\n", tmap)
  const release = await tmap.rw_mut.acquire()
  try {
    let events = data.map(event => (
      {
        id: event.id,
        completed: false || tmap.get(event.id)?.completed,
        arbs: event.arbs.filter(arb =>
          tmap.has(event.id) ?
            tmap.get(event.id).arbs.every(earb => earb.id != arb.id)
            : true
        )
      } as BetEvent)
    )
    // for (let event of data) {
    //   if (tmap.has(event.id)) {
    //     event.arbs = event.arbs.filter(arb => tmap.get(event.id).arbs.every(earb => earb.id != arb.id))
    //   }
    //   events.push({ ...event, completed: false || tmap.get(event.id)?.completed })
    // }
    return new Promise(r => r(events))
  } finally {
    release()
  }
}

/* Returns success of betting */
export const betArb = (arb: Arb): boolean => {
  return false
}
