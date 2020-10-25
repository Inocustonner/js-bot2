type koef_t = number
type success_t = boolean

export abstract class DriverInterface {
	constructor() {
		this.setInfo = this.setInfo.bind(this)
    this.getReady = this.getReady.bind(this)
    this.bet = this.bet.bind(this)
    this.release = this.release.bind(this)
	}
	public abstract setInfo(booker_url: string, outcome: string): void;
	public abstract getReady(aproximate_stake: number): Promise<koef_t>
	public abstract bet(stake: number): Promise<success_t>
	public abstract release(): Promise<void>
}
