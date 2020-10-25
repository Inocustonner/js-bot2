import axios, { AxiosResponse, AxiosRequestConfig } from "axios"

// IF PINNACLE PLACES WRONG BETS MAYBE THEY HAVE CHANGED SPORT IDS
import pinnacleSportMap from "./pinnacle_sports.json"
import { BetEvent } from "../Bet"
import { DriverInterface } from "./DriverInterface"
import { local as storage2 } from "store2"
import { v4 as uuid4 } from "uuid"

const storage = storage2.namespace('settings')

interface SportMap {
  readonly [index: string]: number
}

// const auth = `Basic ${btoa('EV1110168:Zozo142536')}`
const pinnacleApi = 'https://api.pinnacle.com/'

const capitalize = (str: string) => {
  return str.split(' ')
    .map(word => word[0].toLocaleUpperCase() + word.slice(1))
    .join(' ')
}

enum BetType {
  Spread = "Spread",
  Moneyline = "Moneyline",
  Total = "Total_Points",
  TeamTotal = "Team_Total_Points"
}

enum TotalSide {
  Over = "OVER",
  Under = "UNDER"
}

const teamMap: { readonly [i: string]: string } = {
  "1": "Team1",
  "2": "Team2",
  "X": "Draw"
}

interface StraightLineRequest {
  leagueId: number,
  handicap?: number,
  oddsFormat: string, // = "Decimal"
  sportId: number,
  eventId: number,
  periodNumber: number, // = 0 Game
  betType: BetType,
  team?: string,
  side?: TotalSide
}

interface StraightBetRequest {
  oddsFormat: string, // = "Decimal",
  uniqueRequestId: string, // = uuid4()
  acceptBetterLine: boolean, // = true ?
  stake: number,
  winRiskStake: string, // = "RISK"
  lineId: number,
  altLineId?: number,
  pitcher1MustStart: boolean, // true
  pitcher2MustStart: boolean, // true
  fillType: string, // = "NORMAL"
  sportId: number,
  eventId: number,
  periodNumber: number, // = 0 Game
  betType: BetType,
  team?: string,
  side?: TotalSide
}

export class PinnacleDriver extends DriverInterface {
  private url: string
  private outcome: string

  private sport_id: number
  private league_id: number
  private event_id: number

  private bet_type: BetType
  private home_team: string
  private team: string = null // null for Total
  private handicap: number = null // null for Moneyline
  private total_side: TotalSide = null // null for Moneyline and Spread
  private readonly periodNumber: number = 0 // Game

  private err: Function // current promise reject function

  private auth: string
  private log: Function
  private log_warn: Function

  private lineId: number
  private altLineId: number

  constructor() {
    super() // automatically bind abstract functions
    this.getLeagueId = this.getLeagueId.bind(this)

    this.try_set_outcome = this.try_set_outcome.bind(this)
    this.try_spread = this.try_spread.bind(this)
    this.try_moneyline = this.try_moneyline.bind(this)
    this.try_total = this.try_total.bind(this)
    this.try_team_total = this.try_team_total.bind(this)

    this.setLineInfo = this.setLineInfo.bind(this)

    let log_prefix = 'Pinnacle:'
    this.log = console.info.bind({}, log_prefix)
    // this.log_err = console.err.bind({}, log_prefix)
    this.log_warn = console.warn.bind({}, log_prefix)
    // set auth
    // 'EV1110168:Zozo142536'
  }

  public setInfo(booker_url: string, outcome: string) {
    this.url = booker_url
    this.outcome = outcome
  }

  private request_get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<any>> {
    if (typeof config == "undefined")
      config = { headers: {} } as AxiosRequestConfig
    config.headers = Object.assign({ 'Authorization': this.auth }, config.headers)
    return axios.get(url, config)
  }

  private request_post(url: string, data?: any,
    config?: AxiosRequestConfig): Promise<AxiosResponse<any>> {
    if (typeof config == "undefined")
      config = { headers: {} } as AxiosRequestConfig
    config.headers = Object.assign({ 'Authorization': this.auth }, config.headers)
    return axios.post(url, data, config)
  }

  private try_set_outcome(): boolean {
    if (this.try_spread()) return true;
    else if (this.try_moneyline()) return true;
    else if (this.try_total()) return true;
    else if (this.try_team_total()) return true;
    else return false;
  }

  private try_spread(): boolean {
    const spread = /^Фора(?<tn>\d)\(\s*[+]?(?<handicap>-?\d+(\.\d+)?)\)$/;
    let matched = this.outcome.match(spread)
    if (matched) {
      this.bet_type = BetType.Spread
      this.team = teamMap[matched.groups["tn"]]
      this.handicap = parseFloat(matched.groups["handicap"])
      return true
    }
    return false
  }

  private try_moneyline(): boolean {
    const mn = /(?:(?:П(\d))|^(1|2|X)$|(?:Победа (\d)-й команды))/;
    let matched = this.outcome.match(mn)
    if (matched) {
      this.bet_type = BetType.Moneyline
      this.team = teamMap[matched[1] || matched[2] || matched[3]]
      return true
    }
    return false
  }

  private try_total(): boolean {
    const total
      = /Тотал (?<side>больше|меньше)\s*\([+]?(?<handicap>-?\d+(\.\d+)?)\)$/;
    let matched = this.outcome.match(total)
    if (matched) {
      this.bet_type = BetType.Total
      this.total_side =
        matched.groups["side"] == "больше" ? TotalSide.Over
          : TotalSide.Under
      this.handicap = parseFloat(matched.groups["handicap"])
      return true
    }
    return false
  }

  private try_team_total(): boolean {
    const team_total
      = /Тотал (?<side>больше|меньше)\s*\([+]?(?<handicap>-?\d+(\.\d+)?)\) для (?<team>\d)-й команды$/;
    let matched = this.outcome.match(team_total)
    if (matched) {
      this.bet_type = BetType.TeamTotal
      this.team = teamMap[matched.groups["team"]]
      this.total_side =
        matched.groups["side"] == "больше" ? TotalSide.Over
          : TotalSide.Under
      this.handicap = parseFloat(matched.groups["handicap"])
      return true
    }
    return false
  }

  private getSportId(sport_name: string): number {
    return (pinnacleSportMap as SportMap)[capitalize(sport_name)]
  }

  private async getLeagueId(league_name: string): Promise<[number, string]> {
    const alnum = /(\w|\d)/i
    const transform_name = (name: string) => name.split('')
      .filter(letter => alnum.test(letter))
      .join('')
      .toLowerCase()

    league_name = transform_name(league_name)
    let resp = await this.request_get(pinnacleApi + `v2/leagues?sportId=${this.sport_id}`)
    if (resp.status != 200) {
      // console.error(`Pinnacle: Couldn't get leagues: `, resp)
      this.err(`Pinnacle: Invalid response status ${resp.status}`)
    }
    const leagues = resp.data.leagues
    for (let league of leagues) {
      if (transform_name(league.name) == league_name) {
        return [league.id, league.homeTeamType]
      }
    }
    // console.error(`Pinnacle: Couldn't find league ${league_name} from `, leagues)
    this.err(`Pinnacle: Couldn't find league ${league_name}`)
  }

  private async setLineInfo(): Promise<number> {
    const request: StraightLineRequest = {
      leagueId: this.league_id,
      handicap: this.handicap,
      oddsFormat: "Decimal",
      sportId: this.sport_id,
      eventId: this.event_id,
      periodNumber: 0,
      betType: this.bet_type,
      side: this.total_side
    }
    if (this.handicap)
      request.handicap = this.handicap
    if (this.team)
      request.team = this.team
    if (this.total_side)
      request.side = this.total_side
    try {
      let resp = await this.request_get(pinnacleApi + 'v1/line', {
        params: request
      })
      if (resp.data['status'] != 'SUCCESS') {
        this.log_warn('Request params', request, '\n\tStatus != SUCCESSS', resp.data)
        this.err(`Pinnacle setLineInfo returned status != SUCCESS`)
        return null;
      }

      this.lineId = resp.data['lineId']
      this.altLineId = resp.data['altLineId']

      return resp.data['price']
    } catch (error) {
      this.err(`Pinnacle: response status(${error.response.status}) != 200\n\tDetails ${error.response.data.message}`)
    }
  }

  public getReady(aproximate_stake: number): Promise<number> {
    return new Promise<number>(async (r, err) => {
      this.err = err

      let login: string = storage.get('loginPinnacle')
      let pwd: string = storage.get('pwdPinnacle')
      if (!login || !pwd) {
        this.log_warn('Set credentials for account')
        this.err("Pinnacle: Couldn't get login or password")
      }

      this.auth = `Basic ${btoa(login + ':' + pwd)}`

      let url = new URL(this.url)
      const [, , sport_name, league_name, , event_id] = url.pathname.split('/')
      this.event_id = parseInt(event_id)

      this.sport_id = this.getSportId(sport_name)
      if (this.sport_id == null) this.err(`Couldn't get sport id for ${sport_name}`)

      let l_id_home_team = await this.getLeagueId(league_name)
      this.league_id = l_id_home_team[0];
      this.home_team = l_id_home_team[1];

      // [this.league_id, this.home_team] = await this.getLeagueId(league_name)
      this.log(`Sport = ${this.sport_id} League = ${this.league_id} Event = ${this.event_id}`)

      if (!this.try_set_outcome()) {
        this.err(`Pinnacle: Couldn't deduce outcome type from ${this.outcome}`)
				return				
			}

      r(await this.setLineInfo())
    })
  }

  public bet(stake: number): Promise<boolean> {
    return new Promise<boolean>(async (r, err) => {
      this.err = err
      let request: StraightBetRequest = {
        oddsFormat: "Decimal",
        uniqueRequestId: uuid4(),
        acceptBetterLine: true,
        stake: stake,
        winRiskStake: "RISK",
        lineId: this.lineId,
        pitcher1MustStart: true,
        pitcher2MustStart: true,
        fillType: "NORMAL",
        sportId: this.sport_id,
        eventId: this.event_id,
        periodNumber: 0,
				betType: this.bet_type
      }
      if (this.altLineId) request['altLineId'] = this.altLineId
      if (this.team) request['team'] = this.team
      if (this.total_side) request['side'] = this.total_side

      try {
        let resp = await this.request_post(pinnacleApi + 'v2/bets/straight',
          request,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )

        if (resp.data['status'] != "ACCEPTED") {
          this.log_warn(`Pinnacle: response status(${resp.data['status']}) != ACCEPTED\n\t`, resp.data)
          r(false)
        } else
          r(true)
      } catch (error) {
        this.err(`Pinnacle: response status(${error.response.status}) != 200\n\tDetails ${error.response.data.message}`)
      }
    })
  }

  public release(): Promise<void> {
    return;
  }
}
