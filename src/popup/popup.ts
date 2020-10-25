import './popup.html'
import './style.css'

import * as $ from 'jquery'

interface Settings {
  stake: number,
  [name: string]: any
}

const set_settings = async (settings: Settings) => {
	for (let sett in settings) {
		if ($('#' + sett).length)
			$('#' + sett).val(settings[sett])
	}
}

const submit_settings = async () => {
  let settings: Settings = {
    loginOlimp : $('#loginOlimp').val().toString(),
    pwdOlimp : $('#pwdOlimp').val().toString(),
		
    loginPinnacle : $('#loginPinnacle').val().toString(),
    pwdPinnacle : $('#pwdPinnacle').val().toString(),

		time_gap: parseFloat($('#time_gap').val().toString()),
    stake: parseFloat($('#stake').val().toString()),
    mirror: ''
  };
  let packet = { ['bot-settings']: settings }
  chrome.runtime.sendMessage(packet)
}

$('#submit').on('click', submit_settings)
chrome.runtime.sendMessage({ ['bot-get-settings']: 1 }, set_settings)
