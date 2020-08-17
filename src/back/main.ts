import { PipeQueue } from './Sync'
import { processBet, BetData } from './Bet'

var control_queue = new PipeQueue<BetData>();

const messageManager = async () => {
  while (true) {
    let data = await control_queue.get()
    processBet(data);
  }
};

const run_connection = (
  server_address: string
): Promise<Event | CloseEvent> => {
  return new Promise((resolve) => {
    console.log(`trying to connect to ${server_address}`);
    let x = new WebSocket(server_address); // needs to be accessible from terminal
    x.onclose = (e: Event | CloseEvent) => {
      resolve(e);
    };
    x.onerror = x.onclose;
    x.onmessage = (msg: any) => control_queue.push(JSON.parse(msg.data)); // json may fail, and this will be fun xD
  });
};

const async_sleep = (sec: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
};

// window.onload = main
const main = async () => {
  // eventify(control_queue, 'push', onpushed)
  console.log("launching bot...");
  const server_address = "ws://192.168.6.3/wsapi/";

  // create a messager "thread"
  new Promise(messageManager);

  while (true) {
    await run_connection(server_address).then((e) => console.log(e));
    await async_sleep(2);
  }
};
window.onload = main;
