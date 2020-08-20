interface PromiseWaiter {
  resolve: Function
}

class ReversedSemaphore {
  #waiters: Array<PromiseWaiter> = []
  #counter: number = 0
  constructor() {
    this.dec = this.dec.bind(this)
    this.add = this.add.bind(this)
    this.acquire = this.acquire.bind(this)
  }

  dec(): void {
    this.#counter--
  }

  add(n: number = 1): void {
    this.#counter += n
    while (this.#waiters.length > 0 && this.#counter > 0) {
      this.dec()
      this.#waiters.shift()?.resolve()
    }
  }

  acquire(): Promise<() => any> {
    if (this.#counter > 0) {
      this.dec()
      return new Promise(resolve => resolve())
    } else {
      return new Promise(resolve => this.#waiters.push({ resolve: resolve }))
    }
  }
}

/* write interface for message */
export class PipeQueue<T> {
  #arr: Array<T>
  #sem: ReversedSemaphore
  // non-empty flag | event
  constructor(...args: T[]) {
    this.#arr = Array<T>(...args)
    this.#sem = new ReversedSemaphore()
    this.push = this.push.bind(this)
    this.get = this.get.bind(this)
  }

  push(el: T): void {
    // set non-empty flag
    this.#arr.push(el)
    this.#sem.add()
  }

  async get(): Promise<T> {
    return new Promise((resolve: (t: T) => any) => {
      this.#sem.acquire().then(() => resolve(this.#arr.shift()))
    })
  }
}
