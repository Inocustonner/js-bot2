import { local as storage} from 'store2'
interface StringMap {
  [name: string]: any
}

interface BookerSettings extends StringMap {
  login: string,
  pwd: string,
  mirror: string
}

const default_settings: BookerSettings = {
  login: '',
  pwd: '',
  mirror: ''
}

const settings_receiver = (): void => {
  chrome.runtime.onMessage.addListener(
    (msg: any,
      sender: chrome.runtime.MessageSender,
      respond: ((..._: any) => void)) => {
      console.assert(typeof msg ===  "object")
      console.log('applying the following changes', msg)
      for (let key in msg) {
        storage.set(key, msg[key])
      }
  })
}

export const initializeSettings = () => {
  for (let key in default_settings) {
    if (!storage.get(key)) {
      storage.set(key, default_settings[key])
    }
  }
}