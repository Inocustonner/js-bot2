import { startClock, timerRunAt } from '../../src/back/Clock'

let d = 0

const f = function() {
  console.log("f", d)
  d += 1
	if (d < 5) return false;
}
const sleep = (sec: number) => {
  return new Promise(r => setTimeout(r, sec * 1000))
}

const main = async () => {
  startClock()
  let now = new Date()
  console.log("index =", timerRunAt(f, { hour: now.getHours(), min: now.getMinutes() + 1 }))
  console.log("d =", d)
  await sleep(60)
  console.assert(d > 0)
  console.log("d = ", d)
}

main()
