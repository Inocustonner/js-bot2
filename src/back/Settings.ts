import { local as storage} from 'store2'
interface StringMap {
  [name: string]: any
}

interface BookerSettings extends StringMap {
  login: string,
  pwd: string,
  stake: 10,
  mirror: string
}

const default_settings: BookerSettings = {
  login: '',
  pwd: '',
  stake: 10,
  mirror: '',
  debug_olimp: false
}

const settings_receiver = (): void => {
  chrome.runtime.onMessage.addListener(
    (msg: any,
      sender: chrome.runtime.MessageSender,
      ret: ((..._: any) => void)) => {
      if (msg['bot-settings']) {
        let setts = msg['bot-settings']
        console.log('applying the following changes', setts)
        for (let key in setts) {
          storage.set(key, setts[key])
        }
      } else if (msg['bot-get-settings']) {
        let setts = storage.getAll()
        ret(setts)
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
  add_setting_if_not_exists('server_host', 'http://192.168.6.3/')
  settings_receiver()
}