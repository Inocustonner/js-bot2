import { local as storage2 } from 'store2'
interface StringMap {
  [name: string]: any
}

const default_settings: StringMap = {
  ["loginOlimp"]: '',
  ["pwdOlimp"]: '',

	["loginPinnacle"]: '',
	["pwdPinnacle"]: '',

	["time_gap"]: 0,
  ["stake"]: 10, // fixed for olimp
	
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

const set_if_empty = (setting: string, value: any): void => {
	if (!storage2.get(setting))
		storage2.set(setting, value)
}

export const initializeSettings = () => {
  let storage = storage2.namespace('settings')
  for (let key in default_settings) {
    if (!storage.get(key)) {
      storage.set(key, default_settings[key])
    }
  }
  add_setting_if_not_exists('server_host', 'http://192.168.6.3/')

	// for easier port from old version
	// TODO: remove on the next upd
	set_if_empty('settings.loginOlimp', storage.get('login'))
	set_if_empty('settings.pwdOlimp', storage.get('pwd'))
	
  settings_receiver()
}
