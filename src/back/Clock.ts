export type ClockHandler = () => void

let clock: number
let clockHandlers: ClockHandler[] = []

export interface HMTime {
  hour: number,
  min: number
}

// every time given hour:min(HMTime) is passed, f is invoked.
// return: id of added handler
export const timerRunAt = (f: () => void, hm: HMTime): number => {
  function timerBase(f: () => void, hm: HMTime): void {
    const SEC = 1000
    const MIN = 60 * SEC
    const HOUR = 60 * MIN
    const DAY = 24 * HOUR
    let now = new Date()
    if (this.date <= now) {
      f()
      this.date = new Date(this.date.getTime() + DAY)
    }
  }
  let now = new Date()
  let date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hm.hour, hm.min)

  let timer: ClockHandler = timerBase.bind({ date: date }, f, hm)
  return addClockHandler(timer)
}
// returns id of added handler
export const addClockHandler = (handler: ClockHandler): number => {
  clockHandlers.push(handler)
  return clockHandlers.length - 1;
}

export const removeClockHandlerByIndex = (index: number): boolean => {
  if (index > -1) {
    clockHandlers.splice(index, 1)
    return true
  }
  else return false
}

export const removeClockHandler = (handler: ClockHandler): boolean => {
  const index = clockHandlers.indexOf(handler)
  return removeClockHandlerByIndex(index)
}

export const startClock = (ms_interval: number = 1000) => {
  const clockHandler = () => {
    for (let handler of clockHandlers) {
      handler()
    }
  }
  clock = setInterval(clockHandler, ms_interval)
}