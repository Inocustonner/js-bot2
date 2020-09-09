import { PipeQueue } from "./Sync"
import { filterBetData, BetData, BetEvent, betArb, applyEvents} from "./Bet"
import { initializeSettings } from './Settings'
import './Actions'

var control_queue = new PipeQueue<BetData>()

const messageManager = async () => {
  while (true) {
    let betdata = await control_queue.get()
    let events = await filterBetData(betdata)
    console.debug("Clear events", events)
    let events_cnt = events.length
    let i = 0
    let skipped = 0
    for (let event of events) {
      // if event has been complited stop iteration
      for (let arb of event.arbs) {
        event.completed = await betArb(arb)
        if (event.completed) break
      }
      if (event.arbs.length == 0)
        skipped += 1
      console.info(`${i+=1}/${events_cnt} events processed`)
    }
    console.info(`skipped ${skipped}`)
    applyEvents(events);
  }
}

const on_message = (msg: any) => {
  try {
    // json may fail
    control_queue.push(JSON.parse(msg.data).events as BetData)
  } catch (e) {
    console.error(e)
  }
}

const run_connection = (
  server_address: string
): Promise<BetEvent | CloseEvent> => {
  return new Promise(resolve => {
    console.log(`trying to connect to ${server_address}`)
    let x = new WebSocket(server_address) // needs to be accessible from terminal
    x.onclose = (e: BetEvent | CloseEvent) => {
      resolve(e)
    }
    x.onerror = x.onclose
    x.onmessage = on_message // json may fail, and this will be fun xD
  })
}

const async_sleep = (sec: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, sec * 1000)
  })
}

// window.onload = main
const main = async () => {
  // eventify(control_queue, 'push', onpushed)
  console.log("launching bot...")
  const server_address = "ws://192.168.6.3/wsapi/"
  
  initializeSettings()
  // create a messager "thread"
  new Promise(messageManager)

  while (true) {
    await run_connection(server_address).then(e => console.log(e))
    await async_sleep(2)
  }
}
window.onload = main
