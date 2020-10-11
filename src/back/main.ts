import { PipeQueue } from "./Sync"
import { filterBetData, BetData, BetEvent, betArb, applyEvents } from "./Bet"
import { initializeSettings } from './Settings'
import { startClock, timerRunAt } from './Clock'
import { local as storage } from 'store2'
import './Actions'

var control_queue = new PipeQueue<BetData>()
var running_bets: boolean

const messageManager = async () => {
  while (true) {
    let betdata = await control_queue.get()
    let events = await filterBetData(betdata)
    console.debug("Clear events", events)
		running_bets = true
    for (let event of events) {
      // if event has been complited stop iteration
      for (let arb of event.arbs) {
        event.completed = await betArb(arb)
        if (event.completed) break
      }
    }
		running_bets = false
    applyEvents(events);
  }
}

const on_message = (msg: any) => {
  const COMMAND_RELOAD = 1;
  // const COMMAND_CLEAR_COOKIE = 2;
  try {
    // json may fail
    let packet = JSON.parse(msg.data)
    switch (packet.command) {
      case COMMAND_RELOAD:
        chrome.runtime.reload();
        break;
      default:
        control_queue.push(packet.events as BetData)
    }
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

const freeResources = function(): boolean {
  console.clear()
	// delete all cookies
	if (!running_bets) {
		chrome.cookies.getAll({}, (cooks) => {
			for (let cookie of cooks) {
				chrome.cookies.remove({ url: "https://" + cookie.domain, name: cookie.name });
				chrome.cookies.remove({ url: "http://" + cookie.domain, name: cookie.name });
			}
		});
		return true;
	} else
		return false;
}

// window.onload = main
const main = async () => {
  // eventify(control_queue, 'push', onpushed)
  console.log("launching bot...")
  const server_address = "ws://192.168.6.3/wsapi/"

  initializeSettings()

  // MUST be run after initializeSettings
  timerRunAt(freeResources, { hour: storage.get("settings.hour_freeResources"), min: storage.get("settings.min_freeResources") })
  startClock()
  // create a messager "thread"
  new Promise(messageManager)

  while (true) {
    await run_connection(server_address).then(e => console.log(e))
    await async_sleep(2)
  }
}
window.onload = main
