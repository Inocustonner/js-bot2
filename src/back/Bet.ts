interface Bet {
  bookmaker: string,
  outcome: string,
  koef: number,
  url: string
}

interface Arb {
  id: string,
  bets: Array<Bet>
}

interface Event {
  id: string,
  arbs: Array<Arb>
}

export type BetData = Array<Event>

export const processBet = (data: BetData): void => {
  console.log(data)
}