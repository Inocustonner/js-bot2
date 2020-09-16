import './popup.html'
import './style.css'

import * as $ from 'jquery'

interface Settings {
  login: string,
  pwd: string,
  stake: number,
  mirror: string,

  [name: string]: any
}

const set_settings = async (settings: Settings) => {
  $('#login').val(settings.login)
  $('#pwd').val(settings.pwd)
  $('#stake').val(settings.stake)
}

const submit_settings = async () => {
  let settings: Settings = {
    login : $('#login').val().toString(),
    pwd : $('#pwd').val().toString(),
    stake: parseFloat($('#stake').val().toString()),
    mirror: ''
  };
  let packet = { ['bot-settings']: settings }
  chrome.runtime.sendMessage(packet)
}

$('#submit').on('click', submit_settings)
chrome.runtime.sendMessage({ ['bot-get-settings']: 1 }, set_settings)
