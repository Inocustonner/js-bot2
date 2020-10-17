type PromiseCallback = Function

export class Port {
	#port: chrome.runtime.Port
	#request_buffer: Array<any>
	wait: PromiseCallback
	
  constructor(port_name: string) {
    this.reciver = this.reciver.bind(this)
    this.receiveRequest = this.receiveRequest.bind(this)
    this.sendRequest = this.sendRequest.bind(this)

		this.#request_buffer = new Array<any>()
		
		this.#port = chrome.runtime.connect({name: port_name})
    this.#port.onMessage.addListener(this.reciver)
  }

	reciver(received_request: any) {
		// if we have waiter
		if (this.wait) {
			this.wait(received_request)
			this.wait = null // clear waiter
		} else {
			// if no one is waiting for the request
			this.#request_buffer.push(received_request)
		}
	}

	receiveRequest(): Promise<any> {
		return new Promise(r => {
			if (this.#request_buffer.length) {
				r(this.#request_buffer.shift())
			} else {
				this.wait = r
			}
		})
	}

	sendRequest(request: any): void {
		this.#port.postMessage(request)
	}
}
