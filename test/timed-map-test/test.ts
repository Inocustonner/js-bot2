import { TimedMap } from "../../src/back/Bet"

let ttl = 5
let map = new TimedMap<string, number>(ttl)

const sleep = (sec: number) => {
  return new Promise(r => setTimeout(r, sec * 1000))
}

const main = async () => {
  map.set("k", 3)
  await sleep(ttl - 2)
  console.log("Refreshing 'k'")
  map.refresh_timeout("k")

  map.set("d", 4)
  console.log(map)

  await sleep(ttl - 1)
  console.log("Refreshing 'd'")
  map.refresh_timeout("d")

  console.log("IS 'k' alive?")
  console.log(map)

  await sleep(ttl - 1)
  console.log("IS 'd' alive?")
  console.log(map)
  
  await sleep(1)
  console.log(map)
}

main()