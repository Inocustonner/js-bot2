var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest

function p_arb(id) {
  return { id: id, bets: [] }
}

function p_event(id, arbids) {
  return { id: id, arbs: arbids.map(aid => p_arb(aid)) }
}

events1 = {
  events: [p_event("1", ["a1.1", "a2.2"]), p_event("2", ["a2.1", "a2.2"])],
}

events2 = {
  events: [
    p_event("1", ["a1.1", "a2.2"]),
    p_event("2", ["a2.3"]),
    p_event("3", ["a3.1"]),
  ],
}

events3 = {
  events: [
    p_event("1", ["a1.1", "a2.2"]),
    p_event("2", ["a2.3"]),
    p_event("3", ["a3.2"]),
  ],
}

r = new XMLHttpRequest()
r.open("POST", "http://192.168.6.3/api/send_info", false)
r.send(JSON.stringify(events1))

r.open("POST", "http://192.168.6.3/api/send_info", false)
r.send(JSON.stringify(events2))

r.open("POST", "http://192.168.6.3/api/send_info", false)
r.send(JSON.stringify(events3))
