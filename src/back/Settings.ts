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
  mirror: '',
  debug_olimp: true
}

const settings_receiver = (): void => {
  chrome.runtime.onMessage.addListener(
    (msg: any,
      sender: chrome.runtime.MessageSender,
      respond: ((..._: any) => void)) => {
      console.assert(typeof msg === "object")
      return; // to early

      console.log('applying the following changes', msg)
      for (let key in msg) {
        storage.set(key, msg[key])
      }
  })
}

const add_setting_if_not_exists = (setting: string, value: any): void => {
  if (!storage.has(setting)) {
    storage.set(setting, value)
  }
}

export const initializeSettings = () => {
  for (let key in default_settings) {
    if (!storage.get(key)) {
      storage.set(key, default_settings[key])
    }
  }
  storage.set('server_host', 'http://192.168.6.3/')

  add_setting_if_not_exists('stake', 10)
}