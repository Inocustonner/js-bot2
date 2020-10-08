import { local as storage2 } from 'store2'
interface StringMap {
  [name: string]: any
}

interface BookerSettings extends StringMap {
  ["login"]: string,
  ["pwd"]: string,
  ["stake"]: number,
  ["mirror"]: string,
}

const default_settings: BookerSettings = {
  ["login"]: '',
  ["pwd"]: '',
  ["stake"]: 10,
  ["mirror"]: '',

  ["debug_olimp"]: false,
  ["hour_freeResources"]: 20,
  ["min_freeResources"]: 0,
}

const settings_receiver = (): void => {
  chrome.runtime.onMessage.addListener(
    (msg: any,
      sender: chrome.runtime.MessageSender,
      ret: ((..._: any) => void)) => {

      let storage = storage2.namespace('settings')
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
  if (!storage2.has(setting)) {
    storage2.set(setting, value)
  }
}

export const initializeSettings = () => {
  let storage = storage2.namespace('settings')
  for (let key in default_settings) {
    if (!storage.get(key)) {
      storage.set(key, default_settings[key])
    }
  }
  add_setting_if_not_exists('server_host', 'http://192.168.6.3/')

  // backward capability
  // TODO: remove on next update
  if (storage.get('login') == "") storage.set('login', storage2.get('login'))
  if (storage.get('pwd') == "") storage.set('pwd', storage2.get('pwd'))

  settings_receiver()
}
